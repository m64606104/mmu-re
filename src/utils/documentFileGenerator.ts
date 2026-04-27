import { Document, Packer, Paragraph, TextRun } from 'docx';
import type { OriginalDocumentFile } from '../types';

function stripHtmlToPlainText(input: string): string {
  if (!input) return '';
  const div = document.createElement('div');
  div.innerHTML = input;
  return (div.textContent || div.innerText || '').trim();
}

export async function generateDocxOriginalFile(
  title: string,
  content: string
): Promise<OriginalDocumentFile> {
  const plainTitle = (title || '未命名文档').trim();
  const plainBody = stripHtmlToPlainText(content).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = plainBody.split('\n');
  const paragraphs: Paragraph[] = [];

  lines.forEach((rawLine) => {
    const line = rawLine.replace(/\t/g, '    ').trimEnd();
    const trimmed = line.trim();

    // 保留空行，避免段落粘连
    if (!trimmed) {
      paragraphs.push(new Paragraph({ children: [new TextRun('')] }));
      return;
    }

    // 粗略识别列表项，给一点缩进提升可读性
    const isListItem = /^(\d+[\.\)、]|[-*•])\s+/.test(trimmed);
    paragraphs.push(
      new Paragraph({
        indent: isListItem ? { left: 320 } : undefined,
        spacing: { after: 140, line: 360 },
        children: [new TextRun(trimmed)],
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            spacing: { after: 220 },
            children: [new TextRun({ text: plainTitle, bold: true, size: 32 })],
          }),
          ...(paragraphs.length > 0 ? paragraphs : [new Paragraph('（无正文）')]),
        ],
      },
    ],
  });

  const base64 = await Packer.toBase64String(doc);
  return {
    fileName: `${plainTitle}.docx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileSize: Math.floor((base64.length * 3) / 4),
    base64Data: `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`,
  };
}
