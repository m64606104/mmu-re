/**
 * 文档解析工具
 * 支持PDF和Word文档的文本提取
 */

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// 配置PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * 解析PDF文件
 */
export const parsePDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // 遍历所有页面
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // 提取文本
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('PDF解析失败:', error);
    throw new Error('PDF文件解析失败，请确保文件格式正确');
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
