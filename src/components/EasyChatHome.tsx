import { ArrowLeft, MessageCircle, MessagesSquare } from 'lucide-react';

interface EasyChatHomeProps {
  onBack: () => void;
  onOpenChatList: () => void;
  onOpenForum: () => void;
  onOpenUserSettings: () => void;
  userName: string;
  userAvatar: string;
  userBubbleColor?: string;
}

export function EasyChatHome({ onBack, onOpenChatList, onOpenForum, onOpenUserSettings, userName, userAvatar }: EasyChatHomeProps) {
  return (
    <div className="w-full h-full bg-gray-50 flex flex-col relative overflow-hidden">

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
      <div className="relative flex-1 flex flex-col items-center justify-center p-6 gap-4">
        <h2 className="text-2xl text-gray-800 text-center" style={{ fontWeight: 600 }}>
          欢迎回来，{userName}
        </h2>
        <p className="text-gray-500 text-center text-sm mb-6">
          选择聊天或论坛开始体验
        </p>

        {/* 功能按钮 */}
        <div className="w-full max-w-sm space-y-3">
          {/* 聊天按钮 */}
          <button
            onClick={onOpenChatList}
            className="group w-full p-5 bg-white hover:bg-gray-50 border border-gray-200 active:scale-[0.98] rounded-xl transition-all shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-7 h-7 text-blue-600" strokeWidth={2} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-base font-semibold text-gray-800 mb-0.5">聊天</h3>
                <p className="text-xs text-gray-500">查看和创建聊天会话</p>
              </div>
            </div>
          </button>

          {/* 论坛按钮 */}
          <button
            onClick={onOpenForum}
            className="group w-full p-5 bg-white hover:bg-gray-50 border border-gray-200 active:scale-[0.98] rounded-xl transition-all shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <MessagesSquare className="w-7 h-7 text-green-600" strokeWidth={2} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-base font-semibold text-gray-800 mb-0.5">论坛</h3>
                <p className="text-xs text-gray-500">发布和讨论话题</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}