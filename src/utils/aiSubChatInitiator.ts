/**
 * AI主动发起子聊天的智能检测系统
 * 基于对话内容分析，智能识别适合开启子聊天的场景
 */

import { Message, Conversation, SubChat } from '../types';
import { createSubChat } from './subChatManager';

export interface SubChatSuggestion {
  id: string;
  purpose: string; // 发起目的
  suggestedName: string; // AI建议的名称
  reason: string; // 发起理由
  priority: 'high' | 'medium' | 'low'; // 优先级
  timestamp: number;
  triggerMessage?: Message; // 触发的消息
}

export class AISubChatInitiator {
  private static instance: AISubChatInitiator;
  
  static getInstance(): AISubChatInitiator {
    if (!AISubChatInitiator.instance) {
      AISubChatInitiator.instance = new AISubChatInitiator();
    }
    return AISubChatInitiator.instance;
  }

  /**
   * 分析对话内容，检测是否需要发起子聊天
   */
  analyzeForSubChatNeeds(
    conversation: Conversation, 
    recentMessages: Message[], 
    currentMessage: Message
  ): SubChatSuggestion | null {
    
    // 检查各种触发场景
    const scenarios = [
      this.detectPrivacyNeed(currentMessage, recentMessages),
      this.detectDeepDiscussion(currentMessage, recentMessages),
      this.detectSensitiveTopic(currentMessage, recentMessages),
      this.detectPlanning(currentMessage, recentMessages),
      this.detectStoryAnalysis(currentMessage, recentMessages),
      this.detectTechnicalDiscuss(currentMessage, recentMessages),
      this.detectEmotionalSupport(currentMessage, recentMessages),
    ];

    // 找到优先级最高的建议
    const validSuggestions = scenarios.filter(s => s !== null) as SubChatSuggestion[];
    if (validSuggestions.length === 0) return null;

    // 按优先级排序
    const sortedSuggestions = validSuggestions.sort((a, b) => {
      const priorities = { high: 3, medium: 2, low: 1 };
      return priorities[b.priority] - priorities[a.priority];
    });

    return sortedSuggestions[0];
  }

  /**
   * 检测隐私需求场景
   */
  private detectPrivacyNeed(message: Message, recentMessages: Message[]): SubChatSuggestion | null {
    const privacyKeywords = [
      '私下', '悄悄', '秘密', '不想让', '别人不知道', '保密', '隐私',
      '私密', '不能说', '不方便', '单独', '一对一', '私聊'
    ];

    const userKeywords = [
      '想跟你私下', '我们私下', '单独说', '不想在这里', '换个地方',
      '子页面', '子聊天', '子弹窗', '开个新的'
    ];

    const content = message.content.toLowerCase();
    
    // 检测用户明确提出的需求
    if (userKeywords.some(keyword => content.includes(keyword))) {
      return {
        id: `privacy_${Date.now()}`,
        purpose: '用户希望私下交流',
        suggestedName: '私密对话',
        reason: '用户明确表达了想要私下交流的需求',
        priority: 'high',
        timestamp: Date.now(),
        triggerMessage: message
      };
    }

    // 检测AI应该主动提出的隐私场景
    if (privacyKeywords.some(keyword => content.includes(keyword))) {
      return {
        id: `privacy_${Date.now()}`,
        purpose: '涉及隐私话题，建议私下交流',
        suggestedName: '私密交流',
        reason: '检测到隐私相关话题，建议开启子聊天保护隐私',
        priority: 'high',
        timestamp: Date.now(),
        triggerMessage: message
      };
    }

    return null;
  }

  /**
   * 检测深度讨论场景
   */
  private detectDeepDiscussion(message: Message, recentMessages: Message[]): SubChatSuggestion | null {
    const deepKeywords = [
      '深入', '详细', '仔细', '深度', '具体', '细节', '分析', '探讨',
      '研究', '讨论', '深挖', '展开', '解释', '说明'
    ];

    const content = message.content.toLowerCase();
    const hasDeepKeywords = deepKeywords.some(keyword => content.includes(keyword));
    
    // 检查消息长度（长消息可能需要深度讨论）
    const isLongMessage = message.content.length > 100;
    
    // 检查最近几条消息是否都比较长（表示复杂讨论）
    const recentLongMessages = recentMessages.slice(-3).filter(m => m.content.length > 80);
    const hasComplexDiscussion = recentLongMessages.length >= 2;

    if (hasDeepKeywords || (isLongMessage && hasComplexDiscussion)) {
      const topics = this.extractTopicsFromMessage(message);
      const topicName = topics[0] || '深度探讨';
      
      return {
        id: `deep_${Date.now()}`,
        purpose: '深入讨论复杂话题',
        suggestedName: `${topicName}深入讨论`,
        reason: '话题较为复杂，建议开启子聊天进行深入探讨',
        priority: 'medium',
        timestamp: Date.now(),
        triggerMessage: message
      };
    }

    return null;
  }

  /**
   * 检测敏感话题场景
   */
  private detectSensitiveTopic(message: Message, recentMessages: Message[]): SubChatSuggestion | null {
    const sensitiveKeywords = [
      '感情', '关系', '家庭', '工作问题', '困难', '烦恼', '压力',
      '不开心', '担心', '焦虑', '抑郁', '痛苦', '难过', '委屈'
    ];

    const content = message.content.toLowerCase();
    const hasSensitiveKeywords = sensitiveKeywords.some(keyword => content.includes(keyword));

    if (hasSensitiveKeywords) {
      return {
        id: `sensitive_${Date.now()}`,
        purpose: '情感支持和敏感话题讨论',
        suggestedName: '情感交流',
        reason: '检测到敏感或情感性话题，建议在私密环境中交流',
        priority: 'high',
        timestamp: Date.now(),
        triggerMessage: message
      };
    }

    return null;
  }

  /**
   * 检测规划讨论场景
   */
  private detectPlanning(message: Message, recentMessages: Message[]): SubChatSuggestion | null {
    const planningKeywords = [
      '计划', '规划', '安排', '方案', '策略', '步骤', '流程',
      '准备', '组织', '设计', '方法', '如何做'
    ];

    const content = message.content.toLowerCase();
    const hasPlanningKeywords = planningKeywords.some(keyword => content.includes(keyword));

    if (hasPlanningKeywords) {
      const topics = this.extractTopicsFromMessage(message);
      const topicName = topics[0] || '项目';
      
      return {
        id: `planning_${Date.now()}`,
        purpose: '制定详细计划和方案',
        suggestedName: `${topicName}规划`,
        reason: '涉及计划制定，建议开启专门的规划子聊天',
        priority: 'medium',
        timestamp: Date.now(),
        triggerMessage: message
      };
    }

    return null;
  }

  /**
   * 检测小说/故事分析场景
   */
  private detectStoryAnalysis(message: Message, recentMessages: Message[]): SubChatSuggestion | null {
    const storyKeywords = [
      '小说', '故事', '剧情', '角色', '情节', '主人公', '结局',
      '分析', '讨论', '剧透', '细节', '伏笔', '转折'
    ];

    const content = message.content.toLowerCase();
    const hasStoryKeywords = storyKeywords.some(keyword => content.includes(keyword));

    // 检查是否提到具体作品名
    const hasWorkNames = /《[^》]+》/.test(message.content);

    if (hasStoryKeywords || hasWorkNames) {
      const workMatch = message.content.match(/《([^》]+)》/);
      const workName = workMatch ? workMatch[1] : '作品';
      
      return {
        id: `story_${Date.now()}`,
        purpose: '深入分析故事情节和角色',
        suggestedName: `${workName}深度解析`,
        reason: '检测到对故事内容的深入讨论需求，建议开启专门的分析子聊天',
        priority: 'medium',
        timestamp: Date.now(),
        triggerMessage: message
      };
    }

    return null;
  }

  /**
   * 检测技术讨论场景
   */
  private detectTechnicalDiscuss(message: Message, recentMessages: Message[]): SubChatSuggestion | null {
    const techKeywords = [
      '代码', '编程', '技术', '算法', '架构', '设计模式',
      'debug', '优化', '性能', '框架', '库', 'api'
    ];

    const content = message.content.toLowerCase();
    const hasTechKeywords = techKeywords.some(keyword => content.includes(keyword));

    if (hasTechKeywords) {
      return {
        id: `tech_${Date.now()}`,
        purpose: '技术问题深入讨论',
        suggestedName: '技术交流',
        reason: '检测到技术话题，建议在专门的技术子聊天中深入讨论',
        priority: 'medium',
        timestamp: Date.now(),
        triggerMessage: message
      };
    }

    return null;
  }

  /**
   * 检测情感支持场景
   */
  private detectEmotionalSupport(message: Message, recentMessages: Message[]): SubChatSuggestion | null {
    const emotionalKeywords = [
      '帮助', '支持', '鼓励', '安慰', '倾诉', '听我说',
      '心情不好', '需要', '希望', '陪伴', '理解'
    ];

    const content = message.content.toLowerCase();
    const hasEmotionalKeywords = emotionalKeywords.some(keyword => content.includes(keyword));

    if (hasEmotionalKeywords) {
      return {
        id: `support_${Date.now()}`,
        purpose: '提供情感支持和陪伴',
        suggestedName: '心灵陪伴',
        reason: '检测到情感支持需求，建议在温馨的子聊天环境中交流',
        priority: 'high',
        timestamp: Date.now(),
        triggerMessage: message
      };
    }

    return null;
  }

  /**
   * 从消息中提取话题关键词
   */
  private extractTopicsFromMessage(message: Message): string[] {
    const content = message.content;
    
    // 提取可能的话题词汇
    const topicPatterns = [
      /《([^》]+)》/g, // 书名、电影名等
      /关于([^\s，。！？]{2,6})/g, // "关于XX"
      /([^\s，。！？]{2,6})的问题/g, // "XX的问题"
      /([^\s，。！？]{2,6})方面/g, // "XX方面"
    ];

    const topics: string[] = [];
    
    topicPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length >= 2) {
          topics.push(match[1]);
        }
      }
    });

    // 如果没有提取到明确话题，使用关键词
    if (topics.length === 0) {
      const words = content.match(/[\u4e00-\u9fa5]{2,6}/g) || [];
      return words.slice(0, 2);
    }

    return topics.slice(0, 2);
  }

  /**
   * 生成AI发起子聊天的提示语
   */
  generateSubChatPrompt(suggestion: SubChatSuggestion): string {
    const templates = {
      high: [
        `我觉得这个话题很重要，我们是不是可以开个子聊天专门聊聊？我想叫它"${suggestion.suggestedName}"，你觉得怎么样？`,
        `这个话题有点复杂，我想我们可以开个专门的对话来深入讨论。我建议叫"${suggestion.suggestedName}"，可以吗？`,
        `我觉得我们需要一个更私密的空间来聊这个话题。我想开个叫"${suggestion.suggestedName}"的子聊天，你同意吗？`,
      ],
      medium: [
        `这个话题很有意思，要不我们开个子聊天专门讨论？我觉得可以叫"${suggestion.suggestedName}"。`,
        `我们可以新开一个对话专门聊这个吗？我想叫它"${suggestion.suggestedName}"。`,
        `要不我们专门开个聊天窗口来讨论这个？叫"${suggestion.suggestedName}"怎么样？`,
      ],
      low: [
        `这个话题挺有趣的，我们要不要专门开个子聊天来聊？叫"${suggestion.suggestedName}"？`,
        `我想我们可以为这个话题开个单独的对话，叫"${suggestion.suggestedName}"如何？`,
      ]
    };

    const templateArray = templates[suggestion.priority] || templates.medium;
    const randomIndex = Math.floor(Math.random() * templateArray.length);
    return templateArray[randomIndex];
  }

  /**
   * 检查是否应该抑制子聊天建议（避免过于频繁）
   */
  shouldSuppressSuggestion(
    conversation: Conversation,
    recentMessages: Message[]
  ): boolean {
    // 如果最近10条消息中已经有子聊天相关的消息，暂时抑制
    const recentSubChatMessages = recentMessages
      .slice(-10)
      .filter(m => 
        m.content.includes('子聊天') ||
        m.content.includes('子对话') ||
        m.content.includes('SUBCHAT_REQUEST')
      );

    if (recentSubChatMessages.length > 0) {
      return true;
    }

    // 如果当前已有很多活跃的子聊天，暂时抑制
    const activeSubChats = (conversation.subChats || [])
      .filter(sc => sc.status === 'active' || sc.status === 'pending');
    
    if (activeSubChats.length >= 3) {
      return true;
    }

    return false;
  }
}

// 导出单例实例
export const aiSubChatInitiator = AISubChatInitiator.getInstance();
