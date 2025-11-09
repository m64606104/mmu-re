/**
 * 关系分析工具
 * 使用AI分析关系描述，给出好感度建议
 */

import { ApiConfig } from '../types';

/**
 * 分析关系描述，返回建议的好感度数值（0-100）
 */
export async function analyzeRelationshipAffection(
  description: string,
  apiConfig: ApiConfig
): Promise<number> {
  if (!description.trim()) {
    return 50; // 默认值
  }

  try {
    const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [
          {
            role: 'system',
            content: `你是一个关系分析专家。根据用户提供的关系描述，分析并给出0-100的好感度数值。

评分标准：
- 90-100：至亲至爱（家人、恋人、最好的朋友、生死之交）
- 70-89：亲密好友（经常联系、互相信任、无话不谈）
- 50-69：普通朋友（偶尔联系、关系不错、有共同话题）
- 30-49：点头之交（认识但不熟、同事、同学关系）
- 10-29：关系冷淡（有过节、不常往来、竞争对手）
- 0-9：敌对关系（仇人、敌人、互相厌恶）

只返回数字，不要任何解释。`
          },
          {
            role: 'user',
            content: `关系描述：${description}\n\n请给出好感度数值（0-100）：`
          }
        ],
        temperature: 0.3,
        max_tokens: 10
      })
    });

    if (!response.ok) {
      throw new Error('API请求失败');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('未获取到有效响应');
    }

    // 提取数字
    const match = content.match(/\d+/);
    if (!match) {
      throw new Error('响应格式错误');
    }

    const affection = parseInt(match[0], 10);
    
    // 确保数值在合理范围内
    return Math.max(0, Math.min(100, affection));

  } catch (error) {
    console.error('分析关系好感度失败:', error);
    // 降级策略：根据关键词简单判断
    return analyzeFallback(description);
  }
}

/**
 * 降级分析策略（不依赖API）
 * 根据关键词简单判断好感度
 */
function analyzeFallback(description: string): number {
  const lowerDesc = description.toLowerCase();
  
  // 高好感度关键词
  const highAffectionKeywords = [
    '家人', '恋人', '爱人', '挚爱', '最好的朋友', '闺蜜',
    '兄弟', '生死之交', '知己', '最亲密', '最信任',
    '至亲', '深爱', '挚友', '亲人'
  ];
  
  // 中高好感度关键词
  const mediumHighKeywords = [
    '好朋友', '朋友', '信任', '亲密', '无话不谈',
    '经常联系', '很熟', '关系很好', '互相帮助'
  ];
  
  // 中等好感度关键词
  const mediumKeywords = [
    '同学', '同事', '认识', '熟悉', '朋友圈',
    '偶尔联系', '关系不错', '普通朋友'
  ];
  
  // 低好感度关键词
  const lowKeywords = [
    '不熟', '点头之交', '不常联系', '普通关系',
    '竞争', '对手', '有过节'
  ];
  
  // 敌对关键词
  const hostileKeywords = [
    '敌人', '仇人', '厌恶', '讨厌', '憎恨',
    '恨', '敌对', '仇视', '不共戴天'
  ];
  
  // 检查关键词
  if (hostileKeywords.some(kw => lowerDesc.includes(kw))) {
    return 5;
  }
  if (lowKeywords.some(kw => lowerDesc.includes(kw))) {
    return 25;
  }
  if (mediumKeywords.some(kw => lowerDesc.includes(kw))) {
    return 55;
  }
  if (mediumHighKeywords.some(kw => lowerDesc.includes(kw))) {
    return 75;
  }
  if (highAffectionKeywords.some(kw => lowerDesc.includes(kw))) {
    return 90;
  }
  
  // 默认值
  return 50;
}

/**
 * 批量分析多个关系
 */
export async function analyzeBatchRelationships(
  descriptions: string[],
  apiConfig: ApiConfig
): Promise<number[]> {
  const results = await Promise.all(
    descriptions.map(desc => analyzeRelationshipAffection(desc, apiConfig))
  );
  return results;
}
