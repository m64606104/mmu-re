import type { ApiConfig } from '../../types';
import { buildApiUrl } from '../../utils/apiHelper';
import { resolveTextChatModelAvoidingVisionOnlyModelClash } from '../../utils/textChatModelGuard';

export type OpenAiCompatibleCompletionRouting = {
  model: string;
  apiUrl: string;
  bearerToken: string;
};

/**
 * 附图 / 纯文本 completions：统一走主接口 Base URL、主 Key、当前对话模型（与 demo 一致：一个模型解析一切）。
 */
export function resolveOpenAiCompatibleCompletionRouting(
  apiConfig: ApiConfig,
  options: {
    requestContainsImageUrl: boolean;
    textChatModel: string;
  }
): OpenAiCompatibleCompletionRouting {
  void options.requestContainsImageUrl;
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

/** 头像识图等多模态旁路：与聊天同源，仅用全局主模型 + 主接口。 */
export function resolveVisionImageChatEndpoint(apiConfig: ApiConfig): OpenAiCompatibleCompletionRouting | null {
  const model = String(apiConfig.modelName || '').trim();
  if (!model) return null;
  const mainBase = (apiConfig.baseUrl || '').trim();
  const mainKey = (apiConfig.apiKey || '').trim();
  const apiUrl = buildApiUrl({ ...apiConfig, baseUrl: mainBase, apiKey: mainKey, modelName: model });
  if (!apiUrl) return null;
  return { model, apiUrl, bearerToken: mainKey };
}
