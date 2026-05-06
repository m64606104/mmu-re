import type { CharacterInteractionMode, CharacterSettings } from '../types';

export type { CharacterInteractionMode };

export function isToolInteractionCharacter(cs?: CharacterSettings | null): boolean {
  return cs?.interactionMode === 'tool';
}
