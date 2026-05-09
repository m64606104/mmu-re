import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Bell,
  Database,
  Home,
  LayoutGrid,
  Mail,
  MessageCircle,
  Plus,
  Search,
  User,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import { Screen, ThemeSettings, UserProfile } from '../types';
import { parseDocument } from '../utils/enhancedDocumentParser';
import { smartLoad, smartSave } from '../utils/storage';

interface HomeScreenV2Props {
  onNavigate: (screen: Screen, conversationId?: string) => void;
  onOpenOopChat?: () => void;
  onSendOopMessage?: (text: string) => void;
  onSendOopDraft?: (payload: {
    text: string;
    attachments: Array<{
      id: string;
      kind: 'image' | 'document';
      name: string;
      mimeType: string;
      size: number;
      dataUrl?: string;
      content?: string;
    }>;
  }) => void;
  theme?: ThemeSettings;
  userProfile?: UserProfile;
}

interface SchedulePlan {
  title: string;
  note: string;
  updatedAt: number;
}

const wallpapers = {
  'gradient-1': 'bg-gradient-to-br from-rose-50 via-fuchsia-50 to-indigo-100',
  'gradient-2': 'bg-gradient-to-br from-cyan-50 via-sky-50 to-indigo-100',
  'gradient-3': 'bg-gradient-to-br from-amber-50 via-orange-50 to-rose-100',
  'gradient-4': 'bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100',
  'gradient-5': 'bg-gradient-to-br from-slate-50 via-slate-100 to-zinc-100',
  dark: 'bg-gradient-to-br from-zinc-900 via-zinc-950 to-black',
};

export default function HomeScreenV2({ onNavigate, onOpenOopChat, onSendOopMessage, onSendOopDraft, theme, userProfile }: HomeScreenV2Props) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [isStandaloneMode, setIsStandaloneMode] = useState(() =>
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
  const [oopInput, setOopInput] = useState('');
  const [showApps, setShowApps] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Array<{
    id: string;
    kind: 'image' | 'document';
    name: string;
    mimeType: string;
    size: number;
    dataUrl?: string;
    content?: string;
  }>>([]);
  const [isPickingAttachment, setIsPickingAttachment] = useState(false);
  const [schedulePlans, setSchedulePlans] = useState<Record<string, SchedulePlan>>({});
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [scheduleTitleInput, setScheduleTitleInput] = useState('');
  const [scheduleNoteInput, setScheduleNoteInput] = useState('');
  const [desktopMinimalMode, setDesktopMinimalMode] = useState(() => {
    try {
      return localStorage.getItem('home_desktop_minimal_mode') === '1';
    } catch {
      return false;
    }
  });
  const calendarScrollerRef = useRef<HTMLDivElement | null>(null);
  const calendarTodayRef = useRef<HTMLButtonElement | null>(null);

  const SCHEDULE_STORAGE_KEY = 'home_schedule_plans';
  const monthItems = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingDays = 3;
    const trailingDays = 3;
    const weekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const items: Array<{
      key: string;
      week: string;
      date: number;
      isToday: boolean;
      isCurrentMonth: boolean;
    }> = [];

    for (let offset = -leadingDays; offset < 0; offset += 1) {
      const d = new Date(year, month, 1 + offset);
      items.push({
        key: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
        week: weekLabels[d.getDay()],
        date: d.getDate(),
        isToday: d.toDateString() === now.toDateString(),
        isCurrentMonth: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const d = new Date(year, month, day);
      items.push({
        key: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
        week: weekLabels[d.getDay()],
        date: d.getDate(),
        isToday: d.toDateString() === now.toDateString(),
        isCurrentMonth: true,
      });
    }

    for (let day = 1; day <= trailingDays; day += 1) {
      const d = new Date(year, month + 1, day);
      items.push({
        key: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
        week: weekLabels[d.getDay()],
        date: d.getDate(),
        isToday: d.toDateString() === now.toDateString(),
        isCurrentMonth: false,
      });
    }

    return items;
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)');
    const updateStandalone = () => {
      const vv = window.visualViewport;
      const layoutHeight = document.documentElement.clientHeight || window.innerHeight;
      const obscured = vv ? Math.max(0, layoutHeight - vv.height - vv.offsetTop) : 0;
      const isStandaloneLikeViewport = Boolean(vv && vv.height >= 760 && obscured < 2);
      setIsStandaloneMode(
        isStandaloneLikeViewport ||
        media.matches ||
          ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
      );
    };
    updateStandalone();
    media.addEventListener?.('change', updateStandalone);
    window.visualViewport?.addEventListener('resize', updateStandalone);
    window.visualViewport?.addEventListener('scroll', updateStandalone);
    window.addEventListener('visibilitychange', updateStandalone);
    return () => {
      media.removeEventListener?.('change', updateStandalone);
      window.visualViewport?.removeEventListener('resize', updateStandalone);
      window.visualViewport?.removeEventListener('scroll', updateStandalone);
      window.removeEventListener('visibilitychange', updateStandalone);
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const loaded = await smartLoad(SCHEDULE_STORAGE_KEY);
      if (loaded && typeof loaded === 'object') {
        setSchedulePlans(loaded as Record<string, SchedulePlan>);
      }
    })();
  }, []);

  const openScheduleEditor = (dateKey: string) => {
    const existing = schedulePlans[dateKey];
    setSelectedDateKey(dateKey);
    setScheduleTitleInput(existing?.title || '');
    setScheduleNoteInput(existing?.note || '');
  };

  const closeScheduleEditor = () => {
    setSelectedDateKey(null);
    setScheduleTitleInput('');
    setScheduleNoteInput('');
  };

  const saveSchedulePlan = async () => {
    if (!selectedDateKey) return;
    const next: Record<string, SchedulePlan> = {
      ...schedulePlans,
      [selectedDateKey]: {
        title: scheduleTitleInput.trim(),
        note: scheduleNoteInput.trim(),
        updatedAt: Date.now(),
      },
    };
    setSchedulePlans(next);
    await smartSave(SCHEDULE_STORAGE_KEY, next);
    closeScheduleEditor();
  };

  const deleteSchedulePlan = async () => {
    if (!selectedDateKey) return;
    const next = { ...schedulePlans };
    delete next[selectedDateKey];
    setSchedulePlans(next);
    await smartSave(SCHEDULE_STORAGE_KEY, next);
    closeScheduleEditor();
  };

  const resetCalendarPosition = () => {
    const scroller = calendarScrollerRef.current;
    const todayEl = calendarTodayRef.current;
    if (!scroller || !todayEl) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const todayRect = todayEl.getBoundingClientRect();
    const deltaToCenter =
      todayRect.left + todayRect.width / 2 - (scrollerRect.left + scrollerRect.width / 2);
    const rawTarget = scroller.scrollLeft + deltaToCenter;
    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    const targetLeft = Math.min(Math.max(0, rawTarget), Math.max(0, maxScrollLeft));
    scroller.scrollTo({ left: targetLeft, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isMobile) return;
    const t = window.setTimeout(() => resetCalendarPosition(), 80);
    return () => window.clearTimeout(t);
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    const handleOutsideTap = (event: PointerEvent) => {
      const scroller = calendarScrollerRef.current;
      if (!scroller) return;
      if (scroller.contains(event.target as Node)) return;
      resetCalendarPosition();
    };
    document.addEventListener('pointerdown', handleOutsideTap);
    return () => document.removeEventListener('pointerdown', handleOutsideTap);
  }, [isMobile]);

  const currentWallpaper = theme?.wallpaper || 'gradient-5';
  const wallpaperClass =
    currentWallpaper === 'custom'
      ? ''
      : wallpapers[currentWallpaper as keyof typeof wallpapers] || wallpapers['gradient-5'];

  const wallpaperStyle =
    currentWallpaper === 'custom' && theme?.customWallpaper
      ? {
          backgroundImage: `url(${theme.customWallpaper})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : undefined;

  const apps = useMemo(
    () => [
      { id: 'social', name: '聊天中心', icon: MessageCircle, onClick: () => onNavigate('social') },
      { id: 'profile', name: '用户资料', icon: User, onClick: () => onNavigate('profile') },
      { id: 'oop', name: 'oop', icon: Sparkles, onClick: () => onOpenOopChat?.() },
      { id: 'database', name: '资料库', icon: Database, onClick: () => onNavigate('database') },
      { id: 'moments', name: '朋友圈', icon: Bell, onClick: () => onNavigate('moments') },
      { id: 'settings', name: '设置', icon: Settings, onClick: () => onNavigate('settings') },
      { id: 'guide', name: '使用说明', icon: Bell, onClick: () => onNavigate('guide') },
      { id: 'focus-habit', name: '专注习惯', icon: BarChart3, onClick: () => onNavigate('focus-habit') },
      // 大模块不在首页显眼处，但仍可从“更多应用”进入
      { id: 'shopping', name: '花多多', icon: LayoutGrid, onClick: () => onNavigate('shopping') },
      { id: 'contacts', name: '联系人', icon: MessageCircle, onClick: () => onNavigate('contacts') },
      { id: 'worldbook', name: '世界书', icon: Database, onClick: () => onNavigate('worldbook') },
    ],
    [onNavigate, onOpenOopChat]
  );

  const weeklyScheduleCount = useMemo(() => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    return Object.values(schedulePlans).filter((plan) => now - plan.updatedAt <= weekMs).length;
  }, [schedulePlans]);

  const weeklyActiveDays = useMemo(() => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const dayKeys = new Set<string>();
    Object.values(schedulePlans).forEach((plan) => {
      if (now - plan.updatedAt <= weekMs) {
        dayKeys.add(new Date(plan.updatedAt).toDateString());
      }
    });
    return dayKeys.size;
  }, [schedulePlans]);

  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) return '凌晨了，注意休息';
    if (hour < 11) return '早上好';
    if (hour < 14) return '中午好';
    if (hour < 19) return '下午好';
    return '晚上好';
  }, []);

  const handlePickAttachments = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsPickingAttachment(true);
    try {
      const picked = Array.from(files);
      const built = await Promise.all(
        picked.map(async (file) => {
          const id = `oop_file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const isImage = (file.type || '').startsWith('image/');
          if (isImage) {
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve((reader.result as string) || '');
              reader.onerror = () => reject(reader.error || new Error('读取图片失败'));
              reader.readAsDataURL(file);
            });
            return {
              id,
              kind: 'image' as const,
              name: file.name,
              mimeType: file.type || 'image/*',
              size: file.size,
              dataUrl,
            };
          }
          let content = '';
          try {
            content = (await parseDocument(file)).trim();
          } catch {
            content = '';
          }
          return {
            id,
            kind: 'document' as const,
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            content,
          };
        })
      );
      setPendingAttachments((prev) => [...prev, ...built]);
    } finally {
      setIsPickingAttachment(false);
    }
  };

  const trySendOop = () => {
    const text = oopInput.trim();
    if (!text && pendingAttachments.length === 0) return;
    if (pendingAttachments.length > 0) {
      onSendOopDraft?.({
        text,
        attachments: pendingAttachments,
      });
    } else {
      onSendOopMessage?.(text);
    }
    setOopInput('');
    setPendingAttachments([]);
  };

  if (isMobile) {
    const today = new Date();

    return (
      <div data-ui="screen-home" className={`h-[100dvh] md:h-full relative overflow-hidden ${wallpaperClass}`} style={wallpaperStyle}>
        <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px]" />
        <div className="relative z-10 h-full flex flex-col px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onNavigate('profile')}
              className="w-12 h-12 rounded-full bg-zinc-100 overflow-hidden border border-zinc-200 flex items-center justify-center"
            >
              {userProfile?.avatar ? (
                <img src={userProfile.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-zinc-700 font-semibold">{(userProfile?.username || 'M').slice(0, 1).toUpperCase()}</span>
              )}
            </button>
            <div className="text-center">
              <div className="text-[22px] leading-6 font-semibold text-zinc-900">Hello, {userProfile?.username || 'Sandra'}</div>
              <div className="text-sm text-zinc-500 mt-1">
                {today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
            <button
              className="w-12 h-12 rounded-full border border-zinc-200 bg-white flex items-center justify-center text-zinc-500"
              title="搜索（预留）"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pb-20 pt-4">
            <div className="relative rounded-[32px] px-1.5 py-2">
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -bottom-3 w-[75%] h-7 rounded-[999px] bg-[radial-gradient(75%_100%_at_50%_50%,rgba(129,140,248,0.46),rgba(167,139,250,0.26)_62%,rgba(255,255,255,0)_100%)] blur-xl" />
              <div className="relative rounded-[26px] bg-white p-3 border border-zinc-200 shadow-none">
                {pendingAttachments.length > 0 && (
                  <div className="mb-2 flex items-center gap-2 overflow-x-auto">
                    {pendingAttachments.map((file) => (
                      <div
                        key={file.id}
                        className="max-w-[180px] px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-[11px] text-zinc-700 flex items-center gap-2 flex-shrink-0"
                      >
                        <span className="inline-flex w-4 h-4 rounded bg-zinc-200 items-center justify-center text-[9px]">
                          {file.kind === 'image' ? '图' : '文'}
                        </span>
                        <span className="truncate">{file.name}</span>
                        <button
                          onClick={() => setPendingAttachments((prev) => prev.filter((item) => item.id !== file.id))}
                          className="text-zinc-400 hover:text-zinc-700"
                          title="移除"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-11 h-11 rounded-2xl overflow-hidden border border-zinc-200 bg-white flex-shrink-0">
                    <img
                      src="avatars/oop-dialog.png"
                      alt="oop"
                      className="w-full h-full object-cover scale-125"
                      draggable={false}
                    />
                  </div>
                  <input
                    value={oopInput}
                    onChange={(e) => setOopInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        trySendOop();
                      }
                    }}
                    placeholder="和 oop 快捷对话..."
                    className="flex-1 bg-transparent outline-none text-sm text-zinc-900 placeholder:text-zinc-400 h-10"
                  />
                  <button
                    onClick={trySendOop}
                    className="px-3 py-1.5 rounded-full bg-zinc-900 text-white text-xs"
                  >
                    发送
                  </button>
                </div>
                <div className="mt-2 flex justify-end">
                  <label
                    className="w-8 h-8 rounded-full border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 flex items-center justify-center cursor-pointer"
                    title="添加图片/文件"
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/*,.txt,.md,.markdown,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                      className="hidden"
                      disabled={isPickingAttachment}
                      onChange={(e) => {
                        handlePickAttachments(e.target.files);
                        e.currentTarget.value = '';
                      }}
                    />
                    <Plus className="w-4 h-4" />
                  </label>
                </div>
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {['总结文档', '写计划', '润色文本'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setOopInput(s)}
                      className="px-3 py-1 rounded-full text-xs bg-zinc-100 text-zinc-600 whitespace-nowrap"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative mt-3">
              <div
                ref={calendarScrollerRef}
                className="flex gap-1 overflow-x-auto pb-1"
              >
                {monthItems.map((item) => (
                  <button
                    ref={item.isToday ? calendarTodayRef : null}
                    key={item.key}
                    onClick={() => openScheduleEditor(item.key)}
                    className={`w-[42px] h-[56px] rounded-[16px] border flex-shrink-0 flex flex-col items-center justify-center select-none ${
                      item.isToday
                        ? 'bg-zinc-900 border-zinc-900 text-white'
                        : item.isCurrentMonth
                          ? 'bg-white border-zinc-200 text-zinc-500'
                          : 'bg-zinc-50 border-zinc-100 text-zinc-400'
                    }`}
                  >
                    <span className="text-[11px]">{item.week}</span>
                    <span className="text-[18px] mt-0.5 leading-4">{item.date}</span>
                    {schedulePlans[item.key] && (
                      <span className={`mt-1 w-1.5 h-1.5 rounded-full ${item.isToday ? 'bg-white/90' : 'bg-violet-500'}`} />
                    )}
                  </button>
                ))}
              </div>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-white via-white/80 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-white via-white/80 to-transparent" />
            </div>

            <div className="mt-7">
              <div className="text-[30px] leading-8 font-semibold text-zinc-900">Your apps</div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <button
                  onClick={() => onNavigate('social')}
                  className="rounded-[24px] bg-amber-300 p-4 text-left min-h-[188px]"
                >
                  <div className="h-12 flex items-center justify-center">
                    <div
                      className="text-[32px] font-semibold tracking-[0.015em]"
                      style={{
                        fontFamily: '"SF Pro Display","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif',
                        color: '#18181b',
                      }}
                    >
                      聊天
                    </div>
                  </div>
                  <div className="mt-4 flex justify-center">
                    <MessageCircle className="w-11 h-11 text-zinc-800" strokeWidth={1.8} />
                  </div>
                </button>
                <div className="space-y-3">
                  <button
                    onClick={() => onNavigate('letterbox')}
                    className="rounded-[24px] bg-blue-300 p-4 text-left h-[132px] w-full"
                  >
                    <div className="h-11 flex items-center justify-center">
                      <div
                        className="text-[27px] font-semibold tracking-[0.01em] text-zinc-900"
                        style={{ fontFamily: '"SF Pro Display","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif' }}
                      >
                        信箱
                      </div>
                    </div>
                    <div className="mt-3 flex justify-center">
                      <Mail className="w-9 h-9 text-zinc-800" strokeWidth={1.8} />
                    </div>
                  </button>
                  <div className="rounded-[24px] bg-fuchsia-300 p-3 h-[62px] flex items-center justify-around">
                    <button
                      onClick={() => onNavigate('database')}
                      className="w-9 h-9 rounded-full bg-white/75 text-zinc-700 flex items-center justify-center"
                    >
                      <Database className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onNavigate('settings')}
                      className="w-9 h-9 rounded-full bg-white/75 text-zinc-700 flex items-center justify-center"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onNavigate('theme')}
                      className="w-9 h-9 rounded-full bg-white/75 text-zinc-700 flex items-center justify-center"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className="absolute left-0 right-0 px-5"
            style={{ bottom: isStandaloneMode ? '30px' : '8px' }}
          >
            <div className="rounded-full bg-zinc-950 px-3 py-2 flex items-center justify-between">
              <button
                onClick={() => {}}
                className="w-12 h-12 rounded-full bg-white text-zinc-900 flex items-center justify-center"
                title="首页"
              >
                <Home className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowApps(true)}
                className="w-12 h-12 rounded-full text-white/90 flex items-center justify-center"
                title="全部应用"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => {}}
                className="w-12 h-12 rounded-full text-white/90 flex items-center justify-center"
                title="预留功能"
              >
                <BarChart3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => onNavigate('profile')}
                className="w-12 h-12 rounded-full text-white/90 flex items-center justify-center"
                title="用户信息"
              >
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {selectedDateKey && (
          <div className="absolute inset-0 z-50 bg-black/25 backdrop-blur-[2px] flex items-center justify-center p-5">
            <div className="w-full max-w-sm rounded-2xl bg-white border border-zinc-200 shadow-xl p-4">
              <div className="text-sm text-zinc-500">日程计划</div>
              <div className="text-base font-semibold text-zinc-900 mt-0.5">日期：{selectedDateKey}</div>
              <div className="mt-3 space-y-3">
                <input
                  value={scheduleTitleInput}
                  onChange={(e) => setScheduleTitleInput(e.target.value)}
                  placeholder="待办标题（例如：和 oo1 复盘）"
                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 text-sm outline-none focus:border-violet-400"
                />
                <textarea
                  value={scheduleNoteInput}
                  onChange={(e) => setScheduleNoteInput(e.target.value)}
                  placeholder="备忘录/备注"
                  className="w-full h-24 p-3 rounded-lg border border-zinc-200 text-sm outline-none resize-none focus:border-violet-400"
                />
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={closeScheduleEditor}
                  className="flex-1 h-10 rounded-lg border border-zinc-200 text-zinc-700 text-sm"
                >
                  取消
                </button>
                <button
                  onClick={saveSchedulePlan}
                  className="flex-1 h-10 rounded-lg bg-zinc-900 text-white text-sm"
                >
                  保存
                </button>
                <button
                  onClick={deleteSchedulePlan}
                  className="h-10 px-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-ui="screen-home" className={`h-[100dvh] md:h-full relative overflow-hidden ${wallpaperClass}`} style={wallpaperStyle}>
      <div className="absolute inset-0 bg-white/78 backdrop-blur-[1px]" />
      <div className="relative z-10 h-full p-6">
        <div className="h-full min-h-0 flex gap-5">
          <aside className="w-[230px] shrink-0 rounded-[34px] border border-white/30 bg-zinc-700/45 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_10px_30px_rgba(0,0,0,0.16)] p-4 flex flex-col">
            <div className="px-2 pt-1 pb-3 text-white/80 text-sm font-semibold tracking-wide">moyu.on</div>
            <div className="space-y-2">
              <button onClick={() => onOpenOopChat?.()} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white text-zinc-900 shadow-sm">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">oop 快捷聊天</span>
              </button>
              <button onClick={() => onNavigate('social')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-white/85 hover:bg-white/10">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm">聊天中心</span>
              </button>
              <button onClick={() => onNavigate('database')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-white/85 hover:bg-white/10">
                <Database className="w-4 h-4" />
                <span className="text-sm">资料库</span>
              </button>
              <button onClick={() => onNavigate('settings')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-white/85 hover:bg-white/10">
                <Settings className="w-4 h-4" />
                <span className="text-sm">设置</span>
              </button>
            </div>

            <div className="mt-auto rounded-2xl border border-white/20 bg-white/10 p-3">
              <button
                onClick={() => setShowApps(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white text-zinc-800 text-sm font-medium hover:bg-zinc-100"
              >
                <LayoutGrid className="w-4 h-4" />
                更多应用
              </button>
            </div>
          </aside>

          <main className="flex-1 min-h-0 overflow-hidden rounded-[34px] border border-white/65 bg-white/68 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_16px_40px_rgba(0,0,0,0.12)]">
            <div className="h-full min-h-0 overflow-y-auto px-10 py-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xl font-semibold text-zinc-900">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  moyu.on
                </div>
                <button
                  onClick={() => {
                    setDesktopMinimalMode((prev) => {
                      const next = !prev;
                      try {
                        localStorage.setItem('home_desktop_minimal_mode', next ? '1' : '0');
                      } catch {
                        // ignore
                      }
                      return next;
                    });
                  }}
                  className="px-3 py-1.5 rounded-full border border-zinc-200 bg-white/75 text-xs text-zinc-600 hover:bg-white"
                >
                  {desktopMinimalMode ? '退出极简模式' : '极简模式'}
                </button>
              </div>
              <div
                className={`max-w-[920px] w-full mx-auto ${
                  desktopMinimalMode ? 'min-h-[560px] flex flex-col justify-center' : 'mt-12'
                }`}
              >
              <div className={`${desktopMinimalMode ? 'text-center' : ''}`}>
                <h1 className="text-4xl font-semibold text-zinc-900">
                  {timeGreeting}{userProfile?.username ? `，${userProfile.username}` : ''}
                </h1>
                <div className="mt-2 text-sm text-zinc-500">今天想试点什么？</div>
              </div>

              {/* Gemini 风格条形输入框 */}
              <div className={desktopMinimalMode ? 'mt-5' : 'mt-8'}>
              <div
                className={`rounded-[26px] bg-white/95 border border-zinc-200 shadow-sm ${
                  desktopMinimalMode ? 'w-full p-6 min-h-[320px] flex flex-col justify-center' : 'mt-6 p-4'
                }`}
              >
                {pendingAttachments.length > 0 && (
                  <div className="mb-3 flex items-center gap-2 flex-wrap">
                    {pendingAttachments.map((file) => (
                      <div key={file.id} className="max-w-[260px] px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-700 flex items-center gap-2">
                        <span className="inline-flex w-5 h-5 rounded-md bg-zinc-200 items-center justify-center text-[10px]">
                          {file.kind === 'image' ? '图' : '文'}
                        </span>
                        <span className="truncate">{file.name}</span>
                        <button
                          onClick={() => setPendingAttachments((prev) => prev.filter((item) => item.id !== file.id))}
                          className="text-zinc-400 hover:text-zinc-700"
                          title="移除"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <img
                    src="avatars/oop-dialog.png"
                    alt="oop"
                    className="w-12 h-12 rounded-2xl object-cover border border-zinc-200"
                    draggable={false}
                  />
                  <textarea
                    value={oopInput}
                    onChange={(e) => setOopInput(e.target.value)}
                    placeholder="问问 oop"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        trySendOop();
                      }
                    }}
                    className={`flex-1 resize-none bg-transparent outline-none text-zinc-900 placeholder:text-zinc-400 ${
                      desktopMinimalMode ? 'text-[18px] leading-7 h-12 py-2.5' : 'text-[15px] leading-6'
                    }`}
                  />
                  <label className="w-9 h-9 rounded-full border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 flex items-center justify-center cursor-pointer" title="添加图片/文件">
                    <input
                      type="file"
                      multiple
                      accept="image/*,.txt,.md,.markdown,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                      className="hidden"
                      disabled={isPickingAttachment}
                      onChange={(e) => {
                        handlePickAttachments(e.target.files);
                        e.currentTarget.value = '';
                      }}
                    />
                    <Plus className="w-4 h-4" />
                  </label>
                  <button
                    onClick={trySendOop}
                    className="px-4 py-2 rounded-full bg-zinc-900 text-white text-sm hover:bg-zinc-800 transition"
                  >
                    发送
                  </button>
                </div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  {[
                    { t: '帮我总结这份文档', icon: Sparkles },
                    { t: '写一个可执行计划', icon: Sparkles },
                    { t: '把这段话润色一下', icon: Sparkles },
                    { t: '帮我做个对比选择', icon: Sparkles },
                  ].map((s) => (
                    <button
                      key={s.t}
                      onClick={() => setOopInput(s.t)}
                      className="px-3 py-2 rounded-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-sm text-zinc-700 transition"
                    >
                      {s.t}
                    </button>
                  ))}
                </div>
              </div>
              </div>

              {/* Dashboard 信息卡：减少重复导航入口 */}
              {!desktopMinimalMode && <div className="mt-12 grid grid-cols-3 gap-4">
                <div className="rounded-2xl bg-white/86 border border-zinc-200 p-5">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Schedule</div>
                  <div className="mt-3 text-3xl font-semibold text-zinc-900">{Object.keys(schedulePlans).length}</div>
                  <div className="mt-1 text-sm text-zinc-600">已记录日程</div>
                </div>
                <div className="rounded-2xl bg-white/86 border border-zinc-200 p-5">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Todo In 7 Days</div>
                  <div className="mt-3 text-3xl font-semibold text-zinc-900">{weeklyScheduleCount}</div>
                  <div className="mt-1 text-sm text-zinc-600">近 7 天待办</div>
                </div>
                <div className="rounded-2xl bg-white/86 border border-zinc-200 p-5">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Active Days</div>
                  <div className="mt-3 text-3xl font-semibold text-zinc-900">{weeklyActiveDays}</div>
                  <div className="mt-1 text-sm text-zinc-600">近 7 天活跃天数</div>
                </div>
              </div>}
            </div>
            </div>
          </main>
        </div>

        {/* 更多应用弹层（桌面图标网格） */}
        {showApps && (
          <div className="absolute inset-0 z-50 bg-black/25 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-3xl rounded-3xl bg-white border border-zinc-200 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
                <div className="text-lg font-semibold text-zinc-900">更多应用</div>
                <button
                  onClick={() => setShowApps(false)}
                  className="w-9 h-9 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-6 gap-4">
                  {apps.map((app) => {
                    const Icon = app.icon;
                    return (
                      <button
                        key={app.id}
                        onClick={() => {
                          setShowApps(false);
                          app.onClick();
                        }}
                        className="flex flex-col items-center gap-2 rounded-2xl p-3 hover:bg-zinc-50 transition"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="text-xs text-zinc-700">{app.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

