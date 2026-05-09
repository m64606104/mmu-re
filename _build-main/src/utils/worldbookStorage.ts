// 世界书存储服务
import { WorldbookItem, WorldbookCategory } from '../types/worldbook';
import { getCachedData, load, save, setCachedData, smartLoad, smartSave } from './storage';

const WORLDBOOK_KEY = 'mobile_ai_chat_worldbooks';
const WORLDBOOK_CATEGORIES_KEY = 'mobile_ai_chat_worldbook_categories';
const DB_NAME = 'WorldbookDB';
const DB_VERSION = 1;
const STORE_NAME = 'worldbooks';

// IndexedDB 初始化
let db: IDBDatabase | null = null;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

// 获取所有世界书（元数据从localStorage，大内容从IndexedDB按需加载）
export const getAllWorldbooks = async (): Promise<WorldbookItem[]> => {
  try {
    const stored = await smartLoad(WORLDBOOK_KEY);
    const items: WorldbookItem[] = Array.isArray(stored) ? (stored as WorldbookItem[]) : [];
    if (items.length === 0) return [];
    
    // 对于HTML类型且内容为空的，从IndexedDB加载
    const database = await initDB();
    const promises = items.map(async (item) => {
      if (item.type === 'html' && !item.content) {
        const fullItem = await getWorldbookFromIndexedDB(database, item.id);
        return fullItem || item;
      }
      return item;
    });
    
    return Promise.all(promises);
  } catch (error) {
    console.error('Failed to get worldbooks:', error);
    return [];
  }
};

// 从IndexedDB获取单个世界书
const getWorldbookFromIndexedDB = (database: IDBDatabase, id: string): Promise<WorldbookItem | null> => {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

// 保存世界书
export const saveWorldbook = async (item: WorldbookItem): Promise<void> => {
  try {
    const items = await getAllWorldbooks();
    const index = items.findIndex(i => i.id === item.id);
    
    // 决定存储策略：HTML类型或内容超过10KB存IndexedDB
    const shouldUseIndexedDB = item.type === 'html' || item.content.length > 10240;
    
    if (shouldUseIndexedDB) {
      // 完整数据存IndexedDB
      const database = await initDB();
      await saveToIndexedDB(database, item);
      
      // localStorage只存元数据（不含content）
      const metadata = { ...item, content: '' };
      if (index >= 0) {
        items[index] = metadata;
      } else {
        items.push(metadata);
      }
    } else {
      // 小文本直接存localStorage
      if (index >= 0) {
        items[index] = item;
      } else {
        items.push(item);
      }
    }
    
    await smartSave(WORLDBOOK_KEY, items);
  } catch (error) {
    console.error('Failed to save worldbook:', error);
    throw error;
  }
};

// 存储到IndexedDB
const saveToIndexedDB = (database: IDBDatabase, item: WorldbookItem): Promise<void> => {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// 删除世界书
export const deleteWorldbook = async (id: string): Promise<void> => {
  try {
    const items = await getAllWorldbooks();
    const filtered = items.filter(i => i.id !== id);
    await smartSave(
      WORLDBOOK_KEY,
      filtered.map(item =>
        item.type === 'html' || item.content.length > 10240 ? { ...item, content: '' } : item
      )
    );
    
    // 同时从IndexedDB删除
    const database = await initDB();
    await deleteFromIndexedDB(database, id);
  } catch (error) {
    console.error('Failed to delete worldbook:', error);
    throw error;
  }
};

// 从IndexedDB删除
const deleteFromIndexedDB = (database: IDBDatabase, id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// 获取单个世界书（完整内容）
export const getWorldbookById = async (id: string): Promise<WorldbookItem | null> => {
  try {
    const items = await getAllWorldbooks();
    return items.find(i => i.id === id) || null;
  } catch (error) {
    console.error('Failed to get worldbook by id:', error);
    return null;
  }
};

// 分类管理
export const getAllCategories = (): WorldbookCategory[] => {
  try {
    const cached = getCachedData<WorldbookCategory[]>(WORLDBOOK_CATEGORIES_KEY);
    return Array.isArray(cached) ? cached : [];
  } catch (error) {
    console.error('Failed to get categories:', error);
    return [];
  }
};

export const saveCategory = (category: WorldbookCategory): void => {
  try {
    const categories = getAllCategories();
    const index = categories.findIndex(c => c.id === category.id);
    if (index >= 0) {
      categories[index] = category;
    } else {
      categories.push(category);
    }
    setCachedData(WORLDBOOK_CATEGORIES_KEY, categories);
    void save(WORLDBOOK_CATEGORIES_KEY, categories);
  } catch (error) {
    console.error('Failed to save category:', error);
    throw error;
  }
};

export const deleteCategory = (id: string): void => {
  try {
    const categories = getAllCategories();
    const filtered = categories.filter(c => c.id !== id);
    setCachedData(WORLDBOOK_CATEGORIES_KEY, filtered);
    void save(WORLDBOOK_CATEGORIES_KEY, filtered);
  } catch (error) {
    console.error('Failed to delete category:', error);
    throw error;
  }
};

export async function initializeWorldbookStorage(): Promise<void> {
  try {
    const [items, categories] = await Promise.all([
      load(WORLDBOOK_KEY),
      load(WORLDBOOK_CATEGORIES_KEY),
    ]);
    setCachedData(WORLDBOOK_KEY, Array.isArray(items) ? items : []);
    setCachedData(WORLDBOOK_CATEGORIES_KEY, Array.isArray(categories) ? categories : []);
  } catch (error) {
    console.error('初始化世界书存储失败:', error);
    setCachedData(WORLDBOOK_KEY, []);
    setCachedData(WORLDBOOK_CATEGORIES_KEY, []);
  }
}
