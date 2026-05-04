/**
 * 子聊天管理工具
 * 用于创建、更新、删除子聊天
 */

import { SubChat, Message, Conversation } from '../types';
import { getCachedData, save, setCachedData } from './storage';

const SUBCHAT_STORAGE_KEY = 'subchat_data';

/**
 * 创建新的子聊天
 */
export const createSubChat = (
  name: string,
  conversationId: string,
  initiator: 'user' | 'ai',
  purpose?: string
): SubChat => {
  return {
    id: `subchat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    messages: [],
    createdAt: Date.now(),
    lastMessageTime: Date.now(),
    unreadCount: 0,
    isActive: false,
    initiator,
    purpose,
    status: initiator === 'ai' ? 'pending' : 'active',
    conversationId,
  };
};

/**
 * 添加消息到子聊天
 */
export const addMessageToSubChat = (
  subChat: SubChat,
  message: Message
): SubChat => {
  return {
    ...subChat,
    messages: [...subChat.messages, message],
    lastMessageTime: Date.now(),
  };
};

/**
 * 更新子聊天状态
 */
export const updateSubChatStatus = (
  subChat: SubChat,
  status: 'pending' | 'active' | 'closed'
): SubChat => {
  return {
    ...subChat,
    status,
  };
};

/**
 * 标记子聊天为已读
 */
export const markSubChatAsRead = (subChat: SubChat): SubChat => {
  return {
    ...subChat,
    unreadCount: 0,
  };
};

/**
 * 增加未读数
 */
export const incrementUnreadCount = (subChat: SubChat): SubChat => {
  return {
    ...subChat,
    unreadCount: subChat.unreadCount + 1,
  };
};

/**
 * 获取对话的所有子聊天
 */
export const getSubChats = (conversationId: string): SubChat[] => {
  const key = `${SUBCHAT_STORAGE_KEY}_${conversationId}`;
  const cached = getCachedData<SubChat[]>(key);
  return Array.isArray(cached) ? cached : [];
};

/**
 * 保存子聊天到localStorage
 */
export const saveSubChats = (conversationId: string, subChats: SubChat[]): void => {
  const key = `${SUBCHAT_STORAGE_KEY}_${conversationId}`;
  setCachedData(key, subChats);
  void save(key, subChats).catch((error) => {
    console.error('保存子聊天失败:', error);
  });
};

/**
 * 删除子聊天
 */
export const deleteSubChat = (conversationId: string, subChatId: string): SubChat[] => {
  const subChats = getSubChats(conversationId);
  const updated = subChats.filter(sc => sc.id !== subChatId);
  saveSubChats(conversationId, updated);
  return updated;
};

/**
 * 获取活跃的子聊天数量
 */
export const getActiveSubChatsCount = (conversation: Conversation): number => {
  return (conversation.subChats || []).filter(
    sc => sc.status === 'active' || sc.status === 'pending'
  ).length;
};

/**
 * 获取待接受的子聊天请求数量
 */
export const getPendingSubChatsCount = (conversation: Conversation): number => {
  return (conversation.subChats || []).filter(sc => sc.status === 'pending').length;
};

/**
 * 获取子聊天的总未读数
 */
export const getTotalUnreadCount = (conversation: Conversation): number => {
  return (conversation.subChats || []).reduce((sum, sc) => sum + sc.unreadCount, 0);
};

/**
 * 查找子聊天
 */
export const findSubChat = (
  conversation: Conversation,
  subChatId: string
): SubChat | undefined => {
  return (conversation.subChats || []).find(sc => sc.id === subChatId);
};

/**
 * 更新对话中的子聊天
 */
export const updateSubChatInConversation = (
  conversation: Conversation,
  subChatId: string,
  updates: Partial<SubChat>
): Conversation => {
  const subChats = (conversation.subChats || []).map(sc =>
    sc.id === subChatId ? { ...sc, ...updates } : sc
  );
  
  return {
    ...conversation,
    subChats,
  };
};

/**
 * 添加子聊天到对话
 */
export const addSubChatToConversation = (
  conversation: Conversation,
  subChat: SubChat
): Conversation => {
  return {
    ...conversation,
    subChats: [...(conversation.subChats || []), subChat],
  };
};

/**
 * 从对话中删除子聊天
 */
export const removeSubChatFromConversation = (
  conversation: Conversation,
  subChatId: string
): Conversation => {
  return {
    ...conversation,
    subChats: (conversation.subChats || []).filter(sc => sc.id !== subChatId),
  };
};
