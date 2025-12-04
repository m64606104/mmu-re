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
  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error('请输入用户名');
      return;
    }

    try {
      toast.loading('正在保存...');
      
      // 使用 setTimeout 让 UI 有机会更新 Loading 状态
      await new Promise(resolve => setTimeout(resolve, 100));

      const updatedUser = {
        ...user,
        name: editName,
        avatar: editAvatar,
        bubbleColor: editBubbleColor
      };
      
      onUpdateUser(updatedUser);
      
      // 延迟一下，让保存动作更有仪式感
      await new Promise(resolve => setTimeout(resolve, 300));
      
      toast.dismiss();
      toast.success('✅ 设置已保存', {
        description: '您的个人信息已成功更新',
        duration: 2000,
      });
    } catch (error) {
      console.error('保存设置失败:', error);
      toast.dismiss();
      toast.error('保存失败，请重试');
    }
  };

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
          <h1 className="text-lg font-semibold text-gray-900">设置</h1>
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium active:opacity-80 transition-all hover:bg-blue-600"
        >
          保存
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {/* 个人信息卡片 */}
        <div className="bg-white mb-2">
          {/* 头像区域 */}
          <div className="flex items-center gap-4 px-4 py-4 border-b border-gray-100">
            <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0">
              {editAvatar.startsWith('data:') ? (
                <img src={editAvatar} alt="头像" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl text-white">{editAvatar}</span>
              )}
            </div>
            <div className="flex-1">
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors text-sm">
                <Upload className="w-4 h-4" />
                <span>更换头像</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* 用户名 */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">用户名</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="请输入用户名"
                className="flex-1 ml-4 border-0 bg-transparent text-right focus:ring-0 px-0"
              />
            </div>
          </div>
        </div>

        {/* 消息气泡颜色 */}
        <div className="bg-white mt-2">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-900">消息气泡颜色</h3>
          </div>
          <div className="px-4 py-3 grid grid-cols-2 gap-2">
            {BUBBLE_COLOR_THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setEditBubbleColor(theme.id)}
                className={`flex items-center gap-2 p-2.5 rounded-lg transition-all ${
                  editBubbleColor === theme.id
                    ? 'bg-blue-50 ring-1 ring-blue-500'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-lg flex-shrink-0"
                  style={{ background: theme.preview }}
                />
                <div className="flex-1 text-left">
                  <p className="text-xs font-medium text-gray-900">{theme.name}</p>
                  <p className="text-xs text-gray-500">{theme.emoji}</p>
                </div>
                {editBubbleColor === theme.id && (
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
  );
}