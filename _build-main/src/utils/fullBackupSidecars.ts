/**
 * 主存储（localStorage + MobileAIChatDB）之外的独立 IndexedDB 库备份/恢复。
 * 用于「整机 / 全量迁移」：换浏览器、换设备时，表情包（通用/角色专属/用户专属、旧版 stickers 库表）、
 * EasyChat 贴纸、世界书大正文、感知缓存等必须与主备份一并带走。
 */

import { STORES, initDB } from './indexedDBHelper';
import type { Sticker, StickerLibrary } from './stickerStore';
import { stickerStore } from './stickerStore';

const WORLDBOOK_DB = 'WorldbookDB';
const WORLDBOOK_VER = 1;
const WORLDBOOK_STORE = 'worldbooks';

const PERCEPTION_DB = 'AIPerceptionDB';
const PERCEPTION_VER = 1;
const PERCEPTION_STORE = 'perceptionStates';

/** 备份 JSON 顶层字段名（不放入主 data 对象，避免被按 key 恢复逻辑误处理） */
export const SIDECAR_INDEXED_FIELD = 'sidecarIndexedD';

export type SidecarIndexedD = {
  /** 2：WeChatSimulator 按「库内全部 object store」导出；1：仅三表（兼容旧备份） */
  _v: 1 | 2;
  /**
   * WeChatSimulator（`indexedDBHelper`）内**每一个** object store 的快照。
   * 含 commonStickers / characterStickers / userStickers，以及历史版本可能存在的 `stickers` 等，避免整机迁移漏表情。
   */
  wechatSimulatorByStore?: Record<string, unknown[]>;
  /** @deprecated 仅兼容早期侧车；新导出请使用 wechatSimulatorByStore */
  wechatStickerStores?: {
    commonStickers: unknown[];
    characterStickers: unknown[];
    userStickers: unknown[];
  };
  easyChatStickerLibrary?: StickerLibrary;
  worldbooks?: unknown[];
  perceptionStates?: unknown[];
};

function waitDeleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

async function dumpWorldbookRows(): Promise<unknown[]> {
  return new Promise((resolve) => {
    const req = indexedDB.open(WORLDBOOK_DB, WORLDBOOK_VER);
    req.onerror = () => resolve([]);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(WORLDBOOK_STORE)) {
        db.close();
        resolve([]);
        return;
      }
      const tx = db.transaction([WORLDBOOK_STORE], 'readonly');
      const getAll = tx.objectStore(WORLDBOOK_STORE).getAll();
      getAll.onsuccess = () => {
        db.close();
        resolve(getAll.result || []);
      };
      getAll.onerror = () => {
        db.close();
        resolve([]);
      };
    };
  });
}

async function dumpPerceptionRows(): Promise<unknown[]> {
  return new Promise((resolve) => {
    const req = indexedDB.open(PERCEPTION_DB, PERCEPTION_VER);
    req.onerror = () => resolve([]);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PERCEPTION_STORE)) {
        db.close();
        resolve([]);
        return;
      }
      const tx = db.transaction([PERCEPTION_STORE], 'readonly');
      const getAll = tx.objectStore(PERCEPTION_STORE).getAll();
      getAll.onsuccess = () => {
        db.close();
        resolve(getAll.result || []);
      };
      getAll.onerror = () => {
        db.close();
        resolve([]);
      };
    };
  });
}

/** 扫描 WeChatSimulator 内全部 object store（不限于当前代码里写死的三张表） */
async function dumpWeChatSimulatorByStore(): Promise<Record<string, unknown[]> | undefined> {
  try {
    const db = await initDB();
    const names = Array.from(db.objectStoreNames);
    if (names.length === 0) {
      db.close();
      return undefined;
    }
    const out: Record<string, unknown[]> = {};
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(names, 'readonly');
      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      for (const n of names) {
        const req = tx.objectStore(n).getAll();
        req.onsuccess = () => {
          out[n] = (req.result as unknown[]) || [];
        };
        req.onerror = () => reject(req.error);
      }
    });
    const hasAny = Object.values(out).some((arr) => Array.isArray(arr) && arr.length > 0);
    return hasAny ? out : undefined;
  } catch (e) {
    console.warn('[全量备份] WeChatSimulator 全库扫描失败:', e);
    return undefined;
  }
}

async function restoreWeChatSimulatorFromByStore(byStore: Record<string, unknown[]>): Promise<void> {
  const db = await initDB();
  const existing = new Set(Array.from(db.objectStoreNames));
  const namesForReplace = Object.keys(byStore).filter((n) => existing.has(n));
  const legacyStickersBackup = byStore['stickers'];

  if (namesForReplace.length > 0) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(namesForReplace, 'readwrite');
      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      for (const n of namesForReplace) {
        const st = tx.objectStore(n);
        st.clear();
        for (const row of byStore[n] || []) {
          try {
            st.put(row);
          } catch (e) {
            console.warn(`[全量恢复] WeChatSimulator put 跳过 ${n}:`, e);
          }
        }
      }
    });
  } else {
    db.close();
  }

  // 备份里有旧版 `stickers` 表数据，但当前库已升级为仅 common/character/user：合并进通用表，避免整机迁移丢表情
  if (
    legacyStickersBackup?.length &&
    !existing.has('stickers') &&
    existing.has(STORES.COMMON_STICKERS)
  ) {
    const db2 = await initDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db2.transaction([STORES.COMMON_STICKERS], 'readwrite');
      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => {
        db2.close();
        resolve();
      };
      const st = tx.objectStore(STORES.COMMON_STICKERS);
      for (const row of legacyStickersBackup) {
        if (row && typeof row === 'object' && 'id' in (row as object)) {
          try {
            st.put(row);
          } catch {
            /* skip */
          }
        }
      }
    });
  }
}

export async function dumpSidecarIndexedDatabases(): Promise<SidecarIndexedD> {
  const out: SidecarIndexedD = { _v: 2 };

  try {
    const byStore = await dumpWeChatSimulatorByStore();
    if (byStore) out.wechatSimulatorByStore = byStore;
  } catch (e) {
    console.warn('[全量备份] WeChatSimulator 全库扫描异常:', e);
  }

  try {
    const lib = await stickerStore.getLibrary();
    const n =
      lib.common.length + Object.values(lib.character).reduce((s, arr) => s + (arr?.length || 0), 0);
    if (n > 0) out.easyChatStickerLibrary = lib;
  } catch (e) {
    console.warn('[全量备份] EasyChatDB 表情读取失败（可忽略）:', e);
  }

  try {
    const worldbooks = await dumpWorldbookRows();
    if (worldbooks.length) out.worldbooks = worldbooks;
  } catch (e) {
    console.warn('[全量备份] WorldbookDB 读取失败（可忽略）:', e);
  }

  try {
    const perceptionStates = await dumpPerceptionRows();
    if (perceptionStates.length) out.perceptionStates = perceptionStates;
  } catch (e) {
    console.warn('[全量备份] AIPerceptionDB 读取失败（可忽略）:', e);
  }

  return out;
}

async function restoreWeChatStickers(data: NonNullable<SidecarIndexedD['wechatStickerStores']>): Promise<void> {
  const db = await initDB();
  await new Promise<void>((resolve, reject) => {
    const names: string[] = [STORES.COMMON_STICKERS, STORES.CHARACTER_STICKERS, STORES.USER_STICKERS];
    const tx = db.transaction(names, 'readwrite');
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    for (const name of names) {
      tx.objectStore(name).clear();
    }
    const putRows = (storeName: string, rows: unknown[]) => {
      const st = tx.objectStore(storeName);
      for (const row of rows) {
        try {
          st.put(row);
        } catch (e) {
          console.warn(`[全量恢复] put 跳过 ${storeName}:`, e);
        }
      }
    };
    putRows(STORES.COMMON_STICKERS, data.commonStickers || []);
    putRows(STORES.CHARACTER_STICKERS, data.characterStickers || []);
    putRows(STORES.USER_STICKERS, data.userStickers || []);
  });
}

async function restoreEasyChatStickers(lib: StickerLibrary): Promise<void> {
  const EASY_DB = 'EasyChatDB';
  const EASY_VER = 1;
  const EASY_STORE = 'stickers';

  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(EASY_DB, EASY_VER);
    r.onerror = () => reject(r.error);
    r.onsuccess = () => resolve(r.result);
    r.onupgradeneeded = (ev) => {
      const database = (ev.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(EASY_STORE)) {
        const store = database.createObjectStore(EASY_STORE, { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('characterId', 'characterId', { unique: false });
      }
    };
  });

  const flat: Sticker[] = [...(lib.common || [])];
  for (const arr of Object.values(lib.character || {})) {
    if (Array.isArray(arr)) flat.push(...arr);
  }

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([EASY_STORE], 'readwrite');
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    const st = tx.objectStore(EASY_STORE);
    st.clear();
    for (const row of flat) {
      try {
        st.put(row);
      } catch (e) {
        console.warn('[全量恢复] EasyChat 表情 put 跳过:', e);
      }
    }
  });

  window.dispatchEvent(new Event('sticker-storage-change'));
}

async function restoreWorldbooks(rows: unknown[]): Promise<void> {
  if (!rows.length) return;
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(WORLDBOOK_DB, WORLDBOOK_VER);
    r.onerror = () => reject(r.error);
    r.onsuccess = () => resolve(r.result);
    r.onupgradeneeded = (ev) => {
      const database = (ev.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(WORLDBOOK_STORE)) {
        database.createObjectStore(WORLDBOOK_STORE, { keyPath: 'id' });
      }
    };
  });

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([WORLDBOOK_STORE], 'readwrite');
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    const st = tx.objectStore(WORLDBOOK_STORE);
    st.clear();
    for (const row of rows) {
      try {
        st.put(row);
      } catch (e) {
        console.warn('[全量恢复] 世界书 put 跳过:', e);
      }
    }
  });
}

async function restorePerception(rows: unknown[]): Promise<void> {
  if (!rows.length) return;
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(PERCEPTION_DB, PERCEPTION_VER);
    r.onerror = () => reject(r.error);
    r.onsuccess = () => resolve(r.result);
    r.onupgradeneeded = (ev) => {
      const database = (ev.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(PERCEPTION_STORE)) {
        database.createObjectStore(PERCEPTION_STORE, { keyPath: 'id' });
      }
    };
  });

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([PERCEPTION_STORE], 'readwrite');
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    const st = tx.objectStore(PERCEPTION_STORE);
    st.clear();
    for (const row of rows) {
      try {
        st.put(row);
      } catch (e) {
        console.warn('[全量恢复] 感知状态 put 跳过:', e);
      }
    }
  });
}

export async function restoreSidecarIndexedDatabases(payload: unknown): Promise<void> {
  if (!payload || typeof payload !== 'object') return;
  const p = payload as SidecarIndexedD;
  if (p._v !== 1 && p._v !== 2) {
    console.warn('[全量恢复] 侧车备份版本未知，跳过:', p);
    return;
  }

  if (p.wechatSimulatorByStore && Object.keys(p.wechatSimulatorByStore).length > 0) {
    await restoreWeChatSimulatorFromByStore(p.wechatSimulatorByStore);
  } else if (p.wechatStickerStores) {
    await restoreWeChatStickers(p.wechatStickerStores);
  }
  if (p.easyChatStickerLibrary) {
    await restoreEasyChatStickers(p.easyChatStickerLibrary);
  }
  if (p.worldbooks && p.worldbooks.length) {
    await restoreWorldbooks(p.worldbooks);
  }
  if (p.perceptionStates && p.perceptionStates.length) {
    await restorePerception(p.perceptionStates);
  }
}

/** 与 clearAllData 配套：删掉独立库，避免导入后残留旧表情/旧世界书正文 */
export async function clearSidecarIndexedDatabases(): Promise<void> {
  const names = ['WeChatSimulator', 'EasyChatDB', WORLDBOOK_DB, PERCEPTION_DB];
  for (const n of names) {
    try {
      await waitDeleteDatabase(n);
    } catch (e) {
      console.warn(`[清空数据] 删除 IndexedDB ${n} 失败（可忽略）:`, e);
    }
  }
}

export function summarizeSidecarForExport(s: SidecarIndexedD): string {
  let wechatN = 0;
  if (s.wechatSimulatorByStore) {
    wechatN = Object.values(s.wechatSimulatorByStore).reduce(
      (acc, rows) => acc + (Array.isArray(rows) ? rows.length : 0),
      0
    );
  } else if (s.wechatStickerStores) {
    const w = s.wechatStickerStores;
    wechatN =
      (w.commonStickers?.length || 0) +
      (w.characterStickers?.length || 0) +
      (w.userStickers?.length || 0);
  }
  let easyN = 0;
  if (s.easyChatStickerLibrary) {
    const lib = s.easyChatStickerLibrary;
    easyN = lib.common.length + Object.values(lib.character).reduce((acc, a) => acc + (a?.length || 0), 0);
  }
  const wb = s.worldbooks?.length || 0;
  const pr = s.perceptionStates?.length || 0;
  if (!wechatN && !easyN && !wb && !pr) return '';
  const storeHint =
    s.wechatSimulatorByStore && Object.keys(s.wechatSimulatorByStore).length
      ? `（WeChat 库表：${Object.keys(s.wechatSimulatorByStore).join('、')}）`
      : '';
  return (
    `• 独立 IndexedDB：WeChat 表情共 ${wechatN} 条${storeHint}、EasyChat 表情 ${easyN} 条、世界书正文 ${wb} 条、感知缓存 ${pr} 条`
  );
}
