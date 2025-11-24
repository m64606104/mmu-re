/**
 * 🧪 AI儿童对话测试工具
 * 测试AI儿童是否能正确区分用户和自己的话
 */

/**
 * 检测AI回复是否重复用户的话
 */
export const detectUserMessageRepeat = (userMessage: string, aiReply: string): {
  hasRepeat: boolean;
  confidence: number;
  details: string[];
} => {
  const userText = userMessage.trim().toLowerCase();
  const aiText = aiReply.trim().toLowerCase();
  
  const details: string[] = [];
  let repeatScore = 0;
  
  // 1. 完全重复检测
  if (aiText.includes(userText)) {
    repeatScore += 0.8;
    details.push(`完全重复用户话语: "${userMessage}"`);
  }
  
  // 2. 疑问句重复检测（最常见的问题）
  if (userMessage.includes('？') || userMessage.includes('?')) {
    const userQuestion = userMessage.replace(/[？?]/g, '');
    if (aiText.includes(userQuestion.toLowerCase())) {
      repeatScore += 0.6;
      details.push(`重复用户问题: "${userQuestion}"`);
    }
  }
  
  // 3. 关键词重复检测
  const userWords = userText.split(/\s+/).filter(w => w.length > 1);
  const aiWords = aiText.split(/\s+/);
  
  let matchingWords = 0;
  for (const userWord of userWords) {
    if (aiWords.includes(userWord) && userWord.length > 1) {
      matchingWords++;
    }
  }
  
  if (userWords.length > 0) {
    const wordMatchRatio = matchingWords / userWords.length;
    if (wordMatchRatio > 0.7) {
      repeatScore += 0.4;
      details.push(`高比例重复关键词 (${Math.round(wordMatchRatio * 100)}%)`);
    }
  }
  
  // 4. 句式结构重复检测
  if (userMessage.startsWith('现在') && aiReply.includes('现在')) {
    repeatScore += 0.3;
    details.push('重复用户句式开头');
  }
  
  if (userMessage.includes('还有') && aiReply.includes('还有')) {
    repeatScore += 0.3;
    details.push('重复用户关键短语');
  }
  
  return {
    hasRepeat: repeatScore > 0.5,
    confidence: Math.min(repeatScore, 1.0),
    details
  };
};

/**
 * 检测AI回复是否过于机械（背书式）
 */
export const detectMechanicalResponse = (aiReply: string): {
  isMechanical: boolean;
  confidence: number;
  details: string[];
} => {
  const text = aiReply.trim();
  const details: string[] = [];
  let mechanicalScore = 0;
  
  // 1. 定义句式检测
  const definitionPatterns = [
    /是一种/,
    /用来.*的/,
    /可以.*不能/,
    /主要是/,
    /通常是/,
    /一般来说/
  ];
  
  for (const pattern of definitionPatterns) {
    if (pattern.test(text)) {
      mechanicalScore += 0.3;
      details.push(`包含定义句式: ${pattern.source}`);
    }
  }
  
  // 2. 教科书用词检测
  const textbookWords = ['主要', '通常', '一般', '主要是', '可以说', '所谓', '即是'];
  for (const word of textbookWords) {
    if (text.includes(word)) {
      mechanicalScore += 0.2;
      details.push(`使用教科书用词: "${word}"`);
    }
  }
  
  // 3. 缺乏情感表达
  const emotionWords = ['好', '喜欢', '开心', '高兴', '想', '觉得', '香', '甜', '有趣'];
  const hasEmotion = emotionWords.some(word => text.includes(word));
  if (!hasEmotion && text.length > 10) {
    mechanicalScore += 0.4;
    details.push('缺乏情感表达词汇');
  }
  
  // 4. 复杂句式检测
  if (text.includes('，') && text.includes('。') && text.length > 20) {
    mechanicalScore += 0.2;
    details.push('句式过于复杂');
  }
  
  return {
    isMechanical: mechanicalScore > 0.6,
    confidence: Math.min(mechanicalScore, 1.0),
    details
  };
};

/**
 * 综合评估AI儿童对话质量
 */
export const evaluateAIChildChat = (userMessage: string, aiReply: string): {
  score: number; // 0-100分
  issues: string[];
  suggestions: string[];
} => {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;
  
  // 检测重复用户话语
  const repeatAnalysis = detectUserMessageRepeat(userMessage, aiReply);
  if (repeatAnalysis.hasRepeat) {
    score -= 40 * repeatAnalysis.confidence;
    issues.push(`重复用户话语 (${Math.round(repeatAnalysis.confidence * 100)}%置信度)`);
    issues.push(...repeatAnalysis.details);
    suggestions.push('AI应该用自己的话回答，不要重复用户说的话');
  }
  
  // 检测机械回复
  const mechanicalAnalysis = detectMechanicalResponse(aiReply);
  if (mechanicalAnalysis.isMechanical) {
    score -= 30 * mechanicalAnalysis.confidence;
    issues.push(`机械式回复 (${Math.round(mechanicalAnalysis.confidence * 100)}%置信度)`);
    issues.push(...mechanicalAnalysis.details);
    suggestions.push('AI应该用更自然、有感情的话回答');
  }
  
  // 积极因素加分
  const positiveWords = ['好', '喜欢', '开心', '想', '我觉得'];
  const hasPositive = positiveWords.some(word => aiReply.includes(word));
  if (hasPositive) {
    score += 5;
  }
  
  // 问号回应检测（好的表现）
  if (userMessage.includes('？') && !aiReply.includes('？') && aiReply.length > 2) {
    score += 10; // 正确回答问题而不是重复问题
  }
  
  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    issues,
    suggestions
  };
};

/**
 * 生成对话质量报告
 */
export const generateChatQualityReport = (conversations: Array<{ user: string; ai: string }>): {
  overallScore: number;
  totalConversations: number;
  goodConversations: number;
  issueConversations: number;
  commonIssues: string[];
  recommendations: string[];
} => {
  let totalScore = 0;
  let goodCount = 0;
  let issueCount = 0;
  const allIssues: string[] = [];
  const allSuggestions: string[] = [];
  
  for (const conv of conversations) {
    const evaluation = evaluateAIChildChat(conv.user, conv.ai);
    totalScore += evaluation.score;
    
    if (evaluation.score >= 80) {
      goodCount++;
    } else {
      issueCount++;
    }
    
    allIssues.push(...evaluation.issues);
    allSuggestions.push(...evaluation.suggestions);
  }
  
  // 统计最常见的问题
  const issueCounts = new Map<string, number>();
  for (const issue of allIssues) {
    const key = issue.split('(')[0].trim(); // 去掉置信度部分
    issueCounts.set(key, (issueCounts.get(key) || 0) + 1);
  }
  
  const commonIssues = Array.from(issueCounts.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([issue, count]) => `${issue} (${count}次)`);
  
  // 去重建议
  const uniqueSuggestions = [...new Set(allSuggestions)];
  
  return {
    overallScore: conversations.length > 0 ? Math.round(totalScore / conversations.length) : 0,
    totalConversations: conversations.length,
    goodConversations: goodCount,
    issueConversations: issueCount,
    commonIssues,
    recommendations: uniqueSuggestions
  };
};
