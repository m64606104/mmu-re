import { DocumentMessage } from '../types';

/**
 * 增强的文档解析器
 * 支持多种格式：JSON、HTML、Markdown、自然语言
 */

// ============================================
// 辅助函数
// ============================================

/**
 * 清理HTML，只保留安全标签
 */
export function sanitizeHTML(html: string): string {
  // 创建临时元素
  const div = document.createElement('div');
  div.innerHTML = html;
  
  // 白名单标签
  const allowedTags = [
    'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'UL', 'OL', 'LI', 'STRONG', 'EM', 'U', 'S',
    'BR', 'HR', 'BLOCKQUOTE', 'PRE', 'CODE',
    'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD',
    'A', 'IMG', 'SPAN', 'DIV'
  ];
  
  // 递归清理元素
  function cleanElement(element: Element): void {
    // 移除脚本和危险属性
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('on') || attr.name === 'javascript:') {
        element.removeAttribute(attr.name);
      }
    });
    
    // 检查子元素
    Array.from(element.children).forEach(child => {
      if (!allowedTags.includes(child.tagName)) {
        // 不在白名单中，替换为文本节点
        const textNode = document.createTextNode(child.textContent || '');
        child.replaceWith(textNode);
      } else {
        cleanElement(child);
      }
    });
  }
  
  cleanElement(div);
  return div.innerHTML;
}

/**
 * 从HTML中提取纯文本
 */
export function stripHTML(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

/**
 * HTML转义
 */
export function escapeHTML(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 截断HTML（保留标签结构）
 */
export function truncateHTML(html: string, maxLength: number): string {
  const text = stripHTML(html);
  if (text.length <= maxLength) return html;
  
  // 简单截断后重新包装
  const truncated = text.substring(0, maxLength) + '...';
  return `<p>${escapeHTML(truncated)}</p>`;
}

// ============================================
// 解析函数
// ============================================

/**
 * 优先级1: 尝试解析 JSON 格式
 */
function tryParseJSON(content: string): DocumentMessage | null {
  try {
    const trimmed = content.trim();
    if (!trimmed.startsWith('{')) return null;
    
    const parsed = JSON.parse(trimmed);
    if (parsed.title && parsed.content) {
      return {
        title: parsed.title,
        content: sanitizeHTML(parsed.content),
        type: parsed.type || 'text',
        greeting: parsed.greeting
      };
    }
  } catch (e) {
    // JSON 解析失败
  }
  return null;
}

/**
 * 优先级2: 尝试解析 HTML <doc> 标签
 */
function tryParseHTMLDoc(content: string): DocumentMessage | null {
  if (!/<doc/i.test(content)) return null;
  
  try {
    const div = document.createElement('div');
    div.innerHTML = content;
    const docElement = div.querySelector('doc');
    
    if (docElement) {
      const title = docElement.getAttribute('title') || '未命名文档';
      const docType = docElement.getAttribute('doc-type') || 'text';
      const greeting = docElement.getAttribute('greeting') || undefined;
      const htmlContent = docElement.innerHTML;
      
      return {
        title,
        content: sanitizeHTML(htmlContent),
        type: docType as 'text' | 'markdown' | 'code',
        greeting
      };
    }
  } catch (e) {
    console.error('HTML doc 解析失败:', e);
  }
  return null;
}

/**
 * 优先级3: 尝试解析 Markdown 格式
 */
function tryParseMarkdown(content: string): DocumentMessage | null {
  // 检测 Markdown 标题格式
  const match = content.match(/^#\s+(.+?)\n+([\s\S]+)/);
  if (match) {
    const title = match[1].trim();
    const body = match[2].trim();
    
    // 简单的 Markdown 转 HTML
    let html = body
      .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
      .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^-\s+(.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[hul])/gm, '<p>')
      .replace(/(?<!>)$/gm, '</p>');
    
    html = html.replace(/<p><\/p>/g, '');
    
    return {
      title,
      content: sanitizeHTML(html),
      type: 'markdown'
    };
  }
  return null;
}

/**
 * 优先级4: 智能提取（自然语言）
 */
function tryExtractNaturalLanguage(content: string): DocumentMessage | null {
  // 模式1: "发送了文档《xxx》" 或 "发送了文档「xxx」"
  const pattern1 = /(?:发送|发了|这是)(?:一份|一个)?文档[《「](.+?)[》」]([\s\S]*)/;
  const match1 = content.match(pattern1);
  if (match1) {
    const title = match1[1].trim();
    let docContent = match1[2].trim();
    
    // 移除可能的"请查收"等问候语
    const greetings = ['请查收', '供你参考', '希望对你有帮助', '再看看', '请收下'];
    let greeting: string | undefined;
    for (const g of greetings) {
      if (docContent.startsWith(g)) {
        greeting = g;
        docContent = docContent.substring(g.length).trim();
        break;
      }
    }
    
    // 🚨 检测到AI只发送了文档标题但没有正文内容的情况
    if (docContent.length <= 10) {
      console.warn(`⚠️ [文档解析] AI发送了文档标题"${title}"但缺少正文内容 (长度: ${docContent.length})`);
      console.warn(`💡 [文档解析] 建议在系统提示中强调文档发送格式要求`);
      
      // 创建一个特殊的文档对象，包含错误提示
      return {
        title,
        content: sanitizeHTML(`
          <div style="color: #ff6b6b; background: #fff3f3; padding: 12px; border-radius: 8px; border-left: 4px solid #ff6b6b; margin: 8px 0;">
            <h4 style="margin: 0 0 8px 0;">⚠️ 文档内容缺失</h4>
            <p style="margin: 0 0 8px 0;">AI发送了文档标题但未提供正文内容。</p>
            <p style="margin: 0; font-size: 12px; opacity: 0.8;">请要求AI重新发送完整的文档内容。</p>
          </div>
        `),
        type: 'text',
        greeting: greeting || '内容缺失'
      };
    }
    
    if (docContent.length > 10) {
      return {
        title,
        content: sanitizeHTML(`<p>${escapeHTML(docContent)}</p>`),
        type: 'text',
        greeting
      };
    }
  }
  
  // 模式2: "文档标题: xxx\n正文: xxx"
  const pattern2 = /文档标题[:：]\s*(.+?)\n+(?:正文[:：])?\s*([\s\S]+)/;
  const match2 = content.match(pattern2);
  if (match2) {
    const title = match2[1].trim();
    const docContent = match2[2].trim();
    
    if (docContent.length > 10) {
      return {
        title,
        content: sanitizeHTML(`<p>${escapeHTML(docContent)}</p>`),
        type: 'text'
      };
    }
  }
  
  // 模式3: "标题: xxx\n\n内容..."
  const pattern3 = /^标题[:：]\s*(.+?)\n\s*\n([\s\S]+)/;
  const match3 = content.match(pattern3);
  if (match3) {
    const title = match3[1].trim();
    const docContent = match3[2].trim();
    
    if (docContent.length > 10) {
      return {
        title,
        content: sanitizeHTML(`<p>${escapeHTML(docContent)}</p>`),
        type: 'text'
      };
    }
  }
  
  return null;
}

/**
 * 优先级5: 解析旧版标记格式 [发文档:标题:类型]
 */
function tryParseLegacy(content: string): DocumentMessage | null {
  const pattern = /\[发文档:([^:]+):([^\]]+)\]([\s\S]*)/;
  const match = content.match(pattern);
  
  if (match) {
    const title = match[1].trim();
    const typeStr = match[2].toLowerCase().trim();
    const docContent = match[3].trim();
    
    const type: 'text' | 'markdown' | 'code' = 
      typeStr === 'markdown' ? 'markdown' :
      typeStr === 'code' ? 'code' : 'text';
    
    if (docContent.length > 10) {
      return {
        title,
        content: sanitizeHTML(`<p>${escapeHTML(docContent)}</p>`),
        type
      };
    }
  }
  
  return null;
}

// ============================================
// 主解析函数
// ============================================

/**
 * 增强的文档解析 - 支持多种格式
 * @param content 消息内容
 * @returns 解析后的文档对象或 null
 */
export function parseEnhancedDocument(content: string): DocumentMessage | null {
  if (!content || content.trim().length === 0) return null;
  
  // 优先级1: JSON 格式
  const jsonDoc = tryParseJSON(content);
  if (jsonDoc) {
    console.log('✅ [文档解析] JSON 格式解析成功');
    return jsonDoc;
  }
  
  // 优先级2: HTML <doc> 标签
  const htmlDoc = tryParseHTMLDoc(content);
  if (htmlDoc) {
    console.log('✅ [文档解析] HTML <doc> 标签解析成功');
    return htmlDoc;
  }
  
  // 优先级3: Markdown 格式
  const mdDoc = tryParseMarkdown(content);
  if (mdDoc) {
    console.log('✅ [文档解析] Markdown 格式解析成功');
    return mdDoc;
  }
  
  // 优先级4: 自然语言提取
  const nlpDoc = tryExtractNaturalLanguage(content);
  if (nlpDoc) {
    console.log('✅ [文档解析] 自然语言提取成功');
    return nlpDoc;
  }
  
  // 优先级5: 旧版标记格式
  const legacyDoc = tryParseLegacy(content);
  if (legacyDoc) {
    console.log('✅ [文档解析] 旧版标记格式解析成功');
    return legacyDoc;
  }
  
  // 未识别为文档
  return null;
}

/**
 * 提取文档内容的纯文本（用于搜索）
 */
export function extractDocumentText(doc: DocumentMessage): string {
  return stripHTML(doc.content);
}

/**
 * 生成文档预览
 */
export function generateDocumentPreview(doc: DocumentMessage, maxLength: number = 100): string {
  const text = extractDocumentText(doc);
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * 解析上传的文档文件（PDF、Word、TXT等）
 * 用于知识库文档上传
 */
export async function parseDocument(file: File): Promise<string> {
  const fileType = file.name.split('.').pop()?.toLowerCase() || '';
  
  // TXT文件直接读取
  if (fileType === 'txt') {
    return await file.text();
  }
  
  // PDF文件
  if (fileType === 'pdf') {
    try {
      // 动态导入PDF解析库
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      return fullText.trim();
    } catch (error) {
      throw new Error('PDF解析失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  }
  
  // Word文件（.docx）
  if (fileType === 'docx' || fileType === 'doc') {
    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value.trim();
    } catch (error) {
      throw new Error('Word文档解析失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  }
  
  throw new Error(`不支持的文件类型：${fileType}。请上传PDF、Word或TXT文件。`);
}
