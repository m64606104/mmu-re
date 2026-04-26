import type { Conversation } from '../types';

export const CACHE_MAX_MESSAGES_PER_CONVERSATION = 300;
export const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function trimConversationMessagesForCache(
  conversation: Conversation,
  nowTs = Date.now()
): Conversation {
  const minTs = nowTs - CACHE_MAX_AGE_MS;
  const withinAge = (conversation.messages || []).filter((m) => (m.timestamp || 0) >= minTs);
  const trimmed =
    withinAge.length > CACHE_MAX_MESSAGES_PER_CONVERSATION
      ? withinAge.slice(-CACHE_MAX_MESSAGES_PER_CONVERSATION)
      : withinAge;

  return {
    ...conversation,
    messages: trimmed,
    lastMessageTime: trimmed.length > 0 ? trimmed[trimmed.length - 1].timestamp : conversation.lastMessageTime,
  };
}

export function trimConversationsForCache(conversations: Conversation[], nowTs = Date.now()): Conversation[] {
  return conversations.map((conv) => trimConversationMessagesForCache(conv, nowTs));
}

