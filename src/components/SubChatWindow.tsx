import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Minimize2, MessageCircle, Plus, Zap, Smile, Video, Move, 
  Mic, FileText, CreditCard, Image as ImageIcon, Phone, MapPin } from 'lucide-react';
import { SubChat, ApiConfig, Conversation, Message, DocumentMessage } from '../types';
import WordStyleDocumentCard from './WordStyleDocumentCard';
import MoneyTransferModal from './MoneyTransferModal';
import SendDocumentModal from './SendDocumentModal';

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
  
  // 窗口拖拽和调整大小相关状态
  const [position, setPosition] = useState({ x: window.innerWidth - 400, y: window.innerHeight - 520 });
  const [size, setSize] = useState({ width: 380, height: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const windowRef = useRef<HTMLDivElement>(null);
  
  // 多媒体相关refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  // 多媒体相关状态
  const [showVideoDescModal, setShowVideoDescModal] = useState(false);
  const [videoDescInput, setVideoDescInput] = useState('');
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [stickerDescInput, setStickerDescInput] = useState('');
  
  // 🎤 语音录音相关状态
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showVoiceConfirmModal, setShowVoiceConfirmModal] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  // const [isTranscribing, setIsTranscribing] = useState(false); // 暂不使用
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 📤 发送状态管理 - 子页面独立状态
  const [showSendingHint, setShowSendingHint] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  
  // 功能模态框状态
  const [showMoneyTransferModal, setShowMoneyTransferModal] = useState(false);
  const [showSendDocumentModal, setShowSendDocumentModal] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<DocumentMessage | null>(null);
  
  // 语音播放相关
  const [viewingVoice, setViewingVoice] = useState<string[]>([]);
  // const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  // const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    scrollToBottom();
  }, [subChat.messages]);

  // 拖拽和调整大小的事件处理 - 支持鼠标和触摸
  useEffect(() => {
    const getClientPos = (e: MouseEvent | TouchEvent) => {
      if ('touches' in e && e.touches.length > 0) {
        return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
      }
      return { clientX: (e as MouseEvent).clientX, clientY: (e as MouseEvent).clientY };
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault(); // 防止触摸滚动
      const { clientX, clientY } = getClientPos(e);
      
      if (isDragging) {
        const newX = clientX - dragStart.x;
        const newY = clientY - dragStart.y;
        setPosition({ 
          x: Math.max(0, Math.min(window.innerWidth - size.width, newX)),
          y: Math.max(0, Math.min(window.innerHeight - size.height, newY))
        });
      }
      
      if (isResizing) {
        const newWidth = Math.max(300, resizeStart.width + (clientX - resizeStart.x));
        const newHeight = Math.max(350, resizeStart.height + (clientY - resizeStart.y));
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      // 鼠标事件
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      
      // 触摸事件
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
      document.addEventListener('touchcancel', handleEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
        document.removeEventListener('touchcancel', handleEnd);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart, size]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    
    let clientX, clientY;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      const mouseEvent = e as React.MouseEvent;
      clientX = mouseEvent.clientX;
      clientY = mouseEvent.clientY;
    }
    
    setIsDragging(true);
    setDragStart({
      x: clientX - position.x,
      y: clientY - position.y
    });
  };

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    
    let clientX, clientY;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      const mouseEvent = e as React.MouseEvent;
      clientX = mouseEvent.clientX;
      clientY = mouseEvent.clientY;
    }
    
    setIsResizing(true);
    setResizeStart({
      x: clientX,
      y: clientY,
      width: size.width,
      height: size.height
    });
  };

  const handleSend = () => {
    if (!input.trim()) return;
    
    // 创建用户消息并直接添加到对话中
    const userMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };
    
    _onUpdateSubChat(subChat.id, {
      messages: [...subChat.messages, userMessage]
    });
    
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleGenerateReply = async () => {
    // 检查是否有用户消息
    if (subChat.messages.length === 0) return;
    
    const lastMessage = subChat.messages[subChat.messages.length - 1];
    if (lastMessage?.role !== 'user') return;
    
    // 在子页面显示生成状态
    setIsGenerating(true);
    setShowSendingHint(true);
    setShowTyping(true);
    
    try {
      // 触发AI生成回复（基于现有对话）
      await onSendMessage(subChat.id, '');
    } finally {
      // 清理子页面的生成状态
      setIsGenerating(false);
      setShowSendingHint(false);
      setShowTyping(false);
    }
  };

  // 检查是否应该显示生成按钮
  const shouldShowGenerateButton = () => {
    if (subChat.messages.length === 0) return false;
    const lastMessage = subChat.messages[subChat.messages.length - 1];
    return lastMessage?.role === 'user';
  };

  // 多媒体处理函数
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageDataUrl = event.target?.result as string;
      
      // 创建图片消息 - 🔥 不设置content避免多余文本
      const imageMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content: '', // 🔥 空content，避免显示多余的"发送了一张图片"文本
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

  // 🎤 语音录音功能
  const handleVoiceClick = async () => {
    setShowToolbar(false);
    
    if (isRecording) {
      // 停止录音
      stopRecording();
    } else {
      // 开始录音
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        
        const audioChunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          setAudioBlob(audioBlob);
          setShowVoiceConfirmModal(true);
          
          // 停止所有音轨
          stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        setIsRecording(true);
        setRecordingTime(0);
        
        // 开始计时
        recordingTimerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
        
      } catch (error) {
        console.error('录音启动失败:', error);
        alert('录音功能需要麦克风权限');
      }
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };
  
  const handleSendVoice = () => {
    if (!audioBlob) return;
    
    // 创建语音消息
    const reader = new FileReader();
    reader.onload = (event) => {
      const audioDataUrl = event.target?.result as string;
      
      const voiceMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content: voiceTranscript || `发送了一段 ${recordingTime}s 的语音`,
        timestamp: Date.now(),
        mediaType: 'voice',
        mediaUrl: audioDataUrl,
        mediaDescription: `语音消息 ${recordingTime}s`
      };
      
      _onUpdateSubChat(subChat.id, {
        messages: [...subChat.messages, voiceMessage]
      });
      
      // 清理状态
      setShowVoiceConfirmModal(false);
      setAudioBlob(null);
      setVoiceTranscript('');
      setRecordingTime(0);
    };
    
    reader.readAsDataURL(audioBlob);
  };
  
  const handleCancelVoice = () => {
    setShowVoiceConfirmModal(false);
    setAudioBlob(null);
    setVoiceTranscript('');
    setRecordingTime(0);
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
    <div 
      ref={windowRef}
      className="fixed bg-white rounded-2xl shadow-2xl z-40 flex flex-col overflow-hidden border-2 border-purple-200 animate-slide-up select-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
      }}
    >
      {/* 标题栏 */}
      <div 
        className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-3 flex items-center justify-between cursor-move select-none"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        style={{ touchAction: 'none' }}
      >
        <div className="flex items-center gap-2">
          <Move className="w-4 h-4 opacity-70" />
          <MessageCircle className="w-5 h-5" />
          <div>
            <h3 className="font-semibold text-sm">{subChat.name}</h3>
            <p className="text-xs opacity-90">
              与 {conversation.characterSettings?.nickname || conversation.name} 的子对话 
              <span className="hidden sm:inline">• 可拖拽移动</span>
              <span className="sm:hidden">• 可触摸拖拽</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onMinimize}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title="最小化"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title="关闭"
            onMouseDown={(e) => e.stopPropagation()}
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
                <div className={`max-w-[75%] ${message.role === 'user' ? 'ml-4' : 'mr-4'}`}>
                  {/* 文档显示 */}
                  {message.document && (
                    <div className="mb-2">
                      <WordStyleDocumentCard
                        document={message.document}
                        compact={true}
                        onClick={() => setViewingDocument(message.document || null)}
                        onSave={() => {
                          // 简化版本，只显示提示
                          alert('文档已保存到资料库');
                        }}
                        onForward={() => {
                          alert('转发功能暂不支持');
                        }}
                      />
                    </div>
                  )}
                  
                  {/* 红包/转账显示 */}
                  {message.moneyTransfer && (
                    <div className={`p-0 rounded-2xl overflow-hidden mb-2 ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-400' 
                        : 'bg-gradient-to-br from-yellow-500 to-orange-500'
                    }`}>
                      <div className="p-4 text-white">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">
                            {message.moneyTransfer.type === 'redPacket' ? '🧧' : '💸'}
                          </span>
                          <div className="text-lg font-bold">
                            {message.moneyTransfer.type === 'redPacket' ? '红包' : '转账'}
                          </div>
                        </div>
                        <div className="text-2xl font-bold mb-2">
                          ¥{(message.moneyTransfer.originalAmount || message.moneyTransfer.amount).toFixed(2)}
                        </div>
                        {message.moneyTransfer.message && (
                          <div className="text-sm opacity-90 mb-2">
                            {message.moneyTransfer.message}
                          </div>
                        )}
                        {message.moneyTransfer.status === 'pending' && message.role === 'user' && (
                          <div className="text-xs opacity-75">
                            等待对方领取
                          </div>
                        )}
                        {message.moneyTransfer.status === 'received' && (
                          <div className="text-xs opacity-75">
                            已{message.moneyTransfer.type === 'redPacket' ? '领取' : '收款'}
                          </div>
                        )}
                        {message.moneyTransfer.status === 'returned' && (
                          <div className="text-xs opacity-75">
                            已退回
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* 多媒体显示 */}
                  {message.mediaType === 'image' && message.mediaUrl && (
                    <img 
                      src={message.mediaUrl} 
                      alt="图片" 
                      className="w-full max-w-[200px] rounded-2xl mb-2"
                    />
                  )}
                  {message.mediaType === 'video' && message.mediaUrl && (
                    <video 
                      src={message.mediaUrl} 
                      controls 
                      className="w-full max-w-[200px] rounded-2xl mb-2"
                    />
                  )}
                  {message.mediaType === 'voice' && message.mediaUrl && (
                    <div className="mb-2">
                      <div 
                        onClick={() => setViewingVoice(prev => 
                          prev.includes(message.id) 
                            ? prev.filter(id => id !== message.id)
                            : [...prev, message.id]
                        )}
                        className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl min-w-[120px] max-w-[200px]"
                      >
                        <Mic className="w-4 h-4 text-gray-600 flex-shrink-0" />
                        <div className="flex-1 flex items-center gap-0.5">
                          <div className="flex gap-0.5">
                            {[...Array(15)].map((_, i) => (
                              <div 
                                key={i} 
                                className="w-0.5 bg-gray-400 rounded-full"
                                style={{ height: `${Math.random() * 12 + 4}px` }}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-gray-600 flex-shrink-0 mr-1">{message.voiceDuration || 0}"</span>
                      </div>
                      {viewingVoice.includes(message.id) && message.mediaDescription && (
                        <div className="mt-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200">
                          <p className="text-[13px] text-gray-700">{message.mediaDescription}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {message.mediaType === 'sticker' && (
                    <div className="relative w-[120px] h-[120px] rounded-2xl overflow-hidden bg-purple-100/40 backdrop-blur-sm border border-purple-200 mb-2">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 to-purple-100/30" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                        <Smile className="w-8 h-8 text-purple-400 mb-2" strokeWidth={1.5} />
                        <p className="text-xs text-gray-700 leading-tight">{message.mediaDescription}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* 文本内容 */}
                  {!message.document && !message.moneyTransfer && message.content && message.content.trim() && (
                    <div
                      className={`rounded-2xl px-3 py-2 ${
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
                  )}
                </div>
              </div>
            ))}
            
            {/* 🔥 子页面发送状态提示 */}
            {showSendingHint && (
              <div className="flex justify-center py-2">
                <div className="bg-gray-100 px-3 py-1 rounded-full text-xs text-gray-600">
                  发送中...
                </div>
              </div>
            )}
            
            {/* 🔥 子页面AI输入状态 */}
            {showTyping && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-200 rounded-2xl px-4 py-3 max-w-[75%]">
                  <div className="flex items-center gap-1">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                    </div>
                    <span className="text-xs text-gray-600 ml-2">AI正在输入...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 工具栏 */}
      {showToolbar && (
        <div className="border-t border-purple-100 p-3 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex gap-2 items-center overflow-x-auto">
            <button onClick={() => imageInputRef.current?.click()} className="flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-white border border-purple-300 flex items-center justify-center hover:border-purple-400 transition-colors">
                <ImageIcon className="w-4 h-4 text-purple-600" />
              </div>
            </button>
            <button onClick={() => videoInputRef.current?.click()} className="flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-white border border-purple-300 flex items-center justify-center hover:border-purple-400 transition-colors">
                <Video className="w-4 h-4 text-purple-600" />
              </div>
            </button>
            <button onClick={handleVoiceClick} className="flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-white border border-purple-300 flex items-center justify-center hover:border-purple-400 transition-colors">
                <Mic className="w-4 h-4 text-purple-600" />
              </div>
            </button>
            <button onClick={handleStickerClick} className="flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-white border border-purple-300 flex items-center justify-center hover:border-purple-400 transition-colors">
                <Smile className="w-4 h-4 text-purple-600" />
              </div>
            </button>
            <button className="flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-white border border-purple-300 flex items-center justify-center hover:border-purple-400 transition-colors">
                <Phone className="w-4 h-4 text-purple-600" />
              </div>
            </button>
            <button className="flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-white border border-purple-300 flex items-center justify-center hover:border-purple-400 transition-colors">
                <MapPin className="w-4 h-4 text-purple-600" />
              </div>
            </button>
            <button onClick={() => setShowMoneyTransferModal(true)} className="flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-white border border-purple-300 flex items-center justify-center hover:border-purple-400 transition-colors">
                <CreditCard className="w-4 h-4 text-purple-600" />
              </div>
            </button>
            <button onClick={() => setShowSendDocumentModal(true)} className="flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-white border border-purple-300 flex items-center justify-center hover:border-purple-400 transition-colors">
                <FileText className="w-4 h-4 text-purple-600" />
              </div>
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
            disabled={false}
          />
          
          {shouldShowGenerateButton() && (
            <button
              onClick={handleGenerateReply}
              disabled={isGenerating}
              className="p-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="AI生成"
            >
              <Zap className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={handleSend}
            disabled={!input.trim()}
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

      {/* 红包转账弹窗 */}
      {showMoneyTransferModal && (
        <MoneyTransferModal
          onClose={() => setShowMoneyTransferModal(false)}
          onSend={(amount, type, message) => {
            const moneyMessage: Message = {
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              role: 'user',
              content: '',
              timestamp: Date.now(),
              moneyTransfer: {
                type,
                amount,
                message: message || '',
                status: 'pending'
              }
            };
            _onUpdateSubChat(subChat.id, {
              messages: [...subChat.messages, moneyMessage]
            });
            setShowMoneyTransferModal(false);
          }}
        />
      )}

      {/* 发送文档弹窗 */}
      {showSendDocumentModal && (
        <SendDocumentModal
          onClose={() => setShowSendDocumentModal(false)}
          onSend={(title, content, greeting, type) => {
            const docMessage: Message = {
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              role: 'user',
              content: greeting,
              timestamp: Date.now(),
              document: {
                title,
                content,
                type
              }
            };
            _onUpdateSubChat(subChat.id, {
              messages: [...subChat.messages, docMessage]
            });
            setShowSendDocumentModal(false);
          }}
        />
      )}

      {/* 文档查看弹窗 */}
      {viewingDocument && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{viewingDocument.title}</h3>
              <button
                onClick={() => setViewingDocument(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: viewingDocument.content }} />
          </div>
        </div>
      )}

      {/* 🎤 语音确认模态框 */}
      {showVoiceConfirmModal && audioBlob && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mic className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">语音录制完成</h3>
              <p className="text-gray-600 mb-4">录制时长：{recordingTime}秒</p>
              
              <div className="space-y-3">
                <div className="flex gap-3">
                  <button
                    onClick={handleCancelVoice}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    重新录制
                  </button>
                  <button
                    onClick={handleSendVoice}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    发送语音
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 调整大小拖拽区域 */}
      <div 
        className="absolute bottom-0 right-0 w-6 h-6 cursor-nw-resize bg-purple-300 opacity-50 hover:opacity-75 active:opacity-100 transition-opacity select-none flex items-center justify-center"
        onMouseDown={handleResizeStart}
        onTouchStart={handleResizeStart}
        style={{ touchAction: 'none' }}
        title="拖拽调整大小"
      >
        {/* 调整大小图标 */}
        <div className="text-purple-700 text-xs leading-none">⤡</div>
      </div>
    </div>
  );
};

export default SubChatWindow;
