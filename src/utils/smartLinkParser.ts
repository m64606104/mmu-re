/**
 * 智能链接解析系统
 * 
 * 从AI的自然文本中识别并提取链接预览信息
 * 支持多种格式的自然表达
 */

import { LinkPreviewData } from '../components/WeChatLinkPreview';

export interface ParsedMessage {
  textContent: string;      // 纯文本内容
  linkPreviews: LinkPreviewData[];  // 提取的链接预览
}

/**
 * 智能链接解析器
 */
export class SmartLinkParser {
  /**
   * 从AI消息中解析链接预览
   * 
   * 支持的格式：
   * 1. 自然文本 + JSON格式
   * 2. 自然文本 + 结构化标记
   * 3. 纯自然文本（通过AI理解）
   */
  static parseMessage(message: string): ParsedMessage {
    let textContent = message;
    const linkPreviews: LinkPreviewData[] = [];

    // ==========================================
    // 格式1: JSON格式（最精确）
    // ==========================================
    // 示例：我给你推荐一篇文章 {"type":"link","platform":"xiaohongshu","title":"...","description":"..."}
    const jsonMatches = message.matchAll(/\{[^}]*"type"\s*:\s*"link"[^}]*\}/g);
    for (const match of jsonMatches) {
      try {
        const data = JSON.parse(match[0]);
        if (data.type === 'link') {
          linkPreviews.push({
            title: data.title || '未命名',
            description: data.description,
            coverImage: data.coverImage || data.cover,
            platform: data.platform || 'web',
            author: data.author,
            publishTime: data.publishTime || data.time,
            content: data.content
          });
          // 从文本中移除JSON
          textContent = textContent.replace(match[0], '').trim();
        }
      } catch (e) {
        console.warn('解析链接JSON失败:', e);
      }
    }

    // ==========================================
    // 格式2: 简化标记格式（推荐）
    // ==========================================
    // 示例：[链接:小红书:标题:描述:封面]
    const linkTagMatches = message.matchAll(/\[链接:(.*?):(.*?)(?::(.*?))?(?::(.*?))?\]/g);
    for (const match of linkTagMatches) {
      const platform = this.normalizePlatform(match[1]);
      const title = match[2];
      const description = match[3] || undefined;
      const coverImage = match[4] || undefined;

      linkPreviews.push({
        title,
        description,
        coverImage,
        platform,
      });

      // 从文本中移除标记
      textContent = textContent.replace(match[0], '').trim();
    }

    // ==========================================
    // 格式3: 小红书专用格式
    // ==========================================
    // 示例：[小红书:标题:描述:封面]
    const xhsMatches = message.matchAll(/\[小红书:(.*?)(?::(.*?))?(?::(.*?))?\]/g);
    for (const match of xhsMatches) {
      linkPreviews.push({
        title: match[1],
        description: match[2] || undefined,
        coverImage: match[3] || undefined,
        platform: 'xiaohongshu',
      });
      textContent = textContent.replace(match[0], '').trim();
    }

    // ==========================================
    // 格式4: 知乎专用格式
    // ==========================================
    // 示例：[知乎:标题:描述]
    const zhihuMatches = message.matchAll(/\[知乎:(.*?)(?::(.*?))?\]/g);
    for (const match of zhihuMatches) {
      linkPreviews.push({
        title: match[1],
        description: match[2] || undefined,
        platform: 'zhihu',
      });
      textContent = textContent.replace(match[0], '').trim();
    }

    // ==========================================
    // 格式5: 微博专用格式
    // ==========================================
    // 示例：[微博:标题:描述:作者]
    const weiboMatches = message.matchAll(/\[微博:(.*?)(?::(.*?))?(?::(.*?))?\]/g);
    for (const match of weiboMatches) {
      linkPreviews.push({
        title: match[1],
        description: match[2] || undefined,
        author: match[3] || undefined,
        platform: 'weibo',
      });
      textContent = textContent.replace(match[0], '').trim();
    }

    // ==========================================
    // 格式6: 公众号文章格式
    // ==========================================
    // 示例：[公众号:标题:描述:作者]
    const wechatMatches = message.matchAll(/\[公众号:(.*?)(?::(.*?))?(?::(.*?))?\]/g);
    for (const match of wechatMatches) {
      linkPreviews.push({
        title: match[1],
        description: match[2] || undefined,
        author: match[3] || undefined,
        platform: 'wechat',
      });
      textContent = textContent.replace(match[0], '').trim();
    }

    // ==========================================
    // ⚠️ 注意：[发文档] 标记现在由 enhancedDocumentParser.ts 处理
    // 这里不再解析文档标记，避免冲突
    // ==========================================

    return {
      textContent: textContent.replace(/\n{3,}/g, '\n\n').trim(), // 清理多余空行
      linkPreviews
    };
  }

  /**
   * 标准化平台名称
   */
  private static normalizePlatform(platform: string): LinkPreviewData['platform'] {
    const lower = platform.toLowerCase().trim();
    
    if (lower.includes('小红书') || lower === 'xhs' || lower === 'xiaohongshu') {
      return 'xiaohongshu';
    }
    if (lower.includes('知乎') || lower === 'zhihu') {
      return 'zhihu';
    }
    if (lower.includes('微博') || lower === 'weibo') {
      return 'weibo';
    }
    if (lower.includes('公众号') || lower === 'wechat' || lower.includes('微信')) {
      return 'wechat';
    }
    if (lower.includes('新闻') || lower === 'news') {
      return 'news';
    }
    if (lower.includes('文档') || lower === 'document' || lower === 'doc') {
      return 'document';
    }
    
    return 'web';
  }

  /**
   * 生成AI Prompt提示
   * 告诉AI如何发送链接预览
   */
  static getPromptInstructions(): string {
    return `
【📎 链接分享功能】
你可以分享小红书、知乎、微博、公众号等平台的内容链接。使用以下格式：

1. **小红书笔记**：[小红书:标题:简短描述:封面图描述]
   示例："我最近看到一篇很棒的穿搭分享 [小红书:秋日温柔穿搭分享:分享了几套适合秋天的温柔风穿搭:一个女生穿着米色毛衣在咖啡厅]"

2. **知乎回答**：[知乎:标题:简短描述]
   示例："这篇回答写得特别好 [知乎:如何培养好的阅读习惯:从每天15分钟开始，选择自己感兴趣的书]"

3. **微博内容**：[微博:标题:内容摘要:博主昵称]
   示例："刚看到一条有趣的微博 [微博:今天的天气真好:阳光明媚，适合出去走走:城市生活记录]"

4. **公众号文章**：[公众号:标题:摘要:公众号名称]
   示例："给你推荐一篇文章 [公众号:高效学习的10个方法:介绍了科学的学习方法和技巧:学习方法论]"

5. **文档内容**：[发文档:标题:类型] 文档内容
   示例："我写了一份工作计划 [发文档:本周工作安排:text] 1. 完成项目报告..."

注意事项：
- 标题要简洁明了（10-30字）
- 描述提炼核心内容（20-50字）
- 封面图描述要具体生动（可选）
- 可以在前后加上自然的引导语
- 一条消息可以包含文字+链接预览的组合

示例对话：
用户："有什么好看的穿搭推荐吗？"
AI："当然！我最近收藏了一篇很不错的穿搭分享，你可以看看 [小红书:早秋温柔风穿搭指南:分享了5套超实用的早秋穿搭，温柔又显气质:一个女生穿着米色针织衫配牛仔裤在秋日街头] 里面的搭配都很日常实用～"
`;
  }
}

export default SmartLinkParser;
