/**
 * 🎓 AI幼儿园主界面
 * MVP版本 - 核心教学功能
 */

import { useState, useEffect } from 'react';
import { ChevronLeft, Book, MessageCircle, TrendingUp, Award, MessageSquare, Settings } from 'lucide-react';
import { Conversation, ApiConfig } from '../types';
import ReadingScreen from './ReadingScreen';
import GrowthReportScreen from './GrowthReportScreen';
import TopicDiscussionScreen from './TopicDiscussionScreen';
import AIChildSettings from './AIChildSettings';
import WordTeachingChat, { TeachingDialogue } from './WordTeachingChat';
import { 
  createAIChild, 
  getAllAIChildren,
  teachWord,
  updateDailyInteraction 
} from '../utils/aiKindergartenManager';
import { WordCard } from '../utils/wordCardLibrary';
import { TopicCard, getRandomTopics, getRecommendedTopicDifficulty } from '../utils/topicCardLibrary';
import { generateDailyCards, getNextRound, markWordSelected, DailyCardPool } from '../utils/smartCardGenerator';
import { getMaxChildren, canCreateNewChild, shouldShowSwitchButton, UpgradeMessages } from '../config/kindergartenConfig';

interface AIKindergartenScreenProps {
  onBack: () => void;
  onOpenChat?: (childId: string) => void; // 打开与AI儿童的聊天
  apiConfig: ApiConfig;
}

export default function AIKindergartenScreen({ onBack, onOpenChat, apiConfig }: AIKindergartenScreenProps) {
  const [children, setChildren] = useState<Conversation[]>([]);
  const [selectedChild, setSelectedChild] = useState<Conversation | null>(null);
  const [showCreateChild, setShowCreateChild] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [teachingMode, setTeachingMode] = useState(false);
  const [readingMode, setReadingMode] = useState(false);
  const [reportMode, setReportMode] = useState(false);
  const [topicMode, setTopicMode] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<TopicCard | null>(null);
  const [showTopicSelection, setShowTopicSelection] = useState(false);
  const [settingsMode, setSettingsMode] = useState(false);
  
  // 词卡系统
  const [currentCards, setCurrentCards] = useState<WordCard[]>([]);
  const [dailyRounds, setDailyRounds] = useState(0);
  const [teachResult, setTeachResult] = useState('');
  const [selectedCard, setSelectedCard] = useState<WordCard | null>(null);
  const [userDefinition, setUserDefinition] = useState('');
  const [showCustomCard, setShowCustomCard] = useState(false);
  const [customWord, setCustomWord] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [cardPool, setCardPool] = useState<DailyCardPool | null>(null);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [showChildrenList, setShowChildrenList] = useState(false);
  const [showChatTeaching, setShowChatTeaching] = useState(false); // 聊天式教学模式

  useEffect(() => {
    loadChildren();
  }, []);

  // 加载今日学习轮数
  useEffect(() => {
    const today = new Date().toDateString();
    const savedData = localStorage.getItem('dailyTeachingData');
    if (savedData) {
      const data = JSON.parse(savedData);
      if (data.date === today) {
        setDailyRounds(data.rounds);
      } else {
        // 新的一天，重置
        localStorage.setItem('dailyTeachingData', JSON.stringify({ date: today, rounds: 0 }));
        setDailyRounds(0);
      }
    } else {
      localStorage.setItem('dailyTeachingData', JSON.stringify({ date: today, rounds: 0 }));
    }
  }, []);

  // 初始化每日词卡池
  const initDailyCardPool = async () => {
    if (!selectedChild || !selectedChild.aiChildData) return;
    
    setIsLoadingCards(true);
    try {
      const learnedWords = selectedChild.aiChildData.vocabulary.map(w => w.word);
      const pool = await generateDailyCards(
        selectedChild.aiChildData.vocabulary.length,
        learnedWords,
        selectedChild.aiChildData.stage,
        apiConfig
      );
      setCardPool(pool);
      
      // 加载当前轮次的词卡
      const nextCards = getNextRound(pool, dailyRounds);
      if (nextCards.length > 0) {
        setCurrentCards(nextCards);
      }
    } catch (error) {
      console.error('生成词卡失败:', error);
    } finally {
      setIsLoadingCards(false);
    }
  };

  // 刷新词卡（切换到下一轮）
  const refreshCards = () => {
    if (!cardPool) return;
    
    const nextCards = getNextRound(cardPool, dailyRounds);
    if (nextCards.length > 0) {
      setCurrentCards(nextCards);
    } else {
      // 如果当前轮次没有可用的词，尝试下一轮
      const nextRoundCards = getNextRound(cardPool, dailyRounds + 1);
      if (nextRoundCards.length > 0) {
        setCurrentCards(nextRoundCards);
      }
    }
    setSelectedCard(null);
    setTeachResult('');
  };

  // 打开教学模式时初始化词卡池
  useEffect(() => {
    if (teachingMode && selectedChild && !cardPool) {
      initDailyCardPool();
    }
  }, [teachingMode, selectedChild]);

  const loadChildren = async () => {
    const allChildren = await getAllAIChildren();
    setChildren(allChildren);
    
    // 如果有选中的child，更新其最新数据
    if (selectedChild && allChildren.length > 0) {
      const updatedChild = allChildren.find(c => c.id === selectedChild.id);
      if (updatedChild) {
        setSelectedChild(updatedChild);
      }
    } else if (allChildren.length > 0 && !selectedChild) {
      // 如果没有选中的child，选中第一个
      setSelectedChild(allChildren[0]);
      await updateDailyInteraction(allChildren[0].id);
    }
  };

  const handleCreateChild = () => {
    if (!newChildName.trim()) {
      alert('请输入宝宝的名字');
      return;
    }

    // 检查数量限制
    if (!canCreateNewChild(children.length)) {
      alert(UpgradeMessages.reachedLimit(getMaxChildren()));
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

  // 选择词卡 → 打开聊天式教学
  const handleSelectCard = (card: WordCard) => {
    if (dailyRounds >= 20) {
      setTeachResult('🌙 今天已经学了20个词啦，明天再来吧～');
      return;
    }
    
    setSelectedCard(card);
    setShowChatTeaching(true); // 打开聊天式教学
    setUserDefinition(''); // 清空之前的输入
    setTeachResult('');
  };

  // 聊天式教学完成
  const handleChatTeachingComplete = async (definition: string, dialogue: TeachingDialogue[]) => {
    if (!selectedChild || !selectedChild.aiChildData || !selectedCard) return;

    try {
      // 保存词汇学习记录
      await teachWord(
        selectedChild.id,
        selectedCard.word,
        definition,
        [] // 例句暂时为空，可以从对话中提取
      );

      // 标记词卡已选
      markWordSelected(selectedCard.word);

      // 更新学习次数
      const today = new Date().toDateString();
      const newRounds = dailyRounds + 1;
      setDailyRounds(newRounds);
      localStorage.setItem('dailyTeachingData', JSON.stringify({ date: today, rounds: newRounds }));

      // 更新每日互动
      await updateDailyInteraction(selectedChild.id);

      // 重新加载children以获取最新数据
      const updatedChildren = await getAllAIChildren();
      setChildren(updatedChildren);
      const updatedChild = updatedChildren.find(c => c.id === selectedChild.id);
      if (updatedChild) {
        setSelectedChild(updatedChild);
      }

      // 显示成功消息
      setTeachResult(`✨ 太棒了！${selectedChild.name}通过${dialogue.length}轮对话学会了"${selectedCard.word}"！`);

      // 关闭聊天式教学，清除选中
      setShowChatTeaching(false);
      setSelectedCard(null);

      // 3秒后清除结果
      setTimeout(() => {
        setTeachResult('');
      }, 3000);

      // 如果当前轮次的词卡都学完了，加载下一轮
      const remainingCards = currentCards.filter(c => c.id !== selectedCard.id);
      if (remainingCards.length === 0 && cardPool) {
        const nextCards = getNextRound(cardPool, newRounds);
        if (nextCards.length > 0) {
          setCurrentCards(nextCards);
        } else {
          setCurrentCards([]);
        }
      } else {
        setCurrentCards(remainingCards);
      }
    } catch (error) {
      console.error('教学记录保存失败:', error);
      setTeachResult('❌ 保存失败，请重试');
    }
  };

  // 确认教学
  const handleConfirmTeach = async () => {
    if (!selectedChild || !selectedChild.aiChildData || !selectedCard) return;
    
    if (!userDefinition.trim()) {
      setTeachResult('⚠️ 请输入你对这个词的理解');
      return;
    }

    // 教学这个词（使用用户的理解）
    const result = await teachWord(
      selectedChild.id,
      selectedCard.word,
      userDefinition.trim(),
      selectedCard.examples
    );

    if (result) {
      setTeachResult(`✨ 成功学会了"${selectedCard.word}"！获得了10点经验值`);
      
      // 标记词已被选择
      markWordSelected(selectedCard.word);
      
      // 更新每日轮数
      const newRounds = dailyRounds + 1;
      setDailyRounds(newRounds);
      const today = new Date().toDateString();
      localStorage.setItem('dailyTeachingData', JSON.stringify({ date: today, rounds: newRounds }));
      
      // 刷新数据和卡片
      setTimeout(() => {
        loadChildren();
        refreshCards();
        setSelectedCard(null);
        setUserDefinition('');
      }, 1500);
    } else {
      setTeachResult('❌ 教学失败，请重试');
    }
  };

  // 生成自定义词卡的定义
  const handleGenerateDefinition = async () => {
    if (!customWord.trim()) {
      alert('请输入要教的词语');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: apiConfig.modelName,
          messages: [
            {
              role: 'system',
              content: '你是一个儿童教育专家。请为词语生成简单易懂的定义和例句，适合教给AI儿童。'
            },
            {
              role: 'user',
              content: `请为"${customWord.trim()}"这个词生成：
1. 简单的定义（10-20字）
2. 2个简单的例句（每句10-15字）

格式：
定义：xxx
例句1：xxx
例句2：xxx`
            }
          ],
          temperature: 0.7,
          max_tokens: 200
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API响应错误:', response.status, errorText);
        throw new Error(`API调用失败 (${response.status})`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('API返回非JSON:', text.substring(0, 200));
        throw new Error('API返回了HTML页面而不是JSON，请检查API配置');
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      // 解析AI返回的内容
      const definitionMatch = content.match(/定义[：:](.*?)(?=例句|$)/s);
      const example1Match = content.match(/例句1[：:](.*?)(?=例句2|$)/s);
      const example2Match = content.match(/例句2[：:](.*?)$/s);

      const definition = definitionMatch?.[1]?.trim() || content;
      const examples = [
        example1Match?.[1]?.trim() || '',
        example2Match?.[1]?.trim() || ''
      ].filter(e => e);

      // 创建自定义词卡
      const customCard: WordCard = {
        id: `custom_${Date.now()}`,
        word: customWord.trim(),
        emoji: '✨',
        definition: definition,
        examples: examples,
        difficulty: 2,
        category: 'custom'
      };

      setSelectedCard(customCard);
      setUserDefinition(definition);
      setShowCustomCard(false);
      setCustomWord('');

    } catch (error) {
      console.error('生成定义失败:', error);
      alert('生成失败，请检查API配置或手动输入定义');
    } finally {
      setIsGenerating(false);
    }
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

  // 如果在阅读模式，显示阅读组件
  if (readingMode && selectedChild) {
    return (
      <ReadingScreen
        child={selectedChild}
        onBack={() => {
          setReadingMode(false);
          loadChildren(); // 刷新数据
        }}
        onUpdateChild={loadChildren}
        apiConfig={apiConfig}
      />
    );
  }

  // 如果在报告模式，显示成长报告
  if (reportMode && selectedChild) {
    return (
      <GrowthReportScreen
        child={selectedChild}
        onBack={() => {
          setReportMode(false);
          loadChildren(); // 刷新数据
        }}
      />
    );
  }

  // 如果在话题讨论模式，显示话题讨论
  if (topicMode && selectedChild && selectedTopic) {
    return (
      <TopicDiscussionScreen
        child={selectedChild}
        topic={selectedTopic}
        onBack={() => {
          setTopicMode(false);
          setSelectedTopic(null);
          loadChildren(); // 刷新数据
        }}
        onUpdateChild={loadChildren}
        apiConfig={apiConfig}
      />
    );
  }

  // 如果在设置模式，显示设置界面
  if (settingsMode && selectedChild) {
    return (
      <AIChildSettings
        child={selectedChild}
        onBack={() => {
          setSettingsMode(false);
          loadChildren(); // 刷新数据
        }}
        onUpdate={loadChildren}
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
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">🎓 AI幼儿园</h1>
          {children.length > 0 && (
            <span className="text-xs text-gray-500">
              ({children.length}/{getMaxChildren()})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {shouldShowSwitchButton(children.length) && (
            <button
              onClick={() => setShowChildrenList(true)}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              title="切换AI"
            >
              切换
            </button>
          )}
          {canCreateNewChild(children.length) && (
            <button
              onClick={() => setShowCreateChild(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-sm font-medium"
            >
              + 新建
            </button>
          )}
        </div>
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
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-800">{selectedChild.name}</h2>
                    <button
                      onClick={() => setSettingsMode(true)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="个性化设置"
                    >
                      <Settings className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
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
                onClick={() => {
                  const vocabularyCount = selectedChild.aiChildData?.vocabulary.length || 0;
                  if (vocabularyCount < 50) {
                    alert(`${selectedChild.name}的词汇量还不够哦！\n\n目前认识：${vocabularyCount}个词\n需要至少：50个词\n\n继续教${selectedChild.name}认字吧～`);
                    return;
                  }
                  setShowTopicSelection(true);
                }}
                disabled={!selectedChild.aiChildData || selectedChild.aiChildData.vocabulary.length < 50}
                className="bg-white p-4 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative"
              >
                <MessageSquare className="w-6 h-6 mx-auto mb-2" />
                话题讨论
                {selectedChild.aiChildData && selectedChild.aiChildData.vocabulary.length < 50 && (
                  <div className="absolute top-1 right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded">
                    🔒 {selectedChild.aiChildData.vocabulary.length}/50
                  </div>
                )}
              </button>

              <button
                onClick={() => {
                  if (onOpenChat && selectedChild) {
                    onOpenChat(selectedChild.id);
                  }
                }}
                className="bg-white p-4 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all"
              >
                <MessageCircle className="w-6 h-6 mx-auto mb-2" />
                自由聊天
              </button>

              <button
                onClick={() => setReadingMode(true)}
                className="bg-white p-4 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all"
              >
                <Book className="w-6 h-6 mx-auto mb-2" />
                阅读故事
              </button>

              <button
                onClick={() => setReportMode(true)}
                className="bg-white p-4 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all col-span-2"
              >
                <TrendingUp className="w-6 h-6 mx-auto mb-2" />
                成长报告
              </button>
            </div>

            {/* Teaching Panel - 词卡四宫格 */}
            {teachingMode && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-500" />
                    选一张词卡教{selectedChild.name}
                  </h3>
                  <div className="text-sm text-gray-600">
                    今日 {dailyRounds}/20
                  </div>
                </div>

                {/* 加载状态 */}
                {isLoadingCards ? (
                  <div className="py-12 text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">🎯 AI正在生成今日词卡...</p>
                    <p className="text-xs text-gray-500 mt-2">基于{selectedChild.name}的识字量和理解力</p>
                  </div>
                ) : !selectedCard && currentCards.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {currentCards.map((card) => (
                        <button
                          key={card.id}
                          onClick={() => handleSelectCard(card)}
                          className="relative p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-md active:scale-95 transition-all"
                        >
                          {/* 表情符号 */}
                          <div className="text-4xl mb-2 text-center">{card.emoji}</div>
                          
                          {/* 词语 */}
                          <div className="text-center font-semibold text-gray-800 mb-1">
                            {card.word}
                          </div>
                          
                          {/* 难度标签 */}
                          <div className="flex justify-center">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              card.difficulty === 1 ? 'bg-green-100 text-green-600' :
                              card.difficulty === 2 ? 'bg-blue-100 text-blue-600' :
                              'bg-purple-100 text-purple-600'
                            }`}>
                              Lv.{card.difficulty}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                    
                    {/* 操作按钮 */}
                    <div className="flex gap-2">
                      <button
                        onClick={refreshCards}
                        disabled={dailyRounds >= 20}
                        className="flex-1 py-2 text-sm text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        🔄 换一批词卡
                      </button>
                      <button
                        onClick={() => setShowCustomCard(true)}
                        disabled={dailyRounds >= 20}
                        className="flex-1 py-2 text-sm text-purple-600 hover:text-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        ✨ 自定义词卡
                      </button>
                    </div>
                  </>
                ) : selectedCard ? (
                  /* 编辑区域 */
                  <div className="space-y-4">
                    {/* 选中的卡片展示 */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-3xl">{selectedCard.emoji}</div>
                        <div>
                          <div className="font-semibold text-gray-800">{selectedCard.word}</div>
                          <div className="text-xs text-gray-500">Level {selectedCard.difficulty}</div>
                        </div>
                      </div>
                      
                      {/* 简短示例参考 */}
                      <div className="bg-white/50 rounded-lg p-3 border border-blue-100">
                        <div className="text-xs text-blue-600 font-medium mb-1">💡 参考示例（可以自己修改）</div>
                        <div className="text-sm text-gray-700">{selectedCard.definition}</div>
                      </div>
                    </div>

                    {/* 用户输入区 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ✏️ 你想怎么教{selectedChild.name}这个词？
                      </label>
                      <textarea
                        value={userDefinition}
                        onChange={(e) => setUserDefinition(e.target.value)}
                        placeholder="可以参考上面的示例，也可以用你自己的话来解释..."
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        💬 用你自己的话解释，{selectedChild.name}会更容易理解哦
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedCard(null);
                          setUserDefinition('');
                          setTeachResult('');
                        }}
                        className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleConfirmTeach}
                        disabled={!userDefinition.trim()}
                        className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        确定教学
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🎉</div>
                    <p className="text-sm">太棒了！所有词卡都学完啦</p>
                  </div>
                )}

                {/* 教学结果 */}
                {teachResult && (
                  <div className={`mt-3 p-3 rounded-xl text-sm text-center ${
                    teachResult.includes('成功') 
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-orange-50 border border-orange-200 text-orange-700'
                  }`}>
                    {teachResult}
                  </div>
                )}

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

      {/* Topic Selection Modal */}
      {showTopicSelection && selectedChild && selectedChild.aiChildData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-2">选择一个话题</h2>
            <p className="text-sm text-gray-500 mb-4">通过对话的方式教{selectedChild.name}理解</p>
            
            {/* Topic Cards Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {getRandomTopics(6, getRecommendedTopicDifficulty(selectedChild.aiChildData.vocabulary.length)).map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => {
                    setSelectedTopic(topic);
                    setTopicMode(true);
                    setShowTopicSelection(false);
                  }}
                  className="p-4 rounded-xl border-2 border-gray-200 hover:border-purple-300 hover:shadow-md active:scale-95 transition-all text-left"
                >
                  <div className="text-4xl mb-2 text-center">{topic.emoji}</div>
                  <div className="text-center font-semibold text-gray-800 mb-1">{topic.topic}</div>
                  <div className="text-xs text-gray-500 text-center line-clamp-2">{topic.description}</div>
                  <div className="flex justify-center mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      topic.difficulty === 1 ? 'bg-green-100 text-green-600' :
                      topic.difficulty === 2 ? 'bg-blue-100 text-blue-600' :
                      'bg-purple-100 text-purple-600'
                    }`}>
                      Lv.{topic.difficulty}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowTopicSelection(false)}
              className="w-full py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Custom Word Card Modal */}
      {showCustomCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-2">✨ 自定义词卡</h2>
            <p className="text-sm text-gray-500 mb-4">输入你想教的词语，AI会帮你生成定义</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  要教的词语
                </label>
                <input
                  type="text"
                  value={customWord}
                  onChange={(e) => setCustomWord(e.target.value)}
                  placeholder="例如：梦想、勇敢、坚持..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customWord.trim()) {
                      handleGenerateDefinition();
                    }
                  }}
                />
              </div>

              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="text-xs text-blue-600 font-medium mb-1">💡 提示</div>
                <div className="text-xs text-gray-600">
                  点击"生成定义"后，AI会自动为这个词生成简单的解释和例句，你可以修改后再教给{selectedChild?.name}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCustomCard(false);
                    setCustomWord('');
                  }}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleGenerateDefinition}
                  disabled={!customWord.trim() || isGenerating}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      ✨ 生成定义
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Children List Modal - 切换AI列表 */}
      {showChildrenList && children.length > 1 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[70vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-2">选择AI宝宝</h2>
            <p className="text-sm text-gray-500 mb-4">
              当前版本：最多{getMaxChildren()}个AI（未来可扩展）
            </p>
            
            <div className="space-y-3 mb-4">
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => {
                    setSelectedChild(child);
                    setShowChildrenList(false);
                  }}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    selectedChild?.id === child.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">
                      {child.aiChildData ? getStageEmoji(child.aiChildData.stage) : '👶'}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">{child.name}</div>
                      {child.aiChildData && (
                        <div className="text-xs text-gray-500 mt-1">
                          <span>{getStageName(child.aiChildData.stage)}</span>
                          <span className="mx-2">•</span>
                          <span>识字{child.aiChildData.vocabulary.length}个</span>
                          <span className="mx-2">•</span>
                          <span>Lv.{child.aiChildData.level}</span>
                        </div>
                      )}
                    </div>
                    {selectedChild?.id === child.id && (
                      <div className="text-blue-500">✓</div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowChildrenList(false)}
              className="w-full py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 聊天式教学 */}
      {showChatTeaching && selectedCard && selectedChild && (
        <WordTeachingChat
          word={selectedCard}
          aiChild={selectedChild}
          apiConfig={apiConfig}
          onComplete={handleChatTeachingComplete}
          onCancel={() => {
            setShowChatTeaching(false);
            setSelectedCard(null);
          }}
        />
      )}
    </div>
  );
}
