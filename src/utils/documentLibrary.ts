/**
 * 文档库管理工具
 * 用于保存和管理用户收藏的文档
 */

import { DocumentMessage } from '../types';
import { smartLoad, smartSave } from './storage';

const DOCUMENT_LIBRARY_KEY = 'document_library';

export interface SavedDocument {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'markdown' | 'code';
  size: number;
  savedAt: number;
  source?: string; // 来源（"AI发送"、"用户上传"、"知识库"）
  conversationId?: string; // 所属对话ID（知识库文档）
  characterName?: string; // 角色名称（知识库文档）
}

/**
 * 获取文档库中的所有文档
 */
export const getDocumentLibrary = async (): Promise<SavedDocument[]> => {
  try {
    const parsed = await smartLoad(DOCUMENT_LIBRARY_KEY);
    if (!parsed) return [];
    // 兼容旧格式/异常写入：必须返回数组，否则资料库页面会崩溃
    if (Array.isArray(parsed)) return parsed as SavedDocument[];
    // 某些旧版本可能写成对象包裹
    if (parsed && typeof parsed === 'object') {
      const maybeDocs = (parsed as any).docs || (parsed as any).documents || (parsed as any).items;
      if (Array.isArray(maybeDocs)) return maybeDocs as SavedDocument[];
    }
    console.warn('文档库格式异常，已回退为空数组:', parsed);
    return [];
  } catch (error) {
    console.error('读取文档库失败:', error);
    return [];
  }
};

/**
 * 保存文档到文档库
 * @param document 要保存的文档
 * @param source 文档来源
 * @param customTitle 自定义标题（可选，如果不提供则使用document.title）
 */
export const saveDocument = async (document: DocumentMessage, source?: string, customTitle?: string): Promise<SavedDocument> => {
  const savedDoc: SavedDocument = {
    id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
    title: customTitle || document.title, // 优先使用自定义标题
    content: document.content,
    type: document.type,
    size: document.size || new Blob([document.content]).size,
    savedAt: Date.now(),
    source: source || 'AI发送'
  };

  const library = await getDocumentLibrary();
  library.unshift(savedDoc); // 添加到开头
  
  // 限制文档库大小（最多100个文档）
  const limitedLibrary = library.slice(0, 100);
  
  try {
    await smartSave(DOCUMENT_LIBRARY_KEY, limitedLibrary);
  } catch (error) {
    console.error('保存文档失败:', error);
    throw new Error('保存文档失败，存储空间可能不足');
  }

  return savedDoc;
};

/**
 * 从文档库删除文档
 */
export const deleteDocument = async (documentId: string): Promise<void> => {
  const library = await getDocumentLibrary();
  const filtered = library.filter(doc => doc.id !== documentId);
  
  try {
    await smartSave(DOCUMENT_LIBRARY_KEY, filtered);
  } catch (error) {
    console.error('删除文档失败:', error);
  }
};

/**
 * 更新文档库中的文档
 */
export const updateDocument = async (documentId: string, updates: Partial<SavedDocument>): Promise<void> => {
  const library = await getDocumentLibrary();
  const index = library.findIndex(doc => doc.id === documentId);
  
  if (index !== -1) {
    library[index] = { ...library[index], ...updates };
    
    try {
      await smartSave(DOCUMENT_LIBRARY_KEY, library);
    } catch (error) {
      console.error('更新文档失败:', error);
    }
  }
};

/**
 * 搜索文档库
 */
export const searchDocuments = async (query: string): Promise<SavedDocument[]> => {
  const library = await getDocumentLibrary();
  const lowerQuery = query.toLowerCase();
  
  return library.filter(doc => 
    doc.title.toLowerCase().includes(lowerQuery) ||
    doc.content.toLowerCase().includes(lowerQuery)
  );
};

/**
 * 按类型筛选文档
 */
export const filterDocumentsByType = async (type: 'text' | 'markdown' | 'code'): Promise<SavedDocument[]> => {
  const library = await getDocumentLibrary();
  return library.filter(doc => doc.type === type);
};

/**
 * 获取文档库统计信息
 */
export const getDocumentStats = async () => {
  const library = await getDocumentLibrary();
  
  return {
    total: library.length,
    byType: {
      text: library.filter(d => d.type === 'text').length,
      markdown: library.filter(d => d.type === 'markdown').length,
      code: library.filter(d => d.type === 'code').length,
    },
    totalSize: library.reduce((sum, doc) => sum + doc.size, 0)
  };
};
