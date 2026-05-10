import type { Message } from '../../types';

const DEFAULT_BASELINE_MAX = 2800;
const DEFAULT_AFTER_MAX = 12000;

function clipSnippet(s: string, maxLen: number): string {
  const t = (s || '').trim();
  if (!t) return '';
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}\n…（以下省略）`;
}

/**
 * 把已格式化的一条消息正文包成发给模型的文本：
 * - 有 editBaselineContent 且与当前正文不同 → 修订前后对照 + 文风/称呼向修订后对齐
 * - 仅有 edited → 单行「以本段为准」
 */
export function wrapModelPayloadForEditedMessage(
  msg: Pick<Message, 'edited' | 'editBaselineContent'>,
  formattedBody: string,
  options?: { baselineMax?: number; afterMax?: number },
): string {
  const body = formattedBody ?? '';
  if (!msg.edited || !body.trim()) return body;

  const baselineMax = options?.baselineMax ?? DEFAULT_BASELINE_MAX;
  const afterMax = options?.afterMax ?? DEFAULT_AFTER_MAX;

  const baseline = (msg.editBaselineContent || '').trim();
  const after = body.trim();

  if (baseline && baseline !== after) {
    return (
      `【用户文风校准】以下为同一条消息的修订前后对照。请以〈修订后〉为对话中的唯一依据：` +
      `称呼、事实、语气与节奏均向〈修订后〉靠拢，避免回到〈修订前〉的习惯；` +
      `可从中体会用户偏好的说法与称谓，并在后续回复中自然贴近（勿复述本说明或逐句模仿）。\n` +
      `〈修订前〉\n${clipSnippet(baseline, baselineMax)}\n\n` +
      `〈修订后〉\n${clipSnippet(after, afterMax)}`
    );
  }

  return `（本条已由用户编辑校正：后文称呼、人名、事实与文风以本段为准。）\n${body}`;
}
