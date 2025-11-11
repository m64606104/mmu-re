import React, { useState } from 'react';
import { X, Plus, MessageCircle, Trash2, Edit2, Check } from 'lucide-react';
import { SubChat } from '../types';

interface SubChatManagerProps {
  subChats: SubChat[];
  onClose: () => void;
  onSelectSubChat: (subChatId: string) => void;
  onCreateSubChat: (name: string) => void;
  onRenameSubChat: (subChatId: string, newName: string) => void;
  onDeleteSubChat: (subChatId: string) => void;
}

const SubChatManager: React.FC<SubChatManagerProps> = ({
  subChats,
  onClose,
  onSelectSubChat,
  onCreateSubChat,
  onRenameSubChat,
  onDeleteSubChat,
}) => {
  const [newChatName, setNewChatName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreate = () => {
    if (!newChatName.trim()) return;
    onCreateSubChat(newChatName.trim());
    setNewChatName('');
    setShowCreateForm(false);
  };

  const handleRename = (subChatId: string) => {
    if (!editName.trim()) return;
    onRenameSubChat(subChatId, editName.trim());
    setEditingId(null);
    setEditName('');
  };

  const startEdit = (subChat: SubChat) => {
    setEditingId(subChat.id);
    setEditName(subChat.name);
  };

  const activeSubChats = subChats.filter(sc => sc.status !== 'closed');
  const pendingSubChats = activeSubChats.filter(sc => sc.status === 'pending');
  const activeChats = activeSubChats.filter(sc => sc.status === 'active');

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[600px] flex flex-col overflow-hidden shadow-2xl">
        {/* 标题栏 */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <h2 className="text-lg font-semibold">子聊天管理</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* 创建新子聊天 */}
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full py-3 border-2 border-dashed border-purple-300 rounded-xl text-purple-600 hover:bg-purple-50 transition-colors flex items-center justify-center gap-2 mb-4"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">创建新子聊天</span>
            </button>
          ) : (
            <div className="mb-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
              <h3 className="text-sm font-semibold text-purple-900 mb-2">创建新子聊天</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="输入子聊天名称..."
                  className="flex-1 px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                  autoFocus
                />
                <button
                  onClick={handleCreate}
                  disabled={!newChatName.trim()}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  创建
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewChatName('');
                  }}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-sm"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* 待接受的子聊天请求 */}
          {pendingSubChats.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">待接受</h3>
              <div className="space-y-2">
                {pendingSubChats.map((subChat) => (
                  <div
                    key={subChat.id}
                    className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{subChat.name}</h4>
                        {subChat.purpose && (
                          <p className="text-xs text-gray-600 mt-1">{subChat.purpose}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onSelectSubChat(subChat.id)}
                        className="flex-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition-colors"
                      >
                        接受
                      </button>
                      <button
                        onClick={() => onDeleteSubChat(subChat.id)}
                        className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                      >
                        拒绝
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 活跃的子聊天列表 */}
          {activeChats.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                活跃对话 ({activeChats.length})
              </h3>
              <div className="space-y-2">
                {activeChats.map((subChat) => (
                  <div
                    key={subChat.id}
                    className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl hover:shadow-md transition-all"
                  >
                    {editingId === subChat.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleRename(subChat.id)}
                          className="flex-1 px-2 py-1 border border-purple-300 rounded text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => handleRename(subChat.id)}
                          className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{subChat.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-500">
                                {subChat.messages.length} 条消息
                              </p>
                              {subChat.unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                  {subChat.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => startEdit(subChat)}
                              className="p-1.5 hover:bg-white/50 rounded transition-colors"
                              title="重命名"
                            >
                              <Edit2 className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('确定要删除这个子聊天吗？')) {
                                  onDeleteSubChat(subChat.id);
                                }
                              }}
                              className="p-1.5 hover:bg-white/50 rounded transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => onSelectSubChat(subChat.id)}
                          className="w-full px-3 py-1.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white text-sm rounded-lg transition-all"
                        >
                          打开
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : !showCreateForm && pendingSubChats.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <MessageCircle className="w-16 h-16 mb-3 opacity-30" />
              <p className="text-sm">还没有子聊天</p>
              <p className="text-xs mt-1">点击上方按钮创建一个</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubChatManager;
