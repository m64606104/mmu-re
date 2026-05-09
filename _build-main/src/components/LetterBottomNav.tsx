/**
 * 慢邮件底部导航栏
 * 参考慢邮件App设计
 */

import { Mail, PenTool, User } from 'lucide-react';

interface LetterBottomNavProps {
  currentTab: 'inbox' | 'write' | 'profile';
  onTabChange: (tab: 'inbox' | 'write' | 'profile') => void;
}

export default function LetterBottomNav({ currentTab, onTabChange }: LetterBottomNavProps) {
  const tabs = [
    { id: 'inbox' as const, label: '信箱', icon: Mail },
    { id: 'write' as const, label: '写信', icon: PenTool },
    { id: 'profile' as const, label: '我的', icon: User }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom z-50">
      <div className="max-w-[393px] mx-auto flex">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex-1 flex flex-col items-center justify-center py-2 transition-colors
                ${isActive ? 'text-orange-500' : 'text-gray-500'}
              `}
            >
              <Icon 
                size={24} 
                className={isActive ? 'stroke-[2.5]' : 'stroke-2'}
              />
              <span className={`text-xs mt-1 ${isActive ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 w-16 h-1 bg-orange-500 rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
