/**
 * 微信链接预览卡片组件
 * 
 * 模仿真实微信中打开链接的显示效果
 * 支持：小红书、知乎、微博、公众号、网页文章等
 */

import React from 'react';

export interface LinkPreviewData {
  title: string;           // 标题
  description?: string;    // 描述/摘要
  coverImage?: string;     // 封面图片URL或描述
  platform: 'xiaohongshu' | 'zhihu' | 'weibo' | 'wechat' | 'news' | 'web' | 'document';
  url?: string;            // 实际URL（如果有）
  author?: string;         // 作者
  publishTime?: string;    // 发布时间
  content?: string;        // 完整内容（用于点击后展开）
}

interface WeChatLinkPreviewProps {
  data: LinkPreviewData;
  onClick: () => void;
}

const WeChatLinkPreview: React.FC<WeChatLinkPreviewProps> = ({ data, onClick }) => {
  // 根据平台获取图标和名称
  const getPlatformInfo = () => {
    switch (data.platform) {
      case 'xiaohongshu':
        return { name: '小红书', icon: '📕', color: 'text-red-500' };
      case 'zhihu':
        return { name: '知乎', icon: '💡', color: 'text-blue-600' };
      case 'weibo':
        return { name: '微博', icon: '🎭', color: 'text-orange-500' };
      case 'wechat':
        return { name: '微信公众号', icon: '📱', color: 'text-green-600' };
      case 'news':
        return { name: '新闻', icon: '📰', color: 'text-blue-500' };
      case 'document':
        return { name: '文档', icon: '📄', color: 'text-gray-600' };
      default:
        return { name: '网页', icon: '🌐', color: 'text-gray-500' };
    }
  };

  const platformInfo = getPlatformInfo();

  return (
    <div 
      onClick={onClick}
      className="cursor-pointer bg-white border border-gray-200 rounded-lg overflow-hidden max-w-[280px] hover:bg-gray-50 transition-colors active:bg-gray-100"
    >
      {/* 标题 */}
      <div className="px-3 pt-3">
        <div className="text-[15px] font-medium text-gray-900 line-clamp-2 leading-snug mb-2">
          {data.title}
        </div>
      </div>

      {/* 封面图片（如果有） */}
      {data.coverImage && (
        <div className="px-3 mb-2">
          <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs overflow-hidden">
            {/* 这里可以是真实图片或AI生成的图片描述 */}
            {data.coverImage.startsWith('http') ? (
              <img src={data.coverImage} alt={data.title} className="w-full h-full object-cover" />
            ) : (
              <div className="text-center px-3">
                <div className="text-4xl mb-1">🖼️</div>
                <div className="text-[11px] line-clamp-2">{data.coverImage}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 描述/摘要 */}
      {data.description && (
        <div className="px-3 mb-2">
          <div className="text-[13px] text-gray-500 line-clamp-2 leading-relaxed">
            {data.description}
          </div>
        </div>
      )}

      {/* 底部：来源信息 */}
      <div className="px-3 pb-3 flex items-center gap-1.5 text-[12px] text-gray-400">
        <span className={platformInfo.color}>{platformInfo.icon}</span>
        <span>{platformInfo.name}</span>
        {data.author && (
          <>
            <span>•</span>
            <span className="line-clamp-1">{data.author}</span>
          </>
        )}
      </div>
    </div>
  );
};

export default WeChatLinkPreview;
