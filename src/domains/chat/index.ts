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
} from '../../utils/pendingReplyService';

export * from './messageRenderParser';
export * from './replyEngine';
export * from './buildMediaChatRequest';
export * from './buildTextChatRequest';
export * from './groupMemoryInjection';
export * from './assistantMessageBuilder';
export * from './specialMarkerParser';
export * from './richContentParser';
export * from './giftMarkerParser';
export * from './assistantSpecialPipeline';
export * from './financeSignalRecorder';
export * from './assistantMessageCommitter';
export * from './assistantReplyOrchestrator';

