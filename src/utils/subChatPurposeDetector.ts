/**
 * 子聊天目的检测器
 * 当用户在子聊天中说明发起原因时，智能识别并记录目的
 */

import { Message, SubChat } from '../types';

export interface DetectedPurpose {
  purpose: string;
  confidence: number; // 0-1 的置信度
  keywords: string[];
  category: 'privacy' | 'deep_discussion' | 'planning' | 'analysis' | 'emotional' | 'technical' | 'general';
}

export class SubChatPurposeDetector {
  private static instance: SubChatPurposeDetector;
  
  static getInstance(): SubChatPurposeDetector {
    if (!SubChatPurposeDetector.instance) {
      SubChatPurposeDetector.instance = new SubChatPurposeDetector();
    }
    return SubChatPurposeDetector.instance;
  }

  /**
   * 检测用户消息中是否包含子聊天目的说明
   */
  detectPurposeFromMessage(message: Message, subChat: SubChat): DetectedPurpose | null {
    const content = message.content.toLowerCase();
    
    // 检测各种目的表达模式
    const detectors = [
      this.detectPrivacyPurpose,
      this.detectDiscussionPurpose,
      this.detectPlanningPurpose,
      this.detectAnalysisPurpose,
      this.detectEmotionalPurpose,
      this.detectTechnicalPurpose,
      this.detectGeneralPurpose
    ];

    let bestDetection: DetectedPurpose | null = null;
    let highestConfidence = 0;

    for (const detector of detectors) {
      const result = detector.call(this, content, message, subChat);
      if (result && result.confidence > highestConfidence) {
        highestConfidence = result.confidence;
        bestDetection = result;
      }
    }

    return bestDetection;
  }

  /**
   * 检测隐私相关目的
   */
  private detectPrivacyPurpose(content: string, message: Message, subChat: SubChat): DetectedPurpose | null {
    const privacyPatterns = [
      /我想(在这里|单独|私下|悄悄).{0,20}(说|聊|讨论|谈)/,
      /这里比较(私密|安全|方便)，我想/,
      /不想在(主|那边|外面).{0,10}(说|聊)/,
      /这个话题比较(敏感|私人|个人)/,
      /我们在这边(私下|单独).{0,10}(聊|说)/,
      /开这个(子|新).{0,5}聊天是因为.{0,20}(隐私|私密|不想让)/
    ];

    const matched = privacyPatterns.some(pattern => pattern.test(content));
    if (!matched) return null;

    let purpose = '用户希望在私密环境中交流';
    let confidence = 0.8;
    const keywords = ['私下', '单独', '隐私', '私密', '敏感'];

    // 尝试提取更具体的目的
    const specificMatches = content.match(/(想|要|希望).{0,30}(说|聊|讨论|谈论)(.{1,20})/);
    if (specificMatches && specificMatches[3]) {
      purpose = `私下讨论${specificMatches[3].trim()}`;
      confidence = 0.9;
    }

    return {
      purpose,
      confidence,
      keywords,
      category: 'privacy'
    };
  }

  /**
   * 检测深度讨论目的
   */
  private detectDiscussionPurpose(content: string, message: Message, subChat: SubChat): DetectedPurpose | null {
    const discussionPatterns = [
      /我想(详细|深入|仔细).{0,20}(讨论|分析|聊|谈)/,
      /这个话题(比较复杂|需要深入|值得详细)/,
      /我们(展开|深挖|具体).{0,20}(聊|说|讨论)/,
      /开这个.{0,10}是想.{0,20}(深入|详细|具体)/,
      /这里可以.{0,20}(慢慢|详细|深入).{0,10}(聊|讨论)/
    ];

    const matched = discussionPatterns.some(pattern => pattern.test(content));
    if (!matched) return null;

    let purpose = '深入讨论复杂话题';
    let confidence = 0.7;
    const keywords = ['详细', '深入', '仔细', '复杂', '展开'];

    // 尝试提取讨论主题
    const topicMatches = content.match(/(关于|讨论|分析|聊聊?)(.{1,30})/);
    if (topicMatches && topicMatches[2]) {
      const topic = topicMatches[2].trim().split(/[，。！？]/)[0];
      purpose = `深入讨论${topic}`;
      confidence = 0.85;
    }

    return {
      purpose,
      confidence,
      keywords,
      category: 'deep_discussion'
    };
  }

  /**
   * 检测规划相关目的
   */
  private detectPlanningPurpose(content: string, message: Message, subChat: SubChat): DetectedPurpose | null {
    const planningPatterns = [
      /我想(制定|规划|安排|计划).{0,20}(方案|计划|流程)/,
      /我们来(讨论|制定|规划).{0,20}(怎么|如何)/,
      /关于.{0,20}(方案|计划|安排|策略)/,
      /需要(好好|仔细).{0,10}(规划|计划|安排)/,
      /开这个.{0,10}是为了.{0,20}(规划|计划|安排)/
    ];

    const matched = planningPatterns.some(pattern => pattern.test(content));
    if (!matched) return null;

    let purpose = '制定计划和方案';
    let confidence = 0.75;
    const keywords = ['规划', '计划', '安排', '方案', '策略'];

    // 尝试提取规划主题
    const topicMatches = content.match(/(规划|计划|安排)(.{1,20})/);
    if (topicMatches && topicMatches[2]) {
      const topic = topicMatches[2].trim().split(/[，。！？]/)[0];
      purpose = `规划${topic}`;
      confidence = 0.85;
    }

    return {
      purpose,
      confidence,
      keywords,
      category: 'planning'
    };
  }

  /**
   * 检测分析相关目的
   */
  private detectAnalysisPurpose(content: string, message: Message, subChat: SubChat): DetectedPurpose | null {
    const analysisPatterns = [
      /我想分析.{1,30}/,
      /我们来(研究|解析|分析).{1,20}/,
      /关于(.{1,20})(分析|解读|研究)/,
      /想要(深入|仔细).{0,10}(分析|研究)/,
      /《.+》.{0,20}(分析|解读|讨论)/
    ];

    const matched = analysisPatterns.some(pattern => pattern.test(content));
    if (!matched) return null;

    let purpose = '深入分析和研究';
    let confidence = 0.7;
    const keywords = ['分析', '研究', '解析', '解读'];

    // 尝试提取分析对象
    const objectMatches = content.match(/(分析|研究|解析)(.{1,20})/);
    if (objectMatches && objectMatches[2]) {
      const object = objectMatches[2].trim().split(/[，。！？]/)[0];
      purpose = `分析${object}`;
      confidence = 0.8;
    }

    // 检测作品名称
    const workMatches = content.match(/《([^》]+)》/);
    if (workMatches) {
      purpose = `分析《${workMatches[1]}》`;
      confidence = 0.9;
    }

    return {
      purpose,
      confidence,
      keywords,
      category: 'analysis'
    };
  }

  /**
   * 检测情感支持目的
   */
  private detectEmotionalPurpose(content: string, message: Message, subChat: SubChat): DetectedPurpose | null {
    const emotionalPatterns = [
      /我(心情|情绪).{0,10}(不好|低落|糟糕)/,
      /我想(倾诉|聊聊|说说).{0,20}(心事|烦恼|困扰)/,
      /我需要.{0,10}(安慰|支持|陪伴)/,
      /最近(压力|困难|挫折).{0,20}(很大|很多)/,
      /想要有人(听|陪|理解)/,
      /开这个.{0,10}是因为.{0,20}(心情|情绪|感受)/
    ];

    const matched = emotionalPatterns.some(pattern => pattern.test(content));
    if (!matched) return null;

    const purpose = '获得情感支持和陪伴';
    const confidence = 0.85;
    const keywords = ['情绪', '心情', '倾诉', '安慰', '支持', '陪伴'];

    return {
      purpose,
      confidence,
      keywords,
      category: 'emotional'
    };
  }

  /**
   * 检测技术讨论目的
   */
  private detectTechnicalPurpose(content: string, message: Message, subChat: SubChat): DetectedPurpose | null {
    const technicalPatterns = [
      /我想(讨论|聊聊).{0,20}(技术|代码|编程)/,
      /关于.{0,20}(算法|架构|开发|bug)/,
      /我们(解决|调试|优化).{0,20}(问题|代码)/,
      /想要(深入|详细).{0,10}(了解|学习).{0,20}(技术|编程)/
    ];

    const matched = technicalPatterns.some(pattern => pattern.test(content));
    if (!matched) return null;

    let purpose = '技术问题讨论';
    let confidence = 0.75;
    const keywords = ['技术', '代码', '编程', '算法', '开发'];

    // 尝试提取技术主题
    const topicMatches = content.match(/(技术|代码|编程|算法|开发|bug)(.{0,20})/);
    if (topicMatches && topicMatches[2]) {
      const topic = topicMatches[2].trim().split(/[，。！？]/)[0];
      purpose = `讨论${topicMatches[1]}${topic}`;
      confidence = 0.8;
    }

    return {
      purpose,
      confidence,
      keywords,
      category: 'technical'
    };
  }

  /**
   * 检测一般目的
   */
  private detectGeneralPurpose(content: string, message: Message, subChat: SubChat): DetectedPurpose | null {
    const generalPatterns = [
      /我想(在这里|这边).{0,20}(说|聊|讨论)/,
      /开这个.{0,10}(聊天|对话)是(为了|想要)/,
      /我们.{0,10}(专门|单独).{0,10}(聊|说)/,
      /这个话题.{0,20}(适合|需要).{0,10}(单独|专门)/,
      /想要.{0,20}(不被打扰|安静).{0,10}(聊|说)/
    ];

    const matched = generalPatterns.some(pattern => pattern.test(content));
    if (!matched) return null;

    const purpose = '用户希望专门讨论某个话题';
    const confidence = 0.5;
    const keywords = ['专门', '单独', '这里', '这边'];

    return {
      purpose,
      confidence,
      keywords,
      category: 'general'
    };
  }

  /**
   * 根据检测结果生成AI理解回复
   */
  generateUnderstandingResponse(detection: DetectedPurpose, subChatName: string): string {
    const responses = {
      privacy: [
        `我明白了，你希望在这个私密的空间里交流。我会保护好我们的对话内容。`,
        `理解，这里确实是一个更私密的环境。我们可以放心地聊任何话题。`,
        `好的，我知道你需要一个安全的地方来分享。我会认真倾听的。`
      ],
      deep_discussion: [
        `明白了，你想要深入探讨这个话题。我们可以在这里慢慢分析，不用担心被其他话题打断。`,
        `好的，这个话题确实值得我们仔细讨论。在这个专门的空间里，我们可以更加专注。`,
        `理解你的想法，复杂的话题确实需要专门的空间来讨论。我会全力配合你的。`
      ],
      planning: [
        `收到，你想要制定详细的计划。我们可以在这里一步步梳理和规划。`,
        `明白了，计划制定确实需要专门的空间。我会帮你系统地分析和安排。`,
        `好的，我们来仔细规划一下。这里很适合我们专注地讨论方案。`
      ],
      analysis: [
        `理解，你想要深入分析这个内容。我们可以在这里详细剖析，不会有干扰。`,
        `明白了，分析工作确实需要专注的环境。我会和你一起仔细研究的。`,
        `好的，我们来深入解析一下。这个独立的空间很适合我们的分析讨论。`
      ],
      emotional: [
        `我感受到了你的需要，这里是一个安全温馨的空间。你可以放心地分享你的感受。`,
        `理解你现在的状态，我会认真倾听并陪伴你。这里只有我们两个，你可以畅所欲言。`,
        `我明白你需要情感支持。在这个私密的环境里，我会全心全意地陪伴和理解你。`
      ],
      technical: [
        `收到，技术问题确实需要专门的讨论空间。我们可以在这里深入探讨技术细节。`,
        `明白了，我们来专门讨论技术话题。这里很适合我们深入交流技术问题。`,
        `好的，技术讨论需要专注的环境。我会和你一起仔细分析技术方案。`
      ],
      general: [
        `明白了，你想要在这个独立的空间里专门聊这个话题。我会全神贯注地和你交流。`,
        `理解，有些话题确实适合在专门的环境里讨论。我们可以在这里畅聊。`,
        `好的，我知道你希望不被其他话题干扰。这里就是我们专属的交流空间。`
      ]
    };

    const categoryResponses = responses[detection.category] || responses.general;
    const randomResponse = categoryResponses[Math.floor(Math.random() * categoryResponses.length)];
    
    return randomResponse;
  }
}

// 导出单例实例
export const subChatPurposeDetector = SubChatPurposeDetector.getInstance();
