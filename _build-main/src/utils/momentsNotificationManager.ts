/**
 * 朋友圈评论通知管理器
 * 类似微信朋友圈的评论通知系统
 */

import { smartLoad, smartSave } from './storage';

// 通知类型
export type MomentsNotificationType = 
  | 'comment'       // AI评论了用户的朋友圈
  | 'reply';        // AI回复了用户的评论

// 通知数据结构
export interface MomentsNotification {
  id: string;                      // 通知ID
  type: MomentsNotificationType;   // 通知类型
  postId: string;                  // 朋友圈ID
  postAuthorId: string;            // 朋友圈作者ID
  postContent: string;             // 朋友圈内容（预览）
  commentId: string;               // 评论ID
  commentAuthorId: string;         // 评论者ID
  commentAuthorName: string;       // 评论者名称
  commentAuthorAvatar?: string;    // 评论者头像
  commentContent: string;          // 评论内容
  replyToName?: string;            // 回复谁（如果是reply类型）
  timestamp: number;               // 时间戳
  isRead: boolean;                 // 是否已读
}

// 通知存储key
const NOTIFICATIONS_STORAGE_KEY = 'moments_notifications';

/**
 * 获取所有通知
 */
export const getMomentsNotifications = async (): Promise<MomentsNotification[]> => {
  try {
    const notifications = await smartLoad(NOTIFICATIONS_STORAGE_KEY) || [];
    return notifications;
  } catch (error) {
    console.error('获取朋友圈通知失败:', error);
    return [];
  }
};

/**
 * 保存通知
 */
const saveNotifications = async (notifications: MomentsNotification[]): Promise<void> => {
  try {
    await smartSave(NOTIFICATIONS_STORAGE_KEY, notifications);
  } catch (error) {
    console.error('保存朋友圈通知失败:', error);
  }
};

/**
 * 添加新通知
 */
export const addMomentsNotification = async (
  type: MomentsNotificationType,
  data: {
    postId: string;
    postAuthorId: string;
    postContent: string;
    commentId: string;
    commentAuthorId: string;
    commentAuthorName: string;
    commentAuthorAvatar?: string;
    commentContent: string;
    replyToName?: string;
  }
): Promise<void> => {
  try {
    const notifications = await getMomentsNotifications();
    
    const newNotification: MomentsNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      postId: data.postId,
      postAuthorId: data.postAuthorId,
      postContent: data.postContent.substring(0, 50), // 截取前50字作为预览
      commentId: data.commentId,
      commentAuthorId: data.commentAuthorId,
      commentAuthorName: data.commentAuthorName,
      commentAuthorAvatar: data.commentAuthorAvatar,
      commentContent: data.commentContent,
      replyToName: data.replyToName,
      timestamp: Date.now(),
      isRead: false
    };
    
    // 添加到通知列表开头
    notifications.unshift(newNotification);
    
    // 只保留最近100条通知
    const trimmedNotifications = notifications.slice(0, 100);
    
    await saveNotifications(trimmedNotifications);
    
    console.log('✅ 朋友圈通知已添加:', {
      type,
      from: data.commentAuthorName,
      content: data.commentContent.substring(0, 30)
    });
  } catch (error) {
    console.error('添加朋友圈通知失败:', error);
  }
};

/**
 * 标记通知为已读
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const notifications = await getMomentsNotifications();
    const notification = notifications.find(n => n.id === notificationId);
    
    if (notification) {
      notification.isRead = true;
      await saveNotifications(notifications);
    }
  } catch (error) {
    console.error('标记通知为已读失败:', error);
  }
};

/**
 * 标记所有通知为已读
 */
export const markAllNotificationsAsRead = async (): Promise<void> => {
  try {
    const notifications = await getMomentsNotifications();
    
    notifications.forEach(n => {
      n.isRead = true;
    });
    
    await saveNotifications(notifications);
  } catch (error) {
    console.error('标记所有通知为已读失败:', error);
  }
};

/**
 * 删除通知
 */
export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    const notifications = await getMomentsNotifications();
    const filteredNotifications = notifications.filter(n => n.id !== notificationId);
    await saveNotifications(filteredNotifications);
  } catch (error) {
    console.error('删除通知失败:', error);
  }
};

/**
 * 清空所有通知
 */
export const clearAllNotifications = async (): Promise<void> => {
  try {
    await saveNotifications([]);
  } catch (error) {
    console.error('清空通知失败:', error);
  }
};

/**
 * 获取未读通知数量
 */
export const getUnreadNotificationCount = async (): Promise<number> => {
  try {
    const notifications = await getMomentsNotifications();
    return notifications.filter(n => !n.isRead).length;
  } catch (error) {
    console.error('获取未读通知数量失败:', error);
    return 0;
  }
};

/**
 * 获取未读通知列表
 */
export const getUnreadNotifications = async (): Promise<MomentsNotification[]> => {
  try {
    const notifications = await getMomentsNotifications();
    return notifications.filter(n => !n.isRead);
  } catch (error) {
    console.error('获取未读通知列表失败:', error);
    return [];
  }
};
