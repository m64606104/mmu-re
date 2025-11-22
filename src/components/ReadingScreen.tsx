/**
 * 📚 阅读界面组件
 * 展示分级故事和阅读体验
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, Book, Star, Clock, Target } from 'lucide-react';
import { ReadingMaterial, Conversation, ApiConfig } from '../types';
import { getRecommendedStories } from '../utils/readingLibrary';
import { smartLoad, smartSave } from '../utils/storage';

interface ReadingScreenProps {
  child: Conversation;
  onBack: () => void;
  onUpdateChild: () => void;
  apiConfig: ApiConfig;
}

export default function ReadingScreen({ child, onBack, onUpdateChild }: ReadingScreenProps) {
  const [stories, setStories] = useState<ReadingMaterial[]>([]);
  const [selectedStory, setSelectedStory] = useState<ReadingMaterial | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [readingStartTime, setReadingStartTime] = useState(0);

  useEffect(() => {
    loadStories();
  }, [child]);

  const loadStories = () => {
    if (!child.aiChildData) return;
    
    const recommended = getRecommendedStories(child.aiChildData.vocabulary.length);
    setStories(recommended);
  };

  const handleStartReading = (story: ReadingMaterial) => {
    setSelectedStory(story);
    setIsReading(true);
    setReadingStartTime(Date.now());
  };

  const handleFinishReading = async () => {
    if (!selectedStory || !child.aiChildData) return;

    const readingTime = Math.floor((Date.now() - readingStartTime) / 1000 / 60); // 分钟

    try {
      // 更新阅读记录
      const conversations = await smartLoad('conversations') as Conversation[] || [];
      const index = conversations.findIndex(c => c.id === child.id);
      
      if (index !== -1 && conversations[index].aiChildData) {
        const childData = conversations[index].aiChildData!;
        
        // 添加到已读书籍
        if (!childData.booksRead.includes(selectedStory.id)) {
          childData.booksRead.push(selectedStory.id);
        }
        
        // 增加阅读时间
        childData.totalReadingTime += readingTime;
        
        // 增加经验值
        const expGain = Math.min(readingTime * 2, 30); // 最多30点经验
        childData.exp += expGain;
        
        // 检查升级
        while (childData.exp >= childData.expToNextLevel) {
          childData.exp -= childData.expToNextLevel;
          childData.level += 1;
          childData.expToNextLevel = Math.floor(childData.expToNextLevel * 1.5);
        }
        
        await smartSave('conversations', conversations);
        onUpdateChild();
      }

      setIsReading(false);
      setSelectedStory(null);
      loadStories();
      
    } catch (error) {
      console.error('保存阅读记录失败:', error);
    }
  };

  const getLevelColor = (level: number) => {
    const colors: Record<number, string> = {
      1: 'bg-green-100 text-green-600',
      2: 'bg-blue-100 text-blue-600',
      3: 'bg-purple-100 text-purple-600',
      4: 'bg-orange-100 text-orange-600',
      5: 'bg-red-100 text-red-600'
    };
    return colors[level] || 'bg-gray-100 text-gray-600';
  };

  const getLevelName = (level: number) => {
    const names: Record<number, string> = {
      1: '认字书',
      2: '简单故事',
      3: '中篇故事',
      4: '长篇故事',
      5: '知识文章'
    };
    return names[level] || '未知';
  };

  if (!child.aiChildData) return null;

  // 阅读模式
  if (isReading && selectedStory) {
    return (
      <div className="h-full bg-gradient-to-br from-amber-50 to-orange-50 flex flex-col">
        {/* Reading Header */}
        <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsReading(false)} className="p-2 -ml-2">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="font-semibold text-gray-800">{selectedStory.title}</h2>
                <p className="text-xs text-gray-500">Level {selectedStory.level} · {selectedStory.wordCount}字</p>
              </div>
            </div>
            <button
              onClick={handleFinishReading}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-medium"
            >
              读完了
            </button>
          </div>
        </div>

        {/* Story Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              {selectedStory.title}
            </h1>
            <div className="prose prose-lg text-gray-700 leading-relaxed whitespace-pre-wrap">
              {selectedStory.content}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 故事列表模式
  return (
    <div className="h-full bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-800">{child.name}的书架</h2>
            <p className="text-xs text-gray-500">
              识字{child.aiChildData.vocabulary.length}个 · 已读{child.aiChildData.booksRead.length}本
            </p>
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
            <p className="text-xs text-gray-500">读过的书</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-lg font-bold">{child.aiChildData.totalReadingTime}</span>
            </div>
            <p className="text-xs text-gray-500">阅读时长(分)</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-orange-600 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-lg font-bold">{stories.length}</span>
            </div>
            <p className="text-xs text-gray-500">可读故事</p>
          </div>
        </div>
      </div>

      {/* Story List */}
      <div className="flex-1 overflow-y-auto p-4">
        {stories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-gray-500 text-sm text-center">
              继续教{child.name}认字<br/>
              认识更多字就能读更多故事啦！
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {stories.map((story) => {
              const isRead = child.aiChildData!.booksRead.includes(story.id);
              return (
                <div
                  key={story.id}
                  className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleStartReading(story)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
                      📖
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-800">{story.title}</h3>
                        {isRead && (
                          <span className="text-yellow-500">
                            <Star className="w-4 h-4 fill-current" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${getLevelColor(story.level)}`}>
                          Level {story.level} · {getLevelName(story.level)}
                        </span>
                        <span className="text-xs text-gray-500">{story.wordCount}字</span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {story.content.substring(0, 50)}...
                      </p>
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
