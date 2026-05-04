import type { ApiConfig, CharacterSettings, Conversation, Message } from '../types';
import { requireSupabaseClient } from './supabaseClient';
import { getAIResponse } from '../utils/apiHelper';
import {
  addMemory,
  addDiaryEntry,
  updateDynamicProfiles,
  getMemoryBank,
  shouldTriggerAutoSummary,
  updateSummaryCounter,
} from '../utils/memorySystem';

const CHUNK_SUMMARY_SIZE = 100;
const WATERMARK_KEY_CHUNK = 'chunk_summary';

function toIso(ts: number): string {
  return new Date(ts).toISOString();
}

function safeJson<T>(value: T): any {
  return value as any;
}

function utc8DayKey(ts: number): string {
  const utc8OffsetMs = 8 * 60 * 60 * 1000;
  return new Date(ts + utc8OffsetMs).toISOString().slice(0, 10);
}

async function getCurrentUserId(supabase: ReturnType<typeof requireSupabaseClient>): Promise<string | null> {
  const { data: session } = await supabase.auth.getSession();
  return session.session?.user?.id ?? null;
}

function table(supabase: ReturnType<typeof requireSupabaseClient>, name: string): any {
  return (supabase as any).from(name);
}

async function getMessageCount(
  supabase: ReturnType<typeof requireSupabaseClient>,
  userId: string,
  conversationId: string
): Promise<number> {
  const { count, error } = await table(supabase, 'messages')
    .select('id', { head: true, count: 'exact' })
    .eq('user_id', userId)
    .eq('conversation_id', conversationId);

  if (error) throw error;
  return count ?? 0;
}

function clipText(text: string, max = 60): string {
  const value = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function formatMessagesForPrompt(messages: Message[]): string {
  return messages
    .map((m, idx) => `${idx + 1}. [${m.role}] ${clipText(m.content ?? '', 300)}`)
    .join('\n');
}

function buildPersonaContext(aiName: string, characterSettings?: CharacterSettings): string {
  if (!characterSettings) {
    return `AI名称：${aiName}\n未提供详细人设，请保持口吻自然。`;
  }

  const personaLines = [
    `AI名称：${aiName}`,
    characterSettings.systemPrompt ? `人物设定：${characterSettings.systemPrompt}` : '',
    characterSettings.personality ? `性格特征：${characterSettings.personality}` : '',
    characterSettings.languageStyle ? `语言风格：${characterSettings.languageStyle}` : '',
    characterSettings.languageExample ? `语言示例：${characterSettings.languageExample}` : '',
    characterSettings.memoryEvents ? `关键记忆：${characterSettings.memoryEvents}` : '',
  ].filter(Boolean);

  if (personaLines.length <= 1) {
    return `AI名称：${aiName}\n未提供详细人设，请保持口吻自然。`;
  }

  return [
    ...personaLines,
    '请严格参考以上角色信息进行表达（语气、价值观、关系边界）。',
  ].join('\n');
}

async function generateChunkSummaryByAI(
  apiConfig: ApiConfig,
  aiName: string,
  characterSettings: CharacterSettings | undefined,
  messages: Message[]
): Promise<string> {
  const prompt = [
    '你是对话记录分析助手，但必须贴合该AI角色人设。',
    '请基于以下聊天片段生成“阶段总结”。',
    '',
    '角色信息：',
    buildPersonaContext(aiName, characterSettings),
    '',
    '要求：',
    '1) 用中文；2) 80-220字；3) 聚焦双方聊了什么、情绪变化、关键事件；',
    '4) 不要编造对话里没有的信息；5) 输出纯文本，不要markdown标题。',
    '',
    '聊天片段：',
    formatMessagesForPrompt(messages),
  ].join('\n');

  return getAIResponse(
    apiConfig,
    [
      { role: 'system', content: '你擅长从聊天中提炼高质量总结，表达自然简洁。' },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.4, max_tokens: 600 }
  );
}

async function generateDailyDiaryByAI(
  apiConfig: ApiConfig,
  aiName: string,
  characterSettings: CharacterSettings | undefined,
  day: string,
  messages: Message[]
): Promise<{ diaryText: string; moodTags: string[] }> {
  const prompt = [
    `请把这一天（${day}）的聊天记录写成“对话日记”。`,
    '',
    '角色信息：',
    buildPersonaContext(aiName, characterSettings),
    '',
    '要求：',
    '1) 用第一人称“我”的口吻，像真实日记；',
    '2) 120-260字；',
    '3) 包含：聊了什么、对方状态/想法、我的回应、当天整体心情；',
    '4) 只基于给定聊天，不编造。',
    '5) 最后单独一行输出情绪标签，格式：MOOD_TAGS: 标签1,标签2,标签3',
    '',
    '聊天记录：',
    formatMessagesForPrompt(messages),
  ].join('\n');

  const raw = await getAIResponse(
    apiConfig,
    [
      { role: 'system', content: '你是擅长写角色日记的助手，文风自然、有人味。' },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.7, max_tokens: 900 }
  );

  const lines = raw.split('\n');
  const moodLine = lines.find(line => line.trim().startsWith('MOOD_TAGS:'));
  const moodTags = moodLine
    ? moodLine
        .replace('MOOD_TAGS:', '')
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean)
        .slice(0, 6)
    : [];
  const diaryText = lines
    .filter(line => !line.trim().startsWith('MOOD_TAGS:'))
    .join('\n')
    .trim();

  return { diaryText, moodTags };
}

async function generateImpressionsByAI(
  apiConfig: ApiConfig,
  aiName: string,
  characterSettings: CharacterSettings | undefined,
  day: string,
  diaryText: string
): Promise<{ aiSelf: string; userImpression: string }> {
  const prompt = [
    `基于这篇日记（日期 ${day}），生成两段印象更新：`,
    '',
    '角色信息：',
    buildPersonaContext(aiName, characterSettings),
    '',
    'A. 我对自己的印象（ai_self）',
    'B. 我对用户的印象（user）',
    '',
    '要求：',
    '1) 各 60-140 字；2) 具体但不过度绝对；3) 不编造信息；',
    '4) 严格按以下格式输出：',
    'AI_SELF: ...',
    'USER_IMPRESSION: ...',
    '',
    '日记内容：',
    diaryText,
  ].join('\n');

  const raw = await getAIResponse(
    apiConfig,
    [
      { role: 'system', content: '你擅长做长期关系记忆更新，表达准确、克制、可延续。' },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.5, max_tokens: 700 }
  );

  const aiSelfLine = raw.split('\n').find(line => line.trim().startsWith('AI_SELF:'));
  const userLine = raw.split('\n').find(line => line.trim().startsWith('USER_IMPRESSION:'));
  const aiSelf = (aiSelfLine?.replace('AI_SELF:', '').trim() || clipText(raw, 140)).trim();
  const userImpression = (userLine?.replace('USER_IMPRESSION:', '').trim() || clipText(raw, 140)).trim();
  return { aiSelf, userImpression };
}

async function getWatermark(
  supabase: ReturnType<typeof requireSupabaseClient>,
  userId: string,
  conversationId: string,
  key: string
): Promise<Record<string, any> | null> {
  const { data, error } = await table(supabase, 'processing_watermarks')
    .select('value')
    .eq('user_id', userId)
    .eq('conversation_id', conversationId)
    .eq('key', key)
    .maybeSingle();

  if (error) throw error;
  return (data?.value as Record<string, any>) ?? null;
}

async function upsertWatermark(
  supabase: ReturnType<typeof requireSupabaseClient>,
  userId: string,
  conversationId: string,
  key: string,
  value: Record<string, any>
): Promise<void> {
  const { error } = await table(supabase, 'processing_watermarks').upsert(
    {
      user_id: userId,
      conversation_id: conversationId,
      key,
      value: safeJson(value),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,conversation_id,key' }
  );
  if (error) throw error;
}

export async function supabaseLoadConversations(): Promise<Conversation[]> {
  const supabase = requireSupabaseClient();

  const userId = await getCurrentUserId(supabase);
  if (!userId) return [];

  const { data, error } = await table(supabase, 'conversations')
    .select('*')
    .order('last_message_at', { ascending: false });

  if (error) throw error;
  const rows = data ?? [];

  return rows.map((row: any) => {
    const characterSettings = row.character_settings ?? undefined;
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      avatar: row.avatar ?? undefined,
      characterSettings,
      lastMessageTime: row.last_message_at ? new Date(row.last_message_at).getTime() : Date.now(),
      messages: [], // loaded separately per conversation
      unreadCount: 0,
      isMuted: false,
    } as Conversation;
  });
}

export async function supabaseLoadMessages(conversationId: string, limit = 80): Promise<Message[]> {
  const supabase = requireSupabaseClient();
  const userId = await getCurrentUserId(supabase);
  if (!userId) return [];

  const { data, error } = await table(supabase, 'messages')
    .select('*')
    .eq('user_id', userId)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  const rows = (data ?? []).reverse();

  return rows.map((row: any) => {
    const meta = row.meta ?? {};
    return {
      id: row.id,
      role: row.role,
      content: row.content,
      timestamp: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      ...meta,
    } as Message;
  });
}

export async function supabaseUpsertConversation(conv: Conversation): Promise<void> {
  const supabase = requireSupabaseClient();

  const userId = await getCurrentUserId(supabase);
  if (!userId) return;

  const lastMsg = conv.messages[conv.messages.length - 1];
  const lastMessageAt = lastMsg ? toIso(lastMsg.timestamp ?? Date.now()) : null;

  const payload = {
    id: conv.id,
    user_id: userId,
    name: conv.name,
    type: conv.type ?? 'private',
    avatar: conv.avatar ?? null,
    character_settings: safeJson(conv.characterSettings ?? null),
    last_message_preview: lastMsg?.content?.slice(0, 120) ?? null,
    last_message_at: lastMessageAt,
    updated_at: new Date().toISOString(),
  };

  const { error } = await table(supabase, 'conversations').upsert(payload);
  if (error) throw error;
}

export async function supabaseAppendMessages(conversationId: string, messages: Message[]): Promise<void> {
  if (messages.length === 0) return;
  const supabase = requireSupabaseClient();

  const userId = await getCurrentUserId(supabase);
  if (!userId) return;

  const rows = messages.map((m) => {
    const { id, role, content, timestamp, ...rest } = m as any;
    return {
      id: String(id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
      user_id: userId,
      conversation_id: conversationId,
      role,
      content: content ?? '',
      created_at: timestamp ? toIso(timestamp) : new Date().toISOString(),
      meta: safeJson(rest),
    };
  });

  const { error } = await table(supabase, 'messages').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

export async function supabaseDeleteConversation(conversationId: string): Promise<void> {
  const supabase = requireSupabaseClient();
  const userId = await getCurrentUserId(supabase);
  if (!userId) return;

  const { error: messageDeleteError } = await table(supabase, 'messages')
    .delete()
    .eq('user_id', userId)
    .eq('conversation_id', conversationId);
  if (messageDeleteError) throw messageDeleteError;

  const { error: conversationDeleteError } = await table(supabase, 'conversations')
    .delete()
    .eq('user_id', userId)
    .eq('id', conversationId);
  if (conversationDeleteError) throw conversationDeleteError;
}

export async function supabaseSyncDerivedMemory(
  conversationId: string,
  conversationName: string,
  characterSettings: CharacterSettings | undefined,
  allMessages: Message[],
  newMessages: Message[],
  apiConfig: ApiConfig
): Promise<void> {
  if (!allMessages.length || !newMessages.length) return;
  if (!apiConfig.baseUrl || !apiConfig.apiKey || !apiConfig.modelName) return;
  const supabase = requireSupabaseClient();
  const userId = await getCurrentUserId(supabase);
  if (!userId) return;

  // 1) 复用现有记忆系统设置：按autoSummaryInterval触发阶段总结
  const memoryBank = getMemoryBank(conversationId);
  const memoryEnabled = characterSettings?.memoryConfig?.enabled ?? true;
  const memoryAutoSummaryEnabled = memoryBank.settings.enableAutoSummary;
  const memoryInterval = Math.max(10, memoryBank.settings.autoSummaryInterval || CHUNK_SUMMARY_SIZE);

  if (!memoryEnabled || !memoryAutoSummaryEnabled) return;

  // 基于本地记忆系统的触发规则判断是否需要生成
  if (!shouldTriggerAutoSummary(conversationId, allMessages.length)) {
    return;
  }

  // 2) 阶段总结（基于水位线，避免重复）
  const totalMessages = await getMessageCount(supabase, userId, conversationId);
  const chunkWatermark = await getWatermark(supabase, userId, conversationId, WATERMARK_KEY_CHUNK);
  let lastSummarizedCount = Number(chunkWatermark?.last_summarized_message_count ?? 0);

  while (lastSummarizedCount + memoryInterval <= totalMessages) {
    const endCount = lastSummarizedCount + memoryInterval;
    const chunk = allMessages.slice(lastSummarizedCount, endCount);
    if (chunk.length < memoryInterval) break;
    const summaryText = await generateChunkSummaryByAI(
      apiConfig,
      conversationName,
      characterSettings,
      chunk
    );

    const { error: insertError } = await table(supabase, 'conversation_chunk_summaries').insert({
      user_id: userId,
      conversation_id: conversationId,
      start_message_at: toIso(chunk[0].timestamp ?? Date.now()),
      end_message_at: toIso(chunk[chunk.length - 1].timestamp ?? Date.now()),
      message_count: chunk.length,
      summary_text: summaryText.trim(),
      created_at: new Date().toISOString(),
    });
    if (insertError) throw insertError;

    // 同步写入现有本地记忆库（复用 MemoryManager 可见数据）
    addMemory(
      conversationId,
      summaryText.trim(),
      'medium',
      '对话互动',
      true
    );

    lastSummarizedCount = endCount;
  }

  if (lastSummarizedCount > Number(chunkWatermark?.last_summarized_message_count ?? 0)) {
    await upsertWatermark(supabase, userId, conversationId, WATERMARK_KEY_CHUNK, {
      last_summarized_message_count: lastSummarizedCount,
      total_seen_message_count: totalMessages,
    });
    updateSummaryCounter(conversationId, allMessages.length);
  }

  // 3) 对“本次新增消息涉及到的天”做日记和印象更新（UTC+8）
  const touchedDays = Array.from(
    new Set(newMessages.map(m => utc8DayKey(m.timestamp ?? Date.now())))
  );

  for (const day of touchedDays) {
    const dayMessages = allMessages.filter(m => utc8DayKey(m.timestamp ?? Date.now()) === day);
    if (!dayMessages.length) continue;
    const { diaryText, moodTags } = await generateDailyDiaryByAI(
      apiConfig,
      conversationName,
      characterSettings,
      day,
      dayMessages
    );
    const finalDiaryText = diaryText.trim() || `${day} 暂无有效日记内容`;

    const { error: diaryError } = await table(supabase, 'conversation_daily_diaries').upsert(
      {
        user_id: userId,
        conversation_id: conversationId,
        day,
        diary_text: finalDiaryText,
        mood_tags: safeJson(moodTags),
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,conversation_id,day' }
    );
    if (diaryError) throw diaryError;
    addMemory(conversationId, finalDiaryText, 'medium', 'AI经历', true);
    addDiaryEntry(conversationId, day, finalDiaryText, moodTags, 'auto');

    const { aiSelf, userImpression } = await generateImpressionsByAI(
      apiConfig,
      conversationName,
      characterSettings,
      day,
      finalDiaryText
    );
    const aiSelfText = aiSelf.trim();
    const userText = userImpression.trim();
    const { data: currentImpressions, error: impressionQueryError } = await table(supabase, 'impressions')
      .select('target,version,last_diary_day')
      .eq('user_id', userId)
      .eq('conversation_id', conversationId)
      .in('target', ['ai_self', 'user']);
    if (impressionQueryError) throw impressionQueryError;

    const map = new Map<string, { version?: number; last_diary_day?: string }>();
    (currentImpressions ?? []).forEach((row: any) => {
      map.set(row.target, { version: row.version ?? 0, last_diary_day: row.last_diary_day ?? undefined });
    });

    const upserts = ([
      { target: 'ai_self', text: aiSelfText },
      { target: 'user', text: userText },
    ] as const)
      .filter(item => map.get(item.target)?.last_diary_day !== day)
      .map(item => ({
        user_id: userId,
        conversation_id: conversationId,
        target: item.target,
        text: item.text,
        version: (map.get(item.target)?.version ?? 0) + 1,
        last_diary_day: day,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }));

    if (upserts.length > 0) {
      const { error: upsertImpressionError } = await table(supabase, 'impressions')
        .upsert(upserts, { onConflict: 'user_id,conversation_id,target' });
      if (upsertImpressionError) throw upsertImpressionError;

      // 把印象更新同步到本地记忆库
      addMemory(conversationId, `自我印象更新：${aiSelfText}`, 'low', 'AI观点', true);
      addMemory(conversationId, `用户印象更新：${userText}`, 'low', '关系', true);
      updateDynamicProfiles(conversationId, aiSelfText, userText, day);
    }
  }
}

