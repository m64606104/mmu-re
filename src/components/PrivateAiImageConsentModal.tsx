import type { PrivateImageConsentPayload } from '../utils/privateImageConsentBridge';

type Props = {
  open: boolean;
  payload: PrivateImageConsentPayload | null;
  onAccept: () => void;
  onReject: () => void;
};

/**
 * 隔空投送风格：角色请求发送 AI 生成配图前的确认，拒绝则不调用生图接口。
 */
export default function PrivateAiImageConsentModal({ open, payload, onAccept, onReject }: Props) {
  if (!open || !payload) return null;

  const n = Math.max(1, Math.floor(payload.imageCount) || 1);
  const name = payload.characterDisplayName.trim() || '对方';

  return (
    <div
      className="fixed inset-0 z-[480] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="private-ai-img-airdrop-title"
    >
      <div
        className="w-full max-w-[340px] overflow-hidden rounded-[14px] bg-white shadow-2xl"
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Helvetica Neue", sans-serif',
        }}
      >
        <div className="px-5 pt-5 pb-3 text-center">
          <h2 id="private-ai-img-airdrop-title" className="text-[17px] font-semibold text-black tracking-tight">
            隔空投送
          </h2>
          <p className="mt-3 text-[15px] leading-snug text-black/88 px-1">
            「{name}」想要向你发送 {n} 张图片。
          </p>
        </div>
        <div className="flex border-t border-black/[0.08]">
          <button
            type="button"
            onClick={onReject}
            className="flex-1 py-3.5 text-[17px] font-normal text-[#007AFF] active:bg-black/[0.04]"
          >
            拒绝
          </button>
          <div className="w-px bg-black/[0.08]" aria-hidden />
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 py-3.5 text-[17px] font-semibold text-[#007AFF] active:bg-black/[0.04]"
          >
            接受
          </button>
        </div>
      </div>
    </div>
  );
}
