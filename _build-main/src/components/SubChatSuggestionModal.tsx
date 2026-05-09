/**
 * AI主动发起子聊天的建议弹窗
 * 用户可以接受、拒绝或修改AI的建议
 */

import React, { useState } from 'react';
import { MessageCircle, Edit2, Check, AlertCircle } from 'lucide-react';
import { SubChatSuggestion } from '../utils/aiSubChatInitiator';

interface SubChatSuggestionModalProps {
  suggestion: SubChatSuggestion;
  onAccept: (name: string, purpose: string) => void;
  onReject: () => void;
  characterName: string;
}

const SubChatSuggestionModal: React.FC<SubChatSuggestionModalProps> = ({
  suggestion,
  onAccept,
  onReject,
  characterName
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [customName, setCustomName] = useState(suggestion.suggestedName);
  const [customPurpose, setCustomPurpose] = useState(suggestion.purpose);

  const handleAccept = () => {
    onAccept(customName.trim() || suggestion.suggestedName, customPurpose.trim() || suggestion.purpose);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-orange-600 bg-orange-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return '重要';
      case 'medium': return '一般';
      case 'low': return '建议';
      default: return '建议';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-up">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">子聊天建议</h3>
                <p className="text-sm opacity-90">{characterName} 想要发起</p>
              </div>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(suggestion.priority)}`}>
              {getPriorityText(suggestion.priority)}
            </div>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-4">
          {/* AI的建议理由 */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-purple-900 mb-1">AI的想法</h4>
                <p className="text-sm text-purple-700">{suggestion.reason}</p>
              </div>
            </div>
          </div>

          {/* 子聊天信息编辑 */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">子聊天名称</label>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  {isEditing ? '完成编辑' : '修改'}
                </button>
              </div>
              
              {isEditing ? (
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder="输入子聊天名称"
                  maxLength={20}
                />
              ) : (
                <div className="bg-gray-50 px-3 py-2 rounded-lg border">
                  <span className="text-sm text-gray-900">{customName}</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">目的说明</label>
              {isEditing ? (
                <textarea
                  value={customPurpose}
                  onChange={(e) => setCustomPurpose(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
                  rows={3}
                  placeholder="说明这个子聊天的目的"
                  maxLength={100}
                />
              ) : (
                <div className="bg-gray-50 px-3 py-2 rounded-lg border">
                  <span className="text-sm text-gray-700">{customPurpose}</span>
                </div>
              )}
            </div>
          </div>

          {/* 特性说明 */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="font-medium text-blue-900 mb-2">子聊天特性</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 独立的聊天记录，不会影响主对话</li>
              <li>• AI会记住主聊天的内容，保持连贯性</li>
              <li>• 可以随时关闭或最小化</li>
              <li>• 支持拖拽和调整大小</li>
            </ul>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="border-t border-gray-100 p-6 flex gap-3">
          <button
            onClick={onReject}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            暂时不用
          </button>
          <button
            onClick={handleAccept}
            disabled={!customName.trim()}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            开始子聊天
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubChatSuggestionModal;
