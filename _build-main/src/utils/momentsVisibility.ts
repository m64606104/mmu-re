import type { Conversation } from '../types';
import { smartLoad, smartSave } from './storage';

const MOMENTS_VISIBILITY_GROUPS_KEY = 'moments_visibility_groups';

export interface MomentsVisibilityGroup {
  id: string;
  name: string;
  memberIds: string[];
  updatedAt: number;
}

export async function loadMomentsVisibilityGroups(): Promise<MomentsVisibilityGroup[]> {
  const data = (await smartLoad(MOMENTS_VISIBILITY_GROUPS_KEY)) as MomentsVisibilityGroup[] | null;
  return Array.isArray(data) ? data : [];
}

export async function saveMomentsVisibilityGroups(groups: MomentsVisibilityGroup[]): Promise<void> {
  await smartSave(MOMENTS_VISIBILITY_GROUPS_KEY, groups);
}

export function buildMomentsVisibilityGroupMap(groups: MomentsVisibilityGroup[]): Map<string, string> {
  const map = new Map<string, string>();
  groups.forEach((group) => {
    group.memberIds.forEach((memberId) => map.set(memberId, group.id));
  });
  return map;
}

export function canAIsViewEachOtherMoments(
  viewerAiId: string,
  authorAiId: string,
  groupMap: Map<string, string>
): boolean {
  if (!viewerAiId || !authorAiId) return false;
  if (viewerAiId === authorAiId) return true;
  const viewerGroup = groupMap.get(viewerAiId);
  const authorGroup = groupMap.get(authorAiId);
  return Boolean(viewerGroup && authorGroup && viewerGroup === authorGroup);
}

export function getPrivateAIConversations(conversations: Conversation[]): Conversation[] {
  return conversations.filter((c) => c.type === 'private' && Boolean(c.characterSettings));
}
