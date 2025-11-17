/**
 * 自定义笔友角色创建器
 * 允许用户创建影视、小说、动漫等角色作为笔友
 */

import React, { useState, useEffect } from 'react';
import { X, Sparkles, User, MapPin, Book } from 'lucide-react';
import { BottleAI } from '../types/letter';
import { generateRandomName } from '../utils/nameGenerator';

interface CustomPenPalCreatorProps {
  onClose: () => void;
  onConfirm: (penPal: BottleAI) => void;
}

// 常用头像emoji
const AVATAR_OPTIONS = [
  '👨', '👩', '🧑', '👦', '👧', '🧒',
  '👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓', '👨‍🏫', '👩‍🏫',
  '👨‍⚕️', '👩‍⚕️', '👨‍🎤', '👩‍🎤', '👨‍🎨', '👩‍🎨',
  '🦸‍♂️', '🦸‍♀️', '🧙‍♂️', '🧙‍♀️', '🧚‍♂️', '🧚‍♀️',
  '🤴', '👸', '🧝‍♂️', '🧝‍♀️', '🧛‍♂️', '🧛‍♀️',
  '😺', '😸', '😹', '😻', '😼', '😽',
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊',
  '🌟', '⭐', '✨', '💫', '🌙', '☀️'
];

const CustomPenPalCreator: React.FC<CustomPenPalCreatorProps> = ({
  onClose,
  onConfirm
}) => {
  const [penName, setPenName] = useState('');
  const [avatar, setAvatar] = useState('👤');
  const [rolePrompt, setRolePrompt] = useState('');
  const [background, setBackground] = useState('');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  useEffect(() => {
    setPenName(generateRandomName());
  }, []);

  const handleRandomName = () => {
    setPenName(generateRandomName());
  };

  const handleConfirm = () => {
    if (!rolePrompt.trim()) {
      alert('⚠️ 请填写角色设定（必填项）');
      return;
    }

    const customPenPal: BottleAI = {
      id: `custom_penpal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: penName.trim() || generateRandomName(),
      avatar: avatar,
      personality: rolePrompt.trim(), // 使用角色设定作为性格描述
      location: '虚拟世界',
      hobby: '与笔友交流',
      isCustom: true,
      customRolePrompt: rolePrompt.trim(),
      customBackground: background.trim() || undefined
    };

    onConfirm(customPenPal);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部栏 */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Sparkles size={24} />
            <h2 className="text-xl font-bold">创建自定义笔友</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={24} className="text-white" />
          </button>
        </div>

        {/* 表单内容 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* 说明 */}
          <div className="bg-purple-50 border-l-4 border-purple-400 p-4 mb-6 rounded-r-lg">
            <div className="text-sm text-purple-800">
              <div className="font-medium mb-1">💡 使用提示</div>
              <div className="text-xs space-y-1">
                <div>• 可以创建影视、小说、动漫等角色作为笔友</div>
                <div>• <span className="text-red-600 font-medium">角色设定为必填项</span>，其他可选</div>
                <div>• 创建后会自动加入笔友列表，可以长期通信</div>
              </div>
            </div>
          </div>

          {/* 头像选择 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User size={16} className="inline mr-1" />
              头像
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="w-16 h-16 text-4xl bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center justify-center"
              >
                {avatar}
              </button>
              <div className="text-xs text-gray-500">
                点击选择头像
              </div>
            </div>
            
            {/* 头像选择器 */}
            {showAvatarPicker && (
              <div className="mt-3 p-3 bg-gray-50 rounded-xl max-h-48 overflow-y-auto">
                <div className="grid grid-cols-8 gap-2">
                  {AVATAR_OPTIONS.map((emoji, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setAvatar(emoji);
                        setShowAvatarPicker(false);
                      }}
                      className={`w-10 h-10 text-2xl hover:bg-gray-200 rounded-lg transition-colors ${
                        avatar === emoji ? 'bg-purple-200 ring-2 ring-purple-400' : 'bg-white'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 笔名 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Book size={16} className="inline mr-1" />
              笔名
              <span className="text-xs text-gray-500 ml-2">（可选，留空则自动生成）</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={penName}
                onChange={(e) => setPenName(e.target.value)}
                placeholder="例如：李泽言、夜神月、艾斯..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
                maxLength={20}
              />
              <button
                onClick={handleRandomName}
                className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl transition-colors whitespace-nowrap"
              >
                随机
              </button>
            </div>
          </div>

          {/* 角色设定 - 必填 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Sparkles size={16} className="inline mr-1" />
              角色设定
              <span className="text-red-600 ml-2">*必填</span>
            </label>
            <textarea
              value={rolePrompt}
              onChange={(e) => setRolePrompt(e.target.value)}
              placeholder="详细描述角色设定，例如：&#10;&#10;你是《恋与制作人》中的李泽言，华锐集团的总裁，外表高冷但内心温柔。你说话简洁有力，对工作认真负责，对喜欢的人会默默关心。&#10;&#10;或者：&#10;&#10;你是《死亡笔记》中的夜神月，天才高中生，理想主义者。你聪明冷静，善于推理，说话谨慎周密。"
              className="w-full h-40 px-4 py-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
              maxLength={1000}
            />
            <div className="text-xs text-gray-500 mt-1 text-right">
              {rolePrompt.length}/1000
            </div>
          </div>

          {/* 背景设定 - 可选 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin size={16} className="inline mr-1" />
              背景设定
              <span className="text-xs text-gray-500 ml-2">（可选）</span>
            </label>
            <textarea
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder="补充角色背景信息，例如：&#10;&#10;你现在正在华锐集团处理公司事务，日常工作繁忙。偶尔会思念远方的笔友。&#10;&#10;或者留空也可以。"
              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
              maxLength={500}
            />
            <div className="text-xs text-gray-500 mt-1 text-right">
              {background.length}/500
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="bg-gray-50 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 hover:shadow-lg text-white rounded-xl font-medium transition-all"
          >
            创建笔友
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomPenPalCreator;
