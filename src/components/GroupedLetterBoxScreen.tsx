/**
 * 分组信件列表页面
 * 按收件人分类显示，支持备注名功能
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, Send, Clock, Edit2, Check, MessageCircle } from 'lucide-react';
import { 
  getGroupedLetterList, 
  getLettersByReceiver,
  formatLastActivity,
  getContactTypeLabel,
  type LetterGroup 
} from '../utils/letterListManager';
import { setAINickname, getAINickname } from '../utils/letterNicknameManager';
import { Letter } from '../types/letter';
import LetterDetailView from './LetterDetailView';

interface GroupedLetterBoxScreenProps {
  onBack: () => void;
  onWriteNew: () => void;
  onContinueReply?: (letter: Letter) => void;
  userName: string;
}

export default function GroupedLetterBoxScreen({
  onBack,
  onWriteNew,
  onContinueReply,
  userName
}: GroupedLetterBoxScreenProps) {
  const [letterData, setLetterData] = useState(getGroupedLetterList());
  const [selectedGroup, setSelectedGroup] = useState<LetterGroup | null>(null);
  const [receiverLetters, setReceiverLetters] = useState<Letter[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [editingNickname, setEditingNickname] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'penpal' | 'bottle' | 'unanswered'>('all');

  useEffect(() => {
    refreshData();
    
    // 监听信件数据变化
    const interval = setInterval(refreshData, 10000);
    const handleStorageChange = () => refreshData();
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('letter-sent', handleStorageChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('letter-sent', handleStorageChange);
    };
  }, []);

  const refreshData = () => {
    setLetterData(getGroupedLetterList());
  };

  const handleGroupClick = (group: LetterGroup) => {
    const letters = getLettersByReceiver(group.receiverId);
    setReceiverLetters(letters);
    setSelectedGroup(group);
  };

  const handleLetterClick = (letter: Letter & {selectedRound?: number}) => {
    setSelectedLetter(letter);
  };

  const handleNicknameEdit = (receiverId: string) => {
    const currentNickname = getAINickname(receiverId);
    setNicknameInput(currentNickname || '');
    setEditingNickname(receiverId);
  };

  const handleNicknameSave = (receiverId: string, originalName: string, avatar: string) => {
    if (nicknameInput.trim()) {
      setAINickname(receiverId, nicknameInput.trim(), originalName, avatar);
      refreshData();
    }
    setEditingNickname(null);
    setNicknameInput('');
  };

  const handleNicknameCancel = () => {
    setEditingNickname(null);
    setNicknameInput('');
  };

  const getFilteredGroups = () => {
    switch (activeTab) {
      case 'penpal':
        return letterData.penPals;
      case 'bottle':
        return letterData.bottles;
      case 'unanswered':
        // 筛选有未回复信件的组（用户发了但AI还没回复）
        const allGroups = [...letterData.penPals, ...letterData.bottles, ...letterData.contacts];
        return allGroups.filter(group => {
          const letters = getLettersByReceiver(group.receiverId);
          return letters.some(letter => letter.status === 'sent');
        });
      default:
        return [...letterData.penPals, ...letterData.bottles, ...letterData.contacts];
    }
  };

  // 如果选择了具体信件，显示信件详情
  if (selectedLetter) {
    return (
      <LetterDetailView
        letter={selectedLetter}
        onBack={() => setSelectedLetter(null)}
        userName={userName}
        initialRoundNumber={(selectedLetter as any).selectedRound}
        onContinueReply={onContinueReply ? () => onContinueReply(selectedLetter) : undefined}
      />
    );
  }

  // 如果选择了收件人组，显示该收件人的所有信件
  if (selectedGroup) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 z-50 flex flex-col">
        {/* 头部 */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-indigo-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSelectedGroup(null)}
            className="p-2 hover:bg-indigo-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-xl">
              {selectedGroup.receiverAvatar}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-800">{selectedGroup.displayName}</h1>
              <div className="text-sm text-gray-500">
                {selectedGroup.letterCount}封信件 · {formatLastActivity(selectedGroup.lastActivity)}
              </div>
            </div>
          </div>
          <button
            onClick={() => handleNicknameEdit(selectedGroup.receiverId)}
            className="p-2 hover:bg-indigo-100 rounded-full transition-colors"
            title="编辑备注名"
          >
            <Edit2 size={20} className="text-gray-600" />
          </button>
        </div>

        {/* 轮次列表 */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="max-w-2xl mx-auto space-y-3">
            {/* 显示所有轮次，倒序排列 */}
            {selectedGroup && receiverLetters[0] && receiverLetters[0].conversationRounds ? 
              [...receiverLetters[0].conversationRounds].reverse().map((round) => {
                const letter = receiverLetters[0];
                
                // 判断轮次状态
                let status = '';
                let statusColor = '';
                if (round.aiReply) {
                  // AI已回复
                  status = '已回复';
                  statusColor = 'bg-green-100 text-green-700';
                } else if (round.userLetter.willReplyAt && Date.now() < round.userLetter.willReplyAt) {
                  // 预计回复时间还没到，正在等待中
                  status = '等待回信';
                  statusColor = 'bg-orange-100 text-orange-700';
                } else if (round.userLetter.willReplyAt && Date.now() >= round.userLetter.willReplyAt) {
                  // 预计回复时间已过，但AI还没回复
                  status = '未回信';
                  statusColor = 'bg-blue-100 text-blue-700';
                } else {
                  // 没有设置willReplyAt（异常情况）
                  status = '等待回信';
                  statusColor = 'bg-orange-100 text-orange-700';
                }

                return (
                  <div
                    key={round.roundNumber}
                    onClick={() => handleLetterClick({...letter, selectedRound: round.roundNumber})}
                    className="bg-white rounded-2xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 cursor-pointer p-4 border border-gray-100 hover:border-orange-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <div className="text-sm font-medium text-gray-800">
                          第 {round.roundNumber} 轮对话
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatLastActivity(round.userLetter.sentAt)}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-700 line-clamp-2 mb-3">
                      "{round.userLetter.content}"
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full flex items-center gap-1 ${statusColor}`}>
                          {status === '已回复' && <Check size={12} />}
                          {status === '等待回信' && <Clock size={12} />}
                          {status}
                        </span>
                        <span className="text-gray-500">
                          {round.roundNumber} 轮
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-400">
                        点击查看详情 →
                      </div>
                    </div>
                  </div>
                );
              })
            : (
              <div className="text-center py-8 text-gray-500">
                暂无对话记录
              </div>
            )}
          </div>
        </div>

        {/* 备注名编辑弹窗 */}
        {editingNickname === selectedGroup.receiverId && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <div className="bg-white rounded-2xl p-6 mx-4 w-full max-w-sm">
              <h3 className="text-lg font-semibold mb-4">设置备注名</h3>
              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-2">
                  原名: {selectedGroup.receiverName}
                </div>
                <input
                  type="text"
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  placeholder="输入备注名..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={20}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleNicknameCancel}
                  className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => handleNicknameSave(selectedGroup.receiverId, selectedGroup.receiverName, selectedGroup.receiverAvatar)}
                  className="flex-1 px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 主列表页面
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
        <div className="text-center">
          <h1 className="text-lg font-semibold text-gray-800">信箱</h1>
          <div className="text-xs text-gray-500">
            {letterData.total}个联系人{letterData.unreadTotal > 0 && ` · ${letterData.unreadTotal}条未读`}
          </div>
        </div>
        <button
          onClick={onWriteNew}
          className="p-2 hover:bg-orange-100 rounded-full transition-colors"
        >
          <Send size={20} className="text-orange-600" />
        </button>
      </div>

      {/* 筛选标签栏 - 优雅设计 */}
      <div className="bg-gradient-to-br from-white/80 via-orange-50/50 to-amber-50/50 backdrop-blur-xl border-b border-orange-100/50 px-4 py-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-300/50 scale-105'
                : 'bg-white/80 text-gray-700 hover:bg-white hover:shadow-md'
            }`}
          >
            <MessageCircle size={16} className="inline mr-1.5" />
            全部 ({letterData.total})
          </button>
          <button
            onClick={() => setActiveTab('penpal')}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
              activeTab === 'penpal'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-300/50 scale-105'
                : 'bg-white/80 text-gray-700 hover:bg-white hover:shadow-md'
            }`}
          >
            ❤️ 笔友 ({letterData.penPals.length + letterData.contacts.length})
          </button>
          <button
            onClick={() => setActiveTab('bottle')}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
              activeTab === 'bottle'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-300/50 scale-105'
                : 'bg-white/80 text-gray-700 hover:bg-white hover:shadow-md'
            }`}
          >
            🌊 漂流瓶 ({letterData.bottles.length})
          </button>
          <button
            onClick={() => setActiveTab('unanswered')}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
              activeTab === 'unanswered'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-300/50 scale-105'
                : 'bg-white/80 text-gray-700 hover:bg-white hover:shadow-md'
            }`}
          >
            ⏰ 未回复
          </button>
        </div>
      </div>

      {/* 联系人列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {getFilteredGroups().map((group) => (
            <div
              key={group.receiverId}
              onClick={() => handleGroupClick(group)}
              className="group bg-gradient-to-br from-white to-orange-50/30 rounded-3xl shadow-md hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden border border-orange-100/50 hover:border-orange-300"
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* 头像 */}
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-400 flex items-center justify-center text-2xl shadow-lg shadow-orange-200/50 transform group-hover:scale-110 transition-transform duration-300">
                      {group.receiverAvatar}
                    </div>
                    {/* 小装饰点 */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                  </div>

                  {/* 信息区域 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-bold text-gray-900 truncate text-base">
                        {group.displayName}
                      </h3>
                      {group.displayName !== group.receiverName && (
                        <span className="text-xs text-gray-500 bg-white/80 px-2 py-0.5 rounded-full border border-gray-200">
                          {group.receiverName}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 line-clamp-2 mb-3 leading-relaxed">
                      {group.latestLetter.content}
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${getContactTypeLabel(group).bgColor} ${getContactTypeLabel(group).color}`}>
                          {getContactTypeLabel(group).text}
                        </span>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {group.letterCount}封
                        </span>
                        {/* 状态胶囊 */}
                        {(() => {
                          const latestRound = group.latestLetter.conversationRounds[group.latestLetter.conversationRounds.length - 1];
                          
                          if (latestRound?.aiReply && !latestRound.aiReply.isDeleted) {
                            // AI已回复，用户需要回信
                            return (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                                未回
                              </span>
                            );
                          }
                          
                          if (latestRound && !latestRound.aiReply && group.latestLetter.status === 'sent') {
                            // 用户已发送，等待AI回信
                            return (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                                等待
                              </span>
                            );
                          }
                          
                          return null;
                        })()}
                      </div>
                      
                      <div className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                        {formatLastActivity(group.lastActivity)}
                      </div>
                    </div>
                  </div>

                  {/* 编辑按钮 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNicknameEdit(group.receiverId);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Edit2 size={16} className="text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {getFilteredGroups().length === 0 && (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">暂无信件</h3>
              <p className="text-gray-500 mb-6">开始你的第一次通信吧</p>
              <button
                onClick={onWriteNew}
                className="px-6 py-3 bg-indigo-500 text-white rounded-full font-medium hover:bg-indigo-600 transition-colors"
              >
                写第一封信
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 备注名编辑弹窗 */}
      {editingNickname && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
          <div className="bg-white rounded-2xl p-6 mx-4 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">设置备注名</h3>
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">
                原名: {getFilteredGroups().find(g => g.receiverId === editingNickname)?.receiverName}
              </div>
              <input
                type="text"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                placeholder="输入备注名..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={20}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleNicknameCancel}
                className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const group = getFilteredGroups().find(g => g.receiverId === editingNickname);
                  if (group) {
                    handleNicknameSave(group.receiverId, group.receiverName, group.receiverAvatar);
                  }
                }}
                className="flex-1 px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
