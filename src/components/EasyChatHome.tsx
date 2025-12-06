import { ArrowLeft, MessageCircle, Aperture, Send } from 'lucide-react';
import { getBubbleColorTheme } from '../utils/bubbleColors';

interface EasyChatHomeProps {
  onBack: () => void;
  onOpenChatList: () => void;
  onOpenMoments: () => void;
  onOpenUserSettings: () => void;
  userName: string;
  userAvatar: string;
  userBubbleColor?: string;
}

export function EasyChatHome({ onBack, onOpenChatList, onOpenMoments, onOpenUserSettings, userName, userAvatar, userBubbleColor }: EasyChatHomeProps) {
  const theme = getBubbleColorTheme(userBubbleColor);
  
  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gray-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-32 right-16 w-40 h-40 bg-gray-300/20 rounded-full blur-3xl" />
      </div>

      {/* 顶部导航栏 */}
      <div className="relative flex items-center justify-between h-20 px-4 bg-white/60 backdrop-blur-xl border-b border-gray-100 flex-shrink-0">
        <button
          onClick={onBack}
          className="p-2 -ml-2 active:opacity-60 transition-opacity"
        >
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="tracking-tight">Easy Chat</h1>
        {/* 用户头像按钮 */}
        <button
          onClick={onOpenUserSettings}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center overflow-hidden active:scale-95 transition-transform shadow-md"
        >
          {userAvatar.startsWith('data:') ? (
            <img src={userAvatar} alt="我的头像" className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg">{userAvatar}</span>
          )}
        </button>
      </div>

      {/* 内容区域 */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-8 gap-6">
        {/* Logo */}
        <div className="relative mb-4 animate-in zoom-in duration-500">
          <div className={`w-28 h-28 ${theme.bgClass} rounded-3xl flex items-center justify-center shadow-2xl`}>
            <Send className={`w-14 h-14 ${theme.textClass}`} strokeWidth={2.5} />
          </div>
          
          {/* 装饰小点 */}
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gray-400 rounded-full border-4 border-white shadow-lg" />
        </div>

        <h2 className="text-3xl text-gray-800 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100" style={{ fontWeight: 600 }}>
          欢迎回来
        </h2>
        <p className="text-gray-500 text-center max-w-sm mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
          连接你的世界
        </p>

        {/* 功能按钮 */}
        <div className="w-full max-w-sm space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
          {/* 聊天按钮 */}
          <button
            onClick={onOpenChatList}
            className="group w-full p-6 bg-white hover:bg-gradient-to-br hover:from-gray-500 hover:to-gray-600 border-2 border-gray-200 hover:border-transparent active:scale-95 rounded-2xl transition-all shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 group-hover:from-white/20 group-hover:to-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all">
                <MessageCircle className="w-8 h-8 text-white" strokeWidth={2} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg text-gray-800 group-hover:text-white mb-1 transition-colors">聊天</h3>
                <p className="text-sm text-gray-500 group-hover:text-white/80 transition-colors">查看和创建聊天会话</p>
              </div>
            </div>
          </button>

          {/* 朋友圈按钮 */}
          <button
            onClick={onOpenMoments}
            className="group w-full p-6 bg-white hover:bg-gradient-to-br hover:from-gray-500 hover:to-gray-600 border-2 border-gray-200 hover:border-transparent active:scale-95 rounded-2xl transition-all shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 group-hover:from-white/20 group-hover:to-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all">
                <Aperture className="w-8 h-8 text-white" strokeWidth={2} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg text-gray-800 group-hover:text-white mb-1 transition-colors">朋友圈</h3>
                <p className="text-sm text-gray-500 group-hover:text-white/80 transition-colors">分享生活点滴</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}