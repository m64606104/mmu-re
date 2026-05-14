import type { ApiConfig } from '../../types';
import { buildApiUrl } from '../../utils/apiHelper';
import { resolveVisionImageRecognitionApiConfig } from '../../utils/chatApiConfig';
import { resolveTextChatModelAvoidingVisionOnlyModelClash } from '../../utils/textChatModelGuard';

export type OpenAiCompatibleCompletionRouting = {
  model: string;
  apiUrl: string;
  bearerToken: string;
};

/**
 * 附图 / 纯文本 completions：默认走主接口 + 当前对话模型；若启用独立识图且请求含 image_url，则在 conversationResolvedConfig 上合并识图线路。
 */
export function resolveOpenAiCompatibleCompletionRouting(
  apiConfig: ApiConfig,
  options: {
    requestContainsImageUrl: boolean;
    textChatModel: string;
    /** 已含角色/群单独模型等的配置；未传时退回主 apiConfig + textChatModel */
    conversationResolvedConfig?: ApiConfig;
  }
): OpenAiCompatibleCompletionRouting {
  const mergedBase: ApiConfig =
    options.conversationResolvedConfig ||
    ({
      ...apiConfig,
      modelName: String(options.textChatModel || apiConfig.modelName || '').trim(),
    } as ApiConfig);

  const endpointCfg = options.requestContainsImageUrl
    ? resolveVisionImageRecognitionApiConfig(apiConfig, mergedBase)
    : mergedBase;

  const textModel = resolveTextChatModelAvoidingVisionOnlyModelClash(
    apiConfig,
    String((endpointCfg.modelName || options.textChatModel || apiConfig.modelName || '').trim()),
  );
  const mainBase = (endpointCfg.baseUrl || '').trim();
  const mainKey = (endpointCfg.apiKey || '').trim();
  return {
    model: textModel,
    apiUrl: buildApiUrl({ ...apiConfig, baseUrl: mainBase, apiKey: mainKey, modelName: textModel }),
    bearerToken: mainKey,
  };
}

/** 头像识图等多模态旁路：若启用独立识图则走该线路，否则主接口 + 主模型。 */
export function resolveVisionImageChatEndpoint(apiConfig: ApiConfig): OpenAiCompatibleCompletionRouting | null {
  const merged = resolveVisionImageRecognitionApiConfig(apiConfig, apiConfig);
  const modelRaw = String(merged.modelName || '').trim();
  if (!modelRaw) return null;
  const textModel = resolveTextChatModelAvoidingVisionOnlyModelClash(apiConfig, modelRaw);
  const mainBase = (merged.baseUrl || '').trim();
  const mainKey = (merged.apiKey || '').trim();
  const apiUrl = buildApiUrl({ ...apiConfig, baseUrl: mainBase, apiKey: mainKey, modelName: textModel });
  if (!apiUrl) return null;
  return { model: textModel, apiUrl, bearerToken: mainKey };
}
