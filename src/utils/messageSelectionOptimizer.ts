/**
 * 消息选择性能优化工具
 * 解决多选模式下的性能问题
 */

import { Message } from '../types';

/**
 * 优化的消息选择管理器
 * 使用位图和缓存来提升大量消息的选择性能
 */
export class MessageSelectionOptimizer {
  private selectedIds = new Set<string>();
  private messageIdToIndex = new Map<string, number>();
  private indexToMessageId = new Map<number, string>();
  
  constructor(messages: Message[]) {
    this.updateMessageIndex(messages);
  }

  /**
   * 更新消息索引映射
   * 当消息列表变化时调用
   */
  updateMessageIndex(messages: Message[]) {
    this.messageIdToIndex.clear();
    this.indexToMessageId.clear();
    
    messages.forEach((message, index) => {
      this.messageIdToIndex.set(message.id, index);
      this.indexToMessageId.set(index, message.id);
    });
  }

  /**
   * 切换消息选中状态
   * O(1) 复杂度
   */
  toggleSelection(messageId: string): boolean {
    if (this.selectedIds.has(messageId)) {
      this.selectedIds.delete(messageId);
      return false;
    } else {
      this.selectedIds.add(messageId);
      return true;
    }
  }

  /**
   * 批量选择消息
   * 支持范围选择
   */
  selectRange(startMessageId: string, endMessageId: string): string[] {
    const startIndex = this.messageIdToIndex.get(startMessageId);
    const endIndex = this.messageIdToIndex.get(endMessageId);
    
    if (startIndex === undefined || endIndex === undefined) {
      return [];
    }

    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);
    const newSelections: string[] = [];

    for (let i = minIndex; i <= maxIndex; i++) {
      const messageId = this.indexToMessageId.get(i);
      if (messageId && !this.selectedIds.has(messageId)) {
        this.selectedIds.add(messageId);
        newSelections.push(messageId);
      }
    }

    return newSelections;
  }

  /**
   * 全选消息
   */
  selectAll(messages: Message[]): void {
    messages.forEach(message => {
      this.selectedIds.add(message.id);
    });
  }

  /**
   * 清空选择
   */
  clearSelection(): void {
    this.selectedIds.clear();
  }

  /**
   * 反选
   */
  invertSelection(messages: Message[]): void {
    const newSelection = new Set<string>();
    messages.forEach(message => {
      if (!this.selectedIds.has(message.id)) {
        newSelection.add(message.id);
      }
    });
    this.selectedIds = newSelection;
  }

  /**
   * 检查消息是否被选中
   * O(1) 复杂度
   */
  isSelected(messageId: string): boolean {
    return this.selectedIds.has(messageId);
  }

  /**
   * 获取选中的消息ID数组
   */
  getSelectedIds(): string[] {
    return Array.from(this.selectedIds);
  }

  /**
   * 获取选中的消息对象
   */
  getSelectedMessages(messages: Message[]): Message[] {
    return messages.filter(message => this.selectedIds.has(message.id));
  }

  /**
   * 获取选中数量
   */
  getSelectedCount(): number {
    return this.selectedIds.size;
  }

  /**
   * 是否有选中的消息
   */
  hasSelection(): boolean {
    return this.selectedIds.size > 0;
  }

  /**
   * 按类型筛选已选消息
   */
  getSelectedMessagesByType(messages: Message[], type: 'text' | 'image' | 'voice' | 'document' | 'music'): Message[] {
    const selectedMessages = this.getSelectedMessages(messages);
    
    switch (type) {
      case 'text':
        return selectedMessages.filter(m => !m.mediaType && !m.document && !m.music && !m.moneyTransfer);
      case 'image':
        return selectedMessages.filter(m => m.mediaType === 'image');
      case 'voice':
        return selectedMessages.filter(m => m.mediaType === 'voice');
      case 'document':
        return selectedMessages.filter(m => m.document);
      case 'music':
        return selectedMessages.filter(m => m.music);
      default:
        return selectedMessages;
    }
  }

  /**
   * 获取选择统计信息
   */
  getSelectionStats(messages: Message[]) {
    const selectedMessages = this.getSelectedMessages(messages);
    
    return {
      total: selectedMessages.length,
      text: selectedMessages.filter(m => !m.mediaType && !m.document && !m.music && !m.moneyTransfer).length,
      images: selectedMessages.filter(m => m.mediaType === 'image').length,
      voices: selectedMessages.filter(m => m.mediaType === 'voice').length,
      documents: selectedMessages.filter(m => m.document).length,
      music: selectedMessages.filter(m => m.music).length,
      money: selectedMessages.filter(m => m.moneyTransfer).length,
      userMessages: selectedMessages.filter(m => m.role === 'user').length,
      aiMessages: selectedMessages.filter(m => m.role === 'assistant').length
    };
  }
}

/**
 * 防抖选择处理
 * 防止频繁的选择操作导致性能问题
 */
export class DebouncedSelectionHandler {
  private timeoutId: NodeJS.Timeout | null = null;
  private pendingOperations: (() => void)[] = [];

  constructor(private delay: number = 16) {} // 约60fps

  /**
   * 添加防抖的选择操作
   */
  addOperation(operation: () => void) {
    this.pendingOperations.push(operation);
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      // 批量执行所有待处理的操作
      this.pendingOperations.forEach(op => op());
      this.pendingOperations = [];
      this.timeoutId = null;
    }, this.delay);
  }

  /**
   * 立即执行所有待处理的操作
   */
  flush() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    this.pendingOperations.forEach(op => op());
    this.pendingOperations = [];
  }

  /**
   * 清空所有待处理的操作
   */
  clear() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.pendingOperations = [];
  }
}

/**
 * 消息渲染性能监控
 */
export class MessageRenderMonitor {
  private renderTimes: number[] = [];
  private maxSamples = 100;

  recordRenderTime(startTime: number) {
    const renderTime = performance.now() - startTime;
    this.renderTimes.push(renderTime);
    
    if (this.renderTimes.length > this.maxSamples) {
      this.renderTimes.shift();
    }
  }

  getAverageRenderTime(): number {
    if (this.renderTimes.length === 0) return 0;
    return this.renderTimes.reduce((sum, time) => sum + time, 0) / this.renderTimes.length;
  }

  getMaxRenderTime(): number {
    return this.renderTimes.length > 0 ? Math.max(...this.renderTimes) : 0;
  }

  isPerformanceGood(): boolean {
    const avgTime = this.getAverageRenderTime();
    return avgTime < 16; // 小于16ms表示可以维持60fps
  }

  getPerformanceReport() {
    return {
      samples: this.renderTimes.length,
      averageTime: this.getAverageRenderTime().toFixed(2),
      maxTime: this.getMaxRenderTime().toFixed(2),
      isGood: this.isPerformanceGood(),
      fps: this.getAverageRenderTime() > 0 ? (1000 / this.getAverageRenderTime()).toFixed(1) : 'N/A'
    };
  }
}

// 全局实例
export const messageSelectionOptimizer = new MessageSelectionOptimizer([]);
export const debouncedSelectionHandler = new DebouncedSelectionHandler();
export const renderMonitor = new MessageRenderMonitor();
