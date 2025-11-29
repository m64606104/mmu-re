/**
 * 🧪 词卡修复测试工具
 * 验证词卡生成数量修复和require错误修复
 */

import { generateDailyCards, DailyCardPool } from './smartCardGenerator';
import { ApiConfig } from '../types';

// 模拟API配置
const mockApiConfig: ApiConfig = {
  apiKey: 'test-key',
  baseUrl: 'https://api.openai.com/v1',
  modelName: 'gpt-3.5-turbo'
};

/**
 * 测试词卡生成数量是否正确（应该是20个词，不是60个）
 */
export async function testWordCardCount() {
  console.log('🧪 测试词卡生成数量修复...\n');
  
  try {
    const pool: DailyCardPool = await generateDailyCards(
      'test-child',
      100, // 识字量
      ['苹果', '香蕉', '猫', '狗'], // 已学词汇
      'toddler', // 成长阶段
      mockApiConfig
    );
    
    console.log(`📊 生成的词卡总数: ${pool.allWords.length}`);
    console.log(`📊 轮次数: ${pool.rounds.length}`);
    console.log(`📊 每轮词数: ${pool.rounds.map(r => r.length).join(', ')}`);
    
    // 验证总数
    const expectedTotal = 20;
    const expectedRounds = 5;
    const expectedWordsPerRound = 4;
    
    const totalCorrect = pool.allWords.length === expectedTotal;
    const roundsCorrect = pool.rounds.length === expectedRounds;
    const wordsPerRoundCorrect = pool.rounds.every(r => r.length === expectedWordsPerRound);
    
    console.log('\n✅ 测试结果:');
    console.log(`总数正确 (${expectedTotal}个): ${totalCorrect ? '✅' : '❌'}`);
    console.log(`轮次数正确 (${expectedRounds}轮): ${roundsCorrect ? '✅' : '❌'}`);
    console.log(`每轮词数正确 (${expectedWordsPerRound}个): ${wordsPerRoundCorrect ? '✅' : '❌'}`);
    
    if (totalCorrect && roundsCorrect && wordsPerRoundCorrect) {
      console.log('\n🎉 词卡数量修复成功！');
    } else {
      console.log('\n❌ 词卡数量修复失败！');
    }
    
    return {
      success: totalCorrect && roundsCorrect && wordsPerRoundCorrect,
      totalWords: pool.allWords.length,
      rounds: pool.rounds.length,
      wordsPerRound: pool.rounds.map(r => r.length)
    };
    
  } catch (error: any) {
    console.error('❌ 测试失败:', error);
    
    // 检查是否是require错误
    if (error.message && error.message.includes('require is not defined')) {
      console.log('🚨 检测到require错误，说明修复未完全生效');
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 测试动态导入是否工作（修复require错误）
 */
export async function testDynamicImports() {
  console.log('🧪 测试动态导入修复...\n');
  
  try {
    // 测试aiKindergartenManager中的动态导入
    await import('./aiKindergartenManager');
    console.log('✅ aiKindergartenManager动态导入成功');
    
    // 测试correctComprehensionSystem动态导入
    await import('./correctComprehensionSystem');
    console.log('✅ correctComprehensionSystem动态导入成功');
    
    // 测试documentLibrary动态导入
    await import('./documentLibrary');
    console.log('✅ documentLibrary动态导入成功');
    
    console.log('\n🎉 动态导入修复成功！');
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ 动态导入测试失败:', error);
    
    if (error.message && error.message.includes('require is not defined')) {
      console.log('🚨 仍然存在require错误');
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * 运行所有测试
 */
export async function runAllWordCardFixTests() {
  console.log('🧪 运行所有词卡修复测试...\n');
  
  const results = {
    wordCount: await testWordCardCount(),
    dynamicImports: await testDynamicImports()
  };
  
  console.log('\n📊 测试总结:');
  console.log(`词卡数量修复: ${results.wordCount.success ? '✅' : '❌'}`);
  console.log(`动态导入修复: ${results.dynamicImports.success ? '✅' : '❌'}`);
  
  const allSuccess = results.wordCount.success && results.dynamicImports.success;
  console.log(`\n${allSuccess ? '🎉 所有测试通过！' : '❌ 部分测试失败'}`);
  
  return results;
}

// 在开发环境中暴露到全局
if (typeof window !== 'undefined') {
  (window as any).testWordCardFixes = {
    testWordCardCount,
    testDynamicImports,
    runAllTests: runAllWordCardFixTests
  };
}
