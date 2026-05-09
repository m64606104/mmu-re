import { runDetachedGroupChatRound } from './runDetachedGroupChatRound';

export type GroupChatRoundScreenHandler = (conversationId: string) => void;

let screenHandler: GroupChatRoundScreenHandler | null = null;

/**
 * ChatScreen 挂载时注册：对「当前屏」会话可走完整 UI 链路，其余 id 回落到 {@link runDetachedGroupChatRound}。
 * 离开聊天页时应置 null，使未读会话仍能完成群轮。
 */
export function setGroupChatRoundScreenHandler(handler: GroupChatRoundScreenHandler | null): void {
  screenHandler = handler;
}

export function dispatchGroupChatRound(conversationId: string): void {
  if (screenHandler) {
    screenHandler(conversationId);
    return;
  }
  void runDetachedGroupChatRound(conversationId);
}
