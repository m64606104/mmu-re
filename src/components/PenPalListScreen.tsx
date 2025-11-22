/**
 * 笔友列表页面
 * 显示所有已加为笔友的漂流瓶AI
 */

import React, { useState, useEffect } from 'react';
import { Letter, BottleAI } from '../types/letter';
import { getAllPenPals, getPenPalStats, getCustomPenPals, saveCustomPenPal, generateSelfIntroByAI } from '../utils/letterService';
import { ArrowLeft, MapPin, Heart, MessageCircle, Mail, Sparkles, ChevronDown, ChevronUp, Edit, X, Save } from 'lucide-react';
import LetterDetailModal from './LetterDetailModal';

interface PenPalListScreenProps {
  onBack: () => void;
  onWriteTo: (receiverId: string, receiverName: string, receiverAvatar: string) => void;
  userName: string;
}

const PenPalListScreen: React.FC<PenPalListScreenProps> = ({
  onBack,
  onWriteTo,
  userName
}) => {
  const [penPals, setPenPals] = useState<Letter[]>([]);
  const [customPenPals, setCustomPenPals] = useState<BottleAI[]>([]);
  const [stats, setStats] = useState<ReturnType<typeof getPenPalStats>>();
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [isCustomExpanded, setIsCustomExpanded] = useState(false);
  const [editingPenPal, setEditingPenPal] = useState<BottleAI | null>(null);

  useEffect(() => {
    loadPenPals();
    // 为自定义笔友生成AI介绍
    generateIntrosForCustomPenPals();
  }, []);

  // 为所有没有customBackground的自定义笔友生成介绍
  const generateIntrosForCustomPenPals = async () => {
    const customPals = getCustomPenPals();
    for (const penPal of customPals) {
      if (!penPal.customBackground || !penPal.customBackground.trim()) {
        // 异步生成，不阻塞UI
        ensureSelfIntro(penPal);
      }
    }
  };

  const loadPenPals = () => {
    const pals = getAllPenPals();
    const customPals = getCustomPenPals();
    const statistics = getPenPalStats();
    setPenPals(pals);
    setCustomPenPals(customPals);
    setStats(statistics);
  };

  // 为自定义笔友生成AI自我介绍（如果还没有）
  const ensureSelfIntro = async (penPal: BottleAI) => {
    // 如果已经有customBackground，直接返回
    if (penPal.customBackground && penPal.customBackground.trim()) {
      return;
    }
    
    try {
      // 获取API配置
      const apiConfigStr = localStorage.getItem('api_config');
      if (!apiConfigStr) {
        console.log('未配置API，无法生成自我介绍');
        return;
      }
      
      const apiConfig = JSON.parse(apiConfigStr);
      
      // 调用AI生成自我介绍
      console.log(`🤖 正在为${penPal.name}生成自我介绍...`);
      const intro = await generateSelfIntroByAI(penPal.customRolePrompt || '', apiConfig);
      
      // 更新并保存
      penPal.customBackground = intro;
      saveCustomPenPal(penPal);
      
      // 刷新列表
      loadPenPals();
      console.log(`✨ ${penPal.name}的自我介绍已生成`);
    } catch (error) {
      console.error('生成自我介绍失败:', error);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return '今天';
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 z-50 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-orange-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 hover:bg-orange-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">我的笔友</h1>
        <div className="w-10" /> {/* 占位 */}
      </div>

      {/* 统计卡片 */}
      {stats && stats.total > 0 && (
        <div className="p-4">
          <div className="bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-400 rounded-3xl p-6 text-white shadow-lg shadow-orange-200/50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-4xl font-bold">{stats.total}</div>
                <div className="text-orange-100 text-sm">位笔友</div>
              </div>
              <Heart size={56} className="text-white/20" />
            </div>
            <div className="flex gap-8 text-sm">
              <div>
                <div className="text-orange-100">总交流轮数</div>
                <div className="text-2xl font-semibold">{stats.totalRounds}</div>
              </div>
              <div>
                <div className="text-orange-100">来自地区</div>
                <div className="text-2xl font-semibold">{stats.locations.length}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 笔友列表 */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {penPals.length === 0 && customPenPals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Heart size={64} className="mb-4 opacity-30" />
            <div className="text-lg mb-2">还没有笔友</div>
            <div className="text-sm">试试投漂流瓶，遇到聊得来的就加为笔友吧～</div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 自定义笔友区 */}
            {customPenPals.length > 0 && (
              <>
                <button
                  onClick={() => setIsCustomExpanded(!isCustomExpanded)}
                  className="w-full flex items-center justify-between gap-2 text-sm font-semibold text-orange-700 px-3 py-2 bg-orange-50/80 rounded-xl hover:bg-orange-100/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} />
                    我的自定义笔友 ({customPenPals.length})
                  </div>
                  {isCustomExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {isCustomExpanded && customPenPals.map((penPal) => (
                  <div
                    key={penPal.id}
                    className="bg-gradient-to-br from-orange-50/80 to-amber-50/80 rounded-2xl shadow-md p-4 hover:shadow-lg transition-all border border-orange-200/50"
                  >
                    <div className="flex items-start gap-4">
                      {/* 头像 */}
                      <div className="text-4xl flex-shrink-0">
                        {penPal.avatar}
                      </div>

                      {/* 信息区 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-800">
                            {penPal.name}
                          </span>
                          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                            自定义角色
                          </span>
                        </div>

                        {/* 角色简介 - 改为更自然的展示方式 */}
                        <div className="space-y-1 mb-3">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <MapPin size={12} />
                            <span>虚拟世界</span>
                          </div>
                          <div className="text-xs text-gray-600 line-clamp-2">
                            {penPal.customBackground || '正在生成自我介绍...'}
                          </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPenPal(penPal);
                            }}
                            className="px-3 py-2 bg-white/80 hover:bg-white border border-orange-200 rounded-xl text-sm font-medium text-orange-600 transition-all flex items-center justify-center gap-1"
                          >
                            <Edit size={14} />
                            编辑
                          </button>
                          <button
                            onClick={() => onWriteTo(
                              penPal.id,
                              penPal.name,
                              penPal.avatar
                            )}
                            className="flex-1 px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:shadow-lg text-white rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1"
                          >
                            <Mail size={16} />
                            写信
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
            
            {/* 已通信笔友区 */}
            {penPals.length > 0 && (
              <>
                {customPenPals.length > 0 && (
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 px-3 py-2 bg-amber-50/80 rounded-xl mt-2">
                    <Heart size={16} />
                    已通信笔友 ({penPals.length})
                  </div>
                )}
                {penPals.map((letter) => (
              <div
                key={letter.id}
                className="bg-white rounded-2xl shadow-md p-4 hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* 头像 */}
                  <div className="text-4xl flex-shrink-0">
                    {letter.receiverAvatar}
                  </div>

                  {/* 信息区 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-800">
                        {letter.receiverName}
                      </span>
                      <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
                        笔友
                      </span>
                    </div>

                    {/* AI人设信息 */}
                    {letter.bottleAIProfile && (
                      <div className="space-y-1 mb-2">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <MapPin size={12} />
                          <span>{letter.bottleAIProfile.location}</span>
                        </div>
                        <div className="text-xs text-gray-600 line-clamp-1">
                          {letter.bottleAIProfile.personality}
                        </div>
                        <div className="text-xs text-gray-500">
                          💭 {letter.bottleAIProfile.hobby}
                        </div>
                      </div>
                    )}

                    {/* 交流统计 */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <MessageCircle size={14} />
                        <span>{letter.currentRound} 轮对话</span>
                      </div>
                      <div>
                        最后: {formatTime(letter.repliedAt || letter.sentAt)}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedLetter(letter)}
                        className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors"
                      >
                        查看对话
                      </button>
                      <button
                        onClick={() => onWriteTo(
                          letter.receiverId,
                          letter.receiverName,
                          letter.receiverAvatar || '💌'
                        )}
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:shadow-lg text-white rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1"
                      >
                        <Mail size={16} />
                        写信
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* 信件详情模态框 */}
      {selectedLetter && (
        <LetterDetailModal
          letter={selectedLetter}
          onClose={() => {
            setSelectedLetter(null);
            loadPenPals();
          }}
          onUrge={() => {
            loadPenPals();
          }}
          userName={userName}
        />
      )}

      {/* 编辑自定义笔友弹窗 */}
      {editingPenPal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            {/* 头部 */}
            <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{editingPenPal.avatar}</div>
                <div>
                  <h2 className="text-lg font-bold text-white">编辑笔友信息</h2>
                  <p className="text-xs text-orange-100">修改后会应用到后续回信中</p>
                </div>
              </div>
              <button
                onClick={() => setEditingPenPal(null)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={20} className="text-white" />
              </button>
            </div>

            {/* 编辑表单 */}
            <div className="p-6 space-y-4">
              {/* 名称 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  笔友名称
                </label>
                <input
                  type="text"
                  value={editingPenPal.name}
                  onChange={(e) => setEditingPenPal({...editingPenPal, name: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="给笔友起个名字"
                />
              </div>

              {/* 头像 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  头像表情
                </label>
                <input
                  type="text"
                  value={editingPenPal.avatar}
                  onChange={(e) => setEditingPenPal({...editingPenPal, avatar: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-2xl text-center"
                  placeholder="😊"
                  maxLength={2}
                />
              </div>

              {/* 角色设定 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  角色设定 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={editingPenPal.customRolePrompt || ''}
                  onChange={(e) => setEditingPenPal({...editingPenPal, customRolePrompt: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  rows={4}
                  placeholder="例如：你是一个热爱旅行的摄影师，喜欢分享世界各地的美景..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  描述这个笔友的性格、兴趣、职业等特征
                </p>
              </div>

              {/* 背景故事 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  背景故事
                </label>
                <textarea
                  value={editingPenPal.customBackground || ''}
                  onChange={(e) => setEditingPenPal({...editingPenPal, customBackground: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="例如：小时候在海边长大，梦想是环游世界..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  可选，丰富笔友的背景会让对话更生动
                </p>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditingPenPal(null)}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-gray-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    if (saveCustomPenPal(editingPenPal)) {
                      setEditingPenPal(null);
                      loadPenPals();
                    } else {
                      alert('保存失败：请填写角色设定');
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:shadow-lg text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  保存修改
                </button>
              </div>

              <p className="text-xs text-center text-gray-500 pt-2">
                💡 提示：修改会立即生效，下次收到的回信将基于新的设定
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PenPalListScreen;
