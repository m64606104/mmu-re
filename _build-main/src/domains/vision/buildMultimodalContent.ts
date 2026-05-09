import type { Message } from '../../types';
import type { OpenAiMultimodalUserContent, OpenAiVisionDetail } from './types';
import { collectImageUrlsFromMessage } from './imagePayload';

/** 与 demo 一致：默认不传 detail，避免部分网关/便宜接口对 `detail: high` 不兼容 */
const DEFAULT_DETAIL: OpenAiVisionDetail | undefined = undefined;

/** 私聊延迟回复 / 单条用户气泡：无配文时的默认引导（偏截图与 UI） */
export const DEFAULT_PRIVATE_IMAGE_CAPTION =
  '请查看上图并回复。若为截图或含文字的界面，请尽量准确理解图片内容；如果有不确定的内容就说明哪里模糊，禁止胡乱编造没有的内容。';

/** 群聊：无配文时的默认引导 */
export const DEFAULT_GROUP_IMAGE_CAPTION =
  '请结合时间线与上下文查看本条附图并回复；看不清则说明。';

export function buildImageUrlParts(
  urls: string[],
  detail: OpenAiVisionDetail | undefined = DEFAULT_DETAIL
): OpenAiMultimodalUserContent {
  return urls.map((url) =>
    detail
      ? { type: 'image_url' as const, image_url: { url, detail } }
      : { type: 'image_url' as const, image_url: { url } }
  );
}

/**
 * 私聊：单条 user 消息 → OpenAI 多模态 content（先图后文）。
 * 未配置 vision 模型时由调用方禁止发送，此处不校验 model。
 */
export function buildPrivateUserMultimodalContent(
  msg: Message,
  options?: { defaultCaption?: string }
): OpenAiMultimodalUserContent | null {
  const urls = collectImageUrlsFromMessage(msg);
  if (urls.length === 0) return null;

  const parts = buildImageUrlParts(urls);
  let userText = (msg.content || '').trim();
  if (!userText || userText === '[图片]') {
    userText = options?.defaultCaption ?? DEFAULT_PRIVATE_IMAGE_CAPTION;
  }
  parts.push({ type: 'text', text: userText });
  return parts;
}

/**
 * 群聊时间线：前缀（发送者、时间、消息 ID 等）放在 text part 开头，便于模型对齐语境。
 */
export function buildGroupUserMultimodalContent(
  msg: Message,
  labeledTimelinePrefix: string
): OpenAiMultimodalUserContent | null {
  const urls = collectImageUrlsFromMessage(msg);
  if (urls.length === 0) return null;

  const parts = buildImageUrlParts(urls);
  let cap = (msg.content || '').trim();
  if (cap === '[图片]') cap = '';
  if (msg.mediaDescription?.trim()) {
    const d = msg.mediaDescription.trim();
    cap = cap ? `${cap}\n（附图备注：${d}）` : `（附图备注：${d}）`;
  }
  if (!cap) cap = DEFAULT_GROUP_IMAGE_CAPTION;
  parts.push({ type: 'text', text: `${labeledTimelinePrefix}${cap}` });
  return parts;
}
