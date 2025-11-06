/**
 * 记忆管理组件
 * 允许用户查看、编辑和管理AI的长期记忆
 */

import { useState } from 'react';
import { X, Trash2, Star, Brain, Plus } from 'lucide-react';
import { 
  MemoryEntry,
  getMemoryBank, 
  addMemory, 
  deleteMemory, 
  updateMemoryImportance,
  clearMemoryBank,
  updateMemorySettings
} from '../utils/memorySystem';

interface MemoryManagerProps {
  conversationId: string;
  conversationName: string;
  onClose: () => void;
}

export default function MemoryManager({ conversationId, conversationName, onClose }: MemoryManagerProps) {
  const memoryBank = getMemoryBank(conversationId);
  const [memories, setMemories] = useState<MemoryEntry[]>(memoryBank.memories);
  const [settings, setSettings] = useState(memoryBank.settings);
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState('其他');
  const [newMemoryImportance, setNewMemoryImportance] = useState<'low' | 'medium' | 'high'>('medium');
  const [showAddForm, setShowAddForm] = useState(false);

  const categories = [
    '个人信息', '喜好', '事件', '关系', '习惯', '情感', 
    'AI经历', 'AI观点', '对话互动', '其他'
  ];

  const handleAddMemory = () => {
    if (!newMemoryContent.trim()) {
      alert('请输入记忆内容');
      return;
    }

    addMemory(conversationId, newMemoryContent, newMemoryImportance, newMemoryCategory, false);
    const updatedBank = getMemoryBank(conversationId);
    setMemories(updatedBank.memories);
    setNewMemoryContent('');
    setShowAddForm(false);
  };

  const handleDeleteMemory = (memoryId: string) => {
    if (confirm('确定要删除这条记忆吗？')) {
      deleteMemory(conversationId, memoryId);
      const updatedBank = getMemoryBank(conversationId);
      setMemories(updatedBank.memories);
    }
  };

  const handleToggleImportance = (memoryId: string, currentImportance: 'low' | 'medium' | 'high') => {
    const nextImportance: Record<string, 'low' | 'medium' | 'high'> = {
      low: 'medium',
      medium: 'high',
      high: 'low'
    };
    
    updateMemoryImportance(conversationId, memoryId, nextImportance[currentImportance]);
    const updatedBank = getMemoryBank(conversationId);
    setMemories(updatedBank.memories);
  };

  const handleClearAll = () => {
    if (confirm(`确定要清空${conversationName}的所有记忆吗？此操作不可恢复！`)) {
      clearMemoryBank(conversationId);
      setMemories([]);
    }
  };

  const handleUpdateSettings = () => {
    updateMemorySettings(conversationId, settings);
    alert('设置已保存');
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
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-600">总结间隔：</span>
              <select
                value={settings.autoSummaryInterval}
                onChange={(e) => setSettings({ ...settings, autoSummaryInterval: Number(e.target.value) })}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value={15}>每15条消息</option>
                <option value={25}>每25条消息</option>
                <option value={50}>每50条消息</option>
                <option value={100}>每100条消息</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 记忆列表 */}
      <div className="flex-1 overflow-y-auto p-4">
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
