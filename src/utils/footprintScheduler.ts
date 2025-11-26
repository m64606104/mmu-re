// 🕐 轨迹自动刷新调度器
// 后台长期运行，根据用户设置的频率自动为各个对话生成轨迹

import { generateFootprintIncremental } from './footprintGenerator_new';

interface RefreshConfig {
  conversationId: string;
  intervalMinutes: number; // 0表示手动，30/60/120表示自动间隔
  lastRefreshTime: number;
}

class FootprintSchedulerService {
  private configs: Map<string, RefreshConfig> = new Map();
  private schedulerTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  // 启动调度器
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🕐 轨迹自动刷新调度器已启动');
    
    // 每5分钟检查一次是否有需要刷新的对话
    this.schedulerTimer = setInterval(() => {
      this.checkAndRefreshAll();
    }, 5 * 60 * 1000);
  }

  // 停止调度器
  stop() {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    this.isRunning = false;
    console.log('🛑 轨迹自动刷新调度器已停止');
  }

  // 更新对话的刷新配置
  updateConfig(conversationId: string, mode: 'manual' | '30' | '60' | '120') {
    const intervalMinutes = mode === 'manual' ? 0 : parseInt(mode);
    
    const config: RefreshConfig = {
      conversationId,
      intervalMinutes,
      lastRefreshTime: Date.now()
    };
    
    this.configs.set(conversationId, config);
    
    // 保存到localStorage以便重启后恢复
    this.saveConfigsToStorage();
    
    console.log(`🔄 更新轨迹刷新配置: ${conversationId} -> ${mode}`);
  }

  // 移除对话的刷新配置
  removeConfig(conversationId: string) {
    this.configs.delete(conversationId);
    this.saveConfigsToStorage();
    console.log(`🗑️ 移除轨迹刷新配置: ${conversationId}`);
  }

  // 检查并刷新所有需要的对话
  private async checkAndRefreshAll() {
    const now = Date.now();
    const refreshPromises: Promise<void>[] = [];

    for (const config of this.configs.values()) {
      if (config.intervalMinutes === 0) continue; // 手动模式跳过

      const timeSinceLastRefresh = now - config.lastRefreshTime;
      const intervalMs = config.intervalMinutes * 60 * 1000;

      if (timeSinceLastRefresh >= intervalMs) {
        refreshPromises.push(this.refreshConversation(config));
      }
    }

    if (refreshPromises.length > 0) {
      console.log(`🔄 自动刷新 ${refreshPromises.length} 个对话的轨迹`);
      await Promise.allSettled(refreshPromises);
    }
  }

  // 刷新单个对话
  private async refreshConversation(config: RefreshConfig) {
    try {
      console.log(`🛤️ 自动刷新轨迹: ${config.conversationId}`);
      
      await generateFootprintIncremental(config.conversationId);
      
      // 更新最后刷新时间
      config.lastRefreshTime = Date.now();
      this.configs.set(config.conversationId, config);
      this.saveConfigsToStorage();
      
    } catch (error) {
      console.error(`❌ 自动刷新轨迹失败 (${config.conversationId}):`, error);
    }
  }

  // 保存配置到localStorage
  private saveConfigsToStorage() {
    try {
      const configsArray = Array.from(this.configs.values());
      localStorage.setItem('footprint_scheduler_configs', JSON.stringify(configsArray));
    } catch (error) {
      console.error('保存轨迹调度配置失败:', error);
    }
  }

  // 从localStorage加载配置
  loadConfigsFromStorage() {
    try {
      const saved = localStorage.getItem('footprint_scheduler_configs');
      if (!saved) return;

      const configsArray: RefreshConfig[] = JSON.parse(saved);
      
      for (const config of configsArray) {
        this.configs.set(config.conversationId, config);
      }

      console.log(`📥 加载了 ${configsArray.length} 个轨迹调度配置`);
    } catch (error) {
      console.error('加载轨迹调度配置失败:', error);
    }
  }

  // 手动触发指定对话的刷新
  async manualRefresh(conversationId: string) {
    const config = this.configs.get(conversationId);
    if (config) {
      await this.refreshConversation(config);
    } else {
      // 如果没有配置，创建临时配置进行刷新
      const tempConfig: RefreshConfig = {
        conversationId,
        intervalMinutes: 0,
        lastRefreshTime: Date.now()
      };
      await this.refreshConversation(tempConfig);
    }
  }

  // 获取配置状态（用于调试）
  getStatus() {
    return {
      isRunning: this.isRunning,
      configsCount: this.configs.size,
      configs: Array.from(this.configs.values())
    };
  }
}

// 单例实例
export const footprintScheduler = new FootprintSchedulerService();

// 初始化调度器（在应用启动时调用）
export const initializeFootprintScheduler = () => {
  footprintScheduler.loadConfigsFromStorage();
  footprintScheduler.start();
};
