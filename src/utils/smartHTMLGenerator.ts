/**
 * 智能HTML模块生成器
 * 
 * 参考"中插随机html"的设计理念：
 * - 根据对话内容和角色状态生成多样化的HTML模块
 * - 内容真实丰富，与语境紧密对应
 * - 视觉美观，有创意
 */

export class SmartHTMLGenerator {
  /**
   * 检测内容类型
   */
  static detectHTMLType(content: string): 'xiaohongshu' | 'zhihu' | 'weibo' | 'search-history' | null {
    // 优先检测搜索记录（新功能）
    if (content.includes('开始搜索记录[') && content.includes(']结束搜索记录')) {
      return 'search-history';
    }
    // 检测社交平台内容
    if (content.includes('小红书帖子[') || content.includes('小红书弹窗[')) {
      return 'xiaohongshu';
    }
    if (content.includes('知乎回答[') || content.includes('知乎详情[')) {
      return 'zhihu';
    }
    if (content.includes('微博帖子[') || content.includes('微博详情[')) {
      return 'weibo';
    }
    return null;
  }

  /**
   * 生成搜索记录Prompt
   */
  static getSearchHistoryPrompt(): string {
    return `
【🔍 搜索记录生成功能】

当用户想看搜索记录，或你觉得可以通过搜索记录来表达时，生成一个完整的搜索历史界面。

## 严格格式要求

开始搜索记录[
搜索记录[关键词|时间|设备|详情说明]
搜索记录[关键词|时间|设备|详情说明]
...
]结束搜索记录

## 生成规则

1. **真实感**：
   - 关键词要符合角色身份和当前话题
   - 时间要合理（最近的搜索）
   - 设备要真实（桌面浏览器/移动设备/平板）
   - 详情要具体（搜索了什么内容）

2. **数量**：3-8条记录

3. **排序**：按时间倒序（最新的在前）

4. **内容关联**：
   - 要和当前对话话题相关
   - 可以透露角色的兴趣、习惯
   - 可以用来暗示角色最近在关注什么

## 示例

开始搜索记录[
搜索记录[如何学习CSS|2025-11-10 14:20|桌面浏览器|搜索了关于CSS选择器和Flexbox布局的核心知识。]
搜索记录[原生JS实现动画|2025-11-09 18:45|移动设备|查询了使用 requestAnimationFrame 来创建平滑的网页动画效果的方法。]
搜索记录[HTML5语义化标签|2025-11-09 09:10|桌面浏览器|了解 <article>, <section>, <nav> 等标签的正确使用场景。]
搜索记录[上海好吃的日料|2025-11-08 20:30|移动设备|查找上海市中心性价比高的日本料理店推荐。]
]结束搜索记录

## 使用场景

- 用户问："你最近在学什么？" → 可以发搜索记录
- 用户问："有什么推荐吗？" → 可以发相关搜索记录
- 想暗示自己最近的关注点 → 发搜索记录
- 分享自己查到的资料 → 发搜索记录

## 注意事项

- 时间格式：YYYY-MM-DD HH:MM
- 设备类型：桌面浏览器/移动设备/平板
- 详情要具体，不要太笼统
- 可以混合不同话题的搜索记录（更真实）
`;
  }

  /**
   * 获取所有HTML模块生成说明
   */
  static getFullPrompt(): string {
    return `
${this.getSearchHistoryPrompt()}

## 📱 其他可用的HTML模块

你还可以根据对话内容生成以下类型（已实现）：

### 小红书瀑布流
\`\`\`
小红书帖子[id|图片描述|标题|作者|点赞]
小红书弹窗[id|...|评论内容]
\`\`\`

### 知乎问答
\`\`\`
知乎回答[id|问题|作者|预览|点赞]
知乎详情[id|...|完整回答|评论]
\`\`\`

### 微博热搜
\`\`\`
微博帖子[id|作者|内容|话题|数据]
微博详情[id|...|完整内容|评论]
\`\`\`

## 🎯 智能选择原则

根据对话内容自动选择最合适的模块类型：
- 学习、知识、资料 → 搜索记录 或 知乎
- 生活、穿搭、美食 → 小红书
- 热点、新闻、八卦 → 微博
- 展示兴趣爱好 → 搜索记录

## ⚠️ 重要规则

1. **内容完整真实**：必须填充具体内容，不要空模板
2. **与对话相关**：根据当前话题生成
3. **符合角色**：内容要符合角色身份和性格
4. **视觉美观**：生成的界面要美观易读
5. **自然融入**：可以搭配文字一起发送
`;
  }

  /**
   * 提取搜索记录原始内容
   */
  static extractSearchHistory(content: string): string | null {
    const match = content.match(/开始搜索记录\[([\s\S]*?)\]结束搜索记录/);
    return match ? match[0] : null;
  }
}

export default SmartHTMLGenerator;
