import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Minimize2, MessageCircle, Plus, Zap, Smile, Video, Move, 
  Mic, FileText, CreditCard, Image as ImageIcon, Phone, MapPin, Music, Download } from 'lucide-react';
import { SubChat, ApiConfig, Conversation, Message, DocumentMessage } from '../types';
import WordStyleDocumentCard from './WordStyleDocumentCard';
import MoneyTransferModal from './MoneyTransferModal';
import SendDocumentModal from './SendDocumentModal';
import MusicShareModal from './MusicShareModal';
import { MessageActionMenu } from './MessageActionMenu';
import MessageSelectionToolbar from './MessageSelectionToolbar';
import ForwardTargetSelector from './ForwardTargetSelector';
import { createSingleForward, createMergedForward, getMessagePreview } from '../utils/messageForward';
import { formatChatRecord } from '../utils/chatRecordFormatter';
import { splitMessages } from '../utils/messageFormatter';
import { subChatPurposeDetector } from '../utils/subChatPurposeDetector';
import type { MusicInfo } from '../utils/musicService';

interface SubChatWindowProps {
  subChat: SubChat;
  conversation: Conversation;
  apiConfig: ApiConfig;
  onClose: () => void;
  onMinimize: () => void;
  onSendMessage: (subChatId: string, content: string) => void;
  onUpdateSubChat: (subChatId: string, updates: Partial<SubChat>) => void;
  isMinimized?: boolean;
  conversations?: Conversation[]; // 用于转发目标选择
  onUpdateConversation?: (conversationId: string, updates: Partial<Conversation>) => void; // 用于转发
  currentUserProfile?: { username?: string; avatar?: string }; // 用于转发时显示发送者信息
}

const SubChatWindow: React.FC<SubChatWindowProps> = ({ 
  subChat, 
  conversation, 
  apiConfig, 
  onClose, 
  onMinimize, 
  onSendMessage, 
  onUpdateSubChat: _onUpdateSubChat, 
  isMinimized = false, 
  conversations, 
  onUpdateConversation, 
  currentUserProfile 
}) => {
  // 避免未使用参数警告
  void onSendMessage;

  const [input, setInput] = useState('');
  const [showToolbar, setShowToolbar] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 消息操作相关状态
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [quotedMessage, setQuotedMessage] = useState<Message | null>(null);
  const [messageBeingEdited, setMessageBeingEdited] = useState<Message | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 用于防止删除操作过程中的状态问题
  void isDeleting;
  
  // 多选相关状态
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  
  // 转发相关状态
  const [showForwardSelector, setShowForwardSelector] = useState(false);
  const [forwardingMessages, setForwardingMessages] = useState<Message[]>([]);
  
  // 🚀 消息窗口优化：子聊天性能优化
  const [messageWindow, setMessageWindow] = useState<{
    startIndex: number; // 窗口起始索引
    size: number;       // 窗口大小
  }>(() => {
    // 初始状态：显示最新30条消息（子聊天通常消息较少）
    const initialSize = 30;
    const totalMessages = subChat.messages.length;
    return {
      startIndex: Math.max(0, totalMessages - initialSize),
      size: Math.min(initialSize, totalMessages)
    };
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  
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
  const [showVideoDescModal, setShowVideoDescModal] = useState(false);
  const [videoDescInput, setVideoDescInput] = useState('');
  
  // 🎵 音乐分享功能
  const [showMusicShareModal, setShowMusicShareModal] = useState(false);
  
  // 🔍 搜索功能 - 暂未实现
  // const [showSearchModal, setShowSearchModal] = useState(false);
  
  // 📊 活动轨迹功能 - 暂未实现 
  // const [showActivityModal, setShowActivityModal] = useState(false);
  
  // 功能模态框状态
  const [showMoneyTransferModal, setShowMoneyTransferModal] = useState(false);
  const [showSendDocumentModal, setShowSendDocumentModal] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<DocumentMessage | null>(null);
  
  // 语音播放相关
  const [viewingVoice, setViewingVoice] = useState<string[]>([]);
  // const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  // const audioRef = useRef<HTMLAudioElement | null>(null);

  // 🎯 智能滚动处理逻辑
  
  // 检查用户是否在底部
  const isAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const threshold = 50; // 50px的误差范围（子聊天窗口较小）
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }, []);
  
  // 智能滚动到底部
  const smartScrollToBottom = useCallback((smooth = false) => {
    const container = messagesContainerRef.current;
    if (container) {
      if (smooth) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      } else {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, []);
  
  // 滚动加载更多消息
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || isLoadingMore) return;
    
    // 标记用户正在滚动
    setIsUserScrolling(true);
    
    // 检查是否应该自动滚动到底部（用户在底部附近）
    setShouldScrollToBottom(isAtBottom());
    
    // 清除之前的定时器
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // 延迟重置滚动状态
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 1500); // 1.5秒后重置（子聊天响应更快）
    
    // 🔼 向上滚动：加载更早的消息
    if (container.scrollTop < 50 && messageWindow.startIndex > 0) {
      setIsLoadingMore(true);
      
      setTimeout(() => {
        const loadMore = 20; // 子聊天每次加载20条
        const newStartIndex = Math.max(0, messageWindow.startIndex - loadMore);
        const addedMessages = messageWindow.startIndex - newStartIndex;
        const prevScrollHeight = container.scrollHeight;
        
        setMessageWindow(prev => ({
          startIndex: newStartIndex,
          size: prev.size + addedMessages
        }));
        setIsLoadingMore(false);
        
        // 保持滚动位置，避免跳动
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - prevScrollHeight;
          }
        });
      }, 200); // 子聊天加载更快
    }
    
    // 🔽 向下滚动：加载更新的消息（如果不在末尾）
    const maxScrollTop = container.scrollHeight - container.clientHeight;
    const isNearBottom = container.scrollTop > maxScrollTop - 50;
    const windowEndIndex = messageWindow.startIndex + messageWindow.size;
    
    if (isNearBottom && windowEndIndex < subChat.messages.length) {
      setIsLoadingMore(true);
      
      setTimeout(() => {
        const loadMore = 20;
        const maxSize = subChat.messages.length - messageWindow.startIndex;
        const newSize = Math.min(messageWindow.size + loadMore, maxSize);
        
        setMessageWindow(prev => ({
          ...prev,
          size: newSize
        }));
        setIsLoadingMore(false);
      }, 200);
    }
  }, [messageWindow, subChat.messages.length, isLoadingMore, isAtBottom]);
  
  // 监听滚动事件
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => {
        container.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
  }, [handleScroll]);
  
  // 处理新消息和状态重置
  useEffect(() => {
    const currentMessageCount = subChat.messages.length;
    const prevMessageCount = lastMessageCountRef.current;
    
    // 子聊天切换时重置状态
    if (prevMessageCount === 0 || currentMessageCount < prevMessageCount) {
      console.log('🔄 切换子聊天，重置消息窗口状态');
      const initialSize = 30;
      setMessageWindow({
        startIndex: Math.max(0, currentMessageCount - initialSize),
        size: Math.min(initialSize, currentMessageCount)
      });
      setShouldScrollToBottom(true);
      setIsUserScrolling(false);
      
      setTimeout(() => smartScrollToBottom(), 50);
    }
    // 有新消息时：智能滚动处理
    else if (currentMessageCount > prevMessageCount) {
      console.log('📨 子聊天检测到新消息，智能处理滚动');
      
      // 如果用户在底部附近，自动调整窗口显示新消息
      if (shouldScrollToBottom) {
        setMessageWindow(prev => {
          const windowEndIndex = prev.startIndex + prev.size;
          const isShowingLatest = windowEndIndex >= prevMessageCount;
          
          if (isShowingLatest) {
            // 扩展窗口以包含新消息
            return {
              startIndex: prev.startIndex,
              size: prev.size + (currentMessageCount - prevMessageCount)
            };
          } else {
            // 保持窗口大小，但移动到最新位置
            return {
              startIndex: Math.max(0, currentMessageCount - prev.size),
              size: Math.min(prev.size, currentMessageCount)
            };
          }
        });
        setTimeout(() => smartScrollToBottom(true), 50);
      }
    }
    
    // 更新消息数量记录
    lastMessageCountRef.current = currentMessageCount;
  }, [subChat.messages.length, subChat.id, shouldScrollToBottom, smartScrollToBottom]);

  // 初始滚动到底部
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [subChat.id]);

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

    // 如果在编辑模式，保存编辑
    if (messageBeingEdited) {
      const updatedMessages = subChat.messages.map(m =>
        m.id === messageBeingEdited.id
          ? { ...m, content: input.trim(), edited: true }
          : m
      );
      _onUpdateSubChat(subChat.id, { messages: updatedMessages });
      setMessageBeingEdited(null);
      setInput('');
      return;
    }

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
      // 如果有引用消息，添加到消息中
      ...(quotedMessage && quotedMessage.role !== 'system' && {
        replyTo: {
          id: quotedMessage.id,
          content: quotedMessage.content,
          role: quotedMessage.role as 'user' | 'assistant'
        }
      })
    };

    _onUpdateSubChat(subChat.id, {
      messages: [...subChat.messages, newMessage]
    });
    
    setInput('');
    setQuotedMessage(null); // 清除引用
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 🔥 复制ChatScreen中的辅助函数
  const getUnhandledUserMessages = (messages: Message[]): Message[] => {
    const result: Message[] = [];
    
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      
      if (message.role === 'user') {
        // 检查这条用户消息后是否有AI回复
        const hasAIReply = messages.slice(i + 1).some(m => m.role === 'assistant');
        
        if (!hasAIReply) {
          result.unshift(message); // 添加到数组开头，保持时间顺序
        } else {
          break; // 遇到已有AI回复的用户消息，停止搜索
        }
      }
    }
    
    return result;
  };

  // 🔧 统一的消息格式化函数（参考ChatScreen的formatMessageForAI）
  const formatHistoryMessageContent = (message: Message): string => {
    let content = message.content;
    
    // 处理转发消息 - 使用专业格式化（与主聊天保持一致）
    if (message.forwarded) {
      if (message.forwarded.type === 'merged' && message.forwarded.messages) {
        // 合并转发：使用结构化聊天记录格式
        const forwardedMessages = message.forwarded.messages.map(item => ({
          id: `forwarded_${Date.now()}_${Math.random()}`,
          role: item.senderName === '用户' ? 'user' as const : 'assistant' as const,
          content: item.content,
          timestamp: Date.now()
        }));
        
        const formattedChatRecord = formatChatRecord(
          forwardedMessages, 
          message.forwarded.from.conversationName, 
          message.forwarded.from.conversationType === 'group' ? 'subchat' : 'main'
        );
        
        // 如果用户有额外的文字说明，保留它；否则用默认引导
        const userText = message.content && message.content.trim() && message.content !== '转发了聊天记录' 
          ? message.content 
          : '请帮我看看这个聊天记录：';
        
        content = `${userText}\n\n${formattedChatRecord}`;
      } else if (message.forwarded.type === 'single' && message.forwarded.originalMessage) {
        // 单条转发：保持原格式但添加更多上下文
        const original = message.forwarded.originalMessage;
        content = `转发了来自【${message.forwarded.from.conversationName}】的消息:\n\n${original.content}`;
      }
    }
    
    // 处理文档消息
    if (message.document) {
      return `[发文档:${message.document.title}:${message.document.type}]`;
    }
    
    // 处理转账/红包消息
    if (message.moneyTransfer) {
      const type = message.moneyTransfer.type === 'redPacket' ? '红包' : '转账';
      if (message.role === 'assistant') {
        // AI发的红包/转账
        return message.moneyTransfer.type === 'redPacket' 
          ? `[发红包:${message.moneyTransfer.amount}:${message.moneyTransfer.message}]`
          : `[转账:${message.moneyTransfer.amount}:${message.moneyTransfer.message}]`;
      } else {
        // 用户发的，或AI接收/退回的
        if (message.moneyTransfer.status === 'received') {
          return `[接收${type}:${message.moneyTransfer.message}]`;
        } else if (message.moneyTransfer.status === 'returned') {
          return `[退回${type}:${message.moneyTransfer.message}]`;
        }
      }
    }
    
    // 处理多媒体消息
    if (message.mediaType) {
      switch (message.mediaType) {
        case 'image':
          content = message.role === 'user' ? '[图片]' : `[图片:${message.mediaDescription || '图片'}]`;
          break;
        case 'video':
          content = message.role === 'user' ? `[视频:${message.mediaDescription || '视频'}]` : `[视频:${message.mediaDescription || '视频'}]`;
          break;
        case 'voice':
          content = message.role === 'user' ? `[语音:${message.mediaDescription || '语音消息'}]` : `[语音:${message.mediaDescription || '语音消息'}]`;
          break;
        case 'sticker':
          content = `[表情包:${message.mediaDescription || '表情包'}]`;
          break;
      }
    }
    
    // 处理多媒体项目（与主聊天保持一致）
    if (message.mediaItems && message.mediaItems.length > 0) {
      const mediaDesc = message.mediaItems.map(item => 
        `[${item.type}: ${item.description}]`
      ).join(' ');
      content = `${content} ${mediaDesc}`;
    }
    
    return content || '[消息]';
  };

  /**
   * 构建主聊天上下文，确保子聊天记住主聊天的内容
   */
  const buildMainChatContext = (conversation: Conversation, subChat: SubChat): string => {
    // 获取主聊天最近20条消息作为上下文
    const recentMainMessages = conversation.messages.slice(-20);
    const contextMessages = recentMainMessages.map(msg => {
      const role = msg.role === 'user' ? '用户' : '我';
      const content = msg.content || '[多媒体消息]';
      return `${role}: ${content}`;
    });
    
    // 检查是否有其他相关的子聊天摘要
    const otherSubChats = (conversation.subChats || [])
      .filter(sc => sc.id !== subChat.id && sc.messages.length > 0);
    
    let otherSubChatsContext = '';
    if (otherSubChats.length > 0) {
      otherSubChatsContext = '\n\n【其他相关子聊天】:\n' + 
        otherSubChats.map(sc => `- ${sc.name}: ${sc.purpose || '未指定目的'}`).join('\n');
    }
    
    return `
【主聊天最近对话】:
${contextMessages.join('\n')}
${otherSubChatsContext}

重要：你需要保持与主聊天内容的连贯性，在子聊天中可以引用主聊天提到的话题、人物、事件等。`;
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
      // 🔥 实现完整的AI回复逻辑
      await createSubChatAIReply();
    } finally {
      // 清理子页面的生成状态
      setIsGenerating(false);
      setShowSendingHint(false);
      setShowTyping(false);
    }
  };

  const createSubChatAIReply = async () => {
    try {
      console.log('🚀 子对话AI回复开始...');
      
      // 1. 获取未处理的用户消息
      const unhandledUserMessages = getUnhandledUserMessages(subChat.messages);
      
      if (unhandledUserMessages.length === 0) {
        console.log('⚠️ 没有未处理的用户消息');
        return;
      }

      // 1.5. 检测用户是否说明了子聊天的目的（特别是前几条消息）
      const isEarlyMessage = subChat.messages.length <= 5; // 前5条消息
      let purposeDetected = false;
      let detectedPurposeInfo = null;
      
      if (isEarlyMessage) {
        for (const userMessage of unhandledUserMessages) {
          const detectedPurpose = subChatPurposeDetector.detectPurposeFromMessage(userMessage);
          if (detectedPurpose && detectedPurpose.confidence > 0.6) {
            console.log('🎯 检测到子聊天目的:', detectedPurpose);
            
            // 更新子聊天的目的
            _onUpdateSubChat(subChat.id, {
              purpose: detectedPurpose.purpose
            });
            
            purposeDetected = true;
            detectedPurposeInfo = detectedPurpose;
            break;
          }
        }
      }
      
      // 2. 检查多媒体消息类型
      const hasImage = unhandledUserMessages.some((m: Message) => m.mediaType === 'image' && m.mediaUrl);
      // const hasVideo = unhandledUserMessages.some((m: Message) => m.mediaType === 'video' && m.mediaDescription);
      // const hasVoice = unhandledUserMessages.some((m: Message) => m.mediaType === 'voice' && m.mediaDescription);
      
      // 如果刚检测到目的，先生成理解回复
      if (purposeDetected && detectedPurposeInfo) {
        const understandingResponse = subChatPurposeDetector.generateUnderstandingResponse(
          detectedPurposeInfo
        );
        
        // 直接添加理解回复消息
        const understandingMessage: Message = {
          id: `understanding_${Date.now()}`,
          role: 'assistant',
          content: understandingResponse,
          timestamp: Date.now()
        };
        
        _onUpdateSubChat(subChat.id, {
          messages: [...subChat.messages, understandingMessage]
        });
        
        return; // 直接返回，不继续生成常规回复
      }

      // 3. 构建系统提示词，包含主聊天上下文
      const mainChatContext = buildMainChatContext(conversation, subChat);
      
      let systemPrompt = conversation.characterSettings
        ? `你是${conversation.characterSettings.nickname}。
${conversation.characterSettings.systemPrompt ? `人物设定：${conversation.characterSettings.systemPrompt}` : ''}
${conversation.characterSettings.personality ? `性格特征：${conversation.characterSettings.personality}` : ''}
${conversation.characterSettings.languageStyle ? `语言风格：${conversation.characterSettings.languageStyle}` : ''}
${conversation.characterSettings.languageExample ? `语言示例：${conversation.characterSettings.languageExample}` : ''}

【🔗 对话连贯性】：
这是一个子聊天对话，你需要知道主聊天的背景：
${mainChatContext}

【💬 子聊天目的】：
${subChat.purpose || '用户希望在独立的空间进行对话'}
${purposeDetected ? `\n\n⚠️ 重要：用户刚刚说明了这个子聊天的目的，你需要理解并确认这个目的，然后基于此目的和主聊天背景进行回复。` : ''}

【📱 多媒体消息功能】：
1. 📷 图片消息：[图片:描述内容]
2. 🎬 视频消息：[视频:描述内容]
3. 🎤 语音消息：[语音:内容,时长X秒]
4. 😊 表情包：[表情包:描述]

【💰 红包、转账功能】：
1️⃣ 发红包：[发红包:金额:留言]
2️⃣ 转账：[转账:金额:备注] 
3️⃣ 接收红包：[接收红包:感谢留言]
4️⃣ 退回红包：[退回红包:理由]
` : '请自然地回复用户的消息。';

      // 4. 构建API请求
      let messages: any[];
      let requestBody: any;

      if (hasImage) {
        // 图片识别逻辑
        const imageMessages = unhandledUserMessages.filter((m: Message) => m.mediaType === 'image' && m.mediaUrl);
        const textMessages = unhandledUserMessages.filter((m: Message) => !m.mediaType);
        
        const recentMessages = subChat.messages.slice(-5);
        const historyMessages = recentMessages
          .filter((m: Message) => !unhandledUserMessages.includes(m))
          .map((m: Message) => ({
            role: m.role,
            content: formatHistoryMessageContent(m)
          }));

        const contentParts: any[] = [];
        
        // 添加所有图片
        imageMessages.forEach((imgMsg: Message) => {
          contentParts.push({
            type: 'image_url',
            image_url: {
              url: imgMsg.mediaUrl
            }
          });
        });
        
        // 添加文字消息
        const combinedText = textMessages.map((m: Message) => m.content).filter(Boolean).join('\n');
        if (combinedText) {
          contentParts.push({
            type: 'text',
            text: combinedText
          });
        } else {
          const imageCount = imageMessages.length;
          const defaultText = imageCount > 1 ? `看这${imageCount}张图` : '看这张图';
          contentParts.push({
            type: 'text',
            text: defaultText
          });
        }

        messages = [
          { role: 'system', content: systemPrompt + '\n\n【图片识别规则】：\n- 只描述你在图片中实际看到的内容\n- 禁止编造、猜测图片中不存在的元素\n- 像朋友间日常聊天一样回复，不要太正式' },
          ...historyMessages,
          {
            role: 'user',
            content: contentParts
          }
        ];

        requestBody = {
          model: apiConfig.modelName,
          messages,
          temperature: 0.4
        };
      } else {
        // 纯文字消息处理
        const recentMessages = subChat.messages.slice(-10);
        const processedMessages = recentMessages.map((m: Message) => ({
          role: m.role,
          content: formatHistoryMessageContent(m)
        }));

        messages = [
          { role: 'system', content: systemPrompt },
          ...processedMessages.slice(0, -unhandledUserMessages.length),
          ...unhandledUserMessages.map((m: Message) => ({
            role: 'user' as const,
            content: m.content
          }))
        ];

        requestBody = {
          model: apiConfig.modelName,
          messages,
          temperature: 0.8,
          max_tokens: 4000
        };
      }

      // 5. 发送API请求
      console.log('📡 发送API请求...');
      const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`,
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || '抱歉，我现在无法回复。';

      // 6. 处理AI回复
      processSubChatAIResponse(aiResponse);
      
    } catch (error) {
      console.error('❌ 子对话AI回复失败:', error);
      // 添加错误消息
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: '抱歉，我现在有点忙，稍后再聊吧~',
        timestamp: Date.now()
      };
      
      _onUpdateSubChat(subChat.id, {
        messages: [...subChat.messages, errorMessage]
      });
    }
  };

  const processSubChatAIResponse = (aiResponse: string) => {
    console.log('🤖 处理AI回复:', aiResponse);
    
    // 🔥 使用splitMessages分割消息（与主聊天保持一致）
    const splitMsgs = splitMessages(aiResponse);
    
    const allNewMessages: Message[] = [];
    
    splitMsgs.forEach((content, index) => {
      const baseId = `ai_${Date.now()}_${index}`;
      let finalContent = content;
      const extraMessages: Message[] = [];
      
      // 检测红包：[发红包:金额:留言]
      const redPacketMatch = finalContent.match(/\[发红包:([\d.]+):([^\]]*)\]/);
      if (redPacketMatch) {
        const amount = parseFloat(redPacketMatch[1]);
        const redPacketMsg = redPacketMatch[2];
        finalContent = finalContent.replace(redPacketMatch[0], '').trim();
        
        extraMessages.push({
          id: `${baseId}_redpacket`,
          role: 'assistant',
          content: '',
          timestamp: Date.now() + 100 + extraMessages.length * 10,
          moneyTransfer: {
            type: 'redPacket',
            amount,
            message: redPacketMsg,
            status: 'pending'
          }
        });
      }

      // 检测转账：[转账:金额:备注]
      const transferMatch = finalContent.match(/\[转账:([\d.]+):([^\]]*)\]/);
      if (transferMatch) {
        const amount = parseFloat(transferMatch[1]);
        const transferMsg = transferMatch[2];
        finalContent = finalContent.replace(transferMatch[0], '').trim();
        
        extraMessages.push({
          id: `${baseId}_transfer`,
          role: 'assistant',
          content: '',
          timestamp: Date.now() + 100 + extraMessages.length * 10,
          moneyTransfer: {
            type: 'transfer',
            amount,
            message: transferMsg,
            status: 'pending'
          }
        });
      }

      // 检测红包/转账接收响应
      const moneyResponseMatch = finalContent.match(/\[(接收|退回)(红包|转账):([^\]]*)\]/);
      if (moneyResponseMatch) {
        const action = moneyResponseMatch[1];
        const type = moneyResponseMatch[2];
        const message = moneyResponseMatch[3];
        finalContent = finalContent.replace(moneyResponseMatch[0], '').trim();
        
        extraMessages.push({
          id: `${baseId}_moneyresponse`,
          role: 'assistant',
          content: '',
          timestamp: Date.now() + 100 + extraMessages.length * 10,
          moneyTransfer: {
            type: type === '红包' ? 'redPacket' : 'transfer',
            amount: 0,
            message: message,
            status: action === '接收' ? 'received' : 'returned'
          }
        });
      }

      // 提取所有媒体项（支持多媒体混合）- 与主聊天保持一致
      const mediaItems: any[] = [];
      let cleanContent = finalContent;
      
      // 提取所有图片
      const imageMatches = finalContent.matchAll(/\[图片[:：]([^\]]+)\]/g);
      for (const match of imageMatches) {
        mediaItems.push({
          type: 'image',
          description: match[1].trim()
        });
        cleanContent = cleanContent.replace(match[0], '').trim();
      }
      
      // 提取所有视频
      const videoMatches = finalContent.matchAll(/\[视频[:：]([^\]]+)\]/g);
      for (const match of videoMatches) {
        mediaItems.push({
          type: 'video',
          description: match[1].trim()
        });
        cleanContent = cleanContent.replace(match[0], '').trim();
      }
      
      // 提取所有语音
      const voiceMatches = finalContent.matchAll(/\[语音[:：]([^,\]]+)(?:,(\d+)秒)?\]/g);
      for (const match of voiceMatches) {
        const voiceContent = match[1].trim();
        const duration = match[2] ? parseInt(match[2]) : 3;
        mediaItems.push({
          type: 'voice',
          description: `语音消息 ${duration}秒: ${voiceContent}`
        });
        cleanContent = cleanContent.replace(match[0], '').trim();
      }
      
      // 提取所有表情包
      const stickerMatches = finalContent.matchAll(/\[表情包[:：]([^\]]+)\]/g);
      for (const match of stickerMatches) {
        mediaItems.push({
          type: 'sticker',
          description: match[1].trim()
        });
        cleanContent = cleanContent.replace(match[0], '').trim();
      }

      // 创建主要回复消息（每个分割片段对应一个气泡）
      if (cleanContent || mediaItems.length > 0) {
        const mainMessage: Message = {
          id: baseId,
          role: 'assistant',
          content: cleanContent || '😊',
          timestamp: Date.now() + index * 100,
          ...(mediaItems.length > 0 && { mediaItems })
        };
        
        allNewMessages.push(mainMessage);
      }
      
      // 添加额外消息（红包、转账等）
      allNewMessages.push(...extraMessages);
    });

    // 更新消息列表
    const newMessages = [
      ...subChat.messages,
      ...allNewMessages
    ];

    _onUpdateSubChat(subChat.id, { messages: newMessages });
  };

  // 🔥 消息操作处理函数 - 复制ChatScreen的实现
  const handleMessageClick = (messageId: string, event: React.MouseEvent) => {
    // 如果点击的是操作按钮或媒体控件，不处理
    const target = event.target as HTMLElement;
    if (target.closest('.message-action-btn') || 
        target.closest('audio') || 
        target.closest('video') || 
        target.closest('button') ||
        target.tagName === 'IMG') {
      return;
    }
    
    // 获取点击位置，显示菜单
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;
    
    setSelectedMessageId(messageId);
    setMenuPosition({ x, y });
  };

  const handleCloseMenu = () => {
    setSelectedMessageId(null);
  };

  const handleDeleteMessage = () => {
    if (!selectedMessageId) return;
    
    setIsDeleting(true);
    const updatedMessages = subChat.messages.filter(m => m.id !== selectedMessageId);
    _onUpdateSubChat(subChat.id, { messages: updatedMessages });
    setSelectedMessageId(null);
    setIsDeleting(false);
  };

  const handleEditMessage = () => {
    if (!selectedMessageId) return;
    
    const message = subChat.messages.find(m => m.id === selectedMessageId);
    if (!message) return;
    
    setMessageBeingEdited(message);
    setInput(message.content);
    setSelectedMessageId(null);
    
    // 聚焦输入框
    setTimeout(() => {
      const inputElement = document.querySelector('.subchat-input') as HTMLInputElement;
      if (inputElement) {
        inputElement.focus();
        inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length);
      }
    }, 100);
  };

  const handleQuoteMessage = () => {
    if (!selectedMessageId) return;
    
    const message = subChat.messages.find(m => m.id === selectedMessageId);
    if (!message) return;
    
    setQuotedMessage(message);
    setSelectedMessageId(null);
    
    setTimeout(() => {
      const inputElement = document.querySelector('.subchat-input') as HTMLInputElement;
      if (inputElement) {
        inputElement.focus();
      }
    }, 100);
  };

  const handleCancelQuote = () => {
    setQuotedMessage(null);
  };

  const handleCancelEdit = () => {
    setMessageBeingEdited(null);
    setInput('');
  };

  const handleEnterMultiSelect = () => {
    setIsMultiSelectMode(true);
    setSelectedMessages([selectedMessageId!]);
    setSelectedMessageId(null);
  };

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => 
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleCancelMultiSelect = () => {
    setIsMultiSelectMode(false);
    setSelectedMessages([]);
  };

  const handleBatchDelete = () => {
    if (selectedMessages.length === 0) return;
    
    setIsDeleting(true);
    const updatedMessages = subChat.messages.filter(m => !selectedMessages.includes(m.id));
    _onUpdateSubChat(subChat.id, { messages: updatedMessages });
    setSelectedMessages([]);
    setIsMultiSelectMode(false);
    setIsDeleting(false);
  };

  const handleForwardSingleMessage = () => {
    if (!selectedMessageId || !conversations || !onUpdateConversation) {
      alert('转发功能需要传入对话列表参数');
      return;
    }
    
    const message = subChat.messages.find(m => m.id === selectedMessageId);
    if (!message) return;
    
    setForwardingMessages([message]);
    setShowForwardSelector(true);
    setSelectedMessageId(null);
  };

  // 处理子聊天中的消息回应 (Reaction)
  const handleReactMessage = (emoji: string) => {
    if (!selectedMessageId) return;

    const updatedMessages = subChat.messages.map(msg => {
      if (msg.id === selectedMessageId) {
        const currentReactions = msg.reactions || [];
        // 检查是否已经有该用户的该表情
        const existingIndex = currentReactions.findIndex(r => r.from === 'user' && r.type === emoji);

        let newReactions;
        if (existingIndex >= 0) {
          // 如果已存在，则移除（toggle）
          newReactions = currentReactions.filter((_, i) => i !== existingIndex);
        } else {
          // 否则添加
          newReactions = [...currentReactions, { from: 'user' as const, type: emoji }];
        }

        return { ...msg, reactions: newReactions };
      }
      return msg;
    });

    _onUpdateSubChat(subChat.id, {
      messages: updatedMessages
    });

    setSelectedMessageId(null);
  };

  // 🔥 导出子聊天功能
  const handleExportSubChat = () => {
    try {
      const exportData = {
        version: '2.0',
        type: 'subchat',
        exportTime: new Date().toISOString(),
        
        // 子聊天基本信息
        subChat: {
          id: subChat.id,
          name: subChat.name,
          purpose: subChat.purpose,
          createdAt: subChat.createdAt,
          lastMessageTime: subChat.lastMessageTime,
          status: subChat.status,
          conversationId: subChat.conversationId,
          initiator: subChat.initiator,
          isActive: subChat.isActive,
          unreadCount: subChat.unreadCount,
        },
        
        // 完整消息记录
        messages: subChat.messages,
        
        // 相关对话信息（用于导入时的上下文）
        parentConversation: {
          id: conversation.id,
          name: conversation.name,
          characterSettings: {
            nickname: conversation.characterSettings?.nickname,
            personality: conversation.characterSettings?.personality,
          }
        },
        
        // 统计信息
        stats: {
          messagesCount: subChat.messages.length,
          userMessagesCount: subChat.messages.filter(m => m.role === 'user').length,
          aiMessagesCount: subChat.messages.filter(m => m.role === 'assistant').length,
        }
      };
      
      // 生成文件
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `subchat_${subChat.name}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert(`✅ 子聊天「${subChat.name}」已导出成功！\n包含 ${subChat.messages.length} 条消息记录`);
    } catch (error) {
      console.error('导出子聊天失败:', error);
      alert('❌ 导出失败，请重试');
    }
  };

  const handleExtractToDocument = () => {
    // 简化版文档提取
    alert('子对话文档提取功能开发中，敬请期待！');
    setIsMultiSelectMode(false);
    setSelectedMessages([]);
  };

  const handleForwardMultiple = () => {
    if (!conversations || !onUpdateConversation || selectedMessages.length === 0) {
      alert(selectedMessages.length === 0 ? '请先选择要转发的消息' : '转发功能需要传入对话列表参数');
      return;
    }
    
    const messagesToForward = subChat.messages.filter(m => selectedMessages.includes(m.id));
    setForwardingMessages(messagesToForward);
    setShowForwardSelector(true);
    setIsMultiSelectMode(false);
    setSelectedMessages([]);
  };

  // 🔄 确认转发到目标会话
  const handleConfirmForward = (targetConversationIds: string[], mergeForward: boolean) => {
    if (forwardingMessages.length === 0 || !onUpdateConversation || !conversations) return;
    
    targetConversationIds.forEach(targetId => {
      const targetConv = conversations.find(c => c.id === targetId);
      if (!targetConv) return;
      
      let newMessage: Message;
      
      if (mergeForward && forwardingMessages.length > 1) {
        // 合并转发
        const senderNames = new Map<string, { name: string; avatar?: string }>();
        forwardingMessages.forEach(msg => {
          const name = msg.role === 'user' 
            ? (currentUserProfile?.username || '我')
            : (conversation.characterSettings?.nickname || conversation.name);
          const avatar = msg.role === 'user'
            ? (currentUserProfile?.avatar)
            : (conversation.characterSettings?.avatar || conversation.avatar);
          senderNames.set(msg.id, { name, avatar });
        });
        
        const forwardedData = createMergedForward(
          forwardingMessages,
          {
            id: subChat.conversationId,
            name: `${conversation.characterSettings?.nickname || conversation.name} - ${subChat.name}`,
            type: 'private'
          },
          senderNames
        );
        
        newMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'user',
          content: '转发了聊天记录',
          timestamp: Date.now(),
          forwarded: forwardedData
        };
      } else {
        // 单条转发
        const msg = forwardingMessages[0];
        const forwardedData = createSingleForward(
          msg,
          {
            id: subChat.conversationId,
            name: `${conversation.characterSettings?.nickname || conversation.name} - ${subChat.name}`,
            type: 'private'
          }
        );
        
        newMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'user',
          content: forwardingMessages.length === 1 ? getMessagePreview(msg) : '转发了多条消息',
          timestamp: Date.now(),
          forwarded: forwardedData
        };
      }
      
      // 更新目标会话
      onUpdateConversation(targetId, {
        messages: [...targetConv.messages, newMessage]
      });
    });
    
    // 关闭选择器
    setShowForwardSelector(false);
    setForwardingMessages([]);
    
    alert(`✅ 成功转发到 ${targetConversationIds.length} 个对话`);
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

  // 🎵 音乐分享处理
  const handleMusicShare = (musicInfo: MusicInfo) => {
    const musicMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: '', // 不显示多余文本
      timestamp: Date.now(),
      mediaType: 'sticker', // 使用sticker类型显示音乐卡片
      mediaDescription: `分享音乐: ${musicInfo.title} - ${musicInfo.artist}`,
      // 可以添加音乐相关的自定义字段
    };
    
    _onUpdateSubChat(subChat.id, {
      messages: [...subChat.messages, musicMessage]
    });
    
    setShowMusicShareModal(false);
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
            onClick={handleExportSubChat}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title="导出子聊天"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Download className="w-4 h-4" />
          </button>
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
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-purple-50/30 to-blue-50/30"
      >
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
            {/* 🚀 滚动加载：顶部加载指示器 */}
            {isLoadingMore && (
              <div className="flex justify-center py-3">
                <div className="flex items-center gap-2 text-gray-500 text-xs">
                  <div className="w-3 h-3 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin"></div>
                  <span>加载更多消息中...</span>
                </div>
              </div>
            )}
            
            {/* 是否还有更多历史消息提示 */}
            {!isLoadingMore && messageWindow.startIndex > 0 && (
              <div className="flex justify-center py-2">
                <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                  还有 {messageWindow.startIndex} 条历史消息，向上滑动加载更多
                </div>
              </div>
            )}
            
            {/* 根据消息窗口显示消息 */}
            {subChat.messages.slice(messageWindow.startIndex, messageWindow.startIndex + messageWindow.size).map((message) => (
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
                      onClick={(e) => {
                        if (isMultiSelectMode) {
                          toggleMessageSelection(message.id);
                        } else {
                          handleMessageClick(message.id, e);
                        }
                      }}
                      className={`rounded-2xl px-3 py-2 cursor-pointer relative ${
                        isMultiSelectMode && selectedMessages.includes(message.id) 
                          ? 'ring-2 ring-blue-500 bg-blue-50 ' : ''
                      }${
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
            
            {/* 🚀 返回底部按钮 - 当用户不在底部时显示 */}
            {!shouldScrollToBottom && isUserScrolling && (
              <div className="fixed bottom-20 right-4 z-50">
                <button
                  onClick={() => {
                    console.log('🔄 子聊天：用户点击返回底部');
                    
                    // 智能重置：回到底部时重置为合理的消息窗口
                    const resetSize = Math.min(50, subChat.messages.length); // 子聊天最多50条
                    const newWindow = {
                      startIndex: Math.max(0, subChat.messages.length - resetSize),
                      size: resetSize
                    };
                    
                    setMessageWindow(newWindow);
                    setShouldScrollToBottom(true);
                    setIsUserScrolling(false);
                    
                    setTimeout(() => smartScrollToBottom(true), 50);
                  }}
                  className="bg-purple-500 hover:bg-purple-600 text-white p-2 rounded-full shadow-lg transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  <span className="text-xs">回到底部</span>
                </button>
              </div>
            )}
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
            <button onClick={() => setShowMusicShareModal(true)} className="flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-white border border-purple-300 flex items-center justify-center hover:border-purple-400 transition-colors">
                <Music className="w-4 h-4 text-purple-600" />
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

      {/* 🔥 引用消息显示 */}
      {quotedMessage && (
        <div className="border-t border-purple-100 px-3 pt-2 bg-gray-50">
          <div className="flex items-center justify-between bg-white rounded-lg p-2 border-l-4 border-purple-400">
            <div className="flex-1">
              <div className="text-xs text-purple-600 font-medium mb-1">
                回复 {quotedMessage.role === 'user' ? '我' : conversation.characterSettings?.nickname || '助手'}:
              </div>
              <div className="text-sm text-gray-600 line-clamp-2">
                {quotedMessage.content || '[多媒体消息]'}
              </div>
            </div>
            <button
              onClick={handleCancelQuote}
              className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 🔥 编辑消息显示 */}
      {messageBeingEdited && (
        <div className="border-t border-purple-100 px-3 pt-2 bg-blue-50">
          <div className="flex items-center justify-between bg-white rounded-lg p-2 border-l-4 border-blue-400">
            <div className="flex-1">
              <div className="text-xs text-blue-600 font-medium mb-1">
                编辑消息:
              </div>
              <div className="text-sm text-gray-600 line-clamp-2">
                {messageBeingEdited.content}
              </div>
            </div>
            <button
              onClick={handleCancelEdit}
              className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
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
            placeholder={messageBeingEdited ? "编辑消息..." : quotedMessage ? "回复消息..." : "输入消息..."}
            rows={1}
            className="subchat-input flex-1 px-3 py-2 border border-purple-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
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

      {/* 📹 视频描述模态框 */}
      {showVideoDescModal && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">视频内容描述</h3>
            <p className="text-sm text-gray-600 mb-4">
              请简单描述视频内容，AI会基于描述理解并回复。
            </p>
            <textarea
              value={videoDescInput}
              onChange={(e) => setVideoDescInput(e.target.value)}
              placeholder="例如：我录了一个跳舞的视频"
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
                className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                发送
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎵 音乐分享模态框 */}
      <MusicShareModal
        isOpen={showMusicShareModal}
        onClose={() => setShowMusicShareModal(false)}
        onShareMusic={handleMusicShare}
        characterName={conversation.characterSettings?.nickname || conversation.name}
      />

      {/* 🔥 消息操作菜单 */}
      <MessageActionMenu
        isVisible={selectedMessageId !== null}
        position={menuPosition}
        onQuote={handleQuoteMessage}
        onEdit={handleEditMessage}
        onDelete={handleDeleteMessage}
        onMultiSelect={handleEnterMultiSelect}
        onForward={handleForwardSingleMessage}
        onReact={handleReactMessage}
        onClose={handleCloseMenu}
      />

      {/* 🔥 多选工具栏 */}
      {isMultiSelectMode && (
        <MessageSelectionToolbar
          selectedCount={selectedMessages.length}
          onCancel={handleCancelMultiSelect}
          onExtractDocument={handleExtractToDocument}
          onForward={handleForwardMultiple}
          onDelete={handleBatchDelete}
        />
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
      
      {/* 📤 转发目标选择器 */}
      {showForwardSelector && conversations && (
        <ForwardTargetSelector
          conversations={conversations}
          onConfirm={handleConfirmForward}
          onCancel={() => {
            setShowForwardSelector(false);
            setForwardingMessages([]);
          }}
        />
      )}
    </div>
  );
};

export default SubChatWindow;
