/**
 * iMessage风格的消息操作菜单
 * 胶囊形状，支持引用、编辑、删除
 */

import React from 'react';
import { Reply, Edit2, Trash2 } from 'lucide-react';

interface MessageActionMenuProps {
  isVisible: boolean;
  position: { x: number; y: number };
  isUserMessage: boolean;
  onQuote: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export const MessageActionMenu: React.FC<MessageActionMenuProps> = ({
  isVisible,
  position,
  isUserMessage,
  onQuote,
  onEdit,
  onDelete,
  onClose,
}) => {
  if (!isVisible) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* 胶囊菜单 */}
      <div
        className="fixed z-50 bg-white rounded-full shadow-2xl border border-gray-200 flex items-center overflow-hidden"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -120%)',
        }}
      >
        {/* 引用按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuote();
          }}
          className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors border-r border-gray-200"
        >
          <Reply size={18} className="text-blue-500" />
          <span className="text-sm font-medium text-gray-700">引用</span>
        </button>

        {/* 编辑按钮（仅用户消息） */}
        {isUserMessage && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors border-r border-gray-200"
          >
            <Edit2 size={18} className="text-green-500" />
            <span className="text-sm font-medium text-gray-700">编辑</span>
          </button>
        )}

        {/* 删除按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <Trash2 size={18} className="text-red-500" />
          <span className="text-sm font-medium text-gray-700">删除</span>
        </button>
      </div>
    </>
  );
};
