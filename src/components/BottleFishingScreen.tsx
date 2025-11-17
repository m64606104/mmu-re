/**
 * 漂流瓶打捞界面
 * 每天可打捞2次，可投回海里
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { BottleLetter } from '../types/bottle';
import {
  canFishToday,
  fishBottle,
  throwBackBottle,
  getBottleStats,
  replyToBottle
} from '../utils/bottleFishingSystem';
import { sendLetter } from '../utils/letterService';

interface BottleFishingScreenProps {
  onBack: () => void;
  userName: string;
}

export default function BottleFishingScreen({ onBack, userName }: BottleFishingScreenProps) {
  const [currentBottle, setCurrentBottle] = useState<BottleLetter | null>(null);
  const [isFishing, setIsFishing] = useState(false);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [stats, setStats] = useState(getBottleStats());
  
  useEffect(() => {
    refreshData();
  }, []);
  
  const refreshData = () => {
    setStats(getBottleStats());
  };

  // 打捞漂流瓶动画
  const handleFish = () => {
    const check = canFishToday();
    if (!check.can) {
      alert(check.reason);
      return;
    }

    setIsFishing(true);
    
    // 模拟打捞动画（2秒）
    setTimeout(() => {
      const result = fishBottle();
      if (result.success && result.bottle) {
        setCurrentBottle(result.bottle);
        setIsFishing(false);
        refreshData();
      } else {
        alert(result.error || '打捞失败');
        setIsFishing(false);
      }
    }, 2000);
  };

  // 投回海里
  const handleThrowBack = () => {
    if (!currentBottle) return;
    
    if (confirm('确定要把这个瓶子投回海里吗？\n\n投回后将无法再次看到这封信。')) {
      throwBackBottle();
      setCurrentBottle(null);
      setShowReplyBox(false);
      refreshData();
      
      // 提示还能打捞几次
      const check = canFishToday();
      if (check.remaining > 0) {
        alert(`已投回海里\n\n今天还可以打捞 ${check.remaining} 次`);
      } else {
        alert('已投回海里\n\n今天的打捞次数已用完，明天再来吧！');
      }
    }
  };

  // 回复漂流瓶
  const handleReply = () => {
    if (!currentBottle) return;
    if (!replyContent.trim()) {
      alert('请输入回信内容');
      return;
    }

    try {
      // 发送信件
      sendLetter(
        replyContent,
        currentBottle.senderId,
        currentBottle.senderName,
        currentBottle.senderAvatar,
        true, // 是漂流瓶
        userName,
        false // 不匿名
      );
      
      // 记录统计
      replyToBottle();
      
      alert(`✅ 回信已寄出！\n\n你的信已经装进瓶子里，飘向了 ${currentBottle.senderName}`);
      
      setCurrentBottle(null);
      setShowReplyBox(false);
      setReplyContent('');
      refreshData();
    } catch (error) {
      alert('回信失败，请重试');
      console.error(error);
    }
  };

  // 获取心情图标
  const getMoodEmoji = (mood: string) => {
    const moodMap: Record<string, string> = {
      happy: '😊',
      sad: '😔',
      thoughtful: '🤔',
      excited: '🤩',
      lonely: '😢',
      grateful: '🙏'
    };
    return moodMap[mood] || '💭';
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return `${Math.floor(days / 7)}周前`;
  };

  const check = canFishToday();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex flex-col">
      {/* 顶部栏 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-blue-200 px-4 py-4 flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-800">🌊 漂流瓶</h1>
          <div className="text-xs text-gray-500">
            {check.remaining > 0 ? `今天还可以打捞 ${check.remaining} 次` : '明天再来吧'}
          </div>
        </div>
        <div className="text-right text-xs text-gray-600">
          <div>已打捞 {stats.totalFished}</div>
          <div>已回复 {stats.totalReplied}</div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-y-auto p-4 pb-8">
        <div className="max-w-2xl mx-auto pb-8">
          {/* 海洋背景区域 */}
          <div className={`relative bg-gradient-to-b from-blue-400 to-blue-600 rounded-3xl p-8 mb-4 overflow-hidden flex items-center justify-center ${showReplyBox ? 'min-h-[300px]' : 'min-h-[400px]'}`}>
            {/* 波浪装饰 */}
            <div className="absolute bottom-0 left-0 right-0">
              <svg viewBox="0 0 1440 320" className="w-full">
                <path 
                  fill="rgba(255,255,255,0.1)" 
                  d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,112C672,96,768,96,864,112C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
                />
              </svg>
            </div>

            {/* 没有瓶子时显示打捞按钮 */}
            {!currentBottle && !isFishing && (
              <div className="relative z-10 text-center">
                <div className="text-6xl mb-4 animate-bounce">🍾</div>
                <button
                  onClick={handleFish}
                  disabled={!check.can}
                  className={`
                    px-8 py-4 rounded-full font-bold text-lg shadow-lg transition-all
                    ${check.can 
                      ? 'bg-white text-blue-600 hover:bg-blue-50 hover:scale-105 cursor-pointer' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }
                  `}
                >
                  {check.can ? '🎣 打捞漂流瓶' : '🌙 明天再来'}
                </button>
                <div className="mt-4 text-white text-sm">
                  {check.can ? `还可以打捞 ${check.remaining} 次` : '今天的打捞次数已用完'}
                </div>
              </div>
            )}

            {/* 打捞中动画 */}
            {isFishing && (
              <div className="relative z-10 text-center">
                <div className="text-6xl mb-4 animate-spin">🌀</div>
                <div className="text-white text-lg font-medium">正在打捞中...</div>
                <div className="text-white text-sm mt-2 opacity-75">期待会遇见谁的故事</div>
              </div>
            )}

            {/* 显示打捞到的瓶子 */}
            {currentBottle && !showReplyBox && (
              <div className="relative z-10 w-full max-w-md animate-fadeIn">
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden transform hover:scale-105 transition-transform">
                  {/* 瓶子头部 */}
                  <div className="bg-gradient-to-r from-amber-100 to-orange-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-2xl">
                        {currentBottle.senderAvatar}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-800">{currentBottle.senderName}</div>
                        <div className="text-xs text-gray-600 flex items-center gap-2">
                          {currentBottle.senderAge && <span>{currentBottle.senderAge}岁</span>}
                          {currentBottle.senderLocation && <span>📍 {currentBottle.senderLocation}</span>}
                        </div>
                      </div>
                      <div className="text-2xl">
                        {getMoodEmoji(currentBottle.mood)}
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <span className="text-xs bg-white px-3 py-1 rounded-full text-gray-700">
                        #{currentBottle.topic}
                      </span>
                      <span className="text-xs bg-white px-3 py-1 rounded-full text-gray-500">
                        {formatTime(currentBottle.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* 信件内容 */}
                  <div className="p-6">
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
                      {currentBottle.content}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="px-6 pb-6 flex gap-3">
                    <button
                      onClick={handleThrowBack}
                      className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      🌊 投回海里
                    </button>
                    <button
                      onClick={() => setShowReplyBox(true)}
                      className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Send size={18} />
                      回信
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 回信时显示原文 */}
          {showReplyBox && currentBottle && (
            <div className="mb-4 bg-white rounded-3xl shadow-lg overflow-hidden">
              {/* 原文区域 */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">📖 原文内容</span>
                  <span className="text-xs text-gray-500">({currentBottle.senderName})</span>
                </div>
              </div>
              <div className="p-5 max-h-48 overflow-y-auto">
                <div 
                  className="text-gray-800 leading-relaxed whitespace-pre-wrap font-serif text-sm"
                  style={{
                    lineHeight: '1.8',
                    fontFamily: '"Noto Serif SC", "STSong", serif'
                  }}
                >
                  {currentBottle.content}
                </div>
              </div>
            </div>
          )}

          {/* 回信输入框 */}
          {showReplyBox && currentBottle && (
            <div className="bg-white rounded-3xl shadow-lg p-6">
              <div className="mb-4">
                <div className="font-bold text-gray-800 mb-2">回信给 {currentBottle.senderName}</div>
                <div className="text-sm text-gray-600">
                  写下你的心里话，让它随着瓶子漂向远方...
                </div>
              </div>
              
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="在这里写下你的回信..."
                className="w-full h-64 p-4 border-2 border-gray-200 rounded-2xl resize-none focus:border-blue-400 focus:outline-none font-serif"
                style={{
                  backgroundImage: `repeating-linear-gradient(
                    transparent,
                    transparent 31px,
                    rgba(229, 231, 235, 0.5) 31px,
                    rgba(229, 231, 235, 0.5) 32px
                  )`,
                  lineHeight: '32px',
                  fontFamily: '"Noto Serif SC", "STSong", serif'
                }}
              />
              
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => {
                    setShowReplyBox(false);
                    setReplyContent('');
                  }}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleReply}
                  disabled={!replyContent.trim()}
                  className={`
                    flex-1 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2
                    ${replyContent.trim()
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  <Send size={18} />
                  寄出回信
                </button>
              </div>
            </div>
          )}

          {/* 说明卡片 */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 mt-4">
            <div className="text-sm text-gray-700 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-blue-500">💡</span>
                <span>每天可以打捞 2 次漂流瓶</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500">🌊</span>
                <span>如果对信件不感兴趣，可以投回海里</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500">✉️</span>
                <span>回信后，对方可能会再次回复你</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500">⏰</span>
                <span>每天午夜重置打捞次数</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
