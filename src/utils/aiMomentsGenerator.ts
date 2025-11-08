/**
 * AI 朋友圈生成器
 * 根据角色设定、聊天记录和时间自动生成朋友圈内容
 */

import { Conversation, MomentsData, MomentPost, ApiConfig } from '../types';
import { smartLoad, smartSave } from './storage';
import { getMemoryBank } from './memory';
import { getErrorFromResponse, formatErrorMessage } from './apiErrorHandler';

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
    lastGenerationDate: '',
    todayTargetCount: 0,
    todayGeneratedCount: 0,
    todayPlans: [],
    settings: {
      autoGenerate: true,
      minInterval: 24, // 最少24小时
      maxInterval: 72, // 最多72小时（3天）
      minPostsPerDay: 1,
      maxPostsPerDay: 5
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
 * 返回：{shouldGenerate: boolean, count: number} - 是否应该生成和生成数量
 */
export const shouldGenerateMoment = async (contactId: string): Promise<{shouldGenerate: boolean; count: number}> => {
  const data = await getMomentsData(contactId);
  
  if (!data.settings.autoGenerate) {
    return {shouldGenerate: false, count: 0};
  }
  
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // 检查是否是新的一天
  if (data.lastGenerationDate !== today) {
    // 新的一天，重置计数器
    const hoursSinceLastGeneration = (now - data.lastGeneratedTime) / 3600000;
    
    // 检查是否超过最小间隔（1-3天）
    if (hoursSinceLastGeneration < data.settings.minInterval) {
      return {shouldGenerate: false, count: 0};
    }
    
    // 在最小和最大间隔之间随机决定是否生成
    const randomThreshold = data.settings.minInterval + 
      Math.random() * (data.settings.maxInterval - data.settings.minInterval);
    
    if (hoursSinceLastGeneration >= randomThreshold) {
      // 决定今天生成的数量（1-5条随机）
      const targetCount = data.settings.minPostsPerDay + 
        Math.floor(Math.random() * (data.settings.maxPostsPerDay - data.settings.minPostsPerDay + 1));
      
      // 标记需要生成计划
      data.lastGenerationDate = today;
      data.todayTargetCount = targetCount;
      data.todayGeneratedCount = 0;
      data.todayPlans = []; // 将在生成时由AI规划
      await saveMomentsData(data);
      
      // 返回需要生成第一条
      return {shouldGenerate: true, count: 1};
    }
    
    return {shouldGenerate: false, count: 0};
  } else {
    // 同一天，检查是否还有待发布的朋友圈
    if (data.todayGeneratedCount < data.todayTargetCount) {
      // 直接允许生成，由AI决定发布时间和内容
      return {shouldGenerate: true, count: 1};
    }
    
    return {shouldGenerate: false, count: 0};
  }
};


/**
 * 生成朋友圈提示词
 */
const buildMomentPrompt = (conversation: Conversation, todayPosts: MomentPost[]): string => {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.toLocaleDateString('zh-CN', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('zh-CN');
  
  // 获取角色设定（允许不完整）
  const characterSettings = conversation.characterSettings;
  if (!characterSettings) {
    throw new Error('联系人没有角色设定');
  }
  
  // 只使用已填写的字段，未填写的完全略过
  const nickname = characterSettings.nickname;
  
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
  
  // 构建角色信息部分（只包含已填写的字段）
  let characterInfo = `你是 ${nickname}。\n`;
  
  if (characterSettings.systemPrompt) {
    characterInfo += `\n【角色设定】\n${characterSettings.systemPrompt}\n`;
  }
  
  if (characterSettings.personality) {
    characterInfo += `\n【性格特点】\n${characterSettings.personality}\n`;
  }
  
  if (characterSettings.languageStyle) {
    characterInfo += `\n【说话风格】\n${characterSettings.languageStyle}\n`;
  }
  
  if (characterSettings.languageExample) {
    characterInfo += `\n【语言示例】\n${characterSettings.languageExample}\n`;
  }
  
  const prompt = `${characterInfo}
${timeContext}
${memoryContext}
${chatContext}

【今天已发的朋友圈】
${todayPosts.length > 0 ? todayPosts.map((p, i) => {
  const postTime = new Date(p.timestamp);
  const timeStr = `${postTime.getHours()}:${postTime.getMinutes().toString().padStart(2, '0')}`;
  return `${i + 1}. [${timeStr}] ${p.content}${p.imageDescriptions ? ` [配图${p.imageDescriptions.length}张]` : ''}`;
}).join('\n') : '今天还没发过朋友圈'}

【任务】
根据你的角色设定、当前时间情境、以及今天已发的朋友圈（如有），决定下一条朋友圈的内容和发布时间。

【重要说明】
- **内容完全自由**：可以与已发内容相关，也可以完全不相关，由你自己决定
- **时间完全自由**：可以紧接着上一条发，也可以间隔几小时，由你自己决定
- **唯一要求**：内容和时间都要符合你的角色身份、当前日期和时间情境

【发布时间参考（仅供参考，不是限制）】
1. **符合身份和情境**：
   - 上班族：可能在上班路上、午休、下班时、晚上等任何时间发
   - 学生：可能在课间、吃饭时、放学后、周末等任何时间发
   - 如果是周末活动（演唱会、旅行等），时间要符合活动进程
2. **内容关联**：
   - 同一话题：可以连续发（如演唱会现场→演唱会照片）
   - 不同话题：可以间隔发（如早上发早餐→晚上发加班）
3. **真实自然**：像真人一样自由选择，想什么时候发就什么时候发

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
必须按以下格式输出，第一行是时间，第二行空行，第三行开始是朋友圈内容：

时间：HH:MM

朋友圈文字内容
[图片1:图片描述]
[图片2:图片描述]
...

示例1（纯文字）：
时间：18:30

今天又被老板留下加班了😤 说好的准时下班呢...

示例2（带图片）：
时间：22:15

终于下班了！路边买杯咖啡放松一下✨
[图片1:手拿咖啡杯，背景是夜晚的街道灯光]
[图片2:咖啡拉花特写，心形图案]

【图片数量规范】
根据内容需要，你可以自由决定发送1-9张图片：
- 1张图：适合单一主体（风景、自拍、重点物品等）
- 2张图：适合对比、前后对照
- 3张图：适合记录多个相关场景
- 4张图：2x2网格，四宫格形式
- 5-6张图：记录较丰富的日常、活动
- 7-9张图：记录非常丰富的旅行、聚会、展览等
- 不要每次都发满9张，根据实际内容决定合适的图片数量

【图片描述要求 - 非常重要】
⚠️ 图片描述必须详细、生动、具体，禁止简略！

- 每个描述控制在30-80字，要足够详细
- 必须包含：具体场景、细节元素、色彩搭配、光影效果、环境氛围
- 用丰富的形容词和细节描写，让人如临其境、能在脑海中清晰浮现画面
- 描述要贴合你的身份、性格和当时的情境
- 可以描写：环境、物品、人物外观、动作、光线、色调、质感等
- ⚠️ 禁止描写个人情感和主观感受（如"我觉得"、"让我感到"等）
- ⚠️ 自拍类图片必须用第三人称视角描述（如"一个穿着...的女孩"），禁止使用"我"

✅ 优秀示例（详细、生动、有画面感）：
  * "金色的夕阳将整片海滩染成温暖的橙红色，海浪轻柔地拍打着沙滩，远处几只海鸥在渐变的天空中翱翔，天际线上的云朵像被镀上了一层金边，整个画面宁静而浪漫"
  * "咖啡店靠窗的木质长桌上，一杯拉花精致的卡布奇诺冒着袅袅热气，旁边摊开着笔记本电脑和几本翻开的书籍，午后的阳光透过百叶窗在桌面投下斑驳的光影，空气中弥漫着咖啡的香气"
  * "慵懒的橘色短毛猫蜷成一团窝在米色沙发上，半眯着眼睛享受着从窗户洒进来的温暖阳光，它的尾巴轻轻搭在身侧，毛发在光线下泛着柔和的金色光泽，整个画面温馨治愈"
  * "实验室的显微镜下，细胞切片在荧光染色后呈现出梦幻般的蓝紫色光芒，细胞核清晰可见，周围的细胞质散发着柔和的荧光，黑色背景衬托下显得格外神秘而美丽"
  * "图书馆自习区靠窗的座位上，专业书籍和笔记本堆成小山，书页间夹着五颜六色的便签纸，黄色的荧光笔标记出重点内容，旁边放着半杯咖啡和一盏暖黄色的台灯，浓郁的学习氛围扑面而来"
  * "傍晚的城市天际线在暮色中轮廓分明，摩天大楼的玻璃幕墙反射着落日余晖，从橙色渐变到深蓝的天空中，几颗星星已经悄然浮现，城市的灯光开始点亮，整座城市在白天与黑夜的交替中显得格外迷人"
  * "健身房的镜子前，跑步机的数字屏幕显示着运动数据，汗水浸湿的毛巾搭在扶手上，旁边的运动水杯里还剩半瓶水，镜子里映出认真锻炼的身影，明亮的灯光下每一滴汗水都闪着光"
  * "书桌上整齐摆放着各式护肤品，透明的精华液瓶、白色的乳霜罐、粉色的面霜盒在柔和的灯光下泛着温润的光泽，背景是简约的圆形化妆镜，镜面倒映出这些瓶瓶罐罐，散发着精致的生活气息"
  * "街头花店门口的木质花架上，摆满了五颜六色的鲜花：粉色的玫瑰、黄色的向日葵、紫色的薰衣草、白色的百合，花朵在阳光下显得格外娇艳，空气中弥漫着馥郁的花香"
  * "一个穿着白色背带裤的女孩站在游乐园前，双手拿着五颜六色的气球，脸颊上沾着一点奶油，阳光下她的笑容明媚灿烂，背景是旋转木马和摩天轮"
  * "镜头前的女生穿着淡蓝色的连衣裙，长发披散在肩上，手里捧着一杯草莓奶昔，粉色的吸管探出杯口，背景是咖啡店的木质墙面和绿植装饰"

❌ 错误示例（太简略、不生动）：
  * "海边的夕阳" ← 太简略
  * "咖啡和书" ← 缺少细节
  * "一只猫" ← 没有画面感
  * "实验室照片" ← 完全不具体

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
    
    // 读取今天已发的朋友圈
    const momentsData = await getMomentsData(conversation.id);
    const today = new Date().toISOString().split('T')[0];
    const todayPosts = momentsData.posts.filter(post => {
      const postDate = new Date(post.timestamp).toISOString().split('T')[0];
      return postDate === today;
    });
    
    console.log(`📅 今天已发 ${todayPosts.length} 条朋友圈`);
    
    // 构建提示词
    const prompt = buildMomentPrompt(conversation, todayPosts);
    
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
      const errorInfo = await getErrorFromResponse(response);
      console.error('✅ 朋友圈生成失败:', formatErrorMessage(errorInfo));
      return null;
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (!content) {
      console.error('❌ API返回内容为空');
      return null;
    }
    
    // 解析AI返回的时间和内容
    const timeMatch = content.match(/时间[：:]\s*(\d{1,2}):(\d{2})/);
    let scheduledTime = Date.now();
    
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const now = new Date();
      const scheduled = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
      scheduledTime = scheduled.getTime();
      console.log(`⏰ AI决定的发布时间: ${hours}:${minutes}`);
    }
    
    // 清理内容并解析图片描述
    // 按行分割，移除时间行，保留其他所有内容
    const lines = content.split('\n');
    const contentLines: string[] = [];
    const imageDescriptions: string[] = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 跳过时间行
      if (trimmedLine.match(/^时间[：:]\s*\d{1,2}:\d{2}/)) {
        continue;
      }
      
      // 跳过空行
      if (!trimmedLine) {
        continue;
      }
      
      // 提取图片描述
      const imagePattern = /\[图片\d*[:：]([^\]]+)\]/g;
      let match;
      let hasImage = false;
      
      while ((match = imagePattern.exec(trimmedLine)) !== null) {
        imageDescriptions.push(match[1].trim());
        hasImage = true;
      }
      
      // 移除图片标记后的内容
      let cleanedLine = trimmedLine.replace(/\[图片\d*[:：][^\]]+\]/g, '').trim();
      
      // 如果不是纯图片行，保留文字内容
      if (cleanedLine || !hasImage) {
        contentLines.push(cleanedLine);
      }
    }
    
    // 合并内容行
    let cleanedContent = contentLines.join('\n').trim();
    
    // 最后清理：移除开头的引号和"朋友圈："前缀
    cleanedContent = cleanedContent
      .replace(/^["'「『]+|["'」』]+$/g, '')
      .replace(/^朋友圈[：:]\s*/g, '')
      .trim();
    
    // 🔧 容错：如果清理后内容为空或只剩下"时间"之类的，使用原始内容
    if (!cleanedContent || cleanedContent.length < 3 || cleanedContent.match(/^时间[：:]/)) {
      console.warn('⚠️ 清理后内容为空或异常，使用原始内容');
      cleanedContent = content
        .replace(/时间[：:]\s*\d{1,2}:\d{2}\s*/g, '')
        .replace(/\[图片\d*[:：][^\]]+\]/g, '')
        .trim();
    }
    
    // 创建朋友圈帖子
    const post: MomentPost = {
      id: `moment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      authorId: conversation.id,
      authorName: conversation.characterSettings?.nickname || conversation.name,
      authorAvatar: conversation.characterSettings?.avatar || conversation.avatar,
      content: cleanedContent,
      imageDescriptions: imageDescriptions.length > 0 ? imageDescriptions : undefined,
      contentType: imageDescriptions.length > 0 ? 'images' : 'text',
      timestamp: scheduledTime,
      likes: [],
      comments: [],
      isRead: false
    };
    
    // 保存到数据库
    await addMomentPost(conversation.id, post);
    
    // 更新生成时间和计数
    const updatedMomentsData = await getMomentsData(conversation.id);
    updatedMomentsData.lastGeneratedTime = Date.now();
    updatedMomentsData.todayGeneratedCount += 1;
    await saveMomentsData(updatedMomentsData);
    
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
 * 删除朋友圈
 */
export const deleteMomentPost = async (
  contactId: string,
  postId: string
): Promise<void> => {
  const data = await getMomentsData(contactId);
  const postIndex = data.posts.findIndex(p => p.id === postId);
  
  if (postIndex < 0) return;
  
  // 从朋友圈列表中删除
  data.posts.splice(postIndex, 1);
  
  // 更新今天的生成计数
  data.todayGeneratedCount = Math.max(0, data.todayGeneratedCount - 1);
  
  await saveMomentsData(data);
  
  // TODO: 从AI的记忆库中删除相关记忆
  // 这里可以扩展删除记忆的逻辑
  console.log(`✅ 已删除朋友圈: ${postId}`);
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
 * AI智能互动：模拟真实的人类行为
 * - 不是所有AI都会看到
 * - 看到了也不一定互动
 * - 互动概率基于性格和内容
 * - 随机延迟模拟真实时间差
 */
export const generateAIMomentsInteraction = async (
  conversations: Conversation[],
  apiConfig: ApiConfig
): Promise<void> => {
  try {
    const allMomentsData = await getAllMomentsData();
    if (allMomentsData.length === 0) return;

    // 获取所有AI角色
    const aiConversations = conversations.filter(c => c.type === 'private' && c.characterSettings);
    if (aiConversations.length < 2) return;

    // 🎯 随机选择几个"在线"的AI（不是所有AI都在看朋友圈）
    const onlineAICount = Math.floor(Math.random() * Math.min(3, aiConversations.length)) + 1;
    const shuffledAIs = [...aiConversations].sort(() => Math.random() - 0.5);
    const onlineAIs = shuffledAIs.slice(0, onlineAICount);
    
    console.log(`👥 当前有 ${onlineAICount} 个AI在线查看朋友圈`);

    // 收集所有未读的朋友圈
    const unreadPosts: Array<{ post: MomentPost; author: Conversation; momentsData: any }> = [];
    
    for (const momentsData of allMomentsData) {
      const authorConv = aiConversations.find(c => c.id === momentsData.contactId);
      if (!authorConv) continue;

      // 获取最近24小时内的未读朋友圈
      const recentPosts = momentsData.posts.filter(post => {
        const hoursSincePost = (Date.now() - post.timestamp) / 3600000;
        return hoursSincePost < 24 && !post.isRead;
      });

      for (const post of recentPosts) {
        unreadPosts.push({ post, author: authorConv, momentsData });
      }
    }

    if (unreadPosts.length === 0) {
      console.log('📭 没有未读的朋友圈');
      return;
    }

    console.log(`📬 发现 ${unreadPosts.length} 条未读朋友圈`);

    // 🎯 只处理部分朋友圈（模拟真实情况：不是每条都会看到）
    const postsToProcess = unreadPosts.slice(0, Math.min(5, unreadPosts.length));

    // 遍历朋友圈，让在线的AI智能互动
    for (const { post, author, momentsData } of postsToProcess) {
      // 其他在线的AI
      const otherOnlineAIs = onlineAIs.filter(ai => ai.id !== author.id);
      
      for (const ai of otherOnlineAIs) {
        // 🎯 基于内容决定是否互动（而不是固定30%）
        // 有图片的朋友圈更容易吸引互动
        const hasImages = post.imageDescriptions && post.imageDescriptions.length > 0;
        const baseInterestRate = hasImages ? 0.5 : 0.3;
        
        // 内容长度也影响互动率（太长可能懒得看）
        const contentLength = post.content.length;
        const lengthFactor = contentLength < 50 ? 1.2 : contentLength > 200 ? 0.7 : 1.0;
        
        const interestRate = Math.min(0.8, baseInterestRate * lengthFactor);
        
        if (Math.random() > interestRate) {
          continue; // 不感兴趣，跳过
        }

        console.log(`👀 ${ai.characterSettings?.nickname || ai.name} 看到了 ${author.characterSettings?.nickname || author.name} 的朋友圈`);

        // 🎯 决定互动类型（点赞更容易，评论需要更多精力）
        // 70%点赞，30%评论
        const willComment = Math.random() < 0.3;

        if (willComment) {
          // 评论（更少见，更有意义）
          const hasCommented = post.comments.some(c => c.authorId === ai.id);
          if (hasCommented) continue;

          console.log(`💬 ${ai.characterSettings?.nickname || ai.name} 正在评论...`);
          
          // 生成AI评论
          const comment = await generateAIComment(post, author, ai, apiConfig);
          if (comment) {
            await commentMomentPost(momentsData.contactId, post.id, {
              authorId: ai.id,
              authorName: ai.characterSettings?.nickname || ai.name,
              authorAvatar: ai.characterSettings?.avatar || ai.avatar,
              content: comment
            });
            console.log(`✅ 评论成功: ${comment.substring(0, 20)}...`);
          }
        } else {
          // 点赞（更常见）
          if (!post.likes.includes(ai.id)) {
            await likeMomentPost(momentsData.contactId, post.id, ai.id);
            console.log(`❤️ ${ai.characterSettings?.nickname || ai.name} 点赞了`);
          }
        }

        // 🎯 随机延迟0-2秒再处理下一个（模拟真实查看速度）
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000));
      }

      // 标记为已读
      post.isRead = true;
    }

    // 保存所有更新
    for (const momentsData of allMomentsData) {
      await saveMomentsData(momentsData);
    }

    console.log('✅ AI互动完成');
  } catch (error) {
    console.error('❌ AI朋友圈互动失败:', error);
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
