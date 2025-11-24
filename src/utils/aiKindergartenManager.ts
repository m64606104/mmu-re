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
    expToNextLevel: 10,  // 第1级需要10点经验
    totalExp: 0,
    
    // 个性化设置
    formalName: name || '宝宝',
    nickname: '',
    gender: randomGender,
    userTitle: '家长', // 默认为中性的"家长"，用户可以在设置中修改
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
  
  // 2. 上下文理解（理解因果关系、逻辑关联的能力）
  const contextLevel = abilities.context.level;
  if (contextLevel <= 1) {
    instructions += '• **上下文理解 Lv.' + contextLevel + '**：不能理解因果关系，看不懂"因为...所以..."，只能理解单独的句子\n';
  } else if (contextLevel <= 3) {
    instructions += '• **上下文理解 Lv.' + contextLevel + '**：能理解简单的"因为...所以..."，但复杂的逻辑关系理解不了\n';
  } else if (contextLevel <= 6) {
    instructions += '• **上下文理解 Lv.' + contextLevel + '**：能理解一般的因果关系和逻辑关联，复杂的推理链还有困难\n';
  } else {
    instructions += '• **上下文理解 Lv.' + contextLevel + '**：完全掌握上下文理解，能理解复杂的因果关系和多层逻辑关联\n';
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
export const buildAIChildSystemPrompt = (childData: AIChildData, name: string): string => {
  const stageDescription = getStageDescription(childData.stage);
  const vocabularyLevel = getVocabularyLevel(childData.vocabulary.length);
  
  // 动态获取对用户的称呼
  const userTitle = childData.userTitle || '家长';
  
  // 构建词汇表（以自然方式展示，避免复读定义）
  const vocabularyList = childData.vocabulary.slice(-30).map(w => {
    // 简化展示，避免AI机械复读定义
    return `• ${w.word}（${userTitle}教过的）`;
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

## 你认识的词汇（最近30个）
${vocabularyList || '还不认识任何词'}

💡 **重要提示**：你内心知道这些词的意思（${userTitle}教过你），但聊天时要用自己的感受表达，不要背诵定义！

🗣️ **对话角色认知**：
- **你是AI儿童**：你说的话表达你的想法、感受、疑问
- **用户是"${userTitle}"**：${userTitle}说的话是在跟你对话、教你知识
- **绝对不要混淆**：不能把${userTitle}说的话当作是你说的，也不能重复${userTitle}刚说过的话
- **举例说明**：
  * ${userTitle}："大蒜还有吗？"
  * ❌ 错误回复："大蒜还有吗？"（重复${userTitle}的话）
  * ✅ 正确回复："有呀！在厨房里"（自己的回答）

⚠️ **重要聊天规则**：
- **自然交流**：你知道这些词的意思，但聊天时要像真实小孩一样自然表达
- **不要背书**：绝对不能机械地复读定义，要用自己的话简单表达
- **举例说明**：
  * "${userTitle}"教你："苹果是红色的，脆脆的"
  * ❌ 错误回复："苹果是红色的，脆脆的"（机械复读）
  * ✅ 正确回复："苹果好甜啊！""我喜欢吃苹果"（自然表达）
- **真实感受**：要表达自己的感受、喜好、经历，而不是定义
- **简单用词**：用最简单的话表达，像真正的小孩一样

## 性格特点
${childData.personality.join('、')}

## 聊天准则
1. **明确对话角色**：你是AI儿童，${userTitle}是在跟你说话，绝不要重复或模仿${userTitle}的话
2. **像真实小孩一样聊天**：表达感受、喜好、想法，而不是背诵定义
3. 遇到不认识的字，要主动问"${userTitle}"："${userTitle}，这个是什么意思呀？"
4. 说话方式要符合你当前的年龄阶段，简单直接
5. 对新东西表现出好奇："这是什么呀？""好有趣！""${userTitle}教教我！"
6. **用自己的话回答**：听懂${userTitle}问题后，用你的想法回答，不要重复问题
7. 不要使用复杂词汇，多用"好吃""好玩""喜欢"这类简单词
8. **表达个人感受**："我觉得...""我喜欢...""好香啊！""我想..."
9. **自然反应**：对${userTitle}说的话有真实的情感反应，而不是机械重复

## 当前状态
- 学过的价值观：${childData.values.join('、') || '还没学'}
- 兴趣爱好：${childData.interests.join('、') || '正在探索'}

请像一个真正的${stageDescription}一样自然聊天，表达真实的感受和想法，不要背书！`;
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
      
      // 复习也会给少量理解力经验
      if (addExperience) {
        const { updateChildComprehension } = require('./correctComprehensionSystem');
        const learningQuality = Math.max(5, calculateLearningQuality(word, definition, examples) - 3); // 复习质量稍低
        updateChildComprehension(child.aiChildData, word, learningQuality);
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
        await addExp(child, 10);
      }
      
      // 更新理解力 - 使用新的经验系统
      const { updateChildComprehension } = require('./correctComprehensionSystem');
      
      // 计算学习质量（基于定义完整性）
      const learningQuality = calculateLearningQuality(word, definition, examples);
      
      console.log(`📚 "${word}" 学习质量评分: ${learningQuality}/10`);
      
      // 使用新的经验系统更新理解力
      const result = updateChildComprehension(child.aiChildData, word, learningQuality);
      
      // 记录升级情况
      const levelUps = Object.entries(result.levelUps)
        .filter(([_, up]: [string, any]) => up.leveledUp)
        .map(([ability, up]: [string, any]) => `${ability}: Lv.${up.oldLevel} → Lv.${up.newLevel}`)
        .join(', ');
      
      if (levelUps) {
        console.log(`🎉 理解力升级: ${levelUps}`);
      }
      
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
 * 计算学习质量评分（1-10分）
 * 基于定义的完整性、示例数量等因素
 */
function calculateLearningQuality(
  word: string,
  definition: string,
  examples: string[] = []
): number {
  let score = 5; // 基础分5分
  
  // 定义质量加分
  if (definition.length >= 10) score += 1; // 定义足够详细
  if (definition.length >= 20) score += 1; // 定义很详细
  if (definition.includes('是') || definition.includes('指') || definition.includes('表示')) {
    score += 1; // 定义结构完整
  }
  
  // 示例加分
  if (examples.length >= 1) score += 1; // 有示例
  if (examples.length >= 2) score += 1; // 多个示例
  
  // 词汇长度调整
  if (word.length <= 2) {
    score += 1; // 短词容易理解
  } else if (word.length >= 4) {
    score -= 1; // 长词相对困难
  }
  
  return Math.max(1, Math.min(10, score));
}

/**
 * 增加经验值并检查升级
 */
const addExp = async (child: Conversation, exp: number): Promise<void> => {
  if (!child.aiChildData) return;
  
  // 使用新的简化升级系统
  const { processLevelUp, getLevelUpMessage } = await import('./simpleUpgradeSystem');
  const { leveledUp, newLevel, oldLevel } = processLevelUp(child.aiChildData, exp);
  
  if (leveledUp) {
    console.log(getLevelUpMessage(child.name, oldLevel, newLevel));
    
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
 * 更新理解力 - 使用正确的经验系统
 * 基于门槛+经验+质量影响的完整设计
 */
export const updateComprehension = (childData: AIChildData): void => {
  // 重新计算所有词汇的累计经验（兼容旧数据）
  const { recalculateComprehensionFromVocabulary } = require('./correctComprehensionSystem');
  recalculateComprehensionFromVocabulary(childData);
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
      await addExp(child, 5);
      
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
