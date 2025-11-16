/**
 * 后台生成服务
 * 支持多个对话同时生成回复，即使切换对话或退出聊天界面
 */

import { Message } from '../types';

export interface GenerationTask {
  conversationId: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  startTime: number;
  messages: Message[];
  error?: string;
}

class BackgroundGenerationService {
  private tasks: Map<string, GenerationTask> = new Map();
  private listeners: Map<string, Set<(task: GenerationTask) => void>> = new Map();
  private messageUpdateCallbacks: Map<string, (conversationId: string, messages: Message[]) => void> = new Map();

  /**
   * 开始生成任务
   */
  startGeneration(conversationId: string): void {
    const task: GenerationTask = {
      conversationId,
      status: 'generating',
      startTime: Date.now(),
      messages: [],
    };
    
    this.tasks.set(conversationId, task);
    this.notifyListeners(conversationId, task);
  }

  /**
   * 更新生成进度（新消息到达）
   */
  updateProgress(conversationId: string, messages: Message[]): void {
    const task = this.tasks.get(conversationId);
    if (!task) return;

    task.messages = messages;
    task.status = 'generating';
    this.notifyListeners(conversationId, task);
    
    // 通知外部更新对话消息
    const callback = this.messageUpdateCallbacks.get(conversationId);
    if (callback) {
      callback(conversationId, messages);
    }
  }

  /**
   * 完成生成任务
   */
  completeGeneration(conversationId: string, messages: Message[]): void {
    const task = this.tasks.get(conversationId);
    if (!task) return;

    task.status = 'completed';
    task.messages = messages;
    this.notifyListeners(conversationId, task);
    
    // 通知外部更新对话消息
    const callback = this.messageUpdateCallbacks.get(conversationId);
    if (callback) {
      callback(conversationId, messages);
    }
    
    // 5秒后清理任务
    setTimeout(() => {
      this.tasks.delete(conversationId);
      this.notifyListeners(conversationId, {
        conversationId,
        status: 'completed',
        startTime: task.startTime,
        messages: task.messages,
      });
    }, 5000);
  }

  /**
   * 生成失败
   */
  failGeneration(conversationId: string, error: string): void {
    const task = this.tasks.get(conversationId);
    if (!task) return;

    task.status = 'error';
    task.error = error;
    this.notifyListeners(conversationId, task);
    
    // 10秒后清理任务
    setTimeout(() => {
      this.tasks.delete(conversationId);
    }, 10000);
  }

  /**
   * 取消生成任务
   */
  cancelGeneration(conversationId: string): void {
    this.tasks.delete(conversationId);
    this.notifyListeners(conversationId, {
      conversationId,
      status: 'completed',
      startTime: Date.now(),
      messages: [],
    });
  }

  /**
   * 获取任务状态
   */
  getTask(conversationId: string): GenerationTask | undefined {
    return this.tasks.get(conversationId);
  }

  /**
   * 检查是否正在生成
   */
  isGenerating(conversationId: string): boolean {
    const task = this.tasks.get(conversationId);
    return task?.status === 'generating';
  }

  /**
   * 获取所有正在生成的任务
   */
  getActiveGenerations(): string[] {
    return Array.from(this.tasks.entries())
      .filter(([_, task]) => task.status === 'generating')
      .map(([id, _]) => id);
  }

  /**
   * 监听任务状态变化
   */
  subscribe(conversationId: string, listener: (task: GenerationTask) => void): () => void {
    if (!this.listeners.has(conversationId)) {
      this.listeners.set(conversationId, new Set());
    }
    
    this.listeners.get(conversationId)!.add(listener);
    
    // 立即发送当前状态
    const task = this.tasks.get(conversationId);
    if (task) {
      listener(task);
    }
    
    // 返回取消订阅函数
    return () => {
      const listeners = this.listeners.get(conversationId);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.listeners.delete(conversationId);
        }
      }
    };
  }

  /**
   * 注册消息更新回调
   */
  registerMessageUpdateCallback(
    conversationId: string,
    callback: (conversationId: string, messages: Message[]) => void
  ): void {
    this.messageUpdateCallbacks.set(conversationId, callback);
  }

  /**
   * 注销消息更新回调
   */
  unregisterMessageUpdateCallback(conversationId: string): void {
    this.messageUpdateCallbacks.delete(conversationId);
  }

  /**
   * 通知监听者
   */
  private notifyListeners(conversationId: string, task: GenerationTask): void {
    const listeners = this.listeners.get(conversationId);
    if (listeners) {
      listeners.forEach(listener => listener(task));
    }
  }

  /**
   * 清理所有任务
   */
  clearAll(): void {
    this.tasks.clear();
    this.listeners.clear();
    this.messageUpdateCallbacks.clear();
  }
}

// 导出单例
export const backgroundGenerationService = new BackgroundGenerationService();
