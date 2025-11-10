import React, { useState, useEffect } from 'react';
import { ChevronLeft, FileText, Trash2, Edit, Send, Search, X } from 'lucide-react';
import { getDocumentLibrary, deleteDocument, SavedDocument } from '../utils/documentLibrary';
import { useConfirm } from '../hooks/useConfirm';

interface DocumentLibraryModalProps {
  onClose: () => void;
  onSelectDocument?: (document: SavedDocument, shouldEdit: boolean) => void;
}

const DocumentLibraryModal: React.FC<DocumentLibraryModalProps> = ({ onClose, onSelectDocument }) => {
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'text' | 'markdown' | 'code'>('all');
  const [selectedSource, setSelectedSource] = useState<'all' | 'AI发送' | '用户上传'>('all');
  const { confirm, ConfirmComponent } = useConfirm();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = () => {
    const library = getDocumentLibrary();
    setDocuments(library);
  };

  const handleDelete = async (documentId: string) => {
    const confirmed = await confirm({
      title: '删除文档',
      message: '确定要删除这个文档吗？\n删除后无法恢复。',
      type: 'warning',
      confirmText: '删除',
      cancelText: '取消'
    });
    
    if (confirmed) {
      deleteDocument(documentId);
      loadDocuments();
    }
  };

  const handleSend = (doc: SavedDocument, shouldEdit: boolean) => {
    if (onSelectDocument) {
      onSelectDocument(doc, shouldEdit);
    }
    onClose();
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || doc.type === selectedType;
    const matchesSource = selectedSource === 'all' || doc.source === selectedSource;
    return matchesSearch && matchesType && matchesSource;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return '📝';
      case 'markdown': return '📄';
      case 'code': return '💻';
      default: return '📄';
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  };

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
          <h1 className="text-lg font-semibold ml-2">文档库</h1>
          <div className="ml-auto text-sm text-gray-500">
            {documents.length} 个文档
          </div>
        </div>

        {/* 搜索框 */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索文档标题或内容..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 类型筛选 */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          {['all', 'text', 'markdown', 'code'].map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type as any)}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                selectedType === type
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type === 'all' && '全部'}
              {type === 'text' && '📝 文本'}
              {type === 'markdown' && '📄 Markdown'}
              {type === 'code' && '💻 代码'}
            </button>
          ))}
        </div>

        {/* 来源筛选 */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto border-t border-gray-100 pt-3">
          {[
            { value: 'all', label: '全部来源' },
            { value: 'AI发送', label: '🤖 AI发送' },
            { value: '用户上传', label: '📤 用户上传' }
          ].map(source => (
            <button
              key={source.value}
              onClick={() => setSelectedSource(source.value as any)}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                selectedSource === source.value
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {source.label}
            </button>
          ))}
        </div>
      </div>

      {/* 文档列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <FileText className="w-16 h-16 mb-4" strokeWidth={1} />
            <p className="text-sm">
              {searchQuery ? '没有找到匹配的文档' : '文档库是空的'}
            </p>
            <p className="text-xs mt-2">
              {searchQuery ? '试试其他关键词' : '查看文档时点击"保存"按钮即可添加'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredDocuments.map(doc => (
              <div
                key={doc.id}
                className="px-4 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* 文档图标 */}
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl">
                    {getTypeIcon(doc.type)}
                  </div>

                  {/* 文档信息 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate mb-1">
                      {doc.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                      {doc.content.substring(0, 100)}...
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{formatDate(doc.savedAt)}</span>
                      <span>•</span>
                      <span>{(doc.size / 1024).toFixed(1)} KB</span>
                      {doc.source && (
                        <>
                          <span>•</span>
                          <span>{doc.source}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                {onSelectDocument && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleSend(doc, false)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      <span>原文发送</span>
                    </button>
                    <button
                      onClick={() => handleSend(doc, true)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      <span>编辑发送</span>
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* 确认对话框 */}
      {ConfirmComponent}
    </div>
  );
};

export default DocumentLibraryModal;
