// 🎯 人物行动轨迹生成服务
// 基于现有数据源（聊天、状态、朋友圈等）智能生成轨迹

import { FootprintActivity, DailyFootprint, ActivityType, ActivitySource } from '../types/footprint';
import { AIStatus, Message, Conversation, SubChat } from '../types';
import { footprintStorage } from './footprintStorage';

// 活动生成配置
interface FootprintGenerationConfig {
  conversationId: string;
  enableAutoGeneration: boolean;
  generationInterval: number; // 小时
  maxActivitiesPerDay: number;
  useAIGeneration: boolean;
  confidenceThreshold: number;
}

class FootprintGeneratorService {
  private configs: Map<string, FootprintGenerationConfig> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  // 初始化轨迹生成服务
  async initialize(conversationId: string, config: Partial<FootprintGenerationConfig> = {}) {
    const fullConfig: FootprintGenerationConfig = {
      conversationId,
      // 默认关闭内部自动生成，改由footprintScheduler统一调度
      enableAutoGeneration: false,
      generationInterval: 3, // 仅在显式启用时才使用
      maxActivitiesPerDay: 20,
      useAIGeneration: true,
      confidenceThreshold: 0.5,
      ...config
    };

    this.configs.set(conversationId, fullConfig);

    if (fullConfig.enableAutoGeneration) {
      this.startAutoGeneration(conversationId);
    }

    console.log(`✅ 轨迹生成服务已为对话 ${conversationId} 初始化`);
  }

  // 开始自动生成
  private startAutoGeneration(conversationId: string) {
    const config = this.configs.get(conversationId);
    if (!config) return;

    // 清除现有定时器
    const existingTimer = this.timers.get(conversationId);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    // 设置新定时器
    const timer = setInterval(async () => {
      await this.generateActivitiesForConversation(conversationId);
    }, config.generationInterval * 60 * 60 * 1000); // 转为毫秒

    this.timers.set(conversationId, timer);
  }

  // 停止自动生成
  stopAutoGeneration(conversationId: string) {
    const timer = this.timers.get(conversationId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(conversationId);
    }
  }

  // 为指定对话生成轨迹活动
  async generateActivitiesForConversation(conversationId: string): Promise<FootprintActivity[]> {
    const config = this.configs.get(conversationId);
    if (!config) {
      console.error(`未找到对话 ${conversationId} 的生成配置`);
      return [];
    }

    try {
      // 检查是否需要生成新活动
      const shouldGenerate = await this.shouldGenerateNewActivities(conversationId);
      if (!shouldGenerate) {
        console.log(`⏸️ 对话 ${conversationId} 暂不需要生成新活动`);
        return [];
      }

      // 收集数据源
      const dataSources = await this.collectDataSources(conversationId);
      
      // 生成活动
      const newActivities = await this.generateActivitiesFromSources(
        conversationId,
        dataSources,
        config
      );

      // 保存到数据库
      if (newActivities.length > 0) {
        await footprintStorage.saveActivities(newActivities);
        console.log(`✅ 为对话 ${conversationId} 生成了 ${newActivities.length} 个活动`);
        
        // 更新每日汇总
        await this.updateDailySummary(conversationId, newActivities);
      }

      return newActivities;
    } catch (error) {
      console.error(`生成轨迹活动失败 (${conversationId}):`, error);
      return [];
    }
  }

  // 检查是否应该生成新活动
  private async shouldGenerateNewActivities(conversationId: string): Promise<boolean> {
    const config = this.configs.get(conversationId)!;
    const now = Date.now();
    
    // 获取最近的活动
    const recentActivities = await footprintStorage.getActivities(conversationId, {
      dateRange: {
        start: new Date(now - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date(now).toISOString().split('T')[0]
      }
    });

    // 检查今天是否已有足够活动
    const todayActivities = recentActivities.filter(activity => {
      const activityDate = new Date(activity.timestamp).toDateString();
      const todayDate = new Date().toDateString();
      return activityDate === todayDate;
    });

    if (todayActivities.length >= config.maxActivitiesPerDay) {
      return false;
    }

    // 检查最后一次生成时间
    if (recentActivities.length > 0) {
      const lastActivity = recentActivities[0];
      const timeSinceLastActivity = now - lastActivity.timestamp;
      const minInterval = config.generationInterval * 60 * 60 * 1000;
      
      if (timeSinceLastActivity < minInterval) {
        return false;
      }
    }

    return true;
  }

  // 收集数据源
  private async collectDataSources(conversationId: string) {
    const sources = {
      // 1. 聊天消息（最近的对话）
      chatMessages: await this.getRecentChatMessages(conversationId),
      
      // 2. AI状态变化
      statusChanges: await this.getRecentStatusChanges(conversationId),
      
      // 3. 子聊天活动
      subChatActivity: await this.getSubChatActivity(conversationId),
      
      // 4. 朋友圈动态
      momentsActivity: await this.getMomentsActivity(conversationId),
      
      // 5. 系统事件（文档上传、财务交易等）
      systemEvents: await this.getSystemEvents(conversationId),
      
      // 6. 当前时间上下文
      timeContext: this.getTimeContext()
    };

    return sources;
  }

  // 获取最近聊天消息
  private async getRecentChatMessages(conversationId: string): Promise<Message[]> {
    try {
      const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
      const conversation = conversations.find((c: Conversation) => c.id === conversationId);
      
      if (!conversation?.messages) return [];
      
      // 获取最近2小时的消息
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
      return conversation.messages
        .filter((msg: Message) => msg.timestamp > twoHoursAgo)
        .slice(-10); // 最多10条
    } catch (error) {
      console.error('获取聊天消息失败:', error);
      return [];
    }
  }

  // 获取最近状态变化
  private async getRecentStatusChanges(conversationId: string) {
    try {
      const statusData = localStorage.getItem(`ai_status_${conversationId}`);
      if (!statusData) return null;
      
      return JSON.parse(statusData);
    } catch (error) {
      console.error('获取状态数据失败:', error);
      return null;
    }
  }

  // 获取子聊天活动
  private async getSubChatActivity(conversationId: string) {
    try {
      const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
      const conversation = conversations.find((c: Conversation) => c.id === conversationId);
      
      if (!conversation?.subChats) return [];
      
      // 统计最近的子聊天活动
      return (conversation.subChats as SubChat[])
        .filter((subChat: SubChat) => subChat.lastMessageTime > Date.now() - (24 * 60 * 60 * 1000))
        .map((subChat: SubChat) => ({
          id: subChat.id,
          name: subChat.name,
          lastMessageTime: subChat.lastMessageTime,
          messageCount: subChat.messages?.length || 0
        }));
    } catch (error) {
      console.error('获取子聊天数据失败:', error);
      return [];
    }
  }

  // 获取朋友圈动态
  private async getMomentsActivity(conversationId: string) {
    try {
      const momentsData = localStorage.getItem(`moments_${conversationId}`);
      if (!momentsData) return null;
      
      const moments = JSON.parse(momentsData);
      
      // 获取最近24小时的朋友圈活动
      const recentPosts = moments.posts?.filter((post: any) => 
        post.timestamp > Date.now() - (24 * 60 * 60 * 1000)
      ) || [];

      return {
        postsCount: recentPosts.length,
        lastPostTime: recentPosts[0]?.timestamp,
        recentPosts: recentPosts.slice(0, 3)
      };
    } catch (error) {
      console.error('获取朋友圈数据失败:', error);
      return null;
    }
  }

  // 获取系统事件
  private async getSystemEvents(conversationId: string) {
    // 这里可以收集各种系统事件：
    // - 文档上传/查看
    // - 财务交易
    // - 记忆系统更新
    // - 设置变更
    // 暂时返回空，后续可扩展
    return [];
  }

  // 获取时间上下文
  private getTimeContext() {
    const now = new Date();
    const hour = now.getHours();
    
    let timeOfDay: string;
    if (hour < 6) timeOfDay = 'late_night';
    else if (hour < 12) timeOfDay = 'morning';
    else if (hour < 18) timeOfDay = 'afternoon';
    else if (hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    return {
      hour,
      timeOfDay,
      dayOfWeek: now.getDay(),
      isWeekend: now.getDay() === 0 || now.getDay() === 6,
      date: now.toISOString().split('T')[0]
    };
  }

  // 从数据源生成活动
  private async generateActivitiesFromSources(
    conversationId: string,
    sources: any,
    config: FootprintGenerationConfig
  ): Promise<FootprintActivity[]> {
    const activities: FootprintActivity[] = [];
    const now = Date.now();

    // 1. 基于聊天消息生成活动
    if (sources.chatMessages.length > 0) {
      const chatActivity = this.generateChatActivity(
        conversationId,
        sources.chatMessages,
        sources.timeContext
      );
      if (chatActivity) activities.push(chatActivity);
    }

    // 2. 基于状态变化生成活动
    if (sources.statusChanges) {
      const statusActivity = this.generateStatusActivity(
        conversationId,
        sources.statusChanges,
        sources.timeContext
      );
      if (statusActivity) activities.push(statusActivity);
    }

    // 3. 基于朋友圈生成活动
    if (sources.momentsActivity?.postsCount > 0) {
      const momentsActivity = this.generateMomentsActivity(
        conversationId,
        sources.momentsActivity,
        sources.timeContext
      );
      if (momentsActivity) activities.push(momentsActivity);
    }

    // 4. 生成日常活动（基于时间推断）
    const routineActivity = this.generateRoutineActivity(
      conversationId,
      sources.timeContext
    );
    if (routineActivity) activities.push(routineActivity);

    // 5. 过滤低置信度活动
    return activities.filter(activity => 
      activity.confidence >= config.confidenceThreshold
    );
  }

  // 生成聊天活动
  private generateChatActivity(
    conversationId: string,
    messages: Message[],
    timeContext: any
  ): FootprintActivity | null {
    if (messages.length === 0) return null;

    const latestMessage = messages[messages.length - 1];
    const chatDuration = messages.length > 1 
      ? messages[messages.length - 1].timestamp - messages[0].timestamp
      : 5 * 60 * 1000; // 默认5分钟

    return {
      id: `chat_${Date.now()}`,
      conversationId,
      timestamp: latestMessage.timestamp,
      duration: chatDuration,
      activity: `与你聊天，讨论了${this.summarizeChatTopic(messages)}`,
      activityType: 'chatting',
      status: 'online',
      source: 'chat',
      confidence: 0.9,
      tags: ['聊天', '对话'],
      createdAt: Date.now()
    };
  }

  // 生成状态活动
  private generateStatusActivity(
    conversationId: string,
    statusData: any,
    timeContext: any
  ): FootprintActivity | null {
    if (!statusData.currentActivity) return null;

    return {
      id: `status_${Date.now()}`,
      conversationId,
      timestamp: Date.now() - (30 * 60 * 1000), // 30分钟前开始的活动
      duration: 30 * 60 * 1000,
      activity: statusData.currentActivity,
      activityType: this.inferActivityType(statusData.currentActivity),
      status: statusData.status,
      source: 'status',
      confidence: 0.8,
      createdAt: Date.now()
    };
  }

  // 生成朋友圈活动
  private generateMomentsActivity(
    conversationId: string,
    momentsData: any,
    timeContext: any
  ): FootprintActivity | null {
    const recentPost = momentsData.recentPosts[0];
    if (!recentPost) return null;

    return {
      id: `moments_${Date.now()}`,
      conversationId,
      timestamp: recentPost.timestamp,
      activity: `发了朋友圈：${recentPost.content.substring(0, 50)}...`,
      activityType: 'social',
      status: 'online',
      source: 'moments',
      sourceId: recentPost.id,
      confidence: 0.95,
      tags: ['朋友圈', '社交'],
      createdAt: Date.now()
    };
  }

  // 生成日常活动
  private generateRoutineActivity(
    conversationId: string,
    timeContext: any
  ): FootprintActivity | null {
    const { hour, timeOfDay } = timeContext;
    
    let activity: string;
    let activityType: ActivityType;
    let confidence = 0.6;

    switch (timeOfDay) {
      case 'late_night':
      case 'night':
        activity = '已经休息了';
        activityType = 'sleeping';
        break;
      case 'morning':
        activity = hour < 8 ? '刚刚起床，准备开始新的一天' : '处理一些日常事务';
        activityType = hour < 8 ? 'thinking' : 'working';
        break;
      case 'afternoon':
        activity = '在忙自己的事情';
        activityType = 'working';
        break;
      case 'evening':
        activity = '在放松休息';
        activityType = 'entertainment';
        break;
      default:
        return null;
    }

    return {
      id: `routine_${Date.now()}`,
      conversationId,
      timestamp: Date.now() - (Math.random() * 60 * 60 * 1000), // 过去1小时内的随机时间
      duration: 60 * 60 * 1000, // 1小时
      activity,
      activityType,
      status: activityType === 'sleeping' ? 'offline' : 'online',
      source: 'system',
      confidence,
      tags: ['日常', '推测'],
      createdAt: Date.now()
    };
  }

  // 更新每日汇总
  private async updateDailySummary(
    conversationId: string,
    newActivities: FootprintActivity[]
  ) {
    const today = new Date().toISOString().split('T')[0];
    
    // 获取今天的所有活动
    const todayActivities = await footprintStorage.getActivities(conversationId, {
      dateRange: { start: today, end: today }
    });

    // 计算统计信息
    const stats = this.calculateDailyStats(todayActivities);
    
    const dailyFootprint: DailyFootprint = {
      id: `daily_${conversationId}_${today}`,
      conversationId,
      date: today,
      totalActivities: todayActivities.length,
      activeDuration: stats.activeDuration,
      sleepDuration: stats.sleepDuration,
      chatDuration: stats.chatDuration,
      activityCounts: stats.activityCounts,
      statusCounts: stats.statusCounts,
      highlights: stats.highlights,
      mood: stats.mood,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await footprintStorage.saveDailyFootprint(dailyFootprint);
  }

  // 计算每日统计
  private calculateDailyStats(activities: FootprintActivity[]) {
    const activityCounts = {} as Record<ActivityType, number>;
    const statusCounts = {} as Record<AIStatus, number>;
    let activeDuration = 0;
    let sleepDuration = 0;
    let chatDuration = 0;
    const highlights: string[] = [];

    activities.forEach(activity => {
      // 统计活动类型
      activityCounts[activity.activityType] = (activityCounts[activity.activityType] || 0) + 1;
      statusCounts[activity.status] = (statusCounts[activity.status] || 0) + 1;

      // 累计时长
      const duration = activity.duration || 0;
      if (activity.activityType === 'sleeping') {
        sleepDuration += duration;
      } else if (activity.activityType === 'chatting') {
        chatDuration += duration;
        activeDuration += duration;
      } else {
        activeDuration += duration;
      }

      // 收集重点活动
      if (activity.confidence > 0.8) {
        highlights.push(activity.activity);
      }
    });

    // 判断整体情绪
    const positiveActivities = activities.filter(a => 
      ['chatting', 'social', 'entertainment'].includes(a.activityType)
    ).length;
    const totalActivities = activities.length;
    const positiveRatio = positiveActivities / totalActivities;
    
    let mood: 'positive' | 'neutral' | 'negative';
    if (positiveRatio > 0.6) mood = 'positive';
    else if (positiveRatio > 0.3) mood = 'neutral';
    else mood = 'negative';

    return {
      activityCounts,
      statusCounts,
      activeDuration,
      sleepDuration,
      chatDuration,
      highlights: highlights.slice(0, 5), // 最多5个重点
      mood
    };
  }

  // 辅助方法：总结聊天话题
  private summarizeChatTopic(messages: Message[]): string {
    const topics = ['各种话题', '生活近况', '工作学习', '兴趣爱好', '心情想法'];
    return topics[Math.floor(Math.random() * topics.length)];
  }

  // 辅助方法：推断活动类型
  private inferActivityType(activity: string): ActivityType {
    const keywords: Record<string, string[]> = {
      chatting: ['聊天', '对话', '交流'],
      working: ['工作', '学习', '忙碌', '处理'],
      entertainment: ['放松', '休息', '娱乐', '游戏'],
      reading: ['阅读', '看书', '学习'],
      thinking: ['思考', '想', '考虑'],
      sleeping: ['睡觉', '休息', '睡眠']
    };

    for (const [type, words] of Object.entries(keywords)) {
      if (words.some(word => activity.includes(word))) {
        return type as ActivityType;
      }
    }

    // 默认归类为思考中，避免类型不匹配
    return 'thinking';
  }
}

// 导出单例实例
export const footprintGenerator = new FootprintGeneratorService();

// 便捷的初始化和生成方法
export const initializeFootprintGeneration = async (conversationId: string) => {
  await footprintGenerator.initialize(conversationId);
};

export const generateFootprintNow = async (conversationId: string) => {
  return await footprintGenerator.generateActivitiesForConversation(conversationId);
};
