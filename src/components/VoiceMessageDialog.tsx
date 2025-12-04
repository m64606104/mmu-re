import { useState, useRef, useEffect } from 'react';
import { X, Mic, Send } from 'lucide-react';

interface VoiceMessageDialogProps {
  onClose: () => void;
  onSend: (voiceText: string, duration: number) => void;
}

export function VoiceMessageDialog({ onClose, onSend }: VoiceMessageDialogProps) {
  const [voiceText, setVoiceText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 开始录音
  const startRecording = () => {
    setIsRecording(true);
    setRecordDuration(0);
    
    // 开始计时
    timerRef.current = setInterval(() => {
      setRecordDuration(prev => {
        if (prev >= 60) {
          stopRecording();
          return 60;
        }
        return prev + 1;
      });
    }, 1000);

    // 模拟实时转文字（每秒添加一些文字）
    let textIndex = 0;
    const simulatedTexts = [
      '嗯',
      '今天',
      '天气',
      '真不错',
      '要不要',
      '一起',
      '出去',
      '玩'
    ];
    
    const textTimer = setInterval(() => {
      if (textIndex < simulatedTexts.length) {
        setVoiceText(prev => prev + (prev ? ' ' : '') + simulatedTexts[textIndex]);
        textIndex++;
      }
    }, 800);

    // 保存计时器引用以便清理
    (timerRef.current as any).textTimer = textTimer;
  };

  // 停止录音
  const stopRecording = () => {
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      if ((timerRef.current as any).textTimer) {
        clearInterval((timerRef.current as any).textTimer);
      }
      timerRef.current = null;
    }
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        if ((timerRef.current as any).textTimer) {
          clearInterval((timerRef.current as any).textTimer);
        }
      }
    };
  }, []);

  const handleSend = () => {
    if (!voiceText.trim()) return;
    onSend(voiceText, Math.max(recordDuration, 3));
    onClose();
  };

  return (
    <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center animate-in fade-in duration-200">
      <div className="w-[90%] max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-medium">语音消息</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 文字编辑区 */}
        <div className="px-6 py-5">
          <div className="relative">
            <textarea
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              placeholder={isRecording ? "正在实时转文字..." : "点击下方按钮开始录音"}
              className="w-full min-h-[120px] px-4 py-3 border-2 border-gray-200 rounded-2xl resize-none outline-none focus:border-blue-500 transition-colors bg-gray-50 text-gray-900 text-[15px] leading-relaxed"
              disabled={isRecording}
            />
            {isRecording && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-500 text-white px-2.5 py-1 rounded-full text-xs animate-pulse">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                <span>录音中</span>
              </div>
            )}
          </div>
        </div>

        {/* 录音按钮和时长显示 */}
        <div className="px-6 pb-6 space-y-4">
          {/* 时长显示 */}
          {recordDuration > 0 && (
            <div className="text-center text-sm text-gray-500">
              录音时长: {recordDuration}" / 60"
            </div>
          )}

          {/* 录音按钮 */}
          <div className="flex items-center justify-center gap-3">
            {!isRecording ? (
              <>
                <button
                  onClick={startRecording}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl flex items-center justify-center transition-all active:scale-95"
                >
                  <Mic className="w-7 h-7 text-white" strokeWidth={2.5} />
                </button>
                {voiceText.trim() && (
                  <button
                    onClick={handleSend}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full shadow-md hover:shadow-lg flex items-center gap-2 transition-all active:scale-95 font-medium"
                  >
                    <Send className="w-4 h-4" />
                    <span>发送</span>
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={stopRecording}
                className="px-8 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-full shadow-lg flex items-center gap-2 transition-all active:scale-95 font-medium"
              >
                <div className="w-3 h-3 bg-white rounded-sm"></div>
                <span>停止</span>
              </button>
            )}
          </div>

          {/* 提示文字 */}
          <div className="text-center text-xs text-gray-400">
            {isRecording ? '松开停止录音' : '点击麦克风开始录音，录音完成后可编辑文字'}
          </div>
        </div>
      </div>
    </div>
  );
}
