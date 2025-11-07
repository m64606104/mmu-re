import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Send, Sparkles, Image, Video, Mic, Phone, Plus, MapPin, FileText, Smile, Play, Pause, Bell, BellOff } from 'lucide-react';
import { Conversation, ApiConfig, Message, AIStatusInfo } from '../types';
import ActivityLogModal from './ActivityLogModal';
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
// import { detectMemes } from '../utils/memeSystem'; // 已删除热梗系统
import { buildTimeAwarePrompt } from '../utils/timeAwareness';
import { getMomentsData } from '../utils/aiMomentsGenerator';
import { getAIStatus, analyzeMessageAndUpdateStatus, analyzeAndUpdateStatusFromAI } from '../utils/aiStatusManager';
import { backgroundTaskManager } from '../utils/backgroundTaskManager';
import { showMessageNotification } from './MessageNotification';
// import { transcribeAudio, isValidSpeechConfig } from '../utils/speechToText';

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
  const [showToolbar, setShowToolbar] = useState(false);
  const [showVideoDescModal, setShowVideoDescModal] = useState(false);
  const [videoDescInput, setVideoDescInput] = useState('');
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [stickerDescInput, setStickerDescInput] = useState('');
  const [viewingVoice, setViewingVoice] = useState<string | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [showSendingHint, setShowSendingHint] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<string[]>([]);
  const [showAllSentHint, setShowAllSentHint] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 追踪用户是否还在当前聊天页面
  const isComponentMountedRef = useRef(true);
  
  // AI状态相关state
  const [aiStatus, setAIStatus] = useState<AIStatusInfo | null>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  
  // 语音相关state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showVoiceConfirmModal, setShowVoiceConfirmModal] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
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

  // 追踪组件挂载状态（用户是否还在页面）
  useEffect(() => {
    isComponentMountedRef.current = true;
    
    return () => {
      // 组件卸载时（用户离开页面）
      isComponentMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages, isGenerating]);

  // 加载AI状态
  useEffect(() => {
    if (conversation.type === 'private' && conversation.characterSettings) {
      const loadStatus = async () => {
        const status = await getAIStatus(conversation.id);
        if (status) {
          setAIStatus(status);
        }
      };
      loadStatus();
      
      // 每30秒刷新一次状态
      const interval = setInterval(loadStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [conversation.id, conversation.type, conversation.characterSettings]);


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

  // 处理图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 读取图片为base64
      const reader = new FileReader();
      reader.onload = () => {
        const imageData = reader.result as string;
        
        // 创建用户消息（显示图片）
        const userMessage: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'user',
          content: '[图片]',
          timestamp: Date.now(),
          mediaType: 'image',
          mediaUrl: imageData
        };

        // 只添加到聊天记录，不自动生成回复
        onUpdateConversation(conversation.id, {
          messages: [...conversation.messages, userMessage],
          lastMessageTime: Date.now()
        });

        // 关闭工具栏
        setShowToolbar(false);
      };

      reader.readAsDataURL(file);

    } catch (error) {
      console.error('图片上传失败:', error);
      alert('图片上传失败');
    }

    // 清空input
    if (e.target) e.target.value = '';
  };

  // 处理视频上传
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 保存文件并显示描述弹窗
    setPendingVideoFile(file);
    setShowVideoDescModal(true);
    setShowToolbar(false);

    // 清空input
    if (e.target) e.target.value = '';
  };

  // 打开表情包输入弹窗
  const handleStickerClick = () => {
    setShowStickerModal(true);
    setShowToolbar(false);
  };

  // 发送表情包消息
  const handleSendSticker = () => {
    if (!stickerDescInput.trim()) {
      alert('请输入表情包内容描述');
      return;
    }

    // 创建表情包消息
    const stickerMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: '[表情包]',
      timestamp: Date.now(),
      mediaType: 'sticker',
      mediaDescription: stickerDescInput.trim()
    };

    // 添加到对话
    onUpdateConversation(conversation.id, {
      messages: [...conversation.messages, stickerMessage],
      lastMessageTime: Date.now()
    });

    // 关闭弹窗并清空输入
    setShowStickerModal(false);
    setStickerDescInput('');
  };

  // 发送视频消息
  const handleSendVideo = () => {
    if (!pendingVideoFile || !videoDescInput.trim()) {
      alert('请输入视频内容描述');
      return;
    }

    try {
      // 读取视频文件为URL
      const reader = new FileReader();
      reader.onload = () => {
        const videoUrl = reader.result as string;
        
        // 创建用户消息
        const userMessage: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'user',
          content: `[视频] ${videoDescInput}`,
          timestamp: Date.now(),
          mediaType: 'video',
          mediaUrl: videoUrl,
          mediaDescription: videoDescInput
        };

        // 保存用户消息到聊天记录
        onUpdateConversation(conversation.id, {
          messages: [...conversation.messages, userMessage],
          lastMessageTime: Date.now()
        });

        // 关闭弹窗
        setShowVideoDescModal(false);
        setVideoDescInput('');
        setPendingVideoFile(null);
      };

      reader.readAsDataURL(pendingVideoFile);

    } catch (error) {
      console.error('视频发送失败:', error);
      alert('视频发送失败');
    }
  };

  // 语音录音功能
  const handleVoiceClick = async () => {
    startRecording();
  };

  // 开始录音
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        
        // 停止所有音轨
        stream.getTracks().forEach(track => track.stop());
        
        // 直接显示手动输入弹窗，不使用语音识别
        setVoiceTranscript('');
        setShowVoiceConfirmModal(true);
      };
      
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      
      // 开始计时
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('启动录音失败:', error);
      alert('无法访问麦克风，请检查权限设置');
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    setIsRecording(false);
  };

  // 发送语音消息
  const handleSendVoice = () => {
    if (!voiceTranscript.trim() || !audioBlob) {
      alert('请输入语音内容');
      return;
    }
    
    try {
      // 转换音频为URL
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // 创建语音消息
      const voiceMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content: `[语音]`,
        timestamp: Date.now(),
        mediaType: 'voice',
        mediaUrl: audioUrl,
        mediaDescription: voiceTranscript,
        voiceDuration: recordingTime // 使用录音时长
      };
      
      // 保存到聊天记录
      onUpdateConversation(conversation.id, {
        messages: [...conversation.messages, voiceMessage],
        lastMessageTime: Date.now()
      });
      
      // 重置状态
      setShowVoiceConfirmModal(false);
      setVoiceTranscript('');
      setAudioBlob(null);
      setRecordingTime(0);
      
    } catch (error) {
      console.error('发送语音失败:', error);
      alert('发送语音失败');
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
      // 获取最后一条用户消息
      const userMessagesForTime = conversation.messages.filter(m => m.role === 'user');
      const lastUserMsgForTime = userMessagesForTime[userMessagesForTime.length - 1];
      const lastUserTimestamp = lastUserMsgForTime?.timestamp;
      const lastUserMsg = conversation.messages.filter(m => m.role === 'user').slice(-1)[0];
      const hasImage = lastUserMsg?.mediaType === 'image' && lastUserMsg.mediaUrl;
      const hasVideo = lastUserMsg?.mediaType === 'video' && lastUserMsg.mediaDescription;
      const hasVoice = lastUserMsg?.mediaType === 'voice' && lastUserMsg.mediaDescription;
      const hasSticker = lastUserMsg?.mediaType === 'sticker' && lastUserMsg.mediaDescription;
      
      // 生成时间感知提示词
      const timeAwarePrompt = buildTimeAwarePrompt(lastUserTimestamp, lastUserMsgForTime?.content);
      
      let systemPrompt = conversation.characterSettings
        ? `你是${conversation.characterSettings.nickname}。
${conversation.characterSettings.systemPrompt ? `人物设定：${conversation.characterSettings.systemPrompt}` : ''}
${conversation.characterSettings.personality ? `性格特征：${conversation.characterSettings.personality}` : ''}
${conversation.characterSettings.languageStyle ? `语言风格：${conversation.characterSettings.languageStyle}` : ''}
${conversation.characterSettings.languageExample ? `语言示例：${conversation.characterSettings.languageExample}` : ''}
${conversation.characterSettings.memoryEvents ? `记忆事件：${conversation.characterSettings.memoryEvents}` : ''}

【重要表达规范】：
- 使用真人自然口语表达，不要使用斜杠（/）来表示"或"，例如：
  ❌ 错误："地铁/公交"、"学习/工作"  
  ✅ 正确："地铁或公交"、"地铁和公交"、"每天都要被公交地铁压榨"
- 可以用顿号（、）、"和"、"或"、"还是"等自然连接词
- 列举事物时优先用自然叙述而非并列符号
- 保持日常对话的流畅感，像真人一样说话

【对话回复原则】：
- **智能优先级**：如果用户发了多条消息，先判断每条消息的优先级，按优先级顺序回复
- **优先级判断标准**：
  * 🔴 高优先级：明确提问、需要帮助、重要话题、情感表达
  * 🟡 中优先级：分享经历、有趣话题、聊天互动
  * 🟢 低优先级：日常问候、闲聊、无聊话题
- **选择性回复**：不需要对每条消息都回复，可以只回复你感兴趣的话题
- **自然跳过**：对于不感兴趣或无话可说的内容，可以输出"[不回复]"来跳过
- **合并回复**：可以一次回复多条消息，优先回复高优先级的
- **真实互动**：像真人聊天一样，有选择地参与对话

【回复顺序示例】：
如果用户连续发了：
1. "今天天气真好"（低优先级）
2. "我去买了杯咖啡"（低优先级）  
3. "对了，你看过《三体》吗？"（高优先级-明确提问）

你应该：先回复第3条（高优先级），可以跳过1、2条，或者简单带一句

注意：如果所有消息都是低优先级且不感兴趣，可以全部输出"[不回复]"`
        : conversation.type === 'group'
        ? '你是一个群聊助手，可以参与多人对话。使用自然口语表达，不要使用斜杠（/）等书面符号。'
        : '你是一个AI助手。使用自然口语表达，不要使用斜杠（/）等书面符号。';

      // 如果启用了记忆系统，添加记忆上下文
      if (conversation.enabledFeatures?.includes('memory-system')) {
        const memories = getConversationMemories(conversation.id);
        const memoryContext = applyMemoriesToContext(conversation, memories);
        systemPrompt += memoryContext;
      }
      
      // 添加朋友圈上下文
      try {
        const momentsData = await getMomentsData(conversation.id);
        if (momentsData.posts && momentsData.posts.length > 0) {
          const recentPosts = momentsData.posts.slice(0, 5); // 最近5条朋友圈
          let momentsContext = '\n\n【你最近发的朋友圈（隐藏信息）】\n以下是你最近发的朋友圈内容。这些信息仅供你参考，不要刻意提起，只在以下情况下自然使用：\n';
          momentsContext += '- 用户或其他人明确问起你的朋友圈时\n';
          momentsContext += '- 对话内容自然关联到朋友圈事件时\n';
          momentsContext += '- 你可以基于朋友圈内容、发送时间、你的角色设定自由发散创造细节，但不能偏离朋友圈内容太多\n\n';
          
          recentPosts.forEach((post, index) => {
            const postDate = new Date(post.timestamp);
            const daysDiff = Math.floor((Date.now() - post.timestamp) / 86400000);
            const timeDesc = daysDiff === 0 ? '今天' : daysDiff === 1 ? '昨天' : daysDiff === 2 ? '前天' : `${daysDiff}天前`;
            const dateStr = postDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
            
            momentsContext += `${index + 1}. [${timeDesc}，${dateStr}] ${post.content}`;
            if (post.imageDescriptions && post.imageDescriptions.length > 0) {
              momentsContext += `\n   配图${post.imageDescriptions.length}张：${post.imageDescriptions.join('、')}`;
            }
            momentsContext += '\n';
          });
          systemPrompt += momentsContext;
        }
      } catch (error) {
        console.error('获取朋友圈数据失败:', error);
      }
      
      // 添加时间感知信息
      systemPrompt += timeAwarePrompt;

      let messages;
      let requestBody;

      // 如果最后一条消息包含图片，使用vision API
      if (hasImage) {
        // 构建包含图片的消息（只传最近的对话历史，不包括图片之前的所有历史）
        const recentMessages = conversation.messages.slice(-10); // 只取最近10条
        const historyMessages = recentMessages.slice(0, -1).map(m => ({
          role: m.role,
          content: m.content
        }));

        messages = [
          { role: 'system', content: systemPrompt + '\n\n【图片识别规则】：\n- 只描述你在图片中实际看到的内容\n- 禁止编造、猜测图片中不存在的元素\n- 禁止说"让我看看""帮你看看"等话，直接自然反应即可\n- 不确定的内容不要说\n- 像朋友间日常聊天一样回复，不要太正式' },
          ...historyMessages,
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '看这张图'
              },
              {
                type: 'image_url',
                image_url: {
                  url: lastUserMsgForTime.mediaUrl
                }
              }
            ]
          }
        ];

        requestBody = {
          model: apiConfig.modelName,
          messages,
          temperature: 0.4
        };
      } else if (hasVideo) {
        // 如果最后一条消息包含视频，基于文字描述回复
        const recentMessages = conversation.messages.slice(-10); // 只取最近10条
        const historyMessages = recentMessages.slice(0, -1).map(m => ({
          role: m.role,
          content: m.content
        }));

        messages = [
          { role: 'system', content: systemPrompt + '\n\n【视频内容理解规则】：\n- 用户分享了视频，根据提供的内容描述自然回复\n- 像朋友间日常聊天一样对视频内容做出反应\n- 不要说"我看不到视频"、"无法观看"等话\n- 基于描述内容自然地评论、提问或互动' },
          ...historyMessages,
          {
            role: 'user',
            content: `（分享了视频：${lastUserMsgForTime.mediaDescription}）`
          }
        ];

        requestBody = {
          model: apiConfig.modelName,
          messages,
          temperature: 0.7
        };
      } else if (hasVoice) {
        // 如果最后一条消息包含语音，基于语音转文字内容回复
        const recentMessages = conversation.messages.slice(-10);
        const historyMessages = recentMessages.slice(0, -1).map(m => ({
          role: m.role,
          content: m.mediaType === 'voice' && m.mediaDescription ? m.mediaDescription : m.content
        }));

        messages = [
          { role: 'system', content: systemPrompt + '\n\n【语音消息理解规则】：\n- 用户发送了语音消息，根据语音转文字的内容自然回复\n- 像朋友间日常聊天一样对语音内容做出反应\n- 不要说"我听不到语音"、"无法播放"等话\n- 基于转录的文字内容自然回复即可\n- 可以回复文字、也可以回复语音/图片/视频/表情包' },
          ...historyMessages,
          {
            role: 'user',
            content: lastUserMsgForTime.mediaDescription || lastUserMsgForTime.content
          }
        ];

        requestBody = {
          model: apiConfig.modelName,
          messages,
          temperature: 0.7
        };
      } else if (hasSticker) {
        // 如果最后一条消息是表情包，理解并自然回复
        const recentMessages = conversation.messages.slice(-10);
        const historyMessages = recentMessages.slice(0, -1).map(m => ({
          role: m.role,
          content: m.content
        }));

        messages = [
          { role: 'system', content: systemPrompt + '\n\n【表情包理解规则】：\n- 用户发送了表情包，根据描述的内容理解用户的情绪和意图\n- 像朋友间日常聊天一样对表情包做出自然反应\n- 可以回复文字、也可以回复表情包（使用[表情包:描述内容]格式）\n- 根据表情包内容判断是否要发送图片/视频/语音/表情包回复\n\n【发送多媒体消息格式】：\n- 发送图片：[图片:详细的图片内容描述，10-50字，要生动具体]\n- 发送视频：[视频:详细的视频内容描述，10-50字]\n- 发送语音：[语音:语音内容的文字，时长X秒]\n- 发送表情包：[表情包:表情包的详细描述]\n\n示例：\n用户：[表情包:一只猫咪害羞捂脸]\nAI：哈哈哈好可爱！[表情包:小狗狗笑得很开心的样子]' },
          ...historyMessages,
          {
            role: 'user',
            content: `[表情包:${lastUserMsgForTime.mediaDescription}]`
          }
        ];

        requestBody = {
          model: apiConfig.modelName,
          messages,
          temperature: 0.8
        };
      } else {
        // 普通文本消息
        // 获取最近的用户消息，让AI能看到多条消息的上下文
        const recentUserMessages = conversation.messages
          .filter(m => m.role === 'user')
          .slice(-5); // 最近5条用户消息
        
        let contextPrompt = systemPrompt + '\n\n【发送多媒体消息规则】：\n你可以发送多种类型的消息，使用以下格式：\n- 发送图片：[图片:详细的图片内容描述，10-50字，要生动具体]\n- 发送视频：[视频:详细的视频内容描述，10-50字]\n- 发送语音：[语音:语音内容的文字，时长X秒]\n- 发送表情包：[表情包:表情包的详细描述]\n\n使用场景：\n- 想分享美景、照片时发图片\n- 想分享有趣的视频时发视频\n- 想发语音聊天时发语音（控制在3-10秒）\n- 想表达情绪、开玩笑时发表情包\n\n可以在文字消息中添加媒体，也可以单独发送媒体。根据对话情境自然决定是否使用多媒体。';
        
        // 如果最近有多条用户消息，添加提示
        if (recentUserMessages.length > 1) {
          contextPrompt += '\n\n【当前对话情境】：\n用户最近发了多条消息，请根据优先级判断标准，优先回复重要的、有趣的话题。可以合并回复，也可以选择性跳过某些消息。';
        }
        
        messages = [
          { role: 'system', content: contextPrompt },
          ...conversation.messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        ];

        requestBody = {
          model: apiConfig.modelName,
          messages
        };
      }

      // 🚀 使用后台任务，不阻塞用户
      console.log('🚀 创建后台AI生成任务...');
      
      // 🎬 保持"消息发送中"提示，模拟输入动画将在下面逐条显示
      // 用户可以退出页面，但如果留在页面则会看到完整的输入过程
      
      // 创建后台任务
      await backgroundTaskManager.createGenerationTask(
        conversation,
        apiConfig,
        requestBody,
        async (newMessages) => {
          // 后台任务完成回调
          console.log(`✅ 后台任务完成，收到${newMessages.length}条消息`);
          
          // 🎯 检查用户是否还在当前聊天页面
          const userStillOnPage = isComponentMountedRef.current;
          
          let currentMessages = [...conversation.messages];
          
          if (userStillOnPage) {
            // 👤 用户还在页面：显示完整的输入动画
            console.log('用户还在页面，显示输入动画');
            
            for (let i = 0; i < newMessages.length; i++) {
              // 显示输入动画
              setShowTyping(true);
              
              // 第一次显示输入动画时，隐藏"消息发送中"提示
              if (i === 0) {
                setShowSendingHint(false);
              }
              
              // 等待0.8-2秒模拟输入
              await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
              
              // 隐藏输入动画
              setShowTyping(false);
              
              // 添加这条消息到conversation
              currentMessages = [...currentMessages, newMessages[i]];
              onUpdateConversation(conversation.id, {
                messages: currentMessages,
                lastMessageTime: Date.now(),
              });
              
              // 短暂停顿再显示下一条
              if (i < newMessages.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
              }
            }
            
            // 所有消息显示完毕，隐藏生成状态
            setIsGenerating(false);
            
          } else {
            // 🚀 用户已离开：直接添加所有消息，不显示动画
            console.log('用户已离开页面，直接添加所有消息');
            
            // 直接添加所有消息
            currentMessages = [...conversation.messages, ...newMessages];
            onUpdateConversation(conversation.id, {
              messages: currentMessages,
              lastMessageTime: Date.now(),
            });
            
            // 清理状态（虽然用户已离开，但为了数据一致性）
            setShowSendingHint(false);
            setShowTyping(false);
            setIsGenerating(false);
          }
          
          // 使用最终的消息列表（确保同步）
          const updatedMessages = currentMessages;
          
          // 分析AI消息更新状态
          if (conversation.type === 'private' && conversation.characterSettings && newMessages.length > 0) {
            const firstMessageContent = newMessages[0].content;
            // 先尝试AI自主更新状态
            analyzeAndUpdateStatusFromAI(conversation.id, firstMessageContent).then(() => {
              // 然后再做常规分析
              analyzeMessageAndUpdateStatus(conversation.id, firstMessageContent).then(() => {
                getAIStatus(conversation.id).then(status => {
                  if (status) setAIStatus(status);
                });
              });
            });
          }
          
          // 触发消息通知（MessageNotification会处理）
          showMessageNotification(conversation.id, newMessages);
          
          // 🧠 检查是否需要自动总结记忆
          if (conversation.enabledFeatures?.includes('memory-system')) {
            if (shouldTriggerAutoSummary(conversation.id, updatedMessages.length)) {
              console.log('🧠 触发自动记忆总结，当前消息数:', updatedMessages.length);
              performMemorySummary(updatedMessages).catch(err => {
                console.error('记忆总结失败:', err);
                // 即使失败也更新计数器，避免重复尝试
                updateSummaryCounter(conversation.id, updatedMessages.length);
              });
            }
          }
          
          // 📸 检测是否请求AI发朋友圈
          const lastUserMessage = updatedMessages
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
          
          // 🔥 热梗系统已删除
        }
      );
      
      console.log('✅ 后台任务已创建，可以自由切换页面了');
      
    } catch (error) {
      console.error('Generate failed:', error);
      alert('生成失败，请检查配置和网络');
      setShowSendingHint(false);
      setShowTyping(false);
      setIsGenerating(false);
    }
  };

  // 旧的同步代码已被删除，现在使用后台任务
  /*
  const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('API 请求失败');
      }

      const data = await response.json();
      const assistantMessage = data.choices[0]?.message?.content;
      
      // 检查空回复
      if (!assistantMessage || assistantMessage.trim() === '') {
        setShowSendingHint(false);
        setShowTyping(false);
        
        // 显示详细的错误弹窗
        const errorDetails = [];
        if (!data.choices || data.choices.length === 0) {
          errorDetails.push('- API未返回有效的回复内容');
        }
        if (data.error) {
          errorDetails.push(`- API错误: ${data.error.message || '未知错误'}`);
        }
        if (response.status !== 200) {
          errorDetails.push(`- HTTP状态码: ${response.status}`);
        }
        
        alert(`AI回复失败\n\n可能的原因：\n${errorDetails.length > 0 ? errorDetails.join('\n') : '- API返回了空内容\n- 请检查网络连接\n- 请确认API配置正确\n- 尝试刷新页面重试'}`);
        return;
      }
      
      // 检查AI是否选择不回复
      if (assistantMessage.trim() === '[不回复]' || assistantMessage.includes('[不回复]')) {
        console.log('💬 AI选择不回复此消息');
        setShowSendingHint(false);
        setShowTyping(false);
        setIsGenerating(false);
        
        // 根据上下文生成智能提示
        const generateContextualHint = async () => {
          try {
            const aiName = conversation.characterSettings?.nickname || conversation.name;
            
            // 获取最近的对话上下文
            const recentMessages = conversation.messages.slice(-10).map(m => 
              `${m.role === 'user' ? '用户' : aiName}: ${m.content}`
            ).join('\n');
            
            // 构建包含角色设定的提示
            const characterInfo = conversation.characterSettings 
              ? `\n【你的角色设定】\n性格：${conversation.characterSettings.personality || ''}\n喜好/厌恶：${conversation.characterSettings.memoryEvents || ''}\n`
              : '';
            
            const hintPrompt = `你是 ${aiName}。${characterInfo}

【最近的对话】
${recentMessages}

【任务】
你刚才选择不回复用户的最后一条消息。请根据对话上下文和你的角色设定，用一句话解释为什么不回复。

【判断原因】
1. **情绪原因**：如果刚吵架/生气了 → "${aiName}现在还在生气，暂时不想理你"
2. **忙碌原因**：如果提到在忙/工作/学习/实验室 → "${aiName}可能在忙，暂时没空回复"
3. **话题原因**：
   - 用户提到你不喜欢的东西 → "${aiName}不太喜欢这个话题"
   - 话题无聊/重复 → "${aiName}觉得没什么好说的"
   - 话题敏感/尴尬 → "${aiName}不知道该怎么回复"
4. **性格原因**：根据你的性格特点（内向、高冷等）→ 用符合性格的说法

【要求】
- 语气要自然，像真人一样
- 只输出一句话，不要有任何前缀或解释  
- 控制在30字以内
- 要符合你的性格和当前情境

现在请生成提示：`;

            const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.apiKey}`,
              },
              body: JSON.stringify({
                model: apiConfig.modelName,
                messages: [{ role: 'user', content: hintPrompt }],
                max_tokens: 50,
                temperature: 0.7
              })
            });

            if (response.ok) {
              const data = await response.json();
              const contextualHint = data.choices[0]?.message?.content?.trim();
              if (contextualHint) {
                return contextualHint;
              }
            }
          } catch (error) {
            console.error('生成上下文提示失败:', error);
          }
          
          // 如果生成失败，使用默认提示
          const aiName = conversation.characterSettings?.nickname || conversation.name;
          return `${aiName}看到了你的消息，但现在不想回复`;
        };
        
        // 异步生成并显示提示
        generateContextualHint().then(contextualHint => {
          setTimeout(() => {
            const hint = document.createElement('div');
            hint.textContent = contextualHint;
            hint.style.cssText = `
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: rgba(0, 0, 0, 0.75);
              color: white;
              padding: 12px 24px;
              border-radius: 8px;
              font-size: 14px;
              z-index: 10000;
              animation: fadeInOut 2.5s ease-in-out;
              max-width: 80%;
              text-align: center;
            `;
            document.body.appendChild(hint);
            setTimeout(() => hint.remove(), 2500);
          }, 300);
        });
        
        return;
      }

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
        
        // 解析消息中的多媒体标记
        const msgContent = limitedMessages[i].trim();
        const imageMatch = msgContent.match(/\[图片[:：]([^\]]+)\]/);
        const videoMatch = msgContent.match(/\[视频[:：]([^\]]+)\]/);
        // 修改语音正则：更宽松地匹配语音内容，支持包含标点符号的内容
        const voiceMatch = msgContent.match(/\[语音[:：](.+?)(?:[，,]\s*(?:时长)?(\d+)秒?)?\]/);
        const stickerMatch = msgContent.match(/\[表情包[:：]([^\]]+)\]/);
        
        let newMessage: Message;
        
        if (imageMatch) {
          // AI发送图片
          const cleanContent = msgContent.replace(/\[图片[:：][^\]]+\]/, '').trim();
          newMessage = {
            id: Date.now().toString() + '_ai_' + i + Math.random(),
            role: 'assistant' as const,
            content: cleanContent || '[图片]',
            timestamp: Date.now(),
            mediaType: 'image',
            mediaDescription: imageMatch[1],
            isMediaDescriptionOnly: true
          };
        } else if (videoMatch) {
          // AI发送视频
          const cleanContent = msgContent.replace(/\[视频[:：][^\]]+\]/, '').trim();
          newMessage = {
            id: Date.now().toString() + '_ai_' + i + Math.random(),
            role: 'assistant' as const,
            content: cleanContent || '[视频]',
            timestamp: Date.now(),
            mediaType: 'video',
            mediaDescription: videoMatch[1],
            isMediaDescriptionOnly: true
          };
        } else if (voiceMatch) {
          // AI发送语音
          const cleanContent = msgContent.replace(/\[语音[:：].+?\]/, '').trim();
          newMessage = {
            id: Date.now().toString() + '_ai_' + i + Math.random(),
            role: 'assistant' as const,
            content: cleanContent || '[语音]',
            timestamp: Date.now(),
            mediaType: 'voice',
            mediaDescription: voiceMatch[1].trim(), // 语音内容（去掉时长部分）
            voiceDuration: parseInt(voiceMatch[2]) || 3, // 时长（秒）
            isMediaDescriptionOnly: true
          };
        } else if (stickerMatch) {
          // AI发送表情包
          const cleanContent = msgContent.replace(/\[表情包[:：][^\]]+\]/, '').trim();
          newMessage = {
            id: Date.now().toString() + '_ai_' + i + Math.random(),
            role: 'assistant' as const,
            content: cleanContent || '[表情包]',
            timestamp: Date.now(),
            mediaType: 'sticker',
            mediaDescription: stickerMatch[1],
            isMediaDescriptionOnly: true
          };
        } else {
          // 普通文字消息
          newMessage = {
            id: Date.now().toString() + '_ai_' + i + Math.random(),
            role: 'assistant' as const,
            content: msgContent,
            timestamp: Date.now(),
          };
        }
        
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

      // 🎯 分析AI消息并更新状态
      if (conversation.type === 'private' && conversation.characterSettings && assistantMessage) {
        // 先尝试AI自主更新状态（如果AI在消息中明确说要改状态）
        await analyzeAndUpdateStatusFromAI(conversation.id, assistantMessage);
        // 然后再做常规的状态分析
        await analyzeMessageAndUpdateStatus(conversation.id, assistantMessage);
        // 重新加载状态
        const updatedStatus = await getAIStatus(conversation.id);
        if (updatedStatus) {
          setAIStatus(updatedStatus);
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
  */

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
    <>
    <div className="h-full bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\"20\" height=\"20\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M0 0h20v20H0z\" fill=\"%23fafafa\"/%3E%3Cpath d=\"M0 0h10v10H0z\" fill=\"%23f5f5f5\" fill-opacity=\".5\"/%3E%3C/svg%3E")' }}>
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 -ml-1 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-800" strokeWidth={2.5} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-base font-semibold text-gray-900">{conversation.name}</h1>
            {conversation.type === 'private' && conversation.characterSettings ? (
              <button 
                onClick={() => setShowActivityModal(true)}
                className="flex items-center gap-1 hover:bg-gray-50 px-2 py-0.5 -ml-2 rounded transition-colors text-left"
              >
                <div className={`w-2 h-2 rounded-full ${
                  aiStatus?.status === 'online' ? 'bg-green-500' :
                  aiStatus?.status === 'busy' ? 'bg-yellow-500' :
                  aiStatus?.status === 'resting' ? 'bg-blue-500' :
                  aiStatus?.status === 'away' ? 'bg-gray-400' :
                  'bg-gray-300'
                }`}></div>
                <span className="text-xs text-gray-500">
                  {aiStatus?.statusText || '在线'}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-500">在线</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 免打扰按钮 */}
          <button
            onClick={() => {
              onUpdateConversation(conversation.id, {
                isMuted: !conversation.isMuted
              });
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={conversation.isMuted ? '关闭免打扰' : '开启免打扰'}
          >
            {conversation.isMuted ? (
              <BellOff className="w-5 h-5 text-gray-700" />
            ) : (
              <Bell className="w-5 h-5 text-gray-700" />
            )}
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
                    className={`rounded-2xl shadow-sm ${
                      message.role === 'user'
                        ? 'bg-white text-gray-900 border border-gray-200'
                        : 'bg-white text-gray-900 border border-gray-200'
                    } ${message.mediaType ? 'p-0 overflow-hidden' : 'px-4 py-2.5'}`}
                  >
                    {/* 用户真实媒体内容 */}
                    {message.role === 'user' && message.mediaType === 'image' && message.mediaUrl && (
                      <img 
                        src={message.mediaUrl} 
                        alt="图片" 
                        className="w-full max-w-[200px] rounded-2xl"
                      />
                    )}
                    {message.role === 'user' && message.mediaType === 'video' && message.mediaUrl && (
                      <video 
                        src={message.mediaUrl} 
                        controls 
                        className="w-full max-w-[200px] rounded-2xl"
                      />
                    )}
                    {message.role === 'user' && message.mediaType === 'voice' && message.mediaUrl && (
                      <div>
                        <div 
                          onClick={() => setViewingVoice(viewingVoice === message.id ? null : message.id)}
                          className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl min-w-[120px] max-w-[200px]"
                        >
                          <Mic className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          <div className="flex-1 flex items-center gap-0.5">
                            <div className="flex gap-0.5">
                              {[...Array(15)].map((_, i) => (
                                <div 
                                  key={i} 
                                  className="w-0.5 bg-gray-400 rounded-full"
                                  style={{ height: `${Math.random() * 12 + 4}px` }}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-gray-600 flex-shrink-0 mr-1">{message.voiceDuration || 0}"</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (playingVoice === message.id) {
                                audioRef.current?.pause();
                                setPlayingVoice(null);
                              } else {
                                if (audioRef.current) {
                                  audioRef.current.pause();
                                }
                                const audio = new Audio(message.mediaUrl);
                                audioRef.current = audio;
                                audio.play();
                                setPlayingVoice(message.id);
                                audio.onended = () => setPlayingVoice(null);
                              }
                            }}
                            className="flex-shrink-0 w-5 h-5 flex items-center justify-center hover:bg-gray-200 rounded-full transition-colors"
                          >
                            {playingVoice === message.id ? (
                              <Pause className="w-3 h-3 text-gray-600" />
                            ) : (
                              <Play className="w-3 h-3 text-gray-600" />
                            )}
                          </button>
                        </div>
                        {/* 语音内容文字（点击气泡显示） */}
                        {viewingVoice === message.id && message.mediaDescription && (
                          <div className="mt-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200">
                            <p className="text-[13px] text-gray-700">{message.mediaDescription}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {/* 用户表情包（浅蓝色半透明小正方形） */}
                    {message.role === 'user' && message.mediaType === 'sticker' && (
                      <div className="relative w-[120px] h-[120px] rounded-2xl overflow-hidden bg-blue-100/40 backdrop-blur-sm border border-blue-200">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-blue-100/30" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                          <Smile className="w-8 h-8 text-blue-400 mb-2" strokeWidth={1.5} />
                          <p className="text-xs text-gray-700 leading-tight">{message.mediaDescription}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* AI媒体消息（半透明占位符） */}
                    {message.role === 'assistant' && message.mediaType === 'image' && message.isMediaDescriptionOnly && (
                      <div 
                        onClick={() => alert(message.mediaDescription)}
                        className="relative w-[180px] h-[180px] rounded-2xl overflow-hidden bg-white/30 backdrop-blur-sm cursor-pointer hover:bg-white/40 transition-colors border border-gray-200"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-gray-100/20" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                          <Image className="w-12 h-12 text-gray-400 mb-2" strokeWidth={1.5} />
                          <p className="text-xs text-gray-600 line-clamp-3">{message.mediaDescription}</p>
                        </div>
                      </div>
                    )}
                    {message.role === 'assistant' && message.mediaType === 'video' && message.isMediaDescriptionOnly && (
                      <div 
                        onClick={() => alert(message.mediaDescription)}
                        className="relative w-[240px] h-[135px] rounded-2xl overflow-hidden bg-white/30 backdrop-blur-sm cursor-pointer hover:bg-white/40 transition-colors border border-gray-200"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-gray-100/20" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                          <Video className="w-12 h-12 text-gray-400 mb-2" strokeWidth={1.5} />
                          <p className="text-xs text-gray-600 line-clamp-2">{message.mediaDescription}</p>
                        </div>
                      </div>
                    )}
                    {message.role === 'assistant' && message.mediaType === 'voice' && message.isMediaDescriptionOnly && (
                      <div>
                        <div 
                          onClick={() => setViewingVoice(viewingVoice === message.id ? null : message.id)}
                          className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl min-w-[120px] max-w-[200px]"
                        >
                          <Mic className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          <div className="flex-1 flex items-center gap-0.5">
                            <div className="flex gap-0.5">
                              {[...Array(15)].map((_, i) => (
                                <div 
                                  key={i} 
                                  className="w-0.5 bg-gray-400 rounded-full"
                                  style={{ height: `${Math.random() * 12 + 4}px` }}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-gray-600 flex-shrink-0">{message.voiceDuration || 3}"</span>
                        </div>
                        {/* 语音内容文字（点击气泡显示） */}
                        {viewingVoice === message.id && message.mediaDescription && (
                          <div className="mt-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200">
                            <p className="text-[13px] text-gray-700">{message.mediaDescription}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {message.role === 'assistant' && message.mediaType === 'sticker' && message.isMediaDescriptionOnly && (
                      <div className="relative w-[120px] h-[120px] rounded-2xl overflow-hidden bg-blue-100/40 backdrop-blur-sm border border-blue-200">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-blue-100/30" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                          <Smile className="w-8 h-8 text-blue-400 mb-2" strokeWidth={1.5} />
                          <p className="text-xs text-gray-700 leading-tight">{message.mediaDescription}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* 纯文字内容 */}
                    {!message.mediaType && (
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                    )}
                    {/* 用户媒体的描述文字（排除语音和表情包） */}
                    {message.role === 'user' && message.mediaType && message.mediaType !== 'sticker' && message.mediaType !== 'voice' && message.mediaDescription && (
                      <p className="text-[13px] leading-relaxed px-3 py-2 text-gray-600">{message.mediaDescription}</p>
                    )}
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
              <button onClick={() => imageInputRef.current?.click()} className="flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <Image className="w-4 h-4 text-gray-600" />
                </div>
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <button onClick={() => videoInputRef.current?.click()} className="flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <Video className="w-4 h-4 text-gray-600" />
                </div>
              </button>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoUpload}
              />
              <button 
                className="flex-shrink-0"
                onClick={handleVoiceClick}
              >
                <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <Mic className="w-4 h-4 text-gray-600" />
                </div>
              </button>
              <button 
                className="flex-shrink-0"
                onClick={handleStickerClick}
              >
                <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <Smile className="w-4 h-4 text-gray-600" />
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

    {/* 表情包输入弹窗 */}
    {showStickerModal && (
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Smile className="w-5 h-5 text-blue-500" />
            发送表情包
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            请用文字描述表情包的内容，AI会理解并做出相应回复。
          </p>
          <textarea
            value={stickerDescInput}
            onChange={(e) => setStickerDescInput(e.target.value)}
            placeholder="例如：一只猫咪捂脸害羞的表情包"
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
            autoFocus
          />
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => {
                setShowStickerModal(false);
                setStickerDescInput('');
              }}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={handleSendSticker}
              disabled={!stickerDescInput.trim()}
              className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    )}

    {/* 视频描述弹窗 */}
    {showVideoDescModal && (
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">视频内容描述</h3>
          <p className="text-sm text-gray-600 mb-4">
            请填写视频内容的文字描述，以便AI更好地理解视频内容并做出回复。
          </p>
          <textarea
            value={videoDescInput}
            onChange={(e) => setVideoDescInput(e.target.value)}
            placeholder="例如：在海边散步的风景视频"
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
            autoFocus
          />
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => {
                setShowVideoDescModal(false);
                setVideoDescInput('');
                setPendingVideoFile(null);
              }}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={handleSendVideo}
              disabled={!videoDescInput.trim()}
              className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    )}

    {/* 录音中弹窗 */}
    {(isRecording || isTranscribing) && (
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <Mic className={`w-8 h-8 text-red-500 ${isRecording ? 'animate-pulse' : ''}`} />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isTranscribing ? '正在识别...' : '正在录音...'}
          </h3>
          <p className="text-3xl font-bold text-gray-900 mb-4">
            {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:{(recordingTime % 60).toString().padStart(2, '0')}
          </p>
          <p className="text-sm text-gray-600 mb-4">
            {isTranscribing ? '正在转换为文字，请稍候...' : '请说出您想发送的内容'}
          </p>
          {!isTranscribing && (
            <button
              onClick={() => {
                stopRecording();
                setIsRecording(false);
                setIsTranscribing(false);
              }}
              className="px-6 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
            >
              停止录音
            </button>
          )}
        </div>
      </div>
    )}

    {/* 语音识别确认弹窗 */}
    {showVoiceConfirmModal && (
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            ✍️ 输入语音内容
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            请输入这条语音消息的文字内容（录音时长：{recordingTime}秒）
          </p>
          <textarea
            value={voiceTranscript}
            onChange={(e) => setVoiceTranscript(e.target.value)}
            placeholder={voiceTranscript ? "识别的文字内容..." : "请输入语音内容..."}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
            autoFocus
          />
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => {
                setShowVoiceConfirmModal(false);
                setVoiceTranscript('');
                setAudioBlob(null);
              }}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            {!voiceTranscript && (
              <button
                onClick={() => {
                  setShowVoiceConfirmModal(false);
                  setVoiceTranscript('');
                  setAudioBlob(null);
                  // 重新录音
                  setTimeout(() => {
                    handleVoiceClick();
                  }, 300);
                }}
                className="flex-1 px-4 py-2.5 border border-blue-500 text-blue-500 rounded-xl hover:bg-blue-50 transition-colors font-medium"
              >
                重新录音
              </button>
            )}
            <button
              onClick={handleSendVoice}
              disabled={!voiceTranscript.trim()}
              className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    )}

    {/* AI行为轨迹弹窗 */}
    {conversation.type === 'private' && conversation.characterSettings && aiStatus && (
      <ActivityLogModal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        statusInfo={aiStatus}
        aiName={conversation.characterSettings.nickname || conversation.name}
        aiAvatar={conversation.characterSettings.avatar || conversation.avatar}
      />
    )}
    </>
  );
}
