/**
 * 信件箱列表视图
 * 按笔友分组显示，文件箱风格
 * 参考慢邮件App的文件箱设计
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { Letter } from '../types/letter';
import { getActiveLetters } from '../utils/letterService';

interface LetterBox {
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  letters: Letter[];
  totalRounds: number;
  lastLetterDate: number;
  hasUnread: boolean;
}

interface LetterBoxListViewProps {
  onBack: () => void;
  onOpenBox: (box: LetterBox) => void;
}

export default function LetterBoxListView({ onBack, onOpenBox }: LetterBoxListViewProps) {
  const [boxes, setBoxes] = useState<LetterBox[]>([]);

  useEffect(() => {
    loadBoxes();
  }, []);

  const loadBoxes = () => {
    const letters = getActiveLetters();
    
    // 按接收者分组
    const boxMap = new Map<string, LetterBox>();
    
    letters.forEach(letter => {
      const key = letter.receiverId;
      
      if (!boxMap.has(key)) {
        boxMap.set(key, {
          receiverId: letter.receiverId,
          receiverName: letter.receiverName,
          receiverAvatar: letter.receiverAvatar || '📮',
          letters: [],
          totalRounds: 0,
          lastLetterDate: 0,
          hasUnread: false
        });
      }
      
      const box = boxMap.get(key)!;
      box.letters.push(letter);
      box.totalRounds += letter.currentRound;
      
      // 更新最后信件时间
      const letterDate = letter.conversationRounds?.[letter.conversationRounds.length - 1]?.aiReply?.repliedAt 
        || letter.sentAt;
      if (letterDate > box.lastLetterDate) {
        box.lastLetterDate = letterDate;
      }
      
      // 检查是否有未读
      if (letter.status === 'replied' && !letter.isRead) {
        box.hasUnread = true;
      }
    });
    
    // 转换为数组并按最后信件时间排序
    const boxArray = Array.from(boxMap.values()).sort((a, b) => b.lastLetterDate - a.lastLetterDate);
    setBoxes(boxArray);
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
    
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  // 文件箱颜色方案
  const boxColors = [
    'from-amber-100 to-orange-200',
    'from-blue-100 to-cyan-200',
    'from-green-100 to-emerald-200',
    'from-purple-100 to-pink-200',
    'from-red-100 to-rose-200',
    'from-yellow-100 to-amber-200'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col">
      {/* 顶部栏 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-orange-200 px-4 py-4 flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-800">📦 文件箱</h1>
          <div className="text-xs text-gray-500">按笔友分组的信件</div>
        </div>
      </div>

      {/* 文件箱网格 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto">
          {boxes.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📭</div>
              <div className="text-gray-500">还没有信件往来</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {boxes.map((box, index) => (
                <button
                  key={box.receiverId}
                  onClick={() => onOpenBox(box)}
                  className="group relative"
                >
                  {/* 文件箱主体 */}
                  <div className="relative">
                    {/* 箱子 */}
                    <div className={`
                      bg-gradient-to-br ${boxColors[index % boxColors.length]}
                      rounded-2xl p-4 pb-6 shadow-lg
                      transform transition-all duration-300
                      group-hover:scale-105 group-hover:shadow-xl
                      border-2 border-amber-300
                    `}>
                      {/* 顶部把手 */}
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-gradient-to-b from-amber-400 to-amber-500 rounded-t-xl border-2 border-amber-600" />
                      
                      {/* 头像 */}
                      <div className="flex justify-center mb-2">
                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-3xl shadow-md border-2 border-white">
                          {box.receiverAvatar}
                        </div>
                      </div>
                      
                      {/* 名称 */}
                      <div className="text-center mb-3">
                        <div className="font-bold text-gray-800 truncate text-sm">
                          {box.receiverName}
                        </div>
                      </div>
                      
                      {/* 纸张叠加效果 */}
                      <div className="relative">
                        <div className="absolute -top-1 left-2 right-2 h-1 bg-white/60 rounded-sm" />
                        <div className="absolute -top-2 left-4 right-4 h-1 bg-white/40 rounded-sm" />
                        <div className="absolute -top-3 left-6 right-6 h-1 bg-white/20 rounded-sm" />
                      </div>
                      
                      {/* 信息 */}
                      <div className="mt-4 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-700 flex items-center gap-1">
                            <Mail size={12} />
                            {box.letters.length}封信
                          </span>
                          <span className="text-gray-700">
                            {box.totalRounds}轮
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 text-center">
                          {formatTime(box.lastLetterDate)}
                        </div>
                      </div>
                      
                      {/* 未读标记 */}
                      {box.hasUnread && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg animate-pulse">
                          !
                        </div>
                      )}
                    </div>
                    
                    {/* 箱子底部阴影 */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-2 bg-gradient-to-b from-transparent to-black/10 rounded-b-lg blur-sm" />
                  </div>
                  
                  {/* 标签 */}
                  <div className="mt-2 text-center">
                    <div className="inline-block bg-white px-3 py-1 rounded-full text-xs text-gray-700 shadow-sm border border-gray-200">
                      {box.receiverName}的箱子
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
