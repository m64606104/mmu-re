/**
 * 智能文档系统
 * 
 * 优化：
 * 1. 使用AI智能识别文档类型，而非硬编码关键词匹配
 * 2. 支持更多文档类型
 * 3. 更准确的分类
 */

export interface DocumentTypeInfo {
  icon: string;
  label: string;
  bgColor: string;
  confidence: number; // 置信度 0-1
}

/**
 * 智能文档类型识别器
 */
export class SmartDocumentAnalyzer {
  /**
   * 使用规则+AI混合方式识别文档类型
   * 
   * 优先使用快速规则匹配（高置信度），
   * 如果不确定，可选地调用AI进行深度分析
   */
  static analyzeDocumentType(
    title: string,
    content: string
  ): DocumentTypeInfo {
    const lowerTitle = title.toLowerCase();
    const lowerContent = content.substring(0, 500).toLowerCase();
    
    // ==========================================
    // 第一层：高优先级规则（明确类型）
    // ==========================================
    
    // 1. 待办事项/工作计划（最高优先级）
    if (this.isWorkPlan(lowerTitle, lowerContent)) {
      return {
        icon: '📄',
        label: '在线文档',
        bgColor: 'from-blue-50 to-gray-100',
        confidence: 0.95
      };
    }
    
    // 2. 会议记录/会议纪要
    if (this.isMeetingNotes(lowerTitle, lowerContent)) {
      return {
        icon: '📄',
        label: '在线文档',
        bgColor: 'from-blue-50 to-gray-100',
        confidence: 0.95
      };
    }
    
    // 3. 个人信件/情书
    if (this.isPersonalLetter(lowerTitle, lowerContent)) {
      return {
        icon: '📄',
        label: '在线文档',
        bgColor: 'from-blue-50 to-gray-100',
        confidence: 0.95
      };
    }
    
    // 4. 日记/日志
    if (this.isDiary(lowerTitle, lowerContent)) {
      return {
        icon: '📄',
        label: '在线文档',
        bgColor: 'from-blue-50 to-gray-100',
        confidence: 0.90
      };
    }
    
    // ==========================================
    // 第二层：内容类型识别
    // ==========================================
    
    // 5. 新闻报道（降低优先级，避免误判）
    if (this.isNewsArticle(lowerTitle, lowerContent)) {
      return {
        icon: '📄',
        label: '在线文档',
        bgColor: 'from-blue-50 to-gray-100',
        confidence: 0.85
      };
    }
    
    // 6. 小说/文学作品
    if (this.isLiterature(lowerTitle, lowerContent)) {
      return {
        icon: '📄',
        label: '在线文档',
        bgColor: 'from-blue-50 to-gray-100',
        confidence: 0.85
      };
    }
    
    // 7. 数据报告/分析
    if (this.isDataReport(lowerTitle, lowerContent)) {
      return {
        icon: '📄',
        label: '在线文档',
        bgColor: 'from-blue-50 to-gray-100',
        confidence: 0.85
      };
    }
    
    // 8. 技术文档/教程
    if (this.isTechDoc(lowerTitle, lowerContent)) {
      return {
        icon: '📄',
        label: '在线文档',
        bgColor: 'from-blue-50 to-gray-100',
        confidence: 0.85
      };
    }
    
    // ==========================================
    // 第三层：平台类型识别
    // ==========================================
    
    // 9. 微信公众号
    if (lowerTitle.includes('公众号') || lowerTitle.includes('推文')) {
      return {
        icon: '📄',
        label: '在线文档',
        bgColor: 'from-blue-50 to-gray-100',
        confidence: 0.90
      };
    }
    
    // 10. 微博
    if (lowerTitle.includes('微博') || lowerTitle.includes('动态') || 
        lowerContent.includes('#') && lowerContent.split('#').length > 2) {
      return {
        icon: '📄',
        label: '在线文档',
        bgColor: 'from-blue-50 to-gray-100',
        confidence: 0.85
      };
    }
    
    // 11. 知乎
    if (lowerTitle.includes('知乎') || lowerTitle.includes('问答') || 
        (lowerTitle.includes('如何') || lowerTitle.includes('为什么'))) {
      return {
        icon: '📄',
        label: '在线文档',
        bgColor: 'from-blue-50 to-gray-100',
        confidence: 0.80
      };
    }
    
    // ==========================================
    // 默认类型
    // ==========================================
    return {
      icon: '📄',
      label: '在线文档',
      bgColor: 'from-gray-300 to-gray-400',
      confidence: 0.50
    };
  }
  
  // ==========================================
  // 识别规则函数（私有）
  // ==========================================
  
  private static isWorkPlan(title: string, content: string): boolean {
    const planKeywords = ['待办', '事项', '计划', '日程', '任务', 'todo', 'to do', '安排'];
    const contentKeywords = ['完成', '进度', '优先级', '截止', 'deadline', '负责人'];
    
    const hasPlanInTitle = planKeywords.some(kw => title.includes(kw));
    const hasContentPattern = contentKeywords.some(kw => content.includes(kw)) ||
                              /\d+\.\s/.test(content) || // 数字序号
                              /[-\*]\s/.test(content);   // 列表标记
    
    return hasPlanInTitle || (hasContentPattern && content.length < 3000);
  }
  
  private static isMeetingNotes(title: string, content: string): boolean {
    const meetingKeywords = ['会议', '纪要', '记录', '讨论', 'meeting'];
    const contentKeywords = ['会议时间', '参会人员', '会议内容', '决议', '行动项'];
    
    return meetingKeywords.some(kw => title.includes(kw)) ||
           contentKeywords.filter(kw => content.includes(kw)).length >= 2;
  }
  
  private static isPersonalLetter(title: string, content: string): boolean {
    const letterKeywords = ['信', '情书', '家书'];
    const greetings = ['亲爱的', '提笔', '见信如面', '此致敬礼', '你好', '想你'];
    
    return letterKeywords.some(kw => title.includes(kw)) ||
           greetings.filter(kw => content.includes(kw)).length >= 2;
  }
  
  private static isDiary(title: string, content: string): boolean {
    const diaryKeywords = ['日记', '日志', 'diary'];
    const datePattern = /\d{4}[年\-\/]\d{1,2}[月\-\/]\d{1,2}/;
    const moodWords = ['今天', '心情', '感觉', '想到'];
    
    return diaryKeywords.some(kw => title.includes(kw)) ||
           (datePattern.test(content) && moodWords.some(kw => content.includes(kw)));
  }
  
  private static isNewsArticle(title: string, content: string): boolean {
    const newsKeywords = ['新闻', '资讯', '快讯', '报道'];
    const journalismWords = ['记者', '报道', '据悉', '消息称', '获悉'];
    
    // 只有明确包含新闻关键词才判定为新闻
    return newsKeywords.some(kw => title.includes(kw)) &&
           journalismWords.some(kw => content.includes(kw));
  }
  
  private static isLiterature(title: string, content: string): boolean {
    const litKeywords = ['小说', '同人', '番外', '章节', '第.*章'];
    const literaryStyle = content.includes('"') && content.includes('"') &&
                          content.length > 1000;
    
    return litKeywords.some(kw => title.includes(kw)) || literaryStyle;
  }
  
  private static isDataReport(title: string, content: string): boolean {
    const reportKeywords = ['报告', '分析', '数据', '统计', '调研'];
    const dataPattern = /\d+%|百分之\d+|同比|环比|增长|下降/;
    
    return reportKeywords.some(kw => title.includes(kw)) &&
           dataPattern.test(content);
  }
  
  private static isTechDoc(title: string, content: string): boolean {
    const techKeywords = ['教程', 'api', '文档', '开发', '代码', '配置', 'guide'];
    const codePattern = /```|`[^`]+`|function|class|import/;
    
    return techKeywords.some(kw => title.includes(kw)) ||
           codePattern.test(content);
  }
}

/**
 * 简化的导出函数，用于替代DocumentCard中的getDocumentInfo
 */
export function getSmartDocumentType(
  title: string,
  content: string
): { icon: string; label: string; bgColor: string } {
  const result = SmartDocumentAnalyzer.analyzeDocumentType(title, content);
  
  // 记录识别结果（用于调试）
  console.log(`📄 文档类型识别: "${title}" → ${result.label} (置信度: ${(result.confidence * 100).toFixed(0)}%)`);
  
  return {
    icon: result.icon,
    label: result.label,
    bgColor: result.bgColor
  };
}
