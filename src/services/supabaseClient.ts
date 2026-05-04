import { createClient } from '@supabase/supabase-js';

export interface CloudSyncSettings {
  enabled: boolean;
  url: string;
  anonKey: string;
}

export interface CloudSyncRuntimeState {
  lastSuccessfulSyncAt: number | null;
}

const CLOUD_SYNC_STORAGE_KEY = 'cloudSyncSettings';
const CLOUD_SYNC_RUNTIME_KEY = 'cloudSyncRuntimeState';

const envSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
const envSupabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';

function normalizeCloudSyncSettings(value: Partial<CloudSyncSettings> | null | undefined): CloudSyncSettings {
  return {
    enabled: Boolean(value?.enabled),
    url: String(value?.url ?? '').trim(),
    anonKey: String(value?.anonKey ?? '').trim(),
  };
}

function readCloudSyncSettingsFromStorage(): CloudSyncSettings {
  if (typeof window === 'undefined') {
    return normalizeCloudSyncSettings({
      enabled: Boolean(envSupabaseUrl && envSupabaseAnonKey),
      url: envSupabaseUrl,
      anonKey: envSupabaseAnonKey,
    });
  }
  const raw = window.localStorage.getItem(CLOUD_SYNC_STORAGE_KEY);
  if (!raw) {
    return normalizeCloudSyncSettings({
      enabled: Boolean(envSupabaseUrl && envSupabaseAnonKey),
      url: envSupabaseUrl,
      anonKey: envSupabaseAnonKey,
    });
  }
  try {
    return normalizeCloudSyncSettings(JSON.parse(raw) as Partial<CloudSyncSettings>);
  } catch {
    return normalizeCloudSyncSettings({
      enabled: false,
      url: '',
      anonKey: '',
    });
  }
}

let cachedSettings: CloudSyncSettings = readCloudSyncSettingsFromStorage();
let cachedSignature = '';
let cachedClient: ReturnType<typeof createClient> | null = null;

function buildClientSignature(settings: CloudSyncSettings): string {
  return `${settings.enabled ? '1' : '0'}|${settings.url}|${settings.anonKey}`;
}

export function getCloudSyncSettings(): CloudSyncSettings {
  return { ...cachedSettings };
}

export function saveCloudSyncSettings(settings: CloudSyncSettings): void {
  cachedSettings = normalizeCloudSyncSettings(settings);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CLOUD_SYNC_STORAGE_KEY, JSON.stringify(cachedSettings));
  }
  cachedClient = null;
  cachedSignature = '';
}

export function isCloudSyncEnabled(): boolean {
  const settings = getCloudSyncSettings();
  return settings.enabled && Boolean(settings.url && settings.anonKey);
}

export function getSupabaseClient() {
  const settings = getCloudSyncSettings();
  if (!settings.enabled || !settings.url || !settings.anonKey) return null;
  const signature = buildClientSignature(settings);
  if (cachedClient && cachedSignature === signature) return cachedClient;
  cachedClient = createClient(settings.url, settings.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  cachedSignature = signature;
  return cachedClient;
}

export function requireSupabaseClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured or disabled.');
  }
  return client;
}

function readCloudSyncRuntimeState(): CloudSyncRuntimeState {
  if (typeof window === 'undefined') {
    return { lastSuccessfulSyncAt: null };
  }
  const raw = window.localStorage.getItem(CLOUD_SYNC_RUNTIME_KEY);
  if (!raw) return { lastSuccessfulSyncAt: null };
  try {
    const parsed = JSON.parse(raw) as Partial<CloudSyncRuntimeState>;
    return {
      lastSuccessfulSyncAt:
        typeof parsed.lastSuccessfulSyncAt === 'number' ? parsed.lastSuccessfulSyncAt : null,
    };
  } catch {
    return { lastSuccessfulSyncAt: null };
  }
}

export function getCloudSyncRuntimeState(): CloudSyncRuntimeState {
  return readCloudSyncRuntimeState();
}

export function markCloudSyncSuccess(timestamp = Date.now()): void {
  if (typeof window === 'undefined') return;
  const next: CloudSyncRuntimeState = { lastSuccessfulSyncAt: timestamp };
  window.localStorage.setItem(CLOUD_SYNC_RUNTIME_KEY, JSON.stringify(next));
}

