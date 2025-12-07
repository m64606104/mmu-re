import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { UserProfile, Screen } from '../types';

interface ProfileScreenProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onNavigate: (screen: Screen) => void;
  onBack: () => void;
  momentsCount: number;
  contactsCount: number;
}

export default function ProfileScreen({
  userProfile,
  onUpdateProfile,
  onNavigate,
  onBack,
  momentsCount,
  contactsCount,
}: ProfileScreenProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(userProfile.username);
  const [bio, setBio] = useState(userProfile.bio);
  const [avatar, setAvatar] = useState(userProfile.avatar || '');
  const [coverImage, setCoverImage] = useState(userProfile.coverImage || '');
  // 个人资料状态
  const [name, setName] = useState(userProfile.personalInfo?.name || '');
  const [gender, setGender] = useState(userProfile.personalInfo?.gender || '');
  const [age, setAge] = useState(userProfile.personalInfo?.age || '');
  const [background, setBackground] = useState(userProfile.personalInfo?.background || '');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // 计算缩放比例
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // 压缩质量0.7
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedDataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 400, 400);
        setAvatar(compressed);
      } catch (error) {
        console.error('图片压缩失败:', error);
        alert('图片处理失败，请尝试其他图片');
      }
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 800, 400);
        setCoverImage(compressed);
      } catch (error) {
        console.error('图片压缩失败:', error);
        alert('图片处理失败，请尝试其他图片');
      }
    }
  };

  const handleSave = () => {
    onUpdateProfile({
      username,
      bio,
      avatar,
      coverImage,
      personalInfo: {
        name: name || undefined,
        gender: gender || undefined,
        age: age || undefined,
        background: background || undefined,
      },
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setUsername(userProfile.username);
    setBio(userProfile.bio);
    setAvatar(userProfile.avatar || '');
    setCoverImage(userProfile.coverImage || '');
    setName(userProfile.personalInfo?.name || '');
    setGender(userProfile.personalInfo?.gender || '');
    setAge(userProfile.personalInfo?.age || '');
    setBackground(userProfile.personalInfo?.background || '');
    setIsEditing(false);
  };

  return (
    <div className="h-full bg-[#EDEDED] flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <button onClick={onBack} className="p-2 -ml-2">
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">我的资料</h1>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Cover Image */}
        <div className="relative h-48 bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400">
          {coverImage && (
            <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
          )}
          {isEditing && (
            <button
              onClick={() => coverInputRef.current?.click()}
              className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
            >
              <Upload className="w-4 h-4" />
              更换封面
            </button>
          )}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverUpload}
            className="hidden"
          />
        </div>

        {/* Avatar and Info */}
        <div className="bg-white px-6 pb-6">
          <div className="relative -mt-16 mb-4">
            <div className="w-28 h-28 rounded-full bg-white p-1 shadow-lg">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-semibold text-3xl">
                    {username.charAt(0)}
                  </span>
                )}
              </div>
            </div>
            {isEditing && (
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full shadow-lg"
              >
                <Upload className="w-4 h-4" />
              </button>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  用户名
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入用户名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  个性签名
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="分享生活，记录美好"
                />
              </div>

              {/* 个人资料模块（仅编辑模式显示，供AI参考） */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">个人资料</h3>
                  <span className="text-xs text-gray-500">仅供AI参考</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      姓名/昵称
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="选填，如：张三"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        性别
                      </label>
                      <input
                        type="text"
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="如：男/女"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        年龄
                      </label>
                      <input
                        type="text"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="如：25"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      身份背景
                    </label>
                    <textarea
                      value={background}
                      onChange={(e) => setBackground(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="选填，如：大学生、程序员、设计师等"
                    />
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    💡 这些信息不会在个人主页显示，仅用于帮助AI更好地了解你，提供更个性化的对话体验。
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{username}</h2>
              <p className="text-gray-500 text-sm">{bio}</p>
            </div>
          )}
        </div>

        {/* Edit Button */}
        <div className="px-6 py-4">
          {isEditing ? (
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 rounded-lg bg-black text-white font-medium"
              >
                保存
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full py-3 rounded-lg bg-black text-white font-medium"
            >
              编辑资料
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="bg-white mx-4 rounded-xl p-6 mb-4">
          <div className="flex justify-around">
            <button 
              onClick={() => onNavigate('contacts')}
              className="text-center hover:bg-gray-50 rounded-lg p-2 transition-colors"
            >
              <div className="text-2xl font-bold text-gray-900">{contactsCount}</div>
              <div className="text-sm text-gray-500 mt-1">好友</div>
            </button>
            <button 
              onClick={() => onNavigate('moments')}
              className="text-center hover:bg-gray-50 rounded-lg p-2 transition-colors"
            >
              <div className="text-2xl font-bold text-gray-900">{momentsCount}</div>
              <div className="text-sm text-gray-500 mt-1">动态</div>
            </button>
            <div className="text-center p-2">
              <div className="text-2xl font-bold text-gray-900">0</div>
              <div className="text-sm text-gray-500 mt-1">获赞</div>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="bg-white mx-4 rounded-xl overflow-hidden mb-4">
          <button
            onClick={() => onNavigate('moments')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <span className="text-gray-900 font-medium">朋友圈</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <div className="h-px bg-gray-100 mx-6"></div>
          <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors">
            <span className="text-gray-900 font-medium">收藏</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <div className="h-px bg-gray-100 mx-6"></div>
          <button
            onClick={() => onNavigate('sticker-management')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <span className="text-gray-900 font-medium">表情包</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <div className="h-px bg-gray-100 mx-6"></div>
          <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors">
            <span className="text-gray-900 font-medium">相册</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <div className="h-px bg-gray-100 mx-6"></div>
          <button
            onClick={() => onNavigate('wallet')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <span className="text-gray-900 font-medium">钱包</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
