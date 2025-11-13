/**
 * 快速音乐卡片 - 解决音乐播放慢的问题
 * 提供即时音频生成和快速反应
 */

import React, { useState, useEffect, useRef } from 'react';
import { Music, Play, Pause, Volume2, Download, Heart } from 'lucide-react';
import { EnhancedMusicInfo, enhancedMusicService } from '../utils/enhancedMusicService';

interface QuickMusicCardProps {
  music: EnhancedMusicInfo;
  onReaction?: (reaction: string) => void;
  className?: string;
  autoPlay?: boolean;
}

const QuickMusicCard: React.FC<QuickMusicCardProps> = ({
  music,
  onReaction,
  className = '',
  autoPlay = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [liked, setLiked] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  // 初始化音频
  useEffect(() => {
    const initAudio = async () => {
      if (!music.audioUrl && !audioReady) {
        setIsLoading(true);
        try {
          // 快速生成音频
          const audioUrl = await enhancedMusicService.generateQuickAudio(
            music.mood || 'happy', 
            music.duration || 30
          );
          
          if (audioUrl) {
            music.audioUrl = audioUrl;
            loadAudio(audioUrl);
          }
        } catch (error) {
          console.error('生成音频失败:', error);
        } finally {
          setIsLoading(false);
        }
      } else if (music.audioUrl) {
        loadAudio(music.audioUrl);
      }
    };

    initAudio();
  }, [music, audioReady]);

  const loadAudio = (url: string) => {
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.addEventListener('ended', handleEnded);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setAudioReady(true);
      
      if (autoPlay) {
        handlePlay();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    
    // 播放结束反应
    if (onReaction) {
      const reaction = enhancedMusicService.generateQuickReaction(music, 'end');
      setTimeout(() => onReaction(reaction), 500);
    }
  };

  const handlePlay = async () => {
    if (!audioRef.current || !audioReady) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
        
        // 立即播放反应（无延迟）
        if (onReaction) {
          const reaction = enhancedMusicService.generateQuickReaction(music, 'start');
          onReaction(reaction);
          
          // 播放中途反应
          setTimeout(() => {
            if (isPlaying) {
              const playingReaction = enhancedMusicService.generateQuickReaction(music, 'playing');
              onReaction(playingReaction);
            }
          }, 8000);
        }
      }
    } catch (error) {
      console.error('播放失败:', error);
    }
  };

  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMoodColor = (): string => {
    switch (music.mood) {
      case 'happy': return 'from-yellow-400 to-orange-400';
      case 'sad': return 'from-blue-400 to-indigo-400';
      case 'energetic': return 'from-red-400 to-pink-400';
      case 'calm': return 'from-green-400 to-emerald-400';
      case 'romantic': return 'from-pink-400 to-rose-400';
      case 'mysterious': return 'from-purple-400 to-indigo-400';
      default: return 'from-gray-400 to-slate-400';
    }
  };

  const getMoodEmoji = (): string => {
    switch (music.mood) {
      case 'happy': return '😊';
      case 'sad': return '😢';
      case 'energetic': return '🔥';
      case 'calm': return '😌';
      case 'romantic': return '💕';
      case 'mysterious': return '🌙';
      default: return '🎵';
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`bg-gradient-to-br ${getMoodColor()} rounded-2xl shadow-xl text-white overflow-hidden max-w-sm ${className}`}>
      {/* 隐藏的音频元素 */}
      <audio ref={audioRef} preload="metadata" />
      
      {/* 头部信息 */}
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            <span className="text-sm opacity-90">正在播放</span>
            <span className="text-lg">{getMoodEmoji()}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLiked(!liked)}
              className={`p-1 rounded-full transition-colors ${
                liked ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
            </button>
            
            {music.audioUrl && (
              <a
                href={music.audioUrl}
                download={`${music.title} - ${music.artist}.wav`}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                title="下载音频"
              >
                <Download className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 音乐信息 */}
      <div className="px-4 pb-3">
        <h3 className="font-bold text-lg truncate">{music.title}</h3>
        <p className="text-sm opacity-90 truncate">{music.artist}</p>
        {music.album && (
          <p className="text-xs opacity-75 truncate mt-1">{music.album}</p>
        )}
      </div>

      {/* 播放控制 */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-center mb-3">
          <button
            onClick={handlePlay}
            disabled={isLoading || !audioReady}
            className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-0.5" />
            )}
          </button>
        </div>

        {/* 进度条 */}
        <div 
          ref={progressRef}
          className="w-full bg-white/20 rounded-full h-2 mb-2 cursor-pointer"
          onClick={handleProgressClick}
        >
          <div 
            className="h-full bg-white/80 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* 时间显示 */}
        <div className="flex justify-between items-center text-xs opacity-75">
          <span>{formatTime(currentTime)}</span>
          <div className="flex items-center gap-1">
            <Volume2 className="w-3 h-3" />
            {isPlaying && (
              <div className="flex gap-px">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-0.5 h-3 bg-white/60 rounded-full animate-pulse"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            )}
          </div>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* 底部信息 */}
      <div className="px-4 pb-4 pt-2 border-t border-white/10">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {music.genre && (
              <span className="bg-white/20 px-2 py-1 rounded-full">
                {music.genre}
              </span>
            )}
            {music.releaseYear && (
              <span className="opacity-75">{music.releaseYear}年</span>
            )}
          </div>
          
          <div className="flex items-center gap-1 opacity-75">
            <span>来源:</span>
            <span className="capitalize">{music.source}</span>
          </div>
        </div>
      </div>

      {/* 状态指示 */}
      {isPlaying && (
        <div className="absolute top-2 right-2">
          <div className="flex items-center gap-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-1 h-4 bg-white/60 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickMusicCard;
