import type { EditCalibrationEntry } from '../types';
import { load, save } from './storage';
import { notifyEditCalibrationStudioUpdated } from './editCalibrationStudioEvents';
import { clearLanguageStyleProfileForConversation } from './languageStyleProfileStorage';

const STORAGE_KEY = 'momoyu_edit_calibration_v1';
const MAX_ENTRIES_PER_CONVERSATION = 100;
const CLIP = 8000;

export { EDIT_CALIBRATION_STUDIO_UPDATED_EVENT as EDIT_CALIBRATION_UPDATED_EVENT } from './editCalibrationStudioEvents';

function clip(s: string, max: number): string {
  const t = (s || '').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n…（已截断）`;
}

type Store = Record<string, EditCalibrationEntry[]>;

async function readStore(): Promise<Store> {
  try {
    const raw = await load(STORAGE_KEY);
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as Store;
    }
  } catch {
    /* ignore */
  }
  return {};
}

async function writeStore(store: Store): Promise<void> {
  await save(STORAGE_KEY, store);
}

export function notifyEditCalibrationUpdated(conversationId: string): void {
  notifyEditCalibrationStudioUpdated(conversationId);
}

export async function loadEditCalibrationEntries(conversationId: string): Promise<EditCalibrationEntry[]> {
  const store = await readStore();
  const list = store[conversationId];
  return Array.isArray(list) ? [...list].sort((a, b) => b.createdAt - a.createdAt) : [];
}

export async function appendEditCalibrationEntry(
  conversationId: string,
  input: {
    messageId: string;
    role: 'user' | 'assistant';
    baselineContent: string;
    revisedContent: string;
  }
): Promise<EditCalibrationEntry> {
  const entry: EditCalibrationEntry = {
    id: `ec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    messageId: input.messageId,
    role: input.role,
    baselineContent: clip(input.baselineContent, CLIP),
    revisedContent: clip(input.revisedContent, CLIP),
    createdAt: Date.now(),
    aiReflectionStatus: 'pending',
  };
  const store = await readStore();
  const list = Array.isArray(store[conversationId]) ? [...store[conversationId]] : [];
  list.unshift(entry);
  while (list.length > MAX_ENTRIES_PER_CONVERSATION) {
    list.pop();
  }
  store[conversationId] = list;
  await writeStore(store);
  notifyEditCalibrationUpdated(conversationId);
  return entry;
}

export async function updateEditCalibrationEntry(
  conversationId: string,
  entryId: string,
  patch: Partial<Pick<EditCalibrationEntry, 'aiReflection' | 'aiReflectionStatus' | 'aiReflectionError'>>
): Promise<void> {
  const store = await readStore();
  const list = store[conversationId];
  if (!Array.isArray(list)) return;
  const i = list.findIndex((e) => e.id === entryId);
  if (i < 0) return;
  const nextList = [...list];
  nextList[i] = { ...nextList[i], ...patch };
  store[conversationId] = nextList;
  await writeStore(store);
  notifyEditCalibrationUpdated(conversationId);
}

function isRole(r: unknown): r is 'user' | 'assistant' {
  return r === 'user' || r === 'assistant';
}

function sanitizeImportedEntry(row: unknown): EditCalibrationEntry | null {
  if (!row || typeof row !== 'object') return null;
  const o = row as Record<string, unknown>;
  const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : '';
  const messageId = typeof o.messageId === 'string' && o.messageId.trim() ? o.messageId.trim() : '';
  if (!id || !messageId) return null;
  if (!isRole(o.role)) return null;
  const createdAt = typeof o.createdAt === 'number' && Number.isFinite(o.createdAt) ? o.createdAt : Date.now();
  const status = o.aiReflectionStatus;
  const aiReflectionStatus: EditCalibrationEntry['aiReflectionStatus'] =
    status === 'pending' || status === 'ok' || status === 'error' ? status : 'ok';
  return {
    id,
    messageId,
    role: o.role,
    baselineContent: clip(String(o.baselineContent ?? ''), CLIP),
    revisedContent: clip(String(o.revisedContent ?? ''), CLIP),
    createdAt,
    aiReflection: o.aiReflection != null ? String(o.aiReflection) : undefined,
    aiReflectionStatus,
    aiReflectionError: o.aiReflectionError != null ? String(o.aiReflectionError) : undefined,
  };
}

/** 角色迁移导入：写入新会话 id 下的整桶（不改动其它会话） */
export async function importEditCalibrationBucketForCharacterMigration(
  conversationId: string,
  rawEntries: unknown
): Promise<number> {
  if (!Array.isArray(rawEntries) || rawEntries.length === 0) return 0;
  const cleaned = rawEntries.map(sanitizeImportedEntry).filter(Boolean) as EditCalibrationEntry[];
  if (cleaned.length === 0) return 0;
  cleaned.sort((a, b) => b.createdAt - a.createdAt);
  const store = await readStore();
  store[conversationId] = cleaned.slice(0, MAX_ENTRIES_PER_CONVERSATION);
  await writeStore(store);
  notifyEditCalibrationUpdated(conversationId);
  return store[conversationId].length;
}

export async function clearEditCalibrationForConversation(conversationId: string): Promise<void> {
  const store = await readStore();
  if (store[conversationId]) {
    delete store[conversationId];
    await writeStore(store);
  }
  await clearLanguageStyleProfileForConversation(conversationId);
  notifyEditCalibrationUpdated(conversationId);
}
