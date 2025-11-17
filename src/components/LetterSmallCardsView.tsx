/**
 * 小卡片列表视图
 * 参考图2的设计，展示所有往来信件的小卡片
 * 点击后展开查看完整内容
 */

import { useState } from 'react';
import { ArrowLeft, User, Bot, Trash2 } from 'lucide-react';
import { Letter } from '../types/letter';
import { archiveLetter } from '../utils/letterService';

interface LetterSmallCardsViewProps {
  letters: Letter[];
  receiverName: string;
  onBack: () => void;
  onViewDetail: (letter: Letter, roundIndex?: number) => void;
  onDelete?: (letterId: string) => void;
}

export default function LetterSmallCardsView({
  letters,
  receiverName,
  onBack,
  onViewDetail,
  onDelete
}: LetterSmallCardsViewProps) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // 删除单个信件
  const handleDelete = (e: React.MouseEvent, letterId: string) => {
    e.stopPropagation();
    if (confirm(`确定要将这封信放入回收站吗？`)) {
      archiveLetter(letterId);
      if (onDelete) {
        onDelete(letterId);
      }
    }
  };

  // 收集所有对话卡片
  const getAllCards = () => {
    const cards: Array<{
      id: string;
      letterId: string;
      roundIndex: number;
      type: 'user' | 'ai';
      sender: string;
      content: string;
      date: number;
      letter: Letter;
    }> = [];

    letters.forEach(letter => {
      letter.conversationRounds.forEach((round, roundIndex) => {
        // 用户的信
        cards.push({
          id: `${letter.id}-${roundIndex}-user`,
          letterId: letter.id,
          roundIndex,
          type: 'user',
          sender: letter.senderName,
          content: round.userLetter.content,
          date: round.userLetter.sentAt,
          letter
        });

        // AI的回信
        if (round.aiReply) {
          cards.push({
            id: `${letter.id}-${roundIndex}-ai`,
            letterId: letter.id,
            roundIndex,
            type: 'ai',
            sender: letter.receiverName,
            content: round.aiReply.content,
            date: round.aiReply.repliedAt,
            letter
          });
        }
      });
    });

    // 按时间排序
    return cards.sort((a, b) => a.date - b.date);
  };

  const cards = getAllCards();

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  // 格式化发件人
  const formatSender = (name: string) => {
    if (name.length > 6) {
      return name.substring(0, 6) + '...';
    }
    return name;
  };

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col">
      {/* 顶部栏 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-purple-200 px-4 py-4 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-800">{receiverName}</h1>
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <span>📬</span>
            <span>{cards.length} 张卡片</span>
          </div>
        </div>
      </div>

      {/* 卡片列表 */}
      <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 0 }}>
        <div className="max-w-2xl mx-auto space-y-3">
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => {
                if (expandedCard === card.id) {
                  // 如果已展开，点击查看完整详情
                  onViewDetail(card.letter, card.roundIndex);
                } else {
                  // 否则展开卡片
                  setExpandedCard(card.id);
                }
              }}
              className={`
                w-full text-left transition-all duration-300
                ${expandedCard === card.id ? 'scale-[1.02]' : 'hover:scale-[1.01]'}
              `}
            >
              <div
                className={`
                  rounded-2xl shadow-md overflow-hidden
                  ${card.type === 'user'
                    ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200'
                    : 'bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200'
                  }
                `}
              >
                {/* 卡片头部 */}
                <div className={`
                  px-4 py-2 flex items-center justify-between
                  ${card.type === 'user'
                    ? 'bg-gradient-to-r from-blue-100 to-cyan-100'
                    : 'bg-gradient-to-r from-purple-100 to-pink-100'
                  }
                `}>
                  <div className="flex items-center gap-2">
                    {card.type === 'user' ? (
                      <User size={16} className="text-blue-600" />
                    ) : (
                      <Bot size={16} className="text-purple-600" />
                    )}
                    <span className="font-bold text-sm text-gray-800">
                      {card.type === 'user' ? formatSender(card.sender) : formatSender(card.sender)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">
                      {formatTime(card.date)}
                    </span>
                    {/* 删除按钮 */}
                    <button
                      onClick={(e) => handleDelete(e, card.letterId)}
                      className="p-1 hover:bg-red-100 rounded-full transition-colors"
                      title="删除"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                </div>

                {/* 卡片内容 */}
                <div className="p-4">
                  <div
                    className={`
                      text-sm text-gray-700 leading-relaxed
                      ${expandedCard === card.id ? '' : 'line-clamp-3'}
                    `}
                  >
                    {card.content}
                  </div>

                  {/* 展开提示 */}
                  {expandedCard !== card.id && card.content.length > 60 && (
                    <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                      <span>点击展开</span>
                      <span>↓</span>
                    </div>
                  )}

                  {/* 已展开时显示查看详情按钮 */}
                  {expandedCard === card.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
                      <div className="text-xs text-blue-600 font-medium flex items-center gap-1">
                        查看完整详情 →
                      </div>
                    </div>
                  )}
                </div>

                {/* 发件人标签（底部） */}
                <div className={`
                  px-4 py-2 text-xs flex items-center justify-between
                  ${card.type === 'user'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-purple-50 text-purple-700'
                  }
                `}>
                  <span>from {formatSender(card.sender)}</span>
                  {card.type === 'user' ? (
                    <span>寄出</span>
                  ) : (
                    <span>收到</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
