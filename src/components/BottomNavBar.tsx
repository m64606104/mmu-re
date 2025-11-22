/**
 * 底部导航栏组件
 * 在主页面显示，提供5个核心功能的快速入口
 */

import { Users, Mail, PenTool, Clock, Trash2 } from 'lucide-react';

interface BottomNavBarProps {
  currentPage: 'pen-pals' | 'letterbox' | 'letter-writing' | 'unreplied' | 'recycle-bin';
  onNavigate: (page: 'pen-pals' | 'letterbox' | 'letter-writing' | 'unreplied' | 'recycle-bin') => void;
}

export default function BottomNavBar({ currentPage, onNavigate }: BottomNavBarProps) {
  const navItems = [
    { id: 'pen-pals' as const, icon: Users, label: '笔友', color: 'text-blue-600' },
    { id: 'letterbox' as const, icon: Mail, label: '信件', color: 'text-purple-600' },
    { id: 'letter-writing' as const, icon: PenTool, label: '写信', color: 'text-green-600' },
    { id: 'unreplied' as const, icon: Clock, label: '未回复', color: 'text-orange-600' },
    { id: 'recycle-bin' as const, icon: Trash2, label: '回收箱', color: 'text-gray-600' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-2xl mx-auto flex justify-around items-center py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                isActive 
                  ? `${item.color} bg-gray-50` 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-xs ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
