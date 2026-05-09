const STORAGE_PREFIX = 'momoyu_private_ai_img_cnt';

function calendarDayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function storageKey(conversationId: string): string {
  return `${STORAGE_PREFIX}:${conversationId}:${calendarDayKey()}`;
}

/** 当前自然日、该会话已成功落图的张数 */
export function getPrivateAiImageDayCount(conversationId: string): number {
  try {
    if (typeof localStorage === 'undefined') return 0;
    const raw = localStorage.getItem(storageKey(conversationId));
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  } catch {
    return 0;
  }
}

export function incrementPrivateAiImageDayCount(conversationId: string, delta: number): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const d = Math.max(0, Math.floor(delta));
    if (d === 0) return;
    const next = getPrivateAiImageDayCount(conversationId) + d;
    localStorage.setItem(storageKey(conversationId), String(next));
  } catch {
    // ignore
  }
}
