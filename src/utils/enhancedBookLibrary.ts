/**
 * 📚 增强版书籍学习库
 * 支持AI学习模式和讨论式学习
 */

import { ReadingMaterial } from '../types';

// 学习状态接口
export interface BookLearningStatus {
  bookId: string;
  status: 'not_started' | 'learning' | 'discussion_needed' | 'completed';
  startTime?: number;
  estimatedTime: number; // 预计学习时间（分钟）
  difficulty: 'easy' | 'medium' | 'hard';
  progress: number; // 0-100
  unknownWords?: string[]; // AI不认识的词
  needsDiscussion?: boolean;
}

// 扩展的书籍类型
export const enhancedBookLibrary: ReadingMaterial[] = [
  // === 基础认知类 ===
  {
    id: 'basic_001',
    title: '日常物品认识',
    content: `杯子：用来喝水的容器
碗：用来盛饭的容器  
筷子：用来吃饭的工具
勺子：用来喝汤的工具
盘子：用来装菜的容器
桌子：用来吃饭和学习的家具
椅子：用来坐的家具
床：用来睡觉的家具`,
    level: 1,
    wordCount: 24,
    category: 'basic_knowledge',
    addedAt: Date.now(),
    readCount: 0,
    userAdded: false
  },
  
  {
    id: 'basic_002', 
    title: '颜色世界',
    content: `红色：像苹果一样的颜色，很鲜艳
黄色：像太阳一样的颜色，很温暖
蓝色：像天空一样的颜色，很安静
绿色：像草地一样的颜色，很自然
白色：像雪花一样的颜色，很纯净
黑色：像夜晚一样的颜色，很深沉`,
    level: 1,
    wordCount: 36,
    category: 'basic_knowledge',
    addedAt: Date.now(),
    readCount: 0,
    userAdded: false
  },

  // === 日常对话类 ===
  {
    id: 'conversation_001',
    title: '打招呼用语',
    content: `早上好：早晨见面时说的话
你好：平时见面时说的话
再见：分别时说的话
谢谢：感谢别人时说的话
对不起：做错事时说的话
没关系：原谅别人时说的话
请：请求别人帮忙时说的话`,
    level: 1,
    wordCount: 21,
    category: 'conversation',
    addedAt: Date.now(),
    readCount: 0,
    userAdded: false
  },

  {
    id: 'conversation_002',
    title: '情感表达',
    content: `开心：心情很好的时候
难过：心情不好的时候
生气：很不高兴的时候
害怕：觉得危险的时候
惊讶：看到意外事情的时候
喜欢：对某个东西有好感
不喜欢：对某个东西不感兴趣`,
    level: 2,
    wordCount: 35,
    category: 'conversation',
    addedAt: Date.now(),
    readCount: 0,
    userAdded: false
  },

  // === 饮食相关类 ===
  {
    id: 'food_001',
    title: '美味水果',
    content: `苹果：红色的水果，很甜很脆
香蕉：黄色的水果，软软的很香
橙子：橙色的水果，酸甜多汁
葡萄：紫色的小水果，一串一串的
西瓜：绿色外皮红色果肉，夏天吃很凉爽
草莓：红色的小水果，上面有小籽`,
    level: 2,
    wordCount: 42,
    category: 'food',
    addedAt: Date.now(),
    readCount: 0,
    userAdded: false
  },

  {
    id: 'food_002',
    title: '三餐时间',
    content: `早餐：早上吃的饭，可以吃包子、粥、牛奶
午餐：中午吃的饭，可以吃米饭、面条、蔬菜
晚餐：晚上吃的饭，不要吃太多
零食：平时吃的小食物，不能吃太多
饿了：肚子需要食物的感觉
饱了：吃够了的感觉`,
    level: 2,
    wordCount: 48,
    category: 'food',
    addedAt: Date.now(),
    readCount: 0,
    userAdded: false
  },

  // === 社交礼仪类 ===
  {
    id: 'social_001',
    title: '做客礼仪',
    content: `去别人家做客要先敲门
进门后要脱鞋放整齐
见到长辈要主动问好
不能随便翻别人的东西
离开前要说谢谢再见
在别人家不能大声吵闹`,
    level: 3,
    wordCount: 36,
    category: 'social',
    addedAt: Date.now(),
    readCount: 0,
    userAdded: false
  },

  // === 安全常识类 ===
  {
    id: 'safety_001',
    title: '在家安全',
    content: `不能玩火，火很危险
不能碰电插座，会触电
不能爬高的地方，会摔下来
不能吃不认识的东西
陌生人敲门不能开
一个人在家要小心`,
    level: 3,
    wordCount: 30,
    category: 'safety',
    addedAt: Date.now(),
    readCount: 0,
    userAdded: false
  },

  // === 自然科学类 ===
  {
    id: 'science_001',
    title: '天气变化',
    content: `晴天：太阳出来了，天空很亮
下雨：天空中掉水滴，要打伞
下雪：天空中掉白色的雪花，很冷
刮风：空气在流动，树叶会摆动
打雷：天空中发出很响的声音
彩虹：雨后天空中出现的彩色弧线`,
    level: 3,
    wordCount: 54,
    category: 'science',
    addedAt: Date.now(),
    readCount: 0,
    userAdded: false
  },

  // === 故事童话类 ===
  {
    id: 'story_001',
    title: '小兔乖乖',
    content: `从前有三只小兔子，住在森林里。
大兔子叫长耳朵，二兔子叫短尾巴，小兔子叫红眼睛。
妈妈出门时说："记住，只能给妈妈开门。"
有一天，大灰狼来敲门："小兔子乖乖，把门开开。"
小兔子们说："不开不开，妈妈没回来。"
大灰狼走了，小兔子们很聪明，保护了自己。`,
    level: 4,
    wordCount: 78,
    category: 'story',
    addedAt: Date.now(),
    readCount: 0,
    userAdded: false
  },

  // === 数学启蒙类 ===
  {
    id: 'math_001',
    title: '数字朋友',
    content: `一：1个苹果
二：2只小鸟
三：3朵花
四：4个轮子的汽车
五：5根手指
六：6条腿的昆虫
七：7天是一个星期
八：8条腿的蜘蛛
九：9只小鸭子
十：10个脚趾头`,
    level: 2,
    wordCount: 45,
    category: 'math',
    addedAt: Date.now(),
    readCount: 0,
    userAdded: false
  }
];

/**
 * 根据AI的识字量推荐合适的书籍
 */
export const getRecommendedBooksForLearning = (vocabularySize: number): ReadingMaterial[] => {
  let maxLevel = 1;
  
  if (vocabularySize >= 100) maxLevel = 4;
  else if (vocabularySize >= 50) maxLevel = 3; 
  else if (vocabularySize >= 20) maxLevel = 2;
  
  return enhancedBookLibrary.filter(book => book.level <= maxLevel);
};

/**
 * 预估学习时间（分钟）
 */
export const estimateLearningTime = (book: ReadingMaterial, vocabularySize: number): number => {
  const baseTimePerWord = 0.5; // 每个字0.5分钟
  const difficultyMultiplier = book.level * 0.3; // 难度系数
  const vocabularyBonus = vocabularySize > 50 ? 0.8 : 1.0; // 词汇量奖励
  
  const estimatedTime = Math.ceil(
    book.wordCount * baseTimePerWord * (1 + difficultyMultiplier) * vocabularyBonus
  );
  
  return Math.max(estimatedTime, 2); // 最少2分钟
};

/**
 * 判断书籍难度
 */
export const getBookDifficulty = (book: ReadingMaterial, vocabularySize: number): 'easy' | 'medium' | 'hard' => {
  if (book.level <= 1 || vocabularySize >= book.wordCount) return 'easy';
  if (book.level <= 2 || vocabularySize >= book.wordCount * 0.7) return 'medium';
  return 'hard';
};

/**
 * 检测AI可能不认识的词汇
 */
export const detectUnknownWords = (book: ReadingMaterial, vocabularySize: number): string[] => {
  // 这里简化处理，根据书籍难度和AI词汇量判断
  const difficulty = getBookDifficulty(book, vocabularySize);
  
  if (difficulty === 'easy') return [];
  
  // 模拟一些可能不认识的词
  const possibleUnknownWords: Record<string, string[]> = {
    'food_001': ['多汁', '果肉'],
    'food_002': ['零食'],
    'social_001': ['礼仪', '长辈'],
    'safety_001': ['触电', '陌生人'],
    'science_001': ['弧线', '流动'],
    'story_001': ['森林', '聪明'],
    'conversation_002': ['感兴趣', '好感']
  };
  
  return possibleUnknownWords[book.id] || [];
};

/**
 * 获取书籍分类中文名
 */
export const getCategoryName = (category: string): string => {
  const categoryNames: Record<string, string> = {
    'basic_knowledge': '基础认知',
    'conversation': '日常对话', 
    'food': '饮食相关',
    'social': '社交礼仪',
    'safety': '安全常识',
    'science': '自然科学',
    'story': '故事童话',
    'math': '数学启蒙'
  };
  
  return categoryNames[category] || '其他';
};

/**
 * 获取所有书籍分类
 */
export const getAllBookCategories = (): Array<{key: string; name: string; count: number}> => {
  const categories = Array.from(new Set(enhancedBookLibrary.map(book => book.category)));
  
  return categories.map(category => ({
    key: category,
    name: getCategoryName(category),
    count: enhancedBookLibrary.filter(book => book.category === category).length
  }));
};
