/**
 * ⚙️ AI儿童个性化设置组件
 * 设置AI的名字、性别、称呼等
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, Save, User, Heart, Users } from 'lucide-react';
import { Conversation } from '../types';
import { smartLoad, smartSave } from '../utils/storage';

interface AIChildSettingsProps {
  child: Conversation;
  onBack: () => void;
  onUpdate: () => void;
}

export default function AIChildSettings({ child, onBack, onUpdate }: AIChildSettingsProps) {
  const [formalName, setFormalName] = useState('');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'neutral'>('neutral');
  const [userTitle, setUserTitle] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (child.aiChildData) {
      setFormalName(child.aiChildData.formalName || child.name);
      setNickname(child.aiChildData.nickname || '');
      setGender(child.aiChildData.gender || 'neutral');
      setUserTitle(child.aiChildData.userTitle || '妈妈');
      setUserName(child.aiChildData.userName || '');
    }
  }, [child]);

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

      {/* Save Button */}
      <div className="bg-white border-t border-gray-200 p-4">
        <button
          onClick={handleSave}
          className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" />
          保存设置
        </button>
      </div>
    </div>
  );
}
