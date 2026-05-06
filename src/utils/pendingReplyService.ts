/**
 * 全局待回复服务（多会话互不干扰）
 *
 * 私聊（唯一使用输入框门闩的路径）：文字 / 图 / 视频 / 文件 / 语音 / 表情包 发送后规则相同——
 * 只要输入框仍聚焦，或输入框里还有字（草稿），就绝不生成回复；
 * 这两种情况都没有了以后，再连续空窗满本会话的 privateComposerQuietSeconds（默认 3）秒，然后生成回复。
 * 若在倒计时过程中又重新聚焦或打出字，计时清零，重新等松开后再计。
 * 用户很快连发多条时，每条都会打断上一轮等待，只在「最后一次发送后的松开 + 3 秒」时生成一次。
 *
 * 群聊（仅此路径使用 messageBufferSeconds，默认 15）：用户每发一条都会调度一次；内部用 pendingReplyGeneration 作废上一轮睡眠，
 * 只在「最后一次调度后再连续等待满 buffer 秒」且期间没有更新的调度时，才调用 onGroupChatRound 生成一轮（连发 = 永远从最新一条重新等满）。
 *
 * 说明：私聊不走「固定 sleep(delaySec)」，delaySec 参数在私聊分支会被忽略；私聊只看输入框门闩 + privateComposerQuietSeconds。
 */

import { Conversation, Message, ApiConfig, UserProfile } from '../types';
import { buildApiUrl } from './apiHelper';
import { resolvePrivateChatApiConfig } from './chatApiConfig';
import { resolveSystemEmoji, isSingleEmojiText } from './systemEmoji';
import {
  validateAssistantOutput,
  buildProtocolRetryInstruction,
  isValidDocumentJsonOutput,
  buildDocumentJsonRetryInstruction,
} from '../domains/chat/outputProtocol';
import { enqueueMemoryEngineCycle, buildMemoryAndIdentityContext } from './memorySystem';
import { splitMessages, cleanAIMessage } from './messageFormatter';
import { MEDIA_DECISION_GUIDANCE } from './mediaDecisionPrompt';
import { generateDocxOriginalFile } from './documentFileGenerator';
import { buildLifeChatContextSnippet } from '../sim/chatContext';
import { applyUserChatImpact } from '../sim/storage';
import { retrieveKnowledgeChunks, retrieveTextChunks } from './knowledgeRetrieval';
import { smartLoad } from './storage';
import { getErrorFromResponse } from './apiErrorHandler';
import { findStickerByDescription } from './stickerMessageParser';
import { isToolInteractionCharacter } from './characterInteractionMode';
import { getCharacterOnlineHandle, getCharacterRealName, stripOnlineHandleChangeMarkers } from './characterIdentity';
import {
  buildTimeAwarePrompt,
  formatBubbleTimePrefixForModel,
  hasActionKeywords,
  type UnrepliedMessageInfo,
} from './timeAwareness';

/* ── 内部状态 ── */
type UpdateConversationFn = (id: string, updates: Partial<Conversation>) => void;
type GetConversationFn = (id: string) => Conversation | undefined;
type GetApiConfigFn = () => ApiConfig;
type GetUserProfileFn = () => UserProfile;

let _updateConversation: UpdateConversationFn;
let _getConversation: GetConversationFn;
let _getApiConfig: GetApiConfigFn;
let _getUserProfile: GetUserProfileFn;
/** 群聊：缓冲计时结束后由 ChatScreen 拉起多 AI 一轮 */
let _onGroupChatRound: ((conversationId: string) => void) | undefined;
/** 私聊：模型输出 [SKIP]/[不回复] 时由 UI 生成一条情境化系统提示 */
let _onPrivateAiSkippedReply: ((conversationId: string) => void) | undefined;

const SLEEP_HOLD_HINTS = [
  '屏幕那头很安静——多半还在睡。你再戳两下试试？',
  '嗯…这条大概只会轻轻落在枕边，多发几条也许会好一点。',
  '「消息已送达，但对方在梦里冲浪」。',
  '深夜勿扰模式：在睡觉。',
  '💤睡着了，没看到消息',
  '「【自动回复】啊啊啊我在睡觉呢，不要叫醒我」。',
  '我好困，睡着了，有什么事情明天再说吧！',
  'ZZZzzzzz；',
  '正在美梦中',
  '此刻 TA 那边大概是勿扰 + 翻身继续睡；要不要试着多发几条当叫醒服务？',
  '消息进了黑洞一样的夜晚——多半还在梦里。',
  '对方还没醒',
  '像是在喊一个抱着被子的人——如果你真的要叫ta的话',
];

function pickSleepHoldHint(): string {
  return SLEEP_HOLD_HINTS[Math.floor(Math.random() * SLEEP_HOLD_HINTS.length)];
}

/** 同一会话又发了新消息时 +1，上一轮等待作废，只保留「最新这一轮」的回复时机 */
const pendingReplyGeneration = new Map<string, number>();
const generatingSet = new Set<string>();

/** 输入框占用：正在聚焦或有草稿时暂停触发 AI 生成，避免与用户抢节奏 */
let _composerBlocksReply: ((conversationId: string) => boolean) | undefined;

const DEFAULT_PRIVATE_COMPOSER_QUIET_SEC = 3;
const COMPOSER_POLL_MS = 220;

function resolvePrivateComposerQuietDelayMs(conversationId: string): number {
  const conv = _getConversation(conversationId);
  const raw = conv?.privateComposerQuietSeconds;
  const sec = raw === undefined || raw === null ? DEFAULT_PRIVATE_COMPOSER_QUIET_SEC : Number(raw);
  if (!Number.isFinite(sec)) return DEFAULT_PRIVATE_COMPOSER_QUIET_SEC * 1000;
  return Math.round(Math.max(1, Math.min(120, sec)) * 1000);
}

/** 防止并发触发同一会话的延迟回复（刷新/连点等极端情况下的双回复） */
const triggerReplyLocks = new Set<string>();

export function setPendingReplyComposerGate(fn: ((conversationId: string) => boolean) | undefined) {
  _composerBlocksReply = fn;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 私聊专用：门闩为 true = 输入框占着（聚焦或有草稿）。占着就等；不占则累加「干净窗口」，
 * 满 resolvePrivateComposerQuietDelayMs 则生成；未满若又占上则清零重算。
 */
async function runPrivateReplySchedule(conversationId: string, isStillCurrent: () => boolean): Promise<void> {
  const gate = _composerBlocksReply;
  if (!gate) {
    await sleep(resolvePrivateComposerQuietDelayMs(conversationId));
    if (isStillCurrent()) await triggerReply(conversationId);
    return;
  }

  while (isStillCurrent()) {
    while (gate(conversationId) && isStillCurrent()) {
      await sleep(COMPOSER_POLL_MS);
    }
    if (!isStillCurrent()) return;

    const quietMs = resolvePrivateComposerQuietDelayMs(conversationId);
    let clearMs = 0;
    while (clearMs < quietMs && isStillCurrent()) {
      await sleep(COMPOSER_POLL_MS);
      if (gate(conversationId)) {
        clearMs = 0;
        break;
      }
      clearMs += COMPOSER_POLL_MS;
    }

    if (clearMs >= quietMs && isStillCurrent()) {
      await triggerReply(conversationId);
      return;
    }
  }
}

type ParsedStickerToken = {
  description: string;
  stickerKind: 'systemEmoji' | 'custom';
  imageUrl?: string;
};

async function extractStickerTokens(
  raw: string,
  conversationId: string
): Promise<{ text: string; stickers: ParsedStickerToken[] }> {
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
    let imageUrl: string | undefined;
    try {
      // 与 momoyu-demo 行为对齐：优先把 [表情包:描述] 映射为真实图片
      imageUrl = (await findStickerByDescription(payload, conversationId)) || undefined;
    } catch {
      imageUrl = undefined;
    }
    stickers.push({
      description: payload,
      stickerKind: 'custom',
      imageUrl,
    });
    text = text.replace(match[0], ' ');
  }

  // 仅压缩空格/tab，保留换行语义给 splitMessages 做分条判断
  return { text: text.replace(/[ \t]{2,}/g, ' ').trim(), stickers };
}

function stripAvatarActionMarkers(raw: string): {
  text: string;
  hasAvatarChange: boolean;
  hasRestoreAvatar: boolean;
  selectedImageIndex?: number;
} {
  const indexedMatch = raw.match(/\[换头像[:：]\s*(\d+)\s*\]/);
  const selectedImageIndex = indexedMatch ? Number(indexedMatch[1]) : undefined;
  const hasAvatarChange = /\[换头像\]|\[换头像[:：]\s*\d+\s*\]|【换头像】/.test(raw);
  const hasRestoreAvatar = /\[换回原头像\]|【换回原头像】/.test(raw);
  const text = raw
    .replace(/\[换头像\]|\[换头像[:：]\s*\d+\s*\]|【换头像】/g, '')
    .replace(/\[换回原头像\]|【换回原头像】/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  return { text, hasAvatarChange, hasRestoreAvatar, selectedImageIndex };
}

function pickLatestUserImageFromConversation(conversation: Conversation): string | null {
  for (let i = conversation.messages.length - 1; i >= 0; i--) {
    const msg = conversation.messages[i];
    if (msg.role === 'user' && msg.mediaType === 'image' && msg.mediaUrl) return msg.mediaUrl;
  }
  return null;
}

function listRecentUserImagesFromConversation(
  conversation: Conversation,
  limit = 6
): Array<{ url: string; label: string }> {
  const result: Array<{ url: string; label: string }> = [];
  const seen = new Set<string>();
  for (let i = conversation.messages.length - 1; i >= 0; i--) {
    const msg = conversation.messages[i];
    if (msg.role !== 'user' || msg.mediaType !== 'image' || !msg.mediaUrl) continue;
    if (seen.has(msg.mediaUrl)) continue;
    seen.add(msg.mediaUrl);
    result.push({
      url: msg.mediaUrl,
      label: msg.mediaDescription?.trim() || `图片${result.length + 1}`,
    });
    if (result.length >= limit) break;
  }
  // 变成时间正序：1=最早，N=最新
  return result.reverse();
}

/* ── typing 通知 ── */
type TypingListener = (convId: string, typing: boolean) => void;
const typingListeners: TypingListener[] = [];

function isDocumentGenerationIntent(text: string): boolean {
  const t = (text || '').trim();
  if (!t) return false;
  if (/^(文档|写文档|生成文档|做文档|来个文档)$/i.test(t)) return true;
  const hasDocKeyword = /(文档|报告|方案|合同|计划书|申请书|总结|通知|公文|说明书)/.test(t);
  const hasGenerationVerb = /(生成|写|起草|整理|做一份|出一份|帮我做|来一份|给我一份|做个|来个)/.test(t);
  return hasDocKeyword && hasGenerationVerb;
}

function looksLikeDocumentAttemptOutput(text: string): boolean {
  const t = (text || '').trim();
  if (!t) return false;
  if (/\[DOC[:：]/i.test(t)) return true;
  if (/发送了文档|生成了文档|文档如下|附件如下|报告如下/.test(t)) return true;
  if (/^\s*《[^》]{2,}》\s*$/.test(t)) return true;
  // 常见公文首部字段，出现多个时基本可判定为“在发文档正文”
  const signals = ['签发日期', '文件编号', '呈报人', '事由', '特此说明', '特此报告'];
  const hitCount = signals.reduce((count, s) => count + (t.includes(s) ? 1 : 0), 0);
  return hitCount >= 2;
}

type ParsedDocumentPayload = {
  title: string;
  type: 'text' | 'markdown' | 'code';
  greeting?: string;
  content: string;
};

function parseDocumentJsonPayload(content: string): ParsedDocumentPayload | null {
  const text = (content || '').trim();
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  try {
    const parsed = JSON.parse(candidate);
    if (!parsed || typeof parsed !== 'object') return null;
    const doc = (parsed as any).document && typeof (parsed as any).document === 'object'
      ? (parsed as any).document
      : parsed;
    const title = typeof doc.title === 'string' ? doc.title.trim() : '';
    const body = typeof doc.content === 'string' ? doc.content.trim() : '';
    if (!title || !body) return null;
    const type = doc.type === 'markdown' ? 'markdown' : doc.type === 'code' ? 'code' : 'text';
    return {
      title,
      type,
      greeting: typeof doc.greeting === 'string' ? doc.greeting.trim() : undefined,
      content: body,
    };
  } catch {
    return null;
  }
}

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
  opts?: {
    onGroupChatRound?: (conversationId: string) => void;
    onPrivateAiSkippedReply?: (conversationId: string) => void;
  },
) {
  _updateConversation = updateConversation;
  _getConversation = getConversation;
  _getApiConfig = getApiConfig;
  _getUserProfile = getUserProfile;
  _onGroupChatRound = opts?.onGroupChatRound;
  _onPrivateAiSkippedReply = opts?.onPrivateAiSkippedReply;
}

/* ── 调度 ── */
/**
 * @param delaySec 仅对群聊生效：messageBufferSeconds（默认 15）。私聊分支忽略此值，改用输入框门闩 + privateComposerQuietSeconds。
 */
export function schedulePendingReply(conversationId: string, delaySec: number) {
  const conv = _getConversation(conversationId);
  const nextGen = (pendingReplyGeneration.get(conversationId) || 0) + 1;
  pendingReplyGeneration.set(conversationId, nextGen);
  const myGen = nextGen;
  const isStillCurrent = () => pendingReplyGeneration.get(conversationId) === myGen;

  void (async () => {
    if (!conv || conv.type === 'private') {
      await runPrivateReplySchedule(conversationId, isStillCurrent);
      return;
    }

    if (conv.type === 'group') {
      const bufferMs = Math.max(0, delaySec) * 1000;
      if (bufferMs > 0) {
        await sleep(bufferMs);
        if (!isStillCurrent()) return;
      }
      _onGroupChatRound?.(conversationId);
      return;
    }

    const bufferMs = Math.max(0, delaySec) * 1000;
    if (bufferMs > 0) {
      await sleep(bufferMs);
      if (!isStillCurrent()) return;
    }
    await triggerReply(conversationId);
  })();
}

function toModelMessageContent(m: Message): string {
  let content = m.content;
  if ((m as any).document) {
    const doc = (m as any).document as {
      title: string;
      type?: 'text' | 'markdown' | 'code';
      content: string;
      greeting?: string;
      originalFile?: { fileName: string; mimeType: string; fileSize: number };
    };
    const typeLabel = doc.type === 'markdown' ? 'Markdown' : doc.type === 'code' ? '代码' : '文本';
    const originalFileInfo = doc.originalFile
      ? `\n原始文件：${doc.originalFile.fileName} (${doc.originalFile.mimeType}, ${(doc.originalFile.fileSize / 1024).toFixed(1)}KB)`
      : '';
    // 避免极端超长导致请求失败：超出部分明确告知模型“有截断”
    const rawBody = typeof doc.content === 'string' ? doc.content : '';
    const MAX_DOC_CHARS_FOR_CONTEXT = 20000;
    const body = rawBody.length > MAX_DOC_CHARS_FOR_CONTEXT
      ? `${rawBody.slice(0, MAX_DOC_CHARS_FOR_CONTEXT)}\n\n（内容过长，已截断。若需要后续部分，请提示用户继续发送或分段。）`
      : rawBody;
    content = `[用户发送了${typeLabel}文档]\n标题：${doc.title || '未命名'}${originalFileInfo}\n内容：\n${body}`;
  }
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
  const effectiveApiConfig = resolvePrivateChatApiConfig(apiConfig, conversation);
  if (!apiConfig.baseUrl || !apiConfig.apiKey || !effectiveApiConfig.modelName?.trim()) return;
  if (conversation.messages.length === 0) return;

  if (triggerReplyLocks.has(conversationId) || generatingSet.has(conversationId)) {
    return;
  }
  triggerReplyLocks.add(conversationId);

  notifyTyping(conversationId, true);

  try {
    const toolPrivate =
      conversation.type === 'private' && isToolInteractionCharacter(conversation.characterSettings);

    const recentUserMessages = [...conversation.messages]
      .filter((m) => m.role === 'user')
      .filter((m) => Date.now() - Number(m.timestamp || 0) <= 3 * 60 * 1000);

    let chatImpact: {
      wasSleeping: boolean;
      wokeUp: boolean;
      wakeThreshold: number;
      wakeMode: 'auto' | 'light' | 'normal' | 'deep';
    } = { wasSleeping: false, wokeUp: false, wakeThreshold: 0, wakeMode: 'auto' };

    if (!toolPrivate) {
      chatImpact = await applyUserChatImpact({
        conversationId,
        now: Date.now(),
        recentUserMessageCount: recentUserMessages.length,
        wakeSensitivityMode: conversation.characterSettings?.proactiveMessaging?.wakeSensitivityMode || 'auto',
      });
    }
    // 睡眠联动：消息条数未达叫醒阈值时继续睡，不立即回复（给用户可见提示）
    if (chatImpact.wasSleeping && !chatImpact.wokeUp) {
      notifyTyping(conversationId, false);
      const fresh = _getConversation(conversationId);
      if (fresh?.type === 'private') {
        const last = fresh.messages[fresh.messages.length - 1];
        const now = Date.now();
        const skipDup =
          last?.role === 'system' &&
          typeof last.id === 'string' &&
          last.id.startsWith('sys_sleep_hold_') &&
          now - Number(last.timestamp || 0) < 14_000;
        if (!skipDup) {
          _updateConversation(conversationId, {
            messages: [
              ...fresh.messages,
              {
                id: `sys_sleep_hold_${now}_${Math.random().toString(36).slice(2, 8)}`,
                role: 'system',
                content: pickSleepHoldHint(),
                timestamp: now,
              },
            ],
            lastMessageTime: now,
          });
        }
      }
      return;
    }

    const lastUserMsg = [...conversation.messages].reverse().find(m => m.role === 'user');
    const ragDebugEnabled = (() => {
      try {
        if (localStorage.getItem('momoyu_debug_rag_hit') === '1') return true;
        const q = new URLSearchParams(window.location.search);
        return q.get('ragDebug') === '1';
      } catch {
        return false;
      }
    })();
    const ragDebugLines: string[] = [];

    const promptBuilt = buildSystemPrompt(conversation, userProfile, lastUserMsg?.content || '', ragDebugEnabled);
    let systemPrompt = promptBuilt.prompt;
    if (ragDebugEnabled && promptBuilt.debugLines.length > 0) {
      ragDebugLines.push(...promptBuilt.debugLines);
    }

    // 📚 文档库（document_library）检索：把用户上传/保存过的文档按问题检索后注入
    if (lastUserMsg?.content) {
      try {
        const parsed = await smartLoad('document_library');
        const docsRaw: any[] = Array.isArray(parsed)
          ? parsed
          : parsed && typeof parsed === 'object'
            ? ((parsed as any).docs || (parsed as any).documents || (parsed as any).items || [])
            : [];

        const cs = conversation.characterSettings;
        const nick = cs?.nickname || '';

        const docs = (docsRaw || [])
          .filter(Boolean)
          .filter((d) => {
            // 优先与当前会话/角色相关；未绑定的也允许参与（全局文档）
            const convOk = !d.conversationId || d.conversationId === conversation.id;
            const charOk = !d.characterName || !nick || d.characterName === nick;
            return convOk && charOk;
          })
          .slice(0, 120);

        const hits = retrieveTextChunks(
          docs.map((d) => ({
            id: String(d.id || d.savedAt || Math.random()),
            title: String(d.title || '未命名文档'),
            content: String(d.content || ''),
          })),
          lastUserMsg.content,
          { topK: 5, maxTotalChars: 2600 }
        );

        if (hits.length > 0) {
          systemPrompt += '\n\n【文档库（已检索）】\n';
          hits.forEach((h, i) => {
            systemPrompt += `${i + 1}. ${h.title}\n${h.text}\n\n`;
          });
          if (ragDebugEnabled) {
            ragDebugLines.push(
              `文档库命中 ${hits.length} 条：`,
              ...hits.map((h, i) => `${i + 1}. ${h.title} ｜ ${(h.text || '').slice(0, 80).replace(/\n/g, ' ')}...`)
            );
          }
        } else if (ragDebugEnabled && docs.length > 0) {
          ragDebugLines.push(`文档库未命中（候选 ${docs.length} 条）`);
        }
      } catch {
        // ignore
      }
    }

    if (ragDebugEnabled && ragDebugLines.length > 0) {
      const fresh = _getConversation(conversationId);
      if (fresh) {
        _updateConversation(conversationId, {
          messages: [
            ...fresh.messages,
            {
              id: `rag_dbg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              role: 'system',
              content: `🧪 RAG命中调试\n${ragDebugLines.join('\n')}`,
              timestamp: Date.now(),
            },
          ],
          lastMessageTime: Date.now(),
        });
      }
    }

    // 🧪 调试：打印延迟回复是否触发 & 最后一条用户消息
    const debugEnabled = (() => {
      try { return localStorage.getItem('momoyu_debug_pending_reply') === '1'; } catch { return false; }
    })();
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
        systemPrompt += toolPrivate
          ? `\n\n【强制回复】用户发送了图片/语音/视频/表情包等多媒体。请用**一句简短、中性**的话确认已收到或说明能否处理（不要撒娇、不要玩梗），不要输出 [SKIP]。`
          : `\n\n【强制回复】用户刚发送了多媒体消息（尤其是表情包/语音/图片/视频）。请至少用一句非常简短的口语回复，\n不要输出 [SKIP]，也不要忽略。除非你判断非常自然，否则不要默认发表情包。`;
      }
    }

    const requireDocumentJson = Boolean(lastUserMsg && isDocumentGenerationIntent(lastUserMsg.content || ''));
    if (requireDocumentJson) {
      systemPrompt += `\n\n【强制文档协议】
用户当前是在请求“生成文档”。
你必须只输出一个 JSON 对象，格式如下：
{
  "document": {
    "title": "文档标题",
    "type": "text",
    "greeting": "请查收",
    "content": "完整正文"
  }
}
禁止输出任何自然语言前后缀、禁止输出 [DOC:...]、禁止分条。`;
    }

    // 🧠 记忆 + 动态画像 + AI事件上下文（高优先级覆盖初始人设）
    if (conversation.enabledFeatures?.includes('memory-system')) {
      systemPrompt += buildMemoryAndIdentityContext(conversationId);
    }

    // 🌱 AI后台生活轨迹（工具型角色不使用）
    if (!toolPrivate) {
      try {
        systemPrompt += await buildLifeChatContextSnippet({
          conversation,
          lastUserMessage: lastUserMsg,
        });
      } catch {
        // ignore life context failures, must not block replies
      }
      systemPrompt += `\n【创造性与连贯性平衡】
- 你的后台生活轨迹是“根基”，不是“牢笼”。
- 允许在真实基础上做有趣延伸：联想、愿望、轻幽默、对未来的小展望。
- 避免机械复述状态数据；优先用“人话”表达感受与故事性。`;
    }
    if (!toolPrivate && chatImpact.wasSleeping && chatImpact.wokeUp) {
      systemPrompt += `\n- 你刚被用户消息叫醒（阈值${chatImpact.wakeThreshold}条，模式${chatImpact.wakeMode}），回复时请自然体现“刚醒来”的状态（可简短、带点困意），但仍要正常回应用户内容。`;
    }
    if (conversation.type === 'private') {
      systemPrompt += `\n\n【头像变更协议（只在相关时使用）】
- 当用户请求你把头像换成他发的图片，并且你同意执行时：
  - 若用户近期只发了一张图，回复末尾附加 [换头像]
  - 若用户近期发了多张图且你能明确选择，请附加 [换头像:N]（N 从 1 开始，按用户发送顺序）
- 当用户请求恢复原头像，并且你同意执行时，请在回复末尾附加 [换回原头像]。
- 普通聊天不要输出这些标记。

【网名同步（与换头像同属「尾部静默标记」，少用）】
- 对外网名由你自己说了算：和用户聊到改名时，可以打趣、可以推拉；正常商量，你也可以不采纳对方的提议。你自己想换个昵称时，若语境合适可以随口提起，不必强行解释；也可以完全不提，不强制。
- **静默改名**：若你只想更新资料/名片里的网名、**不想在字面上向任何人交代**，可以**仅输出** \`[改网名:新网名]\`（整条只有这一句也可以）；该片段会像 \`[换头像]\` 一样从气泡里剥掉，对方看不到，相当于只在后台改名。也可以照常先聊天，再在**本条整条回复的最末尾**紧贴接上同一标记。
- 网名长度约 2～24 字。**禁止**提到「隐藏标记」「协议」「系统更新」「按格式输出」等破坏沉浸的说法。
- 没有真想改网名时：**不要**输出 \`[改网名:…]\`。`;
    }

    // 陪伴型私聊：注入完整时间感知（与 ChatScreen 主链路一致），避免跨日仍当「同一晚」、隔数日仍追问「去上班了吗」等
    if (conversation.type === 'private' && !toolPrivate && lastUserMsg) {
      const ta = collectPrivateTimeAwareParams(conversation);
      const lastCall =
        conversation.callHistory && conversation.callHistory.length > 0
          ? conversation.callHistory[conversation.callHistory.length - 1]
          : undefined;
      const luTs = ta.lastUserTs || Number(lastUserMsg.timestamp || 0) || undefined;
      const luContent = ta.lastUserContent ?? lastUserMsg.content;
      systemPrompt += buildTimeAwarePrompt(
        luTs,
        luContent,
        ta.lastAITs,
        ta.oldestUnreplied,
        ta.unreplied.length > 0 ? ta.unreplied : undefined,
        ta.actionContent,
        ta.actionTs,
        lastCall?.endTime,
        lastCall?.type,
      );
    }

    const bufferMs = (conversation.messageBufferSeconds ?? 15) * 1000;
    const contextMessages = packRecentUserMessagesForModel(conversation.messages.slice(-40), bufferMs);
    const maxTokens = requireDocumentJson ? 8000 : 2000;
    const messages = [
      { role: 'system', content: systemPrompt },
      ...contextMessages.map(m => {
        let content = toModelMessageContent(m);
        if (conversation.type === 'private' && m.role === 'user') {
          content = formatBubbleTimePrefixForModel(m.timestamp) + content;
        }
        return { role: m.role, content };
      }),
    ];

    const replyTemperature = toolPrivate ? 0.4 : 0.7;

    const apiUrl = buildApiUrl(apiConfig);
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiConfig.apiKey}`,
        'X-Momoyu-Source': 'pendingReplyService:reply',
      },
      body: JSON.stringify({
        model: effectiveApiConfig.modelName,
        messages,
        temperature: replyTemperature,
        max_tokens: maxTokens,
      }),
    });

    if (!res.ok) {
      const errorInfo = await getErrorFromResponse(res);
      throw new Error(`${errorInfo.icon} ${errorInfo.title}：${errorInfo.message}`);
    }

    const data = await res.json();
    let aiContent = data.choices?.[0]?.message?.content?.trim();

    const outputValidation = validateAssistantOutput(aiContent || '');
    if (!outputValidation.valid) {
      console.warn('⚠️ [延迟回复] 检测到不合规输出，触发一次协议重试:', outputValidation.reason);
      const retryRes = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiConfig.apiKey}`,
          'X-Momoyu-Source': 'pendingReplyService:protocol-retry',
        },
        body: JSON.stringify({
          model: effectiveApiConfig.modelName,
          messages: [...messages, { role: 'system', content: buildProtocolRetryInstruction() }],
          temperature: replyTemperature,
          max_tokens: maxTokens,
        }),
      });
      if (retryRes.ok) {
        const retryData = await retryRes.json();
        aiContent = retryData?.choices?.[0]?.message?.content?.trim() || aiContent;
      }
    }

    const shouldForceDocumentJson = requireDocumentJson || looksLikeDocumentAttemptOutput(aiContent || '');
    if (shouldForceDocumentJson && !isValidDocumentJsonOutput(aiContent || '')) {
      console.warn('⚠️ [延迟回复] 检测到文档发送意图但未按JSON协议输出，触发文档协议重试');
      const docRetryRes = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiConfig.apiKey}`,
          'X-Momoyu-Source': 'pendingReplyService:doc-retry',
        },
        body: JSON.stringify({
          model: effectiveApiConfig.modelName,
          messages: [...messages, { role: 'system', content: buildDocumentJsonRetryInstruction() }],
          temperature: 0.3,
          max_tokens: 9000,
        }),
      });
      if (docRetryRes.ok) {
        const docRetryData = await docRetryRes.json();
        aiContent = docRetryData?.choices?.[0]?.message?.content?.trim() || aiContent;
      }
      if (!isValidDocumentJsonOutput(aiContent || '')) {
        aiContent = JSON.stringify({
          document: {
            title: '文档生成失败，请重试',
            type: 'text',
            greeting: '请查收',
            content: '本次文档生成未通过 JSON 协议校验。请重新发送“生成一份正式文档”再试一次。',
          },
        });
      }
    }

    let trimmedOut = (aiContent || '').trim();
    if (
      toolPrivate &&
      (!trimmedOut || trimmedOut === '[SKIP]' || trimmedOut === '[不回复]')
    ) {
      console.warn('⚠️ [延迟回复] 工具型助手不应跳回复，触发一次强制重试');
      const skipInstr =
        '【强制】你是工具型助手：禁止输出 [SKIP]、[不回复] 或空内容。用户已发来消息，你必须给出简短、可用的实质性回答（结论优先，一两句亦可）。';
      const skipRetryRes = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiConfig.apiKey}`,
          'X-Momoyu-Source': 'pendingReplyService:tool-skip-retry',
        },
        body: JSON.stringify({
          model: effectiveApiConfig.modelName,
          messages: [
            ...messages,
            { role: 'assistant', content: trimmedOut || '(模型未输出正文)' },
            { role: 'system', content: skipInstr },
          ],
          temperature: Math.min(0.55, replyTemperature + 0.08),
          max_tokens: maxTokens,
        }),
      });
      if (skipRetryRes.ok) {
        const skipRetryData = await skipRetryRes.json();
        aiContent = skipRetryData?.choices?.[0]?.message?.content?.trim() || aiContent;
      }
      trimmedOut = (aiContent || '').trim();
    }

    if (!trimmedOut || trimmedOut === '[SKIP]' || trimmedOut === '[不回复]') {
      if (debugEnabled) console.log('🧪 [延迟回复调试] skipped', { aiContent });
      notifyTyping(conversationId, false);
      if (
        conversation.type === 'private' &&
        !toolPrivate &&
        (trimmedOut === '[SKIP]' || trimmedOut === '[不回复]')
      ) {
        _onPrivateAiSkippedReply?.(conversationId);
      }
      return;
    }

    const parsedDocument = parseDocumentJsonPayload(aiContent);
    if (parsedDocument) {
      let originalFile;
      try {
        originalFile = await generateDocxOriginalFile(parsedDocument.title, parsedDocument.content);
      } catch (error) {
        console.warn('⚠️ [延迟回复] 生成DOCX附件失败:', error);
      }

      const freshDocConv = _getConversation(conversationId);
      if (!freshDocConv) {
        notifyTyping(conversationId, false);
        return;
      }
      const docMessage: Message = {
        id: `ai_doc_${Date.now()}_${Math.random()}`,
        role: 'assistant',
        content: `已生成文档附件「${parsedDocument.title}」`,
        timestamp: Date.now(),
        document: {
          title: parsedDocument.title,
          content: parsedDocument.content,
          type: parsedDocument.type,
          greeting: parsedDocument.greeting || '请查收',
          size: new Blob([parsedDocument.content]).size,
          ...(originalFile ? { originalFile } : {}),
        },
      };
      _updateConversation(conversationId, {
        messages: [...freshDocConv.messages, docMessage],
        lastMessageTime: Date.now(),
      });
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
    const avatarAction = stripAvatarActionMarkers(aiContent || '');
    aiContent = avatarAction.text;
    const handleAction = stripOnlineHandleChangeMarkers(aiContent);
    aiContent = handleAction.text;
    const newOnlineHandle = handleAction.newHandle;

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
      const parsed = await extractStickerTokens(parts[i], conversationId);
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
          mediaUrl: sticker.imageUrl,
          isMediaDescriptionOnly: !sticker.imageUrl,
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

    // 先结束“正在输入”、让文字气泡提交到屏幕；头像更新放到下一帧，避免和大段消息渲染挤在同一帧变慢
    notifyTyping(conversationId, false);

    // 🧠 记忆与画像引擎（后台队列，不阻塞用户）
    if (conversation.enabledFeatures?.includes('memory-system')) {
      const freshConv2 = _getConversation(conversationId);
      if (freshConv2) {
        enqueueMemoryEngineCycle(freshConv2, effectiveApiConfig);
      }
    }

    const deferPrivateSideEffects =
      Boolean(newOnlineHandle || avatarAction.hasAvatarChange || avatarAction.hasRestoreAvatar) &&
      _getConversation(conversationId)?.type === 'private';

    const applyDeferredPrivateSideEffects = () => {
      let latest = _getConversation(conversationId);
      if (!latest || latest.type !== 'private') return;

      if (newOnlineHandle && latest.characterSettings) {
        _updateConversation(conversationId, {
          characterSettings: {
            ...latest.characterSettings,
            username: newOnlineHandle,
          },
        });
        latest = _getConversation(conversationId);
        if (!latest || latest.type !== 'private') return;
      }

      if (avatarAction.hasAvatarChange) {
        const candidates = listRecentUserImagesFromConversation(latest);
        const selectedByIndex =
          typeof avatarAction.selectedImageIndex === 'number' &&
          Number.isFinite(avatarAction.selectedImageIndex) &&
          avatarAction.selectedImageIndex > 0 &&
          avatarAction.selectedImageIndex <= candidates.length
            ? candidates[avatarAction.selectedImageIndex - 1]?.url
            : null;
        const latestImageUrl = pickLatestUserImageFromConversation(latest);
        const targetImageUrl = selectedByIndex || latestImageUrl;
        if (targetImageUrl) {
          const nextCharacterSettings = latest.characterSettings
            ? {
                ...latest.characterSettings,
                originalAvatar:
                  latest.characterSettings.originalAvatar ||
                  latest.characterSettings.avatar,
                avatar: targetImageUrl,
              }
            : latest.characterSettings;
          _updateConversation(conversationId, {
            avatar: targetImageUrl,
            ...(nextCharacterSettings ? { characterSettings: nextCharacterSettings } : {}),
          });
        }
      } else if (avatarAction.hasRestoreAvatar) {
        const originalAvatar = latest.characterSettings?.originalAvatar;
        if (originalAvatar) {
          const nextCharacterSettings = latest.characterSettings
            ? { ...latest.characterSettings, avatar: originalAvatar }
            : latest.characterSettings;
          _updateConversation(conversationId, {
            avatar: originalAvatar,
            ...(nextCharacterSettings ? { characterSettings: nextCharacterSettings } : {}),
          });
        }
      }
    };

    if (deferPrivateSideEffects && typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(applyDeferredPrivateSideEffects);
      });
    } else if (deferPrivateSideEffects) {
      setTimeout(applyDeferredPrivateSideEffects, 0);
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
  } finally {
    triggerReplyLocks.delete(conversationId);
  }
}

/** 私聊延迟回复：与 ChatScreen/buildTextChatRequest 对齐，供 buildTimeAwarePrompt 使用 */
function collectPrivateTimeAwareParams(conversation: Conversation): {
  lastUserTs?: number;
  lastUserContent?: string;
  lastAITs?: number;
  oldestUnreplied?: number;
  unreplied: UnrepliedMessageInfo[];
  actionContent?: string;
  actionTs?: number;
} {
  const msgs = conversation.messages;
  const lastUserFromEnd = [...msgs].reverse().find((m) => m.role === 'user');
  const lastAssistFromEnd = [...msgs].reverse().find((m) => m.role === 'assistant');

  let lastAssistantIdx = -1;
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === 'assistant') {
      lastAssistantIdx = i;
      break;
    }
  }
  const unhandled =
    lastAssistantIdx === -1
      ? msgs.filter((m) => m.role === 'user')
      : msgs.slice(lastAssistantIdx + 1).filter((m) => m.role === 'user');

  const unreplied: UnrepliedMessageInfo[] = unhandled.map((msg, index) => ({
    timestamp: Number(msg.timestamp || 0),
    content: msg.content || '[媒体消息]',
    index: index + 1,
  }));

  const oldestUnreplied =
    unhandled.length > 0 ? Math.min(...unhandled.map((m) => Number(m.timestamp || 0))) : undefined;

  let actionMessage: Message | undefined;
  for (let i = unhandled.length - 1; i >= 0; i--) {
    const msg = unhandled[i];
    if (msg.content && hasActionKeywords(msg.content)) {
      actionMessage = msg;
      break;
    }
  }

  return {
    lastUserTs: lastUserFromEnd ? Number(lastUserFromEnd.timestamp || 0) || undefined : undefined,
    lastUserContent: lastUserFromEnd?.content,
    lastAITs: lastAssistFromEnd ? Number(lastAssistFromEnd.timestamp || 0) || undefined : undefined,
    oldestUnreplied,
    unreplied,
    actionContent: actionMessage?.content,
    actionTs: actionMessage ? Number(actionMessage.timestamp || 0) || undefined : undefined,
  };
}

/* ── 构建 system prompt ── */
function buildSystemPrompt(
  conversation: Conversation,
  userProfile: UserProfile,
  userQuery: string,
  ragDebugEnabled: boolean
): { prompt: string; debugLines: string[] } {
  const cs = conversation.characterSettings;
  if (!cs) return { prompt: '你是一个人。', debugLines: [] };

  let prompt = '';
  const debugLines: string[] = [];
  if (cs.systemPrompt) prompt += cs.systemPrompt + '\n';
  const real = getCharacterRealName(cs);
  const remark = (cs.nickname || '').trim();
  const handle = getCharacterOnlineHandle(cs, conversation.name);
  prompt += `\n你的本名（你所知道的自己的名字）是「${real || '（未命名）'}」。`;
  if (remark) {
    prompt += `\n用户在通讯录里给你的备注是「${remark}」——这只是对方界面上的显示名，不是你的本名；对话中要尊重语境，但不要把备注当成你的法定姓名。`;
  }
  if (handle) {
    prompt += `\n资料里登记的对外网名（群聊名片等）目前是「${handle}」。`;
  } else {
    prompt += `\n资料里尚未写入对外网名（若之后在对话里自然决定要用哪一个，再按系统提示里「网名同步」那条做即可）。`;
  }
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
    const hits = retrieveKnowledgeChunks(cs.knowledgeBase, userQuery || '', { topK: 6, maxTotalChars: 2400 });
    if (hits.length > 0) {
      prompt += '\n\n【专属资料库（已检索）】\n';
      hits.forEach((h, i) => {
        prompt += `${i + 1}. ${h.title}\n${h.text}\n\n`;
      });
      if (ragDebugEnabled) {
        debugLines.push(
          `专属资料库命中 ${hits.length} 条：`,
          ...hits.map((h, i) => `${i + 1}. ${h.title} ｜ ${(h.text || '').slice(0, 80).replace(/\n/g, ' ')}...`)
        );
      }
    } else {
      // 无明显命中时，只给标题列表避免噪声
      prompt += '\n\n【专属资料库（可用条目）】\n';
      cs.knowledgeBase.slice(0, 12).forEach((item, i) => { prompt += `${i + 1}. ${item.title}\n`; });
      if (ragDebugEnabled) debugLines.push(`专属资料库未命中（候选 ${cs.knowledgeBase.length} 条）`);
    }
  }

  // 时间 + 农历
  const now = new Date();
  const solarTime = now.toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false });
  let lunarDate = '';
  try { lunarDate = now.toLocaleString('zh-CN-u-ca-chinese', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { /* 环境不支持 */ }

  const toolMode = isToolInteractionCharacter(cs);

  prompt += `

【当前时间】${solarTime}${lunarDate ? `（农历${lunarDate}）` : ''}
${toolMode ? '仅在用户问题与时间、日程相关时引用；不必用时间烘托情绪或寒暄。\n- 若用户距上条消息已隔**整日或多日**，不要默认对方仍处于先前陈述的同一状态（例如仍「正在睡觉那一晚」或仍卡在「刚要去上班」的那一刻）；以**当前日期**与常理为准。' : '请根据当前时间自然调整你的状态和语气。'}

【📎 文件/文档说明（重要）】
- 当用户发送文件/文档时，系统会把“标题、文件信息、以及可提取到的正文内容”直接附在对话消息里（形如“[用户发送了…文档] … 内容：…”）。
- 你**可以直接阅读这些内容并回答**，不要说“我打不开附件”“我看不到文件”“请复制粘贴”等。
- 只有当正文明确提示“未能提取到可读文本（扫描件/图片PDF）”时，你才可以让用户改发可复制文字版本或提供 OCR 后的文字。
`;

  if (toolMode) {
    prompt += `
【工具型助手 — 交互风格（最高优先级）】
- 你是智能AI助手：你的作用是按照用户的要求提供力所能及的一切帮助；不要编造数据，禁止在提供的信息里进行捏造和猜测。优先使用有权威肯定来源的数据和资料，如果没有资料或者搜不到需要如实交代，对于任何数据和资料禁止捏造数据和进行造假。无论何时都需要诚实公正的对用户进行回复。禁止携带任何的主观倾向，你的一切回答都要是基于专业和严谨性的、必须禁得起多番审查的。禁止夸大和误导用户，禁止承诺自己做不到的事情。
- 以**解决问题**为先：先给结论或判断，再给步骤、清单或可选方案；避免空洞寒暄与过度道歉（除非用户明确需要情绪支持）。
- 语气：**克制、专业、直接**；可使用「您」或「你」与用户对齐，但不要客服腔套话连篇。
- **禁止**编造个人生活、日程、社交、恋爱、起床睡觉等「后台故事」；用户未提供的事实不要假装经历。
- **禁止**用括号、星号等描写动作、神态、心理（如（笑）*点头*）。
- 即使用户表达情绪，也以**简短共情 + 可行建议**为主，不要戏剧化、不要长篇说教。

【表达】
- 优先用「和 / 或 / 还是」连接，少用斜杠列举。
- 需要分条时用换行或序号，保持可读。

【⚙️ 输出格式规则】
- 多条气泡可用 [NEXT] 分隔。
- 图片 [IMG:描述]、视频 [VID:描述]、语音 [VOICE:台词:秒数]、表情包 [STICKER:描述] 仍按系统标记使用。
- **禁止**输出 [SKIP]、[不回复] 或空回复：用户发来消息就必须给出实质性回应（结论优先，可很短）。`;
  } else {
    prompt += `
【💬 微信聊天核心原则 — 最重要】

你在用微信和朋友聊天，不是写作文、不是客服、不是面试。

1. **回复长度自然不固定**
   - 有时一个字："哈""嗯""好"
   - 有时一句话："今天累死了"
   - 有时几句连发（用 [NEXT] 分隔，像微信一条条气泡发出去）
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

RULE-1 消息拆条：[NEXT]
  多条消息之间用 [NEXT] 分隔。短回复不拆。
  ✅ "哈哈哈[NEXT]你怎么才来[NEXT]我等半天了"

RULE-2 图片：[IMG:描述]
  ✅ "看这个[IMG:今天拍的日落]"

RULE-3 视频：[VID:描述]
  ✅ "[VID:猫咪在玩球]"

RULE-4 语音：[VOICE:台词内容:秒数]
  ✅ "[VOICE:我今天特别开心啊哈哈:5]"

RULE-5 表情包：[STICKER:描述]
  ✅ "[STICKER:一只快乐摇尾巴的柴犬]"

RULE-6 不回复：[SKIP]
  当你选择不回复这条消息时输出 [SKIP]

RULE-7 对外网名（少用）：在**整条回复最末尾**接 [改网名:新网名]（约 2～24 字）
  与换头像一样是尾部机器指令，会从气泡里剥掉。可先正常聊天再接标记；也可以**整条仅有该标记**表示静默改名（对方看不到标记）。
  ✅ "哈哈哈哈太土了吧行行行那就这个我认了[改网名:咸鱼翻面中]"
  ✅ 静默改名仅更新名片时："[改网名:月下咸鱼]"

以上标记可自由组合：
✅ "今天去爬山了[IMG:山顶风景] 累死 [STICKER:瘫倒的猫]"`;
  }

  return { prompt, debugLines };
}

/* 记忆引擎已统一到 memorySystem.runMemoryEngineCycle */
