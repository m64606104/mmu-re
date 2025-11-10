import React from 'react';

interface DocumentCardProps {
  title: string;
  content: string;
  greeting?: string;
  type: 'text' | 'markdown' | 'code';
  onClick: (e?: React.MouseEvent) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ title, content, greeting, onClick }) => {
  // 智能识别文档类型，返回图标和类型标签
  const getDocumentInfo = (): { icon: string; label: string; bgColor: string } => {
    const lowerTitle = title.toLowerCase();
    const lowerContent = content.substring(0, 300).toLowerCase();
    
    // 🔥 优先级1：待办事项/工作计划（避免被误识别为新闻）
    if (lowerTitle.includes('待办') || lowerTitle.includes('事项') || 
        lowerTitle.includes('计划') || lowerTitle.includes('日程') ||
        lowerTitle.includes('任务') || lowerTitle.includes('to do') || lowerTitle.includes('todo')) {
      return { icon: '✅', label: '工作计划', bgColor: 'from-blue-400 to-blue-500' };
    }
    
    // 微信公众号
    if (lowerTitle.includes('公众号') || lowerTitle.includes('推文')) {
      return { icon: '📱', label: '微信公众号', bgColor: 'from-green-400 to-green-500' };
    }
    
    // 新闻类（降低优先级，避免误识别）
    if (lowerTitle.includes('新闻') || lowerTitle.includes('资讯') || lowerTitle.includes('快讯')) {
      return { icon: '📰', label: '澎湃新闻', bgColor: 'from-blue-500 to-blue-600' };
    }
    
    // 微博
    if (lowerTitle.includes('微博') || lowerTitle.includes('动态') || content.includes('#')) {
      return { icon: '🎭', label: '微博热搜', bgColor: 'from-orange-400 to-red-500' };
    }
    
    // 知乎
    if (lowerTitle.includes('知乎') || lowerTitle.includes('问答') || lowerTitle.includes('如何') || lowerTitle.includes('为什么')) {
      return { icon: '💡', label: '知乎问答', bgColor: 'from-blue-400 to-blue-600' };
    }
    
    // 信件
    if (lowerTitle.includes('信') || lowerTitle.includes('情书') ||
        lowerContent.includes('亲爱的') || lowerContent.includes('提笔')) {
      return { icon: '✉️', label: '私人信件', bgColor: 'from-amber-400 to-yellow-500' };
    }
    
    // 日记/日志
    if (lowerTitle.includes('日记') || lowerTitle.includes('日志')) {
      return { icon: '📖', label: '个人日记', bgColor: 'from-amber-400 to-orange-500' };
    }
    
    // 小说/文学
    if (lowerTitle.includes('小说') || lowerTitle.includes('同人') || lowerTitle.includes('番外')) {
      return { icon: '📚', label: '文学作品', bgColor: 'from-purple-400 to-pink-500' };
    }
    
    // 报告/分析
    if (lowerTitle.includes('报告') || lowerTitle.includes('分析') || lowerTitle.includes('数据')) {
      return { icon: '📊', label: '数据报告', bgColor: 'from-cyan-400 to-blue-500' };
    }
    
    // 默认
    return { icon: '📄', label: '在线文档', bgColor: 'from-gray-400 to-gray-500' };
  };
  
  const docInfo = getDocumentInfo();
  
  return (
    <div onClick={onClick} className="cursor-pointer">
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition-all max-w-[280px]">
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* 图标 */}
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${docInfo.bgColor} flex items-center justify-center flex-shrink-0 text-white`}>
              <span className="text-2xl">{docInfo.icon}</span>
            </div>
            {/* 内容 */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 mb-1 line-clamp-2 leading-snug">{title}</div>
              <div className="text-xs text-gray-500 flex items-center gap-1.5">
                <span>{greeting || '请查收'}</span>
                <span>•</span>
                <span>{docInfo.label}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentCard;
