import { Conversation, ApiConfig } from '../types';
import { updateAIStatus } from './aiStatusManager';

/**
 * 智能行为轨迹生成器
 * 根据角色设定、时间、日期调用API生成合理的行为轨迹
 */

/**
 * 构建生成行为轨迹的提示词
 */
const buildActivityPrompt = async (
  conversation: Conversation,
  currentTime: Date
): Promise<string> => {
  const hour = currentTime.getHours();
  const minute = currentTime.getMinutes();
  const dayOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][currentTime.getDay()];
  const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  
  const characterSettings = conversation.characterSettings;
  const nickname = characterSettings?.nickname || conversation.name;
  const personality = characterSettings?.personality || '';
  const systemPrompt = characterSettings?.systemPrompt || '';
  
  // 提取角色身份（学生、社畜、自由职业等）
  let roleType = '普通人';
  if (systemPrompt.includes('学生') || systemPrompt.includes('大学生')) {
    roleType = '学生';
  } else if (systemPrompt.includes('上班族') || systemPrompt.includes('社畜') || systemPrompt.includes('职场') || systemPrompt.includes('公司') || systemPrompt.includes('助理') || systemPrompt.includes('经理')) {
    roleType = '上班族';
  } else if (systemPrompt.includes('自由职业') || systemPrompt.includes('自由工作者')) {
    roleType = '自由职业者';
  }
  
  
  const prompt = `你是${nickname}，一个${roleType}。

【角色信息】
${systemPrompt ? `背景：${systemPrompt}` : ''}
${personality ? `性格：${personality}` : ''}

【当前时间】
${dayOfWeek} ${timeStr}

【任务】
请根据当前时间和你的角色身份，生成一条真实、合理的行为轨迹。

**要求：**
1. 必须符合你的身份和作息时间
2. 必须真实、具体、有生活气息
3. 只生成一条活动，不要多条
4. 格式：[状态]活动描述|地点（可选）

**状态选项：**
- 在线：日常活动、休息、有空
- 忙碌：工作、学习、开会、上课
- 休息中：睡觉、午休、休息
- 离开：外出、路上

**示例（${roleType}）：**
${roleType === '学生' ? `
- 早上7:30 → [忙碌]准备去上课|宿舍
- 上午10:00 → [忙碌]正在上高数课|教室
- 中午12:00 → [在线]食堂排队打饭|食堂
- 下午14:00 → [休息中]宿舍午休|宿舍
- 下午16:00 → [在线]图书馆自习|图书馆
- 晚上19:00 → [在线]食堂吃饭|食堂
- 晚上22:00 → [在线]宿舍玩游戏|宿舍
- 凌晨1:00 → [休息中]睡觉了|宿舍
` : roleType === '上班族' ? `
- 早上7:30 → [离开]地铁上班路上|地铁
- 上午9:00 → [忙碌]处理今天的工作|公司
- 中午12:00 → [在线]公司食堂吃饭|公司食堂
- 中午12:30 → [在线]点了杯咖啡提神|咖啡厅
- 下午14:00 → [忙碌]开部门会议|会议室
- 下午16:00 → [在线]买下午茶|茶水间
- 晚上18:30 → [离开]下班回家路上|地铁
- 晚上19:30 → [在线]到家了|家
- 晚上22:00 → [在线]看电视放松|家
- 凌晨0:00 → [休息中]准备睡觉|家
` : `
- 上午10:00 → [在线]咖啡厅工作|咖啡厅
- 中午12:00 → [在线]点外卖|家
- 下午15:00 → [忙碌]客户视频会议|家
- 晚上20:00 → [在线]健身房锻炼|健身房
`}

**现在生成${dayOfWeek} ${timeStr}的行为轨迹：**
格式：[状态]活动描述|地点
只输出一条，不要解释。`;

  return prompt;
};

/**
 * 解析AI返回的活动内容
 */
const parseActivityResponse = (response: string): {
  status: 'online' | 'busy' | 'resting' | 'away' | 'offline';
  activity: string;
  location?: string;
} | null => {
  // 格式：[状态]活动描述|地点
  const match = response.match(/\[(.+?)\](.+?)(?:\|(.+))?$/);
  
  if (!match) {
    return null;
  }
  
  const statusText = match[1].trim();
  const activity = match[2].trim();
  const location = match[3]?.trim();
  
  // 映射状态
  let status: 'online' | 'busy' | 'resting' | 'away' | 'offline' = 'online';
  if (statusText.includes('忙碌') || statusText === 'busy') {
    status = 'busy';
  } else if (statusText.includes('休息') || statusText === 'resting') {
    status = 'resting';
  } else if (statusText.includes('离开') || statusText === 'away') {
    status = 'away';
  } else if (statusText.includes('离线') || statusText === 'offline') {
    status = 'offline';
  }
  
  return { status, activity, location };
};

/**
 * 生成智能行为轨迹
 */
export const generateSmartActivity = async (
  conversation: Conversation,
  apiConfig: ApiConfig
): Promise<boolean> => {
  try {
    console.log(`🤖 开始为 ${conversation.name} 生成智能行为轨迹...`);
    
    // 检查API配置
    if (!apiConfig.baseUrl || !apiConfig.apiKey || !apiConfig.modelName) {
      console.error('❌ API配置不完整');
      return false;
    }
    
    // 检查是否是私聊且有角色设定
    if (conversation.type !== 'private' || !conversation.characterSettings) {
      console.log('⚠️ 只支持有角色设定的私聊');
      return false;
    }
    
    const currentTime = new Date();
    const prompt = await buildActivityPrompt(conversation, currentTime);
    
    // 调用API
    const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 300
      })
    });
    
    if (!response.ok) {
      console.error('❌ API请求失败:', response.status);
      return false;
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (!content) {
      console.error('❌ API返回内容为空');
      return false;
    }
    
    console.log('🎯 AI生成的活动:', content);
    
    // 解析返回内容
    const parsed = parseActivityResponse(content);
    if (!parsed) {
      console.error('❌ 无法解析活动内容');
      return false;
    }
    
    // 更新状态和轨迹
    await updateAIStatus(conversation.id, parsed.status, parsed.activity, parsed.location);
    
    console.log(`✅ 智能轨迹生成成功: [${parsed.status}] ${parsed.activity}${parsed.location ? ` @ ${parsed.location}` : ''}`);
    return true;
    
  } catch (error) {
    console.error('❌ 生成智能行为轨迹失败:', error);
    return false;
  }
};

/**
 * 获取行为轨迹生成计数器
 */
const getActivityCounter = (conversationId: string): {
  lastActivityMessageCount: number;
  messagesSinceLastActivity: number;
} => {
  try {
    const stored = localStorage.getItem(`activity_counter_${conversationId}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('读取活动计数器失败:', e);
  }
  return {
    lastActivityMessageCount: 0,
    messagesSinceLastActivity: 0
  };
};

/**
 * 更新行为轨迹生成计数器
 */
const updateActivityCounter = (conversationId: string, currentMessageCount: number): void => {
  try {
    const counter = {
      lastActivityMessageCount: currentMessageCount,
      messagesSinceLastActivity: 0
    };
    localStorage.setItem(`activity_counter_${conversationId}`, JSON.stringify(counter));
    console.log(`✅ 更新行为轨迹计数器: ${currentMessageCount}条消息`);
  } catch (e) {
    console.error('更新活动计数器失败:', e);
  }
};

/**
 * 检查是否应该生成新的行为轨迹
 * 🔥 新策略：每50-100条消息生成一次（参考记忆总结机制）
 */
export const shouldGenerateActivity = async (
  conversationId: string,
  currentMessageCount: number,
  activityInterval: number = 75 // 默认每75条消息触发一次
): Promise<boolean> => {
  try {
    const counter = getActivityCounter(conversationId);
    const messagesSince = currentMessageCount - counter.lastActivityMessageCount;
    
    // 达到消息数量阈值，应该生成新活动
    const shouldGenerate = messagesSince >= activityInterval;
    
    if (shouldGenerate) {
      console.log(`💬 已累计 ${messagesSince} 条消息，应该生成新的行为轨迹`);
      // 更新计数器
      updateActivityCounter(conversationId, currentMessageCount);
    }
    
    return shouldGenerate;
  } catch (error) {
    console.error('检查活动生成条件失败:', error);
    return false;
  }
};

/**
 * 定时任务：为所有AI角色生成智能行为轨迹
 * 🔥 改为基于消息数量触发，而不是定时触发
 */
export const startActivityScheduler = (
  conversations: Conversation[],
  apiConfig: ApiConfig,
  _intervalMinutes: number = 90, // 保留参数以兼容，但实际不再使用时间触发
  messageInterval: number = 75 // 每多少条消息触发一次（默认75条）
): NodeJS.Timeout => {
  const checkAndGenerate = async () => {
    console.log('🔄 检查是否需要根据消息数量生成新的行为轨迹...');
    
    for (const conv of conversations) {
      // 只处理私聊且有角色设定的对话
      if (conv.type === 'private' && conv.characterSettings) {
        const should = await shouldGenerateActivity(conv.id, conv.messages.length, messageInterval);
        if (should) {
          await generateSmartActivity(conv, apiConfig);
          // 添加随机延迟，避免所有AI同时更新
          await new Promise(resolve => setTimeout(resolve, Math.random() * 5000));
        }
      }
    }
  };
  
  // 立即执行一次
  checkAndGenerate();
  
  // 🔥 改为每10分钟检查一次消息数量（而不是每90分钟）
  // 这样可以更及时地响应新消息，但只有消息数量达到阈值才会生成
  const intervalId = setInterval(checkAndGenerate, 10 * 60 * 1000);
  
  console.log(`✅ 智能行为轨迹调度器已启动（基于消息数量触发，每${messageInterval}条消息生成一次）`);
  
  return intervalId;
};
