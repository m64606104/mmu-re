import { useState, useRef } from 'react';
import { ChevronLeft, Upload, Brain, Trash2, Download, FileUp, Zap, X } from 'lucide-react';
import { Conversation } from '../types';
import MemoryManager from './MemoryManager';

interface CharacterSettingsScreenProps {
  conversation: Conversation;
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void;
  onDeleteConversation?: (id: string) => void;
  onBack: () => void;
}

export default function CharacterSettingsScreen({
  conversation,
  onUpdateConversation,
  onDeleteConversation,
  onBack,
}: CharacterSettingsScreenProps) {
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
  const [systemPrompt, setSystemPrompt] = useState(settings.systemPrompt);
  const [personality, setPersonality] = useState(settings.personality);
  const [languageStyle, setLanguageStyle] = useState(settings.languageStyle);
  const [languageExample, setLanguageExample] = useState(settings.languageExample);
  const [memoryEvents, setMemoryEvents] = useState(settings.memoryEvents);
  const [showMemoryManager, setShowMemoryManager] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<{messages: any[], count: number} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatImportRef = useRef<HTMLInputElement>(null);
  
  // AI主动发消息配置
  const [proactiveEnabled, setProactiveEnabled] = useState(settings.proactiveMessaging?.enabled || false);
  const [minInterval, setMinInterval] = useState(settings.proactiveMessaging?.minInterval || 30);
  const [maxInterval, setMaxInterval] = useState(settings.proactiveMessaging?.maxInterval || 120);
  const [activeHourStart, setActiveHourStart] = useState(settings.proactiveMessaging?.activeHourStart || 8);
  const [activeHourEnd, setActiveHourEnd] = useState(settings.proactiveMessaging?.activeHourEnd || 23);

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

  // 导出聊天记录
  const handleExportChat = () => {
    const chatData = {
      conversationId: conversation.id,
      conversationName: conversation.name,
      characterSettings: conversation.characterSettings,
      messages: conversation.messages,
      exportDate: new Date().toISOString(),
      appVersion: '1.0.0'
    };

    const dataStr = JSON.stringify(chatData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${conversation.name}_聊天记录_${new Date().toLocaleDateString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert('聊天记录已导出！');
  };

  // 导入聊天记录
  const handleImportChat = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        
        // 验证数据格式
        if (!importedData.messages || !Array.isArray(importedData.messages)) {
          alert('导入文件格式不正确');
          return;
        }

        // 显示导入选项弹窗
        setImportData({
          messages: importedData.messages,
          count: importedData.messages.length
        });
        setShowImportModal(true);
        
        // 重置file input
        if (chatImportRef.current) {
          chatImportRef.current.value = '';
        }
      } catch (error) {
        console.error('导入失败:', error);
        alert('导入失败：文件格式错误或数据损坏');
      }
    };
    reader.readAsText(file);
  };

  const handleSave = () => {
    onUpdateConversation(conversation.id, {
      name: nickname || conversation.name,
      characterSettings: {
        avatar,
        nickname,
        username,
        systemPrompt,
        personality,
        languageStyle,
        languageExample,
        memoryEvents,
        proactiveMessaging: {
          enabled: proactiveEnabled,
          minInterval,
          maxInterval,
          activeHourStart,
          activeHourEnd,
          lastMessageTime: settings.proactiveMessaging?.lastMessageTime,
        },
      },
    });
    alert('角色设置已保存');
    onBack();
  };

  const handleDelete = () => {
    if (window.confirm(`确定要删除联系人“${conversation.name}”吗？\n\n此操作将永久删除该对话及所有消息。`)) {
      if (onDeleteConversation) {
        onDeleteConversation(conversation.id);
        onBack();
      }
    }
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={onBack} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold ml-2">角色设置</h1>
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
            备注名
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

        {/* Memory Events */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            记忆事件
          </label>
          <textarea
            value={memoryEvents}
            onChange={(e) => setMemoryEvents(e.target.value)}
            placeholder="记录与角色相关的重要事件和记忆"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* 长期记忆库按钮 */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <button
            onClick={() => setShowMemoryManager(true)}
            className="w-full py-3 border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 rounded-lg transition-colors flex items-center justify-center gap-2 text-purple-700"
          >
            <Brain className="w-5 h-5" />
            <span className="font-medium">查看长期记忆库</span>
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            💡 AI会自动记住对话中的重要信息
          </p>
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
                  <span className="text-xs text-gray-500">点</span>
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

        {/* 提示信息 */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <p className="text-sm text-blue-700 leading-relaxed">
            💡 这些设置将影响AI生成回复时的风格和内容，帮助创建更真实的对话体验
          </p>
        </div>

        {/* 聊天记录导入导出 */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">聊天记录管理</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExportChat}
              className="py-3 border-2 border-green-200 hover:border-green-400 hover:bg-green-50 rounded-lg transition-colors flex items-center justify-center gap-2 text-green-700"
            >
              <Download className="w-5 h-5" />
              <span className="font-medium">导出记录</span>
            </button>
            <button
              onClick={() => chatImportRef.current?.click()}
              className="py-3 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-2 text-blue-700"
            >
              <FileUp className="w-5 h-5" />
              <span className="font-medium">导入记录</span>
            </button>
          </div>
          <input
            ref={chatImportRef}
            type="file"
            accept=".json"
            onChange={handleImportChat}
            className="hidden"
          />
          <p className="text-xs text-gray-500 mt-2 text-center">
            💾 导出后可在其他设备导入，保留所有聊天记录
          </p>
        </div>

        {/* 提示信息 */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <p className="text-sm text-blue-700 leading-relaxed">
            💡 这些设置将影响AI生成回复时的风格和内容，帮助创建更真实的对话体验
          </p>
        </div>

        {/* Delete Contact Button */}
        <button
          onClick={handleDelete}
          className="w-full bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 active:bg-red-700 transition-colors flex items-center justify-center gap-2"
        >
          <Trash2 className="w-5 h-5" />
          删除联系人
        </button>
      </div>

      {/* 记忆管理器 */}
      {showMemoryManager && (
        <MemoryManager
          conversationId={conversation.id}
          conversationName={conversation.name}
          onClose={() => setShowMemoryManager(false)}
        />
      )}

      {/* 导入消息弹窗 */}
      {showImportModal && importData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                导入 {importData.count} 条消息记录
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportData(null);
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              请选择导入方式：
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  onUpdateConversation(conversation.id, {
                    messages: importData.messages
                  });
                  alert(`成功替换为 ${importData.count} 条消息！`);
                  setShowImportModal(false);
                  setImportData(null);
                }}
                className="w-full px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
              >
                替换现有全部消息
              </button>
              <button
                onClick={() => {
                  onUpdateConversation(conversation.id, {
                    messages: [...conversation.messages, ...importData.messages]
                  });
                  alert(`成功追加 ${importData.count} 条消息！`);
                  setShowImportModal(false);
                  setImportData(null);
                }}
                className="w-full px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
              >
                追加消息
              </button>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportData(null);
                }}
                className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
