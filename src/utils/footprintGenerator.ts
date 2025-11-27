// 🎯 人物行动轨迹生成服务 - 基于 Eve Chat 逻辑重构
// 核心原则：
// 1. 硬事实优先 - 基于真实事件记录（聊天、朋友圈、日程等）
// 2. 角色设定影响 - 职业、性格、地点影响描述风格
// 3. 聊天内容提炼 - 作为素材概括，不是逐条还原
// 4. 合理补档 - 仅填补明显空档（如睡眠时段）
// 5. 增量更新 - 保留历史，只补充新内容

import {
  FootprintActivity,
  ActivityType,
  CharacterFootprint,
  FootprintGenerationConfig
} from '../types/footprint';
import { AIStatus, Message, Conversation } from '../types';
import { footprintStorage } from './footprintStorage';

class FootprintGeneratorService {
  private configs: Map<string, FootprintGenerationConfig> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  // 初始化轨迹生成服务
  async initialize(conversationId: string, config: Partial<FootprintGenerationConfig> = {}) {
    const fullConfig: FootprintGenerationConfig = {
      enableAutoGeneration: config.enableAutoGeneration ?? true,
      generationInterval: config.generationInterval ?? 3, // 3小时生成一次
      maxActivitiesPerDay: config.maxActivitiesPerDay ?? 20,
      useAIGeneration: config.useAIGeneration ?? false,
      includeSystemActivities: config.includeSystemActivities ?? true,
      confidenceThreshold: config.confidenceThreshold ?? 0.5
    };

    this.configs.set(conversationId, fullConfig);

    if (fullConfig.enableAutoGeneration) {
      this.startAutoGeneration(conversationId);
    }

    // 初始化时清理一次本地小数据，避免长期堆积
    this.cleanupLocalStorage(conversationId);

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

  // 为指定对话生成轨迹活动（增量模式）
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
        return [];
      }

      // 获取最后一次生成时间，用于增量更新
      const lastGenerationTime = await this.getLastGenerationTime(conversationId);
      const timeRangeStart = lastGenerationTime || (Date.now() - 24 * 60 * 60 * 1000);
      
      console.log(`🔄 开始增量生成轨迹 (${new Date(timeRangeStart).toLocaleString()} -> 现在)`);

      // 本地小数据清理，避免长期堆积
      this.cleanupLocalStorage(conversationId);

      // 收集数据源（只收集新数据）
      const dataSources = await this.collectIncrementalDataSources(conversationId, timeRangeStart);
      
      // 检查是否有足够的数据生成新活动
      if (!this.hasEnoughDataForGeneration(dataSources)) {
        console.log(`⏸️ 数据不足，跳过本次生成`);
        await this.saveGenerationTime(conversationId); // 仍然更新时间戳
        return [];
      }
      
      // 生成活动（增量模式）
      const newActivities = await this.generateActivitiesFromSources(
        conversationId,
        dataSources,
        config
      );

      // 去重：检查是否与已有活动重复
      const uniqueActivities = await this.deduplicateActivities(conversationId, newActivities);

      // 保存到数据库
      if (uniqueActivities.length > 0) {
        await footprintStorage.saveActivities(uniqueActivities);
        console.log(`✅ 为对话 ${conversationId} 增量生成了 ${uniqueActivities.length} 个新活动`);
        
        // 更新每日汇总
        await this.updateDailySummary(conversationId, uniqueActivities);
      } else {
        console.log(`ℹ️ 生成的活动全部重复，已过滤`);
      }
      
      // 更新生成时间戳
      await this.saveGenerationTime(conversationId);

      return uniqueActivities;
    } catch (error) {
      console.error(`生成轨迹活动失败 (${conversationId}):`, error);
      return [];
    }
  }
  
  // 收集增量数据源（只收集新数据）
  private async collectIncrementalDataSources(conversationId: string, since: number) {
    console.log(`🔄 收集增量数据源，时间起点: ${new Date(since).toLocaleString()}`);
    
    const sources = {
      // === 硬事实增量数据 ===
      chatMessages: await this.getRecentChatMessagesSince(conversationId, since),
      statusChanges: await this.getRecentStatusChanges(conversationId),
      subChatActivity: await this.getSubChatActivitySince(conversationId, since),
      momentsActivity: await this.getMomentsActivitySince(conversationId, since),
      
      // 新增：其他硬事实数据源的增量收集
      offlineHistory: (await this.getOfflineHistoryRecords(conversationId))
        .filter((record: any) => record.timestamp > since),
      scheduleData: await this.getAppointmentsAndAnniversaries(conversationId), // 今日数据
      companionStats: await this.getCompanionStats(conversationId), // 今日统计
      crossAppTimeline: (await this.getCrossAppTimeline(conversationId))
        .filter((item: any) => item.timestamp > since),
      systemEvents: (await this.getSystemEvents(conversationId))
        .filter((event: any) => event.timestamp > since),
      
      // === 背景数据（每次都需要） ===
      memoryData: await this.getMemorySystemData(conversationId),
      characterProfile: await this.getCharacterProfile(conversationId),
      timeContext: this.getTimeContext()
    };
    
    // 统计增量数据
    const incrementalStats = {
      newChatMessages: sources.chatMessages.length,
      newMoments: sources.momentsActivity?.postsCount || 0,
      newSubChats: sources.subChatActivity.length,
      newOfflineHistory: sources.offlineHistory.length,
      newCrossAppEvents: sources.crossAppTimeline.length,
      newSystemEvents: sources.systemEvents.length
    };
    
    console.log(`🔄 增量数据统计:`, incrementalStats);
    return sources;
  }
  
  // 检查是否有足够的硬事实数据生成活动
  private hasEnoughDataForGeneration(sources: any): boolean {
    // === 高置信度硬事实数据源 ===
    const hasMessages = sources.chatMessages && sources.chatMessages.length > 0;
    const hasMoments = sources.momentsActivity && sources.momentsActivity.postsCount > 0;
    const hasSubChats = sources.subChatActivity && sources.subChatActivity.length > 0;
    const hasOfflineHistory = sources.offlineHistory && sources.offlineHistory.length > 0;
    const hasScheduleEvents = sources.scheduleData && 
      (sources.scheduleData.appointments.length > 0 || sources.scheduleData.anniversaries.length > 0);
    const hasCrossAppEvents = sources.crossAppTimeline && sources.crossAppTimeline.length > 0;
    const hasSystemEvents = sources.systemEvents && sources.systemEvents.length > 0;
    
    // === 中置信度推断数据源 ===
    const hasStatus = sources.statusChanges && sources.statusChanges.currentActivity;
    const hasCompanionStats = sources.companionStats && 
      (sources.companionStats.chatDuration > 0 || sources.companionStats.messageCount > 0);
    
    // 统计硬事实数据源数量
    const hardFactsCount = [
      hasMessages, hasMoments, hasSubChats, hasOfflineHistory, 
      hasScheduleEvents, hasCrossAppEvents, hasSystemEvents
    ].filter(Boolean).length;
    
    const softFactsCount = [hasStatus, hasCompanionStats].filter(Boolean).length;
    
    // 至少需要 1 个硬事实数据源，或者 2 个以上的软事实数据源
    const hasEnoughData = hardFactsCount >= 1 || softFactsCount >= 2;
    
    if (!hasEnoughData) {
      console.log(`🚫 数据不足: 硬事实 ${hardFactsCount} 个, 软事实 ${softFactsCount} 个`);
    } else {
      console.log(`✅ 数据足够: 硬事实 ${hardFactsCount} 个, 软事实 ${softFactsCount} 个`);
    }
    
    return hasEnoughData;
  }
  
  // 去重：避免生成重复的活动
  private async deduplicateActivities(
    conversationId: string, 
    newActivities: FootprintActivity[]
  ): Promise<FootprintActivity[]> {
    if (newActivities.length === 0) return [];
    
    // 获取最近的已有活动
    const existingActivities = await footprintStorage.getActivities(conversationId, {
      dateRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
    });
    
    // 过滤重复活动
    return newActivities.filter(newActivity => {
      // 检查是否有相同来源的活动
      const isDuplicate = existingActivities.some(existing => {
        // 如果有 sourceId，直接比对
        if (newActivity.sourceId && existing.sourceId) {
          return newActivity.sourceId === existing.sourceId;
        }
        
        // 否则比对时间戳和活动类型
        const timeDiff = Math.abs(newActivity.timestamp - existing.timestamp);
        const isSameType = newActivity.activityType === existing.activityType;
        const isSameTime = timeDiff < 5 * 60 * 1000; // 5分钟内
        
        return isSameType && isSameTime;
      });
      
      return !isDuplicate;
    });
  }
  
  // 获取指定时间之后的聊天消息
  private async getRecentChatMessagesSince(conversationId: string, since: number): Promise<Message[]> {
    const allMessages = await this.getRecentChatMessages(conversationId);
    return allMessages.filter(msg => msg.timestamp > since);
  }
  
  // 获取指定时间之后的子聊天活动
  private async getSubChatActivitySince(conversationId: string, since: number) {
    const allSubChats = await this.getSubChatActivity(conversationId);
    return allSubChats.filter((sc: any) => sc.lastMessageTime > since);
  }
  
  // 获取指定时间之后的朋友圈活动
  private async getMomentsActivitySince(conversationId: string, since: number) {
    const momentsData = await this.getMomentsActivity(conversationId);
    if (!momentsData) return null;
    
    // 过滤出新的朋友圈
    const newPosts = momentsData.recentPosts.filter((post: any) => post.timestamp > since);
    
    return {
      postsCount: newPosts.length,
      lastPostTime: newPosts[0]?.timestamp,
      recentPosts: newPosts
    };
  }

  // 是否需要生成作息类补档（仅夜间）
  private shouldGenerateRoutineActivity(timeContext: any): boolean {
    const tod = timeContext?.timeOfDay;
    return tod === 'night' || tod === 'late_night';
  }

  // === 其余硬事实生成方法（最小实现，后续可引入 AI 文案润色） ===

  // 线下剧情记录 → 活动
  private generateOfflineActivities(
    conversationId: string,
    offlineHistory: any[],
    characterProfile: any
  ): FootprintActivity[] {
    const activities: FootprintActivity[] = [];
    if (!offlineHistory || offlineHistory.length === 0) return activities;

    offlineHistory.forEach((rec: any) => {
      const start = rec.timestamp || rec.startTime || Date.now();
      const end = rec.endTimestamp || rec.endTime || (start + (rec.duration || 60 * 60 * 1000));
      const duration = Math.max(0, end - start);
      const text = rec.title || rec.content || rec.scene || '线下活动';
      const location = rec.location || characterProfile?.location || '线下';

      activities.push({
        id: `offline_${conversationId}_${start}_${rec.id || Math.random().toString(36).slice(2)}`,
        characterId: conversationId,
        timestamp: start,
        endTimestamp: end,
        duration,
        activity: `线下：${text}`,
        activityType: 'offline',
        status: 'offline',
        location,
        source: 'system',
        sourceId: rec.id,
        sourceData: rec,
        confidence: 0.9,
        tags: ['线下'],
        metadata: { scene: rec.scene, with: rec.with, notes: rec.notes },
        createdAt: Date.now()
      });
    });

    return activities;
  }

  // 日程与纪念日 → 活动
  private generateScheduleActivities(
    conversationId: string,
    scheduleData: { appointments: any[]; anniversaries: any[] },
    characterProfile: any
  ): FootprintActivity[] {
    const activities: FootprintActivity[] = [];
    const { appointments = [], anniversaries = [] } = scheduleData || {};

    appointments.forEach((apt: any) => {
      const start = apt.timestamp || (apt.date && apt.time ? new Date(`${apt.date}T${apt.time}:00`).getTime() : Date.now());
      const duration = apt.duration || 60 * 60 * 1000;
      const end = start + duration;
      const title = apt.title || apt.name || '预定事件';
      const activityType = this.inferActivityType(String(title));

      activities.push({
        id: `apt_${conversationId}_${start}_${apt.id || Math.random().toString(36).slice(2)}`,
        characterId: conversationId,
        timestamp: start,
        endTimestamp: end,
        duration,
        activity: `日程：${title}`,
        activityType,
        status: 'online',
        location: apt.location || characterProfile?.location,
        source: 'scheduled',
        sourceId: apt.id,
        sourceData: apt,
        confidence: 0.9,
        tags: ['日程'],
        metadata: { category: apt.category },
        createdAt: Date.now()
      });
    });

    anniversaries.forEach((ann: any) => {
      const start = ann.timestamp || (ann.date ? new Date(`${ann.date}T00:00:00`).getTime() : Date.now());
      const duration = 2 * 60 * 60 * 1000;
      const end = start + duration;
      const title = ann.title || ann.name || '纪念日';

      activities.push({
        id: `ann_${conversationId}_${start}_${ann.id || Math.random().toString(36).slice(2)}`,
        characterId: conversationId,
        timestamp: start,
        endTimestamp: end,
        duration,
        activity: `纪念日：${title}`,
        activityType: 'social',
        status: 'online',
        location: ann.location || characterProfile?.location,
        source: 'scheduled',
        sourceId: ann.id,
        sourceData: ann,
        confidence: 0.9,
        tags: ['纪念日'],
        category: '纪念日',
        metadata: {},
        createdAt: Date.now()
      });
    });

    return activities;
  }

  // 跨应用时间线 → 活动
  private generateCrossAppActivities(
    conversationId: string,
    timeline: any[],
    characterProfile: any
  ): FootprintActivity[] {
    const activities: FootprintActivity[] = [];
    if (!timeline || timeline.length === 0) return activities;

    timeline.forEach((item: any) => {
      const start = item.timestamp || Date.now();
      const duration = item.duration || 30 * 60 * 1000;
      const end = start + duration;
      const text = item.content || item.title || `${item.app || '应用'}活动`;
      const activityType = this.inferActivityType(String(text));

      activities.push({
        id: `xapp_${conversationId}_${start}_${item.id || Math.random().toString(36).slice(2)}`,
        characterId: conversationId,
        timestamp: start,
        endTimestamp: end,
        duration,
        activity: `跨应用：${text}`,
        activityType,
        status: 'online',
        location: characterProfile?.location,
        source: 'system',
        sourceId: item.id,
        sourceData: item,
        confidence: 0.85,
        tags: ['跨应用'],
        metadata: { app: item.app, type: item.type },
        createdAt: Date.now()
      });
    });

    return activities;
  }

  // 系统事件（文档/财务） → 活动
  private generateSystemActivities(
    conversationId: string,
    events: any[],
    characterProfile: any
  ): FootprintActivity[] {
    const activities: FootprintActivity[] = [];
    if (!events || events.length === 0) return activities;

    events.forEach((ev: any) => {
      const start = ev.timestamp || Date.now();
      const duration = ev.duration || 15 * 60 * 1000;
      const end = start + duration;
      const text = ev.title || ev.content || ev.detail || (ev.type === 'finance' ? '财务事件' : '文档事件');
      const activityType = this.inferActivityType(String(text));
      const source = ev.type === 'finance' ? 'finance' : 'document';

      activities.push({
        id: `sys_${conversationId}_${start}_${ev.id || Math.random().toString(36).slice(2)}`,
        characterId: conversationId,
        timestamp: start,
        endTimestamp: end,
        duration,
        activity: `${source === 'finance' ? '财务' : '文档'}：${text}`,
        activityType,
        status: 'online',
        location: characterProfile?.location,
        source,
        sourceId: ev.id,
        sourceData: ev,
        confidence: 0.85,
        tags: [source],
        metadata: {},
        createdAt: Date.now()
      });
    });

    return activities;
  }

  // 陪伴统计聚合 → 活动
  private generateCompanionActivity(
    conversationId: string,
    companionStats: any,
    characterProfile: any
  ): FootprintActivity | null {
    if (!companionStats) return null;
    const start = Date.now() - 60 * 60 * 1000;
    const duration = companionStats.companionTime || companionStats.chatDuration || 30 * 60 * 1000;
    const end = start + duration;
    const msgCount = companionStats.messageCount || 0;
    const activity = `今天互动 ${Math.round(duration / 60000)} 分钟，消息 ${msgCount} 条`;

    return {
      id: `comp_${conversationId}_${start}`,
      characterId: conversationId,
      timestamp: start,
      endTimestamp: end,
      duration,
      activity,
      activityType: 'chatting',
      status: 'online',
      location: characterProfile?.location,
      source: 'system',
      sourceData: companionStats,
      confidence: 0.7,
      tags: ['互动统计'],
      metadata: {},
      createdAt: Date.now()
    };
  }

  // === 增量更新逻辑 ===
  // 检查是否应该生成新活动（增量模式）
  private async shouldGenerateNewActivities(conversationId: string): Promise<boolean> {
    const config = this.configs.get(conversationId)!;
    const now = Date.now();
    
    // 获取最后一次生成的时间戳
    const lastGenerationTime = await this.getLastGenerationTime(conversationId);
    
    // 如果从未生成过，应该生成
    if (!lastGenerationTime) {
      console.log(`📝 对话 ${conversationId} 首次生成轨迹`);
      return true;
    }
    
    // 检查时间间隔
    const timeSinceLastGeneration = now - lastGenerationTime;
    const minInterval = config.generationInterval * 60 * 60 * 1000;
    
    if (timeSinceLastGeneration < minInterval) {
      console.log(`⏸️ 距离上次生成仅 ${Math.floor(timeSinceLastGeneration / 1000 / 60)} 分钟，等待中...`);
      return false;
    }
    
    // 检查今天是否已有足够活动
    const todayActivities = await this.getTodayActivities(conversationId);
    if (todayActivities.length >= config.maxActivitiesPerDay) {
      console.log(`⏸️ 今日活动已达上限 (${todayActivities.length}/${config.maxActivitiesPerDay})`);
      return false;
    }
    
    // 检查是否有新的数据源事件
    const hasNewEvents = await this.checkForNewEvents(conversationId, lastGenerationTime);
    if (!hasNewEvents) {
      console.log(`⏸️ 自上次生成后无新事件`);
      return false;
    }

    return true;
  }
  
  // 获取最后一次生成时间
  private async getLastGenerationTime(conversationId: string): Promise<number | null> {
    try {
      const key = `footprint_last_generation_${conversationId}`;
      const timeStr = localStorage.getItem(key);
      return timeStr ? parseInt(timeStr) : null;
    } catch (error) {
      console.error('获取最后生成时间失败:', error);
      return null;
    }
  }
  
  // 保存生成时间戳
  private async saveGenerationTime(conversationId: string): Promise<void> {
    try {
      const key = `footprint_last_generation_${conversationId}`;
      localStorage.setItem(key, Date.now().toString());
    } catch (error) {
      console.error('保存生成时间失败:', error);
    }
  }
  
  // 获取今日活动
  private async getTodayActivities(conversationId: string): Promise<FootprintActivity[]> {
    const today = new Date().toISOString().split('T')[0];
    return await footprintStorage.getActivities(conversationId, {
      dateRange: { start: today, end: today }
    });
  }
  
  // 检查是否有新的硬事实事件（增量检测）
  private async checkForNewEvents(conversationId: string, lastCheckTime: number): Promise<boolean> {
    // === 检查各种硬事实数据源 ===
    
    // 1. 检查聊天消息
    const recentMessages = await this.getRecentChatMessages(conversationId);
    const hasNewMessages = recentMessages.some(msg => msg.timestamp > lastCheckTime);
    
    // 2. 检查朋友圈
    const momentsData = await this.getMomentsActivity(conversationId);
    const hasNewMoments = momentsData?.lastPostTime && momentsData.lastPostTime > lastCheckTime;
    
    // 3. 检查子聊天
    const subChats = await this.getSubChatActivity(conversationId);
    const hasNewSubChat = subChats.some((sc: any) => sc.lastMessageTime > lastCheckTime);
    
    // 4. 检查线下剧情
    const offlineHistory = await this.getOfflineHistoryRecords(conversationId);
    const hasNewOfflineHistory = offlineHistory.some((record: any) => record.timestamp > lastCheckTime);
    
    // 5. 检查系统事件
    const systemEvents = await this.getSystemEvents(conversationId);
    const hasNewSystemEvents = systemEvents.some((event: any) => event.timestamp > lastCheckTime);
    
    // 6. 检查跨应用事件
    const crossAppTimeline = await this.getCrossAppTimeline(conversationId);
    const hasNewCrossAppEvents = crossAppTimeline.some((item: any) => item.timestamp > lastCheckTime);
    
    // 7. 检查今日的特殊事件（日程/纪念日）
    const scheduleData = await this.getAppointmentsAndAnniversaries(conversationId);
    const hasScheduleEvents = scheduleData.appointments.length > 0 || scheduleData.anniversaries.length > 0;
    
    const eventTypes = {
      hasNewMessages,
      hasNewMoments,
      hasNewSubChat,
      hasNewOfflineHistory,
      hasNewSystemEvents,
      hasNewCrossAppEvents,
      hasScheduleEvents
    };
    
    const hasAnyNewEvents = Object.values(eventTypes).some(Boolean);
    console.log(`🔍 新事件检测:`, eventTypes, `总结: ${hasAnyNewEvents}`);
    
    return hasAnyNewEvents;
  }

  // === 硬事实数据源收集方法 ===
  
  // 获取线下剧情记录（高置信度硬事实）
  private async getOfflineHistoryRecords(conversationId: string): Promise<any[]> {
    try {
      const key = `offline_history_${conversationId}`;
      const data = localStorage.getItem(key);
      if (data) {
        const records = JSON.parse(data);
        return records.filter((record: any) => {
          const recordTime = record.timestamp || record.createdAt;
          return recordTime > (Date.now() - 24 * 60 * 60 * 1000); // 最近24小时
        });
      }
      return [];
    } catch (error) {
      console.error('获取线下剧情记录失败:', error);
      return [];
    }
  }
  
  // 获取日程和纪念日（高置信度硬事实）
  private async getAppointmentsAndAnniversaries(conversationId: string) {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // 获取今日日程
      const appointmentsKey = `appointments_${conversationId}`;
      const appointmentsData = localStorage.getItem(appointmentsKey);
      const todayAppointments = appointmentsData ? 
        JSON.parse(appointmentsData).filter((apt: any) => apt.date === todayStr) : [];
      
      // 获取今日纪念日
      const anniversariesKey = `anniversaries_${conversationId}`;
      const anniversariesData = localStorage.getItem(anniversariesKey);
      const todayAnniversaries = anniversariesData ?
        JSON.parse(anniversariesData).filter((ann: any) => {
          const annDate = new Date(ann.date);
          return annDate.getMonth() === today.getMonth() && 
                 annDate.getDate() === today.getDate();
        }) : [];
      
      return {
        appointments: todayAppointments,
        anniversaries: todayAnniversaries
      };
    } catch (error) {
      console.error('获取日程和纪念日失败:', error);
      return { appointments: [], anniversaries: [] };
    }
  }
  
  // 获取记忆系统数据（中置信度推断数据）
  private async getMemorySystemData(conversationId: string) {
    try {
      const memoryData = {
        workingMemory: [],
        episodicMemory: [],
        coreMemories: [],
        recentUpdates: []
      };
      
      // 获取工作记忆
      const workingKey = `working_memory_${conversationId}`;
      const workingData = localStorage.getItem(workingKey);
      if (workingData) {
        memoryData.workingMemory = JSON.parse(workingData).slice(0, 10); // 最近10条
      }
      
      // 获取情景记忆
      const episodicKey = `episodic_memory_${conversationId}`;
      const episodicData = localStorage.getItem(episodicKey);
      if (episodicData) {
        const memories = JSON.parse(episodicData);
        memoryData.episodicMemory = memories.filter((mem: any) => {
          return mem.timestamp > (Date.now() - 7 * 24 * 60 * 60 * 1000); // 最近7天
        });
      }
      
      // 获取核心记忆
      const coreKey = `core_memories_${conversationId}`;
      const coreData = localStorage.getItem(coreKey);
      if (coreData) {
        memoryData.coreMemories = JSON.parse(coreData).slice(0, 5); // 最重要的5个
      }
      
      return memoryData;
    } catch (error) {
      console.error('获取记忆系统数据失败:', error);
      return { workingMemory: [], episodicMemory: [], coreMemories: [], recentUpdates: [] };
    }
  }
  
  // 获取陪伴统计数据（高置信度硬事实）
  private async getCompanionStats(conversationId: string) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 获取今日陪伴统计
      const dailyStatsKey = `companion_daily_stats_${conversationId}_${today}`;
      const dailyStatsData = localStorage.getItem(dailyStatsKey);
      const dailyStats = dailyStatsData ? JSON.parse(dailyStatsData) : {};
      
      // 获取陪伴活动记录
      const activitiesKey = `companion_activities_${conversationId}`;
      const activitiesData = localStorage.getItem(activitiesKey);
      const recentActivities = activitiesData ? 
        JSON.parse(activitiesData).filter((act: any) => {
          return act.date === today;
        }) : [];
      
      return {
        dailyStats: dailyStats,
        chatDuration: dailyStats.chatDuration || 0,
        messageCount: dailyStats.messageCount || 0,
        companionTime: dailyStats.companionTime || 0,
        activities: recentActivities
      };
    } catch (error) {
      console.error('获取陪伴统计失败:', error);
      return { dailyStats: {}, chatDuration: 0, messageCount: 0, companionTime: 0, activities: [] };
    }
  }
  
  // 获取跨应用时间线（硬事实聚合）
  private async getCrossAppTimeline(conversationId: string) {
    try {
      const timelineKey = `cross_app_timeline_${conversationId}`;
      const timelineData = localStorage.getItem(timelineKey);
      if (timelineData) {
        const timeline = JSON.parse(timelineData);
        return timeline.filter((item: any) => {
          return item.timestamp > (Date.now() - 24 * 60 * 60 * 1000); // 最近24小时
        }).slice(0, 20); // 最多20条
      }
      return [];
    } catch (error) {
      console.error('获取跨应用时间线失败:', error);
      return [];
    }
  }
  
  // 获取系统事件（文档、财务等）
  private async getSystemEvents(conversationId: string): Promise<any[]> {
    try {
      const systemEvents: any[] = [];
      
      // 获取文档相关事件
      const docsKey = `document_events_${conversationId}`;
      const docsData = localStorage.getItem(docsKey);
      if (docsData) {
        const docs = JSON.parse(docsData).filter((doc: any) => {
          return doc.timestamp > (Date.now() - 24 * 60 * 60 * 1000);
        });
        systemEvents.push(...docs.map((doc: any) => ({...doc, type: 'document'})));
      }
      
      // 获取财务相关事件
      const financeKey = `finance_events_${conversationId}`;
      const financeData = localStorage.getItem(financeKey);
      if (financeData) {
        const finance = JSON.parse(financeData).filter((fin: any) => {
          return fin.timestamp > (Date.now() - 24 * 60 * 60 * 1000);
        });
        systemEvents.push(...finance.map((fin: any) => ({...fin, type: 'finance'})));
      }
      
      return systemEvents;
    } catch (error) {
      console.error('获取系统事件失败:', error);
      return [];
    }
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
      return conversation.subChats
        .filter((subChat: any) => subChat.lastMessageTime > Date.now() - (24 * 60 * 60 * 1000))
        .map((subChat: any) => ({
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

  // 获取角色设定（影响描述风格）
  private async getCharacterProfile(conversationId: string) {
    try {
      const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
      const conversation = conversations.find((c: Conversation) => c.id === conversationId);
      
      if (!conversation?.character) return null;
      
      const character = conversation.character;
      return {
        name: character.name,
        occupation: character.occupation || '学生',
        personality: character.personality || '温柔体贴',
        location: character.location || '上海',
        interests: character.interests || [],
        relationship: character.relationship || '朋友'
      };
    } catch (error) {
      console.error('获取角色设定失败:', error);
      return null;
    }
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

  // 从数据源生成活动 - 完整复刻 Eve Chat 逻辑
  private async generateActivitiesFromSources(
    conversationId: string,
    sources: any,
    config: FootprintGenerationConfig
  ): Promise<FootprintActivity[]> {
    const activities: FootprintActivity[] = [];
    
    console.log(`🎭 开始生成活动，AI模式: ${config.useAIGeneration ? '开启' : '关闭'}`);

    // === 硬事实活动生成（高置信度 0.8-0.95） ===
    
    // 1. 聊天记录 -> 活动（最高优先级）
    if (sources.chatMessages.length > 0) {
      console.log(`💬 基于 ${sources.chatMessages.length} 条聊天记录生成活动`);
      const chatActivities = await this.generateChatActivities(
        conversationId, sources.chatMessages, sources.characterProfile
      );
      activities.push(...chatActivities);
    }

    // 2. 朋友圈动态 -> 社交活动
    if (sources.momentsActivity?.postsCount > 0) {
      console.log(`📱 基于 ${sources.momentsActivity.postsCount} 条朋友圈生成活动`);
      const momentsActivities = await this.generateMomentsActivities(
        conversationId, sources.momentsActivity, sources.characterProfile
      );
      activities.push(...momentsActivities);
    }

    // 3. 子聊天活动 -> 深度互动
    if (sources.subChatActivity.length > 0) {
      console.log(`🗣️ 基于 ${sources.subChatActivity.length} 个子聊天生成活动`);
      const subChatActivities = await this.generateSubChatActivities(
        conversationId, sources.subChatActivity, sources.characterProfile
      );
      activities.push(...subChatActivities);
    }

    // 4. 线下剧情记录 -> 线下活动
    if (sources.offlineHistory.length > 0) {
      console.log(`🎨 基于 ${sources.offlineHistory.length} 条线下剧情生成活动`);
      const offlineActivities = await this.generateOfflineActivities(
        conversationId, sources.offlineHistory, sources.characterProfile
      );
      activities.push(...offlineActivities);
    }

    // 5. 日程和纪念日 -> 重要事件活动
    const hasScheduleEvents = sources.scheduleData.appointments.length > 0 || sources.scheduleData.anniversaries.length > 0;
    if (hasScheduleEvents) {
      console.log(`📅 基于日程和纪念日生成活动`);
      const scheduleActivities = await this.generateScheduleActivities(
        conversationId, sources.scheduleData, sources.characterProfile
      );
      activities.push(...scheduleActivities);
    }

    // 6. 跨应用时间线 -> 综合行为活动
    if (sources.crossAppTimeline.length > 0) {
      if (config.includeSystemActivities) {
        console.log(`🌐 基于 ${sources.crossAppTimeline.length} 条跨应用事件生成活动`);
        const crossAppActivities = await this.generateCrossAppActivities(
          conversationId, sources.crossAppTimeline, sources.characterProfile
        );
        activities.push(...crossAppActivities);
      } else {
        console.log('🌐 跳过跨应用事件（根据配置关闭系统活动）');
      }
    }

    // 7. 系统事件 -> 系统活动
    if (sources.systemEvents.length > 0) {
      if (config.includeSystemActivities) {
        console.log(`⚙️ 基于 ${sources.systemEvents.length} 个系统事件生成活动`);
        const systemActivities = await this.generateSystemActivities(
          conversationId, sources.systemEvents, sources.characterProfile
        );
        activities.push(...systemActivities);
      } else {
        console.log('⚙️ 跳过系统事件（根据配置关闭系统活动）');
      }
    }

    // === 推断活动生成（中置信度 0.5-0.7） ===
    
    // 8. AI 状态变化 -> 状态活动
    if (sources.statusChanges?.currentActivity) {
      console.log(`🟢 基于 AI 状态变化生成活动`);
      const statusActivity = await this.generateStatusActivity(
        conversationId, sources.statusChanges, sources.characterProfile
      );
      if (statusActivity) activities.push(statusActivity);
    }

    // 9. 陪伴统计 -> 互动活动
    const hasCompanionData = sources.companionStats.chatDuration > 0 || sources.companionStats.messageCount > 0;
    if (hasCompanionData) {
      if (config.includeSystemActivities) {
        console.log(`🤝 基于陪伴统计生成活动`);
        const companionActivity = await this.generateCompanionActivity(
          conversationId, sources.companionStats, sources.characterProfile
        );
        if (companionActivity) activities.push(companionActivity);
      } else {
        console.log('🤝 跳过陪伴统计活动（根据配置关闭系统活动）');
      }
    }

    // === 合理补档活动（低置信度 0.3-0.5） ===
    
    // 10. 仅填补明显空档（如睡眠时段）
    const shouldFillGaps = activities.length === 0 || this.shouldGenerateRoutineActivity(sources.timeContext);
    if (shouldFillGaps) {
      console.log(`😴 生成合理补档活动`);
      const routineActivity = await this.generateReasonableRoutineActivity(
        conversationId, sources.timeContext, sources.characterProfile
      );
      if (routineActivity) activities.push(routineActivity);
    }

    // 过滤低置信度活动
    const filteredActivities = activities.filter(activity => 
      activity.confidence >= config.confidenceThreshold
    );
    
    console.log(`✅ 生成完成: ${activities.length} 个活动中的 ${filteredActivities.length} 个符合置信度要求`);
    return filteredActivities;
  }

  // === 硬事实活动生成方法 ===
  
  // 生成聊天活动（真实互动，高置信度）
  private generateChatActivities(
    conversationId: string,
    messages: Message[],
    characterProfile: any
  ): FootprintActivity[] {
    const activities: FootprintActivity[] = [];
    
    if (messages.length === 0) return activities;

    // 按时间分组，识别聊天段落
    const chatSessions = this.groupMessagesIntoSessions(messages);
    
    chatSessions.forEach(session => {
      const duration = session.endTime - session.startTime;
      const topic = this.extractChatTopic(session.messages);
      const location = characterProfile?.location || '线上';
      
      // 基于角色设定调整描述风格
      let activity = this.personalizeChatDescription(topic, characterProfile);
      
      activities.push({
        id: `chat_${conversationId}_${session.startTime}`,
        characterId: conversationId,
        timestamp: session.startTime,
        endTimestamp: session.endTime,
        duration,
        activity,
        activityType: 'chatting',
        status: 'online',
        location,
        source: 'chat',
        confidence: 0.95, // 真实聊天记录，高置信度
        tags: ['聊天', '互动', topic],
        metadata: {
          messageCount: session.messages.length,
          topic: topic,
          sessionType: 'chat'
        },
        createdAt: Date.now()
      });
    });

    return activities;
  }

  // 生成朋友圈活动（社交行为，高置信度）
  private generateMomentsActivities(
    conversationId: string,
    momentsData: any,
    characterProfile: any
  ): FootprintActivity[] {
    const activities: FootprintActivity[] = [];
    
    momentsData.recentPosts.forEach((post: any) => {
      const location = characterProfile?.location || '线上';
      let activity = this.personalizeMomentsDescription(post.content, characterProfile);
      
      activities.push({
        id: `moments_${conversationId}_${post.id}`,
        characterId: conversationId,
        timestamp: post.timestamp,
        activity,
        activityType: 'social',
        status: 'online',
        location,
        source: 'moments',
        sourceId: post.id,
        sourceData: { content: post.content, type: post.type },
        confidence: 0.9, // 朋友圈记录，高置信度
        tags: ['朋友圈', '社交'],
        metadata: {
          postType: post.type,
          contentPreview: post.content.substring(0, 50)
        },
        createdAt: Date.now()
      });
    });

    return activities;
  }

  // 生成子聊天活动（深度讨论，高置信度）
  private generateSubChatActivities(
    conversationId: string,
    subChats: any[],
    characterProfile: any
  ): FootprintActivity[] {
    const activities: FootprintActivity[] = [];
    
    subChats.forEach(subChat => {
      const topic = this.extractSubChatTopic(subChat.name, subChat.messageCount);
      let activity = this.personalizeSubChatDescription(topic, subChat, characterProfile);
      
      activities.push({
        id: `subchat_${conversationId}_${subChat.id}`,
        characterId: conversationId,
        timestamp: subChat.lastMessageTime,
        duration: 30 * 60 * 1000, // 估算30分钟
        activity,
        activityType: 'chatting',
        activitySubType: topic,
        status: 'online',
        location: '私密空间',
        source: 'sub_chat',
        sourceId: subChat.id,
        sourceData: { name: subChat.name, messageCount: subChat.messageCount },
        confidence: 0.85, // 子聊天记录，中高置信度
        tags: ['子聊天', '深度讨论', topic],
        metadata: {
          subChatName: subChat.name,
          messageCount: subChat.messageCount
        },
        createdAt: Date.now()
      });
    });

    return activities;
  }

  // 生成状态活动（在线状态，中置信度）
  private generateStatusActivity(
    conversationId: string,
    statusData: any,
    characterProfile: any
  ): FootprintActivity | null {
    if (!statusData.currentActivity) return null;

    let activity = this.personalizeStatusDescription(statusData.currentActivity, characterProfile);
    
    return {
      id: `status_${conversationId}_${Date.now()}`,
      characterId: conversationId,
      timestamp: Date.now() - (30 * 60 * 1000), // 30分钟前开始
      duration: 30 * 60 * 1000,
      activity,
      activityType: this.inferActivityType(statusData.currentActivity),
      status: statusData.status,
      source: 'status',
      sourceData: { activity: statusData.currentActivity, status: statusData.status },
      confidence: 0.7, // 状态记录，中等置信度
      tags: ['状态', '推断'],
      metadata: {
        originalActivity: statusData.currentActivity
      },
      createdAt: Date.now()
    };
  }

  // === 合理补档活动（低置信度） ===
  
  // 仅填补明显空档（如睡眠时段）
  private generateReasonableRoutineActivity(
    conversationId: string,
    timeContext: any,
    characterProfile: any
  ): FootprintActivity | null {
    const { timeOfDay } = timeContext;
    
    // 只填补明显的睡眠时段
    if (timeOfDay !== 'late_night' && timeOfDay !== 'night') {
      return null; // 非睡眠时段不补档
    }
    
    let activity = this.personalizeSleepDescription(characterProfile);
    
    return {
      id: `routine_${conversationId}_${Date.now()}`,
      characterId: conversationId,
      timestamp: Date.now() - (Math.random() * 60 * 60 * 1000),
      duration: 3 * 60 * 60 * 1000, // 3小时睡眠
      activity,
      activityType: 'sleeping',
      status: 'offline',
      source: 'system',
      confidence: 0.3, // 推断的睡眠，低置信度
      tags: ['睡眠', '推断'],
      category: '日常',
      metadata: {
        generatedReason: '时间段填补',
        timeOfDay: timeContext.timeOfDay
      },
      createdAt: Date.now()
    };
  }

  // 更新每日汇总
  private async updateDailySummary(
    conversationId: string,
    _newActivities: FootprintActivity[]
  ) {
    const today = new Date().toISOString().split('T')[0];
    
    // 获取今天的所有活动
    const todayActivities = await footprintStorage.getActivities(conversationId, {
      dateRange: { start: today, end: today }
    });

    // 计算统计信息
    const stats = this.calculateDailyStats(todayActivities);
    
    const characterFootprint: CharacterFootprint = {
      id: `daily_${conversationId}_${today}`,
      characterId: conversationId,
      date: today,
      totalActivities: todayActivities.length,
      totalDuration: stats.activeDuration + stats.sleepDuration,
      activityCounts: stats.activityCounts,
      activityDurations: stats.activityDurations,
      statusDistribution: stats.statusCounts,
      chatDuration: stats.chatDuration,
      chatMessageCount: stats.chatMessageCount,
      momentsCount: stats.momentsCount,
      highlights: stats.highlights,
      mood: stats.mood,
      metadata: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 临时使用 saveDailyFootprint，后续需要更新存储服务
    await footprintStorage.saveDailyFootprint(characterFootprint as any);
  }

  // === 本地小数据清理，防止长期堆积 ===
  private cleanupLocalStorage(conversationId: string): void {
    try {
      const DAY = 24 * 60 * 60 * 1000;
      const now = Date.now();

      // 朋友圈：仅保留最近7天且最多500条
      const momentsKey = `moments_${conversationId}`;
      const momentsStr = localStorage.getItem(momentsKey);
      if (momentsStr) {
        const moments = JSON.parse(momentsStr);
        const posts = Array.isArray(moments.posts) ? moments.posts : [];
        const filtered = posts
          .filter((p: any) => (p.timestamp || 0) > now - 7 * DAY)
          .slice(-500);
        if (filtered.length !== posts.length) {
          moments.posts = filtered;
          localStorage.setItem(momentsKey, JSON.stringify(moments));
        }
      }

      // 线下剧情：保留最近7天
      const offKey = `offline_history_${conversationId}`;
      const offStr = localStorage.getItem(offKey);
      if (offStr) {
        const arr = JSON.parse(offStr);
        const filtered = (Array.isArray(arr) ? arr : []).filter((r: any) =>
          (r.timestamp || r.createdAt || 0) > now - 7 * DAY
        );
        if (filtered.length !== (arr?.length || 0)) {
          localStorage.setItem(offKey, JSON.stringify(filtered));
        }
      }

      // 跨应用时间线：保留最近7天且最多1000条
      const xKey = `cross_app_timeline_${conversationId}`;
      const xStr = localStorage.getItem(xKey);
      if (xStr) {
        const arr = JSON.parse(xStr);
        const filtered = (Array.isArray(arr) ? arr : [])
          .filter((e: any) => (e.timestamp || 0) > now - 7 * DAY)
          .slice(-1000);
        if (filtered.length !== (arr?.length || 0)) {
          localStorage.setItem(xKey, JSON.stringify(filtered));
        }
      }

      // 文档与财务事件：保留最近7天
      const docKey = `document_events_${conversationId}`;
      const docStr = localStorage.getItem(docKey);
      if (docStr) {
        const arr = JSON.parse(docStr);
        const filtered = (Array.isArray(arr) ? arr : [])
          .filter((e: any) => (e.timestamp || 0) > now - 7 * DAY);
        if (filtered.length !== (arr?.length || 0)) {
          localStorage.setItem(docKey, JSON.stringify(filtered));
        }
      }
      const finKey = `finance_events_${conversationId}`;
      const finStr = localStorage.getItem(finKey);
      if (finStr) {
        const arr = JSON.parse(finStr);
        const filtered = (Array.isArray(arr) ? arr : [])
          .filter((e: any) => (e.timestamp || 0) > now - 7 * DAY);
        if (filtered.length !== (arr?.length || 0)) {
          localStorage.setItem(finKey, JSON.stringify(filtered));
        }
      }

      // 工作/情景记忆：限制长度与时间（最多7天；工作记忆按长度裁剪以避免昂贵解析）
      const workingKey = `working_memory_${conversationId}`;
      const workingStr = localStorage.getItem(workingKey);
      if (workingStr) {
        const arr = JSON.parse(workingStr);
        const trimmed = (Array.isArray(arr) ? arr : []).slice(-200);
        if (trimmed.length !== (arr?.length || 0)) {
          localStorage.setItem(workingKey, JSON.stringify(trimmed));
        }
      }
      const episodicKey = `episodic_memory_${conversationId}`;
      const episodicStr = localStorage.getItem(episodicKey);
      if (episodicStr) {
        const arr = JSON.parse(episodicStr);
        const filtered = (Array.isArray(arr) ? arr : [])
          .filter((m: any) => (m.timestamp || 0) > now - 7 * DAY)
          .slice(-1000);
        if (filtered.length !== (arr?.length || 0)) {
          localStorage.setItem(episodicKey, JSON.stringify(filtered));
        }
      }

      // AI 状态：保留最近3天，并限制长度
      const statusKey = `ai_status_${conversationId}`;
      const statusStr = localStorage.getItem(statusKey);
      if (statusStr) {
        const obj = JSON.parse(statusStr);
        const history = Array.isArray(obj?.history) ? obj.history : [];
        const filtered = history.filter((h: any) => (h?.timestamp || 0) > now - 3 * DAY).slice(-200);
        if (filtered.length !== history.length) {
          obj.history = filtered;
          localStorage.setItem(statusKey, JSON.stringify(obj));
        }
      }

      // 陪伴活动：保留最近3天 & 最多500条
      const compKey = `companion_activities_${conversationId}`;
      const compStr = localStorage.getItem(compKey);
      if (compStr) {
        const arr = JSON.parse(compStr);
        const today = new Date().toISOString().split('T')[0];
        const cutoff = new Date(Date.now() - 3 * DAY).toISOString().split('T')[0];
        const filtered = (Array.isArray(arr) ? arr : [])
          .filter((a: any) => (a.date || today) >= cutoff)
          .slice(-500);
        if (filtered.length !== (arr?.length || 0)) {
          localStorage.setItem(compKey, JSON.stringify(filtered));
        }
      }

      // 陪伴每日统计：删除超过7天的键（最多一周）
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i) as string;
          const prefix = `companion_daily_stats_${conversationId}_`;
          if (key && key.startsWith(prefix)) {
            const dateStr = key.substring(prefix.length);
            const date = new Date(dateStr);
            if (isFinite(date.getTime())) {
              if (now - date.getTime() > 7 * DAY) {
                localStorage.removeItem(key);
              }
            }
          }
        }
      } catch {}

      // 日程：删除已结束超过7天的历史（最多一周）
      const aptKey = `appointments_${conversationId}`;
      const aptStr = localStorage.getItem(aptKey);
      if (aptStr) {
        const arr = JSON.parse(aptStr);
        const filtered = (Array.isArray(arr) ? arr : []).filter((apt: any) => {
          const ts = apt.timestamp || (apt.date && apt.time ? new Date(`${apt.date}T${apt.time}:00`).getTime() : 0);
          return ts === 0 || now - ts < 7 * DAY || ts > now; // 未来或近7天内
        });
        if (filtered.length !== (arr?.length || 0)) {
          localStorage.setItem(aptKey, JSON.stringify(filtered));
        }
      }
      // 纪念日：不清理（用户长期数据）

    } catch (e) {
      console.warn('cleanupLocalStorage 失败:', e);
    }
  }

  // 计算每日统计
  private calculateDailyStats(activities: FootprintActivity[]) {
    const activityCounts = {} as Record<ActivityType, number>;
    const activityDurations = {} as Record<ActivityType, number>;
    const statusCounts = {} as Record<AIStatus, number>;
    let activeDuration = 0;
    let sleepDuration = 0;
    let chatDuration = 0;
    let chatMessageCount = 0;
    let momentsCount = 0;
    const highlights: string[] = [];

    activities.forEach(activity => {
      // 统计活动类型
      activityCounts[activity.activityType] = (activityCounts[activity.activityType] || 0) + 1;
      statusCounts[activity.status] = (statusCounts[activity.status] || 0) + 1;

      // 累计时长
      const duration = activity.duration || 0;
      activityDurations[activity.activityType] = (activityDurations[activity.activityType] || 0) + duration;
      
      if (activity.activityType === 'sleeping') {
        sleepDuration += duration;
      } else if (activity.activityType === 'chatting') {
        chatDuration += duration;
        activeDuration += duration;
        // 统计消息数
        chatMessageCount += activity.metadata?.messageCount || 0;
      } else if (activity.activityType === 'social') {
        momentsCount += 1;
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
    const mood = highlights.length > 2 ? 'positive' : 
                 highlights.length === 0 ? 'negative' : 'neutral';

    return {
      activityCounts,
      activityDurations,
      statusCounts,
      activeDuration,
      sleepDuration,
      chatDuration,
      chatMessageCount,
      momentsCount,
      highlights: highlights.slice(0, 5), // 最多5个重点
      mood
    };
  }

  // === 个性化描述生成方法 ===
  
  // 个性化聊天描述
  private personalizeChatDescription(topic: string, character: any): string {
    const templates = {
      '学生': [
        `和你聊了关于${topic}的话题，感觉学到了很多`,
        `和你讨论${topic}，很有意思的交流`,
        `和你聊${topic}，感觉时间过得好快`
      ],
      '上班族': [
        `和你聊了聊${topic}，放松了一下心情`,
        `和你讨论${topic}，工作之余的愉快时光`,
        `和你聊${topic}，感觉压力都减轻了`
      ],
      '自由职业者': [
        `和你聊了${topic}，灵感又多了不少`,
        `和你讨论${topic}，很有收获的对话`,
        `和你聊${topic}，思维碰撞的火花`
      ]
    };
    
    const occupation = character?.occupation || '学生';
    const personality = character?.personality || '温柔体贴';
    const templateList = templates[occupation as keyof typeof templates] || templates['学生'];
    
    let description = templateList[Math.floor(Math.random() * templateList.length)];
    
    // 根据性格调整语气
    if (personality.includes('活泼')) {
      description = description.replace('感觉', '超开心');
    } else if (personality.includes('温柔')) {
      description = description.replace('感觉', '温柔地');
    }
    
    return description;
  }

  // 个性化朋友圈描述
  private personalizeMomentsDescription(content: string, character: any): string {
    const personality = character?.personality || '温柔体贴';
    const location = character?.location || '上海';
    
    const templates = [
      `在${location}分享了自己的心情：${content.substring(0, 30)}...`,
      `发了朋友圈，记录了${content.substring(0, 20)}...的瞬间`,
      `更新了动态，分享了${content.substring(0, 25)}...`
    ];
    
    let description = templates[Math.floor(Math.random() * templates.length)];
    
    // 根据性格调整
    if (personality.includes('文艺')) {
      description = description.replace('分享', '诗意地记录');
    } else if (personality.includes('活泼')) {
      description = description.replace('分享', '开心地分享');
    }
    
    return description;
  }

  // 个性化子聊天描述
  private personalizeSubChatDescription(topic: string, subChat: any, character: any): string {
    const personality = character?.personality || '温柔体贴';
    const messageCount = subChat.messageCount;
    
    const templates = [
      `在私密空间和你深入讨论${topic}，交流了${messageCount}条消息`,
      `和你单独聊${topic}，${messageCount}条消息的深度交流`,
      `在专属空间讨论${topic}，聊得很投入`
    ];
    
    let description = templates[Math.floor(Math.random() * templates.length)];
    
    // 根据性格调整
    if (personality.includes('认真')) {
      description = description.replace('深入', '认真地深入');
    } else if (personality.includes('温柔')) {
      description = description.replace('深入', '温柔地深入');
    }
    
    return description;
  }

  // 个性化状态描述
  private personalizeStatusDescription(activity: string, character: any): string {
    const personality = character?.personality || '温柔体贴';
    const occupation = character?.occupation || '学生';
    
    // 如果活动描述已经比较个性化，直接使用
    if (activity.length > 10) {
      return activity;
    }
    
    // 根据职业和性格生成个性化描述
    const templates = {
      '学生': [
        '在认真学习中',
        '处理学业事务',
        '在图书馆学习'
      ],
      '上班族': [
        '在专注工作中',
        '处理工作事务',
        '在办公室忙碌'
      ],
      '自由职业者': [
        '在创作中',
        '处理项目事务',
        '在工作室忙碌'
      ]
    };
    
    const templateList = templates[occupation as keyof typeof templates] || templates['学生'];
    let description = templateList[Math.floor(Math.random() * templateList.length)];
    
    // 根据性格调整
    if (personality.includes('活泼')) {
      description = description.replace('中', '中，心情愉快');
    } else if (personality.includes('温柔')) {
      description = description.replace('中', '中，很安静');
    }
    
    return description;
  }

  // 个性化睡眠描述
  private personalizeSleepDescription(character: any): string {
    const personality = character?.personality || '温柔体贴';
    const templates = [
      '已经进入梦乡了',
      '正在休息中',
      '安静地睡着了',
      '进入了深度睡眠'
    ];
    
    let description = templates[Math.floor(Math.random() * templates.length)];
    
    // 根据性格调整
    if (personality.includes('活泼')) {
      description = description.replace('安静地', '开心地');
    } else if (personality.includes('文艺')) {
      description = description.replace('睡眠', '甜美的梦乡');
    }
    
    return description;
  }

  // === 数据处理辅助方法 ===
  
  // 将消息分组为聊天段落
  private groupMessagesIntoSessions(messages: Message[]): Array<{startTime: number, endTime: number, messages: Message[]}> {
    const sessions: Array<{startTime: number, endTime: number, messages: Message[]}> = [];
    let currentSession: Message[] = [];
    
    messages.forEach((message, index) => {
      currentSession.push(message);
      
      // 判断是否结束当前段落（超过30分钟无消息，或最后一条消息）
      const isLastMessage = index === messages.length - 1;
      const nextMessage = messages[index + 1];
      const gapTooLong = nextMessage && (nextMessage.timestamp - message.timestamp) > (30 * 60 * 1000);
      
      if (isLastMessage || gapTooLong) {
        sessions.push({
          startTime: currentSession[0].timestamp,
          endTime: currentSession[currentSession.length - 1].timestamp,
          messages: currentSession
        });
        currentSession = [];
      }
    });
    
    return sessions;
  }
  
  // 提取聊天话题
  private extractChatTopic(messages: Message[]): string {
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) return '日常对话';
    
    // 简单的关键词提取
    const allText = userMessages.map(m => m.content).join(' ');
    const keywords = {
      '工作': ['工作', '上班', '公司', '项目', '任务'],
      '学习': ['学习', '课程', '考试', '作业', '学校'],
      '生活': ['生活', '日常', '吃饭', '休息', '睡觉'],
      '心情': ['心情', '情绪', '开心', '难过', '生气'],
      '娱乐': ['游戏', '电影', '音乐', '小说', '娱乐'],
      '关系': ['朋友', '家人', '恋爱', '关系', '感情']
    };
    
    for (const [topic, words] of Object.entries(keywords)) {
      if (words.some(word => allText.includes(word))) {
        return topic;
      }
    }
    
    return '日常对话';
  }
  
  // 提取子聊天话题
  private extractSubChatTopic(subChatName: string, messageCount: number): string {
    // 如果子聊天名称已经包含话题信息，直接使用
    if (subChatName && subChatName.length > 0) {
      return subChatName;
    }
    
    // 根据消息数量推断话题深度
    if (messageCount > 20) {
      return '深度话题讨论';
    } else if (messageCount > 10) {
      return '话题交流';
    } else {
      return '简短交流';
    }
  }
  
  // 辅助方法：推断活动类型
  private inferActivityType(activity: string): ActivityType {
    const keywords = {
      'chatting': ['聊天', '对话', '交流', '讨论'],
      'working': ['工作', '学习', '忙碌', '处理', '专注'],
      'entertainment': ['放松', '休息', '娱乐', '游戏', '开心'],
      'reading': ['阅读', '看书', '学习', '书籍'],
      'thinking': ['思考', '想', '考虑', '构思'],
      'sleeping': ['睡觉', '休息', '睡眠', '梦乡'],
      'social': ['分享', '朋友圈', '社交', '动态'],
      'exercise': ['运动', '锻炼', '健身', '跑步']
    };

    for (const [type, words] of Object.entries(keywords)) {
      if (words.some(word => activity.includes(word))) {
        return type as ActivityType;
      }
    }

    return 'thinking'; // 默认
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
