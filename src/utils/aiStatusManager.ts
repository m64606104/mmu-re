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
      
      // 如果距离上次更新超过3小时，才生成新活动（降低频率）
      if (hoursSinceUpdate > 3) {
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
                location: newActivity.location,
                status: getStatusFromActivity(newActivity.status)
              };
              
              // 添加到活动日志
              status.activityLogs = status.activityLogs || [];
              status.activityLogs.push(aiActivity);
              
              // 更新当前活动
              status.currentActivity = newActivity.activity;
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
    
    // 更新状态
    const updatedStatus: AIStatusInfo = {
      ...initialStatus,
      status,
      statusText: STATUS_MAP[status],
      currentActivity: activity,
      lastUpdateTime: Date.now()
    };
    
    // 添加新的活动日志
    const newLog: AIActivityLog = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
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
  location?: string
): Promise<void> => {
  try {
    const currentStatus = await getAIStatus(conversationId);
    if (!currentStatus) return;
    
    const newLog: AIActivityLog = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      activity,
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
    
    // 更新当前活动
    currentStatus.currentActivity = activity;
    currentStatus.lastUpdateTime = Date.now();
    
    const key = `ai_status_${conversationId}`;
    localStorage.setItem(key, JSON.stringify(currentStatus));
    
    console.log(`添加行为轨迹: ${activity}`);
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
 * 解析AI消息中的状态更新指令和详细活动描述
 */
export const analyzeAndUpdateStatusFromAI = async (
  conversationId: string,
  message: string
): Promise<void> => {
  const lowerMsg = message.toLowerCase();
  
  // 检测AI是否明确表示要改状态
  // 例如："我把状态改回来"、"改成在线"、"状态填错了"
  if (lowerMsg.includes('状态') && (lowerMsg.includes('改') || lowerMsg.includes('换') || lowerMsg.includes('设置'))) {
    // 提取活动描述和地点（从整个消息中推断）
    let activityDescription = '';
    let location: string | undefined = undefined;
    
    // 尝试从消息中提取活动描述
    // 例如："在家休息"、"在公司工作"、"出门了"
    const activityPatterns = [
      /在(家|公司|实验室|图书馆|教室|宿舍|咖啡厅|餐厅|健身房|商场|办公室)(.*?)(?:[，。！？\n]|$)/,
      /(睡觉|休息|工作|学习|吃饭|开会|上课|看书|锻炼|购物|喝咖啡|点外卖)(?:中|了|呢)?/,
      /(刚|准备|正在|要)(.*?)(?:[，。！？\n]|$)/,
    ];
    
    for (const pattern of activityPatterns) {
      const match = message.match(pattern);
      if (match) {
        if (match[1] && match[2]) {
          // 匹配到"在XX做YY"
          location = match[1];
          activityDescription = match[2].trim();
          if (activityDescription) {
            activityDescription = `在${location}${activityDescription}`;
          } else {
            activityDescription = `在${location}`;
          }
        } else if (match[1]) {
          // 匹配到单独的活动
          activityDescription = match[0].trim();
        }
        break;
      }
    }
    
    // 检测目标状态
    if (lowerMsg.includes('在线')) {
      await updateAIStatus(conversationId, 'online', activityDescription || '在线', location);
      console.log(`✅ AI自主更新状态：在线${activityDescription ? ` - ${activityDescription}` : ''}`);
    }
    else if (lowerMsg.includes('忙碌') || lowerMsg.includes('在忙')) {
      await updateAIStatus(conversationId, 'busy', activityDescription || '忙碌', location);
      console.log(`✅ AI自主更新状态：忙碌${activityDescription ? ` - ${activityDescription}` : ''}`);
    }
    else if (lowerMsg.includes('休息')) {
      await updateAIStatus(conversationId, 'resting', activityDescription || '休息中', location);
      console.log(`✅ AI自主更新状态：休息中${activityDescription ? ` - ${activityDescription}` : ''}`);
    }
    else if (lowerMsg.includes('离开')) {
      await updateAIStatus(conversationId, 'away', activityDescription || '离开', location);
      console.log(`✅ AI自主更新状态：离开${activityDescription ? ` - ${activityDescription}` : ''}`);
    }
    else if (lowerMsg.includes('离线')) {
      await updateAIStatus(conversationId, 'offline', activityDescription || '离线', location);
      console.log(`✅ AI自主更新状态：离线${activityDescription ? ` - ${activityDescription}` : ''}`);
    }
  }
  
  // 如果AI提到具体活动，也更新到轨迹
  if (lowerMsg.includes('去') || lowerMsg.includes('在')) {
    // 提取地点和活动
    const locationMatch = message.match(/(在|去|到)(公司|家|实验室|图书馆|教室|会议室|咖啡厅|餐厅|健身房|商场|宿舍|办公室)(.*?)(?:[，。！？\n]|$)/);
    if (locationMatch) {
      const action = locationMatch[1];
      const location = locationMatch[2];
      const activity = locationMatch[3]?.trim();
      
      let logText = '';
      if (action === '去') {
        logText = activity ? `去${location}${activity}` : `正在去${location}`;
      } else if (action === '在') {
        logText = activity ? `在${location}${activity}` : `在${location}`;
      } else if (action === '到') {
        logText = activity ? `到${location}${activity}` : `到了${location}`;
      }
      
      if (logText) {
        await addActivityLog(conversationId, logText, location);
        console.log(`✅ AI自主更新活动：${logText}`);
      }
    }
  }
};
