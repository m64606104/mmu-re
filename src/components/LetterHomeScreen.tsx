/**
 * 慢邮件主页
 * 参考慢邮件App的问候界面
 */

import { useState, useEffect } from 'react';
import { Mail, Sun, Moon, Cloud } from 'lucide-react';

interface LetterHomeScreenProps {
  userName: string;
  unreadCount: number;
  onNavigateToInbox: () => void;
}

export default function LetterHomeScreen({ userName, unreadCount, onNavigateToInbox }: LetterHomeScreenProps) {
  const [greeting, setGreeting] = useState('');
  const [timeIcon, setTimeIcon] = useState<'sun' | 'moon' | 'cloud'>('sun');

  useEffect(() => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      setGreeting('早上好');
      setTimeIcon('sun');
    } else if (hour >= 12 && hour < 18) {
      setGreeting('下午好');
      setTimeIcon('cloud');
    } else if (hour >= 18 && hour < 22) {
      setGreeting('晚上好');
      setTimeIcon('moon');
    } else {
      setGreeting('夜深了');
      setTimeIcon('moon');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 pb-20">
      {/* 顶部时间 */}
      <div className="px-6 pt-12 pb-6">
        <div className="text-sm text-gray-500 mb-1">
          {new Date().toLocaleDateString('zh-CN', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* 问候卡片 */}
      <div className="px-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          {greeting}，{userName}
        </h1>

        {/* 主卡片 */}
        <div 
          onClick={onNavigateToInbox}
          className="bg-gradient-to-r from-blue-400 to-cyan-400 rounded-3xl p-6 shadow-xl cursor-pointer hover:shadow-2xl transition-all relative overflow-hidden"
        >
          {/* 装饰元素 */}
          <div className="absolute top-4 left-4 w-20 h-20 opacity-20">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <path 
                d="M20,30 Q30,10 50,20 T80,30 L80,60 Q80,80 50,70 T20,60 Z" 
                fill="white"
                stroke="white"
                strokeWidth="2"
              />
            </svg>
          </div>
          
          {/* 时间图标 */}
          <div className="absolute top-6 right-6">
            {timeIcon === 'sun' && <Sun size={48} className="text-yellow-300" />}
            {timeIcon === 'moon' && <Moon size={48} className="text-blue-200" />}
            {timeIcon === 'cloud' && <Cloud size={48} className="text-white" />}
          </div>

          {/* 纸飞机动画 */}
          <div className="absolute top-8 right-24 animate-bounce">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          </div>

          {/* 文字内容 */}
          <div className="relative z-10 text-white">
            <p className="text-lg font-medium leading-relaxed">
              {unreadCount > 0 
                ? `你有 ${unreadCount} 封未读的回信，点击查看吧！`
                : '似乎今天还没有收到信呢，不如再写一封回信？'
              }
            </p>
          </div>
        </div>
      </div>

      {/* 最近收到的信件预览 */}
      <div className="px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">📅 最近的信件</h2>
          <button 
            onClick={onNavigateToInbox}
            className="text-sm text-orange-500 font-medium"
          >
            查看全部 →
          </button>
        </div>

        {/* 信件卡片 - 这里可以显示最近的2-3封信 */}
        <div className="bg-white rounded-2xl p-4 shadow-md mb-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-2xl flex-shrink-0">
              ✉️
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-gray-800">来自远方的信</span>
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                  待阅读
                </span>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">
                点击进入信箱查看你的信件...
              </p>
              <div className="text-xs text-gray-400 mt-2">
                {new Date().toLocaleDateString('zh-CN')}
              </div>
            </div>
          </div>
        </div>

        {/* 引导卡片 */}
        <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl p-4 border-2 border-amber-200">
          <div className="flex items-center gap-3">
            <Mail size={24} className="text-orange-500" />
            <div className="flex-1">
              <div className="font-medium text-gray-800 mb-1">💡 温馨提示</div>
              <div className="text-sm text-gray-600">
                信件通常需要1-5天才能收到回复哦
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
