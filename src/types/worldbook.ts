// 世界书类型定义

export type WorldbookScope = 'global' | 'local';
export type WorldbookContentType = 'text' | 'html';
export type WorldbookInsertionPosition = 'before' | 'middle' | 'after';

export interface WorldbookItem {
  id: string;
  title: string;
  content: string;
  type: WorldbookContentType;
  scope: WorldbookScope;
  categories: string[];
  insertion: WorldbookInsertionPosition;
  createdAt: number;
  updatedAt: number;
}

export interface WorldbookMountConfig {
  enabled: boolean;
  selectedIds: string[];
  categoryFilter?: string;
}

export interface WorldbookCategory {
  id: string;
  name: string;
  color: string;
}
