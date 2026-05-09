/**
 * 🎯 简化的升级系统
 * 每级所需经验：level * 10 (第1级10点，第2级20点，第3级30点...)
 */

import { AIChildData } from '../types';

/**
 * 计算指定等级需要的经验值
 */
export const getExpForLevel = (level: number): number => {
  return level * 10;
};

/**
 * 计算累积经验值（从1级到指定级别的总经验）
 */
export const getTotalExpForLevel = (level: number): number => {
  let total = 0;
  for (let i = 1; i <= level; i++) {
    total += getExpForLevel(i);
  }
  return total;
};

/**
 * 根据总经验值计算当前等级和进度
 */
export const calculateLevelFromExp = (totalExp: number): { level: number; currentLevelExp: number; expForThisLevel: number } => {
  if (totalExp <= 0) {
    return { level: 1, currentLevelExp: 0, expForThisLevel: 10 };
  }
  
  let level = 1;
  let accumulatedExp = 0;
  
  // 计算当前等级
  while (accumulatedExp + getExpForLevel(level) <= totalExp) {
    accumulatedExp += getExpForLevel(level);
    level++;
  }
  
  const currentLevelExp = totalExp - accumulatedExp;
  const expForThisLevel = getExpForLevel(level);
  
  return { level, currentLevelExp, expForThisLevel };
};

/**
 * 处理AI升级 - 简化版本
 */
export const processLevelUp = (childData: AIChildData, expGain: number): { leveledUp: boolean; newLevel: number; oldLevel: number } => {
  const oldLevel = childData.level;
  const oldTotalExp = childData.totalExp || getTotalExpForLevel(oldLevel - 1) + childData.exp;
  const newTotalExp = oldTotalExp + expGain;
  
  const { level: newLevel, currentLevelExp, expForThisLevel } = calculateLevelFromExp(newTotalExp);
  
  // 更新数据
  childData.totalExp = newTotalExp;
  childData.level = newLevel;
  childData.exp = currentLevelExp;
  childData.expToNextLevel = expForThisLevel;
  
  return {
    leveledUp: newLevel > oldLevel,
    newLevel,
    oldLevel
  };
};

/**
 * 初始化AI儿童的经验数据
 */
export const initializeExpData = (childData: AIChildData): void => {
  // 如果没有totalExp，基于当前level和exp计算
  if (!childData.totalExp) {
    const prevLevelsExp = childData.level > 1 ? getTotalExpForLevel(childData.level - 1) : 0;
    childData.totalExp = prevLevelsExp + (childData.exp || 0);
  }
  
  // 重新计算确保数据正确
  const { level, currentLevelExp, expForThisLevel } = calculateLevelFromExp(childData.totalExp);
  childData.level = level;
  childData.exp = currentLevelExp;
  childData.expToNextLevel = expForThisLevel;
};

/**
 * 获取升级提示信息
 */
export const getLevelUpMessage = (childName: string, oldLevel: number, newLevel: number): string => {
  const levelDiff = newLevel - oldLevel;
  if (levelDiff === 1) {
    return `🎉 ${childName} 升级了！\n\nLevel ${oldLevel} → Level ${newLevel}\n\n下一级需要经验：${getExpForLevel(newLevel + 1)}点`;
  } else if (levelDiff > 1) {
    return `🎉🎉 ${childName} 连升${levelDiff}级！\n\nLevel ${oldLevel} → Level ${newLevel}\n\n下一级需要经验：${getExpForLevel(newLevel + 1)}点`;
  }
  return '';
};
