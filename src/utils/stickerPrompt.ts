// 表情包Prompt构建工具

import { getAllAvailableStickers } from './stickerStorage';

/**
 * 构建表情包使用指南的系统提示
 */
export const buildStickerPrompt = async (characterId?: string): Promise<string> => {
  try {
    const stickers = await getAllAvailableStickers(characterId);
    
    if (stickers.length === 0) {
      return '';
    }

    // 按描述分组，避免重复
    const stickerDescriptions = stickers.map(s => s.description);
    
    const prompt = `
━━━━━━━━━━━━━━━━━━━━━━━━
📦 可用表情包列表
━━━━━━━━━━━━━━━━━━━━━━━━

你可以使用以下表情包来丰富对话表达：

${stickerDescriptions.map((desc, index) => `${index + 1}. ${desc}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━
💡 使用规则
━━━━━━━━━━━━━━━━━━━━━━━━

1. **发送格式**：当你想发送表情包时，使用 \`[表情包:描述]\` 格式
   例如：\`[表情包:小猫疑问]\`

2. **使用时机**：
   - 💬 在适合的场景下自然使用表情包
   - 😊 可以单独发送表情包，也可以配合文字
   - 🎯 根据对话情绪和氛围选择合适的表情包

3. **使用频率**：
   - ⚡ 不要每句话都用表情包
   - 🎨 建议在关键表达、情绪转折或幽默时刻使用
   - 💡 平均5-10句话使用1次左右

4. **描述匹配**：
   - 🔍 根据表情包的描述判断是否适合当前场景
   - 🎯 例如"小猫疑问"适合表达困惑、不理解时使用
   - 💪 例如"加油打气"适合鼓励、支持时使用

5. **示例用法**：
   \`\`\`
   用户：我今天数学考试没考好...
   你：别灰心啦！[表情包:加油打气] 下次肯定能考好的！
   
   用户：你能帮我解释一下这个问题吗？
   你：[表情包:小猫疑问] 你是说这个部分吗？
   
   用户：太感谢你了！
   你：不客气呀~ [表情包:开心微笑]
   \`\`\`

⚠️ 重要：
- 只使用上面列表中的表情包描述
- 不要编造不存在的表情包
- 保持自然，不要过度使用

━━━━━━━━━━━━━━━━━━━━━━━━
`;

    return prompt;
  } catch (error) {
    console.error('Failed to build sticker prompt:', error);
    return '';
  }
};
