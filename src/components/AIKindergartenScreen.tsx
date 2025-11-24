/**
 * 🎓 AI幼儿园主界面
 * MVP版本 - 核心教学功能
 */

import { useState, useEffect } from 'react';
import { ChevronLeft, Book, MessageCircle, TrendingUp, Award, MessageSquare, Settings, Users } from 'lucide-react';
import { Conversation, ApiConfig } from '../types';
import EnhancedReadingScreen from './EnhancedReadingScreen';
import GrowthReportScreen from './GrowthReportScreen';
import TopicDiscussionScreen from './TopicDiscussionScreen';
import AIChildSettings from './AIChildSettings';
import AIInteractionModal from './AIInteractionModal';
// import WordTeachingChat, { TeachingDialogue } from './WordTeachingChat'; // 已改为简单输入式教学
import { 
  createAIChild, 
  getAllAIChildren,
  teachWord,
  updateDailyInteraction 
} from '../utils/aiKindergartenManager';
import { WordCard } from '../utils/wordCardLibrary';
import { TopicCard, getRandomTopics, getRecommendedTopicDifficulty } from '../utils/topicCardLibrary';
import { generateDailyCards, getNextRound, markWordSelected, updateLastRound, DailyCardPool } from '../utils/smartCardGenerator';
import { getMaxChildren, canCreateNewChild, shouldShowSwitchButton, UpgradeMessages } from '../config/kindergartenConfig';

interface AIKindergartenScreenProps {
  onBack: () => void;
  onOpenChat?: (childId: string, returnToKindergarten?: boolean) => void; // 打开与AI儿童的聊天，可指定返回路径
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
  const [dailyRounds, setDailyRounds] = useState(0); // 当天已学单词数
  const [currentRoundNumber, setCurrentRoundNumber] = useState(1); // 当前是第几轮（1-3）
  const [teachResult, setTeachResult] = useState('');
  const [selectedCard, setSelectedCard] = useState<WordCard | null>(null);
  const [userDefinition, setUserDefinition] = useState('');
  const [showCustomCard, setShowCustomCard] = useState(false);
  const [customWord, setCustomWord] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [cardPool, setCardPool] = useState<DailyCardPool | null>(null);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [showChildrenList, setShowChildrenList] = useState(false);
  const [showRoundComplete, setShowRoundComplete] = useState(false); // 显示轮次完成提示
  const [showInteraction, setShowInteraction] = useState(false); // 显示AI互动界面

  useEffect(() => {
    loadChildren();
  }, []);
  
  // 保存当前选择的AI
  useEffect(() => {
    if (selectedChild) {
      const saveSelection = async () => {
        const { smartSave } = await import('../utils/storage');
        await smartSave('last_selected_child_id', selectedChild.id);
      };
      saveSelection();
    }
  }, [selectedChild]);

  // 加载今日学习轮数（按AI分开存储）
  useEffect(() => {
    if (!selectedChild) return;
    
    const loadDailyData = async () => {
      const { smartLoad } = await import('../utils/storage');
      const today = new Date().toDateString();
      const allData = await smartLoad('daily_teaching_data') as Record<string, any> || {};
      const savedData = allData[selectedChild.id];
      
      if (savedData && savedData.date === today) {
        setDailyRounds(savedData.rounds || 0);
        setCurrentRoundNumber(savedData.currentRound || 1);
      } else {
        // 新的一天，重置
        setDailyRounds(0);
        setCurrentRoundNumber(1);
      }
    };
    
    loadDailyData();
  }, [selectedChild]);

  // 初始化每日词卡池
  const initDailyCardPool = async () => {
    if (!selectedChild || !selectedChild.aiChildData) return;
    
    setIsLoadingCards(true);
    try {
      const learnedWords = selectedChild.aiChildData.vocabulary.map(w => w.word);
      const pool = await generateDailyCards(
        selectedChild.id, // childId
        selectedChild.aiChildData.vocabulary.length,
        learnedWords,
        selectedChild.aiChildData.stage,
        apiConfig
      );
      setCardPool(pool);
      
      // 加载当前轮次的词卡
      const nextCards = getNextRound(pool);
      if (nextCards.length > 0) {
        setCurrentCards(nextCards);
        // 更新上一轮的词
        await updateLastRound(selectedChild.id, nextCards.map(c => c.word));
      }
    } catch (error) {
      console.error('生成词卡失败:', error);
    } finally {
      setIsLoadingCards(false);
    }
  };

  // 开始新一轮
  const startNewRound = () => {
    if (currentRoundNumber >= 3) {
      alert('已经完成今日所有轮次！');
      return;
    }
    
    const newRoundNumber = currentRoundNumber + 1;
    setCurrentRoundNumber(newRoundNumber);
    setShowRoundComplete(false);
    
    // 更新IndexedDB存储
    const saveDailyData = async () => {
      const { smartLoad, smartSave } = await import('../utils/storage');
      const today = new Date().toDateString();
      const allData = await smartLoad('daily_teaching_data') as Record<string, any> || {};
      allData[selectedChild!.id] = {
        date: today,
        rounds: dailyRounds,
        currentRound: newRoundNumber
      };
      await smartSave('daily_teaching_data', allData);
    };
    saveDailyData();
    
    // 刷新词卡
    refreshCards();
  };

  // 刷新词卡（百词斩模式：刷新整轮4张卡）
  const refreshCards = async () => {
    if (!cardPool || !selectedChild) return;
    
    // 重新加载词卡池（确保获取最新的selectedWords）
    const { smartLoad } = await import('../utils/storage');
    const allPools = await smartLoad('daily_card_pools') as Record<string, DailyCardPool> || {};
    const freshPool = allPools[selectedChild.id];
    
    if (!freshPool) return;
    
    const nextCards = getNextRound(freshPool);
    if (nextCards.length > 0) {
      setCurrentCards(nextCards);
      // 更新上一轮的词
      await updateLastRound(selectedChild.id, nextCards.map(c => c.word));
      setCardPool(freshPool); // 更新本地pool
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
    
    if (allChildren.length === 0) return;
    
    // 尝试加载上次选择的AI
    const { smartLoad } = await import('../utils/storage');
    const lastSelectedId = await smartLoad('last_selected_child_id') as string;
    
    let childToSelect: typeof allChildren[0] | null = null;
    
    if (lastSelectedId) {
      // 找到上次选择的AI
      childToSelect = allChildren.find(c => c.id === lastSelectedId) || null;
    }
    
    // 如果没找到或者没有上次选择，选择第一个
    if (!childToSelect) {
      childToSelect = allChildren[0];
    }
    
    setSelectedChild(childToSelect);
    await updateDailyInteraction(childToSelect.id);
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

  // 选择词卡（不立即教学）
  const handleSelectCard = (card: WordCard) => {
    if (dailyRounds >= 60) {
      setTeachResult('🌙 今天已经学了60个词啦，已达上限！');
      return;
    }
    
    setSelectedCard(card);
    setUserDefinition(''); // 清空之前的输入
    setTeachResult('');
  };

  // 确认教学
  const handleConfirmTeach = async () => {
    if (!selectedChild || !selectedChild.aiChildData || !selectedCard) return;
    
    if (!userDefinition.trim()) {
      setTeachResult('⚠️ 请输入你对这个词的理解');
      return;
    }

    try {
      const isFirstRound = currentRoundNumber === 1;
      // 教学这个词（使用用户的理解）
      const result = await teachWord(
        selectedChild.id,
        selectedCard.word,
        userDefinition.trim(),
        selectedCard.examples,
        isFirstRound // 只有首轮增加经验值
      );

      if (result.success) {
        const expMessage = isFirstRound ? '获得了10点经验值' : '不增加经验值（额外学习）';
        setTeachResult(`✨ 成功学会了"${selectedCard.word}"！${expMessage}`);
        
        // 标记词已被选择
        await markWordSelected(selectedChild.id, selectedCard.word);
        
        // 更新每日轮数
        const today = new Date().toDateString();
        const newRounds = dailyRounds + 1;
        const wordsInCurrentRound = (newRounds - 1) % 20 + 1;
        setDailyRounds(newRounds);
        
        // 检查是否完成一轮
        const roundCompleted = wordsInCurrentRound === 20;
        
        // 保存到IndexedDB
        const saveDailyData = async () => {
          const { smartLoad, smartSave } = await import('../utils/storage');
          const allData = await smartLoad('daily_teaching_data') as Record<string, any> || {};
          allData[selectedChild.id] = {
            date: today,
            rounds: newRounds,
            currentRound: currentRoundNumber
          };
          await smartSave('daily_teaching_data', allData);
        };
        saveDailyData();
        
        // 如果完成一轮，显示提示
        if (roundCompleted && newRounds < 60) {
          setShowRoundComplete(true);
        }
        
        // 刷新数据和卡片（百词斩模式）
        setTimeout(async () => {
          // 重新加载children以获取最新数据
          const updatedChildren = await getAllAIChildren();
          setChildren(updatedChildren);
          const updatedChild = updatedChildren.find(c => c.id === selectedChild.id);
          if (updatedChild) {
            setSelectedChild(updatedChild);
          }
          
          // 百词斩模式：教学后刷新整轮4张卡
          const { smartLoad } = await import('../utils/storage');
          const allPools = await smartLoad('daily_card_pools') as Record<string, DailyCardPool> || {};
          const freshPool = allPools[selectedChild.id];
          
          if (freshPool) {
            const nextCards = getNextRound(freshPool);
            if (nextCards.length > 0) {
              setCurrentCards(nextCards);
              // 更新上一轮的词
              await updateLastRound(selectedChild.id, nextCards.map(c => c.word));
              setCardPool(freshPool); // 更新本地pool
            } else {
              setCurrentCards([]);
            }
          }
          
          setSelectedCard(null);
          setUserDefinition('');
          setTeachResult('');
        }, 1500);
      } else {
        setTeachResult('❌ 教学失败，请重试');
      }
    } catch (error) {
      console.error('教学记录保存失败:', error);
      setTeachResult('❌ 保存失败，请重试');
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
      <EnhancedReadingScreen
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
                <label className="relative cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      if (!file.type.startsWith('image/')) {
                        alert('请选择图片文件！');
                        return;
                      }
                      
                      if (file.size > 2 * 1024 * 1024) {
                        alert('图片大小不能超过2MB！');
                        return;
                      }
                      
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        const base64 = event.target?.result as string;
                        if (selectedChild.aiChildData) {
                          selectedChild.aiChildData.avatar = base64;
                          await loadChildren();
                          const { smartLoad, smartSave } = await import('../utils/storage');
                          const conversations = await smartLoad('conversations') as Conversation[] || [];
                          const index = conversations.findIndex(c => c.id === selectedChild.id);
                          if (index !== -1) {
                            conversations[index] = selectedChild;
                            await smartSave('conversations', conversations);
                          }
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="hidden"
                  />
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500 relative">
                    {selectedChild.aiChildData?.avatar ? (
                      <img 
                        src={selectedChild.aiChildData.avatar} 
                        alt={selectedChild.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getStageEmoji(selectedChild.aiChildData.stage)
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs">
                      点击上传
                    </div>
                  </div>
                </label>
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
                      理解力 Lv.{selectedChild.aiChildData.comprehension.level} ({selectedChild.aiChildData.comprehension.progress}%)
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-1.5 mt-1">
                      <div 
                        className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${selectedChild.aiChildData.comprehension.progress}%` }}
                      />
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
                    onOpenChat(selectedChild.id, true); // 传递true表示需要返回幼儿园
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
                className="bg-white p-4 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all"
              >
                <TrendingUp className="w-6 h-6 mx-auto mb-2" />
                成长报告
              </button>

              {/* AI互动按钮 - 需要至少2个AI */}
              <button
                onClick={() => setShowInteraction(true)}
                disabled={children.length < 2}
                className={`p-4 rounded-xl font-medium transition-all ${
                  children.length >= 2
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:shadow-lg'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Users className="w-6 h-6 mx-auto mb-2" />
                AI互动
                {children.length < 2 && (
                  <div className="text-xs mt-1">需要2个AI</div>
                )}
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
                        disabled={isLoadingCards || !cardPool}
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

                {/* 轮次完成提示 */}
                {showRoundComplete && (
                  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                      <div className="text-center mb-4">
                        <div className="text-6xl mb-3">🎉</div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                          {currentRoundNumber === 1 ? '恭喜完成首轮学习！' : currentRoundNumber === 2 ? '第二轮学习完成！' : '所有轮次完成！'}
                        </h2>
                        <p className="text-gray-600 mb-4">
                          今天已学习 <span className="font-bold text-blue-600">{dailyRounds}</span> 个单词
                        </p>
                      </div>

                      {currentRoundNumber === 1 && (
                        <div className="bg-blue-50 rounded-xl p-4 mb-4">
                          <p className="text-sm text-gray-700 mb-3">
                            ✨ 去找 <span className="font-semibold text-blue-600">{selectedChild.aiChildData?.nickname || selectedChild.name}</span> 聊聊天吧！
                          </p>
                          <p className="text-xs text-gray-600">
                            你也可以继续学习，但额外轮次不增加经验值
                          </p>
                        </div>
                      )}

                      {currentRoundNumber === 2 && (
                        <div className="bg-orange-50 rounded-xl p-4 mb-4">
                          <p className="text-sm text-orange-700 mb-2">
                            ⚠️ 这是最后一次新增轮次
                          </p>
                          <p className="text-xs text-gray-600">
                            第三轮后将无法继续学习
                          </p>
                        </div>
                      )}

                      <div className="space-y-3">
                        {currentRoundNumber < 3 && (
                          <button
                            onClick={startNewRound}
                            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg"
                          >
                            📚 继续学习（第{currentRoundNumber + 1}轮）
                          </button>
                        )}
                        <button
                          onClick={() => setShowRoundComplete(false)}
                          className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                        >
                          {currentRoundNumber < 3 ? '稍后再学' : '关闭'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 自由聊天提示 */}
                {(dailyRounds >= 20 || (teachResult && teachResult.includes('成功'))) && (
                  <div className="mt-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">💬</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 mb-2">💡 随时可以自由聊天</h4>
                        <ul className="space-y-1.5 text-sm text-gray-700">
                          <li className="flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5">•</span>
                            <span>可以随时在<span className="font-semibold text-blue-600">自由聊天</span>中与{selectedChild.name}交流</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5">•</span>
                            <span>检验{selectedChild.name}的学习情况和理解能力</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-purple-500 mt-0.5">•</span>
                            <span>在聊天中{selectedChild.name}也会学习新知识</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-orange-500 mt-0.5">•</span>
                            <span className="font-semibold">但只有词卡教学会记录经验值哦</span>
                          </li>
                        </ul>
                      </div>
                    </div>
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

      {/* AI Interaction Modal - AI互动界面 */}
      {showInteraction && children.length >= 2 && (
        <AIInteractionModal
          children={children}
          apiConfig={apiConfig}
          onClose={() => setShowInteraction(false)}
          onInteractionComplete={() => {
            // 互动完成后重新加载children数据
            loadChildren();
          }}
        />
      )}

      {/* 聊天式教学已改为简单输入式教学 */}
    </div>
  );
}
