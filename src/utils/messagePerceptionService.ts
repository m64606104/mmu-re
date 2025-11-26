/**
 * AI消息感知服务
 * 实现用户发送消息时AI立即感知，而不需要等到生成回复时
 * 数据存储在IndexedDB中，不显示用户可见的提示
 */

import { Message, Conversation } from '../types';

export interface AIPerceptionState {
  conversationId: string;
  aiId: string;
  lastPerceivedMessageId: string;
  perceptionTimestamp: number;
  messageContent: string;
  messageType: 'text' | 'image' | 'music' | 'document' | 'money' | 'other';
}

class MessagePerceptionService {
  private aiPerceptionStates: Map<string, AIPerceptionState> = new Map();
  private dbName = 'AIPerceptionDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB().catch(error => {
      console.error('🧠 [感知服务] 初始化失败:', error);
    });
  }

  /**
   * 初始化IndexedDB
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.error('🧠 [感知服务] IndexedDB初始化失败:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('🧠 [感知服务] IndexedDB初始化成功');
        resolve();
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        
        // 创建感知状态存储
        if (!db.objectStoreNames.contains('perceptionStates')) {
          const store = db.createObjectStore('perceptionStates', {
            keyPath: 'id'
          });
          store.createIndex('conversationId', 'conversationId', { unique: false });
          store.createIndex('aiId', 'aiId', { unique: false });
        }
      };
    });
  }

  /**
   * 保存感知状态到IndexedDB
   */
  private async savePerceptionState(state: AIPerceptionState): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(['perceptionStates'], 'readwrite');
      const store = transaction.objectStore('perceptionStates');
      const id = `${state.conversationId}_${state.aiId}`;
      
      const request = store.put({ ...state, id });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 从IndexedDB加载感知状态
   */
  private async loadPerceptionState(conversationId: string, aiId: string): Promise<AIPerceptionState | null> {
    if (!this.db) {
      await this.initDB();
    }
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(['perceptionStates'], 'readonly');
      const store = transaction.objectStore('perceptionStates');
      const id = `${conversationId}_${aiId}`;
      
      const request = store.get(id);
      
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          const { id, ...state } = result;
          resolve(state as AIPerceptionState);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 用户发送消息时立即触发AI感知
   */
  perceiveMessage(
    conversation: Conversation,
    userMessage: Message,
    targetAIIds?: string[]
  ): void {
    console.log('🧠 [消息感知] 用户发送消息，AI开始感知...');
    
    // 立即处理感知（异步）
    this.processPerception(conversation, userMessage, targetAIIds);
  }

  /**
   * 处理AI对消息的感知
   */
  private async processPerception(
    conversation: Conversation,
    userMessage: Message,
    targetAIIds?: string[]
  ): Promise<void> {
    try {
      // 确定需要感知的AI
      let aiIds: string[] = [];
      
      if (conversation.type === 'group' && conversation.members) {
        // 群聊：所有AI成员都感知
        aiIds = conversation.members;
      } else if (conversation.type === 'private') {
        // 私聊：当前对话的AI感知
        aiIds = [conversation.id];
      }
      
      // 如果指定了特定AI，只让这些AI感知
      if (targetAIIds && targetAIIds.length > 0) {
        aiIds = targetAIIds;
      }
      
      console.log(`🤖 [消息感知] ${aiIds.length}个AI将感知此消息`);
      
      // 为每个AI创建感知状态
      for (const aiId of aiIds) {
        const messageType = this.classifyMessageType(userMessage);
        const messageContent = this.extractMessageContent(userMessage);
        
        const perceptionState: AIPerceptionState = {
          conversationId: conversation.id,
          aiId: aiId,
          lastPerceivedMessageId: userMessage.id,
          perceptionTimestamp: Date.now(),
          messageContent: messageContent,
          messageType: messageType
        };
        
        // 保存到IndexedDB和内存缓存
        await this.savePerceptionState(perceptionState);
        const stateKey = `${conversation.id}_${aiId}`;
        this.aiPerceptionStates.set(stateKey, perceptionState);
        
        console.log(`🧠 [消息感知] AI ${aiId} 已感知消息: "${messageContent.substring(0, 30)}..."`);
      }
      
    } catch (error) {
      console.error('❌ [消息感知] 处理感知失败:', error);
    }
  }

  /**
   * 分类消息类型
   */
  private classifyMessageType(message: Message): 'text' | 'image' | 'music' | 'document' | 'money' | 'other' {
    if (message.mediaType === 'image') return 'image';
    if (message.music) return 'music';
    if (message.document) return 'document';
    if (message.moneyTransfer) return 'money';
    if (message.content && message.content.trim()) return 'text';
    return 'other';
  }

  /**
   * 提取消息内容用于AI感知
   */
  private extractMessageContent(message: Message): string {
    let content = '';
    
    // 基本文字内容
    if (message.content) {
      content = message.content;
    }
    
    // 图片消息
    if (message.mediaType === 'image') {
      content += content ? '\n[用户发送了图片]' : '[用户发送了图片]';
    }
    
    // 音乐消息
    if (message.music) {
      const music = message.music;
      content += content ? '\n' : '';
      content += `[用户分享了音乐: ${music.title} - ${music.artist}]`;
    }
    
    // 文档消息
    if (message.document) {
      const doc = message.document;
      content += content ? '\n' : '';
      content += `[用户发送了文档: ${doc.title}]`;
    }
    
    // 转账/红包消息
    if (message.moneyTransfer) {
      const money = message.moneyTransfer;
      const type = money.type === 'redPacket' ? '红包' : '转账';
      content += content ? '\n' : '';
      content += `[用户发送了${type}: ¥${money.amount}]`;
    }
    
    return content || '[用户发送了消息]';
  }

  /**
   * 获取AI的感知状态
   */
  async getAIPerceptionState(conversationId: string, aiId: string): Promise<AIPerceptionState | null> {
    const stateKey = `${conversationId}_${aiId}`;
    
    // 先从内存缓存获取
    if (this.aiPerceptionStates.has(stateKey)) {
      return this.aiPerceptionStates.get(stateKey) || null;
    }
    
    // 从IndexedDB加载
    try {
      const state = await this.loadPerceptionState(conversationId, aiId);
      if (state) {
        this.aiPerceptionStates.set(stateKey, state);
      }
      return state;
    } catch (error) {
      console.error('❌ [感知服务] 获取感知状态失败:', error);
      return null;
    }
  }

  /**
   * 清理过期的感知数据
   */
  cleanup(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    const cutoffTime = Date.now() - olderThanMs;
    
    // 清理感知状态
    for (const [key, state] of this.aiPerceptionStates.entries()) {
      if (state.perceptionTimestamp < cutoffTime) {
        this.aiPerceptionStates.delete(key);
      }
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    activePerceptions: number;
  } {
    return {
      activePerceptions: this.aiPerceptionStates.size
    };
  }

  /**
   * 清空所有状态
   */
  clear(): void {
    this.aiPerceptionStates.clear();
  }
}

// 导出单例
export const messagePerceptionService = new MessagePerceptionService();
