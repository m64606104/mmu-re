import React from 'react';

interface DocumentCardProps {
  title: string;
  content: string;
  greeting?: string;
  type: 'text' | 'markdown' | 'code';
  onClick: (e?: React.MouseEvent) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ title, content, greeting, type, onClick }) => {
  // 智能识别文档类型
  const getDocumentStyle = () => {
    const lowerTitle = title.toLowerCase();
    const lowerContent = content.substring(0, 300).toLowerCase();
    
    // 新闻类 - 报纸风格
    if (lowerTitle.includes('新闻') || lowerTitle.includes('资讯') || lowerTitle.includes('快讯') ||
        lowerContent.includes('【导语】') || lowerContent.includes('记者') || lowerContent.includes('报道')) {
      const preview = content.substring(0, 80);
      return (
        <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-shadow max-w-[280px]">
          <div className="bg-red-500 text-white px-4 py-2 flex items-center gap-2">
            <span className="text-xl">📰</span>
            <span className="font-bold text-sm">新闻快讯</span>
          </div>
          <div className="p-4">
            <h3 className="font-bold text-gray-900 mb-2 text-sm leading-tight">{title}</h3>
            <p className="text-xs text-gray-600 line-clamp-3">{preview}...</p>
            <div className="mt-3 text-xs text-red-500 font-medium">点击阅读全文 →</div>
          </div>
        </div>
      );
    }
    
    // 信件 - 信封风格
    if (lowerTitle.includes('信') || lowerTitle.includes('情书') ||
        lowerContent.includes('亲爱的') || lowerContent.includes('提笔') || lowerContent.includes('落款')) {
      return (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-shadow max-w-[280px] relative">
          <div className="absolute top-0 right-0 w-0 h-0 border-t-[40px] border-t-amber-400 border-l-[40px] border-l-transparent"></div>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-3xl">✉️</span>
              <div>
                <div className="text-xs text-amber-600 font-medium">私人信件</div>
                <div className="text-xs text-amber-500">请拆阅</div>
              </div>
            </div>
            <h3 className="font-serif font-bold text-gray-900 mb-2">{title}</h3>
            <div className="text-xs text-amber-700 italic">"{content.substring(0, 50)}..."</div>
          </div>
        </div>
      );
    }
    
    // 八卦爆料 - 热点风格
    if (lowerTitle.includes('八卦') || lowerTitle.includes('爆料') || lowerTitle.includes('瓜') ||
        lowerContent.includes('据说') || lowerContent.includes('传闻') || lowerContent.includes('爆料')) {
      return (
        <div className="bg-gradient-to-br from-orange-100 to-red-100 border-2 border-orange-400 rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-shadow max-w-[280px]">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🔥</span>
              <span className="text-xs font-bold tracking-wide">热点爆料</span>
            </div>
            <div className="text-xs opacity-90">今日热门</div>
          </div>
          <div className="p-4">
            <h3 className="font-bold text-gray-900 mb-2 text-sm">{title}</h3>
            <p className="text-xs text-gray-700 line-clamp-2">{content.substring(0, 60)}...</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-orange-600 font-medium">🔥 火速围观</span>
            </div>
          </div>
        </div>
      );
    }
    
    // 小说/文学作品 - 书本风格
    if (lowerTitle.includes('同人') || lowerTitle.includes('小说') || lowerTitle.includes('番外') ||
        lowerContent.includes('第一章') || lowerContent.includes('完') || lowerContent.match(/[""].*[""]说/)) {
      return (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-shadow max-w-[280px]">
          <div className="p-4 border-b-2 border-purple-200">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📖</span>
              <div>
                <h3 className="font-serif font-bold text-purple-900 text-sm">{title}</h3>
                <div className="text-xs text-purple-600">文学作品</div>
              </div>
            </div>
          </div>
          <div className="p-4 bg-white/50">
            <p className="text-xs text-gray-700 leading-relaxed line-clamp-4 font-serif">
              {content.substring(0, 100)}...
            </p>
            <div className="mt-3 text-xs text-purple-500 font-medium">继续阅读 →</div>
          </div>
        </div>
      );
    }
    
    // 报告/分析 - 专业风格
    if (lowerTitle.includes('报告') || lowerTitle.includes('分析') || lowerTitle.includes('数据') ||
        lowerContent.includes('摘要') || lowerContent.includes('结论') || lowerContent.includes('%')) {
      return (
        <div className="bg-white border-2 border-cyan-300 rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-shadow max-w-[280px]">
          <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              <div>
                <div className="font-bold text-sm">{title}</div>
                <div className="text-xs opacity-90">数据分析报告</div>
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-cyan-50 rounded-lg p-2">
                <div className="text-xs text-cyan-600">数据详实</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-2">
                <div className="text-xs text-blue-600">专业分析</div>
              </div>
            </div>
            <p className="text-xs text-gray-600 line-clamp-2">{content.substring(0, 60)}...</p>
          </div>
        </div>
      );
    }
    
    // 攻略/教程 - 指南风格
    if (lowerTitle.includes('攻略') || lowerTitle.includes('教程') || lowerTitle.includes('指南') ||
        lowerContent.includes('步骤') || lowerContent.includes('技巧') || lowerContent.includes('注意事项')) {
      return (
        <div className="bg-gradient-to-br from-teal-50 to-green-50 border-2 border-teal-300 rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-shadow max-w-[280px]">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-3xl">📚</span>
              <div>
                <h3 className="font-bold text-teal-900 text-sm">{title}</h3>
                <div className="text-xs text-teal-600">实用攻略</div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 mb-2">
              <p className="text-xs text-gray-700 line-clamp-3">{content.substring(0, 80)}...</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-teal-600">
              <span>💡</span>
              <span>查看完整教程</span>
            </div>
          </div>
        </div>
      );
    }
    
    // 默认样式 - 简洁卡片
    return (
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow max-w-[280px]">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">📄</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate mb-1">{title}</div>
              <div className="text-xs text-gray-500 flex items-center gap-2">
                {greeting && (
                  <>
                    <span>{greeting}</span>
                    <span>•</span>
                  </>
                )}
                <span>在线文档</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div onClick={onClick}>
      {getDocumentStyle()}
    </div>
  );
};

export default DocumentCard;
