/**
 * 记忆管理组件
 * 允许用户查看、编辑和管理AI的长期记忆
 */

import { useState } from 'react';
import { X, Trash2, Star, Brain, Plus } from 'lucide-react';
import type { MemoryDiaryEntry } from '../types';
import { 
  MemoryEntry,
  getMemoryBank, 
  addMemory, 
  deleteMemory, 
  updateMemoryImportance,
  clearMemoryBank,
  updateMemorySettings,
  saveMemoryBank,
} from '../utils/memorySystem';

interface MemoryManagerProps {
  conversationId: string;
  conversationName: string;
  onClose: () => void;
}

export default function MemoryManager({ conversationId, conversationName, onClose }: MemoryManagerProps) {
  const memoryBank = getMemoryBank(conversationId);
  const [memories, setMemories] = useState<MemoryEntry[]>(memoryBank.memories);
  const [diaries, setDiaries] = useState<MemoryDiaryEntry[]>(memoryBank.diaryEntries || []);
  const [aiSelfProfileText, setAiSelfProfileText] = useState(memoryBank.aiSelfProfile?.text || '');
  const [userProfileText, setUserProfileText] = useState(memoryBank.userProfile?.text || '');
  const [settings, setSettings] = useState(memoryBank.settings);
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState('其他');
  const [newMemoryImportance, setNewMemoryImportance] = useState<'low' | 'medium' | 'high'>('medium');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProfiles, setEditingProfiles] = useState(false);
  
  // 私聊自定义间隔相关状态
  const presetIntervals = [15, 25, 50, 100];
  const isCustomInterval = !presetIntervals.includes(settings.autoSummaryInterval);
  const [customInterval, setCustomInterval] = useState(
    isCustomInterval ? settings.autoSummaryInterval : 50
  );
  const [intervalMode, setIntervalMode] = useState<'preset' | 'custom'>(
    isCustomInterval ? 'custom' : 'preset'
  );
  
  // 群聊自定义间隔相关状态
  const groupPresetIntervals = [30, 50, 100, 200];
  const currentGroupInterval = settings.groupSummaryInterval || 50;
  const isCustomGroupInterval = !groupPresetIntervals.includes(currentGroupInterval);
  const [customGroupInterval, setCustomGroupInterval] = useState(
    isCustomGroupInterval ? currentGroupInterval : 50
  );
  const [groupIntervalMode, setGroupIntervalMode] = useState<'preset' | 'custom'>(
    isCustomGroupInterval ? 'custom' : 'preset'
  );

  const categories = [
    '个人信息', '喜好', '事件', '关系', '习惯', '情感', 
    'AI经历', 'AI观点', '对话互动', '其他'
  ];

  const refreshFromBank = () => {
    const updatedBank = getMemoryBank(conversationId);
    setMemories(updatedBank.memories);
    setDiaries(updatedBank.diaryEntries || []);
    setAiSelfProfileText(updatedBank.aiSelfProfile?.text || '');
    setUserProfileText(updatedBank.userProfile?.text || '');
  };

  const handleAddMemory = () => {
    if (!newMemoryContent.trim()) {
      alert('请输入记忆内容');
      return;
    }

    addMemory(conversationId, newMemoryContent, newMemoryImportance, newMemoryCategory, false);
    refreshFromBank();
    setNewMemoryContent('');
    setShowAddForm(false);
  };

  const handleDeleteMemory = (memoryId: string) => {
    if (confirm('确定要删除这条记忆吗？')) {
      deleteMemory(conversationId, memoryId);
      refreshFromBank();
    }
  };

  const handleToggleImportance = (memoryId: string, currentImportance: 'low' | 'medium' | 'high') => {
    const nextImportance: Record<string, 'low' | 'medium' | 'high'> = {
      low: 'medium',
      medium: 'high',
      high: 'low'
    };
    
    updateMemoryImportance(conversationId, memoryId, nextImportance[currentImportance]);
    refreshFromBank();
  };

  const handleClearAll = () => {
    if (confirm(`确定要清空${conversationName}的所有记忆吗？此操作不可恢复！`)) {
      clearMemoryBank(conversationId);
      refreshFromBank();
    }
  };

  const handleUpdateSettings = () => {
    updateMemorySettings(conversationId, settings);
    alert('设置已保存');
  };

  const handleSaveProfiles = () => {
    const bank = getMemoryBank(conversationId);
    const now = Date.now();
    bank.aiSelfProfile = aiSelfProfileText.trim()
      ? {
          text: aiSelfProfileText.trim(),
          version: (bank.aiSelfProfile?.version ?? 0) + 1,
          updatedAt: now,
          sourceDay: bank.aiSelfProfile?.sourceDay,
          priority: 'override',
        }
      : undefined;
    bank.userProfile = userProfileText.trim()
      ? {
          text: userProfileText.trim(),
          version: (bank.userProfile?.version ?? 0) + 1,
          updatedAt: now,
          sourceDay: bank.userProfile?.sourceDay,
          priority: 'override',
        }
      : undefined;
    saveMemoryBank(bank);
    setEditingProfiles(false);
    refreshFromBank();
    alert('动态画像已保存');
  };

  const getImportanceColor = (importance: 'low' | 'medium' | 'high') => {
    switch (importance) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-gray-400';
    }
  };

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      'AI经历': 'bg-purple-100 text-purple-700',
      'AI观点': 'bg-indigo-100 text-indigo-700',
      '对话互动': 'bg-pink-100 text-pink-700',
      '个人信息': 'bg-blue-100 text-blue-700',
      '喜好': 'bg-green-100 text-green-700',
      '事件': 'bg-orange-100 text-orange-700',
      '关系': 'bg-cyan-100 text-cyan-700',
      '习惯': 'bg-teal-100 text-teal-700',
      '情感': 'bg-rose-100 text-rose-700',
      '其他': 'bg-gray-100 text-gray-700'
    };
    return colors[category || '其他'] || colors['其他'];
  };

  // 按分类分组
  const memoriesByCategory = memories.reduce((acc, memory) => {
    const cat = memory.category || '其他';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(memory);
    return acc;
  }, {} as Record<string, MemoryEntry[]>);

  return (
    <div className="absolute inset-0 bg-white z-50 flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 h-14 bg-white border-b border-gray-200 flex-shrink-0">
        <button
          onClick={onClose}
          className="p-2 -ml-2 active:opacity-60 transition-opacity"
        >
          <X className="w-6 h-6 text-gray-900" />
        </button>
        <div className="flex-1 text-center">
          <h2 className="font-semibold text-lg">{conversationName} 的记忆库</h2>
          <p className="text-xs text-gray-500">共 {memories.length} 条记忆</p>
        </div>
        <div className="w-10" />
      </div>

      {/* 设置区域 */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.enableAutoSummary}
                onChange={(e) => setSettings({ ...settings, enableAutoSummary: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              启用自动记忆总结
            </label>
            <button
              onClick={handleUpdateSettings}
              className="px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
            >
              保存设置
            </button>
          </div>
          
          {settings.enableAutoSummary && (
            <div className="space-y-3">
              {/* 间隔模式选择 */}
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-600">总结间隔：</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIntervalMode('preset')}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      intervalMode === 'preset'
                        ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:border-gray-300'
                    }`}
                  >
                    预设
                  </button>
                  <button
                    onClick={() => setIntervalMode('custom')}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      intervalMode === 'custom'
                        ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:border-gray-300'
                    }`}
                  >
                    自定义
                  </button>
                </div>
              </div>
              
              {/* 预设间隔选择 */}
              {intervalMode === 'preset' && (
                <div className="flex items-center gap-2 text-sm">
                  <select
                    value={settings.autoSummaryInterval}
                    onChange={(e) => setSettings({ ...settings, autoSummaryInterval: Number(e.target.value) })}
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value={15}>每15条消息</option>
                    <option value={25}>每25条消息</option>
                    <option value={50}>每50条消息</option>
                    <option value={100}>每100条消息</option>
                  </select>
                </div>
              )}
              
              {/* 自定义间隔输入 */}
              {intervalMode === 'custom' && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">每</span>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    value={customInterval}
                    onChange={(e) => {
                      const value = Math.max(10, Math.min(500, Number(e.target.value)));
                      setCustomInterval(value);
                      setSettings({ ...settings, autoSummaryInterval: value });
                    }}
                    className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-center"
                  />
                  <span className="text-gray-600">条消息</span>
                </div>
              )}
              
              <p className="text-xs text-gray-500 pl-1">
                {intervalMode === 'custom' 
                  ? '💡 自定义范围：10-500条消息' 
                  : '💡 选择合适的间隔可以平衡记忆质量和API消耗'
                }
              </p>
              
              {/* 分隔线 */}
              <div className="border-t border-gray-200 my-3"></div>
              
              {/* 群聊记忆间隔设置 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">群聊记忆总结：</span>
                  <span className="text-xs text-gray-500">(适用于该AI加入的群聊)</span>
                </div>
                
                {/* 群聊间隔模式选择 */}
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-600">群聊间隔：</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setGroupIntervalMode('preset')}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        groupIntervalMode === 'preset'
                          ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                          : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:border-gray-300'
                      }`}
                    >
                      预设
                    </button>
                    <button
                      onClick={() => setGroupIntervalMode('custom')}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        groupIntervalMode === 'custom'
                          ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                          : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:border-gray-300'
                      }`}
                    >
                      自定义
                    </button>
                  </div>
                </div>
                
                {/* 预设群聊间隔选择 */}
                {groupIntervalMode === 'preset' && (
                  <div className="flex items-center gap-2 text-sm">
                    <select
                      value={currentGroupInterval}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        groupSummaryInterval: Number(e.target.value) 
                      })}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value={30}>每30条消息</option>
                      <option value={50}>每50条消息（推荐）</option>
                      <option value={100}>每100条消息</option>
                      <option value={200}>每200条消息</option>
                    </select>
                  </div>
                )}
                
                {/* 自定义群聊间隔输入 */}
                {groupIntervalMode === 'custom' && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">每</span>
                    <input
                      type="number"
                      min="10"
                      max="500"
                      value={customGroupInterval}
                      onChange={(e) => {
                        const value = Math.max(10, Math.min(500, Number(e.target.value)));
                        setCustomGroupInterval(value);
                        setSettings({ ...settings, groupSummaryInterval: value });
                      }}
                      className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-center"
                    />
                    <span className="text-gray-600">条群聊消息</span>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 pl-1">
                  {groupIntervalMode === 'custom' 
                    ? '💡 群聊建议设置稍高的间隔（30-200条）' 
                    : '💡 群聊消息较多，建议使用较大的间隔值'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 记忆列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 自我画像与用户画像（高优先级） */}
        <div className="mb-4 p-4 rounded-xl border border-purple-200 bg-purple-50/60">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-purple-900">动态画像（高于初始人设）</div>
            {!editingProfiles ? (
              <button
                onClick={() => setEditingProfiles(true)}
                className="text-xs px-2 py-1 rounded border border-purple-300 text-purple-700 hover:bg-purple-100"
              >
                编辑
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveProfiles}
                  className="text-xs px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-700"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setEditingProfiles(false);
                    refreshFromBank();
                  }}
                  className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  取消
                </button>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-purple-700 mb-1">自我画像（AI当前状态）</div>
              {editingProfiles ? (
                <textarea
                  value={aiSelfProfileText}
                  onChange={(e) => setAiSelfProfileText(e.target.value)}
                  rows={3}
                  className="w-full text-sm bg-white border border-purple-200 rounded-lg p-2 text-gray-700 resize-none"
                  placeholder="输入AI当前自我画像"
                />
              ) : (
                <div className="text-sm bg-white border border-purple-100 rounded-lg p-2 text-gray-700 whitespace-pre-wrap">
                  {aiSelfProfileText || '暂无（会随聊天自动更新）'}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-purple-700 mb-1">用户画像（AI对用户的理解）</div>
              {editingProfiles ? (
                <textarea
                  value={userProfileText}
                  onChange={(e) => setUserProfileText(e.target.value)}
                  rows={3}
                  className="w-full text-sm bg-white border border-purple-200 rounded-lg p-2 text-gray-700 resize-none"
                  placeholder="输入AI对用户的画像"
                />
              ) : (
                <div className="text-sm bg-white border border-purple-100 rounded-lg p-2 text-gray-700 whitespace-pre-wrap">
                  {userProfileText || '暂无（会随聊天自动更新）'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 日记区块 */}
        <div className="mb-4 p-4 rounded-xl border border-blue-200 bg-blue-50/60">
          <div className="text-sm font-semibold text-blue-900 mb-2">日记区块</div>
          {diaries.length === 0 ? (
            <div className="text-sm text-blue-700">暂无日记（会按消息自动生成）</div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {diaries.slice(0, 7).map((diary) => (
                <div key={diary.id} className="bg-white border border-blue-100 rounded-lg p-2">
                  <div className="text-xs text-blue-700 mb-1">{diary.day}</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{diary.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 添加记忆按钮 */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-purple-600 mb-4"
          >
            <Plus className="w-5 h-5" />
            <span>手动添加记忆</span>
          </button>
        )}

        {/* 添加记忆表单 */}
        {showAddForm && (
          <div className="mb-4 p-4 bg-purple-50 rounded-xl space-y-3">
            <textarea
              value={newMemoryContent}
              onChange={(e) => setNewMemoryContent(e.target.value)}
              placeholder="输入记忆内容..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
              rows={3}
            />
            <div className="flex gap-2">
              <select
                value={newMemoryCategory}
                onChange={(e) => setNewMemoryCategory(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={newMemoryImportance}
                onChange={(e) => setNewMemoryImportance(e.target.value as 'low' | 'medium' | 'high')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="low">⭐ 低</option>
                <option value="medium">⭐⭐ 中</option>
                <option value="high">⭐⭐⭐ 高</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddMemory}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                添加
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewMemoryContent('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 记忆列表 */}
        {memories.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Brain className="w-16 h-16 mx-auto mb-3 opacity-20" />
            <p className="text-lg">还没有任何记忆</p>
            <p className="text-sm mt-1">记忆会在对话中自动生成</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(memoriesByCategory).map(([category, categoryMemories]) => (
              <div key={category} className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${getCategoryColor(category)}`}>
                    {category}
                  </span>
                  <span className="text-gray-400">({categoryMemories.length})</span>
                </h3>
                
                {categoryMemories.map((memory) => (
                  <div
                    key={memory.id}
                    className="p-3 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm">{memory.content}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                          <span>{new Date(memory.timestamp).toLocaleString('zh-CN')}</span>
                          {memory.autoGenerated && <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded">自动</span>}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleToggleImportance(memory.id, memory.importance)}
                          className={`p-1.5 hover:bg-gray-100 rounded-lg transition-colors ${getImportanceColor(memory.importance)}`}
                          title={`重要性：${memory.importance} (点击切换)`}
                        >
                          <Star className="w-4 h-4" fill="currentColor" />
                        </button>
                        <button
                          onClick={() => handleDeleteMemory(memory.id)}
                          className="p-1.5 hover:bg-red-100 text-gray-400 hover:text-red-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部操作 */}
      {memories.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center bg-white">
          <button
            onClick={handleClearAll}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            清空所有记忆
          </button>
          <div className="text-xs text-gray-400">
            最多保存 {settings.maxMemories} 条记忆
          </div>
        </div>
      )}
    </div>
  );
}
