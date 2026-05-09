/**
 * 成就查看页面
 * 显示所有成就及解锁进度
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Lock, Award, Star } from 'lucide-react';
import { getAllAchievements, getAchievementStats, getAchievementsByCategory, Achievement } from '../utils/achievementSystem';

interface AchievementScreenProps {
  onBack: () => void;
}

const AchievementScreen: React.FC<AchievementScreenProps> = ({ onBack }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    unlocked: number;
    progress: number;
    recentUnlocked: Achievement[];
  }>({ total: 0, unlocked: 0, progress: 0, recentUnlocked: [] });
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'letter' | 'penpal' | 'communication' | 'special'>('all');

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = () => {
    const allAchievements = getAllAchievements();
    const achievementStats = getAchievementStats();
    setAchievements(allAchievements);
    setStats(achievementStats);
  };

  const getCategoryAchievements = () => {
    if (selectedCategory === 'all') {
      return achievements;
    }
    const byCategory = getAchievementsByCategory();
    return byCategory[selectedCategory] || [];
  };

  const categoryIcons = {
    all: '🏆',
    letter: '✉️',
    penpal: '👥',
    communication: '💬',
    special: '⭐'
  };

  const categoryNames = {
    all: '全部',
    letter: '信件',
    penpal: '笔友',
    communication: '交流',
    special: '特殊'
  };

  const filteredAchievements = getCategoryAchievements();

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 z-50 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-purple-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 hover:bg-purple-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">成就中心</h1>
        <div className="w-10" />
      </div>

      {/* 统计卡片 */}
      <div className="p-4">
        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                <Trophy size={32} className="text-yellow-500" />
              </div>
              <div className="text-white">
                <h2 className="text-2xl font-bold">{stats.unlocked} / {stats.total}</h2>
                <p className="text-sm opacity-90">已解锁成就</p>
              </div>
            </div>
            <div className="text-right text-white">
              <div className="text-4xl font-bold">{stats.progress}%</div>
              <p className="text-sm opacity-90">完成度</p>
            </div>
          </div>
          
          {/* 进度条 */}
          <div className="w-full h-3 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${stats.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* 分类标签 */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(Object.keys(categoryNames) as Array<keyof typeof categoryNames>).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="mr-1">{categoryIcons[cat]}</span>
              {categoryNames[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* 成就列表 */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-3">
          {filteredAchievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`relative overflow-hidden rounded-2xl p-4 transition-all ${
                achievement.unlocked
                  ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-400 shadow-md'
                  : 'bg-white border-2 border-gray-200'
              }`}
            >
              {/* 解锁光晕效果 */}
              {achievement.unlocked && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-300 to-orange-300 rounded-full blur-3xl opacity-20" />
              )}

              <div className="relative flex items-start gap-4">
                {/* 图标 */}
                <div className={`flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center text-3xl ${
                  achievement.unlocked
                    ? 'bg-gradient-to-br from-yellow-300 to-orange-300 shadow-lg'
                    : 'bg-gray-100'
                }`}>
                  {achievement.unlocked ? achievement.icon : <Lock size={24} className="text-gray-400" />}
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className={`font-bold ${achievement.unlocked ? 'text-gray-800' : 'text-gray-400'}`}>
                      {achievement.title}
                    </h3>
                    {achievement.unlocked && (
                      <div className="flex-shrink-0 ml-2">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <Trophy size={16} className="text-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  <p className={`text-sm mb-3 ${achievement.unlocked ? 'text-gray-600' : 'text-gray-400'}`}>
                    {achievement.description}
                  </p>

                  {/* 进度条 */}
                  {!achievement.unlocked && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>进度: {achievement.currentProgress} / {achievement.requirement}</span>
                        <span>{Math.round((achievement.currentProgress / achievement.requirement) * 100)}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all"
                          style={{ width: `${Math.min((achievement.currentProgress / achievement.requirement) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 奖励 */}
                  {achievement.reward && (
                    <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
                      achievement.unlocked
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      <Award size={14} />
                      <span>{achievement.reward.value}</span>
                    </div>
                  )}

                  {/* 解锁时间 */}
                  {achievement.unlocked && achievement.unlockedAt && (
                    <div className="mt-2 text-xs text-gray-500">
                      解锁于 {new Date(achievement.unlockedAt).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 空状态 */}
        {filteredAchievements.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Star size={64} className="mb-4 opacity-50" />
            <p>该分类暂无成就</p>
          </div>
        )}
      </div>

      {/* 最近解锁 */}
      {stats.recentUnlocked.length > 0 && selectedCategory === 'all' && (
        <div className="px-4 py-3 bg-white border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">🎉 最近解锁</h3>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {stats.recentUnlocked.map((achievement: Achievement) => (
              <div
                key={achievement.id}
                className="flex-shrink-0 w-20 text-center"
              >
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-yellow-300 to-orange-300 rounded-xl flex items-center justify-center text-2xl shadow-md mb-1">
                  {achievement.icon}
                </div>
                <p className="text-xs text-gray-600 truncate px-1">
                  {achievement.title.replace(/^[^\s]+\s/, '')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSS */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default AchievementScreen;
