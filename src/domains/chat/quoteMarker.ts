import type { Message } from '../../types';

/** AI 引用：与 [改网名]、[换头像] 同类，从气泡正文剥除后写入 replyTo */
export const AI_QUOTE_MARKER_RE = /\[(?:引用消息|引用)[:：]\s*([^\]\s]+)\s*\]/g;

/** 拆条渲染 id（如 xxx_text_0）还原为会话数组中的 base id */
export function canonicalMessageBaseId(messageId: string): string {
  const textMatch = messageId.match(/^(.*)_text_\d+$/);
  if (textMatch) return textMatch[1];
  const mediaMatch = messageId.match(/^(.*)_media_\d+$/);
  if (mediaMatch) return mediaMatch[1];
  return messageId;
}

/**
 * 按消息 id 解析被引用消息（用于 [引用消息:id]）。
 * 先精确匹配，再尝试拆条 base id。
 */
export function resolveQuotedMessageById(timeline: Message[], rawId: string): Message | undefined {
  const trimmed = (rawId || '').trim();
  if (!trimmed) return undefined;
  const direct = timeline.find((m) => m.id === trimmed);
  if (direct) return direct;
  const base = canonicalMessageBaseId(trimmed);
  if (base !== trimmed) {
    const byBase = timeline.find((m) => m.id === base);
    if (byBase) return byBase;
  }
  return undefined;
}

export function stripAiQuoteMarkers(text: string): { text: string; lastQuotedId: string | null } {
  if (!text) return { text: '', lastQuotedId: null };
  let lastQuotedId: string | null = null;
  const next = text.replace(AI_QUOTE_MARKER_RE, (_m, id: string) => {
    const t = String(id || '').trim();
    if (t) lastQuotedId = t;
    return '';
  });
  return { text: next.replace(/\n{3,}/g, '\n\n').trim(), lastQuotedId };
}

/** 引用条预览：纯文本截断；媒体类给短描述 */
export function excerptForReplyPreview(msg: Message, maxLen = 220): string {
  const raw = (msg.content || '').trim();
  if (raw && raw.length > maxLen) return `${raw.slice(0, maxLen)}…`;
  if (raw) return raw;
  if (msg.mediaType === 'image' && msg.mediaDescription) return `[图片] ${msg.mediaDescription.slice(0, 120)}`;
  if (msg.mediaType === 'video' && msg.mediaDescription) return `[视频] ${msg.mediaDescription.slice(0, 120)}`;
  if (msg.mediaType === 'voice' && msg.mediaDescription) return `[语音] ${msg.mediaDescription.slice(0, 120)}`;
  if (msg.mediaType === 'sticker' && msg.mediaDescription) return `[表情包] ${msg.mediaDescription.slice(0, 80)}`;
  return '[消息]';
}
