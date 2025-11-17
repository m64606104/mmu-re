/**
 * 信件卡片列表视图
 * 每轮对话显示为独立卡片
 * 参考慢邮件App的卡片设计
 */

import { ArrowLeft, Check, Zap, UserPlus, FileDown, Star, Trash2, RotateCcw, Reply } from 'lucide-react';
import { Letter } from '../types/letter';
import { getCurrentStamp } from '../utils/stampSystem';
import { useEffect, useRef, useState } from 'react';
import { urgeLetter, addAsPenPal, canContinueReply, toggleFavoriteLetter, archiveLetter, unarchiveLetter } from '../utils/letterService';
import PDFExportModal from './PDFExportModal';

interface LetterCardsViewProps {
  letter: Letter;
  onBack: () => void;
  onViewTimeline: () => void;
  userName: string;
  scrollToRound?: number;
  onRoundViewed?: () => void;
  onContinueReply?: () => void;
}

export default function LetterCardsView({ letter, onBack, onViewTimeline, userName, scrollToRound, onRoundViewed, onContinueReply }: LetterCardsViewProps) {
  const currentStamp = getCurrentStamp();
  const roundRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const [localLetter, setLocalLetter] = useState(letter);
  const [showPDFExport, setShowPDFExport] = useState(false);
  
  useEffect(() => {
    setLocalLetter(letter);
  }, [letter]);
  
  const handleUrge = () => {
    const success = urgeLetter(localLetter.id);
    if (success) {
      alert('✨ 已催促回复！\n\n预计15-30分钟内收到回信');
      setLocalLetter({ ...localLetter, hasUrged: true });
    } else {
      alert('无法催促：\n' + (localLetter.hasUrged ? '已经催促过了' : '信件状态不正确'));
    }
  };
  
  const handleAddAsPenPal = () => {
    const success = addAsPenPal(localLetter.id);
    if (success) {
      alert(`💌 已将 ${localLetter.receiverName} 加为笔友！\n\n现在可以无限制地交流啦～`);
      setLocalLetter({ ...localLetter, isPenPalAdded: true });
      // 刷新页面以更新笔友列表
      window.location.reload();
    } else {
      alert('无法加为笔友');
    }
  };
  
  const handleToggleFavorite = () => {
    const success = toggleFavoriteLetter(localLetter.id);
    if (success) {
      const newFavoriteStatus = !localLetter.isFavorite;
      setLocalLetter({ ...localLetter, isFavorite: newFavoriteStatus });
    }
  };
  
  const handleArchive = () => {
    if (confirm('确定要将这封信放入回收站吗？')) {
      const success = archiveLetter(localLetter.id);
      if (success) {
        alert('✅ 已放入回收站');
        onBack(); // 返回上一页
      }
    }
  };
  
  const handleUnarchive = () => {
    const success = unarchiveLetter(localLetter.id);
    if (success) {
      alert('✅ 已恢复信件');
      setLocalLetter({ ...localLetter, isArchived: false });
    }
  };
  
  const replyStatus = canContinueReply(localLetter.id);
  
  useEffect(() => {
    if (scrollToRound && roundRefs.current[scrollToRound]) {
      setTimeout(() => {
        roundRefs.current[scrollToRound]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        onRoundViewed?.();
      }, 100);
    }
  }, [scrollToRound, onRoundViewed]);

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

  // 计算预计送达日期（基于willReplyAt）
  const getExpectedDeliveryDate = () => {
    if (localLetter.willReplyAt) {
      const date = new Date(localLetter.willReplyAt);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}月${day}日`;
    }
    // 如果没有设置willReplyAt，使用sentAt + 3天
    const lastRound = localLetter.conversationRounds[localLetter.conversationRounds.length - 1];
    const baseTime = lastRound?.userLetter?.sentAt || localLetter.sentAt;
    const deliveryDate = new Date(baseTime + 3 * 24 * 60 * 60 * 1000);
    const month = deliveryDate.getMonth() + 1;
    const day = deliveryDate.getDate();
    return `${month}月${day}日`;
  };

  return (
    <div className="h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col">
      {/* 顶部栏 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-orange-200 px-4 py-4 flex items-center gap-3 flex-shrink-0 z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-800">{letter.receiverName}</h1>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            {letter.isBottle && <span>📍 {letter.bottleAIProfile?.location || '远方'}</span>}
            {!letter.isBottle && <span>✈️ {getExpectedDeliveryDate()}</span>}
          </div>
        </div>
        <button 
          onClick={() => setShowPDFExport(true)}
          className="p-2 hover:bg-orange-100 rounded-full transition-colors"
          title="导出PDF"
        >
          <FileDown size={20} className="text-orange-600" />
        </button>
        <button 
          onClick={onViewTimeline}
          className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors"
        >
          时间轴
        </button>
      </div>

      {/* 信件卡片列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-24">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* 遍历所有对话轮次 */}
          {letter.conversationRounds && letter.conversationRounds.length > 0 ? (
            letter.conversationRounds.map((round) => (
              <div 
                key={round.roundNumber}
                ref={(el) => {
                  roundRefs.current[round.roundNumber] = el;
                }}
              >
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
                        {/* 操作按钮 */}
                        <button
                          onClick={handleToggleFavorite}
                          className="p-1.5 hover:bg-white/50 rounded-full transition-colors"
                          title={localLetter.isFavorite ? '取消收藏' : '收藏'}
                        >
                          <Star
                            size={16}
                            className={localLetter.isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-gray-500'}
                          />
                        </button>
                        
                        {localLetter.isArchived ? (
                          <button
                            onClick={handleUnarchive}
                            className="p-1.5 hover:bg-white/50 rounded-full transition-colors"
                            title="恢复信件"
                          >
                            <RotateCcw size={16} className="text-blue-600" />
                          </button>
                        ) : (
                          <button
                            onClick={handleArchive}
                            className="p-1.5 hover:bg-white/50 rounded-full transition-colors"
                            title="放入回收站"
                          >
                            <Trash2 size={16} className="text-gray-500" />
                          </button>
                        )}
                        
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
                        <div className="flex items-center gap-3">
                          {/* 操作按钮 */}
                          <button
                            onClick={handleToggleFavorite}
                            className="p-1.5 hover:bg-white/50 rounded-full transition-colors"
                            title={localLetter.isFavorite ? '取消收藏' : '收藏'}
                          >
                            <Star
                              size={16}
                              className={localLetter.isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-gray-400'}
                            />
                          </button>
                          
                          {localLetter.isArchived ? (
                            <button
                              onClick={handleUnarchive}
                              className="p-1.5 hover:bg-white/50 rounded-full transition-colors"
                              title="恢复信件"
                            >
                              <RotateCcw size={16} className="text-blue-600" />
                            </button>
                          ) : (
                            <button
                              onClick={handleArchive}
                              className="p-1.5 hover:bg-white/50 rounded-full transition-colors"
                              title="放入回收站"
                            >
                              <Trash2 size={16} className="text-gray-400" />
                            </button>
                          )}
                          
                          <div className="text-xs text-blue-600 font-medium">
                            {formatDate(round.aiReply.repliedAt)}
                          </div>
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
                    <div className="text-4xl mb-2">⌛</div>
                    <div className="text-gray-700 font-medium">等待回信中...</div>
                    <div className="text-sm text-gray-500 mt-1 mb-3">
                      {localLetter.hasUrged 
                        ? '已催促，预计很快收到回信'
                        : `预计 ${getExpectedDeliveryDate()} 送达`
                      }
                    </div>
                    {!localLetter.hasUrged && (
                      <button
                        onClick={handleUrge}
                        className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full font-medium hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
                      >
                        <Zap size={16} />
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
          
          {/* 漂流瓶加为笔友提示和按钮 */}
          {localLetter.isBottle && !localLetter.isPenPalAdded && (
            <div className="mt-6 space-y-3">
              {/* 轮数提示 */}
              {replyStatus.isLastRound && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                  <div className="text-amber-700 text-sm font-medium mb-1">
                    ⚠️ 这是最后一轮交流
                  </div>
                  <div className="text-xs text-amber-600">
                    加为笔友可继续无限制通信
                  </div>
                </div>
              )}
              
              {/* 达到上限提示 */}
              {!replyStatus.canContinue && replyStatus.reason && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                  <div className="text-red-700 text-sm font-medium mb-2">
                    📭 {replyStatus.reason}
                  </div>
                  <button
                    onClick={handleAddAsPenPal}
                    className="px-6 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full font-medium hover:shadow-lg transition-all inline-flex items-center gap-2"
                  >
                    <UserPlus size={16} />
                    点击加为笔友以继续交流
                  </button>
                </div>
              )}
              
              {/* 加为笔友按钮 */}
              {replyStatus.canContinue && (
                <div className="flex justify-center">
                  <button
                    onClick={handleAddAsPenPal}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    <UserPlus size={18} />
                    加为笔友
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 继续回复按钮 */}
          {replyStatus.canContinue && onContinueReply && (
            <div className="mt-6 flex justify-center pb-4">
              <button
                onClick={onContinueReply}
                className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl font-medium hover:shadow-lg transition-all flex items-center gap-2 text-base"
              >
                <Reply size={20} />
                继续回复
              </button>
            </div>
          )}
        </div>
      </div>

      {showPDFExport && (
        <PDFExportModal
          letter={localLetter}
          onClose={() => setShowPDFExport(false)}
        />
      )}
    </div>
  );
}
