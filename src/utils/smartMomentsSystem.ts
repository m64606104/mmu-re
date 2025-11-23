/**
 * 朋友圈智能系统 2.0
 * 
 * 核心改进：
 * 1. 智能化prompt（去除硬编码示例）
 * 2. 社交关系驱动互动
 * 3. 事件驱动架构
 */

import { Conversation, MomentPost, ApiConfig } from '../types';
import TrendingContentGenerator from './trendingContentGenerator';
import { SimplifiedMomentsGenerator } from './simplifiedMomentsGenerator';

/**
 * 智能朋友圈生成器
 * 根据角色设定和时间情境，生成合适的朋友圈
 */
export class SmartMomentsGenerator {
  /**
   * 构建多样化智能Prompt
   */
  static async buildDiversePrompt(
    conversation: Conversation,
    currentTime: Date
  ): Promise<{ prompt: string; expectedFormat: any }> {
    // 🎯 获取精简版内容建议（6种核心类型）
    const generatedContent = SimplifiedMomentsGenerator.generateContent(conversation);
    const { content: suggestedContent, format, shareData: _shareData } = generatedContent;
    const theme = format.type;
    // TODO: shareData将在下一步集成真实音乐API和内容生成器时使用
    
    const characterSettings = conversation.characterSettings;
    const nickname = characterSettings?.nickname || conversation.name;
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    const dayOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][currentTime.getDay()];
    
    // 🎯 获取潮流内容建议作为备选
    const trendingSuggestion = TrendingContentGenerator.generateContentSuggestion(
      hour, 
      characterSettings?.personality
    );
    
    // 根据精简版格式调整prompt（6种核心类型）
    let formatInstructions = '';
    switch (format.type) {
      case 'text_only':
        formatInstructions = '• 这次发纯文字内容，不配图片\n• 文字要有深度和思考性';
        break;
      case 'single_image':
        formatInstructions = '• 配1张图片\n• 文字简洁有力';
        break;
      case 'multi_image':
        formatInstructions = `• 配${format.imageCount}张图片\n• 展示丰富的生活场景`;
        break;
      case 'life_sharing':
        formatInstructions = '• 分享生活中的实物照片\n• 展示真实的生活细节';
        break;
      case 'link_sharing':
        formatInstructions = '• 分享音乐或文章链接\n• 简短评论表达你的想法';
        break;
      case 'mood_moment':
        formatInstructions = '• 表达当下心情和感受\n• 真实自然的情感流露';
        break;
    }
    
    const prompt = `你是${nickname}。

【角色信息】
${characterSettings?.systemPrompt || ''}
性格：${characterSettings?.personality || ''}
说话风格：${characterSettings?.languageStyle || ''}

【当前时间】
${dayOfWeek} ${hour}:${minute.toString().padStart(2, '0')}

【内容主题】
本次发朋友圈的主题是：${theme}

【格式要求】
${formatInstructions}

【内容建议】
可以参考以下内容方向（选择性使用）：
- 多样化建议：${suggestedContent}
- 潮流元素：${trendingSuggestion.content}
- 话题标签：${trendingSuggestion.hashtags.join(' ')}

【核心要求】
1. 内容要符合你的身份、性格，融入真实生活场景
2. 避免与最近的朋友圈内容重复或相似
3. 可以融入时下热梗，但要自然不刻意
4. 根据时间情境调整内容风格
5. 文字长度：${format.textLength === 'short' ? '1句话' : format.textLength === 'long' ? '3-4句话' : '1-2句话'}
6. 图片数量：${format.imageCount}张
7. 图片描述要详细生动（30-80字），包含场景细节、色彩、光影、氛围
8. ⚠️ 禁止第一人称描述图片（用"画面中"、"一个女孩"等）

【输出格式】
时间：HH:MM

朋友圈文字内容
${format.imageCount > 0 ? Array(format.imageCount).fill(0).map((_, i) => `[图片${i + 1}:详细的图片描述]`).join('\n') : ''}

现在生成：`;

    return { 
      prompt, 
      expectedFormat: { 
        theme, 
        format,
        imageCount: format.imageCount 
      } 
    };
  }

  /**
   * 构建智能Prompt（简化版 - 保持向后兼容）
   */
  static async buildSmartPrompt(
    conversation: Conversation,
    currentTime: Date
  ): Promise<string> {
    const characterSettings = conversation.characterSettings;
    const nickname = characterSettings?.nickname || conversation.name;
    
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    const dayOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][currentTime.getDay()];
    
    // 🎯 获取潮流内容建议
    const trendingSuggestion = TrendingContentGenerator.generateContentSuggestion(
      hour, 
      characterSettings?.personality
    );
    
    // 🔥 极简Prompt - AI自己理解，不需要海量示例
    return `你是${nickname}。

【角色信息】
${characterSettings?.systemPrompt || ''}
性格：${characterSettings?.personality || ''}
说话风格：${characterSettings?.languageStyle || ''}

【当前时间】
${dayOfWeek} ${hour}:${minute.toString().padStart(2, '0')}

【潮流内容建议】
${trendingSuggestion.content}
推荐话题标签：${trendingSuggestion.hashtags.join(' ')}

【任务】
生成一条符合你身份和当前情境的朋友圈。可以参考潮流内容建议，但要结合你的性格特点。

【核心要求】
1. 内容要符合你的身份、性格，可以融入时下热梗和潮流元素
2. 时间要符合当前情境（早上/中午/晚上等）
3. 长度1-3句话，自然真实，有生活气息
4. 可以使用网络用语，但要自然不刻意
5. 可以配0-9张图片，根据内容决定
6. 图片描述要详细生动（30-80字），包含场景细节、色彩、光影、氛围
7. ⚠️ 禁止第一人称描述图片（用"画面中"、"一个女孩"等）

【输出格式】
时间：HH:MM

朋友圈文字内容
[图片1:详细的图片描述]
[图片2:详细的图片描述]

示例：
时间：14:30

图书馆好安静，适合看书📚
[图片1:靠窗的木质长桌上摆着几本专业书籍和笔记本，午后的阳光透过百叶窗洒在桌面上，投下斑驳的光影，旁边放着一杯冒着热气的咖啡]

现在生成：`;
  }

  /**
   * 智能决定是否发朋友圈
   */
  static async shouldPostMoment(
    conversation: Conversation
  ): Promise<{ should: boolean; reason: string }> {
    // 简单的发布频率控制
    const now = Date.now();
    const today = new Date().toDateString();
    const storageKey = `moments_count_${conversation.id}_${today}`;
    const todayCount = parseInt(localStorage.getItem(storageKey) || '0');
    
    const lastPostKey = `last_moment_${conversation.id}`;
    const lastPostTime = parseInt(localStorage.getItem(lastPostKey) || '0');
    const hoursSinceLastPost = (now - lastPostTime) / (1000 * 60 * 60);

    // 简单规则：今天发了3条以上，或距离上次不到2小时，就不发了
    if (todayCount >= 3) {
      return { should: false, reason: '今天已发够了' };
    }
    
    if (hoursSinceLastPost < 2) {
      return { should: false, reason: '距离上次太近' };
    }

    return { should: true, reason: '可以发朋友圈' };
  }
}

/**
 * 社交关系管理器
 */
export class SocialRelationshipManager {
  private static readonly STORAGE_KEY = 'ai_social_relationships';

  /**
   * 获取两个AI之间的关系等级
   */
  static getRelationshipLevel(aiId1: string, aiId2: string): 'stranger' | 'acquaintance' | 'friend' | 'close_friend' {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      const relationships = data ? JSON.parse(data) : {};
      const key = [aiId1, aiId2].sort().join('_');
      return relationships[key] || 'stranger';
    } catch {
      return 'stranger';
    }
  }

  /**
   * 设置关系等级
   */
  static setRelationshipLevel(
    aiId1: string, 
    aiId2: string, 
    level: 'stranger' | 'acquaintance' | 'friend' | 'close_friend'
  ): void {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      const relationships = data ? JSON.parse(data) : {};
      const key = [aiId1, aiId2].sort().join('_');
      relationships[key] = level;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(relationships));
    } catch (err) {
      console.error('设置社交关系失败:', err);
    }
  }

  /**
   * 根据关系决定互动概率
   */
  static getInteractionProbability(level: 'stranger' | 'acquaintance' | 'friend' | 'close_friend'): number {
    const probabilities = {
      'stranger': 0.05,      // 陌生人：5%概率
      'acquaintance': 0.15,  // 认识：15%概率
      'friend': 0.40,        // 朋友：40%概率
      'close_friend': 0.70   // 密友：70%概率
    };
    return probabilities[level];
  }

  /**
   * 智能决定是否互动（考虑社交关系）
   */
  static shouldInteract(
    viewerId: string,
    authorId: string,
    interactionType: 'like' | 'comment'
  ): boolean {
    // 特殊处理：用户的朋友圈
    if (authorId === 'user') {
      // AI和用户的互动概率较高
      return Math.random() < 0.5; // 50%
    }

    const relationship = this.getRelationshipLevel(viewerId, authorId);
    const baseProbability = this.getInteractionProbability(relationship);
    
    // 评论比点赞概率低
    const finalProbability = interactionType === 'comment' 
      ? baseProbability * 0.5 
      : baseProbability;

    return Math.random() < finalProbability;
  }
}

/**
 * 智能互动决策引擎
 */
export class SmartInteractionEngine {
  /**
   * 统一的互动决策（替代原来分散的逻辑）
   */
  static async makeDecision(
    viewer: Conversation,
    post: MomentPost,
    apiConfig: ApiConfig
  ): Promise<{
    action: 'like' | 'comment' | 'none';
    commentContent?: string;
    reason: string;
  }> {
    // 1. 社交关系过滤
    if (post.authorId && post.authorId !== 'user') {
      const shouldLike = SocialRelationshipManager.shouldInteract(
        viewer.id, 
        post.authorId, 
        'like'
      );
      const shouldComment = SocialRelationshipManager.shouldInteract(
        viewer.id,
        post.authorId,
        'comment'
      );

      if (!shouldLike && !shouldComment) {
        return {
          action: 'none',
          reason: '社交关系不够亲密，选择不互动'
        };
      }
    }

    // 2. 让AI决定具体行为
    const prompt = `你是${viewer.characterSettings?.nickname}。

你看到了${post.authorId === 'user' ? '用户' : '另一个AI'}发的朋友圈：
"${post.content}"
${post.imageDescriptions ? `配图：${post.imageDescriptions.join('、')}` : ''}

根据你的性格，决定是否互动：

【输出JSON格式】
{
  "action": "like" 或 "comment" 或 "none",
  "comment": "评论内容"（如果action是comment），
  "reason": "决策理由"
}`;

    try {
      const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: apiConfig.modelName,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 200
        })
      });

      if (!response.ok) return { action: 'none', reason: 'API错误' };

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) return { action: 'none', reason: '解析失败' };

      const result = JSON.parse(jsonMatch[0]);
      
      return {
        action: result.action || 'none',
        commentContent: result.comment,
        reason: result.reason || ''
      };
    } catch (error) {
      console.error('互动决策失败:', error);
      return { action: 'none', reason: '决策失败' };
    }
  }
}

/**
 * 事件驱动的朋友圈系统
 */
export class MomentsEventSystem {
  private static listeners: Map<string, Function[]> = new Map();

  /**
   * 订阅事件
   */
  static subscribe(event: 'moment_posted' | 'moment_liked' | 'moment_commented', callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * 触发事件
   */
  static async emit(event: 'moment_posted' | 'moment_liked' | 'moment_commented', data: any) {
    const callbacks = this.listeners.get(event) || [];
    for (const callback of callbacks) {
      try {
        await callback(data);
      } catch (err) {
        console.error(`事件${event}处理失败:`, err);
      }
    }
  }

  /**
   * 初始化事件系统
   */
  static initialize() {
    // 当有朋友圈发布时，通知其他AI
    this.subscribe('moment_posted', async (data: { post: MomentPost; authorId: string }) => {
      console.log(`📢 事件：${data.authorId}发布了朋友圈`);
      // 这里可以触发其他AI的互动
    });

    // 当有人点赞时，通知作者
    this.subscribe('moment_liked', async (data: { postId: string; likerId: string }) => {
      console.log(`❤️ 事件：${data.likerId}点赞了朋友圈`);
    });

    // 当有人评论时，通知作者和其他参与者
    this.subscribe('moment_commented', async (data: { postId: string; commenterId: string; content: string }) => {
      console.log(`💬 事件：${data.commenterId}评论了朋友圈`);
    });
  }
}

export default {
  SmartMomentsGenerator,
  SocialRelationshipManager,
  SmartInteractionEngine,
  MomentsEventSystem
};
