import { useEffect } from 'react';
import { Send } from 'lucide-react';
import { getBubbleColorTheme } from '../utils/bubbleColors';

interface EasyChatSplashProps {
  onFinish: () => void;
  userBubbleColor?: string;
}

export function EasyChatSplash({ onFinish, userBubbleColor }: EasyChatSplashProps) {
  const theme = getBubbleColorTheme(userBubbleColor);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 1800);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`w-full h-full ${theme.bgClass} flex flex-col items-center justify-center relative overflow-hidden`}>
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-32 right-16 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/3 right-20 w-24 h-24 bg-white/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Logo动画 */}
      <div className="relative z-10 animate-in zoom-in duration-700">
        <div className="relative">
          {/* 主Logo */}
          <div className="w-28 h-28 bg-white/95 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-2xl">
            <Send className={`w-14 h-14 ${theme.textClass === 'text-white' ? 'text-gray-700' : theme.textClass}`} strokeWidth={2.5} style={{ color: theme.preview.includes('gradient') ? '#4b5563' : theme.preview }} />
          </div>
          
          {/* 光圈效果1 */}
          <div className="absolute inset-0 bg-white/30 rounded-3xl animate-ping" style={{ animationDuration: '2s' }} />
          
          {/* 光圈效果2 */}
          <div className="absolute inset-0 bg-white/20 rounded-3xl animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
        </div>
      </div>

      {/* 应用名称 */}
      <h1 className="relative z-10 mt-10 text-5xl text-white tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300" style={{ fontWeight: 600 }}>
        Easy Chat
      </h1>
      
      {/* 副标题 */}
      <p className="relative z-10 mt-4 text-lg text-white/90 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
        连接你的世界
      </p>
    </div>
  );
}