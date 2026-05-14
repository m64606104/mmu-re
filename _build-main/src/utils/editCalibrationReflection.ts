import type { ApiConfig, Conversation, EditCalibrationEntry } from '../types';
import { buildApiUrl } from './apiHelper';
import { getErrorFromResponse, formatErrorMessage } from '../domains/chat';
import { resolvePrivateChatApiConfig } from './chatApiConfig';
import { updateEditCalibrationEntry } from './editCalibrationStorage';
import { mergeLanguageStyleProfileAfterCalibration } from './languageStyleProfileMerge';

const REFLECTION_MAX_TOKENS = 900;

function isRetryableReflectionFailure(detail: string): boolean {
  const s = (detail || '').toLowerCase();
  if (/\b(408|429|502|503|504)\b/.test(s)) return true;
  return /load failed|failed to fetch|networkerror|network error|timeout|timed out|aborted|econnreset|econnrefused|socket|unreachable|cors|bad gateway|service unavailable|gateway/.test(
    s,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** 调试台展示：把 Safari 常见的 Load failed 翻成可理解的中文 */
export function formatEditCalibrationReflectionErrorForUi(raw?: string): string {
  const s = (raw || '').trim();
  if (!s) return '生成失败';
  if (/^load failed$/i.test(s) || /\bload failed\b/i.test(s)) {
    return '网络请求失败（常见于跨域、HTTPS 混用或 Safari）；可稍后点「重新生成」。';
  }
  if (/failed to fetch/i.test(s)) {
    return '网络请求失败，请检查连接与 API 地址后点「重新生成」。';
  }
  return s;
}

/**
 * 用户在调试台对失败条目手动重试：先清状态再重新走生成（会再次尝试自动重试一次）。
 */
export async function retryEditCalibrationReflectionFromEntry(options: {
  conversationId: string;
  entry: Pick<EditCalibrationEntry, 'id' | 'role' | 'baselineContent' | 'revisedContent'>;
  conversation: Conversation;
  apiConfig: ApiConfig;
}): Promise<void> {
  const { conversationId, entry, conversation, apiConfig } = options;
  await updateEditCalibrationEntry(conversationId, entry.id, {
    aiReflectionStatus: 'pending',
    aiReflectionError: undefined,
    aiReflection: undefined,
  });
  await runEditCalibrationReflection({
    conversationId,
    entryId: entry.id,
    conversation,
    apiConfig,
    role: entry.role,
    baselineContent: entry.baselineContent,
    revisedContent: entry.revisedContent,
  });
}

/**
 * 基于一次「修订前/后」生成短反思，写入编辑学习区（不写入记忆库）。
 * 对瞬时网络/网关类失败自动再请求一次。
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

  const postOnce = async (): Promise<
    | { ok: true; text: string }
    | { ok: false; detail: string }
  > => {
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
          max_tokens: REFLECTION_MAX_TOKENS,
        }),
      });

      if (!res.ok) {
        const err = await getErrorFromResponse(res);
        return { ok: false, detail: formatErrorMessage(err) };
      }

      const data = await res.json();
      const text = String(data?.choices?.[0]?.message?.content ?? '').trim();
      if (!text) {
        return { ok: false, detail: '模型未返回内容' };
      }
      return { ok: true, text };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, detail: msg || '请求异常' };
    }
  };

  try {
    let lastDetail = '生成失败';
    for (let attempt = 0; attempt < 2; attempt++) {
      const out = await postOnce();
      if (out.ok) {
        await updateEditCalibrationEntry(conversationId, entryId, {
          aiReflection: out.text,
          aiReflectionStatus: 'ok',
          aiReflectionError: undefined,
        });
        void mergeLanguageStyleProfileAfterCalibration({
          conversationId,
          conversation,
          apiConfig,
          newObservation: out.text,
        });
        return;
      }
      lastDetail = out.detail;
      if (attempt === 0 && isRetryableReflectionFailure(out.detail)) {
        await sleep(900);
        continue;
      }
      break;
    }

    await updateEditCalibrationEntry(conversationId, entryId, {
      aiReflectionStatus: 'error',
      aiReflectionError: lastDetail,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await updateEditCalibrationEntry(conversationId, entryId, {
      aiReflectionStatus: 'error',
      aiReflectionError: msg || '请求异常',
    });
  }
}
