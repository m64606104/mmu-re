import type { ApiConfig } from '../types';
import { resolveVisionImageChatEndpoint } from '../domains/vision/completionRouting';
import { buildApiUrl } from './apiHelper';

export interface AvatarCandidateImage {
  url: string;
  label: string;
}

export interface AvatarChangeDecision {
  approved: boolean;
  selectedIndex?: number;
  reply: string;
  reason?: string;
}

export interface AvatarIntentDecision {
  isAvatarChangeRequest: boolean;
  confidence: number;
  reason?: string;
}

function tryParseJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function detectAvatarChangeIntentByAI(params: {
  apiConfig: ApiConfig;
  characterName: string;
  requestText: string;
  hasImageCandidates: boolean;
  recentContextText?: string;
}): Promise<AvatarIntentDecision | null> {
  const { apiConfig, characterName, requestText, hasImageCandidates, recentContextText } = params;
  if (!apiConfig.baseUrl || !apiConfig.apiKey || !apiConfig.modelName) return null;
  try {
    const prompt =
      `你是“换头像请求意图识别器”。请基于语义判断用户这句话是否在请求你更换当前头像，不要依赖关键词匹配。\n` +
      `角色名：${characterName}\n` +
      `用户最新消息：${requestText}\n` +
      `最近是否有用户图片候选：${hasImageCandidates ? '有' : '没有'}\n` +
      `${recentContextText ? `最近上下文：\n${recentContextText}\n` : ''}` +
      `请只输出 JSON：{"isAvatarChangeRequest":boolean,"confidence":0-1,"reason":"简短理由"}。`;

    const resp = await fetch(buildApiUrl(apiConfig), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiConfig.apiKey}`,
        'X-Momoyu-Source': 'avatarChangeIntent:text',
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 180,
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const raw = String(data?.choices?.[0]?.message?.content || '');
    const parsed = tryParseJson(raw);
    if (!parsed) return null;
    const isAvatarChangeRequest = Boolean(parsed.isAvatarChangeRequest);
    const confidenceRaw = Number(parsed.confidence);
    const confidence = Number.isFinite(confidenceRaw)
      ? Math.max(0, Math.min(1, confidenceRaw))
      : isAvatarChangeRequest
        ? 0.7
        : 0.3;
    const reason = String(parsed.reason || '').trim() || undefined;
    return { isAvatarChangeRequest, confidence, reason };
  } catch {
    return null;
  }
}

export async function generateAvatarChangeReplyByAI(params: {
  apiConfig: ApiConfig;
  characterName: string;
  characterProfileText?: string;
  memoryContextText?: string;
  requestText: string;
  decision: 'approved' | 'rejected' | 'need_images';
  selectedImageLabel?: string;
}): Promise<string | null> {
  const {
    apiConfig,
    characterName,
    characterProfileText,
    memoryContextText,
    requestText,
    decision,
    selectedImageLabel,
  } = params;
  if (!apiConfig.baseUrl || !apiConfig.apiKey || !apiConfig.modelName) return null;
  try {
    const decisionLine =
      decision === 'approved'
        ? `你已经决定同意换头像，选中的是：${selectedImageLabel || '用户最新发的那张图'}。`
        : decision === 'need_images'
          ? '你现在没有可用候选图，需要礼貌地请用户再发图。'
          : '你决定这次先不换头像。';
    const prompt =
      `你现在扮演“${characterName}”，请根据结果回复用户一句自然中文，不要模板腔。\n` +
      `${characterProfileText ? `角色设定：${characterProfileText}\n` : ''}` +
      `${memoryContextText ? `关系记忆：${memoryContextText}\n` : ''}` +
      `用户原话：${requestText}\n` +
      `${decisionLine}\n` +
      `要求：口语化、像真人聊天、1-2句、不要解释规则、不要输出JSON。`;
    const resp = await fetch(buildApiUrl(apiConfig), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiConfig.apiKey}`,
        'X-Momoyu-Source': 'avatarChangeReply:text',
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 120,
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const text = String(data?.choices?.[0]?.message?.content || '').trim();
    return text || null;
  } catch {
    return null;
  }
}

export async function decideAvatarChangeByAI(params: {
  apiConfig: ApiConfig;
  characterName: string;
  requestText: string;
  images: AvatarCandidateImage[];
  characterProfileText?: string;
  memoryContextText?: string;
}): Promise<AvatarChangeDecision | null> {
  const { apiConfig, characterName, requestText, images, characterProfileText, memoryContextText } = params;
  const routing = resolveVisionImageChatEndpoint(apiConfig);
  if (!routing?.apiUrl) return null;
  if (images.length === 0) {
    return {
      approved: false,
      reply: '',
      reason: 'no_images',
    };
  }

  const contentParts: any[] = [
    {
      type: 'text',
      text:
        `你正在扮演角色“${characterName}”。用户提出了换头像请求：${requestText}\n` +
        `${characterProfileText ? `角色设定参考：${characterProfileText}\n` : ''}` +
        `${memoryContextText ? `关系/记忆参考：${memoryContextText}\n` : ''}` +
        '请你基于用户请求和候选图片作决定：同意或拒绝。若同意，从候选图里选一张。\n' +
        '你必须真的看图再判断，不能只根据用户文字做决定。\n' +
        '必须输出 JSON，不要输出其它内容。\n' +
        'JSON格式: {"approved":boolean,"selectedIndex":number|null,"reply":"给用户看的自然中文回复","reason":"简短原因"}\n' +
        '要求:\n' +
        '- selectedIndex 从 1 开始计数\n' +
        '- 如果拒绝，selectedIndex 必须为 null\n' +
        '- reply 口语化，1~2句\n' +
        '- reason 必须包含“你看到了哪些画面特征”+“为什么与人设/关系记忆匹配或不匹配”',
    },
  ];

  images.forEach((img, i) => {
    contentParts.push({ type: 'text', text: `候选图${i + 1}：${img.label}` });
    contentParts.push({ type: 'image_url', image_url: { url: img.url } });
  });

  try {
    const resp = await fetch(routing.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${routing.bearerToken}`,
        'X-Momoyu-Source': 'avatarChangeDecision:multimodal',
      },
      body: JSON.stringify({
        model: routing.model,
        messages: [{ role: 'user', content: contentParts }],
        temperature: 0.5,
        max_tokens: 300,
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const raw = String(data?.choices?.[0]?.message?.content || '');
    const parsed = tryParseJson(raw);
    if (!parsed) return null;

    const approved = Boolean(parsed.approved);
    const selectedIndexRaw = parsed.selectedIndex;
    const selectedIndex =
      typeof selectedIndexRaw === 'number' && Number.isFinite(selectedIndexRaw)
        ? Math.floor(selectedIndexRaw)
        : undefined;
    const reply = String(parsed.reply || '').trim();
    const reason = String(parsed.reason || '').trim() || undefined;

    return {
      approved,
      selectedIndex,
      // 不在底层写死模板文案；由上层语义回复生成器统一产出自然口吻
      reply,
      reason,
    };
  } catch {
    return null;
  }
}
