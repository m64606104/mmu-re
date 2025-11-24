/**
 * 🌟 多维度理解力发展系统
 * 基于AI幼儿园的多种学习活动来全面提升理解力
 */

import { AIChildData, Lesson } from '../types';

// 学习活动类型及其对理解力的贡献
interface ActivityContribution {
  activityType: Lesson['type'] | 'chat' | 'topic_discussion';
  displayName: string;
  icon: string;
  contributions: {
    literal: number;      // 对字面理解的贡献权重
    context: number;      // 对上下文理解的贡献权重
    abstract: number;     // 对抽象理解的贡献权重
    emotion: number;      // 对情感理解的贡献权重
    logic: number;        // 对逻辑推理的贡献权重
  };
  baseExp: number;        // 基础经验值
  description: string;
}

/**
 * 各种学习活动对理解力的贡献配置
 */
export const ACTIVITY_CONTRIBUTIONS: Record<string, ActivityContribution> = {
  // 📝 词卡教学 - 主要提升字面理解
  word: {
    activityType: 'word',
    displayName: '词卡教学',
    icon: '📝',
    contributions: {
      literal: 1.0,      // 最主要贡献
      context: 0.3,      // 学词汇时也会涉及语境
      abstract: 0.1,     // 部分词汇有抽象含义
      emotion: 0.1,      // 情感相关词汇
      logic: 0.0         // 基本不涉及
    },
    baseExp: 3,
    description: '通过认识新词汇来提升基础理解能力'
  },

  // 💬 自由聊天 - 全面发展，重点是情感和上下文
  chat: {
    activityType: 'chat',
    displayName: '自由聊天',
    icon: '💬',
    contributions: {
      literal: 0.4,      // 运用已学词汇
      context: 0.8,      // 理解对话语境
      abstract: 0.5,     // 理解言外之意
      emotion: 1.0,      // 情感交流最重要
      logic: 0.3         // 简单推理
    },
    baseExp: 5,
    description: '通过自然对话提升情感理解和语境把握'
  },

  // 🎯 话题讨论 - 重点发展逻辑推理和抽象理解
  topic_discussion: {
    activityType: 'topic_discussion',
    displayName: '话题讨论',
    icon: '🎯',
    contributions: {
      literal: 0.5,      // 需要理解复杂词汇
      context: 0.9,      // 话题的前后关联
      abstract: 1.0,     // 讨论抽象概念
      emotion: 0.6,      // 表达观点情感
      logic: 1.0         // 逻辑论证最重要
    },
    baseExp: 8,
    description: '通过深度讨论提升逻辑思维和抽象理解'
  },

  // 📖 阅读故事 - 重点发展抽象理解和情感理解
  reading: {
    activityType: 'reading',
    displayName: '阅读理解',
    icon: '📖',
    contributions: {
      literal: 0.6,      // 理解文本内容
      context: 0.7,      // 故事情节关联
      abstract: 0.9,     // 理解寓意象征
      emotion: 0.8,      // 人物情感体验
      logic: 0.4         // 情节逻辑
    },
    baseExp: 6,
    description: '通过阅读故事提升抽象思维和情感理解'
  },

  // 📚 故事学习 - 类似阅读但更注重互动
  story: {
    activityType: 'story',
    displayName: '故事互动',
    icon: '📚',
    contributions: {
      literal: 0.5,
      context: 0.8,
      abstract: 1.0,     // 故事寓意
      emotion: 0.9,      // 角色情感
      logic: 0.5         // 故事逻辑
    },
    baseExp: 7,
    description: '通过故事互动发展想象力和情感理解'
  },

  // 🗣️ 对话练习 - 平衡发展各项能力
  conversation: {
    activityType: 'conversation',
    displayName: '对话练习',
    icon: '🗣️',
    contributions: {
      literal: 0.5,
      context: 0.8,
      abstract: 0.4,
      emotion: 0.7,
      logic: 0.6
    },
    baseExp: 4,
    description: '通过结构化对话练习综合运用各项能力'
  }
};

/**
 * 活动记录接口（扩展现有的Lesson）
 */
interface ActivityRecord {
  type: keyof typeof ACTIVITY_CONTRIBUTIONS;
  timestamp: number;
  duration: number;        // 持续时间（秒）
  quality: number;         // 活动质量评分（1-10）
  content: string;         // 活动内容描述
  wordsUsed: string[];     // 使用的词汇
  complexity: number;      // 复杂度评分（1-10）
}

/**
 * 根据活动类型和质量计算理解力经验增长
 */
export const calculateActivityExperience = (
  activity: ActivityRecord,
  currentAbilities: Record<string, { level: number; progress: number }>
): Record<string, number> => {
  const config = ACTIVITY_CONTRIBUTIONS[activity.type];
  if (!config) return {};

  const experience: Record<string, number> = {};
  
  // 基础经验 * 质量系数 * 复杂度系数 * 时长系数
  const qualityMultiplier = activity.quality / 10;
  const complexityMultiplier = activity.complexity / 10;
  const durationMultiplier = Math.min(activity.duration / 300, 2); // 最多2倍，5分钟为基准
  const baseMultiplier = qualityMultiplier * complexityMultiplier * durationMultiplier;

  for (const [ability, contribution] of Object.entries(config.contributions)) {
    if (contribution > 0) {
      // 高等级的能力获得经验衰减，避免无限增长
      const currentLevel = currentAbilities[ability]?.level || 1;
      const levelPenalty = Math.max(0.3, 1 - (currentLevel * 0.05)); // 等级越高，增长越慢
      
      experience[ability] = Math.round(
        config.baseExp * contribution * baseMultiplier * levelPenalty
      );
    }
  }

  return experience;
};

/**
 * 更新多维度理解力系统
 */
export const updateMultiDimensionalComprehension = (
  childData: AIChildData,
  recentActivities: ActivityRecord[] = []
): void => {
  // 1. 基于词汇量的基础理解力（保持原有逻辑）
  updateBaseComprehensionFromVocabulary(childData);
  
  // 2. 基于各种活动的理解力增长
  updateComprehensionFromActivities(childData, recentActivities);
  
  // 3. 计算总体理解力等级
  updateOverallComprehensionLevel(childData);
};

/**
 * 基于词汇量更新基础理解力（保持原有逻辑，但降低权重）
 */
const updateBaseComprehensionFromVocabulary = (childData: AIChildData): void => {
  const wordCount = childData.vocabulary.length;
  
  // 字面理解：主要基于词汇量，但不是唯一因素
  const literalBaseLevel = Math.min(15, Math.floor(wordCount / 8) + 1); // 降低纯词汇的贡献
  childData.comprehension.abilities.literal.level = Math.max(
    childData.comprehension.abilities.literal.level,
    literalBaseLevel
  );
  
  // 其他能力：词汇量只是基础门槛，真正提升需要通过相应活动
  if (wordCount >= 50 && childData.comprehension.abilities.context.level < 2) {
    childData.comprehension.abilities.context.level = 2; // 解锁上下文理解
  }
  if (wordCount >= 100 && childData.comprehension.abilities.abstract.level < 2) {
    childData.comprehension.abilities.abstract.level = 2; // 解锁抽象理解
  }
  if (wordCount >= 200 && childData.comprehension.abilities.emotion.level < 2) {
    childData.comprehension.abilities.emotion.level = 2; // 解锁情感理解
  }
  if (wordCount >= 500 && childData.comprehension.abilities.logic.level < 2) {
    childData.comprehension.abilities.logic.level = 2; // 解锁逻辑推理
  }
};

/**
 * 基于学习活动更新理解力
 */
const updateComprehensionFromActivities = (
  childData: AIChildData,
  activities: ActivityRecord[]
): void => {
  for (const activity of activities) {
    const experience = calculateActivityExperience(activity, childData.comprehension.abilities);
    
    for (const [ability, exp] of Object.entries(experience)) {
      if (exp > 0 && childData.comprehension.abilities[ability as keyof typeof childData.comprehension.abilities]) {
        addExperienceToAbility(
          childData.comprehension.abilities[ability as keyof typeof childData.comprehension.abilities] as any,
          exp
        );
      }
    }
  }
};

/**
 * 给特定能力添加经验值
 */
const addExperienceToAbility = (
  ability: { level: number; progress: number },
  experience: number
): void => {
  ability.progress += experience;
  
  // 检查是否升级
  while (ability.progress >= 100 && ability.level < 20) {
    ability.progress -= 100;
    ability.level += 1;
  }
  
  // 达到最高等级时，进度保持100%
  if (ability.level >= 20) {
    ability.progress = 100;
  }
};

/**
 * 更新总体理解力等级
 */
const updateOverallComprehensionLevel = (childData: AIChildData): void => {
  const abilities = Object.values(childData.comprehension.abilities) as Array<{level: number; progress: number}>;
  const totalLevelPoints = abilities.reduce((sum, ability) => sum + ability.level + (ability.progress / 100), 0);
  const avgLevel = totalLevelPoints / abilities.length;
  
  childData.comprehension.level = Math.floor(avgLevel);
  childData.comprehension.progress = Math.floor((avgLevel % 1) * 100);
};

/**
 * 记录学习活动（新接口）
 */
export const recordLearningActivity = async (
  childId: string,
  activityType: keyof typeof ACTIVITY_CONTRIBUTIONS,
  content: string,
  duration: number,
  quality: number = 5,
  complexity: number = 5,
  wordsUsed: string[] = []
): Promise<void> => {
  // 这里需要实现活动记录的存储逻辑
  console.log(`记录学习活动: ${activityType} - ${content}`);
  
  // TODO: 将活动记录保存到本地存储
  // TODO: 更新AI儿童的理解力数据
};

/**
 * 获取学习活动建议
 */
export const getActivityRecommendations = (childData: AIChildData): Array<{
  activity: string;
  reason: string;
  expectedBenefit: string;
}> => {
  const recommendations = [];
  const abilities = childData.comprehension.abilities;
  
  // 分析薄弱环节，推荐相应活动
  if (abilities.context.level < abilities.literal.level - 2) {
    recommendations.push({
      activity: '自由聊天',
      reason: '上下文理解相对薄弱',
      expectedBenefit: '提升对话语境的理解能力'
    });
  }
  
  if (abilities.logic.level < 3 && childData.vocabulary.length > 500) {
    recommendations.push({
      activity: '话题讨论',
      reason: '词汇量足够，可以开始逻辑训练',
      expectedBenefit: '培养逻辑思维和论证能力'
    });
  }
  
  if (abilities.abstract.level < 5 && abilities.literal.level > 8) {
    recommendations.push({
      activity: '阅读故事',
      reason: '字面理解已很好，可以提升抽象思维',
      expectedBenefit: '理解故事寓意和深层含义'
    });
  }
  
  return recommendations;
};
