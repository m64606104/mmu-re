/**
 * 信件卡片列表视图
 * 每轮对话显示为独立卡片
 * 参考慢邮件App的卡片设计
 */

import { ArrowLeft, Check, Zap, UserPlus, FileDown, Trash2, Reply, Star, RotateCcw } from 'lucide-react';
import { Letter } from '../types/letter';
import { getCurrentStamp } from '../utils/stampSystem';
import { useEffect, useRef, useState } from 'react';
import { urgeLetter, addAsPenPal, canContinueReply, deleteUserLetter, deleteAIReply, getLetterById, favoriteAIReply, generateReply } from '../utils/letterService';
import { getAIDisplayName } from '../utils/letterNicknameManager';
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
  const [viewMode, setViewMode] = useState<'all' | 'sent' | 'reply'>('all');
  
  useEffect(() => {
    setLocalLetter(letter);
  }, [letter]);
  
  // 催促特定轮次的回复
  const handleUrge = (roundNumber: number) => {
    const success = urgeLetter(localLetter.id, roundNumber);
    if (success) {
      alert(`✨ 已催促第${roundNumber}轮回复！\n\n预计15-30分钟内收到回信`);
      // 重新获取最新状态
      const updatedLetter = getLetterById(localLetter.id);
      if (updatedLetter) {
        setLocalLetter(updatedLetter);
      }
    } else {
      const targetRound = localLetter.conversationRounds.find(r => r.roundNumber === roundNumber);
      const hasUrged = targetRound?.userLetter?.hasUrged;
      alert(`无法催促：\n` + (hasUrged ? `第${roundNumber}轮已经催促过了` : '信件状态不正确'));
    }
  };
  
  // 手动重试生成回复
  const handleManualRetry = async (roundNumber: number) => {
    const confirmed = confirm(`确定要手动重试生成第${roundNumber}轮的AI回复吗？\n\n这将立即调用API生成回复。`);
    if (!confirmed) return;
    
    try {
      await generateReply(localLetter.id, 0, roundNumber);
      alert('✅ 回复生成请求已发送！\n\n请稍后刷新页面查看结果。');
      // 等待2秒后刷新数据
      setTimeout(() => {
        const updatedLetter = getLetterById(localLetter.id);
        if (updatedLetter) {
          setLocalLetter(updatedLetter);
        }
      }, 2000);
    } catch (error) {
      alert(`❌ 生成回复失败：\n${error}\n\n请检查API配置或稍后重试。`);
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
  
  const handleDeleteUserLetter = (roundNumber: number) => {
    if (confirm(`确定要删除第 ${roundNumber} 轮的寄信吗？\n\n删除后将放入回收站，可以恢复。`)) {
      const success = deleteUserLetter(localLetter.id, roundNumber);
      if (success) {
        const updatedLetter = getLetterById(localLetter.id);
        if (updatedLetter) {
          setLocalLetter(updatedLetter);
          alert('✅ 已删除该寄信（已放入回收站）');
        }
      }
    }
  };
  
  const handleDeleteAIReply = (roundNumber: number) => {
    if (confirm(`确定要删除第 ${roundNumber} 轮的回信吗？\n\n删除后将放入回收站，可以恢复。`)) {
      const success = deleteAIReply(localLetter.id, roundNumber);
      if (success) {
        const updatedLetter = getLetterById(localLetter.id);
        if (updatedLetter) {
          setLocalLetter(updatedLetter);
          alert('✅ 已删除该回信（已放入回收站）');
        }
      }
    }
  };
  
  const handleFavoriteAIReply = (roundNumber: number) => {
    const success = favoriteAIReply(localLetter.id, roundNumber);
    if (success) {
      const updatedLetter = getLetterById(localLetter.id);
      if (updatedLetter) {
        setLocalLetter(updatedLetter);
        const round = updatedLetter.conversationRounds.find(r => r.roundNumber === roundNumber);
        if (round?.aiReply?.isFavorite) {
          alert('⭐ 已收藏该回信');
        } else {
          alert('☆ 已取消收藏');
        }
      }
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

  // 计算特定轮次的预计送达日期（使用每轮独立的willReplyAt）
  const getExpectedDeliveryDate = (roundNumber?: number) => {
    // 如果指定了轮次号，使用该轮次的willReplyAt
    if (roundNumber) {
      const targetRound = localLetter.conversationRounds.find(r => r.roundNumber === roundNumber);
      if (targetRound?.userLetter?.willReplyAt) {
        const date = new Date(targetRound.userLetter.willReplyAt);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}月${day}日`;
      }
      // 如果该轮次没有willReplyAt，使用sentAt + 3天
      if (targetRound?.userLetter?.sentAt) {
        const deliveryDate = new Date(targetRound.userLetter.sentAt + 3 * 24 * 60 * 60 * 1000);
        const month = deliveryDate.getMonth() + 1;
        const day = deliveryDate.getDate();
        return `${month}月${day}日`;
      }
    }
    
    // 默认使用最后一轮（当前轮次）
    const lastRound = localLetter.conversationRounds[localLetter.conversationRounds.length - 1];
    if (lastRound?.userLetter?.willReplyAt) {
      const date = new Date(lastRound.userLetter.willReplyAt);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}月${day}日`;
    }
    // 如果没有willReplyAt，使用sentAt + 3天
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
          <h1 className="text-lg font-bold text-gray-800">
            {getAIDisplayName(letter.receiverId, letter.receiverName)}
          </h1>
          {getAIDisplayName(letter.receiverId, letter.receiverName) !== letter.receiverName && (
            <div className="text-xs text-gray-400">原名: {letter.receiverName}</div>
          )}
          <div className="text-xs text-gray-500 flex items-center gap-2">
            {letter.isBottle && <span>📍 {letter.bottleAIProfile?.location || '远方'}</span>}
            {!letter.isBottle && <span>✈️ {getExpectedDeliveryDate()}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowPDFExport(true)}
            className="p-2 hover:bg-orange-100 rounded-full transition-colors"
            title="导出PDF"
          >
            <FileDown size={20} className="text-orange-600" />
          </button>
        </div>
        <button 
          onClick={onViewTimeline}
          className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors"
        >
          时间轴
        </button>
      </div>

      {/* 显示模式切换 */}
      <div className="px-4 py-3 bg-white/80 border-b border-orange-200">
        <div className="flex gap-1 max-w-2xl mx-auto">
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              viewMode === 'all' 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setViewMode('sent')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              viewMode === 'sent' 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            寄信
          </button>
          <button
            onClick={() => setViewMode('reply')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              viewMode === 'reply' 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            回信
          </button>
        </div>
      </div>

      {/* 信件卡片列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-24">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* 遍历所有对话轮次 - 倒序排列，最新在上面 */}
          {letter.conversationRounds && letter.conversationRounds.length > 0 ? (
            [...localLetter.conversationRounds]
              .reverse()
              .filter(round => {
                // 如果有指定scrollToRound，只显示该轮次
                if (scrollToRound) {
                  return round.roundNumber === scrollToRound;
                }
                return !round.userLetter.isDeleted || (round.aiReply && !round.aiReply.isDeleted);
              })
              .map((round) => (
              <div key={round.roundNumber}>
                {/* 漂流瓶原内容显示（仅第一轮） */}
                {letter.isBottle && round.roundNumber === 1 && letter.bottleOriginalContent && (viewMode === 'all' || viewMode === 'sent') && (
                  <div className="mb-4">
                    <div className="bg-white rounded-3xl shadow-lg overflow-hidden border-2 border-blue-200">
                      {/* 漂流瓶卡片头部 */}
                      <div className="bg-gradient-to-r from-blue-100 to-cyan-100 px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="text-blue-600">🌊</div>
                          <span className="text-sm font-medium text-gray-700">
                            漂流瓶原内容
                          </span>
                        </div>
                        <div className="text-xs text-blue-600 font-medium">
                          来自 {letter.bottleAIProfile?.name || '远方'}
                        </div>
                      </div>

                      {/* 漂流瓶内容 */}
                      <div className="p-5">
                        <div 
                          className="text-gray-800 leading-relaxed whitespace-pre-wrap font-serif"
                          style={{
                            backgroundImage: `repeating-linear-gradient(
                              transparent,
                              transparent 24px,
                              #e5f3ff 25px
                            )`,
                            lineHeight: '25px',
                            paddingTop: '8px',
                            fontFamily: '"Noto Serif SC", "STSong", serif'
                          }}
                        >
                          {letter.bottleOriginalContent}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 用户发送的信卡片 - 单独的卡片 */}
                {!round.userLetter.isDeleted && (viewMode === 'all' || viewMode === 'sent') && (
                  <div className="mb-4">
                    <div className="bg-white rounded-3xl shadow-lg overflow-hidden border-2 border-gray-100">
                    {/* 卡片头部 */}
                    <div className="bg-gradient-to-r from-orange-100 to-amber-100 px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check size={16} className="text-green-600" />
                        <span className="text-sm font-medium text-gray-700">
                          第 {round.roundNumber} 轮 - {letter.isBottle && round.roundNumber === 1 ? '回复漂流瓶' : `to ${letter.receiverName}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* 操作按钮 */}
                        <button
                          onClick={() => handleDeleteUserLetter(round.roundNumber)}
                          className="p-1.5 hover:bg-white/50 rounded-full transition-colors"
                          title="删除这封寄信"
                        >
                          <Trash2 size={16} className="text-gray-500" />
                        </button>
                        
                        {/* 精致邮票 */}
                        <div className="relative w-12 h-16">
                          {/* 邮票主体 */}
                          <div 
                            className="w-full h-full bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 rounded-sm shadow-lg flex items-center justify-center text-xl relative overflow-hidden"
                            style={{
                              background: `
                                radial-gradient(circle at 0% 50%, transparent 3px, #fef3c7 4px),
                                radial-gradient(circle at 20% 50%, transparent 3px, #fef3c7 4px),
                                radial-gradient(circle at 40% 50%, transparent 3px, #fef3c7 4px),
                                radial-gradient(circle at 60% 50%, transparent 3px, #fef3c7 4px),
                                radial-gradient(circle at 80% 50%, transparent 3px, #fef3c7 4px),
                                radial-gradient(circle at 100% 50%, transparent 3px, #fef3c7 4px),
                                radial-gradient(circle at 50% 0%, transparent 3px, #fef3c7 4px),
                                radial-gradient(circle at 50% 25%, transparent 3px, #fef3c7 4px),
                                radial-gradient(circle at 50% 75%, transparent 3px, #fef3c7 4px),
                                radial-gradient(circle at 50% 100%, transparent 3px, #fef3c7 4px),
                                linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #f59e0b 100%)
                              `,
                              boxShadow: 'inset 0 1px 2px rgba(251, 191, 36, 0.3), 0 2px 8px rgba(0,0,0,0.1)'
                            }}
                          >
                            {/* 邮票内容 */}
                            <div className="relative z-10 drop-shadow-sm">
                              {currentStamp?.image || '📮'}
                            </div>
                            
                            {/* 邮票光泽效果 */}
                            <div 
                              className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"
                              style={{
                                clipPath: 'polygon(0% 0%, 60% 0%, 40% 100%, 0% 100%)'
                              }}
                            />
                          </div>
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
                )}

                {/* AI回信卡片 - 单独的卡片 */}
                {round.aiReply && !round.aiReply.isDeleted && (viewMode === 'all' || viewMode === 'reply') && (
                  <div className="mb-4">
                    <div className="bg-white rounded-3xl shadow-lg overflow-hidden border-2 border-blue-100">
                      {/* 卡片头部 */}
                      <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-xl">
                            {letter.receiverAvatar}
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            第 {round.roundNumber} 轮 - {letter.receiverName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* 操作按钮 */}
                          <button
                            onClick={() => handleFavoriteAIReply(round.roundNumber)}
                            className={`p-1.5 hover:bg-white/50 rounded-full transition-colors ${
                              round.aiReply.isFavorite ? 'bg-yellow-50' : ''
                            }`}
                            title={round.aiReply.isFavorite ? "取消收藏" : "收藏这封回信"}
                          >
                            <Star 
                              size={16} 
                              className={round.aiReply.isFavorite ? "text-yellow-500 fill-yellow-500" : "text-gray-400"} 
                            />
                          </button>
                          <button
                            onClick={() => handleDeleteAIReply(round.roundNumber)}
                            className="p-1.5 hover:bg-white/50 rounded-full transition-colors"
                            title="删除这封回信"
                          >
                            <Trash2 size={16} className="text-gray-400" />
                          </button>
                          
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

                {/* 等待回信状态 - 针对当前轮次 */}
                {!round.aiReply && round.roundNumber === localLetter.currentRound && localLetter.status === 'sent' && (
                  <div className="mb-4 bg-amber-50 border-2 border-dashed border-amber-300 rounded-2xl p-6 text-center">
                    <div className="text-4xl mb-2">⌛</div>
                    <div className="text-gray-700 font-medium">等待第 {round.roundNumber} 轮回信中...</div>
                    <div className="text-sm text-gray-500 mt-1 mb-3">
                      {round.userLetter.hasUrged 
                        ? '已催促，预计很快收到回信'
                        : `预计 ${getExpectedDeliveryDate(round.roundNumber)} 送达`
                      }
                    </div>
                    <div className="flex gap-2 justify-center">
                      {!round.userLetter.hasUrged && (
                        <button
                          onClick={() => handleUrge(round.roundNumber)}
                          className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full font-medium hover:shadow-lg transition-all flex items-center gap-2"
                        >
                          <Zap size={16} />
                          催促回复
                        </button>
                      )}
                      {round.userLetter.hasUrged && round.userLetter.willReplyAt && Date.now() > round.userLetter.willReplyAt && (
                        <button
                          onClick={() => handleManualRetry(round.roundNumber)}
                          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full font-medium hover:shadow-lg transition-all flex items-center gap-2"
                        >
                          <RotateCcw size={16} />
                          手动重试
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* 历史轮次的状态显示 - 显示每轮的独立预计送达时间 */}
                {!round.aiReply && round.roundNumber < localLetter.currentRound && (
                  <div className="mb-4 bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
                    <div className="text-2xl mb-1">📭</div>
                    <div className="text-sm text-gray-600">第 {round.roundNumber} 轮等待回信</div>
                    <div className="text-xs text-gray-500 mt-1 mb-2">
                      {round.userLetter.hasUrged 
                        ? '已催促，预计很快收到回信'
                        : `预计送达时间: ${getExpectedDeliveryDate(round.roundNumber)}`
                      }
                    </div>
                    {/* 历史轮次也可以催促或重试 */}
                    <div className="flex gap-2 justify-center">
                      {!round.userLetter.hasUrged && (
                        <button
                          onClick={() => handleUrge(round.roundNumber)}
                          className="px-4 py-1.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs rounded-full font-medium hover:shadow-md transition-all flex items-center gap-1"
                        >
                          <Zap size={12} />
                          催促
                        </button>
                      )}
                      {round.userLetter.hasUrged && round.userLetter.willReplyAt && Date.now() > round.userLetter.willReplyAt && (
                        <button
                          onClick={() => handleManualRetry(round.roundNumber)}
                          className="px-4 py-1.5 bg-gradient-to-r from-blue-400 to-indigo-400 text-white text-xs rounded-full font-medium hover:shadow-md transition-all flex items-center gap-1"
                        >
                          <RotateCcw size={12} />
                          重试
                        </button>
                      )}
                    </div>
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
                  <div className="text-xs text-red-600">
                    使用右下角按钮可加为笔友继续交流
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* 悬浮按钮组 */}
      <div className="fixed bottom-6 right-6 z-10 flex flex-col gap-3">
        {/* 加为笔友按钮 */}
        {localLetter.isBottle && !localLetter.isPenPalAdded && (
          <button
            onClick={handleAddAsPenPal}
            className="w-14 h-14 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
            title="加为笔友"
          >
            <UserPlus size={24} />
          </button>
        )}
        
        {/* 继续回复按钮 */}
        {replyStatus.canContinue && onContinueReply && (
          <button
            onClick={onContinueReply}
            className="w-14 h-14 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
            title="继续回复"
          >
            <Reply size={24} />
          </button>
        )}
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
