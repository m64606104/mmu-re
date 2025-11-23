import { useState, useEffect } from 'react';
import { X, Users, BookOpen, MessageSquare, Loader } from 'lucide-react';
import { Conversation, ApiConfig } from '../types';
import { InteractionMessage, executeTeachingInteraction, executeChatInteraction } from '../utils/aiChildInteractionManager';

interface AIInteractionModalProps {
  children: Conversation[];
  apiConfig: ApiConfig;
  onClose: () => void;
  onInteractionComplete: () => void;
}

export default function AIInteractionModal({
  children,
  apiConfig,
  onClose,
  onInteractionComplete
}: AIInteractionModalProps) {
  const [step, setStep] = useState<'select' | 'type' | 'chat' | 'teaching'>('select');
  const [selectedChildren, setSelectedChildren] = useState<[Conversation | null, Conversation | null]>([null, null]);
  const [interactionType, setInteractionType] = useState<'teaching' | 'chat' | null>(null);
  const [messages, setMessages] = useState<InteractionMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // 选择AI
  const handleSelectChild = (child: Conversation, position: 0 | 1) => {
    const newSelection: [Conversation | null, Conversation | null] = [...selectedChildren];
    newSelection[position] = child;
    setSelectedChildren(newSelection);
  };

  // 开始互动
  const handleStartInteraction = async () => {
    if (!selectedChildren[0] || !selectedChildren[1] || !interactionType) return;

    setIsGenerating(true);
    
    try {
      if (interactionType === 'teaching') {
        await handleTeaching();
      } else {
        await handleChat();
      }
    } catch (error) {
      console.error('互动失败:', error);
      alert('互动失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  // 处理教学互动
  const handleTeaching = async () => {
    const [teacher, student] = selectedChildren;
    if (!teacher || !student) return;

    // 选择教师学过但学生没学过的词
    const teacherWords = teacher.aiChildData?.vocabulary.map(v => v.word) || [];
    const studentWords = student.aiChildData?.vocabulary.map(v => v.word) || [];
    const wordsToTeach = teacherWords.filter(w => !studentWords.includes(w)).slice(0, 3);

    if (wordsToTeach.length === 0) {
      alert(`${teacher.name}没有可以教给${student.name}的新词哦！`);
      return;
    }

    setStep('teaching');
    
    const interaction = await executeTeachingInteraction(
      teacher,
      student,
      wordsToTeach,
      apiConfig
    );
    
    setMessages(interaction.messages);
    setCurrentMessageIndex(0);
  };

  // 处理聊天互动
  const handleChat = async () => {
    const [child1, child2] = selectedChildren;
    if (!child1 || !child2) return;

    setStep('chat');
    
    const interaction = await executeChatInteraction(
      child1,
      child2,
      undefined,
      apiConfig
    );
    
    setMessages(interaction.messages);
    setCurrentMessageIndex(0);
  };

  // 逐条显示消息
  useEffect(() => {
    if (messages.length === 0) return;
    if (currentMessageIndex >= messages.length) return;

    const timer = setTimeout(() => {
      setCurrentMessageIndex(prev => prev + 1);
    }, 1500); // 每条消息间隔1.5秒

    return () => clearTimeout(timer);
  }, [messages, currentMessageIndex]);

  // 获取可教学的词数量
  const getTeachableWords = (teacher: Conversation, student: Conversation) => {
    const teacherWords = teacher.aiChildData?.vocabulary.map(v => v.word) || [];
    const studentWords = student.aiChildData?.vocabulary.map(v => v.word) || [];
    return teacherWords.filter(w => !studentWords.includes(w)).length;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-800">AI互动</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 步骤1：选择AI */}
          {step === 'select' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">选择互动的AI</h3>
                <p className="text-sm text-gray-600">需要选择两个不同的AI宝宝</p>
              </div>

              {/* AI 1 */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">第一个AI</div>
                <div className="grid grid-cols-2 gap-3">
                  {children.map(child => (
                    <button
                      key={child.id}
                      onClick={() => handleSelectChild(child, 0)}
                      disabled={selectedChildren[1]?.id === child.id}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedChildren[0]?.id === child.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      } ${selectedChildren[1]?.id === child.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="text-left">
                        <div className="font-medium text-gray-800">{child.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {child.aiChildData?.vocabulary.length || 0}个词
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* AI 2 */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">第二个AI</div>
                <div className="grid grid-cols-2 gap-3">
                  {children.map(child => (
                    <button
                      key={child.id}
                      onClick={() => handleSelectChild(child, 1)}
                      disabled={selectedChildren[0]?.id === child.id}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedChildren[1]?.id === child.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      } ${selectedChildren[0]?.id === child.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="text-left">
                        <div className="font-medium text-gray-800">{child.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {child.aiChildData?.vocabulary.length || 0}个词
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedChildren[0] && selectedChildren[1] && (
                <button
                  onClick={() => setStep('type')}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  下一步
                </button>
              )}
            </div>
          )}

          {/* 步骤2：选择互动类型 */}
          {step === 'type' && selectedChildren[0] && selectedChildren[1] && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">选择互动方式</h3>
                <p className="text-sm text-gray-600">
                  {selectedChildren[0].name} 和 {selectedChildren[1].name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* 互相教学 */}
                <button
                  onClick={() => {
                    setInteractionType('teaching');
                    handleStartInteraction();
                  }}
                  disabled={isGenerating || getTeachableWords(selectedChildren[0], selectedChildren[1]) === 0}
                  className="p-6 rounded-xl border-2 border-orange-200 hover:border-orange-400 hover:bg-orange-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <BookOpen className="w-12 h-12 text-orange-500 mx-auto mb-3" />
                  <div className="font-medium text-gray-800 mb-1">互相教学</div>
                  <div className="text-xs text-gray-500">
                    {selectedChildren[0].name}教{selectedChildren[1].name}
                  </div>
                  <div className="text-xs text-orange-600 mt-2">
                    可教{getTeachableWords(selectedChildren[0], selectedChildren[1])}个新词
                  </div>
                </button>

                {/* 自由对话 */}
                <button
                  onClick={() => {
                    setInteractionType('chat');
                    handleStartInteraction();
                  }}
                  disabled={isGenerating}
                  className="p-6 rounded-xl border-2 border-green-200 hover:border-green-400 hover:bg-green-50 transition-all"
                >
                  <MessageSquare className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <div className="font-medium text-gray-800 mb-1">自由对话</div>
                  <div className="text-xs text-gray-500">
                    聊天交流，增进感情
                  </div>
                </button>
              </div>

              {isGenerating && (
                <div className="flex items-center justify-center gap-2 text-purple-600">
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>正在生成互动内容...</span>
                </div>
              )}

              <button
                onClick={() => setStep('select')}
                className="w-full py-2 text-gray-600 hover:text-gray-800"
              >
                返回
              </button>
            </div>
          )}

          {/* 步骤3：显示对话 */}
          {(step === 'chat' || step === 'teaching') && messages.length > 0 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {step === 'teaching' ? '🎓 教学互动' : '💬 聊天互动'}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedChildren[0]?.name} 和 {selectedChildren[1]?.name}
                </p>
              </div>

              {/* 对话消息 */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {messages.slice(0, currentMessageIndex).map((msg) => {
                  const isSystem = msg.speakerId === 'system';
                  const isChild1 = msg.speakerId === selectedChildren[0]?.id;
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isSystem ? 'justify-center' : isChild1 ? 'justify-start' : 'justify-end'}`}
                    >
                      {isSystem ? (
                        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg text-sm">
                          {msg.content}
                        </div>
                      ) : (
                        <div className={`max-w-[70%] ${isChild1 ? '' : 'text-right'}`}>
                          <div className="text-xs text-gray-500 mb-1">{msg.speakerName}</div>
                          <div
                            className={`inline-block px-4 py-2 rounded-2xl ${
                              isChild1
                                ? 'bg-purple-100 text-purple-900'
                                : 'bg-blue-100 text-blue-900'
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {currentMessageIndex >= messages.length && (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl text-center">
                    <div className="font-medium mb-2">✨ 互动完成！</div>
                    {step === 'teaching' && (
                      <div className="text-sm">
                        {selectedChildren[1]?.name}学会了新词！
                        {selectedChildren[0]?.name}获得了经验奖励！
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      onInteractionComplete();
                      onClose();
                    }}
                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                  >
                    完成
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
