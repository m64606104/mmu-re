/**
 * 🎓 AI儿童独立对话组件
 * 实现限制词汇的对话系统
 */

import { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft } from 'lucide-react';
import { Conversation, Message, ApiConfig } from '../types';
import { getAIChild } from '../utils/aiKindergartenManager';
import { smartLoad, smartSave } from '../utils/storage';

interface AIChildChatProps {
  childId: string;
  onBack: () => void;
  apiConfig: ApiConfig;
}

export default function AIChildChat({ childId, onBack, apiConfig }: AIChildChatProps) {
  const [child, setChild] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChild();
  }, [childId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChild = async () => {
    const childData = await getAIChild(childId);
    if (childData) {
      setChild(childData);
      // 加载对话历史
      setMessages(childData.messages || []);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !child || !child.aiChildData || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: inputText.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // 构建AI回复请求
      const systemPrompt = buildChildSystemPrompt(child);
      const conversationHistory = [...messages, userMessage].slice(-10); // 最近10条

      const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: apiConfig.modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory.map(msg => ({
              role: msg.role === 'user' ? 'user' : 'assistant',
              content: msg.content
            }))
          ],
          temperature: 0.8,
          max_tokens: 200
        })
      });

      if (!response.ok) throw new Error('AI回复失败');

      const data = await response.json();
      const aiReply = data.choices[0]?.message?.content || '...(没听懂)';

      const aiMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: aiReply,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, aiMessage]);

      // 检测AI是否在提问（自动记录）
      if (aiReply.includes('？') || aiReply.includes('是什么')) {
        // 这是AI的提问，可以记录
        console.log('🤔 AI提问:', aiReply);
      }

      // 保存对话历史
      await saveMessages([...messages, userMessage, aiMessage]);

    } catch (error) {
      console.error('AI对话失败:', error);
      const errorMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: '...(宝宝有点累了)',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveMessages = async (newMessages: Message[]) => {
    try {
      const conversations = await smartLoad('conversations') as Conversation[] || [];
      const index = conversations.findIndex(c => c.id === childId);
      if (index !== -1) {
        conversations[index].messages = newMessages;
        await smartSave('conversations', conversations);
      }
    } catch (error) {
      console.error('保存对话失败:', error);
    }
  };

  const buildChildSystemPrompt = (child: Conversation): string => {
    if (!child.aiChildData) return '';

    const childData = child.aiChildData;
    const knownWords = childData.vocabulary.map(w => w.word).join('、');
    const stage = getStageDescription(childData.stage);

    return `你是一个${stage}的孩子，名字叫${child.name}。

## 🎯 核心规则（非常重要！）
1. **你只认识这些词**：${knownWords || '还没学会任何词'}
2. **说话要像${stage}**：简单、天真、好奇
3. **遇到不认识的词或概念，必须问"妈妈"**
4. **用你学过的词来表达**

## 📊 你的当前状态
- 成长阶段：${stage}（${childData.age}天大）
- 识字量：${childData.vocabulary.length}个词
- 理解力：${childData.comprehension.level}/10
- 性格：${childData.personality.join('、')}

## 💭 对话示例
如果你只学过"妈妈、苹果、红色、好吃"这些词：
- ✅ 正确："妈妈，苹果好好吃！"
- ✅ 正确："这个红色的是什么？"
- ❌ 错误：不要说"这个水果的营养价值很高"（太复杂）
- ✅ 提问："妈妈，'营养'是什么意思？"

## 🎭 表现要求
- 婴儿期：只会发音"啊啊"、"妈妈"，简单词汇
- 幼儿期：能说简单句子，好奇心强
- 儿童期：能表达想法，主动提问
- 少年期：能深度对话，有自己观点

记住：你是真的在成长学习，不要假装什么都懂！`;
  };

  const getStageDescription = (stage: string): string => {
    const descriptions: Record<string, string> = {
      baby: '刚学说话的婴儿',
      toddler: '幼儿',
      child: '儿童',
      teen: '少年'
    };
    return descriptions[stage] || '婴儿';
  };

  if (!child || !child.aiChildData) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="font-semibold text-gray-800">和{child.name}聊天</h2>
          <p className="text-xs text-gray-500">
            识字{child.aiChildData.vocabulary.length}个 · {getStageDescription(child.aiChildData.stage)}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">👶</div>
            <p className="text-gray-500 text-sm">
              {child.aiChildData.vocabulary.length === 0 
                ? `${child.name}还不会说话，先教Ta认字吧～` 
                : `和${child.name}开始聊天吧！`}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-800 shadow-sm'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-4 py-2 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={
              child.aiChildData.vocabulary.length === 0 
                ? '先教宝宝认字吧～' 
                : `和${child.name}说话...`
            }
            disabled={child.aiChildData.vocabulary.length === 0}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={sendMessage}
            disabled={!inputText.trim() || isLoading || child.aiChildData.vocabulary.length === 0}
            className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        {child.aiChildData.vocabulary.length === 0 && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            💡 提示：先在教学页面教{child.name}认字，才能聊天哦
          </p>
        )}
      </div>
    </div>
  );
}
