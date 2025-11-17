/**
 * 全屏回信输入界面
 * 提供更舒适的写信体验
 */

import React, { useState } from 'react';
import { Letter } from '../types/letter';
import { ArrowLeft, Send } from 'lucide-react';

interface FullScreenReplyComposerProps {
  letter: Letter;
  userName: string;
  onSend: (content: string) => void;
  onBack: () => void;
}

const FullScreenReplyComposer: React.FC<FullScreenReplyComposerProps> = ({
  letter,
  userName,
  onSend,
  onBack
}) => {
  const [content, setContent] = useState('');

  const handleSend = () => {
    if (!content.trim()) {
      alert('请输入回信内容');
      return;
    }
    onSend(content.trim());
  };

  const getStampEmoji = (style?: string) => {
    switch (style) {
      case 'vintage':
        return '🏛️';
      case 'flower':
        return '🌸';
      case 'sea':
        return '🌊';
      default:
        return '📮';
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 z-50 overflow-hidden flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-orange-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">返回</span>
        </button>
        
        <div className="text-center flex-1">
          <div className="text-lg font-bold text-gray-800">继续回信</div>
          <div className="text-xs text-gray-500">To {letter.receiverName}</div>
        </div>

        <button
          onClick={handleSend}
          disabled={!content.trim()}
          className={`px-4 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${
            content.trim()
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-lg'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Send size={18} />
          寄出
        </button>
      </div>

      {/* 主体内容 - 信纸 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-6 min-h-[500px] relative"
          style={{
            backgroundImage: `repeating-linear-gradient(
              transparent,
              transparent 31px,
              #e5e7eb 31px,
              #e5e7eb 32px
            )`
          }}
        >
          {/* 邮票装饰 */}
          <div className="absolute top-4 right-4 w-16 h-20 border-4 border-dashed border-orange-400 rounded-md flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100">
            <span className="text-3xl">{getStampEmoji(letter.stampStyle)}</span>
          </div>

          {/* 收信人信息 */}
          <div className="mb-6">
            <div className="text-sm text-gray-500 mb-1">致 {letter.receiverName}</div>
            <div className="text-xs text-gray-400">
              第 {letter.currentRound + 1} 轮回信
            </div>
          </div>

          {/* 写信区域 */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="亲爱的朋友：&#10;&#10;见字如面，看到你的回信我很高兴...&#10;&#10;写下你想说的话，让它随时间慢慢抵达对方心里。"
            className="w-full min-h-[350px] resize-none bg-transparent border-none outline-none text-gray-800 leading-8 placeholder-gray-400"
            style={{ lineHeight: '32px' }}
            autoFocus
          />

          {/* 落款 */}
          <div className="text-right mt-8 text-gray-600">
            <div>{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div className="mt-1">from {userName}</div>
          </div>
        </div>

        {/* 温馨提示 */}
        <div className="max-w-2xl mx-auto mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">💌</span>
            <div className="text-sm text-blue-700 flex-1">
              <div className="font-medium mb-1">慢邮件说明</div>
              <div className="text-blue-600">
                · 信件寄出后，预计1-5天收到回信<br />
                · 可以在信箱中催促回复（缩短至15-30分钟）<br />
                · 漂流瓶默认最多3轮交流，加为笔友后无限制
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullScreenReplyComposer;
