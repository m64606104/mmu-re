/**
 * 慢邮件通知系统类型定义
 */

export type LetterNotificationType = 
  | 'reply_received'        // 收到回信
  | 'letter_delivered'      // 信件已送达
  | 'letter_failed'         // 信件未送达
  | 'new_penfriend'         // 新笔友来信
  | 'penfriend_reply'       // 笔友回信
  | 'stamp_unlocked'        // 解锁新邮票
  | 'bottle_arrived';       // 漂流瓶抵达

export interface LetterNotification {
  id: string;
  type: LetterNotificationType;
  letterId?: string;
  senderName: string;
  senderAvatar: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  stampId?: string; // 解锁的邮票ID
}

export interface NotificationBadge {
  count: number;
  hasNew: boolean;
}
