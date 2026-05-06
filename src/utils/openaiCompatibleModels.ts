/** OpenAI-compatible `/v1/models` listing */
export async function fetchOpenAiCompatibleModelIds(baseUrl: string, apiKey: string): Promise<string[]> {
  const root = baseUrl.trim().replace(/\/+$/, '');
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
