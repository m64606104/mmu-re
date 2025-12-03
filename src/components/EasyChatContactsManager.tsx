import { useState } from 'react';
import { ArrowLeft, Plus, Upload, X, Trash2, UserPlus } from 'lucide-react';
import { EasyChatContact } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { BUBBLE_COLOR_THEMES } from '../utils/bubbleColors';

interface EasyChatContactsManagerProps {
  onBack: () => void;
  contacts: EasyChatContact[];
  setContacts: (contacts: EasyChatContact[]) => void;
}

export function EasyChatContactsManager({ onBack, contacts, setContacts }: EasyChatContactsManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    avatar: '👤',
    bubbleColor: 'blue'
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

  // 添加联系人
  const handleAddContact = () => {
    if (!newContact.name.trim()) {
      toast.error('请输入联系人名称');
      return;
    }

    const contact: EasyChatContact = {
      id: Date.now().toString(),
      name: newContact.name,
      avatar: newContact.avatar,
      bubbleColor: newContact.bubbleColor
    };

    setContacts([...contacts, contact]);
    setShowAddDialog(false);
    setNewContact({ name: '', avatar: '👤', bubbleColor: 'blue' });
    toast.success('联系人添加成功');
  };

  // 删除联系人
  const handleDeleteContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
    toast.success('联系人删除成功');
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
        <h1 className="tracking-tight">联系人</h1>
        <button
          onClick={() => setShowAddDialog(true)}
          className="p-2 -mr-2 rounded-full hover:bg-blue-50 active:bg-blue-100 transition-all group"
        >
          <UserPlus className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
        </button>
      </div>

      {/* 联系人列表 - 美化版 */}
      <div className="flex-1 overflow-y-auto">
        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 px-8">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center border-2 border-dashed border-gray-200">
                <UserPlus className="w-12 h-12 text-gray-300" strokeWidth={1.5} />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                <Plus className="w-5 h-5 text-white" strokeWidth={3} />
              </div>
            </div>
            <p className="text-center mb-2">暂无联系人</p>
            <p className="text-sm text-gray-300 text-center">点击右上角 + 添加联系人</p>
          </div>
        ) : (
          <div className="py-2 px-3 space-y-1">
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-white transition-all group">
                {/* 头像 */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 via-blue-500 to-purple-500 flex items-center justify-center shadow-md group-hover:shadow-lg overflow-hidden flex-shrink-0 transition-shadow">
                  {contact.avatar.startsWith('data:') ? (
                    <img src={contact.avatar} alt="头像" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">{contact.avatar}</span>
                  )}
                </div>

                {/* 名称 */}
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{contact.name}</p>
                  <p className="text-xs text-gray-400 truncate">联系人</p>
                </div>

                {/* 删除按钮 */}
                <button
                  onClick={() => handleDeleteContact(contact.id)}
                  className="p-2 hover:bg-red-50 rounded-full transition-all active:scale-95 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-5 h-5 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 添加联系人对话框 */}
      {showAddDialog && (
        <div className="absolute inset-0 bg-black/40 z-50 flex flex-col animate-in fade-in duration-200">
          <div className="w-full h-[calc(100%-80px)] mt-auto bg-white overflow-hidden flex flex-col rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* 头部 */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100 bg-white/80 backdrop-blur-xl flex-shrink-0">
              <button
                onClick={() => setShowAddDialog(false)}
                className="text-blue-500 active:opacity-60 transition-opacity"
              >
                取消
              </button>
              <h2 className="tracking-tight">添加联系人</h2>
              <button
                onClick={handleAddContact}
                className="text-blue-500 active:opacity-60 transition-opacity"
              >
                完成
              </button>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto">
              {/* 头像预览区域 */}
              <div className="bg-gradient-to-b from-blue-50 to-white px-4 py-6 border-b border-gray-100">
                <div className="flex flex-col items-center">
                  {/* 当前头像预览 */}
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-400 via-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden shadow-lg mb-4">
                    {newContact.avatar.startsWith('data:') ? (
                      <img src={newContact.avatar} alt="头像" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">{newContact.avatar}</span>
                    )}
                  </div>

                  <h3 className="mb-1">新联系人</h3>
                  <p className="text-sm text-gray-500 mb-4">自定义联系人头像</p>

                  {/* 上传按钮 */}
                  <label className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-full cursor-pointer transition-colors shadow-sm mb-3">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">上传头像</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Emoji选择 */}
                  <p className="text-xs text-gray-500 mb-2">或选择 Emoji</p>
                  <div className="flex gap-2 flex-wrap justify-center max-w-xs">
                    {emojiList.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setNewContact({ ...newContact, avatar: emoji })}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                          newContact.avatar === emoji
                            ? 'bg-blue-100 ring-2 ring-blue-500 scale-110'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        <span className="text-xl">{emoji}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 表单 */}
              <div className="px-4 py-4 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-700">联系人名称</Label>
                  <Input
                    id="name"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    placeholder="例如：张三"
                    className="bg-gray-50 border-gray-200 focus:border-blue-500"
                  />
                </div>

                {/* 气泡颜色选择 */}
                <div className="space-y-3">
                  <Label className="text-gray-700">消息气泡颜色</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {BUBBLE_COLOR_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setNewContact({ ...newContact, bubbleColor: theme.id })}
                        className={`flex items-center gap-2 p-2.5 rounded-lg transition-all ${
                          newContact.bubbleColor === theme.id
                            ? 'bg-blue-50 ring-2 ring-blue-500'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        {/* 颜色预览 */}
                        <div
                          className="w-10 h-10 rounded-md flex-shrink-0 shadow-sm"
                          style={{ background: theme.preview }}
                        />
                        
                        {/* 名称 */}
                        <div className="flex-1 text-left">
                          <p className="text-xs">{theme.name}</p>
                        </div>

                        {/* 选中标记 */}
                        {newContact.bubbleColor === theme.id && (
                          <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}