// 表情包管理界面

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Plus, Trash2, Edit, Search, Image as ImageIcon, Smile, User, Users } from 'lucide-react';
import { Conversation } from '../types';
import { StickerItem, StickerScope } from '../types/sticker';
import {
  getCommonStickers,
  getCharacterStickers,
  addSticker,
  updateSticker,
  deleteSticker,
  imageToBase64,
} from '../utils/stickerStorage';

interface StickerManagementScreenProps {
  onBack: () => void;
  conversations: Conversation[];
}

export default function StickerManagementScreen({ onBack, conversations }: StickerManagementScreenProps) {
  const [activeTab, setActiveTab] = useState<'common' | 'character'>('common');
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSticker, setEditingSticker] = useState<StickerItem | null>(null);
  const [loading, setLoading] = useState(false);

  // 加载表情包
  useEffect(() => {
    loadStickers();
  }, [activeTab, selectedCharacter]);

  const loadStickers = async () => {
    setLoading(true);
    try {
      if (activeTab === 'common') {
        const data = await getCommonStickers();
        setStickers(data);
      } else if (selectedCharacter) {
        const data = await getCharacterStickers(selectedCharacter);
        setStickers(data);
      } else {
        setStickers([]);
      }
    } catch (error) {
      console.error('Failed to load stickers:', error);
    } finally {
      setLoading(false);
    }
  };

  // 过滤表情包
  const filteredStickers = stickers.filter(sticker => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      sticker.description.toLowerCase().includes(query) ||
      sticker.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  // 处理删除
  const handleDelete = async (sticker: StickerItem) => {
    if (!confirm(`确定要删除表情包"${sticker.description}"吗？`)) return;
    
    try {
      await deleteSticker(sticker.id, sticker.scope, sticker.characterId);
      await loadStickers();
    } catch (error) {
      console.error('Failed to delete sticker:', error);
      alert('删除失败');
    }
  };

  // 私聊AI列表（用于角色专属表情包）
  const privateConversations = conversations.filter(c => c.type === 'private');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">表情包管理</h1>
          <button
            onClick={() => {
              setEditingSticker(null);
              setShowAddModal(true);
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Plus className="w-6 h-6 text-blue-600" />
          </button>
        </div>

        {/* Tab切换 */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => {
              setActiveTab('common');
              setSelectedCharacter(null);
            }}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'common'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              <span>通用表情包</span>
              <span className="text-xs text-gray-500">({stickers.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('character')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'character'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <User className="w-4 h-4" />
              <span>角色专属</span>
            </div>
          </button>
        </div>

        {/* 角色选择器 */}
        {activeTab === 'character' && (
          <div className="p-3 border-b border-gray-200">
            <select
              value={selectedCharacter || ''}
              onChange={(e) => setSelectedCharacter(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择角色</option>
              {privateConversations.map(conv => (
                <option key={conv.id} value={conv.id}>
                  {conv.characterSettings?.nickname || conv.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 搜索框 */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索表情包描述或标签..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-12 text-gray-500">加载中...</div>
        ) : activeTab === 'character' && !selectedCharacter ? (
          <div className="text-center py-12">
            <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">请选择一个角色查看其专属表情包</p>
          </div>
        ) : filteredStickers.length === 0 ? (
          <div className="text-center py-12">
            <Smile className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-2">
              {searchQuery ? '没有找到匹配的表情包' : '还没有表情包'}
            </p>
            <button
              onClick={() => {
                setEditingSticker(null);
                setShowAddModal(true);
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              添加第一个表情包
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filteredStickers.map(sticker => (
              <div
                key={sticker.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden group"
              >
                {/* 图片 */}
                <div className="aspect-square bg-gray-100 relative">
                  <img
                    src={sticker.imageUrl}
                    alt={sticker.description}
                    className="w-full h-full object-cover"
                  />
                  {/* 操作按钮 */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        setEditingSticker(sticker);
                        setShowAddModal(true);
                      }}
                      className="p-2 bg-white rounded-lg hover:bg-gray-100"
                    >
                      <Edit className="w-4 h-4 text-gray-700" />
                    </button>
                    <button
                      onClick={() => handleDelete(sticker)}
                      className="p-2 bg-white rounded-lg hover:bg-gray-100"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
                {/* 描述 */}
                <div className="p-2">
                  <p className="text-xs text-gray-700 line-clamp-2">{sticker.description}</p>
                  {sticker.usage !== undefined && sticker.usage > 0 && (
                    <p className="text-xs text-gray-400 mt-1">使用 {sticker.usage} 次</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 添加/编辑模态框 */}
      {showAddModal && (
        <AddStickerModal
          editingSticker={editingSticker}
          scope={activeTab}
          characterId={selectedCharacter}
          conversations={privateConversations}
          onClose={() => {
            setShowAddModal(false);
            setEditingSticker(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingSticker(null);
            loadStickers();
          }}
        />
      )}
    </div>
  );
}

// 添加/编辑表情包模态框
interface AddStickerModalProps {
  editingSticker: StickerItem | null;
  scope: StickerScope;
  characterId: string | null;
  conversations: Conversation[];
  onClose: () => void;
  onSuccess: () => void;
}

function AddStickerModal({
  editingSticker,
  scope: defaultScope,
  characterId: defaultCharacterId,
  conversations,
  onClose,
  onSuccess,
}: AddStickerModalProps) {
  const [imageUrl, setImageUrl] = useState(editingSticker?.imageUrl || '');
  const [description, setDescription] = useState(editingSticker?.description || '');
  const [tags, setTags] = useState(editingSticker?.tags?.join(', ') || '');
  const [scope, setScope] = useState<StickerScope>(editingSticker?.scope || defaultScope);
  const [characterId, setCharacterId] = useState(editingSticker?.characterId || defaultCharacterId || '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const base64 = await imageToBase64(file);
      setImageUrl(base64);
    } catch (error: any) {
      alert(error.message || '图片上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!imageUrl.trim()) {
      alert('请上传图片');
      return;
    }
    if (!description.trim()) {
      alert('请填写表情包描述');
      return;
    }
    if (scope === 'character' && !characterId) {
      alert('请选择角色');
      return;
    }

    try {
      const tagsArray = tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t);

      if (editingSticker) {
        // 编辑
        await updateSticker({
          ...editingSticker,
          imageUrl,
          description,
          tags: tagsArray,
          scope,
          characterId: scope === 'character' ? characterId : undefined,
        });
      } else {
        // 新增
        await addSticker({
          imageUrl,
          description,
          tags: tagsArray,
          scope,
          characterId: scope === 'character' ? characterId : undefined,
        });
      }
      
      onSuccess();
    } catch (error: any) {
      alert(error.message || '保存失败');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {editingSticker ? '编辑表情包' : '添加表情包'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* 图片上传 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              表情包图片 <span className="text-red-500">*</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors"
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="预览"
                  className="w-32 h-32 mx-auto object-cover rounded-lg"
                />
              ) : (
                <div className="text-center py-8">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">点击上传图片</p>
                  <p className="text-xs text-gray-400 mt-1">支持 JPG、PNG、GIF、WebP，最大5MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {uploading && <p className="text-xs text-blue-600 mt-2">上传中...</p>}
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              表情包描述 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如：小猫疑问、开心大笑、委屈哭泣..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              AI会根据这个描述来判断何时使用这个表情包
            </p>
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              标签（可选）
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="例如：疑问, 可爱, 猫咪（用逗号分隔）"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 作用域 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              表情包类型 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  value="common"
                  checked={scope === 'common'}
                  onChange={(e) => setScope(e.target.value as StickerScope)}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium text-gray-900">通用表情包</div>
                  <div className="text-xs text-gray-500">所有AI都可以使用</div>
                </div>
              </label>
              <label className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  value="character"
                  checked={scope === 'character'}
                  onChange={(e) => setScope(e.target.value as StickerScope)}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium text-gray-900">角色专属</div>
                  <div className="text-xs text-gray-500">只有指定角色可以使用</div>
                </div>
              </label>
            </div>
          </div>

          {/* 角色选择 */}
          {scope === 'character' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择角色 <span className="text-red-500">*</span>
              </label>
              <select
                value={characterId}
                onChange={(e) => setCharacterId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择角色</option>
                {conversations.map(conv => (
                  <option key={conv.id} value={conv.id}>
                    {conv.characterSettings?.nickname || conv.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-3 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300"
          >
            {editingSticker ? '保存' : '添加'}
          </button>
        </div>
      </div>
    </div>
  );
}
