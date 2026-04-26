/**
 * 用户间消息系统
 * 支持离线消息存储和同步
 */

import { getCurrentUser, type UserMessage } from './userSystem';

// 重新导出UserMessage类型供其他组件使用
export type { UserMessage } from './userSystem';

let messageSyncIntervalId: number | null = null;

export interface Conversation {
  id: string;
  participants: string[]; // 参与者用户码
  lastMessage?: UserMessage;
  unreadCount: number;
  updatedAt: number;
}

/**
 * 发送消息给指定用户
 */
export function sendMessageToUser(
  toUserCode: string, 
  content: string, 
  messageType: 'text' | 'image' | 'file' | 'redPacket' = 'text',
  metadata?: any
): UserMessage | null {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;
  
  const message: UserMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    fromUserId: currentUser.userCode,
    toUserId: toUserCode,
    content,
    messageType,
    timestamp: Date.now(),
    status: 'sent',
    metadata
  };
  
  // 保存到本地发送历史
  saveSentMessage(message);
  
  // 模拟发送到云端（这里可以接入真实的后端服务）
  syncMessageToCloud(message);
  
  // 更新对话列表
  updateConversation(currentUser.userCode, toUserCode, message);
  
  console.log(`📤 消息已发送: ${currentUser.userCode} -> ${toUserCode}`);
  return message;
}

/**
 * 保存已发送的消息到本地
 */
function saveSentMessage(message: UserMessage): void {
  const sentMessages = getSentMessages();
  sentMessages.push(message);
  
  // 只保留最近1000条消息
  if (sentMessages.length > 1000) {
    sentMessages.splice(0, sentMessages.length - 1000);
  }
  
  localStorage.setItem('sent_messages', JSON.stringify(sentMessages));
}

/**
 * 获取已发送的消息
 */
export function getSentMessages(): UserMessage[] {
  const data = localStorage.getItem('sent_messages');
  return data ? JSON.parse(data) : [];
}

/**
 * 保存收到的消息到本地
 */
function saveReceivedMessage(message: UserMessage): void {
  const receivedMessages = getReceivedMessages();
  receivedMessages.push(message);
  
  // 只保留最近1000条消息
  if (receivedMessages.length > 1000) {
    receivedMessages.splice(0, receivedMessages.length - 1000);
  }
  
  localStorage.setItem('received_messages', JSON.stringify(receivedMessages));
}

/**
 * 获取收到的消息
 */
export function getReceivedMessages(): UserMessage[] {
  const data = localStorage.getItem('received_messages');
  return data ? JSON.parse(data) : [];
}

/**
 * 获取与指定用户的聊天记录
 */
export function getChatHistory(userCode: string): UserMessage[] {
  const currentUser = getCurrentUser();
  if (!currentUser) return [];
  
  const sentMessages = getSentMessages().filter(m => m.toUserId === userCode);
  const receivedMessages = getReceivedMessages().filter(m => m.fromUserId === userCode);
  
  // 合并并按时间排序
  const allMessages = [...sentMessages, ...receivedMessages];
  return allMessages.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * 获取对话列表
 */
export function getConversations(): Conversation[] {
  const data = localStorage.getItem('conversations');
  return data ? JSON.parse(data) : [];
}

/**
 * 更新对话信息
 */
function updateConversation(fromUserCode: string, toUserCode: string, message: UserMessage): void {
  const conversations = getConversations();
  const conversationId = [fromUserCode, toUserCode].sort().join('_');
  
  let conversation = conversations.find(c => c.id === conversationId);
  
  if (!conversation) {
    conversation = {
      id: conversationId,
      participants: [fromUserCode, toUserCode],
      unreadCount: 0,
      updatedAt: Date.now()
    };
    conversations.push(conversation);
  }
  
  conversation.lastMessage = message;
  conversation.updatedAt = message.timestamp;
  
  // 如果是收到的消息，增加未读数
  const currentUser = getCurrentUser();
  if (currentUser && message.fromUserId !== currentUser.userCode) {
    conversation.unreadCount += 1;
  }
  
  // 按最后更新时间排序
  conversations.sort((a, b) => b.updatedAt - a.updatedAt);
  
  localStorage.setItem('conversations', JSON.stringify(conversations));
}

/**
 * 标记对话为已读
 */
export function markConversationAsRead(userCode: string): void {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const conversations = getConversations();
  const conversationId = [currentUser.userCode, userCode].sort().join('_');
  
  const conversation = conversations.find(c => c.id === conversationId);
  if (conversation) {
    conversation.unreadCount = 0;
    localStorage.setItem('conversations', JSON.stringify(conversations));
  }
}

/**
 * 模拟云端消息同步（这里可以替换为真实的API调用）
 */
async function syncMessageToCloud(message: UserMessage): Promise<boolean> {
  try {
    // 这里可以接入Firebase、Supabase或自建API
    // 目前使用本地存储模拟
    console.log('🌐 模拟同步消息到云端:', message.id);
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return true;
  } catch (error) {
    console.error('❌ 消息同步失败:', error);
    return false;
  }
}

/**
 * 从云端获取新消息（模拟）
 */
export async function fetchNewMessages(): Promise<UserMessage[]> {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) return [];
    
    // 这里可以接入真实的API来获取发给当前用户的新消息
    // 目前返回模拟数据
    console.log('🌐 检查新消息...');
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 返回模拟的新消息（实际应用中从服务器获取）
    return [];
  } catch (error) {
    console.error('❌ 获取新消息失败:', error);
    return [];
  }
}

/**
 * 处理收到的新消息
 */
export function processNewMessage(message: UserMessage): void {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  // 只处理发给当前用户的消息
  if (message.toUserId !== currentUser.userCode) return;
  
  // 保存收到的消息
  saveReceivedMessage(message);
  
  // 更新对话列表
  updateConversation(message.fromUserId, message.toUserId, message);
  
  console.log(`📥 收到新消息: ${message.fromUserId} -> ${currentUser.userCode}`);
}

/**
 * 定期检查新消息（可在App启动时调用）
 */
export function startMessageSync(): void {
  if (messageSyncIntervalId !== null) {
    return;
  }

  // 立即检查一次
  fetchNewMessages().then(newMessages => {
    newMessages.forEach(message => processNewMessage(message));
  });
  
  // 设置定期检查（每30秒）
  messageSyncIntervalId = window.setInterval(async () => {
    const newMessages = await fetchNewMessages();
    newMessages.forEach(message => processNewMessage(message));
  }, 30000);
  
  console.log('🔄 消息同步服务已启动');
}

/**
 * 停止定期消息同步
 */
export function stopMessageSync(): void {
  if (messageSyncIntervalId === null) {
    return;
  }
  clearInterval(messageSyncIntervalId);
  messageSyncIntervalId = null;
  console.log('⏹️ 消息同步服务已停止');
}
