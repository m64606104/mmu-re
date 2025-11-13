/**
 * 真实音乐服务 - 提供可播放的音乐搜索和播放功能
 * 不自动触发AI回复，支持多个免费音乐API
 */

export interface RealMusicInfo {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  genre?: string;
  releaseYear?: number;
  audioUrl?: string;
  previewUrl?: string;
  coverUrl?: string;
  source: 'jamendo' | 'freemusicarchive' | 'audiomack' | 'youtube' | 'local';
  playable: boolean;
}

export class RealMusicService {
  private static instance: RealMusicService;

  static getInstance(): RealMusicService {
    if (!RealMusicService.instance) {
      RealMusicService.instance = new RealMusicService();
    }
    return RealMusicService.instance;
  }

  /**
   * 搜索真实可播放的音乐
   * 使用多个免费音乐平台API
   */
  async searchPlayableMusic(query: string): Promise<RealMusicInfo[]> {
    console.log('🎵 搜索可播放音乐:', query);
    
    const results: RealMusicInfo[] = [];
    
    // 并发调用多个API
    const searchPromises = [
      this.searchJamendo(query),
      this.searchFreeMusicArchive(query),
      this.searchAudiomack(query),
      this.searchLocal(query)
    ];

    const apiResults = await Promise.allSettled(searchPromises);
    
    apiResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(...result.value);
        console.log(`✅ API ${index + 1} 返回 ${result.value.length} 个结果`);
      } else {
        console.log(`❌ API ${index + 1} 搜索失败:`, result.reason);
      }
    });

    // 去重并按可播放性排序
    const uniqueResults = this.deduplicateResults(results);
    return uniqueResults.sort((a, b) => {
      if (a.playable && !b.playable) return -1;
      if (!a.playable && b.playable) return 1;
      return 0;
    });
  }

  /**
   * Jamendo API - 免费音乐平台
   * https://developer.jamendo.com/v3.0
   */
  private async searchJamendo(query: string): Promise<RealMusicInfo[]> {
    try {
      // Jamendo 提供免费的CC授权音乐
      // const clientId = 'YOUR_JAMENDO_CLIENT_ID'; // 可选：注册获取专用ID
      const publicClientId = '56d30c95'; // 公共测试用的ID
      
      const response = await fetch(
        `https://api.jamendo.com/v3.0/tracks/?client_id=${publicClientId}&format=json&limit=10&search=${encodeURIComponent(query)}&include=musicinfo`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      return (data.results || []).map((track: any): RealMusicInfo => ({
        id: `jamendo_${track.id}`,
        title: track.name,
        artist: track.artist_name,
        album: track.album_name,
        duration: track.duration,
        audioUrl: track.audio, // 直接可用的音频URL
        previewUrl: track.audiodownload, // 下载链接
        coverUrl: track.album_image,
        source: 'jamendo',
        playable: true,
        genre: track.musicinfo?.tags?.genres?.[0]?.name
      }));
    } catch (error) {
      console.error('Jamendo搜索失败:', error);
      return [];
    }
  }

  /**
   * Free Music Archive API
   * https://freemusicarchive.org/api
   */
  private async searchFreeMusicArchive(query: string): Promise<RealMusicInfo[]> {
    try {
      // FMA 提供高质量免费音乐
      const response = await fetch(
        `https://freemusicarchive.org/api/get/tracks.json?api_key=60BLHNQCAOUFPIBZ&limit=10&search=${encodeURIComponent(query)}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      return (data.dataset || []).map((track: any): RealMusicInfo => ({
        id: `fma_${track.track_id}`,
        title: track.track_title,
        artist: track.artist_name,
        album: track.album_title,
        duration: parseInt(track.track_duration),
        audioUrl: track.track_url, // 音频文件URL
        coverUrl: track.album_image_file,
        source: 'freemusicarchive',
        playable: !!track.track_url,
        genre: track.track_genres?.[0]?.genre_title
      }));
    } catch (error) {
      console.error('Free Music Archive搜索失败:', error);
      return [];
    }
  }

  /**
   * Audiomack API (免费音乐流媒体)
   */
  private async searchAudiomack(query: string): Promise<RealMusicInfo[]> {
    try {
      // Audiomack 的公共搜索接口
      const response = await fetch(
        `https://api.audiomack.com/v1/search/songs?q=${encodeURIComponent(query)}&limit=10`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      return (data.results || []).map((track: any): RealMusicInfo => ({
        id: `audiomack_${track.id}`,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
        previewUrl: track.preview_url, // 预览URL
        coverUrl: track.image,
        source: 'audiomack',
        playable: !!track.preview_url,
        genre: track.genre
      }));
    } catch (error) {
      console.error('Audiomack搜索失败:', error);
      return [];
    }
  }

  /**
   * 本地音乐搜索（演示数据）
   */
  private async searchLocal(query: string): Promise<RealMusicInfo[]> {
    // 模拟本地音乐库，包含一些测试用的音乐
    const localMusic: RealMusicInfo[] = [
      {
        id: 'local_1',
        title: 'Sample Happy Song',
        artist: 'Demo Artist',
        album: 'Demo Album',
        duration: 180,
        audioUrl: await this.generateSampleAudio('happy'),
        source: 'local',
        playable: true,
        genre: 'Demo'
      },
      {
        id: 'local_2',
        title: 'Sample Calm Music',
        artist: 'Demo Artist',
        album: 'Demo Album',
        duration: 200,
        audioUrl: await this.generateSampleAudio('calm'),
        source: 'local',
        playable: true,
        genre: 'Ambient'
      }
    ];

    return localMusic.filter(music =>
      music.title.toLowerCase().includes(query.toLowerCase()) ||
      music.artist.toLowerCase().includes(query.toLowerCase())
    );
  }

  /**
   * 生成示例音频（Web Audio API）
   */
  private async generateSampleAudio(mood: string): Promise<string> {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const duration = 30; // 30秒示例
      const sampleRate = audioContext.sampleRate;
      const buffer = audioContext.createBuffer(2, sampleRate * duration, sampleRate);

      // 根据情绪选择频率
      const frequencies = mood === 'happy' ? [261.63, 329.63, 392.00] : [174.61, 220.00, 261.63];
      
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        
        for (let i = 0; i < buffer.length; i++) {
          let sample = 0;
          const time = i / sampleRate;
          
          frequencies.forEach((freq, index) => {
            const volume = 0.1 / (index + 1);
            sample += Math.sin(2 * Math.PI * freq * time) * volume;
          });
          
          // 添加包络
          const envelope = Math.min(1, time * 2) * Math.min(1, (duration - time) / 2);
          channelData[i] = sample * envelope;
        }
      }

      // 转换为Blob URL
      return this.audioBufferToBlob(buffer);
    } catch (error) {
      console.error('生成示例音频失败:', error);
      return '';
    }
  }

  /**
   * AudioBuffer 转 Blob URL
   */
  private async audioBufferToBlob(buffer: AudioBuffer): Promise<string> {
    const offlineContext = new OfflineAudioContext(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );
    
    const source = offlineContext.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineContext.destination);
    source.start(0);
    
    const renderedBuffer = await offlineContext.startRendering();
    const wavBlob = this.audioBufferToWav(renderedBuffer);
    return URL.createObjectURL(wavBlob);
  }

  /**
   * AudioBuffer 转 WAV
   */
  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = buffer.getChannelData(channel)[i];
        const intSample = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  /**
   * 去重处理
   */
  private deduplicateResults(results: RealMusicInfo[]): RealMusicInfo[] {
    const seen = new Set();
    return results.filter(music => {
      const key = `${music.title.toLowerCase()}_${music.artist.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 验证音频URL是否可播放
   */
  async validateAudioUrl(url: string): Promise<boolean> {
    try {
      const audio = new Audio();
      return new Promise((resolve) => {
        audio.oncanplay = () => resolve(true);
        audio.onerror = () => resolve(false);
        audio.src = url;
      });
    } catch {
      return false;
    }
  }

  /**
   * 获取音频元数据
   */
  async getAudioMetadata(url: string): Promise<{ duration: number } | null> {
    try {
      const audio = new Audio();
      return new Promise((resolve) => {
        audio.onloadedmetadata = () => {
          resolve({ duration: audio.duration });
        };
        audio.onerror = () => resolve(null);
        audio.src = url;
      });
    } catch {
      return null;
    }
  }
}

export const realMusicService = RealMusicService.getInstance();
