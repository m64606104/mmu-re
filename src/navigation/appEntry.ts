import type { Screen } from '../types';

export type AppPage = 'home' | 'chat' | 'social' | 'mail' | 'kindergarten' | 'profile' | 'settings' | 'tools' | 'mall';

export const APP_DEFAULT_SCREEN: Record<AppPage, Screen> = {
  home: 'home',
  chat: 'social',
  social: 'social',
  mail: 'letterbox',
  kindergarten: 'kindergarten',
  profile: 'profile',
  settings: 'settings',
  tools: 'database',
  mall: 'shopping',
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

const PROFILE_SCREENS = new Set<Screen>(['profile', 'wallet', 'order-history', 'theme', 'user-system']);
const MALL_SCREENS = new Set<Screen>(['huaduoduo', 'huaduoduo-gogo', 'shopping']);
const SETTINGS_SCREENS = new Set<Screen>(['settings', 'guide', 'announcement']);
const TOOLS_SCREENS = new Set<Screen>(['database', 'focus-habit']);

export function getAppForScreen(screen: Screen): AppPage {
  if (MAIL_SCREENS.has(screen)) return 'mail';
  if (CHAT_SCREENS.has(screen)) return 'chat';
  if (PROFILE_SCREENS.has(screen)) return 'profile';
  if (MALL_SCREENS.has(screen)) return 'mall';
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
  return ['home', 'chat', 'social', 'mail', 'kindergarten', 'profile', 'settings', 'tools', 'mall'].includes(value);
}

