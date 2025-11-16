/**
 * 信箱列表页面
 * 显示所有寄出的信件
 */

import React, { useState, useEffect } from 'react';
import { Letter } from '../types/letter';
import { getAllLetters } from '../utils/letterService';
import { ArrowLeft, Mail, Send, Clock, Check } from 'lucide-react';
import LetterDetailModal from './LetterDetailModal';

interface LetterBoxScreenProps {
  onBack: () => void;
  onWriteNew: () => void;
  userName: string;
}

const LetterBoxScreen: React.FC<LetterBoxScreenProps> = ({
  onBack,
  onWriteNew,
  userName
}) => {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);

  useEffect(() => {
    loadLetters();
    // 每10秒刷新一次，检查是否有新回信
    const interval = setInterval(loadLetters, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadLetters = () => {
    const allLetters = getAllLetters();
    setLetters(allLetters);
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
        <button
          onClick={onWriteNew}
          className="p-2 hover:bg-orange-100 rounded-full transition-colors"
        >
          <Send size={24} className="text-orange-600" />
        </button>
      </div>

      {/* 信件列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {letters.map((letter) => (
            <button
              key={letter.id}
              onClick={() => setSelectedLetter(letter)}
              className="w-full bg-white rounded-2xl shadow-md hover:shadow-xl transition-all p-4 text-left relative overflow-hidden group"
            >
              {/* 已回复标记 */}
              {letter.status === 'replied' && (
                <div className="absolute top-2 left-2">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <Check size={18} className="text-white" />
                  </div>
                </div>
              )}

              {/* 邮票 */}
              <div className="absolute top-4 right-4 w-12 h-16 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100 group-hover:scale-110 transition-transform">
                <span className="text-2xl">{getStampEmoji(letter.stampStyle)}</span>
              </div>

              <div className="pr-16">
                {/* 收信人 */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{letter.receiverAvatar}</span>
                  <span className="font-medium text-gray-800">{letter.receiverName}</span>
                  {letter.isBottle && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                      漂流瓶
                    </span>
                  )}
                </div>

                {/* 内容预览 */}
                <div className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {letter.content}
                </div>

                {/* 底部信息 */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-4">
                    <span>{formatTime(letter.sentAt)}</span>
                    {letter.status === 'replied' ? (
                      <span className="text-green-600 font-medium flex items-center gap-1">
                        <Mail size={14} />
                        已回复
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1">
                        <Clock size={14} />
                        等待回信
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 信件详情模态框 */}
      {selectedLetter && (
        <LetterDetailModal
          letter={selectedLetter}
          onClose={() => {
            setSelectedLetter(null);
            loadLetters(); // 关闭时刷新列表
          }}
          onUrge={() => {
            loadLetters(); // 催促后刷新
          }}
          userName={userName}
        />
      )}
    </div>
  );
};

export default LetterBoxScreen;
