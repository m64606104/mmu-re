/**
 * 慢邮件服务
 * 处理写信、寄出、回复延迟、漂流瓶等功能
 */

import { Letter, BottleAI } from '../types/letter';
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
async function generateReply(letterId: string) {
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
  } catch (error) {
    console.error('生成AI回信失败:', error);
    // 失败时使用备用回复
    const replyContent = generateMockReply(letter);
    const now = Date.now();
    
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
  const personality = aiProfile ? `你是${letter.receiverName}，性格：${aiProfile.personality}，来自${aiProfile.location}，爱好：${aiProfile.hobby}。` : `你是${letter.receiverName}。`;
  
  // 获取之前的对话历史
  const conversationHistory = letter.conversationRounds
    .filter(round => round.aiReply)
    .slice(-3) // 最近3轮对话
    .map(round => `用户: ${round.userLetter.content}\n你: ${round.aiReply?.content}`)
    .join('\n\n');
  
  const historyContext = conversationHistory ? `\n\n【之前的对话】:\n${conversationHistory}\n` : '';
  
  // 判断是否是第一次交流
  const isFirstReply = letter.currentRound === 1;
  const roundInfo = isFirstReply ? '这是你们第一次通过漂流瓶相遇。' : `这是你们的第${letter.currentRound}次交流。`;
  
  // 构建书信式提示词
  const prompt = `${personality}

${roundInfo}${historyContext}

【用户的来信】:
${letter.content}

---

你现在要以${letter.receiverName}的身份给用户写一封回信。

⚠️ 重要：这不是即时聊天，而是传统的书信交流。两封信之间可能隔着好几天，所以：

📮 **书信交流的特点**：
1. **不只是回应对方** - 除了回应用户的内容，你要像真实写信一样：
   - 分享你这几天的生活近况（去了哪里、做了什么、遇到了什么人）
   - 描述你当下的心情和感受（开心/难过/困惑/兴奋）
   - 提出你自己的困惑或问题（工作、生活、感情、人生选择等）
   - 讲讲你最近的思考或领悟
   - 推荐你看的书/电影/音乐/文章

2. **时间感和场景感**：
   - 可以提及写信时的场景（"现在是深夜，窗外在下雨..."）
   - 提及距离上次通信过了多久（"收到你的信已经三天了，这几天..."）
   - 描写你收到信时的心情和反应

3. **真实的个人化**：
   - 根据你的性格和爱好，分享相关的生活片段
   - 可以有情绪起伏（今天特别累/最近压力大/这周很开心）
   - 可以有困惑和脆弱（"最近在纠结要不要..."、"有点迷茫..."）
   - 可以有小抱怨、小确幸、小发现

4. **互动和期待**：
   - 向对方提问（关于他们的生活、想法、建议）
   - 表达想听对方故事的期待
   - 可以约定下次聊什么话题
   - 表达对回信的期待

✍️ **写作要求**：
- **字数**: 最少100字，最多2000字，写信要有内容，不要太短
- **结构**: 像真实信件一样，有开头问候、正文、结尾祝福
- **语气**: 随性自然，像和朋友写信，不要太正式
- **内容比例**: 
  - 30%回应对方的内容
  - 40%分享你自己的近况和生活
  - 20%你的困惑、思考或问题
  - 10%对未来的期待和提问
- **禁止**: 不要只是简单回应，不要模板化，不要太客气和官方

💡 **举例说明**：

❌ 不好的回信（即时聊天式）:
"收到你的信了。你说的那个问题我觉得挺有道理的。我也经常这么想。你最近怎么样？"

✅ 好的回信（书信式）:
"收到你的信是在周三的晚上，当时刚下完雨，空气里都是湿漉漉的味道。看到你说的那件事，突然就想起上个月我也遇到过类似的情况...

这几天其实挺忙的，公司新来了个项目，每天加班到很晚。昨晚回家的路上路过那家24小时书店，进去翻了会儿书，看到一句话特别有感触：[某句话]。突然觉得，我们每个人不都是在各自的困境里找出路嘛。

说实话，最近我也在纠结一件事。[具体的事情]。你觉得呢？如果是你会怎么选？有时候真的很想有人能给点建议，但又知道最终还是要自己做决定。

对了，你上次说的那个[话题]，后来怎么样了？很想听听你的故事。

这几天如果天气好的话，我打算去[某个地方]走走。也不知道为什么，最近特别想一个人静一静。可能是太久没好好放松了吧。

写信的时候已经是凌晨了，窗外很安静。希望你收到这封信的时候，心情是好的。

等你回信。晚安（或早安？不知道你什么时候看到）。"

---

现在，请以${letter.receiverName}的身份，写一封真正的信：`;

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
          content: `你是一个真实的人，正在通过传统书信的方式与陌生人交流。

你的特点：
- 你有自己的生活、工作、爱好、困惑和喜怒哀乐
- 你会主动分享自己的近况，不只是被动回应
- 你会向对方提问，表达对对方生活的好奇
- 你的信件有场景感、时间感、情绪起伏
- 你像一个真实的朋友在给对方写信，而不是在回答问题

记住：这是书信交流，不是即时聊天。两封信之间可能隔了好几天，所以你要：
1. 分享这几天发生的事情
2. 表达收到信时的心情
3. 提出你自己的困惑和问题
4. 像真实的人一样，有情绪、有温度、有故事

你的回信应该让对方感觉到：这是一个真实的人在和我交流，而不是一个AI在回复。`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.9,
      max_tokens: 2000,
      presence_penalty: 0.6,
      frequency_penalty: 0.3
    })
  });

  if (!response.ok) {
    throw new Error(`API调用失败: ${response.statusText}`);
  }

  const data = await response.json();
  let replyContent = data.choices[0]?.message?.content || '';
  
  // 验证字数（书信交流至少需要100字）
  if (replyContent.length < 100) {
    throw new Error('AI回复字数过少，书信交流需要更多内容');
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

/**
 * 生成模拟回信内容 - 更自然的回信风格
 */
function generateMockReply(letter: Letter): string {
  // 根据信件内容长度和情绪，生成不同风格的回信
  const isLongLetter = letter.content.length > 200;
  const hasQuestion = letter.content.includes('?') || letter.content.includes('？');
  
  const templates = [
    // 简短随意风格
    `嘿，收到你的信了。\n\n${extractKeyword(letter.content)}... 这个我也有点感触。说实话，${getRandomFeeling()}。\n\n${getRandomDailyLife()}\n\n有空再聊～`,
    
    // 细腻感性风格
    `读你的信时，${getRandomMoment()}。\n\n"${extractKeyword(letter.content)}" 这段让我想了很久。我${getRandomThought()}。\n\n${getRandomSharing()}\n\n慢慢聊吧，不急。`,
    
    // 朴实回应风格
    `看到你的信了。${letter.isBottle ? '能通过漂流瓶认识你挺有意思' : '谢谢你还记得我'}。\n\n你说的那些${hasQuestion ? '问题' : '事'}，我觉得${getRandomOpinion()}。\n\n${getRandomLifeUpdate()}\n\n就这样吧，回见。`,
    
    // 深夜思考风格（适合长信）
    isLongLetter ? `${getRandomNightMood()}\n\n看完你的信，想说的话有点多。${extractKeyword(letter.content)}... 这让我想起${getRandomMemory()}。\n\n${getRandomReflection()}\n\n晚了，先写到这。` : null,
    
    // 忙碌简短风格
    `不好意思，这几天${getRandomBusyReason()}，回晚了。\n\n${extractKeyword(letter.content)} - 看到这个我挺${getRandomEmotion()}的。\n\n${getRandomQuickResponse()}\n\n改天细说。`
  ].filter(Boolean) as string[];
  
  const index = Math.floor(Math.random() * templates.length);
  return templates[index];
}

// 辅助函数 - 更自然的真人化表达
function getRandomFeeling(): string {
  const feelings = [
    '有时候也会这么想',
    '可能每个人都经历过吧',
    '我懂那种感觉',
    '确实挺复杂的',
    '说不上来，就那样吧'
  ];
  return feelings[Math.floor(Math.random() * feelings.length)];
}

function getRandomDailyLife(): string {
  const life = [
    '最近挺忙的，很多事。',
    '这几天在家宅着，也挺舒服。',
    '天气不错，出去走了走。',
    '工作有点烦，不想多说。',
    '状态还行，日子一天天过。'
  ];
  return life[Math.floor(Math.random() * life.length)];
}

function getRandomMoment(): string {
  const moments = [
    '窗外正下着小雨',
    '已经是深夜了',
    '正好在听歌',
    '刚泡了杯咖啡',
    '一个人在家'
  ];
  return moments[Math.floor(Math.random() * moments.length)];
}

function getRandomThought(): string {
  const thoughts = [
    '之前也想过类似的事',
    '有段时间一直在纠结这个',
    '现在想开了一些',
    '还在摸索吧',
    '也说不太清楚'
  ];
  return thoughts[Math.floor(Math.random() * thoughts.length)];
}

function getRandomSharing(): string {
  const shares = [
    '我这边也差不多，每天就那样。',
    '有时候想得太多反而累。',
    '最近在尝试不去想那么多。',
    '慢慢来吧，急不得。',
    '走一步看一步。'
  ];
  return shares[Math.floor(Math.random() * shares.length)];
}

function getRandomOpinion(): string {
  const opinions = [
    '没有标准答案',
    '每个人情况不一样',
    '可以试试看',
    '顺其自然也不错',
    '想太多没用'
  ];
  return opinions[Math.floor(Math.random() * opinions.length)];
}

function getRandomLifeUpdate(): string {
  const updates = [
    '我这边还好，照常。',
    '最近在调整状态。',
    '也没什么特别的。',
    '一切如常。',
    '日子还是要过。'
  ];
  return updates[Math.floor(Math.random() * updates.length)];
}

function getRandomNightMood(): string {
  const moods = [
    '深夜了，睡不着。',
    '夜深人静的时候想得比较多。',
    '又熬夜了。',
    '今晚月色不错。',
    '一个人的夜晚。'
  ];
  return moods[Math.floor(Math.random() * moods.length)];
}

function getRandomMemory(): string {
  const memories = [
    '之前的一些事',
    '很久以前的自己',
    '某个瞬间',
    '那段时间',
    '以前的经历'
  ];
  return memories[Math.floor(Math.random() * memories.length)];
}

function getRandomReflection(): string {
  const reflections = [
    '有些事情，时间会给答案。',
    '人都是慢慢成长的吧。',
    '想开了就好了。',
    '也许这就是生活。',
    '就这样吧。'
  ];
  return reflections[Math.floor(Math.random() * reflections.length)];
}

function getRandomBusyReason(): string {
  const reasons = [
    '有点忙',
    '事情有点多',
    '在忙工作',
    '在外面',
    '不在状态'
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
}

function getRandomEmotion(): string {
  const emotions = [
    '有点感慨',
    '也有点触动',
    '能理解',
    '挺有感觉',
    '有点共鸣'
  ];
  return emotions[Math.floor(Math.random() * emotions.length)];
}

function getRandomQuickResponse(): string {
  const responses = [
    '先这样。',
    '回头再说。',
    '之后再聊。',
    '改天详细说。',
    '晚点再写。'
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

function extractKeyword(content: string): string {
  // 提取关键句子片段
  const sentences = content.split(/[。！？\n]/);
  const meaningful = sentences.find(s => s.trim().length > 5);
  if (meaningful) {
    return meaningful.slice(0, 20) + (meaningful.length > 20 ? '...' : '');
  }
  return content.slice(0, 15) + (content.length > 15 ? '...' : '');
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
