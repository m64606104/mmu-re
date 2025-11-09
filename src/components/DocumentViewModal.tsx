import React from 'react';
import { ChevronLeft, FileText } from 'lucide-react';
import { DocumentMessage } from '../types';

interface DocumentViewModalProps {
  document: DocumentMessage;
  onClose: () => void;
}

const DocumentViewModal: React.FC<DocumentViewModalProps> = ({ document, onClose }) => {
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* 头部 */}
      <div className="bg-white border-b">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold ml-2">在线文档</h1>
        </div>
      </div>

      {/* 文档内容 */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-3xl mx-auto p-6">
          {/* 文档标题 */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {document.title}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <FileText className="w-4 h-4" />
              <span>来源: 在线文档</span>
              {document.size && (
                <>
                  <span>•</span>
                  <span>{(document.size / 1024).toFixed(2)} KB</span>
                </>
              )}
              <span>•</span>
              <span>
                {document.type === 'text' && '📝 文本'}
                {document.type === 'markdown' && '📄 Markdown'}
                {document.type === 'code' && '💻 代码'}
              </span>
            </div>
          </div>

          {/* 文档内容区域 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            {document.type === 'code' ? (
              <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap break-words">
                {document.content}
              </pre>
            ) : (
              <div className="prose prose-sm max-w-none">
                {document.type === 'markdown' ? (
                  // 简单的Markdown渲染（仅支持段落）
                  <div className="space-y-4">
                    {document.content.split('\n\n').map((para, idx) => (
                      <p key={idx} className="text-gray-800 leading-relaxed">
                        {para.split('\n').map((line, lineIdx) => (
                          <React.Fragment key={lineIdx}>
                            {line}
                            {lineIdx < para.split('\n').length - 1 && <br />}
                          </React.Fragment>
                        ))}
                      </p>
                    ))}
                  </div>
                ) : (
                  // 普通文本
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {document.content}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 底部署名（如果有） */}
          {document.content.includes('落款：') && (
            <div className="mt-6 text-right">
              <div className="inline-block bg-blue-50 px-4 py-2 rounded-lg">
                <p className="text-sm text-blue-600">
                  {document.content.split('落款：')[1]?.split('\n')[0] || ''}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewModal;
