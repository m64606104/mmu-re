/**
 * 🎓 AI幼儿园配置
 * 
 * 集中管理所有可配置的参数，方便未来扩展
 */

/**
 * 功能限制配置
 */
export const KindergartenLimits = {
  /**
   * 用户可以创建的最大AI数量
   * 
   * 当前版本：3个
   * 未来扩展计划：
   * - 免费版：1个
   * - 基础版：3个
   * - 高级版：5个
   * - 无限版：10个或更多
   */
  MAX_CHILDREN: 3,

  /**
   * 每天最大教学词汇数
   */
  MAX_DAILY_WORDS: 20,

  /**
   * 每天最大教学轮次
   */
  MAX_DAILY_ROUNDS: 20,

  /**
   * 每轮词卡数量
   */
  CARDS_PER_ROUND: 4,
};

/**
 * 成长阶段配置
 */
export const GrowthStages = {
  baby: {
    name: '婴儿期',
    emoji: '👶',
    wordRange: [0, 50],
    description: '刚出生，从"啊啊"开始学习'
  },
  toddler: {
    name: '幼儿期',
    emoji: '🧒',
    wordRange: [50, 200],
    description: '能说简单的话，好奇心旺盛'
  },
  child: {
    name: '儿童期',
    emoji: '👦',
    wordRange: [200, 1000],
    description: '能流利对话，理解复杂概念'
  },
  teen: {
    name: '少年期',
    emoji: '👨',
    wordRange: [1000, Infinity],
    description: '成熟的思考，深度的理解'
  }
};

/**
 * 功能开关（用于A/B测试或逐步发布）
 */
export const FeatureFlags = {
  /**
   * 是否启用多AI功能
   * true: 根据MAX_CHILDREN限制
   * false: 强制只能创建1个
   */
  ENABLE_MULTIPLE_CHILDREN: true,

  /**
   * 是否显示AI切换按钮
   * （当ENABLE_MULTIPLE_CHILDREN为true且已有多个AI时）
   */
  SHOW_SWITCH_BUTTON: true,

  /**
   * 是否显示升级提示
   * （当达到数量限制时，提示用户升级）
   */
  SHOW_UPGRADE_HINT: true,
};

/**
 * 升级提示文案
 */
export const UpgradeMessages = {
  reachedLimit: (current: number) => 
    `当前版本最多可以创建${current}个AI宝宝\n\n未来版本将支持领养更多AI！`,
  
  switchHint: '切换到其他AI宝宝',
  
  upgradeTeaser: '想要领养更多AI宝宝吗？敬请期待未来版本！'
};

/**
 * 获取当前的AI数量限制
 */
export function getMaxChildren(): number {
  if (!FeatureFlags.ENABLE_MULTIPLE_CHILDREN) {
    return 1;
  }
  return KindergartenLimits.MAX_CHILDREN;
}

/**
 * 检查是否可以创建新AI
 */
export function canCreateNewChild(currentCount: number): boolean {
  return currentCount < getMaxChildren();
}

/**
 * 检查是否应该显示切换按钮
 */
export function shouldShowSwitchButton(childrenCount: number): boolean {
  return FeatureFlags.SHOW_SWITCH_BUTTON && 
         FeatureFlags.ENABLE_MULTIPLE_CHILDREN && 
         childrenCount > 1;
}
