// 表情包存储工具 - 使用 IndexedDB

import { StickerItem, StickerScope } from '../types/sticker';
import {
  addData,
  updateData,
  deleteData,
  getAllData,
  getDataByIndex,
  getCount,
  STORES,
} from './indexedDBHelper';

const COMMON_STICKERS_STORE = STORES.COMMON_STICKERS;
const CHARACTER_STICKERS_STORE = STORES.CHARACTER_STICKERS;

// 配置
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_COMMON_STICKERS = 100;
const MAX_CHARACTER_STICKERS = 50;

/**
 * 获取所有通用表情包
 */
export const getCommonStickers = async (): Promise<StickerItem[]> => {
  try {
    const stickers = await getAllData<StickerItem>(COMMON_STICKERS_STORE);
    return stickers.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Failed to load common stickers:', error);
    return [];
  }
};

/**
 * 获取指定角色的表情包
 */
export const getCharacterStickers = async (characterId: string): Promise<StickerItem[]> => {
  try {
    const stickers = await getDataByIndex<StickerItem>(
      CHARACTER_STICKERS_STORE,
      'characterId',
      characterId
    );
    return stickers.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error(`Failed to load stickers for character ${characterId}:`, error);
    return [];
  }
};

/**
 * 获取所有表情包（通用 + 指定角色）
 */
export const getAllAvailableStickers = async (characterId?: string): Promise<StickerItem[]> => {
  const commonStickers = await getCommonStickers();
  
  if (!characterId) {
    return commonStickers;
  }
  
  const characterStickers = await getCharacterStickers(characterId);
  return [...commonStickers, ...characterStickers];
};


/**
 * 添加表情包
 */
export const addSticker = async (
  sticker: Omit<StickerItem, 'id' | 'createdAt' | 'updatedAt' | 'usage'>
): Promise<StickerItem> => {
  const newSticker: StickerItem = {
    ...sticker,
    id: `sticker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usage: 0,
  };

  if (sticker.scope === 'common') {
    // 检查数量限制
    const count = await getCount(COMMON_STICKERS_STORE);
    if (count >= MAX_COMMON_STICKERS) {
      throw new Error(`通用表情包数量已达上限（${MAX_COMMON_STICKERS}个）`);
    }
    
    await addData(COMMON_STICKERS_STORE, newSticker);
  } else if (sticker.scope === 'character' && sticker.characterId) {
    // 检查数量限制
    const characterStickers = await getCharacterStickers(sticker.characterId);
    if (characterStickers.length >= MAX_CHARACTER_STICKERS) {
      throw new Error(`角色表情包数量已达上限（${MAX_CHARACTER_STICKERS}个）`);
    }
    
    await addData(CHARACTER_STICKERS_STORE, newSticker);
  }

  return newSticker;
};

/**
 * 更新表情包
 */
export const updateSticker = async (sticker: StickerItem): Promise<void> => {
  const updatedSticker = {
    ...sticker,
    updatedAt: Date.now(),
  };

  const storeName = sticker.scope === 'common' ? COMMON_STICKERS_STORE : CHARACTER_STICKERS_STORE;
  await updateData(storeName, updatedSticker);
};

/**
 * 删除表情包
 */
export const deleteSticker = async (stickerId: string, scope: StickerScope): Promise<void> => {
  const storeName = scope === 'common' ? COMMON_STICKERS_STORE : CHARACTER_STICKERS_STORE;
  await deleteData(storeName, stickerId);
};

/**
 * 增加表情包使用次数
 */
export const incrementStickerUsage = async (stickerId: string, scope: StickerScope): Promise<void> => {
  const storeName = scope === 'common' ? COMMON_STICKERS_STORE : CHARACTER_STICKERS_STORE;
  const allStickers = await getAllData<StickerItem>(storeName);
  const sticker = allStickers.find(s => s.id === stickerId);
  
  if (sticker) {
    sticker.usage = (sticker.usage || 0) + 1;
    sticker.updatedAt = Date.now();
    await updateData(storeName, sticker);
  }
};

/**
 * 搜索表情包（根据描述和标签）
 */
export const searchStickers = async (
  query: string,
  characterId?: string
): Promise<StickerItem[]> => {
  const allStickers = await getAllAvailableStickers(characterId);
  
  if (!query.trim()) {
    return allStickers;
  }
  
  const lowerQuery = query.toLowerCase();
  
  return allStickers.filter(sticker => {
    const descriptionMatch = sticker.description.toLowerCase().includes(lowerQuery);
    const tagsMatch = sticker.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));
    return descriptionMatch || tagsMatch;
  });
};

/**
 * 图片转Base64
 */
export const imageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error(`文件大小超过限制（${MAX_FILE_SIZE / 1024 / 1024}MB）`));
      return;
    }
    
    // 检查文件格式
    if (!ALLOWED_FORMATS.includes(file.type)) {
      reject(new Error(`不支持的文件格式，仅支持：${ALLOWED_FORMATS.join(', ')}`));
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
