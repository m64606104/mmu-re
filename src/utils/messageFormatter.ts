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
  // 移除方括号/书名号/圆括号中的“回复/引用”类标签
  cleaned = cleaned.replace(/\[[\s\u3000]*(回复|回覆|引用|Reply|Quote)[^\]]*\]\s*/gi, '');
  cleaned = cleaned.replace(/【[\s\u3000]*(回复|回覆|引用|Reply|Quote)[^】]*】\s*/gi, '');
  cleaned = cleaned.replace(/（[\s\u3000]*(回复|回覆|引用|Reply|Quote)[^）]*）\s*/gi, '');
  // 移除行首的“回复: / 引用: / 参考资料: / 来源:”
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
    // （移除对“[回复 我/你 说的"…"]”的保护，确保后续 cleanAIMessage 能清理掉该格式）
    /小红书瀑布流\[[\s\S]*?\]/g,   // 小红书
    /\d+\.\d+%/g,  // 🎯 保护百分数（如 3.8%、9.9%）
    /￥?\d+\.\d+[元亿万]?/g  // 🎯 保护金额（如99.9元、3.14亿）
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
  
  // 🔒 保护引号、括号内的内容（包括其中的标点符号）
  // 支持: "xxx"、「xxx」、『xxx』、【xxx】、(xxx)、[xxx]、{xxx}
  // ⚡ 增强保护逻辑：使用更严格的匹配模式
  const protectedContentPatterns = [
    /([""「『【])([^""」『】]*?)([""」『】])/g,  // 中文引号
    /([（(])([^（()）]*?)([）)])/g,              // 圆括号 (增强匹配)
    /(\[)([^\[\]]*?)(\])/g,                    // 方括号
    /(\{)([^{}]*?)(\})/g,                      // 花括号
  ];
  
  const protectedContents: string[] = [];
  const protectedPlaceholder = '___PROTECTED_CONTENT___';
  
  for (const pattern of protectedContentPatterns) {
    textWithPlaceholders = textWithPlaceholders.replace(pattern, (match) => {
      protectedContents.push(match); // 保存整个括号/引号及其内容
      return protectedPlaceholder;
    });
  }
  
  // 主要分割符：句号、问号、感叹号、换行
  // ⚠️ 注意：不包含英文句号 `.`，避免切割数字小数点（如 3.8%、99.9元）
  const primaryDelimiters = /([。！？!?\n]+)/g;
  
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
    
    // 检查是否包含URL占位符或受保护内容占位符
    const hasURL = segment.includes(urlPlaceholder);
    const hasProtected = segment.includes(protectedPlaceholder);
    
    // 如果有URL或受保护内容占位符，保持完整性，不分割
    if (hasURL || hasProtected) {
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
    
    // 检查是否是单独的数字序号（包括各种格式）
    // 🎯 增强：避免误判小数点，只匹配整数+句号
    const isNumberSequence = /^(?:\d+[.。]|[①-⑳]|[➊-➓]|[❶-❿]|[⓵-⓾]|[Ⅰ-Ⅻ]|[ⅰ-ⅻ])$/;
    
    // 🚫 但不包括小数（如 3.8、99.9）
    const isDecimalNumber = /^\d+\.\d+$/.test(msg);
    
    if (isNumberSequence.test(msg) && !isDecimalNumber && i + 1 < messages.length) {
      // 与下一条消息合并（但不包括小数）
      const nextMsg = messages[i + 1];
      finalMessages.push(msg + ' ' + nextMsg);
      i++; // 跳过下一条
    } else {
      finalMessages.push(msg);
    }
  }
  
  // 第四步：恢复URL占位符、受保护内容和特殊格式内容
  let urlIndex = 0;
  let protectedContentIndex = 0;
  let protectedFormatIndex = 0;
  const restoredMessages = finalMessages.map(msg => {
    // 先恢复URL
    let restored = msg.replace(new RegExp(urlPlaceholder, 'g'), () => {
      const url = urls[urlIndex];
      urlIndex++;
      return url || '';
    });
    // 恢复受保护的内容（引号、括号等）
    restored = restored.replace(new RegExp(protectedPlaceholder, 'g'), () => {
      const protectedContent = protectedContents[protectedContentIndex];
      protectedContentIndex++;
      return protectedContent || '';
    });
    // 最后恢复受保护的格式内容（红包、转账等）
    restored = restored.replace(/___PROTECTED___/g, () => {
      const protectedFormat = protectedParts[protectedFormatIndex];
      protectedFormatIndex++;
      return protectedFormat || '';
    });
    return restored;
  });
  
  // 🧠 第五步：智能标点符号检查和修复
  const smartFixedMessages: string[] = [];
  for (let i = 0; i < restoredMessages.length; i++) {
    const msg = restoredMessages[i].trim();
    if (!msg) continue;
    
    // 检查是否只有引号、括号或标点符号
    const isOnlyPunctuation = /^[""「」『』【】()（）\[\]{}。！？!?.,，；;]+$/.test(msg);
    
    if (isOnlyPunctuation) {
      // 如果是单独的引号、括号或标点，尝试合并到上一个消息
      if (smartFixedMessages.length > 0) {
        const lastMsg = smartFixedMessages[smartFixedMessages.length - 1];
        
        // 检查上一个消息是否缺少闭合符号
        const hasOpenSymbol = /["「『【(（\[{]/.test(lastMsg) && !/["」』】)）\]}]/.test(lastMsg);
        
        if (hasOpenSymbol && /["」』】)）\]}]/.test(msg)) {
          // 上一个消息有开符号没有闭符号，而当前是闭符号，合并
          smartFixedMessages[smartFixedMessages.length - 1] = lastMsg + msg;
        } else {
          // 其他情况，直接合并
          smartFixedMessages[smartFixedMessages.length - 1] = lastMsg + msg;
        }
      } else {
        // 如果是第一个消息且只有标点，跳过
        continue;
      }
    } else {
      // 🔧 增强的成对符号检查
      const symbolPairs = [
        { open: /"/g, close: /"/g, map: { '"': '"' } },
        { open: /"/g, close: /"/g, map: { '"': '"' } },
        { open: /"/g, close: /"/g, map: { '"': '"' } },
        { open: /「/g, close: /」/g, map: { '「': '」' } },
        { open: /『/g, close: /』/g, map: { '『': '』' } },
        { open: /【/g, close: /】/g, map: { '【': '】' } },
        { open: /[(（]/g, close: /[)）]/g, map: { '(': ')', '（': '）' } },
        { open: /\[/g, close: /\]/g, map: { '[': ']' } },
        { open: /{/g, close: /}/g, map: { '{': '}' } },
      ];
      
      let needsFixing = false;
      let fixedMsg = msg;
      
      for (const pair of symbolPairs) {
        const openMatches = (msg.match(pair.open) || []).length;
        const closeMatches = (msg.match(pair.close) || []).length;
        
        if (openMatches > closeMatches) {
          // ⚠️ 禁用自动合并逻辑，避免重复发送
          // 有未闭合的符号时，仅在必要时自动补齐，不尝试与下一条消息合并
          // 因为保护机制应该已经处理了完整的括号内容
          
          // 🔧 谨慎地自动补齐符号，仅当确定需要时
          // 检查是否真的需要补齐（避免对已经完整的内容进行处理）
          const openSymbols = msg.match(pair.open) || [];
          const existingCloseSymbols = msg.match(pair.close) || [];
          
          // 只有当开符号明显多于闭符号时才补齐
          if (openSymbols.length > existingCloseSymbols.length) {
            const lastOpenSymbol = openSymbols[openSymbols.length - 1];
            const closeSymbol = (pair.map as any)[lastOpenSymbol];
            if (closeSymbol) {
              fixedMsg = msg + closeSymbol;
              needsFixing = true;
              break;
            }
          }
        }
      }
      
      if (!needsFixing) {
        smartFixedMessages.push(msg);
      } else {
        smartFixedMessages.push(fixedMsg);
      }
    }
  }
  
  // 过滤掉空消息、只有标点的消息、以及纯URL的消息
  const filteredMessages = smartFixedMessages
    .map(msg => msg.trim())
    .filter(msg => {
      if (!msg || msg.length === 0) return false;
      // 过滤纯标点（但不包括引号，因为引号应该已经被合并）
      if (/^[。！？!?.,，；;]+$/.test(msg)) return false;
      // 过滤单独的引号（如果还有漏网之鱼）
      if (/^[“”「」『』【】]+$/.test(msg)) return false;
      // 过滤纯URL（包括可能的[]前缀）
      if (/^\[?\]?https?:\/\/[^\s]+$/.test(msg)) return false;
      // 过滤只有.html、.com等扩展名结尾的片段
      if (/^[a-z0-9\-]+\.(html?|com|net|org|cn|edu)\.?$/i.test(msg)) return false;
      // 🚫 移除过滤逻辑：不要过滤 "3." 这样的内容，因为可能是 "3.8%" 被错误切割
      // if (/^\d+\.$/.test(msg) && msg.length < 10) return false;
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
