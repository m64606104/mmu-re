import { useState, useEffect } from 'react';

const DB_NAME = 'EasyChatDB';
const STORE_NAME = 'stickers';
const DB_VERSION = 1;

export interface Sticker {
  id: string;
  url: string;
  createdAt: number;
  category: 'common' | 'character';
  characterId?: string; // 仅当 category 为 character 时有效
}

export interface StickerLibrary {
  common: Sticker[];
  character: Record<string, Sticker[]>; // characterId -> Sticker[]
}

// IndexedDB Helper
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('characterId', 'characterId', { unique: false });
      }
    };
  });
};

export const stickerStore = {
  // 获取所有表情
  async getLibrary(): Promise<StickerLibrary> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const allStickers = request.result as Sticker[];
          const lib: StickerLibrary = {
            common: [],
            character: {}
          };
          
          // 分类处理
          allStickers.forEach(s => {
            if (s.category === 'common') {
              lib.common.push(s);
            } else if (s.characterId) {
              if (!lib.character[s.characterId]) {
                lib.character[s.characterId] = [];
              }
              lib.character[s.characterId].push(s);
            }
          });

          // 按时间倒序排序
          lib.common.sort((a, b) => b.createdAt - a.createdAt);
          Object.keys(lib.character).forEach(key => {
            lib.character[key].sort((a, b) => b.createdAt - a.createdAt);
          });

          resolve(lib);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('Failed to open DB', e);
      return { common: [], character: {} };
    }
  },

  // 添加表情
  async addSticker(type: 'common' | 'character', url: string, characterId?: string) {
    const db = await openDB();
    const newSticker: Sticker = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      url,
      createdAt: Date.now(),
      category: type,
      characterId
    };

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(newSticker);
      
      request.onsuccess = () => {
        window.dispatchEvent(new Event('sticker-storage-change'));
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  },

  // 删除表情
  async deleteSticker(id: string) {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => {
        window.dispatchEvent(new Event('sticker-storage-change'));
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }
};

// Hook for React
export function useStickers(currentCharacterId?: string) {
  const [library, setLibrary] = useState<StickerLibrary>({ common: [], character: {} });
  const [loading, setLoading] = useState(true);

  const refreshLibrary = () => {
    stickerStore.getLibrary().then(lib => {
      setLibrary(lib);
      setLoading(false);
    });
  };

  useEffect(() => {
    refreshLibrary();
    const handleUpdate = () => refreshLibrary();
    window.addEventListener('sticker-storage-change', handleUpdate);
    return () => window.removeEventListener('sticker-storage-change', handleUpdate);
  }, []);

  return {
    common: library.common,
    character: currentCharacterId ? (library.character[currentCharacterId] || []) : [],
    loading,
    addSticker: stickerStore.addSticker.bind(stickerStore),
    deleteSticker: stickerStore.deleteSticker.bind(stickerStore)
  };
}
