/**
 * 写信界面
 */

import React, { useState } from 'react';
import { Conversation } from '../types';
import { sendLetter, getRandomBottleAI } from '../utils/letterService';
import { ArrowLeft, Send, Sparkles } from 'lucide-react';

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
  } | null>(null);
  const [showReceiverModal, setShowReceiverModal] = useState(false);

  // 获取AI联系人列表（排除群聊，只保留有characterSettings的私聊）
  const aiContacts = conversations.filter(c => c.type === 'private' && c.characterSettings);

  const handleSendLetter = () => {
    if (!content.trim()) {
      alert('请输入信件内容');
      return;
    }

    if (!selectedReceiver) {
      alert('请选择收信人');
      return;
    }

    // 寄出信件
    sendLetter(
      content,
      selectedReceiver.id,
      selectedReceiver.name,
      selectedReceiver.avatar,
      selectedReceiver.isBottle,
      userName
    );

    alert(`✉️ 信件已寄出！\n\n${selectedReceiver.isBottle ? '你的信已经投入漂流瓶，等待有缘人的回信...' : `已寄给 ${selectedReceiver.name}，请耐心等待回信～`}\n\n预计1-5天内收到回复`);
    
    setContent('');
    setSelectedReceiver(null);
    onSent();
  };

  const handleSelectBottle = () => {
    const bottleAI = getRandomBottleAI();
    setSelectedReceiver({
      id: bottleAI.id,
      name: bottleAI.name,
      avatar: bottleAI.avatar,
      isBottle: true
    });
    setShowReceiverModal(false);
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
                  <span className="text-2xl">{selectedReceiver.avatar}</span>
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
            <div className="mt-1">from {userName}</div>
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
                      avatar: contact.avatar || '👤',
                      isBottle: false
                    });
                    setShowReceiverModal(false);
                  }}
                  className="w-full px-6 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">
                      {contact.avatar || '👤'}
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
    </div>
  );
};

export default LetterWritingScreen;
