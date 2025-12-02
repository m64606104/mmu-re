// 世界书Prompt注入工具
import { Conversation } from '../types';
import { WorldbookItem } from '../types/worldbook';
import { getWorldbookById } from './worldbookStorage';

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

  // 如果未启用世界书挂载，直接返回空
  if (!conversation.worldbookMount?.enabled || !conversation.worldbookMount.selectedIds.length) {
    return sections;
  }

  try {
    // 获取所有已选世界书
    const worldbooks: WorldbookItem[] = [];
    for (const id of conversation.worldbookMount.selectedIds) {
      const wb = await getWorldbookById(id);
      if (wb && wb.type === 'text') { // 只处理text类型
        worldbooks.push(wb);
      }
    }

    if (worldbooks.length === 0) {
      return sections;
    }

    // 按注入位置分组
    const beforeItems = worldbooks.filter(wb => wb.insertion === 'before');
    const middleItems = worldbooks.filter(wb => wb.insertion === 'middle');
    const afterItems = worldbooks.filter(wb => wb.insertion === 'after');

    // 构建prompt文本
    if (beforeItems.length > 0) {
      sections.before = `
===【世界书背景设定】===
以下是背景知识，请在对话中自然地参考这些信息（不要刻意提及"世界书"或"背景设定"）：

${beforeItems.map((wb, index) => `## ${index + 1}. ${wb.title}\n${wb.content}`).join('\n\n')}

重要提示：
- 以上内容为背景知识，优先级低于你的角色设定
- 如与角色设定冲突，以角色设定为准
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

    return sections;
  } catch (error) {
    console.error('Failed to build worldbook prompt:', error);
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
