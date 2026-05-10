import type { ApiConfig, Conversation } from '../types';
import { buildApiUrl } from './apiHelper';
import { getErrorFromResponse, formatErrorMessage } from '../domains/chat';
import { resolvePrivateChatApiConfig } from './chatApiConfig';
import { updateEditCalibrationEntry } from './editCalibrationStorage';
import { mergeLanguageStyleProfileAfterCalibration } from './languageStyleProfileMerge';

/**
 * 基于一次「修订前/后」生成短反思，写入编辑学习区（不写入记忆库）。
 */
export async function runEditCalibrationReflection(options: {
  conversationId: string;
  entryId: string;
  conversation: Conversation;
  apiConfig: ApiConfig;
  role: 'user' | 'assistant';
  baselineContent: string;
  revisedContent: string;
}): Promise<void> {
  const { conversationId, entryId, conversation, apiConfig, role, baselineContent, revisedContent } =
    options;
  if (!apiConfig.baseUrl?.trim() || !apiConfig.apiKey?.trim() || !apiConfig.modelName?.trim()) {
    await updateEditCalibrationEntry(conversationId, entryId, {
      aiReflectionStatus: 'error',
      aiReflectionError: '未配置 API，无法生成反思',
    });
    return;
  }

  const effective = resolvePrivateChatApiConfig(apiConfig, conversation);
  const charName = conversation.characterSettings?.nickname || conversation.name;

  const roleLabel = role === 'user' ? '用户' : 'AI 助手';
  const hasBaseline = (baselineContent || '').trim().length > 0;

  const userPrompt = hasBaseline
    ? `【角色名】${charName}\n【被编辑的是】${roleLabel}消息\n\n〈修订前〉\n${baselineContent}\n\n〈修订后〉\n${revisedContent}\n\n请用 3～6 句中文，从「用户更偏好的说法、称呼、语气、信息密度、想避免的感觉」做简短归纳；这是给 AI 后续接话用的内部笔记，不要重复全文、不要标题、不要列表符号套娃。若修订很小，可说明「微调」即可。`
    : `【角色名】${charName}\n【被编辑的是】${roleLabel}消息\n\n〈当前定稿〉\n${revisedContent}\n\n用户做了编辑校正。请用 2～4 句中文推测用户可能希望坚持的表述习惯（若信息不足就写：待更多校对样本）。不要标题。`;

  try {
    const res = await fetch(buildApiUrl(effective), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${effective.apiKey}`,
        'X-Momoyu-Source': 'edit-calibration-reflection',
      },
      body: JSON.stringify({
        model: effective.modelName,
        messages: [
          {
            role: 'system',
            content:
              '你是对话助理团队的内部纪要员，只做简短文风与偏好归纳，不评判对错，不编造事实。',
          },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.25,
        max_tokens: 450,
      }),
    });

    if (!res.ok) {
      const err = await getErrorFromResponse(res);
      await updateEditCalibrationEntry(conversationId, entryId, {
        aiReflectionStatus: 'error',
        aiReflectionError: formatErrorMessage(err),
      });
      return;
    }

    const data = await res.json();
    const text = String(data?.choices?.[0]?.message?.content ?? '').trim();
    if (!text) {
      await updateEditCalibrationEntry(conversationId, entryId, {
        aiReflectionStatus: 'error',
        aiReflectionError: '模型未返回内容',
      });
      return;
    }

    await updateEditCalibrationEntry(conversationId, entryId, {
      aiReflection: text,
      aiReflectionStatus: 'ok',
      aiReflectionError: undefined,
    });

    void mergeLanguageStyleProfileAfterCalibration({
      conversationId,
      conversation,
      apiConfig,
      newObservation: text,
    });
  } catch (e: any) {
    await updateEditCalibrationEntry(conversationId, entryId, {
      aiReflectionStatus: 'error',
      aiReflectionError: e?.message || String(e),
    });
  }
}
