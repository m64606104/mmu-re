/**
 * 慢邮件通知中心
 * 显示所有信件相关通知
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, Check, Trash2, CheckCheck } from 'lucide-react';
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification,
  clearAllNotifications
} from '../utils/letterNotificationSystem';
import { LetterNotification } from '../types/letterNotification';

interface LetterNotificationCenterProps {
  onBack: () => void;
  onNotificationClick?: (notification: LetterNotification) => void;
}

export default function LetterNotificationCenter({ onBack, onNotificationClick }: LetterNotificationCenterProps) {
  const [notifications, setNotifications] = useState<LetterNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    refreshNotifications();
  }, []);

  const refreshNotifications = () => {
    const allNotifications = getNotifications();
    setNotifications(allNotifications.reverse()); // 最新的在前
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const handleNotificationClick = (notification: LetterNotification) => {
    if (!notification.read) {
      markAsRead(notification.id);
      refreshNotifications();
    }
    
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  const handleDelete = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteNotification(notificationId)) {
      refreshNotifications();
    }
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
    refreshNotifications();
  };

  const handleClearAll = () => {
    if (window.confirm('确定要清空所有通知吗？')) {
      clearAllNotifications();
      refreshNotifications();
    }
  };

  // 获取通知图标
  const getNotificationIcon = (notification: LetterNotification) => {
    switch (notification.type) {
      case 'reply_received':
        return '💌';
      case 'letter_delivered':
        return '✉️';
      case 'letter_failed':
        return '❌';
      case 'new_penfriend':
        return '🎉';
      case 'penfriend_reply':
        return '📬';
      case 'stamp_unlocked':
        return '🎫';
      case 'bottle_arrived':
        return '🌊';
      default:
        return '📮';
    }
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col">
      {/* 顶部栏 */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">新消息</h1>
          <div className="w-10" />
        </div>

        {/* 筛选和操作按钮 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`
                px-4 py-1.5 rounded-full text-sm font-medium transition-all
                ${filter === 'all' 
                  ? 'bg-white text-blue-600 shadow-md' 
                  : 'bg-white/20 text-white hover:bg-white/30'
                }
              `}
            >
              全部通知
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`
                px-4 py-1.5 rounded-full text-sm font-medium transition-all
                ${filter === 'unread' 
                  ? 'bg-white text-blue-600 shadow-md' 
                  : 'bg-white/20 text-white hover:bg-white/30'
                }
              `}
            >
              未读
            </button>
          </div>

          <div className="flex gap-2">
            {notifications.some(n => !n.read) && (
              <button
                onClick={handleMarkAllRead}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-colors flex items-center gap-1"
              >
                <CheckCheck size={16} />
                全部已读
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 通知列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <div className="text-gray-500">
              {filter === 'unread' ? '没有未读通知' : '暂无通知'}
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl mx-auto">
            {filteredNotifications.map(notification => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`
                  bg-white rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer overflow-hidden
                  ${notification.read ? 'opacity-75' : 'border-2 border-blue-300'}
                `}
              >
                <div className="flex items-start gap-3 p-4">
                  {/* 图标 */}
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0
                    ${notification.read 
                      ? 'bg-gray-100' 
                      : 'bg-gradient-to-br from-blue-100 to-indigo-100 ring-2 ring-blue-300'
                    }
                  `}>
                    {notification.senderAvatar === '✉️' || notification.senderAvatar === '❌' || notification.senderAvatar === '🎫'
                      ? getNotificationIcon(notification)
                      : notification.senderAvatar
                    }
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-gray-800 text-sm">{notification.title}</h3>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">
                        {formatTime(notification.timestamp)}
                      </span>
                      <button
                        onClick={(e) => handleDelete(notification.id, e)}
                        className="p-1 hover:bg-red-50 rounded-full transition-colors group"
                      >
                        <Trash2 size={14} className="text-gray-400 group-hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 状态标记 */}
                {notification.read && (
                  <div className="px-4 pb-2 flex items-center gap-1 text-xs text-gray-400">
                    <Check size={12} />
                    <span>已读</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      {notifications.length > 0 && (
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="max-w-2xl mx-auto flex gap-3">
            <button
              onClick={handleClearAll}
              className="flex-1 px-4 py-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              清空所有通知
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
