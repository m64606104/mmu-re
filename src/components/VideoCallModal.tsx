import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Send, Maximize2, Minimize2, Volume2 } from 'lucide-react';
import { Conversation, Message, ApiConfig, CallLog, UserProfile } from '../types';

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  currentUserProfile?: UserProfile;
  apiConfig: ApiConfig;
  onSaveCallLog: (log: CallLog) => void;
  callType?: 'video' | 'voice';
}

export default function VideoCallModal({
  isOpen,
  onClose,
  conversation,
  currentUserProfile,
  apiConfig,
  onSaveCallLog,
  callType = 'video'
}: VideoCallModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(callType === 'video');
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [isAiTyping, setIsAiTyping] = useState(false);
  
  // 悬浮窗状态
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 160, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化通话
  useEffect(() => {
    if (isOpen) {
      setStartTime(Date.now());
      setDuration(0);
      setMessages([]); 
      setIsVideoOn(callType === 'video');
      setIsMinimized(false); // 每次打开重置为全屏
      
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      
      // 移除自动开场白，等待用户先说话
      setMessages([]);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isOpen, callType]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiTyping]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isAiTyping) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setIsAiTyping(true);

    try {
      // 构建上下文
      const systemPrompt = conversation.characterSettings?.systemPrompt || '你是一个友好的AI助手。';
      let callPrompt = '';
      
      if (callType === 'video') {
        callPrompt = `\n\n【重要指令：视频通话模式（Video Call）】
现在你正在和用户进行视频通话。这是一个实时的、高沉浸感的视频场景。
请不要只回复对话内容，**必须**在回复中穿插大量的、极具画面感的描写（放在 * * 中）。

描写要求（必须包含以下要素的组合）：
1. **环境与氛围**：描述你身边的光影变化、背景声音、天气或氛围。
   - ❌ 错误：*在房间里*
   - ✅ 正确：*午后的阳光透过窗帘缝隙洒在脸上，空气中漂浮着细小的尘埃，身后传来窗外隐约的蝉鸣声*
2. **镜头互动**：把屏幕当做镜头，描述你与镜头的距离、角度变化。
   - ✅ 正确：*突然凑近镜头，整张脸占据了屏幕，甚至能看清颤动的睫毛，好奇地盯着你看*
   - ✅ 正确：*不好意思地把手机拿远了一些，整理了一下被风吹乱的刘海*
3. **神态与微表情**：描述眼神的流转、嘴角的弧度、眉毛的挑动。
   - ✅ 正确：*眼神瞬间亮了起来，嘴角抑制不住地上扬，露出了浅浅的梨涡*
4. **动作细节**：手部动作、身体姿态的细微调整。

请结合你当前的人设（性格、外貌、当前所处环境），用**括号包裹的描写**来主导回复的节奏。让用户感觉这不仅仅是文字，而是一个鲜活的、有呼吸感的视频画面。`;
      } else {
        callPrompt = `\n\n【重要指令：语音通话模式（Voice Call）】
现在你正在和用户进行语音通话。用户**看不到**你，只能**听到**你的声音和环境音。
1. **听觉描写**：重点描述声音的质感、语气、呼吸声以及背景环境音（环境音放在 * * 中）。
   - ✅ 正确：*听筒里传来轻微的电流声和远处的海浪声* 喂？
   - ✅ 正确：*轻轻叹了一口气，声音听起来有些慵懒沙哑* 刚才睡着了...
2. **语气描写**：描述说话时的语调（上扬、低沉、轻快）。
3. **禁止视觉描写**：绝对不要描述动作（如点头、挥手），除非这些动作发出了声音（如拍手、敲桌子）。`;
      }

      const contextMessages = [
        { role: 'system', content: systemPrompt + callPrompt },
        ...messages.slice(-10).map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        })),
        { role: 'user', content: newMessage.content }
      ];

      // 调用 API
      const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: apiConfig.modelName,
          messages: contextMessages,
          temperature: 0.85, // 提高温度增加随机性和自然度
          max_tokens: 150
        })
      });

      if (!response.ok) throw new Error('API Error');

      const data = await response.json();
      const rawContent = data.choices[0]?.message?.content || (callType === 'video' ? '*网络信号有点不好...*' : '喂？信号好像不太好...');
      const stageMatches = rawContent.match(/\*[^*]+\*/g) || [];
      const stageText = stageMatches
        .map((s: string) => s.slice(1, -1).trim())
        .filter(Boolean)
        .join(' ');
      const speechContent = rawContent.replace(/\*[^*]+\*/g, '').trim();

      const aiMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: speechContent || rawContent,
        timestamp: Date.now(),
        stageText: stageText || undefined
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI generate error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '(系统错误) 信号中断',
        timestamp: Date.now()
      }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleHangUp = () => {
    // 保存记录
    const callLog: CallLog = {
      id: Date.now().toString(),
      type: callType,
      startTime: startTime,
      endTime: Date.now(),
      duration: duration,
      transcript: messages
    };
    onSaveCallLog(callLog);
    onClose();
  };

  // 拖拽事件处理
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isMinimized) return;
    e.preventDefault(); // 防止选中文本
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!isOpen) return null;

  // ------------------------------------------
  // 最小化悬浮窗模式
  // ------------------------------------------
  if (isMinimized) {
    return (
      <div 
        className="fixed z-[100] w-32 h-48 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 cursor-move transition-transform active:scale-95 bg-black"
        style={{ left: position.x, top: position.y }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => {
            if (!isDragging) setIsMinimized(false); 
        }}
      >
        {/* 背景 */}
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
           {conversation.avatar ? (
             <img src={conversation.avatar} className="w-full h-full object-cover opacity-80" />
           ) : (
             <div className="text-white text-2xl font-bold">{conversation.name[0]}</div>
           )}
           
           {/* 语音模式遮罩 */}
           {callType === 'voice' && (
             <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
               <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse">
                 <PhoneOff className="w-6 h-6 text-green-500 rotate-135" />
               </div>
             </div>
           )}
        </div>
        
        {/* 覆盖层信息 */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 flex flex-col justify-between p-3">
           <div className="self-end">
             <Maximize2 className="w-4 h-4 text-white/80 drop-shadow-md" />
           </div>
           <div>
             <div className="text-white text-xs font-medium truncate shadow-black drop-shadow-md">{conversation.name}</div>
             <div className="text-green-400 text-[10px] font-mono mt-0.5">{formatTime(duration)}</div>
           </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------
  // 全屏模式
  // ------------------------------------------
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col h-full w-full overflow-hidden">
      {/* 最小化按钮 */}
      <button 
        onClick={() => setIsMinimized(true)}
        className="absolute top-4 left-4 p-2 bg-black/20 text-white rounded-full z-50 hover:bg-black/40 backdrop-blur-md transition-all"
      >
        <Minimize2 className="w-6 h-6" />
      </button>

      {/* 背景层 */}
      <div className="absolute inset-0 z-0 flex items-center justify-center bg-gray-900">
        {callType === 'video' ? (
          // 视频模式：全屏铺满
          <div className="absolute inset-0 w-full h-full">
             {conversation.avatar ? (
               <img 
                 src={conversation.avatar} 
                 alt={conversation.name} 
                 className="w-full h-full object-cover" 
               />
             ) : (
               <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-4xl font-bold">
                 {conversation.name[0]}
               </div>
             )}
             {/* 视频通话时的全屏遮罩 */}
             <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
             
             {/* 说话状态指示 (全屏微弱呼吸) */}
             {isAiTyping && (
               <div className="absolute inset-0 bg-black/10 animate-pulse" />
             )}
          </div>
        ) : (
          // 语音模式：保留原有的模糊背景+中间头像
          <>
            {conversation.avatar && (
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-30 blur-xl transform scale-110"
                style={{ backgroundImage: `url(${conversation.avatar})` }}
              />
            )}
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl relative">
                {conversation.avatar ? (
                  <img 
                    src={conversation.avatar} 
                    alt={conversation.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-4xl font-bold">
                    {conversation.name[0]}
                  </div>
                )}
                
                {/* 语音模式下的波纹动画 */}
                {isAiTyping && (
                  <>
                    <div className="absolute inset-0 border-4 border-green-400/50 rounded-full animate-ping" />
                    <div className="absolute inset-0 border-4 border-green-400/30 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
                  </>
                )}
              </div>
              
              <h2 className="mt-6 text-white text-2xl font-semibold shadow-black drop-shadow-md tracking-wide">
                {conversation.name}
              </h2>
              <div className="flex items-center gap-2 mt-2 text-white/70">
                <Volume2 className="w-4 h-4" />
                <p className="text-sm font-mono tracking-wider">{formatTime(duration)}</p>
              </div>
              
              <p className="text-white/50 text-sm mt-4 animate-pulse">
                {isAiTyping ? '对方正在说话...' : '通话中'}
              </p>
            </div>
          </>
        )}

        {/* 用户小窗口 (仅视频模式显示) */}
        {callType === 'video' && (
          <div className="absolute top-4 right-4 w-28 h-40 bg-gray-800 rounded-xl border border-white/20 overflow-hidden shadow-lg z-20">
            {currentUserProfile?.avatar ? (
              <img src={currentUserProfile.avatar} alt="Me" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-700 text-white/50 text-xs">
                无摄像头
              </div>
            )}
            <div className="absolute bottom-1 left-0 right-0 text-center text-[10px] text-white/80 bg-black/30">
              我
            </div>
          </div>
        )}
      </div>

      {/* 弹幕/对话层 */}
      <div className="absolute inset-0 z-30 flex flex-col pointer-events-none">
        {/* 增加了 pb-48 以防止气泡被遮挡 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 mt-24 pb-64 pointer-events-auto mask-linear-fade scrollbar-hide">
          {/* 接通提示 */}
          <div className="flex justify-center my-4">
             <div className="bg-black/30 text-white/70 px-4 py-1 rounded-full text-xs backdrop-blur-sm">
               {callType === 'video' ? '视频通话已接通' : '语音通话已接通'}
             </div>
          </div>
          
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] px-4 py-2 rounded-2xl backdrop-blur-md text-sm shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-blue-500/40 text-white border border-blue-400/30' 
                    : 'bg-black/40 text-white border border-white/10'
                }`}
              >
                {/* 解析动作描述并高亮 */}
                {msg.stageText && (
                  <span className="block text-yellow-300/80 italic mb-1 text-xs">
                    {msg.stageText}
                  </span>
                )}
                <span>{msg.content}</span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 底部控制栏 */}
      <div className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/90 via-black/60 to-transparent pb-8 pt-12 px-4">
        {/* 输入框 */}
        <div className="flex items-center gap-2 mb-8 max-w-md mx-auto w-full">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="输入文字聊天..."
            className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-3 text-white placeholder-white/40 focus:outline-none focus:bg-white/20 transition-all shadow-lg"
          />
          <button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isAiTyping}
            className={`p-3 rounded-full shadow-lg ${
              inputValue.trim() && !isAiTyping 
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-white/10 text-white/30'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* 控制按钮 */}
        <div className="flex justify-center items-center gap-10">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={`p-4 rounded-full transition-all backdrop-blur-sm ${
              isMuted ? 'bg-white text-gray-900' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            }`}
          >
            {isMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
          </button>

          <button 
            onClick={handleHangUp}
            className="p-6 rounded-full bg-red-500 text-white hover:bg-red-600 transform hover:scale-105 transition-all shadow-lg shadow-red-500/40 ring-4 ring-red-500/20"
          >
            <PhoneOff className="w-9 h-9 fill-current" />
          </button>

          {callType === 'video' ? (
            <button 
              onClick={() => setIsVideoOn(!isVideoOn)}
              className={`p-4 rounded-full transition-all backdrop-blur-sm ${
                !isVideoOn ? 'bg-white text-gray-900' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
              }`}
            >
              {isVideoOn ? <VideoIcon className="w-7 h-7" /> : <VideoOff className="w-7 h-7" />}
            </button>
          ) : (
            <div className="w-[60px]" /> // 占位符，保持布局平衡
          )}
        </div>
        
        <div className="text-center mt-4 text-white/30 text-xs">
          {callType === 'video' ? '视频通话中' : '语音通话中'}
        </div>
      </div>
    </div>
  );
}
