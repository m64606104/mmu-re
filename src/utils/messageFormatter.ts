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
  // 移除引用说明文字（从"引用："开始到文末的所有内容）
  cleaned = cleaned.replace(/(?:主要)?引用[:：]\s*[\s\S]*$/gmi, '');
  cleaned = cleaned.replace(/参考资料[:：]\s*[\s\S]*$/gmi, '');
  cleaned = cleaned.replace(/来源[:：]\s*[\s\S]*$/gmi, '');
  cleaned = cleaned.replace(/资料来源[:：]\s*[\s\S]*$/gmi, '');
  
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
  
  // 7. 清理行首行尾的空格
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');
  
  return cleaned.trim();
};

/**
 * 智能分割消息
 * - 按标点符号自然断句
 * - 保护URL、引号内容、数字序号不被错误分割
 * - 提升单气泡字数，更符合人类聊天习惯
 */
export const splitMessages = (message: string): string[] => {
  if (!message || message.trim() === '') {
    return [];
  }
  
  // 🔒 保护特殊格式内容：多媒体、文档、红包、转账、订单、小红书等，避免被拆分
  const protectedPatterns = [
    /\[图片\d*[:：][^\]]+\]/g,    // 图片（包含朋友圈格式 [图片1:描述]）
    /\[视频:[^\]]+\]/g,           // 视频
    /\[语音:[^\]]+\]/g,           // 语音
    /\[表情包:[^\]]+\]/g,         // 表情包
    /\[发文档:[^\]]+\]/g,         // 文档
    /\[发红包:\d+(?:\.\d+)?:[^\]]*\]/g,     // 红包
    /\[转账:\d+(?:\.\d+)?:[^\]]*\]/g,       // 转账
    /\[送礼物:[^:]+:\d+(?:\.\d+)?:[^\]]*\]/g, // 礼物
    /\[接收红包:[^\]]*\]/g,       // 接收红包
    /\[退回红包:[^\]]*\]/g,       // 退回红包
    /\[接收转账:[^\]]*\]/g,       // 接收转账
    /\[退回转账:[^\]]*\]/g,       // 退回转账
    /\[接受礼物\]/g,              // 接受礼物
    /\[退回礼物\]/g,              // 退回礼物
    /\[同意代付\]/g,              // 同意代付
    /\[拒绝代付\]/g,              // 拒绝代付
    /\[回复\s+(?:我|你)\s+说的"[^"]+"\]/g,  // 引用回复
    /小红书瀑布流\[[\s\S]*?\]/g   // 小红书
  ];
  
  let protectedParts: string[] = [];
  let messageWithoutProtected = message;
  
  // 检查并提取所有受保护的内容
  for (const pattern of protectedPatterns) {
    const matches = Array.from(messageWithoutProtected.matchAll(new RegExp(pattern.source, 'g')));
    if (matches.length > 0) {
      matches.forEach(match => {
        protectedParts.push(match[0]);
        // 用占位符替换，避免影响其他内容的分割
        messageWithoutProtected = messageWithoutProtected.replace(match[0], '___PROTECTED___');
      });
    }
  }
  
  // 如果有文档标记且标记后有内容，需要特殊处理（文档内容在标记后）
  const documentPattern = /\[发文档:([^:]+):([^\]]+)\]/;
  const docMatch = message.match(documentPattern);
  let documentPart = '';
  
  if (docMatch) {
    const tagIndex = docMatch.index!;
    const tagEndIndex = tagIndex + docMatch[0].length;
    const contentAfter = message.substring(tagEndIndex).trim();
    
    if (contentAfter) {
      // 格式：[发文档:xxx] 内容在后面
      // 将整个文档（标记+内容）作为一个整体保护
      documentPart = message.substring(tagIndex).trim();
      messageWithoutProtected = message.substring(0, tagIndex).trim();
      // 从已保护列表中移除单独的文档标记
      protectedParts = protectedParts.filter(p => !p.match(documentPattern));
    }
  }
  
  // 先清理消息（只清理非保护部分）
  const cleaned = cleanAIMessage(messageWithoutProtected);
  
  // 检测并保护URL
  const urlPattern = /https?:\/\/[^\s]+/g;
  const urls: string[] = [];
  const urlPlaceholder = '___URL_PLACEHOLDER___';
  let textWithPlaceholders = cleaned.replace(urlPattern, (url) => {
    urls.push(url);
    return urlPlaceholder;
  });
  
  // 主要分割符：句号、问号、感叹号、换行
  const primaryDelimiters = /([。！？!?.\n]+)/g;
  
  const messages: string[] = [];
  
  // 第一步：按主要标点符号和换行分割
  let parts = textWithPlaceholders.split(primaryDelimiters);
  
  // 重新组合标点符号
  const segments: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const text = parts[i]?.trim() || '';
    const punctuation = parts[i + 1] || '';
    if (text) {
      // 移除换行符，不要替换成句号（避免重复标点）
      const finalPunc = punctuation.replace(/\n+/g, '');
      segments.push(text + finalPunc);
    }
  }
  
  // 第二步：处理每个段落
  for (let segment of segments) {
    segment = segment.trim();
    if (!segment) continue;
    
    // 检查是否包含未闭合的引号
    const openQuotes = (segment.match(/[""「『【]/g) || []).length;
    const closeQuotes = (segment.match(/[""」』】]/g) || []).length;
    const hasUnclosedQuotes = openQuotes !== closeQuotes;
    
    // 检查是否包含URL占位符
    const hasURL = segment.includes(urlPlaceholder);
    
    // 如果有未闭合引号或URL，保持完整性，不分割
    if (hasUnclosedQuotes || hasURL) {
      messages.push(segment);
      continue;
    }
    
    // 检查是否包含完整配对的引号内容
    const hasCompleteQuotes = /[""「『【].*?[""」』】]/.test(segment);
    if (hasCompleteQuotes) {
      messages.push(segment);
      continue;
    }
    
    // 如果段落较短（<=60字符），直接添加
    if (segment.length <= 60) {
      messages.push(segment);
      continue;
    }
    
    // 段落较长，尝试按逗号、分号分割
    const secondaryDelimiters = /([，,；;]+)/g;
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
      // 如果加上这块后还不太长（<=80字符），继续累积
      else if ((currentChunk + piece).length <= 80) {
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
  
  // 第三步：合并数字序号与内容
  const finalMessages: string[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i].trim();
    
    // 检查是否是单独的数字序号（1. 2. 3. 等）
    if (/^\d+[.。]$/.test(msg) && i + 1 < messages.length) {
      // 与下一条消息合并
      const nextMsg = messages[i + 1];
      finalMessages.push(msg + ' ' + nextMsg);
      i++; // 跳过下一条
    } else {
      finalMessages.push(msg);
    }
  }
  
  // 第四步：恢复URL占位符和受保护内容
  let urlIndex = 0;
  let protectedIndex = 0;
  const restoredMessages = finalMessages.map(msg => {
    // 先恢复URL
    let restored = msg.replace(new RegExp(urlPlaceholder, 'g'), () => {
      const url = urls[urlIndex];
      urlIndex++;
      return url || '';
    });
    // 再恢复受保护的内容（红包、转账等）
    restored = restored.replace(/___PROTECTED___/g, () => {
      const protectedContent = protectedParts[protectedIndex];
      protectedIndex++;
      return protectedContent || '';
    });
    return restored;
  });
  
  // 过滤掉空消息、只有标点的消息、以及纯URL的消息
  const filteredMessages = restoredMessages
    .map(msg => msg.trim())
    .filter(msg => {
      if (!msg || msg.length === 0) return false;
      // 过滤纯标点
      if (/^[。！？!?.,，；;]+$/.test(msg)) return false;
      // 过滤纯URL（包括可能的[]前缀）
      if (/^\[?\]?https?:\/\/[^\s]+$/.test(msg)) return false;
      // 过滤只有.html、.com等扩展名结尾的片段
      if (/^[a-z0-9\-]+\.(html?|com|net|org|cn|edu)\.?$/i.test(msg)) return false;
      // 过滤纯数字+点（可能是URL的一部分）
      if (/^\d+\.$/.test(msg) && msg.length < 10) return false;
      return true;
    });
  
  // 🔥 移除所有系统标记（这些标记用于程序识别，不应显示给用户）
  const cleanedMessages = filteredMessages.map(msg => {
    // 移除订单响应标记
    let cleaned = msg
      .replace(/\[接受礼物\]/g, '')
      .replace(/\[退回礼物\]/g, '')
      .replace(/\[同意代付\]/g, '')
      .replace(/\[拒绝代付\]/g, '');
    
    // 🔥 移除多媒体相关标记（防止泄露）
    cleaned = cleaned
      .replace(/\[多媒体消息\]/g, '')
      .replace(/\[图片\d*\]/g, '')
      .replace(/\[照片\d*\]/g, '')
      .replace(/\[视频\]/g, '')
      .replace(/\[语音\]/g, '')
      .replace(/\[表情包\]/g, '')
      .replace(/\[表情\]/g, '');
    
    return cleaned.trim();
  }).filter(msg => msg.length > 0); // 移除可能变成空的消息
  
  // 🔒 将文档部分添加回去（如果有的话）
  if (documentPart) {
    // 文档始终作为单独的一条消息，放在最后
    return [...cleanedMessages, documentPart];
  }
  
  return cleanedMessages;
};
