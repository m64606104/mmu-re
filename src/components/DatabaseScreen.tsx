import { useState, useMemo, useEffect } from 'react';
import { Calendar, Database, FileText, Search, FolderOpen, BookOpen, X, Upload, Settings } from 'lucide-react';
import { Conversation, KnowledgeBaseItem } from '../types';
import WordStyleDocumentModal from './WordStyleDocumentModal';
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
  const [desktopSelectedId, setDesktopSelectedId] = useState<string | null>(null);
  const [savedDocs, setSavedDocs] = useState<SavedDocument[]>([]);

  useEffect(() => {
    void getDocumentLibrary().then(setSavedDocs);
  }, []);

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
  }, [conversations, savedDocs]);

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

  const desktopSelectedDoc = useMemo(() => {
    if (!desktopSelectedId) return null;
    return filteredDocuments.find((d) => d.id === desktopSelectedId) || null;
  }, [desktopSelectedId, filteredDocuments]);

  return (
    <div data-ui="screen-database" className="h-full relative overflow-hidden bg-gradient-to-br from-slate-50 via-slate-50 to-zinc-100">
      <div className="absolute inset-0 bg-white/78 backdrop-blur-[1px]" />
      <div className="relative z-10 h-full flex flex-col">
        {/* 顶栏（统一 Gemini 风格） */}
        <header className="h-16 border-b border-zinc-200 bg-white/85 backdrop-blur-md px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-semibold text-zinc-900">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            资料库
          </div>
          <nav className="hidden md:flex items-center gap-2">
            <button onClick={onBack} className="px-3 py-1.5 text-sm rounded-full text-zinc-600 hover:bg-zinc-100">返回</button>
            <button className="px-3 py-1.5 text-sm rounded-full bg-zinc-900 text-white">资料库</button>
          </nav>
          <button onClick={onBack} className="w-9 h-9 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-700" title="返回">
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* 主体：移动端一列，桌面端两栏 */}
        <div className="flex-1 min-h-0 flex">
          <aside className="w-full md:w-[420px] md:border-r border-zinc-200 bg-white/65">
            {/* 统计 & 搜索 */}
            <div className="px-4 md:px-6 py-4 border-b border-zinc-200/70">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">文档与资料库</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    共 {stats.total} 份 · 聊天 {stats.chat} · 知识库 {stats.knowledge} · 保存 {stats.saved}
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-2">
                  <button onClick={onBack} className="w-9 h-9 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-700" title="设置">
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="搜索标题、内容或来源…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-zinc-100 rounded-xl text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-200 rounded-full transition-colors"
                  >
                    <X className="w-3 h-3 text-zinc-500" />
                  </button>
                )}
              </div>

              {/* 过滤 */}
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {[
                  { id: 'all', label: `全部 (${stats.total})` },
                  { id: 'chat', label: `💬 聊天 (${stats.chat})` },
                  { id: 'knowledge', label: `📚 知识库 (${stats.knowledge})` },
                  { id: 'saved', label: `💾 保存 (${stats.saved})` },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => setSelectedSource(chip.id as any)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                      selectedSource === chip.id
                        ? 'bg-zinc-900 text-white'
                        : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 列表 */}
            <div className="h-[calc(100%-0px)] overflow-y-auto">
              {filteredDocuments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full px-6 text-center py-10">
                  <FolderOpen className="w-16 h-16 text-zinc-300 mb-4" />
                  <p className="text-zinc-600 text-sm mb-1">
                    {searchQuery ? '没有找到相关文档' : '还没有保存任何文档'}
                  </p>
                  <p className="text-zinc-400 text-xs max-w-xs">
                    {searchQuery ? '试试调整关键词' : '聊天文档、角色知识库、手动保存的文档都会在这里聚合展示。'}
                  </p>
                </div>
              ) : (
                <div className="p-3 md:p-4 space-y-2">
                  {filteredDocuments.map((doc) => {
                    const isActive = doc.id === desktopSelectedId;
                    const Icon = doc.source === 'chat' ? FileText : doc.source === 'knowledge' ? BookOpen : Upload;
                    return (
                      <button
                        key={doc.id}
                        onClick={() => {
                          setDesktopSelectedId(doc.id);
                          if (window.innerWidth < 768) handleOpenDocument(doc);
                        }}
                        onDoubleClick={() => handleOpenDocument(doc)}
                        className={`w-full rounded-2xl p-4 text-left border transition ${
                          isActive
                            ? 'bg-white border-zinc-300 shadow-sm'
                            : 'bg-white/90 border-zinc-200 hover:bg-white hover:shadow-sm'
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="font-semibold text-zinc-900 text-sm truncate">{doc.title}</h3>
                              <span className="text-[11px] text-zinc-400 flex items-center gap-1 flex-shrink-0">
                                <Calendar className="w-3 h-3" />
                                {formatDate(doc.createdAt)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{doc.content}</p>
                            <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                              <span className="inline-flex items-center gap-1">
                                <Database className="w-3 h-3" />
                                {doc.sourceName}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          {/* 右侧预览（桌面端） */}
          <section className="hidden md:flex flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto p-8">
              <div className="max-w-[900px] mx-auto">
                {!desktopSelectedDoc ? (
                  <div className="rounded-3xl border border-zinc-200 bg-white/80 p-10 text-center">
                    <div className="text-lg font-semibold text-zinc-900">选择一份文档开始浏览</div>
                    <div className="mt-2 text-sm text-zinc-600">左侧选中文档后，这里会显示内容预览与导出入口。</div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-zinc-200 bg-white/90 overflow-hidden">
                    <div className="p-6 border-b border-zinc-100">
                      <div className="text-xl font-semibold text-zinc-900">{desktopSelectedDoc.title}</div>
                      <div className="mt-2 flex items-center gap-3 text-sm text-zinc-500">
                        <span>{desktopSelectedDoc.sourceName}</span>
                        <span>·</span>
                        <span>{formatDate(desktopSelectedDoc.createdAt)}</span>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => handleOpenDocument(desktopSelectedDoc)}
                          className="px-4 py-2 rounded-full bg-zinc-900 text-white text-sm hover:bg-zinc-800 transition"
                        >
                          打开全文/导出
                        </button>
                        <button
                          onClick={() => setDesktopSelectedId(null)}
                          className="px-4 py-2 rounded-full bg-white border border-zinc-200 text-zinc-700 text-sm hover:bg-zinc-50 transition"
                        >
                          取消选择
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <pre className="whitespace-pre-wrap text-sm leading-6 text-zinc-800 max-h-[520px] overflow-y-auto">
                        {desktopSelectedDoc.content}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* 文档查看弹窗 */}
        {selectedDocument && (
          <WordStyleDocumentModal
            document={{
              title: selectedDocument.title,
              content: selectedDocument.content,
              type: selectedDocument.type,
            }}
            author={selectedDocument.sourceName}
            timestamp={selectedDocument.createdAt}
            onClose={handleCloseDocument}
          />
        )}
      </div>
    </div>
  );
}
