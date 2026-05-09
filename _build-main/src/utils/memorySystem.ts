/**
 * AI长期记忆系统
 * 实现自动总结和记忆管理
 */

import { AIEvent, ApiConfig, Conversation, MemoryBank, MemoryDiaryEntry, MemoryEntry, Message } from '../types';
import { save, load } from './storage';
import { getCharacterOnlineHandle, getCharacterRealName } from './characterIdentity';
import { buildApiUrl } from './apiHelper';

// 重新导出类型以便其他组件使用
export type { MemoryEntry, MemoryDiaryEntry };

const MEMORY_STORAGE_KEY = 'chat_memory_banks';

/**
 * 初始化记忆系统缓存
 */
export const initializeMemorySystem = async (): Promise<void> => {
  try {
    const banks = await load(MEMORY_STORAGE_KEY);
    memoryBanksCache = (banks && Array.isArray(banks)) ? banks : [];
    console.log(`🧠 记忆系统已初始化，加载了${memoryBanksCache.length}个记忆库`);
  } catch (error) {
    console.error('❌ 记忆系统初始化失败:', error);
    memoryBanksCache = [];
  }
};

/**
 * 获取对话的记忆库
 */
export const getMemoryBank = (conversationId: string): MemoryBank => {
  const banks = getAllMemoryBanksSync();
  const existing = banks.find(b => b.conversationId === conversationId);
  
  if (existing) {
    // 向后兼容：老数据补齐新字段
    if (!existing.diaryEntries) existing.diaryEntries = [];
    if (!existing.aiSelfProfile) existing.aiSelfProfile = undefined;
    if (!existing.userProfile) existing.userProfile = undefined;
    if (!existing.aiEvents) existing.aiEvents = [];
    // 私聊阶段总结与引擎一致：间隔至少 50（旧版 15/25 与运行逻辑不一致）
    if (typeof existing.settings?.autoSummaryInterval === 'number' && existing.settings.autoSummaryInterval < 50) {
      existing.settings.autoSummaryInterval = 50;
    }
    return existing;
  }
  
  // 创建新的记忆库
  const newBank: MemoryBank = {
    conversationId,
    memories: [],
    diaryEntries: [],
    aiSelfProfile: undefined,
    userProfile: undefined,
    aiEvents: [],
    lastSummaryMessageCount: 0,
    totalMessagesSinceLastSummary: 0,
    settings: {
      autoSummaryInterval: 50, // 每50条消息自动总结一次
      maxMemories: 100, // 最多保存100条记忆
      enableAutoSummary: true
    }
  };
  
  saveMemoryBank(newBank);
  return newBank;
};

// 内存缓存，同步访问
let memoryBanksCache: MemoryBank[] | null = null;

/**
 * 异步获取所有记忆库（推荐）
 */
/** 与 App 内置三条预设私聊 id 一致；若会话列表「恰好只剩这三条」但记忆库仍指向其它会话，多半是异常回退，禁止整库 prune。 */
const FACTORY_PRESET_CONVERSATION_IDS = new Set(['preset-aa', 'preset-worker', 'preset-oo1']);

/**
 * 删除当前会话列表中已不存在的记忆库条目（IndexedDB `chat_memory_banks`），避免会话丢失后残留。
 */
export const pruneOrphanMemoryBanks = async (
  validConversationIds: readonly string[]
): Promise<number> => {
  const allowed = new Set(validConversationIds);
  const banks = await getAllMemoryBanks();

  const onlyThreeFactoryPresets =
    allowed.size === 3 &&
    [...allowed].every((id) => FACTORY_PRESET_CONVERSATION_IDS.has(String(id)));

  if (onlyThreeFactoryPresets && banks.length > 0) {
    const orphanBanks = banks.filter((b) => !allowed.has(b.conversationId));
    if (orphanBanks.length > 0) {
      console.warn(
        '[memory] 已跳过 pruneOrphanMemoryBanks：当前会话 id 仅为内置 preset-aa / preset-worker / preset-oo1，但 chat_memory_banks 中仍有其它 conversationId。' +
          '这通常表示会话列表曾被异常覆盖；若继续 prune 会误删全部自定义会话记忆。请先从备份恢复 conversations 后再手动整理记忆库。',
      );
      return 0;
    }
  }

  const kept = banks.filter((b) => allowed.has(b.conversationId));
  const removed = banks.length - kept.length;
  if (removed <= 0) return 0;

  memoryBanksCache = kept;
  await save(MEMORY_STORAGE_KEY, kept);
  return removed;
};

export const getAllMemoryBanks = async (): Promise<MemoryBank[]> => {
  try {
    const banks = await load(MEMORY_STORAGE_KEY);
    if (banks && Array.isArray(banks)) {
      memoryBanksCache = banks; // 更新缓存
      return banks;
    }
    return [];
  } catch (error) {
    console.error('Failed to load memory banks:', error);
    return [];
  }
};

/**
 * 同步获取所有记忆库（使用缓存）
 */
const getAllMemoryBanksSync = (): MemoryBank[] => {
  if (memoryBanksCache === null) {
    memoryBanksCache = [];
  }
  return memoryBanksCache || [];
};

/**
 * 保存记忆库（同步版本，立即更新缓存 + 异步保存）
 */
export const saveMemoryBank = (bank: MemoryBank): void => {
  try {
    const banks = getAllMemoryBanksSync();
    const index = banks.findIndex((b: MemoryBank) => b.conversationId === bank.conversationId);
    
    if (index >= 0) {
      banks[index] = bank;
    } else {
      banks.push(bank);
    }
    
    // 立即更新缓存
    memoryBanksCache = banks;
    
    // 异步保存到IndexedDB（不阻塞）
    save(MEMORY_STORAGE_KEY, banks).catch(error => {
      console.error('Failed to save memory bank to IndexedDB:', error);
    });
  } catch (error) {
    console.error('Failed to save memory bank:', error);
  }
};

/**
 * 异步保存记忆库（推荐用于性能敏感场景）
 */
export const saveMemoryBankAsync = async (bank: MemoryBank): Promise<void> => {
  try {
    const banks = await getAllMemoryBanks();
    const index = banks.findIndex((b: MemoryBank) => b.conversationId === bank.conversationId);
    
    if (index >= 0) {
      banks[index] = bank;
    } else {
      banks.push(bank);
    }
    
    // 更新缓存
    memoryBanksCache = banks;
    
    // 保存到IndexedDB
    await save(MEMORY_STORAGE_KEY, banks);
  } catch (error) {
    console.error('Failed to save memory bank async:', error);
  }
};

/**
 * 添加记忆条目
 */
export const addMemory = (
  conversationId: string,
  content: string,
  importance: 'low' | 'medium' | 'high' = 'medium',
  category?: string,
  autoGenerated: boolean = false
): MemoryEntry => {
  const bank = getMemoryBank(conversationId);
  
  const newMemory: MemoryEntry = {
    id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    content,
    importance,
    category,
    autoGenerated
  };
  
  bank.memories.unshift(newMemory); // 新记忆放在最前面
  
  // 如果超过最大记忆数，删除最旧的低重要性记忆
  if (bank.memories.length > bank.settings.maxMemories) {
    // 优先删除低重要性的记忆
    const lowImportance = bank.memories.filter(m => m.importance === 'low');
    if (lowImportance.length > 0) {
      const toDelete = lowImportance[lowImportance.length - 1];
      bank.memories = bank.memories.filter(m => m.id !== toDelete.id);
    } else {
      // 如果没有低重要性记忆，删除最旧的中等重要性记忆
      const mediumImportance = bank.memories.filter(m => m.importance === 'medium');
      if (mediumImportance.length > 0) {
        const toDelete = mediumImportance[mediumImportance.length - 1];
        bank.memories = bank.memories.filter(m => m.id !== toDelete.id);
      } else {
        // 删除最旧的记忆
        bank.memories.pop();
      }
    }
  }
  
  saveMemoryBank(bank);
  return newMemory;
};

/**
 * 删除记忆
 */
export const deleteMemory = (conversationId: string, memoryId: string): void => {
  const bank = getMemoryBank(conversationId);
  bank.memories = bank.memories.filter(m => m.id !== memoryId);
  saveMemoryBank(bank);
};

/**
 * 更新记忆的重要性
 */
export const updateMemoryImportance = (
  conversationId: string,
  memoryId: string,
  importance: 'low' | 'medium' | 'high'
): void => {
  const bank = getMemoryBank(conversationId);
  const memory = bank.memories.find(m => m.id === memoryId);
  if (memory) {
    memory.importance = importance;
    saveMemoryBank(bank);
  }
};

/**
 * 清空对话的所有记忆
 */
export const clearMemoryBank = (conversationId: string): void => {
  const bank = getMemoryBank(conversationId);
  bank.memories = [];
  bank.diaryEntries = [];
  bank.aiSelfProfile = undefined;
  bank.userProfile = undefined;
  bank.aiEvents = [];
  bank.lastSummaryMessageCount = 0;
  bank.totalMessagesSinceLastSummary = 0;
  saveMemoryBank(bank);
};

export const addDiaryEntry = (
  conversationId: string,
  day: string,
  content: string,
  moodTags: string[] = [],
  source: 'auto' | 'manual' = 'auto',
  recordType: MemoryDiaryEntry['recordType'] = 'diary'
): MemoryDiaryEntry => {
  const bank = getMemoryBank(conversationId);
  if (!bank.diaryEntries) bank.diaryEntries = [];
  const existingIndex = bank.diaryEntries.findIndex(entry => entry.day === day);
  const next: MemoryDiaryEntry = {
    id: existingIndex >= 0 ? bank.diaryEntries[existingIndex].id : `diary_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    day,
    timestamp: Date.now(),
    content,
    moodTags,
    source,
    recordType,
  };
  if (existingIndex >= 0) bank.diaryEntries[existingIndex] = next;
  else bank.diaryEntries.unshift(next);
  bank.diaryEntries = bank.diaryEntries.slice(0, 30); // 保留最近30天
  saveMemoryBank(bank);
  return next;
};

export const updateDynamicProfiles = (
  conversationId: string,
  aiSelfText: string,
  userText: string,
  sourceDay?: string
): void => {
  const bank = getMemoryBank(conversationId);
  const now = Date.now();
  bank.aiSelfProfile = {
    text: aiSelfText.trim(),
    version: (bank.aiSelfProfile?.version ?? 0) + 1,
    updatedAt: now,
    sourceDay,
    priority: 'override',
  };
  bank.userProfile = {
    text: userText.trim(),
    version: (bank.userProfile?.version ?? 0) + 1,
    updatedAt: now,
    sourceDay,
    priority: 'override',
  };
  saveMemoryBank(bank);
};

export const buildDynamicProfileContext = (conversationId: string): string => {
  const bank = getMemoryBank(conversationId);
  const sections: string[] = [];
  if (bank.aiSelfProfile?.text) {
    sections.push(`【「我」对自己的认知（动态，高优先级，可覆盖初始人设中的静态描述）】\n${bank.aiSelfProfile.text}`);
  }
  if (bank.userProfile?.text) {
    sections.push(`【「我」对用户的认知（动态，高优先级，主观印象）】\n${bank.userProfile.text}`);
  }
  const recentEvents = (bank.aiEvents || [])
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 6);
  if (recentEvents.length > 0) {
    sections.push(
      `【AI事件（高优先级，覆盖初始人设）】\n` +
        recentEvents
          .map((e) => `- (${e.day})[${e.status}] ${e.title}：${e.description}`)
          .join('\n')
    );
  }
  const latestDiary = (bank.diaryEntries || []).find(
    (d) => !d.recordType || d.recordType === 'diary'
  );
  if (latestDiary?.content) {
    sections.push(`【最近角色日记】\n日期：${latestDiary.day}\n${latestDiary.content}`);
  }
  return sections.length ? `\n${sections.join('\n\n')}\n` : '';
};

export const buildMemoryAndIdentityContext = (conversationId: string): string => {
  const bank = getMemoryBank(conversationId);
  const identity = buildDynamicProfileContext(conversationId);
  const memory = buildMemoryContext(bank.memories || []);
  return `${identity}${memory}`;
};

export const addAIEvent = (
  conversationId: string,
  input: Omit<AIEvent, 'id' | 'timestamp' | 'day'> & { timestamp?: number; day?: string }
): AIEvent => {
  const bank = getMemoryBank(conversationId);
  if (!bank.aiEvents) bank.aiEvents = [];
  const ts = input.timestamp ?? Date.now();
  const day = input.day ?? utc8DayKey(ts);
  const next: AIEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: ts,
    day,
    title: String(input.title || '').slice(0, 48) || '事件',
    description: String(input.description || '').slice(0, 240) || '',
    status: input.status,
    tags: Array.isArray(input.tags) ? input.tags.map((x) => String(x)).filter(Boolean).slice(0, 8) : undefined,
  };
  bank.aiEvents.unshift(next);
  bank.aiEvents = bank.aiEvents.slice(0, 60);
  saveMemoryBank(bank);
  return next;
};

/**
 * 更新记忆库设置
 */
export const updateMemorySettings = (
  conversationId: string,
  settings: Partial<MemoryBank['settings']>
): void => {
  const bank = getMemoryBank(conversationId);
  const merged = { ...bank.settings, ...settings };
  if (typeof merged.autoSummaryInterval === 'number') {
    merged.autoSummaryInterval = Math.max(50, Math.min(500, merged.autoSummaryInterval));
  }
  bank.settings = merged;
  saveMemoryBank(bank);
};

/**
 * 检查是否需要自动总结
 */
export const shouldTriggerAutoSummary = (conversationId: string, currentMessageCount: number): boolean => {
  const bank = getMemoryBank(conversationId);
  
  if (!bank.settings.enableAutoSummary) {
    return false;
  }
  
  const messagesSinceLastSummary = currentMessageCount - bank.lastSummaryMessageCount;
  const interval = Math.max(50, bank.settings.autoSummaryInterval || 50);
  return messagesSinceLastSummary >= interval;
};

/**
 * 更新总结计数器
 */
export const updateSummaryCounter = (conversationId: string, currentMessageCount: number): void => {
  const bank = getMemoryBank(conversationId);
  bank.lastSummaryMessageCount = currentMessageCount;
  bank.totalMessagesSinceLastSummary = 0;
  saveMemoryBank(bank);
};

function utc8DayKey(ts: number): string {
  const d = new Date(ts + 8 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function dayPartOf(ts: number): 'morning' | 'noon' | 'evening' {
  const h = new Date(ts + 8 * 60 * 60 * 1000).getUTCHours();
  if (h < 11) return 'morning';
  if (h < 18) return 'noon';
  return 'evening';
}

/** 去掉模型常见的 markdown 代码块围栏（支持正文前有废话、或仅有开头 fence 无闭合） */
function stripModelJsonFences(raw: string): string {
  const s = raw.trim();
  const anywhere = /```(?:json)?\s*([\s\S]*?)(?:```|$)/i.exec(s);
  if (anywhere?.[1]) {
    const inner = anywhere[1].trim();
    if (inner.includes('{')) return inner;
  }
  const closed = /^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```/im.exec(s);
  if (closed) return closed[1].trim();
  if (/^```(?:json)?\s*/im.test(s)) {
    return s.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/i, '').trim();
  }
  return s;
}

/** 从首个 { 起按括号深度截取完整对象（忽略字符串内的括号） */
function extractBalancedJsonObject(s: string): string | null {
  const start = s.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\' && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

function parseJsonFromModelText(text: string): any | null {
  const raw = String(text || '').trim();
  if (!raw) return null;

  const attempts = [stripModelJsonFences(raw), raw];
  for (const chunk of attempts) {
    const slice = chunk.trim();
    if (!slice) continue;
    try {
      return JSON.parse(slice);
    } catch {
      const balanced = extractBalancedJsonObject(slice);
      if (balanced) {
        try {
          return JSON.parse(balanced);
        } catch {
          /* fall through */
        }
      }
      const start = slice.indexOf('{');
      const end = slice.lastIndexOf('}');
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(slice.slice(start, end + 1));
        } catch {
          /* fall through */
        }
      }
    }
  }
  return null;
}

const MEMORY_JSON_SYSTEM =
  '你只输出一个合法 JSON 对象：从第一个 { 到最后一个匹配的 }，中间不要有 Markdown、不要有 ``` 代码块、不要输出思考过程或中英文草稿。字符串里的换行必须写成 \\n。';

async function askJson(apiConfig: ApiConfig, prompt: string): Promise<any | null> {
  if (!apiConfig.baseUrl || !apiConfig.apiKey || !apiConfig.modelName) {
    console.warn('[memory-engine] 缺少 API 配置（baseUrl / apiKey / modelName），跳过本次调用');
    return null;
  }
  try {
    const res = await fetch(buildApiUrl(apiConfig), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiConfig.apiKey}`,
        'X-Momoyu-Source': 'memorySystem:askJson',
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [
          { role: 'system', content: MEMORY_JSON_SYSTEM },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.warn('[memory-engine] API 非成功状态', res.status, errBody.slice(0, 200));
      return null;
    }
    const data = await res.json();
    const text = String(data?.choices?.[0]?.message?.content || '');
    const parsed = parseJsonFromModelText(text);
    if (!parsed) {
      const previewLen = 280;
      console.warn(
        `[memory-engine] 模型返回中未找到有效 JSON（全文 ${text.length} 字，日志仅预览前 ${previewLen} 字）`,
        text.slice(0, previewLen)
      );
      return null;
    }
    return parsed;
  } catch (e) {
    console.warn('[memory-engine] askJson 异常', e);
    return null;
  }
}

function toDialogue(messages: Message[]): string {
  return messages
    .map((m) => `${m.role === 'user' ? '用户' : m.role === 'assistant' ? 'AI' : '系统'}: ${m.content || '[媒体消息]'}`)
    .join('\n');
}

/** 供「角色日记」模型使用的口吻与人设摘要 */
function buildCharacterVoicePack(conversation: Conversation): string {
  const cs = conversation.characterSettings;
  if (!cs) return '（未配置角色设定：请仅依据对话推断合理口吻。）';
  const lines: string[] = [];
  const real = getCharacterRealName(cs);
  if (real) lines.push(`角色本名：${real}`);
  const remark = (cs.nickname || '').trim();
  if (remark) lines.push(`用户通讯录备注：${remark}`);
  const handle = getCharacterOnlineHandle(cs, conversation.name);
  if (handle && handle !== remark) lines.push(`对外网名：${handle}`);
  if (cs.personality) lines.push(`性格：${cs.personality}`);
  if (cs.languageStyle) lines.push(`语言风格：${cs.languageStyle}`);
  if (cs.languageExample) lines.push(`说话示例（节选）：${String(cs.languageExample).slice(0, 220)}`);
  const sp = (cs.systemPrompt || '').trim();
  if (sp) lines.push(`人设与背景（节选）：${sp.slice(0, 520)}${sp.length > 520 ? '…' : ''}`);
  return lines.join('\n');
}

/** 记忆引擎写入动态画像：锚定角色设定里的「我」，强调第一人称、可带主观色彩 */
function buildProfileEngineRoleAnchor(conversation: Conversation): string {
  return (
    `【动态画像的写作视角】\n` +
    `你必须代入下方「角色设定锚点」中的这个 AI 角色，全程用第一人称「我」书写；不要用第三方说明书、简历或新闻稿语气。\n` +
    `- aiSelfProfile：写「我对我自己的认知」——在角色身份与处境下，我如何看自己（心情、自我定位、在意的事、与设定的呼应），可与性格一致的主观色彩。\n` +
    `- userProfile：写「我对用户的认知」——作为这个角色，我眼中的聊天对象是怎样的人、关系亲疏与情绪倾向；这是**局中人视角**，可带主观印象与揣测，但不要编造对话里从未出现的事实。\n\n` +
    `【角色设定锚点】\n` +
    `${buildCharacterVoicePack(conversation)}`
  );
}

export async function runMemoryEngineCycle(
  conversation: Conversation,
  apiConfig: ApiConfig
): Promise<void> {
  if (!conversation?.id || !conversation.enabledFeatures?.includes('memory-system')) return;
  const bank = getMemoryBank(conversation.id);
  if (!bank.settings.enableAutoSummary) return;
  const allMessages = conversation.messages || [];
  if (allMessages.length < 10) return;

  /** 用户设置的「日常」阶段总结步长（至少 50） */
  const interval = Math.max(50, bank.settings.autoSummaryInterval || 50);
  /** 积压未总结条数 ≥ 此值时，每批按 100 条调用一次模型，减少补跑费用与等待 */
  const LARGE_BACKLOG_STEP = 100;
  while (allMessages.length - bank.lastSummaryMessageCount >= interval) {
    const backlog = allMessages.length - bank.lastSummaryMessageCount;
    const step = backlog >= LARGE_BACKLOG_STEP ? Math.min(LARGE_BACKLOG_STEP, backlog) : interval;
    const start = bank.lastSummaryMessageCount;
    const end = start + step;
    const chunk = allMessages.slice(start, end);
    const diaryLenHint = step >= LARGE_BACKLOG_STEP ? '120-260字' : '80-180字';
    const summaryLenHint = step >= LARGE_BACKLOG_STEP ? '100-220字' : '60-160字';
    const voicePack = buildCharacterVoicePack(conversation);
    const prompt =
      `你是「记忆引擎」，同时产出两类文本，必须严格区分：\n` +
      `A) **角色日记（diary）**：用【该角色第一人称】写日记（${diaryLenHint}）。要贴合下面「角色口吻依据」里的性格、语言风格与身份，像在写自己的私密日记：可以有情绪与主观感受，但不要编造对话里没有的事。\n` +
      `B) **聊天纪要（chatSummary）**：用【旁观记录员、第三人称或「用户/AI」称谓】写客观纪要（${summaryLenHint}）。只整理对话里出现的事实、信息点、约定与决定；不要写「我觉得」「我很…」等角色内心独白；不要抒情。\n` +
      `另外请输出候选长期记忆与事件候选（与 A/B 区分开）：\n` +
      `- memoryCandidates：可入库的短事实条目（偏客观、可执行）\n` +
      `- aiEventCandidates：可能影响后续行为的状态/关系节点\n\n` +
      `【角色口吻依据】\n${voicePack}\n\n` +
      `输出 JSON（字段缺一不可，若无内容用空字符串）：\n` +
      `{"diary":"...","chatSummary":"...","moodTags":["..."],"memoryCandidates":[{"content":"...","importance":"high|medium|low","category":"关系|事件|喜好|对话互动|情感|AI观点|AI经历"}],"aiEventCandidates":[{"title":"...","description":"...","status":"pending|confirmed|failed","tags":["..."]}]}\n` +
      `对话：\n${toDialogue(chunk)}`;
    const parsed = await askJson(apiConfig, prompt);
    if (!parsed) {
      console.warn('[memory-engine] 阶段总结未得到有效 JSON（仍会推进水位避免死循环，本段内容丢失）', {
        conversationId: conversation.id,
        range: `${start}-${end}`,
        step,
      });
    }
    let diaryText = String(parsed?.diary || '').trim();
    let chatSummaryText = String(parsed?.chatSummary || '').trim();
    if (!diaryText && !chatSummaryText) {
      const legacy = String(parsed?.summary || '').trim();
      if (legacy) diaryText = legacy;
    }
    const moodTags = Array.isArray(parsed?.moodTags) ? parsed.moodTags.map((x: any) => String(x)).filter(Boolean).slice(0, 6) : [];
    const dayKey = utc8DayKey(chunk[chunk.length - 1]?.timestamp || Date.now());
    if (diaryText) {
      addDiaryEntry(conversation.id, dayKey, `【${step}条阶段·角色日记】${diaryText}`, moodTags, 'auto', 'diary');
    }
    if (chatSummaryText) {
      addMemory(conversation.id, `【${step}条阶段·聊天纪要】${chatSummaryText}`, 'medium', '聊天总结', true);
    }
    const candidates = Array.isArray(parsed?.memoryCandidates) ? parsed.memoryCandidates : [];
    candidates.forEach((m: any) => {
      const content = String(m?.content || '').trim();
      if (!content) return;
      const importance = m?.importance === 'high' || m?.importance === 'low' ? m.importance : 'medium';
      const category = String(m?.category || '其他');
      addMemory(conversation.id, content, importance, category, true);
    });

    const eventCandidates = Array.isArray(parsed?.aiEventCandidates) ? parsed.aiEventCandidates : [];
    eventCandidates.forEach((e: any) => {
      const title = String(e?.title || '').trim();
      const description = String(e?.description || '').trim();
      if (!title || !description) return;
      const status: AIEvent['status'] =
        e?.status === 'confirmed' || e?.status === 'failed' ? e.status : 'pending';
      addAIEvent(conversation.id, { title, description, status, tags: e?.tags });
    });
    bank.lastSummaryMessageCount = end;
    saveMemoryBank(bank);
  }

  const reviewStart = bank.lastHundredReviewCount || 0;
  if (allMessages.length - reviewStart >= 100) {
    const reviewEnd = reviewStart + 100;
    const windowMsgs = allMessages.slice(Math.max(0, reviewEnd - 100), reviewEnd);
    const prevMem = bank.memories.slice(0, 30).map(m => `- [${m.category || '其他'}|${m.importance}] ${m.content}`).join('\n');
    const existingEvents = (bank.aiEvents || [])
      .slice(0, 12)
      .map((e) => `- (${e.day})[${e.status}] ${e.title}：${e.description}`)
      .join('\n');
    const roleAnchor = buildProfileEngineRoleAnchor(conversation);
    const prompt =
      `你要做100条对话复盘（关键：AI是“成长和流动的”）。\n` +
      `${roleAnchor}\n\n` +
      `定义（须与上面「动态画像的写作视角」一致）：\n` +
      `- aiSelfProfile：第一人称「我」——「我对我自己的认知」（身份感、处境、承诺、经历、价值观等），贴合角色设定，可带主观色彩；用于覆盖对话中已证伪或过时的初始人设。\n` +
      `- userProfile：第一人称「我」——「我对用户的认知」（我眼中的 TA、关系定位如朋友/雇佣/师徒等、变化趋势），是角色主观视角，不是客观人口统计。\n` +
      `- AI事件：会改变未来行为的事实节点（辞职成功/失败、被雇佣、关系升级、搬家、重大承诺等）。\n\n` +
      `任务：先看旧记忆与旧事件，再看新对话，决定哪些要新增/更新。输出尽量“可执行、可保持一致”。\n` +
      `输出JSON: {"newMemories":[{"content":"...","importance":"high|medium|low","category":"关系|事件|喜好|对话互动|情感|AI观点|AI经历"}],"aiEvents":[{"title":"...","description":"...","status":"pending|confirmed|failed","tags":["..."]}],"aiSelfProfile":"...","userProfile":"..."}\n` +
      `旧记忆:\n${prevMem}\n` +
      `旧事件:\n${existingEvents || '（无）'}\n` +
      `新对话:\n${toDialogue(windowMsgs)}`;
    const parsed = await askJson(apiConfig, prompt);
    const newMemories = Array.isArray(parsed?.newMemories) ? parsed.newMemories : [];
    newMemories.forEach((m: any) => {
      const content = String(m?.content || '').trim();
      if (!content) return;
      const importance = m?.importance === 'high' || m?.importance === 'low' ? m.importance : 'medium';
      const category = String(m?.category || '其他');
      addMemory(conversation.id, `【100条复盘】${content}`, importance, category, true);
    });
    const aiSelf = String(parsed?.aiSelfProfile || '').trim();
    const userP = String(parsed?.userProfile || '').trim();
    if (aiSelf || userP) {
      updateDynamicProfiles(conversation.id, aiSelf || bank.aiSelfProfile?.text || '', userP || bank.userProfile?.text || '', utc8DayKey(Date.now()));
    }

    const events = Array.isArray(parsed?.aiEvents) ? parsed.aiEvents : [];
    events.forEach((e: any) => {
      const title = String(e?.title || '').trim();
      const description = String(e?.description || '').trim();
      if (!title || !description) return;
      const status: AIEvent['status'] =
        e?.status === 'confirmed' || e?.status === 'failed' ? e.status : 'pending';
      addAIEvent(conversation.id, { title, description, status, tags: e?.tags });
    });
    bank.lastHundredReviewCount = reviewEnd;
    saveMemoryBank(bank);
  }

  if (!bank.dayPartSummaryMarks) bank.dayPartSummaryMarks = {};
  const day = utc8DayKey(Date.now());
  for (const part of ['morning', 'noon', 'evening'] as const) {
    const key = `${day}:${part}`;
    if (bank.dayPartSummaryMarks?.[key]) continue;
    const partMsgs = allMessages.filter((m) => utc8DayKey(m.timestamp || Date.now()) === day && dayPartOf(m.timestamp || Date.now()) === part);
    if (partMsgs.length < 4) continue;
    const parsed = await askJson(apiConfig, `请基于以下${part === 'morning' ? '早间' : part === 'noon' ? '午间' : '晚间'}对话写50-120字阶段小结，角色第一人称。\n输出JSON: {"summary":"...","moodTags":["..."]}\n${toDialogue(partMsgs)}`);
    const summary = String(parsed?.summary || '').trim();
    const moodTags = Array.isArray(parsed?.moodTags) ? parsed.moodTags.map((x: any) => String(x)).filter(Boolean).slice(0, 6) : [];
    if (summary) {
      addDiaryEntry(
        conversation.id,
        day,
        `【${part === 'morning' ? '早间' : part === 'noon' ? '午间' : '晚间'}·角色日记】${summary}`,
        moodTags,
        'auto',
        'diary'
      );
      bank.dayPartSummaryMarks![key] = Date.now();
      saveMemoryBank(bank);
    }
  }

  if (bank.lastDailySummaryDay !== day) {
    const todayMsgs = allMessages.filter((m) => utc8DayKey(m.timestamp || Date.now()) === day);
    if (todayMsgs.length >= 8) {
      const roleAnchor = buildProfileEngineRoleAnchor(conversation);
      const parsed = await askJson(apiConfig, 
        `你要输出“今日总结 + 画像更新 + 事件”。\n` +
        `${roleAnchor}\n\n` +
        `定义：\n` +
        `- 今日总结：角色第一人称，记录今天与用户的关键互动\n` +
        `- aiSelfProfile：第一人称「我」——「我对我自己的认知」，须贴合角色设定锚点，可主观，用于覆盖初始人设中已被对话更新的部分\n` +
        `- userProfile：第一人称「我」——「我对用户的认知」，局中人视角、可带印象与情绪倾向，非客观第三方档案\n` +
        `- AI事件：今天如果出现状态变化/关系变化/角色定位变化，必须产出事件。\n\n` +
        `输出JSON: {"dailySummary":"...","moodTags":["..."],"aiSelfProfile":"...","userProfile":"...","aiEvents":[{"title":"...","description":"...","status":"pending|confirmed|failed","tags":["..."]}]}\n` +
        `${toDialogue(todayMsgs)}`
      );
      const dailySummary = String(parsed?.dailySummary || '').trim();
      const moodTags = Array.isArray(parsed?.moodTags) ? parsed.moodTags.map((x: any) => String(x)).filter(Boolean).slice(0, 8) : [];
      if (dailySummary) {
        addDiaryEntry(conversation.id, day, `【今日·角色日记】${dailySummary}`, moodTags, 'auto', 'diary');
      }
      const aiSelf = String(parsed?.aiSelfProfile || '').trim();
      const userP = String(parsed?.userProfile || '').trim();
      if (aiSelf || userP) {
        updateDynamicProfiles(conversation.id, aiSelf || bank.aiSelfProfile?.text || '', userP || bank.userProfile?.text || '', day);
      }

      const events = Array.isArray(parsed?.aiEvents) ? parsed.aiEvents : [];
      events.forEach((e: any) => {
        const title = String(e?.title || '').trim();
        const description = String(e?.description || '').trim();
        if (!title || !description) return;
        const status: AIEvent['status'] =
          e?.status === 'confirmed' || e?.status === 'failed' ? e.status : 'pending';
        addAIEvent(conversation.id, { title, description, status, tags: e?.tags });
      });
      bank.lastDailySummaryDay = day;
      saveMemoryBank(bank);
    }
  }
}

// =======================
// ✅ 后台队列：不阻塞用户
// =======================
type EngineQueueState = {
  scheduled: boolean;
  pending: boolean;
  running: boolean;
};

const engineQueue = new Map<string, EngineQueueState>();

function scheduleIdle(fn: () => void) {
  const w = window as any;
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(fn, { timeout: 1500 });
    return;
  }
  setTimeout(fn, 0);
}

export function enqueueMemoryEngineCycle(
  conversation: Conversation,
  apiConfig: ApiConfig
): void {
  const convId = conversation?.id;
  if (!convId) return;
  if (!conversation.enabledFeatures?.includes('memory-system')) return;

  const state = engineQueue.get(convId) || { scheduled: false, pending: false, running: false };
  if (state.running) {
    state.pending = true;
    engineQueue.set(convId, state);
    return;
  }
  if (state.scheduled) {
    state.pending = true;
    engineQueue.set(convId, state);
    return;
  }

  state.scheduled = true;
  engineQueue.set(convId, state);

  scheduleIdle(() => {
    const st = engineQueue.get(convId) || state;
    st.scheduled = false;
    st.running = true;
    st.pending = false;
    engineQueue.set(convId, st);

    runMemoryEngineCycle(conversation, apiConfig)
      .catch((e) => console.error('[memory-engine] 后台执行失败:', e))
      .finally(() => {
        const st2 = engineQueue.get(convId);
        if (!st2) return;
        st2.running = false;
        const shouldRerun = st2.pending;
        st2.pending = false;
        engineQueue.set(convId, st2);
        if (shouldRerun) {
          // 再跑一轮（比如新消息又来了）
          enqueueMemoryEngineCycle(conversation, apiConfig);
        }
      });
  });
}

/**
 * 角色设置保存后：若已开启完整记忆系统且未总结消息数达到自动总结阈值，
 * 立即排队补跑记忆引擎（无需再等一条新消息）。
 */
export function enqueueMemoryEngineIfBacklogAfterSave(
  base: Conversation,
  updates: {
    name?: string;
    enabledFeatures: string[];
    characterSettings: Conversation['characterSettings'];
  },
  apiConfig: ApiConfig
): void {
  if (base.type !== 'private') return;
  if (!updates.enabledFeatures.includes('memory-system')) return;
  const bank = getMemoryBank(base.id);
  if (!bank.settings.enableAutoSummary) return;
  const msgCount = base.messages?.length || 0;
  if (!shouldTriggerAutoSummary(base.id, msgCount)) return;

  const merged: Conversation = {
    ...base,
    name: updates.name ?? base.name,
    enabledFeatures: updates.enabledFeatures,
    characterSettings: updates.characterSettings,
  };
  enqueueMemoryEngineCycle(merged, apiConfig);
}

/**
 * 生成记忆总结提示词
 */
export const buildMemorySummaryPrompt = (messages: Message[], existingMemories: MemoryEntry[]): string => {
  // 提取最近的对话内容（用于总结）
  const recentMessages = messages.slice(-30); // 最近30条消息
  
  let conversationText = '';
  recentMessages.forEach(msg => {
    const speaker = msg.role === 'user' ? '用户' : 'AI';
    let content = msg.content;
    
    // 处理特殊消息类型
    if (msg.mediaType === 'image' && msg.mediaDescription) {
      content = `[图片：${msg.mediaDescription}]`;
    } else if (msg.mediaType === 'voice' && msg.mediaDescription) {
      content = `[语音：${msg.mediaDescription}]`;
    } else if (msg.mediaType === 'video' && msg.mediaDescription) {
      content = `[视频：${msg.mediaDescription}]`;
    }
    
    conversationText += `${speaker}: ${content}\n`;
  });
  
  const existingMemoriesText = existingMemories.length > 0
    ? '\n\n【已有记忆】\n' + existingMemories.map(m => `- [${m.category || '其他'}] ${m.content}`).join('\n')
    : '';
  
  return `
【记忆总结任务】

请仔细分析以下对话，提取值得长期记忆的关键信息。

${existingMemoriesText}

【最近对话内容】
${conversationText}

【任务要求】
1. 提取以下类型的重要信息（如果有）：

**关于用户的记忆：**
   - 个人信息：用户的姓名、年龄、职业、家庭情况等基本信息
   - 喜好偏好：用户喜欢/不喜欢什么（食物、音乐、活动等）
   - 重要事件：用户提到的重要经历、计划、目标
   - 人际关系：用户提到的家人、朋友、同事等
   - 生活习惯：作息时间、日常习惯等
   - 情感状态：用户的情绪、压力、困扰等

**关于AI角色自己的记忆：**
   - AI提到的自己的经历和故事（如"我之前在课堂上吐槽老师"）
   - AI表达的观点、态度、喜好（如"我最喜欢的电影是..."）
   - AI提到的自己的人际关系（如"我的室友"、"我的老师"）
   - AI分享的个人感受和情绪
   - ⚠️ 重要：这些是AI在**本次对话中新提到的内容**，需要记住以便未来保持一致

**对话互动记忆：**
   - 重要的对话片段（用户问了什么重要问题，AI如何回答）
   - 共同的话题和讨论（如一起讨论某部电影、某个事件）
   - 有趣的互动和玩笑
   - 承诺和约定（如"下次一起去..."）

2. 每条记忆要求：
   - 简洁明确，一句话说清楚
   - 避免重复已有记忆
   - 只记录确定的信息，不要推测
   - 如果信息有更新，标注"更新："
   - **特别注意**：AI提到的自己的经历要详细记录，以便后续保持连贯

3. 重要性判断：
   - HIGH（高）：非常重要的个人信息、重大事件、核心喜好、AI的核心经历
   - MEDIUM（中）：一般性信息、日常事件、普通对话片段
   - LOW（低）：次要信息、可有可无的细节

【输出格式】
请严格按照以下JSON格式输出（不要添加任何其他文字）：
{
  "memories": [
    {
      "content": "记忆内容",
      "importance": "HIGH|MEDIUM|LOW",
      "category": "个人信息|喜好|事件|关系|习惯|情感|AI经历|AI观点|对话互动|其他"
    }
  ]
}

【示例】
如果对话中AI说："我上周在课堂上吐槽老师把PPT放反了，全班都笑疯了"
应该记录：
{
  "content": "AI上周在课堂上吐槽老师把PPT放反了，全班都笑了",
  "importance": "MEDIUM",
  "category": "AI经历"
}

如果用户后来问："你和那个老师关系还好吗？"
AI就能从记忆中知道"那个老师"指的是谁。

如果没有值得记忆的新信息，返回：
{
  "memories": []
}
`;
};

/**
 * 解析AI返回的记忆总结
 */
export const parseMemorySummaryResponse = (response: string): Array<{
  content: string;
  importance: 'low' | 'medium' | 'high';
  category?: string;
}> => {
  try {
    // 尝试提取JSON部分
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('No JSON found in memory summary response');
      return [];
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    if (!parsed.memories || !Array.isArray(parsed.memories)) {
      return [];
    }
    
    return parsed.memories.map((m: any) => ({
      content: m.content,
      importance: (m.importance === 'HIGH' ? 'high' : m.importance === 'LOW' ? 'low' : 'medium') as 'low' | 'medium' | 'high',
      category: m.category
    }));
  } catch (error) {
    console.error('Failed to parse memory summary:', error);
    return [];
  }
};

/**
 * 构建记忆上下文（用于AI回复时）
 */
export const buildMemoryContext = (memories: MemoryEntry[]): string => {
  if (memories.length === 0) {
    return '';
  }
  
  // 按重要性和时间排序
  const sortedMemories = [...memories].sort((a, b) => {
    const importanceWeight = { high: 3, medium: 2, low: 1 };
    const weightDiff = importanceWeight[b.importance] - importanceWeight[a.importance];
    if (weightDiff !== 0) return weightDiff;
    return b.timestamp - a.timestamp; // 相同重要性按时间倒序
  });
  
  // 取最重要的前20条
  const topMemories = sortedMemories.slice(0, 20);
  
  let context = '\n【长期记忆库】\n';
  context += '以下是你和这位用户长期交往积累的记忆，包括关于用户的信息、你自己提到过的经历、以及你们之间的重要对话。\n';
  context += '请自然地运用这些记忆，保持角色的连贯性和一致性。\n\n';
  
  // 按分类整理
  const categories: Record<string, MemoryEntry[]> = {};
  topMemories.forEach(m => {
    const cat = m.category || '其他';
    if (!categories[cat]) {
      categories[cat] = [];
    }
    categories[cat].push(m);
  });
  
  // 定义分类顺序和说明
  const categoryOrder = [
    { key: 'AI经历', label: '关于你自己的经历', desc: '这些是你之前提到过的自己的故事和经历，请保持一致' },
    { key: 'AI观点', label: '你的观点和态度', desc: '你之前表达过的想法和喜好' },
    { key: '对话互动', label: '你们之间的互动', desc: '重要的对话片段、约定和共同话题' },
    { key: '个人信息', label: '关于用户', desc: '用户的基本信息' },
    { key: '喜好', label: '用户的喜好', desc: '' },
    { key: '事件', label: '用户的事件', desc: '' },
    { key: '关系', label: '用户的人际关系', desc: '' },
    { key: '习惯', label: '用户的习惯', desc: '' },
    { key: '情感', label: '用户的情感', desc: '' },
    { key: '其他', label: '其他记忆', desc: '' }
  ];
  
  // 按预定义顺序输出分类记忆
  categoryOrder.forEach(({ key, label, desc }) => {
    if (categories[key] && categories[key].length > 0) {
      context += `【${label}】\n`;
      if (desc) {
        context += `💡 ${desc}\n`;
      }
      categories[key].forEach(m => {
        const importance = m.importance === 'high' ? '⭐⭐⭐' : m.importance === 'medium' ? '⭐⭐' : '⭐';
        context += `${importance} ${m.content}\n`;
      });
      context += '\n';
    }
  });
  
  context += '**重要提示**：\n';
  context += '- 这些记忆是你和用户长期交往积累的，请自然地运用\n';
  context += '- **关于你自己的记忆**：如果用户提到你之前说过的经历（如"你上次说的那个老师"），你要能回忆起具体内容\n';
  context += '- **保持一致性**：你的观点、喜好、经历要与记忆保持一致，不要自相矛盾\n';
  context += '- 不要刻意展示记忆，而是在合适的时候自然提起\n';
  context += '- 如果用户提到相关话题，可以回忆起之前的对话\n';
  context += '- 避免重复询问你已经知道的信息\n';
  
  return context;
};

// 以下是为了兼容旧代码而保留的函数

/**
 * 从对话中提取记忆（旧版兼容）
 * @deprecated 使用新的自动总结系统
 */
export const extractMemoriesFromConversation = async (): Promise<any[]> => {
  console.warn('extractMemoriesFromConversation is deprecated, use auto summary instead');
  return [];
};

/**
 * 生成记忆总结（旧版兼容）
 * @deprecated 使用新的buildMemoryContext
 */
export const generateMemorySummary = async (): Promise<string> => {
  console.warn('generateMemorySummary is deprecated, use buildMemoryContext instead');
  return '';
};

/**
 * 应用记忆到对话上下文（旧版兼容，重定向到新函数）
 */
export const applyMemoriesToContext = (conversation: any, _memories: any[]): string => {
  return buildMemoryAndIdentityContext(conversation.id);
};

/**
 * 保存记忆到localStorage（旧版兼容）
 * @deprecated 使用saveMemoryBank
 */
export const saveMemories = (): void => {
  console.warn('saveMemories is deprecated, use saveMemoryBank instead');
};

/**
 * 从localStorage加载记忆（旧版兼容）
 * @deprecated 使用getMemoryBank
 */
export const loadMemories = (): any[] => {
  console.warn('loadMemories is deprecated, use getMemoryBank instead');
  return [];
};

/**
 * 添加新记忆（旧版兼容）
 * @deprecated 使用addMemory
 */
export const addMemories = (): any[] => {
  console.warn('addMemories is deprecated, use addMemory instead');
  return [];
};

/**
 * 获取对话的所有记忆（兼容函数）
 */
export const getConversationMemories = (conversationId: string): any[] => {
  const bank = getMemoryBank(conversationId);
  return bank.memories;
};

// ==================== 群聊记忆功能 ====================

/**
 * 检查是否需要触发群聊记忆总结
 */
export const shouldTriggerGroupMemorySummary = (
  conversationId: string,
  groupMessageCount: number
): boolean => {
  const bank = getMemoryBank(conversationId);
  const interval = bank.settings.groupSummaryInterval || 50; // 默认50条
  const lastCount = bank.lastGroupSummaryCount || 0;
  const messagesSinceLastSummary = groupMessageCount - lastCount;
  
  return messagesSinceLastSummary >= interval;
};

/**
 * 更新群聊总结计数器
 */
export const updateGroupSummaryCounter = (
  conversationId: string,
  currentGroupMessageCount: number
): void => {
  const bank = getMemoryBank(conversationId);
  bank.lastGroupSummaryCount = currentGroupMessageCount;
  bank.totalGroupMessagesSinceLastSummary = 0;
  saveMemoryBank(bank);
};

/**
 * 构建群聊记忆总结提示词
 */
export const buildGroupMemorySummaryPrompt = (
  groupName: string,
  aiName: string,
  messages: Message[],
  groupMembers: string[],
  existingGroupMemories: MemoryEntry[]
): string => {
  // 提取最近的群聊对话
  const recentMessages = messages.slice(-30); // 最近30条
  
  let conversationText = '';
  recentMessages.forEach(msg => {
    const msgWithSender = msg as any;
    const speaker = msgWithSender.senderName || (msg.role === 'user' ? '用户' : 'AI');
    let content = msg.content || '[媒体消息]';
    
    conversationText += `${speaker}: ${content}\n`;
  });
  
  const existingMemoriesText = existingGroupMemories.length > 0
    ? '\n\n【已有群聊记忆】\n' + existingGroupMemories.map(m => 
        `- [${m.category || '其他'}] ${m.content}`
      ).join('\n')
    : '';
  
  const membersText = groupMembers.join('、');
  
  return `
【群聊记忆总结任务】

你是"${aiName}"，这是你在群聊"${groupName}"的记忆总结。

【群聊信息】
- 群名：${groupName}
- 群成员：${membersText}

${existingMemoriesText}

【最近群聊对话】
${conversationText}

【总结要求】
请提取对"你"（${aiName}）有价值的记忆，包括：
1. 群友的性格特点、喜好、习惯
2. 群里讨论的重要话题和事件
3. 你参与的互动、约定、承诺
4. 群里的规则、习惯、氛围
5. 与你相关的特殊事件或经历

【输出格式】
严格按照以下JSON格式输出，不要有任何额外文字：
{
  "memories": [
    {
      "content": "具体的记忆内容",
      "category": "分类（如：群友信息、群聊话题、互动记录、群规则等）",
      "importance": "low/medium/high"
    }
  ]
}

注意：
- 只提取真正重要的信息，不要记录琐碎内容
- 每条记忆要简洁明了
- 重点记录与"你"（${aiName}）相关的内容
- 如果没有值得记忆的内容，返回空数组
`;
};

/**
 * 获取群聊记忆
 */
export const getGroupMemories = (conversationId: string, groupId?: string): MemoryEntry[] => {
  const bank = getMemoryBank(conversationId);
  return bank.memories.filter(m => {
    if (groupId) {
      return m.source === 'group' && m.groupId === groupId;
    }
    return m.source === 'group';
  });
};

/**
 * 获取私聊记忆
 */
export const getPrivateMemories = (conversationId: string): MemoryEntry[] => {
  const bank = getMemoryBank(conversationId);
  return bank.memories.filter(m => m.source === 'private' || !m.source);
};

/**
 * 添加群聊记忆
 */
export const addGroupMemory = (
  conversationId: string,
  groupId: string,
  groupName: string,
  content: string,
  category: string,
  importance: 'low' | 'medium' | 'high'
): void => {
  const bank = getMemoryBank(conversationId);
  
  const newMemory: MemoryEntry = {
    id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    content,
    importance,
    category,
    autoGenerated: true,
    source: 'group',
    groupId,
    groupName
  };
  
  bank.memories.unshift(newMemory); // 新记忆放在最前面
  
  // 如果超过最大记忆数，删除最旧的低重要性记忆
  if (bank.memories.length > bank.settings.maxMemories) {
    const lowImportance = bank.memories.filter(m => m.importance === 'low');
    if (lowImportance.length > 0) {
      const toDelete = lowImportance[lowImportance.length - 1];
      bank.memories = bank.memories.filter(m => m.id !== toDelete.id);
    } else {
      // 如果没有低重要性记忆，删除最旧的
      bank.memories.pop();
    }
  }
  
  saveMemoryBank(bank);
};
