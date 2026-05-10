import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  Download,
  Edit3,
  FileUp,
  FileDown,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Upload,
  Volume2,
  X,
} from 'lucide-react';
import {
  type ApiConfig,
  type CharacterInteractionMode,
  type CharacterTtsSettings,
  type Conversation,
  type EditCalibrationEntry,
  type KnowledgeBaseItem,
  type LanguageStyleProfileDoc,
  DEFAULT_PRIVATE_COMPOSER_QUIET_SECONDS,
} from '../types';
import MemoryManager from './MemoryManager';
import { useMobileBottomDock } from '../hooks/useMobileBottomDock';
import { smartLoad } from '../utils/storage';
import { enqueueMemoryEngineIfBacklogAfterSave } from '../utils/memorySystem';
import { resolvePrivateChatApiConfig } from '../utils/chatApiConfig';
import {
  clampTtsSpeed,
  clampTtsVol,
  isMinimaxTtsCredentialsReady,
  normalizeVoiceSettingPitch,
  synthesizeMinimaxTtsToBlob,
} from '../utils/minimaxTts';
import ChatModelOverridePicker from './ChatModelOverridePicker';
import { getCharacterOnlineHandle } from '../utils/characterIdentity';
import { exportCharacterStickerBundle } from '../utils/characterMigrationStickers';
import { loadEditCalibrationEntries } from '../utils/editCalibrationStorage';
import { loadLanguageStyleProfileDoc } from '../utils/languageStyleProfileStorage';

/** 新建角色 / 切换角色时试听框的默认例句；可自行改成与调试台同一句以便对比 */
const DEFAULT_TTS_PREVIEW_SENTENCE = '这是一段试听，用于确认当前角色的音色。';

/** T2A 的 language_boost：语言增强提示，不是对话模型、也不是 speech 合成模型 ID */
const TTS_LANG_BOOST_PRESET_VALUES = ['auto', 'Chinese', 'English', 'Japanese', 'Korean', 'none'] as const;
const TTS_LANG_BOOST_PRESET_LIST = TTS_LANG_BOOST_PRESET_VALUES as readonly string[];
const TTS_LANG_BOOST_CUSTOM = '__custom__';

function isPresetLangBoost(s: string): boolean {
  return TTS_LANG_BOOST_PRESET_LIST.includes(s.trim());
}

type Props = {
  conversation: Conversation;
  allConversations: Conversation[];
  apiConfig: ApiConfig;
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void;
  onDeleteConversation?: (id: string) => void;
  onImportCharacter: (data: any) => void;
  onBack: () => void;
  /** 返回聊天页并打开「会话列表」侧栏（仅私聊有意义） */
  onOpenPrivateChatSessions?: () => void;
  /** 编辑学习 / 调试台（仅私聊） */
  onOpenEditCalibrationStudio?: () => void;
};

function clampHour(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(23, Math.round(n)));
}

function clampPrivateQuietSec(n: number) {
  if (!Number.isFinite(n)) return DEFAULT_PRIVATE_COMPOSER_QUIET_SECONDS;
  return Math.max(1, Math.min(120, Math.round(n)));
}

function clampContextMessageCount(n: number) {
  if (!Number.isFinite(n)) return 20;
  return Math.max(1, Math.min(100, Math.round(n)));
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
    onOpenPrivateChatSessions,
    onOpenEditCalibrationStudio,
  } = props;

  const mobileBottomDock = useMobileBottomDock();
  const [page, setPage] = useState<'summary' | 'edit'>('summary');
  const [editStep, setEditStep] = useState<'basic' | 'advanced' | 'tts'>('basic');

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
  const [chatBackground, setChatBackground] = useState(() =>
    conversation.type === 'group'
      ? (conversation.chatBackground || '').trim()
      : (cs.chatBackground || '').trim(),
  );
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

  const [ttsDisabled, setTtsDisabled] = useState(cs.tts?.disabled ?? false);
  const [ttsVoiceId, setTtsVoiceId] = useState(cs.tts?.voiceId ?? '');
  const [ttsSpeed, setTtsSpeed] = useState(
    cs.tts?.speed !== undefined && Number.isFinite(cs.tts.speed) ? cs.tts.speed : 1,
  );
  const [ttsVol, setTtsVol] = useState(
    cs.tts?.vol !== undefined && Number.isFinite(cs.tts.vol) ? cs.tts.vol : 1,
  );
  const [ttsPitch, setTtsPitch] = useState(
    cs.tts?.pitch !== undefined && Number.isFinite(cs.tts.pitch) ? cs.tts.pitch : 0,
  );
  const [ttsLanguageBoost, setTtsLanguageBoost] = useState(cs.tts?.languageBoost ?? 'auto');
  const [ttsVmPitch, setTtsVmPitch] = useState(
    cs.tts?.voiceModify?.pitch !== undefined && Number.isFinite(cs.tts.voiceModify.pitch)
      ? String(cs.tts.voiceModify.pitch)
      : '',
  );
  const [ttsVmIntensity, setTtsVmIntensity] = useState(
    cs.tts?.voiceModify?.intensity !== undefined && Number.isFinite(cs.tts.voiceModify.intensity)
      ? String(cs.tts.voiceModify.intensity)
      : '',
  );
  const [ttsVmTimbre, setTtsVmTimbre] = useState(
    cs.tts?.voiceModify?.timbre !== undefined && Number.isFinite(cs.tts.voiceModify.timbre)
      ? String(cs.tts.voiceModify.timbre)
      : '',
  );
  const [ttsVmSoundEffects, setTtsVmSoundEffects] = useState(cs.tts?.voiceModify?.soundEffects ?? '');
  const [ttsPreviewBusy, setTtsPreviewBusy] = useState(false);
  const [ttsPreviewSentence, setTtsPreviewSentence] = useState(DEFAULT_TTS_PREVIEW_SENTENCE);

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

  const [contextConfigEnabled, setContextConfigEnabled] = useState(cs.contextConfig?.enabled ?? false);
  const [contextMessageCount, setContextMessageCount] = useState(
    clampContextMessageCount(cs.contextConfig?.messageCount ?? 20),
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
    setChatBackground(
      conversation.type === 'group'
        ? (conversation.chatBackground || '').trim()
        : (cs.chatBackground || '').trim(),
    );
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
    setTtsDisabled(cs.tts?.disabled ?? false);
    setTtsVoiceId(cs.tts?.voiceId ?? '');
    setTtsSpeed(cs.tts?.speed !== undefined && Number.isFinite(cs.tts.speed) ? cs.tts.speed : 1);
    setTtsVol(cs.tts?.vol !== undefined && Number.isFinite(cs.tts.vol) ? cs.tts.vol : 1);
    setTtsPitch(cs.tts?.pitch !== undefined && Number.isFinite(cs.tts.pitch) ? cs.tts.pitch : 0);
    setTtsLanguageBoost(cs.tts?.languageBoost ?? 'auto');
    setTtsVmPitch(
      cs.tts?.voiceModify?.pitch !== undefined && Number.isFinite(cs.tts.voiceModify.pitch)
        ? String(cs.tts.voiceModify.pitch)
        : '',
    );
    setTtsVmIntensity(
      cs.tts?.voiceModify?.intensity !== undefined && Number.isFinite(cs.tts.voiceModify.intensity)
        ? String(cs.tts.voiceModify.intensity)
        : '',
    );
    setTtsVmTimbre(
      cs.tts?.voiceModify?.timbre !== undefined && Number.isFinite(cs.tts.voiceModify.timbre)
        ? String(cs.tts.voiceModify.timbre)
        : '',
    );
    setTtsVmSoundEffects(cs.tts?.voiceModify?.soundEffects ?? '');
    setTtsPreviewSentence(DEFAULT_TTS_PREVIEW_SENTENCE);
    setProactiveEnabled(cs.proactiveMessaging?.enabled ?? false);
    setActiveHourStart(clampHour(cs.proactiveMessaging?.activeHourStart ?? 8));
    setActiveHourEnd(clampHour(cs.proactiveMessaging?.activeHourEnd ?? 23));
    setWakeSensitivityMode(cs.proactiveMessaging?.wakeSensitivityMode || 'auto');
    setSleepSimulationEnabled(cs.proactiveMessaging?.sleepSimulationEnabled !== false);
    setPrivateComposerQuietSeconds(
      clampPrivateQuietSec(conversation.privateComposerQuietSeconds ?? DEFAULT_PRIVATE_COMPOSER_QUIET_SECONDS)
    );
    setContextConfigEnabled(cs.contextConfig?.enabled ?? false);
    setContextMessageCount(clampContextMessageCount(cs.contextConfig?.messageCount ?? 20));
    setKnowledgeBase(cs.knowledgeBase || []);
    setEditStep('basic');
  }, [cs, conversation.id, conversation.type, conversation.chatBackground]);

  const handleChatBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    try {
      const { compressChatBackground } = await import('../utils/imageCompression');
      const compressed = await compressChatBackground(file);
      setChatBackground(compressed.dataUrl);
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => setChatBackground(String(reader.result || ''));
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteFriend = () => {
    if (!onDeleteConversation) return;
    const ok = window.confirm('确定要删除该好友/角色吗？此操作不可撤销。');
    if (!ok) return;
    onDeleteConversation(conversation.id);
    onBack();
  };

  /** 当前表单对应的 TTS 参数（保存与试听共用，与请求体一致） */
  const buildPendingCharacterTts = (): CharacterTtsSettings => {
    const parseOptNum = (s: string): number | undefined => {
      const t = s.trim();
      if (!t) return undefined;
      const n = Number(t);
      return Number.isFinite(n) ? n : undefined;
    };
    const vmPitch = parseOptNum(ttsVmPitch);
    const vmIntensity = parseOptNum(ttsVmIntensity);
    const vmTimbre = parseOptNum(ttsVmTimbre);
    const vmFx = ttsVmSoundEffects.trim();
    const voiceModify =
      vmPitch !== undefined ||
      vmIntensity !== undefined ||
      vmTimbre !== undefined ||
      vmFx
        ? {
            ...(vmPitch !== undefined ? { pitch: vmPitch } : {}),
            ...(vmIntensity !== undefined ? { intensity: vmIntensity } : {}),
            ...(vmTimbre !== undefined ? { timbre: vmTimbre } : {}),
            ...(vmFx ? { soundEffects: vmFx } : {}),
          }
        : undefined;

    return {
      disabled: ttsDisabled,
      voiceId: ttsVoiceId.trim() || undefined,
      speed: clampTtsSpeed(ttsSpeed),
      vol: clampTtsVol(ttsVol),
      pitch: normalizeVoiceSettingPitch(ttsPitch),
      languageBoost: ttsLanguageBoost.trim() || undefined,
      ...(voiceModify ? { voiceModify } : {}),
    };
  };

  const handleTtsPreview = async () => {
    if (!isMinimaxTtsCredentialsReady(apiConfig)) {
      alert(
        '请先在「设置 → API 配置」→「语音合成 · MiniMax」中填写 API Key、Group ID，并点击页面上的「保存配置」。\n\n保存后，聊天里助手语音条的合成播放与试听使用同一套凭证。',
      );
      return;
    }
    const pending = buildPendingCharacterTts();
    if (!(pending.voiceId || '').trim()) {
      alert('请先填写「音色 voice_id」后再试听。');
      return;
    }
    const previewText = ttsPreviewSentence.trim();
    if (!previewText) {
      alert('请填写「试听例句」后再试听。');
      return;
    }
    const raw = apiConfig.minimaxTts;
    if (!raw) return;
    const apiForSynth = { ...raw, enabled: true };
    setTtsPreviewBusy(true);
    try {
      const blob = await synthesizeMinimaxTtsToBlob({
        api: apiForSynth,
        character: { ...pending, disabled: false },
        text: previewText,
      });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.onerror = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (e) {
      alert(e instanceof Error ? e.message : '试听失败');
    } finally {
      setTtsPreviewBusy(false);
    }
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

    const prevCharacter = { ...(conversation.characterSettings || ({} as any)) };
    if (conversation.type === 'group') {
      delete (prevCharacter as { chatBackground?: string }).chatBackground;
    }
    const nextBg = chatBackground.trim() || undefined;

    const nextCharacterSettings = {
      ...prevCharacter,
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
      contextConfig: {
        enabled: contextConfigEnabled,
        messageCount: clampContextMessageCount(contextMessageCount),
      },
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
      tts: buildPendingCharacterTts(),
      ...(conversation.type === 'private' ? { chatBackground: nextBg } : {}),
    };

    onUpdateConversation(conversation.id, {
      name: nextName,
      characterSettings: nextCharacterSettings,
      enabledFeatures: updatedFeatures,
      ...(conversation.type === 'private' ? { privateComposerQuietSeconds: nextPrivateQuiet } : {}),
      ...(conversation.type === 'group' ? { chatBackground: nextBg } : {}),
    });

    const mergedForApi: Conversation = {
      ...conversation,
      name: nextName,
      enabledFeatures: updatedFeatures,
      characterSettings: nextCharacterSettings,
      ...(conversation.type === 'private' ? { privateComposerQuietSeconds: nextPrivateQuiet } : {}),
      ...(conversation.type === 'group' ? { chatBackground: nextBg } : {}),
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

      let editCalibrationStudio:
        | {
            schemaVersion: 1;
            entries: EditCalibrationEntry[];
            languageStyleProfile: LanguageStyleProfileDoc | null;
          }
        | undefined;
      if (conversation.type === 'private') {
        const [calibEntries, styleDoc] = await Promise.all([
          loadEditCalibrationEntries(conversation.id),
          loadLanguageStyleProfileDoc(conversation.id),
        ]);
        if (calibEntries.length > 0 || (styleDoc?.text || '').trim()) {
          editCalibrationStudio = {
            schemaVersion: 1,
            entries: calibEntries,
            languageStyleProfile: styleDoc,
          };
        }
      }

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
        privateSessionsCount:
          includeMessages && conversation.type === 'private'
            ? conversation.privateSessions?.length ?? 0
            : 0,
        editCalibrationEntries: editCalibrationStudio?.entries.length ?? 0,
        hasLanguageStyleProfile: !!(editCalibrationStudio?.languageStyleProfile?.text || '').trim(),
      };

      const exportData = {
        version: '2.2',
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
        ...(includeMessages && conversation.type === 'private'
          ? {
              privateSessions: conversation.privateSessions || [],
              activePrivateSessionId: conversation.activePrivateSessionId,
            }
          : {}),
        /** 主聊天表情库 + EasyChat 角色表情（与全量备份侧车无关，仅角色包） */
        stickersMigration: stickerBundle,
        /** 私聊：编辑学习调试台条目 + 语言风格画像（IndexedDB 键的会话切片） */
        ...(editCalibrationStudio ? { editCalibrationStudio } : {}),
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
        `✅ 已导出（v2.2）\n\n` +
          `• 记忆库：${stats.memoriesCount} 条\n` +
          `• 资料/知识库：在角色设置内（characterSettings）\n` +
          `• 文档库：${stats.documentsCount} 份\n` +
          `• 表情包（主聊天库）：${stats.wechatStickerCount} 个\n` +
          `• 表情包（EasyChat 库）：${stats.easyChatStickerCount} 个\n` +
          `• 朋友圈：${stats.momentsCount} 条\n` +
          `• 关系：${stats.relationshipsCount} 个\n` +
          (conversation.type === 'private'
            ? `• 编辑学习 / 语言画像：${stats.editCalibrationEntries} 条记录${
                stats.hasLanguageStyleProfile ? '，含增长型语言画像' : ''
              }\n`
            : '') +
          `• 聊天记录：${includeMessages ? `${stats.messagesCount} 条` : '未包含'}\n` +
          `• 会话线程：${
            includeMessages && conversation.type === 'private'
              ? `${stats.privateSessionsCount} 个`
              : '未包含'
          }`
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

  const minimaxTtsEditorCard = (
    <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
      <div className="text-sm font-semibold text-gray-900 mb-1">朗读语音（MiniMax）</div>
      <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
        {isMinimaxTtsCredentialsReady(apiConfig)
          ? '音色仅在本角色配置：请填写克隆 voice_id，并与 MiniMax 调试台 JSON 对齐语速、音量、voice_setting.pitch、language_boost、voice_modify 等。应用请求体会附带与官方示例一致的 pronunciation_dict / subtitle_enable，便于与调试台对齐。打开「隐藏语音条播放」后，助手语音消息上不再出现合成播放入口。'
          : '请先在「设置 → API 配置」→「语音合成 · MiniMax」中填写 API Key、Group ID 并保存。'}
      </p>
      <div className="py-3 flex items-center justify-between gap-3 border-b border-gray-100">
        <div>
          <div className="text-sm text-gray-700">隐藏语音条播放</div>
          <div className="mt-0.5 text-[11px] text-gray-500">仅隐藏助手语音消息上的合成播放，不删除已保存参数</div>
        </div>
        <button
          type="button"
          onClick={() => setTtsDisabled(!ttsDisabled)}
          className={`shrink-0 w-11 h-6 rounded-full relative ${ttsDisabled ? 'bg-gray-900' : 'bg-gray-300'}`}
        >
          <div
            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
              ttsDisabled ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>
      <div className="mt-3 space-y-3">
        <div>
          <div className="text-xs text-gray-600 mb-1">音色 voice_id</div>
          <input
            value={ttsVoiceId}
            onChange={(e) => setTtsVoiceId(e.target.value)}
            placeholder="必填：MiniMax 克隆音色 clone_voice_…"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="text-[11px] text-gray-600 mb-1">语速</div>
            <input
              type="number"
              step={0.1}
              value={ttsSpeed}
              onChange={(e) => setTtsSpeed(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 px-2 py-2 text-sm text-center"
            />
          </div>
          <div>
            <div className="text-[11px] text-gray-600 mb-1">音量</div>
            <input
              type="number"
              step={0.1}
              value={ttsVol}
              onChange={(e) => setTtsVol(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 px-2 py-2 text-sm text-center"
            />
          </div>
          <div>
            <div className="text-[11px] text-gray-600 mb-1">音调</div>
            <input
              type="number"
              step={1}
              value={ttsPitch}
              onChange={(e) => setTtsPitch(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 px-2 py-2 text-sm text-center"
            />
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-600 mb-1">language_boost（语言增强）</div>
          <p className="text-[10px] text-gray-500 mb-2 leading-relaxed">
            这是 T2A 请求里的<strong>语言提示字段</strong>，不是聊天模型、也不是 speech 合成模型。合成模型在「设置 → API」里填写。请与调试台 JSON 中的取值保持一致。
          </p>
          <select
            value={isPresetLangBoost(ttsLanguageBoost || '') ? (ttsLanguageBoost || '').trim() : TTS_LANG_BOOST_CUSTOM}
            onChange={(e) => {
              const v = e.target.value;
              if (v === TTS_LANG_BOOST_CUSTOM) {
                if (isPresetLangBoost(ttsLanguageBoost || '')) {
                  setTtsLanguageBoost('');
                }
              } else {
                setTtsLanguageBoost(v);
              }
            }}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
          >
            <option value="auto">auto（默认）</option>
            <option value="Chinese">Chinese</option>
            <option value="English">English</option>
            <option value="Japanese">Japanese</option>
            <option value="Korean">Korean</option>
            <option value="none">none / 不启用（以官方文档为准）</option>
            <option value={TTS_LANG_BOOST_CUSTOM}>自定义（与调试台 JSON 完全一致）</option>
          </select>
          {!isPresetLangBoost(ttsLanguageBoost || '') ? (
            <input
              value={ttsLanguageBoost}
              onChange={(e) => setTtsLanguageBoost(e.target.value)}
              placeholder="例如调试台里的取值"
              className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono"
            />
          ) : null}
        </div>
        <div className="pt-2 border-t border-gray-100">
          <div className="text-xs font-medium text-gray-800 mb-1">声音效果器 voice_modify</div>
          <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">
            与调试台滑块一致；与上一行「音调」（voice_setting.pitch）是两套参数。可只填其中几项，留空则不发给接口。
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-[11px] text-gray-600 mb-1">modify.pitch</div>
              <input
                value={ttsVmPitch}
                onChange={(e) => setTtsVmPitch(e.target.value)}
                placeholder="如 -22"
                className="w-full rounded-xl border border-gray-200 px-2 py-2 text-sm text-center font-mono"
              />
            </div>
            <div>
              <div className="text-[11px] text-gray-600 mb-1">intensity</div>
              <input
                value={ttsVmIntensity}
                onChange={(e) => setTtsVmIntensity(e.target.value)}
                placeholder="如 -11"
                className="w-full rounded-xl border border-gray-200 px-2 py-2 text-sm text-center font-mono"
              />
            </div>
            <div>
              <div className="text-[11px] text-gray-600 mb-1">timbre</div>
              <input
                value={ttsVmTimbre}
                onChange={(e) => setTtsVmTimbre(e.target.value)}
                placeholder="如 -21"
                className="w-full rounded-xl border border-gray-200 px-2 py-2 text-sm text-center font-mono"
              />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-[11px] text-gray-600 mb-1">sound_effects（可选）</div>
            <input
              value={ttsVmSoundEffects}
              onChange={(e) => setTtsVmSoundEffects(e.target.value)}
              placeholder="留空；见 MiniMax 文档枚举"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="text-xs font-medium text-gray-800">试听例句（发给接口的 text）</div>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            停顿控制：在句子里插入 <span className="font-mono text-gray-800">{'<#x#>'}</span>，x
            为停顿时长（秒，约 0.01～99.99），例如
            <span className="font-mono text-gray-800"> 你好 {'<#0.5#>'} 世界</span>
            。与 MiniMax 调试台一致；助手语音条合成前会去掉 HTML 标签，但会保留此类标记。
          </p>
          <textarea
            value={ttsPreviewSentence}
            onChange={(e) => setTtsPreviewSentence(e.target.value)}
            rows={3}
            spellCheck={false}
            placeholder="粘贴调试台里同一句文案，便于对比听感"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm leading-relaxed resize-y min-h-[4.5rem] outline-none focus:ring-2 focus:ring-gray-900/10"
          />
        </div>
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-[11px] text-amber-950 leading-relaxed">
          每次试听都会<strong>真实调用</strong> MiniMax 语音合成接口，按平台规则<strong>计费并消耗额度/余额</strong>；请勿频繁连点。
        </div>
        {!isMinimaxTtsCredentialsReady(apiConfig) ? (
          <p className="mt-2 text-[11px] text-red-600 leading-relaxed">
            试听按钮灰色：请先到「设置 → API 配置」保存语音合成的 API Key 与 Group ID。仅填本页无效。
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void handleTtsPreview()}
          disabled={ttsPreviewBusy || !isMinimaxTtsCredentialsReady(apiConfig)}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-900 bg-gray-900 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {ttsPreviewBusy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
              合成中…
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 shrink-0" aria-hidden />
              试听当前配置
            </>
          )}
        </button>
        <p className="mt-2 text-[10px] text-gray-500 leading-relaxed">
          试听使用上方音色与参数表单（无需先点「完成」保存）。与调试台是否一致，还取决于设置里的合成模型、API 根域名是否与调试台相同，以及例句、language_boost 是否与调试台 JSON 一致。
        </p>
      </div>
    </div>
  );

  const minimaxTtsSummaryValue = !isMinimaxTtsCredentialsReady(apiConfig)
    ? '需先配 API'
    : ttsDisabled
      ? '已隐藏播放'
      : (() => {
          const v = ttsVoiceId.trim();
          if (!v) return '未填 voice_id';
          const short = v.length > 18 ? `${v.slice(0, 18)}…` : v;
          return short;
        })();

  return (
    <div className="h-[100dvh] md:h-full min-h-0 bg-[#F3F4F6] flex flex-col overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between shrink-0 ${page === 'summary' ? 'bg-transparent' : 'bg-white border-b border-gray-200'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => {
              if (page === 'edit') {
                if (editStep === 'tts') {
                  setEditStep('advanced');
                  return;
                }
                setPage('summary');
                return;
              }
              onBack();
            }}
            className="p-2 -ml-2 shrink-0"
          >
            <ChevronLeft className="w-6 h-6 text-gray-900" />
          </button>
          <div className="text-lg font-semibold text-gray-900 truncate">
            {page === 'summary' ? '角色' : editStep === 'tts' ? '朗读语音' : '编辑资料'}
          </div>
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
                  <ListRow
                    label={conversation.type === 'group' ? '聊天背景' : '聊天壁纸'}
                    value={chatBackground.trim() ? '已设置' : '默认'}
                    onClick={() => {
                      setPage('edit');
                      setEditStep('basic');
                    }}
                  />
                  {conversation.type === 'private' && onOpenEditCalibrationStudio ? (
                    <>
                      <div className="h-px bg-gray-200/70" />
                      <ListRow
                        label="编辑学习 · 调试台"
                        value="校对记录"
                        onClick={onOpenEditCalibrationStudio}
                      />
                    </>
                  ) : null}
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
            {editStep === 'tts' ? (
              <div className="space-y-4 pb-1">
                {minimaxTtsEditorCard}
                <div className="h-6" />
              </div>
            ) : (
            <>
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

          {/* 聊天背景 / 壁纸 */}
          <div className={`bg-white rounded-3xl p-4 shadow-sm border border-gray-100 ${editStep === 'basic' ? '' : 'hidden'}`}>
            <div className="flex items-center gap-2 mb-1">
              <ImageIcon className="w-4 h-4 text-gray-600 shrink-0" aria-hidden />
              <div className="text-sm font-semibold text-gray-900">
                {conversation.type === 'group' ? '聊天背景' : '聊天壁纸'}
              </div>
            </div>
            <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
              {conversation.type === 'group'
                ? '仅本群会话窗口使用；上传后会自动压缩以节省空间。'
                : '仅本私聊窗口使用，与首页主题壁纸无关；上传后会自动压缩。'}
            </p>
            <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 aspect-[16/9] relative">
              {chatBackground.trim() ? (
                <img src={chatBackground} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 px-4 text-center">
                  未设置时使用默认浅灰底
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="flex-1 min-w-[120px] py-2.5 rounded-2xl bg-gray-900 text-white text-sm font-medium text-center cursor-pointer active:opacity-90">
                上传图片
                <input type="file" accept="image/*" className="hidden" onChange={handleChatBackgroundUpload} />
              </label>
              {chatBackground.trim() ? (
                <button
                  type="button"
                  onClick={() => setChatBackground('')}
                  className="px-4 py-2.5 rounded-2xl border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  移除
                </button>
              ) : null}
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

          <div className={`bg-white rounded-3xl p-4 shadow-sm border border-gray-100 ${editStep === 'advanced' ? '' : 'hidden'}`}>
            <div className="text-sm font-semibold text-gray-900 mb-1">自定义上下文数量</div>
            <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
              控制「发给 AI 的历史气泡」范围（仅私聊主会话生效）。关闭时按时间顺序带上<strong>完整聊天记录</strong>；开启则只带最近 N 条。发送前仍会合并短时间内连续的多条用户消息以节省 token；极长会话可能接近网关上限。
            </p>
            <div className="py-3 flex items-center justify-between gap-3 border-b border-gray-100">
              <div>
                <div className="text-sm text-gray-700">启用自定义条数</div>
                <div className="mt-0.5 text-[11px] text-gray-500">1～100 条；越多越耗 token</div>
              </div>
              <button
                type="button"
                onClick={() => setContextConfigEnabled(!contextConfigEnabled)}
                className={`shrink-0 w-11 h-6 rounded-full relative ${contextConfigEnabled ? 'bg-gray-900' : 'bg-gray-300'}`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    contextConfigEnabled ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>
            {contextConfigEnabled ? (
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={contextMessageCount}
                    onChange={(e) => setContextMessageCount(clampContextMessageCount(parseInt(e.target.value, 10)))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
                  />
                  <input
                    type="number"
                    min={1}
                    max={100}
                    inputMode="numeric"
                    value={contextMessageCount}
                    onChange={(e) =>
                      setContextMessageCount(clampContextMessageCount(parseInt(e.target.value, 10) || 1))
                    }
                    className="w-16 shrink-0 rounded-xl border border-gray-200 px-2 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                  当前：最多取最近 <span className="font-semibold text-gray-900">{contextMessageCount}</span>{' '}
                  条消息作为上下文（与旧版「角色设置」一致）。
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-gray-600 leading-relaxed bg-gray-50 rounded-xl px-3 py-2 border border-gray-100 mt-2">
                当前：<strong className="text-gray-900">完整上下文</strong>（不限条数）。
              </p>
            )}
          </div>

          <div className={`bg-white rounded-3xl p-4 shadow-sm border border-gray-100 ${editStep === 'advanced' ? '' : 'hidden'}`}>
            <div className="text-sm font-semibold text-gray-900 mb-1">朗读语音（MiniMax）</div>
            <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">
              音色与试听在单独页面配置，避免高级页过长。
            </p>
            <div className="divide-y divide-gray-100">
              <ListRow label="音色、参数与试听" value={minimaxTtsSummaryValue} onClick={() => setEditStep('tts')} />
            </div>
          </div>

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
              留空则使用设置里的全局对话模型。覆盖后带图与文字均走该模型。点开模型下拉会自动拉取列表（约 25 秒内不重复请求）；也可点「拉取」。
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
              {conversation.type === 'private' && onOpenEditCalibrationStudio ? (
                <ListRow label="编辑学习 · 调试台" value="校对记录" onClick={onOpenEditCalibrationStudio} />
              ) : null}
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
            {conversation.type === 'private' && onOpenPrivateChatSessions ? (
              <div className="mb-3 rounded-2xl border border-gray-100 divide-y divide-gray-100">
                <ListRow
                  label="会话列表"
                  value="新建 / 切换话题"
                  onClick={onOpenPrivateChatSessions}
                />
              </div>
            ) : null}
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
            </>
            )}
          </div>

          {/* 底部操作区：不跟随滚动，保证可点击 */}
          <div
            className="shrink-0 px-4 pt-3 bg-[#F3F4F6]"
            style={{ paddingBottom: `calc(${12 + mobileBottomDock}px + env(safe-area-inset-bottom))` }}
          >
            {editStep === 'tts' ? (
              <button
                type="button"
                onClick={() => setEditStep('advanced')}
                className="w-full py-3 rounded-2xl bg-gray-900 text-white text-sm font-medium"
              >
                返回高级设置
              </button>
            ) : editStep === 'basic' ? (
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
              导入后会在应用内创建/恢复该角色数据。勾选包含聊天记录时，会一并导出私聊「会话线程」列表与各桶消息。
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

