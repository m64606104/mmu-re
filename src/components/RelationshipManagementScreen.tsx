/**
 * 关系管理独立页面
 * 可以从角色设置或主菜单访问
 */

import { ChevronLeft, Users } from 'lucide-react';
import { Conversation, ApiConfig } from '../types';
import RelationshipManager from './RelationshipManager';

interface RelationshipManagementScreenProps {
  conversation: Conversation;
  allConversations: Conversation[];
  apiConfig: ApiConfig;
  onBack: () => void;
}

export default function RelationshipManagementScreen({
  conversation,
  allConversations,
  apiConfig,
  onBack
}: RelationshipManagementScreenProps) {
  // 过滤出可用的联系人（排除当前角色和群聊）
  const availableContacts = allConversations.filter(
    c => c.id !== conversation.id && c.type === 'private' && c.characterSettings
  );

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex items-center gap-3">
            {conversation.characterSettings?.avatar ? (
              <img
                src={conversation.characterSettings.avatar}
                alt={conversation.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center border-2 border-gray-200">
                <Users className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {conversation.characterSettings?.nickname || conversation.name} 的关系网络
              </h1>
              <p className="text-xs text-gray-500">
                社交关系管理
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-safe">
        <RelationshipManager
          characterId={conversation.id}
          characterName={conversation.characterSettings?.nickname || conversation.name}
          characterAvatar={conversation.characterSettings?.avatar || conversation.avatar}
          availableContacts={availableContacts}
          apiConfig={apiConfig}
        />
      </div>
    </div>
  );
}
