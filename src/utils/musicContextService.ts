/**
 * 音乐上下文服务 - AI实时感知音乐播放状态
 * 让AI像真人一样知道当前播放的音乐、歌词进度等信息
 */

import { MusicMessage, LyricsLine } from '../types';
import { AudioPlayerState } from './audioPlayer';

export interface MusicContext {
  currentMusic: MusicMessage | null;
  playbackState: AudioPlayerState | null;
  currentLyric: LyricsLine | null;
  nextLyric: LyricsLine | null;
  lyricProgress: number; // 0-1，当前歌词的播放进度
  isPlaying: boolean;
}

export class MusicContextService {
  private static instance: MusicContextService;
  private context: MusicContext = {
    currentMusic: null,
    playbackState: null,
    currentLyric: null,
    nextLyric: null,
    lyricProgress: 0,
    isPlaying: false
  };

  private listeners: ((context: MusicContext) => void)[] = [];

  static getInstance(): MusicContextService {
    if (!MusicContextService.instance) {
      MusicContextService.instance = new MusicContextService();
    }
    return MusicContextService.instance;
  }

  /**
   * 更新当前音乐信息
   */
  updateCurrentMusic(music: MusicMessage | null): void {
    this.context.currentMusic = music;
    if (music) {
      console.log('🎵 AI现在知道正在播放:', music.title, '-', music.artist);
    } else {
      console.log('🎵 AI知道音乐已停止');
    }
    this.notifyListeners();
  }

  /**
   * 更新播放状态
   */
  updatePlaybackState(state: AudioPlayerState): void {
    this.context.playbackState = state;
    this.context.isPlaying = state.isPlaying;
    
    // 根据播放时间更新当前歌词
    this.updateCurrentLyric(state.currentTime);
    this.notifyListeners();
  }

  /**
   * 根据播放时间更新当前歌词
   */
  private updateCurrentLyric(currentTime: number): void {
    if (!this.context.currentMusic?.lyricsWithTime) return;

    const lyrics = this.context.currentMusic.lyricsWithTime;
    let currentLyric: LyricsLine | null = null;
    let nextLyric: LyricsLine | null = null;
    let lyricProgress = 0;

    // 找到当前时间对应的歌词
    for (let i = 0; i < lyrics.length; i++) {
      const lyric = lyrics[i];
      const nextLyricItem = lyrics[i + 1];

      if (currentTime >= lyric.time && (!nextLyricItem || currentTime < nextLyricItem.time)) {
        currentLyric = lyric;
        nextLyric = nextLyricItem || null;
        
        // 计算当前歌词的播放进度
        if (nextLyricItem) {
          const duration = nextLyricItem.time - lyric.time;
          const elapsed = currentTime - lyric.time;
          lyricProgress = Math.min(1, elapsed / duration);
        } else {
          lyricProgress = 1;
        }
        break;
      }
    }

    this.context.currentLyric = currentLyric;
    this.context.nextLyric = nextLyric;
    this.context.lyricProgress = lyricProgress;
  }

  /**
   * 获取当前音乐上下文
   */
  getCurrentContext(): MusicContext {
    return { ...this.context };
  }

  /**
   * 生成AI对话的音乐上下文信息
   */
  generateAIContextPrompt(): string {
    const ctx = this.context;
    
    if (!ctx.currentMusic || !ctx.isPlaying) {
      return '';
    }

    const music = ctx.currentMusic;
    let prompt = `\n【当前音乐状态】\n`;
    prompt += `正在播放: ${music.title} - ${music.artist}\n`;
    
    if (music.album) {
      prompt += `专辑: ${music.album}\n`;
    }
    
    if (music.genre) {
      prompt += `曲风: ${music.genre}\n`;
    }
    
    if (music.mood) {
      prompt += `情绪: ${music.mood}\n`;
    }

    if (ctx.playbackState) {
      const currentTime = Math.floor(ctx.playbackState.currentTime);
      const duration = Math.floor(ctx.playbackState.duration);
      prompt += `播放进度: ${this.formatTime(currentTime)}/${this.formatTime(duration)}\n`;
    }

    // 当前歌词
    if (ctx.currentLyric) {
      prompt += `当前歌词: "${ctx.currentLyric.text}"\n`;
      
      if (ctx.nextLyric) {
        prompt += `下一句: "${ctx.nextLyric.text}"\n`;
      }
    }

    // 完整歌词（如果有）
    if (music.lyrics) {
      prompt += `\n完整歌词:\n${music.lyrics}\n`;
    }

    prompt += `\n【对话指导】\n`;
    prompt += `- 你正在和用户一起听这首歌\n`;
    prompt += `- 可以自然地讨论歌词、歌手、曲风等\n`;
    prompt += `- 如果用户提到歌词，你知道现在播放到哪一句\n`;
    prompt += `- 像真人朋友一样分享对音乐的感受\n`;

    return prompt;
  }

  /**
   * 添加上下文变化监听器
   */
  addListener(listener: (context: MusicContext) => void): void {
    this.listeners.push(listener);
  }

  /**
   * 移除监听器
   */
  removeListener(listener: (context: MusicContext) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.context);
      } catch (error) {
        console.error('音乐上下文监听器错误:', error);
      }
    });
  }

  /**
   * 格式化时间显示
   */
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * 清除当前上下文
   */
  clear(): void {
    this.context = {
      currentMusic: null,
      playbackState: null,
      currentLyric: null,
      nextLyric: null,
      lyricProgress: 0,
      isPlaying: false
    };
    this.notifyListeners();
  }
}

/**
 * 全局音乐上下文服务实例
 */
export const musicContextService = MusicContextService.getInstance();

/**
 * 示例歌词数据 - 用于测试
 */
export const sampleLyricsWithTime: Record<string, LyricsLine[]> = {
  '发如雪': [
    { time: 0, text: '狼牙月 伊人憔悴' },
    { time: 4, text: '我举杯 饮尽了风雪' },
    { time: 8, text: '是谁打翻前世柜' },
    { time: 12, text: '惹尘埃是非' },
    { time: 16, text: '缘字诀 几番轮回' },
    { time: 20, text: '你锁眉 哭红颜唤不回' },
    { time: 24, text: '纵然青史已成灰' },
    { time: 28, text: '我爱不灭' },
    { time: 32, text: '繁华如三千东流水' },
    { time: 36, text: '我只取一瓢爱了解' },
    { time: 40, text: '只恋你化身的蝶' },
    { time: 48, text: '你发如雪 凄美了离别' },
    { time: 52, text: '我焚香感动了谁' },
    { time: 56, text: '邀明月 让回忆皎洁' },
    { time: 60, text: '爱在月光下完美' }
  ],
  'Forever&Ever': [
    { time: 0, text: 'I love you forever and ever' },
    { time: 4, text: 'You are the one I adore' },
    { time: 8, text: 'Forever and ever my love will be true' },
    { time: 12, text: 'I give my heart just to you' }
  ],
  '爱情': [
    { time: 0, text: '当爱情遗落成遗迹' },
    { time: 4, text: '用象形文字刻划爱你' },
    { time: 8, text: '纪念我们爱情逝去' },
    { time: 12, text: '万年后你是否还记起' },
    { time: 16, text: '爱情不是你想买' },
    { time: 20, text: '想买就能买' },
    { time: 24, text: '让我挣脱开 让我明白' },
    { time: 28, text: '放手你的爱' }
  ]
};
