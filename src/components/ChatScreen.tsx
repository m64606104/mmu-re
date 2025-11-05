import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Send, Sparkles, Image, Video, Mic, Phone, Plus, MapPin, FileText } from 'lucide-react';
import { Conversation, ApiConfig, Message } from '../types';
import FeaturesModal from './FeaturesModal';
import { 
  getConversationMemories, 
  applyMemoriesToContext,
  shouldTriggerAutoSummary,
  buildMemorySummaryPrompt,
  parseMemorySummaryResponse,
  addMemory,
  updateSummaryCounter,
  getMemoryBank
} from '../utils/memorySystem';
import { detectMemes } from '../utils/memeSystem';
import { buildTimeAwarePrompt } from '../utils/timeAwareness';

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
  const [showSendingHint, setShowSendingHint] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<string[]>([]);
  const [showAllSentHint, setShowAllSentHint] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 获取用户资料
  const getUserProfile = () => {
    try {
      const profile = localStorage.getItem('userProfile');
      if (profile) {
        return JSON.parse(profile);
      }
    } catch (e) {
      console.error('Failed to parse user profile:', e);
    }
    return { username: '我', avatarBadge: '🎵', avatar: null };
  };

  const userProfile = getUserProfile();
  
  // 获取用户头像装饰
  const getUserBadge = () => {
    return userProfile.avatarBadge || '🎵';
  };

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
    setPendingMessages([]); // 清除剩余消息
    setShowAllSentHint(false);
    inputRef.current?.focus();
  };

  // 智能切分AI回复为多个气泡 - 按标点符号自然断句（参考Social Chat App Framework）
  const splitMessages = (text: string): string[] => {
    const messages: string[] = [];
    
    // 清理文本：移除Markdown格式符号和引用标注
    let cleanedText = text
      // 移除粗体标记
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      // 移除斜体标记
      .replace(/\*([^*]+)\*/g, '$1')
      // 移除列表标记（• - * 等）
      .replace(/^[\s]*[•\-*]\s+/gm, '')
      // 移除标题标记
      .replace(/^[\s]*#+\s+/gm, '')
      // 移除引用标注（如 [1]、[来源]、[参考] 等）
      .replace(/\[[\d\u4e00-\u9fa5]+\]/g, '')
      // 移除多余的空行
      .replace(/\n{3,}/g, '\n\n');
    
    // 按换行符分割
    const paragraphs = cleanedText.split('\n').filter(line => line.trim());
    
    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) continue;
      
      // 检测是否包含URL（保护URL不被分割）
      const urlPattern = /(https?:\/\/[^\s]+)/g;
      const hasUrl = urlPattern.test(trimmed);
      
      if (hasUrl) {
        // 如果包含URL，整段作为一条消息
        messages.push(trimmed);
      } else {
        // 按句号、问号、感叹号等结束标点分割
        const sentences = trimmed.match(/[^。！？!?.]+[。！？!?.]+|[^。！？!?.]+$/g) || [trimmed];
        
        for (const sentence of sentences) {
          const sentenceTrimmed = sentence.trim();
          if (!sentenceTrimmed) continue;
          
          // 如果句子太长（超过30个字符），尝试按逗号、分号等分割
          if (sentenceTrimmed.length > 30) {
            const parts = sentenceTrimmed.match(/[^，,；;]+[，,；;]+|[^，,；;]+$/g) || [sentenceTrimmed];
            messages.push(...parts.map(p => {
              const cleaned = p.trim();
              // 去掉末尾的逗号，使显示更贴合人的发送习惯
              return cleaned.replace(/[，,]$/, '');
            }).filter(p => p));
          } else {
            messages.push(sentenceTrimmed);
          }
        }
      }
    }
    
    return messages.filter(msg => msg.trim().length > 0);
  };

  // 逐条发送剩余消息
  const sendRemainingMessages = async (messages: string[]) => {
    const batchSize = 23;
    const toSend = messages.slice(0, batchSize);
    const remaining = messages.slice(batchSize);
    
    let currentMessages = [...conversation.messages];
    
    for (let i = 0; i < toSend.length; i++) {
      setShowTyping(true);
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
      setShowTyping(false);
      
      const newMessage: Message = {
        id: Date.now().toString() + '_continue_' + i + Math.random(),
        role: 'assistant' as const,
        content: toSend[i].trim(),
        timestamp: Date.now(),
      };
      
      currentMessages = [...currentMessages, newMessage];
      onUpdateConversation(conversation.id, {
        messages: currentMessages,
        lastMessageTime: Date.now(),
      });
      
      if (i < toSend.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    setPendingMessages(remaining);
    
    if (remaining.length === 0) {
      setShowAllSentHint(true);
      setTimeout(() => setShowAllSentHint(false), 3000);
    }
  };

  // 继续发送剩余消息
  const handleContinueSending = async () => {
    if (pendingMessages.length > 0) {
      setIsGenerating(true);
      await sendRemainingMessages(pendingMessages);
      setIsGenerating(false);
    }
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
    setShowSendingHint(true);

    try {
      // 获取最后一条用户消息的时间戳和内容（用于时间感知）
      const userMessagesForTime = conversation.messages.filter(m => m.role === 'user');
      const lastUserMsgForTime = userMessagesForTime[userMessagesForTime.length - 1];
      const lastUserTimestamp = lastUserMsgForTime?.timestamp;
      const lastUserContent = lastUserMsgForTime?.content;
      
      // 生成时间感知提示词
      const timeAwarePrompt = buildTimeAwarePrompt(lastUserTimestamp, lastUserContent);
      
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
      
      // 添加时间感知信息
      systemPrompt += timeAwarePrompt;

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

      // 智能切分消息
      const splitMsgs = splitMessages(assistantMessage);
      
      // 限制单次发送的消息气泡数量，最多23条
      const limitedMessages = splitMsgs.slice(0, 23);
      const remainingMsgs = splitMsgs.slice(23);
      
      if (remainingMsgs.length > 0) {
        console.log(`AI回复被截断：原${splitMsgs.length}条消息，限制为23条`);
        setPendingMessages(remainingMsgs);
      }
      
      // 逐条显示AI消息，每条前都显示输入动画
      let currentMessages = [...conversation.messages];
      
      for (let i = 0; i < limitedMessages.length; i++) {
        // 显示输入动画
        setShowTyping(true);
        
        // 第一次显示输入动画时，隐藏"消息发送中"提示
        if (i === 0) {
          setShowSendingHint(false);
        }
        
        // 等待1-2秒模拟输入
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
        
        // 隐藏输入动画，显示消息
        setShowTyping(false);
        
        const newMessage: Message = {
          id: Date.now().toString() + '_ai_' + i + Math.random(),
          role: 'assistant' as const,
          content: limitedMessages[i].trim(),
          timestamp: Date.now(),
        };
        
        currentMessages = [...currentMessages, newMessage];
        
        // 更新消息列表
        onUpdateConversation(conversation.id, {
          messages: currentMessages,
          lastMessageTime: Date.now(),
        });
        
        // 短暂停顿再显示下一条
        if (i < limitedMessages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // 🧠 检查是否需要自动总结记忆
      if (conversation.enabledFeatures?.includes('memory-system')) {
        if (shouldTriggerAutoSummary(conversation.id, currentMessages.length)) {
          console.log('🧠 触发自动记忆总结，当前消息数:', currentMessages.length);
          performMemorySummary(currentMessages).catch(err => {
            console.error('记忆总结失败:', err);
            // 即使失败也更新计数器，避免重复尝试
            updateSummaryCounter(conversation.id, currentMessages.length);
          });
        }
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
          }
        }
      }
    } catch (error) {
      console.error('Generate failed:', error);
      alert('生成失败，请检查配置和网络');
      setShowSendingHint(false);
      setShowTyping(false);
    } finally {
      setIsGenerating(false);
    }
  };

  // 🧠 执行记忆总结
  const performMemorySummary = async (currentMessages: Message[]) => {
    try {
      console.log('🧠 开始记忆总结...');
      const memoryBank = getMemoryBank(conversation.id);
      const summaryPrompt = buildMemorySummaryPrompt(currentMessages, memoryBank.memories);
      
      // 调用AI进行总结
      const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: apiConfig.modelName,
          messages: [
            { role: 'user', content: summaryPrompt }
          ],
          temperature: 0.3, // 使用较低温度以获得更准确的总结
        })
      });
      
      if (!response.ok) {
        console.error('记忆总结API请求失败');
        return;
      }
      
      const data = await response.json();
      const summaryResponse = data.choices?.[0]?.message?.content;
      
      if (!summaryResponse) {
        console.error('未收到有效的记忆总结');
        return;
      }
      
      // 解析总结结果
      const memories = parseMemorySummaryResponse(summaryResponse);
      
      if (memories.length > 0) {
        console.log(`🧠 提取到 ${memories.length} 条新记忆`);
        
        // 添加到记忆库
        memories.forEach((mem: { content: string; importance: 'low' | 'medium' | 'high'; category?: string }) => {
          addMemory(conversation.id, mem.content, mem.importance, mem.category, true);
        });
        
        alert(`✅ 已保存 ${memories.length} 条记忆`);
      } else {
        console.log('🧠 本次对话没有值得记忆的新信息');
      }
      
      // 更新总结计数器
      updateSummaryCounter(conversation.id, currentMessages.length);
      
    } catch (error) {
      console.error('记忆总结失败:', error);
      // 即使失败也更新计数器，避免重复尝试
      updateSummaryCounter(conversation.id, currentMessages.length);
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFeaturesModal(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
          </button>
          {conversation.type === 'private' && (
            <button
              onClick={onOpenCharacterSettings}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
              </svg>
            </button>
          )}
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
          // 微信风格：超过5分钟才显示时间
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
              
              {/* 系统消息 - 居中显示 */}
              {message.role === 'system' ? (
                <div className="flex justify-center my-2">
                  <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                    {message.content}
                  </span>
                </div>
              ) : (
              <div className={`flex gap-2 items-end ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <div className="relative flex-shrink-0">
                    {conversation.characterSettings?.avatar ? (
                      <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-md">
                        <img src={conversation.characterSettings.avatar} alt="AI头像" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border-2 border-white shadow-md">
                        <span className="text-white font-semibold text-sm">{conversation.name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-[10px]">{getUserBadge()}</span>
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
                  <div className={`absolute bottom-3 ${
                    message.role === 'user' ? 'right-0 translate-x-[40%]' : 'left-0 -translate-x-[40%]'
                  }`}>
                    <div className={`w-2.5 h-2.5 bg-white border-gray-200 transform rotate-45 shadow-sm ${
                      message.role === 'user' ? 'border-r border-b' : 'border-l border-t'
                    }`}></div>
                  </div>
                </div>
                {message.role === 'user' && (
                  <div className="relative flex-shrink-0">
                    {userProfile.avatar ? (
                      <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-md">
                        <img src={userProfile.avatar} alt="用户头像" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-100 to-gray-300 flex items-center justify-center border-2 border-white shadow-md">
                        <span className="text-gray-700 font-semibold text-sm">{userProfile.username?.charAt(0) || '我'}</span>
                      </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-[10px]">{getUserBadge()}</span>
                    </div>
                  </div>
                )}
              </div>
              )}
            </div>
          );
        })}

        {showSendingHint && (
          <div className="flex justify-center my-2">
            <div className="bg-blue-500 text-white text-xs px-3 py-1.5 rounded-full shadow-sm">
              消息发送中...
            </div>
          </div>
        )}

        {showTyping && (
          <div className="flex gap-2 items-end justify-start">
            <div className="relative flex-shrink-0">
              {conversation.characterSettings?.avatar ? (
                <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-md">
                  <img src={conversation.characterSettings.avatar} alt="AI头像" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border-2 border-white shadow-md">
                  <span className="text-white font-semibold text-sm">{conversation.name.charAt(0)}</span>
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                <span className="text-[10px]">{getUserBadge()}</span>
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
              <div className="absolute bottom-3 left-0 -translate-x-[40%]">
                <div className="w-2.5 h-2.5 bg-white border-l border-t border-gray-200 transform rotate-45 shadow-sm"></div>
              </div>
            </div>
          </div>
        )}

        {showAllSentHint && (
          <div className="flex justify-center my-2">
            <div className="bg-green-500 text-white text-xs px-3 py-1.5 rounded-full shadow-sm">
              消息已全部送达
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200">
        {/* 剩余消息提示 */}
        {pendingMessages.length > 0 && !isGenerating && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
            <span className="text-sm text-blue-700">
              还有 {pendingMessages.length} 条消息未发送
            </span>
            <button
              onClick={handleContinueSending}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded-full hover:bg-blue-600 transition-colors"
            >
              继续
            </button>
          </div>
        )}

        {/* Toolbar */}
        {showToolbar && (
          <div className="px-3 py-2 bg-white border-b border-gray-200">
            <div className="flex gap-2 items-center overflow-x-auto">
              <button className="flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <Image className="w-4 h-4 text-gray-600" />
                </div>
              </button>
              <button className="flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <Video className="w-4 h-4 text-gray-600" />
                </div>
              </button>
              <button className="flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <Mic className="w-4 h-4 text-gray-600" />
                </div>
              </button>
              <button className="flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <Phone className="w-4 h-4 text-gray-600" />
                </div>
              </button>
              <button className="flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <MapPin className="w-4 h-4 text-gray-600" />
                </div>
              </button>
              <button className="flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <FileText className="w-4 h-4 text-gray-600" />
                </div>
              </button>
              <button 
                onClick={onOpenCharacterSettings}
                className="flex-shrink-0"
              >
                <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <Sparkles className="w-4 h-4 text-gray-600" />
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
                className="w-10 h-10 bg-blue-500 text-white rounded-full hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center shadow-md"
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
          </div>
        </div>
      </div>
    </div>
  );
}
