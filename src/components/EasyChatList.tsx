import { useState } from 'react';
import { ArrowLeft, Plus, User, Users, Upload, Search } from 'lucide-react';
import { EasyChatContact, EasyChatConversation } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

interface EasyChatListProps {
  onBack: () => void;
  conversations: EasyChatConversation[];
  setConversations: (conversations: EasyChatConversation[]) => void;
  contacts: EasyChatContact[];
  setContacts: (contacts: EasyChatContact[]) => void;
  onOpenChatRoom: (conversation: EasyChatConversation) => void;
  uiStyle?: 'default' | 'wechat';
}

export function EasyChatList({ 
  onBack, 
  conversations, 
  setConversations, 
  contacts, 
  setContacts,
  onOpenChatRoom,
  uiStyle = 'default'
}: EasyChatListProps) {
  const isWechatStyle = uiStyle === 'wechat';

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createStep, setCreateStep] = useState<'choose' | 'type' | 'selectContact' | 'newContact' | 'customizeGroup'>('choose');
  const [chatType, setChatType] = useState<'private' | 'group'>('private');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [newContact, setNewContact] = useState({
    name: '',
    avatar: '👤'
  });
  const [groupInfo, setGroupInfo] = useState({
    name: '',
    avatar: '👥'
  });

  const emojiList = ['👤', '👩', '👨', '🧑', '👶', '👦', '👧', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'];

  // 处理图片上传
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片文件');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 200;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_SIZE) {
            height = (height * MAX_SIZE) / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = (width * MAX_SIZE) / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        setNewContact({ ...newContact, avatar: compressedBase64 });
        toast.success('头像已上传');
      };
      img.src = base64String;
    };
    reader.onerror = () => {
      toast.error('图片读取失败');
    };
    reader.readAsDataURL(file);
  };

  // 开始创建聊天
  const handleStartCreate = () => {
    setShowCreateDialog(true);
    setCreateStep('choose');
  };

  // 选择聊天类型
  const handleSelectType = (type: 'private' | 'group') => {
    setChatType(type);
    
    if (type === 'group') {
      // 群聊：进入选择联系人页面（支持批量选择）
      setSelectedContacts([]);
      if (contacts.length === 0) {
        // 没有联系人，提示先创建
        toast.error('请先创建联系人');
        setCreateStep('newContact');
      } else {
        // 有联系人，进入多选页面
        setCreateStep('selectContact');
      }
    } else if (contacts.length === 0) {
      // 私聊且没有联系人，直接进入新建联系人流程
      setCreateStep('newContact');
    } else {
      // 私聊且有联系人，让用户选择
      setCreateStep('type');
    }
  };

  // 创建新联系人并开始聊天
  const handleCreateNewContact = () => {
    if (!newContact.name.trim()) {
      toast.error('请输入联系人名称');
      return;
    }

    // 创建新联系人
    const contact: EasyChatContact = {
      id: Date.now().toString(),
      name: newContact.name,
      avatar: newContact.avatar
    };

    // 添加到联系人列表
    const updatedContacts = [...contacts, contact];
    setContacts(updatedContacts);

    // 创建会话
    const conversation: EasyChatConversation = {
      id: Date.now().toString(),
      type: chatType,
      name: contact.name,
      avatar: contact.avatar,
      participants: [contact.id],
      messages: []
    };

    setConversations([...conversations, conversation]);
    
    // 重置状态
    setShowCreateDialog(false);
    setCreateStep('choose');
    setNewContact({ name: '', avatar: '👤' });
    toast.success('聊天创建成功');
    
    // 打开聊天室
    onOpenChatRoom(conversation);
  };

  // 从现有联系人创建聊天
  const handleCreateFromExisting = () => {
    if (chatType === 'private') {
      if (selectedContacts.length !== 1) {
        toast.error('请选择一个联系人');
        return;
      }
      // 私聊：直接创建
      const selectedContactsData = contacts.filter(c => selectedContacts.includes(c.id));
      
      const conversation: EasyChatConversation = {
        id: Date.now().toString(),
        type: chatType,
        name: selectedContactsData[0].name,
        avatar: selectedContactsData[0].avatar,
        participants: selectedContacts,
        messages: []
      };

      setConversations([...conversations, conversation]);
      setShowCreateDialog(false);
      setCreateStep('choose');
      setSelectedContacts([]);
      toast.success('聊天创建成功');
      
      // 打开聊天室
      onOpenChatRoom(conversation);
    } else {
      // 群聊：进入自定义群聊信息页面
      if (selectedContacts.length < 2) {
        toast.error('群聊至少需要2个联系人');
        return;
      }
      
      // 让用户完全自定义群名
      setGroupInfo({
        name: '',
        avatar: '👥'
      });
      setCreateStep('customizeGroup');
    }
  };

  // 完成群聊创建
  const handleFinishGroupCreation = () => {
    if (!groupInfo.name.trim()) {
      toast.error('请输入群聊名称');
      return;
    }

    const conversation: EasyChatConversation = {
      id: Date.now().toString(),
      type: 'group',
      name: groupInfo.name,
      avatar: groupInfo.avatar,
      participants: selectedContacts,
      messages: []
    };

    setConversations([...conversations, conversation]);
    setShowCreateDialog(false);
    setCreateStep('choose');
    setSelectedContacts([]);
    setGroupInfo({ name: '', avatar: '👥' });
    toast.success('群聊创建成功');
    
    // 打开聊天室
    onOpenChatRoom(conversation);
  };

  // 处理群聊头像上传
  const handleGroupImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片文件');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 200;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_SIZE) {
            height = (height * MAX_SIZE) / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = (width * MAX_SIZE) / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        setGroupInfo({ ...groupInfo, avatar: compressedBase64 });
        toast.success('头像已上传');
      };
      img.src = base64String;
    };
    reader.onerror = () => {
      toast.error('图片读取失败');
    };
    reader.readAsDataURL(file);
  };

  // 切换联系人选择
  const toggleContactSelection = (contactId: string) => {
    if (chatType === 'private') {
      // 私聊只能选择一个
      setSelectedContacts([contactId]);
    } else {
      // 群聊可以选择多个
      if (selectedContacts.includes(contactId)) {
        setSelectedContacts(selectedContacts.filter(id => id !== contactId));
      } else {
        setSelectedContacts([...selectedContacts, contactId]);
      }
    }
  };

  // 微信风格的UI渲染
  if (isWechatStyle) {
    return (
      <div className="w-full h-full bg-[#ededed] flex flex-col">
        {/* 顶部导航栏 - 微信风格 */}
        <div className="bg-[#ededed]">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="w-8" />
            <h1 className="text-[17px] font-medium text-black">微信</h1>
            <button
              onClick={handleStartCreate}
              className="p-1 text-black"
            >
              <Plus size={24} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* 搜索框 - 微信风格 */}
        <div className="px-3 pb-2 bg-[#ededed]">
          <div className="rounded-md px-3 py-2 flex items-center gap-2 bg-white">
            <Search size={16} className="text-[#999]" />
            <span className="text-[#999] text-sm">搜索</span>
          </div>
        </div>

        {/* 会话列表 - 微信风格 */}
        <div className="flex-1 overflow-y-auto bg-[#fff]">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-8">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Plus className="w-10 h-10 text-gray-300" strokeWidth={1.5} />
              </div>
              <p className="text-center text-gray-500 mb-1">暂无聊天</p>
              <p className="text-xs text-gray-400 text-center">点击右上角 + 开始聊天</p>
            </div>
          ) : (
            <div>
              {conversations
                .sort((a, b) => {
                  if (!a.lastMessageTime && !b.lastMessageTime) return 0;
                  if (!a.lastMessageTime) return 1;
                  if (!b.lastMessageTime) return -1;
                  return b.lastMessageTime.localeCompare(a.lastMessageTime);
                })
                .map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => onOpenChatRoom(conv)}
                    className="flex items-center px-3 py-3 cursor-pointer border-b border-[#e5e5e5] active:bg-[#ececec] transition-colors"
                  >
                    {/* 头像 */}
                    <div className="relative flex-shrink-0">
                      <div className="w-[52px] h-[52px] rounded-[5px] bg-blue-500 flex items-center justify-center overflow-hidden">
                        {conv.avatar.startsWith('data:') ? (
                          <img src={conv.avatar} alt="头像" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl text-white">{conv.avatar}</span>
                        )}
                      </div>
                      {conv.type === 'group' && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white">
                          <Users className="w-2 h-2 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    {/* 内容区域 */}
                    <div className="flex-1 ml-3 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-[17px] font-normal text-black truncate">{conv.name}</h3>
                        <span className="text-[#999] text-[13px] flex-shrink-0 ml-2">
                          {conv.lastMessageTime || ''}
                        </span>
                      </div>
                      <p className="text-[#999] text-[14px] truncate">
                        {conv.lastMessage || '暂无消息'}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 默认风格的UI渲染
  return (
    <div className="w-full h-full bg-gray-50 flex flex-col">
      {/* 顶部导航栏 - 统一设计 */}
      <div className="flex items-center justify-between h-14 px-4 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">消息</h1>
        </div>
        <button
          onClick={handleStartCreate}
          className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <Plus className="w-5 h-5 text-blue-500" strokeWidth={2.5} />
        </button>
      </div>

      {/* 聊天列表 */}
      <div className="flex-1 overflow-y-auto bg-white">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 px-8">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center border-2 border-dashed border-gray-200">
                <Plus className="w-12 h-12 text-gray-300" strokeWidth={1.5} />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                <Plus className="w-5 h-5 text-white" strokeWidth={3} />
              </div>
            </div>
            <p className="text-center mb-2">暂无聊天</p>
            <p className="text-sm text-gray-300 text-center mb-4">点击右上角 + 开始聊天</p>
          </div>
        ) : (
          <div className="py-2 px-3 space-y-1">
            {conversations
              .sort((a, b) => {
                // 按最新消息时间降序排序
                if (!a.lastMessageTime && !b.lastMessageTime) return 0;
                if (!a.lastMessageTime) return 1;
                if (!b.lastMessageTime) return -1;
                return b.lastMessageTime.localeCompare(a.lastMessageTime);
              })
              .map((conv) => (
              <button
                key={conv.id}
                onClick={() => onOpenChatRoom(conv)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                {/* 头像 */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shadow-sm overflow-hidden">
                    {conv.avatar.startsWith('data:') ? (
                      <img src={conv.avatar} alt="头像" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl text-white">{conv.avatar}</span>
                    )}
                  </div>
                  {conv.type === 'group' && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white">
                      <Users className="w-2 h-2 text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="truncate font-medium text-gray-900">{conv.name}</span>
                    {conv.lastMessageTime && (
                      <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                        {conv.lastMessageTime}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {conv.lastMessage || '暂无消息'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 创建聊天对话框 */}
      {showCreateDialog && (
        <div className="absolute inset-0 bg-white z-50 flex flex-col">
          {/* 选择新建还是现有联系人 */}
          {createStep === 'choose' && (
            <>
              <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100 flex-shrink-0">
                <button
                  onClick={() => setShowCreateDialog(false)}
                  className="text-blue-500 active:opacity-60 transition-opacity"
                >
                  取消
                </button>
                <h2 className="tracking-tight">选择聊天类型</h2>
                <div className="w-12"></div>
              </div>

              <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-sm space-y-4">
                  <button
                    onClick={() => handleSelectType('private')}
                    className="w-full p-6 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 active:scale-95 rounded-2xl transition-all border-2 border-blue-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                        <User className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="text-lg mb-1">私聊</h4>
                        <p className="text-sm text-gray-600">与单个联系人聊天</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleSelectType('group')}
                    className="w-full p-6 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 active:scale-95 rounded-2xl transition-all border-2 border-purple-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center">
                        <Users className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="text-lg mb-1">群聊</h4>
                        <p className="text-sm text-gray-600">与多个联系人聊天</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* 选择新建还是现有 */}
          {createStep === 'type' && (
            <>
              <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100 flex-shrink-0">
                <button
                  onClick={() => setCreateStep('choose')}
                  className="text-blue-500 active:opacity-60 transition-opacity"
                >
                  返回
                </button>
                <h2 className="tracking-tight">选择联系人</h2>
                <div className="w-12"></div>
              </div>

              <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-sm space-y-4">
                  <button
                    onClick={() => setCreateStep('newContact')}
                    className="w-full p-6 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 active:scale-95 rounded-2xl transition-all border-2 border-green-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                        <Plus className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="text-lg mb-1">新建联系人</h4>
                        <p className="text-sm text-gray-600">创建新的联系人</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setCreateStep('selectContact')}
                    className="w-full p-6 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 active:scale-95 rounded-2xl transition-all border-2 border-blue-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                        <Users className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="text-lg mb-1">选择现有联系人</h4>
                        <p className="text-sm text-gray-600">从联系人列表选择</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* 选择现有联系人 */}
          {createStep === 'selectContact' && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-end justify-center animate-in fade-in duration-200"
              onClick={() => chatType === 'group' ? setCreateStep('choose') : setCreateStep('type')}>
              <div 
                className="w-full max-h-[70vh] bg-white/95 backdrop-blur-md rounded-t-[2rem] shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 拖动条 */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
                </div>

                {/* 标题区 */}
                <div className="px-6 pb-3">
                  <h2 className="text-lg font-medium text-center">
                    选择联系人{chatType === 'group' && selectedContacts.length > 0 && ` (${selectedContacts.length})`}
                  </h2>
                  <p className="text-xs text-gray-400 text-center mt-1">
                    {chatType === 'group' ? '至少选择2人创建群聊' : '选择一个联系人开始聊天'}
                  </p>
                </div>

                {/* 联系人列表 */}
                <div className="overflow-y-auto max-h-[50vh] px-4 pb-4">
                  {contacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                        <User className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-sm text-gray-400 mb-4">暂无联系人</p>
                      <button
                        onClick={() => setCreateStep('newContact')}
                        className="px-5 py-2 bg-blue-500 text-white text-sm rounded-full active:opacity-60 transition-opacity"
                      >
                        新建联系人
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {contacts.map((contact) => (
                        <button
                          key={contact.id}
                          onClick={() => toggleContactSelection(contact.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                            selectedContacts.includes(contact.id)
                              ? 'bg-blue-50 ring-2 ring-blue-500'
                              : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0">
                            {contact.avatar.startsWith('data:') ? (
                              <img src={contact.avatar} alt="头像" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-2xl">{contact.avatar}</span>
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium">{contact.name}</p>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedContacts.includes(contact.id)
                              ? 'bg-blue-500 border-blue-500 scale-110'
                              : 'border-gray-300'
                          }`}>
                            {selectedContacts.includes(contact.id) && (
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 底部按钮 */}
                {contacts.length > 0 && (
                  <div className="px-4 py-4 border-t border-gray-100 bg-white/90 backdrop-blur-sm">
                    <button
                      onClick={handleCreateFromExisting}
                      disabled={
                        chatType === 'private' 
                          ? selectedContacts.length !== 1
                          : selectedContacts.length < 2
                      }
                      className={`w-full py-3.5 rounded-full font-medium transition-all ${
                        (chatType === 'private' && selectedContacts.length === 1) ||
                        (chatType === 'group' && selectedContacts.length >= 2)
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg active:scale-95'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {chatType === 'group' ? '下一步' : '开始聊天'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 新建联系人 */}
          {createStep === 'newContact' && (
            <>
              <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100 flex-shrink-0">
                <button
                  onClick={() => contacts.length > 0 ? setCreateStep('type') : setCreateStep('choose')}
                  className="text-blue-500 active:opacity-60 transition-opacity"
                >
                  返回
                </button>
                <h2 className="tracking-tight">新建联系人</h2>
                <button
                  onClick={handleCreateNewContact}
                  className="text-blue-500 active:opacity-60 transition-opacity"
                >
                  完成
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="bg-gradient-to-b from-blue-50 to-white px-4 py-6 border-b border-gray-100">
                  <div className="flex flex-col items-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-400 via-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden shadow-lg mb-4">
                      {newContact.avatar.startsWith('data:') ? (
                        <img src={newContact.avatar} alt="头像" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl">{newContact.avatar}</span>
                      )}
                    </div>

                    <label className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full cursor-pointer transition-colors shadow-sm mb-3">
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">上传头像</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>

                    <p className="text-xs text-gray-500 mb-2">或选择 Emoji</p>
                    <div className="flex gap-2 flex-wrap justify-center max-w-xs">
                      {emojiList.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => setNewContact({ ...newContact, avatar: emoji })}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                            newContact.avatar === emoji
                              ? 'bg-blue-100 ring-2 ring-blue-500'
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          <span className="text-xl">{emoji}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="px-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">联系人名称</Label>
                    <Input
                      id="name"
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      placeholder="例如：张三"
                      className="bg-gray-50 border-gray-200"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 自定义群聊信息 */}
          {createStep === 'customizeGroup' && (
            <>
              <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100 flex-shrink-0">
                <button
                  onClick={() => setCreateStep('selectContact')}
                  className="text-blue-500 active:opacity-60 transition-opacity"
                >
                  返回
                </button>
                <h2 className="tracking-tight">创建群聊</h2>
                <button
                  onClick={handleFinishGroupCreation}
                  className="text-blue-500 active:opacity-60 transition-opacity"
                >
                  完成
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="bg-gradient-to-b from-blue-50 to-white px-4 py-6 border-b border-gray-100">
                  <div className="flex flex-col items-center">
                    {/* 头像上传区 */}
                    <label className="relative w-24 h-24 rounded-full overflow-hidden shadow-lg mb-4 cursor-pointer group">
                      {groupInfo.avatar.startsWith('data:') ? (
                        <img src={groupInfo.avatar} alt="头像" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-400 via-blue-500 to-purple-500 flex items-center justify-center">
                          <span className="text-4xl">{groupInfo.avatar}</span>
                        </div>
                      )}
                      {/* 悬浮遮罩 */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="w-6 h-6 text-white" />
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleGroupImageUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-gray-400">点击头像上传图片（可选）</p>
                  </div>
                </div>

                <div className="px-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">群聊名称</Label>
                    <Input
                      id="name"
                      value={groupInfo.name}
                      onChange={(e) => setGroupInfo({ ...groupInfo, name: e.target.value })}
                      placeholder="例如：家庭群"
                      className="bg-gray-50 border-gray-200"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}