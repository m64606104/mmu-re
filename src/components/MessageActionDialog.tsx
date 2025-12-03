import { useState } from 'react';
import { X, Edit, Trash2, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { EasyChatMessage } from '../types';

interface MessageActionDialogProps {
  message: EasyChatMessage;
  onClose: () => void;
  onEdit: (messageId: string, newText: string) => void;
  onDelete: (messageId: string) => void;
  onEditTime: (messageId: string, newTime: string) => void;
}

export function MessageActionDialog({ 
  message, 
  onClose, 
  onEdit, 
  onDelete, 
  onEditTime 
}: MessageActionDialogProps) {
  const [action, setAction] = useState<'menu' | 'edit' | 'editTime'>('menu');
  const [editText, setEditText] = useState(message.text);
  const [editTime, setEditTime] = useState(message.timestamp);

  const handleEdit = () => {
    if (editText.trim()) {
      onEdit(message.id, editText);
      onClose();
    }
  };

  const handleDelete = () => {
    onDelete(message.id);
    onClose();
  };

  const handleEditTime = () => {
    if (editTime.trim()) {
      onEditTime(message.id, editTime);
      onClose();
    }
  };

  return (
    <div 
      className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-[90%] max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {action === 'menu' ? (
          <>
            {/* 菜单 */}
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-center">消息操作</h3>
            </div>

            <div className="p-4 space-y-2">
              {/* 编辑按钮 */}
              {message.type === 'text' && (
                <button
                  onClick={() => setAction('edit')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                    <Edit className="w-5 h-5 text-white" />
                  </div>
                  <span className="flex-1 text-left">编辑消息</span>
                </button>
              )}

              {/* 修改时间按钮 */}
              <button
                onClick={() => setAction('editTime')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <span className="flex-1 text-left">修改时间</span>
              </button>

              {/* 删除按钮 */}
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 active:bg-red-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
                <span className="flex-1 text-left text-red-600">删除消息</span>
              </button>
            </div>

            {/* 取消按钮 */}
            <div className="px-4 pb-4">
              <button
                onClick={onClose}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-colors"
              >
                取消
              </button>
            </div>
          </>
        ) : action === 'edit' ? (
          <>
            {/* 编辑消息 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3>编辑消息</h3>
              <button
                onClick={() => setAction('menu')}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editText">消息内容</Label>
                <textarea
                  id="editText"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full min-h-[100px] px-3 py-2 border border-gray-200 rounded-lg resize-none outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <Button
                onClick={() => setAction('menu')}
                variant="outline"
                className="flex-1"
              >
                返回
              </Button>
              <Button
                onClick={handleEdit}
                disabled={!editText.trim()}
                className="flex-1 bg-blue-500 hover:bg-blue-600"
              >
                保存
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* 编辑时间 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3>修改时间</h3>
              <button
                onClick={() => setAction('menu')}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editTime">消息时间（格式：HH:MM）</Label>
                <Input
                  id="editTime"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  placeholder="例如：14:30"
                  className="bg-gray-50 border-gray-200"
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <Button
                onClick={() => setAction('menu')}
                variant="outline"
                className="flex-1"
              >
                返回
              </Button>
              <Button
                onClick={handleEditTime}
                disabled={!editTime.trim()}
                className="flex-1 bg-blue-500 hover:bg-blue-600"
              >
                保存
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
