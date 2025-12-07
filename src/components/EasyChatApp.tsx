import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { EasyChatContact, EasyChatConversation, EasyChatUser, GlobalCallState, ApiConfig } from '../types';
import { EasyChatSplash } from './EasyChatSplash';
import { EasyChatIntro } from './EasyChatIntro';
import { EasyChatHome } from './EasyChatHome';
import { EasyChatList } from './EasyChatList';
import { EasyChatRoom } from './EasyChatRoom';
import { EasyChatContactsManager } from './EasyChatContactsManager';
import { EasyChatSettings } from './EasyChatSettings';
import { EasyChatUserSettings } from './EasyChatUserSettings';
import { FloatingCallWindow } from './FloatingCallWindow';
import { EasyChatForum } from './EasyChatForum';
import { load, save, checkMigrationNeeded, migrateData } from '../utils/storage';
import { toast } from 'sonner';

import { Toaster } from './ui/sonner';

interface EasyChatAppProps {
  onBack: () => void;
}

export function EasyChatApp({ onBack }: EasyChatAppProps) {
  const [showSplash, setShowSplash] = useState(true);
  const [showIntro, setShowIntro] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'chatList' | 'chatRoom' | 'contactsManager' | 'settings' | 'userSettings' | 'forum'>('home');
  const [contacts, setContacts] = useState<EasyChatContact[]>([]);
  const [conversations, setConversations] = useState<EasyChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<EasyChatConversation | null>(null);
  const [user, setUser] = useState<EasyChatUser>({ id: 'me', name: '我', avatar: '😊', bubbleColor: 'blue' });
  const [globalCallState, setGlobalCallState] = useState<GlobalCallState | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    baseUrl: localStorage.getItem('api_url') || '',
    apiKey: localStorage.getItem('api_key') || '',
    modelName: localStorage.getItem('api_model') || 'gpt-3.5-turbo',
  });
  
  // UI风格状态管理
  const [uiStyle, setUiStyle] = useState<'default' | 'wechat'>(() => {
    return (localStorage.getItem('easychat_ui_style') as 'default' | 'wechat') || 'default';
  });
  
  // 底部导航栏Tab状态
  type TabType = 'chat' | 'contacts' | 'settings';
  const [activeTab, setActiveTab] = useState<TabType>('chat');

  // 检查是否首次启动
  useEffect(() => {
    const isFirstLaunch = !localStorage.getItem('easychat_launched');
    if (isFirstLaunch) {
      setShowIntro(true);
    }
  }, []);

  // 从存储加载数据（迁移至 IndexedDB）
  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. 检查是否需要迁移数据 (localStorage -> IndexedDB)
        if (checkMigrationNeeded()) {
          console.log('检测到旧数据，开始迁移...');
          const result = await migrateData();
          if (result.success) {
            console.log('EasyChat 数据迁移成功');
          } else {
            console.warn('EasyChat 数据迁移部分失败', result.errors);
          }
        }

        // 2. 从 IndexedDB 加载数据
        const savedContacts = await load('easychat_contacts');
        const savedConversations = await load('easychat_conversations');
        const savedUser = await load('easychat_user');
        
        if (savedContacts) setContacts(savedContacts);
        if (savedConversations) setConversations(savedConversations);
        if (savedUser) setUser(savedUser);
      } catch (error) {
        console.error('加载数据失败:', error);
        toast.error('数据加载出错，请尝试刷新');
      } finally {
        setIsLoaded(true);
      }
    };

    loadData();
  }, []);

  // 保存联系人到存储（带防抖）
  useEffect(() => {
    if (!isLoaded) return;

    const timer = setTimeout(() => {
      save('easychat_contacts', contacts).catch(console.error);
    }, 1000); // 1秒内无变化才保存

    return () => clearTimeout(timer);
  }, [contacts, isLoaded]);

  // 保存会话到存储（带防抖）
  useEffect(() => {
    if (!isLoaded) return;

    const timer = setTimeout(() => {
      save('easychat_conversations', conversations).catch(console.error);
    }, 1000); // 1秒内无变化才保存

    return () => clearTimeout(timer);
  }, [conversations, isLoaded]);

  // 保存用户到存储（带防抖）
  useEffect(() => {
    if (!isLoaded) return;

    const timer = setTimeout(() => {
      save('easychat_user', user).catch(console.error);
    }, 1000); // 1秒内无变化才保存

    return () => clearTimeout(timer);
  }, [user, isLoaded]);

  // 开屏动画结束后
  const handleSplashEnd = () => {
    setShowSplash(false);
  };

  // 介绍页结束后
  const handleIntroFinish = () => {
    setShowIntro(false);
    localStorage.setItem('easychat_launched', 'true');
  };

  // 打开聊天列表
  const handleOpenChatList = () => {
    setCurrentView('chatList');
    setActiveTab('chat');
  };
  
  // 打开论坛
  const handleOpenForum = () => {
    setCurrentView('forum');
  };

  // 打开联系人管理
  const handleOpenContactsManager = () => {
    setCurrentView('contactsManager');
  };

  // 打开用户设置
  const handleOpenUserSettings = () => {
    setCurrentView('userSettings');
  };

  // 返回主页
  const handleBackToHome = () => {
    setCurrentView('home');
    setSelectedConversation(null);
  };

  // 打开聊天室
  const handleOpenChatRoom = (conversation: EasyChatConversation) => {
    setSelectedConversation(conversation);
    setCurrentView('chatRoom');
  };

  // 返回聊天列表
  const handleBackToChatList = () => {
    setCurrentView('chatList');
    setSelectedConversation(null);
  };

  // 打开设置
  const handleOpenSettings = () => {
    setCurrentView('settings');
  };

  // 从设置返回聊天室
  const handleBackFromSettings = () => {
    setCurrentView('chatRoom');
  };

  // 从用户设置返回主页
  const handleBackFromUserSettings = () => {
    setCurrentView('home');
  };

  // 更新会话
  const handleUpdateConversation = (updatedConversation: EasyChatConversation) => {
    setConversations(conversations.map(c => 
      c.id === updatedConversation.id ? updatedConversation : c
    ));
    setSelectedConversation(updatedConversation);
  };

  // 更新联系人
  const handleUpdateContact = (updatedContact: EasyChatContact) => {
    setContacts(contacts.map(c => 
      c.id === updatedContact.id ? updatedContact : c
    ));
  };

  // 删除会话
  const handleDeleteConversation = (conversationId: string) => {
    setConversations(conversations.filter(c => c.id !== conversationId));
    setSelectedConversation(null);
    // 删除后返回聊天列表
    setCurrentView('chatList');
  };

  // 更新用户
  const handleUpdateUser = (updatedUser: EasyChatUser) => {
    setUser(updatedUser);
  };

  // 显示开屏页
  if (showSplash) {
    return <EasyChatSplash onFinish={handleSplashEnd} userBubbleColor={user.bubbleColor} />;
  }

  // 显示介绍页（仅首次启动）
  if (showIntro) {
    return <EasyChatIntro onFinish={handleIntroFinish} />;
  }

  // 显示主页
  // 渲染当前视图的内容
  let currentViewContent = null;
  
  // 聊天室和设置页面需要全屏显示
  if (currentView === 'home') {
    currentViewContent = (
      <EasyChatHome
        onBack={onBack}
        onOpenChatList={handleOpenChatList}
        onOpenForum={handleOpenForum}
        onOpenUserSettings={handleOpenUserSettings}
        userName={user.name}
        userAvatar={user.avatar}
        userBubbleColor={user.bubbleColor}
      />
    );
  } else if (currentView === 'forum') {
    currentViewContent = (
      <EasyChatForum
        user={user}
        contacts={contacts}
        conversations={conversations}
        apiConfig={apiConfig}
        onBack={handleBackToHome}
      />
    );
  } else if (currentView === 'contactsManager') {
      currentViewContent = (
        <EasyChatContactsManager
          onBack={handleBackToHome}
          contacts={contacts}
          setContacts={setContacts}
        />
      );
  } else if (currentView === 'chatRoom' && selectedConversation) {
    currentViewContent = (
      <EasyChatRoom
        conversation={selectedConversation}
        contacts={contacts}
        user={user}
        onBack={handleBackToChatList}
        onUpdateConversation={handleUpdateConversation}
        onOpenSettings={handleOpenSettings}
        onStartGlobalCall={setGlobalCallState}
        uiStyle={uiStyle}
      />
    );
  } else if (currentView === 'userSettings') {
    currentViewContent = (
      <EasyChatUserSettings
        user={user}
        onBack={handleBackFromUserSettings}
        onUpdateUser={handleUpdateUser}
        uiStyle={uiStyle}
        onChangeUiStyle={(style) => {
          setUiStyle(style);
          localStorage.setItem('easychat_ui_style', style);
          toast.success(`已切换到${style === 'wechat' ? '微信' : '默认'}风格`);
        }}
      />
    );
  } else {
    // 聊天列表 / Tab视图
    currentViewContent = (
      <div className="w-full h-full flex flex-col bg-white">
        {/* 主内容区 */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chat' && (
            <EasyChatList
              onBack={handleBackToHome} // 修改返回逻辑，返回 Home
              conversations={conversations}
              setConversations={setConversations}
              contacts={contacts}
              setContacts={setContacts}
              onOpenChatRoom={handleOpenChatRoom}
              uiStyle={uiStyle}
            />
          )}
          {activeTab === 'contacts' && (
            <EasyChatContactsManager
              onBack={() => setActiveTab('chat')}
              contacts={contacts}
              setContacts={setContacts}
            />
          )}
          {activeTab === 'settings' && (
            <EasyChatUserSettings
              user={user}
              onBack={() => setActiveTab('chat')}
              onUpdateUser={handleUpdateUser}
              uiStyle={uiStyle}
              onChangeUiStyle={(style) => {
                setUiStyle(style);
                localStorage.setItem('easychat_ui_style', style);
                toast.success(`已切换到${style === 'wechat' ? '微信' : '默认'}风格`);
              }}
            />
          )}
        </div>

        {/* 底部导航栏 */}
        <div className="flex-shrink-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around px-4">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              activeTab === 'chat' ? 'text-blue-500' : 'text-gray-500'
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill={activeTab === 'chat' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs">聊天</span>
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              activeTab === 'contacts' ? 'text-blue-500' : 'text-gray-500'
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill={activeTab === 'contacts' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-xs">联系人</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              activeTab === 'settings' ? 'text-blue-500' : 'text-gray-500'
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill={activeTab === 'settings' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs">设置</span>
          </button>
        </div>
      </div>
    );
  }

  // 打开聊天的回调（从悬浮窗）
  const handleOpenChatFromCall = (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setSelectedConversation(conversation);
      setCurrentView('chatRoom');
    }
  };

  return (
    <>
      <Toaster />
      {currentViewContent}
      
      {/* 全局悬浮窗 - 在所有页面都显示 */}
      {globalCallState && (
        <FloatingCallWindow
          callState={globalCallState}
          contacts={contacts}
          user={user}
          onClose={() => setGlobalCallState(null)}
          onOpenChat={(conversationId) => {
            const conversation = conversations.find(c => c.id === conversationId);
            if (conversation) {
              setSelectedConversation(conversation);
              setCurrentView('chatRoom');
            }
          }}
          onUpdateCallState={setGlobalCallState}
          onUpdateConversation={handleUpdateConversation}
        />
      )}
    </>
  );
}