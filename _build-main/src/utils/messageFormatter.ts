/**
 * 消息格式化和分割工具
 * 让AI消息更自然、更接近人类聊天习惯
 */

export const stripDisplayControlTags = (message: string): string => {
  if (!message) return '';
  return message
    .replace(/\[\s*NEXT\s*\]/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

/**
 * 弱模型常模仿上下文里的「〈消息ID:…〉」，或误用角括号写「〈STICKER:…〉」（协议要求方括号）。
 * 在拆条 / 解析表情包之前调用；不会移除合法的 [引用消息:id]。
 */
export function normalizeAssistantProtocolLeaks(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let s = raw;
  // 伪造的消息 ID 行（含模型多加的空格「消息 ID」）
  s = s.replace(/〈\s*消息\s*ID\s*[:：]\s*[^〉\r\n]+〉/gi, '');
  s = s.replace(/〈\s*消息ID\s*[:：]\s*[^〉\r\n]+〉/gi, '');
  s = s.replace(/<\s*消息\s*ID\s*[:：]\s*[^>\r\n]+>/gi, '');
  s = s.replace(/<\s*消息ID\s*[:：]\s*[^>\r\n]+>/gi, '');
  // 角括号表情包 → 标准方括号，供 extractStickerTokens / parseAssistantMediaFromText
  s = s.replace(
    /〈\s*(表情包|STICKER|系统表情|EMOJI|emoji)\s*[:：]\s*([^〉]+)〉/gi,
    '[$1:$2]'
  );
  s = s.replace(
    /<\s*(表情包|STICKER|系统表情|EMOJI|emoji)\s*[:：]\s*([^>]+)>/gi,
    '[$1:$2]'
  );
  return s.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

export const normalizeMessagePreviewText = (raw: string): string => {
  if (!raw) return '暂无消息';

  const withMediaTokens = raw
    .replace(/\[(?:STICKER|表情包)[:：][^\]]+\]/gi, '[表情]')
    .replace(/\[(?:系统表情|EMOJI|emoji)[:：][^\]]+\]/gi, '[表情]')
    .replace(/\[(?:IMAGE|IMG|图片)[:：][^\]]+\]/gi, '[图片]')
    .replace(/\[(?:生图|AI图|AI配图)[:：][^\]]+\]/gi, '[配图]')
    .replace(/\[(?:VIDEO|视频)[:：][^\]]+\]/gi, '[视频]')
    .replace(/\[(?:VOICE|语音)[:：][^\]]+\]/gi, '[语音]');

  const cleaned = stripDisplayControlTags(withMediaTokens)
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || '暂无消息';
};

/**
 * 清理AI回复中的非自然内容
 * - 移除Markdown格式（**加粗**、* 列表等）
 * - 移除引用链接
 * - 保持URL完整性
 */
export const cleanAIMessage = (message: string): string => {
  if (!message) return '';
  
  let cleaned = normalizeAssistantProtocolLeaks(message);
  
  // 1. 移除Markdown加粗标记 **文字**，但保留内容
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  
  // 2. 移除列表标记
  // 移除 "* **标题：** 内容" 这种格式，保留"标题：内容"
  cleaned = cleaned.replace(/^\s*[\*\-]\s+\*\*([^:：]+)[:：]\*\*\s*/gm, '$1：');
  // 移除普通列表标记 "* 内容"
  cleaned = cleaned.replace(/^\s*[\*\-]\s+/gm, '');
  
  // 3. 移除引用标记和引用链接
  // AI 尾部机器指令 [引用消息:id]（与改网名同类；若未被上游剥除则在此兜底）
  cleaned = cleaned.replace(/\[(?:引用消息|引用)[:：][^\]\s]+\]/g, '');
  // 移除 [1][2] 这种引用标记
  cleaned = cleaned.replace(/\[\d+\]/g, '');
  // 移除 [citation:3] / [CITATION: 6] 这类学术风格引用标记
  cleaned = cleaned.replace(/\[\s*citation\s*:\s*\d+\s*\]/gi, '');
  // 移除引用说明文字（从"引用："开始到文末的所有内容）
  cleaned = cleaned.replace(/(?:主要)?引用[:：]\s*[\s\S]*$/gmi, '');
  cleaned = cleaned.replace(/参考资料[:：]\s*[\s\S]*$/gmi, '');
  cleaned = cleaned.replace(/来源[:：]\s*[\s\S]*$/gmi, '');
  // 移除方括号/书名号/圆括号中的"回复/引用"类标签
  cleaned = cleaned.replace(/\[[\s\u3000]*(回复|回覆|引用|Reply|Quote)[^\]]*\]\s*/gi, '');
  cleaned = cleaned.replace(/【[\s\u3000]*(回复|回覆|引用|Reply|Quote)[^】]*】\s*/gi, '');
  cleaned = cleaned.replace(/（[\s\u3000]*(回复|回覆|引用|Reply|Quote)[^）]*）\s*/gi, '');
  // 移除行首的"回复: / 引用: / 参考资料: / 来源:"
  cleaned = cleaned.replace(/^[\t\s]*(回复|回覆|引用|参考资料|来源)[:：].*$/gmi, '');
  
  // 4. 移除Markdown链接格式
  // [链接文字](url) -> 完全移除
  cleaned = cleaned.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '');
  
  // 5. 移除独立成行的完整URL
  cleaned = cleaned.replace(/^\s*\[?\]?https?:\/\/[^\s]+\s*$/gm, '');
  
  // 6. 移除URL括号 (https://...)
  cleaned = cleaned.replace(/\((https?:\/\/[^\)]+)\)/g, '');
  
  // 7. 移除残留的[]空括号
  cleaned = cleaned.replace(/\[\s*\]/g, '');
  
  // 8. 清理多余的空行（超过2个连续换行）
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // 8. 清理行首行尾的空格
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');
  
  // 9. 移除“独立的”动作/语气描写（括号内容）
  // 只移除更像舞台动作的写法，例如：
  // - （笑）/ (笑) / （沉默） 这种短内容
  // - 作为整行，或出现在句首/句尾并被空白分隔
  // 避免误删正常文本里的括号内容（比如解释、括号补充），导致标点断裂和阅读不顺。
  cleaned = cleaned.replace(
    /(^|\n)\s*[\(（](?!https?:\/\/|\d+)([^()（）\n]{1,12})[\)）]\s*(?=\n|$)/g,
    '$1'
  );
  cleaned = cleaned.replace(
    /(^|[\s\u3000])[\(（](?!https?:\/\/|\d+)([^()（）\n]{1,12})[\)）](?=$|[\s\u3000])/g,
    '$1'
  );
  
  // 10. 再次清理可能产生的空括号或多余标点
  cleaned = cleaned.replace(/[\(（]\s*[\)）]/g, '');

  // 11. 移除模型内部使用的角色标记，防止诸如 <|assistant|> / <|user|> 直接出现在对话中
  cleaned = cleaned.replace(/<\|assistant\|>/gi, '');
  cleaned = cleaned.replace(/<\|user\|>/gi, '');
  cleaned = cleaned.replace(/<\|system\|>/gi, '');

  // 12. 移除内部拆条控制标记，避免 [NEXT] 出现在最终显示文本中
  cleaned = stripDisplayControlTags(cleaned);
  
  return cleaned.trim();
};

/**
 * 消息分割器
 * - 使用 [NEXT] 分割标记将消息分割成多条
 * - 如果没有 [NEXT] 标记，返回单条消息
 */
export type SplitPreference = 'smart' | 'single' | 'split';

export interface SplitMessagesOptions {
  preference?: SplitPreference;
  conversationType?: 'private' | 'group';
  lastUserMessage?: string;
  maxBubbles?: number;
  characterProfileText?: string;
}
export const splitMessages = (message: string, _options?: SplitMessagesOptions): string[] => {
  if (!message || message.trim() === '') {
    return [];
  }

  const raw = message.trim();

  // 旧版协议：优先且仅按 [NEXT] 显式拆分（大小写/空格兼容）
  if (/\[\s*NEXT\s*\]/i.test(raw)) {
    const parts = raw
      .split(/\[\s*NEXT\s*\]/i)
      .map(part => part.trim())
      .filter(part => part.length > 0);

    if (parts.length > 0) {
      console.log(`🔄 [分割器] 使用 [NEXT] 分割，共 ${parts.length} 条消息`);
      return parts;
    }
  }

  // 没有 [NEXT] 就保持单条，避免“智能拆分”造成不稳定行为
  return [raw];
};
