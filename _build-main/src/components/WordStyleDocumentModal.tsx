/**
 * Word 风格的文档查看器模态框
 * 参考 Microsoft Word 的文档查看样式
 */

import React, { useState } from 'react';
import { X, Save, Forward, FileText, Copy, Download } from 'lucide-react';
import { OriginalDocumentFile } from '../types';
import { generateDocxOriginalFile } from '../utils/documentFileGenerator';

interface DocumentContent {
  title: string;
  content: string;
  type: 'text' | 'code' | 'markdown';
  originalFile?: OriginalDocumentFile;
}

interface WordStyleDocumentModalProps {
  document: DocumentContent;
  author?: string;
  authorAvatar?: string;
  timestamp?: number;
  onClose: () => void;
  onSave?: () => void;
  onForward?: () => void;
}

const WordStyleDocumentModal: React.FC<WordStyleDocumentModalProps> = ({
  document,
  author,
  authorAvatar,
  timestamp,
  onClose,
  onSave,
  onForward
}) => {
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // 获取文档类型颜色
  const getTypeColor = () => {
    switch (document.type) {
      case 'code':
        return 'text-green-600 bg-green-50';
      case 'markdown':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  // 获取文档类型文本
  const getTypeText = () => {
    switch (document.type) {
      case 'code':
        return '代码文档';
      case 'markdown':
        return 'Markdown文档';
      default:
        return '文本文档';
    }
  };

  // 复制内容
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(document.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  // 下载文档
  const handleDownload = () => {
    let url: string | null = null;
    let fileName = `${document.title}.${document.type === 'code' ? 'txt' : document.type === 'markdown' ? 'md' : 'txt'}`;

    if (document.originalFile?.base64Data) {
      url = document.originalFile.base64Data;
      fileName = document.originalFile.fileName || fileName;
    } else {
      const blob = new Blob([document.content], { type: 'text/plain;charset=utf-8' });
      url = URL.createObjectURL(blob);
    }

    const a = window.document.createElement('a');
    a.href = url;
    a.download = fileName;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    if (!document.originalFile?.base64Data) {
      URL.revokeObjectURL(url);
    }
  };

  const handleReExportDocx = async () => {
    try {
      setIsExporting(true);
      const generated = await generateDocxOriginalFile(document.title, document.content);
      if (!generated.base64Data) return;
      const a = window.document.createElement('a');
      a.href = generated.base64Data;
      a.download = generated.fileName;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
    } catch (error) {
      console.error('重新导出DOCX失败:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        
        {/* 头部工具栏 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getTypeColor()}`}>
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{document.title}</h2>
              <p className="text-sm text-gray-500">{getTypeText()}</p>
            </div>
          </div>
          
          {/* 右侧操作按钮 - 缩小间距，避免重叠 */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              title="复制内容"
            >
              <Copy className="w-4 h-4 text-gray-600" />
            </button>
            
            <button
              onClick={handleDownload}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              title="下载文档"
            >
              <Download className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={handleReExportDocx}
              className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-lg hover:bg-emerald-100 transition-colors"
              title="重新导出DOCX"
            >
              {isExporting ? '导出中...' : '重新导出DOCX'}
            </button>
            
            {onSave && (
              <button
                onClick={onSave}
                className="px-2 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Save className="w-3 h-3 inline mr-1" />
                保存
              </button>
            )}
            
            {onForward && (
              <button
                onClick={onForward}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Forward className="w-3 h-3 inline mr-1" />
                转发
              </button>
            )}
            
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors ml-1"
              title="关闭"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* 作者信息 */}
        {author && (
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {authorAvatar && (
                <img
                  src={authorAvatar}
                  alt={author}
                  className="w-5 h-5 rounded-full"
                />
              )}
              <span>作者: {author}</span>
              {timestamp && (
                <>
                  <span>•</span>
                  <span>{new Date(timestamp).toLocaleString('zh-CN')}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* 文档内容 */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-none">
            {document.type === 'code' ? (
              <pre className="bg-gray-100 rounded-lg p-4 text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                <code>{document.content}</code>
              </pre>
            ) : document.type === 'markdown' ? (
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                  {document.content}
                </pre>
              </div>
            ) : (
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                  {document.content}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 复制成功提示 */}
        {copied && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-60">
            ✅ 已复制到剪贴板
          </div>
        )}
      </div>
    </div>
  );
};

export default WordStyleDocumentModal;