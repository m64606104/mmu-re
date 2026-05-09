/**
 * 🎯 新版理解力显示组件
 * 
 * 展示多维度理解力成长系统的完整信息：
 * - 五项理解力能力详细进度
 * - 每日学习概览和剩余额度
 * - 智能学习建议
 * - 词卡教学状态
 * - 系统推荐活动
 */

import React, { useState, useEffect } from 'react';
import { getComprehensiveChildStatus, checkWordTeachingStatus, type ComprehensiveChildStatus } from '../utils/comprehensionSystemManager';

interface NewComprehensionDisplayProps {
  childId: string;
  isVisible: boolean;
  onClose: () => void;
}

interface WordTeachingStatus {
  canStart: boolean;
  currentRound: number;
  totalRounds: number;
  wordsLearned: number;
  maxWords: number;
  canGainExp: boolean;
  message: string;
}

export const NewComprehensionDisplay: React.FC<NewComprehensionDisplayProps> = ({
  childId,
  isVisible,
  onClose
}) => {
  const [status, setStatus] = useState<ComprehensiveChildStatus | null>(null);
  const [wordTeachingStatus, setWordTeachingStatus] = useState<WordTeachingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载数据
  useEffect(() => {
    if (isVisible && childId) {
      loadComprehensionData();
    }
  }, [isVisible, childId]);

  const loadComprehensionData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 并行加载数据
      const [childStatus, teachingStatus] = await Promise.all([
        getComprehensiveChildStatus(childId),
        checkWordTeachingStatus(childId)
      ]);

      setStatus(childStatus);
      setWordTeachingStatus(teachingStatus);
    } catch (err) {
      setError(`加载数据失败: ${err}`);
      console.error('加载理解力数据失败：', err);
    } finally {
      setLoading(false);
    }
  };

  // 获取能力颜色
  const getAbilityColor = (ability: string): string => {
    const colors = {
      literal: 'from-blue-400 to-blue-600',
      context: 'from-green-400 to-green-600', 
      abstract: 'from-purple-400 to-purple-600',
      emotion: 'from-pink-400 to-pink-600',
      logic: 'from-yellow-400 to-yellow-600'
    };
    return colors[ability as keyof typeof colors] || 'from-gray-400 to-gray-600';
  };

  // 获取能力图标
  const getAbilityIcon = (ability: string): string => {
    const icons = {
      literal: '📝',
      context: '🔍',
      abstract: '🧠', 
      emotion: '❤️',
      logic: '🎯'
    };
    return icons[ability as keyof typeof icons] || '📊';
  };

  // 获取能力名称
  const getAbilityName = (ability: string): string => {
    const names = {
      literal: '字面理解',
      context: '上下文理解',
      abstract: '抽象理解',
      emotion: '情感理解', 
      logic: '逻辑推理'
    };
    return names[ability as keyof typeof names] || ability;
  };

  // 获取活动名称
  const getActivityName = (activity: string): string => {
    const names = {
      wordTeaching: '词卡教学',
      freeChat: '自由聊天',
      topicDiscussion: '话题讨论',
      storyReading: '故事阅读'
    };
    return names[activity as keyof typeof names] || activity;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">🎯 AI理解力成长系统</h2>
              <p className="text-indigo-100 mt-1">多维度智能学习进度</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-indigo-200 text-2xl font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
            <p className="text-gray-600 mt-4">正在加载理解力数据...</p>
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="p-8 text-center">
            <p className="text-red-500 text-lg">😅 {error}</p>
            <button 
              onClick={loadComprehensionData}
              className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
            >
              重新加载
            </button>
          </div>
        )}

        {/* 主要内容 */}
        {!loading && !error && status && (
          <div className="p-6 space-y-6">
            
            {/* 基础信息卡片 */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 基础信息</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-indigo-600">Lv.{status.comprehension.overall.level}</div>
                  <div className="text-sm text-gray-600">总体理解力</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{status.vocabularyCount}</div>
                  <div className="text-sm text-gray-600">词汇量</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{status.stage}</div>
                  <div className="text-sm text-gray-600">成长阶段</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{status.totalWordsLearned}</div>
                  <div className="text-sm text-gray-600">累计学词</div>
                </div>
              </div>
            </div>

            {/* 理解力能力详情 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">🧠 理解力能力</h3>
              <div className="space-y-4">
                {Object.entries(status.comprehension.abilities).map(([ability, data]) => (
                  <div key={ability} className="bg-white rounded-xl shadow-sm border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getAbilityIcon(ability)}</span>
                        <div>
                          <h4 className="font-semibold text-gray-800">{getAbilityName(ability)}</h4>
                          <p className="text-sm text-gray-600">{data.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-800">Lv.{data.level}</div>
                        <div className="text-sm text-gray-600">{data.progress}%</div>
                      </div>
                    </div>
                    
                    {/* 进度条 */}
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full bg-gradient-to-r ${getAbilityColor(ability)} transition-all duration-500`}
                        style={{ width: `${data.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 今日学习概览 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">📅 今日学习概览</h3>
              
              {/* 词卡教学状态 */}
              {wordTeachingStatus && (
                <div className="bg-yellow-50 rounded-xl p-4 mb-4 border-l-4 border-yellow-400">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-800">📝 词卡教学状态</h4>
                      <p className="text-gray-600 mt-1">{wordTeachingStatus.message}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        轮次：{wordTeachingStatus.currentRound}/{wordTeachingStatus.totalRounds}
                      </div>
                      <div className="text-sm text-gray-600">
                        学词：{wordTeachingStatus.wordsLearned}/{wordTeachingStatus.maxWords}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 经验状态网格 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(status.todayOverview.experienceStatus).map(([activity, expStatus]) => (
                  <div key={activity} className="bg-white rounded-xl shadow-sm border p-4 text-center">
                    <h5 className="font-medium text-gray-800 mb-2">{getActivityName(activity)}</h5>
                    <div className="text-2xl font-bold text-indigo-600 mb-1">{expStatus.gained}</div>
                    <div className="text-sm text-gray-600 mb-2">/ {expStatus.limit}</div>
                    
                    {/* 迷你进度条 */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                        style={{ width: `${expStatus.percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{expStatus.percentage}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 智能建议 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">💡 智能学习建议</h3>
              
              {status.recommendations.suggestedActivities.length > 0 && (
                <div className="bg-green-50 rounded-xl p-4 mb-4">
                  <h4 className="font-medium text-green-800 mb-2">🎯 推荐活动</h4>
                  <div className="flex flex-wrap gap-2">
                    {status.recommendations.suggestedActivities.map((activity, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm"
                      >
                        {activity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {status.todayOverview.suggestions.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <h4 className="font-medium text-blue-800 mb-3">📚 学习提示</h4>
                  <ul className="space-y-2">
                    {status.todayOverview.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-blue-700 flex items-start">
                        <span className="mr-2">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {status.recommendations.learningTips.length > 0 && (
                <div className="bg-purple-50 rounded-xl p-4 mt-4">
                  <h4 className="font-medium text-purple-800 mb-3">🔍 深度建议</h4>
                  <ul className="space-y-2">
                    {status.recommendations.learningTips.map((tip, index) => (
                      <li key={index} className="text-purple-700 flex items-start">
                        <span className="mr-2">✨</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 词汇统计 */}
            <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">📈 词汇学习统计</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold text-pink-600">{status.vocabularyStats.totalWords}</div>
                  <div className="text-sm text-gray-600">总词汇量</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-rose-600">{status.vocabularyStats.todayWords}</div>
                  <div className="text-sm text-gray-600">今日新学</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-red-600">{status.vocabularyStats.averageFamiliarity}%</div>
                  <div className="text-sm text-gray-600">平均熟悉度</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewComprehensionDisplay;
