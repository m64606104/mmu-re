import type { AILifeSimState, LifeActionCategory, LifeTheme } from './types';
import { smartLoad, smartSave } from '../utils/storage';
import { getShanghaiParts } from './time';

const KEY = 'ai_life_sim_states';
const DEFAULT_RETENTION_DAYS = 7;
const MAX_LIFE_LOGS = 80;

function utc8DayKey(ts: number): string {
  return getShanghaiParts(ts).day;
}

function clamp01to100(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function pickTheme(ts: number): LifeTheme {
  // Lightly biased by time-of-day, still random-ish.
  const hour = getShanghaiParts(ts).hour;
  const r = Math.random();
  if (hour >= 23 || hour < 7) return r < 0.55 ? 'low_energy' : 'solitude';
  if (hour >= 7 && hour < 10) return r < 0.35 ? 'productive' : r < 0.6 ? 'relaxed' : 'anxious';
  if (hour >= 10 && hour < 18) return r < 0.45 ? 'productive' : r < 0.65 ? 'social' : 'anxious';
  return r < 0.4 ? 'social' : r < 0.7 ? 'relaxed' : 'solitude';
}

function inferDefaultGoals(): AILifeSimState['goals'] {
  return [
    { id: 'goal_stability', title: '保持生活稳定节奏', domain: 'lifestyle', priority: 4, progress: 20, active: true },
    { id: 'goal_energy', title: '提升身体与精力状态', domain: 'health', priority: 3, progress: 10, active: true },
    { id: 'goal_connection', title: '维持真实的人际连接', domain: 'social', priority: 3, progress: 15, active: true },
  ];
}

export async function loadLifeSimStates(): Promise<Record<string, AILifeSimState>> {
  const raw = (await smartLoad(KEY)) as Record<string, AILifeSimState> | null;
  return raw && typeof raw === 'object' ? raw : {};
}

export async function saveLifeSimStates(map: Record<string, AILifeSimState>): Promise<void> {
  await smartSave(KEY, map);
}

export async function loadLifeSimState(conversationId: string): Promise<AILifeSimState> {
  const map = await loadLifeSimStates();
  const existing = map[conversationId];
  if (existing) return existing;
  const now = Date.now();
  return {
    conversationId,
    lastTickAt: 0,
    lastDay: utc8DayKey(now),
    theme: pickTheme(now),
    energy: 55,
    mood: 55,
    stress: 40,
    socialNeed: 50,
    fatigueByCategory: {},
    lastActions: [],
    lifeLogs: [],
    goals: inferDefaultGoals(),
    aftereffects: [],
    narrativeThreads: [],
  };
}

function pruneLifeLogs(logs: any[], retentionDays: number): any[] {
  const now = Date.now();
  const keepMs = Math.max(1, retentionDays) * 24 * 60 * 60 * 1000;
  const filtered = (Array.isArray(logs) ? logs : []).filter((l) => {
    const at = Number((l as any)?.at);
    if (!Number.isFinite(at)) return false;
    return now - at <= keepMs;
  });
  filtered.sort((a, b) => Number(b.at) - Number(a.at));
  return filtered.slice(0, MAX_LIFE_LOGS);
}

export async function upsertLifeSimState(
  next: AILifeSimState
): Promise<void> {
  const map = await loadLifeSimStates();
  const now = Date.now();
  map[next.conversationId] = {
    ...next,
    energy: clamp01to100(next.energy),
    mood: clamp01to100(next.mood),
    stress: clamp01to100(next.stress),
    socialNeed: clamp01to100(next.socialNeed),
    fatigueByCategory: next.fatigueByCategory || {},
    lastActions: Array.isArray(next.lastActions) ? next.lastActions.slice(0, 24) : [],
    lifeLogs: pruneLifeLogs((next as any).lifeLogs || [], DEFAULT_RETENTION_DAYS),
    goals: Array.isArray(next.goals) ? next.goals.slice(0, 6).map((g) => ({
      ...g,
      priority: Math.max(1, Math.min(5, Number(g.priority || 3))),
      progress: clamp01to100(Number(g.progress || 0)),
      active: Boolean(g.active),
    })) : inferDefaultGoals(),
    aftereffects: Array.isArray(next.aftereffects)
      ? next.aftereffects.filter((a) => Number(a.expiresAt || 0) > now).slice(0, 10)
      : [],
    narrativeThreads: Array.isArray((next as any).narrativeThreads)
      ? (next as any).narrativeThreads
          .map((t: any) => ({
            id: String(t?.id || ''),
            title: String(t?.title || '').slice(0, 40),
            summary: String(t?.summary || '').slice(0, 180),
            status: t?.status === 'closed' ? 'closed' : t?.status === 'fading' ? 'fading' : 'active',
            tags: Array.isArray(t?.tags) ? t.tags.slice(0, 8).map((x: any) => String(x).slice(0, 18)) : [],
            relatedCategories: Array.isArray(t?.relatedCategories) ? t.relatedCategories.slice(0, 4) : [],
            hitCount: Math.max(1, Math.min(9999, Number(t?.hitCount || 1))),
            lastUpdatedAt: Number(t?.lastUpdatedAt || now),
          }))
          .filter((t: any) => t.id && t.title && t.summary)
          .sort((a: any, b: any) => Number(b.lastUpdatedAt) - Number(a.lastUpdatedAt))
          .slice(0, 8)
      : [],
  };
  await saveLifeSimStates(map);
}

export async function cleanupLifeSimStates(retentionDays: number = DEFAULT_RETENTION_DAYS): Promise<void> {
  const map = await loadLifeSimStates();
  let changed = false;
  Object.keys(map).forEach((id) => {
    const st = map[id];
    if (!st) return;
    const beforeLen = Array.isArray((st as any).lifeLogs) ? (st as any).lifeLogs.length : 0;
    const nextLogs = pruneLifeLogs((st as any).lifeLogs || [], retentionDays);
    if (nextLogs.length !== beforeLen) {
      (st as any).lifeLogs = nextLogs;
      changed = true;
    }
  });
  if (changed) await saveLifeSimStates(map);
}

export function applyDeltas(
  state: AILifeSimState,
  deltas: { energyDelta: number; moodDelta: number; stressDelta: number; socialDelta: number },
  action?: { category: LifeActionCategory; label: string; at: number }
): AILifeSimState {
  const next: AILifeSimState = {
    ...state,
    lastTickAt: action?.at ?? Date.now(),
    energy: clamp01to100(state.energy + (deltas.energyDelta || 0)),
    mood: clamp01to100(state.mood + (deltas.moodDelta || 0)),
    stress: clamp01to100(state.stress + (deltas.stressDelta || 0)),
    socialNeed: clamp01to100(state.socialNeed + (deltas.socialDelta || 0)),
  };
  if (action) {
    const fatigue = { ...(state.fatigueByCategory || {}) };
    // Soft fatigue increases if repeated; slowly decays elsewhere.
    (Object.keys(fatigue) as LifeActionCategory[]).forEach((k) => {
      fatigue[k] = clamp01to100((fatigue[k] ?? 0) - 4);
    });
    fatigue[action.category] = clamp01to100((fatigue[action.category] ?? 0) + 12);
    next.fatigueByCategory = fatigue;
    next.lastActions = [{ at: action.at, category: action.category, label: action.label }, ...(state.lastActions || [])].slice(0, 24);
  }
  return next;
}

export function ensureDayTheme(state: AILifeSimState, now: number): AILifeSimState {
  const day = utc8DayKey(now);
  if (state.lastDay === day) return state;
  return {
    ...state,
    lastDay: day,
    theme: pickTheme(now),
    // gentle daily decay, feels more "alive"
    fatigueByCategory: {},
    socialNeed: clamp01to100(state.socialNeed + 6),
    stress: clamp01to100(state.stress - 4),
    goals: Array.isArray(state.goals) ? state.goals.map((g) => ({
      ...g,
      progress: clamp01to100((g.progress || 0) + (g.active ? 1 : 0)),
    })) : inferDefaultGoals(),
    aftereffects: (state.aftereffects || []).filter((a) => Number(a.expiresAt || 0) > now),
  };
}

export function isLikelySleepingNow(state: AILifeSimState, now: number): boolean {
  const lastAction = Array.isArray(state.lastActions) ? state.lastActions[0] : undefined;
  if (!lastAction) return false;
  if (lastAction.category !== 'sleep') return false;
  const asleepMs = now - Number(lastAction.at || 0);
  if (asleepMs < 0) return false;
  // 近8小时内最后动作是 sleep，视作仍在睡眠阶段
  return asleepMs <= 8 * 60 * 60 * 1000;
}

export async function applyUserChatImpact(params: {
  conversationId: string;
  now: number;
  recentUserMessageCount: number;
  wakeSensitivityMode?: 'auto' | 'light' | 'normal' | 'deep';
}): Promise<{ wasSleeping: boolean; wokeUp: boolean; wakeThreshold: number; wakeMode: 'auto' | 'light' | 'normal' | 'deep' }> {
  const { conversationId, now, recentUserMessageCount, wakeSensitivityMode } = params;
  const state = await loadLifeSimState(conversationId);
  if (!isLikelySleepingNow(state, now)) {
    return { wasSleeping: false, wokeUp: false, wakeThreshold: 0, wakeMode: wakeSensitivityMode || 'auto' };
  }

  const pick = (arr: number[]) => arr[Math.floor(Math.random() * arr.length)];
  const pickRange = (min: number, max: number, weights?: number[]) => {
    const len = Math.max(0, max - min + 1);
    const candidates = Array.from({ length: len }).map((_, i) => min + i);
    if (!weights || weights.length !== candidates.length) return pick(candidates);
    const sum = weights.reduce((a, b) => a + Math.max(0, b), 0) || 1;
    let r = Math.random() * sum;
    for (let i = 0; i < candidates.length; i++) {
      r -= Math.max(0, weights[i]);
      if (r <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
  };

  const mode = wakeSensitivityMode || 'auto';
  const day = utc8DayKey(now);
  const todayLogs = ((state as any).lifeLogs || []).filter((l: any) => String(l?.day || '') === day);
  const todayHeavyActions = todayLogs.filter((l: any) =>
    ['work', 'study', 'commute', 'errand', 'exercise'].includes(String(l?.actionCategory || ''))
  ).length;
  const wakeThreshold = (() => {
    // 手动三档：扩大到 1-7
    // - 易醒：1-2（更偏 1）
    // - 普通：2-4（偏 3）
    // - 深睡：4-7（偏 6）
    if (mode === 'light') return pickRange(1, 2, [0.65, 0.35]);
    if (mode === 'normal') return pickRange(2, 4, [0.25, 0.5, 0.25]);
    if (mode === 'deep') return pickRange(4, 7, [0.12, 0.22, 0.34, 0.32]);

    // auto: 结合当天轨迹 + 状态做随机（1-7）
    const socialNeed = Number(state.socialNeed ?? 50);
    const stress = Number(state.stress ?? 50);
    const energy = Number(state.energy ?? 50);
    const mood = Number(state.mood ?? 50);

    // 基础：多数落在 2-5
    let baseMin = 2;
    let baseMax = 5;

    // 疲惫/负荷高 → 更深睡
    if (todayHeavyActions >= 6) { baseMin += 1; baseMax += 2; }
    else if (todayHeavyActions >= 4) { baseMin += 0; baseMax += 1; }
    if (energy <= 28) { baseMin += 1; baseMax += 2; }
    else if (energy <= 40) { baseMax += 1; }

    // 紧张/思虑多 → 更浅眠（容易醒）
    if (stress >= 78) { baseMin -= 1; baseMax -= 1; }
    else if (stress >= 70) { baseMin -= 1; }
    if (mood <= 28) { baseMin -= 1; }

    // 社交欲高：被消息“牵动”更容易醒一点
    if (socialNeed >= 75) { baseMin -= 1; }

    baseMin = Math.max(1, Math.min(6, baseMin));
    baseMax = Math.max(baseMin, Math.min(7, baseMax));

    // 权重：中间值更常见
    const len = baseMax - baseMin + 1;
    const center = (baseMin + baseMax) / 2;
    const weights = Array.from({ length: len }).map((_, i) => {
      const v = baseMin + i;
      const dist = Math.abs(v - center);
      return Math.max(0.08, 1.0 - dist * 0.35);
    });
    return pickRange(baseMin, baseMax, weights);
  })();

  const wokeUp = recentUserMessageCount >= wakeThreshold;
  const impactCategory: LifeActionCategory = wokeUp ? 'rest' : 'sleep';
  const nextState: AILifeSimState = {
    ...state,
    lastTickAt: now,
    socialNeed: clamp01to100(state.socialNeed - (wokeUp ? 12 : 4)),
    stress: clamp01to100(state.stress + (wokeUp ? 10 : 3)),
    energy: clamp01to100(state.energy - (wokeUp ? 8 : 2)),
    mood: clamp01to100(state.mood - (wokeUp ? 4 : 1)),
    lastActions: [
      {
        at: now,
        category: impactCategory,
        label: wokeUp ? '被用户消息叫醒' : '被消息打扰后继续睡',
      },
      ...(state.lastActions || []),
    ].slice(0, 24),
    lifeLogs: [
      {
        at: now,
        day,
        actionCategory: impactCategory,
        actionLabel: wokeUp ? '被用户叫醒' : '被轻微打扰',
        detail: wokeUp
          ? `本来在睡觉，收到用户消息后醒来（叫醒阈值${wakeThreshold}条），先迷糊了一会儿再看手机。`
          : `睡眠中收到用户消息提醒（叫醒阈值${wakeThreshold}条），短暂翻身后继续深睡。`,
      },
      ...((state as any).lifeLogs || []),
    ],
  };

  await upsertLifeSimState(nextState);
  return { wasSleeping: true, wokeUp, wakeThreshold, wakeMode: mode };
}

