/**
 * 会话列表灾难恢复（不依赖 UI）
 *
 * 典型场景：启动竞态曾用「仅预设会话」覆盖 IndexedDB 主键 `conversations`，
 * 但若旧版数据仍留在 localStorage（迁移未删、或读回校验失败被保留），可从此处拉回。
 *
 * 在浏览器控制台执行：
 *   await window.__momoyu_scanConversationBackups()
 *   await window.__momoyu_restoreConversationsFromLocalStorage({ force: true })
 * 然后刷新页面。
 */

import { dumpIndexedDBData, load, save } from './storage';

function totalMessageCount(convs: unknown): number {
  if (!Array.isArray(convs)) return 0;
  return convs.reduce((acc, c: any) => acc + (Array.isArray(c?.messages) ? c.messages.length : 0), 0);
}

function conversationCount(convs: unknown): number {
  return Array.isArray(convs) ? convs.length : 0;
}

function listLocalStorageConversationCandidates(): Array<{ key: string; length: number; convs: number; msgs: number }> {
  const out: Array<{ key: string; length: number; convs: number; msgs: number }> = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key !== 'conversations' && !key.startsWith('conversations')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }
      if (!Array.isArray(parsed)) continue;
      out.push({
        key,
        length: raw.length,
        convs: conversationCount(parsed),
        msgs: totalMessageCount(parsed),
      });
    }
  } catch {
    // ignore
  }
  return out;
}

export type ConversationBackupScan = {
  indexedDbKeysMatchingConversations: string[];
  localStorageCandidates: Array<{ key: string; length: number; convs: number; msgs: number }>;
  currentIndexedDbSummary: { convs: number; msgs: number } | null;
  shardHint: string;
};

export async function scanConversationBackups(): Promise<ConversationBackupScan> {
  const localStorageCandidates = listLocalStorageConversationCandidates();

  let indexedDbKeysMatchingConversations: string[] = [];
  try {
    const all = await dumpIndexedDBData();
    indexedDbKeysMatchingConversations = Object.keys(all).filter(
      (k) => k === 'conversations' || k.startsWith('conversations_'),
    );
  } catch {
    indexedDbKeysMatchingConversations = [];
  }

  let currentIndexedDbSummary: { convs: number; msgs: number } | null = null;
  try {
    const cur = await load('conversations');
    if (Array.isArray(cur)) {
      currentIndexedDbSummary = { convs: cur.length, msgs: totalMessageCount(cur) };
    }
  } catch {
    currentIndexedDbSummary = null;
  }

  const hasMeta = indexedDbKeysMatchingConversations.some((k) => k === 'conversations_meta');
  const hasBatch = indexedDbKeysMatchingConversations.some((k) => /^conversations_batch_\d+$/.test(k));
  const shardHint =
    hasMeta || hasBatch
      ? 'IndexedDB 中仍有 conversations 分片键；若主键损坏可联系开发者做分片拼回。'
      : '未发现 conversations 分片键（主键成功写入后通常会删掉分片）。';

  return {
    indexedDbKeysMatchingConversations,
    localStorageCandidates,
    currentIndexedDbSummary,
    shardHint,
  };
}

export type RestoreFromLocalStorageOptions = {
  /** localStorage 键名，默认 conversations */
  key?: string;
  /** 为 true 时：只要解析为数组就写入，不与会话条数比较 */
  force?: boolean;
};

/**
 * 从 localStorage 读 JSON 数组，写入 IndexedDB `conversations`（走统一 save 与校验）。
 */
export async function restoreConversationsFromLocalStorage(
  options?: RestoreFromLocalStorageOptions,
): Promise<{ ok: boolean; reason: string }> {
  const key = options?.key || 'conversations';
  const raw = localStorage.getItem(key);
  if (!raw) {
    return { ok: false, reason: `localStorage 无键「${key}」` };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'JSON 解析失败' };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, reason: '不是数组，拒绝写入' };
  }
  if (parsed.length === 0) {
    return { ok: false, reason: '数组为空，拒绝写入' };
  }
  const bad = parsed.some((c: any) => !c || typeof c !== 'object' || typeof c.id !== 'string');
  if (bad) {
    return { ok: false, reason: '数组项缺少 id，拒绝写入' };
  }

  const incomingMsgs = totalMessageCount(parsed);
  const incomingConvs = parsed.length;

  if (!options?.force) {
    try {
      const cur = await load('conversations');
      if (Array.isArray(cur) && cur.length > 0) {
        const curMsgs = totalMessageCount(cur);
        if (incomingMsgs <= curMsgs && incomingConvs <= cur.length) {
          return {
            ok: false,
            reason: `当前 IndexedDB 会话条数/消息数不少于备份（当前 ${cur.length} 会话 / ${curMsgs} 条消息）。若仍要覆盖请加 { force: true }`,
          };
        }
      }
    } catch {
      // 无当前数据则继续写
    }
  }

  await save('conversations', parsed);
  return {
    ok: true,
    reason: `已从 localStorage「${key}」写入 IndexedDB conversations（${incomingConvs} 会话，约 ${incomingMsgs} 条消息）。请刷新页面。`,
  };
}

