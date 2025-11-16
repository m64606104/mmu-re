/**
 * 订单配送模拟器
 * 模拟真实的外卖配送流程，根据时间动态更新配送状态
 */

export interface DeliveryStatus {
  stage: 'preparing' | 'picking' | 'delivering' | 'arrived' | 'delivered';
  stageText: string;
  progress: number; // 0-100
  estimatedMinutes: number; // 剩余预计时间（分钟）
  riderDistance?: string; // 骑手距离
  statusEmoji: string;
}

/**
 * 配送阶段时间配置（分钟）
 */
const DELIVERY_STAGES = {
  preparing: { duration: 8, text: '商家准备中', emoji: '👨‍🍳' },
  picking: { duration: 3, text: '骑手已接单', emoji: '🛵' },
  delivering: { duration: 12, text: '配送中', emoji: '🚀' },
  arrived: { duration: 2, text: '骑手已到达', emoji: '🏠' },
  delivered: { duration: 0, text: '已送达', emoji: '✅' }
};

// 总配送时间（分钟）
const TOTAL_DELIVERY_TIME = 
  DELIVERY_STAGES.preparing.duration +
  DELIVERY_STAGES.picking.duration +
  DELIVERY_STAGES.delivering.duration +
  DELIVERY_STAGES.arrived.duration;

/**
 * 根据订单创建时间计算当前配送状态
 */
export function calculateDeliveryStatus(orderCreatedAt: number): DeliveryStatus {
  const now = Date.now();
  const elapsedMinutes = (now - orderCreatedAt) / 1000 / 60; // 经过的分钟数
  
  // 如果超过总配送时间，标记为已送达
  if (elapsedMinutes >= TOTAL_DELIVERY_TIME) {
    return {
      stage: 'delivered',
      stageText: DELIVERY_STAGES.delivered.text,
      progress: 100,
      estimatedMinutes: 0,
      statusEmoji: DELIVERY_STAGES.delivered.emoji
    };
  }
  
  // 计算当前阶段
  let accumulatedTime = 0;
  
  // 准备中阶段
  if (elapsedMinutes < DELIVERY_STAGES.preparing.duration) {
    const stageProgress = (elapsedMinutes / DELIVERY_STAGES.preparing.duration) * 100;
    const remainingTotal = TOTAL_DELIVERY_TIME - elapsedMinutes;
    return {
      stage: 'preparing',
      stageText: DELIVERY_STAGES.preparing.text,
      progress: Math.floor(stageProgress * 0.2), // 准备阶段占20%进度
      estimatedMinutes: Math.ceil(remainingTotal),
      statusEmoji: DELIVERY_STAGES.preparing.emoji
    };
  }
  accumulatedTime += DELIVERY_STAGES.preparing.duration;
  
  // 已接单阶段
  if (elapsedMinutes < accumulatedTime + DELIVERY_STAGES.picking.duration) {
    const stageElapsed = elapsedMinutes - accumulatedTime;
    const stageProgress = (stageElapsed / DELIVERY_STAGES.picking.duration) * 100;
    const remainingTotal = TOTAL_DELIVERY_TIME - elapsedMinutes;
    return {
      stage: 'picking',
      stageText: DELIVERY_STAGES.picking.text,
      progress: 20 + Math.floor(stageProgress * 0.15), // 20-35%
      estimatedMinutes: Math.ceil(remainingTotal),
      statusEmoji: DELIVERY_STAGES.picking.emoji,
      riderDistance: '1.4km'
    };
  }
  accumulatedTime += DELIVERY_STAGES.picking.duration;
  
  // 配送中阶段
  if (elapsedMinutes < accumulatedTime + DELIVERY_STAGES.delivering.duration) {
    const stageElapsed = elapsedMinutes - accumulatedTime;
    const stageProgress = (stageElapsed / DELIVERY_STAGES.delivering.duration) * 100;
    const remainingTotal = TOTAL_DELIVERY_TIME - elapsedMinutes;
    
    // 计算骑手距离（从1.4km逐渐减少到0.1km）
    const remainingDistance = 1.4 - (stageProgress / 100) * 1.3;
    
    return {
      stage: 'delivering',
      stageText: DELIVERY_STAGES.delivering.text,
      progress: 35 + Math.floor(stageProgress * 0.55), // 35-90%
      estimatedMinutes: Math.ceil(remainingTotal),
      statusEmoji: DELIVERY_STAGES.delivering.emoji,
      riderDistance: `${remainingDistance.toFixed(1)}km`
    };
  }
  accumulatedTime += DELIVERY_STAGES.delivering.duration;
  
  // 已到达阶段
  if (elapsedMinutes < accumulatedTime + DELIVERY_STAGES.arrived.duration) {
    const stageElapsed = elapsedMinutes - accumulatedTime;
    const stageProgress = (stageElapsed / DELIVERY_STAGES.arrived.duration) * 100;
    const remainingTotal = TOTAL_DELIVERY_TIME - elapsedMinutes;
    return {
      stage: 'arrived',
      stageText: DELIVERY_STAGES.arrived.text,
      progress: 90 + Math.floor(stageProgress * 0.10), // 90-100%
      estimatedMinutes: Math.ceil(remainingTotal),
      statusEmoji: DELIVERY_STAGES.arrived.emoji,
      riderDistance: '已到达楼下'
    };
  }
  
  // 默认返回已送达
  return {
    stage: 'delivered',
    stageText: DELIVERY_STAGES.delivered.text,
    progress: 100,
    estimatedMinutes: 0,
    statusEmoji: DELIVERY_STAGES.delivered.emoji
  };
}

/**
 * 获取配送进度的文字描述
 */
export function getDeliveryProgressText(status: DeliveryStatus): string[] {
  const texts = ['已接单', '已取餐', '配送中', '送达'];
  const currentIndex = Math.floor(status.progress / 25);
  
  return texts.map((text, index) => {
    if (index < currentIndex) return text;
    if (index === currentIndex) return text;
    return text;
  });
}

/**
 * 获取配送进度的高亮索引
 */
export function getActiveStageIndex(status: DeliveryStatus): number {
  if (status.progress < 20) return 0; // 已接单
  if (status.progress < 35) return 1; // 已取餐
  if (status.progress < 90) return 2; // 配送中
  return 3; // 送达
}

/**
 * 格式化预计送达时间文本
 */
export function formatEstimatedTime(minutes: number): string {
  if (minutes === 0) return '已送达';
  if (minutes <= 5) return `约 ${minutes} 分钟后送达`;
  if (minutes <= 15) return `预计 ${Math.ceil(minutes / 5) * 5} 分钟后送达`;
  return `预计 ${Math.ceil(minutes / 5) * 5} 分钟后送达`;
}

/**
 * 获取骑手信息
 */
export function getRiderInfo(): {
  name: string;
  rating: string;
  phone: string;
} {
  // 返回随机骑手信息
  const riderNames = ['李师傅', '王师傅', '张师傅', '刘师傅'];
  const randomRider = riderNames[Math.floor(Math.random() * riderNames.length)];
  
  return {
    name: randomRider,
    rating: (4.8 + Math.random() * 0.2).toFixed(1),
    phone: '138****' + Math.floor(1000 + Math.random() * 9000)
  };
}
