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
  source: 'jamendo' | 'freemusicarchive' | 'audiomack' | 'youtube' | 'local' | 'itunes';
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
      this.searchiTunes(query),
      this.searchLocal(query)
      // 已禁用的API:
      // this.searchFreeMusicArchive(query),
      // this.searchAudiomack(query),
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
      // 使用更新的Jamendo API端点和参数
      const clientId = '56d30c95'; // 公共客户端ID
      
      const response = await fetch(
        `https://api.jamendo.com/v3.0/tracks/?client_id=${clientId}&format=json&limit=10&search=${encodeURIComponent(query)}&include=musicinfo&audioformat=mp32`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        }
      );
      
      if (!response.ok) {
        console.warn(`Jamendo API响应 ${response.status}: ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      console.log('Jamendo API响应:', data);
      
      if (!data.results || data.results.length === 0) {
        console.log('Jamendo: 没有找到结果');
        return [];
      }
      
      return data.results.map((track: any): RealMusicInfo => ({
        id: `jamendo_${track.id}`,
        title: track.name || '未知标题',
        artist: track.artist_name || '未知艺术家',
        album: track.album_name,
        duration: parseInt(track.duration) || 0,
        audioUrl: track.audio || track.audiodownload, // 使用可用的音频URL
        previewUrl: track.audiodownload,
        coverUrl: track.album_image || track.image,
        source: 'jamendo',
        playable: !!(track.audio || track.audiodownload),
        genre: track.musicinfo?.tags?.genres?.[0]?.name
      }));
    } catch (error) {
      console.error('Jamendo搜索失败:', error);
      return [];
    }
  }


  /**
   * iTunes Search API - 免费且可靠的音乐搜索
   * https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
   */
  private async searchiTunes(query: string): Promise<RealMusicInfo[]> {
    try {
      console.log('🍎 搜索iTunes音乐库:', query);
      
      const response = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=15&country=CN`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        }
      );
      
      if (!response.ok) {
        console.warn(`iTunes API响应 ${response.status}: ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      console.log('iTunes API响应:', data);
      
      if (!data.results || data.results.length === 0) {
        console.log('iTunes: 没有找到结果');
        return [];
      }
      
      return data.results.map((track: any): RealMusicInfo => ({
        id: `itunes_${track.trackId}`,
        title: track.trackName || '未知标题',
        artist: track.artistName || '未知艺术家',
        album: track.collectionName,
        duration: Math.round((track.trackTimeMillis || 0) / 1000),
        previewUrl: track.previewUrl, // iTunes提供30秒预览
        audioUrl: track.previewUrl, // 使用预览作为播放源
        coverUrl: track.artworkUrl100?.replace('100x100', '300x300'), // 高分辨率封面
        source: 'youtube', // 标记为外部源
        playable: !!track.previewUrl,
        genre: track.primaryGenreName,
        releaseYear: track.releaseDate ? new Date(track.releaseDate).getFullYear() : undefined
      }));
    } catch (error) {
      console.error('iTunes搜索失败:', error);
      return [];
    }
  }

  /**
   * 本地音乐搜索（演示数据）
   */
  private async searchLocal(query: string): Promise<RealMusicInfo[]> {
    console.log(`🎵 搜索本地演示音乐: ${query}`);
    
    // 模拟本地音乐库，包含更多测试用的音乐
    const localMusicData = [
      { id: 'local_1', title: 'Happy Melody', artist: 'Demo Artist', mood: 'happy', genre: 'Pop', duration: 180 },
      { id: 'local_2', title: 'Calm Waters', artist: 'Ambient Master', mood: 'calm', genre: 'Ambient', duration: 240 },
      { id: 'local_3', title: 'Upbeat Rhythm', artist: 'Energy Band', mood: 'energetic', genre: 'Electronic', duration: 200 },
      { id: 'local_4', title: 'Peaceful Night', artist: 'Relax Studio', mood: 'peaceful', genre: 'Chill', duration: 300 },
      { id: 'local_5', title: 'Morning Coffee', artist: 'Cafe Sounds', mood: 'morning', genre: 'Jazz', duration: 220 },
      { id: 'local_6', title: 'Focus Flow', artist: 'Study Music', mood: 'focus', genre: 'Instrumental', duration: 360 }
    ];

    // 根据查询筛选
    const filtered = localMusicData.filter(music =>
      music.title.toLowerCase().includes(query.toLowerCase()) ||
      music.artist.toLowerCase().includes(query.toLowerCase()) ||
      music.genre.toLowerCase().includes(query.toLowerCase()) ||
      music.mood.toLowerCase().includes(query.toLowerCase())
    );

    // 如果没有匹配，返回前3个作为默认建议
    const musicList = filtered.length > 0 ? filtered : localMusicData.slice(0, 3);

    // 生成音频URL（异步生成可能会影响性能，这里使用预设URL）
    const localMusic: RealMusicInfo[] = await Promise.all(
      musicList.map(async (music) => ({
        id: music.id,
        title: music.title,
        artist: music.artist,
        album: 'Demo Collection',
        duration: music.duration,
        audioUrl: await this.generateSampleAudio(music.mood),
        source: 'local' as const,
        playable: true,
        genre: music.genre,
        coverUrl: this.generateCoverUrl(music.mood)
      }))
    );

    console.log(`✅ 本地音乐搜索完成，返回${localMusic.length}个结果`);
    return localMusic;
  }

  /**
   * 生成封面图URL
   */
  private generateCoverUrl(mood: string): string {
    const colors = {
      happy: '4F46E5',      // 蓝紫色
      calm: '10B981',       // 绿色
      energetic: 'F59E0B',  // 橙色
      peaceful: '8B5CF6',   // 紫色
      morning: 'F97316',    // 橙红色
      focus: '6B7280'       // 灰色
    };
    
    const color = colors[mood as keyof typeof colors] || '6B7280';
    return `https://via.placeholder.com/300x300/${color}/FFFFFF?text=${encodeURIComponent(mood.toUpperCase())}`;
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
