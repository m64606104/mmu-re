import { useState, useMemo } from 'react';
import { ChevronLeft, FileText, Calendar, User, Search, FolderOpen, BookOpen, X, Upload } from 'lucide-react';
import { Conversation, KnowledgeBaseItem } from '../types';
import DocumentViewModal from './DocumentViewModal';
import { getDocumentLibrary, SavedDocument } from '../utils/documentLibrary';

interface DatabaseScreenProps {
  conversations: Conversation[];
  onBack: () => void;
}

interface DocumentItem {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'markdown' | 'code';
  source: 'chat' | 'knowledge' | 'saved'; // 来源：聊天记录 | 知识库 | 手动保存
  sourceName: string; // 来源名称（对话名称 or AI名称 or 保存来源）
  createdAt: number;
}

export default function DatabaseScreen({ conversations, onBack }: DatabaseScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<'all' | 'chat' | 'knowledge' | 'saved'>('all');
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);

  // 收集所有文档
  const allDocuments = useMemo(() => {
    const docs: DocumentItem[] = [];

    // 1. 从所有对话的聊天记录中收集文档
    conversations.forEach((conv) => {
      conv.messages.forEach((msg) => {
        if (msg.document) {
          docs.push({
            id: `${conv.id}_${msg.id}`,
            title: msg.document.title,
            content: msg.document.content,
            type: msg.document.type || 'text',
            source: 'chat',
            sourceName: conv.characterSettings?.nickname || '未命名对话',
            createdAt: msg.timestamp,
          });
        }
      });
    });

    // 2. 从所有对话的角色设置资料库中收集文档
    conversations.forEach((conv) => {
      if (conv.characterSettings?.knowledgeBase) {
        conv.characterSettings.knowledgeBase.forEach((item: KnowledgeBaseItem) => {
          docs.push({
            id: `kb_${conv.id}_${item.id}`,
            title: item.title,
            content: item.content,
            type: 'text', // 知识库默认为text类型
            source: 'knowledge',
            sourceName: conv.characterSettings?.nickname || '未命名AI',
            createdAt: item.createdAt,
          });
        });
      }
    });

    // 3. 从文档库中读取手动保存的文档
    const savedDocs = getDocumentLibrary();
    savedDocs.forEach((doc: SavedDocument) => {
      docs.push({
        id: `saved_${doc.id}`,
        title: doc.title,
        content: doc.content,
        type: doc.type,
        source: 'saved',
        sourceName: doc.source || '手动保存',
        createdAt: doc.savedAt,
      });
    });

    // 按时间倒序排序
    return docs.sort((a, b) => b.createdAt - a.createdAt);
  }, [conversations]);

  // 过滤文档
  const filteredDocuments = useMemo(() => {
    return allDocuments.filter((doc) => {
      // 来源过滤
      if (selectedSource !== 'all' && doc.source !== selectedSource) {
        return false;
      }

      // 搜索过滤
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          doc.title.toLowerCase().includes(query) ||
          doc.content.toLowerCase().includes(query) ||
          doc.sourceName.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [allDocuments, selectedSource, searchQuery]);

  // 统计
  const stats = useMemo(() => {
    const chatDocs = allDocuments.filter((d) => d.source === 'chat').length;
    const knowledgeDocs = allDocuments.filter((d) => d.source === 'knowledge').length;
    const savedDocs = allDocuments.filter((d) => d.source === 'saved').length;
    return { total: allDocuments.length, chat: chatDocs, knowledge: knowledgeDocs, saved: savedDocs };
  }, [allDocuments]);

  // 格式化时间
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }
  };

  // 打开文档
  const handleOpenDocument = (doc: DocumentItem) => {
    setSelectedDocument(doc);
  };

  // 关闭文档
  const handleCloseDocument = () => {
    setSelectedDocument(null);
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      {/* 头部 */}
      <div className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-200/50">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-800">文档与资料库</h1>
            <p className="text-xs text-slate-500">
              共 {stats.total} 份 · 聊天 {stats.chat} · 知识库 {stats.knowledge} · 保存 {stats.saved}
            </p>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索标题、内容或来源..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-slate-100 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-3 h-3 text-slate-500" />
              </button>
            )}
          </div>
        </div>

        {/* 过滤标签 */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedSource('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              selectedSource === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            全部 ({stats.total})
          </button>
          <button
            onClick={() => setSelectedSource('chat')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              selectedSource === 'chat'
                ? 'bg-green-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            💬 聊天 ({stats.chat})
          </button>
          <button
            onClick={() => setSelectedSource('knowledge')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              selectedSource === 'knowledge'
                ? 'bg-purple-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            📚 知识库 ({stats.knowledge})
          </button>
          <button
            onClick={() => setSelectedSource('saved')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              selectedSource === 'saved'
                ? 'bg-orange-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            💾 保存 ({stats.saved})
          </button>
        </div>
      </div>

      {/* 文档列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <FolderOpen className="w-16 h-16 text-slate-300 mb-4" />
            <p className="text-slate-500 text-sm mb-1">
              {searchQuery ? '没有找到相关文档' : '还没有保存任何文档'}
            </p>
            <p className="text-slate-400 text-xs max-w-xs">
              {searchQuery
                ? '试试调整搜索关键词'
                : '💬 聊天记录中的文档\n📚 角色知识库文档\n💾 手动保存的文档\n都会显示在这里'}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredDocuments.map((doc) => (
              <button
                key={doc.id}
                onClick={() => handleOpenDocument(doc)}
                className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all border border-slate-200/50 text-left group"
              >
                <div className="flex gap-3">
                  {/* 图标 */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                      doc.source === 'chat'
                        ? 'bg-green-100 text-green-600'
                        : doc.source === 'knowledge'
                        ? 'bg-purple-100 text-purple-600'
                        : 'bg-orange-100 text-orange-600'
                    }`}
                  >
                    {doc.source === 'chat' ? (
                      <FileText className="w-5 h-5" />
                    ) : doc.source === 'knowledge' ? (
                      <BookOpen className="w-5 h-5" />
                    ) : (
                      <Upload className="w-5 h-5" />
                    )}
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 text-sm mb-1 truncate group-hover:text-blue-600 transition-colors">
                      {doc.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-2">{doc.content}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {doc.sourceName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(doc.createdAt)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full ${
                          doc.source === 'chat'
                            ? 'bg-green-50 text-green-600'
                            : doc.source === 'knowledge'
                            ? 'bg-purple-50 text-purple-600'
                            : 'bg-orange-50 text-orange-600'
                        }`}
                      >
                        {doc.source === 'chat' ? '💬' : doc.source === 'knowledge' ? '📚' : '💾'}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 文档查看弹窗 */}
      {selectedDocument && (
        <DocumentViewModal
          onClose={handleCloseDocument}
          document={{
            title: selectedDocument.title,
            content: selectedDocument.content,
            type: selectedDocument.type,
          }}
        />
      )}
    </div>
  );
}
