/**
 * AI群红包智能决策系统
 * 让AI基于角色设定、上下文、记忆和关系自主决定是否领取红包
 */

import { Message, ApiConfig, Conversation, GroupRedPacketInfo } from '../types';
import { getGroupMemories } from './memorySystem';
import { resolveGroupParticipantApiConfig } from './chatApiConfig';
import { buildApiUrl } from './apiHelper';

/**
 * 构建AI红包决策提示词
 */
function buildRedPacketDecisionPrompt(
  aiConversation: Conversation,
  redPacket: GroupRedPacketInfo,
  recentMessages: Message[],
  groupName: string,
  senderName: string,
  groupMemories: string[]
): string {
  const aiName = aiConversation.characterSettings?.nickname || aiConversation.name;
  const personality = aiConversation.characterSettings?.personality || '无特殊性格';
  
  // 获取最近的聊天内容（最近10条）
  const chatContext = recentMessages
    .slice(-10)
    .map(m => {
      const msgWithSender = m as any;
      const speaker = msgWithSender.senderName || (m.role === 'user' ? '用户' : 'AI');
      return `${speaker}: ${m.content || '[媒体消息]'}`;
    })
    .join('\n');

  // 群聊记忆摘要
  const memoryContext = groupMemories.length > 0
    ? `\n【你在这个群的记忆】:\n${groupMemories.slice(0, 5).join('\n')}`
    : '';

  const redPacketTypeDesc: Record<string, string> = {
    'average': '普通红包（平均分配）',
    'random': '拼手气红包（随机金额）',
    'exclusive': '专属红包',
    'password': '口令红包（需要发送口令）'
  };

  // 口令红包特殊说明
  const passwordHint = redPacket.password 
    ? `\n⚠️ 这是口令红包，需要发送口令："${redPacket.password}" 才能领取\n你需要考虑：这个口令适合你说吗？说出来会不会尴尬或不符合你的性格？`
    : '';

  return `你是${aiName}。

【你的性格】:
${personality}

【当前情况】:
- 这是群聊"${groupName}"
- ${senderName}发了一个群红包
- 红包类型: ${redPacketTypeDesc[redPacket.redPacketType] || redPacket.redPacketType}
- 总金额: ¥${redPacket.totalAmount}
- 总数量: ${redPacket.totalCount}个
- 留言: ${redPacket.message || '无'}
- 剩余: ${redPacket.remainingCount}/${redPacket.totalCount}个${passwordHint}
${memoryContext}

【最近群聊内容】:
${chatContext}

【红包情况】:
- 当前红包发送者: ${senderName}
- 注意: 请仔细看聊天记录，如果${senderName}刚刚已经发过红包，就不要再催促发红包了

【决策要求】:
请根据以下因素，用你的真实性格和判断来决定是否领取这个红包：

1. **你的性格特点**:
   - 如果你是活泼/外向的性格，可能更倾向于积极参与
   - 如果你是内向/高冷的性格，可能不太积极或者会礼貌推辞
   - 如果你是礼貌/客气的性格，可能会考虑是否合适领取

2. **与发送者的关系**:
   - 是熟悉的群友吗？
   - 平时关系如何？
   - 根据记忆和聊天判断

3. **红包场景**:
   - 留言内容暗示什么场景？（庆祝、活跃气氛、感谢等）
   - 红包金额和数量是否合理？
   - 当前群聊氛围如何？

4. **你的判断**:
   - 这个红包适合领取吗？
   - 符合你的性格吗？
   - 符合当前场景吗？

${redPacket.password ? `5. **口令红包特别考虑**:
   - 口令内容是："${redPacket.password}"
   - 你愿意在群里说出这个口令吗？
   - 这个口令对你来说尴尬吗？不合适吗？
   - 示例：如果口令是"小a是小狗"，而你就是小a，你可能会觉得不想说这个
   - 但如果你性格大大咧咧/不在乎，也可以选择领取
   - 如果口令内容与你无关或者你不介意，可以正常领取
` : ''}
⚠️ 重要规则：
- 只回复"领取"或"不领取"，不要有任何其他内容
- 不要解释原因
- 根据你的真实性格做出自然的决定

请回复：`;
}

/**
 * AI决定是否领取群红包
 */
export async function aiDecideToClaimRedPacket(
  aiConversation: Conversation,
  redPacket: GroupRedPacketInfo,
  recentMessages: Message[],
  groupConversation: Conversation,
  apiConfig: ApiConfig
): Promise<boolean> {
  try {
    // 专属红包：检查是否指定给这个AI
    if (redPacket.redPacketType === 'exclusive') {
      if (redPacket.exclusiveUserId !== aiConversation.id) {
        return false; // 不是指定给这个AI的
      }
      // 是专属红包且是给这个AI的，直接领取
      return true;
    }

    // 已经领取过的不再领取
    const alreadyClaimed = redPacket.claimedBy.some(
      claim => claim.userId === aiConversation.id
    );
    if (alreadyClaimed) {
      return false;
    }

    // 获取群聊记忆
    const groupMemories = getGroupMemories(aiConversation.id, groupConversation.id);
    const memoryTexts = groupMemories.map(m => `- ${m.content}`);

    // 构建决策提示词
    const prompt = buildRedPacketDecisionPrompt(
      aiConversation,
      redPacket,
      recentMessages,
      groupConversation.name,
      redPacket.senderName,
      memoryTexts
    );

    const chatCfg = resolveGroupParticipantApiConfig(apiConfig, groupConversation, aiConversation);

    // 调用AI API获取决策
    const response = await fetch(buildApiUrl(chatCfg), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${chatCfg.apiKey}`
      },
      body: JSON.stringify({
        model: chatCfg.modelName,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8, // 保持一定随机性
        max_tokens: 10
      })
    });

    if (!response.ok) {
      console.error(`AI红包决策API失败 (${aiConversation.name}):`, response.status);
      // 失败时随机决定（50%概率）
      return Math.random() > 0.5;
    }

    const data = await response.json();
    const decision = data.choices?.[0]?.message?.content?.trim() || '';
    
    console.log(`🤖 ${aiConversation.name} 的红包决定: "${decision}"`);
    
    // 判断决策结果
    const shouldClaim = decision.includes('领取') && !decision.includes('不领取');
    return shouldClaim;
    
  } catch (error) {
    console.error(`AI红包决策失败 (${aiConversation.name}):`, error);
    // 出错时随机决定
    return Math.random() > 0.5;
  }
}

/**
 * 批量处理AI领取红包决策
 * 让所有AI成员依次决定是否领取
 */
export async function handleAIGroupRedPacketClaiming(
  redPacketMessage: Message,
  aiMembers: Conversation[],
  groupConversation: Conversation,
  recentMessages: Message[],
  apiConfig: ApiConfig,
  onAIClaim: (aiId: string, aiName: string, amount: number) => void
): Promise<void> {
  const redPacket = redPacketMessage.moneyTransfer?.groupRedPacket;
  if (!redPacket) {
    console.error('红包信息不存在');
    return;
  }

  console.log(`🎁 开始处理群红包领取，AI成员数: ${aiMembers.length}`);
  console.log(`🎁 红包剩余: ${redPacket.remainingCount}/${redPacket.totalCount}个`);

  // 如果红包数量小于AI成员数，随机选择一部分AI参与
  let participatingAIs = [...aiMembers];
  if (redPacket.remainingCount < aiMembers.length) {
    console.log(`⚠️ 红包数量(${redPacket.remainingCount})少于AI成员数(${aiMembers.length})，随机选择AI参与`);
    // 随机打乱并选择前N个AI（N为红包数量）
    participatingAIs = [...aiMembers]
      .sort(() => Math.random() - 0.5)
      .slice(0, redPacket.remainingCount);
    console.log(`✅ 选中参与的AI: ${participatingAIs.map(ai => ai.name).join('、')}`);
  } else {
    // 如果红包足够，所有AI都可以参与，随机打乱顺序
    participatingAIs = [...aiMembers].sort(() => Math.random() - 0.5);
  }

  for (const aiMember of participatingAIs) {
    // 检查红包是否还有剩余
    if (redPacket.remainingCount === 0) {
      console.log('🎁 红包已被领完');
      break;
    }

    // 模拟思考时间（1-3秒）
    const thinkingTime = 1000 + Math.random() * 2000;
    await new Promise(resolve => setTimeout(resolve, thinkingTime));

    // AI决定是否领取
    const shouldClaim = await aiDecideToClaimRedPacket(
      aiMember,
      redPacket,
      recentMessages,
      groupConversation,
      apiConfig
    );

    if (!shouldClaim) {
      console.log(`👤 ${aiMember.name} 选择不领取红包`);
      continue;
    }

    // 领取红包
    const { claimRedPacket } = await import('./groupRedPacket');
    const result = claimRedPacket(
      redPacket,
      aiMember.id,
      aiMember.characterSettings?.nickname || aiMember.name
    );

    if (result.success && result.amount) {
      console.log(`🎁 ${aiMember.name} 领取了 ¥${result.amount.toFixed(2)}`);
      
      // 通知外部
      onAIClaim(
        aiMember.id,
        aiMember.characterSettings?.nickname || aiMember.name,
        result.amount
      );

      // 添加随机延迟，让领取更自然
      const delay = 500 + Math.random() * 1500;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.log('🎁 AI群红包领取处理完成');
}
