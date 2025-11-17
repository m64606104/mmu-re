/**
 * 信箱列表页面
 * 显示所有寄出的信件
 */

import React, { useState, useEffect } from 'react';
import { Letter } from '../types/letter';
import { getActiveLetters, archiveLetter } from '../utils/letterService';
import { Mail, Send, Clock, Check, Users, Trash2, Archive, Trophy, Heart, Bell, Waves, Inbox, LayoutGrid, List } from 'lucide-react';
import LetterDetailView from './LetterDetailView';
import LetterDataManagement from './LetterDataManagement';
import LetterBoxListView from './LetterBoxListView';
import LetterSmallCardsView from './LetterSmallCardsView';

interface LetterBoxScreenProps {
  onBack: () => void;
  onWriteNew: () => void;
  onToPenPals: () => void;
  toArchived: () => void;
  onToAchievements: () => void;
  onToFavorites: () => void;
  onToStampCollection: () => void;
  onToNotifications: () => void;
  onToBottleFishing: () => void;
  userName: string;
}

type BottomTab = 'inbox' | 'favorites' | 'penpals' | 'trash';
type ViewMode = 'list' | 'filebox' | 'smallcards' | 'detail';

interface LetterBox {
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  letters: Letter[];
  totalRounds: number;
  lastLetterDate: number;
  hasUnread: boolean;
}

const LetterBoxScreen: React.FC<LetterBoxScreenProps> = ({
  onBack: _onBack,
  onWriteNew,
  onToPenPals,
  toArchived,
  onToAchievements: _onToAchievements,
  onToFavorites,
  onToStampCollection,
  onToNotifications,
  onToBottleFishing,
  userName
}) => {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<BottomTab>('inbox');
  const [viewMode, setViewMode] = useState<ViewMode>('list'); // 默认使用列表模式
  const [selectedBox, setSelectedBox] = useState<LetterBox | null>(null);
  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number | undefined>(undefined);

  useEffect(() => {
    loadLetters();
    loadUnreadCount();
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
    const activeLetters = getActiveLetters();
    setLetters(activeLetters);
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

  // 根据activeTab切换页面
  const handleTabChange = (tab: BottomTab) => {
    setActiveTab(tab);
    switch(tab) {
      case 'favorites':
        onToFavorites();
        break;
      case 'penpals':
        onToPenPals();
        break;
      case 'trash':
        toArchived();
        break;
      default:
        // inbox - 当前页面
        break;
    }
  };

  // 空状态
  if (letters.length === 0) {
    return (
      <div className="h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col">
        {/* 顶部导航栏 */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-indigo-200 px-4 py-3 flex items-center justify-between shrink-0">
          <h1 className="text-xl font-bold text-gray-800">慢邮件</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={onToBottleFishing}
              className="p-2 hover:bg-blue-100 rounded-full transition-colors"
              title="漂流瓶"
            >
              <Waves size={20} className="text-blue-600" />
            </button>
            <button
              onClick={onToStampCollection}
              className="p-2 hover:bg-amber-100 rounded-full transition-colors"
              title="收集系统"
            >
              <Trophy size={20} className="text-amber-600" />
            </button>
            <button
              onClick={onToNotifications}
              className="p-2 hover:bg-indigo-100 rounded-full transition-colors relative"
              title="消息通知"
            >
              <Bell size={20} className="text-indigo-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
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

        {/* 底部导航栏 */}
        <div className="bg-white/90 backdrop-blur-sm border-t border-gray-200 px-6 py-2 shrink-0 safe-area-bottom">
          <div className="flex items-center justify-around max-w-md mx-auto">
            <button
              onClick={() => handleTabChange('inbox')}
              className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${
                activeTab === 'inbox' 
                  ? 'text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Inbox size={24} />
              <span className="text-xs font-medium">信箱</span>
            </button>
            <button
              onClick={() => handleTabChange('favorites')}
              className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${
                activeTab === 'favorites' 
                  ? 'text-red-500' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Heart size={24} />
              <span className="text-xs font-medium">收藏</span>
            </button>
            <button
              onClick={() => handleTabChange('penpals')}
              className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${
                activeTab === 'penpals' 
                  ? 'text-pink-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users size={24} />
              <span className="text-xs font-medium">笔友</span>
            </button>
            <button
              onClick={() => handleTabChange('trash')}
              className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${
                activeTab === 'trash' 
                  ? 'text-gray-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Trash2 size={24} />
              <span className="text-xs font-medium">回收站</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex flex-col overflow-hidden">
      {/* 顶部导航栏 - 简洁设计 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-orange-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="text-2xl">📮</div>
          <h1 className="text-xl font-bold text-gray-800">慢邮件</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* 视图切换按钮 */}
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'filebox' : 'list')}
            className="p-2 hover:bg-orange-100 rounded-full transition-colors"
            title={viewMode === 'list' ? '切换到文件箱模式' : '切换到列表模式'}
          >
            {viewMode === 'list' ? (
              <LayoutGrid size={20} className="text-orange-600" />
            ) : (
              <List size={20} className="text-orange-600" />
            )}
          </button>
          {/* 漂流瓶 */}
          <button
            onClick={onToBottleFishing}
            className="p-2 hover:bg-blue-100 rounded-full transition-colors"
            title="漂流瓶"
          >
            <Waves size={20} className="text-blue-600" />
          </button>
          {/* 收集系统（邮票+成就） */}
          <button
            onClick={onToStampCollection}
            className="p-2 hover:bg-amber-100 rounded-full transition-colors"
            title="收集系统"
          >
            <Trophy size={20} className="text-amber-600" />
          </button>
          {/* 消息通知 */}
          <button
            onClick={onToNotifications}
            className="p-2 hover:bg-indigo-100 rounded-full transition-colors relative"
            title="消息通知"
          >
            <Bell size={20} className="text-indigo-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {/* 写信按钮 */}
          <button
            onClick={onWriteNew}
            className="p-2 bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 rounded-full transition-all shadow-md"
            title="写信"
          >
            <Send size={20} className="text-white" />
          </button>
        </div>
      </div>

      {/* 视图容器 */}
      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* 文件盒视图 */}
        {viewMode === 'filebox' && (
          <LetterBoxListView
            onBack={() => {/* 已在主页 */}}
            onOpenBox={(box) => {
              setSelectedBox(box);
              setViewMode('smallcards');
            }}
          />
        )}

        {/* 小卡片视图 */}
        {viewMode === 'smallcards' && selectedBox && (
          <LetterSmallCardsView
            letters={selectedBox.letters}
            receiverName={selectedBox.receiverName}
            onBack={() => {
              setViewMode('filebox');
              setSelectedBox(null);
            }}
            onViewDetail={(letter, roundIndex) => {
              setSelectedLetter(letter);
              setSelectedRoundIndex(roundIndex);
              setViewMode('detail');
            }}
            onDelete={(letterId) => {
              // 删除后重新加载信件列表
              loadLetters();
              // 如果该笔友所有信件都被删除，返回文件箱
              const remainingLetters = selectedBox.letters.filter(l => l.id !== letterId);
              if (remainingLetters.length === 0) {
                setViewMode('filebox');
                setSelectedBox(null);
              } else {
                // 更新selectedBox
                setSelectedBox({
                  ...selectedBox,
                  letters: remainingLetters
                });
              }
            }}
            onReply={(letter) => {
              // 打开详情页进行回复
              setSelectedLetter(letter);
              setViewMode('detail');
            }}
          />
        )}

        {/* 原来的列表视图（保留作为备用） */}
        {viewMode === 'list' && (
          <div className="overflow-y-auto px-4 py-4" style={{ flex: 1, minHeight: 0 }}>
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
                onClick={() => {
                  setSelectedLetter(letter);
                  setViewMode('detail');
                }}
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
        )}
      </div>

      {/* 底部导航栏 */}
      <div className="bg-white/90 backdrop-blur-sm border-t border-gray-200 px-6 py-2 shrink-0 safe-area-bottom">
        <div className="flex items-center justify-around max-w-md mx-auto">
          <button
            onClick={() => handleTabChange('inbox')}
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${
              activeTab === 'inbox' 
                ? 'text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Inbox size={24} />
            <span className="text-xs font-medium">信箱</span>
          </button>
          <button
            onClick={() => handleTabChange('favorites')}
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${
              activeTab === 'favorites' 
                ? 'text-red-500' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Heart size={24} />
            <span className="text-xs font-medium">收藏</span>
          </button>
          <button
            onClick={() => handleTabChange('penpals')}
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${
              activeTab === 'penpals' 
                ? 'text-pink-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users size={24} />
            <span className="text-xs font-medium">笔友</span>
          </button>
          <button
            onClick={() => handleTabChange('trash')}
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${
              activeTab === 'trash' 
                ? 'text-gray-700' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Trash2 size={24} />
            <span className="text-xs font-medium">回收站</span>
          </button>
        </div>
      </div>

      {/* 信件详情 - 使用新的卡片视图 */}
      {viewMode === 'detail' && selectedLetter && (
        <div className="fixed inset-0 z-50 bg-white">
          <LetterDetailView
            letter={selectedLetter}
            onBack={() => {
              // 根据之前的模式返回
              if (selectedBox) {
                setViewMode('smallcards');
              } else {
                setViewMode('list');
              }
              setSelectedLetter(null);
              setSelectedRoundIndex(undefined);
              loadLetters(); // 关闭时刷新列表
            }}
            userName={userName}
            initialRoundIndex={selectedRoundIndex}
            onReply={() => {
              // 打开写信页面并传递回复的信件信息
              onWriteNew();
            }}
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
