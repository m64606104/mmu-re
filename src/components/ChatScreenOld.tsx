import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Send, Sparkles, Image, Video, Mic, Phone, Plus, MapPin, FileText } from 'lucide-react';
import { Conversation, ApiConfig, Message } from '../types';
import FeaturesModal from './FeaturesModal';
import { 
  extractMemoriesFromConversation, 
  addMemories, 
  getConversationMemories, 
  applyMemoriesToContext 
} from '../utils/memorySystem';
import { detectMemes, generateAIMemeResponse } from '../utils/memeSystem';

interface ChatScreenProps {
  conversation: Conversation;
  apiConfig: ApiConfig;
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void;
  onBack: () => void;
  onOpenCharacterSettings: () => void;
  onRequestAIMoment?: () => Promise<void>;
}

export default function ChatScreen({
  conversation,
  apiConfig,
  onUpdateConversation,
  onBack,
  onOpenCharacterSettings,
  onRequestAIMoment,
}: ChatScreenProps) {
  const [currentInput, setCurrentInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages, isGenerating]);

  const handleSendMessage = () => {
    if (!currentInput.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString() + Math.random(),
      role: 'user',
      content: currentInput.trim(),
      timestamp: Date.now(),
    };

    onUpdateConversation(conversation.id, {
      messages: [...conversation.messages, newMessage],
      lastMessageTime: Date.now(),
    });

    setCurrentInput('');
    inputRef.current?.focus();
  };

  const handleGenerate = async () => {
    if (!apiConfig.baseUrl || !apiConfig.apiKey || !apiConfig.modelName) {
      alert('请先在设置中配置 API');
      return;
    }

    if (conversation.messages.length === 0) {
      alert('请先发送消息');
      return;
    }

    setIsGenerating(true);

    try {
      let systemPrompt = conversation.characterSettings
        ? `你是${conversation.characterSettings.nickname}。
${conversation.characterSettings.systemPrompt ? `人物设定：${conversation.characterSettings.systemPrompt}` : ''}
${conversation.characterSettings.personality ? `性格特征：${conversation.characterSettings.personality}` : ''}
${conversation.characterSettings.languageStyle ? `语言风格：${conversation.characterSettings.languageStyle}` : ''}
${conversation.characterSettings.languageExample ? `语言示例：${conversation.characterSettings.languageExample}` : ''}
${conversation.characterSettings.memoryEvents ? `记忆事件：${conversation.characterSettings.memoryEvents}` : ''}`
        : conversation.type === 'group'
        ? '你是一个群聊助手，可以参与多人对话。'
        : '你是一个AI助手。';

      // 如果启用了记忆系统，添加记忆上下文
      if (conversation.enabledFeatures?.includes('memory-system')) {
        const memories = getConversationMemories(conversation.id);
        const memoryContext = applyMemoriesToContext(conversation, memories);
        systemPrompt += memoryContext;
      }

      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversation.messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      ];

      const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: apiConfig.modelName,
          messages,
        }),
      });

      if (!response.ok) {
        throw new Error('API 请求失败');
      }

      const data = await response.json();
      const assistantMessage = data.choices[0]?.message?.content || '抱歉，我没有回复。';

      // Split response by newlines to create multiple messages if needed
      const responseLines = assistantMessage.split('\n').filter((line: string) => line.trim());
      
      const newMessages: Message[] = responseLines.map((content: string) => ({
        id: Date.now().toString() + Math.random(),
        role: 'assistant' as const,
        content,
        timestamp: Date.now(),
      }));

      onUpdateConversation(conversation.id, {
        messages: [...conversation.messages, ...newMessages],
        lastMessageTime: Date.now(),
      });

      // 如果启用了记忆系统，提取新记忆
      if (conversation.enabledFeatures?.includes('memory-system')) {
        const recentMessages = [...conversation.messages, ...newMessages].slice(-10);
        extractMemoriesFromConversation(conversation, apiConfig, recentMessages)
          .then(memories => {
            if (memories.length > 0) {
              addMemories(memories);
              console.log(`提取了 ${memories.length} 条新记忆`);
            }
          })
          .catch(err => console.error('提取记忆失败:', err));
      }

      // 检测是否请求AI发朋友圈
      const lastUserMessage = conversation.messages
        .filter(m => m.role === 'user')
        .slice(-1)[0];
      
      if (lastUserMessage && onRequestAIMoment) {
        const content = lastUserMessage.content.toLowerCase();
        if (content.includes('发朋友圈') || content.includes('发个朋友圈') || 
            content.includes('发条朋友圈') || content.includes('发动态')) {
          console.log('检测到用户请求AI发朋友圈');
          onRequestAIMoment().catch(err => console.error('手动触发AI朋友圈失败:', err));
        }
      }

      // 如果启用了热梗系统，检测用户消息中的梗
      if (conversation.enabledFeatures?.includes('meme-system')) {
        const lastUserMessage = conversation.messages
          .filter(m => m.role === 'user')
          .slice(-1)[0];
        
        if (lastUserMessage) {
          const detectedMemes = detectMemes(lastUserMessage.content);
          if (detectedMemes.length > 0) {
            console.log(`检测到热梗: ${detectedMemes.map(m => m.keyword).join(', ')}`);
            
            // 生成热梗回复
            generateAIMemeResponse(
              lastUserMessage.content,
              detectedMemes,
              apiConfig,
              conversation.characterSettings?.nickname || conversation.name
            ).then(memeResponse => {
              if (memeResponse) {
                const memeMessage: Message = {
                  id: Date.now().toString() + Math.random(),
                  role: 'assistant',
                  content: memeResponse,
                  timestamp: Date.now(),
                };
                onUpdateConversation(conversation.id, {
                  messages: [...conversation.messages, ...newMessages, memeMessage],
                  lastMessageTime: Date.now(),
                });
              }
            }).catch(err => console.error('生成热梗回复失败:', err));
          }
        }
      }
    } catch (error) {
      console.error('Generate failed:', error);
      alert('生成失败，请检查配置和网络');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (currentInput.trim()) {
        handleSendMessage();
      }
    }
  };

  return (
    <div className="h-full bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\"20\" height=\"20\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M0 0h20v20H0z\" fill=\"%23fafafa\"/%3E%3Cpath d=\"M0 0h10v10H0z\" fill=\"%23f5f5f5\" fill-opacity=\".5\"/%3E%3C/svg%3E")' }}>
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 -ml-1 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-800" strokeWidth={2.5} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-base font-semibold text-gray-900">{conversation.name}</h1>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-500">在线</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="w-10 h-10 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center">
            <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs">🎮</span>
            </div>
          </button>
          <button className="w-10 h-10 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center">
            <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs">🎧</span>
            </div>
          </button>
          <button className="w-10 h-10 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center">
            <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs">🐻</span>
            </div>
          </button>
        </div>
      </div>

      {/* Features Modal */}
      <FeaturesModal
        isOpen={showFeaturesModal}
        onClose={() => setShowFeaturesModal(false)}
        conversationId={conversation.id}
        enabledFeatures={conversation.enabledFeatures || []}
        onUpdateFeatures={(id, features) => {
          onUpdateConversation(id, { enabledFeatures: features });
        }}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {conversation.messages.map((message, index) => {
          const showTime = index === 0 || 
            (conversation.messages[index - 1] && 
             message.timestamp - conversation.messages[index - 1].timestamp > 5 * 60 * 1000);
          
          return (
            <div key={message.id}>
              {showTime && (
                <div className="flex justify-center my-4">
                  <span className="text-xs text-gray-400 bg-white/80 px-3 py-1 rounded-full">
                    {new Date(message.timestamp).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })} {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              <div className={`flex gap-2 items-end ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border-2 border-white shadow-md">
                      <span className="text-white font-semibold text-sm">{conversation.name.charAt(0)}</span>
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-[10px]">🎵</span>
                    </div>
                  </div>
                )}
                <div className="relative max-w-[70%]">
                  <div
                    className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                      message.role === 'user'
                        ? 'bg-white text-gray-900 border border-gray-200'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                  {/* Message tail */}
                  <div className={`absolute bottom-2 ${
                    message.role === 'user' ? 'right-0 translate-x-1/2' : 'left-0 -translate-x-1/2'
                  }`}>
                    <div className={`w-4 h-4 bg-white border-gray-200 transform rotate-45 shadow-sm ${
                      message.role === 'user' ? 'border-r border-b' : 'border-l border-t'
                    }`}></div>
                  </div>
                  {/* Time stamp */}
                  <div className={`absolute -bottom-5 text-[10px] text-gray-400 ${
                    message.role === 'user' ? 'right-0' : 'left-0'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {message.role === 'user' && (
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-100 to-gray-300 flex items-center justify-center border-2 border-white shadow-md">
                      <span className="text-gray-700 font-semibold text-sm">我</span>
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-[10px]">🎵</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isGenerating && (
          <div className="flex gap-2 items-end justify-start">
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border-2 border-white shadow-md">
                <span className="text-white font-semibold text-sm">{conversation.name.charAt(0)}</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                <span className="text-[10px]">🎵</span>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl px-4 py-2.5 border border-gray-200 shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
              <div className="absolute bottom-2 left-0 -translate-x-1/2">
                <div className="w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45 shadow-sm"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200">
        {/* Toolbar */}
        {showToolbar && (
          <div className="px-4 py-4 bg-white border-b border-gray-200">
            <div className="flex gap-3 overflow-x-auto pb-2">
              <button className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors shadow-sm">
                  <Plus className="w-6 h-6 text-gray-600" />
                </div>
              </button>
              <button className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors shadow-sm">
                  <Image className="w-6 h-6 text-gray-600" />
                </div>
              </button>
              <button className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors shadow-sm">
                  <Video className="w-6 h-6 text-gray-600" />
                </div>
              </button>
              <button className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors shadow-sm">
                  <Mic className="w-6 h-6 text-gray-600" />
                </div>
              </button>
              <button className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors shadow-sm">
                  <Phone className="w-6 h-6 text-gray-600" />
                </div>
              </button>
              <button className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors shadow-sm">
                  <MapPin className="w-6 h-6 text-gray-600" />
                </div>
              </button>
              <button className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors shadow-sm">
                  <FileText className="w-6 h-6 text-gray-600" />
                </div>
              </button>
              <button 
                onClick={onOpenCharacterSettings}
                className="flex flex-col items-center gap-1.5 flex-shrink-0"
              >
                <div className="w-14 h-14 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors shadow-sm">
                  <span className="text-xl">Y</span>
                </div>
              </button>
              <button className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors shadow-sm">
                  <span className="text-xl">📋</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="px-3 py-3 bg-white">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowToolbar(!showToolbar)}
              className="w-9 h-9 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 flex items-center justify-center"
            >
              <Plus className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2">
              <input
                ref={inputRef}
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入消息..."
                className="flex-1 outline-none text-[15px] bg-transparent text-gray-900 placeholder-gray-400"
                disabled={isGenerating}
              />
            </div>
            {currentInput.trim() ? (
              <button
                onClick={handleSendMessage}
                disabled={isGenerating}
                className="w-10 h-10 bg-gray-900 text-white rounded-full hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center shadow-md"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isGenerating || conversation.messages.length === 0}
                className="w-10 h-10 bg-gray-900 text-white rounded-full hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center shadow-md"
              >
                <Sparkles className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button className="w-10 h-10 bg-gray-900 text-white rounded-full hover:bg-gray-800 active:scale-95 transition-all flex-shrink-0 flex items-center justify-center shadow-md">
              <span className="text-lg">🦋</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
