import type { ApiConfig, Conversation } from '../types';
import { buildApiUrl } from './apiHelper';
import { resolvePrivateChatApiConfig } from './chatApiConfig';
import { getCharacterRealName } from './characterIdentity';
import { getErrorFromResponse } from './apiErrorHandler';
import { isToolInteractionCharacter } from './characterInteractionMode';

function sanitizeOneLine(raw: string): string {
  let s = (raw || '').trim().split(/\r?\n/)[0] ?? '';
  s = s.replace(/^[\"'「『]|[\"'」』]$/g, '').trim();
  s = s.replace(/[\[\]\n\r]/g, '').trim();
  if (s.length > 24) s = s.slice(0, 24);
  return s;
}

/**
 * 新建陪伴型角色且尚无网名时，调用模型生成初始网名（失败则静默跳过）。
 */
export async function generateInitialOnlineHandle(
  conversation: Conversation,
  apiConfig: ApiConfig
): Promise<string | null> {
  const cs = conversation.characterSettings;
  if (!cs || conversation.type !== 'private') return null;
  if (isToolInteractionCharacter(cs)) return null;
  if ((cs.username || '').trim()) return null;

  const effective = resolvePrivateChatApiConfig(apiConfig, conversation);
  const real = getCharacterRealName(cs) || '（未填）';
  const remark = (cs.nickname || '').trim() || '（未填）';
  const persona = [cs.personality, cs.languageStyle, cs.systemPrompt].filter(Boolean).join('；').slice(0, 700);

  const system = `你是起名助手。用户刚创建了一个 AI 角色，请你为 Ta 起一个「网名」：用于群聊名片、社交平台式展示的称呼（2～14 个字为宜）。
严格规则：
- 只输出网名本身一行；不要引号、不要解释、不要前缀「网名：」。
- 风格贴合人设，可与本名不同。
- 本名（角色自我认同）：${real}
- 用户在通讯录里的备注（仅你自己区分，不要把备注当成你必须采用的网名）：${remark}
人设摘要：${persona || '（无）'}`;

  const apiUrl = buildApiUrl(apiConfig);
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiConfig.apiKey}`,
        'X-Momoyu-Source': 'bootstrapOnlineHandle',
      },
      body: JSON.stringify({
        model: effective.modelName,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: '请给出网名（一行）。' },
        ],
        temperature: 0.88,
        max_tokens: 64,
      }),
    });

    if (!res.ok) {
      const err = await getErrorFromResponse(res);
      console.warn('[bootstrapOnlineHandle]', err.title, err.message);
      return null;
    }

    const data = await res.json();
    const line = sanitizeOneLine(data.choices?.[0]?.message?.content ?? '');
    if (!line || line.length < 2) return null;
    return line;
  } catch (e) {
    console.warn('[bootstrapOnlineHandle] 网络请求失败（可稍后在设置中检查 API / 代理）:', e);
    return null;
  }
}
