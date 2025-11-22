/**
 * 朋友圈评论通知组件
 * 类似微信朋友圈的评论通知界面
 */

import { useState, useEffect } from 'react';
import { X, ChevronLeft, MessageSquare, Reply } from 'lucide-react';
import { 
  getMomentsNotifications, 
  markAllNotificationsAsRead,
  markNotificationAsRead,
  deleteNotification,
  MomentsNotification 
} from '../utils/momentsNotificationManager';

interface MomentsNotificationsProps {
  onClose: () => void;
  onNavigateToPost: (postId: string, commentId: string) => void;
}

export default function MomentsNotifications({ onClose, onNavigateToPost }: MomentsNotificationsProps) {
  const [notifications, setNotifications] = useState<MomentsNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    const data = await getMomentsNotifications();
    setNotifications(data);
    setLoading(false);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead();
    await loadNotifications();
  };

  const handleNotificationClick = async (notification: MomentsNotification) => {
    // 标记为已读
    await markNotificationAsRead(notification.id);
    
    // 跳转到朋友圈帖子
    onNavigateToPost(notification.postId, notification.commentId);
    
    // 关闭通知面板
    onClose();
  };

  const handleDelete = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
    await loadNotifications();
  };

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
    
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
        <button onClick={onClose} className="p-2 -ml-2">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold">评论和赞</h1>
        <button
          onClick={handleMarkAllRead}
          className="text-sm text-blue-500 hover:text-blue-600"
        >
          全部已读
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-400">加载中...</div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
            <div className="text-gray-400 text-sm">暂无新通知</div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`px-4 py-3 cursor-pointer active:bg-gray-50 transition-colors ${
                  !notification.isRead ? 'bg-blue-50/50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
                    {notification.commentAuthorAvatar ? (
                      <img 
                        src={notification.commentAuthorAvatar} 
                        alt={notification.commentAuthorName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-semibold text-sm">
                        {notification.commentAuthorName.charAt(0)}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 text-sm">
                        {notification.commentAuthorName}
                      </span>
                      {notification.type === 'reply' ? (
                        <Reply className="w-3.5 h-3.5 text-gray-400" />
                      ) : (
                        <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </div>
                    
                    {notification.type === 'reply' && notification.replyToName && (
                      <div className="text-xs text-gray-500 mb-1">
                        回复了你的评论
                      </div>
                    )}
                    
                    <div className="text-sm text-gray-700 mb-2">
                      {notification.commentContent}
                    </div>
                    
                    {/* Post Preview */}
                    <div className="flex items-start gap-2 p-2 bg-gray-50 rounded text-xs text-gray-500 mb-1">
                      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{notification.postContent}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {formatTime(notification.timestamp)}
                      </span>
                      
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      )}
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDelete(notification.id, e)}
                    className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
