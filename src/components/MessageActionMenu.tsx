/**
 * iMessage风格的消息操作菜单
 * 胶囊形状，支持引用、编辑、删除
 */

import React from 'react';
import { Reply, Edit2, Trash2, CheckSquare, Share2 } from 'lucide-react';

interface MessageActionMenuProps {
  isVisible: boolean;
  position: { x: number; y: number };
  onQuote: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMultiSelect: () => void;
  onForward?: () => void; // 转发功能
  onReact: (emoji: string) => void; // 表情回应
  onClose: () => void;
}

export const MessageActionMenu: React.FC<MessageActionMenuProps> = ({
  isVisible,
  position,
  onQuote,
  onEdit,
  onDelete,
  onMultiSelect,
  onForward,
  onReact,
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
      
      {/* 表情回应栏 - 放在菜单上方 */}
      <div
        className="fixed z-50 bg-white rounded-full shadow-lg border border-gray-200 flex items-center px-2 py-1 gap-1"
        style={{
          left: `${position.x}px`,
          top: `${position.y - 10}px`, // 稍微上移
          transform: 'translate(-50%, -220%)', // 向上偏移更多，避开菜单
          maxWidth: '90vw',
        }}
      >
        {['👍', '❤️', '😂', '😮', '😢', '👏'].map(emoji => (
          <button
            key={emoji}
            onClick={(e) => {
              e.stopPropagation();
              onReact(emoji);
              onClose();
            }}
            className="text-2xl p-1.5 hover:scale-125 transition-transform active:scale-95 cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>
      
      {/* 胶囊菜单 - 优化尺寸和视觉效果 */}
      <div
        className="fixed z-50 bg-white rounded-full shadow-lg border border-gray-200 flex items-center overflow-hidden"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -120%)',
          maxWidth: '90vw', // 限制最大宽度不超过屏幕90%
        }}
      >
        {/* 引用按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuote();
          }}
          className="flex items-center gap-1.5 px-2.5 py-2 hover:bg-gray-50 transition-colors border-r border-gray-200"
        >
          <Reply size={16} className="text-blue-500" />
          <span className="text-xs font-medium text-gray-700">引用</span>
        </button>

        {/* 转发按钮 */}
        {onForward && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onForward();
            }}
            className="flex items-center gap-1.5 px-2.5 py-2 hover:bg-gray-50 transition-colors border-r border-gray-200"
          >
            <Share2 size={16} className="text-indigo-500" />
            <span className="text-xs font-medium text-gray-700">转发</span>
          </button>
        )}

        {/* 编辑按钮（所有消息都可编辑） */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="flex items-center gap-1.5 px-2.5 py-2 hover:bg-gray-50 transition-colors border-r border-gray-200"
        >
          <Edit2 size={16} className="text-green-500" />
          <span className="text-xs font-medium text-gray-700">编辑</span>
        </button>

        {/* 多选按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMultiSelect();
          }}
          className="flex items-center gap-1.5 px-2.5 py-2 hover:bg-gray-50 transition-colors border-r border-gray-200"
        >
          <CheckSquare size={16} className="text-purple-500" />
          <span className="text-xs font-medium text-gray-700">多选</span>
        </button>

        {/* 删除按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex items-center gap-1.5 px-2.5 py-2 hover:bg-gray-50 transition-colors"
        >
          <Trash2 size={16} className="text-red-500" />
          <span className="text-xs font-medium text-gray-700">删除</span>
        </button>
      </div>
    </>
  );
};
