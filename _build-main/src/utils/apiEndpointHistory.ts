/**
 * 主聊天接口「Base URL + API Key + 模型」成套最近记录，便于一键切换（非浏览器分列 autocomplete）
 */

const STORAGE_KEY = 'api_endpoint_pair_history';
const MAX_ENTRIES = 20;
const SCHEMA_VERSION = 1 as const;

export type ApiEndpointPairEntry = {
  id: string;
  baseUrl: string;
  apiKey: string;
  modelName: string;
  usedAt: number;
};

type Stored = { v: typeof SCHEMA_VERSION; entries: ApiEndpointPairEntry[] };

function readRaw(): ApiEndpointPairEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as Stored;
    if (!p || p.v !== SCHEMA_VERSION || !Array.isArray(p.entries)) return [];
    return p.entries.filter(
      (e) =>
        e &&
        typeof e.id === 'string' &&
        typeof e.baseUrl === 'string' &&
        typeof e.apiKey === 'string' &&
        typeof e.modelName === 'string',
    );
  } catch {
    return [];
  }
}

function write(entries: ApiEndpointPairEntry[]): void {
  if (typeof window === 'undefined') return;
  const data: Stored = { v: SCHEMA_VERSION, entries: entries.slice(0, MAX_ENTRIES) };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function listApiEndpointPairHistory(): ApiEndpointPairEntry[] {
  return readRaw().sort((a, b) => b.usedAt - a.usedAt);
}

function dedupeKey(baseUrl: string, apiKey: string): string {
  return `${baseUrl.trim()}\n${apiKey.trim()}`;
}

/** 保存配置成功后写入；同一 URL+Key 会更新模型与时间并置顶 */
export function addApiEndpointPairSnapshot(params: {
  baseUrl: string;
  apiKey: string;
  modelName: string;
}): void {
  const baseUrl = params.baseUrl.trim();
  const apiKey = params.apiKey.trim();
  const modelName = (params.modelName || '').trim();
  if (!baseUrl || !apiKey || !modelName) return;

  const key = dedupeKey(baseUrl, apiKey);
  const now = Date.now();
  let entries = readRaw();
  const idx = entries.findIndex((e) => dedupeKey(e.baseUrl, e.apiKey) === key);
  if (idx >= 0) {
    const id = entries[idx].id;
    entries[idx] = { id, baseUrl, apiKey, modelName, usedAt: now };
  } else {
    entries.unshift({
      id: `${now}_${Math.random().toString(36).slice(2, 10)}`,
      baseUrl,
      apiKey,
      modelName,
      usedAt: now,
    });
  }
  entries.sort((a, b) => b.usedAt - a.usedAt);
  write(entries.slice(0, MAX_ENTRIES));
}

export function removeApiEndpointPair(id: string): void {
  write(readRaw().filter((e) => e.id !== id));
}

/** 列表展示用：主机名 + 模型 */
export function formatApiEndpointPairLabel(e: ApiEndpointPairEntry): string {
  let host = '';
  try {
    const normalized = /^https?:\/\//i.test(e.baseUrl) ? e.baseUrl : `https://${e.baseUrl}`;
    host = new URL(normalized).host;
  } catch {
    host = e.baseUrl.replace(/^https?:\/\//i, '').split('/')[0] || e.baseUrl;
  }
  const shortHost = host.length > 36 ? `${host.slice(0, 34)}…` : host;
  return `${shortHost} · ${e.modelName}`;
}
