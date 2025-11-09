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
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors active:scale-95"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex items-center gap-3">
            {conversation.characterSettings?.avatar ? (
              <img
                src={conversation.characterSettings.avatar}
                alt={conversation.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center border-2 border-white/20">
                <Users className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-semibold text-white">
                {conversation.characterSettings?.nickname || conversation.name} 的关系网络
              </h1>
              <p className="text-xs text-gray-400">
                社交关系管理
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
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
