/**
 * 🎯 新的词卡教学管理器
 * 
 * 基于多维度理解力成长系统的词卡教学逻辑：
 * - 每天3轮教学，每轮20个词
 * - 只有第1轮给经验，后续轮次可继续学习但不给经验
 * - 使用新的经验计算系统
 * - 支持词汇类型分析和特殊经验加成
 */

import { AIChildData, WordKnowledge, Conversation } from '../types';
import { smartLoad, smartSave } from './storage';
import { 
  calculateWordLearningExperience, 
  addExperienceToAbility, 
  calculateOverallComprehension,
  generateExperienceReport 
} from './newComprehensionSystem';
import { 
  checkWordTeachingAvailability, 
  completeWordTeachingRound, 
  recordActivityExperience 
} from './dailyExperienceManager';
import { buildAIChildSystemPrompt } from './aiKindergartenManager';

// =================== 接口定义 ===================

/**
 * 单词教学结果
 */
interface WordTeachingResult {
  success: boolean;
  message: string;
  isNewWord: boolean;
  familiarityChange?: number;
  experienceGained?: { [ability: string]: number };
  levelUps?: { [ability: string]: any };
}

/**
 * 教学轮次结果
 */
interface TeachingRoundResult {
  success: boolean;
  message: string;
  wordsLearned: string[];
  newWords: number;
  reviewedWords: number;
  totalExperience: number;
  experienceReport: string;
  roundInfo: any;
  canContinue: boolean;
}

/**
 * 教学状态检查结果
 */
interface TeachingStatusResult {
  canStart: boolean;
  currentRound: number;
  totalRounds: number;
  wordsLearned: number;
  maxWords: number;
  canGainExp: boolean;
  message: string;
  suggestedWords?: string[];
}

// =================== 核心功能 ===================

/**
 * 检查词卡教学状态
 */
export async function checkWordTeachingStatus(childId: string): Promise<TeachingStatusResult> {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const child = conversations.find(c => c.id === childId);
    
    if (!child || !child.aiChildData) {
      return {
        canStart: false,
        currentRound: 0,
        totalRounds: 3,
        wordsLearned: 0,
        maxWords: 60,
        canGainExp: false,
        message: '未找到AI儿童数据'
      };
    }
    
    const availability = checkWordTeachingAvailability(child.aiChildData);
    
    // 生成建议词汇
    const suggestedWords = generateSuggestedWords(child.aiChildData);
    
    return {
      ...availability,
      suggestedWords
    };
  } catch (error) {
    console.error('检查词卡教学状态失败：', error);
    return {
      canStart: false,
      currentRound: 0,
      totalRounds: 3,
      wordsLearned: 0,
      maxWords: 60,
      canGainExp: false,
      message: '检查状态失败'
    };
  }
}

/**
 * 教授单个词汇（新版本）
 */
export async function teachWordNew(
  childId: string,
  word: string,
  definition: string,
  examples: string[] = [],
  applyExperience: boolean = true
): Promise<WordTeachingResult> {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const child = conversations.find(c => c.id === childId);
    
    if (!child || !child.aiChildData) {
      return { 
        success: false, 
        message: '未找到AI儿童', 
        isNewWord: false 
      };
    }
    
    const existingWord = child.aiChildData.vocabulary.find(w => w.word === word);
    
    if (existingWord) {
      // 复习旧词，提升熟悉度
      const oldFamiliarity = existingWord.familiarity;
      existingWord.familiarity = Math.min(100, existingWord.familiarity + 15);
      existingWord.reviewCount++;
      existingWord.lastReview = Date.now();
      existingWord.definition = definition;
      
      if (examples.length > 0) {
        existingWord.examples = [...existingWord.examples, ...examples];
      }
      
      const familiarityChange = existingWord.familiarity - oldFamiliarity;
      
      return { 
        success: true, 
        message: `复习了"${word}"，熟悉度提升到${existingWord.familiarity}%！`,
        isNewWord: false,
        familiarityChange
      };
    } else {
      // 学习新词
      const newWord: WordKnowledge = {
        word,
        familiarity: 30,
        learnedAt: Date.now(),
        reviewCount: 0,
        lastReview: Date.now(),
        definition,
        examples
      };
      
      child.aiChildData.vocabulary.push(newWord);
      child.aiChildData.totalWordsLearned++;
      
      // 计算新词经验（如果启用）
      let experienceGained: { [ability: string]: number } = {};
      let levelUps: { [ability: string]: any } = {};
      
      if (applyExperience) {
        // 使用新的经验计算系统
        experienceGained = calculateWordLearningExperience([word], 8);
        
        // 应用经验到各项能力
        for (const [ability, exp] of Object.entries(experienceGained)) {
          if (exp > 0 && child.aiChildData.comprehension.abilities[ability as keyof typeof child.aiChildData.comprehension.abilities]) {
            const abilityData = child.aiChildData.comprehension.abilities[ability as keyof typeof child.aiChildData.comprehension.abilities] as any;
            levelUps[ability] = addExperienceToAbility(abilityData, exp);
          }
        }
        
        // 重新计算总体理解力
        const overall = calculateOverallComprehension(child.aiChildData.comprehension.abilities);
        child.aiChildData.comprehension.level = overall.level;
        child.aiChildData.comprehension.progress = overall.progress;
      }
      
      // 更新系统提示词
      if (child.characterSettings) {
        child.characterSettings.systemPrompt = buildAIChildSystemPrompt(
          child.aiChildData,
          child.aiChildData.userTitle || '家长'
        );
      }
      
      // 保存数据
      await smartSave('conversations', conversations);
      
      return { 
        success: true, 
        message: `学会了新词"${word}"！`,
        isNewWord: true,
        experienceGained: applyExperience ? experienceGained : undefined,
        levelUps: applyExperience ? levelUps : undefined
      };
    }
  } catch (error) {
    console.error('教授词汇失败：', error);
    return { 
      success: false, 
      message: `教授"${word}"失败`, 
      isNewWord: false 
    };
  }
}

/**
 * 完成一轮词卡教学（20个词）
 */
export async function completeTeachingRound(
  childId: string,
  words: Array<{ word: string; definition: string; examples?: string[] }>
): Promise<TeachingRoundResult> {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const child = conversations.find(c => c.id === childId);
    
    if (!child || !child.aiChildData) {
      return {
        success: false,
        message: '未找到AI儿童',
        wordsLearned: [],
        newWords: 0,
        reviewedWords: 0,
        totalExperience: 0,
        experienceReport: '',
        roundInfo: {},
        canContinue: false
      };
    }
    
    // 检查是否可以开始教学
    const status = checkWordTeachingAvailability(child.aiChildData);
    if (!status.canStart) {
      return {
        success: false,
        message: status.message,
        wordsLearned: [],
        newWords: 0,
        reviewedWords: 0,
        totalExperience: 0,
        experienceReport: '',
        roundInfo: {},
        canContinue: false
      };
    }
    
    // 逐个教授词汇
    const wordResults: WordTeachingResult[] = [];
    let newWords = 0;
    let reviewedWords = 0;
    
    for (const wordData of words) {
      const result = await teachWordNew(
        childId,
        wordData.word,
        wordData.definition,
        wordData.examples || [],
        status.canGainExp // 只有第一轮给经验
      );
      
      wordResults.push(result);
      
      if (result.success) {
        if (result.isNewWord) {
          newWords++;
        } else {
          reviewedWords++;
        }
      }
    }
    
    const wordsLearned = words.map(w => w.word);
    
    // 计算总体经验和升级情况
    let totalExperience = 0;
    const combinedLevelUps: { [ability: string]: any } = {};
    
    if (status.canGainExp) {
      // 使用新经验系统计算整轮经验
      const roundExperience = calculateWordLearningExperience(wordsLearned, 8);
      totalExperience = Object.values(roundExperience).reduce((sum, exp) => sum + exp, 0);
      
      // 应用经验到各项能力
      for (const [ability, exp] of Object.entries(roundExperience)) {
        if (exp > 0 && child.aiChildData.comprehension.abilities[ability as keyof typeof child.aiChildData.comprehension.abilities]) {
          const abilityData = child.aiChildData.comprehension.abilities[ability as keyof typeof child.aiChildData.comprehension.abilities] as any;
          combinedLevelUps[ability] = addExperienceToAbility(abilityData, exp);
        }
      }
      
      // 重新计算总体理解力
      const overall = calculateOverallComprehension(child.aiChildData.comprehension.abilities);
      child.aiChildData.comprehension.level = overall.level;
      child.aiChildData.comprehension.progress = overall.progress;
      
      // 记录到每日经验管理器
      recordActivityExperience(child.aiChildData, 'wordTeaching', totalExperience);
    }
    
    // 完成教学轮次
    const { roundInfo, message } = completeWordTeachingRound(
      child.aiChildData,
      wordsLearned,
      totalExperience
    );
    
    // 生成经验报告
    const experienceReport = status.canGainExp ? 
      generateExperienceReport('词卡教学', 
        status.canGainExp ? calculateWordLearningExperience(wordsLearned, 8) : {},
        combinedLevelUps
      ) : '';
    
    // 更新系统提示词
    if (child.characterSettings) {
      child.characterSettings.systemPrompt = buildAIChildSystemPrompt(
        child.aiChildData,
        child.aiChildData.userTitle || '家长'
      );
    }
    
    // 保存数据
    await smartSave('conversations', conversations);
    
    return {
      success: true,
      message,
      wordsLearned,
      newWords,
      reviewedWords,
      totalExperience,
      experienceReport,
      roundInfo,
      canContinue: roundInfo.canContinue
    };
    
  } catch (error) {
    console.error('完成教学轮次失败：', error);
    return {
      success: false,
      message: '教学失败',
      wordsLearned: [],
      newWords: 0,
      reviewedWords: 0,
      totalExperience: 0,
      experienceReport: '',
      roundInfo: {},
      canContinue: false
    };
  }
}

// =================== 辅助功能 ===================

/**
 * 生成建议词汇
 */
function generateSuggestedWords(childData: AIChildData): string[] {
  const stage = childData.stage;
  
  // 根据成长阶段和当前词汇量建议合适的词汇
  const wordSuggestions = {
    baby: [
      '妈妈', '爸爸', '水', '吃', '喝', '睡觉', '起床', '红色', '蓝色', '大', '小',
      '好', '不好', '谢谢', '再见', '你好', '名字', '开心', '难过', '热', '冷'
    ],
    toddler: [
      '朋友', '家', '学校', '老师', '同学', '玩具', '书', '画画', '唱歌', '跳舞',
      '跑步', '走路', '坐下', '站起来', '左边', '右边', '上面', '下面', '里面', '外面'
    ],
    child: [
      '学习', '思考', '记住', '忘记', '明白', '困惑', '努力', '放松', '帮助', '合作',
      '分享', '关心', '保护', '创造', '发现', '探索', '比较', '选择', '决定', '计划'
    ],
    teen: [
      '理解', '分析', '推理', '判断', '创新', '独立', '责任', '理想', '目标', '挑战',
      '坚持', '改变', '成长', '反思', '批判', '包容', '尊重', '诚实', '勇气', '智慧'
    ]
  };
  
  const suggestions = wordSuggestions[stage] || wordSuggestions.baby;
  
  // 过滤掉已学词汇
  const learnedWords = new Set(childData.vocabulary.map(v => v.word));
  const newSuggestions = suggestions.filter(word => !learnedWords.has(word));
  
  // 返回前20个建议
  return newSuggestions.slice(0, 20);
}

/**
 * 获取词汇学习统计
 */
export async function getVocabularyStats(childId: string): Promise<{
  totalWords: number;
  todayWords: number;
  averageFamiliarity: number;
  recentWords: WordKnowledge[];
  weakWords: WordKnowledge[];
}> {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const child = conversations.find(c => c.id === childId);
    
    if (!child || !child.aiChildData) {
      return {
        totalWords: 0,
        todayWords: 0,
        averageFamiliarity: 0,
        recentWords: [],
        weakWords: []
      };
    }
    
    const vocabulary = child.aiChildData.vocabulary;
    const today = new Date().toDateString();
    
    // 今日学习的词汇
    const todayWords = vocabulary.filter(word => 
      new Date(word.learnedAt).toDateString() === today
    ).length;
    
    // 平均熟悉度
    const averageFamiliarity = vocabulary.length > 0 ? 
      Math.round(vocabulary.reduce((sum, word) => sum + word.familiarity, 0) / vocabulary.length) : 0;
    
    // 最近学习的词汇（最新10个）
    const recentWords = [...vocabulary]
      .sort((a, b) => b.learnedAt - a.learnedAt)
      .slice(0, 10);
    
    // 熟悉度较低的词汇（需要复习）
    const weakWords = vocabulary
      .filter(word => word.familiarity < 70)
      .sort((a, b) => a.familiarity - b.familiarity)
      .slice(0, 10);
    
    return {
      totalWords: vocabulary.length,
      todayWords,
      averageFamiliarity,
      recentWords,
      weakWords
    };
  } catch (error) {
    console.error('获取词汇统计失败：', error);
    return {
      totalWords: 0,
      todayWords: 0,
      averageFamiliarity: 0,
      recentWords: [],
      weakWords: []
    };
  }
}
