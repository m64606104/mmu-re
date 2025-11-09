/**
 * DOI解析工具
 * 通过DOI获取学术论文的元数据和摘要
 */

export interface PaperMetadata {
  title: string;
  authors: string[];
  abstract: string;
  year: string;
  doi: string;
  journal?: string;
  url?: string;
}

/**
 * 通过DOI获取论文元数据
 * 使用Crossref API和Semantic Scholar API
 */
export const fetchPaperByDOI = async (doi: string): Promise<PaperMetadata> => {
  // 清理DOI格式
  const cleanDOI = doi.trim().replace(/^(https?:\/\/)?(doi\.org\/)?/, '');
  
  try {
    // 首先尝试Crossref API（更可靠）
    const crossrefUrl = `https://api.crossref.org/works/${encodeURIComponent(cleanDOI)}`;
    const response = await fetch(crossrefUrl);
    
    if (!response.ok) {
      throw new Error(`Crossref API返回错误: ${response.status}`);
    }
    
    const data = await response.json();
    const work = data.message;
    
    // 提取作者信息
    const authors = work.author?.map((a: any) => 
      `${a.given || ''} ${a.family || ''}`.trim()
    ) || ['作者信息不可用'];
    
    // 提取摘要（Crossref通常没有完整摘要）
    let abstract = work.abstract || '';
    
    // 如果没有摘要，尝试从Semantic Scholar获取
    if (!abstract) {
      try {
        const s2Url = `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(cleanDOI)}?fields=abstract,tldr`;
        const s2Response = await fetch(s2Url);
        if (s2Response.ok) {
          const s2Data = await s2Response.json();
          abstract = s2Data.abstract || s2Data.tldr?.text || '';
        }
      } catch (e) {
        console.warn('Semantic Scholar API失败，使用Crossref数据', e);
      }
    }
    
    // 构建元数据
    const metadata: PaperMetadata = {
      title: work.title?.[0] || '标题不可用',
      authors,
      abstract: abstract || '摘要不可用（部分论文可能需要付费访问）',
      year: work.published?.['date-parts']?.[0]?.[0]?.toString() || '年份不可用',
      doi: cleanDOI,
      journal: work['container-title']?.[0] || undefined,
      url: work.URL || `https://doi.org/${cleanDOI}`
    };
    
    return metadata;
    
  } catch (error: any) {
    console.error('DOI解析失败:', error);
    throw new Error(`无法获取DOI信息: ${error.message}\n\n💡 请检查DOI格式是否正确，例如：10.1000/xyz123`);
  }
};

/**
 * 将论文元数据格式化为知识库文本
 */
export const formatPaperToKnowledge = (paper: PaperMetadata): string => {
  const sections = [
    `# ${paper.title}`,
    '',
    `**作者**: ${paper.authors.join(', ')}`,
    `**期刊**: ${paper.journal || '未知'}`,
    `**年份**: ${paper.year}`,
    `**DOI**: ${paper.doi}`,
    `**链接**: ${paper.url}`,
    '',
    '## 摘要',
    paper.abstract,
    '',
    '---',
    '',
    '💡 **提示**: 这是通过DOI自动获取的论文信息。如需完整内容，请上传PDF文件或手动添加笔记。',
    '',
    `🔗 [在Sci-Hub查看全文](https://sci-hub.se/${paper.doi})`,
    `🔗 [在谷歌学术搜索](https://scholar.google.com/scholar?q=${encodeURIComponent(paper.doi)})`,
  ];
  
  return sections.join('\n');
};

/**
 * 验证DOI格式
 */
export const isValidDOI = (doi: string): boolean => {
  const cleanDOI = doi.trim().replace(/^(https?:\/\/)?(doi\.org\/)?/, '');
  // DOI通常格式为: 10.xxxx/xxxxx
  return /^10\.\d{4,}\/\S+$/.test(cleanDOI);
};
