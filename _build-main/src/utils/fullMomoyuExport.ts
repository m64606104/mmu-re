import { getLiveConversations } from '../domains/generation/liveConversations';
import { dumpIndexedDBData } from './storage';
import {
  dumpSidecarIndexedDatabases,
  summarizeSidecarForExport,
  SIDECAR_INDEXED_FIELD,
} from './fullBackupSidecars';

export type FullMomoyuExportStats = {
  conversations: number;
  messages: number;
  moments: number;
  contacts: number;
  documents: number;
  memories: number;
  images: number;
  profiles: number;
  relationships: number;
  /** 编辑学习调试台：各会话条目合计 */
  editCalibrationEntries: number;
  /** 已写入语言风格画像的私聊会话数 */
  languageStyleProfileConversations: number;
};

/** 主库 IndexedDB 快照失败时的降级导出（例如 Connection to Indexed Database server lost） */
export type FullMomoyuExportDegraded = {
  indexedDBSnapshotFailed: true;
  reason: string;
  /** 是否把当前内存中的会话列表写入了导出包（至少能救聊天记录） */
  conversationsFromMemory: boolean;
};

export type FullMomoyuExportResult = {
  stats: FullMomoyuExportStats;
  filename: string;
  sidecarSummaryLine: string;
  degraded?: FullMomoyuExportDegraded;
};

function buildStats(allData: Record<string, unknown>): FullMomoyuExportStats {
  const conversations = (Array.isArray(allData.conversations) ? allData.conversations : []) as Array<{
    messages?: unknown[];
    characterSettings?: unknown;
  }>;
  const memoryBanks = (Array.isArray(allData.chat_memory_banks) ? allData.chat_memory_banks : []) as Array<{
    memories?: unknown[];
  }>;
  const relationships = (Array.isArray(allData.relationships) ? allData.relationships : []) as unknown[];
  const docs = Array.isArray(allData.document_library)
    ? (allData.document_library as unknown[])
    : Array.isArray(allData.documents)
      ? (allData.documents as unknown[])
      : [];

  let momentsCount = 0;
  Object.entries(allData).forEach(([key, value]) => {
    if (key === 'moments' && Array.isArray(value)) {
      momentsCount += value.length;
      return;
    }
    if (key.startsWith('moments_') && value && typeof value === 'object') {
      momentsCount += Array.isArray((value as { posts?: unknown[] }).posts)
        ? (value as { posts: unknown[] }).posts.length
        : 0;
    }
  });

  const calibRaw = allData.momoyu_edit_calibration_v1;
  let editCalibrationEntries = 0;
  if (calibRaw && typeof calibRaw === 'object' && !Array.isArray(calibRaw)) {
    for (const v of Object.values(calibRaw as Record<string, unknown>)) {
      if (Array.isArray(v)) editCalibrationEntries += v.length;
    }
  }
  const styleRaw = allData.momoyu_language_style_profile_v1;
  let languageStyleProfileConversations = 0;
  if (styleRaw && typeof styleRaw === 'object' && !Array.isArray(styleRaw)) {
    languageStyleProfileConversations = Object.values(styleRaw as Record<string, { text?: string }>).filter(
      (x) => x && String(x.text || '').trim().length > 0
    ).length;
  }

  return {
    conversations: conversations.length,
    messages: conversations.reduce(
      (sum, conv) => sum + (Array.isArray(conv.messages) ? conv.messages.length : 0),
      0
    ),
    moments: momentsCount,
    contacts: Array.isArray(allData.contacts) ? (allData.contacts as unknown[]).length : 0,
    documents: docs.length,
    memories: memoryBanks.reduce(
      (sum, bank) => sum + (Array.isArray(bank.memories) ? bank.memories.length : 0),
      0
    ),
    images: ['landscapeImage', 'bannerImage'].filter((k) => !!allData[k]).length,
    profiles: conversations.filter((c) => Boolean(c?.characterSettings)).length,
    relationships: relationships.length,
    editCalibrationEntries,
    languageStyleProfileConversations,
  };
}

/** 与设置页「导出全部数据」相同：主库 + 侧车 IndexedDB，下载 v3 JSON */
export async function exportFullMomoyuBackup(): Promise<FullMomoyuExportResult> {
  const allData: Record<string, unknown> = {};

  const localStorageKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    localStorageKeys.push(key);
    const value = localStorage.getItem(key);
    if (value == null) continue;
    try {
      allData[key] = JSON.parse(value);
    } catch {
      allData[key] = value;
    }
  }

  let indexedDBData: Record<string, unknown> = {};
  let degraded: FullMomoyuExportDegraded | undefined;
  try {
    indexedDBData = await dumpIndexedDBData();
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.warn('[fullMomoyuExport] 主库 IndexedDB 快照失败，降级为 localStorage + 内存会话:', e);
    const live = getLiveConversations();
    const conversationsFromMemory = live.length > 0;
    if (conversationsFromMemory) {
      indexedDBData = { conversations: live as unknown[] };
    }
    degraded = {
      indexedDBSnapshotFailed: true,
      reason,
      conversationsFromMemory,
    };
  }
  const indexedDBKeys = Object.keys(indexedDBData);
  Object.assign(allData, indexedDBData);

  const sidecarIndexedD = await dumpSidecarIndexedDatabases();
  const sidecarSummaryLine = summarizeSidecarForExport(sidecarIndexedD);

  const stats = buildStats(allData);

  const exportData = {
    format: 'momoyu-backup-v3',
    exportDate: new Date().toISOString(),
    appVersion: '3.0.0',
    dataType: 'full-backup',
    storageType: 'full-snapshot-v3',
    localStorageKeys,
    indexedDBKeys,
    stats,
    [SIDECAR_INDEXED_FIELD]: sidecarIndexedD,
    data: allData,
    ...(degraded ? { degradedBackup: degraded } : {}),
  };

  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  const filename = `momoyu_全数据备份_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { stats, filename, sidecarSummaryLine, degraded };
}

export function formatFullExportSuccessAlert(
  stats: FullMomoyuExportStats,
  sidecarSummaryLine: string,
  degraded?: FullMomoyuExportDegraded
): string {
  const degradedBlock =
    degraded?.indexedDBSnapshotFailed === true
      ? `\n⚠️ 降级导出说明：\n主库 IndexedDB 当时无法读取（${degraded.reason}）。\n` +
        (degraded.conversationsFromMemory
          ? '已把「当前内存里的会话列表」写入备份包，聊天记录可先救回；朋友圈、记忆库、文档库等主库内容可能缺失，请刷新页面后再次导出做完整备份。\n'
          : '未能注入内存会话（可能未绑定或列表为空），备份可能严重不完整；请先刷新页面再导出。\n')
      : '';
  return (
    `✅ 全部数据已导出！\n\n` +
    `📊 包含内容：\n` +
    `• 对话记录: ${stats.conversations} 个（${stats.messages} 条消息）\n` +
    `• AI角色: ${stats.profiles} 个\n` +
    `• 联系人: ${stats.contacts} 个\n` +
    `• 朋友圈: ${stats.moments} 条\n` +
    `• 文档库: ${stats.documents} 份\n` +
    `• 记忆库: ${stats.memories} 条\n` +
    `• 关系网络: ${stats.relationships} 条\n` +
    `• 背景图片: ${stats.images} 张\n` +
    `• 编辑学习记录: ${stats.editCalibrationEntries} 条（IndexedDB）\n` +
    `• 语言风格画像: ${stats.languageStyleProfileConversations} 个角色有快照\n` +
    `• 线下模式叙事、其它主库键：随 IndexedDB 全量扫描一并导出\n` +
    `• 其他设置和数据\n` +
    (sidecarSummaryLine ? `${sidecarSummaryLine}\n` : '') +
    degradedBlock +
    `\n💾 文件已保存到下载文件夹\n` +
    `换浏览器：把该 JSON 拷到新浏览器，在同一页面点「导入全部数据」即可整包恢复。\n` +
    `（含主库存与表情包等独立库，尽量不丢本地数据。）`
  );
}
