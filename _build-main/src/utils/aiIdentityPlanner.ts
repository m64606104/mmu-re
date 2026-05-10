import type { AIIdentityUpdateDraft, CharacterSettings } from '../types';

export interface AIIdentityPlannerInput {
  currentNickname: string;
  currentAvatar?: string;
  visionProfile?: CharacterSettings['avatarVisionProfile'];
  characterSettings?: CharacterSettings;
}

// 预留接口：后续可接“AI自主改名/换头像”策略，不在当前版本自动执行。
export function draftAIIdentityUpdate(input: AIIdentityPlannerInput): AIIdentityUpdateDraft | null {
  const { currentNickname, visionProfile } = input;
  if (!visionProfile?.summary) return null;

  const detectedText = (visionProfile.detectedNameText || '').trim();
  if (!detectedText) return null;
  if (detectedText === currentNickname) return null;

  return {
    nickname: detectedText.slice(0, 24),
    reason: `头像识别到文字“${detectedText}”，与当前昵称可能不一致`,
    confidence: 0.55,
    proposedAt: Date.now(),
  };
}
