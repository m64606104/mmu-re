import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Layers, Loader2, Pencil, Plus, Search, Send, Smartphone, Trash2, X } from 'lucide-react';
import type { ApiConfig, Conversation, FaceToFaceWindow, UserProfile } from '../types';
import { getCharacterRealName } from '../utils/characterIdentity';
import {
  appendFaceToFaceSegments,
  FACE_TO_FACE_DEFAULT_WINDOW_ID,
  defaultFaceToFaceSceneHeaderLine,
  deleteFaceToFaceSegment,
  loadFaceToFaceNarrativeDoc,
  truncateFaceToFaceSegmentsAfterSegmentId,
  updateFaceToFaceSegmentText,
} from '../utils/faceToFaceNarrativeStorage';
import { requestFaceToFaceAssistantContinuation } from '../utils/faceToFaceNarrativeService';
import { bumpPendingReplyScheduleEpoch } from '../utils/pendingReplyService';
import { enqueueMemoryEngineCycle } from '../utils/memorySystem';

export type FaceToFaceNarrativePanelProps = {
  conversation: Conversation;
  apiConfig: ApiConfig;
  userProfile?: UserProfile | null;
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onOpenPhoneShell?: () => void;
};

export default function FaceToFaceNarrativePanel(props: FaceToFaceNarrativePanelProps) {
  const { conversation, apiConfig, userProfile, onUpdateConversation, showToast, onOpenPhoneShell } = props;
  const session = conversation.faceToFaceSession;
  const windowId = session?.activeFaceToFaceWindowId || FACE_TO_FACE_DEFAULT_WINDOW_ID;

  const [segments, setSegments] = useState<Array<{ id: string; role: string; text: string; timestamp: number }>>(
    [],
  );
  const [sceneDraft, setSceneDraft] = useState(() => session?.sceneHeaderLine?.trim() || defaultFaceToFaceSceneHeaderLine());
  const [plotInput, setPlotInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [worldRunning, setWorldRunning] = useState(false);
  const [windowPickerOpen, setWindowPickerOpen] = useState(false);
  const [windowSearch, setWindowSearch] = useState('');
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [segmentActionBusy, setSegmentActionBusy] = useState(false);
  /** 用户段保存后：是否展示「据此重新续写」选项（segment id） */
  const [regeneratePromptSegmentId, setRegeneratePromptSegmentId] = useState<string | null>(null);
  const narrativeScrollRef = useRef<HTMLDivElement | null>(null);

  const scrollNarrativeToBottom = useCallback(() => {
    const el = narrativeScrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    });
  }, []);

  useEffect(() => {
    if (!session?.active) return;
    if (session.windows?.length) return;
    const now = Date.now();
    onUpdateConversation(conversation.id, {
      faceToFaceSession: {
        ...session,
        windows: [{ id: FACE_TO_FACE_DEFAULT_WINDOW_ID, title: '默认', createdAt: now, updatedAt: now }],
        activeFaceToFaceWindowId: FACE_TO_FACE_DEFAULT_WINDOW_ID,
      },
    });
  }, [conversation.id, onUpdateConversation, session?.active, session?.windows?.length]);

  const reload = useCallback(async () => {
    const d = await loadFaceToFaceNarrativeDoc(conversation.id, windowId);
    setSegments(d.segments);
  }, [conversation.id, windowId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    scrollNarrativeToBottom();
  }, [segments.length, worldRunning, windowId, scrollNarrativeToBottom]);

  useEffect(() => {
    const line = session?.sceneHeaderLine?.trim();
    if (line) setSceneDraft(line);
  }, [session?.sceneHeaderLine]);

  const bumpActiveWindowUpdatedAt = useCallback(() => {
    const s = conversation.faceToFaceSession;
    if (!s?.windows?.length) return;
    const wid = s.activeFaceToFaceWindowId || FACE_TO_FACE_DEFAULT_WINDOW_ID;
    const nextW = s.windows.map((w) => (w.id === wid ? { ...w, updatedAt: Date.now() } : w));
    onUpdateConversation(conversation.id, {
      faceToFaceSession: { ...s, windows: nextW },
    });
  }, [conversation.faceToFaceSession, conversation.id, onUpdateConversation]);

  const persistScene = useCallback(() => {
    const line = sceneDraft.trim();
    onUpdateConversation(conversation.id, {
      faceToFaceSession: {
        ...(session || { active: true, startedAt: Date.now() }),
        active: true,
        sceneHeaderLine: line || undefined,
      },
    });
  }, [conversation.id, onUpdateConversation, sceneDraft, session]);

  const runAssistantContinuation = useCallback(
    async (sourceTag: string) => {
      const { sceneLineParsed } = await requestFaceToFaceAssistantContinuation({
        conversation,
        apiConfig,
        userProfile,
        sceneHeaderLine: sceneDraft.trim() || session?.sceneHeaderLine,
        sourceTag,
      });
      await reload();
      bumpActiveWindowUpdatedAt();
      if (sceneLineParsed) {
        setSceneDraft(sceneLineParsed);
        onUpdateConversation(conversation.id, {
          faceToFaceSession: {
            ...(session || { active: true, startedAt: Date.now() }),
            active: true,
            sceneHeaderLine: sceneLineParsed,
          },
        });
      }
    },
    [
      apiConfig,
      bumpActiveWindowUpdatedAt,
      conversation,
      onUpdateConversation,
      reload,
      sceneDraft,
      session,
      userProfile,
    ],
  );

  const handleSend = useCallback(async () => {
    const t = plotInput.trim();
    if (!t || busy) return;
    setBusy(true);
    const uid = `ftf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    try {
      await appendFaceToFaceSegments(conversation.id, windowId, {
        id: uid,
        role: 'user',
        kind: 'user_action',
        text: t,
        timestamp: Date.now(),
      });
      setPlotInput('');
      await reload();
      bumpActiveWindowUpdatedAt();
      setWorldRunning(true);
      try {
        await runAssistantContinuation('turn');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        showToast?.(msg, 'error');
        await reload();
      } finally {
        setWorldRunning(false);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast?.(msg, 'error');
      await reload();
    } finally {
      setBusy(false);
    }
  }, [
    bumpActiveWindowUpdatedAt,
    busy,
    conversation.id,
    plotInput,
    reload,
    runAssistantContinuation,
    showToast,
    windowId,
  ]);

  const handleExit = useCallback(() => {
    if (!window.confirm('退出线下模式？将回到手机聊天，并可随时从「+」再进来。')) {
      return;
    }
    bumpPendingReplyScheduleEpoch(conversation.id);
    onUpdateConversation(conversation.id, {
      faceToFaceSession: undefined,
    });
    const nextConv: Conversation = {
      ...conversation,
      faceToFaceSession: undefined,
    };
    if (nextConv.enabledFeatures?.includes('memory-system')) {
      enqueueMemoryEngineCycle(nextConv, apiConfig);
    }
  }, [apiConfig, conversation, onUpdateConversation]);

  const handleNewWindow = useCallback(() => {
    const s = session;
    if (!s) return;
    const now = Date.now();
    const newId = `win_${now.toString(36)}`;
    const title =
      new Date().toLocaleString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' 线下';
    const hint = defaultFaceToFaceSceneHeaderLine();
    const nextWindows: FaceToFaceWindow[] = [
      ...(s.windows || []),
      { id: newId, title, createdAt: now, updatedAt: now },
    ];
    onUpdateConversation(conversation.id, {
      faceToFaceSession: {
        ...s,
        windows: nextWindows,
        activeFaceToFaceWindowId: newId,
        sceneHeaderLine: hint,
      },
    });
    setSceneDraft(hint);
    setWindowPickerOpen(false);
    showToast?.('已新建线下记录', 'success');
  }, [conversation.id, onUpdateConversation, session, showToast]);

  const handleSwitchWindow = useCallback(
    (wid: string) => {
      const s = session;
      if (!s) return;
      onUpdateConversation(conversation.id, {
        faceToFaceSession: {
          ...s,
          activeFaceToFaceWindowId: wid,
        },
      });
      setWindowPickerOpen(false);
    },
    [conversation.id, onUpdateConversation, session],
  );

  const handleDeleteSegment = useCallback(
    async (segmentId: string) => {
      if (worldRunning || busy) return;
      if (!window.confirm('删除该条线下内容？不可撤销。')) return;
      setSegmentActionBusy(true);
      try {
        await deleteFaceToFaceSegment(conversation.id, windowId, segmentId);
        await reload();
        bumpActiveWindowUpdatedAt();
        showToast?.('已删除', 'success');
      } catch (e) {
        showToast?.(e instanceof Error ? e.message : String(e), 'error');
      } finally {
        setSegmentActionBusy(false);
      }
    },
    [
      bumpActiveWindowUpdatedAt,
      busy,
      conversation.id,
      reload,
      showToast,
      windowId,
      worldRunning,
    ],
  );

  const handleSaveSegmentEdit = useCallback(async () => {
    if (!editingSegmentId || !editDraft.trim() || segmentActionBusy || worldRunning || busy) return;
    const seg = segments.find((s) => s.id === editingSegmentId);
    const wasUser = seg?.role === 'user';
    const savedId = editingSegmentId;
    setSegmentActionBusy(true);
    try {
      await updateFaceToFaceSegmentText(conversation.id, windowId, savedId, editDraft);
      setEditingSegmentId(null);
      setEditDraft('');
      await reload();
      bumpActiveWindowUpdatedAt();
      if (wasUser) {
        setRegeneratePromptSegmentId(savedId);
      }
      showToast?.('已保存', 'success');
    } catch (e) {
      showToast?.(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setSegmentActionBusy(false);
    }
  }, [
    bumpActiveWindowUpdatedAt,
    busy,
    conversation.id,
    editDraft,
    editingSegmentId,
    reload,
    segmentActionBusy,
    segments,
    showToast,
    windowId,
    worldRunning,
  ]);

  const handleRegenerateAfterUserEdit = useCallback(
    async (segmentId: string) => {
      if (!segmentId || segmentActionBusy || worldRunning || busy) return;
      setRegeneratePromptSegmentId(null);
      setSegmentActionBusy(true);
      setWorldRunning(true);
      try {
        const { removedCount } = await truncateFaceToFaceSegmentsAfterSegmentId(
          conversation.id,
          windowId,
          segmentId,
        );
        await reload();
        bumpActiveWindowUpdatedAt();
        if (removedCount > 0) {
          showToast?.(`已移除其后 ${removedCount} 条，正在续写…`, 'info');
        }
        await runAssistantContinuation('user-edit-rerun');
      } catch (e) {
        showToast?.(e instanceof Error ? e.message : String(e), 'error');
        await reload();
      } finally {
        setWorldRunning(false);
        setSegmentActionBusy(false);
      }
    },
    [
      bumpActiveWindowUpdatedAt,
      busy,
      conversation.id,
      reload,
      runAssistantContinuation,
      segmentActionBusy,
      showToast,
      windowId,
      worldRunning,
    ],
  );

  const characterName =
    getCharacterRealName(conversation.characterSettings) || conversation.name;

  const sortedWindows = useMemo(() => {
    const list = [...(session?.windows || [])];
    list.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
    const q = windowSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((w) => w.title.toLowerCase().includes(q) || w.id.toLowerCase().includes(q));
  }, [session?.windows, windowSearch]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-white">
      {onOpenPhoneShell ? (
        <button
          type="button"
          onClick={onOpenPhoneShell}
          className="fixed bottom-[max(5.5rem,env(safe-area-inset-bottom,0px)+4.5rem)] right-4 z-[130] flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-800 shadow-lg transition hover:bg-emerald-50 md:right-6"
          title="手机聊天"
          aria-label="切换到手机聊天"
        >
          <Smartphone className="h-6 w-6" strokeWidth={2} aria-hidden />
        </button>
      ) : null}

      {windowPickerOpen ? (
        <div className="fixed inset-0 z-[125] flex items-end justify-center md:items-center md:p-4">
          <button type="button" className="absolute inset-0 bg-black/35" aria-label="关闭" onClick={() => setWindowPickerOpen(false)} />
          <div className="relative z-[1] flex max-h-[min(70dvh,520px)] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-xl md:rounded-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Layers className="h-4 w-4 text-emerald-700" />
                线下记录
              </div>
              <button
                type="button"
                className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
                onClick={() => setWindowPickerOpen(false)}
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="border-b border-gray-50 px-3 py-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={windowSearch}
                  onChange={(e) => setWindowSearch(e.target.value)}
                  placeholder="按标题或日期检索…"
                  className="w-full rounded-xl border border-gray-200 py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <button
                type="button"
                onClick={handleNewWindow}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
              >
                <Plus className="h-4 w-4" />
                新建线下记录
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {sortedWindows.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => handleSwitchWindow(w.id)}
                  className={`mb-1 flex w-full flex-col rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                    w.id === windowId
                      ? 'border-emerald-300 bg-emerald-50/90 text-emerald-950'
                      : 'border-transparent bg-gray-50/80 text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <span className="font-medium">{w.title}</span>
                  <span className="text-[11px] text-gray-500">
                    {new Date(w.updatedAt || w.createdAt).toLocaleString('zh-CN', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <BookOpen className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900">线下模式</div>
            <div className="truncate text-[11px] text-gray-500">现实长文字剧情</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setWindowSearch('');
              setWindowPickerOpen(true);
            }}
            className="rounded-full border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            title="线下记录"
          >
            <span className="inline-flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" />
              记录
            </span>
          </button>
          <button
            type="button"
            onClick={handleExit}
            className="shrink-0 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            退出
          </button>
        </div>
      </div>

      <div className="shrink-0 space-y-1.5 border-b border-gray-50 px-3 py-2">
        <div className="text-[11px] font-medium text-gray-500">时间 · 地点（随现实时间，可改）</div>
        <input
          value={sceneDraft}
          onChange={(e) => setSceneDraft(e.target.value)}
          onBlur={() => persistScene()}
          placeholder={defaultFaceToFaceSceneHeaderLine()}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900/10"
        />
      </div>

      <div ref={narrativeScrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {segments.length === 0 && !worldRunning ? (
          <p className="text-sm leading-relaxed text-gray-500">
            在下方写一段文字（动作、场景或对白），推动剧情。
          </p>
        ) : (
          <div className="space-y-4">
            {segments.map((s) => (
              <div
                key={s.id}
                className={
                  s.role === 'user'
                    ? 'group ml-4 rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-2.5 text-[15px] leading-relaxed text-slate-900'
                    : 'group mr-2 text-[15px] leading-[1.75] text-gray-900'
                }
              >
                {s.role === 'user' ? (
                  <span>
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      你
                    </span>
                    {s.text}
                  </span>
                ) : (
                  <div>
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-emerald-700/90">
                      {characterName}
                    </span>
                    <div className="whitespace-pre-wrap">{s.text}</div>
                  </div>
                )}
                {!worldRunning && !busy ? (
                  <div className="mt-2 flex justify-end gap-2 border-t border-black/[0.06] pt-2 opacity-70 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      disabled={segmentActionBusy}
                      onClick={() => {
                        setRegeneratePromptSegmentId(null);
                        setEditingSegmentId(s.id);
                        setEditDraft(s.text);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-600 hover:bg-white/80 hover:text-gray-900 disabled:opacity-40"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      编辑
                    </button>
                    <button
                      type="button"
                      disabled={segmentActionBusy}
                      onClick={() => void handleDeleteSegment(s.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      删除
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
            {worldRunning ? (
              <div className="mr-2 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-2.5 text-sm text-emerald-900">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                <span>世界运行中…</span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-gray-100 bg-white px-3 py-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-end gap-2">
          <textarea
            value={plotInput}
            onChange={(e) => setPlotInput(e.target.value)}
            placeholder="写一段文字推进剧情…"
            rows={2}
            disabled={busy}
            className="min-h-[44px] flex-1 resize-none rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900/10 disabled:opacity-60"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <button
            type="button"
            disabled={busy || !plotInput.trim()}
            onClick={() => void handleSend()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white shadow-md disabled:opacity-40"
            aria-label="发送"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {(editingSegmentId || regeneratePromptSegmentId) ? (
        <div
          className="fixed inset-0 z-[135] flex items-end justify-center bg-black/40 p-4 md:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget && !segmentActionBusy && !worldRunning) {
              setEditingSegmentId(null);
              setEditDraft('');
              setRegeneratePromptSegmentId(null);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby={regeneratePromptSegmentId ? 'ftf-regen-title' : 'ftf-edit-seg-title'}
            onClick={(ev) => ev.stopPropagation()}
          >
            {regeneratePromptSegmentId ? (
              <>
                <h2 id="ftf-regen-title" className="text-sm font-semibold text-gray-900">
                  已保存你的修改
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-gray-600">
                  若要按修改后的文字让角色续写，会先删除这一条之后的全部线下内容（含你与角色的后续段落），再请求生成一段新的续写。选「仅保存」则保留当前时间线。
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={segmentActionBusy || worldRunning}
                    onClick={() => void handleRegenerateAfterUserEdit(regeneratePromptSegmentId)}
                    className="w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-40"
                  >
                    {segmentActionBusy || worldRunning ? '处理中…' : '据此重新续写'}
                  </button>
                  <button
                    type="button"
                    disabled={segmentActionBusy || worldRunning}
                    onClick={() => setRegeneratePromptSegmentId(null)}
                    className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-40"
                  >
                    仅保存，不重写
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 id="ftf-edit-seg-title" className="text-sm font-semibold text-gray-900">
                  编辑本条线下内容
                </h2>
                <textarea
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  rows={8}
                  disabled={segmentActionBusy}
                  className="mt-3 w-full resize-y rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900/10 disabled:opacity-60"
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                    disabled={segmentActionBusy}
                    onClick={() => {
                      setEditingSegmentId(null);
                      setEditDraft('');
                    }}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    disabled={segmentActionBusy || !editDraft.trim()}
                    onClick={() => void handleSaveSegmentEdit()}
                    className="flex-1 rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40"
                  >
                    {segmentActionBusy ? '保存中…' : '保存'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
