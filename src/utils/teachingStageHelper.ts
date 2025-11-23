/**
 * 🎓 教学阶段辅助工具
 * 
 * 功能：根据AI词汇量判断当前成长阶段，并提供对应的教学配置
 * 
 * 设计原则：
 * - Baby期（0-100词）：咿呀学语，需要重复
 * - Toddler期（100-500词）：好奇宝宝，简单问答
 * - Child期（500-1500词）：十万个为什么，浅层思考
 * - Teen期（1500+词）：深度对话，哲学思考
 */

import { GrowthStage } from '../types';

/**
 * 教学模式类型
 */
export type TeachingMode = 'repetition' | 'qa' | 'story' | 'dialogue';

/**
 * 教学阶段配置
 */
export interface TeachingStageConfig {
  stage: GrowthStage;                    // 成长阶段
  mode: TeachingMode;                     // 教学模式
  sceneComplexity: number;                // 场景复杂度 (0-3)
  questionDepth: number;                  // 提问深度 (1-5)
  responseStyle: 'simple' | 'curious' | 'thinking' | 'philosophical';  // 回复风格
  requiresRepetition: boolean;            // 是否需要重复
  minRepetitions: number;                 // 最少重复次数
  maxRepetitions: number;                 // 最多重复次数
  understandingSpeed: number;             // 理解速度 (0-100)
  canGenerateScene: boolean;              // 是否生成场景
  uiTemplate: 'baby' | 'toddler' | 'child' | 'teen';  // UI模板
}

/**
 * 根据词汇量获取教学阶段配置
 */
export function getTeachingStageConfig(vocabularyCount: number): TeachingStageConfig {
  // Baby期（0-100词）：咿呀学语
  if (vocabularyCount < 100) {
    return {
      stage: 'baby',
      mode: 'repetition',
      sceneComplexity: 0,              // 无场景
      questionDepth: 1,                 // 只问"是什么"
      responseStyle: 'simple',
      requiresRepetition: true,
      minRepetitions: 3,                // 至少重复3次
      maxRepetitions: 5,                // 最多5次
      understandingSpeed: 20,           // 理解很慢
      canGenerateScene: false,          // 不生成场景
      uiTemplate: 'baby'
    };
  }
  
  // Toddler期（100-500词）：好奇宝宝
  if (vocabularyCount < 500) {
    return {
      stage: 'toddler',
      mode: 'qa',
      sceneComplexity: 1,              // 简单插图
      questionDepth: 2,                 // 问"是什么意思"
      responseStyle: 'curious',
      requiresRepetition: false,
      minRepetitions: 1,
      maxRepetitions: 2,
      understandingSpeed: 50,           // 理解较快
      canGenerateScene: true,           // 可生成简单场景
      uiTemplate: 'toddler'
    };
  }
  
  // Child期（500-1500词）：十万个为什么
  if (vocabularyCount < 1500) {
    return {
      stage: 'child',
      mode: 'story',
      sceneComplexity: 2,              // 简单情节
      questionDepth: 3,                 // 问"为什么"
      responseStyle: 'thinking',
      requiresRepetition: false,
      minRepetitions: 1,
      maxRepetitions: 1,
      understandingSpeed: 75,           // 理解较好
      canGenerateScene: true,           // 生成故事场景
      uiTemplate: 'child'
    };
  }
  
  // Teen期（1500+词）：深度对话
  return {
    stage: 'teen',
    mode: 'dialogue',
    sceneComplexity: 3,                // 复杂场景
    questionDepth: 5,                   // 深度追问
    responseStyle: 'philosophical',
    requiresRepetition: false,
    minRepetitions: 1,
    maxRepetitions: 1,
    understandingSpeed: 95,             // 理解很快
    canGenerateScene: true,             // 生成深度场景
    uiTemplate: 'teen'
  };
}

/**
 * 获取阶段描述文本
 */
export function getStageDescription(stage: GrowthStage): string {
  const descriptions = {
    baby: '咿呀学语期 - 正在学习发音和认字',
    toddler: '好奇宝宝期 - 开始理解词语含义',
    child: '求知成长期 - 能够思考和提问',
    teen: '深度思考期 - 可以进行哲学讨论'
  };
  return descriptions[stage];
}

/**
 * 获取阶段对应的表情符号
 */
export function getStageEmoji(stage: GrowthStage): string {
  const emojis = {
    baby: '👶',
    toddler: '🧒',
    child: '👦',
    teen: '🧑'
  };
  return emojis[stage];
}

/**
 * 检查是否需要升级阶段提示
 * 在词汇量达到阈值时返回true
 */
export function shouldShowStageUpgradeNotification(
  oldCount: number,
  newCount: number
): { shouldShow: boolean; newStage?: GrowthStage } {
  const thresholds = [100, 500, 1500];
  
  for (const threshold of thresholds) {
    if (oldCount < threshold && newCount >= threshold) {
      const config = getTeachingStageConfig(newCount);
      return {
        shouldShow: true,
        newStage: config.stage
      };
    }
  }
  
  return { shouldShow: false };
}

/**
 * 获取阶段升级祝贺文案
 */
export function getStageUpgradeMessage(stage: GrowthStage, childName: string): string {
  const messages = {
    baby: `🎉 恭喜！${childName}已经认识了一些字，开始咿呀学语啦！`,
    toddler: `🎊 太棒了！${childName}学会了100个词，进入好奇宝宝期！现在可以开始理解词语的含义了！`,
    child: `✨ 了不起！${childName}掌握了500个词，进入求知成长期！可以进行更深入的学习了！`,
    teen: `🌟 amazing！${childName}已经学会了1500个词，进入深度思考期！可以讨论复杂的话题了！`
  };
  return messages[stage];
}

/**
 * 根据阶段生成AI的初始反应（Baby期专用）
 * 
 * @param repetitionCount 这是第几次教这个词
 * @param word 要教的词
 */
export function generateBabyRepetitionResponse(
  repetitionCount: number,
  word: string
): string {
  if (repetitionCount === 0) {
    return '"啊...？"（完全不懂的样子）';
  }
  
  if (repetitionCount === 1) {
    return `"${word[0]}...？"（尝试发第一个音）`;
  }
  
  if (repetitionCount === 2) {
    return `"${word}...？"（不太确定地重复）`;
  }
  
  if (repetitionCount >= 3) {
    return `"${word}！"（终于会说了！✨）`;
  }
  
  return `"${word}！"（已经记住了）`;
}

/**
 * 判断Baby期的词是否已经学会
 * 
 * @param repetitionCount 重复次数
 * @param config 阶段配置
 */
export function isBabyWordLearned(
  repetitionCount: number,
  config: TeachingStageConfig
): boolean {
  return repetitionCount >= config.minRepetitions;
}
