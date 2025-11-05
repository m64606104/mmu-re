import { useState, useCallback, useEffect } from 'react';
import { Screen, Conversation, ApiConfig, UserProfile, MomentPost, Message, ThemeSettings } from './types';
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
import { MomentsAutoGenerator } from './components/MomentsAutoGenerator';
import { smartLoad, smartSave, migrateToIndexedDB } from './utils/storage';

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

  // 初始化对话数据
  useEffect(() => {
    const loadData = async () => {
      // 尝试从localStorage迁移到IndexedDB
      await migrateToIndexedDB('conversations');
      
      // 从智能存储加载数据
      const saved = await smartLoad('conversations');
      
      if (saved) {
        setConversations(saved);
      } else {
        // 检查旧的localStorage数据
        const oldSaved = localStorage.getItem('conversations');
        if (oldSaved) {
          const parsed = JSON.parse(oldSaved);
          setConversations(parsed);
          // 保存到新存储
          await smartSave('conversations', parsed);
        } else {
          // 添加预设联系人
          const presetContact: Conversation = {
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
          };
          setConversations([presetContact]);
        }
      }
    };
    
    loadData();
  }, []);

  // 保存数据到智能存储
  useEffect(() => {
    const saveData = async () => {
      if (conversations.length > 0) {
        await smartSave('conversations', conversations);
      }
    };
    saveData();
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem('apiConfig', JSON.stringify(apiConfig));
  }, [apiConfig]);

  useEffect(() => {
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('moments', JSON.stringify(moments));
  }, [moments]);

  // 处理页面切换
  const navigateTo = useCallback((screen: Screen, conversationId?: string) => {
    setPreviousScreen(currentScreen); // 记录当前页面作为来源
    if (conversationId) {
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
      lastMessageTime: Date.now(),
      unreadCount: 0,
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
    navigateTo('chat', newConversation.id);
  }, [navigateTo]);

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
      lastMessageTime: Date.now(),
      unreadCount: 0,
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
    navigateTo('chat', newConversation.id);
  }, [conversations, navigateTo]);

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
            onUpdateConversation={updateConversation}
            onBack={() => navigateTo(previousScreen === 'contacts' ? 'contacts' : 'social')}
            onOpenCharacterSettings={() => navigateTo('character-settings')}
          />
        ) : (
          <HomeScreen onNavigate={navigateTo} />
        );
      case 'social':
        return (
          <SocialScreen 
            conversations={conversations}
            onNavigate={navigateTo}
          />
        );
      case 'moments':
        return (
          <MomentsScreen 
            moments={moments}
            userProfile={userProfile}
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
      default:
        return <HomeScreen onNavigate={navigateTo} theme={theme} />;
    }
  };

  return (
    <>
      <div className="w-full h-screen flex items-start justify-center bg-slate-100 fixed inset-0 overflow-hidden">
        {/* 手机容器 - 优化尺寸 (393x750) */}
        <div className="w-[393px] h-[750px] bg-white rounded-[40px] shadow-2xl overflow-hidden relative mt-2">
          {renderScreen()}
        </div>
      </div>
      
      {/* 朋友圈自动生成器 - 后台运行 */}
      <MomentsAutoGenerator 
        conversations={conversations}
        apiConfig={apiConfig}
      />
    </>
  );
}

export default App;
