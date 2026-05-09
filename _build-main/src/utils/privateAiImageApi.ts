import type { ApiConfig, PrivateAiImageGenerationConfig } from '../types';

export function normalizeBaseUrlToOpenAiImageGenerationsEndpoint(baseUrlRaw: string): string {
  let baseUrl = (baseUrlRaw || '').trim();
  if (!baseUrl) return '';
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
  baseUrl = baseUrl.replace(/\/(v1\/)?chat\/completions\/?$/i, '');
  baseUrl = baseUrl.replace(/\/(v1\/)?images\/generations\/?$/i, '');
  if (/\/v1$/i.test(baseUrl)) return `${baseUrl}/images/generations`;
  return `${baseUrl}/v1/images/generations`;
}

export function resolvePrivateAiImageApiCredentials(api: ApiConfig): {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
  dailyMaxPerConversation: number;
  size: string;
} {
  const c = api.privateAiImageGeneration as PrivateAiImageGenerationConfig | undefined;
  const enabled = Boolean(c?.enabled);
  const baseUrl = ((c?.baseUrl || '').trim() || (api.baseUrl || '').trim()).replace(/\/$/, '');
  const apiKey = ((c?.apiKey || '').trim() || (api.apiKey || '').trim());
  const model = (c?.model || '').trim();
  const rawMax = c?.dailyMaxPerConversation;
  const dailyMaxPerConversation =
    rawMax === undefined || rawMax === null ? 8 : Math.max(0, Math.floor(Number(rawMax)) || 0);
  const size = (c?.size || '').trim() || '1024x1024';
  return { enabled, baseUrl, apiKey, model, dailyMaxPerConversation, size };
}

/**
 * 调用 OpenAI 兼容 images/generations，返回可写入消息气泡的 data URL 或 https URL。
 */
export async function generatePrivateAiImageMediaUrl(options: {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  size?: string;
}): Promise<string> {
  const endpoint = normalizeBaseUrlToOpenAiImageGenerationsEndpoint(options.baseUrl);
  if (!endpoint || !options.apiKey?.trim() || !options.model?.trim()) {
    throw new Error('生图接口未完整配置');
  }

  const body: Record<string, unknown> = {
    model: options.model.trim(),
    prompt: options.prompt.trim(),
    n: 1,
  };
  if (options.size) body.size = options.size;

  const tryOnce = async (withB64: boolean) => {
    const b = { ...body };
    if (withB64) b.response_format = 'b64_json';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey.trim()}`,
        'X-Momoyu-Source': 'privateAiImage:generations',
      },
      body: JSON.stringify(b),
    });
    const rawText = await res.text();
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }
    if (!res.ok) {
      const msg =
        (data && (data.error?.message || data.message)) ||
        rawText.slice(0, 200) ||
        `${res.status}`;
      throw new Error(msg);
    }
    const d0 = data?.data?.[0];
    if (d0?.b64_json && typeof d0.b64_json === 'string') {
      return `data:image/png;base64,${d0.b64_json}`;
    }
    if (d0?.url && typeof d0.url === 'string') return d0.url;
    throw new Error('生图响应中无图片数据');
  };

  try {
    return await tryOnce(true);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/response_format|b64|unsupported|unknown parameter/i.test(msg)) {
      return await tryOnce(false);
    }
    throw e;
  }
}
