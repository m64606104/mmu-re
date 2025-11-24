/**
 * 🎯 平衡的理解力成长系统
 * 包含故事分级和每日经验上限机制
 */

import { AIChildData } from '../types';

// 故事难度等级
export type StoryLevel = 'beginner' | 'elementary' | 'intermediate' | 'advanced';

// 故事分级配置
interface StoryLevelConfig {
  level: StoryLevel;
  displayName: string;
  icon: string;
  vocabularyRequirement: number;  // 需要的词汇量门槛
  contributions: {
    literal: number;
    context: number;
    abstract: number;
    emotion: number;
    logic: number;
  };
  description: string;
}

/**
 * 故事分级系统配置
 */
export const STORY_LEVEL_CONFIG: Record<StoryLevel, StoryLevelConfig> = {
  // 👶 初级故事：基础词汇学习为主
  beginner: {
    level: 'beginner',
    displayName: '启蒙故事',
    icon: '👶',
    vocabularyRequirement: 0,
    contributions: {
      literal: 0.3,      // 只是简单的词汇理解
      context: 0.1,      // 很少的上下文关联
      abstract: 0.0,     // 没有抽象内容
      emotion: 0.1,      // 基础情感（开心、难过）
      logic: 0.0         // 没有逻辑要求
    },
    description: '简单的日常生活故事，学习基础词汇'
  },

  // 🧒 基础故事：开始有简单的情节和情感
  elementary: {
    level: 'elementary',
    displayName: '基础故事',
    icon: '🧒',
    vocabularyRequirement: 50,
    contributions: {
      literal: 0.4,
      context: 0.3,      // 开始理解简单的前后关联
      abstract: 0.1,     // 很少的抽象内容
      emotion: 0.4,      // 更多情感表达
      logic: 0.1         // 简单的因果关系
    },
    description: '有简单情节的故事，培养基础理解能力'
  },

  // 📚 中级故事：复杂情节，开始有抽象元素
  intermediate: {
    level: 'intermediate',
    displayName: '进阶故事',
    icon: '📚',
    vocabularyRequirement: 200,
    contributions: {
      literal: 0.5,
      context: 0.6,      // 复杂的情节关联
      abstract: 0.5,     // 开始有比喻、象征
      emotion: 0.6,      // 复杂情感描写
      logic: 0.4         // 故事逻辑推理
    },
    description: '有复杂情节的故事，开始接触抽象概念'
  },

  // 📖 高级故事：深度文学内容，注重思考
  advanced: {
    level: 'advanced',
    displayName: '深度文学',
    icon: '📖',
    vocabularyRequirement: 500,
    contributions: {
      literal: 0.6,
      context: 0.8,      // 复杂的文学技巧
      abstract: 1.0,     // 丰富的抽象内容
      emotion: 0.8,      // 深度情感体验
      logic: 0.7         // 复杂的逻辑思考
    },
    description: '具有深度和内涵的文学作品，培养高级思维能力'
  }
};

// 每日经验上限配置
interface DailyExpLimits {
  chat: number;              // 自由聊天每日上限
  topic_discussion: number;  // 话题讨论每日上限
  story_reading: number;     // 故事阅读每日上限
  word_teaching: number;     // 词卡教学每日上限（较高，因为是基础）
}

/**
 * 基于成长阶段的每日经验上限
 */
export const DAILY_EXP_LIMITS: Record<string, DailyExpLimits> = {
  baby: {        // 婴儿期 (0-49词)
    chat: 15,              // 限制较低，避免过度刷聊天
    topic_discussion: 0,   // 还不能进行话题讨论
    story_reading: 20,     // 主要通过故事学习
    word_teaching: 50      // 词汇学习是重点
  },
  
  toddler: {     // 幼儿期 (50-199词)  
    chat: 25,
    topic_discussion: 20,
    story_reading: 30,
    word_teaching: 40
  },
  
  child: {       // 儿童期 (200-999词)
    chat: 35,
    topic_discussion: 35,
    story_reading: 40,
    word_teaching: 30      // 词汇重要性相对降低
  },
  
  teen: {        // 少年期 (1000词+)
    chat: 45,
    topic_discussion: 50,  // 重点发展逻辑思维
    story_reading: 45,
    word_teaching: 25
  }
};

// 每日经验获得记录
interface DailyExpRecord {
  date: string;  // YYYY-MM-DD格式
  chat: number;
  topic_discussion: number;
  story_reading: number;
  word_teaching: number;
}

/**
 * 获取今日经验记录
 */
const getTodayExpRecord = (childData: AIChildData): DailyExpRecord => {
  const today = new Date().toISOString().split('T')[0];
  
  // 从儿童数据中获取今日记录（需要在AIChildData中添加该字段）
  const todayRecord = (childData as any).dailyExpRecord;
  
  if (!todayRecord || todayRecord.date !== today) {
    return {
      date: today,
      chat: 0,
      topic_discussion: 0,
      story_reading: 0,
      word_teaching: 0
    };
  }
  
  return todayRecord;
};

/**
 * 保存今日经验记录
 */
const saveTodayExpRecord = (childData: AIChildData, record: DailyExpRecord): void => {
  (childData as any).dailyExpRecord = record;
};

/**
 * 检查是否达到今日经验上限
 */
export const checkDailyExpLimit = (
  childData: AIChildData,
  activityType: keyof DailyExpLimits,
  proposedExp: number
): { canGain: boolean; actualExp: number; limitReached: boolean } => {
  const stage = childData.stage;
  const limits = DAILY_EXP_LIMITS[stage];
  const todayRecord = getTodayExpRecord(childData);
  
  const currentExp = todayRecord[activityType];
  const maxExp = limits[activityType];
  const remainingExp = Math.max(0, maxExp - currentExp);
  
  if (remainingExp === 0) {
    return { canGain: false, actualExp: 0, limitReached: true };
  }
  
  const actualExp = Math.min(proposedExp, remainingExp);
  const willReachLimit = (currentExp + actualExp) >= maxExp;
  
  return { canGain: true, actualExp, limitReached: willReachLimit };
};

/**
 * 计算故事阅读经验（基于故事等级）
 */
export const calculateStoryExperience = (
  storyLevel: StoryLevel,
  readingDuration: number,        // 阅读时长（分钟）
  comprehensionQuality: number,   // 理解质量评分 (1-10)
  _childData: AIChildData
): { experience: Record<string, number>; message: string } => {
  const config = STORY_LEVEL_CONFIG[storyLevel];
  
  // 基础经验计算
  const baseExp = Math.min(readingDuration * 2, 20); // 最多20分钟有效
  const qualityMultiplier = comprehensionQuality / 10;
  
  const experience: Record<string, number> = {};
  
  for (const [ability, contribution] of Object.entries(config.contributions)) {
    if (contribution > 0) {
      const abilityExp = Math.round(baseExp * contribution * qualityMultiplier);
      experience[ability] = abilityExp;
    }
  }
  
  return {
    experience,
    message: `阅读${config.displayName}，获得了丰富的学习体验！`
  };
};

/**
 * 计算自由聊天经验
 */
export const calculateChatExperience = (
  chatDuration: number,           // 聊天时长（分钟）
  emotionalDepth: number,         // 情感深度评分 (1-10)
  contextComplexity: number,      // 对话复杂度评分 (1-10)
  childData: AIChildData
): { experience: Record<string, number>; limitInfo: any } => {
  // 基础经验较低，避免刷聊天
  const baseExp = Math.min(chatDuration * 1.5, 15); // 最多15分钟有效
  
  const experience = {
    literal: Math.round(baseExp * 0.3),
    context: Math.round(baseExp * 0.6 * (contextComplexity / 10)),
    abstract: Math.round(baseExp * 0.2),
    emotion: Math.round(baseExp * 0.8 * (emotionalDepth / 10)),
    logic: Math.round(baseExp * 0.2)
  };
  
  // 检查每日上限
  const totalExp = Object.values(experience).reduce((sum, exp) => sum + exp, 0);
  const limitCheck = checkDailyExpLimit(childData, 'chat', totalExp);
  
  if (!limitCheck.canGain) {
    return {
      experience: {},
      limitInfo: { 
        blocked: true, 
        message: '今天的自由聊天经验已达上限，但可以继续愉快聊天！' 
      }
    };
  }
  
  // 按比例缩放经验
  if (limitCheck.actualExp < totalExp) {
    const scale = limitCheck.actualExp / totalExp;
    for (const key in experience) {
      experience[key as keyof typeof experience] = Math.round(experience[key as keyof typeof experience] * scale);
    }
  }
  
  return {
    experience,
    limitInfo: {
      blocked: false,
      remaining: limitCheck.actualExp,
      limitReached: limitCheck.limitReached,
      message: limitCheck.limitReached ? '今日聊天经验已满，明天再来获得更多成长！' : ''
    }
  };
};

/**
 * 计算话题讨论经验
 */
export const calculateTopicDiscussionExperience = (
  discussionDuration: number,     // 讨论时长（分钟）
  logicalDepth: number,          // 逻辑深度评分 (1-10)
  abstractLevel: number,         // 抽象程度评分 (1-10)
  childData: AIChildData
): { experience: Record<string, number>; limitInfo: any } => {
  const baseExp = Math.min(discussionDuration * 2.5, 25); // 话题讨论经验值较高
  
  const experience = {
    literal: Math.round(baseExp * 0.4),
    context: Math.round(baseExp * 0.7),
    abstract: Math.round(baseExp * 0.8 * (abstractLevel / 10)),
    emotion: Math.round(baseExp * 0.5),
    logic: Math.round(baseExp * 1.0 * (logicalDepth / 10))
  };
  
  const totalExp = Object.values(experience).reduce((sum, exp) => sum + exp, 0);
  const limitCheck = checkDailyExpLimit(childData, 'topic_discussion', totalExp);
  
  if (!limitCheck.canGain) {
    return {
      experience: {},
      limitInfo: { blocked: true, message: '今天的话题讨论经验已达上限！' }
    };
  }
  
  if (limitCheck.actualExp < totalExp) {
    const scale = limitCheck.actualExp / totalExp;
    for (const key in experience) {
      experience[key as keyof typeof experience] = Math.round(experience[key as keyof typeof experience] * scale);
    }
  }
  
  return { experience, limitInfo: { blocked: false, limitReached: limitCheck.limitReached } };
};

/**
 * 更新每日经验记录
 */
export const updateDailyExpRecord = (
  childData: AIChildData,
  activityType: keyof DailyExpLimits,
  expGained: number
): void => {
  const todayRecord = getTodayExpRecord(childData);
  todayRecord[activityType] += expGained;
  saveTodayExpRecord(childData, todayRecord);
};

/**
 * 获取推荐的故事等级
 */
export const getRecommendedStoryLevel = (childData: AIChildData): StoryLevel => {
  const wordCount = childData.vocabulary.length;
  
  if (wordCount < 50) return 'beginner';
  if (wordCount < 200) return 'elementary';  
  if (wordCount < 500) return 'intermediate';
  return 'advanced';
};

/**
 * 获取今日剩余经验额度
 */
export const getDailyExpRemaining = (childData: AIChildData): DailyExpLimits => {
  const stage = childData.stage;
  const limits = DAILY_EXP_LIMITS[stage];
  const todayRecord = getTodayExpRecord(childData);
  
  return {
    chat: Math.max(0, limits.chat - todayRecord.chat),
    topic_discussion: Math.max(0, limits.topic_discussion - todayRecord.topic_discussion),
    story_reading: Math.max(0, limits.story_reading - todayRecord.story_reading),
    word_teaching: Math.max(0, limits.word_teaching - todayRecord.word_teaching)
  };
};
