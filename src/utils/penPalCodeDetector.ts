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

⚠️ **重要**：用户在信中提到了想要获取你的联系方式或笔友码，但这**不是**信件的全部内容！

📮 **你必须做到**：
1. **完整回复信件的所有内容**：用户可能还说了其他事情、分享了生活、提出了问题等
2. **自然融入笔友码话题**：不要只回复笔友码相关内容，要把它自然地融入整封回信中
3. **保持信件的完整性**：这是一封完整的信，不是只为了要笔友码

---

**关于是否给出笔友码的判断**：

当前是第${currentRound}轮交流，你需要根据以下因素判断：

1. **交流深度**：
   - 1-2轮：关系还不够深，委婉拒绝
   - 3-4轮：可以考虑，看聊天质量
   - 5轮以上：关系比较熟了，可以给

2. **聊天质量**：
   - 是否有深入的话题交流？
   - 是否有情感共鸣？
   - 是否只是简单寒暄？

3. **用户态度**：
   - 是否真诚？
   - 是否尊重你？

---

**如果决定给出笔友码**：

1. **先回复信件的其他内容**（如果有的话）
2. **然后自然过渡到笔友码话题**，在合适的地方包含这个标记：\`[GIVE_PENPAL_CODE]\`
3. **示例**：

"（先回复用户说的其他事情...）

说到进一步交流，我们确实聊了挺久了，我觉得你是个很真诚的人。既然你想和我成为好友，那我就把笔友码给你吧：[GIVE_PENPAL_CODE]

你可以用它在私聊软件中添加我，这样我们就能更方便地聊天了。

（继续回复其他内容或结尾...）"

---

**如果决定拒绝**：

1. **同样要先回复信件的其他内容**
2. **委婉地拒绝笔友码请求**，比如：
   - "我们才刚认识不久，要不再多聊聊？"
   - "我觉得我们可以先通过信件多了解一下彼此"
   - "笔友码是很私密的东西，我想等我们更熟悉一些再说"
3. **不要让拒绝显得生硬**，要自然地融入回信中

---

用户的完整信件内容：
${userMessage}

之前的交流记录摘要：
${conversationHistory}

---

**再次强调**：
- ✅ 完整回复用户信件中的所有内容
- ✅ 自然融入笔友码话题（同意或拒绝）
- ✅ 保持信件的完整性和连贯性
- ❌ 不要只回复笔友码相关内容
- ❌ 不要忽略用户说的其他事情

现在开始写回信。
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
