/**
 * 朋友圈回复提醒系统
 * 类似微信朋友圈的"有人回复了你"提醒
 */

export interface MomentsNotification {
  id: string;
  type: 'comment_reply';  // 评论回复
  momentId: string;       // 朋友圈ID
  commentId: string;      // 评论ID  
  replyId: string;        // 回复ID
  replyAuthorId: string;  // 回复者ID
  replyAuthorName: string;// 回复者名字
  replyContent: string;   // 回复内容
  timestamp: number;      // 时间戳
  read: boolean;          // 是否已读
}

const STORAGE_KEY = 'moments_notifications';

/**
 * 获取所有通知
 */
export const getMomentsNotifications = (): MomentsNotification[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('读取朋友圈通知失败:', error);
    return [];
  }
};

/**
 * 保存通知
 */
const saveMomentsNotifications = (notifications: MomentsNotification[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch (error) {
    console.error('保存朋友圈通知失败:', error);
  }
};

/**
 * 添加新通知
 */
export const addMomentsNotification = (notification: Omit<MomentsNotification, 'id' | 'read' | 'timestamp'>) => {
  const notifications = getMomentsNotifications();
  
  const newNotification: MomentsNotification = {
    ...notification,
    id: `notif_${Date.now()}_${Math.random()}`,
    timestamp: Date.now(),
    read: false
  };
  
  notifications.unshift(newNotification);
  saveMomentsNotifications(notifications);
  
  console.log(`📬 新的朋友圈通知: ${notification.replyAuthorName} 回复了你`);
  return newNotification;
};

/**
 * 标记通知为已读
 */
export const markNotificationAsRead = (notificationId: string) => {
  const notifications = getMomentsNotifications();
  const notification = notifications.find(n => n.id === notificationId);
  
  if (notification) {
    notification.read = true;
    saveMomentsNotifications(notifications);
  }
};

/**
 * 标记某个朋友圈的所有通知为已读
 */
export const markMomentNotificationsAsRead = (momentId: string) => {
  const notifications = getMomentsNotifications();
  let updated = false;
  
  notifications.forEach(n => {
    if (n.momentId === momentId && !n.read) {
      n.read = true;
      updated = true;
    }
  });
  
  if (updated) {
    saveMomentsNotifications(notifications);
  }
};

/**
 * 获取未读通知数量
 */
export const getUnreadCount = (): number => {
  const notifications = getMomentsNotifications();
  return notifications.filter(n => !n.read).length;
};

/**
 * 获取某个朋友圈的未读通知
 */
export const getMomentUnreadNotifications = (momentId: string): MomentsNotification[] => {
  const notifications = getMomentsNotifications();
  return notifications.filter(n => n.momentId === momentId && !n.read);
};

/**
 * 清理旧通知（7天前的）
 */
export const cleanOldNotifications = () => {
  const notifications = getMomentsNotifications();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  
  const filtered = notifications.filter(n => n.timestamp > sevenDaysAgo);
  
  if (filtered.length !== notifications.length) {
    saveMomentsNotifications(filtered);
    console.log(`🧹 清理了 ${notifications.length - filtered.length} 条旧通知`);
  }
};

/**
 * 删除通知
 */
export const deleteNotification = (notificationId: string) => {
  const notifications = getMomentsNotifications();
  const filtered = notifications.filter(n => n.id !== notificationId);
  saveMomentsNotifications(filtered);
};
