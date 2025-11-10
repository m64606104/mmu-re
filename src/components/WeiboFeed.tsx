/**
 * 微博热搜页面组件
 * 完整模拟微博热搜和微博详情界面
 */

import React, { useState } from 'react';

interface WeiboPost {
  id: string;
  authorAvatar: string;
  authorName: string;
  authorVerified?: boolean;
  content: string;
  images?: string[];
  topic?: string;
  likes: string;
  comments: string;
  reposts: string;
  publishTime: string;
}

interface WeiboComment {
  avatar: string;
  name: string;
  content: string;
  likes: string;
}

interface WeiboDetail {
  id: string;
  authorAvatar: string;
  authorName: string;
  authorVerified?: boolean;
  content: string;
  images?: string[];
  topic?: string;
  likes: string;
  commentCount: string;
  reposts: string;
  publishTime: string;
  comments: WeiboComment[];
}

interface WeiboFeedProps {
  rawContent: string;
}

const WeiboFeed: React.FC<WeiboFeedProps> = ({ rawContent }) => {
  const [activePost, setActivePost] = useState<string | null>(null);

  const parseContent = () => {
    const posts: WeiboPost[] = [];
    const details: { [key: string]: WeiboDetail } = {};

    // 解析微博帖子：微博帖子[id|avatar|name|verified|content|images|topic|likes|comments|reposts|time]
    const postRegex = /微博帖子\[(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\]/g;
    let match;

    while ((match = postRegex.exec(rawContent)) !== null) {
      const images = match[6] ? match[6].split(',').map(img => img.trim()) : undefined;
      posts.push({
        id: match[1],
        authorAvatar: match[2],
        authorName: match[3],
        authorVerified: match[4] === 'true',
        content: match[5],
        images,
        topic: match[7] || undefined,
        likes: match[8],
        comments: match[9],
        reposts: match[10],
        publishTime: match[11]
      });
    }

    // 解析详情：微博详情[id|avatar|name|verified|content|images|topic|likes|comments|reposts|time|评论内容]
    const detailRegex = /微博详情\[(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|([\s\S]*?)\]/g;

    while ((match = detailRegex.exec(rawContent)) !== null) {
      const images = match[6] ? match[6].split(',').map(img => img.trim()) : undefined;
      const commentsText = match[12];
      const comments: WeiboComment[] = [];

      // 解析评论：微博评论[avatar|name|content|likes]
      const commentRegex = /微博评论\[(.*?)\|(.*?)\|(.*?)\|(.*?)\]/g;
      let commentMatch;
      while ((commentMatch = commentRegex.exec(commentsText)) !== null) {
        comments.push({
          avatar: commentMatch[1],
          name: commentMatch[2],
          content: commentMatch[3],
          likes: commentMatch[4]
        });
      }

      details[match[1]] = {
        id: match[1],
        authorAvatar: match[2],
        authorName: match[3],
        authorVerified: match[4] === 'true',
        content: match[5],
        images,
        topic: match[7] || undefined,
        likes: match[8],
        commentCount: match[9],
        reposts: match[10],
        publishTime: match[11],
        comments
      };
    }

    return { posts, details };
  };

  const { posts, details } = parseContent();

  return (
    <div className="w-[320px] font-sans bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* 微博头部 */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-orange-500 font-bold text-sm">微</div>
          <span className="font-semibold">微博热搜</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" strokeWidth="2" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" />
          </svg>
        </div>
      </div>

      {/* 微博列表 */}
      <div className="max-h-[550px] overflow-y-auto">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onClick={() => setActivePost(post.id)}
          />
        ))}
      </div>

      {/* 详情弹窗 */}
      {activePost && details[activePost] && (
        <DetailPopup
          detail={details[activePost]}
          onClose={() => setActivePost(null)}
        />
      )}
    </div>
  );
};

const PostCard: React.FC<{ post: WeiboPost; onClick: () => void }> = ({ post, onClick }) => (
  <div onClick={onClick} className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
    {/* 作者信息 */}
    <div className="flex items-center gap-2 mb-3">
      <img src={post.authorAvatar} alt="Avatar" className="w-10 h-10 rounded-full" />
      <div className="flex-1">
        <div className="flex items-center gap-1">
          <span className="text-[14px] font-medium text-gray-900">{post.authorName}</span>
          {post.authorVerified && (
            <svg className="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          )}
        </div>
        <div className="text-[11px] text-gray-500">{post.publishTime}</div>
      </div>
    </div>

    {/* 话题 */}
    {post.topic && (
      <div className="mb-2">
        <span className="text-[13px] text-blue-600">#{post.topic}#</span>
      </div>
    )}

    {/* 内容 */}
    <p className="text-[14px] text-gray-800 leading-relaxed mb-3 line-clamp-4">{post.content}</p>

    {/* 图片 */}
    {post.images && post.images.length > 0 && (
      <div className={`grid gap-1 mb-3 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
        {post.images.slice(0, 3).map((img, idx) => (
          <img key={idx} src={img} alt="" className="w-full h-24 object-cover rounded" />
        ))}
      </div>
    )}

    {/* 互动数据 */}
    <div className="flex items-center gap-6 text-[12px] text-gray-500">
      <div className="flex items-center gap-1">
        <span>🔁</span>
        <span>{post.reposts}</span>
      </div>
      <div className="flex items-center gap-1">
        <span>💬</span>
        <span>{post.comments}</span>
      </div>
      <div className="flex items-center gap-1">
        <span>❤️</span>
        <span>{post.likes}</span>
      </div>
    </div>
  </div>
);

const DetailPopup: React.FC<{ detail: WeiboDetail; onClose: () => void }> = ({ detail, onClose }) => (
  <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000] cursor-pointer" onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()} className="bg-white w-[340px] max-h-[90%] rounded-2xl flex flex-col cursor-default shadow-2xl">
      {/* 头部 */}
      <div className="p-4 flex justify-between items-start border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1">
          <img src={detail.authorAvatar} alt="Avatar" className="w-10 h-10 rounded-full" />
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[14px] font-medium text-gray-900">{detail.authorName}</span>
              {detail.authorVerified && <span className="text-orange-500">✓</span>}
            </div>
            <div className="text-[11px] text-gray-500">{detail.publishTime}</div>
          </div>
        </div>
        <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600 w-8 h-8 flex-shrink-0">×</button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 话题 */}
        {detail.topic && (
          <div className="mb-3">
            <span className="text-[14px] text-blue-600 font-medium">#{detail.topic}#</span>
          </div>
        )}

        {/* 正文 */}
        <p className="text-[15px] text-gray-800 leading-relaxed mb-4 whitespace-pre-wrap">{detail.content}</p>

        {/* 图片 */}
        {detail.images && detail.images.length > 0 && (
          <div className="grid grid-cols-3 gap-1 mb-4">
            {detail.images.map((img, idx) => (
              <img key={idx} src={img} alt="" className="w-full h-28 object-cover rounded" />
            ))}
          </div>
        )}

        {/* 互动栏 */}
        <div className="flex items-center justify-around py-3 border-y border-gray-100 mb-4">
          <button className="flex flex-col items-center gap-1 text-gray-600">
            <span>🔁</span>
            <span className="text-[12px]">{detail.reposts}</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-600">
            <span>💬</span>
            <span className="text-[12px]">{detail.commentCount}</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-600">
            <span>❤️</span>
            <span className="text-[12px]">{detail.likes}</span>
          </button>
        </div>

        {/* 评论区 */}
        <h3 className="text-[14px] font-semibold mb-3 text-gray-900">热门评论</h3>
        {detail.comments.map((comment, idx) => (
          <div key={idx} className="flex gap-2 mb-3 pb-3 border-b border-gray-50">
            <img src={comment.avatar} alt="Avatar" className="w-7 h-7 rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-gray-900 mb-1">{comment.name}</div>
              <p className="text-[13px] text-gray-700 leading-relaxed mb-2">{comment.content}</p>
              <div className="flex items-center gap-3 text-[11px] text-gray-500">
                <span>❤️ {comment.likes}</span>
                <button className="hover:text-orange-500">回复</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 底部评论输入 */}
      <div className="p-3 border-t border-gray-100 flex gap-2 flex-shrink-0">
        <div className="flex-1 bg-gray-50 rounded-full px-4 py-2 text-[13px] text-gray-400">
          说点什么...
        </div>
        <button className="text-[24px]">😊</button>
      </div>
    </div>
  </div>
);

export default WeiboFeed;
