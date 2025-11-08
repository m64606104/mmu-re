/**
 * 公告页面
 * 显示版本更新和重要提示
 */

import { ChevronLeft, Bell, AlertCircle, Calendar } from 'lucide-react';

interface AnnouncementScreenProps {
  onBack: () => void;
}

export default function AnnouncementScreen({ onBack }: AnnouncementScreenProps) {
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="px-4 pt-2 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors active:scale-95"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">公告</h1>
                <p className="text-xs text-gray-400">版本更新与重要提示</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 首次使用提示 - 置顶 */}
        <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border-2 border-red-400/50 rounded-xl p-4 mb-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-100 mb-2">⚠️ 重要提示</h3>
              <p className="text-red-50 text-base leading-relaxed font-medium">
                首次使用请先查看使用说明！！
              </p>
            </div>
          </div>
        </div>

        {/* 公告列表 */}
        <div className="space-y-4">
          {/* 11.9 公告 */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 shadow-lg">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">11.9日起启用公告</h3>
                <p className="text-xs text-gray-400">2024年11月9日</p>
              </div>
            </div>
            <div className="pl-13">
              <p className="text-gray-200 text-sm leading-relaxed">
                此后版本更新内容会在此处通知
              </p>
            </div>
          </div>

          {/* 示例：可以继续添加更多公告 */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-gray-400" />
              <p className="text-sm text-gray-400">更多公告即将发布...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer提示 */}
      <div className="bg-black/30 backdrop-blur-sm border-t border-white/10 p-4">
        <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-3">
          <p className="text-xs text-blue-200 text-center leading-relaxed">
            💡 重要更新会在此展示，建议定期查看
          </p>
        </div>
      </div>
    </div>
  );
}
