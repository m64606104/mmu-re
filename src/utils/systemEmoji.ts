const SYSTEM_EMOJI_MAP: Record<string, string> = {
  '微笑': '😊',
  '笑': '😊',
  '开心': '😄',
  '大笑': '😂',
  '笑哭': '😂',
  '害羞': '☺️',
  '可爱': '🥰',
  '亲亲': '😘',
  '赞': '👍',
  'ok': '👌',
  '比心': '🫶',
  '爱心': '❤️',
  '疑问': '🤔',
  '无语': '😅',
  '惊讶': '😮',
  '震惊': '😱',
  '委屈': '🥺',
  '难过': '😢',
  '哭': '😭',
  '生气': '😠',
  '尴尬': '😬',
  '捂脸': '🤦',
  '耶': '✌️',
  '鼓掌': '👏',
  '庆祝': '🎉',
  '加油': '💪',
  '晚安': '🌙',
  '太阳': '☀️',
  '爱你': '😘',
};

function normalizeKey(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isSingleEmojiText(input?: string): boolean {
  if (!input) return false;
  const text = input.trim();
  if (!text) return false;
  // Single emoji can contain VS16/ZWJ, but should be short.
  return /\p{Extended_Pictographic}/u.test(text) && Array.from(text).length <= 4;
}

export function resolveSystemEmoji(input: string): string | null {
  const normalized = normalizeKey(input);
  if (!normalized) return null;
  if (isSingleEmojiText(normalized)) return normalized;
  return SYSTEM_EMOJI_MAP[normalized] || null;
}
