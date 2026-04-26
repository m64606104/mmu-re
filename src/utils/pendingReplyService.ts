/**
 * 全局待回复服务（支持多对话并行）
 * 每个对话独立维护倒计时和 API 调用。
 * 移植自 anywhere 项目，适配 momoyu 项目的类型系统
 */

import { Conversation, Message, ApiConfig, UserProfile } from '../types';
import { buildApiUrl } from './apiHelper';
import { resolveSystemEmoji, isSingleEmojiText } from './systemEmoji';
import {
  getConversationMemories, buildMemoryContext,
  shouldTriggerAutoSummary, updateSummaryCounter,
  buildMemorySummaryPrompt, parseMemorySummaryResponse, addMemory,
} from './memorySystem';
import { splitMessages, cleanAIMessage } from './messageFormatter';
import { MEDIA_DECISION_GUIDANCE } from './mediaDecisionPrompt';

/* ── 内部状态 ── */
interface PendingEntry { timerId: ReturnType<typeof setTimeout>; }

type UpdateConversationFn = (id: string, updates: Partial<Conversation>) => void;
type GetConversationFn = (id: string) => Conversation | undefined;
type GetApiConfigFn = () => ApiConfig;
type GetUserProfileFn = () => UserProfile;

let _updateConversation: UpdateConversationFn;
let _getConversation: GetConversationFn;
let _getApiConfig: GetApiConfigFn;
let _getUserProfile: GetUserProfileFn;

const pendingMap = new Map<string, PendingEntry>();
const generatingSet = new Set<string>();

type ParsedStickerToken = {
  description: string;
  stickerKind: 'systemEmoji' | 'custom';
};

function extractStickerTokens(raw: string): { text: string; stickers: ParsedStickerToken[] } {
  if (!raw) return { text: '', stickers: [] };

  let text = raw;
  const stickers: ParsedStickerToken[] = [];
  const matches = [...raw.matchAll(/\[(表情包|STICKER|系统表情|EMOJI|emoji)[:：]([^\]]+)\]/gi)];
  for (const match of matches) {
    const tag = (match[1] || '').toLowerCase();
    const payload = (match[2] || '').trim();
    const isEmojiTag = tag === 'emoji' || tag === '系统表情';
    const emoji = isEmojiTag ? resolveSystemEmoji(payload) : null;
    const isEmoji = Boolean(emoji || isSingleEmojiText(payload));
    if (isEmoji) {
      // 系统emoji在延迟回复链路也默认内联，避免被强制拆成独立气泡
      text = text.replace(match[0], emoji || payload);
      continue;
    }
    stickers.push({
      description: payload,
      stickerKind: 'custom',
    });
    text = text.replace(match[0], ' ');
  }

  // 仅压缩空格/tab，保留换行语义给 splitMessages 做分条判断
  return { text: text.replace(/[ \t]{2,}/g, ' ').trim(), stickers };
}

/* ── typing 通知 ── */
type TypingListener = (convId: string, typing: boolean) => void;
const typingListeners: TypingListener[] = [];

function notifyTyping(convId: string, typing: boolean) {
  if (typing) generatingSet.add(convId); else generatingSet.delete(convId);
  typingListeners.forEach(fn => fn(convId, typing));
}

export function onTypingChange(fn: TypingListener): () => void {
  typingListeners.push(fn);
  return () => {
    const idx = typingListeners.indexOf(fn);
    if (idx >= 0) typingListeners.splice(idx, 1);
  };
}

export function isGenerating(convId: string): boolean {
  return generatingSet.has(convId);
}

/* ── 初始化 ── */
export function initPendingReplyService(
  updateConversation: UpdateConversationFn,
  getConversation: GetConversationFn,
  getApiConfig: GetApiConfigFn,
  getUserProfile: GetUserProfileFn,
) {
  _updateConversation = updateConversation;
  _getConversation = getConversation;
  _getApiConfig = getApiConfig;
  _getUserProfile = getUserProfile;
}

/* ── 调度 ── */
export function schedulePendingReply(conversationId: string, delaySec: number) {
  const existing = pendingMap.get(conversationId);
  if (existing) clearTimeout(existing.timerId);

  const timerId = setTimeout(() => {
    pendingMap.delete(conversationId);
    triggerReply(conversationId);
  }, delaySec * 1000);

  pendingMap.set(conversationId, { timerId });
}

function toModelMessageContent(m: Message): string {
  let content = m.content;
  if (m.mediaType === 'image') {
    content = m.mediaDescription
      ? `[用户发送了一张图片：${m.mediaDescription}]`
      : '[用户发送了一张图片]';
  }
  if (m.mediaType === 'video') {
    content = m.mediaDescription
      ? `[用户发送了一段视频：${m.mediaDescription}]`
      : '[用户发送了一段视频]';
  }
  if (m.mediaType === 'voice') {
    const durationText = m.voiceDuration ? `（约${m.voiceDuration}秒）` : '';
    content = m.mediaDescription
      ? `[用户发送了一条语音${durationText}：${m.mediaDescription}]`
      : `[用户发送了一条语音${durationText}]`;
  }
  if (m.mediaType === 'sticker') {
    content = m.mediaDescription
      ? `[用户发送了一个表情包：${m.mediaDescription}]`
      : '[用户发送了一个表情包]';
  }
  if (m.mediaItems && m.mediaItems.length > 0) {
    const mediaSummary = m.mediaItems
      .map((item) => {
        if (item.type === 'image') return item.description ? `图片(${item.description})` : '图片';
        if (item.type === 'video') return item.description ? `视频(${item.description})` : '视频';
        if (item.type === 'voice') {
          const durationText = item.duration ? `${item.duration}秒` : '';
          return item.description
            ? `语音${durationText ? `(${durationText})` : ''}(${item.description})`
            : `语音${durationText ? `(${durationText})` : ''}`;
        }
        return item.description ? `表情包(${item.description})` : '表情包';
      })
      .join('，');
    content = `[用户发送了多媒体消息：${mediaSummary}]`;
  }
  if (m.replyTo) {
    const who = m.replyTo.role === 'user' ? '我' : '你';
    content = `[回复 ${who} 说的"${m.replyTo.content.slice(0, 50)}"]\n${content}`;
  }
  return content;
}

/**
 * 将“短时间内连续发送的多条用户消息”打包成一条，减少 token 并更像真人连发。
 * 只影响发给 AI 的内容，不改变聊天记录的显示。
 */
function packRecentUserMessagesForModel(contextMessages: Message[], bufferMs: number): Message[] {
  if (contextMessages.length <= 1) return contextMessages;

  const packed: Message[] = [];
  let i = 0;
  while (i < contextMessages.length) {
    const cur = contextMessages[i];
    if (cur.role !== 'user') {
      packed.push(cur);
      i += 1;
      continue;
    }

    const group: Message[] = [cur];
    let j = i + 1;
    while (j < contextMessages.length) {
      const next = contextMessages[j];
      if (next.role !== 'user') break;

      const prev = contextMessages[j - 1];
      const gap = Math.abs((next.timestamp ?? 0) - (prev.timestamp ?? 0));
      // gap 为 0 说明无时间信息/同一时间戳，此时也认为是连续短消息
      if (gap !== 0 && gap > bufferMs) break;

      group.push(next);
      j += 1;
    }

    if (group.length === 1) {
      packed.push(cur);
    } else {
      const mergedContent = group
        .map(toModelMessageContent)
        .map(s => s.trim())
        .filter(Boolean)
        .join('\n');

      packed.push({
        ...group[group.length - 1],
        // 保持 role=user，仅合并 content；不携带 replyTo，避免语义错乱
        content: mergedContent,
        replyTo: undefined,
      });
    }

    i = j;
  }

  return packed;
}

/* ── 触发回复 ── */
async function triggerReply(conversationId: string) {
  const conversation = _getConversation(conversationId);
  if (!conversation) return;

  const apiConfig = _getApiConfig();
  const userProfile = _getUserProfile();
  if (!apiConfig.baseUrl || !apiConfig.apiKey || !apiConfig.modelName) return;
  if (conversation.messages.length === 0) return;

  notifyTyping(conversationId, true);

  try {
    let systemPrompt = buildSystemPrompt(conversation, userProfile);

    // 🧪 调试：打印延迟回复是否触发 & 最后一条用户消息
    const debugEnabled = (() => {
      try { return localStorage.getItem('momoyu_debug_pending_reply') === '1'; } catch { return false; }
    })();
    const lastUserMsg = [...conversation.messages].reverse().find(m => m.role === 'user');
    if (debugEnabled) {
      console.log('🧪 [延迟回复调试] triggerReply', {
        conversationId,
        lastUser: lastUserMsg ? {
          id: lastUserMsg.id,
          content: lastUserMsg.content,
          mediaType: lastUserMsg.mediaType,
          mediaDescription: lastUserMsg.mediaDescription,
          mediaItems: lastUserMsg.mediaItems?.length || 0,
        } : null,
      });
    }

    // ✅ 对“纯多媒体/表情包”做强制短回复兜底，避免 AI 选择 [SKIP] 造成“像没触发”
    if (lastUserMsg) {
      const normalizedLastContent = (lastUserMsg.content || '').trim();
      const isMediaOnly =
        Boolean(lastUserMsg.mediaType || (lastUserMsg.mediaItems && lastUserMsg.mediaItems.length > 0)) &&
        (
          !normalizedLastContent ||
          /^\[\s*(?:多媒体消息|图片|视频|语音|表情包|img|image|video|voice|sticker)\s*\]$/i.test(normalizedLastContent)
        );
      if (isMediaOnly) {
        systemPrompt += `\n\n【强制回复】用户刚发送了多媒体消息（尤其是表情包/语音/图片/视频）。请至少用一句非常简短的口语回复，\n不要输出 [SKIP]，也不要忽略。除非你判断非常自然，否则不要默认发表情包。`;
      }
    }

    // 🧠 记忆上下文
    if (conversation.enabledFeatures?.includes('memory-system')) {
      const memories = getConversationMemories(conversationId);
      const important = memories.filter(m => m.importance === 'high' || m.importance === 'medium').slice(0, 10);
      if (important.length > 0) systemPrompt += buildMemoryContext(important);
    }

    const bufferMs = (conversation.messageBufferSeconds ?? 15) * 1000;
    const contextMessages = packRecentUserMessagesForModel(conversation.messages.slice(-40), bufferMs);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...contextMessages.map(m => {
        return { role: m.role, content: toModelMessageContent(m) };
      }),
    ];

    const apiUrl = buildApiUrl(apiConfig);
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiConfig.apiKey}` },
      body: JSON.stringify({ model: apiConfig.modelName, messages, temperature: 0.7, max_tokens: 2000 }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const aiContent = data.choices?.[0]?.message?.content?.trim();
    if (!aiContent || aiContent === '[SKIP]' || aiContent === '[不回复]') {
      if (debugEnabled) console.log('🧪 [延迟回复调试] skipped', { aiContent });
      notifyTyping(conversationId, false);
      return;
    }

    // 🚀 智能分割：先完整产出，再按语境决定是否拆分
    const lastUserMessage = [...conversation.messages]
      .reverse()
      .find(msg => msg.role === 'user')?.content;
    const characterProfileText = [
      conversation.characterSettings?.personality,
      conversation.characterSettings?.languageStyle,
      conversation.characterSettings?.systemPrompt,
    ]
      .filter(Boolean)
      .join('\n');
    const parts = splitMessages(aiContent, {
      preference: conversation.replySplitPreference ?? 'smart',
      conversationType: conversation.type,
      lastUserMessage,
      maxBubbles: 4,
      characterProfileText,
    });

    let freshConv = _getConversation(conversationId);
    if (!freshConv) { notifyTyping(conversationId, false); return; }
    let currentMsgs = [...freshConv.messages];

    for (let i = 0; i < parts.length; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 600 + Math.random() * 800));
      freshConv = _getConversation(conversationId);
      if (freshConv) currentMsgs = [...freshConv.messages];

      const nowTs = Date.now();
      const parsed = extractStickerTokens(parts[i]);
      const nextMessages: Message[] = [];
      if (parsed.text) {
        nextMessages.push({
          id: `ai_${nowTs}_${i}_${Math.random()}`,
          role: 'assistant',
          content: parsed.text,
          timestamp: nowTs,
        });
      }
      parsed.stickers.forEach((sticker, idx) => {
        nextMessages.push({
          id: `ai_${nowTs}_${i}_sticker_${idx}_${Math.random()}`,
          role: 'assistant',
          content: '[表情包]',
          timestamp: nowTs + idx + 1,
          mediaType: 'sticker',
          mediaDescription: sticker.description,
          stickerKind: sticker.stickerKind,
          isMediaDescriptionOnly: true,
        });
      });
      if (nextMessages.length === 0) {
        nextMessages.push({
          id: `ai_${nowTs}_${i}_${Math.random()}`,
          role: 'assistant',
          content: parts[i],
          timestamp: nowTs,
        });
      }

      currentMsgs = [...currentMsgs, ...nextMessages];
      _updateConversation(conversationId, { messages: currentMsgs, lastMessageTime: Date.now() });
    }

    notifyTyping(conversationId, false);

    // 🧠 记忆总结
    if (conversation.enabledFeatures?.includes('memory-system')) {
      const freshConv2 = _getConversation(conversationId);
      if (freshConv2 && shouldTriggerAutoSummary(conversationId, freshConv2.messages.length)) {
        performMemorySummary(conversationId, freshConv2.messages, apiConfig).catch((e: unknown) =>
          console.error('[memory] 总结失败:', e)
        );
      }
    }
  } catch (err: unknown) {
    console.error('[pendingReply] AI回复失败:', err);
    const freshConv = _getConversation(conversationId);
    if (freshConv) {
      _updateConversation(conversationId, {
        messages: [...freshConv.messages, {
          id: `err_${Date.now()}`,
          role: 'system',
          content: `AI回复失败：${err instanceof Error ? err.message : '未知错误'}`,
          timestamp: Date.now(),
        }],
      });
    }
    notifyTyping(conversationId, false);
  }
}

/* ── 构建 system prompt ── */
function buildSystemPrompt(conversation: Conversation, userProfile: UserProfile): string {
  const cs = conversation.characterSettings;
  if (!cs) return '你是一个人。';

  let prompt = '';
  if (cs.systemPrompt) prompt += cs.systemPrompt + '\n';
  prompt += `\n你的名字是"${cs.nickname}"。`;
  if (cs.personality) prompt += `\n性格特征：${cs.personality}`;
  if (cs.languageStyle) prompt += `\n语言风格：${cs.languageStyle}`;
  if (cs.languageExample) prompt += `\n语言示例：${cs.languageExample}`;
  if (cs.memoryEvents) prompt += `\n记忆事件：${cs.memoryEvents}`;

  const info = userProfile.personalInfo;
  if (info) {
    const parts: string[] = [];
    if (info.name) parts.push(`称呼：${info.name}`);
    if (info.gender) parts.push(`性别：${info.gender}`);
    if (info.age) parts.push(`年龄：${info.age}`);
    if (info.background) parts.push(`背景：${info.background}`);
    if (parts.length > 0) prompt += `\n\n【对话用户信息】：${parts.join('、')}`;
  }

  if (cs.knowledgeBase && cs.knowledgeBase.length > 0) {
    prompt += '\n\n【专属资料库】\n';
    cs.knowledgeBase.forEach((item, i) => { prompt += `${i + 1}. ${item.title}\n${item.content}\n\n`; });
  }

  // 时间 + 农历
  const now = new Date();
  const solarTime = now.toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false });
  let lunarDate = '';
  try { lunarDate = now.toLocaleString('zh-CN-u-ca-chinese', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { /* 环境不支持 */ }

  prompt += `

【当前时间】${solarTime}${lunarDate ? `（农历${lunarDate}）` : ''}
请根据当前时间自然调整你的状态和语气。

【💬 微信聊天核心原则 — 最重要】

你在用微信和朋友聊天，不是写作文、不是客服、不是面试。

1. **回复长度自然不固定**
   - 有时一个字："哈""嗯""好"
   - 有时一句话："今天累死了"
   - 有时几句连发（直接自然断句即可，不要输出任何拆分控制标记）
   - 只有真正想说的时候才打很多字

2. **回复频率和节奏**
   - 不是每条消息都需要回复
   - 可以选择性忽略（输出 [SKIP]）
   - 不要总是追问、不要总是回应

3. **禁止客服式回复**
   - ❌ "好的，我明白了！那我来…"
   - ❌ "没问题！我这就…"
   - ❌ 每次都热情洋溢地回应
   - ✅ 像真人一样有情绪波动

4. **语气自然**
   - 可以用语气词：哈、嗯、啊、呢、吧、噢、欸
   - 可以用网络用语
   - 不要过度使用标点符号
   - 不要每句话都加感叹号

【表达规范】
- ❌ 禁止用斜杠/表示"或"（如"地铁/公交"）
- ✅ 用"和""或""还是"等自然连接词
- ❌ 禁止使用括号描述动作（如（笑着说）、*点头*）

🚫 **绝对禁止**：
- 不要输出分析性内容（如"The user's message indicates..."）
- 不要说出思考过程
- 不要进行心理分析
- 不要使用英文分析
- 不要输出"内部独白"

【⚙️ 输出格式规则 — 严格遵守】

所有特殊内容必须使用方括号标记，格式错误会导致内容丢失：

RULE-1 消息拆条：
  直接输出自然文本，系统会自动按语义拆成多条气泡。
  ✅ "哈哈哈 你怎么才来 我等半天了"

RULE-2 图片：[IMG:描述]
  ✅ "看这个[IMG:今天拍的日落]"

RULE-3 视频：[VID:描述]
  ✅ "[VID:猫咪在玩球]"

RULE-4 语音：[VOICE:台词内容:秒数]
  ✅ "[VOICE:我今天特别开心啊哈哈:5]"

RULE-5 表情包：[STICKER:描述]
  ✅ "[STICKER:一只快乐摇尾巴的柴犬]"
  使用约束：
  - 默认优先文字，只有确实更贴切时才发
  - 不要在相邻两条回复都发 STICKER
  - 单条回复最多一个 STICKER

RULE-5.1 系统emoji表情：[EMOJI:关键词或emoji]
  ✅ "[EMOJI:微笑]"
  ✅ "[EMOJI:😂]"
  使用约束：
  - EMOJI 与 STICKER 二选一，避免同条混用
  - 如果刚发过 EMOJI/STICKER，下一条优先纯文字

${MEDIA_DECISION_GUIDANCE}

RULE-6 不回复：[SKIP]
  当你选择不回复这条消息时输出 [SKIP]

以上标记可自由组合：
✅ "今天去爬山了[IMG:山顶风景] 累死 [STICKER:瘫倒的猫]"`;

  return prompt;
}

/* ── 记忆自动总结 ── */
async function performMemorySummary(conversationId: string, messages: Message[], apiConfig: ApiConfig) {
  const existing = getConversationMemories(conversationId);
  const summaryPrompt = buildMemorySummaryPrompt(messages, existing);

  const apiUrl = buildApiUrl(apiConfig);
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiConfig.apiKey}` },
    body: JSON.stringify({
      model: apiConfig.modelName,
      messages: [{ role: 'system', content: summaryPrompt }],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!res.ok) return;
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return;

  const newMemories = parseMemorySummaryResponse(content);
  newMemories.forEach(m => addMemory(conversationId, m.content, m.importance, m.category, true));
  updateSummaryCounter(conversationId, messages.length);
}
