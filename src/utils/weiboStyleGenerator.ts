/**
 * 微博风格内容生成器
 * 模拟真实微博的布局和排版风格
 */

export interface WeiboPost {
  id: string;
  username: string;
  userAvatar: string;
  postTime: string;
  hashtag?: string;
  content: string;
  imageDescription?: string;
  engagement: {
    views: number;
    reposts: number;
    comments: number;
    likes: number;
  };
  topic: 'tech' | 'finance' | 'entertainment' | 'lifestyle' | 'news';
}

export class WeiboStyleGenerator {
  
  private static usernames = {
    tech: ['科技前沿', '数码评测师', '互联网观察', 'AI科技圈', '科技日报'],
    finance: ['财经速递', '投资理财通', '经济观察报', '财富密码', '股市风云'],
    entertainment: ['娱乐圈爆料', '影视资讯', '明星日常', '综艺大观', '娱乐前线'],
    lifestyle: ['生活美学', '潮流指南', '美食探店', '旅行达人', '时尚博主'],
    news: ['热点新闻', '今日资讯', '新闻速报', '社会观察', '时事评论'],
    sports: ['体育快报', '运动健身', '足球世界', '篮球前线', '健身达人']
  };

  private static avatarColors = ['#1DA57A', '#722ED1', '#13C2C2', '#FA8C16', '#F04864', '#2F54EB'];

  private static contentTemplates = {
    tech: [
      {
        hashtag: '#科技创新#',
        template: '【{title}】{time}，{company}{event}。据{source}，{detail}。{analysis} {question}',
        titles: ['重磅！', 'AI突破！', '科技前沿！', '数字化转型！'],
        events: ['发布重要更新', '推出革命性功能', '达成技术突破', '宣布战略合作'],
        sources: ['内部消息', '官方发布', '行业报告', '数据显示'],
        analyses: ['这一突破将改变行业格局。', '用户体验将大幅提升。', '技术边界再次被突破。'],
        questions: ['你怎么看？', '期待更多突破！', '科技改变生活！']
      }
    ],
    
    finance: [
      {
        hashtag: '#财经热点#',
        template: '【{title}】截至{time}，{market}{trend}。{data}，{analysis} {question}',
        titles: ['市场动态！', '经济数据！', '投资机会！', '财经快讯！'],
        trends: ['创新高', '大幅波动', '稳中有升', '震荡调整'],
        data: ['成交量突破历史记录', '多项指标表现亮眼', '资金流入明显加速'],
        analyses: ['专家表示这体现了市场信心。', '投资者情绪持续乐观。', '基本面支撑依然稳固。'],
        questions: ['你的投资策略如何？', '理性投资，稳健为主！', '市场有风险，投资需谨慎！']
      }
    ],

    entertainment: [
      {
        hashtag: '#娱乐圈#',
        template: '【{title}】{celebrity}{event}！{detail}，{reaction} {question}',
        titles: ['独家爆料！', '重磅消息！', '娱乐快讯！', '星闻速递！'],
        celebrities: ['当红流量', '实力演员', '人气爱豆', '知名导演'],
        events: ['新作品官宣', '获得重要奖项', '参与公益活动', '时尚大片曝光'],
        details: ['粉丝期待已久', '造型惊艳全场', '演技获得认可', '正能量满满'],
        reactions: ['网友纷纷点赞支持。', '话题迅速登上热搜。', '业内人士高度评价。'],
        questions: ['你最期待什么？', '颜值演技都在线！', '支持正能量艺人！']
      }
    ],

    lifestyle: [
      {
        hashtag: '#生活方式#',
        template: '【{title}】{city}新开{place}，{feature}！{description}，{trend} {question}',
        titles: ['探店推荐！', '生活美学！', '城市新发现！', '潮流趋势！'],
        cities: ['上海', '北京', '深圳', '成都', '杭州', '南京'],
        places: ['网红咖啡厅', '艺术展览馆', '创意书店', '主题餐厅', '设计师店铺'],
        features: ['颜值爆表', '氛围感拉满', '创意十足', '治愈系满分'],
        descriptions: ['每个角落都是拍照圣地', '设计感和实用性完美结合', '年轻人的新聚集地'],
        trends: ['已成为新的城市地标。', '排队两小时也值得。', '社交媒体刷屏推荐。'],
        questions: ['你去过了吗？', '周末安排上！', '城市生活就该这样精彩！']
      }
    ],

    news: [
      {
        hashtag: '#社会热点#',
        template: '【{title}】{date}，{event}。{detail}，{impact} {question}',
        titles: ['重要消息！', '社会关注！', '正能量！', '民生热点！'],
        events: ['重要政策发布', '公益活动启动', '社会现象引关注', '暖心事件发生'],
        details: ['引发广泛讨论', '得到积极响应', '体现社会进步', '传递正能量'],
        impacts: ['将带来积极影响。', '值得我们深思。', '展现了社会责任感。'],
        questions: ['你怎么看？', '为正能量点赞！', '社会需要更多这样的声音！']
      }
    ]
  };

  /**
   * 生成微博风格内容
   */
  static generateWeiboPost(topic?: WeiboPost['topic']): WeiboPost {
    const selectedTopic = topic || this.getRandomTopic();
    const username = this.getRandomUsername(selectedTopic);
    const template = this.getRandomTemplate(selectedTopic);
    const content = this.fillTemplate(template);
    
    return {
      id: `weibo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username,
      userAvatar: this.generateAvatar(username),
      postTime: this.generatePostTime(),
      hashtag: template.hashtag,
      content,
      imageDescription: this.generateImageDescription(selectedTopic),
      engagement: this.generateEngagement(),
      topic: selectedTopic
    };
  }

  /**
   * 生成微博截图描述（用于朋友圈图片描述）
   */
  static generateWeiboScreenshotDescription(weiboPost: WeiboPost): string {
    const { username, postTime, hashtag, content, engagement } = weiboPost;
    
    return `微博截图：顶部显示话题标签"${hashtag}"，用户"${username}"在${postTime}发布内容："${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"。底部显示转发${engagement.reposts}次，评论${engagement.comments}条，点赞${engagement.likes}次，阅读量${engagement.views}。整体采用简洁的白色背景，蓝色链接文字，符合微博经典设计风格。`;
  }

  /**
   * 为AI生成分享微博的朋友圈内容
   */
  static generateMomentsShareContent(aiPersonality: string, weiboPost: WeiboPost): {
    content: string;
    imageDescription: string;
  } {
    const reactions = {
      tech: ['这个技术突破真的很厉害', '科技发展太快了', '期待更多创新'],
      finance: ['市场变化确实值得关注', '投资需要理性分析', '财经数据很有参考价值'],
      entertainment: ['娱乐圈真是精彩', '支持正能量艺人', '这个消息很有趣'],
      lifestyle: ['生活就该这么精彩', '种草了这个地方', '城市生活真丰富'],
      news: ['这个话题很有意义', '社会正能量值得点赞', '引人深思的内容'],
      sports: ['体育精神值得学习', '运动健康最重要', '这个比赛很精彩']
    };

    const personalityReactions = {
      '活泼': ['哇！', '绝绝子！', '太有意思了！'],
      '理性': ['确实', '值得思考', '有道理'],
      '文艺': ['深有感触', '引人深思', '很有启发'],
      '幽默': ['哈哈哈', '有意思', '笑死我了']
    };

    // 选择合适的反应
    let reaction = reactions[weiboPost.topic][Math.floor(Math.random() * reactions[weiboPost.topic].length)];
    
    // 根据AI性格调整语气
    for (const [trait, expressions] of Object.entries(personalityReactions)) {
      if (aiPersonality.includes(trait)) {
        const expression = expressions[Math.floor(Math.random() * expressions.length)];
        reaction = `${expression} ${reaction}`;
        break;
      }
    }

    const shareFormats = [
      `${reaction} 👇`,
      `分享一个${weiboPost.topic === 'tech' ? '科技' : weiboPost.topic === 'finance' ? '财经' : '有趣的'}话题 ${reaction}`,
      `看到这个微博，${reaction}`,
      `${reaction} 大家怎么看？`
    ];

    const content = shareFormats[Math.floor(Math.random() * shareFormats.length)];
    const imageDescription = this.generateWeiboScreenshotDescription(weiboPost);

    return { content, imageDescription };
  }

  // 私有辅助方法
  private static getRandomTopic(): WeiboPost['topic'] {
    const topics: WeiboPost['topic'][] = ['tech', 'finance', 'entertainment', 'lifestyle', 'news'];
    return topics[Math.floor(Math.random() * topics.length)];
  }

  private static getRandomUsername(topic: WeiboPost['topic']): string {
    const names = this.usernames[topic];
    return names[Math.floor(Math.random() * names.length)];
  }

  private static generateAvatar(username: string): string {
    const color = this.avatarColors[username.length % this.avatarColors.length];
    return color;
  }

  private static generatePostTime(): string {
    const hours = Math.floor(Math.random() * 24);
    const minutes = Math.floor(Math.random() * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  private static getRandomTemplate(topic: WeiboPost['topic']) {
    const templates = this.contentTemplates[topic];
    if (!templates || templates.length === 0) {
      // 默认模板
      return {
        hashtag: '#热门话题#',
        template: '【重要消息！】{content}，大家怎么看？',
        contents: ['这是一个值得关注的话题', '最新动态值得了解', '有趣的现象值得讨论']
      };
    }
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private static fillTemplate(template: any): string {
    let content = template.template;
    
    // 替换模板中的占位符
    Object.keys(template).forEach(key => {
      if (key !== 'template' && key !== 'hashtag' && Array.isArray(template[key])) {
        const placeholder = `{${key.slice(0, -1)}}`; // 去掉复数s
        const values = template[key];
        const randomValue = values[Math.floor(Math.random() * values.length)];
        content = content.replace(new RegExp(placeholder, 'g'), randomValue);
      }
    });

    // 添加时间戳
    const now = new Date();
    const timeStr = `${now.getMonth() + 1}月${now.getDate()}日${now.getHours()}时`;
    content = content.replace('{time}', timeStr);
    
    return content;
  }

  private static generateEngagement(): WeiboPost['engagement'] {
    const baseViews = Math.floor(Math.random() * 5000) + 1000;
    return {
      views: baseViews,
      reposts: Math.floor(baseViews * (Math.random() * 0.1 + 0.02)), // 2-12%
      comments: Math.floor(baseViews * (Math.random() * 0.05 + 0.001)), // 0.1-5.1%
      likes: Math.floor(baseViews * (Math.random() * 0.15 + 0.05)) // 5-20%
    };
  }

  private static generateImageDescription(topic: WeiboPost['topic']): string {
    const descriptions: Record<WeiboPost['topic'], string> = {
      tech: '科技类数据图表，蓝色主色调，包含增长曲线和关键数据指标',
      finance: '财经数据可视化图表，红绿配色显示涨跌情况，包含K线图和统计数据',
      entertainment: '娱乐明星高清写真或活动现场照片，时尚造型，专业摄影风格',
      lifestyle: '生活方式相关的精美照片，温馨的色调，展现品质生活场景',
      news: '新闻事件相关图片或信息图表，严肃正式的设计风格'
    };

    return descriptions[topic] || '相关主题的精美配图，设计简洁大方，色彩搭配和谐';
  }

  /**
   * 批量生成今日热门微博
   */
  static generateDailyHotWeibos(count: number = 5): WeiboPost[] {
    const topics: WeiboPost['topic'][] = ['tech', 'finance', 'entertainment', 'lifestyle', 'news'];
    const weibos: WeiboPost[] = [];
    
    for (let i = 0; i < count; i++) {
      const topic = topics[i % topics.length];
      const weibo = this.generateWeiboPost(topic);
      
      // 调整发布时间，模拟一天内不同时间发布
      const hoursAgo = Math.floor(Math.random() * 12) + 1;
      const publishTime = new Date();
      publishTime.setHours(publishTime.getHours() - hoursAgo);
      
      weibo.postTime = `${publishTime.getHours().toString().padStart(2, '0')}:${publishTime.getMinutes().toString().padStart(2, '0')}`;
      
      weibos.push(weibo);
    }
    
    return weibos.sort((a, b) => b.engagement.views - a.engagement.views); // 按热度排序
  }
}

export default WeiboStyleGenerator;
