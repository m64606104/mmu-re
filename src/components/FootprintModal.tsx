// 🛤️ 人物行动轨迹查看弹窗
// 类似 Eve Chat 的足迹弹窗，时间轴展示角色活动

import React, { useState, useEffect, useMemo } from 'react';
import { X, MapPin, Activity, Filter, Calendar, RefreshCw } from 'lucide-react';
import { FootprintActivity, FootprintFilters, ActivityType } from '../types/footprint';
import { footprintStorage } from '../utils/footprintStorage';
import { initializeFootprintGeneration, generateFootprintNow } from '../utils/footprintGenerator';

interface FootprintModalProps {
  conversationId: string;
  characterName: string;
  isOpen: boolean;
  onClose: () => void;
  conversation?: any; // 传入完整conversation对象以读取真实聊天数据
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
  const [filters, setFilters] = useState<FootprintFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [updateIntervalHours, setUpdateIntervalHours] = useState<number | null>(null); // null=手动
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // 加载轨迹数据
  useEffect(() => {
    if (isOpen && conversationId) {
      loadFootprintData();
    }
  }, [isOpen, conversationId]);

  // 初始化或更新自动生成频率
  useEffect(() => {
    if (!isOpen) return;
    const key = `footprint_update_interval_${conversationId}`;
    const saved = localStorage.getItem(key);
    let hours: number | null = null;
    if (saved && saved !== 'manual') {
      const parsed = parseFloat(saved);
      hours = Number.isFinite(parsed) ? parsed : null;
    }
    setUpdateIntervalHours(hours);

    const apply = async () => {
      setIsApplyingUpdate(true);
      try {
        if (hours === null) {
          await initializeFootprintGeneration(conversationId, { enableAutoGeneration: false });
        } else {
          await initializeFootprintGeneration(conversationId, { enableAutoGeneration: true, generationInterval: hours });
        }
        setRefreshError(null);
      } catch (e: any) {
        setRefreshError(e?.message || '更新自动频率失败');
      } finally {
        setIsApplyingUpdate(false);
      }
    };
    apply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleChangeInterval = async (value: string) => {
    const key = `footprint_update_interval_${conversationId}`;
    if (value === 'manual') {
      localStorage.setItem(key, 'manual');
      setUpdateIntervalHours(null);
      setIsApplyingUpdate(true);
      try {
        await initializeFootprintGeneration(conversationId, { enableAutoGeneration: false });
        setRefreshError(null);
      } catch (e: any) {
        setRefreshError(e?.message || '更新自动频率失败');
      } finally {
        setIsApplyingUpdate(false);
      }
      return;
    }

    const hours = parseFloat(value);
    localStorage.setItem(key, String(hours));
    setUpdateIntervalHours(hours);
    setIsApplyingUpdate(true);
    try {
      await initializeFootprintGeneration(conversationId, { enableAutoGeneration: true, generationInterval: hours });
      setRefreshError(null);
    } catch (e: any) {
      setRefreshError(e?.message || '更新自动频率失败');
    } finally {
      setIsApplyingUpdate(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      await generateFootprintNow(conversationId);
      await loadFootprintData();
    } catch (e: any) {
      setRefreshError(e?.message || '刷新失败，请重试');
    } finally {
      setIsRefreshing(false);
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

  // EVE风格时间格式：HH:mm
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ height: '100dvh' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ maxHeight: '85dvh' }}>
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
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">自动更新频率</span>
              <select
                className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white"
                value={updateIntervalHours === null ? 'manual' : String(updateIntervalHours)}
                onChange={(e) => handleChangeInterval(e.target.value)}
              >
                <option value="manual">手动</option>
                <option value="0.5">每30分钟</option>
                <option value="1">每1小时</option>
                <option value="3">每3小时</option>
              </select>
              {isApplyingUpdate && (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              )}
            </div>

            <button
              onClick={handleManualRefresh}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md flex items-center gap-1"
              title="手动刷新"
            >
              <RefreshCw className="w-4 h-4" /> 手动刷新
              {isRefreshing && (
                <span className="ml-2 inline-block w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
              )}
            </button>

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

        {refreshError && (
          <div className="mx-6 mt-3 mb-0 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center justify-between">
            <span className="text-sm">{refreshError}</span>
            <button
              onClick={handleManualRefresh}
              className="px-2 py-1 text-sm bg-red-100 hover:bg-red-200 rounded"
            >
              重试
            </button>
          </div>
        )}


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
          ) : (
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
                        <div className="space-y-6">
                          {dayActivities.map((activity) => {
                            return (
                              <div key={activity.id} className="relative flex items-start gap-3 pl-2">
                                {/* 时间轴节点 - EVE风格简洁蓝色圆点 */}
                                <div className="relative z-10 flex-shrink-0">
                                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
                                </div>

                                {/* 活动内容 - EVE风格简洁卡片 */}
                                <div className="flex-1 pb-1">
                                  {/* 时间 */}
                                  <div className="text-sm text-gray-500 mb-1">
                                    {formatTime(activity.timestamp)}
                                  </div>
                                  
                                  {/* 活动描述 */}
                                  <p className="text-gray-900 leading-relaxed mb-1.5">
                                    {activity.activity}
                                  </p>
                                  
                                  {/* 地点 - EVE风格 */}
                                  {activity.location && (
                                    <div className="flex items-center gap-1 text-sm text-gray-500">
                                      <MapPin className="w-3.5 h-3.5" />
                                      <span>{activity.location}</span>
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
          )}
        </div>
      </div>
    </div>
  );
};
