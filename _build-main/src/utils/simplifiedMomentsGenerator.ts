/**
 * 精简版朋友圈生成器 - 方案D（6种类型 + 真实API）
 * 解决格式混乱、类型过多的问题
 * 集成真实音乐API和AI生成的新闻/文章内容
 */

import { Conversation, ApiConfig } from '../types';
import { getMusicByPersonality } from './realMusicAPI';
import { getRandomNews, getRandomArticle } from './contentPoolGenerator';

export interface SimpleMomentsFormat {
  type: 'text_only' | 'single_image' | 'multi_image' | 'life_sharing' | 'link_sharing' | 'mood_moment';
  textLength: 'short' | 'medium' | 'long';
  imageCount: number;
  hasHashtags: boolean;
}

export interface MomentsShareData {
  contentType?: 'text' | 'images' | 'music' | 'link';
  musicInfo?: {
    title: string;
    artist: string;
    coverUrl?: string;
  };
  linkInfo?: {
    title: string;
    description?: string;
    coverUrl?: string;
    url?: string;
  };
}

export interface GeneratedMomentsContent {
  content: string;
  imageDescriptions?: string[];
  shareData?: MomentsShareData;
  format: SimpleMomentsFormat;
}

export class SimplifiedMomentsGenerator {
  
  /**
   * 智能选择朋友圈格式（精简版）
   */
  static selectFormat(conversation: Conversation): SimpleMomentsFormat {
    const personality = conversation.characterSettings?.personality || '';
    const hour = new Date().getHours();
    
    // 精简的6种格式权重
    const formatWeights: Record<string, number> = {
      'text_only': 0.15,       // 15% - 纯文字感悟
      'single_image': 0.30,    // 30% - 单图（最常见）
      'multi_image': 0.25,     // 25% - 多图(2-4张)
      'life_sharing': 0.10,    // 10% - 生活分享+实物照
      'link_sharing': 0.15,    // 15% - 链接分享（音乐/文章）
      'mood_moment': 0.05      // 5% - 情感时刻
    };
    
    // 根据性格调整
    if (personality.includes('活泼') || personality.includes('外向')) {
      formatWeights.multi_image *= 1.5;
      formatWeights.link_sharing *= 1.3;
    }
    
    if (personality.includes('文艺') || personality.includes('内向')) {
      formatWeights.text_only *= 1.5;
      formatWeights.mood_moment *= 2.0;
    }
    
    // 根据时间调整
    if (hour >= 22 || hour <= 6) {
      // 深夜更倾向情感内容
      formatWeights.mood_moment *= 2.0;
      formatWeights.text_only *= 1.4;
    } else if (hour >= 12 && hour <= 14) {
      // 午餐时间更倾向分享
      formatWeights.life_sharing *= 1.5;
      formatWeights.link_sharing *= 1.3;
    }
    
    const selectedType = this.weightedRandomSelect(formatWeights);
    return this.buildFormatConfig(selectedType as SimpleMomentsFormat['type']);
  }
  
  /**
   * 加权随机选择
   */
  static weightedRandomSelect(weights: Record<string, number>): string {
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;
    
    for (const [key, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) {
        return key;
      }
    }
    
    return Object.keys(weights)[0];
  }
  
  /**
   * 构建格式配置
   */
  static buildFormatConfig(type: SimpleMomentsFormat['type']): SimpleMomentsFormat {
    let imageCount = 0;
    let textLength: SimpleMomentsFormat['textLength'] = 'medium';
    let hasHashtags = Math.random() < 0.5;
    
    switch (type) {
      case 'text_only':
        imageCount = 0;
        textLength = Math.random() < 0.4 ? 'long' : 'medium';
        break;
      case 'single_image':
        imageCount = 1;
        textLength = 'short';
        break;
      case 'multi_image':
        imageCount = 2 + Math.floor(Math.random() * 3); // 2-4张
        textLength = 'short';
        hasHashtags = true;
        break;
      case 'life_sharing':
        imageCount = 1 + Math.floor(Math.random() * 2); // 1-2张
        textLength = 'short';
        break;
      case 'link_sharing':
        imageCount = 0; // 卡片式
        textLength = 'short';
        break;
      case 'mood_moment':
        imageCount = Math.random() < 0.3 ? 1 : 0;
        textLength = 'medium';
        break;
    }
    
    return { type, textLength, imageCount, hasHashtags };
  }
  
  /**
   * 生成朋友圈内容
   */
  static generateContent(conversation: Conversation): GeneratedMomentsContent {
    const format = this.selectFormat(conversation);
    const personality = conversation.characterSettings?.personality || '';
    
    let content = '';
    let imageDescriptions: string[] | undefined;
    let shareData: MomentsShareData | undefined;
    
    switch (format.type) {
      case 'text_only':
        content = this.generateTextContent(format.textLength);
        break;
        
      case 'single_image':
      case 'multi_image':
        ({ content, imageDescriptions } = this.generateImageContent(format.imageCount));
        break;
        
      case 'life_sharing':
        ({ content, imageDescriptions } = this.generateLifeContent());
        break;
        
      case 'link_sharing':
        ({ content, shareData } = this.generateLinkContent(personality));
        break;
        
      case 'mood_moment':
        ({ content, imageDescriptions } = this.generateMoodContent(format.imageCount));
        break;
    }
    
    // 添加话题标签
    if (format.hasHashtags && !content.includes('#')) {
      content += ` #${this.getRandomHashtag()}`;
    }
    
    return { content, imageDescriptions, shareData, format };
  }
  
  /**
   * 生成纯文字内容
   */
  static generateTextContent(length: 'short' | 'medium' | 'long'): string {
    const templates = [
      '今天感悟颇多，人生就是不断学习和成长的过程。',
      '突然想到一个问题：什么是真正的快乐？',
      '最近读到一句话，深有感触。',
      '生活总是在不经意间给我们惊喜。',
      '慢下来，才能看清楚身边的美好。',
      '做自己喜欢的事，时间总是过得特别快。'
    ];
    
    let content = templates[Math.floor(Math.random() * templates.length)];
    
    if (length === 'long') {
      content += '有时候我们太急于追求结果，却忽略了过程中的风景。不妨放慢脚步，好好享受当下的每一刻。';
    }
    
    return content;
  }
  
  /**
   * 生成配图内容
   */
  static generateImageContent(count: number): { content: string; imageDescriptions: string[] } {
    const themes = [
      { content: '今天的天气真好☀️', images: ['蓝天白云', '阳光透过树叶'] },
      { content: '周末时光 享受慢生活', images: ['咖啡杯', '书本和植物', '窗边的猫咪'] },
      { content: '美食时刻🍜', images: ['精致摆盘的美食', '餐厅环境'] },
      { content: '出门散步~', images: ['街道风景', '公园一角', '路边的花', '夕阳'] }
    ];
    
    const theme = themes[Math.floor(Math.random() * themes.length)];
    const images = theme.images.slice(0, count);
    
    return {
      content: theme.content,
      imageDescriptions: images
    };
  }
  
  /**
   * 生成生活分享内容
   */
  static generateLifeContent(): { content: string; imageDescriptions: string[] } {
    const templates = [
      { content: '今天收到的小礼物💝', imageDescriptions: ['包装精美的礼物盒'] },
      { content: '新入手的好物，太喜欢了！', imageDescriptions: ['产品实拍图', '使用场景'] },
      { content: '周末宅家，舒服~', imageDescriptions: ['温馨的家居角落'] },
      { content: '最近的日常记录📷', imageDescriptions: ['生活随拍', '日常瞬间'] }
    ];
    
    const template = templates[Math.floor(Math.random() * templates.length)];
    return template;
  }
  
  /**
   * 生成链接分享内容（音乐/文章）
   * 注意：此函数需要在异步环境中调用才能使用真实API
   * 同步版本使用本地库，异步版本见generateLinkContentAsync
   */
  static generateLinkContent(_personality: string): { 
    content: string; 
    shareData: MomentsShareData 
  } {
    const isMusicType = Math.random() < 0.6; // 60%音乐，40%文章
    
    if (isMusicType) {
      return this.generateMusicShare();
    } else {
      return this.generateArticleShare();
    }
  }
  
  /**
   * 生成链接分享内容（异步版本，使用真实API）
   */
  static async generateLinkContentAsync(
    personality: string,
    apiConfig: ApiConfig
  ): Promise<{ content: string; shareData: MomentsShareData }> {
    const isMusicType = Math.random() < 0.6; // 60%音乐，40%文章
    
    if (isMusicType) {
      return await this.generateMusicShareAsync(personality, apiConfig);
    } else {
      return await this.generateArticleShareAsync(apiConfig);
    }
  }
  
  /**
   * 生成音乐分享
   */
  static generateMusicShare(): {
    content: string;
    shareData: MomentsShareData;
  } {
    const musicLibrary = [
      { title: '晴天', artist: '周杰伦', cover: 'https://picsum.photos/200?random=music1' },
      { title: '青花瓷', artist: '周杰伦', cover: 'https://picsum.photos/200?random=music2' },
      { title: '红豆', artist: '王菲', cover: 'https://picsum.photos/200?random=music3' },
      { title: '匆匆那年', artist: '王菲', cover: 'https://picsum.photos/200?random=music4' },
      { title: '演员', artist: '薛之谦', cover: 'https://picsum.photos/200?random=music5' },
      { title: '说好不哭', artist: '周杰伦', cover: 'https://picsum.photos/200?random=music6' },
      { title: '年轮', artist: '张碧晨', cover: 'https://picsum.photos/200?random=music7' },
      { title: '光年之外', artist: 'G.E.M.邓紫棋', cover: 'https://picsum.photos/200?random=music8' }
    ];
    
    const music = musicLibrary[Math.floor(Math.random() * musicLibrary.length)];
    
    const comments = [
      '单曲循环ing🎵',
      '这首歌听了无数遍还是喜欢',
      '分享一首最近在听的歌~',
      '推荐给你们，真的很好听！',
      '旋律太美了💫'
    ];
    
    return {
      content: comments[Math.floor(Math.random() * comments.length)],
      shareData: {
        contentType: 'music',
        musicInfo: {
          title: music.title,
          artist: music.artist,
          coverUrl: music.cover
        }
      }
    };
  }
  
  /**
   * 生成音乐分享（异步版本，使用真实API）
   */
  static async generateMusicShareAsync(
    personality: string,
    _apiConfig: ApiConfig
  ): Promise<{ content: string; shareData: MomentsShareData }> {
    try {
      const music = await getMusicByPersonality(personality);
      
      const comments = [
        '单曲循环ing🎵',
        '这首歌听了无数遍还是喜欢',
        '分享一首最近在听的歌~',
        '推荐给你们，真的很好听！',
        '旋律太美了💫'
      ];
      
      return {
        content: comments[Math.floor(Math.random() * comments.length)],
        shareData: {
          contentType: 'music',
          musicInfo: {
            title: music.title,
            artist: music.artist,
            coverUrl: music.coverUrl
          }
        }
      };
    } catch (error) {
      console.error('获取真实音乐失败，使用降级方案:', error);
      return this.generateMusicShare();
    }
  }
  
  /**
   * 生成文章分享
   */
  static generateArticleShare(): {
    content: string;
    shareData: MomentsShareData;
  } {
    const articles = [
      {
        title: '如何提升个人效率：时间管理的10个技巧',
        desc: '分享一些实用的时间管理方法，帮助你更高效地工作和生活。',
        cover: 'https://picsum.photos/400/300?random=article1'
      },
      {
        title: '深度思考：什么是真正的成长？',
        desc: '成长不仅仅是年龄的增长，更是思维和认知的提升。',
        cover: 'https://picsum.photos/400/300?random=article2'
      },
      {
        title: '旅行见闻：那些改变我人生的瞬间',
        desc: '每一次旅行都是一次全新的体验，记录那些难忘的时刻。',
        cover: 'https://picsum.photos/400/300?random=article3'
      },
      {
        title: '美食探店：这家店的招牌菜绝了！',
        desc: '分享最近发现的一家宝藏餐厅，强烈推荐给吃货们！',
        cover: 'https://picsum.photos/400/300?random=article4'
      },
      {
        title: '读书笔记：《xxx》给我的启发',
        desc: '好书推荐，这本书让我对生活有了新的理解。',
        cover: 'https://picsum.photos/400/300?random=article5'
      }
    ];
    
    const article = articles[Math.floor(Math.random() * articles.length)];
    
    const comments = [
      '这篇文章写得不错，推荐阅读👍',
      '分享一篇好文~',
      '看完很有感触',
      '值得一读！',
      '转发收藏✨'
    ];
    
    return {
      content: comments[Math.floor(Math.random() * comments.length)],
      shareData: {
        contentType: 'link',
        linkInfo: {
          title: article.title,
          description: article.desc,
          coverUrl: article.cover,
          url: '#' // 示例链接
        }
      }
    };
  }
  
  /**
   * 生成文章分享（异步版本，使用AI生成的内容池）
   */
  static async generateArticleShareAsync(
    apiConfig: ApiConfig
  ): Promise<{ content: string; shareData: MomentsShareData }> {
    try {
      // 60%概率使用AI生成的公众号文章，40%使用新闻
      const useArticle = Math.random() < 0.6;
      
      if (useArticle) {
        const article = await getRandomArticle(apiConfig);
        
        const comments = [
          '这篇文章写得不错，推荐阅读👍',
          '分享一篇好文~',
          '看完很有感触',
          '值得一读！',
          '转发收藏✨'
        ];
        
        return {
          content: comments[Math.floor(Math.random() * comments.length)],
          shareData: {
            contentType: 'link',
            linkInfo: {
              title: article.title,
              description: article.summary,
              coverUrl: article.coverUrl,
              url: '#'
            }
          }
        };
      } else {
        const news = await getRandomNews(apiConfig);
        
        const comments = [
          '关注这个话题很久了',
          '分享一条新闻',
          '这个值得一看',
          '转发！'
        ];
        
        return {
          content: comments[Math.floor(Math.random() * comments.length)],
          shareData: {
            contentType: 'link',
            linkInfo: {
              title: news.title,
              description: news.summary,
              coverUrl: news.coverUrl,
              url: '#'
            }
          }
        };
      }
    } catch (error) {
      console.error('获取AI生成内容失败，使用降级方案:', error);
      return this.generateArticleShare();
    }
  }
  
  /**
   * 生成心情内容
   */
  static generateMoodContent(imageCount: number): { 
    content: string; 
    imageDescriptions?: string[] 
  } {
    const moods = [
      { content: '今天心情还不错😊', image: '窗外的风景' },
      { content: '突然有点想家了...', image: null },
      { content: '深夜emo时刻🌙', image: '深夜的街道' },
      { content: '感恩遇见的每一个人💕', image: null },
      { content: '希望明天会更好✨', image: '夜空中的星星' }
    ];
    
    const mood = moods[Math.floor(Math.random() * moods.length)];
    
    return {
      content: mood.content,
      imageDescriptions: imageCount > 0 && mood.image ? [mood.image] : undefined
    };
  }
  
  /**
   * 获取随机话题标签
   */
  static getRandomHashtag(): string {
    const hashtags = [
      '日常', '生活记录', '今日份', '随手拍', '分享',
      '周末时光', '美好生活', '记录生活', '城市漫步', '心情'
    ];
    return hashtags[Math.floor(Math.random() * hashtags.length)];
  }
}
