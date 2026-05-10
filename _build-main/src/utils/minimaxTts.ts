import type { ApiConfig, CharacterTtsSettings, MinimaxTtsApiConfig, MinimaxTtsRegionPreset } from '../types';

function voiceModifyPayload(vm?: CharacterTtsSettings['voiceModify']): Record<string, unknown> | null {
  if (!vm) return null;
  const out: Record<string, unknown> = {};
  if (vm.pitch !== undefined && Number.isFinite(vm.pitch)) out.pitch = vm.pitch;
  if (vm.intensity !== undefined && Number.isFinite(vm.intensity)) out.intensity = vm.intensity;
  if (vm.timbre !== undefined && Number.isFinite(vm.timbre)) out.timbre = vm.timbre;
  const fx = (vm.soundEffects || '').trim();
  if (fx) out.sound_effects = fx;
  return Object.keys(out).length ? out : null;
}

const DEFAULT_MODEL = 'speech-2.8-hd';

function trimOrigin(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/**
 * 用户常把「控制台网页」或 http 误填为 API 根地址，预检遇 302 会报
 * "Redirect is not allowed for a preflight request"。此处统一纠正为官方 API 主机并强制 https。
 */
export function normalizeMinimaxTtsCustomBaseUrl(raw: string): string {
  let s = raw.trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) {
    s = `https://${s}`;
  }
  s = s.replace(/^http:\/\//i, 'https://');
  try {
    const u = new URL(s);
    u.protocol = 'https:';
    u.hash = '';
    const host = u.hostname.toLowerCase();
    const hostToApi: Record<string, string> = {
      'platform.minimaxi.com': 'api.minimaxi.com',
      'www.platform.minimaxi.com': 'api.minimaxi.com',
      'platform.minimax.io': 'api.minimax.io',
      'www.platform.minimax.io': 'api.minimax.io',
    };
    if (hostToApi[host]) {
      u.hostname = hostToApi[host];
    }
    const path = u.pathname.replace(/\/+$/, '') || '';
    return path ? `${u.origin}${path}` : u.origin;
  } catch {
    return s.replace(/^http:\/\//i, 'https://');
  }
}

/** 未填 baseUrl 时，由「国际 / 国内」线路决定的官方 API 根（不含路径） */
export function minimaxTtsPresetOrigin(preset: MinimaxTtsRegionPreset | undefined): string {
  return (preset ?? 'international') === 'china' ? 'https://api.minimaxi.com' : 'https://api.minimax.io';
}

export function resolveMinimaxTtsOrigin(cfg: MinimaxTtsApiConfig): string {
  const custom = (cfg.baseUrl || '').trim();
  if (custom) return trimOrigin(normalizeMinimaxTtsCustomBaseUrl(custom));
  return minimaxTtsPresetOrigin(cfg.regionPreset);
}

/** 若用户填了完整路径（含 t2a），则直接使用并追加 GroupId */
export function buildMinimaxTtsRequestUrl(origin: string, groupId: string): string {
  const base = trimOrigin(origin);
  const path = /t2a/i.test(base) ? base : `${base}/v1/t2a_v2`;
  const join = path.includes('?') ? '&' : '?';
  return `${path}${join}GroupId=${encodeURIComponent(groupId)}`;
}

function hexToUint8Array(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, '');
  if (clean.length % 2 !== 0) {
    throw new Error('Invalid audio hex payload');
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** MiniMax T2A 停顿时长标记：<#秒数#>，官方约 0.01～99.99 秒 */
const MINIMAX_PAUSE_TAG_RE = /<#(\d+(?:\.\d+)?)#>/g;
const MINIMAX_PAUSE_TOKEN_PREFIX = '__MM_TTS_PAUSE_';

function clampMinimaxPauseSecondsForTag(secStr: string): string {
  const n = parseFloat(secStr);
  if (!Number.isFinite(n)) return '0.5';
  const v = Math.min(99.99, Math.max(0.01, Math.round(n * 100) / 100));
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

/**
 * 从气泡正文提取适合合成的文本：去掉简单 HTML，但保留 MiniMax 停顿标记 `<#x#>`。
 * （否则 `<[^>]+>` 会把 `<#0.5#>` 当成标签删掉。）
 */
export function plainTextForMinimaxTts(raw: string): string {
  let s = raw.replace(/\r/g, '').trim();
  if (!s) return '';

  const pauseTags: string[] = [];
  s = s.replace(MINIMAX_PAUSE_TAG_RE, (_full, sec: string) => {
    const tag = `<#${clampMinimaxPauseSecondsForTag(String(sec))}#>`;
    pauseTags.push(tag);
    return `${MINIMAX_PAUSE_TOKEN_PREFIX}${pauseTags.length - 1}__`;
  });

  if (/<[a-z!/]/i.test(s)) {
    s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ');
    s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ');
    s = s.replace(/<[^>]+>/g, ' ');
  }

  s = s.replace(new RegExp(`${MINIMAX_PAUSE_TOKEN_PREFIX}(\\d+)__`, 'g'), (_, idx: string) => {
    return pauseTags[Number(idx)] ?? '';
  });

  return s.replace(/\s+/g, ' ').trim();
}

export function clampTtsSpeed(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(2, Math.max(0.5, Math.round(n * 1000) / 1000));
}

export function clampTtsVol(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(10, Math.max(0.01, Math.round(n * 1000) / 1000));
}

export function clampTtsPitch(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(12, Math.max(-12, Math.round(n)));
}

/** voice_setting.pitch：与调试台一致时不做窄范围截断，仅保证为有限数字 */
export function normalizeVoiceSettingPitch(n: number | undefined): number {
  if (n === undefined || !Number.isFinite(n)) return 0;
  return n;
}

/** 与调试台 JSON 常见结构对齐的基础字段（空发音词典、关闭字幕） */
const T2A_BODY_EXTRAS = {
  pronunciation_dict: { tone: [] as string[] },
  subtitle_enable: false,
} as const;

export type MinimaxTtsSynthesizeParams = {
  api: MinimaxTtsApiConfig;
  character?: CharacterTtsSettings;
  text: string;
};

export async function synthesizeMinimaxTtsToBlob(params: MinimaxTtsSynthesizeParams): Promise<Blob> {
  const { api, character, text } = params;
  const key = (api.apiKey || '').trim();
  const groupId = (api.groupId || '').trim();
  if (!key) throw new Error('未配置 MiniMax API Key');
  if (!groupId) throw new Error('未配置 MiniMax Group ID');

  const normalized = plainTextForMinimaxTts(text);
  const payloadText = normalized.length > 12000 ? `${normalized.slice(0, 11997)}…` : normalized;
  if (!payloadText.trim()) throw new Error('没有可朗读的正文');

  const origin = resolveMinimaxTtsOrigin(api);
  const url = buildMinimaxTtsRequestUrl(origin, groupId);
  const model = (api.model || '').trim() || DEFAULT_MODEL;
  const voiceId = (character?.voiceId || '').trim();
  if (!voiceId) {
    throw new Error('未配置音色 voice_id：请在角色设置 → 高级 → 朗读语音中填写克隆音色 ID');
  }

  const speed = clampTtsSpeed(character?.speed ?? 1);
  const vol = clampTtsVol(character?.vol ?? 1);
  const pitch = normalizeVoiceSettingPitch(character?.pitch);
  const languageBoost = (character?.languageBoost || 'auto').trim() || 'auto';

  const body: Record<string, unknown> = {
    model,
    text: payloadText,
    stream: false,
    language_boost: languageBoost,
    output_format: 'hex',
    voice_setting: {
      voice_id: voiceId,
      speed,
      vol,
      pitch,
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: 'mp3',
      channel: 1,
    },
    ...T2A_BODY_EXTRAS,
  };

  const vm = voiceModifyPayload(character?.voiceModify);
  if (vm) body.voice_modify = vm;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body as object),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/failed to fetch|load failed|networkerror|network error/i.test(msg)) {
      throw new Error(
        '网络请求失败（多为 CORS 或域名错误）。请使用 API 根地址如 https://api.minimaxi.com 或 https://api.minimax.io，勿填控制台网页 platform…；并尽量使用 https。若仍失败，需在网关为当前站点配置 CORS 或使用同源代理。',
      );
    }
    throw e;
  }

  const json = (await res.json()) as {
    data?: { audio?: string; status?: number };
    base_resp?: { status_code?: number; status_msg?: string };
  };

  if (!res.ok) {
    const msg = json.base_resp?.status_msg || res.statusText || 'HTTP error';
    throw new Error(`语音合成失败：${msg}`);
  }

  const code = json.base_resp?.status_code;
  if (code !== undefined && code !== 0) {
    throw new Error(json.base_resp?.status_msg || `语音合成失败（${code}）`);
  }

  const hex = json.data?.audio;
  if (!hex || typeof hex !== 'string') {
    throw new Error('响应中无音频数据');
  }

  const bytes = hexToUint8Array(hex);
  return new Blob([Uint8Array.from(bytes)], { type: 'audio/mpeg' });
}

/** 聊天助手语音条合成：与试听一致，仅需已保存的 Key + Group ID（不读 minimaxTts.enabled） */
export function isMinimaxTtsReady(apiConfig: ApiConfig): boolean {
  return isMinimaxTtsCredentialsReady(apiConfig);
}

/** 角色页试听 / 与 isMinimaxTtsReady 条件相同：Key + Group ID 齐全 */
export function isMinimaxTtsCredentialsReady(apiConfig: ApiConfig): boolean {
  const t = apiConfig.minimaxTts;
  return !!((t?.apiKey || '').trim() && (t?.groupId || '').trim());
}

/** 合成/试听需要角色侧已填 voice_id（不设全局默认音色） */
export function isCharacterTtsVoiceConfigured(character?: CharacterTtsSettings | null): boolean {
  return !!((character?.voiceId || '').trim());
}
