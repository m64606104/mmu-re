// 测试括号处理修复

// 简单的模拟测试
function testSplitMessages() {
  // 模拟的问题消息
  const testMessages = [
    "（他承认，声音沙哑得几乎听不见。）",
    "我想要（深入讨论这个问题）和你聊聊。",
    "（他紧闭了一下眼睛，怀里的人是那么脆弱，而他，却给不出任何解答。）",
    "（他感受着你靠在他身上的沉重，这句是肯定，也是共鸣。）"
  ];

  console.log('🧪 测试包含括号的消息处理...\n');

  // 模拟处理逻辑
  testMessages.forEach((msg, index) => {
    console.log(`测试 ${index + 1}: ${msg}`);
    
    // 检查括号匹配
    const openParens = (msg.match(/[（(]/g) || []).length;
    const closeParens = (msg.match(/[）)]/g) || []).length;
    
    console.log(`  开括号: ${openParens}, 闭括号: ${closeParens}`);
    console.log(`  匹配状态: ${openParens === closeParens ? '✅ 完整' : '❌ 不匹配'}`);
    
    // 检查是否应该被保护
    const isProtected = /[（(][^（()）]*[）)]/.test(msg);
    console.log(`  保护状态: ${isProtected ? '✅ 应被保护' : '❌ 可能被分割'}`);
    console.log('');
  });

  console.log('✨ 修复要点:');
  console.log('1. 增强了括号保护模式 ([（(])([^（()）]*?)([）)])');  
  console.log('2. 禁用了自动合并逻辑，避免重复发送');
  console.log('3. 改进了自动补齐逻辑，更加谨慎');
}

testSplitMessages();
