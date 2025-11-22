/**
 * 未回复信件页面
 * 显示所有等待AI回复的信件
 */

import { useState, useEffect } from 'react';
import { Clock, Zap } from 'lucide-react';
import { Letter } from '../types/letter';
import { getLettersFromStorage, urgeLetter } from '../utils/letterService';

interface UnrepliedLettersScreenProps {
  onLetterClick: (letter: Letter) => void;
}

export default function UnrepliedLettersScreen({ onLetterClick }: UnrepliedLettersScreenProps) {
  const [unrepliedLetters, setUnrepliedLetters] = useState<Array<{letter: Letter, roundNumber: number}>>([]);

  useEffect(() => {
    loadUnrepliedLetters();
  }, []);

  const loadUnrepliedLetters = () => {
    const allLetters = getLettersFromStorage();
    const unreplied: Array<{letter: Letter, roundNumber: number}> = [];

    // 遍历所有信件，找出等待回复的轮次
    allLetters.forEach(letter => {
      letter.conversationRounds.forEach(round => {
        if (!round.aiReply && round.userLetter.willReplyAt) {
          unreplied.push({
            letter,
            roundNumber: round.roundNumber
          });
        }
      });
    });

    // 按预计回复时间排序
    unreplied.sort((a, b) => {
      const timeA = a.letter.conversationRounds.find(r => r.roundNumber === a.roundNumber)?.userLetter.willReplyAt || 0;
      const timeB = b.letter.conversationRounds.find(r => r.roundNumber === b.roundNumber)?.userLetter.willReplyAt || 0;
      return timeA - timeB;
    });

    setUnrepliedLetters(unreplied);
  };

  const handleUrge = (letterId: string, roundNumber: number) => {
    const success = urgeLetter(letterId, roundNumber);
    if (success) {
      alert(`✨ 已催促第${roundNumber}轮回复！\n\n预计15-30分钟内收到回信`);
      loadUnrepliedLetters();
    }
  };

  const getTimeStatus = (willReplyAt: number) => {
    const now = Date.now();
    if (now > willReplyAt) {
      return {
        text: '已延迟',
        color: 'text-red-600 bg-red-50',
        isPast: true
      };
    }
    
    const diff = willReplyAt - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return {
        text: `${days}天后`,
        color: 'text-blue-600 bg-blue-50',
        isPast: false
      };
    } else if (hours > 0) {
      return {
        text: `${hours}小时后`,
        color: 'text-orange-600 bg-orange-50',
        isPast: false
      };
    } else {
      return {
        text: '即将到达',
        color: 'text-green-600 bg-green-50',
        isPast: false
      };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-amber-50 pb-20 pt-16">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* 头部统计 */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">⏰ 等待回信</h2>
          <p className="text-gray-600">
            共 <span className="text-orange-600 font-semibold">{unrepliedLetters.length}</span> 封信件等待回复
          </p>
        </div>

        {/* 信件列表 */}
        {unrepliedLetters.length > 0 ? (
          <div className="space-y-4">
            {unrepliedLetters.map(({ letter, roundNumber }) => {
              const round = letter.conversationRounds.find(r => r.roundNumber === roundNumber);
              if (!round) return null;

              const timeStatus = getTimeStatus(round.userLetter.willReplyAt!);
              const hasUrged = round.userLetter.hasUrged;

              return (
                <div
                  key={`${letter.id}-${roundNumber}`}
                  className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all p-5 border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-gray-800">{letter.receiverName}</h3>
                        <span className="text-sm text-gray-500">第 {roundNumber} 轮</span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {round.userLetter.content.slice(0, 60)}...
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`px-2 py-1 rounded-full font-medium ${timeStatus.color}`}>
                          <Clock size={12} className="inline mr-1" />
                          {timeStatus.text}
                        </span>
                        {hasUrged && (
                          <span className="px-2 py-1 rounded-full bg-purple-50 text-purple-600 font-medium">
                            💨 已催促
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onLetterClick(letter)}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full text-sm font-medium hover:shadow-md transition-all"
                    >
                      查看详情
                    </button>
                    {!hasUrged && (
                      <button
                        onClick={() => handleUrge(letter.id, roundNumber)}
                        className="px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-full text-sm font-medium hover:shadow-md transition-all flex items-center gap-1"
                      >
                        <Zap size={14} />
                        催促
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">✨</div>
            <p className="text-gray-500 text-lg">所有信件都已回复</p>
            <p className="text-gray-400 text-sm mt-2">暂时没有等待回复的信件</p>
          </div>
        )}
      </div>
    </div>
  );
}
