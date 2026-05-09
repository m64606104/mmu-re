import React from 'react';
import { X, User } from 'lucide-react';
import { Conversation } from '../types';

interface SelectContactModalProps {
  onClose: () => void;
  onSelect: (conversationId: string) => void;
  conversations: Conversation[];
  currentConversationId: string;
}

const SelectContactModal: React.FC<SelectContactModalProps> = ({ 
  onClose, 
  onSelect, 
  conversations,
  currentConversationId 
}) => {
  // 过滤掉当前对话
  const availableContacts = conversations.filter(c => c.id !== currentConversationId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl w-[90%] max-w-md max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">选择联系人</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 联系人列表 */}
        <div className="flex-1 overflow-y-auto">
          {availableContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
              <User className="w-16 h-16 mb-4" strokeWidth={1} />
              <p className="text-sm">没有其他联系人</p>
            </div>
          ) : (
            <div className="divide-y">
              {availableContacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => onSelect(contact.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  {/* 头像 */}
                  {contact.avatar ? (
                    <img
                      src={contact.avatar}
                      alt={contact.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-semibold">
                      {contact.name.charAt(0)}
                    </div>
                  )}

                  {/* 名称和类型 */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {contact.characterSettings?.nickname || contact.name}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      {contact.type === 'private' ? '私聊' : '群聊'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectContactModal;
