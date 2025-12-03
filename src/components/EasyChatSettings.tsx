import { useState } from 'react';
import { ArrowLeft, Upload, Trash2, UserMinus, UserPlus } from 'lucide-react';
import { EasyChatConversation, EasyChatContact } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

import { cropAndCompressAvatar } from '../utils/imageCompression';

interface EasyChatSettingsProps {
  conversation: EasyChatConversation;
  contacts: EasyChatContact[];
  onBack: () => void;
  onUpdateConversation: (conversation: EasyChatConversation) => void;
  onDeleteConversation: (conversationId: string) => void;
  onUpdateContact: (contact: EasyChatContact) => void;
}

export function EasyChatSettings({
  conversation,
  contacts,
  onBack,
  onUpdateConversation,
  onDeleteConversation,
  onUpdateContact
}: EasyChatSettingsProps) {
  const [editName, setEditName] = useState(conversation.name);
  const [editAvatar, setEditAvatar] = useState(conversation.avatar);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRemoveMemberConfirm, setShowRemoveMemberConfirm] = useState<string | null>(null);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);

  const emojiList = ['👥', '🎉', '💼', '🎮', '📚', '🎨', '⚽', '🎵', '🍕', '☕', '✈️', '🌟', '💡', '🔥', '❤️'];

  const isPrivateChat = conversation.type === 'private';
  const isGroupChat = conversation.type === 'group';

  // 获取联系人信息
  const getContact = (id: string) => {
    return contacts.find(c => c.id === id);
  };

  // 处理图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 重置 input
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过10MB');
      return;
    }

    try {
      toast.loading('正在处理图片...');
      // 自动居中裁剪为正方形并压缩
      const result = await cropAndCompressAvatar(file, 200, 0.8);
      setEditAvatar(result.dataUrl);
      toast.dismiss();
      toast.success('头像已上传');
    } catch (error) {
      console.error('头像上传失败:', error);
      toast.dismiss();
      toast.error('图片处理失败，请重试');
    }
  };

  // 保存修改
  const handleSave = () => {
    if (!editName.trim()) {
      toast.error('请输入名称');
      return;
    }

    if (isPrivateChat) {
      // 私聊：更新联系人信息
      const contact = getContact(conversation.participants[0]);
      if (contact) {
        const updatedContact = {
          ...contact,
          name: editName,
          avatar: editAvatar
        };
        onUpdateContact(updatedContact);

        // 同时更新会话信息
        const updatedConversation = {
          ...conversation,
          name: editName,
          avatar: editAvatar
        };
        onUpdateConversation(updatedConversation);
      }
    } else {
      // 群聊：只更新会话信息
      const updatedConversation = {
        ...conversation,
        name: editName,
        avatar: editAvatar
      };
      onUpdateConversation(updatedConversation);
    }

    toast.success('保存成功');
    onBack(); // 保存后直接返回
  };

  // 删除会话/解散群聊
  const handleDelete = () => {
    onDeleteConversation(conversation.id);
    toast.success(isGroupChat ? '群聊已解散' : '聊天已删除');
    onBack();
  };

  // 移除群成员
  const handleRemoveMember = (memberId: string) => {
    const updatedParticipants = conversation.participants.filter(id => id !== memberId);
    
    if (updatedParticipants.length < 2) {
      toast.error('群聊至少需要2个成员');
      return;
    }

    const updatedConversation = {
      ...conversation,
      participants: updatedParticipants
    };
    onUpdateConversation(updatedConversation);
    setShowRemoveMemberConfirm(null);
    toast.success('已移除成员');
  };

  return (
    <div className="w-full h-full bg-gradient-to-b from-gray-50 to-white flex flex-col">
      {/* 顶部导航栏 - 美化版 */}
      <div className="flex items-center justify-between h-16 px-4 bg-white/90 backdrop-blur-xl border-b border-gray-100 flex-shrink-0 shadow-sm">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" strokeWidth={2.5} />
        </button>
        <h1 className="tracking-tight">
          {isPrivateChat ? '聊天设置' : '群聊设置'}
        </h1>
        <button
          onClick={handleSave}
          className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full transition-all active:scale-95 shadow-sm"
        >
          完成
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {/* 头像和名称区域 - 美化版 */}
        <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 px-4 py-8 mb-2">
          <div className="flex flex-col items-center">
            {/* 头像 */}
            <div className="relative group mb-5">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-purple-500 flex items-center justify-center overflow-hidden shadow-xl ring-4 ring-white">
                {editAvatar.startsWith('data:') ? (
                  <img src={editAvatar} alt="头像" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl">{editAvatar}</span>
                )}
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-white rounded-full shadow-md border border-gray-100">
                <span className="text-xs text-gray-600">点击下方编辑</span>
              </div>
            </div>

            {/* 编辑头像 */}
            <>
              <label className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full cursor-pointer transition-all shadow-lg hover:shadow-xl active:scale-95 mb-4">
                <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="text-sm">上传头像</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              <div className="flex items-center gap-2 mb-3">
                <div className="h-px w-8 bg-gradient-to-r from-transparent to-gray-300"></div>
                <p className="text-xs text-gray-500">或选择 Emoji</p>
                <div className="h-px w-8 bg-gradient-to-l from-transparent to-gray-300"></div>
              </div>
              
              <div className="flex gap-2.5 flex-wrap justify-center max-w-xs mb-6">
                {emojiList.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setEditAvatar(emoji)}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all transform hover:scale-110 ${
                      editAvatar === emoji
                        ? 'bg-gradient-to-br from-blue-400 to-blue-500 ring-2 ring-blue-500 ring-offset-2 shadow-lg scale-110'
                        : 'bg-white hover:bg-gray-50 shadow-sm border border-gray-200'
                    }`}
                  >
                    <span className="text-xl">{emoji}</span>
                  </button>
                ))}
              </div>
            </>

            {/* 名称 */}
            <div className="w-full max-w-xs space-y-2">
              <Label htmlFor="name" className="text-sm text-gray-700">{isPrivateChat ? '联系人名称' : '群聊名称'}</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={isPrivateChat ? '例如：张三' : '例如：我的小组'}
                className="bg-white/80 backdrop-blur-sm border-gray-200 text-center shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-xl h-11"
              />
            </div>
          </div>
        </div>

        {/* 群成员列表 - 美化版 */}
        {isGroupChat && (
          <div className="bg-white mb-2 rounded-2xl mx-3 shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
              <h3 className="text-sm text-gray-600 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                群成员 <span className="text-blue-500">({conversation.participants.length})</span>
              </h3>
            </div>
            <div className="divide-y divide-gray-50">
              {conversation.participants.map((participantId) => {
                const member = getContact(participantId);
                if (!member) return null;

                return (
                  <div key={participantId} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      {/* 头像 */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-md">
                        {member.avatar.startsWith('data:') ? (
                          <img src={member.avatar} alt="头像" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">{member.avatar}</span>
                        )}
                      </div>
                      {/* 名称 */}
                      <div>
                        <p className="font-medium">{member.name}</p>
                      </div>
                    </div>

                    {/* 移除按钮 */}
                    <button
                      onClick={() => setShowRemoveMemberConfirm(participantId)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full active:scale-95 transition-all"
                    >
                      <UserMinus className="w-5 h-5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 添加成员按钮 - 美化版 */}
        {isGroupChat && (
          <div className="bg-white mb-2 rounded-2xl mx-3 shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => setShowAddMemberDialog(true)}
              className="w-full px-4 py-4 text-blue-500 hover:bg-blue-50 active:bg-blue-100 transition-all flex items-center justify-center gap-2 group"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </div>
              <span className="font-medium">添加成员</span>
            </button>
          </div>
        )}

        {/* 危险操作区 - 美化版 */}
        <div className="bg-white rounded-2xl mx-3 shadow-sm border border-red-100 overflow-hidden">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full px-4 py-4 text-red-500 hover:bg-red-50 active:bg-red-100 transition-all flex items-center justify-center gap-2 group"
          >
            <div className="w-8 h-8 rounded-full bg-red-100 group-hover:bg-red-200 flex items-center justify-center transition-colors">
              <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </div>
            <span className="font-medium">{isGroupChat ? '解散群聊' : '删除聊天'}</span>
          </button>
        </div>

        {/* 底部留白 */}
        <div className="h-6"></div>
      </div>

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center animate-in fade-in duration-200">
          <div className="w-[85%] max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="px-6 py-6">
              <h3 className="text-center mb-2">确认{isGroupChat ? '解散' : '删除'}</h3>
              <p className="text-sm text-gray-500 text-center">
                {isGroupChat 
                  ? '解散后，所有群成员将无法再查看群聊消息' 
                  : '删除后，聊天记录将被清空'}
              </p>
            </div>
            <div className="grid grid-cols-2 border-t border-gray-100">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="py-4 text-gray-600 active:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="py-4 text-red-500 border-l border-gray-100 active:bg-red-50 transition-colors"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 移除成员确认弹窗 */}
      {showRemoveMemberConfirm && (
        <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center animate-in fade-in duration-200">
          <div className="w-[85%] max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="px-6 py-6">
              <h3 className="text-center mb-2">确认移除</h3>
              <p className="text-sm text-gray-500 text-center">
                确定要移除该成员吗？
              </p>
            </div>
            <div className="grid grid-cols-2 border-t border-gray-100">
              <button
                onClick={() => setShowRemoveMemberConfirm(null)}
                className="py-4 text-gray-600 active:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleRemoveMember(showRemoveMemberConfirm)}
                className="py-4 text-red-500 border-l border-gray-100 active:bg-red-50 transition-colors"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加成员对话框 */}
      {showAddMemberDialog && (
        <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center animate-in fade-in duration-200">
          <div className="w-[85%] max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="px-6 py-6">
              <h3 className="text-center mb-2">添加成员</h3>
              <p className="text-sm text-gray-500 text-center">
                选择要添加的成员
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {contacts.map((contact) => {
                if (conversation.participants.includes(contact.id)) return null;

                return (
                  <div key={contact.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* 头像 */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {contact.avatar.startsWith('data:') ? (
                          <img src={contact.avatar} alt="头像" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">{contact.avatar}</span>
                        )}
                      </div>
                      {/* 名称 */}
                      <div>
                        <p>{contact.name}</p>
                      </div>
                    </div>

                    {/* 添加按钮 */}
                    <button
                      onClick={() => {
                        const updatedParticipants = [...conversation.participants, contact.id];
                        const updatedConversation = {
                          ...conversation,
                          participants: updatedParticipants
                        };
                        onUpdateConversation(updatedConversation);
                        setShowAddMemberDialog(false);
                        toast.success('已添加成员');
                      }}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-full active:opacity-60 transition-all"
                    >
                      <UserPlus className="w-5 h-5" />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 border-t border-gray-100">
              <button
                onClick={() => setShowAddMemberDialog(false)}
                className="py-4 text-gray-600 active:bg-gray-50 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}