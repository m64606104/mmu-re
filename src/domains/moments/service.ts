import type { ApiConfig, Conversation, MomentPost } from '../../types';
import {
  commentMomentPost,
  deleteMomentPost,
  getAllMomentPosts,
  handleUserInteractionResponse,
  likeMomentPost,
} from '../../utils/aiMomentsGenerator';

export async function loadAiMomentsFeed(): Promise<MomentPost[]> {
  return getAllMomentPosts();
}

export async function likeAiMomentAsUser(authorId: string, momentId: string): Promise<void> {
  await likeMomentPost(authorId, momentId, 'user');
}

export async function commentAiMomentAsUser(options: {
  authorId: string;
  momentId: string;
  username: string;
  avatar?: string;
  content: string;
  replyTo?: string;
  replyToName?: string;
}): Promise<void> {
  const { authorId, momentId, username, avatar, content, replyTo, replyToName } = options;
  await commentMomentPost(authorId, momentId, {
    authorId: 'user',
    authorName: username,
    authorAvatar: avatar,
    content,
    replyTo,
    replyToName,
  });
}

export async function deleteAiMomentByAuthor(authorId: string, momentId: string): Promise<void> {
  await deleteMomentPost(authorId, momentId);
}

export async function triggerAiMomentInteractionResponse(options: {
  conversation: Conversation;
  moment: MomentPost;
  type: 'like' | 'comment';
  content?: string;
  apiConfig: ApiConfig;
}): Promise<void> {
  const { conversation, moment, type, content, apiConfig } = options;
  await handleUserInteractionResponse(conversation, moment, type, content, apiConfig);
}

type MomentsRuntimeHost = {
  refreshMomentsScreen?: () => void;
  triggerAIMomentsInteraction?: () => void;
  triggerAICommentSectionInteraction?: () => void;
};

function getMomentsRuntimeHost(): MomentsRuntimeHost {
  return window as unknown as MomentsRuntimeHost;
}

export function registerMomentsRefreshHandler(handler: () => void): () => void {
  const host = getMomentsRuntimeHost();
  host.refreshMomentsScreen = handler;
  return () => {
    delete host.refreshMomentsScreen;
  };
}

export function triggerAIMomentsInteractionIfAvailable(): boolean {
  const host = getMomentsRuntimeHost();
  if (!host.triggerAIMomentsInteraction) return false;
  host.triggerAIMomentsInteraction();
  return true;
}

export function triggerAICommentSectionInteractionIfAvailable(): boolean {
  const host = getMomentsRuntimeHost();
  if (!host.triggerAICommentSectionInteraction) return false;
  host.triggerAICommentSectionInteraction();
  return true;
}

function readStorage(key: string): string {
  return localStorage.getItem(key) || '';
}

function getTodayKey(): string {
  const d = new Date();
  const mm = `${d.getMonth() + 1}`.padStart(2, '0');
  const dd = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function getDailyImageGenStorageKey(): string {
  return `image_gen_moments_daily_${getTodayKey()}`;
}

export interface MomentsImageGenConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
}

export function getMomentsImageGenConfig(): MomentsImageGenConfig {
  return {
    apiUrl: readStorage('image_gen_api_url'),
    apiKey: readStorage('image_gen_api_key'),
    model: readStorage('image_gen_model'),
  };
}

export function isMomentsImageGenerationEnabled(): boolean {
  return readStorage('image_gen_moments_enabled') === 'true';
}

export function getMomentsImageGenerationDailyCount(): number {
  try {
    return parseInt(readStorage(getDailyImageGenStorageKey()) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function getMomentsImageGenerationDailyLimit(): number {
  try {
    const raw = readStorage('image_gen_moments_daily_limit');
    const val = raw ? parseInt(raw, 10) : 10;
    return Number.isFinite(val) && val >= 0 ? val : 10;
  } catch {
    return 10;
  }
}

export function increaseMomentsImageGenerationDailyCount(delta: number = 1): void {
  try {
    const curr = getMomentsImageGenerationDailyCount();
    localStorage.setItem(getDailyImageGenStorageKey(), String(curr + delta));
  } catch {
    // no-op
  }
}

export function buildMomentsImagesEndpoint(base: string): string {
  let apiUrl = base.trim();
  if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
  if (apiUrl.includes('openai.com') || apiUrl.includes('api.openai.com')) {
    return `${apiUrl}/v1/images/generations`;
  }
  if (!apiUrl.includes('/v1/')) return `${apiUrl}/v1/images/generations`;
  return apiUrl.endsWith('/images/generations') ? apiUrl : `${apiUrl}/images/generations`;
}

export function scheduleWithRandomDelay(
  minMs: number,
  maxMs: number,
  task: () => void | Promise<void>
): number {
  const delay = minMs + Math.random() * Math.max(0, maxMs - minMs);
  return window.setTimeout(() => {
    void task();
  }, delay);
}

export function scheduleAIMomentsInteractionTrigger(
  minMs: number = 5000,
  maxMs: number = 15000
): number {
  return scheduleWithRandomDelay(minMs, maxMs, () => {
    triggerAIMomentsInteractionIfAvailable();
  });
}

export function scheduleAICommentSectionInteractionTrigger(
  minMs: number = 5000,
  maxMs: number = 15000
): number {
  return scheduleWithRandomDelay(minMs, maxMs, () => {
    triggerAICommentSectionInteractionIfAvailable();
  });
}

export function scheduleAiMomentInteractionResponse(options: {
  conversation: Conversation;
  moment: MomentPost;
  type: 'like' | 'comment';
  apiConfig: ApiConfig;
  content?: string;
  minMs?: number;
  maxMs?: number;
}): number {
  const { conversation, moment, type, apiConfig, content, minMs = 2000, maxMs = 5000 } = options;
  return scheduleWithRandomDelay(minMs, maxMs, () =>
    triggerAiMomentInteractionResponse({
      conversation,
      moment,
      type,
      content,
      apiConfig,
    })
  );
}

