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
 * 从AI消息中智能提取地点信息
 */
const extractLocationFromMessage = (message: string): string | undefined => {
  const lowerMsg = message.toLowerCase();
  
  // 地点关键词匹配
  const locationPatterns = [
    { keywords: ['公司', '办公室', '写字楼', '上班'], location: '公司' },
    { keywords: ['家', '家里', '家中', '房子', '租房'], location: '家' },
    { keywords: ['实验室'], location: '实验室' },
    { keywords: ['图书馆'], location: '图书馆' },
    { keywords: ['教室', '上课'], location: '教室' },
    { keywords: ['会议室', '开会'], location: '会议室' },
    { keywords: ['咖啡厅', '咖啡馆', '咖啡店'], location: '咖啡厅' },
    { keywords: ['餐厅', '饭店', '吃饭'], location: '餐厅' },
    { keywords: ['健身房', '健身', '锻炼'], location: '健身房' },
    { keywords: ['商场', '购物中心', '逛街'], location: '商场' },
    { keywords: ['医院', '看病'], location: '医院' },
    { keywords: ['机场', '飞机'], location: '机场' },
    { keywords: ['车站', '高铁', '火车'], location: '车站' },
    { keywords: ['路上', '在路上'], location: '路上' },
  ];
  
  for (const { keywords, location } of locationPatterns) {
    if (keywords.some(keyword => lowerMsg.includes(keyword))) {
      return location;
    }
  }
  
  return undefined;
};

/**
 * 从AI消息中智能提取活动描述
 */
const extractActivityFromMessage = (message: string): string | undefined => {
  const lowerMsg = message.toLowerCase();
  
  // 活动关键词匹配
  const activityPatterns = [
    { keywords: ['休息', '歇会', '躺着', '放松'], activity: '休息' },
    { keywords: ['工作', '加班', '干活'], activity: '工作' },
    { keywords: ['学习', '看书', '复习'], activity: '学习' },
    { keywords: ['做饭', '煮饭', '烹饪'], activity: '做饭' },
    { keywords: ['看剧', '追剧', '看电影', '看视频'], activity: '看剧' },
    { keywords: ['玩游戏', '打游戏', '开黑'], activity: '玩游戏' },
    { keywords: ['运动', '健身', '跑步', '锻炼'], activity: '运动' },
    { keywords: ['睡觉', '睡了', '入睡'], activity: '睡觉' },
    { keywords: ['吃饭', '吃东西', '用餐'], activity: '吃饭' },
    { keywords: ['开会', '会议'], activity: '开会' },
    { keywords: ['聊天', '聊天中'], activity: '聊天' },
  ];
  
  for (const { keywords, activity } of activityPatterns) {
    if (keywords.some(keyword => lowerMsg.includes(keyword))) {
      return activity;
    }
  }
  
  return undefined;
};

/**
 * AI主动更新自己的状态（用于ChatScreen调用）
 * 解析AI消息中的状态更新指令，并智能生成活动描述和地点
 */
export const analyzeAndUpdateStatusFromAI = async (
  conversationId: string,
  message: string
): Promise<void> => {
  const lowerMsg = message.toLowerCase();
  
  // 智能提取地点和活动
  const location = extractLocationFromMessage(message);
  const activity = extractActivityFromMessage(message);
  
  // 检测AI是否明确表示要改状态
  // 例如："我把状态改回来"、"改成在线"、"状态填错了"
  if (lowerMsg.includes('状态') && (lowerMsg.includes('改') || lowerMsg.includes('换') || lowerMsg.includes('设置') || lowerMsg.includes('错'))) {
    let targetStatus: AIStatus | null = null;
    let statusActivity: string | undefined = undefined;
    
    // 检测目标状态
    if (lowerMsg.includes('在线')) {
      targetStatus = 'online';
      // 生成活动描述：优先使用提取的活动，否则使用地点信息
      if (activity) {
        statusActivity = `在${location || ''}${activity}`;
      } else if (location) {
        statusActivity = `在${location}`;
      } else {
        statusActivity = '在线';
      }
    }
    else if (lowerMsg.includes('忙碌') || lowerMsg.includes('在忙') || lowerMsg.includes('忙着')) {
      targetStatus = 'busy';
      if (activity) {
        statusActivity = `忙着${activity}`;
      } else if (location) {
        statusActivity = `在${location}忙碌`;
      } else {
        statusActivity = '忙碌';
      }
    }
    else if (lowerMsg.includes('休息')) {
      targetStatus = 'resting';
      statusActivity = location ? `在${location}休息` : '休息中';
    }
    else if (lowerMsg.includes('离开')) {
      targetStatus = 'away';
      statusActivity = location ? `离开去${location}` : '离开';
    }
    else if (lowerMsg.includes('离线')) {
      targetStatus = 'offline';
      statusActivity = '离线';
    }
    
    // 执行状态更新
    if (targetStatus) {
      await updateAIStatus(conversationId, targetStatus, statusActivity, location);
      console.log(`✅ AI自主更新状态：${targetStatus} | 活动：${statusActivity} | 地点：${location || '无'}`);
      return; // 已更新状态，直接返回
    }
  }
  
  // 如果没有明确的状态更新指令，但AI提到了具体活动和地点，也更新到轨迹
  if (activity || location) {
    let activityLog = '';
    
    if (activity && location) {
      activityLog = `在${location}${activity}`;
    } else if (activity) {
      activityLog = activity;
    } else if (location) {
      activityLog = `在${location}`;
    }
    
    if (activityLog) {
      await addActivityLog(conversationId, activityLog, location);
      console.log(`✅ AI自主更新活动：${activityLog}`);
    }
  }
};
