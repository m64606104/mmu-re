export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  modelName: string;
  // 语音转文字配置
  speechToText?: {
    enabled: boolean; // 是否启用语音转文字
    apiUrl?: string; // 语音识别API地址
    apiKey?: string; // 语音识别API Key
    model?: string; // 语音识别模型（如glm-4-flash）
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  mediaType?: 'image' | 'video' | 'voice' | 'sticker'; // 媒体类型（新增sticker表情包）
  mediaDescription?: string; // AI的文字描述或用户的内容描述
  mediaUrl?: string; // 用户上传的真实媒体URL
  isMediaDescriptionOnly?: boolean; // 是否仅为文字描述（AI发送）
  voiceDuration?: number; // 语音时长（秒）
  isVoicePlayed?: boolean; // 语音是否已播放
  replyTo?: {
    id: string;
    content: string;
    role: 'user' | 'assistant';
  }; // 引用的消息
}

export interface CharacterSettings {
  avatar?: string;
  nickname: string;
  username?: string; // 角色网名
  systemPrompt: string;
  personality: string;
  languageStyle: string;
  languageExample: string;
  memoryEvents: string;
  // AI主动发消息配置
  proactiveMessaging?: {
    enabled: boolean; // 是否启用
    minInterval: number; // 最小间隔（分钟）
    maxInterval: number; // 最大间隔（分钟）
    activeHourStart: number; // 活跃时段开始（小时，0-23）
    activeHourEnd: number; // 活跃时段结束（小时，0-23）
    lastMessageTime?: number; // 上次主动发消息的时间戳
  };
  // 🧠 记忆系统配置
  memoryConfig?: {
    enabled: boolean; // 是否启用完整记忆系统（默认true）
    // true: 每次对话都包含记忆（性能要求高）
    // false: 仅在需要时调取记忆（性能友好）
  };
  // 📸 朋友圈记忆配置
  momentsMemoryConfig?: {
    enabled: boolean; // 是否记录朋友圈内容到记忆（默认true）
  };
  // 📝 自定义上下文配置
  contextConfig?: {
    enabled: boolean; // 是否启用自定义上下文数量（默认false）
    messageCount: number; // 上下文消息数量（1-100）
  };
  // 📚 资料库配置
  knowledgeBase?: KnowledgeBaseItem[];
}

// 资料库条目
export interface KnowledgeBaseItem {
  id: string;
  title: string; // 文档标题
  content: string; // 文档内容
  type: 'text' | 'file'; // 类型：直接文本或上传文件
  createdAt: number; // 创建时间
  updatedAt: number; // 更新时间
}

// AI状态类型
export type AIStatus = 'online' | 'offline' | 'busy' | 'resting' | 'away';

// AI行为轨迹条目
export interface AIActivityLog {
  id: string;
  timestamp: number; // 时间戳
  activity: string; // 行为描述
  location?: string; // 地点
  status?: AIStatus; // 对应的状态
}

// 活动日志条目（用于生活模拟）
export interface ActivityLogEntry {
  timestamp: number; // 时间戳
  activity: string; // 活动描述
  status: string; // 状态
  location: string; // 地点
  mood?: string; // 心情
}

// AI状态信息
export interface AIStatusInfo {
  status: AIStatus; // 当前状态
  statusText: string; // 状态显示文字（如"在线"、"休息中"）
  currentActivity?: string; // 当前行为（如"查看Ta的行为轨迹"）
  activityLogs: AIActivityLog[]; // 行为轨迹列表
  lastUpdateTime: number; // 最后更新时间
}

export interface Conversation {
  id: string;
  type: 'private' | 'group';
  name: string;
  avatar?: string;
  messages: Message[];
  characterSettings?: CharacterSettings;
  lastMessageTime: number;
  unreadCount: number;
  isMuted?: boolean; // 是否开启免打扰（默认false）
  enabledFeatures?: string[];
  groupRemark?: string; // 群备注名（仅群聊）
  members?: string[]; // 群成员ID数组（仅群聊）
  aiStatus?: AIStatusInfo; // AI状态信息（仅私聊AI角色）
}

export interface UserProfile {
  avatar?: string;
  username: string;
  bio: string;
  coverImage?: string;
  avatarBadge?: string; // 头像装饰图标
  status?: string; // 在线状态
  // 个人资料（仅供AI参考，不在普通模式显示）
  personalInfo?: {
    name?: string; // 真实姓名/昵称
    gender?: string; // 性别
    age?: string; // 年龄
    background?: string; // 身份背景
  };
}

export interface MomentPost {
  id: string;
  authorId?: string; // 发布者ID（兼容旧版userId）
  userId?: string; // 旧版兼容
  authorName?: string; // 发布者名称（兼容旧版username）
  username?: string; // 旧版兼容
  authorAvatar?: string; // 发布者头像（兼容旧版userAvatar）
  userAvatar?: string; // 旧版兼容
  content: string;
  images?: string[]; // 图片URL数组
  imageDescriptions?: string[]; // AI生成的图片描述数组（用于纯文字描述图片）
  location?: string; // 位置信息
  timestamp: number;
  likes: string[];
  comments: MomentComment[];
  isRead?: boolean; // 是否已读
  mentionedUsers?: string[]; // @提到的用户ID数组
  // 扩展内容类型
  contentType?: 'text' | 'images' | 'music' | 'video' | 'link'; // 内容类型
  musicInfo?: { // 音乐分享信息
    title: string;
    artist: string;
    coverUrl?: string; // 封面图
  };
  videoInfo?: { // 视频信息
    coverUrl?: string; // 视频封面
    duration?: number; // 视频时长（秒）
  };
  linkInfo?: { // 链接分享信息
    title: string;
    description?: string;
    coverUrl?: string;
    url?: string;
  };
}

export interface MomentComment {
  id: string;
  authorId?: string; // 评论者ID（兼容旧版userId）
  userId?: string; // 旧版兼容
  authorName?: string; // 评论者名称（兼容旧版username）
  username?: string; // 旧版兼容
  authorAvatar?: string; // 评论者头像（兼容旧版userAvatar）
  userAvatar?: string; // 旧版兼容
  content: string;
  timestamp: number;
  replyTo?: string; // 回复的评论ID
  replyToName?: string; // 回复的用户名称
  replyToUsername?: string; // 旧版兼容
}

// 朋友圈发布计划
export interface MomentPlan {
  theme: string; // 朋友圈主题
  scheduledTime: number; // 计划发布时间戳
  relatedToPrevious: boolean; // 是否与上一条相关
}

// 朋友圈数据库（每个联系人的朋友圈）
export interface MomentsData {
  contactId: string;
  posts: MomentPost[];
  lastGeneratedTime: number; // 上次生成朋友圈的时间
  lastGenerationDate: string; // 上次生成朋友圈的日期（YYYY-MM-DD）
  todayTargetCount: number; // 今天目标生成数量（1-5随机）
  todayGeneratedCount: number; // 今天已生成的数量
  todayPlans: MomentPlan[]; // 今天的朋友圈发布计划
  settings: {
    autoGenerate: boolean; // 是否自动生成
    minInterval: number; // 最小间隔（小时，24-72，即1-3天）
    maxInterval: number; // 最大间隔（小时）
    minPostsPerDay: number; // 每天最少发布数
    maxPostsPerDay: number; // 每天最多发布数
  };
}

// AI记忆条目
export interface MemoryEntry {
  id: string;
  timestamp: number; // 记忆创建时间
  content: string; // 记忆内容
  importance: 'low' | 'medium' | 'high'; // 重要性等级
  category?: string; // 分类（如：个人信息、喜好、事件、AI经历、对话互动等）
  relatedMessageIds?: string[]; // 关联的消息ID
  autoGenerated: boolean; // 是否由AI自动生成
}

// AI记忆库
export interface MemoryBank {
  conversationId: string; // 对话ID
  memories: MemoryEntry[];
  lastSummaryMessageCount: number; // 上次总结时的消息数量
  totalMessagesSinceLastSummary: number; // 距离上次总结的消息数量
  settings: {
    autoSummaryInterval: number; // 自动总结间隔（消息数量）
    maxMemories: number; // 最大记忆条目数
    enableAutoSummary: boolean; // 是否启用自动总结
  };
}

export type Screen = 'home' | 'settings' | 'social' | 'chat' | 'character-settings' | 'new-conversation' | 'profile' | 'moments' | 'contacts' | 'add-friend' | 'create-group' | 'theme' | 'guide' | 'relationships';

export interface ThemeSettings {
  wallpaper: string;
  customWallpaper?: string;
  customBannerImage?: string; // 第二页的横幅图片
}
