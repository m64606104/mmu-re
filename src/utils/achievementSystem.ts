import { getAllLetters } from './letterService';
import { getCachedData, load, save, setCachedData } from './storage';

/**
 * 成就系统
 * 为慢邮件功能添加游戏化元素
 */

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'letter' | 'penpal' | 'communication' | 'special';
  requirement: number;
  currentProgress: number;
  unlocked: boolean;
  unlockedAt?: number;
  reward?: {
    type: 'badge' | 'title' | 'feature';
    value: string;
  };
}

// 成就定义
const ACHIEVEMENTS: Omit<Achievement, 'currentProgress' | 'unlocked' | 'unlockedAt'>[] = [
  // 信件相关成就
  {
    id: 'first_letter',
    title: '🎉 初次寄信',
    description: '寄出第一封信',
    icon: '✉️',
    category: 'letter',
    requirement: 1,
    reward: { type: 'badge', value: '新手邮差' }
  },
  {
    id: 'letter_sender_10',
    title: '📮 勤劳邮差',
    description: '累计寄出10封信',
    icon: '📮',
    category: 'letter',
    requirement: 10,
    reward: { type: 'badge', value: '勤劳邮差' }
  },
  {
    id: 'letter_sender_50',
    title: '📬 资深邮差',
    description: '累计寄出50封信',
    icon: '📬',
    category: 'letter',
    requirement: 50,
    reward: { type: 'badge', value: '资深邮差' }
  },
  {
    id: 'letter_sender_100',
    title: '💌 传奇邮差',
    description: '累计寄出100封信',
    icon: '💌',
    category: 'letter',
    requirement: 100,
    reward: { type: 'badge', value: '传奇邮差' }
  },
  
  // 笔友相关成就
  {
    id: 'first_penpal',
    title: '👥 初识笔友',
    description: '添加第一位笔友',
    icon: '👥',
    category: 'penpal',
    requirement: 1,
    reward: { type: 'badge', value: '社交新人' }
  },
  {
    id: 'penpal_5',
    title: '🌟 社交达人',
    description: '拥有5位笔友',
    icon: '🌟',
    category: 'penpal',
    requirement: 5,
    reward: { type: 'badge', value: '社交达人' }
  },
  {
    id: 'penpal_10',
    title: '🎭 万人迷',
    description: '拥有10位笔友',
    icon: '🎭',
    category: 'penpal',
    requirement: 10,
    reward: { type: 'badge', value: '万人迷' }
  },
  {
    id: 'penpal_20',
    title: '🌈 交际花',
    description: '拥有20位笔友',
    icon: '🌈',
    category: 'penpal',
    requirement: 20,
    reward: { type: 'badge', value: '交际花' }
  },
  
  // 交流相关成就
  {
    id: 'consecutive_7days',
    title: '📅 忠实笔友',
    description: '连续7天发信',
    icon: '📅',
    category: 'communication',
    requirement: 7,
    reward: { type: 'feature', value: '加急回信权限' }
  },
  {
    id: 'total_words_1000',
    title: '📖 业余作家',
    description: '累计书写1000字',
    icon: '📖',
    category: 'communication',
    requirement: 1000,
    reward: { type: 'badge', value: '业余作家' }
  },
  {
    id: 'total_words_10000',
    title: '✍️ 文豪',
    description: '累计书写10000字',
    icon: '✍️',
    category: 'communication',
    requirement: 10000,
    reward: { type: 'badge', value: '文豪' }
  },
  {
    id: 'conversation_rounds_50',
    title: '💬 长期笔友',
    description: '与某位笔友交流达50轮',
    icon: '💬',
    category: 'communication',
    requirement: 50,
    reward: { type: 'title', value: '长期笔友认证' }
  },
  
  // 特殊成就
  {
    id: 'night_owl',
    title: '🌙 深夜写信家',
    description: '在凌晨2-4点寄出10封信',
    icon: '🌙',
    category: 'special',
    requirement: 10,
    reward: { type: 'badge', value: '夜猫子' }
  },
  {
    id: 'early_bird',
    title: '🌅 早起的鸟儿',
    description: '在早晨6-8点寄出10封信',
    icon: '🌅',
    category: 'special',
    requirement: 10,
    reward: { type: 'badge', value: '早起鸟' }
  },
  {
    id: 'bottle_explorer',
    title: '🍾 漂流瓶探险家',
    description: '投递30个漂流瓶',
    icon: '🍾',
    category: 'special',
    requirement: 30,
    reward: { type: 'badge', value: '探险家' }
  },
  {
    id: 'emoji_master',
    title: '😊 表情包大师',
    description: '在信件中使用超过100个emoji',
    icon: '😊',
    category: 'special',
    requirement: 100,
    reward: { type: 'badge', value: '表情包大师' }
  },
  {
    id: 'long_letter_writer',
    title: '📜 长文作者',
    description: '写过一封超过1000字的信',
    icon: '📜',
    category: 'special',
    requirement: 1,
    reward: { type: 'badge', value: '长文作者' }
  }
];

const STORAGE_KEY = 'letter_achievements';

/**
 * 获取所有成就
 */
export function getAllAchievements(): Achievement[] {
  const stored = getCachedData<Achievement[]>(STORAGE_KEY);
  if (Array.isArray(stored)) return stored;
  
  // 初始化成就
  const achievements: Achievement[] = ACHIEVEMENTS.map(a => ({
    ...a,
    currentProgress: 0,
    unlocked: false
  }));
  
  setCachedData(STORAGE_KEY, achievements);
  void save(STORAGE_KEY, achievements);
  return achievements;
}

/**
 * 更新成就进度
 */
export function updateAchievementProgress(
  achievementId: string,
  progress: number
): { unlocked: boolean; achievement?: Achievement } {
  const achievements = getAllAchievements();
  const achievement = achievements.find(a => a.id === achievementId);
  
  if (!achievement) {
    return { unlocked: false };
  }
  
  // 如果已解锁，不再更新
  if (achievement.unlocked) {
    return { unlocked: false };
  }
  
  achievement.currentProgress = progress;
  
  // 检查是否达成
  if (progress >= achievement.requirement) {
    achievement.unlocked = true;
    achievement.unlockedAt = Date.now();
    
    // 保存
    setCachedData(STORAGE_KEY, achievements);
    void save(STORAGE_KEY, achievements);
    
    // 触发解锁事件
    triggerAchievementUnlock(achievement);
    
    return { unlocked: true, achievement };
  }
  
  // 保存进度
  setCachedData(STORAGE_KEY, achievements);
  void save(STORAGE_KEY, achievements);
  return { unlocked: false };
}

export async function initializeAchievementStorage(): Promise<void> {
  try {
    const data = await load(STORAGE_KEY);
    setCachedData(STORAGE_KEY, Array.isArray(data) ? data : null);
  } catch (error) {
    console.error('初始化成就存储失败:', error);
    setCachedData(STORAGE_KEY, null);
  }
}

/**
 * 检查信件相关成就
 */
export function checkLetterAchievements() {
  const letters = getAllLetters();
  
  // 寄信数量成就
  updateAchievementProgress('first_letter', letters.length);
  updateAchievementProgress('letter_sender_10', letters.length);
  updateAchievementProgress('letter_sender_50', letters.length);
  updateAchievementProgress('letter_sender_100', letters.length);
  
  // 笔友数量成就
  const penPalCount = letters.filter((l: any) => l.isFriendAdded).length;
  updateAchievementProgress('first_penpal', penPalCount);
  updateAchievementProgress('penpal_5', penPalCount);
  updateAchievementProgress('penpal_10', penPalCount);
  updateAchievementProgress('penpal_20', penPalCount);
  
  // 总字数成就
  const totalWords = letters.reduce((sum: number, l: any) => sum + l.content.length, 0);
  updateAchievementProgress('total_words_1000', totalWords);
  updateAchievementProgress('total_words_10000', totalWords);
  
  // 最长信件
  const longestLetter = Math.max(...letters.map((l: any) => l.content.length), 0);
  if (longestLetter >= 1000) {
    updateAchievementProgress('long_letter_writer', 1);
  }
  
  // 漂流瓶数量
  const bottleCount = letters.filter((l: any) => l.isBottle).length;
  updateAchievementProgress('bottle_explorer', bottleCount);
  
  // Emoji使用数量
  const emojiCount = letters.reduce((sum: number, l: any) => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const matches = l.content.match(emojiRegex);
    return sum + (matches ? matches.length : 0);
  }, 0);
  updateAchievementProgress('emoji_master', emojiCount);
  
  // 时间段成就
  const nightLetters = letters.filter((l: any) => {
    const hour = new Date(l.sentAt).getHours();
    return hour >= 2 && hour < 4;
  }).length;
  updateAchievementProgress('night_owl', nightLetters);
  
  const morningLetters = letters.filter((l: any) => {
    const hour = new Date(l.sentAt).getHours();
    return hour >= 6 && hour < 8;
  }).length;
  updateAchievementProgress('early_bird', morningLetters);
  
  // 长期笔友成就
  const maxRounds = Math.max(...letters.map((l: any) => l.currentRound || 0), 0);
  updateAchievementProgress('conversation_rounds_50', maxRounds);
}

/**
 * 触发成就解锁事件
 */
function triggerAchievementUnlock(achievement: Achievement) {
  // 触发自定义事件
  window.dispatchEvent(new CustomEvent('achievement-unlocked', {
    detail: achievement
  }));
  
  // 浏览器通知
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('🏆 成就解锁！', {
      body: `${achievement.title}\n${achievement.description}`,
      icon: achievement.icon,
      badge: '🏆',
      tag: `achievement-${achievement.id}`,
      requireInteraction: false
    });
  }
  
  console.log('🏆 成就解锁:', achievement);
}

/**
 * 获取成就统计
 */
export function getAchievementStats() {
  const achievements = getAllAchievements();
  const unlocked = achievements.filter(a => a.unlocked);
  
  return {
    total: achievements.length,
    unlocked: unlocked.length,
    progress: Math.round((unlocked.length / achievements.length) * 100),
    recentUnlocked: unlocked
      .sort((a, b) => (b.unlockedAt || 0) - (a.unlockedAt || 0))
      .slice(0, 5)
  };
}

/**
 * 获取按类别分组的成就
 */
export function getAchievementsByCategory() {
  const achievements = getAllAchievements();
  
  return {
    letter: achievements.filter(a => a.category === 'letter'),
    penpal: achievements.filter(a => a.category === 'penpal'),
    communication: achievements.filter(a => a.category === 'communication'),
    special: achievements.filter(a => a.category === 'special')
  };
}
