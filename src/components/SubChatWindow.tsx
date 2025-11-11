import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Minimize2, Maximize2, MessageCircle } from 'lucide-react';
import { SubChat, Message, ApiConfig, Conversation } from '../types';

interface SubChatWindowProps {
  subChat: SubChat;
  conversation: Conversation;
  apiConfig: ApiConfig;
  onClose: () => void;
  onMinimize: () => void;
  onSendMessage: (subChatId: string, content: string) => void;
  onUpdateSubChat: (subChatId: string, updates: Partial<SubChat>) => void;
  isMinimized: boolean;
}

const SubChatWindow: React.FC<SubChatWindowProps> = ({
  subChat,
  conversation,
  apiConfig,
  onClose,
  onMinimize,
  onSendMessage,
  onUpdateSubChat,
  isMinimized,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [subChat.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(subChat.id, input.trim());
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isMinimized) {
    // 最小化状态 - 只显示标题栏
    return (
      <div className="fixed bottom-4 right-4 z-40 animate-slide-up">
        <div
          onClick={onMinimize}
          className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-3 rounded-t-xl shadow-lg cursor-pointer hover:from-purple-600 hover:to-blue-600 transition-all flex items-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="font-medium">{subChat.name}</span>
          {subChat.unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {subChat.unreadCount}
            </span>
          )}
        </div>
      </div>
    );
  }

  // 正常显示状态
  return (
    <div className="fixed bottom-4 right-4 w-[380px] h-[500px] bg-white rounded-2xl shadow-2xl z-40 flex flex-col overflow-hidden border-2 border-purple-200 animate-slide-up">
      {/* 标题栏 */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <div>
            <h3 className="font-semibold text-sm">{subChat.name}</h3>
            <p className="text-xs opacity-90">
              与 {conversation.characterSettings?.nickname || conversation.name} 的子对话
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onMinimize}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title="最小化"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-purple-50/30 to-blue-50/30">
        {subChat.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageCircle className="w-16 h-16 mb-3 opacity-50" />
            <p className="text-sm">开始一段新的对话...</p>
            {subChat.purpose && (
              <p className="text-xs mt-2 text-center px-4 text-gray-500">
                {subChat.purpose}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {subChat.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                      : 'bg-white border border-purple-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <p className={`text-[10px] mt-1 ${
                    message.role === 'user' ? 'text-white/70' : 'text-gray-400'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div className="border-t border-purple-100 p-3 bg-white">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息..."
            rows={1}
            className="flex-1 px-3 py-2 border border-purple-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
            style={{ maxHeight: '80px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubChatWindow;
