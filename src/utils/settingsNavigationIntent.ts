/** 从聊天入口拦截到设置页时，携带「打开哪一节 + 提示文案」（sessionStorage 单次消费） */
export const SETTINGS_OPEN_INTENT_KEY = 'momoyu_settings_open_intent';

export type SettingsOpenIntent = {
  /** 与 SettingsScreen 中 SETTINGS_SECTIONS 的 id 一致 */
  section: 'api-config' | 'appearance' | 'cloud-sync' | 'storage' | 'backup';
  message: string;
};

export function stashSettingsOpenIntent(intent: SettingsOpenIntent): void {
  try {
    sessionStorage.setItem(SETTINGS_OPEN_INTENT_KEY, JSON.stringify(intent));
  } catch {
    /* ignore */
  }
}

export function consumeSettingsOpenIntent(): SettingsOpenIntent | null {
  try {
    const raw = sessionStorage.getItem(SETTINGS_OPEN_INTENT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(SETTINGS_OPEN_INTENT_KEY);
    const data = JSON.parse(raw) as Partial<SettingsOpenIntent>;
    if (!data || typeof data.message !== 'string' || typeof data.section !== 'string') return null;
    return data as SettingsOpenIntent;
  } catch {
    return null;
  }
}
