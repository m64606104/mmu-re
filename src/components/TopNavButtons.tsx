/**
 * 顶部导航按钮组件
 * 显示在写信页顶部右侧：漂流瓶、我的收藏、成就、通知
 */

import { Waves, Star, Trophy, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getUnreadCount, initializeLetterNotificationStorage } from '../utils/letterNotificationSystem';

interface TopNavButtonsProps {
  onNavigate: (page: 'bottle-fishing' | 'favorite-replies' | 'achievements' | 'letter-notifications') => void;
}

export default function TopNavButtons({ onNavigate }: TopNavButtonsProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  // 加载未读通知数量
  useEffect(() => {
    let interval: number | null = null;
    void initializeLetterNotificationStorage().finally(() => {
      loadUnreadCount();
      interval = window.setInterval(loadUnreadCount, 10000);
    });
    return () => {
      if (interval !== null) window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUnreadCount = () => {
    try {
      setUnreadCount(getUnreadCount());
    } catch (error) {
      console.error('加载未读通知失败:', error);
    }
  };

  const buttons = [
    {
      id: 'bottle-fishing' as const,
      icon: Waves,
      label: '漂流瓶',
      color: 'text-blue-600',
      bgHover: 'hover:bg-blue-50'
    },
    {
      id: 'favorite-replies' as const,
      icon: Star,
      label: '收藏',
      color: 'text-yellow-600',
      bgHover: 'hover:bg-yellow-50'
    },
    {
      id: 'achievements' as const,
      icon: Trophy,
      label: '成就',
      color: 'text-purple-600',
      bgHover: 'hover:bg-purple-50'
    },
    {
      id: 'letter-notifications' as const,
      icon: Bell,
      label: '通知',
      color: 'text-orange-600',
      bgHover: 'hover:bg-orange-50',
      badge: unreadCount
    }
  ];

  return (
    <div className="flex items-center gap-2">
      {buttons.map((button) => {
        const Icon = button.icon;
        return (
          <button
            key={button.id}
            onClick={() => {
              onNavigate(button.id);
              // 如果是通知按钮，点击后刷新未读数
              if (button.id === 'letter-notifications') {
                setTimeout(loadUnreadCount, 500);
              }
            }}
            className={`relative p-2 rounded-full transition-all ${button.bgHover} ${button.color}`}
            title={button.label}
          >
            <Icon size={20} strokeWidth={2} />
            
            {/* 未读数量红点 */}
            {button.badge && button.badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {button.badge > 99 ? '99+' : button.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
