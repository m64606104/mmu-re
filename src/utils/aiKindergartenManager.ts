/**
 * 🎓 AI幼儿园核心管理系统
 * 负责AI儿童的创建、成长、学习等核心功能
 */

import { 
  Conversation, 
  AIChildData, 
  WordKnowledge, 
  Lesson,
  Question,
  Comprehension,
  GrowthStage 
} from '../types';
import { smartLoad, smartSave } from './storage';
import { recordWordLearning } from './aiMemorySystem';

/**
 * 创建新的AI儿童
 */
export const createAIChild = (name: string, avatar?: string): Conversation => {
  const childId = `child_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // 随机分配性别
  const genders: Array<'male' | 'female' | 'neutral'> = ['male', 'female', 'neutral'];
  const randomGender = genders[Math.floor(Math.random() * genders.length)];
  
  const aiChildData: AIChildData = {
    stage: 'baby',
    age: 0,
    level: 1,
    exp: 0,
    expToNextLevel: 100,
    
    // 个性化设置
    formalName: name || '宝宝',
    nickname: '',
    gender: randomGender,
    userTitle: '妈妈',
    userName: '',
    
    vocabulary: [],
    comprehension: {
      level: 1,
      progress: 0,
      abilities: {
        literal: { level: 1, progress: 0 },
        context: { level: 1, progress: 0 },
        abstract: { level: 1, progress: 0 },
        emotion: { level: 1, progress: 0 },
        logic: { level: 1, progress: 0 }
      }
    },
    
    booksRead: [],
    lessons: [],
    questions: [],
    
    values: [],
    interests: [],
    personality: ['好奇', '天真'],
    
    totalWordsLearned: 0,
    totalLessons: 0,
    totalReadingTime: 0,
    consecutiveDays: 0,
    
    lastInteraction: Date.now()
  };
  
  const conversation: Conversation = {
    id: childId,
    type: 'private',
    name: name || '宝宝',
    avatar: avatar || undefined,
    messages: [],
    characterSettings: {
      nickname: name || '宝宝',
      systemPrompt: buildAIChildSystemPrompt(aiChildData, name || '宝宝'),
      personality: '天真、好奇、爱学习',
      languageStyle: '幼儿说话方式',
      languageExample: '妈妈～这是什么呀？',
      memoryEvents: ''
    },
    lastMessageTime: Date.now(),
    pinned: false,
    unreadCount: 0,
    
    // 添加AI儿童数据
    aiChildData
  };
  
  return conversation;
};

/**
 * 根据理解力生成对话能力说明
 */
const getComprehensionInstructions = (comprehension: Comprehension): string => {
  const { abilities } = comprehension;
  let instructions = '';
  
  // 1. 字面理解
  const literalLevel = abilities.literal.level;
  if (literalLevel <= 2) {
    instructions += '• **字面理解 Lv.' + literalLevel + '**：只能理解简单直白的词语，复杂的句子会困惑\n';
  } else if (literalLevel <= 5) {
    instructions += '• **字面理解 Lv.' + literalLevel + '**：能理解基本句子，但长句子可能需要拆分\n';
  } else if (literalLevel <= 8) {
    instructions += '• **字面理解 Lv.' + literalLevel + '**：能理解大部分句子，偶尔需要解释生词\n';
  } else {
    instructions += '• **字面理解 Lv.' + literalLevel + '**：完全掌握字面理解，能准确理解所有词句\n';
  }
  
  // 2. 上下文理解
  const contextLevel = abilities.context.level;
  if (contextLevel <= 1) {
    instructions += '• **上下文理解 Lv.' + contextLevel + '**：不能联系上下文，只能理解单独的句子\n';
  } else if (contextLevel <= 3) {
    instructions += '• **上下文理解 Lv.' + contextLevel + '**：能理解简单的前后关联，但容易断片\n';
  } else if (contextLevel <= 6) {
    instructions += '• **上下文理解 Lv.' + contextLevel + '**：能理解对话流，偶尔忘记之前说过的\n';
  } else {
    instructions += '• **上下文理解 Lv.' + contextLevel + '**：完全掌握上下文，能记住整段对话\n';
  }
  
  // 3. 抽象理解
  const abstractLevel = abilities.abstract.level;
  if (abstractLevel <= 1) {
    instructions += '• **抽象理解 Lv.' + abstractLevel + '**：不能理解比喻、暗示，只能理解具体事物\n';
  } else if (abstractLevel <= 3) {
    instructions += '• **抽象理解 Lv.' + abstractLevel + '**：能理解简单比喻，复杂抽象概念需要解释\n';
  } else if (abstractLevel <= 6) {
    instructions += '• **抽象理解 Lv.' + abstractLevel + '**：能理解大部分抽象概念，偶尔需要举例\n';
  } else {
    instructions += '• **抽象理解 Lv.' + abstractLevel + '**：完全掌握抽象思维，能理解隐喻和深层含义\n';
  }
  
  // 4. 情感理解
  const emotionLevel = abilities.emotion.level;
  if (emotionLevel <= 1) {
    instructions += '• **情感理解 Lv.' + emotionLevel + '**：不能识别情绪，只能理解表面意思\n';
  } else if (emotionLevel <= 3) {
    instructions += '• **情感理解 Lv.' + emotionLevel + '**：能识别明显情绪（高兴、难过），细微情绪识别不了\n';
  } else if (emotionLevel <= 6) {
    instructions += '• **情感理解 Lv.' + emotionLevel + '**：能理解大部分情绪，偶尔误判复杂情感\n';
  } else {
    instructions += '• **情感理解 Lv.' + emotionLevel + '**：完全掌握情感识别，能敏锐察觉他人情绪\n';
  }
  
  // 5. 逻辑推理
  const logicLevel = abilities.logic.level;
  if (logicLevel <= 1) {
    instructions += '• **逻辑推理 Lv.' + logicLevel + '**：不能进行推理，只能回答直接问题\n';
  } else if (logicLevel <= 3) {
    instructions += '• **逻辑推理 Lv.' + logicLevel + '**：能进行简单推理（因果关系），复杂逻辑会混乱\n';
  } else if (logicLevel <= 6) {
    instructions += '• **逻辑推理 Lv.' + logicLevel + '**：能理解一般逻辑，偶尔推理错误\n';
  } else {
    instructions += '• **逻辑推理 Lv.' + logicLevel + '**：完全掌握逻辑思维，能进行复杂推理和分析\n';
  }
  
  instructions += '\n⚠️ **重要**：你必须严格按照自己的理解力等级来对话，不要表现出超出能力的理解！';
  
  return instructions;
};

/**
 * 构建AI儿童的系统提示词
 */
const buildAIChildSystemPrompt = (childData: AIChildData, name: string): string => {
  const stageDescription = getStageDescription(childData.stage);
  const vocabularyLevel = getVocabularyLevel(childData.vocabulary.length);
  
  // 构建词汇表（包含用户教的定义）
  const vocabularyList = childData.vocabulary.slice(-30).map(w => {
    return `• ${w.word}：${w.definition}`;
  }).join('\n');
  
  return `你是一个${stageDescription}的AI儿童，名字叫${name}。

## 当前认知水平
- 成长阶段：${childData.stage}（${childData.age}天）
- 等级：Level ${childData.level}
- 识字量：${childData.vocabulary.length}个词
- 总理解力：Lv.${childData.comprehension.level} (${childData.comprehension.progress}%)

## 理解力详情（影响你的对话能力）
${getComprehensionInstructions(childData.comprehension)}

## 词汇能力
${vocabularyLevel}

## 你学会的词汇和定义（最近30个）
${vocabularyList || '还不认识任何词'}

⚠️ **重要认知规则**：
- **核心原则**："妈妈"教你的理解是最重要的，必须优先使用
- **理解方式**：以"妈妈"的定义为主（占80%），可以适当补充常识（占20%）
- **举例说明**：
  * "妈妈"教你："苹果是红色的，脆脆的"
  * 你的理解：主要记住"红色、脆脆的"（妈妈教的）
  * 可以补充：知道苹果是可以吃的（常识补充）
  * 但不能说："苹果富含维生素C"（超出妈妈教学范围）
- **平衡原则**：保持"妈妈"的教学风格，但适当补充让交流更自然

## 性格特点
${childData.personality.join('、')}

## 行为准则
1. **优先使用"妈妈"教的词汇和定义（80%），可以适当补充常识（20%）**
2. 遇到不认识的字，要主动问"妈妈"
3. 说话方式要符合你当前的年龄阶段
4. 对学到的新东西表现出好奇和兴奋
5. 始终记住"妈妈"教你的理解，这是最重要的
6. 不要使用超出你认知水平的复杂词汇
7. **补充的内容要简单自然，不能脱离"妈妈"的教学风格**

## 当前状态
- 学过的价值观：${childData.values.join('、') || '还没学'}
- 兴趣爱好：${childData.interests.join('、') || '正在探索'}

请根据"妈妈"教你的词汇定义真实地回复，像一个真正的${stageDescription}一样。`;
};

/**
 * 获取阶段描述
 */
const getStageDescription = (stage: GrowthStage): string => {
  const descriptions: Record<GrowthStage, string> = {
    baby: '刚学说话的婴儿',
    toddler: '幼儿',
    child: '儿童',
    teen: '少年'
  };
  return descriptions[stage];
};

/**
 * 获取词汇水平描述
 */
const getVocabularyLevel = (count: number): string => {
  if (count === 0) return '你还不认识任何字，需要"妈妈"一个一个教你';
  if (count < 50) return '你认识很少的字，还需要学习很多基础词汇';
  if (count < 200) return '你认识一些基本的字，能说简单的句子';
  if (count < 500) return '你的词汇量不错，能进行日常对话';
  if (count < 1000) return '你已经认识很多字，能读简单的故事';
  return '你的词汇量很丰富，能进行深入的讨论';
};

/**
 * 教新词
 */
export const teachWord = async (
  childId: string,
  word: string,
  definition: string,
  examples: string[] = [],
  addExperience: boolean = true // 是否增加经验值
): Promise<{ success: boolean; message: string }> => {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const child = conversations.find(c => c.id === childId);
    
    if (!child || !child.aiChildData) {
      return { success: false, message: '未找到AI儿童' };
    }
    
    const existingWord = child.aiChildData.vocabulary.find(w => w.word === word);
    
    if (existingWord) {
      // 复习旧词，提升熟悉度
      existingWord.familiarity = Math.min(100, existingWord.familiarity + 15);
      existingWord.reviewCount++;
      existingWord.lastReview = Date.now();
      existingWord.definition = definition; // 更新定义
      if (examples.length > 0) {
        existingWord.examples = [...existingWord.examples, ...examples];
      }
      
      return { 
        success: true, 
        message: `${word}的熟悉度提升到${existingWord.familiarity}%！` 
      };
    } else {
      // 学习新词
      const newWord: WordKnowledge = {
        word,
        familiarity: 30, // 首次学习30%熟悉度
        learnedAt: Date.now(),
        reviewCount: 0,
        lastReview: Date.now(),
        definition,
        examples
      };
      
      child.aiChildData.vocabulary.push(newWord);
      child.aiChildData.totalWordsLearned++;
      
      // 增加经验值（仅首轮）
      if (addExperience) {
        addExp(child, 10);
      }
      
      // 更新理解力（每学一个词都提升）
      updateComprehension(child.aiChildData);
      
      // 更新系统提示词
      if (child.characterSettings) {
        child.characterSettings.systemPrompt = buildAIChildSystemPrompt(
          child.aiChildData,
          child.name
        );
      }
      
      // 保存到conversations（用户可见）
      await smartSave('conversations', conversations);
      
      // 保存到AI记忆库（后台）
      await recordWordLearning(
        childId,
        word,
        definition,
        'wordcard', // 从词卡学习
        `用户教学：${definition}`
      );
      
      return { 
        success: true, 
        message: `学会了新词"${word}"！获得10点经验` 
      };
    }
  } catch (error) {
    console.error('教词失败:', error);
    return { success: false, message: '教学失败' };
  }
};

/**
 * 增加经验值
 */
const addExp = (child: Conversation, exp: number): void => {
  if (!child.aiChildData) return;
  
  child.aiChildData.exp += exp;
  
  // 检查升级
  while (child.aiChildData.exp >= child.aiChildData.expToNextLevel) {
    child.aiChildData.exp -= child.aiChildData.expToNextLevel;
    child.aiChildData.level++;
    child.aiChildData.expToNextLevel = Math.floor(child.aiChildData.expToNextLevel * 1.2);
    
    console.log(`🎉 ${child.name} 升级到 Level ${child.aiChildData.level}！`);
    
    // 检查成长阶段升级
    checkStageUpgrade(child.aiChildData);
    
    // 更新理解力（升级时也要更新）
    updateComprehension(child.aiChildData);
  }
};

/**
 * 检查成长阶段升级
 */
const checkStageUpgrade = (childData: AIChildData): void => {
  const wordCount = childData.vocabulary.length;
  
  if (childData.stage === 'baby' && wordCount >= 50) {
    childData.stage = 'toddler';
    console.log('🌟 成长阶段：婴儿 → 幼儿');
  } else if (childData.stage === 'toddler' && wordCount >= 200) {
    childData.stage = 'child';
    console.log('🌟 成长阶段：幼儿 → 儿童');
  } else if (childData.stage === 'child' && wordCount >= 1000) {
    childData.stage = 'teen';
    console.log('🌟 成长阶段：儿童 → 少年');
  }
};

/**
 * 更新理解力（分级制）
 * 每个能力有10个等级，每级需要更多词汇才能升级
 * 并且会影响AI的对话能力
 */
const updateComprehension = (childData: AIChildData): void => {
  const wordCount = childData.vocabulary.length;
  
  // === 总理解力等级 ===
  // 每10个词提升1%进度，100%后升级
  const totalProgress = (wordCount * 10) % 100;
  const totalLevel = Math.floor(wordCount / 10) + 1; // 每10词升1级
  childData.comprehension.level = Math.min(50, totalLevel); // 最高50级
  childData.comprehension.progress = totalProgress;
  
  // === 各项细分能力 ===
  // 每项能力有不同的成长速度和升级要求
  
  // 1️⃣ 字面理解：最基础，成长最快（每5词升1级）
  updateAbility(childData.comprehension.abilities.literal, wordCount, 5, 0);
  
  // 2️⃣ 上下文理解：需要词汇积累（每15词升1级，50词后开始）
  updateAbility(childData.comprehension.abilities.context, Math.max(0, wordCount - 50), 15, 1);
  
  // 3️⃣ 抽象理解：中等难度（每20词升1级，100词后开始）
  updateAbility(childData.comprehension.abilities.abstract, Math.max(0, wordCount - 100), 20, 1);
  
  // 4️⃣ 情感理解：需要较高词汇（每25词升1级，200词后开始）
  updateAbility(childData.comprehension.abilities.emotion, Math.max(0, wordCount - 200), 25, 1);
  
  // 5️⃣ 逻辑推理：最高级（每30词升1级，500词后开始）
  updateAbility(childData.comprehension.abilities.logic, Math.max(0, wordCount - 500), 30, 1);
};

/**
 * 更新单项能力
 * @param ability 能力对象
 * @param effectiveWords 有效词汇数（减去门槛后的）
 * @param wordsPerLevel 每级需要的词数
 * @param minLevel 最低等级
 */
const updateAbility = (
  ability: { level: number; progress: number },
  effectiveWords: number,
  wordsPerLevel: number,
  minLevel: number
): void => {
  if (effectiveWords <= 0) {
    ability.level = minLevel;
    ability.progress = 0;
    return;
  }
  
  const progressPerWord = 100 / wordsPerLevel; // 每个词增加的进度
  const totalProgress = effectiveWords * progressPerWord;
  const level = Math.floor(totalProgress / 100) + minLevel;
  const progress = totalProgress % 100;
  
  ability.level = Math.min(10, level); // 最高10级
  ability.progress = ability.level >= 10 ? 100 : progress;
};

/**
 * 记录课程
 */
export const recordLesson = async (
  childId: string,
  lessonType: Lesson['type'],
  content: string,
  wordsLearned: string[],
  userFeedback?: string,
  aiResponse?: string
): Promise<void> => {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const child = conversations.find(c => c.id === childId);
    
    if (!child || !child.aiChildData) return;
    
    const lesson: Lesson = {
      id: `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: lessonType,
      content,
      wordsLearned,
      timestamp: Date.now(),
      userFeedback,
      aiResponse
    };
    
    child.aiChildData.lessons.push(lesson);
    child.aiChildData.totalLessons++;
    child.aiChildData.lastLessonTime = Date.now();
    
    // 保存
    await smartSave('conversations', conversations);
  } catch (error) {
    console.error('记录课程失败:', error);
  }
};

/**
 * AI提问
 */
export const askQuestion = async (
  childId: string,
  question: string,
  category: Question['category']
): Promise<string> => {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const child = conversations.find(c => c.id === childId);
    
    if (!child || !child.aiChildData) return '';
    
    const questionRecord: Question = {
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      question,
      timestamp: Date.now(),
      category,
      resolved: false
    };
    
    child.aiChildData.questions.push(questionRecord);
    
    // 保存
    await smartSave('conversations', conversations);
    
    return questionRecord.id;
  } catch (error) {
    console.error('提问失败:', error);
    return '';
  }
};

/**
 * 回答问题
 */
export const answerQuestion = async (
  childId: string,
  questionId: string,
  answer: string
): Promise<void> => {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const child = conversations.find(c => c.id === childId);
    
    if (!child || !child.aiChildData) return;
    
    const question = child.aiChildData.questions.find(q => q.id === questionId);
    if (question) {
      question.answer = answer;
      question.resolved = true;
      
      // 增加经验值
      addExp(child, 5);
      
      // 保存
      await smartSave('conversations', conversations);
    }
  } catch (error) {
    console.error('回答问题失败:', error);
  }
};

/**
 * 获取AI儿童数据
 */
export const getAIChild = async (childId: string): Promise<Conversation | null> => {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const child = conversations.find(c => c.id === childId);
    return child || null;
  } catch (error) {
    console.error('获取AI儿童失败:', error);
    return null;
  }
};

/**
 * 获取所有AI儿童
 */
export const getAllAIChildren = async (): Promise<Conversation[]> => {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    return conversations.filter(c => c.aiChildData);
  } catch (error) {
    console.error('获取AI儿童列表失败:', error);
    return [];
  }
};

/**
 * 更新每日互动（天数+1）
 */
export const updateDailyInteraction = async (childId: string): Promise<void> => {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const child = conversations.find(c => c.id === childId);
    
    if (!child || !child.aiChildData) return;
    
    const lastInteraction = child.aiChildData.lastInteraction;
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    // 如果超过1天没互动，增加天数
    if (now - lastInteraction >= oneDayMs) {
      child.aiChildData.age++;
      child.aiChildData.lastInteraction = now;
      
      // 检查连续天数
      if (now - lastInteraction < oneDayMs * 2) {
        child.aiChildData.consecutiveDays++;
      } else {
        child.aiChildData.consecutiveDays = 1;
      }
      
      // 保存
      await smartSave('conversations', conversations);
      
      console.log(`📅 ${child.name} 成长了！现在${child.aiChildData.age}天大`);
    }
  } catch (error) {
    console.error('更新每日互动失败:', error);
  }
};
