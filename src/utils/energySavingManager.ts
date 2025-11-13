/**
 * 节能模式管理器
 * 统一控制所有后台任务的频率和强度
 */

import { apiUsageManager } from './apiUsageManager';

export interface EnergySavingConfig {
  enabled: boolean;                    // 是否启用节能模式
  level: 'light' | 'medium' | 'deep'; // 节能级别
  customSettings: {
    momentsInteractionMultiplier: number; // 朋友圈互动频率倍数
    proactiveMessagingMultiplier: number; // 主动消息频率倍数
    activityGenerationMultiplier: number; // 活动生成频率倍数
    apiLimitReduction: number;            // API限制降低百分比
  };
  autoEnableThreshold: {
    hourlyApiUsage: number; // 小时API使用量超过此值自动启用
    dailyApiUsage: number;  // 日API使用量超过此值自动启用
  };
}

class EnergySavingManager {
  private static instance: EnergySavingManager;
  private readonly STORAGE_KEY = 'energy_saving_config';
  private config: EnergySavingConfig;
  private listeners: Array<(config: EnergySavingConfig) => void> = [];
  
  private constructor() {
    this.config = this.loadConfig();
    this.setupAutoEnable();
  }
  
  public static getInstance(): EnergySavingManager {
    if (!EnergySavingManager.instance) {
      EnergySavingManager.instance = new EnergySavingManager();
    }
    return EnergySavingManager.instance;
  }
  
  /**
   * 加载节能配置
   */
  private loadConfig(): EnergySavingConfig {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return { ...this.getDefaultConfig(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load energy saving config:', error);
    }
    
    return this.getDefaultConfig();
  }
  
  /**
   * 获取默认配置
   */
  private getDefaultConfig(): EnergySavingConfig {
    return {
      enabled: false,
      level: 'medium',
      customSettings: {
        momentsInteractionMultiplier: 2.0,  // 2倍间隔
        proactiveMessagingMultiplier: 1.5,  // 1.5倍间隔
        activityGenerationMultiplier: 1.5,  // 1.5倍间隔
        apiLimitReduction: 50               // 限制减少50%
      },
      autoEnableThreshold: {
        hourlyApiUsage: 40,  // 每小时40次以上
        dailyApiUsage: 400   // 每日400次以上
      }
    };
  }
  
  /**
   * 保存配置
   */
  private saveConfig(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to save energy saving config:', error);
    }
  }
  
  /**
   * 设置节能模式
   */
  public setEnergySavingMode(enabled: boolean, level?: 'light' | 'medium' | 'deep'): void {
    const wasEnabled = this.config.enabled;
    this.config.enabled = enabled;
    
    if (level) {
      this.config.level = level;
      this.updateSettingsByLevel(level);
    }
    
    this.saveConfig();
    
    // 同步到API使用管理器
    apiUsageManager.setLimits({ energySavingMode: enabled });
    
    console.log(`🔋 节能模式${enabled ? '已启用' : '已关闭'}${level ? ` (${level}级别)` : ''}`);
    
    if (enabled && !wasEnabled) {
      console.log('📊 节能效果:');
      console.log(`  • 朋友圈互动间隔延长 ${this.config.customSettings.momentsInteractionMultiplier}x`);
      console.log(`  • 主动消息间隔延长 ${this.config.customSettings.proactiveMessagingMultiplier}x`);
      console.log(`  • API限制降低 ${this.config.customSettings.apiLimitReduction}%`);
    }
  }
  
  /**
   * 根据级别更新设置
   */
  private updateSettingsByLevel(level: 'light' | 'medium' | 'deep'): void {
    const settings = {
      'light': {
        momentsInteractionMultiplier: 1.5,
        proactiveMessagingMultiplier: 1.2,
        activityGenerationMultiplier: 1.3,
        apiLimitReduction: 30
      },
      'medium': {
        momentsInteractionMultiplier: 2.0,
        proactiveMessagingMultiplier: 1.5,
        activityGenerationMultiplier: 1.5,
        apiLimitReduction: 50
      },
      'deep': {
        momentsInteractionMultiplier: 3.0,
        proactiveMessagingMultiplier: 2.0,
        activityGenerationMultiplier: 2.0,
        apiLimitReduction: 70
      }
    }[level];
    
    this.config.customSettings = { ...this.config.customSettings, ...settings };
  }
  
  /**
   * 获取调整后的时间间隔
   */
  public getAdjustedInterval(baseInterval: number, type: 'moments' | 'proactive' | 'activity'): number {
    if (!this.config.enabled) {
      return baseInterval;
    }
    
    const multipliers = {
      'moments': this.config.customSettings.momentsInteractionMultiplier,
      'proactive': this.config.customSettings.proactiveMessagingMultiplier,
      'activity': this.config.customSettings.activityGenerationMultiplier
    };
    
    return Math.round(baseInterval * multipliers[type]);
  }
  
  /**
   * 获取调整后的API限制
   */
  public getAdjustedApiLimits(baseLimits: { maxPerHour: number; maxPerDay: number }): { maxPerHour: number; maxPerDay: number } {
    if (!this.config.enabled) {
      return baseLimits;
    }
    
    const reduction = this.config.customSettings.apiLimitReduction / 100;
    
    return {
      maxPerHour: Math.round(baseLimits.maxPerHour * (1 - reduction)),
      maxPerDay: Math.round(baseLimits.maxPerDay * (1 - reduction))
    };
  }
  
  /**
   * 设置自动启用阈值
   */
  public setAutoEnableThreshold(hourly: number, daily: number): void {
    this.config.autoEnableThreshold.hourlyApiUsage = hourly;
    this.config.autoEnableThreshold.dailyApiUsage = daily;
    this.saveConfig();
    
    console.log(`⚙️ 自动节能阈值已设置: 小时${hourly}次, 日${daily}次`);
  }
  
  /**
   * 设置自动启用检查
   */
  private setupAutoEnable(): void {
    // 每5分钟检查一次是否需要自动启用节能模式
    setInterval(() => {
      this.checkAutoEnable();
    }, 5 * 60 * 1000);
  }
  
  /**
   * 检查是否需要自动启用节能模式
   */
  private checkAutoEnable(): void {
    if (this.config.enabled) return; // 已经启用了
    
    const stats = apiUsageManager.getStats();
    const thresholds = this.config.autoEnableThreshold;
    
    if (stats.hourly >= thresholds.hourlyApiUsage || stats.daily >= thresholds.dailyApiUsage) {
      console.log(`🔋 API使用量超限，自动启用节能模式 (小时: ${stats.hourly}, 日: ${stats.daily})`);
      this.setEnergySavingMode(true, 'medium');
    }
  }
  
  /**
   * 获取当前配置
   */
  public getConfig(): EnergySavingConfig {
    return { ...this.config };
  }
  
  /**
   * 自定义设置
   */
  public setCustomSettings(settings: Partial<EnergySavingConfig['customSettings']>): void {
    this.config.customSettings = { ...this.config.customSettings, ...settings };
    this.saveConfig();
    
    console.log('⚙️ 节能模式自定义设置已更新:', settings);
  }
  
  /**
   * 添加配置变更监听器
   */
  public addListener(listener: (config: EnergySavingConfig) => void): void {
    this.listeners.push(listener);
  }
  
  /**
   * 移除监听器
   */
  public removeListener(listener: (config: EnergySavingConfig) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
  
  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.config);
      } catch (error) {
        console.error('节能模式监听器错误:', error);
      }
    });
  }
  
  /**
   * 获取节能效果统计
   */
  public getEnergySavingStats(): {
    enabled: boolean;
    level: string;
    estimatedApiSaving: number;
    adjustedIntervals: {
      moments: string;
      proactive: string;
      activity: string;
    };
  } {
    const baseIntervals = {
      moments: 600000,    // 10分钟
      proactive: 1800000, // 30分钟
      activity: 5400000   // 90分钟
    };
    
    return {
      enabled: this.config.enabled,
      level: this.config.level,
      estimatedApiSaving: this.config.enabled ? this.config.customSettings.apiLimitReduction : 0,
      adjustedIntervals: {
        moments: this.formatInterval(this.getAdjustedInterval(baseIntervals.moments, 'moments')),
        proactive: this.formatInterval(this.getAdjustedInterval(baseIntervals.proactive, 'proactive')),
        activity: this.formatInterval(this.getAdjustedInterval(baseIntervals.activity, 'activity'))
      }
    };
  }
  
  /**
   * 格式化时间间隔为可读字符串
   */
  private formatInterval(ms: number): string {
    const minutes = Math.round(ms / 60000);
    if (minutes < 60) {
      return `${minutes}分钟`;
    }
    const hours = Math.round(minutes / 60);
    return `${hours}小时`;
  }
}

// 导出单例和便捷方法
export const energySavingManager = EnergySavingManager.getInstance();

export const setEnergySavingMode = (enabled: boolean, level?: 'light' | 'medium' | 'deep') => 
  energySavingManager.setEnergySavingMode(enabled, level);

export const getAdjustedInterval = (baseInterval: number, type: 'moments' | 'proactive' | 'activity') =>
  energySavingManager.getAdjustedInterval(baseInterval, type);

export const getEnergySavingStats = () => energySavingManager.getEnergySavingStats();
