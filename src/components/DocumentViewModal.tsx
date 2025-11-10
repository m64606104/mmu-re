import React, { useState } from 'react';
import { ChevronLeft, FileText, Save, Share2 } from 'lucide-react';
import { DocumentMessage } from '../types';
import { saveDocument } from '../utils/documentLibrary';

interface DocumentViewModalProps {
  document: DocumentMessage;
  onClose: () => void;
  onForward?: (document: DocumentMessage) => void;
}

const DocumentViewModal: React.FC<DocumentViewModalProps> = ({ document, onClose, onForward }) => {
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newTitle, setNewTitle] = useState(document.title);

  const handleSave = () => {
    setNewTitle(document.title);
    setShowRenameModal(true);
  };

  const handleConfirmSave = () => {
    try {
      const docToSave = {
        ...document,
        title: newTitle.trim() || document.title
      };
      saveDocument(docToSave, 'AI发送');
      setShowRenameModal(false);
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 2000);
    } catch (error) {
      alert('保存失败：' + (error as Error).message);
    }
  };

  const handleForward = () => {
    if (onForward) {
      onForward(document);
    }
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* 头部 */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold ml-2">在线文档</h1>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>保存</span>
            </button>
            {onForward && (
              <button
                onClick={handleForward}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>转发</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* 保存成功提示 */}
      {showSaveToast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          ✓ 已保存到文档库
        </div>
      )}

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

      {/* 重命名对话框 */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowRenameModal(false)}>
          <div className="bg-white rounded-xl p-6 w-[90%] max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">保存文档</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                文档标题
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="输入文档标题"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRenameModal(false)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmSave}
                className="flex-1 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentViewModal;
