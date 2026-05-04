// 表情包数据类型定义

/**
 * 表情包类型（IndexedDB 分库存储，互不混写）
 * - common: 公共表情（所有 AI 可选用；与用户发消息时的「我的表情包」合并展示）
 * - character: 角色专属（仅该角色 AI 匹配；不进用户选表情列表、不与 common/user 混库）
 * - user: 用户专属（仅用户在聊天中选用；不进 AI 匹配库）
 */
export type StickerScope = 'common' | 'character' | 'user';

/**
 * 表情包项
 */
export interface StickerItem {
  id: string;                    // 唯一标识
  imageUrl: string;              // 图片URL（base64或网络地址）
  description: string;           // 文字说明（用于AI参考）
  tags?: string[];               // 标签（用于搜索和分类）
  scope: StickerScope;           // 作用域：通用/角色专属
  characterId?: string;          // 如果是角色专属，记录角色ID
  createdAt: number;             // 创建时间
  updatedAt: number;             // 更新时间
  usage?: number;                // 使用次数统计
}

/**
 * 表情包分类
 */
export interface StickerCategory {
  id: string;                    // 分类ID
  name: string;                  // 分类名称
  icon?: string;                 // 分类图标
}

/**
 * 表情包管理配置
 */
export interface StickerManagementConfig {
  maxFileSize: number;           // 最大文件大小（字节）
  allowedFormats: string[];      // 允许的图片格式
  maxStickersPerCharacter: number; // 每个角色最多表情包数量
  maxCommonStickers: number;     // 通用表情包最多数量
}

/**
 * 默认配置
 */
export const DEFAULT_STICKER_CONFIG: StickerManagementConfig = {
  maxFileSize: 5 * 1024 * 1024,  // 5MB
  allowedFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  maxStickersPerCharacter: 100,
  maxCommonStickers: 200,
};
