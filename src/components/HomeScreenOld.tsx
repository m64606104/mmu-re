import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Settings, Music, Phone, Heart, Camera, Play, Pause, SkipBack, SkipForward, MapPin, Sun, X, Calendar, Upload } from 'lucide-react';
import { Screen } from '../types';

interface HomeScreenProps {
  onNavigate: (screen: Screen) => void;
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

export default function HomeScreen({ onNavigate }: HomeScreenProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPlaying, setIsPlaying] = useState(false);
  const [landscapeImage, setLandscapeImage] = useState<string>('');
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [showCountdownModal, setShowCountdownModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null);
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
  const coverInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('landscapeImage');
    if (saved) setLandscapeImage(saved);
  }, []);

  useEffect(() => {
    if (audioRef.current && currentTrack.audio) {
      audioRef.current.src = currentTrack.audio;
      if (isPlaying) {
        audioRef.current.play().catch(e => console.log('播放失败:', e));
      }
    }
  }, [currentTrack.audio]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.log('播放失败:', e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

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

  const calculateDaysUntil = () => {
    const today = new Date();
    const targetDate = new Date(countdownEvent.date);
    const diff = targetDate.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleLandscapeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLandscapeImage(base64);
        localStorage.setItem('landscapeImage', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const newTrack = { ...currentTrack, cover: base64 };
        setCurrentTrack(newTrack);
        localStorage.setItem('currentTrack', JSON.stringify(newTrack));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const newTrack = { ...currentTrack, audio: base64 };
        setCurrentTrack(newTrack);
        localStorage.setItem('currentTrack', JSON.stringify(newTrack));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveMusic = (title: string, artist: string) => {
    const newTrack = { ...currentTrack, title, artist };
    setCurrentTrack(newTrack);
    localStorage.setItem('currentTrack', JSON.stringify(newTrack));
    setShowMusicModal(false);
  };

  const handleSaveCountdown = (date: string, name: string) => {
    const newEvent = { date, name };
    setCountdownEvent(newEvent);
    localStorage.setItem('countdownEvent', JSON.stringify(newEvent));
    setShowCountdownModal(false);
  };

  const togglePlay = () => {
    if (currentTrack.audio) {
      setIsPlaying(!isPlaying);
    } else {
      alert('请先上传音乐文件');
    }
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

  const getPageTransform = () => {
    if (touchStartX === null || touchCurrentX === null) {
      return `translateX(-${currentPage * 100}%)`;
    }
    const distance = touchCurrentX - touchStartX;
    const baseOffset = -currentPage * 100;
    const swipeOffset = (distance / window.innerWidth) * 100;
    return `translateX(${baseOffset + swipeOffset}%)`;
  };

  return (
    <div className="h-full relative overflow-hidden bg-gradient-to-br from-pink-300 via-purple-300 to-blue-300">
      {/* 隐藏的音频元素 */}
      <audio ref={audioRef} />

      {/* 分页容器 */}
      <div 
        className="h-full flex transition-transform duration-300 ease-out"
        style={{ transform: getPageTransform() }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
          {/* 倒计时卡片 - 可点击设置 */}
          <button
            onClick={() => setShowCountdownModal(true)}
            className="bg-white/20 backdrop-blur-xl rounded-3xl p-5 shadow-lg border border-white/30 relative overflow-hidden text-left hover:bg-white/25 transition-colors"
          >
            <div className="absolute -right-4 -top-4 text-6xl opacity-20">🌸</div>
            <div className="absolute -left-2 -bottom-2 text-4xl opacity-20">🌺</div>
            
            <div className="relative">
              <div className="text-6xl font-bold text-white mb-1">
                {calculateDaysUntil()}
              </div>
              <div className="text-white/80 text-xs font-medium">Days</div>
              <div className="text-white text-sm mt-2">{countdownEvent.name}</div>
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

        {/* 音乐播放器 - 可点击设置 */}
        <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-4 shadow-lg border border-white/30">
          <div className="flex items-center gap-4">
            {/* 专辑封面 - 可点击上传 */}
            <label className="cursor-pointer">
              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg">
                {currentTrack.cover ? (
                  <img src={currentTrack.cover} alt="封面" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                    <Music className="w-8 h-8 text-white/50" />
                  </div>
                )}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverUpload}
              />
            </label>
            
            {/* 歌曲信息 - 可点击编辑 */}
            <button
              onClick={() => setShowMusicModal(true)}
              className="flex-1 text-left hover:opacity-80 transition-opacity"
            >
              <div className="text-white font-medium text-sm truncate">{currentTrack.title}</div>
              <div className="text-white/70 text-xs truncate">{currentTrack.artist}</div>
            </button>

            {/* 播放控制 */}
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

        {/* 圆形风景图片 - 可点击上传 */}
        <div className="flex justify-center">
          <label className="relative cursor-pointer group">
            <div className="w-32 h-32 rounded-full overflow-hidden shadow-2xl border-4 border-white/30 relative">
              {landscapeImage ? (
                <img src={landscapeImage} alt="风景" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-200 to-purple-200 flex items-center justify-center">
                  <Camera className="w-12 h-12 text-white/50" />
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

        {/* 快捷图标 */}
        <div className="flex justify-center gap-4">
          <button 
            onClick={() => onNavigate('social')}
            className="w-14 h-14 rounded-2xl bg-white/25 backdrop-blur-md border border-white/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-lg"
          >
            <Camera className="w-7 h-7 text-white" strokeWidth={2} />
          </button>
          <button 
            onClick={() => onNavigate('social')}
            className="w-14 h-14 rounded-2xl bg-white/25 backdrop-blur-md border border-white/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-lg"
          >
            <MessageCircle className="w-7 h-7 text-white" strokeWidth={2} />
          </button>
          <button className="w-14 h-14 rounded-2xl bg-white/25 backdrop-blur-md border border-white/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-lg">
            <Heart className="w-7 h-7 text-white" strokeWidth={2} />
          </button>
          <button 
            onClick={() => onNavigate('settings')}
            className="w-14 h-14 rounded-2xl bg-white/25 backdrop-blur-md border border-white/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-lg"
          >
            <Settings className="w-7 h-7 text-white" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Dock */}
      <div className="absolute bottom-6 left-0 right-0 px-6">
        <div className="bg-white/20 backdrop-blur-xl rounded-[28px] p-3 shadow-2xl border border-white/30">
          <div className="flex justify-around items-center gap-2">
            <button className="w-14 h-14 rounded-[18px] bg-white/30 backdrop-blur-md flex items-center justify-center hover:scale-110 active:scale-95 transition-transform">
              <Phone className="w-6 h-6 text-white" strokeWidth={2} />
            </button>
            <button 
              onClick={() => onNavigate('social')}
              className="w-14 h-14 rounded-[18px] bg-white/30 backdrop-blur-md flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
            >
              <MessageCircle className="w-6 h-6 text-white" strokeWidth={2} />
            </button>
            <button className="w-14 h-14 rounded-[18px] bg-white/30 backdrop-blur-md flex items-center justify-center hover:scale-110 active:scale-95 transition-transform">
              <Music className="w-6 h-6 text-white" strokeWidth={2} />
            </button>
            <button 
              onClick={() => onNavigate('settings')}
              className="w-14 h-14 rounded-[18px] bg-white/30 backdrop-blur-md flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
            >
              <Settings className="w-6 h-6 text-white" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* 页面指示器 */}
        <div className="flex justify-center gap-2 mt-3">
          <div className="w-8 h-1 rounded-full bg-white"></div>
          <div className="w-1 h-1 rounded-full bg-white/40"></div>
        </div>
      </div>

      {/* 音乐设置弹窗 */}
      {showMusicModal && (
        <MusicModal
          currentTrack={currentTrack}
          onClose={() => setShowMusicModal(false)}
          onSave={handleSaveMusic}
          onUploadAudio={() => audioInputRef.current?.click()}
        />
      )}

      {/* 倒计时设置弹窗 */}
      {showCountdownModal && (
        <CountdownModal
          event={countdownEvent}
          onClose={() => setShowCountdownModal(false)}
          onSave={handleSaveCountdown}
        />
      )}

      {/* 隐藏的音频上传input */}
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleAudioUpload}
      />
    </div>
  );
}

// 音乐设置弹窗组件
function MusicModal({ currentTrack, onClose, onSave, onUploadAudio }: {
  currentTrack: MusicTrack;
  onClose: () => void;
  onSave: (title: string, artist: string) => void;
  onUploadAudio: () => void;
}) {
  const [title, setTitle] = useState(currentTrack.title);
  const [artist, setArtist] = useState(currentTrack.artist);

  return (
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">音乐设置</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">歌曲名称</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="输入歌曲名称"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">艺术家</label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="输入艺术家名称"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">音乐文件</label>
            <button
              onClick={onUploadAudio}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              <span>{currentTrack.audio ? '更换音乐文件' : '上传音乐文件'}</span>
            </button>
          </div>

          <button
            onClick={() => onSave(title, artist)}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

// 倒计时设置弹窗组件
function CountdownModal({ event, onClose, onSave }: {
  event: CountdownEvent;
  onClose: () => void;
  onSave: (date: string, name: string) => void;
}) {
  const [date, setDate] = useState(event.date);
  const [name, setName] = useState(event.name);

  return (
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">倒计时设置</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">事件名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="例如：我的生日"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">日期</label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <button
            onClick={() => onSave(date, name)}
            className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl hover:from-pink-600 hover:to-purple-600 transition-all"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
