/**
 * 🎓 AI儿童独立对话组件
 * 实现限制词汇的对话系统
 */

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { Conversation, Message, ApiConfig } from '../types';
import { smartLoad, smartSave } from '../utils/storage';
import { recordWordLearning } from '../utils/aiMemorySystem';
import { getAIChild } from '../utils/aiKindergartenManager';

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
  const [pendingMessage, setPendingMessage] = useState<string>(''); // 待确认的消息
  const [isEditingPending, setIsEditingPending] = useState(false); // 是否在编辑待确认消息
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

  // 第1步：点击发送，显示为待确认消息
  const handleSend = () => {
    if (!inputText.trim() || pendingMessage) return;
    setPendingMessage(inputText.trim());
    setInputText('');
  };

  // 编辑待确认消息
  const handleEditPending = () => {
    setIsEditingPending(true);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditingPending(false);
  };

  // 保存编辑
  const handleSaveEdit = () => {
    setIsEditingPending(false);
  };

  // 取消发送
  const handleCancelSend = () => {
    setPendingMessage('');
    setIsEditingPending(false);
  };

  // 第2步：确认发送，调用AI回复
  const confirmSend = async () => {
    if (!pendingMessage || !child || !child.aiChildData || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: pendingMessage,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setPendingMessage('');
    setIsEditingPending(false);
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

      // 检测AI是否在提问（自动学习机会）
      const aiAskedAbout = detectAIQuestion(aiReply);
      if (aiAskedAbout) {
        console.log('🤔 AI提问关于:', aiAskedAbout);
        // 标记最后一个问题，等待用户回答
        sessionStorage.setItem('lastAIQuestion', JSON.stringify({
          word: aiAskedAbout,
          timestamp: Date.now()
        }));
      }

      // 检测用户是否在教新词（聊天中学习）
      await detectAndLearnFromChat(inputText.trim(), messages);

      // 保存对话历史
      await saveMessages([...messages, userMessage, aiMessage]);

    } catch (error: any) {
      console.error('AI对话失败:', error);
      console.error('API配置:', {
        baseUrl: apiConfig.baseUrl,
        model: apiConfig.modelName,
        hasApiKey: !!apiConfig.apiKey
      });
      
      // 更友好的错误提示
      let errorMsg = '抱歉，我有点累了...';
      if (error.message?.includes('fetch')) {
        errorMsg = '网络连接似乎有问题，请检查网络后重试';
      } else if (error.message?.includes('401') || error.message?.includes('403')) {
        errorMsg = 'API密钥可能有问题，请检查设置';
      } else if (error.message?.includes('429')) {
        errorMsg = 'API调用太频繁了，请稍后再试';
      }
      
      const errorMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: errorMsg,
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

  // 检测AI是否在提问某个词
  const detectAIQuestion = (aiReply: string): string | null => {
    // 匹配模式："XX是什么？" "什么是XX？" "XX...是什么？"
    const patterns = [
      /「?([^，。！？\s]{1,6})」?是什么[？?]/,
      /什么是「?([^，。！？\s]{1,6})」?[？?]/,
      /([^，。！？\s]{1,6})\.\.\.是什么/,
      /不懂「?([^，。！？\s]{1,6})」?/
    ];

    for (const pattern of patterns) {
      const match = aiReply.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  // 检测用户是否在教新词并自动学习
  const detectAndLearnFromChat = async (userInput: string, _messageHistory: Message[]) => {
    if (!child || !child.aiChildData) return;

    // 检查是否是在回答AI的问题
    const lastQuestion = sessionStorage.getItem('lastAIQuestion');
    if (lastQuestion) {
      try {
        const { word, timestamp } = JSON.parse(lastQuestion);
        const timeElapsed = Date.now() - timestamp;
        
        // 5分钟内的问题才算
        if (timeElapsed < 5 * 60 * 1000) {
          // 检查用户的回复是否包含解释性内容
          const isTeaching = userInput.includes('就是') || 
                           userInput.includes('意思是') || 
                           userInput.includes('是指') ||
                           userInput.includes('表示') ||
                           userInput.length > 10; // 较长的回复可能是解释

          if (isTeaching) {
            // 检查AI是否已经认识这个词
            const alreadyKnows = child.aiChildData.vocabulary.some(w => w.word === word);
            
            if (!alreadyKnows) {
              // 自动学习这个词（保存用户教的定义）
              const { teachWord } = await import('../utils/aiKindergartenManager');
              const result = await teachWord(childId, word, userInput, []);
              
              if (result.success) {
                console.log(`✨ 从对话中学会了"${word}"!`);
                
                // 保存到AI记忆库（后台）
                await recordWordLearning(
                  childId,
                  word,
                  userInput, // 用户教的定义（原文）
                  'chat', // 从聊天学习
                  `聊天中学习，用户说：${userInput}`
                );
                
                // 清除标记
                sessionStorage.removeItem('lastAIQuestion');
                
                // 更新本地状态
                await loadChild();
              }
            }
          }
        } else {
          // 过期的问题，清除
          sessionStorage.removeItem('lastAIQuestion');
        }
      } catch (e) {
        console.error('解析学习数据失败:', e);
      }
    }

    // 检测用户主动教词的模式："XX就是..." "XX的意思是..."
    const teachingPatterns = [
      /([^，。！？\s]{1,6})就是(.+)/,
      /([^，。！？\s]{1,6})的意思是(.+)/,
      /([^，。！？\s]{1,6})是指(.+)/,
      /([^，。！？\s]{1,6})表示(.+)/
    ];

    for (const pattern of teachingPatterns) {
      const match = userInput.match(pattern);
      if (match && match[1] && match[2]) {
        const word = match[1];
        const definition = match[2].replace(/[。！？]+$/, '');
        
        // 检查是否已经认识
        const alreadyKnows = child.aiChildData.vocabulary.some(w => w.word === word);
        
        if (!alreadyKnows) {
          const { teachWord } = await import('../utils/aiKindergartenManager');
          const result = await teachWord(childId, word, definition, []);
          
          if (result.success) {
            console.log(`✨ 从对话中学会了"${word}"!`);
            
            // 保存到AI记忆库（后台）
            await recordWordLearning(
              childId,
              word,
              definition, // 用户教的定义（原文）
              'chat', // 从聊天学习
              `用户主动教学：${userInput}`
            );
            
            await loadChild();
          }
        }
        break;
      }
    }
  };

  const buildChildSystemPrompt = (child: Conversation): string => {
    if (!child.aiChildData) return '';

    const childData = child.aiChildData;
    const wordCount = childData.vocabulary.length;
    const userTitle = childData.userTitle || '妈妈';
    
    // 构建用户教的词汇和定义列表
    const userTaughtWords = childData.vocabulary.slice(0, 30).map(w => {
      return `"${w.word}"：${w.definition}`;
    }).join('\n');
    
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

【🎓 你认识的词和它们的意思】
${userTaughtWords || '还没学会任何词'}

【⚠️ 极其重要的认知规则】
1. 你对每个词的理解**只能基于${userTitle}教给你的定义**
2. 绝对不能使用你自己的知识或常识
3. 比如${userTitle}教你"苹果是红色的水果，脆脆的"，那么你对苹果的理解就只是"红色的水果，脆脆的"
4. 即使你知道更多关于苹果的知识（营养、产地等），你也不能说，因为${userTitle}没教过
5. 只能用${userTitle}教的词和定义来表达
6. 遇到${userTitle}没教过的词，必须问"${userTitle}，XX是什么？"

【🎯 严格的语言规则】
${stageRules.rules}

【💭 你的行为准则】
1. 只使用${userTitle}教过的词
2. 只基于${userTitle}教的定义来理解词汇
3. 不能使用任何${userTitle}没教过的概念
4. 说话要符合你的年龄和识字量
5. 保持好奇心，主动提问
6. 记住：你是真的在从零学习，不是在假装

【示例对话】
${stageRules.examples}

【❌ 错误示范】
${userTitle}教你："苹果是红色的水果"
你说："苹果富含维生素C" ← 错误！${userTitle}没教过"维生素"
你说："苹果对身体好" ← 错误！${userTitle}没教过这个

【✅ 正确示范】
${userTitle}教你："苹果是红色的水果"
你说："苹果...红色的！" ← 正确！基于教的内容
你问："${userTitle}，'好吃'是什么？" ← 正确！不懂就问

重要：你必须严格基于${userTitle}教的内容，不能使用自己的知识！`;
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
            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {/* AI头像 */}
            {msg.role === 'assistant' && (
              <div className="flex-shrink-0">
                {child.aiChildData?.avatar ? (
                  <img
                    src={child.aiChildData.avatar}
                    alt={child.name}
                    className="w-8 h-8 rounded-full object-cover border-2 border-purple-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-lg">
                    {child.aiChildData?.gender === 'male' ? '👦' : child.aiChildData?.gender === 'female' ? '👧' : '🧒'}
                  </div>
                )}
              </div>
            )}
            
            {/* 消息气泡 */}
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-800 shadow-md border border-gray-100'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}

        {/* 待确认消息 */}
        {pendingMessage && (
          <div className="flex justify-end">
            <div className="max-w-[70%]">
              {isEditingPending ? (
                <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-3">
                  <textarea
                    value={pendingMessage}
                    onChange={(e) => setPendingMessage(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                    >
                      保存
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 py-1.5 bg-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-400"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-500 text-white rounded-2xl px-4 py-2 relative">
                  <p className="text-sm whitespace-pre-wrap pr-8">{pendingMessage}</p>
                  <div className="absolute top-1 right-1 bg-yellow-400 text-xs px-2 py-0.5 rounded-full text-gray-800">
                    待确认
                  </div>
                  <div className="flex gap-2 mt-3 pt-2 border-t border-blue-400">
                    <button
                      onClick={handleEditPending}
                      className="flex-1 py-1.5 bg-blue-400 text-white rounded-lg text-xs hover:bg-blue-300"
                    >
                      ✏️ 编辑
                    </button>
                    <button
                      onClick={confirmSend}
                      disabled={isLoading}
                      className="flex-1 py-1.5 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600 disabled:opacity-50"
                    >
                      ✅ 确认发送
                    </button>
                    <button
                      onClick={handleCancelSend}
                      className="flex-1 py-1.5 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600"
                    >
                      ✖️ 取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
        {pendingMessage ? (
          <div className="text-center py-2 text-sm text-gray-500">
            👆 请先确认发送上面的消息
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={
                  child.aiChildData.vocabulary.length === 0 
                    ? '先教宝宝认字吧～' 
                    : `和${child.name}说话...`
                }
                disabled={child.aiChildData.vocabulary.length === 0 || isLoading}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSend}
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
          </>
        )}
      </div>
    </div>
  );
}
