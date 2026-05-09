/**
 * 将用户填写的 Base（可能含 /v1、/chat/completions、/images/generations）规范成
 * 只拼一次 `/v1/models` 的根前缀。
 */
export function normalizeOpenAiCompatibleBaseUrlForModelsList(baseUrlRaw: string): string {
  let u = (baseUrlRaw || '').trim().replace(/\/+$/, '');
  u = u.replace(/\/(v1\/)?chat\/completions$/i, '');
  u = u.replace(/\/(v1\/)?images\/generations$/i, '');
  u = u.replace(/\/v1$/i, '');
  return u.replace(/\/+$/, '');
}

/** OpenAI-compatible `/v1/models` listing */
export async function fetchOpenAiCompatibleModelIds(baseUrl: string, apiKey: string): Promise<string[]> {
  const root = normalizeOpenAiCompatibleBaseUrlForModelsList(baseUrl.trim());
  if (!root) {
    throw new Error('Base URL 为空');
  }
  const response = await fetch(`${root}/v1/models`, {
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
    },
  });
  if (!response.ok) {
    throw new Error(`models 接口请求失败: ${response.status}`);
  }
  const data = await response.json();
  return data.data?.map((m: { id?: string }) => m.id).filter(Boolean) || [];
}
