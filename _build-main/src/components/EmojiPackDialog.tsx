import { useState } from 'react';
import { X, Smile } from 'lucide-react';
import { Button } from './ui/button';

interface EmojiPackDialogProps {
  onClose: () => void;
  onSend: (description: string) => void;
}

export function EmojiPackDialog({ onClose, onSend }: EmojiPackDialogProps) {
  const STICKERS = [
    '😀', '😂', '🤣', '❤️', '😍', 
    '😭', '🙏', '🎉', '👍', '👎', 
    '👋', '💩', '👻', '🤖', '🍅', 
    '💣', '🌹', '🐷', '🐶', '🐱'
  ];

  return (
    <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center animate-in fade-in duration-200">
      <div className="w-[90%] max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Smile className="w-5 h-5 text-yellow-500" />
            <h3>表情包</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容区域 - 网格布局 */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-5 gap-3">
            {STICKERS.map((sticker, index) => (
              <button
                key={index}
                onClick={() => {
                  onSend(sticker);
                  onClose();
                }}
                className="aspect-square flex items-center justify-center text-4xl hover:bg-gray-50 rounded-xl transition-colors active:scale-95"
              >
                {sticker}
              </button>
            ))}
          </div>
        </div>

        {/* 底部区域 */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-center text-gray-500">点击即可发送</p>
        </div>
      </div>
    </div>
  );
}
