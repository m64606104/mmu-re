import { useState, useRef, useEffect } from 'react';
import { X, Mic, Send, AlertCircle } from 'lucide-react';

interface VoiceMessageDialogProps {
  onClose: () => void;
  onSend: (voiceText: string, duration: number) => void;
}

export function VoiceMessageDialog({ onClose, onSend }: VoiceMessageDialogProps) {
  const [voiceText, setVoiceText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');

  // 检测语音识别支持
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
  }, []);

  // 开始录音（真实语音识别）
  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert('您的浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'zh-CN';
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
        setRecordDuration(0);
        finalTranscriptRef.current = '';
        
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
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // 只追加新的最终文本
        if (finalTranscript) {
          finalTranscriptRef.current += finalTranscript;
          setVoiceText(finalTranscriptRef.current);
        } else if (interimTranscript) {
          // 只有临时结果，显示在已确认文本后面
          setVoiceText(finalTranscriptRef.current + interimTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('语音识别错误:', event.error);
        
        if (event.error === 'not-allowed') {
          alert('麦克风权限被拒绝，请在浏览器设置中允许麦克风访问');
        } else if (event.error === 'network') {
          alert('网络错误，语音识别服务不可用');
        }
        
        stopRecording();
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error('启动语音识别失败:', error);
      alert('语音识别启动失败，请重试');
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // 清理
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
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

        {/* 浏览器不支持提示 */}
        {!speechSupported && (
          <div className="mx-6 mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-yellow-800">
              <p className="font-medium mb-1">语音识别不可用</p>
              <p className="text-xs">请使用 Chrome 或 Edge 浏览器以获得最佳体验</p>
            </div>
          </div>
        )}

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
                  disabled={!speechSupported}
                  className={`w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-all ${
                    speechSupported
                      ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 hover:shadow-xl active:scale-95'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
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
            {!speechSupported 
              ? '浏览器不支持语音识别，请手动输入文字'
              : isRecording 
                ? '点击停止结束录音' 
                : '点击麦克风开始录音，说话会实时转文字，录音完成后可编辑'}
          </div>
        </div>
      </div>
    </div>
  );
}
