/**
 * 数据修复服务 - 自动修复存储系统中的数据问题
 */

import { save, load } from './storage';

/**
 * 修复主题数据异常
 */
export const repairThemeData = (): void => {
  try {
    const themeData = localStorage.getItem('theme');
    
    if (themeData && themeData.length > 1000) {
      console.log('🎨 检测到主题数据异常，正在自动修复...');
      
      try {
        const parsed = JSON.parse(themeData);
        if (typeof parsed === 'string') {
          localStorage.setItem('theme', JSON.stringify(parsed));
          console.log('✅ 主题数据已修复');
        } else {
          localStorage.setItem('theme', JSON.stringify('light'));
          console.log('✅ 已设置默认主题');
        }
      } catch {
        localStorage.setItem('theme', JSON.stringify('light'));
        console.log('✅ 已设置默认主题（数据损坏）');
      }
    }
  } catch (error) {
    console.error('❌ 主题修复失败:', error);
  }
};

/**
 * 修复记忆库数据结构
 */
export const repairMemoryBankData = async (): Promise<void> => {
  try {
    console.log('🧠 开始自动修复记忆库数据...');
    
    const memoryBanks = await load('chat_memory_banks');
    
    if (!memoryBanks || !Array.isArray(memoryBanks)) {
      console.log('✅ 记忆库数据正常或为空');
      return;
    }
    
    const conversationMap = new Map();
    let repairCount = 0;
    
    // 合并和清理数据
    memoryBanks.forEach((bank: any) => {
      const conversationId = bank.conversationId || bank.contactId;
      
      if (conversationId && conversationId !== 'undefined') {
        if (conversationMap.has(conversationId)) {
          const existing = conversationMap.get(conversationId);
          const currentMemoriesCount = bank.memories?.length || 0;
          const existingMemoriesCount = existing.memories?.length || 0;
          
          if (currentMemoriesCount > existingMemoriesCount) {
            conversationMap.set(conversationId, {
              conversationId,
              memories: bank.memories || [],
              lastSummaryMessageCount: Math.max(bank.lastSummaryMessageCount || 0, existing.lastSummaryMessageCount || 0),
              totalMessagesSinceLastSummary: bank.totalMessagesSinceLastSummary || existing.totalMessagesSinceLastSummary || 0,
              settings: bank.settings || existing.settings || {
                maxMemories: 100,
                autoSummaryInterval: 25,
                enableAutoSummary: true
              }
            });
            repairCount++;
          }
        } else {
          conversationMap.set(conversationId, {
            conversationId,
            memories: bank.memories || [],
            lastSummaryMessageCount: bank.lastSummaryMessageCount || 0,
            totalMessagesSinceLastSummary: bank.totalMessagesSinceLastSummary || 0,
            settings: bank.settings || {
              maxMemories: 100,
              autoSummaryInterval: 25,
              enableAutoSummary: true
            }
          });
        }
      }
    });
    
    // 只保留有效记录
    const cleanedBanks = Array.from(conversationMap.values()).filter(bank => {
      const hasMemories = bank.memories && bank.memories.length > 0;
      const hasValidId = bank.conversationId && bank.conversationId !== 'undefined';
      return hasValidId && (hasMemories || bank.lastSummaryMessageCount > 0);
    });
    
    // 如果有修复，则保存
    if (repairCount > 0 || cleanedBanks.length !== memoryBanks.length) {
      await save('chat_memory_banks', cleanedBanks);
      console.log(`✅ 记忆库已自动修复: ${memoryBanks.length} → ${cleanedBanks.length} 条记录`);
    } else {
      console.log('✅ 记忆库数据无需修复');
    }
    
  } catch (error) {
    console.error('❌ 记忆库修复失败:', error);
  }
};

/**
 * 清理废弃的localStorage数据
 */
export const cleanupDeprecatedData = (): void => {
  try {
    console.log('🧹 清理废弃数据...');
    
    // 需要清理的键名模式
    const deprecatedPatterns = [
      'ai_behavior_timeline_',
      'activity_counter_'
    ];
    
    const keysToClean = Object.keys(localStorage).filter(key => 
      deprecatedPatterns.some(pattern => key.startsWith(pattern))
    );
    
    if (keysToClean.length > 0) {
      keysToClean.forEach(key => localStorage.removeItem(key));
      console.log(`✅ 已清理 ${keysToClean.length} 个废弃数据`);
    } else {
      console.log('✅ 无废弃数据需要清理');
    }
  } catch (error) {
    console.error('❌ 数据清理失败:', error);
  }
};

/**
 * 继续数据迁移（处理遗漏的数据）
 */
export const completeMigration = async (): Promise<void> => {
  try {
    console.log('📦 检查遗漏的数据迁移...');
    
    const itemsToMigrate = [
      'document_library',
      'character_relationships_v2'
    ];
    
    let migratedCount = 0;
    
    for (const key of itemsToMigrate) {
      const localData = localStorage.getItem(key);
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          await save(key, parsed);
          localStorage.removeItem(key);
          migratedCount++;
          console.log(`✅ 迁移完成: ${key}`);
        } catch (error) {
          console.error(`❌ ${key} 迁移失败:`, error);
        }
      }
    }
    
    // 处理moments数据
    const localMoments = localStorage.getItem('moments');
    if (localMoments) {
      try {
        const localParsed = JSON.parse(localMoments);
        const indexedMoments = await load('moments');
        
        if (!indexedMoments || JSON.stringify(localParsed).length > JSON.stringify(indexedMoments).length) {
          await save('moments', localParsed);
          console.log('✅ 更新moments到IndexedDB');
        }
        
        localStorage.removeItem('moments');
        migratedCount++;
      } catch (error) {
        console.error('❌ moments迁移失败:', error);
      }
    }
    
    if (migratedCount > 0) {
      console.log(`✅ 补充迁移完成: ${migratedCount} 项`);
    } else {
      console.log('✅ 数据迁移已完成，无遗漏项');
    }
    
  } catch (error) {
    console.error('❌ 补充迁移失败:', error);
  }
};

/**
 * 自动数据修复服务 - 一键修复所有问题
 */
export const autoRepairData = async (): Promise<void> => {
  console.log('🔧 启动自动数据修复服务...');
  
  // 1. 修复主题
  repairThemeData();
  
  // 2. 修复记忆库
  await repairMemoryBankData();
  
  // 3. 继续数据迁移
  await completeMigration();
  
  // 4. 清理废弃数据
  cleanupDeprecatedData();
  
  console.log('🎉 自动数据修复完成！');
};
