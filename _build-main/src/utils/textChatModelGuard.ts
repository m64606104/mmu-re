import type { ApiConfig } from '../types';

/**
 * 解析当前请求应使用的对话模型 ID（角色/群覆盖后的结果）。
 * 曾与「独立视觉模型」做冲突消解；现视觉与主模型合一，仅做 trim / 回落全局。
 */
export function resolveTextChatModelAvoidingVisionOnlyModelClash(
  apiConfig: ApiConfig,
  textChatModel: string
): string {
  return String(textChatModel || apiConfig.modelName || '').trim();
}
