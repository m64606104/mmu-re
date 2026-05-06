import type { CharacterSettings } from '../types';

/** 角色本名（用户设定，角色自我认同）；旧数据无该字段时回退到备注名 */
export function getCharacterRealName(cs: CharacterSettings | undefined): string {
  const r = (cs?.realName ?? '').trim();
  if (r) return r;
  return (cs?.nickname ?? '').trim();
}

/**
 * 对外网名（群聊名片等），由 AI 自拟或可经 [改网名] 更新；旧数据仅有备注名时回退备注名。
 */
export function getCharacterOnlineHandle(
  cs: CharacterSettings | undefined,
  fallbackConversationName?: string
): string {
  const u = (cs?.username ?? '').trim();
  if (u) return u;
  const nick = (cs?.nickname ?? '').trim();
  if (nick) return nick;
  return (fallbackConversationName ?? '').trim();
}

/** 用户通讯录备注（列表名），与本名、网名无关 */
export function getCharacterUserRemark(cs: CharacterSettings | undefined, conversationName: string): string {
  return (cs?.nickname ?? '').trim() || (conversationName ?? '').trim();
}

const ONLINE_HANDLE_CHANGE_RE = /\[改网名[:：]\s*([^\]\n]+?)\]/g;

function sanitizeOnlineHandle(raw: string): string {
  return raw.replace(/[\[\]\n\r]/g, '').trim().slice(0, 24);
}

/** 从模型输出中移除 [改网名:xxx]，并取最后一次有效更新 */
export function stripOnlineHandleChangeMarkers(raw: string): { text: string; newHandle?: string } {
  const matches = [...raw.matchAll(ONLINE_HANDLE_CHANGE_RE)];
  let newHandle: string | undefined;
  if (matches.length > 0) {
    const last = matches[matches.length - 1][1];
    const cleaned = sanitizeOnlineHandle(last);
    if (cleaned) newHandle = cleaned;
  }
  const text = raw.replace(ONLINE_HANDLE_CHANGE_RE, '').replace(/[ \t]{2,}/g, ' ').trim();
  return { text, newHandle };
}
