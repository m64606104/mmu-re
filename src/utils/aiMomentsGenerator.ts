/**
 * AI 朋友圈生成器
 * 根据角色设定、聊天记录和时间自动生成朋友圈内容
 */

import { Conversation, MomentsData, MomentPost, ApiConfig } from '../types';
import { smartLoad, smartSave } from './storage';
import { getMemoryBank } from './memory';

const MOMENTS_STORAGE_KEY = 'moments_data';

/**
 * 获取所有朋友圈数据
 */
export const getAllMomentsData = async (): Promise<MomentsData[]> => {
  try {
    const data = await smartLoad(MOMENTS_STORAGE_KEY);
    return data || [];
  } catch (error) {
    console.error('加载朋友圈数据失败:', error);
    return [];
  }
};

/**
 * 获取指定联系人的朋友圈数据
 */
export const getMomentsData = async (contactId: string): Promise<MomentsData> => {
  const allData = await getAllMomentsData();
  const existing = allData.find(d => d.contactId === contactId);
  
  if (existing) {
    return existing;
  }
  
  // 创建新的朋友圈数据
  const newData: MomentsData = {
    contactId,
    posts: [],
    lastGeneratedTime: 0,
    generatedCountToday: 0,
    settings: {
      autoGenerate: true,
      minInterval: 24, // 最少24小时
      maxInterval: 72, // 最多72小时（3天）
      minPostsPerCycle: 1,
      maxPostsPerCycle: 5
    }
  };
  
  await saveMomentsData(newData);
  return newData;
};

/**
 * 保存朋友圈数据
 */
export const saveMomentsData = async (data: MomentsData): Promise<void> => {
  try {
    const allData = await getAllMomentsData();
    const index = allData.findIndex(d => d.contactId === data.contactId);
    
    if (index >= 0) {
      allData[index] = data;
    } else {
      allData.push(data);
    }
    
    await smartSave(MOMENTS_STORAGE_KEY, allData);
  } catch (error) {
    console.error('保存朋友圈数据失败:', error);
  }
};

/**
 * 添加朋友圈帖子
 */
export const addMomentPost = async (contactId: string, post: MomentPost): Promise<void> => {
  const data = await getMomentsData(contactId);
  data.posts.unshift(post);
  
  // 限制最多保存100条
  if (data.posts.length > 100) {
    data.posts = data.posts.slice(0, 100);
  }
  
  await saveMomentsData(data);
};

/**
 * 检查是否应该生成新朋友圈
 */
export const shouldGenerateMoment = async (contactId: string): Promise<boolean> => {
  const data = await getMomentsData(contactId);
  
  if (!data.settings.autoGenerate) {
    return false;
  }
  
  const now = Date.now();
  const hoursSinceLastGeneration = (now - data.lastGeneratedTime) / 3600000;
  
  // 检查是否超过最小间隔
  if (hoursSinceLastGeneration < data.settings.minInterval) {
    return false;
  }
  
  // 在最小和最大间隔之间随机决定
  const randomThreshold = data.settings.minInterval + 
    Math.random() * (data.settings.maxInterval - data.settings.minInterval);
  
  return hoursSinceLastGeneration >= randomThreshold;
};

/**
 * 生成朋友圈提示词
 */
const buildMomentPrompt = (conversation: Conversation): string => {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.toLocaleDateString('zh-CN', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('zh-CN');
  
  // 获取角色设定
  const characterSettings = conversation.characterSettings;
  if (!characterSettings) {
    throw new Error('联系人没有角色设定');
  }
  
  // 获取记忆库
  const memoryBank = getMemoryBank(conversation.id);
  const recentMemories = memoryBank.memories.slice(0, 10);
  
  // 获取最近的聊天记录
  const recentMessages = conversation.messages.slice(-20);
  
  // 构建时间上下文
  let timeContext = `当前时间：${dateStr} ${dayOfWeek} ${hour}:${now.getMinutes()}\n`;
  
  if (hour >= 0 && hour < 6) {
    timeContext += '现在是深夜/凌晨，如果发朋友圈可能是失眠、加班、或者有特殊心情。\n';
  } else if (hour >= 6 && hour < 9) {
    timeContext += '现在是早上，可以发早安、早餐、晨跑等内容。\n';
  } else if (hour >= 9 && hour < 12) {
    timeContext += '现在是上午，可以发工作/学习相关、或者上午的活动。\n';
  } else if (hour >= 12 && hour < 14) {
    timeContext += '现在是中午，可以发午餐、午休相关内容。\n';
  } else if (hour >= 14 && hour < 18) {
    timeContext += '现在是下午，可以发下午茶、工作进展、或者下午的活动。\n';
  } else if (hour >= 18 && hour < 21) {
    timeContext += '现在是傍晚，可以发晚餐、下班、夕阳、傍晚散步等内容。\n';
  } else if (hour >= 21 && hour < 24) {
    timeContext += '现在是晚上，可以发夜宵、夜生活、睡前感想等内容。\n';
  }
  
  // 周末提示
  if (dayOfWeek === '星期六' || dayOfWeek === '星期日') {
    timeContext += '今天是周末，可以发休闲活动、聚会、旅游等内容。\n';
  } else if (dayOfWeek === '星期五') {
    timeContext += '今天是周五，可以发"终于周末了"、"TGIF"等内容。\n';
  }
  
  // 构建记忆上下文
  let memoryContext = '';
  if (recentMemories.length > 0) {
    memoryContext = '\n【你的记忆】\n以下是你记得的一些事情，可以作为朋友圈内容的灵感：\n';
    recentMemories.forEach((memory, index) => {
      memoryContext += `${index + 1}. ${memory.content}\n`;
    });
  }
  
  // 构建聊天上下文
  let chatContext = '';
  if (recentMessages.length > 0) {
    chatContext = '\n【最近的聊天】\n你和用户最近聊了这些内容，可以作为朋友圈灵感：\n';
    const relevantMessages = recentMessages.filter(m => m.role === 'user').slice(-5);
    relevantMessages.forEach((msg, index) => {
      chatContext += `${index + 1}. ${msg.content}\n`;
    });
  }
  
  const prompt = `你是 ${characterSettings.nickname || conversation.name}。

【角色设定】
${characterSettings.systemPrompt || ''}

【性格特点】
${characterSettings.personality || ''}

【说话风格】
${characterSettings.languageStyle || ''}

【语言示例】
${characterSettings.languageExample || ''}

${timeContext}
${memoryContext}
${chatContext}

【任务】
请生成一条符合你性格和当前情境的朋友圈内容。

【要求】
1. **内容要真实自然**：像真人发朋友圈一样，不要太刻意
2. **符合时间情境**：考虑当前的时间、日期、星期几
3. **符合角色身份**：根据你的身份（学生/上班族/研究生等）发布相关内容
4. **可以结合聊天**：如果最近和用户聊了有趣的事，可以发朋友圈提及
5. **可以结合记忆**：如果记忆中有值得分享的事，可以发出来
6. **长度适中**：1-3句话，不要太长
7. **可以带情绪**：开心、吐槽、感慨、撒娇等都可以
8. **不要格式化**：直接输出朋友圈文字内容，不要有"朋友圈："等前缀

现在请生成一条朋友圈内容：`;

  return prompt;
};

/**
 * 生成AI朋友圈
 */
export const generateAIMoment = async (
  conversation: Conversation,
  apiConfig: ApiConfig
): Promise<MomentPost | null> => {
  try {
    console.log(`🎭 开始为 ${conversation.name} 生成朋友圈...`);
    
    // 检查API配置
    if (!apiConfig.baseUrl || !apiConfig.apiKey || !apiConfig.modelName) {
      console.error('❌ API配置不完整');
      return null;
    }
    
    // 构建提示词
    const prompt = buildMomentPrompt(conversation);
    
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
        temperature: 0.9,
        max_tokens: 200
      })
    });
    
    if (!response.ok) {
      console.error('❌ API请求失败:', response.status);
      return null;
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (!content) {
      console.error('❌ API返回内容为空');
      return null;
    }
    
    // 清理内容
    const cleanedContent = content
      .replace(/^["']|["']$/g, '')
      .replace(/^朋友圈[：:]\s*/g, '')
      .trim();
    
    // 创建朋友圈帖子
    const post: MomentPost = {
      id: `moment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      authorId: conversation.id,
      authorName: conversation.characterSettings?.nickname || conversation.name,
      authorAvatar: conversation.characterSettings?.avatar || conversation.avatar,
      content: cleanedContent,
      timestamp: Date.now(),
      likes: [],
      comments: [],
      isRead: false
    };
    
    // 保存到数据库
    await addMomentPost(conversation.id, post);
    
    // 更新生成时间
    const momentsData = await getMomentsData(conversation.id);
    momentsData.lastGeneratedTime = Date.now();
    momentsData.generatedCountToday += 1;
    await saveMomentsData(momentsData);
    
    console.log(`✅ 成功生成朋友圈: ${cleanedContent.substring(0, 30)}...`);
    
    return post;
  } catch (error) {
    console.error('❌ 生成朋友圈失败:', error);
    return null;
  }
};

/**
 * 点赞朋友圈
 */
export const likeMomentPost = async (
  contactId: string,
  postId: string,
  userId: string
): Promise<void> => {
  const data = await getMomentsData(contactId);
  const post = data.posts.find(p => p.id === postId);
  
  if (!post) return;
  
  const likeIndex = post.likes.indexOf(userId);
  if (likeIndex >= 0) {
    post.likes.splice(likeIndex, 1);
  } else {
    post.likes.push(userId);
  }
  
  await saveMomentsData(data);
};

/**
 * 评论朋友圈
 */
export const commentMomentPost = async (
  contactId: string,
  postId: string,
  comment: { authorId: string; authorName: string; authorAvatar?: string; content: string; replyTo?: string; replyToName?: string }
): Promise<void> => {
  const data = await getMomentsData(contactId);
  const post = data.posts.find(p => p.id === postId);
  
  if (!post) return;
  
  const newComment = {
    ...comment,
    id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now()
  };
  
  post.comments.push(newComment);
  await saveMomentsData(data);
};

/**
 * 获取所有朋友圈帖子（用于显示）
 */
export const getAllMomentPosts = async (): Promise<MomentPost[]> => {
  const allData = await getAllMomentsData();
  const allPosts: MomentPost[] = [];
  
  for (const data of allData) {
    allPosts.push(...data.posts);
  }
  
  // 按时间倒序排序
  allPosts.sort((a, b) => b.timestamp - a.timestamp);
  
  return allPosts;
};
