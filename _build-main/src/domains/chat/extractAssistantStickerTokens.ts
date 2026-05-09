/**
 * 从助手正文里抽出 [表情包:…] 等贴纸协议，并解析映射 URL（与延迟回复链路一致）。
 */
import { resolveSystemEmoji, isSingleEmojiText } from '../../utils/systemEmoji';
import { findStickerByDescription } from '../../utils/stickerMessageParser';

export type ParsedOutboundStickerToken = {
  description: string;
  stickerKind: 'systemEmoji' | 'custom';
  imageUrl?: string;
};

export async function extractAssistantStickerTokensFromText(
  raw: string,
  conversationId: string
): Promise<{ text: string; stickers: ParsedOutboundStickerToken[] }> {
  if (!raw) return { text: '', stickers: [] };

  let text = raw;
  const stickers: ParsedOutboundStickerToken[] = [];
  const matches = [...raw.matchAll(/\[(表情包|STICKER|系统表情|EMOJI|emoji)[:：]([^\]]+)\]/gi)];
  for (const match of matches) {
    const tag = (match[1] || '').toLowerCase();
    const payload = (match[2] || '').trim();
    const isEmojiTag = tag === 'emoji' || tag === '系统表情';
    const emoji = isEmojiTag ? resolveSystemEmoji(payload) : null;
    const isEmoji = Boolean(emoji || isSingleEmojiText(payload));
    if (isEmoji) {
      text = text.replace(match[0], emoji || payload);
      continue;
    }
    let imageUrl: string | undefined;
    try {
      imageUrl = (await findStickerByDescription(payload, conversationId)) || undefined;
    } catch {
      imageUrl = undefined;
    }
    stickers.push({
      description: payload,
      stickerKind: 'custom',
      imageUrl,
    });
    text = text.replace(match[0], ' ');
  }

  return { text: text.replace(/[ \t]{2,}/g, ' ').trim(), stickers };
}
