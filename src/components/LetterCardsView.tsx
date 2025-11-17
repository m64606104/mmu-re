/**
 * 信件卡片列表视图
 * 每轮对话显示为独立卡片
 * 参考慢邮件App的卡片设计
 */

import { RefObject, useState, useEffect } from 'react';
import { ArrowLeft, Check, Zap, Reply, UserPlus, Heart, FileText, Send, Maximize2 } from 'lucide-react';
import { Letter } from '../types/letter';
import { getCurrentStamp } from '../utils/stampSystem';
import { urgeLetter, addAsPenPal, toggleFavoriteLetter, canContinueReply, continueReply } from '../utils/letterService';
import { exportLetterToPDF } from '../utils/letterPDFExporter';

interface LetterCardsViewProps {
  letter: Letter;
  onBack: () => void;
  onViewTimeline: () => void;
  userName: string;
  scrollContainerRef?: RefObject<HTMLDivElement>;
  onRefresh?: () => void;
  onReply?: () => void;
}

export default function LetterCardsView({ letter, onBack, onViewTimeline: _onViewTimeline, userName, scrollContainerRef, onRefresh, onReply }: LetterCardsViewProps) {
  const currentStamp = getCurrentStamp();
  const [localLetter, setLocalLetter] = useState(letter);
  const [isFavorited, setIsFavorited] = useState(letter.isFavorite || false);
  const replyStatus = canContinueReply(letter.id);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  // 加为笔友
  const handleAddAsPenPal = () => {
    const success = addAsPenPal(localLetter.id);
    if (success) {
      alert(`💌 已将 ${localLetter.receiverName} 加为笔友！\n\n现在可以无限制地交流啦～`);
      // 刷新数据
      if (onRefresh) {
        onRefresh();
      }
    }
  };

  // 收藏/取消收藏
  const handleToggleFavorite = () => {
    const success = toggleFavoriteLetter(localLetter.id);
    if (success) {
      setIsFavorited(!isFavorited);
    }
  };

  // 导出PDF
  const handleExportPDF = async () => {
    try {
      await exportLetterToPDF(localLetter);
      alert('✅ PDF导出成功！');
    } catch (error) {
      alert('❌ PDF导出失败');
    }
  };

  // 继续回信
  const handleContinueReply = () => {
    if (!replyContent.trim()) {
      alert('请输入回信内容');
      return;
    }
    
    const result = continueReply(localLetter.id, replyContent.trim(), userName);
    if (result) {
      // 获取更新后的信件信息
      import('../utils/letterService').then(({ getLetterById }) => {
        const updatedLetter = getLetterById(localLetter.id);
        const willReplyTime = updatedLetter?.willReplyAt 
          ? formatFullTime(updatedLetter.willReplyAt) 
          : '几天内';
        alert(`✉️ 已寄出第 ${replyStatus.currentRound + 1} 轮回信！\n\n预计 ${willReplyTime} 左右收到回复`);
      });
      setReplyContent('');
      setShowReplyInput(false);
      if (onRefresh) {
        onRefresh();
      }
    } else {
      alert('无法继续回信：已达到最大轮数限制');
    }
  };

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

  // 格式化完整时间（包含小时分钟）
  const formatFullTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-800">{letter.receiverName}</h1>
            {localLetter.isPenPalAdded && (
              <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">笔友</span>
            )}
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            {letter.isBottle && !letter.isPenPalAdded && (
              <span>第 {letter.currentRound}/{letter.maxRounds} 轮</span>
            )}
            {letter.isBottle && <span>📍 {letter.bottleAIProfile?.location || '远方'}</span>}
            {!letter.isBottle && <span>✈️ 已寄出</span>}
          </div>
        </div>
        {/* 功能按钮组 */}
        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} className="p-2 hover:bg-blue-100 rounded-full transition-colors" title="导出PDF">
            <FileText size={20} className="text-blue-600" />
          </button>
          <button onClick={handleToggleFavorite} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title={isFavorited ? "取消收藏" : "收藏"}>
            <Heart size={20} className={isFavorited ? "text-red-500 fill-red-500" : "text-gray-400"} />
          </button>
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
                    <div className="text-gray-700 font-medium mb-2">等待回信中...</div>
                    {localLetter.willReplyAt && (
                      <div className="text-base text-amber-700 font-medium mb-1">
                        预计送达时间
                      </div>
                    )}
                    <div className="text-sm text-gray-600 mb-3">
                      {localLetter.hasUrged 
                        ? '✨ 已催促，预计 15-30 分钟内收到回信'
                        : localLetter.willReplyAt 
                          ? `📅 ${formatFullTime(localLetter.willReplyAt)} 左右`
                          : '📅 预计 1-5 天收到回信'
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
                    {localLetter.hasUrged && (
                      <div className="text-xs text-gray-500 mt-2">
                        已催促，请耐心等待
                      </div>
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

      {/* 底部操作栏 */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-orange-200 px-4 py-4 shrink-0">
        {/* 回信输入框 */}
        {showReplyInput && replyStatus.canContinue && (
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-3 border-2 border-green-200">
            <div className="mb-2 font-medium text-gray-700 text-sm">继续回信</div>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="写下你想说的话..."
              className="w-full h-32 p-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
            />
            <div className="flex gap-2 mt-3">
              {onReply && (
                <button
                  onClick={() => {
                    setShowReplyInput(false);
                    if (onReply) onReply();
                  }}
                  className="p-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                  title="全屏写信"
                >
                  <Maximize2 size={18} />
                </button>
              )}
              <button
                onClick={handleContinueReply}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Send size={18} />
                寄出
              </button>
              <button
                onClick={() => setShowReplyInput(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 状态信息提示 */}
        {localLetter.status === 'replied' && replyStatus.canContinue && !showReplyInput && (
          <div className="space-y-3">
            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button 
                onClick={() => setShowReplyInput(true)}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Reply size={18} />
                继续回信
              </button>
              {localLetter.isBottle && !localLetter.isPenPalAdded && (
                <button 
                  onClick={handleAddAsPenPal}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <UserPlus size={18} />
                  加为笔友
                </button>
              )}
            </div>
            {/* 提示信息 */}
            {localLetter.isBottle && !localLetter.isPenPalAdded && replyStatus.isLastRound && (
              <div className="text-xs text-amber-600 text-center bg-amber-50 py-2 px-3 rounded-lg">
                ⚠️ 这是最后一轮交流，加为笔友可继续无限制通信
              </div>
            )}
          </div>
        )}
        {!replyStatus.canContinue && (
          <div className="space-y-2">
            <div className="text-xs text-center text-gray-500">
              {replyStatus.reason}
            </div>
            {localLetter.isBottle && !localLetter.isPenPalAdded && (
              <button 
                onClick={handleAddAsPenPal}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <UserPlus size={18} />
                加为笔友以继续交流
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
