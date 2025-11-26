import { Conversation, Message } from '../types';

// 轻量级消息观察统计，用于让系统在不调用大模型的前提下“看见”用户消息
// 只存小型结构化数据，避免在本地保存大段文本

const STORAGE_KEY = 'ai_message_stats_v1';

export interface ConversationMessageStats {
  conversationId: string;
  totalUserMessages: number;
  lastUserMessageAt: number;
  todayUserMessages: number;
  todayDate: string; // YYYY-MM-DD
}

interface StatsStore {
  [conversationId: string]: ConversationMessageStats;
}

function getTodayDateString(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function loadStats(): StatsStore {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StatsStore;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch (error) {
    console.error('Failed to load AI message stats from localStorage:', error);
    return {};
  }
}

function saveStats(stats: StatsStore): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const raw = JSON.stringify(stats);
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch (error) {
    console.error('Failed to save AI message stats to localStorage:', error);
  }
}

export function notifyMessageObserved(conversation: Conversation, message: Message): void {
  // 目前只统计用户消息
  if (message.role !== 'user') return;

  if (typeof window === 'undefined') {
    return;
  }

  try {
    const now = Date.now();
    const today = getTodayDateString(now);

    const stats = loadStats();
    const existing = stats[conversation.id];

    let todayUserMessages = 1;
    let totalUserMessages = 1;

    if (existing) {
      totalUserMessages = (existing.totalUserMessages || 0) + 1;
      if (existing.todayDate === today) {
        todayUserMessages = (existing.todayUserMessages || 0) + 1;
      }
    }

    stats[conversation.id] = {
      conversationId: conversation.id,
      lastUserMessageAt: now,
      todayDate: today,
      todayUserMessages,
      totalUserMessages,
    };

    saveStats(stats);
  } catch (error) {
    console.error('notifyMessageObserved failed:', error);
  }
}
