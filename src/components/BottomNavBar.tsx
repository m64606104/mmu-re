/**
 * 底部导航栏组件 - 悬浮胶囊设计
 * 滚动时收缩为球体，写信按钮橙色突出
 */

import { Users, Mail, PenTool, Clock, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface BottomNavBarProps {
  currentPage: 'pen-pals' | 'letterbox' | 'letter-writing' | 'unreplied' | 'recycle-bin';
  onNavigate: (page: 'pen-pals' | 'letterbox' | 'letter-writing' | 'unreplied' | 'recycle-bin') => void;
}

export default function BottomNavBar({ currentPage, onNavigate }: BottomNavBarProps) {
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);
      
      // 清除之前的timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      // 1秒后恢复展开状态
      const timeout = setTimeout(() => {
        setIsScrolling(false);
      }, 1000);
      
      setScrollTimeout(timeout);
    };

    // 监听所有可能的滚动容器
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    
    // 监听所有overflow滚动容器
    const scrollContainers = document.querySelectorAll('[class*="overflow"]');
    scrollContainers.forEach(container => {
      container.addEventListener('scroll', handleScroll, { passive: true });
    });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
      scrollContainers.forEach(container => {
        container.removeEventListener('scroll', handleScroll);
      });
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [scrollTimeout]);

  const navItems = [
    { id: 'pen-pals' as const, icon: Users, label: '笔友' },
    { id: 'letterbox' as const, icon: Mail, label: '信件' },
    { id: 'letter-writing' as const, icon: PenTool, label: '写信', isMain: true },
    { id: 'unreplied' as const, icon: Clock, label: '未回复' },
    { id: 'recycle-bin' as const, icon: Trash2, label: '回收箱' },
  ];

  return (
    <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
      isScrolling ? 'scale-75' : 'scale-100'
    }`}>
      <div className={`bg-white/90 backdrop-blur-md rounded-full shadow-2xl border border-gray-200/50 transition-all duration-300 ${
        isScrolling ? 'px-4 py-4' : 'px-4 py-2'
      }`}>
        <div className={`flex items-center gap-1 transition-all duration-300 ${
          isScrolling ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
        }`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            // 写信按钮特殊样式（橙色大圆按钮）
            if (item.isMain) {
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className="flex flex-col items-center gap-1 mx-1"
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    isActive 
                      ? 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-300' 
                      : 'bg-gradient-to-br from-orange-400 to-orange-500 shadow-md shadow-orange-200'
                  }`}>
                    <Icon size={28} className="text-white" strokeWidth={2.5} />
                  </div>
                  <span className={`text-[9px] whitespace-nowrap ${isActive ? 'text-orange-600 font-bold' : 'text-gray-600 font-medium'}`}>
                    {item.label}
                  </span>
                </button>
              );
            }
            
            // 其他按钮简洁样式
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="flex flex-col items-center gap-1 px-2 py-1 min-w-[48px]"
              >
                <Icon 
                  size={20} 
                  className={`transition-all ${isActive ? 'text-orange-600' : 'text-gray-500'}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={`text-[9px] whitespace-nowrap ${isActive ? 'text-orange-600 font-semibold' : 'text-gray-500 font-medium'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        
        {/* 收缩成球时只显示写信图标 */}
        {isScrolling && (
          <div className="flex items-center justify-center">
            <PenTool size={24} className="text-orange-600" strokeWidth={2.5} />
          </div>
        )}
      </div>
    </div>
  );
}
