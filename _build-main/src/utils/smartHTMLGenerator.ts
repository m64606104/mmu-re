/**
 * 智能HTML模块生成器
 * 
 * 核心设计：
 * - 统一管理所有可视化模块（社交平台、搜索记录等）
 * - 智能检测和路由
 * - 简洁高效的Prompt
 */

export class SmartHTMLGenerator {
  /**
   * 检测模块类型（智能匹配）
   */
  static detectHTMLType(content: string): 'xiaohongshu' | 'zhihu' | 'weibo' | 'search-history' | null {
    const patterns = {
      'search-history': /开始搜索记录\[[\s\S]*?\]结束搜索记录/,
      'xiaohongshu': /小红书(帖子|弹窗)\[/,
      'zhihu': /知乎(回答|详情)\[/,
      'weibo': /微博(帖子|详情)\[/
    };
    
    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(content)) {
        return type as any;
      }
    }
    
    return null;
  }

  /**
   * 获取简洁的模块说明
   */
  static getModuleInstructions(): string {
    return `
【📱 可视化内容模块】

你可以根据对话生成可视化内容模块：

## 1. 搜索记录
格式：开始搜索记录[搜索记录[关键词|时间|设备|详情]...]结束搜索记录
场景：展示最近学习/查找的内容

## 2. 小红书
格式：小红书帖子[...]、小红书弹窗[...]、小红书评论[...]
场景：美食/穿搭/旅游/生活分享

## 3. 知乎
格式：知乎回答[...]、知乎详情[...]、知乎评论[...]
场景：知识问答/经验分享/专业讨论

## 4. 微博
格式：微博帖子[...]、微博详情[...]、微博评论[...]
场景：热点话题/实时动态/新闻八卦

⚠️ 关键规则：
- 内容必须真实具体，不要空模板
- 与对话话题紧密相关
- 数据合理（时间/点赞数等）
- 可以自然融入对话
`;
  }

}

export default SmartHTMLGenerator;
