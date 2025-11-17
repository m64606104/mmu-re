/**
 * 统一的名字生成器
 * 生成形容词+名词的组合名字
 */

// 形容词词库（描述性的）
const ADJECTIVES = [
  // 性格特质
  '温柔的', '勇敢的', '自由的', '快乐的', '孤独的', '浪漫的',
  '神秘的', '安静的', '活泼的', '忧郁的', '梦幻的', '坚强的',
  '温暖的', '清澈的', '迷人的', '优雅的', '可爱的', '聪明的',
  '善良的', '真诚的', '热情的', '冷静的', '深沉的', '灵动的',
  
  // 地点环境
  '海边的', '山间的', '城市的', '乡村的', '远方的', '夜空的',
  '森林的', '湖畔的', '街角的', '咖啡馆的', '图书馆的', '书店的',
  '雨中的', '雪地的', '沙漠的', '草原的', '海洋的', '星空的',
  
  // 时间状态
  '黎明的', '午夜的', '黄昏的', '清晨的', '深夜的', '晨曦的',
  '暮色的', '月光下的', '阳光下的', '风中的', '雾里的', '云端的'
];

// 名词词库（身份角色）
const NOUNS = [
  // 旅行相关
  '旅人', '行者', '漫步者', '流浪者', '探索者', '冒险家',
  '游者', '过客', '访客', '来客', '远客', '归人',
  
  // 观察相关
  '观察者', '守望者', '倾听者', '见证者', '记录者', '寻觅者',
  '追寻者', '拾光者', '寻路人', '追梦者', '逐风者', '追星人',
  
  // 创作相关
  '诗人', '画师', '歌者', '舞者', '琴师', '作家',
  '吟游者', '说书人', '故事人', '织梦者', '造梦师', '拾梦者',
  
  // 守护相关
  '守夜人', '守护者', '陪伴者', '倾听人', '知己', '挚友',
  
  // 自然相关
  '赏花客', '听雨人', '观星者', '看云者', '摘星人', '拾贝人',
  
  // 其他
  '信使', '收信人', '寄信者', '笔友', '读者', '常客'
];

/**
 * 生成随机名字（形容词+名词）
 */
export function generateRandomName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return adjective + noun;
}

/**
 * 生成特定风格的名字
 * @param style 风格类型
 */
export function generateStyledName(style?: 'romantic' | 'literary' | 'mysterious' | 'casual'): string {
  let adjectivePool = ADJECTIVES;
  let nounPool = NOUNS;
  
  if (style === 'romantic') {
    // 浪漫风格：温柔、梦幻、浪漫等
    adjectivePool = ['温柔的', '浪漫的', '梦幻的', '温暖的', '迷人的', '月光下的', '星空的', '黄昏的'];
    nounPool = ['诗人', '歌者', '舞者', '织梦者', '追梦者', '观星者'];
  } else if (style === 'literary') {
    // 文艺风格：书店、图书馆、诗人等
    adjectivePool = ['安静的', '优雅的', '深沉的', '书店的', '图书馆的', '咖啡馆的'];
    nounPool = ['诗人', '作家', '读者', '说书人', '故事人', '守夜人'];
  } else if (style === 'mysterious') {
    // 神秘风格：夜晚、雾、深沉等
    adjectivePool = ['神秘的', '深沉的', '午夜的', '深夜的', '雾里的', '暮色的'];
    nounPool = ['守望者', '观察者', '守夜人', '行者', '过客'];
  } else if (style === 'casual') {
    // 随意风格：简单自然
    adjectivePool = ['快乐的', '自由的', '活泼的', '阳光下的', '风中的'];
    nounPool = ['旅人', '行者', '漫步者', '游者', '常客'];
  }
  
  const adjective = adjectivePool[Math.floor(Math.random() * adjectivePool.length)];
  const noun = nounPool[Math.floor(Math.random() * nounPool.length)];
  return adjective + noun;
}

/**
 * 批量生成不重复的名字
 * @param count 数量
 */
export function generateUniqueNames(count: number): string[] {
  const names = new Set<string>();
  let attempts = 0;
  const maxAttempts = count * 10; // 防止死循环
  
  while (names.size < count && attempts < maxAttempts) {
    names.add(generateRandomName());
    attempts++;
  }
  
  return Array.from(names);
}
