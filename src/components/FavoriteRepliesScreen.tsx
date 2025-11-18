/**
 * 收藏的回复界面
 * 显示所有收藏的AI回复
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, Star } from 'lucide-react';
import { getAllFavoriteReplies, favoriteAIReply, FavoriteReply } from '../utils/letterService';

interface FavoriteRepliesScreenProps {
  onBack: () => void;
  onViewLetter?: (letterId: string, roundNumber: number) => void;
}

export default function FavoriteRepliesScreen({ onBack, onViewLetter }: FavoriteRepliesScreenProps) {
  const [favorites, setFavorites] = useState<FavoriteReply[]>([]);
  
  useEffect(() => {
    refreshFavorites();
  }, []);
  
  const refreshFavorites = () => {
    setFavorites(getAllFavoriteReplies());
  };
  
  const handleUnfavorite = (letterId: string, roundNumber: number) => {
    if (confirm('确定要取消收藏这条回复吗？')) {
      favoriteAIReply(letterId, roundNumber);
      refreshFavorites();
    }
  };
  
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
    
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
    return `${Math.floor(diffDays / 30)}个月前`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex flex-col">
      {/* 顶部栏 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-amber-200 px-4 py-4 flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-800">⭐ 收藏的回复</h1>
          <div className="text-xs text-gray-500">
            {favorites.length > 0 ? `共收藏 ${favorites.length} 条回复` : '还没有收藏'}
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-y-auto p-4 pb-8">
        <div className="max-w-2xl mx-auto">
          {favorites.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">⭐</div>
              <div className="text-gray-600 text-lg mb-2">还没有收藏的回复</div>
              <div className="text-gray-400 text-sm">
                在信件详情中点击星星按钮收藏喜欢的回复
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {favorites.map((favorite) => (
                <div
                  key={`${favorite.letterId}_${favorite.roundNumber}`}
                  className="bg-white rounded-3xl shadow-lg overflow-hidden border-2 border-yellow-100"
                >
                  {/* 卡片头部 */}
                  <div className="bg-gradient-to-r from-yellow-100 to-amber-100 px-5 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-xl">
                          {favorite.letterInfo.receiverAvatar}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">
                            {favorite.letterInfo.receiverName}
                          </div>
                          <div className="text-xs text-gray-600">
                            第{favorite.roundNumber}轮 · {formatDate(favorite.repliedAt)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnfavorite(favorite.letterId, favorite.roundNumber)}
                        className="p-2 hover:bg-white/50 rounded-full transition-colors"
                        title="取消收藏"
                      >
                        <Star size={18} className="text-yellow-500 fill-yellow-500" />
                      </button>
                    </div>
                  </div>

                  {/* 回复内容 */}
                  <div className="p-5">
                    <div 
                      className="text-gray-800 leading-relaxed whitespace-pre-wrap font-serif"
                      style={{
                        backgroundImage: `repeating-linear-gradient(
                          transparent,
                          transparent 31px,
                          rgba(229, 231, 235, 0.3) 31px,
                          rgba(229, 231, 235, 0.3) 32px
                        )`,
                        lineHeight: '32px',
                        fontFamily: '"Noto Serif SC", "STSong", serif'
                      }}
                    >
                      {favorite.content}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  {onViewLetter && (
                    <div className="px-5 pb-5">
                      <button
                        onClick={() => onViewLetter(favorite.letterId, favorite.roundNumber)}
                        className="w-full py-3 bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-500 hover:to-amber-500 text-white rounded-xl font-medium transition-colors"
                      >
                        📖 查看完整信件
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
