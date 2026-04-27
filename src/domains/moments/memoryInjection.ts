import type { MomentPost } from '../../types';
import { smartLoad } from '../../utils/storage';

export interface MomentsBundleLike {
  posts?: MomentPost[];
}

export async function getConversationMomentsFromStorage(conversationId: string): Promise<MomentsBundleLike | null> {
  const key = `moments_${conversationId}`;
  return ((await smartLoad(key)) as MomentsBundleLike | null) ?? null;
}

export async function buildMomentsMemorySystemMessage(options: {
  conversationId: string;
  probability?: number;
  logDebug?: (message: string, payload?: any) => void;
}): Promise<string | null> {
  const { conversationId, probability = 0.25, logDebug } = options;

  try {
    const momentsData = await getConversationMomentsFromStorage(conversationId);
    if (!momentsData || Math.random() >= probability) return null;

    const posts = Array.isArray(momentsData.posts) ? momentsData.posts : [];
    if (posts.length === 0) return null;

    const recentMoments = posts.slice(0, 3);
    const randomMoment = recentMoments[Math.floor(Math.random() * recentMoments.length)];
    if (!randomMoment?.content) return null;

    const content = String(randomMoment.content);
    const snippet = content.length > 50 ? `${content.substring(0, 50)}...` : content;
    const hasImages = Array.isArray((randomMoment as any).images) && (randomMoment as any).images.length > 0;

    const momentContext =
      `\n【记忆片段】你最近发了一条朋友圈："${snippet}"${hasImages ? ' [配图]' : ''}。如果在对话中合适，可以自然地提到它，但不要生硬。`;

    logDebug?.('🧠 注入朋友圈记忆', content.substring(0, 20));
    return momentContext;
  } catch (e) {
    logDebug?.('朋友圈记忆注入失败', e);
    return null;
  }
}

