import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Upload, Sparkles, Wallet, Users, Heart } from 'lucide-react';
import { UserProfile, Screen } from '../types';
import { getWalletData } from '../utils/wallet';
import { useMobileBottomDock } from '../hooks/useMobileBottomDock';

interface ProfileScreenProps {
  /** 运行时 localStorage 等可能短暂为空或残缺，组件内需兜底 */
  userProfile?: UserProfile | null;
  onUpdateProfile: (profile: UserProfile) => void;
  onNavigate: (screen: Screen) => void;
  onBack: () => void;
  momentsCount: number;
  contactsCount: number;
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

export default function ProfileScreen({
  userProfile,
  onUpdateProfile,
  onNavigate,
  onBack,
  momentsCount,
  contactsCount,
}: ProfileScreenProps) {
  const profile = userProfile ?? null;

  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(() => asTrimmedString(profile?.username));
  const [bio, setBio] = useState(() => (profile?.bio != null ? String(profile.bio) : ''));
  const [avatar, setAvatar] = useState(profile?.avatar || '');
  const [coverImage, setCoverImage] = useState(profile?.coverImage || '');
  const [walletBalance, setWalletBalance] = useState<number>(() => getWalletData().balance);
  // 个人资料状态
  const [name, setName] = useState(profile?.personalInfo?.name || '');
  const [gender, setGender] = useState(profile?.personalInfo?.gender || '');
  const [age, setAge] = useState(profile?.personalInfo?.age || '');
  const [background, setBackground] = useState(profile?.personalInfo?.background || '');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const mobileBottomDock = useMobileBottomDock();

  const displayUsername = resolveProfileDisplayName(username, profile);
  const usernameInitial = firstGrapheme(displayUsername);

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
    setGender(p.personalInfo?.gender || '');
    setAge(p.personalInfo?.age || '');
    setBackground(p.personalInfo?.background || '');
  }, [isEditing, userProfile]);

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
    onUpdateProfile({
      username: asTrimmedString(username) || '未命名',
      bio: bio ?? '',
      avatar,
      coverImage,
      personalInfo: {
        name: name || undefined,
        gender: gender || undefined,
        age: age || undefined,
        background: background || undefined,
      },
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (!profile) {
      setIsEditing(false);
      return;
    }
    setUsername(asTrimmedString(profile.username));
    setBio(profile.bio != null ? String(profile.bio) : '');
    setAvatar(profile.avatar || '');
    setCoverImage(profile.coverImage || '');
    setName(profile.personalInfo?.name || '');
    setGender(profile.personalInfo?.gender || '');
    setAge(profile.personalInfo?.age || '');
    setBackground(profile.personalInfo?.background || '');
    setIsEditing(false);
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

            <section className="rounded-[26px] border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="text-[11px] tracking-wide text-slate-500 uppercase">个人资料</div>
                <div className="text-[11px] text-slate-500">仅供 AI 参考</div>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <div className="text-xs text-slate-500 mb-1.5">姓名/昵称</div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="选填，如：张三"
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
                  <div className="text-xs text-slate-500 mb-1.5">身份背景</div>
                  <textarea
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="选填，如：大学生、程序员、设计师等"
                  />
                </div>
                <p className="pt-1 text-xs text-slate-500 leading-relaxed">
                  这些信息不会在个人主页显示，仅用于帮助 AI 更好地了解你。
                </p>
              </div>
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
          <div className="mx-4 py-4">
            <button
              onClick={() => setIsEditing(true)}
              className="w-full py-3 rounded-xl bg-white border border-slate-200 text-slate-900 font-medium shadow-sm"
            >
              编辑资料
            </button>
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
