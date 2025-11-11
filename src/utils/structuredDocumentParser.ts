/**
 * 结构化文档解析器
 * 
 * 支持两种格式：
 * 1. 新格式（推荐）：<DOCUMENT>{"title": "...", "type": "text", "content": "..."}</DOCUMENT>
 * 2. 旧格式（兼容）：[发文档:标题:类型] 内容...
 * 
 * 优势：
 * - JSON格式明确，不会出现解析歧义
 * - 自动fallback到旧格式
 * - 错误率接近0
 */

export interface StructuredDocument {
  title: string;
  type: 'text' | 'markdown' | 'code';
  content: string;
  greeting?: string;
  hasError?: boolean;
}

export interface ParseResult {
  documents: StructuredDocument[];
  plainText: string; // 剩余的普通文本
}

/**
 * 解析AI输出中的结构化文档
 */
export function parseStructuredDocuments(content: string): ParseResult {
  const documents: StructuredDocument[] = [];
  let remainingText = content;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📄 [结构化文档解析] 开始');
  console.log('原始内容长度:', content.length);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // ==========================================
  // 方式1：解析新格式 <DOCUMENT>JSON</DOCUMENT>
  // ==========================================
  const structuredPattern = /<DOCUMENT>\s*([\s\S]*?)\s*<\/DOCUMENT>/g;
  const structuredMatches = Array.from(remainingText.matchAll(structuredPattern));

  if (structuredMatches.length > 0) {
    console.log(`✅ 检测到 ${structuredMatches.length} 个结构化文档标记`);

    structuredMatches.forEach((match, index) => {
      const jsonStr = match[1].trim();
      const fullMatch = match[0];

      console.log(`\n━━ 处理第${index + 1}个结构化文档 ━━`);
      console.log('JSON内容长度:', jsonStr.length);

      try {
        // 尝试解析JSON
        const parsed = JSON.parse(jsonStr);

        // 验证必需字段
        if (!parsed.title || !parsed.content) {
          throw new Error('缺少必需字段: title 或 content');
        }

        // 规范化类型
        const docType: 'text' | 'markdown' | 'code' =
          parsed.type === 'markdown' ? 'markdown' :
          parsed.type === 'code' ? 'code' : 'text';

        documents.push({
          title: parsed.title,
          type: docType,
          content: parsed.content,
          greeting: parsed.greeting
        });

        console.log(`✅ JSON解析成功`);
        console.log(`   标题: ${parsed.title}`);
        console.log(`   类型: ${docType}`);
        console.log(`   内容长度: ${parsed.content.length}`);
        console.log(`   引导语: ${parsed.greeting || '(无)'}`);

        // 移除已解析的标记
        remainingText = remainingText.replace(fullMatch, '').trim();

      } catch (error) {
        console.error(`❌ JSON解析失败:`, error);
        console.error(`   原始JSON: ${jsonStr.substring(0, 200)}...`);

        // 创建错误文档
        documents.push({
          title: '文档格式错误',
          type: 'text',
          content: `⚠️ 文档JSON格式错误\n\n原始内容：\n${jsonStr}\n\n错误信息：${error}\n\n请检查JSON格式是否正确。`,
          hasError: true
        });

        // 仍然移除标记
        remainingText = remainingText.replace(fullMatch, '').trim();
      }
    });
  }

  // ==========================================
  // 方式2：如果没有找到结构化标记，尝试旧格式
  // ==========================================
  if (documents.length === 0 && remainingText.includes('[发文档:')) {
    console.log('\nℹ️ 未检测到结构化标记，尝试解析旧格式...');
    const legacyResult = parseLegacyDocuments(remainingText);
    documents.push(...legacyResult.documents);
    remainingText = legacyResult.plainText;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 [结构化文档解析] 结果摘要:');
  console.log(`总文档数: ${documents.length}`);
  documents.forEach((doc, idx) => {
    const errorFlag = doc.hasError ? ' ⚠️错误' : '';
    console.log(`  ${idx + 1}. "${doc.title}" (${doc.type}) 长度:${doc.content.length}${errorFlag}`);
  });
  console.log(`剩余文本长度: ${remainingText.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return {
    documents,
    plainText: remainingText
  };
}

/**
 * 解析旧格式文档（向后兼容）
 * 格式：[发文档:标题:类型] 内容...
 */
function parseLegacyDocuments(content: string): ParseResult {
  const documents: StructuredDocument[] = [];
  const DOC_PATTERN = /\[发文档:([^:]+):([^\]]+)\]/g;
  const docMatches = Array.from(content.matchAll(DOC_PATTERN));

  console.log(`检测到 ${docMatches.length} 个旧格式文档标记`);

  if (docMatches.length === 0) {
    return { documents: [], plainText: content };
  }

  let currentIndex = 0;
  let plainTextSegments: string[] = [];

  docMatches.forEach((match, index) => {
    const tagIndex = match.index!;
    const tagEndIndex = tagIndex + match[0].length;
    const docTitle = match[1].trim();
    const docTypeInput = match[2].toLowerCase().trim();

    const docType: 'text' | 'markdown' | 'code' =
      docTypeInput === 'markdown' ? 'markdown' :
      docTypeInput === 'code' ? 'code' : 'text';

    console.log(`\n━━ 处理第${index + 1}个旧格式文档 ━━`);
    console.log('标题:', docTitle);
    console.log('类型:', docType);

    // 提取标记前的文本
    if (tagIndex > currentIndex) {
      const textBefore = content.substring(currentIndex, tagIndex).trim();
      if (textBefore) {
        plainTextSegments.push(textBefore);
      }
    }

    // 提取文档内容
    const nextMatch = docMatches[index + 1];
    const searchEnd = nextMatch ? nextMatch.index! : content.length;
    let remainingContent = content.substring(tagEndIndex, searchEnd);

    // 查找双换行边界
    const doubleNewlineMatch = remainingContent.match(/\n\s*\n/);
    let docContent = '';
    let textAfterDoc = '';

    if (doubleNewlineMatch) {
      const doubleNewlineIndex = doubleNewlineMatch.index!;
      docContent = remainingContent.substring(0, doubleNewlineIndex).trim();
      textAfterDoc = remainingContent.substring(
        doubleNewlineIndex + doubleNewlineMatch[0].length
      ).trim();
    } else {
      docContent = remainingContent.trim();
    }

    console.log('文档内容长度:', docContent.length);

    // 验证内容
    if (!docContent || docContent.length < 10) {
      console.error('❌ 文档内容过短或为空');
      documents.push({
        title: docTitle,
        type: docType,
        content: `⚠️ 文档格式错误\n\nAI使用了文档标记 [发文档:${docTitle}:${docType}]，但没有提供文档内容。\n\n正确格式应该是：\n[发文档:${docTitle}:${docType}] 文档内容紧跟在后面...\n\n请让AI重新生成文档。`,
        hasError: true
      });
    } else {
      // 限制长度
      const MAX_DOC_LENGTH = 20000;
      if (docContent.length > MAX_DOC_LENGTH) {
        console.warn(`⚠️ 文档内容超长: ${docContent.length} > ${MAX_DOC_LENGTH}`);
        docContent = docContent.substring(0, MAX_DOC_LENGTH) + '\n\n...\n（文档内容过长，已截断）';
      }

      documents.push({
        title: docTitle,
        type: docType,
        content: docContent
      });
      console.log('✅ 成功提取文档');
    }

    // 添加双换行后的文本
    if (textAfterDoc) {
      plainTextSegments.push(textAfterDoc);
    }

    // 更新索引
    currentIndex = doubleNewlineMatch
      ? tagEndIndex + doubleNewlineMatch.index! + doubleNewlineMatch[0].length
      : searchEnd;
  });

  // 添加最后剩余的文本
  if (currentIndex < content.length) {
    const remainingText = content.substring(currentIndex).trim();
    if (remainingText) {
      plainTextSegments.push(remainingText);
    }
  }

  return {
    documents,
    plainText: plainTextSegments.join('\n\n').trim()
  };
}

/**
 * 获取AI的System Prompt说明
 */
export function getDocumentPromptInstructions(): string {
  return `【📄 发送文档功能 - 结构化输出】：

当你需要发送文档时，请使用以下**两种方式之一**：

**方式1：结构化JSON输出（推荐，最稳定）**
<DOCUMENT>
{"title": "文档标题", "type": "text", "content": "完整的文档内容...", "greeting": "可选引导语"}
</DOCUMENT>

**JSON字段说明：**
- title: 文档标题（必填）
- type: 文档类型，可选："text"、"markdown"、"code"（必填）
- content: 完整文档内容，200-20000字符（必填）
- greeting: 可选引导语，如"请查收"、"给你写了个故事"等（选填）

**方式2：兼容旧格式（备选）**
[发文档:标题:类型] 完整的文档内容...

**✅ 正确示例 - JSON格式：**

示例1：发送小说
给你写了个故事 <DOCUMENT>{"title": "【女推同人】失控", "type": "text", "content": "周子谦的吻落在唇角，那是带着些许酒气的温度。办公室的灯光昏暗...(完整1000字)"}</DOCUMENT> 希望你喜欢！

示例2：发送方案
<DOCUMENT>{"title": "Souvenir新季度营销方案", "type": "text", "content": "一、项目背景\\n当前市场环境...\\n\\n二、营销目标\\n1. 品牌曝光度提升30%...(完整800字)"}</DOCUMENT>

示例3：发送代码
<DOCUMENT>{"title": "React组件示例", "type": "code", "content": "import React from 'react';\\n\\nconst MyComponent = () => {\\n  return <div>Hello</div>;\\n};"}</DOCUMENT>

**💡 使用建议：**
- 优先使用JSON格式，系统会自动处理，不会出错
- JSON中的换行用 \\n 表示
- greeting可以在标签前后单独说
- 一次可以发送多个文档，每个文档用独立的标签
- 如果JSON格式不对，系统会自动尝试旧格式

**🚫 注意事项：**
- JSON必须是有效格式，字符串中的引号要转义
- 标签必须完整闭合：<DOCUMENT>...</DOCUMENT>
- content是完整内容，不要只写标题或摘要`;
}
