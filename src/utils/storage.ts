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
  'uiPreferences',      // UI偏好
  'fullscreenMode',     // 全屏开关
  'cloudSyncSettings',  // 云同步配置
  'appLayout',          // 首页布局
  'quickLayout',        // 快捷区布局
  'dockLayout',         // 底栏布局
  'currentTrack',       // 当前音乐
  'countdownEvent',     // 倒计时事件
  'easychat_ui_style',  // EasyChat UI风格
  'easychat_launched',  // EasyChat 首次启动标记
  'api_url',            // EasyChat 旧接口配置
  'api_key',
  'api_model',
  'userSettings',        // 群聊等功能的UI偏好（小配置）
  'musixmatch_api_key',  // 歌词服务密钥（小配置）
  'energy_saving_config', // 节能模式配置（小配置）
];

// 🔵 IndexedDB 专用键（所有大数据）
const INDEXED_DB_KEYS = [
  'conversations',      // 对话列表
  'moments',            // 朋友圈数据
  'moments_data',       // 朋友圈扩展数据
  'moments_notifications', // 朋友圈通知
  'chat_memory_banks',  // 记忆库
  'ai_memory_banks',    // AI儿童词汇记忆库（专用）⭐ 新增
  'daily_card_pools',   // AI儿童每日词卡池（按childId分开）⭐ 新增
  'daily_teaching_data', // AI儿童每日学习数据（按childId分开）⭐ 新增
  'ai_interactions',    // AI儿童互动记录（教学、对话等）⭐ 新增
  'ai_content_pool',    // AI生成的新闻和公众号内容池⭐ 新增
  'relationships',      // 关系网络  
  'ai_relationships',   // AI关系数据
  'character_relationships_v2', // 角色关系数据
  'document_library',   // 文档库（实际使用key）
  'documents_library',  // 文档库
  'music_library',      // 音乐库
  'user_data',          // 用户扩展数据
  'app_cache',          // 应用缓存
  'slow_letters',       // 慢邮件/信件数据
  'custom_pen_pals',    // 自定义笔友数据
  'proactive_messaging_state', // 主动消息状态
  'mobile_ai_chat_worldbooks', // 世界书条目
  'mobile_ai_chat_worldbook_categories', // 世界书分类（旧移动端世界书模块）
  'worldbook_categories',      // 世界书分类
  'wallet_data',               // 钱包（含交易记录）
  'ai_wallet_data',            // AI钱包
  'current_user',              // 用户系统当前用户
  'friends_list',              // 用户系统好友列表
  'user_message_sent_messages',     // 用户间消息
  'user_message_received_messages', // 用户间消息
  'user_message_conversations',     // 用户间消息会话
  'penpal_share_codes',        // 笔友分享码
  'customMemes',               // 自定义热梗
  'momentCycles',              // 朋友圈周期状态
  'ai_social_relationships',   // 朋友圈社交关系
  'moments_visibility_groups', // 朋友圈可见分组
  'official_accounts',         // 公众号账号与文章
  'letter_memories',           // 信件记忆库
  'group_private_memory_bridges', // 群聊↔私聊 记忆桥接
  'huaduoduo_super_cart',      // 花多多购物车
  'huaduoduo_orders',          // 花多多订单（增长型）
  'huaduoduo_addresses',       // 花多多地址列表
  'friendRequests',            // 联系人好友申请
  'ai_nicknames',              // 笔友备注名
  'letter_achievements',       // 慢邮件成就进度
  'letter_notifications',      // 慢邮件通知
  'bottle_fishing_record',     // 漂流瓶每日记录
  'bottle_stats',              // 漂流瓶统计
  'bottle_content_diversity',  // 漂流瓶内容多样性历史
  'api_presets_data',          // API预设方案
  'api_usage_stats',           // API调用统计
  'api_usage_limits',          // API调用限制
  'easychat_contacts',      // EasyChat 联系人
  'easychat_conversations', // EasyChat 会话（含图片）
  'easychat_user',          // EasyChat 用户数据（含头像）
  'ai_life_sim_states',     // AI生活模拟状态（后台引擎）
];

const GROWING_DATA_PREFIXES = [
  'moments_',
  'last_moment_',
  'moments_count_',
  'ai_finance_',
  'document_library_',
  'easychat_conversations_',
  'daily_news_',
  'subchat_data_',
  'ai_status_',
  'content_variation_',
  'shopping_cart_',
  'image_gen_moments_daily_',
];

/**
 * 判断数据应该存储在哪里
 */
const shouldUseLocalStorage = (key: string): boolean => {
  return LOCAL_STORAGE_KEYS.includes(key);
};

const shouldUseIndexedDB = (key: string): boolean => {
  return INDEXED_DB_KEYS.includes(key) || 
         INDEXED_DB_KEYS.some(k => key.startsWith(k + '_')) ||
         GROWING_DATA_PREFIXES.some(prefix => key.startsWith(prefix));
};

export type StorageLayer = 'localStorage' | 'indexedDB';

export const resolveStorageLayer = (key: string): StorageLayer => {
  return shouldUseLocalStorage(key) ? 'localStorage' : 'indexedDB';
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

export const dumpIndexedDBData = async (): Promise<Record<string, any>> => {
  const result: Record<string, any> = {};
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor();

    await new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          result[String(cursor.key)] = cursor.value;
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });

    db.close();
  } catch (error) {
    console.error('❌ 读取IndexedDB全量数据失败:', error);
    throw error;
  }
  return result;
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
  
  console.log('🔄 开始数据迁移（按新规则重建）');

  // 1) localStorage -> IndexedDB
  const localToIndexed: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && shouldUseIndexedDB(key)) {
      localToIndexed.push(key);
    }
  }

  console.log(`📋 发现 ${localToIndexed.length} 项需要从 localStorage 迁移到 IndexedDB`);

  for (const key of localToIndexed) {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        let parsed: any = data;
        try {
          parsed = JSON.parse(data);
        } catch {
          // 保留原始字符串
        }
        await saveToIndexedDB(key, parsed);
        localStorage.removeItem(key);
        migratedKeys.push(`local->idb:${key}`);
        console.log(`✅ 已迁移 local->idb: ${key}`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '未知错误';
      errors.push(`local->idb:${key}: ${msg}`);
      console.error(`❌ 迁移失败 local->idb ${key}:`, error);
    }
  }

  // 2) IndexedDB -> localStorage（防止小配置误入大存储）
  try {
    const indexedAll = await dumpIndexedDBData();
    const indexedToLocal = Object.keys(indexedAll).filter((key) => shouldUseLocalStorage(key));
    console.log(`📋 发现 ${indexedToLocal.length} 项需要从 IndexedDB 回迁到 localStorage`);

    for (const key of indexedToLocal) {
      try {
        saveToLocal(key, indexedAll[key]);
        // 删除 IndexedDB 中误存的同名键，保留 localStorage 中的新值
        try {
          const db = await openDB();
          const transaction = db.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          store.delete(key);
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
        } catch (delErr) {
          console.warn(`⚠️ 回迁后删除IndexedDB旧键失败 ${key}:`, delErr);
        }
        migratedKeys.push(`idb->local:${key}`);
        console.log(`✅ 已迁移 idb->local: ${key}`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : '未知错误';
        errors.push(`idb->local:${key}: ${msg}`);
        console.error(`❌ 迁移失败 idb->local ${key}:`, error);
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : '未知错误';
    errors.push(`scan-indexeddb: ${msg}`);
    console.error('❌ 扫描IndexedDB失败:', error);
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

export const cleanupLegacyLargeLocalStorage = (): { removedKeys: string[] } => {
  const removedKeys: string[] = [];

  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (shouldUseLocalStorage(key)) continue;
    if (!shouldUseIndexedDB(key)) continue;

    localStorage.removeItem(key);
    removedKeys.push(key);
  }

  if (removedKeys.length > 0) {
    console.log('🧹 已清理旧 localStorage 大数据键:', removedKeys);
  }

  return { removedKeys };
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
  // @ts-ignore
  window.cleanupLegacyLargeLocalStorage = cleanupLegacyLargeLocalStorage;
  // @ts-ignore 移动设备优化API
  window.checkStorageQuota = checkStorageQuota;
  // @ts-ignore
  window.saveBatch = saveBatch;
  // @ts-ignore
  window.loadBatch = loadBatch;
  
  console.log('🔧 存储API已暴露到全局（开发模式）');
}
