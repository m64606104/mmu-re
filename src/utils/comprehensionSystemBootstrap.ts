/**
 * 🚀 AI理解力多维度成长系统 - 启动和测试工具
 * 
 * 功能：
 * - 系统初始化和自检
 * - 提供测试示例和工具
 * - 验证系统完整性
 * - 生成使用指南
 */

import { 
  initializeComprehensionSystem, 
  handleWordTeachingActivity,
  handleChatActivity,
  handleTopicDiscussionActivity,
  handleStoryReadingActivity,
  getComprehensiveChildStatus,
  isSystemReady,
  getSystemStats
} from './comprehensionSystemManager';

import { 
  calculateWordLearningExperience,
  COMPREHENSION_CONFIG,
  STORY_LEVELS
} from './newComprehensionSystem';

// =================== 系统启动器 ===================

/**
 * 完整系统初始化（应用启动时调用）
 */
export async function bootstrapComprehensionSystem(): Promise<{
  success: boolean;
  message: string;
  details: any;
}> {
  try {
    console.log('🚀 启动AI理解力多维度成长系统...');
    
    // 1. 初始化核心系统
    const initResult = await initializeComprehensionSystem();
    
    if (!initResult.success) {
      return {
        success: false,
        message: '系统初始化失败',
        details: initResult
      };
    }
    
    // 2. 验证系统状态
    const isReady = await isSystemReady();
    if (!isReady) {
      return {
        success: false,
        message: '系统初始化完成但验证未通过',
        details: { initResult, isReady }
      };
    }
    
    // 3. 获取系统统计
    const stats = await getSystemStats();
    
    // 4. 显示启动信息
    console.log('🎉 AI理解力系统启动成功！');
    console.log('📊 系统统计：', stats);
    
    return {
      success: true,
      message: `理解力系统启动成功！管理${stats.totalChildren}个AI儿童`,
      details: {
        initResult,
        stats,
        features: [
          '✅ 多维度理解力计算',
          '✅ 每日经验上限管理', 
          '✅ 词卡教学轮次控制',
          '✅ 自动数据迁移',
          '✅ 智能学习建议',
          '✅ 完整统计分析'
        ]
      }
    };
    
  } catch (error) {
    console.error('❌ 理解力系统启动失败：', error);
    return {
      success: false,
      message: `系统启动失败：${error}`,
      details: { error }
    };
  }
}

// =================== 测试工具 ===================

/**
 * 测试词卡教学功能
 */
export async function testWordTeachingSystem(childId: string): Promise<void> {
  console.log('\n📝 === 测试词卡教学系统 ===');
  
  try {
    // 准备测试词汇
    const testWords = [
      { word: '学习', definition: '通过教授、训练获得知识或技能', examples: ['我在学习新技能', '学习使人进步'] },
      { word: '成长', definition: '身心逐渐发展成熟的过程', examples: ['孩子在快乐中成长', '我们一起成长'] },
      { word: '进步', definition: '向前发展，比原来更好', examples: ['他的成绩有了进步', '技术不断进步'] },
      { word: '努力', definition: '尽力去做某件事', examples: ['努力学习', '为梦想而努力'] },
      { word: '成功', definition: '达到预期的目的', examples: ['经过努力获得成功', '成功需要坚持'] }
    ];
    
    console.log(`🎯 开始教授${testWords.length}个词汇...`);
    
    // 执行词卡教学
    const result = await handleWordTeachingActivity(childId, testWords);
    
    if (result.success) {
      console.log('✅ 词卡教学测试成功！');
      console.log('📊 经验获得：', result.experienceGained);
      console.log('🎉 等级变化：', result.levelUps);
      console.log('📝 详细报告：');
      console.log(result.report);
    } else {
      console.log('❌ 词卡教学测试失败：', result.message);
    }
    
  } catch (error) {
    console.error('❌ 词卡教学测试出错：', error);
  }
}

/**
 * 测试自由聊天功能
 */
export async function testChatSystem(childId: string): Promise<void> {
  console.log('\n💬 === 测试自由聊天系统 ===');
  
  try {
    console.log('🎯 模拟10分钟高质量聊天...');
    
    // 模拟聊天活动
    const result = await handleChatActivity(
      childId,
      10,        // 10分钟
      8,         // 高情感深度
      7          // 高上下文复杂度
    );
    
    if (result.success) {
      console.log('✅ 自由聊天测试成功！');
      console.log('📊 经验获得：', result.experienceGained);
      console.log('🎯 经验上限：', result.limitInfo);
      console.log('📝 详细报告：');
      console.log(result.report);
    } else {
      console.log('❌ 自由聊天测试失败：', result.message);
    }
    
  } catch (error) {
    console.error('❌ 自由聊天测试出错：', error);
  }
}

/**
 * 测试话题讨论功能
 */
export async function testTopicDiscussionSystem(childId: string): Promise<void> {
  console.log('\n🎯 === 测试话题讨论系统 ===');
  
  try {
    console.log('🎯 模拟20分钟深度话题讨论...');
    
    // 模拟话题讨论
    const result = await handleTopicDiscussionActivity(
      childId,
      20,        // 20分钟
      9,         // 高逻辑深度
      8          // 高抽象程度
    );
    
    if (result.success) {
      console.log('✅ 话题讨论测试成功！');
      console.log('📊 经验获得：', result.experienceGained);
      console.log('🎯 经验上限：', result.limitInfo);
      console.log('📝 详细报告：');
      console.log(result.report);
    } else {
      console.log('❌ 话题讨论测试失败：', result.message);
    }
    
  } catch (error) {
    console.error('❌ 话题讨论测试出错：', error);
  }
}

/**
 * 测试故事阅读功能
 */
export async function testStoryReadingSystem(childId: string): Promise<void> {
  console.log('\n📖 === 测试故事阅读系统 ===');
  
  try {
    console.log('🎯 模拟15分钟基础故事阅读...');
    
    // 模拟故事阅读
    const result = await handleStoryReadingActivity(
      childId,
      'elementary',  // 基础故事
      15,           // 15分钟
      8             // 高理解质量
    );
    
    if (result.success) {
      console.log('✅ 故事阅读测试成功！');
      console.log('📊 经验获得：', result.experienceGained);
      console.log('🎯 经验上限：', result.limitInfo);
      console.log('📝 详细报告：');
      console.log(result.report);
    } else {
      console.log('❌ 故事阅读测试失败：', result.message);
    }
    
  } catch (error) {
    console.error('❌ 故事阅读测试出错：', error);
  }
}

/**
 * 全面测试套件
 */
export async function runComprehensiveTest(childId: string): Promise<void> {
  console.log('\n🧪 === AI理解力系统全面测试 ===');
  console.log(`测试目标：${childId}`);
  
  try {
    // 1. 获取初始状态
    console.log('\n📊 === 获取初始状态 ===');
    const initialStatus = await getComprehensiveChildStatus(childId);
    if (!initialStatus) {
      throw new Error('无法获取AI儿童状态');
    }
    
    console.log(`👶 AI儿童：${initialStatus.childName}`);
    console.log(`📈 当前等级：Lv.${initialStatus.comprehension.overall.level}`);
    console.log(`📚 词汇量：${initialStatus.vocabularyCount}`);
    console.log(`🎯 成长阶段：${initialStatus.stage}`);
    
    // 2. 依次测试各个功能
    await testWordTeachingSystem(childId);
    await testChatSystem(childId);
    await testTopicDiscussionSystem(childId);
    await testStoryReadingSystem(childId);
    
    // 3. 获取最终状态
    console.log('\n📊 === 获取最终状态 ===');
    const finalStatus = await getComprehensiveChildStatus(childId);
    if (finalStatus) {
      console.log(`📈 最终等级：Lv.${finalStatus.comprehension.overall.level}`);
      console.log(`📚 最终词汇量：${finalStatus.vocabularyCount}`);
      console.log(`💡 学习建议：`, finalStatus.recommendations.learningTips);
      
      // 显示今日概览
      console.log('\n📅 今日学习概览：');
      console.log(`总经验获得：${finalStatus.todayOverview.totalExpToday}/${finalStatus.todayOverview.maxExpToday}`);
      console.log('各活动经验：');
      for (const [activity, status] of Object.entries(finalStatus.todayOverview.experienceStatus)) {
        console.log(`  ${activity}: ${status.gained}/${status.limit} (${status.percentage}%)`);
      }
    }
    
    console.log('\n🎉 === 全面测试完成 ===');
    
  } catch (error) {
    console.error('❌ 全面测试失败：', error);
  }
}

// =================== 开发者工具 ===================

/**
 * 显示系统配置信息
 */
export function showSystemConfiguration(): void {
  console.log('\n⚙️ === 理解力系统配置 ===');
  
  console.log('\n📊 经验计算配置：');
  console.log('每个词基础经验：', COMPREHENSION_CONFIG.wordExperience);
  console.log('特殊词汇加成：', COMPREHENSION_CONFIG.specialWordBonus);
  console.log('每级经验需求：', COMPREHENSION_CONFIG.expPerLevel);
  console.log('最高等级：', COMPREHENSION_CONFIG.maxLevel);
  
  console.log('\n⏱️ 每日经验上限：');
  console.log(COMPREHENSION_CONFIG.dailyExpLimits);
  
  console.log('\n📖 故事分级系统：');
  for (const [_level, config] of Object.entries(STORY_LEVELS)) {
    console.log(`${config.icon} ${config.name}：`);
    console.log(`  词汇门槛：${config.vocabularyRequirement}`);
    console.log(`  经验系数：`, config.experienceMultipliers);
  }
  
  console.log('\n📈 总体理解力权重：');
  console.log(COMPREHENSION_CONFIG.overallWeights);
}

/**
 * 计算经验示例
 */
export function showExperienceCalculationExamples(): void {
  console.log('\n🧮 === 经验计算示例 ===');
  
  // 示例1：20个普通词汇
  const normalWords = Array(20).fill('示例词汇');
  const normalExp = calculateWordLearningExperience(normalWords, 8);
  console.log('\n📝 20个普通词汇（质量8分）：');
  for (const [ability, exp] of Object.entries(normalExp)) {
    console.log(`  ${ability}: +${exp}经验`);
  }
  const normalTotal = Object.values(normalExp).reduce((sum, exp) => sum + exp, 0);
  console.log(`  总计：${normalTotal}经验`);
  
  // 示例2：包含特殊词汇
  const specialWords = ['开心', '思考', '因为', '学习', '成长'];
  const specialExp = calculateWordLearningExperience(specialWords, 8);
  console.log('\n✨ 5个特殊词汇（包含情感、抽象、逻辑）：');
  for (const [ability, exp] of Object.entries(specialExp)) {
    console.log(`  ${ability}: +${exp}经验`);
  }
  const specialTotal = Object.values(specialExp).reduce((sum, exp) => sum + exp, 0);
  console.log(`  总计：${specialTotal}经验`);
  
  console.log('\n🎯 特殊词汇额外加成：');
  console.log('  情感词汇（开心）: +0.5情感理解经验');
  console.log('  抽象词汇（思考）: +0.3抽象理解经验'); 
  console.log('  逻辑词汇（因为）: +0.2逻辑推理经验');
}

/**
 * 使用指南
 */
export function showUsageGuide(): void {
  console.log('\n📚 === AI理解力系统使用指南 ===');
  
  console.log('\n🚀 1. 系统启动');
  console.log('  在应用初始化时调用：');
  console.log('  import { bootstrapComprehensionSystem } from "./utils/comprehensionSystemBootstrap";');
  console.log('  const result = await bootstrapComprehensionSystem();');
  
  console.log('\n📝 2. 词卡教学');
  console.log('  import { handleWordTeachingActivity } from "./utils/comprehensionSystemManager";');
  console.log('  const words = [{ word: "学习", definition: "...", examples: [...] }];');
  console.log('  const result = await handleWordTeachingActivity(childId, words);');
  
  console.log('\n💬 3. 自由聊天');
  console.log('  import { handleChatActivity } from "./utils/comprehensionSystemManager";');
  console.log('  const result = await handleChatActivity(childId, 10, 8, 7);');
  
  console.log('\n🎯 4. 话题讨论');
  console.log('  import { handleTopicDiscussionActivity } from "./utils/comprehensionSystemManager";');
  console.log('  const result = await handleTopicDiscussionActivity(childId, 20, 9, 8);');
  
  console.log('\n📖 5. 故事阅读');
  console.log('  import { handleStoryReadingActivity } from "./utils/comprehensionSystemManager";');
  console.log('  const result = await handleStoryReadingActivity(childId, "elementary", 15, 8);');
  
  console.log('\n📊 6. 获取状态');
  console.log('  import { getComprehensiveChildStatus } from "./utils/comprehensionSystemManager";');
  console.log('  const status = await getComprehensiveChildStatus(childId);');
  
  console.log('\n🎨 7. 显示界面');
  console.log('  import NewComprehensionDisplay from "./components/NewComprehensionDisplay";');
  console.log('  <NewComprehensionDisplay childId={childId} isVisible={true} onClose={...} />');
  
  console.log('\n🧪 8. 测试系统');
  console.log('  import { runComprehensiveTest } from "./utils/comprehensionSystemBootstrap";');
  console.log('  await runComprehensiveTest(childId);');
}

// =================== 便捷接口 ===================

/**
 * 开发者控制台命令集合
 */
export const ComprehensionDevTools = {
  // 系统管理
  bootstrap: bootstrapComprehensionSystem,
  isReady: isSystemReady,
  getStats: getSystemStats,
  
  // 功能测试
  testWordTeaching: testWordTeachingSystem,
  testChat: testChatSystem,
  testDiscussion: testTopicDiscussionSystem,
  testStoryReading: testStoryReadingSystem,
  runFullTest: runComprehensiveTest,
  
  // 信息工具
  showConfig: showSystemConfiguration,
  showExamples: showExperienceCalculationExamples,
  showGuide: showUsageGuide,
  
  // 快速命令
  quickStart: async () => {
    console.log('🚀 快速启动AI理解力系统...');
    const result = await bootstrapComprehensionSystem();
    if (result.success) {
      showUsageGuide();
      showSystemConfiguration();
    }
    return result;
  }
};

// 将开发者工具挂载到全局对象（仅开发环境）
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).ComprehensionDevTools = ComprehensionDevTools;
  console.log('🔧 理解力系统开发者工具已挂载到 window.ComprehensionDevTools');
}
