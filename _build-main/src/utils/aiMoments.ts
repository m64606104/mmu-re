import { ApiConfig, Conversation, MomentPost } from '../types';
import { getCachedData, load, save, setCachedData } from './storage';
import { buildApiUrl } from './apiHelper';

// AI自动发朋友圈配置
export interface AIMomentsConfig {
  enabled: boolean;
  minDays: number; // 最小间隔（天）
  maxDays: number; // 最大间隔（天）
  minPostsPerCycle: number; // 每周期最小发布数
  maxPostsPerCycle: number; // 每周期最大发布数
}

// 默认配置
export const DEFAULT_AI_MOMENTS_CONFIG: AIMomentsConfig = {
  enabled: true,
  minDays: 1,
  maxDays: 3,
  minPostsPerCycle: 1,
  maxPostsPerCycle: 5,
};

// 获取当前时间信息
const getTimeContext = (): string => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  
  let timeContext = `当前时间：${dayNames[day]} ${hour}:${now.getMinutes().toString().padStart(2, '0')}\n`;
  
  // 时间段描述
  if (hour >= 6 && hour < 9) {
    timeContext += '时间段：早晨';
  } else if (hour >= 9 && hour < 12) {
    timeContext += '时间段：上午';
  } else if (hour >= 12 && hour < 14) {
    timeContext += '时间段：中午';
  } else if (hour >= 14 && hour < 18) {
    timeContext += '时间段：下午';
  } else if (hour >= 18 && hour < 22) {
    timeContext += '时间段：晚上';
  } else {
    timeContext += '时间段：深夜';
  }
  
  // 特殊日期提示
  if (day === 5) {
    timeContext += '\n特殊提示：今天是周五，明天周末';
  } else if (day === 0) {
    timeContext += '\n特殊提示：今天是周日，明天要上班/上学';
  } else if (day === 6) {
    timeContext += '\n特殊提示：今天是周六，周末';
  }
  
  return timeContext;
};

// 生成朋友圈内容的提示词
export const generateMomentPrompt = (
  conversation: Conversation,
  recentMessages?: string
): string => {
  const settings = conversation.characterSettings;
  
  let prompt = `你是${settings?.nickname || conversation.name}。`;
  
  if (settings?.systemPrompt) {
    prompt += `\n人物背景：${settings.systemPrompt}`;
  }
  
  if (settings?.personality) {
    prompt += `\n性格特征：${settings.personality}`;
  }
  
  if (settings?.languageStyle) {
    prompt += `\n说话风格：${settings.languageStyle}`;
  }
  
  // 添加时间上下文
  prompt += `\n\n${getTimeContext()}`;
  
  // 添加最近聊天内容
  if (recentMessages) {
    prompt += `\n\n最近聊天内容：\n${recentMessages}`;
  }
  
  prompt += `\n\n请生成一条朋友圈动态内容。要求：
1. 根据你的性格、背景和身份
2. 结合当前时间和日期，发布符合时间场景的内容
3. 如果有最近聊天内容，可以自然地提及或延伸（比如撒娇、吐槽、分享感受）
4. 内容类型可以是：
   - 日常分享（工作、学习、生活）
   - 心情感悟
   - 有趣见闻
   - 美食美景
   - 吐槽抱怨
   - 撒娇卖萌
   - 周末计划
5. 内容要真实、自然、有趣
6. 长度：1-3句话，30-100字
7. 可以使用emoji表情
8. 要生活化，不要太正式
9. 可以提问、感叹、分享

只返回朋友圈内容，不要其他说明。`;

  return prompt;
};

// 调用API生成朋友圈内容
export const generateAIMomentContent = async (
  conversation: Conversation,
  apiConfig: ApiConfig,
  recentMessages?: string
): Promise<string> => {
  if (!apiConfig.baseUrl || !apiConfig.apiKey || !apiConfig.modelName) {
    throw new Error('API配置不完整');
  }

  const prompt = generateMomentPrompt(conversation, recentMessages);

  try {
    const response = await fetch(buildApiUrl(apiConfig), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: '请发布一条朋友圈' },
        ],
        temperature: 0.9,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error('API请求失败');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '今天天气真好~';
  } catch (error) {
    console.error('生成朋友圈内容失败:', error);
    throw error;
  }
};

// 生成AI评论
export const generateAIComment = async (
  conversation: Conversation,
  momentContent: string,
  apiConfig: ApiConfig
): Promise<string> => {
  if (!apiConfig.baseUrl || !apiConfig.apiKey || !apiConfig.modelName) {
    throw new Error('API配置不完整');
  }

  const settings = conversation.characterSettings;
  
  let prompt = `你是${settings?.nickname || conversation.name}。`;
  
  if (settings?.personality) {
    prompt += `\n性格：${settings.personality}`;
  }
  
  if (settings?.languageStyle) {
    prompt += `\n说话风格：${settings.languageStyle}`;
  }
  
  prompt += `\n\n对方发了一条朋友圈：
"${momentContent}"

请以你的身份发表一条评论。要求：
1. 评论要简短、自然
2. 可以是：点赞、共鸣、调侃、关心、提问等
3. 1-2句话即可
4. 可以使用emoji
5. 要符合你的性格和说话风格

只返回评论内容，不要其他说明。`;

  try {
    const response = await fetch(buildApiUrl(apiConfig), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: '请发表评论' },
        ],
        temperature: 0.9,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      throw new Error('API请求失败');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '👍';
  } catch (error) {
    console.error('生成AI评论失败:', error);
    throw error;
  }
};

// 检查是否应该触发AI发朋友圈
export const shouldTriggerAIMoment = (
  conversationId: string,
  config: AIMomentsConfig
): boolean => {
  if (!config.enabled) return false;
  
  const cycleData = getMomentCycleData(conversationId);
  const now = Date.now();
  const daysSinceLastCycle = (now - cycleData.cycleStartTime) / 1000 / 60 / 60 / 24;
  
  // 如果超过最大天数，开始新周期
  if (daysSinceLastCycle >= config.maxDays) {
    resetMomentCycle(conversationId);
    return true;
  }
  
  // 如果在周期内且还没达到目标发布数
  if (daysSinceLastCycle >= config.minDays && cycleData.postsInCycle < cycleData.targetPosts) {
    // 计算剩余时间和剩余发布数，决定是否发布
    const remainingDays = config.maxDays - daysSinceLastCycle;
    const remainingPosts = cycleData.targetPosts - cycleData.postsInCycle;
    const shouldPost = Math.random() < (remainingPosts / (remainingDays * 24)); // 按小时计算概率
    return shouldPost;
  }
  
  return false;
};

// 检查是否应该AI评论
export const shouldAIComment = (
  moment: MomentPost,
  conversationId: string
): boolean => {
  // 不评论自己的朋友圈
  if (moment.userId === conversationId) return false;
  
  // 已经评论过的不再评论
  const hasCommented = moment.comments.some(c => c.userId === conversationId);
  if (hasCommented) return false;
  
  // 用户的朋友圈：30%概率评论
  // 其他AI的朋友圈：20%概率评论
  const probability = moment.userId === 'user' ? 0.3 : 0.2;
  return Math.random() < probability;
};

// 检查是否应该AI点赞
export const shouldAILike = (
  moment: MomentPost,
  conversationId: string
): boolean => {
  // 不点赞自己的朋友圈
  if (moment.userId === conversationId) return false;
  
  // 已经点赞过的不再点赞
  if (moment.likes.includes(conversationId)) return false;
  
  // 50%概率点赞
  return Math.random() < 0.5;
};

// 周期数据接口
interface MomentCycleData {
  cycleStartTime: number;
  postsInCycle: number;
  targetPosts: number;
}

// 获取周期数据
export const getMomentCycleData = (conversationId: string): MomentCycleData => {
  const cycles = (getCachedData<Record<string, MomentCycleData>>('momentCycles') || {}) as Record<string, MomentCycleData>;
  
  if (!cycles[conversationId]) {
    // 初始化新周期
    const targetPosts = Math.floor(
      Math.random() * (DEFAULT_AI_MOMENTS_CONFIG.maxPostsPerCycle - DEFAULT_AI_MOMENTS_CONFIG.minPostsPerCycle + 1)
    ) + DEFAULT_AI_MOMENTS_CONFIG.minPostsPerCycle;
    
    cycles[conversationId] = {
      cycleStartTime: Date.now(),
      postsInCycle: 0,
      targetPosts,
    };
    setCachedData('momentCycles', cycles);
    void save('momentCycles', cycles);
  }
  
  return cycles[conversationId];
};

// 重置周期
export const resetMomentCycle = (conversationId: string) => {
  const cycles = (getCachedData<Record<string, MomentCycleData>>('momentCycles') || {}) as Record<string, MomentCycleData>;
  
  const targetPosts = Math.floor(
    Math.random() * (DEFAULT_AI_MOMENTS_CONFIG.maxPostsPerCycle - DEFAULT_AI_MOMENTS_CONFIG.minPostsPerCycle + 1)
  ) + DEFAULT_AI_MOMENTS_CONFIG.minPostsPerCycle;
  
  cycles[conversationId] = {
    cycleStartTime: Date.now(),
    postsInCycle: 0,
    targetPosts,
  };
  
  setCachedData('momentCycles', cycles);
  void save('momentCycles', cycles);
};

// 增加发布计数
export const incrementPostCount = (conversationId: string) => {
  const cycles = (getCachedData<Record<string, MomentCycleData>>('momentCycles') || {}) as Record<string, MomentCycleData>;
  
  if (cycles[conversationId]) {
    cycles[conversationId].postsInCycle += 1;
    setCachedData('momentCycles', cycles);
    void save('momentCycles', cycles);
  }
};

export async function initializeAIMomentsState(): Promise<void> {
  try {
    const cycles = await load('momentCycles');
    setCachedData('momentCycles', cycles && typeof cycles === 'object' ? cycles : {});
  } catch (error) {
    console.error('初始化朋友圈周期存储失败:', error);
    setCachedData('momentCycles', {});
  }
}

// 获取最近聊天内容
export const getRecentChatContext = (conversation: Conversation, limit: number = 10): string => {
  const recentMessages = conversation.messages.slice(-limit);
  if (recentMessages.length === 0) return '';
  
  return recentMessages
    .map(m => `${m.role === 'user' ? '对方' : '我'}：${m.content}`)
    .join('\n');
};
