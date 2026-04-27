import { useState, useEffect, useRef, useCallback } from 'react';
import { groupToPrivateMemoryService } from '../utils/groupToPrivateMemoryService';
import { ChevronLeft, Send, Mic, Smile, BellOff, Bell, Pause, Play, Image as ImageIcon, Video, Phone, MapPin, FileText, Plus, Search, MessageCircle, MessageSquare, Eye, Music, Gift, MoreHorizontal } from 'lucide-react';
import { Conversation, Message, ApiConfig, UserProfile, DocumentMessage } from '../types';
import MoneyTransferModal from './MoneyTransferModal';
import GroupRedPacketModal from './GroupRedPacketModal';
import GroupRedPacketCard from './GroupRedPacketCard';
import SendDocumentModal from './SendDocumentModal';
import DocumentLibraryModal from './DocumentLibraryModal';
import WordStyleDocumentCard from './WordStyleDocumentCard';
import WordStyleDocumentModal from './WordStyleDocumentModal';
import SelectContactModal from './SelectContactModal';
import { subChatMemoryManager } from '../utils/subChatMemoryManager';
import { saveDocument as saveToLibrary } from '../utils/documentLibrary';
import WeChatLinkPreview, { LinkPreviewData } from './WeChatLinkPreview';
import XiaohongshuLinkModal from './XiaohongshuLinkModal';
import XiaohongshuFeed from './XiaohongshuFeed';
import MusicShareModal from './MusicShareModal';
import RealMusicSearchModal from './RealMusicSearchModal';
import MusicPlayingWidget from './MusicPlayingWidget';
import MusicCard from './MusicCard';
import RealMusicCard from './RealMusicCard';
import { aiListeningSimulator, MusicInfo, MusicPlaybackState } from '../utils/musicService';
import { RealMusicInfo } from '../utils/realMusicService';
import { MusicMessage } from '../types';
import { musicContextService } from '../utils/musicContextService';
import ZhihuFeed from './ZhihuFeed';
import NeteaseMusicCard from './NeteaseMusicCard';
import { calculateVoiceDuration } from '../utils/voiceDurationCalculator';
import { isSingleEmojiText } from '../utils/systemEmoji';
import { smartLoad } from '../utils/storage';
import WeiboFeed from './WeiboFeed';
import SearchHistoryView from './SearchHistoryView';
import ChatSearchModal from './ChatSearchModal';
import { SmartHTMLGenerator } from '../utils/smartHTMLGenerator';
import { SavedDocument } from '../utils/documentLibrary';
import { sendMoney, receiveMoney, getBalance, aiPayForUser, refundGift } from '../utils/wallet';
import { backgroundGenerationService, type GenerationTask } from '../domains/generation';
import { schedulePendingReply, onTypingChange, isGenerating as isConvGenerating, initPendingReplyService } from '../domains/chat';
import { handleAIGroupRedPacketClaiming } from '../utils/aiGroupRedPacketDecision';
import { processExpiredRedPacketRefund } from '../utils/groupRedPacket';
import { calculateDeliveryStatus, formatEstimatedTime, getActiveStageIndex, getRiderInfo } from '../utils/orderDeliverySimulator';
import SubChatWindow from './SubChatWindow';
import SubChatManager from './SubChatManager';
import SubChatSuggestionModal from './SubChatSuggestionModal';
import { createSubChat, addSubChatToConversation, updateSubChatInConversation } from '../utils/subChatManager';
import { SubChatSuggestion } from '../utils/aiSubChatInitiator';
// AI理解力经验系统集成
import { ChatSessionManager, handleChatExperienceUpdate } from '../utils/chatExperienceIntegration';
import { bootstrapComprehensionSystem } from '../utils/comprehensionSystemBootstrap';
// 消息转发和多选相关导入
import MessageSelectionToolbar from './MessageSelectionToolbar';
import ForwardTargetSelector from './ForwardTargetSelector';
import { MergedForwardViewer } from './MergedForwardCard';
import { createSingleForward, createMergedForward, getMessagePreview } from '../utils/messageForward';
import { 
  formatMessageForAI, 
  prepareAssistantSegments,
  orchestrateAssistantSegment,
  validateAssistantOutput,
  buildProtocolRetryInstruction,
  createCommitUserMessageHandlers,
  commitEditedMessage
} from '../domains/chat';
import { buildUserMessageFromInput, commitUserMessage } from '../domains/chat';
import { buildMediaChatRequest } from '../domains/chat';
import { buildTextChatRequest } from '../domains/chat';
// 子聊天相关导入
import ChatExtractPreview from './ChatExtractPreview';
import {
  addMessageToSubChat,
  // removeSubChatFromConversation, // 未使用，暂时注释
  getTotalUnreadCount,
  getPendingSubChatsCount,
} from '../utils/subChatManager';
import { 
  getConversationMemories, 
  applyMemoriesToContext,
  shouldTriggerAutoSummary,
  buildMemorySummaryPrompt,
  parseMemorySummaryResponse,
  addMemory,
  updateSummaryCounter,
  getMemoryBank,
  buildDynamicProfileContext,
  shouldTriggerGroupMemorySummary,
  updateGroupSummaryCounter,
  buildGroupMemorySummaryPrompt,
  getGroupMemories,
  addGroupMemory
} from '../utils/memorySystem';
// import { detectMemes } from '../utils/memeSystem'; // 已删除热梗系统
import { messagePerceptionService } from '../utils/messagePerceptionService';
import { UnrepliedMessageInfo } from '../utils/timeAwareness';
import { getMomentsData } from '../domains/moments';
import { getAIStatus } from '../utils/aiStatusManager';
import { MEDIA_DECISION_GUIDANCE } from '../utils/mediaDecisionPrompt';
import { getNoActionRoleplayPrompt } from '../utils/chatStylePrompt';
import { getErrorFromResponse, formatErrorMessage, cleanAIMessage, stripDisplayControlTags, SmartLinkParser, buildTimeAwarePrompt, hasActionKeywords } from '../domains/chat';
// 群聊服务
import { generateGroupChatReplies, generateGroupChatRepliesFreeMode } from '../utils/groupChatService';
import GroupChatSettingsModal from './GroupChatSettingsModal';
import VideoCallModal from './VideoCallModal'; // 导入视频通话组件
import { CallLog } from '../types';
import WorldbookMountSettings from './WorldbookMountSettings';
import { WorldbookMountConfig } from '../types/worldbook';
import { buildWorldbookPrompt } from '../utils/worldbookPrompt';
import { buildStickerPrompt } from '../utils/stickerPrompt';
import UserStickerPicker from './UserStickerPicker';
import { StickerItem } from '../types/sticker';

import { showMessageNotification } from './MessageNotification';
import { MessageActionMenu } from './MessageActionMenu';
import { useToast } from './Toast';
import { useMessageNotification } from '../hooks/useMessageNotification';
// import { transcribeAudio, isValidSpeechConfig } from '../utils/speechToText';

interface ChatScreenProps {
  conversation: Conversation;
  apiConfig: ApiConfig;
  currentUserProfile?: UserProfile; // 当前用户资料（用于AI参考）
  conversations: Conversation[]; // 所有对话列表（用于转发）
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void;
  onDeleteConversation?: (id: string) => void; // 删除对话（用于群聊删除）
  onBack: () => void;
  onOpenCharacterSettings: () => void;
  onNavigateToPrivateChat?: (aiName: string) => void; // 新增：导航到与AI的私聊
}

export default function ChatScreen({
  conversation,
  apiConfig,
  currentUserProfile,
  conversations,
  onUpdateConversation,
  onDeleteConversation,
  onBack,
  onOpenCharacterSettings,
  onNavigateToPrivateChat,
}: ChatScreenProps) {
  const { showToast } = useToast();
  
  // 启用消息通知
  useMessageNotification({
    conversation,
    isActive: true, // ChatScreen打开时认为是激活状态
    userName: currentUserProfile?.username || '用户'
  });

  // 如果会话被隐藏，进入聊天时自动取消隐藏
  useEffect(() => {
    if (conversation.isHidden) {
      onUpdateConversation(conversation.id, { isHidden: false });
    }
  }, [conversation.id, conversation.isHidden, onUpdateConversation]);
  
  const [currentInput, setCurrentInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingUserMessages, setPendingUserMessages] = useState<string[]>([]); // AI回复时用户发送的消息
  const [showToolbar, setShowToolbar] = useState(false);
  const [showAdvancedToolbarActions, setShowAdvancedToolbarActions] = useState(false);
  const [showMoneyTransferModal, setShowMoneyTransferModal] = useState(false);
  const [showSendDocumentModal, setShowSendDocumentModal] = useState(false);
  const [showDocumentLibrary, setShowDocumentLibrary] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Message['document'] | null>(null);
  const [viewingXiaohongshuLink, setViewingXiaohongshuLink] = useState<LinkPreviewData | null>(null);
  const [selectedLibraryDoc, setSelectedLibraryDoc] = useState<SavedDocument | null>(null);
  const [showSelectContact, setShowSelectContact] = useState(false);
  const [forwardingDocument, setForwardingDocument] = useState<Message['document'] | null>(null);
  const [shouldEditDoc, setShouldEditDoc] = useState(false);
  const [showVideoDescModal, setShowVideoDescModal] = useState(false);
  const [videoDescInput, setVideoDescInput] = useState('');
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [stickerDescInput, setStickerDescInput] = useState('');
  const [showUserStickerPicker, setShowUserStickerPicker] = useState(false);
  const [showStickerTypeMenu, setShowStickerTypeMenu] = useState(false);
  const [viewingVoice, setViewingVoice] = useState<string[]>([]);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [showSendingHint, setShowSendingHint] = useState(false);
  const [isGroupProcessing, setIsGroupProcessing] = useState(false); // 🚀 新增：群聊处理中状态
  const [showTyping, setShowTyping] = useState(() => isConvGenerating(conversation.id));

  useEffect(() => {
    if (!showToolbar && showAdvancedToolbarActions) {
      setShowAdvancedToolbarActions(false);
    }
  }, [showToolbar, showAdvancedToolbarActions]);

  useEffect(() => {
    if (!showAdvancedToolbarActions) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        advancedToolbarPanelRef.current?.contains(target) ||
        advancedToolbarToggleRef.current?.contains(target)
      ) {
        return;
      }
      setShowAdvancedToolbarActions(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAdvancedToolbarActions]);
  
  
  // 群聊相关状态
  const [currentTypingAI, setCurrentTypingAI] = useState<{id: string; name: string; avatar?: string} | null>(null);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showGroupRedPacketModal, setShowGroupRedPacketModal] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false); // 视频通话状态
  const [callType, setCallType] = useState<'video' | 'voice'>('video');
  const [showCallTypeSelector, setShowCallTypeSelector] = useState(false);
  const [showWorldbookMount, setShowWorldbookMount] = useState(false); // 世界书挂载设置
  
  // 头像交互相关状态
  const [avatarMenuOpen, setAvatarMenuOpen] = useState<{ messageId: string; senderId: string; name: string; avatar?: string } | null>(null);
  
  // @ 成员列表相关状态
  const [showAtMemberList, setShowAtMemberList] = useState(false);
  const [atFilterText, setAtFilterText] = useState('');
  const [atCursorPosition, setAtCursorPosition] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const advancedToolbarPanelRef = useRef<HTMLDivElement | null>(null);
  const advancedToolbarToggleRef = useRef<HTMLButtonElement | null>(null);

  // 保存通话记录
  const handleSaveCallLog = (log: CallLog) => {
    const currentHistory = conversation.callHistory || [];
    // 保存系统消息通知
    const typeText = log.type === 'video' ? '📹 视频通话' : '📞 语音通话';
    const systemMsg: Message = {
      id: Date.now().toString(),
      role: 'system',
      content: `${typeText}结束，时长 ${Math.floor(log.duration / 60)}:${(log.duration % 60).toString().padStart(2, '0')}`,
      timestamp: Date.now()
    };
    
    onUpdateConversation(conversation.id, {
      messages: [...conversation.messages, systemMsg],
      callHistory: [...currentHistory, log],
      lastMessageTime: Date.now()
    });
  };
  
  // 消息操作相关状态
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [quotedMessage, setQuotedMessage] = useState<Message | null>(null);
  const [messageBeingEdited, setMessageBeingEdited] = useState<Message | null>(null);
  const [isDeleting, setIsDeleting] = useState(false); // 标记是否正在删除消息
  const [isEditing, setIsEditing] = useState(false); // 标记是否正在编辑消息
  
  // 多选删除状态
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  
  // 📤 消息转发状态
  const [showForwardSelector, setShowForwardSelector] = useState(false);
  const [forwardingMessages, setForwardingMessages] = useState<Message[]>([]);
  const [viewingMergedForward, setViewingMergedForward] = useState<Message['forwarded'] | null>(null);
  
  // 💬 子聊天相关状态
  const [showSubChatManager, setShowSubChatManager] = useState(false);
  const [activeSubChatId, setActiveSubChatId] = useState<string | null>(null);
  const [minimizedSubChats, setMinimizedSubChats] = useState<Set<string>>(new Set());
  
  // 🤖 AI主动发起子聊天相关状态
  const [subChatSuggestion, setSubChatSuggestion] = useState<SubChatSuggestion | null>(null);
  const [showSubChatSuggestionModal, setShowSubChatSuggestionModal] = useState(false);
  
  // 聊天记录提取预览相关状态
  const [showExtractPreview, setShowExtractPreview] = useState(false);
  const [extractingMessages, setExtractingMessages] = useState<Message[]>([]);
  
  // 计算子聊天统计
  const subChatUnreadCount = getTotalUnreadCount(conversation);
  const pendingSubChatsCount = getPendingSubChatsCount(conversation);
  
  // 🔥 确保用户查看聊天时，未读消息始终为 0
  useEffect(() => {
    if (conversation.unreadCount > 0) {
      onUpdateConversation(conversation.id, { unreadCount: 0 });
    }
  }, [conversation.id, conversation.unreadCount, onUpdateConversation]);

  // 🚀 初始化延后回复服务
  useEffect(() => {
    initPendingReplyService(
      onUpdateConversation,
      (id: string) => conversations.find(c => c.id === id),
      () => apiConfig,
      () => currentUserProfile || { username: '我', bio: '', personalInfo: {} }
    );
  }, [onUpdateConversation, conversations, apiConfig, currentUserProfile]);

  // 🚀 订阅延后回复服务的 typing 状态更新
  useEffect(() => {
    const unsub = onTypingChange((convId, typing) => {
      if (convId === conversation.id) setShowTyping(typing);
    });
    setShowTyping(isConvGenerating(conversation.id));
    return unsub;
  }, [conversation.id]);

  // 🚀 订阅后台生成服务的状态更新（保留用于群聊等其他功能）
  useEffect(() => {
    // 订阅当前对话的生成任务状态
    const unsubscribe = backgroundGenerationService.subscribe(
      conversation.id,
      (task: GenerationTask) => {
        setIsGenerating(task.status === 'generating');
      }
    );

    // 检查当前是否有正在进行的生成任务
    const currentTask = backgroundGenerationService.getTask(conversation.id);
    if (currentTask) {
      setIsGenerating(currentTask.status === 'generating');
    } else {
      setIsGenerating(false);
    }

    // 清理订阅
    return () => {
      unsubscribe();
    };
  }, [conversation.id]);
  
  // 生成智能的不回复提示
  const generateContextualHint = async (conversationData: Conversation) => {
    try {
      const aiName = conversationData.characterSettings?.nickname || conversationData.name;
      
      // 获取最近的对话上下文
      const recentMessages = conversationData.messages.slice(-10).map(m => 
        `${m.role === 'user' ? '用户' : aiName}: ${m.content}`
      ).join('\n');
      
      // 构建包含角色设定的提示
      const characterInfo = conversationData.characterSettings 
        ? `\n【你的角色设定】\n性格：${conversationData.characterSettings.personality || ''}\n喜好/厌恶：${conversationData.characterSettings.memoryEvents || ''}\n`
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
        const contextualHintRaw = data.choices[0]?.message?.content?.trim();
        if (contextualHintRaw) {
          // 使用与普通对话相同的清洗逻辑，避免模型把内部格式/标签直接吐出来
          const cleanedHint = cleanAIMessage(contextualHintRaw);
          return cleanedHint || contextualHintRaw;
        }
      }
    } catch (error) {
      console.error('生成上下文提示失败:', error);
    }
    
    // 如果生成失败，使用中性兜底提示（不依赖上下文）
    return '对方可能暂时忙碌，没有立即回复';
  };
  
  // 统一处理“AI选择不回复”的系统提示
  const handleAINoReply = async (targetConversationId: string) => {
    try {
      let targetConversation: Conversation | undefined = conversation;

      // 从智能存储获取最新会话数据（大数据走 IndexedDB，避免 localStorage 爆炸）
      try {
        const allConversations = (await smartLoad('conversations')) as Conversation[] | null;
        const latest = allConversations?.find(c => c.id === targetConversationId);
        if (latest) {
          targetConversation = latest;
        }
      } catch (e) {
        console.error('读取会话数据失败:', e);
      }

      if (!targetConversation) {
        console.warn('handleAINoReply: 未找到目标会话，使用当前会话作为退路');
        targetConversation = conversation;
      }

      const contextualHint = await generateContextualHint(targetConversation);

      const systemMessage: Message = {
        id: Date.now().toString(),
        role: 'system',
        content: contextualHint,
        timestamp: Date.now(),
      };

      onUpdateConversation(targetConversationId, {
        messages: [...targetConversation.messages, systemMessage],
        lastMessageTime: Date.now(),
      });
    } catch (err) {
      console.error('handleAINoReply 处理失败:', err);
    } finally {
      // 无论如何都要清理 loading / 打字状态
      setShowSendingHint(false);
      setShowTyping(false);
      setIsGenerating(false);
    }
  };
  
  // 追踪用户是否还在当前聊天页面
  const isComponentMountedRef = useRef(true);
  
  // AI状态相关state
  const [aiStatus, setAIStatus] = useState<any | null>(null);
  
  // 搜索相关state
  const [showSearchModal, setShowSearchModal] = useState(false);
  
  // 🎵 音乐相关state
  const [showMusicShareModal, setShowMusicShareModal] = useState(false);
  const [showRealMusicModal, setShowRealMusicModal] = useState(false);
  const [currentMusic, setCurrentMusic] = useState<MusicInfo | null>(null);
  const [musicPlaybackState, setMusicPlaybackState] = useState<MusicPlaybackState | null>(null);
  
  // 🚀 性能优化：消息窗口加载 (智能显示目标消息及上下文)
  const [messageWindow, setMessageWindow] = useState<{
    startIndex: number; // 窗口起始索引
    size: number;       // 窗口大小
  }>(() => {
    // 初始状态：显示最新50条消息
    const initialSize = 50;
    const totalMessages = conversation.messages.length;
    return {
      startIndex: Math.max(0, totalMessages - initialSize),
      size: Math.min(initialSize, totalMessages)
    };
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);
  
  // 🚚 配送状态刷新触发器（每30秒更新一次）
  const [deliveryRefreshTrigger, setDeliveryRefreshTrigger] = useState(0);
  
  // 检查用户是否在底部
  const isAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const threshold = 100; // 100px的误差范围
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }, []);
  
  // 智能滚动到底部
  const smartScrollToBottom = useCallback((smooth = false) => {
    const container = messagesContainerRef.current;
    if (container) {
      if (smooth) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      } else {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, []);
  
  // 延迟重置滚动状态
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadMoreTopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadMoreBottomTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // 滚动加载更多消息
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || isLoadingMore) return;
    
    // 标记用户正在滚动
    setIsUserScrolling(true);
    
    // 检查是否应该自动滚动到底部（用户在底部附近）
    setShouldScrollToBottom(isAtBottom());
    
    // 清除之前的定时器
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // 延迟重置滚动状态，让"返回底部"按钮有时间显示
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 2000); // 2秒后重置
    
    // 🔼 向上滚动：加载更早的消息
    if (container.scrollTop < 100 && messageWindow.startIndex > 0) {
      setIsLoadingMore(true);
      if (loadMoreTopTimeoutRef.current) {
        clearTimeout(loadMoreTopTimeoutRef.current);
      }
      
      loadMoreTopTimeoutRef.current = setTimeout(() => {
        const loadMore = 30;
        const newStartIndex = Math.max(0, messageWindow.startIndex - loadMore);
        const addedMessages = messageWindow.startIndex - newStartIndex;
        const prevScrollHeight = container.scrollHeight;
        
        setMessageWindow(prev => ({
          startIndex: newStartIndex,
          size: prev.size + addedMessages
        }));
        setIsLoadingMore(false);
        
        // 保持滚动位置，避免跳动
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - prevScrollHeight;
          }
        });
        loadMoreTopTimeoutRef.current = null;
      }, 300);
    }
    
    // 🔽 向下滚动：加载更新的消息（如果不在末尾）
    const maxScrollTop = container.scrollHeight - container.clientHeight;
    const isNearBottom = container.scrollTop > maxScrollTop - 100;
    const windowEndIndex = messageWindow.startIndex + messageWindow.size;
    
    if (isNearBottom && windowEndIndex < conversation.messages.length) {
      setIsLoadingMore(true);
      if (loadMoreBottomTimeoutRef.current) {
        clearTimeout(loadMoreBottomTimeoutRef.current);
      }
      
      loadMoreBottomTimeoutRef.current = setTimeout(() => {
        const loadMore = 30;
        const maxSize = conversation.messages.length - messageWindow.startIndex;
        const newSize = Math.min(messageWindow.size + loadMore, maxSize);
        
        setMessageWindow(prev => ({
          ...prev,
          size: newSize
        }));
        setIsLoadingMore(false);
        loadMoreBottomTimeoutRef.current = null;
      }, 300);
    }
  }, [messageWindow, conversation.messages.length, isLoadingMore, isAtBottom]);
  
  // 监听滚动事件
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => {
        container.removeEventListener('scroll', handleScroll);
        // 清理滚动定时器
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        if (loadMoreTopTimeoutRef.current) {
          clearTimeout(loadMoreTopTimeoutRef.current);
        }
        if (loadMoreBottomTimeoutRef.current) {
          clearTimeout(loadMoreBottomTimeoutRef.current);
        }
      };
    }
  }, [handleScroll]);
  
  // 处理新消息和状态重置
  useEffect(() => {
    const currentMessageCount = conversation.messages.length;
    const prevMessageCount = lastMessageCountRef.current;
    
    // 1️⃣ 切换对话时：重置状态并滚动到底部
    if (prevMessageCount === 0 || currentMessageCount < prevMessageCount) {
      console.log('🔄 切换对话，重置消息窗口状态');
      const initialSize = 50;
      setMessageWindow({
        startIndex: Math.max(0, currentMessageCount - initialSize),
        size: Math.min(initialSize, currentMessageCount)
      });
      setShouldScrollToBottom(true);
      setIsUserScrolling(false);
      
      setTimeout(() => smartScrollToBottom(), 100);
    }
    // 2️⃣ 有新消息时：智能滚动处理
    else if (currentMessageCount > prevMessageCount) {
      console.log('📨 检测到新消息，智能处理滚动');
      
      // 如果用户在底部附近，自动调整窗口显示新消息
      if (shouldScrollToBottom) {
        setMessageWindow(prev => {
          const windowEndIndex = prev.startIndex + prev.size;
          const isShowingLatest = windowEndIndex >= prevMessageCount;
          
          if (isShowingLatest) {
            // 扩展窗口以包含新消息
            return {
              startIndex: prev.startIndex,
              size: prev.size + (currentMessageCount - prevMessageCount)
            };
          } else {
            // 保持窗口大小，但移动到最新位置
            return {
              startIndex: Math.max(0, currentMessageCount - prev.size),
              size: Math.min(prev.size, currentMessageCount)
            };
          }
        });
        setTimeout(() => smartScrollToBottom(true), 100);
      }
      // 如果用户在查看历史消息，不自动滚动，保持当前窗口
    }
    
    // 更新消息数量记录
    lastMessageCountRef.current = currentMessageCount;
  }, [conversation.messages.length, conversation.id, shouldScrollToBottom, smartScrollToBottom]);
  
  // 初始滚动到底部，显示最新消息
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container && conversation.id) {
      // 延迟执行，确保DOM已渲染完成
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [conversation.id]); // 切换对话时重新滚动到底部
  
  // 🎯 AI理解力系统初始化（仅对AI儿童有效）
  useEffect(() => {
    let isInitialized = false;
    
    const initializeComprehensionSystem = async () => {
      if (isInitialized || !conversation.aiChildData) return;
      isInitialized = true;
      
      try {
        console.log('🎯 为AI儿童初始化理解力系统：', conversation.id);
        
        // 初始化理解力系统
        const result = await bootstrapComprehensionSystem();
        if (result.success) {
          console.log('✅ 理解力系统初始化成功');
          
          // 启动聊天会话管理
          ChatSessionManager.startSession(conversation.id);
        } else {
          console.warn('⚠️ 理解力系统初始化失败：', result.message);
        }
      } catch (error) {
        console.error('❌ 理解力系统初始化出错：', error);
      }
    };
    
    initializeComprehensionSystem();
    
    // 清理函数
    return () => {
      if (conversation.aiChildData && ChatSessionManager.getSession(conversation.id)) {
        console.log('🎯 清理AI儿童聊天会话：', conversation.id);
        ChatSessionManager.endSession(conversation, conversation.messages);
      }
    };
  }, [conversation.id, conversation.aiChildData]); // 当对话ID或AI儿童数据变化时重新初始化
  
  // 🚚 定期更新配送状态（每5分钟）
  useEffect(() => {
    const interval = setInterval(() => {
      setDeliveryRefreshTrigger(prev => prev + 1);
    }, 300000); // 每5分钟（300秒）更新一次，降低资源消耗
    
    return () => clearInterval(interval);
  }, []);
  
  // 🔙 定期检查过期红包并自动退款
  useEffect(() => {
    // 每分钟检查一次过期红包
    const checkInterval = setInterval(() => {
      let hasRefund = false;
      const updatedMessages = conversation.messages.map(msg => {
        if (msg.moneyTransfer?.type === 'groupRedPacket' && msg.moneyTransfer.groupRedPacket) {
          const redPacket = msg.moneyTransfer.groupRedPacket;
          
          // 处理过期退款
          const result = processExpiredRedPacketRefund(
            redPacket,
            (senderId, senderName, refundAmount) => {
              console.log(`🔙 红包过期退款: ${senderName} 收到 ¥${refundAmount.toFixed(2)}`);
              
              // 如果是用户发的红包，退款到用户余额
              if (senderId === 'user' || msg.role === 'user') {
                receiveMoney(refundAmount, 'redPacket', conversation.id, '红包过期退回');
                hasRefund = true;
              }
            }
          );
          
          if (result.refunded) {
            // 返回更新后的消息（红包状态已在processExpiredRedPacketRefund中更新）
            return {
              ...msg,
              moneyTransfer: {
                ...msg.moneyTransfer,
                groupRedPacket: redPacket
              }
            };
          }
        }
        return msg;
      });
      
      // 如果有退款，更新对话
      if (hasRefund) {
        onUpdateConversation(conversation.id, {
          messages: updatedMessages
        });
      }
    }, 60000); // 每60秒检查一次
    
    return () => clearInterval(checkInterval);
  }, [conversation.id, conversation.messages, onUpdateConversation]);
  
  // 语音转文字相关state（Web Speech API）
  const [showVoiceConfirmModal, setShowVoiceConfirmModal] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isSpeechRecognizing, setIsSpeechRecognizing] = useState(false);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false);
  const speechRecognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>(''); // 🔥 追踪已确认的最终文本，避免重复
  
  // 检测Web Speech API支持
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechRecognitionSupported(!!SpeechRecognition);
  }, []);
  
  // 旧的消息操作状态已移除，使用新的实现（selectedMessageId, menuPosition等）
  
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

  // 消息点击处理 - 显示胶囊菜单
  const handleMessageClick = (messageId: string, event: React.MouseEvent) => {
    // 如果点击的是操作按钮或语音/视频/图片等媒体控件，不处理
    const target = event.target as HTMLElement;
    if (target.closest('.message-action-btn') || 
        target.closest('audio') || 
        target.closest('video') || 
        target.closest('button') ||
        target.tagName === 'IMG') {
      return;
    }
    
    // 获取点击位置，显示菜单
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;
    
    setSelectedMessageId(messageId);
    setMenuPosition({ x, y });
  };

  // 关闭菜单
  const handleCloseMenu = () => {
    setSelectedMessageId(null);
  };

  // 删除消息
  const handleDeleteMessage = () => {
    if (!selectedMessageId) return;
    
    setIsDeleting(true); // 标记正在删除
    const updatedMessages = conversation.messages.filter(m => m.id !== selectedMessageId);
    onUpdateConversation(conversation.id, { messages: updatedMessages });
    setSelectedMessageId(null);
    
    // 删除完成后立即恢复标记
    setIsDeleting(false);
  };

  // 编辑消息（所有消息都可编辑）
  const handleEditMessage = () => {
    if (!selectedMessageId) return;
    
    const message = conversation.messages.find(m => m.id === selectedMessageId);
    if (!message) return;
    
    setMessageBeingEdited(message);
    setCurrentInput(message.content);
    setSelectedMessageId(null);
    
    // 聚焦输入框
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // 引用消息
  const handleQuoteMessage = () => {
    if (!selectedMessageId) return;
    
    const message = conversation.messages.find(m => m.id === selectedMessageId);
    if (!message) return;
    
    setQuotedMessage(message);
    setSelectedMessageId(null);
    
    // 聚焦输入框
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // 取消引用
  const handleCancelQuote = () => {
    setQuotedMessage(null);
    inputRef.current?.focus();
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setMessageBeingEdited(null);
    setCurrentInput('');
    if (inputRef.current) {
      (inputRef.current as unknown as HTMLTextAreaElement).style.height = '24px';
      inputRef.current.focus();
    }
  };

  // 进入多选模式
  const handleEnterMultiSelect = () => {
    setIsMultiSelectMode(true);
    setSelectedMessages([selectedMessageId!]); // 把当前选中的消息加入多选
    setSelectedMessageId(null);
  };

  // 切换消息选中状态
  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => 
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  // 批量删除消息
  const handleBatchDelete = () => {
    if (selectedMessages.length === 0) return;
    
    setIsDeleting(true);
    const updatedMessages = conversation.messages.filter(m => !selectedMessages.includes(m.id));
    onUpdateConversation(conversation.id, { messages: updatedMessages });
    setSelectedMessages([]);
    setIsMultiSelectMode(false);
    
    setIsDeleting(false);
  };

  // 取消多选模式
  const handleCancelMultiSelect = () => {
    setIsMultiSelectMode(false);
    setSelectedMessages([]);
  };

  // 📤 提取选中消息为文档 - 显示预览
  const handleExtractToDocument = () => {
    if (selectedMessages.length === 0) return;
    
    // 获取选中的消息对象
    const selectedMsgs = conversation.messages.filter(m => 
      selectedMessages.includes(m.id)
    );
    
    // 设置提取状态并显示预览弹窗
    setExtractingMessages(selectedMsgs);
    setShowExtractPreview(true);
    
    // 退出多选模式
    setIsMultiSelectMode(false);
    setSelectedMessages([]);
  };

  // 📄 保存提取的文档
  const handleSaveExtractedDocument = (document: DocumentMessage) => {
    // 创建文档消息
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: document.greeting || '已为您提取聊天记录',
      timestamp: Date.now(),
      document
    };
    
    // 添加到会话
    onUpdateConversation(conversation.id, {
      messages: [...conversation.messages, newMessage]
    });
    
    // 关闭预览弹窗
    setShowExtractPreview(false);
    setExtractingMessages([]);
    
    showToast('文档已保存到聊天记录', 'success');
  };

  // 📤 转发选中消息
  const handleForwardMessages = () => {
    if (selectedMessages.length === 0) return;
    
    // 获取选中的消息对象
    const selectedMsgs = conversation.messages.filter(m => 
      selectedMessages.includes(m.id)
    );
    
    setForwardingMessages(selectedMsgs);
    setShowForwardSelector(true);
  };

  // 📤 确认转发到目标会话
  const handleConfirmForward = (targetConversationIds: string[], mergeForward: boolean) => {
    if (forwardingMessages.length === 0) return;
    
    targetConversationIds.forEach(targetId => {
      const targetConv = conversations?.find(c => c.id === targetId);
      if (!targetConv) return;
      
      let newMessage: Message;
      
      if (mergeForward && forwardingMessages.length > 1) {
        // 合并转发
        const senderNames = new Map<string, { name: string; avatar?: string }>();
        forwardingMessages.forEach(msg => {
          const name = msg.role === 'user' 
            ? (currentUserProfile?.username || '我')
            : (conversation.characterSettings?.nickname || conversation.name);
          const avatar = msg.role === 'user'
            ? (currentUserProfile?.avatar)
            : (conversation.characterSettings?.avatar || conversation.avatar);
          senderNames.set(msg.id, { name, avatar });
        });
        
        const forwardedData = createMergedForward(
          forwardingMessages,
          {
            id: conversation.id,
            name: conversation.characterSettings?.nickname || conversation.name,
            type: conversation.type
          },
          senderNames
        );
        
        newMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'user',
          content: '转发了聊天记录',
          timestamp: Date.now(),
          forwarded: forwardedData
        };
      } else {
        // 单条转发
        const msg = forwardingMessages[0];
        const forwardedData = createSingleForward(
          msg,
          {
            id: conversation.id,
            name: conversation.characterSettings?.nickname || conversation.name,
            type: conversation.type
          }
        );
        
        newMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'user',
          content: forwardingMessages.length === 1 ? getMessagePreview(msg) : '转发了多条消息',
          timestamp: Date.now(),
          forwarded: forwardedData
        };
      }
      
      // 更新目标会话
      commitOutgoingUserMessageToConversation(targetConv, newMessage);
    });
    
    // 关闭选择器
    setShowForwardSelector(false);
    setForwardingMessages([]);
    
    // 退出多选模式
    setIsMultiSelectMode(false);
    setSelectedMessages([]);
    
    showToast(`已转发到${targetConversationIds.length}个会话`, 'success');
  };

  // 📤 从长按菜单转发单条消息
  const handleForwardSingleMessage = () => {
    if (!selectedMessageId) return;
    
    const message = conversation.messages.find(m => m.id === selectedMessageId);
    if (!message) return;
    
    setForwardingMessages([message]);
    setShowForwardSelector(true);
    setSelectedMessageId(null);
  };

  // 旧的消息操作函数已删除，使用新实现

  // 追踪组件挂载状态（用户是否还在页面）
  useEffect(() => {
    isComponentMountedRef.current = true;
    
    return () => {
      // 组件卸载时（用户离开页面）
      isComponentMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // 删除或编辑时不自动滚动，其他情况正常滚动
    if (!isDeleting && !isEditing) {
      scrollToBottom();
    }
  }, [conversation.messages, isGenerating, isDeleting, isEditing]);

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
      
      // 🔥 性能优化：移除定时刷新，AI状态只在有消息时更新
      // const interval = setInterval(loadStatus, 30000);
      // return () => clearInterval(interval);
    }
  }, [conversation.id, conversation.type, conversation.characterSettings]);

  // 🎵 音乐播放状态更新 - 同步到AI上下文服务
  useEffect(() => {
    if (!currentMusic) return;

    const updatePlaybackState = () => {
      const state = aiListeningSimulator.getCurrentState();
      setMusicPlaybackState(state);
      
      // 🎵 同步播放状态到音乐上下文服务
      if (state) {
        // 转换类型兼容
        const audioState = {
          isPlaying: state.isPlaying,
          currentTime: state.currentTime,
          duration: state.duration,
          volume: 1 // 默认音量
        };
        musicContextService.updatePlaybackState(audioState);
      }
    };

    // 立即更新一次
    updatePlaybackState();

    // 每秒更新播放状态
    const interval = setInterval(updatePlaybackState, 1000);

    return () => clearInterval(interval);
  }, [currentMusic]);

  // ============ 💬 子聊天功能处理函数 ============
  
  /**
   * 创建用户发起的子聊天
   */
  const handleCreateUserSubChat = (name: string) => {
    const newSubChat = createSubChat(name, conversation.id, 'user');
    const updatedConversation = addSubChatToConversation(conversation, newSubChat);
    onUpdateConversation(conversation.id, {
      subChats: updatedConversation.subChats,
    });
    
    // 自动打开新创建的子聊天
    setActiveSubChatId(newSubChat.id);
    setShowSubChatManager(false);
  };

  /**
   * 选择/打开子聊天
   */
  const handleSelectSubChat = (subChatId: string) => {
    // 标记为已读并激活
    const updatedConversation = updateSubChatInConversation(
      conversation,
      subChatId,
      { unreadCount: 0, status: 'active', isActive: true }
    );
    
    onUpdateConversation(conversation.id, {
      subChats: updatedConversation.subChats,
    });
    
    setActiveSubChatId(subChatId);
    setShowSubChatManager(false);
    
    // 从最小化列表中移除
    setMinimizedSubChats(prev => {
      const newSet = new Set(prev);
      newSet.delete(subChatId);
      return newSet;
    });
  };

  /**
   * 重命名子聊天
   */
  const handleRenameSubChat = (subChatId: string, newName: string) => {
    const updatedConversation = updateSubChatInConversation(
      conversation,
      subChatId,
      { name: newName }
    );
    
    onUpdateConversation(conversation.id, {
      subChats: updatedConversation.subChats,
    });
  };

  /**
   * 删除子聊天
   */
  const handleDeleteSubChat = (subChatId: string) => {
    // 如果当前正在查看这个子聊天，先关闭它
    if (activeSubChatId === subChatId) {
      setActiveSubChatId(null);
    }
    
    // 从最小化列表中移除
    setMinimizedSubChats(prev => {
      const newSet = new Set(prev);
      newSet.delete(subChatId);
      return newSet;
    });
    
    // 从对话中删除子聊天
    const updatedSubChats = (conversation.subChats || []).filter(sc => sc.id !== subChatId);
    onUpdateConversation(conversation.id, { subChats: updatedSubChats });
  };

  /**
   * 导入子聊天
   */
  const handleImportSubChat = (importData: any) => {
    try {
      // 生成新的ID避免冲突
      const newSubChatId = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 创建新的子聊天对象
      const importedSubChat = {
        ...importData.subChat,
        id: newSubChatId,
        conversationId: conversation.id, // 更新为当前对话ID
        createdAt: Date.now(),
        lastMessageTime: Date.now(),
        unreadCount: 0,
        isActive: false,
        status: 'active' as const,
      };
      
      // 更新消息ID避免冲突
      const importedMessages = importData.messages.map((msg: any) => ({
        ...msg,
        id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      }));
      
      importedSubChat.messages = importedMessages;
      
      // 添加到当前对话的子聊天列表
      const updatedSubChats = [...(conversation.subChats || []), importedSubChat];
      onUpdateConversation(conversation.id, { subChats: updatedSubChats });
      
      // 自动打开导入的子聊天
      setActiveSubChatId(newSubChatId);
      setShowSubChatManager(false);
      
    } catch (error) {
      console.error('导入子聊天处理失败:', error);
      alert('❌ 导入处理失败，请重试');
    }
  };

  /**
   * 关闭子聊天窗口
   */
  const handleCloseSubChat = (subChatId: string) => {
    const updatedConversation = updateSubChatInConversation(
      conversation,
      subChatId,
      { isActive: false }
    );
    
    onUpdateConversation(conversation.id, {
      subChats: updatedConversation.subChats,
    });
    
    if (activeSubChatId === subChatId) {
      setActiveSubChatId(null);
    }
    
    setMinimizedSubChats(prev => {
      const newSet = new Set(prev);
      newSet.delete(subChatId);
      return newSet;
    });
  };

  /**
   * 最小化/恢复子聊天窗口
   */
  const handleToggleMinimizeSubChat = (subChatId: string) => {
    setMinimizedSubChats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subChatId)) {
        newSet.delete(subChatId);
      } else {
        newSet.add(subChatId);
      }
      return newSet;
    });
  };

  /**
   * 在子聊天中发送消息
   */
  const handleSendSubChatMessage = async (subChatId: string, content: string) => {
    const subChat = (conversation.subChats || []).find(sc => sc.id === subChatId);
    if (!subChat) return;
    
    let updatedSubChat = subChat;
    
    // 如果有用户输入内容，先添加用户消息
    if (content.trim()) {
      const userMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      };
      
      // 添加到子聊天
      updatedSubChat = addMessageToSubChat(subChat, userMessage);
      
      // 更新对话
      onUpdateConversation(conversation.id, {
        subChats: (conversation.subChats || []).map(sc =>
          sc.id === subChatId ? updatedSubChat : sc
        ),
      });
    }
    
    // 4. 调用AI生成回复
    setIsGenerating(true);
    
    try {
      const characterName = conversation.characterSettings?.nickname || conversation.name;
      const characterPersonality = conversation.characterSettings?.personality || '';
      
      // 增强的system prompt - 包含角色的完整设定
      const characterInfo = conversation.characterSettings;
      const systemPrompt = `你是${characterName}。
      
${characterPersonality ? `性格：${characterPersonality}` : ''}
${characterInfo?.memoryEvents ? `重要记忆：${characterInfo.memoryEvents}` : ''}
${characterInfo?.languageStyle ? `语言风格：${characterInfo.languageStyle}` : ''}

这是一个子聊天窗口，你可以看到主聊天的完整历史和当前子聊天的内容。
子聊天名称：${updatedSubChat.name}
请保持角色一致性，自然回复当前对话。`;

      // 构建完整的消息历史：主聊天 + 子聊天标记 + 子聊天消息
      const messages = [
        { role: 'system', content: systemPrompt },
        // 1. 包含主聊天的所有消息
        ...conversation.messages.map(msg => ({
          role: msg.role,
          content: formatMessageForAI(msg),
        })),
        // 2. 标记子聊天开始
        { 
          role: 'system', 
          content: `[开始子聊天窗口: ${updatedSubChat.name}]` 
        },
        // 3. 子聊天的消息
        ...updatedSubChat.messages.map(msg => ({
          role: msg.role,
          content: formatMessageForAI(msg),
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
          temperature: 0.8,
        }),
      });
      
      if (!response.ok) {
        throw new Error('AI回复失败');
      }
      
      const data = await response.json();
      const aiContent = data.choices?.[0]?.message?.content || '抱歉，我现在无法回复。';
      
      // 5. 创建AI消息
      const aiMessage: Message = {
        id: `msg_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: aiContent,
        timestamp: Date.now(),
      };
      
      // 6. 添加AI回复到子聊天
      updatedSubChat = addMessageToSubChat(updatedSubChat, aiMessage);
      
      // 7. 更新对话
      onUpdateConversation(conversation.id, {
        subChats: (conversation.subChats || []).map(sc =>
          sc.id === subChatId ? updatedSubChat : sc
        ),
      });
      
    } catch (error) {
      console.error('子聊天AI回复失败:', error);
      showToast('AI回复失败，请重试', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * AI发起子聊天建议（显示弹窗让用户选择）
   */
  const handleAIInitiateSubChat = (purpose: string, suggestedName: string) => {
    // 创建子聊天建议
    const suggestion: SubChatSuggestion = {
      id: `ai_suggestion_${Date.now()}`,
      purpose,
      suggestedName,
      reason: '基于当前对话内容，AI认为开启子聊天会更好',
      priority: 'medium',
      timestamp: Date.now()
    };
    
    // 显示建议弹窗
    setSubChatSuggestion(suggestion);
    setShowSubChatSuggestionModal(true);
  };

  /**
   * 处理用户接受AI的子聊天建议
   */
  const handleAcceptSubChatSuggestion = (name: string, purpose: string) => {
    if (!subChatSuggestion) return;
    
    const newSubChat = createSubChat(name, conversation.id, 'ai', purpose);
    const updatedConversation = addSubChatToConversation(conversation, newSubChat);
    
    onUpdateConversation(conversation.id, {
      subChats: updatedConversation.subChats,
    });
    
    // 自动打开新创建的子聊天
    setActiveSubChatId(newSubChat.id);
    
    // 关闭建议弹窗
    setShowSubChatSuggestionModal(false);
    setSubChatSuggestion(null);
    
    showToast(`已创建子聊天：${name}`, 'success');
  };

  /**
   * 处理用户拒绝AI的子聊天建议
   */
  const handleRejectSubChatSuggestion = () => {
    setShowSubChatSuggestionModal(false);
    setSubChatSuggestion(null);
  };

  const resetInputHeight = () => {
    if (inputRef.current) {
      (inputRef.current as unknown as HTMLTextAreaElement).style.height = '24px';
    }
  };

  const finalizeMessageInput = (options?: { clearQuotedMessage?: boolean; focusInput?: boolean }) => {
    setCurrentInput('');
    if (options?.clearQuotedMessage) {
      setQuotedMessage(null);
    }
    resetInputHeight();
    if (options?.focusInput) {
      inputRef.current?.focus();
    }
  };

  const getDisplayText = (content?: string): string => stripDisplayControlTags(content || '').trim();
  const isMediaPlaceholderText = (content: string): boolean =>
    /^\[(?:多媒体消息|图片|视频|语音|表情包|img|image|video|voice|sticker)\]$/i.test(content.trim());
  const voiceWaveHeights = [8, 12, 7, 14, 10, 6, 13, 9, 11, 7, 12, 8, 10, 6, 9];

  const expandAssistantInlineMediaForRender = (message: Message): Message[] => {
    if (
      message.role !== 'assistant' ||
      message.mediaType ||
      message.mediaItems?.length ||
      message.moneyTransfer ||
      message.document ||
      message.order ||
      !message.content
    ) {
      return [message];
    }

    const source = message.content;
    const mediaTokenRegex = /\[(图片|IMG|IMAGE|视频|VIDEO|语音|VOICE|表情包|STICKER)[:：]([^\]]+)\]/gi;
    const expandedMessages: Message[] = [];
    let lastIndex = 0;
    let mediaIndex = 0;
    let textIndex = 0;

    for (const match of source.matchAll(mediaTokenRegex)) {
      const fullMatch = match[0];
      const rawType = match[1] || '';
      const rawPayload = (match[2] || '').trim();
      const matchIndex = match.index ?? -1;

      if (matchIndex > lastIndex) {
        const textContent = getDisplayText(source.slice(lastIndex, matchIndex));
        if (textContent && !isMediaPlaceholderText(textContent)) {
          expandedMessages.push({
            ...message,
            id: `${message.id}_text_${textIndex++}`,
            content: textContent,
          });
        }
      }

      const normalizedType = rawType.trim().toLowerCase();
      const mediaType = normalizedType === '图片' || normalizedType === 'img' || normalizedType === 'image'
        ? 'image'
        : normalizedType === '视频' || normalizedType === 'video'
          ? 'video'
          : normalizedType === '语音' || normalizedType === 'voice'
            ? 'voice'
            : 'sticker';

      let mediaDescription = rawPayload;
      let voiceDuration = 3;
      if (mediaType === 'voice') {
        const durationMatch = rawPayload.match(/(.+?)(?:[，,]\s*(?:时长)?(\d+)秒?)$/i);
        if (durationMatch) {
          mediaDescription = durationMatch[1].trim();
          voiceDuration = Number(durationMatch[2]) || 3;
        }
      }

      expandedMessages.push({
        ...message,
        id: `${message.id}_media_${mediaIndex++}`,
        content: mediaType === 'image' ? '[图片]' : mediaType === 'video' ? '[视频]' : mediaType === 'voice' ? '[语音]' : '[表情包]',
        mediaType,
        mediaDescription,
        voiceDuration: mediaType === 'voice' ? voiceDuration : message.voiceDuration,
        isMediaDescriptionOnly: true,
      });

      lastIndex = matchIndex + fullMatch.length;
    }

    if (lastIndex < source.length) {
      const trailingText = getDisplayText(source.slice(lastIndex));
      if (trailingText && !isMediaPlaceholderText(trailingText)) {
        expandedMessages.push({
          ...message,
          id: `${message.id}_text_${textIndex++}`,
          content: trailingText,
        });
      }
    }

    return expandedMessages.length > 0 ? expandedMessages : [message];
  };

  const getRenderableMessages = (messages: Message[]): Message[] =>
    messages.flatMap(expandAssistantInlineMediaForRender);

  const commitOutgoingUserMessage = useCallback((newMessage: Message) => {
    const commitHandlers = createCommitUserMessageHandlers({
      onPerceiveMessage: (conv, msg) => messagePerceptionService.perceiveMessage(conv, msg),
      onQueuePendingUserMessage: (messageId) => setPendingUserMessages(prev => [...prev, messageId]),
      onSchedulePendingReply: (conversationId, delaySec) => schedulePendingReply(conversationId, delaySec),
      onHandleAIChildExperienceUpdate: handleChatExperienceUpdate,
    });

    commitUserMessage({
      conversation,
      newMessage,
      isGenerating,
      onUpdateConversation,
      ...commitHandlers,
    });
  }, [conversation, isGenerating, onUpdateConversation]);

  const commitOutgoingUserMessageWithBase = useCallback((baseMessages: Message[], newMessage: Message) => {
    onUpdateConversation(conversation.id, {
      messages: [...baseMessages, newMessage],
      lastMessageTime: Date.now(),
      isHidden: false,
    });

    messagePerceptionService.perceiveMessage(conversation, newMessage);

    if (isGenerating && conversation.type === 'group') {
      setPendingUserMessages(prev => [...prev, newMessage.id]);
    }

    if (conversation.aiChildData) {
      handleChatExperienceUpdate(conversation, newMessage).catch((error) => {
        console.error('❌ 处理AI儿童经验失败：', error);
      });
    }

    const bufferSeconds = conversation.messageBufferSeconds ?? 15;
    schedulePendingReply(conversation.id, bufferSeconds);
  }, [conversation, isGenerating, onUpdateConversation]);

  const commitOutgoingUserMessagesBatch = useCallback((newMessages: Message[]) => {
    if (newMessages.length === 0) return;

    onUpdateConversation(conversation.id, {
      messages: [...conversation.messages, ...newMessages],
      lastMessageTime: Date.now(),
      isHidden: false,
    });

    newMessages.forEach((msg) => {
      messagePerceptionService.perceiveMessage(conversation, msg);
    });

    if (isGenerating && conversation.type === 'group') {
      setPendingUserMessages(prev => [...prev, ...newMessages.map(msg => msg.id)]);
    }

    if (conversation.aiChildData) {
      newMessages.forEach((msg) => {
        handleChatExperienceUpdate(conversation, msg).catch((error) => {
          console.error('❌ 处理AI儿童经验失败：', error);
        });
      });
    }

    const bufferSeconds = conversation.messageBufferSeconds ?? 15;
    schedulePendingReply(conversation.id, bufferSeconds);
  }, [conversation, isGenerating, onUpdateConversation]);

  const commitOutgoingUserMessageToConversation = useCallback((targetConversation: Conversation, newMessage: Message) => {
    const commitHandlers = createCommitUserMessageHandlers({
      onPerceiveMessage: (conv, msg) => messagePerceptionService.perceiveMessage(conv, msg),
      // 转发到其他会话时，不需要写入当前聊天页的pending列表
      onQueuePendingUserMessage: () => {},
      onSchedulePendingReply: (conversationId, delaySec) => schedulePendingReply(conversationId, delaySec),
      onHandleAIChildExperienceUpdate: handleChatExperienceUpdate,
    });

    commitUserMessage({
      conversation: targetConversation,
      newMessage,
      isGenerating: false,
      onUpdateConversation,
      ...commitHandlers,
    });
  }, [onUpdateConversation]);


  const handleSendMessage = () => {
    if (!currentInput.trim()) return;

    // 如果是编辑模式,保存编辑
    if (messageBeingEdited) {
      setIsEditing(true); // 标记正在编辑
      commitEditedMessage({
        conversation,
        messageBeingEdited,
        currentInput,
        onUpdateConversation,
      });
      setMessageBeingEdited(null);
      finalizeMessageInput();
      
      // 编辑完成后立即恢复标记
      setIsEditing(false);
      return;
    }

    const newMessage = buildUserMessageFromInput(currentInput, quotedMessage);
    commitOutgoingUserMessage(newMessage);

    finalizeMessageInput({
      clearQuotedMessage: true,
      focusInput: true,
    });
  };

  // 注意：旧的 handleAIMoneyResponse 函数已删除
  // 现在使用 System Prompt 机制，AI直接在回复中使用 [接收红包:xxx] 或 [退回红包:xxx] 格式
  // 处理逻辑在 processAIMoneyResponse 函数中（line 1127）

  // 处理红包接收/退回
  const handleReceiveMoney = async (messageId: string, accept: boolean) => {
    // 找到要处理的红包消息
    const targetMessage = conversation.messages.find(msg => msg.id === messageId);
    if (!targetMessage || !targetMessage.moneyTransfer) return;
    
    const updatedMessages = conversation.messages.map(msg => {
      if (msg.id === messageId && msg.moneyTransfer) {
        if (accept) {
          // 接收红包 - 更新用户钱包
          receiveMoney(
            msg.moneyTransfer.amount,
            msg.moneyTransfer.type,
            conversation.id,
            msg.moneyTransfer.message
          );

          return {
            ...msg,
            moneyTransfer: {
              ...msg.moneyTransfer,
              status: 'received' as const,
              receivedAt: Date.now()
            }
          };
        } else {
          // 退回红包 - 保存原始金额，用于显示
          return {
            ...msg,
            moneyTransfer: {
              ...msg.moneyTransfer,
              originalAmount: msg.moneyTransfer.amount, // 保存原始金额
              status: 'returned' as const
            }
          };
        }
      }
      
      // 🔥 修复：如果是退回，同时更新用户发送的红包消息状态
      if (!accept && msg.role === 'user' && msg.moneyTransfer && 
          msg.moneyTransfer.status === 'pending' &&
          msg.timestamp < targetMessage.timestamp) {
        // 这是用户之前发送的红包，现在被AI退回
        return {
          ...msg,
          moneyTransfer: {
            ...msg.moneyTransfer,
            originalAmount: msg.moneyTransfer.amount, // 保存原始金额
            status: 'returned' as const
          }
        };
      }
      
      return msg;
    });

    onUpdateConversation(conversation.id, {
      messages: updatedMessages,
      lastMessageTime: Date.now()
    });

    // 🔧 修复：用户领取AI红包时，不应该有AI的自动回复
    // AI发红包时已经带有自己的回复，不需要再次生成
  };
  
  // 单击头像 - 打开操作菜单
  const handleAvatarClick = (messageId: string, senderId: string, senderName: string, senderAvatar?: string) => {
    if (conversation.type !== 'group') return;
    setAvatarMenuOpen({ messageId, senderId, name: senderName, avatar: senderAvatar });
  };

  // 拍一拍（从菜单触发）
  const handlePatAction = (messageId: string, senderName: string) => {
    if (conversation.type !== 'group') return;
    
    // 添加拍一拍reaction到消息
    const updatedMessages = conversation.messages.map(m => {
      if (m.id === messageId) {
        const existingReactions = m.reactions || [];
        return {
          ...m,
          reactions: [...existingReactions, { from: 'user' as const, type: 'pat' }]
        };
      }
      return m;
    });
    
    // 显示拍一拍提示
    const patMessage: Message = {
      id: `pat_${Date.now()}`,
      role: 'system',
      content: `你拍了拍 ${senderName}`,
      timestamp: Date.now()
    };
    
    onUpdateConversation(conversation.id, {
      messages: [...updatedMessages, patMessage]
    });
    
    // 关闭菜单
    setAvatarMenuOpen(null);
  };

  // @对方（从菜单触发）
  const handleAtAction = (senderName: string) => {
    if (conversation.type !== 'group') return;
    
    const atText = `@${senderName} `;
    setCurrentInput(prev => prev + atText);
    // 聚焦输入框
    if (inputRef.current) {
      (inputRef.current as unknown as HTMLTextAreaElement).focus();
    }
    
    // 关闭菜单
    setAvatarMenuOpen(null);
  };

  // 发消息（从菜单触发）
  const handleSendMessageAction = (senderName: string) => {
    if (conversation.type !== 'group') return;
    
    // 导航到私聊
    if (onNavigateToPrivateChat) {
      onNavigateToPrivateChat(senderName);
    }
    
    // 关闭菜单
    setAvatarMenuOpen(null);
  };

  // 点击@成员列表中的成员
  const handleSelectAtMember = (nickname: string) => {
    const beforeAt = currentInput.slice(0, atCursorPosition);
    const afterAt = currentInput.slice(atCursorPosition + 1 + atFilterText.length);
    const newInput = `${beforeAt}@${nickname} ${afterAt}`;
    setCurrentInput(newInput);
    setShowAtMemberList(false);
    setAtFilterText('');
    
    // 聚焦输入框并设置光标位置
    if (inputRef.current) {
      const textarea = inputRef.current as unknown as HTMLTextAreaElement;
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = beforeAt.length + nickname.length + 2; // @昵称 后面
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  // 处理图片上传（支持多图）
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const newMessages: Message[] = [];
      const baseTimestamp = Date.now();
      
      // 处理每张图片
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 读取图片为base64
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const imageData = reader.result as string;
            
            // 创建用户消息（显示图片）
            const userMessage: Message = {
              id: `msg_${baseTimestamp + i}_${Math.random().toString(36).substr(2, 9)}`,
              role: 'user',
              content: '[图片]',
              timestamp: baseTimestamp + i,
              mediaType: 'image',
              mediaUrl: imageData
            };
            
            newMessages.push(userMessage);
            resolve();
          };
          
          reader.readAsDataURL(file);
        });
      }
      
      commitOutgoingUserMessagesBatch(newMessages);

      // 关闭工具栏
      setShowToolbar(false);
      
      console.log(`✅ 已发送${files.length}张图片`);

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

  // 打开表情包类型选择菜单
  const handleStickerClick = () => {
    setShowStickerTypeMenu(true);
    setShowToolbar(false);
  };
  
  // 处理选中表情包
  const handleSelectSticker = (sticker: StickerItem) => {
    // 发送表情包消息
    const stickerMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: '', // 表情包不需要文字内容
      timestamp: Date.now(),
      mediaType: 'sticker',
      mediaUrl: sticker.imageUrl,
      mediaDescription: sticker.description,
    };
    
    // 添加到对话
    commitOutgoingUserMessage(stickerMessage);
    
    setShowUserStickerPicker(false);
  };

  // 🎵 音乐分享处理函数 - 重写为上下文感知版本
  const handleMusicShare = async (musicInfo: MusicInfo) => {
    console.log('🎵 分享音乐:', musicInfo);
    
    // 增强音乐信息，添加歌词支持
    const enhancedMusicInfo = await enhanceMusicWithLyrics(musicInfo);
    
    // 创建音乐消息
    const musicMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `分享了音乐《${enhancedMusicInfo.title}》`,
      timestamp: Date.now(),
      music: enhancedMusicInfo as MusicMessage
    };

    // 添加到聊天记录
    commitOutgoingUserMessage(musicMessage);

    // 🎵 启动音乐上下文服务 - AI开始"感知"音乐
    setCurrentMusic(musicInfo);
    musicContextService.updateCurrentMusic(enhancedMusicInfo as MusicMessage);
    
    console.log('🎭 AI现在可以感知音乐状态，等待用户主动聊天...');

    setShowToolbar(false);
    setShowMusicShareModal(false);
  };

  // 🎵 真实音乐分享处理函数
  const handleRealMusicShare = async (realMusicInfo: RealMusicInfo) => {
    console.log('🎵 分享真实音乐:', realMusicInfo);
    
    // 转换为MusicMessage格式
    const musicMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `分享了音乐《${realMusicInfo.title}》`,
      timestamp: Date.now(),
      music: {
        id: realMusicInfo.id,
        title: realMusicInfo.title,
        artist: realMusicInfo.artist,
        album: realMusicInfo.album,
        duration: realMusicInfo.duration,
        genre: realMusicInfo.genre,
        releaseYear: realMusicInfo.releaseYear,
        audioUrl: realMusicInfo.audioUrl,
        previewUrl: realMusicInfo.previewUrl,
        coverUrl: realMusicInfo.coverUrl,
        source: realMusicInfo.source,
        playable: realMusicInfo.playable,
        lyrics: '',
        isRealMusic: true // 标记为真实音乐
      } as MusicMessage & { isRealMusic: boolean }
    };

    // 添加到聊天记录
    commitOutgoingUserMessage(musicMessage);

    console.log('✅ 真实音乐已添加到聊天');
    setShowRealMusicModal(false);
    setShowToolbar(false);
  };

  // 🎵 增强音乐信息，添加歌词和时间轴 - 使用新的动态歌词服务
  const enhanceMusicWithLyrics = async (musicInfo: MusicInfo): Promise<MusicInfo> => {
    // 如果音乐信息中已经有歌词，直接返回
    if ((musicInfo as any).lyrics) {
      console.log(`🎵 音乐《${musicInfo.title}》已包含歌词`);
      return musicInfo;
    }

    // 动态获取歌词
    try {
      const { enhanceMusicWithLyrics: getLyrics } = await import('../utils/lyricsService');
      const lyricsInfo = await getLyrics(musicInfo.title, musicInfo.artist);
      
      const enhanced = {
        ...musicInfo,
        ...(lyricsInfo.lyrics && { lyrics: lyricsInfo.lyrics }),
        ...(lyricsInfo.lyricsWithTime && { lyricsWithTime: lyricsInfo.lyricsWithTime })
      };

      console.log(`🎵 为《${enhanced.title}》获取歌词 (来源: ${lyricsInfo.source})`);
      return enhanced;
    } catch (error) {
      console.error('获取歌词失败:', error);
      return musicInfo;
    }
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
    commitOutgoingUserMessage(stickerMessage);

    // 关闭弹窗并清空输入
    setShowStickerModal(false);
    setStickerDescInput('');
  };

  // 接受订单（礼物/代付）
  const handleAcceptOrder = (message: Message) => {
    if (!message.order) return;
    
    // 如果是代付请求，检查用户余额
    if (message.order.type === 'payRequest') {
      const userBalance = getBalance();
      if (userBalance < message.order.totalAmount) {
        showToast('❌ 余额不足，无法代付', 'error');
        return;
      }
      
      // 用户代付：用户余额扣款
      const success = aiPayForUser(
        conversation.id,
        message.order.totalAmount,
        message.order.products.map(p => p.name).join('、'),
        conversation.id
      );
      
      if (!success) {
        showToast('❌ 代付失败', 'error');
        return;
      }
    }
    
    // 更新订单状态
    const updatedMessages = conversation.messages.map(msg => {
      if (msg.id === message.id && msg.order) {
        return {
          ...msg,
          order: {
            ...msg.order,
            status: (message.order!.type === 'gift' ? 'accepted' : 'paid') as 'accepted' | 'paid'
          }
        } as Message;
      }
      return msg;
    });
    
      // 发送确认消息（只在代付时发送，礼物接收不发送强制文本）
      if (message.order.type !== 'gift') {
      const confirmMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content: '已帮你付款啦！',
        timestamp: Date.now()
      };
        commitOutgoingUserMessageWithBase(updatedMessages, confirmMessage);
      } else {
        // 礼物接收时不发送强制文本，只更新订单状态
        onUpdateConversation(conversation.id, {
          messages: updatedMessages,
          lastMessageTime: Date.now()
        });
      }
    
    // 显示Toast提示
    showToast(
      message.order.type === 'gift' ? '🎁 已收下礼物' : '💰 已完成代付',
      'success'
    );
  };

  // 拒绝订单（礼物/代付）
  const handleRejectOrder = (message: Message) => {
    if (!message.order) return;
    
    // 如果是礼物订单，退款给AI（因为是AI送的礼物）
    if (message.order.type === 'gift') {
      refundGift(
        message.order.totalAmount,
        message.order.products.map(p => p.name).join('、'),
        conversation.id
      );
    }
    
    // 更新订单状态
    const updatedMessages = conversation.messages.map(msg => {
      if (msg.id === message.id && msg.order) {
        return {
          ...msg,
          order: {
            ...msg.order,
            status: 'rejected' as 'rejected'
          }
        } as Message;
      }
      return msg;
    });
    
    // 发送拒绝消息（只在代付时发送，礼物拒绝不发送强制文本）
    if (message.order.type !== 'gift') {
      const rejectMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content: '抱歉，暂时无法帮忙',
        timestamp: Date.now()
      };
      commitOutgoingUserMessageWithBase(updatedMessages, rejectMessage);
    } else {
      // 礼物拒绝时不发送强制文本，只更新订单状态
      onUpdateConversation(conversation.id, {
        messages: updatedMessages,
        lastMessageTime: Date.now()
      });
    }
    
    // 显示Toast提示
    showToast(
      message.order.type === 'gift' ? '❌ 已退回礼物' : '❌ 已拒绝代付',
      'info'
    );
  };

  // 处理AI的订单响应（解析AI回复中的[接受礼物]等标记）
  const processAIOrderResponse = async (aiMessage: Message, currentMessages: Message[]) => {
    // 检测AI回复中的订单响应标记
    const responseMatch = aiMessage.content.match(/\[(接受礼物|退回礼物|同意代付|拒绝代付)\]/);
    if (!responseMatch) return;
    
    const responseType = responseMatch[1];
    console.log(`🎁 处理AI订单响应: ${responseType}`);
    
    // 🔥 使用传入的最新消息列表，而不是conversation.messages
    // 找到最近的待处理订单消息（用户发送的）
    const recentOrderMessage = [...currentMessages]
      .reverse()
      .find(msg => 
        msg.role === 'user' && 
        msg.order && 
        msg.order.status === 'pending'
      );
    
    if (!recentOrderMessage || !recentOrderMessage.order) {
      console.log('⚠️ 未找到待处理的订单消息');
      return;
    }
    
    // 根据响应类型更新订单状态
    let newStatus: 'accepted' | 'rejected' | 'paid' = 'rejected';
    if (responseType === '接受礼物') {
      newStatus = 'accepted';
    } else if (responseType === '同意代付') {
      // 旧的“AI智能财务代付扣款”已移除：同意代付即直接标记为已支付
      newStatus = 'paid';
    } else if (responseType === '退回礼物' || responseType === '拒绝代付') {
      newStatus = 'rejected';
    }
    
    // 🔥 使用传入的最新消息列表更新订单状态
    const updatedMessages = currentMessages.map(msg => {
      if (msg.id === recentOrderMessage.id && msg.order) {
        return {
          ...msg,
          order: {
            ...msg.order,
            status: newStatus
          }
        } as Message;
      }
      return msg;
    });
    
    // 🔥 只更新一次，使用最新的消息列表
    onUpdateConversation(conversation.id, {
      messages: updatedMessages
    });
    
    console.log(`✅ 订单状态已更新: ${newStatus}`);
    
    // 显示Toast提示
    const toastMessages = {
      'accepted': '🎁 AI已接受你的礼物',
      'paid': '💰 AI已同意代付',
      'rejected': '❌ AI已拒绝订单'
    };
    showToast(toastMessages[newStatus], newStatus === 'rejected' ? 'warning' : 'success');
  };

  // 处理AI的红包/转账响应（更新金额和状态）
  // 🔥 重要：接收currentMessages参数，避免覆盖最新消息
  const processAIMoneyResponse = (aiMessage: Message, currentMessages: Message[]) => {
    // 检查是否是红包/转账响应消息（amount为0）
    if (!aiMessage.moneyTransfer || aiMessage.moneyTransfer.amount !== 0) {
      return currentMessages; // 不是需要处理的响应，直接返回
    }
    
    console.log(`💰 [processAIMoneyResponse] 检测到AI红包响应消息`);
    console.log(`   消息ID: ${aiMessage.id}`);
    console.log(`   类型: ${aiMessage.moneyTransfer.type}`);
    console.log(`   状态: ${aiMessage.moneyTransfer.status}`);
    
    // 🔥 使用currentMessages而不是conversation.messages
    const userMoneyMessage = [...currentMessages]
      .reverse()
      .find(msg => 
        msg.role === 'user' && 
        msg.moneyTransfer && 
        msg.moneyTransfer.status === 'pending' &&
        msg.moneyTransfer.type === aiMessage.moneyTransfer!.type
      );
    
    if (!userMoneyMessage || !userMoneyMessage.moneyTransfer) {
      console.error('❌ [processAIMoneyResponse] 未找到待处理的红包/转账消息');
      console.error('   currentMessages数量:', currentMessages.length);
      console.error('   查找条件: role=user, status=pending, type=' + aiMessage.moneyTransfer.type);
      return currentMessages; // 返回原消息数组
    }
    
    const originalAmount = userMoneyMessage.moneyTransfer.amount;
    const responseStatus = aiMessage.moneyTransfer.status; // 'received' 或 'returned'
    
    console.log(`💰 [processAIMoneyResponse] 找到原始红包消息`);
    console.log(`   原始消息ID: ${userMoneyMessage.id}`);
    console.log(`   金额: ¥${originalAmount}`);
    console.log(`   新状态: ${responseStatus}`);
    
    // 🔥 更新currentMessages而不是conversation.messages
    const updatedMessages = currentMessages.map(msg => {
      // 更新AI响应消息的金额
      if (msg.id === aiMessage.id && msg.moneyTransfer) {
        console.log(`   ✓ 更新AI响应消息金额: ${originalAmount}`);
        return {
          ...msg,
          moneyTransfer: {
            ...msg.moneyTransfer,
            amount: originalAmount
          }
        };
      }
      // 更新用户原始消息的状态
      if (msg.id === userMoneyMessage.id && msg.moneyTransfer) {
        console.log(`   ✓ 更新用户红包状态: ${responseStatus}`);
        return {
          ...msg,
          moneyTransfer: {
            ...msg.moneyTransfer,
            status: responseStatus,
            receivedAt: responseStatus === 'received' ? Date.now() : undefined
          }
        };
      }
      return msg;
    });
    
    console.log(`✅ [processAIMoneyResponse] 红包状态更新完成: ${responseStatus}`);
    
    // 显示Toast提示
    const toastMessages: Record<string, string> = {
      'received': `💰 AI已${aiMessage.moneyTransfer.type === 'redPacket' ? '领取红包' : '收到转账'} ¥${originalAmount}`,
      'returned': `↩️ AI已退回${aiMessage.moneyTransfer.type === 'redPacket' ? '红包' : '转账'} ¥${originalAmount}`
    };
    showToast(toastMessages[responseStatus] || '💰 红包状态已更新', 'success');
    
    // 🔥 返回更新后的消息数组
    return updatedMessages;
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
        commitOutgoingUserMessage(userMessage);

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

  // 开始Web Speech语音识别
  const startSpeechRecognition = () => {
    if (!speechRecognitionSupported) {
      console.warn('浏览器不支持Web Speech API');
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'zh-CN';
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsSpeechRecognizing(true);
        console.log('🎤 语音识别已开始');
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

        // 🔥 修复重复问题：只追加新的最终文本
        if (finalTranscript) {
          // 有最终结果，追加到已确认的文本中
          finalTranscriptRef.current += finalTranscript;
          setVoiceTranscript(finalTranscriptRef.current);
        } else if (interimTranscript) {
          // 只有临时结果，显示在已确认文本后面（不保存）
          setVoiceTranscript(finalTranscriptRef.current + interimTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('🎤 语音识别错误:', event.error);
        setIsSpeechRecognizing(false);
        
        if (event.error === 'no-speech') {
          console.log('未检测到语音，请重试');
        } else if (event.error === 'network') {
          console.log('网络错误，语音识别服务不可用');
        } else if (event.error === 'not-allowed') {
          alert('麦克风权限被拒绝，请在浏览器设置中允许麦克风访问');
        }
      };

      recognition.onend = () => {
        setIsSpeechRecognizing(false);
        console.log('🎤 语音识别已结束');
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error('启动语音识别失败:', error);
      setIsSpeechRecognizing(false);
    }
  };

  // 停止Web Speech语音识别
  const stopSpeechRecognition = () => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }
    setIsSpeechRecognizing(false);
  };

  // 语音录音功能
  const handleVoiceClick = async () => {
    // 直接打开弹窗，让用户选择输入或语音识别
    setVoiceTranscript('');
    finalTranscriptRef.current = ''; // 🔥 重置已确认的文本
    setShowVoiceConfirmModal(true);
  };

  // 旧的录音功能已移除，现在使用Web Speech API直接识别

  // AI自动领取群红包函数
  const handleAIAutoClaimRedPacket = async (
    redPacket: any, 
    senderAiId: string,
    currentContextMessages?: Message[],
    onClaim?: (message: Message) => void
  ) => {
    if (conversation.type !== 'group' || !conversation.members) return;
    
    console.log(`🎁 开始AI自动领取红包流程，发送者: ${senderAiId}`);
    
    // 获取群中的AI成员（排除发送者和用户）
    const aiMembers = conversation.members
      .filter(memberId => memberId !== senderAiId && memberId !== 'user')
      .map(memberId => conversations.find(c => c.id === memberId))
      .filter(Boolean) as Conversation[];
    
    if (aiMembers.length === 0) {
      console.log('🎁 没有其他AI成员可以领取红包');
      return;
    }
    
    console.log(`🎁 可领取红包的AI成员: ${aiMembers.map(ai => ai.name).join('、')}`);
    
    // 使用AI红包决策系统
    const { handleAIGroupRedPacketClaiming } = await import('../utils/aiGroupRedPacketDecision');
    
    // 创建红包消息对象（用于决策系统）
    const redPacketMessage = {
      id: `redpacket_${Date.now()}`,
      role: 'assistant' as const,
      content: '[群红包]',
      timestamp: Date.now(),
      moneyTransfer: {
        type: 'groupRedPacket' as const,
        amount: redPacket.totalAmount,
        message: redPacket.message,
        status: 'pending' as const,
        groupRedPacket: redPacket
      }
    };
    
    try {
      // 使用传入的上下文或当前会话消息
      const contextMessages = currentContextMessages || conversation.messages;

      await handleAIGroupRedPacketClaiming(
        redPacketMessage,
        aiMembers,
        conversation,
        contextMessages.slice(-10), // 最近10条消息作为上下文
        apiConfig,
        (aiId: string, aiName: string, amount: number) => {
          console.log(`🎁 ${aiName} 领取了红包 ¥${amount.toFixed(2)}`);
          
          // 添加AI领取红包的系统消息
          const claimMessage = {
            id: `claim_${Date.now()}_${aiId}`,
            role: 'system' as const,
            content: `${aiName} 领取了红包 ¥${amount.toFixed(2)}`,
            timestamp: Date.now(),
            systemMessageType: 'redPacketClaim' as const
          };
          
          if (onClaim) {
            // ✅ 如果提供了回调，使用回调处理（用于生成过程中）
            onClaim(claimMessage);
          } else {
            // 更新对话，添加领取消息
            const updatedMessages = [...conversation.messages, claimMessage];
            onUpdateConversation(conversation.id, {
              messages: updatedMessages,
              lastMessageTime: Date.now()
            });
          }
        }
      );
    } catch (error) {
      console.error('AI自动领取红包失败:', error);
    }
  };

  // 处理消息回应 (Reaction)
  const handleReactMessage = (emoji: string) => {
    if (!selectedMessageId) return;
    
    const updatedMessages = conversation.messages.map(msg => {
      if (msg.id === selectedMessageId) {
        const currentReactions = msg.reactions || [];
        // 检查是否已经有该用户的该表情
        const existingIndex = currentReactions.findIndex(r => r.from === 'user' && r.type === emoji);
        
        let newReactions;
        if (existingIndex >= 0) {
          // 如果已存在，则移除（toggle）
          newReactions = currentReactions.filter((_, i) => i !== existingIndex);
        } else {
          // 否则添加
          newReactions = [...currentReactions, { from: 'user' as const, type: emoji }];
        }
        
        return { ...msg, reactions: newReactions };
      }
      return msg;
    });
    
    onUpdateConversation(conversation.id, {
      messages: updatedMessages
    });
  };

  // 🎯 AI主动发送私聊消息函数
  const maybeSendAutoPrivateDM = async (aiId: string, groupMessage: Message, fromGroupId: string) => {
    if (!groupMessage.content || !currentUserProfile) return;
    
    // 检测AI是否承诺私聊发送内容
    const privatePromiseKeywords = [
      '我私聊发给你', '我私下发给你', '我单独发给你',
      '私聊发', '私下发', '单独发',
      '我私聊给你发', '我私下给你发', '我单独给你发',
      '等下私聊发', '等下私下发', '等下单独发',
      '稍后私聊发', '稍后私下发', '稍后单独发'
    ];
    
    const hasPromise = privatePromiseKeywords.some(keyword => groupMessage.content.includes(keyword));
    if (!hasPromise) return;
    
    console.log(`🎯 检测到AI ${aiId} 承诺私聊发送内容: ${groupMessage.content.substring(0, 50)}...`);
    
    // 查找AI对应的私聊会话
    const privateConversation = conversations.find(c => c.type === 'private' && c.id === aiId);
    if (!privateConversation) {
      console.warn(`⚠️ 未找到AI ${aiId} 的私聊会话`);
      return;
    }
    
    // 延迟3-8秒后发送私聊消息（模拟真实行为）
    const delay = Math.random() * 5000 + 3000;
    setTimeout(async () => {
      try {
        console.log(`🎯 AI ${aiId} 开始发送承诺的私聊消息...`);
        
        // 构建私聊发送的提示词
        const privatePrompt = `你在群聊中承诺要私聊发送内容给用户。现在请履行承诺，发送相关内容。

群聊背景：${fromGroupId}
你的承诺：${groupMessage.content.substring(0, 100)}...

请发送符合承诺的内容，可以是：
- 有趣的视频（使用[视频:描述]格式）
- 好看的图片（使用[图片:描述]格式）  
- 有用的链接
- 其他符合承诺的内容

要求：
1. 内容要符合你在群聊中的承诺
2. 自然地提及群聊中的承诺
3. 内容要有趣、有价值
4. 长度控制在50-200字以内`;

        // 调用Chat API生成私聊消息（使用统一的API helper）
        const { getAIResponse } = await import('../utils/apiHelper');
        
        const aiReply = await getAIResponse(
          apiConfig,
          [
            {
              role: 'system',
              content: `你是${privateConversation.characterSettings?.nickname || privateConversation.name}。${privateConversation.characterSettings?.systemPrompt || ''}`
            },
            {
              role: 'user',
              content: privatePrompt
            }
          ],
          {
            temperature: 0.7,
            max_tokens: 500
          }
        );
        
        if (!aiReply || aiReply.trim() === '') {
          console.warn('AI私聊回复为空');
          return;
        }
        
        // 创建私聊消息
        const privateMessage: Message = {
          id: Date.now().toString() + '_private_' + Math.random(),
          role: 'assistant',
          content: aiReply.trim(),
          timestamp: Date.now(),
        };
        
        // 更新私聊会话
        const updatedPrivateMessages = [...privateConversation.messages, privateMessage];
        onUpdateConversation(privateConversation.id, {
          messages: updatedPrivateMessages,
          lastMessageTime: Date.now()
        });
        
        console.log(`✅ AI ${aiId} 已发送承诺的私聊消息: ${aiReply.substring(0, 50)}...`);
        
        // 如果用户当前不在该私聊会话，可以显示一个通知（可选）
        if (conversation.id !== privateConversation.id) {
          console.log(`📬 AI ${aiId} 在私聊中发送了消息，但用户当前不在此会话`);
        }
        
      } catch (error) {
        console.error('AI发送私聊消息失败:', error);
      }
    }, delay);
  };

  // 群聊生成函数
  const handleGroupChatGenerate = async () => {
    // 🚀 启动后台生成任务
    backgroundGenerationService.startGeneration(conversation.id);
    setIsGenerating(true);
    setShowSendingHint(true);

    try {
      const isFreeMode = conversation.groupChatMode === 'free';
      const generateFunction = isFreeMode ? generateGroupChatRepliesFreeMode : generateGroupChatReplies;
      
      // 使用ref来追踪最新的消息列表
      let currentMessages = [...conversation.messages];
      
      // 📸 创建消息ID快照（用于检测用户在生成期间发送的新消息）
      const messageIdsSnapshot = new Set(
        conversation.messages.map(m => m.id)
      );
      
      console.log('📸 创建消息快照:', {
        快照时刻消息数: conversation.messages.length,
        最后一条消息: conversation.messages[conversation.messages.length - 1]?.content?.substring(0, 20) || 'N/A'
      });
      
      // 调用群聊服务
      // 无人回复检查已在 onAllComplete 回调中处理，避免误报
      await generateFunction(
        conversation,
        apiConfig,
        conversations,
        {
          onGroupChatProcessing: () => {
            // 🚀 全局处理开始
            console.log('🔄 群聊处理中...');
            setIsGroupProcessing(true);
            setShowSendingHint(false); // 隐藏普通发送提示，改用全局处理提示
          },
          
          onAIStart: (aiId, aiName) => {
            console.log(`🤖 ${aiName} 开始回复`);
            // 隐藏全局处理提示和发送中提示，显示AI打字动画
            setIsGroupProcessing(false);
            setShowSendingHint(false);
            
            // 获取AI头像
            const aiMember = conversations.find(c => c.id === aiId);
            setCurrentTypingAI({
              id: aiId,
              name: aiName,
              avatar: aiMember?.characterSettings?.avatar || aiMember?.avatar
            });
          },
          
          onAITyping: (aiId) => {
            // 保持打字动画显示
            console.log(`⌨️ ${aiId} 正在输入...`);
          },
          
          onAIMessage: (_aiId, message) => {
            // 🐛 修复方案3的bug：正确处理消息合并
            
            // 1️⃣ 累积AI消息到快照
            currentMessages = [...currentMessages, message];
            
            // 🌉 检测AI消息中的私聊意图
            if (message.role === 'assistant' && message.content && currentUserProfile) {
              groupToPrivateMemoryService.shouldCreateBridge(
                message,
                conversation.id,
                currentUserProfile.username,
                conversations
              );
              
              // 🎯 检测AI承诺私聊发送内容，主动发送私聊消息
              maybeSendAutoPrivateDM(_aiId, message, conversation.id);
            }
            
            // 🎁 检测AI发送的群红包，触发其他AI自动领取
            if (message.moneyTransfer?.type === 'groupRedPacket' && message.moneyTransfer.groupRedPacket) {
              const redPacket = message.moneyTransfer.groupRedPacket;
              console.log(`🎁 检测到AI发送的群红包: ${redPacket.message} (¥${redPacket.totalAmount})`);
              
              // 延迟1-5秒，让其他AI陆续尝试领取红包
              setTimeout(() => {
                handleAIAutoClaimRedPacket(
                  redPacket, 
                  _aiId,
                  currentMessages,
                  (claimMessage) => {
                    // ✅ 回调：更新本地 currentMessages 并触发更新
                    console.log(`🎁 [回调] 添加红包领取消息: ${claimMessage.content}`);
                    currentMessages = [...currentMessages, claimMessage];
                    onUpdateConversation(conversation.id, {
                      messages: currentMessages,
                      lastMessageTime: Date.now()
                    });
                  }
                );
              }, Math.random() * 4000 + 1000);
            }
            
            // 2️⃣ 提取用户在生成期间发送的新消息
            const currentConversationMessages = conversation.messages;
            const userNewMessages = currentConversationMessages.filter(m => {
              const isNewUser = !messageIdsSnapshot.has(m.id) && m.role === 'user';
              const notInCurrent = !currentMessages.some(cm => cm.id === m.id);
              return isNewUser && notInCurrent;
            });
            
            if (userNewMessages.length > 0) {
              console.log(`🆕 检测到${userNewMessages.length}条用户新消息，保留`);
            }
            
            // 3️⃣ 合并：currentMessages（快照+AI消息） + 用户新消息
            const mergedMessages = [...currentMessages, ...userNewMessages];
            
            console.log(`📦 消息合并: 快照+AI=${currentMessages.length}, 用户新增=${userNewMessages.length}, 总计=${mergedMessages.length}`);
            
            // 4️⃣ 更新对话
            onUpdateConversation(conversation.id, {
              messages: mergedMessages,
              lastMessageTime: Date.now()
            });
          },
          
          onAIComplete: (aiId, messages) => {
            console.log(`✅ ${aiId} 完成回复，共${messages.length}条消息`);
            // 🎯 不清除打字动画，让下一个AI的onAIStart自动覆盖
            // 这样AI之间的衔接更流畅，用户始终看到"正在输入..."
            // 只在onAllComplete时才清除
          },
          
          onAIError: (aiId, error) => {
            console.error(`❌ ${aiId} 回复出错:`, error);
            // 显示错误提示（可选）
          },
          
          onAllComplete: (replies) => {
            console.log('🎉 所有AI完成回复');
            
            // 🔍 检测用户在生成期间发送的新消息
            const userNewMessages = conversation.messages.filter(m => 
              !messageIdsSnapshot.has(m.id) &&  // 不在快照中
              m.role === 'user'                  // 是用户消息
            );
            
            if (userNewMessages.length > 0) {
              console.log('📬 检测到用户新消息:', {
                新消息数: userNewMessages.length,
                消息ID: userNewMessages.map(m => m.id),
                消息内容: userNewMessages.map(m => m.content.substring(0, 30))
              });
            } else {
              console.log('✅ 无新增用户消息（方案3：已在onAIMessage中实时追加）');
            }
            
            // 🐛 修复：使用currentMessages作为基础，再添加用户新消息
            // currentMessages = 快照 + 所有AI消息（不会丢失）
            // userNewMessages = 用户在生成期间发的消息
            const finalMessages = [...currentMessages, ...userNewMessages];
            
            console.log('📦 最终消息列表:', {
              总消息数: finalMessages.length,
              AI回复数: replies.length,
              用户新消息数: userNewMessages.length
            });
            
            setIsGenerating(false);
            setIsGroupProcessing(false); // 重置群聊处理状态
            setCurrentTypingAI(null);
            setShowSendingHint(false);
            
            // 🚀 通知后台服务生成完成
            backgroundGenerationService.completeGeneration(conversation.id, finalMessages);
            
            // 🧠 群聊记忆总结（后台处理）
            if (conversation.type === 'group' && conversation.members) {
              setTimeout(() => {
                performGroupMemorySummary(currentMessages).catch(err => {
                  console.error('群聊记忆总结失败:', err);
                });
              }, 1000); // 延迟1秒后执行，避免阻塞
            }
            
            // 📝 处理用户新消息（标记为待处理，触发下一轮回复）
            if (userNewMessages.length > 0) {
              console.log('📝 用户新消息将在下一轮处理');
              
              // 合并到待处理队列（包含旧的和新的）
              const allPendingIds = [
                ...pendingUserMessages,
                ...userNewMessages.map(m => m.id)
              ];
              setPendingUserMessages(allPendingIds);
              
              // 延迟触发新一轮生成，让用户看清楚上一轮已完成
              setTimeout(() => {
                console.log('🔄 触发新一轮AI回复，处理用户新消息');
                handleGroupChatGenerate();
              }, 1000);
              return; // 不显示无人回应提示
            }
            
            // 检查旧的待处理消息（兼容性）
            if (pendingUserMessages.length > 0) {
              console.log(`📬 检测到${pendingUserMessages.length}条旧的待处理用户消息，触发新一轮生成`);
              setPendingUserMessages([]); // 清空待处理队列
              
              setTimeout(() => {
                handleGroupChatGenerate();
              }, 1000);
              return;
            }
            
            // 自由模式：如果没有AI回复，显示提示
            if (isFreeMode && replies.length === 0) {
              // 添加系统消息提示
              // 随机选择一个友好的提示
              const friendlyHints = [
                '😊 大家好像都在忙哦，一会再问一次吧',
                '👀 好像暂时没人看到消息呢',
                '☕ 大家可能都去忙其他事了，稍后再聊~',
                '💬 此刻无人回应，不妨等等看',
              ];
              const randomHint = friendlyHints[Math.floor(Math.random() * friendlyHints.length)];
              const systemMessage: Message = {
                id: `system_${Date.now()}`,
                role: 'system',
                content: randomHint,
                timestamp: Date.now()
              };
              const messagesWithHint = [...finalMessages, systemMessage];
              onUpdateConversation(conversation.id, {
                messages: messagesWithHint,
                lastMessageTime: Date.now()
              });
            }
          }
        }
      );
      
      // ⚠️ 移除这里的无人回复检查，因为会在AI还在生成时就触发
      // 真正的无人回复检查已经在 onAllComplete 回调中处理（2786-2808行）
      // 这里如果检查会导致"消息发送中"时就显示"无人回复"提示（误报）
    } catch (error: any) {
      console.error('群聊生成失败:', error);
      alert('群聊生成失败: ' + error.message);
      setIsGenerating(false);
      setCurrentTypingAI(null);
      setShowSendingHint(false);
      
      // 🚀 通知后台服务生成失败
      backgroundGenerationService.failGeneration(conversation.id, error.message || '未知错误');
    }
  };

  // 旧的同步代码已被删除，现在使用后台任务
  
  // 🧠 执行群聊记忆总结
  const performGroupMemorySummary = async (currentMessages: Message[]) => {
    try {
      // 检查是否需要总结
      if (!shouldTriggerGroupMemorySummary(conversation.id, currentMessages.length)) {
        console.log('🧠 群聊消息数未达到总结阈值，跳过');
        return;
      }
      
      console.log('🧠 开始群聊记忆总结...');
      
      // 获取群成员名称
      const groupMembers = conversation.members
        ?.map(mid => {
          const member = conversations.find(c => c.id === mid);
          return member?.characterSettings?.nickname || member?.name || '未知';
        }) || [];
      
      // 获取当前AI成员（可能有多个）
      const aiMember = conversation.members
        ?.map(mid => conversations.find(c => c.id === mid))
        .find(c => c && c.type === 'private');
      
      if (!aiMember) {
        console.error('未找到AI成员');
        return;
      }
      
      const aiName = aiMember.characterSettings?.nickname || aiMember.name;
      const groupMemories = getGroupMemories(aiMember.id, conversation.id);
      
      // 构建群聊记忆总结提示词
      const summaryPrompt = buildGroupMemorySummaryPrompt(
        conversation.name,
        aiName,
        currentMessages,
        groupMembers,
        groupMemories
      );
      
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
          temperature: 0.3,
        })
      });
      
      if (!response.ok) {
        const errorInfo = await getErrorFromResponse(response);
        console.error('群聊记忆总结失败:', formatErrorMessage(errorInfo));
        return;
      }
      
      const data = await response.json();
      const summaryResponse = data.choices?.[0]?.message?.content;
      
      if (!summaryResponse) {
        console.error('未收到有效的群聊记忆总结');
        return;
      }
      
      // 解析总结结果
      const memories = parseMemorySummaryResponse(summaryResponse);
      
      if (memories.length > 0) {
        console.log(`🧠 群聊提取到 ${memories.length} 条新记忆`);
        
        // 添加到群聊记忆库
        memories.forEach((mem: { content: string; importance: 'low' | 'medium' | 'high'; category?: string }) => {
          addGroupMemory(
            aiMember.id,
            conversation.id,
            conversation.name,
            mem.content,
            mem.category || '群聊话题',
            mem.importance
          );
        });
        
        console.log(`✅ 已保存 ${memories.length} 条群聊记忆`);
      } else {
        console.log('🧠 本次群聊没有值得记忆的新信息');
      }
      
      // 更新群聊总结计数器
      updateGroupSummaryCounter(aiMember.id, currentMessages.length);
      
    } catch (error) {
      console.error('群聊记忆总结失败:', error);
    }
  };

  // 🧠 执行记忆总结
  const performMemorySummary = async (currentMessages: Message[]) => {
    try {
      console.log('🧠 开始记忆总结...');
      const memoryBank = await getMemoryBank(conversation.id);
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
        const errorInfo = await getErrorFromResponse(response);
        console.error('记忆总结失败:', formatErrorMessage(errorInfo));
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
        for (const mem of memories) {
          await addMemory(conversation.id, mem.content, mem.importance, mem.category, true);
        }
        
        alert(`✅ 已保存 ${memories.length} 条记忆`);
      } else {
        console.log('🧠 本次对话没有值得记忆的新信息');
      }
      
      // 更新总结计数器
      await updateSummaryCounter(conversation.id, currentMessages.length);
      
    } catch (error) {
      console.error('记忆总结失败:', error);
      // 即使失败也更新计数器，避免重复尝试
      await updateSummaryCounter(conversation.id, currentMessages.length);
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

  // 提取自定义CSS
  const customCss = conversation.characterSettings?.customBubbleCss;
  // 提取是否隐藏气泡尾巴
  const hideBubbleTail = conversation.characterSettings?.hideBubbleTail;
  // 提取气泡装饰配置
  const decorationConfig = conversation.characterSettings?.bubbleDecoration;

  return (
    <>
    <div 
      className="flex flex-col h-full bg-gray-50 relative"
      style={conversation.characterSettings?.chatBackground ? {
        backgroundImage: `url(${conversation.characterSettings.chatBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : undefined}
    >
      {/* 注入自定义气泡样式 */}
      {customCss && <style>{customCss}</style>}
      {/* 全局统一：给用户气泡加玻璃质感（保持原颜色，只增加描边+模糊） */}
      <style>{`
        .message-bubble.user {
          backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(255,255,255,0.3) !important;
          box-shadow: 0 6px 24px rgba(0,0,0,0.06) !important;
        }
      `}</style>
      {/* 如果开启了隐藏尾巴，注入隐藏样式 */}
      {hideBubbleTail && <style>{`.message-tail { display: none !important; }`}</style>}
      {/* 注入气泡装饰样式 */}
      {decorationConfig?.show && (
        <style>{`
          .message-bubble {
            position: relative !important;
            overflow: visible !important;
          }
          .message-bubble::after {
            content: ${decorationConfig.type === 'text' ? `"${decorationConfig.content}"` : '""'} !important;
            position: absolute !important;
            z-index: 10 !important;
            width: ${decorationConfig.size}px !important;
            height: ${decorationConfig.size}px !important;
            font-size: ${decorationConfig.size}px !important;
            line-height: 1 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            pointer-events: none !important;
            ${decorationConfig.type === 'image' ? `
              background-image: url('${decorationConfig.content}') !important;
              background-size: contain !important;
              background-repeat: no-repeat !important;
              background-position: center !important;
            ` : ''}
            ${decorationConfig.position === 'top-right' ? `top: ${decorationConfig.offsetY}px !important; right: ${decorationConfig.offsetX}px !important;` : ''}
            ${decorationConfig.position === 'bottom-right' ? `bottom: ${decorationConfig.offsetY}px !important; right: ${decorationConfig.offsetX}px !important;` : ''}
            ${decorationConfig.position === 'bottom-left' ? `bottom: ${decorationConfig.offsetY}px !important; left: ${decorationConfig.offsetX}px !important;` : ''}
            ${decorationConfig.position === 'top-left' ? `top: ${decorationConfig.offsetY}px !important; left: ${decorationConfig.offsetX}px !important;` : ''}
          }
        `}</style>
      )}

      {/* Header - 固定在顶部 */}
      <div className="absolute top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 -ml-1 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-800" strokeWidth={2.5} />
          </button>
          {/* 群聊头像 */}
          {conversation.type === 'group' && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
              {conversation.avatar ? (
                <img src={conversation.avatar} alt="群头像" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-semibold text-sm">
                  {conversation.name.charAt(0) || '群'}
                </span>
              )}
            </div>
          )}
          <div className="flex flex-col">
            <h1 className="text-base font-semibold text-gray-900">{conversation.name}</h1>
            {conversation.type === 'private' && conversation.characterSettings ? (
              <div className="flex items-center gap-1 px-2 py-0.5 -ml-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  aiStatus?.status === 'online' ? 'bg-green-500' :
                  aiStatus?.status === 'busy' ? 'bg-yellow-500' :
                  aiStatus?.status === 'resting' ? 'bg-blue-500' :
                  aiStatus?.status === 'away' ? 'bg-gray-400' :
                  'bg-gray-300'
                }`}></div>
                <span className="text-xs text-gray-500 truncate max-w-[200px]">
                  {aiStatus?.statusText || '在线'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-500">在线</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 搜索按钮 */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="搜索聊天记录"
          >
            <Search className="w-5 h-5 text-gray-700" />
          </button>
          
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
          
          {/* 设置按钮 */}
          {conversation.type === 'private' && (
            <button
              onClick={onOpenCharacterSettings}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="角色设置"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
              </svg>
            </button>
          )}
          
          {/* 群聊设置按钮 */}
          {conversation.type === 'group' && (
            <button
              onClick={() => setShowGroupSettings(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="群聊设置"
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

      {/* Messages - 固定布局，添加顶部和底部padding */}
      <div 
        ref={messagesContainerRef}
        className="absolute top-[60px] bottom-[60px] left-0 right-0 overflow-y-auto p-4 space-y-3"
      >
        {/* 🚀 滚动加载：顶部加载指示器 */}
        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              <span>加载更多消息中...</span>
            </div>
          </div>
        )}
        
        {/* 是否还有更多历史消息提示 */}
        {!isLoadingMore && messageWindow.startIndex > 0 && (
          <div className="flex justify-center py-2">
            <div className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
              还有 {messageWindow.startIndex} 条历史消息，向上滑动加载更多
            </div>
          </div>
        )}
        
        {/* 根据消息窗口显示消息 */}
        {(() => {
          const visibleMessages = conversation.messages.slice(
            messageWindow.startIndex,
            messageWindow.startIndex + messageWindow.size
          );
          const renderableMessages = getRenderableMessages(visibleMessages);

          return renderableMessages.map((message, index) => {
          // 🚫 如果是拉黑期间的消息且当前仍在拉黑状态，则不显示
          if (message.isBlockedMessage && conversation.isBlocked) {
            return null;
          }

          // 微信风格：超过5分钟才显示时间
          const prevMessage = index > 0 ? renderableMessages[index - 1] : null;
          const showTime =
            index === 0 ||
            (prevMessage !== null && message.timestamp - prevMessage.timestamp > 5 * 60 * 1000);
          
          // 提前计算是否为HTML内容（用于调整气泡样式）
          const hasHTMLTags = message.content && /<[^>]+>/.test(message.content);
          const htmlTagCount = (message.content && message.content.match(/<[^>]+>/g) || []).length;
          const hasStructuralTags = message.content && ['<div', '<style', '<span', '<table', '<ul', '<ol'].some(tag => message.content.includes(tag));
          const isHTMLContent = hasHTMLTags && (htmlTagCount >= 3 || hasStructuralTags);
          
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
                <>
                  {/* 红包领取通知 - 醒目样式 */}
                  {(message as any).systemMessageType === 'redPacketClaim' || (message as any).moneyTransfer?.isClaimNotification ? (
                    <div className="flex justify-center my-2">
                      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl px-4 py-2.5 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🎁</span>
                          <div className="text-sm text-gray-600">
                            {message.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* 普通系统消息 */
                    <div className="flex justify-center my-2">
                      <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                        {message.content}
                      </span>
                    </div>
                  )}
                </>
              ) : (
              <div id={`message-${message.id}`} className={`message-bubble flex gap-2 items-end transition-colors ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <div className="relative flex-shrink-0">
                    {/* 群聊：显示发送者的头像 */}
                    {conversation.type === 'group' ? (
                      (message as any).senderAvatar ? (
                        <div 
                          className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-md cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                          onClick={() => handleAvatarClick(message.id, (message as any).senderId || '', (message as any).senderName || 'AI', (message as any).senderAvatar)}
                        >
                          <img src={(message as any).senderAvatar} alt={(message as any).senderName || 'AI'} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div 
                          className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center border-2 border-white shadow-md cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                          onClick={() => handleAvatarClick(message.id, (message as any).senderId || '', (message as any).senderName || 'AI', undefined)}
                        >
                          <span className="text-white font-semibold text-sm">{((message as any).senderName || 'AI').charAt(0)}</span>
                        </div>
                      )
                    ) : (
                      /* 私聊：显示对话角色的头像 */
                      conversation.characterSettings?.avatar ? (
                        <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-md">
                          <img src={conversation.characterSettings.avatar} alt="AI头像" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border-2 border-white shadow-md">
                          <span className="text-white font-semibold text-sm">{conversation.name.charAt(0)}</span>
                        </div>
                      )
                    )}
                    {/* 只在私聊显示角标 */}
                    {conversation.type === 'private' && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-[10px]">{getUserBadge()}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="relative max-w-[70%]">
                  {/* 🚫 拉黑期间消息标记（解除拉黑后显示） */}
                  {message.isBlockedMessage && !conversation.isBlocked && (
                    <div className="absolute -right-6 top-1/2 -translate-y-1/2 text-red-500 font-bold text-lg select-none cursor-help" title="对方在被拉黑期间发送的消息">
                      !
                    </div>
                  )}

                  {/* 群聊：显示发送者名字 */}
                  {message.role === 'assistant' && conversation.type === 'group' && (message as any).senderName && (
                    <div className="text-xs text-gray-500 mb-1 ml-1">
                      {(message as any).senderName}
                    </div>
                  )}
                  
                  {/* 多选模式复选框 */}
                  {isMultiSelectMode && (
                    <input
                      type="checkbox"
                      checked={selectedMessages.includes(message.id)}
                      onChange={() => toggleMessageSelection(message.id)}
                      className="absolute -left-8 top-1/2 -translate-y-1/2 w-5 h-5 rounded border-2 border-gray-300 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  
                  {/* 引用消息（在气泡外部显示，适用于特殊消息） */}
                  {message.replyTo && (message.moneyTransfer || message.document || message.order) && (
                    <div className="mb-1.5 bg-gray-50 rounded-lg p-2 border border-gray-200">
                      <div className="text-xs text-gray-500 flex items-start gap-1">
                        <div className="w-0.5 h-full bg-blue-400 mr-1 rounded"></div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-700">{message.replyTo.role === 'user' ? '我' : conversation.name}</div>
                          <div className="line-clamp-2 text-gray-600">{message.replyTo.content}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div
                    onClick={(e) => {
                      if (isMultiSelectMode) {
                        toggleMessageSelection(message.id);
                      } else {
                        handleMessageClick(message.id, e);
                      }
                    }}
                    className={`message-bubble ${message.role === 'user' ? 'user' : 'ai'} rounded-2xl shadow-sm cursor-pointer ${
                      isHTMLContent 
                        ? 'bg-transparent border-0 shadow-none p-0 overflow-visible' 
                        : message.moneyTransfer 
                          ? 'p-0 overflow-hidden'
                          : message.role === 'user'
                          ? 'bg-white text-gray-900 border border-gray-200'
                          : 'bg-white text-gray-900 border border-gray-200'
                    } ${message.mediaType || message.moneyTransfer || isHTMLContent ? 'p-0' : message.replyTo ? 'pb-2.5' : 'px-4 py-2.5'} ${
                      isMultiSelectMode && selectedMessages.includes(message.id) ? 'ring-2 ring-purple-500' : ''
                    }`}
                  >
                    {/* 引用消息显示（只在非特殊消息时显示在这里） */}
                    {message.replyTo && !message.moneyTransfer && !message.document && !message.order && !isHTMLContent && (
                      <div className="pt-3">
                        {/* 被引用的原消息 */}
                        <div className="px-4 text-sm text-gray-600 leading-relaxed mb-2.5">
                          {message.replyTo.content}
                        </div>
                        {/* 分隔线 */}
                        <div className="border-b border-gray-200 mb-2.5"></div>
                      </div>
                    )}
                    
                    {/* 红包/转账消息气泡 */}
                    {message.moneyTransfer && message.moneyTransfer.type !== 'groupRedPacket' && (
                      <div className={`p-0 rounded-2xl overflow-hidden mb-2 ${
                        message.role === 'user' 
                          ? 'bg-gradient-to-br from-yellow-400 to-orange-400' 
                          : 'bg-gradient-to-br from-yellow-500 to-orange-500'
                      }`}>
                        <div className="p-4 text-white">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">
                              {message.moneyTransfer.type === 'redPacket' ? '🧧' : '💸'}
                            </span>
                            <div className="text-lg font-bold">
                              {message.moneyTransfer.type === 'redPacket' ? '红包' : '转账'}
                            </div>
                          </div>
                          <div className="text-2xl font-bold mb-2">
                            ¥{(message.moneyTransfer.originalAmount || message.moneyTransfer.amount).toFixed(2)}
                          </div>
                          {message.moneyTransfer.message && (
                            <div className="text-sm opacity-90 mb-2">
                              {message.moneyTransfer.message}
                            </div>
                          )}
                          {message.moneyTransfer.status === 'pending' && message.role === 'user' && (
                            <div className="text-xs opacity-75">
                              等待对方领取
                            </div>
                          )}
                          {message.moneyTransfer.status === 'received' && (
                            <div className="text-xs opacity-75">
                              已{message.moneyTransfer.type === 'redPacket' ? '领取' : '收款'}
                            </div>
                          )}
                          {message.moneyTransfer.status === 'returned' && (
                            <div className="text-xs opacity-75">
                              已退回
                            </div>
                          )}
                        </div>
                        {message.moneyTransfer.status === 'pending' && message.role === 'assistant' && (
                          <div className="bg-white/20 backdrop-blur-sm border-t border-white/20 flex">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReceiveMoney(message.id, true);
                              }}
                              className="flex-1 py-3 text-white font-medium hover:bg-white/10 transition-colors border-r border-white/20"
                            >
                              {message.moneyTransfer.type === 'redPacket' ? '🎁 领取' : '✅ 收款'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReceiveMoney(message.id, false);
                              }}
                              className="flex-1 py-3 text-white font-medium hover:bg-white/10 transition-colors"
                            >
                              💝 退回
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* 群红包卡片 */}
                    {message.moneyTransfer?.type === 'groupRedPacket' && message.moneyTransfer.groupRedPacket && (
                      <div className="mb-2">
                        <GroupRedPacketCard
                          redPacket={message.moneyTransfer.groupRedPacket}
                          currentUserId="user"
                          currentUserName={userProfile?.name || '你'}
                          onClaim={(amount) => {
                            receiveMoney(amount, 'groupRedPacket', conversation.id, '群红包');
                          }}
                          onUpdate={(updatedRedPacket) => {
                            const updatedMessages = conversation.messages.map(m => {
                              if (m.id === message.id && m.moneyTransfer?.groupRedPacket) {
                                return {
                                  ...m,
                                  moneyTransfer: {
                                    ...m.moneyTransfer,
                                    groupRedPacket: updatedRedPacket
                                  }
                                };
                              }
                              return m;
                            });
                            
                            onUpdateConversation(conversation.id, {
                              messages: updatedMessages
                            });
                          }}
                        />
                      </div>
                    )}
                    
                    {/* 🔥 红包/转账的文字回复（只显示AI接收/退回红包的回复，不显示AI发送红包时的文字） */}
                    {message.moneyTransfer && message.content && message.content.trim() && 
                     message.role === 'assistant' && 
                     (message.moneyTransfer.status === 'received' || message.moneyTransfer.status === 'returned') && (
                      <div className="rounded-2xl px-4 py-2.5 bg-white border border-gray-200">
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                    )}
                    
                    {/* 🎭 HTML模块完整界面（小红书、知乎、微博、搜索记录等） */}
                    {message.socialFeed && message.socialFeed.platform === 'xiaohongshu' && (
                      <XiaohongshuFeed rawContent={message.socialFeed.rawContent} />
                    )}
                    {message.socialFeed && message.socialFeed.platform === 'zhihu' && (
                      <ZhihuFeed rawContent={message.socialFeed.rawContent} />
                    )}
                    {message.socialFeed && message.socialFeed.platform === 'weibo' && (
                      <WeiboFeed rawContent={message.socialFeed.rawContent} />
                    )}
                    {message.socialFeed && message.socialFeed.platform === 'search-history' && (
                      <SearchHistoryView rawContent={message.socialFeed.rawContent} />
                    )}
                    
                    {/* 🔗 微信风格链接预览（新系统，优先显示） */}
                    {message.linkPreview && (
                      <WeChatLinkPreview
                        data={message.linkPreview}
                        onClick={() => {
                          // 小红书链接：在应用内打开专用的小红书详情模态框
                          if (message.linkPreview!.platform === 'xiaohongshu') {
                            setViewingXiaohongshuLink(message.linkPreview!);
                            return;
                          }

                          // 其它平台：如果有完整内容，使用文档查看器；否则尝试按URL打开
                          if (message.linkPreview!.content) {
                            setViewingDocument({
                              title: message.linkPreview!.title,
                              content: message.linkPreview!.content,
                              type: 'text'
                            });
                          } else if (message.linkPreview!.url) {
                            window.open(message.linkPreview!.url, '_blank');
                          }
                        }}
                      />
                    )}
                    
                    {/* Word 风格文档卡片 */}
                    {!message.linkPreview && message.document && (
                      <WordStyleDocumentCard
                        document={message.document}
                        compact={true}
                        onClick={() => setViewingDocument(message.document)}
                        onSave={() => {
                          // 弹出输入框让用户自定义名称
                          const customTitle = prompt(
                            '请输入文档名称：',
                            message.document!.title
                          );
                          
                          if (customTitle === null) return; // 用户取消
                          
                          const finalTitle = customTitle.trim() || message.document!.title;
                          
                          try {
                            saveToLibrary(message.document!, conversation.id, finalTitle);
                            showToast(`✅ 文档已保存：${finalTitle}`, 'success');
                          } catch (error) {
                            showToast('❌ 保存失败', 'error');
                          }
                        }}
                        onForward={() => {
                          setForwardingDocument(message.document!);
                          setShowSelectContact(true);
                        }}
                      />
                    )}
                    
                    {/* 🎵 网易云音乐卡片 */}
                    {message.neteaseMusicInfo && (
                      <div className="max-w-[300px]">
                        <NeteaseMusicCard
                          musicInfo={message.neteaseMusicInfo}
                          className="w-full"
                          onPlay={() => {
                            console.log('🎵 播放网易云音乐:', message.neteaseMusicInfo?.title);
                          }}
                          onPause={() => {
                            console.log('🎵 暂停网易云音乐:', message.neteaseMusicInfo?.title);
                          }}
                        />
                      </div>
                    )}

                    {/* 🎵 音乐卡片 */}
                    {message.music && (
                      <div className="max-w-[300px]">
                        {(message.music as any).isRealMusic ? (
                          <RealMusicCard
                            music={message.music as any}
                            className="w-full"
                          />
                        ) : (
                          <MusicCard
                            music={message.music}
                            className="w-full"
                            showPlayButton={true}
                            enableRealAudio={true}
                          />
                        )}
                      </div>
                    )}
                    
                    {/* 订单消息气泡（礼物/代付请求） - 根据source显示不同样式 */}
                    {message.order && (
                      <div className="rounded-2xl overflow-hidden max-w-[300px]">
                        {/* 淘宝商品卡片 */}
                        {message.order.source === 'taobao' && (
                          <div className="bg-gradient-to-br from-blue-500 to-purple-600">
                            {/* 蓝色头部 */}
                            <div className="text-white text-center py-3 px-4">
                              <div className="font-semibold text-base">给你的礼物</div>
                              <div className="text-xs opacity-90 mt-0.5">你的留言・查看详情</div>
                            </div>
                            {/* 白色内容区 */}
                            <div className="bg-white p-4 space-y-3">
                              {message.order.message && (
                                <div className="bg-blue-50 rounded-lg p-3">
                                  <div className="text-sm font-medium text-blue-900 mb-1">已下单留言・送给{message.order.recipientName || '你'}的礼物</div>
                                  <div className="text-sm text-gray-700">{message.order.message}</div>
                                  <div className="text-xs text-gray-500 mt-2">—{message.role === 'assistant' ? (conversation.characterSettings?.nickname || '我') : '我'}</div>
                                </div>
                              )}
                              <div className="text-sm font-medium text-gray-800 mb-2">{message.order.products[0]?.name || '精美礼品'}</div>
                              <div className="text-orange-600 text-lg font-bold">¥{message.order.totalAmount.toFixed(2)}</div>
                              <div className="text-blue-500 text-xs">查看详情 &gt;</div>
                              {message.order.orderNumber && (
                                <div className="text-xs text-gray-400">
                                  序号: {message.order.orderNumber} <br />
                                  时 间: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}<br />
                                  类型: 礼物 💝
                                </div>
                              )}
                              {message.role === 'assistant' && message.order.status === 'pending' && (
                                <div className="flex gap-2 mt-3">
                                  <button onClick={(e) => { e.stopPropagation(); handleAcceptOrder(message); }}
                                    className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium">收下礼物</button>
                                  <button onClick={(e) => { e.stopPropagation(); handleRejectOrder(message); }}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg">退回</button>
                                </div>
                              )}
                              {message.order.status !== 'pending' && (
                                <div className="text-center py-2 text-sm font-medium text-gray-500">
                                  {message.order.status === 'accepted' && '✅ 已接收'}
                                  {message.order.status === 'rejected' && '❌ 已拒绝'}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 饿了么外卖卡片 */}
                        {message.order.source === 'eleme' && message.order && (() => {
                          // 计算动态配送状态
                          const order = message.order;
                          const orderTime = order.createdAt || message.timestamp;
                          const deliveryStatus = calculateDeliveryStatus(orderTime);
                          const activeStage = getActiveStageIndex(deliveryStatus);
                          const riderInfo = getRiderInfo();
                          const isDelivered = deliveryStatus.stage === 'delivered';
                          
                          // 触发刷新（使用deliveryRefreshTrigger）
                          void deliveryRefreshTrigger;
                          
                          return (
                            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500">
                              {/* 黄色头部 */}
                              <div className="text-gray-800 px-4 py-2.5">
                                <div className="font-semibold text-sm">
                                  {isDelivered ? '✅ 已送达' : formatEstimatedTime(deliveryStatus.estimatedMinutes)}
                                </div>
                                <div className="font-bold text-lg flex items-center gap-2">
                                  <span>{deliveryStatus.statusEmoji}</span>
                                  <span>{deliveryStatus.stageText}</span>
                                </div>
                              </div>
                              {/* 白色内容区 */}
                              <div className="bg-white p-4 space-y-3">
                                {!isDelivered && (
                                  <>
                                    {/* 骑手信息 */}
                                    <div className="flex items-center gap-3 pb-3 border-b">
                                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-lg">👤</div>
                                      <div className="flex-1">
                                        <div className="text-sm font-medium">{riderInfo.name} ★ {riderInfo.rating}</div>
                                        <div className="text-xs text-gray-500">
                                          {deliveryStatus.riderDistance || '距离约 1.4km'}
                                        </div>
                                      </div>
                                      <button className="p-2 bg-gray-100 rounded-full">📞</button>
                                    </div>
                                    {/* 配送进度 */}
                                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                                      {['已接单', '已取餐', '配送中', '送达'].map((text, idx) => (
                                        <span key={idx} className={idx === activeStage ? 'font-bold text-gray-800' : ''}>
                                          {text}
                                        </span>
                                      ))}
                                    </div>
                                    <div className="h-1.5 bg-gray-200 rounded-full mb-4">
                                      <div 
                                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                                        style={{ width: `${deliveryStatus.progress}%` }}
                                      ></div>
                                    </div>
                                  </>
                                )}
                                {isDelivered && (
                                  <div className="text-center py-4 text-green-600 font-medium">
                                    ✅ 订单已完成送达
                                  </div>
                                )}
                              {/* 商品列表 */}
                              <div className="border-t pt-3">
                                <div className="font-semibold text-sm mb-2">商品和配送详情</div>
                                {order.products.map((product, idx) => (
                                  <div key={idx} className="text-sm text-gray-700 mb-1">
                                    {product.name} ×{product.quantity} <span className="float-right">¥{product.price.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                              {/* 配送地址 */}
                              <div className="border-t pt-3">
                                <div className="font-semibold text-sm mb-1">配送地址</div>
                                <div className="text-sm text-gray-600">北京市东城区XX路XX号 XX公寓 (距) 1868****119</div>
                              </div>
                              {/* 订单备注 */}
                              {order.message && (
                                <div className="border-t pt-3">
                                  <div className="font-semibold text-sm mb-1">订单备注</div>
                                  <div className="text-sm text-gray-600">{order.message}</div>
                                </div>
                              )}
                              {message.role === 'assistant' && order.status === 'pending' && !isDelivered && (
                                <div className="flex gap-2 mt-3">
                                  <button onClick={(e) => { e.stopPropagation(); handleAcceptOrder(message); }}
                                    className="flex-1 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-800 rounded-lg font-medium">确认收货</button>
                                  <button onClick={(e) => { e.stopPropagation(); handleRejectOrder(message); }}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg">取消订单</button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                        {/* 电影票卡片 (优化样式) */}
                        {message.order.source === 'movie' && (
                          <div className="bg-gradient-to-br from-purple-500 to-pink-500">
                            <div className="text-white text-center py-3 px-4">
                              <div className="font-semibold text-base">🎬 电影票</div>
                              <div className="text-xs opacity-90 mt-0.5">给你的观影券</div>
                            </div>
                            <div className="bg-white p-4 space-y-3">
                              {message.order.products.map((product, idx) => (
                                <div key={idx}>
                                  <div className="text-lg font-bold text-gray-800">{product.name}</div>
                                  <div className="text-sm text-gray-600 mt-2">
                                    影院: 万达影城 IMAX<br />
                                    场次: 今天 19:30<br />
                                    座位: 7排8座<br />
                                    影厅: 3号厅
                                  </div>
                                  <div className="text-orange-600 text-lg font-bold mt-2">¥{product.price.toFixed(2)}</div>
                                </div>
                              ))}
                              {message.order.message && (
                                <div className="bg-purple-50 rounded-lg p-3 text-sm text-gray-700">{message.order.message}</div>
                              )}
                              {message.role === 'assistant' && message.order.status === 'pending' && (
                                <div className="flex gap-2 mt-3">
                                  <button onClick={(e) => { e.stopPropagation(); handleAcceptOrder(message); }}
                                    className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium">接受邀请</button>
                                  <button onClick={(e) => { e.stopPropagation(); handleRejectOrder(message); }}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg">谢绝</button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* 多媒体混合显示（优先使用新的mediaItems数组） */}
                    {!message.moneyTransfer && !message.document && !message.order && message.mediaItems && message.mediaItems.length > 0 && (
                      <div className="space-y-2">
                        {message.mediaItems.map((media, idx) => (
                          <div key={`${message.id}_media_${idx}`}>
                            {/* 图片 */}
                            {media.type === 'image' && message.role === 'assistant' && (
                              <div 
                                onClick={() => alert(media.description)}
                                className="relative w-[180px] h-[180px] rounded-2xl overflow-hidden bg-white/30 backdrop-blur-sm cursor-pointer hover:bg-white/40 transition-colors border border-gray-200"
                              >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-gray-100/20" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                                  <ImageIcon className="w-12 h-12 text-gray-400 mb-2" strokeWidth={1.5} />
                                  <p className="text-xs text-gray-600 line-clamp-3">{media.description}</p>
                                </div>
                              </div>
                            )}
                            {/* 视频 */}
                            {media.type === 'video' && message.role === 'assistant' && (
                              <div 
                                onClick={() => alert(media.description)}
                                className="relative w-[240px] h-[135px] rounded-2xl overflow-hidden bg-white/30 backdrop-blur-sm cursor-pointer hover:bg-white/40 transition-colors border border-gray-200"
                              >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-gray-100/20" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                                  <Video className="w-12 h-12 text-gray-400 mb-2" strokeWidth={1.5} />
                                  <p className="text-xs text-gray-600 line-clamp-2">{media.description}</p>
                                </div>
                              </div>
                            )}
                            {/* 语音 */}
                            {media.type === 'voice' && message.role === 'assistant' && (
                              <div>
                                <div 
                                  onClick={() => setViewingVoice(prev => 
                                    prev.includes(`${message.id}_${idx}`) 
                                      ? prev.filter(id => id !== `${message.id}_${idx}`)
                                      : [...prev, `${message.id}_${idx}`]
                                  )}
                                  className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl min-w-[120px] max-w-[200px]"
                                >
                                  <Mic className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                  <div className="flex-1 flex items-center gap-0.5">
                                    <div className="flex gap-0.5">
                                      {voiceWaveHeights.map((height, i) => (
                                        <div 
                                          key={i} 
                                          className="w-0.5 bg-gray-400 rounded-full"
                                          style={{ height: `${height}px` }}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <span className="text-xs text-gray-600 flex-shrink-0">{media.duration || 3}"</span>
                                </div>
                                {viewingVoice.includes(`${message.id}_${idx}`) && (
                                  <div className="mt-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200">
                                    <p className="text-[13px] text-gray-700">{media.description}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            {/* 表情包 */}
                            {media.type === 'sticker' && message.role === 'assistant' && (
                              <div className="relative w-[120px] h-[120px] rounded-2xl overflow-hidden bg-blue-100/40 backdrop-blur-sm border border-blue-200">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-blue-100/30" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                                  <Smile className="w-8 h-8 text-blue-400 mb-2" strokeWidth={1.5} />
                                  <p className="text-xs text-gray-700 leading-tight">{media.description}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {/* 文字内容（如果有） */}
                        {(() => {
                          const textContent = getDisplayText(message.content);
                          if (!textContent || isMediaPlaceholderText(textContent)) return null;
                          return (
                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words px-4 py-2.5">
                              {textContent}
                            </p>
                          );
                        })()}
                      </div>
                    )}
                    {/* 用户真实媒体内容（兼容旧格式，无mediaItems时使用） */}
                    {!message.mediaItems && message.role === 'user' && message.mediaType === 'image' && message.mediaUrl && (
                      <img 
                        src={message.mediaUrl} 
                        alt="图片" 
                        className="w-full max-w-[200px] rounded-2xl"
                      />
                    )}
                    {!message.mediaItems && message.role === 'user' && message.mediaType === 'video' && message.mediaUrl && (
                      <video 
                        src={message.mediaUrl} 
                        controls 
                        className="w-full max-w-[200px] rounded-2xl"
                      />
                    )}
                    {/* 用户语音消息（与AI样式一致：只显示转文字，不播放音频） */}
                    {!message.mediaItems && message.role === 'user' && message.mediaType === 'voice' && message.isMediaDescriptionOnly && (
                      <div 
                        onClick={() => setViewingVoice(prev => 
                          prev.includes(message.id) 
                            ? prev.filter(id => id !== message.id)
                            : [...prev, message.id]
                        )}
                        className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl min-w-[120px] max-w-[200px]"
                      >
                        <Mic className="w-4 h-4 text-gray-600 flex-shrink-0" />
                        <div className="flex-1 flex items-center gap-0.5">
                          <div className="flex gap-0.5">
                            {voiceWaveHeights.map((height, i) => (
                              <div 
                                key={i} 
                                className="w-0.5 bg-gray-400 rounded-full"
                                style={{ height: `${height}px` }}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-gray-600 flex-shrink-0">{message.voiceDuration || 3}"</span>
                      </div>
                    )}
                    {/* 用户语音消息（旧版本：带播放功能，保留兼容） */}
                    {!message.mediaItems && message.role === 'user' && message.mediaType === 'voice' && message.mediaUrl && !message.isMediaDescriptionOnly && (
                      <div>
                        <div 
                          onClick={() => setViewingVoice(prev => 
                            prev.includes(message.id) 
                              ? prev.filter(id => id !== message.id)
                              : [...prev, message.id]
                          )}
                          className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl min-w-[120px] max-w-[200px]"
                        >
                          <Mic className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          <div className="flex-1 flex items-center gap-0.5">
                            <div className="flex gap-0.5">
                              {voiceWaveHeights.map((height, i) => (
                                <div 
                                  key={i} 
                                  className="w-0.5 bg-gray-400 rounded-full"
                                  style={{ height: `${height}px` }}
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
                        {viewingVoice.includes(message.id) && message.mediaDescription && (
                          <div className="mt-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200 max-w-[200px]">
                            <p className="text-[13px] text-gray-700 break-words whitespace-pre-wrap">{message.mediaDescription}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {/* 用户表情包 */}
                    {!message.mediaItems && message.role === 'user' && message.mediaType === 'sticker' && (
                      message.mediaUrl ? (
                        // 真实表情包（图片）
                        <div className="relative w-[120px] h-[120px] rounded-lg overflow-hidden bg-transparent">
                          <img 
                            src={message.mediaUrl} 
                            alt="表情包" 
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (message.stickerKind === 'systemEmoji' || isSingleEmojiText(message.mediaDescription)) ? (
                        <div className="px-3 py-2 rounded-2xl bg-yellow-50 border border-yellow-200 inline-flex items-center justify-center min-w-[56px]">
                          <span className="text-3xl leading-none">{message.mediaDescription || '😊'}</span>
                        </div>
                      ) : (
                        // 纯文字描述表情包
                        <div className="relative w-[120px] h-[120px] rounded-2xl overflow-hidden bg-blue-100/40 backdrop-blur-sm border border-blue-200">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-blue-100/30" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                            <Smile className="w-8 h-8 text-blue-400 mb-2" strokeWidth={1.5} />
                            <p className="text-xs text-gray-700 leading-tight">{message.mediaDescription}</p>
                          </div>
                        </div>
                      )
                    )}
                    
                    {/* 🔄 转发消息显示 */}
                    {message.forwarded && (
                      <div className="mt-2">
                        {message.forwarded.type === 'merged' && message.forwarded.messages && (
                          <div 
                            onClick={() => setViewingMergedForward(message.forwarded)}
                            className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-600 font-medium">聊天记录</span>
                              <span className="text-xs text-gray-400">({message.forwarded.messages.length}条消息)</span>
                            </div>
                            <div className="text-sm font-medium text-gray-800 mb-1">
                              {message.forwarded.title || '转发的聊天记录'}
                            </div>
                            <div className="text-xs text-gray-500 space-y-1">
                              {message.forwarded.messages.slice(0, 3).map((msg, idx) => (
                                <div key={idx} className="truncate">
                                  <span className="font-medium">{msg.senderName}:</span> {msg.content}
                                </div>
                              ))}
                              {message.forwarded.messages.length > 3 && (
                                <div className="text-gray-400">...还有{message.forwarded.messages.length - 3}条消息</div>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                              来自：{message.forwarded.from.conversationName}
                              <Eye className="w-3 h-3" />
                              <span>点击查看</span>
                            </div>
                          </div>
                        )}
                        {message.forwarded.type === 'single' && message.forwarded.originalMessage && (
                          <div className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-600 font-medium">转发消息</span>
                            </div>
                            <div className="text-sm text-gray-800">
                              {message.forwarded.originalMessage.content}
                            </div>
                            <div className="text-xs text-gray-400 mt-2">
                              来自：{message.forwarded.from.conversationName}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* AI媒体消息（半透明占位符）（兼容旧格式） */}
                    {!message.mediaItems && message.role === 'assistant' && message.mediaType === 'image' && message.isMediaDescriptionOnly && (
                      <div 
                        onClick={() => alert(message.mediaDescription)}
                        className="relative w-[180px] h-[180px] rounded-2xl overflow-hidden bg-white/30 backdrop-blur-sm cursor-pointer hover:bg-white/40 transition-colors border border-gray-200"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-gray-100/20" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                          <ImageIcon className="w-12 h-12 text-gray-400 mb-2" strokeWidth={1.5} />
                          <p className="text-xs text-gray-600 line-clamp-3">{message.mediaDescription}</p>
                        </div>
                      </div>
                    )}
                    {!message.mediaItems && message.role === 'assistant' && message.mediaType === 'video' && message.isMediaDescriptionOnly && (
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
                    {!message.mediaItems && message.role === 'assistant' && message.mediaType === 'voice' && message.isMediaDescriptionOnly && (
                      <div 
                        onClick={() => setViewingVoice(prev => 
                          prev.includes(message.id) 
                            ? prev.filter(id => id !== message.id)
                            : [...prev, message.id]
                        )}
                        className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl min-w-[120px] max-w-[200px]"
                      >
                        <Mic className="w-4 h-4 text-gray-600 flex-shrink-0" />
                        <div className="flex-1 flex items-center gap-0.5">
                          <div className="flex gap-0.5">
                            {voiceWaveHeights.map((height, i) => (
                              <div 
                                key={i} 
                                className="w-0.5 bg-gray-400 rounded-full"
                                style={{ height: `${height}px` }}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-gray-600 flex-shrink-0">{message.voiceDuration || 3}"</span>
                      </div>
                    )}
                    {/* AI表情包 */}
                    {!message.mediaItems && message.role === 'assistant' && message.mediaType === 'sticker' && (
                      message.mediaUrl ? (
                        // 真实表情包（图片）
                        <div className="relative w-[120px] h-[120px] rounded-lg overflow-hidden bg-transparent">
                          <img 
                            src={message.mediaUrl} 
                            alt="表情包" 
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (message.stickerKind === 'systemEmoji' || isSingleEmojiText(message.mediaDescription)) ? (
                        <div className="px-3 py-2 rounded-2xl bg-yellow-50 border border-yellow-200 inline-flex items-center justify-center min-w-[56px]">
                          <span className="text-3xl leading-none">{message.mediaDescription || '😊'}</span>
                        </div>
                      ) : message.isMediaDescriptionOnly ? (
                        // 纯文字描述表情包（仅当标记为纯描述时）
                        <div className="relative w-[120px] h-[120px] rounded-2xl overflow-hidden bg-blue-100/40 backdrop-blur-sm border border-blue-200">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-blue-100/30" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                            <Smile className="w-8 h-8 text-blue-400 mb-2" strokeWidth={1.5} />
                            <p className="text-xs text-gray-700 leading-tight">{message.mediaDescription}</p>
                          </div>
                        </div>
                      ) : null
                    )}
                    
                    {/* 纯文字内容 / HTML内容 */}
                    {!message.mediaType && !message.moneyTransfer && !message.document && !message.order && message.content && message.content.trim() && (() => {
                      const displayContent = getDisplayText(message.content);
                      if (!displayContent || isMediaPlaceholderText(displayContent)) return null;

                      // 检测是否是HTML内容（包含多个标签或结构化标签）
                      const hasHTMLTags = /<[^>]+>/.test(displayContent);
                      const htmlTagCount = (displayContent.match(/<[^>]+>/g) || []).length;
                      const hasStructuralTags = ['<div', '<style', '<span', '<table', '<ul', '<ol'].some(tag => displayContent.includes(tag));
                      const isHTMLContent = hasHTMLTags && (htmlTagCount >= 3 || hasStructuralTags);
                      
                      if (isHTMLContent) {
                        // HTML内容：使用dangerouslySetInnerHTML渲染
                        return (
                          <div 
                            className={`message-content content text-[15px] leading-relaxed ${message.replyTo ? 'px-4' : ''}`}
                            dangerouslySetInnerHTML={{ __html: displayContent }}
                          />
                        );
                      } else {
                        // 普通文本内容
                        return (
                          <p className={`message-content content text-[15px] leading-relaxed whitespace-pre-wrap break-words ${message.replyTo ? 'px-4' : ''}`}>
                            {displayContent}
                          </p>
                        );
                      }
                    })()}
                    {/* 用户媒体的描述文字（排除语音和表情包） */}
                    {message.role === 'user' && message.mediaType && message.mediaType !== 'sticker' && message.mediaType !== 'voice' && message.mediaDescription && (
                      <p className="text-[13px] leading-relaxed px-3 py-2 text-gray-600">{message.mediaDescription}</p>
                    )}
                    {/* 🆕 消息回应显示 */}
                    {message.reactions && message.reactions.length > 0 && (
                      <div className={`absolute -bottom-4 ${message.role === 'user' ? 'left-0' : 'right-0'} flex gap-1 z-10`}>
                        {message.reactions.map((reaction, rIdx) => (
                          <div key={rIdx} className="bg-white border border-gray-200 rounded-full px-1.5 py-0.5 text-xs shadow-sm scale-90 flex items-center justify-center min-w-[20px] h-[20px]">
                            {reaction.type}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 语音转文字内容显示（放在气泡容器内部，紧贴语音气泡下方） */}
                    {message.mediaType === 'voice' && message.isMediaDescriptionOnly && viewingVoice.includes(message.id) && message.mediaDescription && (
                      <div className="mt-2">
                        <div className="px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
                          <p className="text-[13px] text-gray-700 whitespace-pre-wrap break-words leading-relaxed">{message.mediaDescription}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Message tail */}
                  <div className={`message-tail absolute bottom-3 ${
                    message.role === 'user' ? 'right-0 translate-x-[40%]' : 'left-0 -translate-x-[40%]'
                  }`}>
                    <div className={`w-2.5 h-2.5 bg-white border-gray-200 transform rotate-45 shadow-sm ${
                      message.role === 'user' ? 'border-r border-b' : 'border-l border-t'
                    }`}></div>
                  </div>
                </div>
                
                {/* 语音转文字内容已移动到气泡容器内部渲染，避免位置偏移问题 */}
                
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
              
              {/* 旧的操作栏已移除，使用新的MessageActionMenu */}
            </div>
          );
        });
        })()}

        {isGroupProcessing && (
          <div className="flex justify-center my-2">
            <div className="bg-indigo-500/90 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full shadow-sm flex items-center space-x-1 animate-pulse">
               <span>⚡</span>
               <span>群聊响应中...</span>
            </div>
          </div>
        )}

        {showSendingHint && (
          <div className="flex justify-center my-2">
            <div className="bg-blue-500 text-white text-xs px-3 py-1.5 rounded-full shadow-sm">
              消息发送中...
            </div>
          </div>
        )}

        {/* 私聊打字动画 */}
        {showTyping && conversation.type === 'private' && (
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

        {/* 群聊打字动画 */}
        {currentTypingAI && conversation.type === 'group' && (
          <div className="flex gap-2 items-end justify-start">
            <div className="relative flex-shrink-0">
              {currentTypingAI.avatar ? (
                <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-md">
                  <img src={currentTypingAI.avatar} alt={currentTypingAI.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center border-2 border-white shadow-md">
                  <span className="text-white font-semibold text-sm">{currentTypingAI.name.charAt(0)}</span>
                </div>
              )}
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

        <div ref={messagesEndRef} />
        
        {/* 🚀 返回底部按钮 - 居中显示在手机容器中 */}
        {!shouldScrollToBottom && isUserScrolling && (
          <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50">
            <button
              onClick={() => {
                console.log('🔄 用户点击返回底部，智能重置消息窗口');
                
                // 🚀 智能重置：回到底部时重置为合理的消息窗口
                const resetSize = Math.min(100, conversation.messages.length); // 最多100条最新消息
                const newWindow = {
                  startIndex: Math.max(0, conversation.messages.length - resetSize),
                  size: resetSize
                };
                
                console.log(`📊 重置消息窗口：显示从索引 ${newWindow.startIndex} 开始的 ${newWindow.size} 条消息`);
                
                setMessageWindow(newWindow);
                setShouldScrollToBottom(true);
                setIsUserScrolling(false); // 重置滚动状态
                
                // 延迟滚动，确保DOM更新
                setTimeout(() => smartScrollToBottom(true), 100);
              }}
              className="bg-blue-500/90 hover:bg-blue-600 text-white p-2 rounded-full shadow-lg transition-all backdrop-blur-sm flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span className="text-xs">回到底部</span>
            </button>
          </div>
        )}
      </div>

      {/* Input area - 固定在底部 */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 z-10">
        {/* 多选模式工具栏 */}
        {isMultiSelectMode && (
          <div className="px-4 py-3 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancelMultiSelect}
                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                取消
              </button>
              <span className="text-sm text-gray-700">
                已选择 {selectedMessages.length} 条消息
              </span>
            </div>
            <button
              onClick={handleBatchDelete}
              disabled={selectedMessages.length === 0}
              className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              删除
            </button>
          </div>
        )}
        
        {/* Toolbar */}
        {showToolbar && (
          <div className="px-3 py-2 bg-white border-b border-gray-200">
            <div className="flex gap-2 items-center overflow-x-auto">
              <button onClick={() => imageInputRef.current?.click()} className="flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <ImageIcon className="w-4 h-4 text-gray-600" />
                </div>
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
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
              {/* 红包按钮 - 私聊打开普通红包，群聊打开群红包 */}
              <button 
                className="flex-shrink-0"
                onClick={() => {
                  if (conversation.type === 'group') {
                    setShowGroupRedPacketModal(true);
                  } else {
                    setShowMoneyTransferModal(true);
                  }
                }}
              >
                <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <Gift className="w-4 h-4 text-gray-600" />
                </div>
              </button>
              <button
                ref={advancedToolbarToggleRef}
                className="flex-shrink-0"
                onClick={() => setShowAdvancedToolbarActions(prev => !prev)}
                title="更多功能"
              >
                <div className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
                  showAdvancedToolbarActions
                    ? 'bg-gray-900 border-gray-900'
                    : 'bg-white border-gray-300 hover:border-gray-400'
                }`}>
                  <MoreHorizontal className={`w-4 h-4 ${showAdvancedToolbarActions ? 'text-white' : 'text-gray-600'}`} />
                </div>
              </button>
            </div>
            {showAdvancedToolbarActions && (
              <div
                ref={advancedToolbarPanelRef}
                className="mt-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm"
              >
                <div className="text-[11px] text-gray-400 mb-2">沟通</div>
                <div className="flex gap-3 mb-3">
                  <button onClick={() => setShowCallTypeSelector(true)} className="flex flex-col items-center gap-1 min-w-[52px]" title="语音/视频通话">
                    <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                      <Phone className="w-4 h-4 text-gray-600" />
                    </div>
                    <span className="text-[11px] text-gray-500">通话</span>
                  </button>
                  <button onClick={() => setShowSubChatManager(true)} className="flex flex-col items-center gap-1 min-w-[52px]" title="子聊天">
                    <div className="w-9 h-9 rounded-full bg-white border border-purple-300 flex items-center justify-center hover:border-purple-400 transition-colors hover:bg-purple-50">
                      <MessageCircle className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-[11px] text-gray-500">子聊天</span>
                  </button>
                </div>

                <div className="text-[11px] text-gray-400 mb-2">内容</div>
                <div className="flex gap-3 mb-3">
                  <button onClick={() => setShowSendDocumentModal(true)} className="flex flex-col items-center gap-1 min-w-[52px]" title="发送文档">
                    <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                      <FileText className="w-4 h-4 text-gray-600" />
                    </div>
                    <span className="text-[11px] text-gray-500">文档</span>
                  </button>
                  <button onClick={() => setShowRealMusicModal(true)} className="flex flex-col items-center gap-1 min-w-[52px]" title="搜索真实音乐">
                    <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                      <Music className="w-4 h-4 text-gray-600" />
                    </div>
                    <span className="text-[11px] text-gray-500">音乐</span>
                  </button>
                </div>

                <div className="text-[11px] text-gray-400 mb-2">工具</div>
                <div className="flex gap-3">
                  <button className="flex flex-col items-center gap-1 min-w-[52px]" title="位置（开发中）">
                    <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                      <MapPin className="w-4 h-4 text-gray-600" />
                    </div>
                    <span className="text-[11px] text-gray-500">位置</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 引用提示 */}
        {quotedMessage && (
          <div className="px-3 pt-2 pb-1 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2 border-l-3 border-blue-500">
              <div className="flex-1 mr-2">
                <div className="text-xs text-blue-600 font-medium mb-1">
                  引用 {quotedMessage.role === 'user' ? '我' : conversation.name}
                </div>
                <div className="text-sm text-gray-700 truncate">
                  {quotedMessage.content}
                </div>
              </div>
              <button
                onClick={handleCancelQuote}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-blue-100 text-blue-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* 编辑提示 */}
        {messageBeingEdited && (
          <div className="px-3 pt-2 pb-1 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2 border-l-3 border-green-500">
              <div className="flex-1 mr-2">
                <div className="text-xs text-green-600 font-medium mb-1">
                  编辑消息
                </div>
                <div className="text-sm text-gray-700 truncate">
                  {messageBeingEdited.content}
                </div>
              </div>
              <button
                onClick={handleCancelEdit}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-green-100 text-green-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* @成员列表弹窗 */}
        {showAtMemberList && conversation.type === 'group' && (
          <div className="absolute bottom-16 left-0 right-0 bg-white border-t border-gray-200 shadow-lg max-h-60 overflow-y-auto">
            <div className="p-2 space-y-1">
              {(conversation.members || [])
                .map(memberId => conversations.find(c => c.id === memberId))
                .filter(c => c)
                .filter(member => {
                  const nickname = (member as Conversation).characterSettings?.nickname || (member as Conversation).name;
                  return nickname.toLowerCase().includes(atFilterText.toLowerCase());
                })
                .map(member => {
                  const m = member as Conversation;
                  const nickname = m.characterSettings?.nickname || m.name;
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleSelectAtMember(nickname)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                        {m.characterSettings?.avatar || m.avatar ? (
                          <img
                            src={m.characterSettings?.avatar || m.avatar}
                            alt={nickname}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                            <span className="text-white text-sm font-semibold">
                              {nickname.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-900 text-sm">{nickname}</div>
                        {m.characterSettings?.personality && (
                          <div className="text-xs text-gray-500 truncate">
                            {m.characterSettings.personality.slice(0, 20)}...
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              {(conversation.members || [])
                .map(memberId => conversations.find(c => c.id === memberId))
                .filter(c => c)
                .filter(member => {
                  const nickname = (member as Conversation).characterSettings?.nickname || (member as Conversation).name;
                  return nickname.toLowerCase().includes(atFilterText.toLowerCase());
                }).length === 0 && (
                <div className="text-center py-4 text-gray-400 text-sm">
                  没有匹配的成员
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Input bar */}
        <div className="px-3 py-3 bg-white">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const nextShowToolbar = !showToolbar;
                setShowToolbar(nextShowToolbar);
                if (!nextShowToolbar) {
                  setShowAdvancedToolbarActions(false);
                }
              }}
              className="w-9 h-9 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 flex items-center justify-center"
            >
              <Plus className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2">
              <textarea
                ref={inputRef as any}
                value={currentInput}
                onChange={(e) => {
                  const value = e.target.value;
                  const cursorPos = e.target.selectionStart || 0;
                  setCurrentInput(value);
                  
                  // 检测@输入（仅群聊）
                  if (conversation.type === 'group') {
                    const textBeforeCursor = value.slice(0, cursorPos);
                    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
                    
                    if (lastAtIndex !== -1) {
                      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
                      // 如果@后面没有空格，显示成员列表
                      if (!textAfterAt.includes(' ')) {
                        setShowAtMemberList(true);
                        setAtFilterText(textAfterAt);
                        setAtCursorPosition(lastAtIndex);
                      } else {
                        setShowAtMemberList(false);
                      }
                    } else {
                      setShowAtMemberList(false);
                    }
                  }
                  
                  // 自动调整高度
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onKeyPress={handleKeyPress}
                placeholder={messageBeingEdited ? "编辑消息..." : quotedMessage ? "回复消息..." : isGenerating && conversation.type === 'group' ? "输入消息（将在下轮回复）..." : "输入消息..."}
                className="flex-1 outline-none text-[15px] bg-transparent text-gray-900 placeholder-gray-400 resize-none overflow-y-auto max-h-[120px] min-h-[24px]"
                disabled={false}
                rows={1}
                style={{ height: '24px' }}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!currentInput.trim()}
              className="w-10 h-10 bg-blue-500 text-white rounded-full hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center shadow-md"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* 视频通话弹窗 */}
    <VideoCallModal
      isOpen={showVideoCall}
      onClose={() => setShowVideoCall(false)}
      conversation={conversation}
      currentUserProfile={currentUserProfile}
      apiConfig={apiConfig}
      onSaveCallLog={handleSaveCallLog}
      callType={callType}
    />

    {/* 通话类型选择器 */}
    {showCallTypeSelector && (
      <div className="absolute inset-0 bg-black/50 flex items-end justify-center z-50 animate-fade-in" onClick={() => setShowCallTypeSelector(false)}>
        <div className="bg-white w-full rounded-t-2xl p-4 space-y-2 animate-slide-up" onClick={e => e.stopPropagation()}>
          <div className="text-center text-sm text-gray-500 mb-4">选择通话方式</div>
          <button
            onClick={() => {
              setCallType('video');
              setShowVideoCall(true);
              setShowCallTypeSelector(false);
              setShowToolbar(false);
            }}
            className="w-full py-3.5 bg-white border-b border-gray-100 text-gray-900 text-base font-medium flex items-center justify-center gap-2 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <Video className="w-5 h-5 text-gray-700" />
            视频通话
          </button>
          <button
            onClick={() => {
              setCallType('voice');
              setShowVideoCall(true);
              setShowCallTypeSelector(false);
              setShowToolbar(false);
            }}
            className="w-full py-3.5 bg-white text-gray-900 text-base font-medium flex items-center justify-center gap-2 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <Phone className="w-5 h-5 text-gray-700" />
            语音通话
          </button>
          <div className="h-2 bg-gray-100 -mx-4"></div>
          <button
            onClick={() => setShowCallTypeSelector(false)}
            className="w-full py-3.5 bg-white text-gray-900 text-base font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    )}

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
            请填写视频内容的文字描述，以便AI更好地理解视频内容并做出回复。<br/>
            <span className="text-red-500 font-medium">⚠️ 请使用第三人称描述（如"画面中..."、"视频里..."），不要使用"我"。</span>
          </p>
          <textarea
            value={videoDescInput}
            onChange={(e) => setVideoDescInput(e.target.value)}
            placeholder="例如：视频中一个女孩在海边散步，夕阳洒在海面上，海浪轻轻拍打着沙滩"
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

    {/* 语音转文字弹窗（EVE风格） */}
    {showVoiceConfirmModal && (
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
            语音转文字
          </h3>
          <p className="text-sm text-gray-500 mb-4 text-center">
            请输入您想说的内容：
          </p>
          
          {/* 文本输入框 */}
          <textarea
            value={voiceTranscript}
            onChange={(e) => setVoiceTranscript(e.target.value)}
            placeholder="在这里输入语音内容..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm mb-4"
            disabled={isSpeechRecognizing}
          />
          
          {/* 麦克风按钮 */}
          <div className="flex justify-center mb-4">
            {speechRecognitionSupported ? (
              <button
                onClick={() => {
                  if (isSpeechRecognizing) {
                    stopSpeechRecognition();
                  } else {
                    startSpeechRecognition();
                  }
                }}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isSpeechRecognizing 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                    : 'bg-blue-500 hover:bg-blue-600'
                } shadow-lg`}
                title={isSpeechRecognizing ? '停止识别' : '开始语音识别'}
              >
                <Mic className="w-6 h-6 text-white" />
              </button>
            ) : (
              <div className="text-xs text-gray-400 text-center">
                当前浏览器不支持语音识别<br/>
                请手动输入或使用Chrome/Edge
              </div>
            )}
          </div>
          
          {/* 识别状态提示 */}
          {isSpeechRecognizing && (
            <div className="mb-4 text-center">
              <p className="text-sm text-blue-600 animate-pulse">
                🎤 正在监听中...
              </p>
            </div>
          )}
          
          {/* 底部按钮 */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                stopSpeechRecognition();
                setShowVoiceConfirmModal(false);
                setVoiceTranscript('');
                finalTranscriptRef.current = ''; // 🔥 重置已确认的文本
              }}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={() => {
                stopSpeechRecognition();
                if (voiceTranscript.trim()) {
                  // 发送为语音消息（只有转文字，不播放音频，与AI语音样式一致）
                  const voiceMessage: Message = {
                    id: Date.now().toString(),
                    role: 'user',
                    content: '[语音]', // 显示[语音]标识
                    timestamp: Date.now(),
                    mediaType: 'voice',
                    mediaDescription: voiceTranscript.trim(), // 转写文字
                    voiceDuration: 3, // 默认3秒
                    isMediaDescriptionOnly: true // 🔥 只有描述文字，不需要播放音频
                  };
                  
                  commitOutgoingUserMessage(voiceMessage);
                  
                  setShowVoiceConfirmModal(false);
                  setVoiceTranscript('');
                  finalTranscriptRef.current = ''; // 🔥 重置已确认的文本
                }
              }}
              disabled={!voiceTranscript.trim()}
              className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    )}

    {/* 消息操作菜单 */}
    <MessageActionMenu
      isVisible={selectedMessageId !== null}
      position={menuPosition}
      onQuote={handleQuoteMessage}
      onEdit={handleEditMessage}
      onDelete={handleDeleteMessage}
      onMultiSelect={handleEnterMultiSelect}
      onForward={handleForwardSingleMessage}
      onReact={handleReactMessage}
      onClose={handleCloseMenu}
    />

    {/* 红包转账弹窗 */}
    {showMoneyTransferModal && (
      <MoneyTransferModal
        onClose={() => setShowMoneyTransferModal(false)}
        onSend={(amount, type, message) => {
          // 检查余额
          const balance = getBalance();
          if (balance < amount) {
            alert('余额不足，请先充值');
            return;
          }

          // 发送红包/转账
          const success = sendMoney(amount, type, conversation.id, message);
          if (success) {
            const newMessage: Message = {
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              role: 'user',
              content: '', // 用户发送红包时不显示文本，只显示红包卡片
              timestamp: Date.now(),
              moneyTransfer: {
                type,
                amount,
                message,
                status: 'pending'
              }
            };

            commitOutgoingUserMessage(newMessage);

            // 关闭工具栏和弹窗
            setShowToolbar(false);
            setShowMoneyTransferModal(false);

            // 🔧 已禁用旧的自动处理机制，改用system prompt驱动
            // AI现在通过正常对话流程响应，使用[接收]或[退回]标记
            // setTimeout(() => {
            //   handleAIMoneyResponse(newMessage);
            // }, 2000 + Math.random() * 3000);
          } else {
            alert('发送失败');
          }
        }}
      />
    )}

    {/* 群红包弹窗 */}
    {conversation.type === 'group' && showGroupRedPacketModal && (
      <GroupRedPacketModal
        isOpen={showGroupRedPacketModal}
        onClose={() => setShowGroupRedPacketModal(false)}
        onSend={(redPacket, message) => {
          // 检查余额
          const balance = getBalance();
          if (balance < redPacket.totalAmount) {
            alert('余额不足，请先充值');
            return;
          }

          // 发送群红包
          const success = sendMoney(redPacket.totalAmount, 'groupRedPacket', conversation.id, message);
          if (success) {
            const newMessage: Message = {
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              role: 'user',
              content: '',
              timestamp: Date.now(),
              moneyTransfer: {
                type: 'groupRedPacket',
                amount: redPacket.totalAmount,
                message,
                status: 'pending',
                groupRedPacket: redPacket,
              }
            };

            commitOutgoingUserMessage(newMessage);

            setShowToolbar(false);
            setShowGroupRedPacketModal(false);
            
            // 🎁 AI智能领取群红包（异步处理）
            setTimeout(async () => {
              // 重新获取最新的对话数据，确保红包消息已添加
              const updatedConv = conversations.find(c => c.id === conversation.id);
              if (!updatedConv) return;
              
              const aiMembers = updatedConv.members
                ?.map(mid => conversations.find(c => c.id === mid))
                .filter(c => c && c.type === 'private') as Conversation[];
              
              if (aiMembers && aiMembers.length > 0) {
                try {
                  // 找到刚发送的红包消息
                  const redPacketMsg = updatedConv.messages.find(m => 
                    m.id === newMessage.id && 
                    m.moneyTransfer?.type === 'groupRedPacket'
                  );
                  
                  if (!redPacketMsg) {
                    console.error('未找到红包消息');
                    return;
                  }
                  
                  await handleAIGroupRedPacketClaiming(
                    redPacketMsg,
                    aiMembers,
                    updatedConv,
                    updatedConv.messages,
                    apiConfig,
                    (_aiId, aiName, amount) => {
                      // AI领取成功，更新红包消息和添加提示
                      console.log(`🎁 ${aiName} 领取了 ¥${amount.toFixed(2)}`);
                      
                      const currentConv = conversations.find(c => c.id === conversation.id);
                      if (currentConv) {
                        // 更新红包消息本身
                        const updatedMessages = currentConv.messages.map(m => {
                          if (m.id === newMessage.id && m.moneyTransfer?.groupRedPacket) {
                            const redPacket = m.moneyTransfer.groupRedPacket;
                            // 🐛 修复：创建红包对象的深拷贝，触发React更新
                            return {
                              ...m,
                              moneyTransfer: {
                                ...m.moneyTransfer,
                                groupRedPacket: {
                                  ...redPacket,
                                  // 🎯 关键：深拷贝claimedBy数组，确保React检测到变化
                                  claimedBy: [...redPacket.claimedBy],
                                  remainingCount: redPacket.remainingCount,
                                  remainingAmount: redPacket.remainingAmount,
                                  status: redPacket.status
                                }
                              }
                            };
                          }
                          return m;
                        });
                        
                        // 添加醒目的领取提示消息（类似私聊红包样式）
                        const claimMessage: Message = {
                          id: `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                          role: 'system',
                          content: `${aiName} 领取了你的红包`,
                          timestamp: Date.now(),
                          // 添加自定义样式标记
                          moneyTransfer: {
                            type: 'redPacket',
                            amount: amount,
                            status: 'received',
                            isClaimNotification: true,
                            claimerName: aiName
                          } as any
                        };
                        
                        onUpdateConversation(conversation.id, {
                          messages: [...updatedMessages, claimMessage]
                        });
                      }
                    }
                  );
                } catch (error) {
                  console.error('AI领取红包失败:', error);
                }
              }
            }, 2000); // 延迟2秒后开始处理
          } else {
            alert('发送失败');
          }
        }}
        groupMembers={conversation.members?.map(mid => {
          const member = conversations.find(c => c.id === mid);
          return {
            id: mid,
            name: member?.characterSettings?.nickname || member?.name || '未知'
          };
        }) || []}
        currentUserId="user"
        currentUserName={userProfile?.name || '你'}
      />
    )}

    {/* 发送文档弹窗 */}
    {showSendDocumentModal && (
      <SendDocumentModal
        onClose={() => {
          setShowSendDocumentModal(false);
          setSelectedLibraryDoc(null);
          setShouldEditDoc(false);
        }}
        onOpenLibrary={() => {
          setShowDocumentLibrary(true);
        }}
        initialDocument={selectedLibraryDoc && shouldEditDoc ? {
          title: selectedLibraryDoc.title,
          content: selectedLibraryDoc.content,
          type: selectedLibraryDoc.type
        } : undefined}
        onSend={(title, content, greeting, type, originalFile) => {
          const documentPayload: DocumentMessage = {
            title,
            content,
            greeting,
            type,
            size: new Blob([content]).size,
            ...(originalFile ? { originalFile } : {})
          };

          const newMessage: Message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            role: 'user',
            content: `发送了文档「${title}」`,
            timestamp: Date.now(),
            document: documentPayload
          };

          commitOutgoingUserMessage(newMessage);

          // 用户发送文档后自动入库，便于在资料库和角色设置知识库中复用
          try {
            saveToLibrary(documentPayload, '用户上传', title);
          } catch (error) {
            console.error('自动保存用户文档到资料库失败:', error);
          }

          // 关闭工具栏和弹窗
          setShowToolbar(false);
          setShowSendDocumentModal(false);
          setSelectedLibraryDoc(null);
          setShouldEditDoc(false);
        }}
      />
    )}

    {/* 文档库 */}
    {showDocumentLibrary && (
      <DocumentLibraryModal
        conversations={conversations}
        onClose={() => setShowDocumentLibrary(false)}
        onSelectDocument={(doc, shouldEdit) => {
          if (shouldEdit) {
            // 编辑发送：打开编辑弹窗
            setSelectedLibraryDoc(doc);
            setShouldEditDoc(true);
            setShowDocumentLibrary(false);
            setShowSendDocumentModal(true);
          } else {
            // 原文发送：直接发送文档
            const newMessage: Message = {
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              role: 'user',
              content: `发送了文档「${doc.title}」`,
              timestamp: Date.now(),
              document: {
                title: doc.title,
                content: doc.content,
                type: doc.type,
                greeting: '请查收',
                size: doc.size
              }
            };
            
            commitOutgoingUserMessage(newMessage);
            
            setShowDocumentLibrary(false);
          }
        }}
      />
    )}

    {/* Word 风格文档查看器 */}
    {viewingDocument && (
      <WordStyleDocumentModal
        document={viewingDocument}
        author={conversation.characterSettings?.nickname || conversation.name}
        authorAvatar={conversation.characterSettings?.avatar || conversation.avatar}
        timestamp={Date.now()}
        onClose={() => setViewingDocument(null)}
        onSave={() => {
          // 弹出输入框让用户自定义名称
          const customTitle = prompt(
            '请输入文档名称：',
            viewingDocument.title
          );
          
          if (customTitle === null) return; // 用户取消
          
          const finalTitle = customTitle.trim() || viewingDocument.title;
          
          try {
            saveToLibrary(viewingDocument, conversation.id, finalTitle);
            showToast(`✅ 文档已保存：${finalTitle}`, 'success');
            setViewingDocument(null);
          } catch (error) {
            showToast('❌ 保存失败', 'error');
          }
        }}
        onForward={() => {
          setForwardingDocument(viewingDocument);
          setViewingDocument(null);
          setShowSelectContact(true);
        }}
      />
    )}

    {/* 小红书链接详情模态框（AI 生成的小红书卡片点击后打开） */}
    {viewingXiaohongshuLink && (
      <XiaohongshuLinkModal
        data={viewingXiaohongshuLink}
        onClose={() => setViewingXiaohongshuLink(null)}
      />
    )}

    {/* 选择联系人弹窗（用于转发文档） */}
    {showSelectContact && forwardingDocument && (
      <SelectContactModal
        onClose={() => {
          setShowSelectContact(false);
          setForwardingDocument(null);
        }}
        onSelect={(conversationId) => {
          // 转发文档到选中的联系人
          const newMessage: Message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            role: 'user',
            content: `发送了文档「${forwardingDocument.title}」`,
            timestamp: Date.now(),
            document: {
              title: forwardingDocument.title,
              content: forwardingDocument.content,
              type: forwardingDocument.type,
              greeting: '转发',
              size: forwardingDocument.size
            }
          };
          
          // 获取目标对话
          const targetConversation = conversations.find(c => c.id === conversationId);
          if (targetConversation) {
            commitOutgoingUserMessageToConversation(targetConversation, newMessage);
            
            showToast(`文档已转发到「${targetConversation.characterSettings?.nickname || targetConversation.name}」`, 'success');
          }
          
          setShowSelectContact(false);
          setForwardingDocument(null);
        }}
        conversations={conversations}
        currentConversationId={conversation.id}
      />
    )}

    {/* 聊天记录搜索模态框 */}
    {showSearchModal && (
      <ChatSearchModal
        conversation={conversation}
        onClose={() => setShowSearchModal(false)}
        onMessageClick={(messageId) => {
          console.log(`🔍 点击搜索结果，准备跳转到消息: ${messageId}`);
          
          // 先关闭搜索模态框
          setShowSearchModal(false);
          
          // 找到目标消息在完整消息列表中的位置
          const messageIndex = conversation.messages.findIndex(msg => msg.id === messageId);
          if (messageIndex === -1) {
            console.warn(`未找到目标消息: ${messageId}`);
            return;
          }
          
          console.log(`📍 目标消息索引: ${messageIndex}/${conversation.messages.length}`);
          
          // 🎯 智能消息窗口定位：只显示目标消息及其上下文
          const totalMessages = conversation.messages.length;
          const contextSize = 100; // 上下文窗口大小（目标消息前后各50条）
          
          console.log(`🎯 使用消息窗口策略：目标消息索引 ${messageIndex}，上下文窗口 ${contextSize} 条`);
          
          // 计算窗口位置：以目标消息为中心
          const halfContext = Math.floor(contextSize / 2);
          let windowStartIndex = Math.max(0, messageIndex - halfContext);
          let windowSize = Math.min(contextSize, totalMessages - windowStartIndex);
          
          // 如果窗口太小（接近末尾），调整起始位置
          if (windowSize < contextSize && windowStartIndex > 0) {
            windowStartIndex = Math.max(0, totalMessages - contextSize);
            windowSize = totalMessages - windowStartIndex;
          }
          
          console.log(`📊 消息窗口：从索引 ${windowStartIndex} 开始，显示 ${windowSize} 条消息`);
          console.log(`💡 资源节约：原本需要显示 ${totalMessages} 条，现在只显示 ${windowSize} 条`);
          
          // 更新消息窗口
          setMessageWindow({
            startIndex: windowStartIndex,
            size: windowSize
          });
          
          // 等待DOM更新后进行滚动和高亮
          setTimeout(() => {
            const messageElement = document.getElementById(`message-${messageId}`);
            if (messageElement) {
              console.log('✅ 找到消息元素，开始滚动和高亮');
              
              // 滚动到指定消息（居中显示）
              messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              
              // 高亮显示该消息
              setTimeout(() => {
                messageElement.style.backgroundColor = '#fef3c7'; // 黄色背景
                messageElement.style.transition = 'background-color 0.3s';
                
                // 2秒后移除高亮
                setTimeout(() => {
                  messageElement.style.backgroundColor = '';
                }, 2000);
              }, 300);
              
              // 标记用户不在底部（因为跳转到了历史消息）
              setShouldScrollToBottom(false);
              setIsUserScrolling(true);
              
              console.log('🎯 搜索跳转完成');
            } else {
              console.warn(`❌ 消息加载后仍未找到DOM元素: message-${messageId}`);
            }
          }, 200); // 增加等待时间确保DOM更新
        }}
      />
    )}

    {/* 💬 子聊天管理器 */}
    {showSubChatManager && (
      <SubChatManager
        subChats={conversation.subChats || []}
        onClose={() => setShowSubChatManager(false)}
        onSelectSubChat={handleSelectSubChat}
        onCreateSubChat={handleCreateUserSubChat}
        onRenameSubChat={handleRenameSubChat}
        onDeleteSubChat={handleDeleteSubChat}
        onImportSubChat={handleImportSubChat}
      />
    )}

    {/* 🤖 AI子聊天建议弹窗 */}
    {showSubChatSuggestionModal && subChatSuggestion && (
      <SubChatSuggestionModal
        suggestion={subChatSuggestion}
        onAccept={handleAcceptSubChatSuggestion}
        onReject={handleRejectSubChatSuggestion}
        characterName={conversation.characterSettings?.nickname || conversation.name}
      />
    )}

    {/* 💬 子聊天窗口 */}
    {activeSubChatId && (
      (() => {
        const subChat = (conversation.subChats || []).find(
          sc => sc.id === activeSubChatId
        );
        
        if (!subChat) return null;
        
        return (
          <SubChatWindow
            subChat={subChat}
            conversation={conversation}
            apiConfig={apiConfig}
            onClose={() => handleCloseSubChat(activeSubChatId)}
            onMinimize={() => handleToggleMinimizeSubChat(activeSubChatId)}
            onSendMessage={handleSendSubChatMessage}
            onUpdateSubChat={(subChatId, updates) => {
              const updatedConversation = updateSubChatInConversation(
                conversation,
                subChatId,
                updates
              );
              onUpdateConversation(conversation.id, {
                subChats: updatedConversation.subChats,
              });
            }}
            isMinimized={minimizedSubChats.has(activeSubChatId)}
            conversations={conversations}
            onUpdateConversation={onUpdateConversation}
            currentUserProfile={currentUserProfile}
          />
        );
      })()
    )}

    {/* 💬 最小化的子聊天列表 */}
    {conversation.subChats?.map((subChat) => {
      if (
        !minimizedSubChats.has(subChat.id) ||
        activeSubChatId !== subChat.id
      )
        return null;
      
      return (
        <SubChatWindow
          key={subChat.id}
          subChat={subChat}
          conversation={conversation}
          apiConfig={apiConfig}
          onClose={() => handleCloseSubChat(subChat.id)}
          onMinimize={() => handleToggleMinimizeSubChat(subChat.id)}
          onSendMessage={handleSendSubChatMessage}
          onUpdateSubChat={(subChatId, updates) => {
            const updatedConversation = updateSubChatInConversation(
              conversation,
              subChatId,
              updates
            );
            onUpdateConversation(conversation.id, {
              subChats: updatedConversation.subChats,
            });
          }}
          isMinimized={true}
        />
      );
    })}

    {/* 📤 消息多选工具栏 */}
    {isMultiSelectMode && (
      <MessageSelectionToolbar
        selectedCount={selectedMessages.length}
        onCancel={handleCancelMultiSelect}
        onExtractDocument={handleExtractToDocument}
        onForward={handleForwardMessages}
        onDelete={handleBatchDelete}
      />
    )}

    {/* 📤 转发目标选择器 */}
    {showForwardSelector && conversations && (
      <ForwardTargetSelector
        conversations={conversations}
        onConfirm={handleConfirmForward}
        onCancel={() => {
          setShowForwardSelector(false);
          setForwardingMessages([]);
        }}
        defaultMerge={forwardingMessages.length > 1}
      />
    )}

    {/* 📤 合并转发查看器 */}
    {viewingMergedForward && (
      <MergedForwardViewer
        forwardedMessage={viewingMergedForward}
        onClose={() => setViewingMergedForward(null)}
      />
    )}

    {/* 📄 聊天记录提取预览 */}
    {showExtractPreview && extractingMessages.length > 0 && (
      <ChatExtractPreview
        messages={extractingMessages}
        conversationName={conversation.characterSettings?.nickname || conversation.name}
        userName={currentUserProfile?.username || '我'}
        onSave={handleSaveExtractedDocument}
        onCancel={() => {
          setShowExtractPreview(false);
          setExtractingMessages([]);
        }}
      />
    )}

    {/* 🎵 音乐分享弹窗 */}
    <MusicShareModal
      isOpen={showMusicShareModal}
      onClose={() => setShowMusicShareModal(false)}
      onShareMusic={handleMusicShare}
      characterName={conversation.characterSettings?.nickname || conversation.name}
    />

    {/* 🎵 真实音乐搜索弹窗 */}
    <RealMusicSearchModal
      isOpen={showRealMusicModal}
      onClose={() => setShowRealMusicModal(false)}
      onSelectMusic={handleRealMusicShare}
      characterName={conversation.characterSettings?.nickname || conversation.name}
    />

    {/* 🎵 音乐播放状态显示 */}
    {currentMusic && musicPlaybackState && (
      <div className="fixed top-20 left-4 right-4 z-40">
        <MusicPlayingWidget
          musicInfo={currentMusic}
          playbackState={musicPlaybackState}
          characterName={conversation.characterSettings?.nickname || conversation.name}
          onStop={() => {
            aiListeningSimulator.stopListening();
            setCurrentMusic(null);
            setMusicPlaybackState(null);
          }}
        />
      </div>
    )}

    {/* 👥 群聊设置弹窗 */}
    {showGroupSettings && conversation.type === 'group' && (
      <GroupChatSettingsModal
        conversation={conversation}
        conversations={conversations}
        onClose={() => setShowGroupSettings(false)}
        onUpdateConversation={onUpdateConversation}
        onDeleteConversation={(conversationId) => {
          // 先关闭设置弹窗
          setShowGroupSettings(false);
          // 删除群聊（通过向上传递，由App.tsx的deleteConversation处理）
          if (onDeleteConversation) {
            onDeleteConversation(conversationId);
          }
          // 返回社交页面
          onBack();
        }}
      />
    )}

    {/* 📚 世界书挂载设置弹窗 */}
    {showWorldbookMount && (
      <WorldbookMountSettings
        currentConfig={conversation.worldbookMount}
        onSave={(config: WorldbookMountConfig) => {
          onUpdateConversation(conversation.id, {
            worldbookMount: config
          });
          setShowWorldbookMount(false);
        }}
        onClose={() => setShowWorldbookMount(false)}
      />
    )}

    {/* 头像操作菜单弹窗 */}
    {avatarMenuOpen && (
      <div 
        className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center"
        onClick={() => setAvatarMenuOpen(null)}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl overflow-hidden w-72 animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头像和昵称 */}
          <div className="flex flex-col items-center py-6 bg-gradient-to-b from-blue-50 to-white">
            {avatarMenuOpen.avatar ? (
              <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-lg mb-3">
                <img src={avatarMenuOpen.avatar} alt={avatarMenuOpen.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center border-4 border-white shadow-lg mb-3">
                <span className="text-white font-bold text-2xl">{avatarMenuOpen.name.charAt(0)}</span>
              </div>
            )}
            <div className="text-lg font-semibold text-gray-800">{avatarMenuOpen.name}</div>
          </div>

          {/* 操作选项 */}
          <div className="divide-y divide-gray-100">
            <button
              onClick={() => handleSendMessageAction(avatarMenuOpen.name)}
              className="w-full py-4 px-6 text-left hover:bg-blue-50 transition-colors flex items-center gap-3"
            >
              <MessageCircle className="w-5 h-5 text-blue-500" />
              <span className="text-gray-700 font-medium">发消息</span>
            </button>
            
            <button
              onClick={() => handlePatAction(avatarMenuOpen.messageId, avatarMenuOpen.name)}
              className="w-full py-4 px-6 text-left hover:bg-purple-50 transition-colors flex items-center gap-3"
            >
              <span className="text-2xl">👋</span>
              <span className="text-gray-700 font-medium">拍一拍</span>
            </button>
            
            <button
              onClick={() => handleAtAction(avatarMenuOpen.name)}
              className="w-full py-4 px-6 text-left hover:bg-green-50 transition-colors flex items-center gap-3"
            >
              <span className="text-xl font-bold text-green-600">@</span>
              <span className="text-gray-700 font-medium">@对方</span>
            </button>
          </div>
        </div>
      </div>
    )}

    {/* 表情包类型选择菜单 */}
    {showStickerTypeMenu && (
      <>
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setShowStickerTypeMenu(false)}
        />
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl z-50 w-[90%] max-w-sm overflow-hidden animate-slide-up">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 text-center">选择表情包类型</h3>
          </div>
          <div className="divide-y divide-gray-100">
            <button
              onClick={() => {
                setShowStickerTypeMenu(false);
                setShowUserStickerPicker(true);
              }}
              className="w-full px-4 py-4 hover:bg-gray-50 transition-colors flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Smile className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-gray-900">真实表情包</div>
                <div className="text-xs text-gray-500 mt-0.5">从表情包库中选择已上传的表情包</div>
              </div>
            </button>
            <button
              onClick={() => {
                setShowStickerTypeMenu(false);
                setShowStickerModal(true);
              }}
              className="w-full px-4 py-4 hover:bg-gray-50 transition-colors flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-gray-900">文字描述表情包</div>
                <div className="text-xs text-gray-500 mt-0.5">输入表情包的文字描述</div>
              </div>
            </button>
          </div>
        </div>
      </>
    )}

    {/* 用户表情包选择器 */}
    {showUserStickerPicker && (
      <UserStickerPicker
        onClose={() => setShowUserStickerPicker(false)}
        onSelectSticker={handleSelectSticker}
      />
    )}
    </>
  );
}
