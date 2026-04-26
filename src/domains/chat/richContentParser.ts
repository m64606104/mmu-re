import type { Message } from '../../types';
import { parseEnhancedDocument } from '../../utils/enhancedDocumentParser';
import { SmartLinkParser } from '../../utils/smartLinkParser';

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

export function parseRichContentMarkers(options: ParseRichContentOptions): ParseRichContentResult {
  const { baseId, currentExtraCount } = options;
  let content = options.content;
  const extraMessages: Message[] = [];
  const logs: string[] = [];

  logs.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logs.push('📄 [文档解析] 开始 (优先级最高)');
  logs.push(`原始内容长度: ${content.length}`);
  logs.push(`原始内容预览: ${content.substring(0, 200)}`);

  const parsedDoc = parseEnhancedDocument(content);
  if (parsedDoc) {
    logs.push('✅ [文档解析] 成功识别文档');
    logs.push(`   标题: ${parsedDoc.title}`);
    logs.push(`   类型: ${parsedDoc.type}`);
    logs.push(`   内容长度: ${parsedDoc.content.length}`);
    extraMessages.push({
      id: `${baseId}_doc`,
      role: 'assistant',
      content: `发送了文档「${parsedDoc.title}」`,
      timestamp: Date.now() + 100 + (currentExtraCount + extraMessages.length) * 10,
      document: {
        title: parsedDoc.title,
        content: parsedDoc.content,
        type: parsedDoc.type,
        greeting: parsedDoc.greeting || '请查收',
      },
    });
    content = '';
    logs.push('📄 [文档解析] 文档已提取为单独消息');
  } else {
    logs.push('ℹ️ [文档解析] 未检测到文档标记');
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
