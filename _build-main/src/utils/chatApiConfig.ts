import type { ApiConfig, Conversation } from '../types';
import { resolveTextChatModelAvoidingVisionOnlyModelClash } from './textChatModelGuard';

/**
 * 私聊：优先角色「单独配置模型」，否则全局。
 * 视觉相关字段始终使用全局 apiConfig，不在此覆盖。
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
  aiMember: Conversation
): ApiConfig {
  const groupO = groupConversation.groupChatModelOverride?.trim();
  const charO = aiMember.characterSettings?.chatModelOverride?.trim();
  const base = (groupO || charO || apiConfig.modelName || '').trim();
  const modelName = resolveTextChatModelAvoidingVisionOnlyModelClash(apiConfig, base);
  if (!groupO && !charO && modelName === String(apiConfig.modelName || '').trim()) return apiConfig;
  return { ...apiConfig, modelName };
}

/** 群聊记忆总结等后台任务：只用群级单独模型（若有），否则全局 */
export function resolveGroupSummaryApiConfig(apiConfig: ApiConfig, groupConversation: Conversation): ApiConfig {
  const groupO = groupConversation.groupChatModelOverride?.trim();
  const base = (groupO || apiConfig.modelName || '').trim();
  const modelName = resolveTextChatModelAvoidingVisionOnlyModelClash(apiConfig, base);
  if (!groupO && modelName === String(apiConfig.modelName || '').trim()) return apiConfig;
  return { ...apiConfig, modelName };
}
