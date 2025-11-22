/**
 * 顶部导航栏组件
 * 右侧快捷入口：漂流瓶、收藏、成就、通知
 */

import { Waves, Star, Trophy, Bell } from 'lucide-react';

interface TopNavBarProps {
  onNavigate: (page: string) => void;
  notificationCount?: number; // 未读通知数量
  title?: string; // 当前页面标题
  showBackButton?: boolean; // 是否显示返回按钮
  onBack?: () => void;
}

export default function TopNavBar({ 
  onNavigate, 
  notificationCount = 0, 
  title = '墨默鱼慢信',
  showBackButton = false,
  onBack
}: TopNavBarProps) {
  const quickActions = [
    {
      id: 'bottle-fishing',
      icon: Waves,
      label: '漂流瓶',
      color: 'text-blue-600'
    },
    {
      id: 'favorites',
      icon: Star,
      label: '收藏',
      color: 'text-yellow-600'
    },
    {
      id: 'achievements',
      icon: Trophy,
      label: '成就',
      color: 'text-purple-600'
    },
    {
      id: 'letter-notifications',
      icon: Bell,
      label: '通知',
      color: 'text-orange-600',
      badge: notificationCount
    }
  ];

  return (
    <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 safe-area-top z-50">
      <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
        {/* 左侧：返回按钮或标题 */}
        <div className="flex items-center gap-3">
          {showBackButton && onBack ? (
            <button
              onClick={onBack}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : null}
          <h1 className="text-lg font-bold text-gray-800">{title}</h1>
        </div>

        {/* 右侧：快捷操作 */}
        <div className="flex items-center gap-1">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => onNavigate(action.id)}
                className={`relative p-2 hover:bg-gray-100 rounded-full transition-colors ${action.color}`}
                title={action.label}
              >
                <Icon size={20} strokeWidth={2} />
                {/* 通知角标 */}
                {action.badge && action.badge > 0 && (
                  <div className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 font-bold text-[10px]">
                    {action.badge > 99 ? '99+' : action.badge}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
