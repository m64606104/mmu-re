/**
 * 随机名字生成器
 * 咸鱼风格：形容词 + 的 + 名词
 * 例如：沉默的安康鱼、寂寞的鱼寿司、温柔的小熊猫
 */

// 形容词库（描述性格、状态、感觉）
const ADJECTIVES = [
  // 情感类
  '温柔', '孤独', '快乐', '忧郁', '浪漫', '梦幻', '平静', '热情',
  '沉默', '寂寞', '开朗', '文艺', '慵懒', '淡定', '善良', '真诚',
  '自由', '勇敢', '羞涩', '活泼', '安静', '神秘', '优雅', '可爱',
  
  // 状态类
  '迷路', '流浪', '晚归', '早起', '熬夜', '失眠', '发呆', '沉思',
  '漫步', '奔跑', '飞翔', '游荡', '徘徊', '等待', '寻找', '追梦',
  
  // 特征类
  '呆萌', '傲娇', '高冷', '逗比', '佛系', '慢热', '随性', '认真',
  '迷糊', '机灵', '呆呆', '笨笨', '乖巧', '调皮', '古怪', '奇怪',
  
  // 时间/天气类
  '晨曦中', '黄昏里', '深夜', '午后', '雨天', '晴空下', '雪地',
  '春日', '夏夜', '秋风', '冬季', '月光下', '星空下', '云端'
];

// 名词库（动物、食物、植物、物品）
const NOUNS = [
  // 可爱动物
  '小熊猫', '小浣熊', '小企鹅', '小海豹', '小水獭', '小仓鼠', '小兔子',
  '小松鼠', '小刺猬', '小考拉', '小树懒', '小狐狸', '小猫咪', '小狗狗',
  
  // 海洋生物
  '安康鱼', '小海豚', '小鲸鱼', '小海星', '小章鱼', '小海马', '小海龟',
  '海月水母', '小丑鱼', '蓝鲸', '海獭', '小虾米', '小螃蟹', '海螺',
  
  // 鸟类
  '小麻雀', '小鸽子', '小燕子', '小鹦鹉', '小金丝雀', '小翠鸟', '企鹅',
  '猫头鹰', '小鸵鸟', '小天鹅', '小孔雀', '小鸳鸯', '小鸬鹚',
  
  // 食物
  '鱼寿司', '小丸子', '小汤圆', '小饺子', '小包子', '小馒头', '小蛋糕',
  '小泡芙', '马卡龙', '小甜甜', '小布丁', '小麻薯', '小糯米', '小年糕',
  
  // 植物
  '小雏菊', '小蒲公英', '小向日葵', '小玫瑰', '小百合', '小樱花', '小梅花',
  '小荷花', '小竹子', '小松树', '小枫叶', '小草莓', '小西瓜', '小柠檬',
  
  // 物品/概念
  '小星星', '小月亮', '小太阳', '小云朵', '小雨滴', '小雪花', '小露珠',
  '小石头', '小贝壳', '小羽毛', '小铃铛', '小音符', '小画笔', '小风筝',
  '小帆船', '小火车', '小飞机', '小汽车', '小气球', '小糖果', '书虫',
  
  // 抽象/诗意
  '旅人', '过客', '诗人', '画师', '歌者', '舞者', '梦想家', '探索者',
  '守望者', '追梦人', '拾光者', '寻梦者', '流浪者', '漫游者'
];

/**
 * 生成咸鱼风格的随机名字
 * 格式：形容词 + 的 + 名词
 */
export function generateXianyuStyleName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  
  // 如果形容词已经包含"的"（如"晨曦中"），就不加"的"
  if (adjective.endsWith('中') || adjective.endsWith('里') || adjective.endsWith('下')) {
    return `${adjective}的${noun}`;
  }
  
  return `${adjective}的${noun}`;
}

/**
 * 生成多个不重复的随机名字
 */
export function generateMultipleNames(count: number): string[] {
  const names = new Set<string>();
  let attempts = 0;
  const maxAttempts = count * 10;
  
  while (names.size < count && attempts < maxAttempts) {
    names.add(generateXianyuStyleName());
    attempts++;
  }
  
  return Array.from(names);
}

/**
 * 根据性格偏好生成名字
 */
export function generateNameByPersonality(personality: string): string {
  const p = personality.toLowerCase();
  
  // 根据性格选择合适的形容词和名词
  let adjectivePool = ADJECTIVES;
  let nounPool = NOUNS;
  
  // 活泼开朗型 - 偏好可爱、活泼的形容词
  if (p.includes('活泼') || p.includes('开朗') || p.includes('热情')) {
    adjectivePool = ['快乐', '开朗', '活泼', '热情', '调皮', '逗比', '可爱', '呆萌'];
    nounPool = NOUNS.filter(n => 
      n.includes('小') || n.includes('糖') || n.includes('甜') || n.includes('猫') || n.includes('兔')
    );
  }
  
  // 安静文艺型 - 偏好诗意、平静的形容词
  else if (p.includes('文艺') || p.includes('安静') || p.includes('温柔')) {
    adjectivePool = ['温柔', '文艺', '安静', '平静', '优雅', '浪漫', '梦幻', '诗意'];
    nounPool = NOUNS.filter(n => 
      n.includes('诗人') || n.includes('画师') || n.includes('雏菊') || n.includes('樱花') || n.includes('月亮')
    );
  }
  
  // 孤独忧郁型 - 偏好孤独、忧郁的形容词
  else if (p.includes('孤独') || p.includes('忧郁') || p.includes('内向')) {
    adjectivePool = ['孤独', '寂寞', '忧郁', '沉默', '迷路', '流浪', '徘徊', '深夜'];
    nounPool = NOUNS.filter(n => 
      n.includes('旅人') || n.includes('过客') || n.includes('流浪') || n.includes('猫头鹰') || n.includes('月亮')
    );
  }
  
  // 随性佛系型 - 偏好轻松、随意的形容词
  else if (p.includes('随性') || p.includes('佛系') || p.includes('慵懒')) {
    adjectivePool = ['慵懒', '佛系', '随性', '淡定', '发呆', '慢热', '迷糊', '午后'];
    nounPool = NOUNS.filter(n => 
      n.includes('树懒') || n.includes('考拉') || n.includes('小熊') || n.includes('云朵')
    );
  }
  
  const adjective = adjectivePool[Math.floor(Math.random() * adjectivePool.length)];
  const noun = nounPool[Math.floor(Math.random() * nounPool.length)];
  
  return `${adjective}的${noun}`;
}

/**
 * 批量生成漂流瓶发送者名字（用于替换现有的预设名字）
 */
export function generateBottleSenderNames(count: number = 8): string[] {
  return generateMultipleNames(count);
}
