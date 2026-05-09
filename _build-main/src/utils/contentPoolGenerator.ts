/**
 * 内容池生成器
 * 使用AI生成新闻和公众号内容，供其他AI分享
 */

import { ApiConfig } from '../types';
import { buildApiUrl } from './apiHelper';

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  coverUrl: string;
  category: '科技' | '生活' | '娱乐' | '财经' | '健康' | '教育';
  timestamp: number;
  source: string; // 来源（虚拟的公众号名称）
  readCount: number;
  likeCount: number;
}

export interface WeChatArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  coverUrl: string;
  author: string; // 公众号名称
  authorAvatar: string;
  timestamp: number;
  readCount: number;
  likeCount: number;
  tags: string[];
}

// 内容池缓存（IndexedDB）
const CONTENT_POOL_KEY = 'ai_content_pool';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

/**
 * 从IndexedDB加载内容池
 */
async function loadContentPool(): Promise<{
  news: NewsArticle[];
  articles: WeChatArticle[];
  lastUpdate: number;
} | null> {
  try {
    const { smartLoad } = await import('./storage');
    return await smartLoad(CONTENT_POOL_KEY);
  } catch (error) {
    console.error('加载内容池失败:', error);
    return null;
  }
}

/**
 * 保存内容池到IndexedDB
 */
async function saveContentPool(
  news: NewsArticle[],
  articles: WeChatArticle[]
): Promise<void> {
  try {
    const { smartSave } = await import('./storage');
    await smartSave(CONTENT_POOL_KEY, {
      news,
      articles,
      lastUpdate: Date.now()
    });
  } catch (error) {
    console.error('保存内容池失败:', error);
  }
}

/**
 * 生成新闻标题和摘要（使用AI）
 */
async function generateNewsWithAI(
  category: string,
  count: number,
  apiConfig: ApiConfig
): Promise<NewsArticle[]> {
  const prompt = `你是一个专业的新闻编辑。请生成${count}条${category}类的新闻标题和摘要。

要求：
1. 标题要吸引人，符合当下热点
2. 摘要要简洁，50-80字
3. 内容要真实可信，不要过于夸张
4. 每条新闻用JSON格式输出

输出格式（JSON数组）：
[
  {
    "title": "新闻标题",
    "summary": "新闻摘要内容...",
    "source": "来源媒体名称"
  }
]

现在开始生成${count}条${category}新闻：`;

  try {
    const response = await fetch(buildApiUrl(apiConfig), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error('API调用失败');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // 解析JSON
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('无法解析AI返回的JSON');
    }
    
    const newsData = JSON.parse(jsonMatch[0]);
    
    return newsData.map((item: any, index: number) => ({
      id: `news_${Date.now()}_${index}`,
      title: item.title,
      summary: item.summary,
      content: item.summary, // 简化版，只用摘要
      coverUrl: `https://picsum.photos/400/300?random=${Date.now()}_${index}`,
      category: category as any,
      timestamp: Date.now() - Math.random() * 3600000, // 随机1小时内
      source: item.source || '今日资讯',
      readCount: Math.floor(Math.random() * 10000) + 1000,
      likeCount: Math.floor(Math.random() * 500) + 50
    }));
    
  } catch (error) {
    console.error('AI生成新闻失败:', error);
    return generateFallbackNews(category, count);
  }
}

/**
 * 生成公众号文章（使用AI）
 */
async function generateArticlesWithAI(
  count: number,
  apiConfig: ApiConfig
): Promise<WeChatArticle[]> {
  const prompt = `你是一个优秀的自媒体作者。请生成${count}篇公众号文章的标题、摘要和标签。

文章类型可以包括：
- 生活方式
- 个人成长
- 职场技能
- 情感故事
- 旅行见闻
- 美食分享
- 读书笔记

要求：
1. 标题要有吸引力，符合公众号风格
2. 摘要80-120字，引人入胜
3. 每篇文章配2-3个标签
4. 公众号名称要真实自然

输出格式（JSON数组）：
[
  {
    "title": "文章标题",
    "summary": "文章摘要...",
    "author": "公众号名称",
    "tags": ["标签1", "标签2"]
  }
]

现在开始生成${count}篇公众号文章：`;

  try {
    const response = await fetch(buildApiUrl(apiConfig), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error('API调用失败');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // 解析JSON
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('无法解析AI返回的JSON');
    }
    
    const articlesData = JSON.parse(jsonMatch[0]);
    
    return articlesData.map((item: any, index: number) => ({
      id: `article_${Date.now()}_${index}`,
      title: item.title,
      summary: item.summary,
      content: item.summary,
      coverUrl: `https://picsum.photos/400/300?random=article_${Date.now()}_${index}`,
      author: item.author || '生活美学',
      authorAvatar: `https://picsum.photos/100/100?random=author_${index}`,
      timestamp: Date.now() - Math.random() * 7200000, // 随机2小时内
      readCount: Math.floor(Math.random() * 50000) + 5000,
      likeCount: Math.floor(Math.random() * 2000) + 200,
      tags: item.tags || ['生活', '分享']
    }));
    
  } catch (error) {
    console.error('AI生成文章失败:', error);
    return generateFallbackArticles(count);
  }
}

/**
 * 降级方案：预设新闻
 */
function generateFallbackNews(category: string, count: number): NewsArticle[] {
  const templates = {
    '科技': [
      { title: 'AI技术取得重大突破', summary: '最新研究显示，人工智能在图像识别领域的准确率已达到99.9%，这一成果将广泛应用于医疗诊断、自动驾驶等领域。', source: '科技日报' },
      { title: '新一代芯片发布', summary: '全球领先的芯片制造商发布了采用3纳米工艺的新一代处理器，性能提升50%，功耗降低30%。', source: '科技前沿' },
      { title: '5G网络覆盖率超90%', summary: '工信部最新数据显示，全国5G网络覆盖率已超过90%，用户数突破5亿大关。', source: '通信世界' }
    ],
    '生活': [
      { title: '健康生活方式新指南', summary: '世界卫生组织发布最新健康指南，建议每天运动30分钟，保持充足睡眠，多吃蔬菜水果。', source: '健康生活' },
      { title: '城市绿化率创新高', summary: '今年各大城市持续推进绿化工程，人均绿地面积增加15%，空气质量显著改善。', source: '城市生活' },
      { title: '社区服务再升级', summary: '智慧社区建设全面推进，居民可通过手机APP享受一站式便民服务。', source: '社区报' }
    ],
    '娱乐': [
      { title: '年度大片即将上映', summary: '备受期待的年度大片定档春节档，豪华阵容和精彩剧情引发全民期待。', source: '娱乐周刊' },
      { title: '音乐节圆满落幕', summary: '为期三天的音乐节吸引了10万观众，多位知名歌手倾情献唱，现场气氛热烈。', source: '娱乐快报' },
      { title: '新综艺节目收视率破纪录', summary: '创新综艺节目首播收视率突破2%，成为年度现象级作品。', source: '影视资讯' }
    ]
  };
  
  const categoryTemplates = templates[category as keyof typeof templates] || templates['生活'];
  const selected = [];
  
  for (let i = 0; i < count; i++) {
    const template = categoryTemplates[i % categoryTemplates.length];
    selected.push({
      id: `news_${Date.now()}_${i}`,
      ...template,
      coverUrl: `https://picsum.photos/400/300?random=news_${i}`,
      category: category as any,
      timestamp: Date.now() - Math.random() * 3600000,
      readCount: Math.floor(Math.random() * 10000) + 1000,
      likeCount: Math.floor(Math.random() * 500) + 50,
      content: template.summary
    });
  }
  
  return selected;
}

/**
 * 降级方案：预设公众号文章
 */
function generateFallbackArticles(count: number): WeChatArticle[] {
  const templates = [
    {
      title: '如何提升个人效率：时间管理的10个技巧',
      summary: '在快节奏的现代生活中，时间管理变得尤为重要。本文分享10个实用的时间管理技巧，帮助你更高效地工作和生活，找到工作与生活的平衡点。',
      author: '效率手册',
      tags: ['时间管理', '个人成长', '效率提升']
    },
    {
      title: '深度思考：什么是真正的成长？',
      summary: '成长不仅仅是年龄的增长，更是思维和认知的提升。本文探讨真正的成长意味着什么，以及如何在日常生活中实现持续的自我突破和进步。',
      author: '思想者',
      tags: ['个人成长', '深度思考', '人生感悟']
    },
    {
      title: '旅行见闻：那些改变我人生的瞬间',
      summary: '每一次旅行都是一次全新的体验和成长。作者分享了在旅途中经历的难忘瞬间，这些经历如何塑造了今天的自己，以及旅行带来的人生启示。',
      author: '行者无疆',
      tags: ['旅行', '人生感悟', '成长故事']
    },
    {
      title: '美食探店：这家店的招牌菜绝了！',
      summary: '隐藏在小巷深处的宝藏餐厅，招牌菜让人回味无穷。从环境到菜品，从服务到性价比，全方位为你解析这家值得一去再去的美食天堂。',
      author: '美食探索家',
      tags: ['美食', '探店', '生活分享']
    },
    {
      title: '读书笔记：好书推荐与生活感悟',
      summary: '这本书让我对生活有了新的理解。分享阅读过程中的思考和感悟，以及如何将书中的智慧应用到日常生活中，让阅读真正改变生活。',
      author: '书香时光',
      tags: ['读书', '好书推荐', '生活感悟']
    }
  ];
  
  const selected = [];
  
  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length];
    selected.push({
      id: `article_${Date.now()}_${i}`,
      ...template,
      coverUrl: `https://picsum.photos/400/300?random=article_${i}`,
      authorAvatar: `https://picsum.photos/100/100?random=author_${i}`,
      timestamp: Date.now() - Math.random() * 7200000,
      readCount: Math.floor(Math.random() * 50000) + 5000,
      likeCount: Math.floor(Math.random() * 2000) + 200,
      content: template.summary
    });
  }
  
  return selected;
}

/**
 * 刷新内容池（生成新的新闻和文章）
 */
export async function refreshContentPool(apiConfig: ApiConfig): Promise<void> {
  console.log('🔄 开始刷新内容池...');
  
  try {
    // 并行生成不同类别的新闻
    const newsPromises = [
      generateNewsWithAI('科技', 3, apiConfig),
      generateNewsWithAI('生活', 3, apiConfig),
      generateNewsWithAI('娱乐', 2, apiConfig)
    ];
    
    // 生成公众号文章
    const articlesPromise = generateArticlesWithAI(5, apiConfig);
    
    // 等待所有生成完成
    const newsResults = await Promise.all(newsPromises);
    const techNews = newsResults[0];
    const lifeNews = newsResults[1];
    const entertainmentNews = newsResults[2];
    const articles = await articlesPromise;
    
    const allNews = [...techNews, ...lifeNews, ...entertainmentNews];
    
    // 保存到缓存
    await saveContentPool(allNews, articles);
    
    console.log(`✅ 内容池刷新完成: ${allNews.length}条新闻, ${articles.length}篇文章`);
    
  } catch (error) {
    console.error('刷新内容池失败:', error);
    // 使用降级方案
    const fallbackNews = [
      ...generateFallbackNews('科技', 3),
      ...generateFallbackNews('生活', 3),
      ...generateFallbackNews('娱乐', 2)
    ];
    const fallbackArticles = generateFallbackArticles(5);
    await saveContentPool(fallbackNews, fallbackArticles);
  }
}

/**
 * 获取内容池（自动刷新）
 */
export async function getContentPool(apiConfig: ApiConfig): Promise<{
  news: NewsArticle[];
  articles: WeChatArticle[];
}> {
  // 检查缓存
  const cached = await loadContentPool();
  
  if (cached && Date.now() - cached.lastUpdate < CACHE_DURATION) {
    console.log('✅ 使用缓存的内容池');
    return { news: cached.news, articles: cached.articles };
  }
  
  // 缓存过期，刷新
  console.log('⏰ 内容池已过期，开始刷新...');
  await refreshContentPool(apiConfig);
  
  // 重新加载
  const refreshed = await loadContentPool();
  if (refreshed) {
    return { news: refreshed.news, articles: refreshed.articles };
  }
  
  // 降级
  return {
    news: generateFallbackNews('生活', 5),
    articles: generateFallbackArticles(5)
  };
}

/**
 * 获取随机新闻
 */
export async function getRandomNews(apiConfig: ApiConfig): Promise<NewsArticle> {
  const { news } = await getContentPool(apiConfig);
  return news[Math.floor(Math.random() * news.length)];
}

/**
 * 获取随机文章
 */
export async function getRandomArticle(apiConfig: ApiConfig): Promise<WeChatArticle> {
  const { articles } = await getContentPool(apiConfig);
  return articles[Math.floor(Math.random() * articles.length)];
}
