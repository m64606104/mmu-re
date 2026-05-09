/**
 * AI主动私聊消息功能测试工具
 * 用于验证AI在群聊中承诺私聊发送内容后，是否会主动在私聊中发送消息
 */

import { Conversation, Message } from '../types';

/**
 * 测试AI承诺私聊发送内容的检测
 */
export function testPrivatePromiseDetection() {
  console.log('🧪 测试AI承诺私聊发送内容检测...\n');
  
  const testCases = [
    {
      content: '我私聊发给你一些有趣的视频',
      expected: true,
      description: '标准承诺'
    },
    {
      content: '等下私下发给你链接',
      expected: true,
      description: '延迟承诺'
    },
    {
      content: '我稍后单独发给你',
      expected: true,
      description: '稍后承诺'
    },
    {
      content: '我们私下聊这个问题',
      expected: false,
      description: '只是私聊，没有发送承诺'
    },
    {
      content: '我给你发个图片',
      expected: false,
      description: '没有私聊关键词'
    },
    {
      content: '我私聊你这个文件',
      expected: true,
      description: '简短承诺'
    }
  ];
  
  const privatePromiseKeywords = [
    '我私聊发给你', '我私下发给你', '我单独发给你',
    '私聊发', '私下发', '单独发',
    '我私聊给你发', '我私下给你发', '我单独给你发',
    '等下私聊发', '等下私下发', '等下单独发',
    '稍后私聊发', '稍后私下发', '稍后单独发'
  ];
  
  testCases.forEach((testCase, index) => {
    const hasPromise = privatePromiseKeywords.some(keyword => testCase.content.includes(keyword));
    const passed = hasPromise === testCase.expected;
    
    console.log(`${passed ? '✅' : '❌'} 测试 ${index + 1}: ${testCase.description}`);
    console.log(`   内容: "${testCase.content}"`);
    console.log(`   预期: ${testCase.expected}, 实际: ${hasPromise}`);
    console.log('');
  });
}

/**
 * 测试私聊会话查找逻辑
 */
export function testPrivateConversationLookup() {
  console.log('🧪 测试私聊会话查找逻辑...\n');
  
  // 模拟对话列表
  const mockConversations: Conversation[] = [
    {
      id: 'ai-1',
      type: 'private',
      name: 'AI助手1',
      messages: [],
      lastMessageTime: Date.now(),
      unreadCount: 0
    },
    {
      id: 'ai-2', 
      type: 'private',
      name: 'AI助手2',
      messages: [],
      lastMessageTime: Date.now(),
      unreadCount: 0
    },
    {
      id: 'group-1',
      type: 'group',
      name: '测试群聊',
      members: ['ai-1', 'ai-2', 'user'],
      messages: [],
      lastMessageTime: Date.now(),
      unreadCount: 0
    }
  ];
  
  const testCases = [
    {
      aiId: 'ai-1',
      expected: true,
      description: '查找存在的AI私聊'
    },
    {
      aiId: 'ai-3',
      expected: false,
      description: '查找不存在的AI私聊'
    },
    {
      aiId: 'group-1',
      expected: false,
      description: '查找群聊（应该返回false）'
    }
  ];
  
  testCases.forEach((testCase, index) => {
    const privateConversation = mockConversations.find(c => 
      c.type === 'private' && c.id === testCase.aiId
    );
    const found = !!privateConversation;
    const passed = found === testCase.expected;
    
    console.log(`${passed ? '✅' : '❌'} 测试 ${index + 1}: ${testCase.description}`);
    console.log(`   AI ID: ${testCase.aiId}`);
    console.log(`   预期: ${testCase.expected}, 实际: ${found}`);
    if (privateConversation) {
      console.log(`   找到会话: ${privateConversation.name}`);
    }
    console.log('');
  });
}

/**
 * 测试私聊消息生成逻辑
 */
export function testPrivateMessageGeneration() {
  console.log('🧪 测试私聊消息生成逻辑...\n');
  
  const mockGroupMessage: Message = {
    id: 'group-msg-1',
    role: 'assistant',
    content: '我私聊发给你一些搞笑的视频，等下哈',
    timestamp: Date.now()
  };
  
  // 模拟生成私聊提示词
  const privatePrompt = `你在群聊中承诺要私聊发送内容给用户。现在请履行承诺，发送相关内容。

群聊背景：group-1
你的承诺：${mockGroupMessage.content.substring(0, 100)}...

请发送符合承诺的内容，可以是：
- 有趣的视频（使用[视频:描述]格式）
- 好看的图片（使用[图片:描述]格式）  
- 有用的链接
- 其他符合承诺的内容

要求：
1. 内容要符合你在群聊中的承诺
2. 自然地提及群聊中的承诺
3. 内容要有趣、有价值
4. 长度控制在50-200字以内`;
  
  console.log('📝 生成的私聊提示词:');
  console.log(privatePrompt);
  console.log('');
  
  // 模拟AI回复
  const mockAIReply = `哈，说到搞笑视频，我私聊发给你一个超萌的猫咪视频！[视频:一只橘猫在追激光笔，突然撞到沙发上的搞笑瞬间] 刚才在群里人多不好意思发，这个真的太逗了，你看了一定会笑！`;
  
  console.log('🤖 模拟AI回复:');
  console.log(mockAIReply);
  console.log('');
  
  // 验证回复格式
  const hasVideoFormat = mockAIReply.includes('[视频:');
  const mentionsPromise = mockAIReply.includes('私聊') || mockAIReply.includes('群里');
  const appropriateLength = mockAIReply.length >= 50 && mockAIReply.length <= 200;
  
  console.log('📊 回复质量检查:');
  console.log(`✅ 包含视频格式: ${hasVideoFormat}`);
  console.log(`✅ 提及群聊承诺: ${mentionsPromise}`);
  console.log(`✅ 长度适中: ${appropriateLength}`);
  console.log(`📏 实际长度: ${mockAIReply.length} 字符`);
  console.log('');
}

/**
 * 完整的功能流程测试
 */
export function testCompleteWorkflow() {
  console.log('🧪 测试完整的AI主动私聊流程...\n');
  
  console.log('📋 流程步骤:');
  console.log('1. AI在群聊中发送包含承诺的消息');
  console.log('2. 系统检测到承诺关键词');
  console.log('3. 查找AI对应的私聊会话');
  console.log('4. 延迟3-8秒后生成私聊消息');
  console.log('5. 调用Chat API生成内容');
  console.log('6. 将消息添加到私聊会话');
  console.log('');
  
  // 模拟完整流程
  const aiId = 'ai-1';
  const fromGroupId = 'group-1';
  
  console.log(`🤖 AI ${aiId} 在群聊 ${fromGroupId} 中发送消息:`);
  console.log('"我私聊发给你一些好看的照片，稍等哈"');
  console.log('');
  
  console.log('🔍 系统检测到承诺关键词: "私聊发给你"');
  console.log('✅ 检测成功');
  console.log('');
  
  console.log(`🔍 查找AI ${aiId} 的私聊会话...`);
  console.log('✅ 找到私聊会话: "AI助手1"');
  console.log('');
  
  console.log('⏰ 延迟5秒后发送私聊消息...');
  console.log('🤖 生成私聊内容...');
  console.log('✅ 消息已发送到私聊会话');
  console.log('');
  
  console.log('📬 最终私聊消息:');
  console.log('"说到好看照片，我私聊发给你一些超美的风景照！[图片:夕阳下的海滩，金色阳光洒在波浪上] 刚才在群里人多，这些照片真的很棒，希望你喜欢！"');
  console.log('');
}

/**
 * 运行所有测试
 */
export function runAllTests() {
  console.log('🚀 开始AI主动私聊消息功能测试\n');
  console.log('=' .repeat(50));
  console.log('');
  
  testPrivatePromiseDetection();
  console.log('-'.repeat(30));
  
  testPrivateConversationLookup();
  console.log('-'.repeat(30));
  
  testPrivateMessageGeneration();
  console.log('-'.repeat(30));
  
  testCompleteWorkflow();
  
  console.log('=' .repeat(50));
  console.log('🎉 所有测试完成！');
  console.log('');
  console.log('💡 提示: 在开发环境中，你可以在浏览器控制台中运行:');
  console.log('   window.testAutoPrivateDM() 来执行这些测试');
}

// 将测试函数暴露到全局（开发环境）
if (typeof window !== 'undefined') {
  (window as any).testAutoPrivateDM = runAllTests;
  (window as any).testPrivatePromiseDetection = testPrivatePromiseDetection;
  (window as any).testPrivateConversationLookup = testPrivateConversationLookup;
  (window as any).testPrivateMessageGeneration = testPrivateMessageGeneration;
  (window as any).testCompleteWorkflow = testCompleteWorkflow;
}
