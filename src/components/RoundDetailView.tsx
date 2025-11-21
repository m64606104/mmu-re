/**
 * 单轮对话详情视图
 * 显示用户发送的信件和AI的回复
 */

import { useState } from 'react';
import { ArrowLeft, Send, Heart, Trash2, Star, Clock } from 'lucide-react';
import { Letter, LetterRound } from '../types/letter';
import { getAIDisplayName } from '../utils/letterNicknameManager';
import { formatLastActivity } from '../utils/letterListManager';
import { favoriteAIReply, deleteUserLetter, deleteAIReply } from '../utils/letterService';

interface RoundDetailViewProps {
  round: LetterRound;
  letter: Letter;
  onBack: () => void;
  userName: string;
  viewMode: 'all' | 'sent' | 'received';
  onContinueReply?: () => void;
}

export default function RoundDetailView({
  round,
  letter,
  onBack,
  userName,
  viewMode,
  onContinueReply
}: RoundDetailViewProps) {
  const [localRound, setLocalRound] = useState(round);
  
  const displayName = getAIDisplayName(letter.receiverId, letter.receiverName);

  const handleFavorite = () => {
    if (localRound.aiReply) {
      const success = favoriteAIReply(letter.id, localRound.roundNumber);
      if (success && localRound.aiReply) {
        setLocalRound({
          ...localRound,
          aiReply: {
            ...localRound.aiReply,
            isFavorite: !localRound.aiReply.isFavorite,
            favoritedAt: !localRound.aiReply.isFavorite ? Date.now() : undefined
          }
        });
      }
    }
  };

  const handleDeleteUserLetter = () => {
    if (confirm('确定要删除这封信件吗？')) {
      const success = deleteUserLetter(letter.id, localRound.roundNumber);
      if (success) {
        setLocalRound({
          ...localRound,
          userLetter: {
            ...localRound.userLetter,
            isDeleted: true,
            deletedAt: Date.now()
          }
        });
      }
    }
  };

  const handleDeleteAIReply = () => {
    if (confirm('确定要删除这条回复吗？')) {
      const success = deleteAIReply(letter.id, localRound.roundNumber);
      if (success && localRound.aiReply) {
        setLocalRound({
          ...localRound,
          aiReply: {
            ...localRound.aiReply,
            isDeleted: true,
            deletedAt: Date.now()
          }
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 z-50 flex flex-col">
      {/* 头部 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-indigo-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 hover:bg-indigo-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        
        <div className="text-center">
          <h1 className="text-lg font-semibold text-gray-800">第 {localRound.roundNumber} 轮对话</h1>
          <div className="text-sm text-gray-500">{displayName}</div>
        </div>

        <div className="w-10"></div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* 用户寄信卡片 */}
          {(!localRound.userLetter.isDeleted || viewMode === 'all') && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send size={20} className="text-white" />
                  <span className="text-white font-medium">寄信</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/80 text-sm">
                    {formatLastActivity(localRound.userLetter.sentAt)}
                  </span>
                  {!localRound.userLetter.isDeleted && (
                    <button
                      onClick={handleDeleteUserLetter}
                      className="p-1 hover:bg-white/20 rounded transition-colors"
                    >
                      <Trash2 size={16} className="text-white/80" />
                    </button>
                  )}
                </div>
              </div>
              
              {localRound.userLetter.isDeleted ? (
                <div className="p-6 text-center">
                  <div className="text-gray-400 text-sm">此信件已被删除</div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="text-sm text-gray-600 mb-2">发件人: {userName}</div>
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {localRound.userLetter.content}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI回信卡片 */}
          {localRound.aiReply && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart size={20} className="text-white" />
                  <span className="text-white font-medium">回信</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/80 text-sm">
                    {formatLastActivity(localRound.aiReply.repliedAt)}
                  </span>
                  <button
                    onClick={handleFavorite}
                    className={`p-1 rounded transition-colors ${
                      localRound.aiReply.isFavorite 
                        ? 'bg-white/20 text-red-300' 
                        : 'hover:bg-white/20 text-white/80'
                    }`}
                  >
                    <Star size={16} fill={localRound.aiReply.isFavorite ? 'currentColor' : 'none'} />
                  </button>
                  {!localRound.aiReply.isDeleted && (
                    <button
                      onClick={handleDeleteAIReply}
                      className="p-1 hover:bg-white/20 rounded transition-colors"
                    >
                      <Trash2 size={16} className="text-white/80" />
                    </button>
                  )}
                </div>
              </div>
              
              {localRound.aiReply.isDeleted ? (
                <div className="p-6 text-center">
                  <div className="text-gray-400 text-sm">此回复已被删除</div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="text-sm text-gray-600 mb-2">发件人: {displayName}</div>
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {localRound.aiReply.content}
                  </div>
                  {localRound.aiReply.isFavorite && (
                    <div className="mt-4 flex items-center gap-2 text-red-500 text-sm">
                      <Heart size={16} fill="currentColor" />
                      <span>已收藏</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 等待回复状态 */}
          {!localRound.aiReply && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-orange-400 to-amber-500 px-4 py-3 flex items-center gap-2">
                <Clock size={20} className="text-white" />
                <span className="text-white font-medium">等待回信中...</span>
              </div>
              
              <div className="p-6 text-center">
                <div className="text-gray-600 mb-4">
                  信件已寄出，请耐心等待回复
                </div>
                <div className="text-sm text-gray-500">
                  预计回复时间: {formatLastActivity(letter.willReplyAt || Date.now() + 24 * 60 * 60 * 1000)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部操作栏 */}
      {letter.status !== 'replied' && onContinueReply && (
        <div className="bg-white/80 backdrop-blur-sm border-t border-indigo-100 px-4 py-3">
          <button
            onClick={onContinueReply}
            className="w-full py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
          >
            <Send size={20} />
            继续回信
          </button>
        </div>
      )}
    </div>
  );
}
