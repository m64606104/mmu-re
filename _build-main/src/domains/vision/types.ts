/** OpenAI-compatible chat message `content` item */
export type OpenAiVisionDetail = 'low' | 'high' | 'auto';

export type OpenAiImageUrlPart = {
  type: 'image_url';
  image_url: { url: string; detail?: OpenAiVisionDetail };
};

export type OpenAiTextPart = { type: 'text'; text: string };

export type OpenAiMultimodalUserContent = Array<OpenAiImageUrlPart | OpenAiTextPart>;

/** Narrow helper: user turn whose `content` is multimodal parts */
export type OpenAiUserMultimodalMessage = { role: 'user'; content: OpenAiMultimodalUserContent };

export function isOpenAiImageUrlPart(p: unknown): p is OpenAiImageUrlPart {
  return (
    typeof p === 'object' &&
    p !== null &&
    (p as OpenAiImageUrlPart).type === 'image_url' &&
    typeof (p as OpenAiImageUrlPart).image_url?.url === 'string'
  );
}

/** Whether a chat `messages` array contains at least one user multimodal part with image_url */
export function openAiMessagesUseVisionPayload(
  messages: Array<{ role: string; content?: unknown }>
): boolean {
  for (const msg of messages) {
    if (msg.role !== 'user' || !Array.isArray(msg.content)) continue;
    if ((msg.content as unknown[]).some((p) => isOpenAiImageUrlPart(p))) return true;
  }
  return false;
}
