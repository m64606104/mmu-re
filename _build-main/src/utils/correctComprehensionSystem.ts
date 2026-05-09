/**
 * 🧠 正确的理解力经验系统
 * 按照完整设计实施：门槛系统 + 经验系统 + 质量影响 + 词汇类型检测
 */

import { AIChildData } from '../types';

// 理解力能力数据结构
export interface ComprehensionAbility {
  level: number;
  experience: number; // 当前经验值（0-99，到100升级）
  totalExperience: number; // 累计总经验
}

// 理解力配置
export const COMPREHENSION_CONFIG = {
  // 解锁门槛（词汇数量）
  thresholds: {
    literal: 0,      // 字面理解：无门槛
    context: 50,     // 上下文理解：50词解锁
    abstract: 100,   // 抽象理解：100词解锁  
    emotion: 200,    // 情感理解：200词解锁
    logic: 500       // 逻辑推理：500词解锁
  },
  
  // 基础经验分配（每个普通词汇）
  baseExperience: {
    literal: 1.0,    // 字面理解：1.0经验/词
    context: 0.2,    // 上下文理解：0.2经验/词
    emotion: 0.1,    // 情感理解：0.1经验/词
    abstract: 0,     // 抽象理解：0经验/词（仅特殊词汇）
    logic: 0         // 逻辑推理：0经验/词（仅特殊词汇）
  },
  
  // 特殊词汇额外经验
  specialBonus: {
    emotion: 0.5,    // 情感词汇额外经验
    abstract: 0.3,   // 抽象词汇额外经验  
    logic: 0.2       // 逻辑词汇额外经验
  },
  
  // 总体理解力加权
  weights: {
    literal: 0.30,   // 字面理解：30%（基础最重要）
    context: 0.25,   // 上下文理解：25%（理解语境）
    abstract: 0.20,  // 抽象理解：20%（高级思维）
    emotion: 0.15,   // 情感理解：15%（社交能力）
    logic: 0.10      // 逻辑推理：10%（最高级能力）
  },
  
  // 升级设置
  expPerLevel: 100,  // 每级需要100经验
  maxLevel: 20       // 最高20级
};

// 词汇类型检测
const WORD_CATEGORIES = {
  // 情感词汇
  emotion: [
    '开心', '快乐', '高兴', '兴奋', '愉快', '满足', '幸福', '喜悦',
    '难过', '伤心', '悲伤', '失望', '沮丧', '痛苦', '忧伤', '哭泣',
    '生气', '愤怒', '烦恼', '讨厌', '害怕', '紧张', '担心', '焦虑',
    '爱', '喜欢', '讨厌', '恨', '想念', '关心', '在乎', '感动',
    '骄傲', '自豪', '羞耻', '害羞', '尴尬', '惊讶', '好奇', '期待'
  ],
  
  // 抽象词汇
  abstract: [
    '梦想', '希望', '理想', '目标', '未来', '过去', '现在', '时间',
    '自由', '平等', '公正', '真理', '美丽', '善良', '勇敢', '智慧',
    '友谊', '爱情', '亲情', '责任', '义务', '权利', '尊重', '信任',
    '成功', '失败', '进步', '发展', '创新', '传统', '文化', '艺术',
    '思考', '想象', '创造', '发现', '探索', '学习', '成长', '改变'
  ],
  
  // 逻辑词汇
  logic: [
    '因为', '所以', '如果', '那么', '虽然', '但是', '然而', '不过',
    '首先', '其次', '最后', '总之', '因此', '由于', '既然', '假如',
    '或者', '要么', '无论', '不管', '除非', '只要', '只有', '才能',
    '比较', '对比', '相同', '不同', '相似', '差异', '原因', '结果',
    '证明', '解释', '分析', '推理', '判断', '决定', '选择', '评价'
  ]
};

/**
 * 检测词汇类型
 */
export function detectWordType(word: string): ('emotion' | 'abstract' | 'logic')[] {
  const types: ('emotion' | 'abstract' | 'logic')[] = [];
  
  if (WORD_CATEGORIES.emotion.includes(word)) {
    types.push('emotion');
  }
  if (WORD_CATEGORIES.abstract.includes(word)) {
    types.push('abstract');
  }
  if (WORD_CATEGORIES.logic.includes(word)) {
    types.push('logic');
  }
  
  return types;
}

/**
 * 计算单词学习的经验分配
 */
export function calculateWordExperience(
  word: string,
  learningQuality: number, // 1-10分的学习质量
  currentWordCount: number
): Record<string, number> {
  const qualityMultiplier = learningQuality / 10;
  const wordTypes = detectWordType(word);
  const experience: Record<string, number> = {
    literal: 0,
    context: 0,
    abstract: 0,
    emotion: 0,
    logic: 0
  };
  
  // 字面理解：无门槛，一直获得经验
  experience.literal = COMPREHENSION_CONFIG.baseExperience.literal * qualityMultiplier;
  
  // 上下文理解：50词后开始获得经验
  if (currentWordCount >= COMPREHENSION_CONFIG.thresholds.context) {
    experience.context = COMPREHENSION_CONFIG.baseExperience.context * qualityMultiplier;
  }
  
  // 情感理解：200词后开始获得经验
  if (currentWordCount >= COMPREHENSION_CONFIG.thresholds.emotion) {
    experience.emotion = COMPREHENSION_CONFIG.baseExperience.emotion * qualityMultiplier;
    
    // 情感词汇额外加成
    if (wordTypes.includes('emotion')) {
      experience.emotion += COMPREHENSION_CONFIG.specialBonus.emotion * qualityMultiplier;
    }
  }
  
  // 抽象理解：100词后开始，仅特殊词汇获得经验
  if (currentWordCount >= COMPREHENSION_CONFIG.thresholds.abstract && wordTypes.includes('abstract')) {
    experience.abstract = COMPREHENSION_CONFIG.specialBonus.abstract * qualityMultiplier;
  }
  
  // 逻辑推理：500词后开始，仅逻辑词汇获得经验  
  if (currentWordCount >= COMPREHENSION_CONFIG.thresholds.logic && wordTypes.includes('logic')) {
    experience.logic = COMPREHENSION_CONFIG.specialBonus.logic * qualityMultiplier;
  }
  
  return experience;
}

/**
 * 添加经验并检查升级
 */
export function addExperienceAndCheckLevelUp(
  ability: ComprehensionAbility,
  experienceGained: number
): { leveledUp: boolean; newLevel: number; oldLevel: number } {
  const oldLevel = ability.level;
  
  // 累加经验
  ability.totalExperience += experienceGained;
  ability.experience += experienceGained;
  
  let leveledUp = false;
  let levelsGained = 0;
  
  // 检查升级（可能连续升级）
  while (ability.experience >= COMPREHENSION_CONFIG.expPerLevel && ability.level < COMPREHENSION_CONFIG.maxLevel) {
    ability.experience -= COMPREHENSION_CONFIG.expPerLevel;
    ability.level += 1;
    levelsGained += 1;
    leveledUp = true;
  }
  
  // 如果达到最高等级，多余经验丢弃
  if (ability.level >= COMPREHENSION_CONFIG.maxLevel) {
    ability.experience = Math.min(ability.experience, 99);
  }
  
  return {
    leveledUp,
    newLevel: ability.level,
    oldLevel
  };
}

/**
 * 获取能力显示信息
 */
export function getAbilityDisplay(
  abilityType: keyof typeof COMPREHENSION_CONFIG.thresholds,
  ability: ComprehensionAbility | undefined,
  currentWordCount: number
): {
  level: number;
  progress: number;
  display: string;
  hint: string | null;
  isUnlocked: boolean;
} {
  const threshold = COMPREHENSION_CONFIG.thresholds[abilityType];
  
  if (currentWordCount < threshold) {
    return {
      level: 0,
      progress: 0,
      display: '未解锁',
      hint: `达到${threshold}词后解锁`,
      isUnlocked: false
    };
  }
  
  if (!ability) {
    return {
      level: 1,
      progress: 0,
      display: 'Lv.1',
      hint: null,
      isUnlocked: true
    };
  }
  
  return {
    level: ability.level,
    progress: ability.experience,
    display: `Lv.${ability.level}`,
    hint: ability.level >= COMPREHENSION_CONFIG.maxLevel ? '已达最高等级' : null,
    isUnlocked: true
  };
}

/**
 * 计算总体理解力等级
 */
export function calculateOverallComprehension(
  abilities: Record<string, ComprehensionAbility>
): { level: number; progress: number } {
  let totalWeightedPoints = 0;
  let totalWeight = 0;
  
  for (const [abilityName, ability] of Object.entries(abilities)) {
    const weight = COMPREHENSION_CONFIG.weights[abilityName as keyof typeof COMPREHENSION_CONFIG.weights];
    if (weight && ability) {
      const abilityPoints = ability.level + (ability.experience / COMPREHENSION_CONFIG.expPerLevel);
      totalWeightedPoints += abilityPoints * weight;
      totalWeight += weight;
    }
  }
  
  if (totalWeight === 0) {
    return { level: 1, progress: 0 };
  }
  
  const averagePoints = totalWeightedPoints / totalWeight;
  const level = Math.floor(averagePoints);
  const progress = Math.round((averagePoints - level) * 100);
  
  return {
    level: Math.max(level, 1),
    progress: Math.min(progress, 99)
  };
}

/**
 * 主要函数：更新AI儿童的理解力
 */
export function updateChildComprehension(
  childData: AIChildData,
  newWord: string,
  learningQuality: number = 8
): {
  experienceGained: Record<string, number>;
  levelUps: Record<string, { leveledUp: boolean; newLevel: number; oldLevel: number }>;
} {
  const wordCount = childData.vocabulary.length;
  
  // 确保理解力数据结构存在
  if (!childData.comprehension) {
    childData.comprehension = {
      level: 1,
      progress: 0,
      abilities: {
        literal: { level: 1, progress: 0 },
        context: { level: 1, progress: 0 },
        abstract: { level: 1, progress: 0 },
        emotion: { level: 1, progress: 0 },
        logic: { level: 1, progress: 0 }
      }
    };
  }
  
  // 转换旧格式到新格式
  const abilities: Record<string, ComprehensionAbility> = {};
  for (const [key, oldAbility] of Object.entries(childData.comprehension.abilities)) {
    const level = oldAbility.level || 1;
    const progress = oldAbility.progress || 0;
    const totalExp = (oldAbility as any).totalExperience;
    
    abilities[key] = {
      level,
      experience: progress, // 现在progress就是当前等级的经验(0-99)
      totalExperience: totalExp || ((level - 1) * 100 + progress) // 如果有totalExp就用，否则计算
    };
  }
  
  // 计算这个词获得的经验
  const experienceGained = calculateWordExperience(newWord, learningQuality, wordCount);
  
  // 添加经验并检查升级
  const levelUps: Record<string, { leveledUp: boolean; newLevel: number; oldLevel: number }> = {};
  
  for (const [abilityName, expGain] of Object.entries(experienceGained)) {
    if (expGain > 0) {
      if (!abilities[abilityName]) {
        abilities[abilityName] = { level: 1, experience: 0, totalExperience: 0 };
      }
      
      levelUps[abilityName] = addExperienceAndCheckLevelUp(abilities[abilityName], expGain);
    }
  }
  
  // 更新childData格式以保持兼容性
  for (const [key, ability] of Object.entries(abilities)) {
    if (childData.comprehension.abilities[key as keyof typeof childData.comprehension.abilities]) {
      (childData.comprehension.abilities[key as keyof typeof childData.comprehension.abilities] as any).level = ability.level;
      (childData.comprehension.abilities[key as keyof typeof childData.comprehension.abilities] as any).progress = ability.experience; // 0-99经验值
      // 为了兼容，也存储totalExperience用于后续计算
      (childData.comprehension.abilities[key as keyof typeof childData.comprehension.abilities] as any).totalExperience = ability.totalExperience;
    }
  }
  
  // 计算总体理解力
  const overallComprehension = calculateOverallComprehension(abilities);
  childData.comprehension.level = overallComprehension.level;
  childData.comprehension.progress = overallComprehension.progress;
  
  console.log(`📚 ${newWord} 学习完成:`, {
    质量: `${learningQuality}/10`,
    经验获得: experienceGained,
    升级情况: Object.entries(levelUps).filter(([_, up]) => up.leveledUp),
    总体理解力: `Lv.${overallComprehension.level} (${overallComprehension.progress}%)`
  });
  
  return { experienceGained, levelUps };
}

/**
 * 重新计算所有词汇的理解力经验（用于兼容旧数据）
 */
export function recalculateComprehensionFromVocabulary(childData: AIChildData): void {
  if (!childData.vocabulary || childData.vocabulary.length === 0) {
    return;
  }
  
  // 重置理解力数据
  const abilities: Record<string, ComprehensionAbility> = {
    literal: { level: 1, experience: 0, totalExperience: 0 },
    context: { level: 1, experience: 0, totalExperience: 0 },
    abstract: { level: 1, experience: 0, totalExperience: 0 },
    emotion: { level: 1, experience: 0, totalExperience: 0 },
    logic: { level: 1, experience: 0, totalExperience: 0 }
  };
  
  // 逐个词汇重新计算经验
  childData.vocabulary.forEach((wordData, index) => {
    const currentWordCount = index + 1; // 学这个词时的词汇总数
    const learningQuality = 8; // 默认学习质量
    
    // 计算每个词的经验分配
    const wordExperience = calculateWordExperience(wordData.word, learningQuality, currentWordCount);
    
    // 添加经验
    for (const [abilityName, expGain] of Object.entries(wordExperience)) {
      if (expGain > 0 && abilities[abilityName]) {
        addExperienceAndCheckLevelUp(abilities[abilityName], expGain);
      }
    }
  });
  
  // 更新childData格式以保持兼容性
  if (!childData.comprehension) {
    childData.comprehension = {
      level: 1,
      progress: 0,
      abilities: {
        literal: { level: 1, progress: 0 },
        context: { level: 1, progress: 0 },
        abstract: { level: 1, progress: 0 },
        emotion: { level: 1, progress: 0 },
        logic: { level: 1, progress: 0 }
      }
    };
  }
  
  for (const [key, ability] of Object.entries(abilities)) {
    if (childData.comprehension.abilities[key as keyof typeof childData.comprehension.abilities]) {
      (childData.comprehension.abilities[key as keyof typeof childData.comprehension.abilities] as any).level = ability.level;
      (childData.comprehension.abilities[key as keyof typeof childData.comprehension.abilities] as any).progress = ability.experience;
    }
  }
  
  // 计算总体理解力
  const overallComprehension = calculateOverallComprehension(abilities);
  childData.comprehension.level = overallComprehension.level;
  childData.comprehension.progress = overallComprehension.progress;
  
  console.log(`🔄 ${childData.vocabulary.length}个词汇重新计算理解力完成:`, {
    字面理解: `Lv.${abilities.literal.level} (${abilities.literal.experience}%)`,
    上下文理解: `Lv.${abilities.context.level} (${abilities.context.experience}%)`,
    总体理解力: `Lv.${overallComprehension.level} (${overallComprehension.progress}%)`
  });
}

/**
 * 获取理解力发展建议
 */
export function getComprehensionRecommendations(
  childData: AIChildData
): Array<{ ability: string; reason: string; action: string }> {
  const recommendations: Array<{ ability: string; reason: string; action: string }> = [];
  const wordCount = childData.vocabulary.length;
  const abilities = childData.comprehension?.abilities || {};
  
  // 检查解锁建议
  if (wordCount >= 45 && wordCount < 50) {
    recommendations.push({
      ability: '上下文理解',
      reason: '即将解锁上下文理解能力',
      action: '再学5个词就能解锁新能力了！'
    });
  }
  
  if (wordCount >= 95 && wordCount < 100) {
    recommendations.push({
      ability: '抽象理解', 
      reason: '即将解锁抽象理解能力',
      action: '再学5个词就能理解抽象概念了！'
    });
  }
  
  // 检查能力发展建议
  if (abilities.literal?.level > (abilities.context?.level || 0) + 3 && wordCount >= 50) {
    recommendations.push({
      ability: '上下文理解',
      reason: '上下文理解相对薄弱',
      action: '多进行自由聊天来提升语境理解'
    });
  }
  
  return recommendations;
}
