/**
 * 信件详情模态框
 * 显示完整的信件内容和回信
 */

import React, { useState } from 'react';
import { Letter } from '../types/letter';
import { urgeLetter, canContinueReply, continueReply, addAsPenPal } from '../utils/letterService';
import { X, Zap, MailPlus, UserPlus, Send } from 'lucide-react';

interface LetterDetailModalProps {
  letter: Letter;
  onClose: () => void;
  onUrge: () => void;
  userName: string;
}

const LetterDetailModal: React.FC<LetterDetailModalProps> = ({
  letter,
  onClose,
  onUrge,
  userName
}) => {
  const [replyContent, setReplyContent] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);
  
  const replyStatus = canContinueReply(letter.id);
  const handleUrge = () => {
    const success = urgeLetter(letter.id);
    if (success) {
      alert('✨ 已催促回复！\n\n预计15-30分钟内收到回信');
      onUrge();
      onClose();
    } else {
      alert('无法催促：\n' + (letter.hasUrged ? '已经催促过了' : '信件状态不正确'));
    }
  };
  
  const handleContinueReply = () => {
    if (!replyContent.trim()) {
      alert('请输入回信内容');
      return;
    }
    
    const result = continueReply(letter.id, replyContent.trim(), userName);
    if (result) {
      alert(`✉️ 已寄出第 ${replyStatus.currentRound + 1} 轮回信！\n\n预计1-5天内收到回复`);
      setReplyContent('');
      setShowReplyInput(false);
      onUrge();
    } else {
      alert('无法继续回信：已达到最大轮数限制');
    }
  };
  
  const handleAddAsPenPal = () => {
    const success = addAsPenPal(letter.id);
    if (success) {
      alert(`💌 已将 ${letter.receiverName} 加为笔友！\n\n现在可以无限制地交流啦～`);
      onUrge();
    } else {
      alert('无法加为笔友');
    }
  };

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

  const getStampEmoji = (style?: Letter['stampStyle']) => {
    switch (style) {
      case 'vintage': return '🏛️';
      case 'flower': return '🌸';
      case 'sea': return '🌊';
      default: return '📮';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部栏 */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-orange-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{letter.receiverAvatar}</span>
            <div>
              <div className="font-medium text-gray-800 flex items-center gap-2">
                {letter.receiverName}
                {letter.isPenPalAdded && (
                  <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">
                    笔友
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-2">
                {letter.isBottle ? '漂流瓶' : '给Ta的信'}
                {letter.isBottle && !letter.isPenPalAdded && (
                  <span className="text-amber-600">
                    · 第 {letter.currentRound}/{letter.maxRounds} 轮
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* 信件内容 - 显示所有轮次 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
          {letter.conversationRounds && letter.conversationRounds.length > 0 ? (
            letter.conversationRounds.map((round, index) => (
            <div key={round.roundNumber} className="mb-6">
              {/* 轮次标记 */}
              {letter.conversationRounds.length > 1 && (
                <div className="text-center text-xs text-gray-400 mb-3">
                  — 第 {round.roundNumber} 轮 —
                </div>
              )}
              
              {/* 用户的信 */}
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-4 relative">
                {index === 0 && (
                  <div className="absolute top-4 right-4 w-16 h-20 border-4 border-dashed border-orange-400 rounded-md flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100">
                    <span className="text-3xl">{getStampEmoji(letter.stampStyle)}</span>
                  </div>
                )}

                <div className="mb-4 text-gray-700">
                  <div className="text-sm text-gray-500 mb-1">To {letter.receiverName}</div>
                </div>

                <div className="text-gray-800 whitespace-pre-wrap leading-relaxed mb-6 pr-20">
                  {round.userLetter.content}
                </div>

                <div className="text-right text-gray-600 text-sm border-t border-gray-200 pt-4">
                  <div>{formatFullTime(round.userLetter.sentAt)}</div>
                  <div className="mt-1">from {letter.senderName}</div>
                </div>
              </div>

              {/* AI的回信 */}
              {round.aiReply ? (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-6 border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-4 text-blue-700">
                    <span className="text-2xl">💌</span>
                    <span className="font-medium">收到回信</span>
                  </div>

                  <div className="text-gray-800 whitespace-pre-wrap leading-relaxed mb-6">
                    {round.aiReply.content}
                  </div>

                  <div className="text-right text-gray-600 text-sm border-t border-blue-200 pt-4">
                    <div>{formatFullTime(round.aiReply.repliedAt)}</div>
                    <div className="mt-1">from {letter.receiverName}</div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border-2 border-dashed border-amber-300 rounded-2xl p-6 text-center">
                  <div className="text-5xl mb-3">⏳</div>
                  <div className="text-gray-700 font-medium mb-2">等待回信中...</div>
                  <div className="text-sm text-gray-500 mb-4">
                    {letter.hasUrged 
                      ? '已催促，预计很快收到回信'
                      : `预计 ${formatFullTime(letter.willReplyAt!)} 左右收到回信`
                    }
                  </div>

                  {!letter.hasUrged && (
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
            <div className="bg-amber-50 border-2 border-dashed border-amber-300 rounded-2xl p-6 text-center">
              <div className="text-5xl mb-3">⚠️</div>
              <div className="text-gray-700 font-medium mb-2">信件数据格式错误</div>
              <div className="text-sm text-gray-500">
                请尝试刷新页面或联系技术支持
              </div>
            </div>
          )}

          {/* 继续回信输入框 */}
          {showReplyInput && replyStatus.canContinue && (
            <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-green-200">
              <div className="mb-3 font-medium text-gray-700">继续回信</div>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="写下你想说的话..."
                className="w-full h-32 p-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <div className="flex gap-2 mt-3">
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
        </div>

        {/* 底部操作栏 */}
        <div className="bg-white/80 backdrop-blur-sm border-t border-orange-200 px-6 py-4">
          {letter.status === 'replied' && replyStatus.canContinue && (
            <div className="space-y-3">
              {/* 操作按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReplyInput(true)}
                  disabled={showReplyInput}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MailPlus size={18} />
                  继续回信
                </button>
                
                {letter.isBottle && !letter.isPenPalAdded && (
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
              {letter.isBottle && !letter.isPenPalAdded && replyStatus.isLastRound && (
                <div className="text-xs text-amber-600 text-center bg-amber-50 py-2 px-3 rounded-lg">
                  ⚠️ 这是最后一轮交流，加为笔友可继续无限制通信
                </div>
              )}
            </div>
          )}

          {!replyStatus.canContinue && replyStatus.reason && (
            <div className="text-xs text-center text-gray-500 py-2">
              {replyStatus.reason}
              {letter.isBottle && !letter.isPenPalAdded && (
                <div className="mt-2">
                  <button
                    onClick={handleAddAsPenPal}
                    className="text-pink-600 hover:text-pink-700 font-medium"
                  >
                    点击加为笔友以继续交流 →
                  </button>
                </div>
              )}
            </div>
          )}

          {!letter.isBottle && (
            <div className="text-xs text-gray-500 text-center">
              {`这封信寄给了 ${letter.receiverName}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LetterDetailModal;
