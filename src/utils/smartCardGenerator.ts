/**
 * 🎯 智能词卡生成系统
 * 基于AI的成长阶段和已学词汇，动态生成适合的词卡
 */

import { WordCard } from './wordCardLibrary';
import { ApiConfig } from '../types';
import { smartLoad, smartSave } from './storage';

export interface DailyCardPool {
  date: string;
  rounds: WordCard[][];  // 已生成的轮次
  selectedWords: string[];  // 当天已选择的词
  lastRoundWords: string[];  // 上一轮显示的词（用于限制重复）
  allWords: WordCard[];  // 所有已生成的词
  isEmergencyMode?: boolean;  // 是否使用了应急词库（API失败时）
  generatedCount: number;  // 已生成的词数
  useEmergencyForNext?: boolean;  // 下次是否直接使用应急词库
}

/**
 * 强制重新生成词卡（删除缓存）
 */
export async function forceRegenerateCards(childId: string): Promise<void> {
  const allPools = await smartLoad('daily_card_pools') as Record<string, DailyCardPool> || {};
  delete allPools[childId]; // 删除该AI的词卡缓存
  await smartSave('daily_card_pools', allPools);
  console.log('🔄 已清除词卡缓存，下次将重新生成');
}

/**
 * 🚨 紧急修复：清除所有占位符词卡缓存
 */
export async function clearAllPlaceholderCards(): Promise<void> {
  console.log('🚨 开始清除所有占位符词卡...');
  
  // 清除所有词卡池缓存
  await smartSave('daily_card_pools', {});
  
  // 强制使用应急词库模式
  console.log('✅ 已清除所有缓存，强制使用应急词库');
}

/**
 * 🎯 按需生成词卡（一次生成4个词）
 * 用户点击"换一批"时才生成下一批，大幅提升响应速度
 */
export async function generateDailyCards(
  childId: string,
  _vocabularyCount: number,
  learnedWords: string[],
  _stage: string,
  _apiConfig: ApiConfig
): Promise<DailyCardPool> {
  const today = new Date().toDateString();
  
  // 从 IndexedDB 获取所有AI的词卡池
  const allPools = await smartLoad('daily_card_pools') as Record<string, DailyCardPool> || {};
  let pool = allPools[childId];
  
  // 🚨 紧急修复：强制清除所有缓存，重新生成
  console.log('🚨 强制清除缓存，使用应急词库');
  pool = {
    date: today,
    rounds: [],
    selectedWords: [],
    lastRoundWords: [],
    allWords: [],
    generatedCount: 0,
    isEmergencyMode: true,
    useEmergencyForNext: true
  };
  
  // 如果还没有生成任何词，或者需要生成下一批
  if (pool.rounds.length === 0) {
    // 🚨 紧急修复：直接使用应急词库，不尝试API
    console.log('🚨 直接使用应急词库生成词卡');
    const emergencyBatch = getEmergencyBatch(pool, learnedWords);
    pool.rounds.push(emergencyBatch);
    pool.allWords.push(...emergencyBatch);
    pool.generatedCount += emergencyBatch.length;
    pool.isEmergencyMode = true;
    
    allPools[childId] = pool;
    await smartSave('daily_card_pools', allPools);
  }
  
  return pool;
}

/**
 * 获取应急词库（当API失败时使用）
 */
function getEmergencyWords(): WordCard[] {
  const emergencyWords = [
    '苹果', '香蕉', '橙子', '西瓜', '草莓', '葡萄', '梨', '桃子', '柠檬', '芒果',
    '狗', '猫', '鸟', '鱼', '兔子', '熊', '猴子', '老虎', '狮子', '大象',
    '红色', '蓝色', '黄色', '绿色', '黑色', '白色', '粉色', '紫色', '橙色', '灰色',
    '妈妈', '爸爸', '哥哥', '姐姐', '弟弟', '妹妹', '爷爷', '奶奶', '叔叔', '阿姨',
    '吃', '喝', '睡', '玩', '跑', '跳', '笑', '哭', '唱', '跳舞',
    '大', '小', '高', '矮', '快', '慢', '多', '少', '好', '坏'
  ];
  
  return emergencyWords.map((word, i) => ({
    id: `emergency_${Date.now()}_${i}`,
    word,
    emoji: '📚',
    definition: `请用户自己定义"${word}"的含义`,
    difficulty: 1 as 1 | 2 | 3,
    category: '基础',
    examples: []
  }));
}

/**
 * 📚 从应急词库获取一批4个词
 */
function getEmergencyBatch(pool: DailyCardPool, learnedWords: string[]): WordCard[] {
  const allEmergencyWords = getEmergencyWords();
  const usedWords = new Set([...pool.allWords.map(w => w.word), ...learnedWords]);
  
  // 过滤已使用的词
  const availableWords = allEmergencyWords.filter(w => !usedWords.has(w.word));
  
  // 如果应急词库也用完了，重置使用状态
  if (availableWords.length < 4) {
    const recentUsed = pool.allWords.slice(-20).map(w => w.word);
    const recyclableWords = allEmergencyWords.filter(w => 
      !recentUsed.includes(w.word) && !learnedWords.includes(w.word)
    );
    
    if (recyclableWords.length >= 4) {
      return recyclableWords.slice(0, 4);
    }
    
    // 实在没词了，返回任意4个
    return allEmergencyWords.slice(0, 4);
  }
  
  // 打乱并返回4个
  const shuffled = availableWords.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4);
}

// 🚨 已移除所有API相关函数，仅使用应急词库

/**
 * 🔄 获取下一轮词卡（按需生成模式）
 * - 如果当前批次还有未选的词，继续显示
 * - 如果当前批次用完了，触发生成下一批
 */
export async function getNextRound(
  pool: DailyCardPool,
  childId: string,
  _vocabularyCount: number,
  learnedWords: string[],
  _stage: string,
  _apiConfig: ApiConfig
): Promise<WordCard[]> {
  // 获取所有未选过的词
  const availableWords = pool.allWords.filter(card => !pool.selectedWords.includes(card.word));
  
  // 如果可用词汇不足4个，生成新的一批
  if (availableWords.length < 4) {
    console.log('🔄 当前批次用完，直接用应急词库生成下一批...');
    
    // 🚨 直接使用应急词库
    const emergencyBatch = getEmergencyBatch(pool, learnedWords);
    pool.rounds.push(emergencyBatch);
    pool.allWords.push(...emergencyBatch);
    pool.generatedCount += emergencyBatch.length;
    pool.isEmergencyMode = true;
    
    console.log(`✅ 应急词库生成了4个词：${emergencyBatch.map(w => w.word).join('、')}`);
    
    // 保存更新后的pool
    const allPools = await smartLoad('daily_card_pools') as Record<string, DailyCardPool> || {};
    allPools[childId] = pool;
    await smartSave('daily_card_pools', allPools);
    
    // 重新获取可用词汇
    return pool.allWords.filter(card => !pool.selectedWords.includes(card.word)).slice(0, 4);
  }
  
  // 返回4张新卡
  return availableWords.slice(0, 4);
}

/**
 * 标记词已被选择
 */
export async function markWordSelected(childId: string, word: string): Promise<void> {
  const allPools = await smartLoad('daily_card_pools') as Record<string, DailyCardPool> || {};
  const pool = allPools[childId];
  
  if (pool && !pool.selectedWords.includes(word)) {
    pool.selectedWords.push(word);
    allPools[childId] = pool;
    await smartSave('daily_card_pools', allPools);
  }
}

/**
 * 更新上一轮的词（用于百词斩模式）
 */
export async function updateLastRound(childId: string, words: string[]): Promise<void> {
  const allPools = await smartLoad('daily_card_pools') as Record<string, DailyCardPool> || {};
  const pool = allPools[childId];
  
  if (pool) {
    pool.lastRoundWords = words;
    allPools[childId] = pool;
    await smartSave('daily_card_pools', allPools);
  }
}

/**
 * 重置每日词卡池（新的一天）
 */
export async function resetDailyPool(childId: string): Promise<void> {
  const allPools = await smartLoad('daily_card_pools') as Record<string, DailyCardPool> || {};
  delete allPools[childId];
  await smartSave('daily_card_pools', allPools);
}
