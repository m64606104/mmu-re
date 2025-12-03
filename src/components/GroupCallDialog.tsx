import { useState, useEffect } from 'react';
import { X, Phone, Video, Users, PhoneOff, Minimize2 } from 'lucide-react';
import { GroupCallData, EasyChatContact, EasyChatUser } from '../types';

interface GroupCallDialogProps {
  groupCall: GroupCallData;
  currentUserId: string;
  contacts: EasyChatContact[];
  user: EasyChatUser;
  conversationId?: string; // 可选：关联的会话ID
  onClose: () => void;
  onOpenChat?: () => void; // 可选：打开聊天的回调
  onJoinCall: () => void;
  onEndCall?: () => void;
  initialMinimized?: boolean; // 可选：初始是否最小化
}

export function GroupCallDialog({
  groupCall,
  currentUserId,
  contacts,
  user,
  conversationId,
  onClose,
  onOpenChat,
  onJoinCall,
  onEndCall,
  initialMinimized = false
}: GroupCallDialogProps) {
  const [isMinimized, setIsMinimized] = useState(initialMinimized);
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const isInitiator = groupCall.initiatorId === currentUserId;
  const hasJoined = groupCall.participants.includes(currentUserId);

  // 获取联系人信息
  const getContact = (id: string) => {
    if (id === user.id) return user;
    return contacts.find(c => c.id === id);
  };

  const initiator = getContact(groupCall.initiatorId);

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
        className="fixed z-50 rounded-2xl shadow-2xl p-4 cursor-move select-none"
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          touchAction: 'none',
          background: groupCall.type === 'video' 
            ? 'linear-gradient(to bottom right, rgb(168, 85, 247), rgb(236, 72, 153))' 
            : 'linear-gradient(to bottom right, rgb(34, 197, 94), rgb(16, 185, 129))'
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
            {groupCall.type === 'video' ? (
              <Video className="w-6 h-6 text-white" />
            ) : (
              <Phone className="w-6 h-6 text-white" />
            )}
          </div>
          <div className="text-white">
            <p className="text-sm">{groupCall.type === 'video' ? '群视频' : '群语音'}</p>
            <p className="text-xs opacity-75">{groupCall.participants.length} 人参与</p>
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
        <div className={`relative px-6 py-8 ${
          groupCall.type === 'video' 
            ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-red-500' 
            : 'bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500'
        }`}>
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

          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
              {groupCall.type === 'video' ? (
                <Video className="w-10 h-10 text-white" />
              ) : (
                <Phone className="w-10 h-10 text-white" />
              )}
            </div>

            <h3 className="text-white text-lg mb-2">
              {groupCall.type === 'video' ? '群视频通话' : '群语音通话'}
            </h3>
            <p className="text-white/80 text-sm">
              {groupCall.initiatorName} 发起
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 mt-4 text-white/90 text-sm">
            <Users className="w-4 h-4" />
            <span>{groupCall.participants.length} 人参与</span>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <div className="space-y-4">
            {/* 开始时间 */}
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">开始时间</span>
              <span className="text-sm">{groupCall.startTime}</span>
            </div>

            {/* 参与者列表 */}
            <div className="py-2">
              <div className="text-sm text-gray-500 mb-3">参与者</div>
              <div className="space-y-2">
                {/* 发起人 */}
                {initiator && (
                  <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center overflow-hidden">
                      {initiator.avatar.startsWith('data:') ? (
                        <img src={initiator.avatar} alt={initiator.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">{initiator.avatar}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{initiator.name}</p>
                      <p className="text-xs text-gray-500">发起人</p>
                    </div>
                  </div>
                )}

                {/* 其他参与者 */}
                {groupCall.participants.map(participantId => {
                  const participant = getContact(participantId);
                  if (!participant || participantId === groupCall.initiatorId) return null;
                  return (
                    <div key={participantId} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center overflow-hidden">
                        {participant.avatar.startsWith('data:') ? (
                          <img src={participant.avatar} alt={participant.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg">{participant.avatar}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{participant.name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          {!isInitiator && groupCall.isActive && !hasJoined && (
            <div className="mt-6">
              <button
                onClick={() => {
                  onJoinCall();
                  onClose();
                }}
                className={`w-full py-3 text-white rounded-xl transition-all active:scale-98 ${
                  groupCall.type === 'video'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                }`}
              >
                加入通话
              </button>
            </div>
          )}

          {isInitiator && groupCall.isActive && (
            <div className="mt-6">
              <button
                onClick={() => {
                  if (onEndCall) {
                    onEndCall();
                  }
                  onClose();
                }}
                className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <PhoneOff className="w-5 h-5" />
                <span>结束通话</span>
              </button>
            </div>
          )}

          {!groupCall.isActive && (
            <div className="mt-6 text-center py-3 bg-gray-50 rounded-xl text-sm text-gray-500">
              通话已结束
            </div>
          )}

          {!isInitiator && groupCall.isActive && hasJoined && (
            <div className="mt-6 text-center py-3 bg-gray-50 rounded-xl text-sm text-gray-500">
              已加入通话（只有发起人可以结束）
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
