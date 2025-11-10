import React, { useState } from 'react';
import { ChevronLeft, FileText, Save, Share2 } from 'lucide-react';
import { DocumentMessage } from '../types';
import { saveDocument } from '../utils/documentLibrary';

interface DocumentViewModalProps {
  document: DocumentMessage;
  onClose: () => void;
  onForward?: (document: DocumentMessage) => void;
}

// 智能识别并渲染文档内容
const renderDocumentContent = (content: string, title: string) => {
  // 检测是否包含<orange>标签
  const orangeTagRegex = /<orange>([\s\S]*?)<\/orange>/g;
  const orangeMatches = Array.from(content.matchAll(orangeTagRegex));
  
  if (orangeMatches.length > 0) {
    // 包含<orange>标签，渲染HTML内容
    return (
      <div className="space-y-4">
        {orangeMatches.map((match, idx) => (
          <div 
            key={idx} 
            className="max-w-[310px] mx-auto"
            dangerouslySetInnerHTML={{ __html: match[1] }}
          />
        ))}
        {/* 渲染非orange标签的文本内容 */}
        {content.replace(orangeTagRegex, '').trim() && (
          <div className="mt-4 text-gray-800 leading-relaxed whitespace-pre-wrap">
            {content.replace(orangeTagRegex, '').trim()}
          </div>
        )}
      </div>
    );
  }
  
  // 智能识别内容类型并应用样式
  const lowerTitle = title.toLowerCase();
  const lowerContent = content.toLowerCase();
  
  // 日记/日志类
  if (lowerTitle.includes('日记') || lowerTitle.includes('日志') || content.includes('今天') && content.includes('心情')) {
    return (
      <div className="max-w-[310px] mx-auto bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 shadow-lg border-2 border-amber-200">
        <div className="text-center mb-4">
          <div className="text-2xl font-bold text-amber-800" style={{ fontFamily: '"KaiTi", serif' }}>{title}</div>
          <div className="text-sm text-amber-600 mt-1">📖</div>
        </div>
        <div className="text-gray-800 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: '"KaiTi", serif', fontSize: '15px' }}>
          {content}
        </div>
      </div>
    );
  }
  
  // 便签/便利贴类
  if (lowerTitle.includes('便签') || lowerTitle.includes('便利贴') || lowerTitle.includes('提醒')) {
    return (
      <div className="max-w-[310px] mx-auto">
        <div className="bg-yellow-100 rounded-lg p-5 shadow-md border-l-4 border-yellow-400" style={{ transform: 'rotate(-1deg)' }}>
          <div className="flex items-start gap-2 mb-3">
            <div className="text-2xl">📌</div>
            <div className="flex-1 font-bold text-gray-800">{title}</div>
          </div>
          <div className="text-gray-700 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: '"Comic Sans MS", cursive' }}>
            {content}
          </div>
        </div>
      </div>
    );
  }
  
  // 聊天记录类
  if (lowerTitle.includes('聊天') || lowerTitle.includes('对话') || content.includes('：') && content.split('\n').length > 3) {
    const lines = content.split('\n').filter(l => l.trim());
    return (
      <div className="max-w-[310px] mx-auto bg-gray-100 rounded-2xl p-4 shadow-lg">
        <div className="bg-white rounded-t-xl p-3 text-center font-semibold text-gray-800 border-b">
          💬 {title}
        </div>
        <div className="bg-white p-4 space-y-2 max-h-96 overflow-y-auto">
          {lines.map((line, idx) => {
            const [speaker, ...messageParts] = line.split('：');
            const message = messageParts.join('：');
            const isLeft = idx % 2 === 0;
            return message ? (
              <div key={idx} className={`flex ${isLeft ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[70%] px-3 py-2 rounded-2xl ${isLeft ? 'bg-white border border-gray-200' : 'bg-blue-500 text-white'}`}>
                  {message}
                </div>
              </div>
            ) : null;
          })}
        </div>
      </div>
    );
  }
  
  // 信件类
  if (lowerTitle.includes('信') || lowerTitle.includes('letter') || content.includes('亲爱的') || content.includes('此致')) {
    return (
      <div className="max-w-[310px] mx-auto bg-gradient-to-b from-blue-50 to-white rounded-xl p-6 shadow-lg border border-blue-200">
        <div className="text-center mb-6">
          <div className="text-xl font-serif text-blue-900">✉️ {title}</div>
          <div className="w-16 h-0.5 bg-blue-300 mx-auto mt-2"></div>
        </div>
        <div className="text-gray-800 leading-loose whitespace-pre-wrap" style={{ fontFamily: 'serif', fontSize: '14px', textIndent: '2em' }}>
          {content}
        </div>
      </div>
    );
  }
  
  // 清单/列表类
  if (lowerTitle.includes('清单') || lowerTitle.includes('列表') || lowerTitle.includes('todo') || content.split('\n').filter(l => l.trim().match(/^[\d\-\*•]/) || l.includes('☐') || l.includes('✓')).length > 2) {
    const lines = content.split('\n').filter(l => l.trim());
    return (
      <div className="max-w-[310px] mx-auto bg-white rounded-xl p-5 shadow-lg border-2 border-indigo-200">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-indigo-100">
          <div className="text-2xl">📋</div>
          <div className="font-bold text-indigo-900">{title}</div>
        </div>
        <div className="space-y-2">
          {lines.map((line, idx) => (
            <div key={idx} className="flex items-start gap-2 text-gray-700">
              <div className="mt-1">{line.includes('✓') ? '✅' : '☐'}</div>
              <div className="flex-1">{line.replace(/^[\d\-\*•☐✓]\s*/, '')}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // 默认：优雅的文本显示
  return (
    <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
      {content}
    </div>
  );
};

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
              <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap break-words bg-gray-50 p-4 rounded-lg border border-gray-200">
                {document.content}
              </pre>
            ) : (
              <div className="prose prose-sm max-w-none">
                {renderDocumentContent(document.content, document.title)}
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
