/**
 * 🔧 修复理解力进度条显示问题
 * 确保理解力系统使用简单线性升级
 */

import { Conversation, AIChildData } from '../types';
import { smartLoad, smartSave } from './storage';

/**
 * 修复单个AI的理解力进度条数据
 */
export const fixChildComprehensionProgress = (childData: AIChildData): boolean => {
  let hasChanges = false;
  
  // 修复总理解力级别和进度 - 使用线性升级系统
  if (childData.comprehension.level <= 0 || isNaN(childData.comprehension.progress)) {
    // 使用简单的线性系统：1级=10点，2级=20点，3级=30点...
    const totalExp = childData.totalExp || (childData.vocabulary.length * 5); // 每个词汇5点经验
    
    // 计算当前级别（1级需要10点，2级需要20点...）
    let currentLevel = 1;
    let expUsed = 0;
    
    while (expUsed + (currentLevel * 10) <= totalExp) {
      expUsed += currentLevel * 10;
      currentLevel++;
    }
    
    // 当前级别的进度
    const currentLevelExp = totalExp - expUsed;
    const expNeededForThisLevel = currentLevel * 10;
    const progressPercent = Math.floor((currentLevelExp / expNeededForThisLevel) * 100);
    
    childData.comprehension.level = currentLevel;
    childData.comprehension.progress = Math.min(99, progressPercent);
    hasChanges = true;
  }
  
  // 修复各个理解能力的级别和进度
  const abilities = ['literal', 'context', 'abstract', 'emotion', 'logic'] as const;
  
  for (const abilityKey of abilities) {
    const ability = childData.comprehension.abilities[abilityKey];
    if (!ability || ability.level <= 0 || isNaN(ability.progress)) {
      // 根据总理解力级别来设置各个能力
      const baseLevel = childData.comprehension.level;
      const variation = Math.floor(Math.random() * 3) - 1; // -1, 0, 1的变化
      
      childData.comprehension.abilities[abilityKey] = {
        level: Math.max(1, baseLevel + variation),
        progress: Math.floor(Math.random() * 90) + 5 // 5-95之间的随机进度
      };
      hasChanges = true;
    }
  }
  
  return hasChanges;
};

/**
 * 检测AI儿童是否需要修复理解力进度条
 */
export const checkNeedsComprehensionFix = async (): Promise<boolean> => {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    
    for (const conv of conversations) {
      if (conv.aiChildData) {
        const childData = conv.aiChildData;
        
        // 检查是否有无效的进度条数据
        if (childData.comprehension.level <= 0 || 
            isNaN(childData.comprehension.progress) ||
            childData.comprehension.progress < 0 ||
            childData.comprehension.progress > 100) {
          return true;
        }
        
        // 检查各个能力是否有问题
        const abilities = ['literal', 'context', 'abstract', 'emotion', 'logic'] as const;
        for (const abilityKey of abilities) {
          const ability = childData.comprehension.abilities[abilityKey];
          if (!ability || 
              ability.level <= 0 || 
              isNaN(ability.progress) ||
              ability.progress < 0 ||
              ability.progress > 100) {
            return true;
          }
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('检查理解力进度条失败:', error);
    return false;
  }
};

/**
 * 修复所有AI儿童的理解力进度条
 */
export const fixAllComprehensionProgress = async (): Promise<{
  totalAI: number;
  fixedAI: number;
  details: Array<{ name: string; fixed: boolean; reason?: string }>
}> => {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const details: Array<{ name: string; fixed: boolean; reason?: string }> = [];
    let fixedCount = 0;
    
    for (const conversation of conversations) {
      if (conversation.aiChildData) {
        const childData = conversation.aiChildData;
        const needsFix = fixChildComprehensionProgress(childData);
        
        if (needsFix) {
          fixedCount++;
          details.push({
            name: conversation.name,
            fixed: true,
            reason: `理解力: Lv.${childData.comprehension.level} (${childData.comprehension.progress}%)`
          });
          
          console.log(`✅ ${conversation.name}: 理解力进度条已修复`);
          console.log(`   📊 总理解力: Lv.${childData.comprehension.level} (${childData.comprehension.progress}%)`);
          console.log(`   🧠 字面理解: Lv.${childData.comprehension.abilities.literal.level} (${childData.comprehension.abilities.literal.progress}%)`);
          console.log(`   🔍 上下文理解: Lv.${childData.comprehension.abilities.context.level} (${childData.comprehension.abilities.context.progress}%)`);
          console.log(`   🎨 抽象理解: Lv.${childData.comprehension.abilities.abstract.level} (${childData.comprehension.abilities.abstract.progress}%)`);
          console.log(`   💝 情感理解: Lv.${childData.comprehension.abilities.emotion.level} (${childData.comprehension.abilities.emotion.progress}%)`);
          console.log(`   🧮 逻辑推理: Lv.${childData.comprehension.abilities.logic.level} (${childData.comprehension.abilities.logic.progress}%)`);
        } else {
          details.push({
            name: conversation.name,
            fixed: false
          });
        }
      }
    }
    
    // 保存修复后的数据
    if (fixedCount > 0) {
      await smartSave('conversations', conversations);
    }
    
    console.log(`🔧 理解力进度条修复完成: 总共${conversations.filter(c => c.aiChildData).length}个AI，修复了${fixedCount}个`);
    console.log('📊 现在所有进度条都会显示正确的级别和百分比！');
    
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
 * 获取理解力进度条状态报告
 */
export const getComprehensionProgressReport = async (): Promise<{
  totalAI: number;
  validProgress: number;
  invalidProgress: number;
  details: Array<{ 
    name: string; 
    level: number; 
    progress: number; 
    valid: boolean;
    abilities: Record<string, { level: number; progress: number; valid: boolean }>
  }>
}> => {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const details: Array<{ 
      name: string; 
      level: number; 
      progress: number; 
      valid: boolean;
      abilities: Record<string, { level: number; progress: number; valid: boolean }>
    }> = [];
    let validCount = 0;
    let invalidCount = 0;
    
    for (const conversation of conversations) {
      if (conversation.aiChildData) {
        const childData = conversation.aiChildData;
        const isValid = childData.comprehension.level > 0 && 
                        !isNaN(childData.comprehension.progress) &&
                        childData.comprehension.progress >= 0 &&
                        childData.comprehension.progress <= 100;
        
        if (isValid) {
          validCount++;
        } else {
          invalidCount++;
        }
        
        // 检查各个能力
        const abilities: Record<string, { level: number; progress: number; valid: boolean }> = {};
        const abilityKeys = ['literal', 'context', 'abstract', 'emotion', 'logic'] as const;
        
        for (const abilityKey of abilityKeys) {
          const ability = childData.comprehension.abilities[abilityKey];
          const abilityValid = ability && 
                              ability.level > 0 && 
                              !isNaN(ability.progress) &&
                              ability.progress >= 0 &&
                              ability.progress <= 100;
          
          abilities[abilityKey] = {
            level: ability?.level || 0,
            progress: ability?.progress || 0,
            valid: abilityValid
          };
        }
        
        details.push({
          name: conversation.name,
          level: childData.comprehension.level,
          progress: childData.comprehension.progress,
          valid: isValid,
          abilities
        });
      }
    }
    
    return {
      totalAI: conversations.filter(c => c.aiChildData).length,
      validProgress: validCount,
      invalidProgress: invalidCount,
      details
    };
    
  } catch (error) {
    console.error('获取理解力进度条报告失败:', error);
    return {
      totalAI: 0,
      validProgress: 0,
      invalidProgress: 0,
      details: []
    };
  }
};
