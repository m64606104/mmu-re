/**
 * 🔄 更新用户称呼引用
 * 修复硬编码"妈妈"的问题，改为使用动态的用户称呼
 */

import { Conversation } from '../types';
import { smartLoad, smartSave } from './storage';

/**
 * 检测AI儿童数据是否还有硬编码的"妈妈"问题
 */
export const checkNeedsUserTitleUpdate = async (): Promise<boolean> => {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    
    // 检查是否有AI儿童的userTitle是硬编码的"妈妈"
    for (const conv of conversations) {
      if (conv.aiChildData) {
        // 如果userTitle为空或者是默认的"妈妈"，需要更新
        if (!conv.aiChildData.userTitle || conv.aiChildData.userTitle === '妈妈') {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('检查用户称呼更新失败:', error);
    return false;
  }
};

/**
 * 更新所有AI儿童的用户称呼设置
 */
export const updateAllUserTitleReferences = async (): Promise<{
  totalAI: number;
  updatedAI: number;
  details: Array<{ name: string; oldTitle: string; newTitle: string }>
}> => {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const details: Array<{ name: string; oldTitle: string; newTitle: string }> = [];
    let updatedCount = 0;
    
    for (const conversation of conversations) {
      if (conversation.aiChildData) {
        const oldTitle = conversation.aiChildData.userTitle || '妈妈';
        
        // 如果是默认的"妈妈"或为空，更新为"家长"
        if (!conversation.aiChildData.userTitle || conversation.aiChildData.userTitle === '妈妈') {
          conversation.aiChildData.userTitle = '家长';
          
          details.push({
            name: conversation.name,
            oldTitle,
            newTitle: '家长'
          });
          
          updatedCount++;
          
          console.log(`✅ ${conversation.name}: 用户称呼从"${oldTitle}"更新为"家长"`);
        }
      }
    }
    
    // 保存更新后的数据
    if (updatedCount > 0) {
      await smartSave('conversations', conversations);
    }
    
    console.log(`🎯 用户称呼更新完成: 总共${conversations.filter(c => c.aiChildData).length}个AI，更新了${updatedCount}个`);
    console.log('💬 现在AI会使用你设置的个性化称呼，而不是固定的"妈妈"！');
    
    return {
      totalAI: conversations.filter(c => c.aiChildData).length,
      updatedAI: updatedCount,
      details
    };
    
  } catch (error) {
    console.error('更新用户称呼失败:', error);
    return {
      totalAI: 0,
      updatedAI: 0,
      details: []
    };
  }
};

/**
 * 获取用户称呼使用情况报告
 */
export const getUserTitleReport = async (): Promise<{
  totalAI: number;
  titleCounts: Map<string, number>;
  needsUpdate: number;
  details: Array<{ name: string; title: string; needsUpdate: boolean }>
}> => {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const titleCounts = new Map<string, number>();
    const details: Array<{ name: string; title: string; needsUpdate: boolean }> = [];
    let needsUpdate = 0;
    
    for (const conversation of conversations) {
      if (conversation.aiChildData) {
        const title = conversation.aiChildData.userTitle || '未设置';
        const needsUpdateFlag = !conversation.aiChildData.userTitle || conversation.aiChildData.userTitle === '妈妈';
        
        titleCounts.set(title, (titleCounts.get(title) || 0) + 1);
        
        if (needsUpdateFlag) {
          needsUpdate++;
        }
        
        details.push({
          name: conversation.name,
          title,
          needsUpdate: needsUpdateFlag
        });
      }
    }
    
    return {
      totalAI: conversations.filter(c => c.aiChildData).length,
      titleCounts,
      needsUpdate,
      details
    };
    
  } catch (error) {
    console.error('获取用户称呼报告失败:', error);
    return {
      totalAI: 0,
      titleCounts: new Map(),
      needsUpdate: 0,
      details: []
    };
  }
};
