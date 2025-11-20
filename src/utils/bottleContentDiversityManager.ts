/**
 * 漂流瓶内容多样性管理器
 * 防止内容重复，提升生成质量
 */

import { BottleLetter } from '../types/bottle';

const DIVERSITY_STORAGE_KEY = 'bottle_content_diversity';
const MAX_HISTORY_DAYS = 7; // 保留7天的历史记录
const MAX_RECENT_BOTTLES = 20; // 最多跟踪20个最近的瓶子

interface ContentHistory {
  topics: Array<{ topic: string; timestamp: number; count: number }>;
  keywords: Array<{ keyword: string; timestamp: number; count: number }>;
  ageGroups: Array<{ ageGroup: string; timestamp: number; count: number }>;
  lastCleanup: number;
}

interface DiversityScore {
  score: number; // 0-100
  reasons: string[];
  suggestions: string[];
}

/**
 * 获取内容历史记录
 */
function getContentHistory(): ContentHistory {
  const saved = localStorage.getItem(DIVERSITY_STORAGE_KEY);
  if (saved) {
    const history: ContentHistory = JSON.parse(saved);
    
    // 清理过期数据
    const now = Date.now();
    const maxAge = MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000;
    
    if (now - history.lastCleanup > 24 * 60 * 60 * 1000) { // 每天清理一次
      history.topics = history.topics.filter(t => now - t.timestamp < maxAge);
      history.keywords = history.keywords.filter(k => now - k.timestamp < maxAge);
      history.ageGroups = history.ageGroups.filter(a => now - a.timestamp < maxAge);
      history.lastCleanup = now;
      saveContentHistory(history);
    }
    
    return history;
  }
  
  return {
    topics: [],
    keywords: [],
    ageGroups: [],
    lastCleanup: Date.now()
  };
}

/**
 * 保存内容历史记录
 */
function saveContentHistory(history: ContentHistory): void {
  localStorage.setItem(DIVERSITY_STORAGE_KEY, JSON.stringify(history));
}

/**
 * 从内容中提取关键词
 */
function extractKeywords(content: string): string[] {
  const keywords: string[] = [];
  
  // 常见关键词模式
  const patterns = [
    /考试|成绩|学习|作业|老师|同学|学校/g,
    /朋友|友谊|陪伴|一起|分享/g,
    /爸妈|父母|家人|亲情|家庭/g,
    /工作|职场|上班|领导|同事|项目/g,
    /梦想|理想|目标|追求|努力/g,
    /孤独|寂寞|一个人|想念|思念/g,
    /开心|快乐|高兴|兴奋|激动/g,
    /难过|伤心|沮丧|失望|烦恼/g,
    /压力|焦虑|迷茫|困惑|纠结/g,
    /感谢|感恩|珍惜|幸福|温暖/g,
    /城市|旅行|风景|季节|天气/g,
    /电影|音乐|读书|游戏|兴趣/g
  ];
  
  patterns.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      const keywordCategories = [
        '学习', '友情', '亲情', '工作', '梦想', 
        '孤独', '快乐', '伤心', '焦虑', '感恩',
        '生活', '娱乐'
      ];
      keywords.push(keywordCategories[index]);
    }
  });
  
  return [...new Set(keywords)]; // 去重
}

/**
 * 获取年龄组名称
 */
function getAgeGroupName(age: number): string {
  if (age <= 12) return 'elementary';
  if (age <= 15) return 'middle_school';
  if (age <= 18) return 'high_school';
  if (age <= 25) return 'young_adult';
  return 'adult';
}

/**
 * 记录瓶子内容
 */
export function recordBottleContent(bottle: BottleLetter): void {
  const history = getContentHistory();
  const now = Date.now();
  
  // 记录主题
  const existingTopic = history.topics.find(t => t.topic === bottle.topic);
  if (existingTopic) {
    existingTopic.count++;
    existingTopic.timestamp = now;
  } else {
    history.topics.push({ topic: bottle.topic, timestamp: now, count: 1 });
  }
  
  // 记录关键词
  const keywords = extractKeywords(bottle.content);
  keywords.forEach(keyword => {
    const existingKeyword = history.keywords.find(k => k.keyword === keyword);
    if (existingKeyword) {
      existingKeyword.count++;
      existingKeyword.timestamp = now;
    } else {
      history.keywords.push({ keyword, timestamp: now, count: 1 });
    }
  });
  
  // 记录年龄组
  const ageGroup = getAgeGroupName(bottle.senderAge || 25); // 默认25岁
  const existingAgeGroup = history.ageGroups.find(a => a.ageGroup === ageGroup);
  if (existingAgeGroup) {
    existingAgeGroup.count++;
    existingAgeGroup.timestamp = now;
  } else {
    history.ageGroups.push({ ageGroup, timestamp: now, count: 1 });
  }
  
  // 限制记录数量
  history.topics = history.topics.slice(-MAX_RECENT_BOTTLES);
  history.keywords = history.keywords.slice(-MAX_RECENT_BOTTLES);
  history.ageGroups = history.ageGroups.slice(-MAX_RECENT_BOTTLES);
  
  saveContentHistory(history);
}

/**
 * 评估内容多样性分数
 */
export function evaluateContentDiversity(bottle: BottleLetter): DiversityScore {
  const history = getContentHistory();
  const now = Date.now();
  
  let score = 100;
  const reasons: string[] = [];
  const suggestions: string[] = [];
  
  // 检查主题重复 (权重: 40%)
  const recentTopics = history.topics.filter(t => now - t.timestamp < 24 * 60 * 60 * 1000); // 24小时内
  const topicCount = recentTopics.filter(t => t.topic === bottle.topic).length;
  if (topicCount > 0) {
    const penalty = Math.min(topicCount * 15, 40);
    score -= penalty;
    reasons.push(`最近24小时内已出现${topicCount}次"${bottle.topic}"主题`);
    suggestions.push('尝试选择不同的话题类型');
  }
  
  // 检查关键词重复 (权重: 30%)
  const keywords = extractKeywords(bottle.content);
  const recentKeywords = history.keywords.filter(k => now - k.timestamp < 12 * 60 * 60 * 1000); // 12小时内
  let keywordPenalty = 0;
  keywords.forEach(keyword => {
    const keywordCount = recentKeywords.filter(k => k.keyword === keyword).length;
    if (keywordCount > 0) {
      keywordPenalty += Math.min(keywordCount * 8, 20);
      reasons.push(`最近12小时内"${keyword}"关键词已出现${keywordCount}次`);
    }
  });
  score -= Math.min(keywordPenalty, 30);
  
  if (keywordPenalty > 0) {
    suggestions.push('尝试使用不同的情感表达或生活场景');
  }
  
  // 检查年龄组分布 (权重: 20%)
  const ageGroup = getAgeGroupName(bottle.senderAge || 25); // 默认25岁
  const recentAgeGroups = history.ageGroups.filter(a => now - a.timestamp < 6 * 60 * 60 * 1000); // 6小时内
  const ageGroupCount = recentAgeGroups.filter(a => a.ageGroup === ageGroup).length;
  if (ageGroupCount > 1) {
    const penalty = Math.min((ageGroupCount - 1) * 10, 20);
    score -= penalty;
    reasons.push(`最近6小时内${ageGroup}年龄组已出现${ageGroupCount}次`);
    suggestions.push('尝试生成不同年龄段的角色');
  }
  
  // 检查时间间隔 (权重: 10%)
  const lastBottle = history.topics[history.topics.length - 1];
  if (lastBottle && now - lastBottle.timestamp < 2 * 60 * 60 * 1000) { // 2小时内
    score -= 10;
    reasons.push('生成间隔过短，可能影响内容多样性');
    suggestions.push('适当延长生成间隔');
  }
  
  // 确保分数在合理范围内
  score = Math.max(0, Math.min(100, score));
  
  return { score, reasons, suggestions };
}

/**
 * 获取推荐的内容类型
 */
export function getRecommendedContentTypes(): {
  topics: string[];
  ageGroups: string[];
  moods: string[];
} {
  const history = getContentHistory();
  const now = Date.now();
  
  // 获取最近使用过的内容
  const recentTopics = history.topics
    .filter(t => now - t.timestamp < 24 * 60 * 60 * 1000)
    .map(t => t.topic);
  
  const recentAgeGroups = history.ageGroups
    .filter(a => now - a.timestamp < 12 * 60 * 60 * 1000)
    .map(a => a.ageGroup);
  
  // 推荐未使用或使用较少的类型
  const allTopics = [
    '生活感悟', '孤独心情', '开心分享', '梦想追寻', '感恩时刻',
    '迷茫困惑', '美食分享', '兴趣爱好', '读书感悟', '友情回忆',
    '亲情温暖', '工作日常', '成长时刻', '音乐分享', '季节感悟',
    '城市故事', '电影推荐', '校园趣事', '青春校园', '求学之路'
  ];
  
  const allAgeGroups = ['elementary', 'middle_school', 'high_school', 'young_adult', 'adult'];
  
  const allMoods = ['thoughtful', 'lonely', 'happy', 'excited', 'sad', 'grateful'];
  
  const recommendedTopics = allTopics.filter(t => !recentTopics.includes(t));
  const recommendedAgeGroups = allAgeGroups.filter(a => !recentAgeGroups.includes(a));
  
  return {
    topics: recommendedTopics.length > 0 ? recommendedTopics : allTopics,
    ageGroups: recommendedAgeGroups.length > 0 ? recommendedAgeGroups : allAgeGroups,
    moods: allMoods
  };
}

/**
 * 清理历史数据
 */
export function clearContentHistory(): void {
  localStorage.removeItem(DIVERSITY_STORAGE_KEY);
}

/**
 * 获取内容统计信息
 */
export function getContentStats(): {
  totalBottles: number;
  topicDistribution: Record<string, number>;
  ageGroupDistribution: Record<string, number>;
  keywordDistribution: Record<string, number>;
  diversityTrend: number; // 最近的多样性趋势
} {
  const history = getContentHistory();
  const now = Date.now();
  
  // 计算话题分布
  const topicDistribution: Record<string, number> = {};
  history.topics.forEach(t => {
    topicDistribution[t.topic] = (topicDistribution[t.topic] || 0) + t.count;
  });
  
  // 计算年龄组分布
  const ageGroupDistribution: Record<string, number> = {};
  history.ageGroups.forEach(a => {
    ageGroupDistribution[a.ageGroup] = (ageGroupDistribution[a.ageGroup] || 0) + a.count;
  });
  
  // 计算关键词分布
  const keywordDistribution: Record<string, number> = {};
  history.keywords.forEach(k => {
    keywordDistribution[k.keyword] = (keywordDistribution[k.keyword] || 0) + k.count;
  });
  
  // 计算多样性趋势（最近24小时内的多样性平均分）
  const recentBottles = history.topics.filter(t => now - t.timestamp < 24 * 60 * 60 * 1000);
  const uniqueTopics = new Set(recentBottles.map(t => t.topic)).size;
  const totalRecent = recentBottles.length;
  const diversityTrend = totalRecent > 0 ? (uniqueTopics / totalRecent) * 100 : 100;
  
  return {
    totalBottles: history.topics.reduce((sum, t) => sum + t.count, 0),
    topicDistribution,
    ageGroupDistribution,
    keywordDistribution,
    diversityTrend
  };
}
