import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Minimize2, MessageCircle, Plus, Image, Mic, FileText, DollarSign, Zap, Smile, Video } from 'lucide-react';
import { SubChat, ApiConfig, Conversation, Message } from '../types';

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
  apiConfig: _apiConfig,
  onClose,
  onMinimize,
  onSendMessage,
  onUpdateSubChat: _onUpdateSubChat,
  isMinimized,
}) => {
  const [input, setInput] = useState('');
  const [showToolbar, setShowToolbar] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 多媒体相关refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  // 多媒体相关状态
  const [showVideoDescModal, setShowVideoDescModal] = useState(false);
  const [videoDescInput, setVideoDescInput] = useState('');
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [stickerDescInput, setStickerDescInput] = useState('');

  useEffect(() => {
    scrollToBottom();
  }, [subChat.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
      await onSendMessage(subChat.id, input.trim());
      setInput('');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleGenerate = async () => {
    if (isGenerating || subChat.messages.length === 0) return;
    setIsGenerating(true);
    try {
      // 触发AI生成回复（基于现有对话）
      await onSendMessage(subChat.id, '');
    } finally {
      setIsGenerating(false);
    }
  };

  // 多媒体处理函数
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageDataUrl = event.target?.result as string;
      
      // 创建图片消息
      const imageMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content: '发送了一张图片',
        timestamp: Date.now(),
        mediaType: 'image',
        mediaDescription: '用户上传的图片',
        mediaUrl: imageDataUrl,
      };
      
      // 发送消息（这里需要更新消息发送接口来支持多媒体）
      _onUpdateSubChat(subChat.id, {
        messages: [...subChat.messages, imageMessage]
      });

      // 关闭工具栏
      setShowToolbar(false);
    };

    reader.readAsDataURL(file);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 保存文件并显示描述弹窗
    setPendingVideoFile(file);
    setShowVideoDescModal(true);
    setShowToolbar(false);

    // 清空input
    if (e.target) e.target.value = '';
  };

  const handleStickerClick = () => {
    setShowStickerModal(true);
    setShowToolbar(false);
  };

  const handleSendVideo = () => {
    if (!pendingVideoFile || !videoDescInput.trim()) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const videoDataUrl = event.target?.result as string;
      
      const videoMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content: videoDescInput.trim(),
        timestamp: Date.now(),
        mediaType: 'video',
        mediaDescription: videoDescInput.trim(),
        mediaUrl: videoDataUrl,
      };
      
      _onUpdateSubChat(subChat.id, {
        messages: [...subChat.messages, videoMessage]
      });
      
      setShowVideoDescModal(false);
      setVideoDescInput('');
      setPendingVideoFile(null);
    };

    reader.readAsDataURL(pendingVideoFile);
  };

  const handleSendSticker = () => {
    if (!stickerDescInput.trim()) return;

    const stickerMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: stickerDescInput.trim(),
      timestamp: Date.now(),
      mediaType: 'sticker',
      mediaDescription: stickerDescInput.trim(),
    };
    
    _onUpdateSubChat(subChat.id, {
      messages: [...subChat.messages, stickerMessage]
    });
    
    setShowStickerModal(false);
    setStickerDescInput('');
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

      {/* 工具栏 */}
      {showToolbar && (
        <div className="border-t border-purple-100 p-3 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="grid grid-cols-4 gap-2">
            <button 
              onClick={() => imageInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <Image className="w-5 h-5 text-purple-600 mb-1" />
              <span className="text-xs text-purple-600">图片</span>
            </button>
            <button 
              onClick={() => videoInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <Video className="w-5 h-5 text-purple-600 mb-1" />
              <span className="text-xs text-purple-600">视频</span>
            </button>
            <button 
              onClick={handleStickerClick}
              className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <Smile className="w-5 h-5 text-purple-600 mb-1" />
              <span className="text-xs text-purple-600">表情</span>
            </button>
            <button className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-white/50 transition-colors">
              <DollarSign className="w-5 h-5 text-purple-600 mb-1" />
              <span className="text-xs text-purple-600">红包</span>
            </button>
          </div>
          
          {/* 隐藏的文件输入 */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleVideoUpload}
          />
        </div>
      )}

      {/* 输入区域 */}
      <div className="border-t border-purple-100 p-3 bg-white">
        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowToolbar(!showToolbar)}
            className="p-2.5 text-purple-500 hover:bg-purple-50 rounded-xl transition-colors"
            title="更多功能"
          >
            <Plus className={`w-4 h-4 transition-transform ${showToolbar ? 'rotate-45' : ''}`} />
          </button>
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息..."
            rows={1}
            className="flex-1 px-3 py-2 border border-purple-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
            style={{ maxHeight: '80px' }}
            disabled={isGenerating}
          />
          
          <button
            onClick={handleGenerate}
            disabled={isGenerating || subChat.messages.length === 0}
            className="p-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="AI生成"
          >
            <Zap className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleSend}
            disabled={!input.trim() || isGenerating}
            className="p-2.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 视频描述弹窗 */}
      {showVideoDescModal && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">视频内容描述</h3>
            <p className="text-sm text-gray-600 mb-4">
              请填写视频内容的文字描述，以便AI更好地理解视频内容并做出回复。
            </p>
            <textarea
              value={videoDescInput}
              onChange={(e) => setVideoDescInput(e.target.value)}
              placeholder="例如：视频中一个女孩在海边散步，夕阳洒在海面上"
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowVideoDescModal(false);
                  setVideoDescInput('');
                  setPendingVideoFile(null);
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleSendVideo}
                disabled={!videoDescInput.trim()}
                className="flex-1 px-4 py-2.5 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                发送
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 表情包输入弹窗 */}
      {showStickerModal && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Smile className="w-5 h-5 text-purple-500" />
              发送表情包
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              请用文字描述表情包的内容，AI会理解并做出相应回复。
            </p>
            <textarea
              value={stickerDescInput}
              onChange={(e) => setStickerDescInput(e.target.value)}
              placeholder="例如：一只猫咪捂脸害羞的表情包"
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowStickerModal(false);
                  setStickerDescInput('');
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleSendSticker}
                disabled={!stickerDescInput.trim()}
                className="flex-1 px-4 py-2.5 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                发送
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubChatWindow;
