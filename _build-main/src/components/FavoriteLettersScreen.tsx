/**
 * 收藏信件列表页面
 * 显示所有收藏的信件
 */

import React, { useState, useEffect } from 'react';
import { Letter } from '../types/letter';
import { getFavoriteLetters, unfavoriteLetter } from '../utils/letterService';
import { ArrowLeft, Heart, Mail } from 'lucide-react';
import LetterDetailModal from './LetterDetailModal';

interface FavoriteLettersScreenProps {
  onBack: () => void;
  userName: string;
}

const FavoriteLettersScreen: React.FC<FavoriteLettersScreenProps> = ({
  onBack,
  userName
}) => {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);

  useEffect(() => {
    loadLetters();
  }, []);

  const loadLetters = () => {
    const favoriteLetters = getFavoriteLetters();
    setLetters(favoriteLetters);
  };

  const handleUnfavorite = (letterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = unfavoriteLetter(letterId);
    if (success) {
      loadLetters();
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    if (days < 30) return `${Math.floor(days / 7)}周前`;
    if (days < 365) return `${Math.floor(days / 30)}个月前`;
    return `${Math.floor(days / 365)}年前`;
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 z-50 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-pink-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 hover:bg-pink-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">我的收藏</h1>
        <div className="w-10" />
      </div>

      {/* 收藏信件列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {letters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Heart size={64} className="mb-4 opacity-30" />
            <p className="text-lg">还没有收藏的信件</p>
            <p className="text-sm mt-2">在信件详情中点击 ❤️ 即可收藏</p>
          </div>
        ) : (
          <div className="space-y-3">
            {letters.map(letter => (
              <div
                key={letter.id}
                onClick={() => setSelectedLetter(letter)}
                className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer overflow-hidden"
              >
                <div className="p-4">
                  {/* 头部信息 */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{letter.receiverAvatar}</span>
                      <div>
                        <div className="font-medium text-gray-800 flex items-center gap-2">
                          {letter.receiverName}
                          {letter.isBottle && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                              漂流瓶
                            </span>
                          )}
                          {letter.isFriendAdded && (
                            <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">
                              笔友
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                          <Mail size={12} />
                          {letter.status === 'replied' ? '已回复' : '未回复'}
                          · {formatDate(letter.favoritedAt || letter.sentAt)}
                        </div>
                      </div>
                    </div>
                    
                    {/* 取消收藏按钮 */}
                    <button
                      onClick={(e) => handleUnfavorite(letter.id, e)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      title="取消收藏"
                    >
                      <Heart size={20} className="text-red-500 fill-red-500" />
                    </button>
                  </div>

                  {/* 信件预览 */}
                  <div className="text-sm text-gray-600 line-clamp-3">
                    {letter.conversationRounds && letter.conversationRounds.length > 0
                      ? letter.conversationRounds[letter.conversationRounds.length - 1].userLetter.content
                      : letter.content}
                  </div>

                  {/* 回信预览 */}
                  {letter.status === 'replied' && letter.replyContent && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-xl">
                      <div className="text-xs text-blue-600 mb-1">💌 回信</div>
                      <div className="text-sm text-gray-700 line-clamp-2">
                        {letter.replyContent}
                      </div>
                    </div>
                  )}

                  {/* 底部信息 */}
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                    <span>
                      {letter.conversationRounds.length > 1 
                        ? `共 ${letter.conversationRounds.length} 轮对话`
                        : '1 轮对话'}
                    </span>
                    <span>收藏于 {formatDate(letter.favoritedAt || letter.sentAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 信件详情模态框 */}
      {selectedLetter && (
        <LetterDetailModal
          letter={selectedLetter}
          onClose={() => {
            setSelectedLetter(null);
            loadLetters(); // 关闭时刷新列表
          }}
          onUrge={() => {
            loadLetters(); // 操作后刷新
          }}
          userName={userName}
        />
      )}
    </div>
  );
};

export default FavoriteLettersScreen;
