/**
 * 漂流瓶打捞系统
 * 管理每日打捞次数、生成随机漂流瓶信件
 */

import { BottleLetter, BottleFishingRecord, UserBottleStats } from '../types/bottle';
import { generateXianyuStyleName } from './randomNameGenerator';
import { generateAgeAppropriateBottle } from './ageAppropriateBottleGenerator';
import { recordBottleContent, evaluateContentDiversity, getRecommendedContentTypes } from './bottleContentDiversityManager';

const FISHING_STORAGE_KEY = 'bottle_fishing_record';
const STATS_STORAGE_KEY = 'bottle_stats';
const MAX_DAILY_FISHING = 2;

// 漂流瓶发送者配置（头像、年龄、性别、地点）
const SENDER_CONFIGS = [
  { avatar: '🌊', age: 25, gender: 'female' as const, location: '厦门' },
  { avatar: '🗺️', age: 28, gender: 'male' as const, location: '大理' },
  { avatar: '🌙', age: 23, gender: 'female' as const, location: '青海' },
  { avatar: '🏙️', age: 30, gender: 'male' as const, location: '上海' },
  { avatar: '⛰️', age: 27, gender: 'other' as const, location: '丽江' },
  { avatar: '☕', age: 24, gender: 'female' as const, location: '成都' },
  { avatar: '📚', age: 29, gender: 'male' as const, location: '北京' },
  { avatar: '🐚', age: 22, gender: 'female' as const, location: '三亚' },
  { avatar: '🎨', age: 26, gender: 'female' as const, location: '杭州' },
  { avatar: '🎵', age: 24, gender: 'male' as const, location: '武汉' },
  { avatar: '🌸', age: 21, gender: 'female' as const, location: '苏州' },
  { avatar: '🎭', age: 31, gender: 'male' as const, location: '南京' },
  { avatar: '🍃', age: 25, gender: 'other' as const, location: '昆明' },
  { avatar: '⭐', age: 23, gender: 'female' as const, location: '重庆' },
  { avatar: '🌈', age: 27, gender: 'male' as const, location: '西安' }
];

// 生成漂流瓶发送者（使用咸鱼风格的随机名字）
function generateBottleSenders() {
  return SENDER_CONFIGS.map((config, index) => ({
    id: `bottle_sender_${index + 1}`,
    name: generateXianyuStyleName(), // 动态生成咸鱼风格名字
    ...config
  }));
}

// 每次启动时重新生成一批发送者
const BOTTLE_SENDERS = generateBottleSenders();

// 漂流瓶话题和内容模板
const BOTTLE_TEMPLATES = [
  {
    topic: '生活感悟',
    mood: 'thoughtful' as const,
    contents: [
      '今天在咖啡馆坐了一下午，看着窗外的行人匆匆而过，突然觉得时间好像停止了。我们每天都在追赶什么，又在错过什么？如果你收到这个瓶子，能告诉我你最近在思考什么吗？',
      '凌晨三点醒来，城市安静得只剩下钟表的滴答声。我在想，在这个世界的某个角落，是不是也有一个失眠的人，和我一样望着天花板发呆。你会失眠吗？',
      '走在秋天的街道上，踩着落叶发出沙沙的声响。每一片叶子都曾在枝头迎风摇曳，现在归于尘土。人生是否也是如此？起起落落，最终平静。',
      '今天读到一句话："生活不止眼前的苟且，还有诗和远方。"但我想，也许眼前的苟且里，也藏着诗意吧。你觉得呢？'
    ]
  },
  {
    topic: '孤独心情',
    mood: 'lonely' as const,
    contents: [
      '一个人在异乡的夜晚，看着万家灯火，却不知道哪一扇窗后有人在等我。如果你也曾感受过这样的孤独，能回一封信给我吗？',
      '今天是我来这座城市的第365天。一年了，我还是一个人吃饭，一个人散步，一个人看电影。有时候真的很想有人能聊聊天，哪怕只是说说今天吃了什么。',
      '深夜的便利店，我是唯一的顾客。店员在打瞌睡，货架上的商品静静陈列。这个世界好像只剩下我一个人。你会在这样的时刻想起谁？',
      '雨天总让人觉得格外孤单。窗外的雨声像是在倾诉什么，可我听不懂。如果你收到这封信，能告诉我你是怎么度过孤独时光的吗？'
    ]
  },
  {
    topic: '开心分享',
    mood: 'happy' as const,
    contents: [
      // 幼儿园/小学生的快乐
      '今天老师给我发小红花了！因为我帮助同学捡起了掉在地上的橡皮。妈妈说我是个好孩子，我好开心！',
      '我终于学会骑自行车啦！虽然摔了好多次，但是现在能骑得很快了。爸爸说我很棒！',
      '今天体育课我跑步得了第一名！老师表扬我了，同学们都给我鼓掌。我好开心好开心！',
      '放学的时候捡到了一只超可爱的小瓢虫！红红的壳上有黑色的点点，我小心翼翼地把它放到了草丛里。',
      
      // 初中生的快乐
      '期中考试进步了20名！爸妈好开心，说周末带我去游乐园。努力真的有回报！',
      '今天和好朋友一起去打篮球，投进了好几个三分球！虽然还是输了，但好开心啊。',
      '学校组织春游，和同学们一起爬山野餐。虽然很累，但笑得特别开心。这就是青春吧！',
      
      // 高中生的快乐
      '模拟考试考了年级前十！班主任当着全班的面表扬我，那一刻真的超有成就感。',
      '终于解出了那道困扰我一周的数学题！那种豁然开朗的感觉太爽了。',
      '被心仪的大学录取了！收到通知书的那一刻，眼泪都快出来了。所有的努力都值得！',
      
      // 成年人的快乐
      '今天遇到了一件超级开心的事！早上去买早餐，老板多送了我一个包子，说是看我是老顾客了。小小的善意让整个上午都充满了阳光。你最近有什么开心的事吗？',
      '终于学会了一直想学的吉他和弦！虽然弹得不太好，但是能完整弹完一首歌的感觉太棒了。你有什么一直想做的事情吗？',
      '今天看到超级美的日落！橙红色的天空，云朵像被染了色。拍了好多照片，可惜照片无法完全记录那份美好。真想和人分享这一刻！',
      '刚刚和一只流浪猫交上了朋友！它在我脚边蹭来蹭去，喵喵叫着。给它喂了点吃的，它吃得超级香。小确幸就是这样简单。'
    ]
  },
  {
    topic: '梦想追寻',
    mood: 'excited' as const,
    contents: [
      // 小学生的梦想
      '我的梦想是当一名宇航员！今天在科技馆看到了火箭模型，超级酷。老师说只要努力学习，梦想就能实现！',
      '我想养一只小狗，但是妈妈说要等我长大一点。我每天都好好吃饭，快快长大，这样就能养小狗了！',
      
      // 初中生的梦想
      '参加了学校的演讲比赛，虽然只得了第三名，但我不会放弃！我的梦想是成为一名主持人。',
      '开始学吉他了！虽然手指很疼，但想到能在舞台上表演，就觉得一切都值得。梦想总要有的，万一实现了呢？',
      
      // 高中生的梦想
      '决定报考医学院！虽然很难，但我想成为一名医生，帮助更多的人。为了梦想，拼了！',
      '加入了学校的文学社，开始写自己的小说。虽然写得不好，但这是我热爱的事情。梦想就是要坚持！',
      
      // 成年人的梦想
      '终于鼓起勇气辞职了！下个月我要去西藏，一个人，一个背包，去看看梦想中的世界。虽然很多人说我疯了，但我想为自己勇敢一次。你有没有什么想做但还没做的事？',
      '我在准备考研，目标是心仪了很久的学校。虽然每天都很累，但想到可能实现的梦想，就觉得一切都值得。为梦想努力的你，加油！',
      '开始学画画了！虽然画得很糟糕，但每次拿起画笔，就觉得很快乐。也许这就是追梦的意义吧，不在于结果，而在于过程中的那份纯粹。',
      '今天投出了人生第一篇小说稿！不知道会不会被退稿，但迈出这一步的勇气，我为自己骄傲。追梦路上，你走到哪一步了？'
    ]
  },
  {
    topic: '感恩时刻',
    mood: 'grateful' as const,
    contents: [
      // 小学生的感恩
      '今天妈妈给我做了最爱吃的红烧肉！虽然她工作很累，但还是给我做好吃的。我爱妈妈！',
      '生病的时候，好朋友每天都来看我，还把老师讲的内容都告诉我。有这样的朋友真好！',
      '爸爸每天接送我上下学，不管刮风下雨都没缺过。爸爸辛苦了，我爱你！',
      
      // 初中生的感恩
      '班主任生病了还坚持给我们上课，嗓子都哑了。老师您辛苦了，我们会好好学习的！',
      '好朋友陪我度过了最难熬的时光。那段时间家里出了事，是ta一直陪着我。真的很感谢！',
      
      // 高中生的感恩
      '高三压力很大的时候，父母从来不给我压力，总说尽力就好。有这样理解我的父母，我很幸运。',
      '老师为了帮我提高成绩，每天放学后都给我单独辅导。这份恩情我会永远记得！',
      
      // 成年人的感恩
      '今天突然很想感谢生命中出现过的每一个人。那些帮助过我的，鼓励过我的，甚至伤害过我的，都让我成为了现在的自己。你最想感谢谁？',
      '生病的时候才发现，健康真的是最大的财富。能吃能睡能走路，就已经很幸福了。珍惜当下，感恩拥有。',
      '刚刚和妈妈打了个电话，听到她的声音突然很想哭。父母在，人生尚有来处。感恩他们的爱从未改变。',
      '今天整理房间，翻出了很多旧照片。那些一起笑过哭过的人，虽然有些已经失联，但回忆依然温暖。感谢你们陪我走过那段时光。'
    ]
  },
  {
    topic: '迷茫困惑',
    mood: 'sad' as const,
    contents: [
      // 幼儿园/小学生的困惑
      '今天爸爸妈妈又吵架了，声音好大好吵...我好害怕他们会分开，我该怎么办？如果你收到这个瓶子，可以告诉我该怎么做吗？',
      '我的同桌今天不理我了，我们吵架了。我其实不是故意的，但他就是不原谅我。我好难过，怎么才能让他原谅我呢？',
      '班上有个同学总是欺负我，抢我的东西，老师也不管。我不敢告诉爸妈，怕他们担心。该怎么办啊？',
      '为什么别的小朋友都有很多朋友，我却总是一个人？是不是我不够好？我也想有朋友...',
      '今天考试没考好，只考了70分。我不敢告诉爸爸妈妈，他们肯定会生气的。我该怎么办呀？',
      '我最喜欢的橡皮丢了，是妈妈给我买的。我找了好久都没找到，好伤心...你有丢过重要的东西吗？',
      '班长总是说我笨，因为我数学题不会做。可是我已经很努力了啊，为什么还是学不会呢？',
      '今天体育课摔倒了，膝盖破了好大一块皮，好疼。同学们都笑我是胆小鬼，我好难过...',
      '老师让我当班干部，但是我不知道该怎么做。如果做不好，老师会不会不喜欢我了？',
      '妈妈说要给我换学校，但是我不想走。我舍不得现在的同学和老师，新学校会不会没人跟我玩？',
      
      // 初中生的困惑
      '学习压力好大...每天做作业到半夜，成绩还是上不去。隔壁班的那个学霸好像从来不用努力就能考第一，我好嫉妒。',
      '我最好的朋友要转学了，以后再也见不到了。我们从小学就在一起，突然要分开了，好舍不得...该怎么办？',
      '爸妈天天吵架，还老是拿我的成绩说事。我真的已经很努力了，但他们总觉得不够。我好累，真的好累...',
      '班里成立了很多小团体，我好像哪个都融不进去。每天午饭都是一个人吃，感觉自己像个透明人。',
      '喜欢上了班里一个女生/男生，但不敢表白。看到ta和别人说话就好难受，这种感觉是喜欢吗？该怎么办？',
      '月考又退步了，从20名掉到40名。老师找我谈话，爸妈也很失望。我该怎么办？感觉压力好大...',
      '被班主任误会作弊了，明明没有，但老师不相信我。同学们用奇怪的眼神看我，我该怎么证明自己？',
      '和好朋友闹矛盾了，因为一件小事吵了起来。现在两个人都拉不下脸道歉，但我真的不想失去这个朋友...',
      '爸妈要离婚了，他们让我选择跟谁。我两个都舍不得，为什么要让我选？我该怎么办？',
      '体育考试总是不及格，每次跑800米都跑不下来。同学们都笑话我，我真的很努力了，但就是跑不快...',
      '参加班干部竞选落选了，我准备了很久的演讲。现在感觉自己很失败，同学们会不会觉得我很差劲？',
      '被孤立了，不知道为什么。以前一起玩的朋友现在都不理我了，我做错什么了吗？',
      '父母给我报了很多补习班，周末都没时间休息。我想和他们说，但又怕他们说我不争气...',
      
      // 高中生的困惑
      '高三了，压力大到快喘不过气。每天看着倒计时，就觉得特别焦虑。万一考不上好大学，对不起爸妈怎么办？',
      '父母天天逼我学习，周末也不让休息。我知道他们是为我好，但我真的需要一点自己的空间...好想逃离这一切。',
      '暗恋了一个人三年，马上就要毕业了。要不要表白？如果被拒绝了，连朋友都没得做了。好纠结...',
      '感觉自己和父母的代沟越来越大。他们不理解我，我也不想和他们沟通。家里气氛很压抑，但我不知道怎么改变。',
      '选文理科的时候，父母非要我选理科，但我更喜欢文科。是听他们的还是听自己的？好迷茫...',
      
      // 大学生/职场新人的困惑
      '大学四年马上要结束了，同学都找好工作了，我还在迷茫。不知道自己喜欢什么，适合什么。毕业等于失业吗？',
      '第一次实习，发现职场和想象的完全不一样。同事好现实，每天都在勾心斗角。我该继续坚持还是换个方向？',
      '喜欢的人和我表白了，但我家在A城，ta在B城。异地恋真的可以坚持吗？好害怕最后两败俱伤...',
      '刚毕业工资好低，连房租都快付不起了。看着同学一个个过得光鲜亮丽，我却连养活自己都困难。差距怎么这么大？',
      
      // 职场人士的困惑  
      '25岁了，还不知道自己想要什么。看着周围的人都有明确的目标，而我却像一叶浮萍，随波逐流。你是怎么找到人生方向的？',
      '又一次被拒绝了。投了几十份简历，都石沉大海。开始怀疑自己是不是真的不够优秀。如果你也经历过这样的时刻，能告诉我该怎么办吗？',
      '老板是个控制狂，事无巨细都要管。每天加班到很晚，工资还不高。想辞职又怕找不到工作，好纠结...',
      '新来的同事很优秀，领导特别器重ta。我感觉自己的位置岌岌可危，但又不知道该怎么提升自己。',
      '暗恋公司的一个同事很久了，但不知道ta有没有对象。要不要表白？怕表白了连朋友都没得做，但不表白又好难受...',
      '和女朋友/男朋友吵架了，冷战三天了。我想道歉但拉不下脸，ta也不理我。该怎么办？感情真的好难经营...',
      
      // 中年人的困惑
      '三十岁的焦虑像潮水一样涌来。没车没房没存款，未来一片迷茫。有时候真的很想知道，生活会变好吗？',
      '上有老下有小，工作压力山大。每个月工资刚发就没了，房贷车贷孩子教育费...什么时候是个头？',
      '孩子越来越不听话，和我们的关系也越来越疏远。想和ta沟通，但不知道该怎么说。是我的方式错了吗？',
      '最近总是失眠，身体也出现了各种小毛病。工作的意义是什么？这样拼命工作到底值不值得？'
    ]
  },
  {
    topic: '美食分享',
    mood: 'happy' as const,
    contents: [
      '今天吃到了一家超级好吃的小面馆！老板是个大爷，面条手工现擀的，汤头熬了好几个小时。虽然店面很小，但排队的人超多。你的城市有什么好吃的推荐吗？',
      '第一次做饭成功了！虽然只是简单的番茄炒蛋，但看着自己做出来的菜，成就感爆棚。下次想挑战更难的菜，有什么建议吗？',
      '深夜放毒！刚吃完烧烤回来，五花肉烤得外焦里嫩，配上冰可乐，人生圆满了。虽然明天要后悔，但今晚先快乐！你最喜欢吃什么夜宵？',
      '发现了一家宝藏甜品店！他们家的提拉米苏入口即化，咖啡味道刚刚好。老板说每天限量供应，去晚了就没了。分享给收到瓶子的你~'
    ]
  },
  {
    topic: '宠物趣事',
    mood: 'happy' as const,
    contents: [
      '我家猫今天干了件超级搞笑的事！它试图跳上柜子，结果失败了，还假装什么都没发生地舔毛。笑死我了哈哈哈。你养宠物吗？',
      '遛狗的时候遇到一只超级热情的金毛，直接扑到我身上要抱抱。它的主人说它见到人就这样，是个社交达人。好想也养一只！',
      '我家仓鼠昨天越狱了！找了半天，最后在沙发底下发现它，嘴里塞满了瓜子，鼓鼓的。原来是偷粮食去了哈哈哈。',
      '楼下的流浪猫终于肯让我摸了！花了两个月时间投喂，今天它终于主动蹭我的腿。这种被小动物信任的感觉太幸福了！'
    ]
  },
  {
    topic: '日常趣事',
    mood: 'happy' as const,
    contents: [
      // 小学生的趣事
      '今天上课的时候，我的肚子突然咕咕叫，超级大声！全班同学都听到了，大家都在笑。老师也笑了，说是我的肚子在唱歌哈哈哈！',
      '体育课玩游戏的时候，我跑太快撞到了树上。头上起了个大包，像长角了一样。同学们都叫我独角兽，好搞笑！',
      '今天美术课画自画像，我把自己画成了外星人的样子。老师看了说：嗯...很有创意！同学们都笑疯了！',
      '课间操的时候，我的裤子突然掉下来了（因为松紧带断了）。好丢脸啊！还好老师及时帮我系好了。',
      
      // 初中生的趣事
      '今天化学实验课，我和同桌把试管打碎了。老师的表情...我现在想起来还想笑，但当时真的超级紧张！',
      '体育课打篮球，我想帅气地投个三分球，结果球直接飞出了场外，砸到了隔壁班的窗户。全班爆笑，我社死了...',
      '午休的时候睡着了，醒来发现脸上被同学画了个大花猫。照镜子的时候吓了一跳，同学们笑得肚子疼！',
      '今天考试答题卡涂错了，发现的时候已经来不及了。交卷后整个人都傻了，不知道能得几分...',
      
      // 成年人的趣事
      '今天坐地铁的时候，旁边一个小朋友一直盯着我看，然后突然说："姐姐，你长得好像我家的泰迪！"我：？？？不知道该开心还是该哭笑不得。',
      '刚才出门忘记带钥匙了，爬窗户的时候被邻居看到，以为我是小偷差点报警。解释了半天才相信，太尴尬了！你有过这种社死时刻吗？',
      '今天遇到一个超级有趣的外卖小哥，备注上写着"轻拿轻放"，他真的把餐盒像捧着宝贝一样送来，还鞠了个躬。笑死我了，给了五星好评！',
      '去超市买东西，自助结账的时候机器一直说"商品未放入购物区"，我试了十几次还是不行。后面排队的人都在看我，最后发现是机器坏了...社死现场！'
    ]
  },
  {
    topic: '旅行见闻',
    mood: 'excited' as const,
    contents: [
      '第一次看到大海！海风吹在脸上带着咸湿的味道，浪花拍打着礁石，那一刻觉得所有的烦恼都不值一提。你去过最美的地方是哪里？',
      '在古镇住了两天，早上被鸟鸣叫醒，推开窗就是青石板路和小桥流水。时间好像变慢了，生活的节奏也温柔了许多。好想一直住在这里。',
      '爬山的时候看到了云海！站在山顶，云雾在脚下翻涌，太阳从云层中透出金色的光。那一刻真的觉得，所有的辛苦都值得了。',
      '在草原上骑马，策马奔腾的感觉太爽了！风在耳边呼呼作响，草原一望无际。虽然屁股被颠得疼，但这种自由的感觉太棒了！'
    ]
  },
  {
    topic: '兴趣爱好',
    mood: 'excited' as const,
    contents: [
      '终于通关了这个游戏！花了三个月，但剧情真的太棒了。最后一幕还哭了。你有什么特别投入的爱好吗？',
      '开始学摄影了！今天拍到了超级满意的照片，夕阳、剪影、构图都刚刚好。虽然拍废了上百张，但这一张就值了！',
      '跑完了人生第一个5公里！虽然累到怀疑人生，但冲过终点的那一刻真的超有成就感。下个目标是10公里，给自己加油！',
      '最近迷上了做手工，今天做了一个超可爱的小布偶。虽然针线不太整齐，但这是我亲手做的，超有成就感！你有什么特别的爱好吗？'
    ]
  },
  {
    topic: '读书感悟',
    mood: 'thoughtful' as const,
    contents: [
      '最近在读一本很有意思的书，每天睡前看几页，感觉整个人都安静下来了。书里有句话："我们都在阴沟里，但仍有人仰望星空。"你有什么推荐的好书吗？',
      '看完了一本小说，故事的结局让我想了很久。有些人注定会离开，有些遗憾无法弥补，但生活还是要继续。你最近读了什么书？',
      '在书店待了一下午，翻了好多书。突然觉得，读书的意义不在于记住多少，而在于那些瞬间的共鸣和思考。',
      '今天读到一句话："人生就像一本书，愚者草草翻过，智者细细品读。"我在想，我是在怎样翻阅自己的人生呢？'
    ]
  },
  {
    topic: '友情回忆',
    mood: 'grateful' as const,
    contents: [
      // 小学生的友情
      '今天和好朋友分享了我最爱吃的糖果，ta也分给我好玩的玩具。这就是好朋友吧！',
      '我和同桌约好了，以后要一直做好朋友。我们还击掌发誓了呢！',
      
      // 初中生的友情
      '和好朋友一起参加运动会，虽然没拿到名次，但一起努力的过程真的很开心。友谊万岁！',
      '好朋友今天送了我生日礼物，是我一直想要的那本书。有ta真好！',
      '和朋友们一起准备班级活动，虽然很累但很开心。这些回忆一定会记一辈子。',
      
      // 高中生的友情
      '高三了，和朋友们约好一起考同一所大学。虽然不知道能不能实现，但这个约定很珍贵。',
      '毕业在即，和好朋友们一起拍了很多照片。不想分开，但天下没有不散的宴席...',
      
      // 成年人的友情
      '今天突然收到了高中同学的消息，十年没见了，她还记得我最喜欢吃的零食。有些友情即使很久不联系，再见面也还是那么亲切。',
      '和朋友聊天聊到凌晨三点，从工作聊到梦想，从过去聊到未来。这种能推心置腹的朋友真的太珍贵了。你有这样的朋友吗？',
      '搬家的时候翻出了以前的毕业纪念册，看着那些熟悉的面孔，突然很想念大家。虽然现在各自忙碌，但那段青春时光永远不会褪色。',
      '闺蜜知道我失恋了，大半夜跑来陪我，带着一堆零食和我一起骂渣男。有这样的朋友，再难过的事情也能扛过去。'
    ]
  },
  {
    topic: '亲情温暖',
    mood: 'grateful' as const,
    contents: [
      // 小学生的亲情
      '今天不小心摔倒了，膝盖破了皮。妈妈一边帮我擦药一边吹气，说这样就不疼了。有妈妈真好！',
      '爸爸今天教我做数学题，很耐心地讲了好多遍。虽然我还是不太懂，但爸爸说慢慢来。',
      '奶奶每天都会给我准备好吃的零食。她说小孩子就要多吃点，才能长高高。',
      
      // 初中生的亲情
      '期中考试考砸了，本来很害怕爸妈会骂我。但他们只是说下次努力就好。爸妈真好！',
      '妈妈知道我喜欢吃草莓，特意去很远的地方买回来。虽然很贵，但她说看我开心就值得。',
      '和父母吵架了，晚上妈妈还是来给我盖被子。其实我知道，他们都是为了我好。',
      
      // 高中生的亲情
      '高考倒计时的压力下，爸妈从来不给我压力，只是默默地做好后勤。有他们真好。',
      '生病住院，妈妈在医院陪了我一整夜。早上看到她满眼血丝，心里很难受。',
      
      // 成年人的亲情
      '今天视频通话的时候，妈妈不小心把镜头对着了天花板，她研究了半天才搞明白。虽然笨笨的，但想到她在努力学习只是为了和我视频，就觉得好温暖。',
      '爸爸今天发了一条朋友圈，配的是我小时候的照片，文案只有两个字："想你"。看到的时候眼泪瞬间就下来了。',
      '奶奶每次打电话都要问我吃得好不好，穿得暖不暖。虽然每次都说一样的话，但每次听到都觉得好幸福。她的唠叨里都是爱。',
      '收到了妈妈寄来的包裹，里面塞满了家乡的特产和零食。她还放了一张纸条："多吃点，别总叫外卖。"看着看着就哭了。'
    ]
  },
  {
    topic: '工作日常',
    mood: 'thoughtful' as const,
    contents: [
      '今天完成了一个困扰很久的项目，那种成就感太爽了！虽然加了不少班，但看到成果的那一刻，觉得一切都值得。你的工作有给你带来过这种快乐吗？',
      '第一天上班，紧张得手心都在出汗。不过同事们都很友好，午饭的时候还带我去了附近好吃的餐厅。新的开始，希望一切顺利！',
      '今天收到了来自客户的感谢信，说我的服务帮了他们大忙。这种被认可的感觉真好，原来工作也可以带来这么多正向反馈。',
      '下班路上看到夕阳特别美，突然觉得每天上下班的路也可以很美好。生活嘛，总要找点小确幸。'
    ]
  },
  {
    topic: '成长时刻',
    mood: 'excited' as const,
    contents: [
      '今天鼓起勇气做了一件一直不敢做的事，虽然过程中紧张到发抖，但做完之后超有成就感！原来突破自己的感觉这么爽！',
      '终于学会了独立生活。从一开始手忙脚乱到现在井井有条，才发现自己比想象中更能干。成长就是这样一点点积累的吧。',
      '今天被领导当众表扬了，说我进步很大。那一刻真的觉得所有的努力都没有白费。继续加油！',
      '第一次一个人搬家，虽然累得要命，但把新家收拾好的那一刻，突然觉得自己长大了。这是我独立生活的新开始。'
    ]
  },
  {
    topic: '音乐分享',
    mood: 'happy' as const,
    contents: [
      '今天单曲循环了一首歌一整天，每个音符都戳中心窝。音乐真的有种魔力，能让情绪找到出口。你最近在听什么歌？',
      '去看了演唱会！现场的氛围太燃了，所有人一起唱的时候，那种感觉简直无法形容。这就是音乐的魅力吧！',
      '学吉他学了一个月，终终于能完整弹一首歌了！虽然还不太熟练，但能听出调了哈哈哈。音乐真的能给人很大的满足感。',
      '今天在咖啡馆听到一首超好听的歌，用手机识别了半天才找到。已经加入了歌单，推荐给收到这个瓶子的你！'
    ]
  },
  {
    topic: '季节感悟',
    mood: 'thoughtful' as const,
    contents: [
      '第一场雪来了！早上推开窗，整个世界都是白茫茫的。小区里的小朋友们在堆雪人，笑声清脆。冬天突然变得很可爱。',
      '春天真的来了！路边的樱花开了，风一吹就是一场粉色的雨。站在树下的那一刻，觉得这一年都会很美好。',
      '夏天的傍晚最舒服了。坐在窗边，吹着晚风，听着蝉鸣，吃着西瓜。这种简单的快乐，才是生活最真实的样子。',
      '秋天的落叶铺满了整条街道，踩上去沙沙作响。空气里有桂花的香味，这个季节总让人觉得温柔。'
    ]
  },
  {
    topic: '城市故事',
    mood: 'thoughtful' as const,
    contents: [
      '在这座城市生活了三年，从陌生到熟悉，从孤单到有了自己的小圈子。这里有我喜欢的咖啡馆，常去的书店，还有很多回忆。你和你的城市有什么故事？',
      '今天走了一条没走过的路，发现了一条很有特色的小巷。老式建筑，爬满青藤，有种穿越时空的感觉。城市里总有惊喜等着被发现。',
      '深夜的城市很安静，路灯拉长了影子。偶尔有车经过，带起一阵风。这个时候的城市好像卸下了面具，露出最真实的一面。',
      '第一次来这座城市的时候，觉得好陌生好孤单。现在已经习惯了这里的节奏，甚至开始喜欢它的拥挤和喧嚣。这就是第二故乡吧。'
    ]
  },
  {
    topic: '电影推荐',
    mood: 'excited' as const,
    contents: [
      '今天看了一部超级棒的电影，结局反转得我目瞪口呆！强烈推荐！不过不能剧透，你自己去看吧哈哈哈。你最近有看什么好电影吗？',
      '一个人去看了电影，旁边的位置空着，但不觉得孤单。沉浸在剧情里的感觉很好，散场的时候还有点意犹未尽。',
      '重温了一部老电影，小时候看不懂，现在看哭了。人生阅历不同，感受真的会完全不一样。有些电影值得一看再看。',
      '今天看电影的时候旁边坐了一对情侣，全程在讨论剧情。虽然有点吵，但看到他们开心的样子，也跟着笑了。'
    ]
  }
];

/**
 * 获取今天的日期字符串
 */
function getTodayString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

/**
 * 获取今日打捞记录
 */
export function getTodayFishingRecord(): BottleFishingRecord {
  const today = getTodayString();
  const saved = localStorage.getItem(FISHING_STORAGE_KEY);
  
  if (saved) {
    const record: any = JSON.parse(saved);
    
    // 如果是新的一天，重置记录
    if (record.date !== today) {
      const newRecord: BottleFishingRecord = {
        date: today,
        fishedCount: 0,
        maxCount: MAX_DAILY_FISHING,
        thrownBackBottles: [],
        fishedBottles: []
      };
      localStorage.setItem(FISHING_STORAGE_KEY, JSON.stringify(newRecord));
      return newRecord;
    }
    
    // 数据兼容性处理：确保旧记录有新字段
    if (!record.fishedBottles) {
      record.fishedBottles = [];
    }
    if (!record.thrownBackBottles) {
      record.thrownBackBottles = [];
    }
    
    // 保存更新后的记录
    localStorage.setItem(FISHING_STORAGE_KEY, JSON.stringify(record));
    return record as BottleFishingRecord;
  }
  
  // 首次使用，创建新记录
  const newRecord: BottleFishingRecord = {
    date: today,
    fishedCount: 0,
    maxCount: MAX_DAILY_FISHING,
    thrownBackBottles: [],
    fishedBottles: []
  };
  localStorage.setItem(FISHING_STORAGE_KEY, JSON.stringify(newRecord));
  return newRecord;
}

/**
 * 保存打捞记录
 */
function saveFishingRecord(record: BottleFishingRecord): void {
  localStorage.setItem(FISHING_STORAGE_KEY, JSON.stringify(record));
}

/**
 * 获取用户统计数据
 */
export function getBottleStats(): UserBottleStats {
  const saved = localStorage.getItem(STATS_STORAGE_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  
  const stats: UserBottleStats = {
    totalFished: 0,
    totalReplied: 0,
    totalThrownBack: 0,
    receivedReplies: 0
  };
  localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  return stats;
}

/**
 * 保存统计数据
 */
function saveBottleStats(stats: UserBottleStats): void {
  localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
}

/**
 * 检查今天是否还能打捞
 */
export function canFishToday(): { can: boolean; remaining: number; reason?: string } {
  const record = getTodayFishingRecord();
  const remaining = record.maxCount - record.fishedCount;
  
  if (remaining > 0) {
    return { can: true, remaining };
  }
  
  return { 
    can: false, 
    remaining: 0, 
    reason: '今天的打捞次数已用完，明天再来吧！' 
  };
}

/**
 * 生成随机漂流瓶 (旧版本，保留兼容性)
 */
export function generateRandomBottleOld(): BottleLetter {
  // 随机选择发送者
  const sender = BOTTLE_SENDERS[Math.floor(Math.random() * BOTTLE_SENDERS.length)];
  
  // 随机选择话题模板
  const template = BOTTLE_TEMPLATES[Math.floor(Math.random() * BOTTLE_TEMPLATES.length)];
  
  // 随机选择该话题下的内容
  const content = template.contents[Math.floor(Math.random() * template.contents.length)];
  
  const bottle: BottleLetter = {
    id: `bottle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    senderId: sender.id,
    senderName: sender.name,
    senderAvatar: sender.avatar,
    senderAge: sender.age,
    senderGender: sender.gender,
    senderLocation: sender.location,
    content,
    topic: template.topic,
    mood: template.mood,
    timestamp: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000, // 1-7天前
    language: 'zh'
  };
  
  return bottle;
}

/**
 * 生成年龄匹配的随机漂流瓶 (新版本)
 */
export function generateRandomBottle(): BottleLetter {
  let bottle: BottleLetter;
  let attempts = 0;
  const maxAttempts = 5;
  
  // 尝试生成高多样性的内容
  do {
    if (Math.random() < 0.8) {
      bottle = generateAgeAppropriateBottle();
    } else {
      bottle = generateRandomBottleOld();
    }
    
    // 评估多样性
    const diversity = evaluateContentDiversity(bottle);
    if (diversity.score >= 70 || attempts >= maxAttempts - 1) {
      break;
    }
    attempts++;
  } while (attempts < maxAttempts);
  
  // 记录生成的内容
  recordBottleContent(bottle);
  
  return bottle;
}

/**
 * 打捞漂流瓶
 */
export function fishBottle(): { success: boolean; bottle?: BottleLetter; error?: string } {
  const check = canFishToday();
  
  if (!check.can) {
    return { success: false, error: check.reason };
  }
  
  // 生成漂流瓶
  const bottle = generateRandomBottle();
  
  // 更新打捞记录
  const record = getTodayFishingRecord();
  record.fishedCount++;
  record.lastFishingTime = Date.now();
  
  // 记录打捞的瓶子（用于追踪未处理的瓶子）
  if (!record.fishedBottles) {
    record.fishedBottles = [];
  }
  record.fishedBottles.push({
    ...bottle,
    fishedTime: Date.now()
  });
  
  saveFishingRecord(record);
  
  // 更新统计
  const stats = getBottleStats();
  stats.totalFished++;
  saveBottleStats(stats);
  
  return { success: true, bottle };
}

/**
 * 投回海里
 */
export function throwBackBottle(bottle?: BottleLetter): boolean {
  if (bottle) {
    const record = getTodayFishingRecord();
    
    // 从打捞记录中移除（因为已经明确投回了）
    if (record.fishedBottles) {
      record.fishedBottles = record.fishedBottles.filter(b => b.id !== bottle.id);
    }
    
    // 记录投回的瓶子（保存1天）
    if (!record.thrownBackBottles) {
      record.thrownBackBottles = [];
    }
    record.thrownBackBottles.push({
      ...bottle,
      thrownBackTime: Date.now()
    });
    saveFishingRecord(record);
  }
  
  // 更新统计
  const stats = getBottleStats();
  stats.totalThrownBack++;
  saveBottleStats(stats);
  
  return true;
}

/**
 * 获取可以捞回的瓶子（包括投回的和未处理的）
 */
export function getRetrievableBottles(): Array<BottleLetter & { thrownBackTime?: number; fishedTime?: number; type: 'thrown' | 'unfished' }> {
  const record = getTodayFishingRecord();
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  
  const result: Array<BottleLetter & { thrownBackTime?: number; fishedTime?: number; type: 'thrown' | 'unfished' }> = [];
  
  // 1. 添加1天内投回的瓶子
  if (record.thrownBackBottles) {
    const thrownBottles = record.thrownBackBottles
      .filter(bottle => (now - bottle.thrownBackTime) < oneDayMs)
      .map(bottle => ({ ...bottle, type: 'thrown' as const }));
    result.push(...thrownBottles);
  }
  
  // 2. 添加打捞但未处理的瓶子（1天内）
  if (record.fishedBottles) {
    const unfishedBottles = record.fishedBottles
      .filter(bottle => (now - bottle.fishedTime) < oneDayMs)
      .map(bottle => ({ ...bottle, type: 'unfished' as const }));
    result.push(...unfishedBottles);
  }
  
  return result;
}

/**
 * 捞回瓶子
 */
export function retrieveBottle(bottleId: string): { success: boolean; bottle?: BottleLetter; error?: string } {
  const retrievable = getRetrievableBottles();
  const bottle = retrievable.find(b => b.id === bottleId);
  
  if (!bottle) {
    return { success: false, error: '找不到这个瓶子或已漂远' };
  }
  
  // 从对应的记录中移除
  const record = getTodayFishingRecord();
  
  if (bottle.type === 'thrown' && record.thrownBackBottles) {
    // 从投回记录中移除
    record.thrownBackBottles = record.thrownBackBottles.filter(b => b.id !== bottleId);
  } else if (bottle.type === 'unfished' && record.fishedBottles) {
    // 从打捞记录中移除
    record.fishedBottles = record.fishedBottles.filter(b => b.id !== bottleId);
  }
  
  saveFishingRecord(record);
  
  return { success: true, bottle };
}

/**
 * 回复漂流瓶（记录统计并从打捞记录中移除）
 */
export function replyToBottle(bottleId?: string): void {
  if (bottleId) {
    // 从打捞记录中移除（因为已经回复了）
    const record = getTodayFishingRecord();
    if (record.fishedBottles) {
      record.fishedBottles = record.fishedBottles.filter(b => b.id !== bottleId);
      saveFishingRecord(record);
    }
  }
  
  const stats = getBottleStats();
  stats.totalReplied++;
  saveBottleStats(stats);
}

/**
 * 获取打捞提示文字
 */
export function getFishingHint(): string {
  const check = canFishToday();
  
  if (check.remaining === 2) {
    return '今天还没有打捞过漂流瓶呢';
  } else if (check.remaining === 1) {
    return '今天还可以打捞1次';
  } else {
    return '今天的打捞次数已用完';
  }
}

/**
 * 手动恢复瓶子（用于找回因界面问题丢失的瓶子）
 * 返回瓶子和对应的AI角色信息
 */
export function restoreBottle(
  senderName: string,
  content: string,
  senderAge?: number,
  senderLocation?: string,
  topic?: string,
  mood?: 'happy' | 'sad' | 'thoughtful' | 'excited' | 'lonely' | 'grateful'
): { bottle: BottleLetter; aiProfile: any } {
  // 根据名字风格匹配头像（尽可能匹配原角色）
  const avatarMap: Record<string, string> = {
    '玫瑰': '🌸',
    '金鱼': '🌊',
    '鲸鱼': '📚',
    '猫': '🐚',
    '鸟': '🎵',
    '熊': '☕',
    '兔': '🌙',
    '鹿': '🍃',
    '狐': '🎨',
    '狼': '⛰️',
    '花': '🌸',
    '鱼': '🌊'
  };
  
  // 尝试从名字中提取动物/花名来匹配头像
  let avatar = '💭';
  for (const [key, emoji] of Object.entries(avatarMap)) {
    if (senderName.includes(key)) {
      avatar = emoji;
      break;
    }
  }
  
  // 根据内容推断话题和心情
  const inferredTopic = topic || (
    content.includes('焦虑') || content.includes('迷茫') ? '生活感悟' :
    content.includes('孤独') || content.includes('想念') ? '孤独心情' :
    content.includes('开心') || content.includes('快乐') ? '开心分享' :
    content.includes('梦想') || content.includes('追寻') ? '梦想追寻' :
    '生活感悟'
  );
  
  const inferredMood = mood || (
    content.includes('焦虑') || content.includes('迷茫') ? 'thoughtful' :
    content.includes('孤独') || content.includes('想念') ? 'lonely' :
    content.includes('开心') || content.includes('快乐') ? 'happy' :
    content.includes('梦想') || content.includes('追寻') ? 'excited' :
    'thoughtful'
  );
  
  // 根据内容推断性格
  const inferredPersonality = 
    content.includes('焦虑') || content.includes('迷茫') ? '敏感细腻，善于思考人生' :
    content.includes('孤独') || content.includes('想念') ? '细腻温柔，渴望陪伴' :
    content.includes('开心') || content.includes('快乐') ? '乐观开朗，积极向上' :
    content.includes('梦想') || content.includes('追寻') ? '勇敢坚定，追求理想' :
    '真诚友善，喜欢交流';
  
  // 根据内容推断爱好
  const inferredHobby =
    content.includes('读书') || content.includes('阅读') ? '读书、写作' :
    content.includes('旅行') || content.includes('远方') ? '旅行、摄影' :
    content.includes('音乐') || content.includes('歌') ? '音乐、艺术' :
    '思考人生、写日记';
  
  // 创建唯一的AI ID
  const aiId = `bottle_restored_ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // 创建完整的AI角色信息（用于回信）
  const aiProfile = {
    id: aiId,
    name: senderName,
    avatar: avatar,
    age: senderAge,
    personality: inferredPersonality,
    location: senderLocation || '远方',
    hobby: inferredHobby,
    isCustom: false
  };
  
  const bottle: BottleLetter = {
    id: `bottle_restored_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    senderId: aiId,  // 使用真实的AI ID
    senderName,
    senderAvatar: avatar,
    senderAge,
    senderGender: 'other',
    senderLocation: senderLocation || '未知',
    content,
    topic: inferredTopic,
    mood: inferredMood,
    timestamp: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
    language: 'zh'
  };
  
  return { bottle, aiProfile };
}
