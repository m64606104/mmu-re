/**
 * 私聊「用户进入会话」频次（localStorage，仅本机）。
 * 供生活模拟 resolveChatActivity 参考：多看少发也应略提高后台推进频率。
 */

const STORAGE_PREFIX = 'momoyu_life_pc_open_v1:';
const MAX_STORED = 80;
const MS_DAY = 24 * 60 * 60 * 1000;

function keyFor(convId: string): string {
  return `${STORAGE_PREFIX}${convId}`;
}

function readTimestamps(convId: string): number[] {
  try {
    const raw = localStorage.getItem(keyFor(convId));
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => Number(x))
      .filter((t) => Number.isFinite(t) && t > 0)
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}

function writeTimestamps(convId: string, ts: number[]): void {
  try {
    const pruned = ts
      .filter((t) => Number.isFinite(t))
      .sort((a, b) => a - b)
      .slice(-MAX_STORED);
    localStorage.setItem(keyFor(convId), JSON.stringify(pruned));
  } catch {
    /* ignore */
  }
}

/**
 * 记录用户进入该私聊（切换进 ChatScreen 时调用）。
 * @param minGapMs 同一会话两次计入的最小间隔，避免短时间切页刷次数（默认 90s）
 */
export function recordPrivateChatOpened(convId: string, now: number = Date.now(), minGapMs: number = 90_000): void {
  if (!convId) return;
  const prev = readTimestamps(convId);
  const last = prev.length ? prev[prev.length - 1] : 0;
  if (now - last < minGapMs) return;
  const cutoff = now - MS_DAY;
  const kept = prev.filter((t) => t >= cutoff);
  kept.push(now);
  writeTimestamps(convId, kept);
}

/** 滚动 24h 内（含）进入该私聊的次数 */
export function getPrivateChatOpenCountRolling24h(convId: string, now: number = Date.now()): number {
  if (!convId) return 0;
  const cutoff = now - MS_DAY;
  return readTimestamps(convId).filter((t) => t >= cutoff).length;
}
