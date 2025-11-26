// 🎯 人物行动轨迹生成服务 - 增量版
// 基于现有数据源（聊天、状态、朋友圈等）智能生成轨迹，支持增量补全

import { FootprintActivity, ActivityType } from '../types/footprint';
import { footprintStorage } from './footprintStorage';

// 增量生成轨迹（主要接口）
export const generateFootprintIncremental = async (conversationId: string): Promise<FootprintActivity[]> => {
  try {
    // 获取最后一条活动的时间
    const lastActivityTime = await getLastActivityTime(conversationId);
    
    // 计算时间范围
    const now = Date.now();
    const startTime = lastActivityTime || getTodayStartTime();
    
    console.log(`🛤️ 增量生成轨迹: ${conversationId}`);
    console.log(`📅 时间范围: ${new Date(startTime).toLocaleString()} → ${new Date(now).toLocaleString()}`);
    
    // 检查是否需要生成（至少间隔10分钟）
    if (now - startTime < 10 * 60 * 1000) {
      console.log('⏸️ 时间间隔太短，暂不生成');
      return [];
    }
    
    // 检查今天已有的活动数量
    const todayActivities = await getTodayActivitiesCount(conversationId);
    const maxActivities = 40; // 硬上限
    const targetRange = { min: 18, max: 30 }; // 软目标
    
    if (todayActivities >= maxActivities) {
      console.log(`🔒 今天活动数已达上限 (${todayActivities}/${maxActivities})`);
      return [];
    }
    
    // 生成新的轨迹活动
    const newActivities = await generateActivitiesForTimeRange(
      conversationId,
      startTime,
      now,
      todayActivities,
      targetRange,
      maxActivities
    );
    
    // 保存到数据库
    if (newActivities.length > 0) {
      await footprintStorage.saveActivities(newActivities);
      console.log(`✅ 生成了 ${newActivities.length} 条新轨迹`);
    }
    
    return newActivities;
  } catch (error) {
    console.error('❌ 增量生成轨迹失败:', error);
    return [];
  }
};

// 获取最后一条活动的时间
async function getLastActivityTime(conversationId: string): Promise<number | null> {
  try {
    const activities = await footprintStorage.getActivities(conversationId);
    if (activities.length === 0) return null;
    
    // 返回最新活动的时间戳
    return Math.max(...activities.map(a => a.timestamp));
  } catch (error) {
    console.error('获取最后活动时间失败:', error);
    return null;
  }
}

// 获取今天开始时间
function getTodayStartTime(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

// 获取今天已有活动数量
async function getTodayActivitiesCount(conversationId: string): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const activities = await footprintStorage.getActivities(conversationId, {
      dateRange: { start: today, end: today }
    });
    return activities.length;
  } catch (error) {
    console.error('获取今日活动数失败:', error);
    return 0;
  }
}

// 为时间范围生成活动
async function generateActivitiesForTimeRange(
  conversationId: string,
  startTime: number,
  endTime: number,
  existingTodayCount: number,
  targetRange: { min: number; max: number },
  maxActivities: number
): Promise<FootprintActivity[]> {
  const activities: FootprintActivity[] = [];
  const timeSpan = endTime - startTime;
  
  // 如果时间跨度太小（小于30分钟），不生成
  if (timeSpan < 30 * 60 * 1000) {
    return activities;
  }
  
  // 计算目标生成数量
  const timeProgress = (new Date().getHours() * 60 + new Date().getMinutes()) / (24 * 60); // 今天的进度 0-1
  const expectedTodayTotal = Math.floor(targetRange.min + (targetRange.max - targetRange.min) * timeProgress);
  const needGenerate = Math.max(0, Math.min(
    expectedTodayTotal - existingTodayCount, // 还需要多少条
    maxActivities - existingTodayCount, // 不超过上限
    Math.floor(timeSpan / (20 * 60 * 1000)) // 大约20分钟一条的自然密度
  ));
  
  if (needGenerate <= 0) {
    return activities;
  }
  
  // 按不固定间隔生成活动
  const intervals = generateNaturalIntervals(startTime, endTime, needGenerate);
  
  for (let i = 0; i < Math.min(needGenerate, intervals.length); i++) {
    const interval = intervals[i];
    const activity = generateSingleActivity(
      conversationId,
      interval.start,
      interval.duration,
      i
    );
    
    if (activity) {
      activities.push(activity);
    }
  }
  
  return activities;
}

// 生成自然间隔（不固定时间）
function generateNaturalIntervals(startTime: number, endTime: number, count: number): Array<{start: number, duration: number}> {
  const intervals: Array<{start: number, duration: number}> = [];
  const totalDuration = endTime - startTime;
  
  if (count <= 0) return intervals;
  
  // 生成不等间隔的时间点
  const timePoints: number[] = [];
  for (let i = 0; i < count; i++) {
    // 加入一些随机性，避免等间隔
    const progress = (i + 0.3 + Math.random() * 0.4) / count;
    timePoints.push(startTime + totalDuration * progress);
  }
  
  // 为每个时间点生成活动
  timePoints.forEach((start, index) => {
    const isLast = index === timePoints.length - 1;
    const nextStart = isLast ? endTime : timePoints[index + 1];
    const maxDuration = nextStart - start;
    
    // 活动持续时间：15分钟到2小时之间，随机但合理
    const minDuration = 15 * 60 * 1000;
    const maxReasonableDuration = Math.min(maxDuration * 0.8, 2 * 60 * 60 * 1000);
    const duration = minDuration + Math.random() * (maxReasonableDuration - minDuration);
    
    intervals.push({ start, duration });
  });
  
  return intervals;
}

// 生成单个活动
function generateSingleActivity(
  conversationId: string,
  startTime: number,
  duration: number,
  index: number
): FootprintActivity | null {
  const hour = new Date(startTime).getHours();
  const isWeekend = new Date(startTime).getDay() === 0 || new Date(startTime).getDay() === 6;
  
  // 根据时间段和背景生成活动
  let activityText: string;
  let activityType: ActivityType;
  let confidence = 0.6; // 默认中等置信度
  
  if (hour >= 0 && hour < 6) {
    // 深夜/凌晨
    activityText = '已经休息了';
    activityType = 'sleeping';
  } else if (hour >= 6 && hour < 9) {
    // 早晨
    const activities = ['准备开始新的一天', '在整理今天的计划', '享受早晨的宁静'];
    activityText = activities[Math.floor(Math.random() * activities.length)];
    activityType = 'thinking';
  } else if (hour >= 9 && hour < 12) {
    // 上午
    if (isWeekend) {
      activityText = '在悠闲地做自己的事';
      activityType = 'entertainment';
    } else {
      activityText = '专注于工作和学习';
      activityType = 'working';
    }
  } else if (hour >= 12 && hour < 14) {
    // 午休时间
    activityText = '在休息，补充一下能量';
    activityType = 'thinking'; // 使用thinking替代resting
  } else if (hour >= 14 && hour < 18) {
    // 下午
    activityText = '继续忙着自己的事情';
    activityType = 'working';
  } else if (hour >= 18 && hour < 22) {
    // 晚上
    const activities = ['在放松休息', '整理一天的想法', '享受安静的时光'];
    activityText = activities[Math.floor(Math.random() * activities.length)];
    activityType = 'entertainment';
  } else {
    // 夜晚
    activityText = '准备结束一天，慢慢放松下来';
    activityType = 'thinking'; // 使用thinking替代resting
  }
  
  return {
    id: `incremental_${conversationId}_${startTime}_${index}`,
    conversationId,
    timestamp: startTime,
    duration: Math.round(duration),
    activity: activityText,
    activityType,
    status: activityType === 'sleeping' ? 'offline' : 'online',
    source: 'system',
    confidence,
    tags: ['自动生成', '日常推测'],
    createdAt: Date.now()
  };
}
