import type { ApiConfig, CharacterLiveStatus, Conversation, UserProfile } from '../types';
import { getCharacterRealName } from './characterIdentity';
import { resolveEffectivePersonalInfo } from './userIdentityCards';
import { resolveBackgroundChatApiConfig, resolvePrivateChatApiConfig } from './chatApiConfig';
import { resolveOpenAiCompatibleCompletionRouting } from '../domains/vision/completionRouting';
import { getErrorFromResponse } from './apiErrorHandler';
import { buildLifeChatContextSnippet } from '../sim/chatContext';

const MAX_FIELD = 800;

/** 相对 nowMs，用于状态卡：避免模型把旧消息当成「刚才」 */
function relativeTimeLabelZh(messageAtMs: number, nowMs: number): string {
  const diff = Math.max(0, nowMs - messageAtMs);
  const minutesTotal = Math.floor(diff / 60000);
  if (minutesTotal < 1) return '约1分钟内';
  if (minutesTotal < 60) return `约${minutesTotal}分钟前`;
  const hours = Math.floor(minutesTotal / 60);
  const mins = minutesTotal % 60;
  if (hours < 48) {
    return mins > 0 ? `约${hours}小时${mins}分钟前` : `约${hours}小时前`;
  }
  const days = Math.floor(hours / 24);
  return `约${days}天前`;
}

function sliceRecentImLines(
  conversation: Conversation,
  maxMessages: number,
  nowMs: number,
  userLineLabel: string,
): string {
  const msgs = conversation.messages || [];
  const im = msgs.filter((m) => m.role !== 'system' && (m as { channel?: string }).channel !== 'face_to_face');
  const tail = im.slice(-maxMessages);
  const charName = getCharacterRealName(conversation.characterSettings) || conversation.name;
  return tail
    .map((m) => {
      const ts = typeof m.timestamp === 'number' && Number.isFinite(m.timestamp) ? m.timestamp : nowMs;
      const abs = new Date(ts).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      const rel = relativeTimeLabelZh(ts, nowMs);
      const raw = String(m.content || '').trim().slice(0, 1800);
      const prefix = `[${abs}（距今${rel}）]`;
      if (m.role === 'user') return `${prefix} ${userLineLabel}：${raw}`;
      return `${prefix} ${charName}：${raw}`;
    })
    .join('\n');
}

function clampField(s: unknown): string {
  const t = typeof s === 'string' ? s.trim() : '';
  if (!t) return '（暂无）';
  return t.length > MAX_FIELD ? t.slice(0, MAX_FIELD) + '…' : t;
}

function parseStatusJson(raw: string): Omit<CharacterLiveStatus, 'generatedAt'> | null {
  const trimmed = raw.trim();
  const tryParse = (s: string) => {
    try {
      const j = JSON.parse(s) as Record<string, unknown>;
      return {
        scene: clampField(j.scene),
        outfit: clampField(j.outfit),
        pose: clampField(j.pose),
        mind: clampField(j.mind),
        body: clampField(j.body),
      };
    } catch {
      return null;
    }
  };
  const direct = tryParse(trimmed);
  if (direct) return direct;
  const m = trimmed.match(/\{[\s\S]{10,12000}\}/);
  if (m) return tryParse(m[0]);
  return null;
}

/**
 * 根据近期手机聊天记录生成角色「状态卡」五栏（场景/穿搭/姿势/心理/身体）。
 * 若设置里启用「独立状态更新」线路，则优先使用该线路的 URL/Key/模型。
 */
export async function generateCharacterLiveStatus(params: {
  conversation: Conversation;
  apiConfig: ApiConfig;
  userProfile: UserProfile | null | undefined;
}): Promise<CharacterLiveStatus> {
  const { conversation, apiConfig, userProfile } = params;
  if (conversation.type !== 'private') {
    throw new Error('仅私聊支持状态卡');
  }
  const charName = getCharacterRealName(conversation.characterSettings) || conversation.name;
  const userLabel = (userProfile?.username || '用户').trim() || '用户';
  const cs = conversation.characterSettings;
  const snippet = [cs?.personality, cs?.languageStyle, cs?.memoryEvents?.trim()]
    .filter(Boolean)
    .join('\n')
    .slice(0, 2000);
  const transcript = sliceRecentImLines(conversation, 28, Date.now(), userLabel);

  const eff = resolveEffectivePersonalInfo(userProfile, conversation);
  const genderRaw = (eff?.gender || userProfile?.personalInfo?.gender || '').trim();
  const userShe = /女|姑娘|女生|女孩|女子|姐妹|小姐|小姐姐|美眉|妹子/i.test(genderRaw);
  const userHe = /男|小伙|男生|男孩|男子|兄弟|小哥哥|汉子/i.test(genderRaw);
  const userPronounRule = userShe
    ? '- 若写到私聊用户：可自然使用你作为角色对 TA 的称呼（昵称、简称、关系里顺口的叫法等），不必机械重复「用户」；需要**整句旁观第三人称**时，指这位用户须用「她」，禁止默认「他」。\n'
    : userHe
      ? '- 若写到私聊用户：可用昵称等自然指代；**整句旁观第三人称**时用「他」。\n'
      : genderRaw
        ? '- 若写到私聊用户：可用昵称等自然指代；**整句旁观第三人称**时勿无依据默认「他」，用「对方」或第二人称「你」。\n'
        : '- 若写到私聊用户：可用昵称等自然指代；**整句旁观第三人称**未标明性别时不要默认「他」。\n';

  const system = `你是剧情状态整理器。用中文填写角色「${charName}」**此刻故事内**的状态（小说设定向，不要写成 App 功能说明）。
输出**仅一行**合法 JSON，不要 markdown、不要解释。键名必须正好是：scene, outfit, pose, mind, body（英文键），值为中文短段落，可含时间地点，要具体好读。

【推断优先级】
1) **现实世界此刻**与普通人作息（深夜宜睡、午间可能进食等），再叠角色性格与设定。
2) 下列「摘录 / 生活模拟」仅为**参考**，用于推断「之前可能做过什么、此刻更可能在做什么」；**不要求**在正文里复述聊天、点名对话细节或强行扣题。没有或较旧的聊天时，照常从时间 + 设定 + 生活片段合理推断。
3) 若写到与聊天相关的心理活动，须与摘录里该条的「距今」间隔一致：久前的聊天只能当余绪或已放下，**禁止**写成「刚刚」「话刚说完」「刚放下手机」等即时语感，除非该条显示距今约 1 分钟内。

【各字段】
- scene：所在场景与时间氛围（须与「现实世界此刻」一致；勿把摘录里的旧时间当成当下钟点）
- outfit：穿着配饰
- pose：姿势或正在做的动作
- mind：内心想法（可稍口语）
- body：躯体感受（疲劳、冷暖、饥饿等），中性健康向；禁止色情或露骨描写
${userPronounRule}${snippet ? `【角色要点】\n${snippet}` : ''}`;

  const lastUser = [...(conversation.messages || [])]
    .reverse()
    .find((m) => m.role === 'user' && (m as { channel?: string }).channel !== 'face_to_face');
  const lifeSimBlock = (await buildLifeChatContextSnippet({ conversation, lastUserMessage: lastUser })).trim();
  const realNow = new Date().toLocaleString('zh-CN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const userBlock = [
    `【现实世界此刻】${realNow}`,
    lifeSimBlock ? lifeSimBlock : '',
    `【近期手机聊天摘录】\n${transcript || '（尚无消息）'}`,
    `\n请综合以上信息，推断「${charName}」当下在故事世界里的状态并输出 JSON。摘录与生活片段**不必写入正文**；若信息不足可合理补全，勿留空字符串。`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const effective = resolvePrivateChatApiConfig(resolveBackgroundChatApiConfig(apiConfig, 'statusUpdate'), conversation);

  const routing = resolveOpenAiCompatibleCompletionRouting(apiConfig, {
    requestContainsImageUrl: false,
    textChatModel: effective.modelName || apiConfig.modelName,
    conversationResolvedConfig: effective,
  });

  const res = await fetch(routing.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${routing.bearerToken}`,
      'X-Momoyu-Source': 'characterLiveStatus:generate',
    },
    body: JSON.stringify({
      model: routing.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userBlock },
      ],
      temperature: 0.62,
      max_tokens: 900,
    }),
  });

  if (!res.ok) {
    const err = await getErrorFromResponse(res);
    throw new Error(`${err.icon} ${err.title}：${err.message}`);
  }

  const data = await res.json();
  const raw = String(data?.choices?.[0]?.message?.content ?? '').trim();
  const parsed = parseStatusJson(raw);
  if (!parsed) {
    throw new Error('未能解析状态 JSON，请重试');
  }
  return { ...parsed, generatedAt: Date.now() };
}
