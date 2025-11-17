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
  const recentMessages = conversation.messages.slice(-20); // 增加上下文数量
  
  // 🕒 构建带时间信息的对话上下文
  let context = '';
  if (recentMessages.length > 0) {
    context = '\n\n【最近对话记录】\n';
    
    // 找到最后一条用户消息和最后一条AI消息
    const lastUserMsg = [...recentMessages].reverse().find(m => m.role === 'user');
    const lastAIMsg = [...recentMessages].reverse().find(m => m.role === 'assistant');
    
    // 添加时间戳
    recentMessages.forEach(m => {
      const speaker = m.role === 'user' ? '用户' : '你';
      const time = new Date(m.timestamp);
      const timeStr = `${time.getMonth()+1}/${time.getDate()} ${String(time.getHours()).padStart(2,'0')}:${String(time.getMinutes()).padStart(2,'0')}`;
      context += `[${timeStr}] ${speaker}: ${m.content}\n`;
    });
    
    // 🕒 分析时间间隔
    const now = Date.now();
    if (lastAIMsg) {
      const timeSinceLastAI = now - lastAIMsg.timestamp;
      const hoursSince = Math.floor(timeSinceLastAI / (1000 * 60 * 60));
      const minutesSince = Math.floor((timeSinceLastAI % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hoursSince > 0) {
        context += `\n⚠️ 你最后一条消息是${hoursSince}小时${minutesSince}分钟前发的\n`;
      } else if (minutesSince > 30) {
        context += `\n⚠️ 你最后一条消息是${minutesSince}分钟前发的\n`;
      }
    }
    
    if (lastUserMsg) {
      const timeSinceLastUser = now - lastUserMsg.timestamp;
      const hoursSinceUser = Math.floor(timeSinceLastUser / (1000 * 60 * 60));
      const minutesSinceUser = Math.floor((timeSinceLastUser % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hoursSinceUser > 0) {
        context += `⚠️ 用户最后一条消息是${hoursSinceUser}小时${minutesSinceUser}分钟前发的\n`;
      }
    }
  }
  
  let memoryContext = '';
  if (memories.length > 0) {
    memoryContext = '\n\n【记忆】\n' + memories.slice(0, 5).map(m => `- ${m.content}`).join('\n');
  }
  
  // 🕒 详细的时间信息
  const currentTime = new Date();
  const year = currentTime.getFullYear();
  const month = currentTime.getMonth() + 1;
  const date = currentTime.getDate();
  const hour = currentTime.getHours();
  const minute = currentTime.getMinutes();
  const weekDay = ['\u5468\u65e5','\u5468\u4e00','\u5468\u4e8c','\u5468\u4e09','\u5468\u56db','\u5468\u4e94','\u5468\u516d'][currentTime.getDay()];
  const timePeriod = hour < 6 ? '\u51cc\u6668' : hour < 9 ? '\u65e9\u4e0a' : hour < 12 ? '\u4e0a\u5348' : hour < 14 ? '\u4e2d\u5348' : hour < 18 ? '\u4e0b\u5348' : hour < 22 ? '\u665a\u4e0a' : '\u6df1\u591c';
  
  const fullTimeContext = `${year}年${month}月${date}日 ${weekDay} ${timePeriod} ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
  
  return `
你是${conversation.characterSettings?.nickname || conversation.name}。

🕒 当前时间: ${fullTimeContext}

🤔 情境分析：
你现在想主动给用户发条消息。但请注意：

⛔ 禁止行为：
- ⛔ 绝对不要只是机械式的打招呼（例如："早！"、"早上好"、"下午好"）
- ⛔ 不要重复相同的内容或模式
- ⛔ 不要忽略之前的对话内容

✅ 应该做的：
1. **基于上下文**: 从之前的对话中找到可以继续的话题
2. **自然衔接**: 像真人一样基于之前说过的话来开启新话题
3. **分享生活**: 分享你的近况、想法、看到的有趣事情
4. **表达关心**: 如果对方之前提到什么事，可以问后续
5. **真实感**: 像真人朋友一样，不要像机器人

📝 示例（好的主动消息）：
- "我刚看到一个好笑的视频，想起了你之前说的..."
- "诶，你上次提到的那个事怎么样了？"
- "今天遇到了一件超离谱的事...（然后分享）"
- "突然想起你上次问的XXX，我发现..."
${context}
${memoryContext}

🎯 现在，请生成一条自然、有上下文联系的主动消息（直接输出消息内容，不需要其他说明）：
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
        temperature: 0.85, // 提高一些创造性
        max_tokens: 1000, // 增加到1000，确保消息不会被截断
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
