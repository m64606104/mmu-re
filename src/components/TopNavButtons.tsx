/**
 * 顶部功能菜单按钮组件
 * 参考慢邮件设计，点击展开下拉菜单
 */

import { Waves, Star, Trophy, Bell, MoreVertical, Send } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface TopNavButtonsProps {
  onNavigate: (page: 'bottle-fishing' | 'favorite-replies' | 'achievements' | 'letter-notifications') => void;
  onSend?: () => void;
  canSend?: boolean;
}

export default function TopNavButtons({ onNavigate, onSend, canSend = false }: TopNavButtonsProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // 加载未读通知数量
  useEffect(() => {
    loadUnreadCount();
    
    // 每10秒刷新一次
    const interval = setInterval(loadUnreadCount, 10000);
    return () => clearInterval(interval);
  }, []);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const loadUnreadCount = () => {
    try {
      const notifications = JSON.parse(localStorage.getItem('letter_notifications') || '[]');
      const unread = notifications.filter((n: any) => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('加载未读通知失败:', error);
    }
  };

  const menuItems = [
    {
      id: 'send' as const,
      icon: Send,
      label: '寄出',
      color: 'text-orange-600',
      bgHover: 'hover:bg-orange-50',
      show: canSend && onSend,
      onClick: () => {
        onSend?.();
        setIsMenuOpen(false);
      }
    },
    {
      id: 'bottle-fishing' as const,
      icon: Waves,
      label: '漂流瓶',
      color: 'text-blue-600',
      bgHover: 'hover:bg-blue-50',
      show: true,
      onClick: () => {
        onNavigate('bottle-fishing');
        setIsMenuOpen(false);
      }
    },
    {
      id: 'favorite-replies' as const,
      icon: Star,
      label: '我的收藏',
      color: 'text-yellow-600',
      bgHover: 'hover:bg-yellow-50',
      show: true,
      onClick: () => {
        onNavigate('favorite-replies');
        setIsMenuOpen(false);
      }
    },
    {
      id: 'achievements' as const,
      icon: Trophy,
      label: '成就',
      color: 'text-purple-600',
      bgHover: 'hover:bg-purple-50',
      show: true,
      onClick: () => {
        onNavigate('achievements');
        setIsMenuOpen(false);
      }
    },
    {
      id: 'letter-notifications' as const,
      icon: Bell,
      label: '通知',
      color: 'text-orange-600',
      bgHover: 'hover:bg-orange-50',
      badge: unreadCount,
      show: true,
      onClick: () => {
        onNavigate('letter-notifications');
        setIsMenuOpen(false);
        setTimeout(loadUnreadCount, 500);
      }
    }
  ];

  return (
    <div className="relative" ref={menuRef}>
      {/* 菜单按钮 */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-all"
      >
        <MoreVertical size={24} className="text-gray-700" strokeWidth={2} />
        
        {/* 未读数量红点 */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 下拉菜单 */}
      {isMenuOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-slideDown">
          {menuItems.filter(item => item.show).map((item, index) => {
            const Icon = item.icon;
            const isFirst = index === 0;
            
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-all ${item.bgHover} ${
                  isFirst ? 'border-b-2 border-orange-200' : ''
                }`}
              >
                <div className={`relative ${item.color}`}>
                  <Icon size={20} strokeWidth={2} />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-sm font-medium ${item.color}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 下拉动画 */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
