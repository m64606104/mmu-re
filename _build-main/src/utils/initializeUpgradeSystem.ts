/**
 * 🔧 升级系统初始化工具
 * 修复现有AI的经验值系统，确保所有AI都使用新的简化升级系统
 */

import { Conversation } from '../types';
import { smartLoad, smartSave } from './storage';
import { initializeExpData } from './simpleUpgradeSystem';

/**
 * 初始化所有现有AI的经验值数据
 */
export const initializeAllAIUpgradeSystem = async (): Promise<{
  totalAI: number;
  updatedAI: number;
  details: Array<{ name: string; oldLevel: number; newLevel: number; oldExp: number; newExp: number }>
}> => {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const details: Array<{ name: string; oldLevel: number; newLevel: number; oldExp: number; newExp: number }> = [];
    let updatedCount = 0;
    
    for (const conversation of conversations) {
      if (conversation.aiChildData) {
        const oldLevel = conversation.aiChildData.level;
        const oldExp = conversation.aiChildData.exp;
        
        // 初始化经验值数据
        initializeExpData(conversation.aiChildData);
        
        details.push({
          name: conversation.name,
          oldLevel,
          newLevel: conversation.aiChildData.level,
          oldExp,
          newExp: conversation.aiChildData.exp
        });
        
        updatedCount++;
        
        console.log(`✅ ${conversation.name}: Level ${oldLevel} (${oldExp} exp) → Level ${conversation.aiChildData.level} (${conversation.aiChildData.exp}/${conversation.aiChildData.expToNextLevel} exp)`);
      }
    }
    
    // 保存更新后的数据
    await smartSave('conversations', conversations);
    
    console.log(`🎯 升级系统初始化完成: 总共${conversations.filter(c => c.aiChildData).length}个AI，更新了${updatedCount}个`);
    
    return {
      totalAI: conversations.filter(c => c.aiChildData).length,
      updatedAI: updatedCount,
      details
    };
    
  } catch (error) {
    console.error('初始化升级系统失败:', error);
    return {
      totalAI: 0,
      updatedAI: 0,
      details: []
    };
  }
};

/**
 * 检查是否需要初始化升级系统
 */
export const checkUpgradeSystemNeedsInit = async (): Promise<boolean> => {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    
    // 检查是否有AI缺少totalExp字段或expToNextLevel不正确
    for (const conversation of conversations) {
      if (conversation.aiChildData) {
        const data = conversation.aiChildData;
        
        // 如果缺少totalExp字段
        if (data.totalExp === undefined) {
          return true;
        }
        
        // 如果expToNextLevel不符合新规则（应该是level*10）
        const expectedExp = data.level * 10;
        if (data.expToNextLevel !== expectedExp) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('检查升级系统失败:', error);
    return false;
  }
};

/**
 * 显示升级系统状态报告
 */
export const getUpgradeSystemReport = async (): Promise<{
  needsInit: boolean;
  totalAI: number;
  aiWithOldSystem: number;
  details: Array<{ name: string; level: number; exp: number; expToNextLevel: number; hasNewSystem: boolean }>
}> => {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const details: Array<{ name: string; level: number; exp: number; expToNextLevel: number; hasNewSystem: boolean }> = [];
    let aiWithOldSystem = 0;
    
    for (const conversation of conversations) {
      if (conversation.aiChildData) {
        const data = conversation.aiChildData;
        const expectedExp = data.level * 10;
        const hasNewSystem = data.totalExp !== undefined && data.expToNextLevel === expectedExp;
        
        if (!hasNewSystem) {
          aiWithOldSystem++;
        }
        
        details.push({
          name: conversation.name,
          level: data.level,
          exp: data.exp,
          expToNextLevel: data.expToNextLevel,
          hasNewSystem
        });
      }
    }
    
    return {
      needsInit: aiWithOldSystem > 0,
      totalAI: conversations.filter(c => c.aiChildData).length,
      aiWithOldSystem,
      details
    };
    
  } catch (error) {
    console.error('获取升级系统报告失败:', error);
    return {
      needsInit: false,
      totalAI: 0,
      aiWithOldSystem: 0,
      details: []
    };
  }
};
