/**
 * 邮票系统 - 精美邮票收集
 * 参考慢邮件App的邮票设计
 */

import { Stamp, StampSeries, StampCollection, StampCategory } from '../types/stamp';

const STORAGE_KEY = 'stamp_collection';

// 预定义精美邮票（参考图片风格）
const PRESET_STAMPS: Stamp[] = [
  // 默认系列
  {
    id: 'default-note',
    name: '笔记',
    category: 'default',
    series: 'default',
    rarity: 'common',
    image: '✒️',
    description: '记录生活的点滴',
    unlocked: true,
    unlockCondition: '初始解锁'
  },
  {
    id: 'default-photo',
    name: '照片',
    category: 'default',
    series: 'default',
    rarity: 'common',
    image: '📷',
    description: '定格美好瞬间',
    unlocked: true,
    unlockCondition: '初始解锁'
  },
  
  // 情感系列
  {
    id: 'emotion-love',
    name: '爱',
    category: 'emotion',
    series: 'sweet',
    rarity: 'rare',
    image: '💗',
    description: '爱是永恒的主题',
    unlocked: false,
    unlockCondition: '发送10封信件'
  },
  {
    id: 'emotion-happy',
    name: '快乐时光',
    category: 'emotion',
    series: 'sweet',
    rarity: 'rare',
    image: '🌈',
    description: '愿你每天都开心',
    unlocked: false,
    unlockCondition: '收到5次回信'
  },
  
  // 自然风光系列
  {
    id: 'nature-forest',
    name: '森林',
    category: 'nature',
    series: 'landscape',
    rarity: 'rare',
    image: '🌲',
    description: '深邃的森林秘境',
    unlocked: false,
    unlockCondition: '发送15封信件'
  },
  {
    id: 'nature-sea',
    name: '海洋',
    category: 'nature',
    series: 'landscape',
    rarity: 'rare',
    image: '🌊',
    description: '浩瀚的蓝色海洋',
    unlocked: false,
    unlockCondition: '发送20封信件'
  },
  {
    id: 'nature-mountain',
    name: '山脉',
    category: 'nature',
    series: 'landscape',
    rarity: 'epic',
    image: '⛰️',
    description: '巍峨的雪山之巅',
    unlocked: false,
    unlockCondition: '发送30封信件'
  },
  {
    id: 'nature-lake',
    name: '湖泊',
    category: 'nature',
    series: 'landscape',
    rarity: 'rare',
    image: '🏞️',
    description: '宁静的湖光山色',
    unlocked: false,
    unlockCondition: '发送25封信件'
  },
  
  // 城市系列
  {
    id: 'city-beijing',
    name: '北京',
    category: 'city',
    series: 'china',
    rarity: 'epic',
    image: '🏛️',
    description: '古都的韵味',
    unlocked: false,
    unlockCondition: '发送40封信件'
  },
  {
    id: 'city-shanghai',
    name: '上海',
    category: 'city',
    series: 'china',
    rarity: 'epic',
    image: '🌆',
    description: '魔都的繁华',
    unlocked: false,
    unlockCondition: '发送45封信件'
  },
  
  // 动物系列
  {
    id: 'animal-cat',
    name: '可爱猫咪',
    category: 'animal',
    series: 'cute',
    rarity: 'rare',
    image: '🐱',
    description: '软萌的小猫咪',
    unlocked: false,
    unlockCondition: '收到10次回信'
  },
  {
    id: 'animal-dog',
    name: '忠诚小狗',
    category: 'animal',
    series: 'cute',
    rarity: 'rare',
    image: '🐶',
    description: '最好的朋友',
    unlocked: false,
    unlockCondition: '收到15次回信'
  },
  
  // 节日系列
  {
    id: 'festival-birthday',
    name: '生日快乐',
    category: 'festival',
    series: 'celebration',
    rarity: 'epic',
    image: '🎂',
    description: '祝你生日快乐',
    unlocked: false,
    unlockCondition: '发送50封信件'
  },
  {
    id: 'festival-newyear',
    name: '新年',
    category: 'festival',
    series: 'celebration',
    rarity: 'epic',
    image: '🎊',
    description: '新年新气象',
    unlocked: false,
    unlockCondition: '在新年期间登录'
  },
  
  // 艺术系列
  {
    id: 'art-music',
    name: '音乐',
    category: 'art',
    series: 'artistic',
    rarity: 'rare',
    image: '🎵',
    description: '音乐是生活的调味剂',
    unlocked: false,
    unlockCondition: '发送35封信件'
  },
  {
    id: 'art-movie',
    name: '电影',
    category: 'art',
    series: 'artistic',
    rarity: 'rare',
    image: '🎬',
    description: '光影的魅力',
    unlocked: false,
    unlockCondition: '收到20次回信'
  },
  
  // 特殊系列
  {
    id: 'special-bottle',
    name: '许愿瓶',
    category: 'special',
    series: 'mysterious',
    rarity: 'legendary',
    image: '🧪',
    description: '装满梦想的瓶子',
    unlocked: false,
    unlockCondition: '发送10个漂流瓶'
  },
  {
    id: 'special-star',
    name: '星空',
    category: 'special',
    series: 'mysterious',
    rarity: 'legendary',
    image: '✨',
    description: '浩瀚星辰',
    unlocked: false,
    unlockCondition: '收藏30封信件'
  }
];

// 邮票系列定义
const STAMP_SERIES: StampSeries[] = [
  {
    id: 'default',
    name: '默认邮票',
    category: 'default',
    description: '基础邮票系列',
    stamps: ['default-note', 'default-photo']
  },
  {
    id: 'sweet',
    name: '甜蜜系列',
    category: 'emotion',
    description: '记录生活中的甜蜜时光',
    stamps: ['emotion-love', 'emotion-happy'],
    completionReward: '解锁特殊称号：甜蜜使者'
  },
  {
    id: 'landscape',
    name: '风物集',
    category: 'nature',
    description: '大自然的美丽风光',
    stamps: ['nature-forest', 'nature-sea', 'nature-mountain', 'nature-lake'],
    completionReward: '解锁特殊邮票：极光'
  },
  {
    id: 'china',
    name: '城市印象',
    category: 'city',
    description: '中国城市系列',
    stamps: ['city-beijing', 'city-shanghai'],
    completionReward: '解锁特殊称号：旅行家'
  },
  {
    id: 'cute',
    name: '可爱胖橘',
    category: 'animal',
    description: '萌宠系列',
    stamps: ['animal-cat', 'animal-dog'],
    completionReward: '解锁特殊邮票：熊猫'
  },
  {
    id: 'celebration',
    name: '节日庆典',
    category: 'festival',
    description: '特殊节日纪念',
    stamps: ['festival-birthday', 'festival-newyear'],
    completionReward: '解锁特殊称号：庆典之星'
  },
  {
    id: 'artistic',
    name: '艺术殿堂',
    category: 'art',
    description: '艺术主题邮票',
    stamps: ['art-music', 'art-movie'],
    completionReward: '解锁特殊邮票：画笔'
  },
  {
    id: 'mysterious',
    name: '神秘珍藏',
    category: 'special',
    description: '稀有特殊邮票',
    stamps: ['special-bottle', 'special-star'],
    completionReward: '解锁终极称号：收藏家'
  }
];

/**
 * 初始化邮票收藏
 */
export function initStampCollection(): StampCollection {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    return JSON.parse(saved);
  }

  // 创建初始收藏
  const stamps: Record<string, Stamp> = {};
  PRESET_STAMPS.forEach(stamp => {
    stamps[stamp.id] = { ...stamp };
  });

  const series: Record<string, StampSeries> = {};
  STAMP_SERIES.forEach(s => {
    series[s.id] = { ...s };
  });

  const collection: StampCollection = {
    stamps,
    series,
    totalUnlocked: PRESET_STAMPS.filter(s => s.unlocked).length,
    totalStamps: PRESET_STAMPS.length,
    favoriteStampId: 'default-note'
  };

  saveStampCollection(collection);
  return collection;
}

/**
 * 保存邮票收藏
 */
export function saveStampCollection(collection: StampCollection): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
}

/**
 * 获取邮票收藏
 */
export function getStampCollection(): StampCollection {
  return initStampCollection();
}

/**
 * 解锁邮票
 */
export function unlockStamp(stampId: string): boolean {
  const collection = getStampCollection();
  const stamp = collection.stamps[stampId];
  
  if (!stamp || stamp.unlocked) {
    return false;
  }

  stamp.unlocked = true;
  stamp.unlockedAt = Date.now();
  collection.totalUnlocked++;

  saveStampCollection(collection);
  return true;
}

/**
 * 设置当前使用的邮票
 */
export function setFavoriteStamp(stampId: string): boolean {
  const collection = getStampCollection();
  const stamp = collection.stamps[stampId];
  
  if (!stamp || !stamp.unlocked) {
    return false;
  }

  collection.favoriteStampId = stampId;
  saveStampCollection(collection);
  return true;
}

/**
 * 获取当前邮票
 */
export function getCurrentStamp(): Stamp | null {
  const collection = getStampCollection();
  if (!collection.favoriteStampId) return null;
  return collection.stamps[collection.favoriteStampId] || null;
}

/**
 * 按分类获取邮票
 */
export function getStampsByCategory(category: StampCategory): Stamp[] {
  const collection = getStampCollection();
  return Object.values(collection.stamps).filter(s => s.category === category);
}

/**
 * 获取系列完成度
 */
export function getSeriesProgress(seriesId: string): { unlocked: number; total: number; completed: boolean } {
  const collection = getStampCollection();
  const series = collection.series[seriesId];
  
  if (!series) {
    return { unlocked: 0, total: 0, completed: false };
  }

  const total = series.stamps.length;
  const unlocked = series.stamps.filter(id => collection.stamps[id]?.unlocked).length;
  
  return {
    unlocked,
    total,
    completed: unlocked === total
  };
}

/**
 * 检查并解锁邮票（根据条件）
 */
export function checkAndUnlockStamps(condition: {
  sentLetters?: number;
  receivedReplies?: number;
  bottlesSent?: number;
  favoritedLetters?: number;
}): string[] {
  const collection = getStampCollection();
  const unlocked: string[] = [];

  Object.values(collection.stamps).forEach(stamp => {
    if (stamp.unlocked) return;

    let shouldUnlock = false;

    // 根据不同条件判断是否解锁
    if (condition.sentLetters !== undefined) {
      if (stamp.id === 'emotion-love' && condition.sentLetters >= 10) shouldUnlock = true;
      if (stamp.id === 'nature-forest' && condition.sentLetters >= 15) shouldUnlock = true;
      if (stamp.id === 'nature-sea' && condition.sentLetters >= 20) shouldUnlock = true;
      if (stamp.id === 'nature-lake' && condition.sentLetters >= 25) shouldUnlock = true;
      if (stamp.id === 'nature-mountain' && condition.sentLetters >= 30) shouldUnlock = true;
      if (stamp.id === 'art-music' && condition.sentLetters >= 35) shouldUnlock = true;
      if (stamp.id === 'city-beijing' && condition.sentLetters >= 40) shouldUnlock = true;
      if (stamp.id === 'city-shanghai' && condition.sentLetters >= 45) shouldUnlock = true;
      if (stamp.id === 'festival-birthday' && condition.sentLetters >= 50) shouldUnlock = true;
    }

    if (condition.receivedReplies !== undefined) {
      if (stamp.id === 'emotion-happy' && condition.receivedReplies >= 5) shouldUnlock = true;
      if (stamp.id === 'animal-cat' && condition.receivedReplies >= 10) shouldUnlock = true;
      if (stamp.id === 'animal-dog' && condition.receivedReplies >= 15) shouldUnlock = true;
      if (stamp.id === 'art-movie' && condition.receivedReplies >= 20) shouldUnlock = true;
    }

    if (condition.bottlesSent !== undefined) {
      if (stamp.id === 'special-bottle' && condition.bottlesSent >= 10) shouldUnlock = true;
    }

    if (condition.favoritedLetters !== undefined) {
      if (stamp.id === 'special-star' && condition.favoritedLetters >= 30) shouldUnlock = true;
    }

    if (shouldUnlock && unlockStamp(stamp.id)) {
      unlocked.push(stamp.id);
    }
  });

  return unlocked;
}

/**
 * 获取所有系列
 */
export function getAllSeries(): StampSeries[] {
  const collection = getStampCollection();
  return Object.values(collection.series);
}

/**
 * 获取系列邮票
 */
export function getSeriesStamps(seriesId: string): Stamp[] {
  const collection = getStampCollection();
  const series = collection.series[seriesId];
  
  if (!series) return [];
  
  return series.stamps
    .map(id => collection.stamps[id])
    .filter(Boolean);
}
