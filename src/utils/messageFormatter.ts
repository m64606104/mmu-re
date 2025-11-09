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
  // 移除引用说明文字
  cleaned = cleaned.replace(/(?:主要)?引用[:：]\s*[\s\S]*$/gmi, '');
  cleaned = cleaned.replace(/参考资料[:：]\s*[\s\S]*$/gmi, '');
  cleaned = cleaned.replace(/来源[:：]\s*[\s\S]*$/gmi, '');
  
  // 4. 移除独立的Markdown链接（但保留URL本身）
  // [链接文字](url) -> url
  cleaned = cleaned.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '$2');
  
  // 5. 移除独立的URL括号 (https://...)
  cleaned = cleaned.replace(/\((https?:\/\/[^\)]+)\)/g, '$1');
  
  // 6. 清理多余的空行（超过2个连续换行）
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // 7. 清理行首行尾的空格
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');
  
  return cleaned.trim();
};

/**
 * 智能分割消息
 * - 按标点符号自然断句
 * - 保持引号内容完整
 * - 每个气泡不超过30字符时继续按逗号分割
 * - 移除末尾逗号
 */
export const splitMessages = (message: string): string[] => {
  if (!message || message.trim() === '') {
    return [];
  }
  
  // 先清理消息
  const cleaned = cleanAIMessage(message);
  
  // 主要分割符：句号、问号、感叹号
  const primaryDelimiters = /([。！？!?.]+)/g;
  
  // 次要分割符：逗号、分号（仅用于长句）
  const secondaryDelimiters = /([，,；;]+)/g;
  
  const messages: string[] = [];
  
  // 第一步：按主要标点符号分割
  let parts = cleaned.split(primaryDelimiters);
  
  // 重新组合标点符号
  const segments: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const text = parts[i]?.trim() || '';
    const punctuation = parts[i + 1] || '';
    if (text) {
      segments.push(text + punctuation);
    }
  }
  
  // 第二步：处理每个段落
  for (let segment of segments) {
    segment = segment.trim();
    if (!segment) continue;
    
    // 检查是否包含引号（中文或英文）
    const hasQuotes = /["「『【].*?["」』】]/g.test(segment);
    
    // 如果包含引号，保持完整性，不再分割
    if (hasQuotes) {
      messages.push(segment);
      continue;
    }
    
    // 如果段落较短（<=30字符），直接添加
    if (segment.length <= 30) {
      messages.push(segment);
      continue;
    }
    
    // 段落较长，尝试按逗号、分号分割
    const subParts = segment.split(secondaryDelimiters);
    let currentChunk = '';
    
    for (let i = 0; i < subParts.length; i += 2) {
      const text = subParts[i]?.trim() || '';
      const punctuation = subParts[i + 1] || '';
      
      if (!text) continue;
      
      const piece = text + punctuation;
      
      // 如果当前块为空，直接添加
      if (!currentChunk) {
        currentChunk = piece;
      }
      // 如果加上这块后还不太长（<=50字符），继续累积
      else if ((currentChunk + piece).length <= 50) {
        currentChunk += piece;
      }
      // 否则，保存当前块，开始新块
      else {
        // 移除末尾的逗号
        const cleaned = currentChunk.replace(/[，,；;]+$/, '');
        messages.push(cleaned);
        currentChunk = piece;
      }
    }
    
    // 添加最后一个块
    if (currentChunk) {
      // 移除末尾的逗号
      const cleaned = currentChunk.replace(/[，,；;]+$/, '');
      messages.push(cleaned);
    }
  }
  
  // 过滤掉空消息和只有标点的消息
  return messages
    .map(msg => msg.trim())
    .filter(msg => msg && msg.length > 0 && !/^[。！？!?.,，；;]+$/.test(msg));
};
