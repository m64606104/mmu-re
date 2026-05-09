/**
 * 信件PDF导出工具
 * 将信件导出为精美的PDF格式
 */

import { jsPDF } from 'jspdf';
import { Letter } from '../types/letter';

// PDF导出选项
export interface PDFExportOptions {
  selectedRounds?: number[]; // 选择的轮次，undefined表示全部
  includeUserLetters?: boolean; // 是否包含用户信件
  includeAIReplies?: boolean; // 是否包含AI回复
}

// 由于jsPDF不支持中文，需要使用canvas绘制
export async function exportLetterToPDF(letter: Letter, options: PDFExportOptions = {}): Promise<void> {
  const {
    selectedRounds,
    includeUserLetters = true,
    includeAIReplies = true
  } = options;
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // 过滤轮次
  const roundsToExport = selectedRounds
    ? letter.conversationRounds.filter(r => selectedRounds.includes(r.roundNumber))
    : letter.conversationRounds;

  // 计算总页数：每轮用户信1页 + AI回复1页
  let totalPages = 0;
  for (const round of roundsToExport) {
    if (includeUserLetters) totalPages++;
    if (round.aiReply && includeAIReplies) totalPages++;
  }

  let currentPage = 0;
  let isFirstPage = true;

  // 辅助函数：绘制页面装饰
  const drawPageDecoration = () => {
    // 背景色
    pdf.setFillColor(255, 250, 240);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // 左侧金色边框
    pdf.setDrawColor(218, 165, 32); // 金色
    pdf.setLineWidth(3);
    pdf.line(10, 10, 10, pageHeight - 10);
    
    // 顶部金色边框
    pdf.setLineWidth(3);
    pdf.line(10, 10, pageWidth - 10, 10);
    
    // 内层边框
    pdf.setDrawColor(255, 200, 100);
    pdf.setLineWidth(0.5);
    pdf.rect(12, 12, pageWidth - 24, pageHeight - 24);
  };

  // 辅助函数：绘制页头（标题+页码+日期）
  const drawPageHeader = async (pageNum: number, subtitle?: string) => {
    let y = 25;
    
    // 页码（左上角）
    await drawText(pdf, `${pageNum}/${totalPages}`, 18, y, {
      size: 16,
      bold: true,
      color: [100, 100, 100]
    });
    
    // 标题（居中）
    await drawText(pdf, letter.isBottle ? '漂流瓶信件' : '慢邮件', pageWidth / 2, y, {
      size: 18,
      align: 'center',
      bold: true
    });
    y += 12;
    
    // 子标题（如果有）
    if (subtitle && isFirstPage) {
      await drawText(pdf, subtitle, pageWidth / 2, y, {
        size: 12,
        align: 'center',
        color: [100, 100, 100]
      });
      y += 10;
    }
    
    // 日期（右上角）
    const dateStr = new Date(letter.sentAt).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    await drawText(pdf, dateStr, pageWidth - margin, 28, { 
      size: 10, 
      align: 'right',
      color: [120, 120, 120]
    });
    
    // 分隔线
    y += 8;
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.line(margin, y, pageWidth - margin, y);
    
    return y + 8;
  };

  // 生成子标题
  const subtitle = `${letter.receiverName}的通信`;

  // 绘制各轮对话（每轮分页）
  for (const round of roundsToExport) {
    // === 用户信件（单独一页）===
    if (includeUserLetters) {
      currentPage++;
      if (currentPage > 1) {
        pdf.addPage();
      }
      
      // 绘制页面装饰
      drawPageDecoration();
      
      // 绘制页头
      let yPosition = await drawPageHeader(currentPage, isFirstPage ? subtitle : undefined);
      isFirstPage = false;
      
      // 轮次标题
      await drawText(pdf, `第 ${round.roundNumber} 轮`, margin, yPosition, { 
        size: 14, 
        bold: true 
      });
      yPosition += 12;
      
      // 【我的信】标签
      await drawText(pdf, '【我的信】', margin, yPosition, { 
        size: 11, 
        bold: true,
        color: [100, 100, 100]
      });
      yPosition += 8;
      
      // 我的信时间
      const userDateStr = new Date(round.userLetter.sentAt).toLocaleDateString('zh-CN');
      await drawText(pdf, `寄出时间：${userDateStr}`, margin, yPosition, { 
        size: 9,
        color: [120, 120, 120]
      });
      yPosition += 10;
      
      // 分隔线
      pdf.setDrawColor(230, 230, 230);
      pdf.setLineWidth(0.3);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;
      
      // 【回信】标签
      await drawText(pdf, '【回信】', margin, yPosition, { 
        size: 11, 
        bold: true,
        color: [100, 100, 100]
      });
      yPosition += 8;
      
      // 用户信件内容
      yPosition = await drawMultilineText(
        pdf, 
        round.userLetter.content, 
        margin, 
        yPosition, 
        contentWidth
      );
      
      // 落款
      yPosition += 10;
      if (!letter.isAnonymous) {
        await drawText(pdf, letter.senderName || '我', pageWidth - margin - 10, yPosition, {
          size: 10,
          align: 'right',
          color: [100, 100, 100]
        });
      }
    }

    // === AI回信（单独一页）===
    if (round.aiReply && includeAIReplies) {
      currentPage++;
      pdf.addPage();
      
      // 绘制页面装饰
      drawPageDecoration();
      
      // 绘制页头
      let yPosition = await drawPageHeader(currentPage);
      
      // 轮次标题
      await drawText(pdf, `第 ${round.roundNumber} 轮`, margin, yPosition, { 
        size: 14, 
        bold: true 
      });
      yPosition += 12;
      
      // 【我的信】标签（占位，表示这是回信页）
      await drawText(pdf, '【我的信】', margin, yPosition, { 
        size: 11, 
        bold: true,
        color: [200, 200, 200]
      });
      yPosition += 8;
      
      // 提示文字
      await drawText(pdf, '（见上一页）', margin, yPosition, { 
        size: 9,
        color: [180, 180, 180]
      });
      yPosition += 10;
      
      // 分隔线
      pdf.setDrawColor(230, 230, 230);
      pdf.setLineWidth(0.3);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;
      
      // 【回信】标签
      await drawText(pdf, '【回信】', margin, yPosition, { 
        size: 11, 
        bold: true,
        color: [100, 100, 100]
      });
      yPosition += 8;
      
      // 回信时间
      const replyDateStr = new Date(round.aiReply.repliedAt).toLocaleDateString('zh-CN');
      await drawText(pdf, `回复时间：${replyDateStr}`, margin, yPosition, { 
        size: 9,
        color: [120, 120, 120]
      });
      yPosition += 10;
      
      // 分隔线
      pdf.setDrawColor(230, 230, 230);
      pdf.setLineWidth(0.3);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;
      
      // AI回信内容
      yPosition = await drawMultilineText(
        pdf, 
        round.aiReply.content, 
        margin, 
        yPosition, 
        contentWidth
      );
      
      // 落款
      yPosition += 10;
      await drawText(pdf, letter.receiverName, pageWidth - margin - 10, yPosition, {
        size: 10,
        align: 'right',
        color: [100, 100, 100]
      });
    }
  }

  // 生成文件名
  const fileName = `信件_${letter.receiverName}_${new Date().toISOString().split('T')[0]}.pdf`;
  
  // 下载PDF
  pdf.save(fileName);
}

/**
 * 批量导出多封信件为一个PDF
 */
export async function exportMultipleLettersToPDF(letters: Letter[]): Promise<void> {
  if (letters.length === 0) {
    throw new Error('没有要导出的信件');
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  for (let i = 0; i < letters.length; i++) {
    if (i > 0) {
      pdf.addPage();
    }
    await drawLetterOnPage(pdf, letters[i], i + 1, letters.length);
  }

  const fileName = `信件集合_${letters.length}封_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
}

/**
 * 在当前页绘制单封信件
 */
async function drawLetterOnPage(pdf: jsPDF, letter: Letter, index: number, total: number): Promise<void> {
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // 背景
  pdf.setFillColor(255, 250, 240);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // 装饰边框
  pdf.setDrawColor(255, 140, 0);
  pdf.setLineWidth(0.5);
  pdf.rect(15, 15, pageWidth - 30, pageHeight - 30);

  let yPosition = 30;

  // 页码
  await drawText(pdf, `${index} / ${total}`, pageWidth - margin, 20, {
    size: 9,
    align: 'right',
    color: [150, 150, 150]
  });

  // 标题
  await drawText(pdf, letter.isBottle ? '漂流瓶信件' : '慢邮件', pageWidth / 2, yPosition, {
    size: 18,
    align: 'center',
    bold: true
  });
  yPosition += 12;

  // 基本信息
  await drawText(pdf, `致：${letter.receiverName}`, margin, yPosition, { size: 12 });
  yPosition += 8;

  const dateStr = new Date(letter.sentAt).toLocaleDateString('zh-CN');
  await drawText(pdf, dateStr, pageWidth - margin, yPosition, { size: 10, align: 'right' });
  yPosition += 12;

  // 内容（仅显示最新一轮）
  const latestRound = letter.conversationRounds[letter.conversationRounds.length - 1];
  
  // 用户信件
  await drawText(pdf, '【我的信】', margin, yPosition, { size: 11, bold: true });
  yPosition += 6;
  yPosition = await drawMultilineText(pdf, latestRound.userLetter.content, margin, yPosition, contentWidth, 100);
  yPosition += 10;

  // AI回信
  if (latestRound.aiReply) {
    await drawText(pdf, '【回信】', margin, yPosition, { size: 11, bold: true });
    yPosition += 6;
    yPosition = await drawMultilineText(pdf, latestRound.aiReply.content, margin, yPosition, contentWidth, 100);
  }

  // 落款
  if (!letter.isAnonymous) {
    await drawText(pdf, `from ${letter.senderName || '我'}`, pageWidth - margin - 10, pageHeight - 25, {
      size: 11,
      align: 'right'
    });
  }
}

/**
 * 绘制文本（使用Canvas转图片方式支持中文）
 */
async function drawText(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  options: {
    size?: number;
    align?: 'left' | 'center' | 'right';
    bold?: boolean;
    color?: [number, number, number];
  } = {}
): Promise<void> {
  const { size = 12, align = 'left', bold = false, color = [0, 0, 0] } = options;

  // 创建临时canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  // 设置字体
  const fontSize = size * 3; // 放大以提高清晰度
  ctx.font = `${bold ? 'bold ' : ''}${fontSize}px "Microsoft YaHei", "SimSun", sans-serif`;
  
  // 测量文本宽度
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const textHeight = fontSize * 1.2;
  
  // 设置canvas尺寸
  canvas.width = textWidth + 10;
  canvas.height = textHeight;
  
  // 重新设置字体（canvas尺寸改变后会重置）
  ctx.font = `${bold ? 'bold ' : ''}${fontSize}px "Microsoft YaHei", "SimSun", sans-serif`;
  ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
  ctx.textBaseline = 'top';
  
  // 绘制文本
  ctx.fillText(text, 5, 5);
  
  // 转换为图片并添加到PDF
  const imgData = canvas.toDataURL('image/png');
  const imgWidth = (textWidth + 10) / 3 / 3.78; // 转换为mm
  const imgHeight = textHeight / 3 / 3.78;
  
  let finalX = x;
  if (align === 'center') {
    finalX = x - imgWidth / 2;
  } else if (align === 'right') {
    finalX = x - imgWidth;
  }
  
  pdf.addImage(imgData, 'PNG', finalX, y, imgWidth, imgHeight);
}

/**
 * 绘制多行文本
 */
async function drawMultilineText(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  maxLines?: number
): Promise<number> {
  const lineHeight = 6;
  const lines = splitTextIntoLines(text, maxWidth);
  
  const displayLines = maxLines ? lines.slice(0, maxLines) : lines;
  
  for (let i = 0; i < displayLines.length; i++) {
    await drawText(pdf, displayLines[i], x, y + i * lineHeight, { size: 10 });
  }
  
  if (maxLines && lines.length > maxLines) {
    await drawText(pdf, '...', x, y + maxLines * lineHeight, { size: 10 });
    return y + (maxLines + 1) * lineHeight;
  }
  
  return y + displayLines.length * lineHeight;
}

/**
 * 将文本分割成多行
 */
function splitTextIntoLines(text: string, maxWidth: number): string[] {
  const words = text.split('');
  const lines: string[] = [];
  let currentLine = '';
  const charsPerLine = Math.floor(maxWidth / 4); // 粗略估算每行字符数
  
  for (const char of words) {
    if (char === '\n') {
      lines.push(currentLine);
      currentLine = '';
      continue;
    }
    
    if (currentLine.length >= charsPerLine) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine += char;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}
