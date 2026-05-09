import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  Download,
  Edit3,
  FileUp,
  FileDown,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  type ApiConfig,
  type CharacterInteractionMode,
  type Conversation,
  type KnowledgeBaseItem,
  DEFAULT_PRIVATE_COMPOSER_QUIET_SECONDS,
} from '../types';
import MemoryManager from './MemoryManager';
import { useMobileBottomDock } from '../hooks/useMobileBottomDock';
import { smartLoad } from '../utils/storage';
import { enqueueMemoryEngineIfBacklogAfterSave } from '../utils/memorySystem';
import { resolvePrivateChatApiConfig } from '../utils/chatApiConfig';
import ChatModelOverridePicker from './ChatModelOverridePicker';
import { getCharacterOnlineHandle } from '../utils/characterIdentity';
import { exportCharacterStickerBundle } from '../utils/characterMigrationStickers';

type Props = {
  conversation: Conversation;
  allConversations: Conversation[];
  apiConfig: ApiConfig;
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void;
  onDeleteConversation?: (id: string) => void;
  onImportCharacter: (data: any) => void;
  onBack: () => void;
};

function clampHour(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(23, Math.round(n)));
}

function clampPrivateQuietSec(n: number) {
  if (!Number.isFinite(n)) return DEFAULT_PRIVATE_COMPOSER_QUIET_SECONDS;
  return Math.max(1, Math.min(120, Math.round(n)));
}

function ListRow(props: {
  label: string;
  value?: string;
  onClick?: () => void;
  right?: React.ReactNode;
}) {
  const { label, value, onClick, right } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between py-3 active:opacity-80"
    >
      <div className="text-sm text-gray-600">{label}</div>
      <div className="flex items-center gap-2">
        {value ? <div className="text-sm text-gray-900">{value}</div> : null}
        {right ?? <ChevronLeft className="w-4 h-4 text-gray-400 -rotate-180" />}
      </div>
    </button>
  );
}

export default function CharacterSettingsScreenV2(props: Props) {
  const {
    conversation,
    allConversations,
    apiConfig,
    onUpdateConversation,
    onDeleteConversation,
    onImportCharacter,
    onBack,
  } = props;

  const mobileBottomDock = useMobileBottomDock();
  const [page, setPage] = useState<'summary' | 'edit'>('summary');
  const [editStep, setEditStep] = useState<'basic' | 'advanced'>('basic');

  const cs = useMemo(() => ({
    nickname: '',
    realName: '',
    systemPrompt: '',
    personality: '',
    languageStyle: '',
    languageExample: '',
    memoryEvents: '',
    ...(conversation.characterSettings || {}),
  }), [conversation.characterSettings]);

  const [realName, setRealName] = useState(cs.realName ?? '');
  const [nickname, setNickname] = useState(cs.nickname ?? '');
  const [username, setUsername] = useState(cs.username || '');
  const [avatar, setAvatar] = useState(cs.avatar || '');
  const [systemPrompt, setSystemPrompt] = useState(cs.systemPrompt ?? '');
  const [personality, setPersonality] = useState(cs.personality ?? '');
  const [languageStyle, setLanguageStyle] = useState(cs.languageStyle ?? '');
  const [languageExample, setLanguageExample] = useState(cs.languageExample ?? '');
  const [memoryEvents, setMemoryEvents] = useState(cs.memoryEvents ?? '');
  const [interactionMode, setInteractionMode] = useState<CharacterInteractionMode>(cs.interactionMode ?? 'companion');

  const [memoryConfigEnabled, setMemoryConfigEnabled] = useState(cs.memoryConfig?.enabled ?? true);
  const [momentsMemoryEnabled, setMomentsMemoryEnabled] = useState(cs.momentsMemoryConfig?.enabled ?? true);
  const [disableWorldbook, setDisableWorldbook] = useState(cs.disableWorldbook ?? false);
  const [chatModelOverride, setChatModelOverride] = useState(cs.chatModelOverride ?? '');

  // 未持久化 enabled 时视为关，与调度层 `?.enabled` 一致
  const [proactiveEnabled, setProactiveEnabled] = useState(cs.proactiveMessaging?.enabled ?? false);
  const [activeHourStart, setActiveHourStart] = useState(clampHour(cs.proactiveMessaging?.activeHourStart ?? 8));
  const [activeHourEnd, setActiveHourEnd] = useState(clampHour(cs.proactiveMessaging?.activeHourEnd ?? 23));
  const [wakeSensitivityMode, setWakeSensitivityMode] = useState<'auto' | 'light' | 'normal' | 'deep'>(
    cs.proactiveMessaging?.wakeSensitivityMode || 'auto'
  );
  /** 睡眠与生活轨迹中的「睡眠中延迟回复」；与主动发消息独立 */
  const [sleepSimulationEnabled, setSleepSimulationEnabled] = useState(
    cs.proactiveMessaging?.sleepSimulationEnabled !== false
  );

  const [privateComposerQuietSeconds, setPrivateComposerQuietSeconds] = useState(
    clampPrivateQuietSec(conversation.privateComposerQuietSeconds ?? DEFAULT_PRIVATE_COMPOSER_QUIET_SECONDS)
  );

  const [showMemoryManager, setShowMemoryManager] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseItem[]>(cs.knowledgeBase || []);
  const [showKbModal, setShowKbModal] = useState(false);
  const [editingKb, setEditingKb] = useState<KnowledgeBaseItem | null>(null);
  const [kbTitle, setKbTitle] = useState('');
  const [kbContent, setKbContent] = useState('');

  // 聊天记录管理
  const chatImportRef = useRef<HTMLInputElement>(null);
  const [showChatImportSheet, setShowChatImportSheet] = useState(false);
  const [chatImportMode, setChatImportMode] = useState<'replace' | 'append'>('replace');
  const [pendingChatImport, setPendingChatImport] = useState<any[] | null>(null);

  // 迁移 bottom sheet
  const [showMigrationSheet, setShowMigrationSheet] = useState(false);
  const [includeMessages, setIncludeMessages] = useState(true); // 默认包含聊天记录
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 当切换到别的角色时同步字段（避免残留）
    setRealName(cs.realName ?? '');
    setNickname(cs.nickname ?? '');
    setUsername(cs.username || '');
    setAvatar(cs.avatar || '');
    setSystemPrompt(cs.systemPrompt ?? '');
    setPersonality(cs.personality ?? '');
    setLanguageStyle(cs.languageStyle ?? '');
    setLanguageExample(cs.languageExample ?? '');
    setMemoryEvents(cs.memoryEvents ?? '');
    setInteractionMode(cs.interactionMode ?? 'companion');
    setMemoryConfigEnabled(cs.memoryConfig?.enabled ?? true);
    setMomentsMemoryEnabled(cs.momentsMemoryConfig?.enabled ?? true);
    setDisableWorldbook(cs.disableWorldbook ?? false);
    setChatModelOverride(cs.chatModelOverride ?? '');
    setProactiveEnabled(cs.proactiveMessaging?.enabled ?? false);
    setActiveHourStart(clampHour(cs.proactiveMessaging?.activeHourStart ?? 8));
    setActiveHourEnd(clampHour(cs.proactiveMessaging?.activeHourEnd ?? 23));
    setWakeSensitivityMode(cs.proactiveMessaging?.wakeSensitivityMode || 'auto');
    setSleepSimulationEnabled(cs.proactiveMessaging?.sleepSimulationEnabled !== false);
    setPrivateComposerQuietSeconds(
      clampPrivateQuietSec(conversation.privateComposerQuietSeconds ?? DEFAULT_PRIVATE_COMPOSER_QUIET_SECONDS)
    );
    setKnowledgeBase(cs.knowledgeBase || []);
    setEditStep('basic');
  }, [cs, conversation.id]);

  const handleDeleteFriend = () => {
    if (!onDeleteConversation) return;
    const ok = window.confirm('确定要删除该好友/角色吗？此操作不可撤销。');
    if (!ok) return;
    onDeleteConversation(conversation.id);
    onBack();
  };

  const handleSave = () => {
    const currentFeatures = conversation.enabledFeatures || [];
    let updatedFeatures = [...currentFeatures];
    if (memoryConfigEnabled) {
      if (!updatedFeatures.includes('memory-system')) updatedFeatures.push('memory-system');
    } else {
      updatedFeatures = updatedFeatures.filter((f) => f !== 'memory-system');
    }

    const nextName = nickname || conversation.name;
    const nextPrivateQuiet = clampPrivateQuietSec(privateComposerQuietSeconds);
    const isTool = interactionMode === 'tool';
    const effectiveMomentsMemory = isTool ? false : momentsMemoryEnabled;
    const effectiveProactive = isTool ? false : proactiveEnabled;
    const effectiveSleepSim = isTool ? false : sleepSimulationEnabled;

    const nextCharacterSettings = {
      ...(conversation.characterSettings || ({} as any)),
      avatar,
      realName: realName.trim(),
      nickname,
      username,
      systemPrompt,
      personality,
      languageStyle,
      languageExample,
      memoryEvents,
      interactionMode,
      memoryConfig: { enabled: memoryConfigEnabled },
      momentsMemoryConfig: { enabled: effectiveMomentsMemory },
      disableWorldbook,
      proactiveMessaging: {
        ...(conversation.characterSettings?.proactiveMessaging || ({} as any)),
        enabled: effectiveProactive,
        sleepSimulationEnabled: effectiveSleepSim,
        activeHourStart,
        activeHourEnd,
        autoIntervalByAI: true,
        relationAware: true,
        wakeSensitivityMode,
        // 兼容字段保留
        minInterval: conversation.characterSettings?.proactiveMessaging?.minInterval || 30,
        maxInterval: conversation.characterSettings?.proactiveMessaging?.maxInterval || 180,
        lastMessageTime: conversation.characterSettings?.proactiveMessaging?.lastMessageTime,
      },
      knowledgeBase,
      chatModelOverride: chatModelOverride.trim() ? chatModelOverride.trim() : undefined,
    };

    onUpdateConversation(conversation.id, {
      name: nextName,
      characterSettings: nextCharacterSettings,
      enabledFeatures: updatedFeatures,
      ...(conversation.type === 'private' ? { privateComposerQuietSeconds: nextPrivateQuiet } : {}),
    });

    const mergedForApi: Conversation = {
      ...conversation,
      name: nextName,
      enabledFeatures: updatedFeatures,
      characterSettings: nextCharacterSettings,
      ...(conversation.type === 'private' ? { privateComposerQuietSeconds: nextPrivateQuiet } : {}),
    };
    enqueueMemoryEngineIfBacklogAfterSave(
      conversation,
      { name: nextName, enabledFeatures: updatedFeatures, characterSettings: nextCharacterSettings },
      resolvePrivateChatApiConfig(apiConfig, mergedForApi)
    );

    alert('已保存');
    setPage('summary');
  };

  const handlePickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setAvatar(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const openKbEditor = (item?: KnowledgeBaseItem) => {
    if (item) {
      setEditingKb(item);
      setKbTitle(item.title || '');
      setKbContent(item.content || '');
    } else {
      setEditingKb(null);
      setKbTitle('');
      setKbContent('');
    }
    setShowKbModal(true);
  };

  const saveKbItem = () => {
    if (!kbTitle.trim() || !kbContent.trim()) {
      alert('请填写标题和内容');
      return;
    }
    if (editingKb) {
      setKnowledgeBase((prev) =>
        prev.map((x) =>
          x.id === editingKb.id ? { ...x, title: kbTitle.trim(), content: kbContent.trim(), updatedAt: Date.now() } : x
        )
      );
    } else {
      const now = Date.now();
      const next: KnowledgeBaseItem = {
        id: String(now),
        title: kbTitle.trim(),
        content: kbContent.trim(),
        type: 'text',
        createdAt: now,
        updatedAt: now,
      };
      setKnowledgeBase((prev) => [next, ...prev]);
    }
    setShowKbModal(false);
  };

  const deleteKbItem = (id: string) => {
    const ok = window.confirm('确定删除这条资料吗？');
    if (!ok) return;
    setKnowledgeBase((prev) => prev.filter((x) => x.id !== id));
  };

  const exportChatMessages = () => {
    const payload = {
      conversationId: conversation.id,
      conversationName: conversation.name,
      exportedAt: new Date().toISOString(),
      messages: conversation.messages || [],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conversation.name}_聊天记录_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('✅ 聊天记录已导出');
  };

  const onPickChatImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const raw = JSON.parse(String(evt.target?.result || ''));
        const msgs = Array.isArray(raw?.messages) ? raw.messages : Array.isArray(raw) ? raw : null;
        if (!msgs) throw new Error('文件格式不正确（缺少 messages 数组）');
        setPendingChatImport(msgs);
        setShowChatImportSheet(true);
      } catch (err: any) {
        alert(`❌ 导入失败：${err?.message || String(err)}`);
      } finally {
        if (chatImportRef.current) chatImportRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const commitChatImport = () => {
    if (!pendingChatImport) return;
    const imported = pendingChatImport as any[];
    const nextMessages =
      chatImportMode === 'append'
        ? [...(conversation.messages || []), ...imported]
        : imported;
    onUpdateConversation(conversation.id, {
      messages: nextMessages,
      lastMessageTime: Date.now(),
    });
    setPendingChatImport(null);
    setShowChatImportSheet(false);
    alert(`✅ 已导入聊天记录（${chatImportMode === 'append' ? '追加' : '覆盖'}）`);
  };

  const handleExportCharacter = async () => {
    try {
      const allMemoryBanks = ((await smartLoad('chat_memory_banks')) as any[]) || [];
      const memoryBank = allMemoryBanks.find((bank: any) => bank.conversationId === conversation.id);

      const momentsKey = `moments_${conversation.id}`;
      const moments = ((await smartLoad(momentsKey)) as any) || null;

      const financeKey = `ai_finance_${conversation.id}`;
      const finance = ((await smartLoad(financeKey)) as any) || null;

      const allRelationships = ((await smartLoad('relationships')) as any[]) || [];
      const characterRelationships = allRelationships.filter(
        (rel: any) => rel.personId === conversation.id || rel.targetId === conversation.id
      );

      const allDocuments = ((await smartLoad('document_library')) as any[]) || [];
      const characterDocuments = allDocuments.filter((doc: any) => doc.conversationId === conversation.id);

      const stickerBundle = await exportCharacterStickerBundle(conversation.id);

      const stats = {
        messagesCount: conversation.messages.length,
        memoriesCount: memoryBank?.memories?.length || 0,
        momentsCount: moments?.posts?.length || 0,
        knowledgeBaseCount: conversation.characterSettings?.knowledgeBase?.length || 0,
        documentsCount: characterDocuments.length,
        relationshipsCount: characterRelationships.length,
        hasFinanceData: !!finance,
        hasAIStatus: !!conversation.aiStatus,
        wechatStickerCount: stickerBundle.wechatSimulatorCharacterStickers.length,
        easyChatStickerCount: stickerBundle.easyChatCharacterStickers.length,
      };

      const exportData = {
        version: '2.1',
        exportTime: new Date().toISOString(),
        character: {
          id: conversation.id,
          type: conversation.type,
          name: conversation.name,
          avatar: conversation.avatar,
          characterSettings: conversation.characterSettings,
          enabledFeatures: conversation.enabledFeatures,
          lastMessageTime: conversation.lastMessageTime,
          isMuted: conversation.isMuted,
          groupRemark: conversation.groupRemark,
          members: conversation.members,
          aiStatus: conversation.aiStatus,
          privateComposerQuietSeconds: conversation.privateComposerQuietSeconds,
          replySplitPreference: conversation.replySplitPreference,
        },
        memoryBank,
        moments,
        finance,
        relationships: characterRelationships,
        documents: characterDocuments,
        messages: includeMessages ? conversation.messages : [],
        /** 主聊天表情库 + EasyChat 角色表情（与全量备份侧车无关，仅角色包） */
        stickersMigration: stickerBundle,
        stats,
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${conversation.name}_角色迁移_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert(
        `✅ 已导出（v2.1）\n\n` +
          `• 记忆库：${stats.memoriesCount} 条\n` +
          `• 资料/知识库：在角色设置内（characterSettings）\n` +
          `• 文档库：${stats.documentsCount} 份\n` +
          `• 表情包（主聊天库）：${stats.wechatStickerCount} 个\n` +
          `• 表情包（EasyChat 库）：${stats.easyChatStickerCount} 个\n` +
          `• 朋友圈：${stats.momentsCount} 条\n` +
          `• 关系：${stats.relationshipsCount} 个\n` +
          `• 聊天记录：${includeMessages ? `${stats.messagesCount} 条` : '未包含'}`
      );
      setShowMigrationSheet(false);
    } catch (e: any) {
      alert(`❌ 导出失败：${e?.message || String(e)}`);
    }
  };

  const handleImportCharacterFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(String(evt.target?.result || ''));
        onImportCharacter(json);
        setShowMigrationSheet(false);
      } catch (err: any) {
        alert(`❌ 导入失败：${err?.message || String(err)}`);
      } finally {
        if (importInputRef.current) importInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const onlineHandlePreview = getCharacterOnlineHandle({ ...cs, nickname, username, realName: realName.trim() }, conversation.name);

  return (
    <div className="h-[100dvh] md:h-full min-h-0 bg-[#F3F4F6] flex flex-col overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between shrink-0 ${page === 'summary' ? 'bg-transparent' : 'bg-white border-b border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (page === 'edit') setPage('summary');
              else onBack();
            }}
            className="p-2 -ml-2"
          >
            <ChevronLeft className="w-6 h-6 text-gray-900" />
          </button>
          <div className="text-lg font-semibold text-gray-900">{page === 'summary' ? '角色' : '编辑资料'}</div>
        </div>

        {page === 'summary' ? (
          <button
            onClick={handleDeleteFriend}
            disabled={!onDeleteConversation}
            className="px-3 py-1.5 rounded-full bg-white/90 border border-gray-200 text-sm font-medium text-red-600 disabled:opacity-50"
          >
            删除好友
          </button>
        ) : (
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-full bg-gray-900 text-white text-sm font-medium"
          >
            完成
          </button>
        )}
      </div>

      {/* Content */}
      {page === 'summary' ? (
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y px-4 pb-6"
          style={{ paddingBottom: `calc(${24 + mobileBottomDock}px + env(safe-area-inset-bottom))` }}
        >
          <div className="pt-3 pb-6">
            <div className="relative rounded-[28px] overflow-hidden bg-gradient-to-b from-indigo-400 via-sky-300 to-slate-100 p-5 shadow-sm">
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  background:
                    'radial-gradient(800px 300px at 50% 0%, rgba(255,255,255,0.85), rgba(255,255,255,0) 60%)',
                }}
              />
              <div className="relative">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-white/70 backdrop-blur flex items-center justify-center overflow-hidden shadow-sm">
                    {avatar ? (
                      <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-800 font-semibold text-xl">{(nickname || conversation.name || '?').charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-semibold text-gray-900 truncate">
                      {nickname || conversation.name || '未命名角色'}
                    </div>
                    {(realName || '').trim() || onlineHandlePreview ? (
                      <div className="text-[12px] text-gray-700/80 truncate space-x-2">
                        {(realName || '').trim() ? <span>本名：{(realName || '').trim()}</span> : null}
                        {onlineHandlePreview ? <span>网名：{onlineHandlePreview}</span> : null}
                      </div>
                    ) : null}
                    <div className="mt-2">
                      <span
                        className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          (cs.interactionMode ?? 'companion') === 'tool'
                            ? 'bg-slate-800/90 text-white'
                            : 'bg-white/70 text-gray-800 border border-white/60'
                        }`}
                      >
                        {(cs.interactionMode ?? 'companion') === 'tool' ? '工具型助手' : '陪伴型角色'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 bg-white/85 backdrop-blur rounded-2xl p-4 shadow-sm border border-white/60">
                  <ListRow
                    label="角色迁移"
                    value="导入/导出"
                    onClick={() => setShowMigrationSheet(true)}
                  />
                  <div className="h-px bg-gray-200/70" />
                  <button
                    onClick={() => setPage('edit')}
                    className="mt-4 w-full py-3 rounded-2xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 active:bg-gray-900 flex items-center justify-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    编辑
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y px-4 pt-4 space-y-4">
            {/* 翻页式：基础 / 高级 */}
            <div className="bg-white rounded-3xl p-2 shadow-sm border border-gray-100 flex gap-2">
              <button
                type="button"
                onClick={() => setEditStep('basic')}
                className={`flex-1 py-2 rounded-2xl text-sm font-medium ${
                  editStep === 'basic' ? 'bg-gray-900 text-white' : 'bg-transparent text-gray-700'
                }`}
              >
                基础
              </button>
              <button
                type="button"
                onClick={() => setEditStep('advanced')}
                className={`flex-1 py-2 rounded-2xl text-sm font-medium ${
                  editStep === 'advanced' ? 'bg-gray-900 text-white' : 'bg-transparent text-gray-700'
                }`}
              >
                高级
              </button>
            </div>

          {/* p1 style: profile card */}
          <div className={`bg-white rounded-3xl p-4 shadow-sm border border-gray-100 ${editStep === 'basic' ? '' : 'hidden'}`}>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-full bg-gray-100 overflow-hidden shrink-0">
                {avatar ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" /> : null}
                <label className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-black text-white flex items-center justify-center cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePickAvatar} />
                </label>
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <div className="text-xs text-gray-500">角色本名</div>
                  <input
                    value={realName}
                    onChange={(e) => setRealName(e.target.value)}
                    className="mt-1 w-full text-base font-semibold text-gray-900 outline-none"
                    placeholder="角色自我认同的名字"
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-500">备注名（仅在你的列表显示）</div>
                  <input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="mt-1 w-full text-sm font-medium text-gray-900 outline-none"
                    placeholder="通讯录备注"
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-500">角色网名（对外展示，可由角色自改）</div>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-1 w-full text-sm text-gray-800 outline-none"
                    placeholder="群聊名片展示；可聊天末尾改名，也可仅后台静默更新（你不一定会看到一条「改名通知」）"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 互动类型 */}
          <div className={`bg-white rounded-3xl p-4 shadow-sm border border-gray-100 ${editStep === 'basic' ? '' : 'hidden'}`}>
            <div className="text-sm font-semibold text-gray-900 mb-2">互动类型</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setInteractionMode('companion')}
                className={`flex-1 py-2.5 rounded-2xl text-sm font-medium border-2 transition-colors ${
                  interactionMode === 'companion'
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-700'
                }`}
              >
                陪伴型
              </button>
              <button
                type="button"
                onClick={() => {
                  setInteractionMode('tool');
                  setProactiveEnabled(false);
                  setMomentsMemoryEnabled(false);
                }}
                className={`flex-1 py-2.5 rounded-2xl text-sm font-medium border-2 transition-colors ${
                  interactionMode === 'tool'
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-700'
                }`}
              >
                工具型
              </button>
            </div>
            <p className="mt-2 text-[11px] text-gray-500 leading-relaxed">
              工具型：偏助手式回复，无生活轨迹与主动消息，不参与 AI 朋友圈。陪伴型：默认角色感与日常互动。
            </p>
          </div>

          {/* persona */}
          <div className={`bg-white rounded-3xl p-4 shadow-sm border border-gray-100 ${editStep === 'basic' ? '' : 'hidden'}`}>
            <div className="text-sm font-semibold text-gray-900 mb-3">人设</div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">系统设定</div>
                <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm min-h-[88px] outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">性格</div>
                <textarea value={personality} onChange={(e) => setPersonality(e.target.value)} className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm min-h-[64px] outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">语言风格</div>
                <textarea value={languageStyle} onChange={(e) => setLanguageStyle(e.target.value)} className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm min-h-[64px] outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">语言示例</div>
                <textarea value={languageExample} onChange={(e) => setLanguageExample(e.target.value)} className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm min-h-[64px] outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">重要记忆事件</div>
                <textarea value={memoryEvents} onChange={(e) => setMemoryEvents(e.target.value)} className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm min-h-[64px] outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
            </div>
          </div>

          {/* toggles */}
          <div className={`bg-white rounded-3xl p-4 shadow-sm border border-gray-100 ${editStep === 'basic' ? '' : 'hidden'}`}>
            <div className="text-sm font-semibold text-gray-900 mb-3">偏好</div>
            <div className="divide-y divide-gray-100">
              <div className="py-3 flex items-center justify-between">
                <div className="text-sm text-gray-700">完整记忆系统</div>
                <button type="button" onClick={() => setMemoryConfigEnabled(!memoryConfigEnabled)} className={`w-11 h-6 rounded-full relative ${memoryConfigEnabled ? 'bg-gray-900' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${memoryConfigEnabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              {interactionMode === 'tool' ? (
                <div className="py-3">
                  <div className="text-sm text-gray-700">朋友圈记忆</div>
                  <div className="mt-1 text-[11px] text-gray-500">工具型固定关闭（保存后生效）</div>
                </div>
              ) : (
                <div className="py-3 flex items-center justify-between">
                  <div className="text-sm text-gray-700">朋友圈记忆</div>
                  <button type="button" onClick={() => setMomentsMemoryEnabled(!momentsMemoryEnabled)} className={`w-11 h-6 rounded-full relative ${momentsMemoryEnabled ? 'bg-gray-900' : 'bg-gray-300'}`}>
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${momentsMemoryEnabled ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              )}
              <div className="py-3 flex items-center justify-between">
                <div className="text-sm text-gray-700">禁用世界书</div>
                <button type="button" onClick={() => setDisableWorldbook(!disableWorldbook)} className={`w-11 h-6 rounded-full relative ${disableWorldbook ? 'bg-gray-900' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${disableWorldbook ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* 翻页按钮仅在底部固定区渲染一份，避免与滚动区内重复 */}

          {conversation.type === 'private' ? (
            <div className={`bg-white rounded-3xl p-4 shadow-sm border border-gray-100 ${editStep === 'advanced' ? '' : 'hidden'}`}>
              <div className="text-sm font-semibold text-gray-900 mb-1">私聊延迟回复</div>
              <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
                输入框草稿为空（中文输入法正在组字时也算「还在打字」）、并连续安静满下列秒数后，再生成 AI 回复。未改过此项时默认{' '}
                {DEFAULT_PRIVATE_COMPOSER_QUIET_SECONDS} 秒。文字与图片、文件、语音、表情包共用。
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-600">等待秒数</span>
                <input
                  type="number"
                  min={1}
                  max={120}
                  inputMode="numeric"
                  value={privateComposerQuietSeconds}
                  onChange={(e) => setPrivateComposerQuietSeconds(clampPrivateQuietSec(Number(e.target.value)))}
                  className="w-20 rounded-xl border border-gray-200 px-2 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-gray-900/10"
                />
                <span className="text-[11px] text-gray-500">
                  范围 1～120，默认 {DEFAULT_PRIVATE_COMPOSER_QUIET_SECONDS}
                </span>
              </div>
            </div>
          ) : null}

          {/* proactive */}
          <div className={`bg-white rounded-3xl p-4 shadow-sm border border-gray-100 ${editStep === 'advanced' ? '' : 'hidden'}`}>
            <div className="text-sm font-semibold text-gray-900 mb-3">主动消息与睡眠</div>
            {interactionMode === 'tool' ? (
              <p className="text-xs text-gray-500 leading-relaxed">
                工具型角色不使用主动消息，也不参与睡眠与生活轨迹中的「睡眠中延迟回复」；切换为「陪伴型」后可分别配置。
              </p>
            ) : (
              <>
                <div className="py-3 flex items-center justify-between gap-3 border-b border-gray-100">
                  <div>
                    <div className="text-sm text-gray-700">AI 主动发消息</div>
                    <div className="mt-0.5 text-[11px] text-gray-500">
                      默认关闭以省接口消耗；开启后后台随机错峰（每轮约 1～3 个角色会尝试），与睡眠开关无关
                    </div>
                  </div>
                  <button type="button" onClick={() => setProactiveEnabled(!proactiveEnabled)} className={`shrink-0 w-11 h-6 rounded-full relative ${proactiveEnabled ? 'bg-gray-900' : 'bg-gray-300'}`}>
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${proactiveEnabled ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
                <div className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-gray-700">睡眠中延迟回复</div>
                    <div className="mt-0.5 text-[11px] text-gray-500">与生活轨迹联动；关掉则不再按「睡眠叫醒」拖慢首条回复</div>
                  </div>
                  <button type="button" onClick={() => setSleepSimulationEnabled(!sleepSimulationEnabled)} className={`shrink-0 w-11 h-6 rounded-full relative ${sleepSimulationEnabled ? 'bg-gray-900' : 'bg-gray-300'}`}>
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${sleepSimulationEnabled ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
                {proactiveEnabled ? (
                  <div className="mt-3 space-y-3 pt-1 border-t border-gray-100">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-gray-500">主动消息 · 活跃时段</div>
                      <div className="flex items-center gap-2">
                        <input value={activeHourStart} onChange={(e) => setActiveHourStart(clampHour(Number(e.target.value)))} inputMode="numeric" className="w-16 text-center rounded-xl border border-gray-200 px-2 py-2 text-sm" />
                        <div className="text-gray-400">-</div>
                        <input value={activeHourEnd} onChange={(e) => setActiveHourEnd(clampHour(Number(e.target.value)))} inputMode="numeric" className="w-16 text-center rounded-xl border border-gray-200 px-2 py-2 text-sm" />
                      </div>
                    </div>
                  </div>
                ) : null}
                {sleepSimulationEnabled ? (
                  <div className="mt-3 space-y-3 pt-1 border-t border-gray-100">
                    <div className="text-xs text-gray-500">睡眠 · 叫醒阈值</div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'auto', label: '自动' },
                        { id: 'light', label: '易醒' },
                        { id: 'normal', label: '普通' },
                        { id: 'deep', label: '深睡' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setWakeSensitivityMode(m.id as any)}
                          className={`px-2 py-2 rounded-2xl text-xs border ${
                            wakeSensitivityMode === m.id
                              ? 'bg-gray-900 text-white border-gray-900'
                              : 'bg-white text-gray-700 border-gray-200'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className={`bg-white rounded-3xl p-4 shadow-sm border border-gray-100 ${editStep === 'advanced' ? '' : 'hidden'}`}>
            <div className="text-sm font-semibold text-gray-900 mb-1">单独配置模型</div>
            <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
              留空则使用设置里的全局对话模型。仅覆盖文字对话；视觉模型仍在全局设置中配置。点开模型下拉会自动拉取列表（约 25 秒内不重复请求）；也可点「拉取」。
            </p>
            <ChatModelOverridePicker
              apiConfig={apiConfig}
              value={chatModelOverride}
              onChange={setChatModelOverride}
              emptyOptionLabel="（留空：使用全局默认）"
              placeholder={apiConfig.modelName ? `默认：${apiConfig.modelName}` : '例如 gpt-4o-mini'}
            />
          </div>

          {/* managers */}
          <div className={`bg-white rounded-3xl p-4 shadow-sm border border-gray-100 ${editStep === 'advanced' ? '' : 'hidden'}`}>
            <div className="text-sm font-semibold text-gray-900 mb-3">管理</div>
            <div className="divide-y divide-gray-100">
              <ListRow label="记忆管理" value="" onClick={() => setShowMemoryManager(true)} />
              <ListRow label="角色迁移" value="导入/导出" onClick={() => setShowMigrationSheet(true)} />
            </div>
          </div>

          {/* knowledge base */}
          <div className={`bg-white rounded-3xl p-4 shadow-sm border border-gray-100 ${editStep === 'advanced' ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-gray-900">专属资料库</div>
              <button
                type="button"
                onClick={() => openKbEditor()}
                className="px-3 py-1.5 rounded-full bg-gray-900 text-white text-xs font-medium"
              >
                新增
              </button>
            </div>
            {knowledgeBase.length === 0 ? (
              <div className="text-xs text-gray-500 py-2">暂无资料</div>
            ) : (
              <div className="space-y-2">
                {knowledgeBase.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{item.title}</div>
                        <div className="mt-1 text-xs text-gray-500 line-clamp-2 whitespace-pre-wrap">
                          {String(item.content || '').slice(0, 180)}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openKbEditor(item)}
                          className="px-2 py-1 rounded-lg text-xs border border-gray-200 text-gray-700"
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteKbItem(item.id)}
                          className="px-2 py-1 rounded-lg text-xs border border-red-200 text-red-600"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {knowledgeBase.length > 8 ? (
                  <div className="text-[11px] text-gray-500">仅展示前 8 条，更多请继续添加/编辑管理。</div>
                ) : null}
              </div>
            )}
          </div>

          {/* chat record management */}
          <div className={`bg-white rounded-3xl p-4 shadow-sm border border-gray-100 ${editStep === 'advanced' ? '' : 'hidden'}`}>
            <div className="text-sm font-semibold text-gray-900 mb-3">聊天记录管理</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={exportChatMessages}
                className="py-3 rounded-2xl border border-gray-200 text-gray-900 font-medium flex items-center justify-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                导出
              </button>
              <button
                type="button"
                onClick={() => chatImportRef.current?.click()}
                className="py-3 rounded-2xl bg-gray-900 text-white font-medium flex items-center justify-center gap-2"
              >
                <FileUp className="w-4 h-4" />
                导入
              </button>
            </div>
            <input
              ref={chatImportRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={onPickChatImport}
            />
            <div className="mt-2 text-[11px] text-gray-500">
              导入支持“覆盖/追加”。建议优先覆盖，避免重复消息。
            </div>
          </div>
          <div className="h-6" />
          </div>

          {/* 底部操作区：不跟随滚动，保证可点击 */}
          <div
            className="shrink-0 px-4 pt-3 bg-[#F3F4F6]"
            style={{ paddingBottom: `calc(${12 + mobileBottomDock}px + env(safe-area-inset-bottom))` }}
          >
            {editStep === 'basic' ? (
              <button
                type="button"
                onClick={() => setEditStep('advanced')}
                className="w-full py-3 rounded-2xl bg-gray-900 text-white text-sm font-medium"
              >
                下一页（主动消息 / 资料库 / 聊天记录）
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEditStep('basic')}
                  className="py-3 rounded-2xl border border-gray-200 text-gray-900 text-sm font-medium bg-white"
                >
                  上一页
                </button>
                <button
                  type="button"
                  onClick={() => setEditStep('basic')}
                  className="py-3 rounded-2xl bg-gray-900 text-white text-sm font-medium"
                >
                  回到基础
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom sheet: migration */}
      {showMigrationSheet ? (
        <div className="fixed inset-0 z-[9999]">
          <button
            type="button"
            onClick={() => setShowMigrationSheet(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl p-4 pb-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold text-gray-900">角色迁移</div>
              <button type="button" onClick={() => setShowMigrationSheet(false)} className="p-2">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mt-3 bg-gray-50 rounded-2xl p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">不带聊天记录</div>
                <button
                  type="button"
                  onClick={() => setIncludeMessages((v) => !v)}
                  className={`w-11 h-6 rounded-full relative ${includeMessages ? 'bg-gray-300' : 'bg-gray-900'}`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${includeMessages ? '' : 'translate-x-5'}`} />
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {includeMessages ? '当前：会包含聊天记录（文件更大）' : '当前：仅导出核心角色数据（更轻）'}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="py-3 rounded-2xl border border-gray-200 text-gray-900 font-medium"
              >
                导入
              </button>
              <button
                type="button"
                onClick={handleExportCharacter}
                className="py-3 rounded-2xl bg-gray-900 text-white font-medium flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                导出
              </button>
            </div>

            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportCharacterFile}
            />

            <div className="mt-3 text-[11px] text-gray-500">
              导入后会在应用内创建/恢复该角色数据。子聊天功能后续会重做，这里暂不参与迁移。
            </div>
          </div>
        </div>
      ) : null}

      {/* overlays */}
      {showMemoryManager ? (
        <MemoryManager
          conversationId={conversation.id}
          conversationName={conversation.name}
          onClose={() => setShowMemoryManager(false)}
        />
      ) : null}

      {showKbModal ? (
        <div className="fixed inset-0 z-[9999]">
          <button type="button" onClick={() => setShowKbModal(false)} className="absolute inset-0 bg-black/40" />
          <div className="absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl p-4 pb-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold text-gray-900">{editingKb ? '编辑资料' : '新增资料'}</div>
              <button type="button" onClick={() => setShowKbModal(false)} className="p-2">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="mt-3 space-y-3">
              <input
                value={kbTitle}
                onChange={(e) => setKbTitle(e.target.value)}
                placeholder="标题"
                className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none"
              />
              <textarea
                value={kbContent}
                onChange={(e) => setKbContent(e.target.value)}
                placeholder="内容"
                className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm min-h-[140px] outline-none"
              />
              <button
                type="button"
                onClick={saveKbItem}
                className="w-full py-3 rounded-2xl bg-gray-900 text-white font-medium"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showChatImportSheet ? (
        <div className="fixed inset-0 z-[9999]">
          <button type="button" onClick={() => setShowChatImportSheet(false)} className="absolute inset-0 bg-black/40" />
          <div className="absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl p-4 pb-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold text-gray-900">导入聊天记录</div>
              <button type="button" onClick={() => setShowChatImportSheet(false)} className="p-2">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { id: 'replace', label: '覆盖' },
                { id: 'append', label: '追加' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setChatImportMode(m.id as any)}
                  className={`py-2 rounded-2xl text-sm border ${
                    chatImportMode === m.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-800 border-gray-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-600">
              本次将导入 {Array.isArray(pendingChatImport) ? pendingChatImport.length : 0} 条消息
            </div>
            <button
              type="button"
              onClick={commitChatImport}
              className="mt-4 w-full py-3 rounded-2xl bg-gray-900 text-white font-medium"
            >
              确认导入
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

