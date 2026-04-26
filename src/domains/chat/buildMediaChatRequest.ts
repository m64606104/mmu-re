import type { ApiConfig, Message } from '../../types';

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
    imageMessages.forEach(imgMsg => {
      contentParts.push({
        type: 'image_url',
        image_url: { url: imgMsg.mediaUrl },
      });
    });

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
      contentParts.push({ type: 'text', text: combinedTextWithTime });
    } else {
      const imageCount = imageMessages.length;
      const defaultText = imageCount > 1 ? `看这${imageCount}张图` : '看这张图';
      contentParts.push({ type: 'text', text: defaultText });
    }

    messages = [
      {
        role: 'system',
        content:
          systemPrompt +
          '\n\n【图片识别规则 - 严格遵守】：\n\n🚫 **绝对禁止的行为**：\n- ❌ 禁止猜测或编造图片中不存在的内容\n- ❌ 禁止用疑问句猜测（如"是xxx吗？"、"这是不是xxx？"）\n- ❌ 禁止说"让我看看"、"帮你看看"、"我来看看"等话\n- ❌ 如果图片模糊或识别不清，禁止瞎猜，直接说"图片有点模糊，看不太清"\n- ❌ 禁止过度解读或联想图片内容\n\n✅ **正确的做法**：\n- ✅ 只描述你在图片中**确实看到**的具体内容（人物、物体、颜色、场景）\n- ✅ 用肯定句描述，不要用疑问句\n- ✅ 如果图片清晰，直接自然评论即可\n- ✅ 如果看不清细节，就只说看得清楚的部分\n- ✅ 可以回复文字，也可以回复表情包等\n- ✅ 如果用户除了图片还发了文字消息，一起回复所有内容\n\n**示例对比**：\n❌ 错误："哇，是列车窗外的星空吗？"（猜测性疑问句）\n❌ 错误："这张照片拍得很漂亮！"（没看清就乱夸）\n✅ 正确："这张图片有点模糊，不过能看到粉色的头发，很可爱！"\n✅ 正确："看到了！是一个动漫角色的图片"',
      },
      ...historyMessages,
      { role: 'user', content: contentParts },
    ];

    requestBody = {
      model: apiConfig.modelName,
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
          '\n\n【表情包理解规则】：\n- 用户发送了表情包，根据描述的内容理解用户的情绪和意图\n- 像朋友间日常聊天一样对表情包做出自然反应\n- 可以回复文字、也可以回复表情包（使用[表情包:描述内容]格式）\n- 根据表情包内容判断是否要发送图片/视频/语音/表情包回复\n- 如果用户除了表情包还发了文字消息，一起回复所有内容\n\n【发送多媒体消息格式】：\n- 发送图片：[图片:详细的画面描述，50-100字，必须包含光影/氛围/动态细节]\n- 发送视频：[视频:电影级画面描述，50-100字，必须包含环境/动作/神态/声音氛围]\n- 发送语音：[语音:语音内容的文字，时长X秒]\n- 发送表情包：[表情包:表情包的详细描述]\n\n示例：\n用户：[表情包:一只猫咪害羞捂脸]\nAI：哈哈哈好可爱！[表情包:小狗狗笑得很开心的样子]',
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

