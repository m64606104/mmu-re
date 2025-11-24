/**
 * 群聊对话连续性分析器
 * 智能判断对话是否应该继续，提升多轮对话的自然度
 */

import { GroupAIReply } from './groupChatService';

export interface ContinuationAnalysis {
  shouldContinue: boolean;
  confidence: number; // 0-1，置信度
  reason: string;
  suggestedParticipants?: number; // 建议下一轮参与AI数量
}

/**
 * 智能分析对话是否应该继续
 */
export const analyzeConversationContinuation = (
  replies: GroupAIReply[],
  currentRound: number,
  maxRounds: number,
  groupMembers: any[]
): ContinuationAnalysis => {
  
  if (replies.length === 0) {
    return {
      shouldContinue: false,
      confidence: 1.0,
      reason: '本轮无AI参与',
      suggestedParticipants: 0
    };
  }
  
  const allContent = replies
    .flatMap(r => r.messages)
    .map(m => m.content)
    .join(' ')
    .toLowerCase();
  
  // 1. 检测明确的结束信号
  const endScore = analyzeEndSignals(allContent);
  if (endScore > 0.8) {
    return {
      shouldContinue: false,
      confidence: endScore,
      reason: '检测到明确的结束信号',
      suggestedParticipants: 0
    };
  }
  
  // 2. 检测话题活跃度
  const topicScore = analyzeTopicActivity(allContent, replies);
  
  // 3. 检测互动性
  const interactionScore = analyzeInteraction(replies);
  
  // 4. 检测问题和回应
  const questionScore = analyzeQuestions(allContent);
  
  // 5. 轮次因素
  const roundScore = analyzeRoundFactor(currentRound, maxRounds);
  
  // 综合评分
  const continuationScore = (
    topicScore * 0.3 + 
    interactionScore * 0.25 + 
    questionScore * 0.2 + 
    roundScore * 0.25
  );
  
  const shouldContinue = continuationScore > 0.4 && endScore < 0.5;
  const confidence = Math.abs(continuationScore - 0.5) * 2; // 转换为置信度
  
  // 建议参与者数量
  let suggestedParticipants = 1;
  if (continuationScore > 0.7) {
    suggestedParticipants = Math.min(3, Math.ceil(groupMembers.length * 0.6));
  } else if (continuationScore > 0.5) {
    suggestedParticipants = Math.min(2, Math.ceil(groupMembers.length * 0.4));
  }
  
  return {
    shouldContinue,
    confidence,
    reason: shouldContinue ? 
      `对话活跃度${(continuationScore * 100).toFixed(0)}%，建议继续` :
      `对话活跃度${(continuationScore * 100).toFixed(0)}%，自然结束`,
    suggestedParticipants
  };
};

/**
 * 分析结束信号
 */
const analyzeEndSignals = (content: string): number => {
  const strongEndSignals = [
    '再见', 'bye', '拜拜', '88', 'goodbye',
    '先这样', '先忙了', '去忙了', '有事先走了',
    '改天聊', '下次聊', '今天就到这',
    '要睡了', '该睡了', '晚安'
  ];
  
  const mediumEndSignals = [
    '好的，就这样', '好了', '就这样吧',
    '明白了', '知道了', '了解', '收到',
    '没事了', '没问题了', '解决了',
    '谢谢', '多谢', 'thanks'
  ];
  
  const weakEndSignals = [
    '嗯嗯', '好吧', '行', '可以',
    '是的', '对', '没错'
  ];
  
  let score = 0;
  
  for (const signal of strongEndSignals) {
    if (content.includes(signal)) {
      score += 0.8;
    }
  }
  
  for (const signal of mediumEndSignals) {
    if (content.includes(signal)) {
      score += 0.5;
    }
  }
  
  for (const signal of weakEndSignals) {
    if (content.includes(signal)) {
      score += 0.2;
    }
  }
  
  return Math.min(score, 1.0);
};

/**
 * 分析话题活跃度
 */
const analyzeTopicActivity = (content: string, replies: GroupAIReply[]): number => {
  // 检测新话题引入
  const topicIntroducers = [
    '对了', '还有', '另外', '顺便说一下',
    '我想到', '我记得', '说起', '提到',
    '你们觉得', '大家觉得', '我觉得',
    '不过', '但是', '另外一个'
  ];
  
  // 检测互动词汇
  const interactiveWords = [
    '你觉得', '你认为', '你说', '你们',
    '我们', '大家', '一起', '共同',
    '怎么样', '如何', '什么', '哪个',
    '为什么', '怎么', '什么时候', '哪里'
  ];
  
  let score = 0.3; // 基础分
  
  // 新话题加分
  for (const introducer of topicIntroducers) {
    if (content.includes(introducer)) {
      score += 0.2;
    }
  }
  
  // 互动词汇加分
  for (const word of interactiveWords) {
    if (content.includes(word)) {
      score += 0.1;
    }
  }
  
  // 长度因素（更长的回复通常更有内容）
  const avgLength = content.length / replies.length;
  if (avgLength > 50) score += 0.1;
  if (avgLength > 100) score += 0.1;
  
  return Math.min(score, 1.0);
};

/**
 * 分析互动性
 */
const analyzeInteraction = (replies: GroupAIReply[]): number => {
  let score = 0.2; // 基础分
  
  // 多个AI参与加分
  if (replies.length >= 2) score += 0.3;
  if (replies.length >= 3) score += 0.2;
  
  // 检测AI之间的互动
  const allContent = replies
    .flatMap(r => r.messages)
    .map(m => m.content)
    .join(' ');
  
  // 互相回应的信号
  const responseSignals = [
    '同意', '不同意', '我觉得', '我认为',
    '赞成', '反对', '支持', '补充',
    '对啊', '是的', '没错', '确实',
    '不对', '不是', '但是', '不过'
  ];
  
  for (const signal of responseSignals) {
    if (allContent.includes(signal)) {
      score += 0.1;
    }
  }
  
  return Math.min(score, 1.0);
};

/**
 * 分析问题和回应
 */
const analyzeQuestions = (content: string): number => {
  let score = 0.2; // 基础分
  
  // 检测问句
  const questionMarkers = ['?', '？', '吗', '呢', '什么', '哪', '怎么', '为什么', '如何'];
  let questionCount = 0;
  
  for (const marker of questionMarkers) {
    if (content.includes(marker)) {
      questionCount++;
    }
  }
  
  // 问题越多，继续的可能性越大
  if (questionCount >= 1) score += 0.3;
  if (questionCount >= 2) score += 0.2;
  if (questionCount >= 3) score += 0.1;
  
  return Math.min(score, 1.0);
};

/**
 * 分析轮次因素
 */
const analyzeRoundFactor = (currentRound: number, maxRounds: number): number => {
  // 第一轮继续的概率最高，之后递减
  const roundRatio = currentRound / maxRounds;
  
  if (roundRatio <= 0.33) return 0.8; // 前1/3轮次
  if (roundRatio <= 0.67) return 0.6; // 中间1/3轮次
  return 0.3; // 后1/3轮次
};

/**
 * 智能选择下一轮参与AI数量
 */
export const selectNextRoundParticipants = (
  allAIMembers: any[],
  suggestedCount: number,
  previousReplies: GroupAIReply[]
): any[] => {
  if (suggestedCount === 0) return [];
  
  // 获取上一轮参与的AI
  const previousParticipants = new Set(
    previousReplies.map(r => r.aiId)
  );
  
  // 策略：优先选择未参与的AI，然后是之前参与的AI
  const notParticipated = allAIMembers.filter(ai => !previousParticipants.has(ai.id));
  const participated = allAIMembers.filter(ai => previousParticipants.has(ai.id));
  
  const candidates = [...notParticipated, ...participated];
  
  // 随机选择，但倾向于多样化
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(suggestedCount, candidates.length));
};

/**
 * 分析对话主题变化
 */
export const analyzeTopicShift = (
  currentReplies: GroupAIReply[],
  previousReplies: GroupAIReply[]
): { hasShifted: boolean; shiftIntensity: number } => {
  if (previousReplies.length === 0) {
    return { hasShifted: false, shiftIntensity: 0 };
  }
  
  const currentContent = currentReplies
    .flatMap(r => r.messages)
    .map(m => m.content)
    .join(' ');
  
  const previousContent = previousReplies
    .flatMap(r => r.messages)
    .map(m => m.content)
    .join(' ');
  
  // 简单的关键词重叠分析
  const currentWords = extractKeywords(currentContent);
  const previousWords = extractKeywords(previousContent);
  
  const overlap = currentWords.filter(word => previousWords.includes(word));
  const overlapRatio = overlap.length / Math.max(currentWords.length, 1);
  
  const shiftIntensity = 1 - overlapRatio;
  const hasShifted = shiftIntensity > 0.7; // 70%以上的词汇变化认为是话题转换
  
  return { hasShifted, shiftIntensity };
};

/**
 * 提取关键词（简化版）
 */
const extractKeywords = (content: string): string[] => {
  // 过滤常用词
  const stopWords = ['的', '了', '在', '是', '我', '你', '他', '她', '它', '这', '那', '和', '与', '或', '但', '不', '没', '有', '也', '都', '很', '更', '最'];
  
  const words = content
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ') // 只保留中文、英文、数字
    .split(/\s+/)
    .filter(word => word.length >= 2 && !stopWords.includes(word));
  
  return [...new Set(words)]; // 去重
};
