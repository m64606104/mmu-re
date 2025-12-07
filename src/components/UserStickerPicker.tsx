// 用户表情包选择器组件

import { useState, useEffect, useRef } from 'react';
import { X, Plus, Search, Smile } from 'lucide-react';
import { StickerItem } from '../types/sticker';
import { getCommonStickers, addSticker, imageToBase64 } from '../utils/stickerStorage';

interface UserStickerPickerProps {
  onClose: () => void;
  onSelectSticker: (sticker: StickerItem) => void;
}

export default function UserStickerPicker({ onClose, onSelectSticker }: UserStickerPickerProps) {
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStickers();
  }, []);

  const loadStickers = async () => {
    setLoading(true);
    try {
      // 只加载通用表情包（用户的个人表情包）
      const data = await getCommonStickers();
      setStickers(data);
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

  const handleSelectSticker = (sticker: StickerItem) => {
    onSelectSticker(sticker);
    onClose();
  };

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* 表情包选择器 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[70vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">选择表情包</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 搜索框 */}
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索表情包..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 表情包网格 */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="text-center py-12 text-gray-500">加载中...</div>
          ) : filteredStickers.length === 0 ? (
            <div className="text-center py-12">
              <Smile className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-4">
                {searchQuery ? '没有找到匹配的表情包' : '还没有表情包'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  添加表情包
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {filteredStickers.map(sticker => (
                  <button
                    key={sticker.id}
                    onClick={() => handleSelectSticker(sticker)}
                    className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:ring-2 hover:ring-blue-500 transition-all active:scale-95"
                  >
                    <img
                      src={sticker.imageUrl}
                      alt={sticker.description}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>

              {/* 添加按钮 */}
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600"
              >
                <Plus className="w-5 h-5" />
                <span className="text-sm font-medium">添加新表情包</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 添加表情包模态框 */}
      {showAddModal && (
        <AddStickerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadStickers();
          }}
        />
      )}
    </>
  );
}

// 添加表情包模态框
interface AddStickerModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function AddStickerModal({ onClose, onSuccess }: AddStickerModalProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
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
      alert('请填写表情包描述\n\n描述用于让AI理解这个表情包的含义，以便AI能正确理解你发送的表情包。');
      return;
    }

    try {
      const tagsArray = tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t);

      await addSticker({
        imageUrl,
        description,
        tags: tagsArray,
        scope: 'common', // 用户表情包都是通用的
      });
      
      onSuccess();
    } catch (error: any) {
      alert(error.message || '保存失败');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">添加表情包</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
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
                  <Smile className="w-12 h-12 mx-auto mb-2 text-gray-400" />
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
              placeholder="例如：开心大笑、小猫疑问、加油打气..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 描述很重要！AI会根据这个描述来理解你发送的表情包含义
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
              placeholder="例如：开心, 可爱, 猫咪（用逗号分隔）"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-3 flex gap-2 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300"
          >
            添加
          </button>
        </div>
      </div>
    </div>
  );
}
