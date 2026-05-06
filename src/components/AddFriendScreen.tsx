import { useState, useRef } from 'react';
import { ChevronLeft, Upload, Key } from 'lucide-react';
import type { CharacterInteractionMode, Conversation } from '../types';

interface AddFriendScreenProps {
  onAddFriend: (friendData: {
    realName: string;
    nickname: string;
    avatar: string;
    systemPrompt: string;
    personality: string;
    languageStyle: string;
    languageExample: string;
    interactionMode?: CharacterInteractionMode;
  }) => void;
  onBack: () => void;
  conversations?: Conversation[]; // 用于好友码添加
  onAddPenPal?: (conversation: Conversation) => void; // 好友码添加回调
}

export default function AddFriendScreen({ onAddFriend, onBack, conversations, onAddPenPal }: AddFriendScreenProps) {
  const [realName, setRealName] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [personality, setPersonality] = useState('');
  const [languageStyle, setLanguageStyle] = useState('');
  const [languageExample, setLanguageExample] = useState('');
  const [interactionMode, setInteractionMode] = useState<CharacterInteractionMode>('companion');
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
    if (!realName.trim()) {
      alert('请输入角色本名');
      return;
    }
    if (!nickname.trim()) {
      alert('请输入备注名');
      return;
    }

    onAddFriend({
      realName: realName.trim(),
      nickname: nickname.trim(),
      avatar,
      systemPrompt: systemPrompt.trim(),
      personality: personality.trim(),
      languageStyle: languageStyle.trim(),
      languageExample: languageExample.trim(),
      interactionMode,
    });
  };

  const handleAddByFriendCode = async () => {
    if (!friendCode.trim()) {
      alert('请输入好友码');
      return;
    }

    if (!conversations || !onAddPenPal) {
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
      onAddPenPal(newConversation);
      
      alert(`✅ 成功添加笔友 ${newConversation.name}！\n\n可以开始聊天了`);
    } catch (error) {
      console.error('添加笔友失败:', error);
      alert('❌ 添加失败：' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <div className="h-full bg-slate-100/80 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={onBack} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6 text-slate-700" />
          </button>
          <h1 className="text-lg font-semibold ml-2 text-slate-900">添加好友</h1>
        </div>
        <button
          onClick={handleAddFriend}
          className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 active:bg-emerald-700 transition-colors"
        >
          创建
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {/* 好友码输入 */}
        <div className="rounded-[26px] border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 shadow-sm p-4">
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
        <div className="text-xs uppercase tracking-[0.18em] text-slate-400 px-1">手动创建角色</div>

        {/* Avatar */}
        <div className="rounded-[26px] border border-slate-200 bg-white shadow-sm p-4">
          <label className="block text-sm font-medium text-slate-700 mb-3">
            角色头像
          </label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-semibold text-2xl">
                  {(nickname || realName).charAt(0) || '?'}
                </span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
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

        {/* 角色本名 */}
        <div className="rounded-[26px] border border-slate-200 bg-white shadow-sm p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            角色本名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={realName}
            onChange={(e) => setRealName(e.target.value)}
            placeholder="角色自己知道的名字（真实姓名/自称）"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>

        {/* 备注名 */}
        <div className="rounded-[26px] border border-slate-200 bg-white shadow-sm p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            备注名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="仅在通讯录/列表中显示，角色本人不会当成自己的本名"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>

        <div className="rounded-[26px] border border-emerald-100 bg-emerald-50/80 shadow-sm p-4">
          <p className="text-xs text-emerald-900 leading-relaxed">
            <span className="font-semibold">角色网名</span>将在创建成功后由角色根据人设自动生成；之后在聊天或群聊中，角色也可随时改名（会自动同步到「角色网名」）。
          </p>
        </div>

        {/* 互动类型 */}
        <div className="rounded-[26px] border border-slate-200 bg-white shadow-sm p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">互动类型</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setInteractionMode('companion')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${
                interactionMode === 'companion'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              陪伴型
            </button>
            <button
              type="button"
              onClick={() => setInteractionMode('tool')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${
                interactionMode === 'tool'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              工具型
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            工具型：回复偏助手/客服式，不跑生活轨迹模拟、不主动发消息、不参与 AI 朋友圈互动。陪伴型：默认角色扮演与日常感。
          </p>
        </div>

        {/* System Prompt */}
        <div className="rounded-[26px] border border-slate-200 bg-white shadow-sm p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            人物设定
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="描述角色的背景、身份、职业等"
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
          />
        </div>

        {/* Personality */}
        <div className="rounded-[26px] border border-slate-200 bg-white shadow-sm p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            性格特征
          </label>
          <textarea
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            placeholder="描述角色的性格特点"
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
          />
        </div>

        {/* Language Style */}
        <div className="rounded-[26px] border border-slate-200 bg-white shadow-sm p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            语言风格
          </label>
          <textarea
            value={languageStyle}
            onChange={(e) => setLanguageStyle(e.target.value)}
            placeholder="描述角色的说话方式和语言习惯"
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
          />
        </div>

        {/* Language Example */}
        <div className="rounded-[26px] border border-slate-200 bg-white shadow-sm p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            语言示例
          </label>
          <textarea
            value={languageExample}
            onChange={(e) => setLanguageExample(e.target.value)}
            placeholder="提供一些角色的典型对话示例"
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
          />
        </div>

        {/* 提示信息 */}
        <div className="bg-blue-50 border border-blue-100 rounded-[20px] p-4">
          <p className="text-sm text-blue-700 leading-relaxed">
            💡 这些设置将影响AI角色的回复风格和内容，帮助创建更真实的对话体验
          </p>
        </div>

        {/* 人际关系提示 */}
        <div className="bg-purple-50 border border-purple-100 rounded-[20px] p-4">
          <p className="text-sm text-purple-700 leading-relaxed">
            👥 <span className="font-semibold">人际关系提示：</span>新建的AI角色会默认与现有的所有AI角色设定为<span className="font-semibold">陌生人</span>关系。您可以稍后在<span className="font-semibold">角色设置</span>中进入<span className="font-semibold">人际关系管理</span>自行调整他们之间的关系。
          </p>
        </div>
      </div>
    </div>
  );
}
