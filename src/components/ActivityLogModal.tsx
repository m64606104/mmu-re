import React, { useState, useEffect } from 'react';
import { AIStatusInfo, Conversation, ActivityLogEntry } from '../types';
import { X, MapPin, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { fillMissingActivities } from '../utils/lifeSimulation';

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusInfo: AIStatusInfo;
  aiName: string;
  aiAvatar?: string;
  conversation?: Conversation;
}

const ActivityLogModal: React.FC<ActivityLogModalProps> = ({
  isOpen,
  onClose,
  statusInfo,
  aiName,
  aiAvatar,
  conversation
}) => {
  if (!isOpen) return null;
  
  // 补充缺失的活动轨迹（恢复之前在aiStatusManager中移除的逻辑）
  const [activityLogs, setActivityLogs] = useState(statusInfo.activityLogs || []);
  const [currentDayIndex, setCurrentDayIndex] = useState(0); // 当前查看的天数索引
  
  useEffect(() => {
    console.log('🚀 ActivityLogModal打开，准备填充活动');
    // 重置到今天
    setCurrentDayIndex(0);
    
    if (conversation && statusInfo.activityLogs) {
      try {
        // 将AIActivityLog转换为ActivityLogEntry格式
        const existingActivities: ActivityLogEntry[] = statusInfo.activityLogs.map(log => ({
          timestamp: log.timestamp,
          activity: log.activity,
          status: log.status ? (
            log.status === 'online' ? '在线' : 
            log.status === 'busy' ? '忙碌' : 
            log.status === 'resting' ? '休息中' : 
            log.status === 'away' ? '离开' : '在线'
          ) : '在线',
          location: log.location || '未知',
          mood: '平常'
        }));
        
        // 补充缺失的活动
        const filledActivities = fillMissingActivities(conversation, existingActivities);
        console.log(`📊 活动轨迹：原有${existingActivities.length}条，补充后${filledActivities.length}条`);
        
        // 将补充的活动转换回AIActivityLog格式展示
        if (filledActivities.length > existingActivities.length) {
          // 使用时间戳+活动内容作为唯一标识，避免重复
          const existingKeys = new Set(
            statusInfo.activityLogs.map(log => `${log.timestamp}_${log.activity}`)
          );
          
          const updatedLogs = [...statusInfo.activityLogs];
          
          // 只添加新生成的活动（通过时间戳+内容判断）
          filledActivities.forEach(activity => {
            const key = `${activity.timestamp}_${activity.activity}`;
            if (!existingKeys.has(key)) {
              updatedLogs.push({
                id: `activity_${activity.timestamp}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: activity.timestamp,
                activity: activity.activity,
                location: activity.location,
                status: activity.status === '在线' ? 'online' : 
                       activity.status === '忙碌' ? 'busy' : 
                       activity.status === '休息中' ? 'resting' : 
                       activity.status === '离开' ? 'away' : 'online'
              });
              existingKeys.add(key);
            }
          });
          
          // 按时间倒序排序（最新的在前）
          updatedLogs.sort((a, b) => b.timestamp - a.timestamp);
          setActivityLogs(updatedLogs);
        } else {
          // 没有新活动，直接使用原有的
          setActivityLogs(statusInfo.activityLogs);
        }
      } catch (error) {
        console.error('填充活动轨迹失败:', error);
      }
    }
  }, [isOpen, conversation, statusInfo]);

  // 按天分组活动（凌晨0点-凌晨0点）
  const groupActivitiesByDay = () => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    
    // 过滤出当周内的活动
    const thisWeekLogs = activityLogs.filter(log => log.timestamp >= weekAgo.getTime());
    
    // 按天分组
    const grouped: { [key: string]: typeof activityLogs } = {};
    thisWeekLogs.forEach(log => {
      const date = new Date(log.timestamp);
      const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(log);
    });
    
    // 按时间倒序排序天数
    const sortedDays = Object.keys(grouped).sort((a, b) => {
      const [yearA, monthA, dayA] = a.split('-').map(Number);
      const [yearB, monthB, dayB] = b.split('-').map(Number);
      const dateA = new Date(yearA, monthA, dayA);
      const dateB = new Date(yearB, monthB, dayB);
      return dateB.getTime() - dateA.getTime();
    });
    
    return sortedDays.map(dayKey => grouped[dayKey]);
  };
  
  const groupedDays = groupActivitiesByDay();
  const currentDayLogs = groupedDays[currentDayIndex] || [];
  
  // 获取当前页面的日期标题
  const getCurrentDayTitle = () => {
    if (currentDayLogs.length === 0) return '今天';
    
    const date = new Date(currentDayLogs[0].timestamp);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return '今天';
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return '昨天';
    }
    
    const daysDiff = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (daysDiff <= 7) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return weekdays[date.getDay()];
    }
    
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };
  
  // 格式化时间为24小时制
  const formatRelativeTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-md max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {aiAvatar && (
                <img
                  src={aiAvatar}
                  alt={aiName}
                  className="w-12 h-12 rounded-full object-cover"
                />
              )}
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {aiName}
                </h2>
                {statusInfo.currentActivity && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {statusInfo.currentActivity}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
          
          {/* 日期导航 */}
          {groupedDays.length > 0 && (
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
              <button
                onClick={() => setCurrentDayIndex(prev => Math.min(prev + 1, groupedDays.length - 1))}
                disabled={currentDayIndex >= groupedDays.length - 1}
                className="p-2 hover:bg-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              
              <div className="text-center">
                <div className="text-base font-semibold text-gray-900">{getCurrentDayTitle()}</div>
                <div className="text-xs text-gray-500">{currentDayLogs.length} 条活动</div>
              </div>
              
              <button
                onClick={() => setCurrentDayIndex(prev => Math.max(prev - 1, 0))}
                disabled={currentDayIndex === 0}
                className="p-2 hover:bg-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} className="text-gray-600" />
              </button>
            </div>
          )}
        </div>

        {/* 行为轨迹列表 */}
        <div className="overflow-y-auto max-h-[calc(80vh-100px)] p-4">
          {currentDayLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {groupedDays.length === 0 ? '当周暂无行为记录' : '当天暂无行为记录'}
            </div>
          ) : (
            <div className="space-y-3">
              {currentDayLogs.map((log, index) => (
                <div
                  key={log.id}
                  className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* 时间 */}
                    <div className="flex-shrink-0">
                      <div className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                        {formatRelativeTime(log.timestamp)}
                      </div>
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className={`w-2 h-2 rounded-full ${
                            index === 0 ? 'bg-green-500' : 'bg-gray-300'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 leading-relaxed">
                            {log.activity}
                          </p>
                          {log.location && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                              <MapPin size={12} />
                              <span>{log.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部刷新按钮 */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <RefreshCw size={16} />
            <span>刷新</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogModal;
