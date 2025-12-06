import { useState, useRef } from 'react';
import { Plus, Trash2, Heart, User, Type } from 'lucide-react';
import { useStickers } from '../utils/stickerStore';

interface StickerPanelProps {
  currentSenderId: string;
  onSend: (url: string) => void;
  onSendText?: (text: string) => void; // 新增：发送文字表情包
}

export function StickerPanel({ currentSenderId, onSend, onSendText }: StickerPanelProps) {
  const { common, character, addSticker, deleteSticker } = useStickers(currentSenderId);
  const [activeTab, setActiveTab] = useState<'common' | 'character' | 'text'>('common');
  const [textInput, setTextInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (url) {
        const targetTab = activeTab === 'common' || activeTab === 'text' ? 'common' : 'character';
        addSticker(targetTab, url, currentSenderId);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSendTextSticker = () => {
    if (!textInput.trim()) return;
    if (onSendText) {
      onSendText(textInput.trim());
      setTextInput('');
    }
  };

  const getCurrentList = () => {
    if (activeTab === 'common') return common;
    if (activeTab === 'character') return character;
    return [];
  };

  return (
    <div className="h-[280px] bg-[#f5f5f5] flex flex-col border-t border-gray-200">
      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {(activeTab === 'common' || activeTab === 'character') && (
          <div className="grid grid-cols-5 gap-3">
            {/* 添加按钮 */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:border-gray-400 transition-colors bg-white"
            >
              <Plus size={24} />
            </button>
            
            {/* 图片表情列表 */}
            {getCurrentList().map((sticker) => (
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
            
            {getCurrentList().length === 0 && (
              <div className="col-span-5 text-center text-gray-400 text-xs mt-8">
                {activeTab === 'common' ? '通用表情库为空' : '当前角色表情库为空'}
                <br />
                点击 + 号添加
              </div>
            )}
          </div>
        )}

        {activeTab === 'text' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">输入文字，发送大号表情包</p>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="例如：嘿嘿、哈哈、hi..."
              className="w-full h-[120px] px-3 py-2 border border-gray-200 rounded-lg resize-none outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSendTextSticker}
              disabled={!textInput.trim()}
              className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              发送
            </button>
          </div>
        )}
      </div>

      {/* 底部 Tab 栏 */}
      <div className="h-[50px] flex items-center bg-white border-t border-gray-200 px-2 gap-1">
        <button
          onClick={() => setActiveTab('common')}
          className={`flex-1 py-2 rounded-lg transition-colors flex flex-col items-center gap-1 ${activeTab === 'common' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
        >
          <Heart size={16} className={activeTab === 'common' ? 'text-red-500 fill-red-500' : 'text-gray-500'} />
          <span className="text-[10px] text-gray-600">通用</span>
        </button>
        <button
          onClick={() => setActiveTab('character')}
          className={`flex-1 py-2 rounded-lg transition-colors flex flex-col items-center gap-1 ${activeTab === 'character' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
        >
          <User size={16} className={activeTab === 'character' ? 'text-blue-500 fill-blue-500' : 'text-gray-500'} />
          <span className="text-[10px] text-gray-600">角色</span>
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={`flex-1 py-2 rounded-lg transition-colors flex flex-col items-center gap-1 ${activeTab === 'text' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
        >
          <Type size={16} className={activeTab === 'text' ? 'text-green-500' : 'text-gray-500'} />
          <span className="text-[10px] text-gray-600">文字</span>
        </button>
        
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
