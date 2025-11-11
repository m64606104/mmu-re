/**
 * 公众号系统工具函数
 * 管理公众号账号、发文逻辑、预设账号等
 */

import { OfficialAccountSettings, OfficialArticle, ApiConfig } from '../types';

const OFFICIAL_ACCOUNTS_KEY = 'official_accounts';

// 预设公众号列表
export const PRESET_ACCOUNTS: Omit<OfficialAccountSettings, 'articles' | 'followerCount' | 'lastPublishTime' | 'nextPublishTime'>[] = [
  {
    id: 'entertainment_news',
    name: '娱乐速递',
    avatar: '🎬',
    description: '最新娱乐资讯、明星动态、影视资讯',
    verified: true,
    contentType: 'entertainment',
    publishFrequency: 'daily',
    enabled: true,
    tags: ['娱乐', '明星', '八卦', '影视']
  },
  {
    id: 'food_explorer',
    name: '美食探索家',
    avatar: '🍔',
    description: '发现城市美食、特色餐厅推荐、美食攻略',
    verified: true,
    contentType: 'food',
    publishFrequency: 'daily',
    enabled: true,
    tags: ['美食', '探店', '餐厅', '美味']
  },
  {
    id: 'discount_info',
    name: '吃喝玩乐福利君',
    avatar: '💰',
    description: '每日精选优惠、折扣信息、羊毛攻略',
    verified: true,
    contentType: 'discount',
    publishFrequency: 'daily',
    enabled: true,
    tags: ['优惠', '折扣', '福利', '省钱']
  },
  {
    id: 'tech_daily',
    name: '科技日报',
    avatar: '📱',
    description: '科技前沿、数码评测、互联网资讯',
    verified: true,
    contentType: 'tech',
    publishFrequency: 'daily',
    enabled: true,
    tags: ['科技', '数码', '互联网', 'AI']
  },
  {
    id: 'finance_news',
    name: '财经速递',
    avatar: '💹',
    description: '财经新闻、市场动态、投资理财',
    verified: true,
    contentType: 'finance',
    publishFrequency: 'daily',
    enabled: true,
    tags: ['财经', '股市', '投资', '理财']
  },
  {
    id: 'game_news',
    name: '真就趣',
    avatar: '🎮',
    description: '游戏评测、史低折扣提醒、二手卡带购回收、任天堂游戏会员',
    verified: true,
    contentType: 'game',
    publishFrequency: 'daily',
    enabled: true,
    tags: ['游戏', 'Switch', 'NS', '折扣']
  }
];

/**
 * 初始化公众号系统
 * 如果本地没有公众号数据，创建预设账号
 */
export const initOfficialAccounts = (): void => {
  const existing = localStorage.getItem(OFFICIAL_ACCOUNTS_KEY);
  if (!existing) {
    const accounts: OfficialAccountSettings[] = PRESET_ACCOUNTS.map(preset => ({
      ...preset,
      articles: [],
      followerCount: Math.floor(Math.random() * 50000) + 10000, // 1万-6万关注
      lastPublishTime: undefined,
      nextPublishTime: Date.now() + getPublishInterval(preset.publishFrequency)
    }));
    localStorage.setItem(OFFICIAL_ACCOUNTS_KEY, JSON.stringify(accounts));
    console.log('✅ 公众号系统初始化完成，创建了', accounts.length, '个预设账号');
  }
};

/**
 * 获取所有公众号
 */
export const getAllOfficialAccounts = (): OfficialAccountSettings[] => {
  const data = localStorage.getItem(OFFICIAL_ACCOUNTS_KEY);
  if (!data) {
    initOfficialAccounts();
    return getAllOfficialAccounts();
  }
  return JSON.parse(data);
};

/**
 * 获取单个公众号
 */
export const getOfficialAccount = (id: string): OfficialAccountSettings | null => {
  const accounts = getAllOfficialAccounts();
  return accounts.find(acc => acc.id === id) || null;
};

/**
 * 保存公众号数据
 */
export const saveOfficialAccount = (account: OfficialAccountSettings): void => {
  const accounts = getAllOfficialAccounts();
  const index = accounts.findIndex(acc => acc.id === account.id);
  if (index !== -1) {
    accounts[index] = account;
  } else {
    accounts.push(account);
  }
  localStorage.setItem(OFFICIAL_ACCOUNTS_KEY, JSON.stringify(accounts));
};

/**
 * 根据发布频率获取发布间隔（毫秒）
 */
export const getPublishInterval = (frequency: OfficialAccountSettings['publishFrequency'], customHours?: number): number => {
  switch (frequency) {
    case 'hourly':
      return 60 * 60 * 1000; // 1小时
    case 'daily':
      return 24 * 60 * 60 * 1000; // 1天
    case 'weekly':
      return 7 * 24 * 60 * 60 * 1000; // 7天
    case 'custom':
      return (customHours || 24) * 60 * 60 * 1000;
    case 'realtime':
    default:
      return 0; // 实时
  }
};

/**
 * 为公众号生成文章内容
 * 使用AI生成符合类型的文章
 */
export const generateArticleContent = async (
  account: OfficialAccountSettings,
  apiConfig: ApiConfig
): Promise<OfficialArticle | null> => {
  try {
    const prompt = getArticlePrompt(account);
    
    const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.9,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      console.error('生成文章失败:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // 解析JSON
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('文章格式错误:', content);
        return null;
      }
      
      const articleData = JSON.parse(jsonMatch[0]);
      
      const article: OfficialArticle = {
        id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
        title: articleData.title,
        summary: articleData.summary,
        content: articleData.content,
        coverImage: articleData.coverImage,
        author: account.name,
        publishTime: Date.now(),
        readCount: 0,
        likeCount: 0,
        category: articleData.category || account.tags[0],
        source: account.name
      };
      
      return article;
    } catch (parseError) {
      console.error('解析文章失败:', content, parseError);
      return null;
    }
  } catch (error) {
    console.error('生成文章失败:', error);
    return null;
  }
};

/**
 * 获取生成文章的prompt
 */
const getArticlePrompt = (account: OfficialAccountSettings): string => {
  const contentTypePrompts = {
    entertainment: `
你是【${account.name}】公众号的编辑，专注于娱乐资讯。

【任务】
生成一篇娱乐新闻文章，内容真实有趣，符合公众号风格。

【内容方向】
- 明星动态、电影资讯、综艺节目
- 八卦热点、影视剧评论
- 娱乐圈趣事、明星访谈

【要求】
1. 标题吸引人，15-30字
2. 摘要简洁，50字左右
3. 正文800-1200字，分段清晰
4. 可以虚构合理的娱乐事件（如电影上映、综艺播出、明星动态）
5. 语言生动活泼，符合娱乐新闻风格`,

    food: `
你是【${account.name}】公众号的编辑，专注于美食资讯。

【任务】
生成一篇美食推荐文章，内容实用有趣。

【内容方向】
- 特色餐厅探店
- 美食菜谱分享
- 美食节活动
- 网红美食推荐

【要求】
1. 标题诱人，15-30字
2. 摘要简洁，50字左右
3. 正文600-1000字，分段清晰
4. 可以虚构合理的餐厅或美食
5. 语言亲切有趣，描述美食让人垂涎`,

    discount: `
你是【${account.name}】公众号的编辑，专注于折扣优惠信息。

【任务】
生成一篇优惠信息汇总文章。

【内容方向】
- 双十一、618等电商活动
- 餐厅优惠券、外卖折扣
- 电影票优惠、景点门票
- 超市促销、品牌折扣

【要求】
1. 标题醒目，突出优惠力度
2. 摘要简洁，列出核心优惠
3. 正文500-800字，优惠信息清晰
4. 可以虚构合理的优惠活动
5. 语言简洁明了，重点突出`,

    tech: `
你是【${account.name}】公众号的编辑，专注于科技资讯。

【任务】
生成一篇科技新闻文章。

【内容方向】
- 新品发布、数码评测
- 互联网动态、AI技术
- 科技公司新闻
- 行业趋势分析

【要求】
1. 标题专业，15-30字
2. 摘要简洁，50字左右
3. 正文800-1200字，逻辑清晰
4. 可以虚构合理的科技新闻
5. 语言专业但通俗易懂`,

    finance: `
你是【${account.name}】公众号的编辑，专注于财经资讯。

【任务】
生成一篇财经新闻文章。

【内容方向】
- 股市动态、市场分析
- 经济政策解读
- 投资理财建议
- 行业财报分析

【要求】
1. 标题专业，15-30字
2. 摘要简洁，50字左右
3. 正文800-1200字，数据清晰
4. 可以虚构合理的财经数据
5. 语言专业严谨`,

    game: `
你是【${account.name}】公众号的编辑，专注于游戏资讯。参考微信公众号"真就趣"的风格。

【任务】
生成一篇游戏资讯文章。

【内容方向】
- Switch游戏评测、史低折扣提醒
- 二手游戏卡带回收信息
- 任天堂会员优惠
- 游戏发售日程、限时活动

【要求】
1. 标题吸引玩家，15-30字
2. 摘要简洁，50字左右  
3. 正文600-1000字，信息实用
4. 可以虚构合理的游戏活动（如《超级马力欧银河河大电影》、《斯普拉遁3》活动等）
5. 语言亲切专业，面向游戏玩家`,

    life: `
你是【${account.name}】公众号的编辑，专注于生活百科。

【任务】
生成一篇生活技巧文章。

【内容方向】
- 生活小妙招
- 健康养生知识
- 家居收纳技巧
- 出行旅游攻略

【要求】
1. 标题实用，15-30字
2. 摘要简洁，50字左右
3. 正文600-1000字，实用易懂
4. 内容有实际帮助
5. 语言亲切友好`,

    custom: `
你是【${account.name}】公众号的编辑。

【任务】
生成一篇符合公众号定位的文章。

【要求】
1. 标题吸引人，15-30字
2. 摘要简洁，50字左右
3. 正文800-1200字，内容充实
4. 符合公众号风格
5. 语言流畅自然`
  };

  const basePrompt = contentTypePrompts[account.contentType] || contentTypePrompts.custom;

  return `${basePrompt}

【输出格式】
以JSON格式输出（只输出JSON，不要其他内容）：
{
  "title": "文章标题",
  "summary": "文章摘要",
  "content": "文章正文（使用\\n分段）",
  "coverImage": "封面图片描述（可选）",
  "category": "分类标签"
}

【注意】
- 内容要真实感强，像真正的新闻文章
- 可以虚构合理的事件、数据、人物
- 语言风格符合公众号定位
- 正文使用\\n进行分段，保持可读性`;
};

/**
 * 发布文章到公众号
 */
export const publishArticle = (accountId: string, article: OfficialArticle): void => {
  const account = getOfficialAccount(accountId);
  if (!account) return;

  // 添加文章到历史记录
  account.articles.unshift(article);
  
  // 保留最近100篇文章
  if (account.articles.length > 100) {
    account.articles = account.articles.slice(0, 100);
  }

  // 更新发布时间
  account.lastPublishTime = Date.now();
  account.nextPublishTime = Date.now() + getPublishInterval(account.publishFrequency, account.customFrequencyHours);

  saveOfficialAccount(account);
  
  console.log(`📱 [${account.name}] 发布文章: ${article.title}`);
};

/**
 * 检查并发布需要更新的公众号文章
 */
export const checkAndPublishArticles = async (apiConfig: ApiConfig): Promise<void> => {
  const accounts = getAllOfficialAccounts();
  const now = Date.now();

  for (const account of accounts) {
    if (!account.enabled) continue;
    
    // 检查是否到了发布时间
    if (!account.nextPublishTime || now >= account.nextPublishTime) {
      console.log(`📝 准备为 [${account.name}] 生成文章...`);
      
      const article = await generateArticleContent(account, apiConfig);
      if (article) {
        publishArticle(account.id, article);
        
        // 模拟阅读量和点赞
        setTimeout(() => {
          article.readCount = Math.floor(Math.random() * 5000) + 100;
          article.likeCount = Math.floor(Math.random() * 500) + 10;
          saveOfficialAccount(account);
        }, 3000);
      }
    }
  }
};
