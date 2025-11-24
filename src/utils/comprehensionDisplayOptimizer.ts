/**
 * 🧠 理解力显示优化器
 * 修复进度显示并提供视觉增强
 */

interface AbilityData {
  level: number;
  progress: number;
}

interface ComprehensionDisplayData {
  name: string;
  displayName: string;
  icon: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  description: string;
}

/**
 * 理解力能力配置
 */
export const COMPREHENSION_CONFIG: Record<string, ComprehensionDisplayData> = {
  literal: {
    name: 'literal',
    displayName: '字面理解',
    icon: '📝',
    color: 'blue',
    gradientFrom: 'from-blue-400',
    gradientTo: 'to-blue-600',
    description: '理解文字的直接含义'
  },
  context: {
    name: 'context',
    displayName: '上下文理解',
    icon: '🔍',
    color: 'green',
    gradientFrom: 'from-green-400',
    gradientTo: 'to-green-600',
    description: '理解前后文的关联'
  },
  abstract: {
    name: 'abstract',
    displayName: '抽象理解',
    icon: '🎨',
    color: 'purple',
    gradientFrom: 'from-purple-400',
    gradientTo: 'to-purple-600',
    description: '理解抽象概念和比喻'
  },
  emotion: {
    name: 'emotion',
    displayName: '情感理解',
    icon: '💝',
    color: 'pink',
    gradientFrom: 'from-pink-400',
    gradientTo: 'to-pink-600',
    description: '感知情绪和情感'
  },
  logic: {
    name: 'logic',
    displayName: '逻辑推理',
    icon: '🧩',
    color: 'orange',
    gradientFrom: 'from-orange-400',
    gradientTo: 'to-orange-600',
    description: '进行逻辑思考和推理'
  }
};

/**
 * 获取能力等级描述
 */
export const getAbilityLevelDescription = (level: number): string => {
  if (level <= 2) return '初学者';
  if (level <= 4) return '入门级';
  if (level <= 6) return '熟练级';
  if (level <= 8) return '精通级';
  if (level <= 10) return '专家级';
  return '大师级';
};

/**
 * 获取能力颜色强度
 */
export const getAbilityColorIntensity = (progress: number): string => {
  if (progress < 25) return 'opacity-40';
  if (progress < 50) return 'opacity-60';
  if (progress < 75) return 'opacity-80';
  return 'opacity-100';
};

/**
 * 计算总体理解力等级
 */
export const calculateOverallComprehension = (abilities: Record<string, AbilityData>): {
  level: number;
  progress: number;
  totalExp: number;
} => {
  const totalExp = Object.values(abilities).reduce((sum, ability) => {
    return sum + ((ability.level - 1) * 100 + ability.progress);
  }, 0);
  
  const avgLevel = Math.floor(totalExp / (Object.keys(abilities).length * 100)) + 1;
  const avgProgress = Math.floor((totalExp % (Object.keys(abilities).length * 100)) / Object.keys(abilities).length);
  
  return {
    level: Math.min(avgLevel, 50), // 最高50级
    progress: avgProgress,
    totalExp
  };
};

/**
 * 修复能力数据显示问题
 */
export const fixAbilityData = (abilityData: any): AbilityData => {
  // 如果是旧版本的纯数字，转换为新格式
  if (typeof abilityData === 'number') {
    const level = Math.floor(abilityData / 10) + 1;
    const progress = abilityData % 10 * 10;
    return { level: Math.min(level, 10), progress: Math.min(progress, 100) };
  }
  
  // 如果已经是正确格式，直接返回
  if (typeof abilityData === 'object' && abilityData.level && abilityData.progress !== undefined) {
    return {
      level: Math.max(1, Math.min(abilityData.level || 1, 50)),
      progress: Math.max(0, Math.min(abilityData.progress || 0, 100))
    };
  }
  
  // 默认值
  return { level: 1, progress: 0 };
};

/**
 * 获取下一级所需经验
 */
export const getExpToNextLevel = (progress: number): number => {
  return 100 - progress;
};

/**
 * 获取能力成长建议
 */
export const getGrowthSuggestion = (abilityName: string, data: AbilityData): string => {
  const config = COMPREHENSION_CONFIG[abilityName];
  
  if (data.level <= 2) {
    return `多进行${config.displayName}练习，提升基础能力`;
  } else if (data.level <= 5) {
    return `通过复杂对话来提升${config.displayName}`;
  } else if (data.level <= 8) {
    return `尝试更有挑战性的${config.displayName}任务`;
  } else {
    return `继续保持，你的${config.displayName}已经很出色了！`;
  }
};
