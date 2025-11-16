/**
 * 笔友列表页面
 * 显示所有已加为笔友的漂流瓶AI
 */

import React, { useState, useEffect } from 'react';
import { Letter, BottleAI } from '../types/letter';
import { getAllPenPals, getPenPalStats, getCustomPenPals } from '../utils/letterService';
import { ArrowLeft, MapPin, Heart, MessageCircle, Mail, Sparkles } from 'lucide-react';
import LetterDetailModal from './LetterDetailModal';

interface PenPalListScreenProps {
  onBack: () => void;
  onWriteTo: (receiverId: string, receiverName: string, receiverAvatar: string) => void;
  userName: string;
}

const PenPalListScreen: React.FC<PenPalListScreenProps> = ({
  onBack,
  onWriteTo,
  userName
}) => {
  const [penPals, setPenPals] = useState<Letter[]>([]);
  const [customPenPals, setCustomPenPals] = useState<BottleAI[]>([]);
  const [stats, setStats] = useState<ReturnType<typeof getPenPalStats>>();
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);

  useEffect(() => {
    loadPenPals();
  }, []);

  const loadPenPals = () => {
    const pals = getAllPenPals();
    const customPals = getCustomPenPals();
    const statistics = getPenPalStats();
    setPenPals(pals);
    setCustomPenPals(customPals);
    setStats(statistics);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return '今天';
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 z-50 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-pink-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 hover:bg-pink-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">我的笔友</h1>
        <div className="w-10" /> {/* 占位 */}
      </div>

      {/* 统计卡片 */}
      {stats && stats.total > 0 && (
        <div className="p-4">
          <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-3xl font-bold">{stats.total}</div>
                <div className="text-pink-100 text-sm">位笔友</div>
              </div>
              <Heart size={48} className="text-white/30" />
            </div>
            <div className="flex gap-6 text-sm">
              <div>
                <div className="text-pink-100">总交流轮数</div>
                <div className="text-xl font-semibold">{stats.totalRounds}</div>
              </div>
              <div>
                <div className="text-pink-100">来自地区</div>
                <div className="text-xl font-semibold">{stats.locations.length}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 笔友列表 */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {penPals.length === 0 && customPenPals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Heart size={64} className="mb-4 opacity-30" />
            <div className="text-lg mb-2">还没有笔友</div>
            <div className="text-sm">试试投漂流瓶，遇到聊得来的就加为笔友吧～</div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 自定义笔友区 */}
            {customPenPals.length > 0 && (
              <>
                <div className="flex items-center gap-2 text-sm font-medium text-purple-700 px-2">
                  <Sparkles size={16} />
                  我的自定义笔友 ({customPenPals.length})
                </div>
                {customPenPals.map((penPal) => (
                  <div
                    key={penPal.id}
                    className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-md p-4 hover:shadow-lg transition-all border border-purple-100"
                  >
                    <div className="flex items-start gap-4">
                      {/* 头像 */}
                      <div className="text-4xl flex-shrink-0">
                        {penPal.avatar}
                      </div>

                      {/* 信息区 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-800">
                            {penPal.name}
                          </span>
                          <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                            自定义角色
                          </span>
                        </div>

                        {/* 角色设定 */}
                        <div className="space-y-1 mb-3">
                          <div className="text-xs text-gray-600 line-clamp-2">
                            {penPal.customRolePrompt}
                          </div>
                          {penPal.customBackground && (
                            <div className="text-xs text-gray-500 line-clamp-1">
                              💭 {penPal.customBackground}
                            </div>
                          )}
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => onWriteTo(
                              penPal.id,
                              penPal.name,
                              penPal.avatar
                            )}
                            className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg text-white rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1"
                          >
                            <Mail size={16} />
                            写信
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
            
            {/* 已通信笔友区 */}
            {penPals.length > 0 && (
              <>
                {customPenPals.length > 0 && (
                  <div className="flex items-center gap-2 text-sm font-medium text-pink-700 px-2 pt-2">
                    <Heart size={16} />
                    已通信笔友 ({penPals.length})
                  </div>
                )}
                {penPals.map((letter) => (
              <div
                key={letter.id}
                className="bg-white rounded-2xl shadow-md p-4 hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* 头像 */}
                  <div className="text-4xl flex-shrink-0">
                    {letter.receiverAvatar}
                  </div>

                  {/* 信息区 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-800">
                        {letter.receiverName}
                      </span>
                      <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">
                        笔友
                      </span>
                    </div>

                    {/* AI人设信息 */}
                    {letter.bottleAIProfile && (
                      <div className="space-y-1 mb-2">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <MapPin size={12} />
                          <span>{letter.bottleAIProfile.location}</span>
                        </div>
                        <div className="text-xs text-gray-600 line-clamp-1">
                          {letter.bottleAIProfile.personality}
                        </div>
                        <div className="text-xs text-gray-500">
                          💭 {letter.bottleAIProfile.hobby}
                        </div>
                      </div>
                    )}

                    {/* 交流统计 */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <MessageCircle size={14} />
                        <span>{letter.currentRound} 轮对话</span>
                      </div>
                      <div>
                        最后: {formatTime(letter.repliedAt || letter.sentAt)}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedLetter(letter)}
                        className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors"
                      >
                        查看对话
                      </button>
                      <button
                        onClick={() => onWriteTo(
                          letter.receiverId,
                          letter.receiverName,
                          letter.receiverAvatar || '💌'
                        )}
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:shadow-lg text-white rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1"
                      >
                        <Mail size={16} />
                        写信
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* 信件详情模态框 */}
      {selectedLetter && (
        <LetterDetailModal
          letter={selectedLetter}
          onClose={() => {
            setSelectedLetter(null);
            loadPenPals();
          }}
          onUrge={() => {
            loadPenPals();
          }}
          userName={userName}
        />
      )}
    </div>
  );
};

export default PenPalListScreen;
