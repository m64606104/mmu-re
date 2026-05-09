/**
 * 关系卡片组件
 * 美观的卡片式设计展示关系详情
 */

import { Users, Edit2, Trash2, Link as LinkIcon } from 'lucide-react';
import {
  CharacterRelationship,
  getRelationshipStatusLabel,
  getRelationshipStatusEmoji,
  getRelationshipStatusColor,
  getAffectionLevelColor,
  getAffectionLevelDesc
} from '../utils/aiRelationships';

interface RelationshipCardProps {
  relationship: CharacterRelationship;
  onEdit: (relationship: CharacterRelationship) => void;
  onDelete: (id: string) => void;
  onLink?: (relationship: CharacterRelationship) => void;
}

export default function RelationshipCard({ relationship, onEdit, onDelete, onLink }: RelationshipCardProps) {
  const isVirtual = relationship.type === 'virtual';
  const displayName = isVirtual ? relationship.virtualName : relationship.contactName;
  const displayAvatar = relationship.contactAvatar;

  // 好感度进度条颜色
  const getProgressBarColor = (level: number) => {
    if (level >= 70) return 'bg-gradient-to-r from-pink-500 to-purple-500';
    if (level >= 50) return 'bg-gradient-to-r from-blue-500 to-cyan-500';
    if (level >= 30) return 'bg-gradient-to-r from-green-500 to-emerald-500';
    return 'bg-gradient-to-r from-orange-500 to-red-500';
  };

  return (
    <div className="group relative bg-white/5 hover:bg-white/10 rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-1">
      {/* 虚拟角色标记 */}
      {isVirtual && (
        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
          <span>⚠️</span>
          <span>虚拟角色</span>
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* 头像 */}
        <div className="relative flex-shrink-0">
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={displayName}
              className="w-16 h-16 rounded-xl object-cover border-2 border-white/20"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center border-2 border-white/20">
              <Users className="w-8 h-8 text-white" />
            </div>
          )}
          
          {/* 关系状态徽章 */}
          <div className={`absolute -bottom-1 -right-1 ${getRelationshipStatusColor(relationship.status)} text-white text-xs px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1`}>
            <span>{getRelationshipStatusEmoji(relationship.status)}</span>
          </div>
        </div>

        {/* 信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-white font-semibold text-base mb-1 flex items-center gap-2">
                {displayName}
                {isVirtual && onLink && (
                  <button
                    onClick={() => onLink(relationship)}
                    className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
                    title="关联到联系人"
                  >
                    <LinkIcon className="w-3 h-3" />
                    <span>关联</span>
                  </button>
                )}
              </h3>
              <p className="text-sm text-gray-400">
                {getRelationshipStatusLabel(relationship.status)}
              </p>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(relationship)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-blue-400 transition-colors"
                title="编辑"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(relationship.id)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 关系描述 */}
          <p className="text-sm text-gray-300 mb-3 line-clamp-2">
            {relationship.relationshipDesc}
          </p>

          {/* 好感度 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">好感度</span>
              <span className={`font-semibold ${getAffectionLevelColor(relationship.affectionLevel)}`}>
                {relationship.affectionLevel} · {getAffectionLevelDesc(relationship.affectionLevel)}
              </span>
            </div>
            
            {/* 进度条 */}
            <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressBarColor(relationship.affectionLevel)} transition-all duration-500 rounded-full`}
                style={{ width: `${relationship.affectionLevel}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* AI建议好感度 */}
          {relationship.aiSuggestedAffection !== undefined && 
           relationship.aiSuggestedAffection !== relationship.affectionLevel && (
            <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
              <span>🤖</span>
              <span>AI建议: {relationship.aiSuggestedAffection}</span>
            </div>
          )}

          {/* 备注 */}
          {relationship.notes && (
            <div className="mt-2 text-xs text-gray-500 bg-black/20 rounded-lg px-2 py-1">
              💡 {relationship.notes}
            </div>
          )}

          {/* 虚拟角色描述 */}
          {isVirtual && relationship.virtualDescription && (
            <div className="mt-2 text-xs text-orange-400/80 bg-orange-500/10 rounded-lg px-2 py-1">
              📝 {relationship.virtualDescription}
            </div>
          )}

          {/* 标签 */}
          {relationship.tags && relationship.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {relationship.tags.map((tag, index) => (
                <span
                  key={index}
                  className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
