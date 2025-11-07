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
 * 分析AI消息并自动更新状态（智能提取地点信息）
 */
export const analyzeMessageAndUpdateStatus = async (
  conversationId: string,
  message: string
): Promise<void> => {
  const lowerMsg = message.toLowerCase();
  // 可以根据角色设定自定义行为（暂未使用，保留扩展性）
  // const characterSettings = getCharacterSettings(conversationId);
  
  // 智能提取地点信息（如果消息中提到了具体地点）
  const extractLocation = (msg: string): string | undefined => {
    // 常见地点关键词
    const locationPatterns = [
      { pattern: /(公司|办公室|写字楼)/, location: '公司' },
      { pattern: /(家|家里|家中)/, location: '家' },
      { pattern: /实验室/, location: '实验室' },
      { pattern: /图书馆/, location: '图书馆' },
      { pattern: /教室/, location: '教室' },
      { pattern: /会议室/, location: '会议室' },
      { pattern: /咖啡厅|咖啡馆/, location: '咖啡厅' },
      { pattern: /餐厅|饭店/, location: '餐厅' },
      { pattern: /健身房/, location: '健身房' },
      { pattern: /商场|购物中心/, location: '商场' },
    ];
    
    for (const { pattern, location } of locationPatterns) {
      if (pattern.test(msg)) {
        return location;
      }
    }
    return undefined;
  };
  
  // 检测关键词并更新状态
  if (lowerMsg.includes('晚安') || lowerMsg.includes('睡觉') || lowerMsg.includes('去睡了')) {
    const location = extractLocation(lowerMsg) || '家';
    await updateAIStatus(conversationId, 'resting', '准备休息了', location);
    // 5分钟后变为离线
    scheduleStatusUpdate(conversationId, 'offline', '已经入睡', 5, location);
  } 
  else if (lowerMsg.includes('回家') || lowerMsg.includes('到家')) {
    await updateAIStatus(conversationId, 'online', '回到家了', '家');
  }
  else if (lowerMsg.includes('回公司') || lowerMsg.includes('到公司')) {
    await updateAIStatus(conversationId, 'online', '回到公司了', '公司');
  }
  else if ((lowerMsg.includes('去') || lowerMsg.includes('路上')) && extractLocation(lowerMsg)) {
    const location = extractLocation(lowerMsg);
    await addActivityLog(conversationId, `正在去${location}的路上`);
    // 15分钟后变为忙碌
    scheduleStatusUpdate(conversationId, 'busy', `在${location}`, 15, location);
  }
  else if (lowerMsg.includes('上课') || lowerMsg.includes('去上课')) {
    await addActivityLog(conversationId, '正在去教室的路上');
    // 10分钟后变为忙碌
    scheduleStatusUpdate(conversationId, 'busy', '正在上课', 10, '教室');
  }
  else if (lowerMsg.includes('开会') || lowerMsg.includes('去开会')) {
    await updateAIStatus(conversationId, 'busy', '正在开会', '会议室');
  }
  else if (lowerMsg.includes('忙') && !lowerMsg.includes('不忙')) {
    await updateAIStatus(conversationId, 'busy', '有点忙');
  }
  else if (lowerMsg.includes('空了') || lowerMsg.includes('不忙了') || lowerMsg.includes('有空')) {
    await updateAIStatus(conversationId, 'online', '现在有空了');
  }
};

/**
 * AI主动更新自己的状态（用于ChatScreen调用）
 * 解析AI消息中的状态更新指令
 */
export const analyzeAndUpdateStatusFromAI = async (
  conversationId: string,
  message: string
): Promise<void> => {
  const lowerMsg = message.toLowerCase();
  
  // 检测AI是否明确表示要改状态
  // 例如："我把状态改回来"、"改成在线"、"状态填错了"
  if (lowerMsg.includes('状态') && (lowerMsg.includes('改') || lowerMsg.includes('换') || lowerMsg.includes('设置'))) {
    // 检测目标状态
    if (lowerMsg.includes('在线')) {
      await updateAIStatus(conversationId, 'online', '在线', undefined);
      console.log('✅ AI自主更新状态：在线');
    }
    else if (lowerMsg.includes('忙碌') || lowerMsg.includes('在忙')) {
      await updateAIStatus(conversationId, 'busy', '忙碌', undefined);
      console.log('✅ AI自主更新状态：忙碌');
    }
    else if (lowerMsg.includes('休息')) {
      await updateAIStatus(conversationId, 'resting', '休息中', undefined);
      console.log('✅ AI自主更新状态：休息中');
    }
    else if (lowerMsg.includes('离开')) {
      await updateAIStatus(conversationId, 'away', '离开', undefined);
      console.log('✅ AI自主更新状态：离开');
    }
    else if (lowerMsg.includes('离线')) {
      await updateAIStatus(conversationId, 'offline', '离线', undefined);
      console.log('✅ AI自主更新状态：离线');
    }
  }
  
  // 如果AI提到具体活动，也更新到轨迹
  if (lowerMsg.includes('去') || lowerMsg.includes('在')) {
    // 提取地点
    const locationMatch = message.match(/(在|去|到)(公司|家|实验室|图书馆|教室|会议室|咖啡厅|餐厅|健身房|商场)/);
    if (locationMatch) {
      const action = locationMatch[1];
      const location = locationMatch[2];
      
      if (action === '去') {
        await addActivityLog(conversationId, `正在去${location}`);
        console.log(`✅ AI自主更新活动：去${location}`);
      } else if (action === '在' || action === '到') {
        await addActivityLog(conversationId, `在${location}`);
        console.log(`✅ AI自主更新活动：在${location}`);
      }
    }
  }
};
