/**
 * 匿名信件管理器
 * 处理同一AI收到的多个匿名信分区和合并
 */

import { Letter } from '../types/letter';
import { getAllLetters } from './letterService';

export interface AnonymousGroup {
  anonymousName: string;
  letters: Letter[];
  totalRounds: number;
  lastActivity: number;
}

export interface AnonymousLetterData {
  receiverId: string;
  receiverName: string;
  hasMultipleAnonymous: boolean;
  groups: AnonymousGroup[];
  totalLetters: number;
}

/**
 * 检测同一AI是否有多个匿名身份的信件
 */
export function detectAnonymousGroups(receiverId: string): AnonymousLetterData {
  const allLetters = getAllLetters();
  const receiverLetters = allLetters.filter(l => 
    l.receiverId === receiverId && 
    l.isAnonymous && 
    !l.isArchived
  );

  if (receiverLetters.length === 0) {
    return {
      receiverId,
      receiverName: '',
      hasMultipleAnonymous: false,
      groups: [],
      totalLetters: 0
    };
  }

  // 按匿名名字分组
  const groupMap = new Map<string, Letter[]>();
  
  receiverLetters.forEach(letter => {
    const key = letter.anonymousName || '匿名';
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(letter);
  });

  // 转换为AnonymousGroup格式
  const groups: AnonymousGroup[] = Array.from(groupMap.entries()).map(([anonymousName, letters]) => {
    const totalRounds = letters.reduce((sum, letter) => sum + letter.conversationRounds.length, 0);
    const lastActivity = Math.max(...letters.map(l => {
      const roundTimes = l.conversationRounds.map(r => {
        const times = [r.userLetter.sentAt];
        if (r.aiReply) times.push(r.aiReply.repliedAt);
        return Math.max(...times);
      });
      return Math.max(...roundTimes);
    }));

    return {
      anonymousName,
      letters: letters.sort((a, b) => a.sentAt - b.sentAt), // 按发送时间排序
      totalRounds,
      lastActivity
    };
  });

  // 按最后活动时间排序
  groups.sort((a, b) => b.lastActivity - a.lastActivity);

  const firstLetter = receiverLetters[0];
  
  return {
    receiverId,
    receiverName: firstLetter.receiverName,
    hasMultipleAnonymous: groups.length > 1,
    groups,
    totalLetters: receiverLetters.length
  };
}

/**
 * 合并匿名身份到第一个身份
 */
export function mergeAnonymousIdentities(receiverId: string): {
  success: boolean;
  mergedCount: number;
  error?: string;
} {
  try {
    const anonymousData = detectAnonymousGroups(receiverId);
    
    if (!anonymousData.hasMultipleAnonymous) {
      return {
        success: false,
        mergedCount: 0,
        error: '没有找到多个匿名身份'
      };
    }

    const allLetters = getAllLetters();
    const primaryGroup = anonymousData.groups[0]; // 最近活动的组作为主要身份
    const targetAnonymousName = primaryGroup.anonymousName;

    let mergedCount = 0;

    // 更新所有信件使用同一个匿名身份
    anonymousData.groups.forEach((group, index) => {
      if (index === 0) return; // 跳过主要身份组

      group.letters.forEach(letter => {
        const letterIndex = allLetters.findIndex(l => l.id === letter.id);
        if (letterIndex >= 0) {
          allLetters[letterIndex].anonymousName = targetAnonymousName;
          mergedCount++;
        }
      });
    });

    // 保存到localStorage
    localStorage.setItem('slow_letters', JSON.stringify(allLetters));

    return {
      success: true,
      mergedCount,
    };
  } catch (error) {
    console.error('合并匿名身份失败:', error);
    return {
      success: false,
      mergedCount: 0,
      error: '合并过程中发生错误'
    };
  }
}

/**
 * 获取匿名身份统计
 */
export function getAnonymousStats(): {
  totalReceivers: number;
  multipleAnonymousReceivers: number;
  totalAnonymousGroups: number;
} {
  const allLetters = getAllLetters();
  const anonymousLetters = allLetters.filter(l => l.isAnonymous && !l.isArchived);
  
  // 按接收者分组
  const receiverMap = new Map<string, Set<string>>();
  
  anonymousLetters.forEach(letter => {
    if (!receiverMap.has(letter.receiverId)) {
      receiverMap.set(letter.receiverId, new Set());
    }
    receiverMap.get(letter.receiverId)!.add(letter.anonymousName || '匿名');
  });

  let multipleAnonymousReceivers = 0;
  let totalAnonymousGroups = 0;

  receiverMap.forEach((anonymousNames) => {
    totalAnonymousGroups += anonymousNames.size;
    if (anonymousNames.size > 1) {
      multipleAnonymousReceivers++;
    }
  });

  return {
    totalReceivers: receiverMap.size,
    multipleAnonymousReceivers,
    totalAnonymousGroups
  };
}

/**
 * 获取需要合并的接收者列表
 */
export function getReceiversNeedingMerge(): Array<{
  receiverId: string;
  receiverName: string;
  anonymousCount: number;
  letterCount: number;
}> {
  const allLetters = getAllLetters();
  const anonymousLetters = allLetters.filter(l => l.isAnonymous && !l.isArchived);
  
  // 按接收者分组
  const receiverMap = new Map<string, {
    receiverName: string;
    anonymousNames: Set<string>;
    letterCount: number;
  }>();
  
  anonymousLetters.forEach(letter => {
    if (!receiverMap.has(letter.receiverId)) {
      receiverMap.set(letter.receiverId, {
        receiverName: letter.receiverName,
        anonymousNames: new Set(),
        letterCount: 0
      });
    }
    const data = receiverMap.get(letter.receiverId)!;
    data.anonymousNames.add(letter.anonymousName || '匿名');
    data.letterCount++;
  });

  const result: Array<{
    receiverId: string;
    receiverName: string;
    anonymousCount: number;
    letterCount: number;
  }> = [];

  receiverMap.forEach((data, receiverId) => {
    if (data.anonymousNames.size > 1) {
      result.push({
        receiverId,
        receiverName: data.receiverName,
        anonymousCount: data.anonymousNames.size,
        letterCount: data.letterCount
      });
    }
  });

  // 按信件数量排序
  result.sort((a, b) => b.letterCount - a.letterCount);

  return result;
}

/**
 * 预览合并效果
 */
export function previewMerge(receiverId: string): {
  success: boolean;
  preview?: {
    targetIdentity: string;
    mergeGroups: Array<{
      anonymousName: string;
      letterCount: number;
      roundCount: number;
    }>;
    totalMergedLetters: number;
  };
  error?: string;
} {
  try {
    const anonymousData = detectAnonymousGroups(receiverId);
    
    if (!anonymousData.hasMultipleAnonymous) {
      return {
        success: false,
        error: '没有找到多个匿名身份'
      };
    }

    const targetIdentity = anonymousData.groups[0].anonymousName;
    const mergeGroups = anonymousData.groups.slice(1).map(group => ({
      anonymousName: group.anonymousName,
      letterCount: group.letters.length,
      roundCount: group.totalRounds
    }));

    const totalMergedLetters = mergeGroups.reduce((sum, group) => sum + group.letterCount, 0);

    return {
      success: true,
      preview: {
        targetIdentity,
        mergeGroups,
        totalMergedLetters
      }
    };
  } catch (error) {
    return {
      success: false,
      error: '预览失败'
    };
  }
}
