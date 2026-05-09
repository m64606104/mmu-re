/**
 * 主聊天 WeChatSimulator 表情（公共 / 用户 / 全部角色专属）+ EasyChat 表情库的独立导出/导入。
 * 不触及全量备份中的其它侧车数据。
 */

import { initDB, STORES } from './indexedDBHelper';
import { migrateLegacyStickersIfNeeded } from './stickerStorage';
import type { StickerLibrary } from './stickerStore';
import { stickerStore } from './stickerStore';

export const MOMOYU_STICKER_PACK_FORMAT = 'momoyu-sticker-pack-v1' as const;

/** 参与导出/替换的主聊天 object store（含旧版 stickers 表） */
const WECHAT_STICKER_STORE_NAMES = [
  STORES.COMMON_STICKERS,
  STORES.CHARACTER_STICKERS,
  STORES.USER_STICKERS,
  STORES.STICKERS,
] as const;

export type MomoyuStickerPackV1 = {
  format: typeof MOMOYU_STICKER_PACK_FORMAT;
  exportDate: string;
  stats: {
    wechatCommon: number;
    wechatCharacter: number;
    wechatUser: number;
    wechatLegacyStickers: number;
    easyChatCommon: number;
    easyChatCharacterConversations: number;
    easyChatCharacterTotal: number;
  };
  /** 仅含表情相关表；键为 object store 名 */
  wechatSimulatorByStore: Record<string, unknown[]>;
  /** EasyChat 模块表情（common + 按角色） */
  easyChatStickerLibrary?: StickerLibrary;
};

export type ImportStickerPackOptions = {
  /** 为 true 时先清空主聊天各表情表再写入（仅影响包内出现的 store） */
  replaceMainChatStickers?: boolean;
  /** 为 true 时先清空 EasyChatDB stickers 再写入 */
  replaceEasyChatStickers?: boolean;
};

async function dumpWeChatStickerStoresOnly(): Promise<Record<string, unknown[]>> {
  const db = await initDB();
  const existing = new Set(Array.from(db.objectStoreNames));
  const names = WECHAT_STICKER_STORE_NAMES.filter((n) => existing.has(n));
  if (names.length === 0) {
    db.close();
    return {};
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
  return out;
}

function buildStats(
  byStore: Record<string, unknown[]>,
  lib: StickerLibrary | undefined
): MomoyuStickerPackV1['stats'] {
  const common = byStore[STORES.COMMON_STICKERS]?.length ?? 0;
  const character = byStore[STORES.CHARACTER_STICKERS]?.length ?? 0;
  const user = byStore[STORES.USER_STICKERS]?.length ?? 0;
  const legacy = byStore[STORES.STICKERS]?.length ?? 0;

  let easyCommon = 0;
  let easyCharSlots = 0;
  let easyCharTotal = 0;
  if (lib) {
    easyCommon = lib.common?.length ?? 0;
    const ch = lib.character || {};
    easyCharSlots = Object.keys(ch).length;
    easyCharTotal = Object.values(ch).reduce((s, arr) => s + (arr?.length ?? 0), 0);
  }

  return {
    wechatCommon: common,
    wechatCharacter: character,
    wechatUser: user,
    wechatLegacyStickers: legacy,
    easyChatCommon: easyCommon,
    easyChatCharacterConversations: easyCharSlots,
    easyChatCharacterTotal: easyCharTotal,
  };
}

/** 导出当前全部表情包（主聊天三类 + 可选旧表 + EasyChat） */
export async function buildMomoyuStickerPack(): Promise<MomoyuStickerPackV1> {
  await migrateLegacyStickersIfNeeded();

  const wechatSimulatorByStore = await dumpWeChatStickerStoresOnly();

  let easyChatStickerLibrary: StickerLibrary | undefined;
  try {
    const lib = await stickerStore.getLibrary();
    const n =
      lib.common.length + Object.values(lib.character).reduce((s, arr) => s + (arr?.length || 0), 0);
    if (n > 0) easyChatStickerLibrary = lib;
  } catch (e) {
    console.warn('[表情包导出] EasyChat 读取失败:', e);
  }

  const stats = buildStats(wechatSimulatorByStore, easyChatStickerLibrary);

  return {
    format: MOMOYU_STICKER_PACK_FORMAT,
    exportDate: new Date().toISOString(),
    stats,
    wechatSimulatorByStore,
    easyChatStickerLibrary,
  };
}

function triggerStickerPackDownload(payload: MomoyuStickerPackV1): void {
  const json = JSON.stringify(payload);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  a.href = url;
  a.download = `momoyu-stickers-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportMomoyuStickerPackToFile(): Promise<MomoyuStickerPackV1> {
  const pack = await buildMomoyuStickerPack();
  triggerStickerPackDownload(pack);
  return pack;
}

/** 合并写入主聊天表情表（put，同 id 覆盖） */
async function mergeWeChatStickerStores(byStore: Record<string, unknown[]>): Promise<void> {
  const db = await initDB();
  const existing = new Set(Array.from(db.objectStoreNames));
  const names = Object.keys(byStore).filter((n) => existing.has(n));
  if (names.length === 0) {
    db.close();
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(names, 'readwrite');
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    for (const n of names) {
      const st = tx.objectStore(n);
      for (const row of byStore[n] || []) {
        if (!row || typeof row !== 'object' || !('id' in row)) continue;
        try {
          st.put(row);
        } catch (e) {
          console.warn(`[表情包导入] put 跳过 ${n}:`, e);
        }
      }
    }
  });
}

/** 替换写入：仅处理表情相关表，先 clear 再 put */
async function replaceWeChatStickerStores(byStore: Record<string, unknown[]>): Promise<void> {
  const db = await initDB();
  const existing = new Set(Array.from(db.objectStoreNames));
  const stickerSet = new Set<string>(WECHAT_STICKER_STORE_NAMES as unknown as string[]);
  const namesForReplace = Object.keys(byStore).filter((n) => existing.has(n) && stickerSet.has(n));

  if (namesForReplace.length === 0) {
    db.close();
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(namesForReplace, 'readwrite');
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    for (const n of namesForReplace) {
      tx.objectStore(n).clear();
    }
    for (const n of namesForReplace) {
      const st = tx.objectStore(n);
      for (const row of byStore[n] || []) {
        if (!row || typeof row !== 'object' || !('id' in row)) continue;
        try {
          st.put(row);
        } catch (e) {
          console.warn(`[表情包导入] replace put 跳过 ${n}:`, e);
        }
      }
    }
  });

  // 与全量恢复一致：仅有 legacy stickers、且当前库无该表时，合并进 common
  const legacyStickersBackup = byStore[STORES.STICKERS];
  if (
    legacyStickersBackup?.length &&
    !existing.has(STORES.STICKERS) &&
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
        if (row && typeof row === 'object' && 'id' in row) {
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

async function mergeEasyChatStickers(lib: StickerLibrary): Promise<void> {
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

  const flat = [...(lib.common || [])];
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
    for (const row of flat) {
      if (!row?.id) continue;
      try {
        st.put(row);
      } catch (e) {
        console.warn('[表情包导入] EasyChat merge put 跳过:', e);
      }
    }
  });
}

async function replaceEasyChatStickers(lib: StickerLibrary): Promise<void> {
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

  const flat = [...(lib.common || [])];
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
      if (!row?.id) continue;
      try {
        st.put(row);
      } catch (e) {
        console.warn('[表情包导入] EasyChat replace put 跳过:', e);
      }
    }
  });
}

export function isMomoyuStickerPack(obj: unknown): obj is MomoyuStickerPackV1 {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return o.format === MOMOYU_STICKER_PACK_FORMAT && typeof o.wechatSimulatorByStore === 'object';
}

export async function importMomoyuStickerPack(
  payload: MomoyuStickerPackV1,
  options?: ImportStickerPackOptions
): Promise<void> {
  const replaceMain = Boolean(options?.replaceMainChatStickers);
  const replaceEasy = Boolean(options?.replaceEasyChatStickers);

  const ws = payload.wechatSimulatorByStore || {};
  if (replaceMain) {
    await replaceWeChatStickerStores(ws);
  } else {
    await mergeWeChatStickerStores(ws);
  }

  if (payload.easyChatStickerLibrary) {
    if (replaceEasy) {
      await replaceEasyChatStickers(payload.easyChatStickerLibrary);
    } else {
      await mergeEasyChatStickers(payload.easyChatStickerLibrary);
    }
  }

  try {
    window.dispatchEvent(new Event('sticker-storage-change'));
  } catch {
    /* ignore */
  }
}

export function formatStickerPackSummary(p: MomoyuStickerPackV1): string {
  const s = p.stats;
  const lines = [
    `主聊天 · 公共 ${s.wechatCommon} · 角色专属 ${s.wechatCharacter} · 用户 ${s.wechatUser}`,
    s.wechatLegacyStickers > 0 ? `（含旧版 stickers 表 ${s.wechatLegacyStickers} 条）` : '',
    `EasyChat · 公共 ${s.easyChatCommon} · 角色槽 ${s.easyChatCharacterConversations}（共 ${s.easyChatCharacterTotal} 条）`,
  ].filter(Boolean);
  return lines.join('\n');
}
