/**
 * 音频播放服务 - 处理实际音频播放
 */

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

export class AudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private onStateChange?: (state: AudioPlayerState) => void;

  constructor(onStateChange?: (state: AudioPlayerState) => void) {
    this.onStateChange = onStateChange;
  }

  /**
   * 加载音频文件
   */
  async loadAudio(audioUrl: string): Promise<void> {
    try {
      if (this.audio) {
        this.audio.pause();
        this.audio = null;
      }

      this.audio = new Audio(audioUrl);
      
      // 设置事件监听器
      this.audio.addEventListener('loadedmetadata', () => {
        this.notifyStateChange();
      });

      this.audio.addEventListener('timeupdate', () => {
        this.notifyStateChange();
      });

      this.audio.addEventListener('ended', () => {
        this.notifyStateChange();
      });

      this.audio.addEventListener('error', (e) => {
        console.error('音频加载失败:', e);
      });

      // 加载音频
      this.audio.load();
    } catch (error) {
      console.error('音频初始化失败:', error);
      throw error;
    }
  }

  /**
   * 播放音频
   */
  async play(): Promise<void> {
    if (!this.audio) return;
    
    try {
      await this.audio.play();
      this.notifyStateChange();
    } catch (error) {
      console.error('播放失败:', error);
      throw error;
    }
  }

  /**
   * 暂停音频
   */
  pause(): void {
    if (!this.audio) return;
    
    this.audio.pause();
    this.notifyStateChange();
  }

  /**
   * 停止音频
   */
  stop(): void {
    if (!this.audio) return;
    
    this.audio.pause();
    this.audio.currentTime = 0;
    this.notifyStateChange();
  }

  /**
   * 设置音量 (0-1)
   */
  setVolume(volume: number): void {
    if (!this.audio) return;
    
    this.audio.volume = Math.max(0, Math.min(1, volume));
    this.notifyStateChange();
  }

  /**
   * 跳转到指定时间
   */
  seekTo(time: number): void {
    if (!this.audio) return;
    
    this.audio.currentTime = time;
    this.notifyStateChange();
  }

  /**
   * 获取当前状态
   */
  getState(): AudioPlayerState {
    if (!this.audio) {
      return {
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: 1
      };
    }

    return {
      isPlaying: !this.audio.paused,
      currentTime: this.audio.currentTime,
      duration: this.audio.duration || 0,
      volume: this.audio.volume
    };
  }

  /**
   * 销毁播放器
   */
  destroy(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  }
}

/**
 * 全局音频播放器实例
 */
export const globalAudioPlayer = new AudioPlayer();

/**
 * 尝试获取音乐的音频URL
 * 注意：由于版权限制，大多数音乐平台不提供直接的音频URL
 * 这里提供一些可能的音频源
 */
export function getMusicAudioUrl(musicTitle: string, artist: string): string | null {
  // 🎵 方案1: 使用免费音乐库 (暂时注释，需要API密钥)
  // const freeMusicSources = [
  //   `https://api.jamendo.com/v3.0/tracks/?client_id=your_client_id&format=jsonpretty&limit=1&search=${encodeURIComponent(musicTitle + ' ' + artist)}`,
  // ];

  // 🎵 方案2: 使用示例音频文件
  console.log(`获取音频URL: ${musicTitle} - ${artist}`);
  
  // 暂时返回免费音效示例
  return 'https://www.soundjay.com/misc/sounds-808.wav';
}

/**
 * 创建示例音频文件的工具函数
 * 生成一个简单的音调，用于演示
 */
export function createSampleAudio(frequency: number = 440, duration: number = 3): string {
  // 创建AudioContext
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // 创建振荡器
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  
  // 音量渐变
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
  gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + duration - 0.1);
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
  
  return `Generated audio: ${frequency}Hz for ${duration}s`;
}
