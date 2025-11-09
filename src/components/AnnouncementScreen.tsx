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
          {/* 11.9 版本更新 */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 shadow-lg">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">📦 11.9 版本更新</h3>
                <p className="text-xs text-gray-400">2024年11月9日</p>
              </div>
            </div>
            <div className="pl-13 space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-blue-300 mb-1">📚 资料库增强</h4>
                <p className="text-gray-200 text-sm leading-relaxed">
                  在角色设置里更新了资料库，新增文档上传和解析功能。现在支持上传PDF、Word(.docx)、TXT文档，AI会自动提取文本内容并在对话中参考。
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-purple-300 mb-1">🤝 关系管理系统</h4>
                <p className="text-gray-200 text-sm leading-relaxed">
                  增加了"关系"App，现在可以自由管理AI之间的关系。支持设置好朋友、普通好友、看不爽等多种关系状态，让AI互动更加真实。
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-pink-300 mb-1">💡 朋友圈智能互动</h4>
                <p className="text-gray-200 text-sm leading-relaxed">
                  修复了朋友圈互动相关功能，现在更加智能了。AI会根据性格、内容和关系智能决定是否点赞或评论，不再是固定概率。
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-green-300 mb-1">✨ 消息操作功能</h4>
                <p className="text-gray-200 text-sm leading-relaxed">
                  实现了消息引用、多选删除、编辑功能！现在当AI回复不满意可以删除啦！眼不见为净～以及更好的编辑功能，可以修复AI语句中的小错误。支持编辑所有消息（包括AI的回复）。
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-cyan-300 mb-1">💬 消息分割优化</h4>
                <p className="text-gray-200 text-sm leading-relaxed">
                  修复了消息分割的问题，AI回复不再出现重复标点符号，消息气泡显示更自然流畅。
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-yellow-300 mb-1">📍 行为轨迹改进</h4>
                <p className="text-gray-200 text-sm leading-relaxed">
                  修复了行为轨迹重复问题，现在显示更准确、更生动，让你更好地了解AI的日常活动。
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-orange-300 mb-1">🔧 其他优化</h4>
                <p className="text-gray-200 text-sm leading-relaxed">
                  修复了表情包显示问题，移除了AI回复中的引用链接，以及一些零零碎碎的小修复，提升整体使用体验。
                </p>
              </div>
            </div>
          </div>

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
