/**
 * 🧠 改进的理解力系统
 * 解决字面理解升级过快和上限过低的问题
 */

import { AIChildData } from '../types';

interface AbilityConfig {
  name: string;
  displayName: string;
  icon: string;
  maxLevel: number;           // 最高等级
  baseWordsPerLevel: number;  // 基础升级所需词数
  startThreshold: number;     // 开始发展的词汇门槛
  growthRate: number;         // 成长率（每级递增的难度系数）
  description: string;
}

/**
 * 改进后的理解力能力配置
 */
export const IMPROVED_ABILITY_CONFIG: Record<string, AbilityConfig> = {
  literal: {
    name: 'literal',
    displayName: '字面理解',
    icon: '📝',
    maxLevel: 20,              // 提高上限到20级
    baseWordsPerLevel: 8,      // 基础每8词升1级（比之前慢）
    startThreshold: 0,         // 从开始就发展
    growthRate: 1.1,           // 每级递增10%难度
    description: '理解文字的直接含义和基础语法'
  },
  context: {
    name: 'context',
    displayName: '上下文理解',
    icon: '🔍',
    maxLevel: 15,
    baseWordsPerLevel: 12,
    startThreshold: 30,        // 30词后开始（降低门槛）
    growthRate: 1.15,          // 15%递增
    description: '理解句子间的关联和语境含义'
  },
  abstract: {
    name: 'abstract',
    displayName: '抽象理解',
    icon: '🎨',
    maxLevel: 12,
    baseWordsPerLevel: 15,
    startThreshold: 80,        // 80词后开始
    growthRate: 1.2,           // 20%递增
    description: '理解比喻、象征和抽象概念'
  },
  emotion: {
    name: 'emotion',
    displayName: '情感理解',
    icon: '💝',
    maxLevel: 10,
    baseWordsPerLevel: 18,
    startThreshold: 150,       // 150词后开始
    growthRate: 1.25,          // 25%递增
    description: '感知和理解情感表达'
  },
  logic: {
    name: 'logic',
    displayName: '逻辑推理',
    icon: '🧩',
    maxLevel: 8,
    baseWordsPerLevel: 25,
    startThreshold: 300,       // 300词后开始
    growthRate: 1.3,           // 30%递增
    description: '进行逻辑思考和推理分析'
  }
};

/**
 * 计算指定等级需要的词汇数（递增难度）
 */
export const calculateWordsForLevel = (
  level: number, 
  config: AbilityConfig
): number => {
  if (level <= 1) return 0;
  
  let totalWords = 0;
  for (let i = 1; i < level; i++) {
    // 每级所需词数 = 基础词数 * (成长率 ^ (等级-1))
    const wordsForThisLevel = Math.ceil(config.baseWordsPerLevel * Math.pow(config.growthRate, i - 1));
    totalWords += wordsForThisLevel;
  }
  return totalWords;
};

/**
 * 根据词汇数计算能力等级和进度
 */
export const calculateAbilityLevel = (
  wordCount: number,
  config: AbilityConfig
): { level: number; progress: number; wordsToNext: number } => {
  const effectiveWords = Math.max(0, wordCount - config.startThreshold);
  
  if (effectiveWords <= 0) {
    return { 
      level: 1, 
      progress: 0, 
      wordsToNext: config.startThreshold + config.baseWordsPerLevel - wordCount 
    };
  }
  
  let currentLevel = 1;
  let wordsUsed = 0;
  
  // 逐级计算，找到当前等级
  while (currentLevel < config.maxLevel) {
    const wordsNeeded = Math.ceil(config.baseWordsPerLevel * Math.pow(config.growthRate, currentLevel - 1));
    
    if (wordsUsed + wordsNeeded > effectiveWords) {
      // 在这一级内
      const progressInLevel = effectiveWords - wordsUsed;
      const progress = Math.floor((progressInLevel / wordsNeeded) * 100);
      const wordsToNext = wordsNeeded - progressInLevel;
      
      return { level: currentLevel, progress, wordsToNext };
    }
    
    wordsUsed += wordsNeeded;
    currentLevel++;
  }
  
  // 达到最高等级
  return { level: config.maxLevel, progress: 100, wordsToNext: 0 };
};

/**
 * 更新所有理解力能力（使用改进算法）
 */
export const updateImprovedComprehension = (childData: AIChildData): void => {
  const wordCount = childData.vocabulary.length;
  
  // 更新各项细分能力
  for (const [key, config] of Object.entries(IMPROVED_ABILITY_CONFIG)) {
    const result = calculateAbilityLevel(wordCount, config);
    
    if (childData.comprehension.abilities[key as keyof typeof childData.comprehension.abilities]) {
      const ability = childData.comprehension.abilities[key as keyof typeof childData.comprehension.abilities] as any;
      ability.level = result.level;
      ability.progress = result.progress;
    }
  }
  
  // 计算总理解力等级（基于各项能力的加权平均）
  const abilities = Object.values(childData.comprehension.abilities) as Array<{level: number; progress: number}>;
  const totalLevelPoints = abilities.reduce((sum, ability) => sum + ability.level + (ability.progress / 100), 0);
  const avgLevel = totalLevelPoints / abilities.length;
  
  childData.comprehension.level = Math.floor(avgLevel);
  childData.comprehension.progress = Math.floor((avgLevel % 1) * 100);
};

/**
 * 获取能力发展阶段描述
 */
export const getAbilityStageDescription = (level: number): string => {
  if (level <= 2) return '萌芽期';
  if (level <= 5) return '成长期';
  if (level <= 10) return '发展期';
  if (level <= 15) return '成熟期';
  if (level <= 20) return '精通期';
  return '大师级';
};

/**
 * 生成理解力发展预览表
 */
export const generateProgressPreview = (): string => {
  let preview = '\n📊 改进后的字面理解升级预览：\n\n';
  const config = IMPROVED_ABILITY_CONFIG.literal;
  
  const milestones = [1, 2, 3, 5, 8, 10, 15, 20];
  
  for (const level of milestones) {
    const wordsNeeded = config.startThreshold + calculateWordsForLevel(level, config);
    const stage = getAbilityStageDescription(level);
    preview += `Lv.${level} (${stage}): ${wordsNeeded}词\n`;
  }
  
  preview += '\n🎯 现在字面理解有更长的成长路径，不会很快满级！';
  return preview;
};

/**
 * 比较新旧系统的差异
 */
export const compareOldVsNew = (wordCount: number): string => {
  const oldLevel = Math.min(10, Math.floor(wordCount / 5) + 1);
  const oldProgress = wordCount % 5 * 20; // 每5词100%进度
  
  const newResult = calculateAbilityLevel(wordCount, IMPROVED_ABILITY_CONFIG.literal);
  
  return `
📚 词汇量: ${wordCount}词

旧系统 - 字面理解:
  等级: Lv.${oldLevel}/10  
  进度: ${Math.min(oldProgress, 100)}%
  ${oldLevel >= 10 ? '⚠️ 已满级！' : ''}

新系统 - 字面理解:  
  等级: Lv.${newResult.level}/20
  进度: ${newResult.progress}%
  距离下级: ${newResult.wordsToNext}词
  阶段: ${getAbilityStageDescription(newResult.level)}
  `;
};
