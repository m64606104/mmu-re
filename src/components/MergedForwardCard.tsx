/**
 * 合并转发消息卡片
 * 类似微信的聊天记录卡片
 */

import React from 'react';
import { ChevronRight, X } from 'lucide-react';
import { ForwardedMessage } from '../types';

interface MergedForwardCardProps {
  forwardedMessage: ForwardedMessage;
  onClick?: () => void;
}

const MergedForwardCard: React.FC<MergedForwardCardProps> = ({
  forwardedMessage,
  onClick
}) => {
  if (forwardedMessage.type !== 'merged' || !forwardedMessage.messages) {
    return null;
  }

  const { messages, title, from } = forwardedMessage;
  
  // 只显示前3条消息的预览
  const previewMessages = messages.slice(0, 3);
  
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm"
    >
      {/* 标题 */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{title}</span>
          <span className="text-xs text-gray-500">({messages.length}条)</span>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>

      {/* 消息预览 */}
      <div className="space-y-1">
        {previewMessages.map((msg, index) => (
          <div key={index} className="text-sm text-gray-600 truncate">
            <span className="font-medium text-gray-800">{msg.senderName}: </span>
            <span>
              {msg.mediaType && (
                <span className="text-blue-600">
                  {msg.mediaType === 'image' && '[图片]'}
                  {msg.mediaType === 'video' && '[视频]'}
                  {msg.mediaType === 'voice' && '[语音]'}
                  {msg.mediaType === 'file' && '[文件]'}
                  {' '}
                </span>
              )}
              {msg.content}
            </span>
          </div>
        ))}
        
        {messages.length > 3 && (
          <div className="text-xs text-gray-400 mt-1">
            ...还有{messages.length - 3}条消息
          </div>
        )}
      </div>

      {/* 来源 */}
      <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400">
        来自: {from.conversationName}
      </div>
    </div>
  );
};

/**
 * 合并转发详情查看器
 */
interface MergedForwardViewerProps {
  forwardedMessage: ForwardedMessage;
  onClose: () => void;
}

export const MergedForwardViewer: React.FC<MergedForwardViewerProps> = ({
  forwardedMessage,
  onClose
}) => {
  if (forwardedMessage.type !== 'merged' || !forwardedMessage.messages) {
    return null;
  }

  const { messages, title, from } = forwardedMessage;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">来自: {from.conversationName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, index) => (
            <div key={index} className="flex gap-3">
              {/* 头像 */}
              {msg.senderAvatar && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-lg flex-shrink-0">
                  {msg.senderAvatar}
                </div>
              )}

              {/* 消息内容 */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 text-sm">
                    {msg.senderName}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(msg.timestamp).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                {/* 媒体消息 */}
                {msg.mediaType && msg.mediaUrl && (
                  <div className="mb-1">
                    {msg.mediaType === 'image' && (
                      <img
                        src={msg.mediaUrl}
                        alt="图片"
                        className="max-w-xs rounded-lg"
                      />
                    )}
                    {msg.mediaType === 'video' && (
                      <video
                        src={msg.mediaUrl}
                        controls
                        className="max-w-xs rounded-lg"
                      />
                    )}
                    {msg.mediaType === 'voice' && (
                      <div className="bg-green-500 text-white px-4 py-2 rounded-lg inline-block">
                        🎤 语音消息
                      </div>
                    )}
                    {msg.mediaType === 'file' && (
                      <div className="bg-gray-100 px-4 py-2 rounded-lg inline-block">
                        📄 {msg.content}
                      </div>
                    )}
                  </div>
                )}

                {/* 文字内容 */}
                {msg.content && !msg.mediaType && (
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 inline-block max-w-md">
                    <p className="text-gray-800 text-sm whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default MergedForwardCard;
