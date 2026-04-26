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

export const normalizeMessagePreviewText = (raw: string): string => {
  if (!raw) return '暂无消息';

  const withMediaTokens = raw
    .replace(/\[(?:STICKER|表情包)[:：][^\]]+\]/gi, '[表情]')
    .replace(/\[(?:系统表情|EMOJI|emoji)[:：][^\]]+\]/gi, '[表情]')
    .replace(/\[(?:IMAGE|IMG|图片)[:：][^\]]+\]/gi, '[图片]')
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
  
  let cleaned = message;
  
  // 1. 移除Markdown加粗标记 **文字**，但保留内容
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  
  // 2. 移除列表标记
  // 移除 "* **标题：** 内容" 这种格式，保留"标题：内容"
  cleaned = cleaned.replace(/^\s*[\*\-]\s+\*\*([^:：]+)[:：]\*\*\s*/gm, '$1：');
  // 移除普通列表标记 "* 内容"
  cleaned = cleaned.replace(/^\s*[\*\-]\s+/gm, '');
  
  // 3. 移除引用标记和引用链接
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

const looksLikeLongformRequest = (text: string): boolean => {
  if (!text) return false;
  return /(写信|一封信|邮件|长文|文章|报告|总结|详细|完整|润色|扩写|文案|公告|通知|方案)/.test(text);
};

const looksLikeLongformContent = (text: string): boolean => {
  if (!text) return false;
  const hasManyParagraphs = (text.match(/\n/g) || []).length >= 3;
  const hasLetterStyle = /(亲爱的|此致|敬礼|你好，|您好，)/.test(text);
  const hasCodeOrBlock = /```|^\s{2,}|\n[-*]\s|\n\d+[\.\)、]\s/m.test(text);
  const veryLong = text.length >= 260;
  return hasManyParagraphs || hasLetterStyle || hasCodeOrBlock || veryLong;
};

const isCalmStyleProfile = (profile: string): boolean => {
  if (!profile) return false;
  return /(沉稳|冷静|克制|理性|简洁|正式|严谨|社畜|上班族|内敛|少说话|稳重)/.test(profile);
};

const isLivelyStyleProfile = (profile: string): boolean => {
  if (!profile) return false;
  return /(活泼|热情|可爱|外向|话痨|元气|大学生|少女|爱聊天|碎碎念|俏皮|幽默)/.test(profile);
};

const LEADING_PUNCTUATION_REGEX = /^[，。！？!?,.:：；;）】」』》”"'’\s]+/;

const decideSplitMode = (message: string, options?: SplitMessagesOptions): 'single' | 'split' => {
  const preference = options?.preference ?? 'smart';
  if (preference === 'single') return 'single';
  if (preference === 'split') return 'split';

  const lastUserMessage = options?.lastUserMessage?.trim() || '';
  const normalized = message.trim();
  const profile = options?.characterProfileText?.trim() || '';

  // 软权重策略：不做硬性“一票否决”，而是综合语境给出倾向
  // score > 0 趋向单条，score < 0 趋向拆分
  let score = 0;

  // 明确长文语境：优先整段输出，不强拆
  if (looksLikeLongformRequest(lastUserMessage) || looksLikeLongformContent(normalized)) {
    score += 3;
  }

  // 人设驱动：仅作为“倾向”参考，不强制
  if (isCalmStyleProfile(profile)) {
    score += 1;
  }
  if (isLivelyStyleProfile(profile) && normalized.length >= 24) {
    score -= 1;
  }

  // 私聊短回复更接近真人：通常不拆
  if ((options?.conversationType ?? 'private') === 'private' && normalized.length <= 80) {
    score += 1;
  }

  // 回复很长且不是长文任务时，更适合拆成几条，阅读体验更好
  if (normalized.length >= 180 && !looksLikeLongformRequest(lastUserMessage)) {
    score -= 1;
  }

  return score > 0 ? 'single' : 'split';
};

export const splitMessages = (message: string, options?: SplitMessagesOptions): string[] => {
  if (!message || message.trim() === '') {
    return [];
  }
  
  const raw = message.trim();
  const chosenMode = decideSplitMode(raw, options);

  const normalize = (s: string) =>
    s
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

  const finalizeSegments = (segments: string[]): string[] => {
    const clean = segments.map(normalize).filter(Boolean);
    if (clean.length <= 1) return clean;

    const merged: string[] = [];
    for (const seg of clean) {
      const cur = seg.trim();
      if (!cur) continue;

      // 1) 如果当前分段开头是“后置符号”（例如 。”！？】）等），拼回上一段
      // 防止出现：上一段“你好” 下一段“。”这种生硬拆分
      if (merged.length > 0 && LEADING_PUNCTUATION_REGEX.test(cur)) {
        const leading = cur.match(LEADING_PUNCTUATION_REGEX)?.[0] ?? '';
        const rest = cur.slice(leading.length).trim();
        if (leading) {
          merged[merged.length - 1] = `${merged[merged.length - 1]}${leading.trimStart()}`;
        }
        // 仅把前置标点粘回上一条，正文继续作为当前条，避免出现 "。你说..." 整段被粘到媒体标记后。
        if (!rest) {
          continue;
        }
        merged.push(rest);
        continue;
      }

      // 2) 若上一段以“明显未完结结构”结尾，则和当前段合并：
      // - 枚举序号：1. / 2、 / 3:
      // - 以冒号结尾：例如“我想说：”
      // - 只有开引号：例如“ 或 "
      if (merged.length > 0) {
        const prev = merged[merged.length - 1].trim();
        const prevIsListMarker = /^(\d+[\.\)、]|[一二三四五六七八九十]+[、：:]|[•\-*])\s*$/.test(prev);
        const prevEndsWithColon = /[:：]$/.test(prev);
        const prevIsOpeningQuote = /^[“"「『‘']$/.test(prev);

        if (prevIsListMarker || prevEndsWithColon || prevIsOpeningQuote) {
          merged[merged.length - 1] = `${prev}\n${cur}`.trim();
          continue;
        }
      }

      merged.push(cur);
    }

    // 3) 如果某一段仅是闭引号，拼回上一段
    const fixedQuotes: string[] = [];
    for (const seg of merged) {
      if (fixedQuotes.length > 0 && /^[”"」』’']+$/.test(seg)) {
        fixedQuotes[fixedQuotes.length - 1] = `${fixedQuotes[fixedQuotes.length - 1]}${seg}`;
      } else {
        fixedQuotes.push(seg);
      }
    }

    // 4) 避免过碎：非常短的段落（<=3）且无独立语义时，拼回上一段
    const compact: string[] = [];
    for (const seg of fixedQuotes) {
      if (
        compact.length > 0 &&
        seg.length <= 3 &&
        !/^(嗯|啊|哦|好|行|可以|哈哈|好的)[!！。]?$/i.test(seg)
      ) {
        compact[compact.length - 1] = `${compact[compact.length - 1]}${seg}`;
      } else {
        compact.push(seg);
      }
    }

    return compact.map(normalize).filter(Boolean);
  };

  const applyBubbleLimit = (segments: string[]): string[] => {
    const maxBubbles = Math.max(1, options?.maxBubbles ?? 4);
    if (segments.length <= maxBubbles) return segments;

    const keep = segments.slice(0, maxBubbles - 1);
    const rest = segments.slice(maxBubbles - 1).join('\n');
    return [...keep, rest];
  };

  // 明确要求单条，或智能判断为长文模式 -> 整段发一条
  if (chosenMode === 'single') {
    return [normalize(raw)];
  }

  // 1) 优先使用模型显式标记 [NEXT]（大小写/空格均兼容）
  if (/\[\s*NEXT\s*\]/i.test(raw)) {
    const parts = raw
      .split(/\[\s*NEXT\s*\]/i)
      .map(normalize)
      .filter(Boolean);

    // 防止出现“单独一个标点/表情”被拆成一条：把太短的片段黏回上一条
    const merged: string[] = [];
    for (const p of parts) {
      if (merged.length === 0) {
        merged.push(p);
        continue;
      }
      if (p.length <= 2 && /^[，。！？!?,\.…]+$/.test(p)) {
        merged[merged.length - 1] += p;
      } else {
        merged.push(p);
      }
    }

    const finalized = finalizeSegments(merged);
    if (finalized.length > 0) {
      console.log(`🔄 [分割器] 使用 [NEXT] 分割，共 ${finalized.length} 条消息`);
      return applyBubbleLimit(finalized);
    }
  }

  // 2) 其次按段落（双换行）拆分：最符合阅读/聊天习惯
  if (raw.includes('\n\n')) {
    const paras = raw
      .split(/\n\s*\n/)
      .map(normalize)
      .filter(Boolean);
    if (paras.length > 1) return applyBubbleLimit(finalizeSegments(paras));
  }

  // 2.5) 聊天短句的“单换行”通常表示想分条发送，而不是同一气泡内换行
  // 例如：`你😂\n你礼貌吗？` 应该优先拆成两条消息
  if (raw.includes('\n')) {
    const lines = raw
      .split('\n')
      .map(normalize)
      .filter(Boolean);

    const hasStructuredLine = lines.some(line => /^(\d+[\.\)、]|[一二三四五六七八九十]+[、：:]|[-*•])\s*/.test(line));
    const maxLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0);
    const totalLength = lines.reduce((sum, line) => sum + line.length, 0);

    // 只在“明显口语短句”场景拆分，避免误伤列表/长文排版
    if (
      lines.length >= 2 &&
      lines.length <= 4 &&
      !hasStructuredLine &&
      maxLineLength <= 26 &&
      totalLength <= 80
    ) {
      return applyBubbleLimit(finalizeSegments(lines));
    }
  }

  // 3) 再按“完整句子”拆分：标点跟着句子走，避免标点乱飞
  // 规则：遇到中英文句末标点（。！？!?…）或连续省略号，尽量切分
  const sentences: string[] = [];
  const text = normalize(raw);
  let buf = '';

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    buf += ch;

    const isEndPunc =
      ch === '。' ||
      ch === '！' ||
      ch === '？' ||
      ch === '!' ||
      ch === '?' ||
      ch === '…';

    if (!isEndPunc) continue;

    // 合并连续省略号……
    if (ch === '…') {
      while (i + 1 < text.length && text[i + 1] === '…') {
        buf += text[i + 1];
        i += 1;
      }
    }

    const trimmed = buf.trim();
    if (trimmed) sentences.push(trimmed);
    buf = '';
  }

  const tail = buf.trim();
  if (tail) sentences.push(tail);

  // 如果切得太碎（比如每句话都很短），就合并相邻短句，避免“机械拆条”
  const result: string[] = [];
  for (const s of sentences) {
    if (result.length === 0) {
      result.push(s);
      continue;
    }
    const last = result[result.length - 1];
    if (last.length < 12) {
      result[result.length - 1] = `${last}\n${s}`.trim();
    } else {
      result.push(s);
    }
  }

  const finalized = finalizeSegments(result.length > 0 ? result : [text]);
  return applyBubbleLimit(finalized.length > 0 ? finalized : [text]);
};
