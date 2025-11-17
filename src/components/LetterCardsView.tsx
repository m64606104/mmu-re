/**
 * 信件卡片列表视图
 * 每轮对话显示为独立卡片
 * 参考慢邮件App的卡片设计
 */

import { RefObject, useState, useEffect } from 'react';
import { ArrowLeft, Check, Zap, Clock } from 'lucide-react';
import { Letter } from '../types/letter';
import { getCurrentStamp } from '../utils/stampSystem';
import { urgeLetter } from '../utils/letterService';

interface LetterCardsViewProps {
  letter: Letter;
  onBack: () => void;
  onViewTimeline: () => void;
  userName: string;
  scrollContainerRef?: RefObject<HTMLDivElement>;
  onRefresh?: () => void;
}

export default function LetterCardsView({ letter, onBack, onViewTimeline, userName, scrollContainerRef, onRefresh }: LetterCardsViewProps) {
  const currentStamp = getCurrentStamp();
  const [localLetter, setLocalLetter] = useState(letter);

  // 催促回复
  const handleUrge = () => {
    const success = urgeLetter(localLetter.id);
    if (success) {
      alert('✨ 已催促回复！\n\n预计15-30分钟内收到回信');
      // 更新本地状态
      setLocalLetter({ ...localLetter, hasUrged: true });
      if (onRefresh) {
        onRefresh();
      }
    } else {
      alert('无法催促：\n' + (localLetter.hasUrged ? '已经催促过了' : '信件状态不正确'));
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${month}月${day}日 下午 ${hour}:${minute}`;
  };

  const formatFullDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // 监听letter变化，更新本地状态
  useEffect(() => {
    setLocalLetter(letter);
  }, [letter]);

  return (
    <div className="h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col">
      {/* 顶部栏 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-orange-200 px-4 py-4 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-800">{letter.receiverName}</h1>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            {letter.isBottle && <span>📍 {letter.bottleAIProfile?.location || '远方'}</span>}
            {!letter.isBottle && <span>✈️ 已寄出</span>}
          </div>
        </div>
      </div>

      {/* 信件卡片列表 - 关键：设置flex-1和overflow-y-auto */}
      <div className="flex-1 overflow-y-auto px-4 py-4" ref={scrollContainerRef} style={{ minHeight: 0 }}>
        <div className="max-w-2xl mx-auto space-y-4">
          {/* 遍历所有对话轮次 */}
          {letter.conversationRounds && letter.conversationRounds.length > 0 ? (
            letter.conversationRounds.map((round, index) => (
              <div key={round.roundNumber} id={`round-${index}`}>
                {/* 用户发送的信卡片 */}
                <div className="mb-4">
                  <div className="bg-white rounded-3xl shadow-lg overflow-hidden border-2 border-gray-100">
                    {/* 卡片头部 */}
                    <div className="bg-gradient-to-r from-orange-100 to-amber-100 px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check size={16} className="text-green-600" />
                        <span className="text-sm font-medium text-gray-700">
                          to {letter.receiverName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* 邮票 */}
                        <div className="w-10 h-12 border-2 border-dashed border-orange-400 rounded flex items-center justify-center bg-gradient-to-br from-amber-100 to-yellow-100 text-xl">
                          {currentStamp?.image || '📮'}
                        </div>
                      </div>
                    </div>

                    {/* 信件内容 */}
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
                        {round.userLetter.content}
                      </div>
                      
                      {/* 落款 */}
                      <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
                        <div>{formatFullDate(round.userLetter.sentAt)}</div>
                        <div className="font-medium">
                          from {letter.isAnonymous ? (letter.anonymousName || '匿名') : userName}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI回信卡片 */}
                {round.aiReply && (
                  <div className="mb-4">
                    <div className="bg-white rounded-3xl shadow-lg overflow-hidden border-2 border-blue-100">
                      {/* 卡片头部 */}
                      <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-xl">
                            {letter.receiverAvatar}
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {letter.receiverName}
                          </span>
                        </div>
                        <div className="text-xs text-blue-600 font-medium">
                          {formatDate(round.aiReply.repliedAt)}
                        </div>
                      </div>

                      {/* 回信内容 */}
                      <div className="p-5">
                        <div 
                          className="text-gray-800 leading-relaxed whitespace-pre-wrap font-serif"
                          style={{
                            backgroundImage: `repeating-linear-gradient(
                              transparent,
                              transparent 31px,
                              rgba(219, 234, 254, 0.3) 31px,
                              rgba(219, 234, 254, 0.3) 32px
                            )`,
                            lineHeight: '32px',
                            fontFamily: '"Noto Serif SC", "STSong", serif'
                          }}
                        >
                          {round.aiReply.content}
                        </div>
                        
                        {/* 落款 */}
                        <div className="mt-6 pt-4 border-t border-blue-200 flex items-center justify-between text-sm text-gray-600">
                          <div>{formatFullDate(round.aiReply.repliedAt)}</div>
                          <div className="font-medium">
                            from {letter.receiverName}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 等待回信状态 */}
                {!round.aiReply && localLetter.status === 'sent' && (
                  <div className="mb-4 bg-amber-50 border-2 border-dashed border-amber-300 rounded-2xl p-6 text-center">
                    <div className="text-4xl mb-2">⏳</div>
                    <div className="text-gray-700 font-medium">等待回信中...</div>
                    <div className="text-sm text-gray-500 mt-1 mb-3">
                      {localLetter.hasUrged 
                        ? '已催促，预计很快收到回信'
                        : '预计 1-5 天收到回信'
                      }
                    </div>
                    {!localLetter.hasUrged && (
                      <button
                        onClick={handleUrge}
                        className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full font-medium hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
                      >
                        <Zap size={18} />
                        催促回复
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-20 text-gray-500">
              暂无信件内容
            </div>
          )}
        </div>
      </div>

      {/* 底部栏 */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-orange-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button 
          onClick={onViewTimeline}
          className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <Clock size={18} />
          时间轴
        </button>
      </div>
    </div>
  );
}
