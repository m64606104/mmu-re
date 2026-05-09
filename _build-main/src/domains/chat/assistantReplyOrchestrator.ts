import type { Message } from '../../types';
import { stripDisplayControlTags } from '../../utils/messageFormatter';
import { type ParsedAssistantMediaItem, parseAssistantMediaFromText } from './assistantMessageBuilder';
import { processAssistantSpecialContent } from './assistantSpecialPipeline';
import { commitAssistantMessages } from './assistantMessageCommitter';

type OrchestrateAssistantSegmentOptions = {
  rawSegment: string;
  baseId: string;
  conversationId: string;
  recentMessages: Message[];
  htmlContent: string;
  resolveStickerImage: (description: string, conversationId: string) => Promise<string | null | undefined>;
  calculateVoiceDuration: (text: string) => number;
  log?: (line: string) => void;
};

type OrchestrateAssistantSegmentResult = {
  messages: Message[];
  hasAvatarChange: boolean;
  hasRestoreAvatar: boolean;
  shouldAbort: boolean;
  blockedByCooldown: Array<'redPacket' | 'transfer' | 'gift'>;
};

export async function orchestrateAssistantSegment(
  options: OrchestrateAssistantSegmentOptions
): Promise<OrchestrateAssistantSegmentResult> {
  const {
    rawSegment,
    baseId,
    conversationId,
    recentMessages,
    htmlContent,
    resolveStickerImage,
    calculateVoiceDuration,
    log,
  } = options;

  const mediaParseResult = await parseAssistantMediaFromText({
    text: rawSegment,
    conversationId,
    resolveStickerImage,
  });
  const mediaItems: ParsedAssistantMediaItem[] = mediaParseResult.mediaItems;
  let cleanContent = mediaParseResult.cleanContent;
  cleanContent = stripDisplayControlTags(cleanContent);

  const specialPipeline = await processAssistantSpecialContent({
    content: cleanContent,
    baseId,
    conversationId,
    recentMessages,
    currentExtraCount: 0,
  });

  specialPipeline.logs.forEach((line) => log?.(line));
  if (specialPipeline.shouldAbort) {
    return {
      messages: [],
      hasAvatarChange: specialPipeline.hasAvatarChange,
      hasRestoreAvatar: specialPipeline.hasRestoreAvatar,
      shouldAbort: true,
      blockedByCooldown: specialPipeline.blockedByCooldown,
    };
  }

  const committedMessages = commitAssistantMessages({
    baseId,
    htmlContent,
    mediaItems,
    finalContent: specialPipeline.content,
    cleanContent,
    replyToInfo: specialPipeline.replyToInfo,
    extraMessages: specialPipeline.extraMessages,
    calculateVoiceDuration,
    log,
  });

  return {
    messages: committedMessages,
    hasAvatarChange: specialPipeline.hasAvatarChange,
    hasRestoreAvatar: specialPipeline.hasRestoreAvatar,
    shouldAbort: false,
    blockedByCooldown: specialPipeline.blockedByCooldown,
  };
}
