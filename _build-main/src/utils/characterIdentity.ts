import type { CharacterSettings, Conversation } from '../types';

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

const GROUP_NAME_CHANGE_RE = /\[改群名[:：]\s*([^\]\n]+?)\]/g;

function sanitizeGroupName(raw: string): string {
  return raw.replace(/[\[\]\n\r]/g, '').trim().slice(0, 32);
}

/** 从模型输出移除 [改群名:xxx]，取最后一次有效名称 */
export function stripGroupNameChangeMarkers(raw: string): { text: string; newName?: string } {
  const matches = [...raw.matchAll(GROUP_NAME_CHANGE_RE)];
  let newName: string | undefined;
  if (matches.length > 0) {
    const cleaned = sanitizeGroupName(matches[matches.length - 1][1] || '');
    if (cleaned) newName = cleaned;
  }
  const text = raw.replace(GROUP_NAME_CHANGE_RE, '').replace(/[ \t]{2,}/g, ' ').trim();
  return { text, newName };
}

const LEAVE_GROUP_RE = /\[退群\]/g;
const INVITE_TO_GROUP_RE = /\[邀请入群[:：]\s*([^\]\n]+?)\]/g;

function sanitizeInviteConversationId(raw: string): string | undefined {
  const s = raw.replace(/[\[\]\n\r]/g, '').trim();
  if (!s) return undefined;
  return s.slice(0, 256);
}

/** 模型输出的 `[邀请入群:id]` 与会话成员集合校验（通讯录私聊 AI） */
export function isContactAiInvitableToGroup(
  contact: Conversation | undefined,
  currentMemberIds: ReadonlySet<string>
): contact is Conversation {
  if (!contact) return false;
  if (contact.type !== 'private' || !contact.characterSettings) return false;
  if (contact.isBlocked) return false;
  if (currentMemberIds.has(contact.id)) return false;
  return true;
}

/**
 * 从模型输出移除 `[退群]`、`[邀请入群:会话ID]`，并解析意图（由群聊侧按发言者应用）。
 */
export function stripGroupLeaveInviteMarkers(raw: string): {
  text: string;
  wantsLeave: boolean;
  inviteIds: string[];
} {
  if (!raw || typeof raw !== 'string') {
    return { text: '', wantsLeave: false, inviteIds: [] };
  }
  const wantsLeave = /\[退群\]/.test(raw);
  const inviteIds: string[] = [];
  for (const m of raw.matchAll(INVITE_TO_GROUP_RE)) {
    const id = sanitizeInviteConversationId(m[1] || '');
    if (id) inviteIds.push(id);
  }
  const uniqueInviteIds = [...new Set(inviteIds)];
  const text = raw
    .replace(LEAVE_GROUP_RE, '')
    .replace(INVITE_TO_GROUP_RE, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  return { text, wantsLeave, inviteIds: uniqueInviteIds };
}
