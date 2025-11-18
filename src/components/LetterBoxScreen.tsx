/**
 * 信箱列表页面
 * 显示所有寄出的信件
 */

import React, { useState, useEffect } from 'react';
import { Letter } from '../types/letter';
import { getActiveLetters, archiveLetter } from '../utils/letterService';
import { ArrowLeft, Mail, Send, Clock, Check, Users, Trash2, Archive, Trophy, Database, Heart, Award, Bell, Waves } from 'lucide-react';
import LetterDetailView from './LetterDetailView';
import LetterDataManagement from './LetterDataManagement';

interface LetterBoxScreenProps {
  onBack: () => void;
  onWriteNew: () => void;
  onToPenPals: () => void;
  toArchived: () => void;
  onToRecycleBin: () => void;
  onToAchievements: () => void;
  onToFavorites: () => void;
  onToFavoriteReplies: () => void;
  onToStampCollection: () => void;
  onToNotifications: () => void;
  onToBottleFishing: () => void;
  onContinueReply?: (letter: Letter) => void;
  userName: string;
}

const LetterBoxScreen: React.FC<LetterBoxScreenProps> = ({
  onBack,
  onWriteNew,
  onToPenPals,
  onToRecycleBin,
  onToAchievements,
  onToFavorites,
  onToFavoriteReplies,
  onToStampCollection,
  onToNotifications,
  onToBottleFishing,
  onContinueReply,
  userName
}) => {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true); // 添加加载状态

  useEffect(() => {
    // 初始加载
    const initLoad = async () => {
      setIsLoading(true);
      await loadLetters();
      await loadUnreadCount();
      setIsLoading(false);
    };
    
    initLoad();
    
    // 每10秒刷新一次，检查是否有新回信
    const interval = setInterval(() => {
      loadLetters();
      loadUnreadCount();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = () => {
    // 动态导入避免循环依赖
    import('../utils/letterNotificationSystem').then(({ getUnreadCount }) => {
      setUnreadCount(getUnreadCount());
    });
  };

  const loadLetters = () => {
    return new Promise<void>((resolve) => {
      // 确保从lstorage已更新
      setTimeout(() => {
        const activeLetters = getActiveLetters();
        console.log('📦 加载信件数量:', activeLetters.length);
        setLetters(activeLetters);
        resolve();
      }, 100); // 给localStorage一点时间更新
    });
  };

  const handleArchive = (letterId: string, receiverName: string) => {
    if (confirm(`确定要归档与 ${receiverName} 的信件吗？\n\n归档后可在回收站中恢复`)) {
      const success = archiveLetter(letterId);
      if (success) {
        alert('📦 已归档');
        loadLetters();
      }
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return '今天';
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
    }
  };

  const getStampEmoji = (style?: Letter['stampStyle']) => {
    switch (style) {
      case 'vintage': return '🏛️';
      case 'flower': return '🌸';
      case 'sea': return '🌊';
      default: return '📮';
    }
  };

  // 加载中状态
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 z-50 flex flex-col items-center justify-center">
        <div className="text-6xl mb-4 animate-bounce">📦</div>
        <p className="text-gray-600">加载中...</p>
      </div>
    );
  }

  // 空状态
  if (letters.length === 0) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 z-50 flex flex-col">
        {/* 顶部导航栏 */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-indigo-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 hover:bg-indigo-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">信箱</h1>
          <div className="w-10" />
        </div>

        {/* 空状态插画 */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-8xl mb-6 animate-bounce">📬</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">海上来信</h2>
          <p className="text-gray-500 text-center mb-8">
            正在接收远方的信号<br />
            还没有寄出过信件哦
          </p>
          <button
            onClick={onWriteNew}
            className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full font-medium hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Send size={20} />
            写第一封信
          </button>
        </div>

        <div className="p-4 text-center text-sm text-gray-400">
          版本 1.0.0
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 z-50 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-orange-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 hover:bg-orange-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">信箱</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDataManagement(true)}
            className="p-2 hover:bg-blue-100 rounded-full transition-colors"
            title="数据管理"
          >
            <Database size={20} className="text-blue-600" />
          </button>
          <button
            onClick={onWriteNew}
            className="p-2 hover:bg-orange-100 rounded-full transition-colors"
            title="写信"
          >
            <Send size={20} className="text-orange-600" />
          </button>
        </div>
      </div>

      {/* 快捷功能图标栏 */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-orange-100 px-3 py-3">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {/* 我的笔友 */}
          <button
            onClick={onToPenPals}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-pink-50 transition-colors flex-shrink-0 min-w-[64px]"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center">
              <Users size={20} className="text-pink-600" />
            </div>
            <span className="text-xs text-gray-700">笔友</span>
          </button>

          {/* 漂流瓶 */}
          <button
            onClick={onToBottleFishing}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-cyan-50 transition-colors flex-shrink-0 min-w-[64px]"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center">
              <Waves size={20} className="text-cyan-600" />
            </div>
            <span className="text-xs text-gray-700">漂流瓶</span>
          </button>

          {/* 收藏信件 */}
          <button
            onClick={onToFavorites}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors flex-shrink-0 min-w-[64px]"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center">
              <Heart size={20} className="text-red-500" />
            </div>
            <span className="text-xs text-gray-700">收藏</span>
          </button>

          {/* 收藏回复 */}
          <button
            onClick={onToFavoriteReplies}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-yellow-50 transition-colors flex-shrink-0 min-w-[64px]"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-100 to-amber-100 flex items-center justify-center">
              ⭐
            </div>
            <span className="text-xs text-gray-700">回复</span>
          </button>

          {/* 回收站 */}
          <button
            onClick={onToRecycleBin}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0 min-w-[64px]"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <Trash2 size={20} className="text-gray-600" />
            </div>
            <span className="text-xs text-gray-700">回收站</span>
          </button>

          {/* 邮票 */}
          <button
            onClick={onToStampCollection}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-amber-50 transition-colors flex-shrink-0 min-w-[64px]"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
              <Award size={20} className="text-amber-600" />
            </div>
            <span className="text-xs text-gray-700">邮票</span>
          </button>

          {/* 通知 */}
          <button
            onClick={onToNotifications}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-blue-50 transition-colors flex-shrink-0 min-w-[64px] relative"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center relative">
              <Bell size={20} className="text-blue-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-md">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-700">通知</span>
          </button>

          {/* 成就 */}
          <button
            onClick={onToAchievements}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-yellow-50 transition-colors flex-shrink-0 min-w-[64px]"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-center">
              <Trophy size={20} className="text-yellow-600" />
            </div>
            <span className="text-xs text-gray-700">成就</span>
          </button>
        </div>
      </div>

      {/* 信件列表 */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {letters.map((letter) => (
            <div
              key={letter.id}
              className="w-full rounded-3xl shadow-lg hover:shadow-2xl transition-all relative overflow-hidden group"
              style={{
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%)',
              }}
            >
              {/* 信封边框装饰 */}
              <div className="absolute inset-0 border-4 border-amber-200 rounded-3xl opacity-50" />
              
              {/* 内容区域 */}
              <div className="relative bg-white/95 backdrop-blur-sm m-2 rounded-2xl p-4">
                {/* 已回复标记 */}
                {letter.status === 'replied' && (
                  <div className="absolute top-3 left-3 z-10">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                      <Check size={20} className="text-white" />
                    </div>
                  </div>
                )}

                {/* 邮票 - 更立体 */}
                <div className="absolute top-3 right-3 w-14 h-18 border-3 border-dashed border-orange-400 rounded-lg flex items-center justify-center bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-100 shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all">
                  <span className="text-3xl">{getStampEmoji(letter.stampStyle)}</span>
                </div>

              {/* 主要内容区（可点击） */}
              <div 
                onClick={() => setSelectedLetter(letter)}
                className="pr-20 pl-2 cursor-pointer"
              >
                {/* 收信人 */}
                <div className="flex items-center gap-3 mb-3 pt-1">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-2xl shadow-md">
                    {letter.receiverAvatar}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-800 text-lg">{letter.receiverName}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {letter.isPenPalAdded && (
                        <span className="text-xs bg-gradient-to-r from-pink-400 to-rose-400 text-white px-2.5 py-0.5 rounded-full shadow-sm">
                          ❤️ 笔友
                        </span>
                      )}
                      {letter.isBottle && !letter.isPenPalAdded && (
                        <span className="text-xs bg-gradient-to-r from-blue-400 to-cyan-400 text-white px-2.5 py-0.5 rounded-full shadow-sm">
                          🌊 漂流瓶
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 内容预览 */}
                <div className="text-sm text-gray-700 line-clamp-2 mb-3 pl-1 italic">
                  “{letter.content}”
                </div>

                {/* 底部信息 */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-gray-600 font-medium">📅 {formatTime(letter.sentAt)}</span>
                    {letter.status === 'replied' ? (
                      <span className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-3 py-1 rounded-full font-medium flex items-center gap-1.5 shadow-sm">
                        <Mail size={13} />
                        已回复
                      </span>
                    ) : (
                      <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white px-3 py-1 rounded-full font-medium flex items-center gap-1.5 shadow-sm">
                        <Clock size={13} />
                        等待回信
                      </span>
                    )}
                    <span className="text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                      🔁 {letter.currentRound} 轮
                    </span>
                  </div>
                </div>
              </div>

              {/* 归档按钮 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleArchive(letter.id, letter.receiverName);
                }}
                className="absolute bottom-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                title="归档"
              >
                <Archive size={16} className="text-gray-600" />
              </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 信件详情 - 使用新的卡片视图 */}
      {selectedLetter && (
        <div className="fixed inset-0 z-50 bg-white">
          <LetterDetailView
            letter={selectedLetter}
            onBack={() => {
              setSelectedLetter(null);
              loadLetters(); // 关闭时刷新列表
            }}
            userName={userName}
            onContinueReply={onContinueReply ? () => {
              onContinueReply(selectedLetter);
            } : undefined}
          />
        </div>
      )}

      {/* 数据管理模态框 */}
      {showDataManagement && (
        <LetterDataManagement
          onClose={() => setShowDataManagement(false)}
          letters={letters}
          onRefresh={loadLetters}
        />
      )}
    </div>
  );
};

export default LetterBoxScreen;
