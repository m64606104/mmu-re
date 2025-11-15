import React, { useState, useMemo } from 'react';
import { X, Save, Forward, Download, Copy, Check } from 'lucide-react';
import { DocumentMessage } from '../types';
import { extractDocumentText } from '../utils/enhancedDocumentParser';
import { formatDocumentForDisplay, generateTitleStyle, generateContentStyle } from '../utils/documentFormatter';

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
  
  // 格式化文档用于显示（在封装后进行格式处理）
  const formattedDocument = useMemo(() => {
    return formatDocumentForDisplay(document);
  }, [document]);
  
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] max-h-[800px] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* 顶部标题栏 */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200 bg-white">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              title="关闭"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
            
            {/* 美化的标题显示区域 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  document.type === 'code' ? 'bg-green-500' : 
                  document.type === 'markdown' ? 'bg-purple-500' : 
                  'bg-blue-500'
                }`} />
                <h2 className="text-lg font-bold text-gray-900 truncate" style={{
                  fontFamily: '"PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif'
                }}>
                  {document.title}
                </h2>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  document.type === 'code' ? 'bg-green-100 text-green-700' : 
                  document.type === 'markdown' ? 'bg-purple-100 text-purple-700' : 
                  'bg-blue-100 text-blue-700'
                }`}>
                  {document.type === 'code' ? '代码文档' : 
                   document.type === 'markdown' ? 'Markdown' : 
                   '文本文档'}
                </span>
              </div>
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
        <div className="px-6 py-2 bg-gray-50 border-b flex items-center gap-4 text-sm text-gray-600">
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
        
        {/* 文档内容区域（A4 纸张效果） */}
        <div className="flex-1 overflow-y-auto py-8 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4">
            {/* A4 纸张容器 */}
            <div className="bg-white shadow-lg rounded-lg overflow-hidden min-h-[600px]">
              {/* 问候语 */}
              {document.greeting && (
                <div className="px-12 py-6 bg-blue-50 border-b">
                  <p className="text-sm text-blue-800">
                    💌 {document.greeting}
                  </p>
                </div>
              )}
              
              {/* 文档正文 */}
              <div className="px-12 py-10">
                {/* Word 风格的顶部装饰条 */}
                <div className={`h-1 mb-8 rounded-full ${
                  document.type === 'code' ? 'bg-gradient-to-r from-green-400 to-green-600' : 
                  document.type === 'markdown' ? 'bg-gradient-to-r from-purple-400 to-purple-600' : 
                  'bg-gradient-to-r from-blue-400 to-blue-600'
                }`} />
                
                {/* 标题 */}
                <h1 
                  className="text-3xl font-bold text-gray-900 mb-8 text-center leading-tight"
                  style={generateTitleStyle(document.title, document.type)}
                >
                  {document.title}
                </h1>
                
                {/* 内容 */}
                <div 
                  className="prose prose-lg max-w-none text-gray-800 leading-relaxed"
                  style={generateContentStyle()}
                  dangerouslySetInnerHTML={{ __html: formattedDocument.content }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordStyleDocumentModal;
