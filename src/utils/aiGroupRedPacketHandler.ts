/**
 * AI群红包自动领取处理器
 * 让AI能够智能地领取群红包
 */

import { Message } from '../types';
import { claimRedPacket } from './groupRedPacket';

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
 * AI决定是否领取红包
 * 基于AI性格和红包类型
 */
export function shouldAIClaimRedPacket(
  aiId: string,
  aiName: string,
  message: Message,
  aiPersonality?: string
): boolean {
  const redPacket = message.moneyTransfer?.groupRedPacket;
  if (!redPacket) return false;

  // 专属红包：只有指定的AI才能领取
  if (redPacket.redPacketType === 'exclusive') {
    return redPacket.exclusiveUserId === aiId;
  }

  // 口令红包：AI无法猜测口令，跳过
  if (redPacket.password) {
    return false;
  }

  // 已经领取过的不再领取
  const alreadyClaimed = redPacket.claimedBy.some(claim => claim.userId === aiId);
  if (alreadyClaimed) {
    return false;
  }

  // 基于AI性格决定领取概率
  let claimProbability = 0.7; // 默认70%概率领取

  if (aiPersonality) {
    const lowerPersonality = aiPersonality.toLowerCase();
    
    // 活跃、外向的AI更倾向于抢红包
    if (lowerPersonality.includes('活泼') || lowerPersonality.includes('外向') || 
        lowerPersonality.includes('热情') || lowerPersonality.includes('开朗')) {
      claimProbability = 0.9;
    }
    
    // 内向、冷静的AI不太积极抢红包
    if (lowerPersonality.includes('内向') || lowerPersonality.includes('冷静') || 
        lowerPersonality.includes('沉稳') || lowerPersonality.includes('安静')) {
      claimProbability = 0.4;
    }
    
    // 高冷、傲娇的AI更少抢红包
    if (lowerPersonality.includes('高冷') || lowerPersonality.includes('傲娇') || 
        lowerPersonality.includes('清高')) {
      claimProbability = 0.2;
    }
  }

  // 拼手气红包：所有AI都更积极
  if (redPacket.redPacketType === 'random') {
    claimProbability = Math.min(claimProbability * 1.3, 0.95);
  }

  return Math.random() < claimProbability;
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
