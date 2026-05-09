import type { ApiConfig, Conversation } from '../types';
import { buildApiUrl } from '../utils/apiHelper';
import { isToolInteractionCharacter } from '../utils/characterInteractionMode';
import { addAIEvent, updateDynamicProfiles, getMemoryBank } from '../utils/memorySystem';
import type { LifeSimModelOutput } from './types';
import { applyDeltas, ensureDayTheme, loadLifeSimState, loadLifeSimStates, upsertLifeSimState } from './storage';
import { getShanghaiParts } from './time';

function utc8Parts(ts: number) {
  return getShanghaiParts(ts);
}

function clampInt(n: any, min: number, max: number, fallback: number) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(min, Math.min(max, Math.round(x)));
}

async function askJson(apiConfig: ApiConfig, prompt: string): Promise<any | null> {
  if (!apiConfig.baseUrl || !apiConfig.apiKey || !apiConfig.modelName) return null;
  try {
    const res = await fetch(buildApiUrl(apiConfig), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiConfig.apiKey}` },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 900,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = String(data?.choices?.[0]?.message?.content || '');
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

type RandomnessMode = 'stable' | 'balanced' | 'divergent';

function getRandomnessMode(): RandomnessMode {
  try {
    const v = (localStorage.getItem('momoyu_sim_randomness_mode') || 'balanced').toLowerCase();
    if (v === 'stable' || v === 'divergent' || v === 'balanced') return v;
  } catch {
    // ignore
  }
  return 'balanced';
}

function modeTemperature(mode: RandomnessMode): number {
  if (mode === 'stable') return 0.68;
  if (mode === 'divergent') return 1.0;
  return 0.88;
}

type SurpriseEventHint = {
  title: string;
  description: string;
  level: 'micro' | 'normal' | 'major';
  nature: 'static' | 'dynamic';
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildSurpriseEventHints(hour: number, mode: RandomnessMode): SurpriseEventHint[] {
  const microStatic: SurpriseEventHint[] = [
    { title: '路边小观察', description: '注意到一个很细碎但有趣的生活细节（气味、光线、路人动作、店铺声音）', level: 'micro', nature: 'static' },
    { title: '临时念头', description: '突然冒出一个和当下有关的小念头，影响了接下来10~30分钟的行动', level: 'micro', nature: 'dynamic' },
    { title: '偶遇碎片', description: '偶遇一个人/一句话/一只动物，让心情发生轻微变化', level: 'micro', nature: 'dynamic' },
  ];
  const normalDynamic: SurpriseEventHint[] = [
    { title: '临时邀约', description: '收到一个临时邀约（见面/帮忙/活动），你可以接受也可以婉拒', level: 'normal', nature: 'dynamic' },
    { title: '计划打断', description: '原计划被一个现实因素打断（交通/排队/设备问题/突发消息）', level: 'normal', nature: 'dynamic' },
    { title: '新兴趣触发', description: '被某个内容/场景激发，短时间想尝试以前不常做的事情', level: 'normal', nature: 'dynamic' },
  ];
  const major: SurpriseEventHint[] = [
    { title: '关系拐点', description: '与某人的关系出现实质变化（更近/更远/和解/误会）', level: 'major', nature: 'dynamic' },
    { title: '身份变动信号', description: '职业/学业/角色定位出现重大信号（机会、挫折、转向）', level: 'major', nature: 'dynamic' },
    { title: '价值选择时刻', description: '在现实压力下做了一个会影响后续几天的关键选择', level: 'major', nature: 'dynamic' },
  ];

  const hints = [...microStatic];
  // daytime has more social/normal disruptions
  if (hour >= 8 && hour <= 22) hints.push(...normalDynamic);
  // mode controls major-event exposure
  if (mode === 'divergent') hints.push(...major, ...major);
  else if (mode === 'balanced') hints.push(...major);
  else if (mode === 'stable' && Math.random() < 0.18) hints.push(...major.slice(0, 1));
  return hints;
}

type CandidateBias = { category: string; score: number };

type DiversityHint = {
  candidates: string[];
  avoid: string[];
  rankedCandidates: CandidateBias[];
  goalBiasTop: CandidateBias[];
  aftereffectBiasTop: CandidateBias[];
};

function deriveCandidates(params: {
  hour: number;
  energy: number;
  stress: number;
  socialNeed: number;
  recentCategories: string[];
  recentLogs: Array<{ actionCategory?: string; actionLabel?: string; day?: string }>;
  nowDay: string;
  goals?: Array<{ domain: string; priority: number; progress: number; active: boolean }>;
  aftereffects?: Array<{ actionBias?: Record<string, number> }>;
}): DiversityHint {
  const { hour, energy, stress, socialNeed, recentCategories, recentLogs, nowDay, goals, aftereffects } = params;
  const base: string[] = [];
  if (hour >= 0 && hour < 7) base.push('sleep', 'rest', 'scroll', 'mood');
  else if (hour < 10) base.push('eat', 'commute', 'study', 'work', 'scroll');
  else if (hour < 12) base.push('work', 'study', 'errand', 'eat', 'rest');
  else if (hour < 18) base.push('work', 'study', 'commute', 'rest', 'scroll');
  else if (hour < 22) base.push('eat', 'socialize', 'hobby', 'exercise', 'rest', 'scroll');
  else base.push('rest', 'scroll', 'sleep', 'mood');

  const candidates = [...new Set(base)];

  // soft nudges by state
  if (energy <= 35) {
    candidates.unshift('rest', 'sleep');
  } else if (energy >= 75) {
    candidates.unshift('exercise', 'hobby');
  }
  if (stress >= 70) {
    candidates.unshift('rest', 'exercise', 'scroll');
  }
  if (socialNeed >= 70) {
    candidates.unshift('socialize');
  } else if (socialNeed <= 30) {
    candidates.unshift('solitude', 'hobby'); // "solitude" not a category, but hint for detail
  }

  // avoid list: too-recent categories (top 1-2)
  const freq = new Map<string, number>();
  recentCategories.forEach((c) => freq.set(c, (freq.get(c) || 0) + 1));
  const avoid = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .map((x) => x[0])
    .filter((c) => candidates.includes(c))
    .slice(0, 2);

  // Human-first guardrails:
  // 1) Same category streak >= 2 => add hard avoid (unless it's late-night sleep/rest).
  const streakCategory = recentCategories[0];
  const streakCount = streakCategory
    ? recentCategories.findIndex((c) => c !== streakCategory) === -1
      ? recentCategories.length
      : recentCategories.findIndex((c) => c !== streakCategory)
    : 0;
  const hardAvoid = new Set<string>();
  if (streakCategory && streakCount >= 2) {
    const allowRepeat = (streakCategory === 'sleep' || streakCategory === 'rest') && (hour >= 23 || hour < 7);
    if (!allowRepeat) hardAvoid.add(streakCategory);
  }

  // 2) If today already did too much hobby/scroll/socialize, cool them down.
  const todayLogs = recentLogs.filter((l) => l.day === nowDay);
  const todayCount = (cat: string) => todayLogs.filter((l) => l.actionCategory === cat).length;
  if (todayCount('hobby') >= 2) hardAvoid.add('hobby');
  if (todayCount('scroll') >= 2) hardAvoid.add('scroll');
  if (todayCount('socialize') >= 3) hardAvoid.add('socialize');

  // 3) Keep basic life balance: if no eat/sleep/rest in recent logs, boost them.
  const recent10 = recentLogs.slice(0, 10);
  const hasEat = recent10.some((l) => l.actionCategory === 'eat');
  const hasSleepRest = recent10.some((l) => l.actionCategory === 'sleep' || l.actionCategory === 'rest');
  if (!hasEat && hour >= 11 && hour <= 21) candidates.unshift('eat');
  if (!hasSleepRest && (hour >= 22 || hour < 7)) candidates.unshift('sleep', 'rest');

  const finalCandidates = Array.from(new Set(candidates)).filter((c) => !hardAvoid.has(c)).slice(0, 6);
  const finalAvoid = Array.from(new Set([...avoid, ...Array.from(hardAvoid)])).slice(0, 4);

  // Goal bias (long-term direction)
  const score = new Map<string, number>();
  const goalBias = new Map<string, number>();
  const aftereffectBias = new Map<string, number>();
  const addScore = (cat: string, n: number) => score.set(cat, (score.get(cat) || 0) + n);
  const addGoalBias = (cat: string, n: number) => goalBias.set(cat, (goalBias.get(cat) || 0) + n);
  const addAftereffectBias = (cat: string, n: number) => aftereffectBias.set(cat, (aftereffectBias.get(cat) || 0) + n);
  (goals || []).filter((g) => g.active).forEach((g) => {
    const weight = (g.priority || 3) * (1 + (100 - (g.progress || 0)) / 120);
    if (g.domain === 'career') {
      addScore('work', weight);
      addGoalBias('work', weight);
    }
    if (g.domain === 'study') {
      addScore('study', weight);
      addGoalBias('study', weight);
    }
    if (g.domain === 'health') {
      addScore('exercise', weight * 0.9);
      addScore('rest', weight * 0.8);
      addScore('sleep', weight * 0.6);
      addGoalBias('exercise', weight * 0.9);
      addGoalBias('rest', weight * 0.8);
      addGoalBias('sleep', weight * 0.6);
    }
    if (g.domain === 'social') {
      addScore('socialize', weight * 0.9);
      addGoalBias('socialize', weight * 0.9);
    }
    if (g.domain === 'finance') {
      addScore('work', weight * 0.8);
      addGoalBias('work', weight * 0.8);
    }
    if (g.domain === 'lifestyle') {
      addScore('errand', weight * 0.8);
      addScore('rest', weight * 0.6);
      addGoalBias('errand', weight * 0.8);
      addGoalBias('rest', weight * 0.6);
    }
  });

  // Aftereffect bias (confirmed event tail impacts)
  (aftereffects || []).forEach((a) => {
    Object.entries(a.actionBias || {}).forEach(([k, v]) => {
      const val = Number(v) || 0;
      addScore(k, val);
      addAftereffectBias(k, val);
    });
  });

  const scoredPairs = finalCandidates
    .map((c) => ({ category: c, score: Number((score.get(c) || 0).toFixed(2)) }))
    .sort((a, b) => b.score - a.score);
  const scored = scoredPairs.map((x) => x.category);
  const toTop = (m: Map<string, number>) =>
    Array.from(m.entries())
      .map(([category, raw]) => ({ category, score: Number(raw.toFixed(2)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

  return {
    candidates: scored.length > 0 ? scored : ['rest', 'errand', 'eat', 'work'],
    avoid: finalAvoid,
    rankedCandidates: scoredPairs,
    goalBiasTop: toTop(goalBias),
    aftereffectBiasTop: toTop(aftereffectBias),
  };
}

function goalsToText(goals: any[]): string {
  const active = (goals || []).filter((g) => g.active);
  if (active.length === 0) return '（无）';
  return active
    .slice(0, 6)
    .map((g) => `- ${g.title} [${g.domain}] 优先级${g.priority} 进度${g.progress}`)
    .join('\n');
}

function recentNarrativeThreadsToText(threads: any[]): string {
  const list = Array.isArray(threads) ? threads : [];
  if (list.length === 0) return '（无）';
  return list
    .slice()
    .sort((a, b) => Number(b?.lastUpdatedAt || 0) - Number(a?.lastUpdatedAt || 0))
    .slice(0, 5)
    .map((t) => `- [${t.status || 'active'}] ${t.title}（命中${t.hitCount || 1}次）：${t.summary}`)
    .join('\n');
}

function updateNarrativeThreads(params: {
  prevThreads: any[];
  now: number;
  lifeUpdate: { actionCategory: string; actionLabel: string; detail: string };
  events: Array<{ title?: string; description?: string; status?: string; tags?: string[] }>;
  modelUpdates?: Array<{ id?: string; title?: string; summary?: string; status?: string; tags?: string[]; relatedCategories?: string[] }>;
}) {
  const { prevThreads, now, lifeUpdate, events, modelUpdates } = params;
  const next = Array.isArray(prevThreads) ? prevThreads.map((x) => ({ ...x })) : [];
  const staleFadeMs = 3 * 24 * 60 * 60 * 1000;
  const staleCloseMs = 7 * 24 * 60 * 60 * 1000;

  next.forEach((t: any) => {
    const dt = now - Number(t?.lastUpdatedAt || 0);
    if (dt > staleCloseMs) t.status = 'closed';
    else if (dt > staleFadeMs && t.status === 'active') t.status = 'fading';
  });

  const upsertThread = (payload: any) => {
    const pid = String(payload?.id || '');
    const ptitle = String(payload?.title || '').trim().slice(0, 40);
    const psummary = String(payload?.summary || '').trim().slice(0, 180);
    const pstatus = payload?.status === 'closed' ? 'closed' : payload?.status === 'fading' ? 'fading' : 'active';
    const ptags = Array.isArray(payload?.tags) ? payload.tags.slice(0, 8).map((x: any) => String(x).slice(0, 18)) : [];
    const pcats = Array.isArray(payload?.relatedCategories) ? payload.relatedCategories.slice(0, 4) : [];
    if (!ptitle || !psummary) return;
    const idx = pid ? next.findIndex((t: any) => t.id === pid) : next.findIndex((t: any) => t.title === ptitle);
    if (idx >= 0) {
      next[idx] = {
        ...next[idx],
        title: ptitle,
        summary: psummary,
        status: pstatus,
        tags: Array.from(new Set([...(next[idx].tags || []), ...ptags])).slice(0, 8),
        relatedCategories: Array.from(new Set([...(next[idx].relatedCategories || []), ...pcats])).slice(0, 4),
        hitCount: Math.max(1, Number(next[idx].hitCount || 1) + 1),
        lastUpdatedAt: now,
      };
      return;
    }
    next.push({
      id: pid || `thread_${now}_${Math.random().toString(36).slice(2, 8)}`,
      title: ptitle,
      summary: psummary,
      status: pstatus,
      tags: ptags,
      relatedCategories: pcats,
      hitCount: 1,
      lastUpdatedAt: now,
    });
  };

  const matched = next.find((t: any) => (t.relatedCategories || []).includes(lifeUpdate.actionCategory) && t.status !== 'closed');
  if (matched) {
    upsertThread({
      id: matched.id,
      title: matched.title || lifeUpdate.actionLabel,
      summary: lifeUpdate.detail || lifeUpdate.actionLabel,
      status: 'active',
      relatedCategories: Array.from(new Set([...(matched.relatedCategories || []), lifeUpdate.actionCategory])),
    });
  } else {
    upsertThread({
      title: lifeUpdate.actionLabel,
      summary: lifeUpdate.detail || lifeUpdate.actionLabel,
      status: 'active',
      relatedCategories: [lifeUpdate.actionCategory],
      tags: [lifeUpdate.actionCategory],
    });
  }

  (events || [])
    .filter((e) => String(e?.status || 'pending') !== 'failed')
    .forEach((e) => {
      const title = String(e?.title || '').trim();
      const description = String(e?.description || '').trim();
      if (!title || !description) return;
      upsertThread({
        title,
        summary: description,
        status: e?.status === 'confirmed' ? 'active' : 'fading',
        tags: Array.isArray(e?.tags) ? e.tags : [],
      });
    });

  (modelUpdates || []).forEach((u) => upsertThread(u));

  return next
    .filter((t: any) => t.status !== 'closed' || now - Number(t.lastUpdatedAt || 0) <= staleCloseMs)
    .sort((a: any, b: any) => Number(b.lastUpdatedAt || 0) - Number(a.lastUpdatedAt || 0))
    .slice(0, 8);
}

function buildPrompt(
  conversation: Conversation,
  now: number,
  weekday: string,
  hour: number,
  stateText: string,
  recentEventsText: string,
  diversityHint: { candidates: string[]; avoid: string[] },
  goalsText: string,
  threadText: string,
  surpriseHints: SurpriseEventHint[],
  mode: RandomnessMode
) {
  const cs = conversation.characterSettings;
  const name = cs?.nickname || conversation.name || 'AI';
  const persona =
    `你是角色“${name}”。\n` +
    (cs?.systemPrompt ? `系统设定：${cs.systemPrompt}\n` : '') +
    (cs?.personality ? `性格：${cs.personality}\n` : '') +
    (cs?.languageStyle ? `语言风格：${cs.languageStyle}\n` : '') +
    (cs?.memoryEvents ? `重要记忆事件：${cs.memoryEvents}\n` : '');

  const timeLine = `当前现实时间（UTC+8）：${new Date(now).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}，${weekday}，${hour}点。`;

  return (
    `${persona}\n` +
    `${timeLine}\n\n` +
    `你正在进行“AI生活模拟”（后台逻辑，不直接展示给用户）。目标：让角色的生活真实流动、细节自然、避免刻板重复。\n` +
    `规则（重要）：\n` +
    `- 核心原则：先作为“一个人”生活，再体现人设身份和爱好。爱好不是每天主线。\n` +
    `- 不要只因为人设是学生/社畜就永远学习/上班；生活包含琐碎、摆烂、社交、走神、偶发事件。\n` +
    `- 允许重复，但重复里要有变化（地点/同伴/被打断/进度/情绪）。\n` +
    `- 不要连续多次输出同一主题（例如天天刷小红书/天天同一爱好），除非给出非常明确的现实原因（考试周、身体不适、重大任务）。\n` +
    `- 事件驱动成长：如果出现“身份/职业/关系定位”的变化，用事件记录并影响后续。\n\n` +
    `- 后台轨迹仅作“部分参考”，不是硬约束；允许出现新的小事件、随机瞬间、计划外变化。\n` +
    `- 允许发生：静态瞬间（观察/感受）+ 动态事件（行动变化）+ 重大变故（低概率）。\n\n` +
    (mode === 'stable'
      ? `- 当前模式=稳定：优先日常连贯性，事件灵感只少量采纳，避免戏剧化连续变故。\n`
      : mode === 'divergent'
        ? `- 当前模式=发散：在合理前提下可大胆采纳事件灵感，允许更高的新奇度和转折。\n`
        : `- 当前模式=平衡：保持日常主线，同时选择性采纳事件灵感形成波澜。\n`) +
    `- 事件采纳成本：若采纳事件灵感，必须说明“为什么此刻会发生”，并与当前状态/目标相容。\n\n` +
    `当前状态（数值越高越强）：\n${stateText}\n\n` +
    `当前长期目标（影响行为方向）：\n${goalsText}\n\n` +
    `近期叙事线程（因果链，保持连续但不僵化）：\n${threadText}\n\n` +
    `本次建议动作候选（优先从这里选1个）：${diversityHint.candidates.join('、') || '（无）'}\n` +
    `本次尽量避免（除非非常合理）：${diversityHint.avoid.join('、') || '（无）'}\n` +
    `若你必须选择“尽量避免”里的类别，请在detail里给出具体且可信的现实原因。\n\n` +
    `最近事件（高优先级事实）：\n${recentEventsText || '（无）'}\n\n` +
    `本轮可选随机事件灵感（可用可不用，优先选一个融入）：\n${surpriseHints
      .slice(0, 4)
      .map((h) => `- [${h.level}/${h.nature}] ${h.title}：${h.description}`)
      .join('\n')}\n\n` +
    `请生成一次“此刻生活推进”的结果，输出严格JSON，不要输出其它文字：\n` +
    `{\n` +
    `  "lifeUpdate": {\n` +
    `    "actionCategory": "study|work|commute|eat|sleep|rest|scroll|exercise|socialize|hobby|errand|mood",\n` +
    `    "actionLabel": "一句话概括正在做的事",\n` +
    `    "detail": "80~140字细节，第一人称，真实自然",\n` +
    `    "energyDelta": -30~30,\n` +
    `    "moodDelta": -30~30,\n` +
    `    "stressDelta": -30~30,\n` +
    `    "socialDelta": -30~30\n` +
    `  },\n` +
    `  "diary": "可选。80~160字，像日记碎片（第一人称）",\n` +
    `  "events": [\n` +
    `    {"title":"可选。事件标题","description":"可选。事件描述","status":"pending|confirmed|failed","tags":["可选"]}\n` +
    `  ],\n` +
    `  "goalAdjustments": [{"id":"目标id","progressDelta":-10~10,"active":true|false}],\n` +
    `  "narrativeThreadUpdates": [{"id":"可选。已有线程id","title":"线程标题","summary":"线程推进描述","status":"active|fading|closed","tags":["可选"],"relatedCategories":["可选动作类"]}],\n` +
    `  "aiSelfProfileDelta": "可选。若身份/状态变化：1~2句，第一人称「我」，写「我对我自己的认知」，贴合上面角色设定，可主观",\n` +
    `  "userProfileDelta": "可选。若与用户关系/印象变化：1~2句，第一人称「我」，写「我对用户的认知」，可带主观倾向"\n` +
    `}`
  );
}

function buildAftereffectsFromEvents(conversationId: string, now: number) {
  const bank = getMemoryBank(conversationId);
  const confirmed = (bank.aiEvents || [])
    .filter((e) => e.status === 'confirmed')
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8);

  return confirmed.map((e) => {
    const text = `${e.title} ${e.description}`.toLowerCase();
    const bias: Record<string, number> = {};
    if (text.includes('辞职') || text.includes('离职')) {
      bias.work = -2.2;
      bias.rest = 1.5;
      bias.errand = 1.1;
    }
    if (text.includes('入职') || text.includes('被雇佣') || text.includes('上岗')) {
      bias.work = 2.4;
      bias.commute = 1.2;
      bias.rest = -0.8;
    }
    if (text.includes('生病') || text.includes('不舒服')) {
      bias.rest = 2.2;
      bias.sleep = 1.8;
      bias.exercise = -2;
      bias.socialize = -1.3;
    }
    if (text.includes('失恋') || text.includes('被拒绝')) {
      bias.socialize = -1.5;
      bias.mood = 1.2;
      bias.scroll = 1;
    }
    if (text.includes('关系升级') || text.includes('和好')) {
      bias.socialize = 1.8;
      bias.mood = 1.1;
    }
    return {
      key: `evt:${e.id}`,
      reason: `${e.title}`,
      expiresAt: now + 3 * 24 * 60 * 60 * 1000, // 3 days tail
      actionBias: bias,
    };
  }).filter((x) => Object.keys(x.actionBias || {}).length > 0);
}

function stateToText(conversation: Conversation, state: any) {
  const cs = conversation.characterSettings;
  const last = (state.lastActions || []).slice(0, 3).map((a: any) => `${a.category}:${a.label}`).join('；');
  const fatigueTop = Object.entries(state.fatigueByCategory || {})
    .sort((a: any, b: any) => (b[1] as number) - (a[1] as number))
    .slice(0, 4)
    .map(([k, v]) => `${k}:${v}`)
    .join('；');
  return (
    `主题：${state.theme}\n` +
    `精力：${state.energy}｜心情：${state.mood}｜压力：${state.stress}｜社交欲：${state.socialNeed}\n` +
    `近期动作：${last || '（无）'}\n` +
    `疲劳度：${fatigueTop || '（无）'}\n` +
    `人设补充：${cs?.personality || '（无）'}`
  );
}

function recentEventsToText(conversationId: string) {
  const bank = getMemoryBank(conversationId);
  const events = (bank.aiEvents || [])
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8);
  return events.map((e) => `- (${e.day})[${e.status}] ${e.title}：${e.description}`).join('\n');
}

const LIFE_SIM_API_COOLDOWN_MS = 3 * 60 * 1000; // 同一角色两次 LLM 尝试至少间隔（与全局批次间隔配合）
const LIFE_SIM_BATCH_GAP_MS = 600; // 同一批次内角色之间的间隔

/** 全局：两次「生活模拟批次」至少间隔（焦点/定时器共用，避免一直写） */
const LIFE_SIM_GLOBAL_MIN_GAP_MS = 20 * 60 * 1000;
const LIFE_SIM_GLOBAL_LAST_BATCH_KEY = 'momoyu_life_sim_last_global_batch_at';

function readLastGlobalLifeSimBatchAt(): number {
  try {
    return Math.max(0, Number(localStorage.getItem(LIFE_SIM_GLOBAL_LAST_BATCH_KEY) || '0'));
  } catch {
    return 0;
  }
}

function writeLastGlobalLifeSimBatchAt(ts: number): void {
  try {
    localStorage.setItem(LIFE_SIM_GLOBAL_LAST_BATCH_KEY, String(ts));
  } catch {
    /* ignore */
  }
}

const MS_HOUR = 60 * 60 * 1000;

/**
 * 滚动 24h 内用户发言条数 + 历史最后一条用户消息时间。
 * 档位只看「最近一天」体量（与用户体感一致）；24h 内 0 条但历史上说过话单独处理。
 */
function resolveChatActivity(conv: Conversation, now: number): {
  tier: number;
  intervalMs: number;
  userMsgs24h: number;
  lastUserMsgAt: number;
} {
  const msgs = conv.messages || [];
  const cutoff24 = now - 24 * 60 * 60 * 1000;
  let userMsgs24h = 0;
  let lastUserMsgAt = 0;
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    if (m?.role !== 'user') continue;
    const t = Number(m?.timestamp || 0);
    if (t > lastUserMsgAt) lastUserMsgAt = t;
    if (t >= cutoff24) userMsgs24h++;
  }

  if (lastUserMsgAt <= 0) {
    return { tier: 7, intervalMs: 12 * MS_HOUR, userMsgs24h: 0, lastUserMsgAt: 0 };
  }

  // tier 越小越优先占批次；interval 越短生活模拟越勤
  // ≥100 超级活跃 · ≥70 很活跃 · ≥50 活跃 · ≥30 一般 · 13–29 偏低 · 1–12 冷 · 24h 内 0 条但有过发言 → 休眠向
  if (userMsgs24h >= 100) {
    return { tier: 0, intervalMs: Math.round(1.5 * MS_HOUR), userMsgs24h, lastUserMsgAt };
  }
  if (userMsgs24h >= 70) {
    return { tier: 1, intervalMs: 2 * MS_HOUR, userMsgs24h, lastUserMsgAt };
  }
  if (userMsgs24h >= 50) {
    return { tier: 2, intervalMs: Math.round(2.5 * MS_HOUR), userMsgs24h, lastUserMsgAt };
  }
  if (userMsgs24h >= 30) {
    return { tier: 3, intervalMs: 3 * MS_HOUR, userMsgs24h, lastUserMsgAt };
  }
  if (userMsgs24h >= 13) {
    return { tier: 4, intervalMs: 4 * MS_HOUR, userMsgs24h, lastUserMsgAt };
  }
  if (userMsgs24h >= 1) {
    return { tier: 5, intervalMs: 6 * MS_HOUR, userMsgs24h, lastUserMsgAt };
  }

  return { tier: 6, intervalMs: 10 * MS_HOUR, userMsgs24h: 0, lastUserMsgAt };
}

function getLifeSimBackgroundIntervalMs(conv: Conversation, now: number): number {
  return resolveChatActivity(conv, now).intervalMs;
}

/** 批次内选人排序：数字越小越优先（超级活跃先占名额） */
function getChatActivityBatchPriority(conv: Conversation, now: number): number {
  return resolveChatActivity(conv, now).tier;
}

/** 定时器用：下一次后台批次延迟，毫秒（20～60 分钟） */
export function nextLifeSimPeriodicDelayMs(): number {
  const min = 20 * 60 * 1000;
  const max = 60 * 60 * 1000;
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shouldTick(
  now: number,
  lastTickAt: number,
  lastAttemptAt: number | undefined,
  conversation: Conversation,
  force?: boolean
): boolean {
  if (force) return true;
  // 刚尝试过（含失败）：短时间内不要再请求，否则 429 后 lastTickAt 仍为 0 会疯狂重试
  if (lastAttemptAt && now - lastAttemptAt < LIFE_SIM_API_COOLDOWN_MS) return false;
  if (!lastTickAt) return true;
  const dt = now - lastTickAt;
  const intervalMs = getLifeSimBackgroundIntervalMs(conversation, now);
  return dt >= intervalMs;
}

export async function runLifeSimTick(
  conversation: Conversation,
  apiConfig: ApiConfig,
  options?: { force?: boolean }
): Promise<void> {
  if (!conversation?.id) return;
  if (conversation.type !== 'private') return;
  if (!conversation.characterSettings) return;
  if ((conversation as any).isBlocked) return;
  if (!apiConfig.baseUrl || !apiConfig.apiKey || !apiConfig.modelName) return;

  const now = Date.now();
  const { day, hour, weekday } = utc8Parts(now);
  const mode = getRandomnessMode();

  let state = await loadLifeSimState(conversation.id);
  state = ensureDayTheme(state, now);
  const derivedAftereffects = buildAftereffectsFromEvents(conversation.id, now);
  state = {
    ...state,
    aftereffects: [...(state.aftereffects || []), ...derivedAftereffects]
      .filter((a) => Number(a.expiresAt || 0) > now)
      .slice(0, 10),
  } as any;

  if (!shouldTick(now, state.lastTickAt, state.lastSimApiAttemptAt, conversation, options?.force)) return;

  // 先记下尝试时间并落盘，避免并行/连续焦点导致同一角色短时多次打接口
  state = { ...state, lastSimApiAttemptAt: now };
  await upsertLifeSimState(state);

  const stateText = stateToText(conversation, state);
  const recentEventsText = recentEventsToText(conversation.id);
  const recentCategories = (state.lastActions || []).slice(0, 6).map((a: any) => String(a.category || ''));
  const recentLogs = ((state as any).lifeLogs || []).slice(0, 20) as Array<{ actionCategory?: string; actionLabel?: string; day?: string }>;
  const diversityHint = deriveCandidates({
    hour,
    energy: Number(state.energy ?? 50),
    stress: Number(state.stress ?? 50),
    socialNeed: Number(state.socialNeed ?? 50),
    recentCategories,
    recentLogs,
    nowDay: day,
    goals: (state as any).goals || [],
    aftereffects: (state as any).aftereffects || [],
  });
  const goalsText = goalsToText((state as any).goals || []);
  const threadText = recentNarrativeThreadsToText((state as any).narrativeThreads || []);
  // Randomness dial: pick dynamic hints every tick.
  const allHints = buildSurpriseEventHints(hour, mode);
  const hintCount = mode === 'stable' ? 2 : mode === 'divergent' ? 5 : 4;
  const surpriseHints = Array.from({ length: hintCount }).map(() => pick(allHints));
  const prompt = buildPrompt(
    conversation,
    now,
    weekday,
    hour,
    stateText,
    recentEventsText,
    diversityHint,
    goalsText,
    threadText,
    surpriseHints,
    mode
  );
  const parsed = (await (async () => {
    if (!apiConfig.baseUrl || !apiConfig.apiKey || !apiConfig.modelName) return null;
    try {
      const res = await fetch(buildApiUrl(apiConfig), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiConfig.apiKey}` },
        body: JSON.stringify({
          model: apiConfig.modelName,
          messages: [{ role: 'user', content: prompt }],
          temperature: modeTemperature(mode),
          max_tokens: 900,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const text = String(data?.choices?.[0]?.message?.content || '');
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return null;
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  })()) as LifeSimModelOutput | null;
  if (!parsed?.lifeUpdate?.actionCategory) return;

  const lu = parsed.lifeUpdate as any;
  const actionCategory = String(lu.actionCategory || 'mood');
  const actionLabel = String(lu.actionLabel || '').slice(0, 60) || '生活推进';
  const detail = String(lu.detail || '').trim();
  const selectedScore = diversityHint.rankedCandidates.find((x) => x.category === actionCategory)?.score;
  const selectedReasons: string[] = [];
  if ((diversityHint.goalBiasTop || []).some((x) => x.category === actionCategory && x.score > 0)) {
    selectedReasons.push('goal');
  }
  if ((diversityHint.aftereffectBiasTop || []).some((x) => x.category === actionCategory && x.score !== 0)) {
    selectedReasons.push('aftereffect');
  }
  if (selectedReasons.length === 0) selectedReasons.push('candidate');

  const nextState = applyDeltas(
    state,
    {
      energyDelta: clampInt(lu.energyDelta, -30, 30, 0),
      moodDelta: clampInt(lu.moodDelta, -30, 30, 0),
      stressDelta: clampInt(lu.stressDelta, -30, 30, 0),
      socialDelta: clampInt(lu.socialDelta, -30, 30, 0),
    },
    { category: actionCategory as any, label: actionLabel, at: now }
  );
  const nextLifeLogs = [
    {
      at: now,
      day,
      actionCategory: actionCategory as any,
      actionLabel,
      detail: (String(parsed.diary || '').trim() || detail || '').slice(0, 240),
      hitReason: {
        candidates: diversityHint.candidates,
        avoid: diversityHint.avoid,
        rankedCandidates: diversityHint.rankedCandidates,
        goalBiasTop: diversityHint.goalBiasTop,
        aftereffectBiasTop: diversityHint.aftereffectBiasTop,
        selectedCategory: actionCategory,
        selectedScore,
        selectedWasAvoid: diversityHint.avoid.includes(actionCategory),
        selectedReasons,
      },
    },
    ...((nextState as any).lifeLogs || []),
  ];
  const goalAdjustments = Array.isArray((parsed as any).goalAdjustments) ? (parsed as any).goalAdjustments : [];
  const nextGoals = ((state as any).goals || []).map((g: any) => {
    const adj = goalAdjustments.find((x: any) => String(x?.id || '') === String(g.id));
    if (!adj) return g;
    const delta = clampInt(adj.progressDelta, -10, 10, 0);
    return {
      ...g,
      progress: Math.max(0, Math.min(100, Number(g.progress || 0) + delta)),
      active: typeof adj.active === 'boolean' ? adj.active : g.active,
    };
  });
  const events = Array.isArray(parsed.events) ? parsed.events : [];
  const nextNarrativeThreads = updateNarrativeThreads({
    prevThreads: (state as any).narrativeThreads || [],
    now,
    lifeUpdate: { actionCategory, actionLabel, detail: (String(parsed.diary || '').trim() || detail || '').slice(0, 240) },
    events: events as any,
    modelUpdates: Array.isArray((parsed as any).narrativeThreadUpdates)
      ? ((parsed as any).narrativeThreadUpdates as any[])
      : [],
  });
  await upsertLifeSimState({
    ...(nextState as any),
    lastDay: day,
    lifeLogs: nextLifeLogs,
    goals: nextGoals,
    aftereffects: (state as any).aftereffects || [],
    narrativeThreads: nextNarrativeThreads,
    lastSimApiAttemptAt: now,
  });

  events.forEach((e: any) => {
    const title = String(e?.title || '').trim();
    const description = String(e?.description || '').trim();
    if (!title || !description) return;
    const status = e?.status === 'confirmed' || e?.status === 'failed' ? e.status : 'pending';
    addAIEvent(conversation.id, { title, description, status, tags: e?.tags });
  });

  const aiSelfDelta = String(parsed.aiSelfProfileDelta || '').trim();
  const userDelta = String(parsed.userProfileDelta || '').trim();
  if (aiSelfDelta || userDelta) {
    const bank = getMemoryBank(conversation.id);
    const nextAiSelf = [aiSelfDelta, bank.aiSelfProfile?.text].filter(Boolean).slice(0, 2).join('\n');
    const nextUser = [userDelta, bank.userProfile?.text].filter(Boolean).slice(0, 2).join('\n');
    updateDynamicProfiles(conversation.id, nextAiSelf, nextUser, day);
  }
}

// ===========================
// Background queue (per AI)
// ===========================
type QueueState = { scheduled: boolean; pending: boolean; running: boolean };
const queue = new Map<string, QueueState>();

function scheduleIdle(fn: () => void) {
  const w = window as any;
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(fn, { timeout: 1500 });
    return;
  }
  setTimeout(fn, 0);
}

export function enqueueLifeSimTick(conversation: Conversation, apiConfig: ApiConfig): void {
  const id = conversation?.id;
  if (!id) return;

  const state = queue.get(id) || { scheduled: false, pending: false, running: false };
  if (state.running || state.scheduled) {
    state.pending = true;
    queue.set(id, state);
    return;
  }
  state.scheduled = true;
  queue.set(id, state);

  scheduleIdle(() => {
    const st = queue.get(id) || state;
    st.scheduled = false;
    st.running = true;
    st.pending = false;
    queue.set(id, st);

    runLifeSimTick(conversation, apiConfig)
      .catch((e) => console.error('[life-sim] tick失败:', e))
      .finally(() => {
        const st2 = queue.get(id);
        if (!st2) return;
        st2.running = false;
        const again = st2.pending;
        st2.pending = false;
        queue.set(id, st2);
        if (again) enqueueLifeSimTick(conversation, apiConfig);
      });
  });
}

export function enqueueLifeSimForAll(conversations: Conversation[], apiConfig: ApiConfig): void {
  const now = Date.now();
  const lastBatch = readLastGlobalLifeSimBatchAt();
  if (lastBatch > 0 && now - lastBatch < LIFE_SIM_GLOBAL_MIN_GAP_MS) {
    return;
  }

  const targets = conversations.filter(
    (c) =>
      c.type === 'private' &&
      Boolean(c.characterSettings) &&
      !isToolInteractionCharacter(c.characterSettings) &&
      !(c as any).isBlocked
  );
  if (targets.length === 0) return;

  writeLastGlobalLifeSimBatchAt(now);

  void (async () => {
    const statesMap = await loadLifeSimStates();
    const scored = targets.map((c) => {
      const st = statesMap[c.id];
      const lastTickAt = Number(st?.lastTickAt ?? 0);
      const lastAttemptAt = st?.lastSimApiAttemptAt;
      const due = shouldTick(now, lastTickAt, lastAttemptAt, c, false);
      const overdue =
        lastTickAt > 0 ? now - lastTickAt : Number.MAX_SAFE_INTEGER;
      const batchPri = getChatActivityBatchPriority(c, now);
      return { c, due, overdue, batchPri };
    });

    const dueSorted = scored
      .filter((x) => x.due)
      .sort((a, b) => {
        if (a.batchPri !== b.batchPri) return a.batchPri - b.batchPri;
        return b.overdue - a.overdue;
      });

    const pickCount = Math.min(targets.length, 3 + Math.floor(Math.random() * 2));
    const picked = dueSorted.slice(0, pickCount).map((x) => x.c);

    for (const c of picked) {
      try {
        await runLifeSimTick(c, apiConfig);
      } catch (e) {
        console.error('[life-sim] tick失败:', e);
      }
      await new Promise((r) => setTimeout(r, LIFE_SIM_BATCH_GAP_MS));
    }
  })();
}

export async function forceTickAll(conversations: Conversation[], apiConfig: ApiConfig): Promise<void> {
  const targets = conversations.filter(
    (c) =>
      c.type === 'private' &&
      Boolean(c.characterSettings) &&
      !isToolInteractionCharacter(c.characterSettings) &&
      !(c as any).isBlocked
  );
  for (const c of targets) {
    // sequential to avoid spiking API
    // eslint-disable-next-line no-await-in-loop
    await runLifeSimTick(c, apiConfig, { force: true });
  }
}

