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
          {/* 11.11 更新 - Word 文档系统与优化 */}
          <div className="bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border-2 border-indigo-400/50 rounded-xl p-4 shadow-lg mb-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">📄 Word 文档系统与功能优化</h3>
                <p className="text-xs text-gray-300">2024年11月11日 更新</p>
              </div>
            </div>
            <div className="pl-13 space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-indigo-200 mb-1">🗂️ 资料库功能</h4>
                <p className="text-gray-100 text-sm leading-relaxed">
                  <strong>在主屏幕增加了"资料库"</strong>，里面显示用户聊天记录中的文档和用户上传的文档等。方便快速查找和管理所有文档资料。
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-blue-200 mb-1">🔍 聊天记录搜索</h4>
                <p className="text-gray-100 text-sm leading-relaxed">
                  <strong>增加了聊天记录搜索功能</strong>，支持按内容、图片、视频、文件、链接、交易等分类搜索，快速定位历史消息。
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-cyan-200 mb-1">💰 红包转账优化</h4>
                <p className="text-gray-100 text-sm leading-relaxed">
                  <strong>优化修复了红包转账功能的问题和显示</strong>，交互更流畅，显示更清晰。
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-purple-200 mb-1">🎨 AI 换头像功能</h4>
                <p className="text-gray-100 text-sm leading-relaxed">
                  <strong>增加了让 AI 换头像功能</strong>，你现在可以发送图片给 AI 并且要求他换头像啦～并且可以让他换回来（仅保留上一次的头像）。
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-pink-200 mb-1">📄 文档保存与转发</h4>
                <p className="text-gray-100 text-sm leading-relaxed">
                  <strong>增加了文档的保存、转发功能</strong>，Word 风格展示更专业美观，支持复制、下载等操作。
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-amber-200 mb-1">⏰ 时间感知优化</h4>
                <p className="text-gray-100 text-sm leading-relaxed">
                  <strong>继续优化了 AI 时间感知</strong>，增强了当消息间隔较长时的判断，AI 现在能更好地理解对话的时间背景。
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-emerald-200 mb-1">💾 数据导出完善</h4>
                <p className="text-gray-100 text-sm leading-relaxed">
                  <strong>更新了设置里的资料导出</strong>，包含了新更新的全部内容，确保您的数据完整备份。
                </p>
              </div>
              
              <div className="bg-white/10 rounded-lg p-3 mt-2">
                <p className="text-xs text-gray-200 leading-relaxed">
                  💡 <strong>使用提示：</strong>测试并且修复了各种 bug，系统更加稳定流畅
                </p>
              </div>
              
              <div className="bg-indigo-500/20 border border-indigo-400/50 rounded-lg p-3 mt-2">
                <p className="text-xs text-indigo-100 leading-relaxed">
                  ✨ <strong>新特性：</strong>文档系统全面升级到 Word 风格，支持 5 种格式解析，更专业更美观
                </p>
              </div>
            </div>
          </div>

          {/* 11.10 凌晨更新 - 红包转账与商城功能 */}
          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-400/50 rounded-xl p-4 shadow-lg mb-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">💰 红包转账与商城功能</h3>
                <p className="text-xs text-gray-300">2024年11月10日 凌晨更新</p>
              </div>
            </div>
            <div className="pl-13 space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-yellow-200 mb-1">💰 红包转账功能完善</h4>
                <p className="text-gray-100 text-sm leading-relaxed">
                  <strong>完善了红包转账内容，更好的AI逻辑、修复转账气泡、收礼物送礼物功能、代付功能、订单以及余额等十多个功能。</strong>
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-orange-200 mb-1">🎁 商城购物功能</h4>
                <p className="text-gray-100 text-sm leading-relaxed">
                  <strong>完善了商城相关的一些内容。</strong>支持给AI送礼物、请AI代付、AI主动送礼物给你等功能。
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-amber-200 mb-1">📄 文档功能优化</h4>
                <p className="text-gray-100 text-sm leading-relaxed">
                  <strong>修复文档内容泄露问题。</strong>
                </p>
              </div>
              
              <div className="bg-white/10 rounded-lg p-3 mt-2">
                <p className="text-xs text-gray-200 leading-relaxed">
                  💡 <strong>小提示：</strong>如果你没有钱了，可以创造一个专门的AI给你转钱哦～
                </p>
              </div>
              
              <div className="bg-yellow-500/20 border border-yellow-400/50 rounded-lg p-3 mt-2">
                <p className="text-xs text-yellow-100 leading-relaxed">
                  ⚠️ <strong>测试提示：</strong>增加的功能太多了，我测不过来了……可能有bug
                </p>
              </div>
            </div>
          </div>

          {/* 11.9 深夜更新 - 重要功能修复与优化 */}
          <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-2 border-emerald-400/50 rounded-xl p-4 shadow-lg mb-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">🔧 重要功能修复与优化</h3>
                <p className="text-xs text-gray-300">2024年11月9日 深夜更新</p>
              </div>
            </div>
            <div className="pl-13 space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-emerald-200 mb-1">🧠 记忆总结功能修复</h4>
                <p className="text-gray-100 text-sm leading-relaxed">
                  <strong>修复了新建角色记忆总结不生效的问题！</strong>现在所有AI（包括新建的角色）都能够正常进行记忆总结了。每25条消息自动提取重要信息，让AI记住你们之间的点点滴滴。
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-teal-200 mb-1">💬 朋友圈互动优化</h4>
                <p className="text-gray-100 text-sm leading-relaxed">
                  <strong>优化了朋友圈互动体验！</strong>现在用户的朋友圈会得到AI的回复，AI评论后立即显示无需等待。同时大幅减少后台刷新次数，<strong>API调用降低90%+</strong>，按界面智能调整刷新频率。
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-cyan-200 mb-1">📄 学术论文支持</h4>
                <p className="text-gray-100 text-sm leading-relaxed">
                  <strong>资料库新增DOI自动获取功能！</strong>输入论文DOI即可自动获取标题、作者、摘要等信息。同时优化了PDF解析，更好地支持学术论文格式，保留段落结构。
                </p>
              </div>
              
              <div className="bg-white/10 rounded-lg p-3 mt-2">
                <p className="text-xs text-gray-200 leading-relaxed">
                  💡 <strong>使用提示：</strong>角色设置 → 资料库 → 输入DOI或上传PDF，AI会自动提取内容用于对话参考
                </p>
              </div>
            </div>
          </div>

          {/* 11.9 晚间更新 - 消息功能大升级 */}
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-400/50 rounded-xl p-4 shadow-lg mb-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">✨ 消息功能大升级</h3>
                <p className="text-xs text-gray-300">2024年11月9日 晚间更新</p>
              </div>
            </div>
            <div className="pl-13 space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-purple-200 mb-1">💬 消息操作全面升级</h4>
                <p className="text-gray-100 text-sm leading-relaxed">
                  <strong>修复了消息分割的问题</strong>，实现了<strong>消息引用、多选删除、编辑功能</strong>。现在当AI回复不满意可以删除啦！眼不见为净～以及更好的编辑功能，可以修复AI语句中的小错误。
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-pink-200 mb-1">🎭 行为轨迹优化</h4>
                <p className="text-gray-100 text-sm leading-relaxed">
                  <strong>修复了行为轨迹重复问题</strong>，更好更生动的显示AI的日常活动，让角色更加真实立体。
                </p>
              </div>
              
              <div className="bg-white/10 rounded-lg p-3 mt-2">
                <p className="text-xs text-gray-200 leading-relaxed">
                  💡 <strong>使用提示：</strong>长按或点击消息即可看到操作菜单，支持引用、编辑、多选删除等功能
                </p>
              </div>
            </div>
          </div>

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
