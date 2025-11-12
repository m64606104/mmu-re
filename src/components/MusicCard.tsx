/**
 * 音乐卡片组件 - 显示在聊天中的音乐分享卡片
 * 参考微信等聊天应用的音乐卡片设计
 */

import React from 'react';
import { Music, Play, Pause } from 'lucide-react';
import { MusicMessage } from '../types';

interface MusicCardProps {
  music: MusicMessage;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  showPlayButton?: boolean;
  className?: string;
}

const MusicCard: React.FC<MusicCardProps> = ({
  music,
  isPlaying = false,
  onPlayPause,
  showPlayButton = false,
  className = ''
}) => {
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMoodEmoji = (mood?: MusicMessage['mood']): string => {
    switch (mood) {
      case 'happy': return '😊';
      case 'sad': return '😢';
      case 'energetic': return '🔥';
      case 'calm': return '😌';
      case 'romantic': return '💕';
      case 'mysterious': return '🌙';
      default: return '🎵';
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-sm ${className}`}>
      <div className="flex p-3">
        {/* 封面图片 */}
        <div className="relative flex-shrink-0 mr-3">
          {music.coverUrl ? (
            <img
              src={music.coverUrl}
              alt={`${music.title} - ${music.artist}`}
              className="w-12 h-12 rounded-lg object-cover bg-gray-100"
              onError={(e) => {
                // 封面加载失败时显示默认图标
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement?.classList.add('bg-gray-100', 'flex', 'items-center', 'justify-center');
                target.parentElement?.appendChild(
                  Object.assign(document.createElement('div'), {
                    innerHTML: '🎵',
                    className: 'text-gray-400 text-lg'
                  })
                );
              }}
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
              <Music className="w-6 h-6 text-gray-400" />
            </div>
          )}
          
          {/* 播放按钮覆盖层 */}
          {showPlayButton && (
            <button
              onClick={onPlayPause}
              className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white ml-0.5" />
              )}
            </button>
          )}
        </div>

        {/* 音乐信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate text-sm leading-tight">
                {music.title}
              </h3>
              <p className="text-gray-600 text-xs truncate mt-0.5">
                {music.artist}
              </p>
              {music.album && (
                <p className="text-gray-500 text-xs truncate mt-0.5">
                  {music.album}
                </p>
              )}
            </div>
            
            {/* 时长和情绪 */}
            <div className="flex flex-col items-end ml-2">
              {music.duration && (
                <span className="text-xs text-gray-500">
                  {formatDuration(music.duration)}
                </span>
              )}
              {music.mood && (
                <span className="text-sm mt-1" title={`情绪: ${music.mood}`}>
                  {getMoodEmoji(music.mood)}
                </span>
              )}
            </div>
          </div>
          
          {/* 额外信息 */}
          <div className="flex items-center gap-2 mt-2">
            {music.releaseYear && (
              <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                {music.releaseYear}年
              </span>
            )}
            {music.genre && (
              <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                {music.genre}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 底部标识 */}
      <div className="px-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Music className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500">音乐</span>
          </div>
          
          {music.platform && (
            <span className="text-xs text-gray-400">
              来自 {music.platform === 'Manual' ? '手动输入' : music.platform}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MusicCard;
