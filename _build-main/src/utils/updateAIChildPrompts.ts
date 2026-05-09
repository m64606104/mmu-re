/**
 * 🔄 更新AI儿童系统提示词
 * 修复机械复读定义的问题，让聊天更自然
 */

import { Conversation } from '../types';
import { smartLoad, smartSave } from './storage';

/**
 * 检测AI儿童是否需要更新系统提示词
 */
export const checkAIChildNeedsPromptUpdate = async (): Promise<boolean> => {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    
    // 检查是否有AI儿童的系统提示词包含旧的机械复读规则
    for (const conv of conversations) {
      if (conv.aiChildData && conv.characterSettings?.systemPrompt) {
        const prompt = conv.characterSettings.systemPrompt;
        
        // 检查是否包含旧的复读规则或缺少角色区分或硬编码"妈妈"
        if (prompt.includes('优先使用"妈妈"教的词汇和定义') || 
            prompt.includes('${w.definition}') ||
            !prompt.includes('不要背书') ||
            !prompt.includes('对话角色认知') ||
            !prompt.includes('绝不要重复或模仿') ||
            prompt.includes('妈妈是在跟你说话') ||
            prompt.includes('问"妈妈"') ||
            prompt.includes('"妈妈"教你') ||
            prompt.includes('妈妈教过的')) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('检查AI儿童提示词失败:', error);
    return false;
  }
};

/**
 * 更新所有AI儿童的系统提示词
 */
export const updateAllAIChildPrompts = async (): Promise<{
  totalAI: number;
  updatedAI: number;
  details: Array<{ name: string; updated: boolean }>
}> => {
  try {
    const conversations = await smartLoad('conversations') as Conversation[] || [];
    const details: Array<{ name: string; updated: boolean }> = [];
    let updatedCount = 0;
    
    for (const conversation of conversations) {
      if (conversation.aiChildData) {
        try {
          // 动态导入构建函数避免循环依赖
          const { buildAIChildSystemPrompt } = await import('./aiKindergartenManager');
          
          // 重新构建系统提示词
          const newPrompt = buildAIChildSystemPrompt(conversation.aiChildData, conversation.name);
          
          // 更新角色设置
          if (!conversation.characterSettings) {
            conversation.characterSettings = {
              nickname: conversation.name,
              systemPrompt: newPrompt,
              personality: '天真可爱、好奇心强的AI儿童',
              languageStyle: '简单自然的儿童用词',
              languageExample: '好开心！我喜欢这个！',
              memoryEvents: '记录学习过的词汇和对话经历'
            };
          } else {
            conversation.characterSettings.systemPrompt = newPrompt;
          }
          
          details.push({
            name: conversation.name,
            updated: true
          });
          
          updatedCount++;
          
          console.log(`✅ ${conversation.name}: 系统提示词已更新，现在聊天会更自然`);
        } catch (error) {
          console.error(`更新${conversation.name}提示词失败:`, error);
          details.push({
            name: conversation.name,
            updated: false
          });
        }
      }
    }
    
    // 保存更新后的数据
    await smartSave('conversations', conversations);
    
    console.log(`🎯 AI儿童提示词更新完成: 总共${conversations.filter(c => c.aiChildData).length}个AI，更新了${updatedCount}个`);
    console.log('💬 现在AI聊天会更自然，不会再机械复读定义了！');
    
    return {
      totalAI: conversations.filter(c => c.aiChildData).length,
      updatedAI: updatedCount,
      details
    };
    
  } catch (error) {
    console.error('更新AI儿童提示词失败:', error);
    return {
      totalAI: 0,
      updatedAI: 0,
      details: []
    };
  }
};
