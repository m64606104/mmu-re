// 世界书分类管理界面

import { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Check } from 'lucide-react';
import { WorldbookCategory } from '../types/worldbook';
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  CATEGORY_COLORS,
  getRandomColor,
} from '../utils/worldbookCategories';

interface WorldbookCategoryManagerProps {
  onClose: () => void;
}

export default function WorldbookCategoryManager({
  onClose,
}: WorldbookCategoryManagerProps) {
  const [categories, setCategories] = useState<WorldbookCategory[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('');
  const [error, setError] = useState('');

  // 加载分类
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = () => {
    const cats = getAllCategories();
    setCategories(cats);
  };

  // 开始添加
  const handleStartAdd = () => {
    const existingColors = categories.map(cat => cat.color);
    setNewName('');
    setNewColor(getRandomColor(existingColors));
    setIsAdding(true);
    setError('');
  };

  // 保存新分类
  const handleSaveNew = () => {
    if (!newName.trim()) {
      setError('请输入分类名称');
      return;
    }

    try {
      createCategory(newName.trim(), newColor);
      loadCategories();
      setIsAdding(false);
      setNewName('');
      setNewColor('');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    }
  };

  // 开始编辑
  const handleStartEdit = (category: WorldbookCategory) => {
    setEditingId(category.id);
    setEditingName(category.name);
    setEditingColor(category.color);
    setError('');
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (!editingName.trim()) {
      setError('请输入分类名称');
      return;
    }

    try {
      updateCategory(editingId!, {
        name: editingName.trim(),
        color: editingColor,
      });
      loadCategories();
      setEditingId(null);
      setEditingName('');
      setEditingColor('');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    }
  };

  // 删除分类
  const handleDelete = (id: string, name: string) => {
    if (!confirm(`确定要删除分类"${name}"吗？`)) {
      return;
    }

    try {
      deleteCategory(id);
      loadCategories();
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-500 to-purple-500">
          <h2 className="text-lg font-semibold text-white">分类管理</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* 添加按钮 */}
          {!isAdding && (
            <button
              onClick={handleStartAdd}
              className="w-full mb-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">添加新分类</span>
            </button>
          )}

          {/* 添加表单 */}
          {isAdding && (
            <div className="mb-4 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    分类名称
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveNew()}
                    placeholder="例如：角色设定"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    颜色标签
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          newColor === color
                            ? 'border-gray-900 scale-110'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      >
                        {newColor === color && (
                          <Check className="w-4 h-4 text-white mx-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveNew}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => {
                      setIsAdding(false);
                      setNewName('');
                      setNewColor('');
                      setError('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 分类列表 */}
          <div className="space-y-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="border border-gray-200 rounded-lg hover:shadow-md transition-all"
              >
                {editingId === category.id ? (
                  // 编辑模式
                  <div className="p-4 bg-gray-50">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          分类名称
                        </label>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          颜色标签
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {CATEGORY_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => setEditingColor(color)}
                              className={`w-8 h-8 rounded-full border-2 transition-all ${
                                editingColor === color
                                  ? 'border-gray-900 scale-110'
                                  : 'border-transparent hover:scale-105'
                              }`}
                              style={{ backgroundColor: color }}
                            >
                              {editingColor === color && (
                                <Check className="w-4 h-4 text-white mx-auto" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleSaveEdit}
                          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditingName('');
                            setEditingColor('');
                            setError('');
                          }}
                          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // 显示模式
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {category.name}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleStartEdit(category)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4 text-blue-500" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id, category.name)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {categories.length === 0 && !isAdding && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">暂无分类，点击上方按钮添加</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
