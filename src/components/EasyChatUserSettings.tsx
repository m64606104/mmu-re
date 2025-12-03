import { useState } from 'react';
import { ArrowLeft, Upload } from 'lucide-react';
import { EasyChatUser } from '../types';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { BUBBLE_COLOR_THEMES, getBubbleColorTheme } from '../utils/bubbleColors';
import { cropAndCompressAvatar } from '../utils/imageCompression';

interface EasyChatUserSettingsProps {
  user: EasyChatUser;
  onBack: () => void;
  onUpdateUser: (user: EasyChatUser) => void;
}

export function EasyChatUserSettings({ user, onBack, onUpdateUser }: EasyChatUserSettingsProps) {
  const [editName, setEditName] = useState(user.name);
  const [editAvatar, setEditAvatar] = useState(user.avatar);
  const [editBubbleColor, setEditBubbleColor] = useState(user.bubbleColor || 'blue');

  const emojiList = ['😊', '😎', '🥰', '😄', '🤗', '😇', '🙂', '😉', '🤓', '😺', '🐶', '🐼', '🦁', '🐯', '🦊'];

  // 处理图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 重置 input，允许重复选择同一文件
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
      toast.success('头像已更新');
    } catch (error) {
      console.error('头像上传失败:', error);
      toast.dismiss();
      toast.error('图片处理失败，请重试');
    }
  };

  // 保存修改
  const handleSave = () => {
    if (!editName.trim()) {
      toast.error('请输入用户名');
      return;
    }

    const updatedUser = {
      ...user,
      name: editName,
      avatar: editAvatar,
      bubbleColor: editBubbleColor
    };
    onUpdateUser(updatedUser);
    toast.success('保存成功');
    onBack();
  };

  return (
    <div className="w-full h-full bg-gray-50 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between h-20 px-4 bg-white border-b border-gray-200 flex-shrink-0">
        <button
          onClick={onBack}
          className="text-blue-500 active:opacity-60 transition-opacity"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="tracking-tight">用户设置</h1>
        <button
          onClick={handleSave}
          className="text-blue-500 active:opacity-60 transition-opacity"
        >
          完成
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {/* 头像和名称区域 */}
        <div className="bg-white px-4 py-6 mb-4">
          <div className="flex flex-col items-center">
            {/* 头像 */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center overflow-hidden shadow-lg mb-4">
              {editAvatar.startsWith('data:') ? (
                <img src={editAvatar} alt="头像" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl">{editAvatar}</span>
              )}
            </div>

            {/* 编辑头像 */}
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
            <p className="text-xs text-gray-400 mb-4">建议使用正方形图片 (系统会自动裁剪)</p>

            <p className="text-xs text-gray-500 mb-2">或选择 Emoji</p>
            <div className="flex gap-2 flex-wrap justify-center max-w-xs mb-4">
              {emojiList.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setEditAvatar(emoji)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    editAvatar === emoji
                      ? 'bg-blue-100 ring-2 ring-blue-500'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <span className="text-xl">{emoji}</span>
                </button>
              ))}
            </div>

            {/* 名称 */}
            <div className="w-full max-w-xs space-y-2">
              <Label htmlFor="name">用户名</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="例如：小明"
                className="bg-gray-50 border-gray-200 text-center"
              />
            </div>
          </div>
        </div>

        {/* 气泡颜色选择区域 */}
        <div className="bg-white px-4 py-6">
          <h2 className="text-center mb-4">消息气泡颜色</h2>
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
            {BUBBLE_COLOR_THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setEditBubbleColor(theme.id)}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  editBubbleColor === theme.id
                    ? 'bg-blue-50 ring-2 ring-blue-500'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                {/* 颜色预览 */}
                <div
                  className="w-12 h-12 rounded-lg flex-shrink-0 shadow-sm"
                  style={{ background: theme.preview }}
                />
                
                {/* 名称和 Emoji */}
                <div className="flex-1 text-left">
                  <p className="text-sm">{theme.name}</p>
                  <p className="text-xs text-gray-500">{theme.emoji}</p>
                </div>

                {/* 选中标记 */}
                {editBubbleColor === theme.id && (
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}