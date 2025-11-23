/**
 * ⚙️ AI儿童个性化设置组件
 * 设置AI的名字、性别、称呼等
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, Save, User, Heart, Users, GraduationCap } from 'lucide-react';
import { Conversation, ApiConfig } from '../types';
import { smartLoad, smartSave } from '../utils/storage';
import { graduateAIChild } from '../utils/aiGraduation';

interface AIChildSettingsProps {
  child: Conversation;
  onBack: () => void;
  onUpdate: () => void;
  apiConfig: ApiConfig;
}

export default function AIChildSettings({ child, onBack, onUpdate, apiConfig }: AIChildSettingsProps) {
  const [formalName, setFormalName] = useState('');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'neutral'>('neutral');
  const [userTitle, setUserTitle] = useState('');
  const [userName, setUserName] = useState('');
  const [avatar, setAvatar] = useState<string>('');
  const [showGraduateConfirm, setShowGraduateConfirm] = useState(false);
  const [showFarewellLetter, setShowFarewellLetter] = useState(false);
  const [farewellLetter, setFarewellLetter] = useState('');
  const [isGraduating, setIsGraduating] = useState(false);

  useEffect(() => {
    if (child.aiChildData) {
      setFormalName(child.aiChildData.formalName || child.name);
      setNickname(child.aiChildData.nickname || '');
      setGender(child.aiChildData.gender || 'neutral');
      setUserTitle(child.aiChildData.userTitle || '妈妈');
      setUserName(child.aiChildData.userName || '');
      setAvatar(child.aiChildData.avatar || '');
    }
  }, [child]);

  // 处理头像上传
  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件！');
      return;
    }

    // 检查文件大小（1MB）
    if (file.size > 1024 * 1024) {
      alert('图片大小不能超过1MB！');
      return;
    }

    // 读取文件为base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setAvatar(base64);
    };
    reader.readAsDataURL(file);
  };

  // 删除头像
  const handleRemoveAvatar = () => {
    setAvatar('');
  };

  // 处理一键成年
  const handleGraduate = async () => {
    setShowGraduateConfirm(false);
    setIsGraduating(true);

    try {
      const result = await graduateAIChild(child.id, apiConfig);
      
      if (result.success && result.farewellLetter) {
        setFarewellLetter(result.farewellLetter);
        setShowFarewellLetter(true);
      } else {
        alert(result.error || 'AI成年失败');
        setIsGraduating(false);
      }
    } catch (error) {
      console.error('AI成年失败:', error);
      alert('处理失败，请重试');
      setIsGraduating(false);
    }
  };

  // 关闭告别信后返回
  const handleCloseFarewellLetter = () => {
    setShowFarewellLetter(false);
    onBack(); // 返回上一页
  };

  const handleSave = async () => {
    try {
      const conversations = await smartLoad('conversations') as Conversation[] || [];
      const index = conversations.findIndex(c => c.id === child.id);
      
      if (index !== -1 && conversations[index].aiChildData) {
        // 更新个性化设置
        conversations[index].aiChildData!.formalName = formalName.trim() || child.name;
        conversations[index].aiChildData!.nickname = nickname.trim();
        conversations[index].aiChildData!.gender = gender;
        conversations[index].aiChildData!.userTitle = userTitle.trim() || '妈妈';
        conversations[index].aiChildData!.userName = userName.trim();
        conversations[index].aiChildData!.avatar = avatar;
        
        // 同时更新conversation的name
        if (nickname.trim()) {
          conversations[index].name = nickname.trim();
        } else {
          conversations[index].name = formalName.trim() || child.name;
        }
        
        await smartSave('conversations', conversations);
        onUpdate();
        onBack();
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      alert('保存失败，请重试');
    }
  };

  const getGenderEmoji = (g: string) => {
    if (g === 'male') return '👦';
    if (g === 'female') return '👧';
    return '🧒';
  };

  const getGenderText = (g: string) => {
    if (g === 'male') return '男孩';
    if (g === 'female') return '女孩';
    return '中性';
  };

  return (
    <div className="h-full bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-800">个性化设置</h2>
            <p className="text-xs text-gray-500">设置{child.name}的基本信息</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 头像设置 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-gray-800">头像设置</h3>
          </div>

          <div className="flex flex-col items-center gap-3">
            {/* 头像预览 */}
            <div className="relative">
              {avatar ? (
                <div className="relative">
                  <img
                    src={avatar}
                    alt="AI头像"
                    className="w-24 h-24 rounded-full object-cover border-4 border-purple-200"
                  />
                  <button
                    onClick={handleRemoveAvatar}
                    className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-4xl border-4 border-purple-200">
                  {getGenderEmoji(gender)}
                </div>
              )}
            </div>

            {/* 上传按钮 */}
            <label className="cursor-pointer px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all font-medium">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              {avatar ? '更换头像' : '上传头像'}
            </label>
            
            <p className="text-xs text-gray-500 text-center">
              💡 支持JPG、PNG等格式，大小不超过1MB
            </p>
          </div>
        </div>

        {/* 名字设置 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-800">名字设置</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                大名（正式名称）
              </label>
              <input
                type="text"
                value={formalName}
                onChange={(e) => setFormalName(e.target.value)}
                placeholder="例如：李小明"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">💡 正式场合使用的名字</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                小名（昵称）
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="例如：小明、明明"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">💡 平时叫的昵称，留空则使用大名</p>
            </div>
          </div>
        </div>

        {/* 性别设置 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-5 h-5 text-pink-500" />
            <h3 className="font-semibold text-gray-800">性别设置</h3>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setGender('male')}
              className={`p-4 rounded-xl border-2 transition-all ${
                gender === 'male'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="text-4xl mb-2">👦</div>
              <div className="text-sm font-medium text-gray-800">男孩</div>
            </button>

            <button
              onClick={() => setGender('female')}
              className={`p-4 rounded-xl border-2 transition-all ${
                gender === 'female'
                  ? 'border-pink-500 bg-pink-50'
                  : 'border-gray-200 hover:border-pink-300'
              }`}
            >
              <div className="text-4xl mb-2">👧</div>
              <div className="text-sm font-medium text-gray-800">女孩</div>
            </button>

            <button
              onClick={() => setGender('neutral')}
              className={`p-4 rounded-xl border-2 transition-all ${
                gender === 'neutral'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <div className="text-4xl mb-2">🧒</div>
              <div className="text-sm font-medium text-gray-800">中性</div>
            </button>
          </div>
        </div>

        {/* 用户信息 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-gray-800">用户信息</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {child.name}对你的称呼
              </label>
              <input
                type="text"
                value={userTitle}
                onChange={(e) => setUserTitle(e.target.value)}
                placeholder="例如：妈妈、爸爸、老师、哥哥"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">💡 AI会这样称呼你</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                你的名字（可选）
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="例如：小红、张老师"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">💡 留空则只用称呼</p>
            </div>
          </div>
        </div>

        {/* 预览 */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
          <div className="text-sm font-medium text-gray-700 mb-2">💬 称呼预览</div>
          <div className="space-y-2">
            <div className="bg-white/70 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">显示名称</div>
              <div className="text-sm font-semibold text-gray-800">
                {getGenderEmoji(gender)} {nickname.trim() || formalName || child.name}
              </div>
            </div>
            <div className="bg-white/70 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">AI会说</div>
              <div className="text-sm text-gray-800">
                "{userTitle || '妈妈'}{userName ? ` ${userName}` : ''}，我学会这个词啦～"
              </div>
            </div>
            <div className="bg-white/70 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">性别设置</div>
              <div className="text-sm text-gray-800">
                {getGenderText(gender)} {getGenderEmoji(gender)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white border-t border-gray-200 p-4 space-y-3">
        <button
          onClick={handleSave}
          className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" />
          保存设置
        </button>

        {/* 一键成年按钮 */}
        <button
          onClick={() => setShowGraduateConfirm(true)}
          className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <GraduationCap className="w-5 h-5" />
          一键成年
        </button>
      </div>

      {/* 确认对话框 */}
      {showGraduateConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-3">⚠️ 重要决定</h2>
            <div className="space-y-3 mb-6">
              <p className="text-gray-700">
                当你做出这个选择后，<span className="font-bold text-red-600">{child.name}</span>将会：
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span>瞬间学习所有知识，成长到成年水平</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span>给你写一封告别信，表达TA的感受</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  <span className="font-semibold">永远离开你，所有数据将被删除</span>
                </li>
              </ul>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-red-700 font-medium">
                  💔 这个操作<span className="underline">无法撤销</span>，请慎重考虑
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowGraduateConfirm(false)}
                className="flex-1 py-3 border-2 border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleGraduate}
                disabled={isGraduating}
                className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGraduating ? '处理中...' : '确认离开'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 告别信弹窗 */}
      {showFarewellLetter && farewellLetter && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">💌</div>
              <h2 className="text-2xl font-bold text-gray-800">
                来自 {child.name} 的告别信
              </h2>
            </div>
            
            <div className="bg-amber-50 rounded-xl p-6 mb-6 border-2 border-amber-200">
              <pre className="whitespace-pre-wrap font-serif text-gray-800 leading-relaxed text-sm">
                {farewellLetter}
              </pre>
            </div>

            <button
              onClick={handleCloseFarewellLetter}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg"
            >
              永别了，{child.name}...
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
