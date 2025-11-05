import { useState } from 'react';
import { X } from 'lucide-react';

interface StatusSelectorProps {
  currentStatus: string;
  onSelectStatus: (status: string) => void;
  onClose: () => void;
}

// 精简的状态列表
const STATUS_OPTIONS = [
  { emoji: '🟢', label: '在线' },
  { emoji: '😪', label: '困困' },
  { emoji: '⚪', label: '离开' },
  { emoji: '🔴', label: '忙碌' },
  { emoji: '🚫', label: '不想被打扰' },
  { emoji: '😴', label: '隐身' },
  { emoji: '🍚', label: '吃饭中' },
  { emoji: '🎵', label: '听歌中' },
  { emoji: '🎓', label: '出去玩' },
  { emoji: '✈️', label: '旅行中' },
];

export default function StatusSelector({ currentStatus, onSelectStatus, onClose }: StatusSelectorProps) {
  const [customStatus, setCustomStatus] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleCustomSubmit = () => {
    if (customStatus.trim() && customStatus.trim().length <= 10) {
      onSelectStatus(customStatus.trim());
      onClose();
    }
  };

  return (
    <>
      {/* 遮罩层 */}
      <div 
        className="fixed inset-0 z-50 bg-black/30"
        onClick={onClose}
      ></div>
      
      {/* 弹窗 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-80 max-h-[70vh] overflow-hidden pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">选择状态</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {/* Status Options */}
            <div className="space-y-1">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status.label}
                  onClick={() => {
                    onSelectStatus(status.label);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    currentStatus === status.label
                      ? 'bg-blue-50 text-blue-600'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="text-xl">{status.emoji}</span>
                  <span className="text-sm font-medium">{status.label}</span>
                  {currentStatus === status.label && (
                    <span className="ml-auto text-blue-600">✓</span>
                  )}
                </button>
              ))}

              {/* 自定义状态 */}
              <div className="pt-2 mt-2 border-t border-gray-200">
                {!showCustomInput ? (
                  <button
                    onClick={() => setShowCustomInput(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                  >
                    <span className="text-xl">✏️</span>
                    <span className="text-sm font-medium">自定义状态</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customStatus}
                        onChange={(e) => {
                          if (e.target.value.length <= 10) {
                            setCustomStatus(e.target.value);
                          }
                        }}
                        placeholder="输入状态（10字以内）"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={handleCustomSubmit}
                        disabled={!customStatus.trim()}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        确定
                      </button>
                    </div>
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs text-gray-500">
                        {customStatus.length}/10
                      </span>
                      <button
                        onClick={() => {
                          setShowCustomInput(false);
                          setCustomStatus('');
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
