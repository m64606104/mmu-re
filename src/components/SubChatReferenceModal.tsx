import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Quote, Copy } from 'lucide-react';
import { SubChat } from '../types';
import { subChatMemoryManager, SubChatSummary } from '../utils/subChatMemoryManager';

interface SubChatReferenceModalProps {
  subChats: SubChat[];
  onClose: () => void;
  onReference: (referenceText: string) => void;
}

const SubChatReferenceModal: React.FC<SubChatReferenceModalProps> = ({
  subChats,
  onClose,
  onReference
}) => {
  const [summaries, setSummaries] = useState<SubChatSummary[]>([]);
  const [selectedSummary, setSelectedSummary] = useState<SubChatSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSummaries = async () => {
      setLoading(true);
      try {
        // 为所有子对话生成摘要
        await Promise.all(subChats.map(subChat => 
          subChatMemoryManager.generateSubChatSummary(subChat)
        ));
        
        // 获取所有摘要
        const allSummaries = subChatMemoryManager.getAllSummaries();
        const relevantSummaries = allSummaries.filter(summary => 
          subChats.some(sc => sc.id === summary.subChatId)
        );
        
        setSummaries(relevantSummaries);
      } catch (error) {
        console.error('加载子对话摘要失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSummaries();
  }, [subChats]);

  const handleReference = (summary: SubChatSummary) => {
    const referenceText = `[引用子对话"${summary.subChatName}"]
目的：${summary.purpose || '未指定'}
摘要：${summary.summary}
关键话题：${summary.keyTopics.join('、')}
${summary.importantDecisions.length > 0 ? `重要决定：${summary.importantDecisions.join('、')}` : ''}
消息数量：${summary.messageCount}条`;

    onReference(referenceText);
    onClose();
  };

  const copyToClipboard = (summary: SubChatSummary) => {
    const text = `子对话"${summary.subChatName}"摘要：${summary.summary}`;
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* 标题栏 */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Quote className="w-6 h-6" />
            <h2 className="text-xl font-semibold">引用子对话到主聊天</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              <span className="ml-3 text-gray-600">正在加载子对话摘要...</span>
            </div>
          ) : summaries.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>暂无子对话内容可引用</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm mb-4">
                选择要引用的子对话，其摘要将被添加到主聊天的上下文中，帮助AI理解相关内容。
              </p>
              
              {summaries.map((summary) => (
                <div 
                  key={summary.subChatId}
                  className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:bg-purple-50/30 transition-all cursor-pointer"
                  onClick={() => setSelectedSummary(summary)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-purple-500" />
                      <h3 className="font-semibold text-gray-900">{summary.subChatName}</h3>
                      <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
                        {summary.messageCount}条消息
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(summary);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        title="复制摘要"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                  
                  {summary.purpose && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">目的：</span>{summary.purpose}
                    </p>
                  )}
                  
                  <p className="text-sm text-gray-700 mb-3">{summary.summary}</p>
                  
                  {summary.keyTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {summary.keyTopics.map((topic, index) => (
                        <span 
                          key={index}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                      最后更新：{new Date(summary.lastUpdated).toLocaleString()}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReference(summary);
                      }}
                      className="px-3 py-1.5 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      引用到主聊天
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 选中详情 */}
        {selectedSummary && (
          <div className="border-t border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">预览引用内容</h4>
              <button
                onClick={() => setSelectedSummary(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm font-mono text-gray-700 whitespace-pre-wrap">
              {`[引用子对话"${selectedSummary.subChatName}"]
目的：${selectedSummary.purpose || '未指定'}
摘要：${selectedSummary.summary}
关键话题：${selectedSummary.keyTopics.join('、')}
${selectedSummary.importantDecisions.length > 0 ? `重要决定：${selectedSummary.importantDecisions.join('、')}` : ''}
消息数量：${selectedSummary.messageCount}条`}
            </div>
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => handleReference(selectedSummary)}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
              >
                确认引用
              </button>
              <button
                onClick={() => setSelectedSummary(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubChatReferenceModal;
