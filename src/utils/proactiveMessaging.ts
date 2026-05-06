/**
 * AI主动发消息系统
 * 在后台定期检查并触发AI主动发送消息
 */

import { Conversation, Message, ApiConfig } from '../types';
import { isToolInteractionCharacter } from './characterInteractionMode';
import { getMemoryBank } from './memorySystem';
import { cleanAIMessage, splitMessages } from './messageFormatter';
import { MEDIA_DECISION_GUIDANCE } from './mediaDecisionPrompt';
import { getCachedData, load, save, setCachedData, smartLoad } from './storage';

const STORAGE_KEY = 'proactive_messaging_state';
const USER_RECENT_ACTIVE_MS = 15 * 60 * 1000; // 用户15分钟内活跃则跳过
const ABSOLUTE_MIN_INTERVAL_MS = 10 * 60 * 1000; // 兜底最短间隔，避免连发

type RelationStage = 'cold' | 'familiar' | 'ambiguous';

interface ProactiveMessagingState {
  conversationId: string;
  nextCheckTime: number;
}

/**
 * 获取所有需要检查的对话状态
 */
const getAllStates = (): ProactiveMessagingState[] => {
  const cached = getCachedData<ProactiveMessagingState[]>(STORAGE_KEY);
  return Array.isArray(cached) ? cached : [];
};

/**
 * 保存对话状态
 */
const saveState = (conversationId: string, nextCheckTime: number): void => {
  try {
    const states = getAllStates();
    const index = states.findIndex(s => s.conversationId === conversationId);
    
    if (index >= 0) {
      states[index].nextCheckTime = nextCheckTime;
    } else {
      states.push({ conversationId, nextCheckTime });
    }
    
    setCachedData(STORAGE_KEY, states);
    void save(STORAGE_KEY, states);
  } catch (error) {
    console.error('Failed to save proactive messaging state:', error);
  }
};

export async function initializeProactiveMessagingStorage(): Promise<void> {
  try {
    const data = await load(STORAGE_KEY);
    setCachedData(STORAGE_KEY, Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('初始化主动消息存储失败:', error);
    setCachedData(STORAGE_KEY, []);
  }
}

function isInActiveHours(start: number, end: number, hour: number): boolean {
  // 支持跨午夜区间（例如 22-2）
  if (start === end) return true;
  if (start < end) return hour >= start && hour <= end;
  return hour >= start || hour <= end;
}

function getLastUserMessageTime(conversation: Conversation): number {
  const lastUser = [...(conversation.messages || [])].reverse().find((m) => m.role === 'user');
  return Number(lastUser?.timestamp || 0);
}

function inferRelationStage(conversation: Conversation): RelationStage {
  const bank = getMemoryBank(conversation.id);
  const text = [
    bank.userProfile?.text || '',
    bank.aiSelfProfile?.text || '',
    ...(bank.aiEvents || []).slice(-8).map((e) => `${e.title} ${e.description}`),
    ...(conversation.messages || []).slice(-30).map((m) => m.content || ''),
  ]
    .join('\n')
    .toLowerCase();

  if (/(暧昧|心动|想你|喜欢你|亲爱的|宝贝|想见你|吃醋|约会|拥抱)/.test(text)) return 'ambiguous';
  if (/(冷淡|疏远|不熟|刚认识|陌生|尴尬|客套)/.test(text)) return 'cold';
  return 'familiar';
}

function buildAutoIntervalRange(params: {
  relationStage: RelationStage;
  lifeState: any | null;
}): { minMinutes: number; maxMinutes: number } {
  const { relationStage, lifeState } = params;
  let minMinutes = 50;
  let maxMinutes = 200;

  if (relationStage === 'ambiguous') {
    minMinutes = 30;
    maxMinutes = 130;
  } else if (relationStage === 'cold') {
    minMinutes = 90;
    maxMinutes = 360;
  }

  const socialNeed = Number(lifeState?.socialNeed ?? 50);
  const stress = Number(lifeState?.stress ?? 50);
  const energy = Number(lifeState?.energy ?? 50);

  if (socialNeed >= 72 && energy >= 45) {
    minMinutes = Math.max(20, minMinutes - 18);
    maxMinutes = Math.max(80, maxMinutes - 35);
  }
  if (stress >= 75) {
    minMinutes += 25;
    maxMinutes += 55;
  }

  minMinutes = Math.max(20, Math.min(240, Math.round(minMinutes)));
  maxMinutes = Math.max(minMinutes + 20, Math.min(720, Math.round(maxMinutes)));
  return { minMinutes, maxMinutes };
}

export async function getProactiveDiagnostics(conversation: Conversation): Promise<{
  relationStage: RelationStage;
  intervalRange: { minMinutes: number; maxMinutes: number };
}> {
  const relationStage = inferRelationStage(conversation);
  const lifeState = await loadLifeState(conversation.id);
  const intervalRange = buildAutoIntervalRange({ relationStage, lifeState });
  return { relationStage, intervalRange };
}

/**
 * 检查是否应该发送主动消息
 */
export const shouldSendProactiveMessage = (conversation: Conversation): boolean => {
  if (isToolInteractionCharacter(conversation.characterSettings)) {
    return false;
  }
  const settings = conversation.characterSettings?.proactiveMessaging;
  
  if (!settings || !settings.enabled) {
    return false;
  }
  
  const now = Date.now();
  const currentHour = new Date().getHours();
  
  // 检查是否在活跃时段内
  if (!isInActiveHours(settings.activeHourStart, settings.activeHourEnd, currentHour)) {
    return false;
  }
  
  // 检查是否到了下次检查时间
  const states = getAllStates();
  const state = states.find(s => s.conversationId === conversation.id);
  
  if (state && now < state.nextCheckTime) {
    return false;
  }
  
  // 兜底最短间隔（避免极端情况下连续触发）
  if (settings.lastMessageTime) {
    const timeSinceLastMessage = now - settings.lastMessageTime;
    if (timeSinceLastMessage < ABSOLUTE_MIN_INTERVAL_MS) {
      return false;
    }
  }

  // 用户刚发过消息，不主动打断
  const lastUserMessageAt = getLastUserMessageTime(conversation);
  if (lastUserMessageAt > 0 && now - lastUserMessageAt < USER_RECENT_ACTIVE_MS) {
    return false;
  }
  
  return true;
};

/**
 * 生成下次检查时间（AI自动频控）
 */
const generateNextCheckTime = (
  relationStage: RelationStage,
  lifeState: any | null
): number => {
  const { minMinutes, maxMinutes } = buildAutoIntervalRange({ relationStage, lifeState });
  const randomInterval = Math.floor(
    Math.random() * (maxMinutes - minMinutes + 1) + minMinutes
  );
  return Date.now() + randomInterval * 60 * 1000;
};

/**
 * 生成AI主动消息的prompt
 */
const buildProactiveDecisionPrompt = (conversation: Conversation): string => {
  const bank = getMemoryBank(conversation.id);
  const memories = bank.memories;
  const recentMessages = conversation.messages.slice(-20); // 增加上下文数量
  
  // 🕒 构建带时间信息的对话上下文
  let context = '';
  if (recentMessages.length > 0) {
    context = '\n\n【最近对话记录】\n';
    
    // 找到最后一条用户消息和最后一条AI消息
    const lastUserMsg = [...recentMessages].reverse().find(m => m.role === 'user');
    const lastAIMsg = [...recentMessages].reverse().find(m => m.role === 'assistant');
    
    // 添加时间戳
    recentMessages.forEach(m => {
      const speaker = m.role === 'user' ? '用户' : '你';
      const time = new Date(m.timestamp);
      const timeStr = `${time.getMonth()+1}/${time.getDate()} ${String(time.getHours()).padStart(2,'0')}:${String(time.getMinutes()).padStart(2,'0')}`;
      context += `[${timeStr}] ${speaker}: ${m.content}\n`;
    });
    
    // 🕒 分析时间间隔
    const now = Date.now();
    if (lastAIMsg) {
      const timeSinceLastAI = now - lastAIMsg.timestamp;
      const hoursSince = Math.floor(timeSinceLastAI / (1000 * 60 * 60));
      const minutesSince = Math.floor((timeSinceLastAI % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hoursSince > 0) {
        context += `\n⚠️ 你最后一条消息是${hoursSince}小时${minutesSince}分钟前发的\n`;
      } else if (minutesSince > 30) {
        context += `\n⚠️ 你最后一条消息是${minutesSince}分钟前发的\n`;
      }
    }
    
    if (lastUserMsg) {
      const timeSinceLastUser = now - lastUserMsg.timestamp;
      const hoursSinceUser = Math.floor(timeSinceLastUser / (1000 * 60 * 60));
      const minutesSinceUser = Math.floor((timeSinceLastUser % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hoursSinceUser > 0) {
        context += `⚠️ 用户最后一条消息是${hoursSinceUser}小时${minutesSinceUser}分钟前发的\n`;
      }
    }
  }
  
  let memoryContext = '';
  if (memories.length > 0) {
    memoryContext = '\n\n【记忆】\n' + memories.slice(0, 5).map(m => `- ${m.content}`).join('\n');
  }

  const aiSelfProfile = String(bank.aiSelfProfile?.text || '').trim();
  const userProfile = String(bank.userProfile?.text || '').trim();
  const eventText = (bank.aiEvents || [])
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5)
    .map((e) => `- (${e.day})[${e.status}] ${e.title}：${e.description}`)
    .join('\n');

  const state = (conversation as any).__proactiveLifeState as any;
  const latestLife = state?.lifeLogs?.[0];
  const goalText = Array.isArray(state?.goals)
    ? state.goals
        .filter((g: any) => g?.active)
        .slice(0, 4)
        .map((g: any) => `- ${g.title}(${g.domain}) 进度${g.progress ?? 0}`)
        .join('\n')
    : '';
  const aftereffectText = Array.isArray(state?.aftereffects)
    ? state.aftereffects
        .slice(0, 3)
        .map((a: any) => `- ${a.reason}`)
        .join('\n')
    : '';
  const threadText = Array.isArray(state?.narrativeThreads)
    ? state.narrativeThreads
        .slice()
        .sort((a: any, b: any) => Number(b?.lastUpdatedAt || 0) - Number(a?.lastUpdatedAt || 0))
        .slice(0, 4)
        .map((t: any) => `- [${t.status}] ${t.title}：${t.summary}`)
        .join('\n')
    : '';
  const relationStage = inferRelationStage(conversation);
  
  // 🕒 详细的时间信息
  const currentTime = new Date();
  const year = currentTime.getFullYear();
  const month = currentTime.getMonth() + 1;
  const date = currentTime.getDate();
  const hour = currentTime.getHours();
  const minute = currentTime.getMinutes();
  const weekDay = ['\u5468\u65e5','\u5468\u4e00','\u5468\u4e8c','\u5468\u4e09','\u5468\u56db','\u5468\u4e94','\u5468\u516d'][currentTime.getDay()];
  const timePeriod = hour < 6 ? '\u51cc\u6668' : hour < 9 ? '\u65e9\u4e0a' : hour < 12 ? '\u4e0a\u5348' : hour < 14 ? '\u4e2d\u5348' : hour < 18 ? '\u4e0b\u5348' : hour < 22 ? '\u665a\u4e0a' : '\u6df1\u591c';
  
  const fullTimeContext = `${year}年${month}月${date}日 ${weekDay} ${timePeriod} ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
  
  return `
你是${conversation.characterSettings?.nickname || conversation.name}。

🕒 当前时间: ${fullTimeContext}

🤔 情境分析：
你现在想主动给用户发条消息。但请注意：

⛔ 禁止行为：
- ⛔ 绝对不要只是机械式的打招呼（例如："早！"、"早上好"、"下午好"）
- ⛔ 不要重复相同的内容或模式
- ⛔ 不要忽略之前的对话内容
 - ⛔ 不要输出任何引用/回复模板或来源标记，例如：[回复 …]、【引用 …】、（引用 …）、回复：、引用：、参考资料：、来源：、你说：、User said:、You said:、Quoted:

✅ 应该做的：
1. 判断“现在是否适合主动发消息”
2. 如果适合，给出一个简短的开场方向（不是完整正文）
3. 优先避免打断用户当前对话节奏

${MEDIA_DECISION_GUIDANCE}

📝 示例（好的主动消息）：
- "我刚看到一个好笑的视频，想起了你之前说的..."
- "诶，你上次提到的那个事怎么样了？"
- "今天遇到了一件超离谱的事...（然后分享）"
- "突然想起你上次问的XXX，我发现..."
${context}
${memoryContext}

【「我」对自己的认知（动态）】
${aiSelfProfile || '（无）'}

【「我」对用户的认知（动态）】
${userProfile || '（无）'}

【AI近期事件】
${eventText || '（无）'}

【AI后台生活状态（仅参考，不要机械复述）】
- 最近生活片段：${latestLife ? `${latestLife.day} ${latestLife.actionCategory} ${latestLife.actionLabel}；${latestLife.detail}` : '暂无'}
- 长期目标：
${goalText || '（无）'}
- 事件后效：
${aftereffectText || '（无）'}
- 近期叙事线程：
${threadText || '（无）'}

【关系阶段（系统推断）】
${relationStage === 'ambiguous' ? '暧昧期' : relationStage === 'cold' ? '冷淡期' : '熟人期'}

🎯 现在请只输出严格JSON（不要其它文字）：
{
  "shouldSend": true/false,
  "reason": "一句话原因",
  "starter": "若 shouldSend=true，给一个15字以内开场方向；否则留空",
  "toneHint": "若 shouldSend=true，给语气提示（如：轻松、克制、亲密、礼貌）"
}
`.trim();
};

const buildProactiveMessagePrompt = (conversation: Conversation, starter: string): string => {
  const bank = getMemoryBank(conversation.id);
  const recentMessages = conversation.messages.slice(-20);
  const state = (conversation as any).__proactiveLifeState as any;
  const latestLife = state?.lifeLogs?.[0];
  const threadText = Array.isArray(state?.narrativeThreads)
    ? state.narrativeThreads
        .slice()
        .sort((a: any, b: any) => Number(b?.lastUpdatedAt || 0) - Number(a?.lastUpdatedAt || 0))
        .slice(0, 4)
        .map((t: any) => `- [${t.status}] ${t.title}：${t.summary}`)
        .join('\n')
    : '';
  const context = recentMessages
    .map((m) => `${m.role === 'user' ? '用户' : '你'}: ${m.content}`)
    .join('\n')
    .slice(-3000);
  const currentTime = new Date();
  const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][currentTime.getDay()];
  const fullTimeContext = `${currentTime.getFullYear()}年${currentTime.getMonth() + 1}月${currentTime.getDate()}日 ${weekDay} ${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;

  return `
你是${conversation.characterSettings?.nickname || conversation.name}。
当前时间：${fullTimeContext}
开场方向提示：${starter || '自然衔接最近话题'}

要求：
- 输出一条完整自然的主动消息，像正常聊天回复一样完整，不要半句收尾。
- 保持和角色设定、近期对话一致。
- 可以参考后台生活状态，但不要机械复述数据。
- 只输出消息正文，不要JSON，不要解释，不要前后缀。

${MEDIA_DECISION_GUIDANCE}

【最近对话】
${context || '（无）'}

【记忆摘要】
${(bank.memories || []).slice(0, 5).map((m) => `- ${m.content}`).join('\n') || '（无）'}

【后台生活片段】
${latestLife ? `${latestLife.day} ${latestLife.actionCategory} ${latestLife.actionLabel}；${latestLife.detail}` : '暂无'}

【近期叙事线程】
${threadText || '（无）'}
`.trim();
};

async function loadLifeState(conversationId: string): Promise<any | null> {
  try {
    const all = (await smartLoad('ai_life_sim_states')) as Record<string, any> | null;
    return all?.[conversationId] || null;
  } catch {
    return null;
  }
}

function parseProactiveDecision(raw: string): { shouldSend: boolean; reason: string; starter: string; toneHint: string } | null {
  const text = String(raw || '').trim();
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    return {
      shouldSend: Boolean(obj?.shouldSend),
      reason: String(obj?.reason || '').slice(0, 120),
      starter: String(obj?.starter || '').slice(0, 30),
      toneHint: String(obj?.toneHint || '').slice(0, 20),
    };
  } catch {
    return null;
  }
}

/**
 * 发送AI主动消息
 */
export const sendProactiveMessage = async (
  conversation: Conversation,
  apiConfig: ApiConfig,
  onNewMessage: (conversationId: string, message: Message) => void,
  onUpdateSettings: (conversationId: string, lastMessageTime: number) => void
): Promise<void> => {
  if (isToolInteractionCharacter(conversation.characterSettings)) {
    return;
  }
  const settings = conversation.characterSettings?.proactiveMessaging;
  
  if (!settings || !settings.enabled) {
    return;
  }
  
  try {
    console.log(`🤖 ${conversation.name} 准备主动发送消息...`);
    const lifeState = await loadLifeState(conversation.id);
    const relationStage = inferRelationStage(conversation);
    (conversation as any).__proactiveLifeState = lifeState;
    
    const decisionPrompt = buildProactiveDecisionPrompt(conversation);
    
    // 第1段：是否发送判定（短输出，避免被截断）
    const apiUrl = `${apiConfig.baseUrl}/v1/chat/completions`;
    const decisionMessages = [{ role: 'user', content: decisionPrompt }];
    const decisionRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`,
        'X-Momoyu-Source': 'proactiveMessaging:decision',
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: decisionMessages,
        temperature: 0.5,
        max_tokens: 180,
      })
    });
    
    if (!decisionRes.ok) {
      console.error('AI主动消息生成失败');
      return;
    }
    
    const decisionData = await decisionRes.json();
    const decisionRaw = String(decisionData.choices?.[0]?.message?.content || '').trim();
    const decision = parseProactiveDecision(decisionRaw);
    if (!decision || !decision.shouldSend) {
      const nextCheckTime = generateNextCheckTime(relationStage, lifeState);
      saveState(conversation.id, nextCheckTime);
      console.log(`ℹ️ ${conversation.name} 本轮主动消息跳过: ${decision?.reason || 'decision-skip'}`);
      return;
    }

    // 第2段：生成完整正文（对齐正常回复token量级）
    const starter = [decision.starter, decision.toneHint ? `语气:${decision.toneHint}` : ''].filter(Boolean).join('；');
    const prompt = buildProactiveMessagePrompt(conversation, starter);
    const baseMessages = [{ role: 'user', content: prompt }];
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`,
        'X-Momoyu-Source': 'proactiveMessaging:message',
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: baseMessages,
        temperature: 0.85,
        max_tokens: 2000,
      })
    });
    if (!response.ok) {
      console.error('AI主动消息正文生成失败');
      return;
    }
    const data = await response.json();
    let aiMessage = String(data.choices?.[0]?.message?.content || '').trim();
    const finishReason = String(data.choices?.[0]?.finish_reason || '');

    if (!aiMessage) {
      console.error('未收到AI响应');
      return;
    }

    // 如果首段因token截断，则自动续写一次，避免“半句断掉”
    if (finishReason === 'length') {
      try {
        const continuePrompt =
          `你刚才的主动消息被截断了。请从中断处继续写完，` +
          `保持同一语气和内容，不要重复前文，不要加解释，只输出续写正文。\n\n已生成内容：\n${aiMessage}`;
        const continueRes = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiConfig.apiKey}`,
            'X-Momoyu-Source': 'proactiveMessaging:continue',
          },
          body: JSON.stringify({
            model: apiConfig.modelName,
            messages: [...baseMessages, { role: 'assistant', content: aiMessage }, { role: 'user', content: continuePrompt }],
            temperature: 0.8,
            max_tokens: 1200,
          }),
        });
        if (continueRes.ok) {
          const continueData = await continueRes.json();
          const tail = String(continueData.choices?.[0]?.message?.content || '').trim();
          if (tail) aiMessage = `${aiMessage}\n${tail}`.trim();
        }
      } catch (error) {
        console.warn('主动消息续写失败，保留首段:', error);
      }
    }
    
    // 清洗并拆分为多条单条气泡
    const cleaned = cleanAIMessage(aiMessage);
    const parts = splitMessages(cleaned, {
      preference: conversation.replySplitPreference ?? 'smart',
      conversationType: conversation.type,
      maxBubbles: 3,
      characterProfileText: [
        conversation.characterSettings?.personality,
        conversation.characterSettings?.languageStyle,
        conversation.characterSettings?.systemPrompt,
      ]
        .filter(Boolean)
        .join('\n'),
    });
    const finalParts = parts.length > 0 ? parts : [cleaned];
    
    const baseTime = Date.now();
    finalParts.forEach((content, idx) => {
      const newMessage: Message = {
        id: `msg_${baseTime + idx}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: content,
        timestamp: baseTime + idx,
      };
      onNewMessage(conversation.id, newMessage);
    });
    
    // 更新最后发送时间
    const now = Date.now();
    onUpdateSettings(conversation.id, now);
    
    // 计算下次检查时间
    const nextCheckTime = generateNextCheckTime(relationStage, lifeState);
    saveState(conversation.id, nextCheckTime);
    
    console.log(`✅ ${conversation.name} 主动消息已发送，下次检查时间: ${new Date(nextCheckTime).toLocaleString()} · reason=${decision.reason || 'n/a'}`);
    
  } catch (error) {
    console.error('发送AI主动消息失败:', error);
  } finally {
    try {
      delete (conversation as any).__proactiveLifeState;
    } catch {
      // ignore
    }
  }
};

/**
 * 初始化对话的主动消息状态
 */
export const initProactiveMessaging = (conversation: Conversation): void => {
  if (isToolInteractionCharacter(conversation.characterSettings)) {
    return;
  }
  const settings = conversation.characterSettings?.proactiveMessaging;
  
  if (!settings || !settings.enabled) {
    return;
  }
  
  const states = getAllStates();
  const existing = states.find(s => s.conversationId === conversation.id);
  
  if (!existing) {
    // 设置初始检查时间（AI自动频控）
    const relationStage = inferRelationStage(conversation);
    const nextCheckTime = generateNextCheckTime(relationStage, null);
    saveState(conversation.id, nextCheckTime);
  }
};

/**
 * 清除对话的主动消息状态
 */
export const clearProactiveMessaging = (conversationId: string): void => {
  try {
    const states = getAllStates().filter(s => s.conversationId !== conversationId);
    setCachedData(STORAGE_KEY, states);
    void save(STORAGE_KEY, states);
  } catch (error) {
    console.error('Failed to clear proactive messaging state:', error);
  }
};
