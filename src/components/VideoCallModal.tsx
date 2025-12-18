import { useState, useRef, useEffect } from 'react';
import { Phone, PhoneOff, Volume2, VolumeX, Mic, MicOff, Video, VideoOff, MessageCircle, Minimize2, Maximize2, Send, X } from 'lucide-react';
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
  callType = 'video',
}: VideoCallModalProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'voice');
  const [duration, setDuration] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isVideoOn, setIsVideoOn] = useState(callType === 'video');
  const [startTime, setStartTime] = useState(Date.now());
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [callStartTime] = useState(Date.now());
  const callStartTimeRef = useRef(Date.now());
  const [position, setPosition] = useState({ x: window.innerWidth - 160, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [showQuickReply, setShowQuickReply] = useState(false);
  const [quickReplyText, setQuickReplyText] = useState('');
  const dragStartPos = useRef({ x: 0, y: 0 });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化通话
  useEffect(() => {
    if (isOpen) {
      const now = Date.now();
      setStartTime(now);
      callStartTimeRef.current = now; // 记录通话开始时间
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

  // 拖拽相关函数
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStartPos.current.x;
    const newY = e.clientY - dragStartPos.current.y;
    
    // 限制在窗口范围内
    const maxX = window.innerWidth - 160; // 小窗宽度
    const maxY = window.innerHeight - 120; // 小窗高度
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // 快捷回复处理
  const handleQuickReply = async () => {
    if (!quickReplyText.trim() || isAiTyping) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: quickReplyText.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, newMessage]);
    setQuickReplyText('');
    setShowQuickReply(false);
    setIsAiTyping(true);

    try {
      // 构建上下文（复用原有逻辑）
      const systemPrompt = conversation.characterSettings?.systemPrompt || '你是一个友好的AI助手。';
      
      const now = Date.now();
      const callElapsedMinutes = Math.floor((now - callStartTimeRef.current) / 60000);
      const currentTimeStr = new Date(now).toLocaleString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      let callPrompt = '';

      if (callType === 'video') {
        callPrompt = `\n\n【视频通话模式（Video Call）】
现在你和用户正在视频通话。请像真人聊天一样自然说话。
- 回复的重点是你在说的话，用口语化中文，通常 1–3 句，不要只回 1、2 个字。
- 仅当画面有明显变化时，用 *...* 加一段画面描写（表情变化、头部动作、手势、切换摄像头、环境变化等）。
- 如果画面基本保持不变（角度、表情、环境都差不多），就不要添加画面描写。
- 画面描写要真实自然，有画面感，可以描述：你的长相特征、表情变化、头部动作、手势、周围环境细节、切换前后摄像头看到的景象等。
- 不要写长篇旁白、内心独白或过于玄乎的描述，保持轻松真实的聊天风格。
- 优先根据用户刚才说的话来接话、回应、吐槽或反问。
【时间感知】现在时间是 ${currentTimeStr}，通话已进行 ${callElapsedMinutes} 分钟。请基于真实时间流逝来理解对话节奏。`;
      } else {
        callPrompt = `\n\n【语音通话模式（Voice Call）】
现在你和用户正在语音通话，用户只能听到你的声音：
- 用口语化中文连续说 1–3 句完整的话，保持正常对话长度。除非对方只是"嗯/好/晚安"这类结束语，否则不要只回 1–3 个字。
- 仅在需要时，用 *...* 加一小段声音/环境描写（呼吸声、笑声、背景音乐、信号不好、卡顿等），不要每条都加。
- 不要描述具体画面/动作，除非这些动作会发出能听到的声音（例如 *手机被放到桌子上，发出轻轻一声闷响*）。
- 始终围绕用户刚才说的内容自然接话。
【时间感知】现在时间是 ${currentTimeStr}，通话已进行 ${callElapsedMinutes} 分钟。请基于真实时间流逝来理解对话节奏。`;
      }

      // 构建上下文消息
      const recentGlobalMessages = conversation.messages.slice(-20).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }));
      
      const recentCallMessages = messages.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }));
      
      const contextMessages = [
        { role: 'system', content: systemPrompt + callPrompt },
        ...recentGlobalMessages,
        { role: 'system', content: '--- 以下是通话内的对话 ---' },
        ...recentCallMessages,
        { role: 'user', content: newMessage.content }
      ];

      const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: apiConfig.modelName,
          messages: contextMessages,
          max_tokens: 150,
          temperature: 0.85,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const rawContent = data.choices[0]?.message?.content || (callType === 'video' ? '*网络信号有点不好...*' : '喂？信号似乎不太好...');
      
      const stageMatches = rawContent.match(/\*[^*]+\*/g) || [];
      const stageText = stageMatches.map((s: string) => s.slice(1, -1).trim()).filter(Boolean).join(' ');
      const speechContent = rawContent.replace(/\*[^*]+\*/g, '').trim();

      const aiMessage: Message = {
        content: speechContent || rawContent,
        stageText: stageText || undefined,
        role: 'assistant',
        id: Date.now().toString(),
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI回复失败:', error);
      const errorMessage: Message = {
        content: callType === 'video' ? '*网络信号不好，听不清楚...*' : '信号不太好，能再说一遍吗？',
        role: 'assistant',
        id: Date.now().toString(),
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAiTyping(false);
    }
  };

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
      
      // 时间感知：计算通话开始到现在的真实时间
      const now = Date.now();
      const callElapsedMinutes = Math.floor((now - callStartTimeRef.current) / 60000);
      const currentTimeStr = new Date(now).toLocaleString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      let callPrompt = '';

      if (callType === 'video') {
        callPrompt = `\n\n【视频通话模式（Video Call）】
现在你和用户正在视频通话。请像真人聊天一样自然说话。
- 回复的重点是你在说的话，用口语化中文，通常 1–3 句，不要只回 1、2 个字。
- 仅当画面有明显变化时，用 *...* 加一段画面描写（表情变化、头部动作、手势、切换摄像头、环境变化等）。
- 如果画面基本保持不变（角度、表情、环境都差不多），就不要添加画面描写。
- 画面描写要真实自然，有画面感，可以描述：你的长相特征、表情变化、头部动作、手势、周围环境细节、切换前后摄像头看到的景象等。
- 不要写长篇旁白、内心独白或过于玄乎的描述，保持轻松真实的聊天风格。
- 优先根据用户刚才说的话来接话、回应、吐槽或反问。
【时间感知】现在时间是 ${currentTimeStr}，通话已进行 ${callElapsedMinutes} 分钟。请基于真实时间流逝来理解对话节奏。`;
      } else {
        callPrompt = `\n\n【语音通话模式（Voice Call）】
现在你和用户正在语音通话，用户只能听到你的声音：
- 用口语化中文连续说 1–3 句完整的话，保持正常对话长度。除非对方只是“嗯/好/晚安”这类结束语，否则不要只回 1–3 个字。
- 仅在需要时，用 *...* 加一小段声音/环境描写（呼吸声、笑声、背景音乐、信号不好、卡顿等），不要每条都加。
- 不要描述具体画面/动作，除非这些动作会发出能听到的声音（例如 *手机被放到桌子上，发出轻轻一声闷响*）。
- 始终围绕用户刚才说的内容自然接话。
【时间感知】现在时间是 ${currentTimeStr}，通话已进行 ${callElapsedMinutes} 分钟。请基于真实时间流逝来理解对话节奏。`;
      }

      // 1. 取全局聊天最近 20 条作为上下文（帮助理解为什么发起通话）
      const recentGlobalMessages = conversation.messages.slice(-20).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }));

      // 2. 取通话内最近 10 条
      const recentCallMessages = messages.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }));

      // 3. 组合上下文：先全局（带分隔），再通话，最后当前输入
      const contextMessages = [
        { role: 'system', content: systemPrompt + callPrompt },
        ...recentGlobalMessages,
        { role: 'system', content: '--- 以下是通话内的对话 ---' },
        ...recentCallMessages,
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
        timestamp: Date.now(), // 记录真实发送时间
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

  
  if (!isOpen) return null;

  // 缩小状态：悬浮小窗
  if (isMinimized) {
    return (
      <div 
        className="fixed z-50 bg-gray-900 rounded-lg shadow-2xl border border-gray-700 cursor-move"
        style={{ 
          left: position.x, 
          top: position.y,
          width: '140px',
          height: '100px'
        }}
        onMouseDown={handleMouseDown}
      >
        {/* 拖拽区域 */}
        <div className="absolute inset-0 flex items-center justify-center">
          {conversation.avatar ? (
            <img 
              src={conversation.avatar} 
              alt={conversation.name} 
              className="w-full h-full object-cover rounded-lg opacity-80"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
              {conversation.name[0]}
            </div>
          )}
        </div>
        
        {/* 通话信息 */}
        <div className="absolute top-1 left-1 right-1 text-center">
          <div className="text-white text-xs font-medium truncate">{conversation.name}</div>
          <div className="text-green-400 text-xs flex items-center justify-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            {formatTime(duration)}
          </div>
        </div>
        
        {/* 控制按钮 */}
        <div className="absolute bottom-1 right-1 flex gap-1">
          <button
            onClick={() => setShowQuickReply(!showQuickReply)}
            className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            title="快捷回复"
          >
            <MessageCircle className="w-3 h-3" />
          </button>
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            title="恢复"
          >
            <Minimize2 className="w-3 h-3 rotate-180" />
          </button>
        </div>
        
        {/* AI消息气泡 */}
        {messages.filter(m => m.role === 'assistant').slice(-1).map(msg => (
          <div 
            key={msg.id}
            className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap max-w-[120px] truncate"
          >
            {msg.content}
            {msg.stageText && (
              <div className="text-yellow-300/80 italic text-xs">
                {msg.stageText}
              </div>
            )}
          </div>
        ))}
        
        {/* 快捷回复输入框 */}
        {showQuickReply && (
          <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-gray-800 rounded-lg border border-gray-600">
            <div className="flex gap-1">
              <input
                type="text"
                value={quickReplyText}
                onChange={(e) => setQuickReplyText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleQuickReply()}
                placeholder="快捷回复..."
                className="flex-1 bg-gray-700 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleQuickReply}
                disabled={!quickReplyText.trim() || isAiTyping}
                className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                <Send className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  setShowQuickReply(false);
                  setQuickReplyText('');
                }}
                className="p-1 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
        
        {/* 说话状态指示 */}
        {isAiTyping && (
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
            <div className="text-green-400 text-xs flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              说话中...
            </div>
          </div>
        )}
      </div>
    );
  }

  // ------------------------------------------
  // 全屏通话模式
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
             {/* AI角色显示 */}
             {(() => {
               const videoCallSettings = conversation.characterSettings?.callSettings?.videoCall;
               const displayMode = videoCallSettings?.aiDisplayMode || 'avatar';
               
               if (displayMode === 'custom' && videoCallSettings?.customVideoUrl) {
                 return (
                   <img 
                     src={videoCallSettings.customVideoUrl} 
                     alt={conversation.name} 
                     className="w-full h-full object-cover" 
                   />
                 );
               } else if (displayMode === 'animated' && videoCallSettings?.customVideoUrl) {
                 return (
                   <img 
                     src={videoCallSettings.customVideoUrl} 
                     alt={conversation.name} 
                     className="w-full h-full object-cover animate-pulse" 
                   />
                 );
               } else {
                 // 默认头像模式
                 return conversation.avatar ? (
                   <img 
                     src={conversation.avatar} 
                     alt={conversation.name} 
                     className="w-full h-full object-cover" 
                   />
                 ) : (
                   <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-4xl font-bold">
                     {conversation.name[0]}
                   </div>
                 );
               }
             })()}
             
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
            {(() => {
              const voiceCallSettings = conversation.characterSettings?.callSettings?.voiceCall;
              const backgroundEffect = voiceCallSettings?.backgroundEffect || 'blur';
              
              if (backgroundEffect === 'custom' && voiceCallSettings?.customBackgroundUrl) {
                return (
                  <div 
                    className="absolute inset-0 bg-cover bg-center opacity-30"
                    style={{ backgroundImage: `url(${voiceCallSettings.customBackgroundUrl})` }}
                  />
                );
              } else if (backgroundEffect === 'gradient') {
                return (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-teal-500 opacity-40" />
                );
              } else {
                // 默认模糊背景
                return conversation.avatar && (
                  <div 
                    className="absolute inset-0 bg-cover bg-center opacity-30 blur-xl transform scale-110"
                    style={{ backgroundImage: `url(${conversation.avatar})` }}
                  />
                );
              }
            })()}
            
            <div className="relative z-10 flex flex-col items-center">
              <div className={`w-40 h-40 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl relative ${(() => {
                const voiceCallSettings = conversation.characterSettings?.callSettings?.voiceCall;
                const animation = voiceCallSettings?.avatarAnimation || 'none';
                if (animation === 'pulse') return 'animate-pulse';
                if (animation === 'rotate') return 'animate-spin';
                if (animation === 'bounce') return 'animate-bounce';
                return '';
              })()}`}>
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
          (() => {
            const videoCallSettings = conversation.characterSettings?.callSettings?.videoCall;
            const showUserAvatar = videoCallSettings?.userViewSettings?.showUserAvatar ?? true;
            const avatarSize = videoCallSettings?.userViewSettings?.userAvatarSize || 'small';
            const avatarPosition = videoCallSettings?.userViewSettings?.userAvatarPosition || 'top-right';
            
            if (!showUserAvatar) return null;
            
            // 根据大小设置样式
            const sizeClasses = {
              small: 'w-28 h-40',
              medium: 'w-32 h-48',
              large: 'w-40 h-56'
            };
            
            // 根据位置设置样式
            const positionClasses = {
              'top-left': 'top-4 left-4',
              'top-right': 'top-4 right-4',
              'bottom-left': 'bottom-4 left-4',
              'bottom-right': 'bottom-4 right-4'
            };
            
            return (
              <div className={`absolute ${positionClasses[avatarPosition]} ${sizeClasses[avatarSize]} bg-gray-800 rounded-xl border border-white/20 overflow-hidden shadow-lg z-20`}>
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
            );
          })()
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
              {isVideoOn ? <Video className="w-7 h-7" /> : <VideoOff className="w-7 h-7" />}
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
