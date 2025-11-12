/**
 * 转发目标选择器
 * 选择要转发到的联系人或群组
 */

import React, { useState } from 'react';
import { X, Search, CheckCircle2, Circle } from 'lucide-react';
import { Conversation } from '../types';

interface ForwardTargetSelectorProps {
  conversations: Conversation[];
  currentConversationId?: string; // 当前会话ID，用于标记
  onConfirm: (selectedIds: string[], mergeForward: boolean) => void;
  onCancel: () => void;
  allowMultiple?: boolean; // 是否允许选择多个目标
  defaultMerge?: boolean; // 默认是否合并转发
}

const ForwardTargetSelector: React.FC<ForwardTargetSelectorProps> = ({
  conversations,
  currentConversationId,
  onConfirm,
  onCancel,
  allowMultiple = true,
  defaultMerge = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mergeForward, setMergeForward] = useState(defaultMerge);

  // 过滤会话列表
  const filteredConversations = conversations.filter(conv => {
    const searchLower = searchTerm.toLowerCase();
    return conv.name.toLowerCase().includes(searchLower) ||
           conv.characterSettings?.nickname?.toLowerCase().includes(searchLower);
  });

  // 切换选中状态
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      if (!allowMultiple) {
        newSelected.clear();
      }
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // 确认转发
  const handleConfirm = () => {
    if (selectedIds.size > 0) {
      onConfirm(Array.from(selectedIds), mergeForward);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">选择转发对象</h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* 搜索框 */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索联系人或群组"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 合并转发选项 */}
        <div className="p-4 bg-gray-50 border-b">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={mergeForward}
              onChange={(e) => setMergeForward(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              合并转发（将多条消息合并为聊天记录）
            </span>
          </label>
        </div>

        {/* 会话列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8">
              <p>未找到匹配的联系人</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = selectedIds.has(conv.id);
              const isCurrentConv = conv.id === currentConversationId;
              const displayName = conv.characterSettings?.nickname || conv.name;
              const avatar = conv.characterSettings?.avatar || conv.avatar || '👤';

              return (
                <button
                  key={conv.id}
                  onClick={() => toggleSelection(conv.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                    isSelected
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'hover:bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  {/* 头像 */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl flex-shrink-0">
                    {avatar}
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-900">
                      {displayName}
                      {isCurrentConv && (
                        <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          当前会话
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {conv.type === 'group' ? '群聊' : '私聊'}
                      {isCurrentConv && ' • 转发给自己'}
                    </div>
                  </div>

                  {/* 选中图标 */}
                  <div>
                    {isSelected ? (
                      <CheckCircle2 className="w-6 h-6 text-blue-600" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-300" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedIds.size > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              发送给 {selectedIds.size} 个对象
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForwardTargetSelector;
