import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, Loader2, Trash2 } from 'lucide-react';
import type { Conversation, EditCalibrationEntry, LanguageStyleProfileDoc } from '../types';
import { useMobileBottomDock } from '../hooks/useMobileBottomDock';
import { EDIT_CALIBRATION_STUDIO_UPDATED_EVENT } from '../utils/editCalibrationStudioEvents';
import { clearEditCalibrationForConversation, loadEditCalibrationEntries } from '../utils/editCalibrationStorage';
import { loadLanguageStyleProfileDoc } from '../utils/languageStyleProfileStorage';

type Props = {
  conversation: Conversation;
  onBack: () => void;
};

function formatWhen(ts: number): string {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function EditCalibrationStudioScreen(props: Props) {
  const { conversation, onBack } = props;
  const mobileBottomDock = useMobileBottomDock();
  const [entries, setEntries] = useState<EditCalibrationEntry[]>([]);
  const [styleProfile, setStyleProfile] = useState<LanguageStyleProfileDoc | null>(null);
  const [showBaselineIds, setShowBaselineIds] = useState<Record<string, boolean>>({});

  const reload = useCallback(async () => {
    const [list, profile] = await Promise.all([
      loadEditCalibrationEntries(conversation.id),
      loadLanguageStyleProfileDoc(conversation.id),
    ]);
    setEntries(list);
    setStyleProfile(profile);
  }, [conversation.id]);

  useEffect(() => {
    void reload();
    const onEvt = (e: Event) => {
      const d = (e as CustomEvent<{ conversationId?: string }>).detail;
      if (d?.conversationId === conversation.id) void reload();
    };
    window.addEventListener(EDIT_CALIBRATION_STUDIO_UPDATED_EVENT, onEvt as EventListener);
    return () => window.removeEventListener(EDIT_CALIBRATION_STUDIO_UPDATED_EVENT, onEvt as EventListener);
  }, [conversation.id, reload]);

  const toggleBaseline = (id: string) => {
    setShowBaselineIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleClear = async () => {
    const ok = window.confirm(
      '确定清空本角色的编辑学习记录与语言风格画像？（仅存于本机 IndexedDB，不影响聊天记录与记忆库）'
    );
    if (!ok) return;
    await clearEditCalibrationForConversation(conversation.id);
    await reload();
  };

  const titleName =
    conversation.characterSettings?.nickname?.trim() || conversation.name || '角色';

  return (
    <div className="flex flex-col h-[100dvh] md:h-full bg-gray-50 overflow-hidden">
      <div className="shrink-0 px-4 py-3 flex items-center gap-3 bg-white border-b border-gray-200">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200"
          aria-label="返回"
        >
          <ChevronLeft className="w-5 h-5 text-gray-800" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-gray-900 truncate">编辑学习 · 调试台</div>
          <div className="text-xs text-gray-500 truncate">{titleName}</div>
        </div>
        <button
          type="button"
          onClick={() => void handleClear()}
          className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-red-600"
          aria-label="清空记录"
          title="清空本角色记录"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-4 py-4 space-y-4"
        style={{ paddingBottom: `calc(${16 + mobileBottomDock}px + env(safe-area-inset-bottom))` }}
      >
        <p className="text-[11px] text-gray-500 leading-relaxed bg-white rounded-2xl px-3 py-2 border border-gray-100">
          这里汇总你在私聊里<strong className="text-gray-700">手动改过</strong>的气泡（用户或 AI）。默认展示<strong className="text-gray-700">改后正文</strong>与
          AI 的简短归纳；原文默认折叠，可按条展开对照。数据仅存 <strong className="text-gray-700">IndexedDB</strong>，<strong className="text-gray-700">不会</strong>写入通用记忆库。
        </p>

        <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-emerald-50 bg-emerald-50/50">
            <div className="text-sm font-semibold text-emerald-950">语言风格画像（增长型）</div>
            <div className="text-[11px] text-emerald-800/80 mt-0.5">
              每次编辑反思成功后自动合并更新；私聊生成与主动消息会参考此处，与动态记忆画像并行、互不替代。
            </div>
            {styleProfile?.updatedAt ? (
              <div className="text-[10px] text-emerald-700/70 mt-1">
                第 {styleProfile.version} 版 · 更新 {formatWhen(styleProfile.updatedAt)}
              </div>
            ) : null}
          </div>
          <div className="px-4 py-3">
            {(styleProfile?.text || '').trim() ? (
              <div className="text-sm text-gray-900 whitespace-pre-wrap break-words leading-relaxed">
                {(styleProfile?.text || '').trim()}
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                暂无画像。保存过带归纳的编辑记录后，会自动在这里累积；若 API 未配置则不会生成。
              </div>
            )}
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-16 bg-white rounded-3xl border border-gray-100">
            暂无编辑记录
          </div>
        ) : (
          entries.map((e) => {
            const hasBaseline = (e.baselineContent || '').trim().length > 0;
            const showBaseline = !!showBaselineIds[e.id];
            return (
              <div
                key={e.id}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2 border-b border-gray-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        e.role === 'user'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-violet-100 text-violet-800'
                      }`}
                    >
                      {e.role === 'user' ? '用户' : 'AI'}
                    </span>
                    <span className="text-[11px] text-gray-400 truncate">{formatWhen(e.createdAt)}</span>
                  </div>
                  {hasBaseline ? (
                    <button
                      type="button"
                      onClick={() => toggleBaseline(e.id)}
                      className="text-[11px] text-gray-600 shrink-0 px-2 py-1 rounded-lg hover:bg-gray-50 border border-gray-200"
                    >
                      {showBaseline ? '隐藏原文' : '显示原文'}
                    </button>
                  ) : null}
                </div>

                <div className="px-4 py-3 space-y-3">
                  {showBaseline && hasBaseline ? (
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">修订前</div>
                      <div className="text-sm text-gray-600 whitespace-pre-wrap break-words rounded-xl bg-gray-50 px-3 py-2 border border-gray-100">
                        {e.baselineContent}
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">修订后</div>
                    <div className="text-sm text-gray-900 whitespace-pre-wrap break-words rounded-xl bg-white px-3 py-2 border border-gray-200">
                      {e.revisedContent || '（空）'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2">
                    <div className="text-[10px] font-medium text-indigo-900/80 mb-1">AI 归纳</div>
                    {e.aiReflectionStatus === 'pending' ? (
                      <div className="flex items-center gap-2 text-sm text-indigo-800/90">
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>正在生成简要反思…</span>
                      </div>
                    ) : e.aiReflectionStatus === 'error' ? (
                      <div className="text-sm text-red-700 whitespace-pre-wrap">
                        {e.aiReflectionError || '生成失败'}
                      </div>
                    ) : (
                      <div className="text-sm text-indigo-950/90 whitespace-pre-wrap leading-relaxed">
                        {e.aiReflection || '—'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
