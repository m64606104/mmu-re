/**
 * AI笔友备注名管理器
 * 管理用户给AI设置的备注名功能
 */

import { getAllLetters } from './letterService';
import type { Letter } from '../types/letter';

interface NicknameRecord {
  receiverId: string;
  nickname: string;
  originalName: string;
  avatar: string;
  updatedAt: number;
}

const NICKNAME_STORAGE_KEY = 'ai_nicknames';

/**
 * 获取所有备注名记录
 */
function getNicknameRecords(): NicknameRecord[] {
  const saved = localStorage.getItem(NICKNAME_STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

/**
 * 保存备注名记录
 */
function saveNicknameRecords(records: NicknameRecord[]): void {
  localStorage.setItem(NICKNAME_STORAGE_KEY, JSON.stringify(records));
}

/**
 * 设置AI笔友备注名
 */
export function setAINickname(
  receiverId: string, 
  nickname: string, 
  originalName: string, 
  avatar: string
): boolean {
  try {
    const records = getNicknameRecords();
    const existingIndex = records.findIndex(r => r.receiverId === receiverId);
    
    const newRecord: NicknameRecord = {
      receiverId,
      nickname: nickname.trim(),
      originalName,
      avatar,
      updatedAt: Date.now()
    };
    
    if (existingIndex >= 0) {
      records[existingIndex] = newRecord;
    } else {
      records.push(newRecord);
    }
    
    saveNicknameRecords(records);
    
    // 更新所有相关信件的备注名
    updateLettersWithNickname(receiverId, nickname);
    
    return true;
  } catch (error) {
    console.error('设置备注名失败:', error);
    return false;
  }
}

/**
 * 获取AI的备注名
 */
export function getAINickname(receiverId: string): string | null {
  const records = getNicknameRecords();
  const record = records.find(r => r.receiverId === receiverId);
  return record ? record.nickname : null;
}

/**
 * 删除AI备注名
 */
export function removeAINickname(receiverId: string): boolean {
  try {
    const records = getNicknameRecords();
    const filteredRecords = records.filter(r => r.receiverId !== receiverId);
    saveNicknameRecords(filteredRecords);
    
    // 清除所有相关信件的备注名
    updateLettersWithNickname(receiverId, null);
    
    return true;
  } catch (error) {
    console.error('删除备注名失败:', error);
    return false;
  }
}

/**
 * 获取AI显示名称（备注名 > 原名）
 */
export function getAIDisplayName(receiverId: string, originalName: string): string {
  const nickname = getAINickname(receiverId);
  return nickname || originalName;
}

/**
 * 更新所有相关信件的备注名
 */
function updateLettersWithNickname(receiverId: string, nickname: string | null): void {
  const letters = getAllLetters();
  
  letters.forEach((letter: Letter) => {
    if (letter.receiverId === receiverId) {
      letter.receiverNickname = nickname || undefined;
      
      // 同时更新bottleAIProfile中的备注名
      if (letter.bottleAIProfile && letter.bottleAIProfile.id === receiverId) {
        letter.bottleAIProfile.nickname = nickname || undefined;
      }
      
      // 保存更新后的信件到localStorage
      const allLetters = getAllLetters();
      const updatedLetters = allLetters.map(l => l.id === letter.id ? letter : l);
      localStorage.setItem('slow_letters', JSON.stringify(updatedLetters));
    }
  });
}

/**
 * 获取所有已设置备注名的AI列表
 */
export function getAllNicknamedAIs(): Array<{
  receiverId: string;
  nickname: string;
  originalName: string;
  avatar: string;
  letterCount: number;
  lastContactAt: number;
}> {
  const records = getNicknameRecords();
  const letters = getAllLetters();
  
  return records.map(record => {
    const aiLetters = letters.filter((l: Letter) => l.receiverId === record.receiverId && !l.isArchived);
    const lastLetter = aiLetters.sort((a: Letter, b: Letter) => b.sentAt - a.sentAt)[0];
    
    return {
      receiverId: record.receiverId,
      nickname: record.nickname,
      originalName: record.originalName,
      avatar: record.avatar,
      letterCount: aiLetters.length,
      lastContactAt: lastLetter ? lastLetter.sentAt : record.updatedAt
    };
  }).sort((a, b) => b.lastContactAt - a.lastContactAt);
}

/**
 * 搜索AI笔友（按备注名和原名）
 */
export function searchAIFriends(query: string): Array<{
  receiverId: string;
  nickname?: string;
  originalName: string;
  avatar: string;
  matchType: 'nickname' | 'original';
}> {
  if (!query.trim()) return [];
  
  const records = getNicknameRecords();
  const results: Array<{
    receiverId: string;
    nickname?: string;
    originalName: string;
    avatar: string;
    matchType: 'nickname' | 'original';
  }> = [];
  
  const lowerQuery = query.toLowerCase();
  
  records.forEach(record => {
    // 匹配备注名
    if (record.nickname.toLowerCase().includes(lowerQuery)) {
      results.push({
        receiverId: record.receiverId,
        nickname: record.nickname,
        originalName: record.originalName,
        avatar: record.avatar,
        matchType: 'nickname'
      });
    }
    // 匹配原名
    else if (record.originalName.toLowerCase().includes(lowerQuery)) {
      results.push({
        receiverId: record.receiverId,
        nickname: record.nickname,
        originalName: record.originalName,
        avatar: record.avatar,
        matchType: 'original'
      });
    }
  });
  
  return results;
}

/**
 * 清理无效的备注名记录（没有对应信件的AI）
 */
export function cleanupNicknameRecords(): number {
  const records = getNicknameRecords();
  const letters = getAllLetters();
  const activeReceiverIds = new Set(letters.map((l: Letter) => l.receiverId));
  
  const validRecords = records.filter(record => 
    activeReceiverIds.has(record.receiverId)
  );
  
  const removedCount = records.length - validRecords.length;
  
  if (removedCount > 0) {
    saveNicknameRecords(validRecords);
  }
  
  return removedCount;
}

/**
 * 批量导入备注名
 */
export function importNicknames(nicknames: Array<{
  receiverId: string;
  nickname: string;
  originalName: string;
  avatar: string;
}>): number {
  let importedCount = 0;
  
  nicknames.forEach(item => {
    if (setAINickname(item.receiverId, item.nickname, item.originalName, item.avatar)) {
      importedCount++;
    }
  });
  
  return importedCount;
}

/**
 * 导出所有备注名
 */
export function exportNicknames(): Array<{
  receiverId: string;
  nickname: string;
  originalName: string;
  avatar: string;
  updatedAt: number;
}> {
  return getNicknameRecords();
}
