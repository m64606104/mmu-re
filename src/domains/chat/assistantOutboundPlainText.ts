/**
 * 模型返回的「纯文本助手正文」在写入会话前的统一预处理。
 * 与 pendingReplyService 中 quoteStrip 之后的链路对齐，避免主动消息等旁路遗漏协议规范化。
 */
import { normalizeAssistantProtocolLeaks, stripDisplayControlTags } from '../../utils/messageFormatter';
import { normalizeLooseAssistantMediaBrackets } from './assistantMessageBuilder';
import { extractPrivateAiGenImageDirectives } from '../../utils/privateAiGenImageMarkers';
import { stripAiQuoteMarkers } from './quoteMarker';

export type PreprocessAssistantOutboundPlainTextResult = {
  /** 可入库 / 可 splitMessages 的正文（未剥表情包，表情包由 extractAssistantStickerTokensFromText 处理） */
  text: string;
  /** 从文内剥下的 [生图:…]；主动消息等旁路默认不调用生图接口，仅避免原文泄漏 */
  strippedAiGenPrompts: string[];
};

export function preprocessAssistantOutboundPlainText(raw: string): PreprocessAssistantOutboundPlainTextResult {
  const quoteStrip = stripAiQuoteMarkers(raw || '');
  let text = normalizeLooseAssistantMediaBrackets(normalizeAssistantProtocolLeaks(quoteStrip.text));
  const gen = extractPrivateAiGenImageDirectives(text);
  text = stripDisplayControlTags(gen.text).trim();
  return { text, strippedAiGenPrompts: gen.prompts };
}
