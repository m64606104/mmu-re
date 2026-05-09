import type { Conversation } from '../../types';

let getter: (() => Conversation[]) | null = null;

/**
 * 由 App 根在每次渲染后同步绑定，使延迟回复、群聊后台轮等不依赖 ChatScreen 挂载即可读到最新 conversations。
 */
export function bindLiveConversations(source: () => Conversation[]): void {
  getter = source;
}

export function getLiveConversations(): Conversation[] {
  try {
    return getter?.() ?? [];
  } catch {
    return [];
  }
}
