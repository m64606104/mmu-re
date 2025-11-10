import { AIStatus, AIStatusInfo, AIActivityLog, Conversation, ApiConfig } from '../types';
import { generateCurrentActivity, generateActivityWithAI } from './lifeSimulation';

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
export const getAIStatus = async (conversationId: string, apiConfig?: ApiConfig): Promise<AIStatusInfo | null> => {
  try {
    const key = `ai_status_${conversationId}`;
    const data = localStorage.getItem(key);
    if (data) {
      const status = JSON.parse(data) as AIStatusInfo;
      
      // 🚀 性能优化：智能生活模拟改为更低频率
      const now = Date.now();
      const lastUpdate = status.lastUpdateTime || 0;
      const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
      
      // 🔥 修复：检查活动日志，如果最近有活动记录，不重新生成
      // 只有当距离最近一条活动超过3小时，或者活动日志为空时，才生成新活动
      const hasRecentActivity = status.activityLogs && status.activityLogs.length > 0 && 
        (now - status.activityLogs[0].timestamp) < 3 * 60 * 60 * 1000;
      
      // 如果距离上次更新超过3小时且没有近期活动，才生成新活动（降低频率）
      if (hoursSinceUpdate > 3 && !hasRecentActivity) {
        const conversationsData = localStorage.getItem('conversations');
        if (conversationsData) {
          const conversations = JSON.parse(conversationsData) as Conversation[];
          const conversation = conversations.find(c => c.id === conversationId);
          
          if (conversation) {
            // 🤖 优先使用AI生成（如果提供了apiConfig）
            let newActivity = null;
            if (apiConfig) {
              console.log('🤖 尝试使用AI生成活动...');
              newActivity = await generateActivityWithAI(conversation, apiConfig);
            }
            
            // 降级：如果AI生成失败，使用模板匹配
            if (!newActivity) {
              console.log('📋 使用模板生成活动（降级模式）');
              newActivity = generateCurrentActivity(conversation);
            }
            
            if (newActivity) {
              // 转换为AIActivityLog格式
              const aiActivity: AIActivityLog = {
                id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: newActivity.timestamp,
                activity: newActivity.activity,
                summary: newActivity.summary,
                location: newActivity.location,
                status: getStatusFromActivity(newActivity.status)
              };
              
              // 添加到活动日志
              status.activityLogs = status.activityLogs || [];
              status.activityLogs.push(aiActivity);
              
              // 更新当前活动和摘要
              status.currentActivity = newActivity.activity;
              status.currentActivitySummary = newActivity.summary;
              status.lastUpdateTime = now;
              
              // 保存更新
              localStorage.setItem(key, JSON.stringify(status));
              
              console.log(`✅ 成功生成活动: ${newActivity.activity}`);
            }
          }
        }
      }
      
      return status;
    }
    return null;
  } catch (error) {
    console.error('Failed to get AI status:', error);
    return null;
  }
};

// 辅助函数：从活动状态转换为AIStatus
const getStatusFromActivity = (activityStatus: string): AIStatus => {
  const statusMap: Record<string, AIStatus> = {
    '吃饭中': 'busy',
    '工作中': 'busy',
    '娱乐中': 'online',
    '社交中': 'online',
    '休息中': 'resting',
    '外出中': 'busy',
    '忙碌中': 'busy'
  };
  return statusMap[activityStatus] || 'online';
};

/**
 * 更新AI状态
 */
export const updateAIStatus = async (
  conversationId: string,
  status: AIStatus,
  activity: string,
  location?: string
): Promise<void> => {
  try {
    const currentStatus = await getAIStatus(conversationId);
    const initialStatus = currentStatus || {
      status: 'online',
      statusText: STATUS_MAP.online,
      activityLogs: [],
      lastUpdateTime: Date.now()
    };
    
    const now = Date.now();
    
    // 🔥 修复bug：检查最近的活动时间，防止短时间内重复生成
    if (initialStatus.activityLogs && initialStatus.activityLogs.length > 0) {
      const lastLog = initialStatus.activityLogs[0];
      const timeSinceLastLog = now - lastLog.timestamp;
      
      // 如果距离上次活动不到10分钟，不添加新活动
      if (timeSinceLastLog < 10 * 60 * 1000) {
        console.log(`⏸️ 跳过活动生成：距离上次活动仅${Math.floor(timeSinceLastLog / 1000 / 60)}分钟`);
        return;
      }
    }
    
    // 更新状态
    const updatedStatus: AIStatusInfo = {
      ...initialStatus,
      status,
      statusText: STATUS_MAP[status],
      currentActivity: activity,
      lastUpdateTime: now
    };
    
    // 添加新的活动日志
    const newLog: AIActivityLog = {
      id: `activity_${now}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: now,
      activity,
      location,
      status
    };
    
    updatedStatus.activityLogs.unshift(newLog);
    
    // 保留最近100条
    if (updatedStatus.activityLogs.length > 100) {
      updatedStatus.activityLogs = updatedStatus.activityLogs.slice(0, 100);
    }
    
    const key = `ai_status_${conversationId}`;
    localStorage.setItem(key, JSON.stringify(updatedStatus));
    
    console.log(`✅ AI状态已更新: ${conversationId} -> ${STATUS_MAP[status]}`);
  } catch (error) {
    console.error('Failed to update AI status:', error);
  }
};

/**
 * 添加行为轨迹（不改变状态）
 */
export const addActivityLog = async (
  conversationId: string,
  activity: string,
  location?: string,
  summary?: string
): Promise<void> => {
  try {
    const currentStatus = await getAIStatus(conversationId);
    if (!currentStatus) return;
    
    // 如果没有提供摘要，从activity中截取前8个字符
    const activitySummary = summary || (activity.length > 8 ? activity.substring(0, 8) : activity);
    
    const newLog: AIActivityLog = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      activity,
      summary: activitySummary,
      location,
      status: currentStatus.status
    };
    
    // 添加新的活动日志
    currentStatus.activityLogs.unshift(newLog);
    
    // 🚀 性能优化：移除实时补充活动的逻辑
    // 补充活动会在用户主动查看轨迹时进行，不在这里实时处理
    // 这样可以避免每次添加轨迹都进行复杂的计算
    
    // 保留最近100条
    if (currentStatus.activityLogs.length > 100) {
      currentStatus.activityLogs = currentStatus.activityLogs.slice(0, 100);
    }
    
    // 更新当前活动和摘要
    currentStatus.currentActivity = activity;
    currentStatus.currentActivitySummary = activitySummary;
    currentStatus.lastUpdateTime = Date.now();
    
    const key = `ai_status_${conversationId}`;
    localStorage.setItem(key, JSON.stringify(currentStatus));
    
    console.log(`添加行为轨迹: ${activitySummary} - ${activity}`);
  } catch (error) {
    console.error('Failed to add activity log:', error);
  }
};

/**
 * 延迟更新状态（模拟路程时间等）
 */
export const scheduleStatusUpdate = (
  conversationId: string,
  status: AIStatus,
  activity: string,
  delayMinutes: number,
  location?: string
): void => {
  const delayMs = delayMinutes * 60 * 1000;
  
  setTimeout(() => {
    updateAIStatus(conversationId, status, activity, location);
  }, delayMs);
  
  console.log(`⏰ 已安排状态更新: ${delayMinutes}分钟后变为${STATUS_MAP[status]}`);
};

// 🗑️ 已移除旧的死板关键词匹配函数：
// - analyzeMessageAndUpdateStatus
// - analyzeAndUpdateStatusFromAI
// 
// 现在使用更智能的AI统一行为管理系统：
// - src/utils/aiUnifiedBehaviorManager.ts
// - 使用AI自己理解上下文，而非规则匹配
// - 支持聊天/朋友圈/论坛等所有功能的统一联动
