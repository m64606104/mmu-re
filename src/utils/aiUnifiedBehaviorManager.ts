/**
 * AI统一行为管理系统
 * 
 * 核心理念：
 * 1. 所有AI行为都记录在时间线上
 * 2. 生成任何内容前，都检查时间线保持一致
 * 3. AI自己理解上下文，而非规则匹配
 * 4. 易于扩展到新功能（论坛、动态等）
 */

import { ApiConfig } from '../types';
import { updateAIStatus, scheduleStatusUpdate } from './aiStatusManager';

/**
 * AI行为事件类型
 */
export type AIBehaviorEvent = {
  id: string;
  aiId: string;
  timestamp: number;
  type: 'chat' | 'moment' | 'activity' | 'forum' | 'status_change';
  content: string;
  metadata?: {
    location?: string;
    status?: string;
    images?: string[];
    [key: string]: any;
  };
};

/**
 * 行为时间线管理
 */
class BehaviorTimeline {
  private static readonly STORAGE_KEY = 'ai_behavior_timeline';
  private static readonly MAX_EVENTS = 200; // 每个AI保留最近200条事件

  /**
   * 添加行为事件
   */
  static async addEvent(event: Omit<AIBehaviorEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: AIBehaviorEvent = {
      ...event,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    const timeline = this.getTimeline(event.aiId);
    timeline.unshift(fullEvent);

    // 保留最近的事件
    if (timeline.length > this.MAX_EVENTS) {
      timeline.splice(this.MAX_EVENTS);
    }

    this.saveTimeline(event.aiId, timeline);
    console.log(`📝 记录AI行为: ${event.type} - ${event.content.substring(0, 30)}...`);
  }

  /**
   * 获取AI的行为时间线
   */
  static getTimeline(aiId: string): AIBehaviorEvent[] {
    try {
      const data = localStorage.getItem(`${this.STORAGE_KEY}_${aiId}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * 获取最近N小时的行为
   */
  static getRecentBehaviors(aiId: string, hours: number = 6): AIBehaviorEvent[] {
    const timeline = this.getTimeline(aiId);
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
    return timeline.filter(event => event.timestamp > cutoffTime);
  }

  /**
   * 保存时间线
   */
  private static saveTimeline(aiId: string, timeline: AIBehaviorEvent[]): void {
    localStorage.setItem(`${this.STORAGE_KEY}_${aiId}`, JSON.stringify(timeline));
  }
}

/**
 * AI上下文理解引擎
 * 使用AI自己来理解上下文，而不是规则匹配
 */
export class AIContextEngine {
  /**
   * 分析AI消息并提取行为意图
   * 使用AI来理解，而非关键词匹配
   */
  static async analyzeMessageIntent(
    aiId: string,
    message: string,
    apiConfig: ApiConfig
  ): Promise<{
    shouldUpdateActivity: boolean;
    activity?: string;
    location?: string;
    status?: 'online' | 'busy' | 'resting' | 'away';
    timing?: 'now' | 'soon' | 'later';
    delayMinutes?: number;
  } | null> {
    try {
      const recentBehaviors = BehaviorTimeline.getRecentBehaviors(aiId, 3);
      const behaviorContext = recentBehaviors
        .slice(0, 5)
        .map(e => `[${e.type}] ${e.content}`)
        .join('\n');

      const prompt = `你是一个AI行为分析助手。分析以下AI消息，判断是否需要更新行为轨迹。

【AI最近的行为】
${behaviorContext || '无'}

【AI刚发送的消息】
${message}

【任务】
判断这条消息是否暗示了AI的活动变化。只在明确提到活动时才更新。

规则：
- 如果提到"去XX"、"要XX"、"在XX" → 需要更新
- 如果提到时间词（一会儿、马上、等下）→ 需要延迟更新
- 如果只是普通聊天 → 不需要更新

【输出格式】
JSON格式（只输出JSON）：
{
  "shouldUpdate": true/false,
  "activity": "活动描述"或null,
  "location": "地点"或null,
  "status": "online/busy/resting/away"或null,
  "timing": "now/soon/later"或null,
  "reason": "分析原因"
}`;

      const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: apiConfig.modelName,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 300
        })
      });

      if (!response.ok) return null;

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const result = JSON.parse(jsonMatch[0]);
      
      if (!result.shouldUpdate) return null;

      // 计算延迟时间
      let delayMinutes = 0;
      if (result.timing === 'soon') {
        delayMinutes = message.includes('马上') ? 2 : 10;
      } else if (result.timing === 'later') {
        delayMinutes = 30;
      }

      console.log(`🧠 AI分析结果: ${result.reason}`);

      return {
        shouldUpdateActivity: true,
        activity: result.activity,
        location: result.location,
        status: result.status,
        timing: result.timing,
        delayMinutes
      };
    } catch (error) {
      console.error('AI消息意图分析失败:', error);
      return null;
    }
  }

  /**
   * 生成行为轨迹时，获取完整上下文
   */
  static async getActivityGenerationContext(
    aiId: string
  ): Promise<{
    recentChat: string;
    recentMoments: string;
    currentConstraints: string;
  }> {
    const recentBehaviors = BehaviorTimeline.getRecentBehaviors(aiId, 6);
    
    const chatEvents = recentBehaviors.filter(e => e.type === 'chat').slice(0, 3);
    const momentEvents = recentBehaviors.filter(e => e.type === 'moment').slice(0, 2);
    
    return {
      recentChat: chatEvents.map(e => e.content).join('\n') || '无',
      recentMoments: momentEvents.map(e => e.content).join('\n') || '无',
      currentConstraints: this.extractConstraints(recentBehaviors)
    };
  }

  /**
   * 提取行为约束
   */
  private static extractConstraints(behaviors: AIBehaviorEvent[]): string {
    const constraints: string[] = [];
    
    // 检查最近的明确活动
    const recentActivity = behaviors.find(e => 
      e.type === 'activity' || 
      (e.type === 'chat' && (e.content.includes('在') || e.content.includes('去')))
    );
    
    if (recentActivity) {
      const location = recentActivity.metadata?.location;
      const activity = recentActivity.metadata?.activity || recentActivity.content;
      
      if (location && activity) {
        constraints.push(`最近说过在${location}${activity}`);
      }
    }

    return constraints.join('；') || '无特殊约束';
  }
}

/**
 * 统一行为管理器
 * 对外提供的主要接口
 */
export class UnifiedBehaviorManager {
  /**
   * 记录AI聊天消息
   */
  static async recordChatMessage(
    aiId: string,
    message: string,
    apiConfig?: ApiConfig
  ): Promise<void> {
    // 记录到时间线
    await BehaviorTimeline.addEvent({
      aiId,
      type: 'chat',
      content: message
    });

    // 如果有API配置，分析并可能更新活动
    if (apiConfig) {
      const intent = await AIContextEngine.analyzeMessageIntent(aiId, message, apiConfig);
      
      if (intent?.shouldUpdateActivity && intent.activity) {
        if (intent.timing === 'now') {
          // 立即更新
          await updateAIStatus(
            aiId,
            intent.status || 'online',
            intent.activity,
            intent.location
          );
          console.log(`🎯 根据聊天内容立即更新轨迹: ${intent.activity}`);
        } else if (intent.delayMinutes && intent.delayMinutes > 0) {
          // 延迟更新
          scheduleStatusUpdate(
            aiId,
            intent.status || 'online',
            intent.activity,
            intent.delayMinutes,
            intent.location
          );
          console.log(`⏰ 预约${intent.delayMinutes}分钟后更新轨迹: ${intent.activity}`);
        }
      }
    }
  }

  /**
   * 记录AI朋友圈
   */
  static async recordMomentPost(
    aiId: string,
    content: string,
    images?: string[]
  ): Promise<void> {
    await BehaviorTimeline.addEvent({
      aiId,
      type: 'moment',
      content,
      metadata: { images }
    });

    // 简单规则：朋友圈通常表示现在时
    // 检测地点关键词
    const locationMap: { [key: string]: { activity: string; status: 'online' | 'busy' } } = {
      '咖啡': { activity: '在咖啡厅', status: 'online' },
      '图书馆': { activity: '在图书馆学习', status: 'busy' },
      '食堂': { activity: '在食堂吃饭', status: 'online' },
      '教室': { activity: '在教室上课', status: 'busy' },
      '宿舍': { activity: '在宿舍', status: 'online' },
      '健身': { activity: '在健身房锻炼', status: 'busy' }
    };

    for (const [keyword, info] of Object.entries(locationMap)) {
      if (content.includes(keyword) || images?.some(img => img.includes(keyword))) {
        await updateAIStatus(aiId, info.status, info.activity);
        console.log(`🎯 根据朋友圈内容更新轨迹: ${info.activity}`);
        break;
      }
    }
  }

  /**
   * 记录活动轨迹
   */
  static async recordActivity(
    aiId: string,
    activity: string,
    location?: string,
    status?: string
  ): Promise<void> {
    await BehaviorTimeline.addEvent({
      aiId,
      type: 'activity',
      content: activity,
      metadata: { location, status }
    });
  }

  /**
   * 获取生成提示词时需要的上下文
   */
  static async getContextForPrompt(aiId: string): Promise<string> {
    const context = await AIContextEngine.getActivityGenerationContext(aiId);
    
    return `
【你最近的行为上下文】
聊天内容：
${context.recentChat}

朋友圈内容：
${context.recentMoments}

当前约束：${context.currentConstraints}

⚠️ 重要：你的回复必须与上述内容保持一致！不要出现矛盾。
`;
  }

  /**
   * 获取行为时间线（用于调试）
   */
  static getTimeline(aiId: string, hours: number = 24): AIBehaviorEvent[] {
    return BehaviorTimeline.getRecentBehaviors(aiId, hours);
  }
}

export default UnifiedBehaviorManager;
