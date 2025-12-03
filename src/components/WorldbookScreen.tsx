import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, Globe, MessageCircle, Code, FileText, Tag, Settings } from 'lucide-react';
import { WorldbookItem, WorldbookCategory } from '../types/worldbook';
import { getAllWorldbooks, saveWorldbook, deleteWorldbook } from '../utils/worldbookStorage';
import { getAllCategories } from '../utils/worldbookCategories';
import WorldbookForm from './WorldbookForm';
import WorldbookCategoryManager from './WorldbookCategoryManager';

interface WorldbookScreenProps {
  onBack: () => void;
}

type TabType = 'global' | 'local';

const WorldbookScreen: React.FC<WorldbookScreenProps> = ({ onBack }) => {
  const [worldbooks, setWorldbooks] = useState<WorldbookItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('global');
  const [showForm, setShowForm] = useState(false);
  const [editingWorldbook, setEditingWorldbook] = useState<WorldbookItem | undefined>();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<WorldbookCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  useEffect(() => {
    loadWorldbooks();
    loadCategories();
  }, []);

  const loadCategories = () => {
    const cats = getAllCategories();
    setCategories(cats);
  };

  const loadWorldbooks = async () => {
    setLoading(true);
    try {
      const items = await getAllWorldbooks();
      setWorldbooks(items);
    } catch (error) {
      console.error('Failed to load worldbooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (worldbook: WorldbookItem) => {
    try {
      await saveWorldbook(worldbook);
      await loadWorldbooks();
      setShowForm(false);
      setEditingWorldbook(undefined);
    } catch (error) {
      console.error('Failed to save worldbook:', error);
      alert('保存失败，请重试');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个世界书吗？')) return;
    
    try {
      await deleteWorldbook(id);
      await loadWorldbooks();
    } catch (error) {
      console.error('Failed to delete worldbook:', error);
      alert('删除失败，请重试');
    }
  };

  const handleEdit = (worldbook: WorldbookItem) => {
    setEditingWorldbook(worldbook);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingWorldbook(undefined);
    setShowForm(true);
  };

  // 筛选世界书（范围 + 分类）
  const filteredWorldbooks = worldbooks.filter(wb => {
    if (wb.scope !== activeTab) return false;
    if (selectedCategoryId === 'all') return true;
    return wb.categories.includes(selectedCategoryId);
  });

  if (showForm) {
    return (
      <WorldbookForm
        worldbook={editingWorldbook}
        onSave={handleSave}
        onCancel={() => {
          setShowForm(false);
          setEditingWorldbook(undefined);
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 flex items-center justify-between shadow-lg">
        <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">世界书</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategoryManager(true)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="分类管理"
          >
            <Settings className="w-6 h-6" />
          </button>
          <button
            onClick={handleNew}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="新建世界书"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab('global')}
          className={`flex-1 py-3 px-4 text-center transition-colors ${
            activeTab === 'global'
              ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Globe className="w-5 h-5 inline-block mr-2" />
          全局设定
        </button>
        <button
          onClick={() => setActiveTab('local')}
          className={`flex-1 py-3 px-4 text-center transition-colors ${
            activeTab === 'local'
              ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <MessageCircle className="w-5 h-5 inline-block mr-2" />
          局部设定
        </button>
      </div>

      {/* Category Filter */}
      <div className="bg-gray-50 border-b border-gray-200 p-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Tag className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <button
            onClick={() => setSelectedCategoryId('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              selectedCategoryId === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            全部
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap border-2 ${
                selectedCategoryId === cat.id
                  ? 'text-white'
                  : 'bg-white text-gray-700 hover:opacity-80'
              }`}
              style={{
                backgroundColor: selectedCategoryId === cat.id ? cat.color : 'white',
                borderColor: cat.color,
                color: selectedCategoryId === cat.id ? 'white' : cat.color,
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : filteredWorldbooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <div className="text-6xl mb-4">📚</div>
            <p>还没有{activeTab === 'global' ? '全局' : '局部'}世界书</p>
            <button
              onClick={handleNew}
              className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              创建第一个
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredWorldbooks.map(wb => (
              <div
                key={wb.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {wb.type === 'html' ? (
                        <Code className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      )}
                      <h3 className="font-semibold text-gray-900 truncate">{wb.title}</h3>
                    </div>
                    
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {wb.content.substring(0, 100)}
                      {wb.content.length > 100 && '...'}
                    </p>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>注入位置: {
                        wb.insertion === 'before' ? '前' :
                        wb.insertion === 'middle' ? '中' : '后'
                      }</span>
                      {wb.categories.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{wb.categories.length} 个分类</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(wb)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(wb.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Manager Modal */}
      {showCategoryManager && (
        <WorldbookCategoryManager
          onClose={() => {
            setShowCategoryManager(false);
            loadCategories(); // 重新加载分类
          }}
        />
      )}
    </div>
  );
};

export default WorldbookScreen;
