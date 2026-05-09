/**
 * 年龄匹配的漂流瓶内容生成器
 * 确保年龄和内容语气相符合
 */

import { BottleLetter } from '../types/bottle';
import { generateXianyuStyleName } from './randomNameGenerator';

// 年龄段定义
interface AgeGroup {
  name: string;
  ageRange: [number, number];
  avatars: string[];
  locations: string[];
  contentGenerators: ContentGenerator[];
}

interface ContentGenerator {
  topic: string;
  mood: 'thoughtful' | 'lonely' | 'happy' | 'excited' | 'sad' | 'grateful';
  templates: string[];
  keywords: string[]; // 用于主题自由发挥的关键词
}

// 年龄分组配置
const AGE_GROUPS: AgeGroup[] = [
  {
    name: 'elementary', // 小学生 (7-12岁)
    ageRange: [7, 12],
    avatars: ['🌈', '🌸', '⭐', '🎈', '🦄', '🐻'],
    locations: ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京'],
    contentGenerators: [
      {
        topic: '校园趣事',
        mood: 'happy',
        templates: [
          '今天老师给我发小红花了！因为我帮助同学捡起了掉在地上的橡皮。妈妈说我是个好孩子，我好开心！',
          '我终于学会骑自行车啦！虽然摔了好多次，但是现在能骑得很快了。爸爸说我很棒！',
          '今天体育课我跑步得了第一名！老师表扬我了，同学们都给我鼓掌。我好开心好开心！',
          '放学的时候捡到了一只超可爱的小瓢虫！红红的壳上有黑色的点点，我小心翼翼地把它放到了草丛里。'
        ],
        keywords: ['小红花', '帮助同学', '学骑车', '体育课', '跑步', '老师表扬', '小动物', '课间游戏']
      },
      {
        topic: '成长烦恼',
        mood: 'sad',
        templates: [
          '今天爸爸妈妈又吵架了，声音好大好吵...我好害怕他们会分开，我该怎么办？',
          '我的同桌今天不理我了，我们吵架了。我其实不是故意的，但他就是不原谅我。我好难过...',
          '班上有个同学总是欺负我，抢我的东西，老师也不管。我不敢告诉爸妈，怕他们担心。',
          '为什么别的小朋友都有很多朋友，我却总是一个人？是不是我不够好？我也想有朋友...'
        ],
        keywords: ['爸妈吵架', '同桌生气', '被欺负', '没朋友', '考试没考好', '弄丢东西']
      },
      {
        topic: '小小梦想',
        mood: 'excited',
        templates: [
          '我的梦想是当一名宇航员！今天在科技馆看到了火箭模型，超级酷。老师说只要努力学习，梦想就能实现！',
          '我想养一只小狗，但是妈妈说要等我长大一点。我每天都好好吃饭，快快长大，这样就能养小狗了！'
        ],
        keywords: ['当宇航员', '养小狗', '当老师', '当医生', '学画画', '学唱歌']
      }
    ]
  },
  {
    name: 'middle_school', // 初中生 (13-15岁)
    ageRange: [13, 15],
    avatars: ['🎵', '📚', '🎨', '⚽', '🏀', '🎸'],
    locations: ['北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '西安', '南京', '苏州'],
    contentGenerators: [
      {
        topic: '青春校园',
        mood: 'happy',
        templates: [
          '期中考试进步了20名！爸妈好开心，说周末带我去游乐园。努力真的有回报！',
          '今天和好朋友一起去打篮球，投进了好几个三分球！虽然还是输了，但好开心啊。',
          '学校组织春游，和同学们一起爬山野餐。虽然很累，但笑得特别开心。这就是青春吧！'
        ],
        keywords: ['考试进步', '打篮球', '春游', '社团活动', '运动会', '班级活动']
      },
      {
        topic: '成长困惑',
        mood: 'sad',
        templates: [
          '学习压力好大...每天做作业到半夜，成绩还是上不去。那个学霸好像从来不用努力就能考第一，我好嫉妒。',
          '我最好的朋友要转学了，以后再也见不到了。我们从小学就在一起，突然要分开了，好舍不得...',
          '爸妈天天吵架，还老是拿我的成绩说事。我真的已经很努力了，但他们总觉得不够。我好累...'
        ],
        keywords: ['学习压力', '朋友转学', '父母吵架', '成绩下降', '同学关系', '青春期困惑']
      },
      {
        topic: '友谊青春',
        mood: 'grateful',
        templates: [
          '和好朋友一起参加运动会，虽然没拿到名次，但一起努力的过程真的很开心。友谊万岁！',
          '好朋友今天送了我生日礼物，是我一直想要的那本书。有ta真好！',
          '和朋友们一起准备班级活动，虽然很累但很开心。这些回忆一定会记一辈子。'
        ],
        keywords: ['好朋友', '生日礼物', '班级活动', '一起学习', '课间聊天', '青春回忆']
      }
    ]
  },
  {
    name: 'high_school', // 高中生 (16-18岁)
    ageRange: [16, 18],
    avatars: ['📖', '✏️', '🎓', '💭', '🌟', '🚀'],
    locations: ['北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '西安', '南京', '武汉', '长沙', '郑州'],
    contentGenerators: [
      {
        topic: '求学之路',
        mood: 'excited',
        templates: [
          '模拟考试考了年级前十！班主任当着全班的面表扬我，那一刻真的超有成就感。',
          '终于解出了那道困扰我一周的数学题！那种豁然开朗的感觉太爽了。',
          '被心仪的大学录取了！收到通知书的那一刻，眼泪都快出来了。所有的努力都值得！'
        ],
        keywords: ['模考进步', '解题成功', '大学录取', '竞赛获奖', '老师表扬', '学习突破']
      },
      {
        topic: '青春迷茫',
        mood: 'sad',
        templates: [
          '高三了，压力大到快喘不过气。每天看着倒计时，就觉得特别焦虑。万一考不上好大学，对不起爸妈怎么办？',
          '父母天天逼我学习，周末也不让休息。我知道他们是为我好，但我真的需要一点自己的空间...',
          '暗恋了一个人三年，马上就要毕业了。要不要表白？如果被拒绝了，连朋友都没得做了。好纠结...'
        ],
        keywords: ['高考压力', '父母期望', '暗恋困扰', '文理选择', '友谊变化', '未来迷茫']
      },
      {
        topic: '青春友谊',
        mood: 'grateful',
        templates: [
          '高三了，和朋友们约好一起考同一所大学。虽然不知道能不能实现，但这个约定很珍贵。',
          '毕业在即，和好朋友们一起拍了很多照片。不想分开，但天下没有不散的宴席...'
        ],
        keywords: ['高考约定', '毕业照', '同窗情谊', '青春记忆', '分别在即', '友谊长存']
      }
    ]
  },
  {
    name: 'young_adult', // 大学生/年轻人 (19-25岁)
    ageRange: [19, 25],
    avatars: ['💼', '🌊', '☕', '🎨', '🎵', '📱'],
    locations: ['北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '西安', '南京', '武汉', '长沙', '青岛', '厦门'],
    contentGenerators: [
      {
        topic: '大学生活',
        mood: 'thoughtful',
        templates: [
          '大学四年马上要结束了，同学都找好工作了，我还在迷茫。不知道自己喜欢什么，适合什么。',
          '第一次实习，发现职场和想象的完全不一样。同事很现实，每天都在勾心斗角。我该继续坚持还是换个方向？',
          '刚毕业工资好低，连房租都快付不起了。看着同学一个个过得光鲜亮丽，我却连养活自己都困难。'
        ],
        keywords: ['毕业迷茫', '实习体验', '求职焦虑', '租房生活', '同学差距', '职场新人']
      },
      {
        topic: '成长感悟',
        mood: 'happy',
        templates: [
          '今天鼓起勇气做了一件一直不敢做的事，虽然过程中紧张到发抖，但做完之后超有成就感！',
          '终于学会了独立生活。从一开始手忙脚乱到现在井井有条，才发现自己比想象中更能干。',
          '第一次一个人搬家，虽然累得要命，但把新家收拾好的那一刻，突然觉得自己长大了。'
        ],
        keywords: ['突破自己', '独立生活', '第一次搬家', '学会技能', '工作成就', '自我成长']
      },
      {
        topic: '都市生活',
        mood: 'lonely',
        templates: [
          '一个人在异乡的夜晚，看着万家灯火，却不知道哪一扇窗后有人在等我。',
          '今天是我来这座城市的第365天。一年了，我还是一个人吃饭，一个人散步，一个人看电影。',
          '深夜的便利店，我是唯一的顾客。店员在打瞌睡，货架上的商品静静陈列。这个世界好像只剩下我一个人。'
        ],
        keywords: ['异乡生活', '一个人', '深夜', '城市孤独', '租房生活', '想家']
      }
    ]
  },
  {
    name: 'adult', // 成年人 (26-35岁)
    ageRange: [26, 35],
    avatars: ['🏙️', '⛰️', '🍃', '🌙', '🗺️', '🎭'],
    locations: ['北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '西安', '南京', '武汉', '苏州', '天津', '青岛', '大连', '厦门', '昆明', '三亚'],
    contentGenerators: [
      {
        topic: '生活感悟',
        mood: 'thoughtful',
        templates: [
          '今天在咖啡馆坐了一下午，看着窗外的行人匆匆而过，突然觉得时间好像停止了。我们每天都在追赶什么，又在错过什么？',
          '凌晨三点醒来，城市安静得只剩下钟表的滴答声。我在想，在这个世界的某个角落，是不是也有一个失眠的人，和我一样望着天花板发呆。',
          '走在秋天的街道上，踩着落叶发出沙沙的声响。每一片叶子都曾在枝头迎风摇曳，现在归于尘土。人生是否也是如此？'
        ],
        keywords: ['时间感悟', '失眠思考', '季节变化', '人生哲理', '城市观察', '内心独白']
      },
      {
        topic: '工作生活',
        mood: 'excited',
        templates: [
          '今天完成了一个困扰很久的项目，那种成就感太爽了！虽然加了不少班，但看到成果的那一刻，觉得一切都值得。',
          '收到了来自客户的感谢信，说我的服务帮了他们大忙。这种被认可的感觉真好，原来工作也可以带来这么多正向反馈。',
          '下班路上看到夕阳特别美，突然觉得每天上下班的路也可以很美好。生活嘛，总要找点小确幸。'
        ],
        keywords: ['项目完成', '客户认可', '工作成就', '下班路上', '小确幸', '职场感悟']
      },
      {
        topic: '人生焦虑',
        mood: 'sad',
        templates: [
          '三十岁的焦虑像潮水一样涌来。没车没房没存款，未来一片迷茫。有时候真的很想知道，生活会变好吗？',
          '上有老下有小，工作压力山大。每个月工资刚发就没了，房贷车贷孩子教育费...什么时候是个头？',
          '最近总是失眠，身体也出现了各种小毛病。工作的意义是什么？这样拼命工作到底值不值得？'
        ],
        keywords: ['三十焦虑', '经济压力', '房贷车贷', '身体健康', '工作意义', '未来迷茫']
      }
    ]
  }
];

/**
 * 根据年龄获取合适的年龄组
 */
function getAgeGroup(age: number): AgeGroup {
  for (const group of AGE_GROUPS) {
    if (age >= group.ageRange[0] && age <= group.ageRange[1]) {
      return group;
    }
  }
  // 默认返回成年人组
  return AGE_GROUPS[AGE_GROUPS.length - 1];
}

/**
 * 从关键词生成自由发挥的内容
 */
function generateFreeformContent(keywords: string[], _mood: string, age: number): string {
  const keyword = keywords[Math.floor(Math.random() * keywords.length)];
  
  // 根据年龄段调整语言风格
  const ageGroup = getAgeGroup(age);
  let prefix = '';
  let suffix = '';
  
  switch (ageGroup.name) {
    case 'elementary':
      prefix = '今天发生了一件事！';
      suffix = '你遇到过这样的事情吗？';
      break;
    case 'middle_school':
      prefix = '最近遇到了一件事，';
      suffix = '有人能给我一些建议吗？';
      break;
    case 'high_school':
      prefix = '想和大家分享一下，';
      suffix = '不知道其他人是怎么想的？';
      break;
    case 'young_adult':
      prefix = '刚刚经历了一件事，';
      suffix = '如果是你，你会怎么做？';
      break;
    case 'adult':
      prefix = '生活中总是有些意想不到的时刻，';
      suffix = '你有过类似的感受吗？';
      break;
  }
  
  return `${prefix}关于${keyword}的事情。${suffix}`;
}

/**
 * 生成年龄匹配的漂流瓶内容
 */
export function generateAgeAppropriateBottle(): BottleLetter {
  // 随机选择年龄组
  const ageGroup = AGE_GROUPS[Math.floor(Math.random() * AGE_GROUPS.length)];
  
  // 生成年龄
  const age = ageGroup.ageRange[0] + Math.floor(Math.random() * (ageGroup.ageRange[1] - ageGroup.ageRange[0] + 1));
  
  // 随机选择内容生成器
  const contentGenerator = ageGroup.contentGenerators[Math.floor(Math.random() * ageGroup.contentGenerators.length)];
  
  // 50%概率使用模板，50%概率使用关键词自由发挥
  let content: string;
  if (Math.random() < 0.5 && contentGenerator.templates.length > 0) {
    // 使用模板
    content = contentGenerator.templates[Math.floor(Math.random() * contentGenerator.templates.length)];
  } else {
    // 使用关键词自由发挥
    content = generateFreeformContent(contentGenerator.keywords, contentGenerator.mood, age);
  }
  
  // 生成发送者信息
  const avatar = ageGroup.avatars[Math.floor(Math.random() * ageGroup.avatars.length)];
  const location = ageGroup.locations[Math.floor(Math.random() * ageGroup.locations.length)];
  const name = generateXianyuStyleName();
  
  // 随机性别
  const genders: Array<'male' | 'female' | 'other'> = ['male', 'female'];
  const gender = genders[Math.floor(Math.random() * genders.length)];
  
  const bottle: BottleLetter = {
    id: `bottle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    senderId: `age_sender_${age}_${Date.now()}`,
    senderName: name,
    senderAvatar: avatar,
    senderAge: age,
    senderGender: gender,
    senderLocation: location,
    content,
    topic: contentGenerator.topic,
    mood: contentGenerator.mood,
    timestamp: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000, // 1-7天前
    language: 'zh'
  };
  
  return bottle;
}

/**
 * 获取年龄组统计信息（用于调试）
 */
export function getAgeGroupStats() {
  return AGE_GROUPS.map(group => ({
    name: group.name,
    ageRange: group.ageRange,
    contentCount: group.contentGenerators.reduce((sum, gen) => sum + gen.templates.length, 0),
    keywordCount: group.contentGenerators.reduce((sum, gen) => sum + gen.keywords.length, 0)
  }));
}
