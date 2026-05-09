import type { Message } from '../../types';

/**
 * 从单条用户消息收集可发给模型的图片 URL（主字段 + mediaItems）。
 * 顺序：先 mediaUrl，再按 mediaItems 顺序追加。
 */
export function collectImageUrlsFromMessage(msg: Message): string[] {
  const urls: string[] = [];
  if (msg.mediaType === 'image' && msg.mediaUrl) urls.push(msg.mediaUrl);
  if (msg.mediaItems?.length) {
    for (const it of msg.mediaItems) {
      if (it.type === 'image' && it.url) urls.push(it.url);
    }
  }
  return urls;
}

/** 多条消息按时间顺序展平（调用方保证 msgs 已按对话顺序） */
export function collectImageUrlsFromMessages(msgs: Message[]): string[] {
  const out: string[] = [];
  for (const m of msgs) {
    out.push(...collectImageUrlsFromMessage(m));
  }
  return out;
}

export function userMessageHasImagePayload(msg: Message): boolean {
  if (msg.role !== 'user') return false;
  return collectImageUrlsFromMessage(msg).length > 0;
}
