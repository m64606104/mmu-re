const TZ = 'Asia/Shanghai';

export function getShanghaiParts(ts: number): { day: string; hour: number; weekday: string } {
  // Use Intl timeZone to avoid double-offset bugs.
  const dtf = new Intl.DateTimeFormat('zh-CN', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    weekday: 'long',
  });
  const parts = dtf.formatToParts(new Date(ts));
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  const y = get('year') || '1970';
  const m = get('month') || '01';
  const d = get('day') || '01';
  const hour = Number(get('hour') || '0');
  const weekday = get('weekday') || '';
  return { day: `${y}-${m}-${d}`, hour: Number.isFinite(hour) ? hour : 0, weekday };
}

