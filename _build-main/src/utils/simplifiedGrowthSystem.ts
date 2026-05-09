/**
 * 🎯 简化的理解力成长系统
 * 基于用户现有的词卡教学规则和统一的每日经验上限
 */

import { AIChildData } from '../types';

// 词卡教学规则
export const WORD_TEACHING_CONFIG = {
  dailyRounds: 3,           // 每天可以进行3次教学
  wordsPerRound: 20,        // 每次教学20个词
  maxDailyWords: 60,        // 每天最多60个词
  expOnlyFirstRound: true   // 只有第一次20个词给经验
};

// 统一的每日经验上限（所有成长阶段相同）
export const UNIFIED_DAILY_EXP_LIMITS = {
  chat: 30,              // 自由聊天
  topic_discussion: 35,   // 话题讨论
  story_reading: 40,      // 故事阅读
  word_teaching: 25       // 词卡教学（只有首次20词）
};

// 每日学习记录
interface DailyLearningRecord {
  date: string;  // YYYY-MM-DD
  
  // 词卡教学记录
  wordTeaching: {
    roundsCompleted: number;    // 已完成轮次 (0-3)
    totalWordsLearned: number;  // 今日总学词数
    expGained: number;          // 获得的经验值
    canGainExp: boolean;        // 是否还能获得经验
  };
  
  // 其他活动经验记录
  chatExp: number;
  topicExp: number;
  storyExp: number;
}

/**
 * 获取今日学习记录
 */
const getTodayRecord = (childData: AIChildData): DailyLearningRecord => {
  const today = new Date().toISOString().split('T')[0];
  
  // 从childData中获取记录（需要扩展AIChildData接口）
  const record = (childData as any).dailyLearningRecord;
  
  if (!record || record.date !== today) {
    // 创建新的今日记录
    return {
      date: today,
      wordTeaching: {
        roundsCompleted: 0,
        totalWordsLearned: 0,
        expGained: 0,
        canGainExp: true
      },
      chatExp: 0,
      topicExp: 0,
      storyExp: 0
    };
  }
  
  return record;
};

/**
 * 保存今日学习记录
 */
const saveTodayRecord = (childData: AIChildData, record: DailyLearningRecord): void => {
  (childData as any).dailyLearningRecord = record;
};

/**
 * 词卡教学：检查是否可以开始新一轮
 */
export const checkWordTeachingAvailability = (childData: AIChildData): {
  canStart: boolean;
  currentRound: number;
  totalRounds: number;
  wordsLearned: number;
  maxWords: number;
  canGainExp: boolean;
  message: string;
} => {
  const record = getTodayRecord(childData);
  const wordRecord = record.wordTeaching;
  
  const canStart = wordRecord.roundsCompleted < WORD_TEACHING_CONFIG.dailyRounds;
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
    totalRounds: WORD_TEACHING_CONFIG.dailyRounds,
    wordsLearned: wordRecord.totalWordsLearned,
    maxWords: WORD_TEACHING_CONFIG.maxDailyWords,
    canGainExp,
    message
  };
};

/**
 * 完成一轮词卡教学
 */
export const completeWordTeachingRound = (
  childData: AIChildData,
  wordsLearned: string[],
  learningQuality: number = 8 // 1-10评分
): {
  expGained: Record<string, number>;
  roundInfo: any;
  message: string;
} => {
  const record = getTodayRecord(childData);
  const wordRecord = record.wordTeaching;
  
  // 更新轮次和词汇数
  wordRecord.roundsCompleted += 1;
  wordRecord.totalWordsLearned += wordsLearned.length;
  
  let expGained: Record<string, number> = {};
  let message = '';
  
  // 只有第一轮给经验
  if (wordRecord.roundsCompleted === 1) {
    // 计算经验（主要是字面理解，少量其他）
    const baseExp = Math.min(wordsLearned.length, 20); // 最多20个词
    const qualityMultiplier = learningQuality / 10;
    
    expGained = {
      literal: Math.round(baseExp * 1.0 * qualityMultiplier),     // 主要提升
      context: Math.round(baseExp * 0.2 * qualityMultiplier),    // 少量提升
      emotion: Math.round(baseExp * 0.1 * qualityMultiplier),    // 很少提升
    };
    
    wordRecord.expGained = Object.values(expGained).reduce((sum, exp) => sum + exp, 0);
    wordRecord.canGainExp = false;
    
    message = `完成第1轮教学！学会${wordsLearned.length}个新词，获得经验奖励！`;
  } else {
    message = `完成第${wordRecord.roundsCompleted}轮教学！学会${wordsLearned.length}个新词！`;
  }
  
  // 检查是否还能继续
  const canContinue = wordRecord.roundsCompleted < WORD_TEACHING_CONFIG.dailyRounds;
  const roundInfo = {
    currentRound: wordRecord.roundsCompleted,
    canContinue,
    remainingRounds: WORD_TEACHING_CONFIG.dailyRounds - wordRecord.roundsCompleted,
    nextRoundGivesExp: false // 后续轮次不给经验
  };
  
  saveTodayRecord(childData, record);
  
  return { expGained, roundInfo, message };
};

/**
 * 检查其他活动的经验上限
 */
export const checkActivityExpLimit = (
  childData: AIChildData,
  activityType: 'chat' | 'topic_discussion' | 'story_reading',
  proposedExp: number
): { canGain: boolean; actualExp: number; remaining: number; message: string } => {
  const record = getTodayRecord(childData);
  const limits = UNIFIED_DAILY_EXP_LIMITS;
  
  let currentExp = 0;
  switch (activityType) {
    case 'chat':
      currentExp = record.chatExp;
      break;
    case 'topic_discussion':
      currentExp = record.topicExp;
      break;
    case 'story_reading':
      currentExp = record.storyExp;
      break;
  }
  
  const maxExp = limits[activityType];
  const remaining = Math.max(0, maxExp - currentExp);
  
  if (remaining === 0) {
    const activityNames = {
      chat: '自由聊天',
      topic_discussion: '话题讨论',
      story_reading: '故事阅读'
    };
    
    return {
      canGain: false,
      actualExp: 0,
      remaining: 0,
      message: `今日${activityNames[activityType]}经验已达上限，但可以继续进行！`
    };
  }
  
  const actualExp = Math.min(proposedExp, remaining);
  return {
    canGain: true,
    actualExp,
    remaining: remaining - actualExp,
    message: ''
  };
};

/**
 * 记录活动经验
 */
export const recordActivityExp = (
  childData: AIChildData,
  activityType: 'chat' | 'topic_discussion' | 'story_reading',
  expGained: number
): void => {
  const record = getTodayRecord(childData);
  
  switch (activityType) {
    case 'chat':
      record.chatExp += expGained;
      break;
    case 'topic_discussion':
      record.topicExp += expGained;
      break;
    case 'story_reading':
      record.storyExp += expGained;
      break;
  }
  
  saveTodayRecord(childData, record);
};

/**
 * 获取今日学习概况
 */
export const getTodayLearningOverview = (childData: AIChildData): {
  wordTeaching: any;
  otherActivities: any;
  suggestions: string[];
} => {
  const record = getTodayRecord(childData);
  const limits = UNIFIED_DAILY_EXP_LIMITS;
  
  const wordTeaching = {
    roundsCompleted: record.wordTeaching.roundsCompleted,
    totalRounds: WORD_TEACHING_CONFIG.dailyRounds,
    wordsLearned: record.wordTeaching.totalWordsLearned,
    maxWords: WORD_TEACHING_CONFIG.maxDailyWords,
    expGained: record.wordTeaching.expGained,
    canGainMoreExp: record.wordTeaching.canGainExp
  };
  
  const otherActivities = {
    chat: { gained: record.chatExp, limit: limits.chat, remaining: limits.chat - record.chatExp },
    topic: { gained: record.topicExp, limit: limits.topic_discussion, remaining: limits.topic_discussion - record.topicExp },
    story: { gained: record.storyExp, limit: limits.story_reading, remaining: limits.story_reading - record.storyExp }
  };
  
  // 生成建议
  const suggestions = [];
  if (wordTeaching.roundsCompleted === 0) {
    suggestions.push('📝 建议先完成词卡教学，可以获得经验奖励');
  }
  if (otherActivities.chat.remaining > 10) {
    suggestions.push('💬 可以进行自由聊天，提升情感理解');
  }
  if (otherActivities.story.remaining > 15) {
    suggestions.push('📖 读故事可以提升抽象理解和情感理解');
  }
  if (otherActivities.topic.remaining > 20 && childData.vocabulary.length >= 50) {
    suggestions.push('🎯 话题讨论可以大幅提升逻辑推理能力');
  }
  
  return { wordTeaching, otherActivities, suggestions };
};
