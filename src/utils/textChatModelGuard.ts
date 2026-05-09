import type { ApiConfig } from '../types';

/** 识图走独立网关：单独 Base，或与主 Key 不同的单独 Key（与 pickOpenAiCompatibleEndpoint 一致） */
export function hasDedicatedVisionApiLine(apiConfig: ApiConfig): boolean {
  const vb = String(apiConfig.visionBaseUrl || '').trim();
  const vk = String(apiConfig.visionApiKey || '').trim();
  const mk = String(apiConfig.apiKey || '').trim();
  return Boolean(vb) || (Boolean(vk) && vk !== mk);
}

/**
 * 纯文本 completions 走主线路 + 主 Key；不得把「仅视觉网关可用的模型 ID」误当文字模型打到主站。
 * 当独立视觉已配置且当前文本侧请求的 model 与 `visionModelName` 相同时，回落全局 `modelName`。
 */
export function resolveTextChatModelAvoidingVisionOnlyModelClash(
  apiConfig: ApiConfig,
  textChatModel: string
): string {
  const visionId = String(apiConfig.visionModelName || '').trim();
  const requested = String(textChatModel || apiConfig.modelName || '').trim();
  if (!visionId || !requested || requested !== visionId) return requested;
  if (!hasDedicatedVisionApiLine(apiConfig)) return requested;

  const primary = String(apiConfig.modelName || '').trim();
  if (primary && primary !== visionId) return primary;
  return requested;
}
