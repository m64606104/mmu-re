/**
 * 信件时间轴
 * 显示所有寄信和收信的时间线
 * 参考慢邮件App的时间轴设计
 */

import { ArrowLeft, Mail, Send, Check } from 'lucide-react';
import { Letter } from '../types/letter';

interface TimelineEvent {
  id: string;
  type: 'sent' | 'received';
  date: number;
  receiverName: string;
  receiverAvatar: string;
  status: 'sent' | 'replied';
  letterId: string;
  roundNumber: number;
}

interface LetterTimelineScreenProps {
  letter: Letter;
  onBack: () => void;
  onViewDetail: (roundNumber: number) => void;
}

export default function LetterTimelineScreen({ letter, onBack, onViewDetail }: LetterTimelineScreenProps) {
  // 构建时间线事件
  const events: TimelineEvent[] = [];
  
  // 添加所有对话轮次的事件
  if (letter.conversationRounds) {
    letter.conversationRounds.forEach((round) => {
      // 用户发送的信
      events.push({
        id: `sent-${round.roundNumber}`,
        type: 'sent',
        date: round.userLetter.sentAt,
        receiverName: letter.receiverName,
        receiverAvatar: letter.receiverAvatar || '📮',
        status: round.aiReply ? 'replied' : 'sent',
        letterId: letter.id,
        roundNumber: round.roundNumber
      });
      
      // AI的回信
      if (round.aiReply) {
        events.push({
          id: `received-${round.roundNumber}`,
          type: 'received',
          date: round.aiReply.repliedAt,
          receiverName: letter.receiverName,
          receiverAvatar: letter.receiverAvatar || '📮',
          status: 'replied',
          letterId: letter.id,
          roundNumber: round.roundNumber
        });
      }
    });
  }
  
  // 按时间倒序排列
  events.sort((a, b) => b.date - a.date);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col">
      {/* 顶部栏 */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-800">
            {letter.receiverName}
          </h1>
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <span>○</span>
            <span>—</span>
            <span>○</span>
          </div>
        </div>
      </div>

      {/* 时间轴 */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-md mx-auto relative">
          {/* 中心线 */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-300 -translate-x-1/2" />

          {/* 时间轴事件 */}
          <div className="space-y-8">
            {events.map((event) => {
              const isSent = event.type === 'sent';
              
              return (
                <div 
                  key={event.id}
                  className={`relative flex items-center ${isSent ? 'justify-end' : 'justify-start'} cursor-pointer`}
                  onClick={() => onViewDetail(event.roundNumber)}
                >
                  {/* 左侧（收信） */}
                  {!isSent && (
                    <>
                      <div className="flex-1 flex items-center justify-end pr-8">
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            {event.status === 'replied' ? '收（已收取）' : '收'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(event.date)}
                          </div>
                        </div>
                      </div>
                      
                      {/* 中心点 */}
                      <div className="absolute left-1/2 -translate-x-1/2 z-10">
                        <div className="w-3 h-3 rounded-full bg-yellow-400 border-2 border-white shadow-md" />
                      </div>
                      
                      {/* 信封图标 */}
                      <div className="ml-8 w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white shadow-lg cursor-pointer hover:scale-110 transition-transform">
                        <Mail size={28} />
                      </div>
                    </>
                  )}

                  {/* 右侧（寄信） */}
                  {isSent && (
                    <>
                      {/* 信封图标 */}
                      <div className="mr-8 w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white shadow-lg cursor-pointer hover:scale-110 transition-transform">
                        {event.status === 'replied' ? (
                          <Check size={28} />
                        ) : (
                          <Send size={28} />
                        )}
                      </div>
                      
                      {/* 中心点 */}
                      <div className="absolute left-1/2 -translate-x-1/2 z-10">
                        <div className="w-3 h-3 rounded-full bg-blue-400 border-2 border-white shadow-md" />
                      </div>
                      
                      <div className="flex-1 flex items-center justify-start pl-8">
                        <div className="text-left">
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            {event.status === 'replied' ? '寄（已收取）' : '寄'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(event.date)}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* 底部提示 */}
          {events.length > 0 && (
            <div className="mt-12 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  🔑
                </div>
                <span className="text-sm text-gray-600">
                  共 {events.length} 次往来
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
