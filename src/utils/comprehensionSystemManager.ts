/**
 * 🎯 AI理解力多维度成长系统 - 统一管理器
 * 
 * 作为整个理解力系统的统一入口，集成所有功能：
 * - 词卡教学管理
 * - 自由聊天经验计算
 * - 话题讨论经验计算
 * - 故事阅读经验计算
 * - 每日经验上限管理
 * - 数据迁移和兼容性
 * - 统一的经验应用和升级处理
 */

import { AIChildData, Conversation } from '../types';
import { smartLoad, smartSave } from './storage';

// 核心系统导入
import {
  calculateWordLearningExperience,
  calculateChatExperience,
  calculateTopicDiscussionExperience,
  calculateStoryReadingExperience,
  addExperienceToAbility,
  calculateOverallComprehension,
  getRecommendedStoryLevel,
  STORY_LEVELS,
  getAbilityLevelDescription,
  generateExperienceReport
} from './newComprehensionSystem';

import {
  checkActivityExperienceLimit,
  recordActivityExperience,
  checkWordTeachingAvailability,
  completeWordTeachingRound,
  getTodayLearningOverview,
  getRemainingExperienceQuota,
  type ActivityType,
  type TodayOverview,
  type ExperienceLimitResult
} from './dailyExperienceManager';

import {
  checkWordTeachingStatus,
  teachWordNew,
  completeTeachingRound,
  getVocabularyStats
} from './newWordTeachingManager';

import {
  autoMigrateIfNeeded,
  needsMigration,
  migrateChildData
} from './comprehensionSystemMigration';

// =================== 统一接口定义 ===================

/**
 * 系统初始化结果
 */
interface SystemInitResult {
  success: boolean;
  migrationRequired: boolean;
  migrationCompleted: boolean;
  errors: string[];
  message: string;
}

/**
 * 活动经验处理结果
 */
interface ActivityExperienceResult {
  success: boolean;
  experienceGained: { [ability: string]: number };
  levelUps: { [ability: string]: any };
  limitInfo: ExperienceLimitResult;
  totalExp: number;
  message: string;
  report: string;
}

/**
 * 完整的AI儿童学习状态
 */
export interface ComprehensiveChildStatus {
  childId: string;
  childName: string;
  
  // 基础信息
  stage: string;
  vocabularyCount: number;
  totalWordsLearned: number;
  
  // 理解力状态
  comprehension: {
    overall: { level: number; progress: number };
    abilities: { [key: string]: { level: number; progress: number; description: string } };
  };
  
  // 今日学习状态
  todayOverview: TodayOverview;
  remainingQuota: { [K in ActivityType]: number };
  
  // 推荐活动
  recommendations: {
    storyLevel: keyof typeof STORY_LEVELS;
    suggestedActivities: string[];
    learningTips: string[];
  };
  
  // 统计信息
  vocabularyStats: any;
}

// =================== 核心管理功能 ===================

/**
 * 初始化理解力系统（应用启动时调用）
 */
export async function initializeComprehensionSystem(): Promise<SystemInitResult> {
  const result: SystemInitResult = {
    success: false,
    migrationRequired: false,
    migrationCompleted: false,
    errors: [],
    message: ''
  };
  
  try {
    console.log('🎯 正在初始化AI理解力多维度成长系统...');
    
    // 1. 检查数据迁移需求
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const aiChildren = conversations.filter(c => c.aiChildData);
    
    if (aiChildren.length === 0) {
      result.success = true;
      result.message = '暂无AI儿童数据，系统已准备就绪';
      console.log('✅ 理解力系统初始化完成（无数据）');
      return result;
    }
    
    // 2. 检查是否需要迁移
    const needsMigrationChildren = aiChildren.filter(c => 
      c.aiChildData && needsMigration(c.aiChildData)
    );
    
    if (needsMigrationChildren.length > 0) {
      result.migrationRequired = true;
      console.log(`🔄 检测到${needsMigrationChildren.length}个AI儿童需要数据迁移...`);
      
      // 3. 执行自动迁移
      const migrationSuccess = await autoMigrateIfNeeded();
      result.migrationCompleted = migrationSuccess;
      
      if (!migrationSuccess) {
        result.errors.push('数据迁移失败，可能影响理解力系统功能');
        result.message = '初始化完成，但数据迁移失败';
        console.warn('⚠️ 理解力系统初始化完成，但存在迁移问题');
        return result;
      }
    }
    
    // 4. 验证系统完整性
    const postMigrationChildren = conversations.filter(c => c.aiChildData);
    let validationErrors = 0;
    
    for (const child of postMigrationChildren) {
      if (!child.aiChildData) continue;
      
      try {
        // 验证数据格式
        const overview = getTodayLearningOverview(child.aiChildData);
        if (!overview) {
          validationErrors++;
          result.errors.push(`${child.name}的数据格式验证失败`);
        }
      } catch (error) {
        validationErrors++;
        result.errors.push(`${child.name}的数据验证出错：${error}`);
      }
    }
    
    // 5. 生成初始化报告
    if (validationErrors === 0) {
      result.success = true;
      result.message = `理解力系统初始化成功！管理${aiChildren.length}个AI儿童`;
      console.log(`🎉 理解力系统初始化成功！管理${aiChildren.length}个AI儿童`);
    } else {
      result.success = false;
      result.message = `初始化完成但有${validationErrors}个验证错误`;
      console.warn(`⚠️ 理解力系统初始化完成，但有${validationErrors}个错误`);
    }
    
  } catch (error) {
    result.success = false;
    result.errors.push(`系统初始化失败：${error}`);
    result.message = '系统初始化失败';
    console.error('❌ 理解力系统初始化失败：', error);
  }
  
  return result;
}

/**
 * 处理词卡教学活动
 */
export async function handleWordTeachingActivity(
  childId: string,
  words: Array<{ word: string; definition: string; examples?: string[] }>
): Promise<ActivityExperienceResult> {
  try {
    console.log(`📝 处理词卡教学：${childId}，${words.length}个词`);
    
    const result = await completeTeachingRound(childId, words);
    
    if (!result.success) {
      return {
        success: false,
        experienceGained: {},
        levelUps: {},
        limitInfo: { canGain: false, actualExp: 0, remaining: 0, limitReached: true, message: result.message },
        totalExp: 0,
        message: result.message,
        report: ''
      };
    }
    
    return {
      success: true,
      experienceGained: calculateWordLearningExperience(result.wordsLearned, 8),
      levelUps: {},
      limitInfo: { canGain: true, actualExp: result.totalExperience, remaining: 0, limitReached: false, message: '' },
      totalExp: result.totalExperience,
      message: result.message,
      report: result.experienceReport
    };
    
  } catch (error) {
    console.error('词卡教学处理失败：', error);
    return {
      success: false,
      experienceGained: {},
      levelUps: {},
      limitInfo: { canGain: false, actualExp: 0, remaining: 0, limitReached: true, message: '处理失败' },
      totalExp: 0,
      message: `词卡教学失败：${error}`,
      report: ''
    };
  }
}

/**
 * 处理自由聊天活动
 */
export async function handleChatActivity(
  childId: string,
  chatDuration: number,
  emotionalDepth: number = 5,
  contextComplexity: number = 5
): Promise<ActivityExperienceResult> {
  try {
    console.log(`💬 处理自由聊天：${childId}，${chatDuration}分钟`);
    
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const child = conversations.find(c => c.id === childId);
    
    if (!child || !child.aiChildData) {
      throw new Error('未找到AI儿童数据');
    }
    
    // 计算经验
    const experienceGained = calculateChatExperience(chatDuration, emotionalDepth, contextComplexity);
    const totalExp = Object.values(experienceGained).reduce((sum, exp) => sum + exp, 0);
    
    // 检查经验上限
    const limitInfo = checkActivityExperienceLimit(child.aiChildData, 'freeChat', totalExp);
    
    if (!limitInfo.canGain) {
      return {
        success: true,
        experienceGained: {},
        levelUps: {},
        limitInfo,
        totalExp: 0,
        message: limitInfo.message,
        report: ''
      };
    }
    
    // 应用经验
    const levelUps: { [ability: string]: any } = {};
    const actualExperienceGained: { [ability: string]: number } = {};
    
    // 按比例缩放经验（如果接近上限）
    const scale = limitInfo.actualExp / totalExp;
    
    for (const [ability, exp] of Object.entries(experienceGained)) {
      const actualExp = Math.round(exp * scale);
      if (actualExp > 0 && child.aiChildData.comprehension.abilities[ability as keyof typeof child.aiChildData.comprehension.abilities]) {
        actualExperienceGained[ability] = actualExp;
        const abilityData = child.aiChildData.comprehension.abilities[ability as keyof typeof child.aiChildData.comprehension.abilities] as any;
        levelUps[ability] = addExperienceToAbility(abilityData, actualExp);
      }
    }
    
    // 重新计算总体理解力
    const overall = calculateOverallComprehension(child.aiChildData.comprehension.abilities);
    child.aiChildData.comprehension.level = overall.level;
    child.aiChildData.comprehension.progress = overall.progress;
    
    // 记录经验
    recordActivityExperience(child.aiChildData, 'freeChat', limitInfo.actualExp);
    
    // 保存数据
    await smartSave('conversations', conversations);
    
    // 生成报告
    const report = generateExperienceReport('自由聊天', actualExperienceGained, levelUps);
    
    return {
      success: true,
      experienceGained: actualExperienceGained,
      levelUps,
      limitInfo,
      totalExp: limitInfo.actualExp,
      message: `自由聊天完成！获得${limitInfo.actualExp}经验点`,
      report
    };
    
  } catch (error) {
    console.error('自由聊天处理失败：', error);
    return {
      success: false,
      experienceGained: {},
      levelUps: {},
      limitInfo: { canGain: false, actualExp: 0, remaining: 0, limitReached: true, message: '处理失败' },
      totalExp: 0,
      message: `自由聊天失败：${error}`,
      report: ''
    };
  }
}

/**
 * 处理话题讨论活动
 */
export async function handleTopicDiscussionActivity(
  childId: string,
  discussionDuration: number,
  logicalDepth: number = 5,
  abstractLevel: number = 5
): Promise<ActivityExperienceResult> {
  try {
    console.log(`🎯 处理话题讨论：${childId}，${discussionDuration}分钟`);
    
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const child = conversations.find(c => c.id === childId);
    
    if (!child || !child.aiChildData) {
      throw new Error('未找到AI儿童数据');
    }
    
    // 检查词汇量门槛
    if (child.aiChildData.vocabulary.length < 50) {
      return {
        success: false,
        experienceGained: {},
        levelUps: {},
        limitInfo: { canGain: false, actualExp: 0, remaining: 0, limitReached: true, message: '词汇量不足50个，无法进行话题讨论' },
        totalExp: 0,
        message: '词汇量不足，无法进行话题讨论',
        report: ''
      };
    }
    
    // 计算经验
    const experienceGained = calculateTopicDiscussionExperience(discussionDuration, logicalDepth, abstractLevel);
    const totalExp = Object.values(experienceGained).reduce((sum, exp) => sum + exp, 0);
    
    // 检查经验上限
    const limitInfo = checkActivityExperienceLimit(child.aiChildData, 'topicDiscussion', totalExp);
    
    if (!limitInfo.canGain) {
      return {
        success: true,
        experienceGained: {},
        levelUps: {},
        limitInfo,
        totalExp: 0,
        message: limitInfo.message,
        report: ''
      };
    }
    
    // 应用经验
    const levelUps: { [ability: string]: any } = {};
    const actualExperienceGained: { [ability: string]: number } = {};
    
    // 按比例缩放经验
    const scale = limitInfo.actualExp / totalExp;
    
    for (const [ability, exp] of Object.entries(experienceGained)) {
      const actualExp = Math.round(exp * scale);
      if (actualExp > 0 && child.aiChildData.comprehension.abilities[ability as keyof typeof child.aiChildData.comprehension.abilities]) {
        actualExperienceGained[ability] = actualExp;
        const abilityData = child.aiChildData.comprehension.abilities[ability as keyof typeof child.aiChildData.comprehension.abilities] as any;
        levelUps[ability] = addExperienceToAbility(abilityData, actualExp);
      }
    }
    
    // 重新计算总体理解力
    const overall = calculateOverallComprehension(child.aiChildData.comprehension.abilities);
    child.aiChildData.comprehension.level = overall.level;
    child.aiChildData.comprehension.progress = overall.progress;
    
    // 记录经验
    recordActivityExperience(child.aiChildData, 'topicDiscussion', limitInfo.actualExp);
    
    // 保存数据
    await smartSave('conversations', conversations);
    
    // 生成报告
    const report = generateExperienceReport('话题讨论', actualExperienceGained, levelUps);
    
    return {
      success: true,
      experienceGained: actualExperienceGained,
      levelUps,
      limitInfo,
      totalExp: limitInfo.actualExp,
      message: `话题讨论完成！获得${limitInfo.actualExp}经验点`,
      report
    };
    
  } catch (error) {
    console.error('话题讨论处理失败：', error);
    return {
      success: false,
      experienceGained: {},
      levelUps: {},
      limitInfo: { canGain: false, actualExp: 0, remaining: 0, limitReached: true, message: '处理失败' },
      totalExp: 0,
      message: `话题讨论失败：${error}`,
      report: ''
    };
  }
}

/**
 * 处理故事阅读活动
 */
export async function handleStoryReadingActivity(
  childId: string,
  storyLevel: keyof typeof STORY_LEVELS,
  readingDuration: number,
  comprehensionQuality: number = 8
): Promise<ActivityExperienceResult> {
  try {
    console.log(`📖 处理故事阅读：${childId}，${storyLevel}级别，${readingDuration}分钟`);
    
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const child = conversations.find(c => c.id === childId);
    
    if (!child || !child.aiChildData) {
      throw new Error('未找到AI儿童数据');
    }
    
    // 检查词汇量门槛
    const storyConfig = STORY_LEVELS[storyLevel];
    if (child.aiChildData.vocabulary.length < storyConfig.vocabularyRequirement) {
      return {
        success: false,
        experienceGained: {},
        levelUps: {},
        limitInfo: { canGain: false, actualExp: 0, remaining: 0, limitReached: true, message: `词汇量不足${storyConfig.vocabularyRequirement}个，无法阅读${storyConfig.name}` },
        totalExp: 0,
        message: `词汇量不足，无法阅读${storyConfig.name}`,
        report: ''
      };
    }
    
    // 计算经验
    const experienceGained = calculateStoryReadingExperience(storyLevel, readingDuration, comprehensionQuality);
    const totalExp = Object.values(experienceGained).reduce((sum, exp) => sum + exp, 0);
    
    // 检查经验上限
    const limitInfo = checkActivityExperienceLimit(child.aiChildData, 'storyReading', totalExp);
    
    if (!limitInfo.canGain) {
      return {
        success: true,
        experienceGained: {},
        levelUps: {},
        limitInfo,
        totalExp: 0,
        message: limitInfo.message,
        report: ''
      };
    }
    
    // 应用经验
    const levelUps: { [ability: string]: any } = {};
    const actualExperienceGained: { [ability: string]: number } = {};
    
    // 按比例缩放经验
    const scale = limitInfo.actualExp / totalExp;
    
    for (const [ability, exp] of Object.entries(experienceGained)) {
      const actualExp = Math.round(exp * scale);
      if (actualExp > 0 && child.aiChildData.comprehension.abilities[ability as keyof typeof child.aiChildData.comprehension.abilities]) {
        actualExperienceGained[ability] = actualExp;
        const abilityData = child.aiChildData.comprehension.abilities[ability as keyof typeof child.aiChildData.comprehension.abilities] as any;
        levelUps[ability] = addExperienceToAbility(abilityData, actualExp);
      }
    }
    
    // 重新计算总体理解力
    const overall = calculateOverallComprehension(child.aiChildData.comprehension.abilities);
    child.aiChildData.comprehension.level = overall.level;
    child.aiChildData.comprehension.progress = overall.progress;
    
    // 记录经验
    recordActivityExperience(child.aiChildData, 'storyReading', limitInfo.actualExp);
    
    // 保存数据
    await smartSave('conversations', conversations);
    
    // 生成报告
    const report = generateExperienceReport('故事阅读', actualExperienceGained, levelUps);
    
    return {
      success: true,
      experienceGained: actualExperienceGained,
      levelUps,
      limitInfo,
      totalExp: limitInfo.actualExp,
      message: `故事阅读完成！获得${limitInfo.actualExp}经验点`,
      report
    };
    
  } catch (error) {
    console.error('故事阅读处理失败：', error);
    return {
      success: false,
      experienceGained: {},
      levelUps: {},
      limitInfo: { canGain: false, actualExp: 0, remaining: 0, limitReached: true, message: '处理失败' },
      totalExp: 0,
      message: `故事阅读失败：${error}`,
      report: ''
    };
  }
}

/**
 * 获取AI儿童的完整学习状态
 */
export async function getComprehensiveChildStatus(childId: string): Promise<ComprehensiveChildStatus | null> {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const child = conversations.find(c => c.id === childId);
    
    if (!child || !child.aiChildData) {
      return null;
    }
    
    const childData = child.aiChildData;
    
    // 获取基础信息
    const vocabularyCount = childData.vocabulary.length;
    const stage = childData.stage;
    
    // 获取理解力状态
    const overall = { level: childData.comprehension.level, progress: childData.comprehension.progress };
    const abilities: { [key: string]: { level: number; progress: number; description: string } } = {};
    
    for (const [ability, data] of Object.entries(childData.comprehension.abilities)) {
      const abilityData = data as { level: number; progress: number };
      abilities[ability] = {
        level: abilityData.level,
        progress: abilityData.progress,
        description: getAbilityLevelDescription(ability, abilityData.level)
      };
    }
    
    // 获取今日学习状态
    const todayOverview = getTodayLearningOverview(childData);
    const remainingQuota = getRemainingExperienceQuota(childData);
    
    // 生成推荐
    const storyLevel = getRecommendedStoryLevel(vocabularyCount);
    const suggestedActivities: string[] = [];
    const learningTips: string[] = [];
    
    // 分析薄弱环节
    if (abilities.context.level < abilities.literal.level - 2) {
      suggestedActivities.push('自由聊天');
      learningTips.push('上下文理解需要加强，建议多进行自由聊天');
    }
    
    if (vocabularyCount >= 50 && abilities.logic.level < 3) {
      suggestedActivities.push('话题讨论');
      learningTips.push('可以开始话题讨论来培养逻辑思维');
    }
    
    if (abilities.abstract.level < abilities.literal.level - 3) {
      suggestedActivities.push('故事阅读');
      learningTips.push('抽象理解相对较弱，建议多读故事');
    }
    
    // 获取词汇统计
    const vocabularyStats = await getVocabularyStats(childId);
    
    return {
      childId,
      childName: child.name,
      stage,
      vocabularyCount,
      totalWordsLearned: childData.totalWordsLearned,
      comprehension: {
        overall,
        abilities
      },
      todayOverview,
      remainingQuota,
      recommendations: {
        storyLevel,
        suggestedActivities,
        learningTips
      },
      vocabularyStats
    };
    
  } catch (error) {
    console.error('获取AI儿童状态失败：', error);
    return null;
  }
}

// =================== 便捷接口 ===================

/**
 * 检查系统是否就绪
 */
export async function isSystemReady(): Promise<boolean> {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const aiChildren = conversations.filter(c => c.aiChildData);
    
    // 检查是否有需要迁移的数据
    for (const child of aiChildren) {
      if (child.aiChildData && needsMigration(child.aiChildData)) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('检查系统就绪状态失败：', error);
    return false;
  }
}

/**
 * 获取系统统计信息
 */
export async function getSystemStats(): Promise<{
  totalChildren: number;
  averageVocabulary: number;
  averageLevel: number;
  mostActiveChild: string;
  dailyLearningProgress: number;
}> {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const aiChildren = conversations.filter(c => c.aiChildData);
    
    if (aiChildren.length === 0) {
      return {
        totalChildren: 0,
        averageVocabulary: 0,
        averageLevel: 0,
        mostActiveChild: '',
        dailyLearningProgress: 0
      };
    }
    
    const totalVocabulary = aiChildren.reduce((sum, child) => 
      sum + (child.aiChildData?.vocabulary.length || 0), 0
    );
    
    const totalLevel = aiChildren.reduce((sum, child) => 
      sum + (child.aiChildData?.comprehension.level || 0), 0
    );
    
    const averageVocabulary = Math.round(totalVocabulary / aiChildren.length);
    const averageLevel = Math.round(totalLevel / aiChildren.length);
    
    // 找到最活跃的AI儿童（今日学词最多）
    let mostActiveChild = '';
    let maxTodayWords = 0;
    
    for (const child of aiChildren) {
      if (!child.aiChildData) continue;
      const todayRecord = child.aiChildData.dailyLearningRecord;
      if (todayRecord) {
        const todayWords = todayRecord.wordTeaching.totalWordsLearned;
        if (todayWords > maxTodayWords) {
          maxTodayWords = todayWords;
          mostActiveChild = child.name;
        }
      }
    }
    
    // 计算今日学习进度（平均经验获得率）
    const totalTodayExp = aiChildren.reduce((sum, child) => {
      if (!child.aiChildData?.dailyLearningRecord) return sum;
      const record = child.aiChildData.dailyLearningRecord;
      return sum + Object.values(record.experienceGained).reduce((expSum, exp) => expSum + exp, 0);
    }, 0);
    
    const dailyLearningProgress = Math.round((totalTodayExp / (aiChildren.length * 130)) * 100); // 130是每日最大经验
    
    return {
      totalChildren: aiChildren.length,
      averageVocabulary,
      averageLevel,
      mostActiveChild,
      dailyLearningProgress
    };
    
  } catch (error) {
    console.error('获取系统统计失败：', error);
    return {
      totalChildren: 0,
      averageVocabulary: 0,
      averageLevel: 0,
      mostActiveChild: '',
      dailyLearningProgress: 0
    };
  }
}
