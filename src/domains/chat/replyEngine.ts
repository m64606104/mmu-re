import { Conversation, Message } from '../../types';
import NeteaseMusicParser from '../../utils/neteaseMusicParser';

type QuotedMessage = Message | null;

function buildReplyTo(quotedMessage: QuotedMessage) {
  if (!quotedMessage || quotedMessage.role === 'system') return {};
  return {
    replyTo: {
      id: quotedMessage.id,
      content: quotedMessage.content,
      role: quotedMessage.role as 'user' | 'assistant',
    },
  };
}

// Build outgoing user message from current input with the same behavior as legacy ChatScreen.
export function buildUserMessageFromInput(currentInput: string, quotedMessage: QuotedMessage): Message {
  const input = currentInput.trim();
  const replyTo = buildReplyTo(quotedMessage);

  const musicLinkDetection = NeteaseMusicParser.detectMusicLink(input);
  if (musicLinkDetection.hasLink) {
    const musicInfo = NeteaseMusicParser.parseFromShareText(
      musicLinkDetection.rawText || input,
      musicLinkDetection.url!
    );

    if (musicInfo) {
      return {
        id: Date.now().toString() + Math.random(),
        role: 'user',
        content: '',
        timestamp: Date.now(),
        neteaseMusicInfo: musicInfo,
        ...replyTo,
      };
    }
  }

  return {
    id: Date.now().toString() + Math.random(),
    role: 'user',
    content: input,
    timestamp: Date.now(),
    ...replyTo,
  };
}

interface CommitUserMessageOptions {
  conversation: Conversation;
  newMessage: Message;
  isGenerating: boolean;
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void;
  onPerceiveMessage: (conversation: Conversation, message: Message) => void;
  onQueuePendingUserMessage: (messageId: string) => void;
  onHandleAIChildExperience?: (conversation: Conversation, message: Message) => Promise<void> | void;
  onSchedulePendingReply: (conversationId: string, delaySec: number) => void;
}

interface CommitEditedMessageOptions {
  conversation: Conversation;
  messageBeingEdited: Message;
  currentInput: string;
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void;
}

interface CreateCommitUserMessageHandlersOptions {
  onPerceiveMessage: (conversation: Conversation, message: Message) => void;
  onQueuePendingUserMessage: (messageId: string) => void;
  onSchedulePendingReply: (conversationId: string, delaySec: number) => void;
  onTriggerGroupAiRound?: (conversationId: string) => void;
  onHandleAIChildExperienceUpdate?: (
    conversation: Conversation,
    message: Message
  ) => Promise<string | null | void> | string | null | void;
}

type CommitUserMessageHandlers = Pick<
  CommitUserMessageOptions,
  'onPerceiveMessage' | 'onQueuePendingUserMessage' | 'onSchedulePendingReply' | 'onHandleAIChildExperience'
>;

export function createCommitUserMessageHandlers(
  options: CreateCommitUserMessageHandlersOptions
): CommitUserMessageHandlers {
  const {
    onPerceiveMessage,
    onQueuePendingUserMessage,
    onSchedulePendingReply,
    onHandleAIChildExperienceUpdate,
  } = options;

  return {
    onPerceiveMessage,
    onQueuePendingUserMessage: (messageId: string) => {
      onQueuePendingUserMessage(messageId);
      console.log('📝 用户在AI回复时发送消息，将在下轮处理');
    },
    onHandleAIChildExperience: async (conversation: Conversation, message: Message) => {
      if (!onHandleAIChildExperienceUpdate) return;

      try {
        const experienceMessage = await onHandleAIChildExperienceUpdate(conversation, message);
        if (experienceMessage) {
          console.log('🎉 AI儿童理解力经验获得：', experienceMessage);
        }
      } catch (error) {
        console.error('❌ 处理AI儿童经验失败：', error);
      }
    },
    onSchedulePendingReply,
  };
}

export function commitEditedMessage(options: CommitEditedMessageOptions): void {
  const { conversation, messageBeingEdited, currentInput, onUpdateConversation } = options;
  const editedContent = currentInput.trim();
  const updatedMessages = conversation.messages.map(msg =>
    msg.id === messageBeingEdited.id
      ? { ...msg, content: editedContent, edited: true }
      : msg
  );

  onUpdateConversation(conversation.id, { messages: updatedMessages });
}

// Commit user message and trigger all follow-up side effects.
export function commitUserMessage(options: CommitUserMessageOptions): void {
  const {
    conversation,
    newMessage,
    isGenerating,
    onUpdateConversation,
    onPerceiveMessage,
    onQueuePendingUserMessage,
    onHandleAIChildExperience,
    onSchedulePendingReply,
  } = options;

  const clearIcebreakerPending =
    conversation.type === 'group' &&
    conversation.groupIcebreakerPending &&
    newMessage.role === 'user' &&
    !newMessage.groupIcebreakerTrigger;

  onUpdateConversation(conversation.id, {
    messages: [...conversation.messages, newMessage],
    lastMessageTime: Date.now(),
    isHidden: false,
    ...(clearIcebreakerPending ? { groupIcebreakerPending: false } : {}),
  });

  onPerceiveMessage(conversation, newMessage);

  if (isGenerating && conversation.type === 'group') {
    onQueuePendingUserMessage(newMessage.id);
  }

  if (conversation.aiChildData) {
    onHandleAIChildExperience?.(conversation, newMessage);
  }

  // 私聊：schedulePendingReply 内部走门闩 + privateComposerQuietSeconds，忽略 delaySec。
  // 群聊：0 = 仅 AI/空触发的立即拉轮；>0 = 门闩 + groupComposerQuietSeconds（见 pendingReplyService）。
  const bufferSeconds =
    conversation.type === 'group' ? (newMessage.groupAiOnlyTrigger ? 0 : 1) : 0;
  onSchedulePendingReply(conversation.id, bufferSeconds);
}

