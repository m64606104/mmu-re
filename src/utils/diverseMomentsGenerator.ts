/**
 * 多样化朋友圈生成器
 * 解决AI朋友圈格式单一、内容重复的问题
 */

import { Conversation } from '../types';
import VirtualNewsGenerator from './virtualNewsGenerator';
import WeiboStyleGenerator from './weiboStyleGenerator';
import * as QQSpaceStyle from './qqSpaceStyleGenerator';
// import * as RealMomentsContent from './realMomentsContentGenerator'; // TODO: 集成真实朋友圈内容

export interface MomentsFormat {
  type: 'text_only' | 'single_image' | 'multi_image' | 'news_sharing' | 'mood_check' | 'weibo_sharing' | 'music_sharing' | 'article_sharing' | 'coupon_sharing' | 'life_complaint' | 'big_event' | 'qq_forward_text' | 'qq_forward_image' | 'qq_novel_text' | 'qq_tutorial' | 'qq_game_screenshot';
  textLength: 'short' | 'medium' | 'long';
  imageCount: number;
  hasHashtags: boolean;
  contentStyle: 'casual' | 'formal' | 'trendy' | 'emotional' | 'informative';
}

export interface ContentVariation {
  themes: string[];           // 记录最近使用的主题
  formats: MomentsFormat[];   // 记录最近使用的格式
  lastPostTime: number;       // 上次发布时间
  diversityScore: number;     // 多样性分数 0-100
}

export class DiverseMomentsGenerator {
  
  /**
   * 获取AI的内容变化记录
   */
  static getContentVariation(aiId: string): ContentVariation {
    try {
      const stored = localStorage.getItem(`content_variation_${aiId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('获取内容变化记录失败:', error);
    }
    
    return {
      themes: [],
      formats: [],
      lastPostTime: 0,
      diversityScore: 100
    };
  }
  
  /**
   * 更新AI的内容变化记录
   */
  static updateContentVariation(aiId: string, theme: string, format: MomentsFormat): void {
    const variation = this.getContentVariation(aiId);
    
    // 记录主题（最多保留10个）
    variation.themes.unshift(theme);
    if (variation.themes.length > 10) {
      variation.themes = variation.themes.slice(0, 10);
    }
    
    // 记录格式（最多保留5个）
    variation.formats.unshift(format);
    if (variation.formats.length > 5) {
      variation.formats = variation.formats.slice(0, 5);
    }
    
    variation.lastPostTime = Date.now();
    variation.diversityScore = this.calculateDiversityScore(variation);
    
    try {
      localStorage.setItem(`content_variation_${aiId}`, JSON.stringify(variation));
    } catch (error) {
      console.error('保存内容变化记录失败:', error);
    }
  }
  
  /**
   * 计算多样性分数
   */
  static calculateDiversityScore(variation: ContentVariation): number {
    let score = 100;
    
    // 主题重复度检查
    const uniqueThemes = new Set(variation.themes);
    const themeRepeat = 1 - (uniqueThemes.size / Math.max(variation.themes.length, 1));
    score -= themeRepeat * 40;
    
    // 格式重复度检查
    const formatTypes = variation.formats.map(f => f.type);
    const uniqueFormats = new Set(formatTypes);
    const formatRepeat = 1 - (uniqueFormats.size / Math.max(formatTypes.length, 1));
    score -= formatRepeat * 30;
    
    // 时间间隔检查
    const hoursSinceLastPost = (Date.now() - variation.lastPostTime) / (1000 * 60 * 60);
    if (hoursSinceLastPost < 2) {
      score -= 20; // 发布太频繁
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * 智能选择朋友圈格式
   */
  static selectOptimalFormat(conversation: Conversation): MomentsFormat {
    const variation = this.getContentVariation(conversation.id);
    const recentFormats = variation.formats.slice(0, 3); // 最近3次格式
    
    // 格式权重（基础概率）- 参考真实微信朋友圈/QQ空间
    const formatWeights: Record<string, number> = {
      'text_only': 0.05,           // 5% - 纯文字（真实场景较少）
      'single_image': 0.10,        // 10% - 单图
      'multi_image': 0.08,         // 8% - 多图
      'news_sharing': 0.04,        // 4% - 新闻分享
      'mood_check': 0.02,          // 2% - 心情检查
      'weibo_sharing': 0.04,       // 4% - 微博分享
      'music_sharing': 0.15,       // 15% - 音乐分享（常见）
      'article_sharing': 0.10,     // 10% - 公众号文章
      'coupon_sharing': 0.06,      // 6% - 优惠券广告
      'life_complaint': 0.08,      // 8% - 生活吐槽+实物照片
      'big_event': 0.03,           // 3% - 大型活动/聚会（较少）
      // QQ空间经典格式
      'qq_forward_text': 0.10,     // 10% - 转发说说（纯文字）
      'qq_forward_image': 0.05,    // 5% - 转发说说（带图）
      'qq_novel_text': 0.04,       // 4% - 小说/文段截图
      'qq_tutorial': 0.03,         // 3% - 教程/素材分享
      'qq_game_screenshot': 0.03   // 3% - 游戏截图
    };
    
    // 降低最近使用过的格式权重
    recentFormats.forEach(format => {
      const formatType = format.type;
      if (formatWeights[formatType]) {
        formatWeights[formatType] *= 0.3; // 大幅降低重复概率
      }
    });
    
    // 根据AI性格调整权重
    const personality = conversation.characterSettings?.personality || '';
    if (personality.includes('活泼') || personality.includes('外向')) {
      formatWeights.multi_image *= 1.5;
      formatWeights.news_sharing *= 1.3;
      formatWeights.qq_game_screenshot *= 2.0;  // 活泼型AI更喜欢游戏
      formatWeights.qq_forward_text *= 1.5;
    }
    
    if (personality.includes('文艺') || personality.includes('内向')) {
      formatWeights.text_only *= 1.4;
      formatWeights.mood_check *= 2.0;
      formatWeights.qq_novel_text *= 2.5;  // 文艺AI更喜欢文字分享
    }
    
    if (personality.includes('科技') || personality.includes('知识')) {
      formatWeights.news_sharing *= 2.0;
      formatWeights.qq_tutorial *= 2.0;  // 知识型 AI更喜欢教程
    }
    
    // 根据时间调整权重
    const hour = new Date().getHours();
    if (hour >= 22 || hour <= 6) {
      // 深夜/清晨更倾向于情感类内容
      formatWeights.mood_check *= 2.0;
      formatWeights.text_only *= 1.3;
      formatWeights.qq_novel_text *= 1.8;  // 晚上更可能分享文字
    } else if (hour >= 12 && hour <= 14) {
      // 午餐时间更倾向于分享类内容
      formatWeights.multi_image *= 1.4;
      formatWeights.news_sharing *= 1.2;
      formatWeights.qq_forward_text *= 1.3;  // 中午休息时分享
    } else if (hour >= 18 && hour <= 21) {
      // 晚上更可能玩游戏
      formatWeights.qq_game_screenshot *= 1.5;
    }
    
    // 加权随机选择
    const selectedType = this.weightedRandomSelect(formatWeights);
    
    return this.generateFormatDetails(selectedType as MomentsFormat['type'], conversation);
  }
  
  /**
   * 生成格式详细配置
   */
  static generateFormatDetails(type: MomentsFormat['type'], conversation: Conversation): MomentsFormat {
    const personality = conversation.characterSettings?.personality || '';
    
    let imageCount = 0;
    let textLength: MomentsFormat['textLength'] = 'medium';
    let hasHashtags = Math.random() < 0.6; // 60%概率带话题
    let contentStyle: MomentsFormat['contentStyle'] = 'casual';
    
    switch (type) {
      case 'text_only':
        imageCount = 0;
        textLength = Math.random() < 0.4 ? 'long' : 'medium';
        contentStyle = personality.includes('文艺') ? 'emotional' : 'casual';
        break;
        
      case 'single_image':
        imageCount = 1;
        textLength = 'short';
        break;
        
      case 'multi_image':
        imageCount = Math.random() < 0.3 ? 3 : (Math.random() < 0.6 ? 2 : Math.floor(Math.random() * 6) + 4); // 2-9张图
        textLength = Math.random() < 0.7 ? 'short' : 'medium';
        hasHashtags = true;
        break;
        
      case 'news_sharing':
        imageCount = 0;
        textLength = 'medium';
        contentStyle = 'informative';
        hasHashtags = true;
        break;
        
      case 'mood_check':
        imageCount = Math.random() < 0.4 ? 1 : 0;
        textLength = Math.random() < 0.6 ? 'short' : 'medium';
        contentStyle = 'emotional';
        break;
        
      case 'weibo_sharing':
        imageCount = 1; // 微博截图
        textLength = 'short';
        contentStyle = 'informative';
        hasHashtags = true;
        break;
        
      case 'music_sharing':
        imageCount = 1; // 音乐卡片
        textLength = 'short';
        contentStyle = 'casual';
        hasHashtags = false;
        break;
        
      case 'article_sharing':
        imageCount = 1; // 文章封面
        textLength = 'short';
        contentStyle = 'informative';
        hasHashtags = false;
        break;
        
      case 'coupon_sharing':
        imageCount = 1; // 优惠券图片
        textLength = 'short';
        contentStyle = 'informative';
        hasHashtags = true;
        break;
        
      case 'life_complaint':
        imageCount = Math.floor(Math.random() * 2) + 1; // 1-2张图
        textLength = 'short';
        contentStyle = 'casual';
        hasHashtags = false;
        break;
        
      case 'big_event':
        imageCount = 6 + Math.floor(Math.random() * 4); // 6-9张图
        textLength = 'short';
        contentStyle = 'casual';
        hasHashtags = true;
        break;
      
      // QQ空间经典格式
      case 'qq_forward_text':
        imageCount = 0;
        textLength = 'medium';
        contentStyle = 'casual';
        hasHashtags = false;
        break;
      
      case 'qq_forward_image':
        imageCount = Math.floor(Math.random() * 3) + 1; // 1-3张图
        textLength = 'short';
        contentStyle = 'casual';
        hasHashtags = false;
        break;
      
      case 'qq_novel_text':
        imageCount = 0;
        textLength = 'long'; // 小说文段通常很长
        contentStyle = 'emotional';
        hasHashtags = false;
        break;
      
      case 'qq_tutorial':
        imageCount = Math.floor(Math.random() * 3) + 2; // 2-4张教程图
        textLength = 'short';
        contentStyle = 'informative';
        hasHashtags = false;
        break;
      
      case 'qq_game_screenshot':
        imageCount = Math.floor(Math.random() * 3) + 1; // 1-3张游戏截图
        textLength = 'short';
        contentStyle = 'emotional';
        hasHashtags = true;
        break;
    }
    
    return {
      type,
      textLength,
      imageCount,
      hasHashtags,
      contentStyle
    };
  }
  
  /**
   * 生成多样化朋友圈内容
   */
  static generateDiverseContent(conversation: Conversation): {
    content: string;
    imageDescriptions: string[];
    theme: string;
    format: MomentsFormat;
    musicInfo?: { title: string; artist: string; coverUrl: string } | null;
    linkInfo?: { title: string; description: string; coverUrl: string; url: string } | null;
  } {
    const format = this.selectOptimalFormat(conversation);
    const variation = this.getContentVariation(conversation.id);
    
    let content = '';
    let imageDescriptions: string[] = [];
    let theme = '';
    
    switch (format.type) {
      case 'text_only':
        ({ content, theme } = this.generateTextOnlyContent(format, variation.themes));
        break;
        
      case 'single_image':
      case 'multi_image':
        ({ content, imageDescriptions, theme } = this.generateImageContent(format, variation.themes));
        break;
        
      case 'news_sharing':
        ({ content, theme } = this.generateNewsContent(conversation));
        break;
        
      case 'mood_check':
        ({ content, imageDescriptions, theme } = this.generateMoodContent(format));
        break;
        
      case 'weibo_sharing':
        ({ content, imageDescriptions, theme } = this.generateWeiboSharingContent(conversation));
        break;
        
      case 'music_sharing':
        ({ content, theme } = this.generateMusicSharingContent(conversation));
        break;
        
      case 'article_sharing':
        ({ content, theme } = this.generateArticleSharingContent(conversation));
        break;
      
      // QQ空间格式
      case 'qq_forward_text':
      case 'qq_forward_image':
        ({ content, imageDescriptions, theme } = this.generateQQForwardContent(conversation, format));
        break;
      
      case 'qq_novel_text':
        ({ content, theme } = this.generateQQNovelTextContent());
        break;
      
      case 'qq_tutorial':
        ({ content, imageDescriptions, theme } = this.generateQQTutorialContent());
        break;
      
      case 'qq_game_screenshot':
        ({ content, imageDescriptions, theme } = this.generateQQGameContent());
        break;
    }
    
    // 添加话题标签
    if (format.hasHashtags) {
      const hashtags = this.generateHashtags(theme);
      if (hashtags.length > 0 && !content.includes('#')) {
        content += ` ${hashtags.slice(0, 2).join(' ')}`;
      }
    }
    
    // 为音乐和文章分享添加特殊数据结构
    let musicInfo = null;
    let linkInfo = null;
    
    if (format.type === 'music_sharing') {
      musicInfo = {
        title: this.generateMusicTitle(),
        artist: this.generateMusicArtist(),
        coverUrl: `https://picsum.photos/seed/music-${Date.now()}/300/300.jpg`
      };
    } else if (format.type === 'article_sharing') {
      linkInfo = {
        title: this.generateArticleTitle(),
        description: this.generateArticleDescription(),
        coverUrl: `https://picsum.photos/seed/article-${Date.now()}/300/300.jpg`,
        url: `https://example.com/article/${Date.now()}`
      };
    }
    
    return { content, imageDescriptions, theme, format, musicInfo, linkInfo };
  }
  
  /**
   * 生成纯文字内容
   */
  static generateTextOnlyContent(
    format: MomentsFormat, 
    recentThemes: string[]
  ): { content: string; theme: string } {
    // 选择主题（避免重复）
    const availableThemes = [
      '生活感悟', '工作心得', '阅读笔记', '音乐分享', '电影观后感', 
      '旅行回忆', '美食体验', '学习收获', '友情感言', '时间管理'
    ].filter(theme => !recentThemes.includes(theme));
    
    const theme = availableThemes.length > 0 
      ? availableThemes[Math.floor(Math.random() * availableThemes.length)]
      : '日常随想';
    
    const templates = this.getTextTemplates(theme);
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    // 根据文本长度调整内容
    let content = this.fillTemplate(template);
    
    if (format.textLength === 'long') {
      content += this.getExtendedThought(theme);
    } else if (format.textLength === 'short') {
      content = content.split('。')[0] + '。';
    }
    
    return { content, theme };
  }
  
  /**
   * 生成配图内容
   */
  static generateImageContent(
    format: MomentsFormat,
    recentThemes: string[]
  ): { content: string; imageDescriptions: string[]; theme: string } {
    const themes = ['美食', '风景', '日常', '穿搭', '宠物', '工作', '运动', '艺术'];
    const availableThemes = themes.filter(theme => !recentThemes.includes(theme));
    const theme = availableThemes.length > 0 
      ? availableThemes[Math.floor(Math.random() * availableThemes.length)]
      : themes[Math.floor(Math.random() * themes.length)];
    
    const { content, imageDescriptions } = this.generateImageBasedContent(theme, format.imageCount);
    
    return { content, imageDescriptions, theme };
  }
  
  /**
   * 生成新闻分享内容
   */
  static generateNewsContent(conversation: Conversation): { content: string; theme: string } {
    const personality = conversation.characterSettings?.personality;
    const news = VirtualNewsGenerator.getTodayRecommendedNews(personality, 1)[0];
    
    if (!news) {
      // 降级到普通内容
      return { content: '暂无新闻内容，稍后再试', theme: '新闻分享' };
    }
    
    const comment = VirtualNewsGenerator.generateNewsComment(news, personality);
    const content = `${comment}\n\n📰 ${news.title}`;
    
    return { content, theme: '新闻分享' };
  }
  
  /**
   * 生成微博分享内容
   */
  static generateWeiboSharingContent(
    conversation: Conversation
  ): { content: string; imageDescriptions: string[]; theme: string } {
    const personality = conversation.characterSettings?.personality || '';
    
    // 生成微博内容
    const weiboPost = WeiboStyleGenerator.generateWeiboPost();
    const shareContent = WeiboStyleGenerator.generateMomentsShareContent(personality, weiboPost);
    
    return {
      content: shareContent.content,
      imageDescriptions: [shareContent.imageDescription],
      theme: '微博分享'
    };
  }

  /**
   * 生成心情类内容
   */
  static generateMoodContent(
    format: MomentsFormat
  ): { content: string; imageDescriptions: string[]; theme: string } {
    const hour = new Date().getHours();
    
    const moodTemplates = {
      morning: ['新的一天，{mood}', '早晨的{feeling}', '今天想{activity}'],
      afternoon: ['午后{feeling}', '{weather}的下午，{mood}', '今天{activity}'],  
      evening: ['夜晚来临，{mood}', '今天{summary}', '{weather}的夜晚'],
      night: ['夜深人静，{feeling}', '睡前{thoughts}', '今日总结：{summary}']
    };
    
    const timeSlot = hour < 10 ? 'morning' : hour < 17 ? 'afternoon' : hour < 22 ? 'evening' : 'night';
    const templates = moodTemplates[timeSlot];
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    const content = this.fillMoodTemplate(template);
    const imageDescriptions = format.imageCount > 0 ? [this.generateMoodImage(timeSlot)] : [];
    
    return { content, imageDescriptions, theme: '心情分享' };
  }

  /**
   * 生成音乐分享内容
   */
  static generateMusicSharingContent(
    conversation: Conversation
  ): { content: string; theme: string } {
    const personality = conversation.characterSettings?.personality || '';
    
    // 根据AI性格选择音乐类型
    const musicTypes = {
      '活泼': ['流行', '电子', '舞曲'],
      '文静': ['轻音乐', '民谣', '古典'],
      '理性': ['爵士', '蓝调', '纯音乐'],
      '感性': ['抒情', '流行', 'R&B'],
      '幽默': ['搞笑', '神曲', '二次元']
    };
    
    let selectedTypes: string[] = ['流行', '摇滚', '民谣', '电子', '爵士'];
    for (const [trait, types] of Object.entries(musicTypes)) {
      if (personality.includes(trait)) {
        selectedTypes = types;
        break;
      }
    }
    
    const musicType = selectedTypes[Math.floor(Math.random() * selectedTypes.length)];
    
    // 生成音乐分享文案
    const shareTemplates = [
      `分享一首超好听的${musicType}！这首歌的旋律真的太棒了 🎵`,
      `最近一直在单曲循环这首${musicType}，推荐给大家 🎧`,
      `发现了一首宝藏${musicType}，歌词写得太有感觉了 🎤`,
      `这首${musicType}完全是我的心情写照，分享给你们 🎼`,
      `深夜听${musicType}真的很有感觉，推荐试试 🌙`
    ];
    
    const content = shareTemplates[Math.floor(Math.random() * shareTemplates.length)];
    
    return { content, theme: '音乐分享' };
  }

  /**
   * 生成文章分享内容
   */
  static generateArticleSharingContent(
    conversation: Conversation
  ): { content: string; theme: string } {
    const personality = conversation.characterSettings?.personality || '';
    
    // 根据AI性格选择文章类型
    const articleTypes = {
      '活泼': ['娱乐', '生活', '美食'],
      '文静': ['文学', '艺术', '哲学'],
      '理性': ['科技', '财经', '时政'],
      '感性': ['情感', '心理', '文化'],
      '幽默': ['搞笑', '奇闻', '趣味']
    };
    
    let selectedTypes: string[] = ['科技', '生活', '文化', '娱乐', '健康'];
    for (const [trait, types] of Object.entries(articleTypes)) {
      if (personality.includes(trait)) {
        selectedTypes = types;
        break;
      }
    }
    
    const articleType = selectedTypes[Math.floor(Math.random() * selectedTypes.length)];
    
    // 生成文章分享文案
    const shareTemplates = [
      `这篇关于${articleType}的文章写得真好，推荐阅读 📖`,
      `发现了一篇很有深度的${articleType}文章，值得一看 ✨`,
      `分享一篇优质的${articleType}文章，内容很有启发性 💡`,
      `这篇${articleType}文章的观点很新颖，和大家分享一下 🤔`,
      `今天读到一篇关于${articleType}的好文，推荐给大家 👍`
    ];
    
    const content = shareTemplates[Math.floor(Math.random() * shareTemplates.length)];
    
    return { content, theme: '文章分享' };
  }

  /**
   * 生成音乐标题
   */
  private static generateMusicTitle(): string {
    const titles = [
      '夜的第七章', '晴天', '告白气球', '稻香', '青花瓷',
      '小幸运', '后来', '遇见', '勇气', '分手快乐',
      '演员', '丑八怪', '认真的雪', '你还要我怎样', '刚刚好',
      '起风了', '千本樱', '打上花火', '红莲华', '前前前世',
      'Shape of You', 'Perfect', 'Thinking Out Loud', 'Photograph', 'Galway Girl'
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  }

  /**
   * 生成音乐艺术家
   */
  private static generateMusicArtist(): string {
    const artists = [
      '周杰伦', '林俊杰', '陈奕迅', '薛之谦', '李荣浩',
      '田馥甄', '张韶涵', '邓紫棋', '蔡依林', '王心凌',
      'Aimer', 'LiSA', '高橋洋子', '米津玄師', 'RADWIMPS',
      'Ed Sheeran', 'Taylor Swift', 'Adele', 'Bruno Mars', 'Maroon 5'
    ];
    return artists[Math.floor(Math.random() * artists.length)];
  }

  /**
   * 生成文章标题
   */
  private static generateArticleTitle(): string {
    const titles = [
      '人工智能的未来发展趋势与挑战',
      '如何提高工作效率：10个实用技巧',
      '心理健康指南：保持积极心态的方法',
      '科技改变生活：智能家居全面解析',
      '美食文化：探索世界各地的特色美食',
      '旅行攻略：发现隐藏的美景与体验',
      '艺术欣赏：理解不同艺术形式的魅力',
      '学习方法：高效记忆与理解技巧',
      '健康生活：科学饮食与运动指南',
      '人际关系：建立良好沟通的秘诀'
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  }

  /**
   * 生成文章描述
   */
  private static generateArticleDescription(): string {
    const descriptions = [
      '深入探讨这个话题的各个方面，为读者提供全面的视角和实用的建议。',
      '通过丰富的案例和专业的分析，帮助读者更好地理解和应用相关知识。',
      '结合最新的研究成果和专家观点，为读者呈现高质量的内容。',
      '以通俗易懂的方式解释复杂概念，让每个人都能轻松掌握核心要点。',
      '从多个角度分析问题，提供创新的思路和解决方案。'
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }
  
  // 辅助方法（省略部分实现细节以节省空间）
  private static weightedRandomSelect(weights: Record<string, number>): string {
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const [key, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) return key;
    }
    
    return Object.keys(weights)[0];
  }
  
  private static getTextTemplates(theme: string): string[] {
    // 简化实现
    return [
      `关于${theme}，今天有些新的想法`,
      `${theme}让我想到了很多`,
      `分享一些关于${theme}的思考`
    ];
  }
  
  private static fillTemplate(template: string): string {
    // 简化实现
    return template.replace(/\{[^}]+\}/g, '很好');
  }
  
  private static getExtendedThought(theme: string): string {
    return ` 生活中总有这样那样的感悟，${theme}给了我很多启发。`;
  }
  
  private static generateImageBasedContent(theme: string, imageCount: number): {
    content: string;
    imageDescriptions: string[];
  } {
    const content = `今天的${theme}分享 ✨`;
    const imageDescriptions = Array(imageCount).fill(0).map((_, i) => 
      `精美的${theme}照片${i + 1}，构图优美，色彩丰富，充满生活气息`
    );
    
    return { content, imageDescriptions };
  }
  
  private static fillMoodTemplate(template: string): string {
    return template
      .replace('{mood}', '心情不错')
      .replace('{feeling}', '很舒适')
      .replace('{activity}', '好好休息')
      .replace('{weather}', '天气很好')
      .replace('{summary}', '收获满满')
      .replace('{thoughts}', '想法很多');
  }
  
  private static generateMoodImage(timeSlot: string): string {
    const imageMap = {
      morning: '清晨的第一缕阳光透过窗帘洒在桌面上，温暖而宁静',
      afternoon: '午后的阳光斜射进咖啡厅，营造出慵懒惬意的氛围',
      evening: '夕阳西下，天空被染成温暖的橙红色，城市开始亮灯',
      night: '夜空中的月亮皎洁明亮，几颗星星点缀其间'
    };
    
    return imageMap[timeSlot as keyof typeof imageMap] || imageMap.evening;
  }
  
  private static generateHashtags(theme: string): string[] {
    const hashtagMap: Record<string, string[]> = {
      '美食': ['#美食分享', '#今日美味', '#探店'],
      '心情分享': ['#今日心情', '#生活感悟', '#小确幸'],
      '新闻分享': ['#热点', '#时事', '#话题讨论'],
      '微博分享': ['#微博热点', '#转发分享', '#有意思'],
      '日常': ['#日常', '#生活记录', '#平凡的美好'],
      'QQ空间转发': ['#QQ空间转发', '#分享生活', '#记录美好'],
      '文字分享': ['#文字分享', '#日常记录', '#生活感悟'],
      '教程分享': ['#教程分享', '#学习记录', '#知识分享'],
      '游戏分享': ['#游戏分享', '#游戏记录', '#游戏感悟']
    };
    
    return hashtagMap[theme] || ['#日常分享', '#生活记录'];
  }
  
  /**
   * 生成QQ空间转发说说内容
   */
  static generateQQForwardContent(
    conversation: Conversation,
    format: MomentsFormat
  ): { content: string; imageDescriptions: string[]; theme: string } {
    const characterSettings = conversation.characterSettings || { nickname: '', personality: '' } as any;
    const qqContent = QQSpaceStyle.generateQQSpaceContent(characterSettings, 
      format.type === 'qq_forward_text' ? 'forward-text' : 'forward-image');
    
    const formattedContent = QQSpaceStyle.formatQQSpaceContentForMoments(qqContent);
    const imageDescriptions = qqContent.images || [];
    
    return {
      content: formattedContent,
      imageDescriptions: imageDescriptions.map(img => `QQ空间转发图片：${img}`),
      theme: 'QQ空间转发'
    };
  }
  
  /**
   * 生成QQ空间小说文段内容
   */
  static generateQQNovelTextContent(): { content: string; theme: string } {
    const qqContent = QQSpaceStyle.generateQQSpaceContent({} as any, 'novel-text');
    const formattedContent = QQSpaceStyle.formatQQSpaceContentForMoments(qqContent);
    
    return {
      content: formattedContent,
      theme: '文字分享'
    };
  }
  
  /**
   * 生成QQ空间教程/素材分享内容
   */
  static generateQQTutorialContent(): { content: string; imageDescriptions: string[]; theme: string } {
    const qqContent = QQSpaceStyle.generateQQSpaceContent({} as any, 'tutorial-image');
    const formattedContent = QQSpaceStyle.formatQQSpaceContentForMoments(qqContent);
    
    const imageDescriptions = (qqContent.images || []).map((_, i) => 
      `教程图片${i + 1}：详细的步骤说明和示例，图文清晰，易于理解`
    );
    
    return {
      content: formattedContent,
      imageDescriptions,
      theme: '教程分享'
    };
  }
  
  /**
   * 生成QQ空间游戏截图内容 - 详细版本
   * 详细描述截图中的具体游戏内容，而不是泛泛而谈
   */
  static generateQQGameContent(): { content: string; imageDescriptions: string[]; theme: string } {
    const qqContent = QQSpaceStyle.generateQQSpaceContent({} as any, 'game-screenshot');
    const formattedContent = QQSpaceStyle.formatQQSpaceContentForMoments(qqContent);
    
    // 详细的游戏截图描述
    const gameScenarios = [
      {
        title: '王者荣耀五杀瞬间',
        details: '游戏截图显示：左上角显示"五杀"金色特效文字，中间是英雄击杀敌方的动作画面，右上角显示5-0的战绩，下方技能栏CD冷却中，小地图显示团战位置在中路。血条几乎见底但成功完成五杀。'
      },
      {
        title: '原神抽卡金色传说',
        details: '抽卡界面截图：屏幕中央是璀璨的金色光芒，五星角色"雷电将军"的立绘缓缓显现，左上角显示剩余原石数量，右下角是"再来十连"按钮，背景是紫色雷电特效。这是第73抽终于出金的激动瞬间。'
      },
      {
        title: '和平精英吃鸡',
        details: '游戏结算截图：大大的"大吉大利，今晚吃鸡！"金色文字，下方显示击杀数15，存活时间32分钟，排名1/100，MVP标志闪耀。左下角显示队友名称，右侧是详细数据统计面板。'
      },
      {
        title: 'LOL超神战绩',
        details: '游戏内截图：屏幕中央显示"超神！"红色特效字样，左侧显示战绩18-2-10，右上角显示游戏时间35:27，小地图上红方高地已被推平，敌方水晶血量仅剩30%。即将获得胜利。'
      },
      {
        title: '蛋仔派对夺冠瞬间',
        details: '胜利截图：可爱的蛋仔角色站在领奖台最高处，头顶皇冠特效，背景是五彩纸屑和气球，左侧显示本局淘汰32人，右侧显示连胜3场，底部是"恭喜获得冠军"的庆祝文字。'
      }
    ];
    
    const selectedScenario = gameScenarios[Math.floor(Math.random() * gameScenarios.length)];
    
    const imageDescriptions = (qqContent.images || []).map((_, i) => 
      `【${selectedScenario.title} - 截图${i + 1}】\n${selectedScenario.details}\n\n这是真实游戏内截图，清晰显示了以上所有界面元素和文字信息。`
    );
    
    return {
      content: formattedContent,
      imageDescriptions,
      theme: '游戏分享'
    };
  }
}

export default DiverseMomentsGenerator;
