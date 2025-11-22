/**
 * 信件功能下拉菜单
 * 4格图标收纳：漂流瓶、收藏、成就、通知
 */

import { Waves, Star, Trophy, Bell } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface LetterMenuDropdownProps {
  onNavigate: (page: 'bottle-fishing' | 'favorite-replies' | 'achievements' | 'letter-notifications') => void;
}

// 4个圆角方格图标组件
const GridIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
  >
    <rect x="4" y="4" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="2" />
    <rect x="13" y="4" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="2" />
    <rect x="4" y="13" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="2" />
    <rect x="13" y="13" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export default function LetterMenuDropdown({ onNavigate }: LetterMenuDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 加载未读通知数量
  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 10000);
    return () => clearInterval(interval);
  }, []);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

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
      id: 'bottle-fishing' as const,
      icon: Waves,
      label: '漂流瓶',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'favorite-replies' as const,
      icon: Star,
      label: '我的收藏',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      id: 'achievements' as const,
      icon: Trophy,
      label: '成就',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      id: 'letter-notifications' as const,
      icon: Bell,
      label: '通知',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      badge: unreadCount
    }
  ];

  const handleMenuClick = (id: string) => {
    onNavigate(id as any);
    setIsOpen(false);
    
    // 如果是通知，刷新未读数
    if (id === 'letter-notifications') {
      setTimeout(loadUnreadCount, 500);
    }
  };

  return (
    <div className="relative z-[100]" ref={dropdownRef}>
      {/* 4格图标按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-orange-50 rounded-full transition-colors"
      >
        <GridIcon size={22} className="text-gray-700" />
        
        {/* 未读数量红点 */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute top-12 left-0 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[200] min-w-[180px]">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                  index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className={`w-10 h-10 rounded-full ${item.bgColor} flex items-center justify-center`}>
                  <Icon size={20} className={item.color} strokeWidth={2} />
                </div>
                
                <span className="flex-1 text-left text-sm font-medium text-gray-700">
                  {item.label}
                </span>
                
                {/* 通知数量角标 */}
                {item.badge && item.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
