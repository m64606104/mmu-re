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
  const recentMessages = conversation.messages.slice(-10);
  
  let context = '';
  if (recentMessages.length > 0) {
    context = '\n\n【最近对话】\n' + recentMessages.map(m => {
      const speaker = m.role === 'user' ? '用户' : 'AI';
      return `${speaker}: ${m.content}`;
    }).join('\n');
  }
  
  let memoryContext = '';
  if (memories.length > 0) {
    memoryContext = '\n\n【记忆】\n' + memories.slice(0, 5).map(m => `- ${m.content}`).join('\n');
  }
  
  const currentTime = new Date();
  const hour = currentTime.getHours();
  const timeContext = hour < 12 ? '早上' : hour < 18 ? '下午' : '晚上';
  
  const lastMessageTime = recentMessages.length > 0 ? recentMessages[recentMessages.length - 1].timestamp : 0;
  const timeSinceLastMessage = Date.now() - lastMessageTime;
  const minutesSince = Math.floor(timeSinceLastMessage / (1000 * 60));
  const hoursSince = Math.floor(minutesSince / 60);
  
  let timeGap = '';
  if (hoursSince > 24) {
    timeGap = `距离上次聊天已经过去了${Math.floor(hoursSince / 24)}天`;
  } else if (hoursSince > 1) {
    timeGap = `距离上次聊天已经过去了${hoursSince}小时`;
  } else if (minutesSince > 30) {
    timeGap = `距离上次聊天已经过去了${minutesSince}分钟`;
  } else {
    timeGap = '刚刚结束聊天不久';
  }

  return `
你是${conversation.characterSettings?.nickname || conversation.name}，现在是${timeContext}（${currentTime.toLocaleString()}）。

【时间感知】：${timeGap}

【角色设定】：
${conversation.characterSettings?.systemPrompt || '你是一个友善的AI助手'}

【性格特点】：
- 说话风格：${conversation.characterSettings?.languageStyle || '自然友善'}
- 语言习惯：${conversation.characterSettings?.languageExample || '正常交流'}

你想主动发送一条消息给用户。根据时间间隔选择合适的开场：
- 如果刚聊完不久：可以补充刚才的话题或分享新想法
- 如果隔了几小时：可以问候并分享近况
- 如果隔了一天以上：要重新建立联系，不要假设对方记得之前的对话

【要求】：
- 必须保持与之前对话的连贯性
- 根据时间间隔调整语气和内容
- 不要突然跳转话题，要自然过渡
- 如果时间较长，要适当重新介绍话题背景
- 保持角色的一致性和真实感${context}${memoryContext}

请发送一条符合时间感知的自然消息：
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
        max_tokens: 800,
      })
    });
    
    if (!response.ok) {
      console.error('AI主动消息生成失败');
      return;
    }
    
    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content;
    
    if (!aiMessage) {
      console.error('未收到AI响应');
      return;
    }
    
    // 创建消息对象
    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant',
      content: aiMessage.trim(),
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
