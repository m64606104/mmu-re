import { GroupRedPacketInfo } from '../types';

/**
 * 群红包工具函数
 */

/**
 * 创建群红包
 */
export function createGroupRedPacket(
  senderId: string,
  senderName: string,
  totalAmount: number,
  totalCount: number,
  redPacketType: 'average' | 'random' | 'exclusive',
  options?: {
    message?: string;
    password?: string;
    exclusiveUserId?: string;
    exclusiveUserName?: string;
  }
): GroupRedPacketInfo {
  const id = `group_red_packet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = Date.now();
  
  return {
    id,
    senderId,
    senderName,
    message: options?.message,
    totalAmount,
    totalCount,
    remainingCount: totalCount,
    remainingAmount: totalAmount,
    redPacketType,
    password: options?.password,
    exclusiveUserId: options?.exclusiveUserId,
    exclusiveUserName: options?.exclusiveUserName,
    claimedBy: [],
    createdAt: now,
    expiredAt: now + 24 * 60 * 60 * 1000, // 24小时后过期
    status: 'active',
  };
}

/**
 * 领取红包
 */
export function claimRedPacket(
  redPacket: GroupRedPacketInfo,
  userId: string,
  userName: string
): { success: boolean; amount?: number; message: string } {
  // 检查红包状态
  if (redPacket.status === 'expired') {
    return { success: false, message: '红包已过期' };
  }
  
  if (redPacket.status === 'finished') {
    return { success: false, message: '红包已被抢完' };
  }
  
  if (redPacket.remainingCount === 0) {
    redPacket.status = 'finished';
    return { success: false, message: '来晚了，红包已被抢完' };
  }
  
  // 检查是否已领取
  const alreadyClaimed = redPacket.claimedBy.find(c => c.userId === userId);
  if (alreadyClaimed) {
    return { success: false, message: '您已领取过该红包' };
  }
  
  // 检查专属红包
  if (redPacket.redPacketType === 'exclusive' && redPacket.exclusiveUserId !== userId) {
    return { success: false, message: `这是发给${redPacket.exclusiveUserName}的专属红包` };
  }
  
  // 计算领取金额
  let amount: number;
  
  if (redPacket.redPacketType === 'average') {
    // 普通红包：平均分配
    amount = Math.floor((redPacket.remainingAmount / redPacket.remainingCount) * 100) / 100;
  } else {
    // 拼手气红包：随机金额
    if (redPacket.remainingCount === 1) {
      // 最后一个红包，给所有剩余金额
      amount = redPacket.remainingAmount;
    } else {
      // 随机金额算法（保证每个红包至少0.01元）
      const minAmount = 0.01;
      const maxAmount = (redPacket.remainingAmount - minAmount * (redPacket.remainingCount - 1)) * 2 / redPacket.remainingCount;
      amount = Math.floor((Math.random() * maxAmount + minAmount) * 100) / 100;
    }
  }
  
  // 更新红包状态
  redPacket.claimedBy.push({
    userId,
    userName,
    amount,
    timestamp: Date.now(),
  });
  
  redPacket.remainingCount--;
  redPacket.remainingAmount = Math.floor((redPacket.remainingAmount - amount) * 100) / 100;
  
  // 如果全部领完，更新状态
  if (redPacket.remainingCount === 0) {
    redPacket.status = 'finished';
    
    // 标记手气最佳（拼手气红包）
    if (redPacket.redPacketType === 'random') {
      const luckiest = redPacket.claimedBy.reduce((prev, current) => 
        current.amount > prev.amount ? current : prev
      );
      luckiest.isLuckiest = true;
    }
  }
  
  return {
    success: true,
    amount,
    message: '领取成功',
  };
}

/**
 * 检查红包是否过期
 */
export function checkRedPacketExpired(redPacket: GroupRedPacketInfo): boolean {
  if (Date.now() > redPacket.expiredAt && redPacket.status === 'active') {
    redPacket.status = 'expired';
    return true;
  }
  return redPacket.status === 'expired';
}

/**
 * 获取红包领取详情
 */
export function getRedPacketDetails(redPacket: GroupRedPacketInfo): {
  totalAmount: number;
  totalCount: number;
  claimedCount: number;
  claimedAmount: number;
  remainingCount: number;
  remainingAmount: number;
  claimedList: Array<{
    userName: string;
    amount: number;
    timestamp: number;
    isLuckiest?: boolean;
  }>;
} {
  return {
    totalAmount: redPacket.totalAmount,
    totalCount: redPacket.totalCount,
    claimedCount: redPacket.claimedBy.length,
    claimedAmount: Math.floor((redPacket.totalAmount - redPacket.remainingAmount) * 100) / 100,
    remainingCount: redPacket.remainingCount,
    remainingAmount: redPacket.remainingAmount,
    claimedList: redPacket.claimedBy.map(c => ({
      userName: c.userName,
      amount: c.amount,
      timestamp: c.timestamp,
      isLuckiest: c.isLuckiest,
    })),
  };
}

/**
 * 验证口令
 */
export function validatePassword(redPacket: GroupRedPacketInfo, password: string): boolean {
  if (!redPacket.password) {
    return true; // 非口令红包
  }
  return redPacket.password === password;
}

/**
 * 处理过期红包退款
 * 将未领取的金额退回给发送者
 */
export function processExpiredRedPacketRefund(
  redPacket: GroupRedPacketInfo,
  onRefund?: (senderId: string, senderName: string, refundAmount: number) => void
): { refunded: boolean; amount: number } {
  // 检查是否过期
  if (!checkRedPacketExpired(redPacket)) {
    return { refunded: false, amount: 0 };
  }
  
  // 检查是否还有剩余金额
  if (redPacket.remainingAmount <= 0) {
    return { refunded: false, amount: 0 };
  }
  
  // 退款金额
  const refundAmount = redPacket.remainingAmount;
  
  // 标记为已退款
  redPacket.remainingAmount = 0;
  redPacket.remainingCount = 0;
  
  // 回调通知
  if (onRefund) {
    onRefund(redPacket.senderId, redPacket.senderName, refundAmount);
  }
  
  console.log(`🔙 红包过期退款: ${redPacket.senderName} 收到退款 ¥${refundAmount.toFixed(2)}`);
  
  return { refunded: true, amount: refundAmount };
}
