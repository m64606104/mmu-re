/**
 * 邮票系统类型定义
 */

// 邮票类型
export interface Stamp {
  id: string;
  name: string;
  category: StampCategory;
  series: string; // 系列名称
  rarity: 'common' | 'rare' | 'epic' | 'legendary'; // 稀有度
  image: string; // SVG或图片URL
  description: string;
  unlocked: boolean;
  unlockedAt?: number;
  unlockCondition: string; // 解锁条件描述
}

// 邮票分类
export type StampCategory = 
  | 'default'       // 默认邮票
  | 'nature'        // 自然风光
  | 'emotion'       // 情感系列
  | 'festival'      // 节日系列
  | 'art'           // 艺术系列
  | 'animal'        // 动物系列
  | 'city'          // 城市系列
  | 'special';      // 特殊系列

// 邮票系列
export interface StampSeries {
  id: string;
  name: string;
  category: StampCategory;
  description: string;
  stamps: string[]; // stamp ids
  completionReward?: string;
}

// 用户邮票收藏
export interface StampCollection {
  stamps: Record<string, Stamp>; // stamp id -> stamp
  series: Record<string, StampSeries>; // series id -> series
  totalUnlocked: number;
  totalStamps: number;
  favoriteStampId?: string; // 当前使用的邮票
}
