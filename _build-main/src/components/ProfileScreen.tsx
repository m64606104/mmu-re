import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Upload, Sparkles, Wallet, Heart, Plus, Trash2 } from 'lucide-react';
import { UserProfile, Screen, Conversation, UserIdentityCard } from '../types';
import { getWalletData } from '../utils/wallet';
import { useMobileBottomDock } from '../hooks/useMobileBottomDock';
import { normalizeIdentityCards } from '../utils/userIdentityCards';

interface ProfileScreenProps {
  /** 运行时 localStorage 等可能短暂为空或残缺，组件内需兜底 */
  userProfile?: UserProfile | null;
  onUpdateProfile: (profile: UserProfile) => void;
  onNavigate: (screen: Screen) => void;
  onBack: () => void;
  momentsCount: number;
  contactsCount: number;
  /** 用于身份卡关联角色（私聊 AI） */
  conversations?: Conversation[];
}

/** localStorage 等来源可能出现残缺对象，绝不调用可能缺失的字符串方法 */
function asTrimmedString(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

function resolveProfileDisplayName(usernameState: unknown, profile: UserProfile | null | undefined): string {
  const fromState = asTrimmedString(usernameState);
  if (fromState.length > 0) return fromState;
  const fromProfile = asTrimmedString(profile?.username);
  if (fromProfile.length > 0) return fromProfile;
  return '未命名';
}

/** 取首个 Unicode 字素，避免对 undefined 使用 .charAt */
function firstGrapheme(label: string): string {
  const s = asTrimmedString(label);
  if (s.length === 0) return '?';
  for (const ch of s) {
    return ch;
  }
  return '?';
}

const IDENTITY_GRADIENTS = [
  'bg-gradient-to-br from-violet-400 via-violet-500 to-indigo-600',
  'bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600',
  'bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600',
  'bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500',
  'bg-gradient-to-br from-fuchsia-400 via-pink-500 to-rose-600',
] as const;

/** 卡组第 1 张：通用默认身份 */
const GENERAL_IDENTITY_GRADIENT =
  'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-700';

/** 资料页展示用：堆叠卡片一瞥，点击进入编辑 */
function IdentityCardsStackPreview({
  cards,
  conversations,
  resolveConvLabel,
  onPress,
}: {
  cards: UserIdentityCard[];
  conversations: Conversation[];
  resolveConvLabel: (c: Conversation) => string;
  onPress: () => void;
}) {
  const convById = useMemo(() => {
    const m = new Map<string, Conversation>();
    conversations.forEach((c) => m.set(c.id, c));
    return m;
  }, [conversations]);

  const stack = cards.slice(0, 6);
  const hiddenCount = cards.length - stack.length;

  return (
    <button
      type="button"
      onClick={onPress}
      className="group relative mx-auto block w-full max-w-[320px] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-[24px]"
      aria-label="编辑身份卡"
    >
      <div className="relative pt-1 pb-2" style={{ minHeight: 118 + stack.length * 14 + 96 }}>
        {stack.map((c, i) => {
          const grad = IDENTITY_GRADIENTS[i % IDENTITY_GRADIENTS.length];
          const linkLabels = c.linkedConversationIds
            .map((id) => convById.get(id))
            .filter(Boolean)
            .slice(0, 2)
            .map((conv) => resolveConvLabel(conv as Conversation));
          const extraLinkCount = Math.max(0, c.linkedConversationIds.length - linkLabels.length);

          return (
            <div
              key={c.id}
              className={`absolute left-0 right-0 overflow-hidden rounded-[22px] p-[2.5px] shadow-lg transition-transform group-active:scale-[0.99] ${grad}`}
              style={{
                top: i * 14,
                zIndex: stack.length - i,
              }}
            >
              <div className="rounded-[19px] bg-white/95 px-3.5 py-3 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">身份卡 {i + 1}</div>
                    <div className="truncate text-[15px] font-semibold text-slate-900">
                      {asTrimmedString(c.nickname) || '未命名身份卡'}
                    </div>
                  </div>
                  {c.linkedConversationIds.length > 0 ? (
                    <div className="flex-shrink-0 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-white">
                      {c.linkedConversationIds.length} 关联
                    </div>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {asTrimmedString(c.onlineName) ? (
                    <span className="rounded-full border border-slate-200/90 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600">
                      @{asTrimmedString(c.onlineName)}
                    </span>
                  ) : null}
                  {asTrimmedString(c.gender) ? (
                    <span className="rounded-full border border-slate-200/90 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600">
                      {asTrimmedString(c.gender)}
                    </span>
                  ) : null}
                  {asTrimmedString(c.age) ? (
                    <span className="rounded-full border border-slate-200/90 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600">
                      {asTrimmedString(c.age)}
                    </span>
                  ) : null}
                </div>
                {linkLabels.length > 0 ? (
                  <div className="mt-2 truncate text-[11px] text-slate-500">
                    角色：{linkLabels.join('、')}
                    {extraLinkCount > 0 ? ` · 另有${extraLinkCount}位` : ''}
                  </div>
                ) : (
                  <div className="mt-2 text-[11px] text-slate-400">未关联私聊角色</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {hiddenCount > 0 ? (
        <div className="mt-1 text-center text-[11px] text-slate-500">还有 {hiddenCount} 张在下方…</div>
      ) : (
        <div className="mt-1 text-center text-[11px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
          点按进入编辑
        </div>
      )}
    </button>
  );
}

export default function ProfileScreen({
  userProfile,
  onUpdateProfile,
  onNavigate,
  onBack,
  momentsCount,
  contactsCount,
  conversations = [],
}: ProfileScreenProps) {
  const profile = userProfile ?? null;

  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(() => asTrimmedString(profile?.username));
  const [bio, setBio] = useState(() => (profile?.bio != null ? String(profile.bio) : ''));
  const [avatar, setAvatar] = useState(profile?.avatar || '');
  const [coverImage, setCoverImage] = useState(profile?.coverImage || '');
  const [walletBalance, setWalletBalance] = useState<number>(() => getWalletData().balance);
  // 个人资料状态（通用默认）
  const [name, setName] = useState(profile?.personalInfo?.name || '');
  const [onlineName, setOnlineName] = useState(profile?.personalInfo?.onlineName || '');
  const [gender, setGender] = useState(profile?.personalInfo?.gender || '');
  const [age, setAge] = useState(profile?.personalInfo?.age || '');
  const [background, setBackground] = useState(profile?.personalInfo?.background || '');
  const [identityCardsDraft, setIdentityCardsDraft] = useState<UserIdentityCard[]>(() =>
    normalizeIdentityCards(profile?.identityCards)
  );
  /** 0 = 通用默认，1…n 对应 identityCardsDraft[n-1]；卡组仅左右滑动切换 */
  const [activeDeckIndex, setActiveDeckIndex] = useState(0);
  const identityScrollRef = useRef<HTMLDivElement>(null);
  const pendingScrollToLastIdentity = useRef(false);
  const deckPageCount = 1 + identityCardsDraft.length;
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const mobileBottomDock = useMobileBottomDock();

  const linkablePrivateChats = useMemo(
    () =>
      conversations.filter(
        (c) => c.type === 'private' && Boolean(c.characterSettings) && !(c as { isBlocked?: boolean }).isBlocked
      ),
    [conversations]
  );

  const displayUsername = resolveProfileDisplayName(username, profile);
  const usernameInitial = firstGrapheme(displayUsername);

  const resolveConvLabel = (c: Conversation) => {
    const nick = asTrimmedString(c.characterSettings?.nickname);
    const nm = asTrimmedString(c.name);
    return nick || nm || '未命名角色';
  };

  useEffect(() => {
    setWalletBalance(getWalletData().balance);
  }, []);

  useEffect(() => {
    const p = userProfile ?? null;
    if (!p || isEditing) return;
    setUsername(asTrimmedString(p.username));
    setBio(p.bio != null ? String(p.bio) : '');
    setAvatar(p.avatar || '');
    setCoverImage(p.coverImage || '');
    setName(p.personalInfo?.name || '');
    setOnlineName(p.personalInfo?.onlineName || '');
    setGender(p.personalInfo?.gender || '');
    setAge(p.personalInfo?.age || '');
    setBackground(p.personalInfo?.background || '');
    setIdentityCardsDraft(normalizeIdentityCards(p.identityCards));
  }, [isEditing, userProfile]);

  useEffect(() => {
    const maxIdx = identityCardsDraft.length;
    setActiveDeckIndex((i) => Math.min(i, maxIdx));
  }, [identityCardsDraft.length]);

  useLayoutEffect(() => {
    if (!isEditing) return;
    if (!pendingScrollToLastIdentity.current) return;
    const el = identityScrollRef.current;
    if (!el) return;
    pendingScrollToLastIdentity.current = false;
    const lastPage = identityCardsDraft.length;
    const w = el.clientWidth;
    if (w <= 0) return;
    el.scrollTo({ left: lastPage * w, behavior: 'auto' });
    setActiveDeckIndex(lastPage);
  }, [isEditing, identityCardsDraft.length]);

  const onDeckScroll = () => {
    const el = identityScrollRef.current;
    if (!el || deckPageCount <= 1) return;
    const w = el.clientWidth;
    if (w <= 0) return;
    const i = Math.round(el.scrollLeft / w);
    setActiveDeckIndex(Math.min(Math.max(0, i), deckPageCount - 1));
  };

  const goToDeckPage = (i: number) => {
    const el = identityScrollRef.current;
    if (!el) return;
    const clamped = Math.min(Math.max(0, i), deckPageCount - 1);
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' });
    setActiveDeckIndex(clamped);
  };

  const patchIdentityCard = (id: string, patch: Partial<UserIdentityCard>) => {
    setIdentityCardsDraft((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const toggleIdentityLink = (cardId: string, conversationId: string) => {
    setIdentityCardsDraft((prev) => {
      const card = prev.find((c) => c.id === cardId);
      const wasOn = card?.linkedConversationIds.includes(conversationId);
      const next = prev.map((c) => ({
        ...c,
        linkedConversationIds: c.linkedConversationIds.filter((x) => x !== conversationId),
      }));
      if (!wasOn) {
        return next.map((c) =>
          c.id === cardId ? { ...c, linkedConversationIds: [...c.linkedConversationIds, conversationId] } : c
        );
      }
      return next;
    });
  };

  const addIdentityCard = () => {
    pendingScrollToLastIdentity.current = true;
    setIdentityCardsDraft((prev) => [
      ...prev,
      {
        id: `idcard_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        nickname: '',
        onlineName: '',
        gender: '',
        age: '',
        identityInfo: '',
        linkedConversationIds: [],
      },
    ]);
  };

  const removeIdentityCard = (id: string) => {
    setIdentityCardsDraft((prev) => {
      const removedIdx = prev.findIndex((c) => c.id === id);
      const next = prev.filter((c) => c.id !== id);
      queueMicrotask(() => {
        const el = identityScrollRef.current;
        if (!el) {
          setActiveDeckIndex(0);
          return;
        }
        const pages = 1 + next.length;
        if (pages <= 1) {
          setActiveDeckIndex(0);
          el.scrollTo({ left: 0, behavior: 'auto' });
          return;
        }
        const removedPage = removedIdx + 1;
        const w = el.clientWidth;
        if (w <= 0) return;
        const cur = Math.round(el.scrollLeft / w);
        let newIdx = cur;
        if (cur === removedPage) newIdx = Math.max(0, cur - 1);
        else if (cur > removedPage) newIdx = cur - 1;
        newIdx = Math.min(newIdx, pages - 1);
        el.scrollTo({ left: newIdx * w, behavior: 'auto' });
        setActiveDeckIndex(newIdx);
      });
      return next;
    });
  };

  const compressImage = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // 计算缩放比例
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // 压缩质量0.7
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedDataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 400, 400);
        setAvatar(compressed);
      } catch (error) {
        console.error('图片压缩失败:', error);
        alert('图片处理失败，请尝试其他图片');
      }
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 800, 400);
        setCoverImage(compressed);
      } catch (error) {
        console.error('图片压缩失败:', error);
        alert('图片处理失败，请尝试其他图片');
      }
    }
  };

  const handleSave = () => {
    if (!profile) return;
    const normalizedCards = normalizeIdentityCards(identityCardsDraft);
    onUpdateProfile({
      ...profile,
      username: asTrimmedString(username) || '未命名',
      bio: bio ?? '',
      avatar,
      coverImage,
      personalInfo: {
        name: name || undefined,
        onlineName: onlineName || undefined,
        gender: gender || undefined,
        age: age || undefined,
        background: background || undefined,
      },
      identityCards: normalizedCards.length > 0 ? normalizedCards : undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    pendingScrollToLastIdentity.current = false;
    if (!profile) {
      setIsEditing(false);
      return;
    }
    setUsername(asTrimmedString(profile.username));
    setBio(profile.bio != null ? String(profile.bio) : '');
    setAvatar(profile.avatar || '');
    setCoverImage(profile.coverImage || '');
    setName(profile.personalInfo?.name || '');
    setOnlineName(profile.personalInfo?.onlineName || '');
    setGender(profile.personalInfo?.gender || '');
    setAge(profile.personalInfo?.age || '');
    setBackground(profile.personalInfo?.background || '');
    setIdentityCardsDraft(normalizeIdentityCards(profile.identityCards));
    setIsEditing(false);
  };

  const openEditor = () => {
    const p = userProfile ?? null;
    if (p) setIdentityCardsDraft(normalizeIdentityCards(p.identityCards));
    setActiveDeckIndex(0);
    pendingScrollToLastIdentity.current = false;
    setIsEditing(true);
    queueMicrotask(() => {
      identityScrollRef.current?.scrollTo({ left: 0, behavior: 'auto' });
    });
  };

  if (!profile) {
    return (
      <div className="h-[100dvh] md:h-full min-h-0 bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-slate-700 font-medium">用户资料未加载</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium"
        >
          返回
        </button>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] md:h-full min-h-0 bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <button
          onClick={() => {
            if (isEditing) {
              handleCancel();
              return;
            }
            onBack();
          }}
          className="p-2 -ml-2"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">我的资料</h1>
        <div className="w-10"></div>
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden touch-pan-y"
        style={{ paddingBottom: `calc(${92 + mobileBottomDock}px + env(safe-area-inset-bottom))` }}
      >
        {isEditing ? (
          <div className="mx-4 mt-4 mb-6 space-y-4">
            <section className="rounded-[30px] border border-slate-200 bg-gradient-to-b from-[#dfe4ff] to-[#eef1ff] p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[22px] leading-6 font-semibold text-slate-900">编辑资料</div>
                  <p className="mt-1 text-xs text-slate-600">调整昵称、签名和 AI 参考信息</p>
                </div>
                <div className="w-14 h-14 rounded-full overflow-hidden border-4 border-white/70 bg-white flex items-center justify-center flex-shrink-0">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-900 font-semibold text-2xl">{usernameInitial}</span>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-full bg-white/85 border border-slate-200 text-xs text-slate-700"
                >
                  更换头像
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
            </section>

            <section className="rounded-[26px] border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="text-[11px] tracking-wide text-slate-500 uppercase">账号信息</div>
              </div>
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="text-xs text-slate-500 mb-2">用户名</div>
                <input
                  type="text"
                  value={username ?? ''}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="输入用户名"
                />
              </div>
              <div className="px-4 py-3">
                <div className="text-xs text-slate-500 mb-2">个性签名</div>
                <textarea
                  value={bio ?? ''}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="分享生活，记录美好"
                />
              </div>
            </section>

            <section className="relative mx-0 overflow-visible rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-slate-100/90 via-white to-slate-50 shadow-md sm:mx-0">
              <div className="px-4 pb-2 pt-4">
                <div className="text-xs font-semibold tracking-wide text-slate-800">通用身份与身份卡</div>
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                  第一张为通用默认；点其右上角「新建」叠更多卡。同一私聊角色仅绑定一张附加卡。
                </p>
                <div className="mt-2 inline-flex items-center rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-[10px] text-slate-600 shadow-sm backdrop-blur-sm">
                  在卡片区左右滑动切换
                </div>
              </div>

              {deckPageCount > 1 ? (
                <div className="relative z-20 flex items-center justify-center gap-3 px-4 pb-1">
                  <button
                    type="button"
                    aria-label="上一张"
                    onClick={() => goToDeckPage(activeDeckIndex - 1)}
                    className="rounded-full border border-slate-200 bg-white p-2 text-slate-700 shadow-sm active:bg-slate-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="text-[11px] font-medium text-slate-600">
                    {activeDeckIndex + 1} / {deckPageCount}
                  </span>
                  <button
                    type="button"
                    aria-label="下一张"
                    onClick={() => goToDeckPage(activeDeckIndex + 1)}
                    className="rounded-full border border-slate-200 bg-white p-2 text-slate-700 shadow-sm active:bg-slate-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              ) : null}

              {deckPageCount > 1 ? (
                <>
                  <div
                    className="pointer-events-none absolute left-1/2 top-[7.5rem] z-0 h-[min(400px,56vh)] w-[88%] max-w-[308px] rounded-[26px] bg-slate-800/[0.06] shadow-sm"
                    style={{ transform: 'translate(-50%, 12px) scale(0.94)' }}
                  />
                  <div
                    className="pointer-events-none absolute left-1/2 top-[7.5rem] z-0 h-[min(400px,56vh)] w-[82%] max-w-[288px] rounded-[26px] bg-slate-800/[0.04]"
                    style={{ transform: 'translate(-50%, 24px) scale(0.88)' }}
                  />
                </>
              ) : null}

              <div
                ref={identityScrollRef}
                onScroll={onDeckScroll}
                className="relative z-10 flex touch-pan-x flex-row overflow-x-auto overscroll-x-contain scroll-smooth snap-x snap-mandatory pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {/* 第 1 张：通用默认（新建入口在右上角） */}
                <div className="box-border flex w-full min-w-full shrink-0 snap-center justify-center px-3 pb-5 pt-1">
                  <div
                    className={`w-full max-w-[340px] overflow-hidden rounded-[26px] p-[3px] shadow-xl ${GENERAL_IDENTITY_GRADIENT}`}
                  >
                    <div className="max-h-[min(520px,70vh)] min-h-0 overflow-y-auto overflow-x-hidden rounded-[23px] bg-white/[0.97] p-4 shadow-inner backdrop-blur-sm">
                      <div className="mb-3 flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="min-w-0 pr-1">
                          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">默认</div>
                          <div className="mt-0.5 text-lg font-semibold text-slate-900">通用身份</div>
                          <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                            未绑定附加身份卡的私聊用这里；仅供 AI 参考。附加卡某字段留空时会回落到这里。
                          </p>
                        </div>
                        <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                          <button
                            type="button"
                            onClick={addIdentityCard}
                            className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white shadow-md active:scale-95"
                          >
                            新建身份卡
                          </button>
                          <button
                            type="button"
                            onClick={addIdentityCard}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-900 shadow ring-1 ring-slate-200/80 active:scale-95"
                            aria-label="新建身份卡"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs text-slate-500 mb-1.5">默认称呼</div>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                            placeholder="AI 平时怎么称呼你（选填）"
                          />
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1.5">默认网名</div>
                          <input
                            type="text"
                            value={onlineName}
                            onChange={(e) => setOnlineName(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                            placeholder="选填"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <div className="text-xs text-slate-500 mb-1.5">性别</div>
                            <input
                              type="text"
                              value={gender}
                              onChange={(e) => setGender(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                              placeholder="如：男/女"
                            />
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-1.5">年龄</div>
                            <input
                              type="text"
                              value={age}
                              onChange={(e) => setAge(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                              placeholder="如：25"
                            />
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1.5">身份信息</div>
                          <textarea
                            value={background}
                            onChange={(e) => setBackground(e.target.value)}
                            rows={3}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-slate-200"
                            placeholder="选填，如职业、经历等"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {identityCardsDraft.map((card, idx) => (
                  <div
                    key={card.id}
                    className="box-border flex w-full min-w-full shrink-0 snap-center justify-center px-3 pb-5 pt-1"
                  >
                    <div
                      className={`w-full max-w-[340px] overflow-hidden rounded-[26px] p-[3px] shadow-xl ${IDENTITY_GRADIENTS[idx % IDENTITY_GRADIENTS.length]}`}
                    >
                      <div className="max-h-[min(520px,70vh)] min-h-0 overflow-y-auto overflow-x-hidden rounded-[23px] bg-white/[0.97] p-4 shadow-inner backdrop-blur-sm">
                        <div className="mb-3 flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="min-w-0">
                            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                              身份卡 {idx + 1}
                            </div>
                            <div className="mt-0.5 truncate text-lg font-semibold text-slate-900">
                              {asTrimmedString(card.nickname) || '未命名身份卡'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeIdentityCard(card.id)}
                            className="flex-shrink-0 rounded-xl p-2 text-red-600 hover:bg-red-50"
                            aria-label="删除此身份卡"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <div className="text-xs text-slate-500 mb-1.5">称呼（AI 对你的称呼）</div>
                            <input
                              type="text"
                              value={card.nickname ?? ''}
                              onChange={(e) => patchIdentityCard(card.id, { nickname: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                              placeholder="类似本名，选填"
                            />
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-1.5">网名</div>
                            <input
                              type="text"
                              value={card.onlineName ?? ''}
                              onChange={(e) => patchIdentityCard(card.id, { onlineName: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                              placeholder="选填"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <div className="text-xs text-slate-500 mb-1.5">性别</div>
                              <input
                                type="text"
                                value={card.gender ?? ''}
                                onChange={(e) => patchIdentityCard(card.id, { gender: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                                placeholder="选填"
                              />
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 mb-1.5">年龄</div>
                              <input
                                type="text"
                                value={card.age ?? ''}
                                onChange={(e) => patchIdentityCard(card.id, { age: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                                placeholder="选填"
                              />
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-1.5">身份信息</div>
                            <textarea
                              value={card.identityInfo ?? ''}
                              onChange={(e) => patchIdentityCard(card.id, { identityInfo: e.target.value })}
                              rows={3}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-slate-200"
                              placeholder="选填"
                            />
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-1.5">关联角色</div>
                            {linkablePrivateChats.length === 0 ? (
                              <p className="text-xs text-slate-400 py-2">暂无可用私聊角色</p>
                            ) : (
                              <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
                                {linkablePrivateChats.map((c) => {
                                  const checked = card.linkedConversationIds.includes(c.id);
                                  return (
                                    <label
                                      key={c.id}
                                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-800 cursor-pointer hover:bg-slate-50"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleIdentityLink(card.id, c.id)}
                                        className="rounded border-slate-300"
                                      />
                                      <span className="truncate">{resolveConvLabel(c)}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {deckPageCount > 1 ? (
                <div className="relative z-10 flex justify-center gap-2 px-4 pb-5 pt-1">
                  {Array.from({ length: deckPageCount }, (_, i) => (
                    <button
                      key={`deck-dot-${i}`}
                      type="button"
                      aria-label={i === 0 ? '切换到通用身份' : `切换到身份卡 ${i}`}
                      onClick={() => goToDeckPage(i)}
                      className={`h-2 rounded-full transition-all ${
                        i === activeDeckIndex ? 'w-7 bg-slate-800' : 'w-2 bg-slate-300 hover:bg-slate-400'
                      }`}
                    />
                  ))}
                </div>
              ) : null}
            </section>

            <div className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-medium"
                >
                  保存资料
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-4 mt-4 rounded-[30px] border border-slate-200 bg-gradient-to-b from-[#dfe4ff] to-[#eef1ff] p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[26px] leading-7 font-semibold text-slate-900 truncate">
                  Hi, {displayUsername}
                </div>
                {profile.avatarBadge ? (
                  <div className="mt-1 text-[11px] text-slate-600">Badge {String(profile.avatarBadge)}</div>
                ) : null}
                {(bio ?? '').length > 0 ? (
                  <div className="mt-2 text-sm text-slate-700 line-clamp-2">{bio}</div>
                ) : null}
              </div>
              <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white/70 bg-white flex items-center justify-center flex-shrink-0">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-slate-900 font-semibold text-3xl">{usernameInitial}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Button (display mode only) */}
        {!isEditing ? (
          <div className="mx-4 py-4 space-y-3">
            <button
              type="button"
              onClick={openEditor}
              className="w-full py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm font-medium shadow-sm"
            >
              编辑资料
            </button>
            {normalizeIdentityCards(profile.identityCards).length > 0 ? (
              <div className="rounded-[26px] border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="text-xs font-semibold text-slate-800">身份卡</div>
                  <span className="text-[10px] text-slate-500">
                    共 {normalizeIdentityCards(profile.identityCards).length} 张
                  </span>
                </div>
                <IdentityCardsStackPreview
                  cards={normalizeIdentityCards(profile.identityCards)}
                  conversations={conversations}
                  resolveConvLabel={resolveConvLabel}
                  onPress={openEditor}
                />
                <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
                  点「编辑资料」：通用身份与附加身份卡叠成一组，左右滑动切换；未绑定的私聊仍用通用身份。
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {!isEditing ? (
          <>
            {/* Stats */}
            <div className="mx-4 rounded-[30px] border border-slate-200 bg-white overflow-hidden mb-4">
              <div className="grid grid-cols-4">
                <button
                  onClick={() => onNavigate('contacts')}
                  className="text-center py-4 border-r border-slate-100 last:border-r-0"
                >
                  <div className="text-[22px] font-semibold text-slate-900">{contactsCount}</div>
                  <div className="text-[11px] text-slate-500 mt-1">好友</div>
                </button>
                <button
                  onClick={() => onNavigate('wallet')}
                  className="text-center py-4 border-r border-slate-100 last:border-r-0"
                >
                  <div className="text-[22px] font-semibold text-slate-900">¥{Math.round(walletBalance)}</div>
                  <div className="text-[11px] text-slate-500 mt-1">余额</div>
                </button>
                <div className="text-center py-4 border-r border-slate-100 last:border-r-0">
                  <div className="text-[22px] font-semibold text-slate-900">0</div>
                  <div className="text-[11px] text-slate-500 mt-1">获赞</div>
                </div>
                <div className="text-center py-4 last:border-r-0">
                  <div className="text-[22px] font-semibold text-slate-900">0</div>
                  <div className="text-[11px] text-slate-500 mt-1">等级</div>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="mx-4 rounded-[30px] border border-slate-200 bg-white overflow-hidden mb-4">
              <div className="divide-y divide-slate-100">
                <div className="px-4 py-4 flex items-center gap-3 text-slate-400">
                  <Heart className="w-5 h-5" />
                  <span className="text-sm font-medium">收藏</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    try {
                      sessionStorage.setItem('momoyu:stickerManagementTab', 'mine');
                    } catch {
                      /* ignore */
                    }
                    onNavigate('sticker-management');
                  }}
                  className="w-full px-4 py-4 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-slate-900" />
                    <span className="text-sm font-medium text-slate-900">表情包</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>

                <div className="px-4 py-4 flex items-center gap-3 text-slate-400">
                  <Upload className="w-5 h-5" />
                  <span className="text-sm font-medium">相册</span>
                </div>

                <button
                  onClick={() => onNavigate('wallet')}
                  className="w-full px-4 py-4 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Wallet className="w-5 h-5 text-slate-900" />
                    <span className="text-sm font-medium text-slate-900">钱包</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">¥{Math.round(walletBalance)}</span>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
