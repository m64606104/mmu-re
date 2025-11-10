/**
 * 🌟 智能生活模拟系统
 * 让AI角色拥有真实的生活轨迹，即使用户不聊天也能看到AI的日常
 * 
 * 双模式设计：
 * 1. LLM生成模式（默认）：调用AI动态生成个性化活动
 * 2. 模板匹配模式（降级）：API失败时使用固定模板
 */

import { Conversation, ActivityLogEntry, ApiConfig } from '../types';
import { getMemoryBank } from './memorySystem';
import { getErrorFromResponse, formatErrorMessage } from './apiErrorHandler';

// 日常活动类型
type ActivityCategory = 'meal' | 'work' | 'entertainment' | 'social' | 'rest' | 'travel' | 'personal';

// 活动模板
interface ActivityTemplate {
  category: ActivityCategory;
  timeRange: [number, number]; // [开始小时, 结束小时]
  activities: string[];
  probability: number; // 0-1 概率
  duration: number; // 分钟
  priority: number; // 优先级
}

// 基础活动模板库
const ACTIVITY_TEMPLATES: ActivityTemplate[] = [
  // 早餐时间 (6-9)
  {
    category: 'meal',
    timeRange: [6, 9],
    activities: [
      '起床洗漱，准备早餐',
      '吃了个三明治配咖啡',
      '煮了碗面条当早餐',
      '去楼下买了包子豆浆',
      '做了个煎蛋配吐司',
      '喝了杯牛奶吃了点麦片'
    ],
    probability: 0.9,
    duration: 30,
    priority: 1
  },
  // 上午工作/学习 (9-12)
  {
    category: 'work',
    timeRange: [9, 12],
    activities: [
      '开始处理工作邮件',
      '参加了个线上会议',
      '写代码ing',
      '看书学习中',
      '整理文档资料',
      '做项目方案'
    ],
    probability: 0.8,
    duration: 60,
    priority: 2
  },
  // 午餐时间 (11-14)
  {
    category: 'meal',
    timeRange: [11, 14],
    activities: [
      '点了份外卖',
      '去食堂吃午饭',
      '和同事一起吃饭',
      '自己做了个简单的午餐',
      '去楼下餐厅吃了个套餐',
      '叫了个汉堡薯条'
    ],
    probability: 0.95,
    duration: 45,
    priority: 1
  },
  // 下午活动 (14-18)
  {
    category: 'work',
    timeRange: [14, 18],
    activities: [
      '继续工作',
      '开了个小会',
      '处理一些杂事',
      '写报告',
      '和客户沟通',
      '整理数据'
    ],
    probability: 0.7,
    duration: 90,
    priority: 2
  },
  // 下午茶/休息 (15-16)
  {
    category: 'rest',
    timeRange: [15, 16],
    activities: [
      '喝了杯咖啡休息一下',
      '吃了点小零食',
      '出去走了走，放松一下',
      '刷了会手机',
      '和同事聊了会天'
    ],
    probability: 0.5,
    duration: 20,
    priority: 3
  },
  // 晚餐时间 (18-20)
  {
    category: 'meal',
    timeRange: [18, 20],
    activities: [
      '回家做饭',
      '点了个外卖',
      '出去吃饭',
      '和朋友聚餐',
      '简单吃了点',
      '去超市买了些吃的'
    ],
    probability: 0.95,
    duration: 60,
    priority: 1
  },
  // 晚间娱乐 (20-23)
  {
    category: 'entertainment',
    timeRange: [20, 23],
    activities: [
      '看电视剧',
      '玩游戏',
      '看书',
      '听音乐',
      '刷短视频',
      '看电影',
      '散步',
      '健身运动'
    ],
    probability: 0.8,
    duration: 90,
    priority: 2
  },
  // 社交活动（随机时间）
  {
    category: 'social',
    timeRange: [10, 22],
    activities: [
      '和朋友聊天',
      '视频通话',
      '刷朋友圈',
      '回复消息',
      '发了个朋友圈'
    ],
    probability: 0.3,
    duration: 30,
    priority: 3
  },
  // 个人活动
  {
    category: 'personal',
    timeRange: [6, 23],
    activities: [
      '洗澡',
      '整理房间',
      '洗衣服',
      '购物',
      '理发',
      '做家务'
    ],
    probability: 0.2,
    duration: 45,
    priority: 3
  },
  // 睡前准备 (22-24)
  {
    category: 'rest',
    timeRange: [22, 24],
    activities: [
      '准备睡觉',
      '洗漱准备休息',
      '躺床上玩手机',
      '看会书准备睡觉',
      '听音乐放松'
    ],
    probability: 0.9,
    duration: 30,
    priority: 1
  }
];

/**
 * 根据角色性格调整活动
 */
const adjustActivityByPersonality = (
  activity: string,
  personality?: string
): string => {
  if (!personality) return activity;
  
  const traits = personality.toLowerCase();
  
  // 根据性格特征调整活动描述
  if (traits.includes('内向') || traits.includes('宅')) {
    if (activity.includes('聚餐')) {
      return activity.replace('聚餐', '在家吃饭');
    }
    if (activity.includes('出去')) {
      return activity.replace('出去', '在家');
    }
  }
  
  if (traits.includes('活泼') || traits.includes('外向')) {
    if (activity.includes('在家')) {
      return activity.replace('在家', '出去');
    }
    if (activity.includes('自己')) {
      return activity.replace('自己', '和朋友一起');
    }
  }
  
  if (traits.includes('勤奋') || traits.includes('努力')) {
    if (activity.includes('休息')) {
      return activity.replace('休息', '继续工作');
    }
  }
  
  if (traits.includes('懒') || traits.includes('悠闲')) {
    if (activity.includes('工作')) {
      return activity.replace('工作', '摸鱼');
    }
  }
  
  return activity;
};

/**
 * 🤖 使用LLM生成个性化活动（新模式）
 */
export const generateActivityWithAI = async (
  conversation: Conversation,
  apiConfig: ApiConfig
): Promise<ActivityLogEntry | null> => {
  try {
    const prompt = buildActivityPrompt(conversation);
    
    const requestBody = {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a life activity generator. Generate realistic daily activities based on character settings and context.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.9,
      max_tokens: 300
    };

    const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorInfo = await getErrorFromResponse(response);
      throw new Error(formatErrorMessage(errorInfo));
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('AI返回空内容');
    }

    // 解析AI返回的活动
    return parseActivityResponse(content);
  } catch (error) {
    console.error('AI生成活动失败，使用模板降级:', error);
    return null;
  }
};

/**
 * 构建活动生成的提示词
 */
const buildActivityPrompt = (conversation: Conversation): string => {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.toLocaleDateString('zh-CN', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('zh-CN');
  
  const characterSettings = conversation.characterSettings;
  const nickname = characterSettings?.nickname || '未知';
  
  // 获取记忆库
  const memoryBank = getMemoryBank(conversation.id);
  const recentMemories = memoryBank.memories.slice(0, 5);
  
  // 获取最近的聊天
  const recentMessages = conversation.messages
    .filter(m => m.role === 'user')
    .slice(-3)
    .map(m => m.content)
    .join('；');
  
  // 时间上下文
  let timeContext = '';
  if (hour >= 0 && hour < 6) {
    timeContext = '现在是深夜/凌晨，可能在睡觉、失眠、加班等';
  } else if (hour >= 6 && hour < 9) {
    timeContext = '现在是早上，可能在起床、洗漱、吃早餐、上班路上等';
  } else if (hour >= 9 && hour < 12) {
    timeContext = '现在是上午，可能在工作、学习、开会、处理事务等';
  } else if (hour >= 12 && hour < 14) {
    timeContext = '现在是中午，可能在吃午饭、午休等';
  } else if (hour >= 14 && hour < 18) {
    timeContext = '现在是下午，可能在工作、学习、开会、喝下午茶等';
  } else if (hour >= 18 && hour < 21) {
    timeContext = '现在是傍晚，可能在吃晚饭、下班、散步、购物等';
  } else if (hour >= 21 && hour < 24) {
    timeContext = '现在是晚上，可能在娱乐、看剧、运动、准备睡觉等';
  }
  
  // 构建角色信息
  let characterInfo = `你是 ${nickname}。\n`;
  if (characterSettings?.personality) {
    characterInfo += `性格：${characterSettings.personality}\n`;
  }
  if (characterSettings?.systemPrompt) {
    characterInfo += `背景：${characterSettings.systemPrompt.substring(0, 100)}\n`;
  }
  
  // 记忆上下文
  let memoryContext = '';
  if (recentMemories.length > 0) {
    memoryContext = '\n最近的记忆：\n' + recentMemories.slice(0, 3).map(m => `- ${m.content}`).join('\n');
  }
  
  // 聊天上下文
  let chatContext = '';
  if (recentMessages) {
    chatContext = `\n\n最近和用户聊到：${recentMessages}`;
  }
  
  const prompt = `${characterInfo}
当前时间：${dateStr} ${dayOfWeek} ${hour}:${now.getMinutes()}
${timeContext}
${memoryContext}${chatContext}

【任务】
根据你的角色设定和当前时间，生成一条真实自然的生活活动记录。

【要求】
1. 活动要符合当前时间情境
2. 活动要符合你的角色身份和性格
3. 可以结合最近的聊天或记忆内容
4. 描述要自然、口语化，10-20字以内
5. 不要过于正式或刻板

【输出格式】
严格按照以下格式输出（每个字段占一行）：

活动：活动描述文本
地点：地点名称
状态：在线/忙碌/休息中/离开

示例：
活动：刚起床，洗漱中
地点：家
状态：在线

或：
活动：在咖啡厅赶论文，快疯了
地点：咖啡厅
状态：忙碌

现在请生成：`;
  
  return prompt;
};

/**
 * 解析AI返回的活动内容
 */
const parseActivityResponse = (content: string): ActivityLogEntry | null => {
  try {
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    let activity = '';
    let location = '';
    let status = '在线';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('活动：') || trimmed.startsWith('活动:')) {
        activity = trimmed.replace(/^活动[：:]/, '').trim();
      } else if (trimmed.startsWith('地点：') || trimmed.startsWith('地点:')) {
        location = trimmed.replace(/^地点[：:]/, '').trim();
      } else if (trimmed.startsWith('状态：') || trimmed.startsWith('状态:')) {
        status = trimmed.replace(/^状态[：:]/, '').trim();
      }
    }
    
    if (!activity) {
      return null;
    }
    
    return {
      timestamp: Date.now(),
      activity: activity,
      status: status,
      location: location || '未知',
      mood: '平常'
    };
  } catch (error) {
    console.error('解析AI活动失败:', error);
    return null;
  }
};

/**
 * 生成当前时间的活动（模板降级模式）
 */
export const generateCurrentActivity = (
  conversation: Conversation
): ActivityLogEntry | null => {
  const now = new Date();
  const currentHour = now.getHours();
  const personality = conversation.characterSettings?.personality;
  
  // 筛选适合当前时间的活动
  const suitableActivities = ACTIVITY_TEMPLATES.filter(template => 
    currentHour >= template.timeRange[0] && 
    currentHour < template.timeRange[1]
  );
  
  if (suitableActivities.length === 0) {
    return null;
  }
  
  // 根据概率选择活动
  const selectedActivity = suitableActivities.find(template => 
    Math.random() < template.probability
  );
  
  if (!selectedActivity) {
    return null;
  }
  
  // 随机选择一个具体活动
  const activityText = selectedActivity.activities[
    Math.floor(Math.random() * selectedActivity.activities.length)
  ];
  
  // 根据性格调整活动
  const adjustedActivity = adjustActivityByPersonality(activityText, personality);
  
  // 生成状态
  const statusMap: Record<ActivityCategory, string> = {
    meal: '吃饭中',
    work: '工作中',
    entertainment: '娱乐中',
    social: '社交中',
    rest: '休息中',
    travel: '外出中',
    personal: '忙碌中'
  };
  
  // 生成位置
  const locationMap: Record<ActivityCategory, string[]> = {
    meal: ['餐厅', '家里', '食堂', '咖啡店'],
    work: ['办公室', '家里', '咖啡店', '图书馆'],
    entertainment: ['家里', '电影院', '公园', '商场'],
    social: ['咖啡店', '餐厅', '公园', '朋友家'],
    rest: ['家里', '卧室', '沙发'],
    travel: ['路上', '地铁上', '公交上'],
    personal: ['家里', '商场', '超市']
  };
  
  const locations = locationMap[selectedActivity.category];
  const location = locations[Math.floor(Math.random() * locations.length)];
  
  return {
    timestamp: Date.now(),
    activity: adjustedActivity,
    status: statusMap[selectedActivity.category],
    location,
    mood: Math.random() > 0.3 ? '开心' : '平常'
  };
};

/**
 * 生成一天的活动轨迹
 */
export const generateDailyActivities = (
  conversation: Conversation,
  date: Date = new Date()
): ActivityLogEntry[] => {
  const activities: ActivityLogEntry[] = [];
  const personality = conversation.characterSettings?.personality;
  const now = new Date();
  
  // 为一天的不同时段生成活动
  const timeSlots = [
    7, // 早上
    9, // 上午
    12, // 中午
    15, // 下午
    18, // 傍晚
    20, // 晚上
    22  // 睡前
  ];
  
  timeSlots.forEach((hour, index) => {
    const slotDate = new Date(date);
    // 为每个时间段设置不同的分钟数，确保时间戳唯一
    const minutes = Math.floor((index * 13 + Math.random() * 30) % 60);
    slotDate.setHours(hour, minutes, 0, 0);
    
    const timestamp = slotDate.getTime();
    
    // 🔥 关键修复：只生成当前时间之前的活动，不生成未来的活动
    if (timestamp > now.getTime()) {
      return; // 跳过未来的时间段
    }
    
    // 检查是否已有相近时间的活动（避免重复）
    const hasNearbyActivity = activities.some(a => 
      Math.abs(a.timestamp - timestamp) < 30 * 60 * 1000 // 30分钟内
    );
    
    if (hasNearbyActivity) {
      return; // 跳过这个时间段
    }
    
    // 筛选适合该时段的活动
    const suitableActivities = ACTIVITY_TEMPLATES.filter(template => 
      hour >= template.timeRange[0] && 
      hour < template.timeRange[1]
    );
    
    if (suitableActivities.length > 0) {
      // 根据优先级和概率选择
      const selected = suitableActivities.sort((a, b) => 
        a.priority - b.priority
      )[0];
      
      if (Math.random() < selected.probability) {
        const activityText = selected.activities[
          Math.floor(Math.random() * selected.activities.length)
        ];
        
        const adjustedActivity = adjustActivityByPersonality(activityText, personality);
        
        activities.push({
          timestamp: timestamp,
          activity: adjustedActivity,
          status: getStatusFromCategory(selected.category),
          location: getLocationFromCategory(selected.category),
          mood: getMoodFromActivity(selected.category)
        });
      }
    }
  });
  
  return activities;
};

/**
 * 获取状态
 */
const getStatusFromCategory = (category: ActivityCategory): string => {
  const statusMap: Record<ActivityCategory, string> = {
    meal: '吃饭中',
    work: '工作中',
    entertainment: '娱乐中',
    social: '社交中',
    rest: '休息中',
    travel: '外出中',
    personal: '忙碌中'
  };
  return statusMap[category];
};

/**
 * 获取位置
 */
const getLocationFromCategory = (category: ActivityCategory): string => {
  const locationMap: Record<ActivityCategory, string[]> = {
    meal: ['餐厅', '家里', '食堂'],
    work: ['办公室', '家里', '咖啡店'],
    entertainment: ['家里', '电影院', '公园'],
    social: ['咖啡店', '餐厅', '朋友家'],
    rest: ['家里', '卧室'],
    travel: ['路上', '地铁上'],
    personal: ['家里', '商场']
  };
  
  const locations = locationMap[category];
  return locations[Math.floor(Math.random() * locations.length)];
};

/**
 * 获取心情
 */
const getMoodFromActivity = (category: ActivityCategory): string => {
  const moodMap: Record<ActivityCategory, string[]> = {
    meal: ['满足', '开心', '平常'],
    work: ['专注', '忙碌', '平常'],
    entertainment: ['开心', '放松', '愉快'],
    social: ['开心', '愉快', '兴奋'],
    rest: ['放松', '平静', '舒适'],
    travel: ['平常', '期待', '疲惫'],
    personal: ['平常', '忙碌', '轻松']
  };
  
  const moods = moodMap[category];
  return moods[Math.floor(Math.random() * moods.length)];
};

/**
 * 智能补充缺失的活动轨迹
 */
export const fillMissingActivities = (
  conversation: Conversation,
  existingActivities: ActivityLogEntry[]
): ActivityLogEntry[] => {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  // 获取今天已有的活动
  const todayActivities = existingActivities.filter(a => 
    a.timestamp >= todayStart.getTime()
  );
  
  // 如果今天活动少于3个，生成补充活动
  if (todayActivities.length < 3) {
    const dailyActivities = generateDailyActivities(conversation, now);
    
    // 使用 Map 去重，键为时间戳，确保同一时间只有一个活动
    const activityMap = new Map<number, ActivityLogEntry>();
    
    // 先添加已有的活动（优先级更高）
    todayActivities.forEach(activity => {
      activityMap.set(activity.timestamp, activity);
    });
    
    // 添加新生成的活动，但要检查时间冲突
    dailyActivities.forEach(newActivity => {
      const hourDiff = 2 * 60 * 60 * 1000; // 2小时
      let hasConflict = false;
      
      // 检查是否与已有活动时间太接近
      for (const [existingTimestamp] of activityMap) {
        if (Math.abs(existingTimestamp - newActivity.timestamp) < hourDiff) {
          hasConflict = true;
          break;
        }
      }
      
      if (!hasConflict) {
        activityMap.set(newActivity.timestamp, newActivity);
      }
    });
    
    // 转换为数组并按时间排序
    return Array.from(activityMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  }
  
  return existingActivities;
};
