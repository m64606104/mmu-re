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
import LetterBoxScreen from './components/LetterBoxScreen';
import LetterWritingScreen from './components/LetterWritingScreen';
import PenPalListScreen from './components/PenPalListScreen';
import ArchivedLettersScreen from './components/ArchivedLettersScreen';
import ToastContainer from './components/ToastContainer';
import { MomentsAutoGenerator } from './components/MomentsAutoGenerator';
import { AIMomentsInteractionManager } from './components/AIMomentsInteractionManager';
import ProactiveMessagingService from './components/ProactiveMessagingService';
import MessageNotification from './components/MessageNotification';
import StorageMigrationPrompt from './components/StorageMigrationPrompt';
import { smartLoad, smartSave, migrateToIndexedDB, checkMigrationNeeded, getStorageInfo } from './utils/storage';
import { generateAIMoment } from './utils/aiMomentsGenerator';
import { backgroundGenerationService } from './utils/backgroundGenerationService';
import { initializeLetterTimers } from './utils/letterService';

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

  // 检查存储迁移需求
  useEffect(() => {
    const checkStorage = async () => {
      // 检查是否需要迁移
      const needsMigration = checkMigrationNeeded();
      
      if (needsMigration) {
        // 检查localStorage使用率
        const info = await getStorageInfo();
        
        // 如果使用率超过60%，显示迁移提示
        if (info.localStorage.percentage > 60) {
          console.log(`📊 localStorage使用率: ${info.localStorage.percentage.toFixed(1)}%，建议迁移`);
          setShowMigrationPrompt(true);
        }
      }
    };
    
    checkStorage();
  }, []);

  // 初始化对话数据
  useEffect(() => {
    const loadData = async () => {
      // 尝试从localStorage迁移到IndexedDB
      await migrateToIndexedDB('conversations');
      
      // 从智能存储加载数据
      const saved = await smartLoad('conversations');
      
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
          await smartSave('conversations', parsed);
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

      // 💰 智能财务系统：自动配置AI收入
      if (loadedConversations.length > 0 && apiConfig) {
        try {
          const { autoConfigureAllIncome } = await import('./utils/smartFinanceSystem');
          const { processAllAutoIncome, upgradeAllExistingAIFinance } = await import('./utils/aiFinance');
          
          // 为所有AI配置收入（仅首次，已配置的会跳过）
          setTimeout(async () => {
            // 🔄 首先升级已存在AI的智能财务系统
            await upgradeAllExistingAIFinance(loadedConversations);
            
            // 为所有AI配置收入
            await autoConfigureAllIncome(loadedConversations, apiConfig);
            
            // 处理一次自动收入
            await processAllAutoIncome();
          }, 3000); // 延迟3秒执行，避免阻塞初始化
        } catch (error) {
          console.error('初始化财务系统失败:', error);
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
        await smartSave('conversations', conversations);
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

  // 📬 初始化慢邮件定时器
  useEffect(() => {
    initializeLetterTimers();
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
          <LetterBoxScreen
            onBack={() => navigateTo('home')}
            onWriteNew={() => navigateTo('letter-writing')}
            onToPenPals={() => navigateTo('pen-pals')}
            toArchived={() => navigateTo('archived-letters')}
            userName={userProfile.username}
          />
        );
      case 'pen-pals':
        return (
          <PenPalListScreen
            onBack={() => navigateTo('letterbox')}
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
            onBack={() => navigateTo('letterbox')}
          />
        );
      case 'letter-writing':
        return (
          <LetterWritingScreen
            onBack={() => navigateTo('letterbox')}
            onSent={() => navigateTo('letterbox')}
            conversations={conversations}
            userName={userProfile.username}
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
