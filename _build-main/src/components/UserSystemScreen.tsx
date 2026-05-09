/**
 * 用户系统界面 - 注册、好友管理、用户聊天
 */

import { useState, useEffect } from 'react';
import { Users, UserPlus, MessageCircle, Settings, Copy, Check } from 'lucide-react';
import { 
  getCurrentUser, 
  createUser, 
  getFriendsList, 
  addFriend,
  isFirstTimeUser,
  type User,
  type Friend
} from '../utils/userSystem';
import { 
  getConversations, 
  sendMessageToUser, 
  getChatHistory,
  markConversationAsRead,
  startMessageSync,
  stopMessageSync,
  type Conversation,
  type UserMessage 
} from '../utils/messageSystem';

interface UserSystemScreenProps {
  onBack: () => void;
}

type Screen = 'main' | 'register' | 'addFriend' | 'chat' | 'profile';

export default function UserSystemScreen({ onBack }: UserSystemScreenProps) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('main');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [chatHistory, setChatHistory] = useState<UserMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  
  // 注册相关状态
  const [nickname, setNickname] = useState('');
  const [addFriendCode, setAddFriendCode] = useState('');
  const [addFriendNickname, setAddFriendNickname] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // 检查是否首次使用
    if (isFirstTimeUser()) {
      setCurrentScreen('register');
    } else {
      setCurrentUser(getCurrentUser());
      loadFriendsAndConversations();
      startMessageSync();
    }

    return () => {
      stopMessageSync();
    };
  }, []);

  const loadFriendsAndConversations = () => {
    setFriends(getFriendsList());
    setConversations(getConversations());
  };

  const handleRegister = () => {
    if (!nickname.trim()) {
      alert('请输入昵称');
      return;
    }

    const user = createUser(nickname.trim(), generateAvatar(nickname));
    setCurrentUser(user);
    setCurrentScreen('main');
    startMessageSync();
    alert(`注册成功！您的用户码是: ${user.userCode}`);
  };

  const generateAvatar = (nickname: string): string => {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nickname)}`;
  };

  const handleAddFriend = () => {
    if (!addFriendCode.trim()) {
      alert('请输入好友用户码');
      return;
    }

    const friendNickname = addFriendNickname.trim() || `用户${addFriendCode}`;
    const success = addFriend(
      addFriendCode.trim().toUpperCase(), 
      friendNickname,
      generateAvatar(friendNickname)
    );

    if (success) {
      alert('添加好友成功！');
      loadFriendsAndConversations();
      setAddFriendCode('');
      setAddFriendNickname('');
      setCurrentScreen('main');
    } else {
      alert('添加失败，可能已经是好友或用户码无效');
    }
  };

  const handleStartChat = (friend: Friend) => {
    setSelectedFriend(friend);
    const history = getChatHistory(friend.userCode);
    setChatHistory(history);
    markConversationAsRead(friend.userCode);
    loadFriendsAndConversations(); // 刷新未读数
    setCurrentScreen('chat');
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedFriend) return;

    const message = sendMessageToUser(selectedFriend.userCode, messageInput.trim());
    if (message) {
      setChatHistory(prev => [...prev, message]);
      loadFriendsAndConversations(); // 刷新对话列表
    }
    setMessageInput('');
  };

  const copyUserCode = () => {
    if (currentUser) {
      navigator.clipboard.writeText(currentUser.userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 注册界面
  if (currentScreen === 'register') {
    return (
      <div className="h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col justify-center items-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">欢迎加入聊天世界</h1>
            <p className="text-gray-600">设置您的昵称开始使用</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                昵称
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="请输入昵称"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={20}
              />
            </div>

            <button
              onClick={handleRegister}
              disabled={!nickname.trim()}
              className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              开始使用
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 主界面
  if (currentScreen === 'main') {
    return (
      <div className="h-screen bg-gray-50 flex flex-col">
        {/* 头部 */}
        <div className="bg-white border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                ←
              </button>
              <h1 className="text-lg font-semibold ml-2">好友聊天</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentScreen('addFriend')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <UserPlus className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentScreen('profile')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 对话列表 */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">暂无聊天记录</p>
              <p className="text-sm">添加好友开始聊天吧</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {conversations.map((conversation) => {
                const friendCode = conversation.participants.find(p => p !== currentUser?.userCode);
                const friend = friends.find(f => f.userCode === friendCode);
                if (!friend) return null;

                return (
                  <div
                    key={conversation.id}
                    onClick={() => handleStartChat(friend)}
                    className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center">
                      <img
                        src={friend.avatar}
                        alt={friend.nickname}
                        className="w-12 h-12 rounded-full"
                      />
                      <div className="flex-1 ml-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-800">{friend.nickname}</h3>
                          <span className="text-xs text-gray-500">
                            {conversation.lastMessage ? new Date(conversation.lastMessage.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm text-gray-600 truncate">
                            {conversation.lastMessage?.content || '开始聊天吧'}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 添加好友界面
  if (currentScreen === 'addFriend') {
    return (
      <div className="h-screen bg-gray-50 flex flex-col">
        <div className="bg-white border-b px-4 py-3">
          <div className="flex items-center">
            <button 
              onClick={() => setCurrentScreen('main')} 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ←
            </button>
            <h1 className="text-lg font-semibold ml-2">添加好友</h1>
          </div>
        </div>

        <div className="flex-1 p-6">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  好友用户码
                </label>
                <input
                  type="text"
                  value={addFriendCode}
                  onChange={(e) => setAddFriendCode(e.target.value.toUpperCase())}
                  placeholder="输入6位用户码"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  好友备注 (可选)
                </label>
                <input
                  type="text"
                  value={addFriendNickname}
                  onChange={(e) => setAddFriendNickname(e.target.value)}
                  placeholder="给好友设置备注名"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleAddFriend}
                disabled={!addFriendCode.trim()}
                className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                添加好友
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 用户资料界面
  if (currentScreen === 'profile') {
    return (
      <div className="h-screen bg-gray-50 flex flex-col">
        <div className="bg-white border-b px-4 py-3">
          <div className="flex items-center">
            <button 
              onClick={() => setCurrentScreen('main')} 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ←
            </button>
            <h1 className="text-lg font-semibold ml-2">个人资料</h1>
          </div>
        </div>

        <div className="flex-1 p-6">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex flex-col items-center mb-6">
              <img
                src={currentUser?.avatar}
                alt={currentUser?.nickname}
                className="w-20 h-20 rounded-full mb-4"
              />
              <h2 className="text-xl font-bold text-gray-800">{currentUser?.nickname}</h2>
              <div className="flex items-center mt-2 bg-gray-100 rounded-xl px-4 py-2">
                <span className="text-sm text-gray-600 mr-2">用户码: {currentUser?.userCode}</span>
                <button
                  onClick={copyUserCode}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-center text-gray-600">
                <p className="text-sm">分享您的用户码，让好友添加您</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 聊天界面
  if (currentScreen === 'chat' && selectedFriend) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col">
        <div className="bg-white border-b px-4 py-3">
          <div className="flex items-center">
            <button 
              onClick={() => setCurrentScreen('main')} 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ←
            </button>
            <img
              src={selectedFriend.avatar}
              alt={selectedFriend.nickname}
              className="w-8 h-8 rounded-full ml-2"
            />
            <h1 className="text-lg font-semibold ml-3">{selectedFriend.nickname}</h1>
          </div>
        </div>

        {/* 聊天记录 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatHistory.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>开始聊天吧</p>
            </div>
          ) : (
            chatHistory.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.fromUserId === currentUser?.userCode ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                    message.fromUserId === currentUser?.userCode
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-800 shadow-sm'
                  }`}
                >
                  <p>{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.fromUserId === currentUser?.userCode ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 输入框 */}
        <div className="bg-white border-t p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="输入消息..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSendMessage}
              disabled={!messageInput.trim()}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
