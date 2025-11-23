/**
 * AI儿童简化设置页面
 * 只显示基础信息（备注名、头像、网名）和AI主动发消息配置
 */

import { useState, useRef } from 'react';
import { ChevronLeft, Upload, Zap } from 'lucide-react';
import { Conversation } from '../types';

interface AIChildSimpleSettingsProps {
  conversation: Conversation;
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void;
  onBack: () => void;
}

export default function AIChildSimpleSettings({
  conversation,
  onUpdateConversation,
  onBack,
}: AIChildSimpleSettingsProps) {
  const settings = conversation.characterSettings || {
    nickname: '',
    systemPrompt: '',
    personality: '',
    languageStyle: '',
    languageExample: '',
    memoryEvents: '',
  };

  const [nickname, setNickname] = useState(settings.nickname);
  const [username, setUsername] = useState(settings.username || '');
  const [avatar, setAvatar] = useState(settings.avatar || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // AI主动发消息配置
  const [proactiveEnabled, setProactiveEnabled] = useState(settings.proactiveMessaging?.enabled || false);
  const [minInterval, setMinInterval] = useState(settings.proactiveMessaging?.minInterval || 30);
  const [maxInterval, setMaxInterval] = useState(settings.proactiveMessaging?.maxInterval || 120);
  const [activeHourStart, setActiveHourStart] = useState(settings.proactiveMessaging?.activeHourStart || 8);
  const [activeHourEnd, setActiveHourEnd] = useState(settings.proactiveMessaging?.activeHourEnd || 23);

  const handleSave = () => {
    onUpdateConversation(conversation.id, {
      characterSettings: {
        ...settings,
        nickname,
        username,
        avatar,
        proactiveMessaging: {
          enabled: proactiveEnabled,
          minInterval,
          maxInterval,
          activeHourStart,
          activeHourEnd,
        },
      },
    });
    alert('✅ 设置已保存');
    onBack();
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件！');
      return;
    }

    if (file.size > 1024 * 1024) {
      alert('图片大小不能超过1MB！');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setAvatar(base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={onBack} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold ml-2">AI儿童设置</h1>
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-1.5 bg-blue-500 text-white text-sm rounded-lg font-medium hover:bg-blue-600 active:bg-blue-700 transition-colors"
        >
          保存
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Avatar */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            AI头像
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
            备注名
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="输入备注名"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Username */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            网名
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="例如：小明"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">在群聊中显示的网名</p>
        </div>

        {/* AI主动发消息 */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              <h3 className="text-sm font-medium text-gray-900">AI主动发消息</h3>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={proactiveEnabled}
                onChange={(e) => setProactiveEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {proactiveEnabled && (
            <div className="space-y-4 mt-4">
              {/* 消息间隔 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-600">消息间隔</label>
                  <span className="text-xs text-gray-500">分钟</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={minInterval}
                    onChange={(e) => setMinInterval(Math.max(10, parseInt(e.target.value) || 10))}
                    min="10"
                    max="240"
                    className="w-20 px-3 py-2 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="number"
                    value={maxInterval}
                    onChange={(e) => setMaxInterval(Math.max(minInterval, parseInt(e.target.value) || 120))}
                    min={minInterval}
                    max="480"
                    className="w-20 px-3 py-2 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 活跃时段 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-600">活跃时段</label>
                  <span className="text-xs text-gray-500">点（0-23）</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={activeHourStart}
                    onChange={(e) => setActiveHourStart(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                    min="0"
                    max="23"
                    className="w-20 px-3 py-2 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="number"
                    value={activeHourEnd}
                    onChange={(e) => setActiveHourEnd(Math.max(activeHourStart, Math.min(23, parseInt(e.target.value) || 23)))}
                    min={activeHourStart}
                    max="23"
                    className="w-20 px-3 py-2 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 说明 */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs text-blue-700 leading-relaxed">
                  💡 AI会在设定的时间段内，根据情境主动发送消息与你聊天
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
