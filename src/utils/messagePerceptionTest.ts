/**
 * 消息感知系统测试工具
 * 用于验证AI能否正确感知用户消息
 * 数据存储在IndexedDB中，无用户可见提示
 */

import { messagePerceptionService } from './messagePerceptionService';
import { Message, Conversation } from '../types';

/**
 * 创建测试消息
 */
function createTestMessage(content: string, id?: string): Message {
  return {
    id: id || `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    role: 'user',
    content: content,
    timestamp: Date.now()
  };
}

/**
 * 创建测试对话
 */
function createTestConversation(): Conversation {
  return {
    id: `test_conv_${Date.now()}`,
    name: '测试对话',
    type: 'private',
    messages: [],
    lastMessageTime: Date.now(),
    members: ['test_ai_1'],
    unreadCount: 0
  } as Conversation;
}

/**
 * 测试AI消息感知功能
 */
export async function testMessagePerception(): Promise<boolean> {
  console.log('🧠 [测试] 开始测试AI消息感知功能...');
  
  try {
    // 1. 创建测试环境
    const testConversation = createTestConversation();
    const testMessage = createTestMessage('这是一条测试消息');
    
    console.log('📝 [测试] 创建测试对话和消息');
    
    // 2. 触发消息感知
    messagePerceptionService.perceiveMessage(testConversation, testMessage);
    
    // 3. 等待感知处理完成
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 4. 验证AI感知状态
    const perceptionState = messagePerceptionService.getAIPerceptionState(
      testConversation.id, 
      'test_ai_1'
    );
    
    if (!perceptionState) {
      console.error(' [测试] AI未感知到消息');
      return false;
    }
    
    // 5. 验证感知内容
    if (perceptionState.lastPerceivedMessageId !== testMessage.id) {
      console.error('❌ [测试] AI感知的消息ID不匹配');
      return false;
    }
    
    if (perceptionState.messageContent !== testMessage.content) {
      console.error('❌ [测试] AI感知的消息内容不匹配');
      return false;
    }
    
    if (perceptionState.messageType !== 'text') {
      console.error('❌ [测试] AI感知的消息类型不正确');
      return false;
    }
    
    console.log('✅ [测试] AI消息感知功能正常');
    console.log(`🧠 [测试] AI感知内容: "${perceptionState.messageContent}"`);
    console.log(`⏰ [测试] 感知时间: ${new Date(perceptionState.perceptionTimestamp).toLocaleTimeString()}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ [测试] 消息感知测试失败:', error);
    return false;
  }
}

/**
 * 测试多种消息类型的感知
 */
export async function testMultipleMessageTypes(): Promise<void> {
  console.log('🧠 [测试] 开始测试多种消息类型感知...');
  
  const testConversation = createTestConversation();
  
  // 测试文本消息
  const textMessage = createTestMessage('普通文本消息');
  messagePerceptionService.perceiveMessage(testConversation, textMessage);
  
  // 测试图片消息
  const imageMessage: Message = {
    ...createTestMessage(''),
    mediaType: 'image',
    mediaUrl: 'test_image.jpg'
  };
  messagePerceptionService.perceiveMessage(testConversation, imageMessage);
  
  // 测试音乐消息
  const musicMessage: Message = {
    ...createTestMessage(''),
    music: {
      title: '测试歌曲',
      artist: '测试艺术家'
    }
  };
  messagePerceptionService.perceiveMessage(testConversation, musicMessage);
  
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // 验证最后一条音乐消息的感知
  const perceptionState = messagePerceptionService.getAIPerceptionState(
    testConversation.id,
    'test_ai_1'
  );
  
  if (perceptionState && perceptionState.messageType === 'music') {
    console.log('✅ [测试] 多种消息类型感知正常');
    console.log(`🎵 [测试] 感知到音乐消息: ${perceptionState.messageContent}`);
  } else {
    console.error('❌ [测试] 多种消息类型感知异常');
  }
}

/**
 * 测试群聊感知
 */
export async function testGroupChatPerception(): Promise<void> {
  console.log('🧠 [测试] 开始测试群聊消息感知...');
  
  const groupConversation: Conversation = {
    id: `test_group_${Date.now()}`,
    name: '测试群聊',
    type: 'group',
    messages: [],
    lastMessageTime: Date.now(),
    members: ['ai_1', 'ai_2', 'ai_3'],
    unreadCount: 0
  } as Conversation;
  
  const testMessage = createTestMessage('群聊测试消息');
  
  messagePerceptionService.perceiveMessage(groupConversation, testMessage);
  
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // 验证所有AI都感知到了消息
  const aiIds = ['ai_1', 'ai_2', 'ai_3'];
  let allPerceived = true;
  
  for (const aiId of aiIds) {
    const perceptionState = messagePerceptionService.getAIPerceptionState(
      groupConversation.id,
      aiId
    );
    
    if (!perceptionState || perceptionState.lastPerceivedMessageId !== testMessage.id) {
      console.error(`❌ [测试] AI ${aiId} 未正确感知群聊消息`);
      allPerceived = false;
    }
  }
  
  if (allPerceived) {
    console.log('✅ [测试] 群聊消息感知正常，所有AI都感知到了消息');
  }
}

/**
 * 运行所有测试
 */
export async function runAllPerceptionTests(): Promise<void> {
  console.log('🚀 [测试] 开始运行所有消息感知测试...');
  
  const results = [];
  
  // 基础感知测试
  results.push(await testMessagePerception());
  
  // 多类型消息测试
  await testMultipleMessageTypes();
  
  // 群聊感知测试
  await testGroupChatPerception();
  
  // 统计信息
  const stats = messagePerceptionService.getStats();
  console.log('📊 [测试] 感知系统统计:', stats);
  
  // 清理测试数据
  messagePerceptionService.cleanup(0); // 立即清理
  
  console.log('🎯 [测试] 所有消息感知测试完成');
}

// 在开发环境下，将测试函数挂载到window对象供调试使用
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).testMessagePerception = runAllPerceptionTests;
}
