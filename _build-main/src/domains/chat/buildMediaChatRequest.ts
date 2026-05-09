import type { ApiConfig, Message } from '../../types';
import {
  appendImageRecognitionRules,
  buildImageUrlParts,
  collectImageUrlsFromMessages,
} from '../vision';

type ModelMessage = { role: 'system' | 'user' | 'assistant'; content: any };

export interface BuildMediaChatRequestOptions {
  apiConfig: ApiConfig;
  systemPrompt: string;
  contextMessages: Message[];
  unhandledUserMessages: Message[];
  imageMessages: Message[];
  textMessages: Message[];
  formatHistoryMessageContent: (msg: Message) => string;
  getTimeLabel: (timestamp: number) => string;
  hasImage: boolean;
  hasVideo: boolean;
  hasVoice: boolean;
  hasSticker: boolean;
}

export interface BuildMediaChatRequestResult {
  messages: ModelMessage[];
  requestBody: {
    model: string;
    messages: ModelMessage[];
    temperature: number;
    max_tokens: number;
  };
}

/**
 * Build chat completion request for media-only branches (image/video/voice/sticker).
 * Returns null when no media branch matches.
 *
 * This function is intentionally "dumb" (UI passes helpers in) to keep behavior
 * identical while we extract logic out of ChatScreen safely.
 */
export function buildMediaChatRequest(
  options: BuildMediaChatRequestOptions
): BuildMediaChatRequestResult | null {
  const {
    apiConfig,
    systemPrompt,
    contextMessages,
    unhandledUserMessages,
    imageMessages,
    textMessages,
    formatHistoryMessageContent,
    getTimeLabel,
    hasImage,
    hasVideo,
    hasVoice,
    hasSticker,
  } = options;

  let messages: ModelMessage[] | undefined;
  let requestBody: BuildMediaChatRequestResult['requestBody'] | undefined;

  if (hasImage) {
    const recentMessages = contextMessages;
    const historyMessages: ModelMessage[] = recentMessages
      .filter(m => !unhandledUserMessages.includes(m))
      .map(m => ({
        role: m.role,
        content: formatHistoryMessageContent(m),
      })) as ModelMessage[];

    const contentParts: any[] = [];
    const imageUrls = collectImageUrlsFromMessages(imageMessages);
    if (imageUrls.length > 0) {
      contentParts.push(...buildImageUrlParts(imageUrls));
    }

    const imageDescriptionsWithTime = imageMessages
      .map((m, idx) => {
        const timeLabel = getTimeLabel(m.timestamp);
        const desc = (m.mediaDescription || '').trim();
        if (!desc) return '';
        return `【${timeLabel}】第${idx + 1}张图描述：${desc}`;
      })
      .filter(Boolean)
      .join('\n');

    const textMessagesWithTime = textMessages
      .map(m => {
        const timeLabel = getTimeLabel(m.timestamp);
        return `【${timeLabel}】${m.content}`;
      })
      .filter(Boolean)
      .join('\n');

    const combinedTextWithTime = [imageDescriptionsWithTime, textMessagesWithTime]
      .filter(Boolean)
      .join('\n');

    if (combinedTextWithTime) {
      contentParts.push({
        type: 'text',
        text: combinedTextWithTime,
      });
    } else {
      const imageCount = imageMessages.length;
      const defaultText = imageCount > 1 ? `看这${imageCount}张图` : '看这张图';
      contentParts.push({
        type: 'text',
        text: defaultText,
      });
    }

    messages = [
      {
        role: 'system',
        content: appendImageRecognitionRules(systemPrompt),
      },
      ...historyMessages,
      { role: 'user', content: contentParts },
    ];

    const visionOverride = String(apiConfig.visionModelName || '').trim();
    requestBody = {
      model: visionOverride || apiConfig.modelName,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    };
  } else if (hasVideo) {
    const recentMessages = contextMessages;
    const historyMessages: ModelMessage[] = recentMessages
      .filter(m => !unhandledUserMessages.includes(m))
      .map(m => ({
        role: m.role,
        content: formatHistoryMessageContent(m),
      })) as ModelMessage[];

    const videoMessage = unhandledUserMessages.find(m => m.mediaType === 'video');
    const textWithTime = textMessages
      .map(m => {
        const timeLabel = getTimeLabel(m.timestamp);
        return `【${timeLabel}】${m.content}`;
      })
      .filter(Boolean)
      .join('\n');

    let videoContent = '';
    if (videoMessage) {
      const videoTimeLabel = getTimeLabel(videoMessage.timestamp);
      videoContent = `【${videoTimeLabel}】（分享了视频：${videoMessage.mediaDescription || videoMessage.content}）`;
      if (textWithTime) videoContent += '\n' + textWithTime;
    } else {
      videoContent = textWithTime;
    }

    messages = [
      {
        role: 'system',
        content:
          systemPrompt +
          '\n\n【视频内容理解规则】：\n- 用户分享了视频，根据提供的内容描述自然回复\n- 像朋友间日常聊天一样对视频内容做出反应\n- 不要说"我看不到视频"、"无法观看"等话\n- 基于描述内容自然地评论、提问或互动\n- 可以回复文字，也可以回复图片/视频/语音/表情包/红包等\n- 如果用户除了视频还发了文字消息，一起回复所有内容',
      },
      ...historyMessages,
      { role: 'user', content: videoContent },
    ];

    requestBody = {
      model: apiConfig.modelName,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    };
  } else if (hasVoice) {
    const recentMessages = contextMessages;
    const historyMessages: ModelMessage[] = recentMessages
      .filter(m => !unhandledUserMessages.includes(m))
      .map(m => ({
        role: m.role,
        content: formatHistoryMessageContent(m),
      })) as ModelMessage[];

    const voiceMessages = unhandledUserMessages.filter(m => m.mediaType === 'voice');
    const voiceTextsWithTime = voiceMessages
      .map(m => {
        const timeLabel = getTimeLabel(m.timestamp);
        return `【${timeLabel}】${m.mediaDescription || m.content}`;
      })
      .filter(Boolean);

    const textContentsWithTime = textMessages
      .map(m => {
        const timeLabel = getTimeLabel(m.timestamp);
        return `【${timeLabel}】${m.content}`;
      })
      .filter(Boolean);

    const combinedContent = [...voiceTextsWithTime, ...textContentsWithTime].join('\n');

    messages = [
      {
        role: 'system',
        content:
          systemPrompt +
          '\n\n【语音消息理解规则】：\n- 用户发送了语音消息，根据语音转文字的内容自然回复\n- 像朋友间日常聊天一样对语音内容做出反应\n- 不要说"我听不到语音"、"无法播放"等话\n- 基于转录的文字内容自然回复即可\n- 可以回复文字，也可以回复语音/图片/视频/表情包/红包等\n- 如果用户除了语音还发了文字消息，一起回复所有内容',
      },
      ...historyMessages,
      { role: 'user', content: combinedContent },
    ];

    requestBody = {
      model: apiConfig.modelName,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    };
  } else if (hasSticker) {
    const recentMessages = contextMessages;
    const historyMessages: ModelMessage[] = recentMessages
      .filter(m => !unhandledUserMessages.includes(m))
      .map(m => ({
        role: m.role,
        content: formatHistoryMessageContent(m),
      })) as ModelMessage[];

    const stickerMessages = unhandledUserMessages.filter(m => m.mediaType === 'sticker');
    const stickerContentsWithTime = stickerMessages
      .map(m => {
        const timeLabel = getTimeLabel(m.timestamp);
        const stickerDesc = (m.mediaDescription || m.content || '未命名表情').trim();
        return `【${timeLabel}】[表情包:${stickerDesc}]`;
      })
      .filter(Boolean);

    const textContentsWithTime = textMessages
      .map(m => {
        const timeLabel = getTimeLabel(m.timestamp);
        return `【${timeLabel}】${m.content}`;
      })
      .filter(Boolean);

    const combinedContent = [...stickerContentsWithTime, ...textContentsWithTime].join('\n');

    messages = [
      {
        role: 'system',
        content:
          systemPrompt +
          '\n\n【表情包理解规则】：\n- 用户发送了表情包，根据描述理解情绪和意图\n- 像朋友一样自然接梗，可以回文字，也可以回表情包（使用[表情包:描述]）\n- 如果用户还发了文字，一起回应\n\n【发送多媒体消息格式】：\n- 发送图片：[图片:详细的画面描述，50-100字，必须包含光影/氛围/动态细节]\n- 发送视频：[视频:电影级画面描述，50-100字，必须包含环境/动作/神态/声音氛围]\n- 发送语音：[语音:语音内容的文字，时长X秒]\n- 发送表情包：[表情包:表情包的详细描述]\n\n示例：\n用户：[表情包:一只猫咪害羞捂脸]\nAI：哈哈哈好可爱！',
      },
      ...historyMessages,
      { role: 'user', content: combinedContent },
    ];

    requestBody = {
      model: apiConfig.modelName,
      messages,
      temperature: 0.8,
      max_tokens: 2000,
    };
  }

  if (!messages || !requestBody) return null;
  return { messages, requestBody };
}

