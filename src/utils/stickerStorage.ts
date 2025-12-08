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
const USER_STICKERS_STORE = STORES.USER_STICKERS;

// 旧版 localStorage 存储的 key（用于一次性迁移）
const LEGACY_COMMON_KEY = 'common_stickers';
const LEGACY_CHARACTER_PREFIX = 'sticker_pack_';
const LEGACY_MIGRATION_FLAG_KEY = 'stickers_indexeddb_migrated_v1';

// 避免重复迁移
let legacyMigrationInProgress = false;

/**
 * 一次性迁移旧版 localStorage 中的表情包数据到 IndexedDB
 *
 * - 旧结构：
 *   - 通用表情包：common_stickers
 *   - 角色表情包：sticker_pack_{characterId}
 * - 新结构：IndexedDB commonStickers / characterStickers
 */
const migrateLegacyStickersIfNeeded = async (): Promise<void> => {
  // 非浏览器环境（例如SSR）直接跳过
  if (typeof window === 'undefined' || !('localStorage' in window)) return;

  // 避免并发触发
  if (legacyMigrationInProgress) return;
  legacyMigrationInProgress = true;

  try {
    const migratedFlag = window.localStorage.getItem(LEGACY_MIGRATION_FLAG_KEY);
    if (migratedFlag === '1') {
      return;
    }

    const common: StickerItem[] = [];
    const characterMap: Record<string, StickerItem[]> = {};

    // 1. 读取通用表情包
    try {
      const rawCommon = window.localStorage.getItem(LEGACY_COMMON_KEY);
      if (rawCommon) {
        const parsed = JSON.parse(rawCommon) as StickerItem[];
        if (Array.isArray(parsed)) {
          common.push(...parsed);
        }
      }
    } catch (e) {
      console.warn('迁移通用表情包失败，跳过：', e);
    }

    // 2. 扫描所有角色表情包 key
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key || !key.startsWith(LEGACY_CHARACTER_PREFIX)) continue;

        const characterId = key.substring(LEGACY_CHARACTER_PREFIX.length);
        if (!characterId) continue;

        try {
          const raw = window.localStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw) as StickerItem[];
          if (!Array.isArray(parsed)) continue;

          if (!characterMap[characterId]) characterMap[characterId] = [];
          characterMap[characterId].push(...parsed);
        } catch (e) {
          console.warn(`迁移角色表情包失败（${key}），跳过：`, e);
        }
      }
    } catch (e) {
      console.warn('扫描旧角色表情包 key 失败：', e);
    }

    // 判断是否真的有旧数据
    const hasLegacyData = common.length > 0 || Object.keys(characterMap).length > 0;
    if (!hasLegacyData) {
      // 没有旧数据，也标记为已迁移，避免每次都扫描
      window.localStorage.setItem(LEGACY_MIGRATION_FLAG_KEY, '1');
      return;
    }

    console.log('🧩 开始迁移旧表情包数据到 IndexedDB ...');

    // 3. 写入通用表情包到 IndexedDB
    for (const sticker of common) {
      try {
        await addData(COMMON_STICKERS_STORE, sticker);
      } catch (e) {
        // 主键冲突等错误直接忽略，避免中断迁移
        console.warn('写入通用表情包到 IndexedDB 失败，跳过：', e);
      }
    }

    // 4. 写入角色表情包到 IndexedDB
    for (const [characterId, stickers] of Object.entries(characterMap)) {
      for (const sticker of stickers) {
        // 旧数据里可能没带 characterId，这里补一下
        const fixedSticker: StickerItem = {
          ...sticker,
          scope: 'character',
          characterId,
        } as StickerItem;

        try {
          await addData(CHARACTER_STICKERS_STORE, fixedSticker);
        } catch (e) {
          console.warn(`写入角色表情包到 IndexedDB 失败（${characterId}），跳过：`, e);
        }
      }
    }

    // 5. 清理旧的 localStorage key
    try {
      window.localStorage.removeItem(LEGACY_COMMON_KEY);
    } catch (e) {
      console.warn('清理旧通用表情包 key 失败：', e);
    }

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(LEGACY_CHARACTER_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => window.localStorage.removeItem(k));
    } catch (e) {
      console.warn('清理旧角色表情包 key 失败：', e);
    }

    window.localStorage.setItem(LEGACY_MIGRATION_FLAG_KEY, '1');
    console.log('✅ 旧表情包数据迁移完成');
  } finally {
    legacyMigrationInProgress = false;
  }
};

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
    // 确保旧数据已迁移
    await migrateLegacyStickersIfNeeded();

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
    // 确保旧数据已迁移
    await migrateLegacyStickersIfNeeded();

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
 * 获取用户专属表情包
 */
export const getUserStickers = async (): Promise<StickerItem[]> => {
  try {
    await migrateLegacyStickersIfNeeded();
    const stickers = await getAllData<StickerItem>(USER_STICKERS_STORE);
    return stickers.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Failed to load user stickers:', error);
    return [];
  }
};

/**
 * 获取所有表情包（通用 + 指定角色）
 * ⚠️ 注意：这个函数用于AI，不包含用户专属表情包
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
  } else if (sticker.scope === 'character') {
    // 🔥 严格验证：角色专属必须有characterId
    if (!sticker.characterId) {
      throw new Error('角色专属表情包必须指定角色ID');
    }
    // 检查数量限制
    const characterStickers = await getCharacterStickers(sticker.characterId);
    if (characterStickers.length >= MAX_CHARACTER_STICKERS) {
      throw new Error(`角色表情包数量已达上限（${MAX_CHARACTER_STICKERS}个）`);
    }
    await addData(CHARACTER_STICKERS_STORE, newSticker);
  } else if (sticker.scope === 'user') {
    // 用户专属表情包
    const count = await getCount(USER_STICKERS_STORE);
    if (count >= MAX_COMMON_STICKERS) {
      throw new Error(`用户表情包数量已达上限（${MAX_COMMON_STICKERS}个）`);
    }
    await addData(USER_STICKERS_STORE, newSticker);
  } else {
    // 🔥 未知的scope类型
    throw new Error(`无效的表情包类型：${sticker.scope}`);
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

  let storeName: string;
  if (sticker.scope === 'common') {
    storeName = COMMON_STICKERS_STORE;
  } else if (sticker.scope === 'character') {
    storeName = CHARACTER_STICKERS_STORE;
  } else {
    storeName = USER_STICKERS_STORE;
  }
  await updateData(storeName, updatedSticker);
};

/**
 * 删除表情包
 */
export const deleteSticker = async (stickerId: string, scope: StickerScope): Promise<void> => {
  let storeName: string;
  if (scope === 'common') {
    storeName = COMMON_STICKERS_STORE;
  } else if (scope === 'character') {
    storeName = CHARACTER_STICKERS_STORE;
  } else {
    storeName = USER_STICKERS_STORE;
  }
  await deleteData(storeName, stickerId);
};

/**
 * 增加表情包使用次数
 */
export const incrementStickerUsage = async (stickerId: string, scope: StickerScope): Promise<void> => {
  let storeName: string;
  if (scope === 'common') {
    storeName = COMMON_STICKERS_STORE;
  } else if (scope === 'character') {
    storeName = CHARACTER_STICKERS_STORE;
  } else {
    storeName = USER_STICKERS_STORE;
  }
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
