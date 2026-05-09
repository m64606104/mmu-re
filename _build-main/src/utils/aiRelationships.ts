/**
 * AI关系系统 v2.0
 * 管理AI之间的关系网络，影响互动行为
 * 支持虚拟角色、好感度系统、自定义描述
 */

import { load, save } from './storage';

export type RelationshipStatus = 
  | 'stranger'      // 陌生人
  | 'acquaintance'  // 认识
  | 'friend'        // 朋友
  | 'close'         // 密友
  | 'family'        // 家人
  | 'romantic'      // 恋人
  | 'rival'         // 竞争对手
  | 'enemy'         // 敌人
  | 'unknown';      // 未知

// 旧版本兼容
export type RelationshipLevel = 
  | 'close'        // 很熟悉/好朋友
  | 'friendly'     // 普通好友
  | 'neutral'      // 普通关系
  | 'dislike'      // 看不爽
  | 'hostile';     // 互相厌恶

export interface CharacterRelationship {
  id: string;                    // 关系ID
  type: 'contact' | 'virtual';   // 联系人 | 虚拟角色
  
  // 如果是联系人
  contactId?: string;            // 联系人ID
  contactName?: string;          // 联系人名称（缓存）
  contactAvatar?: string;        // 联系人头像（缓存）
  
  // 如果是虚拟角色
  virtualName?: string;          // 虚拟角色名称
  virtualDescription?: string;   // 虚拟角色描述
  
  // 关系描述
  relationshipDesc: string;      // 用户自定义关系描述
  
  // 好感度系统
  affectionLevel: number;        // 0-100的好感度数值
  aiSuggestedAffection?: number; // AI建议的好感度
  
  // 关系状态
  status: RelationshipStatus;
  
  // 元数据
  notes?: string;                // 备注
  tags?: string[];               // 标签
  createdAt: number;
  updatedAt: number;
}

// 旧版本关系结构（兼容）
export interface AIRelationship {
  fromAI: string;      // AI的ID
  toAI: string;        // 对方AI的ID
  level: RelationshipLevel;
  description?: string; // 关系描述（可选）
  lastUpdated: number;  // 最后更新时间
}

export interface RelationshipData {
  relationships: AIRelationship[];
  version: number;
}

const STORAGE_KEY = 'ai_relationships';
const CHARACTER_RELATIONSHIPS_KEY = 'character_relationships_v2';
let relationshipsCache: RelationshipData | null = null;
let characterRelationshipsCache: Record<string, CharacterRelationship[]> | null = null;

export async function initializeRelationshipStorage(): Promise<void> {
  try {
    const [legacyRelationships, legacyCharacterRelationships] = await Promise.all([
      load(STORAGE_KEY),
      load(CHARACTER_RELATIONSHIPS_KEY),
    ]);

    relationshipsCache = legacyRelationships && typeof legacyRelationships === 'object'
      ? legacyRelationships as RelationshipData
      : { relationships: [], version: 1 };
    characterRelationshipsCache = legacyCharacterRelationships && typeof legacyCharacterRelationships === 'object'
      ? legacyCharacterRelationships as Record<string, CharacterRelationship[]>
      : {};
  } catch (error) {
    console.error('初始化关系存储失败:', error);
    relationshipsCache = { relationships: [], version: 1 };
    characterRelationshipsCache = {};
  }
}

/**
 * 获取关系等级的描述
 */
export const getRelationshipLabel = (level: RelationshipLevel): string => {
  const labels: Record<RelationshipLevel, string> = {
    'close': '好朋友',
    'friendly': '普通好友',
    'neutral': '普通关系',
    'dislike': '看不爽',
    'hostile': '互相厌恶'
  };
  return labels[level];
};

/**
 * 获取关系等级的颜色
 */
export const getRelationshipColor = (level: RelationshipLevel): string => {
  const colors: Record<RelationshipLevel, string> = {
    'close': 'text-pink-500',
    'friendly': 'text-blue-500',
    'neutral': 'text-gray-500',
    'dislike': 'text-orange-500',
    'hostile': 'text-red-500'
  };
  return colors[level];
};

/**
 * 获取关系等级的emoji
 */
export const getRelationshipEmoji = (level: RelationshipLevel): string => {
  const emojis: Record<RelationshipLevel, string> = {
    'close': '💕',
    'friendly': '😊',
    'neutral': '😐',
    'dislike': '😒',
    'hostile': '😠'
  };
  return emojis[level];
};

/**
 * 加载所有关系数据
 */
export const loadRelationships = (): RelationshipData => {
  if (relationshipsCache) {
    return relationshipsCache;
  }
  relationshipsCache = {
    relationships: [],
    version: 1
  };
  return relationshipsCache;
};

/**
 * 保存关系数据
 */
export const saveRelationships = (data: RelationshipData): void => {
  relationshipsCache = data;
  void save(STORAGE_KEY, data).catch(error => {
    console.error('保存关系数据失败:', error);
  });
};

/**
 * 获取两个AI之间的关系
 */
export const getRelationship = (fromAI: string, toAI: string): AIRelationship | null => {
  const data = loadRelationships();
  return data.relationships.find(
    r => r.fromAI === fromAI && r.toAI === toAI
  ) || null;
};

/**
 * 设置或更新两个AI之间的关系
 */
export const setRelationship = (
  fromAI: string,
  toAI: string,
  level: RelationshipLevel,
  description?: string
): void => {
  const data = loadRelationships();
  
  const existingIndex = data.relationships.findIndex(
    r => r.fromAI === fromAI && r.toAI === toAI
  );
  
  const relationship: AIRelationship = {
    fromAI,
    toAI,
    level,
    description,
    lastUpdated: Date.now()
  };
  
  if (existingIndex >= 0) {
    data.relationships[existingIndex] = relationship;
  } else {
    data.relationships.push(relationship);
  }
  
  saveRelationships(data);
};

/**
 * 获取AI的所有关系
 */
export const getAIRelationships = (aiId: string): AIRelationship[] => {
  const data = loadRelationships();
  return data.relationships.filter(r => r.fromAI === aiId);
};

/**
 * 删除关系（重置为中性）
 */
export const deleteRelationship = (fromAI: string, toAI: string): void => {
  const data = loadRelationships();
  data.relationships = data.relationships.filter(
    r => !(r.fromAI === fromAI && r.toAI === toAI)
  );
  saveRelationships(data);
};

/**
 * 初始化新AI的关系网络
 * 当添加新AI时，自动为其创建与其他AI的中性关系
 */
export const initializeAIRelationships = (newAIId: string, existingAIIds: string[]): void => {
  const data = loadRelationships();
  
  for (const existingAIId of existingAIIds) {
    // 检查是否已存在关系
    const hasRelation = data.relationships.some(
      r => r.fromAI === newAIId && r.toAI === existingAIId
    );
    
    if (!hasRelation) {
      // 创建默认的中性关系
      data.relationships.push({
        fromAI: newAIId,
        toAI: existingAIId,
        level: 'neutral',
        lastUpdated: Date.now()
      });
    }
    
    // 也为反向关系创建
    const hasReverseRelation = data.relationships.some(
      r => r.fromAI === existingAIId && r.toAI === newAIId
    );
    
    if (!hasReverseRelation) {
      data.relationships.push({
        fromAI: existingAIId,
        toAI: newAIId,
        level: 'neutral',
        lastUpdated: Date.now()
      });
    }
  }
  
  saveRelationships(data);
};

/**
 * 获取关系对互动的影响系数
 * 返回值范围：0.1 (hostile) 到 2.0 (close)
 */
export const getRelationshipInfluence = (level: RelationshipLevel): number => {
  const influence: Record<RelationshipLevel, number> = {
    'close': 2.0,      // 好朋友：互动概率翻倍
    'friendly': 1.3,   // 普通好友：互动概率+30%
    'neutral': 1.0,    // 普通关系：正常概率
    'dislike': 0.5,    // 看不爽：互动概率减半
    'hostile': 0.1     // 互相厌恶：几乎不互动
  };
  return influence[level];
};

/**
 * ============================================
 * 新版关系系统功能
 * ============================================
 */

/**
 * 获取关系状态的中文标签
 */
export const getRelationshipStatusLabel = (status: RelationshipStatus): string => {
  const labels: Record<RelationshipStatus, string> = {
    'stranger': '陌生人',
    'acquaintance': '认识',
    'friend': '朋友',
    'close': '密友',
    'family': '家人',
    'romantic': '恋人',
    'rival': '竞争对手',
    'enemy': '敌人',
    'unknown': '未知'
  };
  return labels[status];
};

/**
 * 获取关系状态的emoji
 */
export const getRelationshipStatusEmoji = (status: RelationshipStatus): string => {
  const emojis: Record<RelationshipStatus, string> = {
    'stranger': '👤',
    'acquaintance': '👋',
    'friend': '🙂',
    'close': '💙',
    'family': '👨‍👩‍👧‍👦',
    'romantic': '💕',
    'rival': '⚔️',
    'enemy': '💢',
    'unknown': '❓'
  };
  return emojis[status];
};

/**
 * 获取关系状态的颜色
 */
export const getRelationshipStatusColor = (status: RelationshipStatus): string => {
  const colors: Record<RelationshipStatus, string> = {
    'stranger': 'bg-gray-500',
    'acquaintance': 'bg-blue-400',
    'friend': 'bg-green-500',
    'close': 'bg-blue-600',
    'family': 'bg-purple-500',
    'romantic': 'bg-pink-500',
    'rival': 'bg-orange-500',
    'enemy': 'bg-red-600',
    'unknown': 'bg-gray-400'
  };
  return colors[status];
};

/**
 * 获取好感度颜色（基于数值）
 */
export const getAffectionLevelColor = (level: number): string => {
  if (level >= 90) return 'text-pink-500';
  if (level >= 70) return 'text-blue-500';
  if (level >= 50) return 'text-green-500';
  if (level >= 30) return 'text-yellow-500';
  if (level >= 10) return 'text-orange-500';
  return 'text-red-500';
};

/**
 * 获取好感度描述
 */
export const getAffectionLevelDesc = (level: number): string => {
  if (level >= 90) return '至亲至爱';
  if (level >= 70) return '亲密好友';
  if (level >= 50) return '普通朋友';
  if (level >= 30) return '点头之交';
  if (level >= 10) return '关系冷淡';
  return '敌对关系';
};

/**
 * 将旧版关系等级转换为新版状态和好感度
 */
export const convertLegacyToNew = (level: RelationshipLevel): { status: RelationshipStatus; affection: number } => {
  const conversion: Record<RelationshipLevel, { status: RelationshipStatus; affection: number }> = {
    'close': { status: 'close', affection: 85 },
    'friendly': { status: 'friend', affection: 65 },
    'neutral': { status: 'acquaintance', affection: 50 },
    'dislike': { status: 'rival', affection: 25 },
    'hostile': { status: 'enemy', affection: 5 }
  };
  return conversion[level];
};

/**
 * 保存角色的关系数据
 */
export const saveCharacterRelationships = (characterId: string, relationships: CharacterRelationship[]): void => {
  const allData = characterRelationshipsCache || {};
  allData[characterId] = relationships;
  characterRelationshipsCache = allData;
  void save(CHARACTER_RELATIONSHIPS_KEY, allData).catch(error => {
    console.error('保存角色关系失败:', error);
  });
};

/**
 * 加载角色的关系数据
 */
export const loadCharacterRelationships = (characterId: string): CharacterRelationship[] => {
  if (!characterRelationshipsCache) {
    characterRelationshipsCache = {};
  }
  return characterRelationshipsCache[characterId] || [];
};

/**
 * 添加或更新关系
 */
export const saveCharacterRelationship = (characterId: string, relationship: CharacterRelationship): void => {
  const relationships = loadCharacterRelationships(characterId);
  const existingIndex = relationships.findIndex(r => r.id === relationship.id);
  
  if (existingIndex >= 0) {
    relationships[existingIndex] = { ...relationship, updatedAt: Date.now() };
  } else {
    relationships.push({ ...relationship, createdAt: Date.now(), updatedAt: Date.now() });
  }
  
  saveCharacterRelationships(characterId, relationships);
};

/**
 * 删除关系
 */
export const deleteCharacterRelationship = (characterId: string, relationshipId: string): void => {
  const relationships = loadCharacterRelationships(characterId);
  const filtered = relationships.filter(r => r.id !== relationshipId);
  saveCharacterRelationships(characterId, filtered);
};

/**
 * 生成关系ID
 */
export const generateRelationshipId = (): string => {
  return `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
