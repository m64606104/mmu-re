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
  audioUrl?: string;      // 完整音频URL，用于分享到聊天
  previewUrl?: string;    // 30秒预览URL，用于搜索时试听
  coverUrl?: string;
  source: 'jamendo' | 'freemusicarchive' | 'audiomack' | 'youtube' | 'local' | 'itunes' | 'url';
  playable: boolean;
  isFullVersion?: boolean;  // 标识是否为完整版本
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
      
      // 过滤和验证Jamendo结果，确保有可用音频
      const validTracks = data.results.filter((track: any) => {
        const audioUrl = track.audio || track.audiodownload;
        return audioUrl && 
               (audioUrl.startsWith('https://') || audioUrl.startsWith('http://')) &&
               (audioUrl.includes('.mp3') || audioUrl.includes('.ogg'));
      });

      console.log(`Jamendo API: ${data.results.length} 总结果, ${validTracks.length} 有效音频`);

      return validTracks.map((track: any): RealMusicInfo => ({
        id: `jamendo_${track.id}`,
        title: track.name || '未知标题',
        artist: track.artist_name || '未知艺术家',
        album: track.album_name,
        duration: parseInt(track.duration) || 0,
        audioUrl: track.audio || track.audiodownload,
        previewUrl: track.audio || track.audiodownload, // Jamendo音频通常是完整的
        coverUrl: track.album_image || track.image,
        source: 'jamendo',
        playable: true, // 已过滤，确保可播放
        isFullVersion: true,
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
      
      // 过滤掉没有预览URL的结果，并验证URL格式
      const validTracks = data.results.filter((track: any) => {
        return track.previewUrl && 
               track.previewUrl.startsWith('https://') &&
               track.previewUrl.includes('.m4a');
      });

      console.log(`iTunes API: ${data.results.length} 总结果, ${validTracks.length} 有效音频`);

      return validTracks.map((track: any): RealMusicInfo => ({
        id: `itunes_${track.trackId}`,
        title: track.trackName || '未知标题',
        artist: track.artistName || '未知艺术家',
        album: track.collectionName,
        duration: Math.round((track.trackTimeMillis || 0) / 1000),
        previewUrl: track.previewUrl,
        audioUrl: track.previewUrl, // iTunes的M4A预览通常可以直接播放
        coverUrl: track.artworkUrl100?.replace('100x100', '300x300'),
        source: 'itunes',
        playable: true, // 已过滤，确保可播放
        isFullVersion: false,
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
        isFullVersion: true, // 本地音乐都是完整版
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
   * 生成示例音频（改进版 - 确保真正可播放）
   */
  private async generateSampleAudio(mood: string): Promise<string> {
    try {
      // 检查浏览器支持
      if (!(window.AudioContext || (window as any).webkitAudioContext)) {
        console.warn('浏览器不支持Web Audio API，使用预设音频');
        return this.getPresetAudioUrl(mood);
      }

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const duration = 15; // 缩短为15秒，提高生成速度
      const sampleRate = 44100; // 标准采样率
      const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate); // 单声道减少复杂度

      const channelData = buffer.getChannelData(0);
      
      // 生成更悦耳的音频 - 基于和弦
      const baseFreq = mood === 'happy' ? 523.25 : 261.63; // C5 or C4
      const chord = [1, 5/4, 3/2]; // 大三和弦
      
      for (let i = 0; i < buffer.length; i++) {
        const time = i / sampleRate;
        let sample = 0;
        
        // 生成和弦
        chord.forEach((ratio, index) => {
          const freq = baseFreq * ratio;
          const volume = 0.15 / (index + 1);
          sample += Math.sin(2 * Math.PI * freq * time) * volume;
        });
        
        // 添加淡入淡出包络
        let envelope = 1;
        if (time < 1) {
          envelope = time; // 1秒淡入
        } else if (time > duration - 1) {
          envelope = duration - time; // 1秒淡出
        }
        
        channelData[i] = sample * envelope * 0.5; // 降低音量避免失真
      }

      // 转换为WAV格式
      const wavBlob = this.audioBufferToWav(buffer);
      const audioUrl = URL.createObjectURL(wavBlob);
      
      // 验证生成的音频是否可播放
      const isPlayable = await this.validateGeneratedAudio(audioUrl);
      if (!isPlayable) {
        console.warn('生成的音频无法播放，使用预设音频');
        URL.revokeObjectURL(audioUrl);
        return this.getPresetAudioUrl(mood);
      }
      
      console.log(`✅ 成功生成${mood}音频: ${audioUrl}`);
      return audioUrl;
    } catch (error) {
      console.error('生成示例音频失败:', error);
      return this.getPresetAudioUrl(mood);
    }
  }

  /**
   * 验证生成的音频是否可播放
   */
  private async validateGeneratedAudio(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const audio = new Audio();
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      }, 3000);
      
      audio.addEventListener('canplaythrough', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(true);
        }
      });
      
      audio.addEventListener('error', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(false);
        }
      });
      
      try {
        audio.src = url;
        audio.load();
      } catch {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(false);
        }
      }
    });
  }

  /**
   * 获取预设音频URL作为备选方案 - 使用真正可播放的音频
   */
  private getPresetAudioUrl(mood: string): string {
    // 使用真正可用的公共音频文件
    const presetUrls: Record<string, string> = {
      'happy': 'https://sample-music.netlify.app/death%20bed.mp3',
      'calm': 'https://file-examples.com/storage/fe68e1b6c4c2b86d21640ac/2017/11/file_example_MP3_700KB.mp3',
      'energetic': 'https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3',
      'peaceful': 'https://sample-music.netlify.app/Bazzi%20-%20Mine.mp3',
      'morning': 'https://sample-videos.com/zip/10/mp3/SampleAudio_0.4mb_mp3.mp3',
      'focus': 'https://file-examples.com/storage/fe68e1b6c4c2b86d21640ac/2017/11/file_example_MP3_1MG.mp3'
    };
    
    console.log(`🎵 使用预设音频 (${mood}):`, presetUrls[mood] || presetUrls['happy']);
    return presetUrls[mood] || presetUrls['happy'];
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
   * 验证音频URL是否可播放 - 参考DLC实现改进
   */
  async validateAudioUrl(url: string): Promise<boolean> {
    try {
      return new Promise((resolve) => {
        const audio = new Audio();
        let resolved = false;
        
        // 设置5秒超时
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(false);
          }
        }, 5000);
        
        audio.addEventListener('canplay', () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(true);
          }
        });
        
        audio.addEventListener('error', () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(false);
          }
        });
        
        // 参考DLC设置方式
        audio.src = url;
        audio.preload = 'metadata';
        audio.load();
      });
    } catch {
      return false;
    }
  }

  /**
   * 获取音频测试报告 - 新增功能
   */
  async getMusicTestReport(): Promise<any> {
    console.log('🎵 开始音乐服务测试...');
    
    try {
      // 测试各个API的示例音频
      const testResults = await Promise.all([
        this.searchiTunes('test').then(results => ({
          api: 'iTunes',
          success: results.length > 0,
          count: results.length,
          sampleUrl: results[0]?.previewUrl || null
        })).catch(() => ({ api: 'iTunes', success: false, count: 0, sampleUrl: null })),
        
        this.searchJamendo('test').then(results => ({
          api: 'Jamendo', 
          success: results.length > 0,
          count: results.length,
          sampleUrl: results[0]?.audioUrl || null
        })).catch(() => ({ api: 'Jamendo', success: false, count: 0, sampleUrl: null })),
        
        this.searchLocal('test').then(results => ({
          api: 'Local',
          success: results.length > 0, 
          count: results.length,
          sampleUrl: results[0]?.audioUrl || null
        })).catch(() => ({ api: 'Local', success: false, count: 0, sampleUrl: null }))
      ]);
      
      console.log('🎵 音乐API测试结果:', testResults);
      return {
        timestamp: new Date().toISOString(),
        apis: testResults,
        summary: {
          working: testResults.filter(r => r.success).length,
          total: testResults.length,
          workingApis: testResults.filter(r => r.success).map(r => r.api)
        }
      };
    } catch (error) {
      console.error('🎵 音乐服务测试失败:', error);
      return { error: error instanceof Error ? error.message : '未知错误' };
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
