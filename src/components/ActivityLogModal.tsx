import React from 'react';
import { AIStatusInfo } from '../types';
import { X, MapPin, RefreshCw } from 'lucide-react';

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusInfo: AIStatusInfo;
  aiName: string;
  aiAvatar?: string;
}

const ActivityLogModal: React.FC<ActivityLogModalProps> = ({
  isOpen,
  onClose,
  statusInfo,
  aiName,
  aiAvatar
}) => {
  if (!isOpen) return null;

  // 格式化时间为24小时制
  const formatRelativeTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffMinutes = Math.floor(diffMs / 60000);
    
    // 显示实际时间（24小时制）
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    // 如果是今天，只显示时间
    if (date.toDateString() === now.toDateString()) {
      return timeStr;
    }
    
    // 如果是昨天
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `昨天 ${timeStr}`;
    }
    
    // 如果是一周内
    if (diffMinutes < 7 * 24 * 60) {
      const days = Math.floor(diffMinutes / (24 * 60));
      return `${days}天前 ${timeStr}`;
    }
    
    // 更早的日期
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day} ${timeStr}`;
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
        </div>

        {/* 行为轨迹列表 */}
        <div className="overflow-y-auto max-h-[calc(80vh-100px)] p-4">
          {statusInfo.activityLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              暂无行为记录
            </div>
          ) : (
            <div className="space-y-3">
              {statusInfo.activityLogs.map((log, index) => (
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
