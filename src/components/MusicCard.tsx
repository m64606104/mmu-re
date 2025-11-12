/**
 * 音乐卡片组件 - 显示在聊天中的音乐分享卡片
 * 参考微信等聊天应用的音乐卡片设计
 */

import React, { useState, useRef, useEffect } from 'react';
import { Music, Play, Pause } from 'lucide-react';
import { MusicMessage } from '../types';
import { AudioPlayer, AudioPlayerState } from '../utils/audioPlayer';
import { generateAudioForMood } from '../utils/audioGenerator';

interface MusicCardProps {
  music: MusicMessage;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  showPlayButton?: boolean;
  className?: string;
  enableRealAudio?: boolean; // 🎵 启用真实音频播放
}

const MusicCard: React.FC<MusicCardProps> = ({
  music,
  isPlaying = false,
  onPlayPause,
  showPlayButton = false,
  className = '',
  enableRealAudio = false
}) => {
  const [audioState, setAudioState] = useState<AudioPlayerState>({ 
    isPlaying: false, 
    currentTime: 0, 
    duration: 0, 
    volume: 1 
  });
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  // 🎵 初始化音频播放器
  useEffect(() => {
    if (enableRealAudio) {
      audioPlayerRef.current = new AudioPlayer(setAudioState);
      
      // 异步加载音频
      const loadAudio = async () => {
        try {
          const audioUrl = await getAudioUrlForMusic(music);
          if (audioUrl && audioPlayerRef.current) {
            await audioPlayerRef.current.loadAudio(audioUrl);
          } else {
            setAudioError('暂无音频文件');
          }
        } catch (error) {
          console.error('加载音频失败:', error);
          setAudioError('无法播放此音乐');
        }
      };
      
      loadAudio();
    }

    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.destroy();
      }
    };
  }, [enableRealAudio, music]);

  // 🎵 处理播放/暂停
  const handleRealPlayPause = async () => {
    if (!audioPlayerRef.current) return;

    try {
      if (audioState.isPlaying) {
        audioPlayerRef.current.pause();
      } else {
        await audioPlayerRef.current.play();
      }
    } catch (error) {
      console.error('播放控制失败:', error);
      setAudioError('播放失败');
    }
  };

  // 🎵 获取音频URL
  const getAudioUrlForMusic = async (music: MusicMessage): Promise<string | null> => {
    // 方案1: 如果有直接的音频URL
    if ((music as any).audioUrl) {
      return (music as any).audioUrl;
    }
    
    // 方案2: 检查是否有audioFile（Blob URL）
    if ((music as any).audioFile) {
      return URL.createObjectURL((music as any).audioFile);
    }
    
    // 方案3: 使用Web Audio API生成示例音频
    try {
      return await generateAudioForMood(music.mood || 'happy');
    } catch (error) {
      console.warn('生成示例音频失败:', error);
      return null;
    }
  };

  // 🎵 最终的播放控制
  const finalPlayPause = enableRealAudio ? handleRealPlayPause : onPlayPause;
  const finalIsPlaying = enableRealAudio ? audioState.isPlaying : isPlaying;

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
              onClick={finalPlayPause}
              className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              title={enableRealAudio ? '点击播放实际音频' : '播放模拟'}
            >
              {finalIsPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white ml-0.5" />
              )}
              {audioError && enableRealAudio && (
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-red-400 bg-black/50 px-2 py-1 rounded whitespace-nowrap">
                  {audioError}
                </div>
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
