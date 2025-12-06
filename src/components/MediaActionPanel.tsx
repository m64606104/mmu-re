import { 
  Image as ImageIcon, 
  Radio, 
  Phone, 
  Video, 
  MapPin, 
  CircleDollarSign, 
  ArrowRightLeft, 
  Star 
} from 'lucide-react';

interface MediaActionPanelProps {
  onImageSelect: () => void;
  onLivestream: () => void;
  onVoiceCall: () => void;
  onVideoCall: () => void;
  isLivestreaming: boolean;
  isVoiceCalling: boolean;
  isVideoCalling: boolean;
  conversationType: 'private' | 'group';
}

export function MediaActionPanel({
  onImageSelect,
  onLivestream,
  onVoiceCall,
  onVideoCall,
  isLivestreaming,
  isVoiceCalling,
  isVideoCalling,
  conversationType
}: MediaActionPanelProps) {
  
  const actions = [
    {
      icon: <ImageIcon size={28} className="text-gray-700" />,
      label: '照片',
      onClick: onImageSelect
    },
    {
      icon: isLivestreaming ? <Radio size={28} className="text-red-500 animate-pulse" /> : <Radio size={28} className="text-gray-700" />,
      label: isLivestreaming ? '关闭直播' : '直播',
      onClick: onLivestream,
      show: conversationType === 'group' // 仅群聊显示直播？或者私聊也可以？通常直播是群聊
    },
    {
      icon: <Phone size={28} className={isVoiceCalling ? "text-red-500" : "text-gray-700"} />,
      label: isVoiceCalling ? '挂断' : '语音通话',
      onClick: onVoiceCall
    },
    {
      icon: <Video size={28} className={isVideoCalling ? "text-red-500" : "text-gray-700"} />,
      label: isVideoCalling ? '挂断' : '视频通话',
      onClick: onVideoCall
    },
    {
      icon: <CircleDollarSign size={28} className="text-gray-700" />,
      label: '红包',
      onClick: () => {} // 占位
    },
    {
      icon: <ArrowRightLeft size={28} className="text-gray-700" />,
      label: '转账',
      onClick: () => {} // 占位
    },
    {
      icon: <MapPin size={28} className="text-gray-700" />,
      label: '位置',
      onClick: () => {} // 占位
    },
    {
      icon: <Star size={28} className="text-gray-700" />,
      label: '收藏',
      onClick: () => {} // 占位
    }
  ];

  // 过滤掉不显示的项
  const visibleActions = actions.filter(action => action.show !== false);

  return (
    <div className="h-[220px] bg-[#f5f5f5] border-t border-gray-200 p-6 overflow-y-auto">
      <div className="grid grid-cols-4 gap-y-6">
        {visibleActions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className="flex flex-col items-center gap-2 active:opacity-70 transition-opacity"
          >
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-1">
              {action.icon}
            </div>
            <span className="text-xs text-gray-500">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
