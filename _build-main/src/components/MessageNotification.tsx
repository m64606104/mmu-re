import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Conversation, Message } from '../types';
import { normalizeMessagePreviewText } from '../utils/messageFormatter';

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
  const notificationsRef = useRef<NotificationData[]>([]);
  const timerIdsRef = useRef<number[]>([]);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    return () => {
      timerIdsRef.current.forEach((timerId) => clearTimeout(timerId));
      timerIdsRef.current = [];
    };
  }, []);

  // 添加通知（升级版：每条消息一个弹窗）
  const addNotification = (conversationId: string, messages: Message[]) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation || messages.length === 0) return;

    console.log(`📬 收到${messages.length}条新消息，为每条创建独立弹窗`);

    // 🎯 关键改进：为每条消息创建独立的弹窗
    messages.forEach((message, index) => {
      const notification: NotificationData = {
        id: `notif_${Date.now()}_${index}_${Math.random()}`,
        conversation,
        message: message, // 每条消息独立显示
        timestamp: Date.now() + index // 加上索引确保顺序
      };

      // 延迟添加，避免同时出现（每个间隔200ms）
      const enqueueTimerId = window.setTimeout(() => {
        setNotifications(prev => [...prev, notification]);
        setVisible(prev => prev ? prev : notification.id);

        // 5秒后自动隐藏并移除
        const dismissTimerId = window.setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== notification.id));
          // 如果这是当前显示的，切换到下一个
          setVisible(prev => {
            if (prev === notification.id) {
              const remaining = notificationsRef.current.filter(n => n.id !== notification.id);
              return remaining.length > 0 ? remaining[0].id : null;
            }
            return prev;
          });
        }, 5000);
        timerIdsRef.current.push(dismissTimerId);
      }, index * 200); // 每个弹窗延迟200ms出现
      timerIdsRef.current.push(enqueueTimerId);
    });
  };

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

    const normalized = normalizeMessagePreviewText(message.content || '');
    if (normalized.length > 30) {
      return normalized.substring(0, 30) + '...';
    }
    return normalized;
  };

  if (notifications.length === 0) return null;

  // 🎯 改进：显示所有通知（堆叠显示）
  // 最多同时显示3个
  const visibleNotifications = notifications.slice(0, 3);

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
      {visibleNotifications.map((notification, index) => {
        const isVisible = visible === notification.id || index === 0; // 第一个总是可见
        
        return (
          <div 
            key={notification.id}
            className={`
              mx-auto max-w-md px-4
              transform transition-all duration-300 ease-out
              ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
            `}
            style={{
              paddingTop: `${8 + index * 90}px` // 堆叠：每个弹窗间隔90px
            }}
          >
            <div 
              onClick={() => handleClick(notification.conversation.id, notification.id)}
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
                  {notification.conversation.avatar ? (
                    <img
                      src={notification.conversation.avatar}
                      alt={notification.conversation.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                      {notification.conversation.name.charAt(0)}
                    </div>
                  )}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {notification.conversation.characterSettings?.nickname || notification.conversation.name}
                    </h3>
                    <button
                      onClick={(e) => handleClose(notification.id, e)}
                      className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X size={14} className="text-gray-400" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {formatMessageContent(notification.message)}
                  </p>
                </div>
              </div>

              {/* 底部进度条 */}
              <div className="h-1 bg-gray-100 overflow-hidden">
                <div 
                  className="h-full bg-blue-500 animate-progress"
                  style={{
                    animation: 'progress 5s linear forwards'
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}

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
