/**
 * 匿名信件合并工具
 * 将同一用户发给同一角色的所有匿名信件合并到一个ID下
 */

import { Letter } from '../types/letter';
import { getLettersFromStorage, updateLetterInStorage } from './letterService';
import { getCachedData, setCachedData, save } from './storage';

const STORAGE_KEY = 'slow_letters';
const ANONYMOUS_USER_ID = 'anonymous_user'; // 统一的匿名用户ID

/**
 * 合并匿名信件
 * 将所有发给同一角色的匿名信件合并到一个统一的匿名ID下
 */
export function mergeAnonymousLetters(): {
  merged: number;
  totalAnonymous: number;
} {
  const letters = getLettersFromStorage();
  
  // 按收件人分组匿名信件
  const anonymousLettersByReceiver = new Map<string, Letter[]>();
  
  letters.forEach(letter => {
    // 只处理匿名信件（非漂流瓶）
    if (letter.isAnonymous && !letter.isBottle && letter.senderId === 'user') {
      const receiverId = letter.receiverId;
      
      if (!anonymousLettersByReceiver.has(receiverId)) {
        anonymousLettersByReceiver.set(receiverId, []);
      }
      
      anonymousLettersByReceiver.get(receiverId)!.push(letter);
    }
  });
  
  let mergedCount = 0;
  const totalAnonymous = Array.from(anonymousLettersByReceiver.values())
    .reduce((sum, letters) => sum + letters.length, 0);
  
  // 对每个收件人的匿名信件进行合并
  anonymousLettersByReceiver.forEach((receiverLetters, receiverId) => {
    if (receiverLetters.length > 1) {
      // 找到最早的信件作为主信件
      const sortedLetters = receiverLetters.sort((a, b) => a.sentAt - b.sentAt);
      const mainLetter = sortedLetters[0];
      
      // 将其他信件的对话轮次合并到主信件
      for (let i = 1; i < sortedLetters.length; i++) {
        const letterToMerge = sortedLetters[i];
        
        // 合并对话轮次
        mainLetter.conversationRounds.push(...letterToMerge.conversationRounds);
        
        // 更新当前轮数
        mainLetter.currentRound = Math.max(
          mainLetter.currentRound,
          letterToMerge.currentRound
        );
        
        // 如果有未回复的信件，更新状态
        if (letterToMerge.status === 'sent' || letterToMerge.status === 'delivered') {
          mainLetter.status = letterToMerge.status;
          mainLetter.willReplyAt = letterToMerge.willReplyAt;
          mainLetter.hasUrged = letterToMerge.hasUrged;
        }
        
        // 标记被合并的信件为已归档
        letterToMerge.isArchived = true;
        letterToMerge.archivedAt = Date.now();
        updateLetterInStorage(letterToMerge);
        
        mergedCount++;
      }
      
      // 更新主信件
      updateLetterInStorage(mainLetter);
      
      console.log(`📬 合并了 ${receiverLetters.length} 封发给 ${mainLetter.receiverName} 的匿名信件`);
    }
  });
  
  return {
    merged: mergedCount,
    totalAnonymous
  };
}

/**
 * 检查并自动合并匿名信件
 * 在发送新匿名信件时调用
 */
export function checkAndMergeAnonymousLetters(receiverId: string): Letter | null {
  const letters = getLettersFromStorage();
  
  // 查找发给同一收件人的现有匿名信件
  const existingAnonymousLetter = letters.find(letter => 
    letter.receiverId === receiverId &&
    letter.isAnonymous &&
    !letter.isBottle &&
    letter.senderId === 'user' &&
    !letter.isArchived
  );
  
  return existingAnonymousLetter || null;
}

/**
 * 获取匿名信件统计
 */
export function getAnonymousLetterStats(): {
  totalAnonymous: number;
  byReceiver: Map<string, { receiverName: string; count: number }>;
} {
  const letters = getLettersFromStorage();
  
  const anonymousLetters = letters.filter(letter => 
    letter.isAnonymous &&
    !letter.isBottle &&
    letter.senderId === 'user' &&
    !letter.isArchived
  );
  
  const byReceiver = new Map<string, { receiverName: string; count: number }>();
  
  anonymousLetters.forEach(letter => {
    const receiverId = letter.receiverId;
    
    if (!byReceiver.has(receiverId)) {
      byReceiver.set(receiverId, {
        receiverName: letter.receiverName,
        count: 0
      });
    }
    
    byReceiver.get(receiverId)!.count++;
  });
  
  return {
    totalAnonymous: anonymousLetters.length,
    byReceiver
  };
}
