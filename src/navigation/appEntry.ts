import type { Screen } from '../types';

export type AppPage = 'home' | 'chat' | 'social' | 'mail' | 'kindergarten' | 'profile' | 'settings' | 'tools';

export const APP_DEFAULT_SCREEN: Record<AppPage, Screen> = {
  home: 'home',
  chat: 'social',
  social: 'social',
  mail: 'letterbox',
  kindergarten: 'kindergarten',
  profile: 'profile',
  settings: 'settings',
  tools: 'database',
};

const MAIL_SCREENS = new Set<Screen>([
  'letterbox',
  'letter-writing',
  'pen-pals',
  'archived-letters',
  'achievements',
  'favorite-letters',
  'stamp-collection',
  'letter-notifications',
  'bottle-fishing',
  'recycle-bin',
  'favorite-replies',
  'unreplied',
]);

const CHAT_SCREENS = new Set<Screen>([
  'chat',
  'character-settings',
  'new-conversation',
  'contacts',
  'add-friend',
  'create-group',
  'moments',
  'worldbook',
  'sticker-management',
  'easy-chat',
]);

const PROFILE_SCREENS = new Set<Screen>(['profile', 'wallet', 'shopping', 'order-history', 'theme', 'user-system']);
const SETTINGS_SCREENS = new Set<Screen>(['settings', 'guide', 'announcement']);
const TOOLS_SCREENS = new Set<Screen>(['database']);

export function getAppForScreen(screen: Screen): AppPage {
  if (MAIL_SCREENS.has(screen)) return 'mail';
  if (CHAT_SCREENS.has(screen)) return 'chat';
  if (PROFILE_SCREENS.has(screen)) return 'profile';
  if (SETTINGS_SCREENS.has(screen)) return 'settings';
  if (TOOLS_SCREENS.has(screen)) return 'tools';
  if (screen === 'kindergarten') return 'kindergarten';
  if (screen === 'social') return 'social';
  return 'home';
}

export function getDefaultScreenForApp(app: AppPage): Screen {
  return APP_DEFAULT_SCREEN[app];
}

export function isAppPageValue(value: string): value is AppPage {
  return ['home', 'chat', 'social', 'mail', 'kindergarten', 'profile', 'settings', 'tools'].includes(value);
}

