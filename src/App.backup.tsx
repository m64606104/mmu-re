import { useState, useEffect, useCallback } from 'react';
import SwipeableContainer from './components/SwipeableContainer';
import { Screen, Conversation, ApiConfig, UserProfile, MomentPost } from './types';
import HomeScreen from './components/HomeScreen';
import SettingsScreen from './components/SettingsScreen';
import SocialScreen from './components/SocialScreen';
import ChatScreen from './components/ChatScreen';
import CharacterSettingsScreen from './components/CharacterSettingsScreen';
import NewConversationScreen from './components/NewConversationScreen';
import ProfileScreen from './components/ProfileScreen';
import MomentsScreen from './components/MomentsScreen';
import ContactsScreen from './components/ContactsScreen';
import { 
  shouldTriggerProactiveMessage, 
  generateProactiveMessage, 
  createProactiveMessage,
  DEFAULT_PROACTIVE_CONFIG 
} from './utils/proactiveMessage';
import {
  shouldTriggerAIMoment,
  generateAIMomentContent,
  incrementPostCount,
  shouldAIComment,
  shouldAILike,
  generateAIComment,
  getRecentChatContext,
  DEFAULT_AI_MOMENTS_CONFIG
} from './utils/aiMoments';

// 定义页面顺序
const SCREENS: Screen[] = ['home', 'chat', 'social', 'moments', 'profile', 'settings'];

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [navigationStack, setNavigationStack] = useState<Screen[]>(['home']); // 导航栈
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right'>('right');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [apiConfig, setApiConfig] = useState<ApiConfig>(() => {
    const saved = localStorage.getItem('apiConfig');
    return saved ? JSON.parse(saved) : { baseUrl: '', apiKey: '', modelName: '' };
  });
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('userProfile');
    return saved ? JSON.parse(saved) : { username: '用户', bio: '分享生活，记录美好' };
  });
  const [moments, setMoments] = useState<MomentPost[]>(() => {
    const saved = localStorage.getItem('moments');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const saved = localStorage.getItem('conversations');
    if (saved) {
      setConversations(JSON.parse(saved));
    } else {
      // 添加预设联系人
      const presetContact: Conversation = {
        id: 'preset-aa-' + Date.now(),
        type: 'private',
        name: 'aa',
        messages: [],
        characterSettings: {
          nickname: 'aa不是研究生',
          systemPrompt: '你叫aa，女生，是我的网友，和我关系很好，在上海读研。',
          personality: '喜欢网上冲浪、刷小红书、分享生活',
          languageStyle: '偶尔会使用网络用语，语气轻松活泼',
          languageExample: '哈哈哈太好笑了吧！今天又在小红书上刷到好多有趣的东西～',
          memoryEvents: '',
        },
        lastMessageTime: Date.now(),
        unreadCount: 0,
      };
      setConversations([presetContact]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('conversations', JSON.stringify(conversations));
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

  // AI主动消息功能
  const triggerProactiveMessages = useCallback(async () => {
    for (const conversation of conversations) {
      // 检查是否启用了AI主动消息功能
      if (!conversation.enabledFeatures?.includes('ai-proactive')) continue;
      
      // 只对私聊启用
      if (conversation.type !== 'private') continue;
      
      // 检查是否应该触发
      if (!shouldTriggerProactiveMessage(conversation, DEFAULT_PROACTIVE_CONFIG)) continue;
      
      try {
        // 生成主动消息
        const content = await generateProactiveMessage(conversation, apiConfig);
        const message = createProactiveMessage(content);
        
        // 更新对话
        updateConversation(conversation.id, {
          messages: [...conversation.messages, message],
          lastMessageTime: Date.now(),
          unreadCount: conversation.unreadCount + 1,
        });
        
        console.log(`AI主动消息已发送到: ${conversation.name}`);
      } catch (error) {
        console.error(`生成主动消息失败 (${conversation.name}):`, error);
      }
    }
  }, [conversations, apiConfig]);

  // 定时检查主动消息（每5分钟检查一次）
  useEffect(() => {
    const interval = setInterval(() => {
      triggerProactiveMessages();
    }, 5 * 60 * 1000); // 5分钟

    return () => clearInterval(interval);
  }, [triggerProactiveMessages]);

  // AI自动发朋友圈功能
  const triggerAIMoments = useCallback(async () => {
    for (const conversation of conversations) {
      // 检查是否启用了AI朋友圈功能
      if (!conversation.enabledFeatures?.includes('ai-moments')) continue;
      
      // 只对私聊启用
      if (conversation.type !== 'private') continue;
      
      // 检查是否应该触发
      if (!shouldTriggerAIMoment(conversation.id, DEFAULT_AI_MOMENTS_CONFIG)) continue;
      
      try {
        // 获取最近聊天内容
        const recentChat = getRecentChatContext(conversation, 10);
        
        // 生成朋友圈内容
        const content = await generateAIMomentContent(conversation, apiConfig, recentChat);
        
        // 添加到朋友圈
        const newMoment: MomentPost = {
          id: Date.now().toString() + Math.random(),
          userId: conversation.id,
          username: conversation.characterSettings?.nickname || conversation.name,
          userAvatar: conversation.characterSettings?.avatar,
          content,
          images: [],
          timestamp: Date.now(),
          likes: [],
          comments: [],
        };
        
        setMoments(prev => [newMoment, ...prev]);
        incrementPostCount(conversation.id);
        
        console.log(`${conversation.name} 发布了朋友圈: ${content}`);
      } catch (error) {
        console.error(`AI发朋友圈失败 (${conversation.name}):`, error);
      }
    }
  }, [conversations, apiConfig, setMoments]);

  // 定时检查AI朋友圈（每10分钟检查一次）
  useEffect(() => {
    const interval = setInterval(() => {
      triggerAIMoments();
    }, 10 * 60 * 1000); // 10分钟

    return () => clearInterval(interval);
  }, [triggerAIMoments]);

  // AI智能互动朋友圈（点赞和评论）
  const triggerAIMomentsInteraction = useCallback(async () => {
    // 处理所有朋友圈（用户和AI的）
    for (const moment of moments) {
      for (const conversation of conversations) {
        // 检查是否启用了朋友圈智能互动
        if (!conversation.enabledFeatures?.includes('moments-interaction')) continue;
        
        // 只对私聊启用
        if (conversation.type !== 'private') continue;
        
        try {
          // 点赞
          if (shouldAILike(moment, conversation.id)) {
            setMoments(prev => prev.map(m => {
              if (m.id === moment.id) {
                return {
                  ...m,
                  likes: [...m.likes, conversation.id]
                };
              }
              return m;
            }));
            const targetName = moment.userId === 'user' ? '你' : moments.find(m => m.userId === moment.userId)?.username || '对方';
            console.log(`${conversation.name} 点赞了${targetName}的朋友圈`);
          }
          
          // 评论
          if (shouldAIComment(moment, conversation.id)) {
            const comment = await generateAIComment(conversation, moment.content, apiConfig);
            
            setMoments(prev => prev.map(m => {
              if (m.id === moment.id) {
                return {
                  ...m,
                  comments: [
                    ...m.comments,
                    {
                      id: Date.now().toString() + Math.random(),
                      userId: conversation.id,
                      username: conversation.characterSettings?.nickname || conversation.name,
                      userAvatar: conversation.characterSettings?.avatar,
                      content: comment,
                      timestamp: Date.now(),
                    }
                  ]
                };
              }
              return m;
            }));
            
            const targetName = moment.userId === 'user' ? '你' : moment.username;
            console.log(`${conversation.name} 评论了${targetName}的朋友圈: ${comment}`);
          }
        } catch (error) {
          console.error(`AI互动失败 (${conversation.name}):`, error);
        }
      }
    }
  }, [moments, conversations, apiConfig, setMoments]);

  // 定时检查AI互动（每3分钟检查一次）
  useEffect(() => {
    const interval = setInterval(() => {
      triggerAIMomentsInteraction();
    }, 3 * 60 * 1000); // 3分钟

  // 返回上一页
  const goBack = useCallback(() => {
    if (navigationStack.length > 1 && !isTransitioning) {
      const currentIndex = SCREENS.indexOf(currentScreen);
      const prevScreen = navigationStack[navigationStack.length - 2];
      const prevIndex = SCREENS.indexOf(prevScreen);
      
      setTransitionDirection(prevIndex < currentIndex ? 'right' : 'left');
      setIsTransitioning(true);
      
      setTimeout(() => {
        setNavigationStack(prev => {
          const newStack = [...prev];
          newStack.pop();
          const newScreen = newStack[newStack.length - 1];
          setCurrentScreen(newScreen);
          return newStack;
        });
        setIsTransitioning(false);
      }, 300);
    }
  }, [navigationStack, currentScreen, isTransitioning]);

  // 处理左滑
  const handleSwipeLeft = useCallback(() => {
    const currentIndex = SCREENS.indexOf(currentScreen);
    if (currentIndex < SCREENS.length - 1) {
      const nextScreen = SCREENS[currentIndex + 1];
      navigateTo(nextScreen);
    }
  }, [currentScreen, navigateTo]);

  // 处理右滑
  const handleSwipeRight = useCallback(() => {
    const currentIndex = SCREENS.indexOf(currentScreen);
    if (currentIndex > 0) {
      const prevScreen = SCREENS[currentIndex - 1];
      navigateTo(prevScreen);
    } else {
      goBack();
    }
  }, [currentScreen, navigateTo, goBack]);

  // 渲染当前页面
  const renderScreen = () => {
    const screenProps = {
      onNavigate: navigateTo,
      onBack: goBack,
      currentScreen,
      isActive: true,
      conversations,
      userProfile,
      moments,
      apiConfig,
      currentConversation: conversations.find(c => c.id === currentConversationId),
      onUpdateConversation: updateConversation,
      onUpdateProfile: updateUserProfile,
      onAddMoment: addMoment,
      onLikeMoment: likeMoment,
      onCommentMoment: commentMoment,
      onUpdateConfig: (config: ApiConfig) => {
        setApiConfig(config);
        localStorage.setItem('apiConfig', JSON.stringify(config));
      },
      onOpenCharacterSettings: () => navigateTo('character-settings')
    };

    switch (currentScreen) {
      case 'home':
        return <HomeScreen {...screenProps} />;
      case 'chat':
        return <ChatScreen {...screenProps} />;
      case 'social':
        return <SocialScreen {...screenProps} />;
      case 'moments':
        return <MomentsScreen {...screenProps} />;
      case 'profile':
        return <ProfileScreen {...screenProps} />;
      case 'settings':
        return <SettingsScreen {...screenProps} />;
      case 'character-settings':
        return currentConversationId ? (
          title="返回主屏幕"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      
      {/* Screen content */}
      <div 
        className="w-full h-full transition-transform duration-200"
        style={{ transform: getSwipeTransform() }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {renderScreen()}
    </SwipeableContainer>
            onBack={() => navigateTo('social')}
            onOpenCharacterSettings={() => navigateTo('character-settings')}
            onRequestAIMoment={() => requestAIMoment(currentConversation.id)}
          />
        )}
        {currentScreen === 'character-settings' && currentConversation && (
          <CharacterSettingsScreen 
            conversation={currentConversation}
            onUpdateConversation={updateConversation}
            onBack={() => navigateTo('chat')}
          />
        )}
        {currentScreen === 'new-conversation' && (
          <NewConversationScreen 
            onCreateConversation={createConversation}
            onBack={() => navigateTo('social')}
          />
        )}
        {currentScreen === 'profile' && (
          <ProfileScreen 
            userProfile={userProfile}
            onUpdateProfile={updateUserProfile}
            onNavigate={navigateTo}
            onBack={goBack}
            momentsCount={moments.length}
            contactsCount={conversations.filter(c => c.type === 'private').length}
          />
        )}
        {currentScreen === 'moments' && (
          <MomentsScreen 
            moments={moments}
            userProfile={userProfile}
            onAddMoment={addMoment}
            onLikeMoment={likeMoment}
            onCommentMoment={commentMoment}
            onBack={goBack}
          />
        )}
        {currentScreen === 'contacts' && (
          <ContactsScreen 
            conversations={conversations}
            onNavigate={navigateTo}
            onBack={goBack}
          />
        )}
      </div>
    </div>
  );
}

export default App;
