/**
 * 潮流内容生成器
 * 为AI朋友圈提供时下热梗、潮流话题和真实感内容
 */

export interface TrendingContent {
  category: 'meme' | 'lifestyle' | 'food' | 'travel' | 'mood' | 'work' | 'entertainment' | 'shopping';
  keywords: string[];
  templates: string[];
  hashtags?: string[];
  seasonalBoost?: number; // 季节性加权
}

export class TrendingContentGenerator {
  
  /**
   * 获取当前热门内容库
   */
  static getTrendingContent(): TrendingContent[] {
    const currentMonth = new Date().getMonth() + 1;
    const isWinter = currentMonth === 12 || currentMonth === 1 || currentMonth === 2;
    const isSpring = currentMonth >= 3 && currentMonth <= 5;
    const isSummer = currentMonth >= 6 && currentMonth <= 8;
    const isAutumn = currentMonth >= 9 && currentMonth <= 11;
    
    const baseContent: Omit<TrendingContent, 'seasonalBoost'>[] = [
      // 热梗和网络用语
      {
        category: 'meme',
        keywords: ['yyds', '绝绝子', '摆烂', 'emo', '内耗', '躺平', '卷王', '社死', '破防', '整顿'],
        templates: [
          '今天的{weather}真的是yyds 😭',
          '又开始emo了，{reason}',
          '决定摆烂到周末 🛌',
          '被{something}整顿了',
          '这个{item}绝绝子！',
          '今天又被自己卷到了 🫠',
          '社死现场：{situation}',
          '{something}直接把我破防了'
        ],
        hashtags: ['#今日份快乐', '#emo时刻', '#摆烂日常']
      },
      
      // 生活方式
      {
        category: 'lifestyle',
        keywords: ['精致', '慢生活', '仪式感', '氛围感', '治愈', 'city walk', '多巴胺', '松弛感'],
        templates: [
          '给生活来点仪式感 ✨',
          '今天的氛围感拉满了',
          '慢生活真的很治愈',
          'city walk中，发现了宝藏{place}',
          '多巴胺{activity}，心情瞬间好了',
          '享受这份松弛感',
          '精致生活从{something}开始',
          '治愈系的{time}时光'
        ],
        hashtags: ['#慢生活', '#仪式感', '#氛围感满分', '#治愈系']
      },
      
      // 美食相关
      {
        category: 'food',
        keywords: ['氛围', '绝了', '上头', '治愈', '顶级', '巨好吃', '真香', '爱了爱了'],
        templates: [
          '这个{food}的氛围感绝了 🍰',
          '{restaurant}真的让我上头了',
          '深夜{food}，太治愈了',
          '发现宝藏{food_type}，巨好吃！',
          '真香预警：{food} 📸',
          '顶级{food}体验，爱了爱了',
          '{food}yyds，已经连续吃了三天',
          '这个{flavor}味道直接破防'
        ],
        hashtags: ['#美食分享', '#探店', '#深夜放毒', '#真香系列']
      },
      
      // 心情感悟
      {
        category: 'mood',
        keywords: ['emo', '治愈', '破防', '松弛', '温柔', '小确幸', '人间清醒', '岁月静好'],
        templates: [
          '今日份小确幸：{something} 🌸',
          '突然被{something}治愈了',
          '人间清醒时刻：{realization}',
          '岁月静好，{feeling}',
          '温柔的{time}，{mood}',
          '今天的心情是{emoji} {description}',
          '{weather}天气配{activity}，绝配',
          '被生活的小美好破防了'
        ],
        hashtags: ['#今日心情', '#小确幸', '#人间清醒', '#温柔时光']
      },
      
      // 工作学习
      {
        category: 'work',
        keywords: ['干饭人', '打工人', '社畜', '摸鱼', '下班', '周五', '梦想', '奋斗'],
        templates: [
          '干饭人干饭魂 🍚',
          '打工人的{time}，{activity}',
          '社畜日常：{situation}',
          '摸鱼时间到！{activity}',
          '感谢{day}，终于下班了',
          '周五的快乐谁懂 🎉',
          '为了{goal}，今天也要努力',
          '奋斗的意义：{meaning}'
        ],
        hashtags: ['#打工人', '#干饭人', '#周五快乐', '#奋斗日常']
      },
      
      // 娱乐休闲
      {
        category: 'entertainment',
        keywords: ['追剧', '游戏', '音乐', '电影', '综艺', '直播', 'k歌', '追星'],
        templates: [
          '又熬夜追剧了 😴 {drama}真的上头',
          '这个{game}太好玩了，根本停不下来',
          '单曲循环{song}，已经听了一整天',
          '{movie}看哭了，{reason}',
          '今天的{variety_show}笑死我了',
          '刷{platform}刷到凌晨，明天又要熬夜补觉',
          'k歌现场：{song} 🎤',
          '{star}今天又美到我了 ✨'
        ],
        hashtags: ['#追剧日常', '#游戏时间', '#音乐分享', '#电影推荐']
      },
      
      // 购物消费 
      {
        category: 'shopping',
        keywords: ['种草', '拔草', '剁手', '好物', '性价比', '颜值', '实用', '宝藏'],
        templates: [
          '又被{item}种草了 💰',
          '终于拔草了{product}，真的值',
          '双十一剁手清单：{items}',
          '发现宝藏好物：{item} ⭐',
          '这个{product}性价比绝了',
          '颜值即正义：{item}',
          '实用好物推荐：{product}',
          '宝藏{store}，东西都超棒'
        ],
        hashtags: ['#好物推荐', '#种草日常', '#剁手党', '#宝藏店铺']
      }
    ];
    
    return baseContent.map((content): TrendingContent => {
      // 添加季节性加权
      let seasonalBoost = 1.0;
      if (content.category === 'food' && (isWinter || isAutumn)) seasonalBoost = 1.2;
      if (content.category === 'mood' && (isSpring || isAutumn)) seasonalBoost = 1.1;
      if (content.category === 'lifestyle' && isSummer) seasonalBoost = 1.1;
      
      return { ...content, seasonalBoost };
    });
  }
  
  /**
   * 根据时间和情境生成内容建议
   */
  static generateContentSuggestion(
    hour: number,
    personality?: string
  ): { content: string; hashtags: string[] } {
    const trendingContent = this.getTrendingContent();
    const timeOfDay = this.getTimeOfDay(hour);
    
    // 根据时间筛选合适的内容类型
    let suitableCategories: TrendingContent['category'][] = [];
    
    if (timeOfDay === 'morning') {
      suitableCategories = ['lifestyle', 'mood', 'work', 'food'];
    } else if (timeOfDay === 'afternoon') {
      suitableCategories = ['work', 'food', 'shopping', 'lifestyle'];
    } else if (timeOfDay === 'evening') {
      suitableCategories = ['food', 'entertainment', 'mood', 'lifestyle'];
    } else { // late night
      suitableCategories = ['entertainment', 'mood', 'meme', 'food'];
    }
    
    // 根据性格调整内容偏好
    if (personality) {
      if (personality.includes('活泼') || personality.includes('外向')) {
        suitableCategories.push('meme', 'entertainment');
      }
      if (personality.includes('文艺') || personality.includes('温柔')) {
        suitableCategories.push('lifestyle', 'mood');
      }
      if (personality.includes('吃货') || personality.includes('美食')) {
        suitableCategories.unshift('food');
      }
    }
    
    // 筛选合适的内容
    const suitableContent = trendingContent.filter(content => 
      suitableCategories.includes(content.category)
    );
    
    if (suitableContent.length === 0) {
      return this.getFallbackContent(timeOfDay);
    }
    
    // 随机选择内容类型（考虑季节性加权）
    const weightedContent = suitableContent.filter(content => 
      Math.random() < (content.seasonalBoost || 1.0)
    );
    
    const selectedContent = weightedContent.length > 0 
      ? weightedContent[Math.floor(Math.random() * weightedContent.length)]
      : suitableContent[Math.floor(Math.random() * suitableContent.length)];
    
    // 随机选择模板
    const template = selectedContent.templates[
      Math.floor(Math.random() * selectedContent.templates.length)
    ];
    
    // 填充模板中的变量
    const filledContent = this.fillTemplate(template, timeOfDay);
    
    return {
      content: filledContent,
      hashtags: selectedContent.hashtags || []
    };
  }
  
  /**
   * 获取时间段
   */
  private static getTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon'; 
    if (hour >= 17 && hour < 23) return 'evening';
    return 'night';
  }
  
  /**
   * 填充模板变量
   */
  private static fillTemplate(template: string, timeOfDay: string): string {
    const placeholders = {
      // 通用变量
      weather: ['阳光', '微风', '细雨', '云朵', '蓝天', '夕阳', '月光'],
      time: ['早晨', '上午', '下午', '傍晚', '夜晚', '深夜'],
      emoji: ['😊', '🥰', '😌', '🌸', '✨', '🌅', '🌙', '🍃'],
      
      // 食物相关
      food: ['奶茶', '咖啡', '蛋糕', '火锅', '烧烤', '小龙虾', '冰淇淋', '寿司', '面条', '汤圆'],
      food_type: ['甜品店', '咖啡厅', '小餐厅', '夜宵摊', '网红店'],
      restaurant: ['这家店', '新开的餐厅', '楼下小店', '网红餐厅'],
      flavor: ['甜甜的', '香香的', '麻辣的', '清爽的', '治愈的'],
      
      // 地点相关
      place: ['咖啡厅', '书店', '公园', '小径', '角落', '天台', '湖边'],
      
      // 活动相关
      activity: ['散步', '读书', '听歌', '发呆', '拍照', '喝茶', '看云'],
      
      // 情感相关
      feeling: ['很满足', '很治愈', '很安心', '很温暖', '很惬意'],
      reason: ['想家了', '压力大', '太累了', '被感动了', '莫名其妙'],
      something: ['这首歌', '这本书', '这杯咖啡', '这个瞬间', '这份温暖'],
      
      // 其他
      item: ['包包', '口红', '衣服', '鞋子', '配饰', '数码产品'],
      product: ['护肤品', '彩妆', '零食', '文具', '家居用品'],
      goal: ['梦想', '目标', '更好的自己', '小目标']
    };
    
    // 时间相关的动态变量
    if (timeOfDay === 'morning') {
      placeholders.time = ['清晨', '早晨', '上午'];
      placeholders.activity = ['晨跑', '早餐', '上班', '开会', '工作'];
    } else if (timeOfDay === 'evening') {
      placeholders.time = ['傍晚', '黄昏', '夜晚'];
      placeholders.activity = ['下班', '晚餐', '散步', '追剧', '放松'];
    }
    
    let result = template;
    
    // 替换所有占位符
    Object.entries(placeholders).forEach(([key, values]) => {
      const placeholder = `{${key}}`;
      while (result.includes(placeholder)) {
        const randomValue = values[Math.floor(Math.random() * values.length)];
        result = result.replace(placeholder, randomValue);
      }
    });
    
    return result;
  }
  
  /**
   * 获取备用内容
   */
  private static getFallbackContent(timeOfDay: string): { content: string; hashtags: string[] } {
    const fallbacks = {
      morning: [
        '新的一天，新的开始 ☀️',
        '早安，今天也要元气满满',
        '晨光微露，心情不错'
      ],
      afternoon: [
        '午后时光，慢慢享受 ☕',
        '阳光正好，微风不燥',
        '下午茶时间到'
      ],
      evening: [
        '夕阳西下，今天也很充实',
        '晚霞很美，心情也很美',
        '傍晚的温柔时光'
      ],
      night: [
        '夜深了，该说晚安了 🌙',
        '深夜时光，安静思考',
        '月亮很美，你也是'
      ]
    };
    
    const contents = fallbacks[timeOfDay as keyof typeof fallbacks];
    const content = contents[Math.floor(Math.random() * contents.length)];
    
    return {
      content,
      hashtags: ['#日常', '#心情']
    };
  }
  
  /**
   * 生成适合角色的热梗内容
   */
  static generateMemeContent(personality: string): string {
    const memesByPersonality = {
      '活泼': [
        '今天的快乐加倍了 ✨',
        '摆烂？不存在的，我是卷王 💪',
        '被这个yyds的天气治愈了',
        '社死现场被我化解了，绝绝子'
      ],
      '温柔': [
        '温柔的晚风，治愈的心情',
        '小确幸收集中... ✨',
        '被生活的美好破防了',
        '今日份松弛感 get ✓'
      ],
      '文艺': [
        '人间清醒时刻：慢生活真的很香',
        '仪式感拉满的午后时光',
        '岁月静好，现世安稳',
        '氛围感这块，我拿捏了'
      ],
      '搞笑': [
        '又双叒叕摆烂了 🛌',
        'emo了，但是还要营业',
        '社死预警：刚才的操作太离谱',
        '被自己的沙雕操作整顿了'
      ]
    };
    
    for (const [type, memes] of Object.entries(memesByPersonality)) {
      if (personality.includes(type)) {
        return memes[Math.floor(Math.random() * memes.length)];
      }
    }
    
    // 默认通用梗
    const generalMemes = [
      '今天的心情是：还行 😌',
      '生活就是这样，有起有落',
      '小日子过得还不错',
      '平平无奇的一天 ✨'
    ];
    
    return generalMemes[Math.floor(Math.random() * generalMemes.length)];
  }
}

export default TrendingContentGenerator;
