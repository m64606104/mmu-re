import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Send, Check, User, Bot, ArrowRight, Forward } from 'lucide-react';
import { SubChat, Message, Conversation } from '../types';

interface SubChatForwardModalProps {
  subChats: SubChat[];
  conversations: Conversation[];
  currentConversationId: string;
  onClose: () => void;
  onForward: (messages: Message[], targetType: 'main' | 'subchat', targetId: string) => void;
}

const SubChatForwardModal: React.FC<SubChatForwardModalProps> = ({
  subChats,
  conversations,
  currentConversationId,
  onClose,
  onForward
}) => {
  const [selectedSubChat, setSelectedSubChat] = useState<SubChat | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [targetType, setTargetType] = useState<'main' | 'subchat'>('main');
  const [targetId, setTargetId] = useState<string>('');
  const [step, setStep] = useState<'select-subchat' | 'select-messages' | 'select-target'>('select-subchat');

  // 获取当前对话的子对话
  const currentSubChats = subChats.filter(sc => sc.conversationId === currentConversationId);
  
  // 获取其他对话（用于转发目标）
  const otherConversations = conversations.filter(c => c.id !== currentConversationId);
  const otherSubChats = subChats.filter(sc => sc.conversationId !== currentConversationId);

  const handleSubChatSelect = (subChat: SubChat) => {
    setSelectedSubChat(subChat);
    setSelectedMessages([]);
    setStep('select-messages');
  };

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleNext = () => {
    if (step === 'select-messages' && selectedMessages.length > 0) {
      setStep('select-target');
    }
  };

  const handleBack = () => {
    if (step === 'select-messages') {
      setStep('select-subchat');
    } else if (step === 'select-target') {
      setStep('select-messages');
    }
  };

  const handleForward = () => {
    if (!selectedSubChat || selectedMessages.length === 0 || !targetId) return;

    const messagesToForward = selectedSubChat.messages.filter(m => 
      selectedMessages.includes(m.id)
    );

    onForward(messagesToForward, targetType, targetId);
    onClose();
  };

  const getTargetName = () => {
    if (targetType === 'main') {
      const conversation = conversations.find(c => c.id === targetId);
      return conversation ? conversation.name : '未知对话';
    } else {
      const subChat = [...currentSubChats, ...otherSubChats].find(sc => sc.id === targetId);
      return subChat ? subChat.name : '未知子对话';
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      <div className="flex items-center space-x-4">
        {/* Step 1 */}
        <div className={`flex items-center ${step === 'select-subchat' ? 'text-purple-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step === 'select-subchat' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'
          }`}>
            1
          </div>
          <span className="ml-2 text-sm font-medium">选择子对话</span>
        </div>
        
        <ArrowRight className="w-4 h-4 text-gray-300" />
        
        {/* Step 2 */}
        <div className={`flex items-center ${step === 'select-messages' ? 'text-purple-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step === 'select-messages' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'
          }`}>
            2
          </div>
          <span className="ml-2 text-sm font-medium">选择消息</span>
        </div>
        
        <ArrowRight className="w-4 h-4 text-gray-300" />
        
        {/* Step 3 */}
        <div className={`flex items-center ${step === 'select-target' ? 'text-purple-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step === 'select-target' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'
          }`}>
            3
          </div>
          <span className="ml-2 text-sm font-medium">选择目标</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
        {/* 标题栏 */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Forward className="w-6 h-6" />
            <h2 className="text-xl font-semibold">转发聊天记录</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 步骤指示器 */}
        <div className="px-6 py-4 border-b border-gray-200">
          {renderStepIndicator()}
        </div>

        {/* 内容区 */}
        <div className="p-6 max-h-[50vh] overflow-y-auto">
          {/* Step 1: 选择子对话 */}
          {step === 'select-subchat' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">选择要转发消息的子对话</h3>
              {currentSubChats.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>当前对话暂无子对话</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentSubChats.map((subChat) => (
                    <div
                      key={subChat.id}
                      onClick={() => handleSubChatSelect(subChat)}
                      className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:bg-purple-50/30 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <MessageCircle className="w-5 h-5 text-purple-500" />
                        <h4 className="font-semibold text-gray-900">{subChat.name}</h4>
                        <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
                          {subChat.messages.length}条消息
                        </span>
                      </div>
                      {subChat.purpose && (
                        <p className="text-sm text-gray-600 mb-2">{subChat.purpose}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        创建时间：{new Date(subChat.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: 选择消息 */}
          {step === 'select-messages' && selectedSubChat && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  选择要转发的消息 - {selectedSubChat.name}
                </h3>
                <div className="text-sm text-gray-600">
                  已选择 {selectedMessages.length} 条消息
                </div>
              </div>
              
              {selectedSubChat.messages.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>该子对话暂无消息</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedSubChat.messages.map((message) => (
                    <div
                      key={message.id}
                      onClick={() => toggleMessageSelection(message.id)}
                      className={`border rounded-lg p-3 cursor-pointer transition-all ${
                        selectedMessages.includes(message.id)
                          ? 'border-purple-300 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedMessages.includes(message.id)
                            ? 'border-purple-500 bg-purple-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedMessages.includes(message.id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {message.role === 'user' ? (
                              <User className="w-4 h-4 text-blue-500" />
                            ) : (
                              <Bot className="w-4 h-4 text-green-500" />
                            )}
                            <span className="text-sm font-medium text-gray-700">
                              {message.role === 'user' ? '用户' : 'AI'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(message.timestamp).toLocaleString()}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-900 line-clamp-3">
                            {message.content || '多媒体消息'}
                          </p>
                          
                          {/* 显示特殊消息类型 */}
                          {message.document && (
                            <div className="mt-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded inline-block">
                              📄 文档：{message.document.title}
                            </div>
                          )}
                          {message.moneyTransfer && (
                            <div className="mt-2 text-xs bg-yellow-100 text-yellow-600 px-2 py-1 rounded inline-block">
                              {message.moneyTransfer.type === 'redPacket' ? '🧧 红包' : '💸 转账'}：¥{message.moneyTransfer.amount}
                            </div>
                          )}
                          {message.mediaType && (
                            <div className="mt-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded inline-block">
                              {message.mediaType === 'image' ? '🖼️ 图片' : 
                               message.mediaType === 'video' ? '🎥 视频' :
                               message.mediaType === 'voice' ? '🎤 语音' : '😊 表情包'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: 选择目标 */}
          {step === 'select-target' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">选择转发目标</h3>
              
              {/* 目标类型选择 */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => {setTargetType('main'); setTargetId('');}}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    targetType === 'main'
                      ? 'border-purple-300 bg-purple-50 text-purple-600'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <MessageCircle className="w-5 h-5 mx-auto mb-2" />
                  <div className="font-medium">主对话</div>
                  <div className="text-xs text-gray-500">转发到其他主对话</div>
                </button>
                
                <button
                  onClick={() => {setTargetType('subchat'); setTargetId('');}}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    targetType === 'subchat'
                      ? 'border-purple-300 bg-purple-50 text-purple-600'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Forward className="w-5 h-5 mx-auto mb-2" />
                  <div className="font-medium">子对话</div>
                  <div className="text-xs text-gray-500">转发到其他子对话</div>
                </button>
              </div>

              {/* 目标列表 */}
              <div className="space-y-2">
                {targetType === 'main' ? (
                  // 主对话列表
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">选择目标主对话</h4>
                    {/* 当前对话 */}
                    <div
                      onClick={() => setTargetId(currentConversationId)}
                      className={`border rounded-lg p-3 cursor-pointer transition-all ${
                        targetId === currentConversationId
                          ? 'border-purple-300 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <MessageCircle className="w-5 h-5 text-purple-500" />
                        <div>
                          <div className="font-medium">{conversations.find(c => c.id === currentConversationId)?.name}</div>
                          <div className="text-xs text-purple-600">当前对话</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 其他对话 */}
                    {otherConversations.map(conversation => (
                      <div
                        key={conversation.id}
                        onClick={() => setTargetId(conversation.id)}
                        className={`border rounded-lg p-3 cursor-pointer transition-all ${
                          targetId === conversation.id
                            ? 'border-purple-300 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <MessageCircle className="w-5 h-5 text-blue-500" />
                          <div>
                            <div className="font-medium">{conversation.name}</div>
                            <div className="text-xs text-gray-500">{conversation.messages.length}条消息</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // 子对话列表
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">选择目标子对话</h4>
                    {/* 当前对话的其他子对话 */}
                    {currentSubChats.filter(sc => sc.id !== selectedSubChat?.id).map(subChat => (
                      <div
                        key={subChat.id}
                        onClick={() => setTargetId(subChat.id)}
                        className={`border rounded-lg p-3 cursor-pointer transition-all ${
                          targetId === subChat.id
                            ? 'border-purple-300 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Forward className="w-5 h-5 text-purple-500" />
                          <div>
                            <div className="font-medium">{subChat.name}</div>
                            <div className="text-xs text-purple-600">当前对话的子对话</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* 其他对话的子对话 */}
                    {otherSubChats.map(subChat => (
                      <div
                        key={subChat.id}
                        onClick={() => setTargetId(subChat.id)}
                        className={`border rounded-lg p-3 cursor-pointer transition-all ${
                          targetId === subChat.id
                            ? 'border-purple-300 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Forward className="w-5 h-5 text-blue-500" />
                          <div>
                            <div className="font-medium">{subChat.name}</div>
                            <div className="text-xs text-gray-500">
                              来自：{conversations.find(c => c.id === subChat.conversationId)?.name}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {step === 'select-subchat' && '请选择要转发消息的子对话'}
              {step === 'select-messages' && `已选择 ${selectedMessages.length} 条消息`}
              {step === 'select-target' && targetId && `转发到：${getTargetName()}`}
            </div>
            
            <div className="flex gap-3">
              {step !== 'select-subchat' && (
                <button
                  onClick={handleBack}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  上一步
                </button>
              )}
              
              {step === 'select-messages' && (
                <button
                  onClick={handleNext}
                  disabled={selectedMessages.length === 0}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一步
                </button>
              )}
              
              {step === 'select-target' && (
                <button
                  onClick={handleForward}
                  disabled={!targetId}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  转发消息
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubChatForwardModal;
