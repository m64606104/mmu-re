/**
 * 歌词获取服务 - 动态获取歌词而不依赖预设库
 */

import { LyricsLine } from '../types';

export interface LyricsResult {
  lyrics: string; // 完整歌词文本
  lyricsWithTime?: LyricsLine[]; // 带时间轴的歌词
  source: 'api' | 'manual' | 'preset' | 'parsed';
}

export class LyricsService {
  
  /**
   * 获取歌词 - 多种方式尝试
   */
  async getLyrics(title: string, artist: string): Promise<LyricsResult | null> {
    console.log(`🎵 开始获取歌词: ${title} - ${artist}`);

    // 方案1: 尝试免费歌词API
    try {
      const apiResult = await this.getFromAPI(title, artist);
      if (apiResult) {
        console.log('✅ 从API获取歌词成功');
        return apiResult;
      }
    } catch (error) {
      console.log('❌ API获取歌词失败:', error);
    }

    // 方案2: 检查预设歌词库  
    const presetResult = this.getFromPreset(title, artist);
    if (presetResult) {
      console.log('✅ 从预设库获取歌词成功');
      return presetResult;
    }

    // 方案3: 返回null，让用户手动输入
    console.log('💭 需要用户手动输入歌词');
    return null;
  }

  /**
   * 从免费API获取歌词
   */
  private async getFromAPI(title: string, artist: string): Promise<LyricsResult | null> {
    // 方案1: Lyrics.ovh (免费歌词API)
    try {
      const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.lyrics) {
          return {
            lyrics: data.lyrics.trim(),
            source: 'api'
          };
        }
      }
    } catch (error) {
      console.log('Lyrics.ovh API失败:', error);
    }

    // 方案2: Musixmatch API (需要申请key，但有免费配额)
    // 这里预留接口，用户可以自己申请API Key
    try {
      const musixmatchKey = localStorage.getItem('musixmatch_api_key');
      if (musixmatchKey) {
        const searchUrl = `https://api.musixmatch.com/ws/1.1/matcher.lyrics.get?format=json&callback=callback&q_track=${encodeURIComponent(title)}&q_artist=${encodeURIComponent(artist)}&apikey=${musixmatchKey}`;
        // 注意：由于CORS限制，这个可能需要后端代理
        console.log('可以尝试Musixmatch API:', searchUrl);
      }
    } catch (error) {
      console.log('Musixmatch API失败:', error);
    }

    return null;
  }

  /**
   * 从预设库获取歌词（保留经典歌曲）
   */
  private getFromPreset(title: string, artist: string): LyricsResult | null {
    const key = `${title.toLowerCase()}_${artist.toLowerCase()}`;
    
    // 预设歌词库（经典歌曲 + 时间轴）
    const presetLyrics: Record<string, LyricsResult> = {
      '发如雪_周杰伦': {
        lyrics: `狼牙月 伊人憔悴
我举杯 饮尽了风雪
是谁打翻前世柜
惹尘埃是非
缘字诀 几番轮回
你锁眉 哭红颜唤不回
纵然青史已成灰
我爱不灭
繁华如三千东流水
我只取一瓢爱了解
只恋你化身的蝶
你发如雪 凄美了离别
我焚香感动了谁
邀明月 让回忆皎洁
爱在月光下完美`,
        lyricsWithTime: [
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
        source: 'preset'
      },
      
      '爱情_莫文蔚': {
        lyrics: `当爱情遗落成遗迹
用象形文字刻划爱你
纪念我们爱情逝去
万年后你是否还记起
爱情不是你想买
想买就能买
让我挣脱开 让我明白
放手你的爱`,
        lyricsWithTime: [
          { time: 0, text: '当爱情遗落成遗迹' },
          { time: 4, text: '用象形文字刻划爱你' },
          { time: 8, text: '纪念我们爱情逝去' },
          { time: 12, text: '万年后你是否还记起' },
          { time: 16, text: '爱情不是你想买' },
          { time: 20, text: '想买就能买' },
          { time: 24, text: '让我挣脱开 让我明白' },
          { time: 28, text: '放手你的爱' }
        ],
        source: 'preset'
      }
    };

    // 模糊匹配
    const exactMatch = presetLyrics[key];
    if (exactMatch) return exactMatch;

    // 尝试只匹配歌名
    for (const [presetKey, lyrics] of Object.entries(presetLyrics)) {
      if (presetKey.includes(title.toLowerCase())) {
        return lyrics;
      }
    }

    return null;
  }

  /**
   * 解析用户输入的歌词，尝试生成时间轴
   */
  parseLyricsWithTime(lyricsText: string, duration: number = 240): LyricsResult {
    const lines = lyricsText.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return { lyrics: lyricsText, source: 'manual' };
    }

    // 检查是否已经有时间标记 (如: [00:12] 歌词内容)
    const timePattern = /^\[(\d{2}):(\d{2})\]/;
    const hasTimeMarks = lines.some(line => timePattern.test(line));

    if (hasTimeMarks) {
      // 解析现有的时间标记
      const lyricsWithTime: LyricsLine[] = [];
      lines.forEach(line => {
        const match = line.match(/^\[(\d{2}):(\d{2})\](.+)/);
        if (match) {
          const minutes = parseInt(match[1]);
          const seconds = parseInt(match[2]);
          const text = match[3].trim();
          lyricsWithTime.push({
            time: minutes * 60 + seconds,
            text
          });
        }
      });
      
      return {
        lyrics: lines.map(line => line.replace(timePattern, '').trim()).join('\n'),
        lyricsWithTime,
        source: 'parsed'
      };
    } else {
      // 自动生成均匀分布的时间轴
      const averageTimePerLine = duration / lines.length;
      const lyricsWithTime: LyricsLine[] = lines.map((line, index) => ({
        time: Math.round(index * averageTimePerLine),
        text: line.trim()
      }));

      return {
        lyrics: lyricsText,
        lyricsWithTime,
        source: 'manual'
      };
    }
  }

  /**
   * 验证歌词格式
   */
  validateLyrics(lyrics: string): { valid: boolean; message?: string } {
    if (!lyrics || lyrics.trim().length === 0) {
      return { valid: false, message: '歌词不能为空' };
    }

    if (lyrics.length > 10000) {
      return { valid: false, message: '歌词太长，请控制在10000字以内' };
    }

    return { valid: true };
  }
}

/**
 * 全局歌词服务实例
 */
export const lyricsService = new LyricsService();

/**
 * 便捷函数：获取增强的音乐信息（包含歌词）
 */
export async function enhanceMusicWithLyrics(title: string, artist: string, manualLyrics?: string): Promise<{
  lyrics?: string;
  lyricsWithTime?: LyricsLine[];
  source: string;
}> {
  // 如果提供了手动歌词，优先使用
  if (manualLyrics && manualLyrics.trim()) {
    const result = lyricsService.parseLyricsWithTime(manualLyrics);
    return {
      lyrics: result.lyrics,
      lyricsWithTime: result.lyricsWithTime,
      source: result.source
    };
  }

  // 否则尝试自动获取
  const result = await lyricsService.getLyrics(title, artist);
  if (result) {
    return {
      lyrics: result.lyrics,
      lyricsWithTime: result.lyricsWithTime,
      source: result.source
    };
  }

  // 如果都获取不到，返回空
  return { source: 'none' };
}
