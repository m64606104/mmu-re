/**
 * 关联虚拟角色到联系人的弹窗
 */

import { useState } from 'react';
import { X, Link as LinkIcon, Users } from 'lucide-react';
import { CharacterRelationship } from '../utils/aiRelationships';
import { Conversation } from '../types';

interface LinkVirtualToContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: (virtualRelationship: CharacterRelationship, contactId: string) => void;
  virtualRelationship: CharacterRelationship;
  availableContacts: Conversation[];
}

export default function LinkVirtualToContactModal({
  isOpen,
  onClose,
  onLink,
  virtualRelationship,
  availableContacts
}: LinkVirtualToContactModalProps) {
  const [selectedContactId, setSelectedContactId] = useState('');

  if (!isOpen) return null;

  const handleLink = () => {
    if (!selectedContactId) {
      alert('请选择一个联系人');
      return;
    }

    if (confirm('确定要将虚拟角色关联到此联系人吗？\n\n关联后，虚拟角色的关系数据将合并到联系人关系中。')) {
      onLink(virtualRelationship, selectedContactId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 rounded-2xl border border-white/10 shadow-2xl w-full max-w-md animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500/20 to-pink-500/20 border-b border-white/10 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <LinkIcon className="w-6 h-6" />
            关联虚拟角色
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* 虚拟角色信息 */}
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-orange-400">⚠️</span>
              <span className="text-sm font-semibold text-orange-300">虚拟角色</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              {virtualRelationship.virtualName}
            </h3>
            {virtualRelationship.virtualDescription && (
              <p className="text-sm text-gray-400">
                {virtualRelationship.virtualDescription}
              </p>
            )}
            <div className="mt-3 pt-3 border-t border-orange-500/20">
              <p className="text-sm text-gray-300">
                <strong>关系：</strong>{virtualRelationship.relationshipDesc}
              </p>
              <p className="text-sm text-gray-300 mt-1">
                <strong>好感度：</strong>{virtualRelationship.affectionLevel}
              </p>
            </div>
          </div>

          {/* 选择联系人 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              选择要关联的联系人
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableContacts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>没有可用的联系人</p>
                </div>
              ) : (
                availableContacts.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContactId(contact.id)}
                    className={`w-full p-3 rounded-xl border transition-all text-left ${
                      selectedContactId === contact.id
                        ? 'bg-blue-500/20 border-blue-500 ring-2 ring-blue-500/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {contact.characterSettings?.avatar ? (
                        <img
                          src={contact.characterSettings.avatar}
                          alt={contact.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="text-white font-medium">
                          {contact.characterSettings?.nickname || contact.name}
                        </div>
                        {contact.characterSettings?.personality && (
                          <div className="text-xs text-gray-400 truncate">
                            {contact.characterSettings.personality.substring(0, 40)}...
                          </div>
                        )}
                      </div>
                      {selectedContactId === contact.id && (
                        <div className="text-blue-400">✓</div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 说明 */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-300">
              💡 <strong>关联后会发生什么？</strong>
            </p>
            <ul className="text-xs text-gray-400 mt-2 space-y-1 ml-4">
              <li>• 虚拟角色的关系数据将转换为联系人关系</li>
              <li>• 原虚拟角色记录将被删除</li>
              <li>• 关系描述和好感度将保留</li>
              <li>• 可以在关系列表中继续管理</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-black/20 border-t border-white/10 p-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleLink}
            disabled={!selectedContactId || availableContacts.length === 0}
            className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <LinkIcon className="w-4 h-4" />
            <span>确认关联</span>
          </button>
        </div>
      </div>
    </div>
  );
}
