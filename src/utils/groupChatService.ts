import { Message, ApiConfig, Conversation, CharacterSettings } from '../types';
import { getErrorFromResponse, formatErrorMessage } from './apiErrorHandler';

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
  otherMembers: Array<{ name: string; role: string }> // 其他成员信息
): string {
  const membersList = otherMembers.map(m => `${m.name}(${m.role})`).join('、');
  
  return `你是${aiSettings.nickname}。

【群聊环境】：
- 这是一个名为"${groupName}"的群聊
- 群成员：${membersList}
- 你需要在群聊中以自己的角色身份自然地参与对话

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

✅ **正确做法**：
- ✅ 直接用自然的中文回复
- ✅ 像朋友聊天一样表达
- ✅ 根据角色性格自然发言`;
}

/**
 * 解析AI回复消息并拆分
 */
function parseAIResponse(content: string): Message[] {
  if (!content || content.trim() === '' || content.includes('[不回复]')) {
    return [];
  }
  
  // 按双换行或单换行分割消息（群聊通常是短消息）
  const parts = content.split(/\n\n|\n/).filter(p => p.trim());
  const messages: Message[] = [];
  
  parts.forEach((part, index) => {
    const trimmed = part.trim();
    if (!trimmed) return;
    
    messages.push({
      id: `${Date.now()}_${index}`,
      role: 'assistant',
      content: trimmed,
      timestamp: Date.now() + index * 100,
    });
  });
  
  return messages;
}

/**
 * 为单个AI成员生成回复
 */
async function generateAIReply(
  aiMember: Conversation,
  groupConversation: Conversation,
  apiConfig: ApiConfig,
  allConversations: Conversation[]
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
      otherMembers
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
 * 群聊生成服务主函数
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
  
  // 依次为每个AI生成回复
  for (const aiMember of aiMembers) {
    // 通知开始
    callbacks?.onAIStart?.(aiMember.id, aiMember.characterSettings?.nickname || aiMember.name);
    
    // 生成回复
    const reply = await generateAIReply(aiMember, groupConversation, apiConfig, allConversations);
    allReplies.push(reply);
    
    if (reply.status === 'error') {
      callbacks?.onAIError?.(reply.aiId, reply.error || '未知错误');
      continue;
    }
    
    if (reply.messages.length === 0) {
      // AI选择不回复
      callbacks?.onAIComplete?.(reply.aiId, []);
      continue;
    }
    
    // 逐条发送消息（模拟打字效果）
    for (const message of reply.messages) {
      callbacks?.onAITyping?.(reply.aiId);
      // 等待一小段时间模拟打字
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 添加senderId以标识消息来源
      const messageWithSender = {
        ...message,
        senderId: reply.aiId,
        senderName: reply.aiName,
        senderAvatar: reply.aiAvatar,
      } as any;
      
      callbacks?.onAIMessage?.(reply.aiId, messageWithSender);
    }
    
    callbacks?.onAIComplete?.(reply.aiId, reply.messages);
  }
  
  // 所有AI完成
  callbacks?.onAllComplete?.(allReplies);
  
  return allReplies;
}
