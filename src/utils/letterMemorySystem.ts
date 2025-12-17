/**
 * 信件记忆库系统
 * 为私聊角色记录与用户的信件交流历史
 * 独立于私聊记忆，专门用于记录慢邮件交流
 */

import { Letter } from '../types/letter';
import { getCachedData, setCachedData, save } from './storage';

const STORAGE_KEY = 'letter_memories';

/**
 * 信件记忆条目
 */
export interface LetterMemory {
  conversationId: string;  // 对应的私聊角色ID
  aiId: string;  // AI的receiverId
  aiName: string;  // AI名字
  memories: LetterMemoryEntry[];  // 记忆条目列表
  lastUpdated: number;  // 最后更新时间
}

/**
 * 单条信件记忆
 */
export interface LetterMemoryEntry {
  id: string;  // 记忆ID
  letterId: string;  // 对应的信件ID
  roundNumber: number;  // 第几轮交流
  userContent: string;  // 用户写的内容
  aiReply?: string;  // AI的回复
  summary: string;  // 这轮交流的摘要
  sentAt: number;  // 寄信时间
  repliedAt?: number;  // 回信时间
  isAnonymous?: boolean;  // 是否匿名
}

/**
 * 获取所有信件记忆
 */
export function getAllLetterMemories(): LetterMemory[] {
  const cached = getCachedData<LetterMemory[]>(STORAGE_KEY);
  if (cached) return cached;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  try {
    const memories = JSON.parse(stored);
    setCachedData(STORAGE_KEY, memories);
    return memories;
  } catch (error) {
    console.error('读取信件记忆失败:', error);
    return [];
  }
}

/**
 * 保存信件记忆
 */
function saveLetterMemories(memories: LetterMemory[]): void {
  setCachedData(STORAGE_KEY, memories);
  save(STORAGE_KEY, memories).catch(err => 
    console.error('保存信件记忆失败:', err)
  );
}

/**
 * 获取指定角色的信件记忆
 */
export function getLetterMemoryByConversationId(conversationId: string): LetterMemory | null {
  const memories = getAllLetterMemories();
  return memories.find(m => m.conversationId === conversationId) || null;
}

/**
 * 获取指定AI的信件记忆（通过AI的receiverId）
 */
export function getLetterMemoryByAIId(aiId: string): LetterMemory | null {
  const memories = getAllLetterMemories();
  return memories.find(m => m.aiId === aiId) || null;
}

/**
 * 从信件更新记忆库
 */
export function updateLetterMemoryFromLetter(letter: Letter, conversationId?: string): void {
  const memories = getAllLetterMemories();
  
  // 查找或创建记忆库
  let memory = memories.find(m => m.aiId === letter.receiverId);
  
  if (!memory) {
    memory = {
      conversationId: conversationId || '',
      aiId: letter.receiverId,
      aiName: letter.receiverName,
      memories: [],
      lastUpdated: Date.now(),
    };
    memories.push(memory);
  }
  
  // 如果有conversationId，更新关联
  if (conversationId && memory.conversationId !== conversationId) {
    memory.conversationId = conversationId;
  }
  
  // 处理每一轮交流
  letter.conversationRounds.forEach(round => {
    // 检查是否已存在
    const existingIndex = memory!.memories.findIndex(
      m => m.letterId === letter.id && m.roundNumber === round.roundNumber
    );
    
    // 生成摘要
    const summary = generateRoundSummary(round.userLetter.content, round.aiReply?.content);
    
    const entry: LetterMemoryEntry = {
      id: `${letter.id}_round_${round.roundNumber}`,
      letterId: letter.id,
      roundNumber: round.roundNumber,
      userContent: round.userLetter.content,
      aiReply: round.aiReply?.content,
      summary,
      sentAt: round.userLetter.sentAt,
      repliedAt: round.aiReply?.repliedAt,
      isAnonymous: letter.isAnonymous,
    };
    
    if (existingIndex >= 0) {
      // 更新现有记忆
      memory!.memories[existingIndex] = entry;
    } else {
      // 添加新记忆
      memory!.memories.push(entry);
    }
  });
  
  // 按时间排序
  memory.memories.sort((a, b) => a.sentAt - b.sentAt);
  memory.lastUpdated = Date.now();
  
  saveLetterMemories(memories);
  console.log(`📮 更新了${letter.receiverName}的信件记忆，共${memory.memories.length}条`);
}

/**
 * 生成单轮交流的摘要
 */
function generateRoundSummary(userContent: string, aiReply?: string): string {
  const userPreview = userContent.length > 50 
    ? userContent.substring(0, 50) + '...' 
    : userContent;
  
  if (aiReply) {
    const aiPreview = aiReply.length > 50 
      ? aiReply.substring(0, 50) + '...' 
      : aiReply;
    return `用户说：${userPreview} | AI回复：${aiPreview}`;
  }
  
  return `用户说：${userPreview} | 等待回复`;
}

/**
 * 格式化信件记忆为文本（用于AI上下文）
 */
export function formatLetterMemoryForAI(conversationId: string): string {
  const memory = getLetterMemoryByConversationId(conversationId);
  
  if (!memory || memory.memories.length === 0) {
    return '';
  }
  
  const memoryText = memory.memories.map((entry, index) => {
    const anonymousTag = entry.isAnonymous ? '（匿名）' : '';
    const replyStatus = entry.aiReply ? '已回复' : '未回复';
    
    return `【第${entry.roundNumber}轮信件${anonymousTag}】（${replyStatus}）
用户写信：${entry.userContent.substring(0, 100)}${entry.userContent.length > 100 ? '...' : ''}
${entry.aiReply ? `我回信：${entry.aiReply.substring(0, 100)}${entry.aiReply.length > 100 ? '...' : ''}` : ''}`;
  }).join('\n\n');
  
  return `
【📮 信件交流记忆】
你和这个用户之前通过慢邮件交流过，以下是你们的信件往来记录：

${memoryText}

⚠️ 重要：这些是你们通过慢邮件（不是即时聊天）交流的内容。你需要记住这些交流，在私聊时可以自然地提及。
`;
}

/**
 * 关联笔友码添加的角色与信件记忆
 */
export function linkPenPalToLetterMemory(conversationId: string, letterId: string): void {
  const memories = getAllLetterMemories();
  
  // 通过letterId找到对应的信件，获取aiId
  const { getLettersFromStorage } = require('./letterService');
  const letters = getLettersFromStorage();
  const letter = letters.find((l: Letter) => l.id === letterId);
  
  if (!letter) {
    console.error('找不到信件:', letterId);
    return;
  }
  
  // 查找或创建记忆库
  let memory = memories.find(m => m.aiId === letter.receiverId);
  
  if (memory) {
    memory.conversationId = conversationId;
    memory.lastUpdated = Date.now();
    saveLetterMemories(memories);
    console.log(`🔗 关联笔友${letter.receiverName}的信件记忆到私聊角色`);
  } else {
    // 如果还没有记忆，从信件创建
    updateLetterMemoryFromLetter(letter, conversationId);
  }
}

/**
 * 获取信件记忆统计
 */
export function getLetterMemoryStats(conversationId: string): {
  totalLetters: number;
  totalRounds: number;
  anonymousCount: number;
  lastLetterDate: number | null;
} {
  const memory = getLetterMemoryByConversationId(conversationId);
  
  if (!memory) {
    return {
      totalLetters: 0,
      totalRounds: 0,
      anonymousCount: 0,
      lastLetterDate: null,
    };
  }
  
  const letterIds = new Set(memory.memories.map(m => m.letterId));
  
  return {
    totalLetters: letterIds.size,
    totalRounds: memory.memories.length,
    anonymousCount: memory.memories.filter(m => m.isAnonymous).length,
    lastLetterDate: memory.memories.length > 0 
      ? memory.memories[memory.memories.length - 1].sentAt 
      : null,
  };
}

/**
 * 清理指定角色的信件记忆
 */
export function clearLetterMemory(conversationId: string): void {
  const memories = getAllLetterMemories();
  const filtered = memories.filter(m => m.conversationId !== conversationId);
  saveLetterMemories(filtered);
  console.log(`🗑️ 清理了信件记忆`);
}
