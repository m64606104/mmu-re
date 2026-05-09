/**
 * 文本聊天模型 vs 视觉（image_url）模型分流：
 * - 启发式：网关返回的 /v1/models 列表通常不标明是否多模态，用语义规则先筛一遍；
 * - 探测：对「不确定」的模型用小图打 completions（与设置页「测试视觉」一致），后台批量验证。
 */

import { buildApiUrl } from './apiHelper';

const TINY_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9VE3h1wAAAAASUVORK5CYII=';

/** 明显不是对话模型：从「文本模型」下拉默认隐藏（仍可手动输入） */
export function isLikelyNonChatModel(modelId: string): boolean {
  const id = modelId.toLowerCase();
  return (
    id.includes('embedding') ||
    id.includes('embed') ||
    id.includes('text-embedding') ||
    id.includes('whisper') ||
    id.includes('tts') ||
    id.includes('speech') ||
    id.includes('dall-e') ||
    id.includes('dalle') ||
    id.includes('moderation') ||
    id.includes('babbage') ||
    id.includes('davinci-instruct') ||
    /\bada\b/.test(id)
  );
}

/** 高置信度：多半支持 image_url / 多模态（各家命名习惯） */
export function isLikelyVisionModel(modelId: string): boolean {
  const id = modelId.toLowerCase();

  if (isLikelyNonChatModel(modelId)) return false;

  const patterns = [
    '-vl',
    '-vl-',
    'vl-',
    '-vision',
    'vision-',
    'multimodal',
    'vllm',
    'gpt-4o',
    'gpt-4.1',
    'gpt-4.5',
    'gpt-5',
    'gpt-4-turbo',
    'gpt-4-vision',
    'gpt-4v',
    'claude-3',
    'claude-sonnet',
    'claude-opus',
    'gemini',
    'qwen-vl',
    'qwen2-vl',
    'qwen3-vl',
    'qvq',
    'glm-4v',
    'glm-4.5v',
    'glm-v',
    'internvl',
    'intern-vl',
    'yi-vl',
    'pixtral',
    'llava',
    'minicpm-v',
    'deepseek-vl',
    'moonshot-v',
    'step-1v',
    'step1v',
  ];

  for (const p of patterns) {
    if (id.includes(p)) return true;
  }
  if (/doubao.*vl/i.test(modelId)) return true;

  // OpenAI o 系列近期多为多模态；保守匹配 o + 数字
  if (/^o\d/i.test(modelId.trim()) || /[-/]o\d/i.test(id)) return true;

  return false;
}

/** 高置信度纯文本（不推荐出现在视觉列表；不排除误判） */
export function isLikelyTextOnlyChatModel(modelId: string): boolean {
  const id = modelId.toLowerCase();
  if (isLikelyNonChatModel(modelId)) return true;
  if (isLikelyVisionModel(modelId)) return false;

  const textish = [
    'gpt-3.5',
    'gpt-35',
    'gpt-3.5-turbo',
    'gpt-4-0613',
    'gpt-4-0314',
    'deepseek-chat',
    'deepseek-reasoner',
    'llama-3',
    'llama3',
    'mistral',
    'mixtral',
  ];
  if (textish.some((t) => id.includes(t))) return true;
  const t = modelId.trim();
  // 单独的 gpt-4（非 turbo/o）多数网关视为纯文本；gpt-4o / turbo 已由 vision 规则命中
  return (
    /^gpt-4$/i.test(t) ||
    (/^gpt-4-/i.test(t) && !id.includes('turbo') && !id.includes('vision'))
  );
}

export type VisionModelPartition = {
  /** 启发式认为支持视觉，直接进入视觉下拉 */
  heuristicVision: string[];
  /** 更像纯文本，默认不进视觉下拉（除非实测通过） */
  heuristicTextOnly: string[];
  /** 需用小图探测 */
  needsProbe: string[];
};

export function partitionModelsForVisionList(ids: string[]): VisionModelPartition {
  const seen = new Set<string>();
  const unique = ids.filter((id) => {
    const t = id.trim();
    if (!t || seen.has(t)) return false;
    seen.add(t);
    return true;
  });

  const heuristicVision: string[] = [];
  const heuristicTextOnly: string[] = [];
  const needsProbe: string[] = [];

  for (const id of unique) {
    if (isLikelyNonChatModel(id)) continue;
    if (isLikelyVisionModel(id)) heuristicVision.push(id);
    else if (isLikelyTextOnlyChatModel(id)) heuristicTextOnly.push(id);
    else needsProbe.push(id);
  }

  return { heuristicVision, heuristicTextOnly, needsProbe };
}

/** 单模型：是否接受 image_url（极小 PNG） */
export async function probeModelSupportsVision(
  baseUrl: string,
  apiKey: string,
  modelId: string,
  signal?: AbortSignal
): Promise<boolean> {
  const trimmedBase = baseUrl.trim();
  const trimmedKey = apiKey.trim();
  const model = modelId.trim();
  if (!trimmedBase || !trimmedKey || !model) return false;

  const apiUrl = buildApiUrl({ baseUrl: trimmedBase, apiKey: trimmedKey, modelName: model });
  if (!apiUrl) return false;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${trimmedKey}`,
        'X-Momoyu-Source': 'settings:vision-probe',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: '仅回复一个字：好' },
              { type: 'image_url', image_url: { url: TINY_PNG_DATA_URL } },
            ],
          },
        ],
        max_tokens: 8,
        temperature: 0,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 并发探测哪些模型真正支持 vision；返回通过的 model id 列表（顺序与输入不完全一致）
 */
export async function probeVisionModelsInBatches(
  baseUrl: string,
  apiKey: string,
  modelIds: string[],
  opts?: {
    concurrency?: number;
    signal?: AbortSignal;
    onProgress?: (done: number, total: number, lastId: string, ok: boolean) => void;
    /** 每验证通过一个支持视觉的模型时调用（便于下拉框逐项出现） */
    onVerified?: (modelId: string) => void;
    maxProbes?: number;
  }
): Promise<string[]> {
  const concurrency = Math.max(1, Math.min(8, opts?.concurrency ?? 4));
  const maxProbes = opts?.maxProbes ?? 8;
  const ids = [...new Set(modelIds.map((x) => x.trim()).filter(Boolean))].slice(0, maxProbes);

  const passed: string[] = [];
  let done = 0;
  const total = ids.length;

  async function worker(queue: string[]) {
    for (const id of queue) {
      if (opts?.signal?.aborted) break;
      const ok = await probeModelSupportsVision(baseUrl, apiKey, id, opts?.signal);
      done += 1;
      opts?.onProgress?.(done, total, id, ok);
      if (ok) {
        passed.push(id);
        opts?.onVerified?.(id);
      }
    }
  }

  const chunks: string[][] = Array.from({ length: concurrency }, () => []);
  ids.forEach((id, i) => chunks[i % concurrency].push(id));
  await Promise.all(chunks.map((c) => worker(c)));

  return passed;
}

/** 文本下拉：去掉 embedding 等非对话模型 */
export function filterLikelyChatModels(ids: string[]): string[] {
  const seen = new Set<string>();
  return ids.filter((id) => {
    const t = id.trim();
    if (!t || seen.has(t)) return false;
    seen.add(t);
    return !isLikelyNonChatModel(t);
  });
}
