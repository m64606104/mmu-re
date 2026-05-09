/**
 * 回收站页面
 * 显示所有已归档的信件
 */

import React, { useState, useEffect } from 'react';
import { Letter } from '../types/letter';
import { getArchivedLetters, unarchiveLetter, deleteLetter } from '../utils/letterService';
import { ArrowLeft, Trash2, RotateCcw, AlertCircle } from 'lucide-react';

interface ArchivedLettersScreenProps {
  onBack: () => void;
}

const ArchivedLettersScreen: React.FC<ArchivedLettersScreenProps> = ({
  onBack
}) => {
  const [archivedLetters, setArchivedLetters] = useState<Letter[]>([]);

  useEffect(() => {
    loadArchivedLetters();
  }, []);

  const loadArchivedLetters = () => {
    const letters = getArchivedLetters();
    setArchivedLetters(letters);
  };

  const handleRestore = (letterId: string) => {
    if (confirm('确定要恢复这封信件吗？')) {
      const success = unarchiveLetter(letterId);
      if (success) {
        alert('✅ 已恢复信件');
        loadArchivedLetters();
      }
    }
  };

  const handleDelete = (letterId: string, receiverName: string) => {
    if (confirm(`确定要永久删除与 ${receiverName} 的信件吗？\n\n⚠️ 此操作不可恢复！`)) {
      const success = deleteLetter(letterId);
      if (success) {
        alert('🗑️ 已永久删除');
        loadArchivedLetters();
      }
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 z-50 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">回收站</h1>
        <div className="w-10" /> {/* 占位 */}
      </div>

      {/* 提示信息 */}
      <div className="p-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <div className="font-medium mb-1">回收站说明</div>
            <div className="text-xs text-amber-700">
              归档的信件会保存在这里，可以随时恢复或永久删除
            </div>
          </div>
        </div>
      </div>

      {/* 信件列表 */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {archivedLetters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Trash2 size={64} className="mb-4 opacity-30" />
            <div className="text-lg mb-2">回收站是空的</div>
            <div className="text-sm">归档的信件会显示在这里</div>
          </div>
        ) : (
          <div className="space-y-3">
            {archivedLetters.map((letter) => (
              <div
                key={letter.id}
                className="bg-white rounded-2xl shadow-md p-4 border-2 border-gray-200"
              >
                <div className="flex items-start gap-4">
                  {/* 头像 */}
                  <div className="text-3xl flex-shrink-0 opacity-50">
                    {letter.receiverAvatar}
                  </div>

                  {/* 信息区 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-600">
                        {letter.receiverName}
                      </span>
                      {letter.isFriendAdded && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                          笔友
                        </span>
                      )}
                      {letter.isBottle && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                          漂流瓶
                        </span>
                      )}
                    </div>

                    {/* 信件预览 */}
                    <div className="text-sm text-gray-500 mb-2 line-clamp-2">
                      {letter.content}
                    </div>

                    {/* 时间信息 */}
                    <div className="text-xs text-gray-400 mb-3">
                      寄出: {formatTime(letter.sentAt)} · 
                      归档: {formatTime(letter.archivedAt || letter.sentAt)} ·
                      {letter.currentRound} 轮对话
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRestore(letter.id)}
                        className="flex-1 px-3 py-2 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl text-sm font-medium text-green-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <RotateCcw size={16} />
                        恢复
                      </button>
                      <button
                        onClick={() => handleDelete(letter.id, letter.receiverName)}
                        className="flex-1 px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-sm font-medium text-red-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <Trash2 size={16} />
                        永久删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部统计 */}
      {archivedLetters.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm border-t border-gray-200 px-6 py-3 text-center text-xs text-gray-500">
          共 {archivedLetters.length} 封归档信件
        </div>
      )}
    </div>
  );
};

export default ArchivedLettersScreen;
