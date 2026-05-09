import type { Message } from '../../types';
import { cleanAIMessage } from '../../utils/messageFormatter';
import { buildAssistantMediaMessages, buildAssistantTextMessage, type ParsedAssistantMediaItem } from './assistantMessageBuilder';

type CommitAssistantMessagesOptions = {
  baseId: string;
  htmlContent: string;
  mediaItems: ParsedAssistantMediaItem[];
  finalContent: string;
  cleanContent: string;
  replyToInfo?: { id: string; content: string; role: 'user' | 'assistant' };
  extraMessages: Message[];
  calculateVoiceDuration: (text: string) => number;
  log?: (line: string) => void;
};

export function commitAssistantMessages(options: CommitAssistantMessagesOptions): Message[] {
  const {
    baseId,
    htmlContent,
    mediaItems,
    finalContent,
    cleanContent,
    replyToInfo,
    extraMessages,
    calculateVoiceDuration,
    log,
  } = options;

  const messages: Message[] = [];
  let msgTimestamp = Date.now();

  if (htmlContent) {
    messages.push({
      id: `${baseId}_html`,
      role: 'assistant',
      content: htmlContent,
      timestamp: msgTimestamp++,
    });
    log?.('🎨 [创建消息] HTML消息已添加');
  }

  const mediaBuildResult = buildAssistantMediaMessages({
    baseId,
    mediaItems,
    startTimestamp: msgTimestamp,
    calculateVoiceDuration,
    log,
  });
  messages.push(...mediaBuildResult.messages);
  msgTimestamp = mediaBuildResult.nextTimestamp;

  const hasSpecialContent = extraMessages.some((msg) => msg.id.startsWith(baseId));
  const shouldCreateTextMessage = finalContent || (!hasSpecialContent && cleanContent);
  if (shouldCreateTextMessage) {
    const textContent = cleanAIMessage(finalContent);
    const message = buildAssistantTextMessage({
      baseId,
      textContent,
      timestamp: msgTimestamp,
      replyToInfo,
    });
    if (message) {
      messages.push(message);
      log?.('📝 [创建消息] 文本消息已添加');
    }
  }

  return [...messages, ...extraMessages];
}
