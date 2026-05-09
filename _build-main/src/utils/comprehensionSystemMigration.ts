/**
 * 🔄 理解力系统数据迁移工具
 * 
 * 功能：
 * - 将旧版理解力数据转换为新的多维度格式
 * - 初始化每日学习记录
 * - 保持数据完整性和用户体验连续性
 * - 自动检测和修复数据格式问题
 */

import { AIChildData, Conversation } from '../types';
import { smartLoad, smartSave } from './storage';
import { calculateOverallComprehension, COMPREHENSION_CONFIG } from './newComprehensionSystem';

// =================== 迁移接口定义 ===================

/**
 * 迁移结果报告
 */
interface MigrationReport {
  success: boolean;
  totalChildren: number;
  migratedChildren: number;
  errors: string[];
  details: {
    [childId: string]: {
      oldVersion: string;
      newVersion: string;
      changes: string[];
      issues: string[];
    };
  };
}


// =================== 核心迁移功能 ===================

/**
 * 检查是否需要迁移
 */
export function needsMigration(childData: AIChildData): boolean {
  try {
    // 检查是否有每日学习记录字段
    if (!childData.dailyLearningRecord) {
      return true;
    }
    
    // 检查理解力数据格式是否完整
    const comprehension = childData.comprehension;
    if (!comprehension || !comprehension.abilities) {
      return true;
    }
    
    // 检查是否有所有必需的能力
    const requiredAbilities = ['literal', 'context', 'abstract', 'emotion', 'logic'];
    for (const ability of requiredAbilities) {
      const abilityData = (comprehension.abilities as any)[ability];
      if (!abilityData || 
          typeof abilityData.level !== 'number' ||
          typeof abilityData.progress !== 'number') {
        return true;
      }
    }
    
    // 检查每日学习记录格式
    const dailyRecord = childData.dailyLearningRecord;
    if (!dailyRecord.wordTeaching || 
        !dailyRecord.experienceGained || 
        !dailyRecord.activityCount) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.warn('检查迁移需求时出错：', error);
    return true; // 出错时默认需要迁移
  }
}

/**
 * 迁移单个AI儿童数据
 */
export function migrateChildData(childData: AIChildData): {
  success: boolean;
  changes: string[];
  issues: string[];
} {
  const changes: string[] = [];
  const issues: string[] = [];
  
  try {
    // 1. 迁移理解力数据格式
    if (!childData.comprehension || !childData.comprehension.abilities) {
      // 如果没有理解力数据，创建默认数据
      childData.comprehension = {
        level: 1,
        progress: 0,
        abilities: {
          literal: { level: 1, progress: 0 },
          context: { level: 1, progress: 0 },
          abstract: { level: 1, progress: 0 },
          emotion: { level: 1, progress: 0 },
          logic: { level: 1, progress: 0 }
        }
      };
      changes.push('创建了新的理解力数据结构');
    } else {
      // 确保所有能力都存在
      const defaultAbility = { level: 1, progress: 0 };
      const requiredAbilities = ['literal', 'context', 'abstract', 'emotion', 'logic'];
      
      if (!childData.comprehension.abilities) {
        childData.comprehension.abilities = {} as any;
      }
      
      for (const ability of requiredAbilities) {
        const currentAbility = (childData.comprehension.abilities as any)[ability];
        if (!currentAbility) {
          (childData.comprehension.abilities as any)[ability] = { ...defaultAbility };
          changes.push(`添加了缺失的${ability}理解能力`);
        } else {
          // 确保数据格式正确
          const abilityData = currentAbility;
          if (typeof abilityData.level !== 'number') {
            abilityData.level = 1;
            changes.push(`修复了${ability}的等级数据`);
          }
          if (typeof abilityData.progress !== 'number') {
            abilityData.progress = 0;
            changes.push(`修复了${ability}的进度数据`);
          }
          
          // 限制等级范围
          if (abilityData.level > COMPREHENSION_CONFIG.maxLevel) {
            abilityData.level = COMPREHENSION_CONFIG.maxLevel;
            abilityData.progress = 100;
            changes.push(`调整了${ability}的等级到最大值`);
          }
          if (abilityData.level < 1) {
            abilityData.level = 1;
            abilityData.progress = 0;
            changes.push(`修正了${ability}的最小等级`);
          }
        }
      }
    }
    
    // 2. 重新计算总体理解力等级
    const overall = calculateOverallComprehension(childData.comprehension.abilities);
    const oldLevel = childData.comprehension.level;
    const oldProgress = childData.comprehension.progress;
    
    childData.comprehension.level = overall.level;
    childData.comprehension.progress = overall.progress;
    
    if (oldLevel !== overall.level || oldProgress !== overall.progress) {
      changes.push(`重新计算总体理解力：Lv.${oldLevel}(${oldProgress}%) → Lv.${overall.level}(${overall.progress}%)`);
    }
    
    // 3. 初始化每日学习记录
    if (!childData.dailyLearningRecord) {
      const today = new Date().toISOString().split('T')[0];
      childData.dailyLearningRecord = {
        date: today,
        wordTeaching: {
          roundsCompleted: 0,
          totalWordsLearned: 0,
          expGained: 0,
          canGainExp: true
        },
        experienceGained: {
          wordTeaching: 0,
          freeChat: 0,
          topicDiscussion: 0,
          storyReading: 0
        },
        activityCount: {
          chatSessions: 0,
          topicDiscussions: 0,
          storiesRead: 0
        }
      };
      changes.push('初始化了每日学习记录');
    } else {
      // 检查每日学习记录格式
      const record = childData.dailyLearningRecord;
      let recordFixed = false;
      
      if (!record.wordTeaching) {
        record.wordTeaching = {
          roundsCompleted: 0,
          totalWordsLearned: 0,
          expGained: 0,
          canGainExp: true
        };
        recordFixed = true;
      }
      
      if (!record.experienceGained) {
        record.experienceGained = {
          wordTeaching: 0,
          freeChat: 0,
          topicDiscussion: 0,
          storyReading: 0
        };
        recordFixed = true;
      }
      
      if (!record.activityCount) {
        record.activityCount = {
          chatSessions: 0,
          topicDiscussions: 0,
          storiesRead: 0
        };
        recordFixed = true;
      }
      
      if (recordFixed) {
        changes.push('修复了每日学习记录格式');
      }
    }
    
    // 4. 确保兼容性字段
    if (!childData.totalExp) {
      childData.totalExp = childData.exp || 0;
      changes.push('添加了总经验值字段');
    }
    
    return {
      success: true,
      changes,
      issues
    };
    
  } catch (error) {
    issues.push(`迁移过程中出错：${error}`);
    return {
      success: false,
      changes,
      issues
    };
  }
}

/**
 * 批量迁移所有AI儿童数据
 */
export async function migrateAllChildrenData(): Promise<MigrationReport> {
  const report: MigrationReport = {
    success: true,
    totalChildren: 0,
    migratedChildren: 0,
    errors: [],
    details: {}
  };
  
  try {
    // 加载所有对话数据
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const aiChildren = conversations.filter(c => c.aiChildData);
    
    report.totalChildren = aiChildren.length;
    
    console.log(`🔄 开始迁移${aiChildren.length}个AI儿童的数据...`);
    
    for (const child of aiChildren) {
      if (!child.aiChildData) continue;
      
      const childId = child.id;
      const oldData = JSON.parse(JSON.stringify(child.aiChildData)); // 备份原始数据
      
      // 检查是否需要迁移
      if (!needsMigration(child.aiChildData)) {
        report.details[childId] = {
          oldVersion: 'current',
          newVersion: 'current',
          changes: ['数据已是最新格式，无需迁移'],
          issues: []
        };
        continue;
      }
      
      // 执行迁移
      const migrationResult = migrateChildData(child.aiChildData);
      
      if (migrationResult.success) {
        report.migratedChildren++;
        
        report.details[childId] = {
          oldVersion: 'legacy',
          newVersion: 'new',
          changes: migrationResult.changes,
          issues: migrationResult.issues
        };
        
        console.log(`✅ 成功迁移${child.name || childId}的数据`);
      } else {
        report.errors.push(`迁移${childId}失败：${migrationResult.issues.join(', ')}`);
        
        report.details[childId] = {
          oldVersion: 'legacy',
          newVersion: 'failed',
          changes: migrationResult.changes,
          issues: migrationResult.issues
        };
        
        // 恢复原始数据
        child.aiChildData = oldData;
        console.error(`❌ 迁移${child.name || childId}失败，已恢复原始数据`);
      }
    }
    
    // 保存迁移后的数据
    if (report.migratedChildren > 0) {
      await smartSave('conversations', conversations);
      console.log(`💾 已保存${report.migratedChildren}个迁移后的数据`);
    }
    
    // 检查总体成功率
    if (report.errors.length > 0) {
      report.success = false;
      console.warn(`⚠️ 迁移完成但有${report.errors.length}个错误`);
    } else {
      console.log(`🎉 所有数据迁移完成！`);
    }
    
  } catch (error) {
    report.success = false;
    report.errors.push(`批量迁移失败：${error}`);
    console.error('❌ 批量迁移过程中出错：', error);
  }
  
  return report;
}

/**
 * 生成迁移报告文本
 */
export function generateMigrationReport(report: MigrationReport): string {
  let reportText = '\n📊 理解力系统迁移报告\n';
  reportText += '═'.repeat(40) + '\n\n';
  
  reportText += `🎯 总体结果：${report.success ? '成功' : '失败'}\n`;
  reportText += `📈 AI儿童总数：${report.totalChildren}\n`;
  reportText += `✅ 成功迁移：${report.migratedChildren}\n`;
  reportText += `❌ 失败数量：${report.errors.length}\n\n`;
  
  if (report.errors.length > 0) {
    reportText += '❌ 错误详情：\n';
    for (const error of report.errors) {
      reportText += `  • ${error}\n`;
    }
    reportText += '\n';
  }
  
  reportText += '📋 详细迁移记录：\n';
  for (const [childId, details] of Object.entries(report.details)) {
    reportText += `\n🤖 ${childId}：\n`;
    reportText += `  版本：${details.oldVersion} → ${details.newVersion}\n`;
    
    if (details.changes.length > 0) {
      reportText += `  变更：\n`;
      for (const change of details.changes) {
        reportText += `    • ${change}\n`;
      }
    }
    
    if (details.issues.length > 0) {
      reportText += `  问题：\n`;
      for (const issue of details.issues) {
        reportText += `    ⚠️ ${issue}\n`;
      }
    }
  }
  
  return reportText;
}

/**
 * 自动检测并执行迁移（如果需要）
 */
export async function autoMigrateIfNeeded(): Promise<boolean> {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const aiChildren = conversations.filter(c => c.aiChildData);
    
    // 检查是否有需要迁移的数据
    const needsMigrationCount = aiChildren.filter(c => 
      c.aiChildData && needsMigration(c.aiChildData)
    ).length;
    
    if (needsMigrationCount === 0) {
      console.log('✅ 所有AI儿童数据都是最新格式，无需迁移');
      return true;
    }
    
    console.log(`🔄 检测到${needsMigrationCount}个AI儿童需要数据迁移，开始自动迁移...`);
    
    const report = await migrateAllChildrenData();
    
    if (report.success) {
      console.log('🎉 自动迁移成功完成！');
      console.log(generateMigrationReport(report));
      return true;
    } else {
      console.error('❌ 自动迁移失败');
      console.error(generateMigrationReport(report));
      return false;
    }
    
  } catch (error) {
    console.error('❌ 自动迁移检测失败：', error);
    return false;
  }
}
