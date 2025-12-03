import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface VoiceMessageDialogProps {
  onClose: () => void;
  onSend: (voiceText: string, duration: number) => void;
}

export function VoiceMessageDialog({ onClose, onSend }: VoiceMessageDialogProps) {
  const [voiceText, setVoiceText] = useState('');
  const [duration, setDuration] = useState('3');

  const handleSend = () => {
    if (!voiceText.trim()) return;
    const durationNum = parseInt(duration) || 3;
    onSend(voiceText, durationNum);
    onClose();
  };

  return (
    <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center animate-in fade-in duration-200">
      <div className="w-[90%] max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3>发送语音消息</h3>
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
            <Label htmlFor="voiceText">语音内容（转文字）</Label>
            <textarea
              id="voiceText"
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              placeholder="输入语音内容..."
              className="w-full min-h-[100px] px-3 py-2 border border-gray-200 rounded-lg resize-none outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">语音时长（秒）</Label>
            <Input
              id="duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="3"
              min="1"
              max="60"
              className="bg-gray-50 border-gray-200"
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
            disabled={!voiceText.trim()}
            className="flex-1 bg-blue-500 hover:bg-blue-600"
          >
            发送
          </Button>
        </div>
      </div>
    </div>
  );
}
