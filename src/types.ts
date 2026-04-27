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

export interface MediaItem {
  type: 'image' | 'video' | 'voice' | 'sticker';
  description: string; // 媒体描述
  url?: string; // 用户上传的真实URL
  duration?: number; // 语音/视频时长（秒）
  isPlayed?: boolean; // 是否已播放（用于语音）
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  stageText?: string;
  // 新的多媒体支持
  mediaItems?: MediaItem[]; // 多媒体数组，支持混合发送
  // 旧的单媒体字段（保留兼容性）
  mediaType?: 'image' | 'video' | 'voice' | 'sticker';
  mediaDescription?: string;
  mediaUrl?: string;
  stickerKind?: 'custom' | 'systemEmoji';
  isMediaDescriptionOnly?: boolean;
  voiceDuration?: number;
  isVoicePlayed?: boolean;
  replyTo?: {
    id: string;
    content: string;
    role: 'user' | 'assistant';
  }; // 引用的消息
  edited?: boolean; // 是否已编辑
  // 💰 红包/转账支持
  moneyTransfer?: MoneyTransfer;
  // 📄 文档支持
  document?: DocumentMessage;
  // 🛍️ 订单/购物支持
  order?: OrderMessage;
  // 🔗 链接预览支持（新系统，替代旧的document）
  linkPreview?: LinkPreviewMessage;
  // 📤 转发消息支持
  forwarded?: ForwardedMessage;
  // 🎭 可视化内容模块（小红书、知乎、微博、搜索记录等）
  socialFeed?: SocialFeedMessage;
  // 🎵 音乐分享支持
  music?: MusicMessage;
  // 🎵 网易云音乐分享支持
  neteaseMusicInfo?: {
    id: string;
    title: string;
    artist: string;
    album?: string;
    coverUrl?: string;
    playUrl?: string;
    duration?: number;
    shareUrl: string;
    platform: 'netease';
  };
  // 🚫 标记是否为拉黑期间的消息
  isBlockedMessage?: boolean;
  // 🆕 消息回应
  reactions?: Array<{
    from: 'user' | 'assistant';
    type: string; // emoji
  }>;
}

// 💰 红包/转账类型
export interface MoneyTransfer {
  type: 'redPacket' | 'transfer' | 'groupRedPacket'; // 红包、转账或群红包
  amount: number; // 金额
  message?: string; // 红包/转账留言
  status: 'pending' | 'received' | 'returned'; // 待领取、已领取、已退回
  receivedAt?: number; // 领取时间
  originalAmount?: number; // 原始金额（用于退回时显示）
  // 群红包特有字段
  groupRedPacket?: GroupRedPacketInfo;
}

// 群红包详细信息
export interface GroupRedPacketInfo {
  id: string; // 红包ID
  senderId: string; // 发送者ID
  senderName: string; // 发送者名称
  message?: string; // 红包留言
  totalAmount: number; // 总金额
  totalCount: number; // 红包总数
  remainingCount: number; // 剩余个数
  remainingAmount: number; // 剩余金额
  redPacketType: 'average' | 'random' | 'exclusive'; // 普通/拼手气/专属
  password?: string; // 口令（口令红包）
  exclusiveUserId?: string; // 专属用户ID（专属红包）
  exclusiveUserName?: string; // 专属用户名称
  claimedBy: Array<{
    userId: string;
    userName: string;
    amount: number;
    timestamp: number;
    isLuckiest?: boolean; // 是否为手气最佳
  }>;
  createdAt: number; // 创建时间
  expiredAt: number; // 过期时间（24小时后）
  status: 'active' | 'finished' | 'expired'; // 进行中/已领完/已过期
}

// 📄 文档消息类型
export interface OriginalDocumentFile {
  fileName: string; // 原始文件名
  mimeType: string; // MIME类型
  fileSize: number; // 原始文件大小（字节）
  base64Data?: string; // 原始文件内容（可选，过大时不保存）
}

export interface DocumentMessage {
  title: string; // 文档标题
  content: string; // 文档内容
  size?: number; // 文档大小（字节）
  type: 'text' | 'markdown' | 'code'; // 文档类型
  greeting?: string; // 文档附带的问候语，如"请查收"
  originalFile?: OriginalDocumentFile; // 原生文件信息
}

// 🛍️ 订单消息类型
export interface OrderMessage {
  type: 'gift' | 'payRequest'; // 礼物（为他人购买）或代付请求
  source: 'taobao' | 'eleme' | 'movie'; // 商品来源：淘宝/饿了么/电影票
  products: OrderProduct[]; // 商品列表
  totalAmount: number; // 总金额
  recipientId?: string; // 收礼人ID（type为gift时）
  recipientName?: string; // 收礼人名称
  message?: string; // 留言
  status: 'pending' | 'accepted' | 'rejected' | 'paid'; // 待处理、已接受、已拒绝、已支付
  orderNumber?: string; // 订单号
  shippingAddress?: string; // 配送地址
  createdAt?: number; // 订单创建时间戳（用于动态配送模拟）
  // 外卖专用字段
  deliveryInfo?: {
    storeName?: string; // 店铺名称
    distance?: string; // 距离
    estimatedTime?: number; // 预计送达时间（分钟）
    deliveryStatus?: 'preparing' | 'delivering' | 'delivered'; // 配送状态
    riderName?: string; // 骑手姓名
    riderPhone?: string; // 骑手电话
  };
  // 电影票专用字段
  movieInfo?: {
    cinemaName?: string; // 影院名称
    showtime?: string; // 场次时间
    seats?: string; // 座位号
    hallNumber?: string; // 影厅号
  };
}

// 🛒 订单商品
export interface OrderProduct {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

// 🔗 链接预览消息类型（新系统）
export interface LinkPreviewMessage {
  title: string;           // 标题
  description?: string;    // 描述/摘要
  coverImage?: string;     // 封面图片URL或描述
  platform: 'xiaohongshu' | 'zhihu' | 'weibo' | 'wechat' | 'news' | 'web' | 'document';
  url?: string;            // 实际URL（如果有）
  author?: string;         // 作者
  publishTime?: string;    // 发布时间
  content?: string;        // 完整内容（用于点击后展开）
}

// 🎭 社交平台内容消息类型（完整界面）
export interface SocialFeedMessage {
  platform: 'xiaohongshu' | 'zhihu' | 'weibo' | 'search-history';
  rawContent: string;  // 原始格式化内容（包含所有标记）
}

export interface CharacterSettings {
  avatar?: string;
  originalAvatar?: string; // 原始头像（用于"换回去"功能）
  chatBackground?: string; // 聊天背景图
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
  // 📸 朋友圈频率配置
  momentsConfig?: {
    description?: string; // 用户用自然语言描述的发布规则
  };
  // 🎨 自定义气泡样式 (CSS)
  customBubbleCss?: string;
  // 🎨 是否隐藏气泡尾巴
  hideBubbleTail?: boolean;
  // 🎨 气泡装饰配置
  bubbleDecoration?: BubbleDecoration;
  // 📋 论坛AI生成配置
  forumAIConfig?: {
    enabled: boolean; // 是否允许使用该角色的历史聊天内容生成论坛动态
    lastGeneratedAt?: number; // 上次生成时间
  };
  // 📞 通话配置
  callSettings?: {
    // 视频通话配置
    videoCall?: {
      // AI角色在视频通话中的显示方式
      aiDisplayMode: 'avatar' | 'animated' | 'custom'; // 头像 | 动图 | 自定义
      customVideoUrl?: string; // 自定义视频/动图URL
      // 用户视图配置
      userViewSettings?: {
        showUserAvatar: boolean; // 是否显示用户头像
        userAvatarSize: 'small' | 'medium' | 'large'; // 用户头像大小
        userAvatarPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; // 用户头像位置
      };
    };
    // 语音通话配置
    voiceCall?: {
      // 语音模式下的背景效果
      backgroundEffect: 'blur' | 'gradient' | 'custom';
      customBackgroundUrl?: string; // 自定义背景图
      // 头像动画效果
      avatarAnimation: 'pulse' | 'rotate' | 'bounce' | 'none';
    };
  };
  // 📚 世界书禁用开关
  disableWorldbook?: boolean; // 是否禁用世界书（默认false）
  // 📮 笔友来源标记
  penPalSourceLetterId?: string; // 如果是从信箱笔友添加的，记录来源信件ID
}

// 气泡装饰配置接口
export interface BubbleDecoration {
  show: boolean;
  type: 'image' | 'text';
  content: string; // 图片URL 或 文字内容
  position: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left';
  size: number; // 大小 (px)
  offsetX: number; // 横向偏移
  offsetY: number; // 纵向偏移
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

// AI状态信息
export interface AIStatusInfo {
  status: AIStatus; // 当前状态
  statusText: string; // 状态显示文字（如"在线"、"休息中"）
  currentActivity?: string; // 当前行为详细描述
  lastUpdateTime: number; // 最后更新时间
}

// 💬 子聊天类型定义
export interface SubChat {
  id: string; // 子聊天唯一ID
  name: string; // 用户命名的子聊天名称
  messages: Message[]; // 独立的消息列表
  createdAt: number; // 创建时间
  lastMessageTime: number; // 最后消息时间
  unreadCount: number; // 未读消息数
  isActive: boolean; // 是否激活/打开
  initiator: 'user' | 'ai'; // 发起方（用户或AI）
  purpose?: string; // AI发起时的目的说明（如"想私下聊聊"）
  status: 'pending' | 'active' | 'closed'; // 待接受、进行中、已关闭
  conversationId: string; // 所属主对话ID
}

// 子聊天请求类型（AI发起时）
export interface SubChatRequest {
  id: string; // 请求ID
  purpose: string; // 发起目的
  suggestedName: string; // AI建议的名称
  timestamp: number; // 发起时间
}

// 📞 通话记录类型
export interface CallLog {
  id: string;
  type: 'video' | 'voice'; // 目前主要实现视频通话
  startTime: number; // 开始时间
  endTime: number; // 结束时间
  duration: number; // 持续时长（秒）
  transcript: Message[]; // 通话时的对话记录
  summary?: string; // 通话总结（可选）
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
  subChats?: SubChat[]; // 子聊天列表
  callHistory?: CallLog[]; // 通话记录历史
  groupChatMode?: 'sequential' | 'free'; // 群聊回复模式：顺序模式 | 自由模式（默认sequential）
  groupContextConfig?: { // 群聊上下文配置（仅群聊）
    enabled: boolean; // 是否启用自定义上下文数量
    messageCount: number; // 上下文消息数量（1-100，默认30）
  };
  groupTemperature?: number; // 群聊生成温度 (0-1)
  pinned?: boolean; // 是否置顶
  isHidden?: boolean; // 是否隐藏（不显示在列表，直到有新消息）
  isBlocked?: boolean; // 是否拉黑（AI会感知到被拉黑，且不会显示在列表）
  aiChildData?: AIChildData; // AI儿童数据（仅AI幼儿园角色）
  worldbookMount?: { // 世界书挂载配置
    enabled: boolean;
    selectedIds: string[];
    categoryFilter?: string;
  };
  messageBufferSeconds?: number; // 消息缓冲时间（秒），用于延后回复
  replySplitPreference?: 'smart' | 'single' | 'split'; // 新拆分策略偏好：智能/整段/拆条
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
  source?: 'private' | 'group'; // 记忆来源：私聊或群聊
  groupName?: string; // 如果是群聊记忆，记录群名
  groupId?: string; // 如果是群聊记忆，记录群ID
}

// AI日记条目
export interface MemoryDiaryEntry {
  id: string;
  day: string; // YYYY-MM-DD (UTC+8)
  timestamp: number;
  content: string;
  moodTags?: string[];
  source: 'auto' | 'manual';
}

// AI动态画像（高于初始人设）
export interface DynamicIdentityProfile {
  text: string;
  version: number;
  updatedAt: number;
  sourceDay?: string;
  priority: 'override' | 'supplement';
}

// AI记忆库
export interface MemoryBank {
  conversationId: string; // 对话ID
  memories: MemoryEntry[];
  diaryEntries?: MemoryDiaryEntry[]; // 日记区块
  aiSelfProfile?: DynamicIdentityProfile; // 自我画像（高优先级）
  userProfile?: DynamicIdentityProfile; // 用户画像（高优先级）
  lastSummaryMessageCount: number; // 上次总结时的消息数量（私聊）
  totalMessagesSinceLastSummary: number; // 距离上次总结的消息数量
  lastGroupSummaryCount?: number; // 上次群聊总结时的消息数量
  totalGroupMessagesSinceLastSummary?: number; // 距离上次群聊总结的消息数量
  settings: {
    autoSummaryInterval: number; // 自动总结间隔（消息数量）
    maxMemories: number; // 最大记忆条目数
    enableAutoSummary: boolean; // 是否启用自动总结
    groupSummaryInterval?: number; // 群聊记忆总结间隔（默认50条）
  };
}

export type Screen = 'home' | 'settings' | 'social' | 'chat' | 'character-settings' | 'new-conversation' | 'profile' | 'moments' | 'contacts' | 'add-friend' | 'create-group' | 'theme' | 'guide' | 'relationships' | 'announcement' | 'wallet' | 'shopping' | 'user-system' | 'order-history' | 'database' | 'letterbox' | 'letter-writing' | 'pen-pals' | 'archived-letters' | 'achievements' | 'favorite-letters' | 'stamp-collection' | 'letter-notifications' | 'letter-home' | 'letter-timeline' | 'letter-cards' | 'bottle-fishing' | 'recycle-bin' | 'favorite-replies' | 'unreplied' | 'kindergarten' | 'worldbook' | 'easy-chat' | 'sticker-management' | 'huaduoduo' | 'huaduoduo-gogo';

// 购物类型
export type ShopType = 'food' | 'movie' | 'shopping';

export interface ThemeSettings {
  wallpaper: string;
  customWallpaper?: string;
  customBannerImage?: string; // 第二页的横幅图片
}

// ===================================
// 📱 公众号系统类型定义
// ===================================

// 公众号内容类型
export type OfficialAccountContentType = 
  | 'entertainment' // 娱乐新闻
  | 'food' // 美食资讯
  | 'discount' // 折扣优惠
  | 'tech' // 科技资讯
  | 'finance' // 财经新闻
  | 'life' // 生活百科
  | 'game' // 游戏资讯
  | 'custom'; // 自定义

// 公众号发布频率
export type PublishFrequency = 
  | 'realtime' // 实时（随时推送）
  | 'hourly' // 每小时
  | 'daily' // 每天
  | 'weekly' // 每周
  | 'custom'; // 自定义

// 公众号文章
export interface OfficialArticle {
  id: string; // 文章ID
  title: string; // 标题
  summary: string; // 摘要
  content: string; // 正文内容
  coverImage?: string; // 封面图片描述
  author: string; // 作者/公众号名称
  publishTime: number; // 发布时间
  readCount: number; // 阅读量
  likeCount: number; // 点赞数
  category: string; // 分类标签
  source?: string; // 来源
}

// 公众号配置
export interface OfficialAccountSettings {
  id: string; // 公众号ID
  name: string; // 公众号名称
  avatar: string; // 头像
  description: string; // 简介
  verified: boolean; // 是否认证
  contentType: OfficialAccountContentType; // 内容类型
  publishFrequency: PublishFrequency; // 发布频率
  customFrequencyHours?: number; // 自定义发布间隔（小时）
  enabled: boolean; // 是否启用
  tags: string[]; // 标签
  followerCount: number; // 关注人数
  articles: OfficialArticle[]; // 历史文章列表
  lastPublishTime?: number; // 最后发布时间
  nextPublishTime?: number; // 下次计划发布时间
}

// ==========================================
// 📤 消息转发相关类型
// ==========================================

// 转发消息类型
export interface ForwardedMessage {
  type: 'single' | 'merged'; // 单条转发或合并转发
  from: {
    conversationId: string; // 来源会话ID
    conversationName: string; // 来源会话名称
    conversationType: 'private' | 'group'; // 会话类型
  };
  // 单条转发
  originalMessage?: Message; // 原始消息（单条转发）
  // 合并转发
  messages?: ForwardedMessageItem[]; // 消息列表（合并转发）
  title?: string; // 合并转发标题（如"聊天记录"）
  timestamp: number; // 转发时间
}

// 合并转发中的单条消息
export interface ForwardedMessageItem {
  senderName: string; // 发送者名称
  senderAvatar?: string; // 发送者头像
  content: string; // 消息内容
  timestamp: number; // 原始时间
  mediaType?: 'image' | 'video' | 'voice' | 'sticker' | 'file'; // 媒体类型
  mediaUrl?: string; // 媒体URL
}

// 🎵 音乐消息类型
export interface MusicMessage {
  title: string; // 歌曲名称
  artist: string; // 歌手/艺术家
  album?: string; // 专辑名称
  duration?: number; // 时长（秒）
  coverUrl?: string; // 封面图片URL
  genre?: string; // 流派/类型
  mood?: 'happy' | 'sad' | 'energetic' | 'calm' | 'romantic' | 'mysterious'; // 音乐情绪
  tempo?: 'slow' | 'medium' | 'fast'; // 节奏
  releaseYear?: number; // 发行年份
  lyrics?: string; // 完整歌词
  lyricsWithTime?: LyricsLine[]; // 带时间轴的歌词
  platform?: 'iTunes' | 'MusicBrainz' | 'LastFM' | 'Manual'; // 数据来源
}

// 🎵 歌词行结构（带时间轴）
export interface LyricsLine {
  time: number; // 开始时间（秒）
  text: string; // 歌词文本
  endTime?: number; // 结束时间（秒）
}

// 🎓 ============ AI幼儿园系统 ============

// 词汇知识
export interface WordKnowledge {
  word: string;           // 词语
  familiarity: number;    // 熟悉度 (0-100)
  learnedAt: number;      // 学习时间戳
  reviewCount: number;    // 复习次数
  lastReview: number;     // 上次复习时间
  definition: string;     // 用户教的定义
  examples: string[];     // 例句
  category?: string;      // 词汇分类（动物、颜色、情感等）
}

// 理解力系统（分级制）
export interface Comprehension {
  level: number;          // 理解等级 (1, 2, 3, 4...)
  progress: number;       // 当前等级进度 (0-100)
  abilities: {
    literal: {
      level: number;      // 字面理解等级 (1-10)
      progress: number;   // 字面理解进度 (0-100)
    };
    context: {
      level: number;      // 上下文理解等级 (1-10)
      progress: number;   // 上下文理解进度 (0-100)
    };
    abstract: {
      level: number;      // 抽象理解等级 (1-10)
      progress: number;   // 抽象理解进度 (0-100)
    };
    emotion: {
      level: number;      // 情感理解等级 (1-10)
      progress: number;   // 情感理解进度 (0-100)
    };
    logic: {
      level: number;      // 逻辑推理等级 (1-10)
      progress: number;   // 逻辑推理进度 (0-100)
    };
  };
}

// 学习课程记录
export interface Lesson {
  id: string;
  type: 'word' | 'reading' | 'conversation' | 'story';
  content: string;        // 课程内容
  wordsLearned: string[]; // 学到的新词
  timestamp: number;
  userFeedback?: string;  // 用户的教学内容
  aiResponse?: string;    // AI的回应
}

// AI提问记录
export interface Question {
  id: string;
  question: string;       // AI的问题
  answer?: string;        // 用户的回答
  timestamp: number;
  category: 'vocabulary' | 'comprehension' | 'curiosity' | 'clarification';
  resolved: boolean;      // 是否得到解答
}

// 阅读材料
export interface ReadingMaterial {
  id: string;
  title: string;
  content: string;
  level: 1 | 2 | 3 | 4 | 5;  // 难度等级
  wordCount: number;
  coverImage?: string;
  category: 'picture_book' | 'story' | 'article' | 'knowledge' | 'custom' | 'basic_knowledge' | 'conversation' | 'food' | 'social' | 'safety' | 'science' | 'math';
  author?: string;
  addedAt: number;
  readCount: number;       // 阅读次数
  lastRead?: number;       // 上次阅读时间
  userAdded: boolean;      // 是否用户添加
}

// AI儿童成长阶段
export type GrowthStage = 'baby' | 'toddler' | 'child' | 'teen';

// 每日学习经验记录
export interface DailyLearningRecord {
  date: string;  // YYYY-MM-DD格式
  
  // 词卡教学记录
  wordTeaching: {
    roundsCompleted: number;    // 已完成轮次 (0-3)
    totalWordsLearned: number;  // 今日总学词数
    expGained: number;          // 获得的经验值
    canGainExp: boolean;        // 是否还能获得经验
  };
  
  // 各活动获得的经验值
  experienceGained: {
    wordTeaching: number;       // 词卡教学经验
    freeChat: number;           // 自由聊天经验
    topicDiscussion: number;    // 话题讨论经验
    storyReading: number;       // 故事阅读经验
  };
  
  // 活动次数统计
  activityCount: {
    chatSessions: number;       // 聊天会话数
    topicDiscussions: number;   // 话题讨论数
    storiesRead: number;        // 阅读故事数
  };
}

// AI儿童数据（基于Conversation扩展）
export interface AIChildData {
  stage: GrowthStage;
  age: number;             // 成长天数
  level: number;           // 等级
  exp: number;             // 当前级别经验值
  expToNextLevel: number;  // 升级所需经验
  totalExp?: number;       // 总累积经验值（用于简化升级计算）
  
  // 个性化设置
  formalName?: string;           // 大名（正式名称）
  nickname?: string;             // 小名（昵称）
  gender?: 'male' | 'female' | 'neutral';  // 性别
  userTitle?: string;            // 对用户的称呼（如：妈妈、老师、哥哥）
  userName?: string;             // 用户的名字
  avatar?: string;               // 自定义头像（base64）
  
  // 认知能力
  vocabulary: WordKnowledge[];     // 词汇库
  comprehension: Comprehension;    // 理解力
  
  // 学习记录
  booksRead: string[];             // 读过的书ID列表
  lessons: Lesson[];               // 课程记录
  questions: Question[];           // 提问记录
  dailyLearningRecord?: DailyLearningRecord; // 每日学习经验记录
  
  // 性格养成
  values: string[];                // 学到的价值观
  interests: string[];             // 兴趣爱好
  personality: string[];           // 性格特点
  
  // 统计数据
  totalWordsLearned: number;       // 总学词数
  totalLessons: number;            // 总课程数
  totalReadingTime: number;        // 总阅读时间（分钟）
  consecutiveDays: number;         // 连续学习天数
  
  // 最近活动
  lastInteraction: number;         // 上次互动时间
  lastLessonTime?: number;         // 上次上课时间
  lastReadingTime?: number;        // 上次阅读时间
}

// ==========================================
// 🎯 Easy Chat 系统
// ==========================================

// Easy Chat 联系人
export interface EasyChatContact {
  id: string;
  name: string;
  avatar: string;
  bubbleColor?: string; // 气泡颜色主题
}

// 私聊通话数据
export interface PrivateCallData {
  type: 'voice' | 'video'; // 通话类型
  duration: number; // 通话时长（秒）
  isActive: boolean; // 是否正在进行
}

// Easy Chat 消息
export interface EasyChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  timestamp: string;
  fullTime?: number; // 完整时间戳（毫秒），用于更精确的时间显示
  type?: 'text' | 'image' | 'video' | 'voice' | 'emojipack' | 'livestream' | 'groupcall' | 'privatecall'; // 消息类型
  imageUrl?: string; // 图片URL
  videoUrl?: string; // 视频URL
  voiceText?: string; // 语音转文字内容
  voiceDuration?: number; // 语音时长（秒）
  emojipackDescription?: string; // 表情包描述
  emojipackUrl?: string; // 表情包图片URL (自定义表情)
  livestreamData?: LivestreamData; // 直播数据
  groupcallData?: GroupCallData; // 群通话数据
  privatecallData?: PrivateCallData; // 私聊通话数据
}

// 直播数据
export interface LivestreamData {
  id: string; // 直播ID
  hostId: string; // 主播ID
  hostName: string; // 主播名称
  title: string; // 直播标题
  startTime: string; // 开播时间
  isActive: boolean; // 是否正在直播
  viewers: string[]; // 观众ID列表
  coHosts: string[]; // 一起直播的人ID列表
}

// 群通话数据
export interface GroupCallData {
  id: string; // 通话ID
  type: 'voice' | 'video'; // 通话类型
  initiatorId: string; // 发起人ID
  initiatorName: string; // 发起人名称
  startTime: string; // 开始时间
  isActive: boolean; // 是否正在进行
  participants: string[]; // 参与者ID列表
}

// Easy Chat 会话
export interface EasyChatConversation {
  id: string;
  type: 'private' | 'group';
  name: string;
  avatar: string;
  participants: string[]; // 联系人ID数组
  messages: EasyChatMessage[];
  lastMessage?: string;
  lastMessageTime?: string;
}

// Easy Chat 用户（自己）
export interface EasyChatUser {
  id: string;
  name: string;
  avatar: string;
  bubbleColor?: string; // 气泡颜色主题
}

// 全局通话状态（用于悬浮窗）
export interface GlobalCallState {
  type: 'private' | 'group' | 'livestream';
  callType: 'voice' | 'video'; // 通话类型
  conversationId: string; // 关联的会话ID
  contactName: string; // 联系人名称或群名
  contactAvatar: string; // 联系人头像或群头像
  isMinimized: boolean; // 是否最小化
  // 私聊通话专用
  privateCallData?: {
    contactId: string;
  };
  // 群通话/直播专用
  groupData?: {
    data: GroupCallData | LivestreamData;
    currentUserId: string;
    participantIds: string[];
  };
}
