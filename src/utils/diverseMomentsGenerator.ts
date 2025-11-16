/**
 * 多样化朋友圈生成器
 * 解决AI朋友圈格式单一、内容重复的问题
 */

import { Conversation } from '../types';
import VirtualNewsGenerator from './virtualNewsGenerator';
import WeiboStyleGenerator from './weiboStyleGenerator';
// import * as RealMomentsContent from './realMomentsContentGenerator'; // TODO: 集成真实朋友圈内容

export interface MomentsFormat {
  type: 'text_only' | 'single_image' | 'multi_image' | 'news_sharing' | 'mood_check' | 'weibo_sharing' | 'music_sharing' | 'article_sharing' | 'coupon_sharing' | 'life_complaint' | 'big_event' | 'repost_sharing' | 'text_image';
  textLength: 'short' | 'medium' | 'long';
  imageCount: number;
  hasHashtags: boolean;
  contentStyle: 'casual' | 'formal' | 'trendy' | 'emotional' | 'informative';
  // 转发说说的特殊字段
  originalAuthor?: string;  // 原作者
  repostComment?: string;   // 转发评论
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
    const formatWeights: Record<MomentsFormat['type'], number> = {
      'text_only': 0.06,           // 6% - 纯文字（真实场景较少）
      'single_image': 0.13,        // 13% - 单图
      'multi_image': 0.09,         // 9% - 多图
      'news_sharing': 0.04,        // 4% - 新闻分享
      'mood_check': 0.03,          // 3% - 心情检查
      'weibo_sharing': 0.04,       // 4% - 微博分享
      'music_sharing': 0.18,       // 18% - 音乐分享（最常见）
      'article_sharing': 0.10,     // 10% - 公众号文章
      'coupon_sharing': 0.07,      // 7% - 优惠券广告
      'life_complaint': 0.09,      // 9% - 生活吐槽+实物照片
      'big_event': 0.03,           // 3% - 大型活动/聚会（较少）
      'repost_sharing': 0.10,      // 10% - 转发说说（QQ空间经典）
      'text_image': 0.04           // 4% - 全文字图片（小说/文章截图）
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
    }
    
    if (personality.includes('文艺') || personality.includes('内向')) {
      formatWeights.text_only *= 1.4;
      formatWeights.mood_check *= 2.0;
    }
    
    if (personality.includes('科技') || personality.includes('知识')) {
      formatWeights.news_sharing *= 2.0;
    }
    
    // 根据时间调整权重
    const hour = new Date().getHours();
    if (hour >= 22 || hour <= 6) {
      // 深夜/清晨更倾向于情感类内容
      formatWeights.mood_check *= 2.0;
      formatWeights.text_only *= 1.3;
    } else if (hour >= 12 && hour <= 14) {
      // 午餐时间更倾向于分享类内容
      formatWeights.multi_image *= 1.4;
      formatWeights.news_sharing *= 1.2;
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
        contentStyle = 'emotional';
        hasHashtags = true;
        break;
        
      case 'repost_sharing':
        imageCount = Math.random() < 0.5 ? 1 : 0; // 50%概率带原图
        textLength = 'medium'; // 包含原文+转发评论
        contentStyle = 'casual';
        hasHashtags = false;
        break;
        
      case 'text_image':
        imageCount = 1; // 全文字图片
        textLength = 'short'; // 简短的配文
        contentStyle = personality.includes('文艺') ? 'emotional' : 'informative';
        hasHashtags = false;
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
  } {
    let format = this.selectOptimalFormat(conversation);
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
        
      case 'repost_sharing':
        {
          const result = this.generateRepostContent(format, variation.themes);
          content = result.content;
          imageDescriptions = result.imageDescriptions;
          theme = result.theme;
          format = result.format;
        }
        break;
        
      case 'text_image':
        ({ content, imageDescriptions, theme } = this.generateTextImageContent(format, variation.themes));
        break;
    }
    
    // 添加话题标签
    if (format.hasHashtags) {
      const hashtags = this.generateHashtags(theme);
      if (hashtags.length > 0 && !content.includes('#')) {
        content += ` ${hashtags.slice(0, 2).join(' ')}`;
      }
    }
    
    return { content, imageDescriptions, theme, format };
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
      '日常': ['#日常', '#生活记录', '#平凡的美好']
    };
    
    return hashtagMap[theme] || ['#日常', '#生活'];
  }
  
  /**
   * 🔥 生成转发说说内容（QQ空间经典）
   */
  static generateRepostContent(
    _format: MomentsFormat,
    _recentThemes: string[]
  ): { content: string; imageDescriptions: string[]; theme: string; format: MomentsFormat } {
    // 虚拟的原作者列表
    const originalAuthors = [
      '科技前沿', '生活智慧', '情感语录', '励志文案', '搞笑段子',
      '深夜语录', '音乐分享', '电影推荐', '美食达人', '旅行日记'
    ];
    
    // 原始内容模板
    const originalContents = [
      '生活不会按你想要的方式进行，它会给你一段时间，让你孤独、迷茫又沉默忧郁。但如果靠这段时间跟自己独处，多看一本书，去做可以做的事，放下过去的人，等你度过低潮，那些独处的时光必定能照亮你的路，也是这些不堪陪你成熟。',
      '人生很多事，终究会随着时间好起来。像很多人原本只是胖，久了就变成了肥。',
      '不要让别人告诉你什么是你做不到的。只要有梦想，就要去追求。那些做不到的人总要告诉你，你也不行。想要什么就得去努力，去追求。',
      '这段很萌，两个人互相取暖，然后就成了爱情的样子。',
      '今天喜欢的事是吃瓜，明天喜欢的事是追剧，后天喜欢的事是睡觉，我就是这样一个善变又专一的人。',
      '世界上最遥远的距离，不是生与死，而是我在阅读理解，而你在完形填空。',
      '你的好，对别人来说就像一颗糖，吃了就没了；你的坏，对别人来说就像一个疤痕，留下了就永远存在。这就是人性。',
      '不要因为走得太远，而忘记为什么出发。我们应该学会思考，学会分析，学会怀疑。'
    ];
    
    // 转发评论模板
    const repostComments = [
      '说的太对了！',
      '深有感触...',
      '忍不住转发一下',
      '这个能处，有事真说',
      '哈哈哈哈确实',
      '赞同！',
      '我也这么觉得',
      '说到心坎里了',
      '很有道理',
      '共鸣了'
    ];
    
    const originalAuthor = originalAuthors[Math.floor(Math.random() * originalAuthors.length)];
    const originalContent = originalContents[Math.floor(Math.random() * originalContents.length)];
    const repostComment = Math.random() < 0.7 ? repostComments[Math.floor(Math.random() * repostComments.length)] : '';
    
    // QQ空间转发格式：@原作者: 原内容 // 我的评论（可选）
    let content = `@${originalAuthor}: ${originalContent}`;
    if (repostComment) {
      content += `\n\n💬 ${repostComment}`;
    }
    
    // 可能包含原图
    const imageDescriptions = _format.imageCount > 0 ? 
      [`${originalAuthor}分享的图片：精美设计，配色协调，传达出深刻的情感和理念`] : [];
    
    const format: MomentsFormat = {
      ..._format,
      originalAuthor,
      repostComment: repostComment || undefined
    };
    
    return {
      content,
      imageDescriptions,
      theme: '转发分享',
      format
    };
  }
  
  /**
   * 🔥 生成全文字图片内容（小说/文章截图）
   */
  static generateTextImageContent(
    _format: MomentsFormat,
    _recentThemes: string[]
  ): { content: string; imageDescriptions: string[]; theme: string } {
    // 文本类型
    const textTypes = [
      { type: '小说截图', sources: ['网络小说', '言情小说', '玄幻小说', '都市小说', '古言小说'] },
      { type: '美文摘录', sources: ['散文集', '诗歌集', '名著', '文学作品'] },
      { type: '语录分享', sources: ['情感语录', '人生哲理', '励志金句', '心灵鸡汤'] },
      { type: '对话截图', sources: ['聊天记录', '评论区', '社交平台'] },
    ];
    
    const selected = textTypes[Math.floor(Math.random() * textTypes.length)];
    const source = selected.sources[Math.floor(Math.random() * selected.sources.length)];
    
    // 配文模板
    const captions = [
      '今天喜欢这段...',
      '这段很萌',
      '太有共鸣了',
      '摘录',
      '好喜欢这个片段',
      '今天分享这段',
      `来自《${source}》`,
      '很喜欢',
      '推荐阅读',
      '截图留念'
    ];
    
    const caption = captions[Math.floor(Math.random() * captions.length)];
    
    // 小说/文章内容示例
    const novelTexts = [
      '他站在窗前，看着窗外的夜色，心中五味杂陈。从前种种，宛如昨日，却又仿佛隔世。他的手指轻轻摩挲着杯壁，眼神空洞而迷茫。良久，他叹了口气，转身离开。这一夜，他失眠了。',
      '"你爱我吗？"她突然问道。\n他愣了一下，继续低头看书，"爱过。"\n"那现在呢？"\n"现在？"他抬起头，眼中满是疲惫，"现在只想好好生活。"',
      '所谓成长，就是把原本看重的东西看轻一点，然后把原本看轻的东西看重一点。人生就是这样，在不断地放下与拾起中，找到平衡。',
      '他终于明白了一个道理：这世上最难的，不是相爱，而是相守。爱情很美，但生活更实在。当激情褪去，剩下的只有柴米油盐，和永远磨合不完的性格差异。',
      '阳光透过云层洒在身上，温暖而舒适。她坐在长椅上，捧着一本书，嘴角带着浅浅的微笑。这个午后，时光仿佛都慢了下来，一切都刚刚好。',
      '人与人之间，最怕的不是误会，而是隔阂。误会可以解释，隔阂却需要时间去化解。而很多时候，我们都没有那么多时间。'
    ];
    
    const textContent = novelTexts[Math.floor(Math.random() * novelTexts.length)];
    
    // 图片描述：全文字截图
    const imageDescription = `${selected.type}：深色背景上的白色文字，内容为"${textContent.substring(0, 50)}..."，排版整齐，字体清晰，底部显示"${source}"`;
    
    return {
      content: caption,
      imageDescriptions: [imageDescription],
      theme: selected.type
    };
  }
}

export default DiverseMomentsGenerator;
