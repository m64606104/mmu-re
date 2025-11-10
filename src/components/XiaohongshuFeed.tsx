/**
 * 小红书瀑布流渲染组件
 * 完整模拟小红书发现页面
 */

import React, { useState } from 'react';

interface XiaohongshuPost {
  id: string;
  image: string;
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

interface XiaohongshuDetail {
  id: string;
  authorAvatar: string;
  authorName: string;
  mainImage: string;
  title: string;
  content: string;
  publishDate: string;
  commentCount: string;
  likes: string;
  collects: string;
  comments: XiaohongshuComment[];
}

interface XiaohongshuFeedProps {
  rawContent: string;
}

const XiaohongshuFeed: React.FC<XiaohongshuFeedProps> = ({ rawContent }) => {
  const [activePopup, setActivePopup] = useState<string | null>(null);

  const parseContent = () => {
    const leftPosts: XiaohongshuPost[] = [];
    const rightPosts: XiaohongshuPost[] = [];
    const details: { [key: string]: XiaohongshuDetail } = {};

    const postRegex = /小红书帖子\[(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\]/g;
    let match;
    let postIndex = 0;
    
    while ((match = postRegex.exec(rawContent)) !== null) {
      const post: XiaohongshuPost = {
        id: match[1],
        image: match[2],
        imageDesc: match[3],
        title: match[4],
        authorAvatar: match[5],
        authorName: match[6],
        likes: match[7]
      };
      
      if (postIndex % 2 === 0) {
        leftPosts.push(post);
      } else {
        rightPosts.push(post);
      }
      postIndex++;
    }

    const detailRegex = /小红书弹窗\[(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|([\s\S]*?)\]/g;
    
    while ((match = detailRegex.exec(rawContent)) !== null) {
      const commentsText = match[11];
      const comments: XiaohongshuComment[] = [];
      
      const commentRegex = /小红书评论\[(.*?)\|(.*?)\|(.*?)\]/g;
      let commentMatch;
      while ((commentMatch = commentRegex.exec(commentsText)) !== null) {
        comments.push({
          avatar: commentMatch[1],
          name: commentMatch[2],
          content: commentMatch[3]
        });
      }

      details[match[1]] = {
        id: match[1],
        authorAvatar: match[2],
        authorName: match[3],
        mainImage: match[4],
        title: match[5],
        content: match[6],
        publishDate: match[7],
        commentCount: match[8],
        likes: match[9],
        collects: match[10],
        comments
      };
    }

    return { leftPosts, rightPosts, details };
  };

  const { leftPosts, rightPosts, details } = parseContent();

  return (
    <div className="w-[280px] font-sans bg-gray-100 p-3 rounded-2xl border border-gray-200 relative">
      <div className="flex justify-between items-center px-1 pb-3">
        <div className="text-base font-bold text-gray-800">发现</div>
        <div className="flex items-center gap-3">
          <svg className="w-[18px] h-[18px] text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" strokeWidth="2" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" />
          </svg>
          <svg className="w-[18px] h-[18px] text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" />
          </svg>
        </div>
      </div>

      <div className="flex justify-between gap-2">
        <div className="w-[48%] flex flex-col gap-2">
          {leftPosts.map((post) => (
            <PostCard key={post.id} post={post} onClick={() => setActivePopup(post.id)} />
          ))}
        </div>

        <div className="w-[48%] flex flex-col gap-2">
          {rightPosts.map((post) => (
            <PostCard key={post.id} post={post} onClick={() => setActivePopup(post.id)} />
          ))}
        </div>
      </div>

      {activePopup && details[activePopup] && (
        <DetailPopup
          detail={details[activePopup]}
          onClose={() => setActivePopup(null)}
        />
      )}
    </div>
  );
};

const PostCard: React.FC<{ post: XiaohongshuPost; onClick: () => void }> = ({ post, onClick }) => (
  <div onClick={onClick} className="bg-white rounded-lg overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow">
    <img src={post.image} alt={post.imageDesc} className="w-full block" />
    <div className="p-1.5">
      <p className="text-[10px] text-gray-800 mb-1 font-medium leading-tight line-clamp-2">{post.title}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <img src={post.authorAvatar} alt="Avatar" className="w-3 h-3 rounded-full flex-shrink-0" />
          <span className="text-[8px] text-gray-500 truncate">{post.authorName}</span>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <svg className="w-2.5 h-2.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeWidth="2" />
          </svg>
          <span className="text-[8px] text-gray-500">{post.likes}</span>
        </div>
      </div>
    </div>
  </div>
);

const DetailPopup: React.FC<{ detail: XiaohongshuDetail; onClose: () => void }> = ({ detail, onClose }) => (
  <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-[1000] cursor-pointer" onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()} className="bg-white w-[260px] max-h-[85%] rounded-2xl flex flex-col cursor-default shadow-2xl">
      <div className="p-3 flex justify-between items-center border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <img src={detail.authorAvatar} alt="Avatar" className="w-8 h-8 rounded-full" />
          <span className="text-[13px] font-bold text-gray-900">{detail.authorName}</span>
        </div>
        <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600 w-8 h-8">×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <img src={detail.mainImage} alt="Post" className="w-full rounded-lg mb-2.5" />
        <h2 className="text-[15px] mb-1.5 text-gray-900 font-semibold leading-snug">{detail.title}</h2>
        <p className="text-[13px] text-gray-700 mb-2.5 leading-relaxed whitespace-pre-wrap">{detail.content}</p>
        <span className="text-[11px] text-gray-400">{detail.publishDate}</span>
        <hr className="my-3 border-gray-100" />
        <h3 className="text-[13px] font-semibold mb-2.5 text-gray-900">共 {detail.commentCount} 条评论</h3>

        {detail.comments.map((comment, idx) => (
          <div key={idx} className="flex mb-2 gap-1.5">
            <img src={comment.avatar} alt="Avatar" className="w-5 h-5 rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-gray-500 mb-0.5">{comment.name}</p>
              <p className="text-[10px] text-gray-800 leading-relaxed whitespace-normal">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-2.5 border-t border-gray-100 flex items-center gap-3 flex-shrink-0">
        <div className="flex-1 bg-gray-50 rounded-full px-3 py-1.5 text-[12px] text-gray-400">说点什么...</div>
        <div className="text-center"><div className="text-[10px] text-gray-600">❤️ {detail.likes}</div></div>
        <div className="text-center"><div className="text-[10px] text-gray-600">⭐ {detail.collects}</div></div>
        <div className="text-center"><div className="text-[10px] text-gray-600">💬 {detail.commentCount}</div></div>
      </div>
    </div>
  </div>
);

export default XiaohongshuFeed;
