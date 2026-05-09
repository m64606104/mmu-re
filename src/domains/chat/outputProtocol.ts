export interface AssistantOutputValidationResult {
  valid: boolean;
  reason?: string;
}

const FORBIDDEN_NARRATION_PATTERNS: RegExp[] = [
  /\[(?:用户|你|我)发送了(?:一个|一条|一张|一段)?(?:表情包|图片|视频|语音)[^[]*[:：][^\]]*\]/i,
  /\[(?:用户|你|我)发送了(?:一个|一条|一张|一段)?(?:表情包|图片|视频|语音)\]/i,
  /\[(?:系统提示|提示|说明)[:：][^\]]*\]/i,
];

export function validateAssistantOutput(content: string): AssistantOutputValidationResult {
  const text = (content || '').trim();
  if (!text) {
    return { valid: false, reason: 'empty-output' };
  }

  for (const pattern of FORBIDDEN_NARRATION_PATTERNS) {
    if (pattern.test(text)) {
      return { valid: false, reason: 'forbidden-narration-tag' };
    }
  }

  return { valid: true };
}

export function buildProtocolRetryInstruction(): string {
  return [
    '【格式纠正】',
    '你上一条包含了不支持的“说明型标签”（例如“[用户发送了一个表情包:xxx]”）。',
    '请直接重发最终回复内容，不要解释规则；需要特殊内容时只用这些标记：',
    '- [NEXT]',
    '- [表情包:描述] / [STICKER:描述]',
    '- [图片:描述] / [IMG:描述]',
    '- [视频:描述] / [VID:描述]',
    '- [语音:内容,时长X秒] / [VOICE:内容:秒数]',
    '- [系统表情:关键词或emoji] / [EMOJI:关键词或emoji]',
    '- [引用消息:消息ID]（须与上文〈消息ID:…〉一致；尾部静默，会剥掉）',
  ].join('\n');
}

export function isValidDocumentJsonOutput(content: string): boolean {
  const text = (content || '').trim();
  if (!text) return false;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  try {
    const parsed = JSON.parse(candidate);
    if (!parsed || typeof parsed !== 'object') return false;
    const doc = (parsed as any).document && typeof (parsed as any).document === 'object'
      ? (parsed as any).document
      : parsed;
    return typeof doc.title === 'string' && doc.title.trim().length > 0
      && typeof doc.content === 'string' && doc.content.trim().length > 0;
  } catch {
    return false;
  }
}

export function buildDocumentJsonRetryInstruction(): string {
  return [
    '【文档协议纠正】',
    '你上一条没有按文档 JSON 协议输出。',
    '请仅输出一个 JSON 对象，不要输出任何解释、前后缀、Markdown 文本。',
    '格式如下：',
    '{',
    '  "document": {',
    '    "title": "文档标题",',
    '    "type": "text",',
    '    "greeting": "请查收",',
    '    "content": "完整正文内容"',
    '  }',
    '}',
    '注意：只能输出 JSON。禁止输出 [DOC:...] 或自然语言包装。',
  ].join('\n');
}

