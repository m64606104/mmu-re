import React from 'react';
import { DocumentMessage } from '../types';

/**
 * 文档内容格式化工具
 * 在文档封装后对内容进行书面格式处理，不影响原始文档解析
 */

/**
 * 智能分段处理
 * 根据中文书面文档的习惯进行段落分割
 */
function formatParagraphs(content: string): string {
  // 移除多余的空白字符
  let formatted = content.replace(/\s+/g, ' ').trim();
  
  // 中文标点符号后的分段规则
  const sentenceEnders = /[。！？；]\s*/g;
  
  // 按句号、感叹号、问号、分号分句
  let sentences = formatted.split(sentenceEnders).filter(s => s.trim().length > 0);
  
  // 智能合并短句成段落
  const paragraphs: string[] = [];
  let currentParagraph = '';
  let sentenceCount = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    if (!sentence) continue;
    
    // 添加句子到当前段落
    if (currentParagraph) {
      currentParagraph += sentence + '。';
    } else {
      currentParagraph = sentence + '。';
    }
    sentenceCount++;
    
    // 判断是否应该结束当前段落
    const shouldEndParagraph = 
      sentenceCount >= 3 && currentParagraph.length >= 100 || // 3句话且超过100字符
      sentenceCount >= 5 || // 超过5句话
      currentParagraph.length >= 200 || // 段落过长
      i === sentences.length - 1; // 最后一句
    
    if (shouldEndParagraph) {
      paragraphs.push(currentParagraph);
      currentParagraph = '';
      sentenceCount = 0;
    }
  }
  
  // 处理剩余内容
  if (currentParagraph.trim()) {
    paragraphs.push(currentParagraph);
  }
  
  return paragraphs.join('\n\n');
}

/**
 * 标题格式化
 * 处理文档标题的显示格式
 */
function formatTitle(title: string): string {
  // 移除可能的方括号标记
  let formatted = title.replace(/^[【\[「](.+)[】\]」]$/, '$1');
  
  // 标准化标题格式
  formatted = formatted.trim();
  
  return formatted;
}

/**
 * 内容智能格式化
 * 处理HTML内容，添加书面文档的格式规范
 */
function formatHtmlContent(htmlContent: string): string {
  // 创建临时DOM元素进行处理
  const div = document.createElement('div');
  div.innerHTML = htmlContent;
  
  // 提取纯文本内容
  const textContent = div.textContent || div.innerText || '';
  
  // 对纯文本进行分段处理
  const formattedText = formatParagraphs(textContent);
  
  // 将分段后的文本转换为HTML段落
  const paragraphs = formattedText.split('\n\n');
  const htmlParagraphs = paragraphs.map(p => {
    if (p.trim()) {
      // 处理段落首行缩进
      return `<p style="text-indent: 2em; margin-bottom: 1em; line-height: 1.8;">${p.trim()}</p>`;
    }
    return '';
  }).filter(p => p);
  
  return htmlParagraphs.join('\n');
}

/**
 * 检测并格式化特殊内容类型
 */
function detectAndFormatSpecialContent(content: string): string {
  // 检测是否为代码内容
  const codePattern = /^[\s]*(?:function|class|import|export|const|let|var|if|for|while)/m;
  if (codePattern.test(content)) {
    return `<pre style="background: #f8f9fa; padding: 1em; border-radius: 6px; overflow-x: auto; font-family: 'Monaco', 'Consolas', monospace; font-size: 14px; line-height: 1.5;"><code>${content}</code></pre>`;
  }
  
  // 检测是否为列表内容
  const listPattern = /^[\d\.\s]*[\d]+[\.\)]\s+.+/m;
  if (listPattern.test(content)) {
    const lines = content.split('\n');
    const listItems = lines.map(line => {
      const match = line.match(/^[\s]*[\d]+[\.\)]\s+(.+)/);
      if (match) {
        return `<li style="margin-bottom: 0.5em;">${match[1]}</li>`;
      }
      return line.trim() ? `<p style="text-indent: 2em; line-height: 1.8;">${line}</p>` : '';
    }).filter(item => item);
    
    return `<ol style="padding-left: 2em; margin-bottom: 1em;">${listItems.join('\n')}</ol>`;
  }
  
  // 默认段落格式
  return formatHtmlContent(content);
}

/**
 * 主格式化函数
 * 对已解析的文档进行格式美化，不影响原始解析逻辑
 */
export function formatDocumentForDisplay(document: DocumentMessage): DocumentMessage {
  const formattedTitle = formatTitle(document.title);
  
  let formattedContent: string;
  
  // 根据文档类型选择不同的格式化策略
  switch (document.type) {
    case 'code':
      // 代码类型保持原样，只添加代码块样式
      formattedContent = `<pre style="background: #f8f9fa; padding: 1.5em; border-radius: 8px; overflow-x: auto; font-family: 'Monaco', 'Consolas', monospace; font-size: 14px; line-height: 1.6; border-left: 4px solid #28a745;"><code>${document.content}</code></pre>`;
      break;
      
    case 'markdown':
      // Markdown类型进行轻度格式化
      formattedContent = formatHtmlContent(document.content);
      break;
      
    case 'text':
    default:
      // 纯文本类型进行完整的书面格式化
      const textContent = document.content.replace(/<[^>]*>/g, ''); // 移除HTML标签
      formattedContent = detectAndFormatSpecialContent(textContent);
      break;
  }
  
  return {
    ...document,
    title: formattedTitle,
    content: formattedContent
  };
}

/**
 * 生成标题的书面样式
 */
export function generateTitleStyle(_title: string, type: 'text' | 'markdown' | 'code'): React.CSSProperties {
  const typeColors = {
    text: '#1f2937',
    markdown: '#7c3aed', 
    code: '#059669'
  };
  
  return {
    fontSize: '2rem',
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: '2rem',
    paddingBottom: '1rem',
    position: 'relative',
    color: typeColors[type]
  };
}

/**
 * 生成内容区域的书面样式
 */
export function generateContentStyle(): React.CSSProperties {
  return {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    fontSize: '16px',
    lineHeight: 1.8,
    color: '#1f2937',
    maxWidth: 'none'
  };
}
