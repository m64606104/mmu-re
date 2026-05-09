/**
 * 🎯 AI理解力多维度成长系统 - 核心经验计算
 * 
 * 基于用户讨论的完整设计方案实现：
 * - 多种活动的经验计算（词卡、聊天、讨论、故事）
 * - 每日经验上限机制
 * - 故事分级系统
 * - 透明的经验计算公式
 */

// 多维度理解力成长系统的核心计算模块

// =================== 基础配置 ===================

/**
 * 经验计算基础配置
 */
export const COMPREHENSION_CONFIG = {
  // 单词学习基础经验值（每个词）
  wordExperience: {
    literal: 1.0,      // 字面理解：每个词1.0经验
    context: 0.2,      // 上下文理解：每个词0.2经验
    abstract: 0.0,     // 抽象理解：普通词汇不给经验
    emotion: 0.1,      // 情感理解：每个词0.1经验
    logic: 0.0         // 逻辑推理：普通词汇不给经验
  },
  
  // 特殊词汇额外加成
  specialWordBonus: {
    emotion: 0.5,      // 情感词汇额外给0.5情感理解经验
    abstract: 0.3,     // 抽象词汇额外给0.3抽象理解经验
    logic: 0.2         // 逻辑词汇额外给0.2逻辑推理经验
  },
  
  // 等级升级需求
  expPerLevel: 100,    // 每级需要100经验
  maxLevel: 20,        // 最高20级
  
  // 总体理解力权重计算
  overallWeights: {
    literal: 0.30,     // 字面理解权重30%
    context: 0.25,     // 上下文理解权重25%
    abstract: 0.20,    // 抽象理解权重20%
    emotion: 0.15,     // 情感理解权重15%
    logic: 0.10        // 逻辑推理权重10%
  },
  
  // 每日经验上限（统一设置）
  dailyExpLimits: {
    wordTeaching: 25,     // 词卡教学（仅首轮）
    freeChat: 30,         // 自由聊天
    topicDiscussion: 35,  // 话题讨论
    storyReading: 40      // 故事阅读
  }
};

/**
 * 故事分级系统配置
 */
export const STORY_LEVELS = {
  beginner: {
    name: '启蒙故事',
    icon: '👶',
    vocabularyRequirement: 0,
    experienceMultipliers: {
      literal: 0.3,
      context: 0.1,
      abstract: 0.0,
      emotion: 0.1,
      logic: 0.0
    },
    description: '简单的日常生活故事，学习基础词汇'
  },
  elementary: {
    name: '基础故事',
    icon: '🧒',
    vocabularyRequirement: 50,
    experienceMultipliers: {
      literal: 0.4,
      context: 0.3,
      abstract: 0.1,
      emotion: 0.4,
      logic: 0.1
    },
    description: '有简单情节的故事，培养基础理解能力'
  },
  intermediate: {
    name: '进阶故事',
    icon: '📚',
    vocabularyRequirement: 200,
    experienceMultipliers: {
      literal: 0.5,
      context: 0.6,
      abstract: 0.5,
      emotion: 0.6,
      logic: 0.4
    },
    description: '有复杂情节的故事，开始接触抽象概念'
  },
  advanced: {
    name: '深度文学',
    icon: '📖',
    vocabularyRequirement: 500,
    experienceMultipliers: {
      literal: 0.6,
      context: 0.8,
      abstract: 1.0,
      emotion: 0.8,
      logic: 0.7
    },
    description: '具有深度和内涵的文学作品，培养高级思维能力'
  }
} as const;

// =================== 词汇分析 ===================

/**
 * 词汇分类关键词库
 */
const WORD_CATEGORIES = {
  emotion: ['开心', '高兴', '快乐', '难过', '伤心', '生气', '愤怒', '害怕', '恐惧', '喜欢', '讨厌', '爱', '恨', '激动', '兴奋', '紧张', '焦虑', '担心', '期待', '失望'],
  abstract: ['思考', '想象', '梦想', '希望', '理想', '自由', '正义', '美丽', '善良', '勇敢', '智慧', '知识', '真理', '时间', '空间', '未来', '过去', '永远', '无限'],
  logic: ['因为', '所以', '如果', '那么', '但是', '然而', '因此', '由于', '比较', '分析', '推理', '判断', '证明', '假设', '结论', '原因', '结果', '条件']
};

/**
 * 分析词汇类型，计算特殊词汇数量
 */
export function analyzeWordTypes(words: string[]): {
  emotionWords: number;
  abstractWords: number;
  logicWords: number;
  total: number;
} {
  let emotionWords = 0;
  let abstractWords = 0;
  let logicWords = 0;
  
  for (const word of words) {
    // 检查情感词汇
    if (WORD_CATEGORIES.emotion.some(keyword => word.includes(keyword))) {
      emotionWords++;
    }
    // 检查抽象词汇
    if (WORD_CATEGORIES.abstract.some(keyword => word.includes(keyword))) {
      abstractWords++;
    }
    // 检查逻辑词汇
    if (WORD_CATEGORIES.logic.some(keyword => word.includes(keyword))) {
      logicWords++;
    }
  }
  
  return {
    emotionWords,
    abstractWords,
    logicWords,
    total: words.length
  };
}

// =================== 经验计算 ===================

/**
 * 计算词卡教学的经验获得
 */
export function calculateWordLearningExperience(
  words: string[],
  learningQuality: number = 8
): { [ability: string]: number } {
  const analysis = analyzeWordTypes(words);
  const qualityMultiplier = Math.max(0.1, Math.min(1.0, learningQuality / 10));
  
  // 基础经验计算
  const baseExp = {
    literal: words.length * COMPREHENSION_CONFIG.wordExperience.literal,
    context: words.length * COMPREHENSION_CONFIG.wordExperience.context,
    abstract: analysis.abstractWords * COMPREHENSION_CONFIG.specialWordBonus.abstract,
    emotion: (words.length * COMPREHENSION_CONFIG.wordExperience.emotion) + 
             (analysis.emotionWords * COMPREHENSION_CONFIG.specialWordBonus.emotion),
    logic: analysis.logicWords * COMPREHENSION_CONFIG.specialWordBonus.logic
  };
  
  // 应用学习质量系数
  const finalExp: { [ability: string]: number } = {};
  for (const [ability, exp] of Object.entries(baseExp)) {
    finalExp[ability] = Math.round(exp * qualityMultiplier);
  }
  
  return finalExp;
}

/**
 * 计算自由聊天的经验获得
 */
export function calculateChatExperience(
  chatDuration: number,           // 聊天时长（分钟）
  emotionalDepth: number = 5,     // 情感深度评分 (1-10)
  contextComplexity: number = 5   // 对话复杂度评分 (1-10)
): { [ability: string]: number } {
  // 基础经验（最多15分钟有效）
  const baseExp = Math.min(chatDuration * 1.5, 15);
  
  return {
    literal: Math.round(baseExp * 0.3),
    context: Math.round(baseExp * 0.6 * (contextComplexity / 10)),
    abstract: Math.round(baseExp * 0.2),
    emotion: Math.round(baseExp * 0.8 * (emotionalDepth / 10)),
    logic: Math.round(baseExp * 0.2)
  };
}

/**
 * 计算话题讨论的经验获得
 */
export function calculateTopicDiscussionExperience(
  discussionDuration: number,     // 讨论时长（分钟）
  logicalDepth: number = 5,      // 逻辑深度评分 (1-10)
  abstractLevel: number = 5      // 抽象程度评分 (1-10)
): { [ability: string]: number } {
  // 基础经验（最多25分钟有效）
  const baseExp = Math.min(discussionDuration * 2.5, 25);
  
  return {
    literal: Math.round(baseExp * 0.4),
    context: Math.round(baseExp * 0.7),
    abstract: Math.round(baseExp * 0.8 * (abstractLevel / 10)),
    emotion: Math.round(baseExp * 0.5),
    logic: Math.round(baseExp * 1.0 * (logicalDepth / 10))
  };
}

/**
 * 计算故事阅读的经验获得
 */
export function calculateStoryReadingExperience(
  storyLevel: keyof typeof STORY_LEVELS,
  readingDuration: number,        // 阅读时长（分钟）
  comprehensionQuality: number = 8 // 理解质量评分 (1-10)
): { [ability: string]: number } {
  const levelConfig = STORY_LEVELS[storyLevel];
  const baseExp = Math.min(readingDuration * 2, 20); // 最多20分钟有效
  const qualityMultiplier = comprehensionQuality / 10;
  
  const experience: { [ability: string]: number } = {};
  
  for (const [ability, multiplier] of Object.entries(levelConfig.experienceMultipliers)) {
    if (multiplier > 0) {
      experience[ability] = Math.round(baseExp * multiplier * qualityMultiplier);
    }
  }
  
  return experience;
}

// =================== 升级系统 ===================

/**
 * 能力升级结果接口
 */
interface LevelUpResult {
  leveledUp: boolean;
  newLevel: number;
  levelsGained: number;
  expOverflow: number;
}

/**
 * 为特定能力添加经验并处理升级
 */
export function addExperienceToAbility(
  ability: { level: number; progress: number },
  experienceToAdd: number
): LevelUpResult {
  let currentExp = ability.progress + experienceToAdd;
  let levelsGained = 0;
  
  // 检查升级（可能连续升级）
  while (currentExp >= COMPREHENSION_CONFIG.expPerLevel && ability.level < COMPREHENSION_CONFIG.maxLevel) {
    currentExp -= COMPREHENSION_CONFIG.expPerLevel;
    ability.level += 1;
    levelsGained += 1;
  }
  
  // 如果达到最高等级，多余经验丢弃
  if (ability.level >= COMPREHENSION_CONFIG.maxLevel) {
    ability.progress = 100;
    currentExp = 0;
  } else {
    ability.progress = currentExp;
  }
  
  return {
    leveledUp: levelsGained > 0,
    newLevel: ability.level,
    levelsGained,
    expOverflow: currentExp
  };
}

/**
 * 计算总体理解力等级和进度
 */
export function calculateOverallComprehension(
  abilities: { [key: string]: { level: number; progress: number } }
): { level: number; progress: number } {
  const weights = COMPREHENSION_CONFIG.overallWeights;
  let totalWeightedPoints = 0;
  let totalWeight = 0;
  
  // 计算加权平均
  for (const [abilityName, ability] of Object.entries(abilities)) {
    const weight = weights[abilityName as keyof typeof weights];
    if (weight) {
      const abilityPoints = ability.level + (ability.progress / 100);
      totalWeightedPoints += abilityPoints * weight;
      totalWeight += weight;
    }
  }
  
  const averagePoints = totalWeightedPoints / totalWeight;
  const level = Math.floor(averagePoints);
  const progress = Math.round((averagePoints - level) * 100);
  
  return { level, progress };
}

// =================== 实用工具 ===================

/**
 * 获取推荐的故事等级
 */
export function getRecommendedStoryLevel(vocabularyCount: number): keyof typeof STORY_LEVELS {
  if (vocabularyCount < 50) return 'beginner';
  if (vocabularyCount < 200) return 'elementary';  
  if (vocabularyCount < 500) return 'intermediate';
  return 'advanced';
}

/**
 * 计算升级还需要多少经验
 */
export function getExpToNextLevel(ability: { level: number; progress: number }): number {
  if (ability.level >= COMPREHENSION_CONFIG.maxLevel) {
    return 0; // 已达最高等级
  }
  return COMPREHENSION_CONFIG.expPerLevel - ability.progress;
}

/**
 * 获取能力等级描述
 */
export function getAbilityLevelDescription(ability: string, level: number): string {
  const descriptions = {
    literal: {
      1: '基础认字', 5: '词汇丰富', 10: '文字精通', 15: '语言大师', 20: '文字艺术家'
    },
    context: {
      1: '初识语境', 5: '理解对话', 10: '把握暗示', 15: '洞察言外', 20: '语境专家'
    },
    abstract: {
      1: '具体思维', 5: '初步抽象', 10: '概念理解', 15: '深度思考', 20: '哲学思辨'
    },
    emotion: {
      1: '感知情绪', 5: '理解感情', 10: '共情能力', 15: '情感智慧', 20: '心灵导师'
    },
    logic: {
      1: '简单推理', 5: '逻辑思维', 10: '分析判断', 15: '推理大师', 20: '逻辑专家'
    }
  };
  
  const abilityDescs = descriptions[ability as keyof typeof descriptions];
  if (!abilityDescs) return '未知能力';
  
  // 找到最接近的等级描述
  const levels = Object.keys(abilityDescs).map(Number).sort((a, b) => a - b);
  let targetLevel = levels[0];
  
  for (const lvl of levels) {
    if (level >= lvl) {
      targetLevel = lvl;
    }
  }
  
  return abilityDescs[targetLevel as keyof typeof abilityDescs] || '发展中';
}

/**
 * 生成经验计算报告
 */
export function generateExperienceReport(
  activityType: string,
  experience: { [ability: string]: number },
  levelUps: { [ability: string]: LevelUpResult }
): string {
  let report = `\n📊 ${activityType}经验报告：\n\n`;
  
  const totalExp = Object.values(experience).reduce((sum, exp) => sum + exp, 0);
  report += `总获得经验：${totalExp}点\n\n`;
  
  for (const [ability, exp] of Object.entries(experience)) {
    if (exp > 0) {
      const abilityNames = {
        literal: '字面理解',
        context: '上下文理解', 
        abstract: '抽象理解',
        emotion: '情感理解',
        logic: '逻辑推理'
      };
      
      const abilityName = abilityNames[ability as keyof typeof abilityNames] || ability;
      const levelUp = levelUps[ability];
      
      report += `${abilityName}：+${exp}经验`;
      if (levelUp?.leveledUp) {
        report += ` 🎉 升级到Lv.${levelUp.newLevel}！`;
      }
      report += '\n';
    }
  }
  
  return report;
}
