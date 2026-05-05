/**
 * 记忆管理组件
 * 允许用户查看、编辑和管理AI的长期记忆
 */

import { useEffect, useMemo, useState } from 'react';
import {
  X,
  Trash2,
  Star,
  Brain,
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  LayoutDashboard,
  Settings2,
  BookOpen,
  Library,
} from 'lucide-react';
import type { MemoryDiaryEntry } from '../types';
import { 
  MemoryEntry,
  getMemoryBank, 
  addMemory, 
  deleteMemory, 
  updateMemoryImportance,
  clearMemoryBank,
  updateMemorySettings,
  saveMemoryBank,
} from '../utils/memorySystem';

interface MemoryManagerProps {
  conversationId: string;
  conversationName: string;
  onClose: () => void;
}

/** 与记忆系统日记 day 字段一致：UTC+8 的 YYYY-MM-DD */
function utc8DayKeyFromTs(ts: number): string {
  return new Date(ts + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const WEEKDAY_ZH = ['日', '一', '二', '三', '四', '五', '六'];

function weekdayShortFromDayKey(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  return WEEKDAY_ZH[dt.getDay()] ?? '';
}

type MemoryPage = 'overview' | 'settings' | 'daily' | 'vault';

export default function MemoryManager({ conversationId, conversationName, onClose }: MemoryManagerProps) {
  const memoryBank = getMemoryBank(conversationId);
  const [memories, setMemories] = useState<MemoryEntry[]>(memoryBank.memories);
  const [diaries, setDiaries] = useState<MemoryDiaryEntry[]>(memoryBank.diaryEntries || []);
  const [aiSelfProfileText, setAiSelfProfileText] = useState(memoryBank.aiSelfProfile?.text || '');
  const [userProfileText, setUserProfileText] = useState(memoryBank.userProfile?.text || '');
  const [settings, setSettings] = useState(memoryBank.settings);
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState('其他');
  const [newMemoryImportance, setNewMemoryImportance] = useState<'low' | 'medium' | 'high'>('medium');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProfiles, setEditingProfiles] = useState(false);
  /** 翻页式「日记」页当前选中的日期 YYYY-MM-DD */
  const [browseDay, setBrowseDay] = useState<string | null>(null);
  const [memoryPage, setMemoryPage] = useState<MemoryPage>('overview');
  const [expandedDiaryDays, setExpandedDiaryDays] = useState<Record<string, boolean>>({});
  const [expandedSummaryDays, setExpandedSummaryDays] = useState<Record<string, boolean>>({});
  
  // 私聊：与记忆引擎一致，有效间隔 ≥50；预设为常用档位
  const presetIntervals = [50, 100, 150, 200];
  const isCustomInterval = !presetIntervals.includes(settings.autoSummaryInterval);
  const [customInterval, setCustomInterval] = useState(
    isCustomInterval ? settings.autoSummaryInterval : 50
  );
  const [intervalMode, setIntervalMode] = useState<'preset' | 'custom'>(
    isCustomInterval ? 'custom' : 'preset'
  );
  
  // 群聊自定义间隔相关状态
  const groupPresetIntervals = [30, 50, 100, 200];
  const currentGroupInterval = settings.groupSummaryInterval || 50;
  const isCustomGroupInterval = !groupPresetIntervals.includes(currentGroupInterval);
  const [customGroupInterval, setCustomGroupInterval] = useState(
    isCustomGroupInterval ? currentGroupInterval : 50
  );
  const [groupIntervalMode, setGroupIntervalMode] = useState<'preset' | 'custom'>(
    isCustomGroupInterval ? 'custom' : 'preset'
  );

  const categories = [
    '个人信息', '喜好', '事件', '关系', '习惯', '情感',
    'AI经历', 'AI观点', '对话互动', '聊天总结', '其他',
  ];

  const refreshFromBank = () => {
    const updatedBank = getMemoryBank(conversationId);
    setMemories(updatedBank.memories);
    setDiaries(updatedBank.diaryEntries || []);
    setAiSelfProfileText(updatedBank.aiSelfProfile?.text || '');
    setUserProfileText(updatedBank.userProfile?.text || '');
  };

  const handleAddMemory = () => {
    if (!newMemoryContent.trim()) {
      alert('请输入记忆内容');
      return;
    }

    addMemory(conversationId, newMemoryContent, newMemoryImportance, newMemoryCategory, false);
    refreshFromBank();
    setNewMemoryContent('');
    setShowAddForm(false);
  };

  const handleDeleteMemory = (memoryId: string) => {
    if (confirm('确定要删除这条记忆吗？')) {
      deleteMemory(conversationId, memoryId);
      refreshFromBank();
    }
  };

  const handleToggleImportance = (memoryId: string, currentImportance: 'low' | 'medium' | 'high') => {
    const nextImportance: Record<string, 'low' | 'medium' | 'high'> = {
      low: 'medium',
      medium: 'high',
      high: 'low'
    };
    
    updateMemoryImportance(conversationId, memoryId, nextImportance[currentImportance]);
    refreshFromBank();
  };

  const handleClearAll = () => {
    if (confirm(`确定要清空${conversationName}的所有记忆吗？此操作不可恢复！`)) {
      clearMemoryBank(conversationId);
      refreshFromBank();
    }
  };

  const handleUpdateSettings = () => {
    updateMemorySettings(conversationId, settings);
    alert('设置已保存');
  };

  const handleSaveProfiles = () => {
    const bank = getMemoryBank(conversationId);
    const now = Date.now();
    bank.aiSelfProfile = aiSelfProfileText.trim()
      ? {
          text: aiSelfProfileText.trim(),
          version: (bank.aiSelfProfile?.version ?? 0) + 1,
          updatedAt: now,
          sourceDay: bank.aiSelfProfile?.sourceDay,
          priority: 'override',
        }
      : undefined;
    bank.userProfile = userProfileText.trim()
      ? {
          text: userProfileText.trim(),
          version: (bank.userProfile?.version ?? 0) + 1,
          updatedAt: now,
          sourceDay: bank.userProfile?.sourceDay,
          priority: 'override',
        }
      : undefined;
    saveMemoryBank(bank);
    setEditingProfiles(false);
    refreshFromBank();
    alert('动态画像已保存');
  };

  const getImportanceColor = (importance: 'low' | 'medium' | 'high') => {
    switch (importance) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-gray-400';
    }
  };

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      'AI经历': 'bg-purple-100 text-purple-700',
      'AI观点': 'bg-indigo-100 text-indigo-700',
      '对话互动': 'bg-pink-100 text-pink-700',
      '个人信息': 'bg-blue-100 text-blue-700',
      '喜好': 'bg-green-100 text-green-700',
      '事件': 'bg-orange-100 text-orange-700',
      '关系': 'bg-cyan-100 text-cyan-700',
      '习惯': 'bg-teal-100 text-teal-700',
      '情感': 'bg-rose-100 text-rose-700',
      '聊天总结': 'bg-slate-200 text-slate-800',
      '其他': 'bg-gray-100 text-gray-700',
    };
    return colors[category || '其他'] || colors['其他'];
  };

  /** 仅角色日记（排除误标为 chat_summary 的旧数据） */
  const roleDiaries = useMemo(
    () => diaries.filter((d) => !d.recordType || d.recordType === 'diary'),
    [diaries]
  );

  const chatSummaryMemories = useMemo(
    () => memories.filter((m) => m.category === '聊天总结'),
    [memories]
  );

  const memoriesForList = useMemo(
    () => memories.filter((m) => m.category !== '聊天总结'),
    [memories]
  );

  const memoriesByCategory = useMemo(() => {
    return memoriesForList.reduce((acc, memory) => {
      const cat = memory.category || '其他';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(memory);
      return acc;
    }, {} as Record<string, MemoryEntry[]>);
  }, [memoriesForList]);

  const diariesByDay = useMemo(() => {
    const map: Record<string, MemoryDiaryEntry[]> = {};
    for (const d of roleDiaries) {
      const day = d.day || utc8DayKeyFromTs(d.timestamp);
      if (!map[day]) map[day] = [];
      map[day].push(d);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
    return map;
  }, [roleDiaries]);

  const chatSummariesByDay = useMemo(() => {
    const map: Record<string, MemoryEntry[]> = {};
    for (const m of memories.filter((x) => x.category === '聊天总结')) {
      const day = utc8DayKeyFromTs(m.timestamp);
      if (!map[day]) map[day] = [];
      map[day].push(m);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
    return map;
  }, [memories]);

  const sortedDiaryDayKeys = useMemo(() => {
    return Object.keys(diariesByDay).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  }, [diariesByDay]);

  const sortedSummaryDayKeys = useMemo(() => {
    return Object.keys(chatSummariesByDay).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  }, [chatSummariesByDay]);

  /** 日记页顶部可选日期（新→旧） */
  const sortedDisplayDays = useMemo(() => {
    const set = new Set<string>();
    sortedDiaryDayKeys.forEach((d) => set.add(d));
    sortedSummaryDayKeys.forEach((d) => set.add(d));
    return Array.from(set).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)).slice(0, 90);
  }, [sortedDiaryDayKeys, sortedSummaryDayKeys]);

  const browseDayIndex = browseDay ? sortedDisplayDays.indexOf(browseDay) : -1;

  const dayDiaryEntries = browseDay ? diariesByDay[browseDay] || [] : [];
  const daySummaryEntries = browseDay ? chatSummariesByDay[browseDay] || [] : [];

  useEffect(() => {
    if (memoryPage !== 'daily') return;
    if (sortedDisplayDays.length === 0) {
      setBrowseDay(null);
      return;
    }
    if (!browseDay || !sortedDisplayDays.includes(browseDay)) {
      setBrowseDay(sortedDisplayDays[0]);
    }
  }, [memoryPage, sortedDisplayDays, browseDay]);

  const toggleDiaryDay = (day: string) => {
    setExpandedDiaryDays((prev) => ({ ...prev, [day]: !prev[day] }));
  };

  const toggleSummaryDay = (day: string) => {
    setExpandedSummaryDays((prev) => ({ ...prev, [day]: !prev[day] }));
  };

  const pageTabs: { id: MemoryPage; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: '概览', icon: LayoutDashboard },
    { id: 'settings', label: '设置', icon: Settings2 },
    { id: 'daily', label: '日记', icon: BookOpen },
    { id: 'vault', label: '资料', icon: Library },
  ];

  const goBrowsePrevDay = () => {
    if (browseDayIndex < 0 || browseDayIndex >= sortedDisplayDays.length - 1) return;
    setBrowseDay(sortedDisplayDays[browseDayIndex + 1]);
  };
  const goBrowseNextDay = () => {
    if (browseDayIndex <= 0) return;
    setBrowseDay(sortedDisplayDays[browseDayIndex - 1]);
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col isolate bg-gradient-to-b from-sky-200 via-sky-100 to-stone-50">
      {/* 头部 — 实底避免 backdrop-filter 把下层设置页采进模糊层造成「重影」 */}
      <div className="flex shrink-0 items-center justify-between px-4 h-14 bg-white border-b border-sky-100 shadow-sm shadow-sky-200/25">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full active:bg-sky-100/80 transition-colors"
          type="button"
        >
          <X className="w-6 h-6 text-sky-900/90" />
        </button>
        <div className="flex-1 text-center min-w-0 px-2">
          <h2 className="font-semibold text-base text-sky-950 truncate">{conversationName} 的记忆库</h2>
          <p className="text-[11px] text-sky-700/70 truncate">
            {memoryPage === 'daily' && browseDay
              ? `浏览 ${browseDay} · 日记 ${dayDiaryEntries.length} · 纪要 ${daySummaryEntries.length}`
              : `条目 ${memoriesForList.length} · 日记篇 ${roleDiaries.length} · 纪要 ${chatSummaryMemories.length}`}
          </p>
        </div>
        <div className="w-10 shrink-0" />
      </div>

      {/* 翻页导航 */}
      <div className="shrink-0 px-2 pt-2 pb-1">
        <div className="flex rounded-2xl bg-white/95 p-1 border border-sky-100/90 shadow-inner shadow-sky-100/50">
          {pageTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMemoryPage(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl text-[10px] font-semibold transition-all ${
                memoryPage === id
                  ? 'bg-white text-sky-800 shadow-md shadow-sky-200/40 ring-1 ring-sky-100/80'
                  : 'text-sky-800/55 hover:text-sky-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${memoryPage === id ? 'text-sky-600' : 'text-sky-700/50'}`} strokeWidth={memoryPage === id ? 2.2 : 1.8} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto min-h-0 px-3 pt-2 pb-3">
          {/* —— 概览页 —— */}
          {memoryPage === 'overview' ? (
            <div className="rounded-3xl border border-sky-100/80 bg-white shadow-lg shadow-sky-200/25 p-4 space-y-3">
              <div className="text-xs font-semibold text-sky-800/80 tracking-wide">今日一览</div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 text-white p-3 shadow-md shadow-sky-300/30">
                  <div className="text-[9px] uppercase tracking-wide opacity-90">记忆条目</div>
                  <div className="text-2xl font-bold tabular-nums mt-0.5">{memoriesForList.length}</div>
                  <div className="text-[9px] opacity-85 mt-0.5">不含客观纪要</div>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white p-3 shadow-md shadow-emerald-300/25">
                  <div className="text-[9px] uppercase tracking-wide opacity-90">角色日记</div>
                  <div className="text-2xl font-bold tabular-nums mt-0.5">{roleDiaries.length}</div>
                  <div className="text-[9px] opacity-85 mt-0.5">第一人称</div>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 text-white p-3 shadow-md shadow-amber-200/30">
                  <div className="text-[9px] uppercase tracking-wide opacity-90">聊天纪要</div>
                  <div className="text-2xl font-bold tabular-nums mt-0.5">{chatSummaryMemories.length}</div>
                  <div className="text-[9px] opacity-85 mt-0.5">客观整理</div>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-violet-400 to-indigo-500 text-white p-3 shadow-md shadow-violet-300/25">
                  <div className="text-[9px] uppercase tracking-wide opacity-90">画像</div>
                  <div className="text-2xl font-bold tabular-nums mt-0.5">
                    {(aiSelfProfileText ? 1 : 0) + (userProfileText ? 1 : 0)}
                  </div>
                  <div className="text-[9px] opacity-85 mt-0.5">已填项</div>
                </div>
              </div>
              <p className="text-[11px] text-sky-800/55 leading-relaxed text-center pt-1">
                点下方「日记」按日期翻页查看；「资料」管理画像与记忆条目。
              </p>
            </div>
          ) : null}

          {/* —— 设置页 —— */}
          {memoryPage === 'settings' ? (
          <div className="rounded-3xl border border-sky-100/80 bg-white shadow-lg shadow-sky-200/25 ring-1 ring-sky-50 overflow-hidden">
            <div className="p-3.5 sm:p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableAutoSummary}
                    onChange={(e) => setSettings({ ...settings, enableAutoSummary: e.target.checked })}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                  />
                  自动记忆总结
                </label>
                <button
                  type="button"
                  onClick={handleUpdateSettings}
                  className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98] transition-all"
                >
                  保存
                </button>
              </div>

              {settings.enableAutoSummary ? (
                <div className="space-y-2.5">
                  <div className="rounded-2xl bg-slate-50/90 border border-slate-100 p-2.5 space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">私聊 · 阶段间隔</div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {presetIntervals.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            setIntervalMode('preset');
                            setSettings({ ...settings, autoSummaryInterval: n });
                          }}
                          className={`h-7 min-w-[2.25rem] px-2 rounded-full text-[11px] font-semibold border transition-all ${
                            intervalMode === 'preset' && settings.autoSummaryInterval === n
                              ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                              : 'border-slate-200/90 bg-white text-slate-700 hover:border-indigo-300'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setIntervalMode('custom');
                          const v = Math.max(50, settings.autoSummaryInterval || 50);
                          setCustomInterval(v);
                          setSettings({ ...settings, autoSummaryInterval: v });
                        }}
                        className={`h-7 px-2 rounded-full text-[11px] font-semibold border transition-all ${
                          intervalMode === 'custom'
                            ? 'border-violet-600 bg-violet-600 text-white'
                            : 'border-slate-200/90 bg-white text-slate-600'
                        }`}
                      >
                        其它
                      </button>
                      {intervalMode === 'custom' ? (
                        <input
                          type="number"
                          min={50}
                          max={500}
                          value={customInterval}
                          onChange={(e) => {
                            const value = Math.max(50, Math.min(500, Number(e.target.value) || 50));
                            setCustomInterval(value);
                            setSettings({ ...settings, autoSummaryInterval: value });
                          }}
                          className="h-7 w-14 rounded-lg border border-slate-200 bg-white text-center text-xs font-semibold text-slate-800"
                        />
                      ) : null}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug">私聊引擎按至少每 50 条做阶段总结；此处为触发间隔，建议 ≥50。</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50/90 border border-slate-100 p-2.5 space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">群聊 · 总结间隔</div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {groupPresetIntervals.map((n) => (
                        <button
                          key={`g-${n}`}
                          type="button"
                          onClick={() => {
                            setGroupIntervalMode('preset');
                            setSettings({ ...settings, groupSummaryInterval: n });
                          }}
                          className={`h-7 min-w-[2.25rem] px-2 rounded-full text-[11px] font-semibold border transition-all ${
                            groupIntervalMode === 'preset' && currentGroupInterval === n
                              ? 'border-teal-600 bg-teal-600 text-white shadow-sm'
                              : 'border-slate-200/90 bg-white text-slate-700 hover:border-teal-300'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setGroupIntervalMode('custom');
                          const v = Math.max(10, currentGroupInterval || 50);
                          setCustomGroupInterval(v);
                          setSettings({ ...settings, groupSummaryInterval: v });
                        }}
                        className={`h-7 px-2 rounded-full text-[11px] font-semibold border transition-all ${
                          groupIntervalMode === 'custom'
                            ? 'border-teal-700 bg-teal-700 text-white'
                            : 'border-slate-200/90 bg-white text-slate-600'
                        }`}
                      >
                        其它
                      </button>
                      {groupIntervalMode === 'custom' ? (
                        <input
                          type="number"
                          min={10}
                          max={500}
                          value={customGroupInterval}
                          onChange={(e) => {
                            const value = Math.max(10, Math.min(500, Number(e.target.value) || 10));
                            setCustomGroupInterval(value);
                            setSettings({ ...settings, groupSummaryInterval: value });
                          }}
                          className="h-7 w-14 rounded-lg border border-slate-200 bg-white text-center text-xs font-semibold text-slate-800"
                        />
                      ) : null}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug">群聊消息多时可略调大，减轻 API 压力。</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          ) : null}

          {memoryPage === 'daily' ? (
            <div className="space-y-3">
              <div className="rounded-3xl border border-sky-100/80 bg-white shadow-lg shadow-sky-200/20 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={goBrowsePrevDay}
                    disabled={browseDayIndex < 0 || browseDayIndex >= sortedDisplayDays.length - 1}
                    className="shrink-0 p-2 rounded-xl bg-sky-50 text-sky-800 border border-sky-100 disabled:opacity-30 disabled:pointer-events-none active:scale-95"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto py-0.5">
                    {sortedDisplayDays.map((day) => {
                      const wd = weekdayShortFromDayKey(day);
                      const active = browseDay === day;
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => setBrowseDay(day)}
                          className={`shrink-0 flex flex-col items-center px-3 py-2 rounded-2xl border text-center transition-all ${
                            active
                              ? 'bg-white border-white shadow-md shadow-sky-200/40 text-sky-900 ring-1 ring-sky-100/80'
                              : 'bg-sky-50/40 border-sky-100/60 text-sky-800/60 hover:bg-white/70'
                          }`}
                        >
                          <span className="text-[10px] font-medium opacity-80">周{wd}</span>
                          <span className="text-xs font-bold tabular-nums">{day.slice(5).replace('-', '/')}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={goBrowseNextDay}
                    disabled={browseDayIndex <= 0}
                    className="shrink-0 p-2 rounded-xl bg-sky-50 text-sky-800 border border-sky-100 disabled:opacity-30 disabled:pointer-events-none active:scale-95"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-[10px] text-center text-sky-700/55">左右翻页切换日期 · 点选上方日期</p>
              </div>

              {!browseDay ? (
                <div className="rounded-3xl border border-dashed border-sky-200 bg-sky-50/80 p-8 text-center text-sm text-sky-800/70">
                  暂无带日期的日记或纪要
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-3xl border border-emerald-100 bg-white p-3 shadow-md shadow-emerald-100/30">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarDays className="w-4 h-4 text-emerald-600" />
                      <div>
                        <div className="text-xs font-bold text-emerald-900">角色日记</div>
                        <div className="text-[10px] text-emerald-700/70">第一人称 · {browseDay}</div>
                      </div>
                    </div>
                    {dayDiaryEntries.length === 0 ? (
                      <div className="text-xs text-emerald-800/50 py-4 text-center">该日无日记</div>
                    ) : (
                      <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-0.5">
                        {dayDiaryEntries.map((diary) => {
                          const expanded = !!expandedDiaryDays[diary.id];
                          return (
                            <div key={diary.id} className="rounded-2xl border border-emerald-50 bg-emerald-50/30 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => toggleDiaryDay(diary.id)}
                                className="w-full flex items-center justify-between gap-2 p-2.5 text-left"
                              >
                                <span className="text-[10px] text-emerald-800/70 truncate">
                                  {new Date(diary.timestamp).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {expanded ? <ChevronUp className="w-4 h-4 shrink-0 text-emerald-700" /> : <ChevronDown className="w-4 h-4 shrink-0 text-emerald-700" />}
                              </button>
                              {!expanded ? (
                                <div className="px-2.5 pb-2.5 text-xs text-emerald-900/85 line-clamp-3 leading-snug">
                                  {diary.content.replace(/\s+/g, ' ').slice(0, 120)}
                                  {diary.content.length > 120 ? '…' : ''}
                                </div>
                              ) : (
                                <div className="px-2.5 pb-2.5 text-sm text-emerald-950 whitespace-pre-wrap border-t border-emerald-100/80 bg-white/60">
                                  {diary.content}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl border border-amber-100 bg-white p-3 shadow-md shadow-amber-100/30">
                    <div className="text-xs font-bold text-amber-900 mb-0.5">客观聊天纪要</div>
                    <div className="text-[10px] text-amber-800/65 mb-2">第三人称 · {browseDay}</div>
                    {daySummaryEntries.length === 0 ? (
                      <div className="text-xs text-amber-800/50 py-4 text-center">该日无纪要</div>
                    ) : (
                      <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-0.5">
                        {daySummaryEntries.map((row) => {
                          const expanded = !!expandedSummaryDays[row.id];
                          return (
                            <div key={row.id} className="rounded-2xl border border-amber-50 bg-amber-50/35 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => toggleSummaryDay(row.id)}
                                className="w-full flex items-center justify-between gap-2 p-2.5 text-left"
                              >
                                <span className="text-[10px] text-amber-900/70 truncate">
                                  {new Date(row.timestamp).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {expanded ? <ChevronUp className="w-4 h-4 text-amber-800" /> : <ChevronDown className="w-4 h-4 text-amber-800" />}
                              </button>
                              {!expanded ? (
                                <div className="px-2.5 pb-2.5 text-xs text-amber-950/90 line-clamp-3 leading-snug">
                                  {String(row.content || '').replace(/\s+/g, ' ').slice(0, 120)}
                                  {(row.content || '').length > 120 ? '…' : ''}
                                </div>
                              ) : (
                                <div className="px-2.5 pb-2.5 space-y-2 border-t border-amber-100/80 bg-white/70">
                                  <div className="text-sm text-amber-950 whitespace-pre-wrap">{row.content}</div>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMemory(row.id)}
                                    className="text-xs text-red-600 font-medium"
                                  >
                                    删除
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {memoryPage === 'vault' ? (
            <div className="space-y-3">
        {/* 自我画像与用户画像（高优先级） */}
        <div className="mb-4 p-4 rounded-xl border border-purple-200 bg-purple-50">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="text-sm font-semibold text-purple-900">动态画像（角色视角，高于初始人设）</div>
            {!editingProfiles ? (
              <button
                onClick={() => setEditingProfiles(true)}
                className="text-xs px-2 py-1 rounded border border-purple-300 text-purple-700 hover:bg-purple-100 shrink-0"
              >
                编辑
              </button>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleSaveProfiles}
                  className="text-xs px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-700"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setEditingProfiles(false);
                    refreshFromBank();
                  }}
                  className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  取消
                </button>
              </div>
            )}
          </div>
          <p className="text-[10px] text-purple-800/75 leading-snug mb-3">
            两段均按角色设定里的「我」书写：自我=我对我自己的认知；用户=我对聊天对象的认知。均可带主观色彩，勿写成客观简历。
          </p>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-purple-700 mb-1">「我」对我自己的认知</div>
              {editingProfiles ? (
                <textarea
                  value={aiSelfProfileText}
                  onChange={(e) => setAiSelfProfileText(e.target.value)}
                  rows={3}
                  className="w-full text-sm bg-white border border-purple-200 rounded-lg p-2 text-gray-700 resize-none"
                  placeholder="用第一人称「我」写：在角色设定下，我如何看自己（可带主观感受）"
                />
              ) : (
                <div className="text-sm bg-white border border-purple-100 rounded-lg p-2 text-gray-700 whitespace-pre-wrap">
                  {aiSelfProfileText || '暂无（记忆引擎会按角色设定与聊天自动更新）'}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-purple-700 mb-1">「我」对用户的认知</div>
              {editingProfiles ? (
                <textarea
                  value={userProfileText}
                  onChange={(e) => setUserProfileText(e.target.value)}
                  rows={3}
                  className="w-full text-sm bg-white border border-purple-200 rounded-lg p-2 text-gray-700 resize-none"
                  placeholder="用第一人称「我」写：我眼中的用户、关系与感受（可带主观印象）"
                />
              ) : (
                <div className="text-sm bg-white border border-purple-100 rounded-lg p-2 text-gray-700 whitespace-pre-wrap">
                  {userProfileText || '暂无（记忆引擎会按角色设定与聊天自动更新）'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 添加记忆按钮 */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-purple-600 mb-4"
          >
            <Plus className="w-5 h-5" />
            <span>手动添加记忆</span>
          </button>
        )}

        {/* 添加记忆表单 */}
        {showAddForm && (
          <div className="mb-4 p-4 bg-purple-50 rounded-xl space-y-3">
            <textarea
              value={newMemoryContent}
              onChange={(e) => setNewMemoryContent(e.target.value)}
              placeholder="输入记忆内容..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
              rows={3}
            />
            <div className="flex gap-2">
              <select
                value={newMemoryCategory}
                onChange={(e) => setNewMemoryCategory(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={newMemoryImportance}
                onChange={(e) => setNewMemoryImportance(e.target.value as 'low' | 'medium' | 'high')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="low">⭐ 低</option>
                <option value="medium">⭐⭐ 中</option>
                <option value="high">⭐⭐⭐ 高</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddMemory}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                添加
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewMemoryContent('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 记忆列表 */}
        {memoriesForList.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Brain className="w-16 h-16 mx-auto mb-3 opacity-20" />
            <p className="text-lg">
              {memories.filter((m) => m.category !== '聊天总结').length === 0
                ? '还没有任何记忆条目'
                : '该日期没有记忆条目'}
            </p>
            <p className="text-sm mt-1">
              {memories.filter((m) => m.category !== '聊天总结').length === 0
                ? '记忆会在对话中自动生成'
                : '可在「日记」页按日期查看当日相关记忆'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(memoriesByCategory).map(([category, categoryMemories]) => (
              <div key={category} className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${getCategoryColor(category)}`}>
                    {category}
                  </span>
                  <span className="text-gray-400">({categoryMemories.length})</span>
                </h3>
                
                {categoryMemories.map((memory) => (
                  <div
                    key={memory.id}
                    className="p-3 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm">{memory.content}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                          <span>{new Date(memory.timestamp).toLocaleString('zh-CN')}</span>
                          {memory.autoGenerated && <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded">自动</span>}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleToggleImportance(memory.id, memory.importance)}
                          className={`p-1.5 hover:bg-gray-100 rounded-lg transition-colors ${getImportanceColor(memory.importance)}`}
                          title={`重要性：${memory.importance} (点击切换)`}
                        >
                          <Star className="w-4 h-4" fill="currentColor" />
                        </button>
                        <button
                          onClick={() => handleDeleteMemory(memory.id)}
                          className="p-1.5 hover:bg-red-100 text-gray-400 hover:text-red-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
            </div>
          ) : null}
        </div>
      </div>

      {/* 底部操作 */}
      {memories.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-200 flex justify-between items-center bg-white shrink-0">
          <button
            onClick={handleClearAll}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            清空所有记忆
          </button>
          <div className="text-xs text-gray-400">
            最多保存 {settings.maxMemories} 条记忆
          </div>
        </div>
      )}
    </div>
  );
}
