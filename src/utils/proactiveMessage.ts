import { Conversation, ApiConfig, Message } from '../types';

// AI主动消息配置
export interface ProactiveMessageConfig {
  enabled: boolean;
  minInterval: number; // 最小间隔（分钟）
  maxInterval: number; // 最大间隔（分钟）
  triggerProbability: number; // 触发概率 0-1
}

// 默认配置
export const DEFAULT_PROACTIVE_CONFIG: ProactiveMessageConfig = {
  enabled: true,
  minInterval: 30,
  maxInterval: 180,
  triggerProbability: 0.7,
};

// 生成主动消息的提示词
export const generateProactivePrompt = (conversation: Conversation): string => {
  const settings = conversation.characterSettings;
  const lastMessages = conversation.messages.slice(-5);
  
  let prompt = `你是${settings?.nickname || conversation.name}。`;
  
  if (settings?.systemPrompt) {
    prompt += `\n${settings.systemPrompt}`;
  }
  
  if (settings?.personality) {
    prompt += `\n性格：${settings.personality}`;
  }
  
  if (settings?.languageStyle) {
    prompt += `\n说话风格：${settings.languageStyle}`;
  }
  
  prompt += `\n\n现在请你主动发起一条消息。要求：
1. 根据你的性格和说话风格
2. 可以是问候、分享心情、询问对方、分享有趣的事情等
3. 消息要自然、生动，符合角色设定
4. 不要太长，1-2句话即可
5. 不要重复之前的对话内容`;

  if (lastMessages.length > 0) {
    prompt += `\n\n最近的对话：\n${lastMessages.map(m => 
      `${m.role === 'user' ? '对方' : '你'}：${m.content}`
    ).join('\n')}`;
  }

  return prompt;
};

// 调用API生成主动消息
export const generateProactiveMessage = async (
  conversation: Conversation,
  apiConfig: ApiConfig
): Promise<string> => {
  if (!apiConfig.baseUrl || !apiConfig.apiKey || !apiConfig.modelName) {
    throw new Error('API配置不完整');
  }

  const prompt = generateProactivePrompt(conversation);

  try {
    const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: '请发送一条主动消息' },
        ],
        temperature: 0.9, // 提高创造性
        max_tokens: 500, // 增加token限制，避免消息被截断
      }),
    });

    if (!response.ok) {
      throw new Error('API请求失败');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '嗨~';
  } catch (error) {
    console.error('生成主动消息失败:', error);
    throw error;
  }
};

// 检查是否应该触发主动消息
export const shouldTriggerProactiveMessage = (
  conversation: Conversation,
  config: ProactiveMessageConfig
): boolean => {
  if (!config.enabled) return false;
  
  // 检查最后一条消息的时间
  const lastMessageTime = conversation.lastMessageTime;
  const now = Date.now();
  const timeDiff = (now - lastMessageTime) / 1000 / 60; // 转换为分钟
  
  // 如果时间间隔在配置范围内，根据概率决定是否触发
  if (timeDiff >= config.minInterval && timeDiff <= config.maxInterval) {
    return Math.random() < config.triggerProbability;
  }
  
  // 如果超过最大间隔，必定触发
  if (timeDiff > config.maxInterval) {
    return true;
  }
  
  return false;
};

// 创建主动消息
export const createProactiveMessage = (content: string): Message => {
  return {
    id: Date.now().toString() + Math.random(),
    role: 'assistant',
    content,
    timestamp: Date.now(),
  };
};
