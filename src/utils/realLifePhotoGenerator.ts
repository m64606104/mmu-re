/**
 * 真实生活照片描述生成器
 * 生成符合真人朋友圈习惯的照片描述（风景、自拍、美食、旅游等）
 */

export interface PhotoScenario {
  category: '风景' | '自拍' | '美食' | '旅游' | '日常' | '聚会' | '宠物' | '运动' | '工作' | '购物';
  descriptions: string[];
}

// 真实生活照片场景库
const photoScenarios: PhotoScenario[] = [
  // 风景类
  {
    category: '风景',
    descriptions: [
      '夕阳西下，天空被染成温暖的橙红色',
      '公园里的樱花开得正盛，粉色花瓣随风飘落',
      '海边的日落，波光粼粼的海面倒映着金色余晖',
      '雨后的街道，地面反射着霓虹灯的光影',
      '清晨的湖面，薄雾笼罩，宁静而美好',
      '城市夜景，高楼大厦的灯光璀璨夺目',
      '山顶俯瞰，云海翻涌，视野开阔',
      '秋天的银杏大道，金黄色的落叶铺满地面',
      '雪后的公园，白茫茫一片，树枝上挂满冰晶',
      '彩虹横跨天际，雨过天晴的美好瞬间'
    ]
  },
  
  // 自拍类
  {
    category: '自拍',
    descriptions: [
      '今天的妆容，自然清透的裸妆look',
      '新买的衣服，穿上拍个照纪念一下',
      '咖啡厅自拍，背景是复古的装修风格',
      '健身房镜子前，运动后的元气满满',
      '新发型，剪短了感觉整个人都清爽了',
      '戴上新买的墨镜，酷酷的感觉',
      '化了个新眼妆，显得眼睛特别大',
      '穿着睡衣在家，素颜也要自信',
      '试衣间自拍，这件衣服还挺合身的',
      '车里自拍，等红灯的时候拍一张'
    ]
  },
  
  // 美食类
  {
    category: '美食',
    descriptions: [
      '火锅冒着热气，红油翻滚，看着就有食欲',
      '精致的甜品，奶油和水果的搭配恰到好处',
      '自己做的早餐，煎蛋吐司配牛奶',
      '烧烤摊上的肉串，滋滋作响冒着油光',
      '奶茶店的新品，颜值和口感都在线',
      '日料拼盘，三文鱼寿司摆盘精美',
      '麻辣烫满满一大碗，配菜丰富',
      '西餐厅的牛排，摆盘很有仪式感',
      '路边小吃摊的煎饼果子，料很足',
      '自制蛋糕，虽然卖相一般但味道不错'
    ]
  },
  
  // 旅游类
  {
    category: '旅游',
    descriptions: [
      '古镇的青石板路，两旁是古色古香的建筑',
      '沙滩上的脚印，海浪一波波涌来',
      '机场候机厅，拖着行李箱准备出发',
      '酒店房间窗外的城市景色，视野很好',
      '景区的标志性建筑，游客很多',
      '山路上的风景，蜿蜒曲折通向远方',
      '民宿的小院子，布置得很温馨',
      '火车窗外的风景，田野和村庄飞速掠过',
      '游乐园的摩天轮，夜晚亮起彩灯',
      '博物馆里的展品，历史感十足'
    ]
  },
  
  // 日常类
  {
    category: '日常',
    descriptions: [
      '阳台上晾晒的衣服，阳光很好',
      '桌上摊开的书本和笔记，学习ing',
      '电脑屏幕上的代码，加班到深夜',
      '窗外的雨滴打在玻璃上，模糊了视线',
      '床上乱糟糟的被子，周末赖床的证据',
      '快递盒子堆了一地，拆快递的快乐',
      '猫咪趴在键盘上，不让我工作',
      '书桌上的绿植，长得很茂盛',
      '冰箱里的食材，准备做饭',
      '阳台上的夕阳，透过窗帘洒进来'
    ]
  },
  
  // 聚会类
  {
    category: '聚会',
    descriptions: [
      '朋友们围坐在一起，桌上摆满了菜',
      'KTV包厢里，大家拿着话筒唱歌',
      '生日蛋糕上插满蜡烛，准备许愿',
      '酒吧里的氛围灯，音乐很嗨',
      '聚餐的合影，大家笑得很开心',
      '桌游吧里，正在玩狼人杀',
      '露营地的篝火，大家围坐烤棉花糖',
      '毕业聚会，穿着学士服拍照',
      '同学聚会，好久不见的老朋友',
      '公司团建，大家在户外做游戏'
    ]
  },
  
  // 宠物类
  {
    category: '宠物',
    descriptions: [
      '狗狗吐着舌头，眼神超级无辜',
      '猫咪蜷缩在沙发上睡觉，超可爱',
      '遛狗时拍的，它在草地上撒欢',
      '猫咪盯着窗外的鸟，尾巴甩来甩去',
      '给狗狗洗完澡，湿漉漉的样子',
      '猫咪偷吃我的零食被抓包',
      '狗狗叼着玩具，想让我陪它玩',
      '猫咪在纸箱里，只露出一个头',
      '带狗狗去宠物医院体检',
      '猫咪趴在我腿上，呼噜呼噜的'
    ]
  },
  
  // 运动类
  {
    category: '运动',
    descriptions: [
      '健身房里的器械，今天练腿',
      '跑步机上的数据，跑了5公里',
      '瑜伽垫上拉伸，运动后放松一下',
      '篮球场上，和朋友们打球',
      '游泳池里，泳姿还算标准',
      '骑行路上的风景，沿着江边骑',
      '爬山途中，汗流浃背但很爽',
      '羽毛球场上，打得很激烈',
      '滑雪场的雪道，第一次滑雪',
      '运动手表显示的心率和步数'
    ]
  },
  
  // 工作类
  {
    category: '工作',
    descriptions: [
      '办公桌上的电脑和文件，忙碌的一天',
      '会议室里，正在开会讨论方案',
      '咖啡和笔记本，工作的标配',
      '加班的夜晚，办公室只剩我一个人',
      '项目完成后的庆功宴，大家举杯',
      '出差途中，高铁上用笔记本办公',
      '工位上的小绿植，缓解工作压力',
      '打印机旁，等着打印文件',
      '同事们一起吃工作餐',
      '下班路上，终于结束一天的工作'
    ]
  },
  
  // 购物类
  {
    category: '购物',
    descriptions: [
      '商场里的橱窗，新款衣服很好看',
      '试衣间里试穿，这件还不错',
      '超市购物车装满了，大采购',
      '化妆品专柜，试了好几个色号',
      '鞋店里挑鞋，纠结买哪双',
      '书店里翻书，找本好书看看',
      '电子产品店，看新出的手机',
      '菜市场买菜，新鲜的蔬菜水果',
      '网购的包裹到了，拆箱时刻',
      '便利店买夜宵，泡面和饮料'
    ]
  }
];

/**
 * 根据主题和数量生成真实的生活照片描述
 */
export function generateRealLifePhotos(theme: string, count: number): string[] {
  // 根据主题匹配照片类别
  const categoryMap: Record<string, PhotoScenario['category'][]> = {
    '美食': ['美食', '日常'],
    '旅游': ['旅游', '风景'],
    '风景': ['风景'],
    '日常': ['日常', '自拍'],
    '心情': ['自拍', '日常'],
    '聚会': ['聚会', '美食'],
    '宠物': ['宠物', '日常'],
    '运动': ['运动', '日常'],
    '工作': ['工作', '日常'],
    '购物': ['购物', '日常']
  };
  
  // 默认类别
  let categories: PhotoScenario['category'][] = ['日常', '自拍', '美食'];
  
  // 匹配主题
  for (const [key, cats] of Object.entries(categoryMap)) {
    if (theme.includes(key)) {
      categories = cats;
      break;
    }
  }
  
  // 随机选择类别
  const selectedCategory = categories[Math.floor(Math.random() * categories.length)];
  const scenario = photoScenarios.find(s => s.category === selectedCategory);
  
  if (!scenario) {
    // 降级：返回日常类
    const dailyScenario = photoScenarios.find(s => s.category === '日常')!;
    return getRandomDescriptions(dailyScenario.descriptions, count);
  }
  
  return getRandomDescriptions(scenario.descriptions, count);
}

/**
 * 从描述列表中随机选择指定数量的描述
 */
function getRandomDescriptions(descriptions: string[], count: number): string[] {
  const shuffled = [...descriptions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, descriptions.length));
}

/**
 * 根据文字内容智能匹配照片描述
 */
export function generatePhotosMatchingContent(content: string, count: number): string[] {
  // 关键词匹配
  const keywords = {
    '美食': ['吃', '喝', '餐', '饭', '菜', '火锅', '烧烤', '甜品', '奶茶', '咖啡'],
    '旅游': ['旅', '游', '玩', '景', '酒店', '机场', '海边', '山', '古镇'],
    '风景': ['风景', '日落', '夕阳', '天空', '云', '雨', '雪', '花'],
    '自拍': ['自拍', '照片', '妆', '发型', '衣服', '穿搭'],
    '聚会': ['聚', '朋友', '同学', '聚餐', '生日', 'KTV', '团建'],
    '宠物': ['猫', '狗', '宠物', '毛孩子'],
    '运动': ['运动', '健身', '跑步', '游泳', '球', '瑜伽'],
    '工作': ['工作', '加班', '会议', '项目', '办公'],
    '购物': ['买', '购', '逛', '商场', '超市', '快递']
  };
  
  // 检测内容中的关键词
  let matchedTheme = '日常';
  for (const [theme, words] of Object.entries(keywords)) {
    if (words.some(word => content.includes(word))) {
      matchedTheme = theme;
      break;
    }
  }
  
  return generateRealLifePhotos(matchedTheme, count);
}

/**
 * 生成视频描述
 */
export function generateVideoDescription(theme: string): string {
  const videoScenarios: Record<string, string[]> = {
    '美食': [
      '拍了做饭的过程，从食材到成品',
      '火锅沸腾的样子，看着就很有食欲',
      '切蛋糕的瞬间，奶油流出来了',
      '倒饮料的慢动作，气泡上升'
    ],
    '旅游': [
      '海浪拍打礁石，浪花飞溅',
      '坐缆车上山，俯瞰风景',
      '古镇的街道，人来人往',
      '日落延时摄影，太阳慢慢落下'
    ],
    '日常': [
      '窗外下雨的样子，雨滴打在玻璃上',
      '猫咪玩毛线球，超级可爱',
      '做手工的过程，一步步完成',
      '植物生长的延时摄影'
    ],
    '运动': [
      '跑步时的第一视角，沿途风景',
      '投篮的瞬间，球进了！',
      '瑜伽动作演示，柔韧性真好',
      '骑行路上的风景，速度很快'
    ],
    '聚会': [
      '大家一起唱生日歌，吹蜡烛',
      'KTV里唱歌，气氛很嗨',
      '朋友们举杯庆祝',
      '玩游戏时的欢声笑语'
    ]
  };
  
  // 匹配主题
  for (const [key, descriptions] of Object.entries(videoScenarios)) {
    if (theme.includes(key)) {
      return descriptions[Math.floor(Math.random() * descriptions.length)];
    }
  }
  
  // 默认返回日常类
  const daily = videoScenarios['日常'];
  return daily[Math.floor(Math.random() * daily.length)];
}
