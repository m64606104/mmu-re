/**
 * 统一的通知服务
 * 提供系统通知和应用内通知的统一接口
 */

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;  // emoji或图标
  tag?: string;   // 用于去重
  requireInteraction?: boolean;
  silent?: boolean;
  data?: any;
}

/**
 * 请求通知权限
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('浏览器不支持通知');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('用户已拒绝通知权限');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('请求通知权限失败:', error);
    return false;
  }
}

/**
 * 发送系统通知
 */
export function sendSystemNotification(options: NotificationOptions): Notification | null {
  if (!('Notification' in window)) {
    console.warn('浏览器不支持通知');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('没有通知权限');
    return null;
  }

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: getNotificationIcon(options.icon),
      tag: options.tag || Date.now().toString(),
      requireInteraction: options.requireInteraction || false,
      silent: options.silent || false,
      data: options.data
    });

    // 自动关闭（默认5秒）
    if (!options.requireInteraction) {
      setTimeout(() => {
        notification.close();
      }, 5000);
    }

    return notification;
  } catch (error) {
    console.error('发送系统通知失败:', error);
    return null;
  }
}

/**
 * 发送聊天消息通知
 */
export function sendChatNotification(
  senderName: string,
  messagePreview: string,
  avatar?: string,
  conversationId?: string
): Notification | null {
  return sendSystemNotification({
    title: `💬 ${senderName}`,
    body: messagePreview,
    icon: avatar || '💬',
    tag: conversationId ? `chat_${conversationId}` : undefined,
    data: {
      type: 'chat',
      conversationId
    }
  });
}

/**
 * 发送群聊消息通知
 */
export function sendGroupChatNotification(
  groupName: string,
  senderName: string,
  messagePreview: string,
  groupId?: string
): Notification | null {
  return sendSystemNotification({
    title: `👥 ${groupName}`,
    body: `${senderName}: ${messagePreview}`,
    icon: '👥',
    tag: groupId ? `group_${groupId}` : undefined,
    data: {
      type: 'group',
      groupId
    }
  });
}

/**
 * 发送信件通知
 */
export function sendLetterNotification(
  senderName: string,
  avatar?: string,
  letterId?: string
): Notification | null {
  return sendSystemNotification({
    title: '📬 收到新回信',
    body: `${senderName} 回信了`,
    icon: avatar || '📮',
    tag: letterId ? `letter_${letterId}` : undefined,
    data: {
      type: 'letter',
      letterId
    }
  });
}

/**
 * 发送成就通知
 */
export function sendAchievementNotification(
  achievementTitle: string,
  achievementDesc: string,
  achievementIcon?: string
): Notification | null {
  return sendSystemNotification({
    title: '🏆 成就解锁！',
    body: `${achievementTitle}\n${achievementDesc}`,
    icon: achievementIcon || '🏆',
    requireInteraction: true,
    data: {
      type: 'achievement'
    }
  });
}

/**
 * 获取通知图标
 * 确保返回的是有效的emoji或URL，过滤掉base64
 */
function getNotificationIcon(icon?: string): string | undefined {
  if (!icon) return undefined;

  // 如果是base64或data URL，返回undefined（使用默认图标）
  if (icon.startsWith('data:') || icon.startsWith('blob:')) {
    return undefined;
  }

  // 如果是HTTP URL，直接返回
  if (icon.startsWith('http://') || icon.startsWith('https://')) {
    return icon;
  }

  // 如果是emoji（单个或两个字符），返回
  if (icon.length <= 2) {
    return icon;
  }

  // 其他情况返回undefined
  return undefined;
}

/**
 * 清除所有通知
 */
export function clearAllNotifications(): void {
  // 浏览器通知没有统一的清除方法
  // 但可以通过tag来管理
  console.log('已请求清除所有通知');
}

/**
 * 检查是否应该发送通知
 * （例如：用户当前不在页面时才发送）
 */
export function shouldSendNotification(): boolean {
  // 如果页面不可见，发送通知
  if (document.hidden) {
    return true;
  }

  // 如果页面失去焦点，发送通知
  if (!document.hasFocus()) {
    return true;
  }

  return false;
}

/**
 * 智能发送通知
 * 只在用户不在页面时发送
 */
export function sendSmartNotification(options: NotificationOptions): Notification | null {
  if (!shouldSendNotification()) {
    console.log('用户在页面，跳过通知');
    return null;
  }

  return sendSystemNotification(options);
}
