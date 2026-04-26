import type { Message } from '../../types';
import { isSingleEmojiText, resolveSystemEmoji } from '../../utils/systemEmoji';

export type ParsedAssistantMediaItem = {
  type: 'voice' | 'image' | 'video' | 'sticker';
  description: string;
  imageUrl?: string;
  stickerKind?: 'custom' | 'systemEmoji';
};

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
  replyToInfo?: { content: string; role: 'user' | 'assistant' };
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
      const duration = calculateVoiceDuration(item.description || '');
      messages.push({
        id: `${baseId}_voice_${idx}`,
        role: 'assistant',
        content: '[语音]',
        timestamp: nextTimestamp++,
        mediaType: 'voice',
        mediaDescription: item.description,
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
      id: '',
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
  let cleanContent = text;

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
    mediaItems.push({
      type: 'voice',
      description: match[1].trim(),
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
