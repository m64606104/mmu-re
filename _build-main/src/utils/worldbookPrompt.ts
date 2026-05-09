// 世界书Prompt注入工具
import { Conversation } from '../types';
import { WorldbookItem } from '../types/worldbook';
import { getAllWorldbooks } from './worldbookStorage';

interface WorldbookPromptSections {
  before: string; // 角色设定之前
  middle: string; // 角色设定与历史消息之间
  after: string;  // 历史消息之后
}

/**
 * 构建世界书prompt内容
 * @param conversation 会话对象
 * @returns 按注入位置分组的世界书内容
 */
export const buildWorldbookPrompt = async (conversation: Conversation): Promise<WorldbookPromptSections> => {
  const sections: WorldbookPromptSections = {
    before: '',
    middle: '',
    after: ''
  };

  try {
    console.log('📚 [世界书加载] ==================== 开始 ====================');
    console.log('📚 [世界书加载] 对话ID:', conversation.id);
    console.log('📚 [世界书加载] 对话名称:', conversation.name);
    
    // 获取所有世界书（用于自动应用全局 + 按挂载配置应用局部）
    const allWorldbooks = await getAllWorldbooks();
    if (!allWorldbooks || allWorldbooks.length === 0) {
      console.log('📚 [世界书加载] ❌ 没有任何世界书');
      return sections;
    }

    console.log('📚 [世界书加载] 📖 总世界书数量:', allWorldbooks.length);
    console.log('📚 [世界书加载] 世界书列表:', allWorldbooks.map(wb => `${wb.title}(${wb.scope})`).join(', '));

    // 1) 全局世界书：scope = 'global'，自动应用到所有会话
    const globalWorldbooks = allWorldbooks.filter(wb => wb.scope === 'global');
    console.log('📚 [世界书加载] 🌍 全局世界书数量:', globalWorldbooks.length);
    if (globalWorldbooks.length > 0) {
      console.log('📚 [世界书加载] 全局世界书:', globalWorldbooks.map(wb => wb.title).join(', '));
    }

    // 2) 局部世界书：scope = 'local'，仅按当前会话的挂载配置启用
    let localWorldbooks: WorldbookItem[] = [];
    const mountConfig = conversation.worldbookMount;
    
    console.log('📚 [世界书加载] 🔧 挂载配置:', mountConfig);
    
    // 严格检查：必须同时满足 enabled=true 且 selectedIds非空
    const hasMountConfig = mountConfig?.enabled === true && Array.isArray(mountConfig.selectedIds) && mountConfig.selectedIds.length > 0;
    
    if (hasMountConfig) {
      const selectedIdsSet = new Set(mountConfig.selectedIds);
      console.log('📚 [世界书加载] 📌 已选择的世界书ID:', Array.from(selectedIdsSet));
      
      // 只加载明确挂载的局部世界书
      localWorldbooks = allWorldbooks.filter(wb => {
        const isLocal = wb.scope === 'local';
        const isSelected = selectedIdsSet.has(wb.id);
        const shouldLoad = isLocal && isSelected;
        
        if (isLocal) {
          console.log(`📚 [世界书加载]   - ${wb.title}: ${isSelected ? '✅ 已挂载' : '❌ 未挂载'}`);
        }
        
        return shouldLoad;
      });
      
      console.log('📚 [世界书加载] 🏠 局部世界书数量:', localWorldbooks.length);
      if (localWorldbooks.length > 0) {
        console.log('📚 [世界书加载] 局部世界书:', localWorldbooks.map(wb => wb.title).join(', '));
      }
    } else {
      console.log('📚 [世界书加载] ⚠️ 未启用挂载或未选择任何局部世界书');
      
      // 列出所有未挂载的局部世界书
      const allLocalWorldbooks = allWorldbooks.filter(wb => wb.scope === 'local');
      if (allLocalWorldbooks.length > 0) {
        console.log('📚 [世界书加载] 🔒 存在但未挂载的局部世界书:', allLocalWorldbooks.map(wb => wb.title).join(', '));
      }
    }

    // 合并全局 + 局部，并按id去重
    const worldbookMap = new Map<string, WorldbookItem>();
    for (const wb of globalWorldbooks) {
      worldbookMap.set(wb.id, wb);
    }
    for (const wb of localWorldbooks) {
      worldbookMap.set(wb.id, wb);
    }

    const worldbooks = Array.from(worldbookMap.values());

    console.log('📚 [世界书加载] ✅ 最终加载的世界书数量:', worldbooks.length);
    if (worldbooks.length > 0) {
      console.log('📚 [世界书加载] 最终世界书列表:', worldbooks.map(wb => `${wb.title}(${wb.scope})`).join(', '));
    }

    if (worldbooks.length === 0) {
      console.log('📚 [世界书加载] ❌ 没有可加载的世界书');
      console.log('📚 [世界书加载] ==================== 结束 ====================');
      return sections;
    }

    // 按注入位置分组
    const beforeItems = worldbooks.filter(wb => wb.insertion === 'before');
    const middleItems = worldbooks.filter(wb => wb.insertion === 'middle');
    const afterItems = worldbooks.filter(wb => wb.insertion === 'after');

    // 构建prompt文本（将世界书视为“设定”，与角色设定同等重要）
    if (beforeItems.length > 0) {
      sections.before = `
===【世界书设定】===
以下是与你的角色设定同等重要的“世界书设定”，请在对话中严格遵守，并在行为和用语中自然体现（不要刻意提及"世界书"或"设定"这些词）：

${beforeItems.map((wb, index) => `## ${index + 1}. ${wb.title}\n${wb.content}`).join('\n\n')}

重要提示：
- 这些世界书条目与角色设定一起构成你的世界观和行为边界
- 避免与这些设定明显自相矛盾，如有出入要用自然方式统一（例如解释为角色成长/改变，而不是直接否认）
- 自然融入对话，不要刻意提及来源
===========================
`;
    }

    if (middleItems.length > 0) {
      sections.middle = `
===【世界书补充信息】===
${middleItems.map((wb, index) => `## ${index + 1}. ${wb.title}\n${wb.content}`).join('\n\n')}
===========================
`;
    }

    if (afterItems.length > 0) {
      sections.after = `
===【世界书参考资料】===
${afterItems.map((wb, index) => `## ${index + 1}. ${wb.title}\n${wb.content}`).join('\n\n')}
===========================
`;
    }

    console.log('📚 [世界书加载] 📍 注入位置统计:');
    console.log('📚 [世界书加载]   - before (角色设定前):', beforeItems.length, '个');
    console.log('📚 [世界书加载]   - middle (角色设定后):', middleItems.length, '个');
    console.log('📚 [世界书加载]   - after (历史消息后):', afterItems.length, '个');
    console.log('📚 [世界书加载] ==================== 结束 ====================');

    return sections;
  } catch (error) {
    console.error('📚 [世界书加载] ❌ 发生错误:', error);
    console.log('📚 [世界书加载] ==================== 结束（错误） ====================');
    return sections;
  }
};

/**
 * 将世界书内容注入到完整prompt中
 * @param systemPrompt 原始系统prompt（角色设定）
 * @param historyPrompt 历史消息prompt
 * @param worldbookSections 世界书内容分段
 * @returns 注入世界书后的完整prompt
 */
export const injectWorldbookToPrompt = (
  systemPrompt: string,
  historyPrompt: string,
  worldbookSections: WorldbookPromptSections
): { systemPrompt: string; historyPrompt: string } => {
  // before: 在系统prompt之前
  const newSystemPrompt = worldbookSections.before 
    ? `${worldbookSections.before}\n${systemPrompt}` 
    : systemPrompt;

  // middle: 在系统prompt和历史消息之间
  const middleSection = worldbookSections.middle || '';

  // after: 在历史消息之后
  const newHistoryPrompt = worldbookSections.after
    ? `${historyPrompt}\n${worldbookSections.after}`
    : historyPrompt;

  return {
    systemPrompt: middleSection 
      ? `${newSystemPrompt}\n${middleSection}` 
      : newSystemPrompt,
    historyPrompt: newHistoryPrompt
  };
};
