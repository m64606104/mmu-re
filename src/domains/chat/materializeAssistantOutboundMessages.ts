/**
 * 将助手模型原始字符串转为多条 Message（分割 + 表情包解析），供主动消息等与延迟回复一致入库。
 */
import type { Message } from '../../types';
import { splitMessages, type SplitMessagesOptions } from '../../utils/messageFormatter';
import { preprocessAssistantOutboundPlainText } from './assistantOutboundPlainText';
import { extractAssistantStickerTokensFromText } from './extractAssistantStickerTokens';

export type MaterializeAssistantOutboundMessagesOptions = {
  raw: string;
  conversationId: string;
  splitOptions?: SplitMessagesOptions;
};

/**
 * 单轮助手输出的气泡列表（每条含独立 id/timestamp）。
 */
export async function materializeAssistantOutboundMessages(
  options: MaterializeAssistantOutboundMessagesOptions
): Promise<Message[]> {
  const { raw, conversationId, splitOptions } = options;
  const pre = preprocessAssistantOutboundPlainText(raw);
  const baseText = pre.text;
  if (!baseText) return [];

  const parts = splitMessages(baseText, splitOptions);
  const finalParts = parts.length > 0 ? parts : [baseText];

  const baseTs = Date.now();
  const messages: Message[] = [];

  for (let i = 0; i < finalParts.length; i++) {
    const segment = finalParts[i];
    const nowTs = baseTs + i * 80;
    const parsed = await extractAssistantStickerTokensFromText(segment, conversationId);

    const textChunk = parsed.text.trim();
    if (textChunk) {
      messages.push({
        id: `ai_out_${baseTs}_${i}_${Math.random().toString(36).slice(2, 10)}`,
        role: 'assistant',
        content: textChunk,
        timestamp: nowTs,
      });
    }

    parsed.stickers.forEach((sticker, idx) => {
      messages.push({
        id: `ai_out_${baseTs}_${i}_sticker_${idx}_${Math.random().toString(36).slice(2, 10)}`,
        role: 'assistant',
        content: '[表情包]',
        timestamp: nowTs + idx + 1,
        mediaType: 'sticker',
        mediaDescription: sticker.description,
        stickerKind: sticker.stickerKind,
        mediaUrl: sticker.imageUrl,
        isMediaDescriptionOnly: !sticker.imageUrl,
      });
    });

    if (!textChunk && parsed.stickers.length === 0 && segment.trim()) {
      messages.push({
        id: `ai_out_${baseTs}_${i}_fallback_${Math.random().toString(36).slice(2, 10)}`,
        role: 'assistant',
        content: segment.trim(),
        timestamp: nowTs,
      });
    }
  }

  return messages;
}
