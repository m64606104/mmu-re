// 🧪 轨迹系统快速测试
// 用于验证轨迹系统是否正确集成

import { footprintStorage } from './footprintStorage';
import { FootprintActivity, ActivityType } from '../types/footprint';

// 生成测试活动数据
export const generateTestActivities = (conversationId: string): FootprintActivity[] => {
  const now = Date.now();
  const activities: FootprintActivity[] = [];

  // 模拟一天的活动
  const testActivities = [
    {
      time: now - 8 * 60 * 60 * 1000, // 8小时前
      activity: '刚刚起床，准备开始新的一天',
      type: 'thinking' as ActivityType,
      confidence: 0.7
    },
    {
      time: now - 6 * 60 * 60 * 1000, // 6小时前
      activity: '与你聊了很多有趣的话题',
      type: 'chatting' as ActivityType,
      confidence: 0.95,
      duration: 30 * 60 * 1000 // 30分钟
    },
    {
      time: now - 4 * 60 * 60 * 1000, // 4小时前
      activity: '在忙自己的事情',
      type: 'working' as ActivityType,
      confidence: 0.6
    },
    {
      time: now - 2 * 60 * 60 * 1000, // 2小时前
      activity: '在读一本有趣的书',
      type: 'reading' as ActivityType,
      confidence: 0.8
    },
    {
      time: now - 30 * 60 * 1000, // 30分钟前
      activity: '在放松休息',
      type: 'entertainment' as ActivityType,
      confidence: 0.7
    }
  ];

  testActivities.forEach((test, index) => {
    activities.push({
      id: `test_${conversationId}_${index}`,
      conversationId,
      timestamp: test.time,
      duration: test.duration,
      activity: test.activity,
      activityType: test.type,
      status: 'online',
      source: 'system',
      confidence: test.confidence,
      tags: ['测试数据'],
      createdAt: now
    });
  });

  return activities;
};

// 测试轨迹存储和读取
export const testFootprintSystem = async (conversationId: string) => {
  try {
    console.log('🧪 开始轨迹系统测试...');

    // 1. 生成测试数据
    const testActivities = generateTestActivities(conversationId);
    console.log(`📝 生成了 ${testActivities.length} 条测试活动`);

    // 2. 保存到数据库
    await footprintStorage.saveActivities(testActivities);
    console.log('💾 测试数据已保存到 IndexedDB');

    // 3. 读取验证
    const savedActivities = await footprintStorage.getActivities(conversationId);
    console.log(`📖 从数据库读取了 ${savedActivities.length} 条活动`);

    // 4. 筛选测试
    const chatActivities = await footprintStorage.getActivities(conversationId, {
      activityTypes: ['chatting']
    });
    console.log(`💬 筛选出 ${chatActivities.length} 条聊天活动`);

    // 5. 统计信息
    const stats = await footprintStorage.getRecentStats(conversationId, 7);
    console.log(`📊 最近7天统计: ${stats.activities.length} 条活动`);

    console.log('✅ 轨迹系统测试通过！');
    return true;
  } catch (error) {
    console.error('❌ 轨迹系统测试失败:', error);
    return false;
  }
};

// 清理测试数据
export const cleanupTestData = async (conversationId: string) => {
  try {
    const activities = await footprintStorage.getActivities(conversationId);
    // 这里需要实现删除功能，暂时只是日志
    console.log(`🧹 需要清理 ${activities.filter(a => a.tags?.includes('测试数据')).length} 条测试数据`);
  } catch (error) {
    console.error('清理测试数据失败:', error);
  }
};

// 在开发环境下，可以通过浏览器控制台调用测试
if (typeof window !== 'undefined') {
  (window as any).testFootprints = testFootprintSystem;
  (window as any).cleanupFootprints = cleanupTestData;
}
