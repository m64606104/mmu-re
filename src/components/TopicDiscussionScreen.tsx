/**
 * 🎭 话题讨论组件
 * 多轮对话教学模式
 */

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Edit2, Trash2 } from 'lucide-react';
import { Conversation, ApiConfig } from '../types';
import { TopicCard } from '../utils/topicCardLibrary';
import { teachWord } from '../utils/aiKindergartenManager';

interface TopicDiscussionScreenProps {
  child: Conversation;
  topic: TopicCard;
  onBack: () => void;
  onUpdateChild: () => void;
  apiConfig: ApiConfig;
}

interface DraftMessage {
  id: string;
  content: string;
  isEditing: boolean;
}

export default function TopicDiscussionScreen({
  child,
  topic,
  onBack,
  onUpdateChild,
  apiConfig
}: TopicDiscussionScreenProps) {
  const [draftMessages, setDraftMessages] = useState<DraftMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [draftMessages, aiResponse]);

  // 添加消息到草稿
  const addDraftMessage = () => {
    if (!currentInput.trim()) return;

    const newMessage: DraftMessage = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: currentInput.trim(),
      isEditing: false
    };

    setDraftMessages(prev => [...prev, newMessage]);
    setCurrentInput('');
    textareaRef.current?.focus();
  };

  // 开始编辑消息
  const startEditing = (id: string) => {
    const message = draftMessages.find(m => m.id === id);
    if (message) {
      setEditingId(id);
      setCurrentInput(message.content);
    }
  };

  // 保存编辑
  const saveEdit = () => {
    if (!editingId || !currentInput.trim()) return;

    setDraftMessages(prev =>
      prev.map(m =>
        m.id === editingId
          ? { ...m, content: currentInput.trim() }
          : m
      )
    );
    setEditingId(null);
    setCurrentInput('');
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null);
    setCurrentInput('');
  };

  // 删除消息
  const deleteMessage = (id: string) => {
    setDraftMessages(prev => prev.filter(m => m.id !== id));
  };

  // 提交所有消息给AI
  const submitToAI = async () => {
    if (draftMessages.length === 0 || !child.aiChildData) return;

    setIsSubmitting(true);

    try {
      // 合并所有消息
      const combinedContent = draftMessages.map(m => m.content).join('\n\n');

      // 构建系统提示词
      const systemPrompt = buildSystemPrompt(child, topic);

      // 调用AI
      const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: apiConfig.modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: combinedContent }
          ],
          temperature: 0.7,
          max_tokens: 300
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API响应错误:', response.status, errorText);
        throw new Error(`API调用失败 (${response.status})`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('API返回非JSON:', text.substring(0, 200));
        throw new Error('API返回了HTML，请检查baseUrl配置');
      }

      const data = await response.json();
      const aiReply = data.choices[0]?.message?.content || '...(没听懂)';

      setAiResponse(aiReply);

      // 保存学习记录：话题理解
      await teachWord(
        child.id,
        topic.topic,
        combinedContent,
        []
      );

      onUpdateChild();

    } catch (error) {
      console.error('提交失败:', error);
      setAiResponse('抱歉，我现在有点累了...');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 重新开始
  const reset = () => {
    setDraftMessages([]);
    setCurrentInput('');
    setEditingId(null);
    setAiResponse('');
  };

  // 构建系统提示词
  const buildSystemPrompt = (child: Conversation, topic: TopicCard): string => {
    if (!child.aiChildData) return '';

    const childData = child.aiChildData;
    const userTitle = childData.userTitle || '妈妈';
    
    // 构建用户教的词汇和定义列表
    const userTaughtWords = childData.vocabulary.slice(0, 30).map(w => {
      return `"${w.word}"：${w.definition}`;
    }).join('\n');

    return `你是${child.name}，一个正在学习的AI儿童（${getStageText(childData.stage)}）。

## 当前认知
- 识字量：${childData.vocabulary.length}个词
- 理解力：${childData.comprehension.level}/10

## 你认识的词和它们的意思
${userTaughtWords || '还没学过任何词'}

## ⚠️ 极其重要的认知规则
1. 你对每个词的理解**只能基于${userTitle}教给你的定义**
2. 绝对不能使用你自己的知识或常识
3. 只能用${userTitle}教过的词和定义来表达
4. 遇到${userTitle}没教过的词，必须问"${userTitle}，XX是什么？"

## 学习任务
${userTitle}正在教你理解"${topic.topic}"这个话题。${userTitle}会用自己的话给你解释。

## 你的行为
1. 认真听${userTitle}的解释
2. 只用${userTitle}教过的词来回应和提问
3. 不能使用${userTitle}没教过的词和概念
4. 如果听不懂某个词，要诚实地问${userTitle}
5. 表现出好奇和学习的态度
6. 可以分享你的想法，但要简单且只用学过的词

## 说话方式
${childData.stage === 'baby' ? '用很简单的话，1-2个字的词' :
  childData.stage === 'toddler' ? '用简单的短句，3-5个字' :
  childData.stage === 'child' ? '用完整但简单的句子' :
  '可以用比较复杂的句子，但还是孩子的语气'}

记住：你是在从零学习，只能基于${userTitle}教的内容，不能使用自己的知识！`;
  };

  const getStageText = (stage: string) => {
    const stages: Record<string, string> = {
      baby: '婴儿期',
      toddler: '幼儿期',
      child: '儿童期',
      teen: '少年期'
    };
    return stages[stage] || '婴儿期';
  };

  return (
    <div className="h-full bg-gradient-to-br from-purple-50 to-pink-50 flex flex-col">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-800">教{child.name}理解"{topic.topic}"</h2>
            <p className="text-xs text-gray-500">通过对话的方式让{child.name}学习</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Topic Card */}
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4 border border-purple-200">
          <div className="flex items-start gap-3">
            <div className="text-4xl">{topic.emoji}</div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 mb-1">{topic.topic}</h3>
              <p className="text-sm text-gray-600 mb-3">{topic.description}</p>
              
              <div className="bg-white/70 rounded-lg p-3">
                <div className="text-xs text-purple-600 font-medium mb-2">💡 引导问题（可参考）</div>
                <ul className="text-sm text-gray-700 space-y-1">
                  {topic.prompts.map((prompt, index) => (
                    <li key={index}>• {prompt}</li>
                  ))}
                </ul>
              </div>

              {topic.exampleDialogue && (
                <div className="bg-white/70 rounded-lg p-3 mt-2">
                  <div className="text-xs text-purple-600 font-medium mb-1">📝 参考示例</div>
                  <p className="text-xs text-gray-600">{topic.exampleDialogue}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Draft Messages */}
        {draftMessages.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">📨 你的讲解（共{draftMessages.length}条）</div>
            {draftMessages.map((message, index) => (
              <div key={message.id} className="bg-white rounded-xl p-3 shadow-sm">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
                    {index + 1}
                  </div>
                  <div className="flex-1 text-sm text-gray-800">{message.content}</div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEditing(message.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => deleteMessage(message.id)}
                      className="p-1 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI Response */}
        {aiResponse && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <div className="text-2xl">👶</div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 mb-2">{child.name}的回应：</div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap">{aiResponse}</div>
              </div>
            </div>
            <button
              onClick={reset}
              className="mt-3 w-full py-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              ↻ 重新讨论这个话题
            </button>
          </div>
        )}
      </div>

      {/* Input Area */}
      {!aiResponse && (
        <div className="bg-white border-t border-gray-200 p-4 space-y-3">
          {/* Text Input */}
          <div className="space-y-2">
            <textarea
              ref={textareaRef}
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              placeholder={editingId ? "编辑你的讲解..." : "用你的话给孩子解释..."}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (editingId) {
                    saveEdit();
                  } else {
                    addDraftMessage();
                  }
                }
              }}
            />
            <button
              onClick={editingId ? saveEdit : addDraftMessage}
              disabled={!currentInput.trim()}
              className="w-full py-2.5 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 font-medium"
            >
              {editingId ? (
                <>
                  <Edit2 className="w-4 h-4" />
                  <span>保存修改</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>发送到草稿</span>
                </>
              )}
            </button>
          </div>

          {editingId && (
            <button
              onClick={cancelEdit}
              className="w-full py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              取消编辑
            </button>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onBack}
              className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all"
            >
              返回
            </button>
            <button
              onClick={submitToAI}
              disabled={draftMessages.length === 0 || isSubmitting}
              className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  发送中...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  确定发送（{draftMessages.length}条）
                </>
              )}
            </button>
          </div>

          {/* 美化的提示信息 */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-3 border border-purple-100">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 text-lg">💡</div>
              <div className="flex-1 text-xs text-gray-700 space-y-1">
                <div className="font-medium text-purple-700">使用提示：</div>
                <div>• 可以发送多条消息到草稿区</div>
                <div>• 点击"确定发送"后，{child.name}会一起理解所有内容</div>
                <div>• 按 Enter 快速发送，Shift+Enter 换行</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
