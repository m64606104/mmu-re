/**
 * 视觉 / 附图（image_url）领域层
 *
 * - 与 UI 解耦：只处理 Message → 多模态 parts、系统提示附录、completions 路由。
 * - 私聊 / 群聊 / 子聊天 / buildMediaChatRequest 共用，避免各处复制粘贴。
 */

export type {
  OpenAiVisionDetail,
  OpenAiImageUrlPart,
  OpenAiTextPart,
  OpenAiMultimodalUserContent,
  OpenAiUserMultimodalMessage,
} from './types';
export { isOpenAiImageUrlPart, openAiMessagesUseVisionPayload } from './types';

export {
  collectImageUrlsFromMessage,
  collectImageUrlsFromMessages,
  userMessageHasImagePayload,
} from './imagePayload';

export {
  DEFAULT_PRIVATE_IMAGE_CAPTION,
  DEFAULT_GROUP_IMAGE_CAPTION,
  buildImageUrlParts,
  buildPrivateUserMultimodalContent,
  buildGroupUserMultimodalContent,
} from './buildMultimodalContent';

export {
  IMAGE_RECOGNITION_RULES_APPEND,
  appendImageRecognitionRules,
  GROUP_IMAGE_CONTEXT_HINT,
  appendGroupImageContextHint,
  noVisionModelConfiguredHint,
} from './systemPrompt';

export {
  isVisionModelConfigured,
  pickOpenAiCompatibleEndpoint,
  resolveOpenAiCompatibleCompletionRouting,
  resolveVisionImageChatEndpoint,
  type OpenAiCompatibleCompletionRouting,
} from './completionRouting';

export { hasDedicatedVisionApiLine, resolveTextChatModelAvoidingVisionOnlyModelClash } from '../../utils/textChatModelGuard';
