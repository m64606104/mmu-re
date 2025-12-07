import { EasyChatConversation, ApiConfig } from '../types';
import { collectLearningSamples, formatSamplesForPrompt, getSamplesStats } from './forumLearningSamples';

/**
 * 生成论坛帖子的配置
 */
export interface ForumGenerationConfig {
  roleId: string; // 角色ID
  roleName: string; // 角色名称
  personality?: string; // 性格描述
  languageStyle?: string; // 语言风格
  conversations: EasyChatConversation[]; // 所有对话记录
  apiConfig: ApiConfig; // API配置
}

/**
 * 生成结果
 */
export interface ForumGenerationResult {
  success: boolean;
  content?: string; // 生成的帖子内容
  error?: string; // 错误信息
  stats?: {
    samplesUsed: number;
    avgLength: number;
  };
}

/**
 * 构造生成论坛帖子的Prompt
 */
function buildForumPrompt(
  roleName: string,
  personality: string,
  languageStyle: string,
  learningSamples: string,
  samplesCount: number
): string {
  const currentDate = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  return `你是 ${roleName}，现在需要在论坛上发一条帖子。

【角色信息】
性格：${personality || '未设定'}
语言风格：${languageStyle || '自然随意'}

【你平时的说话方式】
以下是你在聊天中的 ${samplesCount} 条真实发言记录，请学习这种语气和表达习惯：
${learningSamples}

【任务要求】
1. 根据上面的发言记录，模仿你自己的语气和风格
2. 发布一条论坛帖子，内容可以是：
   - 分享最近的想法、感悟
   - 讨论一个有趣的话题
   - 记录生活中的小事
   - 表达对某事的看法
3. 长度：50-200字之间
4. 风格要自然，像你平时说话一样
5. 今天是：${currentDate}

【重要】
- 只输出帖子正文内容，不要有任何前缀、后缀、标题或解释
- 不要使用"作为xxx"、"我觉得"、"让我们"这类生硬的开头
- 如果发言记录不足，就随意发挥，保持角色性格即可
- 可以适当使用emoji，但不要过多`;
}

/**
 * 调用API生成论坛帖子
 */
export async function generateForumPost(
  config: ForumGenerationConfig
): Promise<ForumGenerationResult> {
  try {
    // 1. 收集学习样本
    const samples = collectLearningSamples(
      config.conversations,
      config.roleId,
      50 // 最多50条样本
    );

    const stats = getSamplesStats(samples);
    console.log(`📚 收集到 ${stats.total} 条学习样本`, stats);

    // 2. 格式化样本
    const formattedSamples = formatSamplesForPrompt(samples, 15); // 最多展示15条

    // 3. 构造Prompt
    const prompt = buildForumPrompt(
      config.roleName,
      config.personality || '随和友善',
      config.languageStyle || '自然轻松',
      formattedSamples,
      Math.min(samples.length, 15)
    );

    console.log('📝 生成Prompt:', prompt.substring(0, 200) + '...');

    // 4. 调用API
    // 智能处理API URL - 如果baseUrl已经包含完整路径则直接使用，否则添加标准路径
    let apiUrl = config.apiConfig.baseUrl;
    if (!apiUrl.includes('/chat/completions')) {
      // 移除末尾的斜杠
      apiUrl = apiUrl.replace(/\/$/, '');
      // 添加标准路径（优先尝试 /v1/chat/completions）
      apiUrl = apiUrl.includes('/v1') ? `${apiUrl}/chat/completions` : `${apiUrl}/v1/chat/completions`;
    }

    console.log('🌐 API URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: config.apiConfig.modelName,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.9, // 提高创造性
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API请求失败: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('API返回内容为空');
    }

    console.log('✅ 生成成功:', content);

    return {
      success: true,
      content,
      stats: {
        samplesUsed: samples.length,
        avgLength: stats.avgLength
      }
    };

  } catch (error) {
    console.error('❌ 生成失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 批量生成多条帖子
 */
export async function generateMultiplePosts(
  config: ForumGenerationConfig,
  count: number = 1
): Promise<ForumGenerationResult[]> {
  const results: ForumGenerationResult[] = [];
  
  for (let i = 0; i < count; i++) {
    const result = await generateForumPost(config);
    results.push(result);
    
    // 如果失败，停止生成
    if (!result.success) break;
    
    // 间隔一下，避免请求太快
    if (i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}
