/**
 * 论坛式消息系统 - 基于共享"留言板"的聊天实现
 * 每个对话就是一个私密的论坛，参与者通过好友码进入
 */

import { getCurrentUser } from './userSystem';

export interface ForumConversation {
  id: string;
  participants: string[]; // 参与者用户码
  forumName: string; // 论坛名称
  createdAt: number;
  lastActivity: number;
  messageCount: number;
}

export interface ForumMessage {
  id: string;
  forumId: string; // 论坛ID
  authorCode: string; // 发言者用户码
  authorName: string; // 发言者昵称
  content: string;
  messageType: 'text' | 'image' | 'file' | 'redPacket';
  timestamp: number;
  metadata?: any;
}

/**
 * 生成论坛ID - 基于参与者用户码排序
 */
function generateForumId(userCodes: string[]): string {
  return userCodes.sort().join('_');
}

/**
 * 获取所有论坛对话
 */
export function getForumConversations(): ForumConversation[] {
  const data = localStorage.getItem('forum_conversations');
  return data ? JSON.parse(data) : [];
}

/**
 * 获取当前用户参与的所有论坛
 */
export function getUserForumConversations(): ForumConversation[] {
  const currentUser = getCurrentUser();
  if (!currentUser) return [];
  
  const allForums = getForumConversations();
  return allForums.filter(forum => 
    forum.participants.includes(currentUser.userCode)
  );
}

/**
 * 创建或加入论坛对话
 */
export function createOrJoinForum(participantCodes: string[]): ForumConversation {
  const currentUser = getCurrentUser();
  if (!currentUser) throw new Error('用户未登录');
  
  // 确保当前用户包含在参与者中
  if (!participantCodes.includes(currentUser.userCode)) {
    participantCodes.push(currentUser.userCode);
  }
  
  const forumId = generateForumId(participantCodes);
  const allForums = getForumConversations();
  
  // 检查论坛是否已存在
  let forum = allForums.find(f => f.id === forumId);
  
  if (!forum) {
    // 创建新论坛
    const forumName = participantCodes.length === 2 
      ? `私密对话` // 双人对话
      : `群聊 (${participantCodes.length}人)`; // 群聊
    
    forum = {
      id: forumId,
      participants: participantCodes,
      forumName,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      messageCount: 0
    };
    
    allForums.push(forum);
    localStorage.setItem('forum_conversations', JSON.stringify(allForums));
    
    console.log(`✅ 创建论坛: ${forumId}`);
  } else {
    // 更新论坛活跃时间
    forum.lastActivity = Date.now();
    localStorage.setItem('forum_conversations', JSON.stringify(allForums));
    
    console.log(`🔄 加入论坛: ${forumId}`);
  }
  
  return forum;
}

/**
 * 获取论坛的所有留言
 */
export function getForumMessages(forumId: string): ForumMessage[] {
  const data = localStorage.getItem(`forum_messages_${forumId}`);
  const messages: ForumMessage[] = data ? JSON.parse(data) : [];
  
  // 按时间排序
  return messages.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * 在论坛中发布留言
 */
export function postMessageToForum(
  forumId: string,
  content: string,
  messageType: 'text' | 'image' | 'file' | 'redPacket' = 'text',
  metadata?: any
): ForumMessage | null {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    console.error('❌ 用户未登录，无法发布留言');
    return null;
  }
  
  // 验证用户是否有权限在此论坛发言
  const forum = getForumConversations().find(f => f.id === forumId);
  if (!forum || !forum.participants.includes(currentUser.userCode)) {
    console.error('❌ 无权限在此论坛发言');
    return null;
  }
  
  const message: ForumMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    forumId,
    authorCode: currentUser.userCode,
    authorName: currentUser.nickname,
    content,
    messageType,
    timestamp: Date.now(),
    metadata
  };
  
  // 获取现有留言
  const messages = getForumMessages(forumId);
  messages.push(message);
  
  // 保存留言（每个论坛独立存储）
  localStorage.setItem(`forum_messages_${forumId}`, JSON.stringify(messages));
  
  // 更新论坛信息
  updateForumActivity(forumId);
  
  console.log(`📝 论坛留言已发布: ${currentUser.userCode} -> ${forumId}`);
  return message;
}

/**
 * 更新论坛活跃度
 */
function updateForumActivity(forumId: string): void {
  const allForums = getForumConversations();
  const forum = allForums.find(f => f.id === forumId);
  
  if (forum) {
    forum.lastActivity = Date.now();
    forum.messageCount = getForumMessages(forumId).length;
    
    // 按最新活跃时间排序
    allForums.sort((a, b) => b.lastActivity - a.lastActivity);
    localStorage.setItem('forum_conversations', JSON.stringify(allForums));
  }
}

/**
 * 通过好友码加入论坛（双人对话）
 */
export function joinForumByFriendCode(friendCode: string): ForumConversation | null {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    console.error('❌ 用户未登录');
    return null;
  }
  
  if (friendCode === currentUser.userCode) {
    console.error('❌ 不能与自己创建论坛');
    return null;
  }
  
  try {
    const forum = createOrJoinForum([currentUser.userCode, friendCode]);
    console.log(`✅ 通过好友码 ${friendCode} 加入论坛成功`);
    return forum;
  } catch (error) {
    console.error('❌ 加入论坛失败:', error);
    return null;
  }
}

/**
 * 获取论坛的最新留言（用于预览）
 */
export function getForumLatestMessage(forumId: string): ForumMessage | null {
  const messages = getForumMessages(forumId);
  return messages.length > 0 ? messages[messages.length - 1] : null;
}

/**
 * 获取论坛中的未读消息数量
 */
export function getForumUnreadCount(forumId: string): number {
  const currentUser = getCurrentUser();
  if (!currentUser) return 0;
  
  // 获取上次阅读时间
  const lastReadTime = localStorage.getItem(`forum_last_read_${forumId}_${currentUser.userCode}`);
  const lastRead = lastReadTime ? parseInt(lastReadTime) : 0;
  
  // 计算未读消息
  const messages = getForumMessages(forumId);
  return messages.filter(msg => 
    msg.timestamp > lastRead && msg.authorCode !== currentUser.userCode
  ).length;
}

/**
 * 标记论坛为已读
 */
export function markForumAsRead(forumId: string): void {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const now = Date.now();
  localStorage.setItem(`forum_last_read_${forumId}_${currentUser.userCode}`, now.toString());
  
  console.log(`👀 论坛 ${forumId} 标记为已读`);
}

/**
 * 删除论坛中的留言（仅作者可删除）
 */
export function deleteForumMessage(forumId: string, messageId: string): boolean {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;
  
  const messages = getForumMessages(forumId);
  const messageIndex = messages.findIndex(m => m.id === messageId);
  
  if (messageIndex === -1) return false;
  
  const message = messages[messageIndex];
  
  // 只有作者可以删除自己的留言
  if (message.authorCode !== currentUser.userCode) {
    console.error('❌ 只能删除自己的留言');
    return false;
  }
  
  // 删除留言
  messages.splice(messageIndex, 1);
  localStorage.setItem(`forum_messages_${forumId}`, JSON.stringify(messages));
  
  // 更新论坛信息
  updateForumActivity(forumId);
  
  console.log(`🗑️ 留言已删除: ${messageId}`);
  return true;
}

/**
 * 获取论坛统计信息
 */
export function getForumStats() {
  const currentUser = getCurrentUser();
  if (!currentUser) return { forumCount: 0, totalMessages: 0 };
  
  const userForums = getUserForumConversations();
  let totalMessages = 0;
  
  userForums.forEach(forum => {
    totalMessages += getForumMessages(forum.id).length;
  });
  
  return {
    forumCount: userForums.length,
    totalMessages,
    user: currentUser.userCode
  };
}

console.log('🏛️ 论坛式消息系统已加载');
