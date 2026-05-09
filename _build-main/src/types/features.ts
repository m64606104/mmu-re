// 功能模块类型定义
export interface Feature {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  description?: string;
  icon?: string;
}

export interface FeatureCategory {
  id: string;
  name: string;
  features: Feature[];
}

// 所有可用功能
export const ALL_FEATURES: Feature[] = [
  // AI 核心功能
  { id: 'ai-vision', name: 'AI视觉识别', category: 'ai-core', enabled: false },
  { id: 'ai-avatar', name: 'AI自主换形象', category: 'ai-core', enabled: false },
  { id: 'ai-proactive', name: 'AI主动消息', category: 'ai-core', enabled: false },
  { id: 'ai-accounting', name: 'AI记账功能', category: 'ai-core', enabled: false },
  
  // 娱乐功能
  { id: 'meme-system', name: '热梗系统', category: 'entertainment', enabled: false },
  { id: 'music-search', name: '音乐联网搜索', category: 'entertainment', enabled: false },
  { id: 'listen-together', name: '一起听功能', category: 'entertainment', enabled: false },
  { id: 'music-card', name: '音乐邀请卡片', category: 'entertainment', enabled: false },
  
  // 社交功能
  { id: 'music-player', name: '音乐播放器', category: 'social', enabled: false },
  { id: 'spirit-island', name: '灵动岛功能', category: 'social', enabled: false },
  { id: 'ai-moments', name: 'AI自动发朋友圈', category: 'social', enabled: false },
  { id: 'moments-interaction', name: '朋友圈智能互动', category: 'social', enabled: false },
  
  // 小红书功能
  { id: 'redbook-share', name: '小红书卡片分享', category: 'redbook', enabled: false },
  { id: 'redbook-life', name: '小红书生图', category: 'redbook', enabled: false },
  { id: 'forum-community', name: '论坛社区系统', category: 'redbook', enabled: false },
  { id: 'forum-reply', name: '论坛发帖回复', category: 'redbook', enabled: false },
  
  // 论坛功能
  { id: 'forum-private', name: '论坛私信', category: 'forum', enabled: false },
  { id: 'forum-topic', name: '论坛主题', category: 'forum', enabled: false },
  { id: 'ios-notification', name: 'iOS通知栏', category: 'forum', enabled: false },
  { id: 'live-interaction', name: '直播间互动', category: 'forum', enabled: false },
  
  // 高级功能
  { id: 'voice-call', name: '查手机', category: 'advanced', enabled: false },
  { id: 'redpack', name: '红包功能', category: 'advanced', enabled: false },
  { id: 'transfer', name: '转账功能', category: 'advanced', enabled: false },
  { id: 'intimacy', name: '亲密付功能', category: 'advanced', enabled: false },
  
  // 系统功能
  { id: 'zero-money', name: '零钱系统', category: 'system', enabled: false },
  { id: 'memory-system', name: '记忆系统', category: 'system', enabled: false },
  { id: 'memory-summary', name: '记忆总结', category: 'system', enabled: false },
  { id: 'firework', name: '缘火花功能', category: 'system', enabled: false },
  
  // 日记功能
  { id: 'diary', name: '日记功能', category: 'diary', enabled: false },
  { id: 'group-chat', name: '群聊功能', category: 'diary', enabled: false },
  { id: 'group-interaction', name: '群聊AI互动', category: 'diary', enabled: false },
  { id: 'couple-space', name: '情侣空间', category: 'diary', enabled: false },
  
  // 其他功能
  { id: 'world-system', name: '世界书系统', category: 'other', enabled: false },
  { id: 'voice-call-feature', name: '语音通话', category: 'other', enabled: false },
  { id: 'call-record', name: '通话记录', category: 'other', enabled: false },
  { id: 'emotion-package', name: '表情包系统', category: 'other', enabled: false },
];

// 功能分类
export const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    id: 'ai-core',
    name: 'AI 核心',
    features: ALL_FEATURES.filter(f => f.category === 'ai-core'),
  },
  {
    id: 'entertainment',
    name: '娱乐功能',
    features: ALL_FEATURES.filter(f => f.category === 'entertainment'),
  },
  {
    id: 'social',
    name: '社交功能',
    features: ALL_FEATURES.filter(f => f.category === 'social'),
  },
  {
    id: 'redbook',
    name: '小红书',
    features: ALL_FEATURES.filter(f => f.category === 'redbook'),
  },
  {
    id: 'forum',
    name: '论坛功能',
    features: ALL_FEATURES.filter(f => f.category === 'forum'),
  },
  {
    id: 'advanced',
    name: '高级功能',
    features: ALL_FEATURES.filter(f => f.category === 'advanced'),
  },
  {
    id: 'system',
    name: '系统功能',
    features: ALL_FEATURES.filter(f => f.category === 'system'),
  },
  {
    id: 'diary',
    name: '日记功能',
    features: ALL_FEATURES.filter(f => f.category === 'diary'),
  },
  {
    id: 'other',
    name: '其他功能',
    features: ALL_FEATURES.filter(f => f.category === 'other'),
  },
];
