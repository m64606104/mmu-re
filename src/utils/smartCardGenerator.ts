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
  const words = await generateWordsWithAI(vocabularyCount, learnedWords, stage, apiConfig);
  
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
    allWords: words
  };

  // 保存到 IndexedDB
  allPools[childId] = pool;
  await smartSave('daily_card_pools', allPools);
  return pool;
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
  try {
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
            content: '你是儿童教育专家。请严格按照JSON格式返回词汇列表。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error('AI生成失败');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    // 解析AI返回的词汇
    const words = parseAIResponse(content);
    return words;

  } catch (error) {
    console.error('AI生成词卡失败:', error);
    // 降级方案：使用预设词库
    return getFallbackWords(vocabularyCount, learnedWords);
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

/**
 * 降级方案：从预设库中选择词汇
 */
function getFallbackWords(_vocabularyCount: number, learnedWords: string[]): WordCard[] {
  // 基础词库（简化版，实际应该更多）
  const baseWords: Array<{word: string; emoji: string; definition: string; difficulty: 1 | 2 | 3; category: string}> = [
    { word: '苹果', emoji: '🍎', definition: '红色圆形的水果', difficulty: 1, category: '食物' },
    { word: '香蕉', emoji: '🍌', definition: '黄色长长的水果', difficulty: 1, category: '食物' },
    { word: '橘子', emoji: '🍊', definition: '橙色的圆形水果', difficulty: 1, category: '食物' },
    { word: '西瓜', emoji: '🍉', definition: '绿色外皮红色果肉的大水果', difficulty: 1, category: '食物' },
    { word: '葡萄', emoji: '🍇', definition: '紫色的一串一串的小水果', difficulty: 1, category: '食物' },
    { word: '草莓', emoji: '🍓', definition: '红色的小小的甜水果', difficulty: 1, category: '食物' },
    { word: '桃子', emoji: '🍑', definition: '粉红色的圆水果', difficulty: 1, category: '食物' },
    { word: '梨', emoji: '🍐', definition: '黄色的上小下大的水果', difficulty: 1, category: '食物' },
    { word: '牛奶', emoji: '🥛', definition: '白色的营养饮料', difficulty: 1, category: '食物' },
    { word: '面包', emoji: '🍞', definition: '用面粉做的食物', difficulty: 1, category: '食物' },
    { word: '蛋糕', emoji: '🎂', definition: '甜甜的好吃的点心', difficulty: 1, category: '食物' },
    { word: '饼干', emoji: '🍪', definition: '脆脆的小点心', difficulty: 1, category: '食物' },
    { word: '糖果', emoji: '🍬', definition: '甜甜的小食品', difficulty: 1, category: '食物' },
    { word: '冰淇淋', emoji: '🍦', definition: '冷冷的甜甜的', difficulty: 1, category: '食物' },
    { word: '水', emoji: '💧', definition: '透明的液体', difficulty: 1, category: '食物' },
    { word: '小狗', emoji: '🐕', definition: '会汪汪叫的动物', difficulty: 1, category: '动物' },
    { word: '小猫', emoji: '🐱', definition: '会喵喵叫的动物', difficulty: 1, category: '动物' },
    { word: '小鸟', emoji: '🐦', definition: '会飞会唱歌的动物', difficulty: 1, category: '动物' },
    { word: '小兔', emoji: '🐰', definition: '长耳朵会跳的动物', difficulty: 1, category: '动物' },
    { word: '小鱼', emoji: '🐟', definition: '在水里游的动物', difficulty: 1, category: '动物' },
    { word: '蝴蝶', emoji: '🦋', definition: '会飞的美丽昆虫', difficulty: 1, category: '动物' },
    { word: '蜜蜂', emoji: '🐝', definition: '会飞会采蜜的昆虫', difficulty: 1, category: '动物' },
    { word: '大象', emoji: '🐘', definition: '有长鼻子的大动物', difficulty: 1, category: '动物' },
    { word: '老虎', emoji: '🐯', definition: '身上有条纹的凶猛动物', difficulty: 1, category: '动物' },
    { word: '猴子', emoji: '🐵', definition: '会爬树的聪明动物', difficulty: 1, category: '动物' },
    { word: '熊猫', emoji: '🐼', definition: '黑白色的可爱动物', difficulty: 1, category: '动物' },
    { word: '长颈鹿', emoji: '🦒', definition: '脖子很长的动物', difficulty: 1, category: '动物' },
    { word: '太阳', emoji: '☀️', definition: '天上发光发热的星球', difficulty: 1, category: '自然' },
    { word: '月亮', emoji: '🌙', definition: '晚上天上的发光圆球', difficulty: 1, category: '自然' },
    { word: '星星', emoji: '⭐', definition: '晚上天上闪闪发光的点', difficulty: 1, category: '自然' },
    { word: '云', emoji: '☁️', definition: '天上白白的棉花一样的', difficulty: 1, category: '自然' },
    { word: '雨', emoji: '🌧️', definition: '从天上落下来的水', difficulty: 1, category: '自然' },
    { word: '雪', emoji: '❄️', definition: '冬天从天上飘下来的白色', difficulty: 1, category: '自然' },
    { word: '风', emoji: '💨', definition: '空气流动', difficulty: 1, category: '自然' },
    { word: '花', emoji: '🌸', definition: '植物开的漂亮部分', difficulty: 1, category: '自然' },
    { word: '树', emoji: '🌳', definition: '长在地上的高大植物', difficulty: 1, category: '自然' },
    { word: '草', emoji: '🌱', definition: '长在地上的绿色小植物', difficulty: 1, category: '自然' },
    { word: '山', emoji: '⛰️', definition: '地面上很高的', difficulty: 1, category: '自然' },
    { word: '河', emoji: '🌊', definition: '流动的水', difficulty: 1, category: '自然' },
    { word: '海', emoji: '🌊', definition: '很大很大的水', difficulty: 1, category: '自然' },
    { word: '球', emoji: '⚽', definition: '圆圆的可以踢可以拍的', difficulty: 1, category: '物品' },
    { word: '车', emoji: '🚗', definition: '可以坐着去远方的', difficulty: 1, category: '物品' },
    { word: '书', emoji: '📖', definition: '写着字的可以看的', difficulty: 2, category: '物品' },
    { word: '笔', emoji: '✏️', definition: '用来写字画画的工具', difficulty: 2, category: '物品' },
    { word: '玩具', emoji: '🧸', definition: '用来玩的东西', difficulty: 2, category: '物品' },
    { word: '衣服', emoji: '👕', definition: '穿在身上的', difficulty: 2, category: '物品' },
    { word: '鞋子', emoji: '👟', definition: '穿在脚上的', difficulty: 2, category: '物品' },
    { word: '帽子', emoji: '🎩', definition: '戴在头上的', difficulty: 2, category: '物品' },
    { word: '红色', emoji: '❤️', definition: '像血、像太阳的颜色', difficulty: 1, category: '颜色' },
    { word: '蓝色', emoji: '💙', definition: '像天空、像海的颜色', difficulty: 1, category: '颜色' },
    { word: '黄色', emoji: '💛', definition: '像太阳、像香蕉的颜色', difficulty: 1, category: '颜色' },
    { word: '绿色', emoji: '💚', definition: '像草、像树的颜色', difficulty: 1, category: '颜色' },
    { word: '白色', emoji: '🤍', definition: '像雪、像云的颜色', difficulty: 1, category: '颜色' },
    { word: '黑色', emoji: '🖤', definition: '像夜晚的颜色', difficulty: 1, category: '颜色' },
    { word: '粉色', emoji: '🩷', definition: '像花的颜色', difficulty: 1, category: '颜色' },
    { word: '紫色', emoji: '💜', definition: '像葡萄的颜色', difficulty: 1, category: '颜色' },
    { word: '橙色', emoji: '🧡', definition: '像橘子的颜色', difficulty: 1, category: '颜色' },
    { word: '灰色', emoji: '🩶', definition: '黑白中间的颜色', difficulty: 1, category: '颜色' },
    { word: '吃', emoji: '😋', definition: '把食物放进嘴里', difficulty: 1, category: '动作' },
    { word: '喝', emoji: '🥤', definition: '把液体喝下去', difficulty: 1, category: '动作' },
    { word: '睡觉', emoji: '😴', definition: '闭上眼睛休息', difficulty: 1, category: '动作' },
    { word: '玩', emoji: '🎮', definition: '做游戏开心地活动', difficulty: 1, category: '动作' },
    { word: '跑', emoji: '🏃', definition: '快快地走', difficulty: 1, category: '动作' },
    { word: '跳', emoji: '🦘', definition: '用力离开地面', difficulty: 1, category: '动作' },
    { word: '笑', emoji: '😄', definition: '开心时的表情', difficulty: 1, category: '动作' },
    { word: '哭', emoji: '😢', definition: '难过时流眼泪', difficulty: 1, category: '动作' },
    { word: '看', emoji: '👀', definition: '用眼睛观察', difficulty: 2, category: '动作' },
    { word: '听', emoji: '👂', definition: '用耳朵感受声音', difficulty: 2, category: '动作' },
    { word: '说', emoji: '💬', definition: '用嘴巴讲话', difficulty: 2, category: '动作' },
    { word: '走', emoji: '🚶', definition: '移动脚步前进', difficulty: 2, category: '动作' },
    { word: '坐', emoji: '🪑', definition: '屁股放在椅子上', difficulty: 2, category: '动作' },
    { word: '站', emoji: '🧍', definition: '两脚在地上身体直立', difficulty: 2, category: '动作' },
    { word: '大', emoji: '📏', definition: '体积很多的', difficulty: 1, category: '形容词' },
    { word: '小', emoji: '🔬', definition: '体积很少的', difficulty: 1, category: '形容词' },
    { word: '多', emoji: '➕', definition: '数量很大的', difficulty: 2, category: '形容词' },
    { word: '少', emoji: '➖', definition: '数量很小的', difficulty: 2, category: '形容词' },
  ];

  // 过滤已学过的词
  const available = baseWords.filter(w => !learnedWords.includes(w.word));
  
  // 随机打乱并取80个
  const shuffled = available.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 80).map((w, i) => ({
    ...w,
    id: `fallback_${Date.now()}_${i}`,
    examples: []
  }));
}

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
  const availableWords = pool.allWords.filter(card => !pool.selectedWords.includes(card.word));
  
  if (availableWords.length === 0) {
    return [];
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
