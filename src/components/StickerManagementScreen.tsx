// 表情包管理界面 — UI 参考：浅色网格底、线框卡片、标签下划线（表情管理 / 作品页风格）

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  Plus,
  Trash2,
  Edit,
  Search,
  Image as ImageIcon,
  Smile,
  User,
  Bot,
} from 'lucide-react';
import { Conversation } from '../types';
import { StickerItem, StickerScope } from '../types/sticker';
import {
  getCommonStickers,
  getCharacterStickers,
  getUserStickers,
  getUserLibraryStickers,
  addSticker,
  updateSticker,
  deleteSticker,
  imageToBase64,
} from '../utils/stickerStorage';

interface StickerManagementScreenProps {
  onBack: () => void;
  conversations: Conversation[];
}

type StickerManagementTab = 'mine' | 'public' | 'character';

const GRID_PAPER_BG: React.CSSProperties = {
  backgroundColor: '#f4f4f1',
  backgroundImage: `
    linear-gradient(rgba(24, 24, 27, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(24, 24, 27, 0.06) 1px, transparent 1px)
  `,
  backgroundSize: '18px 18px',
};

function readInitialStickerTab(): StickerManagementTab {
  try {
    const t = sessionStorage.getItem('momoyu:stickerManagementTab');
    sessionStorage.removeItem('momoyu:stickerManagementTab');
    if (t === 'mine' || t === 'public' || t === 'character') return t;
    if (t === 'user') return 'mine';
    if (t === 'common') return 'public';
  } catch {
    /* ignore */
  }
  return 'mine';
}

function tabSectionCopy(tab: Exclude<StickerManagementTab, 'character'>): { title: string; subtitle: string } {
  if (tab === 'mine') {
    return {
      title: '我的表情包',
      subtitle: '含公共与用户专属，角标区分；不含角色库',
    };
  }
  return {
    title: '公共表情',
    subtitle: '全员可用；添加后会出现在「我的表情包」',
  };
}

export default function StickerManagementScreen({ onBack, conversations }: StickerManagementScreenProps) {
  const [activeTab, setActiveTab] = useState<StickerManagementTab>(readInitialStickerTab);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSticker, setEditingSticker] = useState<StickerItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [summaryCounts, setSummaryCounts] = useState({ mine: 0, public: 0 });

  const privateConversations = conversations.filter(c => c.type === 'private');

  const selectedCharacterName =
    selectedCharacter &&
    (privateConversations.find(c => c.id === selectedCharacter)?.characterSettings?.nickname ||
      privateConversations.find(c => c.id === selectedCharacter)?.name ||
      null);

  const refreshSummaryCounts = useCallback(async () => {
    try {
      const [c, u] = await Promise.all([getCommonStickers(), getUserStickers()]);
      setSummaryCounts({ mine: c.length + u.length, public: c.length });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshSummaryCounts();
  }, [refreshSummaryCounts]);

  useEffect(() => {
    void loadStickers();
  }, [activeTab, selectedCharacter]);

  const loadStickers = async () => {
    setLoading(true);
    try {
      if (activeTab === 'mine') {
        setStickers(await getUserLibraryStickers());
      } else if (activeTab === 'public') {
        setStickers(await getCommonStickers());
      } else if (selectedCharacter) {
        setStickers(await getCharacterStickers(selectedCharacter));
      } else {
        setStickers([]);
      }
    } catch (error) {
      console.error('Failed to load stickers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStickers = stickers.filter(sticker => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      sticker.description.toLowerCase().includes(query) ||
      sticker.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  const handleDelete = async (sticker: StickerItem) => {
    const scopeLabel =
      sticker.scope === 'common' ? '公共表情' : sticker.scope === 'user' ? '用户专属表情' : '角色专属表情';
    if (!confirm(`确定从「${scopeLabel}」删除「${sticker.description}」吗？`)) return;

    try {
      await deleteSticker(sticker.id, sticker.scope);
      await loadStickers();
      void refreshSummaryCounts();
    } catch (error) {
      console.error('Failed to delete sticker:', error);
      alert('删除失败');
    }
  };

  const openAdd = () => {
    if (activeTab === 'character' && !selectedCharacter) {
      alert('请先选择角色');
      return;
    }
    setEditingSticker(null);
    setShowAddModal(true);
  };

  const tabs: { id: StickerManagementTab; label: string; labelWide: string; count: number | null }[] = [
    { id: 'mine', label: '我的', labelWide: '我的表情包', count: summaryCounts.mine },
    { id: 'public', label: '公共', labelWide: '公共表情', count: summaryCounts.public },
    {
      id: 'character',
      label: '角色',
      labelWide: '角色专属',
      count: activeTab === 'character' && selectedCharacter ? stickers.length : null,
    },
  ];

  const section =
    activeTab === 'character'
      ? {
          title: selectedCharacterName ? `${selectedCharacterName} · 专属` : '角色专属',
          subtitle: selectedCharacterName
            ? '仅该角色在对话中可选用'
            : '请选择角色后查看该角色的表情包',
        }
      : tabSectionCopy(activeTab);

  const tabButtonDesktop = (id: StickerManagementTab, labelWide: string, count: number | null, active: boolean) => (
    <button
      key={id}
      type="button"
      onClick={() => {
        setActiveTab(id);
        if (id !== 'character') setSelectedCharacter(null);
      }}
      className={`w-full text-left rounded-xl px-3 py-3 transition-all border-2 ${
        active
          ? 'border-zinc-900 bg-white shadow-[3px_4px_0_0_rgba(24,24,27,0.08)]'
          : 'border-transparent hover:border-zinc-900/15 hover:bg-white/60 text-zinc-600'
      }`}
    >
      <span className={`block text-sm font-bold ${active ? 'text-zinc-900' : 'text-zinc-700'}`}>{labelWide}</span>
      {count !== null && (
        <span className="text-xs font-semibold tabular-nums text-zinc-400 mt-1 inline-block">{count} 个</span>
      )}
    </button>
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col md:flex-row h-full w-full max-h-full overflow-hidden bg-[#fafaf8]">
      {/* 桌面端左侧分类 */}
      <aside className="hidden md:flex md:flex-col md:w-[240px] lg:w-[272px] shrink-0 border-r-2 border-zinc-900/10 bg-[#f2f2ee] px-4 py-6 gap-2">
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1 mb-1">分类</p>
        {tabs.map(({ id, labelWide, count }) =>
          tabButtonDesktop(id, labelWide, count, activeTab === id)
        )}
        <p className="mt-auto text-[11px] text-zinc-500 leading-relaxed px-1 pt-6 border-t border-zinc-900/10">
          桌面宽屏布局：左侧切换分类，右侧浏览与管理表情。
        </p>
      </aside>

      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        {/* 顶栏：移动端保留底栏 Tab；桌面端仅标题行 */}
        <header className="flex-shrink-0 bg-[#fafaf8] border-b-2 border-zinc-900/90 z-20 md:border-b md:border-zinc-900/15 md:bg-[#fafaf8]">
          <div className="flex items-center justify-between gap-2 px-3 md:px-6 lg:px-8 h-[52px] md:h-14 md:max-w-[1400px] md:mx-auto md:w-full">
            <button
              type="button"
              onClick={onBack}
              className="shrink-0 w-10 h-10 md:w-auto md:h-auto md:px-3 md:py-2 flex items-center justify-center md:justify-start gap-1 rounded-full md:rounded-xl border border-zinc-900/20 md:border-2 bg-white hover:bg-zinc-50 active:scale-95 transition-all text-zinc-900"
              aria-label="返回"
            >
              <ChevronLeft className="w-5 h-5 md:w-4 md:h-4" strokeWidth={2} />
              <span className="hidden md:inline text-sm font-semibold">返回</span>
            </button>
            <h1 className="flex-1 text-center md:text-left text-[15px] md:text-lg font-bold tracking-wide text-zinc-900 truncate">
              表情包管理
            </h1>
            <button
              type="button"
              onClick={openAdd}
              className="shrink-0 flex items-center gap-2 px-3 md:px-4 h-10 rounded-full border-2 border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800 active:scale-95 transition-all shadow-[2px_2px_0_0_rgba(24,24,27,0.15)] text-sm font-bold"
              aria-label="添加"
            >
              <Plus className="w-5 h-5 md:w-[18px] md:h-[18px]" strokeWidth={2.5} />
              <span className="hidden md:inline">添加表情</span>
            </button>
          </div>

          {/* 移动端：底栏 Tab */}
          <nav className="flex px-1 bg-[#fafaf8] border-t border-zinc-900/10 md:hidden">
            {tabs.map(({ id, label, count }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setActiveTab(id);
                    if (id !== 'character') setSelectedCharacter(null);
                  }}
                  className={`relative flex-1 py-3 text-[13px] font-semibold transition-colors ${
                    active ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-1">
                    {label}
                    {count !== null && (
                      <span className="text-[11px] font-bold tabular-nums text-zinc-400">{count}</span>
                    )}
                  </span>
                  <span
                    className={`absolute bottom-0 left-3 right-3 h-[3px] rounded-t-full transition-all ${
                      active ? 'bg-zinc-900' : 'bg-transparent'
                    }`}
                  />
                </button>
              );
            })}
          </nav>
        </header>

        {/* 工具区：桌面端横向排布 */}
        <div className="flex-shrink-0 px-4 md:px-6 lg:px-8 pt-3 pb-2 md:py-4 bg-[#fafaf8]/95 border-b border-zinc-900/10 backdrop-blur-sm md:max-w-[1400px] md:mx-auto md:w-full">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-6">
            <div className="min-w-0 md:flex-1">
              <h2 className="text-sm md:text-base font-bold text-zinc-900 leading-tight">{section.title}</h2>
              <p className="text-[11px] md:text-xs text-zinc-500 mt-1 leading-relaxed max-w-xl">{section.subtitle}</p>
            </div>
            <div className="flex flex-col sm:flex-row md:flex-row items-stretch sm:items-center gap-3 md:shrink-0 md:max-w-[520px] md:w-[48%] lg:w-[44%]">
              {activeTab === 'character' && (
                <div className="relative w-full sm:flex-1 md:min-w-[200px]">
                  <label className="sr-only">选择角色</label>
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                  <select
                    value={selectedCharacter || ''}
                    onChange={e => setSelectedCharacter(e.target.value || null)}
                    className="w-full appearance-none pl-10 pr-4 py-2.5 rounded-xl border-2 border-zinc-900/15 bg-white text-[13px] font-medium text-zinc-900 focus:outline-none focus:border-zinc-900/40 focus:ring-0 md:py-2.5"
                  >
                    <option value="">请选择角色</option>
                    {privateConversations.map(conv => (
                      <option key={conv.id} value={conv.id}>
                        {conv.characterSettings?.nickname || conv.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="relative w-full sm:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="搜索描述或标签"
                  className="w-full pl-10 pr-4 py-2.5 rounded-full md:rounded-xl border-2 border-zinc-900/12 bg-white text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900/35"
                />
              </div>
            </div>
            <div className="shrink-0 text-right md:text-right md:self-start md:min-w-[4.5rem] hidden md:block">
              <span className="text-xs text-zinc-500 font-bold tabular-nums block">
                {loading ? '…' : `${filteredStickers.length}`}
              </span>
              <span className="text-[10px] text-zinc-400">条结果</span>
            </div>
          </div>
          <div className="md:hidden flex justify-end mt-2">
            <span className="text-[11px] text-zinc-400 font-medium tabular-nums">
              {loading ? '…' : `${filteredStickers.length} 个已筛选`}
            </span>
          </div>
        </div>

        {/* 主内容 */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y px-4 md:px-6 lg:px-8 pb-28 md:pb-10 pt-4 md:pt-6"
          style={{ ...GRID_PAPER_BG, WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          <div className="max-w-[1400px] mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-500 text-sm">
            <div
              className="w-9 h-9 border-[3px] border-zinc-900 border-t-transparent rounded-full animate-spin mb-3"
              aria-hidden
            />
            加载中…
          </div>
        ) : activeTab === 'character' && !selectedCharacter ? (
          <div className="text-center py-20 px-4">
            <div className="inline-flex p-6 rounded-2xl border-2 border-dashed border-zinc-900/20 bg-white">
              <Bot className="w-12 h-12 text-zinc-300" strokeWidth={1.25} />
            </div>
            <p className="text-zinc-700 text-sm font-semibold mt-5">先选一个角色</p>
            <p className="text-zinc-500 text-xs mt-1 max-w-[240px] mx-auto leading-relaxed">
              每个角色的表情包单独存放，不会混进「我的」或公共库
            </p>
          </div>
        ) : filteredStickers.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="inline-flex p-6 rounded-full border-2 border-zinc-900/15 bg-white shadow-sm">
              <Smile className="w-12 h-12 text-zinc-300" strokeWidth={1.25} />
            </div>
            <p className="text-zinc-700 text-sm font-semibold mt-5">
              {searchQuery ? '没有匹配的表情' : '还没有表情'}
            </p>
            <button
              type="button"
              onClick={openAdd}
              className="mt-6 px-8 py-2.5 rounded-full border-2 border-zinc-900 bg-white text-zinc-900 text-sm font-bold hover:bg-zinc-900 hover:text-white active:scale-[0.98] transition-all shadow-[3px_3px_0_0_rgba(24,24,27,0.12)]"
            >
              {activeTab === 'mine' ? '添加用户专属' : '添加表情'}
            </button>
            {activeTab === 'mine' && !searchQuery && (
              <p className="text-[11px] text-zinc-500 mt-4 max-w-[260px] mx-auto leading-relaxed">
                公共表情请到「公共」分类添加，会自动出现在这里并显示「公共」标记。
              </p>
            )}
            <p className="text-[11px] text-zinc-400 mt-10 tracking-wide">This&apos;s all</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4 md:gap-5">
            {filteredStickers.map(sticker => (
              <article
                key={`${sticker.scope}-${sticker.id}`}
                className="flex flex-col rounded-2xl border border-zinc-900/12 bg-white p-2 md:p-2.5 shadow-[2px_3px_0_0_rgba(24,24,27,0.06)] hover:border-zinc-900/22 hover:shadow-[3px_4px_0_0_rgba(24,24,27,0.08)] transition-all md:hover:-translate-y-0.5"
              >
                <div className="relative aspect-square rounded-xl bg-zinc-50 overflow-hidden border border-zinc-900/8">
                  <img
                    src={sticker.imageUrl}
                    alt={sticker.description}
                    className="w-full h-full object-cover"
                  />
                  {activeTab === 'mine' && (
                    <span
                      className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-wide border ${
                        sticker.scope === 'common'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-800/20'
                          : 'bg-violet-50 text-violet-800 border-violet-800/20'
                      }`}
                    >
                      {sticker.scope === 'common' ? '公共' : '专属'}
                    </span>
                  )}
                </div>
                <p className="text-center text-[11px] md:text-xs font-semibold text-zinc-800 mt-2 leading-snug line-clamp-2 min-h-[2.5rem] md:min-h-[2.75rem] px-0.5">
                  {sticker.description}
                </p>
                {sticker.usage !== undefined && sticker.usage > 0 && (
                  <p className="text-center text-[10px] text-zinc-400 -mt-0.5 mb-1">使用 {sticker.usage}</p>
                )}
                <div className="flex gap-1 mt-auto pt-1 md:gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSticker(sticker);
                      setShowAddModal(true);
                    }}
                    className="flex-1 py-1.5 md:py-2 rounded-lg border border-zinc-900/15 bg-white text-zinc-700 hover:bg-zinc-50 flex items-center justify-center gap-1"
                    aria-label="编辑"
                  >
                    <Edit className="w-3.5 h-3.5 md:w-4 md:h-4" strokeWidth={2} />
                    <span className="hidden xl:inline text-[11px] font-semibold">编辑</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(sticker)}
                    className="flex-1 py-1.5 md:py-2 rounded-lg border border-red-200 bg-red-50/80 text-red-600 hover:bg-red-100 flex items-center justify-center gap-1"
                    aria-label="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" strokeWidth={2} />
                    <span className="hidden xl:inline text-[11px] font-semibold">删</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
          </div>
        </div>

        {showAddModal && (
          <AddStickerModal
            editingSticker={editingSticker}
            contextTab={activeTab}
            selectedCharacter={selectedCharacter}
            conversations={privateConversations}
            onClose={() => {
              setShowAddModal(false);
              setEditingSticker(null);
            }}
            onSuccess={() => {
              setShowAddModal(false);
              setEditingSticker(null);
              void loadStickers();
              void refreshSummaryCounts();
            }}
          />
        )}
      </div>
    </div>
  );
}

interface AddStickerModalProps {
  editingSticker: StickerItem | null;
  contextTab: StickerManagementTab;
  selectedCharacter: string | null;
  conversations: Conversation[];
  onClose: () => void;
  onSuccess: () => void;
}

function AddStickerModal({
  editingSticker,
  contextTab,
  selectedCharacter,
  conversations,
  onClose,
  onSuccess,
}: AddStickerModalProps) {
  const lockedScope: StickerScope = editingSticker
    ? editingSticker.scope
    : contextTab === 'mine'
      ? 'user'
      : contextTab === 'public'
        ? 'common'
        : 'character';

  const [imageUrl, setImageUrl] = useState(editingSticker?.imageUrl || '');
  const [description, setDescription] = useState(editingSticker?.description || '');
  const [tags, setTags] = useState(editingSticker?.tags?.join(', ') || '');
  const [characterId, setCharacterId] = useState(
    editingSticker?.characterId || selectedCharacter || ''
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (lockedScope === 'character' && !editingSticker && selectedCharacter) {
      setCharacterId(selectedCharacter);
    }
  }, [lockedScope, editingSticker, selectedCharacter]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const base64 = await imageToBase64(file);
      setImageUrl(base64);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : '图片上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!imageUrl.trim()) {
      alert('请上传图片');
      return;
    }
    if (!description.trim()) {
      alert('请填写表情包描述');
      return;
    }
    if (lockedScope === 'character' && !characterId) {
      alert('请选择角色');
      return;
    }

    try {
      const tagsArray = tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      if (editingSticker) {
        await updateSticker({
          ...editingSticker,
          imageUrl,
          description,
          tags: tagsArray,
          scope: lockedScope,
          characterId: lockedScope === 'character' ? characterId : undefined,
        });
      } else {
        await addSticker({
          imageUrl,
          description,
          tags: tagsArray,
          scope: lockedScope,
          characterId: lockedScope === 'character' ? characterId : undefined,
        });
      }

      onSuccess();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : '保存失败');
    }
  };

  const scopeHint =
    lockedScope === 'user'
      ? '保存为「用户专属」：仅你在聊天里选用发送，不会进入 AI 表情包匹配。'
      : lockedScope === 'common'
        ? '保存到「公共表情」：所有 AI 可选用，并会出现在「我的表情包」中。'
        : '保存为「角色专属」：仅该 AI 在对话中可选用；不会出现在公共库或你的选表情列表。';

  const characterLabel =
    lockedScope === 'character' && characterId
      ? conversations.find(c => c.id === characterId)?.characterSettings?.nickname ||
        conversations.find(c => c.id === characterId)?.name ||
        characterId
      : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(24, 24, 27, 0.45)' }}
    >
      <div className="bg-[#fafaf8] rounded-t-[22px] sm:rounded-2xl max-w-lg md:max-w-xl lg:max-w-2xl w-full max-h-[min(92dvh,640px)] sm:max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col border-2 border-zinc-900/90 shadow-[6px_8px_0_0_rgba(24,24,27,0.08)]">
        <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between border-b-2 border-zinc-900/90 bg-white">
          <h2 className="text-[15px] font-bold text-zinc-900 tracking-wide">
            {editingSticker ? '编辑表情' : '添加表情'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-zinc-900/20 text-zinc-600 hover:bg-zinc-100 text-lg leading-none font-light"
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4" style={GRID_PAPER_BG}>
          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-2 uppercase tracking-wide">
              图片 <span className="text-red-600">*</span>
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-zinc-900/20 rounded-2xl p-4 bg-white hover:border-zinc-900/35 transition-colors text-left"
            >
              {imageUrl ? (
                <img src={imageUrl} alt="预览" className="w-28 h-28 mx-auto object-cover rounded-xl border border-zinc-900/10" />
              ) : (
                <div className="text-center py-8">
                  <ImageIcon className="w-11 h-11 mx-auto mb-2 text-zinc-300" strokeWidth={1.25} />
                  <p className="text-sm text-zinc-700 font-medium">点击上传</p>
                  <p className="text-[11px] text-zinc-500 mt-1">JPG / PNG / GIF / WebP · 最大 5MB</p>
                </div>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            {uploading && <p className="text-xs text-zinc-600 mt-2 font-medium">上传中…</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-2 uppercase tracking-wide">
              描述 <span className="text-red-600">*</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="例如：开心、疑问…"
              rows={3}
              className="w-full px-3 py-2.5 border-2 border-zinc-900/15 rounded-xl bg-white focus:outline-none focus:border-zinc-900/35 resize-none text-[13px]"
            />
            <p className="text-[11px] text-zinc-500 mt-1">建议 2～4 个字，便于匹配。</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-2 uppercase tracking-wide">标签（可选）</label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="逗号分隔"
              className="w-full px-3 py-2.5 border-2 border-zinc-900/15 rounded-xl bg-white focus:outline-none focus:border-zinc-900/35 text-[13px]"
            />
          </div>

          <div className="rounded-xl border border-zinc-900/12 bg-white px-3 py-2.5 text-[11px] text-zinc-600 leading-relaxed">
            {scopeHint}
          </div>

          {lockedScope === 'character' && (
            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-2 uppercase tracking-wide">
                绑定角色 <span className="text-red-600">*</span>
              </label>
              {editingSticker ? (
                <div className="px-3 py-2.5 rounded-xl border-2 border-zinc-900/12 bg-white text-[13px] font-semibold text-zinc-900">
                  {characterLabel}
                </div>
              ) : (
                <select
                  value={characterId}
                  onChange={e => setCharacterId(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-zinc-900/15 rounded-xl bg-white focus:outline-none focus:border-zinc-900/35 text-[13px]"
                >
                  <option value="">请选择角色</option>
                  {conversations.map(conv => (
                    <option key={conv.id} value={conv.id}>
                      {conv.characterSettings?.nickname || conv.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t-2 border-zinc-900/90 px-4 py-3 flex gap-2 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border-2 border-zinc-900/20 text-zinc-800 font-bold text-sm hover:bg-zinc-50 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={uploading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm border-2 border-emerald-700 hover:bg-emerald-500 disabled:opacity-40 transition-colors shadow-[2px_3px_0_0_rgba(6,95,70,0.25)]"
          >
            {editingSticker ? '保存' : '添加'}
          </button>
        </div>
      </div>
    </div>
  );
}
