/**
 * 邮票收集册界面
 * 参考慢邮件App的精美邮票设计
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, Star, Lock, CheckCircle } from 'lucide-react';
import { 
  getStampCollection, 
  getAllSeries, 
  getSeriesStamps, 
  getSeriesProgress,
  setFavoriteStamp,
  getCurrentStamp
} from '../utils/stampSystem';
import { Stamp } from '../types/stamp';

interface StampCollectionScreenProps {
  onBack: () => void;
}

export default function StampCollectionScreen({ onBack }: StampCollectionScreenProps) {
  const [collection, setCollection] = useState(getStampCollection());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStamp, setSelectedStamp] = useState<Stamp | null>(null);
  const [currentStamp, setCurrentStamp] = useState(getCurrentStamp());

  useEffect(() => {
    refreshCollection();
  }, []);

  const refreshCollection = () => {
    setCollection(getStampCollection());
    setCurrentStamp(getCurrentStamp());
  };

  const allSeries = getAllSeries();
  
  // 分类选项
  const categories = [
    { id: 'all', name: '全部', icon: '📮' },
    { id: 'default', name: '默认邮票', icon: '✉️' },
    { id: 'nature', name: '风物集', icon: '🌄' },
    { id: 'emotion', name: '甜蜜系列', icon: '💗' },
    { id: 'animal', name: '可爱胖橘', icon: '🐱' },
    { id: 'city', name: '城市印象', icon: '🏙️' },
    { id: 'festival', name: '节日庆典', icon: '🎊' },
    { id: 'art', name: '艺术殿堂', icon: '🎨' },
    { id: 'special', name: '神秘珍藏', icon: '✨' }
  ];

  // 筛选系列
  const filteredSeries = selectedCategory === 'all' 
    ? allSeries 
    : allSeries.filter(s => s.category === selectedCategory);

  // 处理邮票选择
  const handleStampClick = (stamp: Stamp) => {
    if (!stamp.unlocked) return;
    setSelectedStamp(stamp);
  };

  // 设置为当前邮票
  const handleSetCurrentStamp = (stamp: Stamp) => {
    if (setFavoriteStamp(stamp.id)) {
      refreshCollection();
      setSelectedStamp(null);
    }
  };

  // 获取稀有度颜色
  const getRarityColor = (rarity: Stamp['rarity']) => {
    switch (rarity) {
      case 'common': return 'text-gray-500';
      case 'rare': return 'text-blue-500';
      case 'epic': return 'text-purple-500';
      case 'legendary': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  // 获取稀有度名称
  const getRarityName = (rarity: Stamp['rarity']) => {
    switch (rarity) {
      case 'common': return '普通';
      case 'rare': return '稀有';
      case 'epic': return '史诗';
      case 'legendary': return '传说';
      default: return '普通';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex flex-col">
      {/* 顶部栏 */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-4 flex items-center justify-between shadow-lg">
        <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-xl font-bold">集邮册</h1>
          <p className="text-sm opacity-90">
            已收集 {collection.totalUnlocked} / {collection.totalStamps}
          </p>
        </div>
        <div className="w-10" />
      </div>

      {/* 当前使用的邮票 */}
      {currentStamp && (
        <div className="mx-4 mt-4 bg-white rounded-2xl shadow-lg p-4 border-2 border-amber-300">
          <div className="flex items-center gap-3">
            <div className="w-16 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex items-center justify-center text-4xl border-2 border-dashed border-amber-400 shadow-md">
              {currentStamp.image}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-800">{currentStamp.name}</span>
                <Star size={16} className="text-yellow-500 fill-yellow-500" />
              </div>
              <div className="text-sm text-gray-500 mt-1">当前使用的邮票</div>
            </div>
          </div>
        </div>
      )}

      {/* 分类标签 */}
      <div className="px-4 mt-4 overflow-x-auto">
        <div className="flex gap-2 pb-2">
          {categories.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all
                  ${isSelected 
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg scale-105' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                  }
                `}
              >
                <span className="text-lg">{cat.icon}</span>
                <span className="font-medium text-sm">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 邮票系列列表 */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 mt-4">
        <div className="space-y-6">
          {filteredSeries.map(series => {
            const stamps = getSeriesStamps(series.id);
            const progress = getSeriesProgress(series.id);
            
            return (
              <div key={series.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {/* 系列头部 */}
                <div className="bg-gradient-to-r from-orange-100 to-amber-100 px-4 py-3 border-b-2 border-amber-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-800">{series.name}</h3>
                      <p className="text-sm text-gray-600 mt-0.5">{series.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-orange-600">
                        {progress.unlocked}/{progress.total}
                      </div>
                      {progress.completed && (
                        <CheckCircle size={16} className="text-green-500 ml-auto mt-1" />
                      )}
                    </div>
                  </div>
                </div>

                {/* 邮票网格 */}
                <div className="p-4 grid grid-cols-4 gap-3">
                  {stamps.map(stamp => {
                    const isUnlocked = stamp.unlocked;
                    const isCurrent = currentStamp?.id === stamp.id;
                    
                    return (
                      <button
                        key={stamp.id}
                        onClick={() => handleStampClick(stamp)}
                        disabled={!isUnlocked}
                        className={`
                          relative aspect-[4/5] rounded-xl flex flex-col items-center justify-center
                          transition-all
                          ${isUnlocked 
                            ? 'bg-gradient-to-br from-amber-100 to-orange-100 border-2 border-amber-300 hover:scale-105 hover:shadow-lg' 
                            : 'bg-gray-100 border-2 border-gray-300 opacity-50'
                          }
                          ${isCurrent ? 'ring-2 ring-yellow-500 ring-offset-2' : ''}
                        `}
                      >
                        {/* 邮票边框装饰 */}
                        <div className="absolute inset-0 border-4 border-dashed border-white/50 rounded-xl m-1" />
                        
                        {isUnlocked ? (
                          <>
                            <div className="text-3xl relative z-10">{stamp.image}</div>
                            <div className="text-xs mt-1 text-gray-700 font-medium text-center px-1 relative z-10">
                              {stamp.name}
                            </div>
                            {isCurrent && (
                              <Star size={14} className="absolute top-1 right-1 text-yellow-500 fill-yellow-500" />
                            )}
                          </>
                        ) : (
                          <>
                            <Lock size={24} className="text-gray-400 relative z-10" />
                            <div className="text-xs mt-1 text-gray-500 text-center px-1 relative z-10">
                              未解锁
                            </div>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* 系列完成奖励 */}
                {progress.completed && series.completionReward && (
                  <div className="px-4 pb-3">
                    <div className="bg-gradient-to-r from-yellow-100 to-amber-100 rounded-xl p-3 border-2 border-yellow-300">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🎁</span>
                        <div className="flex-1">
                          <div className="text-xs text-yellow-800 font-medium">系列完成奖励</div>
                          <div className="text-sm text-yellow-900">{series.completionReward}</div>
                        </div>
                        <CheckCircle size={20} className="text-green-500" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 邮票详情弹窗 */}
      {selectedStamp && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedStamp(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 邮票大图 */}
            <div className="bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-100 p-8 flex items-center justify-center">
              <div className="w-40 h-48 bg-white rounded-2xl shadow-2xl flex items-center justify-center border-4 border-dashed border-amber-400 relative">
                <div className="text-7xl">{selectedStamp.image}</div>
                {/* 稀有度标记 */}
                <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold ${getRarityColor(selectedStamp.rarity)} bg-white shadow-md`}>
                  {getRarityName(selectedStamp.rarity)}
                </div>
              </div>
            </div>

            {/* 邮票信息 */}
            <div className="p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">{selectedStamp.name}</h3>
              <p className="text-gray-600 mb-4">{selectedStamp.description}</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-500">
                  <span>系列：</span>
                  <span className="font-medium text-gray-700">{collection.series[selectedStamp.series]?.name || selectedStamp.series}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <span>解锁条件：</span>
                  <span className="font-medium text-gray-700">{selectedStamp.unlockCondition}</span>
                </div>
                {selectedStamp.unlockedAt && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <span>解锁时间：</span>
                    <span className="font-medium text-gray-700">
                      {new Date(selectedStamp.unlockedAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setSelectedStamp(null)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  关闭
                </button>
                <button
                  onClick={() => handleSetCurrentStamp(selectedStamp)}
                  disabled={currentStamp?.id === selectedStamp.id}
                  className={`
                    flex-1 px-4 py-3 rounded-xl font-medium transition-colors
                    ${currentStamp?.id === selectedStamp.id
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-lg'
                    }
                  `}
                >
                  {currentStamp?.id === selectedStamp.id ? '当前邮票' : '使用此邮票'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
