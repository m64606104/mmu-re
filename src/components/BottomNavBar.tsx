/**
 * 底部导航栏组件
 * 5个主要入口：笔友、信件列表、写信、未回复、回收箱
 */

import { Users, Mail, PenTool, Clock, Trash2 } from 'lucide-react';

interface BottomNavBarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  unreadCount?: number; // 未读信件数量
}

export default function BottomNavBar({ currentPage, onNavigate, unreadCount = 0 }: BottomNavBarProps) {
  const navItems = [
    {
      id: 'penpals',
      icon: Users,
      label: '笔友',
      isCenter: false
    },
    {
      id: 'letterbox',
      icon: Mail,
      label: '信件',
      isCenter: false,
      badge: unreadCount
    },
    {
      id: 'letter-write',
      icon: PenTool,
      label: '写信',
      isCenter: true // 中间大按钮
    },
    {
      id: 'unreplied-letters',
      icon: Clock,
      label: '未回复',
      isCenter: false
    },
    {
      id: 'recycle-bin',
      icon: Trash2,
      label: '回收箱',
      isCenter: false
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-50">
      <div className="flex items-end justify-around px-4 py-2 max-w-2xl mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          if (item.isCenter) {
            // 中间大按钮
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`relative flex flex-col items-center justify-center -mt-6 ${
                  isActive ? 'text-white' : 'text-white'
                }`}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
                  isActive 
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 scale-110' 
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:scale-105'
                }`}>
                  <Icon size={24} strokeWidth={2.5} />
                </div>
                <span className={`text-xs mt-1 font-medium ${
                  isActive ? 'text-orange-600' : 'text-gray-600'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          }

          // 普通按钮
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative flex flex-col items-center justify-center py-2 px-3 transition-colors ${
                isActive ? 'text-orange-600' : 'text-gray-600 hover:text-orange-500'
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-xs mt-1 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
              {/* 未读角标 */}
              {item.badge && item.badge > 0 && (
                <div className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold">
                  {item.badge > 99 ? '99+' : item.badge}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
