/**
 * AI智能子聊天建议系统
 * 根据对话内容自动分析并建议创建子聊天
 */

import { Message, Conversation } from '../types';

export interface SubChatSuggestion {
  id: string;
  suggestedName: string;
  reason: string;
  relevantMessages: Message[];
  confidence: number; // 0-1之间的置信度
  timestamp: number;
}

export class AISubChatSuggestionEngine {
  private static instance: AISubChatSuggestionEngine;
  private suggestionHistory: Set<string> = new Set();

  static getInstance(): AISubChatSuggestionEngine {
    if (!AISubChatSuggestionEngine.instance) {
      AISubChatSuggestionEngine.instance = new AISubChatSuggestionEngine();
    }
    return AISubChatSuggestionEngine.instance;
  }

  /**
   * 分析对话并生成子聊天建议
   */
  analyzeConversation(conversation: Conversation): SubChatSuggestion | null {
    const messages = conversation.messages;
    if (messages.length < 5) return null; // 至少需要5条消息才分析

    // 获取最近的10条消息进行分析
    const recentMessages = messages.slice(-10);
    
    // 检测话题转换的关键词
    const topicTransitionKeywords = [
      '话说', '对了', '另外', '顺便', '还有一个问题', '我想问', 
      '换个话题', '说到', '提到', '关于', '不过', '其实',
      '我还想', '我记得', '我发现', '我觉得', '我想起',
      '今天', '明天', '昨天', '最近', '刚刚', '突然想到',
      '工作', '学习', '生活', '技术', '编程', '设计',
      '旅行', '美食', '电影', '音乐', '游戏', '健身'
    ];

    // 专业领域关键词
    const professionalTopics = {
      '技术讨论': ['编程', '代码', '算法', '数据库', 'API', '框架', '前端', '后端', 'React', 'Vue', 'Node.js'],
      '工作规划': ['项目', '任务', '计划', '目标', '进度', '会议', '团队', '管理', '流程'],
      '学习交流': ['学习', '课程', '教程', '知识', '技能', '经验', '分享', '总结'],
      '设计创意': ['设计', 'UI', 'UX', '界面', '用户体验', '原型', '配色', '布局', '交互'],
      '生活感悟': ['生活', '感悟', '思考', '心情', '体验', '感受', '想法', '观点'],
      '娱乐休闲': ['电影', '音乐', '游戏', '旅行', '美食', '运动', '阅读', '兴趣']
    };

    // 分析最近的对话内容
    let topicScore = 0;
    let detectedTopic = '';
    let transitionFound = false;
    let relevantMessages: Message[] = [];

    for (let i = recentMessages.length - 1; i >= 0; i--) {
      const message = recentMessages[i];
      if (!message.content) continue;

      const content = message.content.toLowerCase();
      
      // 检查话题转换关键词
      for (const keyword of topicTransitionKeywords) {
        if (content.includes(keyword)) {
          transitionFound = true;
          relevantMessages = recentMessages.slice(i);
          break;
        }
      }

      // 检查专业领域话题
      for (const [topic, keywords] of Object.entries(professionalTopics)) {
        for (const keyword of keywords) {
          if (content.includes(keyword)) {
            topicScore++;
            if (topicScore >= 2 && !detectedTopic) {
              detectedTopic = topic;
              relevantMessages = recentMessages.slice(Math.max(0, i - 2));
            }
          }
        }
      }

      if (transitionFound && detectedTopic) break;
    }

    // 生成建议
    if ((transitionFound && detectedTopic) || topicScore >= 3) {
      const suggestionId = `suggestion_${Date.now()}`;
      
      // 避免重复建议同一个话题
      const topicHash = this.hashTopic(detectedTopic + relevantMessages.map(m => m.content).join(''));
      if (this.suggestionHistory.has(topicHash)) {
        return null;
      }
      
      this.suggestionHistory.add(topicHash);

      return {
        id: suggestionId,
        suggestedName: this.generateSubChatName(detectedTopic, relevantMessages),
        reason: this.generateReason(detectedTopic, transitionFound),
        relevantMessages,
        confidence: Math.min(0.9, (topicScore * 0.2) + (transitionFound ? 0.4 : 0) + 0.3),
        timestamp: Date.now()
      };
    }

    return null;
  }

  /**
   * 生成子聊天名称
   */
  private generateSubChatName(topic: string, messages: Message[]): string {
    if (topic) return topic;

    // 从消息中提取关键词生成名称
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.content) {
      const content = lastMessage.content;
      
      // 简单的关键词提取
      if (content.includes('项目')) return '项目讨论';
      if (content.includes('学习')) return '学习交流';
      if (content.includes('技术')) return '技术分享';
      if (content.includes('设计')) return '设计思考';
      if (content.includes('工作')) return '工作相关';
      if (content.includes('生活')) return '生活感悟';
      if (content.includes('想法') || content.includes('思考')) return '思路整理';
    }

    // 默认名称
    const defaultNames = [
      '深度讨论', '专题探讨', '话题延伸', '详细分析', 
      '经验分享', '创意思考', '问题解决', '学习记录'
    ];
    
    return defaultNames[Math.floor(Math.random() * defaultNames.length)];
  }

  /**
   * 生成建议原因
   */
  private generateReason(topic: string, hasTransition: boolean): string {
    if (hasTransition && topic) {
      return `检测到您开始讨论${topic}相关内容，建议创建专门的子聊天来深入交流`;
    } else if (topic) {
      return `发现您对${topic}很感兴趣，可以创建子聊天进行专项讨论`;
    } else if (hasTransition) {
      return `检测到话题转换，建议为新话题创建独立的聊天空间`;
    }
    
    return '根据对话内容，建议创建子聊天来更好地组织讨论';
  }

  /**
   * 生成话题哈希值，用于避免重复建议
   */
  private hashTopic(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  /**
   * 清除建议历史（可选，避免内存占用过多）
   */
  clearSuggestionHistory(): void {
    this.suggestionHistory.clear();
  }
}

// 导出单例实例
export const aiSubChatSuggestion = AISubChatSuggestionEngine.getInstance();
