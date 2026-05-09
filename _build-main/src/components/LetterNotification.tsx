/**
 * 信件通知组件
 * 监听回信事件并显示通知
 */

import React, { useState, useEffect } from 'react';
import { Mail, X } from 'lucide-react';

interface LetterReplyEvent extends CustomEvent {
  detail: {
    letterId: string;
    receiverName: string;
  };
}

const LetterNotification: React.FC = () => {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    receiverName: string;
    timestamp: number;
  }>>([]);

  useEffect(() => {
    const handleLetterReply = (event: Event) => {
      const replyEvent = event as LetterReplyEvent;
      const { letterId, receiverName } = replyEvent.detail;

      // 添加新通知
      const newNotification = {
        id: letterId,
        receiverName,
        timestamp: Date.now()
      };

      setNotifications(prev => [...prev, newNotification]);

      // 3秒后自动移除
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== letterId));
      }, 5000);
    };

    window.addEventListener('letter-reply', handleLetterReply);

    return () => {
      window.removeEventListener('letter-reply', handleLetterReply);
    };
  }, []);

  const handleClose = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-3">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="bg-white rounded-xl shadow-2xl border-2 border-blue-400 p-4 min-w-[320px] max-w-[400px] animate-slide-in-right"
        >
          <div className="flex items-start gap-3">
            {/* 图标 */}
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center animate-bounce-slow">
              <Mail size={24} className="text-white" />
            </div>

            {/* 内容 */}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-800 mb-1">
                📬 收到新回信
              </h4>
              <p className="text-sm text-gray-600">
                {notification.receiverName} 回信了
              </p>
              <p className="text-xs text-blue-600 mt-2 font-medium">
                点击信箱查看 →
              </p>
            </div>

            {/* 关闭按钮 */}
            <button
              onClick={() => handleClose(notification.id)}
              className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={18} className="text-gray-400" />
            </button>
          </div>

          {/* 进度条 */}
          <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 animate-progress-bar" />
          </div>
        </div>
      ))}

      {/* CSS动画 */}
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        @keyframes progress-bar {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        .animate-progress-bar {
          animation: progress-bar 5s linear forwards;
        }
      `}</style>
    </div>
  );
};

export default LetterNotification;
