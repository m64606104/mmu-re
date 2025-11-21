/**
 * 基于轮次的信件详情视图
 * 每一轮对话显示为独立卡片
 */

import { useState } from 'react';
import { ArrowLeft, Edit2, Filter } from 'lucide-react';
import { Letter, LetterRound } from '../types/letter';
import { getAIDisplayName } from '../utils/letterNicknameManager';
import { formatLastActivity } from '../utils/letterListManager';
import RoundDetailView from './RoundDetailView';

interface RoundBasedLetterViewProps {
  letter: Letter;
  onBack: () => void;
  userName: string;
  onContinueReply?: () => void;
}

type ViewMode = 'all' | 'sent' | 'received';

export default function RoundBasedLetterView({
  letter,
  onBack,
  userName,
  onContinueReply
}: RoundBasedLetterViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedRound, setSelectedRound] = useState<LetterRound | null>(null);
  
  // 按时间倒序排列轮次（最新的在上面）
  const sortedRounds = [...letter.conversationRounds].sort((a, b) => 
    b.roundNumber - a.roundNumber
  );

  // 根据查看模式过滤轮次
  const getFilteredRounds = () => {
    return sortedRounds.filter(round => {
      switch (viewMode) {
        case 'sent':
          return !round.userLetter.isDeleted;
        case 'received':
          return round.aiReply && !round.aiReply.isDeleted;
        default:
          return true;
      }
    });
  };

  // 获取轮次状态
  const getRoundStatus = (round: LetterRound) => {
    if (round.aiReply) {
      if (round.aiReply.isDeleted) {
        return { type: 'deleted', text: '已删除', color: 'bg-gray-100 text-gray-500' };
      }
      return { type: 'replied', text: '已回复', color: 'bg-green-100 text-green-600' };
    } else {
      return { type: 'pending', text: '待回复', color: 'bg-orange-100 text-orange-600' };
    }
  };

  // 获取轮次预览内容
  const getRoundPreview = (round: LetterRound) => {
    if (viewMode === 'received' && round.aiReply) {
      return round.aiReply.content;
    }
    if (viewMode === 'sent') {
      return round.userLetter.content;
    }
    // 全部模式：优先显示AI回复，没有则显示用户信件
    return round.aiReply?.content || round.userLetter.content;
  };

  // 获取轮次时间
  const getRoundTime = (round: LetterRound) => {
    if (viewMode === 'received' && round.aiReply) {
      return round.aiReply.repliedAt;
    }
    if (viewMode === 'sent') {
      return round.userLetter.sentAt;
    }
    // 全部模式：优先显示AI回复时间，没有则显示发送时间
    return round.aiReply?.repliedAt || round.userLetter.sentAt;
  };

  // 如果选择了具体轮次，显示详情
  if (selectedRound) {
    return (
      <RoundDetailView
        round={selectedRound}
        letter={letter}
        onBack={() => setSelectedRound(null)}
        userName={userName}
        viewMode={viewMode}
        onContinueReply={onContinueReply}
      />
    );
  }

  const filteredRounds = getFilteredRounds();
  const displayName = getAIDisplayName(letter.receiverId, letter.receiverName);

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
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-xl">
            {letter.receiverAvatar}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-800">{displayName}</h1>
            <div className="text-sm text-gray-500">
              {letter.conversationRounds.length}轮对话 · {formatLastActivity(letter.sentAt)}
            </div>
          </div>
        </div>

        <button className="p-2 hover:bg-indigo-100 rounded-full transition-colors">
          <Edit2 size={20} className="text-gray-600" />
        </button>
      </div>

      {/* 筛选标签栏 */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-indigo-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-500" />
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                viewMode === 'all'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white/80 text-gray-600 hover:bg-white'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setViewMode('sent')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                viewMode === 'sent'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/80 text-gray-600 hover:bg-white'
              }`}
            >
              寄信
            </button>
            <button
              onClick={() => setViewMode('received')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                viewMode === 'received'
                  ? 'bg-green-500 text-white'
                  : 'bg-white/80 text-gray-600 hover:bg-white'
              }`}
            >
              回信
            </button>
          </div>
        </div>
      </div>

      {/* 轮次列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {filteredRounds.map((round) => {
            const status = getRoundStatus(round);
            const preview = getRoundPreview(round);
            const time = getRoundTime(round);

            return (
              <div
                key={round.roundNumber}
                onClick={() => setSelectedRound(round)}
                className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer overflow-hidden border border-gray-100"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-800">
                        第 {round.roundNumber} 轮对话
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                        {status.text}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatLastActivity(time)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-700 line-clamp-2 mb-3">
                    "{preview}"
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {round.userLetter && !round.userLetter.isDeleted && (
                        <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded">
                          已发送
                        </span>
                      )}
                      {round.aiReply && !round.aiReply.isDeleted && (
                        <span className="bg-green-50 text-green-600 px-2 py-1 rounded">
                          已回复
                        </span>
                      )}
                      {round.aiReply?.isFavorite && (
                        <span className="text-red-500">❤️</span>
                      )}
                    </div>
                    
                    <div className="text-gray-400">
                      点击查看详情 →
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {filteredRounds.length === 0 && (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">暂无内容</h3>
              <p className="text-gray-500">
                {viewMode === 'sent' && '暂无寄出的信件'}
                {viewMode === 'received' && '暂无收到的回信'}
                {viewMode === 'all' && '暂无对话记录'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 底部操作栏 */}
      {letter.status !== 'replied' && onContinueReply && (
        <div className="bg-white/80 backdrop-blur-sm border-t border-indigo-100 px-4 py-3">
          <button
            onClick={onContinueReply}
            className="w-full py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors"
          >
            继续回信
          </button>
        </div>
      )}
    </div>
  );
}
