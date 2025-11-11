import React, { useState, useMemo } from 'react';
import { ChevronLeft, FileText, Trash2, Edit, Send, Search, X } from 'lucide-react';
import { getDocumentLibrary, deleteDocument, SavedDocument } from '../utils/documentLibrary';
import { useConfirm } from '../hooks/useConfirm';
import { Conversation, KnowledgeBaseItem } from '../types';

interface DocumentLibraryModalProps {
  onClose: () => void;
  onSelectDocument?: (document: SavedDocument, shouldEdit: boolean) => void;
  conversations?: Conversation[]; // 新增：用于收集知识库文档
}

const DocumentLibraryModal: React.FC<DocumentLibraryModalProps> = ({ onClose, onSelectDocument, conversations = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'text' | 'markdown' | 'code'>('all');
  const [selectedSource, setSelectedSource] = useState<'all' | 'AI发送' | '用户上传' | '知识库'>('all');
  const { confirm, ConfirmComponent } = useConfirm();

  // 收集所有文档：手动保存 + 知识库
  const allDocuments = useMemo(() => {
    const docs: SavedDocument[] = [];
    
    // 1. 从 localStorage 读取手动保存的文档
    const savedDocs = getDocumentLibrary();
    // 确保所有手动保存的文档都有source标记
    docs.push(...savedDocs.map(doc => ({
      ...doc,
      source: doc.source || 'AI发送' // 默认来源为AI发送
    })));
    
    // 2. 从所有对话的知识库中收集文档
    conversations.forEach((conv) => {
      if (conv.characterSettings?.knowledgeBase && conv.characterSettings.knowledgeBase.length > 0) {
        const characterName = conv.characterSettings.nickname || conv.name; // 使用角色昵称或对话名称
        conv.characterSettings.knowledgeBase.forEach((item: KnowledgeBaseItem) => {
          docs.push({
            id: `kb_${conv.id}_${item.id}`,
            title: item.title,
            content: item.content,
            type: 'text', // 知识库默认为text类型
            size: new Blob([item.content]).size,
            savedAt: item.createdAt || Date.now(),
            source: '知识库', // 标记为知识库文档
            conversationId: conv.id, // 记录所属对话
            characterName // 记录角色名称
          });
        });
      }
    });
    
    // 按时间倒序排列
    return docs.sort((a, b) => b.savedAt - a.savedAt);
  }, [conversations]);

  const documents = allDocuments;

  const handleDelete = async (documentId: string) => {
    // 知识库文档不能删除，需要在角色设置中删除
    if (documentId.startsWith('kb_')) {
      alert('知识库文档需要在角色设置中删除');
      return;
    }
    
    const confirmed = await confirm({
      title: '删除文档',
      message: '确定要删除这个文档吗？\n删除后无法恢复。',
      type: 'warning',
      confirmText: '删除',
      cancelText: '取消'
    });
    
    if (confirmed) {
      deleteDocument(documentId);
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
      <div className="p-4 border-b border-gray-200 flex items-center gap-3">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            文档与资料库
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            共 {documents.length} 篇 · 手动保存 {documents.filter(d => d.source !== '知识库').length} · 知识库 {documents.filter(d => d.source === '知识库').length}
          </p>
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
          { value: '用户上传', label: '📤 用户上传' },
          { value: '知识库', label: '📚 知识库' }
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

      {/* 文档列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <FileText className="w-16 h-16 mb-3" />
            <p className="text-base font-medium mb-2">{searchQuery || selectedType !== 'all' || selectedSource !== 'all' ? '未找到匹配的文档' : '还没有保存任何文档'}</p>
            {!searchQuery && selectedType === 'all' && selectedSource === 'all' && (
              <p className="text-sm text-center mt-1 px-4 leading-relaxed">
                <span className="block mb-1">💾 <b>手动保存</b>：聊天中保存AI发送的文档</span>
                <span className="block mb-1">📚 <b>知识库</b>：在角色设置中添加的文档</span>
                <span className="block text-gray-500 mt-2">所有文档都会在这里统一管理</span>
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredDocuments.map(doc => (
              <div
                key={doc.id}
                className={`px-4 py-4 hover:bg-gray-50 transition-colors ${
                  doc.source === '知识库' ? 'bg-purple-50/30' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* 文档图标 */}
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl ${
                    doc.source === '知识库' ? 'bg-purple-100' : 'bg-blue-50'
                  }`}>
                    {doc.source === '知识库' ? '📚' : getTypeIcon(doc.type)}
                  </div>

                  {/* 文档信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 truncate flex-1">
                        {doc.title}
                      </h3>
                      {doc.source === '知识库' && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full flex-shrink-0">
                          知识库
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                      {doc.content.substring(0, 100)}...
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{formatDate(doc.savedAt)}</span>
                      <span>•</span>
                      <span>{(doc.size / 1024).toFixed(1)} KB</span>
                      {doc.source && doc.source !== '知识库' && (
                        <>
                          <span>•</span>
                          <span className="text-gray-500">{doc.source}</span>
                        </>
                      )}
                      {doc.source === '知识库' && doc.characterName && (
                        <>
                          <span>•</span>
                          <span className="text-purple-600">{doc.characterName}</span>
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
                    {/* 知识库文档不显示删除按钮 */}
                    {doc.source !== '知识库' && (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
