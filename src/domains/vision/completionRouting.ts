import type { ApiConfig } from '../../types';
import { buildApiUrl } from '../../utils/apiHelper';
import { resolveTextChatModelAvoidingVisionOnlyModelClash } from '../../utils/textChatModelGuard';

export function isVisionModelConfigured(apiConfig: ApiConfig): boolean {
  return Boolean(String(apiConfig.visionModelName || '').trim());
}

export type OpenAiCompatibleCompletionRouting = {
  model: string;
  apiUrl: string;
  bearerToken: string;
};

/**
 * 解析 OpenAI 兼容 Chat Completions 的 Base URL / Key（用于附图 / 视觉模型线路）。
 * - 填了 **`visionBaseUrl`**：走该网关；`visionApiKey` 可空则回落主 Key。
 * - 未填独立 Base 但 **`visionApiKey` 与主 Key 不同**：走**主 Base + 识图 Key**（同域不同鉴权）。
 * - 否则与主接口完全一致。
 */
export function pickOpenAiCompatibleEndpoint(apiConfig: ApiConfig): { baseUrl: string; apiKey: string } {
  const mainBase = (apiConfig.baseUrl || '').trim();
  const mainKey = (apiConfig.apiKey || '').trim();
  const visionBase = (apiConfig.visionBaseUrl || '').trim();
  const visionKey = (apiConfig.visionApiKey || '').trim();
  if (visionBase) {
    return { baseUrl: visionBase, apiKey: visionKey || mainKey };
  }
  if (visionKey && visionKey !== mainKey) {
    return { baseUrl: mainBase, apiKey: visionKey };
  }
  return { baseUrl: mainBase, apiKey: mainKey };
}

/**
 * 在「视觉独立线路」上请求指定 model（与 ChatScreen 附图 + 设置里「单独视觉 API」一致）。
 */
function buildVisionLineRoutingForModel(
  apiConfig: ApiConfig,
  model: string
): OpenAiCompatibleCompletionRouting {
  const { baseUrl, apiKey } = pickOpenAiCompatibleEndpoint(apiConfig);
  let bearerToken = apiKey;
  let apiUrl = buildApiUrl({ ...apiConfig, baseUrl, apiKey, modelName: model });
  if (!apiUrl) {
    const fb = (apiConfig.baseUrl || '').trim();
    const fk = (apiConfig.apiKey || '').trim();
    apiUrl = buildApiUrl({ ...apiConfig, baseUrl: fb, apiKey: fk, modelName: model });
    bearerToken = fk;
  }
  return { model, apiUrl, bearerToken };
}

/**
 * 头像解析 / 换头像决策等多模态旁路：与附图 completions 同源。
 * - 模型：`visionModelName` 优先，否则回落主模型 `modelName`（与未单独配视觉模型时的主线路一致）。
 * - Base/Key：`pickOpenAiCompatibleEndpoint`（独立 Base 或独立 Key 与主 Key 不同时走识图线路）。
 */
export function resolveVisionImageChatEndpoint(apiConfig: ApiConfig): OpenAiCompatibleCompletionRouting | null {
  const model =
    String(apiConfig.visionModelName || '').trim() || String(apiConfig.modelName || '').trim();
  if (!model) return null;
  const routing = buildVisionLineRoutingForModel(apiConfig, model);
  return routing.apiUrl ? routing : null;
}

/**
 * 附图 / 纯文本 completions 路由：
 * - **含 image_url** 且填写了「视觉模型 ID」：`model` 用视觉模型；**线路**见 `pickOpenAiCompatibleEndpoint`（独立 Base、或与主 Key 不同的独立 Key）。
 * - **含 image_url** 且未填视觉模型：`model` 用当前对话模型（textChatModel），主接口。
 * - **纯文本**：始终当前对话模型 + 主接口。
 */
export function resolveOpenAiCompatibleCompletionRouting(
  apiConfig: ApiConfig,
  options: {
    /** 本请求 messages 中是否包含带 image_url 的 user 多模态内容 */
    requestContainsImageUrl: boolean;
    textChatModel: string;
  }
): OpenAiCompatibleCompletionRouting {
  const dedicatedVision = String(apiConfig.visionModelName || '').trim();

  if (options.requestContainsImageUrl && dedicatedVision) {
    return buildVisionLineRoutingForModel(apiConfig, dedicatedVision);
  }

  const textModel = resolveTextChatModelAvoidingVisionOnlyModelClash(
    apiConfig,
    String(options.textChatModel || apiConfig.modelName || '').trim()
  );
  const mainBase = (apiConfig.baseUrl || '').trim();
  const mainKey = (apiConfig.apiKey || '').trim();
  return {
    model: textModel,
    apiUrl: buildApiUrl({ ...apiConfig, baseUrl: mainBase, apiKey: mainKey, modelName: textModel }),
    bearerToken: mainKey,
  };
}
