import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  Play,
  Pause,
  RotateCcw,
  Clock3,
  Timer,
  Hourglass,
  Users,
  CalendarDays,
  BarChart3,
  BookText,
  Check,
} from 'lucide-react';
import type { Conversation } from '../../types';
import { focusHabitStorage } from './storage';
import type {
  DailyJournalEntry,
  FocusSession,
  FocusTimerMode,
  FocusTodoItem,
  HabitCheckin,
  HabitItem,
  StudyRoomEvent,
  StudyRoomSession,
} from './types';

interface FocusHabitScreenProps {
  onBack: () => void;
  conversations: Conversation[];
}

type MainTab = 'focus' | 'plan' | 'study-room' | 'stats' | 'journal';
type StatsRange = 'day' | 'week' | 'month' | 'year' | 'total';

function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function keyFromDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sameMonth(dateKey: string, year: number, monthIndex: number): boolean {
  const [yy, mm] = dateKey.split('-').map(Number);
  return yy === year && mm === monthIndex + 1;
}

function clipText(input: string | undefined, fallback: string, max = 22): string {
  const text = (input || '').trim();
  if (!text) return fallback;
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function getTimePhase(ts: number): '凌晨' | '早上' | '中午' | '下午' | '晚上' {
  const hour = new Date(ts).getHours();
  if (hour < 5) return '凌晨';
  if (hour < 11) return '早上';
  if (hour < 14) return '中午';
  if (hour < 19) return '下午';
  return '晚上';
}

export default function FocusHabitScreen({ onBack, conversations }: FocusHabitScreenProps) {
  const [mainTab, setMainTab] = useState<MainTab>('focus');
  const [statsRange, setStatsRange] = useState<StatsRange>('day');
  const [mode, setMode] = useState<FocusTimerMode>('pomodoro');
  const [customMinutes, setCustomMinutes] = useState(45);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedBeforeStart, setElapsedBeforeStart] = useState(0);
  const [nowTs, setNowTs] = useState(Date.now());
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [todos, setTodos] = useState<FocusTodoItem[]>([]);
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [checkins, setCheckins] = useState<HabitCheckin[]>([]);
  const [journals, setJournals] = useState<DailyJournalEntry[]>([]);
  const [studyRoomSessions, setStudyRoomSessions] = useState<StudyRoomSession[]>([]);
  const [studyRoomEvents, setStudyRoomEvents] = useState<StudyRoomEvent[]>([]);
  const [currentStudySessionId, setCurrentStudySessionId] = useState<string | null>(null);
  const [selectedAiIds, setSelectedAiIds] = useState<string[]>([]);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [journalText, setJournalText] = useState('');
  const [journalFood, setJournalFood] = useState('');
  const [journalWorkout, setJournalWorkout] = useState('');

  const aiCandidates = useMemo(
    () => conversations.filter((c) => c.type === 'private').slice(0, 8),
    [conversations]
  );

  useEffect(() => {
    void (async () => {
      const [loadedSessions, loadedTodos, loadedHabits, loadedCheckins, loadedJournals, loadedStudySessions, loadedStudyEvents] = await Promise.all([
        focusHabitStorage.loadSessions(),
        focusHabitStorage.loadTodos(),
        focusHabitStorage.loadHabits(),
        focusHabitStorage.loadCheckins(),
        focusHabitStorage.loadJournals(),
        focusHabitStorage.loadStudyRoomSessions(),
        focusHabitStorage.loadStudyRoomEvents(),
      ]);

      setSessions(loadedSessions);
      setCheckins(loadedCheckins);
      setJournals(loadedJournals);
      setStudyRoomSessions(loadedStudySessions);
      setStudyRoomEvents(loadedStudyEvents);

      if (loadedTodos.length > 0) {
        setTodos(loadedTodos);
      } else {
        const seeded: FocusTodoItem[] = [
          { id: 'todo-1', title: '完成 2 轮番茄钟', status: 'in_progress', updatedAt: Date.now() },
          { id: 'todo-2', title: '阅读 20 分钟', status: 'todo', updatedAt: Date.now() },
          { id: 'todo-3', title: '复盘今日进展', status: 'done', updatedAt: Date.now() },
        ];
        setTodos(seeded);
        await focusHabitStorage.saveTodos(seeded);
      }

      if (loadedHabits.length > 0) {
        setHabits(loadedHabits);
      } else {
        const seededHabits: HabitItem[] = [
          { id: 'habit_tea', name: '喝奶茶', icon: '🧋', color: '#f5b5b5', startDate: todayKey() },
          { id: 'habit_read', name: '阅读', icon: '📖', color: '#f8d58f', startDate: todayKey() },
          { id: 'habit_walk', name: '散步', icon: '🚶', color: '#a6d8b2', startDate: todayKey() },
        ];
        setHabits(seededHabits);
        await focusHabitStorage.saveHabits(seededHabits);
      }
    })();
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNowTs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    const today = journals.find((j) => j.date === todayKey());
    setJournalFood(today?.food ?? '');
    setJournalWorkout(today?.workout ?? '');
    setJournalText(today?.achievements ?? '');
  }, [journals]);

  const targetMs = useMemo(() => {
    if (mode === 'pomodoro') return 25 * 60 * 1000;
    if (mode === 'countdown') return Math.max(1, customMinutes) * 60 * 1000;
    return null;
  }, [mode, customMinutes]);

  const elapsedMs = useMemo(() => {
    if (!running || !startedAt) return elapsedBeforeStart;
    return elapsedBeforeStart + (nowTs - startedAt);
  }, [running, startedAt, elapsedBeforeStart, nowTs]);

  const displayMs = useMemo(() => {
    if (targetMs == null) return elapsedMs;
    return Math.max(0, targetMs - elapsedMs);
  }, [targetMs, elapsedMs]);

  const persistSession = async (completed: boolean): Promise<FocusSession> => {
    const start = startedAt ? startedAt - elapsedBeforeStart : Date.now() - elapsedMs;
    const session: FocusSession = {
      id: `focus_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      mode,
      startedAt: start,
      endedAt: Date.now(),
      elapsedMs: elapsedMs,
      targetMs: targetMs ?? undefined,
      completed,
      selectedAiIds,
    };
    const next = [session, ...sessions].slice(0, 300);
    setSessions(next);
    await focusHabitStorage.saveSessions(next);
    return session;
  };

  useEffect(() => {
    if (!running || targetMs == null) return;
    if (elapsedMs < targetMs) return;
    setRunning(false);
    void (async () => {
      const saved = await persistSession(true);
      await endStudyRoomSession(`本轮专注已完成（${formatMs(saved.elapsedMs)}），大家辛苦了。`);
    })();
  }, [running, targetMs, elapsedMs]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStart = () => {
    if (running) return;
    if (selectedAiIds.length > 0) {
      const studySessionId = `study_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const roomSession: StudyRoomSession = {
        sessionId: studySessionId,
        focusSessionId: '',
        selectedAiIds,
        status: 'active',
        createdAt: Date.now(),
      };
      const nextSessions = [roomSession, ...studyRoomSessions].slice(0, 120);
      setStudyRoomSessions(nextSessions);
      setCurrentStudySessionId(studySessionId);
      void focusHabitStorage.saveStudyRoomSessions(nextSessions);
    }
    setStartedAt(Date.now());
    setRunning(true);
  };

  const handlePause = () => {
    if (!running) return;
    setRunning(false);
    setElapsedBeforeStart(elapsedMs);
  };

  const handleStopAndSave = async () => {
    if (elapsedMs <= 0) return;
    setRunning(false);
    const isCompleted = targetMs == null ? true : elapsedMs >= targetMs;
    const saved = await persistSession(isCompleted);
    await endStudyRoomSession(`本轮专注已结束（${formatMs(saved.elapsedMs)}），已写入记录。`);
    setStartedAt(null);
    setElapsedBeforeStart(0);
  };

  const handleReset = () => {
    setRunning(false);
    setStartedAt(null);
    setElapsedBeforeStart(0);
    if (currentStudySessionId) {
      void endStudyRoomSession('本次专注已重置。');
    }
  };

  const addStudyRoomEvent = async (event: StudyRoomEvent) => {
    const nextEvents = [event, ...studyRoomEvents].slice(0, 400);
    setStudyRoomEvents(nextEvents);
    await focusHabitStorage.saveStudyRoomEvents(nextEvents);
  };

  const endStudyRoomSession = async (summaryLine: string) => {
    if (!currentStudySessionId) return;
    const nextSessions = studyRoomSessions.map((s) =>
      s.sessionId === currentStudySessionId ? { ...s, status: 'ended' as const } : s
    );
    setStudyRoomSessions(nextSessions);
    await focusHabitStorage.saveStudyRoomSessions(nextSessions);
    await addStudyRoomEvent({
      id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sessionId: currentStudySessionId,
      aiId: 'system',
      timestamp: Date.now(),
      eventType: 'leave_note',
      content: summaryLine,
    });
    setCurrentStudySessionId(null);
  };

  const toggleTodayCheckin = async (habitId: string) => {
    const date = todayKey();
    const existing = checkins.find((c) => c.habitId === habitId && c.date === date);
    let next: HabitCheckin[];
    if (existing) {
      next = checkins.filter((c) => c.id !== existing.id);
    } else {
      next = [
        ...checkins,
        {
          id: `checkin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          habitId,
          date,
          count: 1,
        },
      ];
    }
    setCheckins(next);
    await focusHabitStorage.saveCheckins(next);
  };

  const saveTodayJournal = async () => {
    const date = todayKey();
    const entry: DailyJournalEntry = {
      date,
      food: journalFood.trim(),
      workout: journalWorkout.trim(),
      achievements: journalText.trim(),
    };
    const other = journals.filter((j) => j.date !== date);
    const next = [entry, ...other].slice(0, 365);
    setJournals(next);
    await focusHabitStorage.saveJournals(next);
  };

  const todaySessions = useMemo(() => {
    const key = todayKey();
    return sessions.filter((s) => {
      const d = new Date(s.endedAt);
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return day === key;
    });
  }, [sessions]);

  const rangeSessions = useMemo(() => {
    const now = Date.now();
    if (statsRange === 'total') return sessions;
    const rangeMs =
      statsRange === 'day' ? 24 * 60 * 60 * 1000
      : statsRange === 'week' ? 7 * 24 * 60 * 60 * 1000
      : statsRange === 'month' ? 30 * 24 * 60 * 60 * 1000
      : 365 * 24 * 60 * 60 * 1000;
    return sessions.filter((s) => now - s.endedAt <= rangeMs);
  }, [sessions, statsRange]);

  const todayMinutes = useMemo(
    () => Math.round(todaySessions.reduce((sum, s) => sum + s.elapsedMs, 0) / 60000),
    [todaySessions]
  );
  const completedToday = useMemo(() => todaySessions.filter((s) => s.completed).length, [todaySessions]);
  const inProgressCount = useMemo(() => todos.filter((t) => t.status === 'in_progress').length, [todos]);
  const doneCount = useMemo(() => todos.filter((t) => t.status === 'done').length, [todos]);
  const todayCheckinCount = useMemo(() => checkins.filter((c) => c.date === todayKey()).length, [checkins]);
  const rangeMinutes = useMemo(
    () => Math.round(rangeSessions.reduce((sum, s) => sum + s.elapsedMs, 0) / 60000),
    [rangeSessions]
  );
  const rangeAvgMinutes = useMemo(() => {
    if (rangeSessions.length === 0) return 0;
    return Math.round(rangeMinutes / rangeSessions.length);
  }, [rangeMinutes, rangeSessions.length]);

  const selectedHabit = useMemo(
    () => habits.find((h) => h.id === selectedHabitId) ?? null,
    [habits, selectedHabitId]
  );
  const selectedHabitCheckins = useMemo(
    () => checkins.filter((c) => c.habitId === selectedHabitId),
    [checkins, selectedHabitId]
  );

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const monthCheckinDays = useMemo(() => {
    if (!selectedHabit) return 0;
    return selectedHabitCheckins.filter((c) => sameMonth(c.date, currentYear, currentMonth)).length;
  }, [selectedHabit, selectedHabitCheckins, currentYear, currentMonth]);

  const currentStudyEvents = useMemo(() => {
    if (!currentStudySessionId) return [];
    return studyRoomEvents
      .filter((e) => e.sessionId === currentStudySessionId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [studyRoomEvents, currentStudySessionId]);

  const latestStudySession = useMemo(() => studyRoomSessions[0] ?? null, [studyRoomSessions]);
  const latestStudyEvents = useMemo(() => {
    if (!latestStudySession) return [];
    return studyRoomEvents
      .filter((e) => e.sessionId === latestStudySession.sessionId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);
  }, [studyRoomEvents, latestStudySession]);

  useEffect(() => {
    if (!running || !currentStudySessionId || selectedAiIds.length === 0) return;

    let cancelled = false;
    let timerId: number | null = null;
    const phaseActivities: Record<string, string[]> = {
      凌晨: ['整理白天遗留任务', '低噪音复盘笔记', '收束今日计划'],
      早上: ['规划今日重点', '快速进入学习状态', '清理任务队列'],
      中午: ['做轻量复习', '校对上午结果', '补齐待办细项'],
      下午: ['深度处理核心任务', '推进卡住的部分', '完成阶段性产出'],
      晚上: ['总结全天进展', '整理明日计划', '收尾并记录反思'],
    };

    const schedule = () => {
      const delayMs = 15000 + Math.floor(Math.random() * 20000);
      timerId = window.setTimeout(async () => {
        if (cancelled) return;
        const pickedAi = selectedAiIds[Math.floor(Math.random() * selectedAiIds.length)];
        const ai = aiCandidates.find((item) => item.id === pickedAi);
        if (!ai) {
          schedule();
          return;
        }
        const ts = Date.now();
        const phase = getTimePhase(ts);
        const activity = phaseActivities[phase][Math.floor(Math.random() * phaseActivities[phase].length)];
        const settings = ai.characterSettings;
        const nickname = settings?.nickname || ai.name;
        const username = clipText(settings?.username, '当前身份');
        const systemPrompt = clipText(settings?.systemPrompt, '完成当前学习目标');
        const personality = clipText(settings?.personality, '稳定专注');
        const languageStyle = clipText(settings?.languageStyle, '简洁直接');
        const languageExample = clipText(settings?.languageExample, '继续推进');
        const memoryEvents = clipText(settings?.memoryEvents, '先做当下最重要的事');
        const eventType: StudyRoomEvent['eventType'] =
          Math.random() > 0.66 ? 'status' : Math.random() > 0.5 ? 'self_talk' : 'leave_note';
        const content =
          eventType === 'status'
            ? `${phase}｜${nickname}（${username}）正在${activity}，按「${systemPrompt}」执行，状态偏「${personality}」。`
            : eventType === 'self_talk'
              ? `${phase}｜${nickname}：我先按「${languageStyle}」节奏推进，像「${languageExample}」这种表达先记下来。`
              : `${phase}｜${nickname} 留言：当前优先级是「${memoryEvents}」，我会继续专注完成这段任务。`;
        await addStudyRoomEvent({
          id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          sessionId: currentStudySessionId,
          aiId: pickedAi,
          timestamp: ts,
          eventType,
          content,
        });
        schedule();
      }, delayMs);
    };

    schedule();

    return () => {
      cancelled = true;
      if (timerId) window.clearTimeout(timerId);
    };
  }, [running, currentStudySessionId, selectedAiIds, aiCandidates]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-[100dvh] md:h-full bg-[#f5f6f8] flex flex-col">
      <div className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2">
          <ChevronLeft className="w-6 h-6 text-zinc-700" />
        </button>
        <h1 className="text-lg font-semibold text-zinc-900">专注习惯应用</h1>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mainTab === 'focus' && (
          <>
            <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wide">
                <Timer className="w-4 h-4" />
                Focus Timer
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { id: 'pomodoro' as const, label: '番茄钟', icon: Hourglass },
                  { id: 'stopwatch' as const, label: '正计时', icon: Clock3 },
                  { id: 'countdown' as const, label: '倒计时', icon: Timer },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = mode === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (running) return;
                        setMode(item.id);
                        handleReset();
                      }}
                      className={`rounded-xl border px-3 py-2 flex items-center justify-center gap-1.5 text-sm ${
                        active ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-200 text-zinc-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
              {mode === 'countdown' && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-zinc-600">时长</span>
                  <input
                    type="number"
                    min={1}
                    max={240}
                    value={customMinutes}
                    disabled={running}
                    onChange={(e) => setCustomMinutes(Number(e.target.value) || 1)}
                    className="w-24 rounded-lg border border-zinc-200 px-2 py-1 text-sm"
                  />
                  <span className="text-sm text-zinc-500">分钟</span>
                </div>
              )}
              <div className="mt-4 rounded-2xl bg-zinc-50 border border-zinc-100 p-4 text-center">
                <div className="text-[44px] font-semibold leading-none text-zinc-900 tabular-nums">{formatMs(displayMs)}</div>
                <div className="mt-2 text-xs text-zinc-500">
                  {mode === 'pomodoro' ? '目标 25 分钟' : mode === 'countdown' ? `目标 ${customMinutes} 分钟` : '自由专注计时'}
                </div>
                <div className="mt-3 flex items-center justify-center gap-2">
                  {!running ? (
                    <button onClick={handleStart} className="px-4 py-2 rounded-full bg-zinc-900 text-white text-sm flex items-center gap-1.5">
                      <Play className="w-4 h-4" />
                      开始
                    </button>
                  ) : (
                    <button onClick={handlePause} className="px-4 py-2 rounded-full bg-amber-500 text-white text-sm flex items-center gap-1.5">
                      <Pause className="w-4 h-4" />
                      暂停
                    </button>
                  )}
                  <button onClick={handleStopAndSave} className="px-4 py-2 rounded-full border border-zinc-200 bg-white text-zinc-700 text-sm">
                    结束并记录
                  </button>
                  <button onClick={handleReset} className="px-3 py-2 rounded-full border border-zinc-200 bg-white text-zinc-700">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wide">
                <Users className="w-4 h-4" />
                AI 自习室（预留）
              </div>
              <div className="mt-2 text-xs text-zinc-500">后续将接入 AI 陪伴专注与随机留言；本期先记录邀请对象。</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {aiCandidates.map((ai) => {
                  const checked = selectedAiIds.includes(ai.id);
                  return (
                    <button
                      key={ai.id}
                      onClick={() =>
                        setSelectedAiIds((prev) =>
                          prev.includes(ai.id) ? prev.filter((id) => id !== ai.id) : [...prev, ai.id]
                        )
                      }
                      className={`px-3 py-1.5 rounded-full text-xs border ${
                        checked ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-200 text-zinc-700'
                      }`}
                    >
                      {ai.name}
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {mainTab === 'plan' && (
          <>
            <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-lg font-semibold text-zinc-900">习惯打卡</div>
              <div className="mt-3 space-y-2">
                {habits.map((habit) => {
                  const checkedToday = checkins.some((c) => c.habitId === habit.id && c.date === todayKey());
                  return (
                    <button
                      key={habit.id}
                      onClick={() => void toggleTodayCheckin(habit.id)}
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{habit.icon ?? '✅'}</span>
                        <span className="text-sm font-medium text-zinc-800">{habit.name}</span>
                      </div>
                      <span className={`w-6 h-6 rounded-full border flex items-center justify-center ${checkedToday ? 'bg-zinc-900 border-zinc-900 text-white' : 'border-zinc-300 text-transparent'}`}>
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
            <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-lg font-semibold text-zinc-900">计划 TODO</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-3">
                  <div className="text-xs text-zinc-500">已完成</div>
                  <div className="mt-1 text-2xl font-semibold text-zinc-900">{doneCount}</div>
                </div>
                <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-3">
                  <div className="text-xs text-zinc-500">进行中</div>
                  <div className="mt-1 text-2xl font-semibold text-zinc-900">{inProgressCount}</div>
                </div>
              </div>
            </section>
          </>
        )}

        {mainTab === 'stats' && (
          <>
            <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-zinc-900">统计数据</div>
                <div className="flex rounded-xl border border-zinc-200 overflow-hidden">
                  {[
                    ['day', '日'],
                    ['week', '周'],
                    ['month', '月'],
                    ['year', '年'],
                    ['total', '总'],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setStatsRange(id as StatsRange)}
                      className={`px-2.5 py-1.5 text-xs ${statsRange === id ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-zinc-50 p-3 border border-zinc-100">
                  <div className="text-xs text-zinc-500">总分钟</div>
                  <div className="text-2xl font-semibold text-zinc-900 mt-1">{rangeMinutes}</div>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3 border border-zinc-100">
                  <div className="text-xs text-zinc-500">次数</div>
                  <div className="text-2xl font-semibold text-zinc-900 mt-1">{rangeSessions.length}</div>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3 border border-zinc-100">
                  <div className="text-xs text-zinc-500">均时长</div>
                  <div className="text-2xl font-semibold text-zinc-900 mt-1">{rangeAvgMinutes}m</div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-lg font-semibold text-zinc-900">习惯年度热力</div>
              <div className="mt-3 space-y-2">
                {habits.map((habit) => {
                  const byMonth = Array.from({ length: 12 }, (_, month) => {
                    return Array.from({ length: 31 }, (_, dayIdx) => {
                      const dateKey = `${currentYear}-${String(month + 1).padStart(2, '0')}-${String(dayIdx + 1).padStart(2, '0')}`;
                      const checked = checkins.some((c) => c.habitId === habit.id && c.date === dateKey);
                      return checked;
                    });
                  });
                  return (
                    <button
                      key={habit.id}
                      onClick={() => setSelectedHabitId(habit.id)}
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-left"
                    >
                      <div className="text-sm font-medium text-zinc-800">{habit.icon ?? '✅'} {habit.name}</div>
                      <div className="mt-2 space-y-1">
                        {byMonth.map((days, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="w-6 text-[10px] text-zinc-400">{idx + 1}月</span>
                            <div className="grid grid-cols-31 gap-[2px]">
                              {days.map((on, i) => (
                                <span key={i} className={`w-2.5 h-2.5 rounded ${on ? 'bg-rose-300' : 'bg-zinc-200'}`} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {mainTab === 'journal' && (
          <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-lg font-semibold text-zinc-900">每日总结日记</div>
            <div className="mt-1 text-xs text-zinc-500">日期：{todayKey()}</div>
            <div className="mt-3 space-y-3">
              <div>
                <div className="text-xs text-zinc-500 mb-1">饮食 & 运动</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={journalFood}
                    onChange={(e) => setJournalFood(e.target.value)}
                    placeholder="饮食记录"
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                  />
                  <input
                    value={journalWorkout}
                    onChange={(e) => setJournalWorkout(e.target.value)}
                    placeholder="运动记录"
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1">今日成就</div>
                <textarea
                  value={journalText}
                  onChange={(e) => setJournalText(e.target.value)}
                  rows={6}
                  placeholder="记录今天的亮点、反思和明日计划..."
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm resize-none"
                />
              </div>
              <button
                onClick={() => void saveTodayJournal()}
                className="w-full py-2.5 rounded-xl bg-zinc-900 text-white text-sm"
              >
                保存今日总结
              </button>
            </div>
          </section>
        )}

        {mainTab === 'study-room' && (
          <>
            <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wide">
                <Users className="w-4 h-4" />
                AI 自习室
              </div>
              <div className="mt-2 text-sm text-zinc-600">专注开始前选择陪伴 AI，后续会接入随机留言与论坛流。</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {aiCandidates.map((ai) => {
                  const checked = selectedAiIds.includes(ai.id);
                  return (
                    <button
                      key={ai.id}
                      onClick={() =>
                        setSelectedAiIds((prev) =>
                          prev.includes(ai.id) ? prev.filter((id) => id !== ai.id) : [...prev, ai.id]
                        )
                      }
                      className={`px-3 py-1.5 rounded-full text-xs border ${
                        checked ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-200 text-zinc-700'
                      }`}
                    >
                      {ai.name}
                    </button>
                  );
                })}
              </div>
            </section>
            <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-lg font-semibold text-zinc-900">学习论坛（自习室动态）</div>
              <div className="mt-1 text-xs text-zinc-500">
                {currentStudySessionId
                  ? '专注进行中，AI 会随机发言...'
                  : latestStudySession
                    ? '显示最近一次自习室记录'
                    : '开始一次专注后，这里会出现动态'}
              </div>
              <div className="mt-3 space-y-2">
                {(currentStudySessionId ? currentStudyEvents : latestStudyEvents).map((event) => (
                  <div key={event.id} className="rounded-xl bg-zinc-50 border border-zinc-100 px-3 py-2 text-sm text-zinc-700">
                    {event.content}
                  </div>
                ))}
                {(currentStudySessionId ? currentStudyEvents : latestStudyEvents).length === 0 && (
                  <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-3 py-2 text-sm text-zinc-500">
                    暂无动态
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      <div className="border-t border-zinc-200 bg-white px-4 py-2 grid grid-cols-5 gap-1">
        {[
          { id: 'focus' as MainTab, label: '专注', icon: Timer },
          { id: 'plan' as MainTab, label: '计划', icon: CalendarDays },
          { id: 'study-room' as MainTab, label: '自习室', icon: Users },
          { id: 'stats' as MainTab, label: '统计', icon: BarChart3 },
          { id: 'journal' as MainTab, label: '日记', icon: BookText },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = mainTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id)}
              className={`py-1.5 rounded-xl flex flex-col items-center gap-0.5 ${
                active ? 'text-zinc-900' : 'text-zinc-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[11px]">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {selectedHabit && (
        <div className="fixed inset-0 z-50 bg-black/25 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-zinc-200 p-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-zinc-900">{selectedHabit.icon ?? '✅'} {selectedHabit.name}</div>
              <button onClick={() => setSelectedHabitId(null)} className="text-sm text-zinc-500">关闭</button>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-2.5 text-center">
                <div className="text-xl font-semibold text-zinc-900">{selectedHabitCheckins.length}</div>
                <div className="text-[11px] text-zinc-500">总打卡天数</div>
              </div>
              <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-2.5 text-center">
                <div className="text-xl font-semibold text-zinc-900">{selectedHabitCheckins.length}</div>
                <div className="text-[11px] text-zinc-500">总次数</div>
              </div>
              <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-2.5 text-center">
                <div className="text-xl font-semibold text-zinc-900">{monthCheckinDays}</div>
                <div className="text-[11px] text-zinc-500">本月打卡</div>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-zinc-200 p-3">
              <div className="text-sm font-medium text-zinc-800 mb-2">{currentYear}-{String(currentMonth + 1).padStart(2, '0')}</div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
                  <div key={w} className="text-zinc-400">{w}</div>
                ))}
                {Array.from({ length: new Date(currentYear, currentMonth + 1, 0).getDate() }, (_, i) => {
                  const day = i + 1;
                  const dateObj = new Date(currentYear, currentMonth, day);
                  const dateKey = keyFromDate(dateObj);
                  const checked = selectedHabitCheckins.some((c) => c.date === dateKey);
                  return (
                    <div
                      key={dateKey}
                      className={`h-8 rounded-lg flex items-center justify-center ${
                        checked ? 'bg-rose-200 text-rose-700 font-semibold' : 'bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
