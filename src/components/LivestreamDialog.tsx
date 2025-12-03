import { useState, useEffect } from 'react';
import { X, Users, Radio, Eye, PhoneOff, Minimize2 } from 'lucide-react';
import { LivestreamData, EasyChatContact, EasyChatUser } from '../types';

interface LivestreamDialogProps {
  livestream: LivestreamData;
  currentUserId: string;
  contacts: EasyChatContact[];
  user: EasyChatUser;
  conversationId?: string;
  onClose: () => void;
  onOpenChat?: () => void;
  onJoinAsViewer?: () => void;
  onJoinAsCoHost?: () => void;
  onJoinLivestream?: () => void;
  onEndLivestream?: () => void;
  initialMinimized?: boolean;
}

export function LivestreamDialog({
  livestream,
  currentUserId,
  contacts,
  user,
  conversationId: _conversationId,
  onClose,
  onOpenChat,
  onJoinAsViewer,
  onJoinAsCoHost,
  onJoinLivestream: _onJoinLivestream,
  onEndLivestream,
  initialMinimized = false
}: LivestreamDialogProps) {
  const [isMinimized, setIsMinimized] = useState(initialMinimized);
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const isHost = livestream.hostId === currentUserId;
  const isViewer = livestream.viewers.includes(currentUserId);
  const isCoHost = livestream.coHosts.includes(currentUserId);
  const hasJoined = isHost || isViewer || isCoHost;

  // 获取联系人信息
  const getContact = (id: string) => {
    if (id === user.id) return user;
    return contacts.find(c => c.id === id);
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

  // 最小化状态下的悬浮窗
  if (isMinimized) {
    return (
      <div 
        className="fixed z-50 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl shadow-2xl p-4 cursor-move select-none"
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
            <Radio className="w-6 h-6 text-white" />
          </div>
          <div className="text-white">
            <p className="text-sm">{livestream.title || '直播'}</p>
            <p className="text-xs opacity-75">{livestream.viewers.length + livestream.coHosts.length + 1} 人观看</p>
          </div>
        </div>
        <p className="text-white/60 text-[10px] text-center mt-2">双击打开</p>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="relative bg-gradient-to-br from-red-500 via-pink-500 to-purple-500 px-6 py-8">
          <button
            onClick={() => setIsMinimized(true)}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <Minimize2 className="w-5 h-5 text-white" />
          </button>
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                {getContact(livestream.hostId)?.avatar.startsWith('data:') ? (
                  <img 
                    src={getContact(livestream.hostId)?.avatar} 
                    alt="主播" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span className="text-3xl">{getContact(livestream.hostId)?.avatar}</span>
                )}
              </div>
              {livestream.isActive && (
                <div className="absolute -bottom-1 -right-1 flex items-center gap-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full border-2 border-white">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>LIVE</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-white truncate mb-1">
                {livestream.title || `${livestream.hostName}的直播`}
              </h3>
              <p className="text-white/80 text-sm">
                {livestream.hostName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-white/90 text-sm">
            <div className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              <span>{livestream.viewers.length + livestream.coHosts.length + 1} 观看</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>{livestream.coHosts.length + 1} 主播</span>
            </div>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <div className="space-y-4">
            {/* 开播时间 */}
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">开播时间</span>
              <span className="text-sm">{livestream.startTime}</span>
            </div>

            {/* 一起直播的人 */}
            {livestream.coHosts.length > 0 && (
              <div className="py-2 border-b border-gray-100">
                <div className="text-sm text-gray-500 mb-3">一起直播</div>
                <div className="flex flex-wrap gap-2">
                  {livestream.coHosts.map(coHostId => {
                    const coHost = getContact(coHostId);
                    if (!coHost) return null;
                    return (
                      <div key={coHostId} className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-1.5">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center overflow-hidden">
                          {coHost.avatar.startsWith('data:') ? (
                            <img src={coHost.avatar} alt={coHost.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm">{coHost.avatar}</span>
                          )}
                        </div>
                        <span className="text-sm">{coHost.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 观众列表 */}
            {livestream.viewers.length > 0 && (
              <div className="py-2">
                <div className="text-sm text-gray-500 mb-3">观众席</div>
                <div className="flex flex-wrap gap-2">
                  {livestream.viewers.slice(0, 10).map(viewerId => {
                    const viewer = getContact(viewerId);
                    if (!viewer) return null;
                    return (
                      <div key={viewerId} className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-1.5">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center overflow-hidden">
                          {viewer.avatar.startsWith('data:') ? (
                            <img src={viewer.avatar} alt={viewer.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm">{viewer.avatar}</span>
                          )}
                        </div>
                        <span className="text-sm">{viewer.name}</span>
                      </div>
                    );
                  })}
                  {livestream.viewers.length > 10 && (
                    <div className="flex items-center justify-center bg-gray-50 rounded-full px-3 py-1.5">
                      <span className="text-sm text-gray-500">+{livestream.viewers.length - 10}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          {!isHost && livestream.isActive && (
            <div className="mt-6 space-y-2">
              {!hasJoined ? (
                <>
                  <button
                    onClick={() => {
                      onJoinAsViewer?.();
                      onClose();
                    }}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all active:scale-98"
                  >
                    进入观众席
                  </button>
                  <button
                    onClick={() => {
                      onJoinAsCoHost?.();
                      onClose();
                    }}
                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl transition-all active:scale-98"
                  >
                    一起直播
                  </button>
                </>
              ) : (
                <div className="text-center py-2 text-sm text-gray-500">
                  {isViewer && '你正在观看直播'}
                  {isCoHost && '你正在一起直播'}
                </div>
              )}
            </div>
          )}

          {isHost && livestream.isActive && (
            <div className="mt-6">
              <button
                onClick={() => {
                  if (onEndLivestream) {
                    onEndLivestream();
                  }
                  onClose();
                }}
                className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <PhoneOff className="w-5 h-5" />
                <span>结束直播</span>
              </button>
            </div>
          )}

          {isHost && !livestream.isActive && (
            <div className="mt-6 text-center text-sm text-gray-500">
              你是主播（直播已结束）
            </div>
          )}

          {!livestream.isActive && !isHost && (
            <div className="mt-6 text-center py-3 bg-gray-50 rounded-xl text-sm text-gray-500">
              直播已结束
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
