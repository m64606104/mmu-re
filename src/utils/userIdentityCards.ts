import type { Conversation, UserIdentityCard, UserProfile } from '../types';

/** 与 `personalInfo` 对齐，供 system prompt 等使用 */
export type EffectivePersonalInfo = {
  name?: string;
  onlineName?: string;
  gender?: string;
  age?: string;
  background?: string;
};

function trimStr(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

function pick(cardVal: unknown, baseVal: unknown): string | undefined {
  const c = trimStr(cardVal);
  if (c.length > 0) return c;
  const b = trimStr(baseVal);
  if (b.length > 0) return b;
  return undefined;
}

/**
 * 规范化身份卡列表；同一私聊会话只保留在最先出现的一张卡上（避免旧数据重复绑定）。
 */
export function normalizeIdentityCards(raw: unknown): UserIdentityCard[] {
  if (!Array.isArray(raw)) return [];
  const claimedConv = new Set<string>();
  const out: UserIdentityCard[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const id = trimStr(o.id);
    if (!id) continue;

    const rawLinks = Array.isArray(o.linkedConversationIds) ? o.linkedConversationIds : [];
    const linkedConversationIds: string[] = [];
    for (const x of rawLinks) {
      const cid = trimStr(x);
      if (!cid || claimedConv.has(cid)) continue;
      claimedConv.add(cid);
      linkedConversationIds.push(cid);
    }

    out.push({
      id,
      nickname: trimStr(o.nickname) || undefined,
      onlineName: trimStr(o.onlineName) || undefined,
      gender: trimStr(o.gender) || undefined,
      age: trimStr(o.age) || undefined,
      identityInfo: trimStr(o.identityInfo) || undefined,
      linkedConversationIds,
    });
  }
  return out;
}

function effectiveHasAny(e: EffectivePersonalInfo): boolean {
  return Boolean(
    trimStr(e.name) ||
      trimStr(e.onlineName) ||
      trimStr(e.gender) ||
      trimStr(e.age) ||
      trimStr(e.background)
  );
}

function personalInfoOnly(base: UserProfile['personalInfo'] | undefined): EffectivePersonalInfo | null {
  const e: EffectivePersonalInfo = {
    name: trimStr(base?.name) || undefined,
    onlineName: trimStr(base?.onlineName) || undefined,
    gender: trimStr(base?.gender) || undefined,
    age: trimStr(base?.age) || undefined,
    background: trimStr(base?.background) || undefined,
  };
  return effectiveHasAny(e) ? e : null;
}

/**
 * 解析当前会话应使用的「对话用户信息」：私聊且某身份卡绑定了该会话则卡片字段优先，空字段回退到通用 `personalInfo`。
 * 非私聊或未绑定则仅用通用资料。
 */
export function resolveEffectivePersonalInfo(
  userProfile: UserProfile | null | undefined,
  conversation: Conversation
): EffectivePersonalInfo | null {
  const base = userProfile?.personalInfo;

  if (conversation.type !== 'private' || !trimStr(conversation.id)) {
    return personalInfoOnly(base);
  }

  const cards = normalizeIdentityCards(userProfile?.identityCards);
  const linked = cards.find((c) => c.linkedConversationIds.includes(conversation.id));

  if (!linked) {
    return personalInfoOnly(base);
  }

  const merged: EffectivePersonalInfo = {
    name: pick(linked.nickname, base?.name),
    onlineName: pick(linked.onlineName, base?.onlineName),
    gender: pick(linked.gender, base?.gender),
    age: pick(linked.age, base?.age),
    background: pick(linked.identityInfo, base?.background),
  };
  return effectiveHasAny(merged) ? merged : null;
}
