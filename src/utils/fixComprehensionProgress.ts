/**
 * 🔧 修复理解力进度条显示问题
 * 解决进度条显示"Lv.(%)"而不是具体百分比的问题
 */

import { Conversation } from '../types';
import { smartLoad, smartSave } from './storage';
import { updateComprehension } from './aiKindergartenManager';

/**
 * 检测是否需要修复进度条
 */
export const checkNeedsProgressFix = async (): Promise<boolean> => {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    
    for (const conv of conversations) {
      if (conv.aiChildData) {
        const comprehension = conv.aiChildData.comprehension;
        
        // 检查总理解力进度是否为undefined或NaN
        if (comprehension.progress === undefined || isNaN(comprehension.progress)) {
          return true;
        }
        
        // 检查各项细分能力的进度
        const abilities = comprehension.abilities;
        if (abilities.literal.progress === undefined || isNaN(abilities.literal.progress) ||
            abilities.context.progress === undefined || isNaN(abilities.context.progress) ||
            abilities.abstract.progress === undefined || isNaN(abilities.abstract.progress) ||
            abilities.emotion.progress === undefined || isNaN(abilities.emotion.progress) ||
            abilities.logic.progress === undefined || isNaN(abilities.logic.progress)) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('检查进度条修复需求失败:', error);
    return false;
  }
};

/**
 * 修复所有AI儿童的进度条显示
 */
export const fixAllComprehensionProgress = async (): Promise<{
  totalAI: number;
  fixedAI: number;
  details: Array<{ name: string; fixed: boolean; oldProgress: number; newProgress: number }>
}> => {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const details: Array<{ name: string; fixed: boolean; oldProgress: number; newProgress: number }> = [];
    let fixedCount = 0;
    
    for (const conversation of conversations) {
      if (conversation.aiChildData) {
        const oldProgress = conversation.aiChildData.comprehension.progress;
        
        // 强制重新计算理解力进度
        updateComprehension(conversation.aiChildData);
        
        const newProgress = conversation.aiChildData.comprehension.progress;
        const needsFix = oldProgress !== newProgress || isNaN(oldProgress) || oldProgress === undefined;
        
        if (needsFix) {
          fixedCount++;
        }
        
        details.push({
          name: conversation.name,
          fixed: needsFix,
          oldProgress: oldProgress || 0,
          newProgress: newProgress || 0
        });
        
        console.log(`🔧 ${conversation.name}: 理解力进度 ${oldProgress || 0}% → ${newProgress || 0}%${needsFix ? ' (已修复)' : ' (正常)'}`);
      }
    }
    
    // 保存修复后的数据
    if (fixedCount > 0) {
      await smartSave('conversations', conversations);
    }
    
    console.log(`🎯 理解力进度条修复完成: 总共${conversations.filter(c => c.aiChildData).length}个AI，修复了${fixedCount}个`);
    console.log('📊 现在进度条应该能正确显示百分比了！');
    
    return {
      totalAI: conversations.filter(c => c.aiChildData).length,
      fixedAI: fixedCount,
      details
    };
    
  } catch (error) {
    console.error('修复理解力进度条失败:', error);
    return {
      totalAI: 0,
      fixedAI: 0,
      details: []
    };
  }
};

/**
 * 获取当前所有AI的理解力进度情况
 */
export const getComprehensionProgressReport = async (): Promise<{
  totalAI: number;
  progressData: Array<{
    name: string;
    totalLevel: number;
    totalProgress: number;
    abilities: {
      literal: { level: number; progress: number };
      context: { level: number; progress: number };
      abstract: { level: number; progress: number };
      emotion: { level: number; progress: number };
      logic: { level: number; progress: number };
    };
  }>;
}> => {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const progressData: Array<any> = [];
    
    for (const conversation of conversations) {
      if (conversation.aiChildData) {
        const comprehension = conversation.aiChildData.comprehension;
        
        progressData.push({
          name: conversation.name,
          totalLevel: comprehension.level,
          totalProgress: comprehension.progress,
          abilities: {
            literal: comprehension.abilities.literal,
            context: comprehension.abilities.context,
            abstract: comprehension.abilities.abstract,
            emotion: comprehension.abilities.emotion,
            logic: comprehension.abilities.logic
          }
        });
      }
    }
    
    return {
      totalAI: conversations.filter(c => c.aiChildData).length,
      progressData
    };
    
  } catch (error) {
    console.error('获取理解力进度报告失败:', error);
    return {
      totalAI: 0,
      progressData: []
    };
  }
};

/**
 * 快速测试修复功能
 */
export const testProgressFix = async (): Promise<void> => {
  console.log('🧪 开始测试理解力进度条修复...');
  
  const needsFix = await checkNeedsProgressFix();
  console.log(`需要修复: ${needsFix ? '是' : '否'}`);
  
  if (needsFix) {
    const result = await fixAllComprehensionProgress();
    console.log(`修复结果: ${result.fixedAI}/${result.totalAI} 个AI已修复`);
  }
  
  const report = await getComprehensionProgressReport();
  console.log('当前进度情况:', report);
  
  console.log('🧪 测试完成！');
};
