import React, { ReactNode, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import { Screen } from '../types';

interface SwipeableContainerProps {
  currentScreen: Screen;
  children: ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onBack: () => void;
  isTransitioning: boolean;
  transitionDirection: 'left' | 'right';
}

const SwipeableContainer: React.FC<SwipeableContainerProps> = ({
  currentScreen,
  children,
  onSwipeLeft,
  onSwipeRight,
  onBack,
  isTransitioning,
  transitionDirection,
}) => {
  // 添加全局样式
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .slide-out-left {
        animation: slideOutLeft 0.3s forwards;
      }
      .slide-out-right {
        animation: slideOutRight 0.3s forwards;
      }
      @keyframes slideOutLeft {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(-100%); opacity: 0.5; }
      }
      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0.5; }
      }
    `;
    
    const head = document.head || document.getElementsByTagName('head')[0];
    head.appendChild(style);
    
    return () => {
      head.removeChild(style);
    };
  }, []);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: onSwipeLeft,
    onSwipedRight: onSwipeRight,
    trackMouse: true,
    preventScrollOnSwipe: true,
    trackTouch: true,
  });

  const containerClasses = [
    'h-screen',
    'w-full',
    'bg-gray-100',
    'flex',
    'flex-col',
    'relative',
    'overflow-hidden',
    isTransitioning ? (transitionDirection === 'left' ? 'slide-out-left' : 'slide-out-right') : ''
  ].join(' ');

  return (
    <div className={containerClasses} {...swipeHandlers}>
      {/* 返回按钮 - 用于PC端，左上角 */}
      {currentScreen !== 'home' && (
        <button
          onClick={onBack}
          className="absolute top-2 left-2 z-50 w-8 h-8 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
          title="返回主屏幕"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      
      {/* 页面内容 */}
      <div className="w-full h-full">
        {children}
      </div>
    </div>
  );
};

export default SwipeableContainer;
