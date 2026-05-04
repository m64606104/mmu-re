/**
 * 智能漂流瓶内容生成器
 * 基于AI API根据年龄、性格、话题智能生成真实内容
 */

import { BottleLetter } from '../types/bottle';
import { generateXianyuStyleName } from './randomNameGenerator';

// 年龄段定义
interface AgeProfile {
  name: string;
  ageRange: [number, number];
  characteristics: string[];
  commonTopics: string[];
  languageStyle: string;
  emotionalRange: string[];
}

// 性格类型定义
interface PersonalityType {
  name: string;
  traits: string[];
  expressionStyle: string;
  preferredTopics: string[];
}

// 话题分类定义
interface TopicCategory {
  name: string;
  description: string;
  emotions: string[];
  scenarios: string[];
}

// 年龄段配置
const AGE_PROFILES: AgeProfile[] = [
  {
    name: 'elementary',
    ageRange: [7, 12],
    characteristics: ['天真无邪', '充满好奇心', '直接表达情感', '容易兴奋', '喜欢分享小事'],
    commonTopics: ['学校生活', '游戏玩具', '家人朋友', '小动物', '简单梦想'],
    languageStyle: '简单直接，多用感叹号，重复表达兴奋，用词幼稚可爱',
    emotionalRange: ['超级开心', '有点难过', '很兴奋', '好奇', '害怕', '骄傲']
  },
  {
    name: 'middle_school', 
    ageRange: [13, 15],
    characteristics: ['青春期困惑', '重视友谊', '开始有理想', '情绪波动大', '渴望被理解'],
    commonTopics: ['学习压力', '友谊变化', '兴趣爱好', '家庭关系', '青春梦想'],
    languageStyle: '情感丰富，偶尔使用网络语言，表达更有层次，开始思考人生',
    emotionalRange: ['激动', '沮丧', '困惑', '感动', '愤怒', '温暖', '紧张']
  },
  {
    name: 'high_school',
    ageRange: [16, 18], 
    characteristics: ['面临人生选择', '理想主义', '情感深刻', '压力与动力并存', '渴望独立'],
    commonTopics: ['学业压力', '未来规划', '情感困扰', '家庭期望', '青春记忆'],
    languageStyle: '表达成熟，情感细腻，会用比喻和深层思考，有文学色彩',
    emotionalRange: ['焦虑', '憧憬', '迷茫', '坚定', '不安', '感激', '孤独', '希望']
  },
  {
    name: 'young_adult',
    ageRange: [19, 25],
    characteristics: ['初入社会', '现实与理想冲突', '独立生活', '职业探索', '情感成熟'],
    commonTopics: ['工作学习', '人际关系', '独立生活', '情感困扰', '未来焦虑'],
    languageStyle: '表达自然，带有网络用语，会自嘲和幽默，偶尔深度思考',
    emotionalRange: ['迷茫', '努力', '疲惫', '成就感', '孤独', '温暖', '压力', '成长']
  },
  {
    name: 'adult',
    ageRange: [26, 35],
    characteristics: ['生活阅历丰富', '务实理性', '承担责任', '追求平衡', '深度思考'],
    commonTopics: ['工作生活', '人生感悟', '家庭责任', '健康关注', '时间价值'],
    languageStyle: '成熟稳重，表达简洁有力，善于总结和反思，有人生智慧',
    emotionalRange: ['平静', '感慨', '珍惜', '责任感', '无奈', '满足', '思考', '温和']
  }
];

// 性格类型配置
const PERSONALITY_TYPES: PersonalityType[] = [
  {
    name: '开朗外向',
    traits: ['活泼开朗', '善于交际', '乐观积极', '喜欢分享'],
    expressionStyle: '语言活泼，多用感叹号，喜欢分享日常小事，容易感染他人',
    preferredTopics: ['开心事件', '朋友聚会', '有趣经历', '积极体验']
  },
  {
    name: '内向敏感',
    traits: ['内心细腻', '善于观察', '情感丰富', '深度思考'],
    expressionStyle: '表达深刻，善于描述细节和内心感受，文字有诗意',
    preferredTopics: ['内心感受', '观察思考', '情感体验', '深度话题']
  },
  {
    name: '理性务实',
    traits: ['逻辑清晰', '注重效率', '目标明确', '解决问题'],
    expressionStyle: '条理清晰，表达简洁，善于分析和总结，注重实用性',
    preferredTopics: ['学习工作', '问题解决', '规划目标', '经验分享']
  },
  {
    name: '温和随和',
    traits: ['性格温和', '容易相处', '善解人意', '喜欢和谐'],
    expressionStyle: '语气温和，善于倾听和理解，表达包容和关怀',
    preferredTopics: ['温暖时刻', '人际关系', '感恩体验', '美好回忆']
  },
  {
    name: '好奇探索',
    traits: ['充满好奇', '喜欢探索', '创意丰富', '接受新事物'],
    expressionStyle: '表达新颖，富有想象力，喜欢提问和探讨，语言有创意',
    preferredTopics: ['新奇发现', '创意想法', '探索体验', '学习新知']
  }
];

// 话题分类配置
const TOPIC_CATEGORIES: TopicCategory[] = [
  {
    name: '生活日常',
    description: '日常生活中的小事、观察、体验',
    emotions: ['平静', '满足', '温暖', '有趣'],
    scenarios: ['日常活动', '生活观察', '小确幸', '日常感受']
  },
  {
    name: '情感体验',
    description: '内心情感、人际关系、情感波动',
    emotions: ['感动', '温暖', '孤独', '想念', '感激'],
    scenarios: ['情感变化', '人际互动', '内心感受', '情感回忆']
  },
  {
    name: '成长困惑',
    description: '成长过程中的困惑、选择、挑战',
    emotions: ['迷茫', '困惑', '焦虑', '纠结', '不安'],
    scenarios: ['人生选择', '成长烦恼', '压力挑战', '困惑思考']
  },
  {
    name: '快乐分享',
    description: '开心事件、成就时刻、美好体验',
    emotions: ['开心', '兴奋', '骄傲', '满足', '激动'],
    scenarios: ['成功体验', '开心时刻', '有趣事件', '美好回忆']
  },
  {
    name: '思考感悟',
    description: '对生活、人生、世界的思考和感悟',
    emotions: ['思考', '感慨', '领悟', '平静', '深刻'],
    scenarios: ['人生思考', '生活感悟', '哲理思考', '价值观念']
  },
  {
    name: '梦想追求',
    description: '理想目标、梦想追求、未来规划',
    emotions: ['憧憬', '激励', '坚定', '希望', '动力'],
    scenarios: ['梦想规划', '目标追求', '未来憧憬', '励志时刻']
  }
];

/**
 * 根据年龄获取年龄档案
 */
function getAgeProfile(age: number): AgeProfile {
  for (const profile of AGE_PROFILES) {
    if (age >= profile.ageRange[0] && age <= profile.ageRange[1]) {
      return profile;
    }
  }
  return AGE_PROFILES[AGE_PROFILES.length - 1]; // 默认返回成年人
}

/**
 * 随机选择性格类型
 */
function getRandomPersonality(): PersonalityType {
  return PERSONALITY_TYPES[Math.floor(Math.random() * PERSONALITY_TYPES.length)];
}

/**
 * 随机选择话题分类
 */
function getRandomTopic(): TopicCategory {
  return TOPIC_CATEGORIES[Math.floor(Math.random() * TOPIC_CATEGORIES.length)];
}

/**
 * 构建智能生成prompt
 */
function buildIntelligentPrompt(
  ageProfile: AgeProfile, 
  personality: PersonalityType, 
  topic: TopicCategory,
  age: number,
  gender: 'male' | 'female' | 'other',
  location: string
): string {
  const emotion = topic.emotions[Math.floor(Math.random() * topic.emotions.length)];
  const scenario = topic.scenarios[Math.floor(Math.random() * topic.scenarios.length)];
  
  return `请你扮演一个${age}岁的${gender === 'male' ? '男生' : gender === 'female' ? '女生' : '人'}，来自${location}。

【角色设定】：
- 年龄特征：${ageProfile.characteristics.join('、')}
- 性格类型：${personality.name} - ${personality.traits.join('、')}
- 语言风格：${ageProfile.languageStyle}
- 表达特点：${personality.expressionStyle}

【内容要求】：
- 话题类别：${topic.name} - ${topic.description}
- 情感基调：${emotion}
- 场景类型：${scenario}
- 字数范围：200-400字（必须详细描述具体情况，不要简略概括）

【重要规则】：
1. 必须完全符合${age}岁年龄段的语言习惯和思维方式
2. 体现${personality.name}的性格特征
3. 内容要真实具体，包含足够的背景信息和细节
4. 如果提问题，必须说明具体情况和困惑点，不要模糊发问
5. 避免空洞的人生感慨，要有实际内容和故事
6. 可以分享具体事件、经历、想法，让读者能产生共鸣或回应
7. 表达要符合漂流瓶的随性、真诚特点
8. 不要提及"漂流瓶"这个词
9. 内容要完整，不需要署名
10. 优先选择能引发互动和讨论的内容，而非单纯抒情

【内容示例参考】：
- 好："最近在准备考研，每天学12小时快撑不住了。昨天背政治背到凌晨3点，今早6点又爬起来。看着室友都找到工作了，我有点动摇，不知道该不该继续坚持？"
- 不好："人生真难啊，最近有点迷茫，不知道未来在哪里。"
- 好："我妈今天又催婚了，说表妹都二胎了。问题是我才24岁，工作刚稳定，她就给我安排了5个相亲对象。我该怎么和她沟通？直接拒绝还是先应付着？"
- 不好："关于婚姻的事，不知道大家怎么想？"

请直接输出这个角色想要表达的内容：`;
}

/**
 * 调用AI API生成内容
 */
async function generateContentWithAI(prompt: string): Promise<string> {
  try {
    // 获取API配置
    const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
    
    if (!apiConfig.apiUrl || !apiConfig.apiKey) {
      throw new Error('API配置不完整');
    }
    
    const response = await fetch(apiConfig.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: apiConfig.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500, // 增加到500，支持更长内容
        temperature: 0.85, // 稍微降低，增加连贯性
        top_p: 0.92,
        presence_penalty: 0.6, // 增加多样性，减少重复
        frequency_penalty: 0.3 // 避免使用过于常见的表达
      })
    });
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('AI返回数据格式错误');
    }
    
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('AI生成内容失败:', error);
    // 返回降级内容
    return getFallbackContent();
  }
}

/**
 * 获取降级内容（API失败时使用）
 */
function getFallbackContent(): string {
  const fallbackContents = [
    '今天看到窗外的夕阳特别美，橙红色的光洒在云朵上，让人心情瞬间变好了。',
    '刚刚在路上遇到一只很友好的小猫，它蹭了蹭我的腿，那一刻感觉世界都温柔了。',
    '最近在思考一些事情，发现生活中有很多小美好等着我们去发现。',
    '今天完成了一件一直想做的事，虽然过程有点艰难，但结果让我很满意。',
    '有时候觉得，能遇到理解自己的人真的很幸运，珍惜每一份真诚的友谊。'
  ];
  
  return fallbackContents[Math.floor(Math.random() * fallbackContents.length)];
}

/**
 * 生成智能漂流瓶
 */
export async function generateIntelligentBottle(): Promise<BottleLetter> {
  // 随机生成基础信息
  const age = 7 + Math.floor(Math.random() * 28); // 7-35岁
  const ageProfile = getAgeProfile(age);
  const personality = getRandomPersonality();
  const topic = getRandomTopic();
  
  // 随机生成其他属性
  const genders: Array<'male' | 'female' | 'other'> = ['male', 'female'];
  const gender = genders[Math.floor(Math.random() * genders.length)];
  
  const locations = [
    '北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '西安', 
    '南京', '武汉', '苏州', '天津', '青岛', '大连', '厦门', '昆明', 
    '长沙', '郑州', '济南', '福州', '合肥', '石家庄', '太原', '南昌'
  ];
  const location = locations[Math.floor(Math.random() * locations.length)];
  
  const avatars = ['🌊', '🗺️', '🌙', '🏙️', '⛰️', '☕', '📚', '🐚', '🎨', '🎵', '🌸', '🎭', '🍃', '⭐', '🌈'];
  const avatar = avatars[Math.floor(Math.random() * avatars.length)];
  
  const name = generateXianyuStyleName();
  
  // 构建智能prompt
  const prompt = buildIntelligentPrompt(ageProfile, personality, topic, age, gender, location);
  
  // 生成内容
  const content = await generateContentWithAI(prompt);
  
  const bottle: BottleLetter = {
    id: `bottle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    senderId: `intelligent_sender_${age}_${Date.now()}`,
    senderName: name,
    senderAvatar: avatar,
    senderAge: age,
    senderGender: gender,
    senderLocation: location,
    content,
    topic: topic.name,
    mood: topic.emotions[0] as any, // 使用主要情感作为mood
    timestamp: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000, // 1-7天前
    language: 'zh'
  };
  
  return bottle;
}

/**
 * 检查API配置是否可用
 */
export function checkAPIAvailability(): boolean {
  const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
  return !!(apiConfig.apiUrl && apiConfig.apiKey);
}

/**
 * 获取生成统计信息
 */
export function getGenerationStats() {
  return {
    ageProfiles: AGE_PROFILES.length,
    personalities: PERSONALITY_TYPES.length,
    topics: TOPIC_CATEGORIES.length,
    totalCombinations: AGE_PROFILES.length * PERSONALITY_TYPES.length * TOPIC_CATEGORIES.length,
    apiAvailable: checkAPIAvailability()
  };
}
