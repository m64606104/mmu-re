import { useState } from 'react';
import { MessageCircle, Users, Send, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

interface EasyChatIntroProps {
  onFinish: () => void;
}

export function EasyChatIntro({ onFinish }: EasyChatIntroProps) {
  const [currentPage, setCurrentPage] = useState(0);

  const pages = [
    {
      icon: Send,
      iconBg: 'from-blue-500 to-blue-600',
      title: '欢迎使用 Easy Chat',
      description: '一个完全由您自定义的聊天应用，所有数据都保存在本地，无需联网',
      illustration: '💬'
    },
    {
      icon: Users,
      iconBg: 'from-purple-500 to-purple-600',
      title: '自定义联系人',
      description: '创建和管理您的联系人，自定义头像和昵称，开始私聊或群聊',
      illustration: '👥'
    },
    {
      icon: MessageCircle,
      iconBg: 'from-green-500 to-green-600',
      title: '角色扮演',
      description: '在聊天中切换不同角色，创建生动有趣的对话场景',
      illustration: '🎭'
    }
  ];

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      onFinish();
    }
  };

  const handleSkip = () => {
    onFinish();
  };

  const page = pages[currentPage];
  const Icon = page.icon;

  return (
    <div className="w-full h-full bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      {/* 跳过按钮 */}
      <div className="flex justify-end p-4">
        {currentPage < pages.length - 1 && (
          <button
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-700 active:opacity-60 transition-all px-4 py-2"
          >
            跳过
          </button>
        )}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-20">
        {/* 图标 */}
        <div className="relative mb-8 animate-in zoom-in duration-500" key={currentPage}>
          <div className={`w-32 h-32 bg-gradient-to-br ${page.iconBg} rounded-3xl flex items-center justify-center shadow-2xl`}>
            <Icon className="w-16 h-16 text-white" strokeWidth={2} />
          </div>
          
          {/* 插图表情 */}
          <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-white">
            <span className="text-3xl">{page.illustration}</span>
          </div>
        </div>

        {/* 标题 */}
        <h2 className="text-3xl text-gray-800 mb-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-500" key={`title-${currentPage}`}>
          {page.title}
        </h2>

        {/* 描述 */}
        <p className="text-gray-600 text-center max-w-sm mb-8 leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100" key={`desc-${currentPage}`}>
          {page.description}
        </p>

        {/* 分页指示器 */}
        <div className="flex gap-2 mb-12">
          {pages.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentPage
                  ? 'w-8 bg-blue-500'
                  : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* 下一步按钮 */}
        <button
          onClick={handleNext}
          className="w-full max-w-sm py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span className="text-lg">
            {currentPage < pages.length - 1 ? '下一步' : '开始使用'}
          </span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}