// Chat domain public entrypoint.
// This file intentionally re-exports existing utilities without changing behavior,
// so UI code can gradually migrate to a clearer structure.

export { getErrorFromResponse, formatErrorMessage } from '../../utils/apiErrorHandler';
export { splitMessages, cleanAIMessage, stripDisplayControlTags } from '../../utils/messageFormatter';
export { buildTimeAwarePrompt, hasActionKeywords } from '../../utils/timeAwareness';
export { SmartLinkParser } from '../../utils/smartLinkParser';
export { buildApiUrl, callChatCompletionApi } from '../../utils/apiHelper';
export {
  schedulePendingReply,
  onTypingChange,
  isGenerating,
  initPendingReplyService,
  setPendingReplyComposerGate,
  bumpPendingReplyScheduleEpoch,
} from '../../utils/pendingReplyService';

export * from './messageRenderParser';
export * from './replyEngine';
export * from './buildMediaChatRequest';
export * from './buildTextChatRequest';
export * from './groupMemoryInjection';
export * from './assistantMessageBuilder';
export * from './specialMarkerParser';
export * from './richContentParser';
export * from './assistantSpecialPipeline';
export * from './assistantMessageCommitter';
export * from './assistantReplyOrchestrator';
export * from './outputProtocol';
export * from './quoteMarker';
export * from './extractAssistantStickerTokens';
export * from './assistantOutboundPlainText';
export * from './materializeAssistantOutboundMessages';

/** 附图 / image_url 多模态（私聊、群聊、子聊天共用） */
export * from '../vision';

