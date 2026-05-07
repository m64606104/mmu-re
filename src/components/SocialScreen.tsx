import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Users, Search, MessageCircle, Camera, User, BellOff, Plus, UserPlus, Scan, X } from 'lucide-react';
import { ApiConfig, Conversation, Screen, UserProfile } from '../types';
import { normalizeMessagePreviewText } from '../utils/messageFormatter';
import StatusSelector from './StatusSelector';
import ChatScreen from './ChatScreen';
import { useMobileBottomDock } from '../hooks/useMobileBottomDock';

interface SocialScreenProps {
  conversations: Conversation[];
  onNavigate: (screen: Screen, conversationId?: string) => void;
  onImportCharacter?: (data: any) => void;
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void;
  apiConfig: ApiConfig;
  userProfile: UserProfile;
  onDeleteConversation?: (id: string) => void;
  onNavigateToPrivateChat?: (aiName: string) => void;
}

export default function SocialScreen({
  conversations,
  onNavigate,
  onImportCharacter,
  onUpdateConversation,
  apiConfig,
  userProfile,
  onDeleteConversation,
  onNavigateToPrivateChat,
}: SocialScreenProps) {
  // 过滤掉隐藏的会话（保留被拉黑的会话）
  const visibleConversations = conversations.filter(c => !c.isHidden);
  const sortedConversations = [...visibleConversations].sort((a, b) => b.lastMessageTime - a.lastMessageTime);
  
  const [showMenu, setShowMenu] = useState(false);
  const [showStatusSelector, setShowStatusSelector] = useState(false);
  const [desktopQuery, setDesktopQuery] = useState('');
  const [desktopSelectedId, setDesktopSelectedId] = useState<string | null>(null);
  const [desktopOpenChatId, setDesktopOpenChatId] = useState<string | null>(null);
  const [mobileQuery, setMobileQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showFullChatList, setShowFullChatList] = useState(false);
  const [roleCarouselStart, setRoleCarouselStart] = useState(0);
  const [groupCarouselStart, setGroupCarouselStart] = useState(0);
  const mobileBottomDock = useMobileBottomDock();
  const isStandaloneMode = useMemo(
    () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)),
    []
  );

  // 强制将全局页面滚动归零，避免嵌入聊天打开时整页被浏览器上推
  useEffect(() => {
    const resetPageScroll = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    resetPageScroll();
    requestAnimationFrame(resetPageScroll);
  }, [desktopOpenChatId]);
  
  // 左滑菜单状态
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchOffset, setTouchOffset] = useState<number>(0);

  // 处理触摸开始
  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    setTouchStart(e.touches[0].clientX);
    // 如果点击的是其他已打开的项，关闭它
    if (swipedId && swipedId !== id) {
      setSwipedId(null);
      setTouchOffset(0);
    }
  };

  // 处理触摸移动
  const handleTouchMove = (e: React.TouchEvent, id: string) => {
    if (touchStart === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStart;
    
    // 简单的防抖，如果是垂直滚动则忽略
    // 这里简单处理，实际可能需要判断 slope
    
    if (swipedId === id) {
      // 已打开状态：向右滑(diff>0)关闭，向左滑(diff<0)最多到-200
      const newOffset = Math.max(-200, Math.min(0, -200 + diff));
      setTouchOffset(newOffset);
    } else {
      // 未打开状态：向左滑(diff<0)打开，向右滑(diff>0)不动
      const newOffset = Math.max(-200, Math.min(0, diff));
      setTouchOffset(newOffset);
    }
  };

  // 处理触摸结束
  const handleTouchEnd = (e: React.TouchEvent, id: string) => {
    if (touchStart === null) return;
    const currentX = e.changedTouches[0].clientX;
    const diff = currentX - touchStart;
    
    if (swipedId === id) {
      // 已打开状态：向右滑超过50px则关闭
      if (diff > 50) {
        setSwipedId(null);
        setTouchOffset(0);
      } else {
        setTouchOffset(-200); // 保持打开
      }
    } else {
      // 未打开状态：向左滑超过50px则打开
      if (diff < -50) {
        setSwipedId(id);
        setTouchOffset(-200);
      } else {
        setTouchOffset(0);
      }
    }
    setTouchStart(null);
  };

  // 处理操作
  const handleAction = (action: 'hide' | 'block' | 'unblock' | 'delete', conversation: Conversation) => {
    if (action === 'hide') {
      onUpdateConversation(conversation.id, { isHidden: true });
    } else if (action === 'block') {
      if (confirm(`确定要拉黑 ${conversation.name} 吗？拉黑后对方将无法发送消息。`)) {
        onUpdateConversation(conversation.id, { isBlocked: true });
      }
    } else if (action === 'unblock') {
      if (confirm(`确定要解除对 ${conversation.name} 的拉黑吗？`)) {
        onUpdateConversation(conversation.id, { isBlocked: false });
      }
    } else if (action === 'delete') {
      if (confirm(`确定要删除与 ${conversation.name} 的对话吗？聊天记录将被清空。`)) {
        onUpdateConversation(conversation.id, { messages: [], isHidden: true });
      }
    }
    setSwipedId(null);
    setTouchOffset(0);
  };

  // 使用state管理用户资料
  const [localUserProfile, setLocalUserProfile] = useState(() => {
    try {
      const profile = localStorage.getItem('userProfile');
      if (profile) {
        return JSON.parse(profile);
      }
    } catch (e) {
      console.error('Failed to parse user profile:', e);
    }
    return { username: '123', avatar: null, status: '在线' };
  });

  // 处理扫一扫导入角色
  const handleScanImport = () => {
    setShowMenu(false);
    
    // 创建文件选择器
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          
          // 验证数据格式
          if (!data.character || !data.character.name) {
            alert('❌ 文件格式错误，请选择正确的角色迁移文件');
            return;
          }
          
          // 调用导入回调
          if (onImportCharacter) {
            onImportCharacter(data);
          } else {
            alert('❌ 导入功能未启用');
          }
        } catch (error) {
          console.error('解析文件失败:', error);
          alert('❌ 文件解析失败，请检查文件格式');
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  };

  // 获取最后一条消息的预览文本
  const getLastMessagePreview = (conversation: Conversation): string => {
    if (conversation.messages.length === 0) return '暂无消息';
    
    // 从后往前找第一条非系统消息
    for (let i = conversation.messages.length - 1; i >= 0; i--) {
      const msg = conversation.messages[i];
      if (msg.role !== 'system') {
        // 根据消息类型返回预览
        if (msg.mediaType === 'voice') {
          return '[语音]';
        } else if (msg.mediaType === 'image') {
          return '[图片]';
        } else if (msg.mediaType === 'video') {
          return '[视频]';
        } else if (msg.mediaType === 'sticker') {
          return '[表情]';
        } else {
          return normalizeMessagePreviewText(msg.content || '');
        }
      }
    }
    
    return '暂无消息';
  };

  const desktopList = useMemo(() => {
    const q = desktopQuery.trim().toLowerCase();
    if (!q) return sortedConversations;
    return sortedConversations.filter((c) => {
      const preview = getLastMessagePreview(c);
      const nickname = c.characterSettings?.nickname || '';
      const username = c.characterSettings?.username || '';
      return (
        (c.name || '').toLowerCase().includes(q) ||
        nickname.toLowerCase().includes(q) ||
        username.toLowerCase().includes(q) ||
        (preview || '').toLowerCase().includes(q)
      );
    });
  }, [desktopQuery, sortedConversations]);

  const desktopSelectedConv = useMemo(() => {
    if (!desktopSelectedId) return null;
    return sortedConversations.find((c) => c.id === desktopSelectedId) || null;
  }, [desktopSelectedId, sortedConversations]);

  const desktopOpenConv = useMemo(() => {
    if (!desktopOpenChatId) return null;
    return sortedConversations.find((c) => c.id === desktopOpenChatId) || null;
  }, [desktopOpenChatId, sortedConversations]);

  const mobileFilteredConversations = useMemo(() => {
    const q = mobileQuery.trim().toLowerCase();
    if (!q) return sortedConversations;
    return sortedConversations.filter((c) => {
      const preview = getLastMessagePreview(c);
      return (
        (c.name || '').toLowerCase().includes(q) ||
        (preview || '').toLowerCase().includes(q)
      );
    });
  }, [mobileQuery, sortedConversations]);

  const directConversations = useMemo(
    () => mobileFilteredConversations.filter((c) => c.type !== 'group'),
    [mobileFilteredConversations]
  );
  const groupConversations = useMemo(
    () => mobileFilteredConversations.filter((c) => c.type === 'group'),
    [mobileFilteredConversations]
  );

  useEffect(() => {
    const maxStart = Math.max(0, directConversations.length - 5);
    if (roleCarouselStart > maxStart) setRoleCarouselStart(maxStart);
  }, [directConversations.length, roleCarouselStart]);

  useEffect(() => {
    const maxStart = Math.max(0, groupConversations.length - 1);
    if (groupCarouselStart > maxStart) setGroupCarouselStart(maxStart);
  }, [groupConversations.length, groupCarouselStart]);

  const openDesktopChat = (id: string) => {
    setDesktopOpenChatId(id);
  };

  // 更新用户状态（流畅更新，不刷新页面）
  const handleStatusChange = (newStatus: string) => {
    const updatedProfile = { ...localUserProfile, status: newStatus };
    setLocalUserProfile(updatedProfile);
    localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return days[date.getDay()];
    } else {
      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    }
  };

  const getAvatarGradient = (name: string) => {
    const gradients = [
      'from-blue-400 to-blue-600',
      'from-purple-400 to-purple-600',
      'from-pink-400 to-pink-600',
      'from-green-400 to-green-600',
      'from-yellow-400 to-yellow-600',
      'from-red-400 to-red-600',
      'from-indigo-400 to-indigo-600',
      'from-teal-400 to-teal-600',
    ];
    const index = name.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  const getConversationAvatar = (conversation: Conversation): string | undefined => {
    if (conversation.type === 'group') return conversation.avatar;
    return conversation.characterSettings?.avatar || conversation.avatar;
  };

  return (
    <div className="h-[100dvh] md:h-full">
      {/* 桌面端：统一 Gemini 风格两栏布局 */}
      <div data-ui="screen-social" className="hidden md:flex h-full relative overflow-hidden bg-gradient-to-br from-slate-50 via-slate-50 to-zinc-100">
        <div className="absolute inset-0 bg-white/78 backdrop-blur-[1px]" />
        <div className="relative z-10 h-full flex flex-col w-full">
          <header className="h-16 border-b border-zinc-200 bg-white/85 backdrop-blur-md px-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xl font-semibold text-zinc-900">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              聊天中心
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('home')}
                className="px-3 py-1.5 text-sm rounded-full text-zinc-600 hover:bg-zinc-100"
              >
                返回
              </button>
              <button
                onClick={() => onNavigate('contacts')}
                className="px-3 py-1.5 text-sm rounded-full text-zinc-600 hover:bg-zinc-100"
                title="通讯录"
              >
                <Users className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowMenu(true)}
                className="w-9 h-9 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-700"
                title="更多"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </header>

          <div className="flex-1 min-h-0 flex">
            <aside className="w-[380px] border-r border-zinc-200 bg-white/65">
              <div className="px-6 py-4 border-b border-zinc-200/70">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    value={desktopQuery}
                    onChange={(e) => setDesktopQuery(e.target.value)}
                    placeholder="搜索会话或消息…"
                    className="w-full pl-10 pr-3 py-2 bg-zinc-100 rounded-xl text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                  />
                </div>
              </div>

              <div className="overflow-y-auto h-[calc(100%-0px)]">
                {desktopList.length === 0 ? (
                  <div className="px-6 py-10 text-center text-zinc-500">
                    没有匹配的会话
                    {desktopQuery.trim() && (
                      <div className="mt-4">
                        <button
                          onClick={() => onNavigateToPrivateChat?.(desktopQuery.trim())}
                          className="px-4 py-2 rounded-full bg-zinc-900 text-white text-sm hover:bg-zinc-800 transition"
                        >
                          与「{desktopQuery.trim()}」发起对话
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    {desktopList.map((conversation) => {
                      const isActive = conversation.id === desktopSelectedId;
                      const avatarUrl =
                        conversation.type === 'group'
                          ? conversation.avatar
                          : (conversation.characterSettings?.avatar || conversation.avatar);
                      const preview = getLastMessagePreview(conversation);

                      return (
                        <button
                          key={conversation.id}
                          onClick={() => setDesktopSelectedId(conversation.id)}
                          onDoubleClick={() => openDesktopChat(conversation.id)}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            isActive
                              ? 'bg-white border-zinc-300 shadow-sm'
                              : 'bg-white/90 border-zinc-200 hover:bg-white hover:shadow-sm'
                          } ${conversation.isBlocked ? 'opacity-60 grayscale' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative flex-shrink-0">
                              <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center overflow-hidden">
                                {avatarUrl ? (
                                  <img src={avatarUrl} alt={conversation.name} className="w-full h-full object-cover" />
                                ) : conversation.type === 'group' ? (
                                  <Users className="w-6 h-6 text-white" strokeWidth={2.5} />
                                ) : (
                                  <span className="text-white font-semibold text-lg">
                                    {conversation.name.charAt(0)}
                                  </span>
                                )}
                              </div>
                              {conversation.unreadCount > 0 && (
                                <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center px-1 border-2 border-white">
                                  <span className="text-white text-[10px] font-semibold">
                                    {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div className="font-semibold text-zinc-900 truncate">{conversation.name}</div>
                                <div className="text-[11px] text-zinc-400 flex-shrink-0">
                                  {formatTime(conversation.lastMessageTime)}
                                </div>
                              </div>
                              <div className="mt-1 text-xs text-zinc-500 line-clamp-2">{preview}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>

            <main data-ui="social-right-pane" className="flex-1 min-h-0 overflow-hidden">
              <div data-ui="social-right-pane-inner" className="h-full w-full min-h-0">
                {!desktopOpenChatId ? (
                  !desktopSelectedConv ? (
                  <div className="h-full overflow-y-auto p-10">
                    <div className="max-w-[980px] mx-auto rounded-3xl border border-zinc-200 bg-white/80 p-10 text-center">
                      <div className="text-lg font-semibold text-zinc-900">选择一个会话</div>
                      <div className="mt-2 text-sm text-zinc-600">单击只选中；双击或点击“打开对话”会在右侧打开聊天。</div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto p-10">
                    <div className="max-w-[980px] mx-auto rounded-3xl border border-zinc-200 bg-white/90 overflow-hidden">
                      <div className="p-6 border-b border-zinc-100">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-xl font-semibold text-zinc-900">{desktopSelectedConv.name}</div>
                            <div className="mt-2 text-sm text-zinc-500">
                              最近活跃：{formatTime(desktopSelectedConv.lastMessageTime)}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openDesktopChat(desktopSelectedConv.id)}
                              className="px-4 py-2 rounded-full bg-zinc-900 text-white text-sm hover:bg-zinc-800 transition"
                            >
                              打开对话
                            </button>
                            <button
                              onClick={() => onUpdateConversation(desktopSelectedConv.id, { isHidden: true })}
                              className="px-4 py-2 rounded-full bg-white border border-zinc-200 text-zinc-700 text-sm hover:bg-zinc-50 transition"
                            >
                              不显示
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="text-sm font-semibold text-zinc-900">消息预览</div>
                        <div className="mt-2 rounded-2xl bg-zinc-50 border border-zinc-200 p-4 text-sm text-zinc-700 whitespace-pre-wrap">
                          {getLastMessagePreview(desktopSelectedConv)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
                ) : desktopOpenConv ? (
                  <div data-ui="social-chat-embed-wrap" className="h-full min-h-0 rounded-none border-0 bg-white overflow-hidden">
                    <ChatScreen
                      conversation={desktopOpenConv}
                      apiConfig={apiConfig}
                      currentUserProfile={userProfile}
                      conversations={conversations}
                      onUpdateConversation={onUpdateConversation}
                      onDeleteConversation={onDeleteConversation}
                      onBack={() => setDesktopOpenChatId(null)}
                      onOpenCharacterSettings={() => onNavigate('character-settings')}
                      onNavigateToPrivateChat={onNavigateToPrivateChat}
                      onOpenStickerManagement={() => {
                        try {
                          sessionStorage.setItem('momoyu:stickerManagementTab', 'mine');
                        } catch {
                          /* ignore */
                        }
                        onNavigate('sticker-management');
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-500">会话不存在或已被隐藏</div>
                )}
              </div>
            </main>
          </div>

          {/* 桌面端菜单：简单版 */}
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="fixed right-6 top-20 z-50 w-56 rounded-2xl shadow-2xl overflow-hidden bg-white border border-zinc-200">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onNavigate('create-group');
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-50"
                >
                  <MessageCircle className="w-5 h-5 text-zinc-700" />
                  <span className="text-sm text-zinc-900">发起群聊</span>
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onNavigate('add-friend');
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-50"
                >
                  <UserPlus className="w-5 h-5 text-zinc-700" />
                  <span className="text-sm text-zinc-900">添加朋友</span>
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    handleScanImport();
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-50"
                >
                  <Scan className="w-5 h-5 text-zinc-700" />
                  <span className="text-sm text-zinc-900">扫一扫</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 移动端：卡片化聊天列表（参考示意图） */}
      <div className="md:hidden h-full flex flex-col bg-[#ECEFF0]">
        <div className="mx-3 my-3 rounded-[30px] border border-white/70 bg-[#cfe3e1] shadow-[0_10px_24px_rgba(0,0,0,0.08)] flex-1 overflow-y-auto flex flex-col">
          <div className="px-5 pt-5 pb-10">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[24px] leading-6 text-[#142f2a]">聊天列表</div>
                <div className="text-[43px] leading-[0.95] font-semibold text-[#142f2a]">for a CHAT</div>
              </div>
              <div className="relative pr-8">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="w-12 h-12 rounded-[14px] bg-[#084336] text-white shadow-[0_2px_6px_rgba(0,0,0,0.15)] flex items-center justify-center relative z-10"
                >
                  <Plus className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setShowMobileSearch((s) => !s)}
                  className="w-12 h-12 rounded-[14px] bg-white text-[#222] shadow-[0_2px_6px_rgba(0,0,0,0.12)] flex items-center justify-center absolute top-0 left-9 z-20"
                >
                  <Search className="w-6 h-6" />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <div className="absolute top-14 right-0 z-50 w-44 rounded-xl bg-white border border-zinc-200 shadow-xl overflow-hidden">
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onNavigate('create-group');
                        }}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-zinc-50"
                      >
                        发起群聊
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onNavigate('add-friend');
                        }}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-zinc-50"
                      >
                        添加朋友
                      </button>
                      <button
                        onClick={handleScanImport}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-zinc-50"
                      >
                        扫一扫
                      </button>
                    </div>
                  </>
                )}
                {showMobileSearch && (
                  <div className="absolute top-14 right-0 z-40 w-52 rounded-xl border border-white/80 bg-white/95 p-2 shadow-lg">
                    <div className="px-2 py-1 text-[11px] text-zinc-500">搜索好友名字</div>
                    <input
                      type="text"
                      value={mobileQuery}
                      onChange={(e) => setMobileQuery(e.target.value)}
                      placeholder="输入名字"
                      className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 relative">
              <button
                onClick={() => setRoleCarouselStart((s) => Math.max(0, s - 1))}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/3 z-20 w-10 h-8 rounded-[10px] bg-white text-zinc-600 shadow-[0_1px_3px_rgba(0,0,0,0.12)] flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="w-full rounded-[16px] bg-[#c7dfdd] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] px-3 py-2.5 grid grid-cols-5 gap-1 min-h-[94px]">
                {directConversations.slice(roleCarouselStart, roleCarouselStart + 5).map((conv) => {
                  const avatarUrl = getConversationAvatar(conv);
                  return (
                    <button
                      key={conv.id}
                      onClick={() => onNavigate('chat', conv.id)}
                      className="rounded-[12px] bg-[#dff0ef] py-1 px-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.08)] flex flex-col items-center justify-center"
                      title={conv.name}
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-200">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={conv.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-zinc-700">
                            {conv.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="mt-1 text-[10px] leading-3 text-zinc-700 truncate w-full px-0.5">{conv.name}</div>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() =>
                  setRoleCarouselStart((s) => Math.min(Math.max(0, directConversations.length - 5), s + 1))
                }
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 z-20 w-10 h-8 rounded-[10px] bg-white text-zinc-600 shadow-[0_1px_3px_rgba(0,0,0,0.12)] flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="-mt-2 flex-1 rounded-t-[24px] bg-[#f3f5f5] px-4 pt-4 pb-6 flex flex-col">
            <div className="max-h-[152px] overflow-y-auto pr-1 space-y-2">
              {directConversations.map((conversation) => {
                const avatarUrl = getConversationAvatar(conversation);
                return (
                    <div key={conversation.id} className="grid grid-cols-[1fr_72px] gap-2 min-w-0">
                    <button
                      onClick={() => onNavigate('chat', conversation.id)}
                        className="rounded-2xl bg-[#e8edee] border border-white/90 px-3 py-3 min-h-[68px] text-left flex items-center gap-3 min-w-0 overflow-hidden"
                    >
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-200 flex-shrink-0">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={conversation.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-zinc-700">
                            {conversation.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 overflow-hidden flex-1">
                        <div className="text-[11px] text-zinc-500 truncate">{conversation.name}</div>
                        <div className="mt-0.5 text-sm font-semibold text-zinc-800 truncate">
                          {getLastMessagePreview(conversation)}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => onNavigate('chat', conversation.id)}
                        className="rounded-2xl bg-[#f6d387] border border-[#f0c766] px-2 py-2 min-h-[68px] flex flex-col items-center justify-center"
                      title="打开聊天"
                    >
                      <MessageCircle className="w-4 h-4 text-zinc-700" />
                      <div className="mt-1 text-[11px] font-semibold text-zinc-800">{formatTime(conversation.lastMessageTime)}</div>
                    </button>
                  </div>
                );
              })}
              {directConversations.length === 0 && (
                <div className="rounded-2xl bg-white/75 border border-white px-3 py-5 text-sm text-zinc-500 text-center">
                  没有匹配到好友会话
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="text-[34px] leading-8 font-semibold text-[#173f2e]">groups</div>
              <div className="rounded-xl bg-white/85 px-1 py-1 flex items-center gap-1">
                <button
                  onClick={() => setGroupCarouselStart((s) => Math.max(0, s - 1))}
                  className="w-8 h-8 rounded-lg text-zinc-500 hover:bg-zinc-100 flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGroupCarouselStart((s) => Math.min(Math.max(0, groupConversations.length - 1), s + 1))}
                  className="w-8 h-8 rounded-lg text-zinc-500 hover:bg-zinc-100 flex items-center justify-center"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-2">
              {groupConversations.length > 0 ? (
                <button
                  onClick={() => onNavigate('chat', groupConversations[groupCarouselStart]?.id)}
                  className="w-full rounded-2xl border border-[#9dcfd7] bg-[#d4eaf0] p-3 text-left"
                >
                  <div className="flex items-stretch gap-3">
                    <div className="w-[122px] h-[96px] rounded-xl bg-white/70 overflow-hidden flex-shrink-0">
                      {getConversationAvatar(groupConversations[groupCarouselStart]) ? (
                        <img
                          src={getConversationAvatar(groupConversations[groupCarouselStart])}
                          alt={groupConversations[groupCarouselStart].name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500">
                          <Users className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[33px] leading-[1] font-semibold text-zinc-800 truncate">
                        {groupConversations[groupCarouselStart]?.name}
                      </div>
                      <div className="mt-2 flex -space-x-1.5">
                        {(groupConversations[groupCarouselStart]?.members || [])
                          .slice(0, 4)
                          .map((memberId) => {
                            const member = conversations.find((c) => c.id === memberId);
                            const displayName = member?.name || '?';
                            const avatar = member ? getConversationAvatar(member) : undefined;
                            return (
                              <div
                                key={`${groupConversations[groupCarouselStart]?.id}-m-${memberId}`}
                                className="w-6 h-6 rounded-full border border-white overflow-hidden bg-zinc-200"
                              >
                                {avatar ? (
                                  <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[9px] font-semibold text-zinc-700">
                                    {displayName.charAt(0)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                      <div className="mt-2 text-xs text-zinc-600 truncate">
                        {formatTime(groupConversations[groupCarouselStart]?.lastMessageTime || Date.now())}
                      </div>
                    </div>
                  </div>
                </button>
              ) : (
                <div className="w-full rounded-2xl border border-[#9ad2da] bg-[#d7eef2] p-4 text-sm text-zinc-600">
                  还没有群聊会话，点击右上角 + 创建群聊
                </div>
              )}
            </div>

            {/* Keep bottom content visible above dock while panel stays white */}
            <div className="flex-shrink-0" style={{ height: 88 + mobileBottomDock }} />
          </div>
        </div>

      {/* 底部导航栏 */}
      <div
        className="fixed left-0 right-0 z-[60] md:hidden px-4"
        style={{ bottom: `calc(${(isStandaloneMode ? 10 : 12) + mobileBottomDock}px + env(safe-area-inset-bottom))` }}
      >
        <div className="rounded-[22px] border border-white/85 bg-[#eef2f2] px-3 py-2 shadow-[0_3px_10px_rgba(0,0,0,0.08)] flex items-center justify-between">
          <button onClick={() => onNavigate('home')} className="w-11 h-11 rounded-xl text-zinc-500 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowFullChatList(true)}
            className="w-12 h-11 rounded-xl bg-white text-zinc-700 shadow-sm flex items-center justify-center"
            title="全屏对话列表"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          <button onClick={() => onNavigate('moments')} className="w-11 h-11 rounded-xl text-zinc-500 flex items-center justify-center" title="发现页">
            <Search className="w-5 h-5" />
          </button>
          <button onClick={() => onNavigate('profile')} className="w-11 h-11 rounded-xl text-zinc-500 flex items-center justify-center" title="个人资料">
            <User className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showFullChatList && (
        <div className="fixed inset-0 z-[70] md:hidden bg-[#ecf0f0] flex flex-col">
          <div className="px-4 pt-4 pb-3 border-b border-zinc-200 bg-white/90 backdrop-blur-sm flex items-center justify-between">
            <div className="text-lg font-semibold text-zinc-900">对话列表</div>
            <button
              onClick={() => setShowFullChatList(false)}
              className="w-9 h-9 rounded-lg border border-zinc-200 bg-white flex items-center justify-center text-zinc-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-4 pt-3">
            <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-zinc-400" />
              <input
                value={mobileQuery}
                onChange={(e) => setMobileQuery(e.target.value)}
                placeholder="搜索好友或会话"
                className="flex-1 bg-transparent outline-none text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {mobileFilteredConversations.map((conversation) => {
              const avatarUrl = getConversationAvatar(conversation);
              return (
                <button
                  key={conversation.id}
                  onClick={() => {
                    setShowFullChatList(false);
                    onNavigate('chat', conversation.id);
                  }}
                  className="w-full rounded-2xl bg-white border border-zinc-200 px-3 py-3 text-left flex items-center gap-3"
                >
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-200 flex-shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={conversation.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-zinc-700">
                        {conversation.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-zinc-800 truncate">{conversation.name}</div>
                      <div className="text-[11px] text-zinc-500">{formatTime(conversation.lastMessageTime)}</div>
                    </div>
                    <div className="text-[12px] text-zinc-500 mt-0.5 truncate max-w-full">
                      {getLastMessagePreview(conversation)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 状态选择器 */}
      {showStatusSelector && (
        <StatusSelector
          currentStatus={localUserProfile.status || '在线'}
          onSelectStatus={handleStatusChange}
          onClose={() => setShowStatusSelector(false)}
        />
      )}
      </div>
    </div>
  );
}
