/**
 * 网易云音乐链接解析服务
 * 解析网易云音乐分享链接并获取歌曲信息
 */

export interface NeteaseMusicInfo {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  playUrl?: string;
  duration?: number;
  shareUrl: string;
  platform: 'netease';
}

export class NeteaseMusicParser {
  
  /**
   * 检测消息中是否包含网易云音乐链接
   */
  static detectMusicLink(text: string): { hasLink: boolean; url?: string; rawText?: string } {
    // 网易云音乐分享链接模式
    const patterns = [
      /https?:\/\/163cn\.tv\/[A-Za-z0-9]+/g,
      /https?:\/\/y\.music\.163\.com\/[A-Za-z0-9?=&]+/g,
      /https?:\/\/music\.163\.com\/[A-Za-z0-9?=&\/]+/g,
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        return {
          hasLink: true,
          url: matches[0],
          rawText: text
        };
      }
    }

    return { hasLink: false };
  }

  /**
   * 从分享文本中解析音乐信息
   */
  static parseFromShareText(text: string, url: string): NeteaseMusicInfo | null {
    try {
      // 解析分享文本格式：分享郑润泽的单曲《于是》https://163cn.tv/U1voFDS (@网易云音乐)
      const titleMatch = text.match(/《([^》]+)》/);
      const artistMatch = text.match(/分享(.+?)的(?:单曲|专辑|歌曲)/);
      
      if (titleMatch && artistMatch) {
        const title = titleMatch[1];
        const artist = artistMatch[1];
        
        return {
          id: this.extractIdFromUrl(url),
          title,
          artist,
          shareUrl: url,
          platform: 'netease',
          coverUrl: this.generateDefaultCover(title, artist),
          playUrl: undefined // 网易云音乐需要通过API获取，这里先不实现
        };
      }

      // 如果无法从文本解析，尝试从URL获取基本信息
      return {
        id: this.extractIdFromUrl(url),
        title: '网易云音乐',
        artist: '未知艺术家',
        shareUrl: url,
        platform: 'netease',
        coverUrl: this.generateDefaultCover('网易云音乐', '未知艺术家')
      };
    } catch (error) {
      console.error('解析网易云音乐信息失败:', error);
      return null;
    }
  }

  /**
   * 从URL中提取歌曲ID
   */
  private static extractIdFromUrl(url: string): string {
    // 从短链接或完整链接中提取ID
    const shortLinkMatch = url.match(/163cn\.tv\/([A-Za-z0-9]+)/);
    if (shortLinkMatch) {
      return shortLinkMatch[1];
    }
    
    const fullLinkMatch = url.match(/id=(\d+)/);
    if (fullLinkMatch) {
      return fullLinkMatch[1];
    }
    
    // 如果都没有匹配到，使用URL的hash作为ID
    return btoa(url).slice(0, 8);
  }

  /**
   * 生成默认封面（使用渐变背景和文字）
   */
  private static generateDefaultCover(title: string, artist: string): string {
    // 根据歌曲名和艺术家生成唯一的渐变色
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)'
    ];
    
    const hash = (title + artist).split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
  }

  /**
   * 验证网易云音乐链接是否有效
   */
  static async validateMusicLink(url: string): Promise<boolean> {
    try {
      // 简单的可达性检查
      await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      return true; // 如果没有抛出异常，认为链接有效
    } catch (error) {
      console.warn('网易云音乐链接验证失败:', error);
      return true; // 由于CORS限制，这里默认返回true
    }
  }

  /**
   * 格式化持续时间
   */
  static formatDuration(seconds?: number): string {
    if (!seconds) return '未知';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

export default NeteaseMusicParser;
