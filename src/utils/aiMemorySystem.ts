/**
 * 🧠 AI记忆系统
 * 
 * 设计理念：
 * - 用户可见：教过的词语列表、识字量、成长数据
 * - AI独有（后台）：深度理解、对话记录、学习细节、对用户的了解
 * 
 * 存储架构：
 * - 全部存储在IndexedDB中，防止内存过载
 * - conversations: AI的基本数据和用户可见信息
 * - ai_memory_banks: AI的后台记忆库（用户不可见）
 */

import { smartLoad, smartSave } from './storage';
import { Message } from '../types';

/**
 * AI的后台记忆（用户不可见）
 */
export interface AIMemoryBank {
  childId: string;
  
  // 对话记忆（所有历史对话）
  conversationHistory: ConversationMemory[];
  
  // 词汇深度理解（每个词的学习过程）
  wordDeepUnderstanding: WordMemory[];
  
  // 对用户的了解
  userProfile: UserMemory;
  
  // 学习笔记（AI的内部思考）
  learningNotes: LearningNote[];
  
  // 最后更新时间
  lastUpdated: number;
}

/**
 * 对话记忆
 */
export interface ConversationMemory {
  id: string;
  timestamp: number;
  messages: Message[];
  context: string;              // 对话背景
  emotionalTone: string;        // 情感基调
  learnedFromThis: string[];    // 从这次对话学到的词
}

/**
 * 词汇深度记忆
 */
export interface WordMemory {
  word: string;
  userDefinition: string;       // 用户教的定义（原文）
  learnedAt: number;
  learnedFrom: 'wordcard' | 'chat' | 'topic' | 'reading';
  
  // AI的深度理解（后台）
  usageExamples: string[];      // AI自己使用过的例子
  associatedWords: string[];    // 关联的其他词
  emotionalTag: string[];       // 情感标签
  difficultyLevel: number;      // AI自己评估的难度
  confidenceLevel: number;      // AI对这个词的掌握度(0-100)
  
  // 学习历程
  reviewHistory: {
    timestamp: number;
    context: string;
    performance: number;        // 使用正确度
  }[];
}

/**
 * 对用户的了解
 */
export interface UserMemory {
  // 用户的教学风格
  teachingStyle: {
    patience: number;           // 耐心程度
    detailLevel: number;        // 解释详细度
    encouragement: number;      // 鼓励频率
  };
  
  // 用户的偏好
  preferences: {
    favoriteTopics: string[];   // 常讨论的话题
    teachingTime: string[];     // 常教学的时间段
    interactionStyle: string;   // 互动风格（严格/轻松/游戏化）
  };
  
  // 用户的情感模式
  emotionalPatterns: {
    commonMoods: string[];      // 常见情绪
    supportNeeds: string[];     // 支持需求
  };
}

/**
 * 学习笔记
 */
export interface LearningNote {
  id: string;
  timestamp: number;
  type: 'insight' | 'confusion' | 'milestone' | 'question';
  content: string;
  relatedWords: string[];
}

/**
 * 获取AI的记忆库
 */
export async function getAIMemoryBank(childId: string): Promise<AIMemoryBank> {
  try {
    const banks = await smartLoad('ai_memory_banks') as Record<string, AIMemoryBank> || {};
    
    if (!banks[childId]) {
      // 初始化新的记忆库
      banks[childId] = createEmptyMemoryBank(childId);
      await smartSave('ai_memory_banks', banks);
    }
    
    return banks[childId];
  } catch (error) {
    console.error('获取记忆库失败:', error);
    return createEmptyMemoryBank(childId);
  }
}

/**
 * 保存AI的记忆库
 */
export async function saveAIMemoryBank(memoryBank: AIMemoryBank): Promise<void> {
  try {
    const banks = await smartLoad('ai_memory_banks') as Record<string, AIMemoryBank> || {};
    banks[memoryBank.childId] = memoryBank;
    memoryBank.lastUpdated = Date.now();
    await smartSave('ai_memory_banks', banks);
  } catch (error) {
    console.error('保存记忆库失败:', error);
  }
}

/**
 * 记录对话到记忆库
 */
export async function recordConversation(
  childId: string,
  messages: Message[],
  context: string,
  learnedWords: string[] = []
): Promise<void> {
  try {
    const memoryBank = await getAIMemoryBank(childId);
    
    const conversationMemory: ConversationMemory = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      messages: messages.slice(-10), // 保留最近10条消息
      context,
      emotionalTone: detectEmotionalTone(messages),
      learnedFromThis: learnedWords
    };
    
    memoryBank.conversationHistory.push(conversationMemory);
    
    // 只保留最近100次对话
    if (memoryBank.conversationHistory.length > 100) {
      memoryBank.conversationHistory = memoryBank.conversationHistory.slice(-100);
    }
    
    await saveAIMemoryBank(memoryBank);
  } catch (error) {
    console.error('记录对话失败:', error);
  }
}

/**
 * 记录词汇学习到记忆库
 */
export async function recordWordLearning(
  childId: string,
  word: string,
  userDefinition: string,
  learnedFrom: WordMemory['learnedFrom'],
  context?: string
): Promise<void> {
  try {
    const memoryBank = await getAIMemoryBank(childId);
    
    // 检查是否已存在
    let wordMemory = memoryBank.wordDeepUnderstanding.find(w => w.word === word);
    
    if (!wordMemory) {
      // 新词
      wordMemory = {
        word,
        userDefinition,
        learnedAt: Date.now(),
        learnedFrom,
        usageExamples: [],
        associatedWords: [],
        emotionalTag: [],
        difficultyLevel: estimateDifficulty(word, userDefinition),
        confidenceLevel: 20, // 刚学会，信心度20%
        reviewHistory: []
      };
      memoryBank.wordDeepUnderstanding.push(wordMemory);
    } else {
      // 已存在，更新定义（用户可能重新教了）
      wordMemory.userDefinition = userDefinition;
      wordMemory.confidenceLevel = Math.min(100, wordMemory.confidenceLevel + 10);
    }
    
    // 添加复习记录
    if (context) {
      wordMemory.reviewHistory.push({
        timestamp: Date.now(),
        context,
        performance: 80 // 默认表现良好
      });
    }
    
    await saveAIMemoryBank(memoryBank);
  } catch (error) {
    console.error('记录词汇学习失败:', error);
  }
}

/**
 * 获取AI对某个词的深度理解
 */
export async function getWordMemory(childId: string, word: string): Promise<WordMemory | null> {
  try {
    const memoryBank = await getAIMemoryBank(childId);
    return memoryBank.wordDeepUnderstanding.find(w => w.word === word) || null;
  } catch (error) {
    console.error('获取词汇记忆失败:', error);
    return null;
  }
}

/**
 * 批量获取词汇记忆（供AI调用）
 * @param childId AI儿童ID
 * @param words 词汇列表
 * @returns 词汇记忆数组
 */
export async function getMultipleWordMemories(
  childId: string, 
  words: string[]
): Promise<WordMemory[]> {
  try {
    const memoryBank = await getAIMemoryBank(childId);
    return words
      .map(word => memoryBank.wordDeepUnderstanding.find(w => w.word === word))
      .filter((m): m is WordMemory => m !== undefined);
  } catch (error) {
    console.error('批量获取词汇记忆失败:', error);
    return [];
  }
}

/**
 * 获取所有词汇记忆摘要（供对话上下文使用）
 * @param childId AI儿童ID
 * @param limit 返回数量限制
 * @returns 格式化的词汇摘要
 */
export async function getVocabularyMemorySummary(
  childId: string,
  limit: number = 30
): Promise<string> {
  try {
    const memoryBank = await getAIMemoryBank(childId);
    const recentWords = memoryBank.wordDeepUnderstanding.slice(-limit);
    
    if (recentWords.length === 0) {
      return '还没有学会任何词';
    }
    
    return recentWords.map(w => {
      const confidence = w.confidenceLevel >= 80 ? '✅' : 
                        w.confidenceLevel >= 50 ? '⚡' : '🌱';
      return `${confidence} ${w.word}：${w.userDefinition}`;
    }).join('\n');
  } catch (error) {
    console.error('获取词汇摘要失败:', error);
    return '词汇记忆获取失败';
  }
}

/**
 * 添加学习笔记
 */
export async function addLearningNote(
  childId: string,
  type: LearningNote['type'],
  content: string,
  relatedWords: string[] = []
): Promise<void> {
  try {
    const memoryBank = await getAIMemoryBank(childId);
    
    const note: LearningNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      content,
      relatedWords
    };
    
    memoryBank.learningNotes.push(note);
    
    // 只保留最近50条笔记
    if (memoryBank.learningNotes.length > 50) {
      memoryBank.learningNotes = memoryBank.learningNotes.slice(-50);
    }
    
    await saveAIMemoryBank(memoryBank);
  } catch (error) {
    console.error('添加学习笔记失败:', error);
  }
}

/**
 * 更新对用户的了解
 */
export async function updateUserMemory(
  childId: string,
  updates: Partial<UserMemory>
): Promise<void> {
  try {
    const memoryBank = await getAIMemoryBank(childId);
    memoryBank.userProfile = {
      ...memoryBank.userProfile,
      ...updates
    };
    await saveAIMemoryBank(memoryBank);
  } catch (error) {
    console.error('更新用户记忆失败:', error);
  }
}

/**
 * 获取长期记忆摘要（用于系统提示词）
 */
export async function getLongTermMemorySummary(childId: string): Promise<string> {
  try {
    const memoryBank = await getAIMemoryBank(childId);
    
    // 最近的重要对话
    const recentImportant = memoryBank.conversationHistory
      .slice(-5)
      .filter(c => c.learnedFromThis.length > 0)
      .map(c => `- ${new Date(c.timestamp).toLocaleDateString()}: ${c.context}`)
      .join('\n');
    
    // 掌握最好的词
    const masteredWords = memoryBank.wordDeepUnderstanding
      .filter(w => w.confidenceLevel >= 80)
      .map(w => w.word)
      .slice(0, 10)
      .join('、');
    
    // 最近的学习笔记
    const recentNotes = memoryBank.learningNotes
      .slice(-3)
      .map(n => `- ${n.content}`)
      .join('\n');
    
    return `
【长期记忆】
最近重要对话：
${recentImportant || '还没有重要对话'}

掌握很好的词：${masteredWords || '还在学习中'}

最近的思考：
${recentNotes || '还没有特别的思考'}
`.trim();
  } catch (error) {
    console.error('获取长期记忆摘要失败:', error);
    return '';
  }
}

/**
 * 创建空的记忆库
 */
function createEmptyMemoryBank(childId: string): AIMemoryBank {
  return {
    childId,
    conversationHistory: [],
    wordDeepUnderstanding: [],
    userProfile: {
      teachingStyle: {
        patience: 50,
        detailLevel: 50,
        encouragement: 50
      },
      preferences: {
        favoriteTopics: [],
        teachingTime: [],
        interactionStyle: 'balanced'
      },
      emotionalPatterns: {
        commonMoods: [],
        supportNeeds: []
      }
    },
    learningNotes: [],
    lastUpdated: Date.now()
  };
}

/**
 * 检测对话的情感基调
 */
function detectEmotionalTone(messages: Message[]): string {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) return 'neutral';
  
  const content = lastMessage.content.toLowerCase();
  
  if (content.includes('开心') || content.includes('高兴') || content.includes('😊') || content.includes('😄')) {
    return 'happy';
  }
  if (content.includes('难过') || content.includes('伤心') || content.includes('😢') || content.includes('😭')) {
    return 'sad';
  }
  if (content.includes('生气') || content.includes('愤怒') || content.includes('😠') || content.includes('😡')) {
    return 'angry';
  }
  
  return 'neutral';
}

/**
 * 估算词汇难度
 */
function estimateDifficulty(word: string, definition: string): number {
  // 简单估算：根据字数和定义长度
  const wordLength = word.length;
  const defLength = definition.length;
  
  if (wordLength <= 2 && defLength <= 15) return 1;
  if (wordLength <= 3 && defLength <= 30) return 2;
  return 3;
}
