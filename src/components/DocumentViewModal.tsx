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
  
  // 🔥 微信公众号文章类
  if (lowerTitle.includes('公众号') || lowerTitle.includes('推文') || 
      (content.includes('作者') && content.includes('来源') && content.length > 500)) {
    const lines = content.split('\n').filter(l => l.trim());
    const titleLine = lines[0] || title;
    const author = lines.find(l => l.includes('作者'))?.replace(/作者[:：]\s*/, '') || '';
    const contentLines = lines.slice(author ? 2 : 1);
    
    return (
      <div className="max-w-[400px] mx-auto bg-white">
        {/* 公众号头部 */}
        <div className="px-6 pt-8 pb-6 bg-white">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-4" style={{ letterSpacing: '-0.5px' }}>
            {titleLine}
          </h1>
          <div className="flex items-center justify-between text-sm text-gray-500 border-b pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {author.charAt(0) || 'A'}
              </div>
              <span>{author || '公众号'}</span>
            </div>
            <div className="text-xs text-gray-400">
              刚刚
            </div>
          </div>
        </div>
        
        {/* 公众号正文 */}
        <div className="px-6 pb-8">
          <div className="text-gray-800 leading-loose text-[15px] space-y-4">
            {contentLines.map((line, idx) => (
              line.trim() && (
                <p key={idx} className="indent-8">
                  {line}
                </p>
              )
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  // 📰 新闻类（澎湃风格）
  if (lowerTitle.includes('新闻') || lowerTitle.includes('资讯') || lowerTitle.includes('快讯') ||
      lowerContent.includes('记者') || lowerContent.includes('报道') || lowerContent.includes('消息')) {
    const lines = content.split('\n').filter(l => l.trim());
    const headline = lines[0] || title;
    const source = lines.find(l => l.includes('来源'))?.replace(/来源[:：]\s*/, '') || '澎湃新闻';
    const time = lines.find(l => l.includes('时间'))?.replace(/时间[:：]\s*/, '') || '刚刚';
    const contentLines = lines.slice(1).filter(l => !l.includes('来源') && !l.includes('时间'));
    
    return (
      <div className="max-w-[400px] mx-auto bg-white">
        {/* 新闻头部 */}
        <div className="border-b-4 border-blue-600 pb-4 mb-4">
          <div className="bg-blue-600 text-white px-4 py-2 text-xs font-bold inline-block mb-4">
            📰 热点新闻
          </div>
          <h1 className="text-2xl font-bold text-gray-900 px-4 leading-tight">
            {headline}
          </h1>
        </div>
        
        {/* 新闻元信息 */}
        <div className="flex items-center gap-4 px-4 mb-6 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            📡 {source}
          </span>
          <span>•</span>
          <span>{time}</span>
        </div>
        
        {/* 新闻正文 */}
        <div className="px-4 pb-6">
          <div className="text-gray-800 leading-relaxed text-[15px] space-y-3">
            {contentLines.map((line, idx) => (
              line.trim() && (
                <p key={idx} className="indent-8">
                  {line}
                </p>
              )
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  // 🎭 微博帖子类
  if (lowerTitle.includes('微博') || lowerTitle.includes('动态') || 
      (content.includes('#') && content.includes('话题'))) {
    const lines = content.split('\n').filter(l => l.trim());
    const username = lines.find(l => l.includes('@'))?.replace('@', '') || '微博用户';
    const mainContent = lines.filter(l => !l.includes('@') && !l.includes('来源')).join('\n');
    
    return (
      <div className="max-w-[400px] mx-auto bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* 微博头部 */}
        <div className="flex items-start gap-3 p-4 bg-gradient-to-b from-orange-50 to-white">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
            {username.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">{username}</div>
            <div className="text-xs text-gray-500">刚刚</div>
          </div>
          <div className="text-orange-500 text-sm">+ 关注</div>
        </div>
        
        {/* 微博内容 */}
        <div className="px-4 pb-4">
          <div className="text-gray-800 text-[15px] leading-relaxed whitespace-pre-wrap">
            {mainContent}
          </div>
          
          {/* 微博互动 */}
          <div className="flex items-center justify-around mt-6 pt-4 border-t border-gray-100 text-gray-500 text-sm">
            <div className="flex items-center gap-1">
              💬 <span>评论</span>
            </div>
            <div className="flex items-center gap-1">
              🔁 <span>转发</span>
            </div>
            <div className="flex items-center gap-1">
              ❤️ <span>点赞</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // 💡 知乎问答类
  if (lowerTitle.includes('知乎') || lowerTitle.includes('问答') || lowerTitle.includes('如何') ||
      lowerTitle.includes('为什么') || content.includes('题主') || content.includes('谢邀')) {
    const lines = content.split('\n').filter(l => l.trim());
    const question = lines[0] || title;
    const answerer = lines.find(l => l.includes('答主'))?.replace(/答主[:：]\s*/, '') || '匿名用户';
    const answerContent = lines.slice(1).filter(l => !l.includes('答主')).join('\n');
    
    return (
      <div className="max-w-[400px] mx-auto bg-white">
        {/* 知乎问题 */}
        <div className="px-4 py-6 bg-gradient-to-b from-blue-50 to-white border-b">
          <div className="text-xs text-blue-600 font-semibold mb-2">💡 知乎问答</div>
          <h2 className="text-xl font-bold text-gray-900 leading-tight">
            {question}
          </h2>
        </div>
        
        {/* 回答者信息 */}
        <div className="flex items-center gap-3 px-4 py-4 bg-gray-50">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
            {answerer.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">{answerer}</div>
            <div className="text-xs text-gray-500">资深用户</div>
          </div>
        </div>
        
        {/* 回答内容 */}
        <div className="px-4 py-6">
          <div className="text-gray-800 text-[15px] leading-loose whitespace-pre-wrap">
            {answerContent}
          </div>
          
          {/* 互动区 */}
          <div className="flex items-center gap-6 mt-6 pt-4 border-t text-gray-500 text-sm">
            <div className="flex items-center gap-1">
              👍 <span>赞同</span>
            </div>
            <div className="flex items-center gap-1">
              💬 <span>评论</span>
            </div>
            <div className="flex items-center gap-1">
              ⭐ <span>收藏</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
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
