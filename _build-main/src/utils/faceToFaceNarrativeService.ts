import type { ApiConfig, Conversation, Message, UserProfile } from '../types';
import { getCharacterRealName } from './characterIdentity';
import { resolvePrivateChatApiConfig } from './chatApiConfig';
import { resolveOpenAiCompatibleCompletionRouting } from '../domains/vision/completionRouting';
import { getErrorFromResponse } from './apiErrorHandler';
import type { FaceToFaceNarrativeDoc, FaceToFaceSegment } from './faceToFaceNarrativeStorage';
import {
  appendFaceToFaceSegments,
  clearFaceToFaceNarrativeDoc,
  loadFaceToFaceNarrativeDoc,
} from './faceToFaceNarrativeStorage';

function fftWindowId(c: Conversation): string {
  return c.faceToFaceSession?.activeFaceToFaceWindowId || 'default';
}

const SCENE_LINE_RE = /\[场景[:：]\s*([^\]]+)\]/;

function buildFaceToFaceSystemPrompt(params: {
  characterName: string;
  userLabel: string;
  sceneHeaderLine?: string;
  characterSnippet?: string;
}): string {
  const { characterName, userLabel, sceneHeaderLine, characterSnippet } = params;
  const scene = (sceneHeaderLine || '').trim() || '（未指定：你可从上下文推断合理的时间与地点，并在文末输出场景行）';
  return `【面对面叙事模式 · 现实见面】
当前不是手机聊天界面，而是你与「${userLabel}」**同一物理空间内**的剧情描写。禁止默认写成发微信、看手机通知、对方正在输入等，除非剧情明确要求出现手机。
写作要求：
- 以小说式 prose 为主，可自然穿插对白（中文弯引号「」或“”均可）。
- 可描写环境、动作、神态、感官；保持角色「${characterName}」的人设一致。
- 用户刚输入的一句视为**口头话语、动作或表情**，不要改写成「发了一条消息」。
- 视角：以第三人称旁白为主，可适度使用第二人称「你」指用户。
${characterSnippet ? `\n【角色要点】\n${characterSnippet.slice(0, 1200)}` : ''}
【当前场景条（故事内）】
${scene}
【文末格式】
在本轮正文结束后**单独一行**输出场景信息，必须严格形如：\`[场景:故事内时间或日期 · 地点简述]\`（整行仅此标签，便于界面更新）。若无法推断可沿用上一轮场景意涵并稍作细化。`;
}

function segmentsToChatMessages(doc: FaceToFaceNarrativeDoc): Array<{ role: 'user' | 'assistant'; content: string }> {
  const out: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const s of doc.segments) {
    const t = (s.text || '').trim();
    if (!t) continue;
    if (s.role === 'user') {
      out.push({ role: 'user', content: `（用户·面对面）${t}` });
    } else {
      out.push({ role: 'assistant', content: t });
    }
  }
  return out;
}

/** 取最近若干条纯 IM 消息作背景（不含 face_to_face channel） */
function sliceRecentImForFaceToFace(conversation: Conversation, maxMessages: number): Array<{ role: 'user' | 'assistant'; content: string }> {
  const msgs = conversation.messages || [];
  const im = msgs.filter((m) => m.role !== 'system' && (m as { channel?: string }).channel !== 'face_to_face');
  const tail = im.slice(-maxMessages);
  return tail.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content:
      m.role === 'user'
        ? `（此前·线上聊天）${String(m.content || '').slice(0, 2000)}`
        : `（此前·${getCharacterRealName(conversation.characterSettings) || conversation.name}·线上）${String(m.content || '').slice(0, 2000)}`,
  }));
}

function parseInviteOfferFromModelText(raw: string): boolean {
  const trimmed = raw.trim();
  try {
    const j = JSON.parse(trimmed) as { offer?: unknown };
    if (typeof j.offer === 'boolean') return j.offer;
  } catch {
    // fall through
  }
  const m = trimmed.match(/\{[\s\S]{0,400}\}/);
  if (m) {
    try {
      const j = JSON.parse(m[0]) as { offer?: unknown };
      if (typeof j.offer === 'boolean') return j.offer;
    } catch {
      // ignore
    }
  }
  return false;
}

const MEET_INVITE_CLASSIFIER_SYSTEM = `你是对话状态判断器。你会看到一段私聊的「近期线上摘录」以及「刚完成的用户一句 + 对方（AI 角色）一句」。

任务：从剧情语义判断，此刻是否**适合**向人类用户弹出选项「是否进入线下模式」——即 App 将切到**同一物理空间内**的小说化描写界面（不再是手机聊天气泡），双方已在故事里进入或即将进入**同场见面 / 会合 / 接头 / 接送**等，且线上对话已经把「当下这一刻」推到了可以自然落笔线下场景的位置。

判为 true 的典型情况（举例，不限于此）：
- 双方已约定具体动作或地点，且对话显示正要去会合、已在楼下/门口等、刚动身、刚碰面等；
- 剧情上已清楚是「马上见到对方」的关头。

判为 false 的情况（举例）：
- 仍是远程、异地、纯文字陪伴，没有同场空间上的「这一刻」；
- 只是泛泛「改天见」「以后约」而无当下会合；
- 工作/学习/闲聊与见面无关；
- 无法从上下文合理读出「同场相见」。

只输出**一行**合法 JSON，不要 markdown、不要解释：{"offer":true} 或 {"offer":false}`;

export type FaceToFaceMeetInviteEvaluation = { offer: boolean };

/**
 * 调用当前私聊解析出的模型，判断是否应弹出「进入线下模式」邀请（不用关键词模板）。
 */
export async function evaluateFaceToFaceMeetInviteFromImContext(params: {
  conversation: Conversation;
  apiConfig: ApiConfig;
  userProfile: UserProfile | null | undefined;
  pairUserMessage: Message;
  pairAssistantMessage: Message;
}): Promise<FaceToFaceMeetInviteEvaluation> {
  const { conversation, apiConfig, userProfile, pairUserMessage, pairAssistantMessage } = params;
  if (conversation.type !== 'private') {
    return { offer: false };
  }
  const effective = resolvePrivateChatApiConfig(apiConfig, conversation);
  const characterName =
    getCharacterRealName(conversation.characterSettings) || conversation.name;
  const userLabel = (userProfile?.username || '用户').trim() || '用户';

  const imLines = sliceRecentImForFaceToFace(conversation, 28);
  const history = imLines
    .map((l) => `${l.role === 'user' ? `用户「${userLabel}」` : characterName}：${l.content}`)
    .join('\n\n');

  const u = String(pairUserMessage.content || '').trim().slice(0, 2500);
  const a = String(pairAssistantMessage.content || '').trim().slice(0, 2500);

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    { role: 'system', content: MEET_INVITE_CLASSIFIER_SYSTEM },
    {
      role: 'user',
      content: `【近期线上私聊摘录】\n${history || '（无）'}\n\n【刚完成的回合】\n用户「${userLabel}」：${u || '（空）'}\n${characterName}：${a || '（空）'}`,
    },
  ];

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
      'X-Momoyu-Source': 'faceToFaceNarrative:meetInviteClassifier',
    },
    body: JSON.stringify({
      model: routing.model,
      messages,
      temperature: 0.12,
      max_tokens: 80,
    }),
  });

  if (!res.ok) {
    const err = await getErrorFromResponse(res);
    throw new Error(`${err.icon} ${err.title}：${err.message}`);
  }

  const data = await res.json();
  const raw = String(data?.choices?.[0]?.message?.content ?? '').trim();
  return { offer: parseInviteOfferFromModelText(raw) };
}

function buildFaceToFaceOpeningSystemPrompt(params: {
  characterName: string;
  userLabel: string;
  characterSnippet?: string;
}): string {
  const { characterName, userLabel, characterSnippet } = params;
  return `【面对面叙事 · 开篇】
你是中文小说化叙事写手。接下来会给你「进入线下模式之前」的线上私聊实录（可能含刚完成的最后一回合）。你要写**第一段**线下叙事：故事里的用户「${userLabel}」与「${characterName}」在剧情上已处于或立刻进入**同一物理空间相见**的那一刻。

写作总则：
- **严格服从**摘录里已经成立的事实与约定（谁等谁、何处、做什么、情绪与关系进展）；不要写出与上文矛盾的情节。
- 摘录里**没有**写到的细节，只在不破坏一致性的前提下顺势补笔；不必为凑要素而硬写车色、衣着等模板化清单，一切以对话实际信息量为准，自行调节详略与镜头。
- 第三人称旁白为主，可适度用第二人称「你」指用户。不要写成聊天气泡、系统通知、对方正在输入；不要复述本说明。
- 保持「${characterName}」人设与语气倾向与线上一致。
${characterSnippet ? `\n【角色要点】\n${characterSnippet.slice(0, 1200)}` : ''}
【文末格式】
正文结束后**单独一行**输出：\`[场景:故事内时间或日期 · 地点简述]\`（整行仅此标签）。`;
}

export type FaceToFaceNarrativeTurnResult = {
  doc: FaceToFaceNarrativeDoc;
  /** 若模型文末带 [场景:…] 则解析出该行（不含方括号前缀） */
  sceneLineParsed?: string;
};

/**
 * 当前 IndexedDB 叙事文档**已含**用户最新一句时，请求模型续写并追加 assistant 段。
 */
export async function requestFaceToFaceAssistantContinuation(params: {
  conversation: Conversation;
  apiConfig: ApiConfig;
  userProfile: UserProfile | null | undefined;
  sceneHeaderLine?: string;
  sourceTag?: string;
}): Promise<FaceToFaceNarrativeTurnResult> {
  const { conversation, apiConfig, userProfile, sceneHeaderLine, sourceTag = 'continuation' } = params;
  if (conversation.type !== 'private') {
    throw new Error('仅私聊支持面对面叙事');
  }

  const docFull = await loadFaceToFaceNarrativeDoc(conversation.id, fftWindowId(conversation));
  const doc: FaceToFaceNarrativeDoc = {
    ...docFull,
    segments: docFull.segments.slice(-48),
  };

  const effective = resolvePrivateChatApiConfig(apiConfig, conversation);
  const characterName =
    getCharacterRealName(conversation.characterSettings) || conversation.name;
  const userLabel = (userProfile?.username || '用户').trim() || '用户';
  const cs = conversation.characterSettings;
  const snippet = [cs?.personality, cs?.languageStyle].filter(Boolean).join('\n');

  const system = buildFaceToFaceSystemPrompt({
    characterName,
    userLabel,
    sceneHeaderLine: sceneHeaderLine || conversation.faceToFaceSession?.sceneHeaderLine,
    characterSnippet: snippet,
  });

  const imTail = sliceRecentImForFaceToFace(conversation, 12);
  const narrativeMsgs = segmentsToChatMessages(doc);
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: system },
    ...(imTail.length
      ? ([
          {
            role: 'system' as const,
            content: `【以下为进入面对面叙事之前的少量线上聊天记录摘要背景，勿模仿其气泡格式】`,
          },
          ...imTail,
        ] as const)
      : []),
    ...narrativeMsgs,
  ];

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
      'X-Momoyu-Source': `faceToFaceNarrative:${sourceTag}`,
    },
    body: JSON.stringify({
      model: routing.model,
      messages,
      temperature: 0.82,
      max_tokens: 2800,
    }),
  });

  if (!res.ok) {
    const err = await getErrorFromResponse(res);
    throw new Error(`${err.icon} ${err.title}：${err.message}`);
  }

  const data = await res.json();
  let raw = String(data?.choices?.[0]?.message?.content ?? '').trim();
  let sceneLineParsed: string | undefined;
  const m = raw.match(SCENE_LINE_RE);
  if (m) {
    sceneLineParsed = m[1].trim();
    raw = raw.replace(SCENE_LINE_RE, '').trim();
  }

  const aiSeg: FaceToFaceSegment = {
    id: `ftf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    role: 'assistant',
    kind: 'narration',
    text: raw || '……',
    timestamp: Date.now(),
  };
  const next = await appendFaceToFaceSegments(conversation.id, fftWindowId(conversation), aiSeg);
  return { doc: next, sceneLineParsed };
}

/**
 * 清空叙事档后，根据线上聊天生成第一段「会合」开篇（仅 assistant 一段写入 IndexedDB）。
 */
export async function generateFaceToFaceOpeningFromImChat(params: {
  conversation: Conversation;
  apiConfig: ApiConfig;
  userProfile: UserProfile | null | undefined;
  /** 触发邀请时线上「用户」那句 */
  bridgeUserText?: string;
  /** 触发邀请时线上「对方」紧接的那句 */
  bridgeAssistantText?: string;
}): Promise<FaceToFaceNarrativeTurnResult> {
  const { conversation, apiConfig, userProfile, bridgeUserText, bridgeAssistantText } = params;
  if (conversation.type !== 'private') {
    throw new Error('仅私聊支持面对面叙事');
  }
  await clearFaceToFaceNarrativeDoc(conversation.id, fftWindowId(conversation));

  const effective = resolvePrivateChatApiConfig(apiConfig, conversation);
  const characterName =
    getCharacterRealName(conversation.characterSettings) || conversation.name;
  const userLabel = (userProfile?.username || '用户').trim() || '用户';
  const cs = conversation.characterSettings;
  const snippet = [cs?.personality, cs?.languageStyle].filter(Boolean).join('\n');

  const system = buildFaceToFaceOpeningSystemPrompt({
    characterName,
    userLabel,
    characterSnippet: snippet,
  });

  const imTail = sliceRecentImForFaceToFace(conversation, 30);
  const bu = (bridgeUserText || '').trim().slice(0, 800);
  const ba = (bridgeAssistantText || '').trim().slice(0, 800);
  const instructParts: string[] = [];
  if (bu || ba) {
    instructParts.push(
      `【线上刚完成的回合（须承接，勿改写成发消息）】\n用户：${bu || '（无）'}\n${characterName}：${ba || '（无）'}`,
    );
  }
  instructParts.push(
    `请写第一段线下叙事：紧接上述线上对话之后，故事内自然转入同场相见的那一瞬。怎么写、写多长、侧重环境还是人物心理，全部由摘录里的信息密度自行决定；唯一硬要求是**与线上内容连贯、不矛盾**。`,
  );
  const instruct = instructParts.join('\n\n');

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: system },
    ...(imTail.length
      ? ([
          {
            role: 'system' as const,
            content: `【以下为会面前的线上聊天摘录，勿模仿气泡格式】`,
          },
          ...imTail,
        ] as const)
      : []),
    { role: 'user', content: instruct },
  ];

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
      'X-Momoyu-Source': 'faceToFaceNarrative:opening',
    },
    body: JSON.stringify({
      model: routing.model,
      messages,
      temperature: 0.84,
      max_tokens: 2600,
    }),
  });

  if (!res.ok) {
    const err = await getErrorFromResponse(res);
    throw new Error(`${err.icon} ${err.title}：${err.message}`);
  }

  const data = await res.json();
  let raw = String(data?.choices?.[0]?.message?.content ?? '').trim();
  let sceneLineParsed: string | undefined;
  const m = raw.match(SCENE_LINE_RE);
  if (m) {
    sceneLineParsed = m[1].trim();
    raw = raw.replace(SCENE_LINE_RE, '').trim();
  }

  const aiSeg: FaceToFaceSegment = {
    id: `ftf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    role: 'assistant',
    kind: 'narration',
    text: raw || '……',
    timestamp: Date.now(),
  };
  const next = await appendFaceToFaceSegments(conversation.id, fftWindowId(conversation), aiSeg);
  return { doc: next, sceneLineParsed };
}

/**
 * 追加用户一句并请求 AI 续写面对面叙事；正文写入 IndexedDB，不混入主 messages。
 */
export async function runFaceToFaceNarrativeTurn(params: {
  conversation: Conversation;
  apiConfig: ApiConfig;
  userProfile: UserProfile | null | undefined;
  userLine: string;
  sceneHeaderLine?: string;
}): Promise<FaceToFaceNarrativeTurnResult> {
  const { conversation, userLine } = params;
  if (conversation.type !== 'private') {
    throw new Error('仅私聊支持面对面叙事');
  }
  const trimmed = (userLine || '').trim();
  if (!trimmed) throw new Error('请输入内容');

  const uid = `ftf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const userSeg: FaceToFaceSegment = {
    id: uid,
    role: 'user',
    kind: 'user_action',
    text: trimmed,
    timestamp: Date.now(),
  };
  await appendFaceToFaceSegments(conversation.id, fftWindowId(conversation), userSeg);
  return requestFaceToFaceAssistantContinuation({
    conversation,
    apiConfig: params.apiConfig,
    userProfile: params.userProfile,
    sceneHeaderLine: params.sceneHeaderLine,
    sourceTag: 'turn',
  });
}
