import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Settings, Music, Phone, Heart, Bell, Play, Pause, SkipBack, SkipForward, MapPin, Sun, Palette, Upload, BookOpen, Mail, X, Users } from 'lucide-react';
import { Screen, ThemeSettings } from '../types';

interface HomeScreenProps {
  onNavigate: (screen: Screen) => void;
  theme?: ThemeSettings;
}

interface MusicTrack {
  title: string;
  artist: string;
  cover: string;
  audio: string;
}

interface CountdownEvent {
  date: string;
  name: string;
}

export default function HomeScreen({ onNavigate, theme }: HomeScreenProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPlaying, setIsPlaying] = useState(false);
  const [landscapeImage, setLandscapeImage] = useState<string>('');
  // const [showSettingsModal, setShowSettingsModal] = useState(false); // 保留供将来使用
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [showCountdownModal, setShowCountdownModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{type: 'app' | 'quick' | 'dock', index: number} | null>(null);
  const [showQuickSelector, setShowQuickSelector] = useState(false);
  const [showCountdownEditor, setShowCountdownEditor] = useState(false);
  const [showMusicUploader, setShowMusicUploader] = useState(false);
  const [tempCountdownDate, setTempCountdownDate] = useState('');
  const [tempCountdownName, setTempCountdownName] = useState('');
  
  // 历史记录用于undo
  const [layoutHistory, setLayoutHistory] = useState<{
    appLayout: string[];
    quickLayout: string[];
    dockLayout: string[];
  }[]>([]);
  
  // 应用布局状态
  const [appLayout, setAppLayout] = useState<string[]>(() => {
    const saved = localStorage.getItem('appLayout');
    return saved ? JSON.parse(saved) : ['settings', 'social', 'theme', 'relationships', 'music', 'phone', 'bell', 'mail'];
  });
  const [quickLayout, setQuickLayout] = useState<string[]>(() => {
    const saved = localStorage.getItem('quickLayout');
    return saved ? JSON.parse(saved) : ['announcement', 'social', 'heart', 'settings'];
  });
  const [dockLayout, setDockLayout] = useState<string[]>(() => {
    const saved = localStorage.getItem('dockLayout');
    return saved ? JSON.parse(saved) : ['phone', 'social', 'music', 'settings'];
  });
  const [currentTrack, setCurrentTrack] = useState<MusicTrack>(() => {
    const saved = localStorage.getItem('currentTrack');
    return saved ? JSON.parse(saved) : {
      title: 'Moonlight S...',
      artist: 'Beethoven',
      cover: '',
      audio: ''
    };
  });
  const [countdownEvent, setCountdownEvent] = useState<CountdownEvent>(() => {
    const saved = localStorage.getItem('countdownEvent');
    return saved ? JSON.parse(saved) : {
      date: '2024-12-25',
      name: '我的生日'
    };
  });

  const audioRef = useRef<HTMLAudioElement>(null);
  const landscapeInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  
  const [bannerImage, setBannerImage] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('landscapeImage');
    if (saved) setLandscapeImage(saved);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('bannerImage');
    if (saved) setBannerImage(saved);
  }, []);

  const formatTime = () => {
    const hours = currentTime.getHours().toString().padStart(2, '0');
    const minutes = currentTime.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDate = () => {
    const month = currentTime.getMonth() + 1;
    const day = currentTime.getDate();
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekday = weekdays[currentTime.getDay()];
    return `${month}月${day}日 ${weekday}`;
  };

  const calculateDaysInfo = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(countdownEvent.date);
    targetDate.setHours(0, 0, 0, 0);
    const diff = targetDate.getTime() - today.getTime();
    const days = Math.abs(Math.ceil(diff / (1000 * 60 * 60 * 24)));
    const isPast = diff < 0;
    return { days, isPast };
  };

  const handleLandscapeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setLandscapeImage(result);
        localStorage.setItem('landscapeImage', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const togglePlay = () => {
    if (currentTrack.audio) {
      setIsPlaying(!isPlaying);
    } else {
      alert('请先上传音乐文件');
    }
  };
  
  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setBannerImage(result);
        localStorage.setItem('bannerImage', result);
      };
      reader.readAsDataURL(file);
    }
  };

  // 长按进入编辑模式
  const handleLongPressStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (isEditMode) return;
    e.preventDefault();
    
    const timer = setTimeout(() => {
      setIsEditMode(true);
    }, 500); // 500ms长按触发
    
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // 退出编辑模式
  const handleExitEditMode = () => {
    setIsEditMode(false);
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDeleteConfirm(null);
  };

  // 保存历史状态
  const saveHistory = () => {
    setLayoutHistory(prev => [...prev, {
      appLayout: [...appLayout],
      quickLayout: [...quickLayout],
      dockLayout: [...dockLayout]
    }].slice(-10)); // 最多保存10步
  };

  // 撤回
  const handleUndo = () => {
    if (layoutHistory.length === 0) return;
    
    const lastState = layoutHistory[layoutHistory.length - 1];
    setAppLayout(lastState.appLayout);
    setQuickLayout(lastState.quickLayout);
    setDockLayout(lastState.dockLayout);
    
    localStorage.setItem('appLayout', JSON.stringify(lastState.appLayout));
    localStorage.setItem('quickLayout', JSON.stringify(lastState.quickLayout));
    localStorage.setItem('dockLayout', JSON.stringify(lastState.dockLayout));
    
    setLayoutHistory(prev => prev.slice(0, -1));
  };

  // 拖拽处理 - 第二页应用
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isEditMode) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    if (!isEditMode || draggedIndex === null) return;
    e.preventDefault();
    
    saveHistory();
    
    const newLayout = [...appLayout];
    const draggedItem = newLayout[draggedIndex];
    newLayout.splice(draggedIndex, 1);
    newLayout.splice(targetIndex, 0, draggedItem);
    
    setAppLayout(newLayout);
    localStorage.setItem('appLayout', JSON.stringify(newLayout));
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // 显示删除确认
  const showDeleteConfirm = (type: 'app' | 'quick' | 'dock', index: number) => {
    setDeleteConfirm({ type, index });
  };

  // 确认删除
  const confirmDelete = () => {
    if (!deleteConfirm) return;
    
    saveHistory();
    
    const { type, index } = deleteConfirm;
    
    if (type === 'app') {
      const newLayout = appLayout.filter((_, i) => i !== index);
      setAppLayout(newLayout);
      localStorage.setItem('appLayout', JSON.stringify(newLayout));
    } else if (type === 'quick') {
      const newLayout = quickLayout.filter((_, i) => i !== index);
      setQuickLayout(newLayout);
      localStorage.setItem('quickLayout', JSON.stringify(newLayout));
    } else if (type === 'dock') {
      const newLayout = dockLayout.filter((_, i) => i !== index);
      setDockLayout(newLayout);
      localStorage.setItem('dockLayout', JSON.stringify(newLayout));
    }
    
    setDeleteConfirm(null);
  };

  // 取消删除
  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  // 添加快捷应用
  const addQuickApp = (appId: string) => {
    if (quickLayout.includes(appId)) {
      alert('该应用已存在');
      return;
    }
    if (quickLayout.length >= 4) {
      alert('快捷应用最多4个');
      return;
    }
    
    saveHistory();
    
    const newLayout = [...quickLayout, appId];
    setQuickLayout(newLayout);
    localStorage.setItem('quickLayout', JSON.stringify(newLayout));
    setShowQuickSelector(false);
  };

  // 触摸滑动处理
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    setTouchCurrentX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchCurrentX === null) {
      setTouchStartX(null);
      setTouchCurrentX(null);
      return;
    }

    const swipeDistance = touchCurrentX - touchStartX;
    
    // 左滑到第二页
    if (swipeDistance < -100 && currentPage === 0) {
      setCurrentPage(1);
    }
    // 右滑回第一页
    else if (swipeDistance > 100 && currentPage === 1) {
      setCurrentPage(0);
    }

    setTouchStartX(null);
    setTouchCurrentX(null);
  };

  // PC端鼠标拖拽支持
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setTouchStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTouchCurrentX(e.clientX);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (touchStartX === null || touchCurrentX === null) {
      setTouchStartX(null);
      setTouchCurrentX(null);
      return;
    }

    const swipeDistance = touchCurrentX - touchStartX;
    
    // 左滑到第二页
    if (swipeDistance < -100 && currentPage === 0) {
      setCurrentPage(1);
    }
    // 右滑回第一页
    else if (swipeDistance > 100 && currentPage === 1) {
      setCurrentPage(0);
    }

    setTouchStartX(null);
    setTouchCurrentX(null);
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleMouseUp();
    }
  };

  const getPageTransform = () => {
    if (touchStartX === null || touchCurrentX === null) {
      return `translateX(-${currentPage * 100}%)`;
    }
    const distance = touchCurrentX - touchStartX;
    const baseOffset = -currentPage * 100;
    const swipeOffset = (distance / window.innerWidth) * 100;
    return `translateX(${baseOffset + swipeOffset}%)`;
  };

  // 壁纸样式映射
  const wallpapers = {
    'gradient-1': 'bg-gradient-to-br from-rose-300 via-purple-300 to-indigo-400',
    'gradient-2': 'bg-gradient-to-br from-cyan-300 via-blue-300 to-indigo-400',
    'gradient-3': 'bg-gradient-to-br from-amber-300 via-orange-300 to-rose-400',
    'gradient-4': 'bg-gradient-to-br from-emerald-300 via-teal-300 to-cyan-400',
    'gradient-5': 'bg-gradient-to-br from-pink-300 via-purple-300 to-blue-300',
    'dark': 'bg-gradient-to-br from-slate-800 via-slate-900 to-black',
  };

  // 玻璃球装饰的位置和颜色配置
  const glassBalls = [
    { size: 320, top: -100, left: -80, color: 'from-pink-400/40 to-purple-500/40', blur: 'blur-3xl' },
    { size: 280, top: 100, right: -60, color: 'from-blue-400/40 to-cyan-500/40', blur: 'blur-3xl' },
    { size: 240, bottom: 150, left: -40, color: 'from-yellow-400/30 to-orange-500/30', blur: 'blur-3xl' },
    { size: 200, bottom: -50, right: 20, color: 'from-green-400/30 to-emerald-500/30', blur: 'blur-2xl' },
    { size: 180, top: 300, left: 100, color: 'from-indigo-400/20 to-purple-500/20', blur: 'blur-2xl' },
  ];

  // 图标配置映射
  const iconConfig: Record<string, { icon: any; name: string; onClick?: () => void }> = {
    settings: { icon: Settings, name: '设置', onClick: () => onNavigate('settings') },
    social: { icon: MessageCircle, name: '聊天', onClick: () => onNavigate('social') },
    theme: { icon: Palette, name: '主题', onClick: () => onNavigate('theme') },
    relationships: { icon: Users, name: '关系', onClick: () => onNavigate('relationships') },
    music: { icon: Music, name: '音乐' },
    phone: { icon: Phone, name: '电话' },
    bell: { icon: BookOpen, name: '使用说明', onClick: () => onNavigate('guide') },
    mail: { icon: Mail, name: '邮件' },
    announcement: { icon: Bell, name: '公告', onClick: () => onNavigate('announcement') },
    heart: { icon: Heart, name: '收藏' },
  };

  // 获取当前壁纸样式
  const currentWallpaper = theme?.wallpaper || 'gradient-5';
  const wallpaperClass = currentWallpaper === 'custom' ? '' : (wallpapers[currentWallpaper as keyof typeof wallpapers] || wallpapers['gradient-5']);
  
  // 获取壁纸style（用于自定义壁纸）
  const getWallpaperStyle = () => {
    if (currentWallpaper === 'custom' && theme?.customWallpaper) {
      return {
        backgroundImage: `url(${theme.customWallpaper})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    }
    return {};
  };

  return (
    <div className={`h-full relative overflow-hidden ${wallpaperClass}`} style={getWallpaperStyle()}>
      {/* 玻璃球装饰层 */}
      {currentWallpaper !== 'custom' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {glassBalls.map((ball, index) => (
            <div
              key={index}
              className={`absolute rounded-full bg-gradient-to-br ${ball.color} ${ball.blur} animate-pulse`}
              style={{
                width: `${ball.size}px`,
                height: `${ball.size}px`,
                top: ball.top !== undefined ? `${ball.top}px` : undefined,
                bottom: ball.bottom !== undefined ? `${ball.bottom}px` : undefined,
                left: ball.left !== undefined ? `${ball.left}px` : undefined,
                right: ball.right !== undefined ? `${ball.right}px` : undefined,
                animationDuration: `${3 + index}s`,
                animationDelay: `${index * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* 隐藏的音频元素 */}
      <audio ref={audioRef} />

      {/* 编辑模式按钮组 */}
      {isEditMode && (
        <div className="absolute top-4 right-4 z-50 flex gap-2">
          {/* 撤回按钮 */}
          {layoutHistory.length > 0 && (
            <button 
              onClick={handleUndo}
              className="px-4 py-2 bg-white/20 backdrop-blur-xl rounded-full font-medium text-sm shadow-lg hover:bg-white/30 transition active:scale-95 text-white border border-white/30"
            >
              撤回
            </button>
          )}
          {/* 完成按钮 */}
          <button 
            onClick={handleExitEditMode}
            className="px-4 py-2 bg-white/20 backdrop-blur-xl rounded-full font-medium text-sm shadow-lg hover:bg-white/30 transition active:scale-95 text-white border border-white/30"
          >
            完成
          </button>
        </div>
      )}

      {/* 编辑模式调试指示器 */}
      {isEditMode && (
        <div className="absolute top-20 left-4 z-50 px-3 py-1 bg-red-500 rounded-full text-white text-xs font-bold">
          编辑模式已激活 ✓
        </div>
      )}

      {/* 删除确认对话框 */}
      {deleteConfirm && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl mx-6 max-w-sm border border-white/50">
            <h3 className="text-lg font-bold text-slate-800 mb-2">确认删除？</h3>
            <p className="text-slate-600 mb-6">这个操作可以通过撤回恢复</p>
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-slate-700 transition active:scale-95"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-medium text-white transition active:scale-95"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 快捷应用选择器 */}
      {showQuickSelector && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl mx-6 max-w-md border border-white/50">
            <h3 className="text-lg font-bold text-slate-800 mb-4">选择快捷应用</h3>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {Object.entries(iconConfig).map(([appId, config]) => {
                const Icon = config.icon;
                const isAdded = quickLayout.includes(appId);
                
                return (
                  <button
                    key={appId}
                    onClick={() => !isAdded && addQuickApp(appId)}
                    disabled={isAdded}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl transition active:scale-95 ${
                      isAdded 
                        ? 'bg-slate-200 opacity-50 cursor-not-allowed' 
                        : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-white" strokeWidth={2} />
                    </div>
                    <span className="text-xs text-slate-700 text-center">{config.name}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowQuickSelector(false)}
              className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-800 rounded-xl font-medium text-white transition active:scale-95"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 分页容器 */}
      <div 
        className="h-full flex transition-transform duration-300 ease-out cursor-grab active:cursor-grabbing select-none"
        style={{ transform: getPageTransform() }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* 第一页 */}
        <div className="w-full flex-shrink-0 px-6 pt-8 pb-4 space-y-4">
          {/* 超大时钟 */}
          <div className="text-center">
            <div className="text-8xl font-extralight text-white tracking-tighter" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
              {formatTime()}
            </div>
            <div className="text-white/90 text-sm mt-1 font-light">
              {formatDate()}
            </div>
          </div>

          {/* 卡片区域 */}
          <div className="grid grid-cols-2 gap-3">
            {/* 倒计时卡片 */}
            <button
              onClick={() => setShowCountdownModal(true)}
              className="bg-white/20 backdrop-blur-xl rounded-3xl p-5 shadow-lg border border-white/30 relative overflow-hidden text-left hover:bg-white/25 transition-colors"
            >
              <div className="absolute -right-4 -top-4 text-6xl opacity-20">🌸</div>
              <div className="absolute -left-2 -bottom-2 text-4xl opacity-20">🌺</div>
              
              <div className="relative flex flex-col justify-between h-full">
                {/* 顶部：状态文字 */}
                <div className="text-xs text-white/70 font-medium">
                  {calculateDaysInfo().isPast ? '已经过去' : '距离还有'}
                </div>
                
                {/* 中间：主要数字 */}
                <div className="flex items-end gap-2 my-2">
                  <span className="text-5xl font-bold text-white leading-none">
                    {calculateDaysInfo().days}
                  </span>
                  <span className="text-xl text-white/90 font-light pb-1">天</span>
                </div>
                
                {/* 底部：事件名称 */}
                <div className="text-white text-sm font-medium">{countdownEvent.name}</div>
              </div>
            </button>

            {/* 天气卡片 */}
            <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-5 shadow-lg border border-white/30">
              <div className="flex items-start gap-1 mb-2">
                <MapPin className="w-3 h-3 text-white/80 mt-0.5" />
                <span className="text-white/80 text-xs">蕃禺区</span>
              </div>
              <div className="flex items-center justify-between">
                <Sun className="w-12 h-12 text-yellow-200" strokeWidth={1.5} />
                <div className="text-right">
                  <div className="text-4xl font-light text-white">23°</div>
                  <div className="text-white/70 text-xs mt-1">晴朗</div>
                </div>
              </div>
            </div>
          </div>

          {/* 音乐播放器 */}
          <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-4 shadow-lg border border-white/30">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg">
                {currentTrack.cover ? (
                  <img src={currentTrack.cover} alt="封面" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                    <Music className="w-8 h-8 text-white/50" />
                  </div>
                )}
              </div>
              
              <button
                onClick={() => setShowMusicModal(true)}
                className="flex-1 text-left hover:opacity-80 transition-opacity"
              >
                <div className="text-white font-medium text-sm truncate">{currentTrack.title}</div>
                <div className="text-white/70 text-xs truncate">{currentTrack.artist}</div>
              </button>

              <div className="flex items-center gap-2">
                <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                  <SkipBack className="w-4 h-4 text-white" strokeWidth={2} />
                </button>
                <button 
                  onClick={togglePlay}
                  className="p-2 bg-white/30 hover:bg-white/40 rounded-full transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-white" strokeWidth={2} fill="currentColor" />
                  ) : (
                    <Play className="w-5 h-5 text-white" strokeWidth={2} fill="currentColor" />
                  )}
                </button>
                <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                  <SkipForward className="w-4 h-4 text-white" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>

          {/* 圆形风景图片 */}
          <div className="flex justify-center">
            <label className="relative cursor-pointer group">
              <div className="w-32 h-32 rounded-full overflow-hidden shadow-2xl border-4 border-white/30 relative">
                {landscapeImage ? (
                  <img src={landscapeImage} alt="风景" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-200 to-purple-200 flex items-center justify-center">
                    <Upload className="w-12 h-12 text-white/50" />
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <div className="absolute inset-0 rounded-full bg-white/10 blur-xl -z-10 scale-110"></div>
              <input
                ref={landscapeInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLandscapeUpload}
              />
            </label>
          </div>

          {/* 快捷图标 - 动态渲染 */}
          <div className="flex justify-center gap-6 px-4">
            {quickLayout.map((appId, index) => {
              const config = iconConfig[appId];
              if (!config) return null;
              const Icon = config.icon;
              
              return (
                <div key={appId} className="text-center relative">
                  <button 
                    onClick={isEditMode ? undefined : config.onClick}
                    onTouchStart={handleLongPressStart}
                    onTouchEnd={handleLongPressEnd}
                    onMouseDown={handleLongPressStart}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    className={`w-16 h-16 rounded-2xl bg-white/25 backdrop-blur-md border border-white/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-lg mb-1 ${isEditMode ? 'animate-wiggle' : ''}`}
                  >
                    <Icon className="w-7 h-7 text-white" strokeWidth={2} />
                  </button>
                  {isEditMode && (
                    <button
                      onClick={() => showDeleteConfirm('quick', index)}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition z-10"
                    >
                      <X className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </button>
                  )}
                  <span className="text-white text-xs font-medium">{config.name}</span>
                </div>
              );
            })}
            
            {/* 添加快捷应用按钮 */}
            {isEditMode && quickLayout.length < 4 && (
              <div className="text-center">
                <button 
                  onClick={() => setShowQuickSelector(true)}
                  className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border-2 border-dashed border-white/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-lg mb-1"
                >
                  <span className="text-white text-3xl font-light">+</span>
                </button>
                <span className="text-white text-xs font-medium">添加</span>
              </div>
            )}
          </div>
        </div>

        {/* 第二页 - 应用页面 */}
        <div className="w-full flex-shrink-0 px-6 pt-8 pb-4 space-y-4">
          {/* 占位空间，整体上移一个横幅图片的高度 */}
          <div className="h-[55px]"></div>
          
          {/* 横幅图片组件 - 与音乐播放器同宽，与天气卡片同高 */}
          <label className="block cursor-pointer group -mt-8">
            <div className="bg-white/20 backdrop-blur-xl rounded-3xl shadow-lg border border-white/30 overflow-hidden h-[110px] relative group-hover:bg-white/25 transition-colors">
              {bannerImage ? (
                <img src={bannerImage} alt="横幅" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <Upload className="w-8 h-8 text-white/60" />
                  <span className="text-white/70 text-sm">点击上传横幅图片</span>
                </div>
              )}
            </div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              onChange={handleBannerUpload}
              className="hidden"
            />
          </label>
          
          {/* 应用网格 - 动态渲染，支持拖拽排序 */}
          <div className="grid grid-cols-4 gap-6 px-4 mt-20">
            {appLayout.map((appId, index) => {
              const config = iconConfig[appId];
              if (!config) return null;
              const Icon = config.icon;
              const isDragOver = dragOverIndex === index && isEditMode;
              
              return (
                <div 
                  key={appId}
                  className={`text-center relative ${isDragOver ? 'scale-110' : ''} transition-transform`}
                  draggable={isEditMode}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <button 
                    onClick={isEditMode ? undefined : config.onClick}
                    onTouchStart={handleLongPressStart}
                    onTouchEnd={handleLongPressEnd}
                    onMouseDown={handleLongPressStart}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    className={`w-16 h-16 rounded-2xl bg-white/25 backdrop-blur-md border border-white/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-lg mb-1 ${isEditMode ? 'animate-wiggle cursor-move' : ''}`}
                  >
                    <Icon className="w-7 h-7 text-white" strokeWidth={2} />
                  </button>
                  {isEditMode && (
                    <button
                      onClick={() => showDeleteConfirm('app', index)}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition z-10"
                    >
                      <X className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </button>
                  )}
                  <span className="text-white text-xs font-medium">{config.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dock - 固定在底部 */}
      <div className="absolute bottom-6 left-0 right-0 px-6 z-40">
        <div className="bg-white/20 backdrop-blur-xl rounded-[28px] p-3 shadow-2xl border border-white/30">
          <div className="flex justify-around items-center gap-2">
            {dockLayout.map((appId, index) => {
              const config = iconConfig[appId];
              if (!config) return null;
              const Icon = config.icon;
              
              return (
                <div key={appId} className="relative">
                  <button 
                    onClick={isEditMode ? undefined : config.onClick}
                    onTouchStart={handleLongPressStart}
                    onTouchEnd={handleLongPressEnd}
                    onMouseDown={handleLongPressStart}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    className={`w-14 h-14 rounded-[18px] bg-white/30 backdrop-blur-md flex items-center justify-center hover:scale-110 active:scale-95 transition-transform ${isEditMode ? 'animate-wiggle' : ''}`}
                  >
                    <Icon className="w-6 h-6 text-white" strokeWidth={2} />
                  </button>
                  {isEditMode && (
                    <button
                      onClick={() => showDeleteConfirm('dock', index)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition z-10"
                    >
                      <X className="w-3 h-3 text-white" strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 页面指示器 */}
        <div className="flex justify-center gap-2 mt-3">
          <div className={`h-1 rounded-full transition-all duration-300 ${currentPage === 0 ? 'w-8 bg-white' : 'w-1 bg-white/40'}`}></div>
          <div className={`h-1 rounded-full transition-all duration-300 ${currentPage === 1 ? 'w-8 bg-white' : 'w-1 bg-white/40'}`}></div>
        </div>
      </div>

      {/* 音乐播放器模态框 */}
      {showMusicModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-white/40">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800">音乐播放器</h3>
              <button
                onClick={() => setShowMusicModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                {currentTrack.cover ? (
                  <img src={currentTrack.cover} alt="专辑封面" className="w-full h-full object-cover" />
                ) : (
                  <Music className="w-24 h-24 text-white/80" />
                )}
              </div>
              
              <div className="text-center">
                <h4 className="font-bold text-slate-800 text-lg mb-1">{currentTrack.title}</h4>
                <p className="text-slate-500">{currentTrack.artist}</p>
              </div>
              
              <div className="flex items-center justify-center gap-4 py-4">
                <button className="p-3 hover:bg-slate-100 rounded-full transition-colors">
                  <span className="text-2xl">⏮️</span>
                </button>
                <button
                  onClick={togglePlay}
                  className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full transition-colors shadow-lg"
                >
                  <span className="text-3xl">{isPlaying ? '⏸️' : '▶️'}</span>
                </button>
                <button className="p-3 hover:bg-slate-100 rounded-full transition-colors">
                  <span className="text-2xl">⏭️</span>
                </button>
              </div>
              
              <button
                onClick={() => {
                  setShowMusicModal(false);
                  setShowMusicUploader(true);
                }}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-medium transition-colors"
              >
                上传音乐
              </button>
              
              <p className="text-sm text-slate-500 text-center">
                点击上传本地音乐文件
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 音乐上传器 */}
      {showMusicUploader && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-white/40">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800">上传音乐</h3>
              <button
                onClick={() => setShowMusicUploader(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="text-6xl mb-4">🎵</div>
                <p className="text-slate-600 text-sm">
                  选择音频文件，自动解析歌曲信息
                </p>
              </div>
              
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-center">
                  <Music className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                  <p className="text-slate-600 font-medium mb-1">点击选择音频文件</p>
                  <p className="text-slate-400 text-xs">支持 MP3, WAV, OGG 等格式</p>
                </div>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    try {
                      // 读取音频文件
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        const audioData = event.target?.result as string;
                        
                        // 从文件名提取信息
                        const fileName = file.name.replace(/\.[^/.]+$/, ''); // 移除扩展名
                        let title = fileName;
                        let artist = '未知艺术家';
                        
                        // 尝试从文件名解析（格式：艺术家 - 歌名）
                        if (fileName.includes(' - ')) {
                          const parts = fileName.split(' - ');
                          artist = parts[0].trim();
                          title = parts.slice(1).join(' - ').trim();
                        } else if (fileName.includes('-')) {
                          const parts = fileName.split('-');
                          artist = parts[0].trim();
                          title = parts.slice(1).join('-').trim();
                        }
                        
                        const newTrack = { 
                          title, 
                          artist, 
                          cover: '', 
                          audio: audioData 
                        };
                        
                        setCurrentTrack(newTrack);
                        localStorage.setItem('currentTrack', JSON.stringify(newTrack));
                        setShowMusicUploader(false);
                        alert(`已上传：${title} - ${artist}`);
                      };
                      reader.readAsDataURL(file);
                    } catch (error) {
                      console.error('音频文件处理失败:', error);
                      alert('音频文件处理失败，请重试');
                    }
                  }}
                />
              </label>
              
              <button
                onClick={() => setShowMusicUploader(false)}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 py-3 rounded-xl font-medium transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 倒计时模态框 */}
      {showCountdownModal && !showCountdownEditor && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-white/40">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800">倒计时</h3>
              <button
                onClick={() => setShowCountdownModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🌸</div>
                <h4 className="font-bold text-slate-800 text-2xl mb-2">{countdownEvent.name}</h4>
                <p className="text-slate-500 mb-6">{countdownEvent.date}</p>
                
                {(() => {
                  const info = calculateDaysInfo();
                  
                  if (!info.isPast) {
                    return (
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl p-6">
                        <div className="text-5xl font-bold mb-2">{info.days}</div>
                        <div className="text-lg">还有 {info.days} 天</div>
                      </div>
                    );
                  } else if (info.days === 0) {
                    return (
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl p-6">
                        <div className="text-3xl font-bold">🎉 就是今天！</div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="bg-gradient-to-r from-slate-400 to-slate-500 text-white rounded-2xl p-6">
                        <div className="text-3xl">已经 {info.days} 天</div>
                      </div>
                    );
                  }
                })()}
              </div>
              
              <button
                onClick={() => {
                  setTempCountdownDate(countdownEvent.date);
                  setTempCountdownName(countdownEvent.name);
                  setShowCountdownEditor(true);
                }}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-medium transition-colors"
              >
                编辑倒计时
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 倒计时编辑器 */}
      {showCountdownEditor && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-white/40">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800">编辑倒计时</h3>
              <button
                onClick={() => setShowCountdownEditor(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">事件名称</label>
                <input
                  type="text"
                  value={tempCountdownName}
                  onChange={(e) => setTempCountdownName(e.target.value)}
                  placeholder="我的生日"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">目标日期</label>
                <input
                  type="date"
                  value={tempCountdownDate}
                  onChange={(e) => setTempCountdownDate(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCountdownEditor(false)}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-3 rounded-xl font-medium transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    if (tempCountdownName && tempCountdownDate) {
                      const newEvent = { date: tempCountdownDate, name: tempCountdownName };
                      setCountdownEvent(newEvent);
                      localStorage.setItem('countdownEvent', JSON.stringify(newEvent));
                      setShowCountdownEditor(false);
                      setShowCountdownModal(false);
                    } else {
                      alert('请填写完整信息');
                    }
                  }}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-medium transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
