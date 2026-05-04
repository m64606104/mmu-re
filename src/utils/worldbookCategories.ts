// 世界书分类管理

import { WorldbookCategory } from '../types/worldbook';
import { getCachedData, load, save, setCachedData } from './storage';

const STORAGE_KEY = 'worldbook_categories';

// 预定义颜色
export const CATEGORY_COLORS = [
  '#3B82F6', // 蓝色
  '#10B981', // 绿色
  '#F59E0B', // 橙色
  '#EF4444', // 红色
  '#8B5CF6', // 紫色
  '#EC4899', // 粉色
  '#06B6D4', // 青色
  '#F97316', // 深橙
  '#84CC16', // 青柠
  '#6366F1', // 靛蓝
];

// 默认分类
const DEFAULT_CATEGORIES: WorldbookCategory[] = [
  { id: 'general', name: '通用', color: '#3B82F6' },
  { id: 'character', name: '角色设定', color: '#10B981' },
  { id: 'world', name: '世界观', color: '#F59E0B' },
  { id: 'rules', name: '规则设定', color: '#EF4444' },
  { id: 'story', name: '故事背景', color: '#8B5CF6' },
];

// 获取所有分类
export function getAllCategories(): WorldbookCategory[] {
  const cached = getCachedData<WorldbookCategory[]>(STORAGE_KEY);
  if (Array.isArray(cached) && cached.length > 0) return cached;
  return DEFAULT_CATEGORIES;
}

// 保存所有分类
function saveCategories(categories: WorldbookCategory[]): void {
  setCachedData(STORAGE_KEY, categories);
  void save(STORAGE_KEY, categories);
}

export async function initializeWorldbookCategories(): Promise<void> {
  try {
    const stored = await load(STORAGE_KEY);
    const categories = Array.isArray(stored) && stored.length > 0 ? stored : DEFAULT_CATEGORIES;
    setCachedData(STORAGE_KEY, categories);
    if (!Array.isArray(stored) || stored.length === 0) {
      void save(STORAGE_KEY, categories);
    }
  } catch (error) {
    console.error('初始化世界书分类失败:', error);
    setCachedData(STORAGE_KEY, DEFAULT_CATEGORIES);
  }
}

// 创建新分类
export function createCategory(name: string, color: string): WorldbookCategory {
  const categories = getAllCategories();
  
  // 检查名称是否重复
  if (categories.some(cat => cat.name === name)) {
    throw new Error('分类名称已存在');
  }
  
  const newCategory: WorldbookCategory = {
    id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    color,
  };
  
  categories.push(newCategory);
  saveCategories(categories);
  
  return newCategory;
}

// 更新分类
export function updateCategory(id: string, updates: Partial<Omit<WorldbookCategory, 'id'>>): void {
  const categories = getAllCategories();
  const index = categories.findIndex(cat => cat.id === id);
  
  if (index === -1) {
    throw new Error('分类不存在');
  }
  
  // 如果更新名称，检查是否重复
  if (updates.name && updates.name !== categories[index].name) {
    if (categories.some(cat => cat.name === updates.name)) {
      throw new Error('分类名称已存在');
    }
  }
  
  categories[index] = {
    ...categories[index],
    ...updates,
  };
  
  saveCategories(categories);
}

// 删除分类
export function deleteCategory(id: string): void {
  const categories = getAllCategories();
  const filtered = categories.filter(cat => cat.id !== id);
  
  if (filtered.length === categories.length) {
    throw new Error('分类不存在');
  }
  
  saveCategories(filtered);
}

// 根据ID获取分类
export function getCategoryById(id: string): WorldbookCategory | undefined {
  const categories = getAllCategories();
  return categories.find(cat => cat.id === id);
}

// 根据ID列表获取分类
export function getCategoriesByIds(ids: string[]): WorldbookCategory[] {
  const categories = getAllCategories();
  return categories.filter(cat => ids.includes(cat.id));
}

// 获取随机未使用的颜色
export function getRandomColor(existingColors: string[]): string {
  const availableColors = CATEGORY_COLORS.filter(
    color => !existingColors.includes(color)
  );
  
  if (availableColors.length === 0) {
    return CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)];
  }
  
  return availableColors[Math.floor(Math.random() * availableColors.length)];
}
