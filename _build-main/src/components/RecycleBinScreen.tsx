/**
 * 回收站界面
 * 显示所有已删除的信件和回信
 */

import { ArrowLeft, Trash2, RotateCcw, Mail, Reply as ReplyIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getAllDeletedItems, permanentlyDeleteItem, restoreUserLetter, restoreAIReply, type DeletedItem } from '../utils/letterService';

interface RecycleBinScreenProps {
  onBack: () => void;
}

export default function RecycleBinScreen({ onBack }: RecycleBinScreenProps) {
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);

  useEffect(() => {
    loadDeletedItems();
  }, []);

  const loadDeletedItems = () => {
    const items = getAllDeletedItems();
    setDeletedItems(items);
  };

  const handleRestore = (item: DeletedItem) => {
    if (confirm(`确定要恢复这${item.type === 'userLetter' ? '封寄信' : '封回信'}吗？`)) {
      const success = item.type === 'userLetter' 
        ? restoreUserLetter(item.letterId, item.roundNumber)
        : restoreAIReply(item.letterId, item.roundNumber);
      
      if (success) {
        alert('✅ 已恢复');
        loadDeletedItems();
      } else {
        alert('❌ 恢复失败');
      }
    }
  };

  const handlePermanentDelete = (item: DeletedItem) => {
    if (confirm(`⚠️ 警告：确定要彻底删除这${item.type === 'userLetter' ? '封寄信' : '封回信'}吗？\n\n彻底删除后无法恢复！`)) {
      const success = permanentlyDeleteItem(item.letterId, item.roundNumber, item.type);
      
      if (success) {
        alert('✅ 已彻底删除');
        loadDeletedItems();
      } else {
        alert('❌ 删除失败');
      }
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return '今天';
    } else if (diffInDays === 1) {
      return '昨天';
    } else if (diffInDays < 7) {
      return `${diffInDays}天前`;
    } else if (diffInDays < 30) {
      return `${Math.floor(diffInDays / 7)}周前`;
    } else {
      return `${Math.floor(diffInDays / 30)}个月前`;
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Trash2 size={20} className="text-gray-600" />
          回收站
        </h1>
        <div className="w-9" /> {/* 占位 */}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {deletedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Trash2 size={64} className="mb-4 opacity-30" />
            <p className="text-lg">回收站是空的</p>
            <p className="text-sm mt-2">已删除的内容会在这里显示</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="text-sm text-gray-500 mb-4">
              共 {deletedItems.length} 项已删除内容
            </div>
            
            {deletedItems.map((item, index) => (
              <div
                key={`${item.letterId}-${item.roundNumber}-${item.type}-${index}`}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* 卡片头部 */}
                <div className={`px-4 py-3 flex items-center justify-between ${
                  item.type === 'userLetter' 
                    ? 'bg-gradient-to-r from-orange-50 to-amber-50' 
                    : 'bg-gradient-to-r from-blue-50 to-indigo-50'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {item.type === 'userLetter' ? <Mail size={20} className="text-orange-600" /> : <ReplyIcon size={20} className="text-blue-600" />}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-800">
                        {item.type === 'userLetter' ? '寄给' : '来自'} {item.letterInfo.receiverName}
                      </div>
                      <div className="text-xs text-gray-500">
                        第 {item.roundNumber} 轮 • 删除于 {formatDate(item.deletedAt)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 内容预览 */}
                <div className="px-4 py-3 bg-white">
                  <div className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                    {item.content}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="px-4 py-3 bg-gray-50 flex items-center justify-end gap-2 border-t border-gray-100">
                  <button
                    onClick={() => handleRestore(item)}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                    <RotateCcw size={16} />
                    恢复
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(item)}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                    <Trash2 size={16} />
                    彻底删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
