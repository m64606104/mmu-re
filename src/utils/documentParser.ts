/**
 * 文档解析工具
 * 支持PDF和Word文档的文本提取
 */

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// 配置PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * 解析PDF文件（优化学术论文支持）
 */
export const parsePDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ 
      data: arrayBuffer,
      // 禁用字体渲染以提高性能
      disableFontFace: true,
      // 增加兼容性
      standardFontDataUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/standard_fonts/`
    }).promise;
    
    let fullText = '';
    console.log(`📄 开始解析PDF，共${pdf.numPages}页...`);
    
    // 遍历所有页面
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // 改进文本提取，保留段落结构
      let lastY = -1;
      let pageText = '';
      
      textContent.items.forEach((item: any) => {
        const currentY = item.transform[5];
        
        // 检测换行（Y坐标变化）
        if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
          pageText += '\n';
        }
        
        // 添加文本，保留空格
        pageText += item.str;
        
        // 如果文本以句号、问号、感叹号结尾，添加空格
        if (/[。.!！?？]$/.test(item.str)) {
          pageText += ' ';
        }
        
        lastY = currentY;
      });
      
      fullText += `\n=== 第 ${pageNum} 页 ===\n${pageText.trim()}\n`;
      
      // 每10页报告一次进度
      if (pageNum % 10 === 0) {
        console.log(`  已解析 ${pageNum}/${pdf.numPages} 页`);
      }
    }
    
    // 清理多余的空白
    fullText = fullText
      .replace(/\n{3,}/g, '\n\n')  // 多个换行替换为两个
      .replace(/\s+/g, ' ')  // 多个空格替换为一个
      .trim();
    
    console.log(`✅ PDF解析完成，提取了 ${fullText.length} 个字符`);
    return fullText;
    
  } catch (error: any) {
    console.error('PDF解析失败:', error);
    
    // 提供更详细的错误信息
    if (error.message?.includes('Invalid PDF')) {
      throw new Error('PDF文件损坏或格式不正确，请尝试用其他PDF阅读器重新保存');
    } else if (error.message?.includes('password')) {
      throw new Error('该PDF文件已加密，请先解除密码保护');
    } else {
      throw new Error(`PDF解析失败: ${error.message || '未知错误'}\n\n💡 提示：如果是扫描版PDF，请使用带OCR功能的PDF转文本工具`);
    }
  }
};

/**
 * 解析Word文档(.docx)
 */
export const parseWord = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    if (result.messages.length > 0) {
      console.warn('Word解析警告:', result.messages);
    }
    
    return result.value.trim();
  } catch (error) {
    console.error('Word解析失败:', error);
    throw new Error('Word文档解析失败，请确保文件格式正确');
  }
};

/**
 * 根据文件类型自动选择解析器
 */
export const parseDocument = async (file: File): Promise<string> => {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.pdf')) {
    return await parsePDF(file);
  } else if (fileName.endsWith('.docx')) {
    return await parseWord(file);
  } else if (fileName.endsWith('.doc')) {
    throw new Error('不支持.doc格式，请使用.docx格式（Word 2007及以上版本）');
  } else if (fileName.endsWith('.txt')) {
    // 纯文本文件直接读取
    return await file.text();
  } else {
    throw new Error('不支持的文件格式，请上传PDF、DOCX或TXT文件');
  }
};
