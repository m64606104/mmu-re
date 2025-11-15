/**
 * 网易云音乐分享卡片组件
 * 模仿微信中网易云音乐分享的样式
 */

import React, { useState, useRef } from 'react';
import { Play, Pause, ExternalLink, Music } from 'lucide-react';
import { NeteaseMusicInfo } from '../utils/neteaseMusicParser';

interface NeteaseMusicCardProps {
  musicInfo: NeteaseMusicInfo;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
}

const NeteaseMusicCard: React.FC<NeteaseMusicCardProps> = ({ 
  musicInfo, 
  className = '',
  onPlay,
  onPause
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // 模拟播放功能（实际的网易云音乐需要API支持）
  const handlePlayToggle = () => {
    if (musicInfo.playUrl) {
      // 如果有播放链接，尝试播放
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
        onPause?.();
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
        onPlay?.();
      }
    } else {
      // 没有播放链接，打开网易云音乐链接
      window.open(musicInfo.shareUrl, '_blank');
    }
  };

  // 打开网易云音乐
  const handleOpenNetease = () => {
    window.open(musicInfo.shareUrl, '_blank');
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all ${className}`}>
      {/* 音频元素 */}
      {musicInfo.playUrl && (
        <audio
          ref={audioRef}
          src={musicInfo.playUrl}
          onLoadStart={() => setIsLoading(true)}
          onCanPlay={() => setIsLoading(false)}
          onEnded={() => setIsPlaying(false)}
          onError={() => setIsLoading(false)}
        />
      )}

      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* 左侧：歌曲信息 */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 text-lg mb-1 truncate">
              {musicInfo.title}
            </h3>
            <p className="text-gray-600 text-sm mb-3 truncate">
              {musicInfo.artist}
            </p>
            
            {/* 网易云音乐品牌标识 */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-4 h-4 bg-red-500 rounded-sm flex items-center justify-center">
                <Music className="w-2.5 h-2.5 text-white" />
              </div>
              <span>网易云音乐</span>
            </div>
          </div>

          {/* 右侧：专辑封面和播放按钮 */}
          <div className="flex flex-col items-center gap-3">
            {/* 专辑封面 */}
            <div className="w-16 h-16 rounded-lg overflow-hidden shadow-sm">
              {musicInfo.coverUrl ? (
                musicInfo.coverUrl.startsWith('linear-gradient') ? (
                  <div 
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: musicInfo.coverUrl }}
                  >
                    <Music className="w-6 h-6 text-white/80" />
                  </div>
                ) : (
                  <img 
                    src={musicInfo.coverUrl} 
                    alt={musicInfo.title}
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <Music className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>

            {/* 播放按钮 */}
            <button
              onClick={handlePlayToggle}
              disabled={isLoading}
              className="w-10 h-10 bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-full flex items-center justify-center text-white transition-colors shadow-md"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </button>
          </div>
        </div>

        {/* 底部：时长和打开链接 */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            {musicInfo.duration ? `时长 ${Math.floor(musicInfo.duration / 60)}:${(musicInfo.duration % 60).toString().padStart(2, '0')}` : '单曲'}
          </div>
          
          <button
            onClick={handleOpenNetease}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            打开
          </button>
        </div>
      </div>
    </div>
  );
};

export default NeteaseMusicCard;
