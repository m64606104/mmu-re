/**
 * 慢邮件通知系统
 * 管理信件相关的所有通知
 */

import { LetterNotification, NotificationBadge } from '../types/letterNotification';
import { getCachedData, load, save, setCachedData } from './storage';

const STORAGE_KEY = 'letter_notifications';
const MAX_NOTIFICATIONS = 50; // 最多保留50条通知

/**
 * 获取所有通知
 */
export function getNotifications(): LetterNotification[] {
  const cached = getCachedData<LetterNotification[]>(STORAGE_KEY);
  return Array.isArray(cached) ? cached : [];
}

/**
 * 保存通知
 */
function saveNotifications(notifications: LetterNotification[]): void {
  // 只保留最新的MAX_NOTIFICATIONS条
  const toSave = notifications.slice(-MAX_NOTIFICATIONS);
  setCachedData(STORAGE_KEY, toSave);
  void save(STORAGE_KEY, toSave);
}

/**
 * 添加通知
 */
export function addNotification(notification: Omit<LetterNotification, 'id' | 'timestamp' | 'read'>): LetterNotification {
  const notifications = getNotifications();
  
  const newNotification: LetterNotification = {
    ...notification,
    id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    read: false
  };
  
  notifications.push(newNotification);
  saveNotifications(notifications);
  
  return newNotification;
}

/**
 * 标记通知为已读
 */
export function markAsRead(notificationId: string): boolean {
  const notifications = getNotifications();
  const notification = notifications.find(n => n.id === notificationId);
  
  if (!notification) return false;
  
  notification.read = true;
  saveNotifications(notifications);
  
  return true;
}

/**
 * 标记所有通知为已读
 */
export function markAllAsRead(): void {
  const notifications = getNotifications();
  notifications.forEach(n => n.read = true);
  saveNotifications(notifications);
}

/**
 * 删除通知
 */
export function deleteNotification(notificationId: string): boolean {
  const notifications = getNotifications();
  const index = notifications.findIndex(n => n.id === notificationId);
  
  if (index === -1) return false;
  
  notifications.splice(index, 1);
  saveNotifications(notifications);
  
  return true;
}

/**
 * 清空所有通知
 */
export function clearAllNotifications(): void {
  saveNotifications([]);
}

export async function initializeLetterNotificationStorage(): Promise<void> {
  try {
    const data = await load(STORAGE_KEY);
    setCachedData(STORAGE_KEY, Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('初始化慢邮件通知存储失败:', error);
    setCachedData(STORAGE_KEY, []);
  }
}

/**
 * 获取未读通知数量
 */
export function getUnreadCount(): number {
  const notifications = getNotifications();
  return notifications.filter(n => !n.read).length;
}

/**
 * 获取通知角标信息
 */
export function getNotificationBadge(): NotificationBadge {
  const count = getUnreadCount();
  return {
    count,
    hasNew: count > 0
  };
}

/**
 * 获取未读通知
 */
export function getUnreadNotifications(): LetterNotification[] {
  const notifications = getNotifications();
  return notifications.filter(n => !n.read);
}

// ============= 预定义通知创建函数 =============

/**
 * 创建"收到回信"通知
 */
export function createReplyReceivedNotification(
  letterId: string,
  senderName: string,
  senderAvatar: string
): LetterNotification {
  return addNotification({
    type: 'reply_received',
    letterId,
    senderName,
    senderAvatar,
    title: `${senderName}收到回信`,
    message: `新回信 - ${senderName}给你发来了回信`
  });
}

/**
 * 创建"信件已送达"通知
 */
export function createLetterDeliveredNotification(
  letterId: string,
  receiverName: string
): LetterNotification {
  return addNotification({
    type: 'letter_delivered',
    letterId,
    senderName: '系统',
    senderAvatar: '✉️',
    title: '您的笔友信已成功送达！',
    message: `您寄给 ${receiverName} 的笔友信已送达，等待对方回信吧！`
  });
}

/**
 * 创建"信件未送达"通知
 */
export function createLetterFailedNotification(
  letterId: string,
  receiverName: string,
  reason: string
): LetterNotification {
  return addNotification({
    type: 'letter_failed',
    letterId,
    senderName: '系统',
    senderAvatar: '❌',
    title: '信件未送达',
    message: `寄给 ${receiverName} 的信件未能送达：${reason}`
  });
}

/**
 * 创建"新笔友来信"通知
 */
export function createNewPenfriendNotification(
  letterId: string,
  senderName: string,
  senderAvatar: string
): LetterNotification {
  return addNotification({
    type: 'new_penfriend',
    letterId,
    senderName,
    senderAvatar,
    title: '收到新笔友信！',
    message: `收到来自 ${senderName} 的第1封友信，快打开信封，并首次回信吧！`
  });
}

/**
 * 创建"一封来自远方的笔友信"通知
 */
export function createDistantLetterNotification(
  letterId: string,
  senderName: string,
  senderAvatar: string
): LetterNotification {
  return addNotification({
    type: 'penfriend_reply',
    letterId,
    senderName,
    senderAvatar,
    title: '✉️ 一封来自远方的笔友信',
    message: `来自: ${senderName} - 您的笔友发信正在寄送，快来看看吧！`
  });
}

/**
 * 创建"解锁新邮票"通知
 */
export function createStampUnlockedNotification(
  stampId: string,
  stampName: string
): LetterNotification {
  return addNotification({
    type: 'stamp_unlocked',
    stampId,
    senderName: '邮票系统',
    senderAvatar: '🎫',
    title: '✨ 恭喜解锁新邮票！',
    message: `您解锁了新邮票: ${stampName}，快去邮票收藏册看看吧！`
  });
}

/**
 * 创建"漂流瓶抵达"通知
 */
export function createBottleArrivedNotification(
  letterId: string,
  receiverName: string,
  receiverAvatar: string
): LetterNotification {
  return addNotification({
    type: 'bottle_arrived',
    letterId,
    senderName: receiverName,
    senderAvatar: receiverAvatar,
    title: '🌊 漂流瓶已抵达！',
    message: `您的漂流瓶被 ${receiverName} 捡到了，期待对方的回信吧！`
  });
}
