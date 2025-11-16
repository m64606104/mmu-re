/**
 * 信件详情模态框
 * 显示完整的信件内容和回信
 */

import React from 'react';
import { Letter } from '../types/letter';
import { urgeLetter } from '../utils/letterService';
import { X, Zap } from 'lucide-react';

interface LetterDetailModalProps {
  letter: Letter;
  onClose: () => void;
  onUrge: () => void;
}

const LetterDetailModal: React.FC<LetterDetailModalProps> = ({
  letter,
  onClose,
  onUrge
}) => {
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
              <div className="font-medium text-gray-800">{letter.receiverName}</div>
              <div className="text-xs text-gray-500">
                {letter.isBottle ? '漂流瓶' : '给Ta的信'}
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

        {/* 信件内容 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* 寄出的信 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 relative">
            {/* 邮票 */}
            <div className="absolute top-4 right-4 w-16 h-20 border-4 border-dashed border-orange-400 rounded-md flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100">
              <span className="text-3xl">{getStampEmoji(letter.stampStyle)}</span>
            </div>

            {/* 收信人 */}
            <div className="mb-4 text-gray-700">
              <div className="text-sm text-gray-500 mb-1">To {letter.receiverName}</div>
            </div>

            {/* 信件内容 */}
            <div className="text-gray-800 whitespace-pre-wrap leading-relaxed mb-6 pr-20">
              {letter.content}
            </div>

            {/* 落款 */}
            <div className="text-right text-gray-600 text-sm border-t border-gray-200 pt-4">
              <div>{formatFullTime(letter.sentAt)}</div>
              <div className="mt-1">from {letter.senderName}</div>
            </div>
          </div>

          {/* 回信状态 */}
          {letter.status === 'replied' && letter.replyContent ? (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-6 border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-4 text-blue-700">
                <span className="text-2xl">💌</span>
                <span className="font-medium">收到回信</span>
              </div>

              <div className="text-gray-800 whitespace-pre-wrap leading-relaxed mb-6">
                {letter.replyContent}
              </div>

              <div className="text-right text-gray-600 text-sm border-t border-blue-200 pt-4">
                <div>{formatFullTime(letter.repliedAt!)}</div>
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

        {/* 底部提示 */}
        <div className="bg-white/80 backdrop-blur-sm border-t border-orange-200 px-6 py-3 text-xs text-gray-500 text-center">
          {letter.isBottle 
            ? '这封信通过漂流瓶寄出，对方是随机选择的笔友'
            : `这封信寄给了 ${letter.receiverName}`
          }
        </div>
      </div>
    </div>
  );
};

export default LetterDetailModal;
