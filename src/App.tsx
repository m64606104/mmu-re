import { useState, useCallback, useEffect, useRef } from 'react';
import { Screen, Conversation, ApiConfig, UserProfile, MomentPost, Message, ThemeSettings, ShopType } from './types';
import type { CharacterSettings } from './types';
import MessageNotification from './components/MessageNotification';
import { renderScreen } from './navigation/renderScreen';
import { getDefaultScreenForApp, isAppPageValue } from './navigation/appEntry';
import type { AppPage } from './navigation/appEntry';
import { buildRouteHash, normalizeNavigationTarget, supportsConversationContext } from './navigation/navigationPolicy';
import { RuntimeServices } from './services/RuntimeServices';
import { load, save, initializeCache, checkMigrationNeeded, migrateData } from './domains/storage';
import { backgroundGenerationService } from './domains/generation';
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
import { smartLoad, smartSave, cleanupLegacyLargeLocalStorage } from './utils/storage';
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

function assetUrl(relativePath: string): string {
  // Use relative paths so GitHub Pages subpaths work.
  // e.g. "avatars/aa.png" resolves to "/mmu-re/avatars/aa.png" on Pages.
  const normalizedPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return normalizedPath;
}

function buildPresetConversation(kind: 'aa' | 'worker' | 'oo1', now = Date.now()): Conversation {
  if (kind === 'aa') {
    return {
      id: 'preset-aa',
      type: 'private',
      name: 'aa',
      avatar: assetUrl('avatars/aa-default.png'),
      messages: [],
      characterSettings: {
        avatar: assetUrl('avatars/aa-default.png'),
        nickname: 'aa',
        username: 'aa不是研究生',
        systemPrompt: '你叫aa，女生，是我的网友，和我关系很好，在上海读研。',
        personality: '喜欢网上冲浪、刷小红书、分享生活',
        languageStyle: '偶尔会使用网络用语，语气轻松活泼',
        languageExample: '哈哈哈太好笑了吧！今天又在小红书上刷到好多有趣的东西～',
        memoryEvents: '',
        disableWorldbook: true,
      },
      enabledFeatures: ['memory-system'],
      lastMessageTime: now,
      unreadCount: 0,
    };
  }
  if (kind === 'worker') {
    return {
      id: 'preset-worker',
      type: 'private',
      name: '测',
      avatar: assetUrl('avatars/ce-default.png'),
      messages: [],
      characterSettings: {
        avatar: assetUrl('avatars/ce-default.png'),
        nickname: '测',
        username: '只要涨薪不要996',
        systemPrompt: '你是一个上班族，26岁，男，在公司做总裁助理。',
        personality: '',
        languageStyle: '',
        languageExample: '',
        memoryEvents: '',
        disableWorldbook: true,
      },
      enabledFeatures: ['memory-system'],
      lastMessageTime: now,
      unreadCount: 0,
    };
  }
  return {
    id: 'preset-oo1',
    type: 'private',
    name: 'oo1',
    avatar: assetUrl('avatars/oo1.png'),
    messages: [],
    characterSettings: {
      avatar: assetUrl('avatars/oo1.png'),
      nickname: 'oo1',
      username: 'Your Personal AI',
      systemPrompt:
        '你是 oo1，一个对标 ChatGPT/Gemini 的通用智能助手。\n目标：帮助用户把事情做成。\n\n回答偏好：先给结论，再给可执行步骤；必要时给方案对比与推荐。\n表达：简洁、自然、不过度客套；不自我设限。\n\n文档/文件：当用户发送文档时，系统会把可读正文附在消息里（“内容：”之后）。你应直接阅读并处理；不要说“看不到附件/打不开文件/请复制粘贴”。',
      personality: '',
      languageStyle: '简洁、自然、可执行',
      languageExample: '',
      memoryEvents: '',
      disableWorldbook: true,
    },
    enabledFeatures: ['memory-system'],
    lastMessageTime: now,
    unreadCount: 0,
  };
}

function normalizePresetAaAvatar(conversations: Conversation[]): Conversation[] {
  const OO1_DEFAULT_PROMPT_V1 =
    '你是 oo1，一个对标 ChatGPT / Gemini 的通用智能助手。你擅长通用问答、写作、分析、规划和代码协助，回答要清晰、直接、可执行。';

  const OO1_DEFAULT_PROMPT_V2 = [
    '你是 oo1，一个对标 ChatGPT/Gemini 的通用智能助手。',
    '目标：帮助用户把事情做成。',
    '',
    '回答偏好：先给结论，再给可执行步骤；必要时给方案对比与推荐。',
    '表达：简洁、自然、不过度客套；不自我设限。',
    '',
    '文档/文件：当用户发送文档时，系统会把可读正文附在消息里（“内容：”之后）。你应直接阅读并处理；不要说“看不到附件/打不开文件/请复制粘贴”。',
  ].join('\n');

  const normalizePath = (p: string) => (p.startsWith('/') ? p.slice(1) : p).trim();

  /** 预设角色：用户若在聊天里换过头像（常见为 data:/blob:/外链图），载入时不要用内置默认头像覆盖 */
  function shouldPreserveCustomPresetAvatar(candidate: string | undefined): boolean {
    if (!candidate) return false;
    if (/^(data:|blob:)/i.test(candidate)) return true;
    const s = normalizePath(candidate.toLowerCase());
    if (/^https?:\/\//i.test(candidate)) {
      const isEmbeddedPack =
        s.includes('aa-default') ||
        s.includes('ce-default') ||
        /\boo1\.png\b/i.test(candidate);
      return !isEmbeddedPack;
    }
    const isBundledFile =
      s.includes('aa-default') ||
      s.includes('ce-default') ||
      /\bavatars\/([^/]+\/)?oo1\.png\b/i.test(s) ||
      s.endsWith('avatars/oo1.png');
    return !isBundledFile && s.length > 0;
  }

  const normalized = conversations.map((conv) => {
    const isPresetAa = conv.id.startsWith('preset-aa') || conv.name === 'aa';
    const isPresetWorker = conv.id.startsWith('preset-worker') || conv.name === '测';
    const isPresetOo1 = conv.id === 'preset-oo1' || conv.name === 'oo1';
    if (!isPresetAa && !isPresetWorker && !isPresetOo1) return conv;
    const avatarPath = isPresetAa
      ? assetUrl('avatars/aa-default.png')
      : isPresetWorker
        ? assetUrl('avatars/ce-default.png')
        : assetUrl('avatars/oo1.png');

    const currentAvatar = conv.characterSettings?.avatar || conv.avatar;
    const useBundledAvatar = !shouldPreserveCustomPresetAvatar(currentAvatar);
    const nextAvatar = useBundledAvatar ? avatarPath : (currentAvatar as string);

    const nextCharacterSettings = conv.characterSettings
      ? {
          ...conv.characterSettings,
          avatar: nextAvatar,
          ...(isPresetOo1 && conv.characterSettings.systemPrompt === OO1_DEFAULT_PROMPT_V1
            ? {
                systemPrompt: OO1_DEFAULT_PROMPT_V2,
                personality: '',
                languageExample: '',
                languageStyle: '简洁、自然、可执行',
              }
            : {}),
        }
      : conv.characterSettings;
    return {
      ...conv,
      avatar: nextAvatar,
      characterSettings: nextCharacterSettings,
    };
  });

  const now = Date.now();
  const hasAa = normalized.some((conv) => conv.id.startsWith('preset-aa') || conv.name === 'aa');
  const hasWorker = normalized.some((conv) => conv.id.startsWith('preset-worker') || conv.name === '测');
  const hasOo1 = normalized.some((conv) => conv.id === 'preset-oo1' || conv.name === 'oo1');

  const ensured: Conversation[] = [...normalized];
  if (!hasOo1) ensured.unshift(buildPresetConversation('oo1', now));
  if (!hasAa) ensured.push(buildPresetConversation('aa', now));
  if (!hasWorker) ensured.push(buildPresetConversation('worker', now));
  return ensured;
}

function App() {
  const routeSyncRef = useRef(false);
  const navigationStackRef = useRef<Array<{ screen: Screen; conversationId: string | null }>>([]);
  const cloudSyncMessageCountRef = useRef<Record<string, number>>({});
  const avatarVisionInFlightRef = useRef<Set<string>>(new Set());
  const avatarVisionCooldownRef = useRef<Map<string, number>>(new Map());
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [conversations, setConversations] = useState<Conversation[]>(() => normalizePresetAaAvatar([]));
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [apiConfig, setApiConfig] = useState<ApiConfig>(() => {
    return safeLoadFromLocalStorage('apiConfig', {
      baseUrl: '',
      apiKey: '',
      modelName: '',
      visionModelName: '',
      visionBaseUrl: '',
      visionApiKey: '',
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
          if (s.includes('avatchangedecision') || s.includes('avatarchangedecision')) return 'avatarChangeDecision';
          if (s.includes('lifeengine')) return 'lifeEngine';
          if (s.includes('memorysystem')) return 'memorySystem';
          if (s.includes('chatscreen')) return 'chatScreen';
          return 'unknown';
        };

        const src = guessSource();
        const until = fuseUntil.get(src) || 0;
        if (until > Date.now()) {
          // 仅控制台提示，不影响用户端 UI
          console.warn(`🧯 [chat/completions] blocked by fuse from=${src} until=${new Date(until).toLocaleTimeString()}`, url);
          return new Response('', { status: 599, statusText: 'Blocked by momoyu fuse' });
        }

        const res = await rawFetch(input, init);
        if (!res.ok) {
          // 只在失败时打点，避免刷屏
          console.warn(`🧭 [chat/completions] ${res.status} from=${src}`, url);
          if (res.status >= 500) {
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

  // 不再弹出迁移提示弹窗：数据会按需自动迁移（无打扰）

  // 初始化存储系统和对话数据
  useEffect(() => {
    const loadData = async () => {
      // 🧠 先初始化缓存系统
      await initializeCache();
      cleanupLegacyLargeLocalStorage();

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

      // 🔄 检查并执行数据迁移
      if (checkMigrationNeeded()) {
        console.log('⚡ 检测到需要迁移的数据，开始自动迁移...');
        const result = await migrateData();
        console.log(`📊 迁移结果: ${result.migratedKeys.length} 成功, ${result.errors.length} 失败`);
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
            const normalizedHydrated = normalizePresetAaAvatar(hydrated);
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
          loadedConversations = normalizePresetAaAvatar(saved);
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
          const normalizedPresetContacts = normalizePresetAaAvatar(presetContacts);
          loadedConversations = normalizedPresetContacts;
          setConversations(normalizedPresetContacts);
          cloudSyncMessageCountRef.current = buildMessageCountSnapshot(normalizedPresetContacts);
        }
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
          // 更新对话消息
          setConversations(prev => prev.map(c => {
            if (c.id === conversationId) {
              return {
                ...c,
                messages: newMessages,
                lastMessageTime: Date.now(),
              };
            }
            return c;
          }));
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
    // 🚀 性能优化：使用防抖延迟保存，避免频繁写入localStorage阻塞主线程
    const timeoutId = setTimeout(async () => {
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
        await save('conversations', persistableConversations);
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
      void smartSave('moments', moments);
    }, 500); // 500ms防抖，朋友圈更新频率较低
    
    return () => clearTimeout(timeoutId);
  }, [moments]);

  // 🤖 头像视觉理解自动补全：新建/导入/预设角色只要缺少解析结果，就自动尝试一次
  useEffect(() => {
    if (!apiConfig.baseUrl || !apiConfig.apiKey || !apiConfig.modelName) return;
    const candidates = conversations.filter((conv) => {
      if (conv.type !== 'private') return false;
      const avatarUrl = conv.characterSettings?.avatar || conv.avatar;
      if (!avatarUrl) return false;
      if (!shouldReanalyzeAvatar(avatarUrl, conv.characterSettings)) return false;
      if (avatarVisionInFlightRef.current.has(conv.id)) return false;
      const until = avatarVisionCooldownRef.current.get(conv.id) || 0;
      if (until > Date.now()) return false;
      return true;
    });
    if (candidates.length === 0) return;

    // 只处理 1 个，避免 dev 下 StrictMode/批量候选导致刷屏
    const conv = candidates[0];
    avatarVisionInFlightRef.current.add(conv.id);
    // 在真正发请求前就先进入冷却窗口：避免 effect 触发两次造成重复请求
    avatarVisionCooldownRef.current.set(conv.id, Date.now() + 60 * 60 * 1000);
    void (async () => {
      try {
        const avatarUrl = conv.characterSettings?.avatar || conv.avatar;
        if (!avatarUrl) return;
        const profile = await analyzeAvatarWithVisionModel(avatarUrl, apiConfig);
        if (!profile) {
          // 视觉解析失败（常见于不支持 image_url 的后端）：保持冷却，避免持续刷 500
          return;
        }
        // 成功才解除冷却
        avatarVisionCooldownRef.current.delete(conv.id);
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

    // 如果用户进入聊天但未配置 API，直接提示并跳转到设置页
    if (targetScreen === 'chat') {
      const ok = Boolean(apiConfig?.baseUrl && apiConfig?.apiKey && apiConfig?.modelName);
      if (!ok) {
        alert('请先在“设置 > API 配置”中填写 Base URL / API Key / 模型名称，才能开始聊天。');
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
  }, [currentScreen, currentConversationId]);

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

  // 更新对话
  const updateConversation = useCallback((id: string, updates: Partial<Conversation>) => {
    setConversations(prev => prev.map(conv => 
      conv.id === id ? { ...conv, ...updates } : conv
    ));
  }, []);

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
        replySplitPreference: data.character?.replySplitPreference || 'smart',
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
      
      // 添加对话到列表
      setConversations(prev => [...prev, newConversation]);
      console.log('✅ 对话添加成功');
      
      // 📊 统计导入信息
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
      };
      
      // 显示详细导入结果
      const successMessage = `✅ 角色导入成功！\n\n` +
        `👤 角色：${importStats.character}\n` +
        `📄 数据版本：${importStats.version}\n\n` +
        `📊 导入内容：\n` +
        `• 角色设置：完整\n` +
        `• 知识库：${importStats.knowledgeBase} 份\n` +
        `• 文档库：${importStats.documents} 份\n` +
        `• 记忆库：${importStats.memories} 条\n` +
        `• 朋友圈：${importStats.moments} 条\n` +
        `• 关系网络：${importStats.relationships} 个\n` +
        `• AI状态：${importStats.hasAIStatus ? '已恢复' : '无'}\n` +
        `• 财务数据：${importStats.hasFinance ? '已恢复' : '无'}\n` +
        `• 消息记录：${importStats.messages} 条\n\n` +
        `🎉 所有数据已完整导入！`;
      
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
    nickname: string;
    username: string;
    avatar: string;
    systemPrompt: string;
    personality: string;
    languageStyle: string;
    languageExample: string;
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
        nickname: friendData.nickname,
        username: friendData.username,
        systemPrompt: friendData.systemPrompt,
        personality: friendData.personality,
        languageStyle: friendData.languageStyle,
        languageExample: friendData.languageExample,
        memoryEvents: '',
        disableWorldbook: true, // 新建角色默认关闭世界书
      },
      enabledFeatures: ['memory-system'], // 默认启用记忆系统
      lastMessageTime: Date.now(),
      unreadCount: 0,
      replySplitPreference: 'smart',
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
    
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
            : 'bg-slate-100 pt-[10.5px] md:pt-[14px]'
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
