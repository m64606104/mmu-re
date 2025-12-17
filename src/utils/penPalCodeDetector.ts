/**
 * 笔友码请求检测器
 * 检测用户是否在信件中请求笔友码/联系方式
 */

/**
 * 检测用户是否在请求笔友码
 */
export function detectPenPalCodeRequest(userMessage: string): boolean {
  const keywords = [
    '笔友码',
    '好友码',
    '联系方式',
    '微信',
    '加你',
    '加个',
    '进一步交流',
    '深入交流',
    '成为好友',
    '交换联系',
    '私聊',
    '聊得更多',
    '经常联系',
    '保持联系',
    '长期联系',
  ];

  const lowerMessage = userMessage.toLowerCase();
  
  return keywords.some(keyword => 
    lowerMessage.includes(keyword.toLowerCase())
  );
}

/**
 * 生成AI判断笔友码请求的系统提示
 */
export function generatePenPalCodeJudgmentPrompt(
  userMessage: string,
  currentRound: number,
  conversationHistory: string
): string {
  return `
【特殊任务：判断是否给出笔友码】

用户在信中提到了想要获取你的联系方式或笔友码。你需要根据以下因素判断是否给出：

1. **交流深度**：当前是第${currentRound}轮交流
   - 1-2轮：关系还不够深，可以委婉拒绝
   - 3-4轮：可以考虑，但要看聊天质量
   - 5轮以上：关系已经比较熟了，可以给

2. **聊天质量**：
   - 是否有深入的话题交流？
   - 是否有情感共鸣？
   - 是否只是简单寒暄？

3. **用户态度**：
   - 是否真诚？
   - 是否尊重你？
   - 是否只是随便问问？

**如果决定给出笔友码**，请在回信中包含以下特殊标记（必须完全一致）：
\`\`\`
[GIVE_PENPAL_CODE]
\`\`\`

然后用自然的语言告诉用户你愿意给他笔友码，比如：
"我们聊得很开心，我愿意和你成为更好的朋友。这是我的笔友码：[GIVE_PENPAL_CODE]，你可以用它在私聊软件中添加我。"

**如果决定拒绝**，请委婉地表达，比如：
- "我们才刚认识不久，要不再多聊聊？"
- "我觉得我们可以先通过信件多了解一下彼此。"
- "笔友码是很私密的东西，我想等我们更熟悉一些再说。"

用户的信件内容：
${userMessage}

之前的交流记录摘要：
${conversationHistory}

请自然地回复这封信，并根据你的判断决定是否给出笔友码。
`;
}

/**
 * 检测AI回复中是否包含笔友码给出标记
 */
export function detectPenPalCodeGiven(aiReply: string): boolean {
  return aiReply.includes('[GIVE_PENPAL_CODE]');
}

/**
 * 从AI回复中移除笔友码标记，替换为实际的笔友码
 */
export function replacePenPalCodeMarker(aiReply: string, actualCode: string): string {
  return aiReply.replace(/\[GIVE_PENPAL_CODE\]/g, actualCode);
}

/**
 * 生成对话历史摘要（用于AI判断）
 */
export function generateConversationSummary(
  conversationRounds: Array<{
    userLetter: { content: string };
    aiReply?: { content: string };
  }>
): string {
  const summary = conversationRounds.slice(0, 3).map((round, index) => {
    const userPreview = round.userLetter.content.substring(0, 50);
    const aiPreview = round.aiReply?.content.substring(0, 50) || '未回复';
    return `第${index + 1}轮：用户说"${userPreview}..."，我回复"${aiPreview}..."`;
  }).join('\n');

  return summary || '这是第一次交流';
}
