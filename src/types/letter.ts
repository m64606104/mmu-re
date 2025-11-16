/**
 * 慢邮件/写信功能类型定义
 */

export interface Letter {
  id: string;
  senderId: string;  // 'user' 或 AI的ID
  senderName: string;
  senderAvatar?: string;
  
  receiverId: string;  // 'user' 或 AI的ID，漂流瓶可能是动态生成的AI
  receiverName: string;
  receiverAvatar?: string;
  
  content: string;
  
  sentAt: number;  // 寄出时间戳
  willReplyAt?: number;  // 预计回复时间（1-5天）
  repliedAt?: number;  // 实际回复时间
  
  status: 'sending' | 'sent' | 'delivered' | 'replied';  // 寄出中、已寄出、已送达、已回复
  
  isBottle: boolean;  // 是否是漂流瓶
  hasUrged: boolean;  // 是否已催促回复
  
  replyContent?: string;  // 回信内容
  bottleAIProfile?: BottleAI;  // 漂流瓶AI的完整人设信息（用于生成回信）
  
  // 多轮交流相关
  conversationRounds: LetterRound[];  // 完整的交流记录（包含来回的信件）
  currentRound: number;  // 当前轮数（从1开始）
  maxRounds: number;  // 最大轮数限制（漂流瓶专属，默认3轮）
  isPenPalAdded: boolean;  // 是否已加为笔友
  
  // 管理相关
  isArchived: boolean;  // 是否已归档（放入回收站）
  archivedAt?: number;  // 归档时间
  
  // 装饰元素
  stampStyle?: 'default' | 'vintage' | 'flower' | 'sea';  // 邮票样式
  paperStyle?: 'white' | 'vintage' | 'blue';  // 信纸样式
}

// 单轮交流记录
export interface LetterRound {
  roundNumber: number;  // 第几轮
  userLetter: {
    content: string;
    sentAt: number;
  };
  aiReply?: {
    content: string;
    repliedAt: number;
  };
}

// 漂流瓶随机AI角色池
export interface BottleAI {
  id: string;
  name: string;
  avatar: string;
  personality: string;  // 性格描述
  location: string;  // 虚拟位置
  hobby: string;  // 爱好
  isCustom?: boolean;  // 是否为用户自定义角色
  customRolePrompt?: string;  // 用户自定义的角色设定（必填）
  customBackground?: string;  // 用户自定义的背景设定（可选）
}
