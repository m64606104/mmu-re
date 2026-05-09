import React from 'react';
import { FileText, Eye, Save, Forward, Download } from 'lucide-react';
import { DocumentMessage } from '../types';

interface WordStyleDocumentCardProps {
  document: DocumentMessage;
  onClick: () => void;
  onSave?: () => void;
  onForward?: () => void;
  compact?: boolean;
}

/**
 * Word 风格的文档卡片
 * 参考 Microsoft Word 的文档预览样式
 */
const WordStyleDocumentCard: React.FC<WordStyleDocumentCardProps> = ({
  document,
  onClick,
  onSave,
  onForward,
  compact = false
}) => {
  const hasOriginalAttachment = Boolean(document.originalFile?.base64Data);
  const displayFileName = document.originalFile?.fileName || `${document.title}.docx`;
  const displayFileSize = document.originalFile?.fileSize || document.size || new Blob([document.content]).size;
  const previewLines = document.content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .slice(0, 6)
    .join('\n')
    .trim();

  const handleDownload = () => {
    if (!document.originalFile?.base64Data) return;
    const a = window.document.createElement('a');
    a.href = document.originalFile.base64Data;
    a.download = document.originalFile.fileName || `${document.title}.docx`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  };
  
  // 文档类型图标颜色
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
  
  // 文档类型文本
  const getTypeText = () => {
    switch (document.type) {
      case 'code':
        return '代码';
      case 'markdown':
        return 'Markdown';
      default:
        return '文本';
    }
  };
  
  if (compact) {
    // 附件模式：用于聊天气泡中（不展示长正文）
    return (
      <div className="word-doc-card-compact bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
        <div onClick={onClick} className="p-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${getTypeColor()}`}>
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm text-slate-900 truncate">
                {displayFileName}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                附件 · {getTypeText()} · {(displayFileSize / 1024).toFixed(1)} KB
              </p>
              {hasOriginalAttachment && (
                <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  DOCX附件
                </span>
              )}
            </div>
            <button className="text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-600">查看</button>
          </div>
          {previewLines && (
            <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
              <pre className="text-[11px] leading-5 whitespace-pre-wrap break-words text-slate-600 font-sans">
                {previewLines}
              </pre>
            </div>
          )}
        </div>
        
        {(onSave || onForward) && (
          <div className="border-t bg-slate-50 px-3 py-2 flex gap-2">
            {onSave && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSave();
                }}
                className="flex-1 flex items-center justify-center gap-1 text-xs text-slate-600 hover:text-blue-600 transition-colors py-1"
              >
                <Save className="w-3.5 h-3.5" />
                保存
              </button>
            )}
            {onForward && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onForward();
                }}
                className="flex-1 flex items-center justify-center gap-1 text-xs text-slate-600 hover:text-blue-600 transition-colors py-1"
              >
                <Forward className="w-3.5 h-3.5" />
                转发
              </button>
            )}
            {hasOriginalAttachment && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                className="flex-1 flex items-center justify-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 transition-colors py-1"
              >
                <Download className="w-3.5 h-3.5" />
                下载附件
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
  
  // 标准模式：用于文档库
  return (
    <div className="word-doc-card bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer">
      <div onClick={onClick} className="p-4">
        {/* Word 风格的顶部条 */}
        <div className={`h-1.5 ${document.type === 'code' ? 'bg-green-500' : document.type === 'markdown' ? 'bg-purple-500' : 'bg-blue-500'} rounded-full mb-4`} />
        
        {/* 文档图标和标题 */}
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${getTypeColor()}`}>
            <FileText className="w-8 h-8" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base text-gray-900 mb-1">
              {document.title}
            </h3>
            <p className="text-sm text-gray-500">
              {getTypeText()}文档
            </p>
          </div>
        </div>
        
        {/* 预览内容 */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words line-clamp-6 font-sans">
            {previewLines}
          </pre>
        </div>
        
        {/* 查看按钮 */}
        <div className="mt-3 flex items-center justify-center gap-2 text-blue-600 text-sm font-medium">
          <Eye className="w-4 h-4" />
          点击查看完整内容
        </div>
      </div>
      
      {/* 操作按钮 */}
      {(onSave || onForward) && (
        <div className="border-t bg-gray-50 p-3 flex gap-3">
          {onSave && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              <Save className="w-4 h-4" />
              保存到文档库
            </button>
          )}
          {onForward && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onForward();
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              <Forward className="w-4 h-4" />
              转发
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default WordStyleDocumentCard;
