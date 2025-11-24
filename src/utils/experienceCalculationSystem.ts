/**
 * 🧮 理解力经验计算系统
 * 详细说明单词经验、活动经验和总体等级的计算逻辑
 */

import { AIChildData } from '../types';

/**
 * 基础经验配置
 */
export const EXP_CONFIG = {
  // 单词学习的基础经验值
  wordBase: {
    literal: 1.0,      // 每个词给字面理解1.0经验
    context: 0.2,      // 每个词给上下文理解0.2经验
    abstract: 0.0,     // 新词不直接给抽象理解经验
    emotion: 0.1,      // 每个词给情感理解0.1经验（情感词汇会更多）
    logic: 0.0         // 新词不直接给逻辑推理经验
  },
  
  // 等级升级所需经验（每级需要的经验值）
  expPerLevel: 100,    // 每个能力100经验升1级
  
  // 总体理解力计算权重
  overallWeights: {
    literal: 0.3,      // 字面理解占30%
    context: 0.25,     // 上下文理解占25%
    abstract: 0.2,     // 抽象理解占20%
    emotion: 0.15,     // 情感理解占15%
    logic: 0.1         // 逻辑推理占10%（较高级，权重相对较小）
  }
};

/**
 * 计算词卡教学的经验分配
 * 
 * 20个词的经验计算示例：
 * - 字面理解：20词 × 1.0 = 20经验
 * - 上下文理解：20词 × 0.2 = 4经验  
 * - 情感理解：20词 × 0.1 = 2经验
 * - 总计：26经验（约25经验）
 */
export const calculateWordLearningExp = (
  wordsLearned: string[],
  learningQuality: number = 8  // 1-10评分，影响经验获得
): Record<string, number> => {
  const wordCount = wordsLearned.length;
  const qualityMultiplier = learningQuality / 10; // 0.1-1.0
  
  // 分析词汇类型，不同类型词汇给不同经验
  const wordAnalysis = analyzeWordTypes(wordsLearned);
  
  const baseExp = {
    literal: wordCount * EXP_CONFIG.wordBase.literal,
    context: wordCount * EXP_CONFIG.wordBase.context,
    abstract: wordAnalysis.abstractWords * 0.3, // 抽象词汇额外给抽象理解经验
    emotion: (wordCount * EXP_CONFIG.wordBase.emotion) + (wordAnalysis.emotionWords * 0.5),
    logic: wordAnalysis.logicWords * 0.2 // 逻辑相关词汇给少量逻辑经验
  };
  
  // 应用学习质量系数
  const finalExp: Record<string, number> = {};
  for (const [ability, exp] of Object.entries(baseExp)) {
    finalExp[ability] = Math.round(exp * qualityMultiplier);
  }
  
  return finalExp;
};

/**
 * 分析词汇类型
 */
const analyzeWordTypes = (words: string[]): {
  emotionWords: number;
  abstractWords: number;
  logicWords: number;
} => {
  const emotionKeywords = ['开心', '难过', '生气', '害怕', '喜欢', '讨厌', '爱', '恨'];
  const abstractKeywords = ['思考', '想象', '梦想', '希望', '自由', '正义', '美丽'];
  const logicKeywords = ['因为', '所以', '如果', '那么', '比较', '分析', '推理'];
  
  let emotionWords = 0;
  let abstractWords = 0; 
  let logicWords = 0;
  
  for (const word of words) {
    if (emotionKeywords.some(keyword => word.includes(keyword))) {
      emotionWords++;
    }
    if (abstractKeywords.some(keyword => word.includes(keyword))) {
      abstractWords++;
    }
    if (logicKeywords.some(keyword => word.includes(keyword))) {
      logicWords++;
    }
  }
  
  return { emotionWords, abstractWords, logicWords };
};

/**
 * 计算总体理解力等级和进度
 * 
 * 计算逻辑：
 * 1. 获取各项能力的"等级点数" = 等级 + (进度/100)
 * 2. 按权重计算加权平均
 * 3. 得到总体等级和进度
 */
export const calculateOverallComprehension = (
  abilities: Record<string, { level: number; progress: number }>
): { level: number; progress: number } => {
  const weights = EXP_CONFIG.overallWeights;
  
  let totalWeightedPoints = 0;
  let totalWeight = 0;
  
  for (const [abilityName, ability] of Object.entries(abilities)) {
    if (weights[abilityName as keyof typeof weights]) {
      const weight = weights[abilityName as keyof typeof weights];
      const abilityPoints = ability.level + (ability.progress / 100);
      
      totalWeightedPoints += abilityPoints * weight;
      totalWeight += weight;
    }
  }
  
  const averagePoints = totalWeightedPoints / totalWeight;
  const level = Math.floor(averagePoints);
  const progress = Math.round((averagePoints - level) * 100);
  
  return { level, progress };
};

/**
 * 详细的经验计算示例和说明
 */
export const getExpCalculationExamples = (): string => {
  return `
📊 经验计算详细说明：

🔤 词卡教学（20个词）：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
普通词汇（如：苹果、桌子、跑步）：
├── 字面理解：20词 × 1.0 = 20经验
├── 上下文理解：20词 × 0.2 = 4经验
├── 情感理解：20词 × 0.1 = 2经验
└── 总计：26经验

特殊词汇分析：
├── 情感词汇（开心、难过）：额外 +0.5经验/词
├── 抽象词汇（梦想、自由）：额外给抽象理解经验
└── 逻辑词汇（因为、所以）：额外给逻辑经验

学习质量影响：
├── 质量评分8分：经验 × 0.8 = 实际获得约21经验
└── 质量评分10分：经验 × 1.0 = 实际获得26经验

🎯 总体理解力等级计算：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
假设当前能力：
├── 字面理解：Lv.3 (50%) = 3.5点
├── 上下文理解：Lv.2 (30%) = 2.3点
├── 抽象理解：Lv.1 (80%) = 1.8点
├── 情感理解：Lv.2 (10%) = 2.1点
└── 逻辑推理：Lv.1 (0%) = 1.0点

加权计算：
├── 字面理解：3.5 × 0.3 = 1.05
├── 上下文理解：2.3 × 0.25 = 0.575
├── 抽象理解：1.8 × 0.2 = 0.36
├── 情感理解：2.1 × 0.15 = 0.315
└── 逻辑推理：1.0 × 0.1 = 0.1

总计：2.4点 = 总体理解力 Lv.2 (40%)

📈 等级升级：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
每个能力需要100经验升1级：
├── Lv.1→Lv.2：需要100经验
├── Lv.2→Lv.3：需要100经验
├── Lv.3→Lv.4：需要100经验
└── 以此类推...

词卡教学升级示例：
├── 当前：字面理解 Lv.1 (70经验)
├── 学习20词：+20经验
├── 达到90经验：还需要10经验升到Lv.2
└── 再学10词：升级到 Lv.2 (0经验)
`;
};

/**
 * 计算升级还需要多少经验
 */
export const calculateExpToNextLevel = (ability: { level: number; progress: number }): number => {
  return EXP_CONFIG.expPerLevel - ability.progress;
};

/**
 * 添加经验到特定能力
 */
export const addExpToAbility = (
  ability: { level: number; progress: number },
  expToAdd: number
): { leveledUp: boolean; newLevel: number; expOverflow: number } => {
  let currentExp = ability.progress + expToAdd;
  let leveledUp = false;
  let levelsGained = 0;
  
  // 检查是否升级（可能连续升级）
  while (currentExp >= EXP_CONFIG.expPerLevel && ability.level < 20) {
    currentExp -= EXP_CONFIG.expPerLevel;
    ability.level += 1;
    levelsGained += 1;
    leveledUp = true;
  }
  
  // 如果达到最高等级，多余经验丢弃
  if (ability.level >= 20) {
    ability.progress = 100;
    currentExp = 0;
  } else {
    ability.progress = currentExp;
  }
  
  return {
    leveledUp,
    newLevel: ability.level,
    expOverflow: currentExp
  };
};
