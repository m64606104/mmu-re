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
 * 获取今天的日期字符串（YYYY-MM-DD格式）
 */
const getTodayDateString = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/**
 * 生成当天的随机发布时间点
 */
const generateTodaySchedule = (count: number): number[] => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = todayStart + 24 * 3600000;
  const currentTime = Date.now();
  
  // 生成count个随机时间点（在当前时间到今天结束之间）
  const times: number[] = [];
  for (let i = 0; i < count; i++) {
    const randomTime = currentTime + Math.random() * (todayEnd - currentTime);
    times.push(randomTime);
  }
  
  // 排序时间点
  times.sort((a, b) => a - b);
  return times;
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
  const today = getTodayDateString();
  
  // 检查是否是新的一天
  if (data.lastGenerationDate !== today) {
    // 新的一天，检查是否应该开始新周期
    const hoursSinceLastGeneration = (now - data.lastGeneratedTime) / 3600000;
    
    // 如果距离上次生成超过最小间隔，决定是否开始新周期
    if (hoursSinceLastGeneration >= data.settings.minInterval) {
      const randomThreshold = data.settings.minInterval + 
        Math.random() * (data.settings.maxInterval - data.settings.minInterval);
      
      if (hoursSinceLastGeneration >= randomThreshold) {
        // 开始新周期，决定今天要发几条（1-5条随机）
        const plannedCount = Math.floor(
          Math.random() * (data.settings.maxPostsPerCycle - data.settings.minPostsPerCycle + 1)
        ) + data.settings.minPostsPerCycle;
        
        // 生成今天的发布时间表
        const schedule = generateTodaySchedule(plannedCount);
        
        // 更新数据
        data.lastGenerationDate = today;
        data.todayPlannedCount = plannedCount;
        data.generatedCountToday = 0;
        data.nextScheduledTime = schedule[0]; // 设置第一条的时间
        await saveMomentsData(data);
        
        console.log(`📅 ${contactId} 新周期开始：今天计划发${plannedCount}条朋友圈`);
        
        // 检查第一条是否应该现在发
        return now >= schedule[0];
      }
    }
    return false;
  }
  
  // 同一天，检查是否还有未发的朋友圈
  if (data.todayPlannedCount && data.generatedCountToday < data.todayPlannedCount) {
    // 检查是否到了计划的发布时间
    if (data.nextScheduledTime && now >= data.nextScheduledTime) {
      return true;
    }
  }
  
  return false;
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
9. **可以配图片**：如果内容适合配图（如风景、美食、自拍、宠物等），可以在内容后添加图片描述

【输出格式】
方式1（纯文字）：直接输出朋友圈文字
方式2（带图片）：
文字内容
[图片1:图片描述，简短但具体，如"星空下的圣诞树"]
[图片2:图片描述]
[图片3:图片描述]
...

【图片数量规范】
- 1张图：适合单一主体的内容（风景、自拍、重点物品等）
- 2张图：适合对比、前后对照等
- 3张图：适合记录多个相关场景
- 4张图：2x2网格，适合四宫格形式
- 5-9张图：适合记录丰富的日常、旅行、活动等
- 最多9张图（微信朋友圈的上限）

【图片描述要求】
- 每个描述控制在10-30字
- 描述要具体、生动，能让人想象出画面
- 可以包含：场景、物品、人物、氛围、色彩等
- 示例：
  * "夕阳西下的海边，天空渐变成橙红色"
  * "咖啡店角落的落地窗，阳光洒在书上"
  * "毛茸茸的橘猫蜷缩在沙发上睡觉"

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
    
    // 清理内容并解析图片描述
    let cleanedContent = content
      .replace(/^["']|["']$/g, '')
      .replace(/^朋友圈[：:]\s*/g, '')
      .trim();
    
    // 提取图片描述
    const imageDescriptions: string[] = [];
    const imagePattern = /\[图片\d*[:：]([^\]]+)\]/g;
    let match;
    
    while ((match = imagePattern.exec(cleanedContent)) !== null) {
      imageDescriptions.push(match[1].trim());
    }
    
    // 移除图片标记，只保留文字内容
    cleanedContent = cleanedContent
      .replace(imagePattern, '')
      .trim();
    
    // 创建朋友圈帖子
    const post: MomentPost = {
      id: `moment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      authorId: conversation.id,
      authorName: conversation.characterSettings?.nickname || conversation.name,
      authorAvatar: conversation.characterSettings?.avatar || conversation.avatar,
      content: cleanedContent,
      imageDescriptions: imageDescriptions.length > 0 ? imageDescriptions : undefined,
      contentType: imageDescriptions.length > 0 ? 'images' : 'text',
      timestamp: Date.now(),
      likes: [],
      comments: [],
      isRead: false
    };
    
    // 保存到数据库
    await addMomentPost(conversation.id, post);
    
    // 更新生成时间和计数
    const momentsData = await getMomentsData(conversation.id);
    momentsData.lastGeneratedTime = Date.now();
    momentsData.generatedCountToday += 1;
    
    // 如果今天还有未发的朋友圈，计算下次发布时间
    if (momentsData.todayPlannedCount && momentsData.generatedCountToday < momentsData.todayPlannedCount) {
      const remaining = momentsData.todayPlannedCount - momentsData.generatedCountToday;
      const schedule = generateTodaySchedule(remaining);
      momentsData.nextScheduledTime = schedule[0];
      console.log(`⏰ 下次发布时间: ${new Date(schedule[0]).toLocaleTimeString('zh-CN')}`);
    } else {
      momentsData.nextScheduledTime = undefined;
      console.log(`✨ 今天的朋友圈已全部发布完成`);
    }
    
    await saveMomentsData(momentsData);
    
    console.log(`✅ 成功生成朋友圈 (${momentsData.generatedCountToday}/${momentsData.todayPlannedCount || 1}): ${cleanedContent.substring(0, 30)}...`);
    
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

/**
 * AI互动：随机点赞或评论其他AI的朋友圈
 */
export const generateAIMomentsInteraction = async (
  conversations: Conversation[],
  apiConfig: ApiConfig
): Promise<void> => {
  try {
    const allMomentsData = await getAllMomentsData();
    if (allMomentsData.length === 0) return;

    // 获取所有AI角色（排除用户）
    const aiConversations = conversations.filter(c => c.type === 'private' && c.characterSettings);
    if (aiConversations.length < 2) return; // 至少需要2个AI才能互动

    // 遍历所有朋友圈
    for (const momentsData of allMomentsData) {
      const authorConv = aiConversations.find(c => c.id === momentsData.contactId);
      if (!authorConv) continue;

      // 获取最近的朋友圈（24小时内的）
      const recentPosts = momentsData.posts.filter(post => {
        const hoursSincePost = (Date.now() - post.timestamp) / 3600000;
        return hoursSincePost < 24 && !post.isRead;
      });

      for (const post of recentPosts) {
        // 其他AI有30%的概率看到并互动
        const otherAIs = aiConversations.filter(c => c.id !== momentsData.contactId);
        
        for (const otherAI of otherAIs) {
          if (Math.random() > 0.3) continue; // 30%概率

          const interactionType = Math.random();
          
          if (interactionType < 0.5) {
            // 50%概率点赞
            if (!post.likes.includes(otherAI.id)) {
              await likeMomentPost(momentsData.contactId, post.id, otherAI.id);
            }
          } else {
            // 50%概率评论
            // 检查是否已经评论过
            const hasCommented = post.comments.some(c => c.authorId === otherAI.id);
            if (hasCommented) continue;

            // 生成AI评论
            const comment = await generateAIComment(post, authorConv, otherAI, apiConfig);
            if (comment) {
              await commentMomentPost(momentsData.contactId, post.id, {
                authorId: otherAI.id,
                authorName: otherAI.characterSettings?.nickname || otherAI.name,
                authorAvatar: otherAI.characterSettings?.avatar || otherAI.avatar,
                content: comment
              });
            }
          }
        }

        // 标记为已读
        post.isRead = true;
      }

      await saveMomentsData(momentsData);
    }
  } catch (error) {
    console.error('AI朋友圈互动失败:', error);
  }
};

/**
 * 生成AI评论内容
 */
const generateAIComment = async (
  post: MomentPost,
  authorConv: Conversation,
  commenterConv: Conversation,
  apiConfig: ApiConfig
): Promise<string | null> => {
  try {
    const commenterSettings = commenterConv.characterSettings;
    if (!commenterSettings) return null;

    const prompt = `你是 ${commenterSettings.nickname || commenterConv.name}。

【你的性格】
${commenterSettings.personality || ''}

【你的说话风格】
${commenterSettings.languageStyle || ''}

【朋友圈内容】
${authorConv.characterSettings?.nickname || authorConv.name} 发了一条朋友圈：
${post.content}
${post.imageDescriptions ? `配图：${post.imageDescriptions.join('、')}` : ''}

【任务】
请以你的性格和说话风格，对这条朋友圈发表一个简短的评论。

【要求】
1. 1-2句话即可，不要太长
2. 要符合你的性格和说话风格
3. 像真实朋友间的互动，自然、真诚
4. 可以是赞美、调侃、共鸣、建议等
5. 不要说"发得真好"这种空话
6. 直接输出评论内容，不要有前缀

现在请评论：`;

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
        max_tokens: 100
      })
    });

    if (!response.ok) return null;

    const data = await response.json();
    const comment = data.choices?.[0]?.message?.content?.trim();

    return comment || null;
  } catch (error) {
    console.error('生成AI评论失败:', error);
    return null;
  }
};
