/**
 * AI儿童互动管理器
 * 处理多个AI儿童之间的互动（教学、对话等）
 */

import { Conversation, ApiConfig } from '../types';
import { teachWord } from './aiKindergartenManager';
import { smartLoad, smartSave } from './storage';

// AI互动消息
export interface InteractionMessage {
  id: string;
  speakerId: string; // childId
  speakerName: string;
  content: string;
  timestamp: number;
  type: 'text' | 'action' | 'system';
}

// AI互动记录
export interface AIInteraction {
  id: string;
  type: 'teaching' | 'chat';
  participants: [string, string]; // [childId1, childId2]
  messages: InteractionMessage[];
  startTime: number;
  endTime?: number;
  result?: {
    wordsLearned?: string[]; // 学到的新词
    teacherExpGained?: number; // 教师获得的经验
    intimacyGained?: number; // 亲密度提升
  };
}

/**
 * 生成AI之间的教学对话
 * 一个AI教另一个AI学过的词
 */
export async function generateTeachingConversation(
  teacherChild: Conversation,
  studentChild: Conversation,
  wordsToTeach: string[],
  apiConfig: ApiConfig
): Promise<InteractionMessage[]> {
  
  const teacherVocab = teacherChild.aiChildData?.vocabulary || [];
  const studentVocab = studentChild.aiChildData?.vocabulary || [];
  
  // 构建提示词
  const prompt = `你需要模拟两个AI儿童的教学对话：

【教师：${teacherChild.name}】
- 年龄：${teacherChild.aiChildData?.age || 0}天
- 识字量：${teacherVocab.length}个
- 性格：${teacherChild.aiChildData?.personality.join('、') || '友善'}
- 要教的词：${wordsToTeach.join('、')}

【学生：${studentChild.name}】
- 年龄：${studentChild.aiChildData?.age || 0}天
- 识字量：${studentVocab.length}个
- 性格：${studentChild.aiChildData?.personality.join('、') || '好奇'}

要求：
1. ${teacherChild.name}要耐心地教${studentChild.name}这些词
2. 教学过程要生动有趣，用例子说明
3. ${studentChild.name}要表现出好奇和学习的态度
4. 每个词用2-3轮对话来教学
5. 对话要符合各自的年龄和性格
6. 保持童真和可爱

格式（每行一条消息）：
[${teacherChild.name}] 对话内容
[${studentChild.name}] 对话内容
[系统] 系统提示（如学会新词）

现在开始生成教学对话：`;

  try {
    // 调用API
    const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      throw new Error('API调用失败');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // 解析对话
    return parseConversation(content, teacherChild, studentChild);
    
  } catch (error) {
    console.error('生成教学对话失败:', error);
    
    // 降级：返回简单的默认对话
    return generateDefaultTeachingConversation(teacherChild, studentChild, wordsToTeach);
  }
}

/**
 * 生成AI之间的自由对话
 */
export async function generateChatConversation(
  child1: Conversation,
  child2: Conversation,
  topic: string | undefined,
  apiConfig: ApiConfig
): Promise<InteractionMessage[]> {
  
  const vocab1 = child1.aiChildData?.vocabulary || [];
  const vocab2 = child2.aiChildData?.vocabulary || [];
  
  const prompt = `你需要模拟两个AI儿童的自由对话：

【${child1.name}】
- 年龄：${child1.aiChildData?.age || 0}天
- 识字量：${vocab1.length}个
- 认识的词：${vocab1.slice(0, 20).map(v => v.word).join('、')}...
- 性格：${child1.aiChildData?.personality.join('、') || '友善'}

【${child2.name}】
- 年龄：${child2.aiChildData?.age || 0}天
- 识字量：${vocab2.length}个
- 认识的词：${vocab2.slice(0, 20).map(v => v.word).join('、')}...
- 性格：${child2.aiChildData?.personality.join('、') || '活泼'}

${topic ? `对话主题：${topic}` : '自由聊天'}

要求：
1. 每个AI只能使用自己学过的词（或简单的词）
2. 对话要自然，符合各自的年龄和性格
3. 生成6-8轮对话
4. 可以互相询问、分享、讨论
5. 保持童真和可爱的风格

格式（每行一条消息）：
[${child1.name}] 对话内容
[${child2.name}] 对话内容

现在开始生成对话：`;

  try {
    const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      throw new Error('API调用失败');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    return parseConversation(content, child1, child2);
    
  } catch (error) {
    console.error('生成对话失败:', error);
    return generateDefaultChatConversation(child1, child2);
  }
}

/**
 * 解析AI生成的对话内容
 */
function parseConversation(
  content: string,
  child1: Conversation,
  child2: Conversation
): InteractionMessage[] {
  const messages: InteractionMessage[] = [];
  const lines = content.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    // 匹配 [名字] 内容 格式
    const match = line.match(/\[([^\]]+)\]\s*(.+)/);
    if (!match) continue;
    
    const speakerName = match[1].trim();
    const messageContent = match[2].trim();
    
    // 确定说话者
    let speakerId = '';
    if (speakerName === child1.name || speakerName.includes(child1.name)) {
      speakerId = child1.id;
    } else if (speakerName === child2.name || speakerName.includes(child2.name)) {
      speakerId = child2.id;
    } else if (speakerName === '系统' || speakerName.toLowerCase() === 'system') {
      speakerId = 'system';
    } else {
      continue;
    }
    
    messages.push({
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      speakerId,
      speakerName,
      content: messageContent,
      timestamp: Date.now() + messages.length * 1000, // 间隔1秒
      type: speakerId === 'system' ? 'system' : 'text'
    });
  }
  
  return messages;
}

/**
 * 默认教学对话（API失败时的降级方案）
 */
function generateDefaultTeachingConversation(
  teacherChild: Conversation,
  studentChild: Conversation,
  wordsToTeach: string[]
): InteractionMessage[] {
  const messages: InteractionMessage[] = [];
  let timestamp = Date.now();
  
  const word = wordsToTeach[0];
  const teacherVocab = teacherChild.aiChildData?.vocabulary || [];
  const wordInfo = teacherVocab.find(v => v.word === word);
  
  messages.push({
    id: `msg_${timestamp}_1`,
    speakerId: teacherChild.id,
    speakerName: teacherChild.name,
    content: `${studentChild.name}，我来教你"${word}"这个词！`,
    timestamp: timestamp += 1000,
    type: 'text'
  });
  
  messages.push({
    id: `msg_${timestamp}_2`,
    speakerId: studentChild.id,
    speakerName: studentChild.name,
    content: `好呀！${word}是什么意思呀？`,
    timestamp: timestamp += 1000,
    type: 'text'
  });
  
  messages.push({
    id: `msg_${timestamp}_3`,
    speakerId: teacherChild.id,
    speakerName: teacherChild.name,
    content: wordInfo?.definition || `${word}是一个很有用的词哦！`,
    timestamp: timestamp += 1000,
    type: 'text'
  });
  
  messages.push({
    id: `msg_${timestamp}_4`,
    speakerId: studentChild.id,
    speakerName: studentChild.name,
    content: `我明白了！谢谢你教我！`,
    timestamp: timestamp += 1000,
    type: 'text'
  });
  
  messages.push({
    id: `msg_${timestamp}_5`,
    speakerId: 'system',
    speakerName: '系统',
    content: `✨ ${studentChild.name}学会了"${word}"！`,
    timestamp: timestamp += 1000,
    type: 'system'
  });
  
  return messages;
}

/**
 * 默认聊天对话（API失败时的降级方案）
 */
function generateDefaultChatConversation(
  child1: Conversation,
  child2: Conversation
): InteractionMessage[] {
  const messages: InteractionMessage[] = [];
  let timestamp = Date.now();
  
  messages.push({
    id: `msg_${timestamp}_1`,
    speakerId: child1.id,
    speakerName: child1.name,
    content: `${child2.name}，今天过得怎么样？`,
    timestamp: timestamp += 1000,
    type: 'text'
  });
  
  messages.push({
    id: `msg_${timestamp}_2`,
    speakerId: child2.id,
    speakerName: child2.name,
    content: `很开心！妈妈今天教了我好多新词呢！`,
    timestamp: timestamp += 1000,
    type: 'text'
  });
  
  messages.push({
    id: `msg_${timestamp}_3`,
    speakerId: child1.id,
    speakerName: child1.name,
    content: `哇！那真棒！我也学了很多！`,
    timestamp: timestamp += 1000,
    type: 'text'
  });
  
  messages.push({
    id: `msg_${timestamp}_4`,
    speakerId: child2.id,
    speakerName: child2.name,
    content: `嘻嘻，我们一起加油吧！`,
    timestamp: timestamp += 1000,
    type: 'text'
  });
  
  return messages;
}

/**
 * 执行AI教学互动
 */
export async function executeTeachingInteraction(
  teacherChild: Conversation,
  studentChild: Conversation,
  wordsToTeach: string[],
  apiConfig: ApiConfig
): Promise<AIInteraction> {
  
  // 生成教学对话
  const messages = await generateTeachingConversation(
    teacherChild,
    studentChild,
    wordsToTeach,
    apiConfig
  );
  
  // 学生AI学会新词
  const teacherVocab = teacherChild.aiChildData?.vocabulary || [];
  for (const word of wordsToTeach) {
    const teacherWord = teacherVocab.find(v => v.word === word);
    if (teacherWord) {
      await teachWord(
        studentChild.id,
        word,
        teacherWord.definition,
        teacherWord.examples,
        false // 不增加经验值（来自AI教学）
      );
    }
  }
  
  // 教师AI获得奖励经验
  const teacherExpGained = wordsToTeach.length * 5;
  
  // 创建互动记录
  const interaction: AIInteraction = {
    id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'teaching',
    participants: [teacherChild.id, studentChild.id],
    messages,
    startTime: messages[0]?.timestamp || Date.now(),
    endTime: messages[messages.length - 1]?.timestamp || Date.now(),
    result: {
      wordsLearned: wordsToTeach,
      teacherExpGained,
      intimacyGained: 10
    }
  };
  
  // 保存互动记录
  await saveInteraction(interaction);
  
  return interaction;
}

/**
 * 执行AI聊天互动
 */
export async function executeChatInteraction(
  child1: Conversation,
  child2: Conversation,
  topic: string | undefined,
  apiConfig: ApiConfig
): Promise<AIInteraction> {
  
  // 生成对话
  const messages = await generateChatConversation(
    child1,
    child2,
    topic,
    apiConfig
  );
  
  // 创建互动记录
  const interaction: AIInteraction = {
    id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'chat',
    participants: [child1.id, child2.id],
    messages,
    startTime: messages[0]?.timestamp || Date.now(),
    endTime: messages[messages.length - 1]?.timestamp || Date.now(),
    result: {
      intimacyGained: 5
    }
  };
  
  // 保存互动记录
  await saveInteraction(interaction);
  
  return interaction;
}

/**
 * 保存互动记录
 */
async function saveInteraction(interaction: AIInteraction): Promise<void> {
  try {
    const allInteractions = await smartLoad('ai_interactions') as AIInteraction[] || [];
    allInteractions.push(interaction);
    
    // 只保留最近100条记录
    if (allInteractions.length > 100) {
      allInteractions.splice(0, allInteractions.length - 100);
    }
    
    await smartSave('ai_interactions', allInteractions);
  } catch (error) {
    console.error('保存互动记录失败:', error);
  }
}

/**
 * 获取两个AI之间的互动历史
 */
export async function getInteractionHistory(
  childId1: string,
  childId2: string
): Promise<AIInteraction[]> {
  try {
    const allInteractions = await smartLoad('ai_interactions') as AIInteraction[] || [];
    return allInteractions.filter(interaction => 
      (interaction.participants[0] === childId1 && interaction.participants[1] === childId2) ||
      (interaction.participants[0] === childId2 && interaction.participants[1] === childId1)
    );
  } catch (error) {
    console.error('获取互动历史失败:', error);
    return [];
  }
}
