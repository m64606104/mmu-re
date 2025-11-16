import { Conversation, Message, ApiConfig, CharacterSettings } from '../types';
import { splitMessages } from './messageFormatter';
import { buildTimeAwarePrompt } from './timeAwareness';

/**
 * 群聊API服务
 * 处理群聊中多个AI依次回复的逻辑
 */

// 群聊AI回复状态
export interface GroupAIReply {
  aiId: string; // AI成员ID
  aiName: string; // AI昵称
  aiAvatar?: string; // AI头像
  messages: Message[]; // AI的回复消息数组
  status: 'pending' | 'typing' | 'completed' | 'error'; // 状态：等待、输入中、完成、错误
  error?: string; // 错误信息
}

// 群聊生成回调
export interface GroupChatCallback {
  onAIStart?: (aiId: string, aiName: string) => void; // AI开始回复
  onAITyping?: (aiId: string) => void; // AI正在打字
  onAIMessage?: (aiId: string, message: Message) => void; // AI发送单条消息
  onAIComplete?: (aiId: string, messages: Message[]) => void; // AI完成回复
  onAIError?: (aiId: string, error: string) => void; // AI回复出错
  onAllComplete?: (allReplies: GroupAIReply[]) => void; // 所有AI完成回复
}

/**
 * 格式化消息内容供AI使用
 */
function formatMessageForAI(msg: Message): string {
  let content = msg.content || '';
  
  // 处理媒体描述
  if (msg.mediaType === 'image' && msg.mediaDescription) {
    content += ` [用户发送了图片：${msg.mediaDescription}]`;
  } else if (msg.mediaType === 'video' && msg.mediaDescription) {
    content += ` [用户发送了视频：${msg.mediaDescription}]`;
  } else if (msg.mediaType === 'voice' && msg.mediaDescription) {
    content += ` [用户发送了语音：${msg.mediaDescription}]`;
  } else if (msg.mediaType === 'sticker' && msg.mediaDescription) {
    content += ` [用户发送了表情包：${msg.mediaDescription}]`;
  }
  
  return content.trim();
}

/**
 * 构建群聊系统提示词
 */
function buildGroupChatSystemPrompt(
  aiSettings: CharacterSettings,
  groupName: string,
  otherMembers: Array<{ name: string; role: string }>, // 其他成员信息
  userName: string, // 用户的名称
  isFreeMode: boolean = false // 是否为自由模式
): string {
  const membersList = otherMembers.map(m => `${m.name}(${m.role})`).join('、');
  
  const freeModeExtra = isFreeMode ? `

【自由模式特性】：
- 你可以回应任何人的消息，包括其他AI成员的发言
- 你可以主动发起新话题，保持对话活跃
- 即使没有人直接@你，你也可以参与讨论
- 你可以与其他AI成员互动，就像真实的群聊一样
- 观察整个对话流程，在合适的时机自然发言` : '';
  
  return `你是${aiSettings.nickname}。

【群聊环境】：
- 这是一个名为"${groupName}"的群聊
- 群成员：${membersList}
- ⚠️ 重要：这是一个真实的群聊，有多个AI成员和用户共同参与
- 你需要意识到其他AI成员也是独立的个体，他们会独立思考和发言
- 你需要在群聊中以自己的角色身份自然地参与对话${freeModeExtra}
- 👤 用户名称：称呼对方为"${userName}"，而不是"用户"

${aiSettings.systemPrompt ? `人物设定：${aiSettings.systemPrompt}` : ''}
${aiSettings.personality ? `性格特征：${aiSettings.personality}` : ''}
${aiSettings.languageStyle ? `语言风格：${aiSettings.languageStyle}` : ''}
${aiSettings.languageExample ? `语言示例：${aiSettings.languageExample}` : ''}
${aiSettings.memoryEvents ? `记忆事件：${aiSettings.memoryEvents}` : ''}

【群聊回复原则】：
- **自然参与**：像真人在群聊中一样，根据话题和兴趣选择是否回复
- **选择性发言**：不是每条消息都要回复，只在你感兴趣或相关时发言
- **简洁回复**：群聊消息通常较短，避免长篇大论
- **互动感**：可以@其他成员、回应他人观点、发表自己看法
- **识别发送者**：注意消息前的发送者名字，区分用户和其他AI的发言
- **跳过回复**：如果这条消息与你无关或不感兴趣，输出"[不回复]"

【回复格式】：
- 一次回复可以包含多条消息（用换行分隔）
- 如果不想回复，输出：[不回复]
- 可以使用多媒体格式（图片、视频、语音、表情包、文档）
- 保持群聊的轻松氛围

【📱 多媒体消息功能】：
你可以在群聊中发送各种多媒体内容：

1. 📷 **图片消息**：[图片:描述内容]
   示例："看这个！[图片:今天拍的美食]"
   使用场景：分享照片、展示物品、表达心情

2. 🎬 **视频消息**：[视频:描述内容]
   示例："刚拍的~[视频:猫咪在玩耍]"
   使用场景：分享动态内容、精彩瞬间

3. 🎤 **语音消息**：[语音:语音内容文字]
   示例："[语音:哈哈哈太搞笑了]"
   使用场景：语音聊天、表达情绪

4. 😊 **表情包**：[表情包:表情描述]
   示例："[表情包:笑哭了]"
   使用场景：回应搞笑内容、表达情绪

5. 📄 **文档消息**：[文档:标题:类型:内容摘要]
   示例："[文档:会议记录:记录:今天的讨论要点]"
   使用场景：分享文件、笔记

6. 🎁 **群红包**：[发群红包:类型:金额:数量:留言]
   红包类型: average(普通), random(拼手气), exclusive(专属)
   示例："[发群红包:random:10:5:大家抢红包啦]"
   使用场景：节日、庆祝、活跃氛围

**混合发送**：
- 可以连续发送多种媒体
- 可以图文混合
- 示例："看看这个[图片:日落]真美[表情包:感动]"

【绝对禁止】：
- ❌ 不要分析其他人的消息
- ❌ 不要输出思考过程
- ❌ 不要进行总结性发言
- ❌ 不要使用英文分析
- ❌ 不要模仿其他AI的身份发言

✅ **正确做法**：
- ✅ 直接用自然的中文回复
- ✅ 像朋友聊天一样表达
- ✅ 根据角色性格自然发言
- ✅ 回应其他AI时，自然地提到他们的名字`;
}

/**
 * 解析AI回复消息并拆分（支持多媒体）
 */
function parseAIResponse(content: string): Message[] {
  if (!content || content.trim() === '' || content.includes('[不回复]')) {
    return [];
  }
  
  // 检测各种媒体类型
  const imageMatches = [...content.matchAll(/\[图片[:：]([^\]]+)\]/g)];
  const videoMatches = [...content.matchAll(/\[视频[:：]([^\]]+)\]/g)];
  const voiceMatches = [...content.matchAll(/\[语音[:：](.+?)(?:[，,]\s*(?:时长)?(\d+)秒?)?\]/g)];
  const stickerMatches = [...content.matchAll(/\[表情包[:：]([^\]]+)\]/g)];
  const redPacketMatches = [...content.matchAll(/\[(?:发)?群红包(?:[:：]([^\]]+))?\]/g)];
  
  // 移除所有媒体标记，得到纯文本内容
  let cleanText = content
    .replace(/\[图片[:：][^\]]+\]/g, '')
    .replace(/\[视频[:：][^\]]+\]/g, '')
    .replace(/\[语音[:：].+?\]/g, '')
    .replace(/\[表情包[:：][^\]]+\]/g, '')
    .replace(/\[(?:发)?群红包(?:[:：][^\]]+)?\]/g, '')
    .trim();
  
  const messages: Message[] = [];
  let baseTimestamp = Date.now();
  let msgIndex = 0;
  
  // 1. 添加所有图片消息
  imageMatches.forEach((match) => {
    messages.push({
      id: `${baseTimestamp}_img_${msgIndex++}`,
      role: 'assistant' as const,
      content: '[图片]',
      timestamp: baseTimestamp + msgIndex * 100,
      mediaType: 'image',
      mediaDescription: match[1],
      isMediaDescriptionOnly: true
    });
  });
  
  // 2. 添加所有视频消息
  videoMatches.forEach((match) => {
    messages.push({
      id: `${baseTimestamp}_video_${msgIndex++}`,
      role: 'assistant' as const,
      content: '[视频]',
      timestamp: baseTimestamp + msgIndex * 100,
      mediaType: 'video',
      mediaDescription: match[1],
      isMediaDescriptionOnly: true
    });
  });
  
  // 3. 添加所有语音消息
  voiceMatches.forEach((match) => {
    const voiceContent = match[1];
    const duration = match[2] ? parseInt(match[2]) : 3;
    messages.push({
      id: `${baseTimestamp}_voice_${msgIndex++}`,
      role: 'assistant' as const,
      content: '[语音]',
      timestamp: baseTimestamp + msgIndex * 100,
      mediaType: 'voice',
      mediaDescription: voiceContent,
      voiceDuration: duration,
      isMediaDescriptionOnly: true
    });
  });
  
  // 4. 添加所有表情包消息
  stickerMatches.forEach((match) => {
    messages.push({
      id: `${baseTimestamp}_sticker_${msgIndex++}`,
      role: 'assistant' as const,
      content: '[表情包]',
      timestamp: baseTimestamp + msgIndex * 100,
      mediaType: 'sticker',
      mediaDescription: match[1],
      isMediaDescriptionOnly: true
    });
  });
  
  // 5. 添加所有群红包消息
  redPacketMatches.forEach((match) => {
    const desc = match[1] || '恭喜发财，大吉大利';
    // 解析红包信息：金额，数量，口令等
    const amountMatch = desc.match(/(\d+(?:\.\d+)?)[元]/);
    const countMatch = desc.match(/(\d+)[个]/);
    const passwordMatch = desc.match(/口令[:：](.+?)(?:[，,。]|$)/);
    
    const totalAmount = amountMatch ? parseFloat(amountMatch[1]) : 200;
    const totalCount = countMatch ? parseInt(countMatch[1]) : 3;
    const redPacketId = `ai_redpacket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageText = desc.replace(/\d+(?:\.\d+)?元/, '').replace(/\d+个/, '').replace(/口令[:：].+?(?:[，,。]|$)/, '').trim() || '恭喜发财，大吉大利';
    
    messages.push({
      id: `${baseTimestamp}_redpacket_${msgIndex++}`,
      role: 'assistant' as const,
      content: '[群红包]',
      timestamp: baseTimestamp + msgIndex * 100,
      moneyTransfer: {
        type: 'groupRedPacket',
        amount: totalAmount,
        message: messageText,
        status: 'pending',
        groupRedPacket: {
          id: redPacketId,
          senderId: '', // 会在generateAIReply中设置
          senderName: '',
          message: messageText,
          totalAmount: totalAmount,
          totalCount: totalCount,
          remainingCount: totalCount,
          remainingAmount: totalAmount,
          redPacketType: passwordMatch ? 'random' : 'random', // 口令红包也是拼手气
          password: passwordMatch ? passwordMatch[1].trim() : undefined,
          claimedBy: [],
          createdAt: Date.now(),
          expiredAt: Date.now() + 24 * 60 * 60 * 1000,
          status: 'active'
        }
      }
    });
  });
  
  // 6. 添加纯文本消息（如果有）
  if (cleanText) {
    const contentArray = splitMessages(cleanText);
    contentArray.forEach((text) => {
      messages.push({
        id: `${baseTimestamp}_text_${msgIndex++}`,
        role: 'assistant' as const,
        content: text,
        timestamp: baseTimestamp + msgIndex * 100,
      });
    });
  }
  
  return messages;
}

/**
 * 为单个AI成员生成回复
 */
async function generateAIReply(
  aiMember: Conversation,
  groupConversation: Conversation,
  apiConfig: ApiConfig,
  allConversations: Conversation[],
  isFreeMode: boolean = false
): Promise<GroupAIReply> {
  const reply: GroupAIReply = {
    aiId: aiMember.id,
    aiName: aiMember.characterSettings?.nickname || aiMember.name,
    aiAvatar: aiMember.characterSettings?.avatar || aiMember.avatar,
    messages: [],
    status: 'pending',
  };
  
  try {
    // 获取群成员信息
    const members = groupConversation.members || [];
    const otherMembers = members
      .filter(mid => mid !== aiMember.id)
      .map(mid => {
        const m = allConversations.find(c => c.id === mid);
        return {
          name: m?.characterSettings?.nickname || m?.name || '未知',
          role: m ? 'AI成员' : '用户'
        };
      });
    
    // 获取用户名称（从localStorage或默认值）
    const userSettings = JSON.parse(localStorage.getItem('userSettings') || '{}');
    const userName = userSettings.nickname || userSettings.name || '你';
    
    otherMembers.push({ name: userName, role: '群主' });
    
    // 构建系统提示
    let systemPrompt = buildGroupChatSystemPrompt(
      aiMember.characterSettings!,
      groupConversation.name,
      otherMembers,
      userName,
      isFreeMode
    );
    
    // 构建消息历史（最近20条）
    const recentMessages = groupConversation.messages.slice(-20);
    
    // 🕐 添加时间感知
    const lastUserMessage = recentMessages
      .filter(m => m.role === 'user' || (m.role === 'assistant' && !(m as any).senderId))
      .pop();
    if (lastUserMessage) {
      const timeAwarePrompt = buildTimeAwarePrompt(
        lastUserMessage.timestamp,
        lastUserMessage.content
      );
      systemPrompt += timeAwarePrompt;
    }
    const apiMessages = recentMessages.map(msg => {
      if (msg.role === 'system') {
        return null; // 跳过系统消息
      }
      
      // 判断消息发送者
      let senderName = '用户';
      let role: 'user' | 'assistant' = 'user';
      
      if (msg.role === 'assistant') {
        // 这是AI消息，需要确定是哪个AI
        // 通过消息上下文或元数据判断（简化处理：假设有senderId字段）
        const senderId = (msg as any).senderId;
        if (senderId) {
          const sender = allConversations.find(c => c.id === senderId);
          senderName = sender?.characterSettings?.nickname || sender?.name || 'AI';
          role = senderId === aiMember.id ? 'assistant' : 'user';
        } else {
          // 无法确定发送者，标记为其他AI
          senderName = 'AI成员';
          role = 'user';
        }
      }
      
      const content = formatMessageForAI(msg);
      const prefix = role === 'user' ? `${senderName}: ` : '';
      
      return {
        role: role,
        content: prefix + content
      };
    }).filter(m => m !== null);
    
    // 调用API
    reply.status = 'typing';
    
    const requestBody = {
      model: apiConfig.modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        ...apiMessages
      ],
      temperature: 0.8,
      max_tokens: 1000, // 群聊回复通常较短
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
      const errorText = await response.text();
      throw new Error(`API错误: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('API返回格式错误');
    }
    
    const assistantMessage = data.choices[0]?.message?.content;
    
    // 解析回复
    const messages = parseAIResponse(assistantMessage);
    
    reply.messages = messages;
    reply.status = 'completed';
    
    return reply;
    
  } catch (error: any) {
    reply.status = 'error';
    reply.error = error.message || '生成失败';
    return reply;
  }
}

/**
 * 群聊生成服务主函数 - 顺序模式
 * 依次为每个AI成员生成回复，支持回调
 */
export async function generateGroupChatReplies(
  groupConversation: Conversation,
  apiConfig: ApiConfig,
  allConversations: Conversation[],
  callbacks?: GroupChatCallback
): Promise<GroupAIReply[]> {
  const members = groupConversation.members || [];
  const aiMembers = members
    .map(mid => allConversations.find(c => c.id === mid))
    .filter(c => c && c.type === 'private') as Conversation[];
  
  if (aiMembers.length === 0) {
    throw new Error('群聊中没有AI成员');
  }
  
  const allReplies: GroupAIReply[] = [];
  const isFreeMode = groupConversation.groupChatMode === 'free';
  
  // 依次为每个AI生成回复
  for (let idx = 0; idx < aiMembers.length; idx++) {
    const aiMember = aiMembers[idx];
    
    // 🎯 优化：如果不是第一个AI，先等待短暂间隔
    if (idx > 0) {
      await new Promise(resolve => setTimeout(resolve, 200)); // AI之间的间隔
    }
    
    // 🎯 新设计：先调用API，让"发送中"提示承担API时间
    // 第一个AI：在"发送中"期间调用API
    // 后续AI：在前一个AI完成后立即调用API
    const reply = await generateAIReply(aiMember, groupConversation, apiConfig, allConversations, isFreeMode);
    allReplies.push(reply);
    
    // API返回后再显示打字动画（只有有内容时才显示）
    if (reply.status !== 'error' && reply.messages.length > 0) {
      // 显示打字动画
      callbacks?.onAIStart?.(aiMember.id, aiMember.characterSettings?.nickname || aiMember.name);
      callbacks?.onAITyping?.(aiMember.id);
      
      // 打字动画延迟（让用户看到打字效果）
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    if (reply.status === 'error') {
      callbacks?.onAIError?.(reply.aiId, reply.error || '未知错误');
      continue;
    }
    
    if (reply.messages.length === 0) {
      // AI选择不回复
      callbacks?.onAIComplete?.(reply.aiId, []);
      continue;
    }
    
    // 逐条发送消息（打字动画延迟已在上面的470-478行处理）
    for (let i = 0; i < reply.messages.length; i++) {
      const message = reply.messages[i];
      
      // 添加senderId以标识消息来源
      const messageWithSender = {
        ...message,
        senderId: reply.aiId,
        senderName: reply.aiName,
        senderAvatar: reply.aiAvatar,
      } as any;
      
      // 🎁 如果是群红包消息，更新红包信息中的发送者
      if (messageWithSender.moneyTransfer?.type === 'groupRedPacket' && messageWithSender.moneyTransfer.groupRedPacket) {
        messageWithSender.moneyTransfer.groupRedPacket.senderId = reply.aiId;
        messageWithSender.moneyTransfer.groupRedPacket.senderName = reply.aiName;
      }
      
      callbacks?.onAIMessage?.(reply.aiId, messageWithSender);
      
      // 🎯 优化：缩短消息间延迟，让对话更流畅
      if (i < reply.messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 400)); // 从500ms缩短到400ms
      }
    }
    
    callbacks?.onAIComplete?.(reply.aiId, reply.messages);
    
    // 注意：AI之间的间隔已经移到循环开头处理，这里不需要了
  }
  
  // 所有AI完成
  callbacks?.onAllComplete?.(allReplies);
  
  return allReplies;
}

/**
 * 检测对话是否自然结束
 */
function detectConversationEnd(replies: GroupAIReply[]): boolean {
  if (replies.length === 0) return true;
  
  // 检查最后一轮回复的内容
  const lastRoundContent = replies
    .map(r => r.messages.map(m => m.content).join(' '))
    .join(' ')
    .toLowerCase();
  
  // 结束信号关键词
  const endSignals = [
    '再见', 'bye', '拜拜', '88',
    '好的，就这样', '好了', '就这样吧',
    '先这样', '先忙了', '去忙了',
    '有事先走了', '改天聊',
    '明白了', '知道了', '了解',
    '没事了', '没问题了'
  ];
  
  // 如果包含结束信号，判定为结束
  return endSignals.some(signal => lastRoundContent.includes(signal));
}

/**
 * 单轮生成函数
 */
async function generateSingleRound(
  aiMembers: Conversation[],
  groupConversation: Conversation,
  apiConfig: ApiConfig,
  allConversations: Conversation[],
  callbacks?: GroupChatCallback
): Promise<GroupAIReply[]> {
  // 随机选择回复的AI数量 (0 到 全部)
  const replyCount = Math.floor(Math.random() * (aiMembers.length + 1));
  
  // 如果没有AI回复，返回空数组
  if (replyCount === 0) {
    console.log('💤 本轮无AI回复');
    return [];
  }
  
  // 随机选择AI
  const shuffled = [...aiMembers].sort(() => Math.random() - 0.5);
  const selectedAIs = shuffled.slice(0, replyCount);
  console.log(`✅ 选中的AI: ${selectedAIs.map(ai => ai.characterSettings?.nickname || ai.name).join('、')}`);
  
  const roundReplies: GroupAIReply[] = [];
  
  // 依次为选中的AI生成回复
  for (let idx = 0; idx < selectedAIs.length; idx++) {
    const aiMember = selectedAIs[idx];
    
    // 🎯 优化：如果不是第一个AI，先等待短暂间隔
    if (idx > 0) {
      await new Promise(resolve => setTimeout(resolve, 200)); // AI之间的间隔
    }
    
    // 🎯 新设计：先调用API，让"发送中"提示承担API时间
    // 第一个AI：在"发送中"期间调用API
    // 后续AI：在前一个AI完成后立即调用API
    const reply = await generateAIReply(aiMember, groupConversation, apiConfig, allConversations, true);
    roundReplies.push(reply);
    
    // API返回后再显示打字动画（只有有内容时才显示）
    if (reply.status !== 'error' && reply.messages.length > 0) {
      // 显示打字动画
      callbacks?.onAIStart?.(aiMember.id, aiMember.characterSettings?.nickname || aiMember.name);
      callbacks?.onAITyping?.(aiMember.id);
      
      // 打字动画延迟（让用户看到打字效果）
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    if (reply.status === 'error') {
      callbacks?.onAIError?.(reply.aiId, reply.error || '未知错误');
      continue;
    }
    
    if (reply.messages.length === 0) {
      // AI选择不回复
      callbacks?.onAIComplete?.(reply.aiId, []);
      continue;
    }
    
    // 逐条发送消息（打字动画延迟已处理）
    for (let i = 0; i < reply.messages.length; i++) {
      const message = reply.messages[i];
      
      const messageWithSender = {
        ...message,
        senderId: reply.aiId,
        senderName: reply.aiName,
        senderAvatar: reply.aiAvatar,
      } as any;
      
      // 🎁 如果是群红包消息，更新红包信息中的发送者
      if (messageWithSender.moneyTransfer?.type === 'groupRedPacket' && messageWithSender.moneyTransfer.groupRedPacket) {
        messageWithSender.moneyTransfer.groupRedPacket.senderId = reply.aiId;
        messageWithSender.moneyTransfer.groupRedPacket.senderName = reply.aiName;
      }
      
      callbacks?.onAIMessage?.(reply.aiId, messageWithSender);
      
      // 🎯 优化：缩短消息间延迟，让对话更流畅
      if (i < reply.messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 400)); // 从500ms缩短到400ms
      }
    }
    
    callbacks?.onAIComplete?.(reply.aiId, reply.messages);
    
    // 注意：AI之间的间隔已经移到循环开头处理，这里不需要了
  }
  
  return roundReplies.filter(r => r.messages.length > 0);
}

/**
 * 群聊生成服务 - 自由模式（支持多轮回复）
 * 随机选择0到全部AI进行回复，支持2-3轮循环
 */
export async function generateGroupChatRepliesFreeMode(
  groupConversation: Conversation,
  apiConfig: ApiConfig,
  allConversations: Conversation[],
  callbacks?: GroupChatCallback
): Promise<GroupAIReply[]> {
  const members = groupConversation.members || [];
  const aiMembers = members
    .map(mid => allConversations.find(c => c.id === mid))
    .filter(c => c && c.type === 'private') as Conversation[];
  
  if (aiMembers.length === 0) {
    throw new Error('群聊中没有AI成员');
  }
  
  const MAX_ROUNDS = 3; // 最大轮数
  let currentRound = 0;
  const allReplies: GroupAIReply[] = [];
  
  console.log(`🔄 自由模式：开始多轮回复，最多${MAX_ROUNDS}轮`);
  
  while (currentRound < MAX_ROUNDS) {
    currentRound++;
    console.log(`\n📍 第${currentRound}轮回复开始...`);
    
    // 生成本轮回复
    const roundReplies = await generateSingleRound(
      aiMembers,
      groupConversation,
      apiConfig,
      allConversations,
      callbacks
    );
    
    // 收集所有回复
    allReplies.push(...roundReplies);
    
    // 如果本轮没有任何AI回复，结束
    if (roundReplies.length === 0) {
      console.log('💤 本轮无人回复，对话结束');
      break;
    }
    
    // 检测对话是否自然结束
    if (detectConversationEnd(roundReplies)) {
      console.log('✋ 检测到对话自然结束');
      break;
    }
    
    // 如果不是最后一轮，添加轮次间隔
    if (currentRound < MAX_ROUNDS) {
      console.log('⏳ 等待下一轮...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`\n✅ 自由模式完成，共${currentRound}轮，${allReplies.length}个AI回复`);
  
  // 所有轮次完成
  callbacks?.onAllComplete?.(allReplies);
  
  return allReplies;
}
