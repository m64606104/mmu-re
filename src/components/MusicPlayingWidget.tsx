/**
 * 音乐播放状态显示组件 - 显示AI正在"听"的音乐
 */

import React, { useState, useEffect } from 'react';
import { Music, Volume2, X } from 'lucide-react';
import { MusicInfo, MusicPlaybackState } from '../utils/musicService';

interface MusicPlayingWidgetProps {
  musicInfo: MusicInfo;
  playbackState: MusicPlaybackState | null;
  onStop: () => void;
  characterName: string;
}

const MusicPlayingWidget: React.FC<MusicPlayingWidgetProps> = ({
  musicInfo,
  playbackState,
  onStop,
  characterName
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (playbackState) {
      const progressPercent = (playbackState.currentTime / playbackState.duration) * 100;
      setProgress(progressPercent);
    }
  }, [playbackState]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMoodEmoji = (mood?: MusicInfo['mood']): string => {
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

  const getMoodColor = (mood?: MusicInfo['mood']): string => {
    switch (mood) {
      case 'happy': return 'from-yellow-400 to-orange-400';
      case 'sad': return 'from-blue-400 to-indigo-400';
      case 'energetic': return 'from-red-400 to-pink-400';
      case 'calm': return 'from-green-400 to-emerald-400';
      case 'romantic': return 'from-pink-400 to-rose-400';
      case 'mysterious': return 'from-purple-400 to-indigo-400';
      default: return 'from-gray-400 to-slate-400';
    }
  };

  return (
    <div className={`bg-gradient-to-r ${getMoodColor(musicInfo.mood)} p-4 rounded-2xl shadow-lg text-white mb-4 animate-pulse-subtle`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Music className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium opacity-90">
            {characterName} 正在听音乐 {getMoodEmoji(musicInfo.mood)}
          </span>
        </div>
        <button
          onClick={onStop}
          className="w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
          title="停止播放"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="mb-3">
        <h4 className="font-semibold text-lg truncate">{musicInfo.title}</h4>
        <p className="text-sm opacity-90 truncate">{musicInfo.artist}</p>
        {musicInfo.album && (
          <p className="text-xs opacity-75 truncate">{musicInfo.album}</p>
        )}
      </div>

      {/* 进度条 */}
      <div className="mb-2">
        <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-white/60 transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs opacity-75 mt-1">
          <span>
            {playbackState ? formatTime(playbackState.currentTime) : '0:00'}
          </span>
          <span>
            {formatTime(musicInfo.duration || 180)}
          </span>
        </div>
      </div>

      {/* 播放状态指示 */}
      <div className="flex items-center justify-center gap-2">
        <Volume2 className="w-4 h-4 opacity-75" />
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-1 h-4 bg-white/60 rounded-full animate-bounce`}
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
        <span className="text-xs opacity-75 ml-2">
          {playbackState?.isPlaying ? '正在播放' : '已暂停'}
        </span>
      </div>

      {/* 音乐信息 */}
      <div className="mt-3 pt-3 border-t border-white/20">
        <div className="flex items-center justify-between text-xs opacity-75">
          {musicInfo.genre && (
            <span className="bg-white/20 px-2 py-1 rounded-full">
              {musicInfo.genre}
            </span>
          )}
          {musicInfo.releaseYear && (
            <span>{musicInfo.releaseYear}年</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MusicPlayingWidget;
