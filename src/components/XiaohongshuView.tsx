import React, { useState } from 'react';

interface XiaohongshuPost {
  id: string;
  imageUrl: string;
  imageDesc: string;
  title: string;
  authorAvatar: string;
  authorName: string;
  likes: string;
}

interface XiaohongshuComment {
  avatar: string;
  name: string;
  content: string;
}

interface XiaohongshuPopup {
  id: string;
  authorAvatar: string;
  authorName: string;
  mainImage: string;
  title: string;
  content: string;
  publishDate: string;
  commentCount: string;
  likes: string;
  favorites: string;
  comments: XiaohongshuComment[];
}

interface XiaohongshuData {
  leftPosts: XiaohongshuPost[];
  rightPosts: XiaohongshuPost[];
  popups: XiaohongshuPopup[];
}

interface XiaohongshuViewProps {
  rawContent: string;
}

const XiaohongshuView: React.FC<XiaohongshuViewProps> = ({ rawContent }) => {
  const [activePopup, setActivePopup] = useState<string | null>(null);
  
  // 解析小红书内容
  const parseXiaohongshu = (content: string): XiaohongshuData => {
    const data: XiaohongshuData = {
      leftPosts: [],
      rightPosts: [],
      popups: []
    };
    
    // 解析瀑布流 小红书瀑布流[左侧|右侧|弹窗]
    const flowMatch = content.match(/小红书瀑布流\[([\s\S]*?)\|([\s\S]*?)\|([\s\S]*?)\]/);
    if (!flowMatch) return data;
    
    const [_, leftContent, rightContent, popupContent] = flowMatch;
    
    // 解析帖子 小红书帖子[popup-id|图片URL|图片描述|标题|作者头像|作者名|点赞数]
    const postRegex = /小红书帖子\[(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\]/g;
    
    let match;
    while ((match = postRegex.exec(leftContent)) !== null) {
      data.leftPosts.push({
        id: match[1],
        imageUrl: match[2],
        imageDesc: match[3],
        title: match[4],
        authorAvatar: match[5],
        authorName: match[6],
        likes: match[7]
      });
    }
    
    postRegex.lastIndex = 0;
    while ((match = postRegex.exec(rightContent)) !== null) {
      data.rightPosts.push({
        id: match[1],
        imageUrl: match[2],
        imageDesc: match[3],
        title: match[4],
        authorAvatar: match[5],
        authorName: match[6],
        likes: match[7]
      });
    }
    
    // 解析弹窗
    const popupRegex = /小红书弹窗\[(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|([\s\S]*?)\]/g;
    while ((match = popupRegex.exec(popupContent)) !== null) {
      const commentsStr = match[11];
      const comments: XiaohongshuComment[] = [];
      
      // 解析评论 小红书评论[头像|名字|内容]
      const commentRegex = /小红书评论\[(.*?)\|(.*?)\|(.*?)\]/g;
      let commentMatch;
      while ((commentMatch = commentRegex.exec(commentsStr)) !== null) {
        comments.push({
          avatar: commentMatch[1],
          name: commentMatch[2],
          content: commentMatch[3]
        });
      }
      
      data.popups.push({
        id: match[1],
        authorAvatar: match[2],
        authorName: match[3],
        mainImage: match[4],
        title: match[5],
        content: match[6],
        publishDate: match[7],
        commentCount: match[8],
        likes: match[9],
        favorites: match[10],
        comments
      });
    }
    
    return data;
  };
  
  const xhsData = parseXiaohongshu(rawContent);
  const activePopupData = xhsData.popups.find(p => p.id === activePopup);
  
  return (
    <div className="w-[240px] font-sans bg-[#f0f0f0] p-3 rounded-2xl border border-gray-300 relative max-w-[280px]">
      {/* 头部 */}
      <div className="flex justify-between items-center px-1 pb-3">
        <div className="text-base font-bold text-gray-800">发现</div>
        <div className="flex items-center gap-3">
          <svg className="w-[18px] h-[18px]" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <svg className="w-[18px] h-[18px]" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </div>
      </div>
      
      {/* 瀑布流 */}
      <div className="flex justify-between gap-2">
        {/* 左列 */}
        <div className="w-[48%] flex flex-col gap-2">
          {xhsData.leftPosts.map((post) => (
            <div
              key={post.id}
              onClick={() => setActivePopup(post.id)}
              className="bg-white rounded-lg overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            >
              <img src={post.imageUrl} alt={post.imageDesc} className="w-full block" />
              <div className="p-1.5">
                <p className="text-[10px] text-gray-900 font-medium line-clamp-2 leading-tight mb-1">
                  {post.title}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <img src={post.authorAvatar} alt="Avatar" className="w-3 h-3 rounded-full" />
                    <span className="text-[8px] text-gray-600 truncate max-w-[50px]">{post.authorName}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="#ff4500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <span className="text-[8px] text-gray-600">{post.likes}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* 右列 */}
        <div className="w-[48%] flex flex-col gap-2">
          {xhsData.rightPosts.map((post) => (
            <div
              key={post.id}
              onClick={() => setActivePopup(post.id)}
              className="bg-white rounded-lg overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            >
              <img src={post.imageUrl} alt={post.imageDesc} className="w-full block" />
              <div className="p-1.5">
                <p className="text-[10px] text-gray-900 font-medium line-clamp-2 leading-tight mb-1">
                  {post.title}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <img src={post.authorAvatar} alt="Avatar" className="w-3 h-3 rounded-full" />
                    <span className="text-[8px] text-gray-600 truncate max-w-[50px]">{post.authorName}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="#ff4500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <span className="text-[8px] text-gray-600">{post.likes}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 弹窗 */}
      {activePopupData && (
        <div
          className="absolute top-0 left-0 right-0 bottom-0 bg-black/40 flex items-center justify-center z-50 rounded-2xl"
          onClick={() => setActivePopup(null)}
        >
          <div
            className="bg-white w-[220px] max-h-[85%] rounded-2xl flex flex-col overflow-hidden shadow-xl animate-[popIn_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div className="p-3 flex justify-between items-center border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <img src={activePopupData.authorAvatar} alt="Avatar" className="w-8 h-8 rounded-full" />
                <span className="text-sm font-bold">{activePopupData.authorName}</span>
              </div>
              <button
                onClick={() => setActivePopup(null)}
                className="text-2xl text-gray-400 hover:text-gray-600 leading-none px-1"
              >
                ×
              </button>
            </div>
            
            {/* 弹窗内容 */}
            <div className="flex-1 overflow-y-auto p-3">
              <img src={activePopupData.mainImage} alt="Post" className="w-full rounded-lg mb-2.5" />
              <h2 className="text-sm font-semibold text-gray-900 mb-1.5 leading-snug">
                {activePopupData.title}
              </h2>
              <p className="text-xs text-gray-700 mb-2.5 leading-relaxed whitespace-pre-wrap">
                {activePopupData.content}
              </p>
              <span className="text-[11px] text-gray-400">{activePopupData.publishDate}</span>
              
              <hr className="border-gray-100 my-3" />
              
              <h3 className="text-xs font-semibold mb-2.5">共 {activePopupData.commentCount} 条评论</h3>
              {activePopupData.comments.map((comment, idx) => (
                <div key={idx} className="flex mb-2">
                  <img src={comment.avatar} alt="Avatar" className="w-5 h-5 rounded-full mr-1.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-[9px] text-gray-600">{comment.name}</p>
                    <p className="text-[10px] text-gray-900 mt-0.5 whitespace-normal">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* 弹窗底部 */}
            <div className="p-2.5 border-t border-gray-100 flex items-center gap-3 flex-shrink-0">
              <div className="flex-1 bg-gray-100 rounded-full px-3 py-1.5 text-xs text-gray-400">
                说点什么...
              </div>
              <div className="text-center">
                <svg className="w-4 h-4 mx-auto" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <div className="text-[10px] text-gray-700">{activePopupData.likes}</div>
              </div>
              <div className="text-center">
                <svg className="w-4 h-4 mx-auto" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                <div className="text-[10px] text-gray-700">{activePopupData.favorites}</div>
              </div>
              <div className="text-center">
                <svg className="w-4 h-4 mx-auto" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <div className="text-[10px] text-gray-700">{activePopupData.commentCount}</div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes popIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default XiaohongshuView;
