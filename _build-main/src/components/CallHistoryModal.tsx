import { useState } from 'react';
import { X, Video, Clock, ChevronRight, ChevronDown, Calendar } from 'lucide-react';
import { CallLog } from '../types';

interface CallHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  callHistory: CallLog[];
  characterName: string;
}

export default function CallHistoryModal({
  isOpen,
  onClose,
  callHistory,
  characterName
}: CallHistoryModalProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  // 按日期分组
  const groupedHistory: Record<string, CallLog[]> = {};
  
  // 按时间倒序排序
  const sortedHistory = [...callHistory].sort((a, b) => b.startTime - a.startTime);
  
  sortedHistory.forEach(log => {
    const date = new Date(log.startTime).toLocaleDateString();
    if (!groupedHistory[date]) {
      groupedHistory[date] = [];
    }
    groupedHistory[date].push(log);
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md h-[80vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-500" />
            与 {characterName} 的通话记录
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {Object.entries(groupedHistory).length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              暂无通话记录
            </div>
          ) : (
            Object.entries(groupedHistory).map(([date, logs]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-500 bg-gray-50 px-3 py-1 rounded-lg w-fit">
                  <Calendar className="w-4 h-4" />
                  {date}
                </div>
                <div className="space-y-3 pl-2">
                  {logs.map(log => (
                    <div key={log.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div 
                        className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                        onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                            <Video className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {log.type === 'video' ? '视频通话' : '语音通话'}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                              <span>{formatTime(log.startTime)}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDuration(log.duration)}
                              </span>
                            </div>
                          </div>
                        </div>
                        {expandedId === log.id ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                      </div>

                      {/* 展开显示的对话记录 */}
                      {expandedId === log.id && (
                        <div className="border-t bg-gray-50 p-3 space-y-2 text-sm max-h-60 overflow-y-auto">
                          <div className="text-xs text-gray-400 mb-2">对话详情 ({log.transcript.length} 条消息)</div>
                          {log.transcript.map((msg, idx) => (
                            <div key={idx} className="flex gap-2">
                              <span className={`font-medium flex-shrink-0 ${msg.role === 'user' ? 'text-blue-600' : 'text-purple-600'}`}>
                                {msg.role === 'user' ? '我' : characterName}:
                              </span>
                              <span className="text-gray-700">{msg.content}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
