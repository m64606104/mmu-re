import type { ApiConfig, Conversation } from '../types';
import { buildApiUrl } from './apiHelper';
import { getErrorFromResponse, formatErrorMessage } from '../domains/chat';
import { resolvePrivateChatApiConfig } from './chatApiConfig';
import { loadLanguageStyleProfileDoc, saveLanguageStyleProfileDoc } from './languageStyleProfileStorage';

/**
 * 将单次编辑反思并入增长型语言风格画像（IndexedDB）。
 */
export async function mergeLanguageStyleProfileAfterCalibration(options: {
  conversationId: string;
  conversation: Conversation;
  apiConfig: ApiConfig;
  /** 本条编辑的 AI 短反思（已写入调试台条目） */
  newObservation: string;
}): Promise<void> {
  const { conversationId, conversation, apiConfig, newObservation } = options;
  const obs = (newObservation || '').trim();
  if (!obs) return;

  if (!apiConfig.baseUrl?.trim() || !apiConfig.apiKey?.trim() || !apiConfig.modelName?.trim()) {
    return;
  }

  const effective = resolvePrivateChatApiConfig(apiConfig, conversation);
  const charName = conversation.characterSettings?.nickname || conversation.name;
  const prev = await loadLanguageStyleProfileDoc(conversationId);
  const prevText = (prev?.text || '').trim();

  const userPrompt = prevText
    ? `【角色】${charName}\n\n〈当前语言风格画像草稿〉\n${prevText}\n\n〈本次编辑校对的新归纳〉\n${obs}\n\n请把以上合并成一份**更新后的**「用户语言风格画像」草稿：保留仍适用的旧要点，融入新观察，删掉明显矛盾或过时的推测；用短段落或条目即可，客观描述用户偏好的称呼、语气、标点、信息密度、想避免的表达；不要评价对错，不要编造对话里未出现的事实。总字数建议不超过 1200 字。只输出画像正文，不要标题不要前后缀。`
    : `【角色】${charName}\n\n〈本次编辑校对归纳〉\n${obs}\n\n请扩展为一份简要的「用户语言风格画像」草稿（可多条短句/小段落），作为后续对话参考；信息不足处可写「待更多样本」。不要标题不要前后缀。总字数建议不超过 800 字。`;

  try {
    const res = await fetch(buildApiUrl(effective), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${effective.apiKey}`,
        'X-Momoyu-Source': 'language-style-profile-merge',
      },
      body: JSON.stringify({
        model: effective.modelName,
        messages: [
          {
            role: 'system',
            content:
              '你是对话产品的内部档案编辑，只维护「用户语言风格」客观纪要，不聊天、不评判用户。',
          },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 900,
      }),
    });

    if (!res.ok) {
      const err = await getErrorFromResponse(res);
      console.warn('[language-style-profile] merge failed:', formatErrorMessage(err));
      return;
    }

    const data = await res.json();
    const merged = String(data?.choices?.[0]?.message?.content ?? '').trim();
    if (!merged) return;

    const now = Date.now();
    await saveLanguageStyleProfileDoc(conversationId, {
      text: merged,
      version: (prev?.version ?? 0) + 1,
      updatedAt: now,
    });
  } catch (e: any) {
    console.warn('[language-style-profile] merge error:', e?.message || e);
  }
}
