import { useState, useRef } from 'react';
import { Plus, Trash2, Heart, User } from 'lucide-react';
import { useStickers } from '../utils/stickerStore';

interface StickerPanelProps {
  currentSenderId: string;
  onSend: (url: string) => void;
}

export function StickerPanel({ currentSenderId, onSend }: StickerPanelProps) {
  const { common, character, addSticker, deleteSticker } = useStickers(currentSenderId);
  const [activeTab, setActiveTab] = useState<'common' | 'character'>('common');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentList = activeTab === 'common' ? common : character;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (url) {
        addSticker(activeTab, url, currentSenderId);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset
  };

  return (
    <div className="h-[250px] bg-[#f5f5f5] flex flex-col border-t border-gray-200">
      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-5 gap-3">
          {/* 添加按钮 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:border-gray-400 transition-colors bg-white"
          >
            <Plus size={24} />
          </button>
          
          {/* 表情列表 */}
          {currentList.map((sticker) => (
            <div key={sticker.id} className="relative group aspect-square">
              <div 
                className="w-full h-full rounded-lg cursor-pointer hover:opacity-90 bg-white p-1 border border-gray-100 shadow-sm"
                onClick={() => onSend(sticker.url)}
              >
                <img
                  src={sticker.url}
                  alt="sticker"
                  className="w-full h-full object-contain"
                />
              </div>
              {/* 删除按钮 - hover显示 (移动端改为长按更佳，这里简化为点击角落) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if(confirm('删除此表情？')) deleteSticker(sticker.id);
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
        
        {currentList.length === 0 && (
          <div className="text-center text-gray-400 text-xs mt-8">
            {activeTab === 'common' ? '通用表情库为空' : '当前角色表情库为空'}
            <br />
            点击 + 号添加
          </div>
        )}
      </div>

      {/* 底部 Tab 栏 */}
      <div className="h-[45px] flex items-center bg-white border-t border-gray-200 px-2 gap-4">
        <button
          onClick={() => setActiveTab('common')}
          className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm ${activeTab === 'common' ? 'bg-gray-100 text-gray-900' : 'hover:bg-gray-50 text-gray-500'}`}
        >
          <Heart size={18} className={activeTab === 'common' ? 'text-red-500 fill-red-500' : ''} />
          通用
        </button>
        <button
          onClick={() => setActiveTab('character')}
          className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm ${activeTab === 'character' ? 'bg-gray-100 text-gray-900' : 'hover:bg-gray-50 text-gray-500'}`}
        >
          <User size={18} className={activeTab === 'character' ? 'text-blue-500 fill-blue-500' : ''} />
          角色专属
        </button>
        
        <div className="flex-1" />
        
        {/* 隐藏的文件输入 */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
