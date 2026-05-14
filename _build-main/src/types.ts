/** 私聊：AI 调用文生图接口发送真实配图（与 [IMG:] 纯描述气泡区分，使用 [生图:] 标记） */
export interface PrivateAiImageGenerationConfig {
  /** 总开关；关闭时模型不应走生图协议，且 [生图:] 会从正文剥除 */
  enabled: boolean;
  /** 留空则复用主接口 Base URL */
  baseUrl?: string;
  /** 留空则复用主接口 API Key */
  apiKey?: string;
  /** 生图模型 ID（如 dall-e-3） */
  model?: string;
  /**
   * 每个私聊会话「自然日」内最多成功生成的张数（用户点接受并成功落图后计数）。
   * 设为 0 表示不限制。
   */
  dailyMaxPerConversation: number;
  /** 如 1024x1024；依网关支持 */
  size?: string;
}

/** MiniMax 文本转语音（HTTP T2A v2）；需在平台创建 API Key 与 Group ID */
export type MinimaxTtsRegionPreset = 'international' | 'china';

export interface MinimaxTtsApiConfig {
  /** 保存时随 Key+Group 自动为 true；聊天与试听均以凭证为准，应用内不再用此项做门闩 */
  enabled: boolean;
  /** 留空则按 regionPreset 自动使用官方 API 根；仅反向代理或特殊网关时填写 */
  baseUrl?: string;
  apiKey?: string;
  groupId?: string;
  regionPreset?: MinimaxTtsRegionPreset;
  /** 合成模型，如 speech-2.8-hd */
  model?: string;
}

/** 与 MiniMax T2A 请求体 `voice_modify` 一致（调试台「声音效果器」滑块） */
export interface CharacterTtsVoiceModify {
  pitch?: number;
  intensity?: number;
  timbre?: number;
  /** 如 spacious_echo；留空则不传 */
  soundEffects?: string;
}

/** 角色级 TTS 偏好（依赖设置里已保存的 MiniMax Key + Group） */
export interface CharacterTtsSettings {
  /** 为 true 时隐藏助手语音消息上的合成播放入口 */
  disabled?: boolean;
  voiceId?: string;
  speed?: number;
  vol?: number;
  pitch?: number;
  /** 对应 MiniMax language_boost，如 auto、Chinese、English */
  languageBoost?: string;
  /** 调试台 JSON 里的 voice_modify；与 voice_setting.pitch 不同 */
  voiceModify?: CharacterTtsVoiceModify;
}

/**
 * 与主聊天可分离的 OpenAI 兼容 chat/completions（生活模拟、记忆引擎等）。
 * 勾选 enabled 后：baseUrl / apiKey / modelName 每项可单独留空，留空则该项与主聊天 apiConfig 相同；仅非空项覆盖主配置。
 * 未勾选 enabled 时整条请求仍走主 apiConfig。
 * temperature：独立记忆总结勾选且为有效数字时用于记忆 JSON（askJson）；否则记忆侧固定 0.3。
 * 独立生活模拟勾选且为有效数字时用于生活模拟请求；否则生活模拟仍用随机模式默认温（见 lifeEngine）。
 */
export interface BackgroundChatCompletionsOverride {
  enabled?: boolean;
  baseUrl?: string;
  apiKey?: string;
  modelName?: string;
  temperature?: number;
}

export interface BackgroundChatApisConfig {
  /** AI 生活模拟等「状态/日程」类后台 JSON */
  statusUpdate?: BackgroundChatCompletionsOverride;
  /** memorySystem 内记忆写入/总结；群记忆总结在去群级模型名前套此线路 */
  memorySummary?: BackgroundChatCompletionsOverride;
  /**
   * 私聊/群聊：当请求体含多模态 image_url（用户发图等）时，可单独走一条 OpenAI 兼容 chat/completions。
   * 勾选 enabled 后 Base URL / API Key / 模型逐项留空则与「当前对话已解析配置」（主接口 + 角色/群单独模型等）该项相同。
   * 未勾选则附图与纯文字仍同源。
   */
  visionImageRecognition?: BackgroundChatCompletionsOverride;
}

export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  modelName: string;
  /** 私聊真实配图（OpenAI 兼容 /v1/images/generations） */
  privateAiImageGeneration?: PrivateAiImageGenerationConfig;
  /** MiniMax 语音合成（助手语音条 TTS） */
  minimaxTts?: MinimaxTtsApiConfig;
  /** 可选：后台 completion 与主聊天线路/模型分离（省配额或避开网关限制） */
  backgroundChatApis?: BackgroundChatApisConfig;
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
  /** 本次保存编辑前的正文快照；发往模型时可与当前 content 对照，便于对齐文风与称谓 */
  editBaselineContent?: string;
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
  /** 群聊：用户发送「空消息」仅触发 AI 互聊一轮，用户旁观（不在模型里当作文本发言） */
  groupAiOnlyTrigger?: boolean;
  /** 群聊：与 groupAiOnlyTrigger 同时出现，表示「刚建群后的首次空发送」入群破冰轮 */
  groupIcebreakerTrigger?: boolean;
  /** 群聊：建群后用户第一条有内容的留言，触发本轮「新群入群情境」说明（与破冰二选一） */
  groupOrientationTrigger?: boolean;
  /**
   * 消息场景（默认视为手机 IM）：
   * - `im`：普通线上聊天气泡
   * - `face_to_face`：现实见面叙事模式；组「手机聊天」模型上下文时应默认排除，避免文风与篇幅污染
   */
  channel?: 'im' | 'face_to_face';
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

/** 角色互动模式：陪伴型默认；工具型为助手风格，不参与生活轨迹/朋友圈侧逻辑 */
export type CharacterInteractionMode = 'companion' | 'tool';

export interface CharacterSettings {
  avatar?: string;
  originalAvatar?: string; // 原始头像（用于"换回去"功能）
  chatBackground?: string; // 聊天背景图
  /** 用户通讯录中的备注名（列表展示），不是角色的法定本名 */
  nickname: string;
  /** 角色本名：用户设定，角色自我认同的真实姓名 */
  realName?: string;
  /** 对外网名（群聊名片等），通常由角色自拟，也可通过回复中的 [改网名:xxx] 更新 */
  username?: string;
  avatarVisionProfile?: {
    summary: string; // 视觉模型总结
    appearanceTags: string[]; // 外观标签
    styleTags: string[]; // 风格标签
    detectedNameText?: string; // 头像里识别到的可能文字
    avatarSource?: string; // 解析时使用的头像URL
    analyzedAt: number; // 解析时间
    sourceModel?: string; // 使用的模型
  };
  systemPrompt: string;
  /**
   * 陪伴型（默认）：拟人聊天、可参与生活轨迹/朋友圈等。
   * 工具型：助手式回答，系统会关闭生活轨迹注入并屏蔽朋友圈侧行为。
   */
  interactionMode?: CharacterInteractionMode; // 默认 undefined 视为 companion
  personality: string;
  languageStyle: string;
  languageExample: string;
  memoryEvents: string;
  // AI主动发消息配置（新建/预设默认关闭 enabled；睡眠模拟 sleepSimulationEnabled 默认视为开启，见 pendingReply）
  proactiveMessaging?: {
    enabled: boolean; // 是否启用主动发消息（默认 false，用户手动打开）
    minInterval: number; // 最小间隔（分钟）
    maxInterval: number; // 最大间隔（分钟）
    activeHourStart: number; // 活跃时段开始（小时，0-23）
    activeHourEnd: number; // 活跃时段结束（小时，0-23）
    lastMessageTime?: number; // 上次主动发消息的时间戳
    autoIntervalByAI?: boolean; // 是否由AI自动控制频率
    relationAware?: boolean; // 是否启用关系阶段感知频控
    wakeSensitivityMode?: 'auto' | 'light' | 'normal' | 'deep'; // 睡眠叫醒阈值策略
    /** 是否与私聊生活轨迹联动「睡眠中延迟回复」；与主动发消息开关独立；缺省视为开启 */
    sleepSimulationEnabled?: boolean;
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
  // 📝 自定义上下文配置（私聊主会话：pendingReplyService 按此截取发给模型的历史）
  contextConfig?: {
    /** false：不按「最近 N 条」开关截断，但仍可读 maxMessagesWhenUnlimited 做软上限；true：仅最近 messageCount 条 */
    enabled: boolean;
    messageCount: number; // 1-100，仅 enabled 时生效
    /**
     * 当 enabled=false 时：最多传入多少条聊天消息；减轻极长会话的 token/网关压力。
     * 缺省按应用内默认（约 120）；0 表示不限制条数（旧版行为）。
     */
    maxMessagesWhenUnlimited?: number;
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
  /** 单独配置对话模型（非空则替代全局「模型名称」；附图也走该模型） */
  chatModelOverride?: string;
  /** 助手语音条 TTS 音色与参数（密钥在设置 → API） */
  tts?: CharacterTtsSettings;
}

export interface AIIdentityUpdateDraft {
  nickname?: string;
  avatar?: string;
  reason: string;
  confidence: number; // 0~1
  proposedAt: number;
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

/** 私聊多会话线程（共享 conversationId / 角色 / 记忆，仅隔离消息列表） */
export interface PrivateChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

/** 线下模式多窗口：每桶 IndexedDB 叙事正文独立 */
export interface FaceToFaceWindow {
  id: string;
  title: string;
  createdAt: number;
  updatedAt?: number;
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

/**
 * 私聊角色「状态卡」：根据近期线上对话推断的当下状态（仅存会话；组模型上下文时默认不包含）。
 */
export interface CharacterLiveStatus {
  scene: string;
  outfit: string;
  pose: string;
  mind: string;
  body: string;
  generatedAt: number;
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
  /** 群聊窗口背景图（data URL 或外链）；私聊请用 characterSettings.chatBackground */
  chatBackground?: string;
  members?: string[]; // 群成员ID数组（仅群聊）
  aiStatus?: AIStatusInfo; // AI状态信息（仅私聊AI角色）
  /**
   * 私聊多会话线程（元宝式）：共享同一角色与记忆，仅消息历史分桶。
   * 根级 `messages` 与 `activePrivateSessionId` 指向的会话消息保持一致（由更新入口维护）。
   */
  privateSessions?: PrivateChatSession[];
  activePrivateSessionId?: string;
  callHistory?: CallLog[]; // 通话记录历史
  /** @deprecated 已废弃；群聊统一为「类人群聊」单模式，字段仅兼容旧数据 */
  groupChatMode?: 'sequential' | 'free';
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
  /**
   * 历史字段：旧版群聊「发消息后等待」秒数；新逻辑优先读 `groupComposerQuietSeconds`。
   * 私聊延迟回复上下文打包仍可能引用（见 pendingReplyService）。
   */
  messageBufferSeconds?: number;
  /**
   * 群聊：与私聊同理——草稿为空、IME 未组字时，再连续安静满本秒数后触发下一轮 AI（仍受 pending 代数重置）。
   * 未配置时默认 DEFAULT_GROUP_COMPOSER_QUIET_SECONDS；若仅有旧数据的 messageBufferSeconds，则沿用其数值。
   */
  groupComposerQuietSeconds?: number;
  /**
   * 群聊「自动」衔接（默认关闭）。开启后引擎可在无用户发言时尝试自动接话；**尚未接线完整逻辑**，仅预留开关与策略常量。
   * 上线后须配合 GROUP_AUTO_CHAT_POLICY 做节流，避免挂机刷接口。
   */
  groupAutoChatEnabled?: boolean;
  /**
   * 私聊：输入框草稿为空（中文输入法组字期间也算「仍在输入」）、再连续安静满这么多秒后生成 AI 回复。
   * 未配置时使用 DEFAULT_PRIVATE_COMPOSER_QUIET_SECONDS。仅私聊；文字/媒体/文件等共用。
   */
  privateComposerQuietSeconds?: number;
  replySplitPreference?: 'smart' | 'single' | 'split'; // 新拆分策略偏好：智能/整段/拆条
  /** 群聊单独配置对话模型（非空则本群内 AI 回复优先使用该模型；视觉仍全局） */
  groupChatModelOverride?: string;
  /** 新建群后尚未完成破冰：用户若先空发送则触发全员入群说明；若先发文字则自动清除 */
  groupIcebreakerPending?: boolean;
  /**
   * 面对面叙事模式（剧情里现实见面）：开关与轻量元数据。
   * 增量长文应使用存储键 `momoyu_face_to_face_<conversationId>`（IndexedDB，见 `storage.ts`），勿写入 localStorage。
   */
  faceToFaceSession?: {
    active: boolean;
    /** 故事内展示：如「12:36 · 路边，车内」 */
    sceneHeaderLine?: string;
    /** 本轮生效的「线下世界书」条目 id */
    activeWorldbookIds?: string[];
    startedAt?: number;
    /** 线下叙事多窗口 */
    windows?: FaceToFaceWindow[];
    /** 当前正在编辑的线下叙事桶 id，缺省为 default（与旧版单键存储一致） */
    activeFaceToFaceWindowId?: string;
  };
  /** 私聊：角色当下状态卡（场景/穿搭等），用户从顶栏刷新生成 */
  characterLiveStatus?: CharacterLiveStatus;
}

/** 私聊延迟回复：会话未写入 `privateComposerQuietSeconds` 时的默认秒数（与 pendingReplyService 一致） */
export const DEFAULT_PRIVATE_COMPOSER_QUIET_SECONDS = 5;

/** 群聊延迟触发下一轮：未写入 `groupComposerQuietSeconds` 时的默认秒数（略长于私聊） */
export const DEFAULT_GROUP_COMPOSER_QUIET_SECONDS = 7;

/**
 * 群聊「自动续聊」规划用的节流策略（防止挂机时 API 失控）。
 * 实现自动轮时应：两轮间隔 ≥ minIntervalMs；滑动窗口内自动轮 ≤ maxAutoRoundsPerHour；
 * 用户发送任意消息或关闭开关即打断自动链。
 */
export const GROUP_AUTO_CHAT_POLICY = {
  minIntervalMs: 45_000,
  maxAutoRoundsPerHour: 12,
} as const;

/**
 * 身份卡：可与指定私聊角色关联；关联后该会话内 AI 优先采用此卡信息（缺省字段回退到通用个人资料）。
 */
export interface UserIdentityCard {
  id: string;
  /** AI 称呼用户用的名字（类似本名） */
  nickname?: string;
  /** 网名（对外称呼语境） */
  onlineName?: string;
  gender?: string;
  age?: string;
  /** 身份信息（自由描述） */
  identityInfo?: string;
  /** 关联的私聊会话 ID（每个会话同一时间只属于一张身份卡） */
  linkedConversationIds: string[];
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
    name?: string; // 默认称呼（未绑定身份卡或字段留空时使用）
    onlineName?: string; // 默认网名
    gender?: string; // 性别
    age?: string; // 年龄
    background?: string; // 身份背景 / 通用身份信息
  };
  /** 额外身份卡（可选）。未关联或非私聊时使用 personalInfo。 */
  identityCards?: UserIdentityCard[];
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
  source?: 'private' | 'group' | 'face_to_face'; // 记忆来源：私聊、群聊，或面对面叙事沉淀（仍属同一会话 memory bank）
  groupName?: string; // 如果是群聊记忆，记录群名
  groupId?: string; // 如果是群聊记忆，记录群ID
}

/** 日记条目类型：角色口吻日记 vs（历史兼容）曾写入日记流的类型 */
export type MemoryDiaryRecordType = 'diary' | 'chat_summary';

// AI日记条目（默认 recordType 为角色日记；客观纪要现存在「记忆」里 category=聊天总结）
export interface MemoryDiaryEntry {
  id: string;
  day: string; // YYYY-MM-DD (UTC+8)
  timestamp: number;
  content: string;
  moodTags?: string[];
  source: 'auto' | 'manual';
  /** 未设置时视为「角色日记」 */
  recordType?: MemoryDiaryRecordType;
}

// AI 动态画像（高于初始人设）：均按角色设定中的第一人称「我」书写，可带主观色彩
export interface DynamicIdentityProfile {
  text: string;
  version: number;
  updatedAt: number;
  sourceDay?: string;
  priority: 'override' | 'supplement';
}

// AI 事件（用于记录“状态变化/人生节点/关系变化”等，覆盖初始人设）
export interface AIEvent {
  id: string;
  timestamp: number;
  day: string; // YYYY-MM-DD (UTC+8)
  title: string;
  description: string;
  status: 'pending' | 'confirmed' | 'failed';
  tags?: string[];
}

// AI记忆库
export interface MemoryBank {
  conversationId: string; // 对话ID
  memories: MemoryEntry[];
  diaryEntries?: MemoryDiaryEntry[]; // 日记区块
  aiSelfProfile?: DynamicIdentityProfile; // 「我」对自己的认知（高优先级）
  userProfile?: DynamicIdentityProfile; // 「我」对用户的认知（高优先级）
  aiEvents?: AIEvent[]; // AI 事件区（高优先级，覆盖初始人设）
  lastSummaryMessageCount: number; // 上次总结时的消息数量（私聊）
  totalMessagesSinceLastSummary: number; // 距离上次总结的消息数量
  lastHundredReviewCount?: number; // 上次100条复盘计数
  dayPartSummaryMarks?: Record<string, number>; // 早/中/晚总结标记（key: YYYY-MM-DD:morning/noon/evening）
  lastDailySummaryDay?: string; // 上次日总结日期（UTC+8）
  lastGroupSummaryCount?: number; // 上次群聊总结时的消息数量
  totalGroupMessagesSinceLastSummary?: number; // 距离上次群聊总结的消息数量
  /** 阶段总结（50/100 条）连续解析失败后，在此时间戳之前不再请求 API，避免刷屏重试 */
  memoryEngineStageRetryNotBefore?: number;
  memoryEngineStageFailStreak?: number;
  /** 100 条复盘连续失败后的退避（与阶段总结独立） */
  memoryEngineHundredRetryNotBefore?: number;
  memoryEngineHundredFailStreak?: number;
  settings: {
    autoSummaryInterval: number; // 自动总结间隔（消息数量）
    maxMemories: number; // 最大记忆条目数
    enableAutoSummary: boolean; // 是否启用自动总结
    groupSummaryInterval?: number; // 群聊记忆总结间隔（默认50条）
  };
}

/**
 * 编辑学习 / 语言风格画像：IndexedDB 内按 **conversationId（角色/私聊根会话）** 分桶，
 * 与角色设置、记忆库等同理——跟随角色；角色迁移包带出；仅删除整个私聊角色时清理；
 * 删多话题子会话、清空聊天记录等不改变 conversationId，不清理此处。
 */
/** 聊天消息手动编辑 → 独立「编辑学习 / 调试台」记录（不进通用记忆库） */
export interface EditCalibrationEntry {
  id: string;
  messageId: string;
  role: 'user' | 'assistant';
  revisedContent: string;
  baselineContent: string;
  createdAt: number;
  aiReflection?: string;
  aiReflectionStatus: 'pending' | 'ok' | 'error';
  aiReflectionError?: string;
}

/** 私聊：由编辑校对反思合并而成的增长型「用户语言风格画像」（仅存 IndexedDB，不进记忆库条目） */
export interface LanguageStyleProfileDoc {
  text: string;
  version: number;
  updatedAt: number;
}

export type Screen = 'home' | 'settings' | 'social' | 'chat' | 'character-settings' | 'edit-calibration-studio' | 'new-conversation' | 'profile' | 'moments' | 'contacts' | 'voice-favorites' | 'add-friend' | 'create-group' | 'theme' | 'guide' | 'relationships' | 'announcement' | 'wallet' | 'shopping' | 'user-system' | 'order-history' | 'database' | 'letterbox' | 'letter-writing' | 'pen-pals' | 'archived-letters' | 'achievements' | 'favorite-letters' | 'stamp-collection' | 'letter-notifications' | 'letter-home' | 'letter-timeline' | 'letter-cards' | 'bottle-fishing' | 'recycle-bin' | 'favorite-replies' | 'unreplied' | 'kindergarten' | 'worldbook' | 'easy-chat' | 'sticker-management' | 'huaduoduo' | 'huaduoduo-gogo' | 'focus-habit';

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
