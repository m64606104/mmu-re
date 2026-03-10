/**
 * 🎯 智能词卡生成系统
 * 每轮按需生成4张词卡，不预生成
 */

import { WordCard, getAllWordCards } from './wordCardLibrary';
import { ApiConfig } from '../types';
import { smartLoad, smartSave } from './storage';

export interface DailyCardPool {
  date: string;
  rounds: WordCard[][];  // 历史轮次记录
  selectedWords: string[];  // 当天已选择/学过的词
  lastRoundWords: string[];  // 上一轮显示的词（避免连续重复）
  allWords: WordCard[];  // 当天所有已生成的词（累积）
  source?: 'api' | 'simple' | 'static'; // 最近一次词卡来源
}

/**
 * 按需生成当轮4张词卡
 */
export async function generateRoundCards(
  childId: string,
  vocabularyCount: number,
  learnedWords: string[],
  stage: string,
  apiConfig: ApiConfig
): Promise<{ cards: WordCard[]; pool: DailyCardPool }> {
  const today = new Date().toDateString();
  
  // 加载或创建当天的 pool
  const allPools = await smartLoad('daily_card_pools') as Record<string, DailyCardPool> || {};
  let pool = allPools[childId];
  
  // 如果不是今天的数据，重置
  if (!pool || pool.date !== today) {
    pool = {
      date: today,
      rounds: [],
      selectedWords: [],
      lastRoundWords: [],
      allWords: [],
      source: 'api'
    };
  }
  
  // 合并已学词汇 + 当天已生成的词，避免重复
  const excludeWords = [...new Set([...learnedWords, ...pool.allWords.map(w => w.word)])];
  
  // 生成4个新词
  const cards = await generate4Cards(vocabularyCount, excludeWords, stage, apiConfig);
  
  // 判定来源
  let source: DailyCardPool['source'] = 'api';
  if (cards.length > 0) {
    const id = cards[0].id || '';
    if (id.startsWith('simple_')) source = 'simple';
    if (id.startsWith('static_')) source = 'static';
  }
  
  // 更新 pool
  pool.rounds.push(cards);
  pool.lastRoundWords = cards.map(c => c.word);
  pool.allWords = [...pool.allWords, ...cards];
  pool.source = source;
  
  // 保存
  allPools[childId] = pool;
  await smartSave('daily_card_pools', allPools);
  console.log(`✅ 第${pool.rounds.length}轮词卡已生成: ${cards.map(c => c.word).join('、')} (来源: ${source})`);
  
  return { cards, pool };
}

/**
 * 使用AI生成4个词卡（单轮）
 */
async function generate4Cards(
  vocabularyCount: number,
  excludeWords: string[],
  stage: string,
  apiConfig: ApiConfig
): Promise<WordCard[]> {
  // 最多重试2次
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`🎯 第${attempt}次尝试生成4个词汇...`);
      
      const stageDesc: Record<string, string> = {
        baby: '婴儿期（0-50词）：基础日常词汇，简单具体',
        toddler: '幼儿期（50-200词）：扩展日常用词，加入简单动作',
        child: '儿童期（200-1000词）：丰富表达，加入抽象概念',
        teen: '少年期（1000+词）：复杂词汇，深度表达'
      };
      
      const prompt = `请为AI儿童生成4个适合学习的新词汇。

【当前状态】
- 识字量：${vocabularyCount}个
- 成长阶段：${stageDesc[stage] || '婴儿期'}
- 不要包含这些词：${excludeWords.slice(-30).join('、')}

【要求】
1. 只生成4个词
2. 多样化类别（食物、动物、动作、形容词、物品等，不要4个都是同类）
3. 符合当前阶段难度
4. 实用，能构成对话

严格返回JSON，不要任何额外文字：
{"words":[{"word":"苹果","emoji":"🍎","definition":"红色圆形的水果","difficulty":1,"category":"食物"},{"word":"跑步","emoji":"🏃","definition":"快速移动双腿前进","difficulty":1,"category":"动作"},{"word":"蓝色","emoji":"💙","definition":"像天空一样的颜色","difficulty":1,"category":"颜色"},{"word":"小狗","emoji":"🐕","definition":"人类的好朋友会汪汪叫","difficulty":1,"category":"动物"}]}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      
      const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
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
              content: '你是儿童教育专家。只输出JSON，不要任何额外文字。返回格式：{"words":[{"word":"","emoji":"","definition":"","difficulty":1,"category":""}]}'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.8,
          max_tokens: 500
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败 ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      // 解析
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('返回内容中没有JSON');
      
      const parsed = JSON.parse(jsonMatch[0]);
      const words: WordCard[] = (parsed.words || []).slice(0, 4).map((w: any, i: number) => ({
        id: `ai_${Date.now()}_${i}`,
        word: w.word || '',
        emoji: w.emoji || '✨',
        definition: w.definition || '',
        examples: w.examples || [],
        difficulty: w.difficulty || 1,
        category: w.category || '其他'
      }));
      
      if (words.length >= 3) {
        console.log(`✅ 成功生成${words.length}个词汇: ${words.map(w => w.word).join('、')}`);
        return padTo4WithStatic(words, excludeWords);
      } else {
        throw new Error(`生成词汇数量不足: ${words.length}`);
      }

    } catch (error: any) {
      console.error(`❌ 第${attempt}次生成失败:`, error.message || error);
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  // API全部失败，使用静态词库
  console.warn('🚨 API生成失败，使用静态词库回退');
  return getStaticFallbackCards(excludeWords, 4);
}

/**
 * 如果API返回不足4个，用静态词库补足
 */
function padTo4WithStatic(cards: WordCard[], excludeWords: string[]): WordCard[] {
  if (cards.length >= 4) return cards.slice(0, 4);
  
  const existing = new Set([...excludeWords, ...cards.map(c => c.word)]);
  const lib = getAllWordCards().filter(c => !existing.has(c.word));
  const shuffled = lib.sort(() => Math.random() - 0.5);
  
  while (cards.length < 4 && shuffled.length > 0) {
    const c = shuffled.shift()!;
    cards.push({
      id: `static_${c.id}`,
      word: c.word,
      emoji: c.emoji,
      definition: c.definition,
      difficulty: c.difficulty as 1 | 2 | 3,
      category: c.category,
      examples: c.examples || []
    });
  }
  return cards;
}

/**
 * 静态词库回退：随机取N个未学过的词
 */
function getStaticFallbackCards(excludeWords: string[], count: number): WordCard[] {
  const existing = new Set(excludeWords);
  const lib = getAllWordCards().filter(c => !existing.has(c.word));
  const shuffled = lib.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((c, i) => ({
    id: `static_${c.id}_${i}`,
    word: c.word,
    emoji: c.emoji,
    definition: c.definition,
    difficulty: c.difficulty as 1 | 2 | 3,
    category: c.category,
    examples: c.examples || []
  }));
}

// 保留旧接口兼容性（已废弃，但避免其他地方报错）
export async function generateDailyCards(
  childId: string,
  vocabularyCount: number,
  learnedWords: string[],
  stage: string,
  apiConfig: ApiConfig
): Promise<DailyCardPool> {
  const { pool } = await generateRoundCards(childId, vocabularyCount, learnedWords, stage, apiConfig);
  return pool;
}

export function getNextRound(pool: DailyCardPool): WordCard[] {
  // 返回最后一轮生成的词卡
  if (!pool || !pool.rounds || pool.rounds.length === 0) return [];
  return pool.rounds[pool.rounds.length - 1];
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
