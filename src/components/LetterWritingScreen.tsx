/**
 * 写信界面
 */

import React, { useState, useEffect } from 'react';
import { Conversation } from '../types';
import { sendLetter, getAllPresetAIs, getCustomPenPals, saveCustomPenPal, continueReply } from '../utils/letterService';
import { BottleAI, Letter } from '../types/letter';
import { getSafeAvatar } from '../utils/avatarHelper';
import { ArrowLeft, Send, Sparkles, Users, UserPlus } from 'lucide-react';
import LetterSendingAnimation from './LetterSendingAnimation';
import CustomPenPalCreator from './CustomPenPalCreator';
import LetterMenuDropdown from './LetterMenuDropdown';

interface LetterWritingScreenProps {
  onBack: () => void;
  onSent: () => void;
  conversations: Conversation[];
  userName: string;
  replyToLetter?: Letter | null;
  onNavigate?: (page: string) => void;
}

const LetterWritingScreen: React.FC<LetterWritingScreenProps> = ({
  onBack,
  onSent,
  conversations,
  userName,
  replyToLetter,
  onNavigate
}) => {
  const [content, setContent] = useState('');
  const [selectedReceiver, setSelectedReceiver] = useState<{
    id: string;
    name: string;
    avatar: string;
    isBottle: boolean;
    bottleAIProfile?: BottleAI;
  } | null>(null);
  const [showReceiverModal, setShowReceiverModal] = useState(false);
  const [showSendingAnimation, setShowSendingAnimation] = useState(false);
  const [showCustomPenPalCreator, setShowCustomPenPalCreator] = useState(false);
  const [customPenPals, setCustomPenPals] = useState<BottleAI[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false); // 匿名寄信选项

  // 请求通知权限
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // 获取AI联系人列表（排除群聊，只保留有characterSettings的私聊）
  const aiContacts = conversations.filter(c => c.type === 'private' && c.characterSettings);
  
  // 加载自定义笔友
  useEffect(() => {
    setCustomPenPals(getCustomPenPals());
  }, [showReceiverModal]);

  // 如果有replyToLetter，自动选中收件人
  useEffect(() => {
    if (replyToLetter) {
      setSelectedReceiver({
        id: replyToLetter.receiverId,
        name: replyToLetter.receiverName,
        avatar: replyToLetter.receiverAvatar || '👤',
        isBottle: replyToLetter.isBottle,
        bottleAIProfile: replyToLetter.bottleAIProfile
      });
    }
  }, [replyToLetter]);

  const handleSendLetter = () => {
    if (!content.trim()) {
      alert('请输入信件内容');
      return;
    }

    if (!selectedReceiver) {
      alert('请选择收信人');
      return;
    }

    // 显示发送动画
    setShowSendingAnimation(true);

    // 如果是继续回复现有信件
    if (replyToLetter) {
      continueReply(replyToLetter.id, content, userName);
    } else {
      // 寄出新信件（如果是自定义笔友，传入完整的bottleAIProfile）
      const letter = sendLetter(
        content,
        selectedReceiver.id,
        selectedReceiver.name,
        selectedReceiver.avatar,
        selectedReceiver.isBottle,
        userName,
        isAnonymous && !selectedReceiver.isBottle // 非漂流瓶才使用用户选择的匿名选项
      );
      
      // 如果是自定义笔友，需要手动设置bottleAIProfile
      if (selectedReceiver.bottleAIProfile) {
        const letters = JSON.parse(localStorage.getItem('slow_letters') || '[]');
        const letterIndex = letters.findIndex((l: any) => l.id === letter.id);
        if (letterIndex !== -1) {
          letters[letterIndex].bottleAIProfile = selectedReceiver.bottleAIProfile;
          letters[letterIndex].isPenPalAdded = true; // 自定义笔友直接标记为笔友
          letters[letterIndex].maxRounds = 999; // 无限制
          localStorage.setItem('slow_letters', JSON.stringify(letters));
        }
      }
    }
  };
  
  const handleCreateCustomPenPal = (penPal: BottleAI) => {
    const success = saveCustomPenPal(penPal);
    if (success) {
      setCustomPenPals(getCustomPenPals());
      setShowCustomPenPalCreator(false);
      alert(`✨ 成功创建笔友「${penPal.name}」\n\n已自动加入笔友列表，可以随时写信交流！`);
    } else {
      alert('创建失败，请重试');
    }
  };

  const handleAnimationComplete = () => {
    setShowSendingAnimation(false);
    setContent('');
    setSelectedReceiver(null);
    onSent();
  };

  // 选择漂流瓶模式（不指定收信人，寄出时随机生成）
  const handleSelectBottle = () => {
    setSelectedReceiver({
      id: 'bottle_random',
      name: '随机笔友',
      avatar: '🌊',
      isBottle: true
    });
    setShowReceiverModal(false);
  };
  
  // 获取所有预设AI角色
  const presetAIs = getAllPresetAIs();

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 z-50 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="relative z-[60] bg-white/80 backdrop-blur-sm border-b border-orange-200 px-4 py-3 flex items-center justify-between">
        {/* 左侧：返回 + 功能菜单 */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="relative z-[70] p-2 hover:bg-orange-100 rounded-full transition-colors"
          >
            <ArrowLeft size={22} className="text-gray-700" />
          </button>
          
          {/* 功能菜单下拉 */}
          {onNavigate && (
            <LetterMenuDropdown onNavigate={onNavigate} />
          )}
        </div>
        
        {/* 中间：标题 */}
        <h1 className="text-lg font-semibold text-gray-800">写信</h1>
        
        {/* 右侧：寄出按钮（简化版） */}
        <button
          onClick={handleSendLetter}
          disabled={!content.trim() || !selectedReceiver}
          className={`p-2 rounded-full transition-all ${
            content.trim() && selectedReceiver
              ? 'bg-orange-500 text-white hover:bg-orange-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          title="寄出"
        >
          <Send size={20} strokeWidth={2} />
        </button>
      </div>

      {/* 主体内容 */}
      <div className="flex-1 overflow-y-auto p-4 pb-28">
        {/* 信纸 */}
        <div className="max-w-2xl mx-auto rounded-3xl shadow-2xl overflow-hidden relative">
          {/* 信封背景 */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 opacity-60" />
          
          <div className="relative bg-white/90 backdrop-blur-sm p-8 min-h-[500px]"
            style={{
              backgroundImage: `
                repeating-linear-gradient(
                  transparent,
                  transparent 31px,
                  rgba(229, 231, 235, 0.3) 31px,
                  rgba(229, 231, 235, 0.3) 32px
                ),
                radial-gradient(circle at 10% 20%, rgba(251, 191, 36, 0.05) 0%, transparent 50%),
                radial-gradient(circle at 90% 80%, rgba(249, 115, 22, 0.05) 0%, transparent 50%)
              `,
              boxShadow: 'inset 0 0 60px rgba(251, 191, 36, 0.1)'
            }}
          >
            {/* 邮票装饰 - 更精致 */}
            <div className="absolute top-6 right-6 w-20 h-24 border-4 border-dashed border-orange-400 rounded-lg flex items-center justify-center bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-100 shadow-lg transform rotate-3 hover:rotate-0 transition-transform">
              <span className="text-4xl">📮</span>
            </div>
            
            {/* 蜡封装饰 */}
            <div className="absolute top-6 left-6 w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-800 shadow-xl flex items-center justify-center transform -rotate-12">
              <span className="text-2xl">🔖</span>
            </div>

          {/* 收信人 */}
          <div className="mb-8 mt-4">
            <div className="text-xs text-gray-500 mb-2 font-serif flex items-center gap-2">
              To:
              {replyToLetter && (
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                  继续回复 · 第{replyToLetter.currentRound + 1}轮
                </span>
              )}
            </div>
            <button
              onClick={() => !replyToLetter && setShowReceiverModal(true)}
              disabled={!!replyToLetter}
              className={`w-full text-left px-5 py-4 border-2 border-dashed rounded-2xl transition-all shadow-sm ${
                replyToLetter 
                  ? 'border-blue-300 bg-blue-50 cursor-not-allowed'
                  : 'border-orange-300 hover:border-orange-500 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 hover:shadow-md'
              }`}
            >
              {selectedReceiver ? (
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getSafeAvatar(selectedReceiver.avatar, '💌')}</span>
                  <div>
                    <div className="text-sm text-gray-500">收信人</div>
                    <div className="font-medium text-gray-800 flex items-center gap-2">
                      {selectedReceiver.name}
                      {selectedReceiver.isBottle && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                          漂流瓶
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 text-center">
                  点击选择收信人
                </div>
              )}
            </button>
            
            {/* 匿名选项（非漂流瓶才显示） */}
            {selectedReceiver && !selectedReceiver.isBottle && (
              <div className="mt-3 flex items-center gap-2 px-2">
                <input
                  type="checkbox"
                  id="anonymous-option"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 text-orange-500 rounded focus:ring-orange-400"
                />
                <label htmlFor="anonymous-option" className="text-sm text-gray-600 cursor-pointer select-none">
                  🎭 匿名寄信（收信人不会看到你的真实姓名）
                </label>
              </div>
            )}
          </div>

          {/* 写信区域 */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="亲爱的朋友：&#10;&#10;见字如面...&#10;&#10;写下你想说的话，让它随时间慢慢抵达对方心里。"
            className="w-full min-h-[350px] resize-none bg-transparent border-none outline-none text-gray-800 leading-8 placeholder-gray-400 font-serif"
            style={{ 
              lineHeight: '32px',
              fontFamily: '"Noto Serif SC", "STSong", serif'
            }}
          />

          {/* 落款 */}
          <div className="text-right mt-8 text-gray-600 font-serif italic">
            <div className="text-sm">{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            {!isAnonymous && !selectedReceiver?.isBottle && (
              <div className="mt-2 font-medium">from {userName} ✍️</div>
            )}
            {(isAnonymous || selectedReceiver?.isBottle) && (
              <div className="mt-2 text-gray-400">from 匿名 🎭</div>
            )}
          </div>
          </div>
        </div>

        {/* 温馨提示 - 复古邮局风格 */}
        <div className="max-w-2xl mx-auto mt-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-md">
              <span className="text-xl">💌</span>
            </div>
            <div className="text-sm text-blue-800 flex-1">
              <div className="font-bold mb-2 text-base flex items-center gap-2">
                📮 慢邮件说明
              </div>
              <div className="space-y-1.5 text-blue-700">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  信件寄出后，预计1-5天收到回信
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  漂流瓶会随机寄给一位陌生笔友
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  可以在信箱中催促回复（缩短至15-30分钟）
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 选择收信人模态框 */}
      {showReceiverModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowReceiverModal(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[70vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">选择收信人</h2>
            </div>

            <div className="overflow-y-auto max-h-[50vh]">
              {/* 漂流瓶选项 */}
              <button
                onClick={handleSelectBottle}
                className="w-full px-6 py-4 hover:bg-blue-50 transition-colors border-b border-gray-100 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-2xl">
                    🌊
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 flex items-center gap-2">
                      漂流瓶
                      <Sparkles size={16} className="text-blue-500" />
                    </div>
                    <div className="text-sm text-gray-500">随机寄给陌生的笔友</div>
                  </div>
                </div>
              </button>

              {/* AI联系人列表 */}
              {aiContacts.length > 0 && (
                <>
                  <div className="p-3 bg-gray-50 text-xs text-gray-500 font-medium">
                    我的联系人
                  </div>
                  {aiContacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => {
                        setSelectedReceiver({
                          id: contact.id,
                          name: contact.characterSettings?.nickname || contact.name,
                          avatar: getSafeAvatar(contact.avatar, '👤'),
                          isBottle: false
                        });
                        setShowReceiverModal(false);
                      }}
                      className="w-full px-6 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100 text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">
                          {getSafeAvatar(contact.avatar, '👤')}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">
                            {contact.characterSettings?.nickname || contact.name}
                          </div>
                          {contact.characterSettings?.personality && (
                            <div className="text-sm text-gray-500 truncate">
                              {contact.characterSettings.personality.slice(0, 30)}...
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* 预设AI角色区 */}
              <div className="p-3 bg-amber-50 text-xs text-amber-700 font-medium flex items-center gap-2">
                <Users size={14} />
                预设笔友
              </div>
              {presetAIs.map((ai) => (
                <button
                  key={ai.id}
                  onClick={() => {
                    setSelectedReceiver({
                      id: ai.id,
                      name: ai.name,
                      avatar: ai.avatar,
                      isBottle: false
                    });
                    setShowReceiverModal(false);
                  }}
                  className="w-full px-6 py-4 hover:bg-amber-50 transition-colors border-b border-gray-100 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">
                      {ai.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 flex items-center gap-2">
                        {ai.name}
                        <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
                          {ai.location}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {ai.personality}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {ai.hobby}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              
              {/* 自定义笔友区 */}
              {customPenPals.length > 0 && (
                <>
                  <div className="p-3 bg-purple-50 text-xs text-purple-700 font-medium flex items-center gap-2">
                    <Sparkles size={14} />
                    我的自定义笔友
                  </div>
                  {customPenPals.map((penPal) => (
                    <button
                      key={penPal.id}
                      onClick={() => {
                        setSelectedReceiver({
                          id: penPal.id,
                          name: penPal.name,
                          avatar: penPal.avatar,
                          isBottle: false,
                          bottleAIProfile: penPal
                        });
                        setShowReceiverModal(false);
                      }}
                      className="w-full px-6 py-4 hover:bg-purple-50 transition-colors border-b border-gray-100 text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">
                          {penPal.avatar}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-800 flex items-center gap-2">
                            {penPal.name}
                            <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                              自定义
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {penPal.customRolePrompt?.slice(0, 50)}...
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}
              
              {/* 创建自定义笔友按钮 */}
              <button
                onClick={() => {
                  setShowReceiverModal(false);
                  setShowCustomPenPalCreator(true);
                }}
                className="w-full px-6 py-4 hover:bg-purple-50 transition-colors border-b-2 border-purple-200 text-left bg-gradient-to-r from-purple-50 to-pink-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                    <UserPlus size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 flex items-center gap-2">
                      创建自定义笔友
                      <Sparkles size={16} className="text-purple-500" />
                    </div>
                    <div className="text-sm text-gray-500">创建影视、小说、动漫角色作为笔友</div>
                  </div>
                </div>
              </button>
            </div>

            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setShowReceiverModal(false)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-gray-700 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 发送动画 */}
      <LetterSendingAnimation
        isVisible={showSendingAnimation}
        onComplete={handleAnimationComplete}
        receiverName={selectedReceiver?.name || ''}
      />
      
      {/* 自定义笔友创建器 */}
      {showCustomPenPalCreator && (
        <CustomPenPalCreator
          onClose={() => setShowCustomPenPalCreator(false)}
          onConfirm={handleCreateCustomPenPal}
        />
      )}
    </div>
  );
};

export default LetterWritingScreen;
