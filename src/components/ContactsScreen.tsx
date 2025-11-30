import { useState, useEffect } from 'react';
import { ChevronLeft, Search, UserPlus, MessageCircle, Users } from 'lucide-react';
import { Conversation, Screen } from '../types';

interface ContactsScreenProps {
  conversations: Conversation[];
  onNavigate: (screen: Screen, conversationId?: string) => void;
  onBack: () => void;
}

interface FriendRequest {
  id: string;
  fromAiId: string;
  fromName: string;
  fromAvatar?: string;
  reason: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected';
}

export default function ContactsScreen({ conversations, onNavigate, onBack, onUpdateConversation }: ContactsScreenProps & { onUpdateConversation?: (id: string, updates: Partial<Conversation>) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewFriends, setShowNewFriends] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  
  // 加载好友申请
  useEffect(() => {
    const loadRequests = () => {
      try {
        const stored = localStorage.getItem('friendRequests');
        if (stored) {
          setRequests(JSON.parse(stored));
        }
      } catch (e) {
        console.error('加载好友申请失败:', e);
      }
    };
    loadRequests();
  }, [showNewFriends]); // 每次打开时刷新

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const latestPendingRequest = requests.find(r => r.status === 'pending');

  // 处理好友申请
  const handleRequest = (req: FriendRequest, accept: boolean) => {
    // 更新请求状态
    const updatedRequests = requests.map(r => 
      r.id === req.id ? { ...r, status: accept ? 'accepted' : 'rejected' } : r
    ) as FriendRequest[];
    
    setRequests(updatedRequests);
    localStorage.setItem('friendRequests', JSON.stringify(updatedRequests));
    
    if (accept && onUpdateConversation) {
      // 1. 解除拉黑
      onUpdateConversation(req.fromAiId, { isBlocked: false });
      
      // 2. 发送通过验证的消息
      // 获取当前会话
      const conversation = conversations.find(c => c.id === req.fromAiId);
      if (conversation) {
        const sysMsg: any = {
          id: `sys_pass_${Date.now()}`,
          role: 'system',
          content: '你已通过了对方的朋友验证请求，现在可以开始聊天了',
          timestamp: Date.now()
        };
        onUpdateConversation(req.fromAiId, {
          messages: [...conversation.messages, sysMsg]
        });
      }
    }
  };

  // 如果显示新的朋友页面
  if (showNewFriends) {
    return (
      <div className="h-full bg-gray-50 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
          <button onClick={() => setShowNewFriends(false)} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold ml-2">新的朋友</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <p>暂无好友申请</p>
            </div>
          ) : (
            <div className="bg-white mt-2">
              {requests.map(req => (
                <div key={req.id} className="px-4 py-3 flex items-center gap-3 border-b border-gray-100 last:border-0">
                   <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden">
                     {req.fromAvatar ? (
                       <img src={req.fromAvatar} className="w-full h-full object-cover" />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-xl">
                         {req.fromName.charAt(0)}
                       </div>
                     )}
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className="font-medium text-gray-900">{req.fromName}</div>
                     <div className="text-sm text-gray-500 truncate">{req.reason}</div>
                   </div>
                   <div>
                     {req.status === 'pending' ? (
                       <div className="flex gap-2">
                         <button 
                           onClick={() => handleRequest(req, false)}
                           className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded font-medium"
                         >
                           拒绝
                         </button>
                         <button 
                           onClick={() => handleRequest(req, true)}
                           className="px-3 py-1.5 bg-green-500 text-white text-xs rounded font-medium"
                         >
                           接受
                         </button>
                       </div>
                     ) : (
                       <span className="text-sm text-gray-400">
                         {req.status === 'accepted' ? '已添加' : '已拒绝'}
                       </span>
                     )}
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 如果显示群聊页面
  if (showGroups) {
    const groups = conversations.filter(c => c.type === 'group');
    const filteredGroups = groups.filter(g => 
      g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="h-full bg-gray-50 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
          <button onClick={() => setShowGroups(false)} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold ml-2">群聊</h1>
          <div className="ml-auto text-sm text-gray-500">
            {groups.length} 个群聊
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white px-4 py-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索群聊"
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Users className="w-16 h-16 mb-4" />
              <p className="text-lg font-medium">
                {searchQuery ? '未找到群聊' : '暂无群聊'}
              </p>
            </div>
          ) : (
            <div className="bg-white mt-2">
              {filteredGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => onNavigate('chat', group.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-100 last:border-0"
                >
                  <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                    {group.avatar ? (
                      <img src={group.avatar} alt={group.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-green-100 text-green-600">
                        <Users className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium text-gray-900 truncate">{group.name}</div>
                    <div className="text-sm text-gray-500 truncate">
                      {group.members?.length || 0} 位成员
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 获取所有联系人（私聊对话）
  const contacts = conversations.filter(conv => conv.type === 'private');

  // 搜索过滤
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
        <button onClick={onBack} className="p-2 -ml-2">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold ml-2">通讯录</h1>
        <div className="ml-auto text-sm text-gray-500">
          {contacts.length} 位联系人
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索联系人"
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 新的朋友入口 */}
      <button 
        onClick={() => setShowNewFriends(true)}
        className="bg-white w-full px-4 py-3 flex items-center gap-3 border-b border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors"
      >
         <div className="w-10 h-10 bg-orange-400 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
            <UserPlus className="text-white w-6 h-6" />
         </div>
         <div className="flex-1 text-left min-w-0">
            <div className="font-medium text-gray-900">新的朋友</div>
            {latestPendingRequest && (
              <div className="text-sm text-gray-500 truncate mt-0.5">
                {latestPendingRequest.fromName}: {latestPendingRequest.reason}
              </div>
            )}
         </div>
         {pendingCount > 0 && (
             <div className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold min-w-[20px] text-center flex-shrink-0">
                {pendingCount}
             </div>
         )}
      </button>

      {/* 群聊入口 */}
      <button 
        onClick={() => setShowGroups(true)}
        className="bg-white w-full px-4 py-3 flex items-center gap-3 mb-2 border-b border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors"
      >
         <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
            <Users className="text-white w-6 h-6" />
         </div>
         <div className="flex-1 text-left font-medium text-gray-900">群聊</div>
      </button>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto">
        {filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <UserPlus className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium">
              {searchQuery ? '未找到联系人' : '当前联系人为空'}
            </p>
            <p className="text-sm mt-2">
              {searchQuery ? '尝试其他搜索词' : '开始新对话来添加联系人'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => onNavigate('new-conversation')}
                className="mt-6 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                新建对话
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white">
            {filteredContacts.map((contact, index) => (
              <button
                key={contact.id}
                onClick={() => onNavigate('chat', contact.id)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors relative"
              >
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getAvatarGradient(contact.name)} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
                  {contact.characterSettings?.avatar || contact.avatar ? (
                    <img 
                      src={contact.characterSettings?.avatar || contact.avatar} 
                      alt={contact.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold text-lg">
                      {contact.name.charAt(0)}
                    </span>
                  )}
                </div>

                {/* Contact Info */}
                <div className="flex-1 min-w-0 text-left">
                  <h3 className="font-medium text-gray-900 truncate">
                    {contact.name}
                  </h3>
                  {contact.characterSettings?.username && (
                    <p className="text-sm text-gray-500 truncate">
                      {contact.characterSettings.username}
                    </p>
                  )}
                </div>

                {/* Chat Icon */}
                <MessageCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />

                {/* Divider */}
                {index < filteredContacts.length - 1 && (
                  <div className="absolute bottom-0 left-16 right-0 h-px bg-gray-100"></div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add Contact Button */}
      <div className="bg-white border-t border-gray-200 p-4">
        <button
          onClick={() => onNavigate('new-conversation')}
          className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 active:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <UserPlus className="w-5 h-5" />
          添加新联系人
        </button>
      </div>
    </div>
  );
}
