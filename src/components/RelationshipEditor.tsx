/**
 * 关系编辑弹窗组件
 * 添加或编辑关系
 */

import { useState, useEffect } from 'react';
import { X, Sparkles, Users } from 'lucide-react';
import {
  CharacterRelationship,
  RelationshipStatus,
  getRelationshipStatusLabel,
  getRelationshipStatusEmoji,
  getRelationshipStatusColor,
  getAffectionLevelDesc,
  generateRelationshipId
} from '../utils/aiRelationships';
import { Conversation } from '../types';

interface RelationshipEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (relationship: CharacterRelationship) => void;
  editingRelationship?: CharacterRelationship | null;
  availableContacts: Conversation[];
  onAnalyzeAffection?: (description: string) => Promise<number>;
}

const relationshipStatuses: RelationshipStatus[] = [
  'stranger', 'acquaintance', 'friend', 'close', 
  'family', 'romantic', 'rival', 'enemy', 'unknown'
];

export default function RelationshipEditor({
  isOpen,
  onClose,
  onSave,
  editingRelationship,
  availableContacts,
  onAnalyzeAffection
}: RelationshipEditorProps) {
  const [type, setType] = useState<'contact' | 'virtual'>('contact');
  const [contactId, setContactId] = useState('');
  const [virtualName, setVirtualName] = useState('');
  const [virtualDescription, setVirtualDescription] = useState('');
  const [relationshipDesc, setRelationshipDesc] = useState('');
  const [status, setStatus] = useState<RelationshipStatus>('friend');
  const [affectionLevel, setAffectionLevel] = useState(50);
  const [aiSuggestedAffection, setAiSuggestedAffection] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 初始化表单
  useEffect(() => {
    if (editingRelationship) {
      setType(editingRelationship.type);
      setContactId(editingRelationship.contactId || '');
      setVirtualName(editingRelationship.virtualName || '');
      setVirtualDescription(editingRelationship.virtualDescription || '');
      setRelationshipDesc(editingRelationship.relationshipDesc);
      setStatus(editingRelationship.status);
      setAffectionLevel(editingRelationship.affectionLevel);
      setAiSuggestedAffection(editingRelationship.aiSuggestedAffection);
      setNotes(editingRelationship.notes || '');
      setTags(editingRelationship.tags || []);
    } else {
      resetForm();
    }
  }, [editingRelationship, isOpen]);

  const resetForm = () => {
    setType('contact');
    setContactId('');
    setVirtualName('');
    setVirtualDescription('');
    setRelationshipDesc('');
    setStatus('friend');
    setAffectionLevel(50);
    setAiSuggestedAffection(undefined);
    setNotes('');
    setTags([]);
    setTagInput('');
  };

  const handleAnalyzeAffection = async () => {
    if (!relationshipDesc.trim() || !onAnalyzeAffection) return;
    
    setIsAnalyzing(true);
    try {
      const suggested = await onAnalyzeAffection(relationshipDesc);
      setAiSuggestedAffection(suggested);
      setAffectionLevel(suggested);
    } catch (error) {
      console.error('分析好感度失败:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSave = () => {
    // 验证
    if (type === 'contact' && !contactId) {
      alert('请选择联系人');
      return;
    }
    if (type === 'virtual' && !virtualName.trim()) {
      alert('请输入虚拟角色名称');
      return;
    }
    if (!relationshipDesc.trim()) {
      alert('请输入关系描述');
      return;
    }

    const selectedContact = type === 'contact' 
      ? availableContacts.find(c => c.id === contactId)
      : null;

    const relationship: CharacterRelationship = {
      id: editingRelationship?.id || generateRelationshipId(),
      type,
      contactId: type === 'contact' ? contactId : undefined,
      contactName: selectedContact?.characterSettings?.nickname || selectedContact?.name,
      contactAvatar: selectedContact?.characterSettings?.avatar || selectedContact?.avatar,
      virtualName: type === 'virtual' ? virtualName : undefined,
      virtualDescription: type === 'virtual' ? virtualDescription : undefined,
      relationshipDesc,
      status,
      affectionLevel,
      aiSuggestedAffection,
      notes,
      tags,
      createdAt: editingRelationship?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    onSave(relationship);
    onClose();
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 rounded-2xl border border-white/10 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-white/10 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6" />
            {editingRelationship ? '编辑关系' : '添加关系'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* 类型选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                关系类型
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setType('contact')}
                  className={`flex-1 p-3 rounded-xl border transition-all ${
                    type === 'contact'
                      ? 'bg-purple-500/20 border-purple-500 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <div className="text-2xl mb-1">👥</div>
                  <div className="font-semibold">已知联系人</div>
                  <div className="text-xs opacity-70">从联系人列表选择</div>
                </button>
                <button
                  onClick={() => setType('virtual')}
                  className={`flex-1 p-3 rounded-xl border transition-all ${
                    type === 'virtual'
                      ? 'bg-orange-500/20 border-orange-500 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <div className="text-2xl mb-1">✨</div>
                  <div className="font-semibold">虚拟角色</div>
                  <div className="text-xs opacity-70">世界观中的人物</div>
                </button>
              </div>
            </div>

            {/* 联系人选择 */}
            {type === 'contact' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  选择联系人
                </label>
                <select
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                >
                  <option value="">请选择...</option>
                  {availableContacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.characterSettings?.nickname || contact.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 虚拟角色信息 */}
            {type === 'virtual' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    虚拟角色名称
                  </label>
                  <input
                    type="text"
                    value={virtualName}
                    onChange={(e) => setVirtualName(e.target.value)}
                    placeholder="例如：王导师"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    角色描述（可选）
                  </label>
                  <input
                    type="text"
                    value={virtualDescription}
                    onChange={(e) => setVirtualDescription(e.target.value)}
                    placeholder="例如：我的研究生导师，专攻量子物理"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </>
            )}

            {/* 关系描述 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                关系描述 *
              </label>
              <textarea
                value={relationshipDesc}
                onChange={(e) => setRelationshipDesc(e.target.value)}
                placeholder="详细描述你们的关系，例如：我们是大学同学，毕业后一起创业，彼此信任，经常一起讨论工作和生活..."
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
              />
              {onAnalyzeAffection && relationshipDesc.trim() && (
                <button
                  onClick={handleAnalyzeAffection}
                  disabled={isAnalyzing}
                  className="mt-2 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzing ? '分析中...' : 'AI智能分析好感度'}</span>
                </button>
              )}
            </div>

            {/* AI建议好感度 */}
            {aiSuggestedAffection !== undefined && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <span className="text-sm font-semibold text-purple-300">AI分析结果</span>
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {aiSuggestedAffection} 分
                </div>
                <div className="text-sm text-gray-400">
                  {getAffectionLevelDesc(aiSuggestedAffection)}
                </div>
              </div>
            )}

            {/* 好感度调节 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                好感度: {affectionLevel} - {getAffectionLevelDesc(affectionLevel)}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={affectionLevel}
                onChange={(e) => setAffectionLevel(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #ec4899 0%, #8b5cf6 ${affectionLevel}%, rgba(255,255,255,0.1) ${affectionLevel}%)`
                }}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0 敌对</span>
                <span>50 普通</span>
                <span>100 至亲</span>
              </div>
            </div>

            {/* 关系状态 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                关系状态
              </label>
              <div className="grid grid-cols-3 gap-2">
                {relationshipStatuses.map(s => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`p-3 rounded-xl border transition-all ${
                      status === s
                        ? `${getRelationshipStatusColor(s)} border-white/20 text-white`
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-xl mb-1">{getRelationshipStatusEmoji(s)}</div>
                    <div className="text-xs font-medium">{getRelationshipStatusLabel(s)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 备注 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                备注（可选）
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="例如：每周六会一起打篮球"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* 标签 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                标签（可选）
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="输入标签，按回车添加"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
                <button
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl transition-colors"
                >
                  添加
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      #{tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
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
            onClick={handleSave}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-purple-500/50"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
