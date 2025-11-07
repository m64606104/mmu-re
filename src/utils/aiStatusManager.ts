import { AIStatus, AIStatusInfo, AIActivityLog } from '../types';

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
 */
export const getAIStatus = async (conversationId: string): Promise<AIStatusInfo | null> => {
  try {
    const key = `ai_status_${conversationId}`;
    const data = localStorage.getItem(key);
    if (data) {
      return JSON.parse(data);
    }
    
    // 返回默认状态
    return {
      status: 'online',
      statusText: '在线',
      activityLogs: [],
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
export const updateAIStatus = async (
  conversationId: string,
  status: AIStatus,
  activity?: string,
  location?: string
): Promise<void> => {
  try {
    const currentStatus = await getAIStatus(conversationId) || {
      status: 'online',
      statusText: '在线',
      activityLogs: [],
      lastUpdateTime: Date.now()
    };
    
    // 创建新的行为轨迹
    const newLog: AIActivityLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      activity: activity || `状态变更为${STATUS_MAP[status]}`,
      location,
      status
    };
    
    // 更新状态信息
    const updatedStatus: AIStatusInfo = {
      status,
      statusText: STATUS_MAP[status],
      currentActivity: activity,
      activityLogs: [newLog, ...currentStatus.activityLogs].slice(0, 50), // 保留最近50条
      lastUpdateTime: Date.now()
    };
    
    const key = `ai_status_${conversationId}`;
    localStorage.setItem(key, JSON.stringify(updatedStatus));
    
    console.log(`✅ AI状态已更新: ${conversationId} -> ${STATUS_MAP[status]}`);
  } catch (error) {
    console.error('更新AI状态失败:', error);
  }
};

/**
 * 添加行为轨迹（不改变状态）
 */
export const addActivityLog = async (
  conversationId: string,
  activity: string,
  location?: string
): Promise<void> => {
  try {
    const currentStatus = await getAIStatus(conversationId);
    if (!currentStatus) return;
    
    const newLog: AIActivityLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      activity,
      location,
      status: currentStatus.status
    };
    
    currentStatus.activityLogs = [newLog, ...currentStatus.activityLogs].slice(0, 50);
    currentStatus.currentActivity = activity;
    currentStatus.lastUpdateTime = Date.now();
    
    const key = `ai_status_${conversationId}`;
    localStorage.setItem(key, JSON.stringify(currentStatus));
    
    console.log(`📝 添加行为轨迹: ${activity}`);
  } catch (error) {
    console.error('添加行为轨迹失败:', error);
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

/**
 * 分析AI消息并自动更新状态
 */
export const analyzeMessageAndUpdateStatus = async (
  conversationId: string,
  message: string
): Promise<void> => {
  const lowerMsg = message.toLowerCase();
  
  // 检测关键词并更新状态
  if (lowerMsg.includes('晚安') || lowerMsg.includes('睡觉') || lowerMsg.includes('去睡了')) {
    await updateAIStatus(conversationId, 'resting', '准备休息了', '宿舍');
    // 5分钟后变为离线
    scheduleStatusUpdate(conversationId, 'offline', '已经入睡', 5, '宿舍');
  } 
  else if (lowerMsg.includes('实验室') && (lowerMsg.includes('去') || lowerMsg.includes('路上'))) {
    await addActivityLog(conversationId, '正在去实验室的路上');
    // 15分钟后变为忙碌
    scheduleStatusUpdate(conversationId, 'busy', '在实验室做实验', 15, '实验室');
  }
  else if (lowerMsg.includes('上课') || lowerMsg.includes('去上课')) {
    await addActivityLog(conversationId, '正在去教室的路上');
    // 10分钟后变为忙碌
    scheduleStatusUpdate(conversationId, 'busy', '正在上课', 10, '教室');
  }
  else if (lowerMsg.includes('开会') || lowerMsg.includes('去开会')) {
    await updateAIStatus(conversationId, 'busy', '正在开会', '会议室');
  }
  else if (lowerMsg.includes('图书馆') && (lowerMsg.includes('去') || lowerMsg.includes('路上'))) {
    await addActivityLog(conversationId, '正在去图书馆');
    // 10分钟后变为忙碌
    scheduleStatusUpdate(conversationId, 'busy', '在图书馆学习', 10, '图书馆');
  }
  else if (lowerMsg.includes('回来了') || lowerMsg.includes('回宿舍')) {
    await updateAIStatus(conversationId, 'online', '回到宿舍了', '宿舍');
  }
  else if (lowerMsg.includes('忙') && !lowerMsg.includes('不忙')) {
    await updateAIStatus(conversationId, 'busy', '有点忙');
  }
  else if (lowerMsg.includes('空了') || lowerMsg.includes('不忙了') || lowerMsg.includes('有空')) {
    await updateAIStatus(conversationId, 'online', '现在有空了');
  }
};
