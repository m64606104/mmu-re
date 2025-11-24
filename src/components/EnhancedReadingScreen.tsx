/**
 * 📚 增强版阅读学习界面
 * 支持AI学习模式、时间预估、讨论式学习
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, Book, Clock, Target, MessageCircle, CheckCircle, BookOpen, Grid3X3 } from 'lucide-react';
import { ReadingMaterial, Conversation, ApiConfig } from '../types';
import { 
 
  getRecommendedBooksForLearning,
  estimateLearningTime,
  getBookDifficulty,
  detectUnknownWords,
  getCategoryName,
  getAllBookCategories,
  BookLearningStatus
} from '../utils/enhancedBookLibrary';
import { smartLoad, smartSave } from '../utils/storage';

interface EnhancedReadingScreenProps {
  child: Conversation;
  onBack: () => void;
  onUpdateChild: () => void;
  apiConfig: ApiConfig;
}

export default function EnhancedReadingScreen({ child, onBack, onUpdateChild }: EnhancedReadingScreenProps) {
  const [books, setBooks] = useState<ReadingMaterial[]>([]);
  const [selectedBook, setSelectedBook] = useState<ReadingMaterial | null>(null);
  const [learningStatuses, setLearningStatuses] = useState<Record<string, BookLearningStatus>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'category'>('category');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<Array<{key: string; name: string; count: number}>>([]);
  
  // 学习进行中的状态
  const [learningBook, setLearningBook] = useState<ReadingMaterial | null>(null);
  const [learningProgress, setLearningProgress] = useState(0);
  // const [learningStartTime, setLearningStartTime] = useState(0); // 留备未来使用
  const [showDiscussion, setShowDiscussion] = useState(false);
  const [unknownWords, setUnknownWords] = useState<string[]>([]);
  const [currentUnknownWord, setCurrentUnknownWord] = useState<string>('');

  useEffect(() => {
    loadBooks();
    loadLearningStatuses();
  }, [child]);

  const loadBooks = () => {
    if (!child.aiChildData) return;
    
    const recommended = getRecommendedBooksForLearning(child.aiChildData.vocabulary.length);
    setBooks(recommended);
    setCategories(getAllBookCategories());
  };

  const loadLearningStatuses = async () => {
    try {
      const saved = await smartLoad(`book_learning_${child.id}`) as Record<string, BookLearningStatus> || {};
      setLearningStatuses(saved);
    } catch (error) {
      console.error('加载学习状态失败:', error);
    }
  };

  const saveLearningStatuses = async (statuses: Record<string, BookLearningStatus>) => {
    try {
      await smartSave(`book_learning_${child.id}`, statuses);
      setLearningStatuses(statuses);
    } catch (error) {
      console.error('保存学习状态失败:', error);
    }
  };

  const handleStartLearning = (book: ReadingMaterial) => {
    if (!child.aiChildData) return;

    const vocabularySize = child.aiChildData.vocabulary.length;
    const estimatedTime = estimateLearningTime(book, vocabularySize);
    const difficulty = getBookDifficulty(book, vocabularySize);
    const unknownWordsInBook = detectUnknownWords(book, vocabularySize);

    const learningStatus: BookLearningStatus = {
      bookId: book.id,
      status: unknownWordsInBook.length > 0 ? 'discussion_needed' : 'learning',
      startTime: Date.now(),
      estimatedTime,
      difficulty,
      progress: 0,
      unknownWords: unknownWordsInBook,
      needsDiscussion: unknownWordsInBook.length > 0
    };

    // 更新学习状态
    const updatedStatuses = {
      ...learningStatuses,
      [book.id]: learningStatus
    };
    saveLearningStatuses(updatedStatuses);

    if (unknownWordsInBook.length > 0) {
      // 需要讨论的书籍
      setUnknownWords(unknownWordsInBook);
      setCurrentUnknownWord(unknownWordsInBook[0]);
      setShowDiscussion(true);
      setSelectedBook(book);
    } else {
      // 可以直接学习的书籍
      setLearningBook(book);
      setLearningProgress(0);
      startLearningProgress(book, estimatedTime);
    }
  };

  const startLearningProgress = (book: ReadingMaterial, estimatedTimeMinutes: number) => {
    const totalTime = estimatedTimeMinutes * 60 * 1000; // 转换为毫秒
    const interval = 1000; // 每秒更新一次
    const increment = 100 / (totalTime / interval);

    const progressInterval = setInterval(() => {
      setLearningProgress(prev => {
        const newProgress = prev + increment;
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          handleLearningComplete(book);
          return 100;
        }
        return newProgress;
      });
    }, interval);
  };

  const handleLearningComplete = async (book: ReadingMaterial) => {
    // 更新学习状态为完成
    const updatedStatuses = {
      ...learningStatuses,
      [book.id]: {
        ...learningStatuses[book.id],
        status: 'completed' as const,
        progress: 100
      }
    };
    await saveLearningStatuses(updatedStatuses);

    // 更新AI的知识库
    try {
      const conversations = await smartLoad('conversations') as Conversation[] || [];
      const index = conversations.findIndex(c => c.id === child.id);
      
      if (index !== -1 && conversations[index].aiChildData) {
        const childData = conversations[index].aiChildData!;
        
        // 添加到已读书籍
        if (!childData.booksRead.includes(book.id)) {
          childData.booksRead.push(book.id);
        }
        
        // 使用新的简化升级系统
        const { processLevelUp, getLevelUpMessage } = await import('../utils/simpleUpgradeSystem');
        const expGain = book.level * 10;
        const { leveledUp, newLevel, oldLevel } = processLevelUp(childData, expGain);
        
        // 根据书籍内容增加词汇量（简化处理）
        const newWords = Math.floor(book.wordCount * 0.3);
        const newWordObjects = Array(newWords).fill(0).map((_, i) => ({
          word: `word_${book.id}_${i}`,
          confidence: 1.0,
          context: book.title,
          familiarity: 1.0,
          learnedAt: Date.now(),
          reviewCount: 0,
          lastReview: Date.now(),
          difficulty: 1,
          definition: `从《${book.title}》中学到的词汇`,
          examples: [book.title]
        }));
        childData.vocabulary.push(...newWordObjects);
        
        if (leveledUp) {
          console.log(getLevelUpMessage(child.name, oldLevel, newLevel));
        }
        
        await smartSave('conversations', conversations);
        onUpdateChild();
      }
    } catch (error) {
      console.error('更新AI数据失败:', error);
    }

    // 显示完成提示
    alert(`🎉 ${child.name}已经学完《${book.title}》！\n\n学到了很多新知识，词汇量增加了！`);
    
    setLearningBook(null);
    setLearningProgress(0);
    loadBooks(); // 刷新书籍列表
  };

  const handleDiscussionAnswer = (word: string, _explanation: string) => {
    // 简化处理：用户解释后继续下一个词
    const currentIndex = unknownWords.indexOf(word);
    if (currentIndex < unknownWords.length - 1) {
      setCurrentUnknownWord(unknownWords[currentIndex + 1]);
    } else {
      // 所有词都解释完了，开始学习
      setShowDiscussion(false);
      if (selectedBook) {
        setLearningBook(selectedBook);
        setLearningProgress(0);
        
        const vocabularySize = child.aiChildData?.vocabulary.length || 0;
        const estimatedTime = estimateLearningTime(selectedBook, vocabularySize);
        startLearningProgress(selectedBook, estimatedTime);
      }
    }
  };

  const getFilteredBooks = () => {
    if (selectedCategory === 'all') return books;
    return books.filter(book => book.category === selectedCategory);
  };

  const getStatusIcon = (book: ReadingMaterial) => {
    const status = learningStatuses[book.id];
    if (!status) return null;
    
    switch (status.status) {
      case 'learning':
        return <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />;
      case 'discussion_needed':
        return <MessageCircle className="w-4 h-4 text-orange-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (book: ReadingMaterial) => {
    const status = learningStatuses[book.id];
    if (!status) return '开始学习';
    
    switch (status.status) {
      case 'learning':
        return `学习中 ${status.progress.toFixed(0)}%`;
      case 'discussion_needed':
        return '需要讨论';
      case 'completed':
        return '已完成';
      default:
        return '开始学习';
    }
  };

  if (!child.aiChildData) return null;

  // 学习进行中界面
  if (learningBook) {
    const vocabularySize = child.aiChildData.vocabulary.length;
    const estimatedTime = estimateLearningTime(learningBook, vocabularySize);
    
    return (
      <div className="h-full bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col">
        <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setLearningBook(null)} className="p-2 -ml-2">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-800">{child.name}正在学习</h2>
              <p className="text-xs text-gray-500">《{learningBook.title}》· 预计{estimatedTime}分钟</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-4xl mb-6 mx-auto">
              📚
            </div>
            
            <h3 className="text-xl font-bold text-gray-800 mb-2">学习中...</h3>
            <p className="text-gray-600 mb-6">《{learningBook.title}》</p>
            
            {/* 进度条 */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-1000"
                style={{ width: `${learningProgress}%` }}
              />
            </div>
            
            <p className="text-sm text-gray-500">
              学习进度 {learningProgress.toFixed(0)}%
            </p>
            
            <div className="mt-6 text-xs text-gray-400">
              💡 {child.name}正在认真学习新知识...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 讨论界面
  if (showDiscussion && selectedBook && currentUnknownWord) {
    return (
      <div className="h-full bg-gradient-to-br from-amber-50 to-orange-50 flex flex-col">
        <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowDiscussion(false)} className="p-2 -ml-2">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-800">一起读书</h2>
              <p className="text-xs text-gray-500">《{selectedBook.title}》· 需要你的帮助</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md mx-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-3xl mb-4 mx-auto">
                🤔
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">{child.name}遇到了不认识的词</h3>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4 text-center">
              <div className="text-2xl font-bold text-gray-800 mb-2">
                {currentUnknownWord}
              </div>
              <div className="text-sm text-gray-500">
                ~~~~~ ~~~~~<br/>
                ({child.name}不认识这个词)
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🧒</div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">
                    "'{currentUnknownWord}'是什么意思？"
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                placeholder="用简单的话解释这个词..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const explanation = (e.target as HTMLInputElement).value;
                    if (explanation.trim()) {
                      handleDiscussionAnswer(currentUnknownWord, explanation);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
              
              <div className="flex gap-2">
                <button 
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-medium"
                  onClick={() => {
                    const input = document.querySelector('input') as HTMLInputElement;
                    const explanation = input?.value;
                    if (explanation?.trim()) {
                      handleDiscussionAnswer(currentUnknownWord, explanation);
                      input.value = '';
                    }
                  }}
                >
                  解释
                </button>
                <button 
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium"
                  onClick={() => {
                    const currentIndex = unknownWords.indexOf(currentUnknownWord);
                    if (currentIndex < unknownWords.length - 1) {
                      setCurrentUnknownWord(unknownWords[currentIndex + 1]);
                    }
                  }}
                >
                  跳过
                </button>
                <button 
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium"
                  onClick={() => {
                    // 读给它听 - 这里可以添加语音功能
                    alert('语音功能开发中...');
                  }}
                >
                  读给它听
                </button>
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-500 text-center">
              还有 {unknownWords.length - unknownWords.indexOf(currentUnknownWord) - 1} 个词需要解释
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 主界面 - 书籍列表
  return (
    <div className="h-full bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-800">{child.name}的学习书架</h2>
            <p className="text-xs text-gray-500">
              识字{child.aiChildData.vocabulary.length}个 · 已学{child.aiChildData.booksRead.length}本
            </p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('category')}
              className={`p-2 rounded-lg ${viewMode === 'category' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              <BookOpen className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
              <Book className="w-4 h-4" />
              <span className="text-lg font-bold">{child.aiChildData.booksRead.length}</span>
            </div>
            <p className="text-xs text-gray-500">学过的书</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-lg font-bold">{books.length}</span>
            </div>
            <p className="text-xs text-gray-500">可学书籍</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-orange-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-lg font-bold">{Object.keys(learningStatuses).filter(id => learningStatuses[id].status === 'learning').length}</span>
            </div>
            <p className="text-xs text-gray-500">学习中</p>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      {viewMode === 'category' && (
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                selectedCategory === 'all' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              全部 ({books.length})
            </button>
            {categories.map(category => (
              <button
                key={category.key}
                onClick={() => setSelectedCategory(category.key)}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                  selectedCategory === category.key 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Book List */}
      <div className="flex-1 overflow-y-auto p-4">
        {getFilteredBooks().length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-gray-500 text-sm text-center">
              继续教{child.name}认字<br/>
              认识更多字就能学更多书啦！
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {getFilteredBooks().map((book) => {
              const isLearned = child.aiChildData!.booksRead.includes(book.id);
              const vocabularySize = child.aiChildData!.vocabulary.length;
              const estimatedTime = estimateLearningTime(book, vocabularySize);
              const difficulty = getBookDifficulty(book, vocabularySize);
              const status = learningStatuses[book.id];
              
              return (
                <div
                  key={book.id}
                  className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => status?.status !== 'learning' && handleStartLearning(book)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center text-3xl flex-shrink-0 relative">
                      📖
                      {getStatusIcon(book) && (
                        <div className="absolute -top-1 -right-1 bg-white rounded-full p-1">
                          {getStatusIcon(book)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-800">{book.title}</h3>
                        {isLearned && (
                          <span className="text-yellow-500">⭐</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          difficulty === 'easy' ? 'bg-green-100 text-green-600' :
                          difficulty === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {getCategoryName(book.category)}
                        </span>
                        <span className="text-xs text-gray-500">{book.wordCount}字</span>
                        <span className="text-xs text-gray-500">~{estimatedTime}分钟</span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                        {book.content.substring(0, 50)}...
                      </p>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${
                          status?.status === 'completed' ? 'text-green-600' :
                          status?.status === 'learning' ? 'text-blue-600' :
                          status?.status === 'discussion_needed' ? 'text-orange-600' :
                          'text-gray-600'
                        }`}>
                          {getStatusText(book)}
                        </span>
                        {!isLearned && status?.status !== 'learning' && (
                          <button className="text-xs bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 rounded-full hover:shadow-md transition-all">
                            开始学习
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
