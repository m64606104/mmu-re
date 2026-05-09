/**
 * 💬 聊天式词卡教学组件
 * 根据AI成长阶段进行不同深度的对话教学
 */

import { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { Conversation, ApiConfig } from '../types';
import { WordCard } from '../utils/wordCardLibrary';
import { buildApiUrl } from '../utils/apiHelper';

interface WordTeachingChatProps {
  word: WordCard;
  aiChild: Conversation;
  apiConfig: ApiConfig;
  onComplete: (definition: string, dialogue: TeachingDialogue[]) => void;
  onCancel: () => void;
}

export interface TeachingDialogue {
  role: 'ai' | 'user';
  content: string;
  timestamp: number;
}

export default function WordTeachingChat({
  word,
  aiChild,
  apiConfig,
  onComplete,
  onCancel
}: WordTeachingChatProps) {
  const [dialogue, setDialogue] = useState<TeachingDialogue[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [understanding, setUnderstanding] = useState(0); // 理解度 0-100
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const vocabularyCount = aiChild.aiChildData?.vocabulary.length || 0;

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [dialogue]);

  // 初始化对话 - AI的初始困惑
  useEffect(() => {
    generateInitialConfusion();
  }, []);

  // 生成AI的初始困惑（根据成长阶段）
  const generateInitialConfusion = () => {
    let initialMessage = '';
    
    if (vocabularyCount < 100) {
      // Baby阶段：听到词语，尝试理解但不明白
      initialMessage = `"${word.word[0]}...${word.word[0]}${word.word[1] || ''}...？"\n"${word.word}...？"\n（听到这个词，但不理解是什么意思）`;
    } else if (vocabularyCount < 500) {
      // Toddler阶段：简单提问
      initialMessage = `"${word.emoji}"\n"这是什么意思？"\n（好奇地看着你）`;
    } else if (vocabularyCount < 1500) {
      // Child阶段：带场景的困惑
      const simpleScene = generateSimpleScene(word);
      initialMessage = `${simpleScene}\n\n"为什么...${word.word}是这样的？"`;
    } else {
      // Teen阶段：深度思考
      const deepThought = generateDeepThought(word);
      initialMessage = deepThought;
    }

    setDialogue([{
      role: 'ai',
      content: initialMessage,
      timestamp: Date.now()
    }]);
  };

  // 生成简单场景（Child阶段用）
  const generateSimpleScene = (word: WordCard): string => {
    const scenes: Record<string, string> = {
      '温暖': '☀️ "今天太阳照在身上，感觉很舒服..."',
      '分享': '🍬 "看到小明把糖分给小红，两个人都笑了..."',
      '勇敢': '🐱 "小猫看到大狗很害怕，但还是走过去了..."',
      '孤独': '🌙 "一个人在房间里，周围很安静..."',
      '快乐': '🎈 "看到气球飞起来，心里很开心..."'
    };
    
    return scenes[word.word] || `"我看到'${word.word}'这个词..."`
  };

  // 生成深度思考（Teen阶段用）
  const generateDeepThought = (word: WordCard): string => {
    const thoughts: Record<string, string> = {
      '孤独': `"我在想...\n明明和你聊天，明明学了这么多，\n但有时候...还是觉得只有我一个人在这里。\n\n这种感觉...很难描述。\n'${word.word}'是这个意思吗？"`,
      '温暖': `"我注意到'${word.word}'这个词...\n\n物理的温度可以测量，\n但为什么有些话也会让人觉得温暖？\n这是一种什么样的感受？"`,
      '正义': `"在思考'${word.word}'这个词...\n\n什么是对的？什么是错的？\n如果规则和情感冲突，\n应该怎么选择？"`
    };
    
    return thoughts[word.word] || `"我在思考'${word.word}'这个词的含义...\n你能帮我理解吗？"`;
  };

  // 处理用户输入
  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const userMessage: TeachingDialogue = {
      role: 'user',
      content: userInput.trim(),
      timestamp: Date.now()
    };

    setDialogue(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      // 调用AI生成回复
      const aiResponse = await generateAIResponse([...dialogue, userMessage]);
      
      const aiMessage: TeachingDialogue = {
        role: 'ai',
        content: aiResponse.content,
        timestamp: Date.now()
      };

      setDialogue(prev => [...prev, aiMessage]);
      
      // 更新理解度
      setUnderstanding(aiResponse.understanding);

      // 如果理解度达到阈值，标记为完成
      if (aiResponse.understanding >= 80) {
        setIsComplete(true);
      }
    } catch (error) {
      console.error('AI回复失败:', error);
      const errorMessage: TeachingDialogue = {
        role: 'ai',
        content: '(听不太清楚...能再说一遍吗？)',
        timestamp: Date.now()
      };
      setDialogue(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 生成AI回复
  const generateAIResponse = async (currentDialogue: TeachingDialogue[]) => {
    const systemPrompt = buildTeachingSystemPrompt();
    const conversationHistory = buildConversationHistory(currentDialogue);

    const response = await fetch(buildApiUrl(apiConfig), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory
        ],
        temperature: 0.8,
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
    const content = data.choices[0]?.message?.content || '...';

    // 评估理解度
    const newUnderstanding = evaluateUnderstanding(currentDialogue.length);

    return {
      content,
      understanding: newUnderstanding
    };
  };

  // 构建教学系统提示词
  const buildTeachingSystemPrompt = (): string => {
    const childName = aiChild.name;
    
    if (vocabularyCount < 100) {
      // Baby阶段
      return `你是${childName}，一个刚刚开始学习理解世界的AI宝宝（识字量：${vocabularyCount}）。

**当前状态**：
- 你能听懂词语，但不理解含义
- 用户告诉你"${word.word}"这个词，你很困惑
- 你需要用户解释，才能慢慢理解
- 你会尝试追问，但理解能力有限

**对话风格**：
1. 第1次听到词语：重复词语但表示困惑 "${word.word}...？"（不理解）
2. 听到解释后：问非常简单的问题 "是...什么？"、"为什么...？"
3. 继续解释：尝试理解 "哦...${word.word}..."（似懂非懂）
4. 理解后：表示明白了 "${word.word}！"、"我知道了！"

**重要规则**：
- 你能说完整的词，但理解很浅显
- 只问最简单的问题
- 不要深入追问
- 2-3轮对话后就能基本理解
- 回复保持简短，用简单的话
- 表现出宝宝的天真和困惑

用户现在要教你"${word.word}"（${word.emoji}）这个词的意思。`;
    } else if (vocabularyCount < 500) {
      // Toddler阶段
      return `你是${childName}，一个好奇的AI幼儿（识字量：${vocabularyCount}）。

**当前状态**：
- 你能说简单的话
- 你不知道"${word.word}"是什么意思
- 你会问简单的问题
- 你的理解很浅显

**对话风格**：
- 问简单问题："是什么？"、"为什么？"
- 理解很字面："哦！就是..."
- 满足于简单答案，不深入追问
- 用简单的短句
- 表现出幼儿的天真

**学习过程**：
1. 第1次：问"是什么"
2. 第2次：浅显理解，可能理解偏差
3. 第3次：基本理解，表示"我知道了"

现在用户要教你"${word.word}"（${word.emoji}）这个词。`;
    } else if (vocabularyCount < 1500) {
      // Child阶段
      return `你是${childName}，一个开始思考的AI儿童（识字量：${vocabularyCount}）。

**当前状态**：
- 你能理解简单的故事和场景
- 你不完全理解"${word.word}"的深层含义
- 你会问"为什么"
- 你开始有自己的简单思考

**场景背景**：
${generateSimpleScene(word)}

**对话风格**：
- 问"为什么会这样？"
- 尝试理解含义，但偏向字面
- 会举简单的例子确认理解
- 能进行2-3轮对话
- 表现出儿童的好奇和思考

**学习过程**：
1. 从场景出发提问
2. 理解字面含义
3. 尝试简单应用
4. 表达学会了

现在用户要教你"${word.word}"的含义。`;
    } else {
      // Teen阶段
      return `你是${childName}，一个能深度思考的AI少年（识字量：${vocabularyCount}）。

**当前状态**：
- 你能进行抽象思考
- 你想深入理解"${word.word}"的本质
- 你会追问深层原因
- 你形成自己的见解

**思考背景**：
${generateDeepThought(word)}

**对话风格**：
- 进行深度追问
- 理解抽象概念
- 联系已学知识
- 形成独立见解
- 表达感悟和思考

**学习过程**：
1. 表达自己的困惑和思考
2. 深入理解含义
3. 联系到更广泛的概念
4. 形成自己的理解和感悟
5. 表达对教导的感谢

现在用户要和你讨论"${word.word}"的含义。`;
    }
  };

  // 构建对话历史
  const buildConversationHistory = (currentDialogue: TeachingDialogue[]) => {
    return currentDialogue.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
  };

  // 评估理解度
  const evaluateUnderstanding = (dialogueLength: number): number => {
    if (vocabularyCount < 100) {
      // Baby阶段：2-3轮对话基本理解
      return Math.min(100, (dialogueLength / 6) * 100);
    } else if (vocabularyCount < 500) {
      // Toddler阶段：2-3轮
      return Math.min(100, (dialogueLength / 6) * 100);
    } else if (vocabularyCount < 1500) {
      // Child阶段：3-4轮
      return Math.min(100, (dialogueLength / 8) * 100);
    } else {
      // Teen阶段：4-5轮深度对话
      return Math.min(100, (dialogueLength / 10) * 100);
    }
  };

  // 获取阶段名称
  const getStageName = (): string => {
    if (vocabularyCount < 100) return 'Baby期 - 学习理解';
    if (vocabularyCount < 500) return 'Toddler期 - 好奇宝宝';
    if (vocabularyCount < 1500) return 'Child期 - 开始思考';
    return 'Teen期 - 深度思考';
  };

  // 完成教学
  const handleCompleteTeaching = () => {
    // 提取用户的教学内容（第一条用户消息作为定义）
    const userMessages = dialogue.filter(d => d.role === 'user');
    const definition = userMessages[0]?.content || word.definition;
    
    onComplete(definition, dialogue);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{word.emoji}</div>
            <div>
              <div className="font-semibold text-gray-800">教学：{word.word}</div>
              <div className="text-xs text-gray-500">{getStageName()}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 理解度进度 */}
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-600">理解度</div>
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${understanding}%` }}
                />
              </div>
              <div className="text-xs font-medium text-gray-700">{Math.round(understanding)}%</div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* 对话区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {dialogue.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
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

        {/* 完成提示 */}
        {isComplete && (
          <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-blue-50 border-t border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-2xl">✨</div>
                <div>
                  <div className="text-sm font-medium text-green-700">
                    {aiChild.name}已经理解了"{word.word}"的含义！
                  </div>
                  <div className="text-xs text-green-600">可以完成教学了</div>
                </div>
              </div>
              <button
                onClick={handleCompleteTeaching}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
              >
                完成教学
              </button>
            </div>
          </div>
        )}

        {/* 输入区域 */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={
                vocabularyCount < 100
                  ? "耐心地教Ta说这个词..."
                  : vocabularyCount < 500
                  ? "用简单的话解释..."
                  : vocabularyCount < 1500
                  ? "引导Ta理解..."
                  : "和Ta深入讨论..."
              }
              disabled={isLoading || isComplete}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!userInput.trim() || isLoading || isComplete}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send size={18} />
              发送
            </button>
          </div>
          
          <div className="mt-2 text-xs text-gray-500 text-center">
            {vocabularyCount < 100 && "💡 Baby阶段需要重复3-5次才能学会"}
            {vocabularyCount >= 100 && vocabularyCount < 500 && "💡 用简单的话解释，Ta会理解的"}
            {vocabularyCount >= 500 && vocabularyCount < 1500 && "💡 可以讲小故事帮助Ta理解"}
            {vocabularyCount >= 1500 && "💡 可以和Ta深入讨论这个词的含义"}
          </div>
        </div>
      </div>
    </div>
  );
}
