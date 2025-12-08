// IndexedDB 工具类 - 用于大容量数据存储

const DB_NAME = 'WeChatSimulator';
const DB_VERSION = 1;

// 存储对象名称
export const STORES = {
  STICKERS: 'stickers', // 表情包存储
  COMMON_STICKERS: 'commonStickers', // 通用表情包
  CHARACTER_STICKERS: 'characterStickers', // 角色专属表情包
};

/**
 * 初始化 IndexedDB
 */
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('❌ IndexedDB打开失败:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log('✅ IndexedDB打开成功');
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      console.log('🔄 IndexedDB升级中...');

      // 创建通用表情包存储
      if (!db.objectStoreNames.contains(STORES.COMMON_STICKERS)) {
        const commonStore = db.createObjectStore(STORES.COMMON_STICKERS, {
          keyPath: 'id',
        });
        commonStore.createIndex('description', 'description', { unique: false });
        commonStore.createIndex('createdAt', 'createdAt', { unique: false });
        console.log('✅ 创建通用表情包存储');
      }

      // 创建角色专属表情包存储
      if (!db.objectStoreNames.contains(STORES.CHARACTER_STICKERS)) {
        const characterStore = db.createObjectStore(STORES.CHARACTER_STICKERS, {
          keyPath: 'id',
        });
        characterStore.createIndex('characterId', 'characterId', { unique: false });
        characterStore.createIndex('description', 'description', { unique: false });
        characterStore.createIndex('createdAt', 'createdAt', { unique: false });
        console.log('✅ 创建角色表情包存储');
      }
    };
  });
};

/**
 * 添加数据到存储
 */
export const addData = async <T extends { id: string }>(
  storeName: string,
  data: T
): Promise<void> => {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(data);

    request.onsuccess = () => {
      console.log(`✅ 数据添加成功 [${storeName}]:`, data.id);
      resolve();
    };

    request.onerror = () => {
      console.error(`❌ 数据添加失败 [${storeName}]:`, request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * 更新数据
 */
export const updateData = async <T extends { id: string }>(
  storeName: string,
  data: T
): Promise<void> => {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onsuccess = () => {
      console.log(`✅ 数据更新成功 [${storeName}]:`, data.id);
      resolve();
    };

    request.onerror = () => {
      console.error(`❌ 数据更新失败 [${storeName}]:`, request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * 删除数据
 */
export const deleteData = async (
  storeName: string,
  id: string
): Promise<void> => {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => {
      console.log(`✅ 数据删除成功 [${storeName}]:`, id);
      resolve();
    };

    request.onerror = () => {
      console.error(`❌ 数据删除失败 [${storeName}]:`, request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * 获取单个数据
 */
export const getData = async <T>(
  storeName: string,
  id: string
): Promise<T | undefined> => {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error(`❌ 数据获取失败 [${storeName}]:`, request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * 获取所有数据
 */
export const getAllData = async <T>(
  storeName: string
): Promise<T[]> => {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      console.error(`❌ 数据获取失败 [${storeName}]:`, request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * 通过索引查询数据
 */
export const getDataByIndex = async <T>(
  storeName: string,
  indexName: string,
  value: any
): Promise<T[]> => {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      console.error(`❌ 索引查询失败 [${storeName}.${indexName}]:`, request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * 清空存储
 */
export const clearStore = async (storeName: string): Promise<void> => {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => {
      console.log(`✅ 存储清空成功 [${storeName}]`);
      resolve();
    };

    request.onerror = () => {
      console.error(`❌ 存储清空失败 [${storeName}]:`, request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * 获取存储数据数量
 */
export const getCount = async (storeName: string): Promise<number> => {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.count();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error(`❌ 计数失败 [${storeName}]:`, request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};
