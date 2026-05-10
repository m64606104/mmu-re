import type { ApiConfig, Conversation } from '../types';
import { resolveTextChatModelAvoidingVisionOnlyModelClash } from './textChatModelGuard';

/**
 * 勾选「启用」后：Base URL、API Key、模型名逐项合并——该项留空则用主聊天的同一项；只有填了的才覆盖。
 * 未勾选「启用」则整条链路仍是主 apiConfig。
 */
export function resolveBackgroundChatApiConfig(
  apiConfig: ApiConfig,
  purpose: 'statusUpdate' | 'memorySummary',
): ApiConfig {
  const slot =
    purpose === 'statusUpdate'
      ? apiConfig.backgroundChatApis?.statusUpdate
      : apiConfig.backgroundChatApis?.memorySummary;
  if (!slot?.enabled) return apiConfig;

  const baseUrl = (slot.baseUrl || '').trim() || (apiConfig.baseUrl || '').trim();
  const apiKey = (slot.apiKey || '').trim() || (apiConfig.apiKey || '').trim();
  const modelName = (slot.modelName || '').trim() || (apiConfig.modelName || '').trim();
  return {
    ...apiConfig,
    baseUrl,
    apiKey,
    modelName,
  };
}

/**
 * 记忆引擎 JSON 调用的温度：勾选「独立记忆总结」且温度为有效数字时用滑块值，否则 0.3。
 */
export function resolveMemorySummaryAskJsonTemperature(apiConfig: ApiConfig): number {
  const slot = apiConfig.backgroundChatApis?.memorySummary;
  const t = slot?.temperature;
  if (slot?.enabled && typeof t === 'number' && Number.isFinite(t)) {
    return Math.min(2, Math.max(0, t));
  }
  return 0.3;
}

/**
 * 私聊：优先角色「单独配置模型」，否则全局（附图与文字共用该模型）。
 */
export function resolvePrivateChatApiConfig(apiConfig: ApiConfig, conversation: Conversation): ApiConfig {
  const o = conversation.characterSettings?.chatModelOverride?.trim();
  const base = (o || apiConfig.modelName || '').trim();
  const modelName = resolveTextChatModelAvoidingVisionOnlyModelClash(apiConfig, base);
  if (!o && modelName === String(apiConfig.modelName || '').trim()) return apiConfig;
  return { ...apiConfig, modelName };
}

/**
 * 群聊里某一 AI 发言：
 * 1) 若群设置了单独模型 → 全员本条链路使用该模型
 * 2) 否则若该成员角色设置了单独模型 → 使用该模型
 * 3) 否则全局
 */
export function resolveGroupParticipantApiConfig(
  apiConfig: ApiConfig,
  groupConversation: Conversation,
  aiMember: Conversation,
): ApiConfig {
  const groupO = groupConversation.groupChatModelOverride?.trim();
  const charO = aiMember.characterSettings?.chatModelOverride?.trim();
  const base = (groupO || charO || apiConfig.modelName || '').trim();
  const modelName = resolveTextChatModelAvoidingVisionOnlyModelClash(apiConfig, base);
  if (!groupO && !charO && modelName === String(apiConfig.modelName || '').trim()) return apiConfig;
  return { ...apiConfig, modelName };
}

/** 群聊记忆总结：先套「独立记忆 API」线路（若有），再应用群级单独模型名（若有） */
export function resolveGroupSummaryApiConfig(apiConfig: ApiConfig, groupConversation: Conversation): ApiConfig {
  const memBase = resolveBackgroundChatApiConfig(apiConfig, 'memorySummary');
  const groupO = groupConversation.groupChatModelOverride?.trim();
  const base = (groupO || memBase.modelName || '').trim();
  const modelName = resolveTextChatModelAvoidingVisionOnlyModelClash(apiConfig, base);
  return { ...memBase, modelName };
}
