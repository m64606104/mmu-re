import type { ApiConfig, Conversation } from '../types';

export type LifeTheme = 'social' | 'solitude' | 'anxious' | 'relaxed' | 'productive' | 'low_energy';

export type LifeActionCategory =
  | 'study'
  | 'work'
  | 'commute'
  | 'eat'
  | 'sleep'
  | 'rest'
  | 'scroll'
  | 'exercise'
  | 'socialize'
  | 'hobby'
  | 'errand'
  | 'mood';

export interface LifeActionRecord {
  at: number;
  category: LifeActionCategory;
  label: string;
}

export interface LifeLogFragment {
  at: number;
  day: string; // UTC+8
  actionCategory: LifeActionCategory;
  actionLabel: string;
  detail: string;
  hitReason?: {
    candidates: string[];
    avoid: string[];
    rankedCandidates?: Array<{ category: string; score: number }>;
    goalBiasTop?: Array<{ category: string; score: number }>;
    aftereffectBiasTop?: Array<{ category: string; score: number }>;
    selectedCategory?: string;
    selectedScore?: number;
    selectedWasAvoid?: boolean;
    selectedReasons?: string[];
  };
}

export type LifeGoalDomain = 'career' | 'study' | 'health' | 'social' | 'finance' | 'lifestyle';

export interface LifeGoal {
  id: string;
  title: string;
  domain: LifeGoalDomain;
  priority: number; // 1-5
  progress: number; // 0-100
  active: boolean;
}

export interface LifeAftereffect {
  key: string;
  reason: string;
  expiresAt: number;
  actionBias?: Partial<Record<LifeActionCategory, number>>; // -100..100
}

export interface LifeNarrativeThread {
  id: string;
  title: string;
  summary: string;
  status: 'active' | 'fading' | 'closed';
  tags?: string[];
  relatedCategories?: LifeActionCategory[];
  hitCount: number;
  lastUpdatedAt: number;
}

export interface AILifeSimState {
  conversationId: string;
  lastTickAt: number;
  /** 上一次调用生活模拟 LLM 的时间（含失败）；用于冷却，避免 429 后每次聚焦又并发打满接口 */
  lastSimApiAttemptAt?: number;
  lastDay: string; // UTC+8 day key
  theme: LifeTheme;
  energy: number; // 0-100
  mood: number; // 0-100
  stress: number; // 0-100
  socialNeed: number; // 0-100
  fatigueByCategory: Partial<Record<LifeActionCategory, number>>; // 0-100
  lastActions: LifeActionRecord[]; // most recent first, capped
  lifeLogs?: LifeLogFragment[]; // 后台生活碎片（仅内部使用，可清理）
  goals?: LifeGoal[]; // 长期目标
  aftereffects?: LifeAftereffect[]; // 事件后效（短期持续影响）
  narrativeThreads?: LifeNarrativeThread[]; // 近期叙事线程（因果链）
}

export interface LifeSimContext {
  now: number;
  day: string;
  weekday: string;
  hour: number;
  conversation: Conversation;
  apiConfig: ApiConfig;
  state: AILifeSimState;
}

export interface LifeSimModelOutput {
  // One natural "what happened" fragment, not shown to user by default.
  lifeUpdate: {
    actionCategory: LifeActionCategory;
    actionLabel: string;
    detail: string;
    energyDelta: number; // -30..30
    moodDelta: number; // -30..30
    stressDelta: number; // -30..30
    socialDelta: number; // -30..30
  };
  diary?: string;
  events?: Array<{
    title: string;
    description: string;
    status?: 'pending' | 'confirmed' | 'failed';
    tags?: string[];
  }>;
  aiSelfProfileDelta?: string;
  userProfileDelta?: string;
  narrativeThreadUpdates?: Array<{
    id?: string;
    title: string;
    summary: string;
    status?: 'active' | 'fading' | 'closed';
    tags?: string[];
    relatedCategories?: LifeActionCategory[];
  }>;
}

