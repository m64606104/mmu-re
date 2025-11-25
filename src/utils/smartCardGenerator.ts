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
 * 🎯 按需生成词卡（一次生成4个词）
 * 用户点击"换一批"时才生成下一批，大幅提升响应速度
 */
export async function generateDailyCards(
  childId: string,
  vocabularyCount: number,
  learnedWords: string[],
  stage: string,
  apiConfig: ApiConfig
): Promise<DailyCardPool> {
  const today = new Date().toDateString();
  
  // 从 IndexedDB 获取所有AI的词卡池
  const allPools = await smartLoad('daily_card_pools') as Record<string, DailyCardPool> || {};
  let pool = allPools[childId];
  
  // 如果是新的一天，重置词卡池
  if (!pool || pool.date !== today) {
    pool = {
      date: today,
      rounds: [],
      selectedWords: [],
      lastRoundWords: [],
      allWords: [],
      generatedCount: 0,
      isEmergencyMode: false,
      useEmergencyForNext: false
    };
  }
  
  // 如果还没有生成任何词，或者需要生成下一批
  if (pool.rounds.length === 0) {
    await generateNextBatch(pool, vocabularyCount, learnedWords, stage, apiConfig);
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
 * 🚀 生成下一批4个词（按需生成）
 */
async function generateNextBatch(
  pool: DailyCardPool,
  vocabularyCount: number,
  learnedWords: string[],
  stage: string,
  apiConfig: ApiConfig
): Promise<void> {
  // 如果上次API失败，直接使用应急词库
  if (pool.useEmergencyForNext) {
    const emergencyBatch = getEmergencyBatch(pool, learnedWords);
    pool.rounds.push(emergencyBatch);
    pool.allWords.push(...emergencyBatch);
    pool.generatedCount += emergencyBatch.length;
    console.log('📚 使用应急词库生成了4个词');
    return;
  }
  
  // 尝试用AI生成4个词
  try {
    console.log(`🎯 AI生成第${pool.rounds.length + 1}批词卡（4个）...`);
    const newWords = await generateWordsWithAI(vocabularyCount, learnedWords, stage, apiConfig, pool.allWords);
    
    pool.rounds.push(newWords);
    pool.allWords.push(...newWords);
    pool.generatedCount += newWords.length;
    pool.isEmergencyMode = false;
    
    console.log(`✅ 成功生成4个词：${newWords.map(w => w.word).join('、')}`);
  } catch (error) {
    console.error('❌ API生成失败，使用应急词库:', error);
    
    // 标记使用应急模式
    pool.isEmergencyMode = true;
    pool.useEmergencyForNext = true;
    
    // 使用应急词库
    const emergencyBatch = getEmergencyBatch(pool, learnedWords);
    pool.rounds.push(emergencyBatch);
    pool.allWords.push(...emergencyBatch);
    pool.generatedCount += emergencyBatch.length;
    
    console.log('📚 已切换到应急词库模式');
  }
}

/**
 * 🎯 使用AI生成4个适合的词汇
 */
async function generateWordsWithAI(
  vocabularyCount: number,
  learnedWords: string[],
  stage: string,
  apiConfig: ApiConfig,
  existingWords: WordCard[]
): Promise<WordCard[]> {
  // 只尝试1次，失败就用应急词库
  try {
    const prompt = buildGenerationPrompt(vocabularyCount, learnedWords, stage, existingWords);
      
    const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 500  // 只生成4个词，token够用
      })
    });

    if (!response.ok) {
      throw new Error(`API调用失败 ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    const words = parseAIResponse(content);
    
    if (words.length < 3) {
      throw new Error(`生成的词汇数量不足：${words.length}个`);
    }
    
    // 返回4个词
    return words.slice(0, 4);
    
  } catch (error) {
    console.error('❌ AI生成失败:', error);
    throw error;
  }
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

/**
 * 构建生成提示词
 */
function buildGenerationPrompt(
  vocabularyCount: number, 
  learnedWords: string[], 
  stage: string,
  existingWords: WordCard[]
): string {
  const stageDesc = {
    baby: '婴儿期（0-50词）：基础日常词汇，简单具体',
    toddler: '幼儿期（50-200词）：扩展日常用词，加入简单动作',
    child: '儿童期（200-1000词）：丰富表达，加入抽象概念',
    teen: '少年期（1000+词）：复杂词汇，深度表达'
  }[stage] || '婴儿期';
  
  const allUsedWords = [...learnedWords, ...existingWords.map(w => w.word)];

  return `为AI儿童生成4个新词卡。

【当前状态】
- 识字量：${vocabularyCount}个
- 阶段：${stageDesc}
- 不要重复这些词：${allUsedWords.slice(-30).join('、')}

【要求】
生成4个新词，实用且适合当前阶段。

【格式】JSON
{
  "words": [
    {"word": "苹果", "emoji": "🍎", "definition": "红色的水果", "difficulty": 1, "category": "食物"},
    {"word": "跑步", "emoji": "🏃", "definition": "快速移动", "difficulty": 1, "category": "动作"},
    {"word": "开心", "emoji": "😊", "definition": "心情愉快", "difficulty": 1, "category": "情感"},
    {"word": "太阳", "emoji": "☀️", "definition": "天上发光的星球", "difficulty": 1, "category": "自然"}
  ]
}

只返回JSON，包含4个词。`;
}

/**
 * 解析AI返回的内容
 */
function parseAIResponse(content: string): WordCard[] {
  try {
    // 尝试提取JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const parsed = JSON.parse(jsonMatch[0]);
    const words = parsed.words || [];

    return words.map((w: any, index: number) => ({
      id: `ai_${Date.now()}_${index}`,
      word: w.word || '',
      emoji: w.emoji || '✨',
      definition: w.definition || '',
      examples: w.examples || [],
      difficulty: w.difficulty || 2,
      category: w.category || 'custom'
    }));

  } catch (error) {
    console.error('解析AI响应失败:', error);
    throw error;
  }
}

// 🗑️ 已移除getFallbackWords函数 - 不再使用模板库，完全基于API生成

/**
 * 🔄 获取下一轮词卡（按需生成模式）
 * - 如果当前批次还有未选的词，继续显示
 * - 如果当前批次用完了，触发生成下一批
 */
export async function getNextRound(
  pool: DailyCardPool,
  childId: string,
  vocabularyCount: number,
  learnedWords: string[],
  stage: string,
  apiConfig: ApiConfig
): Promise<WordCard[]> {
  // 获取所有未选过的词
  const availableWords = pool.allWords.filter(card => !pool.selectedWords.includes(card.word));
  
  // 如果可用词汇不足4个，生成新的一批
  if (availableWords.length < 4) {
    console.log('🔄 当前批次用完，生成下一批词卡...');
    await generateNextBatch(pool, vocabularyCount, learnedWords, stage, apiConfig);
    
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
