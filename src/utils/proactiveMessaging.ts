/**
 * AI主动发消息系统
 * 在后台定期检查并触发AI主动发送消息
 */

import { Conversation, Message, ApiConfig } from '../types';
import { getMemoryBank } from './memorySystem';

const STORAGE_KEY = 'proactive_messaging_state';

interface ProactiveMessagingState {
  conversationId: string;
  nextCheckTime: number;
}

/**
 * 获取所有需要检查的对话状态
 */
const getAllStates = (): ProactiveMessagingState[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/**
 * 保存对话状态
 */
const saveState = (conversationId: string, nextCheckTime: number): void => {
  try {
    const states = getAllStates();
    const index = states.findIndex(s => s.conversationId === conversationId);
    
    if (index >= 0) {
      states[index].nextCheckTime = nextCheckTime;
    } else {
      states.push({ conversationId, nextCheckTime });
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
  } catch (error) {
    console.error('Failed to save proactive messaging state:', error);
  }
};

/**
 * 检查是否应该发送主动消息
 */
export const shouldSendProactiveMessage = (conversation: Conversation): boolean => {
  const settings = conversation.characterSettings?.proactiveMessaging;
  
  if (!settings || !settings.enabled) {
    return false;
  }
  
  const now = Date.now();
  const currentHour = new Date().getHours();
  
  // 检查是否在活跃时段内
  if (currentHour < settings.activeHourStart || currentHour > settings.activeHourEnd) {
    return false;
  }
  
  // 检查是否到了下次检查时间
  const states = getAllStates();
  const state = states.find(s => s.conversationId === conversation.id);
  
  if (state && now < state.nextCheckTime) {
    return false;
  }
  
  // 检查上次发送时间
  if (settings.lastMessageTime) {
    const timeSinceLastMessage = now - settings.lastMessageTime;
    const minIntervalMs = settings.minInterval * 60 * 1000;
    
    if (timeSinceLastMessage < minIntervalMs) {
      return false;
    }
  }
  
  return true;
};

/**
 * 生成下次检查时间（随机间隔）
 */
const generateNextCheckTime = (minInterval: number, maxInterval: number): number => {
  const randomInterval = Math.floor(
    Math.random() * (maxInterval - minInterval + 1) + minInterval
  );
  return Date.now() + randomInterval * 60 * 1000;
};

/**
 * 生成AI主动消息的prompt
 */
const buildProactiveMessagePrompt = (conversation: Conversation): string => {
  const memories = getMemoryBank(conversation.id).memories;
  // 增加上下文数量，包含更多对话历史
  const recentMessages = conversation.messages.slice(-20);
  
  let context = '';
  if (recentMessages.length > 0) {
    const lastMessage = recentMessages[recentMessages.length - 1];
    const timeSinceLastMessage = Math.floor((Date.now() - lastMessage.timestamp) / (1000 * 60)); // 分钟
    
    context = `\n\n【最近对话】（${timeSinceLastMessage}分钟前）\n` + recentMessages.map((m) => {
      const speaker = m.role === 'user' ? '用户' : 'AI';
      const timeAgo = Math.floor((Date.now() - m.timestamp) / (1000 * 60));
      return `[${timeAgo}分钟前] ${speaker}: ${m.content.slice(0, 100)}${m.content.length > 100 ? '...' : ''}`;
    }).slice(-10).join('\n'); // 只显示最后10条，但包含时间信息
  }
  
  let memoryContext = '';
  if (memories.length > 0) {
    memoryContext = '\n\n【重要记忆】\n' + memories.slice(0, 3).map(m => `- ${m.content}`).join('\n');
  }
  
  const currentTime = new Date();
  const hour = currentTime.getHours();
  const timeContext = hour < 12 ? '早上' : hour < 18 ? '下午' : '晚上';
  
  return `
你是${conversation.characterSettings?.nickname || conversation.name}，现在是${timeContext}。

【重要提醒】：
- 你是在正在进行的对话中主动发消息，不是开始新对话
- 要自然地接续之前的话题，保持对话的连贯性
- 考虑上次对话的时间间隔，调整你的语气和话题
- 如果刚刚在聊天，就像是想起了什么补充的内容
- 如果间隔较长，可以询问近况或分享新想法

【你可以】：
- 补充刚才话题的想法
- 分享相关的新想法
- 询问对方的近况
- 表达关心或兴趣
- 自然地转换话题

【要求】：
- 语气要自然，就像真正的朋友聊天
- 消息长度适中，不要太长（50字以内）
- 要体现时间的连续性，不要像重新开始
- 根据对话间隔调整语气（刚说完vs时间较长）
${context}
${memoryContext}

请生成一条自然连贯的消息：
`.trim();
};

/**
 * 发送AI主动消息
 */
export const sendProactiveMessage = async (
  conversation: Conversation,
  apiConfig: ApiConfig,
  onNewMessage: (conversationId: string, message: Message) => void,
  onUpdateSettings: (conversationId: string, lastMessageTime: number) => void
): Promise<void> => {
  const settings = conversation.characterSettings?.proactiveMessaging;
  
  if (!settings || !settings.enabled) {
    return;
  }
  
  try {
    console.log(`🤖 ${conversation.name} 准备主动发送消息...`);
    
    const prompt = buildProactiveMessagePrompt(conversation);
    
    // 调用AI生成消息
    const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 300, // 增加token限制，防止消息被截断
        stream: false,
      })
    });
    
    if (!response.ok) {
      console.error('AI主动消息生成失败');
      return;
    }
    
    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content;
    
    if (!aiMessage) {
      console.error('未收到AI响应:', data);
      return;
    }
    
    // 检查是否被截断（以句号、问号、感叹号结尾为完整）
    const cleanMessage = aiMessage.trim();
    const isComplete = /[。！？.!?]$/.test(cleanMessage);
    
    if (!isComplete && cleanMessage.length > 50) {
      console.warn('⚠️ AI主动消息可能被截断:', cleanMessage);
    }
    
    // 创建消息对象
    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant',
      content: cleanMessage,
      timestamp: Date.now(),
    };
    
    // 添加消息到对话
    onNewMessage(conversation.id, newMessage);
    
    // 更新最后发送时间
    const now = Date.now();
    onUpdateSettings(conversation.id, now);
    
    // 计算下次检查时间
    const nextCheckTime = generateNextCheckTime(settings.minInterval, settings.maxInterval);
    saveState(conversation.id, nextCheckTime);
    
    console.log(`✅ ${conversation.name} 主动消息已发送，下次检查时间: ${new Date(nextCheckTime).toLocaleString()}`);
    
  } catch (error) {
    console.error('发送AI主动消息失败:', error);
  }
};

/**
 * 初始化对话的主动消息状态
 */
export const initProactiveMessaging = (conversation: Conversation): void => {
  const settings = conversation.characterSettings?.proactiveMessaging;
  
  if (!settings || !settings.enabled) {
    return;
  }
  
  const states = getAllStates();
  const existing = states.find(s => s.conversationId === conversation.id);
  
  if (!existing) {
    // 设置初始检查时间（随机延迟）
    const nextCheckTime = generateNextCheckTime(settings.minInterval, settings.maxInterval);
    saveState(conversation.id, nextCheckTime);
  }
};

/**
 * 清除对话的主动消息状态
 */
export const clearProactiveMessaging = (conversationId: string): void => {
  try {
    const states = getAllStates().filter(s => s.conversationId !== conversationId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
  } catch (error) {
    console.error('Failed to clear proactive messaging state:', error);
  }
};
