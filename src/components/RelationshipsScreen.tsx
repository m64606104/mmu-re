/**
 * AI关系管理界面
 * 用户可以管理所有AI之间的关系网络
 */

import { useState, useEffect } from 'react';
import { ChevronLeft, Users, Heart } from 'lucide-react';
import { Conversation } from '../types';
import {
  loadRelationships,
  setRelationship,
  getRelationship,
  RelationshipLevel,
  getRelationshipLabel,
  getRelationshipEmoji,
  initializeAIRelationships
} from '../utils/aiRelationships';

interface RelationshipsScreenProps {
  conversations: Conversation[];
  onBack: () => void;
}

export default function RelationshipsScreen({ conversations, onBack }: RelationshipsScreenProps) {
  const [selectedAI, setSelectedAI] = useState<string | null>(null);
  const [relationshipsData, setRelationshipsData] = useState(loadRelationships());
  
  // 获取所有AI角色
  const aiConversations = conversations.filter(c => c.type === 'private' && c.characterSettings);
  
  // 初始化新AI的关系
  useEffect(() => {
    const aiIds = aiConversations.map(c => c.id);
    aiIds.forEach(aiId => {
      const otherAIIds = aiIds.filter(id => id !== aiId);
      initializeAIRelationships(aiId, otherAIIds);
    });
    setRelationshipsData(loadRelationships());
  }, [conversations]);
  
  // 获取选中AI对其他AI的关系
  const getRelationshipsForAI = (aiId: string) => {
    return aiConversations
      .filter(c => c.id !== aiId)
      .map(targetAI => ({
        targetAI,
        relationship: getRelationship(aiId, targetAI.id)
      }));
  };
  
  // 更新关系
  const handleUpdateRelationship = (fromAI: string, toAI: string, level: RelationshipLevel) => {
    setRelationship(fromAI, toAI, level);
    setRelationshipsData(loadRelationships());
  };
  
  const selectedAIData = selectedAI ? aiConversations.find(c => c.id === selectedAI) : null;
  
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="px-4 pt-2 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors active:scale-95"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">关系管理</h1>
                <p className="text-xs text-gray-400">管理AI之间的关系网络</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-white">{aiConversations.length} 个AI</div>
            <div className="text-xs text-gray-400">{relationshipsData.relationships.length} 条关系</div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：AI列表 */}
        <div className="w-1/3 border-r border-white/10 overflow-y-auto">
          <div className="p-3">
            <div className="text-xs font-medium text-gray-400 mb-2">选择AI查看关系</div>
            {aiConversations.map(ai => (
              <button
                key={ai.id}
                onClick={() => setSelectedAI(ai.id)}
                className={`w-full p-3 rounded-xl mb-2 transition-all ${
                  selectedAI === ai.id
                    ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-400/50'
                    : 'bg-white/5 hover:bg-white/10 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  {ai.characterSettings?.avatar ? (
                    <img
                      src={ai.characterSettings.avatar}
                      alt={ai.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-white">
                      {ai.characterSettings?.nickname || ai.name}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {ai.characterSettings?.personality?.substring(0, 20) || '未设置性格'}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* 右侧：关系详情 */}
        <div className="flex-1 overflow-y-auto">
          {selectedAIData ? (
            <div className="p-4">
              <div className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  {selectedAIData.characterSettings?.avatar ? (
                    <img
                      src={selectedAIData.characterSettings.avatar}
                      alt={selectedAIData.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {selectedAIData.characterSettings?.nickname || selectedAIData.name}
                    </h2>
                    <p className="text-xs text-gray-400">
                      对其他AI的关系设置
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="text-sm font-medium text-gray-400 mb-3">
                关系列表 ({getRelationshipsForAI(selectedAI!).length})
              </div>
              
              {getRelationshipsForAI(selectedAI!).map(({ targetAI, relationship }) => (
                <div
                  key={targetAI.id}
                  className="bg-white/5 rounded-xl p-4 mb-3 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      {targetAI.characterSettings?.avatar ? (
                        <img
                          src={targetAI.characterSettings.avatar}
                          alt={targetAI.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">
                          {targetAI.characterSettings?.nickname || targetAI.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {targetAI.characterSettings?.personality?.substring(0, 30) || '未设置性格'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    {(['close', 'friendly', 'neutral', 'dislike', 'hostile'] as RelationshipLevel[]).map(level => {
                      const isSelected = relationship?.level === level;
                      return (
                        <button
                          key={level}
                          onClick={() => handleUpdateRelationship(selectedAI!, targetAI.id, level)}
                          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                              : 'bg-white/10 text-gray-300 hover:bg-white/20'
                          }`}
                        >
                          <span>{getRelationshipEmoji(level)}</span>
                          <span>{getRelationshipLabel(level)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-10 h-10 text-gray-500" />
                </div>
                <p className="text-gray-400 text-sm">
                  请从左侧选择一个AI<br/>查看和编辑其关系
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
