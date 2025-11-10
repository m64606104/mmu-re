/**
 * 知乎问答页面组件
 * 完整模拟知乎问答界面
 */

import React, { useState } from 'react';

interface ZhihuAnswer {
  id: string;
  question: string;
  authorAvatar: string;
  authorName: string;
  authorDesc: string;
  answerPreview: string;
  likes: string;
  comments: string;
  fullAnswer?: string;
}

interface ZhihuComment {
  avatar: string;
  name: string;
  content: string;
  likes: string;
}

interface ZhihuDetail {
  id: string;
  question: string;
  authorAvatar: string;
  authorName: string;
  authorDesc: string;
  fullAnswer: string;
  publishDate: string;
  likes: string;
  comments: ZhihuComment[];
}

interface ZhihuFeedProps {
  rawContent: string;
}

const ZhihuFeed: React.FC<ZhihuFeedProps> = ({ rawContent }) => {
  const [activeAnswer, setActiveAnswer] = useState<string | null>(null);

  const parseContent = () => {
    const answers: ZhihuAnswer[] = [];
    const details: { [key: string]: ZhihuDetail } = {};

    // 解析回答卡片：知乎回答[id|question|avatar|name|desc|preview|likes|comments]
    const answerRegex = /知乎回答\[(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\]/g;
    let match;

    while ((match = answerRegex.exec(rawContent)) !== null) {
      answers.push({
        id: match[1],
        question: match[2],
        authorAvatar: match[3],
        authorName: match[4],
        authorDesc: match[5],
        answerPreview: match[6],
        likes: match[7],
        comments: match[8]
      });
    }

    // 解析详情弹窗：知乎详情[id|question|avatar|name|desc|fullAnswer|date|likes|评论内容]
    const detailRegex = /知乎详情\[(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|([\s\S]*?)\]/g;

    while ((match = detailRegex.exec(rawContent)) !== null) {
      const commentsText = match[9];
      const comments: ZhihuComment[] = [];

      // 解析评论：知乎评论[avatar|name|content|likes]
      const commentRegex = /知乎评论\[(.*?)\|(.*?)\|(.*?)\|(.*?)\]/g;
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
        question: match[2],
        authorAvatar: match[3],
        authorName: match[4],
        authorDesc: match[5],
        fullAnswer: match[6],
        publishDate: match[7],
        likes: match[8],
        comments
      };
    }

    return { answers, details };
  };

  const { answers, details } = parseContent();

  return (
    <div className="w-[300px] font-sans bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* 知乎头部 */}
      <div className="bg-blue-600 text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">知</div>
          <span className="font-semibold">知乎</span>
        </div>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" strokeWidth="2" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" />
        </svg>
      </div>

      {/* 问答列表 */}
      <div className="max-h-[500px] overflow-y-auto">
        {answers.map((answer) => (
          <AnswerCard
            key={answer.id}
            answer={answer}
            onClick={() => setActiveAnswer(answer.id)}
          />
        ))}
      </div>

      {/* 详情弹窗 */}
      {activeAnswer && details[activeAnswer] && (
        <DetailPopup
          detail={details[activeAnswer]}
          onClose={() => setActiveAnswer(null)}
        />
      )}
    </div>
  );
};

const AnswerCard: React.FC<{ answer: ZhihuAnswer; onClick: () => void }> = ({ answer, onClick }) => (
  <div onClick={onClick} className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
    <h3 className="text-[15px] font-semibold text-gray-900 mb-3 leading-snug">{answer.question}</h3>
    
    <div className="flex items-start gap-2 mb-3">
      <img src={answer.authorAvatar} alt="Avatar" className="w-8 h-8 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-gray-900">{answer.authorName}</div>
        <div className="text-[11px] text-gray-500 truncate">{answer.authorDesc}</div>
      </div>
    </div>

    <p className="text-[14px] text-gray-700 leading-relaxed mb-3 line-clamp-3">{answer.answerPreview}</p>

    <div className="flex items-center gap-4 text-[12px] text-gray-500">
      <div className="flex items-center gap-1">
        <span>👍</span>
        <span>{answer.likes}</span>
      </div>
      <div className="flex items-center gap-1">
        <span>💬</span>
        <span>{answer.comments} 条评论</span>
      </div>
      <div className="flex-1 text-right text-blue-600">查看全文 →</div>
    </div>
  </div>
);

const DetailPopup: React.FC<{ detail: ZhihuDetail; onClose: () => void }> = ({ detail, onClose }) => (
  <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000] cursor-pointer" onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()} className="bg-white w-[320px] max-h-[90%] rounded-2xl flex flex-col cursor-default shadow-2xl">
      {/* 头部 */}
      <div className="p-4 flex justify-between items-start border-b border-gray-100 flex-shrink-0">
        <div>
          <h2 className="text-[16px] font-bold text-gray-900 leading-snug mb-2">{detail.question}</h2>
          <div className="flex items-center gap-2">
            <img src={detail.authorAvatar} alt="Avatar" className="w-8 h-8 rounded-full" />
            <div>
              <div className="text-[13px] font-medium text-gray-900">{detail.authorName}</div>
              <div className="text-[11px] text-gray-500">{detail.authorDesc}</div>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600 w-8 h-8 flex-shrink-0">×</button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-[14px] text-gray-800 leading-relaxed mb-4 whitespace-pre-wrap">{detail.fullAnswer}</p>
        <span className="text-[11px] text-gray-400">{detail.publishDate}</span>

        {/* 互动栏 */}
        <div className="flex items-center gap-4 py-4 border-y border-gray-100 my-4">
          <button className="flex items-center gap-1 text-[13px] text-gray-600 hover:text-blue-600">
            <span>👍</span>
            <span>{detail.likes}</span>
          </button>
          <button className="flex items-center gap-1 text-[13px] text-gray-600 hover:text-blue-600">
            <span>💬</span>
            <span>{detail.comments.length} 条评论</span>
          </button>
          <button className="flex items-center gap-1 text-[13px] text-gray-600 hover:text-blue-600">
            <span>⭐</span>
            <span>收藏</span>
          </button>
          <button className="flex items-center gap-1 text-[13px] text-gray-600 hover:text-blue-600">
            <span>🔗</span>
            <span>分享</span>
          </button>
        </div>

        {/* 评论区 */}
        <h3 className="text-[14px] font-semibold mb-3 text-gray-900">{detail.comments.length} 条评论</h3>
        {detail.comments.map((comment, idx) => (
          <div key={idx} className="flex gap-2 mb-3 pb-3 border-b border-gray-50">
            <img src={comment.avatar} alt="Avatar" className="w-6 h-6 rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-gray-900 mb-1">{comment.name}</div>
              <p className="text-[13px] text-gray-700 leading-relaxed mb-2">{comment.content}</p>
              <div className="flex items-center gap-3 text-[11px] text-gray-500">
                <span>{comment.likes} 赞</span>
                <button className="hover:text-blue-600">回复</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 底部评论输入 */}
      <div className="p-3 border-t border-gray-100 flex-shrink-0">
        <div className="bg-gray-50 rounded-full px-4 py-2 text-[13px] text-gray-400">
          写下你的评论...
        </div>
      </div>
    </div>
  </div>
);

export default ZhihuFeed;
