// 🎯 人物行动轨迹数据类型定义
// 基于现有 AIStatus 系统扩展

import { AIStatus } from '../types';

// 活动来源类型
export type ActivitySource = 
  | 'chat'          // 聊天对话
  | 'sub_chat'      // 子聊天
  | 'status'        // 状态变更
  | 'moments'       // 朋友圈
  | 'system'        // 系统生成
  | 'scheduled'     // 预定活动
  | 'document'      // 文档相关
  | 'memory'        // 记忆触发
  | 'finance';      // 财务相关

// 活动类型（扩展现有类型）
export type ActivityType =
  | 'chatting'      // 聊天中
  | 'thinking'      // 思考中  
  | 'sleeping'      // 睡眠
  | 'working'       // 工作学习
  | 'entertainment' // 娱乐休闲
  | 'social'        // 社交活动
  | 'exercise'      // 运动健身
  | 'shopping'      // 购物
  | 'travel'        // 出行
  | 'reading'       // 阅读
  | 'writing'       // 写作
  | 'offline';      // 离线

// === 足迹明细表：具体行为记录 ===
export interface FootprintActivity {
  id: string;
  characterId: string; // 角色 ID（对应 conversationId）
  timestamp: number; // 开始时间戳
  endTimestamp?: number; // 结束时间戳
  duration?: number; // 持续时间（毫秒）
  
  // 活动内容
  activity: string; // 活动描述（AI 生成或模板）
  activityType: ActivityType; // 活动类型
  activitySubType?: string; // 子类型（如聊天的具体话题）
  
  // 数据来源（硬事实信息）
  source: ActivitySource; // 数据源类型
  sourceId?: string; // 源数据的唯一 ID
  sourceData?: Record<string, any>; // 原始数据快照
  
  // 可信度和状态
  confidence: number; // 置信度 0-1
  status: AIStatus; // 当时的 AI 状态
  
  // 位置和上下文
  location?: string; // 地点信息
  weather?: string; // 天气信息
  mood?: string; // 情绪状态
  
  // 分类和检索
  tags: string[]; // 标签数组
  category?: string; // 分类（日常/特殊/纪念日）
  
  // 元数据
  metadata: Record<string, any>; // 额外元数据
  
  // 时间戳
  createdAt: number; // 创建时间
  updatedAt?: number; // 修改时间
  generatedAt?: number; // 生成时间（区分于实际发生时间）
}

// === 足迹头表：按天汇总 ===
export interface CharacterFootprint {
  id: string;
  characterId: string; // 角色 ID
  date: string; // 日期 YYYY-MM-DD
  
  // 汇总统计
  totalActivities: number; // 总活动数
  totalDuration: number; // 总时长（毫秒）
  
  // 按类型统计
  activityCounts: Record<ActivityType, number>; // 各类型活动数量
  activityDurations: Record<ActivityType, number>; // 各类型持续时间
  
  // 状态统计
  statusDistribution: Record<AIStatus, number>; // 状态分布
  
  // 互动统计
  chatDuration: number; // 聊天时长
  chatMessageCount: number; // 消息数
  momentsCount: number; // 朋友圈数
  
  // 重点活动
  highlights: string[]; // 当日亮点活动
  mood?: string; // 整体情绪
  
  // 元数据
  summary?: string; // 日结摘要
  metadata: Record<string, any>;
  
  // 时间戳
  createdAt: number;
  updatedAt: number;
}

// 遗留兼容：旧版 DailyFootprint 类型别名
export type DailyFootprint = CharacterFootprint;

// 轨迹筛选参数
export interface FootprintFilters {
  dateRange?: {
    start: string;               // YYYY-MM-DD
    end: string;
  };
  activityTypes?: ActivityType[];
  sources?: ActivitySource[];
  minConfidence?: number;        // 最低置信度
  tags?: string[];
}

// 轨迹统计信息
export interface FootprintStats {
  totalDays: number;
  totalActivities: number;
  avgActivitiesPerDay: number;
  mostActiveTime: string;        // 最活跃时段
  favoriteActivity: ActivityType;
  totalChatTime: number;         // 总聊天时长
  moodDistribution: Record<string, number>;
}

// 轨迹生成配置
export interface FootprintGenerationConfig {
  enableAutoGeneration: boolean; // 是否启用自动生成
  generationInterval: number;    // 生成间隔（小时）
  maxActivitiesPerDay: number;   // 每日最大活动数
  useAIGeneration: boolean;      // 是否使用AI生成
  includeSystemActivities: boolean; // 是否包含系统活动
  confidenceThreshold: number;   // 置信度阈值
}
