/**
 * AI群红包自动领取处理器
 * 让AI基于角色设定、上下文和记忆自主决定是否领取红包
 */

import { Message, ApiConfig, CharacterSettings, Conversation } from '../types';
import { claimRedPacket } from './groupRedPacket';
import { aiDecideClaimRedPacket } from './aiGroupRedPacketDecision';

/**
 * 检测消息中是否包含群红包
 */
export function detectGroupRedPacket(message: Message): boolean {
  return !!(
    message.moneyTransfer?.type === 'groupRedPacket' && 
    message.moneyTransfer.groupRedPacket &&
    message.moneyTransfer.groupRedPacket.status === 'active' &&
    message.moneyTransfer.groupRedPacket.remainingCount > 0
  );
}

/**
 * AI决定是否领取红包（使用AI智能决策）
 */
export async function shouldAIClaimRedPacket(
  aiSettings: CharacterSettings,
  message: Message,
  recentMessages: Message[],
  groupName: string,
  apiConfig: ApiConfig
): Promise<boolean> {
  const redPacket = message.moneyTransfer?.groupRedPacket;
  if (!redPacket) return false;

  // 已经领取过的不再领取
  const alreadyClaimed = redPacket.claimedBy.some(
    claim => claim.userId === aiSettings.userId
  );
  if (alreadyClaimed) {
    return false;
  }

  // 专属红包：只有指定的AI才能领取
  if (redPacket.redPacketType === 'exclusive') {
    if (redPacket.exclusiveUserId !== aiSettings.userId) {
      return false;
    }
  }

  // 口令红包：AI无法猜测口令，跳过
  if (redPacket.password) {
    return false;
  }

  // 使用AI智能决策
  try {
    const decision = await aiDecideClaimRedPacket(
      aiSettings,
      redPacket,
      recentMessages,
      groupName,
      redPacket.senderName,
      apiConfig
    );
    return decision;
  } catch (error) {
    console.error('AI红包决策失败:', error);
    return false;
  }
}

/**
 * AI领取群红包
 * 返回是否成功和领取金额
 */
export async function aiClaimGroupRedPacket(
  message: Message,
  aiId: string,
  aiName: string,
  onUpdate: (updatedMessage: Message) => void,
  onBalanceChange?: (amount: number) => void
): Promise<{ success: boolean; amount?: number; message: string }> {
  const redPacket = message.moneyTransfer?.groupRedPacket;
  if (!redPacket) {
    return { success: false, message: '红包不存在' };
  }

  // 模拟思考时间（1-3秒）
  const thinkingTime = 1000 + Math.random() * 2000;
  await new Promise(resolve => setTimeout(resolve, thinkingTime));

  // 尝试领取
  const result = claimRedPacket(redPacket, aiId, aiName);
  
  if (result.success && result.amount && message.moneyTransfer) {
    // 更新消息中的红包数据
    const updatedMessage: Message = {
      ...message,
      moneyTransfer: {
        ...message.moneyTransfer,
        type: 'groupRedPacket',
        groupRedPacket: redPacket
      }
    };
    
    onUpdate(updatedMessage);
    
    // 通知余额变化（如果提供了回调）
    if (onBalanceChange) {
      onBalanceChange(result.amount);
    }
    
    console.log(`🎁 ${aiName} 领取了 ¥${result.amount.toFixed(2)} 的群红包`);
  }

  return result;
}

/**
 * 批量处理AI领取红包
 * 为所有AI成员自动领取红包
 */
export async function handleAIGroupRedPacketClaiming(
  message: Message,
  aiMembers: Array<{ id: string; name: string; characterSettings?: any }>,
  onUpdate: (updatedMessage: Message) => void,
  onAIClaimMessage?: (aiId: string, aiName: string, amount: number) => void
): Promise<void> {
  // 检测是否是群红包
  if (!detectGroupRedPacket(message)) {
    return;
  }

  console.log('🎁 检测到群红包，AI开始领取...');

  // 随机打乱AI顺序（模拟真实抢红包场景）
  const shuffledAIs = [...aiMembers].sort(() => Math.random() - 0.5);

  // 依次让每个AI尝试领取
  for (const aiMember of shuffledAIs) {
    const aiId = aiMember.id;
    const aiName = aiMember.characterSettings?.nickname || aiMember.name;
    const aiPersonality = aiMember.characterSettings?.personality;

    // 检查红包是否还有剩余
    const redPacket = message.moneyTransfer?.groupRedPacket;
    if (!redPacket || redPacket.remainingCount === 0) {
      console.log('🎁 红包已被领完');
      break;
    }

    // AI决定是否领取
    const shouldClaim = shouldAIClaimRedPacket(aiId, aiName, message, aiPersonality);
    
    if (!shouldClaim) {
      console.log(`👤 ${aiName} 选择不领取红包`);
      continue;
    }

    // 领取红包
    const result = await aiClaimGroupRedPacket(
      message,
      aiId,
      aiName,
      onUpdate
    );

    if (result.success && result.amount) {
      // 通知外部AI领取了红包
      if (onAIClaimMessage) {
        onAIClaimMessage(aiId, aiName, result.amount);
      }

      // 添加一些随机延迟，让领取更自然
      const delay = 500 + Math.random() * 1500;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.log('🎁 AI群红包领取处理完成');
}
