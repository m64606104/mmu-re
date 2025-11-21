/**
 * 分组信件列表页面
 * 按收件人分类显示，支持备注名功能
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, Send, Users, Waves, Clock, Edit2, Check, MessageCircle } from 'lucide-react';
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
  onToPenPals: () => void;
  onToBottleFishing: () => void;
  onContinueReply?: (letter: Letter) => void;
  userName: string;
}

export default function GroupedLetterBoxScreen({
  onBack,
  onWriteNew,
  onToPenPals,
  onToBottleFishing,
  onContinueReply,
  userName
}: GroupedLetterBoxScreenProps) {
  const [letterData, setLetterData] = useState(getGroupedLetterList());
  const [selectedGroup, setSelectedGroup] = useState<LetterGroup | null>(null);
  const [receiverLetters, setReceiverLetters] = useState<Letter[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [editingNickname, setEditingNickname] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'penpal' | 'bottle'>('all');

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

  const handleLetterClick = (letter: Letter) => {
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

        {/* 信件列表 */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="max-w-2xl mx-auto space-y-4">
            {receiverLetters.map((letter) => (
              <div
                key={letter.id}
                onClick={() => handleLetterClick(letter)}
                className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer p-4 border border-gray-100"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-gray-800">
                      第 {letter.currentRound} 轮对话
                    </div>
                    {letter.status === 'replied' && (
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatLastActivity(letter.sentAt)}
                  </div>
                </div>
                
                <div className="text-sm text-gray-700 line-clamp-2 mb-3">
                  "{letter.content}"
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {letter.status === 'replied' ? (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                        <Check size={12} />
                        已回复
                      </span>
                    ) : (
                      <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full flex items-center gap-1">
                        <Clock size={12} />
                        等待中
                      </span>
                    )}
                    <span className="text-gray-500">
                      {letter.conversationRounds.length} 轮
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {letter.isPenPalAdded && (
                      <span className="text-pink-500">❤️</span>
                    )}
                    {letter.isBottle && (
                      <span className="text-blue-500">🌊</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 z-50 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-indigo-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 hover:bg-indigo-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-800">信箱</h1>
          <div className="text-xs text-gray-500">
            {letterData.total}个联系人 · {letterData.unreadTotal > 0 && `${letterData.unreadTotal}条未读`}
          </div>
        </div>
        <button
          onClick={onWriteNew}
          className="p-2 hover:bg-indigo-100 rounded-full transition-colors"
        >
          <Send size={20} className="text-indigo-600" />
        </button>
      </div>

      {/* 分类标签栏 */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-indigo-100 px-4 py-3">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-indigo-500 text-white'
                : 'bg-white/80 text-gray-600 hover:bg-white'
            }`}
          >
            <MessageCircle size={16} className="inline mr-1" />
            全部 ({letterData.total})
          </button>
          <button
            onClick={() => setActiveTab('penpal')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'penpal'
                ? 'bg-pink-500 text-white'
                : 'bg-white/80 text-gray-600 hover:bg-white'
            }`}
          >
            ❤️ 笔友 ({letterData.penPals.length})
          </button>
          <button
            onClick={() => setActiveTab('bottle')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'bottle'
                ? 'bg-blue-500 text-white'
                : 'bg-white/80 text-gray-600 hover:bg-white'
            }`}
          >
            🌊 漂流瓶 ({letterData.bottles.length})
          </button>
        </div>
      </div>

      {/* 快捷操作栏 */}
      <div className="bg-white/40 backdrop-blur-sm border-b border-indigo-100 px-4 py-3">
        <div className="flex gap-3">
          <button
            onClick={onToPenPals}
            className="flex items-center gap-2 px-3 py-2 bg-white/80 rounded-full text-sm text-gray-700 hover:bg-white transition-colors"
          >
            <Users size={16} />
            我的笔友
          </button>
          <button
            onClick={onToBottleFishing}
            className="flex items-center gap-2 px-3 py-2 bg-white/80 rounded-full text-sm text-gray-700 hover:bg-white transition-colors"
          >
            <Waves size={16} />
            漂流瓶
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
              className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer overflow-hidden border border-gray-100"
            >
              <div className="p-4">
                <div className="flex items-center gap-3">
                  {/* 头像 */}
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-2xl">
                      {group.receiverAvatar}
                    </div>
                  </div>

                  {/* 信息区域 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-800 truncate">
                        {group.displayName}
                      </h3>
                      {group.displayName !== group.receiverName && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {group.receiverName}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 line-clamp-1 mb-2">
                      {group.latestLetter.content}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${getContactTypeLabel(group).bgColor} ${getContactTypeLabel(group).color}`}>
                          {getContactTypeLabel(group).text}
                        </span>
                        <span className="text-xs text-gray-500">
                          {group.letterCount}封信
                        </span>
                        {/* 新的状态胶囊 */}
                        {group.latestLetter.status === 'replied' && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            新回信
                          </span>
                        )}
                        {group.latestLetter.status === 'sent' && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                            待回复
                          </span>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-500">
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
