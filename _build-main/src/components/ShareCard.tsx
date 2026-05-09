import { Music, Link as LinkIcon, FileText } from 'lucide-react';

interface ShareCardProps {
  type: 'music' | 'link' | 'article';
  title: string;
  description?: string;
  coverUrl?: string;
  artist?: string; // 音乐专用
  onClick?: () => void;
}

/**
 * 微信风格的分享卡片组件
 * 用于显示音乐分享、文章分享、链接分享等
 */
export default function ShareCard({
  type,
  title,
  description,
  coverUrl,
  artist,
  onClick
}: ShareCardProps) {
  
  // 获取图标
  const getIcon = () => {
    switch (type) {
      case 'music':
        return <Music className="w-5 h-5 text-green-600" />;
      case 'article':
        return <FileText className="w-5 h-5 text-blue-600" />;
      default:
        return <LinkIcon className="w-5 h-5 text-gray-600" />;
    }
  };
  
  // 获取背景色
  const getBgColor = () => {
    switch (type) {
      case 'music':
        return 'bg-gradient-to-br from-green-50 to-emerald-50';
      case 'article':
        return 'bg-gradient-to-br from-blue-50 to-indigo-50';
      default:
        return 'bg-gradient-to-br from-gray-50 to-slate-50';
    }
  };
  
  return (
    <div 
      onClick={onClick}
      className={`
        ${getBgColor()}
        border border-gray-200 rounded-lg overflow-hidden 
        cursor-pointer hover:shadow-md transition-all
        mb-3 flex items-stretch
      `}
    >
      {/* 左侧：封面图 */}
      {coverUrl ? (
        <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 relative overflow-hidden">
          <img 
            src={coverUrl} 
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => {
              // 加载失败显示默认图标
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-gray-300/50">${getIcon().props.children}</div>`;
              }
            }}
          />
        </div>
      ) : (
        <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-gray-200/50 flex items-center justify-center">
          {getIcon()}
        </div>
      )}
      
      {/* 右侧：信息 */}
      <div className="flex-1 p-3 min-w-0 flex flex-col justify-center">
        {/* 标题 */}
        <div className="font-medium text-gray-800 text-sm line-clamp-2 mb-1">
          {title}
        </div>
        
        {/* 艺术家/描述 */}
        {(artist || description) && (
          <div className="text-xs text-gray-500 line-clamp-1">
            {artist || description}
          </div>
        )}
        
        {/* 类型标签 */}
        <div className="flex items-center gap-1 mt-1">
          {getIcon()}
          <span className="text-xs text-gray-400">
            {type === 'music' ? '音乐' : type === 'article' ? '文章' : '链接'}
          </span>
        </div>
      </div>
    </div>
  );
}
