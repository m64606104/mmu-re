/**
 * 优化的消息组件 - 解决渲染性能问题
 * 使用 React.memo 和 useMemo 优化重新渲染
 */

import React, { memo, useMemo, useCallback } from 'react';
import { Message } from '../types';
import WordStyleDocumentCard from './WordStyleDocumentCard';
import MusicCard from './MusicCard';
import RealMusicCard from './RealMusicCard';
import { Mic, Smile } from 'lucide-react';

interface OptimizedMessageItemProps {
  message: Message;
  index?: number; // 可选，某些情况下不需要
  conversation: any;
  isMultiSelectMode: boolean;
  isSelected: boolean;
  showTime: boolean;
  userBadge: string;
  onMessageClick: (messageId: string, event: React.MouseEvent) => void;
  onToggleSelection: (messageId: string) => void;
  onViewDocument?: (document: any) => void;
  onForwardDocument?: (document: any) => void;
  onViewVoice?: (messageId: string) => void;
  viewingVoice?: string[];
}

const OptimizedMessageItem: React.FC<OptimizedMessageItemProps> = memo(({
  message,
  index: _index, // 使用下划线前缀标识未使用参数
  conversation,
  isMultiSelectMode,
  isSelected,
  showTime,
  userBadge,
  onMessageClick,
  onToggleSelection,
  onViewDocument,
  onForwardDocument,
  onViewVoice,
  viewingVoice = []
}) => {
  
  // 缓存角色相关信息
  const senderInfo = useMemo(() => ({
    isUser: message.role === 'user',
    isAssistant: message.role === 'assistant',
    isSystem: message.role === 'system',
    avatar: conversation.characterSettings?.avatar,
    name: conversation.characterSettings?.nickname || conversation.name
  }), [message.role, conversation.characterSettings?.avatar, conversation.characterSettings?.nickname, conversation.name]);

  // 缓存样式类名
  const messageClasses = useMemo(() => {
    const baseClasses = "rounded-2xl shadow-sm cursor-pointer";
    const roleClasses = senderInfo.isUser 
      ? "bg-white text-gray-900 border border-gray-200"
      : "bg-white text-gray-900 border border-gray-200";
    const paddingClasses = message.mediaType || message.moneyTransfer 
      ? "p-0 overflow-hidden" 
      : message.replyTo ? "pb-2.5" : "px-4 py-2.5";
    const selectionClasses = isMultiSelectMode && isSelected 
      ? "ring-2 ring-purple-500" : "";
    
    return `${baseClasses} ${roleClasses} ${paddingClasses} ${selectionClasses}`.trim();
  }, [senderInfo.isUser, message.mediaType, message.moneyTransfer, message.replyTo, isMultiSelectMode, isSelected]);

  // 缓存事件处理函数
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isMultiSelectMode) {
      onToggleSelection(message.id);
    } else {
      onMessageClick(message.id, e);
    }
  }, [isMultiSelectMode, message.id, onToggleSelection, onMessageClick]);

  const handleSelectionChange = useCallback(() => {
    onToggleSelection(message.id);
  }, [message.id, onToggleSelection]);

  const handleViewVoice = useCallback(() => {
    onViewVoice?.(message.id);
  }, [message.id, onViewVoice]);

  // 缓存时间显示
  const timeElement = useMemo(() => {
    if (!showTime) return null;
    return (
      <div className="flex justify-center my-4">
        <span className="text-xs text-gray-400 bg-white/80 px-3 py-1 rounded-full">
          {new Date(message.timestamp).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })} {' '}
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    );
  }, [showTime, message.timestamp]);

  // 系统消息优化渲染
  if (senderInfo.isSystem) {
    return (
      <>
        {timeElement}
        <div className="flex justify-center my-2">
          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
            {message.content}
          </span>
        </div>
      </>
    );
  }

  // 缓存头像组件
  const avatarElement = useMemo(() => {
    if (!senderInfo.isAssistant) return null;
    
    return (
      <div className="relative flex-shrink-0">
        {senderInfo.avatar ? (
          <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-md">
            <img src={senderInfo.avatar} alt="AI头像" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border-2 border-white shadow-md">
            <span className="text-white font-semibold text-sm">{senderInfo.name.charAt(0)}</span>
          </div>
        )}
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
          <span className="text-[10px]">{userBadge}</span>
        </div>
      </div>
    );
  }, [senderInfo.isAssistant, senderInfo.avatar, senderInfo.name, userBadge]);

  return (
    <>
      {timeElement}
      <div 
        id={`message-${message.id}`} 
        className={`message-bubble flex gap-2 items-end transition-colors ${
          senderInfo.isUser ? 'justify-end' : 'justify-start'
        }`}
      >
        {avatarElement}
        
        <div className="relative max-w-[70%]">
          {/* 多选复选框 - 优化位置计算 */}
          {isMultiSelectMode && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleSelectionChange}
              className="absolute -left-8 top-1/2 -translate-y-1/2 w-5 h-5 rounded border-2 border-gray-300 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          
          {/* 引用消息 - 缓存渲染 */}
          {message.replyTo && (message.moneyTransfer || message.document || message.order) && (
            <div className="mb-1.5 bg-gray-50 rounded-lg p-2 border border-gray-200">
              <div className="text-xs text-gray-500 flex items-start gap-1">
                <div className="w-0.5 h-full bg-blue-400 mr-1 rounded"></div>
                <div className="flex-1">
                  <div className="font-medium text-gray-700">
                    {message.replyTo.role === 'user' ? '我' : conversation.name}
                  </div>
                  <div className="line-clamp-2 text-gray-600">{message.replyTo.content}</div>
                </div>
              </div>
            </div>
          )}
          
          <div onClick={handleClick} className={messageClasses}>
            {/* 引用消息显示 - 条件渲染优化 */}
            {message.replyTo && !message.moneyTransfer && !message.document && !message.order && (
              <div className="pt-3">
                <div className="px-4 text-sm text-gray-600 leading-relaxed mb-2.5">
                  {message.replyTo.content}
                </div>
                <div className="border-b border-gray-200 mb-2.5"></div>
              </div>
            )}
            
            {/* 红包/转账消息 - 使用memo优化 */}
            <MoneyTransferMessage message={message} />
            
            {/* 文档消息 - 使用memo优化 */}
            <DocumentMessage 
              message={message} 
              onView={onViewDocument}
              onForward={onForwardDocument}
            />
            
            {/* 音乐消息 - 使用memo优化 */}
            <MusicMessage message={message} />
            
            {/* 媒体消息 - 使用memo优化 */}
            <MediaMessage 
              message={message} 
              onViewVoice={handleViewVoice}
              isVoiceViewing={viewingVoice.includes(message.id)}
            />
            
            {/* 文本内容 - 优化条件判断 */}
            <TextContent message={message} />
          </div>
        </div>
      </div>
    </>
  );
});

// 子组件优化 - 使用memo避免不必要的重新渲染

const MoneyTransferMessage = memo(({ message }: { message: Message }) => {
  if (!message.moneyTransfer) return null;
  
  return (
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
        {/* 状态显示 */}
        {message.moneyTransfer.status === 'pending' && message.role === 'user' && (
          <div className="text-xs opacity-75">等待对方领取</div>
        )}
        {message.moneyTransfer.status === 'received' && (
          <div className="text-xs opacity-75">
            已{message.moneyTransfer.type === 'redPacket' ? '领取' : '收款'}
          </div>
        )}
        {message.moneyTransfer.status === 'returned' && (
          <div className="text-xs opacity-75">已退回</div>
        )}
      </div>
    </div>
  );
});

const DocumentMessage = memo(({ 
  message, 
  onView, 
  onForward 
}: { 
  message: Message; 
  onView?: (doc: any) => void;
  onForward?: (doc: any) => void;
}) => {
  if (!message.document) return null;
  
  return (
    <div className="max-w-[300px]">
      <WordStyleDocumentCard
        document={message.document}
        onClick={() => onView?.(message.document)}
        onSave={() => {
          // 保存逻辑
        }}
        onForward={() => onForward?.(message.document)}
      />
    </div>
  );
});

const MusicMessage = memo(({ message }: { message: Message }) => {
  if (!message.music) return null;
  
  return (
    <div className="max-w-[300px]">
      {(message.music as any).isRealMusic ? (
        <RealMusicCard
          music={message.music as any}
          className="w-full"
          showGenerateButton={true}
          onGenerateAIResponse={() => {
            // AI回复逻辑
          }}
        />
      ) : (
        <MusicCard
          music={message.music}
          className="w-full"
          showPlayButton={true}
          enableRealAudio={true}
        />
      )}
    </div>
  );
});

const MediaMessage = memo(({ 
  message, 
  onViewVoice, 
  isVoiceViewing 
}: { 
  message: Message; 
  onViewVoice: () => void;
  isVoiceViewing: boolean;
}) => {
  if (!message.mediaType) return null;
  
  switch (message.mediaType) {
    case 'image':
      return message.mediaUrl ? (
        <img 
          src={message.mediaUrl} 
          alt="图片" 
          className="w-full max-w-[300px] rounded-2xl"
          loading="lazy" // 懒加载优化
        />
      ) : null;
      
    case 'video':
      return message.mediaUrl ? (
        <video 
          src={message.mediaUrl} 
          controls 
          className="w-full max-w-[300px] rounded-2xl"
          preload="metadata" // 优化加载
        />
      ) : null;
      
    case 'voice':
      return message.mediaUrl ? (
        <div>
          <div 
            onClick={onViewVoice}
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
            <span className="text-xs text-gray-600 flex-shrink-0 mr-1">
              {message.voiceDuration || 0}"
            </span>
          </div>
          {isVoiceViewing && message.mediaDescription && (
            <div className="mt-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-[13px] text-gray-700">{message.mediaDescription}</p>
            </div>
          )}
        </div>
      ) : null;
      
    case 'sticker':
      return (
        <div className="relative w-[120px] h-[120px] rounded-2xl overflow-hidden bg-purple-100/40 backdrop-blur-sm border border-purple-200">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 to-purple-100/30" />
          <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
            <Smile className="w-8 h-8 text-purple-400 mb-2" strokeWidth={1.5} />
            <p className="text-xs text-gray-700 leading-tight">{message.mediaDescription}</p>
          </div>
        </div>
      );
      
    default:
      return null;
  }
});

const TextContent = memo(({ message }: { message: Message }) => {
  // 优化文本内容显示条件
  const shouldShowText = message.content && 
    message.content.trim() && 
    !message.document && 
    !message.moneyTransfer;
    
  if (!shouldShowText) return null;
  
  return (
    <p className="text-sm whitespace-pre-wrap break-words">
      {message.content}
    </p>
  );
});

OptimizedMessageItem.displayName = 'OptimizedMessageItem';

export default OptimizedMessageItem;
