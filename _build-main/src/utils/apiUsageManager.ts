/**
 * API使用量管理器
 * 监控和限制API调用量，防止过度消耗
 */

import { getCachedData, save, setCachedData } from './storage';

export interface ApiUsageStats {
  hourly: number;        // 当前小时调用量
  daily: number;         // 今日调用量
  lastResetTime: number; // 上次重置时间
  currentHour: number;   // 当前小时
}

export interface ApiUsageLimits {
  maxPerHour: number;    // 每小时最大调用量
  maxPerDay: number;     // 每日最大调用量
  energySavingMode: boolean; // 节能模式
}

class ApiUsageManager {
  private static instance: ApiUsageManager;
  private readonly STORAGE_KEY = 'api_usage_stats';
  private readonly LIMITS_KEY = 'api_usage_limits';
  
  private stats: ApiUsageStats;
  private limits: ApiUsageLimits;
  
  private constructor() {
    this.stats = this.loadStats();
    this.limits = this.loadLimits();
    this.checkAndResetCounters();
  }
  
  public static getInstance(): ApiUsageManager {
    if (!ApiUsageManager.instance) {
      ApiUsageManager.instance = new ApiUsageManager();
    }
    return ApiUsageManager.instance;
  }
  
  /**
   * 加载使用统计
   */
  private loadStats(): ApiUsageStats {
    try {
      const stored = getCachedData<ApiUsageStats>(this.STORAGE_KEY);
      if (stored && typeof stored === 'object') return stored;
    } catch (error) {
      console.error('Failed to load API usage stats:', error);
    }
    
    return {
      hourly: 0,
      daily: 0,
      lastResetTime: Date.now(),
      currentHour: new Date().getHours()
    };
  }
  
  /**
   * 加载使用限制
   */
  private loadLimits(): ApiUsageLimits {
    try {
      const stored = getCachedData<ApiUsageLimits>(this.LIMITS_KEY);
      if (stored && typeof stored === 'object') return stored;
    } catch (error) {
      console.error('Failed to load API usage limits:', error);
    }
    
    return {
      maxPerHour: 50,          // 默认每小时50次
      maxPerDay: 500,          // 默认每日500次
      energySavingMode: false  // 默认关闭节能模式
    };
  }
  
  /**
   * 保存统计数据
   */
  private saveStats(): void {
    try {
      setCachedData(this.STORAGE_KEY, this.stats);
      void save(this.STORAGE_KEY, this.stats);
    } catch (error) {
      console.error('Failed to save API usage stats:', error);
    }
  }
  
  /**
   * 保存限制配置
   */
  private saveLimits(): void {
    try {
      setCachedData(this.LIMITS_KEY, this.limits);
      void save(this.LIMITS_KEY, this.limits);
    } catch (error) {
      console.error('Failed to save API usage limits:', error);
    }
  }
  
  /**
   * 检查并重置计数器
   */
  private checkAndResetCounters(): void {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.toDateString();
    const lastDay = new Date(this.stats.lastResetTime).toDateString();
    
    // 重置小时计数器
    if (this.stats.currentHour !== currentHour) {
      console.log(`🔄 API计数器：小时重置 (${this.stats.hourly} -> 0)`);
      this.stats.hourly = 0;
      this.stats.currentHour = currentHour;
      this.saveStats();
    }
    
    // 重置日计数器
    if (currentDay !== lastDay) {
      console.log(`🔄 API计数器：日期重置 (${this.stats.daily} -> 0)`);
      this.stats.daily = 0;
      this.stats.lastResetTime = Date.now();
      this.saveStats();
    }
  }
  
  /**
   * 记录API调用
   */
  public recordApiCall(_tokens?: number): void {
    this.checkAndResetCounters();
    
    this.stats.hourly++;
    this.stats.daily++;
    
    this.saveStats();
    
    console.log(`📊 API调用统计: 小时 ${this.stats.hourly}/${this.limits.maxPerHour}, 今日 ${this.stats.daily}/${this.limits.maxPerDay}`);
    
    // 警告机制
    const hourlyPercent = (this.stats.hourly / this.limits.maxPerHour) * 100;
    const dailyPercent = (this.stats.daily / this.limits.maxPerDay) * 100;
    
    if (hourlyPercent >= 80) {
      console.warn(`⚠️ 小时API使用量达到 ${hourlyPercent.toFixed(1)}%`);
    }
    
    if (dailyPercent >= 80) {
      console.warn(`⚠️ 日API使用量达到 ${dailyPercent.toFixed(1)}%`);
    }
  }
  
  /**
   * 检查是否可以进行API调用
   */
  public canMakeApiCall(priority: 'high' | 'medium' | 'low' = 'medium'): {
    allowed: boolean;
    reason?: string;
    suggestion?: string;
  } {
    this.checkAndResetCounters();
    
    // 节能模式下的限制更严格
    const effectiveLimits = this.limits.energySavingMode ? {
      maxPerHour: Math.floor(this.limits.maxPerHour * 0.5),
      maxPerDay: Math.floor(this.limits.maxPerDay * 0.7)
    } : this.limits;
    
    // 检查小时限制
    if (this.stats.hourly >= effectiveLimits.maxPerHour) {
      return {
        allowed: false,
        reason: `小时API调用限制已达上限 (${this.stats.hourly}/${effectiveLimits.maxPerHour})`,
        suggestion: '请等待下个小时或降低后台任务频率'
      };
    }
    
    // 检查日限制
    if (this.stats.daily >= effectiveLimits.maxPerDay) {
      return {
        allowed: false,
        reason: `日API调用限制已达上限 (${this.stats.daily}/${effectiveLimits.maxPerDay})`,
        suggestion: '今日API配额已用完，请明天再试'
      };
    }
    
    // 根据优先级和当前使用率决定
    const hourlyUsagePercent = (this.stats.hourly / effectiveLimits.maxPerHour) * 100;
    
    // 高优先级任务总是允许（除非达到硬限制）
    if (priority === 'high') {
      return { allowed: true };
    }
    
    // 中优先级：使用率超过70%时拒绝
    if (priority === 'medium' && hourlyUsagePercent > 70) {
      return {
        allowed: false,
        reason: `小时API使用率过高 (${hourlyUsagePercent.toFixed(1)}%)，暂停中优先级任务`,
        suggestion: '请稍后重试或提高任务优先级'
      };
    }
    
    // 低优先级：使用率超过50%时拒绝
    if (priority === 'low' && hourlyUsagePercent > 50) {
      return {
        allowed: false,
        reason: `小时API使用率过高 (${hourlyUsagePercent.toFixed(1)}%)，暂停低优先级任务`,
        suggestion: '请稍后重试'
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * 获取当前统计信息
   */
  public getStats(): ApiUsageStats & ApiUsageLimits {
    this.checkAndResetCounters();
    return { ...this.stats, ...this.limits };
  }
  
  /**
   * 设置API使用限制
   */
  public setLimits(limits: Partial<ApiUsageLimits>): void {
    this.limits = { ...this.limits, ...limits };
    this.saveLimits();
    
    console.log('📝 API使用限制已更新:', this.limits);
  }
  
  /**
   * 切换节能模式
   */
  public toggleEnergySavingMode(): boolean {
    this.limits.energySavingMode = !this.limits.energySavingMode;
    this.saveLimits();
    
    console.log(`🔋 节能模式${this.limits.energySavingMode ? '已开启' : '已关闭'}`);
    return this.limits.energySavingMode;
  }
  
  /**
   * 获取使用率警告信息
   */
  public getUsageWarnings(): string[] {
    this.checkAndResetCounters();
    const warnings: string[] = [];
    
    const hourlyPercent = (this.stats.hourly / this.limits.maxPerHour) * 100;
    const dailyPercent = (this.stats.daily / this.limits.maxPerDay) * 100;
    
    if (hourlyPercent >= 90) {
      warnings.push(`⚠️ 小时API使用量接近上限 (${hourlyPercent.toFixed(1)}%)`);
    } else if (hourlyPercent >= 70) {
      warnings.push(`⚠️ 小时API使用量较高 (${hourlyPercent.toFixed(1)}%)`);
    }
    
    if (dailyPercent >= 90) {
      warnings.push(`⚠️ 日API使用量接近上限 (${dailyPercent.toFixed(1)}%)`);
    } else if (dailyPercent >= 70) {
      warnings.push(`⚠️ 日API使用量较高 (${dailyPercent.toFixed(1)}%)`);
    }
    
    return warnings;
  }
}

// 导出单例实例
export const apiUsageManager = ApiUsageManager.getInstance();

// 便捷方法
export const recordApiCall = (tokens?: number) => apiUsageManager.recordApiCall(tokens);
export const canMakeApiCall = (priority?: 'high' | 'medium' | 'low') => apiUsageManager.canMakeApiCall(priority);
export const getApiStats = () => apiUsageManager.getStats();
export const setApiLimits = (limits: Partial<ApiUsageLimits>) => apiUsageManager.setLimits(limits);
export const toggleEnergySavingMode = () => apiUsageManager.toggleEnergySavingMode();
