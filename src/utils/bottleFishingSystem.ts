/**
 * 漂流瓶打捞系统
 * 管理每日打捞次数、生成随机漂流瓶信件
 */

import { BottleLetter, BottleFishingRecord, UserBottleStats } from '../types/bottle';

const FISHING_STORAGE_KEY = 'bottle_fishing_record';
const STATS_STORAGE_KEY = 'bottle_stats';
const MAX_DAILY_FISHING = 2;

// 随机名字素材库 - 形容词+的+名词
const RANDOM_NAME_PARTS = {
  // 形容词
  adjectives: [
    '沉默', '冰冷', '温柔', '孤独', '快乐', '忧郁', '自由', '神秘',
    '迷茫', '清醒', '慵懒', '热情', '冷漠', '敏感', '坚强', '脆弱',
    '勇敢', '胆小', '善良', '倔强', '随性', '认真', '粗心', '细腻',
    '乐观', '悲观', '开朗', '内向', '活泼', '安静', '浪漫', '务实',
    '文艺', '理性', '感性', '淡定', '焦虑', '洒脱', '纠结', '简单'
  ],
  // 名词（动物、植物、物品、自然）
  nouns: [
    // 动物类
    '安康鱼', '北极熊', '企鹅', '海豹', '树懒', '考拉', '浣熊', '猫头鹰',
    '仓鼠', '刺猬', '松鼠', '兔子', '猫咪', '柴犬', '金鱼', '海豚',
    '海星', '水母', '蝴蝶', '蜻蜓', '萤火虫', '知了', '蟋蟀', '瓢虫',
    
    // 植物类
    '向日葵', '薰衣草', '蒲公英', '雏菊', '茉莉', '桂花', '梅花', '樱花',
    '竹子', '枫叶', '银杏', '柳树', '仙人掌', '多肉', '芦荟', '绿萝',
    
    // 物品类
    '咖啡杯', '书签', '钢笔', '橡皮擦', '台灯', '闹钟', '相机', '吉他',
    '明信片', '日记本', '风铃', '沙漏', '地球仪', '望远镜', '棒棒糖', '冰淇淋',
    
    // 自然类
    '月亮', '星星', '云朵', '雨滴', '雪花', '彩虹', '晚霞', '晨曦',
    '海浪', '清风', '春天', '秋天', '溪流', '山谷', '小岛', '灯塔'
  ]
};

// 预设的漂流瓶发送者配置（不包含name，会随机生成）
const BOTTLE_SENDERS = [
  {
    id: 'bottle_sender_1',
    avatar: '🌊',
    age: 25,
    gender: 'female' as const,
    location: '厦门'
  },
  {
    id: 'bottle_sender_2',
    avatar: '🗺️',
    age: 28,
    gender: 'male' as const,
    location: '大理'
  },
  {
    id: 'bottle_sender_3',
    avatar: '🌙',
    age: 23,
    gender: 'female' as const,
    location: '青海'
  },
  {
    id: 'bottle_sender_4',
    avatar: '🏙️',
    age: 30,
    gender: 'male' as const,
    location: '上海'
  },
  {
    id: 'bottle_sender_5',
    avatar: '⛰️',
    age: 27,
    gender: 'other' as const,
    location: '丽江'
  },
  {
    id: 'bottle_sender_6',
    avatar: '☕',
    age: 24,
    gender: 'female' as const,
    location: '成都'
  },
  {
    id: 'bottle_sender_7',
    avatar: '📚',
    age: 29,
    gender: 'male' as const,
    location: '北京'
  },
  {
    id: 'bottle_sender_8',
    avatar: '🐚',
    age: 22,
    gender: 'female' as const,
    location: '三亚'
  }
];

// 漂流瓶话题和内容模板
const BOTTLE_TEMPLATES = [
  {
    topic: '生活感悟',
    mood: 'thoughtful' as const,
    contents: [
      '今天在咖啡馆坐了一下午，看着窗外的行人匆匆而过，突然觉得时间好像停止了。我们每天都在追赶什么，又在错过什么？如果你收到这个瓶子，能告诉我你最近在思考什么吗？',
      '凌晨三点醒来，城市安静得只剩下钟表的滴答声。我在想，在这个世界的某个角落，是不是也有一个失眠的人，和我一样望着天花板发呆。你会失眠吗？',
      '走在秋天的街道上，踩着落叶发出沙沙的声响。每一片叶子都曾在枝头迎风摇曳，现在归于尘土。人生是否也是如此？起起落落，最终平静。',
      '今天读到一句话："生活不止眼前的苟且，还有诗和远方。"但我想，也许眼前的苟且里，也藏着诗意吧。你觉得呢？'
    ]
  },
  {
    topic: '孤独心情',
    mood: 'lonely' as const,
    contents: [
      '一个人在异乡的夜晚，看着万家灯火，却不知道哪一扇窗后有人在等我。如果你也曾感受过这样的孤独，能回一封信给我吗？',
      '今天是我来这座城市的第365天。一年了，我还是一个人吃饭，一个人散步，一个人看电影。有时候真的很想有人能聊聊天，哪怕只是说说今天吃了什么。',
      '深夜的便利店，我是唯一的顾客。店员在打瞌睡，货架上的商品静静陈列。这个世界好像只剩下我一个人。你会在这样的时刻想起谁？',
      '雨天总让人觉得格外孤单。窗外的雨声像是在倾诉什么，可我听不懂。如果你收到这封信，能告诉我你是怎么度过孤独时光的吗？'
    ]
  },
  {
    topic: '开心分享',
    mood: 'happy' as const,
    contents: [
      '今天遇到了一件超级开心的事！早上去买早餐，老板多送了我一个包子，说是看我是老顾客了。小小的善意让整个上午都充满了阳光。你最近有什么开心的事吗？',
      '终于学会了一直想学的吉他和弦！虽然弹得不太好，但是能完整弹完一首歌的感觉太棒了。你有什么一直想做的事情吗？',
      '今天看到超级美的日落！橙红色的天空，云朵像被染了色。拍了好多照片，可惜照片无法完全记录那份美好。真想和人分享这一刻！',
      '刚刚和一只流浪猫交上了朋友！它在我脚边蹭来蹭去，喵喵叫着。给它喂了点吃的，它吃得超级香。小确幸就是这样简单。'
    ]
  },
  {
    topic: '梦想追寻',
    mood: 'excited' as const,
    contents: [
      '终于鼓起勇气辞职了！下个月我要去西藏，一个人，一个背包，去看看梦想中的世界。虽然很多人说我疯了，但我想为自己勇敢一次。你有没有什么想做但还没做的事？',
      '我在准备考研，目标是心仪了很久的学校。虽然每天都很累，但想到可能实现的梦想，就觉得一切都值得。为梦想努力的你，加油！',
      '开始学画画了！虽然画得很糟糕，但每次拿起画笔，就觉得很快乐。也许这就是追梦的意义吧，不在于结果，而在于过程中的那份纯粹。',
      '今天投出了人生第一篇小说稿！不知道会不会被退稿，但迈出这一步的勇气，我为自己骄傲。追梦路上，你走到哪一步了？'
    ]
  },
  {
    topic: '感恩时刻',
    mood: 'grateful' as const,
    contents: [
      '今天突然很想感谢生命中出现过的每一个人。那些帮助过我的，鼓励过我的，甚至伤害过我的，都让我成为了现在的自己。你最想感谢谁？',
      '生病的时候才发现，健康真的是最大的财富。能吃能睡能走路，就已经很幸福了。珍惜当下，感恩拥有。',
      '刚刚和妈妈打了个电话，听到她的声音突然很想哭。父母在，人生尚有来处。感恩他们的爱从未改变。',
      '今天整理房间，翻出了很多旧照片。那些一起笑过哭过的人，虽然有些已经失联，但回忆依然温暖。感谢你们陪我走过那段时光。'
    ]
  },
  {
    topic: '迷茫困惑',
    mood: 'sad' as const,
    contents: [
      '25岁了，还不知道自己想要什么。看着周围的人都有明确的目标，而我却像一叶浮萍，随波逐流。你是怎么找到人生方向的？',
      '又一次被拒绝了。投了几十份简历，都石沉大海。开始怀疑自己是不是真的不够优秀。如果你也经历过这样的时刻，能告诉我该怎么办吗？',
      '感情走到了尽头，可我还是放不下。明知道回不去了，却还在原地徘徊。该怎么和过去的自己说再见？',
      '三十岁的焦虑像潮水一样涌来。没车没房没存款，未来一片迷茫。有时候真的很想知道，生活会变好吗？'
    ]
  }
];

/**
 * 获取今天的日期字符串
 */
function getTodayString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

/**
 * 获取今日打捞记录
 */
export function getTodayFishingRecord(): BottleFishingRecord {
  const today = getTodayString();
  const saved = localStorage.getItem(FISHING_STORAGE_KEY);
  
  if (saved) {
    const record: BottleFishingRecord = JSON.parse(saved);
    // 如果是新的一天，重置记录
    if (record.date !== today) {
      const newRecord: BottleFishingRecord = {
        date: today,
        fishedCount: 0,
        maxCount: MAX_DAILY_FISHING,
        thrownBackBottles: []
      };
      localStorage.setItem(FISHING_STORAGE_KEY, JSON.stringify(newRecord));
      return newRecord;
    }
    return record;
  }
  
  // 首次使用，创建新记录
  const newRecord: BottleFishingRecord = {
    date: today,
    fishedCount: 0,
    maxCount: MAX_DAILY_FISHING,
    thrownBackBottles: []
  };
  localStorage.setItem(FISHING_STORAGE_KEY, JSON.stringify(newRecord));
  return newRecord;
}

/**
 * 保存打捞记录
 */
function saveFishingRecord(record: BottleFishingRecord): void {
  localStorage.setItem(FISHING_STORAGE_KEY, JSON.stringify(record));
}

/**
 * 获取用户统计数据
 */
export function getBottleStats(): UserBottleStats {
  const saved = localStorage.getItem(STATS_STORAGE_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  
  const stats: UserBottleStats = {
    totalFished: 0,
    totalReplied: 0,
    totalThrownBack: 0,
    receivedReplies: 0
  };
  localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  return stats;
}

/**
 * 保存统计数据
 */
function saveBottleStats(stats: UserBottleStats): void {
  localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
}

/**
 * 检查今天是否还能打捞
 */
export function canFishToday(): { can: boolean; remaining: number; reason?: string } {
  const record = getTodayFishingRecord();
  const remaining = record.maxCount - record.fishedCount;
  
  if (remaining > 0) {
    return { can: true, remaining };
  }
  
  return { 
    can: false, 
    remaining: 0, 
    reason: '今天的打捞次数已用完，明天再来吧！' 
  };
}

/**
 * 生成随机名字：形容词 + 的 + 名词
 */
function generateRandomName(): string {
  const adjective = RANDOM_NAME_PARTS.adjectives[Math.floor(Math.random() * RANDOM_NAME_PARTS.adjectives.length)];
  const noun = RANDOM_NAME_PARTS.nouns[Math.floor(Math.random() * RANDOM_NAME_PARTS.nouns.length)];
  return `${adjective}的${noun}`;
}

/**
 * 生成随机漂流瓶
 */
export function generateRandomBottle(): BottleLetter {
  // 随机选择发送者
  const sender = BOTTLE_SENDERS[Math.floor(Math.random() * BOTTLE_SENDERS.length)];
  
  // 随机生成名字
  const senderName = generateRandomName();
  
  // 随机选择话题模板
  const template = BOTTLE_TEMPLATES[Math.floor(Math.random() * BOTTLE_TEMPLATES.length)];
  
  // 随机选择该话题下的内容
  const content = template.contents[Math.floor(Math.random() * template.contents.length)];
  
  const bottle: BottleLetter = {
    id: `bottle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    senderId: sender.id,
    senderName,
    senderAvatar: sender.avatar,
    senderAge: sender.age,
    senderGender: sender.gender,
    senderLocation: sender.location,
    content,
    topic: template.topic,
    mood: template.mood,
    timestamp: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000, // 1-7天前
    language: 'zh'
  };
  
  return bottle;
}

/**
 * 打捞漂流瓶
 */
export function fishBottle(): { success: boolean; bottle?: BottleLetter; error?: string } {
  const check = canFishToday();
  
  if (!check.can) {
    return { success: false, error: check.reason };
  }
  
  // 生成漂流瓶
  const bottle = generateRandomBottle();
  
  // 更新打捞记录
  const record = getTodayFishingRecord();
  record.fishedCount++;
  record.lastFishingTime = Date.now();
  saveFishingRecord(record);
  
  // 更新统计
  const stats = getBottleStats();
  stats.totalFished++;
  saveBottleStats(stats);
  
  return { success: true, bottle };
}

/**
 * 投回海里
 */
export function throwBackBottle(): boolean {
  // 更新统计
  const stats = getBottleStats();
  stats.totalThrownBack++;
  saveBottleStats(stats);
  
  return true;
}

/**
 * 回复漂流瓶（记录统计）
 */
export function replyToBottle(): void {
  const stats = getBottleStats();
  stats.totalReplied++;
  saveBottleStats(stats);
}

/**
 * 获取打捞提示文字
 */
export function getFishingHint(): string {
  const check = canFishToday();
  
  if (check.remaining === 2) {
    return '今天还没有打捞过漂流瓶呢';
  } else if (check.remaining === 1) {
    return '今天还可以打捞1次';
  } else {
    return '今天的打捞次数已用完';
  }
}
