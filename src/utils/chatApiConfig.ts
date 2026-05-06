import type { ApiConfig, Conversation } from '../types';

/**
 * 私聊：优先角色「单独配置模型」，否则全局。
 * 视觉相关字段始终使用全局 apiConfig，不在此覆盖。
 */
export function resolvePrivateChatApiConfig(apiConfig: ApiConfig, conversation: Conversation): ApiConfig {
  const o = conversation.characterSettings?.chatModelOverride?.trim();
  if (!o) return apiConfig;
  return { ...apiConfig, modelName: o };
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
  if (groupO) return { ...apiConfig, modelName: groupO };
  const charO = aiMember.characterSettings?.chatModelOverride?.trim();
  if (charO) return { ...apiConfig, modelName: charO };
  return apiConfig;
}

/** 群聊记忆总结等后台任务：只用群级单独模型（若有），否则全局 */
export function resolveGroupSummaryApiConfig(apiConfig: ApiConfig, groupConversation: Conversation): ApiConfig {
  const groupO = groupConversation.groupChatModelOverride?.trim();
  if (!groupO) return apiConfig;
  return { ...apiConfig, modelName: groupO };
}
