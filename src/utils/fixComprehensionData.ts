/**
 * 🔧 修复理解力数据显示问题
 * 确保所有AI儿童的理解力数据正确格式化
 */

import { Conversation, Comprehension } from '../types';
import { smartLoad, smartSave } from './storage';

// 旧版本理解力格式（已废弃，仅用于类型参考）
// interface OldComprehensionFormat {
//   level: number;
//   abilities: {
//     literal: number;    // 直接存储0-100数值
//     context: number;    // 直接存储0-100数值  
//     abstract: number;   // 直接存储0-100数值
//     emotion: number;    // 直接存储0-100数值
//     logic: number;      // 直接存储0-100数值
//   };
// }

interface NewAbilityFormat {
  level: number;
  progress: number;
}

/**
 * 检测并修复理解力数据格式
 */
const fixComprehensionFormat = (comprehension: any): Comprehension => {
  // 如果已经是新格式，直接返回
  if (comprehension.abilities && typeof comprehension.abilities.literal === 'object' && 
      comprehension.abilities.literal.level !== undefined) {
    return comprehension as Comprehension;
  }

  // 处理旧格式数据
  const abilities: Record<string, NewAbilityFormat> = {};
  
  if (comprehension.abilities) {
    for (const [key, value] of Object.entries(comprehension.abilities)) {
      if (typeof value === 'number') {
        // 旧格式：直接是0-100的数字
        const level = Math.floor(value as number / 10) + 1;
        const progress = (value as number) % 10 * 10;
        abilities[key] = {
          level: Math.min(Math.max(level, 1), 10),
          progress: Math.min(Math.max(progress, 0), 100)
        };
      } else if (typeof value === 'object' && value !== null) {
        // 已经是对象格式，确保数据合理
        abilities[key] = {
          level: Math.min(Math.max((value as any).level || 1, 1), 10),
          progress: Math.min(Math.max((value as any).progress || 0, 0), 100)
        };
      } else {
        // 默认值
        abilities[key] = { level: 1, progress: 0 };
      }
    }
  } else {
    // 完全没有abilities数据，创建默认值
    const defaultAbilities = ['literal', 'context', 'abstract', 'emotion', 'logic'];
    for (const ability of defaultAbilities) {
      abilities[ability] = { level: 1, progress: 0 };
    }
  }

  // 计算总体等级和进度
  const totalLevels = Object.values(abilities).reduce((sum, ability) => sum + ability.level, 0);
  const avgLevel = Math.floor(totalLevels / Object.keys(abilities).length);
  
  const totalProgress = Object.values(abilities).reduce((sum, ability) => sum + ability.progress, 0);
  const avgProgress = Math.floor(totalProgress / Object.keys(abilities).length);

  return {
    level: Math.max(avgLevel, 1),
    progress: Math.min(avgProgress, 100),
    abilities: abilities as any
  };
};

/**
 * 检查是否需要修复理解力数据
 */
export const checkNeedsComprehensionFix = async (): Promise<boolean> => {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    
    for (const conv of conversations) {
      if (conv.aiChildData?.comprehension) {
        const comp = conv.aiChildData.comprehension;
        
        // 检查是否是旧格式
        if (comp.abilities) {
          const firstAbility = Object.values(comp.abilities)[0];
          if (typeof firstAbility === 'number' || 
              (typeof firstAbility === 'object' && firstAbility.level === undefined)) {
            return true;
          }
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('检查理解力数据格式失败:', error);
    return false;
  }
};

/**
 * 修复所有AI儿童的理解力数据
 */
export const fixAllComprehensionData = async (): Promise<{
  totalAI: number;
  fixedAI: number;
  details: Array<{ name: string; fixed: boolean; oldFormat?: string; newFormat?: string }>;
}> => {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const details: Array<{ name: string; fixed: boolean; oldFormat?: string; newFormat?: string }> = [];
    let fixedCount = 0;
    
    for (const conversation of conversations) {
      if (conversation.aiChildData?.comprehension) {
        const oldComp = conversation.aiChildData.comprehension;
        const oldFormat = JSON.stringify(oldComp.abilities);
        
        // 尝试修复格式
        const fixedComp = fixComprehensionFormat(oldComp);
        const newFormat = JSON.stringify(fixedComp.abilities);
        
        const wasFixed = oldFormat !== newFormat;
        
        if (wasFixed) {
          conversation.aiChildData.comprehension = fixedComp;
          fixedCount++;
          
          console.log(`✅ ${conversation.name}: 理解力数据已修复`);
          console.log(`   旧格式样例: literal = ${JSON.stringify(Object.values(JSON.parse(oldFormat))[0])}`);
          console.log(`   新格式样例: literal = ${JSON.stringify(Object.values(fixedComp.abilities)[0])}`);
        }
        
        details.push({
          name: conversation.name,
          fixed: wasFixed,
          oldFormat: wasFixed ? oldFormat : undefined,
          newFormat: wasFixed ? newFormat : undefined
        });
      }
    }
    
    // 保存修复后的数据
    if (fixedCount > 0) {
      await smartSave('conversations', conversations);
    }
    
    console.log(`🎯 理解力数据修复完成: 总共${conversations.filter(c => c.aiChildData).length}个AI，修复了${fixedCount}个`);
    
    return {
      totalAI: conversations.filter(c => c.aiChildData).length,
      fixedAI: fixedCount,
      details
    };
    
  } catch (error) {
    console.error('修复理解力数据失败:', error);
    return {
      totalAI: 0,
      fixedAI: 0,
      details: []
    };
  }
};

/**
 * 生成理解力数据报告
 */
export const generateComprehensionReport = async (): Promise<{
  totalAI: number;
  validFormat: number;
  invalidFormat: number;
  details: Array<{
    name: string;
    format: 'valid' | 'invalid' | 'missing';
    comprehensionLevel: number;
    abilitiesCount: number;
  }>
}> => {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const details: Array<{
      name: string;
      format: 'valid' | 'invalid' | 'missing';
      comprehensionLevel: number;
      abilitiesCount: number;
    }> = [];
    
    let validCount = 0;
    let invalidCount = 0;
    
    for (const conv of conversations) {
      if (conv.aiChildData) {
        if (!conv.aiChildData.comprehension) {
          details.push({
            name: conv.name,
            format: 'missing',
            comprehensionLevel: 0,
            abilitiesCount: 0
          });
          invalidCount++;
        } else {
          const comp = conv.aiChildData.comprehension;
          const firstAbility = comp.abilities ? Object.values(comp.abilities)[0] : null;
          const isValid = firstAbility && typeof firstAbility === 'object' && 
                         (firstAbility as any).level !== undefined;
          
          details.push({
            name: conv.name,
            format: isValid ? 'valid' : 'invalid',
            comprehensionLevel: comp.level || 0,
            abilitiesCount: comp.abilities ? Object.keys(comp.abilities).length : 0
          });
          
          if (isValid) {
            validCount++;
          } else {
            invalidCount++;
          }
        }
      }
    }
    
    return {
      totalAI: conversations.filter(c => c.aiChildData).length,
      validFormat: validCount,
      invalidFormat: invalidCount,
      details
    };
    
  } catch (error) {
    console.error('生成理解力数据报告失败:', error);
    return {
      totalAI: 0,
      validFormat: 0,
      invalidFormat: 0,
      details: []
    };
  }
};
