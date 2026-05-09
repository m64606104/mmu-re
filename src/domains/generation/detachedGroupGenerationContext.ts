import type { ApiConfig, Conversation, UserProfile } from '../../types';

export type DetachedGroupGenerationDeps = {
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  getApiConfig: () => ApiConfig;
  getUserProfile: () => UserProfile | null;
};

let deps: DetachedGroupGenerationDeps | null = null;

/** 由 App 根绑定，供无 ChatScreen 挂载时的群聊轮次落库 */
export function bindDetachedGroupGenerationDeps(next: DetachedGroupGenerationDeps | null): void {
  deps = next;
}

export function getDetachedGroupGenerationDeps(): DetachedGroupGenerationDeps | null {
  return deps;
}
