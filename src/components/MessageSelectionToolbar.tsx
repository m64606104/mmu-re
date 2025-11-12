/**
 * 消息多选工具栏
 * 支持：提取文档、转发、删除等操作
 */

import React from 'react';
import { X, FileText, Share2, Trash2 } from 'lucide-react';

interface MessageSelectionToolbarProps {
  selectedCount: number;
  onCancel: () => void;
  onExtractDocument: () => void;
  onForward: () => void;
  onDelete?: () => void;
}

const MessageSelectionToolbar: React.FC<MessageSelectionToolbarProps> = ({
  selectedCount,
  onCancel,
  onExtractDocument,
  onForward,
  onDelete
}) => {
  return (
    <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg z-50">
      <div className="flex items-center justify-between px-4 py-3">
        {/* 左侧：取消按钮 */}
        <button
          onClick={onCancel}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* 中间：选中数量 */}
        <div className="text-lg font-medium">
          已选择 {selectedCount} 条消息
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-2">
          {/* 提取文档 */}
          <button
            onClick={onExtractDocument}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="提取为文档"
          >
            <FileText className="w-5 h-5" />
          </button>

          {/* 转发 */}
          <button
            onClick={onForward}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="转发"
          >
            <Share2 className="w-5 h-5" />
          </button>

          {/* 删除（可选） */}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="删除"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageSelectionToolbar;
