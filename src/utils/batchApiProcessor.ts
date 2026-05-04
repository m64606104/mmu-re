/**
 * 批量API处理器
 * 将多个AI决策请求合并为单次API调用，大幅减少API使用量
 */

import { ApiConfig } from '../types';
import { recordApiCall } from './apiUsageManager';

interface BatchDecisionRequest {
  id: string;
  type: 'like_decision' | 'comment_decision' | 'reply_decision' | 'proactive_message';
  aiId: string;
  aiName: string;
  aiPersonality?: string;
  context: string;
  targetContent: string;
  resolve: (result: any) => void;
  reject: (error: any) => void;
}

class BatchApiProcessor {
  private static instance: BatchApiProcessor;
  private pendingRequests: BatchDecisionRequest[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 2000; // 2秒内的请求合并处理
  private readonly MAX_BATCH_SIZE = 8; // 最多8个决策一批
  
  private constructor() {}
  
  public static getInstance(): BatchApiProcessor {
    if (!BatchApiProcessor.instance) {
      BatchApiProcessor.instance = new BatchApiProcessor();
    }
    return BatchApiProcessor.instance;
  }
  
  /**
   * 添加决策请求到批次队列
   */
  public addRequest(request: Omit<BatchDecisionRequest, 'resolve' | 'reject'>): Promise<any> {
    return new Promise((resolve, reject) => {
      const batchRequest: BatchDecisionRequest = {
        ...request,
        resolve,
        reject
      };
      
      this.pendingRequests.push(batchRequest);
      
      // 如果达到最大批次大小，立即处理
      if (this.pendingRequests.length >= this.MAX_BATCH_SIZE) {
        this.processBatch();
        return;
      }
      
      // 否则等待更多请求
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
      }
      
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, this.BATCH_DELAY);
    });
  }
  
  /**
   * 处理批次请求
   */
  private async processBatch(): Promise<void> {
    if (this.pendingRequests.length === 0) return;
    
    const requests = this.pendingRequests.splice(0, this.MAX_BATCH_SIZE);
    console.log(`📦 批量处理 ${requests.length} 个AI决策请求`);
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    try {
      const results = await this.processBatchedDecisions(requests);
      
      // 将结果分发给各个请求
      results.forEach((result, index) => {
        const request = requests[index];
        if (result.success) {
          request.resolve(result.data);
        } else {
          request.reject(new Error(result.error));
        }
      });
      
    } catch (error) {
      console.error('批量处理失败:', error);
      // 失败时拒绝所有请求
      requests.forEach(request => {
        request.reject(error);
      });
    }
  }
  
  /**
   * 使用单次API调用处理多个决策
   */
  private async processBatchedDecisions(requests: BatchDecisionRequest[]): Promise<Array<{success: boolean; data?: any; error?: string}>> {
    // 构建批量决策prompt
    const batchPrompt = this.buildBatchPrompt(requests);
    
    // 获取API配置（从第一个请求推断）
    const apiConfig = this.getApiConfigFromGlobal();
    
    try {
      const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: apiConfig.modelName,
          messages: [{ role: 'user', content: batchPrompt }],
          temperature: 0.7,
          max_tokens: 2000
        })
      });
      
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }
      
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      // 记录API调用（单次调用处理多个决策！）
      recordApiCall();
      
      // 解析批量响应
      return this.parseBatchResponse(content, requests);
      
    } catch (error) {
      console.error('批量API调用失败:', error);
      throw error;
    }
  }
  
  /**
   * 构建批量决策prompt
   */
  private buildBatchPrompt(requests: BatchDecisionRequest[]): string {
    const decisionsText = requests.map((req, index) => {
      const decisionType = {
        'like_decision': '是否点赞',
        'comment_decision': '是否评论',
        'reply_decision': '是否回复评论',
        'proactive_message': '主动消息内容'
      }[req.type];
      
      return `【决策${index + 1}】AI: ${req.aiName}
类型: ${decisionType}
性格: ${req.aiPersonality || '未设置'}
情境: ${req.context}
目标内容: "${req.targetContent}"`;
    }).join('\n\n');
    
    return `你需要为多个AI做出决策。请严格按照JSON格式回复，包含每个决策的结果。

${decisionsText}

请为每个AI做出合理的决策。考虑他们的性格特点和当前情境。

输出JSON格式（只输出JSON，不要其他内容）:
{
  "decisions": [
    {
      "id": 1,
      "shouldAct": true/false,
      "content": "如果需要内容的话（评论/回复/主动消息）",
      "reason": "决策理由"
    }
    // ... 其他决策
  ]
}`;
  }
  
  /**
   * 解析批量响应
   */
  private parseBatchResponse(content: string, requests: BatchDecisionRequest[]): Array<{success: boolean; data?: any; error?: string}> {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('无法解析AI响应格式');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      const decisions = parsed.decisions || [];
      
      return requests.map((request, index) => {
        const decision = decisions[index];
        if (!decision) {
          return { 
            success: false, 
            error: '决策缺失' 
          };
        }
        
        return {
          success: true,
          data: {
            shouldAct: decision.shouldAct,
            content: decision.content,
            reason: decision.reason,
            type: request.type
          }
        };
      });
      
    } catch (error) {
      console.error('解析批量响应失败:', error);
      // 解析失败时返回默认决策
      return requests.map(() => ({
        success: true,
        data: { shouldAct: false, reason: '解析失败，默认不操作' }
      }));
    }
  }
  
  /**
   * 从全局获取API配置（临时方案）
   */
  private getApiConfigFromGlobal(): ApiConfig {
    // 这里需要从某个地方获取API配置
    // 临时从localStorage获取
    try {
      const stored = localStorage.getItem('apiConfig');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('获取API配置失败:', error);
    }
    
    // 默认配置
    return {
      baseUrl: 'https://api.openai.com',
      apiKey: '',
      modelName: 'gpt-3.5-turbo'
    };
  }
  
  /**
   * 获取队列状态
   */
  public getQueueStatus(): { pending: number; processing: boolean } {
    return {
      pending: this.pendingRequests.length,
      processing: this.batchTimer !== null
    };
  }
  
  /**
   * 清空队列（用于紧急情况）
   */
  public clearQueue(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    this.pendingRequests.forEach(request => {
      request.reject(new Error('队列已清空'));
    });
    
    this.pendingRequests = [];
  }
}

// 导出单例和便捷方法
export const batchApiProcessor = BatchApiProcessor.getInstance();

/**
 * 批量点赞决策
 */
export async function batchLikeDecision(
  aiId: string,
  aiName: string,
  aiPersonality: string,
  postContent: string
): Promise<{ shouldAct: boolean; reason: string }> {
  return batchApiProcessor.addRequest({
    id: `like_${aiId}_${Date.now()}`,
    type: 'like_decision',
    aiId,
    aiName,
    aiPersonality,
    context: '看到朋友圈，考虑是否点赞',
    targetContent: postContent
  });
}

/**
 * 批量评论决策
 */
export async function batchCommentDecision(
  aiId: string,
  aiName: string,
  aiPersonality: string,
  postContent: string
): Promise<{ shouldAct: boolean; content?: string; reason: string }> {
  return batchApiProcessor.addRequest({
    id: `comment_${aiId}_${Date.now()}`,
    type: 'comment_decision',
    aiId,
    aiName,
    aiPersonality,
    context: '看到朋友圈，考虑是否评论',
    targetContent: postContent
  });
}

/**
 * 批量回复评论决策
 */
export async function batchReplyDecision(
  aiId: string,
  aiName: string,
  aiPersonality: string,
  commentContent: string,
  originalPost: string
): Promise<{ shouldAct: boolean; content?: string; reason: string }> {
  return batchApiProcessor.addRequest({
    id: `reply_${aiId}_${Date.now()}`,
    type: 'reply_decision',
    aiId,
    aiName,
    aiPersonality,
    context: `回复评论，原朋友圈："${originalPost}"`,
    targetContent: commentContent
  });
}
