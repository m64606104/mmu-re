/**
 * 真实朋友圈内容生成器
 * 参考微信朋友圈/QQ空间的真实内容类型
 * 包含：音乐分享、公众号文章、优惠券广告、生活吐槽、大型活动等
 */

export interface MusicShareCard {
  type: 'music';
  platform: 'QQ音乐' | '网易云音乐' | 'Spotify';
  songName: string;
  artist: string;
  coverDescription: string;  // 封面图片描述
}

export interface ArticleShareCard {
  type: 'article';
  source: string;  // 公众号名称
  title: string;
  date: string;
  coverDescription: string;  // 封面图片描述
}

export interface CouponShareCard {
  type: 'coupon';
  merchant: string;  // 商家名称
  title: string;
  benefits: string[];  // 优惠内容列表
  imageDescription: string;  // 优惠券图片描述
}

export type SpecialContentCard = MusicShareCard | ArticleShareCard | CouponShareCard;

/**
 * 生成音乐分享内容
 */
export function generateMusicShare(): {
  text: string;
  card: MusicShareCard;
} {
  const musicData = [
    // 流行音乐
    {
      type: 'music' as const,
      platform: 'QQ音乐' as const,
      songName: '起风了',
      artist: '买辣椒也用券',
      coverDescription: '音乐播放器界面截图，歌曲封面是一片蓝天白云的治愈画面，左侧显示歌曲名称和歌手名，右侧是播放按钮，整体采用清新的绿色渐变背景'
    },
    {
      type: 'music' as const,
      platform: '网易云音乐' as const,
      songName: '我还记得',
      artist: '张谦',
      coverDescription: '音乐播放器界面，歌曲封面是雨后街道的艺术照片，画面呈现出忧郁的蓝色调，下方显示歌曲信息和播放控件，背景是网易云标志性的灰白色调'
    },
    {
      type: 'music' as const,
      platform: 'QQ音乐' as const,
      songName: '后来',
      artist: '刘若英',
      coverDescription: '音乐卡片界面，封面是一张怀旧风格的黑白照片，左侧显示歌曲标题和演唱者，右侧是播放图标，整体设计简洁温馨'
    },
    // 民谣
    {
      type: 'music' as const,
      platform: '网易云音乐' as const,
      songName: '南山南',
      artist: '马頔',
      coverDescription: '音乐分享卡片，封面是一幅水墨风格的山水画，意境悠远，配色古朴典雅，歌曲信息以白色文字叠加在封面上'
    },
    // 说唱
    {
      type: 'music' as const,
      platform: 'QQ音乐' as const,
      songName: '以父之名',
      artist: '周杰伦',
      coverDescription: '音乐播放界面，封面是哥特式教堂的黑白照片，充满神秘感，歌曲标题用白色艺术字体显示，背景是深色渐变'
    },
    // 治愈系
    {
      type: 'music' as const,
      platform: '网易云音乐' as const,
      songName: '心墙',
      artist: '郭静',
      coverDescription: '音乐分享卡片，封面是柔和的粉色水彩画，画面温柔治愈，歌曲信息以优雅的字体展示，整体风格小清新'
    },
    // 摇滚
    {
      type: 'music' as const,
      platform: 'QQ音乐' as const,
      songName: '无地自容',
      artist: '黑豹乐队',
      coverDescription: '音乐界面截图，封面是充满力量感的黑红配色抽象图案，歌曲名用粗体字显示，充满摇滚气息'
    },
  ];

  const selected = musicData[Math.floor(Math.random() * musicData.length)];
  
  const textOptions = [
    `混音上新🎵\n依旧好听`,
    `${selected.songName} 🎵`,
    `单曲循环中 🔁`,
    `分享${selected.artist}的歌`,
    `最近在听这首 很治愈`,
    `循环播放一整天了 🎧`,
    `深夜电台 📻`,
  ];

  return {
    text: textOptions[Math.floor(Math.random() * textOptions.length)],
    card: selected
  };
}

/**
 * 生成公众号文章分享
 */
export function generateArticleShare(): {
  text: string;
  card: ArticleShareCard;
} {
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  
  const articles = [
    // 创业/商业类
    {
      source: '智汇山海',
      title: '创享福安——福安市大学生（青年）创新创业项目评审开始报名！',
      coverDescription: '公众号文章封面，红色党旗背景上印有金色党徽和标语"深学争优 敢为争先 实干争效"，整体设计庄重大气，体现政府官方形象'
    },
    {
      source: '福安人社',
      title: '重磅！2025年福安市创业创新大赛正式启动，百万奖金等你来拿',
      coverDescription: '文章分享卡片，封面是现代化办公场景，年轻创业者在讨论项目，背景是科技感十足的蓝色渐变，标题用醒目的黄色字体'
    },
    // 生活/美食类
    {
      source: '本地生活指南',
      title: '福州必打卡！这10家宝藏咖啡店，你去过几家？',
      coverDescription: '文章封面拼贴，展示多家咖啡店的精美照片，包括拉花咖啡、文艺装修、户外座位等场景，整体色调温馨明亮'
    },
    {
      source: '美食探店',
      title: '老板疯了！这家火锅店周年庆，5折吃到撑！',
      coverDescription: '宣传海报截图，火红的背景上飘着热气腾腾的火锅食材，醒目的"5折"字样，配有店铺地址和优惠时间信息'
    },
    // 科技类
    {
      source: '科技前沿观察',
      title: 'GPT-5即将发布？OpenAI官方回应来了',
      coverDescription: '科技新闻封面，深蓝色背景上有AI相关的科技元素图标，OpenAI的logo居中显示，整体设计现代简约'
    },
    // 情感/鸡汤类
    {
      source: '每日心灵鸡汤',
      title: '人生建议：25岁之前一定要明白的10件事',
      coverDescription: '文章封面是一张唯美的日出照片，温暖的橙色光芒照亮天际，下方用简洁的白色字体写着标题'
    },
  ];

  const selected = articles[Math.floor(Math.random() * articles.length)];
  
  const textOptions = [
    `快来报名啦`,
    `分享一个有意思的`,
    `看到这个，mark一下`,
    `有需要的朋友可以看看`,
    ``,  // 有时候不写文字，直接分享
    `推荐`,
  ];

  return {
    text: textOptions[Math.floor(Math.random() * textOptions.length)],
    card: {
      ...selected,
      type: 'article',
      date: dateStr
    }
  };
}

/**
 * 生成优惠券/广告分享
 */
export function generateCouponShare(): {
  text: string;
  card: CouponShareCard;
} {
  const coupons = [
    {
      merchant: '暖冬酒店',
      title: '5折预订 助力出行',
      benefits: ['特惠酒店', '实时低价', '领大额券', '限时礼包', '多重优惠', '尊享权益'],
      imageDescription: '优惠券九宫格图片，白色背景上用黑色粗体字写着各种优惠项目，包括"特惠酒店"、"实时低价"、"助力出行"、"5折预订"、"领大额券"、"限时礼包"、"多重优惠"、"尊享权益"等，中间有一个浅蓝色的小程序二维码'
    },
    {
      merchant: '去哪儿旅行',
      title: '机票火车票超值优惠',
      benefits: ['最低3折起', '新用户立减50元', '预订返现', 'VIP会员专享'],
      imageDescription: '旅行优惠海报，蓝天白云背景上飞行着一架飞机，醒目的红色"3折起"字样，下方列出多项优惠内容，整体设计清新明快'
    },
    {
      merchant: '美团外卖',
      title: '周年庆大促 全场5折',
      benefits: ['满30减15', '新用户首单立减', '免配送费', '指定商家5折'],
      imageDescription: '外卖平台优惠券，黄色主色调上点缀着美食图标和红包图案，"5折"两个大字居中显示，周围环绕着各种优惠说明文字'
    },
  ];

  const selected = coupons[Math.floor(Math.random() * coupons.length)];
  
  const textOptions = [
    `@去哪儿旅行\n暖冬酒店 5折起\n👉#小程序://去哪儿旅行订酒店机票火车票/O4MLz8TAxod8aYf\n🎉来去哪儿住低价好店`,
    `发现了宝藏优惠 分享给大家`,
    `有需要的小伙伴赶紧冲`,
    `限时优惠！手慢无`,
  ];

  return {
    text: textOptions[Math.floor(Math.random() * textOptions.length)],
    card: {
      type: 'coupon',
      ...selected
    }
  };
}

/**
 * 生成生活吐槽+实物照片内容
 */
export function generateLifeComplaint(): {
  text: string;
  imageCount: number;
  imageDescriptions: string[];
} {
  const complaints = [
    {
      text: '兄弟，玩游戏被封机器码，上门安装系统。😭',
      imageCount: 1,
      imageDescriptions: [
        '笔记本电脑屏幕截图，蓝色的Windows系统安装界面，屏幕中央显示着安装进度条，键盘下方还放着一个RGB机械键盘，紫色的背光在暗光下格外显眼'
      ]
    },
    {
      text: '机械革命，笔记本清灰，全方位无死角😭',
      imageCount: 2,
      imageDescriptions: [
        '笔记本电脑拆开后的内部结构照片，可以看到主板、散热器、风扇等部件，灰尘清理后显得很干净',
        '笔记本电脑背面视角，散热孔和螺丝孔清晰可见，工具和螺丝整齐摆放在旁边'
      ]
    },
    {
      text: '终于下班了...累死我了 🥱',
      imageCount: 1,
      imageDescriptions: [
        '夜晚的办公楼外景，灯火通明的写字楼矗立在暗色的天空下，地面上还有零星的车辆和行人，画面透出一种下班后的疲惫感'
      ]
    },
    {
      text: '奶茶续命中 ☕️',
      imageCount: 1,
      imageDescriptions: [
        '办公桌上的奶茶杯特写，透明杯子里是焦糖色的奶茶，珍珠沉在底部，旁边是打开的笔记本电脑和一堆文件，背景虚化'
      ]
    },
    {
      text: '今天的工位 vibe满满✨',
      imageCount: 1,
      imageDescriptions: [
        '整洁的办公桌面俯拍图，MacBook、机械键盘、无线鼠标、绿植、马克杯整齐摆放，暖色调的台灯照亮桌面，营造出温馨的工作氛围'
      ]
    },
  ];

  return complaints[Math.floor(Math.random() * complaints.length)];
}

/**
 * 生成大型活动/聚会的多图内容
 */
export function generateEventMultiImages(): {
  text: string;
  imageCount: number;
  imageDescriptions: string[];
} {
  const events = [
    {
      text: '非常非常非常幸福的农民婚礼。。',
      imageCount: 9,
      imageDescriptions: [
        '婚礼现场布置全景，粉色和白色气球拱门，地面铺着粉色地毯，两侧摆放着精美的鲜花装饰',
        '婚礼现场的祝福标语，金色的"新婚快乐"四个大字挂在粉色背景前',
        '精致的婚礼甜品台，粉色系的蛋糕、马卡龙、糖果整齐摆放，布置得像童话世界',
        '婚礼现场的签到台，木质画架上放着新人的大幅婚纱照，旁边是签到本和鲜花装饰',
        '粉色主题的背景墙，巨大的圆形花环装饰，中心是新人的名字',
        '婚礼伴手礼特写，粉色包装盒系着丝带，里面是精心准备的小礼物',
        '宾客合影区，粉色气球墙前摆着沙发和茶几，供宾客拍照留念',
        '婚礼现场的餐桌布置，白色桌布上摆放着精致的餐具，中央是高脚花瓶里的鲜花',
        '新人与宾客的合影，笑容满面的新娘穿着白色婚纱，周围簇拥着祝福的亲朋好友'
      ]
    },
    {
      text: '做婚策开始就一直在为别人的幸福落泪，我的户尺暖暖的',
      imageCount: 9,
      imageDescriptions: [
        '婚礼现场入口，巨大的粉色花门，由玫瑰、绣球、满天星编织而成，梦幻唯美',
        '婚礼舞台全景，浪漫的灯光打在舞台上，背景是粉色纱幔和投影的爱心图案',
        '新娘手捧花特写，粉白色玫瑰、百合组成的花束，系着白色缎带',
        '婚礼甜品区，多层粉色婚礼蛋糕，上面装饰着糖霜花朵和新人的人偶',
        '婚礼现场的氛围照，粉色灯光笼罩整个场地，营造出温馨浪漫的氛围',
        '宾客祝福墙，粉色背景上贴满了宾客的祝福卡片和照片',
        '婚礼迎宾区，精致的花艺装饰和引导牌，地面铺着白色地毯',
        '新人仪式时刻，在粉色花门下交换戒指，宾客在两侧见证这一刻',
        '婚礼结束时的气球放飞，粉白色气球升上天空，寓意新人的幸福美满'
      ]
    },
    {
      text: '今天的演唱会太燃了🔥',
      imageCount: 6,
      imageDescriptions: [
        '演唱会现场全景，舞台上紫色和蓝色的灯光交织，形成梦幻的光束效果，台下观众举着荧光棒',
        '舞台特写，歌手在紫光灯下的剪影，背后是巨大的LED屏幕播放着视觉特效',
        '观众席视角，密密麻麻的观众挥舞着荧光棒，形成荧光的海洋',
        '舞台灯光特效，紫色激光在空中划出几何图案，烟雾效果增添神秘感',
        '歌手与观众互动时刻，台下观众激动地伸手向舞台方向',
        '演唱会结束时刻，漫天飘散的彩色纸屑，舞台灯光达到最高潮'
      ]
    },
  ];

  return events[Math.floor(Math.random() * events.length)];
}

/**
 * 根据内容类型随机选择一个真实朋友圈内容
 */
export function generateRealMomentsContent(type: 'music' | 'article' | 'coupon' | 'complaint' | 'event'): any {
  switch (type) {
    case 'music':
      return generateMusicShare();
    case 'article':
      return generateArticleShare();
    case 'coupon':
      return generateCouponShare();
    case 'complaint':
      return generateLifeComplaint();
    case 'event':
      return generateEventMultiImages();
    default:
      return generateLifeComplaint();
  }
}

/**
 * 随机选择一个真实朋友圈内容类型
 */
export function selectRandomRealMomentsType(): 'music' | 'article' | 'coupon' | 'complaint' | 'event' {
  const types: Array<{ type: 'music' | 'article' | 'coupon' | 'complaint' | 'event'; weight: number }> = [
    { type: 'music', weight: 0.20 },      // 20% 音乐分享
    { type: 'article', weight: 0.15 },    // 15% 文章分享
    { type: 'coupon', weight: 0.10 },     // 10% 优惠券
    { type: 'complaint', weight: 0.30 },  // 30% 生活吐槽
    { type: 'event', weight: 0.25 },      // 25% 大型活动
  ];

  const random = Math.random();
  let cumulative = 0;

  for (const item of types) {
    cumulative += item.weight;
    if (random < cumulative) {
      return item.type;
    }
  }

  return 'complaint'; // 默认
}
