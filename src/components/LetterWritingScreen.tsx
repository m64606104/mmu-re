/**
 * 写信界面
 */

import React, { useState, useEffect } from 'react';
import { Conversation } from '../types';
import { sendLetter, getAllPresetAIs, getCustomPenPals, saveCustomPenPal } from '../utils/letterService';
import { BottleAI } from '../types/letter';
import { getSafeAvatar } from '../utils/avatarHelper';
import { ArrowLeft, Send, Sparkles, Users, UserPlus } from 'lucide-react';
import LetterSendingAnimation from './LetterSendingAnimation';
import CustomPenPalCreator from './CustomPenPalCreator';

interface LetterWritingScreenProps {
  onBack: () => void;
  onSent: () => void;
  conversations: Conversation[];
  userName: string;
}

const LetterWritingScreen: React.FC<LetterWritingScreenProps> = ({
  onBack,
  onSent,
  conversations,
  userName
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

    // 寄出信件（如果是自定义笔友，传入完整的bottleAIProfile）
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
      <div className="bg-white/80 backdrop-blur-sm border-b border-orange-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 hover:bg-orange-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">写信</h1>
        <button
          onClick={handleSendLetter}
          disabled={!content.trim() || !selectedReceiver}
          className={`px-4 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${
            content.trim() && selectedReceiver
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-lg'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Send size={18} />
          寄出
        </button>
      </div>

      {/* 主体内容 */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 信纸 */}
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-6 min-h-[500px] relative"
          style={{
            backgroundImage: `repeating-linear-gradient(
              transparent,
              transparent 31px,
              #e5e7eb 31px,
              #e5e7eb 32px
            )`
          }}
        >
          {/* 邮票装饰 */}
          <div className="absolute top-4 right-4 w-16 h-20 border-4 border-dashed border-orange-400 rounded-md flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100">
            <span className="text-3xl">📮</span>
          </div>

          {/* 收信人 */}
          <div className="mb-6">
            <button
              onClick={() => setShowReceiverModal(true)}
              className="w-full text-left px-4 py-3 border-2 border-dashed border-orange-300 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all"
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
            className="w-full min-h-[350px] resize-none bg-transparent border-none outline-none text-gray-800 leading-8 placeholder-gray-400"
            style={{ lineHeight: '32px' }}
          />

          {/* 落款 */}
          <div className="text-right mt-8 text-gray-600">
            <div>{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            {!isAnonymous && !selectedReceiver?.isBottle && (
              <div className="mt-1">from {userName}</div>
            )}
            {(isAnonymous || selectedReceiver?.isBottle) && (
              <div className="mt-1 text-gray-400">from 匿名</div>
            )}
          </div>
        </div>

        {/* 温馨提示 */}
        <div className="max-w-2xl mx-auto mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">💌</span>
            <div className="text-sm text-blue-700 flex-1">
              <div className="font-medium mb-1">慢邮件说明</div>
              <div className="text-blue-600">
                · 信件寄出后，预计1-5天收到回信<br />
                · 漂流瓶会随机寄给一位陌生笔友<br />
                · 可以在信箱中催促回复（缩短至15-30分钟）
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
