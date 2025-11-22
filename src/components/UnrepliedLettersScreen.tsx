/**
 * 未回复信件页面
 * 显示所有"AI已回复但用户还未回信"的信件
 */

import { ArrowLeft, Reply } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Letter } from '../types/letter';
import { getLettersFromStorage } from '../utils/letterService';

interface UnrepliedLettersScreenProps {
  onBack: () => void;
  onReply: (letter: Letter) => void;
}

export default function UnrepliedLettersScreen({ onBack, onReply }: UnrepliedLettersScreenProps) {
  const [unrepliedLetters, setUnrepliedLetters] = useState<Letter[]>([]);

  useEffect(() => {
    loadUnrepliedLetters();
  }, []);

  const loadUnrepliedLetters = () => {
    const allLetters = getLettersFromStorage();
    
    // 筛选条件：最后一轮有AI回复，但用户还没有继续回复（即最后一轮就是AI回复的那一轮）
    const unreplied = allLetters.filter(letter => {
      const lastRound = letter.conversationRounds[letter.conversationRounds.length - 1];
      // 最后一轮有AI回复，说明AI回复了，用户还没有继续回信
      return lastRound.aiReply && letter.status === 'replied';
    });

    setUnrepliedLetters(unreplied);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 pb-20">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">待回复信件</h1>
          <div className="w-10"></div>
        </div>
      </div>

      {/* 信件列表 */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {unrepliedLetters.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <div className="text-gray-600 text-lg mb-2">暂无待回复的信件</div>
            <div className="text-gray-400 text-sm">所有回信都已处理完毕</div>
          </div>
        ) : (
          <div className="space-y-4">
            {unrepliedLetters.map((letter) => {
              const lastRound = letter.conversationRounds[letter.conversationRounds.length - 1];
              const aiReply = lastRound.aiReply;
              
              if (!aiReply) return null;

              return (
                <div
                  key={letter.id}
                  className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all p-5 border border-gray-100"
                >
                  {/* 信件头部 */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                        {letter.receiverName.slice(0, 1)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{letter.receiverName}</div>
                        <div className="text-sm text-gray-500">
                          第 {letter.currentRound} 轮对话
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatDate(aiReply.repliedAt)}
                    </div>
                  </div>

                  {/* AI回复预览 */}
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-3">
                    <div className="text-xs text-orange-600 font-medium mb-1">TA 的回信</div>
                    <div className="text-sm text-gray-700 line-clamp-3">
                      {aiReply.content}
                    </div>
                  </div>

                  {/* 回复按钮 */}
                  <button
                    onClick={() => onReply(letter)}
                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Reply size={18} />
                    继续回信
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
