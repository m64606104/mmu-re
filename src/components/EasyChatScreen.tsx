import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Plus, Image as ImageIcon, Video as VideoIcon, Mic, Send, X } from 'lucide-react';
import { save, load } from '../utils/storage';

interface EasyChatScreenProps {
  onBack: () => void;
}

interface EasyChatParticipant {
  id: string;
  name: string;
  avatar: string;
}

type EasyChatMessageType = 'text' | 'image' | 'video' | 'voice';

interface EasyChatMessage {
  id: string;
  senderId: string;
  type: EasyChatMessageType;
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  voiceTranscript?: string;
  timestamp: number;
}

interface EasyChatConversation {
  id: string;
  type: 'private' | 'group';
  name: string;
  avatar: string;
  participants: EasyChatParticipant[];
  messages: EasyChatMessage[];
  lastMessage?: string;
  lastMessageTime?: number;
}

interface EasyChatUser {
  id: string;
  name: string;
  avatar: string;
}

const CONV_KEY = 'easychat_conversations';

const formatHM = (ts: number) => {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const getSummary = (msg: EasyChatMessage) => {
  if (msg.type === 'text') return msg.text || '';
  if (msg.type === 'image') return '[图片]';
  if (msg.type === 'video') return '[视频]';
  if (msg.type === 'voice') return '[语音]';
  return '';
};

export default function EasyChatScreen({ onBack }: EasyChatScreenProps) {
  const [user] = useState<EasyChatUser>({ id: 'me', name: '我', avatar: '😊' });
  const [conversations, setConversations] = useState<EasyChatConversation[]>([]);
  const [view, setView] = useState<'list' | 'room'>('list');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [currentSenderId, setCurrentSenderId] = useState<string>('me');
  const [showSenderPicker, setShowSenderPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inited, setInited] = useState(false);

  const [textInput, setTextInput] = useState('');
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newType, setNewType] = useState<'private' | 'group'>('private');
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState('👤');
  const [newParticipants, setNewParticipants] = useState<EasyChatParticipant[]>([]);
  const [newPName, setNewPName] = useState('');
  const [newPAvatar, setNewPAvatar] = useState('👤');

  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const speechRef = useRef<any>(null);
  const finalRef = useRef('');
  const [expandedVoiceIds, setExpandedVoiceIds] = useState<string[]>([]);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(!!SR);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const stored = await load(CONV_KEY);
        if (!cancelled && stored && Array.isArray(stored)) {
          setConversations(stored as EasyChatConversation[]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setInited(true);
        }
      }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!inited) return;
    const id = setTimeout(() => save(CONV_KEY, conversations), 300);
    return () => clearTimeout(id);
  }, [conversations, inited]);

  const activeConv = conversations.find(c => c.id === activeId) || null;

  useEffect(() => {
    if (view === 'room') messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [view, activeId, activeConv?.messages.length]);

  const updateConversation = useCallback((id: string, fn: (c: EasyChatConversation) => EasyChatConversation) => {
    setConversations(prev => prev.map(c => (c.id === id ? fn(c) : c)));
  }, []);

  const shouldShowTime = (msgs: EasyChatMessage[], idx: number) => {
    if (idx === 0) return true;
    return Math.abs(msgs[idx].timestamp - msgs[idx - 1].timestamp) / (1000 * 60) >= 5;
  };

  const getSenderInfo = (senderId: string, conv: EasyChatConversation | null) => {
    if (!conv) return { name: '', avatar: '', isMe: false };
    if (senderId === user.id) return { name: user.name, avatar: user.avatar, isMe: true };
    const p = conv.participants.find(pp => pp.id === senderId);
    return { name: p?.name || '未知', avatar: p?.avatar || '👤', isMe: false };
  };

  const handleSendText = () => {
    if (!activeConv) return;
    const text = textInput.trim();
    if (!text) return;
    const now = Date.now();
    const msg: EasyChatMessage = {
      id: `m_${now}_${Math.random().toString(36).slice(2, 6)}`,
      senderId: currentSenderId,
      type: 'text',
      text,
      timestamp: now,
    };
    updateConversation(activeConv.id, c => ({
      ...c,
      messages: [...c.messages, msg],
      lastMessage: getSummary(msg),
      lastMessageTime: now,
    }));
    setTextInput('');
  };

  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeConv) return;
    if (!file.type.startsWith('image/')) { alert('请选择图片文件'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('图片不能超过5MB'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      const now = Date.now();
      const msg: EasyChatMessage = {
        id: `m_${now}_${Math.random().toString(36).slice(2, 6)}`,
        senderId: currentSenderId,
        type: 'image',
        imageUrl: url,
        timestamp: now,
      };
      updateConversation(activeConv.id, c => ({
        ...c,
        messages: [...c.messages, msg],
        lastMessage: getSummary(msg),
        lastMessageTime: now,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleVideoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeConv) return;
    if (!file.type.startsWith('video/')) { alert('请选择视频文件'); return; }
    if (file.size > 20 * 1024 * 1024) { alert('视频不能超过20MB'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      const now = Date.now();
      const msg: EasyChatMessage = {
        id: `m_${now}_${Math.random().toString(36).slice(2, 6)}`,
        senderId: currentSenderId,
        type: 'video',
        videoUrl: url,
        timestamp: now,
      };
      updateConversation(activeConv.id, c => ({
        ...c,
        messages: [...c.messages, msg],
        lastMessage: getSummary(msg),
        lastMessageTime: now,
      }));
    };
    reader.readAsDataURL(file);
  };

  const startSpeech = () => {
    try {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) return;
      const rec = new SR();
      rec.lang = 'zh-CN';
      rec.continuous = true;
      rec.interimResults = true;
      setIsRecognizing(true);
      finalRef.current = '';
      setVoiceText('');
      rec.onresult = (event: any) => {
        let interim = '', final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) final += t; else interim += t;
        }
        if (final) {
          finalRef.current += final;
          setVoiceText(finalRef.current);
        } else if (interim) {
          setVoiceText(finalRef.current + interim);
        }
      };
      rec.onerror = () => setIsRecognizing(false);
      rec.onend = () => setIsRecognizing(false);
      speechRef.current = rec;
      rec.start();
    } catch {
      setIsRecognizing(false);
    }
  };

  const stopSpeech = () => {
    if (speechRef.current) { speechRef.current.stop(); speechRef.current = null; }
    setIsRecognizing(false);
  };

  const handleVoiceClick = () => {
    if (!activeConv) return;
    setShowVoiceModal(true);
    setVoiceText('');
    finalRef.current = '';
    if (speechSupported) startSpeech();
  };

  const handleSendVoice = () => {
    if (!activeConv) return;
    const text = voiceText.trim();
    if (!text) return;
    stopSpeech();
    const now = Date.now();
    const msg: EasyChatMessage = {
      id: `m_${now}_${Math.random().toString(36).slice(2, 6)}`,
      senderId: currentSenderId,
      type: 'voice',
      voiceTranscript: text,
      timestamp: now,
    };
    updateConversation(activeConv.id, c => ({
      ...c,
      messages: [...c.messages, msg],
      lastMessage: getSummary(msg),
      lastMessageTime: now,
    }));
    setShowVoiceModal(false);
    setVoiceText('');
    finalRef.current = '';
  };

  const handleCancelVoice = () => {
    stopSpeech();
    setShowVoiceModal(false);
    setVoiceText('');
    finalRef.current = '';
  };

  const toggleVoice = (id: string) => {
    setExpandedVoiceIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const openConversation = (id: string) => {
    setActiveId(id);
    setCurrentSenderId('me');
    setView('room');
  };

  const backFromRoom = () => {
    setView('list');
    setActiveId(null);
    setCurrentSenderId('me');
  };

  
  const selectSender = (id: string) => {
    setCurrentSenderId(id);
    setShowSenderPicker(false);
  };

  const startCreate = () => {
    setShowCreate(true);
    setNewType('private');
    setNewName('');
    setNewAvatar('👤');
    setNewParticipants([]);
    setNewPName('');
    setNewPAvatar('👤');
  };

  const addParticipant = () => {
    const name = newPName.trim();
    if (!name) return;
    const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    setNewParticipants(prev => [...prev, { id, name, avatar: newPAvatar || '👤' }]);
    setNewPName('');
    setNewPAvatar('👤');
  };

  const removeParticipant = (id: string) => {
    setNewParticipants(prev => prev.filter(p => p.id !== id));
  };

  const createConversation = () => {
    const name = newName.trim();
    if (!name) { alert('请输入名称'); return; }
    let parts: EasyChatParticipant[] = [];
    if (newType === 'private') {
      const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
      parts = [{ id, name, avatar: newAvatar || '👤' }];
    } else {
      if (newParticipants.length < 2) { alert('群聊至少需要2个成员'); return; }
      parts = newParticipants;
    }
    const now = Date.now();
    const conv: EasyChatConversation = {
      id: `c_${now}_${Math.random().toString(36).slice(2, 5)}`,
      type: newType,
      name,
      avatar: newType === 'private' ? (parts[0]?.avatar || '👤') : (newAvatar || '👥'),
      participants: parts,
      messages: [],
    };
    setConversations(prev => [...prev, conv]);
    setShowCreate(false);
    setActiveId(conv.id);
    setCurrentSenderId('me');
    setView('room');
  };

  const sorted = [...conversations].sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-white">
        <div className="h-14 flex items-center px-4 border-b border-gray-200 bg-white/80">
          <button onClick={onBack} className="p-1 mr-2"><ArrowLeft className="w-5 h-5" /></button>
          <span className="font-medium">Easy Chat</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-white relative">
      <div className="h-14 flex items-center px-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <button onClick={onBack} className="p-1 mr-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-medium flex-1">Easy Chat</span>
        {view === 'list' && (
          <button onClick={startCreate} className="p-1 rounded-full hover:bg-gray-100">
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {view === 'list' && (
        <div className="flex-1 overflow-y-auto">
          {sorted.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm px-8">
              <div className="mb-4 text-5xl">💬</div>
              <div className="mb-2">还没有会话</div>
              <div className="text-center">点击右上角 + 开始创建聊天</div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 bg-white/60">
              {sorted.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => openConversation(conv.id)}
                  className="w-full flex items-center px-4 py-3 hover:bg-gray-50 text-left"
                >
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white mr-3 overflow-hidden flex-shrink-0">
                    {conv.avatar.startsWith('data:') ? (
                      <img src={conv.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">{conv.avatar}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-medium truncate">{conv.name}</span>
                      {conv.lastMessageTime && (
                        <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{formatHM(conv.lastMessageTime)}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{conv.lastMessage || '暂无消息'}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'room' && activeConv && (
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-2 border-b border-gray-100 bg-white/80 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={backFromRoom} className="p-1 mr-1 rounded-full hover:bg-gray-100">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="font-medium">{activeConv.name}</span>
            </div>
            {/* 简化的说话人提示 */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/50">
              <span className="text-xs text-gray-600">说话人</span>
              <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-xs">
                <span className="text-xs">{getSenderInfo(currentSenderId, activeConv).avatar}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-gradient-to-b from-gray-50 to-gray-100">
            {activeConv.messages.map((m, idx) => {
              const info = getSenderInfo(m.senderId, activeConv);
              const isMe = info.isMe;
              const showTime = shouldShowTime(activeConv.messages, idx);
              const isVoiceExpanded = expandedVoiceIds.includes(m.id);
              return (
                <div key={m.id}>
                  {showTime && <div className="text-center text-[10px] text-gray-400 mb-1">{formatHM(m.timestamp)}</div>}
                  <div className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {!isMe && <div className="text-xl flex-shrink-0">{info.avatar}</div>}
                    <div className={`max-w-[70%] space-y-1 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className="text-[10px] text-gray-400">{info.name}</div>
                      {m.type === 'text' && (
                        <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-blue-500 text-white' : 'bg-white'}`}>
                          {m.text}
                        </div>
                      )}
                      {m.type === 'image' && m.imageUrl && (
                        <img src={m.imageUrl} alt="" className="max-w-[200px] rounded-2xl border border-gray-200" />
                      )}
                      {m.type === 'video' && m.videoUrl && (
                        <video src={m.videoUrl} className="max-w-[220px] rounded-2xl border border-gray-200" controls />
                      )}
                      {m.type === 'voice' && (
                        <div className="space-y-1">
                          <button
                            onClick={() => toggleVoice(m.id)}
                            className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-gray-50 text-sm text-gray-700 min-w-[120px] hover:bg-gray-100"
                          >
                            <Mic className="w-4 h-4 text-gray-500" />
                            <span className="text-xs">语音（点此查看）</span>
                          </button>
                          {isVoiceExpanded && m.voiceTranscript && (
                            <div className="px-3 py-2 rounded-2xl bg-white text-xs text-gray-700 border border-gray-100 whitespace-pre-wrap max-w-[220px]">
                              {m.voiceTranscript}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {isMe && <div className="text-xl flex-shrink-0">{info.avatar}</div>}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm">
            {/* 当前说话者显示 - 优化设计 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-500 font-medium">当前说话人</div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-sm">
                  <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-xs">
                    <span className="text-sm">{getSenderInfo(currentSenderId, activeConv).avatar}</span>
                  </div>
                  <span className="text-xs font-semibold text-blue-700">{getSenderInfo(currentSenderId, activeConv).name}</span>
                </div>
              </div>
              <button
                onClick={() => setShowSenderPicker(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
              >
                <span>切换</span>
                <span className="text-xs">›</span>
              </button>
            </div>
            
            {/* 输入区域 - 优化设计 */}
            <div className="flex items-center gap-2">
              {/* 功能按钮组 */}
              <div className="flex items-center gap-1">
                <button 
                  onClick={handleVoiceClick} 
                  className="p-2.5 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                  title="语音输入"
                >
                  <Mic className="w-4.5 h-4.5 text-gray-600" />
                </button>
                <button 
                  onClick={() => imageInputRef.current?.click()} 
                  className="p-2.5 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                  title="发送图片"
                >
                  <ImageIcon className="w-4.5 h-4.5 text-gray-600" />
                </button>
                <button 
                  onClick={() => videoInputRef.current?.click()} 
                  className="p-2.5 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                  title="发送视频"
                >
                  <VideoIcon className="w-4.5 h-4.5 text-gray-600" />
                </button>
              </div>
              
              {/* 输入框 */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendText()}
                  placeholder="输入消息..."
                  className="w-full px-4 py-2.5 pr-14 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-sm bg-gray-50/50 transition-all"
                />
                {/* 输入框内的当前说话者头像指示器 */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center border-2 border-white shadow-sm">
                  <span className="text-xs">{getSenderInfo(currentSenderId, activeConv).avatar}</span>
                </div>
              </div>
              
              {/* 发送按钮 */}
              <button 
                onClick={handleSendText} 
                disabled={!textInput.trim()} 
                className="p-2.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all shadow-sm"
                title="发送消息"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelected} className="hidden" />
          <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelected} className="hidden" />
        </div>
      )}

      {showSenderPicker && activeConv && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center p-4 z-50" onClick={() => setShowSenderPicker(false)}>
          <div className="bg-white rounded-2xl p-4 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-medium mb-3 text-center">选择说话人</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <button
                onClick={() => selectSender('me')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl ${currentSenderId === 'me' ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}
              >
                <span className="text-2xl">{user.avatar}</span>
                <span className="font-medium">{user.name}</span>
              </button>
              {activeConv.participants.map(p => (
                <button
                  key={p.id}
                  onClick={() => selectSender(p.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl ${currentSenderId === p.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}
                >
                  <span className="text-2xl">{p.avatar}</span>
                  <span className="font-medium">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showVoiceModal && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">语音转文字</h3>
            <p className="text-sm text-gray-500 mb-4 text-center">请输入或说出想发送的内容</p>
            <textarea
              value={voiceText}
              onChange={e => setVoiceText(e.target.value)}
              placeholder="在这里输入或语音识别..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm mb-4"
              disabled={isRecognizing}
            />
            <div className="flex justify-center mb-4">
              {speechSupported ? (
                <button
                  onClick={() => (isRecognizing ? stopSpeech() : startSpeech())}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    isRecognizing ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-blue-500 hover:bg-blue-600'
                  } shadow-lg`}
                >
                  <Mic className="w-6 h-6 text-white" />
                </button>
              ) : (
                <div className="text-xs text-gray-400 text-center">
                  浏览器不支持语音识别<br />请手动输入
                </div>
              )}
            </div>
            {isRecognizing && (
              <div className="mb-4 text-center">
                <p className="text-sm text-blue-600 animate-pulse">🎤 正在监听...</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleCancelVoice}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSendVoice}
                disabled={!voiceText.trim()}
                className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50"
              >
                发送
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl my-auto">
            <h3 className="text-lg font-semibold mb-4">创建新会话</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">类型</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewType('private')}
                    className={`flex-1 px-4 py-2 rounded-xl ${newType === 'private' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    私聊
                  </button>
                  <button
                    onClick={() => setNewType('group')}
                    className={`flex-1 px-4 py-2 rounded-xl ${newType === 'group' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    群聊
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{newType === 'private' ? '对方昵称' : '群聊名称'}</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="请输入名称"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{newType === 'private' ? '对方头像' : '群头像'} (emoji)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newAvatar}
                    onChange={e => setNewAvatar(e.target.value)}
                    placeholder="👤"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-3xl">{newAvatar || '👤'}</div>
                </div>
              </div>
              {newType === 'group' && (
                <div>
                  <label className="block text-sm font-medium mb-2">群成员 (至少2人)</label>
                  <div className="space-y-2 mb-3">
                    {newParticipants.map(p => (
                      <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
                        <span className="text-xl">{p.avatar}</span>
                        <span className="flex-1">{p.name}</span>
                        <button onClick={() => removeParticipant(p.id)} className="p-1 hover:bg-gray-200 rounded-full">
                          <X className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPName}
                      onChange={e => setNewPName(e.target.value)}
                      placeholder="成员昵称"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <input
                      type="text"
                      value={newPAvatar}
                      onChange={e => setNewPAvatar(e.target.value)}
                      placeholder="👤"
                      className="w-16 px-2 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-sm"
                    />
                    <button onClick={addParticipant} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl">
                      添加
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={createConversation}
                className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
