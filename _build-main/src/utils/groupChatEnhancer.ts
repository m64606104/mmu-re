/**
 * 群聊体验增强器
 * 提供额外的群聊优化功能，改善多轮对话体验
 */

// 群聊体验增强器所需的类型由groupChatService提供
import { GroupAIReply } from './groupChatService';

export interface GroupChatMetrics {
  totalRounds: number;
  totalAIReplies: number;
  averageRoundParticipation: number;
  conversationLength: number;
  topicDiversity: number;
  interactionQuality: number;
}

/**
 * 分析群聊质量指标
 */
export const analyzeGroupChatQuality = (
  allReplies: GroupAIReply[],
  rounds: number
): GroupChatMetrics => {
  if (allReplies.length === 0) {
    return {
      totalRounds: rounds,
      totalAIReplies: 0,
      averageRoundParticipation: 0,
      conversationLength: 0,
      topicDiversity: 0,
      interactionQuality: 0
    };
  }

  // 计算平均每轮参与度
  const averageRoundParticipation = allReplies.length / Math.max(rounds, 1);
  
  // 计算对话总长度
  const conversationLength = allReplies
    .flatMap(r => r.messages)
    .reduce((total, msg) => total + msg.content.length, 0);
  
  // 计算话题多样性（基于不同AI的参与）
  const uniqueParticipants = new Set(allReplies.map(r => r.aiId)).size;
  const topicDiversity = uniqueParticipants / Math.max(allReplies.length, 1);
  
  // 计算互动质量（基于回复内容的丰富程度）
  const avgReplyLength = conversationLength / allReplies.length;
  const interactionQuality = Math.min(avgReplyLength / 100, 1); // 标准化到0-1
  
  return {
    totalRounds: rounds,
    totalAIReplies: allReplies.length,
    averageRoundParticipation,
    conversationLength,
    topicDiversity,
    interactionQuality
  };
};

/**
 * 生成群聊总结
 */
export const generateGroupChatSummary = (
  allReplies: GroupAIReply[],
  rounds: number
): string => {
  const metrics = analyzeGroupChatQuality(allReplies, rounds);
  
  if (allReplies.length === 0) {
    return '💤 本次群聊无AI参与回复';
  }
  
  const participantNames = [...new Set(allReplies.map(r => r.aiName))];
  const summary = [
    `🎯 群聊完成：共${rounds}轮，${allReplies.length}条AI回复`,
    `👥 参与成员：${participantNames.join('、')}`,
    `📊 平均参与度：每轮${metrics.averageRoundParticipation.toFixed(1)}人`,
    `💬 对话长度：${metrics.conversationLength}字符`,
    `🎭 多样性评分：${(metrics.topicDiversity * 100).toFixed(0)}%`,
    `⭐ 互动质量：${(metrics.interactionQuality * 100).toFixed(0)}%`
  ];
  
  return summary.join('\n');
};

/**
 * 优化群聊消息显示延迟
 * 根据消息长度和位置调整显示时间
 */
export const calculateOptimalDelay = (
  messageContent: string,
  position: number
): number => {
  // 基础延迟
  let delay = 200;
  
  // 根据消息长度调整
  const contentLength = messageContent.length;
  if (contentLength > 100) delay += 100;
  if (contentLength > 200) delay += 100;
  
  // 根据轮次内位置调整
  if (position === 0) {
    // 第一个AI：较短延迟
    delay = Math.max(delay * 0.7, 100);
  } else {
    // 后续AI：递增延迟
    delay += position * 150;
  }
  
  // 限制最大延迟
  return Math.min(delay, 800);
};

/**
 * 检测并标记AI之间的互动关系
 */
export const detectAIInteractions = (allReplies: GroupAIReply[]): Array<{
  fromAI: string;
  toAI: string;
  interactionType: 'response' | 'question' | 'agreement' | 'disagreement';
  confidence: number;
}> => {
  const interactions: Array<{
    fromAI: string;
    toAI: string;
    interactionType: 'response' | 'question' | 'agreement' | 'disagreement';
    confidence: number;
  }> = [];
  
  for (let i = 1; i < allReplies.length; i++) {
    const currentReply = allReplies[i];
    const previousReply = allReplies[i - 1];
    
    if (currentReply.aiId === previousReply.aiId) continue; // 跳过同一AI的连续回复
    
    const currentContent = currentReply.messages.map(m => m.content).join(' ').toLowerCase();
    
    // 检测回应关系
    if (detectResponse(currentContent)) {
      interactions.push({
        fromAI: currentReply.aiName,
        toAI: previousReply.aiName,
        interactionType: 'response',
        confidence: 0.7
      });
    }
    
    // 检测问答关系
    if (detectQuestion(currentContent)) {
      interactions.push({
        fromAI: currentReply.aiName,
        toAI: previousReply.aiName,
        interactionType: 'question',
        confidence: 0.6
      });
    }
    
    // 检测同意/反对
    if (detectAgreement(currentContent)) {
      interactions.push({
        fromAI: currentReply.aiName,
        toAI: previousReply.aiName,
        interactionType: 'agreement',
        confidence: 0.8
      });
    } else if (detectDisagreement(currentContent)) {
      interactions.push({
        fromAI: currentReply.aiName,
        toAI: previousReply.aiName,
        interactionType: 'disagreement',
        confidence: 0.8
      });
    }
  }
  
  return interactions;
};

/**
 * 检测回应关系
 */
const detectResponse = (current: string): boolean => {
  const responseIndicators = ['是的', '对', '没错', '确实', '我觉得', '我认为', '关于', '说到'];
  return responseIndicators.some(indicator => current.includes(indicator));
};

/**
 * 检测问题
 */
const detectQuestion = (content: string): boolean => {
  return content.includes('?') || content.includes('？') || 
         content.includes('吗') || content.includes('呢') ||
         content.includes('什么') || content.includes('怎么') ||
         content.includes('为什么') || content.includes('如何');
};

/**
 * 检测同意
 */
const detectAgreement = (content: string): boolean => {
  const agreementWords = ['同意', '赞成', '支持', '对啊', '是的', '没错', '确实', '我也觉得'];
  return agreementWords.some(word => content.includes(word));
};

/**
 * 检测反对
 */
const detectDisagreement = (content: string): boolean => {
  const disagreementWords = ['不同意', '不对', '不是', '反对', '但是', '不过', '我觉得不'];
  return disagreementWords.some(word => content.includes(word));
};

/**
 * 智能分配AI回复时间
 * 避免所有AI同时回复，营造更自然的对话节奏
 */
export const distributeReplyTiming = (
  selectedAIs: any[],
  baseDelay: number = 300
): Array<{ aiId: string; delay: number }> => {
  if (selectedAIs.length <= 1) {
    return selectedAIs.map(ai => ({ aiId: ai.id, delay: baseDelay }));
  }
  
  const distribution: Array<{ aiId: string; delay: number }> = [];
  
  // 第一个AI最快回复
  distribution.push({
    aiId: selectedAIs[0].id,
    delay: baseDelay
  });
  
  // 后续AI递增延迟，添加随机性
  for (let i = 1; i < selectedAIs.length; i++) {
    const incrementalDelay = baseDelay + (i * 200) + (Math.random() * 200 - 100);
    distribution.push({
      aiId: selectedAIs[i].id,
      delay: Math.max(incrementalDelay, baseDelay)
    });
  }
  
  return distribution;
};

/**
 * 评估对话的自然度
 */
export const evaluateConversationNaturalness = (
  allReplies: GroupAIReply[]
): { score: number; feedback: string } => {
  if (allReplies.length === 0) {
    return { score: 0, feedback: '无对话内容' };
  }
  
  let score = 50; // 基础分
  const feedback: string[] = [];
  
  // 参与度评分
  const uniqueParticipants = new Set(allReplies.map(r => r.aiId)).size;
  const participationRatio = uniqueParticipants / Math.max(allReplies.length, 1);
  if (participationRatio > 0.7) {
    score += 20;
    feedback.push('参与度高');
  } else if (participationRatio > 0.4) {
    score += 10;
    feedback.push('参与度适中');
  } else {
    feedback.push('参与度偏低');
  }
  
  // 互动质量评分
  const interactions = detectAIInteractions(allReplies);
  if (interactions.length > 0) {
    score += Math.min(interactions.length * 5, 20);
    feedback.push(`检测到${interactions.length}个互动`);
  }
  
  // 对话长度评分
  const avgLength = allReplies
    .flatMap(r => r.messages)
    .reduce((total, msg) => total + msg.content.length, 0) / allReplies.length;
  
  if (avgLength > 50) {
    score += 10;
    feedback.push('回复内容丰富');
  }
  
  return {
    score: Math.min(score, 100),
    feedback: feedback.join('，')
  };
};
