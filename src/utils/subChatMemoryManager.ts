import { SubChat, Message } from '../types';

/**
 * 子对话记忆管理器
 * 负责在主聊天中智能注入子对话相关的上下文信息
 */

export interface SubChatSummary {
  subChatId: string;
  subChatName: string;
  purpose?: string;
  keyTopics: string[];
  importantDecisions: string[];
  lastUpdated: number;
  messageCount: number;
  summary: string;
}

export class SubChatMemoryManager {
  private static instance: SubChatMemoryManager;
  private summaries: Map<string, SubChatSummary> = new Map();

  static getInstance(): SubChatMemoryManager {
    if (!SubChatMemoryManager.instance) {
      SubChatMemoryManager.instance = new SubChatMemoryManager();
    }
    return SubChatMemoryManager.instance;
  }

  /**
   * 生成子对话的智能摘要
   */
  async generateSubChatSummary(subChat: SubChat): Promise<SubChatSummary> {
    const messages = subChat.messages;
    if (messages.length === 0) {
      return {
        subChatId: subChat.id,
        subChatName: subChat.name,
        purpose: subChat.purpose,
        keyTopics: [],
        importantDecisions: [],
        lastUpdated: Date.now(),
        messageCount: 0,
        summary: '该子对话暂无内容。'
      };
    }

    // 提取关键信息
    const keyTopics = this.extractKeyTopics(messages);
    const importantDecisions = this.extractImportantDecisions(messages);
    const summary = await this.generateAISummary(subChat, messages);

    const subChatSummary: SubChatSummary = {
      subChatId: subChat.id,
      subChatName: subChat.name,
      purpose: subChat.purpose,
      keyTopics,
      importantDecisions,
      lastUpdated: Date.now(),
      messageCount: messages.length,
      summary
    };

    this.summaries.set(subChat.id, subChatSummary);
    return subChatSummary;
  }

  /**
   * 检测主聊天消息是否与子对话相关
   */
  detectSubChatReferences(message: string, subChats: SubChat[]): SubChat[] {
    const relevantSubChats: SubChat[] = [];
    const messageWords = message.toLowerCase().split(/\s+/);

    for (const subChat of subChats) {
      const summary = this.summaries.get(subChat.id);
      if (!summary) continue;

      // 检查是否直接提及子对话名称
      if (message.toLowerCase().includes(subChat.name.toLowerCase())) {
        relevantSubChats.push(subChat);
        continue;
      }

      // 检查是否提及子对话目的
      if (subChat.purpose && message.toLowerCase().includes(subChat.purpose.toLowerCase())) {
        relevantSubChats.push(subChat);
        continue;
      }

      // 检查关键词匹配
      const keywordMatches = summary.keyTopics.filter(topic => 
        messageWords.some(word => topic.toLowerCase().includes(word) || word.includes(topic.toLowerCase()))
      );

      if (keywordMatches.length >= 2) { // 至少匹配2个关键词
        relevantSubChats.push(subChat);
      }
    }

    return relevantSubChats;
  }

  /**
   * 为主聊天生成子对话上下文
   */
  generateContextForMainChat(relevantSubChats: SubChat[]): string {
    if (relevantSubChats.length === 0) return '';

    const contexts = relevantSubChats.map(subChat => {
      const summary = this.summaries.get(subChat.id);
      if (!summary) return '';

      return `[子对话"${summary.subChatName}"摘要]
目的：${summary.purpose || '未指定'}
讨论要点：${summary.keyTopics.join('、')}
重要决定：${summary.importantDecisions.join('、')}
内容摘要：${summary.summary}
消息数量：${summary.messageCount}条
最后更新：${new Date(summary.lastUpdated).toLocaleString()}`;
    }).filter(context => context.length > 0);

    if (contexts.length === 0) return '';

    return `\n[相关子对话上下文]\n${contexts.join('\n\n')}\n[/相关子对话上下文]\n`;
  }

  /**
   * 获取所有子对话摘要（用于手动引用）
   */
  getAllSummaries(): SubChatSummary[] {
    return Array.from(this.summaries.values()).sort((a, b) => b.lastUpdated - a.lastUpdated);
  }

  /**
   * 强制刷新指定子对话的摘要
   */
  async refreshSummary(subChat: SubChat): Promise<void> {
    await this.generateSubChatSummary(subChat);
  }

  /**
   * 提取关键话题
   */
  private extractKeyTopics(messages: Message[]): string[] {
    // const topics = new Set<string>();
    const contentText = messages.map(m => m.content).join(' ');
    
    // 简单的关键词提取（可以后续用更复杂的NLP算法）
    const words = contentText.toLowerCase().match(/[\u4e00-\u9fa5a-z]{2,}/g) || [];
    const wordCount = new Map<string, number>();
    
    words.forEach(word => {
      if (word.length >= 2) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    });

    // 取出现频率最高的词作为关键话题
    const sortedWords = Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    return sortedWords;
  }

  /**
   * 提取重要决定
   */
  private extractImportantDecisions(messages: Message[]): string[] {
    const decisions: string[] = [];
    
    // 查找包含决定性词汇的消息
    const decisionKeywords = ['决定', '确定', '选择', '方案', '计划', '安排', '同意', '拒绝'];
    
    messages.forEach(message => {
      if (decisionKeywords.some(keyword => message.content.includes(keyword))) {
        // 截取关键句子
        const sentences = message.content.split(/[。！？.!?]/);
        sentences.forEach(sentence => {
          if (decisionKeywords.some(keyword => sentence.includes(keyword)) && sentence.length > 5) {
            decisions.push(sentence.trim());
          }
        });
      }
    });

    return decisions.slice(0, 3); // 最多保留3个重要决定
  }

  /**
   * 使用AI生成子对话摘要
   */
  private async generateAISummary(subChat: SubChat, messages: Message[]): Promise<string> {
    try {
      // 这里应该调用AI API，但为了避免依赖，先用简化版本
      return this.generateSimpleSummary(subChat, messages);

    } catch (error) {
      console.error('生成AI摘要失败:', error);
      return this.generateSimpleSummary(subChat, messages);
    }
  }

  /**
   * 生成简化版摘要（不依赖AI API）
   */
  private generateSimpleSummary(subChat: SubChat, messages: Message[]): string {
    if (messages.length === 0) return '该子对话暂无内容。';

    const userMessages = messages.filter(m => m.role === 'user').length;
    const aiMessages = messages.filter(m => m.role === 'assistant').length;
    const lastMessage = messages[messages.length - 1];
    const timeSpan = messages.length > 1 ? 
      new Date(messages[messages.length - 1].timestamp - messages[0].timestamp).getMinutes() : 0;

    return `该子对话共进行了${messages.length}轮对话（用户${userMessages}条，AI${aiMessages}条），` +
           `历时约${timeSpan}分钟。最近讨论内容：${lastMessage.content.slice(0, 50)}...` +
           `${subChat.purpose ? ` 对话目的：${subChat.purpose}` : ''}`;
  }
}

// 导出单例实例
export const subChatMemoryManager = SubChatMemoryManager.getInstance();
