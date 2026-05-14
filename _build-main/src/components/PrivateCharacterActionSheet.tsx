import { ChevronUp, Hand, Loader2, Sparkles, X } from 'lucide-react';
import type { CharacterLiveStatus } from '../types';

export type PrivateCharacterSheetView = 'menu' | 'status';

type Props = {
  open: boolean;
  view: PrivateCharacterSheetView;
  onClose: () => void;
  onChangeView: (v: PrivateCharacterSheetView) => void;
  characterName: string;
  status: CharacterLiveStatus | null | undefined;
  statusLoading: boolean;
  onOpenStatus: () => void;
  onPat: () => void;
  onRefreshStatus: () => void;
};

const ROWS: Array<{ key: keyof Omit<CharacterLiveStatus, 'generatedAt'>; label: string }> = [
  { key: 'scene', label: '场景' },
  { key: 'outfit', label: '穿搭' },
  { key: 'pose', label: '姿势' },
  { key: 'mind', label: '心理' },
  { key: 'body', label: '身体' },
];

export default function PrivateCharacterActionSheet(props: Props) {
  const {
    open,
    view,
    onClose,
    onChangeView,
    characterName,
    status,
    statusLoading,
    onOpenStatus,
    onPat,
    onRefreshStatus,
  } = props;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[190] flex items-center justify-center p-4"
      aria-hidden={!open}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="关闭"
        onClick={onClose}
      />
      <div
        className="relative z-[1] flex max-h-[min(72vh,560px)] w-full max-w-[420px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="private-char-sheet-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="min-w-0">
            <h2 id="private-char-sheet-title" className="truncate text-base font-semibold text-gray-900">
              {characterName}
            </h2>
            <p className="text-xs text-gray-500">状态 · 拍一拍</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
          {view === 'menu' ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onOpenStatus}
                className="flex flex-col items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 py-5 text-emerald-900 transition hover:bg-emerald-100"
              >
                <Sparkles className="h-7 w-7" strokeWidth={1.75} />
                <span className="text-sm font-medium">状态</span>
              </button>
              <button
                type="button"
                onClick={onPat}
                className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-5 text-slate-800 transition hover:bg-slate-100"
              >
                <Hand className="h-7 w-7" strokeWidth={1.75} />
                <span className="text-sm font-medium">拍一拍</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => onChangeView('menu')}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                <ChevronUp className="h-3.5 w-3.5" />
                收起状态
              </button>

              {statusLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  加载中…
                </div>
              ) : status ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
                  <dl className="space-y-3">
                    {ROWS.map(({ key, label }) => (
                      <div key={key} className="grid grid-cols-[3.5rem_1fr] gap-x-2 gap-y-0.5 text-sm">
                        <dt className="text-gray-400">{label}</dt>
                        <dd className="text-gray-900 leading-relaxed">{status[key] || '—'}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-gray-500">暂无状态，点下方刷新生成。</p>
              )}

              {!statusLoading && (
                <button
                  type="button"
                  onClick={onRefreshStatus}
                  className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
                >
                  {status ? '重新生成' : '生成状态'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
