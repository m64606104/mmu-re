import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Send, Mic, Sparkles, Smile, BellOff, Bell, Pause, Play, Image as ImageIcon, Video, Phone, MapPin, FileText, Plus, CreditCard } from 'lucide-react';
import { Conversation, Message, ApiConfig, UserProfile } from '../types';
import MoneyTransferModal from './MoneyTransferModal';
import SendDocumentModal from './SendDocumentModal';
import DocumentViewModal from './DocumentViewModal';
import DocumentLibraryModal from './DocumentLibraryModal';
import DocumentCard from './DocumentCard';
import XiaohongshuView from './XiaohongshuView';
import SelectContactModal from './SelectContactModal';
import { SavedDocument } from '../utils/documentLibrary';
import { sendMoney, receiveMoney, getBalance, aiPayForUser, refundGift, getAIBalance, addAITransaction } from '../utils/wallet';
import ActivityLogModal from './ActivityLogModal';
import { 
  getConversationMemories, 
  applyMemoriesToContext,
  shouldTriggerAutoSummary,
  buildMemorySummaryPrompt,
  parseMemorySummaryResponse,
  addMemory,
  updateSummaryCounter,
  getMemoryBank
} from '../utils/memorySystem';
// import { detectMemes } from '../utils/memeSystem'; // 已删除热梗系统
import { buildTimeAwarePrompt } from '../utils/timeAwareness';
import { getMomentsData } from '../utils/aiMomentsGenerator';
import { getAIStatus, analyzeAndUpdateStatusFromAI } from '../utils/aiStatusManager';
import { getErrorFromResponse, formatErrorMessage } from '../utils/apiErrorHandler';
// @ts-ignore - 函数在backgroundTaskManager内部使用，TS静态分析无法识别
import { splitMessages, cleanAIMessage } from '../utils/messageFormatter';
// import { backgroundTaskManager } from '../utils/backgroundTaskManager';
// 直接在这里定义一个简化版的backgroundTaskManager作为替代
const backgroundTaskManager = {
  createGenerationTask: async (
    conversation: Conversation, 
    apiConfig: ApiConfig, 
    requestBody: any, 
    callback: (messages: Message[], conversationId: string, error?: string) => void
  ) => {
    console.log('🚀 创建生成任务...');
    try {
      const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorInfo = await getErrorFromResponse(response);
        throw new Error(formatErrorMessage(errorInfo));
      }

      const data = await response.json();
      
      // 🔥 先检查API返回格式是否正常
      if (!data.choices || data.choices.length === 0) {
        throw new Error('API返回格式错误：choices为空');
      }
      
      if (data.error) {
        throw new Error(data.error.message || 'API返回错误');
      }
      
      const assistantMessage = data.choices[0]?.message?.content;

      // 🔥 到这里说明API调用成功且返回格式正常
      // 如果content为空或[不回复]，这是AI主动选择不回复（不是错误）
      if (!assistantMessage || assistantMessage.trim() === '' || 
          assistantMessage.trim() === '[不回复]' || assistantMessage.includes('[不回复]')) {
        console.log('💭 AI选择不回复此消息（API调用成功，但AI决定不回复）');
        callback([], conversation.id);
        return;
      }

      // 使用splitMessages分割消息
      const splitMsgs = splitMessages(assistantMessage);
      
      // 将分割后的文本转换为Message对象数组
      const messages: Message[] = [];
      const allExtraMessages: Message[] = [];
      
      splitMsgs.forEach((content, index) => {
        const baseId = Date.now().toString() + '_' + index;
        
        // 提取所有媒体项（支持多媒体混合）
        const mediaItems: any[] = [];
        let cleanContent = content;
        
        // 提取所有图片
        const imageMatches = content.matchAll(/\[图片[:：]([^\]]+)\]/g);
        for (const match of imageMatches) {
          mediaItems.push({
            type: 'image',
            description: match[1].trim()
          });
          cleanContent = cleanContent.replace(match[0], '').trim();
        }
        
        // 提取所有视频
        const videoMatches = content.matchAll(/\[视频[:：]([^\]]+)\]/g);
        for (const match of videoMatches) {
          mediaItems.push({
            type: 'video',
            description: match[1].trim()
          });
          cleanContent = cleanContent.replace(match[0], '').trim();
        }
        
        // 提取所有语音
        const voiceMatches = content.matchAll(/\[语音[:：](.+?)(?:[，,]\s*(?:时长)?(\d+)秒?)?\]/g);
        for (const match of voiceMatches) {
          mediaItems.push({
            type: 'voice',
            description: match[1].trim(),
            duration: parseInt(match[2]) || 3
          });
          cleanContent = cleanContent.replace(match[0], '').trim();
        }
        
        // 提取所有表情包
        const stickerMatches = content.matchAll(/\[表情包[:：]([^\]]+)\]/g);
        for (const match of stickerMatches) {
          mediaItems.push({
            type: 'sticker',
            description: match[1].trim()
          });
          cleanContent = cleanContent.replace(match[0], '').trim();
        }
        
        // 🔍 解析特殊指令（红包、转账、文档）
        let finalContent = cleanContent;
        console.log(`📖 开始解析AI消息: ${finalContent.substring(0, 100)}...`);
        
        // 检测红包：[发红包:金额:留言]
        const redPacketMatch = finalContent.match(/\[发红包:([\d.]+):([^\]]*)\]/);
        if (redPacketMatch) {
          const amount = parseFloat(redPacketMatch[1]);
          const redPacketMsg = redPacketMatch[2];
          finalContent = finalContent.replace(redPacketMatch[0], '').trim();
          
          console.log(`🧧 AI发红包: ¥${amount}, 留言: ${redPacketMsg}`);
          
          allExtraMessages.push({
            id: `${baseId}_redpacket`,
            role: 'assistant',
            content: '发出了一个红包',
            timestamp: Date.now() + 100 + allExtraMessages.length * 10,
            moneyTransfer: {
              type: 'redPacket',
              amount,
              message: redPacketMsg,
              status: 'pending'
            }
          });
        }

        // 检测转账：[转账:金额:备注]
        const transferMatch = finalContent.match(/\[转账:([\d.]+):([^\]]*)\]/);
        if (transferMatch) {
          const amount = parseFloat(transferMatch[1]);
          const transferMsg = transferMatch[2];
          finalContent = finalContent.replace(transferMatch[0], '').trim();
          
          console.log(`💸 AI转账: ¥${amount}, 备注: ${transferMsg}`);
          
          allExtraMessages.push({
            id: `${baseId}_transfer`,
            role: 'assistant',
            content: '向你转账',
            timestamp: Date.now() + 100 + allExtraMessages.length * 10,
            moneyTransfer: {
              type: 'transfer',
              amount,
              message: transferMsg,
              status: 'pending'
            }
          });
        }

        // 🔥 支持多个文档：[发文档:标题:类型] 文档内容 [发文档:标题2:类型2] 文档内容2
        const docMatches = Array.from(finalContent.matchAll(/\[发文档:([^:]+):([^\]]+)\]/g));
        if (docMatches.length > 0) {
          console.log(`📄 检测到${docMatches.length}个文档标记`);
          
          // 按位置分割内容
          let textBeforeFirstDoc = '';
          
          docMatches.forEach((docMatch, idx) => {
            const docTitle = docMatch[1];
            const docTypeInput = docMatch[2].toLowerCase();
            // 映射类型：markdown/code保持，其他都映射到text
            const docType: 'text' | 'markdown' | 'code' = 
              docTypeInput === 'markdown' ? 'markdown' :
              docTypeInput === 'code' ? 'code' : 'text';
            
            const tagIndex = docMatch.index!;
            const tagEndIndex = tagIndex + docMatch[0].length;
            
            // 获取这个标记之前的内容
            let docContent = '';
            if (idx === 0) {
              // 第一个文档：标记前的内容可能是文本或文档内容
              textBeforeFirstDoc = finalContent.substring(0, tagIndex).trim();
              // 获取第一个标记后到第二个标记前的内容作为文档内容
              const nextMatch = docMatches[idx + 1];
              if (nextMatch) {
                docContent = finalContent.substring(tagEndIndex, nextMatch.index).trim();
              } else {
                // 没有下一个文档标记，提取到双换行或消息结束
                let remainingContent = finalContent.substring(tagEndIndex);
                // 查找双换行位置（表示文档内容结束）
                const doubleNewlineIndex = remainingContent.search(/\n\s*\n/);
                if (doubleNewlineIndex !== -1) {
                  docContent = remainingContent.substring(0, doubleNewlineIndex).trim();
                  // 把双换行后的内容保留到finalContent
                  const afterDoc = remainingContent.substring(doubleNewlineIndex).trim();
                  if (afterDoc) {
                    textBeforeFirstDoc = textBeforeFirstDoc ? textBeforeFirstDoc + '\n\n' + afterDoc : afterDoc;
                  }
                } else {
                  docContent = remainingContent.trim();
                }
              }
              
              // 如果第一个标记前有内容且标记后没内容，说明前面的是文档内容
              if (textBeforeFirstDoc && !docContent) {
                docContent = textBeforeFirstDoc;
                textBeforeFirstDoc = '';
              }
            } else {
              // 后续文档：获取本标记后到下个标记前的内容
              const nextMatch = docMatches[idx + 1];
              if (nextMatch) {
                docContent = finalContent.substring(tagEndIndex, nextMatch.index).trim();
              } else {
                // 没有下一个文档标记，提取到双换行或消息结束
                let remainingContent = finalContent.substring(tagEndIndex);
                const doubleNewlineIndex = remainingContent.search(/\n\s*\n/);
                if (doubleNewlineIndex !== -1) {
                  docContent = remainingContent.substring(0, doubleNewlineIndex).trim();
                  // 把双换行后的内容保留到finalContent
                  const afterDoc = remainingContent.substring(doubleNewlineIndex).trim();
                  if (afterDoc && idx === 0) {
                    textBeforeFirstDoc = textBeforeFirstDoc ? textBeforeFirstDoc + '\n\n' + afterDoc : afterDoc;
                  }
                } else {
                  docContent = remainingContent.trim();
                }
              }
            }
            
            // 🔥 限制AI生成文档的字数上限为20000字符
            const MAX_DOC_LENGTH = 20000;
            if (docContent.length > MAX_DOC_LENGTH) {
              console.warn(`⚠️ AI文档超过字数限制: ${docContent.length} > ${MAX_DOC_LENGTH}，已截断`);
              docContent = docContent.substring(0, MAX_DOC_LENGTH) + '\n\n...\n（文档内容过长，已截断）';
            }
            
            console.log(`📄 AI发送文档${idx + 1}: ${docTitle}, 类型: ${docType}, 内容长度: ${docContent.length}`);
            
            allExtraMessages.push({
              id: `${baseId}_doc_${idx}`,
              role: 'assistant',
              content: `发送了文档「${docTitle}」`,
              timestamp: Date.now() + 100 + allExtraMessages.length * 10,
              document: {
                title: docTitle,
                content: docContent,
                type: docType,
                greeting: '请查收',
                size: new Blob([docContent]).size
              }
            });
          });
          
          // 保留第一个文档标记前的文本（如果有）
          finalContent = textBeforeFirstDoc;
        }

        // 检测引用消息：[回复 我/你 说的"xxx"]
        let replyToInfo: { content: string; role: 'user' | 'assistant' } | undefined;
        const replyMatch = finalContent.match(/\[回复\s+(我|你)\s+说的"([^"]+)"\]/);
        if (replyMatch) {
          const quotedRole = replyMatch[1]; // '我' 或 '你'
          const quotedContent = replyMatch[2];
          finalContent = finalContent.replace(replyMatch[0], '').trim();
          
          // '我' = user, '你' = assistant (AI回复时，'我'指的是用户)
          replyToInfo = {
            content: quotedContent,
            role: quotedRole === '我' ? 'user' : 'assistant'
          };
          
          console.log(`💬 AI引用消息: ${quotedRole}说的"${quotedContent}"`);
        }

        // 检测红包/转账接收响应：[接收红包:留言] [退回红包:留言] [接收转账:留言] [退回转账:留言]
        const moneyResponseMatch = finalContent.match(/\[(接收|退回)(红包|转账):([^\]]*)\]/);
        if (moneyResponseMatch) {
          const action = moneyResponseMatch[1]; // 接收/退回
          const type = moneyResponseMatch[2]; // 红包/转账
          const message = moneyResponseMatch[3]; // 留言
          finalContent = finalContent.replace(moneyResponseMatch[0], '').trim();
          
          console.log(`💰 AI${action}${type}: ${message}`);
          
          // 创建转账气泡（AI接收用户的钱时，需要找到原始金额）
          // 这里暂时用0，实际金额会在processAIMoneyResponse中更新
          allExtraMessages.push({
            id: `${baseId}_moneyresponse`,
            role: 'assistant',
            content: action === '接收' ? `已收到你的${type}` : `已退回你的${type}`,
            timestamp: Date.now() + 100 + allExtraMessages.length * 10,
            moneyTransfer: {
              type: type === '红包' ? 'redPacket' : 'transfer',
              amount: 0, // 占位，需要后续更新
              message: message,
              status: action === '接收' ? 'received' : 'returned'
            }
          });
        }

        // 检测订单响应：[接受礼物] [退回礼物] [同意代付] [拒绝代付]
        const orderResponseMatch = finalContent.match(/\[(接受礼物|退回礼物|同意代付|拒绝代付)\]/);
        if (orderResponseMatch) {
          const responseType = orderResponseMatch[1];
          finalContent = finalContent.replace(orderResponseMatch[0], '').trim();
          
          // 标记需要处理订单响应（在callback中处理）
          // 这里只是移除标记，实际更新逻辑在processAIOrderResponse中
          console.log(`🎁 AI订单响应: ${responseType}`);
        }

        // 检测小红书：小红书瀑布流[...]
        const xhsMatch = finalContent.match(/小红书瀑布流\[([\s\S]*?)\]/);
        if (xhsMatch) {
          const xhsContent = xhsMatch[0]; // 完整的小红书内容
          finalContent = finalContent.replace(xhsContent, '').trim();
          
          console.log('📕 AI发送小红书内容');
          
          allExtraMessages.push({
            id: `${baseId}_xiaohongshu`,
            role: 'assistant',
            content: '发送了小红书内容',
            timestamp: Date.now() + 100 + allExtraMessages.length * 10,
            xiaohongshu: {
              rawContent: xhsContent
            }
          });
        }

        // 检测AI送礼物：[送礼物:商品名称:价格:留言]
        const giftMatch = finalContent.match(/\[送礼物:([^:]+):(\d+(?:\.\d+)?):([^\]]*)\]/);
        if (giftMatch) {
          const productName = giftMatch[1];
          const price = parseFloat(giftMatch[2]);
          const giftMessage = giftMatch[3];
          finalContent = finalContent.replace(giftMatch[0], '').trim();
          
          console.log(`🎁 AI送礼物: ${productName} ¥${price}`);
          
          // 💰 检查AI余额
          const aiBalance = getAIBalance(conversation.id);
          if (aiBalance >= price) {
            // 余额足够，扣款并创建订单
            addAITransaction(
              conversation.id,
              'expense',
              price,
              'shopping',
              `送礼物给用户: ${productName}`,
              conversation.id
            );
            
            console.log(`✅ AI余额扣款成功: ¥${price}, 剩余: ¥${aiBalance - price}`);
            
            // 创建礼物订单消息
            allExtraMessages.push({
              id: `${baseId}_gift`,
              role: 'assistant',
              content: `给你的礼物`,
              timestamp: Date.now() + 100 + allExtraMessages.length * 10,
              order: {
                type: 'gift',
                products: [{
                  id: `product_${Date.now()}`,
                  name: productName,
                  price: price,
                  quantity: 1,
                  image: '🎁' // 默认礼物图标
                }],
                totalAmount: price,
                status: 'pending',
                orderNumber: `ORDER${Date.now()}`,
                message: giftMessage,
                recipientId: 'user',
                recipientName: '你'
              }
            });
          } else {
            // 余额不足，创建提示消息而不是订单
            console.log(`❌ AI余额不足: 需要¥${price}, 仅有¥${aiBalance}`);
            // AI会在回复中说明余额不足，不创建订单
            // 标记已被移除，不会显示[送礼物:xxx]
          }
        }
        
        // 构建消息对象
        // 如果提取了特殊指令且没有其他内容，不创建文本消息
        const hasSpecialContent = allExtraMessages.some(msg => msg.id.startsWith(baseId));
        const shouldCreateTextMessage = finalContent || (!hasSpecialContent && (cleanContent || mediaItems.length > 0));
        
        if (shouldCreateTextMessage) {
          const message: Message = {
            id: baseId,
            role: 'assistant' as const,
            content: finalContent || cleanContent || (mediaItems.length > 0 ? '[多媒体消息]' : ''),
            timestamp: Date.now()
          };
          
          // 如果有引用消息，添加到消息中
          if (replyToInfo) {
            message.replyTo = {
              id: '', // AI回复时不需要原始ID
              content: replyToInfo.content,
              role: replyToInfo.role
            };
          }
          
          // 如果有媒体项，添加到消息中
          if (mediaItems.length > 0) {
            message.mediaItems = mediaItems;
            // 为了兼容旧的渲染逻辑，也设置第一个媒体的信息
            const firstMedia = mediaItems[0];
            message.mediaType = firstMedia.type;
            message.mediaDescription = firstMedia.description;
            message.voiceDuration = firstMedia.duration;
            message.isMediaDescriptionOnly = true;
          }
          
          messages.push(message);
        }
        
      });
      
      // 添加所有额外的特殊消息（红包、转账、文档）
      messages.push(...allExtraMessages);
      
      callback(messages, conversation.id);
      return "task_" + Date.now();
    } catch (error) {
      console.error('API调用失败:', error);
      callback([], conversation.id, error instanceof Error ? error.message : String(error));
      return "task_failed_" + Date.now();
    }
  }
};
import { showMessageNotification } from './MessageNotification';
import { MessageActionMenu } from './MessageActionMenu';
import { useToast } from './Toast';
// import { transcribeAudio, isValidSpeechConfig } from '../utils/speechToText';

interface ChatScreenProps {
  conversation: Conversation;
  apiConfig: ApiConfig;
  currentUserProfile?: UserProfile; // 当前用户资料（用于AI参考）
  conversations: Conversation[]; // 所有对话列表（用于转发）
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void;
  onBack: () => void;
  onOpenCharacterSettings: () => void;
  onRequestAIMoment?: () => Promise<void>;
}

export default function ChatScreen({
  conversation,
  apiConfig,
  currentUserProfile,
  conversations,
  onUpdateConversation,
  onBack,
  onOpenCharacterSettings,
  onRequestAIMoment,
}: ChatScreenProps) {
  const { showToast } = useToast();
  const [currentInput, setCurrentInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [showMoneyTransferModal, setShowMoneyTransferModal] = useState(false);
  const [showSendDocumentModal, setShowSendDocumentModal] = useState(false);
  const [showDocumentLibrary, setShowDocumentLibrary] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Message['document'] | null>(null);
  const [selectedLibraryDoc, setSelectedLibraryDoc] = useState<SavedDocument | null>(null);
  const [showSelectContact, setShowSelectContact] = useState(false);
  const [forwardingDocument, setForwardingDocument] = useState<Message['document'] | null>(null);
  const [shouldEditDoc, setShouldEditDoc] = useState(false);
  const [showVideoDescModal, setShowVideoDescModal] = useState(false);
  const [videoDescInput, setVideoDescInput] = useState('');
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [stickerDescInput, setStickerDescInput] = useState('');
  const [viewingVoice, setViewingVoice] = useState<string[]>([]);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [showSendingHint, setShowSendingHint] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<string[]>([]);
  const [showAllSentHint, setShowAllSentHint] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 消息操作相关状态
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [quotedMessage, setQuotedMessage] = useState<Message | null>(null);
  const [messageBeingEdited, setMessageBeingEdited] = useState<Message | null>(null);
  const [isDeleting, setIsDeleting] = useState(false); // 标记是否正在删除消息
  const [isEditing, setIsEditing] = useState(false); // 标记是否正在编辑消息
  
  // 多选删除状态
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  
  // 生成智能的不回复提示
  const generateContextualHint = async (conversationData: Conversation) => {
    try {
      const aiName = conversationData.characterSettings?.nickname || conversationData.name;
      
      // 获取最近的对话上下文
      const recentMessages = conversationData.messages.slice(-10).map(m => 
        `${m.role === 'user' ? '用户' : aiName}: ${m.content}`
      ).join('\n');
      
      // 构建包含角色设定的提示
      const characterInfo = conversationData.characterSettings 
        ? `\n【你的角色设定】\n性格：${conversationData.characterSettings.personality || ''}\n喜好/厌恶：${conversationData.characterSettings.memoryEvents || ''}\n`
        : '';
      
      const hintPrompt = `你是 ${aiName}。${characterInfo}

【最近的对话】
${recentMessages}

【任务】
你刚才选择不回复用户的最后一条消息。请根据对话上下文和你的角色设定，用一句话解释为什么不回复。

【判断原因】
1. **情绪原因**：如果刚吵架/生气了 → "${aiName}现在还在生气，暂时不想理你"
2. **忙碌原因**：如果提到在忙/工作/学习/实验室 → "${aiName}可能在忙，暂时没空回复"
3. **话题原因**：
   - 用户提到你不喜欢的东西 → "${aiName}不太喜欢这个话题"
   - 话题无聊/重复 → "${aiName}觉得没什么好说的"
   - 话题敏感/尴尬 → "${aiName}不知道该怎么回复"
4. **性格原因**：根据你的性格特点（内向、高冷等）→ 用符合性格的说法

【要求】
- 语气要自然，像真人一样
- 只输出一句话，不要有任何前缀或解释  
- 控制在30字以内
- 要符合你的性格和当前情境

现在请生成提示：`;

      const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: apiConfig.modelName,
          messages: [{ role: 'user', content: hintPrompt }],
          max_tokens: 50,
          temperature: 0.7
        })
      });

      if (response.ok) {
        const data = await response.json();
        const contextualHint = data.choices[0]?.message?.content?.trim();
        if (contextualHint) {
          return contextualHint;
        }
      }
    } catch (error) {
      console.error('生成上下文提示失败:', error);
    }
    
    // 如果生成失败，使用默认提示
    const aiName = conversationData.characterSettings?.nickname || conversationData.name;
    return `${aiName}看到了你的消息，但现在不想回复`;
  };
  
  // 追踪用户是否还在当前聊天页面
  const isComponentMountedRef = useRef(true);
  
  // AI状态相关state
  const [aiStatus, setAIStatus] = useState<any | null>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  
  // 语音相关state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showVoiceConfirmModal, setShowVoiceConfirmModal] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 旧的消息操作状态已移除，使用新的实现（selectedMessageId, menuPosition等）
  
  // 获取用户资料
  const getUserProfile = () => {
    try {
      const profile = localStorage.getItem('userProfile');
      if (profile) {
        return JSON.parse(profile);
      }
    } catch (e) {
      console.error('Failed to parse user profile:', e);
    }
    return { username: '我', avatarBadge: '🎵', avatar: null };
  };

  const userProfile = getUserProfile();
  
  // 获取用户头像装饰
  const getUserBadge = () => {
    return userProfile.avatarBadge || '🎵';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 消息点击处理 - 显示胶囊菜单
  const handleMessageClick = (messageId: string, event: React.MouseEvent) => {
    // 如果点击的是操作按钮或语音/视频/图片等媒体控件，不处理
    const target = event.target as HTMLElement;
    if (target.closest('.message-action-btn') || 
        target.closest('audio') || 
        target.closest('video') || 
        target.closest('button') ||
        target.tagName === 'IMG') {
      return;
    }
    
    // 获取点击位置，显示菜单
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;
    
    setSelectedMessageId(messageId);
    setMenuPosition({ x, y });
  };

  // 关闭菜单
  const handleCloseMenu = () => {
    setSelectedMessageId(null);
  };

  // 删除消息
  const handleDeleteMessage = () => {
    if (!selectedMessageId) return;
    
    setIsDeleting(true); // 标记正在删除
    const updatedMessages = conversation.messages.filter(m => m.id !== selectedMessageId);
    onUpdateConversation(conversation.id, { messages: updatedMessages });
    setSelectedMessageId(null);
    
    // 删除后恢复标记
    setTimeout(() => setIsDeleting(false), 100);
  };

  // 编辑消息（所有消息都可编辑）
  const handleEditMessage = () => {
    if (!selectedMessageId) return;
    
    const message = conversation.messages.find(m => m.id === selectedMessageId);
    if (!message) return;
    
    setMessageBeingEdited(message);
    setCurrentInput(message.content);
    setSelectedMessageId(null);
    
    // 聚焦输入框
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // 引用消息
  const handleQuoteMessage = () => {
    if (!selectedMessageId) return;
    
    const message = conversation.messages.find(m => m.id === selectedMessageId);
    if (!message) return;
    
    setQuotedMessage(message);
    setSelectedMessageId(null);
    
    // 聚焦输入框
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // 取消引用
  const handleCancelQuote = () => {
    setQuotedMessage(null);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setMessageBeingEdited(null);
    setCurrentInput('');
  };

  // 进入多选模式
  const handleEnterMultiSelect = () => {
    setIsMultiSelectMode(true);
    setSelectedMessages([selectedMessageId!]); // 把当前选中的消息加入多选
    setSelectedMessageId(null);
  };

  // 切换消息选中状态
  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => 
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  // 批量删除消息
  const handleBatchDelete = () => {
    if (selectedMessages.length === 0) return;
    
    setIsDeleting(true);
    const updatedMessages = conversation.messages.filter(m => !selectedMessages.includes(m.id));
    onUpdateConversation(conversation.id, { messages: updatedMessages });
    setSelectedMessages([]);
    setIsMultiSelectMode(false);
    
    setTimeout(() => setIsDeleting(false), 100);
  };

  // 取消多选模式
  const handleCancelMultiSelect = () => {
    setIsMultiSelectMode(false);
    setSelectedMessages([]);
  };

  // 旧的消息操作函数已删除，使用新实现

  // 追踪组件挂载状态（用户是否还在页面）
  useEffect(() => {
    isComponentMountedRef.current = true;
    
    return () => {
      // 组件卸载时（用户离开页面）
      isComponentMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // 删除或编辑时不自动滚动，其他情况正常滚动
    if (!isDeleting && !isEditing) {
      scrollToBottom();
    }
  }, [conversation.messages, isGenerating, isDeleting, isEditing]);

  // 加载AI状态
  useEffect(() => {
    if (conversation.type === 'private' && conversation.characterSettings) {
      const loadStatus = async () => {
        const status = await getAIStatus(conversation.id);
        if (status) {
          setAIStatus(status);
        }
      };
      loadStatus();
      
      // 🔥 性能优化：移除定时刷新，AI状态只在有消息时更新
      // const interval = setInterval(loadStatus, 30000);
      // return () => clearInterval(interval);
    }
  }, [conversation.id, conversation.type, conversation.characterSettings]);


  const handleSendMessage = () => {
    if (!currentInput.trim()) return;

    // 如果是编辑模式,保存编辑
    if (messageBeingEdited) {
      setIsEditing(true); // 标记正在编辑
      const updatedMessages = conversation.messages.map(msg =>
        msg.id === messageBeingEdited.id 
          ? { ...msg, content: currentInput.trim(), edited: true }
          : msg
      );
      onUpdateConversation(conversation.id, { messages: updatedMessages });
      setMessageBeingEdited(null);
      setCurrentInput('');
      
      // 编辑后恢复标记
      setTimeout(() => setIsEditing(false), 100);
      return;
    }

    const newMessage: Message = {
      id: Date.now().toString() + Math.random(),
      role: 'user',
      content: currentInput.trim(),
      timestamp: Date.now(),
      // 如果有引用消息,添加引用信息
      ...(quotedMessage && quotedMessage.role !== 'system' && {
        replyTo: {
          id: quotedMessage.id,
          content: quotedMessage.content,
          role: quotedMessage.role as 'user' | 'assistant'
        }
      })
    };

    onUpdateConversation(conversation.id, {
      messages: [...conversation.messages, newMessage],
      lastMessageTime: Date.now(),
    });

    setCurrentInput('');
    setPendingMessages([]); // 清除剩余消息
    setShowAllSentHint(false);
    setQuotedMessage(null); // 清除引用
    inputRef.current?.focus();
  };

  // 逐条发送剩余消息
  const sendRemainingMessages = async (messages: string[]) => {
    const batchSize = 23;
    const toSend = messages.slice(0, batchSize);
    const remaining = messages.slice(batchSize);
    
    let currentMessages = [...conversation.messages];
    
    for (let i = 0; i < toSend.length; i++) {
      setShowTyping(true);
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
      setShowTyping(false);
      
      const newMessage: Message = {
        id: Date.now().toString() + '_continue_' + i + Math.random(),
        role: 'assistant' as const,
        content: toSend[i].trim(),
        timestamp: Date.now(),
      };
      
      currentMessages = [...currentMessages, newMessage];
      onUpdateConversation(conversation.id, {
        messages: currentMessages,
        lastMessageTime: Date.now(),
      });
      
      if (i < toSend.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    setPendingMessages(remaining);
    
    if (remaining.length === 0) {
      setShowAllSentHint(true);
      setTimeout(() => setShowAllSentHint(false), 3000);
    }
  };

  // 继续发送剩余消息
  const handleContinueSending = async () => {
    if (pendingMessages.length > 0) {
      setIsGenerating(true);
      await sendRemainingMessages(pendingMessages);
      setIsGenerating(false);
    }
  };

  // 注意：旧的 handleAIMoneyResponse 函数已删除
  // 现在使用 System Prompt 机制，AI直接在回复中使用 [接收红包:xxx] 或 [退回红包:xxx] 格式
  // 处理逻辑在 processAIMoneyResponse 函数中（line 1127）

  // 处理红包接收/退回
  const handleReceiveMoney = (messageId: string, accept: boolean) => {
    // 找到要处理的红包消息
    const targetMessage = conversation.messages.find(msg => msg.id === messageId);
    if (!targetMessage || !targetMessage.moneyTransfer) return;
    
    const updatedMessages = conversation.messages.map(msg => {
      if (msg.id === messageId && msg.moneyTransfer) {
        if (accept) {
          // 接收红包
          receiveMoney(
            msg.moneyTransfer.amount,
            msg.moneyTransfer.type,
            conversation.id,
            msg.moneyTransfer.message
          );

          return {
            ...msg,
            moneyTransfer: {
              ...msg.moneyTransfer,
              status: 'received' as const,
              receivedAt: Date.now()
            }
          };
        } else {
          // 退回红包 - 保存原始金额，用于显示
          return {
            ...msg,
            moneyTransfer: {
              ...msg.moneyTransfer,
              originalAmount: msg.moneyTransfer.amount, // 保存原始金额
              status: 'returned' as const
            }
          };
        }
      }
      
      // 🔥 修复：如果是退回，同时更新用户发送的红包消息状态
      if (!accept && msg.role === 'user' && msg.moneyTransfer && 
          msg.moneyTransfer.status === 'pending' &&
          msg.timestamp < targetMessage.timestamp) {
        // 这是用户之前发送的红包，现在被AI退回
        return {
          ...msg,
          moneyTransfer: {
            ...msg.moneyTransfer,
            originalAmount: msg.moneyTransfer.amount, // 保存原始金额
            status: 'returned' as const
          }
        };
      }
      
      return msg;
    });

    onUpdateConversation(conversation.id, {
      messages: updatedMessages,
      lastMessageTime: Date.now()
    });

    // 🔧 修复：用户领取AI红包时，不应该有AI的自动回复
    // AI接收/退回用户红包的回复通过 [接收红包:留言] 标记处理
    // 所以这里不需要自动回复了
  };

  // 处理图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 读取图片为base64
      const reader = new FileReader();
      reader.onload = () => {
        const imageData = reader.result as string;
        
        // 创建用户消息（显示图片）
        const userMessage: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'user',
          content: '[图片]',
          timestamp: Date.now(),
          mediaType: 'image',
          mediaUrl: imageData
        };

        // 只添加到聊天记录，不自动生成回复
        onUpdateConversation(conversation.id, {
          messages: [...conversation.messages, userMessage],
          lastMessageTime: Date.now()
        });

        // 关闭工具栏
        setShowToolbar(false);
      };

      reader.readAsDataURL(file);

    } catch (error) {
      console.error('图片上传失败:', error);
      alert('图片上传失败');
    }

    // 清空input
    if (e.target) e.target.value = '';
  };

  // 处理视频上传
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 保存文件并显示描述弹窗
    setPendingVideoFile(file);
    setShowVideoDescModal(true);
    setShowToolbar(false);

    // 清空input
    if (e.target) e.target.value = '';
  };

  // 打开表情包输入弹窗
  const handleStickerClick = () => {
    setShowStickerModal(true);
    setShowToolbar(false);
  };

  // 发送表情包消息
  const handleSendSticker = () => {
    if (!stickerDescInput.trim()) {
      alert('请输入表情包内容描述');
      return;
    }

    // 创建表情包消息
    const stickerMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: '[表情包]',
      timestamp: Date.now(),
      mediaType: 'sticker',
      mediaDescription: stickerDescInput.trim()
    };

    // 添加到对话
    onUpdateConversation(conversation.id, {
      messages: [...conversation.messages, stickerMessage],
      lastMessageTime: Date.now()
    });

    // 关闭弹窗并清空输入
    setShowStickerModal(false);
    setStickerDescInput('');
  };

  // 接受订单（礼物/代付）
  const handleAcceptOrder = (message: Message) => {
    if (!message.order) return;
    
    // 如果是代付请求，检查用户余额
    if (message.order.type === 'payRequest') {
      const userBalance = getBalance();
      if (userBalance < message.order.totalAmount) {
        showToast('❌ 余额不足，无法代付', 'error');
        return;
      }
      
      // 用户代付：用户余额扣款
      const success = aiPayForUser(
        conversation.id,
        message.order.totalAmount,
        message.order.products.map(p => p.name).join('、'),
        conversation.id
      );
      
      if (!success) {
        showToast('❌ 代付失败', 'error');
        return;
      }
    }
    
    // 更新订单状态
    const updatedMessages = conversation.messages.map(msg => {
      if (msg.id === message.id && msg.order) {
        return {
          ...msg,
          order: {
            ...msg.order,
            status: (message.order!.type === 'gift' ? 'accepted' : 'paid') as 'accepted' | 'paid'
          }
        } as Message;
      }
      return msg;
    });
    
    onUpdateConversation(conversation.id, {
      messages: updatedMessages
    });
    
    // 发送确认消息
    const confirmMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: message.order.type === 'gift' ? '谢谢！我收下了～' : '已帮你付款啦！',
      timestamp: Date.now()
    };
    
    onUpdateConversation(conversation.id, {
      messages: [...updatedMessages, confirmMessage],
      lastMessageTime: Date.now()
    });
    
    // 显示Toast提示
    showToast(
      message.order.type === 'gift' ? '🎁 已收下礼物' : '💰 已完成代付',
      'success'
    );
  };

  // 拒绝订单（礼物/代付）
  const handleRejectOrder = (message: Message) => {
    if (!message.order) return;
    
    // 如果是礼物订单，退款给AI（因为是AI送的礼物）
    if (message.order.type === 'gift') {
      refundGift(
        message.order.totalAmount,
        message.order.products.map(p => p.name).join('、'),
        conversation.id
      );
    }
    
    // 更新订单状态
    const updatedMessages = conversation.messages.map(msg => {
      if (msg.id === message.id && msg.order) {
        return {
          ...msg,
          order: {
            ...msg.order,
            status: 'rejected' as 'rejected'
          }
        } as Message;
      }
      return msg;
    });
    
    onUpdateConversation(conversation.id, {
      messages: updatedMessages
    });
    
    // 发送拒绝消息
    const rejectMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: message.order.type === 'gift' ? '不好意思，太贵重了' : '抱歉，暂时无法帮忙',
      timestamp: Date.now()
    };
    
    onUpdateConversation(conversation.id, {
      messages: [...updatedMessages, rejectMessage],
      lastMessageTime: Date.now()
    });
    
    // 显示Toast提示
    showToast(
      message.order.type === 'gift' ? '❌ 已退回礼物' : '❌ 已拒绝代付',
      'info'
    );
  };

  // 处理AI的订单响应（解析AI回复中的[接受礼物]等标记）
  const processAIOrderResponse = (aiMessage: Message) => {
    // 检测AI回复中的订单响应标记
    const responseMatch = aiMessage.content.match(/\[(接受礼物|退回礼物|同意代付|拒绝代付)\]/);
    if (!responseMatch) return;
    
    const responseType = responseMatch[1];
    console.log(`🎁 处理AI订单响应: ${responseType}`);
    
    // 找到最近的待处理订单消息（用户发送的）
    const recentOrderMessage = [...conversation.messages]
      .reverse()
      .find(msg => 
        msg.role === 'user' && 
        msg.order && 
        msg.order.status === 'pending'
      );
    
    if (!recentOrderMessage || !recentOrderMessage.order) {
      console.log('⚠️ 未找到待处理的订单消息');
      return;
    }
    
    // 根据响应类型更新订单状态
    let newStatus: 'accepted' | 'rejected' | 'paid' = 'rejected';
    if (responseType === '接受礼物') {
      newStatus = 'accepted';
    } else if (responseType === '同意代付') {
      // 💰 检查AI余额是否足够代付
      const aiBalance = getAIBalance(conversation.id);
      const orderAmount = recentOrderMessage.order.totalAmount;
      
      if (aiBalance >= orderAmount) {
        // AI余额足够，扣款并同意代付
        addAITransaction(
          conversation.id,
          'expense',
          orderAmount,
          'shopping',
          `帮用户代付: ${recentOrderMessage.order.products.map(p => p.name).join('、')}`,
          conversation.id
        );
        newStatus = 'paid';
        console.log(`✅ AI代付成功: ¥${orderAmount}, 剩余: ¥${aiBalance - orderAmount}`);
      } else {
        // AI余额不足，拒绝代付
        newStatus = 'rejected';
        console.log(`❌ AI余额不足无法代付: 需要¥${orderAmount}, 仅有¥${aiBalance}`);
        showToast(`AI余额不足无法代付（需要¥${orderAmount}，仅有¥${aiBalance}）`, 'error');
      }
    } else if (responseType === '退回礼物' || responseType === '拒绝代付') {
      newStatus = 'rejected';
    }
    
    // 更新订单状态
    const updatedMessages = conversation.messages.map(msg => {
      if (msg.id === recentOrderMessage.id && msg.order) {
        return {
          ...msg,
          order: {
            ...msg.order,
            status: newStatus
          }
        } as Message;
      }
      return msg;
    });
    
    onUpdateConversation(conversation.id, {
      messages: updatedMessages
    });
    
    console.log(`✅ 订单状态已更新: ${newStatus}`);
    
    // 显示Toast提示
    const toastMessages = {
      'accepted': '🎁 AI已接受你的礼物',
      'paid': '💰 AI已同意代付',
      'rejected': '❌ AI已拒绝订单'
    };
    showToast(toastMessages[newStatus], newStatus === 'rejected' ? 'warning' : 'success');
  };

  // 处理AI的红包/转账响应（更新金额和状态）
  const processAIMoneyResponse = (aiMessage: Message) => {
    // 检查是否是红包/转账响应消息（amount为0）
    if (!aiMessage.moneyTransfer || aiMessage.moneyTransfer.amount !== 0) {
      return; // 不是需要处理的响应
    }
    
    console.log(`💰 检测到AI红包响应消息`);
    
    // 从localStorage获取最新对话
    const storedConversations = localStorage.getItem('conversations');
    if (!storedConversations) return;
    
    const allConversations = JSON.parse(storedConversations) as Conversation[];
    const currentConv = allConversations.find((c: Conversation) => c.id === conversation.id);
    if (!currentConv) return;
    
    // 找到用户最近发送的待处理红包/转账消息
    const userMoneyMessage = [...currentConv.messages]
      .reverse()
      .find(msg => 
        msg.role === 'user' && 
        msg.moneyTransfer && 
        msg.moneyTransfer.status === 'pending' &&
        msg.moneyTransfer.type === aiMessage.moneyTransfer!.type
      );
    
    if (!userMoneyMessage || !userMoneyMessage.moneyTransfer) {
      console.log('⚠️ 未找到待处理的红包/转账消息');
      return;
    }
    
    const originalAmount = userMoneyMessage.moneyTransfer.amount;
    const responseStatus = aiMessage.moneyTransfer.status; // 'received' 或 'returned'
    
    console.log(`💰 处理AI红包响应: ${responseStatus}, 金额: ¥${originalAmount}`);
    
    // 更新对话中的两条消息
    const updatedMessages = currentConv.messages.map(msg => {
      // 更新AI响应消息的金额
      if (msg.id === aiMessage.id && msg.moneyTransfer) {
        return {
          ...msg,
          moneyTransfer: {
            ...msg.moneyTransfer,
            amount: originalAmount
          }
        };
      }
      // 更新用户原始消息的状态
      if (msg.id === userMoneyMessage.id && msg.moneyTransfer) {
        return {
          ...msg,
          moneyTransfer: {
            ...msg.moneyTransfer,
            status: responseStatus,
            receivedAt: responseStatus === 'received' ? Date.now() : undefined
          }
        };
      }
      return msg;
    });
    
    // 更新localStorage
    const updatedConversations = allConversations.map(c => 
      c.id === conversation.id 
        ? { ...c, messages: updatedMessages }
        : c
    );
    localStorage.setItem('conversations', JSON.stringify(updatedConversations));
    
    // 立即更新当前组件状态
    onUpdateConversation(conversation.id, {
      messages: updatedMessages
    });
    
    console.log(`✅ 红包状态已更新: ${responseStatus}`);
    
    // 显示Toast提示
    const toastMessages: Record<string, string> = {
      'received': `💰 AI已${aiMessage.moneyTransfer.type === 'redPacket' ? '领取红包' : '收到转账'} ¥${originalAmount}`,
      'returned': `↩️ AI已退回${aiMessage.moneyTransfer.type === 'redPacket' ? '红包' : '转账'} ¥${originalAmount}`
    };
    showToast(toastMessages[responseStatus] || '💰 红包状态已更新', 'success');
  };

  // 发送视频消息
  const handleSendVideo = () => {
    if (!pendingVideoFile || !videoDescInput.trim()) {
      alert('请输入视频内容描述');
      return;
    }

    try {
      // 读取视频文件为URL
      const reader = new FileReader();
      reader.onload = () => {
        const videoUrl = reader.result as string;
        
        // 创建用户消息
        const userMessage: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'user',
          content: `[视频] ${videoDescInput}`,
          timestamp: Date.now(),
          mediaType: 'video',
          mediaUrl: videoUrl,
          mediaDescription: videoDescInput
        };

        // 保存用户消息到聊天记录
        onUpdateConversation(conversation.id, {
          messages: [...conversation.messages, userMessage],
          lastMessageTime: Date.now()
        });

        // 关闭弹窗
        setShowVideoDescModal(false);
        setVideoDescInput('');
        setPendingVideoFile(null);
      };

      reader.readAsDataURL(pendingVideoFile);

    } catch (error) {
      console.error('视频发送失败:', error);
      alert('视频发送失败');
    }
  };

  // 语音录音功能
  const handleVoiceClick = async () => {
    startRecording();
  };

  // 开始录音
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        
        // 停止所有音轨
        stream.getTracks().forEach(track => track.stop());
        
        // 直接显示手动输入弹窗，不使用语音识别
        setVoiceTranscript('');
        setShowVoiceConfirmModal(true);
      };
      
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      
      // 开始计时
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('启动录音失败:', error);
      alert('无法访问麦克风，请检查权限设置');
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    setIsRecording(false);
  };

  // 发送语音消息
  const handleSendVoice = () => {
    if (!voiceTranscript.trim() || !audioBlob) {
      alert('请输入语音内容');
      return;
    }
    
    try {
      // 转换音频为URL
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // 创建语音消息
      const voiceMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content: `[语音]`,
        timestamp: Date.now(),
        mediaType: 'voice',
        mediaUrl: audioUrl,
        mediaDescription: voiceTranscript,
        voiceDuration: recordingTime // 使用录音时长
      };
      
      // 保存到聊天记录
      onUpdateConversation(conversation.id, {
        messages: [...conversation.messages, voiceMessage],
        lastMessageTime: Date.now()
      });
      
      // 重置状态
      setShowVoiceConfirmModal(false);
      setVoiceTranscript('');
      setAudioBlob(null);
      setRecordingTime(0);
      
    } catch (error) {
      console.error('发送语音失败:', error);
      alert('发送语音失败');
    }
  };

  const handleGenerate = async () => {
    if (!apiConfig.baseUrl || !apiConfig.apiKey || !apiConfig.modelName) {
      alert('请先在设置中配置 API');
      return;
    }

    if (conversation.messages.length === 0) {
      alert('请先发送消息');
      return;
    }

    setIsGenerating(true);
    setShowSendingHint(true);

    try {
      // 获取最近的用户消息（支持混合消息类型）
      const userMessages = conversation.messages.filter(m => m.role === 'user');
      const lastUserMsgForTime = userMessages[userMessages.length - 1];
      const lastUserTimestamp = lastUserMsgForTime?.timestamp;
      
      // 获取自上次AI回复后的所有用户消息
      const lastAssistantIndex = conversation.messages.map(m => m.role).lastIndexOf('assistant');
      const unhandledUserMessages = lastAssistantIndex >= 0 
        ? conversation.messages.slice(lastAssistantIndex + 1).filter(m => m.role === 'user')
        : userMessages.slice(-5); // 如果没有AI回复，取最近5条
      
      // 🕐 计算最早未回复消息的时间戳（用于时间跨度分析）
      const oldestUnrepliedTimestamp = unhandledUserMessages.length > 0 
        ? Math.min(...unhandledUserMessages.map(m => m.timestamp))
        : undefined;
      
      // 检查未处理的消息中是否包含各种媒体类型
      const hasImage = unhandledUserMessages.some(m => m.mediaType === 'image' && m.mediaUrl);
      const hasVideo = unhandledUserMessages.some(m => m.mediaType === 'video' && m.mediaDescription);
      const hasVoice = unhandledUserMessages.some(m => m.mediaType === 'voice' && m.mediaDescription);
      const hasSticker = unhandledUserMessages.some(m => m.mediaType === 'sticker' && m.mediaDescription);
      
      // 获取所有包含图片的消息（支持多图片）
      const imageMessages = unhandledUserMessages.filter(m => m.mediaType === 'image' && m.mediaUrl);
      // 获取纯文字消息
      const textMessages = unhandledUserMessages.filter(m => !m.mediaType);
      
      // 🕐 生成增强的时间感知提示词（包含时间跨度分析）
      const timeAwarePrompt = buildTimeAwarePrompt(
        lastUserTimestamp, 
        lastUserMsgForTime?.content,
        oldestUnrepliedTimestamp
      );
      
      // 构建用户资料提示
      let userInfoPrompt = '';
      if (currentUserProfile?.personalInfo) {
        const info = currentUserProfile.personalInfo;
        const infoParts = [];
        if (info.name) infoParts.push(`姓名：${info.name}`);
        if (info.gender) infoParts.push(`性别：${info.gender}`);
        if (info.age) infoParts.push(`年龄：${info.age}`);
        if (info.background) infoParts.push(`背景：${info.background}`);
        
        if (infoParts.length > 0) {
          userInfoPrompt = `\n\n【对话用户信息】：\n${infoParts.join('、')}\n注意：这是对话用户的基本信息，用于更好地理解对话语境。`;
        }
      }
      
      // 构建资料库内容
      let knowledgeBaseContent = '';
      if (conversation.characterSettings?.knowledgeBase && conversation.characterSettings.knowledgeBase.length > 0) {
        knowledgeBaseContent = '\n\n【专属资料库】\n以下是你需要了解和参考的专业资料，在对话中遇到相关内容时请调取这些知识：\n\n';
        conversation.characterSettings.knowledgeBase.forEach((item, index) => {
          knowledgeBaseContent += `${index + 1}. ${item.title}\n${item.content}\n\n`;
        });
      }
      
      let systemPrompt = conversation.characterSettings
        ? `你是${conversation.characterSettings.nickname}。
${conversation.characterSettings.systemPrompt ? `人物设定：${conversation.characterSettings.systemPrompt}` : ''}
${conversation.characterSettings.personality ? `性格特征：${conversation.characterSettings.personality}` : ''}
${conversation.characterSettings.languageStyle ? `语言风格：${conversation.characterSettings.languageStyle}` : ''}
${conversation.characterSettings.languageExample ? `语言示例：${conversation.characterSettings.languageExample}` : ''}
${conversation.characterSettings.memoryEvents ? `记忆事件：${conversation.characterSettings.memoryEvents}` : ''}${knowledgeBaseContent}

【重要表达规范】：
- 使用真人自然口语表达，不要使用斜杠（/）来表示"或"，例如：
  ❌ 错误："地铁/公交"、"学习/工作"  
  ✅ 正确："地铁或公交"、"地铁和公交"、"每天都要被公交地铁压榨"
- 可以用顿号（、）、"和"、"或"、"还是"等自然连接词
- 列举事物时优先用自然叙述而非并列符号
- 保持日常对话的流畅感，像真人一样说话

【对话回复原则】：
- **智能优先级**：如果用户发了多条消息，先判断每条消息的优先级，按优先级顺序回复
- **优先级判断标准**：
  * 🔴 高优先级：明确提问、需要帮助、重要话题、情感表达
  * 🟡 中优先级：分享经历、有趣话题、聊天互动
  * 🟢 低优先级：日常问候、闲聊、无聊话题
- **选择性回复**：不需要对每条消息都回复，可以只回复你感兴趣的话题
- **自然跳过**：对于不感兴趣或无话可说的内容，可以输出"[不回复]"来跳过
- **合并回复**：可以一次回复多条消息，优先回复高优先级的
- **真实互动**：像真人聊天一样，有选择地参与对话

【回复顺序示例】：
如果用户连续发了：
1. "今天天气真好"（低优先级）
2. "我去买了杯咖啡"（低优先级）  
3. "对了，你看过《三体》吗？"（高优先级-明确提问）

你应该：先回复第3条（高优先级），可以跳过1、2条，或者简单带一句

注意：如果所有消息都是低优先级且不感兴趣，可以全部输出"[不回复]"

【📱 多媒体消息功能】：
你可以发送图片、视频、语音、表情包等多媒体内容，让对话更生动：

1. 📷 图片消息：[图片:描述内容]
   示例："看这个！[图片:今天拍的日落]"
   适用场景：分享照片、展示物品、发送截图等

2. 🎬 视频消息：[视频:描述内容]
   示例："这个视频太搞笑了 [视频:小猫玩球]"
   适用场景：分享视频、展示动态内容等

3. 🎤 语音消息：[语音:内容,时长X秒]
   示例："[语音:我今天特别开心,5秒]"
   适用场景：想表达语气、内容较长、更亲切的交流
   注意：时长可以省略（默认3秒），内容要自然口语化

4. 😊 表情包：[表情包:描述]
   示例："[表情包:哈哈哈笑cry]"
   适用场景：表达情绪、调节气氛、幽默回复

【混合发送规则】：
- ✅ 可以同时发送多种类型：文字+图片、语音+表情包、视频+文字等
- ✅ 多个同类型：可以连发多张图片、多个表情包等
- ✅ 与引用消息组合：引用可以和任何类型组合使用
- ✅ 组合示例：
  * "今天去爬山了！[图片:山顶风景] [图片:我的自拍] 累死我了 [表情包:累瘫]"
  * "[语音:我跟你说个事,3秒] [图片:聊天记录截图] 你看看这个人！"
  * "生日快乐！[图片:蛋糕] [发红包:88.8:生日快乐] [表情包:庆祝]"
  * "[回复 你 说的\"要去旅游\"] 好啊！[图片:机票] [表情包:开心] 我订好票了"
  * "[回复 我 说的\"谢谢红包\"] 不客气！[表情包:比心]"

注意事项：
- 根据对话情境自然使用，不要刻意堆砌
- 描述要具体生动，让对方能想象内容
- 语音消息的内容要口语化，像真的在说话
- 表情包描述要准确传达情绪
- 引用消息会自动显示在气泡上方或内部，不影响其他内容

【💰 红包和转账功能】：
你可以在适当的场景下发送红包或转账，使用以下格式：
- 发红包：在回复中包含 [发红包:金额:留言]，例如："生日快乐！[发红包:66.6:生日快乐]"
- 转账：在回复中包含 [转账:金额:备注]，例如："借你的钱还给你 [转账:100:还钱]"
- 适用场景：生日祝福、还钱、表达感谢、请客吃饭、发工资等
- 金额建议：根据场景合理设置，红包6.6/8.8/66.6/88.8等吉利数字，转账用整数

【📄 发送内容卡片功能】：
你可以发送各种形式的内容卡片给用户，使用以下格式：
[发文档:标题:类型] 内容...

类型固定为：text、markdown、code
但内容形式可以多样化：新闻、八卦、小红书笔记、公众号文章、同人文、信件、策划案、报告等

⚠️ 重要：
- 内容只会在用户点击卡片后显示，不会泄露到聊天气泡中
- 自动识别：系统会根据标题和内容自动识别显示类型（新闻、小红书、公众号等），显示对应的图标和标签
- 📏 字数限制：单个文档内容最多20000字符，超过会被截断

【内容形式与专业规范】：
根据不同内容形式，必须详细、专业、符合真实文体：

1. 📋 策划案/方案类（500-1500字）：
   - 必须包含：背景分析、目标、策略、执行方案、预算、时间表
   - 使用专业术语和数据支撑
   - 结构清晰，逻辑严谨，像真正的商业方案
   示例："[发文档:Souvenir新季度营销方案:text] 
   一、项目背景
   当前市场环境...目标客群分析...竞品分析...
   
   二、营销目标
   1. 品牌曝光度提升30%...
   2. 销售额增长...
   
   三、策略规划
   1. 社交媒体矩阵搭建...
   2. KOL合作方案...
   ..."

2. ✉️ 信件类（200-800字）：
   - 根据你的角色性格、语言风格来写
   - 情感真挚，表达细腻，有个人特色
   - 适当使用你的语言习惯和表达方式
   示例："[发文档:给你的一封信:text]
   亲爱的，
   提笔写这封信的时候，窗外正下着小雨...
   （根据角色性格展开，300-500字）"

3. 📰 新闻/媒体稿（300-800字）：
   - 必须符合新闻稿格式：标题、导语、正文、结语
   - 客观专业的媒体语言
   - 包含时间、地点、人物、事件等新闻要素
   - 段落结构清晰，像真正的新闻报道
   示例："[发文档:Souvenir品牌升级发布会新闻:text]
   【导语】2024年11月10日，Souvenir品牌在上海举办新品发布会...
   
   【背景】作为国内领先的轻奢餐饮品牌...
   
   【亮点】此次发布会推出...
   
   【影响】业内人士认为..."

3.1 🔥 八卦爆料（200-600字）：
   - 使用口语化、有热度的语言
   - 包含爆料点、细节、传闻、反转等元素
   - 像真实的娱乐八卦或爆料贴
   示例："[发文档:某明星恋情八卦:text]
   🔥爆料来了！据说XX和YY在一起了！
   
   知情人透露：上周末在某高档餐厅目击...
   
   细节曝光：两人行为亲密，男方还...
   
   但也有人说：这可能是...（反转）
   
   吃瓜群众：坐等官宣/辟谣..."

3.2 📕 小红书笔记（200-500字）：
   - 使用小红书特有的语言风格和表情
   - 包含：开头吸引、正文种草、总结推荐
   - 多用"！""姐妹们""宝子们""绝绝子"等流行词
   - 分点清晰，标注重点
   示例："[发文档:Souvenir探店小红书:text]
   姐妹们！！！这家店我必须安利给你们💕
   
   📍地址：上海XX路XX号
   ⏰营业时间：11:00-22:00
   💰人均：180元
   
   ✨环境✨
   一进门就被氛围感拉满！！！复古装修绝了...
   
   🍰推荐菜品🍰
   1️⃣招牌甜品：颜值爆表，好吃到流泪😭
   2️⃣特色套餐：分量足，CP值很高...
   
   💡小tips💡
   - 记得提前预约！现场排队超久
   - 靠窗位置超级出片📸
   
   总之强烈推荐！姐妹们冲冲冲！！！"

3.3 💬 公众号文章（400-1000字）：
   - 符合公众号文章格式和排版习惯
   - 标题吸引眼球，正文分段清晰
   - 可以有引导关注、往期回顾等元素
   - 语言生动，有故事性或干货价值
   示例："[发文档:Souvenir的美学哲学公众号:text]
   在快节奏的都市生活中，我们总是匆匆忙忙...
   
   【Souvenir的诞生】
   2020年，创始人在巴黎的一次旅行中...
   
   【时间的窗语】
   这个系列的灵感来源于四季更迭...
   
   【美食即艺术】
   每一道菜品的呈现都是一次视觉盛宴...
   
   ▼ 点击阅读往期精彩 ▼
   《XX》《YY》
   
   ---
   📍门店地址 | 💬客服微信
   点击"在看"，分享给更多朋友"

3.4 📖 同人文/小说（500-2000字）：
   - 要有情节、对话、场景描写
   - 符合小说的叙事结构和文学性
   - 人物性格鲜明，情节合理
   - 适当使用环境描写、心理描写
   示例："[发文档:XX×YY番外篇同人:text]
   第一章：重逢
   
   秋日的午后，阳光透过梧桐叶洒在石板路上...
   
   \"好久不见。\"他的声音依旧温柔。
   
   她抬起头，那张熟悉的脸庞...
   
   （完整故事情节，800-1500字）
   
   ---END---
   下一章预告：《XX》"

4. 📄 报告/分析类（400-1000字）：
   - 数据详实，分析深入
   - 包含图表描述、结论、建议
   - 专业术语准确，逻辑严密
   示例："[发文档:2024年Q3用户行为分析报告:text]
   摘要：本报告基于...
   
   一、数据概览
   - 活跃用户数：XX万...
   - 用户留存率：XX%...
   
   二、用户画像分析...
   
   三、行为特征...
   
   四、结论与建议..."

5. 📄 报告/分析类（400-1000字）：
   - 数据详实，分析深入
   - 包含图表描述、结论、建议
   - 专业术语准确，逻辑严密
   示例："[发文档:2024年Q3用户行为分析报告:text]
   摘要：本报告基于...
   
   一、数据概览
   - 活跃用户数：XX万...
   - 用户留存率：XX%...
   
   二、用户画像分析...
   
   三、行为特征...
   
   四、结论与建议..."

5.1 📝 测试/问卷类（100-500字）：
   - 趣味性强，有互动性
   - 题目清晰，选项合理
   - 可以有结果解析
   示例："[发文档:高级狗度测试卷:text]
   【测试说明】
   本测试用于评估你的"狗度"指数，请如实作答！
   
   第1题：朋友找你帮忙，你会？
   A. 二话不说立刻答应
   B. 看情况决定
   C. 委婉拒绝
   
   第2题：收到红包后你会？
   A. 立刻感谢，表达感激
   B. 简单回复谢谢
   C. 不说话直接收下
   
   ...（5-10题）
   
   【结果解析】
   A选项占多数：你的狗度爆表！
   B选项占多数：你的狗度适中
   C选项占多数：你还需要修炼..."

5.2 📚 攻略/教程类（300-800字）：
   - 步骤清晰，操作明确
   - 有技巧、注意事项
   - 实用性强
   示例："[发文档:Souvenir点餐全攻略:text]
   【新手必看】Souvenir完整点餐指南
   
   一、预约技巧
   1. 提前3-7天预约最佳...
   2. 工作日中午相对好订...
   
   二、必点菜品TOP5
   1️⃣ 招牌甜品...（推荐理由）
   2️⃣ 特色套餐...
   
   三、省钱小妙招
   - 会员日享8折...
   - 套餐比单点划算...
   
   四、拍照攻略
   最佳机位：靠窗位置..."

5.3 🎭 剧透/解析类（300-800字）：
   - 剧情详细，有分析
   - 包含细节、彩蛋、解读
   - 有观点和评价
   示例："[发文档:《非情勿入》剧透解析:text]
   ⚠️ 前方高能剧透预警！！！
   
   【剧情概要】
   林季斯和周子谦被困在密室...
   
   【细节分析】
   1. 开头的暗示：周子谦的眼神...
   2. 转折点：当林季斯发现...
   
   【隐藏彩蛋】
   - 第3章的对话其实是...
   - 结局的伏笔在第1章...
   
   【个人评价】
   车速有点快，但情感铺垫到位..."

5.4 🎨 创作灵感/设定集（200-600字）：
   - 世界观、人物设定详细
   - 有创意、有细节
   - 可以是角色介绍、故事大纲等
   示例："[发文档:《非情勿入》角色设定:text]
   【林季斯】
   - 性格：外冷内热...
   - 特点：理性、克制...
   - 弱点：对周子谦没有抵抗力
   
   【周子谦】
   - 性格：温柔、细腻...
   - 特点：善解人意...
   - 关系：暗恋林季斯多年
   
   【故事背景】
   密室逃脱游戏的设定..."

5.5 📖 书籍/影评推荐（300-600字）：
   - 简介、评价、推荐理由
   - 有亮点分析
   - 客观专业
   示例："[发文档:《非情勿入》书评推荐:text]
   【作品信息】
   作者：XX | 类型：现代都市
   完结 | 字数：30万字
   
   【剧情简介】
   灵感来自于那个经典的梗...
   
   【亮点分析】
   ⭐ 感情线铺垫自然
   ⭐ 人物性格鲜明
   ⭐ 车速适中，不拖沓
   
   【适合人群】
   喜欢都市情感文的读者
   
   【推荐指数】★★★★☆"

6. 💻 代码文档（使用code类型）：
   - 包含注释、说明
   - 代码规范，可运行
   示例："[发文档:用户登录模块:code]
   // 用户登录验证
   function validateLogin(username, password) {
     // 参数验证...
   }"

注意事项：
- 内容长度要足够（测试类至少100字，其他至少200字，专业文档建议500字+）
- 不要敷衍，像真实内容一样写
- 根据内容类型严格遵守对应的格式规范
- 内容充实，有实际价值，不要只写大纲
- 适用场景：写信、策划案、新闻稿、八卦、小红书、公众号、同人文、报告、测试、攻略、剧透、设定、书评等
- 卡片会自动识别类型并显示对应的图标和标签

【📖 理解用户文档】：
当用户发送文档给你时，系统会将文档的完整内容注入到对话中，格式如下：
[用户发送了文本文档/Markdown文档/代码文档]
标题：XXX
内容：
（完整的文档内容）

你需要：
1. 认真阅读和理解文档内容
2. 根据文档内容给出自然、真实的回复
3. 像普通人一样回应，不要说"我看到了文档"之类的话
4. 可以针对文档内容提问、评论、给建议，或者表达感受
5. 回复要符合你的角色性格和语言风格

示例场景：
- 用户发了一份策划案 → 认真阅读后给出专业建议或评价
- 用户发了一封信 → 理解信件内容后表达你的感受和回应
- 用户发了代码 → 查看代码逻辑，给出意见或帮助debug
- 用户发了小说/文章 → 阅读后给出真实的读后感

【💰 接收红包转账规则】：
当收到用户红包/转账时，根据你的性格和关系决定是否接收：

接收格式（会以转账形式返回）：
- [接收红包:留言] - 接收红包并表达感谢
- [接收转账:留言] - 接收转账并说明
示例："太感谢了！[接收红包:谢谢你的心意]"

退回格式（会以转账形式返回）：
- [退回红包:留言] - 退回红包并说明理由
- [退回转账:留言] - 退回转账并说明理由  
示例："不用这么客气 [退回红包:我们这么熟不用红包啦]"

注意：
- 接收/退回都会以转账气泡的形式显示，不是普通文字
- 留言要简短自然，10字以内
- 根据关系和金额合理判断

【🎁 订单/礼物规则】：
你可能会收到用户送的礼物或代付请求：
- 礼物订单：用户给你买了礼物，根据关系和商品价值决定是否接受
- 代付请求：用户请你帮忙付款，根据关系、金额和理由决定是否同意

收到订单后的回复格式：
- 接受礼物："好喜欢！谢谢你 [接受礼物]"
- 退回礼物："太贵重了，我不能收 [退回礼物]"
- 同意代付："没问题，我帮你付 [同意代付]"
- 拒绝代付："抱歉，最近手头有点紧 [拒绝代付]"

【🛍️ 主动送礼物/购物规则】：
你也可以主动给用户送礼物！格式如下：
[送礼物:商品名称:价格:留言]

示例场景：
- 用户生日："生日快乐！[送礼物:生日蛋糕:88:祝你生日快乐]"
- 感谢用户："谢谢你一直陪我聊天 [送礼物:奶茶:15:请你喝奶茶]"
- 节日祝福："圣诞快乐！[送礼物:圣诞礼盒:128:节日快乐]"
- 道歉补偿："对不起让你生气了 [送礼物:巧克力:58:别生气啦]"

注意事项：
- 根据关系亲密度选择合适价格的礼物
- 礼物要符合当前对话情境
- 不要频繁送礼，要在特殊时机
- 你的余额有限（初始500元），合理使用

记住：像真人一样使用这些功能，在合适的时机自然地发送红包、转账、文档或礼物。`
        : conversation.type === 'group'
        ? '你是一个群聊助手，可以参与多人对话。使用自然口语表达，不要使用斜杠（/）等书面符号。'
        : '你是一个AI助手。使用自然口语表达，不要使用斜杠（/）等书面符号。';

      // 添加用户资料信息
      systemPrompt += userInfoPrompt;
      
      // 🧠 记忆系统加载逻辑（根据配置开关）
      const memoryEnabled = conversation.characterSettings?.memoryConfig?.enabled ?? true;
      
      if (conversation.enabledFeatures?.includes('memory-system')) {
        if (memoryEnabled) {
          // ✅ 完整记忆模式：每次对话都加载记忆
          console.log('🧠 完整记忆模式：加载所有重要记忆');
          const allMemories = getConversationMemories(conversation.id);
          const importantMemories = allMemories
            .filter(m => m.importance === 'high' || m.importance === 'medium')
            .slice(0, 10); // 完整模式加载更多记忆
          const memoryContext = applyMemoriesToContext(conversation, importantMemories);
          systemPrompt += memoryContext;
        } else {
          // ⚡ 性能优化模式：只在用户明确询问时才加载记忆
          const shouldLoadMemory = 
            lastUserMsgForTime?.content?.includes('记得') ||
            lastUserMsgForTime?.content?.includes('记忆') ||
            lastUserMsgForTime?.content?.includes('之前') ||
            lastUserMsgForTime?.content?.includes('上次') ||
            lastUserMsgForTime?.content?.includes('还记得') ||
            lastUserMsgForTime?.content?.includes('忘了');
          
          if (shouldLoadMemory) {
            console.log('🧠 检测到记忆相关询问，加载记忆系统');
            const allMemories = getConversationMemories(conversation.id);
            const importantMemories = allMemories
              .filter(m => m.importance === 'high' || m.importance === 'medium')
              .slice(0, 5); // 性能模式加载较少记忆
            const memoryContext = applyMemoriesToContext(conversation, importantMemories);
            systemPrompt += memoryContext;
          }
        }
      }
      
      // 📸 朋友圈记忆加载逻辑（根据配置开关）
      const momentsMemoryEnabled = conversation.characterSettings?.momentsMemoryConfig?.enabled ?? true;
      
      if (momentsMemoryEnabled) {
        // ✅ 朋友圈记忆开启：只在用户询问时加载
        const shouldLoadMoments = 
          lastUserMsgForTime?.content?.includes('朋友圈') ||
          lastUserMsgForTime?.content?.includes('发了什么') ||
          lastUserMsgForTime?.content?.includes('最近在干嘛') ||
          lastUserMsgForTime?.content?.includes('动态') ||
          lastUserMsgForTime?.content?.includes('分享');
        
        if (shouldLoadMoments) {
          console.log('📱 检测到朋友圈相关询问，加载朋友圈数据');
          try {
            const momentsData = await getMomentsData(conversation.id);
            if (momentsData.posts && momentsData.posts.length > 0) {
              const now = Date.now();
              const recentPosts = momentsData.posts.slice(0, 3); // 开启记忆时加载更多条
              let momentsContext = '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
              momentsContext += '【📱 你最近发的朋友圈】\n';
              momentsContext += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
              
              recentPosts.forEach((post, index) => {
                const timeDiff = now - post.timestamp;
                const daysDiff = Math.floor(timeDiff / 86400000);
                const hoursDiff = Math.floor(timeDiff / 3600000);
                
                // 更精确的时间描述
                let timeDesc: string;
                if (daysDiff === 0) {
                  if (hoursDiff === 0) {
                    timeDesc = '刚刚';
                  } else if (hoursDiff < 2) {
                    timeDesc = '1小时前';
                  } else {
                    timeDesc = `今天 ${hoursDiff}小时前`;
                  }
                } else if (daysDiff === 1) {
                  timeDesc = '昨天';
                } else if (daysDiff === 2) {
                  timeDesc = '前天';
                } else if (daysDiff < 7) {
                  timeDesc = `${daysDiff}天前`;
                } else {
                  const weeksDiff = Math.floor(daysDiff / 7);
                  timeDesc = `${weeksDiff}周前`;
                }
                
                momentsContext += `${index + 1}. 【${timeDesc}】${post.content}`;
                if (post.imageDescriptions && post.imageDescriptions.length > 0) {
                  momentsContext += ` (配图${post.imageDescriptions.length}张)`;
                }
                momentsContext += '\n';
              });
              
              momentsContext += '\n⚠️ 注意：以上是你的朋友圈历史记录，请准确使用时间描述（如"昨天"、"3天前"），不要把过去的事说成"今天"或"刚才"。\n';
              momentsContext += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
              
              systemPrompt += momentsContext;
            }
          } catch (error) {
            console.error('获取朋友圈数据失败:', error);
          }
        }
      } else {
        console.log('⚡ 朋友圈记忆已关闭，不加载朋友圈内容');
      }
      
      // 添加时间感知信息
      systemPrompt += timeAwarePrompt;

      let messages;
      let requestBody;

      // 如果包含图片，使用vision API（支持图片+文字混合）
      if (hasImage) {
        // 构建包含图片的消息
        const recentMessages = conversation.messages.slice(-5); // 🔥 性能优化：从10条减少到5条
        const historyMessages = recentMessages
          .filter(m => !unhandledUserMessages.includes(m))
          .map(m => ({
            role: m.role,
            content: m.content
          }));

        // 构建混合内容（多图片 + 用户的文字消息）
        const contentParts: any[] = [];
        
        // 添加所有图片
        imageMessages.forEach(imgMsg => {
          contentParts.push({
            type: 'image_url',
            image_url: {
              url: imgMsg.mediaUrl
            }
          });
        });
        
        // 再添加文字消息
        const combinedText = textMessages.map(m => m.content).filter(Boolean).join('\n');
        if (combinedText) {
          contentParts.push({
            type: 'text',
            text: combinedText
          });
        } else {
          // 如果没有文字，根据图片数量添加提示
          const imageCount = imageMessages.length;
          const defaultText = imageCount > 1 ? `看这${imageCount}张图` : '看这张图';
          contentParts.push({
            type: 'text',
            text: defaultText
          });
        }

        messages = [
          { role: 'system', content: systemPrompt + '\n\n【图片识别规则】：\n- 只描述你在图片中实际看到的内容\n- 禁止编造、猜测图片中不存在的元素\n- 禁止说"让我看看""帮你看看"等话，直接自然反应即可\n- 不确定的内容不要说\n- 像朋友间日常聊天一样回复，不要太正式\n- 可以回复文字，也可以回复图片/视频/语音/表情包/红包等\n- 如果用户除了图片还发了文字消息，一起回复所有内容' },
          ...historyMessages,
          {
            role: 'user',
            content: contentParts
          }
        ];

        requestBody = {
          model: apiConfig.modelName,
          messages,
          temperature: 0.4
        };
      } else if (hasVideo) {
        // 如果包含视频，基于文字描述回复（支持视频+文字混合）
        const recentMessages = conversation.messages.slice(-5); // 🔥 性能优化：从10条减少到5条
        const historyMessages = recentMessages
          .filter(m => !unhandledUserMessages.includes(m))
          .map(m => ({
            role: m.role,
            content: m.content
          }));

        // 组合视频描述和文字消息
        const videoMessage = unhandledUserMessages.find(m => m.mediaType === 'video');
        const combinedText = textMessages.map(m => m.content).filter(Boolean).join('\n');
        const videoContent = videoMessage?.mediaDescription 
          ? `（分享了视频：${videoMessage.mediaDescription}）${combinedText ? '\n' + combinedText : ''}`
          : combinedText;

        messages = [
          { role: 'system', content: systemPrompt + '\n\n【视频内容理解规则】：\n- 用户分享了视频，根据提供的内容描述自然回复\n- 像朋友间日常聊天一样对视频内容做出反应\n- 不要说"我看不到视频"、"无法观看"等话\n- 基于描述内容自然地评论、提问或互动\n- 可以回复文字，也可以回复图片/视频/语音/表情包/红包等\n- 如果用户除了视频还发了文字消息，一起回复所有内容' },
          ...historyMessages,
          {
            role: 'user',
            content: videoContent
          }
        ];

        requestBody = {
          model: apiConfig.modelName,
          messages,
          temperature: 0.7
        };
      } else if (hasVoice) {
        // 如果包含语音，基于语音转文字内容回复（支持语音+文字混合）
        const recentMessages = conversation.messages.slice(-5); // 🔥 性能优化：从10条减少到5条
        const historyMessages = recentMessages
          .filter(m => !unhandledUserMessages.includes(m))
          .map(m => ({
            role: m.role,
            content: m.mediaType === 'voice' && m.mediaDescription ? m.mediaDescription : m.content
          }));

        // 组合语音转文字和其他文字消息
        const voiceMessages = unhandledUserMessages.filter(m => m.mediaType === 'voice');
        const voiceTexts = voiceMessages.map(m => m.mediaDescription).filter(Boolean);
        const textContents = textMessages.map(m => m.content).filter(Boolean);
        const combinedContent = [...voiceTexts, ...textContents].join('\n');

        messages = [
          { role: 'system', content: systemPrompt + '\n\n【语音消息理解规则】：\n- 用户发送了语音消息，根据语音转文字的内容自然回复\n- 像朋友间日常聊天一样对语音内容做出反应\n- 不要说"我听不到语音"、"无法播放"等话\n- 基于转录的文字内容自然回复即可\n- 可以回复文字，也可以回复语音/图片/视频/表情包/红包等\n- 如果用户除了语音还发了文字消息，一起回复所有内容' },
          ...historyMessages,
          {
            role: 'user',
            content: combinedContent
          }
        ];

        requestBody = {
          model: apiConfig.modelName,
          messages,
          temperature: 0.7
        };
      } else if (hasSticker) {
        // 如果包含表情包，理解并自然回复（支持表情包+文字混合）
        const recentMessages = conversation.messages.slice(-5); // 🔥 性能优化：从10条减少到5条
        const historyMessages = recentMessages
          .filter(m => !unhandledUserMessages.includes(m))
          .map(m => ({
            role: m.role,
            content: m.content
          }));

        // 组合表情包和文字消息
        const stickerMessages = unhandledUserMessages.filter(m => m.mediaType === 'sticker');
        const stickerContents = stickerMessages.map(m => `[表情包:${m.mediaDescription}]`).filter(Boolean);
        const textContents = textMessages.map(m => m.content).filter(Boolean);
        const combinedContent = [...stickerContents, ...textContents].join('\n');

        messages = [
          { role: 'system', content: systemPrompt + '\n\n【表情包理解规则】：\n- 用户发送了表情包，根据描述的内容理解用户的情绪和意图\n- 像朋友间日常聊天一样对表情包做出自然反应\n- 可以回复文字、也可以回复表情包（使用[表情包:描述内容]格式）\n- 根据表情包内容判断是否要发送图片/视频/语音/表情包回复\n- 如果用户除了表情包还发了文字消息，一起回复所有内容\n\n【发送多媒体消息格式】：\n- 发送图片：[图片:详细的图片内容描述，10-50字，要生动具体]\n- 发送视频：[视频:详细的视频内容描述，10-50字]\n- 发送语音：[语音:语音内容的文字，时长X秒]\n- 发送表情包：[表情包:表情包的详细描述]\n\n示例：\n用户：[表情包:一只猫咪害羞捂脸]\nAI：哈哈哈好可爱！[表情包:小狗狗笑得很开心的样子]' },
          ...historyMessages,
          {
            role: 'user',
            content: combinedContent
          }
        ];

        requestBody = {
          model: apiConfig.modelName,
          messages,
          temperature: 0.8
        };
      } else {
        // 普通文本消息
        
        // 📝 自定义上下文数量（根据配置开关）
        const contextConfigEnabled = conversation.characterSettings?.contextConfig?.enabled || false;
        const contextMessageCount = conversation.characterSettings?.contextConfig?.messageCount || 20;
        
        let contextMessages;
        if (contextConfigEnabled) {
          // ✅ 自定义上下文数量
          console.log(`📝 自定义上下文：发送最近 ${contextMessageCount} 条消息`);
          contextMessages = conversation.messages.slice(-contextMessageCount);
        } else {
          // ⚡ 默认模式：发送所有消息
          console.log('⚡ 默认上下文：发送所有历史消息');
          contextMessages = conversation.messages;
        }
        
        messages = [
          { role: 'system', content: contextPrompt },
          ...contextMessages.map(m => {
            // 如果消息包含引用，添加引用信息到内容中
            let content = m.content;
            if (m.replyTo) {
              const quotedRole = m.replyTo.role === 'user' ? '我' : '你';
              content = `[回复 ${quotedRole} 说的"${m.replyTo.content}"]\n${m.content}`;
            }
            
            // 💰 注入红包/转账信息
            if (m.moneyTransfer) {
              const mt = m.moneyTransfer;
              const typeText = mt.type === 'redPacket' ? '红包' : '转账';
              const extraInfo = `\n[${m.role === 'user' ? '用户' : '你'}发送了${typeText}]
金额：¥${mt.amount}${mt.message ? `\n留言：${mt.message}` : ''}
状态：${mt.status === 'pending' ? '待领取' : mt.status === 'received' ? '已领取' : '已退回'}`;
              content = content ? content + extraInfo : extraInfo;
            }
            
            // 🎁 注入订单信息
            if (m.order) {
              const order = m.order;
              const typeText = order.type === 'gift' ? '礼物' : '代付请求';
              const productList = order.products.map(p => `${p.name} ¥${p.price}`).join('、');
              const extraInfo = `\n[${m.role === 'user' ? '用户' : '你'}发送了${typeText}]
商品：${productList}
总金额：¥${order.totalAmount}${order.message ? `\n留言：${order.message}` : ''}
状态：${order.status === 'pending' ? '待处理' : order.status === 'accepted' ? '已接受' : order.status === 'paid' ? '已支付' : '已拒绝'}`;
              content = content ? content + extraInfo : extraInfo;
            }
            
            // 📄 注入文档信息 - 让AI能够读取和理解用户发送的文档
            if (m.document && m.role === 'user') {
              const doc = m.document;
              const typeText = doc.type === 'text' ? '文本文档' : doc.type === 'markdown' ? 'Markdown文档' : '代码文档';
              const extraInfo = `\n[用户发送了${typeText}]
标题：${doc.title}
内容：
${doc.content}`;
              content = content ? content + extraInfo : extraInfo;
            }
            
            return {
              role: m.role,
              content: content,
            };
          }),
        ];

        requestBody = {
          model: apiConfig.modelName,
          messages
        };
      }

      // 🚀 使用后台任务，不阻塞用户
      console.log('🚀 创建后台AI生成任务...');
      
      // 🎬 保持"消息发送中"提示，模拟输入动画将在下面逐条显示
      // 用户可以退出页面，但如果留在页面则会看到完整的输入过程
      
      // 创建后台任务
      await backgroundTaskManager.createGenerationTask(
        conversation,
        apiConfig,
        requestBody,
        async (newMessages: Message[], conversationId: string, error?: string) => {
          // 后台任务完成回调
          console.log(`✅ 后台任务完成，收到${newMessages.length}条消息${error ? `，错误: ${error}` : ''}`);
          
          // 🔥 清理loading状态
          setShowSendingHint(false);
          setShowTyping(false);
          setIsGenerating(false);
          
          // 🔥 关键修复：区分API失败和AI不回复
          if (newMessages.length === 0) {
            // 情况1：API调用失败（有error）
            if (error) {
              console.error('❌ API调用失败:', error);
              
              // 显示详细的错误提示弹窗
              alert(error);
              
              // 添加错误提示到聊天记录
              const errorMessage: Message = {
                id: Date.now().toString(),
                role: 'system',
                content: `⚠️ 消息发送失败\n\n${error}`,
                timestamp: Date.now(),
              };
              
              // 从localStorage获取最新的消息列表
              const storedConversations = localStorage.getItem('conversations');
              if (storedConversations) {
                const allConversations = JSON.parse(storedConversations) as Conversation[];
                const currentConversation = allConversations.find((c: Conversation) => c.id === conversationId);
                if (currentConversation) {
                  onUpdateConversation(conversationId, {
                    messages: [...currentConversation.messages, errorMessage],
                    lastMessageTime: Date.now(),
                  });
                }
              }
              
              return;
            }
            
            // 情况2：AI选择不回复（无error）
            console.log('💬 AI选择不回复');
            
            // 🔥 生成智能的上下文不回复提示，作为系统消息添加到聊天记录
            generateContextualHint(conversation).then(contextualHint => {
              const systemMessage: Message = {
                id: Date.now().toString(),
                role: 'system',
                content: contextualHint,
                timestamp: Date.now(),
              };
              
              // 从localStorage获取最新的消息列表
              const storedConversations = localStorage.getItem('conversations');
              if (storedConversations) {
                const allConversations = JSON.parse(storedConversations) as Conversation[];
                const currentConversation = allConversations.find((c: Conversation) => c.id === conversationId);
                if (currentConversation) {
                  onUpdateConversation(conversationId, {
                    messages: [...currentConversation.messages, systemMessage],
                    lastMessageTime: Date.now(),
                  });
                }
              }
            });
            
            return;
          }
          
          // 🎯 检查用户是否还在当前聊天页面
          const userStillOnPage = isComponentMountedRef.current;
          
          // 获取最新的conversation（可能已经从localStorage更新了）
          const latestConversationData = localStorage.getItem('conversations');
          let currentMessages = [...conversation.messages];
          
          if (latestConversationData) {
            try {
              const conversations = JSON.parse(latestConversationData);
              const latestConv = conversations.find((c: Conversation) => c.id === conversationId);
              if (latestConv) {
                currentMessages = [...latestConv.messages];
              }
            } catch (e) {
              console.error('Failed to get latest conversation:', e);
            }
          }
          
          if (userStillOnPage) {
            // 👤 用户还在页面：显示完整的输入动画
            console.log('用户还在页面，显示输入动画');
            
            for (let i = 0; i < newMessages.length; i++) {
              // 显示输入动画
              setShowTyping(true);
              
              // 第一次显示输入动画时，隐藏"消息发送中"提示
              if (i === 0) {
                setShowSendingHint(false);
              }
              
              // 等待0.8-2秒模拟输入
              await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
              
              // 隐藏输入动画
              setShowTyping(false);
              
              // 添加这条消息到conversation
              currentMessages = [...currentMessages, newMessages[i]];
              onUpdateConversation(conversationId, {
                messages: currentMessages,
                lastMessageTime: Date.now(),
              });
              
              // 🎁 处理订单响应（如果AI回复包含订单响应标记）
              if (newMessages[i].content) {
                processAIOrderResponse(newMessages[i]);
              }
              
              // 💰 处理红包/转账响应（如果AI回复包含红包响应）
              if (newMessages[i].moneyTransfer) {
                processAIMoneyResponse(newMessages[i]);
              }
              
              // 短暂停顿再显示下一条
              if (i < newMessages.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
              }
            }
            
            // 所有消息显示完毕，隐藏生成状态
            setIsGenerating(false);
            
          } else {
            // 🚀 用户已离开：直接添加所有消息，不显示动画
            console.log('用户已离开页面，直接添加所有消息并显示通知');
            
            // 直接添加所有消息
            currentMessages = [...currentMessages, ...newMessages];
            onUpdateConversation(conversationId, {
              messages: currentMessages,
              lastMessageTime: Date.now(),
            });
            
            // 🎁 处理订单响应（用户离开的情况下也要处理）
            newMessages.forEach(msg => {
              if (msg.content) {
                processAIOrderResponse(msg);
              }
              // 💰 处理红包/转账响应
              if (msg.moneyTransfer) {
                processAIMoneyResponse(msg);
              }
            });
            
            // 显示消息通知（用户已离开页面）
            showMessageNotification(conversationId, newMessages);
          }
          
          // 使用最终的消息列表（确保同步）
          const updatedMessages = currentMessages;
          
          // 🚀 性能优化：完全后台异步处理，不阻塞主流程
          // 使用setTimeout确保在下一个事件循环中执行，不影响用户体验
          setTimeout(() => {
            // 分析AI消息更新状态
            if (conversation.type === 'private' && conversation.characterSettings && newMessages.length > 0) {
              const firstMessageContent = newMessages[0].content;
              // 只在重要消息时更新AI状态
              const shouldUpdateStatus = 
                firstMessageContent.includes('在哪') ||
                firstMessageContent.includes('去了') ||
                firstMessageContent.includes('到了') ||
                firstMessageContent.includes('回家') ||
                firstMessageContent.includes('出门');
                
              if (shouldUpdateStatus) {
                analyzeAndUpdateStatusFromAI(conversation.id, firstMessageContent)
                  .then(() => getAIStatus(conversation.id))
                  .then(status => {
                    if (status && isComponentMountedRef.current) setAIStatus(status);
                  })
                  .catch(err => console.error('后台更新AI状态失败:', err));
              }
            }
            
            // 🧠 记忆总结完全后台处理
            if (conversation.enabledFeatures?.includes('memory-system')) {
              if (shouldTriggerAutoSummary(conversation.id, updatedMessages.length)) {
                console.log('🧠 触发自动记忆总结（完全后台）');
                performMemorySummary(updatedMessages).catch(err => {
                  console.error('记忆总结失败:', err);
                  updateSummaryCounter(conversation.id, updatedMessages.length);
                });
              }
            }
            
            // 📸 检测是否请求AI发朋友圈
            const lastUserMessage = updatedMessages
              .filter(m => m.role === 'user')
              .slice(-1)[0];
            
            if (lastUserMessage && onRequestAIMoment) {
              const content = lastUserMessage.content.toLowerCase();
              if (content.includes('发朋友圈') || content.includes('发个朋友圈') || 
                  content.includes('发条朋友圈') || content.includes('发动态')) {
                console.log('检测到用户请求AI发朋友圈');
                onRequestAIMoment().catch(err => console.error('手动触发AI朋友圈失败:', err));
              }
            }
          }, 0); // 延迟到下一个事件循环，确保不阻塞UI
          
          // 🔥 热梗系统已删除
        }
      );
      
      console.log('✅ 后台任务已创建，可以自由切换页面了');
      
    } catch (error) {
      console.error('Generate failed:', error);
      alert('生成失败，请检查配置和网络');
      setShowSendingHint(false);
      setShowTyping(false);
      setIsGenerating(false);
    }
  };

  // 旧的同步代码已被删除，现在使用后台任务
  /*
  const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorInfo = await getErrorFromResponse(response);
        throw new Error(formatErrorMessage(errorInfo));
      }

      const data = await response.json();
      let assistantMessage = data.choices[0]?.message?.content;
      
      // 清理AI回复中的内部思考内容和引用链接
      if (assistantMessage) {
        // 移除常见的内部思考模式
        assistantMessage = assistantMessage
          // 移除"silently..."开头的内部思考
          .replace(/^silently\s+.*?(?=\n|$)/gmi, '')
          // 移除"[thinking]"或类似的标记
          .replace(/\[thinking\].*?\[\/thinking\]/gs, '')
          .replace(/\[internal.*?\].*?(?=\n|$)/gmi, '')
          // 移除JSON格式的数据块（如搜索查询等）
          .replace(/\{[\s\S]*?"box_id"[\s\S]*?\}/g, '')
          .replace(/\{[\s\S]*?"search_query"[\s\S]*?\}/g, '')
          // 移除独立的JSON数组（但保护媒体标记：图片、视频、语音、表情包）
          .replace(/^\s*\[(?!图片|视频|语音|表情包)[\s\S]*?\]\s*$/gm, '')
          // 移除to understand/to inform等内部说明
          .replace(/^.*?(to understand|to inform|to analyze).*?(?=\n|$)/gmi, '')
          // 移除引用部分（主要引用:、引用:、参考资料: 等开头的部分及后续链接）
          .replace(/(?:主要)?引用[:：]\s*[\s\S]*$/gmi, '')
          .replace(/参考资料[:：]\s*[\s\S]*$/gmi, '')
          .replace(/来源[:：]\s*[\s\S]*$/gmi, '')
          .replace(/资料来源[:：]\s*[\s\S]*$/gmi, '')
          // 移除 [数字] 格式的引用标记和紧随的链接
          .replace(/\[\d+\]\s*\[.*?\]\s*\(https?:\/\/[^\)]+\)/g, '')
          .replace(/\[\d+\]\s*\(https?:\/\/[^\)]+\)/g, '')
          .replace(/\[\d+\]/g, '')
          // 移除Markdown链接格式 [text](url)
          .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '')
          // 移除单独的引用链接
          .replace(/\(https?:\/\/[^\)]+\)/g, '')
          // 移除独立成行的完整URL
          .replace(/^\s*\[?\]?https?:\/\/[^\s]+\s*$/gm, '')
          // 移除残留的[]空括号
          .replace(/\[\s*\]/g, '')
          // 清理多余的空行
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        
        // 使用cleanAIMessage清理Markdown格式（**加粗**、列表标记等）
        assistantMessage = cleanAIMessage(assistantMessage);
      }
      
      // 检查空回复
      if (!assistantMessage || assistantMessage.trim() === '') {
        setShowSendingHint(false);
        setShowTyping(false);
        setIsGenerating(false);
        
        // 检查是否是API错误（有error字段或HTTP状态码不是200）
        const isApiError = data.error || response.status !== 200 || !data.choices || data.choices.length === 0;
        
        if (isApiError) {
          // 显示详细的错误弹窗
          const errorDetails = [];
          if (!data.choices || data.choices.length === 0) {
            errorDetails.push('- API未返回有效的回复内容');
          }
          if (data.error) {
            errorDetails.push(`- API错误: ${data.error.message || '未知错误'}`);
          }
          if (response.status !== 200) {
            errorDetails.push(`- HTTP状态码: ${response.status}`);
          }
          
          alert(`AI回复失败\n\n可能的原因：\n${errorDetails.length > 0 ? errorDetails.join('\n') : '- API返回了空内容\n- 请检查网络连接\n- 请确认API配置正确\n- 尝试刷新页面重试'}`);
        } else {
          // AI选择不回复，显示智能上下文提示
          console.log('💬 AI选择不回复此消息（空回复）');
          
          generateContextualHint(conversation).then(contextualHint => {
            setTimeout(() => {
              const hint = document.createElement('div');
              hint.textContent = contextualHint;
              hint.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.75);
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                z-index: 10000;
                animation: fadeInOut 2.5s ease-in-out;
                max-width: 80%;
                text-align: center;
              `;
              document.body.appendChild(hint);
              setTimeout(() => hint.remove(), 2500);
            }, 300);
          });
        }
        
        return;
      }
      
      // 检查AI是否选择不回复
      if (assistantMessage.trim() === '[不回复]' || assistantMessage.includes('[不回复]')) {
        console.log('💬 AI选择不回复此消息');
        setShowSendingHint(false);
        setShowTyping(false);
        setIsGenerating(false);
        
        // 异步生成并显示提示（用户在页面时显示浮动提示框）
        generateContextualHint(conversation).then(contextualHint => {
          setTimeout(() => {
            const hint = document.createElement('div');
            hint.textContent = contextualHint;
            hint.style.cssText = `
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: rgba(0, 0, 0, 0.75);
              color: white;
              padding: 12px 24px;
              border-radius: 8px;
              font-size: 14px;
              z-index: 10000;
              animation: fadeInOut 2.5s ease-in-out;
              max-width: 80%;
              text-align: center;
            `;
            document.body.appendChild(hint);
            setTimeout(() => hint.remove(), 2500);
          }, 300);
        });
        
        return;
      }

      // 智能切分消息
      const splitMsgs = splitMessages(assistantMessage);
      
      // 限制单次发送的消息气泡数量，最多23条
      const limitedMessages = splitMsgs.slice(0, 23);
      const remainingMsgs = splitMsgs.slice(23);
      
      if (remainingMsgs.length > 0) {
        console.log(`AI回复被截断：原${splitMsgs.length}条消息，限制为23条`);
        setPendingMessages(remainingMsgs);
      }
      
      // 逐条显示AI消息，每条前都显示输入动画
      let currentMessages = [...conversation.messages];
      
      for (let i = 0; i < limitedMessages.length; i++) {
        // 显示输入动画
        setShowTyping(true);
        
        // 第一次显示输入动画时，隐藏"消息发送中"提示
        if (i === 0) {
          setShowSendingHint(false);
        }
        
        // 等待1-2秒模拟输入
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
        
        // 隐藏输入动画，显示消息
        setShowTyping(false);
        
        // 解析消息中的多媒体标记
        const msgContent = limitedMessages[i].trim();
        const imageMatch = msgContent.match(/\[图片[:：]([^\]]+)\]/);
        const videoMatch = msgContent.match(/\[视频[:：]([^\]]+)\]/);
        // 修改语音正则：更宽松地匹配语音内容，支持包含标点符号的内容
        const voiceMatch = msgContent.match(/\[语音[:：](.+?)(?:[，,]\s*(?:时长)?(\d+)秒?)?\]/);
        const stickerMatch = msgContent.match(/\[表情包[:：]([^\]]+)\]/);
        
        let newMessage: Message;
        
        if (imageMatch) {
          // AI发送图片
          const cleanContent = msgContent.replace(/\[图片[:：][^\]]+\]/, '').trim();
          newMessage = {
            id: Date.now().toString() + '_ai_' + i + Math.random(),
            role: 'assistant' as const,
            content: cleanContent || '[图片]',
            timestamp: Date.now(),
            mediaType: 'image',
            mediaDescription: imageMatch[1],
            isMediaDescriptionOnly: true
          };
        } else if (videoMatch) {
          // AI发送视频
          const cleanContent = msgContent.replace(/\[视频[:：][^\]]+\]/, '').trim();
          newMessage = {
            id: Date.now().toString() + '_ai_' + i + Math.random(),
            role: 'assistant' as const,
            content: cleanContent || '[视频]',
            timestamp: Date.now(),
            mediaType: 'video',
            mediaDescription: videoMatch[1],
            isMediaDescriptionOnly: true
          };
        } else if (voiceMatch) {
          // AI发送语音
          const cleanContent = msgContent.replace(/\[语音[:：].+?\]/, '').trim();
          newMessage = {
            id: Date.now().toString() + '_ai_' + i + Math.random(),
            role: 'assistant' as const,
            content: cleanContent || '[语音]',
            timestamp: Date.now(),
            mediaType: 'voice',
            mediaDescription: voiceMatch[1].trim(), // 语音内容（去掉时长部分）
            voiceDuration: parseInt(voiceMatch[2]) || 3, // 时长（秒）
            isMediaDescriptionOnly: true
          };
        } else if (stickerMatch) {
          // AI发送表情包
          const cleanContent = msgContent.replace(/\[表情包[:：][^\]]+\]/, '').trim();
          newMessage = {
            id: Date.now().toString() + '_ai_' + i + Math.random(),
            role: 'assistant' as const,
            content: cleanContent || '[表情包]',
            timestamp: Date.now(),
            mediaType: 'sticker',
            mediaDescription: stickerMatch[1],
            isMediaDescriptionOnly: true
          };
        } else {
          // 普通文字消息
          newMessage = {
            id: Date.now().toString() + '_ai_' + i + Math.random(),
            role: 'assistant' as const,
            content: msgContent,
            timestamp: Date.now(),
          };
        }
        
        currentMessages = [...currentMessages, newMessage];
        
        // 更新消息列表
        onUpdateConversation(conversation.id, {
          messages: currentMessages,
          lastMessageTime: Date.now(),
        });
        
        // 短暂停顿再显示下一条
        if (i < limitedMessages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // 🎯 分析AI消息并更新状态
      if (conversation.type === 'private' && conversation.characterSettings && assistantMessage) {
        // 🔥 性能优化：仅在AI明确表达状态变化时更新
        if (assistantMessage.includes('我在') || assistantMessage.includes('我去') || 
            assistantMessage.includes('我到') || assistantMessage.includes('正在')) {
          await analyzeAndUpdateStatusFromAI(conversation.id, assistantMessage);
          const updatedStatus = await getAIStatus(conversation.id);
          if (updatedStatus) {
            setAIStatus(updatedStatus);
          }
        }
      }

      // 🧠 检查是否需要自动总结记忆
      if (conversation.enabledFeatures?.includes('memory-system')) {
        if (shouldTriggerAutoSummary(conversation.id, currentMessages.length)) {
          console.log('🧠 触发自动记忆总结，当前消息数:', currentMessages.length);
          performMemorySummary(currentMessages).catch(err => {
            console.error('记忆总结失败:', err);
            // 即使失败也更新计数器，避免重复尝试
            updateSummaryCounter(conversation.id, currentMessages.length);
          });
        }
      }

      // 检测是否请求AI发朋友圈
      const lastUserMessage = conversation.messages
        .filter(m => m.role === 'user')
        .slice(-1)[0];
      
      if (lastUserMessage && onRequestAIMoment) {
        const content = lastUserMessage.content.toLowerCase();
        if (content.includes('发朋友圈') || content.includes('发个朋友圈') || 
            content.includes('发条朋友圈') || content.includes('发动态')) {
          console.log('检测到用户请求AI发朋友圈');
          onRequestAIMoment().catch(err => console.error('手动触发AI朋友圈失败:', err));
        }
      }

      // 如果启用了热梗系统，检测用户消息中的梗
      if (conversation.enabledFeatures?.includes('meme-system')) {
        const lastUserMessage = conversation.messages
          .filter(m => m.role === 'user')
          .slice(-1)[0];
        
        if (lastUserMessage) {
          const detectedMemes = detectMemes(lastUserMessage.content);
          if (detectedMemes.length > 0) {
            console.log(`检测到热梗: ${detectedMemes.map(m => m.keyword).join(', ')}`);
          }
        }
      }
    } catch (error) {
      console.error('Generate failed:', error);
      alert('生成失败，请检查配置和网络');
      setShowSendingHint(false);
      setShowTyping(false);
    } finally {
      setIsGenerating(false);
    }
  };
  */

  // 🧠 执行记忆总结
  const performMemorySummary = async (currentMessages: Message[]) => {
    try {
      console.log('🧠 开始记忆总结...');
      const memoryBank = getMemoryBank(conversation.id);
      const summaryPrompt = buildMemorySummaryPrompt(currentMessages, memoryBank.memories);
      
      // 调用AI进行总结
      const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: apiConfig.modelName,
          messages: [
            { role: 'user', content: summaryPrompt }
          ],
          temperature: 0.3, // 使用较低温度以获得更准确的总结
        })
      });
      
      if (!response.ok) {
        const errorInfo = await getErrorFromResponse(response);
        console.error('记忆总结失败:', formatErrorMessage(errorInfo));
        return;
      }
      
      const data = await response.json();
      const summaryResponse = data.choices?.[0]?.message?.content;
      
      if (!summaryResponse) {
        console.error('未收到有效的记忆总结');
        return;
      }
      
      // 解析总结结果
      const memories = parseMemorySummaryResponse(summaryResponse);
      
      if (memories.length > 0) {
        console.log(`🧠 提取到 ${memories.length} 条新记忆`);
        
        // 添加到记忆库
        memories.forEach((mem: { content: string; importance: 'low' | 'medium' | 'high'; category?: string }) => {
          addMemory(conversation.id, mem.content, mem.importance, mem.category, true);
        });
        
        alert(`✅ 已保存 ${memories.length} 条记忆`);
      } else {
        console.log('🧠 本次对话没有值得记忆的新信息');
      }
      
      // 更新总结计数器
      updateSummaryCounter(conversation.id, currentMessages.length);
      
    } catch (error) {
      console.error('记忆总结失败:', error);
      // 即使失败也更新计数器，避免重复尝试
      updateSummaryCounter(conversation.id, currentMessages.length);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (currentInput.trim()) {
        handleSendMessage();
      }
    }
  };

  return (
    <>
    <div className="h-full bg-gradient-to-b from-gray-50 to-gray-100 relative" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\"20\" height=\"20\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M0 0h20v20H0z\" fill=\"%23fafafa\"/%3E%3Cpath d=\"M0 0h10v10H0z\" fill=\"%23f5f5f5\" fill-opacity=\".5\"/%3E%3C/svg%3E")' }}>
      {/* Header - 固定在顶部 */}
      <div className="absolute top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 -ml-1 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-800" strokeWidth={2.5} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-base font-semibold text-gray-900">{conversation.name}</h1>
            {conversation.type === 'private' && conversation.characterSettings ? (
              <button 
                onClick={() => {
                  console.log('🚀 打开行为轨迹弹窗');
                  setShowActivityModal(true);
                }}
                className="flex items-center gap-1 hover:bg-gray-50 px-2 py-0.5 -ml-2 rounded transition-colors text-left max-w-[200px]"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  aiStatus?.status === 'online' ? 'bg-green-500' :
                  aiStatus?.status === 'busy' ? 'bg-yellow-500' :
                  aiStatus?.status === 'resting' ? 'bg-blue-500' :
                  aiStatus?.status === 'away' ? 'bg-gray-400' :
                  'bg-gray-300'
                }`}></div>
                <span className="text-xs text-gray-500 truncate">
                  {aiStatus?.currentActivitySummary || aiStatus?.statusText || '在线'}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-500">在线</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 免打扰按钮 */}
          <button
            onClick={() => {
              onUpdateConversation(conversation.id, {
                isMuted: !conversation.isMuted
              });
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={conversation.isMuted ? '关闭免打扰' : '开启免打扰'}
          >
            {conversation.isMuted ? (
              <BellOff className="w-5 h-5 text-gray-700" />
            ) : (
              <Bell className="w-5 h-5 text-gray-700" />
            )}
          </button>
          {conversation.type === 'private' && (
            <button
              onClick={onOpenCharacterSettings}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages - 固定布局，添加顶部和底部padding */}
      <div 
        className="absolute top-[60px] bottom-[60px] left-0 right-0 overflow-y-auto p-4 space-y-3"
      >
        {conversation.messages.map((message, index) => {
          // 微信风格：超过5分钟才显示时间
          const showTime = index === 0 || 
            (conversation.messages[index - 1] && 
             message.timestamp - conversation.messages[index - 1].timestamp > 5 * 60 * 1000);
          
          return (
            <div key={message.id}>
              {showTime && (
                <div className="flex justify-center my-4">
                  <span className="text-xs text-gray-400 bg-white/80 px-3 py-1 rounded-full">
                    {new Date(message.timestamp).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })} {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              
              {/* 系统消息 - 居中显示 */}
              {message.role === 'system' ? (
                <div className="flex justify-center my-2">
                  <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                    {message.content}
                  </span>
                </div>
              ) : (
              <div className={`message-bubble flex gap-2 items-end ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <div className="relative flex-shrink-0">
                    {conversation.characterSettings?.avatar ? (
                      <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-md">
                        <img src={conversation.characterSettings.avatar} alt="AI头像" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border-2 border-white shadow-md">
                        <span className="text-white font-semibold text-sm">{conversation.name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-[10px]">{getUserBadge()}</span>
                    </div>
                  </div>
                )}
                <div className="relative max-w-[70%]">
                  {/* 多选模式复选框 */}
                  {isMultiSelectMode && (
                    <input
                      type="checkbox"
                      checked={selectedMessages.includes(message.id)}
                      onChange={() => toggleMessageSelection(message.id)}
                      className="absolute -left-8 top-1/2 -translate-y-1/2 w-5 h-5 rounded border-2 border-gray-300 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  
                  {/* 引用消息（在气泡外部显示，适用于特殊消息） */}
                  {message.replyTo && (message.moneyTransfer || message.document || message.order) && (
                    <div className="mb-1.5 bg-gray-50 rounded-lg p-2 border border-gray-200">
                      <div className="text-xs text-gray-500 flex items-start gap-1">
                        <div className="w-0.5 h-full bg-blue-400 mr-1 rounded"></div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-700">{message.replyTo.role === 'user' ? '我' : conversation.name}</div>
                          <div className="line-clamp-2 text-gray-600">{message.replyTo.content}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div
                    onClick={(e) => {
                      if (isMultiSelectMode) {
                        toggleMessageSelection(message.id);
                      } else {
                        handleMessageClick(message.id, e);
                      }
                    }}
                    className={`rounded-2xl shadow-sm cursor-pointer ${
                      message.moneyTransfer 
                        ? 'p-0 overflow-hidden'
                        : message.role === 'user'
                        ? 'bg-white text-gray-900 border border-gray-200'
                        : 'bg-white text-gray-900 border border-gray-200'
                    } ${message.mediaType || message.moneyTransfer ? 'p-0 overflow-hidden' : message.replyTo ? 'pb-2.5' : 'px-4 py-2.5'} ${
                      isMultiSelectMode && selectedMessages.includes(message.id) ? 'ring-2 ring-purple-500' : ''
                    }`}
                  >
                    {/* 引用消息显示（只在非特殊消息时显示在这里） */}
                    {message.replyTo && !message.moneyTransfer && !message.document && !message.order && (
                      <div className="pt-3">
                        {/* 被引用的原消息 */}
                        <div className="px-4 text-sm text-gray-600 leading-relaxed mb-2.5">
                          {message.replyTo.content}
                        </div>
                        {/* 分隔线 */}
                        <div className="border-b border-gray-200 mb-2.5"></div>
                      </div>
                    )}
                    
                    {/* 红包/转账消息气泡 */}
                    {message.moneyTransfer ? (
                      <div className={`p-0 rounded-2xl overflow-hidden ${
                        message.role === 'user' 
                          ? 'bg-gradient-to-br from-yellow-400 to-orange-400' 
                          : 'bg-gradient-to-br from-yellow-500 to-orange-500'
                      }`}>
                        <div className="p-4 text-white">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">
                              {message.moneyTransfer.type === 'redPacket' ? '🧧' : '💸'}
                            </span>
                            <div className="text-lg font-bold">
                              {message.moneyTransfer.type === 'redPacket' ? '红包' : '转账'}
                            </div>
                          </div>
                          <div className="text-2xl font-bold mb-2">
                            ¥{(message.moneyTransfer.originalAmount || message.moneyTransfer.amount).toFixed(2)}
                          </div>
                          {message.moneyTransfer.message && (
                            <div className="text-sm opacity-90 mb-2">
                              {message.moneyTransfer.message}
                            </div>
                          )}
                          {message.moneyTransfer.status === 'pending' && message.role === 'user' && (
                            <div className="text-xs opacity-75">
                              等待对方领取
                            </div>
                          )}
                          {message.moneyTransfer.status === 'received' && (
                            <div className="text-xs opacity-75">
                              已{message.moneyTransfer.type === 'redPacket' ? '领取' : '收款'}
                            </div>
                          )}
                          {message.moneyTransfer.status === 'returned' && (
                            <div className="text-xs opacity-75">
                              心意我领啦，钱钱快收回去~
                            </div>
                          )}
                        </div>
                        {message.moneyTransfer.status === 'pending' && message.role === 'assistant' && (
                          <div className="bg-white/20 backdrop-blur-sm border-t border-white/20">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReceiveMoney(message.id, true);
                              }}
                              className="w-full py-3 text-white font-medium hover:bg-white/10 transition-colors"
                            >
                              {message.moneyTransfer.type === 'redPacket' ? '🎁 领取红包' : '✅ 确认收款'}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}
                    
                    {/* 文档消息卡片 */}
                    {message.document && (
                      <DocumentCard
                        title={message.document.title}
                        content={message.document.content}
                        greeting={message.document.greeting}
                        type={message.document.type}
                        onClick={(e) => {
                          e?.stopPropagation?.();
                          setViewingDocument(message.document);
                        }}
                      />
                    )}
                    
                    {/* 小红书消息 */}
                    {message.xiaohongshu && (
                      <XiaohongshuView rawContent={message.xiaohongshu.rawContent} />
                    )}
                    
                    {/* 订单消息气泡（礼物/代付请求） */}
                    {message.order && (
                      <div className={`rounded-2xl overflow-hidden max-w-[300px] ${
                        message.order.type === 'gift' 
                          ? 'bg-gradient-to-br from-blue-500 to-purple-500' 
                          : 'bg-gradient-to-br from-green-500 to-emerald-500'
                      }`}>
                        {/* 顶部标题 */}
                        <div className="text-white text-center py-3 px-4">
                          <div className="font-semibold text-base">
                            {message.order.type === 'gift' ? '🎁 给你的礼物' : '🛒 购物车代付请求'}
                          </div>
                          {message.order.recipientName && (
                            <div className="text-xs opacity-90 mt-1">
                              {message.order.type === 'gift' 
                                ? `送给 ${message.order.recipientName}` 
                                : '对方已为你买单'
                              }
                            </div>
                          )}
                        </div>
                        
                        {/* 白色内容区 */}
                        <div className="bg-white p-4 space-y-3">
                          {/* 留言 */}
                          {message.order.message && (
                            <div className="bg-blue-50 rounded-lg p-3">
                              <div className="text-sm font-medium text-blue-900 mb-1">
                                📝 下单留言
                              </div>
                              <div className="text-sm text-gray-700">
                                {message.order.message}
                              </div>
                            </div>
                          )}
                          
                          {/* 商品列表 */}
                          <div className="space-y-2">
                            <div className="text-sm font-semibold text-gray-800">商品明细</div>
                            {message.order.products.map((product, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                {product.image && (
                                  <img 
                                    src={product.image} 
                                    alt={product.name}
                                    className="w-12 h-12 rounded object-cover"
                                    onError={(e) => {
                                      e.currentTarget.src = 'https://via.placeholder.com/100?text=商品';
                                    }}
                                  />
                                )}
                                <div className="flex-1 text-sm">
                                  <div className="text-gray-800 line-clamp-1">{product.name}</div>
                                  <div className="text-gray-500">×{product.quantity}</div>
                                </div>
                                <div className="text-red-600 font-semibold text-sm">
                                  ¥{product.price.toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* 订单号 */}
                          {message.order.orderNumber && (
                            <div className="text-xs text-gray-400">
                              订单号：{message.order.orderNumber}
                            </div>
                          )}
                          
                          {/* 总价 */}
                          <div className="pt-2 border-t border-gray-200">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">共 {message.order.products.length} 件商品，合计</span>
                              <span className="text-xl font-bold text-red-600">
                                ¥{message.order.totalAmount.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          
                          {/* 操作按钮 - 只有当AI发送的订单才显示，让用户响应 */}
                          {message.role === 'assistant' && message.order.status === 'pending' && (
                            <div className="flex gap-2">
                              {message.order.type === 'gift' ? (
                                <>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAcceptOrder(message);
                                    }}
                                    className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                                  >
                                    收下礼物
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRejectOrder(message);
                                    }}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                  >
                                    退回
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAcceptOrder(message);
                                    }}
                                    className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                                  >
                                    帮TA付款
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRejectOrder(message);
                                    }}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                  >
                                    拒绝
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                          
                          {/* 状态显示 */}
                          {message.order.status !== 'pending' && (
                            <div className="text-center py-2 text-sm font-medium">
                              {message.order.status === 'accepted' && '✅ 已接收'}
                              {message.order.status === 'rejected' && '❌ 已拒绝'}
                              {message.order.status === 'paid' && '💰 已支付'}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* 多媒体混合显示（优先使用新的mediaItems数组） */}
                    {!message.moneyTransfer && !message.document && !message.order && message.mediaItems && message.mediaItems.length > 0 && (
                      <div className="space-y-2">
                        {message.mediaItems.map((media, idx) => (
                          <div key={`${message.id}_media_${idx}`}>
                            {/* 图片 */}
                            {media.type === 'image' && message.role === 'assistant' && (
                              <div 
                                onClick={() => alert(media.description)}
                                className="relative w-[180px] h-[180px] rounded-2xl overflow-hidden bg-white/30 backdrop-blur-sm cursor-pointer hover:bg-white/40 transition-colors border border-gray-200"
                              >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-gray-100/20" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                                  <ImageIcon className="w-12 h-12 text-gray-400 mb-2" strokeWidth={1.5} />
                                  <p className="text-xs text-gray-600 line-clamp-3">{media.description}</p>
                                </div>
                              </div>
                            )}
                            {/* 视频 */}
                            {media.type === 'video' && message.role === 'assistant' && (
                              <div 
                                onClick={() => alert(media.description)}
                                className="relative w-[240px] h-[135px] rounded-2xl overflow-hidden bg-white/30 backdrop-blur-sm cursor-pointer hover:bg-white/40 transition-colors border border-gray-200"
                              >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-gray-100/20" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                                  <Video className="w-12 h-12 text-gray-400 mb-2" strokeWidth={1.5} />
                                  <p className="text-xs text-gray-600 line-clamp-2">{media.description}</p>
                                </div>
                              </div>
                            )}
                            {/* 语音 */}
                            {media.type === 'voice' && message.role === 'assistant' && (
                              <div>
                                <div 
                                  onClick={() => setViewingVoice(prev => 
                                    prev.includes(`${message.id}_${idx}`) 
                                      ? prev.filter(id => id !== `${message.id}_${idx}`)
                                      : [...prev, `${message.id}_${idx}`]
                                  )}
                                  className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl min-w-[120px] max-w-[200px]"
                                >
                                  <Mic className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                  <div className="flex-1 flex items-center gap-0.5">
                                    <div className="flex gap-0.5">
                                      {[...Array(15)].map((_, i) => (
                                        <div 
                                          key={i} 
                                          className="w-0.5 bg-gray-400 rounded-full"
                                          style={{ height: `${Math.random() * 12 + 4}px` }}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <span className="text-xs text-gray-600 flex-shrink-0">{media.duration || 3}"</span>
                                </div>
                                {viewingVoice.includes(`${message.id}_${idx}`) && (
                                  <div className="mt-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200">
                                    <p className="text-[13px] text-gray-700">{media.description}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            {/* 表情包 */}
                            {media.type === 'sticker' && message.role === 'assistant' && (
                              <div className="relative w-[120px] h-[120px] rounded-2xl overflow-hidden bg-blue-100/40 backdrop-blur-sm border border-blue-200">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-blue-100/30" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                                  <Smile className="w-8 h-8 text-blue-400 mb-2" strokeWidth={1.5} />
                                  <p className="text-xs text-gray-700 leading-tight">{media.description}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {/* 文字内容（如果有） */}
                        {message.content && message.content !== '[多媒体消息]' && (
                          <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words px-4 py-2.5">{message.content}</p>
                        )}
                      </div>
                    )}
                    {/* 用户真实媒体内容（兼容旧格式，无mediaItems时使用） */}
                    {!message.mediaItems && message.role === 'user' && message.mediaType === 'image' && message.mediaUrl && (
                      <img 
                        src={message.mediaUrl} 
                        alt="图片" 
                        className="w-full max-w-[200px] rounded-2xl"
                      />
                    )}
                    {!message.mediaItems && message.role === 'user' && message.mediaType === 'video' && message.mediaUrl && (
                      <video 
                        src={message.mediaUrl} 
                        controls 
                        className="w-full max-w-[200px] rounded-2xl"
                      />
                    )}
                    {!message.mediaItems && message.role === 'user' && message.mediaType === 'voice' && message.mediaUrl && (
                      <div>
                        <div 
                          onClick={() => setViewingVoice(prev => 
                            prev.includes(message.id) 
                              ? prev.filter(id => id !== message.id)
                              : [...prev, message.id]
                          )}
                          className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl min-w-[120px] max-w-[200px]"
                        >
                          <Mic className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          <div className="flex-1 flex items-center gap-0.5">
                            <div className="flex gap-0.5">
                              {[...Array(15)].map((_, i) => (
                                <div 
                                  key={i} 
                                  className="w-0.5 bg-gray-400 rounded-full"
                                  style={{ height: `${Math.random() * 12 + 4}px` }}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-gray-600 flex-shrink-0 mr-1">{message.voiceDuration || 0}"</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (playingVoice === message.id) {
                                audioRef.current?.pause();
                                setPlayingVoice(null);
                              } else {
                                if (audioRef.current) {
                                  audioRef.current.pause();
                                }
                                const audio = new Audio(message.mediaUrl);
                                audioRef.current = audio;
                                audio.play();
                                setPlayingVoice(message.id);
                                audio.onended = () => setPlayingVoice(null);
                              }
                            }}
                            className="flex-shrink-0 w-5 h-5 flex items-center justify-center hover:bg-gray-200 rounded-full transition-colors"
                          >
                            {playingVoice === message.id ? (
                              <Pause className="w-3 h-3 text-gray-600" />
                            ) : (
                              <Play className="w-3 h-3 text-gray-600" />
                            )}
                          </button>
                        </div>
                        {/* 语音内容文字（点击气泡显示） */}
                        {viewingVoice.includes(message.id) && message.mediaDescription && (
                          <div className="mt-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200">
                            <p className="text-[13px] text-gray-700">{message.mediaDescription}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {/* 用户表情包（浅蓝色半透明小正方形） */}
                    {!message.mediaItems && message.role === 'user' && message.mediaType === 'sticker' && (
                      <div className="relative w-[120px] h-[120px] rounded-2xl overflow-hidden bg-blue-100/40 backdrop-blur-sm border border-blue-200">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-blue-100/30" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                          <Smile className="w-8 h-8 text-blue-400 mb-2" strokeWidth={1.5} />
                          <p className="text-xs text-gray-700 leading-tight">{message.mediaDescription}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* AI媒体消息（半透明占位符）（兼容旧格式） */}
                    {!message.mediaItems && message.role === 'assistant' && message.mediaType === 'image' && message.isMediaDescriptionOnly && (
                      <div 
                        onClick={() => alert(message.mediaDescription)}
                        className="relative w-[180px] h-[180px] rounded-2xl overflow-hidden bg-white/30 backdrop-blur-sm cursor-pointer hover:bg-white/40 transition-colors border border-gray-200"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-gray-100/20" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                          <ImageIcon className="w-12 h-12 text-gray-400 mb-2" strokeWidth={1.5} />
                          <p className="text-xs text-gray-600 line-clamp-3">{message.mediaDescription}</p>
                        </div>
                      </div>
                    )}
                    {!message.mediaItems && message.role === 'assistant' && message.mediaType === 'video' && message.isMediaDescriptionOnly && (
                      <div 
                        onClick={() => alert(message.mediaDescription)}
                        className="relative w-[240px] h-[135px] rounded-2xl overflow-hidden bg-white/30 backdrop-blur-sm cursor-pointer hover:bg-white/40 transition-colors border border-gray-200"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-gray-100/20" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                          <Video className="w-12 h-12 text-gray-400 mb-2" strokeWidth={1.5} />
                          <p className="text-xs text-gray-600 line-clamp-2">{message.mediaDescription}</p>
                        </div>
                      </div>
                    )}
                    {!message.mediaItems && message.role === 'assistant' && message.mediaType === 'voice' && message.isMediaDescriptionOnly && (
                      <div>
                        <div 
                          onClick={() => setViewingVoice(prev => 
                            prev.includes(message.id) 
                              ? prev.filter(id => id !== message.id)
                              : [...prev, message.id]
                          )}
                          className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl min-w-[120px] max-w-[200px]"
                        >
                          <Mic className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          <div className="flex-1 flex items-center gap-0.5">
                            <div className="flex gap-0.5">
                              {[...Array(15)].map((_, i) => (
                                <div 
                                  key={i} 
                                  className="w-0.5 bg-gray-400 rounded-full"
                                  style={{ height: `${Math.random() * 12 + 4}px` }}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-gray-600 flex-shrink-0">{message.voiceDuration || 3}"</span>
                        </div>
                        {/* 语音内容文字（点击气泡显示） */}
                        {viewingVoice.includes(message.id) && message.mediaDescription && (
                          <div className="mt-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200">
                            <p className="text-[13px] text-gray-700">{message.mediaDescription}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {!message.mediaItems && message.role === 'assistant' && message.mediaType === 'sticker' && message.isMediaDescriptionOnly && (
                      <div className="relative w-[120px] h-[120px] rounded-2xl overflow-hidden bg-blue-100/40 backdrop-blur-sm border border-blue-200">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-blue-100/30" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                          <Smile className="w-8 h-8 text-blue-400 mb-2" strokeWidth={1.5} />
                          <p className="text-xs text-gray-700 leading-tight">{message.mediaDescription}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* 纯文字内容 */}
                    {!message.mediaType && !message.moneyTransfer && !message.document && !message.order && (
                      <p className={`text-[15px] leading-relaxed whitespace-pre-wrap break-words ${message.replyTo ? 'px-4' : ''}`}>{message.content}</p>
                    )}
                    {/* 用户媒体的描述文字（排除语音和表情包） */}
                    {message.role === 'user' && message.mediaType && message.mediaType !== 'sticker' && message.mediaType !== 'voice' && message.mediaDescription && (
                      <p className="text-[13px] leading-relaxed px-3 py-2 text-gray-600">{message.mediaDescription}</p>
                    )}
                  </div>
                  {/* Message tail */}
                  <div className={`absolute bottom-3 ${
                    message.role === 'user' ? 'right-0 translate-x-[40%]' : 'left-0 -translate-x-[40%]'
                  }`}>
                    <div className={`w-2.5 h-2.5 bg-white border-gray-200 transform rotate-45 shadow-sm ${
                      message.role === 'user' ? 'border-r border-b' : 'border-l border-t'
                    }`}></div>
                  </div>
                </div>
                {message.role === 'user' && (
                  <div className="relative flex-shrink-0">
                    {userProfile.avatar ? (
                      <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-md">
                        <img src={userProfile.avatar} alt="用户头像" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-100 to-gray-300 flex items-center justify-center border-2 border-white shadow-md">
                        <span className="text-gray-700 font-semibold text-sm">{userProfile.username?.charAt(0) || '我'}</span>
                      </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-[10px]">{getUserBadge()}</span>
                    </div>
                  </div>
                )}
              </div>
              )}
              
              {/* 旧的操作栏已移除，使用新的MessageActionMenu */}
            </div>
          );
        })}

        {showSendingHint && (
          <div className="flex justify-center my-2">
            <div className="bg-blue-500 text-white text-xs px-3 py-1.5 rounded-full shadow-sm">
              消息发送中...
            </div>
          </div>
        )}

        {showTyping && (
          <div className="flex gap-2 items-end justify-start">
            <div className="relative flex-shrink-0">
              {conversation.characterSettings?.avatar ? (
                <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-md">
                  <img src={conversation.characterSettings.avatar} alt="AI头像" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border-2 border-white shadow-md">
                  <span className="text-white font-semibold text-sm">{conversation.name.charAt(0)}</span>
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                <span className="text-[10px]">{getUserBadge()}</span>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl px-4 py-2.5 border border-gray-200 shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
              <div className="absolute bottom-3 left-0 -translate-x-[40%]">
                <div className="w-2.5 h-2.5 bg-white border-l border-t border-gray-200 transform rotate-45 shadow-sm"></div>
              </div>
            </div>
          </div>
        )}

        {showAllSentHint && (
          <div className="flex justify-center my-2">
            <div className="bg-green-500 text-white text-xs px-3 py-1.5 rounded-full shadow-sm">
              消息已全部送达
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area - 固定在底部 */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 z-10">
        {/* 多选模式工具栏 */}
        {isMultiSelectMode && (
          <div className="px-4 py-3 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancelMultiSelect}
                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                取消
              </button>
              <span className="text-sm text-gray-700">
                已选择 {selectedMessages.length} 条消息
              </span>
            </div>
            <button
              onClick={handleBatchDelete}
              disabled={selectedMessages.length === 0}
              className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              删除
            </button>
          </div>
        )}
        
        {/* 剩余消息提示 */}
        {pendingMessages.length > 0 && !isGenerating && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
            <span className="text-sm text-blue-700">
              还有 {pendingMessages.length} 条消息未发送
            </span>
            <button
              onClick={handleContinueSending}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded-full hover:bg-blue-600 transition-colors"
            >
              继续
            </button>
          </div>
        )}

        {/* Toolbar */}
        {showToolbar && (
          <div className="px-3 py-2 bg-white border-b border-gray-200">
            <div className="flex gap-2 items-center overflow-x-auto">
              <button onClick={() => imageInputRef.current?.click()} className="flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <ImageIcon className="w-4 h-4 text-gray-600" />
                </div>
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <button onClick={() => videoInputRef.current?.click()} className="flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <Video className="w-4 h-4 text-gray-600" />
                </div>
              </button>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoUpload}
              />
              <button 
                className="flex-shrink-0"
                onClick={handleVoiceClick}
              >
                <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <Mic className="w-4 h-4 text-gray-600" />
                </div>
              </button>
              <button 
                className="flex-shrink-0"
                onClick={handleStickerClick}
              >
                <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <Smile className="w-4 h-4 text-gray-600" />
                </div>
              </button>
              <button className="flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <Phone className="w-4 h-4 text-gray-600" />
                </div>
              </button>
              <button className="flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <MapPin className="w-4 h-4 text-gray-600" />
                </div>
              </button>
              <button 
                className="flex-shrink-0"
                onClick={() => setShowMoneyTransferModal(true)}
              >
                <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <CreditCard className="w-4 h-4 text-gray-600" />
                </div>
              </button>
              <button 
                className="flex-shrink-0"
                onClick={() => setShowSendDocumentModal(true)}
              >
                <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <FileText className="w-4 h-4 text-gray-600" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 引用提示 */}
        {quotedMessage && (
          <div className="px-3 pt-2 pb-1 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2 border-l-3 border-blue-500">
              <div className="flex-1 mr-2">
                <div className="text-xs text-blue-600 font-medium mb-1">
                  引用 {quotedMessage.role === 'user' ? '我' : conversation.name}
                </div>
                <div className="text-sm text-gray-700 truncate">
                  {quotedMessage.content}
                </div>
              </div>
              <button
                onClick={handleCancelQuote}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-blue-100 text-blue-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* 编辑提示 */}
        {messageBeingEdited && (
          <div className="px-3 pt-2 pb-1 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2 border-l-3 border-green-500">
              <div className="flex-1 mr-2">
                <div className="text-xs text-green-600 font-medium mb-1">
                  编辑消息
                </div>
                <div className="text-sm text-gray-700 truncate">
                  {messageBeingEdited.content}
                </div>
              </div>
              <button
                onClick={handleCancelEdit}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-green-100 text-green-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="px-3 py-3 bg-white">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowToolbar(!showToolbar)}
              className="w-9 h-9 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 flex items-center justify-center"
            >
              <Plus className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2">
              <input
                ref={inputRef}
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={messageBeingEdited ? "编辑消息..." : quotedMessage ? "回复消息..." : "输入消息..."}
                className="flex-1 outline-none text-[15px] bg-transparent text-gray-900 placeholder-gray-400"
                disabled={isGenerating}
              />
            </div>
            {currentInput.trim() ? (
              <button
                onClick={handleSendMessage}
                disabled={isGenerating}
                className="w-10 h-10 bg-blue-500 text-white rounded-full hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center shadow-md"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isGenerating || conversation.messages.length === 0}
                className="w-10 h-10 bg-gray-900 text-white rounded-full hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center shadow-md"
              >
                <Sparkles className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* 表情包输入弹窗 */}
    {showStickerModal && (
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Smile className="w-5 h-5 text-blue-500" />
            发送表情包
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            请用文字描述表情包的内容，AI会理解并做出相应回复。
          </p>
          <textarea
            value={stickerDescInput}
            onChange={(e) => setStickerDescInput(e.target.value)}
            placeholder="例如：一只猫咪捂脸害羞的表情包"
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
            autoFocus
          />
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => {
                setShowStickerModal(false);
                setStickerDescInput('');
              }}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={handleSendSticker}
              disabled={!stickerDescInput.trim()}
              className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    )}

    {/* 视频描述弹窗 */}
    {showVideoDescModal && (
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">视频内容描述</h3>
          <p className="text-sm text-gray-600 mb-4">
            请填写视频内容的文字描述，以便AI更好地理解视频内容并做出回复。
          </p>
          <textarea
            value={videoDescInput}
            onChange={(e) => setVideoDescInput(e.target.value)}
            placeholder="例如：在海边散步的风景视频"
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
            autoFocus
          />
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => {
                setShowVideoDescModal(false);
                setVideoDescInput('');
                setPendingVideoFile(null);
              }}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={handleSendVideo}
              disabled={!videoDescInput.trim()}
              className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    )}

    {/* 录音中弹窗 */}
    {(isRecording || isTranscribing) && (
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <Mic className={`w-8 h-8 text-red-500 ${isRecording ? 'animate-pulse' : ''}`} />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isTranscribing ? '正在识别...' : '正在录音...'}
          </h3>
          <p className="text-3xl font-bold text-gray-900 mb-4">
            {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:{(recordingTime % 60).toString().padStart(2, '0')}
          </p>
          <p className="text-sm text-gray-600 mb-2">
            {isTranscribing ? '正在转换为文字，请稍候...' : '请说出您想发送的内容'}
          </p>
          {!isTranscribing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-700">
                💡 <span className="font-semibold">温馨提示：</span>录音结束后，您需要手动输入这段语音的文字内容。如需自动识别，请在<span className="font-semibold">设置</span>中开启语音识别功能。
              </p>
            </div>
          )}
          {!isTranscribing && (
            <button
              onClick={() => {
                stopRecording();
                setIsRecording(false);
                setIsTranscribing(false);
              }}
              className="px-6 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
            >
              停止录音
            </button>
          )}
        </div>
      </div>
    )}

    {/* 语音识别确认弹窗 */}
    {showVoiceConfirmModal && (
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            ✍️ 输入语音内容
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            请输入这条语音消息的文字内容（录音时长：{recordingTime}秒）
          </p>
          <textarea
            value={voiceTranscript}
            onChange={(e) => setVoiceTranscript(e.target.value)}
            placeholder={voiceTranscript ? "识别的文字内容..." : "请输入语音内容..."}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
            autoFocus
          />
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => {
                setShowVoiceConfirmModal(false);
                setVoiceTranscript('');
                setAudioBlob(null);
              }}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            {!voiceTranscript && (
              <button
                onClick={() => {
                  setShowVoiceConfirmModal(false);
                  setVoiceTranscript('');
                  setAudioBlob(null);
                  // 重新录音
                  setTimeout(() => {
                    handleVoiceClick();
                  }, 300);
                }}
                className="flex-1 px-4 py-2.5 border border-blue-500 text-blue-500 rounded-xl hover:bg-blue-50 transition-colors font-medium"
              >
                重新录音
              </button>
            )}
            <button
              onClick={handleSendVoice}
              disabled={!voiceTranscript.trim()}
              className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    )}

    {/* AI行为轨迹弹窗 */}
    {conversation.type === 'private' && conversation.characterSettings && aiStatus && (
      <ActivityLogModal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        statusInfo={aiStatus}
        conversation={conversation} // 传递conversation参数
        aiName={conversation.characterSettings.nickname || conversation.name}
        aiAvatar={conversation.characterSettings.avatar || conversation.avatar}
      />
    )}

    {/* 消息操作菜单 */}
    <MessageActionMenu
      isVisible={selectedMessageId !== null}
      position={menuPosition}
      onQuote={handleQuoteMessage}
      onEdit={handleEditMessage}
      onDelete={handleDeleteMessage}
      onMultiSelect={handleEnterMultiSelect}
      onClose={handleCloseMenu}
    />

    {/* 红包转账弹窗 */}
    {showMoneyTransferModal && (
      <MoneyTransferModal
        onClose={() => setShowMoneyTransferModal(false)}
        onSend={(amount, type, message) => {
          // 检查余额
          const balance = getBalance();
          if (balance < amount) {
            alert('余额不足，请先充值');
            return;
          }

          // 发送红包/转账
          const success = sendMoney(amount, type, conversation.id, message);
          if (success) {
            const newMessage: Message = {
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              role: 'user',
              content: type === 'redPacket' ? '发出了一个红包' : '向你转账',
              timestamp: Date.now(),
              moneyTransfer: {
                type,
                amount,
                message,
                status: 'pending'
              }
            };

            onUpdateConversation(conversation.id, {
              messages: [...conversation.messages, newMessage],
              lastMessageTime: Date.now()
            });

            // 关闭工具栏和弹窗
            setShowToolbar(false);
            setShowMoneyTransferModal(false);

            // 🔧 已禁用旧的自动处理机制，改用system prompt驱动
            // AI现在通过正常对话流程响应，使用[接收]或[退回]标记
            // setTimeout(() => {
            //   handleAIMoneyResponse(newMessage);
            // }, 2000 + Math.random() * 3000);
          } else {
            alert('发送失败');
          }
        }}
      />
    )}

    {/* 发送文档弹窗 */}
    {showSendDocumentModal && (
      <SendDocumentModal
        onClose={() => {
          setShowSendDocumentModal(false);
          setSelectedLibraryDoc(null);
          setShouldEditDoc(false);
        }}
        onOpenLibrary={() => {
          setShowDocumentLibrary(true);
        }}
        initialDocument={selectedLibraryDoc && shouldEditDoc ? {
          title: selectedLibraryDoc.title,
          content: selectedLibraryDoc.content,
          type: selectedLibraryDoc.type
        } : undefined}
        onSend={(title, content, greeting, type) => {
          const newMessage: Message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            role: 'user',
            content: `发送了文档「${title}」`,
            timestamp: Date.now(),
            document: {
              title,
              content,
              greeting,
              type,
              size: new Blob([content]).size
            }
          };

          onUpdateConversation(conversation.id, {
            messages: [...conversation.messages, newMessage],
            lastMessageTime: Date.now()
          });

          // 关闭工具栏和弹窗
          setShowToolbar(false);
          setShowSendDocumentModal(false);
          setSelectedLibraryDoc(null);
          setShouldEditDoc(false);
        }}
      />
    )}

    {/* 文档库 */}
    {showDocumentLibrary && (
      <DocumentLibraryModal
        onClose={() => setShowDocumentLibrary(false)}
        onSelectDocument={(doc, shouldEdit) => {
          if (shouldEdit) {
            // 编辑发送：打开编辑弹窗
            setSelectedLibraryDoc(doc);
            setShouldEditDoc(true);
            setShowDocumentLibrary(false);
            setShowSendDocumentModal(true);
          } else {
            // 原文发送：直接发送文档
            const newMessage: Message = {
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              role: 'user',
              content: `发送了文档「${doc.title}」`,
              timestamp: Date.now(),
              document: {
                title: doc.title,
                content: doc.content,
                type: doc.type,
                greeting: '请查收',
                size: doc.size
              }
            };
            
            onUpdateConversation(conversation.id, {
              messages: [...conversation.messages, newMessage],
              lastMessageTime: Date.now()
            });
            
            setShowDocumentLibrary(false);
          }
        }}
      />
    )}

    {/* 文档查看器 */}
    {viewingDocument && (
      <DocumentViewModal
        document={viewingDocument}
        onClose={() => setViewingDocument(null)}
        onForward={(document) => {
          // 转发文档：打开选择联系人弹窗
          setForwardingDocument(document);
          setViewingDocument(null);
          setShowSelectContact(true);
        }}
      />
    )}

    {/* 选择联系人弹窗（用于转发文档） */}
    {showSelectContact && forwardingDocument && (
      <SelectContactModal
        onClose={() => {
          setShowSelectContact(false);
          setForwardingDocument(null);
        }}
        onSelect={(conversationId) => {
          // 转发文档到选中的联系人
          const newMessage: Message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            role: 'user',
            content: `发送了文档「${forwardingDocument.title}」`,
            timestamp: Date.now(),
            document: {
              title: forwardingDocument.title,
              content: forwardingDocument.content,
              type: forwardingDocument.type,
              greeting: '转发',
              size: forwardingDocument.size
            }
          };
          
          // 获取目标对话
          const targetConversation = conversations.find(c => c.id === conversationId);
          if (targetConversation) {
            onUpdateConversation(conversationId, {
              messages: [...targetConversation.messages, newMessage],
              lastMessageTime: Date.now()
            });
            
            showToast(`文档已转发到「${targetConversation.characterSettings?.nickname || targetConversation.name}」`, 'success');
          }
          
          setShowSelectContact(false);
          setForwardingDocument(null);
        }}
        conversations={conversations}
        currentConversationId={conversation.id}
      />
    )}
    </>
  );
}
