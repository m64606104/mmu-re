/**
 * 消息格式化和分割工具
 * 让AI消息更自然、更接近人类聊天习惯
 */

/**
 * 清理AI回复中的非自然内容
 * - 移除Markdown格式（**加粗**、* 列表等）
 * - 移除引用链接
 * - 保持URL完整性
 */
export const cleanAIMessage = (message: string): string => {
  if (!message) return '';
  
  let cleaned = message;
  
  // 1. 移除Markdown加粗标记 **文字**，但保留内容
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  
  // 2. 移除列表标记
  // 移除 "* **标题：** 内容" 这种格式，保留"标题：内容"
  cleaned = cleaned.replace(/^\s*[\*\-]\s+\*\*([^:：]+)[:：]\*\*\s*/gm, '$1：');
  // 移除普通列表标记 "* 内容"
  cleaned = cleaned.replace(/^\s*[\*\-]\s+/gm, '');
  
  // 3. 移除引用标记和引用链接
  // 移除 [1][2] 这种引用标记
  cleaned = cleaned.replace(/\[\d+\]/g, '');
  // 移除 [citation:3] / [CITATION: 6] 这类学术风格引用标记
  cleaned = cleaned.replace(/\[\s*citation\s*:\s*\d+\s*\]/gi, '');
  // 移除引用说明文字（从"引用："开始到文末的所有内容）
  cleaned = cleaned.replace(/(?:主要)?引用[:：]\s*[\s\S]*$/gmi, '');
  cleaned = cleaned.replace(/参考资料[:：]\s*[\s\S]*$/gmi, '');
  cleaned = cleaned.replace(/来源[:：]\s*[\s\S]*$/gmi, '');
  // 移除方括号/书名号/圆括号中的"回复/引用"类标签
  cleaned = cleaned.replace(/\[[\s\u3000]*(回复|回覆|引用|Reply|Quote)[^\]]*\]\s*/gi, '');
  cleaned = cleaned.replace(/【[\s\u3000]*(回复|回覆|引用|Reply|Quote)[^】]*】\s*/gi, '');
  cleaned = cleaned.replace(/（[\s\u3000]*(回复|回覆|引用|Reply|Quote)[^）]*）\s*/gi, '');
  // 移除行首的"回复: / 引用: / 参考资料: / 来源:"
  cleaned = cleaned.replace(/^[\t\s]*(回复|回覆|引用|参考资料|来源)[:：].*$/gmi, '');
  
  // 4. 移除Markdown链接格式
  // [链接文字](url) -> 完全移除
  cleaned = cleaned.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '');
  
  // 5. 移除独立成行的完整URL
  cleaned = cleaned.replace(/^\s*\[?\]?https?:\/\/[^\s]+\s*$/gm, '');
  
  // 6. 移除URL括号 (https://...)
  cleaned = cleaned.replace(/\((https?:\/\/[^\)]+)\)/g, '');
  
  // 7. 移除残留的[]空括号
  cleaned = cleaned.replace(/\[\s*\]/g, '');
  
  // 8. 清理多余的空行（超过2个连续换行）
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // 8. 清理行首行尾的空格
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');
  
  // 9. 移除动作/语气描写（括号内容）
  // 匹配 (动作) 或 （动作），通常较短且位于句首或句尾，或者独立
  // 移除所有圆括号包裹的内容，如果它们看起来像动作描写（非数字、非URL）
  cleaned = cleaned.replace(/[\(（](?!https?:\/\/|\d+)[^\)）\n]+[\)）]/g, '');
  
  // 10. 再次清理可能产生的空括号或多余标点
  cleaned = cleaned.replace(/[\(（]\s*[\)）]/g, '');

  // 11. 移除模型内部使用的角色标记，防止诸如 <|assistant|> / <|user|> 直接出现在对话中
  cleaned = cleaned.replace(/<\|assistant\|>/gi, '');
  cleaned = cleaned.replace(/<\|user\|>/gi, '');
  cleaned = cleaned.replace(/<\|system\|>/gi, '');
  
  return cleaned.trim();
};

/**
 * 消息分割器
 * - 使用 [NEXT] 分割标记将消息分割成多条
 * - 如果没有 [NEXT] 标记，返回单条消息
 */
export const splitMessages = (message: string): string[] => {
  if (!message || message.trim() === '') {
    return [];
  }
  
  // 🚀 检查 [NEXT] 分割标记
  if (message.includes('[NEXT]')) {
    const parts = message.split('[NEXT]')
      .map(part => part.trim())
      .filter(part => part.length > 0);
    
    if (parts.length > 0) {
      console.log(`🔄 [分割器] 使用 [NEXT] 分割，共 ${parts.length} 条消息`);
      return parts;
    }
  }
  
  // 没有 [NEXT] 标记，返回单条消息
  return [message.trim()];
};
