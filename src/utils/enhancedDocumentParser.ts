import { DocumentMessage } from '../types';
import * as mammothBrowser from 'mammoth/mammoth.browser';

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
    
    // 🔥 放宽限制：只要有内容就认为是有效文档
    if (docContent.length > 0) {
      return {
        title,
        content: sanitizeHTML(`<p>${escapeHTML(docContent)}</p>`),
        type: 'text',
        greeting
      };
    } else {
      // 内容完全为空时才提示
      console.warn(`⚠️ [文档解析] AI发送了文档标题"${title}"但内容为空`);
      return {
        title,
        content: sanitizeHTML(`
          <div style="color: #ff6b6b; background: #fff3f3; padding: 12px; border-radius: 8px; border-left: 4px solid #ff6b6b;">
            <h4 style="margin: 0 0 8px 0;">⚠️ 文档内容为空</h4>
            <p style="margin: 0; font-size: 14px;">AI发送了文档标题但未提供内容。</p>
          </div>
        `),
        type: 'text',
        greeting: greeting || '内容缺失'
      };
    }
  }
  
  // 模式2: "文档标题: xxx\n正文: xxx"
  const pattern2 = /文档标题[:：]\s*(.+?)\n+(?:正文[:：])?\s*([\s\S]+)/;
  const match2 = content.match(pattern2);
  if (match2) {
    const title = match2[1].trim();
    const docContent = match2[2].trim();
    
    if (docContent.length > 0) {
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
    
    if (docContent.length > 0) {
      return {
        title,
        content: sanitizeHTML(`<p>${escapeHTML(docContent)}</p>`),
        type: 'text'
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
  const baseName = file.name.replace(/\.[^/.]+$/, '') || file.name;

  const wrapMarkdown = (body: string, metaLines: string[]) => {
    const meta = metaLines.length ? `## 元信息\n${metaLines.map((l) => `- ${l}`).join('\n')}\n\n` : '';
    return `# ${baseName}\n\n${meta}${body}`.trim();
  };

  const normalizeWhitespace = (s: string) =>
    String(s || '')
      .replace(/\u0000/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

  const shouldAutoOcrPdf = (text: string) => normalizeWhitespace(text).length < 40;

  const ocrPdfPages = async (pdf: any, maxPages: number) => {
    const { recognize } = await import('tesseract.js');
    const pages = Math.min(maxPages, pdf.numPages || 0);
    const parts: string[] = [];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('OCR失败：无法创建Canvas渲染上下文');

    for (let i = 1; i <= pages; i++) {
      const page = await pdf.getPage(i);
      // 适度放大以提升OCR质量，同时限制像素避免卡顿
      const viewport1 = page.getViewport({ scale: 1 });
      const targetWidth = Math.min(1400, Math.max(900, viewport1.width));
      const scale = targetWidth / viewport1.width;
      const viewport = page.getViewport({ scale });

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/png');

      const result = await recognize(dataUrl, 'chi_sim+eng');
      const text = normalizeWhitespace(result?.data?.text || '');
      if (text) parts.push(`### 第 ${i} 页（OCR）\n${text}`);
    }

    return parts.join('\n\n').trim();
  };
  
  // TXT文件直接读取
  if (fileType === 'txt') {
    const text = await file.text();
    return wrapMarkdown(normalizeWhitespace(text), ['类型: txt', `文件名: ${file.name}`]);
  }
  
  // PDF文件
  if (fileType === 'pdf') {
    try {
      // 动态导入PDF解析库
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pageParts: string[] = [];
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        const cleaned = normalizeWhitespace(pageText);
        if (cleaned) pageParts.push(`### 第 ${i} 页\n${cleaned}`);
      }
      
      const extracted = pageParts.join('\n\n').trim();

      // 扫描件/图片PDF：自动OCR（仅在文本极少时触发，且只跑前几页）
      if (shouldAutoOcrPdf(extracted)) {
        try {
          const ocrText = await ocrPdfPages(pdf, 3);
          if (ocrText) {
            return wrapMarkdown(
              `## 正文\n\n${ocrText}`,
              ['类型: pdf', `页数: ${pdf.numPages}`, '模式: OCR(自动)']
            );
          }
        } catch (e) {
          // OCR失败则回退到原提取结果
        }
      }

      const body = extracted ? `## 正文\n\n${extracted}` : `## 正文\n\n（未能从PDF中提取到可读文本，可能是扫描件/图片型PDF）`;
      return wrapMarkdown(body, ['类型: pdf', `页数: ${pdf.numPages}`, extracted ? '模式: 文本提取' : '模式: 文本提取(为空)']);
    } catch (error) {
      throw new Error('PDF解析失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  }
  
  // Word文件（.docx）
  if (fileType === 'docx') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammothBrowser.extractRawText({ arrayBuffer });
      const text = normalizeWhitespace(String(result?.value || ''));
      const body = text ? `## 正文\n\n${text}` : `## 正文\n\n（未能从DOCX中提取到可读文本，可能主要为图片/扫描内容）`;
      return wrapMarkdown(body, ['类型: docx', '模式: 文本提取']);
    } catch (error) {
      throw new Error('Word文档解析失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  }

  if (fileType === 'doc') {
    throw new Error('暂不支持旧版 .doc 二进制格式，请先转换为 .docx 后上传');
  }

  // Excel 文件（.xlsx / .xls）
  if (fileType === 'xlsx' || fileType === 'xls') {
    try {
      const xlsx = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = xlsx.read(arrayBuffer, { type: 'array' });

      const parts: string[] = [];
      workbook.SheetNames.forEach((sheetName, idx) => {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) return;
        const csv = xlsx.utils.sheet_to_csv(worksheet, { blankrows: false }).trim();
        if (csv.length > 0) {
          parts.push(`## 工作表 ${idx + 1}: ${sheetName}\n\n\`\`\`csv\n${csv}\n\`\`\``);
        }
      });

      const text = parts.join('\n\n').trim();
      if (!text) {
        throw new Error('Excel中未提取到可读文本（可能仅包含图片或图表）');
      }
      return wrapMarkdown(text, ['类型: excel', `工作表: ${workbook.SheetNames.length}`]);
    } catch (error) {
      throw new Error('Excel解析失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  }

  // PowerPoint 文件（.pptx）
  if (fileType === 'pptx') {
    try {
      const JSZip = (await import('jszip')).default;
      const parser = new DOMParser();
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      const slideFileNames = Object.keys(zip.files)
        .filter(name => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
        .sort((a, b) => {
          const ai = Number(a.match(/slide(\d+)\.xml/i)?.[1] || 0);
          const bi = Number(b.match(/slide(\d+)\.xml/i)?.[1] || 0);
          return ai - bi;
        });

      const slides: string[] = [];
      for (const fileName of slideFileNames) {
        const xmlText = await zip.files[fileName].async('text');
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
        const textNodes = Array.from(xmlDoc.getElementsByTagName('a:t'));
        const slideText = textNodes
          .map(node => node.textContent?.trim() || '')
          .filter(Boolean)
          .join(' ');
        if (slideText) {
          const slideNo = Number(fileName.match(/slide(\d+)\.xml/i)?.[1] || slides.length + 1);
          slides.push(`## 幻灯片 ${slideNo}\n\n${normalizeWhitespace(slideText)}`);
        }
      }

      const fullText = slides.join('\n\n').trim();
      if (!fullText) {
        throw new Error('PPTX中未提取到可读文本（可能主要是图片）');
      }
      return wrapMarkdown(fullText, ['类型: pptx', `幻灯片: ${slideFileNames.length}`]);
    } catch (error) {
      throw new Error('PPTX解析失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  }

  if (fileType === 'ppt') {
    throw new Error('暂不支持旧版 .ppt 二进制格式，请先转换为 .pptx 后上传');
  }
  
  throw new Error(`不支持的文件类型：${fileType}。请上传 TXT / PDF / Word / Excel / PPTX 文件。`);
}
