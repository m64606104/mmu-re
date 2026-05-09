import { AIStatus, AIStatusInfo } from '../types';
import { getCachedData, save, setCachedData, smartLoad } from './storage';

/**
 * 状态映射
 */
const STATUS_MAP: Record<AIStatus, string> = {
  online: '在线',
  offline: '离线',
  busy: '忙碌',
  resting: '休息中',
  away: '离开'
};

/**
 * 获取AI状态信息
 * 支持传入apiConfig来使用AI生成模式
 */
export const getAIStatus = async (conversationId: string): Promise<AIStatusInfo | null> => {
  try {
    const key = `ai_status_${conversationId}`;
    const cached = getCachedData<AIStatusInfo>(key);
    if (cached && typeof cached === 'object') return cached;
    const stored = await smartLoad(key);
    if (stored && typeof stored === 'object') {
      setCachedData(key, stored);
      return stored as AIStatusInfo;
    }
    
    return {
      status: 'online' as AIStatus,
      statusText: '在线',
      lastUpdateTime: Date.now()
    };
  } catch (error) {
    console.error('获取AI状态失败:', error);
    return null;
  }
};

/**
 * 更新AI状态
 */
export const updateAIStatus = (conversationId: string, status: AIStatus, activity?: string) => {
  const key = `ai_status_${conversationId}`;
  const statusInfo: AIStatusInfo = {
    status,
    statusText: STATUS_MAP[status] || '未知',
    lastUpdateTime: Date.now()
  };
  
  if (activity) {
    statusInfo.currentActivity = activity;
  }
  
  setCachedData(key, statusInfo);
  void save(key, statusInfo);
};

/**
 * 延迟更新状态（模拟路程时间等）
 */
export const scheduleStatusUpdate = (
  conversationId: string,
  status: AIStatus,
  activity: string,
  delayMinutes: number
): void => {
  const delayMs = delayMinutes * 60 * 1000;
  
  setTimeout(() => {
    updateAIStatus(conversationId, status, activity);
  }, delayMs);
  
  console.log(`⏰ 已安排状态更新: ${delayMinutes}分钟后变为${STATUS_MAP[status]}`);
};

// 🗑️ 已移除旧的死板关键词匹配函数：
// - analyzeMessageAndUpdateStatus
// - analyzeAndUpdateStatusFromAI
// 
// AI状态管理现在使用简化的本地存储机制
