import React, { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { WorldbookItem, WorldbookContentType, WorldbookScope, WorldbookInsertionPosition } from '../types/worldbook';
import { getAllCategories } from '../utils/worldbookStorage';

interface WorldbookFormProps {
  worldbook?: WorldbookItem;
  onSave: (worldbook: WorldbookItem) => void;
  onCancel: () => void;
}

const WorldbookForm: React.FC<WorldbookFormProps> = ({ worldbook, onSave, onCancel }) => {
  const [title, setTitle] = useState(worldbook?.title || '');
  const [content, setContent] = useState(worldbook?.content || '');
  const [type, setType] = useState<WorldbookContentType>(worldbook?.type || 'text');
  const [scope, setScope] = useState<WorldbookScope>(worldbook?.scope || 'global');
  const [insertion, setInsertion] = useState<WorldbookInsertionPosition>(worldbook?.insertion || 'middle');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(worldbook?.categories || []);
  
  const categories = getAllCategories();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const item: WorldbookItem = {
      id: worldbook?.id || `wb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      content,
      type,
      scope,
      insertion,
      categories: selectedCategories,
      createdAt: worldbook?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    
    onSave(item);
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 flex items-center justify-between shadow-lg">
        <button onClick={onCancel} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">{worldbook ? '编辑世界书' : '新建世界书'}</h1>
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || !content.trim()}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
        >
          <Save className="w-6 h-6" />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 标题 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入世界书标题..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">内容类型</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType('text')}
              className={`px-4 py-3 rounded-lg border-2 transition-all ${
                type === 'text'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              📝 文本
            </button>
            <button
              type="button"
              onClick={() => setType('html')}
              className={`px-4 py-3 rounded-lg border-2 transition-all ${
                type === 'html'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              🌐 HTML
            </button>
          </div>
        </div>

        {/* 范围 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">范围</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setScope('global')}
              className={`px-4 py-3 rounded-lg border-2 transition-all ${
                scope === 'global'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              🌍 全局
            </button>
            <button
              type="button"
              onClick={() => setScope('local')}
              className={`px-4 py-3 rounded-lg border-2 transition-all ${
                scope === 'local'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              💬 局部
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            全局世界书对所有会话可见，局部世界书需要在会话中单独挂载
          </p>
        </div>

        {/* 注入位置 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">注入位置</label>
          <select
            value={insertion}
            onChange={(e) => setInsertion(e.target.value as WorldbookInsertionPosition)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="before">前 - 角色设定之前</option>
            <option value="middle">中 - 角色设定与历史消息之间</option>
            <option value="after">后 - 历史消息之后</option>
          </select>
          <p className="mt-2 text-xs text-gray-500">
            仅对文本类型生效，HTML类型通过前端渲染插入
          </p>
        </div>

        {/* 分类 */}
        {categories.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    selectedCategories.includes(category.id)
                      ? 'text-white font-medium'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={
                    selectedCategories.includes(category.id)
                      ? { backgroundColor: category.color }
                      : undefined
                  }
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 内容 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">内容</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              type === 'text'
                ? '输入世界书内容，可以是角色背景、世界观设定等...'
                : '输入HTML代码，将作为模板用于前端渲染...'
            }
            rows={12}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <p className="mt-2 text-xs text-gray-500">
            {type === 'text'
              ? '文本内容将注入到AI提示词中作为背景知识'
              : 'HTML内容仅用于前端渲染，不会发送给AI'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WorldbookForm;
