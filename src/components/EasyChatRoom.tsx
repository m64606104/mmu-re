import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, MoreHorizontal, Plus, Image as ImageIcon, Video, Mic, Play, Pause, Smile, Radio, Phone, PhoneOff } from 'lucide-react';
import { EasyChatConversation, EasyChatContact, EasyChatMessage, EasyChatUser, LivestreamData, GroupCallData, GlobalCallState, ChatStyle } from '../types';
import { VoiceMessageDialog } from './VoiceMessageDialog';
import { MessageActionDialog } from './MessageActionDialog';
import { EmojiPackDialog } from './EmojiPackDialog';
import { LivestreamDialog } from './LivestreamDialog';
import { GroupCallDialog } from './GroupCallDialog';
import { toast } from 'sonner';
import { getBubbleColorTheme } from '../utils/bubbleColors';
import { compressImage } from '../utils/imageCompression';

interface EasyChatRoomProps {
  conversation: EasyChatConversation;
  contacts: EasyChatContact[];
  user: EasyChatUser;
  onBack: () => void;
  onUpdateConversation: (conversation: EasyChatConversation) => void;
  onOpenSettings: () => void;
  onStartGlobalCall?: (callState: GlobalCallState) => void;
  chatStyle?: ChatStyle;
}

export function EasyChatRoom({ conversation, contacts, user, onBack, onUpdateConversation, onOpenSettings, onStartGlobalCall, chatStyle = 'default' }: EasyChatRoomProps) {
  const [message, setMessage] = useState('');
  const [currentSenderId, setCurrentSenderId] = useState<string>(user.id);
  const [showSenderPicker, setShowSenderPicker] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [showVoiceDialog, setShowVoiceDialog] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [showMessageActionDialog, setShowMessageActionDialog] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<EasyChatMessage | null>(null);
  const [selectedLivestream, setSelectedLivestream] = useState<LivestreamData | null>(null);
  const [selectedGroupCall, setSelectedGroupCall] = useState<GroupCallData | null>(null);
  const [showEmojiPack, setShowEmojiPack] = useState(false);
  const [activeLivestream, setActiveLivestream] = useState<LivestreamData | null>(null);
  const [activeGroupCall, setActiveGroupCall] = useState<GroupCallData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages]);

  // 获取联系人信息
  const getContact = (id: string) => {
    if (id === user.id) {
      return user;
    }
    return contacts.find(c => c.id === id);
  };

  // 获取所有可选的发送者
  const getAllSenders = () => {
    const senders = [user];
    conversation.participants.forEach(participantId => {
      const contact = contacts.find(c => c.id === participantId);
      if (contact) {
        senders.push(contact);
      }
    });
    return senders;
  };

  // 获取当前发送者信息
  const currentSender = getContact(currentSenderId);

  // 切换角色
  const handleToggleSender = () => {
    if (conversation.type === 'private') {
      setCurrentSenderId(currentSenderId === user.id ? conversation.participants[0] : user.id);
    } else {
      setShowSenderPicker(true);
    }
  };

  // 选择发送者
  const handleSelectSender = (senderId: string) => {
    setCurrentSenderId(senderId);
    setShowSenderPicker(false);
  };

  // 判断是否需要显示时间（参考微信：相隔5分钟以上显示时间）
  const shouldShowTime = (currentIndex: number): boolean => {
    if (currentIndex === 0) return true;
    
    const currentMsg = conversation.messages[currentIndex];
    const prevMsg = conversation.messages[currentIndex - 1];
    
    // 解析时间字符串 HH:MM 为分钟数
    const parseTime = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const currentTime = parseTime(currentMsg.timestamp);
    const prevTime = parseTime(prevMsg.timestamp);
    
    // 相隔5分钟以上显示时间
    return Math.abs(currentTime - prevTime) >= 5;
  };

  // 发送消息
  const handleSendMessage = (messageType: 'text' | 'image' | 'video' | 'voice' | 'livestream' | 'groupcall' = 'text', extraData?: any) => {
    const sender = getContact(currentSenderId);
    if (!sender) return;

    if (messageType === 'text' && !message.trim()) return;

    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newMessage: EasyChatMessage = {
      id: Date.now().toString(),
      text: messageType === 'text' ? message : '',
      senderId: currentSenderId,
      senderName: sender.name,
      senderAvatar: sender.avatar,
      timestamp: timeString,
      type: messageType,
      ...extraData
    };

    const updatedConversation = {
      ...conversation,
      messages: [...conversation.messages, newMessage],
      lastMessage: messageType === 'text' ? message : messageType === 'voice' ? '[语音]' : messageType === 'image' ? '[图片]' : messageType === 'video' ? '[视频]' : messageType === 'livestream' ? '[直播]' : '[群组通话]',
      lastMessageTime: timeString
    };

    onUpdateConversation(updatedConversation);
    if (messageType === 'text') {
      setMessage('');
      
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  // 处理图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过10MB');
      return;
    }

    try {
      toast.loading('正在压缩图片...');
      const result = await compressImage(file, 1200, 1200, 0.8);
      const compressedBase64 = result.dataUrl;
      
      toast.dismiss();
      handleSendMessage('image', { imageUrl: compressedBase64 });
      toast.success('图片已发送');
    } catch (error) {
      console.error('图片压缩失败:', error);
      toast.dismiss();
      toast.error('图片处理失败，请重试');
    }
    
    e.target.value = '';
    setShowMediaMenu(false);
  };

  // 处理视频上传
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('请上传视频文件');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('视频大小不能超过20MB');
      return;
    }

    try {
      toast.loading('正在上传视频...');
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        toast.dismiss();
        handleSendMessage('video', { videoUrl: base64String });
        toast.success('视频已发送');
      };
      reader.onerror = () => {
        toast.dismiss();
        toast.error('视频读取失败');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('视频上传失败:', error);
      toast.dismiss();
      toast.error('视频上传失败，请重试');
    }
    
    e.target.value = '';
    setShowMediaMenu(false);
  };

  // 发送语音消息
  const handleSendVoice = (voiceText: string, duration: number) => {
    handleSendMessage('voice', { voiceText, voiceDuration: duration });
    toast.success('语音已发送');
  };

  // 发送表情包
  const handleSendEmojiPack = (description: string) => {
    const sender = getContact(currentSenderId);
    if (!sender) return;

    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newMessage: EasyChatMessage = {
      id: Date.now().toString(),
      text: '',
      senderId: currentSenderId,
      senderName: sender.name,
      senderAvatar: sender.avatar,
      timestamp: timeString,
      type: 'emojipack',
      emojipackDescription: description
    };

    const updatedConversation = {
      ...conversation,
      messages: [...conversation.messages, newMessage],
      lastMessage: '[表情]',
      lastMessageTime: timeString
    };

    onUpdateConversation(updatedConversation);
    toast.success('表情包已发送');
  };

  // 播放/暂停语音
  const handleVoicePlayback = (messageId: string) => {
    if (playingVoice === messageId) {
      setPlayingVoice(null);
    } else {
      setPlayingVoice(messageId);
      setTimeout(() => {
        setPlayingVoice(null);
      }, 3000);
    }
  };

  // 按Enter发送
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 格式化日期
  const formatDate = (timestamp: string) => {
    const now = new Date();
    const today = `${now.getMonth() + 1}月${now.getDate()}日`;
    return today;
  };

  // 长按消息显示操作菜单
  const handleLongPressMessage = (msg: EasyChatMessage) => {
    setSelectedMessage(msg);
    setShowMessageActionDialog(true);
  };

  // 编辑消息
  const handleEditMessage = (messageId: string, newText: string) => {
    const updatedMessages = conversation.messages.map(msg =>
      msg.id === messageId ? { ...msg, text: newText } : msg
    );
    onUpdateConversation({ ...conversation, messages: updatedMessages });
  };

  // 删除消息
  const handleDeleteMessage = (messageId: string) => {
    const updatedMessages = conversation.messages.filter(msg => msg.id !== messageId);
    onUpdateConversation({ ...conversation, messages: updatedMessages });
  };

  // 修改消息时间
  const handleEditMessageTime = (messageId: string, newTime: string) => {
    const updatedMessages = conversation.messages.map(msg =>
      msg.id === messageId ? { ...msg, timestamp: newTime } : msg
    );
    
    // 按时间排序消息（HH:MM格式）
    const sortedMessages = updatedMessages.sort((a, b) => {
      const [aHour, aMin] = a.timestamp.split(':').map(Number);
      const [bHour, bMin] = b.timestamp.split(':').map(Number);
      const aTime = aHour * 60 + aMin;
      const bTime = bHour * 60 + bMin;
      return aTime - bTime;
    });
    
    onUpdateConversation({ ...conversation, messages: sortedMessages });
  };

  // 开始群直播
  const handleStartLivestream = () => {
    if (conversation.type !== 'group') return;

    const sender = getContact(currentSenderId);
    if (!sender) return;

    // 检查当前用户是否已经在直播
    if (activeLivestream && activeLivestream.hostId === currentSenderId) {
      // 关闭直播
      const updatedMessages = conversation.messages.map(msg => {
        if (msg.type === 'livestream' && msg.livestreamData?.id === activeLivestream.id) {
          return {
            ...msg,
            livestreamData: {
              ...msg.livestreamData,
              isActive: false
            }
          };
        }
        return msg;
      });
      onUpdateConversation({ ...conversation, messages: updatedMessages });
      setActiveLivestream(null);
      toast.success('直播已结束');
      return;
    }

    // 开启直播
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const livestreamData: LivestreamData = {
      id: Date.now().toString(),
      hostId: currentSenderId,
      hostName: sender.name,
      title: `${sender.name}的直播`,
      startTime: timeString,
      isActive: true,
      viewers: [],
      coHosts: []
    };

    setActiveLivestream(livestreamData);
    handleSendMessage('livestream', { livestreamData });
    toast.success(`${sender.name} 开启了群直播`);
  };

  // 开始群组通话
  const handleStartGroupCall = (type: 'voice' | 'video') => {
    if (conversation.type !== 'group') return;

    const sender = getContact(currentSenderId);
    if (!sender) return;

    // 检查当前用户是否已经在通话中（并且是同一类型）
    if (activeGroupCall && activeGroupCall.type === type && activeGroupCall.participants.includes(currentSenderId)) {
      // 结束通话
      const updatedMessages = conversation.messages.map(msg => {
        if (msg.type === 'groupcall' && msg.groupcallData?.id === activeGroupCall.id) {
          return {
            ...msg,
            groupcallData: {
              ...msg.groupcallData,
              isActive: false
            }
          };
        }
        return msg;
      });
      onUpdateConversation({ ...conversation, messages: updatedMessages });
      setActiveGroupCall(null);
      toast.success('通话已结束');
      return;
    }

    // 发起新通话
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const groupCallData: GroupCallData = {
      id: Date.now().toString(),
      type,
      initiatorId: currentSenderId,
      initiatorName: sender.name,
      startTime: timeString,
      isActive: true,
      participants: [currentSenderId]
    };

    setActiveGroupCall(groupCallData);
    handleSendMessage('groupcall', { groupcallData: groupCallData });
    toast.success(`${sender.name} 发起了群${type === 'video' ? '视频' : '语音'}通话`);
  };

  // 判断当前用户是否正在直播
  const isCurrentUserLivestreaming = () => {
    return activeLivestream !== null && activeLivestream.hostId === currentSenderId;
  };

  // 判断当前用户是否正在通话中（指定类型）
  const isCurrentUserInCall = (type: 'voice' | 'video') => {
    return activeGroupCall !== null && 
           activeGroupCall.type === type && 
           activeGroupCall.participants.includes(currentSenderId);
  };

  // 加入直播（作为观众）
  const handleJoinLivestreamAsViewer = (livestream: LivestreamData) => {
    if (!livestream || livestream.viewers.includes(currentSenderId)) return;

    const updatedLivestream = {
      ...livestream,
      viewers: [...livestream.viewers, currentSenderId]
    };

    // 更新消息中的直播数据
    const updatedMessages = conversation.messages.map(msg => {
      if (msg.type === 'livestream' && msg.livestreamData?.id === livestream.id) {
        return {
          ...msg,
          livestreamData: updatedLivestream
        };
      }
      return msg;
    });

    onUpdateConversation({ ...conversation, messages: updatedMessages });
    toast.success('已进入观众席');
  };

  // 加入直播（一起直播）
  const handleJoinLivestreamAsCoHost = (livestream: LivestreamData) => {
    if (!livestream || livestream.coHosts.includes(currentSenderId)) return;

    const updatedLivestream = {
      ...livestream,
      coHosts: [...livestream.coHosts, currentSenderId]
    };

    // 更新消息中的直播数据
    const updatedMessages = conversation.messages.map(msg => {
      if (msg.type === 'livestream' && msg.livestreamData?.id === livestream.id) {
        return {
          ...msg,
          livestreamData: updatedLivestream
        };
      }
      return msg;
    });

    onUpdateConversation({ ...conversation, messages: updatedMessages });
    toast.success('已加入一起直播');
  };

  // 加入群通话
  const handleJoinGroupCall = (groupCall: GroupCallData) => {
    if (!groupCall || groupCall.participants.includes(currentSenderId)) return;

    const updatedGroupCall = {
      ...groupCall,
      participants: [...groupCall.participants, currentSenderId]
    };

    // 更新消息中的群通话数据
    const updatedMessages = conversation.messages.map(msg => {
      if (msg.type === 'groupcall' && msg.groupcallData?.id === groupCall.id) {
        return {
          ...msg,
          groupcallData: updatedGroupCall
        };
      }
      return msg;
    });

    onUpdateConversation({ ...conversation, messages: updatedMessages });
    toast.success('已加入通话');
  };

  // 结束群通话
  const handleEndGroupCall = (groupCall: GroupCallData) => {
    const updatedMessages = conversation.messages.map(msg => {
      if (msg.type === 'groupcall' && msg.groupcallData?.id === groupCall.id) {
        return {
          ...msg,
          groupcallData: {
            ...msg.groupcallData,
            isActive: false
          }
        };
      }
      return msg;
    });
    onUpdateConversation({ ...conversation, messages: updatedMessages });
    setActiveGroupCall(null);
    setSelectedGroupCall(null);
    toast.success('通话已结束');
  };

  // 结束直播
  const handleEndLivestream = (livestream: LivestreamData) => {
    const updatedMessages = conversation.messages.map(msg => {
      if (msg.type === 'livestream' && msg.livestreamData?.id === livestream.id) {
        return {
          ...msg,
          livestreamData: {
            ...msg.livestreamData,
            isActive: false
          }
        };
      }
      return msg;
    });
    onUpdateConversation({ ...conversation, messages: updatedMessages });
    setActiveLivestream(null);
    setSelectedLivestream(null);
    toast.success('直播已结束');
  };

  // 私聊通话功能
  const handleStartPrivateCall = (type: 'voice' | 'video') => {
    if (conversation.type !== 'private') return;

    const sender = getContact(currentSenderId);
    if (!sender) return;

    // 发送通话消息气泡
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newMessage: EasyChatMessage = {
      id: Date.now().toString(),
      text: '',
      senderId: currentSenderId,
      senderName: sender.name,
      senderAvatar: sender.avatar,
      timestamp: timeString,
      type: 'privatecall',
      privatecallData: {
        type,
        duration: 0,
        isActive: true
      }
    };

    const updatedConversation = {
      ...conversation,
      messages: [...conversation.messages, newMessage],
      lastMessage: type === 'video' ? '[视频通话]' : '[语音通话]',
      lastMessageTime: timeString
    };

    onUpdateConversation(updatedConversation);
    
    // 使用全局通话状态
    if (onStartGlobalCall) {
      onStartGlobalCall({
        type: 'private',
        callType: type,
        conversationId: conversation.id,
        contactName: getContact(conversation.participants[0])?.name || '',
        contactAvatar: getContact(conversation.participants[0])?.avatar || '',
        isMinimized: false,
        privateCallData: {
          contactId: conversation.participants[0]
        }
      });
    }
  };

  // 根据风格获取样式配置
  const getChatStyleConfig = () => {
    switch (chatStyle) {
      case 'qq':
        return {
          containerBg: 'bg-[#2c2c2c]',
          headerBg: 'bg-[#2a2a2a]',
          headerText: 'text-white',
          headerIcon: 'text-gray-300',
          myBubbleBg: 'bg-[#95ec69]',
          myBubbleText: 'text-black',
          otherBubbleBg: 'bg-white',
          otherBubbleText: 'text-black',
          inputBg: 'bg-[#3a3a3a]',
          inputText: 'text-white',
          inputPlaceholder: 'placeholder-gray-400',
          showNickname: true
        };
      case 'wechat':
        return {
          containerBg: 'bg-[#ededed]',
          headerBg: 'bg-[#ededed]',
          headerText: 'text-black',
          headerIcon: 'text-gray-700',
          myBubbleBg: 'bg-[#95ec69]',
          myBubbleText: 'text-black',
          otherBubbleBg: 'bg-white',
          otherBubbleText: 'text-black',
          inputBg: 'bg-white',
          inputText: 'text-black',
          inputPlaceholder: 'placeholder-gray-400',
          showNickname: false
        };
      default:
        return {
          containerBg: 'bg-[#f5f5f5]',
          headerBg: 'bg-white/80',
          headerText: 'text-gray-900',
          headerIcon: 'text-gray-700',
          myBubbleBg: getBubbleColorTheme(user.bubbleColor || 'blue').bgClass,
          myBubbleText: 'text-white',
          otherBubbleBg: 'bg-white',
          otherBubbleText: 'text-gray-900',
          inputBg: 'bg-white',
          inputText: 'text-gray-900',
          inputPlaceholder: 'placeholder-gray-400',
          showNickname: false
        };
    }
  };

  const chatStyleConfig = getChatStyleConfig();

  return (
    <div className={`w-full h-full ${chatStyleConfig.containerBg} flex flex-col`}>
      {/* 顶部导航栏 */}
      <div className={`flex items-center justify-between h-20 px-4 ${chatStyleConfig.headerBg} ${chatStyle === 'default' ? 'backdrop-blur-xl' : ''} border-b ${chatStyle === 'qq' ? 'border-[#3a3a3a]' : 'border-gray-100'} flex-shrink-0`}>
        <button
          onClick={onBack}
          className="p-2 -ml-2 active:opacity-60 transition-opacity"
        >
          <ArrowLeft className={`w-6 h-6 ${chatStyleConfig.headerIcon}`} strokeWidth={2.5} />
        </button>
        <h1 className={`tracking-tight ${chatStyleConfig.headerText}`}>{conversation.name}</h1>
        <button 
          onClick={onOpenSettings}
          className="p-2 -mr-2 active:opacity-60 transition-opacity"
        >
          <MoreHorizontal className={`w-6 h-6 ${chatStyleConfig.headerIcon}`} />
        </button>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {conversation.messages.length === 0 ? (
          <div className="flex flex-col h-full">
            <div className="flex justify-center pt-4">
              <span className="text-xs text-gray-400 bg-gray-200/60 px-3 py-1 rounded-md">
                {formatDate(new Date().toTimeString())}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {conversation.messages.map((msg, index) => {
              const sender = getContact(msg.senderId);
              if (!sender) return null;

              const isMe = msg.senderId === user.id;
              const isGroupChat = conversation.type === 'group';
              const showTime = shouldShowTime(index);

              return (
                <div key={msg.id}>
                  {/* 时间分隔 */}
                  {showTime && (
                    <div className="flex justify-center mb-3">
                      <span className="text-xs text-gray-400 bg-gray-200/60 px-3 py-1 rounded-md">
                        {msg.timestamp}
                      </span>
                    </div>
                  )}

                  {isMe ? (
                    // 我发的消息 - 右侧蓝色气泡 + 头像
                    <div className="flex justify-end items-start gap-2">
                      <div 
                        className="flex flex-col items-end max-w-[75%]"
                        onClick={() => handleLongPressMessage(msg)}
                      >
                        {msg.type === 'voice' ? (
                          <div className="bg-[#1e90ff] rounded-lg rounded-tr-sm px-3 py-2.5 shadow-sm">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVoicePlayback(msg.id);
                              }}
                              className="flex items-center gap-2"
                            >
                              {playingVoice === msg.id ? (
                                <Pause className="w-5 h-5 text-white" />
                              ) : (
                                <Play className="w-5 h-5 text-white" />
                              )}
                              <span className="text-white text-sm">{msg.voiceDuration}"</span>
                            </button>
                            {msg.voiceText && (
                              <p className="text-white text-xs mt-1 opacity-80">
                                {msg.voiceText}
                              </p>
                            )}
                          </div>
                        ) : msg.type === 'image' ? (
                          <div className="rounded-lg rounded-tr-sm overflow-hidden shadow-sm max-w-[200px]">
                            <img src={msg.imageUrl} alt="图片" className="w-full h-auto" />
                          </div>
                        ) : msg.type === 'video' ? (
                          <div className="bg-black rounded-lg rounded-tr-sm overflow-hidden shadow-sm max-w-[200px]">
                            <video src={msg.videoUrl} controls className="w-full h-auto" />
                          </div>
                        ) : msg.type === 'emojipack' ? (
                          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-3 shadow-sm border border-yellow-100">
                            <div className="w-28 h-28 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center p-3">
                              <p className="text-gray-700 text-xs text-center leading-tight break-words">
                                {msg.emojipackDescription}
                              </p>
                            </div>
                          </div>
                        ) : msg.type === 'livestream' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (msg.livestreamData && msg.livestreamData.isActive && onStartGlobalCall) {
                                // 如果直播正在进行，启动全局通话状态
                                onStartGlobalCall({
                                  type: 'livestream',
                                  callType: 'video', // 直播默认是视频
                                  conversationId: conversation.id,
                                  contactName: conversation.name,
                                  contactAvatar: conversation.avatar,
                                  isMinimized: false,
                                  groupData: {
                                    data: msg.livestreamData,
                                    currentUserId: currentSenderId,
                                    participantIds: msg.livestreamData?.viewers || []
                                  }
                                });
                              }
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              handleLongPressMessage(msg);
                            }}
                            className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-4 shadow-sm border border-red-100 hover:shadow-md transition-all w-64"
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                                <Radio className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1 text-left">
                                <p className="text-sm mb-0.5">{msg.livestreamData?.title || '群直播'}</p>
                                <p className="text-xs text-gray-500">{msg.livestreamData?.hostName} 开启了直播</p>
                              </div>
                            </div>
                            {msg.livestreamData?.isActive ? (
                              <div className="flex items-center justify-between text-xs text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Radio className="w-3 h-3 text-red-500 animate-pulse" />
                                  <span className="text-red-500">正在直播</span>
                                </span>
                                <span>{msg.livestreamData.viewers.length + msg.livestreamData.coHosts.length + 1} 人观看</span>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500">
                                已结束
                              </div>
                            )}
                          </button>
                        ) : msg.type === 'groupcall' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (msg.groupcallData && msg.groupcallData.isActive && onStartGlobalCall) {
                                // 如果通话正在进行，启动全局通话状态
                                onStartGlobalCall({
                                  type: 'group',
                                  callType: msg.groupcallData.type,
                                  conversationId: conversation.id,
                                  contactName: conversation.name,
                                  contactAvatar: conversation.avatar,
                                  isMinimized: false,
                                  groupData: {
                                    data: msg.groupcallData,
                                    currentUserId: currentSenderId,
                                    participantIds: msg.groupcallData?.participants || []
                                  }
                                });
                              }
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              handleLongPressMessage(msg);
                            }}
                            className={`rounded-2xl p-4 shadow-sm border hover:shadow-md transition-all w-64 ${
                              msg.groupcallData?.type === 'video'
                                ? 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100'
                                : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100'
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                msg.groupcallData?.type === 'video'
                                  ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                                  : 'bg-gradient-to-br from-green-500 to-emerald-500'
                              }`}>
                                {msg.groupcallData?.type === 'video' ? (
                                  <Video className="w-6 h-6 text-white" />
                                ) : (
                                  <Phone className="w-6 h-6 text-white" />
                                )}
                              </div>
                              <div className="flex-1 text-left">
                                <p className="text-sm mb-0.5">
                                  {msg.groupcallData?.type === 'video' ? '群视频通话' : '群语音通话'}
                                </p>
                                <p className="text-xs text-gray-500">{msg.groupcallData?.initiatorName} 发起</p>
                              </div>
                            </div>
                            {msg.groupcallData?.isActive ? (
                              <div className="text-xs text-gray-600">
                                {msg.groupcallData.participants.length} 人参与
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500">
                                已结束
                              </div>
                            )}
                          </button>
                        ) : msg.type === 'privatecall' ? (
                          <button 
                            className={`rounded-2xl p-4 shadow-sm border w-64 hover:shadow-md transition-all ${
                              msg.privatecallData?.type === 'video'
                                ? 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100'
                                : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (msg.privatecallData && msg.privatecallData.isActive && onStartGlobalCall) {
                                // 如果通话正在进行，启动全局通话
                                onStartGlobalCall({
                                  type: 'private',
                                  callType: msg.privatecallData.type,
                                  conversationId: conversation.id,
                                  contactName: getContact(conversation.participants[0])?.name || '',
                                  contactAvatar: getContact(conversation.participants[0])?.avatar || '',
                                  isMinimized: false,
                                  privateCallData: {
                                    contactId: conversation.participants[0]
                                  }
                                });
                              }
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              handleLongPressMessage(msg);
                            }}
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                msg.privatecallData?.type === 'video'
                                  ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                                  : 'bg-gradient-to-br from-green-500 to-emerald-500'
                              }`}>
                                {msg.privatecallData?.type === 'video' ? (
                                  <Video className="w-6 h-6 text-white" />
                                ) : (
                                  <Phone className="w-6 h-6 text-white" />
                                )}
                              </div>
                              <div className="flex-1 text-left">
                                <p className="text-sm mb-0.5">
                                  {msg.privatecallData?.type === 'video' ? '视频通话' : '语音通话'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {msg.privatecallData?.isActive ? '通话中...' : '已结束'}
                                </p>
                              </div>
                            </div>
                          </button>
                        ) : (
                          <div className={`${chatStyleConfig.myBubbleBg} rounded-lg rounded-tr-sm px-3 py-2.5 shadow-sm`}>
                            <p className={`${chatStyleConfig.myBubbleText} text-[15px] leading-relaxed whitespace-pre-wrap break-words`}>
                              {msg.text}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* 头像 */}
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {sender.avatar.startsWith('data:') ? (
                          <img src={sender.avatar} alt="头像" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl">{sender.avatar}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    // 对方发的消息 - 左侧白色气泡
                    <div className="flex items-start gap-2">
                      {/* 头像 */}
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {sender.avatar.startsWith('data:') ? (
                          <img src={sender.avatar} alt="头像" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl">{sender.avatar}</span>
                        )}
                      </div>

                      {/* 消息���容 */}
                      <div className="flex-1 min-w-0 max-w-[75%]">
                        {(isGroupChat || chatStyleConfig.showNickname) && (
                          <div className={`text-xs ${chatStyle === 'qq' ? 'text-gray-400' : 'text-gray-500'} mb-1`}>{sender.name}</div>
                        )}
                        
                        <div 
                          className="inline-block"
                          onClick={() => handleLongPressMessage(msg)}
                        >
                          {msg.type === 'voice' ? (
                            <div className={`${chatStyleConfig.otherBubbleBg} rounded-lg rounded-tl-sm px-3 py-2.5 shadow-sm`}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVoicePlayback(msg.id);
                                }}
                                className="flex items-center gap-2"
                              >
                                {playingVoice === msg.id ? (
                                  <Pause className={`w-5 h-5 ${chatStyle === 'qq' || chatStyle === 'wechat' ? 'text-gray-700' : 'text-gray-700'}`} />
                                ) : (
                                  <Play className={`w-5 h-5 ${chatStyle === 'qq' || chatStyle === 'wechat' ? 'text-gray-700' : 'text-gray-700'}`} />
                                )}
                                <span className={`${chatStyle === 'qq' || chatStyle === 'wechat' ? 'text-gray-700' : 'text-gray-700'} text-sm`}>{msg.voiceDuration}"</span>
                              </button>
                              {msg.voiceText && (
                                <p className="text-gray-600 text-xs mt-1">
                                  {msg.voiceText}
                                </p>
                              )}
                            </div>
                          ) : msg.type === 'image' ? (
                            <div className="rounded-lg rounded-tl-sm overflow-hidden shadow-sm max-w-[200px]">
                              <img src={msg.imageUrl} alt="图片" className="w-full h-auto" />
                            </div>
                          ) : msg.type === 'video' ? (
                            <div className="bg-black rounded-lg rounded-tl-sm overflow-hidden shadow-sm max-w-[200px]">
                              <video src={msg.videoUrl} controls className="w-full h-auto" />
                            </div>
                          ) : msg.type === 'emojipack' ? (
                            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-3 shadow-sm border border-yellow-100">
                              <div className="w-28 h-28 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center p-3">
                                <p className="text-gray-700 text-xs text-center leading-tight break-words">
                                  {msg.emojipackDescription}
                                </p>
                              </div>
                            </div>
                          ) : msg.type === 'livestream' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (msg.livestreamData && msg.livestreamData.isActive && onStartGlobalCall) {
                                  // 如果直播正在进行，启动全局通话状态
                                  onStartGlobalCall({
                                    type: 'livestream',
                                    callType: 'video',
                                    conversationId: conversation.id,
                                    contactName: conversation.name,
                                    contactAvatar: conversation.avatar,
                                    isMinimized: false,
                                    groupData: {
                                      data: msg.livestreamData,
                                      currentUserId: currentSenderId,
                                      participantIds: msg.livestreamData?.viewers || []
                                    }
                                  });
                                }
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                handleLongPressMessage(msg);
                              }}
                              className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-4 shadow-sm border border-red-100 hover:shadow-md transition-all w-64"
                            >
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                                  <Radio className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 text-left">
                                  <p className="text-sm mb-0.5">{msg.livestreamData?.title || '群直播'}</p>
                                  <p className="text-xs text-gray-500">{msg.livestreamData?.hostName} 开启了直播</p>
                                </div>
                              </div>
                              {msg.livestreamData?.isActive ? (
                                <div className="flex items-center justify-between text-xs text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <Radio className="w-3 h-3 text-red-500 animate-pulse" />
                                    <span className="text-red-500">正在直播</span>
                                  </span>
                                  <span>{msg.livestreamData.viewers.length + msg.livestreamData.coHosts.length + 1} 人观看</span>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500">
                                  已结束
                                </div>
                              )}
                            </button>
                          ) : msg.type === 'groupcall' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (msg.groupcallData && msg.groupcallData.isActive && onStartGlobalCall) {
                                  // 如果通话正在进行，启动全局通话状态
                                  onStartGlobalCall({
                                    type: 'group',
                                    callType: msg.groupcallData.type,
                                    conversationId: conversation.id,
                                    contactName: conversation.name,
                                    contactAvatar: conversation.avatar,
                                    isMinimized: false,
                                    groupData: {
                                      data: msg.groupcallData,
                                      currentUserId: currentSenderId,
                                      participantIds: msg.groupcallData?.participants || []
                                    }
                                  });
                                }
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                handleLongPressMessage(msg);
                              }}
                              className={`rounded-2xl p-4 shadow-sm border hover:shadow-md transition-all w-64 ${
                                msg.groupcallData?.type === 'video'
                                  ? 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100'
                                  : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100'
                              }`}
                            >
                              <div className="flex items-center gap-3 mb-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                  msg.groupcallData?.type === 'video'
                                    ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                                    : 'bg-gradient-to-br from-green-500 to-emerald-500'
                                }`}>
                                  {msg.groupcallData?.type === 'video' ? (
                                    <Video className="w-6 h-6 text-white" />
                                  ) : (
                                    <Phone className="w-6 h-6 text-white" />
                                  )}
                                </div>
                                <div className="flex-1 text-left">
                                  <p className="text-sm mb-0.5">
                                    {msg.groupcallData?.type === 'video' ? '群视频通话' : '群语音通话'}
                                  </p>
                                  <p className="text-xs text-gray-500">{msg.groupcallData?.initiatorName} 发起</p>
                                </div>
                              </div>
                              {msg.groupcallData?.isActive ? (
                                <div className="text-xs text-gray-600">
                                  {msg.groupcallData.participants.length} 人参与
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500">
                                  已结束
                                </div>
                              )}
                            </button>
                          ) : msg.type === 'privatecall' ? (
                            <button 
                              className={`rounded-2xl p-4 shadow-sm border w-64 hover:shadow-md transition-all ${
                                msg.privatecallData?.type === 'video'
                                  ? 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100'
                                  : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (msg.privatecallData && msg.privatecallData.isActive && onStartGlobalCall) {
                                  // 如果通话正在进行，启动全局通话
                                  onStartGlobalCall({
                                    type: 'private',
                                    callType: msg.privatecallData.type,
                                    conversationId: conversation.id,
                                    contactName: getContact(conversation.participants[0])?.name || '',
                                    contactAvatar: getContact(conversation.participants[0])?.avatar || '',
                                    isMinimized: false,
                                    privateCallData: {
                                      contactId: conversation.participants[0]
                                    }
                                  });
                                }
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                handleLongPressMessage(msg);
                              }}
                            >
                              <div className="flex items-center gap-3 mb-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                  msg.privatecallData?.type === 'video'
                                    ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                                    : 'bg-gradient-to-br from-green-500 to-emerald-500'
                                }`}>
                                  {msg.privatecallData?.type === 'video' ? (
                                    <Video className="w-6 h-6 text-white" />
                                  ) : (
                                    <Phone className="w-6 h-6 text-white" />
                                  )}
                                </div>
                                <div className="flex-1 text-left">
                                  <p className="text-sm mb-0.5">
                                    {msg.privatecallData?.type === 'video' ? '视频通话' : '语音通话'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {msg.privatecallData?.isActive ? '通话中...' : '已结束'}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ) : (
                            <div className={`${chatStyleConfig.otherBubbleBg} rounded-lg rounded-tl-sm px-3 py-2.5 shadow-sm`}>
                              <p className={`${chatStyleConfig.otherBubbleText} text-[15px] leading-relaxed whitespace-pre-wrap break-words`}>
                                {msg.text}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框区域 */}
      <div className="bg-white border-t border-gray-200 px-4 py-2.5 flex-shrink-0">
        <div className="flex items-center gap-2">{/* 改为 items-center 让按钮在一条线上 */}
          {/* 输入框容器 */}
          <div className="flex-1 flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* 圆形角色切换按钮 */}
            <button
              onClick={handleToggleSender}
              className="flex-shrink-0 w-7 h-7 ml-2 my-1.5 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden active:scale-95 transition-transform"
              title={`当前: ${currentSender?.name}`}
            >
              {currentSender?.avatar.startsWith('data:') ? (
                <img src={currentSender.avatar} alt="头像" className="w-full h-full object-cover" />
              ) : (
                <span className="text-base">{currentSender?.avatar}</span>
              )}
            </button>
            
            {/* 文本输入框 */}
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入消息..."
              className="flex-1 resize-none outline-none bg-transparent px-2 py-2 min-h-[36px] max-h-[120px] text-[15px]"
              rows={1}
              style={{
                height: 'auto',
                minHeight: '36px'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
              }}
            />

            {/* 语音按钮 - 在输入框内部最右边 */}
            <button
              onClick={() => setShowVoiceDialog(true)}
              className="flex-shrink-0 w-8 h-8 mr-2 my-1.5 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors active:scale-95"
              title="发送语音"
            >
              <Mic className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* 多媒体按钮 - 在输入框右边 */}
          <div className="relative">
            <button
              onClick={() => setShowMediaMenu(!showMediaMenu)}
              className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg flex items-center justify-center transition-all active:scale-95"
            >
              <Plus className={`w-5 h-5 text-white transition-transform duration-200 ${showMediaMenu ? 'rotate-45' : ''}`} />
            </button>

            {/* 多媒体菜单 - 美化版 */}
            {showMediaMenu && (
              <>
                {/* 背景遮罩 */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowMediaMenu(false)}
                />
                
                {/* 菜单内容 */}
                <div className="absolute bottom-full right-0 mb-3 bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 min-w-[240px] z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
                  {/* 标题 */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                    <h3 className="text-sm text-gray-600">更多功能</h3>
                    <button
                      onClick={() => setShowMediaMenu(false)}
                      className="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-4 h-4 text-gray-400 rotate-45" />
                    </button>
                  </div>

                  {/* 功能网格 */}
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => {
                        imageInputRef.current?.click();
                        setShowMediaMenu(false);
                      }}
                      className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-blue-50 active:bg-blue-100 transition-all group"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-md group-hover:shadow-lg flex items-center justify-center transition-all group-hover:scale-110">
                        <ImageIcon className="w-7 h-7 text-white" />
                      </div>
                      <span className="text-xs text-gray-700 font-medium">图片</span>
                    </button>

                    <button
                      onClick={() => {
                        videoInputRef.current?.click();
                        setShowMediaMenu(false);
                      }}
                      className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-purple-50 active:bg-purple-100 transition-all group"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 shadow-md group-hover:shadow-lg flex items-center justify-center transition-all group-hover:scale-110">
                        <Video className="w-7 h-7 text-white" />
                      </div>
                      <span className="text-xs text-gray-700 font-medium">视频</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowEmojiPack(true);
                        setShowMediaMenu(false);
                      }}
                      className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-yellow-50 active:bg-yellow-100 transition-all group"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-md group-hover:shadow-lg flex items-center justify-center transition-all group-hover:scale-110">
                        <Smile className="w-7 h-7 text-white" />
                      </div>
                      <span className="text-xs text-gray-700 font-medium">表情包</span>
                    </button>

                    {/* 群直播 - 仅群聊可用 */}
                    {conversation.type === 'group' && (
                      <button
                        onClick={() => {
                          handleStartLivestream();
                          setShowMediaMenu(false);
                        }}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all group ${
                          isCurrentUserLivestreaming() 
                            ? 'hover:bg-red-50 active:bg-red-100' 
                            : 'hover:bg-orange-50 active:bg-orange-100'
                        }`}
                      >
                        <div className={`w-14 h-14 rounded-2xl shadow-md group-hover:shadow-lg flex items-center justify-center transition-all group-hover:scale-110 ${
                          isCurrentUserLivestreaming() 
                            ? 'bg-gradient-to-br from-red-400 to-pink-600' 
                            : 'bg-gradient-to-br from-orange-400 to-red-600'
                        }`}>
                          {isCurrentUserLivestreaming() ? (
                            <PhoneOff className="w-7 h-7 text-white" />
                          ) : (
                            <Radio className="w-7 h-7 text-white" />
                          )}
                        </div>
                        <span className="text-xs text-gray-700 font-medium">
                          {isCurrentUserLivestreaming() ? '关闭直播' : '直播'}
                        </span>
                      </button>
                    )}

                    {/* 语音通话 - 私聊和群聊都可用 */}
                    <button
                        onClick={() => {
                          if (conversation.type === 'private') {
                            handleStartPrivateCall('voice');
                          } else {
                            handleStartGroupCall('voice');
                          }
                          setShowMediaMenu(false);
                        }}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all group ${
                          isCurrentUserInCall('voice') 
                            ? 'hover:bg-red-50 active:bg-red-100' 
                            : 'hover:bg-green-50 active:bg-green-100'
                        }`}
                      >
                        <div className={`w-14 h-14 rounded-2xl shadow-md group-hover:shadow-lg flex items-center justify-center transition-all group-hover:scale-110 ${
                          isCurrentUserInCall('voice') 
                            ? 'bg-gradient-to-br from-red-400 to-pink-600' 
                            : 'bg-gradient-to-br from-green-400 to-emerald-600'
                        }`}>
                          {isCurrentUserInCall('voice') ? (
                            <PhoneOff className="w-7 h-7 text-white" />
                          ) : (
                            <Phone className="w-7 h-7 text-white" />
                          )}
                        </div>
                        <span className="text-xs text-gray-700 font-medium">
                          {isCurrentUserInCall('voice') ? '挂断语音' : '语音通话'}
                        </span>
                      </button>

                    {/* 视频通话 - 私聊和群聊都可用 */}
                    <button
                        onClick={() => {
                          if (conversation.type === 'private') {
                            handleStartPrivateCall('video');
                          } else {
                            handleStartGroupCall('video');
                          }
                          setShowMediaMenu(false);
                        }}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all group ${
                          isCurrentUserInCall('video') 
                            ? 'hover:bg-red-50 active:bg-red-100' 
                            : 'hover:bg-purple-50 active:bg-purple-100'
                        }`}
                      >
                        <div className={`w-14 h-14 rounded-2xl shadow-md group-hover:shadow-lg flex items-center justify-center transition-all group-hover:scale-110 ${
                          isCurrentUserInCall('video') 
                            ? 'bg-gradient-to-br from-red-400 to-pink-600' 
                            : 'bg-gradient-to-br from-purple-400 to-pink-600'
                        }`}>
                          {isCurrentUserInCall('video') ? (
                            <PhoneOff className="w-7 h-7 text-white" />
                          ) : (
                            <Video className="w-7 h-7 text-white" />
                          )}
                        </div>
                        <span className="text-xs text-gray-700 font-medium">
                          {isCurrentUserInCall('video') ? '挂断' : '视频通话'}
                        </span>
                      </button>
                  </div>
                </div>
              </>
            )}

            {/* 隐藏的文件输入 */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
            />
          </div>
          
          {/* 发送按钮 */}
          <button
            onClick={() => handleSendMessage()}
            disabled={!message.trim()}
            className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-center transition-colors active:scale-95"
          >
            <Send className="w-4.5 h-4.5 text-white" />
          </button>
        </div>
      </div>

      {/* 群聊发送者快速切换 - 隐蔽设计 */}
      {showSenderPicker && conversation.type === 'group' && (
        <div 
          className="absolute inset-0 z-50 flex items-end animate-in fade-in duration-150"
          onClick={() => setShowSenderPicker(false)}
        >
          <div 
            className="w-full bg-white/95 backdrop-blur-md shadow-2xl animate-in slide-in-from-bottom duration-200 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 拖动指示条 */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>

            {/* 横向滚动的角色列表 */}
            <div className="px-4 py-3 overflow-x-auto scrollbar-hide">
              <div className="flex gap-6 min-w-min pb-1">
                {getAllSenders().map(sender => {
                  const isSelected = sender.id === currentSenderId;

                  return (
                    <button
                      key={sender.id}
                      onClick={() => handleSelectSender(sender.id)}
                      className="flex flex-col items-center gap-2 min-w-[60px] active:scale-95 transition-transform"
                    >
                      {/* 头像 */}
                      <div className={`relative w-14 h-14 rounded-full overflow-hidden transition-all ${
                        isSelected 
                          ? 'ring-2 ring-blue-500 ring-offset-2 shadow-lg' 
                          : 'opacity-60 shadow-sm'
                      }`}>
                        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                          {sender.avatar.startsWith('data:') ? (
                            <img src={sender.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl">{sender.avatar}</span>
                          )}
                        </div>
                        
                        {/* 选中指示器 */}
                        {isSelected && (
                          <div className="absolute bottom-0 right-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>

                      {/* 名称 */}
                      <span className={`text-xs max-w-[60px] truncate transition-all ${
                        isSelected ? 'text-blue-600 font-medium' : 'text-gray-500'
                      }`}>
                        {sender.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 语音消息弹窗 */}
      {showVoiceDialog && (
        <VoiceMessageDialog
          onClose={() => setShowVoiceDialog(false)}
          onSend={handleSendVoice}
        />
      )}

      {/* 消息操作弹窗 */}
      {showMessageActionDialog && selectedMessage && (
        <MessageActionDialog
          message={selectedMessage}
          onClose={() => {
            setShowMessageActionDialog(false);
            setSelectedMessage(null);
          }}
          onEdit={handleEditMessage}
          onDelete={handleDeleteMessage}
          onEditTime={handleEditMessageTime}
        />
      )}

      {/* 表情包弹窗 */}
      {showEmojiPack && (
        <EmojiPackDialog
          onClose={() => setShowEmojiPack(false)}
          onSend={handleSendEmojiPack}
        />
      )}

      {/* 直播详情弹窗 */}
      {selectedLivestream && (
        <LivestreamDialog
          livestream={selectedLivestream}
          currentUserId={currentSenderId}
          contacts={contacts}
          user={user}
          onClose={() => setSelectedLivestream(null)}
          onJoinAsViewer={() => handleJoinLivestreamAsViewer(selectedLivestream)}
          onJoinAsCoHost={() => handleJoinLivestreamAsCoHost(selectedLivestream)}
          onEndLivestream={() => handleEndLivestream(selectedLivestream)}
        />
      )}

      {/* 群通话详情弹窗 */}
      {selectedGroupCall && (
        <GroupCallDialog
          groupCall={selectedGroupCall}
          currentUserId={currentSenderId}
          contacts={contacts}
          user={user}
          onClose={() => setSelectedGroupCall(null)}
          onJoinCall={() => handleJoinGroupCall(selectedGroupCall)}
          onEndCall={() => handleEndGroupCall(selectedGroupCall)}
        />
      )}
    </div>
  );
}