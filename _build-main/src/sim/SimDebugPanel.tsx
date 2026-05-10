import { useEffect, useMemo, useState } from 'react';
import type { ApiConfig, Conversation } from '../types';
import type { AILifeSimState } from './types';
import { smartLoad } from '../utils/storage';
import { cleanupLifeSimStates } from './storage';
import { forceTickAll, getLifeSimLastCompletionsError, runLifeSimTick } from './lifeEngine';
import { X, RefreshCw, Play, Trash2 } from 'lucide-react';

type Props = {
  getConversations: () => Conversation[];
  getApiConfig: () => ApiConfig;
};

function fmtTime(ts?: number) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('zh-CN');
  } catch {
    return String(ts);
  }
}

export default function SimDebugPanel({ getConversations, getApiConfig }: Props) {
  const [open, setOpen] = useState(true);
  const [states, setStates] = useState<Record<string, AILifeSimState>>({});
  const [busy, setBusy] = useState(false);
  const [retentionDays, setRetentionDays] = useState(7);
  const [randomnessMode, setRandomnessMode] = useState<'stable' | 'balanced' | 'divergent'>(() => {
    try {
      const v = (localStorage.getItem('momoyu_sim_randomness_mode') || 'balanced') as any;
      return v === 'stable' || v === 'divergent' ? v : 'balanced';
    } catch {
      return 'balanced';
    }
  });
  const [lastAction, setLastAction] = useState<string>('—');
  const [lastError, setLastError] = useState<string>('');

  const conversations = useMemo(() => getConversations() || [], [getConversations]);
  const apiConfig = useMemo(() => getApiConfig(), [getApiConfig]);

  const targets = useMemo(() => {
    return conversations.filter((c) => c.type === 'private' && Boolean(c.characterSettings) && !(c as any).isBlocked);
  }, [conversations]);

  const refresh = async () => {
    setLastAction('refresh()');
    setLastError('');
    try {
      const raw = (await smartLoad('ai_life_sim_states')) as Record<string, AILifeSimState> | null;
      setStates(raw && typeof raw === 'object' ? raw : {});
      setLastAction(`refresh() ok · states=${raw && typeof raw === 'object' ? Object.keys(raw).length : 0}`);
    } catch (e: any) {
      setLastError(e?.message || String(e));
      setLastAction('refresh() failed');
    }
  };

  useEffect(() => {
    refresh().catch(() => {});
    const t = window.setInterval(() => refresh().catch(() => {}), 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('momoyu_sim_randomness_mode', randomnessMode);
    } catch {
      // ignore
    }
  }, [randomnessMode]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-3 right-3 z-[9999] px-3 py-2 rounded-full bg-black/80 text-white text-xs shadow-lg"
      >
        Sim Debug
      </button>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-[9999]">
      <div className="pointer-events-auto absolute top-3 right-3 w-[360px] max-h-[85%] bg-white/95 backdrop-blur border border-gray-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900">AI生活模拟 · Debug</div>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-gray-200 space-y-2">
          <div className="text-[11px] text-gray-600">
            last: <span className="text-gray-900">{lastAction}</span>
            {lastError ? <span className="text-red-600"> · {lastError}</span> : null}
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => refresh().catch(() => {})}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 hover:bg-gray-50 active:opacity-70"
              disabled={busy}
            >
              <RefreshCw className="w-4 h-4" />
              刷新
            </button>

            <button
              onClick={async () => {
                setBusy(true);
                setLastAction('forceTickAll()');
                setLastError('');
                try {
                  await forceTickAll(targets, apiConfig);
                  await refresh();
                  const apiErr = getLifeSimLastCompletionsError();
                  if (apiErr) {
                    setLastError(apiErr);
                    setLastAction('forceTickAll() 已执行，但 chat/completions 未成功');
                  } else {
                    setLastAction('forceTickAll() ok');
                  }
                } catch (e: any) {
                  setLastError(e?.message || String(e));
                  setLastAction('forceTickAll() failed');
                } finally {
                  setBusy(false);
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-purple-600 text-white text-xs hover:bg-purple-700 active:opacity-80 disabled:opacity-50"
              disabled={busy || !apiConfig.apiKey || !apiConfig.baseUrl || !apiConfig.modelName}
              title={!apiConfig.apiKey ? '请先配置 API 才能生成' : ''}
            >
              <Play className="w-4 h-4" />
              Force Tick 全部
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-[11px] text-gray-600">保留天数</div>
            <div className="flex gap-1">
              {[3, 7].map((d) => (
                <button
                  key={d}
                  onClick={() => setRetentionDays(d)}
                  className={`px-2 py-1 rounded-lg text-[11px] border ${
                    retentionDays === d ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200'
                  }`}
                >
                  {d}天
                </button>
              ))}
            </div>
            <button
              onClick={async () => {
                setBusy(true);
                setLastAction(`cleanup(${retentionDays}d)`);
                setLastError('');
                try {
                  await cleanupLifeSimStates(retentionDays);
                  await refresh();
                  setLastAction(`cleanup(${retentionDays}d) ok`);
                } catch (e: any) {
                  setLastError(e?.message || String(e));
                  setLastAction(`cleanup(${retentionDays}d) failed`);
                } finally {
                  setBusy(false);
                }
              }}
              className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] border border-gray-200 text-gray-700 hover:bg-gray-50"
              disabled={busy}
            >
              <Trash2 className="w-3.5 h-3.5" />
              清理
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-[11px] text-gray-600">随机性</div>
            {[
              { id: 'stable', label: '稳定' },
              { id: 'balanced', label: '平衡' },
              { id: 'divergent', label: '发散' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setRandomnessMode(m.id as any)}
                className={`px-2 py-1 rounded-lg text-[11px] border ${
                  randomnessMode === m.id
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-gray-500">
            说明：该面板仅用于验证后台流效果（`?simDebug=1`）。
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {targets.length === 0 ? (
            <div className="text-xs text-gray-500 p-3">暂无可模拟的私聊角色。</div>
          ) : (
            targets.map((c) => {
              const st = states[c.id];
              const name = c.characterSettings?.nickname || c.name || c.id;
              const logs = (st as any)?.lifeLogs || [];
              const last = logs[0];
              return (
                <div key={c.id} className="border border-gray-200 rounded-2xl p-3 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-900 truncate">{name}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        lastTick：{fmtTime(st?.lastTickAt)} · theme：{st?.theme || '—'}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        E{st?.energy ?? '—'} M{st?.mood ?? '—'} S{st?.stress ?? '—'} Social{st?.socialNeed ?? '—'}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Goals{Array.isArray((st as any)?.goals) ? (st as any).goals.filter((g: any) => g?.active).length : 0}
                        {' '}· Aftereffects{Array.isArray((st as any)?.aftereffects) ? (st as any).aftereffects.length : 0}
                        {' '}· Threads{Array.isArray((st as any)?.narrativeThreads) ? (st as any).narrativeThreads.length : 0}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        setBusy(true);
                        setLastAction(`force(${c.id})`);
                        setLastError('');
                        try {
                          await runLifeSimTick(c, apiConfig, { force: true });
                          await refresh();
                          setLastAction(`force(${c.id}) ok`);
                        } catch (e: any) {
                          setLastError(e?.message || String(e));
                          setLastAction(`force(${c.id}) failed`);
                        } finally {
                          setBusy(false);
                        }
                      }}
                      className="shrink-0 px-2.5 py-1.5 rounded-xl bg-gray-900 text-white text-[11px] hover:bg-gray-800 disabled:opacity-50"
                      disabled={busy || !apiConfig.apiKey || !apiConfig.baseUrl || !apiConfig.modelName}
                    >
                      Force
                    </button>
                  </div>

                  <div className="mt-2 text-[11px] text-gray-700 leading-snug">
                    {last?.detail ? (
                      <>
                        <div className="text-gray-500 mb-1">
                          {last.day} · {last.actionCategory} · {last.actionLabel}
                        </div>
                        <div className="line-clamp-4 whitespace-pre-wrap">{last.detail}</div>
                        {last?.hitReason ? (
                          <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-2 text-[10px] text-gray-700 space-y-1">
                            <div className="text-gray-500">命中原因</div>
                            <div>
                              候选：{Array.isArray(last.hitReason.candidates) && last.hitReason.candidates.length > 0
                                ? last.hitReason.candidates.join(' / ')
                                : '—'}
                            </div>
                            <div>
                              避免：{Array.isArray(last.hitReason.avoid) && last.hitReason.avoid.length > 0
                                ? last.hitReason.avoid.join(' / ')
                                : '—'}
                            </div>
                            <div>
                              命中：{last.hitReason.selectedCategory || '—'}
                              {typeof last.hitReason.selectedScore === 'number' ? ` (${last.hitReason.selectedScore})` : ''}
                              {last.hitReason.selectedWasAvoid ? ' [来自避免项]' : ''}
                            </div>
                            <div>
                              原因：{Array.isArray(last.hitReason.selectedReasons) && last.hitReason.selectedReasons.length > 0
                                ? last.hitReason.selectedReasons.join(' + ')
                                : 'candidate'}
                            </div>
                            <div>
                              目标偏置：
                              {Array.isArray(last.hitReason.goalBiasTop) && last.hitReason.goalBiasTop.length > 0
                                ? ` ${last.hitReason.goalBiasTop.map((x: any) => `${x.category}:${x.score}`).join(' / ')}`
                                : ' —'}
                            </div>
                            <div>
                              后效偏置：
                              {Array.isArray(last.hitReason.aftereffectBiasTop) && last.hitReason.aftereffectBiasTop.length > 0
                                ? ` ${last.hitReason.aftereffectBiasTop.map((x: any) => `${x.category}:${x.score}`).join(' / ')}`
                                : ' —'}
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="text-gray-400">（暂无 lifeLogs，点 Force 生成一次）</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

