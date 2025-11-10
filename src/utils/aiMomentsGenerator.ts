/**
 * AI 朋友圈生成器
 * 根据角色设定、聊天记录和时间自动生成朋友圈内容
 */

import { Conversation, MomentsData, MomentPost, ApiConfig } from '../types';
import { smartLoad, smartSave } from './storage';
import { getMemoryBank } from './memory';
import { getErrorFromResponse, formatErrorMessage } from './apiErrorHandler';
import { SmartMomentsGenerator } from './smartMomentsSystem';

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
  // 🎯 特殊处理：如果是用户的朋友圈
  if (contactId === 'user') {
    try {
      const userMomentsStr = localStorage.getItem('moments');
      const userMoments: MomentPost[] = userMomentsStr ? JSON.parse(userMomentsStr) : [];
      
      return {
        contactId: 'user',
        posts: userMoments,
        lastGeneratedTime: 0,
        lastGenerationDate: '',
        todayTargetCount: 0,
        todayGeneratedCount: 0,
        todayPlans: [],
        settings: {
          autoGenerate: false,
          minInterval: 0,
          maxInterval: 0,
          minPostsPerDay: 0,
          maxPostsPerDay: 0
        }
      };
    } catch (error) {
      console.error('读取用户朋友圈失败:', error);
      return {
        contactId: 'user',
        posts: [],
        lastGeneratedTime: 0,
        lastGenerationDate: '',
        todayTargetCount: 0,
        todayGeneratedCount: 0,
        todayPlans: [],
        settings: {
          autoGenerate: false,
          minInterval: 0,
          maxInterval: 0,
          minPostsPerDay: 0,
          maxPostsPerDay: 0
        }
      };
    }
  }
  
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
    // 🎯 特殊处理：如果是用户的朋友圈
    if (data.contactId === 'user') {
      try {
        localStorage.setItem('moments', JSON.stringify(data.posts));
        console.log('✅ 用户朋友圈数据已更新');
      } catch (error) {
        console.error('保存用户朋友圈失败:', error);
      }
      return;
    }
    
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
 * 生成朋友圈提示词（旧系统，已弃用）
 * 
 * ⚠️ 此函数已被SmartMomentsGenerator.buildSmartPrompt替代
 * 优势：token节省80%（3000→600），智能利用行为时间线
 * 保留此函数仅用于回退和参考
 * 
 * @deprecated 使用 SmartMomentsGenerator.buildSmartPrompt 代替
 */
// @ts-expect-error - 保留用于紧急回退，暂时未使用
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
    
    // 🎯 使用新的智能朋友圈生成系统（token节省80%）
    const prompt = await SmartMomentsGenerator.buildSmartPrompt(conversation, new Date());
    
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
        max_tokens: 4000  // 🔥 增加到4000，支持多图片朋友圈（9张图×60字=540字，加文字内容）
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
    
    console.log('📝 AI原始返回内容:', content);
    
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
      
      // 🔥 容错：处理可能被截断的图片标记（缺少结尾的]）
      const incompleteImagePattern = /\[图片\d*[:：]([^\[\]]{10,})$/;
      const incompleteMatch = trimmedLine.match(incompleteImagePattern);
      if (incompleteMatch) {
        imageDescriptions.push(incompleteMatch[1].trim());
        hasImage = true;
        console.warn('⚠️ 检测到不完整的图片标记（可能被截断）:', incompleteMatch[1].substring(0, 30) + '...');
      }
      
      // 移除图片标记后的内容（包括不完整的）
      let cleanedLine = trimmedLine
        .replace(/\[图片\d*[:：][^\]]+\]/g, '')  // 完整标记
        .replace(/\[图片\d*[:：][^\[\]]{10,}$/g, '')  // 🔥 不完整标记（行尾截断）
        .trim();
      
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
      console.warn('⚠️ 清理后内容为空或异常，重新提取内容和图片');
      
      // 重新提取图片描述（如果之前没提取到）
      if (imageDescriptions.length === 0) {
        const imagePattern = /\[图片\d*[:：]([^\]]+)\]/g;
        let match;
        while ((match = imagePattern.exec(content)) !== null) {
          imageDescriptions.push(match[1].trim());
        }
      }
      
      // 移除时间和图片标记（包括不完整的）
      cleanedContent = content
        .replace(/时间[：:]\s*\d{1,2}:\d{2}\s*/g, '')
        .replace(/\[图片\d*[:：][^\]]+\]/g, '')  // 完整标记
        .replace(/\[图片\d*[:：][^\[\]]{10,}$/gm, '')  // 🔥 不完整标记
        .trim();
      
      // 如果还是空的，但有图片描述，那就只发图片
      if ((!cleanedContent || cleanedContent.length < 3) && imageDescriptions.length === 0) {
        console.error('❌ 无法提取有效的朋友圈内容，原始返回:', content);
        return null;
      }
    }
    
    // 🔥 最终清理：移除所有可能残留的图片标记
    cleanedContent = cleanedContent
      .replace(/\[图片\d*[:：][^\]]+\]/g, '')  // 完整标记
      .replace(/\[图片\d*[:：][^\[\]]+/g, '')  // 🔥 任何位置的不完整标记
      .trim();
    
    // 🔥 最终验证：确保内容不是只包含无意义的代码片段（但允许只有图片没有文字）
    if (cleanedContent && cleanedContent.match(/^(时间|内容|朋友圈)[：:]/)) {
      console.error('❌ 朋友圈内容格式异常，可能是格式标记而非实际内容:', cleanedContent);
      return null;
    }
    
    // 如果文字内容为空但有图片，将内容设为空字符串（允许只发图片）
    if (!cleanedContent && imageDescriptions.length > 0) {
      cleanedContent = '';
      console.log('📸 纯图片朋友圈，没有文字内容');
    }
    
    console.log('✅ 清理后的朋友圈内容:', cleanedContent || '(无文字)');
    console.log('🖼️ 提取的图片描述:', imageDescriptions);
    
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
    
    // 🎯 记录到统一行为管理器
    const { UnifiedBehaviorManager } = await import('./aiUnifiedBehaviorManager');
    await UnifiedBehaviorManager.recordMomentPost(
      conversation.id,
      cleanedContent,
      imageDescriptions
    );
    
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
 * AI智能互动：基于LLM决策的真实互动
 * - AI自己决定是否互动
 * - 基于性格、内容、关系智能判断
 * - 不使用固定概率，完全由AI决策
 */
export const generateAIMomentsInteraction = async (
  conversations: Conversation[],
  apiConfig: ApiConfig
): Promise<void> => {
  try {
    // 导入关系系统（已移至makeInteractionDecision中使用）
    
    const allMomentsData = await getAllMomentsData();
    if (allMomentsData.length === 0) return;

    // 获取所有AI角色
    const aiConversations = conversations.filter(c => c.type === 'private' && c.characterSettings);
    if (aiConversations.length < 2) return;

    // 🎯 随机选择几个"在线"的AI
    const onlineAICount = Math.floor(Math.random() * Math.min(3, aiConversations.length)) + 1;
    const shuffledAIs = [...aiConversations].sort(() => Math.random() - 0.5);
    const onlineAIs = shuffledAIs.slice(0, onlineAICount);
    
    console.log(`👥 当前有 ${onlineAICount} 个AI在线查看朋友圈`);

    // 🔄 收集所有可互动的朋友圈（不再使用isRead标记）
    const interactablePosts: Array<{ post: MomentPost; author: Conversation | 'user'; momentsData: any }> = [];
    
    // 1️⃣ 添加用户的朋友圈
    try {
      const userMomentsStr = localStorage.getItem('moments');
      if (userMomentsStr) {
        const userMoments: MomentPost[] = JSON.parse(userMomentsStr);
        const recentUserPosts = userMoments.filter(post => {
          const hoursSincePost = (Date.now() - post.timestamp) / 3600000;
          return hoursSincePost < 168; // 7天内
        });
        
        for (const post of recentUserPosts) {
          interactablePosts.push({ 
            post, 
            author: 'user', 
            momentsData: { contactId: 'user', posts: userMoments } 
          });
        }
        
        console.log(`📱 发现 ${recentUserPosts.length} 条用户朋友圈`);
      }
    } catch (error) {
      console.error('读取用户朋友圈失败:', error);
    }
    
    // 2️⃣ 添加AI的朋友圈
    for (const momentsData of allMomentsData) {
      const authorConv = aiConversations.find(c => c.id === momentsData.contactId);
      if (!authorConv) continue;

      // 筛选最近发布的朋友圈（7天内），不再依赖isRead标记
      const recentPosts = momentsData.posts.filter(post => {
        const hoursSincePost = (Date.now() - post.timestamp) / 3600000;
        // 只处理7天内的朋友圈
        return hoursSincePost < 168; // 7天 = 168小时
      });

      for (const post of recentPosts) {
        interactablePosts.push({ post, author: authorConv, momentsData });
      }
    }

    if (interactablePosts.length === 0) {
      console.log('📭 没有可互动的朋友圈');
      return;
    }

    console.log(`📬 发现 ${interactablePosts.length} 条可互动的朋友圈`);

    // 只处理部分朋友圈，优先处理最新的
    const sortedPosts = interactablePosts.sort((a, b) => b.post.timestamp - a.post.timestamp);
    const postsToProcess = sortedPosts.slice(0, Math.min(5, sortedPosts.length));

    // 让AI智能决策是否互动
    for (const { post, author, momentsData } of postsToProcess) {
      // 对于用户朋友圈，所有在线AI都可以互动
      const otherOnlineAIs = author === 'user' ? onlineAIs : onlineAIs.filter(ai => ai.id !== (author as Conversation).id);
      
      for (const ai of otherOnlineAIs) {
        // ✅ 检查该AI是否已经对这条朋友圈互动过
        const hasLiked = post.likes.includes(ai.id);
        const hasCommented = post.comments.some(c => c.authorId === ai.id);
        
        if (hasLiked && hasCommented) {
          // 已经点赞和评论过，跳过
          console.log(`⏭️ ${ai.characterSettings?.nickname || ai.name} 已经互动过这条朋友圈`);
          continue;
        }
        
        const authorName = author === 'user' ? '用户' : (author.characterSettings?.nickname || author.name);
        console.log(`👀 ${ai.characterSettings?.nickname || ai.name} 看到了 ${authorName} 的朋友圈`);

        // 🎯 让AI自己决定是否互动
        const decision = await makeInteractionDecision(ai, author, post, apiConfig);
        
        if (!decision.shouldInteract) {
          console.log(`😐 ${ai.characterSettings?.nickname || ai.name} 决定不互动`);
          continue;
        }

        // 根据AI的决定执行互动
        if (decision.action === 'comment') {
          if (hasCommented) {
            console.log(`⏭️ ${ai.characterSettings?.nickname || ai.name} 已经评论过了`);
            continue;
          }

          console.log(`💬 ${ai.characterSettings?.nickname || ai.name} 决定评论...`);
          
          if (decision.commentContent) {
            const targetId = author === 'user' ? 'user' : momentsData.contactId;
            await commentMomentPost(targetId, post.id, {
              authorId: ai.id,
              authorName: ai.characterSettings?.nickname || ai.name,
              authorAvatar: ai.characterSettings?.avatar || ai.avatar,
              content: decision.commentContent
            });
            console.log(`✅ 评论成功: ${decision.commentContent.substring(0, 20)}...`);
            
            // 🎯 AI评论其他AI的朋友圈后，通知朋友圈作者
            if (author !== 'user' && typeof author !== 'string') {
              // 延迟2-5秒，让朋友圈作者"看到"评论并回复
              setTimeout(() => {
                console.log(`📢 通知 ${author.characterSettings?.nickname || author.name} 有新评论`);
                handleUserInteractionResponse(
                  author,
                  post,
                  'comment',
                  decision.commentContent,
                  apiConfig
                ).catch(err => console.error('朋友圈作者回复失败:', err));
              }, 2000 + Math.random() * 3000);
            }
          }
        } else if (decision.action === 'like') {
          if (hasLiked) {
            console.log(`⏭️ ${ai.characterSettings?.nickname || ai.name} 已经点赞过了`);
            continue;
          }
          
          const targetId = author === 'user' ? 'user' : momentsData.contactId;
          await likeMomentPost(targetId, post.id, ai.id);
          console.log(`❤️ ${ai.characterSettings?.nickname || ai.name} 点赞了`);
        }

        // 随机延迟
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000));
      }
    }

    // 🔄 不再需要保存isRead标记，因为我们通过检查likes和comments来判断是否已互动

    console.log('✅ AI互动完成');
    
    // 📲 触发朋友圈界面刷新
    if (typeof window !== 'undefined') {
      // @ts-ignore
      if (window.refreshMomentsScreen) {
        console.log('🔄 通知朋友圈界面刷新...');
        // @ts-ignore
        window.refreshMomentsScreen();
      }
    }
  } catch (error) {
    console.error('❌ AI朋友圈互动失败:', error);
  }
};

/**
 * 处理用户对AI朋友圈的互动（评论、点赞）
 * AI会智能决策是否响应用户的互动
 */
export const handleUserInteractionResponse = async (
  aiConversation: Conversation,
  post: MomentPost,
  userAction: 'comment' | 'like',
  userComment?: string,
  apiConfig?: ApiConfig
): Promise<void> => {
  try {
    if (!aiConversation.characterSettings || !apiConfig) return;

    const { getRelationship, getRelationshipLabel } = await import('./aiRelationships');
    
    // 获取AI与用户的关系
    const relationship = getRelationship(aiConversation.id, 'user');
    const relationshipDesc = relationship ? getRelationshipLabel(relationship.level) : '普通关系';

    const personality = aiConversation.characterSettings.personality || '';
    const languageStyle = aiConversation.characterSettings.languageStyle || '';
    
    // 🎯 让AI自己决定是否回复用户的互动
    let decisionPrompt = `你是 ${aiConversation.characterSettings.nickname}。

【你的性格】
${personality}

【你的说话风格】
${languageStyle}

【你与用户的关系】
${relationshipDesc}${relationship?.description ? `（${relationship.description}）` : ''}

【你的朋友圈】
${post.content}
${post.imageDescriptions ? `配图：${post.imageDescriptions.join('、')}` : ''}

`;

    if (userAction === 'comment' && userComment) {
      decisionPrompt += `【用户互动】
用户对你的朋友圈评论了："${userComment}"

【任务】
根据你的性格、和用户的关系、用户评论的内容，决定是否回复用户的评论。

回复规则：
- 如果用户评论很有趣、很真诚、或者你们关系很好，应该回复
- 如果评论很敷衍（如"不错"、"嗯"、"哦"），可以选择不回复
- 如果你性格比较高冷、不爱搭理人，可以选择不回复
- 如果关系一般且评论没什么内容，可以不回复
- 回复内容要符合你的性格和说话风格，1-2句话即可

【输出格式】
以JSON格式回复（只输出JSON，不要其他内容）：
{
  "shouldReply": true/false,  // 是否回复
  "replyContent": "回复内容"或null,  // 如果回复，写出内容
  "reason": "决策理由"  // 简短说明你的想法
}`;
    } else if (userAction === 'like') {
      decisionPrompt += `【用户互动】
用户给你的朋友圈点赞了。

【任务】
根据你的性格、和用户的关系，决定是否要回复这个点赞。

回复规则：
- 一般情况下，点赞不需要特别回复（真人也是这样）
- 如果你性格特别热情、或者和用户关系特别好，可以回复一句
- 如果你性格高冷、不爱说话，就不用回复
- 如果要回复，就说一句简单的话，比如"谢啦"、"嘿嘿"之类的

【输出格式】
以JSON格式回复（只输出JSON，不要其他内容）：
{
  "shouldReply": true/false,  // 是否回复
  "replyContent": "回复内容"或null,  // 如果回复，写出内容
  "reason": "决策理由"  // 简短说明你的想法
}`;
    }

    // 调用API让AI做决策
    const decisionResponse = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [
          { role: 'user', content: decisionPrompt }
        ],
        temperature: 0.8,
        max_tokens: 200
      })
    });

    if (!decisionResponse.ok) {
      console.error('AI决策失败:', decisionResponse.status);
      return;
    }

    const decisionData = await decisionResponse.json();
    const decisionContent = decisionData.choices?.[0]?.message?.content || '';
    
    // 解析JSON响应
    try {
      const jsonMatch = decisionContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('AI决策响应格式错误:', decisionContent);
        return;
      }
      
      const decision: { shouldReply: boolean; replyContent?: string; reason?: string } = JSON.parse(jsonMatch[0]);
      
      console.log(`🧠 ${aiConversation.characterSettings.nickname} 的决策: ${decision.reason}`);
      
      if (!decision.shouldReply) {
        console.log(`😐 ${aiConversation.characterSettings.nickname} 决定不回复`);
        return;
      }
      
      if (decision.replyContent) {
        // 回复评论
        await commentMomentPost(aiConversation.id, post.id, {
          authorId: aiConversation.id,
          authorName: aiConversation.characterSettings.nickname || aiConversation.name,
          authorAvatar: aiConversation.characterSettings.avatar || aiConversation.avatar,
          content: decision.replyContent
        });
        console.log(`✅ ${aiConversation.characterSettings.nickname} 回复: ${decision.replyContent}`);
      }
    } catch (parseError) {
      console.error('解析AI决策失败:', decisionContent, parseError);
    }
  } catch (error) {
    console.error('处理用户互动响应失败:', error);
  }
};

/**
 * AI评论区互动：查看已有评论并决定是否参与讨论
 * 模拟真实朋友圈场景，AI会看评论区的对话
 */
export const generateCommentSectionInteraction = async (
  conversations: Conversation[],
  apiConfig: ApiConfig
): Promise<void> => {
  try {
    const allMomentsData = await getAllMomentsData();
    if (allMomentsData.length === 0) return;

    const aiConversations = conversations.filter(c => c.type === 'private' && c.characterSettings);
    if (aiConversations.length < 2) return;

    // 🎯 随机选择几个"在线"的AI
    const onlineAICount = Math.floor(Math.random() * Math.min(3, aiConversations.length)) + 1;
    const shuffledAIs = [...aiConversations].sort(() => Math.random() - 0.5);
    const onlineAIs = shuffledAIs.slice(0, onlineAICount);
    
    console.log(`💬 ${onlineAICount} 个AI正在查看评论区...`);

    // 收集有评论的朋友圈（最近7天）
    const postsWithComments: Array<{ post: MomentPost; author: Conversation | 'user'; momentsData: any }> = [];
    
    // 1️⃣ 添加用户朋友圈的评论区
    try {
      const userMomentsStr = localStorage.getItem('moments');
      if (userMomentsStr) {
        const userMoments: MomentPost[] = JSON.parse(userMomentsStr);
        const recentUserPostsWithComments = userMoments.filter(post => {
          const hoursSincePost = (Date.now() - post.timestamp) / 3600000;
          return post.comments.length > 0 && hoursSincePost < 168;
        });
        
        for (const post of recentUserPostsWithComments) {
          postsWithComments.push({ 
            post, 
            author: 'user', 
            momentsData: { contactId: 'user', posts: userMoments } 
          });
        }
        
        console.log(`📱 发现 ${recentUserPostsWithComments.length} 条有评论的用户朋友圈`);
      }
    } catch (error) {
      console.error('读取用户朋友圈失败:', error);
    }
    
    // 2️⃣ 添加AI朋友圈的评论区
    for (const momentsData of allMomentsData) {
      const authorConv = aiConversations.find(c => c.id === momentsData.contactId);
      if (!authorConv) continue;

      const recentPosts = momentsData.posts.filter(post => {
        const hoursSincePost = (Date.now() - post.timestamp) / 3600000;
        // 有评论且是7天内的
        return post.comments.length > 0 && hoursSincePost < 168;
      });

      for (const post of recentPosts) {
        postsWithComments.push({ post, author: authorConv, momentsData });
      }
    }

    if (postsWithComments.length === 0) {
      console.log('📭 没有评论区可以互动');
      return;
    }

    console.log(`📬 发现 ${postsWithComments.length} 条有评论的朋友圈`);

    // 随机选择几条来看
    const postsToCheck = postsWithComments
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(3, postsWithComments.length));

    for (const { post, author, momentsData } of postsToCheck) {
      // 🔄 改进：不是简单排除已评论的AI，而是让AI决定是否继续参与
      // 考虑因素：
      // 1. 是否有人回复了这个AI的评论
      // 2. 是否有新的评论出现（可以回复新评论）
      // 3. 避免同一个AI在短时间内反复出现
      
      const commentAuthors = post.comments.map(c => c.authorId || c.userId);
      const authorId = author === 'user' ? 'user' : author.id;
      
      // 为每个在线AI计算参与优先级
      const aiWithPriority = onlineAIs
        .filter(ai => ai.id !== authorId) // 排除朋友圈作者
        .map(ai => {
          const hasCommented = commentAuthors.includes(ai.id);
          
          // 检查是否有人回复了这个AI
          const hasBeenReplied = post.comments.some(comment => 
            comment.replyTo && 
            post.comments.find(c => c.id === comment.replyTo)?.authorId === ai.id
          );
          
          // 计算这个AI最后评论的时间
          const lastCommentTime = post.comments
            .filter(c => (c.authorId || c.userId) === ai.id)
            .sort((a, b) => b.timestamp - a.timestamp)[0]?.timestamp || 0;
          
          const minutesSinceLastComment = (Date.now() - lastCommentTime) / (1000 * 60);
          
          // 优先级计算
          let priority = 0;
          
          if (!hasCommented) {
            // 从未评论过，中等优先级
            priority = 50;
          } else if (hasBeenReplied && minutesSinceLastComment > 10) {
            // 被回复了且距离上次评论超过10分钟，高优先级
            priority = 80;
          } else if (minutesSinceLastComment > 60) {
            // 评论过但已经1小时以上，可以再次参与，中低优先级
            priority = 40;
          } else if (minutesSinceLastComment < 10) {
            // 刚评论过不到10分钟，低优先级（避免刷屏）
            priority = 10;
          } else {
            // 10-60分钟，低优先级
            priority = 20;
          }
          
          return { ai, priority, hasCommented, hasBeenReplied };
        })
        .filter(item => item.priority > 15) // 过滤掉优先级太低的
        .sort((a, b) => b.priority - a.priority); // 按优先级排序

      if (aiWithPriority.length === 0) continue;

      // 根据优先级随机选择1-2个AI
      const viewerCount = Math.min(Math.floor(Math.random() * 2) + 1, aiWithPriority.length);
      const viewersWithInfo = aiWithPriority.slice(0, viewerCount);

      for (const viewerInfo of viewersWithInfo) {
        const viewer = viewerInfo.ai;
        const hasCommented = viewerInfo.hasCommented;
        const hasBeenReplied = viewerInfo.hasBeenReplied;
        
        if (hasCommented && hasBeenReplied) {
          console.log(`👀 ${viewer.characterSettings?.nickname || viewer.name} 看到有人回复了TA的评论`);
        } else if (hasCommented) {
          console.log(`👀 ${viewer.characterSettings?.nickname || viewer.name} 再次查看了评论区（已评论过）`);
        } else {
          console.log(`👀 ${viewer.characterSettings?.nickname || viewer.name} 首次查看评论区`);
        }

        // 🎯 让AI决定是否参与评论区讨论，传递额外信息
        const decision = await makeCommentSectionDecision(
          viewer,
          author,
          post,
          apiConfig,
          hasCommented,
          hasBeenReplied
        );

        if (!decision.shouldComment) {
          console.log(`😐 ${viewer.characterSettings?.nickname || viewer.name} 决定不参与讨论`);
          continue;
        }

        console.log(`💬 ${viewer.characterSettings?.nickname || viewer.name} 决定参与评论区`);

        if (decision.commentContent) {
          const targetId = author === 'user' ? 'user' : momentsData.contactId;
          const newComment = {
            authorId: viewer.id,
            authorName: viewer.characterSettings?.nickname || viewer.name,
            authorAvatar: viewer.characterSettings?.avatar || viewer.avatar,
            content: decision.commentContent,
            replyTo: decision.replyToCommentId,
            replyToName: decision.replyToName
          };

          await commentMomentPost(targetId, post.id, newComment);
          
          if (decision.replyToName) {
            console.log(`✅ 回复了 ${decision.replyToName}: ${decision.commentContent.substring(0, 20)}...`);
          } else {
            console.log(`✅ 评论: ${decision.commentContent.substring(0, 20)}...`);
          }
        }

        // 随机延迟
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
      }
    }

    console.log('✅ 评论区互动完成');
    
    // 📲 触发朋友圈界面刷新
    if (typeof window !== 'undefined') {
      // @ts-ignore
      if (window.refreshMomentsScreen) {
        console.log('🔄 通知朋友圈界面刷新...');
        // @ts-ignore
        window.refreshMomentsScreen();
      }
    }
  } catch (error) {
    console.error('❌ 评论区互动失败:', error);
  }
};

/**
 * AI决策：是否参与评论区讨论
 */
interface CommentSectionDecision {
  shouldComment: boolean;
  commentContent?: string;
  replyToCommentId?: string;
  replyToName?: string;
  reason?: string;
}

const makeCommentSectionDecision = async (
  viewerAI: Conversation,
  postAuthor: Conversation | 'user',
  post: MomentPost,
  apiConfig: ApiConfig,
  hasCommented: boolean = false,
  hasBeenReplied: boolean = false
): Promise<CommentSectionDecision> => {
  try {
    const { getRelationship, getRelationshipLabel } = await import('./aiRelationships');
    
    const viewerSettings = viewerAI.characterSettings;
    if (!viewerSettings) {
      return { shouldComment: false };
    }

    // 获取作者信息和关系
    const authorName = postAuthor === 'user' ? '用户' : (postAuthor.characterSettings?.nickname || postAuthor.name);
    const authorId = postAuthor === 'user' ? 'user' : postAuthor.id;
    
    // 获取关系（如果是用户，则查询与用户的关系）
    const relationshipWithAuthor = getRelationship(viewerAI.id, authorId);
    const relationshipDesc = relationshipWithAuthor ? getRelationshipLabel(relationshipWithAuthor.level) : (postAuthor === 'user' ? '你的主人' : '普通关系');

    // 构建评论区内容概览，并标注哪些是回复这个AI的
    let commentsOverview = '';
    const myCommentIds: string[] = [];
    
    post.comments.forEach((comment, index) => {
      const commentAuthor = comment.authorName || comment.username || '某人';
      const commentAuthorId = comment.authorId || comment.userId;
      
      // 标记是否是这个AI自己的评论
      if (commentAuthorId === viewerAI.id) {
        myCommentIds.push(comment.id);
      }
      
      let commentText = '';
      
      if (comment.replyTo && comment.replyToName) {
        commentText = `${commentAuthor} 回复 ${comment.replyToName}: ${comment.content}`;
        
        // 🎯 特别标注：如果是回复这个AI的
        if (myCommentIds.includes(comment.replyTo)) {
          commentText += ` ⭐【回复了你】`;
        }
      } else {
        commentText = `${commentAuthor}: ${comment.content}`;
      }
      
      // 标注这是AI自己的评论
      if (commentAuthorId === viewerAI.id) {
        commentText += ` 💭【你的评论】`;
      }
      
      commentsOverview += `${index + 1}. ${commentText}\n`;
    });

    // 🎯 构建特殊情况说明
    let specialContext = '';
    if (hasBeenReplied) {
      specialContext += '\n【⭐ 重要】有人回复了你之前的评论！你可以决定是否回复对方。\n';
    }
    if (hasCommented && !hasBeenReplied) {
      specialContext += '\n【提示】你之前已经在这个评论区发表过看法了。如果有新的有趣评论，或者你有新的想法，可以继续参与。但避免重复说相同的内容。\n';
    }

    const prompt = `你是 ${viewerSettings.nickname || viewerAI.name}。

【你的性格】
${viewerSettings.personality || ''}

【你的说话风格】
${viewerSettings.languageStyle || ''}

【你与朋友圈作者的关系】
${authorName}: ${relationshipDesc}${relationshipWithAuthor?.description ? `（${relationshipWithAuthor.description}）` : ''}

【朋友圈内容】
${authorName} 发了：${post.content}
${post.imageDescriptions ? `配图：${post.imageDescriptions.join('、')}` : ''}

【评论区讨论】
${commentsOverview}${specialContext}

【任务】
你刷朋友圈时看到了这条动态的评论区，根据你的性格和评论区情况决定是否参与讨论。

【决策要点】
1. ⭐⭐⭐ 如果有人回复了你的评论，强烈建议回复对方（维持对话很重要！）
2. 如果看到有趣的评论，可以回复或@对方继续聊
3. 如果评论区在讨论你感兴趣的话题，可以加入讨论
4. 真实的朋友圈评论区经常有来回对话，不要太冷淡
5. 你的性格决定参与频率：外向话多的人更爱互动，内向的人选择性参与

【参与规则】
✅ 鼓励参与的情况：
- 有人回复了你（应该回复，形成对话）
- 评论区讨论很有趣、和你相关
- 你有观点想表达
- 可以@回复特定评论，让对话更自然

⚠️ 谨慎参与的情况：
- 评论区已经很热闹（8条以上）
- 你刚评论过不到5分钟
- 评论区话题对你完全没兴趣
- 重复之前说过的内容

💡 提示：真实的朋友圈评论区会有连续对话，比如：
A: 好好看啊！
B 回复 A: 谢谢～
A 回复 B: 是在哪拍的呀？
B 回复 A: xx公园～
这种多轮互动很自然！

【输出格式】
以JSON格式回复（只输出JSON，不要其他内容）：
{
  "shouldComment": true/false,  // 是否参与评论区
  "commentContent": "评论内容"或null,  // 如果参与，写出评论（1-2句话）
  "replyToCommentId": "评论ID"或null,  // 如果要回复特定评论，填写评论ID（从1开始计数）
  "replyToName": "被回复者名字"或null,  // 如果回复特定评论，填写名字
  "reason": "决策理由"  // 简短说明你的想法
}

注意：如果要回复特定评论，replyToCommentId填写评论序号（如"1"、"2"），系统会自动转换。`;

    const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      console.error('评论区决策失败:', response.status);
      return { shouldComment: false };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('评论区决策响应格式错误:', content);
        return { shouldComment: false };
      }
      
      const decision: CommentSectionDecision = JSON.parse(jsonMatch[0]);
      console.log(`🧠 评论区决策: ${decision.reason}`);
      
      // 处理replyToCommentId（转换序号为实际ID）
      if (decision.replyToCommentId) {
        const commentIndex = parseInt(decision.replyToCommentId) - 1;
        if (commentIndex >= 0 && commentIndex < post.comments.length) {
          const targetComment = post.comments[commentIndex];
          decision.replyToCommentId = targetComment.id;
          decision.replyToName = targetComment.authorName || targetComment.username;
        } else {
          // 序号无效，清除回复信息
          decision.replyToCommentId = undefined;
          decision.replyToName = undefined;
        }
      }
      
      return decision;
    } catch (parseError) {
      console.error('解析评论区决策失败:', content, parseError);
      return { shouldComment: false };
    }
  } catch (error) {
    console.error('生成评论区决策失败:', error);
    return { shouldComment: false };
  }
};

/**
 * AI智能决策：是否互动以及如何互动
 */
interface InteractionDecision {
  shouldInteract: boolean;
  action?: 'like' | 'comment';
  commentContent?: string;
  reason?: string;
}

const makeInteractionDecision = async (
  viewerAI: Conversation,
  authorAI: Conversation | 'user',
  post: MomentPost,
  apiConfig: ApiConfig
): Promise<InteractionDecision> => {
  try {
    const { getRelationship, getRelationshipLabel } = await import('./aiRelationships');
    
    const viewerSettings = viewerAI.characterSettings;
    if (!viewerSettings) {
      return { shouldInteract: false };
    }

    // 获取作者信息和关系
    const authorName = authorAI === 'user' ? '用户' : (authorAI.characterSettings?.nickname || authorAI.name);
    const authorId = authorAI === 'user' ? 'user' : authorAI.id;
    
    // 获取关系（如果是用户，则查询与用户的关系）
    const relationship = getRelationship(viewerAI.id, authorId);
    const relationshipDesc = relationship ? getRelationshipLabel(relationship.level) : (authorAI === 'user' ? '你的主人' : '普通关系');

    // 构建决策提示词
    const prompt = `你是 ${viewerSettings.nickname || viewerAI.name}。

【你的性格】
${viewerSettings.personality || ''}

【你的说话风格】
${viewerSettings.languageStyle || ''}

【你对${authorName}的关系】
${relationshipDesc}${relationship?.description ? `（${relationship.description}）` : ''}

【朋友圈内容】
${authorName} 发了一条朋友圈：
${post.content}
${post.imageDescriptions ? `配图：${post.imageDescriptions.join('、')}` : ''}

【任务】
你刷朋友圈时看到了这条动态，请根据：
1. 你的性格和兴趣
2. 朋友圈的内容
3. 你和发布者的关系

决定是否互动，以及如何互动。

【输出格式】
请以JSON格式回复（只输出JSON，不要其他内容）：
{
  "shouldInteract": true/false,  // 是否互动
  "action": "like"或"comment"或null,  // 如果互动，选择点赞还是评论
  "commentContent": "评论内容"或null,  // 如果选择评论，写出评论内容（1-2句话）
  "reason": "决策理由"  // 简短说明你的想法
}

【决策指南】
- 如果内容不感兴趣、和你无关、或者关系不好，可以选择不互动
- 如果只是觉得还可以，点个赞就行
- 如果真的有共鸣、想法、或者关系很好，可以评论
- 评论要真诚、自然，符合你的性格和说话风格`;

    // 调用API
    const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      console.error('AI决策失败:', response.status, response.statusText);
      return { shouldInteract: false };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // 解析JSON响应
    try {
      // 清理内容：移除markdown代码块标记、多余的引号等
      let cleanContent = content
        .replace(/```json\s*/gi, '')  // 移除 ```json
        .replace(/```\s*/g, '')        // 移除 ```
        .replace(/^["\s-]*/, '')       // 移除开头的引号、空格、破折号
        .replace(/["\s]*$/, '')        // 移除结尾的引号、空格
        .trim();
      
      // 提取JSON内容（可能被包裹在其他文本中）
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('AI决策响应格式错误:', content);
        return { shouldInteract: false };
      }
      
      const decision: InteractionDecision = JSON.parse(jsonMatch[0]);
      console.log(`🧠 决策: ${decision.reason}`);
      
      return decision;
    } catch (parseError) {
      console.error('解析AI决策失败:', content, parseError);
      return { shouldInteract: false };
    }
  } catch (error) {
    console.error('AI决策出错:', error);
    return { shouldInteract: false };
  }
};

