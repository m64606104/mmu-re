// 🛤️ 人物行动轨迹查看弹窗
// 类似 Eve Chat 的足迹弹窗，时间轴展示角色活动

import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Activity, Calendar, RefreshCw } from 'lucide-react';
import { FootprintActivity } from '../types/footprint';
import { footprintStorage } from '../utils/footprintStorage';
import { initializeFootprintGeneration, generateFootprintNow } from '../utils/footprintGenerator';

interface FootprintModalProps {
  conversationId: string;
  characterName: string;
  isOpen: boolean;
  onClose: () => void;
  conversation?: any; // 传入完整conversation对象以读取真实聊天数据
}

export const FootprintModal: React.FC<FootprintModalProps> = ({
  conversationId,
  characterName,
  isOpen,
  onClose
}) => {
  const [activities, setActivities] = useState<FootprintActivity[]>([]);
  const [loading, setLoading] = useState(true);
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

  // 所有活动（移除筛选功能）
  const filteredActivities = activities;

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
        {/* 头部 - EVE风格 */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {characterName}的足迹
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                查看Ta的行为轨迹
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="刷新足迹"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* 自动更新频率设置 - EVE风格单独一行 */}
        <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">自动更新频率</label>
            <select
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={updateIntervalHours === null ? 'manual' : String(updateIntervalHours)}
              onChange={(e) => handleChangeInterval(e.target.value)}
              disabled={isApplyingUpdate}
            >
              <option value="manual">手动刷新</option>
              <option value="0.5">每30分钟</option>
              <option value="1">每小时</option>
              <option value="2">每2小时</option>
              <option value="3">每3小时</option>
            </select>
          </div>
        </div>

        {refreshError && (
          <div className="mx-5 mt-3 mb-0 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center justify-between">
            <span className="text-sm">{refreshError}</span>
            <button
              onClick={handleManualRefresh}
              className="px-2 py-1 text-sm bg-red-100 hover:bg-red-200 rounded"
            >
              重试
            </button>
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
