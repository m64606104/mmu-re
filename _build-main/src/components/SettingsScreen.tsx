import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Check, Loader2, Download, Upload, Database, User, Palette, Cloud, HardDrive, Shield, X } from 'lucide-react';
import { ApiConfig } from '../types';
import {
  smartLoad,
  smartSave,
  checkStorageQuota,
  saveBatch,
  getStorageStatus,
  migrateData,
  clearAllData,
  resolveStorageLayer,
  setBulkStorageRestoreInProgress,
} from '../utils/storage';
import { restoreSidecarIndexedDatabases, SIDECAR_INDEXED_FIELD } from '../utils/fullBackupSidecars';
import { apiPresetsManager, APIPreset } from '../utils/apiPresetsManager';
import {
  listApiEndpointPairHistory,
  addApiEndpointPairSnapshot,
  removeApiEndpointPair,
  formatApiEndpointPairLabel,
  type ApiEndpointPairEntry,
} from '../utils/apiEndpointHistory';
import APIPresetsModal from './APIPresetsModal';
import {
  getCloudSyncRuntimeState,
  getCloudSyncSettings,
  markCloudSyncSuccess,
  saveCloudSyncSettings,
} from '../services/supabaseClient';
import {
  ensureSupabaseAnonSession,
  getSupabaseUserId,
  onSupabaseAuthStateChange,
  resetSupabaseAnonSession,
  supabaseSendMagicLink,
  supabaseSignOut,
} from '../services/supabaseAuth';
import {
  supabaseAppendMessages,
  supabaseLoadConversations,
  supabaseSyncDerivedMemory,
  supabaseUpsertConversation,
} from '../services/supabaseData';
import { fetchOpenAiCompatibleModelIds } from '../utils/openaiCompatibleModels';
import { buildApiUrl } from '../utils/apiHelper';
import { filterLikelyChatModels } from '../utils/modelVisionClassifier';
import { consumeSettingsOpenIntent } from '../utils/settingsNavigationIntent';
import { exportFullMomoyuBackup, formatFullExportSuccessAlert } from '../utils/fullMomoyuExport';
import {
  readQuickBackupFabVisible,
  writeQuickBackupFabVisible,
  QUICK_BACKUP_FAB_VISIBILITY_EVENT,
} from '../utils/quickBackupFabVisibility';

interface SettingsScreenProps {
  apiConfig: ApiConfig;
  onUpdateConfig: (config: ApiConfig) => void;
  onBack: () => void;
  fullscreenMode: boolean;
  onToggleFullscreen: (enabled: boolean) => void;
  /** 进入「我的资料」编辑（与资料页「编辑资料」入口一致） */
  onOpenEditProfile?: () => void;
}

const AVATAR_BADGES = ['🎵', '🎮', '🎧', '🎨', '🎬', '📷', '⚡', '🔥', '💫', '✨', '🌟', '💎'];
const CLOUD_SYNC_BINDING_PREFIX = 'cloudSyncBindingState:';
const SETTINGS_SECTIONS = [
  { id: 'api-config', label: 'API 配置', description: '模型、密钥与接口' },
  { id: 'appearance', label: '外观设置', description: '显示与头像装饰' },
  { id: 'cloud-sync', label: '云同步', description: 'Supabase 与邮箱登录' },
  { id: 'storage', label: '本地存储', description: '空间占用与清理' },
  { id: 'backup', label: '数据备份', description: '导入、导出与迁移' },
] as const;
type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]['id'];

function getCloudBindingKey(url: string, uid: string): string {
  return `${CLOUD_SYNC_BINDING_PREFIX}${encodeURIComponent(url)}:${uid}`;
}

export default function SettingsScreen({
  apiConfig,
  onUpdateConfig,
  onBack,
  fullscreenMode,
  onToggleFullscreen,
  onOpenEditProfile,
}: SettingsScreenProps) {
  const [baseUrl, setBaseUrl] = useState(apiConfig.baseUrl);
  const [apiKey, setApiKey] = useState(apiConfig.apiKey);
  const [modelName, setModelName] = useState(apiConfig.modelName);
  const [visionModelName, setVisionModelName] = useState(apiConfig.visionModelName || '');
  const [visionBaseUrl, setVisionBaseUrl] = useState(apiConfig.visionBaseUrl || '');
  const [visionApiKey, setVisionApiKey] = useState(apiConfig.visionApiKey || '');
  const [useSeparateVisionApi, setUseSeparateVisionApi] = useState(
    Boolean((apiConfig.visionBaseUrl || '').trim() || (apiConfig.visionApiKey || '').trim())
  );
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableVisionModels, setAvailableVisionModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [visionTesting, setVisionTesting] = useState(false);
  const [visionTestResult, setVisionTestResult] = useState<'success' | 'error' | null>(null);
  const [textTestMessage, setTextTestMessage] = useState('');
  const [visionTestMessage, setVisionTestMessage] = useState('');
  const [apiPresets, setApiPresets] = useState<APIPreset[]>([]);
  const [showApiPresetsModal, setShowApiPresetsModal] = useState(false);
  const [apiPairHistory, setApiPairHistory] = useState<ApiEndpointPairEntry[]>([]);
  const [selectedBadge, setSelectedBadge] = useState('🎵');
  const importInputRef = useRef<HTMLInputElement>(null);
  /** 点开模型下拉自动拉取时的节流，避免连续打开菜单刷接口 */
  const lastDropdownPullAtRef = useRef(0);
  const DROPDOWN_PULL_MIN_INTERVAL_MS = 25000;
  const pullModelsForTextAndVisionRef = useRef<
    ((opts?: { silent?: boolean }) => Promise<void>) | null
  >(null);
  
  // 存储状态
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState(false);

  // Supabase 云同步状态（只做显示/检测，不在此处配置密钥）
  const [supabaseStatus, setSupabaseStatus] = useState<'not_configured' | 'checking' | 'connected' | 'auth_required' | 'error'>('checking');
  const [supabaseError, setSupabaseError] = useState<string>('');
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [cloudSupabaseUrl, setCloudSupabaseUrl] = useState('');
  const [cloudSupabaseAnonKey, setCloudSupabaseAnonKey] = useState('');
  const [cloudAuthUserId, setCloudAuthUserId] = useState<string | null>(null);
  const [cloudAuthEmail, setCloudAuthEmail] = useState('');
  const [cloudAuthSending, setCloudAuthSending] = useState(false);
  const [cloudAuthHint, setCloudAuthHint] = useState('');
  const [cloudBindingCheckRunning, setCloudBindingCheckRunning] = useState(false);
  const [cloudManualSyncRunning, setCloudManualSyncRunning] = useState(false);
  const [localConversationCount, setLocalConversationCount] = useState(0);
  const [cloudConversationCount, setCloudConversationCount] = useState<number | null>(null);
  const [cloudBindingState, setCloudBindingState] = useState<string | null>(null);
  const [cloudLastSyncAt, setCloudLastSyncAt] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('api-config');
  const [mobileProfileName, setMobileProfileName] = useState('moyu.on');
  const [mobileProfileAvatar, setMobileProfileAvatar] = useState('');
  const [isMobileSectionOpen, setIsMobileSectionOpen] = useState(false);
  /** 从聊天入口因未配置 API 跳转而来时展示 */
  const [entryIntentBanner, setEntryIntentBanner] = useState<string | null>(null);

  const [quickBackupFabOn, setQuickBackupFabOn] = useState(readQuickBackupFabVisible);
  useEffect(() => {
    const onVis = () => setQuickBackupFabOn(readQuickBackupFabVisible());
    window.addEventListener(QUICK_BACKUP_FAB_VISIBILITY_EVENT, onVis);
    return () => window.removeEventListener(QUICK_BACKUP_FAB_VISIBILITY_EVENT, onVis);
  }, []);

  // 语音转文字配置
  const [sttEnabled] = useState(apiConfig.speechToText?.enabled || false);
  const [sttApiUrl] = useState(apiConfig.speechToText?.apiUrl || '');
  const [sttApiKey] = useState(apiConfig.speechToText?.apiKey || '');
  const [sttModel] = useState(apiConfig.speechToText?.model || 'glm-4-flash');

  const [pigEnabled, setPigEnabled] = useState(apiConfig.privateAiImageGeneration?.enabled ?? false);
  const [pigBaseUrl, setPigBaseUrl] = useState(apiConfig.privateAiImageGeneration?.baseUrl || '');
  const [pigApiKey, setPigApiKey] = useState(apiConfig.privateAiImageGeneration?.apiKey || '');
  const [pigModel, setPigModel] = useState(apiConfig.privateAiImageGeneration?.model || '');
  const [pigDailyMax, setPigDailyMax] = useState(
    apiConfig.privateAiImageGeneration?.dailyMaxPerConversation ?? 8,
  );
  const [pigSize, setPigSize] = useState(apiConfig.privateAiImageGeneration?.size || '1024x1024');
  const [pigAvailableModels, setPigAvailableModels] = useState<string[]>([]);
  const [pigModelsLoading, setPigModelsLoading] = useState(false);
  const [pigModelsHint, setPigModelsHint] = useState('');

  // 预载 API 预设（IndexedDB）与成套最近接口（localStorage）
  useEffect(() => {
    void (async () => {
      await apiPresetsManager.hydrateFromDisk();
      setApiPresets(apiPresetsManager.getPresets());
      setApiPairHistory(listApiEndpointPairHistory());
    })();
  }, []);

  useEffect(() => {
    const p = apiConfig.privateAiImageGeneration;
    setPigEnabled(p?.enabled ?? false);
    setPigBaseUrl(p?.baseUrl || '');
    setPigApiKey(p?.apiKey || '');
    setPigModel(p?.model || '');
    setPigDailyMax(p?.dailyMaxPerConversation ?? 8);
    setPigSize(p?.size || '1024x1024');
  }, [apiConfig]);

  // 从「未配置 API 却进入聊天」跳转来时：定位到对应分区并展示说明
  useEffect(() => {
    const intent = consumeSettingsOpenIntent();
    if (!intent) return;
    if (SETTINGS_SECTIONS.some((s) => s.id === intent.section)) {
      setActiveSection(intent.section as SettingsSectionId);
    }
    setEntryIntentBanner(intent.message);
    setIsMobileSectionOpen(true);
  }, []);

  useEffect(() => {
    // 加载用户头像装饰配置
    try {
      const profile = localStorage.getItem('userProfile');
      if (profile) {
        const parsed = JSON.parse(profile);
        setSelectedBadge(parsed.avatarBadge || '🎵');
        const displayName =
          parsed.nickname ||
          parsed.name ||
          parsed.username ||
          parsed.displayName ||
          '';
        if (typeof displayName === 'string' && displayName.trim()) {
          setMobileProfileName(displayName.trim());
        }
        const avatar =
          parsed.avatar ||
          parsed.avatarUrl ||
          parsed.profileAvatar ||
          '';
        if (typeof avatar === 'string' && avatar.trim()) {
          setMobileProfileAvatar(avatar.trim());
        }
      }
    } catch (e) {
      console.error('Failed to load user profile:', e);
    }
    
    // 加载存储状态信息
    loadStorageInfo();

    const cloudSettings = getCloudSyncSettings();
    setCloudSyncEnabled(cloudSettings.enabled);
    setCloudSupabaseUrl(cloudSettings.url);
    setCloudSupabaseAnonKey(cloudSettings.anonKey);
    setCloudLastSyncAt(getCloudSyncRuntimeState().lastSuccessfulSyncAt);

  }, []);

  const checkSupabaseStatus = async () => {
    const settings = getCloudSyncSettings();
    if (!settings.enabled) {
      setSupabaseStatus('not_configured');
      setSupabaseError('');
      setCloudAuthUserId(null);
      setCloudConversationCount(null);
      setCloudBindingState(null);
      return;
    }
    if (!settings.url || !settings.anonKey) {
      setSupabaseStatus('error');
      setSupabaseError('请先填写 Supabase URL 和 Anon Key');
      return;
    }

    setSupabaseStatus('checking');
    setSupabaseError('');
    try {
      await ensureSupabaseAnonSession();
      const uid = await getSupabaseUserId();
      setCloudAuthUserId(uid);
      setSupabaseStatus('connected');
      await refreshCloudSyncSummary(uid);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as any).message)
          : '连接失败（未知错误）';
      setCloudAuthUserId(null);
      if (msg === 'Cloud sync requires email sign-in.') {
        setSupabaseStatus('auth_required');
        setSupabaseError('已配置云端，但尚未完成邮箱登录。');
        setCloudConversationCount(null);
        setCloudBindingState(null);
      } else {
      setSupabaseStatus('error');
      setSupabaseError(msg);
        setCloudConversationCount(null);
        setCloudBindingState(null);
      }
    }
  };

  const handleSaveCloudSyncSettings = async () => {
    const previousSettings = getCloudSyncSettings();
    const nextSettings = {
      enabled: cloudSyncEnabled,
      url: cloudSupabaseUrl.trim(),
      anonKey: cloudSupabaseAnonKey.trim(),
    };
    if (nextSettings.enabled && (!nextSettings.url || !nextSettings.anonKey)) {
      alert('开启云同步前，请填写 Supabase URL 和 Anon Key');
      return;
    }
    if (previousSettings.enabled && !nextSettings.enabled) {
      const choice = window.prompt(
        '你正在关闭云同步，请选择操作：\n' +
          '1 = 仅关闭同步（保留邮箱登录和云配置）\n' +
          '2 = 关闭同步并解绑邮箱（保留本地IndexedDB数据）\n' +
          '3 = 关闭同步并清空云配置（URL/Key，同时解绑邮箱）\n\n' +
          '请输入 1 / 2 / 3',
        '1'
      );
      if (!choice) return;
      if (!['1', '2', '3'].includes(choice)) {
        alert('请输入 1 / 2 / 3');
        return;
      }
      if (choice === '2' || choice === '3') {
        await supabaseSignOut();
      }
      if (choice === '3') {
        nextSettings.url = '';
        nextSettings.anonKey = '';
        setCloudSupabaseUrl('');
        setCloudSupabaseAnonKey('');
      }
    }

    saveCloudSyncSettings(nextSettings);
    resetSupabaseAnonSession();
    setCloudAuthHint('');
    await checkSupabaseStatus();
    alert(nextSettings.enabled
      ? '云同步配置已保存。接下来请用邮箱登录，登录成功后再开始云端同步。'
      : '云同步已关闭。当前设备会继续使用本地 IndexedDB，数据不会丢失。');
  };

  const handleSendCloudMagicLink = async () => {
    setCloudAuthHint('');
    setCloudAuthSending(true);
    try {
      await supabaseSendMagicLink(cloudAuthEmail);
      setCloudAuthHint('已发送登录链接到邮箱。点击邮件里的链接完成验证后，当前页面会在回到前台时自动重新检测登录状态。');
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as any).message)
          : '发送失败（未知错误）';
      setCloudAuthHint(msg);
    } finally {
      setCloudAuthSending(false);
      await checkSupabaseStatus();
    }
  };

  const handleCloudSignOut = async () => {
    setCloudAuthHint('');
    try {
      await supabaseSignOut();
      await checkSupabaseStatus();
      alert('已退出云端账号。');
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as any).message)
          : '退出失败（未知错误）';
      alert(msg);
    }
  };

  const handleUnbindCloudAccount = async () => {
    const confirmed = window.confirm(
      '确认解绑当前邮箱吗？\n\n解绑后：\n' +
        '• 不会删除本地 IndexedDB 数据\n' +
        '• 不会删除云端账号历史\n' +
        '• 当前设备仅会退出该邮箱登录状态'
    );
    if (!confirmed) return;
    try {
      await supabaseSignOut();
      setCloudAuthHint('已解绑当前邮箱。本地数据保持不变，可继续离线使用。');
      await checkSupabaseStatus();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as any).message)
          : '解绑失败（未知错误）';
      setCloudAuthHint(msg);
    }
  };

  const uploadLocalHistoryToCloud = async (): Promise<number> => {
    const localConversations = await smartLoad('conversations');
    const localList = Array.isArray(localConversations) ? localConversations : [];
    for (const conv of localList) {
      await supabaseUpsertConversation(conv);
      await supabaseAppendMessages(conv.id, conv.messages || []);
      await supabaseSyncDerivedMemory(
        conv.id,
        conv.name,
        conv.characterSettings,
        conv.messages || [],
        conv.messages || [],
        apiConfig
      );
    }
    markCloudSyncSuccess();
    return localList.length;
  };

  const maybeOfferInitialCloudSync = async (uid: string) => {
    const settings = getCloudSyncSettings();
    const bindingKey = getCloudBindingKey(settings.url, uid);
    if (!settings.enabled || !settings.url) return;
    if (cloudBindingCheckRunning) return;
    if (localStorage.getItem(bindingKey)) return;

    setCloudBindingCheckRunning(true);
    try {
      const cloudConversations = await supabaseLoadConversations();
      if (cloudConversations.length > 0) {
        localStorage.setItem(bindingKey, 'cloud-existing');
        setCloudBindingState('cloud-existing');
        setCloudAuthHint('检测到云端已有历史数据，后续会以云端数据为准继续同步。');
        await refreshCloudSyncSummary(uid);
        return;
      }

      const localConversations = await smartLoad('conversations');
      const localList = Array.isArray(localConversations) ? localConversations : [];
      if (localList.length === 0) {
        localStorage.setItem(bindingKey, 'local-empty');
        setCloudBindingState('local-empty');
        setCloudAuthHint('云端已绑定成功；当前设备没有本地历史需要上传。');
        await refreshCloudSyncSummary(uid);
        return;
      }

      const shouldUpload = window.confirm(
        '检测到当前设备有本地聊天记录，而云端还是空的。\n\n要把当前设备的本地历史上传到云端，作为这个邮箱账号的初始云端数据吗？'
      );

      if (!shouldUpload) {
        localStorage.setItem(bindingKey, 'skipped');
        setCloudBindingState('skipped');
        setCloudAuthHint('已跳过首次历史上传。当前仍可继续使用本地，后续只会同步新的云端数据。');
        await refreshCloudSyncSummary(uid);
        return;
      }

      await uploadLocalHistoryToCloud();

      localStorage.setItem(bindingKey, 'uploaded');
      setCloudBindingState('uploaded');
      setCloudAuthHint('已把当前设备的本地历史上传到云端。之后同邮箱在其他设备登录即可同步。');
      await refreshCloudSyncSummary(uid);
    } catch (error) {
      console.error('首次云端历史迁移失败:', error);
      setCloudAuthHint('首次历史上传失败，请稍后重试。');
    } finally {
      setCloudBindingCheckRunning(false);
    }
  };

  const handleManualCloudUpload = async () => {
    if (!cloudAuthUserId) {
      alert('请先完成邮箱登录，再上传本地历史。');
      return;
    }
    const settings = getCloudSyncSettings();
    if (!settings.enabled || !settings.url) {
      alert('请先启用并保存云同步配置。');
      return;
    }
    const shouldUpload = window.confirm('要把当前设备的本地聊天记录上传到云端吗？这不会清空本地数据。');
    if (!shouldUpload) return;

    setCloudManualSyncRunning(true);
    setCloudAuthHint('');
    try {
      const uploadedCount = await uploadLocalHistoryToCloud();
      localStorage.setItem(getCloudBindingKey(settings.url, cloudAuthUserId), 'uploaded');
      setCloudBindingState('uploaded');
      setCloudAuthHint(
        uploadedCount > 0
          ? `已手动上传 ${uploadedCount} 个本地会话到云端。`
          : '当前设备没有可上传的本地会话。'
      );
      await refreshCloudSyncSummary(cloudAuthUserId);
    } catch (error) {
      console.error('手动上传本地历史失败:', error);
      setCloudAuthHint('手动上传失败，请稍后重试。');
    } finally {
      setCloudManualSyncRunning(false);
    }
  };

  useEffect(() => {
    checkSupabaseStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unsubscribe = onSupabaseAuthStateChange(() => {
      void checkSupabaseStatus();
    });

    const handleWindowFocus = () => {
      if (document.visibilityState === 'hidden') return;
      void checkSupabaseStatus();
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleWindowFocus);

    return () => {
      unsubscribe?.();
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleWindowFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (supabaseStatus === 'connected' && cloudAuthUserId) {
      void maybeOfferInitialCloudSync(cloudAuthUserId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseStatus, cloudAuthUserId]);

  const requestPullModelsFromDropdown = () => {
    if (testing || visionTesting) return;
    if (!baseUrl.trim() || !apiKey.trim()) return;
    if (useSeparateVisionApi && (!visionBaseUrl.trim() || !visionApiKey.trim())) return;
    const t = Date.now();
    if (t - lastDropdownPullAtRef.current < DROPDOWN_PULL_MIN_INTERVAL_MS) return;
    lastDropdownPullAtRef.current = t;
    void pullModelsForTextAndVisionRef.current?.({ silent: true });
  };

  const renderDesktopSection = () => {
    switch (activeSection) {
      case 'api-config':
        return (
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">接口配置</h3>
              <p className="mt-1 text-sm text-slate-500">配置聊天接口地址、密钥和模型名称。</p>
              <p className="mt-2 text-[11px] text-slate-600 leading-relaxed bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2">
                <span className="font-medium text-slate-700">浏览器里打开的站点（如 GitHub Pages）：</span>
                聊天会跨域请求你填的域名（<span className="font-mono">POST …/chat/completions</span>）。若网关未对<strong>当前页面的来源（Origin）</strong>返回允许的 CORS 响应，Safari/WebKit 控制台会报 “Fetch … due to access control checks”。拉取{' '}
                <span className="font-mono">GET /v1/models</span> 与发消息的 POST 在网关上策略可能不同，因此会出现「模型列表能拉、正式聊天全失败」。这与视觉是否独立、模型 ID 是否正确<strong>无直接关系</strong>，需在 api520、土豆等侧为站点来源配置 CORS，或使用同源反向代理、桌面封装、本机{' '}
                <span className="font-mono">npm run dev</span> 等不受该限制的环境。
              </p>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Base URL</label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api520.pro"
                    autoComplete="off"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    autoComplete="new-password"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">模型名称</label>
                  <div className="flex gap-2">
                    {availableModels.length > 0 ? (
                      <select
                        value={modelName}
                        onMouseDown={requestPullModelsFromDropdown}
                        onChange={(e) => setModelName(e.target.value)}
                        autoComplete="off"
                        className="flex-1 min-w-0 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white font-mono text-sm"
                      >
                        {availableModels.map(model => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={modelName}
                        onFocus={requestPullModelsFromDropdown}
                        onChange={(e) => setModelName(e.target.value)}
                        placeholder="gpt-3.5-turbo"
                        autoComplete="off"
                        className="flex-1 min-w-0 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => void pullModelsForTextAndVision()}
                      disabled={testing || visionTesting}
                      className="shrink-0 px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                      {testing || visionTesting ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          拉取中
                        </span>
                      ) : modelName.trim() || availableModels.length > 0 ? (
                        '更换模型'
                      ) : (
                        '拉取模型列表'
                      )}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    从接口刷新：下列表均为网关返回的对话模型（已过滤 embedding 等）。下方「专属视觉模型」与角色设置里单独指定对话模型的用意类似——可选，用来降本或换模型；不填也会正常识图（带图请求用当前对话模型）。点开下拉会自动拉取一次（约 {Math.round(DROPDOWN_PULL_MIN_INTERVAL_MS / 1000)} 秒内不重复）。
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3">
                  <div className="text-xs font-medium text-slate-800 mb-1">最近一套接口（URL + Key + 模型）</div>
                  <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
                    每次在本页点「保存配置」会记入此处；点标签整包填入三项（与浏览器分列自动填充不同）。多套命名方案请用下方「管理预设」添加并保存。
                  </p>
                  {apiPairHistory.length === 0 ? (
                    <p className="text-xs text-slate-400">暂无记录，保存成功后会出现在这里。</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {apiPairHistory.map((entry) => (
                        <div
                          key={entry.id}
                          className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white shadow-sm"
                        >
                          <button
                            type="button"
                            onClick={() => applyApiPairFromHistory(entry)}
                            className="max-w-[min(100%,240px)] truncate px-2 py-1.5 text-left text-[11px] font-mono text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-l-lg"
                            title={`${entry.baseUrl}\n模型：${entry.modelName}`}
                          >
                            {formatApiEndpointPairLabel(entry)}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveApiPairEntry(entry.id)}
                            className="shrink-0 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-r-lg"
                            title="从最近列表移除"
                            aria-label="移除"
                          >
                            <X className="w-3.5 h-3.5" aria-hidden />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      专属视觉模型（可选）
                    </label>
                    <button
                      type="button"
                      onClick={testVisionSupport}
                      disabled={visionTesting}
                      title="用极小图片测 multimodal / image_url"
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {visionTesting ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden /> : null}
                      测试视觉
                    </button>
                  </div>
                  {availableVisionModels.length > 0 ? (
                    <select
                      value={visionModelName}
                      onMouseDown={requestPullModelsFromDropdown}
                      onChange={(e) => setVisionModelName(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                    >
                      <option value="">默认：与对话模型相同（可识图）</option>
                      {availableVisionModels.map((model) => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={visionModelName}
                      onFocus={requestPullModelsFromDropdown}
                      onChange={(e) => setVisionModelName(e.target.value)}
                      placeholder="可选：如更便宜的 VL；留空则用对话模型识图"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  )}
                  <div className="mt-2 text-xs text-slate-500 leading-relaxed">
                    与角色里「单独指定模型」同理：可选，用来降本或换模型。留空时带图仍用当前对话模型识图，照样发图。若填写此处，默认仍走主接口同一 URL/Key，仅请求体里的 <span className="font-mono">model</span> 换成你填的 ID（例如更便宜的 VL）。勾选「识图走独立接口」并填写 Base URL / Key 后，识图才改走别家或另一条线路。「测试视觉」用于验证你填的模型是否接收附图。
                  </div>
                  <p className="mt-2 text-[11px] text-amber-800/90 leading-relaxed rounded-lg border border-amber-200 bg-amber-50/90 px-2.5 py-2">
                    <span className="font-medium text-amber-900">带图变慢说明：</span>
                    本仓库私聊会把<strong>真实图片</strong>放进模型请求（多模态），数据量比旧版 momoyu-demo（只发一句「用户发了一张图」占位）大很多；填了专属视觉模型时整条请求还会走 VL。相机大图、长边截图会更慢，属正常现象。
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                  <label className="flex items-center justify-between text-sm font-medium text-slate-700">
                    <span>识图走独立接口（别家 URL / Key）</span>
                    <input
                      type="checkbox"
                      checked={useSeparateVisionApi}
                      onChange={(e) => setUseSeparateVisionApi(e.target.checked)}
                    />
                  </label>
                  {useSeparateVisionApi ? (
                    <div className="mt-3 space-y-2">
                      <input
                        type="text"
                        value={visionBaseUrl}
                        onChange={(e) => setVisionBaseUrl(e.target.value)}
                        placeholder="视觉 Base URL"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      />
                      <input
                        type="password"
                        value={visionApiKey}
                        onChange={(e) => setVisionApiKey(e.target.value)}
                        placeholder="视觉 API Key"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      />
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        独立视觉 Base 与主接口一样走浏览器跨域规则；若聊天被 CORS 拦截，见本卡上方「浏览器里打开的站点」说明。
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm font-medium text-slate-800">私聊 AI 真实配图（文生图）</label>
                    <input
                      type="checkbox"
                      checked={pigEnabled}
                      onChange={(e) => setPigEnabled(e.target.checked)}
                    />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    开启后，陪伴型私聊里模型可用 <span className="font-mono">[生图:描述]</span> 请求发真实生成图；会先弹出「隔空投送」式确认，拒绝则不调用生图接口。生图 Base / Key 留空时与主接口相同，拉取模型列表也会走主 URL。
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">生图 Base URL（可选）</label>
                    <input
                      type="text"
                      value={pigBaseUrl}
                      onChange={(e) => setPigBaseUrl(e.target.value)}
                      placeholder="留空则与主接口相同"
                      className="w-full px-3 py-2 border border-violet-200 rounded-lg bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">生图 API Key（可选）</label>
                    <input
                      type="password"
                      value={pigApiKey}
                      onChange={(e) => setPigApiKey(e.target.value)}
                      placeholder="留空则与主 Key 相同"
                      autoComplete="new-password"
                      className="w-full px-3 py-2 border border-violet-200 rounded-lg bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">生图模型 ID</label>
                    {pigAvailableModels.length > 0 ? (
                      <select
                        value={
                          pigModel.trim()
                            ? pigModel
                            : pigAvailableModels[0] || ''
                        }
                        onChange={(e) => setPigModel(e.target.value)}
                        className="w-full px-3 py-2 border border-violet-200 rounded-lg bg-white text-sm font-mono"
                      >
                        {pigModel.trim() && !pigAvailableModels.includes(pigModel) ? (
                          <option value={pigModel}>{pigModel}（手填）</option>
                        ) : null}
                        {pigAvailableModels.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={pigModel}
                        onChange={(e) => setPigModel(e.target.value)}
                        placeholder="可手填，或点下面按钮从接口拉列表"
                        className="w-full px-3 py-2 border border-violet-200 rounded-lg bg-white text-sm font-mono"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => void pullPigModels()}
                      disabled={pigModelsLoading}
                      className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-violet-400 bg-violet-100/80 py-2.5 text-sm font-medium text-violet-900 hover:bg-violet-200/80 disabled:opacity-50"
                    >
                      {pigModelsLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                          正在拉取生图模型…
                        </>
                      ) : (
                        '拉取生图模型列表（生图 URL/Key 留空则用主接口）'
                      )}
                    </button>
                    {pigModelsHint ? (
                      <p className="mt-1.5 text-[11px] text-slate-600 leading-snug">{pigModelsHint}</p>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">每会话每日上限（张）</label>
                      <input
                        type="number"
                        min={0}
                        value={pigDailyMax}
                        onChange={(e) => setPigDailyMax(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-violet-200 rounded-lg bg-white text-sm"
                      />
                      <p className="mt-0.5 text-[10px] text-slate-500">0 表示不限制</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">尺寸</label>
                      <input
                        type="text"
                        value={pigSize}
                        onChange={(e) => setPigSize(e.target.value)}
                        placeholder="1024x1024"
                        className="w-full px-3 py-2 border border-violet-200 rounded-lg bg-white text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">API 预设方案</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      常用接口可保存多套命名方案，一键切换。须点「管理预设」→「添加方案」并保存后才会写入本机；刷新后仍会保留。
                    </p>
                  </div>
                  <button
                    onClick={() => setShowApiPresetsModal(true)}
                    className="px-3 py-2 text-sm rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    管理预设
                  </button>
                </div>
                {apiPresets.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {apiPresets.slice(0, 6).map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handleApplyApiPreset(preset)}
                        className="px-3 py-2 text-sm rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    还没有预设：点右上角「管理预设」添加名称、URL、Key 与模型后保存。仅填写上面主表单不会出现在此列表。
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">当前状态</h3>
                <div className="mt-4 space-y-4">
                  {modelName ? (
                    <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-700">
                      当前模型：<span className="font-mono ml-1">{modelName}</span>
                    </div>
                  ) : null}
                  <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                    请不要选择带“思考”功能的模型，以免返回额外推理内容影响聊天体验。
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={testConnection}
                      disabled={testing}
                      className="w-full bg-slate-600 hover:bg-slate-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:bg-gray-400"
                    >
                      {testing ? '测试中' : testResult === 'success' ? '文本已通过' : '仅测文本连接'}
                    </button>
                    <button
                      onClick={handleSave}
                      className="w-full bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-lg font-medium transition-colors"
                    >
                      保存配置
                    </button>
                  </div>
                  {(textTestMessage || visionTestMessage) ? (
                    <div className="space-y-2">
                      {textTestMessage ? (
                        <div
                          className={`rounded-2xl border p-3 text-xs ${
                            testResult === 'error'
                              ? 'bg-red-50 border-red-200 text-red-700'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          }`}
                        >
                          文本测试：{textTestMessage}
                        </div>
                      ) : null}
                      {visionTestMessage ? (
                        <div
                          className={`rounded-2xl border p-3 text-xs ${
                            visionTestResult === 'error'
                              ? 'bg-red-50 border-red-200 text-red-700'
                              : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          }`}
                        >
                          视觉测试：{visionTestMessage}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        );
      case 'appearance':
        return (
          <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">显示偏好</h3>
              <p className="mt-1 text-sm text-slate-500">桌面端显示和容器样式相关设置。</p>
              <div className="mt-6 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
                <div>
                  <div className="text-sm font-medium text-gray-900">全屏显示</div>
                  <div className="text-xs text-gray-500 mt-1">自动适应浏览器屏幕，无边框全屏效果</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fullscreenMode}
                    onChange={(e) => onToggleFullscreen(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">头像装饰</h3>
              <p className="mt-1 text-sm text-slate-500">选择一个常用装饰作为当前账号头像角标。</p>
              <div className="mt-5 grid grid-cols-6 gap-3">
                {AVATAR_BADGES.map((badge) => (
                  <button
                    key={badge}
                    onClick={() => handleBadgeChange(badge)}
                    className={`h-12 rounded-2xl flex items-center justify-center text-2xl transition-all ${
                      selectedBadge === badge
                        ? 'bg-blue-500 scale-105 shadow-lg'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {badge}
                  </button>
                ))}
              </div>
              <div className="mt-5 rounded-2xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-700">
                当前选择：<span className="text-xl ml-2 align-middle">{selectedBadge}</span>
              </div>
            </div>
          </section>
        );
      case 'cloud-sync':
        return (
          <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">同步概览</h3>
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                  <div className="rounded-2xl border border-gray-200 bg-slate-50 p-3">
                    <div className="text-xs text-gray-500">本地会话</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">{localConversationCount}</div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-slate-50 p-3">
                    <div className="text-xs text-gray-500">云端会话</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">{cloudConversationCount === null ? '--' : cloudConversationCount}</div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-slate-50 p-3">
                    <div className="text-xs text-gray-500">首次绑定状态</div>
                    <div className="mt-1 text-sm font-medium text-gray-900">
                      {cloudBindingState === 'uploaded'
                        ? '已上传本地历史'
                        : cloudBindingState === 'skipped'
                          ? '已跳过首次上传'
                          : cloudBindingState === 'cloud-existing'
                            ? '云端已有历史'
                            : cloudBindingState === 'local-empty'
                              ? '本地暂无历史'
                              : '待确认'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-slate-50 p-3">
                    <div className="text-xs text-gray-500">最近成功同步</div>
                    <div className="mt-1 text-sm font-medium text-gray-900">
                      {cloudLastSyncAt ? new Date(cloudLastSyncAt).toLocaleString('zh-CN') : '--'}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  {supabaseStatus === 'checking' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                      <span className="text-gray-600">检测中…</span>
                    </>
                  ) : supabaseStatus === 'connected' ? (
                    <>
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />
                      <span className="text-gray-800">已连接（云端可用）</span>
                    </>
                  ) : supabaseStatus === 'auth_required' ? (
                    <>
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-gray-800">已配置，等待邮箱登录</span>
                    </>
                  ) : supabaseStatus === 'not_configured' ? (
                    <>
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400" />
                      <span className="text-gray-700">未配置（仅本地存储）</span>
                    </>
                  ) : (
                    <>
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span className="text-gray-800">连接失败（已回退本地）</span>
                    </>
                  )}
                </div>
                {supabaseStatus === 'error' && supabaseError ? (
                  <div className="mt-3 text-xs text-red-700 break-words">{supabaseError}</div>
                ) : null}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">云端配置</h3>
                    <p className="mt-1 text-sm text-slate-500">开启后可连接你的 Supabase 项目。</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cloudSyncEnabled}
                      onChange={(e) => setCloudSyncEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all" />
                  </label>
                </div>
                <div className={`mt-4 space-y-2.5 ${cloudSyncEnabled ? '' : 'opacity-60'}`}>
                  <input
                    type="text"
                    value={cloudSupabaseUrl}
                    onChange={(e) => setCloudSupabaseUrl(e.target.value)}
                    placeholder="Supabase URL（例如 https://xxxx.supabase.co）"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="password"
                    value={cloudSupabaseAnonKey}
                    onChange={(e) => setCloudSupabaseAnonKey(e.target.value)}
                    placeholder="Supabase Anon Key"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={handleSaveCloudSyncSettings}
                      className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                    >
                      保存配置
                    </button>
                    <button
                      onClick={checkSupabaseStatus}
                      className="w-full px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      重新检测
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-[18px] shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">邮箱登录</h3>
                <p className="mt-1 text-sm text-slate-500">多设备同步必须使用同一个邮箱登录。</p>
                <div className="mt-3.5 space-y-[9px]">
                  <div className="rounded-2xl bg-slate-50 px-4 py-[9px] text-sm text-slate-700">
                    当前 UID：<span className="font-mono ml-2">{cloudAuthUserId ?? '未登录'}</span>
                  </div>
                  <input
                    type="email"
                    value={cloudAuthEmail}
                    onChange={(e) => setCloudAuthEmail(e.target.value)}
                    placeholder="邮箱（用于接收登录链接）"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleSendCloudMagicLink}
                    disabled={cloudAuthSending}
                    className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {cloudAuthSending ? '发送中…' : '发送登录链接到邮箱'}
                  </button>
                  <div className="grid grid-cols-2 gap-[9px]">
                    <button
                      onClick={handleCloudSignOut}
                      className="w-full px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      退出登录
                    </button>
                    <button
                      onClick={handleManualCloudUpload}
                      disabled={cloudManualSyncRunning || !cloudAuthUserId}
                      className="w-full px-3 py-2 rounded-lg text-sm font-medium border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed"
                    >
                      {cloudManualSyncRunning ? '上传中…' : '上传本地历史'}
                    </button>
                  </div>
                  <button
                    onClick={handleUnbindCloudAccount}
                    className="w-full px-3 py-2 rounded-lg text-sm font-medium border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
                  >
                    解绑邮箱（保留本地数据）
                  </button>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-[18px] shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">同步说明</h3>
                <div className="mt-3.5 rounded-2xl bg-slate-50 px-4 py-[13px] text-sm text-slate-600 leading-relaxed">
                  云同步用于把聊天记录、记忆与衍生数据存到云端。保持关闭时，应用只使用本地 IndexedDB。
                </div>
                {cloudAuthHint ? (
                  <div className="mt-3.5 rounded-2xl bg-blue-50 border border-blue-100 px-4 py-[13px] text-sm text-blue-700 break-words">
                    {cloudAuthHint}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        );
      case 'storage':
        return (
          <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">本地存储使用情况</h3>
              <p className="mt-1 text-sm text-slate-500">查看 localStorage 与 IndexedDB 的当前占用。</p>
              <div className="mt-5">
                {isLoadingStorage ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                      <span className="text-sm text-gray-600">加载存储信息中...</span>
                    </div>
                  </div>
                ) : storageInfo ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">已用空间</span>
                        <span className="font-mono text-gray-800">
                          {`${((storageInfo.localStorage.usage + storageInfo.indexedDB.usage) / 1024 / 1024).toFixed(1)} MB`}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">localStorage</span>
                          <span className="font-mono text-gray-800">
                            {(storageInfo.localStorage.usage / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-green-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (storageInfo.localStorage.usage / (10 * 1024 * 1024)) * 100).toFixed(1)}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">IndexedDB</span>
                          <span className="font-mono text-gray-800">
                            {(storageInfo.indexedDB.usage / 1024 / 1024).toFixed(1)} MB
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (storageInfo.indexedDB.usage / storageInfo.quota.quota) * 100).toFixed(1)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <span className="text-sm text-red-600">存储信息加载失败</span>
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">存储操作</h3>
              <p className="mt-1 text-sm text-slate-500">这里保留对迁移和清理的直接操作。</p>
              <div className="mt-5 space-y-3">
                <button
                  onClick={handleManualMigration}
                  className="w-full py-3 px-4 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl transition-colors flex items-center justify-center gap-2 text-blue-700"
                >
                  <Database className="w-4 h-4" />
                  <span className="font-medium text-sm">手动数据迁移</span>
                </button>
                <button
                  onClick={handleClearAllData}
                  className="w-full py-3 px-4 border-2 border-red-200 hover:border-red-400 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2 text-red-700"
                >
                  <Database className="w-4 h-4" />
                  <span className="font-medium text-sm">清除所有数据</span>
                </button>
              </div>
            </div>
          </section>
        );
      case 'backup':
        return (
          <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">备份操作</h3>
              <p className="mt-1 text-sm text-slate-500">导出当前数据或从备份恢复。</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  onClick={handleExportAllData}
                  className="py-4 border-2 border-green-200 hover:border-green-400 hover:bg-green-50 rounded-xl transition-colors flex flex-col items-center justify-center gap-2 text-green-700"
                >
                  <Download className="w-6 h-6" />
                  <span className="font-medium text-sm">导出全部数据</span>
                </button>
                <button
                  onClick={() => importInputRef.current?.click()}
                  className="py-4 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl transition-colors flex flex-col items-center justify-center gap-2 text-blue-700"
                >
                  <Upload className="w-6 h-6" />
                  <span className="font-medium text-sm">导入全部数据</span>
                </button>
              </div>
              <input
                ref={importInputRef}
                type="file"
                accept=".json"
                onChange={handleImportAllData}
                className="hidden"
              />
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/90 p-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
                  checked={quickBackupFabOn}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setQuickBackupFabOn(on);
                    writeQuickBackupFabVisible(on);
                  }}
                />
                <span>
                  <span className="font-medium text-slate-800">显示全局快捷备份球</span>
                  <span className="mt-0.5 block text-xs text-slate-500 leading-relaxed">
                    默认开启。关闭后右下角半透明导出按钮会隐藏；可随时在此重新打开。
                  </span>
                </span>
              </label>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">换浏览器 / 整机迁移</h3>
              <div className="mt-5 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 leading-relaxed">
                <span className="font-semibold">三步：</span><br />
                1. 在<strong>旧浏览器</strong>本页点「导出全部数据」，把下载的 JSON 存好（可拷 U 盘/网盘）。<br />
                2. 在<strong>新浏览器</strong>打开同一网址，进设置 → 数据备份 →「导入全部数据」，选该 JSON。<br />
                3. 确认覆盖后等待完成并自动刷新；之后在新浏览器里照常使用即可。<br />
                <span className="font-semibold mt-3 block">导出里会尽量带上：</span>
                聊天与角色、联系人、朋友圈、文档、设置与主库存的数据，以及表情包（含通用/角色/用户）、世界书大正文、EasyChat 贴纸等独立库内容，减少换环境丢数据。<br />
                <span className="font-semibold mt-3 block">注意：</span>
                导入会清空并覆盖当前浏览器里的本地数据；建议先导出一份再导入。若你还开了云端同步，云端数据另以账号为准。
              </div>
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  const renderMobileSection = () => {
    switch (activeSection) {
      case 'api-config':
        return (
          <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="text-xs text-slate-500 mb-1">Base URL</div>
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                autoComplete="off"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
              />
            </div>
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="text-xs text-slate-500 mb-1">API Key</div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
              />
            </div>
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="text-xs text-slate-500 mb-1">模型</div>
              <div className="flex gap-2">
                {availableModels.length > 0 ? (
                  <select
                    value={modelName}
                    onMouseDown={requestPullModelsFromDropdown}
                    onChange={(e) => setModelName(e.target.value)}
                    autoComplete="off"
                    className="flex-1 min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white font-mono"
                  >
                    {availableModels.map((model) => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={modelName}
                    onFocus={requestPullModelsFromDropdown}
                    onChange={(e) => setModelName(e.target.value)}
                    autoComplete="off"
                    className="flex-1 min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white font-mono"
                  />
                )}
                <button
                  type="button"
                  onClick={() => void pullModelsForTextAndVision()}
                  disabled={testing || visionTesting}
                  className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 disabled:opacity-50"
                >
                  {testing || visionTesting ? '拉取中' : modelName.trim() || availableModels.length > 0 ? '更换' : '拉取'}
                </button>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                下列表为对话模型（已过滤 embedding）。专属视觉模型可不填——不填也会识图（用当前对话模型）；填了多为换便宜 VL。点开下拉会自动拉取（约 {Math.round(DROPDOWN_PULL_MIN_INTERVAL_MS / 1000)} 秒内不重复）。
              </div>
            </div>

            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
              <div className="text-xs font-medium text-slate-800 mb-1">最近一套接口</div>
              <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
                保存配置后会出现；点整包填入 URL、Key、模型。
              </p>
              {apiPairHistory.length === 0 ? (
                <p className="text-[11px] text-slate-400">暂无</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {apiPairHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white text-[11px]"
                    >
                      <button
                        type="button"
                        onClick={() => applyApiPairFromHistory(entry)}
                        className="max-w-[200px] truncate px-2 py-1.5 text-left font-mono text-slate-700"
                        title={entry.baseUrl}
                      >
                        {formatApiEndpointPairLabel(entry)}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveApiPairEntry(entry.id)}
                        className="shrink-0 p-1 text-slate-400 hover:text-red-600"
                        aria-label="移除"
                      >
                        <X className="w-3.5 h-3.5" aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="text-xs text-slate-500">专属视觉模型（可选）</div>
                <button
                  type="button"
                  onClick={testVisionSupport}
                  disabled={visionTesting}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 disabled:opacity-50"
                >
                  {visionTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  测试
                </button>
              </div>
              {availableVisionModels.length > 0 ? (
                <select
                  value={visionModelName}
                  onMouseDown={requestPullModelsFromDropdown}
                  onChange={(e) => setVisionModelName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                >
                  <option value="">默认：与对话模型相同（可识图）</option>
                  {availableVisionModels.map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={visionModelName}
                  onFocus={requestPullModelsFromDropdown}
                  onChange={(e) => setVisionModelName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                  placeholder="可选 VL；留空则用对话模型识图"
                />
              )}
              <div className="mt-2 text-[11px] text-slate-500">
                与角色里单独指定模型一样，方便降本。不填也会识图；填则只换识图用的 model；勾选「独立接口」才换别家 URL。
              </div>
              <p className="mt-2 text-[10px] text-amber-900/90 leading-relaxed rounded-lg border border-amber-200 bg-amber-50/90 px-2 py-1.5">
                带图回复：本版会把<strong>真实图片</strong>发给模型，比旧 demo 纯文字占位慢；大图更明显。
              </p>
            </div>

            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500">识图独立接口</div>
                <input
                  type="checkbox"
                  checked={useSeparateVisionApi}
                  onChange={(e) => setUseSeparateVisionApi(e.target.checked)}
                />
              </div>
              {useSeparateVisionApi ? (
                <div className="mt-2 space-y-2">
                  <input
                    value={visionBaseUrl}
                    onChange={(e) => setVisionBaseUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                    placeholder="视觉 Base URL"
                  />
                  <input
                    type="password"
                    value={visionApiKey}
                    onChange={(e) => setVisionApiKey(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                    placeholder="视觉 API Key"
                  />
                </div>
              ) : null}
            </div>

            <div className="px-4 py-3 border-b border-slate-100 bg-violet-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-slate-800">私聊 AI 真实配图</div>
                <input
                  type="checkbox"
                  checked={pigEnabled}
                  onChange={(e) => setPigEnabled(e.target.checked)}
                />
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                模型用 <span className="font-mono">[生图:…]</span> 请求发真图时会先弹窗确认。生图 URL/Key 可留空复用主接口；点下面按钮拉模型列表。
              </p>
              <input
                value={pigBaseUrl}
                onChange={(e) => setPigBaseUrl(e.target.value)}
                className="w-full rounded-xl border border-violet-200 px-3 py-2 text-sm bg-white"
                placeholder="生图 Base URL（可选）"
              />
              <input
                type="password"
                value={pigApiKey}
                onChange={(e) => setPigApiKey(e.target.value)}
                className="w-full rounded-xl border border-violet-200 px-3 py-2 text-sm bg-white"
                placeholder="生图 API Key（可选）"
                autoComplete="new-password"
              />
              {pigAvailableModels.length > 0 ? (
                <select
                  value={pigModel.trim() ? pigModel : pigAvailableModels[0] || ''}
                  onChange={(e) => setPigModel(e.target.value)}
                  className="w-full rounded-xl border border-violet-200 px-3 py-2 text-sm bg-white font-mono"
                >
                  {pigModel.trim() && !pigAvailableModels.includes(pigModel) ? (
                    <option value={pigModel}>{pigModel}（手填）</option>
                  ) : null}
                  {pigAvailableModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={pigModel}
                  onChange={(e) => setPigModel(e.target.value)}
                  className="w-full rounded-xl border border-violet-200 px-3 py-2 text-sm bg-white font-mono"
                  placeholder="生图模型，可手填或拉列表"
                />
              )}
              <button
                type="button"
                onClick={() => void pullPigModels()}
                disabled={pigModelsLoading}
                className="w-full rounded-xl border border-violet-400 bg-violet-100/90 py-2.5 text-sm font-medium text-violet-900 disabled:opacity-50"
              >
                {pigModelsLoading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    正在拉取…
                  </span>
                ) : (
                  '拉取生图模型列表（留空则用主接口）'
                )}
              </button>
              {pigModelsHint ? (
                <p className="text-[10px] text-slate-600 leading-snug">{pigModelsHint}</p>
              ) : null}
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  value={pigDailyMax}
                  onChange={(e) => setPigDailyMax(Number(e.target.value))}
                  className="flex-1 min-w-0 rounded-xl border border-violet-200 px-3 py-2 text-sm bg-white"
                  placeholder="每日上限"
                />
                <input
                  value={pigSize}
                  onChange={(e) => setPigSize(e.target.value)}
                  className="flex-1 min-w-0 rounded-xl border border-violet-200 px-3 py-2 text-sm bg-white font-mono"
                  placeholder="1024x1024"
                />
              </div>
              <p className="text-[10px] text-slate-500">每日上限 0 = 不限制（张 / 会话 / 自然日）</p>
            </div>

            <div className="px-4 py-3 border-b border-slate-100">
              <button
                onClick={() => setShowApiPresetsModal(true)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 text-sm"
              >
                管理 API 预设
              </button>
            </div>

            <div className="px-4 py-3">
              <button
                onClick={handleSave}
                className="w-full rounded-xl bg-emerald-500 text-white py-2 text-sm"
              >
                保存配置
              </button>
              {(textTestMessage || visionTestMessage) ? (
                <div className="mt-3 space-y-2">
                  {textTestMessage ? (
                    <div
                      className={`rounded-xl border px-3 py-2 text-xs ${
                        testResult === 'error'
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      }`}
                    >
                      文本测试：{textTestMessage}
                    </div>
                  ) : null}
                  {visionTestMessage ? (
                    <div
                      className={`rounded-xl border px-3 py-2 text-xs ${
                        visionTestResult === 'error'
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      }`}
                    >
                      视觉测试：{visionTestMessage}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        );
      case 'appearance':
        return (
          <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-900">全屏显示</div>
                  <div className="text-xs text-slate-500 mt-1">自动适应浏览器屏幕</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fullscreenMode}
                    onChange={(e) => onToggleFullscreen(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all" />
                </label>
              </div>
            </div>

            <div className="px-4 py-3">
              <div className="text-sm font-semibold text-slate-900">头像装饰</div>
              <div className="mt-3 grid grid-cols-6 gap-2">
                {AVATAR_BADGES.map((badge) => (
                  <button
                    key={badge}
                    onClick={() => handleBadgeChange(badge)}
                    className={`h-10 rounded-xl text-xl ${selectedBadge === badge ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-700'}`}
                  >
                    {badge}
                  </button>
                ))}
              </div>
            </div>
          </section>
        );
      case 'cloud-sync':
        return (
          <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="text-sm font-semibold text-slate-900">同步状态</div>
              <div className="mt-2 text-xs text-slate-500">
                本地 {localConversationCount} · 云端 {cloudConversationCount ?? '--'}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                最近同步：{cloudLastSyncAt ? new Date(cloudLastSyncAt).toLocaleString('zh-CN') : '--'}
              </div>
            </div>

            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-800">启用云同步</span>
                <input type="checkbox" checked={cloudSyncEnabled} onChange={(e) => setCloudSyncEnabled(e.target.checked)} />
              </div>
            </div>

            <div className={`px-4 py-3 ${cloudSyncEnabled ? 'border-b border-slate-100' : 'opacity-60'} `}>
              <input
                value={cloudSupabaseUrl}
                onChange={(e) => setCloudSupabaseUrl(e.target.value)}
                placeholder="Supabase URL"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
              />
              <div className="mt-2">
                <input
                  type="password"
                  value={cloudSupabaseAnonKey}
                  onChange={(e) => setCloudSupabaseAnonKey(e.target.value)}
                  placeholder="Supabase Anon Key"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                />
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleSaveCloudSyncSettings}
                  className="flex-1 rounded-xl bg-blue-500 text-white py-2 text-sm disabled:bg-slate-400"
                >
                  保存配置
                </button>
                <button
                  onClick={checkSupabaseStatus}
                  className="flex-1 rounded-xl border border-slate-200 py-2 text-sm"
                >
                  重试
                </button>
              </div>
            </div>

            {cloudSyncEnabled && (
              <div className="px-4 py-3">
                <div className="text-sm font-medium text-slate-900 mb-2">云端登录</div>
                <input
                  type="email"
                  value={cloudAuthEmail}
                  onChange={(e) => setCloudAuthEmail(e.target.value)}
                  placeholder="邮箱地址"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                />
                <button
                  onClick={handleSendCloudMagicLink}
                  disabled={cloudAuthSending}
                  className="w-full rounded-xl bg-emerald-500 text-white py-2 text-sm mt-3 disabled:bg-slate-400"
                >
                  {cloudAuthSending ? '发送中...' : '发送登录链接'}
                </button>
                <button onClick={handleCloudSignOut} className="w-full rounded-xl border border-slate-200 py-2 text-sm mt-2">
                  退出登录
                </button>
                <button onClick={handleUnbindCloudAccount} className="w-full rounded-xl border border-amber-300 text-amber-700 py-2 text-sm mt-2">
                  解绑邮箱
                </button>
              </div>
            )}
          </section>
        );
      case 'storage':
        return (
          <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="text-sm font-semibold text-slate-900">存储占用</div>
              {isLoadingStorage ? (
                <div className="mt-2 text-sm text-slate-500">加载中...</div>
              ) : (
                <div className="mt-2 text-sm text-slate-600">
                  {storageInfo?.localStorage && storageInfo?.indexedDB
                    ? `${((storageInfo.localStorage.usage + storageInfo.indexedDB.usage) / 1024 / 1024).toFixed(1)} MB`
                    : '暂无数据'}
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-b border-slate-100">
              <button onClick={handleManualMigration} className="w-full rounded-xl border border-blue-300 text-blue-700 py-2 text-sm">
                手动数据迁移
              </button>
            </div>
            <div className="px-4 py-3">
              <button onClick={handleClearAllData} className="w-full rounded-xl border border-red-300 text-red-700 py-2 text-sm">
                清除所有数据
              </button>
            </div>
          </section>
        );
      case 'backup':
        return (
          <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportAllData}
                  className="w-full rounded-xl border border-emerald-300 text-emerald-700 py-2 text-sm"
                >
                  导出
                </button>
                <button
                  onClick={() => importInputRef.current?.click()}
                  className="w-full rounded-xl border border-blue-300 text-blue-700 py-2 text-sm"
                >
                  导入
                </button>
              </div>
              <input ref={importInputRef} type="file" accept=".json" onChange={handleImportAllData} className="hidden" />
            </div>
            <label className="flex cursor-pointer items-start gap-3 border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
                checked={quickBackupFabOn}
                onChange={(e) => {
                  const on = e.target.checked;
                  setQuickBackupFabOn(on);
                  writeQuickBackupFabVisible(on);
                }}
              />
              <span className="text-xs leading-relaxed">
                <span className="font-medium text-slate-800">全局快捷备份球</span>
                <span className="mt-0.5 block text-slate-500">默认开启；关闭后右下角导出按钮隐藏。</span>
              </span>
            </label>
            <div className="px-4 py-3 bg-amber-50">
              <div className="text-xs text-amber-800 leading-relaxed space-y-1">
                <div><span className="font-semibold">换浏览器：</span>旧机点导出 → 把 JSON 拷到新浏览器 → 新机点导入。</div>
                <div>导入会覆盖当前浏览器全部本地数据，建议先导出备份。</div>
              </div>
            </div>
          </section>
        );
      default:
        return null;
    }
  };
  
  const loadStorageInfo = async () => {
    try {
      setIsLoadingStorage(true);
      const localConversations = await smartLoad('conversations');
      setLocalConversationCount(Array.isArray(localConversations) ? localConversations.length : 0);
      const [storageStatus, quotaInfo] = await Promise.all([
        getStorageStatus(),
        checkStorageQuota()
      ]);
      
      setStorageInfo({
        ...storageStatus,
        quota: quotaInfo,
        localStorage: {
          usage: Math.round(storageStatus.localStorage.sizeMB * 1024 * 1024)
        },
        indexedDB: {
          usage: Math.round(storageStatus.indexedDB.sizeMB * 1024 * 1024)
        }
      });
    } catch (error) {
      console.error('加载存储信息失败:', error);
    } finally {
      setIsLoadingStorage(false);
    }
  };

  const refreshCloudSyncSummary = async (uid: string | null) => {
    setCloudLastSyncAt(getCloudSyncRuntimeState().lastSuccessfulSyncAt);
    const settings = getCloudSyncSettings();
    if (!settings.enabled || !settings.url || !uid) {
      setCloudConversationCount(null);
      setCloudBindingState(null);
      return;
    }
    try {
      const cloudConversations = await supabaseLoadConversations();
      setCloudConversationCount(cloudConversations.length);
      setCloudBindingState(localStorage.getItem(getCloudBindingKey(settings.url, uid)));
    } catch {
      setCloudConversationCount(null);
      setCloudBindingState(null);
    }
  };

  const handleBadgeChange = (badge: string) => {
    setSelectedBadge(badge);
    // 保存到localStorage
    try {
      const profile = localStorage.getItem('userProfile');
      const parsed = profile ? JSON.parse(profile) : {};
      parsed.avatarBadge = badge;
      localStorage.setItem('userProfile', JSON.stringify(parsed));
    } catch (e) {
      console.error('Failed to save badge:', e);
    }
  };

  const testConnection = async () => {
    if (!baseUrl || !apiKey) {
      alert('请填写 Base URL 和 API Key');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setTextTestMessage('');

    try {
      const models = await fetchOpenAiCompatibleModelIds(baseUrl.trim(), apiKey.trim());
      setAvailableModels(filterLikelyChatModels(models));
      setTestResult('success');
      setTextTestMessage(`文本连接正常，已拉取 ${models.length} 个模型。`);
      
      if (models.length > 0 && !modelName) {
        setModelName(models[0]);
      }
    } catch (error) {
      console.error('Test failed:', error);
      setTestResult('error');
      setTextTestMessage('文本连接失败，请检查 Base URL / API Key。');
      alert('连接测试失败，请检查配置');
    } finally {
      setTesting(false);
    }
  };

  const resolveVisionEndpoint = () => {
    const usingSeparate = useSeparateVisionApi;
    const resolvedUrl = (usingSeparate ? visionBaseUrl : baseUrl).trim();
    const resolvedKey = (usingSeparate ? visionApiKey : apiKey).trim();
    return {
      resolvedUrl,
      resolvedKey,
      usingSeparate,
    };
  };

  const pullModelsForTextAndVision = async (opts?: { silent?: boolean }) => {
    if (!baseUrl.trim() || !apiKey.trim()) {
      if (!opts?.silent) alert('请先填写文本接口的 Base URL 和 API Key');
      return;
    }
    if (useSeparateVisionApi && (!visionBaseUrl.trim() || !visionApiKey.trim())) {
      if (!opts?.silent) alert('你已开启识图独立接口，请填写 Base URL 与 API Key');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setVisionTestResult(null);
    setTextTestMessage('');
    setVisionTestMessage('');
    try {
      const textModelsRaw = await fetchOpenAiCompatibleModelIds(baseUrl.trim(), apiKey.trim());
      const textModels = filterLikelyChatModels(textModelsRaw);
      setAvailableModels(textModels);
      if (textModels.length > 0 && !modelName) {
        setModelName(textModels[0]);
      }
      setTestResult('success');
      const skippedNonChat = textModelsRaw.length - textModels.length;
      setTextTestMessage(
        skippedNonChat > 0
          ? `文本对话模型 ${textModels.length} 个（已从列表剔除 ${skippedNonChat} 个 embedding 等非对话模型）。`
          : `文本模型拉取成功：${textModels.length} 个。`
      );

      const { resolvedUrl, resolvedKey } = resolveVisionEndpoint();
      let visionChatModels: string[];
      if (useSeparateVisionApi) {
        const visionModelsRaw = await fetchOpenAiCompatibleModelIds(resolvedUrl, resolvedKey);
        visionChatModels = filterLikelyChatModels(visionModelsRaw);
      } else {
        visionChatModels = textModels;
      }
      setAvailableVisionModels(visionChatModels);
      setVisionTestResult(null);
      setVisionTestMessage(
        visionChatModels.length > 0
          ? `专属视觉模型下拉已加载 ${visionChatModels.length} 个模型（可不选——不选则用对话模型识图）。若要单独指定 VL，请任选或手填 ID，并可点「测试视觉」。`
          : '未拿到列表时可手动填写专属视觉模型 ID；不填亦可用对话模型识图。需要时点「测试视觉」。'
      );

      if (!opts?.silent) {
        alert(
          '拉取完成：专属视觉模型为可选项（与角色单独指定模型同理，便于降本）。不填也会正常识图；填了再点「测试视觉」可验证该模型是否接收附图。'
        );
      }
    } catch (error) {
      console.error('拉取模型失败:', error);
      setTestResult('error');
      setVisionTestResult('error');
      setTextTestMessage('模型拉取失败，请检查文本接口配置。');
      setVisionTestMessage('模型拉取失败，请检查识图独立接口或主接口配置。');
      if (!opts?.silent) {
        alert('拉取模型失败，请检查 URL / Key 是否正确');
      }
    } finally {
      setTesting(false);
    }
  };

  pullModelsForTextAndVisionRef.current = pullModelsForTextAndVision;

  /** 生图模型列表：生图 URL/Key 留空时使用主接口 Base URL / API Key */
  const pullPigModels = async (opts?: { silent?: boolean }) => {
    const resolvedUrl = (pigBaseUrl || '').trim() || (baseUrl || '').trim();
    const resolvedKey = (pigApiKey || '').trim() || (apiKey || '').trim();
    if (!resolvedUrl || !resolvedKey) {
      if (!opts?.silent) {
        alert('请先填写主接口的 Base URL 与 API Key，或填写生图专用 URL / Key');
      }
      return;
    }
    setPigModelsLoading(true);
    setPigModelsHint('');
    try {
      const raw = await fetchOpenAiCompatibleModelIds(resolvedUrl, resolvedKey);
      setPigAvailableModels(raw);
      setPigModel((prev) => {
        if (prev && raw.includes(prev)) return prev;
        if (prev && prev.trim() && !raw.includes(prev)) return prev;
        return raw[0] || '';
      });
      setPigModelsHint(
        raw.length > 0
          ? `已拉取 ${raw.length} 个模型（网关返回全量，可选手填的生图模型 ID）。`
          : '列表为空，请继续手填生图模型 ID。',
      );
      if (!opts?.silent && raw.length > 0) {
        alert(`生图模型列表已更新：${raw.length} 个`);
      }
    } catch (e) {
      console.error('生图模型拉取失败:', e);
      const msg = e instanceof Error ? e.message : '拉取失败';
      setPigModelsHint(`拉取失败：${msg}`);
      if (!opts?.silent) {
        alert(`生图模型拉取失败：${msg}`);
      }
    } finally {
      setPigModelsLoading(false);
    }
  };

  const testVisionSupport = async () => {
    const model = visionModelName.trim();
    if (!model) {
      alert('「测试视觉」需要先填写或选择上方的专属视觉模型 ID。日常识图可以不填此处，带图时会用当前对话模型。');
      return;
    }
    const { resolvedUrl, resolvedKey, usingSeparate } = resolveVisionEndpoint();
    if (!resolvedUrl || !resolvedKey) {
      alert(usingSeparate ? '请先填写识图独立接口的 URL / Key' : '请先填写主接口 URL / Key');
      return;
    }

    const tinyPngDataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9VE3h1wAAAAASUVORK5CYII=';

    setVisionTesting(true);
    setVisionTestResult(null);
    setVisionTestMessage('');
    try {
      const response = await fetch(buildApiUrl({ baseUrl: resolvedUrl, apiKey: resolvedKey, modelName: model }), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resolvedKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: '请用一句话描述这张图片内容。' },
                { type: 'image_url', image_url: { url: tinyPngDataUrl } },
              ],
            },
          ],
          max_tokens: 30,
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        const raw = await response.text();
        const low = raw.toLowerCase();
        let reason = '视觉能力测试失败（未知原因）';
        if (low.includes('model') && (low.includes('not found') || low.includes('unsupported'))) {
          reason = '模型不存在或该模型不支持视觉';
        } else if (low.includes('image') || low.includes('vision') || low.includes('multimodal')) {
          reason = '该模型或网关不支持 image_url 多模态';
        } else if (low.includes('api key') || low.includes('unauthorized') || low.includes('invalid')) {
          reason = '视觉接口鉴权失败（Key 可能无效）';
        } else if (response.status >= 500) {
          reason = '视觉接口服务异常（5xx）';
        }
        throw new Error(reason);
      }

      setVisionTestResult('success');
      setVisionTestMessage('视觉模型测试通过：该模型可接收 image_url。');
      alert('视觉模型测试通过：该模型可接收 image_url。');
    } catch (error: any) {
      console.error('视觉模型测试失败:', error);
      setVisionTestResult('error');
      setVisionTestMessage(`视觉模型测试失败：${error?.message || '请检查配置'}`);
      alert(`视觉模型测试失败：${error?.message || '请检查配置'}`);
    } finally {
      setVisionTesting(false);
    }
  };

  const applyApiPairFromHistory = (entry: ApiEndpointPairEntry) => {
    setBaseUrl(entry.baseUrl);
    setApiKey(entry.apiKey);
    setModelName(entry.modelName);
    setAvailableModels((prev) => (prev.includes(entry.modelName) ? prev : [...prev, entry.modelName]));
    addApiEndpointPairSnapshot({
      baseUrl: entry.baseUrl,
      apiKey: entry.apiKey,
      modelName: entry.modelName,
    });
    setApiPairHistory(listApiEndpointPairHistory());
  };

  const handleRemoveApiPairEntry = (id: string) => {
    removeApiEndpointPair(id);
    setApiPairHistory(listApiEndpointPairHistory());
  };

  const handleSave = () => {
    if (!baseUrl || !apiKey || !modelName) {
      alert('请完成所有配置项');
      return;
    }

    // 检查语音转文字配置
    if (sttEnabled && (!sttApiUrl || !sttApiKey)) {
      alert('请完成语音转文字API配置');
      return;
    }

    const visionBaseTrim = visionBaseUrl.trim();
    const visionKeyTrim = visionApiKey.trim();

    if (useSeparateVisionApi && (!visionBaseTrim || !visionKeyTrim)) {
      alert('你已开启识图独立接口，请同时填写「识图 Base URL」与「识图 API Key」');
      return;
    }
    if ((visionBaseTrim || visionKeyTrim) && !(visionBaseTrim && visionKeyTrim)) {
      alert('识图独立线路需**同时**填写 Base URL 与 API Key；若只使用主接口 + 下方「视觉模型 ID」，请两项都留空。');
      return;
    }

    onUpdateConfig({
      ...apiConfig,
      baseUrl,
      apiKey,
      modelName,
      visionModelName: visionModelName.trim(),
      // 与「勾选单独接口」解耦：只要两项都填了就持久化，避免未勾选时保存把独立网关清空导致仍用 vision 模型名打到主站
      visionBaseUrl: visionBaseTrim,
      visionApiKey: visionKeyTrim,
      privateAiImageGeneration: {
        enabled: pigEnabled,
        baseUrl: pigBaseUrl.trim(),
        apiKey: pigApiKey.trim(),
        model: pigModel.trim(),
        dailyMaxPerConversation: Math.max(0, Math.floor(Number(pigDailyMax)) || 0),
        size: (pigSize || '').trim() || '1024x1024',
      },
      speechToText: sttEnabled
        ? {
            enabled: true,
            apiUrl: sttApiUrl,
            apiKey: sttApiKey,
            model: sttModel,
          }
        : {
            enabled: false,
          },
    });
    addApiEndpointPairSnapshot({ baseUrl, apiKey, modelName });
    setApiPairHistory(listApiEndpointPairHistory());
    if (visionBaseTrim && visionKeyTrim) {
      setUseSeparateVisionApi(true);
    }
    alert('配置已保存');
  };

  // 应用选中的 API 预设：同步到表单并立即写入全局 apiConfig（与设置页「保存」一致，聊天立刻走新 Base URL）
  const handleApplyApiPreset = (preset: APIPreset) => {
    if (!preset) return;
    const nextBase = (preset.apiUrl || '').trim();
    const nextKey = preset.apiKey || '';
    const nextModel = (preset.model || '').trim();
    setBaseUrl(nextBase);
    setApiKey(nextKey);
    setModelName(nextModel);
    setVisionModelName('');
    setVisionBaseUrl('');
    setVisionApiKey('');
    setUseSeparateVisionApi(false);
    apiPresetsManager.switchToPreset(preset.id);

    onUpdateConfig({
      ...apiConfig,
      baseUrl: nextBase,
      apiKey: nextKey,
      modelName: nextModel,
      visionModelName: '',
      visionBaseUrl: '',
      visionApiKey: '',
    });
    if (nextBase && nextKey && nextModel) {
      addApiEndpointPairSnapshot({ baseUrl: nextBase, apiKey: nextKey, modelName: nextModel });
      setApiPairHistory(listApiEndpointPairHistory());
    }
  };

  // 导出全部数据
  const handleExportAllData = async () => {
    try {
      console.log('🔄 开始导出全部数据...');
      const { stats, sidecarSummaryLine } = await exportFullMomoyuBackup();
      alert(formatFullExportSuccessAlert(stats, sidecarSummaryLine));
      console.log('✅ 数据导出完成');
    } catch (error) {
      console.error('❌ 导出失败:', error);
      alert('❌ 导出失败，请重试\n\n错误: ' + error);
    }
  };

  // 手动迁移数据
  const handleManualMigration = async () => {
    try {
      const result = await migrateData();
      alert(`✅ 数据迁移完成！\n\n迁移成功: ${result.migratedKeys.length} 项\n迁移失败: ${result.errors.length} 项`);
      await loadStorageInfo(); // 刷新存储信息
    } catch (error) {
      console.error('手动迁移失败:', error);
      alert('❌ 迁移失败，请查看控制台了解详情');
    }
  };

  // 清除所有数据
  const handleClearAllData = async () => {
    const confirmMsg = '⚠️ 危险操作：清除所有数据\n\n' +
      '这将删除：\n' +
      '• 所有对话记录\n' +
      '• 所有AI角色数据\n' +
      '• 所有朋友圈内容\n' +
      '• 所有配置设置\n' +
      '• 所有文档和记忆库\n\n' +
      '此操作无法撤销！确定继续吗？';
    
    if (window.confirm(confirmMsg)) {
      try {
        await clearAllData();
        alert('✅ 所有数据已清除！页面将刷新。');
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        console.error('清除数据失败:', error);
        alert('❌ 清除失败，请查看控制台了解详情');
      }
    }
  };

  // 导入全部数据
  const handleImportAllData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        
        // 验证数据格式
        if (
          importedData?.format !== 'momoyu-backup-v3' ||
          importedData?.storageType !== 'full-snapshot-v3' ||
          !importedData?.data ||
          typeof importedData.data !== 'object' ||
          !Array.isArray(importedData.localStorageKeys) ||
          !Array.isArray(importedData.indexedDBKeys)
        ) {
          alert('❌ 导入失败：该文件不是新版本全量备份（v3）。请使用当前版本重新导出后再导入。');
          return;
        }

        // 预检查存储配额
        const preQuota = await checkStorageQuota();
        const estimateDataSize = JSON.stringify(importedData.data).length * 2; // UTF-16估算
        const estimateMB = estimateDataSize / 1024 / 1024;
        
        // 构建详细的确认消息
        const stats = importedData.stats || {};
        let confirmMsg = `📥 即将导入数据备份（换浏览器 / 换机时整包恢复）\n\n` +
          `📅 备份时间: ${new Date(importedData.exportDate).toLocaleString()}\n` +
          `📊 数据内容:\n` +
          `  • 对话记录: ${stats.conversations || '?'} 个\n` +
          `  • AI角色: ${stats.profiles || '?'} 个\n` +
          `  • 联系人: ${stats.contacts || '?'} 个\n` +
          `  • 朋友圈: ${stats.moments || '?'} 条\n` +
          `  • 文档库: ${stats.documents || '?'} 份\n` +
          `  • 记忆库: ${stats.memories || '?'} 条\n` +
          `  • 关系网络: ${stats.relationships || '?'} 条\n` +
          `  • 背景图片: ${stats.images || '?'} 张\n` +
          `  • 总数据项: ${Object.keys(importedData.data).length}\n\n` +
          `💾 存储信息:\n` +
          `  • 设备类型: ${preQuota.isMobile ? '📱移动设备' : '🖥️桌面设备'}\n` +
          `  • 数据大小: 约${estimateMB.toFixed(1)}MB\n` +
          `  • 存储配额: ${(preQuota.quota / 1024 / 1024).toFixed(1)}MB\n` +
          `  • 可用空间: ${(preQuota.available / 1024 / 1024).toFixed(1)}MB\n`;
        
        // 添加存储空间警告
        if (estimateMB > preQuota.available / 1024 / 1024) {
          confirmMsg += `\n🚨 **存储空间警告**\n` +
            `数据大小(${estimateMB.toFixed(1)}MB) > 可用空间(${(preQuota.available / 1024 / 1024).toFixed(1)}MB)\n` +
            `建议：清理应用数据或使用桌面浏览器\n\n`;
        } else if (preQuota.isMobile && estimateMB > 10) {
          confirmMsg += `\n📱 **移动设备提示**\n` +
            `检测到大数据集(${estimateMB.toFixed(1)}MB)，将使用分批导入模式\n` +
            `这可能需要更长时间，请保持网络连接\n\n`;
        }
          
        confirmMsg += `⚠️ 警告：这将覆盖当前所有数据！\n` +
          `建议先导出当前数据作为备份。\n\n` +
          `✅ 包含内容：\n` +
          `  • 所有对话和消息\n` +
          `  • 所有AI角色设置（含记忆库）\n` +
          `  • 联系人和关系网络\n` +
          `  • 朋友圈内容\n` +
          `  • 文档库和知识库\n` +
          `  • 头像和背景图片\n` +
          `  • API配置和其他设置\n\n` +
          `确定要继续吗？`;
        
        if (!window.confirm(confirmMsg)) {
          return;
        }

        // 阻止 App 内防抖写入 conversations / moments 覆盖刚导入的分片或清空后的存储
        setBulkStorageRestoreInProgress(true);

        // 全量清空，避免残留
        await clearAllData();

        // 📊 检查存储配额
        const quota = await checkStorageQuota();
        const finalDataSize = JSON.stringify(importedData.data).length * 2; // UTF-16估算
        const finalDataMB = finalDataSize / 1024 / 1024;
        console.log(`📱 设备类型: ${quota.isMobile ? '移动设备' : '桌面设备'}`);
        console.log(`💾 存储配额: ${(quota.quota / 1024 / 1024).toFixed(1)}MB / 可用: ${(quota.available / 1024 / 1024).toFixed(1)}MB`);
        console.log(`📦 数据大小: ${finalDataMB.toFixed(1)}MB`);
        
        // 🔄 恢复所有数据（按备份记录恢复到对应存储层）
        const data = importedData.data;
        const importedLocalKeys: string[] = Array.isArray(importedData.localStorageKeys) ? importedData.localStorageKeys : [];
        const importedIndexedDBKeys: string[] = Array.isArray(importedData.indexedDBKeys) ? importedData.indexedDBKeys : [];
        const localKeySet = new Set(importedLocalKeys);
        const indexedKeySet = new Set(importedIndexedDBKeys);
        let importedCount = 0;
        let conversationsRestored = false;
        
        for (const key in data) {
          const value = data[key];

          if (key === 'conversations' && indexedKeySet.has(key)) {
            try {
              // 移动设备使用分批保存，避免配额超限
              if (quota.isMobile || (Array.isArray(value) && value.length > 100)) {
                console.log(`📱 检测到${quota.isMobile ? '移动设备' : '大数据集'}，使用分批保存模式...`);
                await saveBatch('conversations', value, {
                  batchSize: quota.isMobile ? 20 : 50,
                  onProgress: (progress) => {
                    console.log(`📊 导入进度: ${progress.toFixed(1)}%`);
                  }
                });
              } else {
                // 桌面设备或小数据集使用常规保存
                await smartSave('conversations', value);
              }
              
              conversationsRestored = true;
              console.log('✅ conversations数据已恢复到智能存储');
            } catch (error) {
              console.error('智能存储恢复失败:', error);
              if (error instanceof Error && error.message.includes('存储空间不足')) {
                alert(`❌ 导入失败：${error.message}\n\n建议：\n1. 清理应用数据释放空间\n2. 尝试导入较小的数据集\n3. 使用桌面版浏览器进行导入`);
                throw error instanceof Error ? error : new Error(String(error));
              }
              alert(
                `❌ 会话数据无法写入 IndexedDB（应用只从这里读取会话，不能使用 localStorage 替代）。\n\n${error instanceof Error ? error.message : String(error)}`
              );
              throw error instanceof Error ? error : new Error(String(error));
            }
          } else if (indexedKeySet.has(key)) {
            try {
              // 其他大数据也使用移动设备优化
              if (quota.isMobile && Array.isArray(value) && value.length > 50) {
                await saveBatch(key, value, { 
                  batchSize: 20,
                  onProgress: (progress) => {
                    console.log(`📊 ${key} 导入进度: ${progress.toFixed(1)}%`);
                  }
                });
              } else {
                await smartSave(key, value);
              }
              console.log(`✅ ${key}数据已恢复到智能存储`);
            } catch (error) {
              console.error(`${key} 导入写入失败（应为 IndexedDB）:`, error);
              alert(
                `❌ 导入中断：「${key}」无法写入 IndexedDB。\n\n${error instanceof Error ? error.message : String(error)}`
              );
              throw error instanceof Error ? error : new Error(String(error));
            }
          } else if (localKeySet.has(key)) {
            if (typeof value === 'string') {
              localStorage.setItem(key, value);
            } else {
              localStorage.setItem(key, JSON.stringify(value));
            }
          } else {
            try {
              if (resolveStorageLayer(key) === 'indexedDB') {
                if (quota.isMobile && Array.isArray(value) && value.length > 50) {
                  await saveBatch(key, value, {
                    batchSize: 20,
                    onProgress: (progress) => {
                      console.log(`📊 ${key} 导入进度(按策略推断): ${progress.toFixed(1)}%`);
                    },
                  });
                } else {
                  await smartSave(key, value);
                }
                console.log(`✅ ${key} 已写入 IndexedDB（备份 key 列表未单独列出该项）`);
              } else if (typeof value === 'string') {
                localStorage.setItem(key, value);
              } else {
                localStorage.setItem(key, JSON.stringify(value));
              }
            } catch (error) {
              console.error(`${key} 按存储策略恢复失败:`, error);
              if (resolveStorageLayer(key) === 'indexedDB') {
                alert(
                  `❌ 导入中断：「${key}」必须写入 IndexedDB。\n\n${error instanceof Error ? error.message : String(error)}`
                );
                throw error instanceof Error ? error : new Error(String(error));
              }
              try {
                localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
              } catch {
                /* ignore */
              }
            }
          }
          importedCount++;
        }

        if (!conversationsRestored) {
          try {
            const probe = await smartLoad('conversations');
            if (Array.isArray(probe) && probe.length > 0) {
              conversationsRestored = true;
            }
          } catch {
            /* ignore */
          }
        }

        const sidePayload = (importedData as Record<string, unknown>)[SIDECAR_INDEXED_FIELD];
        if (sidePayload) {
          try {
            await restoreSidecarIndexedDatabases(sidePayload);
            console.log('✅ 独立 IndexedDB（表情/世界书正文/感知）已恢复');
          } catch (e) {
            console.error('❌ 独立 IndexedDB 恢复失败:', e);
          }
        }

        const successMsg = `✅ 数据导入成功！\n\n` +
          `📊 导入统计:\n` +
          `• 已恢复 ${importedCount} 项数据\n` +
          `${conversationsRestored ? '• 对话数据已恢复到智能存储\n' : ''}` +
          `• 设备类型: ${quota.isMobile ? '📱移动设备' : '🖥️桌面设备'}\n` +
          `${quota.isMobile ? '• 已使用移动设备优化模式\n' : ''}` +
          `• 所有其他数据已恢复\n\n` +
          `💾 当前存储状态:\n` +
          `• 已用: ${((quota.quota - quota.available + finalDataMB * 1024 * 1024) / 1024 / 1024).toFixed(1)}MB\n` +
          `• 总计: ${(quota.quota / 1024 / 1024).toFixed(1)}MB\n\n` +
          `页面将自动刷新以应用更改。`;
        console.log(successMsg);

        const toastSummary = [
          `已恢复 ${importedCount} 项`,
          conversationsRestored ? '对话已写入本地' : null,
          quota.isMobile ? '移动设备分批模式' : null,
        ]
          .filter(Boolean)
          .join(' · ');

        toast.success('全量导入完成', {
          description: `${toastSummary}。界面仍显示旧数据是正常的——即将自动刷新页面以载入备份，请勿关闭标签页。`,
          duration: 6000,
        });

        // 非阻塞提示后立即刷新，避免用户未点掉 alert 导致误以为未生效
        window.setTimeout(() => {
          window.location.reload();
        }, 500);
        
      } catch (error) {
        setBulkStorageRestoreInProgress(false);
        console.error('导入失败:', error);
        const detail = error instanceof Error ? error.message : String(error);
        alert(`导入失败：${detail || '文件格式错误或数据损坏'}`);
      }
    };
    reader.readAsText(file);

    // 重置input
    if (importInputRef.current) {
      importInputRef.current.value = '';
    }
  };

  return (
    <div className="h-[100dvh] md:h-full min-h-0 bg-gray-50 flex flex-col">
      {entryIntentBanner && (
        <div
          role="status"
          className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-3 text-[13px] text-amber-950 leading-snug flex items-start justify-between gap-3"
        >
          <span className="min-w-0">{entryIntentBanner}</span>
          <button
            type="button"
            onClick={() => setEntryIntentBanner(null)}
            className="shrink-0 text-amber-800 font-medium underline underline-offset-2"
          >
            知道了
          </button>
        </div>
      )}
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
              <button
          onClick={() => {
            if (isMobileSectionOpen) {
              setIsMobileSectionOpen(false);
              return;
            }
            onBack();
          }}
          className="p-2 -ml-2"
        >
          <ChevronLeft className="w-6 h-6" />
              </button>
        <h1 className="text-lg font-semibold ml-2">
          {isMobileSectionOpen ? SETTINGS_SECTIONS.find((section) => section.id === activeSection)?.label ?? '设置' : '设置'}
        </h1>
          </div>

      {/* Content */}
      <div className="flex-1 min-h-0 bg-slate-100/70 p-4 lg:p-8 xl:overflow-hidden">
        <div className="mx-auto h-full min-h-0 w-full max-w-[1600px]">
          <div className="hidden h-full xl:flex xl:flex-col xl:gap-6">
                <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
              <div className="flex items-end justify-between gap-4">
          <div>
                  <h2 className="text-2xl font-semibold text-slate-900">桌面设置中心</h2>
          </div>
                <div className="grid grid-cols-2 gap-3 w-[360px]">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <div className="text-xs text-slate-500">本地会话</div>
                    <div className="mt-1 text-xl font-semibold text-slate-900">{localConversationCount}</div>
          </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <div className="text-xs text-slate-500">云端会话</div>
                    <div className="mt-1 text-xl font-semibold text-slate-900">{cloudConversationCount === null ? '--' : cloudConversationCount}</div>
              </div>
              </div>
          </div>
              {onOpenEditProfile ? (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => onOpenEditProfile()}
                    className="w-full max-w-md rounded-xl border border-slate-200 bg-white py-3 text-center text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
                  >
                    编辑资料
                  </button>
                </div>
              ) : null}
            </div>

            <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-12">
              <aside className="xl:col-span-3">
                <div className="h-full rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="px-3 pb-3">
                    <div className="text-sm font-semibold text-slate-900">设置导航</div>
              </div>
                  <nav className="space-y-2">
                    {SETTINGS_SECTIONS.map((section) => {
                      const isActive = activeSection === section.id;
                      return (
          <button
                          key={section.id}
                          type="button"
                          onClick={() => setActiveSection(section.id)}
                          className={`block w-full rounded-2xl px-4 py-3 text-left transition-all ${
                            isActive
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="text-sm font-medium">{section.label}</div>
                          <div className={`mt-1 text-xs ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>{section.description}</div>
              </button>
                      );
                    })}
                  </nav>
            </div>
              </aside>

              <div className="min-h-0 xl:col-span-9 xl:overflow-auto">
                <div className="mb-4 rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Current Section</div>
                  <div className="mt-2 flex items-end justify-between gap-4">
              <div>
                      <h3 className="text-2xl font-semibold text-slate-900">
                        {SETTINGS_SECTIONS.find((section) => section.id === activeSection)?.label}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {SETTINGS_SECTIONS.find((section) => section.id === activeSection)?.description}
            </p>
          </div>
        </div>
              </div>
                {renderDesktopSection()}
            </div>
              </div>
                </div>
                
          <div className="space-y-6 xl:hidden overflow-y-auto overscroll-y-contain touch-pan-y h-full min-h-0 pr-1 pb-24">
            {!isMobileSectionOpen ? (
              <>
                <section className="rounded-[30px] border border-slate-200 bg-gradient-to-b from-[#dfe4ff] to-[#eef1ff] p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white/70 bg-white shadow-sm flex items-center justify-center">
                        {mobileProfileAvatar ? (
                          <img src={mobileProfileAvatar} alt={mobileProfileName} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-7 h-7 text-slate-500" />
                        )}
                  </div>
                      <div className="min-w-0">
                        <div className="text-[22px] leading-6 font-semibold text-slate-900 truncate">{mobileProfileName}</div>
                        <div className="mt-1 text-xs text-slate-500">GOGO ID: {cloudAuthUserId ? cloudAuthUserId.slice(0, 8) : 'local-user'}</div>
                        <div className="mt-1 text-[11px] text-slate-600">Badge {selectedBadge}</div>
                  </div>
                </div>
                  </div>
                  <div className="mt-4 rounded-2xl bg-white/90 border border-white p-3 grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{localConversationCount}</div>
                      <div className="text-[11px] text-slate-500">Local</div>
                  </div>
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{cloudConversationCount === null ? '--' : cloudConversationCount}</div>
                      <div className="text-[11px] text-slate-500">Cloud</div>
                </div>
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{apiPresets.length}</div>
                      <div className="text-[11px] text-slate-500">Presets</div>
              </div>
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{modelName ? 'ON' : '--'}</div>
                      <div className="text-[11px] text-slate-500">Model</div>
            </div>
            </div>
                </section>

                {onOpenEditProfile ? (
                  <button
                    type="button"
                    onClick={() => onOpenEditProfile()}
                    className="w-full py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm font-medium shadow-sm"
                  >
                    编辑资料
                  </button>
                ) : null}

                <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="divide-y divide-slate-100">
                    <button type="button" onClick={() => { setActiveSection('api-config'); setIsMobileSectionOpen(true); }} className="w-full py-3 px-2 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm font-medium text-slate-800"><Database className="w-4 h-4 text-blue-500" /> API 配置</div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                    <button type="button" onClick={() => { setActiveSection('appearance'); setIsMobileSectionOpen(true); }} className="w-full py-3 px-2 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm font-medium text-slate-800"><Palette className="w-4 h-4 text-violet-500" /> 外观与资料</div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                    <button type="button" onClick={() => { setActiveSection('cloud-sync'); setIsMobileSectionOpen(true); }} className="w-full py-3 px-2 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm font-medium text-slate-800"><Cloud className="w-4 h-4 text-emerald-500" /> 云同步</div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                    <button type="button" onClick={() => { setActiveSection('storage'); setIsMobileSectionOpen(true); }} className="w-full py-3 px-2 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm font-medium text-slate-800"><HardDrive className="w-4 h-4 text-amber-500" /> 存储管理</div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                    <button type="button" onClick={() => { setActiveSection('backup'); setIsMobileSectionOpen(true); }} className="w-full py-3 px-2 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm font-medium text-slate-800"><Shield className="w-4 h-4 text-cyan-500" /> 数据备份</div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
                </section>
                </>
              ) : (
              <div className="space-y-4 pb-10 min-h-max">
                <div className="px-1">
                  <div className="text-[15px] font-semibold text-slate-900">
                    {SETTINGS_SECTIONS.find((section) => section.id === activeSection)?.label}
            </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {SETTINGS_SECTIONS.find((section) => section.id === activeSection)?.description}
              </div>
            </div>
                {renderMobileSection()}
          </div>
            )}
          </div>
        </div>
      </div>
      {/* API预设管理弹窗（主聊天/生图共用） */}
      <APIPresetsModal
        isOpen={showApiPresetsModal}
        onClose={() => {
          setShowApiPresetsModal(false);
          void apiPresetsManager.hydrateFromDisk().then(() => {
            setApiPresets(apiPresetsManager.getPresets());
          });
        }}
        onSelectPreset={handleApplyApiPreset}
      />

    </div>
  );
}
