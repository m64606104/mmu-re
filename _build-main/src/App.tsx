import { useState, useCallback, useEffect, useRef } from 'react';
import { Screen, Conversation, ApiConfig, UserProfile, MomentPost, Message, ThemeSettings, ShopType } from './types';
import type { CharacterSettings } from './types';
import MessageNotification, { showMessageNotification } from './components/MessageNotification';
import { renderScreen } from './navigation/renderScreen';
import { getDefaultScreenForApp, isAppPageValue } from './navigation/appEntry';
import type { AppPage } from './navigation/appEntry';
import { buildRouteHash, normalizeNavigationTarget, supportsConversationContext } from './navigation/navigationPolicy';
import { RuntimeServices } from './services/RuntimeServices';
import {
  load,
  save,
  initializeCache,
  cleanupLegacyLargeLocalStorage,
  isBulkStorageRestoreInProgress,
} from './domains/storage';
import {
  backgroundGenerationService,
  bindLiveConversations,
  bindDetachedGroupGenerationDeps,
} from './domains/generation';
import { initializeLetters, initializeLetterTimers } from './domains/letters';
import { isCloudSyncEnabled } from './services/supabaseClient';
import { markCloudSyncSuccess } from './services/supabaseClient';
import {
  supabaseLoadConversations,
  supabaseLoadMessages,
  supabaseUpsertConversation,
  supabaseAppendMessages,
  supabaseDeleteConversation,
  supabaseSyncDerivedMemory,
} from './services/supabaseData';
import { smartLoad, smartSave } from './utils/storage';
import { initializeRelationshipStorage } from './utils/aiRelationships';
import { initializeWalletStorage } from './utils/wallet';
import { initializeUserSystemStorage } from './utils/userSystem';
import { initializePenPalShareStorage } from './utils/penPalShareSystem';
import { initializeMemeStorage } from './utils/memeSystem';
import { initializeBottleStorage } from './utils/bottleFishingSystem';
import { initializeLetterNotificationStorage } from './utils/letterNotificationSystem';
import { initializeWorldbookCategories } from './utils/worldbookCategories';
import { initializeWorldbookStorage } from './utils/worldbookStorage';
import { initializeAchievementStorage } from './utils/achievementSystem';
import { initializeLetterNicknameStorage } from './utils/letterNicknameManager';
import { initializeProactiveMessagingStorage } from './utils/proactiveMessaging';
import { initializeStampStorage } from './utils/stampSystem';
import { initializeLetterMemoryStorage } from './utils/letterMemorySystem';
import { initializeOfficialAccountsStorage } from './utils/officialAccounts';
import { analyzeAvatarWithVisionModel, shouldReanalyzeAvatar } from './utils/avatarVision';
import {
  trimConversationMessagesForCache,
} from './services/conversationCache';
import { Letter } from './types/letter';
import { generateInitialOnlineHandle } from './utils/bootstrapOnlineHandle';
import { stashSettingsOpenIntent } from './utils/settingsNavigationIntent';
import { buildPresetConversation, maybeApplyConversationPresetUiMigration } from './utils/conversationPresetNormalize';
import { GlobalQuickBackupFab } from './components/GlobalQuickBackupFab';
import { importCharacterStickerBundle } from './utils/characterMigrationStickers';
import { Toaster } from 'sonner';
import {
  formatChatMessagePreviewForNotification,
  sendChatNotification,
  sendGroupChatNotification,
  shouldSendNotification,
} from './utils/notificationService';
import { getSafeAvatar } from './utils/avatarHelper';
import { getCharacterRealName } from './utils/characterIdentity';

function resolveGroupAssistantSenderLabel(message: Message, allConversations: Conversation[]): string {
  const withSender = message as Message & { senderId?: string; senderName?: string };
  if (withSender.senderName?.trim()) return withSender.senderName.trim();
  const sid = withSender.senderId;
  if (!sid) return '群友';
  const mem = allConversations.find((c) => c.id === sid);
  return getCharacterRealName(mem?.characterSettings) || mem?.name || '群友';
}

function safeLoadFromLocalStorage<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key);
  if (!saved) return fallback;

  try {
    return JSON.parse(saved) as T;
  } catch (error) {
    console.warn(`Failed to parse localStorage key "${key}", using fallback value.`, error);
    return fallback;
  }
}

function isScreenValue(value: string): value is Screen {
  return SCREEN_VALUES.has(value as Screen);
}

const SCREEN_VALUES = new Set<Screen>([
  'home', 'settings', 'social', 'chat', 'character-settings', 'new-conversation',
  'profile', 'moments', 'contacts', 'add-friend', 'create-group', 'theme', 'guide',
  'relationships', 'announcement', 'wallet', 'shopping', 'user-system', 'order-history',
  'database', 'letterbox', 'letter-writing', 'pen-pals', 'archived-letters', 'achievements',
  'favorite-letters', 'stamp-collection', 'letter-notifications', 'letter-home', 'letter-timeline',
  'letter-cards', 'bottle-fishing', 'recycle-bin', 'favorite-replies', 'unreplied', 'huaduoduo', 'huaduoduo-gogo',
  'kindergarten', 'worldbook', 'easy-chat', 'sticker-management', 'focus-habit',
]);

function parseRouteHash(hash: string): { app?: AppPage; screen?: Screen; conversationId?: string } | null {
  if (!hash.startsWith('#/app')) return null;
  const query = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  const params = new URLSearchParams(query);
  const appRaw = params.get('app');
  const screenRaw = params.get('screen');
  const cid = params.get('cid');

  const app = appRaw && isAppPageValue(appRaw) ? appRaw : undefined;
  const screen = screenRaw && isScreenValue(screenRaw) ? screenRaw : undefined;

  return {
    app,
    screen,
    conversationId: cid || undefined,
  };
}

function buildMessageCountSnapshot(conversations: Conversation[]): Record<string, number> {
  return conversations.reduce<Record<string, number>>((acc, conv) => {
    acc[conv.id] = conv.messages?.length ?? 0;
    return acc;
  }, {});
}

function buildPersistableConversations(
  conversations: Conversation[],
  cloudEnabled: boolean,
  syncedMessageCount: Record<string, number>
): Conversation[] {
  if (!cloudEnabled) return conversations;
  return conversations.map((conv) => {
    const currentCount = conv.messages?.length ?? 0;
    const syncedCount = syncedMessageCount[conv.id] ?? 0;
    const fullySynced = syncedCount >= currentCount;
    return fullySynced ? trimConversationMessagesForCache(conv) : conv;
  });
}

function App() {
  const routeSyncRef = useRef(false);
  const navigationStackRef = useRef<Array<{ screen: Screen; conversationId: string | null }>>([]);
  const cloudSyncMessageCountRef = useRef<Record<string, number>>({});
  const avatarVisionInFlightRef = useRef<Set<string>>(new Set());
  /** 解析失败后的退避截止时间（按会话）；成功或 API 指纹变化时清除 */
  const avatarVisionFailUntilRef = useRef<Map<string, number>>(new Map());
  const avatarVisionApiFingerprintRef = useRef<string>('');
  /** 必须为 true 后才允许防抖写入 conversations：否则首屏占位会话会在 hydrate 完成前覆盖 IndexedDB 真数据 */
  const conversationsHydrationCompleteRef = useRef(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [apiConfig, setApiConfig] = useState<ApiConfig>(() => {
    return safeLoadFromLocalStorage('apiConfig', {
      baseUrl: '',
      apiKey: '',
      modelName: '',
      visionModelName: '',
      visionBaseUrl: '',
      visionApiKey: '',
      privateAiImageGeneration: {
        enabled: false,
        baseUrl: '',
        apiKey: '',
        model: '',
        dailyMaxPerConversation: 8,
        size: '1024x1024',
      },
    });
  });
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    return safeLoadFromLocalStorage('userProfile', { username: '123', bio: '分享生活，记录美好', status: '在线' });
  });
  const [moments, setMoments] = useState<MomentPost[]>([]);
  const [showSimDebug, setShowSimDebug] = useState<boolean>(() => {
    try {
      return new URLSearchParams(window.location.search).get('simDebug') === '1';
    } catch {
      return false;
    }
  });
  const [SimDebugPanel, setSimDebugPanel] = useState<any>(null);
  const [theme, setTheme] = useState<ThemeSettings>(() => {
    return safeLoadFromLocalStorage('theme', { wallpaper: 'gradient-5' });
  });
  const [currentShopType, setCurrentShopType] = useState<ShopType>('food');
  const [replyToLetter, setReplyToLetter] = useState<Letter | null>(null);
  
  // 全屏模式状态
  const [fullscreenMode, setFullscreenMode] = useState<boolean>(() => {
    return safeLoadFromLocalStorage('fullscreenMode', false);
  });

  // 控制台：标记 chat/completions 请求来源（不影响用户端UI）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // 避免重复 patch
    // @ts-ignore
    if ((window as any).__momoyu_fetch_patched__) return;
    // @ts-ignore
    (window as any).__momoyu_fetch_patched__ = true;

    const rawFetch = window.fetch.bind(window) as unknown as (
      input: RequestInfo | URL,
      init?: RequestInit
    ) => Promise<Response>;
    const failureWindowMs = 10 * 60 * 1000;
    const fuseTripCount = 3;
    const fuseCooldownMs = 30 * 60 * 1000;
    const failureHistory = new Map<string, number[]>();
    const fuseUntil = new Map<string, number>();
    const fuseBlockLogLast = new Map<string, number>();

    const readSourceHeader = (init?: RequestInit): string => {
      const h = init?.headers as any;
      if (!h) return '';
      try {
        if (typeof Headers !== 'undefined' && h instanceof Headers) {
          return String(h.get('X-Momoyu-Source') || '');
        }
      } catch {
        // ignore
      }
      // object literal case
      const key = Object.keys(h).find((k) => k.toLowerCase() === 'x-momoyu-source');
      return key ? String(h[key] || '') : '';
    };

    const noteFailure = (source: string) => {
      const now = Date.now();
      const s = source || 'unknown';
      const arr = failureHistory.get(s) || [];
      const next = [...arr, now].filter((t) => now - t <= failureWindowMs);
      failureHistory.set(s, next);
      if (next.length >= fuseTripCount) {
        fuseUntil.set(s, now + fuseCooldownMs);
      }
    };

    /** 模型名/Key 等配置问题不应触发熔断，否则会误伤头像视觉、记忆等其它来源 */
    const serverErrorShouldTripFuse = async (res: Response): Promise<boolean> => {
      if (res.status < 500) return false;
      try {
        const t = await res.clone().text();
        if (
          /"code"\s*:\s*"model_not_found"|model_not_found|"code"\s*:\s*"invalid_model"|invalid_model|无可用渠道|incorrect api key|invalid_api_key|authentication_error|insufficient_quota|user_not_found|billing_not_active/i.test(
            t
          )
        ) {
          return false;
        }
      } catch {
        /* ignore */
      }
      return true;
    };

    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const url = typeof input === 'string' ? input : (input as any)?.url;
        const isChat =
          typeof url === 'string' &&
          (url.includes('/v1/chat/completions') || url.includes('/chat/completions'));
        if (!isChat) {
          return await rawFetch(input, init);
        }

        const explicitSource = readSourceHeader(init);
        const stack = new Error().stack || '';
        const guessSource = () => {
          if (explicitSource) return explicitSource;
          const s = stack.toLowerCase();
          if (s.includes('proactivemessaging')) return 'proactiveMessaging';
          if (s.includes('pendingreplyservice')) return 'pendingReplyService';
          if (s.includes('groupchatservice')) return 'groupChatService';
          if (s.includes('rungroupmemorysummaryifdue') || s.includes('groupmemorysummary'))
            return 'groupMemorySummary';
          if (s.includes('avatarvision')) return 'avatarVision';
          if (s.includes('avatchangedecision') || s.includes('avatarchangedecision')) return 'avatarChangeDecision';
          if (s.includes('lifeengine')) return 'lifeEngine';
          if (s.includes('memorysystem')) return 'memorySystem';
          if (s.includes('chatscreen')) return 'chatScreen';
          return 'unknown';
        };

        const src = guessSource();
        const until = fuseUntil.get(src) || 0;
        if (until > Date.now()) {
          const logKey = `${src}|${url}`;
          const lastLog = fuseBlockLogLast.get(logKey) || 0;
          if (Date.now() - lastLog > 30_000) {
            fuseBlockLogLast.set(logKey, Date.now());
            console.warn(
              `🧯 [chat/completions] blocked by fuse from=${src} until=${new Date(until).toLocaleTimeString()}`,
              url
            );
          }
          return new Response('', { status: 599, statusText: 'Blocked by momoyu fuse' });
        }

        const res = await rawFetch(input, init);
        if (res.ok) {
          // 成功后清零：避免短暂 503 连击后即便服务恢复仍计满熔断；也能尽快解除待解除的失败计数
          failureHistory.delete(src);
          fuseUntil.delete(src);
        } else {
          // 只在失败时打点，避免刷屏
          console.warn(`🧭 [chat/completions] ${res.status} from=${src}`, url);
          // 599 为本端熔断占位响应，不计入上游失败次数
          if (res.status >= 500 && res.status !== 599 && (await serverErrorShouldTripFuse(res))) {
            noteFailure(src);
          }
        }
        return res;
      } catch (e) {
        return await rawFetch(input, init);
      }
    }) as typeof window.fetch;
  }, []);

  // 桌面布局重置函数
  const resetDesktopLayout = useCallback(() => {
    const defaultAppLayout = ['settings', 'social', 'huaduoduo', 'easy-chat', 'kindergarten', 'theme', 'worldbook', 'music', 'phone', 'bell', 'mail', 'database'];
    const defaultQuickLayout = ['announcement', 'social', 'oop', 'settings'];
    const defaultDockLayout = ['phone', 'social', 'music', 'settings'];
    
    localStorage.setItem('appLayout', JSON.stringify(defaultAppLayout));
    localStorage.setItem('quickLayout', JSON.stringify(defaultQuickLayout));
    localStorage.setItem('dockLayout', JSON.stringify(defaultDockLayout));
    
    // 触发页面刷新以应用新布局
    window.location.reload();
  }, []);

  // 初始化存储系统和对话数据
  useEffect(() => {
    const loadData = async () => {
      try {
      // 🧠 先初始化缓存系统（从 IndexedDB 预载热点键到内存，见 utils/storage.ts）
      await initializeCache();

      // 将误留在 localStorage 的大键迁出：内部顺序为 save→读回校验→再删 LS，不会「先删后写」；失败则保留 LS。
      try {
        const lsCleanup = await cleanupLegacyLargeLocalStorage();
        if (lsCleanup.removedKeys.length > 0) {
          console.log('📦 启动时已从 localStorage 迁出大键:', lsCleanup.removedKeys);
        }
      } catch (e) {
        console.warn('⚠️ localStorage 大键迁出未完成（已跳过，不影响启动）:', e);
      }

      // ✅ 预热：把“增长型数据”统一从 IndexedDB 载入内存缓存（避免业务代码再碰 localStorage）
      await Promise.allSettled([
        initializeWalletStorage(),
        initializeUserSystemStorage(),
        initializePenPalShareStorage(),
        initializeMemeStorage(),
        initializeBottleStorage(),
        initializeLetterNotificationStorage(),
        initializeWorldbookCategories(),
        initializeWorldbookStorage(),
        initializeAchievementStorage(),
        initializeLetterNicknameStorage(),
        initializeProactiveMessagingStorage(),
        initializeStampStorage(),
        initializeLetterMemoryStorage(),
        initializeOfficialAccountsStorage(),
      ]);
      
      // 🧠 初始化记忆系统
      try {
        const { initializeMemorySystem } = await import('./utils/memorySystem');
        await initializeMemorySystem();
      } catch (error) {
        console.error('❌ 记忆系统初始化失败:', error);
      }
      
      try {
        const savedMoments = await smartLoad('moments');
        setMoments(Array.isArray(savedMoments) ? savedMoments : []);
      } catch (error) {
        console.error('❌ 朋友圈数据初始化失败:', error);
        setMoments([]);
      }

      try {
        await initializeRelationshipStorage();
      } catch (error) {
        console.error('❌ 关系数据初始化失败:', error);
      }

      // 从云端优先加载（若已配置 Supabase），否则走本地存储
      const cloudEnabled = isCloudSyncEnabled();
      let loadedConversations: Conversation[] = [];
      if (cloudEnabled) {
        try {
          const cloudConversations = await supabaseLoadConversations();
          if (cloudConversations.length > 0) {
            const hydrated = await Promise.all(
              cloudConversations.map(async (conv) => ({
                ...conv,
                messages: await supabaseLoadMessages(conv.id, 300),
              }))
            );
            const normalizedHydrated = maybeApplyConversationPresetUiMigration(hydrated);
            loadedConversations = normalizedHydrated;
            setConversations(normalizedHydrated);
            cloudSyncMessageCountRef.current = buildMessageCountSnapshot(normalizedHydrated);
            await save('conversations', normalizedHydrated);
            markCloudSyncSuccess();
          }
        } catch (error) {
          console.warn('⚠️ Supabase加载失败，回退本地存储:', error);
        }
      }

      if (loadedConversations.length === 0) {
        const saved = await load('conversations');
        if (saved) {
          loadedConversations = maybeApplyConversationPresetUiMigration(saved);
          setConversations(loadedConversations);
          if (cloudEnabled) {
            // 首次迁移：将本地历史同步到云端（幂等）
            for (const conv of loadedConversations) {
              try {
                await supabaseUpsertConversation(conv);
                await supabaseAppendMessages(conv.id, conv.messages || []);
                await supabaseSyncDerivedMemory(
                  conv.id,
                  conv.name,
                  conv.characterSettings as CharacterSettings | undefined,
                  conv.messages || [],
                  conv.messages || [],
                  apiConfig
                );
                cloudSyncMessageCountRef.current[conv.id] = conv.messages?.length ?? 0;
                markCloudSyncSuccess();
              } catch (e) {
                console.warn(`⚠️ 会话 ${conv.id} 迁移到Supabase失败:`, e);
              }
            }
          }
        } else {
          // 添加预设联系人
          const presetContacts: Conversation[] = [
            buildPresetConversation('aa'),
            buildPresetConversation('worker'),
            buildPresetConversation('oo1'),
          ];
          const normalizedPresetContacts = maybeApplyConversationPresetUiMigration(presetContacts);
          loadedConversations = normalizedPresetContacts;
          setConversations(normalizedPresetContacts);
          cloudSyncMessageCountRef.current = buildMessageCountSnapshot(normalizedPresetContacts);
        }
      }

      conversationsHydrationCompleteRef.current = true;

      try {
        const { pruneOrphanMemoryBanks } = await import('./utils/memorySystem');
        const n = await pruneOrphanMemoryBanks(loadedConversations.map((c) => c.id));
        if (n > 0) {
          console.log(`🧹 已清理 ${n} 条会话已删除仍留在记忆库中的残留（chat_memory_banks）`);
        }
      } catch (e) {
        console.warn('⚠️ 记忆库残留清理跳过:', e);
      }

      // 📮 自动合并匿名信件
      try {
        const { mergeAnonymousLetters } = await import('./utils/anonymousLetterMerger');
        const mergeResult = mergeAnonymousLetters(true); // true表示自动运行
        if (mergeResult.merged > 0) {
          console.log(`📬 自动合并了${mergeResult.merged}封匿名信件`);
          mergeResult.details.forEach(detail => {
            console.log(`  - ${detail.receiverName}: ${detail.count}封信件合并`);
          });
        }
      } catch (error) {
        console.error('❌ 匿名信件合并失败:', error);
      }

      // 已移除：AI财务系统（批量激活/自动收入/自动支出）
      // 其他升级/修复任务仍会在应用启动后正常运行（在对应模块内部按需触发）。
      } catch (e) {
        console.error('❌ 启动数据加载异常（会话列表可能未就绪）:', e);
      } finally {
        if (!conversationsHydrationCompleteRef.current) {
          conversationsHydrationCompleteRef.current = true;
        }
      }
    };
    
    loadData();
  }, []);

  // simDebug 开关（仅用于验证后台生活引擎）
  useEffect(() => {
    const onPop = () => {
      try {
        setShowSimDebug(new URLSearchParams(window.location.search).get('simDebug') === '1');
      } catch {
        setShowSimDebug(false);
      }
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
    };
  }, []);

  useEffect(() => {
    if (!showSimDebug) return;
    import('./sim/SimDebugPanel')
      .then((m) => setSimDebugPanel(() => m.default))
      .catch(() => {});
  }, [showSimDebug]);

  // ✅ AI生活模拟（后台逻辑，不展示给用户）
  const lifeSimBootedRef = useRef(false);
  const lifeSimConversationsRef = useRef<Conversation[]>([]);
  const lifeSimApiConfigRef = useRef<ApiConfig>(apiConfig);
  useEffect(() => { lifeSimConversationsRef.current = conversations; }, [conversations]);
  useEffect(() => { lifeSimApiConfigRef.current = apiConfig; }, [apiConfig]);
  useEffect(() => {
    if (lifeSimBootedRef.current) return;
    // 没有会话也不用启动
    if (!conversations || conversations.length === 0) return;
    lifeSimBootedRef.current = true;
    import('./sim/bootstrap')
      .then(({ startLifeSimBootstrap }) => {
        startLifeSimBootstrap({
          getConversations: () => lifeSimConversationsRef.current,
          getApiConfig: () => lifeSimApiConfigRef.current,
        });
      })
      .catch((e) => console.error('❌ life sim bootstrap failed:', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations.length]);

  // 🚀 注册后台生成服务的消息更新回调
  useEffect(() => {
    // 为每个对话注册消息更新回调
    conversations.forEach(conv => {
      backgroundGenerationService.registerMessageUpdateCallback(
        conv.id,
        (conversationId: string, newMessages: Message[]) => {
          updateConversationRef.current(conversationId, {
            messages: newMessages,
            lastMessageTime: Date.now(),
          });
        }
      );
    });

    // 清理：组件卸载时注销所有回调
    return () => {
      conversations.forEach(conv => {
        backgroundGenerationService.unregisterMessageUpdateCallback(conv.id);
      });
    };
  }, [conversations.map(c => c.id).join(',')]);

  // 保存数据到智能存储
  useEffect(() => {
    // 🚀 防抖后写入 IndexedDB（会话等大数据不经 localStorage）
    const timeoutId = setTimeout(async () => {
      if (!conversationsHydrationCompleteRef.current) return;
      if (isBulkStorageRestoreInProgress()) return;
      if (conversations.length > 0) {
        if (isCloudSyncEnabled()) {
          // 异步同步到云端：先会话，再做消息增量同步
          for (const conv of conversations) {
            try {
              await supabaseUpsertConversation(conv);
              const currentCount = conv.messages?.length ?? 0;
              const lastSyncedCount = cloudSyncMessageCountRef.current[conv.id] ?? 0;
              if (currentCount > lastSyncedCount) {
                const deltaMessages = (conv.messages || []).slice(lastSyncedCount);
                await supabaseAppendMessages(conv.id, deltaMessages);
                await supabaseSyncDerivedMemory(
                  conv.id,
                  conv.name,
                  conv.characterSettings as CharacterSettings | undefined,
                  conv.messages || [],
                  deltaMessages,
                  apiConfig
                );
                cloudSyncMessageCountRef.current[conv.id] = currentCount;
                markCloudSyncSuccess();
              } else if (currentCount < lastSyncedCount) {
                // 消息被删/重置时，退回全量幂等 upsert，避免云端游标失真
                await supabaseAppendMessages(conv.id, conv.messages || []);
                await supabaseSyncDerivedMemory(
                  conv.id,
                  conv.name,
                  conv.characterSettings as CharacterSettings | undefined,
                  conv.messages || [],
                  conv.messages || [],
                  apiConfig
                );
                cloudSyncMessageCountRef.current[conv.id] = currentCount;
                markCloudSyncSuccess();
              }
            } catch (error) {
              console.warn(`⚠️ 会话 ${conv.id} 同步Supabase失败:`, error);
            }
          }
        }
        const persistableConversations = buildPersistableConversations(
          conversations,
          isCloudSyncEnabled(),
          cloudSyncMessageCountRef.current
        );
        try {
          await save('conversations', persistableConversations);
        } catch (e) {
          console.error('❌ 会话落盘失败（已跳过本次写入，IndexedDB 仍保留上次成功数据）:', e);
        }
      }
    }, 300); // 300ms防抖，合并连续的更新
    
    return () => clearTimeout(timeoutId);
  }, [conversations, apiConfig]);

  useEffect(() => {
    localStorage.setItem('apiConfig', JSON.stringify(apiConfig));
  }, [apiConfig]);

  useEffect(() => {
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
  }, [userProfile]);

  // 已移除：AI财务系统（定时自动收入/自动支出）

  // 📬 初始化慢邮件系统（数据加载 + 定时器）
  useEffect(() => {
    const initLetters = async () => {
      // 1. 先加载数据到内存（类似conversations的加载方式）
      await initializeLetters();
      // 2. 再初始化定时器
      initializeLetterTimers();
      // 3. 初始化调试工具（所有环境都可用，方便调试）
      const { initLetterDebugTools } = await import('./utils/letterDebugTools');
      initLetterDebugTools();
    };
    initLetters();
  }, []);

  useEffect(() => {
    // 🚀 性能优化：朋友圈数据也使用防抖保存
    const timeoutId = setTimeout(() => {
      if (isBulkStorageRestoreInProgress()) return;
      void smartSave('moments', moments);
    }, 500); // 500ms防抖，朋友圈更新频率较低
    
    return () => clearTimeout(timeoutId);
  }, [moments]);

  // 🤖 头像视觉：仅在「缺解析或与当前头像 URL 不一致」时补跑；与设置里视觉线路一致；失败退避 + 全局限流
  useEffect(() => {
    if (!apiConfig.baseUrl || !apiConfig.apiKey || !apiConfig.modelName) return;

    const fp = [
      apiConfig.baseUrl,
      apiConfig.apiKey,
      apiConfig.modelName,
      apiConfig.visionModelName || '',
      apiConfig.visionBaseUrl || '',
      apiConfig.visionApiKey || '',
    ].join('\u0001');
    if (fp !== avatarVisionApiFingerprintRef.current) {
      avatarVisionApiFingerprintRef.current = fp;
      avatarVisionFailUntilRef.current.clear();
    }

    const now = Date.now();

    const candidates = conversations.filter((conv) => {
      if (conv.type !== 'private') return false;
      const avatarUrl = conv.characterSettings?.avatar || conv.avatar;
      if (!avatarUrl) return false;
      if (!shouldReanalyzeAvatar(avatarUrl, conv.characterSettings)) return false;
      if (avatarVisionInFlightRef.current.has(conv.id)) return false;
      const failUntil = avatarVisionFailUntilRef.current.get(conv.id) || 0;
      if (failUntil > now) return false;
      return true;
    });
    if (candidates.length === 0) return;

    const conv = candidates[0];
    avatarVisionInFlightRef.current.add(conv.id);
    void (async () => {
      try {
        const avatarUrl = conv.characterSettings?.avatar || conv.avatar;
        if (!avatarUrl) return;
        const profile = await analyzeAvatarWithVisionModel(avatarUrl, apiConfig);
        if (!profile) {
          avatarVisionFailUntilRef.current.set(conv.id, Date.now() + 10 * 60 * 1000);
          return;
        }
        avatarVisionFailUntilRef.current.delete(conv.id);
        setConversations((prev) =>
          prev.map((item) => {
            if (item.id !== conv.id || !item.characterSettings) return item;
            return {
              ...item,
              characterSettings: {
                ...item.characterSettings,
                avatarVisionProfile: profile,
              },
            };
          })
        );
      } finally {
        avatarVisionInFlightRef.current.delete(conv.id);
      }
    })();
  }, [conversations, apiConfig]);

  // 处理页面切换
  const navigateTo = useCallback((screen: Screen, conversationId?: string, options?: { replace?: boolean }) => {
    const rawNextConversationId = supportsConversationContext(screen)
      ? (conversationId ?? currentConversationId)
      : null;
    const normalized = normalizeNavigationTarget(screen, rawNextConversationId);
    const targetScreen = normalized.screen;
    const nextConversationId = normalized.conversationId;

    // 如果用户进入聊天但未配置 API：带上说明跳转到设置页，并自动聚焦「API 配置」分区
    if (targetScreen === 'chat') {
      const ok = Boolean(
        apiConfig?.baseUrl?.trim() &&
          apiConfig?.apiKey?.trim() &&
          apiConfig?.modelName?.trim()
      );
      if (!ok) {
        stashSettingsOpenIntent({
          section: 'api-config',
          message:
            '要使用聊天功能，请在下方完成「API 配置」：填写 Base URL、API Key 和模型名称。保存后即可返回会话正常对话。',
        });
        setCurrentScreen('settings');
        setCurrentConversationId(null);
        return;
      }
    }

    const isSameTarget = currentScreen === targetScreen && currentConversationId === nextConversationId;
    if (!options?.replace && !isSameTarget) {
      navigationStackRef.current.push({
        screen: currentScreen,
        conversationId: currentConversationId,
      });
      if (navigationStackRef.current.length > 120) {
        navigationStackRef.current = navigationStackRef.current.slice(-120);
      }
    }

    // 切换到聊天页面时，清零未读消息
    if (targetScreen === 'chat' && nextConversationId) {
      setCurrentConversationId(nextConversationId);
      // 清零该对话的未读数
      setConversations(prev => prev.map(conv => 
        conv.id === nextConversationId 
          ? { ...conv, unreadCount: 0 } 
          : conv
      ));
    } else if (supportsConversationContext(targetScreen)) {
      setCurrentConversationId(nextConversationId);
    } else {
      setCurrentConversationId(null);
    }
    
    setCurrentScreen(targetScreen);
  }, [currentScreen, currentConversationId, apiConfig]);

  // 直接改地址栏 / 带聊天 hash 进入时可能绕过 navigateTo，这里再挡一层
  useEffect(() => {
    if (currentScreen !== 'chat' || !currentConversationId) return;
    const ok = Boolean(
      apiConfig?.baseUrl?.trim() && apiConfig?.apiKey?.trim() && apiConfig?.modelName?.trim()
    );
    if (ok) return;
    stashSettingsOpenIntent({
      section: 'api-config',
      message:
        '要使用聊天功能，请在下方完成「API 配置」：填写 Base URL、API Key 和模型名称。保存后即可返回会话正常对话。',
    });
    setCurrentScreen('settings');
    setCurrentConversationId(null);
  }, [currentScreen, currentConversationId, apiConfig]);

  // URL -> screen（支持每个 app 一个网页入口）
  useEffect(() => {
    const applyRouteFromHash = () => {
      const route = parseRouteHash(window.location.hash);
      if (!route) return;

      const parsedScreen = route.screen || (route.app ? getDefaultScreenForApp(route.app) : undefined);
      if (!parsedScreen) return;
      const normalized = normalizeNavigationTarget(parsedScreen, route.conversationId ?? null);
      const targetScreen = normalized.screen;

      navigationStackRef.current = [];
      setCurrentScreen(targetScreen);
      if (supportsConversationContext(targetScreen)) {
        setCurrentConversationId(normalized.conversationId);
      } else {
        setCurrentConversationId(null);
      }
    };

    applyRouteFromHash();

    const onHashChange = () => {
      if (routeSyncRef.current) {
        routeSyncRef.current = false;
        return;
      }
      applyRouteFromHash();
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // screen -> URL（保持地址和当前 app 页面一致）
  useEffect(() => {
    const nextHash = buildRouteHash(currentScreen, currentConversationId);
    if (window.location.hash !== nextHash) {
      routeSyncRef.current = true;
      window.location.hash = nextHash;
    }
  }, [currentScreen, currentConversationId]);

  // 返回主屏幕
  const goBack = useCallback(() => {
    const last = navigationStackRef.current.pop();
    if (last) {
      const normalized = normalizeNavigationTarget(last.screen, last.conversationId);
      setCurrentConversationId(normalized.conversationId);
      setCurrentScreen(normalized.screen);
      return;
    }
    setCurrentConversationId(null);
    setCurrentScreen('home');
  }, []);

  // 更新对话（含：后台生成完成时未读 + 应用内/系统消息提示）
  const updateConversation = useCallback(
    (id: string, updates: Partial<Conversation>) => {
      setConversations((prev) => {
        return prev.map((conv) => {
          if (conv.id !== id) {
            return conv;
          }

          if (updates.messages === undefined) {
            return { ...conv, ...updates };
          }

          const prevMsgs = conv.messages || [];
          const nextMsgs = updates.messages;
          const prevIds = new Set(prevMsgs.map((m) => m.id));
          const added = nextMsgs.filter((m) => !prevIds.has(m.id));

          const isViewingThisChat =
            currentScreen === 'chat' && currentConversationId === id;

          const isBlocked = Boolean(conv.isBlocked);
          const assistantAdded = added.filter(
            (m) => m.role === 'assistant' && !(m as Message & { isBlockedMessage?: boolean }).isBlockedMessage
          );

          let nextUnread = conv.unreadCount ?? 0;
          if (isViewingThisChat) {
            nextUnread = 0;
          } else if (!isBlocked && assistantAdded.length > 0) {
            nextUnread = nextUnread + assistantAdded.length;
          }

          if (!isViewingThisChat && !isBlocked && assistantAdded.length > 0) {
            const convSnapshot = conv;
            queueMicrotask(() => {
              try {
                showMessageNotification(id, assistantAdded);
                if (shouldSendNotification()) {
                  const last = assistantAdded[assistantAdded.length - 1];
                  const preview = formatChatMessagePreviewForNotification(last);
                  if (convSnapshot.type === 'private') {
                    const name =
                      convSnapshot.characterSettings?.nickname || convSnapshot.name;
                    sendChatNotification(
                      name,
                      preview,
                      getSafeAvatar(
                        convSnapshot.characterSettings?.avatar || convSnapshot.avatar
                      ),
                      id
                    );
                  } else if (convSnapshot.type === 'group') {
                    const senderName = resolveGroupAssistantSenderLabel(last, conversationsRef.current);
                    sendGroupChatNotification(convSnapshot.name, senderName, preview, id);
                  }
                }
              } catch (e) {
                console.warn('新消息通知失败（已忽略）:', e);
              }
            });
          }

          return {
            ...conv,
            ...updates,
            messages: nextMsgs,
            unreadCount: nextUnread,
            lastMessageTime: updates.lastMessageTime ?? Date.now(),
          };
        });
      });
    },
    [currentScreen, currentConversationId]
  );

  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;
  const apiConfigRef = useRef(apiConfig);
  apiConfigRef.current = apiConfig;
  const userProfileRef = useRef(userProfile);
  userProfileRef.current = userProfile;
  const updateConversationRef = useRef(updateConversation);
  updateConversationRef.current = updateConversation;

  bindLiveConversations(() => conversationsRef.current);
  bindDetachedGroupGenerationDeps({
    updateConversation: (id, u) => updateConversationRef.current(id, u),
    getApiConfig: () => apiConfigRef.current,
    getUserProfile: () => userProfileRef.current,
  });

  // 删除对话
  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== id));
    if (isCloudSyncEnabled()) {
      void supabaseDeleteConversation(id).catch((error) => {
        console.warn(`⚠️ 删除会话 ${id} 的云端数据失败:`, error);
      });
      delete cloudSyncMessageCountRef.current[id];
    }
    // 如果删除的是当前对话，返回到社交页面
    if (currentConversationId === id) {
      setCurrentConversationId(null);
      navigateTo('social');
    }
  }, [currentConversationId, navigateTo]);

  // 添加消息到指定对话（用于AI主动发消息）
  const addMessageToConversation = useCallback((conversationId: string, message: Message) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId) {
        // 只有当用户不在该对话的聊天页面时，才增加未读数
        const shouldIncreaseUnread = !(
          currentScreen === 'chat' && 
          currentConversationId === conversationId
        );
        
        // 🚫 如果被拉黑，标记消息
        const isBlocked = conv.isBlocked;
        const finalMessage = {
          ...message,
          isBlockedMessage: isBlocked
        };

        return {
          ...conv,
          messages: [...conv.messages, finalMessage],
          lastMessageTime: message.timestamp,
          // 如果被拉黑，不增加未读数
          unreadCount: (!isBlocked && shouldIncreaseUnread) ? conv.unreadCount + 1 : conv.unreadCount,
          // 如果被拉黑，不强制取消隐藏（保持原状态）；否则收到新消息恢复显示
          isHidden: isBlocked ? conv.isHidden : false
        };
      }
      return conv;
    }));
  }, [currentScreen, currentConversationId]);

  // 导入角色数据
  const handleImportCharacter = useCallback(async (data: any) => {
    try {
      console.log('🔄 开始导入角色数据...', data);
      
      // 生成新的对话ID
      const newConversationId = Date.now().toString();
      
      // 创建新对话，保持原有ID结构但使用新ID
      const newConversation: Conversation = {
        id: newConversationId,
        type: data.character?.type || 'private',
        name: data.character?.name || '未知角色',
        avatar: data.character?.avatar,
        lastMessageTime: data.character?.lastMessageTime || Date.now(),
        unreadCount: 0,
        messages: data.messages || [],
        characterSettings: data.character?.characterSettings,
        enabledFeatures: data.character?.enabledFeatures || ['memory-system'],
        // 保留群聊相关数据
        groupRemark: data.character?.groupRemark,
        members: data.character?.members,
        isMuted: data.character?.isMuted || false,
        // 保留AI状态信息
        aiStatus: data.character?.aiStatus,
        replySplitPreference: ['smart', 'single', 'split'].includes(data.character?.replySplitPreference)
          ? data.character.replySplitPreference
          : 'smart',
        ...(typeof data.character?.privateComposerQuietSeconds === 'number'
          ? { privateComposerQuietSeconds: data.character.privateComposerQuietSeconds }
          : {}),
      };
      
      console.log('✅ 创建新对话:', newConversation);
      
      // 🧠 导入记忆库数据（完整MemoryBank）
      if (data.memoryBank && data.memoryBank.memories) {
        console.log('🧠 导入记忆库数据...');
        const allMemoryBanks = ((await smartLoad('chat_memory_banks')) as any[]) || [];
        
        // 创建新的记忆库
        const newMemoryBank = {
          ...data.memoryBank,
          conversationId: newConversationId, // 使用新的对话ID
          updatedAt: Date.now(),
        };
        
        allMemoryBanks.push(newMemoryBank);
        await smartSave('chat_memory_banks', allMemoryBanks);
        console.log('✅ 记忆库导入成功，记忆条数:', newMemoryBank.memories?.length || 0);
      }
      
      // 📸 导入朋友圈数据
      if (data.moments) {
        console.log('📸 导入朋友圈数据...');
        const momentsKey = `moments_${newConversationId}`;
        await smartSave(momentsKey, data.moments);
        console.log('✅ 朋友圈导入成功，朋友圈条数:', data.moments.posts?.length || 0);
      }
      
      // 💰 导入AI财务数据
      if (data.finance) {
        console.log('💰 导入AI财务数据...');
        const financeKey = `ai_finance_${newConversationId}`;
        await smartSave(financeKey, data.finance);
        console.log('✅ AI财务数据导入成功');
      }
      
      // 🔗 导入关系网络数据
      if (data.relationships && data.relationships.length > 0) {
        console.log('🔗 导入关系网络数据...');
        const allRelationships = ((await smartLoad('relationships')) as any[]) || [];
        
        // 更新关系中的ID引用
        const updatedRelationships = data.relationships.map((rel: any) => ({
          ...rel,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          personId: rel.personId === data.character?.id ? newConversationId : rel.personId,
          targetId: rel.targetId === data.character?.id ? newConversationId : rel.targetId,
          updatedAt: Date.now(),
        }));
        
        allRelationships.push(...updatedRelationships);
        await smartSave('relationships', allRelationships);
        console.log('✅ 关系网络导入成功，关系数量:', updatedRelationships.length);
      }
      
      // 📚 导入文档库数据
      if (data.documents && data.documents.length > 0) {
        console.log('📚 导入文档库数据...');
        const allDocuments = ((await smartLoad('document_library')) as any[]) || [];
        
        // 更新文档的关联ID
        const updatedDocuments = data.documents.map((doc: any) => ({
          ...doc,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          conversationId: newConversationId, // 关联到新对话
          uploadedAt: Date.now(),
        }));
        
        allDocuments.push(...updatedDocuments);
        await smartSave('document_library', allDocuments);
        console.log('✅ 文档库导入成功，文档数量:', updatedDocuments.length);
      }

      // 🧩 角色专属表情包（WeChatSimulator characterStickers + EasyChatDB）
      const stickerStats = await importCharacterStickerBundle(newConversationId, data.stickersMigration);
      if (stickerStats.wechatCount + stickerStats.easyChatCount > 0) {
        console.log(
          `✅ 表情包导入：主聊天库 ${stickerStats.wechatCount}、EasyChat ${stickerStats.easyChatCount}`
        );
      }
      
      // 添加对话到列表
      setConversations(prev => [...prev, newConversation]);
      console.log('✅ 对话添加成功');
      
      // 📊 统计导入信息
      const stickerWechat = data.stickersMigration?.wechatSimulatorCharacterStickers?.length ?? 0;
      const stickerEasy = data.stickersMigration?.easyChatCharacterStickers?.length ?? 0;

      const importStats = {
        character: data.character?.name || '未知角色',
        messages: data.messages?.length || 0,
        memories: data.memoryBank?.memories?.length || 0,
        moments: data.moments?.posts?.length || 0,
        knowledgeBase: data.character?.characterSettings?.knowledgeBase?.length || 0,
        documents: data.documents?.length || 0,
        relationships: data.relationships?.length || 0,
        hasFinance: !!data.finance,
        hasAIStatus: !!data.character?.aiStatus,
        version: data.version || '1.0',
        stickersWechatImported: stickerStats.wechatCount,
        stickersEasyImported: stickerStats.easyChatCount,
        stickersInFile: stickerWechat + stickerEasy,
      };
      
      // 显示详细导入结果
      const successMessage = `✅ 角色导入成功！\n\n` +
        `👤 角色：${importStats.character}\n` +
        `📄 数据版本：${importStats.version}\n\n` +
        `📊 导入内容：\n` +
        `• 角色设置：完整（含知识库条目标注在「知识库」计数）\n` +
        `• 知识库（设置内）：${importStats.knowledgeBase} 条\n` +
        `• 文档库：${importStats.documents} 份\n` +
        `• 记忆库：${importStats.memories} 条\n` +
        `• 朋友圈：${importStats.moments} 条\n` +
        `• 关系网络：${importStats.relationships} 个\n` +
        `• 表情包：主聊天库已写入 ${importStats.stickersWechatImported}、EasyChat ${importStats.stickersEasyImported}` +
        (importStats.stickersInFile > 0
          ? `（包内共 ${stickerWechat + stickerEasy} 条）\n`
          : '\n') +
        `• AI状态：${importStats.hasAIStatus ? '已恢复' : '无'}\n` +
        `• 财务数据：${importStats.hasFinance ? '已恢复' : '无'}\n` +
        `• 消息记录：${importStats.messages} 条\n\n` +
        `说明：v2.0 及更早包无独立表情段；全量站点备份请用设置中的「导出全部数据」。\n` +
        `🎉 数据已按当前包内容导入。`;
      
      alert(successMessage);
      
      // 导航到聊天界面（替换当前创建页，返回时直接回会话列表）
      navigateTo('chat', newConversationId, { replace: true });
    } catch (error) {
      console.error('❌ 导入失败:', error);
      alert(`❌ 导入失败\n\n错误信息：${error}\n\n请检查：\n1. 文件是否完整\n2. 文件格式是否正确\n3. 是否为最新版本导出的数据`);
    }
  }, [navigateTo]);

  // 更新主动消息的最后发送时间
  const updateProactiveMessagingTime = useCallback((conversationId: string, lastMessageTime: number) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId && conv.characterSettings) {
        return {
          ...conv,
          characterSettings: {
            ...conv.characterSettings,
            proactiveMessaging: {
              ...conv.characterSettings.proactiveMessaging!,
              lastMessageTime
            }
          }
        };
      }
      return conv;
    }));
  }, []);

  // 更新用户资料
  const updateUserProfile = useCallback((profile: UserProfile) => {
    setUserProfile(profile);
  }, []);

  // 从群聊导航到与AI的私聊
  const handleNavigateToPrivateChat = useCallback((aiName: string) => {
    // 查找是否已经存在与该AI的私聊
    const existingPrivateChat = conversations.find(conv => 
      conv.type === 'private' && conv.name === aiName
    );

    if (existingPrivateChat) {
      // 如果已存在私聊，直接导航到该对话
      navigateTo('chat', existingPrivateChat.id);
    } else {
      // 如果不存在，创建新的私聊对话
      const newConversation: Conversation = {
        id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: aiName,
        type: 'private',
        messages: [],
        lastMessageTime: Date.now(),
        unreadCount: 0,
        replySplitPreference: 'smart',
      };

      // 添加到对话列表并导航到新对话
      setConversations(prev => [...prev, newConversation]);
      navigateTo('chat', newConversation.id);
    }
  }, [conversations, navigateTo]);

  // 更新主题
  const updateTheme = useCallback((newTheme: ThemeSettings) => {
    setTheme(newTheme);
    localStorage.setItem('theme', JSON.stringify(newTheme));
  }, []);

  // 切换全屏模式
  const toggleFullscreenMode = useCallback((enabled: boolean) => {
    setFullscreenMode(enabled);
    localStorage.setItem('fullscreenMode', String(enabled));
  }, []);

  // 添加好友
  const addFriend = useCallback((friendData: {
    realName: string;
    nickname: string;
    avatar: string;
    systemPrompt: string;
    personality: string;
    languageStyle: string;
    languageExample: string;
    interactionMode?: 'companion' | 'tool';
  }) => {
    const newConversation: Conversation = {
      id: 'friend-' + Date.now(),
      type: 'private',
      name: friendData.nickname,
      avatar: friendData.avatar,
      messages: [
        {
          id: 'system-' + Date.now(),
          role: 'system',
          content: `你已成功添加好友 ${friendData.nickname}，可以开始聊天了`,
          timestamp: Date.now(),
        }
      ],
      characterSettings: {
        avatar: friendData.avatar,
        realName: friendData.realName,
        nickname: friendData.nickname,
        username: '',
        systemPrompt: friendData.systemPrompt,
        personality: friendData.personality,
        languageStyle: friendData.languageStyle,
        languageExample: friendData.languageExample,
        memoryEvents: '',
        disableWorldbook: true, // 新建角色默认关闭世界书
        interactionMode: friendData.interactionMode ?? 'companion',
        ...(friendData.interactionMode === 'tool'
          ? {
              proactiveMessaging: {
                enabled: false,
                minInterval: 30,
                maxInterval: 180,
                activeHourStart: 8,
                activeHourEnd: 23,
                autoIntervalByAI: true,
                relationAware: true,
                wakeSensitivityMode: 'auto' as const,
                sleepSimulationEnabled: false,
              },
            }
          : {
              proactiveMessaging: {
                enabled: false,
                minInterval: 30,
                maxInterval: 180,
                activeHourStart: 8,
                activeHourEnd: 23,
                autoIntervalByAI: true,
                relationAware: true,
                wakeSensitivityMode: 'auto' as const,
                sleepSimulationEnabled: true,
              },
            }),
      },
      enabledFeatures: ['memory-system'], // 默认启用记忆系统
      lastMessageTime: Date.now(),
      unreadCount: 0,
      replySplitPreference: 'smart',
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);

    if ((friendData.interactionMode ?? 'companion') !== 'tool') {
      void generateInitialOnlineHandle(newConversation, apiConfig).then((handle) => {
        if (!handle) return;
        setConversations((prev) =>
          prev.map((c) =>
            c.id === newConversation.id && c.characterSettings
              ? { ...c, characterSettings: { ...c.characterSettings, username: handle } }
              : c
          )
        );
      });
    }

    navigateTo('chat', newConversation.id, { replace: true });
  }, [navigateTo, apiConfig]);

  // 创建群聊
  const createGroup = useCallback((groupData: {
    groupName: string;
    groupRemark: string;
    groupAvatar: string;
    members: string[];
  }) => {
    // 生成系统提示消息
    const systemMessages: Message[] = [];
    
    // 为每个成员添加加入提示
    groupData.members.forEach(memberId => {
      const member = conversations.find(c => c.id === memberId);
      if (member) {
        const memberName = member.characterSettings?.nickname || member.name;
        systemMessages.push({
          id: `system-${memberId}-${Date.now()}`,
          role: 'system',
          content: `${memberName} 已加入群聊`,
          timestamp: Date.now() + systemMessages.length,
        });
      }
    });

    const newConversation: Conversation = {
      id: 'group-' + Date.now(),
      type: 'group',
      name: groupData.groupName,
      avatar: groupData.groupAvatar,
      groupRemark: groupData.groupRemark,
      members: groupData.members,
      messages: systemMessages,
      enabledFeatures: ['memory-system'], // 默认启用记忆系统
      lastMessageTime: Date.now(),
      unreadCount: 0,
      replySplitPreference: 'smart',
      groupIcebreakerPending: true,
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
    navigateTo('chat', newConversation.id, { replace: true });
  }, [conversations, navigateTo]);

  const handleAddPenPal = useCallback(
    (newConversation: Conversation) => {
      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversationId(newConversation.id);
      navigateTo('chat', newConversation.id, { replace: true });
    },
    [navigateTo]
  );

  const screenElement = renderScreen({
    currentScreen,
    currentConversationId,
    conversations,
    apiConfig,
    userProfile,
    moments,
    theme,
    fullscreenMode,
    currentShopType,
    replyToLetter,
    setCurrentShopType,
    setReplyToLetter,
    navigateTo,
    goBack,
    resetDesktopLayout,
    updateConversation,
    deleteConversation,
    updateUserProfile,
    updateTheme,
    toggleFullscreenMode,
    updateApiConfig: setApiConfig,
    onImportCharacter: handleImportCharacter,
    onAddPenPal: handleAddPenPal,
    addFriend,
    createGroup,
    onNavigateToPrivateChat: handleNavigateToPrivateChat,
    onOpenOopChat: () => {
      const oo1Conversation = conversations.find(
        (conv) => conv.id === 'preset-oo1' || conv.name === 'oo1'
      );
      if (oo1Conversation) {
        navigateTo('chat', oo1Conversation.id);
      } else {
        navigateTo('social');
      }
    },
    onSendOopMessage: (text: string) => {
      const oo1Conversation = conversations.find(
        (conv) => conv.id === 'preset-oo1' || conv.name === 'oo1'
      );
      if (oo1Conversation) {
        try {
          sessionStorage.setItem(`momoyu:oopsend:${oo1Conversation.id}`, text);
        } catch {
          // ignore
        }
        navigateTo('chat', oo1Conversation.id);
      } else {
        navigateTo('social');
      }
    },
    onSendOopDraft: (payload) => {
      const oo1Conversation = conversations.find(
        (conv) => conv.id === 'preset-oo1' || conv.name === 'oo1'
      );
      if (oo1Conversation) {
        try {
          sessionStorage.setItem(`momoyu:oopdraft:${oo1Conversation.id}`, JSON.stringify(payload));
        } catch {
          // ignore
        }
        navigateTo('chat', oo1Conversation.id);
      } else {
        navigateTo('social');
      }
    },
  });

  return (
    <>
      {/*
        首页在桌面端使用更宽画布（Gemini风格布局），其他页面保持手机容器体验。
      */}
      <div 
        data-ui="app-shell"
        className={`w-full flex items-start justify-center fixed inset-0 overflow-hidden ${
          fullscreenMode 
            ? 'bg-white pt-0' 
            : /* 手机全宽不要顶部留白条（原先 slate 底 + pt 会像一条灰绿边）；桌面保留灰台面 */
              'bg-white pt-0 md:bg-slate-100 md:pt-[14px]'
        }`}
        style={{ height: '100dvh' }}
      >
        {/* 手机容器 - 支持全屏模式切换 */}
        <div data-ui="app-frame" className={`bg-white overflow-hidden relative flex flex-col ${
          fullscreenMode
            ? 'w-full h-full rounded-none shadow-none mt-0'
            : currentScreen === 'home'
              ? 'w-full h-full md:h-[860px] max-w-[1200px] rounded-none md:rounded-[28px] shadow-2xl mt-0'
            : currentScreen === 'settings'
              ? 'w-full h-full md:h-[860px] md:max-w-[1200px] rounded-none md:rounded-[28px] shadow-2xl mt-0'
            : currentScreen === 'social' ||
                currentScreen === 'chat' ||
                currentScreen === 'database' ||
                currentScreen === 'sticker-management'
              ? 'w-[393px] h-[800px] rounded-[40px] shadow-2xl mt-0 md:w-full md:h-[860px] md:max-w-[1200px] md:rounded-[28px] md:mt-0'
            : 'w-[393px] h-[800px] rounded-[40px] shadow-2xl mt-0'
        }`}>
          {screenElement}
          
          {showSimDebug && SimDebugPanel ? (
            <SimDebugPanel
              getConversations={() => lifeSimConversationsRef.current}
              getApiConfig={() => lifeSimApiConfigRef.current}
            />
          ) : null}

          {/* 消息通知 - QQ风格顶部弹窗 */}
          <MessageNotification
            conversations={conversations}
            onNavigate={(conversationId) => {
              navigateTo('chat', conversationId);
            }}
          />
        </div>

      </div>

      <GlobalQuickBackupFab />
      <Toaster position="top-center" theme="light" richColors closeButton />

      <RuntimeServices
        conversations={conversations}
        apiConfig={apiConfig}
        currentScreen={currentScreen}
        showMigrationPrompt={false}
        onCloseMigrationPrompt={() => {}}
        onMigrationComplete={() => {}}
        onNewMessage={addMessageToConversation}
        onUpdateProactiveSettings={updateProactiveMessagingTime}
      />
    </>
  );
}

export default App;
