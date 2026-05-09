/**
 * 聊天记录提取预览弹窗
 * 允许用户预览、编辑和保存提取的聊天记录
 */

import React, { useState } from 'react';
import { X, Save, Settings, Eye, Clock, User } from 'lucide-react';
import { Message, DocumentMessage } from '../types';

interface ChatExtractPreviewProps {
  messages: Message[];
  conversationName: string;
  userName: string;
  onSave: (document: DocumentMessage) => void;
  onCancel: () => void;
}

const ChatExtractPreview: React.FC<ChatExtractPreviewProps> = ({
  messages,
  conversationName,
  userName,
  onSave,
  onCancel
}) => {
  const [title, setTitle] = useState(() => {
    const startDate = new Date(messages[0]?.timestamp || Date.now());
    const dateStr = startDate.toLocaleDateString('zh-CN');
    return `${conversationName}的聊天记录 - ${dateStr}`;
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [includeTime, setIncludeTime] = useState(true);
  const [includeNames, setIncludeNames] = useState(true);
  const [separateLines, setSeparateLines] = useState(true);

  // 生成预览内容
  const generateContent = () => {
    const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);
    
    return sortedMessages.map(msg => {
      const parts = [];
      
      // 时间
      if (includeTime) {
        const time = new Date(msg.timestamp).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit'
        });
        parts.push(`[${time}]`);
      }
      
      // 发送者名字
      if (includeNames) {
        const sender = msg.role === 'user' ? userName : conversationName;
        parts.push(`${sender}:`);
      }
      
      // 消息内容
      let messageContent = msg.content;
      
      // 处理媒体消息
      if (msg.mediaItems && msg.mediaItems.length > 0) {
        const mediaDesc = msg.mediaItems.map(item => {
          switch (item.type) {
            case 'image': return '[图片]';
            case 'video': return '[视频]';
            case 'voice': return `[语音 ${item.duration}秒]`;
            case 'sticker': return '[表情包]';
            default: return '';
          }
        }).join(' ');
        messageContent = messageContent ? `${messageContent} ${mediaDesc}` : mediaDesc;
      }
      
      // 处理文档消息
      if (msg.document) {
        messageContent = `${messageContent}\n[文档: ${msg.document.title}]`;
      }
      
      // 处理红包/转账
      if (msg.moneyTransfer) {
        const type = msg.moneyTransfer.type === 'redPacket' ? '红包' : '转账';
        messageContent = `[${type}: ¥${msg.moneyTransfer.amount}]${msg.moneyTransfer.message ? ` ${msg.moneyTransfer.message}` : ''}`;
      }
      
      parts.push(messageContent);
      
      return parts.join(' ');
    }).join(separateLines ? '\n\n' : '\n');
  };

  const previewContent = generateContent();

  const handleSave = () => {
    const document: DocumentMessage = {
      title,
      content: previewContent,
      type: 'text',
      greeting: `已为您提取${messages.length}条消息`
    };
    onSave(document);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">聊天记录提取预览</h3>
            <p className="text-sm text-gray-600 mt-1">共{messages.length}条消息</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              title="设置"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* 设置面板 */}
        {showSettings && (
          <div className="border-b bg-gray-50 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">显示选项</h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTime}
                    onChange={(e) => setIncludeTime(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">显示时间</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeNames}
                    onChange={(e) => setIncludeNames(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">显示发送者名字</span>
                </label>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">格式选项</h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={separateLines}
                    onChange={(e) => setSeparateLines(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">消息间空行分隔</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 标题编辑 */}
        <div className="p-4 border-b bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">文档标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="输入文档标题..."
          />
        </div>

        {/* 内容预览 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-gray-50 rounded-lg p-4 min-h-[300px]">
            <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
              <Eye className="w-4 h-4" />
              <span>预览效果</span>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                {previewContent}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              提取格式：{includeTime ? '时间+' : ''}{includeNames ? '名字+' : ''}内容
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!title.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                保存到文档库
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatExtractPreview;
