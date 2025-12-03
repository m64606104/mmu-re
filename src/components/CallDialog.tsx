import { useState, useEffect } from 'react';
import { Video, Phone, Mic, MicOff, VideoOff, PhoneOff, Volume2, VolumeX, Minimize2 } from 'lucide-react';
import { Button } from './ui/button';

interface CallDialogProps {
  type: 'voice' | 'video';
  contactName: string;
  contactAvatar: string;
  conversationId?: string; // 可选：关联的会话ID
  onClose: () => void;
  onOpenChat?: () => void; // 可选：打开聊天的回调
  initialMinimized?: boolean; // 可选：初始是否最小化
}

export function CallDialog({ type, contactName, contactAvatar, conversationId, onClose, onOpenChat, initialMinimized = false }: CallDialogProps) {
  const [callStatus, setCallStatus] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isMinimized, setIsMinimized] = useState(initialMinimized);
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem('userProfile');
    return saved ? JSON.parse(saved) : {
      avatar: '',
      username: '我',
      bio: '分享生活，记录美好'
    };
  });

  // 监听用户资料变化
  useEffect(() => {
    const handleUserProfileUpdate = (e: CustomEvent) => {
      setUserProfile(e.detail);
    };
    
    window.addEventListener('userProfileUpdated', handleUserProfileUpdate as EventListener);
    return () => window.removeEventListener('userProfileUpdated', handleUserProfileUpdate as EventListener);
  }, []);

  useEffect(() => {
    // 模拟接通
    const connectTimer = setTimeout(() => {
      setCallStatus('connected');
    }, 3000);

    return () => clearTimeout(connectTimer);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (callStatus === 'connected') {
      timer = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  // 拖拽处理函数
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    });
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging && e.touches[0]) {
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, dragStart]);

  // 最小化状态下的小浮窗
  if (isMinimized) {
    return (
      <div 
        className="fixed z-50 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-2xl p-4 cursor-move select-none"
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          touchAction: 'none'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDoubleClick={() => {
          if (onOpenChat) {
            onOpenChat();
          }
          setIsMinimized(false);
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            {type === 'video' ? (
              <Video className="w-6 h-6 text-white" />
            ) : (
              <Phone className="w-6 h-6 text-white" />
            )}
          </div>
          <div className="text-white">
            <p className="text-sm">{contactName}</p>
            {callStatus === 'connected' && (
              <p className="text-xs opacity-75 font-mono">{formatDuration(duration)}</p>
            )}
            {callStatus === 'calling' && (
              <p className="text-xs opacity-75">呼叫中...</p>
            )}
          </div>
        </div>
        <p className="text-white/60 text-[10px] text-center mt-2">双击打开</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-600 to-purple-600 flex flex-col items-center justify-between z-50 p-8">
      {/* 顶部状态 */}
      <div className="text-white text-center relative w-full">
        {/* 最小化按钮 */}
        <button
          onClick={() => setIsMinimized(true)}
          className="absolute left-0 top-0 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
        >
          <Minimize2 className="w-5 h-5 text-white" />
        </button>
        
        <p className="text-lg opacity-90 mb-2">
          {type === 'video' ? '视频通话' : '语音通话'}
        </p>
        {callStatus === 'calling' && (
          <p className="text-sm opacity-75">正在呼叫...</p>
        )}
        {callStatus === 'connected' && (
          <p className="text-2xl font-mono font-semibold">{formatDuration(duration)}</p>
        )}
        {callStatus === 'ended' && (
          <p className="text-sm opacity-75">通话已结束</p>
        )}
      </div>

      {/* 中间联系人信息 */}
      <div className="text-white text-center">
        {type === 'video' && callStatus === 'connected' ? (
          <div className="w-full max-w-md aspect-[9/16] bg-black/30 rounded-2xl flex items-center justify-center mb-4 relative">
            {isVideoOff ? (
              <div className="text-center">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-5xl">{contactAvatar}</span>
                </div>
                <p className="text-white/80">对方已关闭摄像头</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-6xl">{contactAvatar}</span>
                </div>
                <p className="text-white/60 text-sm">模拟视频画面</p>
              </div>
            )}
            {/* 小窗口（自己） */}
            <div className="absolute bottom-4 right-4 w-20 h-28 bg-gray-800 rounded-lg flex items-center justify-center">
              <span className="text-3xl">😊</span>
            </div>
          </div>
        ) : (
          <div>
            <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-7xl">{contactAvatar}</span>
            </div>
            <p className="text-2xl font-semibold mb-2">{contactName}</p>
          </div>
        )}
      </div>

      {/* 底部控制按钮 */}
      <div className="w-full max-w-md">
        {callStatus === 'connected' && (
          <div className="flex justify-center gap-4 mb-6">
            {/* 麦克风 */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isMuted ? 'bg-red-500' : 'bg-white/20'
              }`}
            >
              {isMuted ? (
                <MicOff className="w-6 h-6 text-white" />
              ) : (
                <Mic className="w-6 h-6 text-white" />
              )}
            </button>

            {/* 扬声器 */}
            <button
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                !isSpeakerOn ? 'bg-red-500' : 'bg-white/20'
              }`}
            >
              {isSpeakerOn ? (
                <Volume2 className="w-6 h-6 text-white" />
              ) : (
                <VolumeX className="w-6 h-6 text-white" />
              )}
            </button>

            {/* 视频开关 */}
            {type === 'video' && (
              <button
                onClick={() => setIsVideoOff(!isVideoOff)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isVideoOff ? 'bg-red-500' : 'bg-white/20'
                }`}
              >
                {isVideoOff ? (
                  <VideoOff className="w-6 h-6 text-white" />
                ) : (
                  <Video className="w-6 h-6 text-white" />
                )}
              </button>
            )}
          </div>
        )}

        {/* 挂断按钮 */}
        <div className="flex justify-center">
          <button
            onClick={handleEndCall}
            className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all shadow-lg"
          >
            <PhoneOff className="w-8 h-8 text-white" />
          </button>
        </div>

        <p className="text-white/60 text-xs text-center mt-6">
          💡 这是模拟通话功能，不会真实通话
        </p>
      </div>
    </div>
  );
}
