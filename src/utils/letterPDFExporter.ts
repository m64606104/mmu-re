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

  const pageWidth = 210; // A4宽度
  const pageHeight = 297; // A4高度
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // 背景色
  pdf.setFillColor(255, 250, 240); // 米黄色信纸背景
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // 绘制信纸装饰边框
  pdf.setDrawColor(255, 140, 0); // 橙色
  pdf.setLineWidth(0.5);
  pdf.rect(15, 15, pageWidth - 30, pageHeight - 30);
  
  pdf.setDrawColor(255, 200, 100);
  pdf.setLineWidth(0.3);
  pdf.rect(16, 16, pageWidth - 32, pageHeight - 32);

  let yPosition = 30;

  // 标题
  await drawText(pdf, letter.isBottle ? '漂流瓶信件' : '慢邮件', pageWidth / 2, yPosition, {
    size: 20,
    align: 'center',
    bold: true
  });
  yPosition += 15;

  // 收信人信息
  await drawText(pdf, `致：${letter.receiverName}`, margin, yPosition, { size: 14 });
  yPosition += 10;

  // 日期
  const dateStr = new Date(letter.sentAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  await drawText(pdf, dateStr, pageWidth - margin, yPosition, { size: 10, align: 'right' });
  yPosition += 15;

  // 分隔线
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // 过滤轮次
  const roundsToExport = selectedRounds
    ? letter.conversationRounds.filter(r => selectedRounds.includes(r.roundNumber))
    : letter.conversationRounds;

  // 绘制各轮对话（美观格式）
  for (const round of roundsToExport) {
    // 轮次标题
    if (yPosition > pageHeight - 80) {
      pdf.addPage();
      pdf.setFillColor(255, 250, 240);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      pdf.setDrawColor(255, 140, 0);
      pdf.setLineWidth(0.5);
      pdf.rect(15, 15, pageWidth - 30, pageHeight - 30);
      yPosition = margin;
    }
    
    // 轮次标题背景
    pdf.setFillColor(255, 240, 220);
    pdf.roundedRect(margin, yPosition, contentWidth, 10, 2, 2, 'F');
    await drawText(pdf, `第 ${round.roundNumber} 轮`, margin + 5, yPosition + 2, { size: 11, bold: true });
    yPosition += 12;

    // 用户信件
    if (includeUserLetters) {
      // 用户信件卡片背景
      const userCardHeight = 60; // 预估高度
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin + 5, yPosition, contentWidth - 10, userCardHeight, 3, 3, 'F');
      
      // 用户信件头部
      pdf.setFillColor(255, 220, 180);
      pdf.roundedRect(margin + 5, yPosition, contentWidth - 10, 8, 3, 3, 'F');
      await drawText(pdf, `✉️ 我的信 → ${letter.receiverName}`, margin + 10, yPosition + 1.5, { size: 10, bold: true });
      yPosition += 10;

      // 用户信件内容
      const contentStartY = yPosition;
      yPosition = await drawMultilineText(pdf, round.userLetter.content, margin + 10, yPosition, contentWidth - 20);
      
      // 实际内容高度
      const actualContentHeight = yPosition - contentStartY;
      
      // 重新绘制正确高度的卡片背景
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin + 5, contentStartY - 10, contentWidth - 10, actualContentHeight + 15, 3, 3, 'F');
      pdf.setFillColor(255, 220, 180);
      pdf.roundedRect(margin + 5, contentStartY - 10, contentWidth - 10, 8, 3, 3, 'F');
      await drawText(pdf, `✉️ 我的信 → ${letter.receiverName}`, margin + 10, contentStartY - 8.5, { size: 10, bold: true });
      
      // 重新绘制内容（覆盖）
      await drawMultilineText(pdf, round.userLetter.content, margin + 10, contentStartY, contentWidth - 20);
      
      yPosition += 3;
      
      // 日期和邮票
      const userDateStr = new Date(round.userLetter.sentAt).toLocaleDateString('zh-CN');
      await drawText(pdf, userDateStr, margin + 10, yPosition, { size: 8, color: [120, 120, 120] });
      
      // 邮票图标
      await drawText(pdf, '📮', pageWidth - margin - 15, yPosition - 1, { size: 12 });
      
      yPosition += 10;
    }

    // AI回信
    if (round.aiReply && includeAIReplies) {
      if (yPosition > pageHeight - 70) {
        pdf.addPage();
        pdf.setFillColor(255, 250, 240);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        pdf.setDrawColor(255, 140, 0);
        pdf.setLineWidth(0.5);
        pdf.rect(15, 15, pageWidth - 30, pageHeight - 30);
        yPosition = margin;
      }

      // AI回信卡片背景
      const replyCardHeight = 60; // 预估高度
      pdf.setFillColor(250, 250, 255);
      pdf.roundedRect(margin + 5, yPosition, contentWidth - 10, replyCardHeight, 3, 3, 'F');
      
      // AI回信头部
      pdf.setFillColor(200, 220, 255);
      pdf.roundedRect(margin + 5, yPosition, contentWidth - 10, 8, 3, 3, 'F');
      await drawText(pdf, `💌 ${letter.receiverName}的回信`, margin + 10, yPosition + 1.5, { size: 10, bold: true });
      yPosition += 10;

      // AI回信内容
      const replyStartY = yPosition;
      yPosition = await drawMultilineText(pdf, round.aiReply.content, margin + 10, yPosition, contentWidth - 20);
      
      // 实际内容高度
      const actualReplyHeight = yPosition - replyStartY;
      
      // 重新绘制正确高度的卡片背景
      pdf.setFillColor(250, 250, 255);
      pdf.roundedRect(margin + 5, replyStartY - 10, contentWidth - 10, actualReplyHeight + 15, 3, 3, 'F');
      pdf.setFillColor(200, 220, 255);
      pdf.roundedRect(margin + 5, replyStartY - 10, contentWidth - 10, 8, 3, 3, 'F');
      await drawText(pdf, `💌 ${letter.receiverName}的回信`, margin + 10, replyStartY - 8.5, { size: 10, bold: true });
      
      // 重新绘制内容（覆盖）
      await drawMultilineText(pdf, round.aiReply.content, margin + 10, replyStartY, contentWidth - 20);
      
      yPosition += 3;
      
      const replyDateStr = new Date(round.aiReply.repliedAt).toLocaleDateString('zh-CN');
      await drawText(pdf, replyDateStr, margin + 10, yPosition, { size: 8, color: [120, 120, 120] });
      yPosition += 10;
    }

    // 轮次间分隔线
    if (yPosition < pageHeight - 50) {
      pdf.setDrawColor(230, 230, 230);
      pdf.setLineWidth(0.3);
      pdf.line(margin + 10, yPosition, pageWidth - margin - 10, yPosition);
      yPosition += 12;
    }
  }

  // 落款
  if (yPosition > pageHeight - 40) {
    pdf.addPage();
    yPosition = margin;
  }

  if (!letter.isAnonymous) {
    await drawText(pdf, `from ${letter.senderName || '我'}`, pageWidth - margin - 10, pageHeight - 30, {
      size: 12,
      align: 'right'
    });
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
