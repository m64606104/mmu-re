/**
 * AI子聊天建议弹窗组件
 * 显示AI建议创建子聊天的弹窗，用户可以接受、拒绝或修改名称
 */

import React, { useState } from 'react';
import { X, MessageCircle, Edit2, Check, Sparkles } from 'lucide-react';
import { SubChatSuggestion } from '../utils/aiSubChatSuggestion';

interface SubChatSuggestionModalProps {
  suggestion: SubChatSuggestion | null;
  onAccept: (name: string, suggestion: SubChatSuggestion) => void;
  onReject: () => void;
  onClose: () => void;
}

const SubChatSuggestionModal: React.FC<SubChatSuggestionModalProps> = ({
  suggestion,
  onAccept,
  onReject,
  onClose
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [customName, setCustomName] = useState('');

  if (!suggestion) return null;

  const handleAccept = () => {
    const finalName = isEditing && customName.trim() ? customName.trim() : suggestion.suggestedName;
    onAccept(finalName, suggestion);
  };

  const handleStartEdit = () => {
    setCustomName(suggestion.suggestedName);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setCustomName('');
  };

  const confidenceColor = suggestion.confidence > 0.7 ? 'text-green-600' : 
                         suggestion.confidence > 0.4 ? 'text-yellow-600' : 'text-gray-600';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-gray-200">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI建议创建子聊天</h2>
              <p className={`text-sm ${confidenceColor}`}>
                建议置信度: {Math.round(suggestion.confidence * 100)}%
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-4">
          {/* AI分析原因 */}
          <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-400">
            <p className="text-sm text-blue-800">
              <span className="font-medium">AI分析:</span> {suggestion.reason}
            </p>
          </div>

          {/* 建议的子聊天名称 */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              子聊天名称
            </label>
            
            {!isEditing ? (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <MessageCircle className="w-5 h-5 text-purple-500" />
                <span className="flex-1 font-medium text-gray-900">{suggestion.suggestedName}</span>
                <button
                  onClick={handleStartEdit}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="修改名称"
                >
                  <Edit2 className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="输入自定义名称..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors text-sm"
                  >
                    <Check className="w-3 h-3" />
                    确认
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors text-sm"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 相关消息预览 */}
          {suggestion.relevantMessages.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                相关对话内容
              </label>
              <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                <div className="space-y-2">
                  {suggestion.relevantMessages.slice(-3).map((message, index) => (
                    <div key={index} className="text-sm">
                      <span className={`font-medium ${
                        message.role === 'user' ? 'text-blue-600' : 'text-purple-600'
                      }`}>
                        {message.role === 'user' ? '你' : 'AI'}:
                      </span>
                      <span className="text-gray-700 ml-2">
                        {message.content ? 
                          (message.content.length > 50 ? 
                            message.content.substring(0, 50) + '...' : 
                            message.content
                          ) : '多媒体消息'
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3 p-6 border-t border-gray-100">
          <button
            onClick={onReject}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            暂时不要
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-[1.02] font-medium shadow-md"
          >
            创建子聊天
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubChatSuggestionModal;
