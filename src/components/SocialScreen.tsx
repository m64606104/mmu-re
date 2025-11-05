import { useState } from 'react';
import { ChevronLeft, Users, Search, MessageCircle, Camera, User, BellOff, Plus, UserPlus, Scan } from 'lucide-react';
import { Conversation, Screen } from '../types';
import StatusSelector from './StatusSelector';

interface SocialScreenProps {
  conversations: Conversation[];
  onNavigate: (screen: Screen, conversationId?: string) => void;
}

export default function SocialScreen({ conversations, onNavigate }: SocialScreenProps) {
  const sortedConversations = [...conversations].sort((a, b) => b.lastMessageTime - a.lastMessageTime);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showStatusSelector, setShowStatusSelector] = useState(false);
  
  // 使用state管理用户资料
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const profile = localStorage.getItem('userProfile');
      if (profile) {
        return JSON.parse(profile);
      }
    } catch (e) {
      console.error('Failed to parse user profile:', e);
    }
    return { username: '123', avatar: null, status: '在线' };
  });

  // 更新用户状态（流畅更新，不刷新页面）
  const handleStatusChange = (newStatus: string) => {
    const updatedProfile = { ...userProfile, status: newStatus };
    setUserProfile(updatedProfile);
    localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return days[date.getDay()];
    } else {
      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    }
  };

  const getAvatarGradient = (name: string) => {
    const gradients = [
      'from-blue-400 to-blue-600',
      'from-purple-400 to-purple-600',
      'from-pink-400 to-pink-600',
      'from-green-400 to-green-600',
      'from-yellow-400 to-yellow-600',
      'from-red-400 to-red-600',
      'from-indigo-400 to-indigo-600',
      'from-teal-400 to-teal-600',
    ];
    const index = name.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-[#EDEDED]'}`}>
      {/* Header - 微信风格 */}
      <div className={`${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-[#F7F7F7]'} ${isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-200'}`}>
        <div className="px-4 pt-2 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* 左上角返回按钮 */}
            <button 
              onClick={() => onNavigate('home')}
              className={`p-2 -ml-2 rounded-lg transition-colors active:scale-95 ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}
            >
              <ChevronLeft className={`w-6 h-6 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} />
            </button>
            <div className="relative">
              {/* 小人偶背景 */}
              <div className="w-10 h-10 rounded-lg overflow-hidden">
                <img 
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=user" 
                  alt="用户头像"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* 小圆形用户头像 */}
              {userProfile.avatar && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full overflow-hidden border-2 border-white shadow-sm">
                  <img 
                    src={userProfile.avatar} 
                    alt="用户头像"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
            <div>
              <h1 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{userProfile.username || '123'}</h1>
              <button 
                onClick={() => setShowStatusSelector(true)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                <span>{userProfile.status || '在线'}</span>
                <ChevronLeft className="w-3 h-3 rotate-180" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 relative">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-lg transition-colors active:scale-95 ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}
              title={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
            >
              {isDarkMode ? (
                <span className="text-lg">☀️</span>
              ) : (
                <span className="text-lg">🌙</span>
              )}
            </button>
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className={`p-2 -mr-2 rounded-lg transition-colors active:scale-95 ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}
            >
              <Plus className={`w-6 h-6 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} />
            </button>
            
            {/* 弹出菜单 */}
            {showMenu && (
              <>
                {/* 遮罩层 */}
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                ></div>
                {/* 菜单内容 */}
                <div className={`absolute top-12 right-0 z-50 w-48 rounded-lg shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#2a2a2a]' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onNavigate('create-group');
                    }}
                    className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                  >
                    <MessageCircle className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} />
                    <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>发起群聊</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onNavigate('add-friend');
                    }}
                    className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                  >
                    <UserPlus className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} />
                    <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>添加朋友</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      alert('扫一扫功能开发中...');
                    }}
                    className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                  >
                    <Scan className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} />
                    <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>扫一扫</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* 搜索框 */}
        <div className="px-4 pb-3">
          <div className={`rounded-lg px-3 py-2 flex items-center gap-2 ${isDarkMode ? 'bg-[#2a2a2a]' : 'bg-white border border-gray-200'}`}>
            <Search className={`w-4 h-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <input 
              type="text" 
              placeholder="搜索" 
              className={`flex-1 text-sm outline-none bg-transparent ${isDarkMode ? 'text-white placeholder-gray-500' : 'text-gray-700 placeholder-gray-400'}`}
              readOnly
            />
          </div>
        </div>
      </div>


      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {sortedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 px-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-6 shadow-lg">
              <MessageCircle className="w-12 h-12 text-white" strokeWidth={2} />
            </div>
            <p className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>暂无对话</p>
            <p className={`text-sm text-center ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>点击右上角 + 号开始新的对话</p>
          </div>
        ) : (
          <div className={isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}>
            {sortedConversations.map((conversation, index) => (
              <button
                key={conversation.id}
                onClick={() => onNavigate('chat', conversation.id)}
                className={`w-full px-4 py-3 flex items-center gap-3 transition-colors relative ${isDarkMode ? 'hover:bg-[#2a2a2a] active:bg-[#333]' : 'hover:bg-gray-50 active:bg-gray-100'}`}
              >
                {/* Avatar - 更精致的头像 */}
                <div className="relative flex-shrink-0">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getAvatarGradient(conversation.name)} flex items-center justify-center shadow-md overflow-hidden`}>
                    {conversation.characterSettings?.avatar ? (
                      <img 
                        src={conversation.characterSettings.avatar} 
                        alt={conversation.name}
                        className="w-full h-full object-cover"
                      />
                    ) : conversation.type === 'group' ? (
                      <Users className="w-6 h-6 text-white" strokeWidth={2.5} />
                    ) : (
                      <span className="text-white font-semibold text-lg">
                        {conversation.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  {/* 未读标记 */}
                  {conversation.unreadCount > 0 && (
                    <div className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center px-1 ${isDarkMode ? 'border-2 border-[#1a1a1a]' : 'border-2 border-white'}`}>
                      <span className="text-white text-[10px] font-semibold">
                        {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-medium truncate text-[15px] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {conversation.name}
                    </span>
                    <span className={`text-[11px] ml-2 flex-shrink-0 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {formatTime(conversation.lastMessageTime)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-[13px] truncate leading-tight ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {conversation.messages.length > 0
                        ? conversation.messages[conversation.messages.length - 1].content
                        : '暂无消息'}
                    </p>
                    {!conversation.unreadCount && (
                      <BellOff className={`w-4 h-4 ml-2 flex-shrink-0 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                    )}
                  </div>
                </div>

                {/* 分割线 */}
                {index < sortedConversations.length - 1 && (
                  <div className={`absolute bottom-0 left-16 right-0 h-px ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}></div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 底部导航栏 */}
      <div className={`border-t ${isDarkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-around px-4 py-2">
          {/* 消息 - 当前页面，高亮显示 */}
          <button className="flex flex-col items-center gap-1 py-1 px-3">
            <MessageCircle className={`w-6 h-6 ${isDarkMode ? 'text-[#07c160]' : 'text-[#07c160]'}`} strokeWidth={2} />
            <span className={`text-[10px] ${isDarkMode ? 'text-[#07c160]' : 'text-[#07c160]'}`}>消息</span>
          </button>
          {/* 通讯录 - 联系人列表 */}
          <button 
            onClick={() => onNavigate('contacts')}
            className="flex flex-col items-center gap-1 py-1 px-3"
          >
            <Users className={`w-6 h-6 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`} strokeWidth={2} />
            <span className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>通讯录</span>
          </button>
          {/* 发现 - 朋友圈 */}
          <button 
            onClick={() => onNavigate('moments')}
            className="flex flex-col items-center gap-1 py-1 px-3"
          >
            <Camera className={`w-6 h-6 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`} strokeWidth={2} />
            <span className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>发现</span>
          </button>
          {/* 我 - 个人资料 */}
          <button 
            onClick={() => onNavigate('profile')}
            className="flex flex-col items-center gap-1 py-1 px-3"
          >
            <User className={`w-6 h-6 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`} strokeWidth={2} />
            <span className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>我</span>
          </button>
        </div>
      </div>

      {/* 状态选择器 */}
      {showStatusSelector && (
        <StatusSelector
          currentStatus={userProfile.status || '在线'}
          onSelectStatus={handleStatusChange}
          onClose={() => setShowStatusSelector(false)}
        />
      )}
    </div>
  );
}
