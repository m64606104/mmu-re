/**
 * 🎯 每日经验上限管理器
 * 
 * 功能：
 * - 检查每日经验上限
 * - 记录每日活动经验
 * - 管理每日学习记录
 * - 防止刷经验行为
 */

import { AIChildData, DailyLearningRecord } from '../types';
import { COMPREHENSION_CONFIG } from './newComprehensionSystem';

// =================== 接口定义 ===================

/**
 * 经验限制检查结果
 */
export interface ExperienceLimitResult {
  canGain: boolean;           // 是否可以获得经验
  actualExp: number;          // 实际可获得的经验
  remaining: number;          // 剩余经验额度
  limitReached: boolean;      // 是否达到上限
  message: string;            // 状态消息
}

/**
 * 活动类型定义
 */
export type ActivityType = 'wordTeaching' | 'freeChat' | 'topicDiscussion' | 'storyReading';

/**
 * 今日学习概览
 */
export interface TodayOverview {
  wordTeaching: {
    roundsCompleted: number;
    totalRounds: number;
    wordsLearned: number;
    expGained: number;
    canGainMoreExp: boolean;
  };
  experienceStatus: {
    [K in ActivityType]: {
      gained: number;
      limit: number;
      remaining: number;
      percentage: number;
    }
  };
  suggestions: string[];
  totalExpToday: number;
  maxExpToday: number;
}

// =================== 核心功能 ===================

/**
 * 获取今日学习记录（如果不存在则创建）
 */
export function getTodayLearningRecord(childData: AIChildData): DailyLearningRecord {
  const today = new Date().toISOString().split('T')[0];
  
  // 检查现有记录是否为今日
  if (childData.dailyLearningRecord && childData.dailyLearningRecord.date === today) {
    return childData.dailyLearningRecord;
  }
  
  // 创建新的今日记录
  const newRecord: DailyLearningRecord = {
    date: today,
    wordTeaching: {
      roundsCompleted: 0,
      totalWordsLearned: 0,
      expGained: 0,
      canGainExp: true
    },
    experienceGained: {
      wordTeaching: 0,
      freeChat: 0,
      topicDiscussion: 0,
      storyReading: 0
    },
    activityCount: {
      chatSessions: 0,
      topicDiscussions: 0,
      storiesRead: 0
    }
  };
  
  childData.dailyLearningRecord = newRecord;
  return newRecord;
}

/**
 * 保存今日学习记录
 */
export function saveTodayLearningRecord(childData: AIChildData, record: DailyLearningRecord): void {
  childData.dailyLearningRecord = record;
  // 这里可以添加持久化逻辑，比如保存到localStorage
}

/**
 * 检查活动经验上限
 */
export function checkActivityExperienceLimit(
  childData: AIChildData,
  activityType: ActivityType,
  proposedExp: number
): ExperienceLimitResult {
  const todayRecord = getTodayLearningRecord(childData);
  const limits = COMPREHENSION_CONFIG.dailyExpLimits;
  
  const currentExp = todayRecord.experienceGained[activityType];
  const maxExp = limits[activityType];
  const remaining = Math.max(0, maxExp - currentExp);
  
  // 已达上限
  if (remaining === 0) {
    return {
      canGain: false,
      actualExp: 0,
      remaining: 0,
      limitReached: true,
      message: getActivityLimitMessage(activityType)
    };
  }
  
  // 计算实际可获得的经验
  const actualExp = Math.min(proposedExp, remaining);
  const willReachLimit = (currentExp + actualExp) >= maxExp;
  
  return {
    canGain: true,
    actualExp,
    remaining: remaining - actualExp,
    limitReached: willReachLimit,
    message: willReachLimit ? getActivityLimitMessage(activityType, true) : ''
  };
}

/**
 * 记录活动经验
 */
export function recordActivityExperience(
  childData: AIChildData,
  activityType: ActivityType,
  expGained: number
): void {
  const todayRecord = getTodayLearningRecord(childData);
  
  // 更新经验记录
  todayRecord.experienceGained[activityType] += expGained;
  
  // 更新活动次数（除了词卡教学）
  if (activityType === 'freeChat') {
    todayRecord.activityCount.chatSessions += 1;
  } else if (activityType === 'topicDiscussion') {
    todayRecord.activityCount.topicDiscussions += 1;
  } else if (activityType === 'storyReading') {
    todayRecord.activityCount.storiesRead += 1;
  }
  
  saveTodayLearningRecord(childData, todayRecord);
}

/**
 * 检查词卡教学可用性
 */
export function checkWordTeachingAvailability(childData: AIChildData): {
  canStart: boolean;
  currentRound: number;
  totalRounds: number;
  wordsLearned: number;
  maxWords: number;
  canGainExp: boolean;
  message: string;
} {
  const todayRecord = getTodayLearningRecord(childData);
  const wordRecord = todayRecord.wordTeaching;
  
  const maxRounds = 3;
  const canStart = wordRecord.roundsCompleted < maxRounds;
  const canGainExp = wordRecord.roundsCompleted === 0; // 只有第一轮给经验
  
  let message = '';
  if (!canStart) {
    message = '今日词卡教学已完成！明天再来学习新词汇吧~';
  } else if (!canGainExp) {
    message = `今日第${wordRecord.roundsCompleted + 1}轮学习（不增加经验，但可以学习新词汇）`;
  } else {
    message = '开始今日第1轮词卡教学，将获得经验奖励！';
  }
  
  return {
    canStart,
    currentRound: wordRecord.roundsCompleted + 1,
    totalRounds: maxRounds,
    wordsLearned: wordRecord.totalWordsLearned,
    maxWords: 60, // 每天最多60个词
    canGainExp,
    message
  };
}

/**
 * 完成词卡教学轮次
 */
export function completeWordTeachingRound(
  childData: AIChildData,
  wordsLearned: string[],
  experienceGained: number
): {
  roundInfo: any;
  message: string;
} {
  const todayRecord = getTodayLearningRecord(childData);
  const wordRecord = todayRecord.wordTeaching;
  
  // 更新轮次和词汇数
  wordRecord.roundsCompleted += 1;
  wordRecord.totalWordsLearned += wordsLearned.length;
  
  let message = '';
  
  // 只有第一轮给经验
  if (wordRecord.roundsCompleted === 1) {
    wordRecord.expGained = experienceGained;
    wordRecord.canGainExp = false;
    
    // 记录到总经验中
    todayRecord.experienceGained.wordTeaching += experienceGained;
    
    message = `完成第1轮教学！学会${wordsLearned.length}个新词，获得${experienceGained}经验点！`;
  } else {
    message = `完成第${wordRecord.roundsCompleted}轮教学！学会${wordsLearned.length}个新词！`;
  }
  
  // 检查是否还能继续
  const canContinue = wordRecord.roundsCompleted < 3;
  const roundInfo = {
    currentRound: wordRecord.roundsCompleted,
    canContinue,
    remainingRounds: 3 - wordRecord.roundsCompleted,
    nextRoundGivesExp: false // 后续轮次不给经验
  };
  
  saveTodayLearningRecord(childData, todayRecord);
  
  return { roundInfo, message };
}

/**
 * 获取今日学习概览
 */
export function getTodayLearningOverview(childData: AIChildData): TodayOverview {
  const todayRecord = getTodayLearningRecord(childData);
  const limits = COMPREHENSION_CONFIG.dailyExpLimits;
  
  // 词卡教学信息
  const wordTeaching = {
    roundsCompleted: todayRecord.wordTeaching.roundsCompleted,
    totalRounds: 3,
    wordsLearned: todayRecord.wordTeaching.totalWordsLearned,
    expGained: todayRecord.wordTeaching.expGained,
    canGainMoreExp: todayRecord.wordTeaching.canGainExp
  };
  
  // 经验状态
  const experienceStatus = {} as TodayOverview['experienceStatus'];
  let totalExpToday = 0;
  let maxExpToday = 0;
  
  for (const [activity, gained] of Object.entries(todayRecord.experienceGained)) {
    const limit = limits[activity as ActivityType];
    const remaining = Math.max(0, limit - gained);
    const percentage = Math.round((gained / limit) * 100);
    
    experienceStatus[activity as ActivityType] = {
      gained,
      limit,
      remaining,
      percentage
    };
    
    totalExpToday += gained;
    maxExpToday += limit;
  }
  
  // 生成智能建议
  const suggestions = generateLearningTips(todayRecord, childData, experienceStatus);
  
  return {
    wordTeaching,
    experienceStatus,
    suggestions,
    totalExpToday,
    maxExpToday
  };
}

/**
 * 获取剩余经验额度
 */
export function getRemainingExperienceQuota(childData: AIChildData): { [K in ActivityType]: number } {
  const todayRecord = getTodayLearningRecord(childData);
  const limits = COMPREHENSION_CONFIG.dailyExpLimits;
  
  const remaining = {} as { [K in ActivityType]: number };
  
  for (const activity of Object.keys(limits) as ActivityType[]) {
    const gained = todayRecord.experienceGained[activity];
    const limit = limits[activity];
    remaining[activity] = Math.max(0, limit - gained);
  }
  
  return remaining;
}

// =================== 辅助函数 ===================

/**
 * 获取活动上限消息
 */
function getActivityLimitMessage(activityType: ActivityType, aboutToReach: boolean = false): string {
  const activityNames = {
    wordTeaching: '词卡教学',
    freeChat: '自由聊天',
    topicDiscussion: '话题讨论',
    storyReading: '故事阅读'
  };
  
  const activityName = activityNames[activityType];
  
  if (aboutToReach) {
    return `今日${activityName}经验即将达到上限！`;
  }
  
  return `今日${activityName}经验已达上限，但可以继续活动！明天还会有新的经验奖励~`;
}

/**
 * 生成学习建议
 */
function generateLearningTips(
  todayRecord: DailyLearningRecord,
  childData: AIChildData,
  experienceStatus: TodayOverview['experienceStatus']
): string[] {
  const tips: string[] = [];
  
  // 词卡教学建议
  if (todayRecord.wordTeaching.roundsCompleted === 0) {
    tips.push('📝 建议先完成词卡教学，可以获得经验奖励');
  }
  
  // 自由聊天建议
  if (experienceStatus.freeChat.remaining > 10) {
    tips.push('💬 可以进行自由聊天，提升情感理解和上下文理解');
  }
  
  // 故事阅读建议
  if (experienceStatus.storyReading.remaining > 15) {
    tips.push('📖 读故事可以提升抽象理解和情感理解');
  }
  
  // 话题讨论建议（需要词汇量门槛）
  if (experienceStatus.topicDiscussion.remaining > 20 && childData.vocabulary.length >= 50) {
    tips.push('🎯 话题讨论可以大幅提升逻辑推理能力');
  }
  
  // 平衡学习建议
  const highExpActivities = Object.entries(experienceStatus)
    .filter(([_, status]) => status.percentage > 80)
    .map(([activity, _]) => activity);
    
  if (highExpActivities.length > 0) {
    tips.push('🎯 今天某些活动经验已接近上限，可以尝试其他学习方式');
  }
  
  // 鼓励坚持学习
  if (todayRecord.activityCount.chatSessions > 0 || 
      todayRecord.activityCount.topicDiscussions > 0 || 
      todayRecord.activityCount.storiesRead > 0) {
    tips.push('⭐ 今天的学习很棒！坚持下去会有更大进步');
  }
  
  return tips;
}
