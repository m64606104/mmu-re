export type PrivateImageConsentPayload = {
  conversationId: string;
  characterDisplayName: string;
  imageCount: number;
};

/** true=接受生图，false=用户点拒绝，null=未弹窗（未注册 handler 或宿主已卸载取消） */
type ConsentHandler = (payload: PrivateImageConsentPayload) => Promise<boolean | null>;

let handler: ConsentHandler | null = null;

export function setPrivateAiImageConsentHandler(next: ConsentHandler | null): void {
  handler = next;
}

export async function requestPrivateAiImageConsent(
  payload: PrivateImageConsentPayload,
): Promise<boolean | null> {
  if (!handler) return null;
  try {
    return await handler(payload);
  } catch {
    return null;
  }
}
