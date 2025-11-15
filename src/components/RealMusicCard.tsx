/**
 * 真实音乐卡片 - 支持真实音频播放，不自动触发AI回复
 * 用户需要手动点击"生成"按钮才会触发AI反应
 */

import React, { useState, useEffect, useRef } from 'react';
import { Music, Play, Pause, Volume2, Download, ExternalLink, Clock } from 'lucide-react';
import { RealMusicInfo } from '../utils/realMusicService';

interface RealMusicCardProps {
  music: RealMusicInfo;
  className?: string;
  showGenerateButton?: boolean;
  onGenerateAIResponse?: () => void;
}

const RealMusicCard: React.FC<RealMusicCardProps> = ({
  music,
  className = '',
  showGenerateButton = true,
  onGenerateAIResponse
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  // 初始化音频
  useEffect(() => {
    const initAudio = () => {
      if (music.audioUrl || music.previewUrl) {
        const audioUrl = music.audioUrl || music.previewUrl;
        if (audioUrl && audioRef.current) {
          setIsLoading(true);
          setError(null);
          
          audioRef.current.src = audioUrl;
          audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
          audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
          audioRef.current.addEventListener('ended', handleEnded);
          audioRef.current.addEventListener('error', handleAudioError);
        }
      } else {
        setError('无可用音频源');
      }
    };

    initAudio();
    
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.removeEventListener('ended', handleEnded);
        audioRef.current.removeEventListener('error', handleAudioError);
      }
    };
  }, [music]);

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setAudioReady(true);
      setIsLoading(false);
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
  };

  const handleAudioError = (e: Event) => {
    console.error('音频加载错误:', e);
    setError('音频加载失败');
    setIsLoading(false);
    setAudioReady(false);
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
      }
    } catch (error) {
      console.error('播放失败:', error);
      setError('播放失败，可能是网络问题');
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
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSourceIcon = () => {
    switch (music.source) {
      case 'jamendo': return '🎵';
      case 'freemusicarchive': return '🎼';
      case 'audiomack': return '🎧';
      case 'youtube': return '▶️';
      case 'local': return '💾';
      default: return '🎵';
    }
  };

  const getSourceColor = () => {
    switch (music.source) {
      case 'jamendo': return 'from-green-400 to-emerald-500';
      case 'freemusicarchive': return 'from-blue-400 to-indigo-500';
      case 'audiomack': return 'from-orange-400 to-red-500';
      case 'youtube': return 'from-red-400 to-pink-500';
      case 'local': return 'from-purple-400 to-violet-500';
      default: return 'from-gray-400 to-slate-500';
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`bg-gradient-to-br ${getSourceColor()} rounded-2xl shadow-xl text-white overflow-hidden max-w-sm ${className}`}>
      {/* 隐藏的音频元素 */}
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" />
      
      {/* 头部信息 */}
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            <span className="text-sm opacity-90">
              {music.playable ? '可播放音乐' : '仅信息'}
            </span>
            <span className="text-lg">{getSourceIcon()}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {music.audioUrl && (
              <a
                href={music.audioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                title="打开原始链接"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            
            {music.audioUrl && (
              <a
                href={music.audioUrl}
                download={`${music.title} - ${music.artist}`}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                title="下载音频"
              >
                <Download className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 封面和音乐信息 */}
      <div className="px-4 pb-3">
        <div className="flex items-start gap-3">
          {/* 封面图片 */}
          <div className="flex-shrink-0">
            {music.coverUrl ? (
              <img
                src={music.coverUrl}
                alt={`${music.title} - ${music.artist}`}
                className="w-16 h-16 rounded-lg object-cover bg-white/10"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-white/10 flex items-center justify-center">
                <Music className="w-8 h-8 text-white/60" />
              </div>
            )}
          </div>
          
          {/* 音乐信息 */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg truncate leading-tight">{music.title}</h3>
            <p className="text-sm opacity-90 truncate">{music.artist}</p>
            {music.album && (
              <p className="text-xs opacity-75 truncate mt-1">{music.album}</p>
            )}
            
            {/* 时长和流派 */}
            <div className="flex items-center gap-2 mt-2 text-xs opacity-75">
              {music.duration && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(music.duration)}</span>
                </div>
              )}
              {music.genre && (
                <span className="bg-white/20 px-2 py-0.5 rounded-full">
                  {music.genre}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 播放控制 */}
      {music.playable && (
        <div className="px-4 pb-3">
          {error ? (
            <div className="text-center py-2">
              <p className="text-sm opacity-75">❌ {error}</p>
            </div>
          ) : (
            <>
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

              {/* 时间显示和音量指示 */}
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
            </>
          )}
        </div>
      )}

      {/* AI生成按钮 */}
      {showGenerateButton && (
        <div className="px-4 pb-4 pt-2 border-t border-white/10">
          <button
            onClick={onGenerateAIResponse}
            className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors"
          >
            ✨ 让AI聊聊这首歌
          </button>
        </div>
      )}

      {/* 底部信息 */}
      <div className="px-4 pb-4 pt-2 border-t border-white/10">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 opacity-75">
            <span>来源:</span>
            <span className="capitalize">{music.source}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${music.playable ? 'bg-green-400' : 'bg-gray-400'}`} />
            <span className="opacity-75 text-xs">
              {music.playable ? '可播放' : '仅信息'}
            </span>
          </div>
        </div>
      </div>

      {/* 播放状态指示 */}
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

export default RealMusicCard;
