import React, { useState } from 'react';
import { X, Save, Forward, Download, Copy, Check } from 'lucide-react';
import { DocumentMessage } from '../types';
import { extractDocumentText } from '../utils/enhancedDocumentParser';

interface WordStyleDocumentModalProps {
  document: DocumentMessage;
  author?: string;
  authorAvatar?: string;
  timestamp?: number;
  onClose: () => void;
  onSave?: () => void;
  onForward?: () => void;
}

/**
 * Word 风格的文档查看弹窗
 * 类似 Microsoft Word 阅读模式的全屏展示
 */
const WordStyleDocumentModal: React.FC<WordStyleDocumentModalProps> = ({
  document,
  author = 'AI',
  authorAvatar,
  timestamp,
  onClose,
  onSave,
  onForward
}) => {
  const [copied, setCopied] = useState(false);
  
  // 格式化时间
  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // 复制文本
  const handleCopy = async () => {
    const text = extractDocumentText(document);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };
  
  // 下载文档
  const handleDownload = () => {
    const text = extractDocumentText(document);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${document.title}.txt`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col">
      {/* 顶部工具栏（Word 风格） */}
      <div className="bg-white border-b shadow-sm">
        {/* 主工具栏 */}
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* 返回按钮 */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="关闭"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            
            {/* 文档标题 */}
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {document.title}
              </h1>
              <p className="text-xs text-gray-500">
                {document.type === 'code' ? '代码文档' : document.type === 'markdown' ? 'Markdown 文档' : '文本文档'}
              </p>
            </div>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="复制文本"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">已复制</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  复制
                </>
              )}
            </button>
            
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="下载文档"
            >
              <Download className="w-4 h-4" />
              下载
            </button>
            
            {onSave && (
              <button
                onClick={onSave}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
              >
                <Save className="w-4 h-4" />
                保存到文档库
              </button>
            )}
            
            {onForward && (
              <button
                onClick={onForward}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                <Forward className="w-4 h-4" />
                转发
              </button>
            )}
          </div>
        </div>
        
        {/* 元信息栏 */}
        <div className="px-6 py-2 bg-gray-50 border-t flex items-center gap-4 text-sm text-gray-600">
          {authorAvatar && (
            <img 
              src={authorAvatar} 
              alt={author}
              className="w-6 h-6 rounded-full"
            />
          )}
          <span>作者: {author}</span>
          {timestamp && (
            <>
              <span>•</span>
              <span>{formatTime(timestamp)}</span>
            </>
          )}
        </div>
      </div>
      
      {/* 文档内容区域（A4 纸张效果） */}
      <div className="flex-1 overflow-y-auto py-8">
        <div className="max-w-4xl mx-auto">
          {/* A4 纸张容器 */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            {/* 问候语 */}
            {document.greeting && (
              <div className="px-12 py-6 bg-blue-50 border-b">
                <p className="text-sm text-blue-800">
                  💌 {document.greeting}
                </p>
              </div>
            )}
            
            {/* 文档正文 */}
            <div className="px-12 py-10 word-document-content">
              {/* Word 风格的顶部装饰条 */}
              <div className={`h-1 ${
                document.type === 'code' ? 'bg-green-500' : 
                document.type === 'markdown' ? 'bg-purple-500' : 
                'bg-blue-500'
              } rounded-full mb-8`} />
              
              {/* 标题 */}
              <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                {document.title}
              </h1>
              
              {/* 内容 */}
              <div 
                className="prose prose-sm md:prose-base max-w-none"
                dangerouslySetInnerHTML={{ __html: document.content }}
                style={{
                  lineHeight: '1.8',
                  fontSize: '16px',
                  color: '#1f2937',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Microsoft YaHei", sans-serif'
                }}
              />
            </div>
            
            {/* 底部装饰 */}
            <div className="px-12 py-6 bg-gray-50 border-t">
              <p className="text-xs text-gray-500 text-center">
                本文档由 {author} 创建
                {timestamp && ` · ${formatTime(timestamp)}`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordStyleDocumentModal;
