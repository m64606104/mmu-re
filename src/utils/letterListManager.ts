/**
 * 信件列表管理器
 * 提供按收件人分组、分类显示的功能
 */

import { Letter } from '../types/letter';
import { getAllLetters } from './letterService';
import { getAIDisplayName } from './letterNicknameManager';

export interface LetterGroup {
  receiverId: string;
  receiverName: string;
  displayName: string; // 备注名或原名
  receiverAvatar: string;
  receiverType: 'bottle' | 'penpal' | 'contact';
  letterCount: number;
  unreadCount: number;
  latestLetter: Letter;
  lastActivity: number; // 最后活动时间
  hasNewReply: boolean; // 是否有新回复
  isPenPal: boolean;
  isBottle: boolean;
}

export interface LetterListData {
  penPals: LetterGroup[]; // 笔友
  bottles: LetterGroup[]; // 漂流瓶
  contacts: LetterGroup[]; // 其他联系人
  total: number;
  unreadTotal: number;
}

/**
 * 获取分组的信件列表
 */
export function getGroupedLetterList(): LetterListData {
  const letters = getAllLetters().filter(l => !l.isArchived);
  const groupMap = new Map<string, Letter[]>();
  
  // 按收件人ID分组
  letters.forEach(letter => {
    const key = letter.receiverId;
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(letter);
  });
  
  const groups: LetterGroup[] = [];
  
  // 为每个组创建LetterGroup
  groupMap.forEach((letterList, receiverId) => {
    // 按时间排序，最新的在前
    letterList.sort((a, b) => b.sentAt - a.sentAt);
    const latestLetter = letterList[0];
    
    // 计算未读数量（已回复但用户可能还没看）
    const unreadCount = letterList.filter(l => 
      l.status === 'replied' && 
      l.conversationRounds.some(round => 
        round.aiReply && !round.aiReply.isDeleted
      )
    ).length;
    
    // 检查是否有新回复
    const hasNewReply = letterList.some(l => l.status === 'replied');
    
    // 获取显示名称（备注名或原名）
    const displayName = getAIDisplayName(receiverId, latestLetter.receiverName);
    
    // 确定联系人类型
    let receiverType: 'bottle' | 'penpal' | 'contact' = 'contact';
    if (latestLetter.isPenPalAdded) {
      receiverType = 'penpal';
    } else if (latestLetter.isBottle) {
      receiverType = 'bottle';
    }
    
    // 计算最后活动时间（最后一次发送或回复）
    let lastActivity = latestLetter.sentAt;
    letterList.forEach(letter => {
      letter.conversationRounds.forEach(round => {
        if (round.aiReply && round.aiReply.repliedAt > lastActivity) {
          lastActivity = round.aiReply.repliedAt;
        }
        if (round.userLetter.sentAt > lastActivity) {
          lastActivity = round.userLetter.sentAt;
        }
      });
    });
    
    groups.push({
      receiverId,
      receiverName: latestLetter.receiverName,
      displayName,
      receiverAvatar: latestLetter.receiverAvatar || '📬',
      receiverType,
      letterCount: letterList.length,
      unreadCount,
      latestLetter,
      lastActivity,
      hasNewReply,
      isPenPal: latestLetter.isPenPalAdded,
      isBottle: latestLetter.isBottle
    });
  });
  
  // 按最后活动时间排序
  groups.sort((a, b) => b.lastActivity - a.lastActivity);
  
  // 分类
  const penPals = groups.filter(g => g.receiverType === 'penpal');
  const bottles = groups.filter(g => g.receiverType === 'bottle');
  const contacts = groups.filter(g => g.receiverType === 'contact');
  
  const unreadTotal = groups.reduce((sum, g) => sum + g.unreadCount, 0);
  
  return {
    penPals,
    bottles,
    contacts,
    total: groups.length,
    unreadTotal
  };
}

/**
 * 获取指定收件人的所有信件
 */
export function getLettersByReceiver(receiverId: string): Letter[] {
  return getAllLetters()
    .filter(l => l.receiverId === receiverId && !l.isArchived)
    .sort((a, b) => b.sentAt - a.sentAt);
}

/**
 * 搜索信件组
 */
export function searchLetterGroups(query: string): LetterGroup[] {
  if (!query.trim()) return [];
  
  const { penPals, bottles, contacts } = getGroupedLetterList();
  const allGroups = [...penPals, ...bottles, ...contacts];
  const lowerQuery = query.toLowerCase();
  
  return allGroups.filter(group => 
    group.displayName.toLowerCase().includes(lowerQuery) ||
    group.receiverName.toLowerCase().includes(lowerQuery) ||
    group.latestLetter.content.toLowerCase().includes(lowerQuery)
  ).sort((a, b) => b.lastActivity - a.lastActivity);
}

/**
 * 获取最近活跃的联系人
 */
export function getRecentActiveContacts(limit: number = 5): LetterGroup[] {
  const { penPals, bottles, contacts } = getGroupedLetterList();
  const allGroups = [...penPals, ...bottles, ...contacts];
  
  return allGroups
    .filter(g => g.hasNewReply || Date.now() - g.lastActivity < 7 * 24 * 60 * 60 * 1000) // 7天内活跃
    .slice(0, limit);
}

/**
 * 获取统计信息
 */
export function getLetterListStats() {
  const data = getGroupedLetterList();
  const totalLetters = getAllLetters().filter(l => !l.isArchived).length;
  const archivedLetters = getAllLetters().filter(l => l.isArchived).length;
  
  return {
    totalContacts: data.total,
    penPalCount: data.penPals.length,
    bottleCount: data.bottles.length,
    contactCount: data.contacts.length,
    unreadTotal: data.unreadTotal,
    totalLetters,
    archivedLetters,
    avgLettersPerContact: data.total > 0 ? Math.round(totalLetters / data.total * 10) / 10 : 0
  };
}

/**
 * 格式化时间显示
 */
export function formatLastActivity(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', { 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * 获取联系人状态描述
 */
export function getContactStatusText(group: LetterGroup): string {
  if (group.hasNewReply && group.unreadCount > 0) {
    return `${group.unreadCount}条新回复`;
  }
  
  if (group.latestLetter.status === 'sent') {
    return '等待回信中...';
  }
  
  if (group.latestLetter.status === 'replied') {
    return '已回复';
  }
  
  return `${group.letterCount}封信件`;
}

/**
 * 获取联系人类型标签
 */
export function getContactTypeLabel(group: LetterGroup): {
  text: string;
  color: string;
  bgColor: string;
} {
  switch (group.receiverType) {
    case 'penpal':
      return {
        text: '❤️ 笔友',
        color: 'text-pink-600',
        bgColor: 'bg-pink-50'
      };
    case 'bottle':
      return {
        text: '🌊 漂流瓶',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      };
    default:
      return {
        text: '📮 联系人',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50'
      };
  }
}
