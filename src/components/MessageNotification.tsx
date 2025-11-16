import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Conversation, Message } from '../types';

interface NotificationData {
  id: string;
  conversation: Conversation;
  message: Message;
  timestamp: number;
}

interface MessageNotificationProps {
  conversations: Conversation[];
  onNavigate: (conversationId: string) => void;
}

const MessageNotification: React.FC<MessageNotificationProps> = ({
  conversations,
  onNavigate
}) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [visible, setVisible] = useState<string | null>(null);
  const [queue, setQueue] = useState<NotificationData[]>([]); // 通知队列
  const [isProcessing, setIsProcessing] = useState(false);

  // 添加通知 - 为每条消息创建独立通知
  const addNotification = (conversationId: string, messages: Message[]) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation || messages.length === 0) return;

    // 🔥 为每条消息创建独立的通知
    const newNotifications = messages.map((message, index) => ({
      id: `notif_${Date.now()}_${index}_${Math.random()}`,
      conversation,
      message,
      timestamp: Date.now() + index // 确保顺序
    }));

    // 添加到队列
    setQueue(prev => [...prev, ...newNotifications]);
  };

  // 处理队列中的通知
  useEffect(() => {
    if (queue.length === 0 || isProcessing) return;

    setIsProcessing(true);
    const nextNotification = queue[0];
    
    // 显示通知
    setNotifications(prev => [nextNotification, ...prev]);
    setVisible(nextNotification.id);

    // 3秒后自动隐藏
    setTimeout(() => {
      setVisible(prev => prev === nextNotification.id ? null : prev);
      
      // 再等0.5秒后移除并处理下一个
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== nextNotification.id));
        setQueue(prev => prev.slice(1)); // 移除已处理的
        setIsProcessing(false);
      }, 500);
    }, 3000);
  }, [queue, isProcessing]);

  // 暴露给外部的方法
  useEffect(() => {
    // 将addNotification方法挂载到window对象供外部调用
    (window as any).__messageNotification = {
      add: addNotification
    };
    
    return () => {
      delete (window as any).__messageNotification;
    };
  }, [conversations]);

  const handleClick = (conversationId: string, notificationId: string) => {
    setVisible(null);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      onNavigate(conversationId);
    }, 300);
  };

  const handleClose = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(null);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }, 300);
  };

  // 格式化消息内容
  const formatMessageContent = (message: Message): string => {
    if (message.mediaType === 'image') return '[图片]';
    if (message.mediaType === 'video') return '[视频]';
    if (message.mediaType === 'voice') return '[语音]';
    if (message.mediaType === 'sticker') return '[表情包]';
    
    // 截断长消息
    if (message.content.length > 30) {
      return message.content.substring(0, 30) + '...';
    }
    return message.content;
  };

  // 显示当前正在展示的通知
  const currentNotification = notifications.find(n => n.id === visible);
  if (!currentNotification) return null;

  const isVisible = true; // 找到的通知就是可见的

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
      <div 
        className={`
          mx-auto max-w-md px-4 pt-2 pb-0
          transform transition-all duration-300 ease-out
          ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
        `}
      >
        <div 
          onClick={() => handleClick(currentNotification.conversation.id, currentNotification.id)}
          className="
            bg-white rounded-2xl shadow-2xl overflow-hidden
            pointer-events-auto cursor-pointer
            hover:shadow-3xl transition-shadow duration-200
            border border-gray-100
          "
        >
          <div className="flex items-center gap-3 p-3">
            {/* 头像 */}
            <div className="flex-shrink-0">
              {currentNotification.conversation.avatar ? (
                <img
                  src={currentNotification.conversation.avatar}
                  alt={currentNotification.conversation.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                  {currentNotification.conversation.name.charAt(0)}
                </div>
              )}
            </div>

            {/* 内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {currentNotification.conversation.characterSettings?.nickname || currentNotification.conversation.name}
                </h3>
                <button
                  onClick={(e) => handleClose(currentNotification.id, e)}
                  className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={14} className="text-gray-400" />
                </button>
              </div>
              <p className="text-sm text-gray-600 truncate">
                {formatMessageContent(currentNotification.message)}
              </p>
            </div>
          </div>

          {/* 底部进度条 */}
          <div className="h-1 bg-gray-100 overflow-hidden">
            <div 
              className="h-full bg-blue-500 animate-progress"
              style={{
                animation: 'progress 3s linear forwards'
              }}
            />
          </div>
        </div>
      </div>

      {/* CSS动画 */}
      <style>{`
        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
};

export default MessageNotification;

// 辅助函数：从外部触发通知
export const showMessageNotification = (conversationId: string, messages: Message[]) => {
  const notificationApi = (window as any).__messageNotification;
  if (notificationApi) {
    notificationApi.add(conversationId, messages);
  }
};
