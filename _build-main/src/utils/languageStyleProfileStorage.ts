import type { Conversation, LanguageStyleProfileDoc } from '../types';
import { load, save } from './storage';
import { notifyEditCalibrationStudioUpdated } from './editCalibrationStudioEvents';

const STORAGE_KEY = 'momoyu_language_style_profile_v1';
const MAX_TEXT_LEN = 3600;

type Store = Record<string, LanguageStyleProfileDoc>;

function clipText(s: string): string {
  const t = (s || '').trim();
  if (t.length <= MAX_TEXT_LEN) return t;
  return `${t.slice(0, MAX_TEXT_LEN)}\n…（已截断）`;
}

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

export async function loadLanguageStyleProfileDoc(
  conversationId: string
): Promise<LanguageStyleProfileDoc | null> {
  const store = await readStore();
  const doc = store[conversationId];
  if (!doc || typeof doc.text !== 'string') return null;
  return { ...doc, text: doc.text.trim() };
}

export async function saveLanguageStyleProfileDoc(
  conversationId: string,
  doc: LanguageStyleProfileDoc
): Promise<void> {
  const store = await readStore();
  store[conversationId] = {
    text: clipText(doc.text),
    version: Math.max(0, Math.floor(doc.version)),
    updatedAt: doc.updatedAt,
  };
  await writeStore(store);
  notifyEditCalibrationStudioUpdated(conversationId);
}

export async function clearLanguageStyleProfileForConversation(conversationId: string): Promise<void> {
  const store = await readStore();
  if (!store[conversationId]) return;
  delete store[conversationId];
  await writeStore(store);
}

function sanitizeLanguageStyleProfileDoc(raw: unknown): LanguageStyleProfileDoc | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const text = String(o.text ?? '').trim();
  if (!text) return null;
  const version =
    typeof o.version === 'number' && Number.isFinite(o.version) ? Math.max(0, Math.floor(o.version)) : 1;
  const updatedAt =
    typeof o.updatedAt === 'number' && Number.isFinite(o.updatedAt) ? o.updatedAt : Date.now();
  return { text, version, updatedAt };
}

/** 角色迁移导入：写入新会话 id（仅当包内有有效正文） */
export async function importLanguageStyleProfileForCharacterMigration(
  conversationId: string,
  raw: unknown
): Promise<boolean> {
  const doc = sanitizeLanguageStyleProfileDoc(raw);
  if (!doc) return false;
  await saveLanguageStyleProfileDoc(conversationId, doc);
  return true;
}

/** 私聊生成侧注入：有内容才返回块 */
export async function loadPrivateLanguageStyleProfilePromptBlock(
  conversation: Conversation
): Promise<string> {
  if (conversation.type !== 'private') return '';
  const doc = await loadLanguageStyleProfileDoc(conversation.id);
  const t = (doc?.text || '').trim();
  if (!t) return '';
  return `\n\n【用户语言风格画像（来自编辑校对积累，高优先级）】
以下由系统根据你对消息的手动修订逐步合并而成，描述用户偏好的称呼、语气、信息密度与想避免的表达；与动态记忆画像独立，不替代事实类记忆。若与当前气泡正文冲突，以正文为准。
${t}\n`;
}
