import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Settings, Calendar, Camera, Music, Book, Heart, Clock, Wifi, Battery, ChevronLeft, ChevronRight } from 'lucide-react';
import { Screen } from '../types';

interface HomeScreenProps {
  onNavigate: (screen: Screen) => void;
}

export default function HomeScreen({ onNavigate }: HomeScreenProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 定义多个页面的应用
  const pages = [
    // 第一页 - 主要应用
    [
      { id: 'social', name: '聊天', icon: MessageCircle, gradient: 'from-pink-300 to-pink-400', screen: 'social' as Screen },
      { id: 'camera', name: '相机', icon: Camera, gradient: 'from-blue-300 to-blue-400', screen: 'social' as Screen },
      { id: 'music', name: '音乐', icon: Music, gradient: 'from-purple-300 to-purple-400', screen: 'social' as Screen },
      { id: 'calendar', name: '日历', icon: Calendar, gradient: 'from-orange-300 to-orange-400', screen: 'social' as Screen },
      { id: 'book', name: '图书', icon: Book, gradient: 'from-green-300 to-green-400', screen: 'social' as Screen },
      { id: 'heart', name: '健康', icon: Heart, gradient: 'from-red-300 to-red-400', screen: 'social' as Screen },
      { id: 'clock', name: '时钟', icon: Clock, gradient: 'from-yellow-300 to-yellow-400', screen: 'social' as Screen },
      { id: 'settings', name: '设置', icon: Settings, gradient: 'from-gray-300 to-gray-400', screen: 'settings' as Screen },
    ],
    // 第二页 - 更多应用
    [
      { id: 'app1', name: '应用1', icon: MessageCircle, gradient: 'from-indigo-300 to-indigo-400', screen: 'social' as Screen },
      { id: 'app2', name: '应用2', icon: Camera, gradient: 'from-teal-300 to-teal-400', screen: 'social' as Screen },
      { id: 'app3', name: '应用3', icon: Music, gradient: 'from-cyan-300 to-cyan-400', screen: 'social' as Screen },
      { id: 'app4', name: '应用4', icon: Calendar, gradient: 'from-lime-300 to-lime-400', screen: 'social' as Screen },
    ],
  ];

  const formatDate = () => {
    const month = currentTime.getMonth() + 1;
    const day = currentTime.getDate();
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekday = weekdays[currentTime.getDay()];
    return `${month}月${day}日 ${weekday}`;
  };

  const formatTime = () => {
    const hours = currentTime.getHours().toString().padStart(2, '0');
    const minutes = currentTime.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      // 向左滑动
      if (currentPage < pages.length - 1) {
        setCurrentPage(currentPage + 1);
      }
    }

    if (touchStart - touchEnd < -75) {
      // 向右滑动
      if (currentPage > 0) {
        setCurrentPage(currentPage - 1);
      }
    }
  };

  return (
    <div className="h-full relative overflow-hidden">
      {/* 粉色系渐变壁纸 - 参考图片风格 */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-100 via-pink-50 to-blue-50">
        {/* 装饰元素 - 蝴蝶结和星星 */}
        <div className="absolute top-10 right-10 text-pink-200 opacity-40">
          <div className="text-4xl">🎀</div>
        </div>
        <div className="absolute top-20 left-10 text-blue-200 opacity-40">
          <div className="text-3xl">⭐</div>
        </div>
        <div className="absolute bottom-40 right-20 text-pink-200 opacity-40">
          <div className="text-3xl">🎀</div>
        </div>
        <div className="absolute bottom-60 left-16 text-purple-200 opacity-40">
          <div className="text-2xl">✨</div>
        </div>
        {/* 悬挂装饰 */}
        <div className="absolute top-0 left-1/4 w-px h-20 bg-pink-200 opacity-30"></div>
        <div className="absolute top-20 left-1/4 w-8 h-8 border-2 border-pink-200 rounded-full opacity-30"></div>
      </div>

      <div className="relative h-full flex flex-col">
        {/* Status bar - iOS 风格 */}
        <div className="flex justify-between items-center px-6 pt-3 text-gray-700 text-xs font-medium">
          <span className="font-semibold">{formatTime()}</span>
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5" strokeWidth={2.5} />
            <div className="flex gap-0.5">
              <div className="w-0.5 h-2.5 bg-gray-700 rounded-full"></div>
              <div className="w-0.5 h-2.5 bg-gray-700 rounded-full"></div>
              <div className="w-0.5 h-2.5 bg-gray-700 rounded-full"></div>
              <div className="w-0.5 h-2.5 bg-gray-400 rounded-full"></div>
            </div>
            <span className="text-xs">79%</span>
            <Battery className="w-5 h-3.5" strokeWidth={2.5} fill="currentColor" />
          </div>
        </div>

        {/* 大时钟 - 参考图片风格 */}
        <div className="text-center mt-8 mb-4">
          <div className="inline-block bg-white/60 backdrop-blur-md rounded-3xl px-8 py-4 shadow-lg">
            <div className="text-5xl font-light text-gray-800 tracking-tight">
              {formatTime()}
            </div>
            <div className="text-sm text-gray-600 mt-1 font-medium">
              {formatDate()}
            </div>
          </div>
        </div>

        {/* 小部件区域 - 参考图片2的粉色格子风格 */}
        <div className="px-6 mb-6">
          <div className="bg-pink-100/60 backdrop-blur-sm rounded-3xl p-4 shadow-lg border border-pink-200/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span className="text-sm text-gray-700">今日心情</span>
              </div>
              <div className="text-2xl">☀️</div>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              心情怎样呢？
            </div>
          </div>
        </div>

        {/* 可滑动的应用页面 */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-hidden px-6"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div 
            className="flex h-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${currentPage * 100}%)` }}
          >
            {pages.map((pageApps, pageIndex) => (
              <div key={pageIndex} className="min-w-full h-full">
                <div className="grid grid-cols-4 gap-6 px-2">
                  {pageApps.map(app => (
                    <button
                      key={app.id}
                      onClick={() => onNavigate(app.screen)}
                      className="flex flex-col items-center gap-2 transition-all active:scale-90"
                    >
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-lg border border-white/50`}>
                        <app.icon className="w-7 h-7 text-white" strokeWidth={2} />
                      </div>
                      <span className="text-gray-700 text-xs font-medium">
                        {app.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 页面指示器 */}
        <div className="flex justify-center gap-2 mb-6">
          {pages.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all ${
                index === currentPage 
                  ? 'w-6 bg-gray-600' 
                  : 'w-1.5 bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Dock - 毛玻璃效果 */}
        <div className="px-6 pb-6">
          <div className="bg-white/40 backdrop-blur-xl rounded-3xl p-3 shadow-xl border border-white/50">
            <div className="flex justify-around items-center">
              <button 
                onClick={() => onNavigate('social')}
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-300 to-pink-400 shadow-lg flex items-center justify-center active:scale-90 transition-transform"
              >
                <MessageCircle className="w-6 h-6 text-white" strokeWidth={2} />
              </button>
              <button className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-300 to-blue-400 shadow-lg flex items-center justify-center active:scale-90 transition-transform">
                <Camera className="w-6 h-6 text-white" strokeWidth={2} />
              </button>
              <button 
                onClick={() => onNavigate('settings')}
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-300 to-gray-400 shadow-lg flex items-center justify-center active:scale-90 transition-transform"
              >
                <Settings className="w-6 h-6 text-white" strokeWidth={2} />
              </button>
              <button className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-300 to-purple-400 shadow-lg flex items-center justify-center active:scale-90 transition-transform">
                <Calendar className="w-6 h-6 text-white" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
