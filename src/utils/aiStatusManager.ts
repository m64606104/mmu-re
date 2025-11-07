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
 * 解析AI消息中的状态更新指令和活动描述
 */
export const analyzeAndUpdateStatusFromAI = async (
  conversationId: string,
  message: string
): Promise<void> => {
  const lowerMsg = message.toLowerCase();
  
  // 智能提取活动描述和地点
  const extractActivityAndLocation = (msg: string): { activity?: string; location?: string } => {
    // 提取"在XXX做XXX"的模式
    const patterns = [
      // "在家休息"、"在公司加班"
      { regex: /在(家|公司|办公室|实验室|图书馆|教室|咖啡厅|餐厅|健身房|商场|宿舍)([^\s。，,！!？?]{1,10})/, activity: (m: RegExpMatchArray) => m[2], location: (m: RegExpMatchArray) => m[1] },
      // "回家睡觉"、"去公司开会"
      { regex: /(回|去|到)(家|公司|办公室|实验室|图书馆|教室|咖啡厅|餐厅|健身房|商场|宿舍)([^\s。，,！!？?]{1,10})/, activity: (m: RegExpMatchArray) => m[3], location: (m: RegExpMatchArray) => m[2] },
      // "正在XXX"
      { regex: /正在([^\s。，,！!？?]{2,10})/, activity: (m: RegExpMatchArray) => m[1], location: undefined },
      // "刚XXX"、"刚刚XXX"
      { regex: /刚刚?([^\s。，,！!？?]{2,10})/, activity: (m: RegExpMatchArray) => m[1], location: undefined },
    ];
    
    for (const { regex, activity, location } of patterns) {
      const match = msg.match(regex);
      if (match) {
        return {
          activity: activity ? activity(match) : undefined,
          location: location ? location(match) : undefined
        };
      }
    }
    
    return {};
  };
  
  // 检测AI是否明确表示要改状态
  // 例如："我把状态改回来"、"改成在线"、"状态填错了"
  if (lowerMsg.includes('状态') && (lowerMsg.includes('改') || lowerMsg.includes('换') || lowerMsg.includes('设置'))) {
    const { activity, location } = extractActivityAndLocation(message);
    
    // 检测目标状态
    if (lowerMsg.includes('在线')) {
      await updateAIStatus(conversationId, 'online', activity || '在线', location);
      console.log(`✅ AI自主更新状态：在线${activity ? ` - ${activity}` : ''}${location ? ` @ ${location}` : ''}`);
    }
    else if (lowerMsg.includes('忙碌') || lowerMsg.includes('在忙')) {
      await updateAIStatus(conversationId, 'busy', activity || '忙碌', location);
      console.log(`✅ AI自主更新状态：忙碌${activity ? ` - ${activity}` : ''}${location ? ` @ ${location}` : ''}`);
    }
    else if (lowerMsg.includes('休息')) {
      await updateAIStatus(conversationId, 'resting', activity || '休息中', location);
      console.log(`✅ AI自主更新状态：休息中${activity ? ` - ${activity}` : ''}${location ? ` @ ${location}` : ''}`);
    }
    else if (lowerMsg.includes('离开')) {
      await updateAIStatus(conversationId, 'away', activity || '离开', location);
      console.log(`✅ AI自主更新状态：离开${activity ? ` - ${activity}` : ''}${location ? ` @ ${location}` : ''}`);
    }
    else if (lowerMsg.includes('离线')) {
      await updateAIStatus(conversationId, 'offline', activity || '离线', location);
      console.log(`✅ AI自主更新状态：离线${activity ? ` - ${activity}` : ''}${location ? ` @ ${location}` : ''}`);
    }
  }
  
  // 如果AI提到具体活动，也更新到轨迹
  if (lowerMsg.includes('去') || lowerMsg.includes('在') || lowerMsg.includes('正在') || lowerMsg.includes('刚')) {
    const { activity, location } = extractActivityAndLocation(message);
    
    if (activity) {
      const activityText = location ? `${activity} @ ${location}` : activity;
      await addActivityLog(conversationId, activityText, location);
      console.log(`✅ AI自主更新活动：${activityText}`);
    }
  }
};

/**
 * 根据角色设定、时间、日期智能生成行为轨迹
 */
export const generateSmartActivityLog = async (
  conversationId: string,
  characterSettings?: any
): Promise<void> => {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0=周日, 1=周一, ..., 6=周六
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  // 从角色设定中提取职业信息
  const getCharacterType = (): 'student' | 'worker' | 'freelancer' | 'unknown' => {
    if (!characterSettings) return 'unknown';
    
    const settings = JSON.stringify(characterSettings).toLowerCase();
    
    if (settings.includes('学生') || settings.includes('大学') || settings.includes('上课') || settings.includes('宿舍')) {
      return 'student';
    }
    if (settings.includes('社畜') || settings.includes('上班') || settings.includes('公司') || 
        settings.includes('职员') || settings.includes('白领') || settings.includes('助理') ||
        settings.includes('经理') || settings.includes('总裁')) {
      return 'worker';
    }
    if (settings.includes('自由职业') || settings.includes('freelance') || settings.includes('远程')) {
      return 'freelancer';
    }
    
    return 'unknown';
  };
  
  const characterType = getCharacterType();
  let activity = '';
  let location = '';
  let status: AIStatus = 'online';
  
  // 根据角色类型和时间生成合理的活动
  if (characterType === 'student') {
    // 学生
    if (hour >= 0 && hour < 7) {
      activity = '睡觉';
      location = '宿舍';
      status = 'offline';
    } else if (hour >= 7 && hour < 8) {
      activity = isWeekend ? '睡懒觉' : '起床洗漱';
      location = '宿舍';
      status = isWeekend ? 'offline' : 'online';
    } else if (hour >= 8 && hour < 12) {
      if (isWeekend) {
        const activities = ['睡懒觉', '在宿舍玩游戏', '图书馆自习'];
        activity = activities[Math.floor(Math.random() * activities.length)];
        location = activity.includes('宿舍') ? '宿舍' : '图书馆';
        status = activity === '睡懒觉' ? 'resting' : 'busy';
      } else {
        activity = '上课';
        location = '教室';
        status = 'busy';
      }
    } else if (hour >= 12 && hour < 14) {
      const activities = ['食堂吃饭', '点外卖', '宿舍吃饭'];
      activity = activities[Math.floor(Math.random() * activities.length)];
      location = activity.includes('食堂') ? '食堂' : '宿舍';
      status = 'online';
    } else if (hour >= 14 && hour < 18) {
      if (isWeekend) {
        const activities = ['图书馆学习', '宿舍休息', '逛街', '打球'];
        activity = activities[Math.floor(Math.random() * activities.length)];
        location = activity.includes('图书馆') ? '图书馆' : activity.includes('宿舍') ? '宿舍' : '校外';
        status = activity.includes('休息') ? 'resting' : 'busy';
      } else {
        const activities = ['上课', '图书馆自习', '实验室做实验'];
        activity = activities[Math.floor(Math.random() * activities.length)];
        location = activity.includes('上课') ? '教室' : activity.includes('图书馆') ? '图书馆' : '实验室';
        status = 'busy';
      }
    } else if (hour >= 18 && hour < 20) {
      const activities = ['食堂吃饭', '点外卖', '出去吃饭'];
      activity = activities[Math.floor(Math.random() * activities.length)];
      location = activity.includes('食堂') ? '食堂' : activity.includes('出去') ? '餐厅' : '宿舍';
      status = 'online';
    } else if (hour >= 20 && hour < 23) {
      const activities = ['宿舍玩游戏', '图书馆自习', '宿舍追剧', '和朋友聊天'];
      activity = activities[Math.floor(Math.random() * activities.length)];
      location = activity.includes('图书馆') ? '图书馆' : '宿舍';
      status = 'online';
    } else {
      activity = '准备睡觉';
      location = '宿舍';
      status = 'resting';
    }
  } else if (characterType === 'worker') {
    // 上班族/社畜
    if (hour >= 0 && hour < 7) {
      activity = '睡觉';
      location = '家';
      status = 'offline';
    } else if (hour >= 7 && hour < 9) {
      if (isWeekend) {
        activity = '睡懒觉';
        location = '家';
        status = 'resting';
      } else {
        const activities = ['准备上班', '通勤路上', '买早餐'];
        activity = activities[Math.floor(Math.random() * activities.length)];
        location = activity.includes('准备') ? '家' : '路上';
        status = 'away';
      }
    } else if (hour >= 9 && hour < 12) {
      if (isWeekend) {
        const activities = ['在家休息', '逛街', '健身房锻炼'];
        activity = activities[Math.floor(Math.random() * activities.length)];
        location = activity.includes('在家') ? '家' : activity.includes('健身') ? '健身房' : '商场';
        status = activity.includes('休息') ? 'online' : 'busy';
      } else {
        const activities = ['开会', '处理工作', '写方案'];
        activity = activities[Math.floor(Math.random() * activities.length)];
        location = '公司';
        status = 'busy';
      }
    } else if (hour >= 12 && hour < 14) {
      const activities = ['公司食堂吃饭', '点外卖', '出去吃饭', '买咖啡'];
      activity = activities[Math.floor(Math.random() * activities.length)];
      location = activity.includes('公司') ? '公司' : activity.includes('外卖') ? '公司' : activity.includes('咖啡') ? '咖啡厅' : '餐厅';
      status = 'online';
    } else if (hour >= 14 && hour < 18) {
      if (isWeekend) {
        const activities = ['在家看电影', '咖啡厅工作', '约朋友见面'];
        activity = activities[Math.floor(Math.random() * activities.length)];
        location = activity.includes('在家') ? '家' : activity.includes('咖啡厅') ? '咖啡厅' : '外面';
        status = activity.includes('工作') ? 'busy' : 'online';
      } else {
        const activities = ['开会', '加班处理事务', '写报告', '买咖啡提神'];
        activity = activities[Math.floor(Math.random() * activities.length)];
        location = activity.includes('咖啡') ? '咖啡厅' : '公司';
        status = 'busy';
      }
    } else if (hour >= 18 && hour < 20) {
      if (isWeekend) {
        activity = '在家做饭';
        location = '家';
        status = 'online';
      } else {
        const activities = ['准备下班', '加班', '回家路上', '和同事吃饭'];
        activity = activities[Math.floor(Math.random() * activities.length)];
        location = activity.includes('加班') ? '公司' : activity.includes('吃饭') ? '餐厅' : '公司';
        status = activity.includes('加班') ? 'busy' : 'away';
      }
    } else if (hour >= 20 && hour < 23) {
      const activities = ['在家休息', '追剧', '健身房锻炼', '处理私事'];
      activity = activities[Math.floor(Math.random() * activities.length)];
      location = activity.includes('健身') ? '健身房' : '家';
      status = 'online';
    } else {
      activity = '准备睡觉';
      location = '家';
      status = 'resting';
    }
  } else if (characterType === 'freelancer') {
    // 自由职业者
    if (hour >= 0 && hour < 8) {
      activity = '睡觉';
      location = '家';
      status = 'offline';
    } else if (hour >= 8 && hour < 12) {
      const activities = ['在家工作', '咖啡厅工作', '处理项目'];
      activity = activities[Math.floor(Math.random() * activities.length)];
      location = activity.includes('咖啡厅') ? '咖啡厅' : '家';
      status = 'busy';
    } else if (hour >= 12 && hour < 14) {
      activity = '做饭/点外卖';
      location = '家';
      status = 'online';
    } else if (hour >= 14 && hour < 18) {
      const activities = ['在家工作', '咖啡厅工作', '图书馆工作', '休息放松'];
      activity = activities[Math.floor(Math.random() * activities.length)];
      location = activity.includes('咖啡厅') ? '咖啡厅' : activity.includes('图书馆') ? '图书馆' : '家';
      status = activity.includes('休息') ? 'online' : 'busy';
    } else if (hour >= 18 && hour < 23) {
      const activities = ['在家做饭', '外出吃饭', '在家休息', '继续工作'];
      activity = activities[Math.floor(Math.random() * activities.length)];
      location = activity.includes('外出') ? '餐厅' : '家';
      status = activity.includes('工作') ? 'busy' : 'online';
    } else {
      activity = '准备睡觉';
      location = '家';
      status = 'resting';
    }
  } else {
    // 未知类型，使用通用逻辑
    if (hour >= 0 && hour < 7) {
      activity = '睡觉';
      status = 'offline';
    } else if (hour >= 7 && hour < 9) {
      activity = '起床准备';
      status = 'online';
    } else if (hour >= 9 && hour < 12) {
      activity = '忙碌中';
      status = 'busy';
    } else if (hour >= 12 && hour < 14) {
      activity = '午餐时间';
      status = 'online';
    } else if (hour >= 14 && hour < 18) {
      activity = '忙碌中';
      status = 'busy';
    } else if (hour >= 18 && hour < 20) {
      activity = '晚餐时间';
      status = 'online';
    } else if (hour >= 20 && hour < 23) {
      activity = '休息放松';
      status = 'online';
    } else {
      activity = '准备睡觉';
      status = 'resting';
    }
  }
  
  // 更新状态
  await updateAIStatus(conversationId, status, activity, location);
  console.log(`🤖 智能生成行为轨迹：${status} - ${activity}${location ? ` @ ${location}` : ''}`);
};
