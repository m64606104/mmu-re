/**
 * 群聊到私聊的记忆连贯性服务
 * 当AI在群聊中说要私聊用户，然后在私聊中应该记得群聊中的对话内容
 */

import { Conversation, Message } from '../types';

interface PrivateChatIntent {
  fromGroupId: string;
  toPrivateId: string;
  userId: string;
  intentMessage: string; // AI说要私聊的消息内容
  timestamp: number;
  contextMessages: Message[]; // 群聊上下文消息
}

interface MemoryBridge {
  id: string;
  type: 'group_to_private' | 'private_to_group';
  sourceId: string;
  targetId: string;
  userId: string;
  bridgeMessage: string;
  contextSummary: string;
  createdAt: number;
  expiresAt: number; // 24小时后过期
}

const STORAGE_KEY = 'group_private_memory_bridges';
const CONTEXT_EXPIRE_TIME = 24 * 60 * 60 * 1000; // 24小时

export class GroupToPrivateMemoryService {
  private static instance: GroupToPrivateMemoryService;
  private bridges: MemoryBridge[] = [];
  private intents: PrivateChatIntent[] = [];

  private constructor() {
    this.loadFromStorage();
    this.cleanupExpiredBridges();
  }

  static getInstance(): GroupToPrivateMemoryService {
    if (!GroupToPrivateMemoryService.instance) {
      GroupToPrivateMemoryService.instance = new GroupToPrivateMemoryService();
    }
    return GroupToPrivateMemoryService.instance;
  }

  /**
   * 从localStorage加载数据
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.bridges = data.bridges || [];
        this.intents = data.intents || [];
      }
    } catch (error) {
      console.error('加载群聊私聊记忆桥接数据失败:', error);
      this.bridges = [];
      this.intents = [];
    }
  }

  /**
   * 保存数据到localStorage
   */
  private saveToStorage(): void {
    try {
      const data = {
        bridges: this.bridges,
        intents: this.intents
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('保存群聊私聊记忆桥接数据失败:', error);
    }
  }

  /**
   * 清理过期的桥接数据
   */
  private cleanupExpiredBridges(): void {
    const now = Date.now();
    this.bridges = this.bridges.filter(bridge => bridge.expiresAt > now);
    this.intents = this.intents.filter(intent => now - intent.timestamp < CONTEXT_EXPIRE_TIME);
    this.saveToStorage();
  }

  /**
   * 检测AI消息中是否包含私聊意图
   */
  detectPrivateChatIntent(message: string, _fromGroupId: string, _toPrivateId: string, _userId: string): boolean {
    const privateChatKeywords = [
      '私聊你', '私聊我', '私下聊', '单独聊', '私下说',
      '私聊', '单独聊', '私下交流', '私下谈', '私下沟通',
      '私聊说', '私聊聊', '私聊谈', '私聊讲', '私聊讨论',
      '我私聊你', '我马上私聊你', '我等下私聊你', '我稍后私聊你',
      '那你私聊我', '你私聊我', '你私下找我', '你私下联系我',
      '私聊给', '私聊发', '私聊送', '私聊转'
    ];

    return privateChatKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * 创建私聊意图记录
   */
  createPrivateChatIntent(
    fromGroupId: string,
    toPrivateId: string,
    userId: string,
    intentMessage: string,
    contextMessages: Message[]
  ): void {
    const intent: PrivateChatIntent = {
      fromGroupId,
      toPrivateId,
      userId,
      intentMessage,
      timestamp: Date.now(),
      contextMessages: contextMessages.slice(-10) // 保存最近10条消息作为上下文
    };

    this.intents.push(intent);
    this.saveToStorage();

    console.log('🔗 创建群聊到私聊意图:', {
      fromGroupId,
      toPrivateId,
      intentMessage: intentMessage.substring(0, 50) + '...'
    });
  }

  /**
   * 创建记忆桥接
   */
  createMemoryBridge(
    sourceId: string,
    targetId: string,
    userId: string,
    bridgeMessage: string,
    contextSummary: string
  ): void {
    const bridge: MemoryBridge = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type: sourceId.includes('group') ? 'group_to_private' : 'private_to_group',
      sourceId,
      targetId,
      userId,
      bridgeMessage,
      contextSummary,
      createdAt: Date.now(),
      expiresAt: Date.now() + CONTEXT_EXPIRE_TIME
    };

    this.bridges.push(bridge);
    this.saveToStorage();

    console.log('🌉 创建记忆桥接:', {
      type: bridge.type,
      bridgeMessage: bridgeMessage.substring(0, 50) + '...'
    });
  }

  /**
   * 获取私聊中的群聊上下文
   */
  getGroupContextForPrivate(privateId: string, userId: string): {
    hasContext: boolean;
    contextSummary: string;
    bridgeMessage?: string;
    fromGroupId?: string;
  } {
    // 查找相关的桥接
    const bridge = this.bridges.find(b => 
      b.targetId === privateId && 
      b.userId === userId && 
      b.type === 'group_to_private' &&
      b.expiresAt > Date.now()
    );

    if (bridge) {
      return {
        hasContext: true,
        contextSummary: bridge.contextSummary,
        bridgeMessage: bridge.bridgeMessage,
        fromGroupId: bridge.sourceId
      };
    }

    // 查找相关的意图
    const intent = this.intents.find(i => 
      i.toPrivateId === privateId && 
      i.userId === userId &&
      Date.now() - i.timestamp < CONTEXT_EXPIRE_TIME
    );

    if (intent) {
      // 生成上下文摘要
      const contextSummary = this.generateContextSummary(intent.contextMessages, intent.intentMessage);
      
      // 创建正式的记忆桥接
      this.createMemoryBridge(
        intent.fromGroupId,
        intent.toPrivateId,
        intent.userId,
        intent.intentMessage,
        contextSummary
      );

      return {
        hasContext: true,
        contextSummary,
        bridgeMessage: intent.intentMessage,
        fromGroupId: intent.fromGroupId
      };
    }

    return { hasContext: false, contextSummary: '' };
  }

  /**
   * 生成上下文摘要
   */
  private generateContextSummary(messages: Message[], bridgeMessage: string): string {
    const recentMessages = messages.slice(-5); // 最近5条消息
    const messageContents = recentMessages.map(m => {
      const sender = m.role === 'user' ? '用户' : (m as any).senderName || 'AI';
      return `${sender}: ${m.content}`;
    }).join('\n');

    return `
【群聊对话背景】
${messageContents}

【重要信息】
${bridgeMessage}

注意：以上是群聊中的对话内容，用户现在来到私聊中，你需要基于这些群聊背景进行回复。
`.trim();
  }

  /**
   * 检查是否应该创建桥接（从群聊AI消息触发）
   */
  shouldCreateBridge(
    message: Message,
    fromGroupId: string,
    userId: string,
    allConversations: Conversation[]
  ): void {
    // 只处理AI消息
    if (message.role !== 'assistant' || !message.content) return;

    // 检测私聊意图
    const hasIntent = this.detectPrivateChatIntent(
      message.content,
      fromGroupId,
      '', // 目标私聊ID暂时未知，稍后通过senderId查找
      userId
    );

    if (!hasIntent) return;

    // 🔧 修复：使用消息的senderId定位对应的私聊会话（而不是错误的members.includes）
    const senderId = (message as any).senderId;
    if (!senderId) {
      console.warn('⚠️ AI消息缺少senderId，无法创建私聊桥接');
      return;
    }

    const privateConversation = allConversations.find(c => 
      c.type === 'private' && c.id === senderId
    );

    if (!privateConversation) {
      console.warn(`⚠️ 未找到AI的私聊会话 (senderId: ${senderId})`);
      return;
    }

    // 查找群聊会话
    const groupConversation = allConversations.find(c => c.id === fromGroupId);
    if (!groupConversation) return;

    // 创建私聊意图
    this.createPrivateChatIntent(
      fromGroupId,
      privateConversation.id,
      userId,
      message.content,
      groupConversation.messages
    );

    console.log(`🌉 创建私聊意图: ${fromGroupId} → ${privateConversation.id}`);
  }

  /**
   * 获取桥接统计信息
   */
  getBridgeStats(): {
    totalBridges: number;
    activeBridges: number;
    totalIntents: number;
    activeIntents: number;
  } {
    const now = Date.now();
    const activeBridges = this.bridges.filter(b => b.expiresAt > now).length;
    const activeIntents = this.intents.filter(i => now - i.timestamp < CONTEXT_EXPIRE_TIME).length;

    return {
      totalBridges: this.bridges.length,
      activeBridges,
      totalIntents: this.intents.length,
      activeIntents
    };
  }

  /**
   * 清除所有数据
   */
  clearAllData(): void {
    this.bridges = [];
    this.intents = [];
    this.saveToStorage();
  }

  /**
   * 获取所有桥接数据（用于调试）
   */
  getAllBridges(): MemoryBridge[] {
    return [...this.bridges];
  }

  /**
   * 获取所有意图数据（用于调试）
   */
  getAllIntents(): PrivateChatIntent[] {
    return [...this.intents];
  }
}

// 导出单例实例
export const groupToPrivateMemoryService = GroupToPrivateMemoryService.getInstance();
