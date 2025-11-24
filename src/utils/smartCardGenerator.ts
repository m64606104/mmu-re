/**
 * 🎯 智能词卡生成系统
 * 基于AI的成长阶段和已学词汇，动态生成适合的词卡
 */

import { WordCard } from './wordCardLibrary';
import { ApiConfig } from '../types';
import { smartLoad, smartSave } from './storage';

export interface DailyCardPool {
  date: string;
  rounds: WordCard[][];  // 15轮，每轮4个词（总60词，3个学习轮次）
  selectedWords: string[];  // 当天已选择的词
  lastRoundWords: string[];  // 上一轮显示的词（用于限制重复）
  allWords: WordCard[];  // 所有可用的词
  isEmergencyMode?: boolean;  // 是否使用了应急词库（API失败时）
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
 * 为当天生成15轮词卡（共60个词，支持3个学习轮次每轮20词）
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
  const cached = allPools[childId];
  
  if (cached && cached.date === today) {
    return cached;
  }

  // 使用AI生成60个适合的词（15轮×4词）
  let words: WordCard[];
  let isEmergencyMode = false;
  
  try {
    words = await generateWordsWithAI(vocabularyCount, learnedWords, stage, apiConfig);
  } catch (error) {
    console.error('❌ API生成词卡失败，使用应急词库:', error);
    words = getEmergencyWords(); // 使用应急词库
    isEmergencyMode = true;
  }
  
  // 分成15轮，每轮4个词
  const rounds: WordCard[][] = [];
  for (let i = 0; i < 15; i++) {
    rounds.push(words.slice(i * 4, (i + 1) * 4));
  }

  const pool: DailyCardPool = {
    date: today,
    rounds,
    selectedWords: [],
    lastRoundWords: [],
    allWords: words,
    isEmergencyMode  // 标记是否使用了应急词库
  };

  // 保存到 IndexedDB
  allPools[childId] = pool;
  await smartSave('daily_card_pools', allPools);
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
 * 使用AI生成适合的词汇
 */
async function generateWordsWithAI(
  vocabularyCount: number,
  learnedWords: string[],
  stage: string,
  apiConfig: ApiConfig
): Promise<WordCard[]> {
  // 🔥 重试机制：最多重试3次，不使用模板库
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`🎯 第${attempt}次尝试生成60个词汇...`);
      const prompt = buildGenerationPrompt(vocabularyCount, learnedWords, stage);
      
      const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: apiConfig.modelName,
          messages: [
            {
              role: 'system',
              content: '你是儿童教育专家。请严格按照JSON格式返回词汇列表。每个词汇必须包含word、emoji、definition、difficulty、category字段。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 3000 // 增加token限制
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败 ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';
      
      // 解析AI返回的词汇
      const words = parseAIResponse(content);
      
      if (words.length >= 40) { // 至少要有40个词才算成功
        console.log(`✅ 成功生成${words.length}个词汇`);
        return words;
      } else {
        throw new Error(`生成词汇数量不足: ${words.length}/60`);
      }

    } catch (error) {
      console.error(`❌ 第${attempt}次生成失败:`, error);
      
      if (attempt === 3) {
        // 🔥 最后一次尝试也失败了，但不用模板库！
        // 使用简化的API调用再试一次
        return await generateSimpleWords(vocabularyCount, learnedWords, apiConfig);
      }
      
      // 等待1秒后重试
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // 不应该到这里，但为了类型安全
  return [];
}

/**
 * 🚨 最终备份：简化API调用（不依赖复杂的JSON解析）
 */
async function generateSimpleWords(
  vocabularyCount: number,
  learnedWords: string[],
  apiConfig: ApiConfig
): Promise<WordCard[]> {
  try {
    console.log('🚨 使用简化方式生成词汇...');
    
    const prompt = `请为${vocabularyCount}词汇量的AI儿童推荐60个新的学习词汇。

已学词汇示例：${learnedWords.slice(0, 10).join('、')}

请直接返回60个新词汇，每行一个，格式：
词汇-表情-定义-难度(1-3)-类别

例如：
苹果-🍎-红色的水果-1-食物
跑步-🏃-快速移动-1-动作

请直接返回60行：`;

    const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
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
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`简化API调用也失败了 ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    // 简单解析：每行一个词
    const lines = content.split('\n').filter((line: string) => line.trim() && line.includes('-'));
    const words: WordCard[] = [];
    
    for (let i = 0; i < Math.min(lines.length, 60); i++) {
      const parts = lines[i].split('-');
      if (parts.length >= 5) {
        words.push({
          id: `simple_${Date.now()}_${i}`,
          word: parts[0].trim(),
          emoji: parts[1].trim(),
          definition: parts[2].trim(),
          difficulty: Math.min(3, Math.max(1, parseInt(parts[3]) || 1)) as 1 | 2 | 3,
          category: parts[4].trim(),
          examples: []
        });
      }
    }
    
    console.log(`🔄 简化方式生成了${words.length}个词汇`);
    
    // 如果还是不够，用随机生成填充到60个
    while (words.length < 60) {
      const categories = ['动物', '食物', '颜色', '动作', '物品', '自然'];
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      
      words.push({
        id: `generated_${Date.now()}_${words.length}`,
        word: `词汇${words.length + 1}`,
        emoji: '📝',
        definition: `学习用词汇${words.length + 1}`,
        difficulty: Math.ceil(Math.random() * 3) as 1 | 2 | 3,
        category: randomCategory,
        examples: []
      });
    }
    
    return words;
    
  } catch (error) {
    console.error('🚨 所有词汇生成尝试都失败了:', error);
    // 抛出错误，让外层捕获并使用应急词库
    throw new Error('API生成词卡失败');
  }
}

/**
 * 构建生成提示词
 */
function buildGenerationPrompt(vocabularyCount: number, learnedWords: string[], stage: string): string {
  const stageDesc = {
    baby: '婴儿期（0-50词）：基础日常词汇，简单具体',
    toddler: '幼儿期（50-200词）：扩展日常用词，加入简单动作',
    child: '儿童期（200-1000词）：丰富表达，加入抽象概念',
    teen: '少年期（1000+词）：复杂词汇，深度表达'
  }[stage] || '婴儿期';

  return `请为AI儿童生成60个适合学习的词汇。

【当前状态】
- 识字量：${vocabularyCount}个
- 成长阶段：${stageDesc}
- 已学过的词：${learnedWords.slice(0, 20).join('、')}${learnedWords.length > 20 ? '等' : ''}

【要求】
1. 生成60个词，按难度递进
2. 不要包含已学过的词
3. 不要太基础（如"我你他这那"）
4. 要实用，能构成对话
5. 符合当前阶段
6. 多样化：食物、动物、动作、形容词、物品等

【格式】（严格JSON）
{
  "words": [
    {"word": "苹果", "emoji": "🍎", "definition": "红色圆形的水果", "difficulty": 1, "category": "食物"},
    ...
  ]
}

请生成60个词的完整JSON列表。`;
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
 * 获取下一轮词卡（百词斩模式）
 * - 一轮固定4张卡
 * - 不包含已选过的词
 * - 可以包含上一轮没选的词，但最多重复1个
 */
export function getNextRound(pool: DailyCardPool): WordCard[] {
  if (!pool || !pool.allWords) {
    return [];
  }

  // 获取所有未选过的词
  let availableWords = pool.allWords.filter(card => !pool.selectedWords.includes(card.word));
  
  // 🔄 如果可用词汇不足4个，重置选择状态（无限轮次支持）
  if (availableWords.length < 4) {
    console.log('🔄 词汇池即将用完，重置部分选择状态以支持无限轮次');
    
    // 保留最近选择的词汇，重置较早的选择（保持新鲜度）
    const recentSelected = pool.selectedWords.slice(-20); // 保留最近20个
    pool.selectedWords = recentSelected;
    
    // 重新计算可用词汇
    availableWords = pool.allWords.filter(card => !recentSelected.includes(card.word));
  }

  // 百词斩模式：构造新一轮4张卡
  const newRound: WordCard[] = [];
  const lastRound = pool.lastRoundWords || [];
  
  // 1. 从上一轮中最多选1个没被选的词（增加连续性）
  const repeatableWords = availableWords.filter(card => lastRound.includes(card.word));
  if (repeatableWords.length > 0 && Math.random() < 0.5) {
    const repeatCard = repeatableWords[Math.floor(Math.random() * repeatableWords.length)];
    newRound.push(repeatCard);
  }
  
  // 2. 填充剩余的词（从未在上一轮出现的）
  const freshWords = availableWords.filter(card => 
    !newRound.includes(card) && !lastRound.includes(card.word)
  );
  
  // 打乱顺序
  const shuffled = freshWords.sort(() => Math.random() - 0.5);
  
  // 填充到4张
  while (newRound.length < 4 && shuffled.length > 0) {
    newRound.push(shuffled.shift()!);
  }
  
  // 如果还不够4张，从availableWords中补充
  if (newRound.length < 4) {
    const remaining = availableWords.filter(card => !newRound.includes(card));
    while (newRound.length < 4 && remaining.length > 0) {
      newRound.push(remaining.shift()!);
    }
  }
  
  return newRound;
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
