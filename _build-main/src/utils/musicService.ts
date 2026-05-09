/**
 * 音乐服务 - 获取音乐信息和模拟AI听音乐
 */

export interface MusicInfo {
  title: string;
  artist: string;
  album?: string;
  duration?: number; // 秒
  genre?: string;
  mood?: 'happy' | 'sad' | 'energetic' | 'calm' | 'romantic' | 'mysterious';
  tempo?: 'slow' | 'medium' | 'fast';
  lyrics?: string;
  releaseYear?: number;
}

export interface MusicPlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  musicInfo: MusicInfo;
  startTime: number;
}

/**
 * 免费音乐信息获取 - 使用多个免费API
 */
class MusicInfoService {
  
  /**
   * 通过iTunes Search API获取音乐信息
   */
  async searchByiTunes(query: string): Promise<MusicInfo[]> {
    try {
      const response = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=5`
      );
      const data = await response.json();
      
      return data.results.map((item: any) => ({
        title: item.trackName,
        artist: item.artistName,
        album: item.collectionName,
        duration: Math.floor(item.trackTimeMillis / 1000),
        genre: this.mapGenreToMood(item.primaryGenreName),
        releaseYear: new Date(item.releaseDate).getFullYear()
      }));
    } catch (error) {
      console.error('iTunes搜索失败:', error);
      return [];
    }
  }

  /**
   * 通过Last.fm API获取音乐信息 (需要免费API key)
   */
  async searchByLastFm(artist: string, track: string): Promise<MusicInfo | null> {
    try {
      // Last.fm 免费API - 需要注册获取API key
      const apiKey = 'YOUR_LASTFM_API_KEY'; // 需要替换
      const response = await fetch(
        `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${apiKey}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&format=json`
      );
      const data = await response.json();
      
      if (data.track) {
        return {
          title: data.track.name,
          artist: data.track.artist.name,
          album: data.track.album?.title,
          duration: parseInt(data.track.duration) || undefined,
          genre: data.track.toptags?.tag?.[0]?.name
        };
      }
    } catch (error) {
      console.error('Last.fm搜索失败:', error);
    }
    return null;
  }

  /**
   * 通过MusicBrainz API获取音乐信息 (完全免费)
   */
  async searchByMusicBrainz(query: string): Promise<MusicInfo[]> {
    try {
      const response = await fetch(
        `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=5`,
        {
          headers: {
            'User-Agent': 'MobileAIChat/1.0.0 (contact@example.com)'
          }
        }
      );
      const data = await response.json();
      
      return (data.recordings || []).map((recording: any) => ({
        title: recording.title,
        artist: recording['artist-credit']?.[0]?.artist?.name || 'Unknown',
        duration: Math.floor(recording.length / 1000) || undefined,
        releaseYear: recording.releases?.[0]?.date ? 
          new Date(recording.releases[0].date).getFullYear() : undefined
      }));
    } catch (error) {
      console.error('MusicBrainz搜索失败:', error);
      return [];
    }
  }

  /**
   * 根据流派推测音乐情绪
   */
  private mapGenreToMood(genre?: string): MusicInfo['mood'] {
    if (!genre) return undefined;
    
    const genreLower = genre.toLowerCase();
    if (genreLower.includes('pop') || genreLower.includes('dance')) return 'happy';
    if (genreLower.includes('blues') || genreLower.includes('sad')) return 'sad';
    if (genreLower.includes('rock') || genreLower.includes('metal')) return 'energetic';
    if (genreLower.includes('classical') || genreLower.includes('ambient')) return 'calm';
    if (genreLower.includes('jazz') || genreLower.includes('r&b')) return 'romantic';
    
    return undefined;
  }

  /**
   * 智能音乐信息搜索 - 综合多个源
   */
  async smartSearch(query: string): Promise<MusicInfo[]> {
    const results: MusicInfo[] = [];
    
    // 首先尝试iTunes (最可靠)
    const iTunesResults = await this.searchByiTunes(query);
    results.push(...iTunesResults);
    
    // 如果结果不够，尝试MusicBrainz
    if (results.length < 3) {
      const musicBrainzResults = await this.searchByMusicBrainz(query);
      results.push(...musicBrainzResults);
    }
    
    return results.slice(0, 5); // 最多返回5个结果
  }
}

/**
 * AI听音乐模拟器
 */
class AIListeningSimulator {
  private currentPlayback: MusicPlaybackState | null = null;
  private reactionTimer: NodeJS.Timeout | null = null;
  private onReactionCallback?: (reaction: string) => void;

  /**
   * 开始"听"音乐
   */
  startListening(musicInfo: MusicInfo, onReaction?: (reaction: string) => void) {
    this.onReactionCallback = onReaction;
    this.currentPlayback = {
      isPlaying: true,
      currentTime: 0,
      duration: musicInfo.duration || 180, // 默认3分钟
      musicInfo,
      startTime: Date.now()
    };

    this.scheduleReactions();
  }

  /**
   * 停止听音乐
   */
  stopListening() {
    this.currentPlayback = null;
    if (this.reactionTimer) {
      clearTimeout(this.reactionTimer);
      this.reactionTimer = null;
    }
  }

  /**
   * 获取当前播放状态
   */
  getCurrentState(): MusicPlaybackState | null {
    if (!this.currentPlayback) return null;
    
    const elapsed = (Date.now() - this.currentPlayback.startTime) / 1000;
    return {
      ...this.currentPlayback,
      currentTime: Math.min(elapsed, this.currentPlayback.duration)
    };
  }

  /**
   * 安排AI反应
   */
  private scheduleReactions() {
    if (!this.currentPlayback) return;

    // 初始反应 (开始听时)
    setTimeout(() => {
      this.generateReaction('start');
    }, 2000);

    // 中段反应
    const midPoint = (this.currentPlayback.duration / 2) * 1000;
    setTimeout(() => {
      this.generateReaction('middle');
    }, midPoint);

    // 结束反应
    const endTime = this.currentPlayback.duration * 1000;
    setTimeout(() => {
      this.generateReaction('end');
      this.stopListening();
    }, endTime);

    // 随机反应
    this.scheduleRandomReactions();
  }

  /**
   * 生成AI反应
   */
  private generateReaction(timing: 'start' | 'middle' | 'end' | 'random') {
    if (!this.currentPlayback || !this.onReactionCallback) return;

    const { musicInfo } = this.currentPlayback;
    const reactions = this.getReactionsByMoodAndTiming(musicInfo.mood, timing);
    
    const reaction = reactions[Math.floor(Math.random() * reactions.length)];
    this.onReactionCallback(reaction);
  }

  /**
   * 根据音乐情绪和时机生成反应
   */
  private getReactionsByMoodAndTiming(mood?: string, timing?: string): string[] {
    const baseReactions = {
      start: {
        happy: [
          "哇，这首歌好欢快！🎵",
          "听到这个节奏就想跟着摇摆~",
          "这首歌的开头就很抓人呢！",
          "感觉心情一下子就好起来了！✨"
        ],
        sad: [
          "这首歌听起来有点忧伤...",
          "旋律很美，但带着淡淡的哀愁",
          "这种音乐总能触动心弦",
          "听着听着就想安静下来..."
        ],
        energetic: [
          "这节奏太带劲了！🤟",
          "感觉血液都沸腾起来了！",
          "这首歌充满力量！",
          "听得我都想跟着动起来了！"
        ],
        calm: [
          "这首歌好舒缓啊...",
          "听着就很放松呢~",
          "很适合安静地听呢",
          "这种音乐让人心境平和"
        ]
      },
      middle: {
        happy: [
          "越听越喜欢这首歌！",
          "这个副歌部分太棒了！",
          "忍不住要跟着哼了~",
          "心情真的很好呢！😊"
        ],
        sad: [
          "这段旋律好打动人...",
          "歌词说到心坎里了",
          "听得有点想哭了",
          "音乐真的很有感染力"
        ],
        energetic: [
          "这个节拍太爽了！",
          "感觉整个人都被点燃了！",
          "这就是音乐的魅力！",
          "完全停不下来！🔥"
        ],
        calm: [
          "这段音乐很治愈呢",
          "听着很舒服",
          "感觉时间都慢下来了",
          "很有意境的音乐"
        ]
      },
      end: {
        happy: [
          "好想再听一遍！",
          "这首歌真的很棒呢！",
          "听完心情特别好~",
          "谢谢分享这么好听的歌！💕"
        ],
        sad: [
          "听完了...还沉浸在音乐里",
          "这首歌真的很有感觉",
          "音乐结束了，但余韵还在",
          "谢谢让我听到这么好的歌"
        ],
        energetic: [
          "听得很过瘾！",
          "这首歌太燃了！",
          "感觉满血复活！",
          "还想再来一首这样的！🎸"
        ],
        calm: [
          "听完很放松呢",
          "这种音乐真的很棒",
          "感觉心情都平静了",
          "谢谢这么美妙的音乐"
        ]
      },
      random: {
        happy: ["😊", "这段好好听！", "节奏感很棒"],
        sad: ["😢", "这里很感动", "旋律很美"],
        energetic: ["🔥", "太燃了！", "这个节拍！"],
        calm: ["😌", "很舒服", "好放松"]
      }
    } as const;

    const defaultMood = 'happy';
    const defaultTiming = 'start';
    
    const moodKey = (mood && mood in baseReactions[defaultTiming]) ? mood as keyof typeof baseReactions.start : defaultMood;
    const timingKey = (timing && timing in baseReactions) ? timing as keyof typeof baseReactions : defaultTiming;
    
    const reactionGroup = baseReactions[timingKey];
    if (moodKey in reactionGroup) {
      return [...reactionGroup[moodKey as keyof typeof reactionGroup]];
    }
    
    return [...baseReactions.start.happy];
  }

  /**
   * 安排随机反应
   */
  private scheduleRandomReactions() {
    if (!this.currentPlayback) return;

    // 在播放过程中随机发送1-2个反应
    const duration = this.currentPlayback.duration * 1000;
    const reactionCount = Math.floor(Math.random() * 2) + 1;

    for (let i = 0; i < reactionCount; i++) {
      const randomTime = Math.random() * duration * 0.7 + duration * 0.15; // 15%-85%之间
      setTimeout(() => {
        this.generateReaction('random');
      }, randomTime);
    }
  }
}

// 导出服务实例
export const musicInfoService = new MusicInfoService();
export const aiListeningSimulator = new AIListeningSimulator();
