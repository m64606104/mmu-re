import { useState } from 'react';
import { ChevronLeft, Search, UserPlus, MessageCircle } from 'lucide-react';
import { Conversation, Screen } from '../types';

interface ContactsScreenProps {
  conversations: Conversation[];
  onNavigate: (screen: Screen, conversationId?: string) => void;
  onBack: () => void;
}

export default function ContactsScreen({ conversations, onNavigate, onBack }: ContactsScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');

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
