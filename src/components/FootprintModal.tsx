// 🛤️ 人物行动轨迹查看弹窗
// 类似 Eve Chat 的足迹弹窗，时间轴展示角色活动

import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, MapPin, Activity, Filter, Calendar, BarChart3 } from 'lucide-react';
import { FootprintActivity, FootprintFilters, ActivityType, ActivitySource } from '../types/footprint';
import { footprintStorage } from '../utils/footprintStorage';

interface FootprintModalProps {
  conversationId: string;
  characterName: string;
  isOpen: boolean;
  onClose: () => void;
}

// 活动类型图标和颜色
const ACTIVITY_CONFIG = {
  chatting: { icon: '💬', color: '#10B981', label: '聊天中' },
  thinking: { icon: '🤔', color: '#8B5CF6', label: '思考中' },
  sleeping: { icon: '😴', color: '#6B7280', label: '睡眠' },
  working: { icon: '💼', color: '#F59E0B', label: '工作' },
  entertainment: { icon: '🎮', color: '#EC4899', label: '娱乐' },
  social: { icon: '👥', color: '#3B82F6', label: '社交' },
  exercise: { icon: '🏃', color: '#EF4444', label: '运动' },
  shopping: { icon: '🛍️', color: '#84CC16', label: '购物' },
  travel: { icon: '✈️', color: '#06B6D4', label: '出行' },
  reading: { icon: '📚', color: '#8B5CF6', label: '阅读' },
  writing: { icon: '✍️', color: '#F97316', label: '写作' },
  offline: { icon: '🌙', color: '#6B7280', label: '离线' }
};

export const FootprintModal: React.FC<FootprintModalProps> = ({
  conversationId,
  characterName,
  isOpen,
  onClose
}) => {
  const [activities, setActivities] = useState<FootprintActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'stats'>('timeline');
  const [filters, setFilters] = useState<FootprintFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // 加载轨迹数据
  useEffect(() => {
    if (isOpen && conversationId) {
      loadFootprintData();
    }
  }, [isOpen, conversationId]);

  const loadFootprintData = async () => {
    try {
      setLoading(true);
      
      // 加载最近30天的数据
      const { activities: recentActivities } = await footprintStorage.getRecentStats(
        conversationId, 
        30
      );

      setActivities(recentActivities);
    } catch (error) {
      console.error('加载轨迹数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 筛选后的活动
  const filteredActivities = useMemo(() => {
    let filtered = [...activities];

    if (filters.activityTypes?.length) {
      filtered = filtered.filter(activity => 
        filters.activityTypes!.includes(activity.activityType)
      );
    }

    if (filters.sources?.length) {
      filtered = filtered.filter(activity => 
        filters.sources!.includes(activity.source)
      );
    }

    if (filters.minConfidence) {
      filtered = filtered.filter(activity => 
        activity.confidence >= filters.minConfidence!
      );
    }

    return filtered;
  }, [activities, filters]);

  // 按日期分组的活动
  const groupedActivities = useMemo(() => {
    const groups: Record<string, FootprintActivity[]> = {};
    
    filteredActivities.forEach(activity => {
      const date = new Date(activity.timestamp).toLocaleDateString('zh-CN');
      if (!groups[date]) groups[date] = [];
      groups[date].push(activity);
    });

    return groups;
  }, [filteredActivities]);

  // 统计信息
  const stats = useMemo(() => {
    const totalActivities = filteredActivities.length;
    const activityTypes = filteredActivities.reduce((acc, activity) => {
      acc[activity.activityType] = (acc[activity.activityType] || 0) + 1;
      return acc;
    }, {} as Record<ActivityType, number>);

    const sources = filteredActivities.reduce((acc, activity) => {
      acc[activity.source] = (acc[activity.source] || 0) + 1;
      return acc;
    }, {} as Record<ActivitySource, number>);

    const totalChatTime = filteredActivities
      .filter(a => a.activityType === 'chatting')
      .reduce((sum, a) => sum + (a.duration || 0), 0);

    return {
      totalActivities,
      activityTypes,
      sources,
      totalChatTime: Math.round(totalChatTime / 1000 / 60) // 转为分钟
    };
  }, [filteredActivities]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    const minutes = Math.round(ms / 1000 / 60);
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}小时${mins}分钟`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {characterName} 的行动轨迹
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                最近30天的活动记录
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="筛选"
            >
              <Filter className="w-5 h-5" />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 标签页 */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'timeline'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            时间轨迹
          </button>
          
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'stats'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            统计分析
          </button>
        </div>

        {/* 筛选栏 */}
        {showFilters && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-wrap gap-3">
              <select
                className="px-3 py-1 text-sm border border-gray-300 rounded-md"
                onChange={(e) => {
                  const types = e.target.value ? [e.target.value as ActivityType] : undefined;
                  setFilters(prev => ({ ...prev, activityTypes: types }));
                }}
              >
                <option value="">所有类型</option>
                {Object.entries(ACTIVITY_CONFIG).map(([type, config]) => (
                  <option key={type} value={type}>
                    {config.icon} {config.label}
                  </option>
                ))}
              </select>

              <select
                className="px-3 py-1 text-sm border border-gray-300 rounded-md"
                onChange={(e) => {
                  const confidence = e.target.value ? parseFloat(e.target.value) : undefined;
                  setFilters(prev => ({ ...prev, minConfidence: confidence }));
                }}
              >
                <option value="">所有置信度</option>
                <option value="0.8">高可信度 (≥80%)</option>
                <option value="0.5">中等可信度 (≥50%)</option>
                <option value="0">所有记录</option>
              </select>

              <button
                onClick={() => setFilters({})}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                清除筛选
              </button>
            </div>
          </div>
        )}

        {/* 内容区域 */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500">加载轨迹数据中...</p>
              </div>
            </div>
          ) : activeTab === 'timeline' ? (
            // 时间轨迹视图
            <div className="p-6">
              {Object.keys(groupedActivities).length === 0 ? (
                <div className="text-center py-16">
                  <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">暂无轨迹记录</h3>
                  <p className="text-gray-500">开始对话后，这里将显示 TA 的活动轨迹</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(groupedActivities).map(([date, dayActivities]) => (
                    <div key={date}>
                      {/* 日期标题 */}
                      <div className="flex items-center gap-3 mb-6">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-900">{date}</h3>
                        <div className="flex-1 h-px bg-gray-200"></div>
                        <span className="text-sm text-gray-500">
                          {dayActivities.length} 项活动
                        </span>
                      </div>

                      {/* 活动时间线 */}
                      <div className="relative">
                        {/* 时间线 */}
                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                        {/* 活动项 */}
                        <div className="space-y-4">
                          {dayActivities.map((activity) => {
                            const config = ACTIVITY_CONFIG[activity.activityType];
                            return (
                              <div key={activity.id} className="relative flex items-start gap-4">
                                {/* 时间轴节点 */}
                                <div 
                                  className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-lg shadow-md"
                                  style={{ backgroundColor: config.color + '20', border: `2px solid ${config.color}` }}
                                >
                                  {config.icon}
                                </div>

                                {/* 活动内容 */}
                                <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-gray-900">
                                        {config.label}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {formatTime(activity.timestamp)}
                                      </span>
                                      {activity.duration && (
                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                          {formatDuration(activity.duration)}
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      {activity.confidence < 1 && (
                                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                                          AI推测 {Math.round(activity.confidence * 100)}%
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <p className="text-gray-700 mb-2">{activity.activity}</p>
                                  
                                  {(activity.location || activity.mood) && (
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                      {activity.location && (
                                        <div className="flex items-center gap-1">
                                          <MapPin className="w-3 h-3" />
                                          {activity.location}
                                        </div>
                                      )}
                                      {activity.mood && (
                                        <span>心情：{activity.mood}</span>
                                      )}
                                    </div>
                                  )}
                                  
                                  {activity.tags && activity.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {activity.tags.map(tag => (
                                        <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // 统计分析视图
            <div className="p-6 space-y-6">
              {/* 总体统计 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Activity className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="text-sm text-blue-600 font-medium">总活动数</p>
                      <p className="text-2xl font-bold text-blue-900">{stats.totalActivities}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Clock className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="text-sm text-green-600 font-medium">聊天时长</p>
                      <p className="text-2xl font-bold text-green-900">{stats.totalChatTime}分钟</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-8 h-8 text-purple-600" />
                    <div>
                      <p className="text-sm text-purple-600 font-medium">活跃天数</p>
                      <p className="text-2xl font-bold text-purple-900">{Object.keys(groupedActivities).length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 活动类型分布 */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">活动类型分布</h3>
                <div className="space-y-3">
                  {Object.entries(stats.activityTypes)
                    .sort(([,a], [,b]) => b - a)
                    .map(([type, count]) => {
                      const config = ACTIVITY_CONFIG[type as ActivityType];
                      const percentage = Math.round((count / stats.totalActivities) * 100);
                      return (
                        <div key={type} className="flex items-center gap-3">
                          <span className="text-lg">{config.icon}</span>
                          <span className="text-sm font-medium text-gray-900 w-16">
                            {config.label}
                          </span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: config.color
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-500 w-16 text-right">
                            {count}次 ({percentage}%)
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
