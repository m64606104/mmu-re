import React, { useState } from 'react';
import { X, FileText, Folder } from 'lucide-react';

interface SendDocumentModalProps {
  onClose: () => void;
  onSend: (title: string, content: string, greeting: string, type: 'text' | 'markdown' | 'code') => void;
  onOpenLibrary?: () => void;
  initialDocument?: {
    title: string;
    content: string;
    type: 'text' | 'markdown' | 'code';
  };
}

const SendDocumentModal: React.FC<SendDocumentModalProps> = ({ onClose, onSend, onOpenLibrary, initialDocument }) => {
  const [title, setTitle] = useState(initialDocument?.title || '');
  const [content, setContent] = useState(initialDocument?.content || '');
  const [greeting, setGreeting] = useState('请查收');
  const [docType, setDocType] = useState<'text' | 'markdown' | 'code'>(initialDocument?.type || 'text');

  const handleSend = () => {
    if (!title.trim() || !content.trim()) {
      alert('请填写文档标题和内容');
      return;
    }

    onSend(title.trim(), content.trim(), greeting.trim(), docType);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            发送文档
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 从文档库选择按钮 */}
          {onOpenLibrary && !initialDocument && (
            <button
              onClick={() => {
                onClose();
                onOpenLibrary();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Folder className="w-5 h-5" />
              <span>从文档库选择</span>
            </button>
          )}

          {/* 文档标题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              文档标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：情书_草稿_v3"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              maxLength={50}
            />
          </div>

          {/* 文档类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              文档类型
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setDocType('text')}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                  docType === 'text'
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                📝 文本
              </button>
              <button
                onClick={() => setDocType('markdown')}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                  docType === 'markdown'
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                📄 Markdown
              </button>
              <button
                onClick={() => setDocType('code')}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                  docType === 'code'
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                💻 代码
              </button>
            </div>
          </div>

          {/* 文档内容 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              文档内容
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入文档内容..."
              className="w-full h-48 px-4 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none resize-none font-mono text-sm"
            />
            <div className="text-xs text-gray-500 mt-1">
              {content.length} 字符
            </div>
          </div>

          {/* 问候语 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              问候语（选填）
            </label>
            <input
              type="text"
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              placeholder="请查收"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              maxLength={20}
            />
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t">
          <button
            onClick={handleSend}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            📤 发送文档
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendDocumentModal;
