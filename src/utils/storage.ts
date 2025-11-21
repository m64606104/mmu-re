/**
 * 🔥 全新存储系统架构 v2.0
 * 
 * 设计原则：
 * 1. localStorage: 只存储少量配置数据（< 1MB）
 * 2. IndexedDB: 存储所有大数据（无限容量）
 * 3. 内存缓存: 提供高速读取性能
 * 4. 智能迁移: 自动处理老用户数据
 * 
 * 避免问题：
 * - 防止localStorage过载导致应用崩溃
 * - 避免数据激增影响性能
 * - 确保数据持久化安全
 */

// 🟢 localStorage 专用键（仅小量配置数据）
const LOCAL_STORAGE_KEYS = [
  'apiConfig',          // API配置
  'userProfile',        // 用户资料  
  'theme',              // 主题设置
  'landscapeImage',     // 风景壁纸
  'bannerImage',        // 头像壁纸
  'appSettings',        // 应用设置
  'uiPreferences'       // UI偏好
];

// 🔵 IndexedDB 专用键（所有大数据）
const INDEXED_DB_KEYS = [
  'conversations',      // 对话列表
  'moments',            // 朋友圈数据
  'chat_memory_banks',  // 记忆库
  'ai_finance_data',    // AI财务
  'relationships',      // 关系网络  
  'documents_library',  // 文档库
  'music_library',      // 音乐库
  'user_data',          // 用户扩展数据
  'app_cache',          // 应用缓存
  'slow_letters'        // 慢邮件/信件数据
];

/**
 * 判断数据应该存储在哪里
 */
const shouldUseLocalStorage = (key: string): boolean => {
  return LOCAL_STORAGE_KEYS.includes(key);
};

const shouldUseIndexedDB = (key: string): boolean => {
  return INDEXED_DB_KEYS.includes(key) || 
         INDEXED_DB_KEYS.some(k => key.startsWith(k + '_'));
};

// IndexedDB 配置
const DB_NAME = 'MobileAIChatDB';
const DB_VERSION = 1;
const STORE_NAME = 'appData';

// 🧠 内存缓存系统
let memoryCache = new Map<string, any>();
let cacheInitialized = false;

/**
 * 打开 IndexedDB（优化版）
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('❌ IndexedDB 打开失败:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
        console.log('✅ IndexedDB 对象存储创建成功');
      }
    };
  });
};

/**
 * 🟢 localStorage 操作（仅配置数据）
 */
const saveToLocal = (key: string, data: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    console.log(`💾 配置保存: ${key}`);
  } catch (error) {
    console.error(`❌ 配置保存失败 ${key}:`, error);
    throw error;
  }
};

const loadFromLocal = (key: string): any => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`❌ 配置读取失败 ${key}:`, error);
    return null;
  }
};

/**
 * 🔵 IndexedDB 操作（大数据专用）
 */
const saveToIndexedDB = async (key: string, data: any): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    store.put(data, key);
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        // 更新内存缓存
        memoryCache.set(key, data);
        console.log(`💾 数据保存: ${key}`);
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        console.error(`❌ IndexedDB保存失败 ${key}:`, transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error(`❌ IndexedDB保存失败 ${key}:`, error);
    throw error;
  }
};

const loadFromIndexedDB = async (key: string): Promise<any> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close();
        const data = request.result;
        // 更新内存缓存
        if (data !== undefined) {
          memoryCache.set(key, data);
        }
        resolve(data);
      };
      request.onerror = () => {
        db.close();
        console.error(`❌ IndexedDB读取失败 ${key}:`, request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error(`❌ IndexedDB读取失败 ${key}:`, error);
    return null;
  }
};

/**
 * 🚀 统一存储API - 智能路由
 */

// 初始化内存缓存
export const initializeCache = async (): Promise<void> => {
  if (cacheInitialized) return;
  
  try {
    console.log('🧠 初始化内存缓存...');
    
    // 从IndexedDB预载热点数据（常用的大数据）
    const hotKeys = ['conversations', 'moments', 'chat_memory_banks', 'slow_letters'];
    await Promise.all(hotKeys.map(async (key) => {
      try {
        const data = await loadFromIndexedDB(key);
        if (data !== undefined) {
          memoryCache.set(key, data);
        }
      } catch (error) {
        console.warn(`⚠️ 预载 ${key} 失败:`, error);
      }
    }));
    
    cacheInitialized = true;
    console.log(`✅ 缓存初始化完成 (${memoryCache.size} 项)`);
  } catch (error) {
    console.error('❌ 缓存初始化失败:', error);
    cacheInitialized = true; // 防止重复尝试
  }
};

// 智能保存
export const save = async (key: string, data: any): Promise<void> => {
  if (shouldUseLocalStorage(key)) {
    saveToLocal(key, data);
  } else {
    await saveToIndexedDB(key, data);
  }
};

// 智能读取（支持缓存）
export const load = async (key: string): Promise<any> => {
  // 优先从缓存读取
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }
  
  if (shouldUseLocalStorage(key)) {
    return loadFromLocal(key);
  } else {
    return await loadFromIndexedDB(key);
  }
};

// 删除数据
export const remove = async (key: string): Promise<void> => {
  // 从缓存中删除
  memoryCache.delete(key);
  
  if (shouldUseLocalStorage(key)) {
    localStorage.removeItem(key);
  } else {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.delete(key);
      
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      });
    } catch (error) {
      console.error(`❌ 删除失败 ${key}:`, error);
    }
  }
};

/**
 * 🔄 数据迁移系统
 */

// 检查是否需要迁移
export const checkMigrationNeeded = (): boolean => {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && shouldUseIndexedDB(key)) {
      return true;
    }
  }
  return false;
};

// 执行数据迁移
export const migrateData = async (): Promise<{
  success: boolean;
  migratedKeys: string[];
  errors: string[];
}> => {
  const migratedKeys: string[] = [];
  const errors: string[] = [];
  
  console.log('🔄 开始数据迁移: localStorage → IndexedDB');
  
  // 找到需要迁移的数据
  const keysToMigrate: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && shouldUseIndexedDB(key)) {
      keysToMigrate.push(key);
    }
  }
  
  console.log(`📋 发现 ${keysToMigrate.length} 项需要迁移:`, keysToMigrate);
  
  // 迁移每一项
  for (const key of keysToMigrate) {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        await saveToIndexedDB(key, parsed);
        localStorage.removeItem(key);
        migratedKeys.push(key);
        console.log(`✅ 已迁移: ${key}`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '未知错误';
      errors.push(`${key}: ${msg}`);
      console.error(`❌ 迁移失败 ${key}:`, error);
    }
  }
  
  const success = errors.length === 0;
  console.log(`${success ? '✅' : '⚠️'} 迁移完成: ${migratedKeys.length} 成功, ${errors.length} 失败`);
  
  return { success, migratedKeys, errors };
};

// 获取存储状态
export const getStorageStatus = async (): Promise<{
  localStorage: { items: number; sizeMB: number; needsMigration: string[] };
  indexedDB: { items: number; sizeMB: number };
  cache: { items: number };
}> => {
  // localStorage 分析
  let localItems = 0;
  let localSize = 0;
  const needsMigration: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const item = localStorage.getItem(key);
      if (item) {
        localItems++;
        localSize += item.length * 2; // UTF-16
        
        if (shouldUseIndexedDB(key)) {
          needsMigration.push(key);
        }
      }
    }
  }
  
  // IndexedDB 估算
  let indexedDBSize = 0;
  let indexedDBItems = 0;
  
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      indexedDBSize = estimate.usage || 0;
    }
    
    // 尝试估算项目数
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const countRequest = store.count();
    indexedDBItems = await new Promise((resolve) => {
      countRequest.onsuccess = () => resolve(countRequest.result);
      countRequest.onerror = () => resolve(0);
    });
    
    db.close();
  } catch (error) {
    console.warn('⚠️ 获取IndexedDB信息失败:', error);
  }
  
  return {
    localStorage: {
      items: localItems,
      sizeMB: localSize / 1024 / 1024,
      needsMigration
    },
    indexedDB: {
      items: indexedDBItems,
      sizeMB: indexedDBSize / 1024 / 1024
    },
    cache: {
      items: memoryCache.size
    }
  };
};

// 检查存储配额和可用空间
export const checkStorageQuota = async (): Promise<{
  quota: number;
  usage: number;
  available: number;
  percentUsed: number;
  isMobile: boolean;
}> => {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 0;
      const usage = estimate.usage || 0;
      const available = quota - usage;
      const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;
      
      // 检测移动设备
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      return {
        quota: Math.round(quota),
        usage: Math.round(usage),
        available: Math.round(available),
        percentUsed: Math.round(percentUsed * 100) / 100,
        isMobile
      };
    }
    
    // 降级方案：估算默认值
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const estimatedQuota = isMobile ? 50 * 1024 * 1024 : 1024 * 1024 * 1024; // 移动50MB，桌面1GB
    
    return {
      quota: estimatedQuota,
      usage: 0,
      available: estimatedQuota,
      percentUsed: 0,
      isMobile
    };
  } catch (error) {
    console.error('❌ 检查存储配额失败:', error);
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const estimatedQuota = isMobile ? 50 * 1024 * 1024 : 1024 * 1024 * 1024;
    
    return {
      quota: estimatedQuota,
      usage: 0,
      available: estimatedQuota,
      percentUsed: 0,
      isMobile
    };
  }
};

// 分批保存大数据（移动设备优化）
export const saveBatch = async (key: string, data: any, options: {
  batchSize?: number;
  maxRetries?: number;
  onProgress?: (progress: number) => void;
} = {}): Promise<void> => {
  const { batchSize = 50, maxRetries = 3, onProgress } = options;
  
  // 检查存储配额
  const quota = await checkStorageQuota();
  console.log(`📊 存储配额检查: 已用${(quota.usage / 1024 / 1024).toFixed(1)}MB / 总计${(quota.quota / 1024 / 1024).toFixed(1)}MB (${quota.percentUsed}%)`);
  
  // 如果是小数据或非数组，直接保存
  if (!Array.isArray(data) || data.length <= batchSize) {
    try {
      await save(key, data);
      onProgress?.(100);
      console.log(`✅ 数据保存成功: ${key} (${data.length || 1} 项)`);
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new Error(`存储空间不足。当前可用: ${(quota.available / 1024 / 1024).toFixed(1)}MB，建议清理数据或使用较小数据集。`);
      }
      throw error;
    }
  }
  
  // 分批处理大数据
  console.log(`🔄 开始分批保存: ${key}, 总计${data.length}项, 每批${batchSize}项`);
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const batchKey = `${key}_batch_${Math.floor(i / batchSize)}`;
    
    let retries = 0;
    while (retries < maxRetries) {
      try {
        await save(batchKey, batch);
        console.log(`✅ 批次 ${Math.floor(i / batchSize) + 1} 保存成功 (${batch.length} 项)`);
        
        // 更新进度
        const progress = Math.min(((i + batchSize) / data.length) * 100, 100);
        onProgress?.(progress);
        break;
      } catch (error) {
        retries++;
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          if (retries >= maxRetries) {
            throw new Error(`存储空间不足，无法保存批次 ${Math.floor(i / batchSize) + 1}。请清理数据或减少导入量。`);
          }
          
          // 等待一下再重试，可能有其他操作在释放空间
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          throw error;
        }
      }
    }
  }
  
  // 保存批次元数据
  await save(`${key}_meta`, {
    totalBatches: Math.ceil(data.length / batchSize),
    totalItems: data.length,
    batchSize,
    isBatched: true,
    createdAt: Date.now()
  });
  
  console.log(`🎉 分批保存完成: ${key}`);
};

// 分批读取大数据
export const loadBatch = async (key: string): Promise<any> => {
  try {
    // 先尝试直接读取
    const directData = await load(key);
    if (directData !== null && directData !== undefined) {
      return directData;
    }
    
    // 检查是否有批次元数据
    const meta = await load(`${key}_meta`);
    if (!meta || !meta.isBatched) {
      return null;
    }
    
    console.log(`🔄 开始分批读取: ${key}, 总计${meta.totalBatches}批次`);
    
    const result = [];
    for (let i = 0; i < meta.totalBatches; i++) {
      const batchKey = `${key}_batch_${i}`;
      const batch = await load(batchKey);
      if (batch && Array.isArray(batch)) {
        result.push(...batch);
      }
    }
    
    console.log(`✅ 分批读取完成: ${key}, 读取${result.length}项`);
    return result;
  } catch (error) {
    console.error(`❌ 分批读取失败 ${key}:`, error);
    return null;
  }
};

// 清空所有数据
export const clearAllData = async (): Promise<void> => {
  console.log('🧹 清空所有数据...');
  
  // 清空缓存
  memoryCache.clear();
  
  // 清空localStorage
  localStorage.clear();
  
  // 清空IndexedDB
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('❌ 清空IndexedDB失败:', error);
  }
  
  console.log('✅ 所有数据已清空');
};

// 🧠 内存缓存访问API（供同步读取使用）
export const getCachedData = <T>(key: string): T | undefined => {
  return memoryCache.get(key);
};

export const setCachedData = (key: string, data: any): void => {
  memoryCache.set(key, data);
};

// 兼容性导出（暂时保留旧API名称）
export const smartLoad = load;
export const smartSave = save;
export const smartRemove = remove;

// 🔧 开发模式：暴露存储API到全局（用于调试和测试）
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.save = save;
  // @ts-ignore
  window.load = load;
  // @ts-ignore
  window.initializeCache = initializeCache;
  // @ts-ignore
  window.migrateData = migrateData;
  // @ts-ignore
  window.getStorageStatus = getStorageStatus;
  // @ts-ignore
  window.checkMigrationNeeded = checkMigrationNeeded;
  // @ts-ignore
  window.clearAllData = clearAllData;
  // @ts-ignore 移动设备优化API
  window.checkStorageQuota = checkStorageQuota;
  // @ts-ignore
  window.saveBatch = saveBatch;
  // @ts-ignore
  window.loadBatch = loadBatch;
  
  console.log('🔧 存储API已暴露到全局（开发模式）');
}
