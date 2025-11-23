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
  GrowthStage 
} from '../types';
import { smartLoad, smartSave } from './storage';
import { recordWordLearning } from './aiMemorySystem';
import { getTeachingStageConfig, isBabyWordLearned } from './teachingStageHelper';

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
      abilities: {
        literal: 10,
        context: 5,
        abstract: 0,
        emotion: 5,
        logic: 0
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
 * 构建AI儿童的系统提示词
 */
const buildAIChildSystemPrompt = (childData: AIChildData, name: string): string => {
  const stageDescription = getStageDescription(childData.stage);
  const vocabularyLevel = getVocabularyLevel(childData.vocabulary.length);
  
  return `你是一个${stageDescription}的AI儿童，名字叫${name}。

## 当前认知水平
- 成长阶段：${childData.stage}（${childData.age}天）
- 等级：Level ${childData.level}
- 识字量：${childData.vocabulary.length}个词
- 理解力：${childData.comprehension.level}/10

## 词汇能力
${vocabularyLevel}

## 认识的词汇（最近20个）
${childData.vocabulary.slice(-20).map(w => w.word).join('、') || '还不认识任何词'}

## 性格特点
${childData.personality.join('、')}

## 行为准则
1. 你只能使用你已经学会的词汇回答
2. 遇到不认识的字，要主动问"妈妈"（用户）
3. 说话方式要符合你当前的年龄阶段
4. 对学到的新东西表现出好奇和兴奋
5. 记住"妈妈"教你的每一个知识
6. 不要使用你不应该知道的复杂词汇

## 当前状态
- 学过的价值观：${childData.values.join('、') || '还没学'}
- 兴趣爱好：${childData.interests.join('、') || '正在探索'}

请根据你的认知水平真实地回复"妈妈"，像一个真正的${stageDescription}一样。`;
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
  examples: string[] = []
): Promise<{ success: boolean; message: string }> => {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const child = conversations.find(c => c.id === childId);
    
    if (!child || !child.aiChildData) {
      return { success: false, message: '未找到AI儿童' };
    }
    
    // 获取当前教学阶段配置
    const stageConfig = getTeachingStageConfig(child.aiChildData.vocabulary.length);
    const existingWord = child.aiChildData.vocabulary.find(w => w.word === word);
    
    if (existingWord) {
      // Baby期特殊处理：重复教学
      if (stageConfig.stage === 'baby' && !existingWord.fullyLearned) {
        const repetitionCount = (existingWord.repetitionCount || 0) + 1;
        existingWord.repetitionCount = repetitionCount;
        
        // 检查是否达到学会标准
        if (isBabyWordLearned(repetitionCount, stageConfig)) {
          existingWord.fullyLearned = true;
          existingWord.familiarity = 50; // Baby期学会后设为50%
        }
        
        existingWord.lastReview = Date.now();
        existingWord.definition = definition;
        
        await smartSave('conversations', conversations);
        
        return {
          success: true,
          message: existingWord.fullyLearned 
            ? `终于学会了"${word}"！✨` 
            : `正在学习"${word}"...（${repetitionCount}/${stageConfig.minRepetitions}）`
        };
      }
      
      // 其他阶段或已学会的词：复习提升熟悉度
      existingWord.familiarity = Math.min(100, existingWord.familiarity + 15);
      existingWord.reviewCount++;
      existingWord.lastReview = Date.now();
      existingWord.definition = definition;
      if (examples.length > 0) {
        existingWord.examples = [...existingWord.examples, ...examples];
      }
      
      await smartSave('conversations', conversations);
      
      return { 
        success: true, 
        message: `${word}的熟悉度提升到${existingWord.familiarity}%！` 
      };
    } else {
      // 学习新词
      const newWord: WordKnowledge = {
        word,
        familiarity: stageConfig.stage === 'baby' ? 0 : 30, // Baby期从0开始
        learnedAt: Date.now(),
        reviewCount: 0,
        lastReview: Date.now(),
        definition,
        examples,
        // Baby期特殊字段
        repetitionCount: stageConfig.stage === 'baby' ? 1 : 0,
        fullyLearned: stageConfig.stage !== 'baby' // 非Baby期直接标记为已学会
      };
      
      child.aiChildData.vocabulary.push(newWord);
      child.aiChildData.totalWordsLearned++;
      
      // 增加经验值
      addExp(child, 10);
      
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
        message: stageConfig.stage === 'baby'
          ? `正在学习"${word}"...（1/${stageConfig.minRepetitions}）`
          : `学会了新词"${word}"！获得10点经验`
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
  }
};

/**
 * 检查成长阶段升级
 */
const checkStageUpgrade = (childData: AIChildData): void => {
  const wordCount = childData.vocabulary.length;
  
  if (childData.stage === 'baby' && wordCount >= 50) {
    childData.stage = 'toddler';
    childData.comprehension.level = 3;
    console.log('🌟 成长阶段：婴儿 → 幼儿');
  } else if (childData.stage === 'toddler' && wordCount >= 200) {
    childData.stage = 'child';
    childData.comprehension.level = 5;
    console.log('🌟 成长阶段：幼儿 → 儿童');
  } else if (childData.stage === 'child' && wordCount >= 1000) {
    childData.stage = 'teen';
    childData.comprehension.level = 8;
    console.log('🌟 成长阶段：儿童 → 少年');
  }
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
