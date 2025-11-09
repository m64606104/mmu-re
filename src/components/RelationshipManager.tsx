/**
 * 关系管理容器组件
 * 集成关系图谱、卡片列表和编辑器
 */

import { useState, useMemo } from 'react';
import { Users, Plus, Network } from 'lucide-react';
import {
  CharacterRelationship,
  loadCharacterRelationships,
  saveCharacterRelationship,
  deleteCharacterRelationship,
  generateRelationshipId
} from '../utils/aiRelationships';
import { Conversation, ApiConfig } from '../types';
import { analyzeRelationshipAffection } from '../utils/relationshipAnalyzer';
import RelationshipGraph from './RelationshipGraph';
import RelationshipCard from './RelationshipCard';
import RelationshipEditor from './RelationshipEditor';
import LinkVirtualToContactModal from './LinkVirtualToContactModal';

interface RelationshipManagerProps {
  characterId: string;
  characterName: string;
  characterAvatar?: string;
  availableContacts: Conversation[];
  apiConfig: ApiConfig;
}

export default function RelationshipManager({
  characterId,
  characterName,
  characterAvatar,
  availableContacts,
  apiConfig
}: RelationshipManagerProps) {
  const [relationships, setRelationships] = useState<CharacterRelationship[]>(
    loadCharacterRelationships(characterId)
  );
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('list');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState<CharacterRelationship | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'contact' | 'virtual'>('all');
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkingVirtualRelationship, setLinkingVirtualRelationship] = useState<CharacterRelationship | null>(null);

  // 过滤关系
  const filteredRelationships = useMemo(() => {
    if (activeFilter === 'all') return relationships;
    return relationships.filter(r => r.type === activeFilter);
  }, [relationships, activeFilter]);

  // 统计
  const stats = useMemo(() => {
    return {
      total: relationships.length,
      contacts: relationships.filter(r => r.type === 'contact').length,
      virtuals: relationships.filter(r => r.type === 'virtual').length,
      avgAffection: relationships.length > 0
        ? Math.round(relationships.reduce((sum, r) => sum + r.affectionLevel, 0) / relationships.length)
        : 0
    };
  }, [relationships]);

  const handleAddRelationship = () => {
    setEditingRelationship(null);
    setIsEditorOpen(true);
  };

  const handleEditRelationship = (relationship: CharacterRelationship) => {
    setEditingRelationship(relationship);
    setIsEditorOpen(true);
  };

  const handleSaveRelationship = (relationship: CharacterRelationship) => {
    saveCharacterRelationship(characterId, relationship);
    setRelationships(loadCharacterRelationships(characterId));
    setIsEditorOpen(false);
    setEditingRelationship(null);
  };

  const handleDeleteRelationship = (relationshipId: string) => {
    if (confirm('确定要删除这个关系吗？')) {
      deleteCharacterRelationship(characterId, relationshipId);
      setRelationships(loadCharacterRelationships(characterId));
    }
  };

  const handleAnalyzeAffection = async (description: string): Promise<number> => {
    return await analyzeRelationshipAffection(description, apiConfig);
  };

  const handleLinkVirtualToContact = (relationship: CharacterRelationship) => {
    setLinkingVirtualRelationship(relationship);
    setIsLinkModalOpen(true);
  };

  const handleConfirmLink = (virtualRelationship: CharacterRelationship, contactId: string) => {
    // 找到选中的联系人
    const selectedContact = availableContacts.find(c => c.id === contactId);
    if (!selectedContact) return;

    // 创建新的联系人关系（基于虚拟角色的数据）
    const newRelationship: CharacterRelationship = {
      ...virtualRelationship,
      id: generateRelationshipId(),
      type: 'contact',
      contactId: selectedContact.id,
      contactName: selectedContact.characterSettings?.nickname || selectedContact.name,
      contactAvatar: selectedContact.characterSettings?.avatar || selectedContact.avatar,
      virtualName: undefined,
      virtualDescription: undefined,
      updatedAt: Date.now()
    };

    // 保存新关系
    saveCharacterRelationship(characterId, newRelationship);

    // 删除原虚拟角色关系
    deleteCharacterRelationship(characterId, virtualRelationship.id);

    // 刷新列表
    setRelationships(loadCharacterRelationships(characterId));

    // 关闭弹窗
    setIsLinkModalOpen(false);
    setLinkingVirtualRelationship(null);

    alert('✅ 成功关联虚拟角色到联系人！');
  };

  return (
    <div className="space-y-4">
      {/* 标题和统计 */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
              <Users className="w-6 h-6 text-blue-600" />
              人际关系
            </h2>
            <p className="text-gray-600 text-sm">
              管理 {characterName} 的社交网络
            </p>
          </div>
          
          <button
            onClick={handleAddRelationship}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>添加关系</span>
          </button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.total}</div>
            <div className="text-xs text-gray-600">全部关系</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
            <div className="text-3xl font-bold text-blue-600 mb-1">{stats.contacts}</div>
            <div className="text-xs text-blue-600">已知联系人</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 border border-orange-200">
            <div className="text-3xl font-bold text-orange-600 mb-1">{stats.virtuals}</div>
            <div className="text-xs text-orange-600">虚拟角色</div>
          </div>
          <div className="bg-pink-50 rounded-xl p-3 border border-pink-200">
            <div className="text-3xl font-bold text-pink-600 mb-1">{stats.avgAffection}</div>
            <div className="text-xs text-pink-600">平均好感度</div>
          </div>
        </div>
      </div>

      {/* 视图切换 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              viewMode === 'list'
                ? 'bg-blue-500 text-white border border-blue-500'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>卡片列表</span>
          </button>
          <button
            onClick={() => setViewMode('graph')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              viewMode === 'graph'
                ? 'bg-blue-500 text-white border border-blue-500'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>关系图谱</span>
          </button>
        </div>

        {/* 筛选器 */}
        <div className="flex gap-2">
          {(['all', 'contact', 'virtual'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                activeFilter === filter
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {filter === 'all' && '全部'}
              {filter === 'contact' && '联系人'}
              {filter === 'virtual' && '虚拟角色'}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      {viewMode === 'graph' ? (
        <div className="h-[500px]">
          <RelationshipGraph
            centerCharacter={{
              id: characterId,
              name: characterName,
              avatar: characterAvatar
            }}
            relationships={filteredRelationships}
            onNodeClick={(nodeId) => {
              const relationship = relationships.find(r => r.id === nodeId);
              if (relationship) {
                handleEditRelationship(relationship);
              }
            }}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRelationships.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-gray-900 font-semibold mb-2">
                还没有{activeFilter === 'virtual' ? '虚拟角色' : activeFilter === 'contact' ? '联系人关系' : '任何关系'}
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                点击上方“添加关系”按钮开始建立社交网络
              </p>
              <button
                onClick={handleAddRelationship}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all shadow-sm"
              >
                <Plus className="w-5 h-5" />
                <span>添加第一个关系</span>
              </button>
            </div>
          ) : (
            <>
              {filteredRelationships.map(relationship => (
                <RelationshipCard
                  key={relationship.id}
                  relationship={relationship}
                  onEdit={handleEditRelationship}
                  onDelete={handleDeleteRelationship}
                  onLink={relationship.type === 'virtual' ? handleLinkVirtualToContact : undefined}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* 编辑器 */}
      <RelationshipEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingRelationship(null);
        }}
        onSave={handleSaveRelationship}
        editingRelationship={editingRelationship}
        availableContacts={availableContacts}
        onAnalyzeAffection={handleAnalyzeAffection}
      />

      {/* 关联虚拟角色到联系人弹窗 */}
      {linkingVirtualRelationship && (
        <LinkVirtualToContactModal
          isOpen={isLinkModalOpen}
          onClose={() => {
            setIsLinkModalOpen(false);
            setLinkingVirtualRelationship(null);
          }}
          onLink={handleConfirmLink}
          virtualRelationship={linkingVirtualRelationship}
          availableContacts={availableContacts}
        />
      )}
    </div>
  );
}
