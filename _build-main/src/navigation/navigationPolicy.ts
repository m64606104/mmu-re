import type { Screen } from '../types';
import { getAppForScreen } from './appEntry';

const SCREENS_WITH_CONVERSATION_CONTEXT = new Set<Screen>([
  'chat',
  'character-settings',
  'edit-calibration-studio',
  'letterbox',
  'voice-favorites',
]);

function requiresConversationContext(screen: Screen): boolean {
  return screen === 'chat' || screen === 'character-settings' || screen === 'edit-calibration-studio';
}

export function supportsConversationContext(screen: Screen): boolean {
  return SCREENS_WITH_CONVERSATION_CONTEXT.has(screen);
}

export function normalizeNavigationTarget(screen: Screen, conversationId: string | null): {
  screen: Screen;
  conversationId: string | null;
} {
  if (screen === 'voice-favorites' && !conversationId) {
    return { screen: 'contacts', conversationId: null };
  }
  if (requiresConversationContext(screen) && !conversationId) {
    return { screen: 'social', conversationId: null };
  }
  return { screen, conversationId };
}

export function buildRouteHash(screen: Screen, conversationId: string | null): string {
  const app = getAppForScreen(screen);
  const params = new URLSearchParams();
  params.set('app', app);
  params.set('screen', screen);
  if (conversationId && supportsConversationContext(screen)) params.set('cid', conversationId);
  return `#/app?${params.toString()}`;
}

