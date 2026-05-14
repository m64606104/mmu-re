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

function buildChatCompletionsUrlFromRoot(root: string): string {
  const r = root.replace(/\/+$/, '');
  if (/\/v1$/i.test(r)) return `${r}/chat/completions`;
  return `${r}/v1/chat/completions`;
}

/** 将浏览器/网关的常见失败转成人话（无法替代服务端修 TLS/CORS） */
export function formatOpenAiCompatibleFetchFailure(err: unknown): string {
  const name = err instanceof Error ? (err.name || '') : '';
  const msg = err instanceof Error ? (err.message || '').trim() : typeof err === 'string' ? err.trim() : String(err ?? '').trim();
  const lower = `${name} ${msg}`.toLowerCase();

  // Safari 常见：TypeError + "Load failed" 或空 message；控制台另打「TLS」「access control」
  if (
    /access control|failed to fetch|load failed|cors|networkerror|not allowed by access-control|network.*load|fetch.*load/i.test(
      lower
    ) ||
    /网络连接已中断|无法连接|连接.*失败/i.test(msg)
  ) {
    return (
      '无法连接 API：多为 **TLS 证书不被信任** 或 **CORS 未放行当前页面域名**（与「拼 URL」无关；Base 填 https://www.tudou.chat 即可，应用会自动接 /v1/models 与 /v1/chat/completions）。' +
      '请用本机 Safari 直接打开同一域名看证书锁标；并在网关上为你的 Momoyu 部署来源（Origin）配置 CORS（含 OPTIONS），或改用同源反向代理。'
    );
  }
  if (/tls|ssl|证书|certificate|secure|crypto|handshake|安全连接|加密连接/i.test(lower) || /安全连接/.test(msg)) {
    return 'TLS/HTTPS 握手失败（证书链、过期、域名不匹配，或本机/网络中间人）。请用系统浏览器直接打开同一 Base 的 https 地址检查证书，或更换网络。';
  }
  if (/aborted|timeout|timed out|超时/i.test(lower)) {
    return '请求超时或被中断，请检查网络与代理。';
  }
  if (!msg) {
    return '连接失败（浏览器未给出详细原因）。多见于 TLS 或跨域被拦截，请检查证书与网关 CORS。';
  }
  return msg;
}

/**
 * 用最小 POST 探测聊天接口是否可达（部分网关 GET /models 与 POST /chat 的 CORS/TLS 策略不一致）。
 */
export async function probeOpenAiCompatibleChatMinimal(
  baseUrl: string,
  apiKey: string,
  modelName?: string
): Promise<{ reachable: boolean; status?: number; detail?: string }> {
  const root = normalizeOpenAiCompatibleBaseUrlForModelsList(baseUrl.trim());
  if (!root) return { reachable: false, detail: 'Base URL 为空' };
  const url = buildChatCompletionsUrlFromRoot(root);
  const model = (modelName || '').trim() || 'gpt-3.5-turbo';
  const controller = new AbortController();
  const to = window.setTimeout(() => controller.abort(), 18_000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: '.' }],
        max_tokens: 1,
        temperature: 0,
      }),
    });
    if (res.ok) return { reachable: true, status: res.status };
    const text = await res.text().catch(() => '');
    const snippet = text.slice(0, 280);
    const reachable =
      res.status === 400 ||
      res.status === 401 ||
      res.status === 403 ||
      res.status === 404 ||
      res.status === 422 ||
      res.status === 429;
    return { reachable, status: res.status, detail: snippet || undefined };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return { reachable: false, detail };
  } finally {
    window.clearTimeout(to);
  }
}

export type FetchOpenAiModelIdsDiagnostics = {
  models: string[];
  /** 模型列表拉不到，但聊天 POST 可达：可手填模型 ID */
  warning?: string;
  /** 列表与探测均失败 */
  error?: string;
};

/**
 * 先 GET /v1/models；失败时再探测 POST /v1/chat/completions，区分「仅列表被拦」与「整站不可达」。
 */
export async function fetchOpenAiCompatibleModelIdsWithDiagnostics(
  baseUrl: string,
  apiKey: string,
  options?: { modelForChatProbe?: string }
): Promise<FetchOpenAiModelIdsDiagnostics> {
  try {
    const models = await fetchOpenAiCompatibleModelIds(baseUrl, apiKey);
    return { models };
  } catch (e) {
    const formatted = formatOpenAiCompatibleFetchFailure(e);
    const probe = await probeOpenAiCompatibleChatMinimal(baseUrl, apiKey, options?.modelForChatProbe);
    if (probe.reachable) {
      return {
        models: [],
        warning: `无法拉取模型列表（${formatted}）但聊天接口有响应（HTTP ${probe.status ?? '?'}）。请在「模型」中手动填写模型 ID；若需要下拉列表，请在网关为 GET /v1/models 放行 CORS 并修复 TLS。`,
      };
    }
    const tail = probe.detail ? ` 聊天探测：${probe.detail}` : '';
    return { models: [], error: `${formatted}${tail}` };
  }
}

/** OpenAI-compatible `/v1/models` listing */
export async function fetchOpenAiCompatibleModelIds(baseUrl: string, apiKey: string): Promise<string[]> {
  const root = normalizeOpenAiCompatibleBaseUrlForModelsList(baseUrl.trim());
  if (!root) {
    throw new Error('Base URL 为空');
  }
  let response: Response;
  try {
    response = await fetch(`${root}/v1/models`, {
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
      },
    });
  } catch (e) {
    throw new Error(formatOpenAiCompatibleFetchFailure(e));
  }
  if (!response.ok) {
    const snippet = await response.text().catch(() => '');
    throw new Error(`models 接口请求失败: HTTP ${response.status} ${snippet.slice(0, 200)}`);
  }
  let data: { data?: Array<{ id?: string }> };
  try {
    data = (await response.json()) as { data?: Array<{ id?: string }> };
  } catch {
    throw new Error('models 接口返回的不是合法 JSON');
  }
  const ids = (data.data || []).map((m) => m.id).filter((id): id is string => Boolean(id && String(id).trim()));
  return ids;
}
