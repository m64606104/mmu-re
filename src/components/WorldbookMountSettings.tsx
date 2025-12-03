import React, { useState, useEffect } from 'react';
import { X, Book, Check } from 'lucide-react';
import { WorldbookItem, WorldbookMountConfig } from '../types/worldbook';
import { getAllWorldbooks } from '../utils/worldbookStorage';
import { getAllCategories } from '../utils/worldbookCategories';

interface WorldbookMountSettingsProps {
  currentConfig?: WorldbookMountConfig;
  onSave: (config: WorldbookMountConfig) => void;
  onClose: () => void;
}

const WorldbookMountSettings: React.FC<WorldbookMountSettingsProps> = ({
  currentConfig,
  onSave,
  onClose,
}) => {
  const [enabled, setEnabled] = useState(currentConfig?.enabled || false);
  const [selectedIds, setSelectedIds] = useState<string[]>(currentConfig?.selectedIds || []);
  const [categoryFilter, setCategoryFilter] = useState<string>(currentConfig?.categoryFilter || '');
  const [worldbooks, setWorldbooks] = useState<WorldbookItem[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = getAllCategories();

  useEffect(() => {
    loadWorldbooks();
  }, []);

  const loadWorldbooks = async () => {
    setLoading(true);
    try {
      const items = await getAllWorldbooks();
      // 这里只管理局部世界书（scope = 'local'），全局世界书会自动应用到所有会话
      setWorldbooks(items.filter(wb => wb.scope === 'local'));
    } catch (error) {
      console.error('Failed to load worldbooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWorldbook = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(wbId => wbId !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    onSave({
      enabled,
      selectedIds,
      categoryFilter: categoryFilter || undefined,
    });
    onClose();
  };

  const filteredWorldbooks = categoryFilter
    ? worldbooks.filter(wb => wb.categories.includes(categoryFilter))
    : worldbooks;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">挂载世界书</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 启用开关 */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Book className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-medium text-gray-900">启用本会话的局部世界书</div>
                <div className="text-xs text-gray-600">局部世界书作为设定的一部分影响本角色的行为和说话方式</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {enabled && (
            <>
              {/* 分类筛选 */}
              {categories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    筛选分类
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">全部分类</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 世界书列表 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    选择世界书
                  </label>
                  <span className="text-xs text-gray-500">
                    已选 {selectedIds.length} 个
                  </span>
                </div>

                {loading ? (
                  <div className="text-center py-8 text-gray-500">加载中...</div>
                ) : filteredWorldbooks.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    {categoryFilter ? '该分类下没有世界书' : '还没有世界书'}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredWorldbooks.map(wb => (
                      <button
                        key={wb.id}
                        onClick={() => toggleWorldbook(wb.id)}
                        className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                          selectedIds.includes(wb.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {wb.title}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              注入位置: {
                                wb.insertion === 'before' ? '前' :
                                wb.insertion === 'middle' ? '中' : '后'
                              }
                              {wb.scope === 'global' ? ' • 全局' : ' • 局部'}
                            </div>
                          </div>
                          {selectedIds.includes(wb.id) && (
                            <Check className="w-5 h-5 text-blue-600 flex-shrink-0 ml-2" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 说明 */}
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                <div className="font-medium text-gray-700">💡 功能说明：</div>
                <div>• 这里配置的是<strong>局部世界书</strong>，只对当前会话生效；全局世界书会自动应用到所有角色</div>
                <div>• 世界书条目会作为角色设定的一部分注入到AI提示词中，与角色设定同等重要</div>
                <div>• 可同时挂载多个局部世界书，内容会按注入位置合并</div>
                <div>• 如有明显冲突，AI需要用自然方式统一设定（而不是直接否认之前的设定）</div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorldbookMountSettings;
