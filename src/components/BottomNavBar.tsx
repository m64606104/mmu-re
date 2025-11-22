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

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className={`bg-white/90 backdrop-blur-md rounded-full shadow-2xl border border-gray-200/50 flex items-center overflow-hidden transition-all duration-500 ease-out ${
        isScrolling ? 'w-16 h-16 justify-center' : 'px-4 py-2'
      }`}>
        {/* 左侧按钮区域 - 滚动时从左向右消失 */}
        <div className={`flex items-center transition-all duration-500 ease-out ${
          isScrolling ? 'w-0 opacity-0 -ml-20' : 'w-auto opacity-100 gap-1'
        }`}>
          {/* 笔友 */}
          <button
            onClick={() => onNavigate('pen-pals')}
            className="flex flex-col items-center gap-1 px-2 py-1 min-w-[48px] flex-shrink-0"
          >
            <Users 
              size={20} 
              className={`transition-all ${currentPage === 'pen-pals' ? 'text-orange-600' : 'text-gray-500'}`}
              strokeWidth={currentPage === 'pen-pals' ? 2.5 : 2}
            />
            <span className={`text-[9px] whitespace-nowrap ${currentPage === 'pen-pals' ? 'text-orange-600 font-semibold' : 'text-gray-500 font-medium'}`}>
              笔友
            </span>
          </button>
          
          {/* 信件 */}
          <button
            onClick={() => onNavigate('letterbox')}
            className="flex flex-col items-center gap-1 px-2 py-1 min-w-[48px] flex-shrink-0"
          >
            <Mail 
              size={20} 
              className={`transition-all ${currentPage === 'letterbox' ? 'text-orange-600' : 'text-gray-500'}`}
              strokeWidth={currentPage === 'letterbox' ? 2.5 : 2}
            />
            <span className={`text-[9px] whitespace-nowrap ${currentPage === 'letterbox' ? 'text-orange-600 font-semibold' : 'text-gray-500 font-medium'}`}>
              信件
            </span>
          </button>
        </div>
        
        {/* 中间写信按钮 - 始终显示，滚动时变大 */}
        <button
          onClick={() => onNavigate('letter-writing')}
          className={`flex flex-col items-center gap-1 flex-shrink-0 transition-all duration-500 ${
            isScrolling ? 'mx-0' : 'mx-1'
          }`}
        >
          <div className={`rounded-full flex items-center justify-center transition-all duration-500 ${
            currentPage === 'letter-writing'
              ? 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-300' 
              : 'bg-gradient-to-br from-orange-400 to-orange-500 shadow-md shadow-orange-200'
          } ${
            isScrolling ? 'w-12 h-12' : 'w-14 h-14'
          }`}>
            <PenTool size={isScrolling ? 24 : 28} className="text-white" strokeWidth={2.5} />
          </div>
          <span className={`text-[9px] whitespace-nowrap transition-all duration-500 ${
            isScrolling ? 'opacity-0 h-0' : 'opacity-100'
          } ${currentPage === 'letter-writing' ? 'text-orange-600 font-bold' : 'text-gray-600 font-medium'}`}>
            写信
          </span>
        </button>
        
        {/* 右侧按钮区域 - 滚动时从左向右消失 */}
        <div className={`flex items-center transition-all duration-500 ease-out ${
          isScrolling ? 'w-0 opacity-0 -mr-20' : 'w-auto opacity-100 gap-1'
        }`}>
          {/* 未回复 */}
          <button
            onClick={() => onNavigate('unreplied')}
            className="flex flex-col items-center gap-1 px-2 py-1 min-w-[48px] flex-shrink-0"
          >
            <Clock 
              size={20} 
              className={`transition-all ${currentPage === 'unreplied' ? 'text-orange-600' : 'text-gray-500'}`}
              strokeWidth={currentPage === 'unreplied' ? 2.5 : 2}
            />
            <span className={`text-[9px] whitespace-nowrap ${currentPage === 'unreplied' ? 'text-orange-600 font-semibold' : 'text-gray-500 font-medium'}`}>
              未回复
            </span>
          </button>
          
          {/* 回收箱 */}
          <button
            onClick={() => onNavigate('recycle-bin')}
            className="flex flex-col items-center gap-1 px-2 py-1 min-w-[48px] flex-shrink-0"
          >
            <Trash2 
              size={20} 
              className={`transition-all ${currentPage === 'recycle-bin' ? 'text-orange-600' : 'text-gray-500'}`}
              strokeWidth={currentPage === 'recycle-bin' ? 2.5 : 2}
            />
            <span className={`text-[9px] whitespace-nowrap ${currentPage === 'recycle-bin' ? 'text-orange-600 font-semibold' : 'text-gray-500 font-medium'}`}>
              回收箱
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
