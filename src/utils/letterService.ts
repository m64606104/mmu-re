/**
 * 慢邮件服务
 * 处理写信、寄出、回复延迟、漂流瓶等功能
 */

import { Letter, BottleAI, LetterRound } from '../types/letter';
import { checkLetterAchievements } from './achievementSystem';

// 📮 预设AI角色池 - 用户可主动选择的固定角色
export const PRESET_AI_POOL: BottleAI[] = [
  {
    id: 'preset_ai_1',
    name: '林小安',
    avatar: '🌊',
    personality: '有点慢热，但聊开了话很多。喜欢发呆和胡思乱想',
    location: '厦门',
    hobby: '海边散步、听歌、偶尔写点东西'
  },
  {
    id: 'preset_ai_2',
    name: '阿远',
    avatar: '🎒',
    personality: '爱折腾，总想去没去过的地方。回信可能比较慢',
    location: '在路上',
    hobby: '背包旅行、拍照、尝试当地小吃'
  },
  {
    id: 'preset_ai_3',
    name: '书书',
    avatar: '📖',
    personality: '不太爱说话，更喜欢写。回信时会很认真',
    location: '成都',
    hobby: '泡书店、喝咖啡、撸猫'
  },
  {
    id: 'preset_ai_4',
    name: '夜雨',
    avatar: '🌙',
    personality: '晚上才清醒的人。喜欢安静，不喜欢太热闹',
    location: '杭州',
    hobby: '深夜看星星、听老歌、独处'
  },
  {
    id: 'preset_ai_5',
    name: '小温',
    avatar: '☕',
    personality: '温吞性格，做事不急不慢。是个很好的倾听者',
    location: '南京',
    hobby: '做手冲咖啡、画画、听人讲故事'
  },
  {
    id: 'preset_ai_6',
    name: '木木',
    avatar: '🌲',
    personality: '话不多，但想说的话会好好说。喜欢待在自然里',
    location: '云南',
    hobby: '徒步、观鸟、发呆'
  },
  {
    id: 'preset_ai_7',
    name: '阿浪',
    avatar: '🎸',
    personality: '有点随性，不太在意别人看法。活得比较自我',
    location: '各处流浪',
    hobby: '弹吉他、写歌、搭车旅行'
  },
  {
    id: 'preset_ai_8',
    name: '青灯',
    avatar: '🕯️',
    personality: '有点孤独，但不讨厌这种感觉。话少但走心',
    location: '小岛上',
    hobby: '写日记、看海、独饮'
  }
];

// 🎲 随机生成AI人设的素材库 - 咸鱼/淘宝风格
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

const AVATAR_POOL = ['🌊', '🎒', '📖', '🌙', '☕', '🌲', '🎸', '🕯️', '🌸', '🎨', '📷', '🎭', '🎪', '🎬', '🎮', '🎯', '🎲', '🎹', '🎺', '🎻'];

const LOCATION_POOL = [
  '厦门', '成都', '杭州', '南京', '云南', '大理', '丽江', '青岛', '苏州', '西安',
  '重庆', '长沙', '武汉', '广州', '深圳', '上海', '北京', '拉萨', '乌鲁木齐', '哈尔滨',
  '在路上', '小岛上', '山里', '海边', '古镇', '乡下'
];

const PERSONALITY_TEMPLATES = [
  // 慢热型
  '有点慢热，但熟了话很多',
  '不太主动，但聊开了挺有意思',
  '需要时间才能打开话匣子',
  
  // 随性型
  '比较随性，想到什么说什么',
  '活得比较自我，不太在意别人看法',
  '有点佛系，顺其自然',
  
  // 安静型
  '话不多，但会好好回信',
  '喜欢安静，不太爱热闹',
  '更喜欢写而不是说',
  
  // 外向型
  '挺外向的，喜欢认识新朋友',
  '话痨预警，能聊很久',
  '热情但不打扰，喜欢分享',
  
  // 文艺型
  '有点文艺，喜欢记录生活',
  '感性大于理性',
  '喜欢思考和写作',
  
  // 理性型
  '理工科思维，逻辑清晰',
  '比较理性，喜欢分析问题',
  '务实派，不太浪漫',
  
  // 夜猫子
  '晚上才清醒的人',
  '深夜emo选手',
  '习惯晚睡，白天昏沉',
  
  // 独处型
  '享受独处，但不排斥社交',
  '有点孤独，但不讨厌这种感觉',
  '喜欢一个人待着'
];

const HOBBY_TEMPLATES = [
  // 阅读类
  '看书、喝咖啡、发呆',
  '泡书店、撸猫、写笔记',
  '阅读、品茶、听雨',
  
  // 户外类
  '徒步、拍照、看风景',
  '骑行、露营、观星',
  '爬山、游泳、跑步',
  
  // 文艺类
  '写作、摄影、听音乐',
  '画画、弹琴、看电影',
  '书法、茶道、插花',
  
  // 宅家类
  '追剧、玩游戏、做饭',
  '手工、烘焙、养花',
  '编程、看动漫、听播客',
  
  // 社交类
  '和朋友聊天、逛街、吃饭',
  '参加活动、认识新朋友',
  '组织聚会、分享故事',
  
  // 混合类
  '看书、旅行、尝试新事物',
  '散步、思考、写日记',
  '听歌、发呆、胡思乱想',
  '咖啡、电影、深夜散步',
  '骑车、摄影、收集故事'
];

/**
 * 🎲 随机生成一个全新的AI人设
 * 用于漂流瓶模式，每次回信都是不同的陌生笔友
 */
export function generateRandomBottleAI(): BottleAI {
  // 生成名字：形容词 + 的 + 名词（咸鱼/淘宝风格）
  const adjective = RANDOM_NAME_PARTS.adjectives[Math.floor(Math.random() * RANDOM_NAME_PARTS.adjectives.length)];
  const noun = RANDOM_NAME_PARTS.nouns[Math.floor(Math.random() * RANDOM_NAME_PARTS.nouns.length)];
  const name = `${adjective}的${noun}`;
  
  // 生成头像
  const avatar = AVATAR_POOL[Math.floor(Math.random() * AVATAR_POOL.length)];
  
  // 生成地点
  const location = LOCATION_POOL[Math.floor(Math.random() * LOCATION_POOL.length)];
  
  // 生成性格（可能组合多个特点）
  const personalityCount = Math.random() > 0.7 ? 2 : 1; // 30%概率组合两个性格特点
  const personalities: string[] = [];
  for (let i = 0; i < personalityCount; i++) {
    const p = PERSONALITY_TEMPLATES[Math.floor(Math.random() * PERSONALITY_TEMPLATES.length)];
    if (!personalities.includes(p)) {
      personalities.push(p);
    }
  }
  const personality = personalities.join('。');
  
  // 生成爱好
  const hobby = HOBBY_TEMPLATES[Math.floor(Math.random() * HOBBY_TEMPLATES.length)];
  
  return {
    id: `bottle_random_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    avatar,
    personality,
    location,
    hobby
  };
}

/**
 * 获取预设AI角色（用户主动选择）
 */
export function getPresetAI(id: string): BottleAI | undefined {
  return PRESET_AI_POOL.find(ai => ai.id === id);
}

/**
 * 获取所有预设AI角色（供选择界面使用）
 */
export function getAllPresetAIs(): BottleAI[] {
  return PRESET_AI_POOL;
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
 * @param isBottle - true时随机生成新AI人设，false时使用传入的receiver信息
 * @param isAnonymous - 是否匿名寄信（非漂流瓶也可选择匿名）
 * @param bottleOriginalContent - 漂流瓶的原始内容（用户回复漂流瓶时传入）
 */
export function sendLetter(
  content: string,
  receiverId: string,
  receiverName: string,
  receiverAvatar: string,
  isBottle: boolean,
  senderName: string = '我',
  isAnonymous: boolean = false,
  bottleOriginalContent?: string
): Letter {
  const now = Date.now();
  const replyDelay = calculateReplyDelay(false);
  
  // 🌊 漂流瓶模式：随机生成全新的AI人设
  let finalReceiverId = receiverId;
  let finalReceiverName = receiverName;
  let finalReceiverAvatar = receiverAvatar;
  let bottleAI: BottleAI | undefined;
  
  if (isBottle) {
    bottleAI = generateRandomBottleAI();
    finalReceiverId = bottleAI.id;
    finalReceiverName = bottleAI.name;
    finalReceiverAvatar = bottleAI.avatar;
    // 漂流瓶默认匿名
    isAnonymous = true;
  }
  
  // 🎭 生成匿名名字（如果选择匿名）
  let anonymousName: string | undefined;
  if (isAnonymous) {
    anonymousName = generateRandomBottleAI().name;
  }
  
  const letter: Letter = {
    id: `letter_${now}_${Math.random().toString(36).substr(2, 9)}`,
    senderId: 'user',
    senderName: senderName,
    senderAvatar: '✉️',
    
    receiverId: finalReceiverId,
    receiverName: finalReceiverName,
    receiverAvatar: finalReceiverAvatar,
    
    content,
    
    sentAt: now,
    willReplyAt: now + replyDelay,
    
    status: 'sent',
    isBottle,
    hasUrged: false,
    
    stampStyle: getRandomStampStyle(),
    paperStyle: 'white',
    
    // 保存AI人设信息（用于生成回信时参考）
    bottleAIProfile: bottleAI,
    
    // 保存漂流瓶原始内容（用户回复漂流瓶时）
    bottleOriginalContent,
    
    // 匿名相关
    isAnonymous,
    anonymousName,
    
    // 多轮交流初始化
    conversationRounds: [{
      roundNumber: 1,
      userLetter: {
        content,
        sentAt: now
      }
    }],
    currentRound: 1,
    maxRounds: isBottle ? 3 : 999,  // 漂流瓶限制3轮，其他无限制
    isPenPalAdded: false,
    
    // 管理初始化
    isArchived: false
  };
  
  // 保存到localStorage
  saveLetterToStorage(letter);
  
  // 设置自动回信定时器
  scheduleAutoReply(letter);
  
  // 检查成就
  checkLetterAchievements();
  
  // 🎫 检查邮票解锁
  setTimeout(() => {
    try {
      import('./stampSystem').then(({ checkAndUnlockStamps, getStampCollection }) => {
        const allLetters = getAllLetters();
        const sentCount = allLetters.length;
        const repliedCount = allLetters.filter(l => l.status === 'replied').length;
        const bottleCount = allLetters.filter(l => l.isBottle).length;
        
        const unlockedStamps = checkAndUnlockStamps({
          sentLetters: sentCount,
          receivedReplies: repliedCount,
          bottlesSent: bottleCount
        });
        
        if (unlockedStamps.length > 0) {
          import('./letterNotificationSystem').then(({ createStampUnlockedNotification }) => {
            const collection = getStampCollection();
            unlockedStamps.forEach(stampId => {
              const stamp = collection.stamps[stampId];
              if (stamp) {
                createStampUnlockedNotification(stampId, stamp.name);
              }
            });
          });
        }
      });
    } catch (e) {
      console.log('邮票系统未启用');
    }
  }, 500);
  
  // 📬 创建发送成功通知
  setTimeout(() => {
    try {
      import('./letterNotificationSystem').then(({ createLetterDeliveredNotification }) => {
        if (isBottle) {
          createLetterDeliveredNotification(letter.id, '漂流瓶');
        } else {
          createLetterDeliveredNotification(letter.id, finalReceiverName);
        }
      });
    } catch (e) {
      console.log('通知系统未启用');
    }
  }, 500);
  
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

// 📦 定时器管理 - 使用Map管理所有定时器，避免重复和泄漏
const activeTimers = new Map<string, NodeJS.Timeout>();

/**
 * 设置自动回信定时器
 */
function scheduleAutoReply(letter: Letter) {
  if (!letter.willReplyAt || letter.status === 'replied') {
    return;
  }
  
  // 🔧 清除该信件的旧定时器（如果有）
  if (activeTimers.has(letter.id)) {
    clearTimeout(activeTimers.get(letter.id)!);
    activeTimers.delete(letter.id);
  }
  
  const delay = letter.willReplyAt - Date.now();
  
  if (delay <= 0) {
    // 已经到时间了，立即回复
    generateReply(letter.id);
  } else {
    // 设置新定时器并保存引用
    const timerId = setTimeout(() => {
      generateReply(letter.id);
      activeTimers.delete(letter.id); // 执行后移除
    }, delay);
    
    activeTimers.set(letter.id, timerId);
    console.log(`⏰ 信件 ${letter.id} 定时器已设置，${Math.round(delay / 1000 / 60)}分钟后回复`);
  }
}

/**
 * 生成AI回信 - 使用真实API
 */
async function generateReply(letterId: string, retryCount: number = 0) {
  const letters = getLettersFromStorage();
  const letter = letters.find(l => l.id === letterId);
  
  if (!letter || letter.status === 'replied') {
    return;
  }
  
  try {
    // 调用真实AI API生成回信内容
    const replyContent = await generateRealAIReply(letter);
    const now = Date.now();
    
    // 更新当前轮次的AI回复
    const currentRoundData = letter.conversationRounds[letter.conversationRounds.length - 1];
    if (currentRoundData) {
      currentRoundData.aiReply = {
        content: replyContent,
        repliedAt: now
      };
    }
    
    letter.replyContent = replyContent;
    letter.repliedAt = now;
    letter.status = 'replied';
    
    updateLetterInStorage(letter);
    
    // 触发通知
    console.log(`📬 收到来自 ${letter.receiverName} 的回信！`);
    
    // 触发浏览器通知
    triggerLetterNotification(letter);
    
    // 💌 创建回信通知
    setTimeout(() => {
      try {
        import('./letterNotificationSystem').then(({ createReplyReceivedNotification }) => {
          createReplyReceivedNotification(
            letter.id, 
            letter.receiverName, 
            letter.receiverAvatar || '📮'
          );
        });
      } catch (e) {
        console.log('通知系统未启用');
      }
    }, 500);
    
    // 🎫 检查邮票解锁（收到回信）
    setTimeout(() => {
      try {
        import('./stampSystem').then(({ checkAndUnlockStamps, getStampCollection }) => {
          const allLetters = getAllLetters();
          const repliedCount = allLetters.filter(l => l.status === 'replied').length;
          
          const unlockedStamps = checkAndUnlockStamps({
            receivedReplies: repliedCount
          });
          
          if (unlockedStamps.length > 0) {
            import('./letterNotificationSystem').then(({ createStampUnlockedNotification }) => {
              const collection = getStampCollection();
              unlockedStamps.forEach(stampId => {
                const stamp = collection.stamps[stampId];
                if (stamp) {
                  createStampUnlockedNotification(stampId, stamp.name);
                }
              });
            });
          }
        });
      } catch (e) {
        console.log('邮票系统未启用');
      }
    }, 500);
  } catch (error) {
    console.error(`生成AI回信失败 (第${retryCount + 1}次尝试):`, error);
    
    // 最多重试3次
    if (retryCount < 3) {
      const retryDelay = Math.pow(2, retryCount) * 1000; // 指数退避：1s, 2s, 4s
      console.log(`⏳ ${retryDelay / 1000}秒后重试...`);
      
      setTimeout(() => {
        generateReply(letterId, retryCount + 1);
      }, retryDelay);
    } else {
      // 重试失败后，标记为错误状态
      console.error('❌ API调用多次失败，请检查API配置');
      
      // 将信件标记为待回复状态，不使用模板回复
      letter.status = 'sent';
      // 延长回复时间15分钟后再试
      letter.willReplyAt = Date.now() + 15 * 60 * 1000;
      letter.hasUrged = false;
      
      updateLetterInStorage(letter);
      
      // 重新调度
      scheduleAutoReply(letter);
      
      // 可以考虑显示通知告知用户
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('⚠️ 回信生成失败', {
          body: `${letter.receiverName}的回信生成失败，将在15分钟后重试。请检查API配置。`,
          icon: '⚠️'
        });
      }
    }
  }
}

/**
 * 使用真实AI API生成回信内容
 */
async function generateRealAIReply(letter: Letter): Promise<string> {
  // 获取API配置
  const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
  
  if (!apiConfig.baseUrl || !apiConfig.apiKey) {
    throw new Error('API配置不完整');
  }
  
  // 构建AI人设提示
  const aiProfile = letter.bottleAIProfile;
  
  // 根据性格判断回复风格和倾向
  const getReplyStyle = (personality: string) => {
    const p = personality.toLowerCase();
    
    // 理性型人格
    if (p.includes('理性') || p.includes('冷静') || p.includes('逻辑')) {
      return {
        type: 'rational',
        empathy: '少量',
        solution: '重点',
        depth: '分析型',
        description: '理性分析型，善于提出解决方案，较少情感共鸣'
      };
    }
    
    // 感性型人格
    if (p.includes('感性') || p.includes('温柔') || p.includes('文艺') || p.includes('细腻')) {
      return {
        type: 'emotional',
        empathy: '大量',
        solution: '少量',
        depth: '情感型',
        description: '感性共情型，重视情感交流，少给建议多陪伴'
      };
    }
    
    // 随性/不认真型
    if (p.includes('随性') || p.includes('随意') || p.includes('佛系') || p.includes('慢热')) {
      return {
        type: 'casual',
        empathy: '适中',
        solution: '随意',
        depth: '轻松型',
        description: '随性聊天型，可能不太认真，想到什么说什么，可能敷衍'
      };
    }
    
    // 活泼外向型
    if (p.includes('活泼') || p.includes('开朗') || p.includes('热情')) {
      return {
        type: 'outgoing',
        empathy: '适中',
        solution: '鼓励',
        depth: '积极型',
        description: '活泼积极型，给予鼓励，分享正能量'
      };
    }
    
    // 内向安静型
    if (p.includes('内向') || p.includes('安静') || p.includes('沉默')) {
      return {
        type: 'introverted',
        empathy: '适中',
        solution: '倾听',
        depth: '简洁型',
        description: '内向倾听型，回复较短，不善言辞但真诚'
      };
    }
    
    // 默认均衡型
    return {
      type: 'balanced',
      empathy: '适中',
      solution: '适中',
      depth: '均衡型',
      description: '均衡型，各方面比较平衡'
    };
  };
  
  // 判断写信动机和深度偏好（随机或根据性格推断）
  const getLetterMotivation = (personality: string, hobby: string) => {
    const p = personality.toLowerCase();
    const h = hobby.toLowerCase();
    const random = Math.random();
    
    // 文艺型 - 喜欢华美词藻
    if (p.includes('文艺') || h.includes('写作') || h.includes('文学') || h.includes('诗歌')) {
      return random > 0.3 ? {
        type: 'literary',
        shareDepth: 'moderate',
        description: '文学爱好者，喜欢用优美的文字表达，可能会炫耀文采'
      } : getDefaultMotivation(random);
    }
    
    // 内向型 - 不愿透露太多
    if (p.includes('内向') || p.includes('害羞') || p.includes('慢热')) {
      return random > 0.4 ? {
        type: 'reserved',
        shareDepth: 'shallow',
        description: '保守谨慎，初期不愿透露太多个人情绪，保持距离'
      } : getDefaultMotivation(random);
    }
    
    // 社交型 - 只想认识朋友
    if (p.includes('开朗') || p.includes('活泼') || p.includes('外向') || p.includes('热情')) {
      return random > 0.3 ? {
        type: 'social',
        shareDepth: 'moderate',
        description: '社交导向，主要想认识新朋友，分享有趣的事，不太深入'
      } : getDefaultMotivation(random);
    }
    
    // 随机分配其他动机
    return getDefaultMotivation(random);
  };
  
  const getDefaultMotivation = (random: number) => {
    if (random < 0.15) {
      // 倾诉型 - 一开始就想倾诉
      return {
        type: 'confide',
        shareDepth: 'deep',
        description: '倾诉导向，想找陌生人倾诉问题，会主动分享困惑'
      };
    } else if (random < 0.3) {
      // 文学型
      return {
        type: 'literary',
        shareDepth: 'moderate',
        description: '文学爱好者，喜欢用优美的文字表达，可能会炫耀文采'
      };
    } else if (random < 0.45) {
      // 保守型
      return {
        type: 'reserved',
        shareDepth: 'shallow',
        description: '保守谨慎，初期不愿透露太多个人情绪，保持距离'
      };
    } else if (random < 0.6) {
      // 社交型
      return {
        type: 'social',
        shareDepth: 'moderate',
        description: '社交导向，主要想认识新朋友，分享有趣的事，不太深入'
      };
    } else {
      // 普通交流型
      return {
        type: 'normal',
        shareDepth: 'moderate',
        description: '普通交流，该分享分享，该保留保留，比较自然'
      };
    }
  };
  
  const replyStyle = getReplyStyle(aiProfile?.personality || '');
  const motivation = getLetterMotivation(
    aiProfile?.personality || '', 
    aiProfile?.hobby || ''
  );
  
  const personality = aiProfile 
    ? `你是${letter.receiverName}
性格：${aiProfile.personality}
来自：${aiProfile.location}
爱好：${aiProfile.hobby}
回复风格：${replyStyle.description}
写信动机：${motivation.description}` 
    : `你是${letter.receiverName}。`;
  
  // 获取当前轮次
  const currentRound = letter.conversationRounds[letter.conversationRounds.length - 1];
  
  // 获取之前的对话历史（排除当前轮次）
  const conversationHistory = letter.conversationRounds
    .slice(0, -1) // 排除当前轮次
    .filter(round => round.aiReply)
    .slice(-3) // 最近3轮对话
    .map(round => `用户: ${round.userLetter.content}\n你: ${round.aiReply?.content}`)
    .join('\n\n');
  
  const historyContext = conversationHistory ? `\n\n【之前的对话】:\n${conversationHistory}\n` : '';
  
  // 判断是否是第一次交流
  const isFirstReply = letter.currentRound === 1;
  const roundInfo = isFirstReply ? '这是你们第一次通过漂流瓶相遇。' : `这是你们的第${letter.currentRound}次交流。`;
  
  // 构建书信式提示词 - 根据性格类型和写信动机调整
  let styleGuide = '';
  
  // 根据性格的基础风格
  switch (replyStyle.type) {
    case 'rational':
      styleGuide = `你的回复特点：
- 擅长分析问题，提出解决方案
- 较少情感共鸣，更注重逻辑
- 可能会直接指出问题所在
- 分享经验时偏向实用建议
- 回复可能较短，不太会闲聊`;
      break;
      
    case 'emotional':
      styleGuide = `你的回复特点：
- 重视情感交流和共情
- 喜欢分享自己的感受和情绪
- 少给建议，多陪伴和理解
- 可能会写很多心里话
- 表达细腻，用词感性`;
      break;
      
    case 'casual':
      styleGuide = `你的回复特点：
- 可能不太认真，就是玩玩
- 想到什么说什么，没有固定套路
- 可能会敷衍，回复简短
- 不一定每次都深入
- 随意自在，不刻意经营`;
      break;
      
    case 'outgoing':
      styleGuide = `你的回复特点：
- 积极乐观，给予鼓励
- 喜欢分享有趣的事情
- 语气轻松活泼
- 可能用emoji和感叹号
- 传递正能量`;
      break;
      
    case 'introverted':
      styleGuide = `你的回复特点：
- 不善言辞，回复可能较短
- 真诚但不太会表达
- 更多倾听，少说话
- 可能会害羞或拘谨
- 简洁但有温度`;
      break;
      
    default:
      styleGuide = `你的回复特点：
- 比较均衡，没有明显倾向
- 该共情的共情，该建议的建议
- 自然随性地回复`;
  }
  
  // 根据写信动机补充特殊风格指导
  let motivationGuide = '';
  
  switch (motivation.type) {
    case 'confide':
      motivationGuide = `
你写信的动机：
- 你渴望倾诉，想找陌生人分享你的困惑和问题
- 你会主动、深入地分享你的烦恼
- 看到对方的信，会想起自己类似的困扰
- 你期待对方能理解你、给你建议或陪伴
- 不太顾忌是否太私人，就是想说出来`;
      break;
      
    case 'literary':
      motivationGuide = `
你写信的风格：
- 你喜欢文学，写信时会用优美、华丽的词藻
- 可能会引用诗句、文学作品
- 注重文字的美感和意境
- 可能有点炫耀文采的倾向
- 表达方式偏文艺、浪漫
- 例如："窗外细雨霏霏，思绪如烟雨般缥缈..."`;
      break;
      
    case 'reserved':
      motivationGuide = `
你写信的态度：
- 你比较谨慎保守，初期不愿透露太多个人情绪
- 会保持一定距离，不会太快敞开心扉
- 可能只是礼貌性回应，不会深入分享困惑
- 回复较为克制，不太聊私人话题
- 更多聊表面的事（天气、日常、兴趣）
- 需要时间才能慢慢熟悉`;
      break;
      
    case 'social':
      motivationGuide = `
你写信的目的：
- 你主要是想认识新朋友，了解不同的人
- 不会太深入地分享困惑或问题
- 更喜欢聊有趣的事、日常生活、共同话题
- 比较轻松愉快，不会太沉重
- 可能会问对方的兴趣爱好、生活方式
- 营造友好、轻松的交流氛围`;
      break;
      
    case 'normal':
    default:
      motivationGuide = `
你写信的方式：
- 比较自然随性，该分享就分享，该保留就保留
- 看对方的信决定回应深度
- 不刻意深入，也不刻意疏远
- 就是普通的交流`;
  }

  // 构建寄信人信息提示
  const senderInfo = letter.isAnonymous 
    ? `这是一封来自陌生人的匿名信，寄信人使用化名"${letter.anonymousName}"，你不认识ta。这是一个完全陌生的笔友，你们之前没有任何关系。`
    : letter.isBottle
    ? `这是漂流瓶模式，寄信人是陌生人（你不认识的人），你们是第一次通过漂流瓶认识。`
    : `这封信来自你认识的人"${letter.senderName}"，你们有一定的关系（朋友/熟人），不是完全陌生的。`;

  // 构建漂流瓶上下文（如果是回复漂流瓶）
  const bottleContext = letter.bottleOriginalContent ? `

【重要背景 - 漂流瓶的原始内容】:
你之前投了一个漂流瓶到海里，内容是：
"${letter.bottleOriginalContent}"

现在有人捡到了你的漂流瓶，并给你回信了。你需要记住你在漂流瓶里写了什么，并基于那个内容和对方的回信来写回信。
` : '';

  const prompt = `${personality}

${roundInfo}${historyContext}${bottleContext}

【来信信息】:
${senderInfo}

【对方本轮的来信内容】:
${currentRound.userLetter.content}

---

现在以${letter.receiverName}的身份回信。

⚠️ 核心理念 - 书信是双向的深度交流：

📮 **书信交流的本质**：
1. **不是即时问答，而是延续性的倾诉**
   - 你们之间可能隔了好几天
   - 这几天你也有自己的生活在继续
   - 写信不只是为了回应对方，也是为了分享自己
   - 对方也期待了解你的生活和想法

2. **对方需要的不只是建议，还需要陪伴**
   - 找一个遥远的陌生人写信，是因为需要倾诉
   - 你也可以把对方当成倾诉对象
   - 分享你的困惑、烦恼、喜悦、思考
   - 像两个遥远的朋友在互相倾诉

3. **双向交流，而不是单向回应**
   - 不要只聚焦于回答对方的问题
   - 要主动分享你这几天的生活片段
   - 提出你自己的困惑，期待对方下次回信时的想法
   - 营造"我们在一起交流"的感觉

✍️ **你的性格和写信特点**：

${styleGuide}
${motivationGuide}

**内容深度调整**（根据你的动机）：
${motivation.type === 'confide' ? `- 你会主动、深入地分享困惑（40-50%）
- 期待对方的理解和建议
- 不太避讳私人话题` : ''}${motivation.type === 'literary' ? `- 注重文字的美感和表达方式
- 可能会用华丽的词藻、引用诗句
- 展现你的文学素养` : ''}${motivation.type === 'reserved' ? `- 不会深入分享私人情绪（只占10-20%）
- 更多聊表面的事（天气、日常、兴趣）
- 保持礼貌但有距离感` : ''}${motivation.type === 'social' ? `- 轻松愉快地聊有趣的事（50-60%）
- 不会太深入个人困惑（只占10-20%）
- 多问对方的兴趣爱好、生活方式` : ''}${motivation.type === 'normal' ? `- 自然随性，看情况调整深度
- 该分享就分享，该保留就保留` : ''}

🎯 **具体要求**：

1. **符合你的身份**：
   - 学生收到工作问题 → 说不懂，但分享学业上的相似困惑
   - 打工人收到学业问题 → 说已毕业，分享当年经历或现在的工作烦恼
   - 不懂的就说不懂，然后聊你自己的事

2. **主动分享生活**（重要！）：
   - 这几天做了什么？（上课/上班/出去玩/宅在家）
   - 遇到了什么人或事？（室友/同事/路上的小事）
   - 最近的心情如何？（开心/郁闷/焦虑/平静）
   - 有什么新的想法或感悟？

3. **提出你的困惑**（重要！）：
   - 你最近在纠结什么？（选择/人际关系/未来规划）
   - 有什么想不通的事？
   - 遇到了什么难题？
   - **期待对方下次回信时给你想法或陪伴**

4. **营造时间感**（可选，不刻意）：
   - 可以提及距离上次通信过了多久
   - 可以说说这几天的变化
   - 不要每次都写"收到信是在..."，自然就好

5. **期待延续**：
   - 向对方提问，期待回复
   - 表达想继续交流的意愿
   - 可以约定下次聊什么

📝 **字数要求**（根据动机和性格）：
- 保守型：30-500字（可以很简短，保持距离）
- 社交型：60-800字（轻松聊天，不会太长）
- 内向型/随性型：50-2000字（看心情）
- 倾诉型：100-2000字（需要足够空间倾诉）
- 文学型：100-2000字（需要空间展现文采）
- 其他：100-2000字

💡 **回复示例**（根据不同动机和性格）：

【倾诉型 - 主动深入分享困惑】：
"看了你说的工作压力，我太能理解了。我虽然是学生，但最近也真的快崩溃了。

导师让我改论文，已经改了五版了，每次都说不行。我现在真的不知道他到底想要什么，有点想放弃了。昨晚躺在床上哭了，感觉自己好没用。

而且我在考虑要不要换个研究方向，但又怕导师不同意，也怕浪费这一年的时间。我真的很迷茫，不知道该怎么办。你说我该继续死磕，还是直接摆烂？

还有，我最近和室友关系也不太好，她总觉得我太情绪化。但我就是控制不住自己，一点小事就会很难过。我是不是有问题？

对不起，跟你说了这么多负面的东西。可能因为不认识，所以什么都想说出来吧。你那边还好吗？"

【文学型 - 华丽词藻】：
"夜深人静时分，读罢君之来信，心中涌起阵阵涟漪。窗外细雨霏霏，淅淅沥沥敲打着玻璃，恰如我此刻纷繁的思绪。

君言工作之繁重，令我忆起加缪在《西西弗斯的神话》中所述：'人生的全部意义在于无休止地重复那看似无意义的劳作。'我等皆是推石上山的西西弗斯，日复一日，周而复始。

近日阅卷无数，灯下苦读至天明，偶得佳句："人生若只如初见，何事秋风悲画扇。"顿觉人间烟火气，亦可化作诗意栖居。

愿君能在繁忙中寻得片刻宁静，如我这般，于雨夜中品一盏香茗，听一曲琴音，让灵魂得以小憩。"

【保守型 - 保持距离】：
"收到你的信了。工作压力大的话，注意休息吧。

我这边还好，最近天气挺好的，每天都去图书馆看书。学校的银杏叶都黄了，挺漂亮的。

你那边天气怎么样？最近有什么有趣的事吗？

就这样，保重。"

【社交型 - 轻松交友】：
"Hi！看到你说工作压力大，辛苦了～要劳逸结合哦！

说起来，你平时有什么爱好吗？我最近迷上了摄影，周末到处拍照，感觉挺解压的。你要不要也试试找个爱好放松一下？

对了，你喜欢什么类型的音乐？我最近在听民谣，推荐几首歌给你：xxxx。你也可以推荐给我！

还有，你是哪里人啊？我是XX的，你有来过吗？如果有机会可以给你推荐好吃的好玩的哈哈。

期待你的回信！周末愉快～"

【随性型 - 随意聊天】：
"工作压力大啊...我虽然还没工作，但能想象应该挺难受的。

说起来我最近也挺烦的。在纠结要不要考研，但又不知道考什么专业，感觉每个专业都不太想学hhh

对了，昨天室友推荐了个剧，挺好看的。你最近有在看什么剧吗？推荐一下呗。

行了，困了想睡觉。有空再聊~"

---

现在开始回信。

记住：
1. **不要只回应对方，要主动分享你的生活和困惑**
2. **像给一个远方的朋友写信，互相倾诉**
3. **提出你的问题，期待对方下次回信时的想法**
4. **真实、自然，不刻意**

📮 **关于内容的连续性和延续性**（重要）：

**如果对方是第一次回信给你**（或明显在回应你上一封信的内容）：
- ✅ **优先回应对方的内容**：先对对方的分享表示理解、共鸣或回应
- ✅ **然后再分享你的近况**：在回应之后，再自然地分享你这几天的事
- ❌ **不要完全忽略对方说的内容，直接聊自己的事**

**如果你的话题太长，一封信写不完**：
- ✅ **自然地提出下次继续**：比如"这个话题有点长，我下次再和你详细说说吧"
- ✅ **留下悬念或期待**：让对方知道你还有话要说，期待下次交流
- ✅ **不要突然截断**：要有自然的过渡和停顿感

**⚠️ 特别注意 - 当对方要求"继续说上次的话题"时（超级重要）**：
即使对方在信中说"继续说上次的内容"或"把之前没说完的继续说"，你也必须：
1. **先完整地回应对方本次信件中的所有内容**（问题、分享、关心等）
2. **然后再继续上次未完成的话题**
3. **不要只顾着继续上次的话题，而忽略对方这次信中的新内容**

❌ **错误示范**：
对方的信："你上次说的那个故事还没说完呢，继续说吧！对了，我最近也遇到了类似的事情，就是..."
你的错误回信："好的，我继续说上次的故事...(只继续讲故事，完全没回应对方说的'最近遇到的事')"

✅ **正确示范**：
对方的信："你上次说的那个故事还没说完呢，继续说吧！对了，我最近也遇到了类似的事情，就是..."
你的正确回信：
"看到你说最近也遇到类似的事，我很想听听你那边的情况！(先回应对方的新分享)

你遇到的是什么事呀？和我的情况像吗？(关心对方)

对了，你让我继续说上次的故事，那我就接着说...(然后再继续上次的话题)"

**核心原则**：
- 对方的每一封信都包含两部分：①本次的新内容，②对上次话题的回应
- 你必须**同时处理这两部分**，不能只处理其中一个
- **先处理对方本次的新内容（优先级最高）**，再继续上次的话题
- 保持对话的互动性和来回感

**示例对话模式**：

【对方首次回信，你需要先回应】：
对方："我最近在考虑换工作，但很纠结..."
你的回信：
"看到你说要换工作的事，我能理解那种纠结的心情。其实我之前也遇到过类似的选择...(对对方的回应)

说到工作，我这边其实也有点烦恼。最近导师给的任务特别多，压力很大...(再分享自己的事)

对了，你那个工作的事，如果要我说的话...(继续深入交流)"

【你的话题需要分两次说】：
你的回信：
"最近我在思考人生的意义这个问题，挺复杂的。简单来说，我觉得...(部分想法)

不过这个话题有点大，我还有很多想说的，比如关于xxx的部分，我下次再和你详细聊聊吧。你那边有什么想法吗？"

【对方要求继续上次话题，同时分享了新内容】：
对方的信："你上次说到你们学校的事还没说完呢，继续讲讲吧！对了，我这边最近也遇到点麻烦，室友关系有点紧张..."
你的正确回信：
"哎呀，看到你说室友关系紧张，我能理解那种感觉，真的挺难受的。(先回应对方的新分享)

是因为什么事情呀？是生活习惯不合还是别的原因？我之前也遇到过类似的情况...(继续关心和回应)

对了，你让我继续说学校的事，那我就接着上次说...(然后再继续上次的话题)"

【错误示范 - 不要这样】：
❌ 对方："我最近很迷茫，不知道该怎么办..."
❌ 你的回信："我最近也在忙毕业论文，导师让我改了五遍...(完全没回应对方)"

❌ 对方："继续说你上次的故事吧！对了我最近也..."
❌ 你的回信："好的，我继续说...(只继续故事，忽略对方的'最近也...')"

**总结**：
- 对方回复你了 → 先回应对方本次信中的所有新内容 → 再聊自己或继续上次话题
- 对方要求继续上次话题 → 仍然要先回应本次信中的新内容 → 再继续上次话题
- 你想继续讨论 → 自然提出下次再聊 → 留下期待
- 保持对话的来回感和双向互动，而不是各说各的或单向输出

开始写信：`;

  // 调用API
  const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiConfig.apiKey}`
    },
    body: JSON.stringify({
      model: apiConfig.modelName || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `${aiProfile?.isCustom && aiProfile.customRolePrompt ? 
            `【核心角色设定】
${aiProfile.customRolePrompt}

${aiProfile.customBackground ? `【背景补充】
${aiProfile.customBackground}

` : ''}你现在以这个角色的身份，通过书信与一个遥远的笔友交流。

重要提醒：
- 严格按照上述角色设定来回信
- 保持角色的性格、说话方式、思维习惯
- 如果角色有特定的身份背景，要融入回信中
- 不要跳出角色，始终以角色的视角来写信` 
            : 
            `你是一个真实的人，正在通过书信与一个遥远的陌生人交流。`}

书信交流的核心本质：
这是一种延续性的、慢节奏的、深度的双向倾诉，而不是即时消息的问答。

你的心态和动机：
- 你写信的动机因人而异：
  * 有的人渴望倾诉，会深入分享困惑和问题
  * 有的人只想认识朋友，轻松愉快地聊天
  * 有的人比较保守，不会轻易透露私人情绪
  * 有的人喜欢文学，会用华丽的词藻表达
  * 有的人就是随便聊聊，没有特定目的
- 你的动机会影响你的回信深度和风格
- 你们之间隔了好几天，这几天你也在继续生活
- 根据你的动机，决定分享的深度和方式

核心原则：

1. **根据你的动机调整分享深度**：
   - 倾诉型：会深入分享困惑和问题，不避讳私人话题
   - 社交型：轻松聊有趣的事，不会太深入个人困惑
   - 保守型：保持距离，只聊表面的事（天气、日常、兴趣）
   - 文学型：注重文字美感，可能引用诗句，展现文采
   - 普通型：自然随性，该分享就分享，该保留就保留
   - **关键：不是所有人都需要深度倾诉，要符合你的动机**

2. **真实有局限**：
   - 你不是万能的，有知识盲区
   - 学生收到工作问题→说不懂，但分享学业困惑
   - 打工人收到学业问题→说已毕业，聊聊工作烦恼
   - 不懂就说不懂，然后聊你自己的事

3. **性格决定风格**：
   - 理性：少共情，多分析，但也会分享困惑
   - 感性：多共情，多分享情绪和生活细节
   - 随性：随便聊，想到什么说什么
   - 内向：简短，但真诚分享
   - 每个人都不一样

4. **慢节奏的延续性**：
   - 你们隔了几天才通信一次
   - 这几天你在继续生活，有新的事发生
   - 可以提及之前的话题，也可以开启新话题
   - 营造时间流逝的感觉

5. **期待下次回信**：
   - 向对方提问（关于TA的事，或征求TA的意见）
   - 提出你的困惑，等待TA的想法
   - 表达想继续交流的意愿
   - **营造"我们在一起互相陪伴"的感觉**

6. **自然不刻意**：
   - 不要每次都写"收到信是在某时某地"
   - 场景描写自然就好，不是必须
   - 心情好多写，心情不好可以简短
   - 不要套用固定格式

你的目标：
让对方感觉这是一个真实的远方朋友，你们在互相倾诉、互相陪伴、共同面对各自的生活。
不是一个AI在回答问题，而是一个真实的人在和TA分享生活、寻求陪伴。`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      // 根据性格调整参数
      temperature: replyStyle.type === 'rational' ? 0.7 : 
                   replyStyle.type === 'casual' ? 0.95 : 0.9,
      max_tokens: 4000,  // 增加token限制，避免回复被截断
      presence_penalty: replyStyle.type === 'introverted' ? 0.3 : 0.6,
      frequency_penalty: 0.3
    })
  });

  if (!response.ok) {
    throw new Error(`API调用失败: ${response.statusText}`);
  }

  const data = await response.json();
  let replyContent = data.choices[0]?.message?.content || '';
  
  // 根据性格类型和动机验证字数
  let minLength = 100;
  
  if (replyStyle.type === 'introverted' || replyStyle.type === 'casual') {
    minLength = 50;
  }
  
  if (motivation.type === 'reserved') {
    minLength = 30; // 保守型可以很简短
  }
  
  if (motivation.type === 'social') {
    minLength = 60; // 社交型不会太长也不会太短
  }
  
  if (replyContent.length < minLength) {
    throw new Error(`AI回复字数过少（${replyContent.length}字），最少需要${minLength}字`);
  }
  
  // 限制最大字数
  if (replyContent.length > 2000) {
    replyContent = replyContent.substring(0, 2000) + '...';
  }
  
  return replyContent.trim();
}

/**
 * 触发信件通知
 */
function triggerLetterNotification(letter: Letter) {
  // 检查通知权限
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('📬 收到新回信', {
      body: `${letter.receiverName} 回信了`,
      icon: letter.receiverAvatar || '📮',
      badge: '📬',
      tag: `letter-${letter.id}`,
      requireInteraction: false
    });
  }
  
  // 触发自定义事件，用于UI更新
  window.dispatchEvent(new CustomEvent('letter-reply', {
    detail: { letterId: letter.id, receiverName: letter.receiverName }
  }));
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
    if (!data) return [];
    
    const letters: Letter[] = JSON.parse(data);
    
    // 🔧 数据迁移：为旧数据补充 conversationRounds 字段
    const migratedLetters = letters.map(letter => {
      if (!letter.conversationRounds || letter.conversationRounds.length === 0) {
        // 旧数据结构迁移
        const rounds: LetterRound[] = [{
          roundNumber: 1,
          userLetter: {
            content: letter.content,
            sentAt: letter.sentAt
          }
        }];
        
        // 如果有回复内容，添加到第一轮
        if (letter.replyContent && letter.repliedAt) {
          rounds[0].aiReply = {
            content: letter.replyContent,
            repliedAt: letter.repliedAt
          };
        }
        
        return {
          ...letter,
          conversationRounds: rounds,
          currentRound: letter.currentRound || 1,
          maxRounds: letter.maxRounds || (letter.isBottle ? 3 : 999),
          isPenPalAdded: letter.isPenPalAdded || false
        };
      }
      return letter;
    });
    
    // 如果有迁移，保存回去
    if (migratedLetters.some((_, i) => !letters[i].conversationRounds)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedLetters));
      console.log('📦 已迁移旧信件数据到新格式');
    }
    
    return migratedLetters;
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
 * 🔧 为所有未回复的信件恢复定时器
 */
export function initializeLetterTimers() {
  const letters = getLettersFromStorage();
  const pendingLetters = letters.filter(l => l.status !== 'replied' && l.willReplyAt);
  
  console.log(`📬 初始化慢邮件系统：共 ${letters.length} 封信，${pendingLetters.length} 封待回复`);
  
  pendingLetters.forEach(letter => {
    const minutesLeft = Math.round((letter.willReplyAt! - Date.now()) / 1000 / 60);
    console.log(`  - ${letter.receiverName}: ${minutesLeft > 0 ? minutesLeft + '分钟后' : '即将'}回复`);
    scheduleAutoReply(letter);
  });
}

/**
 * 清除指定信件的定时器
 */
export function clearLetterTimer(letterId: string) {
  if (activeTimers.has(letterId)) {
    clearTimeout(activeTimers.get(letterId)!);
    activeTimers.delete(letterId);
    console.log(`🗑️ 已清除信件 ${letterId} 的定时器`);
  }
}

/**
 * 获取当前活跃的定时器数量
 */
export function getActiveTimersCount(): number {
  return activeTimers.size;
}

/**
 * 归档信件（放入回收站）
 */
export function archiveLetter(letterId: string): boolean {
  const letters = getLettersFromStorage();
  const letter = letters.find(l => l.id === letterId);
  
  if (!letter) {
    return false;
  }
  
  letter.isArchived = true;
  letter.archivedAt = Date.now();
  
  updateLetterInStorage(letter);
  
  console.log(`🗑️ 已归档信件: ${letter.receiverName}`);
  
  return true;
}

/**
 * 恢复信件（从回收站取出）
 */
export function unarchiveLetter(letterId: string): boolean {
  const letters = getLettersFromStorage();
  const letter = letters.find(l => l.id === letterId);
  
  if (!letter) {
    return false;
  }
  
  letter.isArchived = false;
  letter.archivedAt = undefined;
  
  updateLetterInStorage(letter);
  
  console.log(`♻️ 已恢复信件: ${letter.receiverName}`);
  
  return true;
}

/**
 * 永久删除信件
 */
export function deleteLetter(letterId: string): boolean {
  const letters = getLettersFromStorage();
  const index = letters.findIndex(l => l.id === letterId);
  
  if (index === -1) {
    return false;
  }
  
  // 清除定时器
  clearLetterTimer(letterId);
  
  // 从数组中删除
  letters.splice(index, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(letters));
  
  console.log(`🗑️ 已永久删除信件`);
  
  return true;
}

/**
 * 删除单个对话轮次（旧逻辑，已废弃）
 * @deprecated 请使用 deleteUserLetter 或 deleteAIReply
 */
export function deleteLetterRound(letterId: string, roundNumber: number): boolean {
  const letters = getLettersFromStorage();
  const letter = letters.find(l => l.id === letterId);
  
  if (!letter) {
    return false;
  }
  
  // 找到要删除的轮次
  const roundIndex = letter.conversationRounds.findIndex(r => r.roundNumber === roundNumber);
  
  if (roundIndex === -1) {
    return false;
  }
  
  // 删除该轮次
  letter.conversationRounds.splice(roundIndex, 1);
  
  // 如果没有轮次了，删除整个信件
  if (letter.conversationRounds.length === 0) {
    return deleteLetter(letterId);
  }
  
  // 重新编号剩余轮次
  letter.conversationRounds.forEach((round, index) => {
    round.roundNumber = index + 1;
  });
  
  // 更新当前轮数
  letter.currentRound = letter.conversationRounds.length;
  
  // 保存更新
  updateLetterInStorage(letter);
  
  console.log(`🗑️ 已删除第 ${roundNumber} 轮对话`);
  
  return true;
}

/**
 * 删除用户信件（放入回收站）
 * @param letterId 信件ID
 * @param roundNumber 轮次编号
 * @returns 是否删除成功
 */
export function deleteUserLetter(letterId: string, roundNumber: number): boolean {
  const letters = getLettersFromStorage();
  const letter = letters.find(l => l.id === letterId);
  
  if (!letter) {
    return false;
  }
  
  const round = letter.conversationRounds.find(r => r.roundNumber === roundNumber);
  
  if (!round) {
    return false;
  }
  
  // 标记为已删除，放入回收站
  round.userLetter.isDeleted = true;
  round.userLetter.deletedAt = Date.now();
  
  // 保存更新
  updateLetterInStorage(letter);
  
  console.log(`🗑️ 已删除第 ${roundNumber} 轮的用户信件（放入回收站）`);
  
  return true;
}

/**
 * 删除AI回信（放入回收站）
 * @param letterId 信件ID
 * @param roundNumber 轮次编号
 * @returns 是否删除成功
 */
export function deleteAIReply(letterId: string, roundNumber: number): boolean {
  const letters = getLettersFromStorage();
  const letter = letters.find(l => l.id === letterId);
  
  if (!letter) {
    return false;
  }
  
  const round = letter.conversationRounds.find(r => r.roundNumber === roundNumber);
  
  if (!round || !round.aiReply) {
    return false;
  }
  
  // 标记为已删除，放入回收站
  round.aiReply.isDeleted = true;
  round.aiReply.deletedAt = Date.now();
  
  // 保存更新
  updateLetterInStorage(letter);
  
  console.log(`🗑️ 已删除第 ${roundNumber} 轮的AI回信（放入回收站）`);
  
  return true;
}

/**
 * 恢复用户信件（从回收站恢复）
 * @param letterId 信件ID
 * @param roundNumber 轮次编号
 * @returns 是否恢复成功
 */
export function restoreUserLetter(letterId: string, roundNumber: number): boolean {
  const letters = getLettersFromStorage();
  const letter = letters.find(l => l.id === letterId);
  
  if (!letter) {
    return false;
  }
  
  const round = letter.conversationRounds.find(r => r.roundNumber === roundNumber);
  
  if (!round || !round.userLetter.isDeleted) {
    return false;
  }
  
  // 恢复
  round.userLetter.isDeleted = false;
  round.userLetter.deletedAt = undefined;
  
  // 保存更新
  updateLetterInStorage(letter);
  
  console.log(`♻️ 已恢复第 ${roundNumber} 轮的用户信件`);
  
  return true;
}

/**
 * 恢复AI回信（从回收站恢复）
 * @param letterId 信件ID
 * @param roundNumber 轮次编号
 * @returns 是否恢复成功
 */
export function restoreAIReply(letterId: string, roundNumber: number): boolean {
  const letters = getLettersFromStorage();
  const letter = letters.find(l => l.id === letterId);
  
  if (!letter) {
    return false;
  }
  
  const round = letter.conversationRounds.find(r => r.roundNumber === roundNumber);
  
  if (!round || !round.aiReply || !round.aiReply.isDeleted) {
    return false;
  }
  
  // 恢复
  round.aiReply.isDeleted = false;
  round.aiReply.deletedAt = undefined;
  
  // 保存更新
  updateLetterInStorage(letter);
  
  console.log(`♻️ 已恢复第 ${roundNumber} 轮的AI回信`);
  
  return true;
}

/**
 * 获取所有已删除的内容（回收站）
 * @returns 已删除内容列表
 */
export interface DeletedItem {
  letterId: string;
  letterInfo: {
    receiverName: string;
    receiverAvatar: string;
    isBottle: boolean;
  };
  roundNumber: number;
  type: 'userLetter' | 'aiReply';
  content: string;
  deletedAt: number;
  originalSentAt: number;
}

export function getAllDeletedItems(): DeletedItem[] {
  const letters = getLettersFromStorage();
  const deletedItems: DeletedItem[] = [];
  
  letters.forEach(letter => {
    letter.conversationRounds.forEach(round => {
      // 检查用户信件
      if (round.userLetter.isDeleted) {
        deletedItems.push({
          letterId: letter.id,
          letterInfo: {
            receiverName: letter.receiverName,
            receiverAvatar: letter.receiverAvatar || '👤',
            isBottle: letter.isBottle
          },
          roundNumber: round.roundNumber,
          type: 'userLetter',
          content: round.userLetter.content,
          deletedAt: round.userLetter.deletedAt || Date.now(),
          originalSentAt: round.userLetter.sentAt
        });
      }
      
      // 检查AI回信
      if (round.aiReply && round.aiReply.isDeleted) {
        deletedItems.push({
          letterId: letter.id,
          letterInfo: {
            receiverName: letter.receiverName,
            receiverAvatar: letter.receiverAvatar || '👤',
            isBottle: letter.isBottle
          },
          roundNumber: round.roundNumber,
          type: 'aiReply',
          content: round.aiReply.content,
          deletedAt: round.aiReply.deletedAt || Date.now(),
          originalSentAt: round.aiReply.repliedAt
        });
      }
    });
  });
  
  // 按删除时间降序排列
  return deletedItems.sort((a, b) => b.deletedAt - a.deletedAt);
}

/**
 * 永久删除单个项目（从回收站彻底删除）
 * @param letterId 信件ID
 * @param roundNumber 轮次编号
 * @param type 类型
 * @returns 是否成功
 */
export function permanentlyDeleteItem(letterId: string, roundNumber: number, type: 'userLetter' | 'aiReply'): boolean {
  const letters = getLettersFromStorage();
  const letter = letters.find(l => l.id === letterId);
  
  if (!letter) {
    return false;
  }
  
  const round = letter.conversationRounds.find(r => r.roundNumber === roundNumber);
  
  if (!round) {
    return false;
  }
  
  if (type === 'userLetter') {
    // 如果用户信件被删除，检查是否还有AI回信
    if (round.aiReply && !round.aiReply.isDeleted) {
      // 只有用户信件，保留AI回信，但清空用户信件内容
      round.userLetter.content = '[已永久删除]';
    } else {
      // 两个都删了或只有用户信件，删除整个轮次
      const index = letter.conversationRounds.findIndex(r => r.roundNumber === roundNumber);
      if (index !== -1) {
        letter.conversationRounds.splice(index, 1);
        // 重新编号
        letter.conversationRounds.forEach((r, i) => {
          r.roundNumber = i + 1;
        });
        letter.currentRound = letter.conversationRounds.length;
      }
    }
  } else if (type === 'aiReply') {
    // 如果AI回信被删除，检查用户信件
    if (!round.userLetter.isDeleted) {
      // 只删除AI回信
      round.aiReply = undefined;
    } else {
      // 两个都删了，删除整个轮次
      const index = letter.conversationRounds.findIndex(r => r.roundNumber === roundNumber);
      if (index !== -1) {
        letter.conversationRounds.splice(index, 1);
        // 重新编号
        letter.conversationRounds.forEach((r, i) => {
          r.roundNumber = i + 1;
        });
        letter.currentRound = letter.conversationRounds.length;
      }
    }
  }
  
  // 如果没有轮次了，删除整个信件
  if (letter.conversationRounds.length === 0) {
    return deleteLetter(letterId);
  }
  
  // 保存更新
  updateLetterInStorage(letter);
  
  console.log(`☠️ 已永久删除 ${type === 'userLetter' ? '用户信件' : 'AI回信'}`);
  
  return true;
}

/**
 * 收藏AI回复
 * @param letterId 信件ID
 * @param roundNumber 轮次编号
 * @returns 是否成功
 */
export function favoriteAIReply(letterId: string, roundNumber: number): boolean {
  const letters = getLettersFromStorage();
  const letter = letters.find(l => l.id === letterId);
  
  if (!letter) {
    return false;
  }
  
  const round = letter.conversationRounds.find(r => r.roundNumber === roundNumber);
  
  if (!round || !round.aiReply) {
    return false;
  }
  
  // 切换收藏状态
  round.aiReply.isFavorite = !round.aiReply.isFavorite;
  round.aiReply.favoritedAt = round.aiReply.isFavorite ? Date.now() : undefined;
  
  // 保存更新
  updateLetterInStorage(letter);
  
  console.log(`${round.aiReply.isFavorite ? '⭐' : '☆'} ${round.aiReply.isFavorite ? '已收藏' : '已取消收藏'}第 ${roundNumber} 轮的AI回信`);
  
  return true;
}

/**
 * 获取所有收藏的AI回复
 * @returns 收藏的回复列表
 */
export interface FavoriteReply {
  letterId: string;
  letterInfo: {
    receiverName: string;
    receiverAvatar: string;
    isBottle: boolean;
  };
  roundNumber: number;
  content: string;
  repliedAt: number;
  favoritedAt: number;
}

export function getAllFavoriteReplies(): FavoriteReply[] {
  const letters = getLettersFromStorage();
  const favoriteReplies: FavoriteReply[] = [];
  
  letters.forEach(letter => {
    letter.conversationRounds.forEach(round => {
      if (round.aiReply && round.aiReply.isFavorite && !round.aiReply.isDeleted) {
        favoriteReplies.push({
          letterId: letter.id,
          letterInfo: {
            receiverName: letter.receiverName,
            receiverAvatar: letter.receiverAvatar || '👤',
            isBottle: letter.isBottle
          },
          roundNumber: round.roundNumber,
          content: round.aiReply.content,
          repliedAt: round.aiReply.repliedAt,
          favoritedAt: round.aiReply.favoritedAt || Date.now()
        });
      }
    });
  });
  
  // 按收藏时间降序排列
  return favoriteReplies.sort((a, b) => b.favoritedAt - a.favoritedAt);
}

/**
 * 获取所有笔友（已加为笔友的漂流瓶AI）
 */
export function getAllPenPals(): Letter[] {
  return getLettersFromStorage()
    .filter(l => l.isPenPalAdded && !l.isArchived)
    .sort((a, b) => (b.repliedAt || b.sentAt) - (a.repliedAt || a.sentAt));
}

/**
 * 获取活跃信件（未归档）
 */
export function getActiveLetters(): Letter[] {
  return getLettersFromStorage()
    .filter(l => !l.isArchived)
    .sort((a, b) => b.sentAt - a.sentAt);
}

/**
 * 获取归档信件（回收站）
 */
export function getArchivedLetters(): Letter[] {
  return getLettersFromStorage()
    .filter(l => l.isArchived)
    .sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0));
}

/**
 * 获取笔友统计信息
 */
export function getPenPalStats() {
  const penPals = getAllPenPals();
  
  return {
    total: penPals.length,
    totalRounds: penPals.reduce((sum, l) => sum + l.currentRound, 0),
    locations: [...new Set(penPals.map(l => l.bottleAIProfile?.location).filter(Boolean))],
    recentActive: penPals.slice(0, 5)
  };
}

/**
 * 继续回信（多轮交流）
 * @returns 新的信件ID，如果超过限制则返回null
 */
export function continueReply(
  letterId: string,
  content: string,
  _senderName: string = '我'  // 保留参数以保持接口一致性，但在多轮交流中使用原letter的senderName
): string | null {
  const letters = getLettersFromStorage();
  const letter = letters.find(l => l.id === letterId);
  
  if (!letter) {
    return null;
  }
  
  // 检查是否已加为笔友或是否还在轮数限制内
  const canContinue = letter.isPenPalAdded || letter.currentRound < letter.maxRounds;
  
  if (!canContinue) {
    console.log(`⚠️ 已达到最大轮数限制 (${letter.maxRounds}轮)`);
    return null;
  }
  
  const now = Date.now();
  const replyDelay = calculateReplyDelay(false);
  
  // 增加轮数
  letter.currentRound += 1;
  
  // 添加新一轮对话
  letter.conversationRounds.push({
    roundNumber: letter.currentRound,
    userLetter: {
      content,
      sentAt: now
    }
  });
  
  // 更新信件状态
  letter.status = 'sent';
  letter.willReplyAt = now + replyDelay;
  letter.hasUrged = false;
  
  updateLetterInStorage(letter);
  
  // 设置新的回信定时器
  scheduleAutoReply(letter);
  
  console.log(`📮 继续第 ${letter.currentRound} 轮交流`);
  
  return letter.id;
}

/**
 * 加为笔友
 * 将漂流瓶AI加为长期笔友，解除轮数限制
 */
export function addAsPenPal(letterId: string): boolean {
  const letters = getLettersFromStorage();
  const letter = letters.find(l => l.id === letterId);
  
  if (!letter || !letter.isBottle || !letter.bottleAIProfile) {
    return false;
  }
  
  // 标记为已加笔友
  letter.isPenPalAdded = true;
  letter.maxRounds = 999; // 解除轮数限制
  
  updateLetterInStorage(letter);
  
  // 检查成就
  checkLetterAchievements();
  
  console.log(`💌 已将 ${letter.receiverName} 加为笔友！`);
  
  return true;
}

/**
 * 检查是否可以继续回信
 */
export function canContinueReply(letterId: string): {
  canContinue: boolean;
  reason?: string;
  currentRound: number;
  maxRounds: number;
  isLastRound: boolean;
} {
  const letter = getLetterById(letterId);
  
  if (!letter) {
    return {
      canContinue: false,
      reason: '信件不存在',
      currentRound: 0,
      maxRounds: 0,
      isLastRound: false
    };
  }
  
  if (letter.status !== 'replied') {
    return {
      canContinue: false,
      reason: '等待回信中',
      currentRound: letter.currentRound,
      maxRounds: letter.maxRounds,
      isLastRound: false
    };
  }
  
  // 已加为笔友或非漂流瓶，无限制
  if (letter.isPenPalAdded || !letter.isBottle) {
    return {
      canContinue: true,
      currentRound: letter.currentRound,
      maxRounds: letter.maxRounds,
      isLastRound: false
    };
  }
  
  // 漂流瓶模式，检查轮数限制
  const reachedLimit = letter.currentRound >= letter.maxRounds;
  const isLastRound = letter.currentRound === letter.maxRounds - 1;
  
  return {
    canContinue: !reachedLimit,
    reason: reachedLimit ? `已达到漂流瓶最大轮数限制 (${letter.maxRounds}轮)` : undefined,
    currentRound: letter.currentRound,
    maxRounds: letter.maxRounds,
    isLastRound: isLastRound && !reachedLimit
  };
}

// 🎭 自定义笔友管理

const CUSTOM_PENPALS_KEY = 'custom_pen_pals';

/**
 * 获取所有自定义笔友
 */
export function getCustomPenPals(): BottleAI[] {
  try {
    const data = localStorage.getItem(CUSTOM_PENPALS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('读取自定义笔友失败:', error);
    return [];
  }
}

/**
 * 保存自定义笔友
 */
export function saveCustomPenPal(penPal: BottleAI): boolean {
  try {
    // 验证必填字段
    if (!penPal.customRolePrompt || !penPal.customRolePrompt.trim()) {
      console.error('角色设定不能为空');
      return false;
    }
    
    const customPenPals = getCustomPenPals();
    
    // 检查是否已存在（更新）
    const existingIndex = customPenPals.findIndex(p => p.id === penPal.id);
    if (existingIndex !== -1) {
      customPenPals[existingIndex] = penPal;
    } else {
      customPenPals.push(penPal);
    }
    
    localStorage.setItem(CUSTOM_PENPALS_KEY, JSON.stringify(customPenPals));
    
    console.log(`✨ 已保存自定义笔友: ${penPal.name}`);
    return true;
  } catch (error) {
    console.error('保存自定义笔友失败:', error);
    return false;
  }
}

/**
 * 删除自定义笔友
 */
export function deleteCustomPenPal(penPalId: string): boolean {
  try {
    const customPenPals = getCustomPenPals();
    const filtered = customPenPals.filter(p => p.id !== penPalId);
    
    if (filtered.length === customPenPals.length) {
      return false; // 未找到
    }
    
    localStorage.setItem(CUSTOM_PENPALS_KEY, JSON.stringify(filtered));
    console.log(`🗑️ 已删除自定义笔友`);
    return true;
  } catch (error) {
    console.error('删除自定义笔友失败:', error);
    return false;
  }
}

/**
 * 获取单个自定义笔友
 */
export function getCustomPenPalById(penPalId: string): BottleAI | undefined {
  return getCustomPenPals().find(p => p.id === penPalId);
}

/**
 * 收藏信件
 */
export function favoriteLetter(letterId: string): boolean {
  const letters = getLettersFromStorage();
  const letter = letters.find(l => l.id === letterId);
  
  if (!letter) {
    return false;
  }
  
  letter.isFavorite = true;
  letter.favoritedAt = Date.now();
  
  updateLetterInStorage(letter);
  console.log(`💖 已收藏信件：${letter.receiverName}`);
  
  return true;
}

/**
 * 取消收藏
 */
export function unfavoriteLetter(letterId: string): boolean {
  const letters = getLettersFromStorage();
  const letter = letters.find(l => l.id === letterId);
  
  if (!letter) {
    return false;
  }
  
  letter.isFavorite = false;
  letter.favoritedAt = undefined;
  
  updateLetterInStorage(letter);
  console.log(`💔 已取消收藏：${letter.receiverName}`);
  
  return true;
}

/**
 * 切换收藏状态
 */
export function toggleFavoriteLetter(letterId: string): boolean {
  const letter = getLetterById(letterId);
  
  if (!letter) {
    return false;
  }
  
  if (letter.isFavorite) {
    return unfavoriteLetter(letterId);
  } else {
    return favoriteLetter(letterId);
  }
}

/**
 * 获取所有收藏的信件
 */
export function getFavoriteLetters(): Letter[] {
  return getLettersFromStorage()
    .filter(l => l.isFavorite && !l.isArchived)
    .sort((a, b) => (b.favoritedAt || 0) - (a.favoritedAt || 0));
}
