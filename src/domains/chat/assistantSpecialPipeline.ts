import type { Message } from '../../types';
import { parseRichContentMarkers } from './richContentParser';
import { parseSpecialMarkers } from './specialMarkerParser';
import { stripAvatarCommandMarkers } from './assistantMessageBuilder';

type ProcessAssistantSpecialContentOptions = {
  content: string;
  baseId: string;
  conversationId: string;
  recentMessages: Message[];
  currentExtraCount: number;
};

type ProcessAssistantSpecialContentResult = {
  content: string;
  replyToInfo?: { content: string; role: 'user' | 'assistant' };
  extraMessages: Message[];
  logs: string[];
  blockedByCooldown: Array<'redPacket' | 'transfer' | 'gift'>;
  hasAvatarChange: boolean;
  hasRestoreAvatar: boolean;
  shouldAbort: boolean;
};

export async function processAssistantSpecialContent(
  options: ProcessAssistantSpecialContentOptions
): Promise<ProcessAssistantSpecialContentResult> {
  const { baseId, conversationId, recentMessages, currentExtraCount } = options;
  const logs: string[] = [];
  const blockedByCooldown: Array<'redPacket' | 'transfer' | 'gift'> = [];
  const extraMessages: Message[] = [];
  let content = options.content;
  let replyToInfo: { content: string; role: 'user' | 'assistant' } | undefined;
  let hasAvatarChange = false;
  let hasRestoreAvatar = false;

  const richResult = await parseRichContentMarkers({
    content,
    baseId,
    currentExtraCount: currentExtraCount + extraMessages.length,
  });
  content = richResult.content;
  extraMessages.push(...richResult.extraMessages);
  logs.push(...richResult.logs);

  const specialResult = parseSpecialMarkers({
    content,
    baseId,
    recentMessages,
    currentExtraCount: currentExtraCount + extraMessages.length,
  });
  content = specialResult.content;
  replyToInfo = specialResult.replyToInfo;
  extraMessages.push(...specialResult.extraMessages);
  logs.push(...specialResult.logs);
  if (specialResult.blockedByCooldown.includes('redPacket')) blockedByCooldown.push('redPacket');
  if (specialResult.blockedByCooldown.includes('transfer')) blockedByCooldown.push('transfer');

  const avatarResult = stripAvatarCommandMarkers(content);
  content = avatarResult.content;
  hasAvatarChange = avatarResult.hasAvatarChange;
  hasRestoreAvatar = avatarResult.hasRestoreAvatar;

  return {
    content,
    replyToInfo,
    extraMessages,
    logs,
    blockedByCooldown,
    hasAvatarChange,
    hasRestoreAvatar,
    shouldAbort: false,
  };
}
