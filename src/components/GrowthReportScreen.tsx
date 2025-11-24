/**
 * 📊 成长报告组件
 * 展示AI儿童的成长数据和里程碑
 */

import { useState } from 'react';
import { ArrowLeft, TrendingUp, BookOpen, MessageCircle, Award, Calendar, Target, Zap } from 'lucide-react';
import { Conversation } from '../types';

interface GrowthReportScreenProps {
  child: Conversation;
  onBack: () => void;
}

export default function GrowthReportScreen({ child, onBack }: GrowthReportScreenProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'progress'>('overview');

  if (!child.aiChildData) return null;

  const childData = child.aiChildData;

  // 计算成长速度
  const learningSpeed = childData.age > 0 
    ? Math.floor(childData.vocabulary.length / childData.age) 
    : 0;

  // 获取阶段描述
  const getStageInfo = () => {
    const stages: Record<string, { name: string; icon: string; description: string; nextGoal: string }> = {
      baby: {
        name: '婴儿期',
        icon: '👶',
        description: '正在学习最基础的词汇',
        nextGoal: '再学习 ' + Math.max(0, 50 - childData.vocabulary.length) + ' 个词进入幼儿期'
      },
      toddler: {
        name: '幼儿期',
        icon: '👧',
        description: '能说简单的句子了',
        nextGoal: '再学习 ' + Math.max(0, 200 - childData.vocabulary.length) + ' 个词进入儿童期'
      },
      child: {
        name: '儿童期',
        icon: '👦',
        description: '能进行较为复杂的对话',
        nextGoal: '再学习 ' + Math.max(0, 1000 - childData.vocabulary.length) + ' 个词进入少年期'
      },
      teen: {
        name: '少年期',
        icon: '👨',
        description: '已经可以深度交流了',
        nextGoal: '继续学习，成长无止境'
      }
    };
    return stages[childData.stage] || stages.baby;
  };

  const stageInfo = getStageInfo();

  // 获取成就列表
  const getAchievements = () => {
    const achievements = [];
    
    if (childData.vocabulary.length >= 10) {
      achievements.push({ icon: '🎯', title: '初学乍练', desc: '学会了10个词' });
    }
    if (childData.vocabulary.length >= 50) {
      achievements.push({ icon: '📚', title: '好学宝宝', desc: '学会了50个词' });
    }
    if (childData.vocabulary.length >= 100) {
      achievements.push({ icon: '🌟', title: '小博士', desc: '学会了100个词' });
    }
    if (childData.vocabulary.length >= 500) {
      achievements.push({ icon: '🏆', title: '知识达人', desc: '学会了500个词' });
    }
    if (childData.booksRead.length >= 5) {
      achievements.push({ icon: '📖', title: '爱读书', desc: '读完了5本书' });
    }
    if (childData.booksRead.length >= 20) {
      achievements.push({ icon: '📗', title: '书虫', desc: '读完了20本书' });
    }
    if (childData.consecutiveDays >= 7) {
      achievements.push({ icon: '🔥', title: '持之以恒', desc: '连续学习7天' });
    }
    if (childData.consecutiveDays >= 30) {
      achievements.push({ icon: '💪', title: '学习达人', desc: '连续学习30天' });
    }
    
    return achievements;
  };

  const achievements = getAchievements();

  return (
    <div className="h-full bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-800">{child.name}的成长报告</h2>
            <p className="text-xs text-gray-500">成长{childData.age}天 · {stageInfo.name}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            总览
          </button>
          <button
            onClick={() => setActiveTab('milestones')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'milestones'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            成就
          </button>
          <button
            onClick={() => setActiveTab('progress')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'progress'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            进度
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Stage Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="text-center mb-4">
                <div className="text-6xl mb-3">{stageInfo.icon}</div>
                <h3 className="text-xl font-bold text-gray-800">{stageInfo.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{stageInfo.description}</p>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Target className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">下一阶段目标：</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{stageInfo.nextGoal}</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-gray-600">识字量</span>
                </div>
                <div className="text-2xl font-bold text-gray-800">{childData.vocabulary.length}</div>
                <div className="text-xs text-gray-500 mt-1">平均每天学{learningSpeed}个</div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  <span className="text-sm text-gray-600">等级</span>
                </div>
                <div className="text-2xl font-bold text-gray-800">Lv.{childData.level}</div>
                <div className="text-xs text-gray-500 mt-1">{childData.exp}/{childData.expToNextLevel} EXP</div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-5 h-5 text-orange-500" />
                  <span className="text-sm text-gray-600">理解力</span>
                </div>
                <div className="text-2xl font-bold text-gray-800">Lv.{childData.comprehension.level}</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${childData.comprehension.progress}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">{childData.comprehension.progress}% 到下一级</div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600">连续学习</span>
                </div>
                <div className="text-2xl font-bold text-gray-800">{childData.consecutiveDays}天</div>
                <div className="text-xs text-gray-500 mt-1">共学习{childData.age}天</div>
              </div>
            </div>

            {/* Learning Stats */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-500" />
                学习统计
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">总课程数</span>
                  <span className="font-semibold text-gray-800">{childData.totalLessons}节</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">阅读书籍</span>
                  <span className="font-semibold text-gray-800">{childData.booksRead.length}本</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">阅读时长</span>
                  <span className="font-semibold text-gray-800">{childData.totalReadingTime}分钟</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'milestones' && (
          <div className="space-y-4">
            {achievements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-6xl mb-4">🏆</div>
                <p className="text-gray-500 text-sm text-center">
                  继续努力学习<br/>
                  解锁更多成就吧！
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-6 text-white text-center shadow-lg">
                  <div className="text-5xl mb-2">🏆</div>
                  <h3 className="text-xl font-bold">已解锁 {achievements.length} 个成就</h3>
                  <p className="text-sm opacity-90 mt-1">继续加油！</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {achievements.map((achievement, index) => (
                    <div key={index} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-2xl flex-shrink-0">
                        {achievement.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">{achievement.title}</h4>
                        <p className="text-sm text-gray-500">{achievement.desc}</p>
                      </div>
                      <Zap className="w-5 h-5 text-yellow-500" />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="space-y-4">
            {/* Comprehension Breakdown */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h4 className="font-semibold text-gray-800 mb-4">理解力详情</h4>
              <div className="space-y-3">
                {Object.entries(childData.comprehension.abilities).map(([key, abilityData]) => {
                  const names: Record<string, string> = {
                    literal: '字面理解',
                    context: '上下文理解',
                    abstract: '抽象理解',
                    emotion: '情感理解',
                    logic: '逻辑推理'
                  };
                  
                  const colors: Record<string, string> = {
                    literal: 'bg-blue-500',
                    context: 'bg-green-500',
                    abstract: 'bg-purple-500',
                    emotion: 'bg-pink-500',
                    logic: 'bg-orange-500'
                  };
                  
                  const ability = abilityData as { level: number; progress: number };
                  
                  return (
                    <div key={key}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">{names[key]}</span>
                        <span className="text-sm font-semibold text-gray-800">Lv.{ability.level} ({ability.progress}%)</span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className={`${colors[key]} h-2 rounded-full transition-all`}
                          style={{ width: `${ability.progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Words */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h4 className="font-semibold text-gray-800 mb-3">最近学的词</h4>
              {childData.vocabulary.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">还没有学过词汇</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {childData.vocabulary
                    .slice()
                    .sort((a, b) => b.learnedAt - a.learnedAt)
                    .slice(0, 20)
                    .map((word) => (
                      <div
                        key={word.word}
                        className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg text-sm"
                      >
                        <span className="font-medium text-gray-800">{word.word}</span>
                        <span className="text-xs text-gray-500 ml-1">
                          {Math.floor(word.familiarity)}%
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Personality */}
            {childData.personality.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h4 className="font-semibold text-gray-800 mb-3">性格特点</h4>
                <div className="flex flex-wrap gap-2">
                  {childData.personality.map((trait, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg text-sm text-gray-700"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
