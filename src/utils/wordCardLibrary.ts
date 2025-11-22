/**
 * 📇 词卡库系统
 * 提供分级词卡供AI学习
 */

export interface WordCard {
  id: string;
  word: string;           // 词语
  emoji: string;          // 表情符号
  definition: string;     // 定义
  examples: string[];     // 例句
  difficulty: 1 | 2 | 3 | 4 | 5; // 难度等级
  category: string;       // 分类
}

/**
 * Level 1: 基础词汇（0-100词）
 * 日常生活最常用的词
 */
const level1Cards: WordCard[] = [
  // 家庭类
  { id: 'l1_001', word: '妈妈', emoji: '👩', definition: '养育和照顾我的女性长辈', examples: ['妈妈很爱我', '我爱妈妈'], difficulty: 1, category: '家庭' },
  { id: 'l1_002', word: '爸爸', emoji: '👨', definition: '养育和照顾我的男性长辈', examples: ['爸爸工作很辛苦', '爸爸陪我玩'], difficulty: 1, category: '家庭' },
  { id: 'l1_003', word: '宝宝', emoji: '👶', definition: '年纪很小的孩子', examples: ['我是宝宝', '宝宝要长大'], difficulty: 1, category: '家庭' },
  { id: 'l1_004', word: '家', emoji: '🏠', definition: '我们住的地方', examples: ['我爱我的家', '回家了'], difficulty: 1, category: '家庭' },
  
  // 水果类
  { id: 'l1_005', word: '苹果', emoji: '🍎', definition: '一种红色的圆形水果，很好吃', examples: ['苹果很甜', '我喜欢吃苹果'], difficulty: 1, category: '水果' },
  { id: 'l1_006', word: '香蕉', emoji: '🍌', definition: '黄色的长长的水果', examples: ['香蕉软软的', '猴子喜欢吃香蕉'], difficulty: 1, category: '水果' },
  { id: 'l1_007', word: '西瓜', emoji: '🍉', definition: '绿色的大大的水果，里面是红色的', examples: ['西瓜很解渴', '夏天吃西瓜'], difficulty: 1, category: '水果' },
  { id: 'l1_008', word: '葡萄', emoji: '🍇', definition: '紫色的一串一串的小水果', examples: ['葡萄很甜', '一颗颗葡萄'], difficulty: 1, category: '水果' },
  
  // 颜色类
  { id: 'l1_009', word: '红色', emoji: '❤️', definition: '像太阳、像血的颜色', examples: ['红色的花', '红色很鲜艳'], difficulty: 1, category: '颜色' },
  { id: 'l1_010', word: '蓝色', emoji: '💙', definition: '像天空、像海水的颜色', examples: ['蓝色的天', '蓝色很漂亮'], difficulty: 1, category: '颜色' },
  { id: 'l1_011', word: '黄色', emoji: '💛', definition: '像香蕉、像太阳的颜色', examples: ['黄色的花', '黄色很亮'], difficulty: 1, category: '颜色' },
  { id: 'l1_012', word: '绿色', emoji: '💚', definition: '像草、像树叶的颜色', examples: ['绿色的树', '绿色代表生机'], difficulty: 1, category: '颜色' },
  
  // 动物类
  { id: 'l1_013', word: '小狗', emoji: '🐕', definition: '人类的好朋友，会汪汪叫', examples: ['小狗很可爱', '我喜欢小狗'], difficulty: 1, category: '动物' },
  { id: 'l1_014', word: '小猫', emoji: '🐱', definition: '可爱的动物，会喵喵叫', examples: ['小猫很温柔', '小猫会抓老鼠'], difficulty: 1, category: '动物' },
  { id: 'l1_015', word: '小鸟', emoji: '🐦', definition: '会飞的动物，会唱歌', examples: ['小鸟在天上飞', '小鸟叽叽喳喳'], difficulty: 1, category: '动物' },
  { id: 'l1_016', word: '小兔', emoji: '🐰', definition: '有长耳朵的可爱动物', examples: ['小兔爱吃胡萝卜', '小兔蹦蹦跳跳'], difficulty: 1, category: '动物' },
  
  // 自然类
  { id: 'l1_017', word: '太阳', emoji: '☀️', definition: '天上发光发热的星球，给我们光和温暖', examples: ['太阳很温暖', '太阳升起来了'], difficulty: 1, category: '自然' },
  { id: 'l1_018', word: '月亮', emoji: '🌙', definition: '晚上天上的发光的圆圆的东西', examples: ['月亮很亮', '晚上有月亮'], difficulty: 1, category: '自然' },
  { id: 'l1_019', word: '星星', emoji: '⭐', definition: '晚上天上闪闪发光的小点点', examples: ['星星一闪一闪', '天上很多星星'], difficulty: 1, category: '自然' },
  { id: 'l1_020', word: '花', emoji: '🌸', definition: '植物开的美丽的部分', examples: ['花很香', '花很漂亮'], difficulty: 1, category: '自然' },
  
  // 情感类
  { id: 'l1_021', word: '爱', emoji: '❤️', definition: '很喜欢很喜欢的感觉', examples: ['我爱妈妈', '爱是温暖的'], difficulty: 1, category: '情感' },
  { id: 'l1_022', word: '高兴', emoji: '😊', definition: '心里很开心很快乐', examples: ['我很高兴', '高兴地笑了'], difficulty: 1, category: '情感' },
  { id: 'l1_023', word: '难过', emoji: '😢', definition: '心里不开心，想哭', examples: ['我很难过', '难过的时候会哭'], difficulty: 1, category: '情感' },
  { id: 'l1_024', word: '害怕', emoji: '😨', definition: '觉得危险或恐怖的感觉', examples: ['我很害怕', '害怕黑暗'], difficulty: 1, category: '情感' },
  
  // 动作类
  { id: 'l1_025', word: '吃', emoji: '🍴', definition: '把食物放进嘴里嚼碎吞下去', examples: ['吃饭', '我在吃苹果'], difficulty: 1, category: '动作' },
  { id: 'l1_026', word: '喝', emoji: '🥤', definition: '把液体放进嘴里吞下去', examples: ['喝水', '我要喝牛奶'], difficulty: 1, category: '动作' },
  { id: 'l1_027', word: '睡觉', emoji: '😴', definition: '闭上眼睛休息', examples: ['晚上睡觉', '我要睡觉了'], difficulty: 1, category: '动作' },
  { id: 'l1_028', word: '玩', emoji: '🎮', definition: '做游戏或娱乐活动', examples: ['我在玩', '和朋友一起玩'], difficulty: 1, category: '动作' },
  
  // 形容词
  { id: 'l1_029', word: '大', emoji: '📏', definition: '体积很多，不小', examples: ['大象很大', '大苹果'], difficulty: 1, category: '形容词' },
  { id: 'l1_030', word: '小', emoji: '🔬', definition: '体积少，不大', examples: ['蚂蚁很小', '小房子'], difficulty: 1, category: '形容词' },
  { id: 'l1_031', word: '好吃', emoji: '😋', definition: '食物的味道很美味', examples: ['苹果好吃', '这个很好吃'], difficulty: 1, category: '形容词' },
  { id: 'l1_032', word: '漂亮', emoji: '✨', definition: '外表很美丽好看', examples: ['花很漂亮', '漂亮的衣服'], difficulty: 1, category: '形容词' },
];

/**
 * Level 2: 进阶词汇（100-300词）
 * 更多日常用词
 */
const level2Cards: WordCard[] = [
  { id: 'l2_001', word: '朋友', emoji: '👥', definition: '和我关系很好的人', examples: ['我的好朋友', '朋友一起玩'], difficulty: 2, category: '社交' },
  { id: 'l2_002', word: '学习', emoji: '📚', definition: '通过读书或练习获得知识', examples: ['我在学习', '学习很重要'], difficulty: 2, category: '学习' },
  { id: 'l2_003', word: '帮助', emoji: '🤝', definition: '为别人做事让他们更容易', examples: ['帮助别人', '妈妈帮助我'], difficulty: 2, category: '社交' },
  { id: 'l2_004', word: '谢谢', emoji: '🙏', definition: '感谢别人的话', examples: ['谢谢你', '说谢谢很礼貌'], difficulty: 2, category: '礼貌' },
  { id: 'l2_005', word: '对不起', emoji: '🙇', definition: '做错事后道歉的话', examples: ['对不起我错了', '说对不起'], difficulty: 2, category: '礼貌' },
  { id: 'l2_006', word: '勇敢', emoji: '💪', definition: '不害怕困难和危险', examples: ['要勇敢', '勇敢的孩子'], difficulty: 2, category: '品质' },
  { id: 'l2_007', word: '努力', emoji: '💯', definition: '很用心很认真地做事', examples: ['努力学习', '我很努力'], difficulty: 2, category: '品质' },
  { id: 'l2_008', word: '快乐', emoji: '😄', definition: '心情非常开心愉快', examples: ['我很快乐', '快乐的一天'], difficulty: 2, category: '情感' },
];

/**
 * Level 3: 高级词汇（300-600词）
 * 抽象概念和复杂词汇
 */
const level3Cards: WordCard[] = [
  { id: 'l3_001', word: '梦想', emoji: '💭', definition: '心里最想实现的愿望', examples: ['我的梦想', '为梦想努力'], difficulty: 3, category: '抽象' },
  { id: 'l3_002', word: '坚持', emoji: '🎯', definition: '遇到困难也不放弃继续做', examples: ['坚持学习', '坚持就会成功'], difficulty: 3, category: '品质' },
  { id: 'l3_003', word: '智慧', emoji: '🧠', definition: '聪明和有见识的能力', examples: ['智慧的人', '用智慧解决'], difficulty: 3, category: '抽象' },
  { id: 'l3_004', word: '善良', emoji: '🕊️', definition: '心地好，愿意帮助别人', examples: ['善良的心', '善良的人'], difficulty: 3, category: '品质' },
];

/**
 * 获取所有词卡
 */
export function getAllWordCards(): WordCard[] {
  return [...level1Cards, ...level2Cards, ...level3Cards];
}

/**
 * 根据难度获取词卡
 */
export function getCardsByDifficulty(difficulty: 1 | 2 | 3): WordCard[] {
  const allCards = getAllWordCards();
  return allCards.filter(card => card.difficulty === difficulty);
}

/**
 * 根据分类获取词卡
 */
export function getCardsByCategory(category: string): WordCard[] {
  const allCards = getAllWordCards();
  return allCards.filter(card => card.category === category);
}

/**
 * 随机获取N张未学过的词卡
 */
export function getRandomCards(count: number, learnedWords: string[], maxDifficulty: 1 | 2 | 3 = 3): WordCard[] {
  const allCards = getAllWordCards();
  
  // 过滤已学过的词和难度超出范围的词
  const availableCards = allCards.filter(
    card => !learnedWords.includes(card.word) && card.difficulty <= maxDifficulty
  );
  
  // 随机打乱
  const shuffled = availableCards.sort(() => Math.random() - 0.5);
  
  // 返回前N张
  return shuffled.slice(0, count);
}

/**
 * 根据识字量推荐难度
 */
export function getRecommendedDifficulty(vocabularyCount: number): 1 | 2 | 3 {
  if (vocabularyCount < 30) return 1;
  if (vocabularyCount < 100) return 2;
  return 3;
}
