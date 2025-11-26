import { Conversation, Message } from '../types';

/**
 * AI 消息观察器 - 轻量级统计工具
 * 让 AI 系统能够"看见"用户消息，但不存储消息正文，只记录小统计
 * 为将来的足迹、日记、陪伴时间等功能提供基础数据
 */

const STORAGE_KEY = 'ai_message_insights_v1';

// 每个对话的消息统计
export interface ConversationInsights {
  conversationId: string;
  totalUserMessages: number;     // 历史总消息数
  lastUserMessageAt: number;     // 最后一次用户发言时间戳
  todayUserMessages: number;     // 今天用户消息数
  todayDate: string;             // 今天的日期 YYYY-MM-DD
  firstMessageAt?: number;       // 第一次发言时间（用于计算陪伴天数）
}

// 全局统计存储结构
interface InsightsStore {
  [conversationId: string]: ConversationInsights;
}

/**
 * 获取今日日期字符串 YYYY-MM-DD
 */
function getTodayString(timestamp: number = Date.now()): string {
  const date = new Date(timestamp);
  return date.getFullYear() + '-' + 
         String(date.getMonth() + 1).padStart(2, '0') + '-' + 
         String(date.getDate()).padStart(2, '0');
}

/**
 * 从 localStorage 读取统计数据
 */
function loadInsights(): InsightsStore {
  if (typeof window === 'undefined') return {};

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    
    const data = JSON.parse(raw);
    return (data && typeof data === 'object') ? data : {};
  } catch (error) {
    console.error('❌ 加载消息统计失败:', error);
    return {};
  }
}

/**
 * 保存统计数据到 localStorage
 */
function saveInsights(insights: InsightsStore): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(insights));
    console.log('✅ 消息统计已保存');
  } catch (error) {
    console.error('❌ 保存消息统计失败:', error);
  }
}

/**
 * 核心函数：当用户发送消息时，AI "观察"到这个事件
 * @param conversation 对话对象
 * @param message 用户发送的消息
 */
export function notifyAIMessageObserved(conversation: Conversation, message: Message): void {
  // 只处理用户消息
  if (message.role !== 'user') return;

  console.log('🤖 AI 看见了新消息:', {
    对话ID: conversation.id.substring(0, 8) + '...',
    消息类型: message.mediaType || '文本',
    时间: new Date().toLocaleTimeString()
  });

  try {
    const now = Date.now();
    const today = getTodayString(now);
    
    const allInsights = loadInsights();
    const currentInsight = allInsights[conversation.id];

    // 计算新的统计数据
    let todayCount = 1;
    let totalCount = 1;
    let firstMessageTime = now;

    if (currentInsight) {
      // 已有记录，累加
      totalCount = (currentInsight.totalUserMessages || 0) + 1;
      firstMessageTime = currentInsight.firstMessageAt || now;
      
      // 如果是同一天，累加今日消息数
      if (currentInsight.todayDate === today) {
        todayCount = (currentInsight.todayUserMessages || 0) + 1;
      }
    }

    // 更新统计数据
    allInsights[conversation.id] = {
      conversationId: conversation.id,
      totalUserMessages: totalCount,
      lastUserMessageAt: now,
      todayUserMessages: todayCount,
      todayDate: today,
      firstMessageAt: firstMessageTime,
    };

    // 保存到本地
    saveInsights(allInsights);

  } catch (error) {
    console.error('❌ AI 消息观察失败:', error);
  }
}

/**
 * 工具函数：获取某个对话的统计数据
 */
export function getConversationInsights(conversationId: string): ConversationInsights | null {
  const allInsights = loadInsights();
  return allInsights[conversationId] || null;
}

/**
 * 工具函数：获取所有对话的统计概要
 */
export function getAllInsightsSummary() {
  const allInsights = loadInsights();
  const conversationCount = Object.keys(allInsights).length;
  const totalMessages = Object.values(allInsights).reduce(
    (sum, insight) => sum + (insight.totalUserMessages || 0), 
    0
  );
  
  return {
    totalConversations: conversationCount,
    totalUserMessages: totalMessages,
    lastUpdate: Math.max(...Object.values(allInsights).map(i => i.lastUserMessageAt || 0))
  };
}
