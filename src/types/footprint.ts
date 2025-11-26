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

// 扩展的活动记录（基于现有 AIActivityLog）
export interface FootprintActivity {
  id: string;
  conversationId: string;        // 关联的对话ID
  timestamp: number;             // 活动时间戳
  duration?: number;             // 活动持续时长（毫秒）
  
  // 基础信息
  activity: string;              // 活动描述
  activityType: ActivityType;    // 活动类型
  status: AIStatus;              // 当时的在线状态
  location?: string;             // 活动地点
  
  // 数据来源
  source: ActivitySource;        // 活动来源
  sourceId?: string;            // 来源记录ID（消息ID、朋友圈ID等）
  confidence: number;           // 置信度 0-1（AI生成 vs 真实记录）
  
  // 扩展信息
  mood?: string;                // 情绪状态
  weather?: string;             // 天气信息
  companions?: string[];        // 同伴（其他角色）
  tags?: string[];              // 标签（工作、学习、娱乐等）
  
  // 元数据
  createdAt: number;            // 记录创建时间
  updatedAt?: number;           // 最后更新时间
}

// 每日行动轨迹汇总（类似 Eve Chat 的 characterFootprints）
export interface DailyFootprint {
  id: string;
  conversationId: string;        // 关联的对话ID
  date: string;                  // 日期（YYYY-MM-DD）
  
  // 汇总统计
  totalActivities: number;       // 总活动数
  activeDuration: number;        // 活跃时长（毫秒）
  sleepDuration: number;         // 睡眠时长
  chatDuration: number;          // 聊天时长
  
  // 活动分布
  activityCounts: Record<ActivityType, number>;
  statusCounts: Record<AIStatus, number>;
  
  // 重点活动
  highlights: string[];          // 当日重点活动描述
  mood: 'positive' | 'neutral' | 'negative'; // 整体情绪
  
  // 元数据
  createdAt: number;
  updatedAt: number;
}

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
