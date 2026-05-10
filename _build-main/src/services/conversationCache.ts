import type { Conversation, Message } from '../types';

export const CACHE_MAX_MESSAGES_PER_CONVERSATION = 300;
export const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function trimMessageList(messages: Message[], minTs: number): Message[] {
  const withinAge = (messages || []).filter((m) => (m.timestamp || 0) >= minTs);
  return withinAge.length > CACHE_MAX_MESSAGES_PER_CONVERSATION
    ? withinAge.slice(-CACHE_MAX_MESSAGES_PER_CONVERSATION)
    : withinAge;
}

export function trimConversationMessagesForCache(
  conversation: Conversation,
  nowTs = Date.now()
): Conversation {
  const minTs = nowTs - CACHE_MAX_AGE_MS;

  if (conversation.type === 'private' && conversation.privateSessions?.length) {
    const sessions = conversation.privateSessions.map((s) => ({
      ...s,
      messages: trimMessageList(s.messages || [], minTs),
    }));
    const activeId = conversation.activePrivateSessionId || sessions[0].id;
    const active = sessions.find((s) => s.id === activeId) || sessions[0];
    const maxTs = sessions.flatMap((s) => s.messages.map((m) => m.timestamp || 0));
    const lastFromMsgs = maxTs.length > 0 ? Math.max(...maxTs) : 0;
    return {
      ...conversation,
      privateSessions: sessions,
      messages: active.messages,
      lastMessageTime: Math.max(conversation.lastMessageTime || 0, lastFromMsgs),
    };
  }

  const trimmed = trimMessageList(conversation.messages || [], minTs);
  return {
    ...conversation,
    messages: trimmed,
    lastMessageTime:
      trimmed.length > 0 ? trimmed[trimmed.length - 1].timestamp : conversation.lastMessageTime,
  };
}

export function trimConversationsForCache(conversations: Conversation[], nowTs = Date.now()): Conversation[] {
  return conversations.map((conv) => trimConversationMessagesForCache(conv, nowTs));
}

