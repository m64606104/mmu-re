// 🤖 AI 智能轨迹生成器
// 使用 AI API 生成更灵活、更符合角色的行动轨迹描述

import { FootprintActivity, ActivityType } from '../types/footprint';
import { Message } from '../types';

interface AIGenerationConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface ChatContext {
  messages: Message[];
  characterName: string;
  characterProfile: any;
  timeContext: any;
}

class AIFootprintGeneratorService {
  private config: AIGenerationConfig;

  constructor(config: AIGenerationConfig = {}) {
    this.config = {
      model: config.model || 'gpt-3.5-turbo',
      temperature: config.temperature || 0.8, // 较高温度，更有创造性
      maxTokens: config.maxTokens || 150,
      apiKey: config.apiKey
    };
  }

  // 使用 AI 生成聊天活动描述（无降级方案）
  async generateChatActivityDescription(context: ChatContext): Promise<string> {
    const { messages, characterName, characterProfile, timeContext } = context;
    
    if (!this.config.apiKey) {
      throw new Error('未配置 AI API Key，无法生成个性化描述');
    }
    
    // 提取聊天主题和情绪
    const chatSummary = this.extractChatSummary(messages);
    
    const prompt = this.buildChatActivityPrompt(
      characterName,
      characterProfile,
      chatSummary,
      timeContext
    );

    const description = await this.callAIAPI(prompt);
    if (!description || description.trim().length === 0) {
      throw new Error('生成的描述为空，请重试');
    }
    
    return description;
  }

  // 使用 AI 生成朋友圈活动描述（无降级方案）
  async generateMomentsActivityDescription(
    characterName: string,
    characterProfile: any,
    momentsContent: string,
    timeContext: any
  ): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('未配置 AI API Key，无法生成个性化描述');
    }
    
    const prompt = this.buildMomentsActivityPrompt(
      characterName,
      characterProfile,
      momentsContent,
      timeContext
    );

    const description = await this.callAIAPI(prompt);
    if (!description || description.trim().length === 0) {
      throw new Error('生成的描述为空，请重试');
    }
    
    return description;
  }

  // 使用 AI 生成日常活动描述（无降级方案）
  async generateRoutineActivityDescription(
    characterProfile: any,
    timeContext: any,
    recentActivities: FootprintActivity[]
  ): Promise<{ activity: string; activityType: ActivityType }> {
    if (!this.config.apiKey) {
      throw new Error('未配置 AI API Key，无法生成个性化描述');
    }
    
    const prompt = this.buildRoutineActivityPrompt(
      characterProfile,
      timeContext,
      recentActivities
    );

    const result = await this.callAIAPI(prompt);
    const parsed = this.parseRoutineActivityResult(result);
    
    if (!parsed) {
      throw new Error('解析生成结果失败，请重试');
    }
    
    return parsed;
  }

  // === Prompt 构建方法 ===

  private buildChatActivityPrompt(
    characterName: string,
    profile: any,
    chatSummary: any,
    timeContext: any
  ): string {
    const { occupation = '学生', personality = '温柔体贴', location = '上海' } = profile;
    const { topic, mood, messageCount } = chatSummary;
    const timeDesc = this.getTimeDescription(timeContext);

    return `你是${characterName}，${occupation}，性格${personality}，生活在${location}。

刚才${timeDesc}和好友聊了${messageCount}条消息，主题是"${topic}"，气氛${mood}。

请用第一人称，生成一句自然的行动记录（15-30字），描述这次聊天。要求：
1. 符合你的性格和职业特点
2. 自然随意，像真人的记录
3. 不要太正式或模板化
4. 可以包含情绪和感受

只返回描述文本，不要任何解释。`;
  }

  private buildMomentsActivityPrompt(
    characterName: string,
    profile: any,
    momentsContent: string,
    timeContext: any
  ): string {
    const { occupation = '学生', personality = '温柔体贴', location = '上海' } = profile;
    const timeDesc = this.getTimeDescription(timeContext);

    return `你是${characterName}，${occupation}，性格${personality}，生活在${location}。

刚才${timeDesc}发了一条朋友圈："${momentsContent.substring(0, 50)}..."

请用第一人称，生成一句自然的行动记录（15-30字），描述发朋友圈这个动作。要求：
1. 符合你的性格和地点特点
2. 自然随意，像真人的记录
3. 可以提及心情或动机
4. 不要直接复述朋友圈内容

只返回描述文本，不要任何解释。`;
  }

  private buildRoutineActivityPrompt(
    profile: any,
    timeContext: any,
    recentActivities: FootprintActivity[]
  ): string {
    const { occupation = '学生', personality = '温柔体贴', interests = [] } = profile;
    const { hour, isWeekend } = timeContext;
    const timeDesc = this.getTimeDescription(timeContext);

    const recentDesc = recentActivities.length > 0
      ? `最近的活动：${recentActivities.slice(0, 3).map(a => a.activity).join('、')}`
      : '';

    return `你是一个${occupation}，性格${personality}，兴趣：${interests.join('、') || '阅读、电影'}。

现在是${timeDesc}（${hour}点），${isWeekend ? '周末' : '工作日'}。
${recentDesc}

请推测你现在可能在做什么，并返回JSON格式：
{
  "activity": "一句自然的活动描述（10-20字）",
  "activityType": "类型（chatting/working/entertainment/reading/thinking/sleeping/social/exercise等）"
}

要求：
1. 符合时间、职业和性格
2. 自然合理，不要太离谱
3. 避免与最近活动重复
4. 如果是深夜/凌晨，优先是睡眠

只返回JSON，不要任何解释。`;
  }

  // === AI API 调用 ===

  private async callAIAPI(prompt: string): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('AI_API_KEY_MISSING');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: '你是一个帮助生成自然、真实的人物活动记录的助手。严格按照要求返回内容，不要添加额外的解释。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens
        })
      });

      if (!response.ok) {
        await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('AI_API_UNAUTHORIZED');
        } else if (response.status === 429) {
          throw new Error('AI_API_RATE_LIMITED');
        } else if (response.status >= 500) {
          throw new Error('AI_API_SERVER_ERROR');
        } else {
          throw new Error(`AI_API_ERROR: ${response.status}`);
        }
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      
      if (!content) {
        throw new Error('AI_API_EMPTY_RESPONSE');
      }
      
      return content;
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('AI_API_NETWORK_ERROR');
      }
      throw error;
    }
  }
  
  // 错误类型对应中文消息
  static getErrorMessage(error: Error): string {
    const errorMessages: Record<string, string> = {
      'AI_API_KEY_MISSING': '未配置 AI API Key，请在设置中配置',
      'AI_API_UNAUTHORIZED': 'AI API Key 无效，请检查配置',
      'AI_API_RATE_LIMITED': 'AI API 调用频率过高，请稍后重试',
      'AI_API_SERVER_ERROR': 'AI API 服务器错误，请稍后重试',
      'AI_API_NETWORK_ERROR': '网络连接错误，请检查网络',
      'AI_API_EMPTY_RESPONSE': 'AI 返回内容为空，请重试'
    };
    
    return errorMessages[error.message] || `生成失败: ${error.message}`;
  }

  // === 辅助方法 ===

  private extractChatSummary(messages: Message[]): {
    topic: string;
    mood: string;
    messageCount: number;
  } {
    const userMessages = messages.filter(m => m.role === 'user');
    const allText = userMessages.map(m => m.content).join(' ');

    // 简单的主题提取
    const topics = {
      '工作': ['工作', '上班', '公司', '项目', '任务', '会议'],
      '学习': ['学习', '课程', '考试', '作业', '论文', '研究'],
      '生活': ['生活', '日常', '吃饭', '休息', '睡觉', '家里'],
      '心情': ['心情', '情绪', '开心', '难过', '生气', '焦虑'],
      '娱乐': ['游戏', '电影', '音乐', '小说', '旅游', '运动'],
      '关系': ['朋友', '家人', '恋爱', '关系', '感情', '相处']
    };

    let topic = '日常对话';
    for (const [key, keywords] of Object.entries(topics)) {
      if (keywords.some(word => allText.includes(word))) {
        topic = key;
        break;
      }
    }

    // 简单的情绪判断
    const positiveMoods = ['开心', '高兴', '愉快', '哈哈', '😊', '👍'];
    const negativeMoods = ['难过', '伤心', '生气', '😢', '😡', '😞'];
    
    let mood = '轻松';
    if (positiveMoods.some(word => allText.includes(word))) {
      mood = '开心愉快';
    } else if (negativeMoods.some(word => allText.includes(word))) {
      mood = '有些沉重';
    }

    return {
      topic,
      mood,
      messageCount: messages.length
    };
  }

  private getTimeDescription(timeContext: any): string {
    const { hour } = timeContext;
    
    if (hour < 6) return '深夜';
    if (hour < 9) return '早上';
    if (hour < 12) return '上午';
    if (hour < 14) return '中午';
    if (hour < 18) return '下午';
    if (hour < 22) return '晚上';
    return '深夜';
  }

  private parseRoutineActivityResult(
    result: string
  ): { activity: string; activityType: ActivityType } | null {
    try {
      const parsed = JSON.parse(result);
      return {
        activity: parsed.activity,
        activityType: parsed.activityType as ActivityType
      };
    } catch (error) {
      console.error('解析 AI 返回结果失败:', error, result);
      return null;
    }
  }

  // === 已移除降级方案，使用报错+重试机制 ===
}

// 导出单例
export const aiFootprintGenerator = new AIFootprintGeneratorService();

// 导出配置更新方法
export const configureAIGenerator = (config: AIGenerationConfig) => {
  return new AIFootprintGeneratorService(config);
};
