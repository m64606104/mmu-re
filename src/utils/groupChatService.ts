import { Conversation, Message, ApiConfig, CharacterSettings } from '../types';
import { chatCompletion } from './chatApi';
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
- 可以使用图片、表情包等媒体格式
- 保持群聊的轻松氛围

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
 * 解析AI回复消息并拆分（使用私聊的splitMessages逻辑）
 */
function parseAIResponse(content: string): Message[] {
  if (!content || content.trim() === '' || content.includes('[不回复]')) {
    return [];
  }
  
  // 使用私聊的消息分割逻辑，支持多条气泡
  const contentArray = splitMessages(content);
  const messages: Message[] = contentArray.map((text, index) => ({
    id: `${Date.now()}_${index}_${Math.random()}`,
    role: 'assistant' as const,
    content: text,
    timestamp: Date.now() + index * 100,
  }));
  
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
    otherMembers.push({ name: '用户', role: '群主' });
    
    // 构建系统提示
    const systemPrompt = buildGroupChatSystemPrompt(
      aiMember.characterSettings!,
      groupConversation.name,
      otherMembers,
      isFreeMode
    );
    
    // 构建消息历史（最近20条）
    const recentMessages = groupConversation.messages.slice(-20);
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
      const errorInfo = await getErrorFromResponse(response);
      throw new Error(formatErrorMessage(errorInfo));
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
  for (const aiMember of aiMembers) {
    // 生成回复（先不通知开始，等确认有消息再通知）
    const reply = await generateAIReply(aiMember, groupConversation, apiConfig, allConversations, isFreeMode);
    allReplies.push(reply);
    
    if (reply.status === 'error') {
      callbacks?.onAIError?.(reply.aiId, reply.error || '未知错误');
      continue;
    }
    
    if (reply.messages.length === 0) {
      // AI选择不回复，不显示打字动画
      continue;
    }
    
    // 通知开始（只在有消息时）
    callbacks?.onAIStart?.(aiMember.id, aiMember.characterSettings?.nickname || aiMember.name);
    
    // 显示打字动画
    callbacks?.onAITyping?.(reply.aiId);
    
    // 等待一段时间模拟思考（缩短到300ms）
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 逐条发送消息
    for (let i = 0; i < reply.messages.length; i++) {
      const message = reply.messages[i];
      
      // 添加senderId以标识消息来源
      const messageWithSender = {
        ...message,
        senderId: reply.aiId,
        senderName: reply.aiName,
        senderAvatar: reply.aiAvatar,
      } as any;
      
      callbacks?.onAIMessage?.(reply.aiId, messageWithSender);
      
      // 每条消息之间短暂延迟（缩短到200ms）
      if (i < reply.messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    callbacks?.onAIComplete?.(reply.aiId, reply.messages);
  }
  
  // 所有AI完成
  callbacks?.onAllComplete?.(allReplies);
  
  return allReplies;
}

/**
 * 群聊生成服务 - 自由模式
 * 随机选择0到全部AI进行回复
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
  
  // 随机选择回复的AI数量 (0 到 全部)
  const replyCount = Math.floor(Math.random() * (aiMembers.length + 1));
  console.log(`🎲 自由模式：从${aiMembers.length}个AI中随机选择${replyCount}个回复`);
  
  // 如果没有AI回复，返回空数组
  if (replyCount === 0) {
    console.log('💤 本轮无AI回复');
    callbacks?.onAllComplete?.([]);
    return [];
  }
  
  // 随机选择AI
  const shuffled = [...aiMembers].sort(() => Math.random() - 0.5);
  const selectedAIs = shuffled.slice(0, replyCount);
  console.log(`✅ 选中的AI: ${selectedAIs.map(ai => ai.characterSettings?.nickname || ai.name).join('、')}`);
  
  const allReplies: GroupAIReply[] = [];
  
  // 依次为选中的AI生成回复
  for (const aiMember of selectedAIs) {
    // 生成回复（先不通知开始，等确认有消息再通知）
    const reply = await generateAIReply(aiMember, groupConversation, apiConfig, allConversations, true);
    allReplies.push(reply);
    
    if (reply.status === 'error') {
      callbacks?.onAIError?.(reply.aiId, reply.error || '未知错误');
      continue;
    }
    
    if (reply.messages.length === 0) {
      // AI选择不回复，不显示打字动画
      continue;
    }
    
    // 通知开始（只在有消息时）
    callbacks?.onAIStart?.(aiMember.id, aiMember.characterSettings?.nickname || aiMember.name);
    
    // 显示打字动画
    callbacks?.onAITyping?.(reply.aiId);
    
    // 等待一段时间模拟思考（缩短到300ms）
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 逐条发送消息
    for (let i = 0; i < reply.messages.length; i++) {
      const message = reply.messages[i];
      
      // 添加senderId以标识消息来源
      const messageWithSender = {
        ...message,
        senderId: reply.aiId,
        senderName: reply.aiName,
        senderAvatar: reply.aiAvatar,
      } as any;
      
      callbacks?.onAIMessage?.(reply.aiId, messageWithSender);
      
      // 每条消息之间短暂延迟（缩短到200ms）
      if (i < reply.messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    callbacks?.onAIComplete?.(reply.aiId, reply.messages);
  }
  
  // 所有AI完成
  callbacks?.onAllComplete?.(allReplies);
  
  return allReplies;
}
