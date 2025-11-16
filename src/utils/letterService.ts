/**
 * 慢邮件服务
 * 处理写信、寄出、回复延迟、漂流瓶等功能
 */

import { Letter, BottleAI } from '../types/letter';

// 🌊 漂流瓶随机AI角色池
const BOTTLE_AI_POOL: BottleAI[] = [
  {
    id: 'bottle_ai_1',
    name: '海边的小羊',
    avatar: '🐑',
    personality: '温柔细腻，喜欢思考人生',
    location: '海边小镇',
    hobby: '看日出、写诗、收集贝壳'
  },
  {
    id: 'bottle_ai_2',
    name: '山间旅人',
    avatar: '🎒',
    personality: '热爱冒险，乐观开朗',
    location: '云南大理',
    hobby: '徒步、摄影、品茶'
  },
  {
    id: 'bottle_ai_3',
    name: '书店老板娘',
    avatar: '📚',
    personality: '文艺安静，博览群书',
    location: '江南古镇',
    hobby: '阅读、咖啡、养猫'
  },
  {
    id: 'bottle_ai_4',
    name: '星空观测者',
    avatar: '🔭',
    personality: '浪漫理性，热爱科学',
    location: '高原天文台',
    hobby: '观星、天文学、音乐'
  },
  {
    id: 'bottle_ai_5',
    name: '咖啡师艾米',
    avatar: '☕',
    personality: '热情友善，善于倾听',
    location: '城市街角',
    hobby: '烘焙咖啡、绘画、听故事'
  },
  {
    id: 'bottle_ai_6',
    name: '森林守护者',
    avatar: '🌲',
    personality: '沉稳平和，亲近自然',
    location: '深山老林',
    hobby: '观察动物、植物学、冥想'
  },
  {
    id: 'bottle_ai_7',
    name: '音乐流浪者',
    avatar: '🎸',
    personality: '自由洒脱，充满艺术气息',
    location: '四处漂泊',
    hobby: '弹吉他、写歌、旅行'
  },
  {
    id: 'bottle_ai_8',
    name: '灯塔守望人',
    avatar: '🗼',
    personality: '孤独却温暖，富有诗意',
    location: '海角灯塔',
    hobby: '写日记、观海、品酒'
  }
];

/**
 * 获取随机漂流瓶AI
 */
export function getRandomBottleAI(): BottleAI {
  const index = Math.floor(Math.random() * BOTTLE_AI_POOL.length);
  return BOTTLE_AI_POOL[index];
}

/**
 * 计算回信时间
 * @param isUrged 是否催促
 * @returns 延迟时间（毫秒）
 */
export function calculateReplyDelay(isUrged: boolean): number {
  if (isUrged) {
    // 催促后：15-30分钟
    const minutes = 15 + Math.random() * 15;
    return minutes * 60 * 1000;
  } else {
    // 正常：1-5天
    const days = 1 + Math.random() * 4;
    return days * 24 * 60 * 60 * 1000;
  }
}

/**
 * 寄出信件
 */
export function sendLetter(
  content: string,
  receiverId: string,
  receiverName: string,
  receiverAvatar: string,
  isBottle: boolean,
  senderName: string = '我'
): Letter {
  const now = Date.now();
  const replyDelay = calculateReplyDelay(false);
  
  const letter: Letter = {
    id: `letter_${now}_${Math.random().toString(36).substr(2, 9)}`,
    senderId: 'user',
    senderName: senderName,
    senderAvatar: '✉️',
    
    receiverId,
    receiverName,
    receiverAvatar,
    
    content,
    
    sentAt: now,
    willReplyAt: now + replyDelay,
    
    status: 'sent',
    isBottle,
    hasUrged: false,
    
    stampStyle: getRandomStampStyle(),
    paperStyle: 'white'
  };
  
  // 保存到localStorage
  saveLetterToStorage(letter);
  
  // 设置自动回信定时器
  scheduleAutoReply(letter);
  
  return letter;
}

/**
 * 催促回复
 */
export function urgeLetter(letterId: string): boolean {
  const letters = getLettersFromStorage();
  const letter = letters.find(l => l.id === letterId);
  
  if (!letter || letter.hasUrged || letter.status === 'replied') {
    return false;
  }
  
  // 更新回复时间为15-30分钟后
  const now = Date.now();
  const urgentDelay = calculateReplyDelay(true);
  letter.willReplyAt = now + urgentDelay;
  letter.hasUrged = true;
  
  // 保存
  updateLetterInStorage(letter);
  
  // 重新设置定时器
  scheduleAutoReply(letter);
  
  return true;
}

/**
 * 设置自动回信定时器
 */
function scheduleAutoReply(letter: Letter) {
  if (!letter.willReplyAt || letter.status === 'replied') {
    return;
  }
  
  const delay = letter.willReplyAt - Date.now();
  
  if (delay <= 0) {
    // 已经到时间了，立即回复
    generateReply(letter.id);
  } else {
    // 设置定时器
    setTimeout(() => {
      generateReply(letter.id);
    }, delay);
  }
}

/**
 * 生成AI回信
 */
async function generateReply(letterId: string) {
  const letters = getLettersFromStorage();
  const letter = letters.find(l => l.id === letterId);
  
  if (!letter || letter.status === 'replied') {
    return;
  }
  
  // 这里应该调用AI API生成回信内容
  // 暂时使用模拟内容
  const replyContent = generateMockReply(letter);
  
  letter.replyContent = replyContent;
  letter.repliedAt = Date.now();
  letter.status = 'replied';
  
  updateLetterInStorage(letter);
  
  // 触发通知（如果需要的话）
  console.log(`📬 收到来自 ${letter.receiverName} 的回信！`);
}

/**
 * 生成模拟回信内容
 */
function generateMockReply(letter: Letter): string {
  const templates = [
    `你好呀！很高兴收到你的来信。\n\n${letter.content.slice(0, 30)}... 看到这段话，我深有感触。\n\n我这边的生活也挺有趣的，最近${getRandomActivity()}。希望我们能继续保持联系！\n\n——${letter.receiverName}`,
    
    `读到你的信时，窗外${getRandomWeather()}。\n\n你说的那些事情让我想起了很多往事。${letter.content.slice(0, 20)}... 这句话特别打动我。\n\n有时候慢下来写信，反而能更好地表达内心的想法呢。\n\n期待你的下一封信！\n——${letter.receiverName}`,
    
    `谢谢你的来信！\n\n在${letter.isBottle ? '茫茫大海中' : '众多朋友里'}收到你的信，感觉特别温暖。你提到的${extractKeyword(letter.content)}让我很感兴趣。\n\n我也有类似的经历：${getRandomStory()}\n\n希望这封信能给你带来一些慰藉。\n——${letter.receiverName}`
  ];
  
  const index = Math.floor(Math.random() * templates.length);
  return templates[index];
}

// 辅助函数
function getRandomActivity(): string {
  const activities = [
    '在学习新的技能',
    '看了一本很棒的书',
    '去了一个美丽的地方旅行',
    '认识了一些有趣的朋友',
    '尝试了新的爱好'
  ];
  return activities[Math.floor(Math.random() * activities.length)];
}

function getRandomWeather(): string {
  const weathers = [
    '正下着小雨',
    '阳光明媚',
    '飘着雪花',
    '刮着微风',
    '云层很厚'
  ];
  return weathers[Math.floor(Math.random() * weathers.length)];
}

function extractKeyword(content: string): string {
  // 简单提取前10个字作为关键词
  return content.slice(0, 10) + (content.length > 10 ? '...' : '');
}

function getRandomStory(): string {
  const stories = [
    '我也曾经历过类似的迷茫期，后来慢慢找到了方向',
    '那时候我在海边散步，突然明白了很多事情',
    '有一次我遇到了一个陌生人，他告诉我一个很有意思的道理',
    '我记得那是一个雨天，我独自坐在咖啡馆里思考人生'
  ];
  return stories[Math.floor(Math.random() * stories.length)];
}

function getRandomStampStyle(): Letter['stampStyle'] {
  const styles: Letter['stampStyle'][] = ['default', 'vintage', 'flower', 'sea'];
  return styles[Math.floor(Math.random() * styles.length)];
}

// 📦 localStorage操作

const STORAGE_KEY = 'slow_letters';

function getLettersFromStorage(): Letter[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('读取信件失败:', error);
    return [];
  }
}

function saveLetterToStorage(letter: Letter) {
  const letters = getLettersFromStorage();
  letters.push(letter);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(letters));
}

function updateLetterInStorage(updatedLetter: Letter) {
  const letters = getLettersFromStorage();
  const index = letters.findIndex(l => l.id === updatedLetter.id);
  if (index !== -1) {
    letters[index] = updatedLetter;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(letters));
  }
}

/**
 * 获取所有信件（按时间倒序）
 */
export function getAllLetters(): Letter[] {
  return getLettersFromStorage().sort((a, b) => b.sentAt - a.sentAt);
}

/**
 * 获取单封信件
 */
export function getLetterById(id: string): Letter | undefined {
  return getLettersFromStorage().find(l => l.id === id);
}

/**
 * 初始化定时器（应用启动时调用）
 */
export function initializeLetterTimers() {
  const letters = getLettersFromStorage();
  letters.forEach(letter => {
    if (letter.status !== 'replied' && letter.willReplyAt) {
      scheduleAutoReply(letter);
    }
  });
}
