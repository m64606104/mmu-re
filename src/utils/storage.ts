/**
 * 智能存储系统：
 * - 小数据（配置）→ localStorage（快速同步）
 * - 大数据（contacts、消息）→ IndexedDB（无限容量）
 * 
 * 优点：
 * - localStorage 限制只有 5-10MB，不适合存储聊天记录
 * - IndexedDB 可以存储 GB 级别数据，浏览器自动管理
 */

// 定义哪些数据应该用 IndexedDB（大数据）
const LARGE_DATA_KEYS = [
  'conversations',           // 对话列表（最大）
  'messages',
  'chat_history',
  'moments_data',           // 朋友圈数据
  'chat_memory_banks',      // 聊天记忆库
  'group_chat_memories',    // 群聊记忆
  'ai_finance_data',        // AI财务数据
  'relationships',          // 关系网络
  'documents_library',      // 文档库
  'moments_interactions',   // 朋友圈互动
  'music_library'           // 音乐库
];

// 判断是否应该使用 IndexedDB
const shouldUseIndexedDB = (key: string): boolean => {
  return LARGE_DATA_KEYS.some(k => key.startsWith(k));
};

// IndexedDB 配置
const DB_NAME = 'MobileAIChatDB';
const DB_VERSION = 1;
const STORE_NAME = 'appData';

/**
 * 打开 IndexedDB
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('❌ IndexedDB 打开失败:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      // 🔥 性能优化：移除频繁的成功日志
      // console.log('✅ IndexedDB 打开成功');
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
        // console.log('✅ IndexedDB 对象存储创建成功');
      }
    };
  });
};

/**
 * 保存到 localStorage
 */
const saveToLocalStorage = (key: string, value: any): boolean => {
  try {
    const jsonData = JSON.stringify(value);
    const sizeKB = (jsonData.length / 1024).toFixed(2);
    
    localStorage.setItem(key, jsonData);
    
    // 🔥 性能优化：只在重要数据时打印
    if (key === 'conversations' || key === 'apiConfig') {
      console.log(`✅ localStorage 保存成功: ${key} (${sizeKB} KB)`);
    }
    return true;
  } catch (e) {
    if (e instanceof Error && e.name === 'QuotaExceededError') {
      console.error(`❌ localStorage 空间不足 (${key})`, e);
      
      // 获取当前使用情况
      let totalSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const item = localStorage.getItem(key);
          if (item) totalSize += item.length;
        }
      }
      
      console.error(`📊 localStorage 当前总大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    } else {
      console.error(`❌ localStorage 保存失败 (${key}):`, e);
    }
    return false;
  }
};

/**
 * 从 localStorage 读取
 */
const loadFromLocalStorage = (key: string): any => {
  try {
    const jsonData = localStorage.getItem(key);
    if (jsonData === null) {
      // console.log(`ℹ️ localStorage 无数据: ${key}`);
      return null;
    }
    const data = JSON.parse(jsonData);
    // 🔥 性能优化：移除频繁的读取日志
    // console.log(`✅ localStorage 读取成功: ${key}`);
    return data;
  } catch (e) {
    console.error(`❌ localStorage 读取失败 (${key}):`, e);
    return null;
  }
};

/**
 * 从 localStorage 删除
 */
const removeFromLocalStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
    console.log(`✅ localStorage 删除成功: ${key}`);
  } catch (e) {
    console.error(`❌ localStorage 删除失败 (${key}):`, e);
  }
};

/**
 * 保存到 IndexedDB
 */
const saveToIndexedDB = async (key: string, value: any): Promise<boolean> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(value, key);
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        // 🔥 性能优化：移除频繁的保存日志
        // console.log(`✅ IndexedDB 保存成功: ${key}`);
        resolve(true);
      };
      transaction.onerror = () => {
        db.close();
        console.error(`❌ IndexedDB 保存失败 (${key}):`, transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error(`❌ IndexedDB 保存失败 (${key}):`, error);
    return false;
  }
};

/**
 * 从 IndexedDB 读取
 */
const loadFromIndexedDB = async (key: string): Promise<any> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close();
        // 🔥 性能优化：移除频繁的读取日志
        // if (request.result) {
        //   console.log(`✅ IndexedDB 读取成功: ${key}`);
        // } else {
        //   console.log(`ℹ️ IndexedDB 无数据: ${key}`);
        // }
        resolve(request.result);
      };
      request.onerror = () => {
        db.close();
        console.error(`❌ IndexedDB 读取失败 (${key}):`, request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error(`❌ IndexedDB 读取失败 (${key}):`, error);
    return null;
  }
};

/**
 * 从 IndexedDB 删除
 */
const removeFromIndexedDB = async (key: string): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(key);
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        // console.log(`✅ IndexedDB 删除成功: ${key}`);
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        console.error(`❌ IndexedDB 删除失败 (${key}):`, transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error(`❌ IndexedDB 删除失败 (${key}):`, error);
  }
};

/**
 * 保存数据（智能选择存储方式）
 */
export const smartSave = async (key: string, value: any): Promise<void> => {
  // 🔥 性能优化：只在关键操作时打印
  // console.log(`💾 开始保存数据: ${key}`);
  
  if (shouldUseIndexedDB(key)) {
    const success = await saveToIndexedDB(key, value);
    if (!success) {
      throw new Error(`IndexedDB 保存失败: ${key}`);
    }
  } else {
    const success = saveToLocalStorage(key, value);
    if (!success) {
      throw new Error(`localStorage 保存失败: ${key}`);
    }
  }
};

/**
 * 读取数据（智能选择存储方式）
 */
export const smartLoad = async (key: string): Promise<any> => {
  console.log(`📂 开始读取数据: ${key}`);
  
  if (shouldUseIndexedDB(key)) {
    return await loadFromIndexedDB(key);
  } else {
    return loadFromLocalStorage(key);
  }
};

/**
 * 删除数据（智能选择存储方式）
 */
export const smartRemove = async (key: string): Promise<void> => {
  console.log(`🗑️ 开始删除数据: ${key}`);
  
  if (shouldUseIndexedDB(key)) {
    await removeFromIndexedDB(key);
  } else {
    removeFromLocalStorage(key);
  }
};

/**
 * 迁移 localStorage 数据到 IndexedDB
 */
export const migrateToIndexedDB = async (key: string): Promise<boolean> => {
  try {
    const localData = localStorage.getItem(key);
    if (localData) {
      console.log(`🔄 迁移数据到 IndexedDB: ${key}`);
      const parsedData = JSON.parse(localData);
      await saveToIndexedDB(key, parsedData);
      localStorage.removeItem(key);
      console.log(`✅ 数据迁移成功: ${key}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ 数据迁移失败: ${key}`, error);
    return false;
  }
};

/**
 * 清除所有存储数据
 */
export const clearAllStorage = async (): Promise<void> => {
  console.log('🧹 开始清除所有存储');
  
  // 清除 localStorage
  try {
    localStorage.clear();
    console.log('✅ localStorage 已清空');
  } catch (e) {
    console.error('❌ localStorage 清空失败:', e);
  }
  
  // 清除 IndexedDB
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        console.log('✅ IndexedDB 已清空');
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        console.error('❌ IndexedDB 清空失败:', transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('❌ IndexedDB 清空失败:', error);
  }
};

/**
 * 批量迁移所有大数据到IndexedDB
 */
export const migrateAllToIndexedDB = async (): Promise<{
  success: boolean;
  migratedKeys: string[];
  errors: { key: string; error: string }[];
}> => {
  console.log('🚀 开始批量迁移数据：localStorage → IndexedDB');
  
  const migratedKeys: string[] = [];
  const errors: { key: string; error: string }[] = [];
  
  // 找出所有应该使用 IndexedDB 的键
  const keysToMigrate: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && shouldUseIndexedDB(key)) {
      keysToMigrate.push(key);
    }
  }
  
  console.log(`📋 发现 ${keysToMigrate.length} 个需要迁移的键:`, keysToMigrate);
  
  // 逐个迁移
  for (const key of keysToMigrate) {
    try {
      const success = await migrateToIndexedDB(key);
      if (success) {
        migratedKeys.push(key);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      errors.push({ key, error: errorMsg });
      console.error(`❌ 迁移失败 (${key}):`, error);
    }
  }
  
  console.log(`✅ 迁移完成：成功 ${migratedKeys.length}，失败 ${errors.length}`);
  
  return {
    success: errors.length === 0,
    migratedKeys,
    errors
  };
};

/**
 * 检查是否需要迁移
 */
export const checkMigrationNeeded = (): boolean => {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && shouldUseIndexedDB(key)) {
      return true;
    }
  }
  return false;
};

/**
 * 获取存储使用情况
 */
export const getStorageInfo = async (): Promise<{
  localStorage: {
    used: number;
    usedMB: number;
    quota: number;
    quotaMB: number;
    percentage: number;
    itemCount: number;
    largeDataInLocalStorage: string[]; // 应该迁移的大数据
  };
  indexedDB: {
    used: number;
    usedMB: number;
    quota: number;
    quotaMB: number;
    percentage: number;
  };
}> => {
  // localStorage 信息
  let localStorageUsed = 0;
  let localStorageItemCount = 0;
  const largeDataInLocalStorage: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const item = localStorage.getItem(key);
      if (item) {
        localStorageUsed += item.length * 2; // UTF-16, 每字符2字节
        localStorageItemCount++;
        
        // 检查是否为大数据
        if (shouldUseIndexedDB(key)) {
          largeDataInLocalStorage.push(key);
        }
      }
    }
  }
  
  const localStorageQuota = 10 * 1024 * 1024; // 估计 10MB
  
  // IndexedDB 信息（通过 Storage API）
  let indexedDBUsed = 0;
  let indexedDBQuota = 0;
  
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    indexedDBUsed = estimate.usage || 0;
    indexedDBQuota = estimate.quota || 0;
  }
  
  return {
    localStorage: {
      used: localStorageUsed,
      usedMB: localStorageUsed / 1024 / 1024,
      quota: localStorageQuota,
      quotaMB: localStorageQuota / 1024 / 1024,
      percentage: (localStorageUsed / localStorageQuota) * 100,
      itemCount: localStorageItemCount,
      largeDataInLocalStorage
    },
    indexedDB: {
      used: indexedDBUsed,
      usedMB: indexedDBUsed / 1024 / 1024,
      quota: indexedDBQuota,
      quotaMB: indexedDBQuota / 1024 / 1024,
      percentage: indexedDBQuota ? (indexedDBUsed / indexedDBQuota) * 100 : 0
    }
  };
};
