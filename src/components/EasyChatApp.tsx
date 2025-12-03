import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { EasyChatContact, EasyChatConversation, EasyChatUser, GlobalCallState } from '../types';
import { EasyChatSplash } from './EasyChatSplash';
import { EasyChatIntro } from './EasyChatIntro';
import { EasyChatHome } from './EasyChatHome';
import { EasyChatList } from './EasyChatList';
import { EasyChatRoom } from './EasyChatRoom';
import { EasyChatContactsManager } from './EasyChatContactsManager';
import { EasyChatSettings } from './EasyChatSettings';
import { EasyChatUserSettings } from './EasyChatUserSettings';
import { FloatingCallWindow } from './FloatingCallWindow';
import { load, save, checkMigrationNeeded, migrateData } from '../utils/storage';
import { toast } from 'sonner';

interface EasyChatAppProps {
  onBack: () => void;
}

export function EasyChatApp({ onBack }: EasyChatAppProps) {
  const [showSplash, setShowSplash] = useState(true);
  const [showIntro, setShowIntro] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'chatList' | 'chatRoom' | 'contactsManager' | 'settings' | 'userSettings'>('home');
  const [contacts, setContacts] = useState<EasyChatContact[]>([]);
  const [conversations, setConversations] = useState<EasyChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<EasyChatConversation | null>(null);
  const [user, setUser] = useState<EasyChatUser>({ id: 'me', name: '我', avatar: '😊', bubbleColor: 'blue' });
  const [globalCallState, setGlobalCallState] = useState<GlobalCallState | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

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
        
        if (savedContacts) {
          setContacts(savedContacts);
        }
        
        if (savedConversations) {
          setConversations(savedConversations);
        }

        if (savedUser) {
          setUser(savedUser);
        }
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
  
  if (currentView === 'home') {
    currentViewContent = (
      <EasyChatHome
        onBack={onBack}
        onOpenChatList={handleOpenChatList}
        onOpenContactsManager={handleOpenContactsManager}
        onOpenUserSettings={handleOpenUserSettings}
        userName={user.name}
        userAvatar={user.avatar}
        userBubbleColor={user.bubbleColor}
      />
    );
  } else if (currentView === 'chatList') {
    currentViewContent = (
      <EasyChatList
        onBack={handleBackToHome}
        conversations={conversations}
        setConversations={setConversations}
        contacts={contacts}
        setContacts={setContacts}
        onOpenChatRoom={handleOpenChatRoom}
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
  } else if (currentView === 'settings' && selectedConversation) {
    currentViewContent = (
      <EasyChatSettings
        conversation={selectedConversation}
        contacts={contacts}
        onBack={handleBackFromSettings}
        onUpdateConversation={handleUpdateConversation}
        onDeleteConversation={handleDeleteConversation}
        onUpdateContact={handleUpdateContact}
      />
    );
  } else if (currentView === 'userSettings') {
    currentViewContent = (
      <EasyChatUserSettings
        user={user}
        onBack={handleBackFromUserSettings}
        onUpdateUser={handleUpdateUser}
      />
    );
  }

  return (
    <>
      {currentViewContent}
      
      {/* 全局悬浮窗 - 在所有页面都显示 */}
      {globalCallState && (
        <FloatingCallWindow
          callState={globalCallState}
          contacts={contacts}
          user={user}
          onClose={() => setGlobalCallState(null)}
          onOpenChat={(conversationId) => {
            // 找到对应的会话并打开
            const conv = conversations.find(c => c.id === conversationId);
            if (conv) {
              setSelectedConversation(conv);
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