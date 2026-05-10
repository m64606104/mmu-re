import type { Conversation, Message, PrivateChatSession } from '../types';

export type { PrivateChatSession };

export const PRIVATE_NEW_SESSION_TITLE = '新会话';

/** 当前激活的私聊会话 id（无多会话结构时视为 undefined） */
export function getActivePrivateSessionId(conv: Conversation): string | undefined {
  if (conv.type !== 'private') return undefined;
  return conv.activePrivateSessionId || conv.privateSessions?.[0]?.id;
}

/** 从会话数组剥离旧版 subChats 字段（不做数据迁移） */
export function stripLegacySubChats(conversation: Conversation): Conversation {
  const { subChats: _removed, ...rest } = conversation as Conversation & { subChats?: unknown };
  return rest as Conversation;
}

/**
 * 确保私聊具备 privateSessions，且 messages 与当前激活会话一致。
 */
export function ensurePrivateSessions(conversation: Conversation): Conversation {
  if (conversation.type !== 'private') {
    return conversation;
  }
  const conv = stripLegacySubChats(conversation);
  if (conv.privateSessions && conv.privateSessions.length > 0) {
    const sid = conv.activePrivateSessionId || conv.privateSessions[0].id;
    const active = conv.privateSessions.find((s) => s.id === sid) || conv.privateSessions[0];
    return {
      ...conv,
      activePrivateSessionId: active.id,
      messages: active.messages,
    };
  }
  const id = `ps_default_${conv.id}`;
  const msgs = [...(conv.messages || [])];
  const now = Date.now();
  return {
    ...conv,
    privateSessions: [
      {
        id,
        title: '默认会话',
        messages: msgs,
        createdAt: conv.lastMessageTime || now,
        updatedAt: now,
      },
    ],
    activePrivateSessionId: id,
    messages: msgs,
  };
}

export function applyPrivateMessagesPatch(
  conv: Conversation,
  nextMessages: Message[],
  opts?: { bumpSessionTitleFromFirstUser?: boolean }
): Partial<Conversation> {
  if (conv.type === 'group') {
    const last = nextMessages[nextMessages.length - 1];
    return {
      messages: nextMessages,
      lastMessageTime: last?.timestamp ?? Date.now(),
    };
  }
  const n = ensurePrivateSessions(conv);
  const sid = n.activePrivateSessionId!;
  const now = Date.now();
  const sessions = n.privateSessions!.map((s) => {
    if (s.id !== sid) return s;
    let title = s.title;
    if (
      opts?.bumpSessionTitleFromFirstUser &&
      nextMessages.length > 0
    ) {
      const firstUser = nextMessages.find((m) => m.role === 'user');
      const content = (firstUser?.content || '').trim();
      if (
        content &&
        (title === PRIVATE_NEW_SESSION_TITLE || title === '新会话')
      ) {
        title = content.length > 28 ? `${content.slice(0, 28)}…` : content;
      }
    }
    return { ...s, messages: nextMessages, updatedAt: now, title };
  });
  const convLast = Math.max(n.lastMessageTime, ...sessions.map((s) => s.updatedAt));
  return {
    privateSessions: sessions,
    activePrivateSessionId: sid,
    messages: nextMessages,
    lastMessageTime: convLast,
  };
}

/**
 * App 层合并「仅传了 messages」的私聊更新：写入当前激活会话并镜像根 messages。
 * 若 partial 已含 privateSessions（切换/重命名/删除会话），则原样返回。
 */
export function expandPrivateConversationMessageUpdate(
  conv: Conversation,
  updates: Partial<Conversation>
): Partial<Conversation> {
  if (conv.type !== 'private' || updates.messages === undefined) {
    return updates;
  }
  if (updates.privateSessions !== undefined) {
    return updates;
  }
  /**
   * 切换激活会话时 patch 里只有 activePrivateSessionId + messages，不得按「合并前的 active」
   * 写回 privateSessions，否则会把目标会话的消息误写入旧会话桶。
   */
  const nextActive = updates.activePrivateSessionId;
  const currentActive = getActivePrivateSessionId(conv);
  if (
    nextActive !== undefined &&
    currentActive !== undefined &&
    nextActive !== currentActive
  ) {
    return updates;
  }
  const { messages, ...rest } = updates;
  const nextMsgs = messages as Message[];
  const bump =
    conv.messages.length === 0 &&
    nextMsgs.length >= 1 &&
    nextMsgs[nextMsgs.length - 1]?.role === 'user';
  const patch = applyPrivateMessagesPatch(conv, nextMsgs, {
    bumpSessionTitleFromFirstUser: bump,
  });
  return { ...patch, ...rest };
}

export function createPrivateSession(
  conv: Conversation,
  title?: string
): Partial<Conversation> {
  const n = ensurePrivateSessions(conv);
  const id = `ps_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = Date.now();
  const session: PrivateChatSession = {
    id,
    title: (title || '').trim() || PRIVATE_NEW_SESSION_TITLE,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
  return {
    privateSessions: [...n.privateSessions!, session],
    activePrivateSessionId: id,
    messages: [],
    lastMessageTime: n.lastMessageTime,
  };
}

export function switchPrivateSession(
  conv: Conversation,
  sessionId: string
): Partial<Conversation> | null {
  const n = ensurePrivateSessions(conv);
  const target = n.privateSessions!.find((s) => s.id === sessionId);
  if (!target) return null;
  return {
    activePrivateSessionId: sessionId,
    messages: target.messages,
    lastMessageTime: n.lastMessageTime,
  };
}

export function renamePrivateSession(
  conv: Conversation,
  sessionId: string,
  title: string
): Partial<Conversation> | null {
  const n = ensurePrivateSessions(conv);
  const next = n.privateSessions!.map((s) =>
    s.id === sessionId
      ? { ...s, title: title.trim() || PRIVATE_NEW_SESSION_TITLE }
      : s
  );
  return { privateSessions: next };
}

export function deletePrivateSession(
  conv: Conversation,
  sessionId: string
): Partial<Conversation> | null {
  const n = ensurePrivateSessions(conv);
  if (n.privateSessions!.length <= 1) return null;
  const rest = n.privateSessions!.filter((s) => s.id !== sessionId);
  let activeId = n.activePrivateSessionId!;
  if (activeId === sessionId) {
    const fallback = [...rest].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    activeId = fallback.id;
    return {
      privateSessions: rest,
      activePrivateSessionId: activeId,
      messages: fallback.messages,
      lastMessageTime: Math.max(n.lastMessageTime, ...rest.map((r) => r.updatedAt)),
    };
  }
  return {
    privateSessions: rest,
    lastMessageTime: Math.max(n.lastMessageTime, ...rest.map((r) => r.updatedAt)),
  };
}

/** 加载会话列表后的批量归一化（幂等） */
export function migratePrivateChatSessionsModel(
  conversations: Conversation[]
): Conversation[] {
  return conversations.map((c) =>
    c.type === 'private' ? ensurePrivateSessions(stripLegacySubChats(c)) : stripLegacySubChats(c)
  );
}

/**
 * 合并私聊所有会话桶内的消息，按时间排序；同一 message.id 只保留一条（防异常重复）。
 * 用于记忆引擎、自动总结水位等与角色全局上下文相关的逻辑（与会话窗口隔离展示无关）。
 */
export function getPrivateMessagesMergedChronological(conv: Conversation): Message[] {
  if (conv.type !== 'private') return [...(conv.messages || [])];
  const n = ensurePrivateSessions(conv);
  const map = new Map<string, Message>();
  for (const s of n.privateSessions || []) {
    for (const m of s.messages || []) {
      if (!map.has(m.id)) map.set(m.id, m);
    }
  }
  return Array.from(map.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
}

export function countPrivateMessagesAcrossSessions(conv: Conversation): number {
  return getPrivateMessagesMergedChronological(conv).length;
}

/** 删除/清空私聊： wiped 所有会话桶与根 messages，并折叠为单个空会话（与「新建角色」结构一致） */
export function wipePrivateConversationChatHistory(conv: Conversation): Partial<Conversation> {
  if (conv.type !== 'private') {
    return { messages: [], lastMessageTime: Date.now(), isHidden: true };
  }
  const stripped = stripLegacySubChats(conv);
  const now = Date.now();
  const id = `ps_default_${stripped.id}`;
  return {
    privateSessions: [
      {
        id,
        title: '默认会话',
        messages: [],
        createdAt: now,
        updatedAt: now,
      },
    ],
    activePrivateSessionId: id,
    messages: [],
    lastMessageTime: now,
    isHidden: true,
  };
}

export function groupSessionsByRecency(sessions: PrivateChatSession[]): {
  label: string;
  items: PrivateChatSession[];
}[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = startOfToday - 30 * 24 * 60 * 60 * 1000;

  const buckets = {
    今天: [] as PrivateChatSession[],
    本周: [] as PrivateChatSession[],
    本月: [] as PrivateChatSession[],
    更早: [] as PrivateChatSession[],
  };

  const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  for (const s of sorted) {
    const t = s.updatedAt;
    if (t >= startOfToday) buckets['今天'].push(s);
    else if (t >= weekAgo) buckets['本周'].push(s);
    else if (t >= monthAgo) buckets['本月'].push(s);
    else buckets['更早'].push(s);
  }

  return (Object.entries(buckets) as [keyof typeof buckets, PrivateChatSession[]][])
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}
