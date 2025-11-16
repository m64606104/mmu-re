/**
 * AI群红包领取决策系统
 * 让AI基于角色设定、上下文和记忆自主决定是否领取红包
 */

import { Message, ApiConfig, CharacterSettings, GroupRedPacketInfo } from '../types';

/**
 * 构建AI红包决策提示词
 */
function buildRedPacketDecisionPrompt(
  aiSettings: CharacterSettings,
  redPacket: GroupRedPacketInfo,
  recentMessages: Message[],
  groupName: string,
  senderName: string
): string {
  // 获取最近的聊天内容
  const chatContext = recentMessages
    .slice(-10)
    .map(m => {
      const msgWithSender = m as any;
      const role = msgWithSender.senderId ? `${msgWithSender.senderName || '某人'}` : '用户';
      return `${role}: ${m.content || '[媒体消息]'}`;
    })
    .join('\n');

  return `你是${aiSettings.nickname}。

【当前情况】：
- 这是群聊"${groupName}"
- ${senderName}发了一个群红包
- 红包类型: ${getRedPacketTypeDesc(redPacket.redPacketType)}
- 总金额: ¥${redPacket.totalAmount}
- 总数量: ${redPacket.totalCount}个
- 留言: ${redPacket.message || '无'}
- 剩余: ${redPacket.remainingCount}/${redPacket.totalCount}个

【最近聊天内容】：
${chatContext}

【你的性格设定】：
${aiSettings.personality || '无特殊性格'}

【决策要求】：
请基于以下因素决定是否领取这个红包：
1. **你的性格**：符合你的性格特点吗？
   - 活泼/外向的角色更倾向于抢红包
   - 高冷/矜持的角色可能不太积极
   - 礼貌/客气的角色可能会推辞

2. **与发送者的关系**：
   - 是熟悉的群友吗？
   - 关系亲密度如何？

3. **红包的场景**：
   - 是节日庆祝？
   - 是活跃气氛？
   - 留言内容是什么意思？

4. **金额和数量**：
   - 金额是否合适？
   - 是否还有剩余？

【回复格式】：
如果决定领取，直接回复：
领取

如果决定不领取，直接回复：
不领取

⚠️ 注意：
- 只回复"领取"或"不领取"，不要有其他内容
- 根据你的真实性格和判断来决定
- 不要解释原因，只需给出决定`;
}

/**
 * 获取红包类型描述
 */
function getRedPacketTypeDesc(type: string): string {
  const typeMap: Record<string, string> = {
    'average': '普通红包(平均分配)',
    'random': '拼手气红包(随机金额)',
    'exclusive': '专属红包'
  };
  return typeMap[type] || type;
}

/**
 * 让AI决定是否领取红包
 */
export async function aiDecideClaimRedPacket(
  aiSettings: CharacterSettings,
  redPacket: GroupRedPacketInfo,
  recentMessages: Message[],
  groupName: string,
  senderName: string,
  apiConfig: ApiConfig
): Promise<boolean> {
  try {
    // 专属红包：只有指定的AI才能领取
    if (redPacket.redPacketType === 'exclusive' && redPacket.exclusiveUserId) {
      // 这个检查应该在外部进行，这里假设已经是指定的AI
      return true;
    }

    // 口令红包：AI无法猜测口令，跳过
    if (redPacket.password) {
      return false;
    }

    // 构建决策提示词
    const prompt = buildRedPacketDecisionPrompt(
      aiSettings,
      redPacket,
      recentMessages,
      groupName,
      senderName
    );

    // 调用AI API获取决策
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
            content: prompt
          },
          {
            role: 'user',
            content: '请决定是否领取这个红包'
          }
        ],
        temperature: 0.8,
        max_tokens: 10
      })
    });

    if (!response.ok) {
      console.error('AI决策API调用失败');
      // 默认不领取
      return false;
    }

    const data = await response.json();
    const decision = data.choices?.[0]?.message?.content?.trim() || '';
    
    console.log(`🤖 ${aiSettings.nickname} 的决定: ${decision}`);
    
    // 判断决策结果
    return decision.includes('领取') && !decision.includes('不领取');
    
  } catch (error) {
    console.error('AI红包决策失败:', error);
    // 出错时默认不领取
    return false;
  }
}
