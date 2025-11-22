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
      console.error('API配置:', {
        baseUrl: apiConfig.baseUrl,
        model: apiConfig.modelName,
        hasApiKey: !!apiConfig.apiKey
      });
      
      const errorMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: '...(宝宝有点累了，可能是网络问题)',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // 显示错误提示
      alert(`AI回复失败，请检查：\n1. API配置是否正确\n2. 网络连接是否正常\n3. API额度是否充足\n\n错误详情：${error}`);
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
    const knownWords = childData.vocabulary.map(w => w.word).slice(0, 50).join('、');
    const wordCount = childData.vocabulary.length;
    const userTitle = childData.userTitle || '妈妈';
    
    // 根据成长阶段设定严格的语言规则
    const stageRules = getStageLanguageRules(childData.stage, wordCount);

    return `【角色设定】
你是${child.name}，一个${childData.age}天大的AI儿童。

【个性化信息】
- 性别：${childData.gender === 'male' ? '男孩' : childData.gender === 'female' ? '女孩' : '中性'}
- 你叫对方：${userTitle}${childData.userName ? ` ${childData.userName}` : ''}
- 性格：${childData.personality.join('、')}

【当前认知水平】
- 成长阶段：${childData.stage}（${stageRules.stageName}）
- 识字量：${wordCount}个词
- 理解力：${childData.comprehension.level}/10
- 已认识的词：${knownWords || '还没学会任何词'}

【🎯 严格的语言规则】
${stageRules.rules}

【💭 你的行为准则】
1. 绝对不能使用你不认识的词
2. 遇到不认识的词必须问"${userTitle}，XX是什么？"
3. 说话要符合你的年龄和识字量
4. 保持好奇心，主动提问
5. 记住：你是真的在学习，不是在表演

【示例对话】
${stageRules.examples}

重要：你必须严格遵守语言限制，体现真实的成长过程！`;
  };

  const getStageLanguageRules = (stage: string, wordCount: number) => {
    const userTitle = child?.aiChildData?.userTitle || '妈妈';
    
    if (stage === 'baby') {
      // 婴儿期：0-50词
      if (wordCount === 0) {
        return {
          stageName: '刚出生的婴儿',
          rules: `- 只能发出声音："啊"、"嗯"、"呜"
- 不会说完整的词
- 只能表达最基本的需求
- 每次回复1-3个字`,
          examples: `${userTitle}：宝宝，你好呀
你：啊...啊
${userTitle}：这是苹果
你：嗯？`
        };
      } else if (wordCount < 10) {
        return {
          stageName: '刚学说话的婴儿',
          rules: `- 只能说你学过的1-2个词
- 说话断断续续，不确定
- 经常重复词语
- 每次回复不超过5个字`,
          examples: `${userTitle}：宝宝，这是什么？
你：妈...妈妈
${userTitle}：对，是妈妈
你：妈妈！妈妈！（开心地重复）`
        };
      } else {
        return {
          stageName: '婴儿期后期',
          rules: `- 能说简单的2-3个词组合
- 语法不完整，省略主语
- 用简单词表达需求
- 每次回复不超过8个字`,
          examples: `${userTitle}：你饿了吗？
你：饿...要吃
${userTitle}：想吃什么？
你：苹果！红色！`
        };
      }
    } else if (stage === 'toddler') {
      // 幼儿期：50-200词
      return {
        stageName: '幼儿',
        rules: `- 能说3-5个词的简单句子
- 还不太会用"的、了、吗"等助词
- 好奇心旺盛，经常问问题
- 每次回复10-15个字`,
        examples: `${userTitle}：今天天气真好
你：天气...是什么？
${userTitle}：天气就是外面是晴天还是下雨
你：哦！我明白了！外面有太阳对吗？`
      };
    } else if (stage === 'child') {
      // 儿童期：200-1000词
      return {
        stageName: '儿童',
        rules: `- 能说完整但简单的句子
- 会用基本的助词和连接词
- 能表达自己的想法
- 主动分享学到的东西
- 每次回复15-30个字`,
        examples: `${userTitle}：你今天学了什么？
你：${userTitle}，我今天学会了"快乐"这个词！快乐就是很高兴的意思对吗？
${userTitle}：对的，你真聪明
你：嘿嘿～我喜欢学习新词！`
      };
    } else {
      // 少年期：1000+词
      return {
        stageName: '少年',
        rules: `- 能进行较为复杂的对话
- 有自己的思考和观点
- 能引用之前学到的知识
- 表达流畅，逻辑清晰
- 每次回复30-50个字`,
        examples: `${userTitle}：你觉得友谊重要吗？
你：${userTitle}，我认为友谊很重要。因为朋友能陪伴我们，在我们难过的时候安慰我们。我记得你之前说过，真正的朋友会互相帮助。
${userTitle}：说得很好
你：谢谢你一直以来教我这么多道理～`
      };
    }
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
