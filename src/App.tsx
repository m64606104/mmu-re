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
import { supabase } from './services/supabaseClient';
import {
  supabaseLoadConversations,
  supabaseLoadMessages,
  supabaseUpsertConversation,
  supabaseAppendMessages,
  supabaseSyncDerivedMemory,
} from './services/supabaseData';
import { smartLoad, smartSave } from './utils/storage';
import { trimConversationsForCache } from './services/conversationCache';
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
  'kindergarten', 'worldbook', 'easy-chat', 'sticker-management',
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

function assetUrl(relativePath: string): string {
  // Use relative paths so GitHub Pages subpaths work.
  // e.g. "avatars/aa.png" resolves to "/mmu-re/avatars/aa.png" on Pages.
  const normalizedPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return normalizedPath;
}

function normalizePresetAaAvatar(conversations: Conversation[]): Conversation[] {
  return conversations.map((conv) => {
    const isPresetAa = conv.id.startsWith('preset-aa-') || conv.name === 'aa';
    const isPresetWorker = conv.id.startsWith('preset-worker-') || conv.name === '测';
    if (!isPresetAa && !isPresetWorker) return conv;
    const avatarPath = isPresetAa ? assetUrl('avatars/aa-default.png') : assetUrl('avatars/ce-default.png');
    const nextCharacterSettings = conv.characterSettings
      ? { ...conv.characterSettings, avatar: avatarPath }
      : conv.characterSettings;
    return {
      ...conv,
      avatar: avatarPath,
      characterSettings: nextCharacterSettings,
    };
  });
}

function App() {
  const routeSyncRef = useRef(false);
  const navigationStackRef = useRef<Array<{ screen: Screen; conversationId: string | null }>>([]);
  const cloudSyncMessageCountRef = useRef<Record<string, number>>({});
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [apiConfig, setApiConfig] = useState<ApiConfig>(() => {
    return safeLoadFromLocalStorage('apiConfig', { baseUrl: '', apiKey: '', modelName: '' });
  });
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    return safeLoadFromLocalStorage('userProfile', { username: '123', bio: '分享生活，记录美好', status: '在线' });
  });
  const [moments, setMoments] = useState<MomentPost[]>(() => {
    return safeLoadFromLocalStorage('moments', []);
  });
  const [theme, setTheme] = useState<ThemeSettings>(() => {
    return safeLoadFromLocalStorage('theme', { wallpaper: 'gradient-5' });
  });
  const [currentShopType, setCurrentShopType] = useState<ShopType>('food');
  const [replyToLetter, setReplyToLetter] = useState<Letter | null>(null);
  
  // 全屏模式状态
  const [fullscreenMode, setFullscreenMode] = useState<boolean>(() => {
    return safeLoadFromLocalStorage('fullscreenMode', false);
  });

  // 桌面布局重置函数
  const resetDesktopLayout = useCallback(() => {
    const defaultAppLayout = ['settings', 'social', 'huaduoduo', 'easy-chat', 'kindergarten', 'theme', 'worldbook', 'music', 'phone', 'bell', 'mail', 'database'];
    const defaultQuickLayout = ['announcement', 'social', 'heart', 'settings'];
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
      
      // 🧠 初始化记忆系统
      try {
        const { initializeMemorySystem } = await import('./utils/memorySystem');
        await initializeMemorySystem();
      } catch (error) {
        console.error('❌ 记忆系统初始化失败:', error);
      }
      
      // 🔄 检查并执行数据迁移
      if (checkMigrationNeeded()) {
        console.log('⚡ 检测到需要迁移的数据，开始自动迁移...');
        const result = await migrateData();
        console.log(`📊 迁移结果: ${result.migratedKeys.length} 成功, ${result.errors.length} 失败`);
      }
      
      // 从云端优先加载（若已配置 Supabase），否则走本地存储
      const cloudEnabled = Boolean(supabase);
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
            await save('conversations', trimConversationsForCache(normalizedHydrated));
          }
        } catch (error) {
          console.warn('⚠️ Supabase加载失败，回退本地存储:', error);
        }
      }

      if (loadedConversations.length === 0) {
        const saved = await load('conversations');
        if (saved) {
          loadedConversations = normalizePresetAaAvatar(trimConversationsForCache(saved));
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
              } catch (e) {
                console.warn(`⚠️ 会话 ${conv.id} 迁移到Supabase失败:`, e);
              }
            }
            cloudSyncMessageCountRef.current = buildMessageCountSnapshot(loadedConversations);
          }
        } else {
        // 检查旧的localStorage数据
        const oldSaved = localStorage.getItem('conversations');
        if (oldSaved) {
          const parsed = JSON.parse(oldSaved);
          loadedConversations = normalizePresetAaAvatar(trimConversationsForCache(parsed));
          setConversations(loadedConversations);
          // 保存到新存储
          await save('conversations', loadedConversations);
        } else {
          // 添加预设联系人
          const presetContacts: Conversation[] = [
            {
              id: 'preset-aa-' + Date.now(),
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
                disableWorldbook: true, // 预设角色默认关闭世界书
              },
              enabledFeatures: ['memory-system'], // 默认启用记忆系统
              lastMessageTime: Date.now(),
              unreadCount: 0,
            },
            {
              id: 'preset-worker-' + Date.now(),
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
                disableWorldbook: true, // 预设角色默认关闭世界书
              },
              enabledFeatures: ['memory-system'], // 默认启用记忆系统
              lastMessageTime: Date.now(),
              unreadCount: 0,
            },
          ];
          loadedConversations = presetContacts;
          setConversations(presetContacts);
          cloudSyncMessageCountRef.current = buildMessageCountSnapshot(presetContacts);
        }
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
        const trimmed = trimConversationsForCache(conversations);
        await save('conversations', trimmed);
        if (supabase) {
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
              }
            } catch (error) {
              console.warn(`⚠️ 会话 ${conv.id} 同步Supabase失败:`, error);
            }
          }
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
      localStorage.setItem('moments', JSON.stringify(moments));
    }, 500); // 500ms防抖，朋友圈更新频率较低
    
    return () => clearTimeout(timeoutId);
  }, [moments]);

  // 处理页面切换
  const navigateTo = useCallback((screen: Screen, conversationId?: string, options?: { replace?: boolean }) => {
    const rawNextConversationId = supportsConversationContext(screen)
      ? (conversationId ?? currentConversationId)
      : null;
    const normalized = normalizeNavigationTarget(screen, rawNextConversationId);
    const targetScreen = normalized.screen;
    const nextConversationId = normalized.conversationId;
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
      
      // 导航到聊天界面
      navigateTo('chat', newConversationId);
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

  // 添加朋友圈
  const addMoment = useCallback((content: string, images: string[]) => {
    const newMoment: MomentPost = {
      id: Date.now().toString(),
      userId: 'user',
      username: userProfile.username,
      userAvatar: userProfile.avatar,
      content,
      images,
      timestamp: Date.now(),
      likes: [],
      comments: []
    };
    setMoments(prev => [newMoment, ...prev]);
  }, [userProfile]);

  // 点赞朋友圈
  const likeMoment = useCallback((momentId: string) => {
    const userId = 'user'; // 默认当前用户
    setMoments(prev => prev.map(moment => {
      if (moment.id === momentId) {
        const likes = moment.likes.includes(userId) 
          ? moment.likes.filter(id => id !== userId)
          : [...moment.likes, userId];
        return { ...moment, likes };
      }
      return moment;
    }));
  }, []);

  // 评论朋友圈
  const commentMoment = useCallback((momentId: string, content: string) => {
    setMoments(prev => prev.map(moment => {
      if (moment.id === momentId) {
        const newComment = {
          id: Date.now().toString(),
          userId: 'user',
          username: userProfile.username,
          userAvatar: userProfile.avatar,
          content,
          timestamp: Date.now()
        };
        return { ...moment, comments: [...moment.comments, newComment] };
      }
      return moment;
    }));
  }, [userProfile]);

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
    
    navigateTo('chat', newConversation.id);
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
    navigateTo('chat', newConversation.id);
  }, [conversations, navigateTo]);

  const handleAddPenPal = useCallback(
    (newConversation: Conversation) => {
      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversationId(newConversation.id);
      navigateTo('chat', newConversation.id);
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
    addMoment,
    likeMoment,
    commentMoment,
    onImportCharacter: handleImportCharacter,
    onAddPenPal: handleAddPenPal,
    addFriend,
    createGroup,
    onNavigateToPrivateChat: handleNavigateToPrivateChat,
  });

  return (
    <>
      <div 
        className={`w-full flex items-start justify-center fixed inset-0 overflow-hidden ${
          fullscreenMode 
            ? 'bg-white pt-0' 
            : 'bg-slate-100 pt-[10.5px] md:pt-[14px]'
        }`}
        style={fullscreenMode ? { height: '100dvh' } : { height: '100vh' }}
      >
        {/* 手机容器 - 支持全屏模式切换 */}
        <div className={`bg-white overflow-hidden relative flex flex-col ${
          fullscreenMode
            ? 'w-full h-full rounded-none shadow-none mt-0'
            : 'w-[393px] h-[800px] rounded-[40px] shadow-2xl -mt-[10.2px]'
        }`}>
          {screenElement}
          
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
