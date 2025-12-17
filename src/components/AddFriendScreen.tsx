import { useState, useRef } from 'react';
import { ChevronLeft, Upload, Key } from 'lucide-react';
import { Conversation } from '../types';

interface AddFriendScreenProps {
  onAddFriend: (friendData: {
    nickname: string;
    username: string;
    avatar: string;
    systemPrompt: string;
    personality: string;
    languageStyle: string;
    languageExample: string;
  }) => void;
  onBack: () => void;
  conversations?: Conversation[]; // 用于好友码添加
  onAddFriend?: (conversation: Conversation) => void; // 好友码添加回调
}

export default function AddFriendScreen({ onAddFriend, onBack, conversations, onAddFriend }: AddFriendScreenProps) {
  const [nickname, setNickname] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [personality, setPersonality] = useState('');
  const [languageStyle, setLanguageStyle] = useState('');
  const [languageExample, setLanguageExample] = useState('');
  const [friendCode, setFriendCode] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddFriend = () => {
    if (!nickname.trim()) {
      alert('请输入备注名');
      return;
    }

    onAddFriend({
      nickname: nickname.trim(),
      username: username.trim(),
      avatar,
      systemPrompt: systemPrompt.trim(),
      personality: personality.trim(),
      languageStyle: languageStyle.trim(),
      languageExample: languageExample.trim(),
    });
  };

  const handleAddByFriendCode = async () => {
    if (!friendCode.trim()) {
      alert('请输入好友码');
      return;
    }

    if (!conversations || !onAddFriend) {
      alert('好友码功能未启用');
      return;
    }

    try {
      // 动态导入好友码系统
      const { findLetterByFriendCode, createConversationFromLetter } = await import('../utils/friendCodeSystem');
      
      // 查找信件
      const letter = findLetterByFriendCode(friendCode.trim().toUpperCase());
      
      if (!letter) {
        alert('❌ 好友码无效\n\n请检查好友码是否正确');
        return;
      }

      // 创建私聊角色
      const newConversation = createConversationFromLetter(letter, conversations);
      
      if (!newConversation) {
        alert('❌ 该笔友已经添加过了');
        return;
      }

      // 调用回调
      onAddFriend(newConversation);
      
      alert(`✅ 成功添加笔友 ${newConversation.name}！\n\n可以开始聊天了`);
      onBack();
    } catch (error) {
      console.error('添加笔友失败:', error);
      alert('❌ 添加失败：' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
        <button onClick={onBack} className="p-2 -ml-2">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold ml-2">添加好友</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 好友码输入 */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Key className="w-5 h-5 text-orange-600" />
            <label className="block text-sm font-semibold text-orange-900">
              通过好友码添加
            </label>
          </div>
          <p className="text-xs text-orange-700 mb-3">
            📮 如果你收到了笔友的好友码，可以在这里输入添加为好友
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={friendCode}
              onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
              placeholder="输入好友码（如：PENPAL-PRESET12-AB3C）"
              className="flex-1 px-3 py-2 border-2 border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm"
            />
            <button
              onClick={handleAddByFriendCode}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 active:bg-orange-700 transition-colors whitespace-nowrap"
            >
              添加
            </button>
          </div>
        </div>

        {/* 分隔线 */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-300"></div>
          <span className="text-sm text-gray-500">或手动创建角色</span>
          <div className="flex-1 h-px bg-gray-300"></div>
        </div>

        {/* Avatar */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            角色头像
          </label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-semibold text-2xl">
                  {nickname.charAt(0) || '?'}
                </span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Upload className="w-4 h-4" />
              上传头像
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Nickname */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            备注名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="输入角色备注名"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Username */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            角色网名
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="例如：AI小助手2024"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">在群聊中显示的网名</p>
        </div>

        {/* System Prompt */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            人物设定
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="描述角色的背景、身份、职业等"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Personality */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            性格特征
          </label>
          <textarea
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            placeholder="描述角色的性格特点"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Language Style */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            语言风格
          </label>
          <textarea
            value={languageStyle}
            onChange={(e) => setLanguageStyle(e.target.value)}
            placeholder="描述角色的说话方式和语言习惯"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Language Example */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            语言示例
          </label>
          <textarea
            value={languageExample}
            onChange={(e) => setLanguageExample(e.target.value)}
            placeholder="提供一些角色的典型对话示例"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* 提示信息 */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <p className="text-sm text-blue-700 leading-relaxed">
            💡 这些设置将影响AI角色的回复风格和内容，帮助创建更真实的对话体验
          </p>
        </div>

        {/* 人际关系提示 */}
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
          <p className="text-sm text-purple-700 leading-relaxed">
            👥 <span className="font-semibold">人际关系提示：</span>新建的AI角色会默认与现有的所有AI角色设定为<span className="font-semibold">陌生人</span>关系。您可以稍后在<span className="font-semibold">角色设置</span>中进入<span className="font-semibold">人际关系管理</span>自行调整他们之间的关系。
          </p>
        </div>

        {/* Add Friend Button */}
        <button
          onClick={handleAddFriend}
          className="w-full bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 active:bg-green-700 transition-colors"
        >
          确认添加
        </button>
      </div>
    </div>
  );
}
