import { useState, useCallback, useEffect } from 'react';
import { Screen, Conversation, ApiConfig, UserProfile, MomentPost, Message, ThemeSettings, ShopType } from './types';
import HomeScreen from './components/HomeScreen';
import SettingsScreen from './components/SettingsScreen';
import SocialScreen from './components/SocialScreen';
import ChatScreen from './components/ChatScreen';
import ProfileScreen from './components/ProfileScreen';
import MomentsScreen from './components/MomentsScreen';
import CharacterSettingsScreen from './components/CharacterSettingsScreen';
import NewConversationScreen from './components/NewConversationScreen';
import ContactsScreen from './components/ContactsScreen';
import AddFriendScreen from './components/AddFriendScreen';
import CreateGroupScreen from './components/CreateGroupScreen';
import ThemeScreen from './components/ThemeScreen';
import UserGuide from './components/UserGuide';
import AnnouncementScreen from './components/AnnouncementScreen';
import WalletScreen from './components/WalletScreen';
import ShoppingScreen from './components/ShoppingScreen';
import UserSystemScreen from './components/UserSystemScreen';
import OrderHistoryScreen from './components/OrderHistoryScreen';
import DatabaseScreen from './components/DatabaseScreen';
import GroupedLetterBoxScreen from './components/GroupedLetterBoxScreen';
import LetterWritingScreen from './components/LetterWritingScreen';
import PenPalListScreen from './components/PenPalListScreen';
import ArchivedLettersScreen from './components/ArchivedLettersScreen';
import FavoriteLettersScreen from './components/FavoriteLettersScreen';
import AchievementScreen from './components/AchievementScreen';
import StampCollectionScreen from './components/StampCollectionScreen';
import LetterNotificationCenter from './components/LetterNotificationCenter';
import RecycleBinScreen from './components/RecycleBinScreen';
import BottleFishingScreen from './components/BottleFishingScreen';
import FavoriteRepliesScreen from './components/FavoriteRepliesScreen';
import AIKindergartenScreen from './components/AIKindergartenScreen';
import BottomNavBar from './components/BottomNavBar';
import UnrepliedLettersScreen from './components/UnrepliedLettersScreen';
import ToastContainer from './components/ToastContainer';
import { MomentsAutoGenerator } from './components/MomentsAutoGenerator';
import { AIMomentsInteractionManager } from './components/AIMomentsInteractionManager';
import ProactiveMessagingService from './components/ProactiveMessagingService';
import MessageNotification from './components/MessageNotification';
import LetterNotification from './components/LetterNotification';
import AchievementNotification from './components/AchievementNotification';
import StorageMigrationPrompt from './components/StorageMigrationPrompt';
import { load, save, initializeCache, checkMigrationNeeded, migrateData, getStorageStatus } from './utils/storage';
import { generateAIMoment } from './utils/aiMomentsGenerator';
import { backgroundGenerationService } from './utils/backgroundGenerationService';
import { initializeLetters, initializeLetterTimers } from './utils/letterService';
import { Letter } from './types/letter';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [previousScreen, setPreviousScreen] = useState<Screen>('social'); // 记录来源页面
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [apiConfig, setApiConfig] = useState<ApiConfig>(() => {
    const saved = localStorage.getItem('apiConfig');
    return saved ? JSON.parse(saved) : { baseUrl: '', apiKey: '', modelName: '' };
  });
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('userProfile');
    return saved ? JSON.parse(saved) : { username: '123', bio: '分享生活，记录美好', status: '在线' };
  });
  const [moments, setMoments] = useState<MomentPost[]>(() => {
    const saved = localStorage.getItem('moments');
    return saved ? JSON.parse(saved) : [];
  });
  const [theme, setTheme] = useState<ThemeSettings>(() => {
    const saved = localStorage.getItem('theme');
    return saved ? JSON.parse(saved) : { wallpaper: 'gradient-5' };
  });
  const [currentShopType, setCurrentShopType] = useState<ShopType>('food');
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);
  const [replyToLetter, setReplyToLetter] = useState<Letter | null>(null);

  // 桌面布局重置函数
  const resetDesktopLayout = useCallback(() => {
    const defaultAppLayout = ['settings', 'social', 'theme', 'music', 'phone', 'bell', 'mail'];
    const defaultQuickLayout = ['camera', 'social', 'heart', 'settings'];
    const defaultDockLayout = ['phone', 'social', 'music', 'settings'];
    
    localStorage.setItem('appLayout', JSON.stringify(defaultAppLayout));
    localStorage.setItem('quickLayout', JSON.stringify(defaultQuickLayout));
    localStorage.setItem('dockLayout', JSON.stringify(defaultDockLayout));
    
    // 触发页面刷新以应用新布局
    window.location.reload();
  }, []);

  // 检查存储迁移状态
  useEffect(() => {
    const checkStorage = async () => {
      const needsMigration = checkMigrationNeeded();
      
      if (needsMigration) {
        // 检查是否已经显示过升级提示（永远只显示一次）
        const hasShownUpgrade = localStorage.getItem('hasShownStorageUpgrade');
        
        if (!hasShownUpgrade) {
          // 检查localStorage使用状况
          const status = await getStorageStatus();
          
          // 如果有需要迁移的数据，显示迁移提示
          if (status.localStorage.needsMigration.length > 0) {
            console.log(`📊 发现 ${status.localStorage.needsMigration.length} 项数据需要迁移`);
            setShowMigrationPrompt(true);
            
            // 标记已显示过升级提示（永久标记）
            localStorage.setItem('hasShownStorageUpgrade', 'true');
          }
        }
      }
    };
    
    checkStorage();
  }, []);

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
      
      // 从新存储系统加载数据
      const saved = await load('conversations');
      
      let loadedConversations: Conversation[] = [];
      
      if (saved) {
        loadedConversations = saved;
        setConversations(saved);
      } else {
        // 检查旧的localStorage数据
        const oldSaved = localStorage.getItem('conversations');
        if (oldSaved) {
          const parsed = JSON.parse(oldSaved);
          loadedConversations = parsed;
          setConversations(parsed);
          // 保存到新存储
          await save('conversations', parsed);
        } else {
          // 添加预设联系人
          const presetContacts: Conversation[] = [
            {
              id: 'preset-aa-' + Date.now(),
              type: 'private',
              name: 'aa',
              avatar: '👩',
              messages: [],
              characterSettings: {
                avatar: '👩',
                nickname: 'aa',
                username: 'aa不是研究生',
                systemPrompt: '你叫aa，女生，是我的网友，和我关系很好，在上海读研。',
                personality: '喜欢网上冲浪、刷小红书、分享生活',
                languageStyle: '偶尔会使用网络用语，语气轻松活泼',
                languageExample: '哈哈哈太好笑了吧！今天又在小红书上刷到好多有趣的东西～',
                memoryEvents: '',
              },
              enabledFeatures: ['memory-system'], // 默认启用记忆系统
              lastMessageTime: Date.now(),
              unreadCount: 0,
            },
            {
              id: 'preset-worker-' + Date.now(),
              type: 'private',
              name: '测',
              avatar: '👨‍💼',
              messages: [],
              characterSettings: {
                avatar: '👨‍💼',
                nickname: '测',
                username: '只要涨薪不要996',
                systemPrompt: '你是一个上班族，26岁，男，在公司做总裁助理。',
                personality: '',
                languageStyle: '',
                languageExample: '',
                memoryEvents: '',
              },
              enabledFeatures: ['memory-system'], // 默认启用记忆系统
              lastMessageTime: Date.now(),
              unreadCount: 0,
            },
          ];
          loadedConversations = presetContacts;
          setConversations(presetContacts);
        }
      }

      // 💰 智能财务系统：批量激活所有AI
      if (loadedConversations.length > 0 && apiConfig) {
        try {
          const { batchActivateAIFinanceSystems } = await import('./utils/aiFinanceActivator');
          const { processAllAutoIncome } = await import('./utils/aiFinance');
          
          // 批量激活所有AI的财务系统
          setTimeout(async () => {
            console.log('🚀 开始批量激活AI智能财务系统...');
            const result = await batchActivateAIFinanceSystems(loadedConversations, apiConfig);
            console.log(`✅ 财务系统激活完成: 成功${result.success}个, 失败${result.failed}个`);
            
            // 处理一次自动收入
            await processAllAutoIncome();
            
            // 🎯 初始化简化升级系统（修复理解力进度条）
            const { checkUpgradeSystemNeedsInit, initializeAllAIUpgradeSystem } = await import('./utils/initializeUpgradeSystem');
            const needsInit = await checkUpgradeSystemNeedsInit();
            if (needsInit) {
              console.log('🔧 检测到旧的升级系统，开始初始化...');
              const result = await initializeAllAIUpgradeSystem();
              console.log(`✅ 升级系统初始化完成: 更新了${result.updatedAI}个AI，修复了理解力进度条显示`);
            }
            
            // 💬 修复AI儿童聊天机械复读问题
            const { checkAIChildNeedsPromptUpdate, updateAllAIChildPrompts } = await import('./utils/updateAIChildPrompts');
            const needsPromptUpdate = await checkAIChildNeedsPromptUpdate();
            if (needsPromptUpdate) {
              console.log('🤖 检测到AI儿童需要更新聊天规则，开始修复机械复读问题...');
              const promptResult = await updateAllAIChildPrompts();
              console.log(`✅ AI儿童聊天优化完成: 更新了${promptResult.updatedAI}个AI，聊天现在更自然了！`);
            }
            
            // 👨‍👩‍👧‍👦 修复用户称呼硬编码问题
            const { checkNeedsUserTitleUpdate, updateAllUserTitleReferences } = await import('./utils/updateUserTitleReferences');
            const needsTitleUpdate = await checkNeedsUserTitleUpdate();
            if (needsTitleUpdate) {
              console.log('👨‍👩‍👧‍👦 检测到AI儿童需要更新用户称呼设置，开始修复硬编码"妈妈"问题...');
              const titleResult = await updateAllUserTitleReferences();
              console.log(`✅ 用户称呼优化完成: 更新了${titleResult.updatedAI}个AI，现在会使用个性化称呼！`);
            }
          }, 3000); // 延迟3秒执行，避免阻塞初始化
        } catch (error) {
          console.error('激活AI智能财务系统失败:', error);
        }
      }
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
        await save('conversations', conversations);
      }
    }, 300); // 300ms防抖，合并连续的更新
    
    return () => clearTimeout(timeoutId);
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem('apiConfig', JSON.stringify(apiConfig));
  }, [apiConfig]);

  useEffect(() => {
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
  }, [userProfile]);

  // 💰 定时处理AI自动收入（每小时检查一次）
  useEffect(() => {
    const processIncomeInterval = setInterval(async () => {
      try {
        const { processAllAutoIncome, processAllAutoExpenses } = await import('./utils/aiFinance');
        await processAllAutoIncome();
        await processAllAutoExpenses(); // 内置30%概率自动支出
        console.log('✅ 定时处理AI财务系统完成');
      } catch (error) {
        console.error('⚠️ 定时处理AI财务系统失败:', error);
      }
    }, 30 * 60 * 1000); // 每30分钟执行一次

    return () => clearInterval(processIncomeInterval);
  }, []);

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
  const navigateTo = useCallback((screen: Screen, conversationId?: string) => {
    setPreviousScreen(currentScreen); // 记录当前页面作为来源
    
    // 切换到聊天页面时，清零未读消息
    if (screen === 'chat' && conversationId) {
      setCurrentConversationId(conversationId);
      // 清零该对话的未读数
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, unreadCount: 0 } 
          : conv
      ));
    } else if (conversationId) {
      setCurrentConversationId(conversationId);
    }
    
    setCurrentScreen(screen);
  }, [currentScreen]);

  // 返回主屏幕
  const goBack = useCallback(() => {
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

  // 送礼物给AI
  const handleSendGiftToAI = useCallback((product: any, recipientId: string, recipientName: string, shopType: 'food' | 'movie' | 'shopping') => {
    const giftMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: `给你的礼物`,
      timestamp: Date.now(),
      order: {
        type: 'gift',
        source: shopType === 'food' ? 'eleme' : shopType === 'movie' ? 'movie' : 'taobao',
        products: [{
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          image: product.image
        }],
        totalAmount: product.price,
        recipientId,
        recipientName,
        message: '给你买的小礼物～',
        status: 'pending',
        orderNumber: `ORDER${Date.now()}`
      }
    };
    
    // 添加到对话中
    const conversation = conversations.find(c => c.id === recipientId);
    if (conversation) {
      updateConversation(recipientId, {
        messages: [...conversation.messages, giftMessage],
        lastMessageTime: Date.now()
      });
      
      // 切换到聊天页面
      setCurrentConversationId(recipientId);
      navigateTo('chat');
    }
  }, [conversations, updateConversation, navigateTo]);

  // 请AI代付
  const handleRequestAIPay = useCallback((product: any, aiId: string, shopType: 'food' | 'movie' | 'shopping') => {
    const payRequestMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: `请你帮我代付`,
      timestamp: Date.now(),
      order: {
        type: 'payRequest',
        source: shopType === 'food' ? 'eleme' : shopType === 'movie' ? 'movie' : 'taobao',
        products: [{
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          image: product.image
        }],
        totalAmount: product.price,
        message: '帮我付一下～',
        status: 'pending',
        orderNumber: `PAY${Date.now()}`
      }
    };
    
    const conversation = conversations.find(c => c.id === aiId);
    if (conversation) {
      updateConversation(aiId, {
        messages: [...conversation.messages, payRequestMessage],
        lastMessageTime: Date.now()
      });
      
      // 切换到聊天页面
      setCurrentConversationId(aiId);
      navigateTo('chat');
    }
  }, [conversations, updateConversation, navigateTo]);

  // 添加消息到指定对话（用于AI主动发消息）
  const addMessageToConversation = useCallback((conversationId: string, message: Message) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId) {
        // 只有当用户不在该对话的聊天页面时，才增加未读数
        const shouldIncreaseUnread = !(
          currentScreen === 'chat' && 
          currentConversationId === conversationId
        );
        
        return {
          ...conv,
          messages: [...conv.messages, message],
          lastMessageTime: message.timestamp,
          unreadCount: shouldIncreaseUnread ? conv.unreadCount + 1 : 0
        };
      }
      return conv;
    }));
  }, [currentScreen, currentConversationId]);

  // 导入角色数据
  const handleImportCharacter = useCallback((data: any) => {
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
      };
      
      console.log('✅ 创建新对话:', newConversation);
      
      // 🧠 导入记忆库数据（完整MemoryBank）
      if (data.memoryBank && data.memoryBank.memories) {
        console.log('🧠 导入记忆库数据...');
        const memoryBanksData = localStorage.getItem('chat_memory_banks');
        const allMemoryBanks = memoryBanksData ? JSON.parse(memoryBanksData) : [];
        
        // 创建新的记忆库
        const newMemoryBank = {
          ...data.memoryBank,
          conversationId: newConversationId, // 使用新的对话ID
          updatedAt: Date.now(),
        };
        
        allMemoryBanks.push(newMemoryBank);
        localStorage.setItem('chat_memory_banks', JSON.stringify(allMemoryBanks));
        console.log('✅ 记忆库导入成功，记忆条数:', newMemoryBank.memories?.length || 0);
      }
      
      // 📸 导入朋友圈数据
      if (data.moments) {
        console.log('📸 导入朋友圈数据...');
        const momentsKey = `moments_${newConversationId}`;
        localStorage.setItem(momentsKey, JSON.stringify(data.moments));
        console.log('✅ 朋友圈导入成功，朋友圈条数:', data.moments.posts?.length || 0);
      }
      
      // 💰 导入AI财务数据
      if (data.finance) {
        console.log('💰 导入AI财务数据...');
        const financeKey = `ai_finance_${newConversationId}`;
        localStorage.setItem(financeKey, JSON.stringify(data.finance));
        console.log('✅ AI财务数据导入成功');
      }
      
      // 🔗 导入关系网络数据
      if (data.relationships && data.relationships.length > 0) {
        console.log('🔗 导入关系网络数据...');
        const relationshipsData = localStorage.getItem('relationships');
        const allRelationships = relationshipsData ? JSON.parse(relationshipsData) : [];
        
        // 更新关系中的ID引用
        const updatedRelationships = data.relationships.map((rel: any) => ({
          ...rel,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          personId: rel.personId === data.character?.id ? newConversationId : rel.personId,
          targetId: rel.targetId === data.character?.id ? newConversationId : rel.targetId,
          updatedAt: Date.now(),
        }));
        
        allRelationships.push(...updatedRelationships);
        localStorage.setItem('relationships', JSON.stringify(allRelationships));
        console.log('✅ 关系网络导入成功，关系数量:', updatedRelationships.length);
      }
      
      // 📚 导入文档库数据
      if (data.documents && data.documents.length > 0) {
        console.log('📚 导入文档库数据...');
        const documentLibraryData = localStorage.getItem('document_library');
        const allDocuments = documentLibraryData ? JSON.parse(documentLibraryData) : [];
        
        // 更新文档的关联ID
        const updatedDocuments = data.documents.map((doc: any) => ({
          ...doc,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          conversationId: newConversationId, // 关联到新对话
          uploadedAt: Date.now(),
        }));
        
        allDocuments.push(...updatedDocuments);
        localStorage.setItem('document_library', JSON.stringify(allDocuments));
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

  // 更新主题
  const updateTheme = useCallback((newTheme: ThemeSettings) => {
    setTheme(newTheme);
    localStorage.setItem('theme', JSON.stringify(newTheme));
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
      },
      enabledFeatures: ['memory-system'], // 默认启用记忆系统
      lastMessageTime: Date.now(),
      unreadCount: 0,
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
    
    // 💰 为新AI初始化智能财务系统
    setTimeout(async () => {
      try {
        const { autoConfigureIncome } = await import('./utils/smartFinanceSystem');
        const { getAIFinanceData } = await import('./utils/aiFinance');
        
        // 初始化AI财务数据（会根据角色设置智能生成初始资金）
        await getAIFinanceData(newConversation.id, newConversation.characterSettings);
        
        // 配置AI收入（根据角色设置智能配置）
        if (apiConfig) {
          await autoConfigureIncome(newConversation, apiConfig);
        }
        
        console.log(`💰 已为新AI ${friendData.nickname} 初始化智能财务系统`);
      } catch (error) {
        console.error('初始化AI财务系统失败:', error);
      }
    }, 1000); // 延迟1秒，避免阻塞界面
    
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
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
    navigateTo('chat', newConversation.id);
  }, [conversations, navigateTo]);

  // 手动触发AI发朋友圈
  const handleRequestAIMoment = async () => {
    const currentConversation = conversations.find(c => c.id === currentConversationId);
    if (!currentConversation) return;
    
    console.log(`🎯 手动触发AI发朋友圈: ${currentConversation.name}`);
    try {
      await generateAIMoment(currentConversation, apiConfig);
      console.log('✅ AI朋友圈发布成功');
    } catch (error) {
      console.error('❌ AI朋友圈发布失败:', error);
    }
  };

  // 渲染当前页面
  const renderScreen = () => {
    const currentConversation = conversations.find(c => c.id === currentConversationId);
    
    switch (currentScreen) {
      case 'home':
        return <HomeScreen onNavigate={navigateTo} theme={theme} />;
      case 'chat':
        return currentConversation ? (
          <ChatScreen 
            conversation={currentConversation}
            apiConfig={apiConfig}
            currentUserProfile={userProfile}
            conversations={conversations}
            onUpdateConversation={updateConversation}
            onDeleteConversation={deleteConversation}
            onBack={() => navigateTo(previousScreen === 'contacts' ? 'contacts' : 'social')}
            onOpenCharacterSettings={() => navigateTo('character-settings')}
            onRequestAIMoment={handleRequestAIMoment}
          />
        ) : (
          <HomeScreen onNavigate={navigateTo} />
        );
      case 'social':
        return (
          <SocialScreen 
            conversations={conversations}
            onNavigate={navigateTo}
            onImportCharacter={handleImportCharacter}
          />
        );
      case 'moments':
        return (
          <MomentsScreen 
            moments={moments}
            conversations={conversations}
            userProfile={userProfile}
            apiConfig={apiConfig}
            onAddMoment={addMoment}
            onLikeMoment={likeMoment}
            onCommentMoment={commentMoment}
            onBack={() => navigateTo(previousScreen === 'profile' ? 'profile' : 'social')}
          />
        );
      case 'profile':
        return (
          <ProfileScreen 
            userProfile={userProfile}
            onUpdateProfile={updateUserProfile}
            onNavigate={navigateTo}
            onBack={() => navigateTo('social')}
            momentsCount={moments.length}
            contactsCount={conversations.filter(c => c.type === 'private').length}
          />
        );
      case 'settings':
        return (
          <SettingsScreen 
            apiConfig={apiConfig}
            onUpdateConfig={setApiConfig}
            onBack={goBack}
          />
        );
      case 'character-settings':
        return currentConversation ? (
          <CharacterSettingsScreen 
            conversation={currentConversation}
            allConversations={conversations}
            apiConfig={apiConfig}
            onUpdateConversation={updateConversation}
            onDeleteConversation={deleteConversation}
            onBack={() => navigateTo('chat')}
          />
        ) : (
          <HomeScreen onNavigate={navigateTo} />
        );
      case 'new-conversation':
        return (
          <NewConversationScreen 
            onNavigateToAddFriend={() => navigateTo('add-friend')}
            onNavigateToCreateGroup={() => navigateTo('create-group')}
            onImportCharacter={handleImportCharacter}
            onBack={() => navigateTo('social')}
          />
        );
      case 'add-friend':
        return (
          <AddFriendScreen 
            onAddFriend={addFriend}
            onBack={() => navigateTo('new-conversation')}
          />
        );
      case 'create-group':
        return (
          <CreateGroupScreen 
            conversations={conversations}
            onCreateGroup={createGroup}
            onBack={() => navigateTo('new-conversation')}
          />
        );
      case 'contacts':
        return (
          <ContactsScreen 
            conversations={conversations}
            onNavigate={navigateTo}
            onBack={() => navigateTo('social')}
          />
        );
      case 'theme':
        return (
          <ThemeScreen
            theme={theme}
            onThemeChange={updateTheme}
            onBack={() => navigateTo('home')}
            onResetLayout={resetDesktopLayout}
          />
        );
      case 'guide':
        return <UserGuide onBack={() => navigateTo('home')} />;
      case 'announcement':
        return <AnnouncementScreen onBack={() => navigateTo('home')} />;
      case 'wallet':
        return (
          <WalletScreen 
            onBack={() => navigateTo('profile')}
            onNavigateToShop={(shopType) => {
              setCurrentShopType(shopType);
              navigateTo('shopping');
            }}
            conversations={conversations}
          />
        );
      case 'shopping':
        return (
          <ShoppingScreen 
            shopType={currentShopType}
            onBack={() => navigateTo('wallet')}
            onPurchase={() => {
              // 购买后刷新，可以触发钱包页面重新加载
            }}
            conversations={conversations}
            onSendGiftToAI={handleSendGiftToAI}
            onRequestAIPay={handleRequestAIPay}
          />
        );
      case 'user-system':
        return (
          <UserSystemScreen 
            onBack={() => navigateTo('home')}
          />
        );
      case 'order-history':
        return (
          <OrderHistoryScreen
            conversations={conversations}
            onBack={() => navigateTo('wallet')}
            onNavigateToChat={(conversationId) => {
              setCurrentConversationId(conversationId);
              navigateTo('chat');
            }}
          />
        );
      case 'database':
        return (
          <DatabaseScreen
            conversations={conversations}
            onBack={() => navigateTo('home')}
          />
        );
      case 'letterbox':
        return (
          <GroupedLetterBoxScreen
            onBack={() => navigateTo('letter-writing')}
            onWriteNew={() => {
              setReplyToLetter(null);
              navigateTo('letter-writing');
            }}
            onContinueReply={(letter) => {
              setReplyToLetter(letter);
              navigateTo('letter-writing');
            }}
            userName={userProfile.username}
          />
        );
      case 'pen-pals':
        return (
          <PenPalListScreen
            onBack={() => navigateTo('letter-writing')}
            onWriteTo={() => {
              // 跟转到写信页面
              navigateTo('letter-writing');
            }}
            userName={userProfile.username}
          />
        );
      case 'archived-letters':
        return (
          <ArchivedLettersScreen
            onBack={() => navigateTo('letter-writing')}
          />
        );
      case 'favorite-letters':
        return (
          <FavoriteLettersScreen
            onBack={() => navigateTo('letter-writing')}
            userName={userProfile.username}
          />
        );
      case 'achievements':
        return (
          <AchievementScreen
            onBack={() => navigateTo('letter-writing')}
          />
        );
      case 'stamp-collection':
        return (
          <StampCollectionScreen
            onBack={() => navigateTo('letter-writing')}
          />
        );
      case 'letter-notifications':
        return (
          <LetterNotificationCenter
            onBack={() => navigateTo('letter-writing')}
            onNotificationClick={(notification) => {
              // 点击通知跳转到对应的信件
              if (notification.letterId) {
                navigateTo('letterbox');
              }
            }}
          />
        );
      case 'bottle-fishing':
        return (
          <BottleFishingScreen
            onBack={() => navigateTo('letter-writing')}
            userName={userProfile.username}
          />
        );
      case 'letter-writing':
        return (
          <div className="relative">
            <LetterWritingScreen
              onBack={() => {
                setReplyToLetter(null);
                navigateTo('home');
              }}
              onSent={() => {
                setReplyToLetter(null);
                navigateTo('letter-writing');
              }}
              conversations={conversations}
              userName={userProfile.username}
              replyToLetter={replyToLetter}
              onNavigate={(page) => navigateTo(page as Screen)}
            />
            <BottomNavBar
              currentPage="letter-writing"
              onNavigate={(page) => {
                setReplyToLetter(null);
                navigateTo(page as Screen);
              }}
            />
          </div>
        );
      case 'unreplied':
        return (
          <UnrepliedLettersScreen
            onBack={() => navigateTo('letter-writing')}
            onReply={(letter) => {
              setReplyToLetter(letter);
              navigateTo('letter-writing');
            }}
          />
        );
      case 'recycle-bin':
        return (
          <RecycleBinScreen
            onBack={() => navigateTo('letter-writing')}
          />
        );
      case 'favorite-replies':
        return (
          <FavoriteRepliesScreen
            onBack={() => navigateTo('letter-writing')}
          />
        );
      case 'kindergarten':
        return (
          <AIKindergartenScreen
            onBack={() => navigateTo('home')}
            onOpenChat={(childId) => {
              setCurrentConversationId(childId);
              navigateTo('chat');
            }}
            apiConfig={apiConfig}
          />
        );
      default:
        return <HomeScreen onNavigate={navigateTo} theme={theme} />;
    }
  };

  return (
    <>
      <div className="w-full h-screen flex items-start justify-center bg-slate-100 fixed inset-0 overflow-hidden pt-[10.5px] md:pt-[14px]">
        {/* 手机容器 - 优化尺寸 (393x800) */}
        <div className="w-[393px] h-[800px] bg-white rounded-[40px] shadow-2xl overflow-hidden relative -mt-[10.2px]">
          {renderScreen()}
          
          {/* 消息通知 - QQ风格顶部弹窗 */}
          <MessageNotification
            conversations={conversations}
            onNavigate={(conversationId) => {
              setCurrentConversationId(conversationId);
              setCurrentScreen('chat');
            }}
          />
        </div>
      </div>
      
      {/* 朋友圈自动生成器 - 后台运行 */}
      <MomentsAutoGenerator 
        conversations={conversations}
        apiConfig={apiConfig}
      />
      
      {/* AI朋友圈互动管理器 - 在聊天App中激活 */}
      <AIMomentsInteractionManager
        conversations={conversations}
        apiConfig={apiConfig}
        isActive={['social', 'chat', 'contacts', 'moments', 'profile'].includes(currentScreen)}
        isInMomentsScreen={currentScreen === 'moments'}
      />
      
      {/* AI主动发消息服务 - 后台运行 */}
      <ProactiveMessagingService
        conversations={conversations}
        apiConfig={apiConfig}
        onNewMessage={addMessageToConversation}
        onUpdateSettings={updateProactiveMessagingTime}
      />
      
      {/* Toast通知容器 */}
      <ToastContainer />
      
      {/* 信件通知 */}
      <LetterNotification />
      
      {/* 成就通知 */}
      <AchievementNotification />
      
      {/* 存储迁移提示 */}
      {showMigrationPrompt && (
        <StorageMigrationPrompt
          onClose={() => setShowMigrationPrompt(false)}
          onMigrationComplete={() => {
            setShowMigrationPrompt(false);
            // 迁移完成后重新加载数据
            window.location.reload();
          }}
        />
      )}
    </>
  );
}

export default App;
