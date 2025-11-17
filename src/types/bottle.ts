/**
 * 漂流瓶系统类型定义
 */

export interface BottleLetter {
  id: string;
  senderId: string; // AI ID
  senderName: string;
  senderAvatar: string;
  senderAge?: number;
  senderGender?: 'male' | 'female' | 'other';
  senderLocation?: string;
  content: string;
  topic: string; // 话题标签
  mood: 'happy' | 'sad' | 'thoughtful' | 'excited' | 'lonely' | 'grateful';
  timestamp: number;
  language: 'zh' | 'en';
}

export interface BottleFishingRecord {
  date: string; // YYYY-MM-DD
  fishedCount: number; // 今天已打捞次数
  maxCount: number; // 最大打捞次数
  lastFishingTime?: number;
  thrownBackBottles: string[]; // 今天投回的瓶子ID
}

export interface UserBottleStats {
  totalFished: number; // 总打捞次数
  totalReplied: number; // 总回复次数
  totalThrownBack: number; // 总投回次数
  receivedReplies: number; // 收到的回复数
}
