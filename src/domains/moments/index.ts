import type { MomentPost } from '../../types';

/**
 * 朋友圈重构占位接口（V3）
 * 说明：旧版自动生成/互动/注入逻辑已下线，后续在此处重新实现。
 */

export type MomentsFeedItem = MomentPost;

export interface MomentsDomainBridge {
  loadFeed: () => Promise<MomentsFeedItem[]>;
}

export const momentsDomainBridge: MomentsDomainBridge = {
  async loadFeed() {
    return [];
  },
};

export async function buildMomentsMemorySystemMessage(_: {
  conversationId: string;
  probability?: number;
  logDebug?: (message: string, payload?: any) => void;
}): Promise<string | null> {
  return null;
}

