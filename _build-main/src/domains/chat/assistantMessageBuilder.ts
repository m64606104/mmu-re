import type { Message } from '../../types';
import { normalizeAssistantProtocolLeaks } from '../../utils/messageFormatter';
import { isSingleEmojiText, resolveSystemEmoji } from '../../utils/systemEmoji';
import { stripTrailingVoiceTranscriptArtifacts } from '../../utils/voiceDurationCalculator';

export type ParsedAssistantMediaItem = {
  type: 'voice' | 'image' | 'video' | 'sticker';
  description: string;
  imageUrl?: string;
  stickerKind?: 'custom' | 'systemEmoji';
};

/**
 * 将无冒号的「[图片] 描述…」「[视频] 描述…」规范为 [图片:…] / [视频:…]。
 * 与 [图片:…] 标准写法并存；不会改写 [生图:…]（无「图片]」紧跟冒号外的无冒号片段）。
 * 可选前缀 [发送了图片] 与群聊解析一致。
 */
export function normalizeLooseAssistantImageBrackets(text: string): string {
  let s = text;
  // 「自然交互」编号图：[图片1:…] / 【图片2：…】/ 【图片3】描述… — expandAssistantInlineMedia 只认 [图片:payload]，故先收口
  s = s.replace(/【\s*(?:发送了)?\s*图片\s*(\d+)\s*[:：]\s*([^】]+)\s*】/g, '[图片:（图$1）$2]');
  s = s.replace(
    /【\s*(?:发送了)?\s*图片\s*(\d+)\s*】(?!\s*[:：])\s*([^【]*)/g,
    (_full, num: string, desc: string) => {
      const n = String(num || '').trim();
      const d = String(desc || '').trim();
      const prefix = n ? `（图${n}）` : '';
      return `[图片:${prefix}${d || '（分享了一张图）'}]`;
    }
  );
  s = s.replace(
    /\[(?:发送了)?(?:图片|IMG|IMAGE)(\d+)\s*[:：]\s*([^\]]+)\]/gi,
    '[图片:（图$1）$2]'
  );
  // 全角书名号（部分模型输出）：先规范为标准半角协议，便于下游唯一正则解析
  s = s.replace(/【\s*(?:发送了)?\s*图片\s*[:：]\s*([^】]+)\s*】/g, '[图片:$1]');
  s = s.replace(
    /【\s*(?:发送了)?\s*图片\s*】(?!\s*[:：])\s*([^【]*)/g,
    (_full, desc: string) => {
      const d = String(desc || '').trim();
      return `[图片:${d || '（分享了一张图）'}]`;
    }
  );
  s = s.replace(
    /\[(?:发送了)?(?:图片|IMG|IMAGE)(\d*)\](?!\s*[:：])\s*([^[]*)/gi,
    (_full, num: string, desc: string) => {
      const n = String(num || '').trim();
      const d = String(desc || '').trim();
      const prefix = n ? `（图${n}）` : '';
      const body = d || '（分享了一张图）';
      return `[图片:${prefix}${body}]`;
    }
  );
  return s;
}

export function normalizeLooseAssistantVideoBrackets(text: string): string {
  let s = text;
  s = s.replace(/【\s*(?:发送了)?\s*视频\s*[:：]\s*([^】]+)\s*】/g, '[视频:$1]');
  s = s.replace(
    /【\s*(?:发送了)?\s*视频\s*】(?!\s*[:：])\s*([^【]*)/g,
    (_full, desc: string) => {
      const d = String(desc || '').trim();
      return `[视频:${d || '（分享了一段视频）'}]`;
    }
  );
  s = s.replace(
    /\[(?:发送了)?(?:视频|VIDEO)\](?!\s*[:：])\s*([^[]*)/gi,
    (_full, desc: string) => {
      const d = String(desc || '').trim();
      return `[视频:${d || '（分享了一段视频）'}]`;
    }
  );
  return s;
}

export function normalizeLooseAssistantMediaBrackets(text: string): string {
  return normalizeLooseAssistantVideoBrackets(normalizeLooseAssistantImageBrackets(text));
}

type BuildAssistantMediaMessagesOptions = {
  baseId: string;
  mediaItems: ParsedAssistantMediaItem[];
  startTimestamp: number;
  calculateVoiceDuration: (text: string) => number;
  log?: (message: string) => void;
};

type BuildAssistantTextMessageOptions = {
  baseId: string;
  textContent: string;
  timestamp: number;
  replyToInfo?: { id: string; content: string; role: 'user' | 'assistant' };
};

type ParseAssistantMediaFromTextOptions = {
  text: string;
  conversationId: string;
  resolveStickerImage: (description: string, conversationId: string) => Promise<string | null | undefined>;
};

type MarkerRule = {
  key: string;
  patterns: RegExp[];
};

export function stripMessageCommandMarkers(
  content: string,
  rules: MarkerRule[]
): {
  content: string;
  hits: Record<string, boolean>;
} {
  let next = content || '';
  const hits: Record<string, boolean> = {};

  rules.forEach((rule) => {
    const matched = rule.patterns.some((pattern) => pattern.test(next));
    hits[rule.key] = matched;
    if (!matched) return;

    rule.patterns.forEach((pattern) => {
      next = next.replace(pattern, '');
    });
  });

  return {
    content: next.trim(),
    hits,
  };
}

export function stripAvatarCommandMarkers(content: string): {
  content: string;
  hasAvatarChange: boolean;
  hasRestoreAvatar: boolean;
} {
  const result = stripMessageCommandMarkers(content, [
    { key: 'avatarChange', patterns: [/\[换头像\]/g, /【换头像】/g] },
    { key: 'restoreAvatar', patterns: [/\[换回原头像\]/g, /【换回原头像】/g] },
  ]);

  return {
    content: result.content,
    hasAvatarChange: Boolean(result.hits.avatarChange),
    hasRestoreAvatar: Boolean(result.hits.restoreAvatar),
  };
}

export function buildAssistantMediaMessages(options: BuildAssistantMediaMessagesOptions): {
  messages: Message[];
  nextTimestamp: number;
} {
  const { baseId, mediaItems, calculateVoiceDuration, log } = options;
  let nextTimestamp = options.startTimestamp;

  const mediaTypeCounter = {
    voice: 0,
    image: 0,
    video: 0,
    sticker: 0,
  };

  const messages: Message[] = [];

  mediaItems.forEach((item) => {
    if (item.type === 'voice') {
      const idx = mediaTypeCounter.voice++;
      const { text: cleanDesc, secondsHint } = stripTrailingVoiceTranscriptArtifacts(item.description || '');
      const duration = secondsHint ?? calculateVoiceDuration(cleanDesc);
      messages.push({
        id: `${baseId}_voice_${idx}`,
        role: 'assistant',
        content: '[语音]',
        timestamp: nextTimestamp++,
        mediaType: 'voice',
        mediaDescription: cleanDesc,
        voiceDuration: duration,
        isMediaDescriptionOnly: true,
      });
      log?.(`🎤 [创建消息] 语音消息 ${idx + 1} 已添加，时长：${duration}秒`);
      return;
    }

    if (item.type === 'image') {
      const idx = mediaTypeCounter.image++;
      messages.push({
        id: `${baseId}_image_${idx}`,
        role: 'assistant',
        content: '[图片]',
        timestamp: nextTimestamp++,
        mediaType: 'image',
        mediaDescription: item.description,
        isMediaDescriptionOnly: true,
      });
      log?.(`🖼️ [创建消息] 图片消息 ${idx + 1} 已添加`);
      return;
    }

    if (item.type === 'video') {
      const idx = mediaTypeCounter.video++;
      messages.push({
        id: `${baseId}_video_${idx}`,
        role: 'assistant',
        content: '[视频]',
        timestamp: nextTimestamp++,
        mediaType: 'video',
        mediaDescription: item.description,
        isMediaDescriptionOnly: true,
      });
      log?.(`🎬 [创建消息] 视频消息 ${idx + 1} 已添加`);
      return;
    }

    const idx = mediaTypeCounter.sticker++;
    messages.push({
      id: `${baseId}_sticker_${idx}`,
      role: 'assistant',
      content: '[表情包]',
      timestamp: nextTimestamp++,
      mediaType: 'sticker',
      mediaDescription: item.description,
      mediaUrl: item.imageUrl,
      stickerKind: item.stickerKind || 'custom',
      isMediaDescriptionOnly: !item.imageUrl,
    });
    log?.(`😊 [创建消息] 表情包消息 ${idx + 1} 已添加${item.imageUrl ? ' (真实图片)' : ' (文字描述)'}`);
  });

  return { messages, nextTimestamp };
}

export function buildAssistantTextMessage(options: BuildAssistantTextMessageOptions): Message | null {
  const { baseId, textContent, timestamp, replyToInfo } = options;
  const normalized = textContent.trim();
  if (!normalized) return null;

  const message: Message = {
    id: baseId,
    role: 'assistant',
    content: normalized,
    timestamp,
  };

  if (replyToInfo) {
    message.replyTo = {
      id: replyToInfo.id,
      content: replyToInfo.content,
      role: replyToInfo.role,
    };
  }

  return message;
}

export async function parseAssistantMediaFromText(options: ParseAssistantMediaFromTextOptions): Promise<{
  cleanContent: string;
  mediaItems: ParsedAssistantMediaItem[];
}> {
  const { text, conversationId, resolveStickerImage } = options;
  const mediaItems: ParsedAssistantMediaItem[] = [];
  let cleanContent = normalizeLooseAssistantMediaBrackets(normalizeAssistantProtocolLeaks(text));

  const imageMatches = cleanContent.matchAll(/\[(?:图片|IMG|IMAGE)[:：]([^\]]+)\]/gi);
  for (const match of imageMatches) {
    mediaItems.push({
      type: 'image',
      description: match[1].trim(),
    });
    cleanContent = cleanContent.replace(match[0], '').trim();
  }

  const videoMatches = cleanContent.matchAll(/\[(?:视频|VIDEO)[:：]([^\]]+)\]/gi);
  for (const match of videoMatches) {
    mediaItems.push({
      type: 'video',
      description: match[1].trim(),
    });
    cleanContent = cleanContent.replace(match[0], '').trim();
  }

  const voiceMatches = cleanContent.matchAll(/\[(?:语音|VOICE)[:：](.+?)(?:[，,]\s*(?:时长)?(\d+)秒?)?\]/gi);
  for (const match of voiceMatches) {
    const { text } = stripTrailingVoiceTranscriptArtifacts(match[1].trim());
    mediaItems.push({
      type: 'voice',
      description: text,
    });
    cleanContent = cleanContent.replace(match[0], '').trim();
  }

  const stickerMatches = [...cleanContent.matchAll(/\[(表情包|STICKER|系统表情|EMOJI|emoji)[:：]([^\]]+)\]/gi)];
  for (const match of stickerMatches) {
    const tagType = (match[1] || '').trim().toLowerCase();
    const description = (match[2] || '').trim();
    const isSystemEmojiTag = tagType === '系统表情' || tagType === 'emoji';
    if (isSystemEmojiTag) {
      const emoji = resolveSystemEmoji(description);
      if (emoji) {
        cleanContent = cleanContent.replace(match[0], emoji).replace(/[ \t]{2,}/g, ' ').trim();
        continue;
      }
    }

    const imageUrl = await resolveStickerImage(description, conversationId);
    mediaItems.push({
      type: 'sticker',
      description,
      imageUrl: imageUrl || undefined,
      stickerKind: imageUrl ? 'custom' : (isSingleEmojiText(description) ? 'systemEmoji' : 'custom'),
    });
    cleanContent = cleanContent.replace(match[0], '').trim();
  }

  return { cleanContent, mediaItems };
}
