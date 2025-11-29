/**
 * 群聊私聊记忆桥接测试工具
 * 用于测试和验证群聊到私聊的记忆连贯性功能
 */

import { groupToPrivateMemoryService } from './groupToPrivateMemoryService';
import { Message, Conversation } from '../types';

export class GroupToPrivateMemoryTest {
  /**
   * 运行完整的测试套件
   */
  static async runFullTest(): Promise<void> {
    console.log('🧪 开始群聊私聊记忆桥接测试...');
    
    try {
      // 测试1: 私聊意图检测
      await this.testPrivateChatIntentDetection();
      
      // 测试2: 记忆桥接创建
      await this.testMemoryBridgeCreation();
      
      // 测试3: 私聊上下文获取
      await this.testGroupContextRetrieval();
      
      // 测试4: 数据清理
      await this.testDataCleanup();
      
      console.log('✅ 所有测试完成');
    } catch (error) {
      console.error('❌ 测试失败:', error);
    }
  }

  /**
   * 测试私聊意图检测
   */
  private static async testPrivateChatIntentDetection(): Promise<void> {
    console.log('🔍 测试1: 私聊意图检测');
    
    const testMessages = [
      '我等下私聊你',
      '那你私聊我，我给你发个大红包',
      '我们私下聊这个话题',
      '我马上私聊你详细说',
      '普通聊天内容，不包含私聊意图'
    ];
    
    testMessages.forEach((message, index) => {
      const hasIntent = groupToPrivateMemoryService.detectPrivateChatIntent(
        message,
        'group-123',
        'private-456',
        'user123'
      );
      
      console.log(`  ${index + 1}. "${message}" -> ${hasIntent ? '✅ 检测到私聊意图' : '❌ 无私聊意图'}`);
    });
  }

  /**
   * 测试记忆桥接创建
   */
  private static async testMemoryBridgeCreation(): Promise<void> {
    console.log('🔗 测试2: 记忆桥接创建');
    
    // 创建模拟的群聊消息
    const mockGroupMessages: Message[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: '大家好，最近工作压力很大',
        timestamp: Date.now() - 10000
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: '我理解你的压力，要不我们私下聊聊这个话题？我私聊你详细说说',
        timestamp: Date.now() - 5000
      },
      {
        id: 'msg-3',
        role: 'user',
        content: '好的，那我们私聊',
        timestamp: Date.now()
      }
    ];
    
    // 创建私聊意图
    groupToPrivateMemoryService.createPrivateChatIntent(
      'group-123',
      'private-456',
      'user123',
      '我私聊你详细说说',
      mockGroupMessages
    );
    
    console.log('  ✅ 私聊意图创建成功');
  }

  /**
   * 测试私聊上下文获取
   */
  private static async testGroupContextRetrieval(): Promise<void> {
    console.log('📚 测试3: 私聊上下文获取');
    
    // 获取私聊中的群聊上下文
    const context = groupToPrivateMemoryService.getGroupContextForPrivate(
      'private-456',
      'user123'
    );
    
    if (context.hasContext) {
      console.log('  ✅ 成功获取群聊上下文');
      console.log(`  📝 上下文摘要: ${context.contextSummary.substring(0, 100)}...`);
      console.log(`  🌉 桥接消息: ${context.bridgeMessage}`);
      console.log(`  🏠 来源群聊: ${context.fromGroupId}`);
    } else {
      console.log('  ❌ 未能获取群聊上下文');
    }
  }

  /**
   * 测试数据清理
   */
  private static async testDataCleanup(): Promise<void> {
    console.log('🧹 测试4: 数据清理');
    
    // 获取清理前的统计
    const beforeStats = groupToPrivateMemoryService.getBridgeStats();
    console.log(`  清理前: ${beforeStats.activeBridges} 个活跃桥接, ${beforeStats.activeIntents} 个活跃意图`);
    
    // 手动清理过期数据（模拟过期）
    groupToPrivateMemoryService.clearAllData();
    
    // 获取清理后的统计
    const afterStats = groupToPrivateMemoryService.getBridgeStats();
    console.log(`  清理后: ${afterStats.activeBridges} 个活跃桥接, ${afterStats.activeIntents} 个活跃意图`);
    
    console.log('  ✅ 数据清理测试完成');
  }

  /**
   * 测试真实场景模拟
   */
  static async testRealScenario(): Promise<void> {
    console.log('🎭 测试真实场景模拟');
    
    // 清理之前的数据
    groupToPrivateMemoryService.clearAllData();
    
    // 模拟群聊对话
    const groupConversation: Conversation = {
      id: 'group-work',
      type: 'group',
      name: '工作交流群',
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: '最近项目进展不太顺利，我有点焦虑',
          timestamp: Date.now() - 30000
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: '别担心，我理解你的感受。这个项目确实有挑战性。要不我私聊你，我们详细聊聊具体情况？',
          timestamp: Date.now() - 20000
        },
        {
          id: 'msg-3',
          role: 'user',
          content: '好的，谢谢理解',
          timestamp: Date.now() - 10000
        }
      ],
      lastMessageTime: Date.now(),
      unreadCount: 0
    };
    
    // 模拟私聊对话
    const privateConversation: Conversation = {
      id: 'private-ai-1',
      type: 'private',
      name: 'AI助手',
      messages: [],
      lastMessageTime: Date.now(),
      unreadCount: 0
    };
    
    // 模拟所有对话
    const allConversations: Conversation[] = [groupConversation, privateConversation];
    
    // 检测群聊中的私聊意图
    const aiMessage = groupConversation.messages.find(m => m.role === 'assistant');
    if (aiMessage) {
      groupToPrivateMemoryService.shouldCreateBridge(
        aiMessage,
        groupConversation.id,
        'user123',
        allConversations
      );
    }
    
    // 等待一下确保数据保存
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 模拟用户进入私聊
    const privateContext = groupToPrivateMemoryService.getGroupContextForPrivate(
      privateConversation.id,
      'user123'
    );
    
    if (privateContext.hasContext) {
      console.log('  ✅ 真实场景测试成功');
      console.log(`  📝 用户在私聊中会看到群聊背景: ${privateContext.contextSummary.substring(0, 80)}...`);
      
      // 模拟AI在私聊中的回复
      const aiReplyWithContext = `基于你在群聊提到的项目进展问题，我想说：别给自己太大压力，每个项目都会有困难时期。我们可以一起分析具体的问题，看看有什么可以改进的地方。`;
      
      console.log(`  🤖 AI在私聊中的连贯回复: ${aiReplyWithContext}`);
    } else {
      console.log('  ❌ 真实场景测试失败');
    }
  }

  /**
   * 获取系统状态
   */
  static getSystemStatus(): void {
    const stats = groupToPrivateMemoryService.getBridgeStats();
    const bridges = groupToPrivateMemoryService.getAllBridges();
    const intents = groupToPrivateMemoryService.getAllIntents();
    
    console.log('📊 群聊私聊记忆桥接系统状态:');
    console.log(`  🌉 总桥接数: ${stats.totalBridges}`);
    console.log(`  ✅ 活跃桥接数: ${stats.activeBridges}`);
    console.log(`  💭 总意图数: ${stats.totalIntents}`);
    console.log(`  ⚡ 活跃意图数: ${stats.activeIntents}`);
    
    if (bridges.length > 0) {
      console.log('  📋 活跃桥接详情:');
      bridges.forEach(bridge => {
        console.log(`    - ${bridge.type}: ${bridge.sourceId} → ${bridge.targetId}`);
      });
    }
    
    if (intents.length > 0) {
      console.log('  💭 活跃意图详情:');
      intents.forEach(intent => {
        console.log(`    - ${intent.fromGroupId} → ${intent.toPrivateId}: ${intent.intentMessage.substring(0, 30)}...`);
      });
    }
  }
}

// 将测试函数暴露到全局，方便在浏览器控制台中调用
declare global {
  interface Window {
    testGroupToPrivateMemory: () => void;
    testGroupToPrivateScenario: () => void;
    getGroupToPrivateMemoryStatus: () => void;
  }
}

// 在开发环境中暴露测试函数
if (typeof window !== 'undefined') {
  window.testGroupToPrivateMemory = () => GroupToPrivateMemoryTest.runFullTest();
  window.testGroupToPrivateScenario = () => GroupToPrivateMemoryTest.testRealScenario();
  window.getGroupToPrivateMemoryStatus = () => GroupToPrivateMemoryTest.getSystemStatus();
}
