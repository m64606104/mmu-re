/**
 * 🎯 聊天经验集成系统
 * 
 * 将新的理解力经验计算系统集成到原有的聊天功能中：
 * - 自动检测AI儿童对话
 * - 计算聊天时长和质量
 * - 应用经验到理解力系统
 * - 保持与原有系统的兼容性
 */

import { Conversation, Message } from '../types';
import { handleChatActivity, handleTopicDiscussionActivity } from './comprehensionSystemManager';
import { getRemainingExperienceQuota } from './dailyExperienceManager';

// =================== 接口定义 ===================

/**
 * 聊天会话分析结果
 */
interface ChatSessionAnalysis {
  isAIChild: boolean;
  childId: string;
  duration: number;        // 会话时长（分钟）
  messageCount: number;    // 消息数量
  emotionalDepth: number;  // 情感深度评分 (1-10)
  contextComplexity: number; // 上下文复杂度评分 (1-10)
  logicalDepth: number;    // 逻辑深度评分 (1-10)
  abstractLevel: number;   // 抽象程度评分 (1-10)
  activityType: 'freeChat' | 'topicDiscussion'; // 活动类型
}

/**
 * 经验应用结果
 */
interface ExperienceApplicationResult {
  success: boolean;
  message: string;
  experienceGained: number;
  limitReached: boolean;
  report: string;
}

// =================== 核心分析功能 ===================

/**
 * 分析聊天会话并确定是否需要应用经验
 */
export function analyzeChatSession(
  conversation: Conversation,
  recentMessages: Message[],
  sessionStartTime: number
): ChatSessionAnalysis | null {
  // 检查是否是AI儿童对话
  if (!conversation.aiChildData) {
    return null;
  }
  
  // 计算会话时长（分钟）
  const currentTime = Date.now();
  const duration = Math.max(1, Math.round((currentTime - sessionStartTime) / (1000 * 60)));
  
  // 分析消息内容
  const messageCount = recentMessages.length;
  
  // 计算各项评分
  const emotionalDepth = calculateEmotionalDepth(recentMessages);
  const contextComplexity = calculateContextComplexity(recentMessages);
  const logicalDepth = calculateLogicalDepth(recentMessages);
  const abstractLevel = calculateAbstractLevel(recentMessages);
  
  // 判断活动类型
  const activityType = determineActivityType(recentMessages, logicalDepth, abstractLevel);
  
  return {
    isAIChild: true,
    childId: conversation.id,
    duration,
    messageCount,
    emotionalDepth,
    contextComplexity,
    logicalDepth,
    abstractLevel,
    activityType
  };
}

/**
 * 计算情感深度评分
 */
function calculateEmotionalDepth(messages: Message[]): number {
  let emotionalScore = 5; // 基础分数
  
  const emotionalKeywords = [
    '开心', '高兴', '快乐', '难过', '伤心', '生气', '害怕', '担心', '兴奋', '紧张',
    '感动', '温暖', '失望', '惊讶', '骄傲', '羞愧', '感激', '想念', '孤独', '满足'
  ];
  
  const emotionalPatterns = [
    '我觉得', '我感受到', '让我', '使我', '心情', '感情', '情绪', '感觉'
  ];
  
  for (const message of messages) {
    if (message.role === 'user') {
      const content = message.content.toLowerCase();
      
      // 检查情感词汇
      for (const keyword of emotionalKeywords) {
        if (content.includes(keyword)) {
          emotionalScore += 0.5;
        }
      }
      
      // 检查情感表达模式
      for (const pattern of emotionalPatterns) {
        if (content.includes(pattern)) {
          emotionalScore += 0.3;
        }
      }
      
      // 检查表情符号和感叹号
      if (content.includes('😊') || content.includes('😢') || content.includes('😍') || content.includes('😭')) {
        emotionalScore += 0.2;
      }
      
      if (content.includes('!') || content.includes('！')) {
        emotionalScore += 0.1;
      }
    }
  }
  
  return Math.min(10, Math.max(1, Math.round(emotionalScore)));
}

/**
 * 计算上下文复杂度评分
 */
function calculateContextComplexity(messages: Message[]): number {
  let complexityScore = 5; // 基础分数
  
  // 分析对话轮次
  const conversationTurns = messages.length / 2;
  if (conversationTurns > 5) complexityScore += 1;
  if (conversationTurns > 10) complexityScore += 1;
  
  // 分析引用和回指
  for (const message of messages) {
    if (message.replyTo) {
      complexityScore += 0.5; // 有引用回复
    }
    
    if (message.role === 'user') {
      const content = message.content;
      
      // 检查回指词
      const referenceWords = ['这个', '那个', '刚才', '之前', '前面', '上面', '刚说的'];
      for (const word of referenceWords) {
        if (content.includes(word)) {
          complexityScore += 0.3;
          break;
        }
      }
      
      // 检查复合句
      if (content.includes('但是') || content.includes('然而') || content.includes('不过') || 
          content.includes('而且') || content.includes('并且') || content.includes('同时')) {
        complexityScore += 0.2;
      }
      
      // 检查长句子
      if (content.length > 50) {
        complexityScore += 0.3;
      }
    }
  }
  
  return Math.min(10, Math.max(1, Math.round(complexityScore)));
}

/**
 * 计算逻辑深度评分
 */
function calculateLogicalDepth(messages: Message[]): number {
  let logicalScore = 3; // 基础分数较低，因为需要专门的逻辑讨论
  
  const logicalKeywords = [
    '因为', '所以', '如果', '那么', '假如', '假设', '证明', '推理', '分析', '比较',
    '原因', '结果', '导致', '影响', '根据', '依据', '逻辑', '理论', '规律'
  ];
  
  const questionWords = ['为什么', '怎么', '如何', '什么原因', '什么影响'];
  
  for (const message of messages) {
    if (message.role === 'user') {
      const content = message.content;
      
      // 检查逻辑词汇
      for (const keyword of logicalKeywords) {
        if (content.includes(keyword)) {
          logicalScore += 0.5;
        }
      }
      
      // 检查疑问句
      for (const question of questionWords) {
        if (content.includes(question)) {
          logicalScore += 0.4;
        }
      }
      
      // 检查论证结构
      if (content.includes('首先') || content.includes('其次') || content.includes('最后') ||
          content.includes('第一') || content.includes('第二') || content.includes('第三')) {
        logicalScore += 0.6;
      }
    }
  }
  
  return Math.min(10, Math.max(1, Math.round(logicalScore)));
}

/**
 * 计算抽象程度评分
 */
function calculateAbstractLevel(messages: Message[]): number {
  let abstractScore = 3; // 基础分数较低
  
  const abstractKeywords = [
    '思考', '想法', '观点', '理念', '概念', '思想', '哲学', '精神', '意义', '价值',
    '本质', '内涵', '深层', '抽象', '象征', '隐喻', '寓意', '启发', '感悟'
  ];
  
  const abstractTopics = [
    '人生', '生活', '成长', '学习', '教育', '文化', '艺术', '美', '真理', '正义',
    '友谊', '爱情', '家庭', '社会', '未来', '梦想', '理想', '信念'
  ];
  
  for (const message of messages) {
    if (message.role === 'user') {
      const content = message.content;
      
      // 检查抽象词汇
      for (const keyword of abstractKeywords) {
        if (content.includes(keyword)) {
          abstractScore += 0.4;
        }
      }
      
      // 检查抽象话题
      for (const topic of abstractTopics) {
        if (content.includes(topic)) {
          abstractScore += 0.3;
        }
      }
      
      // 检查抽象表达
      if (content.includes('觉得') || content.includes('认为') || content.includes('感觉')) {
        abstractScore += 0.2;
      }
    }
  }
  
  return Math.min(10, Math.max(1, Math.round(abstractScore)));
}

/**
 * 判断活动类型
 */
function determineActivityType(
  messages: Message[],
  logicalDepth: number,
  abstractLevel: number
): 'freeChat' | 'topicDiscussion' {
  // 如果逻辑深度和抽象程度都较高，且消息数量足够，判断为话题讨论
  if (logicalDepth >= 6 && abstractLevel >= 5 && messages.length >= 8) {
    return 'topicDiscussion';
  }
  
  // 检查是否有明显的讨论特征
  let discussionIndicators = 0;
  
  for (const message of messages) {
    if (message.role === 'user' && message.content.length > 30) {
      discussionIndicators++;
    }
  }
  
  if (discussionIndicators >= 3 && logicalDepth >= 5) {
    return 'topicDiscussion';
  }
  
  return 'freeChat';
}

// =================== 经验应用功能 ===================

/**
 * 应用聊天经验到AI儿童
 */
export async function applyChatExperience(
  analysis: ChatSessionAnalysis
): Promise<ExperienceApplicationResult> {
  try {
    console.log('🎯 开始应用聊天经验...', analysis);
    
    // 检查每日经验额度
    const remainingQuota = getRemainingExperienceQuota({ id: analysis.childId } as any);
    const activityQuota = remainingQuota[analysis.activityType];
    
    if (activityQuota <= 0) {
      return {
        success: true,
        message: `今日${analysis.activityType === 'freeChat' ? '自由聊天' : '话题讨论'}经验已达上限，但对话很有意义！`,
        experienceGained: 0,
        limitReached: true,
        report: ''
      };
    }
    
    // 根据活动类型应用经验
    let result;
    
    if (analysis.activityType === 'topicDiscussion') {
      result = await handleTopicDiscussionActivity(
        analysis.childId,
        analysis.duration,
        analysis.logicalDepth,
        analysis.abstractLevel
      );
    } else {
      result = await handleChatActivity(
        analysis.childId,
        analysis.duration,
        analysis.emotionalDepth,
        analysis.contextComplexity
      );
    }
    
    if (result.success) {
      console.log('✅ 聊天经验应用成功！', result);
      return {
        success: true,
        message: result.message,
        experienceGained: result.totalExp,
        limitReached: result.limitInfo.limitReached,
        report: result.report
      };
    } else {
      return {
        success: false,
        message: result.message,
        experienceGained: 0,
        limitReached: false,
        report: ''
      };
    }
    
  } catch (error) {
    console.error('❌ 应用聊天经验失败：', error);
    return {
      success: false,
      message: `应用经验失败：${error}`,
      experienceGained: 0,
      limitReached: false,
      report: ''
    };
  }
}

// =================== 便捷接口 ===================

/**
 * 聊天会话管理器
 */
export class ChatSessionManager {
  private static sessions = new Map<string, {
    startTime: number;
    messageCount: number;
    lastAnalysis: number;
  }>();
  
  /**
   * 开始新的聊天会话
   */
  static startSession(conversationId: string): void {
    this.sessions.set(conversationId, {
      startTime: Date.now(),
      messageCount: 0,
      lastAnalysis: Date.now()
    });
    console.log(`🎯 开始聊天会话：${conversationId}`);
  }
  
  /**
   * 添加消息到会话
   */
  static addMessage(conversationId: string): void {
    const session = this.sessions.get(conversationId);
    if (session) {
      session.messageCount++;
    }
  }
  
  /**
   * 检查是否应该分析并应用经验
   */
  static async checkAndApplyExperience(
    conversation: Conversation,
    recentMessages: Message[]
  ): Promise<ExperienceApplicationResult | null> {
    const session = this.sessions.get(conversation.id);
    if (!session) return null;
    
    const currentTime = Date.now();
    const timeSinceLastAnalysis = currentTime - session.lastAnalysis;
    
    // 每5分钟或10条消息检查一次
    const shouldAnalyze = 
      timeSinceLastAnalysis > 5 * 60 * 1000 || // 5分钟
      session.messageCount >= 10;              // 10条消息
    
    if (!shouldAnalyze) return null;
    
    // 分析聊天会话
    const analysis = analyzeChatSession(conversation, recentMessages, session.startTime);
    if (!analysis) return null;
    
    // 更新分析时间
    session.lastAnalysis = currentTime;
    
    // 应用经验
    return await applyChatExperience(analysis);
  }
  
  /**
   * 结束聊天会话
   */
  static async endSession(
    conversation: Conversation,
    allMessages: Message[]
  ): Promise<ExperienceApplicationResult | null> {
    const session = this.sessions.get(conversation.id);
    if (!session) return null;
    
    // 最终分析并应用经验
    const analysis = analyzeChatSession(conversation, allMessages, session.startTime);
    if (!analysis) {
      this.sessions.delete(conversation.id);
      return null;
    }
    
    console.log(`🎯 结束聊天会话：${conversation.id}，时长：${analysis.duration}分钟`);
    
    const result = await applyChatExperience(analysis);
    this.sessions.delete(conversation.id);
    
    return result;
  }
  
  /**
   * 获取会话信息
   */
  static getSession(conversationId: string) {
    return this.sessions.get(conversationId);
  }
}

/**
 * 简化的聊天经验处理函数（供ChatScreen直接调用）
 */
export async function handleChatExperienceUpdate(
  conversation: Conversation,
  _newMessage: Message
): Promise<string | null> {
  try {
    // 添加消息到会话管理器
    ChatSessionManager.addMessage(conversation.id);
    
    // 获取最近的消息（最多20条）
    const recentMessages = conversation.messages.slice(-20);
    
    // 检查并应用经验
    const result = await ChatSessionManager.checkAndApplyExperience(conversation, recentMessages);
    
    if (result && result.experienceGained > 0) {
      return `🎉 ${result.message}\n📊 获得经验：${result.experienceGained}点`;
    }
    
    return null;
  } catch (error) {
    console.error('❌ 处理聊天经验更新失败：', error);
    return null;
  }
}
