/**
 * 公众号详情界面
 * 显示公众号信息和文章列表
 */

import React, { useState } from 'react';
import { ChevronLeft, CheckCircle, ThumbsUp, Eye, MessageCircle } from 'lucide-react';
import { OfficialAccountSettings, OfficialArticle } from '../types';

interface OfficialAccountDetailScreenProps {
  account: OfficialAccountSettings;
  onBack: () => void;
}

const OfficialAccountDetailScreen: React.FC<OfficialAccountDetailScreenProps> = ({ 
  account, 
  onBack 
}) => {
  const [selectedArticle, setSelectedArticle] = useState<OfficialArticle | null>(null);
  const [activeTab, setActiveTab] = useState<'articles' | 'about'>('articles');

  // 文章详情弹窗
  if (selectedArticle) {
    return (
      <div className="h-screen bg-white flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="flex items-center px-4 py-3">
            <button
              onClick={() => setSelectedArticle(null)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Article Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* 标题 */}
            <h1 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
              {selectedArticle.title}
            </h1>

            {/* 元信息 */}
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 pb-6 border-b">
              <span>{account.name}</span>
              <span>•</span>
              <span>{new Date(selectedArticle.publishTime).toLocaleDateString()}</span>
            </div>

            {/* 封面图（如果有） */}
            {selectedArticle.coverImage && (
              <div className="mb-6">
                <div className="bg-gray-100 rounded-lg p-8 text-center">
                  <p className="text-gray-500 text-sm">{selectedArticle.coverImage}</p>
                </div>
              </div>
            )}

            {/* 正文 */}
            <div className="prose prose-sm max-w-none">
              {selectedArticle.content.split('\n').map((paragraph, index) => (
                paragraph.trim() && (
                  <p key={index} className="text-gray-700 leading-relaxed mb-4">
                    {paragraph}
                  </p>
                )
              ))}
            </div>

            {/* 互动数据 */}
            <div className="mt-8 pt-6 border-t">
              <div className="flex items-center justify-between text-gray-500 text-sm">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {selectedArticle.readCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-4 h-4" />
                    {selectedArticle.likeCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t bg-white p-4 flex items-center justify-around">
          <button className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors">
            <ThumbsUp className="w-5 h-5" />
            <span className="text-sm">赞</span>
          </button>
          <button className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">评论</span>
          </button>
        </div>
      </div>
    );
  }

  // 公众号主页
  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>

        {/* 公众号信息 */}
        <div className="px-4 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-3xl flex-shrink-0">
              {account.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-semibold text-gray-900 text-lg">{account.name}</h2>
                {account.verified && (
                  <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                )}
              </div>
              <p className="text-sm text-gray-500 mb-2">
                {account.description}
              </p>
              <div className="text-xs text-gray-400">
                {account.followerCount.toLocaleString()} 人关注
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 mt-4">
            <button className="flex-1 bg-green-500 text-white py-2 rounded-lg font-medium hover:bg-green-600 transition-colors">
              已关注公众号
            </button>
            <button className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              发消息
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('articles')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'articles'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'about'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500'
            }`}
          >
            文章
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'articles' && (
          <div className="p-4 space-y-3">
            {account.articles.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                暂无文章
              </div>
            ) : (
              account.articles.map((article) => (
                <div
                  key={article.id}
                  onClick={() => setSelectedArticle(article)}
                  className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                    {article.summary}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>
                      {new Date(article.publishTime).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {article.readCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        {article.likeCount}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'about' && (
          <div className="p-4">
            <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">公众号简介</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {account.description}
                </p>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-2">内容分类</h3>
                <div className="flex flex-wrap gap-2">
                  {account.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {account.articles.length}
                    </div>
                    <div className="text-sm text-gray-500">文章数</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {account.followerCount.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">关注数</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficialAccountDetailScreen;
