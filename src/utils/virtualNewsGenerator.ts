/**
 * 虚拟新闻和热搜生成器
 * 创建虚拟但真实的时事内容，让AI有更多话题可聊
 */

export interface VirtualNews {
  id: string;
  type: 'tech' | 'entertainment' | 'lifestyle' | 'social' | 'trending';
  title: string;
  summary?: string;
  hashtag: string;
  engagement: 'low' | 'medium' | 'high';
  createdAt: number;
}

export class VirtualNewsGenerator {
  private static newsTemplates: Record<VirtualNews['type'], Array<{title: string, hashtag: string, summaries: string[]}>> = {
    tech: [
      {
        title: '{company}推出新功能，{feature}引发热议',
        hashtag: '#科技创新',
        summaries: ['用户体验大幅提升', '引发行业关注', '网友反响热烈']
      },
      {
        title: '{tech_event}成为新热点，{impact}',
        hashtag: '#数字生活',
        summaries: ['改变生活方式', '技术革新突破', '未来趋势显现']
      },
      {
        title: 'AI{application}新突破，{achievement}',
        hashtag: '#人工智能',
        summaries: ['技术边界再次突破', '应用场景更广泛', '智能化进程加速']
      }
    ],

    entertainment: [
      {
        title: '{celebrity}新作品{work}上线，{reaction}',
        hashtag: '#娱乐圈',
        summaries: ['粉丝期待已久', '口碑爆棚', '话题热度不减']
      },
      {
        title: '综艺节目{show}收官，{highlight}成亮点',
        hashtag: '#综艺',
        summaries: ['观众不舍结束', '收视创新高', '网友热议不断']
      },
      {
        title: '{event}颁奖典礼落幕，{winner}成大赢家',
        hashtag: '#颁奖典礼',
        summaries: ['星光熠熠', '惊喜不断', '时尚看点满满']
      }
    ],

    lifestyle: [
      {
        title: '{city}新开{place}，成为打卡新地标',
        hashtag: '#城市探索',
        summaries: ['年轻人聚集地', '拍照圣地', 'ins风满满']
      },
      {
        title: '{food}成为新网红美食，{description}',
        hashtag: '#美食探店',
        summaries: ['排队两小时', '社交媒体刷屏', '美食博主力推']
      },
      {
        title: '{activity}兴起新玩法，{feature}受追捧',
        hashtag: '#生活方式',
        summaries: ['年轻人新宠', '社交新方式', '生活仪式感拉满']
      }
    ],

    social: [
      {
        title: '{social_phenomenon}引发全网讨论，{perspective}',
        hashtag: '#社会话题',
        summaries: ['观点多元化', '引人深思', '话题持续发酵']
      },
      {
        title: '{campaign}活动刷屏，{participation}',
        hashtag: '#正能量',
        summaries: ['全民参与', '传递温暖', '社会正能量满满']
      },
      {
        title: '{trend}成为新现象，{analysis}',
        hashtag: '#社会观察',
        summaries: ['反映时代特征', '值得关注', '现象级话题']
      }
    ],

    trending: [
      {
        title: '#{trending_topic}# 冲上热搜第一',
        hashtag: '#热搜',
        summaries: ['全网讨论', '热度爆表', '话题持续升温']
      },
      {
        title: '{meme}梗爆火全网，{spread}',
        hashtag: '#网络热梗',
        summaries: ['创意无限', '传播神速', '网友玩梗不停']
      },
      {
        title: '{challenge}挑战席卷社交平台，{stats}',
        hashtag: '#全民挑战',
        summaries: ['参与人数破千万', '创意层出不穷', '正能量传播']
      }
    ]
  };

  private static contentPool = {
    // 科技相关
    company: ['苹果', '华为', '小米', '腾讯', '阿里', '字节跳动', 'OpenAI', '微软'],
    feature: ['AI助手', '新界面设计', '隐私保护功能', '智能推荐', '语音识别'],
    tech_event: ['元宇宙', '区块链', '量子计算', '自动驾驶', '5G应用', 'VR/AR'],
    application: ['绘画', '写作', '翻译', '编程', '音乐创作', '视频制作'],
    achievement: ['效率提升显著', '创意突破边界', '准确率达新高'],
    impact: ['用户体验革新', '行业格局改变', '技术标准提升'],

    // 娱乐相关  
    celebrity: ['肖战', '易烊千玺', '王一博', '赵丽颖', '杨幂', '迪丽热巴', '刘亦菲'],
    work: ['新电影', '新专辑', '新剧', '综艺', '代言', '写真'],
    reaction: ['口碑炸裂', '预售火爆', '期待值拉满', '话题度飙升'],
    show: ['《向往的生活》', '《奔跑吧》', '《极限挑战》', '《王牌对王牌》'],
    highlight: ['温馨互动', '搞笑名场面', '感人瞬间', '才艺展示'],
    event: ['金鹰节', '白玉兰', '金马奖', '微博之夜', '时尚盛典'],
    winner: ['实力派演员', '人气爱豆', '新生代艺人', '老戏骨'],

    // 生活相关
    city: ['上海', '北京', '深圳', '成都', '杭州', '南京', '西安', '重庆'],
    place: ['咖啡厅', '艺术馆', '书店', '市集', '公园', '商业街', '主题餐厅'],
    food: ['螺蛳粉冰淇淋', '芝士蛋挞', '流心汤圆', '网红奶茶', '创意甜品'],
    description: ['颜值超高', '味道绝绝子', '拍照必备', '限时供应'],
    activity: ['城市漫步', '露营', '飞盘', '桨板', '攀岩', '夜市逛吃'],

    // 社会相关
    social_phenomenon: ['打工人现象', '躺平文化', '精神内耗', '数字鸿沟'],
    perspective: ['多角度解读', '专家观点分歧', '年轻人看法独特'],
    campaign: ['环保行动', '公益活动', '志愿服务', '助学计划'],
    participation: ['响应积极', '创意十足', '影响深远'],
    trend: ['新消费观念', '工作方式变化', '社交新模式'],
    analysis: ['反映深层需求', '体现价值观变迁', '引发思考'],

    // 热搜相关
    trending_topic: ['周末计划', '秋日穿搭', '深夜食堂', '下班后生活', '城市夜景'],
    meme: ['emo文学', '摆烂艺术', '精神内耗', 'i人e人', '社死现场'],
    spread: ['各平台刷屏', '创作无数', '玩法升级'],
    challenge: ['秋日拍照', '治愈系生活', '城市探索', '美食打卡'],
    stats: ['播放量破亿', '参与度超高', '传播范围极广']
  };

  /**
   * 生成虚拟新闻
   */
  static generateNews(type?: VirtualNews['type']): VirtualNews {
    const newsType = type || this.getRandomType();
    const templates = this.newsTemplates[newsType];
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    // 填充模板
    let title = template.title;
    let summary = template.summaries[Math.floor(Math.random() * template.summaries.length)];
    
    // 替换占位符
    Object.entries(this.contentPool).forEach(([key, values]) => {
      const placeholder = `{${key}}`;
      while (title.includes(placeholder)) {
        const randomValue = values[Math.floor(Math.random() * values.length)];
        title = title.replace(placeholder, randomValue);
      }
      while (summary.includes(placeholder)) {
        const randomValue = values[Math.floor(Math.random() * values.length)];
        summary = summary.replace(placeholder, randomValue);
      }
    });

    return {
      id: `news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: newsType,
      title,
      summary,
      hashtag: template.hashtag,
      engagement: this.getRandomEngagement(),
      createdAt: Date.now()
    };
  }

  /**
   * 生成每日热点新闻集合
   */
  static generateDailyNews(count: number = 8): VirtualNews[] {
    const news: VirtualNews[] = [];
    const types: VirtualNews['type'][] = ['tech', 'entertainment', 'lifestyle', 'social', 'trending'];
    
    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      news.push(this.generateNews(type));
      
      // 添加时间间隔，模拟不同时间发布
      news[i].createdAt = Date.now() - (count - i) * 2 * 60 * 60 * 1000; // 每2小时一条
    }
    
    return news.sort((a, b) => b.createdAt - a.createdAt); // 按时间倒序
  }

  /**
   * 根据AI性格推荐新闻类型
   */
  static getRecommendedNewsType(personality?: string): VirtualNews['type'] {
    if (!personality) return this.getRandomType();
    
    const personalityMap: Record<string, VirtualNews['type'][]> = {
      '科技': ['tech', 'trending'],
      '时尚': ['lifestyle', 'entertainment'],  
      '文艺': ['social', 'lifestyle'],
      '活泼': ['entertainment', 'trending'],
      '沉稳': ['tech', 'social'],
      '吃货': ['lifestyle'],
      '宅': ['tech', 'entertainment']
    };
    
    for (const [trait, types] of Object.entries(personalityMap)) {
      if (personality.includes(trait)) {
        return types[Math.floor(Math.random() * types.length)];
      }
    }
    
    return this.getRandomType();
  }

  /**
   * 生成AI评论这些新闻的内容
   */
  static generateNewsComment(news: VirtualNews, aiPersonality?: string): string {
    const commentTemplates = {
      positive: [
        '这个{topic}真的很有意思！',
        '终于等到{topic}了，期待！',
        '{topic}确实值得关注',
        '看到{topic}就想到了{association}',
        '这个{topic}的创意绝了'
      ],
      neutral: [
        '关于{topic}，大家怎么看？',
        '{topic}引发了很多思考',
        '看到{topic}有感而发',
        '{topic}确实是个热门话题',
        '对{topic}有点好奇'
      ],
      enthusiastic: [
        '{topic}yyds！必须支持！',
        '哇！{topic}也太棒了吧',
        '被{topic}狠狠种草了',
        '{topic}直接破防了',
        '{topic}绝绝子！'
      ]
    };
    
    let style = 'neutral';
    if (aiPersonality?.includes('活泼') || aiPersonality?.includes('外向')) {
      style = 'enthusiastic';
    } else if (aiPersonality?.includes('积极') || aiPersonality?.includes('乐观')) {
      style = 'positive';
    }
    
    const templates = commentTemplates[style as keyof typeof commentTemplates];
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    // 简化话题
    const topic = news.title.length > 10 ? news.title.substring(0, 10) + '...' : news.title;
    
    return template.replace('{topic}', topic).replace('{association}', this.getAssociation(news.type));
  }

  private static getRandomType(): VirtualNews['type'] {
    const types: VirtualNews['type'][] = ['tech', 'entertainment', 'lifestyle', 'social', 'trending'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private static getRandomEngagement(): 'low' | 'medium' | 'high' {
    const rand = Math.random();
    if (rand < 0.2) return 'low';
    if (rand < 0.7) return 'medium';
    return 'high';
  }

  private static getAssociation(type: VirtualNews['type']): string {
    const associations: Record<VirtualNews['type'], string> = {
      tech: '未来生活',
      entertainment: '青春回忆',
      lifestyle: '美好日常',
      social: '现实感悟',
      trending: '网络文化'
    };
    return associations[type];
  }

  /**
   * 获取今日推荐新闻
   */
  static getTodayRecommendedNews(personality?: string, limit: number = 3): VirtualNews[] {
    // 检查是否已有今日新闻缓存
    const today = new Date().toDateString();
    const cacheKey = `daily_news_${today}`;
    
    let dailyNews: VirtualNews[];
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        dailyNews = JSON.parse(cached);
      } else {
        dailyNews = this.generateDailyNews();
        localStorage.setItem(cacheKey, JSON.stringify(dailyNews));
      }
    } catch {
      dailyNews = this.generateDailyNews();
    }
    
    // 根据性格筛选
    if (personality) {
      const recommendedType = this.getRecommendedNewsType(personality);
      const filtered = dailyNews.filter(news => news.type === recommendedType);
      if (filtered.length > 0) {
        return filtered.slice(0, limit);
      }
    }
    
    // 随机返回
    return dailyNews.sort(() => Math.random() - 0.5).slice(0, limit);
  }
}

export default VirtualNewsGenerator;
