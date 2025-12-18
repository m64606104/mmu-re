import React from 'react';
import { X } from 'lucide-react';
import { LinkPreviewData } from './WeChatLinkPreview';

interface XiaohongshuLinkModalProps {
  data: LinkPreviewData;
  onClose: () => void;
}

/**
 * 小红书链接详情模态框
 *
 * 用于在聊天中点击小红书链接后，展示一整屏的「伪小红书详情页」：
 * - 顶部应用栏 + 关闭按钮
 * - 大图 + 标题 + 文案
 * - 一些虚拟的互动数据和评论
 */
const XiaohongshuLinkModal: React.FC<XiaohongshuLinkModalProps> = ({ data, onClose }) => {
  const comments = [
    `这篇「${data.title}」看起来好种草，回头我也想试试～`,
    data.description ? `文案写得好温柔，已经收藏准备照着试一试了` : '看完感觉很生活化，不是那种广告味很重的笔记',
    '谢谢分享！感觉很适合现在的状态，已经转给朋友了'
  ];

  const renderCover = () => {
    if (!data.coverImage) {
      return (
        <div className="w-full h-64 bg-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-400 text-sm">
          <div className="text-4xl mb-2">🖼️</div>
          <div className="px-8 text-center leading-relaxed">
            {data.description || '这里是一张由 AI 想象出来的小红书配图'}
          </div>
        </div>
      );
    }

    if (data.coverImage.startsWith('http')) {
      return (
        <div className="w-full h-64 rounded-2xl overflow-hidden bg-gray-100">
          <img
            src={data.coverImage}
            alt={data.title}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    return (
      <div className="w-full h-64 bg-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-500 text-sm">
        <div className="text-4xl mb-2">🖼️</div>
        <div className="px-8 text-center leading-relaxed">
          {data.coverImage}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl w-full max-w-sm max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 顶部应用栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white/95">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-xl bg-red-500 flex items-center justify-center text-xs text-white font-bold">
              小红
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-gray-900">小红书</span>
              <span className="text-[11px] text-gray-400">来自 AI 的虚拟笔记</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {renderCover()}

          <div className="space-y-2">
            <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
              {data.title}
            </h1>
            {data.description && (
              <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                {data.description}
              </p>
            )}
          </div>

          {/* 虚拟互动数据 */}
          <div className="flex items-center gap-4 text-[11px] text-gray-500">
            <span>❤ {Math.floor(500 + Math.random() * 2000).toLocaleString()} 赞</span>
            <span>💬 {Math.floor(20 + Math.random() * 80)} 评论</span>
            <span>⭐ {Math.floor(50 + Math.random() * 150)} 收藏</span>
          </div>

          {/* 评论区 */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-gray-900">评论区</span>
              <span className="text-[11px] text-gray-400">仅为示意的虚拟评论</span>
            </div>
            <div className="space-y-2">
              {comments.map((c, idx) => (
                <div key={idx} className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                    {['阿', '小', 'M'][idx] || '友'}
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] text-gray-500 mb-0.5">
                      {['阿花', '小北', 'Morning'][idx] || '网友'} ·
                      <span className="ml-1">{1 + idx}小时前</span>
                    </div>
                    <p className="text-[12px] text-gray-800 leading-relaxed">{c}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 底部输入栏样式 */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3 bg-white/95">
          <div className="flex-1 bg-gray-50 rounded-full px-3 py-1.5 text-[12px] text-gray-400">
            说点什么吧…（仅展示，不会真的发送）
          </div>
          <button className="px-3 py-1.5 rounded-full bg-red-500 text-white text-[12px] font-medium active:bg-red-600">
            ❤ 赞
          </button>
        </div>
      </div>
    </div>
  );
};

export default XiaohongshuLinkModal;
