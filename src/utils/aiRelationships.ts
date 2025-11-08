/**
 * AI关系系统
 * 管理AI之间的关系网络，影响互动行为
 */

export type RelationshipLevel = 
  | 'close'        // 很熟悉/好朋友
  | 'friendly'     // 普通好友
  | 'neutral'      // 普通关系
  | 'dislike'      // 看不爽
  | 'hostile';     // 互相厌恶

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
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('加载关系数据失败:', error);
  }
  
  return {
    relationships: [],
    version: 1
  };
};

/**
 * 保存关系数据
 */
export const saveRelationships = (data: RelationshipData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('保存关系数据失败:', error);
  }
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
