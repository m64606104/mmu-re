/**
 * 文档库管理工具
 * 用于保存和管理用户收藏的文档
 */

import { DocumentMessage } from '../types';

const DOCUMENT_LIBRARY_KEY = 'document_library';

export interface SavedDocument {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'markdown' | 'code';
  size: number;
  savedAt: number;
  source?: string; // 来源（对话ID或"用户创建"）
}

/**
 * 获取文档库中的所有文档
 */
export const getDocumentLibrary = (): SavedDocument[] => {
  try {
    const stored = localStorage.getItem(DOCUMENT_LIBRARY_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('读取文档库失败:', error);
    return [];
  }
};

/**
 * 保存文档到文档库
 */
export const saveDocument = (document: DocumentMessage, source?: string): SavedDocument => {
  const savedDoc: SavedDocument = {
    id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
    title: document.title,
    content: document.content,
    type: document.type,
    size: document.size || new Blob([document.content]).size,
    savedAt: Date.now(),
    source: source || 'AI发送'
  };

  const library = getDocumentLibrary();
  library.unshift(savedDoc); // 添加到开头
  
  // 限制文档库大小（最多100个文档）
  const limitedLibrary = library.slice(0, 100);
  
  try {
    localStorage.setItem(DOCUMENT_LIBRARY_KEY, JSON.stringify(limitedLibrary));
  } catch (error) {
    console.error('保存文档失败:', error);
    throw new Error('保存文档失败，存储空间可能不足');
  }

  return savedDoc;
};

/**
 * 从文档库删除文档
 */
export const deleteDocument = (documentId: string): void => {
  const library = getDocumentLibrary();
  const filtered = library.filter(doc => doc.id !== documentId);
  
  try {
    localStorage.setItem(DOCUMENT_LIBRARY_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('删除文档失败:', error);
  }
};

/**
 * 更新文档库中的文档
 */
export const updateDocument = (documentId: string, updates: Partial<SavedDocument>): void => {
  const library = getDocumentLibrary();
  const index = library.findIndex(doc => doc.id === documentId);
  
  if (index !== -1) {
    library[index] = { ...library[index], ...updates };
    
    try {
      localStorage.setItem(DOCUMENT_LIBRARY_KEY, JSON.stringify(library));
    } catch (error) {
      console.error('更新文档失败:', error);
    }
  }
};

/**
 * 搜索文档库
 */
export const searchDocuments = (query: string): SavedDocument[] => {
  const library = getDocumentLibrary();
  const lowerQuery = query.toLowerCase();
  
  return library.filter(doc => 
    doc.title.toLowerCase().includes(lowerQuery) ||
    doc.content.toLowerCase().includes(lowerQuery)
  );
};

/**
 * 按类型筛选文档
 */
export const filterDocumentsByType = (type: 'text' | 'markdown' | 'code'): SavedDocument[] => {
  const library = getDocumentLibrary();
  return library.filter(doc => doc.type === type);
};

/**
 * 获取文档库统计信息
 */
export const getDocumentStats = () => {
  const library = getDocumentLibrary();
  
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
