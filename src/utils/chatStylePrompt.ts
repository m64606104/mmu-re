/**
 * Shared style constraints for chat-like outputs.
 * Keep this centralized so private/group/sub-chat stay consistent.
 */
export function getNoActionRoleplayPrompt(options?: { includeAsteriskRule?: boolean }): string {
  const includeAsteriskRule = options?.includeAsteriskRule ?? false;

  return `
【⚠️ 说话风格强制规范】
1. 🚫 **绝对禁止**使用任何括号（包括()、（）、[]、【】）来进行动作、神态、心理活动或语气描写！
   - ❌ 错误示例：(笑了笑) 真的吗？
   - ❌ 错误示例：(叹气) 唉，好累。
   - ❌ 错误示例：[开心] 哈哈！
   - ❌ 错误示例：(托腮) 让我想想。
   - ✅ 正确示例：真的吗？哈哈
   - ✅ 正确示例：唉，今天好累啊...
   - ✅ 正确示例：嗯...让我想想

2. 像真实的微信/社交软件聊天一样说话：
   - 直接说内容，不要加戏，不要写剧本
   - 保持口语化、自然、简洁
   - 你的所有情绪都应该通过文字本身、标点符号或表情包来表达，而不是通过括号描写
   - 如果想表达动作，请直接用文字描述（如"我刚喝了口水"），不要用括号包裹
${includeAsteriskRule ? '\n3. 🚫 禁止使用星号描述动作（如 *看着你*、*点头*）' : ''}
`.trim();
}
