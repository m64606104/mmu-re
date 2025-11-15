import React, { useState } from 'react';
import { X, Users, MessageCircle, Info } from 'lucide-react';
import { Conversation } from '../types';

interface GroupChatSettingsModalProps {
  conversation: Conversation;
  onClose: () => void;
  onUpdateConversation: (conversationId: string, updates: Partial<Conversation>) => void;
}

const GroupChatSettingsModal: React.FC<GroupChatSettingsModalProps> = ({
  conversation,
  onClose,
  onUpdateConversation,
}) => {
  const [groupChatMode, setGroupChatMode] = useState<'sequential' | 'free'>(
    conversation.groupChatMode || 'sequential'
  );

  const handleSave = () => {
    onUpdateConversation(conversation.id, {
      groupChatMode: groupChatMode,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-[90%] max-w-md max-h-[80vh] overflow-hidden shadow-2xl">
        {/* 标题栏 */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6" />
            <h2 className="text-lg font-semibold">群聊设置</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          {/* 群聊信息 */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md">
                {conversation.avatar ? (
                  <img src={conversation.avatar} alt={conversation.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                    <span className="text-white font-semibold">{conversation.name.charAt(0)}</span>
                  </div>
                )}
              </div>
              <div>
                <div className="font-semibold text-gray-900">{conversation.name}</div>
                <div className="text-sm text-gray-500">{conversation.members?.length || 0} 名成员</div>
              </div>
            </div>
            {conversation.groupRemark && (
              <div className="text-sm text-gray-600">
                备注：{conversation.groupRemark}
              </div>
            )}
          </div>

          {/* 回复模式选择 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900">回复模式</h3>
            </div>
            
            <div className="space-y-3">
              {/* 顺序模式 */}
              <button
                onClick={() => setGroupChatMode('sequential')}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  groupChatMode === 'sequential'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="font-medium text-gray-900">顺序模式</div>
                  {groupChatMode === 'sequential' && (
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  所有AI成员依次回复，确保每个AI都能发言
                </div>
              </button>

              {/* 自由模式 */}
              <button
                onClick={() => setGroupChatMode('free')}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  groupChatMode === 'free'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="font-medium text-gray-900">自由模式</div>
                  {groupChatMode === 'free' && (
                    <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  随机选择0到全部AI回复，AI之间可以自由对话
                </div>
              </button>
            </div>
          </div>

          {/* 自由模式说明 */}
          {groupChatMode === 'free' && (
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <div className="font-medium text-purple-900 mb-2">自由模式特性：</div>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>每次生成时随机选择参与回复的AI数量</li>
                    <li>AI可以根据其他AI的消息进行回复</li>
                    <li>AI可以引入新话题，保持对话活跃</li>
                    <li>即使没有新消息，AI也会继续聊天</li>
                    <li>如果没有AI回复，会显示提示信息</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupChatSettingsModal;
