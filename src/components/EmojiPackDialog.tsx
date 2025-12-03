import { useState } from 'react';
import { X, Smile } from 'lucide-react';
import { Button } from './ui/button';

interface EmojiPackDialogProps {
  onClose: () => void;
  onSend: (description: string) => void;
}

export function EmojiPackDialog({ onClose, onSend }: EmojiPackDialogProps) {
  const [description, setDescription] = useState('');

  const handleSend = () => {
    if (!description.trim()) return;
    onSend(description);
    onClose();
  };

  return (
    <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center animate-in fade-in duration-200">
      <div className="w-[90%] max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Smile className="w-5 h-5 text-yellow-500" />
            <h3>发送表情包</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">描述表情包内容</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如：笑哭、委屈、点赞..."
              className="w-full min-h-[100px] px-3 py-2 border border-gray-200 rounded-lg resize-none outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 按钮区域 */}
        <div className="flex gap-3 px-6 pb-6">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            取消
          </Button>
          <Button
            onClick={handleSend}
            disabled={!description.trim()}
            className="flex-1 bg-yellow-500 hover:bg-yellow-600"
          >
            发送
          </Button>
        </div>
      </div>
    </div>
  );
}
