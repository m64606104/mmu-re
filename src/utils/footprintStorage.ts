// 🗄️ 人物行动轨迹存储服务
// 使用 IndexedDB 存储，支持复杂查询和大量数据

import { FootprintActivity, DailyFootprint, FootprintFilters } from '../types/footprint';

// IndexedDB 数据库配置
const DB_NAME = 'CharacterFootprintsDB';
const DB_VERSION = 2;
const ACTIVITIES_STORE = 'footprint_activities';
const DAILY_STORE = 'daily_footprints';

class FootprintStorageService {
  private db: IDBDatabase | null = null;

  // 初始化数据库
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const txn = (event.target as IDBOpenDBRequest).transaction as IDBTransaction;

        // 活动明细表
        let activitiesStore: IDBObjectStore;
        if (!db.objectStoreNames.contains(ACTIVITIES_STORE)) {
          activitiesStore = db.createObjectStore(ACTIVITIES_STORE, { keyPath: 'id' });
        } else {
          activitiesStore = txn.objectStore(ACTIVITIES_STORE);
        }
        // 旧索引（兼容）
        if (!(activitiesStore.indexNames as any).contains('conversationId')) {
          activitiesStore.createIndex('conversationId', 'conversationId');
        }
        if (!(activitiesStore.indexNames as any).contains('date')) {
          activitiesStore.createIndex('date', ['conversationId', 'timestamp']);
        }
        // 新索引（推荐）
        if (!(activitiesStore.indexNames as any).contains('characterId')) {
          activitiesStore.createIndex('characterId', 'characterId');
        }
        if (!(activitiesStore.indexNames as any).contains('characterDate')) {
          activitiesStore.createIndex('characterDate', ['characterId', 'timestamp']);
        }
        if (!(activitiesStore.indexNames as any).contains('timestamp')) {
          activitiesStore.createIndex('timestamp', 'timestamp');
        }
        if (!(activitiesStore.indexNames as any).contains('activityType')) {
          activitiesStore.createIndex('activityType', 'activityType');
        }
        if (!(activitiesStore.indexNames as any).contains('source')) {
          activitiesStore.createIndex('source', 'source');
        }

        // 每日汇总表
        let dailyStore: IDBObjectStore;
        if (!db.objectStoreNames.contains(DAILY_STORE)) {
          dailyStore = db.createObjectStore(DAILY_STORE, { keyPath: 'id' });
        } else {
          dailyStore = txn.objectStore(DAILY_STORE);
        }
        // 旧索引（兼容）
        if (!(dailyStore.indexNames as any).contains('conversationId')) {
          dailyStore.createIndex('conversationId', 'conversationId');
        }
        if (!(dailyStore.indexNames as any).contains('conversationDate')) {
          dailyStore.createIndex('conversationDate', ['conversationId', 'date']);
        }
        if (!(dailyStore.indexNames as any).contains('date')) {
          dailyStore.createIndex('date', 'date');
        }
        // 新索引（推荐）
        if (!(dailyStore.indexNames as any).contains('characterId')) {
          dailyStore.createIndex('characterId', 'characterId');
        }
        if (!(dailyStore.indexNames as any).contains('characterDate')) {
          dailyStore.createIndex('characterDate', ['characterId', 'date']);
        }
      };
    });
  }

  // 保存活动记录
  async saveActivity(activity: FootprintActivity): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([ACTIVITIES_STORE], 'readwrite');
      const store = transaction.objectStore(ACTIVITIES_STORE);
      
      const request = store.put(activity);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // 批量保存活动记录
  async saveActivities(activities: FootprintActivity[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([ACTIVITIES_STORE], 'readwrite');
      const store = transaction.objectStore(ACTIVITIES_STORE);
      
      let completed = 0;
      
      for (const activity of activities) {
        const request = store.put(activity);
        request.onsuccess = () => {
          completed++;
          if (completed === activities.length) resolve();
        };
        request.onerror = () => reject(request.error);
      }
    });
  }

  // 获取指定对话的活动记录
  async getActivities(
    conversationId: string, 
    filters?: FootprintFilters
  ): Promise<FootprintActivity[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([ACTIVITIES_STORE], 'readonly');
      const store = transaction.objectStore(ACTIVITIES_STORE);
      // 优先使用 characterId 索引，兼容旧版 conversationId
      const indexName = (store.indexNames as any).contains('characterId') ? 'characterId' : 'conversationId';
      const index = store.index(indexName);
      const request = index.getAll(conversationId);

      request.onsuccess = () => {
        let results = request.result || [];
        const tryFallback = indexName === 'characterId' && (store.indexNames as any).contains('conversationId') && results.length === 0;
        if (tryFallback) {
          const fallbackIndex = store.index('conversationId');
          const fbReq = fallbackIndex.getAll(conversationId);
          fbReq.onsuccess = () => {
            results = fbReq.result || [];
            if (filters) results = this.applyFilters(results, filters);
            results.sort((a, b) => b.timestamp - a.timestamp);
            resolve(results);
          };
          fbReq.onerror = () => reject(fbReq.error);
          return;
        }

        if (filters) results = this.applyFilters(results, filters);
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // 获取指定日期范围的活动
  async getActivitiesByDateRange(
    conversationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<FootprintActivity[]> {
    const activities = await this.getActivities(conversationId);
    
    return activities.filter(activity => {
      const activityDate = new Date(activity.timestamp);
      return activityDate >= startDate && activityDate <= endDate;
    });
  }

  // 保存每日汇总
  async saveDailyFootprint(daily: DailyFootprint): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DAILY_STORE], 'readwrite');
      const store = transaction.objectStore(DAILY_STORE);
      
      const request = store.put(daily);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // 获取每日汇总
  async getDailyFootprint(
    conversationId: string,
    date: string
  ): Promise<DailyFootprint | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DAILY_STORE], 'readonly');
      const store = transaction.objectStore(DAILY_STORE);
      // 优先使用 characterDate 索引，兼容旧版 conversationDate
      const indexName = (store.indexNames as any).contains('characterDate') ? 'characterDate' : 'conversationDate';
      const index = store.index(indexName);
      const request = index.get([conversationId, date]);

      request.onsuccess = () => {
        const result = request.result || null;
        const tryFallback = indexName === 'characterDate' && (store.indexNames as any).contains('conversationDate') && !result;
        if (tryFallback) {
          const fbIndex = store.index('conversationDate');
          const fbReq = fbIndex.get([conversationId, date]);
          fbReq.onsuccess = () => resolve(fbReq.result || null);
          fbReq.onerror = () => reject(fbReq.error);
          return;
        }
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // 获取最近N天的活动统计
  async getRecentStats(
    conversationId: string, 
    days: number = 7
  ): Promise<{
    activities: FootprintActivity[];
    dailySummaries: DailyFootprint[];
  }> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await this.getActivitiesByDateRange(
      conversationId, 
      startDate, 
      endDate
    );

    // 获取这段时间的每日汇总
    const dailySummaries: DailyFootprint[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const daily = await this.getDailyFootprint(conversationId, dateStr);
      if (daily) {
        dailySummaries.push(daily);
      }
    }

    return { activities, dailySummaries };
  }

  // 应用筛选条件
  private applyFilters(
    activities: FootprintActivity[], 
    filters: FootprintFilters
  ): FootprintActivity[] {
    return activities.filter(activity => {
      // 日期范围筛选
      if (filters.dateRange) {
        const activityDate = new Date(activity.timestamp).toISOString().split('T')[0];
        if (activityDate < filters.dateRange.start || activityDate > filters.dateRange.end) {
          return false;
        }
      }

      // 活动类型筛选
      if (filters.activityTypes && !filters.activityTypes.includes(activity.activityType)) {
        return false;
      }

      // 来源筛选
      if (filters.sources && !filters.sources.includes(activity.source)) {
        return false;
      }

      // 置信度筛选
      if (filters.minConfidence && activity.confidence < filters.minConfidence) {
        return false;
      }

      // 标签筛选
      if (filters.tags && filters.tags.length > 0) {
        if (!activity.tags || !filters.tags.some(tag => activity.tags!.includes(tag))) {
          return false;
        }
      }

      return true;
    });
  }

  // 清理过期数据
  async cleanupOldData(daysToKeep: number = 90): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([ACTIVITIES_STORE], 'readwrite');
      const store = transaction.objectStore(ACTIVITIES_STORE);
      const index = store.index('timestamp');
      
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffDate));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }
}

// 单例实例
export const footprintStorage = new FootprintStorageService();

// 初始化存储服务
export const initFootprintStorage = async (): Promise<void> => {
  try {
    await footprintStorage.init();
    console.log('✅ 轨迹存储服务初始化成功');
  } catch (error) {
    console.error('❌ 轨迹存储服务初始化失败:', error);
    throw error;
  }
};
