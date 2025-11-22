/**
 * 🎓 AI幼儿园主界面
 * MVP版本 - 核心教学功能
 */

import { useState, useEffect } from 'react';
import { ChevronLeft, Book, MessageCircle, TrendingUp, Award } from 'lucide-react';
import { Conversation, ApiConfig } from '../types';
import AIChildChat from './AIChildChat';
import { 
  createAIChild, 
  getAIChild, 
  getAllAIChildren,
  teachWord,
  updateDailyInteraction 
} from '../utils/aiKindergartenManager';

interface AIKindergartenScreenProps {
  onBack: () => void;
  apiConfig: ApiConfig;
}

export default function AIKindergartenScreen({ onBack, apiConfig }: AIKindergartenScreenProps) {
  const [children, setChildren] = useState<Conversation[]>([]);
  const [selectedChild, setSelectedChild] = useState<Conversation | null>(null);
  const [showCreateChild, setShowCreateChild] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [teachingMode, setTeachingMode] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [currentDefinition, setCurrentDefinition] = useState('');
  const [teachResult, setTeachResult] = useState('');

  useEffect(() => {
    loadChildren();
  }, []);

  const loadChildren = async () => {
    const allChildren = await getAllAIChildren();
    setChildren(allChildren);
    if (allChildren.length > 0 && !selectedChild) {
      setSelectedChild(allChildren[0]);
      await updateDailyInteraction(allChildren[0].id);
    }
  };

  const handleCreateChild = () => {
    if (!newChildName.trim()) {
      alert('请输入宝宝的名字');
      return;
    }

    const newChild = createAIChild(newChildName.trim());
    setChildren([...children, newChild]);
    setSelectedChild(newChild);
    setShowCreateChild(false);
    setNewChildName('');
    
    // 保存到conversations
    const saveChild = async () => {
      const { smartLoad, smartSave } = await import('../utils/storage');
      const conversations = await smartLoad('conversations') as Conversation[] || [];
      conversations.push(newChild);
      await smartSave('conversations', conversations);
    };
    saveChild();
  };

  const handleTeachWord = async () => {
    if (!selectedChild || !currentWord.trim() || !currentDefinition.trim()) {
      alert('请输入词语和解释');
      return;
    }

    const result = await teachWord(
      selectedChild.id,
      currentWord.trim(),
      currentDefinition.trim()
    );

    setTeachResult(result.message);
    setCurrentWord('');
    setCurrentDefinition('');

    // 刷新儿童数据
    const updatedChild = await getAIChild(selectedChild.id);
    if (updatedChild) {
      setSelectedChild(updatedChild);
      loadChildren();
    }

    // 3秒后清除结果
    setTimeout(() => setTeachResult(''), 3000);
  };

  const getStageEmoji = (stage: string) => {
    const emojis: Record<string, string> = {
      baby: '👶',
      toddler: '🧒',
      child: '👦',
      teen: '👨'
    };
    return emojis[stage] || '👶';
  };

  const getStageName = (stage: string) => {
    const names: Record<string, string> = {
      baby: '婴儿期',
      toddler: '幼儿期',
      child: '儿童期',
      teen: '少年期'
    };
    return names[stage] || '婴儿期';
  };

  // 如果在聊天模式，显示聊天组件
  if (chatMode && selectedChild) {
    return (
      <AIChildChat
        childId={selectedChild.id}
        onBack={() => {
          setChatMode(false);
          loadChildren(); // 刷新数据
        }}
        apiConfig={apiConfig}
      />
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold">🎓 AI幼儿园</h1>
        <button
          onClick={() => setShowCreateChild(true)}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-sm font-medium"
        >
          + 新建
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {children.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-6xl mb-4">🎓</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">欢迎来到AI幼儿园</h2>
            <p className="text-gray-500 text-sm mb-6 text-center">
              创建你的第一个AI宝宝<br/>
              从零开始培养它成长
            </p>
            <button
              onClick={() => setShowCreateChild(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium"
            >
              开始培养
            </button>
          </div>
        ) : selectedChild && selectedChild.aiChildData ? (
          /* Child Detail */
          <div className="space-y-4">
            {/* Child Info Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-4xl">
                  {getStageEmoji(selectedChild.aiChildData.stage)}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800">{selectedChild.name}</h2>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded">
                      {getStageName(selectedChild.aiChildData.stage)}
                    </span>
                    <span>成长{selectedChild.aiChildData.age}天</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3">
                  <div className="text-2xl font-bold text-blue-600">
                    Level {selectedChild.aiChildData.level}
                  </div>
                  <div className="text-xs text-blue-600/70 mt-1">等级</div>
                  <div className="mt-2 bg-white/50 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${(selectedChild.aiChildData.exp / selectedChild.aiChildData.expToNextLevel) * 100}%` 
                      }}
                    />
                  </div>
                  <div className="text-xs text-blue-600/70 mt-1">
                    {selectedChild.aiChildData.exp}/{selectedChild.aiChildData.expToNextLevel} EXP
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3">
                  <div className="text-2xl font-bold text-purple-600">
                    {selectedChild.aiChildData.vocabulary.length}
                  </div>
                  <div className="text-xs text-purple-600/70 mt-1">识字量</div>
                  <div className="mt-2">
                    <div className="text-sm font-medium text-purple-600">
                      理解力 {selectedChild.aiChildData.comprehension.level}/10
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTeachingMode(!teachingMode)}
                className={`p-4 rounded-xl font-medium transition-all ${
                  teachingMode 
                    ? 'bg-blue-500 text-white shadow-lg' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Book className="w-6 h-6 mx-auto mb-2" />
                教学识字
              </button>

              <button
                onClick={() => setChatMode(true)}
                className="bg-white p-4 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all"
              >
                <MessageCircle className="w-6 h-6 mx-auto mb-2" />
                聊天互动
              </button>

              <button
                className="bg-white p-4 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all"
              >
                <Book className="w-6 h-6 mx-auto mb-2" />
                阅读故事
              </button>

              <button
                className="bg-white p-4 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all"
              >
                <TrendingUp className="w-6 h-6 mx-auto mb-2" />
                成长报告
              </button>
            </div>

            {/* Teaching Panel */}
            {teachingMode && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-500" />
                  教{selectedChild.name}认字
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      教什么词？
                    </label>
                    <input
                      type="text"
                      value={currentWord}
                      onChange={(e) => setCurrentWord(e.target.value)}
                      placeholder="例如：苹果"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      怎么解释？
                    </label>
                    <textarea
                      value={currentDefinition}
                      onChange={(e) => setCurrentDefinition(e.target.value)}
                      placeholder="例如：苹果是一种水果，红色的，圆圆的，很好吃"
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleTeachWord}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                  >
                    开始教学
                  </button>

                  {teachResult && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm text-center">
                      {teachResult}
                    </div>
                  )}
                </div>

                {/* Recent Words */}
                {selectedChild.aiChildData.vocabulary.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">最近学的词</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedChild.aiChildData.vocabulary.slice(-10).reverse().map((word, index) => (
                        <div key={index} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm">
                          {word.word}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Create Child Modal */}
      {showCreateChild && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">创建AI宝宝</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                给宝宝起个名字
              </label>
              <input
                type="text"
                value={newChildName}
                onChange={(e) => setNewChildName(e.target.value)}
                placeholder="例如：小明"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateChild(false);
                  setNewChildName('');
                }}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleCreateChild}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
