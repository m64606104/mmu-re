// 表情包存储工具

import { StickerItem, StickerScope, DEFAULT_STICKER_CONFIG } from '../types/sticker';

const STORAGE_KEY_PREFIX = 'sticker_pack_';
const COMMON_STICKERS_KEY = 'common_stickers';

/**
 * 获取所有通用表情包
 */
export const getCommonStickers = async (): Promise<StickerItem[]> => {
  try {
    const data = localStorage.getItem(COMMON_STICKERS_KEY);
    if (!data) return [];
    return JSON.parse(data);
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
    const key = `${STORAGE_KEY_PREFIX}${characterId}`;
    const data = localStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data);
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
 * 保存通用表情包
 */
export const saveCommonStickers = async (stickers: StickerItem[]): Promise<void> => {
  try {
    localStorage.setItem(COMMON_STICKERS_KEY, JSON.stringify(stickers));
  } catch (error) {
    console.error('Failed to save common stickers:', error);
    throw error;
  }
};

/**
 * 保存角色表情包
 */
export const saveCharacterStickers = async (characterId: string, stickers: StickerItem[]): Promise<void> => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${characterId}`;
    localStorage.setItem(key, JSON.stringify(stickers));
  } catch (error) {
    console.error(`Failed to save stickers for character ${characterId}:`, error);
    throw error;
  }
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
    const commonStickers = await getCommonStickers();
    
    // 检查数量限制
    if (commonStickers.length >= DEFAULT_STICKER_CONFIG.maxCommonStickers) {
      throw new Error(`通用表情包数量已达上限（${DEFAULT_STICKER_CONFIG.maxCommonStickers}个）`);
    }
    
    commonStickers.push(newSticker);
    await saveCommonStickers(commonStickers);
  } else if (sticker.scope === 'character' && sticker.characterId) {
    const characterStickers = await getCharacterStickers(sticker.characterId);
    
    // 检查数量限制
    if (characterStickers.length >= DEFAULT_STICKER_CONFIG.maxStickersPerCharacter) {
      throw new Error(`角色表情包数量已达上限（${DEFAULT_STICKER_CONFIG.maxStickersPerCharacter}个）`);
    }
    
    characterStickers.push(newSticker);
    await saveCharacterStickers(sticker.characterId, characterStickers);
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

  if (sticker.scope === 'common') {
    const commonStickers = await getCommonStickers();
    const index = commonStickers.findIndex(s => s.id === sticker.id);
    if (index !== -1) {
      commonStickers[index] = updatedSticker;
      await saveCommonStickers(commonStickers);
    }
  } else if (sticker.scope === 'character' && sticker.characterId) {
    const characterStickers = await getCharacterStickers(sticker.characterId);
    const index = characterStickers.findIndex(s => s.id === sticker.id);
    if (index !== -1) {
      characterStickers[index] = updatedSticker;
      await saveCharacterStickers(sticker.characterId, characterStickers);
    }
  }
};

/**
 * 删除表情包
 */
export const deleteSticker = async (stickerId: string, scope: StickerScope, characterId?: string): Promise<void> => {
  if (scope === 'common') {
    const commonStickers = await getCommonStickers();
    const filtered = commonStickers.filter(s => s.id !== stickerId);
    await saveCommonStickers(filtered);
  } else if (scope === 'character' && characterId) {
    const characterStickers = await getCharacterStickers(characterId);
    const filtered = characterStickers.filter(s => s.id !== stickerId);
    await saveCharacterStickers(characterId, filtered);
  }
};

/**
 * 增加表情包使用次数
 */
export const incrementStickerUsage = async (stickerId: string, scope: StickerScope, characterId?: string): Promise<void> => {
  if (scope === 'common') {
    const commonStickers = await getCommonStickers();
    const sticker = commonStickers.find(s => s.id === stickerId);
    if (sticker) {
      sticker.usage = (sticker.usage || 0) + 1;
      await saveCommonStickers(commonStickers);
    }
  } else if (scope === 'character' && characterId) {
    const characterStickers = await getCharacterStickers(characterId);
    const sticker = characterStickers.find(s => s.id === stickerId);
    if (sticker) {
      sticker.usage = (sticker.usage || 0) + 1;
      await saveCharacterStickers(characterId, characterStickers);
    }
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
    if (file.size > DEFAULT_STICKER_CONFIG.maxFileSize) {
      reject(new Error(`文件大小超过限制（${DEFAULT_STICKER_CONFIG.maxFileSize / 1024 / 1024}MB）`));
      return;
    }
    
    // 检查文件格式
    if (!DEFAULT_STICKER_CONFIG.allowedFormats.includes(file.type)) {
      reject(new Error(`不支持的文件格式，仅支持：${DEFAULT_STICKER_CONFIG.allowedFormats.join(', ')}`));
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
