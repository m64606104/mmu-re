import type { Message } from '../../types';
import { SmartLinkParser } from '../../utils/smartLinkParser';
import { generateDocxOriginalFile } from '../../utils/documentFileGenerator';

type ParseRichContentOptions = {
  content: string;
  baseId: string;
  currentExtraCount: number;
};

type ParseRichContentResult = {
  content: string;
  extraMessages: Message[];
  logs: string[];
};

type NativeDocumentPayload = {
  title: string;
  content: string;
  type: 'text' | 'markdown' | 'code';
  greeting?: string;
};

function normalizeDocType(raw: unknown): 'text' | 'markdown' | 'code' {
  if (raw === 'markdown') return 'markdown';
  if (raw === 'code') return 'code';
  return 'text';
}

function tryParseJsonObject(input: string): any | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : trimmed).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const objText = candidate.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(objText);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function parseNativeDocumentPayload(content: string): NativeDocumentPayload | null {
  const parsed = tryParseJsonObject(content);
  if (!parsed || typeof parsed !== 'object') return null;
  const docCandidate = (parsed as any).document && typeof (parsed as any).document === 'object'
    ? (parsed as any).document
    : parsed;
  const title = typeof docCandidate.title === 'string' ? docCandidate.title.trim() : '';
  const body = typeof docCandidate.content === 'string' ? docCandidate.content.trim() : '';
  if (!title || !body) return null;

  return {
    title,
    content: body,
    type: normalizeDocType(docCandidate.type),
    greeting: typeof docCandidate.greeting === 'string' ? docCandidate.greeting.trim() : undefined,
  };
}

export async function parseRichContentMarkers(options: ParseRichContentOptions): Promise<ParseRichContentResult> {
  const { baseId, currentExtraCount } = options;
  let content = options.content;
  const extraMessages: Message[] = [];
  const logs: string[] = [];

  logs.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logs.push('📄 [文档解析] 开始 (优先级最高)');
  logs.push(`原始内容长度: ${content.length}`);
  logs.push(`原始内容预览: ${content.substring(0, 200)}`);

  const parsedDoc = parseNativeDocumentPayload(content);
  if (parsedDoc) {
    logs.push('✅ [文档解析] 命中文档协议(JSON)');
    logs.push(`   标题: ${parsedDoc.title}`);
    logs.push(`   类型: ${parsedDoc.type}`);
    logs.push(`   内容长度: ${parsedDoc.content.length}`);
    let originalFile;
    try {
      originalFile = await generateDocxOriginalFile(parsedDoc.title, parsedDoc.content);
    } catch (error) {
      logs.push(`⚠️ [文档解析] 生成真实docx失败: ${error instanceof Error ? error.message : String(error)}`);
    }
    extraMessages.push({
      id: `${baseId}_doc`,
      role: 'assistant',
      content: `已生成文档附件「${parsedDoc.title}」`,
      timestamp: Date.now() + 100 + (currentExtraCount + extraMessages.length) * 10,
      document: {
        title: parsedDoc.title,
        content: parsedDoc.content,
        type: parsedDoc.type,
        greeting: parsedDoc.greeting || '请查收',
        ...(originalFile ? { originalFile } : {}),
      },
    });
    content = '';
    logs.push('📄 [文档解析] 文档已提取为单独消息');
  } else {
    logs.push('ℹ️ [文档解析] 未命中文档协议');
  }
  logs.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (content) {
    const parsedLink = SmartLinkParser.parseMessage(content);
    if (parsedLink.linkPreviews.length > 0) {
      logs.push(`🔗 检测到${parsedLink.linkPreviews.length}个链接预览`);
      parsedLink.linkPreviews.forEach((linkPreview, idx) => {
        extraMessages.push({
          id: `${baseId}_link_${idx}`,
          role: 'assistant',
          content: `分享了${linkPreview.platform === 'xiaohongshu' ? '小红书' : linkPreview.platform === 'zhihu' ? '知乎' : ''}链接`,
          timestamp: Date.now() + 100 + (currentExtraCount + extraMessages.length) * 10,
          linkPreview,
        });
      });
      content = parsedLink.textContent;
    }
  }

  return { content, extraMessages, logs };
}
