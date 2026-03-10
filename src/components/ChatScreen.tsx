import { useState, useEffect, useRef, useCallback } from 'react';
import { groupToPrivateMemoryService } from '../utils/groupToPrivateMemoryService';
import { ChevronLeft, Send, Mic, Sparkles, Smile, BellOff, Bell, Pause, Play, Image as ImageIcon, Video, Phone, MapPin, FileText, Plus, Search, MessageCircle, MessageSquare, Eye, Music, Gift } from 'lucide-react';
import { Conversation, Message, ApiConfig, UserProfile, DocumentMessage } from '../types';
import MoneyTransferModal from './MoneyTransferModal';
import GroupRedPacketModal from './GroupRedPacketModal';
import GroupRedPacketCard from './GroupRedPacketCard';
import SendDocumentModal from './SendDocumentModal';
import DocumentLibraryModal from './DocumentLibraryModal';
import WordStyleDocumentCard from './WordStyleDocumentCard';
import WordStyleDocumentModal from './WordStyleDocumentModal';
import SelectContactModal from './SelectContactModal';
import { parseEnhancedDocument } from '../utils/enhancedDocumentParser';
import { subChatMemoryManager } from '../utils/subChatMemoryManager';
import { saveDocument as saveToLibrary } from '../utils/documentLibrary';
import WeChatLinkPreview, { LinkPreviewData } from './WeChatLinkPreview';
import XiaohongshuLinkModal from './XiaohongshuLinkModal';
import { SmartLinkParser } from '../utils/smartLinkParser';
import XiaohongshuFeed from './XiaohongshuFeed';
import MusicShareModal from './MusicShareModal';
import RealMusicSearchModal from './RealMusicSearchModal';
import MusicPlayingWidget from './MusicPlayingWidget';
import MusicCard from './MusicCard';
import RealMusicCard from './RealMusicCard';
import { aiListeningSimulator, MusicInfo, MusicPlaybackState } from '../utils/musicService';
import { RealMusicInfo } from '../utils/realMusicService';
import { MusicMessage } from '../types';
import { musicContextService } from '../utils/musicContextService';
import ZhihuFeed from './ZhihuFeed';
import NeteaseMusicCard from './NeteaseMusicCard';
import NeteaseMusicParser from '../utils/neteaseMusicParser';
import { calculateVoiceDuration } from '../utils/voiceDurationCalculator';
import WeiboFeed from './WeiboFeed';
import SearchHistoryView from './SearchHistoryView';
import ChatSearchModal from './ChatSearchModal';
import { SmartHTMLGenerator } from '../utils/smartHTMLGenerator';
import { SavedDocument } from '../utils/documentLibrary';
import { sendMoney, receiveMoney, getBalance, aiPayForUser, refundGift } from '../utils/wallet';
import { addTransaction as addAIFinanceTransaction, getAIFinanceData } from '../utils/aiFinance';
import { detectExpenseFromMessage, recordAIExpense } from '../utils/aiExpenseDetector';
import { detectIncomeFromMessage, recordAIIncome } from '../utils/aiIncomeDetector';
import { backgroundGenerationService, GenerationTask } from '../utils/backgroundGenerationService';
import { schedulePendingReply, onTypingChange, isGenerating as isConvGenerating, initPendingReplyService } from '../utils/pendingReplyService';
import { handleAIGroupRedPacketClaiming } from '../utils/aiGroupRedPacketDecision';
import { processExpiredRedPacketRefund } from '../utils/groupRedPacket';
import { calculateDeliveryStatus, formatEstimatedTime, getActiveStageIndex, getRiderInfo } from '../utils/orderDeliverySimulator';
import SubChatWindow from './SubChatWindow';
import SubChatManager from './SubChatManager';
import SubChatSuggestionModal from './SubChatSuggestionModal';
import { createSubChat, addSubChatToConversation, updateSubChatInConversation } from '../utils/subChatManager';
import { SubChatSuggestion } from '../utils/aiSubChatInitiator';
// AI理解力经验系统集成
import { ChatSessionManager, handleChatExperienceUpdate } from '../utils/chatExperienceIntegration';
import { bootstrapComprehensionSystem } from '../utils/comprehensionSystemBootstrap';
// 消息转发和多选相关导入
import MessageSelectionToolbar from './MessageSelectionToolbar';
import ForwardTargetSelector from './ForwardTargetSelector';
import { MergedForwardViewer } from './MergedForwardCard';
import { createSingleForward, createMergedForward, getMessagePreview } from '../utils/messageForward';
import { formatChatRecord } from '../utils/chatRecordFormatter';
// 子聊天相关导入
import ChatExtractPreview from './ChatExtractPreview';
import {
  addMessageToSubChat,
  // removeSubChatFromConversation, // 未使用，暂时注释
  getTotalUnreadCount,
  getPendingSubChatsCount,
} from '../utils/subChatManager';
import { 
  getConversationMemories, 
  applyMemoriesToContext,
  shouldTriggerAutoSummary,
  buildMemorySummaryPrompt,
  parseMemorySummaryResponse,
  addMemory,
  updateSummaryCounter,
  getMemoryBank,
  shouldTriggerGroupMemorySummary,
  updateGroupSummaryCounter,
  buildGroupMemorySummaryPrompt,
  getGroupMemories,
  addGroupMemory
} from '../utils/memorySystem';
// import { detectMemes } from '../utils/memeSystem'; // 已删除热梗系统
import { messagePerceptionService } from '../utils/messagePerceptionService';
import { buildTimeAwarePrompt, UnrepliedMessageInfo, hasActionKeywords } from '../utils/timeAwareness';
import { getMomentsData } from '../utils/aiMomentsGenerator';
import { getAIStatus } from '../utils/aiStatusManager';
import { getErrorFromResponse, formatErrorMessage } from '../utils/apiErrorHandler';
// @ts-ignore - 函数在backgroundTaskManager内部使用，TS静态分析无法识别
import { splitMessages, cleanAIMessage } from '../utils/messageFormatter';
import { findStickerByDescription } from '../utils/stickerMessageParser';
// 群聊服务
import { generateGroupChatReplies, generateGroupChatRepliesFreeMode } from '../utils/groupChatService';
import GroupChatSettingsModal from './GroupChatSettingsModal';
import VideoCallModal from './VideoCallModal'; // 导入视频通话组件
import { CallLog } from '../types';
import WorldbookMountSettings from './WorldbookMountSettings';
import { WorldbookMountConfig } from '../types/worldbook';
import { buildWorldbookPrompt } from '../utils/worldbookPrompt';
import { buildStickerPrompt } from '../utils/stickerPrompt';
import UserStickerPicker from './UserStickerPicker';
import { StickerItem } from '../types/sticker';

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
        console.error('❌ API返回数据异常:', JSON.stringify(data, null, 2));
        
        // 用户友好的错误提示
        throw new Error('AI服务暂时出了点问题，请重新发送消息试试');
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
        
        // 🔥 标记为AI选择不回复，让后续逻辑处理智能提示
        callback([], conversation.id, 'AI_NO_REPLY');
        return;
      }

      // 🎭 优先检测完整的HTML模块内容（必须在splitMessages之前）
      const htmlType = SmartHTMLGenerator.detectHTMLType(assistantMessage);
      
      // 将分割后的文本转换为Message对象数组
      const messages: Message[] = [];
      const allExtraMessages: Message[] = [];
      
      // 如果检测到HTML模块，不进行消息拆分，保持完整
      if (htmlType) {
        console.log(`🎭 检测到完整${htmlType}内容，跳过消息拆分`);
        
        const platformNames = {
          'xiaohongshu': '小红书',
          'zhihu': '知乎',
          'weibo': '微博',
          'search-history': '搜索记录'
        };
        
        // 创建HTML模块消息
        allExtraMessages.push({
          id: `${Date.now()}_html`,
          role: 'assistant',
          content: `分享了${platformNames[htmlType]}`,
          timestamp: Date.now() + 100,
          socialFeed: {
            platform: htmlType,
            rawContent: assistantMessage
          }
        });
        
        // 直接返回，不进行后续的消息拆分处理
        callback([...messages, ...allExtraMessages], conversation.id);
        return;
      }
      
      // 🎨 智能检测：判断消息模式（普通消息 vs HTML输出）
      const isHTMLOutputMode = (() => {
        // 检测是否包含HTML标签
        const hasHTMLTags = /<[^>]+>/.test(assistantMessage);
        if (!hasHTMLTags) return false;
        
        // 统计HTML标签数量和总字符数
        const htmlTagMatches = assistantMessage.match(/<[^>]+>/g) || [];
        const htmlTagCount = htmlTagMatches.length;
        const totalLength = assistantMessage.length;
        
        // 如果HTML标签数量 >= 3，且内容中HTML占比较高，判定为HTML输出模式
        if (htmlTagCount >= 3) {
          const htmlContentLength = htmlTagMatches.reduce((sum: number, tag: string) => sum + tag.length, 0);
          const htmlRatio = htmlContentLength / totalLength;
          
          if (htmlRatio > 0.2) {
            console.log(`🎨 [智能检测] HTML输出模式: 标签数=${htmlTagCount}, 占比=${(htmlRatio * 100).toFixed(1)}%`);
            return true;
          }
        }
        
        // 检测是否包含典型的HTML结构标签
        const structuralTags = ['<div', '<style', '<span', '<table', '<ul', '<ol', '<section', '<article'];
        const hasStructuralTags = structuralTags.some(tag => assistantMessage.includes(tag));
        if (hasStructuralTags && htmlTagCount >= 2) {
          console.log(`🎨 [智能检测] HTML输出模式: 检测到结构化标签`);
          return true;
        }
        
        // 检测是否是完整的HTML块（开始标签和闭合标签配对）
        const openTagMatches = assistantMessage.match(/<(\w+)[^>]*>/g) || [];
        const closeTagMatches = assistantMessage.match(/<\/(\w+)>/g) || [];
        if (openTagMatches.length >= 2 && openTagMatches.length === closeTagMatches.length) {
          console.log(`🎨 [智能检测] HTML输出模式: 检测到配对的HTML标签`);
          return true;
        }
        
        console.log(`📝 [智能检测] 普通消息模式: HTML标签数=${htmlTagCount}`);
        return false;
      })();
      
      // 如果是HTML输出模式，作为单条完整消息，不分割
      if (isHTMLOutputMode) {
        console.log(`🎨 [HTML输出模式] 保持完整，不进行分割`);
        messages.push({
          id: `${Date.now()}_html_output`,
          role: 'assistant',
          content: assistantMessage, // 保持原始HTML内容
          timestamp: Date.now()
        });
        
        callback(messages, conversation.id);
        return;
      }
      
      // 📝 普通消息模式：使用splitMessages分割消息
      console.log(`📝 [普通消息模式] 进行智能分割`);
      const splitMsgs = splitMessages(assistantMessage);
      
      for (let index = 0; index < splitMsgs.length; index++) {
        const content = splitMsgs[index];
        const baseId = Date.now().toString() + '_' + index;
        
        // 🎨 第1步：检测并分离HTML内容
        let htmlContent = '';
        let nonHTMLContent = content;
        
        // 检测是否包含HTML（使用与顶层相同的逻辑）
        const hasHTMLTags = /<[^>]+>/.test(content);
        if (hasHTMLTags) {
          const htmlTagMatches = content.match(/<[^>]+>/g) || [];
          const htmlTagCount = htmlTagMatches.length;
          const structuralTags = ['<div', '<style', '<span', '<table', '<ul', '<ol'];
          const hasStructuralTags = structuralTags.some(tag => content.includes(tag));
          
          // 如果检测到HTML结构
          if (htmlTagCount >= 3 || hasStructuralTags) {
            // 提取HTML部分（从第一个<到最后一个>）
            const firstTagIndex = content.indexOf('<');
            const lastTagIndex = content.lastIndexOf('>') + 1;
            if (firstTagIndex !== -1 && lastTagIndex > firstTagIndex) {
              htmlContent = content.substring(firstTagIndex, lastTagIndex);
              // 移除HTML部分，保留前后的文本
              nonHTMLContent = content.substring(0, firstTagIndex) + ' ' + content.substring(lastTagIndex);
              nonHTMLContent = nonHTMLContent.trim();
              console.log('🎨 [分离HTML] 提取了HTML内容，长度:', htmlContent.length);
            }
          }
        }
        
        // 🎤 第2步：从非HTML内容中提取媒体项
        const mediaItems: any[] = [];
        let cleanContent = nonHTMLContent;
        
        // 提取所有图片
        const imageMatches = cleanContent.matchAll(/\[图片[:：]([^\]]+)\]/g);
        for (const match of imageMatches) {
          mediaItems.push({
            type: 'image',
            description: match[1].trim()
          });
          cleanContent = cleanContent.replace(match[0], '').trim();
        }
        
        // 提取所有视频
        const videoMatches = cleanContent.matchAll(/\[视频[:：]([^\]]+)\]/g);
        for (const match of videoMatches) {
          mediaItems.push({
            type: 'video',
            description: match[1].trim()
          });
          cleanContent = cleanContent.replace(match[0], '').trim();
        }
        
        // 提取所有语音
        const voiceMatches = cleanContent.matchAll(/\[语音[:：](.+?)(?:[，,]\s*(?:时长)?(\d+)秒?)?\]/g);
        for (const match of voiceMatches) {
          mediaItems.push({
            type: 'voice',
            description: match[1].trim(),
            duration: parseInt(match[2]) || 3
          });
          cleanContent = cleanContent.replace(match[0], '').trim();
        }
        
        // 提取所有表情包（需要异步查找图片）
        const stickerMatches = [...cleanContent.matchAll(/\[表情包[:：]([^\]]+)\]/g)];
        for (const match of stickerMatches) {
          const description = match[1].trim();
          // 异步查找表情包图片URL（使用当前角色ID限制范围）
          const imageUrl = await findStickerByDescription(description, conversation.id);
          mediaItems.push({
            type: 'sticker',
            description,
            imageUrl: imageUrl || undefined // 找到图片就用，找不到就undefined
          });
          cleanContent = cleanContent.replace(match[0], '').trim();
        }
        
        // 🔍 解析特殊指令（文档、链接预览、红包、转账）
        let finalContent = cleanContent;
        console.log(`📖 开始解析AI消息: ${finalContent.substring(0, 100)}...`);
        
        // 注意：社交平台内容已在消息拆分前处理，这里不再检测
        
        // 🔥 第一优先级：文档解析（必须在链接解析之前！）
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📄 [文档解析] 开始 (优先级最高)');
        console.log('原始内容长度:', finalContent.length);
        console.log('原始内容预览:', finalContent.substring(0, 200));
        
        const parsedDoc = parseEnhancedDocument(finalContent);
        
        if (parsedDoc) {
          console.log('✅ [文档解析] 成功识别文档');
          console.log('   标题:', parsedDoc.title);
          console.log('   类型:', parsedDoc.type);
          console.log('   内容长度:', parsedDoc.content.length);
          
          // 创建文档消息
          allExtraMessages.push({
            id: `${baseId}_doc`,
            role: 'assistant',
            content: `发送了文档「${parsedDoc.title}」`,
            timestamp: Date.now() + 100,
            document: {
              title: parsedDoc.title,
              content: parsedDoc.content,
              type: parsedDoc.type,
              greeting: parsedDoc.greeting || '请查收'
            }
          });
          
          // 文档已提取，清空正文
          finalContent = '';
          console.log('📄 [文档解析] 文档已提取为单独消息');
        } else {
          console.log('ℹ️ [文档解析] 未检测到文档标记');
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        // 🔗 第二优先级：解析链接预览（小红书、知乎、微博等）
        if (finalContent) {
          const parsedLink = SmartLinkParser.parseMessage(finalContent);
          if (parsedLink.linkPreviews.length > 0) {
            console.log(`🔗 检测到${parsedLink.linkPreviews.length}个链接预览`);
            
            // 为每个链接预览创建消息
            parsedLink.linkPreviews.forEach((linkPreview, idx) => {
              allExtraMessages.push({
                id: `${baseId}_link_${idx}`,
                role: 'assistant',
                content: `分享了${linkPreview.platform === 'xiaohongshu' ? '小红书' : linkPreview.platform === 'zhihu' ? '知乎' : ''}链接`,
                timestamp: Date.now() + 100 + allExtraMessages.length * 10,
                linkPreview
              });
            });
            
            // 更新finalContent为去除链接标记后的纯文本
            finalContent = parsedLink.textContent;
          }
        }
        
        // 检测红包：[发红包:金额:留言]
        const redPacketMatch = finalContent.match(/\[发红包:([\d.]+):([^\]]*)\]/);
        if (redPacketMatch) {
          const amount = parseFloat(redPacketMatch[1]);
          const redPacketMsg = redPacketMatch[2];
          
          // 🔥 冷静期检测：检查最近10条消息中是否有AI发送的红包/转账/礼物
          const recentMessages = conversation.messages.slice(-10);
          const hasRecentMoneyTransfer = recentMessages.some(msg => 
            msg.role === 'assistant' && msg.moneyTransfer
          );
          
          if (hasRecentMoneyTransfer) {
            console.warn('⏰ 冷静期限制：AI在最近10条消息内已发送过红包/转账/礼物，本次红包被过滤');
            finalContent = finalContent.replace(redPacketMatch[0], '').trim();
          } else {
            finalContent = finalContent.replace(redPacketMatch[0], '').trim();
            console.log(`🧧 AI发红包: ¥${amount}, 留言: ${redPacketMsg}`);
            
            allExtraMessages.push({
              id: `${baseId}_redpacket`,
              role: 'assistant',
              content: '', // AI发送红包时也不显示文本，只显示红包卡片
              timestamp: Date.now() + 100 + allExtraMessages.length * 10,
              moneyTransfer: {
                type: 'redPacket',
                amount,
                message: redPacketMsg,
                status: 'pending'
              }
            });
          }
        }

        // 🔥 智能识别转账（支持多种格式）
        
        // 格式1：标准格式 [转账:金额:备注]
        let transferMatch = finalContent.match(/\[转账:([\d.]+):([^\]]*)\]/);
        
        // 格式2：描述性多行格式
        // 【你发送了转账】
        // 金额：¥88888
        // 留言：xxx
        // 状态：待领取
        if (!transferMatch) {
          const multiLineMatch = finalContent.match(/[【\[](?:你)?发送?了?转账[】\]]\s*金额[：:]\s*[¥￥]?([\d.]+)\s*留言[：:]\s*([^\n]*)/s);
          if (multiLineMatch) {
            transferMatch = [
              multiLineMatch[0],
              multiLineMatch[1], // 金额
              multiLineMatch[2]  // 留言
            ] as any;
          }
        }
        
        if (transferMatch) {
          const amount = parseFloat(transferMatch[1]);
          const transferMsg = transferMatch[2];
          
          // 🔥 冷静期检测：检查最近10条消息中是否有AI发送的红包/转账/礼物
          const recentMessages = conversation.messages.slice(-10);
          const hasRecentMoneyTransfer = recentMessages.some(msg => 
            msg.role === 'assistant' && msg.moneyTransfer
          );
          
          if (hasRecentMoneyTransfer) {
            console.warn('⏰ 冷静期限制：AI在最近10条消息内已发送过红包/转账/礼物，本次转账被过滤');
            finalContent = finalContent.replace(transferMatch[0], '').trim();
          } else {
            finalContent = finalContent.replace(transferMatch[0], '').trim();
            console.log(`💸 AI转账: ¥${amount}, 备注: ${transferMsg}`);
            
            allExtraMessages.push({
              id: `${baseId}_transfer`,
              role: 'assistant',
              content: '', // AI转账时也不显示文本，只显示转账卡片
              timestamp: Date.now() + 100 + allExtraMessages.length * 10,
              moneyTransfer: {
                type: 'transfer',
                amount,
                message: transferMsg,
                status: 'pending'
              }
            });
          }
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
          
          // 🔥 重要：创建红包/转账气泡，但不设置content
          // AI的文字回复会作为独立的文本消息显示（通过finalContent）
          // 这样可以同时显示：① 红包气泡 + ② AI的文字回复
          allExtraMessages.push({
            id: `${baseId}_moneyresponse`,
            role: 'assistant',
            content: '', // ⚠️ 设为空，避免显示默认文字如"已收到你的红包"
            timestamp: Date.now() + 100 + allExtraMessages.length * 10,
            moneyTransfer: {
              type: type === '红包' ? 'redPacket' : 'transfer',
              amount: 0, // 占位，需要后续更新
              message: message,
              status: action === '接收' ? 'received' : 'returned'
            }
          });
        }

        // 💬 检测子聊天发起：[发起子聊天:目的:建议名称]
        const subChatMatch = finalContent.match(/\[发起子聊天:([^:]+):([^\]]+)\]/);
        if (subChatMatch) {
          const purpose = subChatMatch[1].trim();
          const suggestedName = subChatMatch[2].trim();
          
          console.log(`💬 AI发起子聊天: ${suggestedName}, 目的: ${purpose}`);
          
          // 移除标记
          finalContent = finalContent.replace(subChatMatch[0], '').trim();
          
          // 💡 将子聊天请求存储为特殊消息，由组件处理
          allExtraMessages.push({
            id: `${baseId}_subchat_request`,
            role: 'system',
            content: `__SUBCHAT_REQUEST__${purpose}__${suggestedName}`,
            timestamp: Date.now() + 100 + allExtraMessages.length * 10,
          });
        }

        // 🧠 为主聊天添加子聊天记忆上下文（如果用户提到了子聊天内容）
        // 注：这里需要根据实际的消息上下文来检测，暂时使用内容作为检测基础
        if (content && conversation.subChats && conversation.subChats.length > 0) {
          const relevantSubChats = subChatMemoryManager.detectSubChatReferences(content, conversation.subChats);
          if (relevantSubChats.length > 0) {
            console.log(`🔗 检测到用户提及子聊天内容，相关子聊天: ${relevantSubChats.map(sc => sc.name).join(', ')}`);
            
            // 为每个相关子聊天生成摘要
            const subChatContexts = relevantSubChats.map(subChat => {
              const lastMessages = subChat.messages.slice(-5); // 最近5条消息
              const summary = lastMessages.map(msg => {
                const role = msg.role === 'user' ? '用户' : '我';
                return `${role}: ${msg.content}`;
              }).join('\n');
              
              return `[子聊天"${subChat.name}"最近内容]
目的: ${subChat.purpose || '未指定'}
最近对话:
${summary}`;
            }).join('\n\n');
            
            // 在AI回复前添加子聊天上下文提示
            console.log(`📝 添加子聊天上下文:\n${subChatContexts}`);
          }
        }

        // 检测AI送礼物：[送礼物:商品名称:价格:留言]
        const giftMatch = finalContent.match(/\[送礼物:([^:]+):(\d+(?:\.\d+)?):([^\]]*)\]/);
        if (giftMatch) {
          const productName = giftMatch[1];
          const price = parseFloat(giftMatch[2]);
          const giftMessage = giftMatch[3];
          
          // 🔥 冷静期检测：检查最近10条消息中是否有AI发送的红包/转账/礼物
          const recentMessages = conversation.messages.slice(-10);
          const hasRecentMoneyTransfer = recentMessages.some(msg => 
            msg.role === 'assistant' && (msg.moneyTransfer || msg.order?.type === 'gift')
          );
          
          if (hasRecentMoneyTransfer) {
            console.warn('⏰ 冷静期限制：AI在最近10条消息内已发送过红包/转账/礼物，本次礼物被过滤');
            finalContent = finalContent.replace(giftMatch[0], '').trim();
          } else {
            finalContent = finalContent.replace(giftMatch[0], '').trim();
            console.log(`🎁 AI送礼物: ${productName} ¥${price}`);
            
            // 💰 检查AI余额（使用新财务系统）
            const aiFinanceData = await getAIFinanceData(conversation.id);
            if (aiFinanceData.balance >= price) {
              // 余额足够，扣款并创建订单（同步到新财务系统）
              const success = await addAIFinanceTransaction(
                conversation.id,
                'expense',
                price,
                '购物支出',
                `送礼物给用户: ${productName}`,
                'user',
                `gift_${Date.now()}`,
                false
              );
              
              if (success) {
                console.log(`✅ AI智能财务扣款成功: ¥${price}, 原余额: ¥${aiFinanceData.balance}`);
              } else {
                console.error(`❌ AI智能财务扣款失败`);
                return; // 扣款失败，不创建礼物
              }
              
              // 创建礼物订单消息
              allExtraMessages.push({
                id: `${baseId}_gift`,
                role: 'assistant',
                content: '', // AI送礼物时不显示默认文本，只显示礼物卡片
                timestamp: Date.now() + 100 + allExtraMessages.length * 10,
                order: {
                  type: 'gift',
                  source: 'taobao', // AI发起的礼物默认为淘宝商品
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
              console.log(`❌ AI智能财务余额不足: 需要¥${price}, 仅有¥${aiFinanceData.balance}`);
              // AI会在回复中说明余额不足，不创建订单
              // 标记已被移除，不会显示[送礼物:xxx]
            }
          }
        }
        
        // 检测头像更换：[换头像] 或 [换回原头像]
        // 注意：实际的头像更新会在callback外部处理
        const hasAvatarChange = finalContent.includes('[换头像]');
        const hasRestoreAvatar = finalContent.includes('[换回原头像]');
        
        // 移除所有头像标记（包括全角/半角括号和中英文字符）
        if (hasAvatarChange) {
          console.log('🎭 [头像更换] 检测到换头像指令，移除标记');
          finalContent = finalContent.replace(/\[换头像\]/g, '').replace(/【换头像】/g, '').trim();
        }
        if (hasRestoreAvatar) {
          console.log('🎭 [头像更换] 检测到换回原头像指令，移除标记');
          finalContent = finalContent.replace(/\[换回原头像\]/g, '').replace(/【换回原头像】/g, '').trim();
        }
        
        // 🎯 第3步：分离所有内容为独立消息
        let msgTimestamp = Date.now();
        
        // 3.1 添加HTML消息（如果有）
        if (htmlContent) {
          messages.push({
            id: `${baseId}_html`,
            role: 'assistant' as const,
            content: htmlContent,
            timestamp: msgTimestamp++
          });
          console.log('🎨 [创建消息] HTML消息已添加');
        }
        
        // 3.2 添加所有语音消息（每个语音独立气泡）
        const voiceItems = mediaItems.filter(item => item.type === 'voice');
        voiceItems.forEach((voice, voiceIdx) => {
          // 根据文字内容计算语音时长
          const calculatedDuration = calculateVoiceDuration(voice.description || '');
          
          messages.push({
            id: `${baseId}_voice_${voiceIdx}`,
            role: 'assistant' as const,
            content: '[语音]',
            timestamp: msgTimestamp++,
            mediaType: 'voice',
            mediaDescription: voice.description,
            voiceDuration: calculatedDuration, // 使用计算的时长
            isMediaDescriptionOnly: true
          });
          console.log(`🎤 [创建消息] 语音消息 ${voiceIdx + 1} 已添加，时长：${calculatedDuration}秒`);
        });
        
        // 3.3 添加所有图片消息（每个图片独立气泡）
        const imageItems = mediaItems.filter(item => item.type === 'image');
        imageItems.forEach((image, imageIdx) => {
          messages.push({
            id: `${baseId}_image_${imageIdx}`,
            role: 'assistant' as const,
            content: '[图片]',
            timestamp: msgTimestamp++,
            mediaType: 'image',
            mediaDescription: image.description,
            isMediaDescriptionOnly: true
          });
          console.log(`🖼️ [创建消息] 图片消息 ${imageIdx + 1} 已添加`);
        });
        
        // 3.4 添加所有视频消息
        const videoItems = mediaItems.filter(item => item.type === 'video');
        videoItems.forEach((video, videoIdx) => {
          messages.push({
            id: `${baseId}_video_${videoIdx}`,
            role: 'assistant' as const,
            content: '[视频]',
            timestamp: msgTimestamp++,
            mediaType: 'video',
            mediaDescription: video.description,
            isMediaDescriptionOnly: true
          });
          console.log(`🎬 [创建消息] 视频消息 ${videoIdx + 1} 已添加`);
        });
        
        // 3.5 添加所有表情包消息
        const stickerItems = mediaItems.filter(item => item.type === 'sticker');
        stickerItems.forEach((sticker, stickerIdx) => {
          messages.push({
            id: `${baseId}_sticker_${stickerIdx}`,
            role: 'assistant' as const,
            content: '[表情包]',
            timestamp: msgTimestamp++,
            mediaType: 'sticker',
            mediaDescription: sticker.description,
            mediaUrl: sticker.imageUrl, // 如果有图片URL就用真实图片
            isMediaDescriptionOnly: !sticker.imageUrl // 有URL=false(真实图片), 无URL=true(文字描述)
          });
          console.log(`😊 [创建消息] 表情包消息 ${stickerIdx + 1} 已添加${sticker.imageUrl ? ' (真实图片)' : ' (文字描述)'}`);
        });
        
        // 3.6 最后添加文本消息（如果有剩余文本）
        const hasSpecialContent = allExtraMessages.some(msg => msg.id.startsWith(baseId));
        const shouldCreateTextMessage = finalContent || (!hasSpecialContent && cleanContent);
        
        if (shouldCreateTextMessage) {
          // 🔥 修复：只使用finalContent，不要fallback到cleanContent
          // 因为finalContent已经移除了所有特殊标记（如[换头像]）
          const textContent = finalContent;
          if (textContent && textContent.trim()) {
            const message: Message = {
              id: baseId,
              role: 'assistant' as const,
              content: textContent,
              timestamp: msgTimestamp++
            };
            
            // 如果有引用消息，添加到消息中
            if (replyToInfo) {
              message.replyTo = {
                id: '',
                content: replyToInfo.content,
                role: replyToInfo.role
              };
            }
            
            messages.push(message);
            console.log('📝 [创建消息] 文本消息已添加');
          }
        }
      }
      
      // 添加所有额外的特殊消息（红包、转账、文档）
      messages.push(...allExtraMessages);
      
      // 💰 AI智能财务：检测并记录消费和收入行为
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === 'assistant') {
          // 检测消费行为
          const expense = detectExpenseFromMessage(lastMessage.content);
          if (expense.hasExpense) {
            console.log(`💰 检测到AI消费行为: ${expense.description}`);
            recordAIExpense(conversation.id, expense, lastMessage.content).catch(error => {
              console.error('❌ 记录AI消费失败:', error);
            });
          }
          
          // 检测收入行为
          const income = detectIncomeFromMessage(lastMessage.content);
          if (income.hasIncome) {
            console.log(`💰 检测到AI收入行为: ${income.description}`);
            recordAIIncome(conversation.id, income, lastMessage.content).catch(error => {
              console.error('❌ 记录AI收入失败:', error);
            });
          }
        }
      }
      
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
import { useMessageNotification } from '../hooks/useMessageNotification';
// import { transcribeAudio, isValidSpeechConfig } from '../utils/speechToText';

interface ChatScreenProps {
  conversation: Conversation;
  apiConfig: ApiConfig;
  currentUserProfile?: UserProfile; // 当前用户资料（用于AI参考）
  conversations: Conversation[]; // 所有对话列表（用于转发）
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void;
  onDeleteConversation?: (id: string) => void; // 删除对话（用于群聊删除）
  onBack: () => void;
  onOpenCharacterSettings: () => void;
  onRequestAIMoment?: () => Promise<void>;
  onNavigateToPrivateChat?: (aiName: string) => void; // 新增：导航到与AI的私聊
}

export default function ChatScreen({
  conversation,
  apiConfig,
  currentUserProfile,
  conversations,
  onUpdateConversation,
  onDeleteConversation,
  onBack,
  onOpenCharacterSettings,
  onRequestAIMoment,
  onNavigateToPrivateChat,
}: ChatScreenProps) {
  const { showToast } = useToast();
  
  // 启用消息通知
  useMessageNotification({
    conversation,
    isActive: true, // ChatScreen打开时认为是激活状态
    userName: currentUserProfile?.username || '用户'
  });

  // 如果会话被隐藏，进入聊天时自动取消隐藏
  useEffect(() => {
    if (conversation.isHidden) {
      onUpdateConversation(conversation.id, { isHidden: false });
    }
  }, [conversation.id, conversation.isHidden, onUpdateConversation]);
  
  // 格式化消息给AI，包括转发内容
  const formatMessageForAI = (msg: Message): string => {
    let content = msg.content;
    
    // 处理转发消息 - 使用专业格式化
    if (msg.forwarded) {
      if (msg.forwarded.type === 'merged' && msg.forwarded.messages) {
        // 合并转发：使用结构化聊天记录格式
        const forwardedMessages = msg.forwarded.messages.map(item => ({
          id: `forwarded_${Date.now()}_${Math.random()}`,
          role: item.senderName === '用户' ? 'user' as const : 'assistant' as const,
          content: item.content,
          timestamp: Date.now()
        }));
        
        const formattedChatRecord = formatChatRecord(
          forwardedMessages, 
          msg.forwarded.from.conversationName, 
          msg.forwarded.from.conversationType === 'group' ? 'subchat' : 'main'
        );
        
        // 如果用户有额外的文字说明，保留它；否则用默认引导
        const userText = msg.content && msg.content.trim() && msg.content !== '转发了聊天记录' 
          ? msg.content 
          : '请帮我看看这个聊天记录：';
        
        content = `${userText}\n\n${formattedChatRecord}`;
      } else if (msg.forwarded.type === 'single' && msg.forwarded.originalMessage) {
        // 单条转发：保持原格式但添加更多上下文
        const original = msg.forwarded.originalMessage;
        content = `转发了来自【${msg.forwarded.from.conversationName}】的消息:\n\n${original.content}`;
      }
    }
    
    // 处理文档消息
    if (msg.document) {
      // 用户发送的文档：需要完整传递内容给AI
      if (msg.role === 'user') {
        return `[用户发送了${msg.document.type === 'text' ? '文本' : msg.document.type === 'markdown' ? 'Markdown' : '代码'}文档]\n标题：${msg.document.title}\n内容：\n${msg.document.content}`;
      }
      // AI发送的文档：只需要标记格式
      return `[发文档:${msg.document.title}:${msg.document.type}] ${msg.document.content}`;
    }
    
    // 处理转账/红包消息
    if (msg.moneyTransfer) {
      const type = msg.moneyTransfer.type === 'redPacket' ? '红包' : '转账';
      if (msg.role === 'assistant') {
        // AI发的红包/转账
        return msg.moneyTransfer.type === 'redPacket' 
          ? `[发红包:${msg.moneyTransfer.amount}:${msg.moneyTransfer.message}]`
          : `[转账:${msg.moneyTransfer.amount}:${msg.moneyTransfer.message}]`;
      } else {
        // 用户发的，或AI接收/退回的
        if (msg.moneyTransfer.status === 'received') {
          return `[接收${type}:${msg.moneyTransfer.message}]`;
        } else if (msg.moneyTransfer.status === 'returned') {
          return `[退回${type}:${msg.moneyTransfer.message}]`;
        }
      }
    }
    
    // 处理语音消息（优先使用 voiceText）
    if (msg.mediaType === 'voice') {
      // 如果有 voiceText，使用转录的文字内容
      if (msg.mediaDescription && msg.mediaDescription.trim()) {
        return `[语音消息] ${msg.mediaDescription}`;
      }
      // 如果没有转录，只能用通用描述
      return `[语音消息 ${msg.voiceDuration || 3}秒]`;
    }
    
    // 处理多媒体
    if (msg.mediaItems && msg.mediaItems.length > 0) {
      const mediaDesc = msg.mediaItems.map(item => 
        `[${item.type}: ${item.description}]`
      ).join(' ');
      content = `${content} ${mediaDesc}`;
    }
    
    return content;
  };
  const [currentInput, setCurrentInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingUserMessages, setPendingUserMessages] = useState<string[]>([]); // AI回复时用户发送的消息
  const [showToolbar, setShowToolbar] = useState(false);
  const [showMoneyTransferModal, setShowMoneyTransferModal] = useState(false);
  const [showSendDocumentModal, setShowSendDocumentModal] = useState(false);
  const [showDocumentLibrary, setShowDocumentLibrary] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Message['document'] | null>(null);
  const [viewingXiaohongshuLink, setViewingXiaohongshuLink] = useState<LinkPreviewData | null>(null);
  const [selectedLibraryDoc, setSelectedLibraryDoc] = useState<SavedDocument | null>(null);
  const [showSelectContact, setShowSelectContact] = useState(false);
  const [forwardingDocument, setForwardingDocument] = useState<Message['document'] | null>(null);
  const [shouldEditDoc, setShouldEditDoc] = useState(false);
  const [showVideoDescModal, setShowVideoDescModal] = useState(false);
  const [videoDescInput, setVideoDescInput] = useState('');
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [stickerDescInput, setStickerDescInput] = useState('');
  const [showUserStickerPicker, setShowUserStickerPicker] = useState(false);
  const [showStickerTypeMenu, setShowStickerTypeMenu] = useState(false);
  const [viewingVoice, setViewingVoice] = useState<string[]>([]);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [showSendingHint, setShowSendingHint] = useState(false);
  const [isGroupProcessing, setIsGroupProcessing] = useState(false); // 🚀 新增：群聊处理中状态
  const [showTyping, setShowTyping] = useState(() => isConvGenerating(conversation.id));
  const [pendingMessages, setPendingMessages] = useState<string[]>([]);
  const [showAllSentHint, setShowAllSentHint] = useState(false);
  
  // 群聊相关状态
  const [currentTypingAI, setCurrentTypingAI] = useState<{id: string; name: string; avatar?: string} | null>(null);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showGroupRedPacketModal, setShowGroupRedPacketModal] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false); // 视频通话状态
  const [callType, setCallType] = useState<'video' | 'voice'>('video');
  const [showCallTypeSelector, setShowCallTypeSelector] = useState(false);
  const [showWorldbookMount, setShowWorldbookMount] = useState(false); // 世界书挂载设置
  
  // 头像交互相关状态
  const [avatarMenuOpen, setAvatarMenuOpen] = useState<{ messageId: string; senderId: string; name: string; avatar?: string } | null>(null);
  
  // @ 成员列表相关状态
  const [showAtMemberList, setShowAtMemberList] = useState(false);
  const [atFilterText, setAtFilterText] = useState('');
  const [atCursorPosition, setAtCursorPosition] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 保存通话记录
  const handleSaveCallLog = (log: CallLog) => {
    const currentHistory = conversation.callHistory || [];
    // 保存系统消息通知
    const typeText = log.type === 'video' ? '📹 视频通话' : '📞 语音通话';
    const systemMsg: Message = {
      id: Date.now().toString(),
      role: 'system',
      content: `${typeText}结束，时长 ${Math.floor(log.duration / 60)}:${(log.duration % 60).toString().padStart(2, '0')}`,
      timestamp: Date.now()
    };
    
    onUpdateConversation(conversation.id, {
      messages: [...conversation.messages, systemMsg],
      callHistory: [...currentHistory, log],
      lastMessageTime: Date.now()
    });
  };
  
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
  
  // 📤 消息转发状态
  const [showForwardSelector, setShowForwardSelector] = useState(false);
  const [forwardingMessages, setForwardingMessages] = useState<Message[]>([]);
  const [viewingMergedForward, setViewingMergedForward] = useState<Message['forwarded'] | null>(null);
  
  // 💬 子聊天相关状态
  const [showSubChatManager, setShowSubChatManager] = useState(false);
  const [activeSubChatId, setActiveSubChatId] = useState<string | null>(null);
  const [minimizedSubChats, setMinimizedSubChats] = useState<Set<string>>(new Set());
  
  // 🤖 AI主动发起子聊天相关状态
  const [subChatSuggestion, setSubChatSuggestion] = useState<SubChatSuggestion | null>(null);
  const [showSubChatSuggestionModal, setShowSubChatSuggestionModal] = useState(false);
  
  // 聊天记录提取预览相关状态
  const [showExtractPreview, setShowExtractPreview] = useState(false);
  const [extractingMessages, setExtractingMessages] = useState<Message[]>([]);
  
  // 计算子聊天统计
  const subChatUnreadCount = getTotalUnreadCount(conversation);
  const pendingSubChatsCount = getPendingSubChatsCount(conversation);
  
  // 🔥 确保用户查看聊天时，未读消息始终为 0
  useEffect(() => {
    if (conversation.unreadCount > 0) {
      onUpdateConversation(conversation.id, { unreadCount: 0 });
    }
  }, [conversation.id, conversation.unreadCount, onUpdateConversation]);

  // 🚀 初始化延后回复服务
  useEffect(() => {
    initPendingReplyService(
      onUpdateConversation,
      (id: string) => conversations.find(c => c.id === id),
      () => apiConfig,
      () => currentUserProfile || { username: '我', bio: '', personalInfo: {} }
    );
  }, [onUpdateConversation, conversations, apiConfig, currentUserProfile]);

  // 🚀 订阅延后回复服务的 typing 状态更新
  useEffect(() => {
    const unsub = onTypingChange((convId, typing) => {
      if (convId === conversation.id) setShowTyping(typing);
    });
    setShowTyping(isConvGenerating(conversation.id));
    return unsub;
  }, [conversation.id]);

  // 🚀 订阅后台生成服务的状态更新（保留用于群聊等其他功能）
  useEffect(() => {
    // 订阅当前对话的生成任务状态
    const unsubscribe = backgroundGenerationService.subscribe(
      conversation.id,
      (task: GenerationTask) => {
        setIsGenerating(task.status === 'generating');
      }
    );

    // 检查当前是否有正在进行的生成任务
    const currentTask = backgroundGenerationService.getTask(conversation.id);
    if (currentTask) {
      setIsGenerating(currentTask.status === 'generating');
    } else {
      setIsGenerating(false);
    }

    // 清理订阅
    return () => {
      unsubscribe();
    };
  }, [conversation.id]);
  
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
        const contextualHintRaw = data.choices[0]?.message?.content?.trim();
        if (contextualHintRaw) {
          // 使用与普通对话相同的清洗逻辑，避免模型把内部格式/标签直接吐出来
          const cleanedHint = cleanAIMessage(contextualHintRaw);
          return cleanedHint || contextualHintRaw;
        }
      }
    } catch (error) {
      console.error('生成上下文提示失败:', error);
    }
    
    // 如果生成失败，使用中性兜底提示（不依赖上下文）
    return '对方可能暂时忙碌，没有立即回复';
  };
  
  // 统一处理“AI选择不回复”的系统提示
  const handleAINoReply = async (targetConversationId: string) => {
    try {
      // 优先从 localStorage 获取最新的会话数据，避免使用过期的 props
      const storedConversations = localStorage.getItem('conversations');
      let targetConversation: Conversation | undefined = conversation;

      if (storedConversations) {
        try {
          const allConversations = JSON.parse(storedConversations) as Conversation[];
          const latest = allConversations.find(c => c.id === targetConversationId);
          if (latest) {
            targetConversation = latest;
          }
        } catch (e) {
          console.error('解析本地会话数据失败:', e);
        }
      }

      if (!targetConversation) {
        console.warn('handleAINoReply: 未找到目标会话，使用当前会话作为退路');
        targetConversation = conversation;
      }

      const contextualHint = await generateContextualHint(targetConversation);

      const systemMessage: Message = {
        id: Date.now().toString(),
        role: 'system',
        content: contextualHint,
        timestamp: Date.now(),
      };

      onUpdateConversation(targetConversationId, {
        messages: [...targetConversation.messages, systemMessage],
        lastMessageTime: Date.now(),
      });
    } catch (err) {
      console.error('handleAINoReply 处理失败:', err);
    } finally {
      // 无论如何都要清理 loading / 打字状态
      setShowSendingHint(false);
      setShowTyping(false);
      setIsGenerating(false);
    }
  };
  
  // 追踪用户是否还在当前聊天页面
  const isComponentMountedRef = useRef(true);
  
  // AI状态相关state
  const [aiStatus, setAIStatus] = useState<any | null>(null);
  
  // 搜索相关state
  const [showSearchModal, setShowSearchModal] = useState(false);
  
  // 🎵 音乐相关state
  const [showMusicShareModal, setShowMusicShareModal] = useState(false);
  const [showRealMusicModal, setShowRealMusicModal] = useState(false);
  const [currentMusic, setCurrentMusic] = useState<MusicInfo | null>(null);
  const [musicPlaybackState, setMusicPlaybackState] = useState<MusicPlaybackState | null>(null);
  
  // 🚀 性能优化：消息窗口加载 (智能显示目标消息及上下文)
  const [messageWindow, setMessageWindow] = useState<{
    startIndex: number; // 窗口起始索引
    size: number;       // 窗口大小
  }>(() => {
    // 初始状态：显示最新50条消息
    const initialSize = 50;
    const totalMessages = conversation.messages.length;
    return {
      startIndex: Math.max(0, totalMessages - initialSize),
      size: Math.min(initialSize, totalMessages)
    };
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);
  
  // 🚚 配送状态刷新触发器（每30秒更新一次）
  const [deliveryRefreshTrigger, setDeliveryRefreshTrigger] = useState(0);
  
  // 检查用户是否在底部
  const isAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const threshold = 100; // 100px的误差范围
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }, []);
  
  // 智能滚动到底部
  const smartScrollToBottom = useCallback((smooth = false) => {
    const container = messagesContainerRef.current;
    if (container) {
      if (smooth) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      } else {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, []);
  
  // 延迟重置滚动状态
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  
  // 滚动加载更多消息
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || isLoadingMore) return;
    
    // 标记用户正在滚动
    setIsUserScrolling(true);
    
    // 检查是否应该自动滚动到底部（用户在底部附近）
    setShouldScrollToBottom(isAtBottom());
    
    // 清除之前的定时器
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // 延迟重置滚动状态，让"返回底部"按钮有时间显示
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 2000); // 2秒后重置
    
    // 🔼 向上滚动：加载更早的消息
    if (container.scrollTop < 100 && messageWindow.startIndex > 0) {
      setIsLoadingMore(true);
      
      setTimeout(() => {
        const loadMore = 30;
        const newStartIndex = Math.max(0, messageWindow.startIndex - loadMore);
        const addedMessages = messageWindow.startIndex - newStartIndex;
        const prevScrollHeight = container.scrollHeight;
        
        setMessageWindow(prev => ({
          startIndex: newStartIndex,
          size: prev.size + addedMessages
        }));
        setIsLoadingMore(false);
        
        // 保持滚动位置，避免跳动
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - prevScrollHeight;
          }
        });
      }, 300);
    }
    
    // 🔽 向下滚动：加载更新的消息（如果不在末尾）
    const maxScrollTop = container.scrollHeight - container.clientHeight;
    const isNearBottom = container.scrollTop > maxScrollTop - 100;
    const windowEndIndex = messageWindow.startIndex + messageWindow.size;
    
    if (isNearBottom && windowEndIndex < conversation.messages.length) {
      setIsLoadingMore(true);
      
      setTimeout(() => {
        const loadMore = 30;
        const maxSize = conversation.messages.length - messageWindow.startIndex;
        const newSize = Math.min(messageWindow.size + loadMore, maxSize);
        
        setMessageWindow(prev => ({
          ...prev,
          size: newSize
        }));
        setIsLoadingMore(false);
      }, 300);
    }
  }, [messageWindow, conversation.messages.length, isLoadingMore, isAtBottom]);
  
  // 监听滚动事件
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => {
        container.removeEventListener('scroll', handleScroll);
        // 清理滚动定时器
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
  }, [handleScroll]);
  
  // 处理新消息和状态重置
  useEffect(() => {
    const currentMessageCount = conversation.messages.length;
    const prevMessageCount = lastMessageCountRef.current;
    
    // 1️⃣ 切换对话时：重置状态并滚动到底部
    if (prevMessageCount === 0 || currentMessageCount < prevMessageCount) {
      console.log('🔄 切换对话，重置消息窗口状态');
      const initialSize = 50;
      setMessageWindow({
        startIndex: Math.max(0, currentMessageCount - initialSize),
        size: Math.min(initialSize, currentMessageCount)
      });
      setShouldScrollToBottom(true);
      setIsUserScrolling(false);
      
      setTimeout(() => smartScrollToBottom(), 100);
    }
    // 2️⃣ 有新消息时：智能滚动处理
    else if (currentMessageCount > prevMessageCount) {
      console.log('📨 检测到新消息，智能处理滚动');
      
      // 如果用户在底部附近，自动调整窗口显示新消息
      if (shouldScrollToBottom) {
        setMessageWindow(prev => {
          const windowEndIndex = prev.startIndex + prev.size;
          const isShowingLatest = windowEndIndex >= prevMessageCount;
          
          if (isShowingLatest) {
            // 扩展窗口以包含新消息
            return {
              startIndex: prev.startIndex,
              size: prev.size + (currentMessageCount - prevMessageCount)
            };
          } else {
            // 保持窗口大小，但移动到最新位置
            return {
              startIndex: Math.max(0, currentMessageCount - prev.size),
              size: Math.min(prev.size, currentMessageCount)
            };
          }
        });
        setTimeout(() => smartScrollToBottom(true), 100);
      }
      // 如果用户在查看历史消息，不自动滚动，保持当前窗口
    }
    
    // 更新消息数量记录
    lastMessageCountRef.current = currentMessageCount;
  }, [conversation.messages.length, conversation.id, shouldScrollToBottom, smartScrollToBottom]);
  
  // 初始滚动到底部，显示最新消息
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container && conversation.id) {
      // 延迟执行，确保DOM已渲染完成
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [conversation.id]); // 切换对话时重新滚动到底部
  
  // 🎯 AI理解力系统初始化（仅对AI儿童有效）
  useEffect(() => {
    let isInitialized = false;
    
    const initializeComprehensionSystem = async () => {
      if (isInitialized || !conversation.aiChildData) return;
      isInitialized = true;
      
      try {
        console.log('🎯 为AI儿童初始化理解力系统：', conversation.id);
        
        // 初始化理解力系统
        const result = await bootstrapComprehensionSystem();
        if (result.success) {
          console.log('✅ 理解力系统初始化成功');
          
          // 启动聊天会话管理
          ChatSessionManager.startSession(conversation.id);
        } else {
          console.warn('⚠️ 理解力系统初始化失败：', result.message);
        }
      } catch (error) {
        console.error('❌ 理解力系统初始化出错：', error);
      }
    };
    
    initializeComprehensionSystem();
    
    // 清理函数
    return () => {
      if (conversation.aiChildData && ChatSessionManager.getSession(conversation.id)) {
        console.log('🎯 清理AI儿童聊天会话：', conversation.id);
        ChatSessionManager.endSession(conversation, conversation.messages);
      }
    };
  }, [conversation.id, conversation.aiChildData]); // 当对话ID或AI儿童数据变化时重新初始化
  
  // 🚚 定期更新配送状态（每5分钟）
  useEffect(() => {
    const interval = setInterval(() => {
      setDeliveryRefreshTrigger(prev => prev + 1);
    }, 300000); // 每5分钟（300秒）更新一次，降低资源消耗
    
    return () => clearInterval(interval);
  }, []);
  
  // 🔙 定期检查过期红包并自动退款
  useEffect(() => {
    // 每分钟检查一次过期红包
    const checkInterval = setInterval(() => {
      let hasRefund = false;
      const updatedMessages = conversation.messages.map(msg => {
        if (msg.moneyTransfer?.type === 'groupRedPacket' && msg.moneyTransfer.groupRedPacket) {
          const redPacket = msg.moneyTransfer.groupRedPacket;
          
          // 处理过期退款
          const result = processExpiredRedPacketRefund(
            redPacket,
            (senderId, senderName, refundAmount) => {
              console.log(`🔙 红包过期退款: ${senderName} 收到 ¥${refundAmount.toFixed(2)}`);
              
              // 如果是用户发的红包，退款到用户余额
              if (senderId === 'user' || msg.role === 'user') {
                receiveMoney(refundAmount, 'redPacket', conversation.id, '红包过期退回');
                hasRefund = true;
              }
            }
          );
          
          if (result.refunded) {
            // 返回更新后的消息（红包状态已在processExpiredRedPacketRefund中更新）
            return {
              ...msg,
              moneyTransfer: {
                ...msg.moneyTransfer,
                groupRedPacket: redPacket
              }
            };
          }
        }
        return msg;
      });
      
      // 如果有退款，更新对话
      if (hasRefund) {
        onUpdateConversation(conversation.id, {
          messages: updatedMessages
        });
      }
    }, 60000); // 每60秒检查一次
    
    return () => clearInterval(checkInterval);
  }, [conversation.id, conversation.messages, onUpdateConversation]);
  
  // 语音转文字相关state（Web Speech API）
  const [showVoiceConfirmModal, setShowVoiceConfirmModal] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isSpeechRecognizing, setIsSpeechRecognizing] = useState(false);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false);
  const speechRecognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>(''); // 🔥 追踪已确认的最终文本，避免重复
  
  // 检测Web Speech API支持
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechRecognitionSupported(!!SpeechRecognition);
  }, []);
  
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
    
    // 删除完成后立即恢复标记
    setIsDeleting(false);
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
    
    setIsDeleting(false);
  };

  // 取消多选模式
  const handleCancelMultiSelect = () => {
    setIsMultiSelectMode(false);
    setSelectedMessages([]);
  };

  // 📤 提取选中消息为文档 - 显示预览
  const handleExtractToDocument = () => {
    if (selectedMessages.length === 0) return;
    
    // 获取选中的消息对象
    const selectedMsgs = conversation.messages.filter(m => 
      selectedMessages.includes(m.id)
    );
    
    // 设置提取状态并显示预览弹窗
    setExtractingMessages(selectedMsgs);
    setShowExtractPreview(true);
    
    // 退出多选模式
    setIsMultiSelectMode(false);
    setSelectedMessages([]);
  };

  // 📄 保存提取的文档
  const handleSaveExtractedDocument = (document: DocumentMessage) => {
    // 创建文档消息
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: document.greeting || '已为您提取聊天记录',
      timestamp: Date.now(),
      document
    };
    
    // 添加到会话
    onUpdateConversation(conversation.id, {
      messages: [...conversation.messages, newMessage]
    });
    
    // 关闭预览弹窗
    setShowExtractPreview(false);
    setExtractingMessages([]);
    
    showToast('文档已保存到聊天记录', 'success');
  };

  // 📤 转发选中消息
  const handleForwardMessages = () => {
    if (selectedMessages.length === 0) return;
    
    // 获取选中的消息对象
    const selectedMsgs = conversation.messages.filter(m => 
      selectedMessages.includes(m.id)
    );
    
    setForwardingMessages(selectedMsgs);
    setShowForwardSelector(true);
  };

  // 📤 确认转发到目标会话
  const handleConfirmForward = (targetConversationIds: string[], mergeForward: boolean) => {
    if (forwardingMessages.length === 0) return;
    
    targetConversationIds.forEach(targetId => {
      const targetConv = conversations?.find(c => c.id === targetId);
      if (!targetConv) return;
      
      let newMessage: Message;
      
      if (mergeForward && forwardingMessages.length > 1) {
        // 合并转发
        const senderNames = new Map<string, { name: string; avatar?: string }>();
        forwardingMessages.forEach(msg => {
          const name = msg.role === 'user' 
            ? (currentUserProfile?.username || '我')
            : (conversation.characterSettings?.nickname || conversation.name);
          const avatar = msg.role === 'user'
            ? (currentUserProfile?.avatar)
            : (conversation.characterSettings?.avatar || conversation.avatar);
          senderNames.set(msg.id, { name, avatar });
        });
        
        const forwardedData = createMergedForward(
          forwardingMessages,
          {
            id: conversation.id,
            name: conversation.characterSettings?.nickname || conversation.name,
            type: conversation.type
          },
          senderNames
        );
        
        newMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'user',
          content: '转发了聊天记录',
          timestamp: Date.now(),
          forwarded: forwardedData
        };
      } else {
        // 单条转发
        const msg = forwardingMessages[0];
        const forwardedData = createSingleForward(
          msg,
          {
            id: conversation.id,
            name: conversation.characterSettings?.nickname || conversation.name,
            type: conversation.type
          }
        );
        
        newMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'user',
          content: forwardingMessages.length === 1 ? getMessagePreview(msg) : '转发了多条消息',
          timestamp: Date.now(),
          forwarded: forwardedData
        };
      }
      
      // 更新目标会话
      onUpdateConversation(targetId, {
        messages: [...targetConv.messages, newMessage]
      });
    });
    
    // 关闭选择器
    setShowForwardSelector(false);
    setForwardingMessages([]);
    
    // 退出多选模式
    setIsMultiSelectMode(false);
    setSelectedMessages([]);
    
    showToast(`已转发到${targetConversationIds.length}个会话`, 'success');
  };

  // 📤 从长按菜单转发单条消息
  const handleForwardSingleMessage = () => {
    if (!selectedMessageId) return;
    
    const message = conversation.messages.find(m => m.id === selectedMessageId);
    if (!message) return;
    
    setForwardingMessages([message]);
    setShowForwardSelector(true);
    setSelectedMessageId(null);
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

  // 🎵 音乐播放状态更新 - 同步到AI上下文服务
  useEffect(() => {
    if (!currentMusic) return;

    const updatePlaybackState = () => {
      const state = aiListeningSimulator.getCurrentState();
      setMusicPlaybackState(state);
      
      // 🎵 同步播放状态到音乐上下文服务
      if (state) {
        // 转换类型兼容
        const audioState = {
          isPlaying: state.isPlaying,
          currentTime: state.currentTime,
          duration: state.duration,
          volume: 1 // 默认音量
        };
        musicContextService.updatePlaybackState(audioState);
      }
    };

    // 立即更新一次
    updatePlaybackState();

    // 每秒更新播放状态
    const interval = setInterval(updatePlaybackState, 1000);

    return () => clearInterval(interval);
  }, [currentMusic]);

  // ============ 💬 子聊天功能处理函数 ============
  
  /**
   * 创建用户发起的子聊天
   */
  const handleCreateUserSubChat = (name: string) => {
    const newSubChat = createSubChat(name, conversation.id, 'user');
    const updatedConversation = addSubChatToConversation(conversation, newSubChat);
    onUpdateConversation(conversation.id, {
      subChats: updatedConversation.subChats,
    });
    
    // 自动打开新创建的子聊天
    setActiveSubChatId(newSubChat.id);
    setShowSubChatManager(false);
  };

  /**
   * 选择/打开子聊天
   */
  const handleSelectSubChat = (subChatId: string) => {
    // 标记为已读并激活
    const updatedConversation = updateSubChatInConversation(
      conversation,
      subChatId,
      { unreadCount: 0, status: 'active', isActive: true }
    );
    
    onUpdateConversation(conversation.id, {
      subChats: updatedConversation.subChats,
    });
    
    setActiveSubChatId(subChatId);
    setShowSubChatManager(false);
    
    // 从最小化列表中移除
    setMinimizedSubChats(prev => {
      const newSet = new Set(prev);
      newSet.delete(subChatId);
      return newSet;
    });
  };

  /**
   * 重命名子聊天
   */
  const handleRenameSubChat = (subChatId: string, newName: string) => {
    const updatedConversation = updateSubChatInConversation(
      conversation,
      subChatId,
      { name: newName }
    );
    
    onUpdateConversation(conversation.id, {
      subChats: updatedConversation.subChats,
    });
  };

  /**
   * 删除子聊天
   */
  const handleDeleteSubChat = (subChatId: string) => {
    // 如果当前正在查看这个子聊天，先关闭它
    if (activeSubChatId === subChatId) {
      setActiveSubChatId(null);
    }
    
    // 从最小化列表中移除
    setMinimizedSubChats(prev => {
      const newSet = new Set(prev);
      newSet.delete(subChatId);
      return newSet;
    });
    
    // 从对话中删除子聊天
    const updatedSubChats = (conversation.subChats || []).filter(sc => sc.id !== subChatId);
    onUpdateConversation(conversation.id, { subChats: updatedSubChats });
  };

  /**
   * 导入子聊天
   */
  const handleImportSubChat = (importData: any) => {
    try {
      // 生成新的ID避免冲突
      const newSubChatId = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 创建新的子聊天对象
      const importedSubChat = {
        ...importData.subChat,
        id: newSubChatId,
        conversationId: conversation.id, // 更新为当前对话ID
        createdAt: Date.now(),
        lastMessageTime: Date.now(),
        unreadCount: 0,
        isActive: false,
        status: 'active' as const,
      };
      
      // 更新消息ID避免冲突
      const importedMessages = importData.messages.map((msg: any) => ({
        ...msg,
        id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      }));
      
      importedSubChat.messages = importedMessages;
      
      // 添加到当前对话的子聊天列表
      const updatedSubChats = [...(conversation.subChats || []), importedSubChat];
      onUpdateConversation(conversation.id, { subChats: updatedSubChats });
      
      // 自动打开导入的子聊天
      setActiveSubChatId(newSubChatId);
      setShowSubChatManager(false);
      
    } catch (error) {
      console.error('导入子聊天处理失败:', error);
      alert('❌ 导入处理失败，请重试');
    }
  };

  /**
   * 关闭子聊天窗口
   */
  const handleCloseSubChat = (subChatId: string) => {
    const updatedConversation = updateSubChatInConversation(
      conversation,
      subChatId,
      { isActive: false }
    );
    
    onUpdateConversation(conversation.id, {
      subChats: updatedConversation.subChats,
    });
    
    if (activeSubChatId === subChatId) {
      setActiveSubChatId(null);
    }
    
    setMinimizedSubChats(prev => {
      const newSet = new Set(prev);
      newSet.delete(subChatId);
      return newSet;
    });
  };

  /**
   * 最小化/恢复子聊天窗口
   */
  const handleToggleMinimizeSubChat = (subChatId: string) => {
    setMinimizedSubChats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subChatId)) {
        newSet.delete(subChatId);
      } else {
        newSet.add(subChatId);
      }
      return newSet;
    });
  };

  /**
   * 在子聊天中发送消息
   */
  const handleSendSubChatMessage = async (subChatId: string, content: string) => {
    const subChat = (conversation.subChats || []).find(sc => sc.id === subChatId);
    if (!subChat) return;
    
    let updatedSubChat = subChat;
    
    // 如果有用户输入内容，先添加用户消息
    if (content.trim()) {
      const userMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      };
      
      // 添加到子聊天
      updatedSubChat = addMessageToSubChat(subChat, userMessage);
      
      // 更新对话
      onUpdateConversation(conversation.id, {
        subChats: (conversation.subChats || []).map(sc =>
          sc.id === subChatId ? updatedSubChat : sc
        ),
      });
    }
    
    // 4. 调用AI生成回复
    setIsGenerating(true);
    
    try {
      const characterName = conversation.characterSettings?.nickname || conversation.name;
      const characterPersonality = conversation.characterSettings?.personality || '';
      
      // 增强的system prompt - 包含角色的完整设定
      const characterInfo = conversation.characterSettings;
      const systemPrompt = `你是${characterName}。
      
${characterPersonality ? `性格：${characterPersonality}` : ''}
${characterInfo?.memoryEvents ? `重要记忆：${characterInfo.memoryEvents}` : ''}
${characterInfo?.languageStyle ? `语言风格：${characterInfo.languageStyle}` : ''}

这是一个子聊天窗口，你可以看到主聊天的完整历史和当前子聊天的内容。
子聊天名称：${updatedSubChat.name}
请保持角色一致性，自然回复当前对话。`;

      // 构建完整的消息历史：主聊天 + 子聊天标记 + 子聊天消息
      const messages = [
        { role: 'system', content: systemPrompt },
        // 1. 包含主聊天的所有消息
        ...conversation.messages.map(msg => ({
          role: msg.role,
          content: formatMessageForAI(msg),
        })),
        // 2. 标记子聊天开始
        { 
          role: 'system', 
          content: `[开始子聊天窗口: ${updatedSubChat.name}]` 
        },
        // 3. 子聊天的消息
        ...updatedSubChat.messages.map(msg => ({
          role: msg.role,
          content: formatMessageForAI(msg),
        })),
      ];
      
      const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: apiConfig.modelName,
          messages,
          temperature: 0.8,
        }),
      });
      
      if (!response.ok) {
        throw new Error('AI回复失败');
      }
      
      const data = await response.json();
      const aiContent = data.choices?.[0]?.message?.content || '抱歉，我现在无法回复。';
      
      // 5. 创建AI消息
      const aiMessage: Message = {
        id: `msg_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: aiContent,
        timestamp: Date.now(),
      };
      
      // 6. 添加AI回复到子聊天
      updatedSubChat = addMessageToSubChat(updatedSubChat, aiMessage);
      
      // 7. 更新对话
      onUpdateConversation(conversation.id, {
        subChats: (conversation.subChats || []).map(sc =>
          sc.id === subChatId ? updatedSubChat : sc
        ),
      });
      
    } catch (error) {
      console.error('子聊天AI回复失败:', error);
      showToast('AI回复失败，请重试', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * AI发起子聊天建议（显示弹窗让用户选择）
   */
  const handleAIInitiateSubChat = (purpose: string, suggestedName: string) => {
    // 创建子聊天建议
    const suggestion: SubChatSuggestion = {
      id: `ai_suggestion_${Date.now()}`,
      purpose,
      suggestedName,
      reason: '基于当前对话内容，AI认为开启子聊天会更好',
      priority: 'medium',
      timestamp: Date.now()
    };
    
    // 显示建议弹窗
    setSubChatSuggestion(suggestion);
    setShowSubChatSuggestionModal(true);
  };

  /**
   * 处理用户接受AI的子聊天建议
   */
  const handleAcceptSubChatSuggestion = (name: string, purpose: string) => {
    if (!subChatSuggestion) return;
    
    const newSubChat = createSubChat(name, conversation.id, 'ai', purpose);
    const updatedConversation = addSubChatToConversation(conversation, newSubChat);
    
    onUpdateConversation(conversation.id, {
      subChats: updatedConversation.subChats,
    });
    
    // 自动打开新创建的子聊天
    setActiveSubChatId(newSubChat.id);
    
    // 关闭建议弹窗
    setShowSubChatSuggestionModal(false);
    setSubChatSuggestion(null);
    
    showToast(`已创建子聊天：${name}`, 'success');
  };

  /**
   * 处理用户拒绝AI的子聊天建议
   */
  const handleRejectSubChatSuggestion = () => {
    setShowSubChatSuggestionModal(false);
    setSubChatSuggestion(null);
  };

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
      
      // 重置textarea高度
      if (inputRef.current) {
        (inputRef.current as unknown as HTMLTextAreaElement).style.height = '24px';
      }
      
      // 编辑完成后立即恢复标记
      setIsEditing(false);
      return;
    }

    // 🎵 检测网易云音乐分享链接
    const musicLinkDetection = NeteaseMusicParser.detectMusicLink(currentInput.trim());
    
    let newMessage: Message;
    
    if (musicLinkDetection.hasLink) {
      // 解析音乐信息
      const musicInfo = NeteaseMusicParser.parseFromShareText(
        musicLinkDetection.rawText || currentInput.trim(), 
        musicLinkDetection.url!
      );
      
      if (musicInfo) {
        // 创建包含网易云音乐信息的消息
        newMessage = {
          id: Date.now().toString() + Math.random(),
          role: 'user',
          content: '', // 音乐卡片消息不显示文字内容
          timestamp: Date.now(),
          neteaseMusicInfo: musicInfo, // 添加网易云音乐信息
          // 如果有引用消息,添加引用信息
          ...(quotedMessage && quotedMessage.role !== 'system' && {
            replyTo: {
              id: quotedMessage.id,
              content: quotedMessage.content,
              role: quotedMessage.role as 'user' | 'assistant'
            }
          })
        };
        
        console.log('🎵 检测到网易云音乐分享:', musicInfo);
      } else {
        // 如果解析失败，发送原始消息
        newMessage = {
          id: Date.now().toString() + Math.random(),
          role: 'user',
          content: currentInput.trim(),
          timestamp: Date.now(),
          ...(quotedMessage && quotedMessage.role !== 'system' && {
            replyTo: {
              id: quotedMessage.id,
              content: quotedMessage.content,
              role: quotedMessage.role as 'user' | 'assistant'
            }
          })
        };
      }
    } else {
      // 普通消息
      newMessage = {
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
    }

    onUpdateConversation(conversation.id, {
      messages: [...conversation.messages, newMessage],
      lastMessageTime: Date.now(),
      isHidden: false, // 确保发送消息时恢复显示
    });

    // 🧠 [消息感知] 用户发送消息后，AI立即感知到消息内容（后台处理）
    messagePerceptionService.perceiveMessage(conversation, newMessage);

    // 如果AI正在生成，将用户消息添加到待处理队列
    if (isGenerating && conversation.type === 'group') {
      setPendingUserMessages(prev => [...prev, newMessage.id]);
      console.log('📝 用户在AI回复时发送消息，将在下轮处理');
    }

    setCurrentInput('');
    setPendingMessages([]); // 清除剩余消息
    setShowAllSentHint(false);
    setQuotedMessage(null); // 清除引用
    
    // 重置textarea高度
    if (inputRef.current) {
      (inputRef.current as unknown as HTMLTextAreaElement).style.height = '24px';
    }
    
    // 🎯 AI理解力经验计算（仅对AI儿童有效）
    if (conversation.aiChildData) {
      handleChatExperienceUpdate(conversation, newMessage)
        .then(experienceMessage => {
          if (experienceMessage) {
            console.log('🎉 AI儿童理解力经验获得：', experienceMessage);
            // 可以选择在界面上显示经验获得的提示
            // 例如：showToast(experienceMessage);
          }
        })
        .catch(error => {
          console.error('❌ 处理AI儿童经验失败：', error);
        });
    }
    
    // 🚀 调度延后回复（替代点击生成按钮）
    const bufferSeconds = conversation.messageBufferSeconds ?? 15;
    schedulePendingReply(conversation.id, bufferSeconds);
    
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
  const handleReceiveMoney = async (messageId: string, accept: boolean) => {
    // 找到要处理的红包消息
    const targetMessage = conversation.messages.find(msg => msg.id === messageId);
    if (!targetMessage || !targetMessage.moneyTransfer) return;
    
    const updatedMessages = conversation.messages.map(msg => {
      if (msg.id === messageId && msg.moneyTransfer) {
        if (accept) {
          // 接收红包 - 更新用户钱包
          receiveMoney(
            msg.moneyTransfer.amount,
            msg.moneyTransfer.type,
            conversation.id,
            msg.moneyTransfer.message
          );

          // 🚀 如果是AI发送的红包/转账，同步到AI智能财务系统
          if (targetMessage.role === 'assistant') {
            addAIFinanceTransaction(
              conversation.id,
              'expense',  // AI支出
              msg.moneyTransfer.amount,
              msg.moneyTransfer.type === 'redPacket' ? '红包支出' : '转账支出',
              `发给用户${msg.moneyTransfer.type === 'redPacket' ? '红包' : '转账'}: ${msg.moneyTransfer.message || '无留言'}`,
              'user',
              messageId,
              false
            ).catch(error => {
              console.error('❌ 同步AI财务记录失败:', error);
            });
          }
          // 🚀 如果是用户发送给AI的红包/转账，AI收到后记录收入
          else if (targetMessage.role === 'user') {
            addAIFinanceTransaction(
              conversation.id,
              'income',  // AI收入
              msg.moneyTransfer.amount,
              msg.moneyTransfer.type === 'redPacket' ? '红包收入' : '转账收入',
              `收到用户${msg.moneyTransfer.type === 'redPacket' ? '红包' : '转账'}: ${msg.moneyTransfer.message || '无留言'}`,
              'user',
              messageId,
              false
            ).catch(error => {
              console.error('❌ 同步AI财务记录失败:', error);
            });
          }

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
    // AI发红包时已经带有自己的回复，不需要再次生成
  };
  
  // 单击头像 - 打开操作菜单
  const handleAvatarClick = (messageId: string, senderId: string, senderName: string, senderAvatar?: string) => {
    if (conversation.type !== 'group') return;
    setAvatarMenuOpen({ messageId, senderId, name: senderName, avatar: senderAvatar });
  };

  // 拍一拍（从菜单触发）
  const handlePatAction = (messageId: string, senderName: string) => {
    if (conversation.type !== 'group') return;
    
    // 添加拍一拍reaction到消息
    const updatedMessages = conversation.messages.map(m => {
      if (m.id === messageId) {
        const existingReactions = m.reactions || [];
        return {
          ...m,
          reactions: [...existingReactions, { from: 'user' as const, type: 'pat' }]
        };
      }
      return m;
    });
    
    // 显示拍一拍提示
    const patMessage: Message = {
      id: `pat_${Date.now()}`,
      role: 'system',
      content: `你拍了拍 ${senderName}`,
      timestamp: Date.now()
    };
    
    onUpdateConversation(conversation.id, {
      messages: [...updatedMessages, patMessage]
    });
    
    // 关闭菜单
    setAvatarMenuOpen(null);
  };

  // @对方（从菜单触发）
  const handleAtAction = (senderName: string) => {
    if (conversation.type !== 'group') return;
    
    const atText = `@${senderName} `;
    setCurrentInput(prev => prev + atText);
    // 聚焦输入框
    if (inputRef.current) {
      (inputRef.current as unknown as HTMLTextAreaElement).focus();
    }
    
    // 关闭菜单
    setAvatarMenuOpen(null);
  };

  // 发消息（从菜单触发）
  const handleSendMessageAction = (senderName: string) => {
    if (conversation.type !== 'group') return;
    
    // 导航到私聊
    if (onNavigateToPrivateChat) {
      onNavigateToPrivateChat(senderName);
    }
    
    // 关闭菜单
    setAvatarMenuOpen(null);
  };

  // 点击@成员列表中的成员
  const handleSelectAtMember = (nickname: string) => {
    const beforeAt = currentInput.slice(0, atCursorPosition);
    const afterAt = currentInput.slice(atCursorPosition + 1 + atFilterText.length);
    const newInput = `${beforeAt}@${nickname} ${afterAt}`;
    setCurrentInput(newInput);
    setShowAtMemberList(false);
    setAtFilterText('');
    
    // 聚焦输入框并设置光标位置
    if (inputRef.current) {
      const textarea = inputRef.current as unknown as HTMLTextAreaElement;
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = beforeAt.length + nickname.length + 2; // @昵称 后面
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  // 处理图片上传（支持多图）
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const newMessages: Message[] = [];
      const baseTimestamp = Date.now();
      
      // 处理每张图片
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 读取图片为base64
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const imageData = reader.result as string;
            
            // 创建用户消息（显示图片）
            const userMessage: Message = {
              id: `msg_${baseTimestamp + i}_${Math.random().toString(36).substr(2, 9)}`,
              role: 'user',
              content: '[图片]',
              timestamp: baseTimestamp + i,
              mediaType: 'image',
              mediaUrl: imageData
            };
            
            newMessages.push(userMessage);
            resolve();
          };
          
          reader.readAsDataURL(file);
        });
      }
      
      // 一次性添加所有图片到聊天记录，不自动生成回复
      onUpdateConversation(conversation.id, {
        messages: [...conversation.messages, ...newMessages],
        lastMessageTime: Date.now()
      });

      // 关闭工具栏
      setShowToolbar(false);
      
      console.log(`✅ 已发送${files.length}张图片`);

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

  // 打开表情包类型选择菜单
  const handleStickerClick = () => {
    setShowStickerTypeMenu(true);
    setShowToolbar(false);
  };
  
  // 处理选中表情包
  const handleSelectSticker = (sticker: StickerItem) => {
    // 发送表情包消息
    const stickerMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: '', // 表情包不需要文字内容
      timestamp: Date.now(),
      mediaType: 'sticker',
      mediaUrl: sticker.imageUrl,
      mediaDescription: sticker.description,
    };
    
    // 添加到对话
    onUpdateConversation(conversation.id, {
      messages: [...conversation.messages, stickerMessage],
      lastMessageTime: Date.now()
    });
    
    setShowUserStickerPicker(false);
  };

  // 🎵 音乐分享处理函数 - 重写为上下文感知版本
  const handleMusicShare = async (musicInfo: MusicInfo) => {
    console.log('🎵 分享音乐:', musicInfo);
    
    // 增强音乐信息，添加歌词支持
    const enhancedMusicInfo = await enhanceMusicWithLyrics(musicInfo);
    
    // 创建音乐消息
    const musicMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `分享了音乐《${enhancedMusicInfo.title}》`,
      timestamp: Date.now(),
      music: enhancedMusicInfo as MusicMessage
    };

    // 添加到聊天记录
    onUpdateConversation(conversation.id, {
      messages: [...conversation.messages, musicMessage],
      lastMessageTime: Date.now(),
    });

    // 🎵 启动音乐上下文服务 - AI开始"感知"音乐
    setCurrentMusic(musicInfo);
    musicContextService.updateCurrentMusic(enhancedMusicInfo as MusicMessage);
    
    console.log('🎭 AI现在可以感知音乐状态，等待用户主动聊天...');

    setShowToolbar(false);
    setShowMusicShareModal(false);
  };

  // 🎵 真实音乐分享处理函数
  const handleRealMusicShare = async (realMusicInfo: RealMusicInfo) => {
    console.log('🎵 分享真实音乐:', realMusicInfo);
    
    // 转换为MusicMessage格式
    const musicMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `分享了音乐《${realMusicInfo.title}》`,
      timestamp: Date.now(),
      music: {
        id: realMusicInfo.id,
        title: realMusicInfo.title,
        artist: realMusicInfo.artist,
        album: realMusicInfo.album,
        duration: realMusicInfo.duration,
        genre: realMusicInfo.genre,
        releaseYear: realMusicInfo.releaseYear,
        audioUrl: realMusicInfo.audioUrl,
        previewUrl: realMusicInfo.previewUrl,
        coverUrl: realMusicInfo.coverUrl,
        source: realMusicInfo.source,
        playable: realMusicInfo.playable,
        lyrics: '',
        isRealMusic: true // 标记为真实音乐
      } as MusicMessage & { isRealMusic: boolean }
    };

    // 添加到聊天记录
    onUpdateConversation(conversation.id, {
      messages: [...conversation.messages, musicMessage],
      lastMessageTime: Date.now(),
    });

    console.log('✅ 真实音乐已添加到聊天');
    setShowRealMusicModal(false);
    setShowToolbar(false);
  };

  // 🎵 增强音乐信息，添加歌词和时间轴 - 使用新的动态歌词服务
  const enhanceMusicWithLyrics = async (musicInfo: MusicInfo): Promise<MusicInfo> => {
    // 如果音乐信息中已经有歌词，直接返回
    if ((musicInfo as any).lyrics) {
      console.log(`🎵 音乐《${musicInfo.title}》已包含歌词`);
      return musicInfo;
    }

    // 动态获取歌词
    try {
      const { enhanceMusicWithLyrics: getLyrics } = await import('../utils/lyricsService');
      const lyricsInfo = await getLyrics(musicInfo.title, musicInfo.artist);
      
      const enhanced = {
        ...musicInfo,
        ...(lyricsInfo.lyrics && { lyrics: lyricsInfo.lyrics }),
        ...(lyricsInfo.lyricsWithTime && { lyricsWithTime: lyricsInfo.lyricsWithTime })
      };

      console.log(`🎵 为《${enhanced.title}》获取歌词 (来源: ${lyricsInfo.source})`);
      return enhanced;
    } catch (error) {
      console.error('获取歌词失败:', error);
      return musicInfo;
    }
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
    
    // 发送确认消息（只在代付时发送，礼物接收不发送强制文本）
    if (message.order.type !== 'gift') {
      const confirmMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content: '已帮你付款啦！',
        timestamp: Date.now()
      };
      
      onUpdateConversation(conversation.id, {
        messages: [...updatedMessages, confirmMessage],
        lastMessageTime: Date.now()
      });
    } else {
      // 礼物接收时不发送强制文本，只更新订单状态
      onUpdateConversation(conversation.id, {
        messages: updatedMessages,
        lastMessageTime: Date.now()
      });
    }
    
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
    
    // 发送拒绝消息（只在代付时发送，礼物拒绝不发送强制文本）
    if (message.order.type !== 'gift') {
      const rejectMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content: '抱歉，暂时无法帮忙',
        timestamp: Date.now()
      };
      
      onUpdateConversation(conversation.id, {
        messages: [...updatedMessages, rejectMessage],
        lastMessageTime: Date.now()
      });
    } else {
      // 礼物拒绝时不发送强制文本，只更新订单状态
      onUpdateConversation(conversation.id, {
        messages: updatedMessages,
        lastMessageTime: Date.now()
      });
    }
    
    // 显示Toast提示
    showToast(
      message.order.type === 'gift' ? '❌ 已退回礼物' : '❌ 已拒绝代付',
      'info'
    );
  };

  // 处理AI的订单响应（解析AI回复中的[接受礼物]等标记）
  const processAIOrderResponse = async (aiMessage: Message, currentMessages: Message[]) => {
    // 检测AI回复中的订单响应标记
    const responseMatch = aiMessage.content.match(/\[(接受礼物|退回礼物|同意代付|拒绝代付)\]/);
    if (!responseMatch) return;
    
    const responseType = responseMatch[1];
    console.log(`🎁 处理AI订单响应: ${responseType}`);
    
    // 🔥 使用传入的最新消息列表，而不是conversation.messages
    // 找到最近的待处理订单消息（用户发送的）
    const recentOrderMessage = [...currentMessages]
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
      // 💰 检查AI智能财务余额是否足够代付
      const aiFinanceData = await getAIFinanceData(conversation.id);
      const orderAmount = recentOrderMessage.order.totalAmount;
      
      if (aiFinanceData.balance >= orderAmount) {
        // AI余额足够，扣款并同意代付
        const success = await addAIFinanceTransaction(
          conversation.id,
          'expense',
          orderAmount,
          '购物支出',
          `帮用户代付: ${recentOrderMessage.order.products.map(p => p.name).join('、')}`,
          'user',
          recentOrderMessage.id,
          false
        );
        
        if (success) {
          newStatus = 'paid';
          console.log(`✅ AI智能财务代付成功: ¥${orderAmount}, 原余额: ¥${aiFinanceData.balance}`);
        } else {
          newStatus = 'rejected';
          console.log(`❌ AI智能财务代付失败`);
          showToast(`AI代付失败，请稍后重试`, 'error');
        }
      } else {
        // AI余额不足，拒绝代付
        newStatus = 'rejected';
        console.log(`❌ AI智能财务余额不足无法代付: 需要¥${orderAmount}, 仅有¥${aiFinanceData.balance}`);
        showToast(`AI余额不足无法代付（需要¥${orderAmount}，仅有¥${aiFinanceData.balance}）`, 'error');
      }
    } else if (responseType === '退回礼物' || responseType === '拒绝代付') {
      newStatus = 'rejected';
    }
    
    // 🔥 使用传入的最新消息列表更新订单状态
    const updatedMessages = currentMessages.map(msg => {
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
    
    // 🔥 只更新一次，使用最新的消息列表
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
  // 🔥 重要：接收currentMessages参数，避免覆盖最新消息
  const processAIMoneyResponse = (aiMessage: Message, currentMessages: Message[]) => {
    // 检查是否是红包/转账响应消息（amount为0）
    if (!aiMessage.moneyTransfer || aiMessage.moneyTransfer.amount !== 0) {
      return currentMessages; // 不是需要处理的响应，直接返回
    }
    
    console.log(`💰 [processAIMoneyResponse] 检测到AI红包响应消息`);
    console.log(`   消息ID: ${aiMessage.id}`);
    console.log(`   类型: ${aiMessage.moneyTransfer.type}`);
    console.log(`   状态: ${aiMessage.moneyTransfer.status}`);
    
    // 🔥 使用currentMessages而不是conversation.messages
    const userMoneyMessage = [...currentMessages]
      .reverse()
      .find(msg => 
        msg.role === 'user' && 
        msg.moneyTransfer && 
        msg.moneyTransfer.status === 'pending' &&
        msg.moneyTransfer.type === aiMessage.moneyTransfer!.type
      );
    
    if (!userMoneyMessage || !userMoneyMessage.moneyTransfer) {
      console.error('❌ [processAIMoneyResponse] 未找到待处理的红包/转账消息');
      console.error('   currentMessages数量:', currentMessages.length);
      console.error('   查找条件: role=user, status=pending, type=' + aiMessage.moneyTransfer.type);
      return currentMessages; // 返回原消息数组
    }
    
    const originalAmount = userMoneyMessage.moneyTransfer.amount;
    const responseStatus = aiMessage.moneyTransfer.status; // 'received' 或 'returned'
    
    console.log(`💰 [processAIMoneyResponse] 找到原始红包消息`);
    console.log(`   原始消息ID: ${userMoneyMessage.id}`);
    console.log(`   金额: ¥${originalAmount}`);
    console.log(`   新状态: ${responseStatus}`);
    
    // 🔥 更新currentMessages而不是conversation.messages
    const updatedMessages = currentMessages.map(msg => {
      // 更新AI响应消息的金额
      if (msg.id === aiMessage.id && msg.moneyTransfer) {
        console.log(`   ✓ 更新AI响应消息金额: ${originalAmount}`);
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
        console.log(`   ✓ 更新用户红包状态: ${responseStatus}`);
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
    
    console.log(`✅ [processAIMoneyResponse] 红包状态更新完成: ${responseStatus}`);
    
    // 显示Toast提示
    const toastMessages: Record<string, string> = {
      'received': `💰 AI已${aiMessage.moneyTransfer.type === 'redPacket' ? '领取红包' : '收到转账'} ¥${originalAmount}`,
      'returned': `↩️ AI已退回${aiMessage.moneyTransfer.type === 'redPacket' ? '红包' : '转账'} ¥${originalAmount}`
    };
    showToast(toastMessages[responseStatus] || '💰 红包状态已更新', 'success');
    
    // 🔥 返回更新后的消息数组
    return updatedMessages;
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

  // 开始Web Speech语音识别
  const startSpeechRecognition = () => {
    if (!speechRecognitionSupported) {
      console.warn('浏览器不支持Web Speech API');
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'zh-CN';
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsSpeechRecognizing(true);
        console.log('🎤 语音识别已开始');
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // 🔥 修复重复问题：只追加新的最终文本
        if (finalTranscript) {
          // 有最终结果，追加到已确认的文本中
          finalTranscriptRef.current += finalTranscript;
          setVoiceTranscript(finalTranscriptRef.current);
        } else if (interimTranscript) {
          // 只有临时结果，显示在已确认文本后面（不保存）
          setVoiceTranscript(finalTranscriptRef.current + interimTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('🎤 语音识别错误:', event.error);
        setIsSpeechRecognizing(false);
        
        if (event.error === 'no-speech') {
          console.log('未检测到语音，请重试');
        } else if (event.error === 'network') {
          console.log('网络错误，语音识别服务不可用');
        } else if (event.error === 'not-allowed') {
          alert('麦克风权限被拒绝，请在浏览器设置中允许麦克风访问');
        }
      };

      recognition.onend = () => {
        setIsSpeechRecognizing(false);
        console.log('🎤 语音识别已结束');
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error('启动语音识别失败:', error);
      setIsSpeechRecognizing(false);
    }
  };

  // 停止Web Speech语音识别
  const stopSpeechRecognition = () => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }
    setIsSpeechRecognizing(false);
  };

  // 语音录音功能
  const handleVoiceClick = async () => {
    // 直接打开弹窗，让用户选择输入或语音识别
    setVoiceTranscript('');
    finalTranscriptRef.current = ''; // 🔥 重置已确认的文本
    setShowVoiceConfirmModal(true);
  };

  // 旧的录音功能已移除，现在使用Web Speech API直接识别

  // AI自动领取群红包函数
  const handleAIAutoClaimRedPacket = async (
    redPacket: any, 
    senderAiId: string,
    currentContextMessages?: Message[],
    onClaim?: (message: Message) => void
  ) => {
    if (conversation.type !== 'group' || !conversation.members) return;
    
    console.log(`🎁 开始AI自动领取红包流程，发送者: ${senderAiId}`);
    
    // 获取群中的AI成员（排除发送者和用户）
    const aiMembers = conversation.members
      .filter(memberId => memberId !== senderAiId && memberId !== 'user')
      .map(memberId => conversations.find(c => c.id === memberId))
      .filter(Boolean) as Conversation[];
    
    if (aiMembers.length === 0) {
      console.log('🎁 没有其他AI成员可以领取红包');
      return;
    }
    
    console.log(`🎁 可领取红包的AI成员: ${aiMembers.map(ai => ai.name).join('、')}`);
    
    // 使用AI红包决策系统
    const { handleAIGroupRedPacketClaiming } = await import('../utils/aiGroupRedPacketDecision');
    
    // 创建红包消息对象（用于决策系统）
    const redPacketMessage = {
      id: `redpacket_${Date.now()}`,
      role: 'assistant' as const,
      content: '[群红包]',
      timestamp: Date.now(),
      moneyTransfer: {
        type: 'groupRedPacket' as const,
        amount: redPacket.totalAmount,
        message: redPacket.message,
        status: 'pending' as const,
        groupRedPacket: redPacket
      }
    };
    
    try {
      // 使用传入的上下文或当前会话消息
      const contextMessages = currentContextMessages || conversation.messages;

      await handleAIGroupRedPacketClaiming(
        redPacketMessage,
        aiMembers,
        conversation,
        contextMessages.slice(-10), // 最近10条消息作为上下文
        apiConfig,
        (aiId: string, aiName: string, amount: number) => {
          console.log(`🎁 ${aiName} 领取了红包 ¥${amount.toFixed(2)}`);
          
          // 添加AI领取红包的系统消息
          const claimMessage = {
            id: `claim_${Date.now()}_${aiId}`,
            role: 'system' as const,
            content: `${aiName} 领取了红包 ¥${amount.toFixed(2)}`,
            timestamp: Date.now(),
            systemMessageType: 'redPacketClaim' as const
          };
          
          if (onClaim) {
            // ✅ 如果提供了回调，使用回调处理（用于生成过程中）
            onClaim(claimMessage);
          } else {
            // 更新对话，添加领取消息
            const updatedMessages = [...conversation.messages, claimMessage];
            onUpdateConversation(conversation.id, {
              messages: updatedMessages,
              lastMessageTime: Date.now()
            });
          }
        }
      );
    } catch (error) {
      console.error('AI自动领取红包失败:', error);
    }
  };

  // 处理消息回应 (Reaction)
  const handleReactMessage = (emoji: string) => {
    if (!selectedMessageId) return;
    
    const updatedMessages = conversation.messages.map(msg => {
      if (msg.id === selectedMessageId) {
        const currentReactions = msg.reactions || [];
        // 检查是否已经有该用户的该表情
        const existingIndex = currentReactions.findIndex(r => r.from === 'user' && r.type === emoji);
        
        let newReactions;
        if (existingIndex >= 0) {
          // 如果已存在，则移除（toggle）
          newReactions = currentReactions.filter((_, i) => i !== existingIndex);
        } else {
          // 否则添加
          newReactions = [...currentReactions, { from: 'user' as const, type: emoji }];
        }
        
        return { ...msg, reactions: newReactions };
      }
      return msg;
    });
    
    onUpdateConversation(conversation.id, {
      messages: updatedMessages
    });
  };

  // 🎯 AI主动发送私聊消息函数
  const maybeSendAutoPrivateDM = async (aiId: string, groupMessage: Message, fromGroupId: string) => {
    if (!groupMessage.content || !currentUserProfile) return;
    
    // 检测AI是否承诺私聊发送内容
    const privatePromiseKeywords = [
      '我私聊发给你', '我私下发给你', '我单独发给你',
      '私聊发', '私下发', '单独发',
      '我私聊给你发', '我私下给你发', '我单独给你发',
      '等下私聊发', '等下私下发', '等下单独发',
      '稍后私聊发', '稍后私下发', '稍后单独发'
    ];
    
    const hasPromise = privatePromiseKeywords.some(keyword => groupMessage.content.includes(keyword));
    if (!hasPromise) return;
    
    console.log(`🎯 检测到AI ${aiId} 承诺私聊发送内容: ${groupMessage.content.substring(0, 50)}...`);
    
    // 查找AI对应的私聊会话
    const privateConversation = conversations.find(c => c.type === 'private' && c.id === aiId);
    if (!privateConversation) {
      console.warn(`⚠️ 未找到AI ${aiId} 的私聊会话`);
      return;
    }
    
    // 延迟3-8秒后发送私聊消息（模拟真实行为）
    const delay = Math.random() * 5000 + 3000;
    setTimeout(async () => {
      try {
        console.log(`🎯 AI ${aiId} 开始发送承诺的私聊消息...`);
        
        // 构建私聊发送的提示词
        const privatePrompt = `你在群聊中承诺要私聊发送内容给用户。现在请履行承诺，发送相关内容。

群聊背景：${fromGroupId}
你的承诺：${groupMessage.content.substring(0, 100)}...

请发送符合承诺的内容，可以是：
- 有趣的视频（使用[视频:描述]格式）
- 好看的图片（使用[图片:描述]格式）  
- 有用的链接
- 其他符合承诺的内容

要求：
1. 内容要符合你在群聊中的承诺
2. 自然地提及群聊中的承诺
3. 内容要有趣、有价值
4. 长度控制在50-200字以内`;

        // 调用Chat API生成私聊消息（使用统一的API helper）
        const { getAIResponse } = await import('../utils/apiHelper');
        
        const aiReply = await getAIResponse(
          apiConfig,
          [
            {
              role: 'system',
              content: `你是${privateConversation.characterSettings?.nickname || privateConversation.name}。${privateConversation.characterSettings?.systemPrompt || ''}`
            },
            {
              role: 'user',
              content: privatePrompt
            }
          ],
          {
            temperature: 0.7,
            max_tokens: 500
          }
        );
        
        if (!aiReply || aiReply.trim() === '') {
          console.warn('AI私聊回复为空');
          return;
        }
        
        // 创建私聊消息
        const privateMessage: Message = {
          id: Date.now().toString() + '_private_' + Math.random(),
          role: 'assistant',
          content: aiReply.trim(),
          timestamp: Date.now(),
        };
        
        // 更新私聊会话
        const updatedPrivateMessages = [...privateConversation.messages, privateMessage];
        onUpdateConversation(privateConversation.id, {
          messages: updatedPrivateMessages,
          lastMessageTime: Date.now()
        });
        
        console.log(`✅ AI ${aiId} 已发送承诺的私聊消息: ${aiReply.substring(0, 50)}...`);
        
        // 如果用户当前不在该私聊会话，可以显示一个通知（可选）
        if (conversation.id !== privateConversation.id) {
          console.log(`📬 AI ${aiId} 在私聊中发送了消息，但用户当前不在此会话`);
        }
        
      } catch (error) {
        console.error('AI发送私聊消息失败:', error);
      }
    }, delay);
  };

  // 群聊生成函数
  const handleGroupChatGenerate = async () => {
    // 🚀 启动后台生成任务
    backgroundGenerationService.startGeneration(conversation.id);
    setIsGenerating(true);
    setShowSendingHint(true);

    try {
      const isFreeMode = conversation.groupChatMode === 'free';
      const generateFunction = isFreeMode ? generateGroupChatRepliesFreeMode : generateGroupChatReplies;
      
      // 使用ref来追踪最新的消息列表
      let currentMessages = [...conversation.messages];
      
      // 📸 创建消息ID快照（用于检测用户在生成期间发送的新消息）
      const messageIdsSnapshot = new Set(
        conversation.messages.map(m => m.id)
      );
      
      console.log('📸 创建消息快照:', {
        快照时刻消息数: conversation.messages.length,
        最后一条消息: conversation.messages[conversation.messages.length - 1]?.content?.substring(0, 20) || 'N/A'
      });
      
      // 调用群聊服务
      // 无人回复检查已在 onAllComplete 回调中处理，避免误报
      await generateFunction(
        conversation,
        apiConfig,
        conversations,
        {
          onGroupChatProcessing: () => {
            // 🚀 全局处理开始
            console.log('🔄 群聊处理中...');
            setIsGroupProcessing(true);
            setShowSendingHint(false); // 隐藏普通发送提示，改用全局处理提示
          },
          
          onAIStart: (aiId, aiName) => {
            console.log(`🤖 ${aiName} 开始回复`);
            // 隐藏全局处理提示和发送中提示，显示AI打字动画
            setIsGroupProcessing(false);
            setShowSendingHint(false);
            
            // 获取AI头像
            const aiMember = conversations.find(c => c.id === aiId);
            setCurrentTypingAI({
              id: aiId,
              name: aiName,
              avatar: aiMember?.characterSettings?.avatar || aiMember?.avatar
            });
          },
          
          onAITyping: (aiId) => {
            // 保持打字动画显示
            console.log(`⌨️ ${aiId} 正在输入...`);
          },
          
          onAIMessage: (_aiId, message) => {
            // 🐛 修复方案3的bug：正确处理消息合并
            
            // 1️⃣ 累积AI消息到快照
            currentMessages = [...currentMessages, message];
            
            // 🌉 检测AI消息中的私聊意图
            if (message.role === 'assistant' && message.content && currentUserProfile) {
              groupToPrivateMemoryService.shouldCreateBridge(
                message,
                conversation.id,
                currentUserProfile.username,
                conversations
              );
              
              // 🎯 检测AI承诺私聊发送内容，主动发送私聊消息
              maybeSendAutoPrivateDM(_aiId, message, conversation.id);
            }
            
            // 🎁 检测AI发送的群红包，触发其他AI自动领取
            if (message.moneyTransfer?.type === 'groupRedPacket' && message.moneyTransfer.groupRedPacket) {
              const redPacket = message.moneyTransfer.groupRedPacket;
              console.log(`🎁 检测到AI发送的群红包: ${redPacket.message} (¥${redPacket.totalAmount})`);
              
              // 延迟1-5秒，让其他AI陆续尝试领取红包
              setTimeout(() => {
                handleAIAutoClaimRedPacket(
                  redPacket, 
                  _aiId,
                  currentMessages,
                  (claimMessage) => {
                    // ✅ 回调：更新本地 currentMessages 并触发更新
                    console.log(`🎁 [回调] 添加红包领取消息: ${claimMessage.content}`);
                    currentMessages = [...currentMessages, claimMessage];
                    onUpdateConversation(conversation.id, {
                      messages: currentMessages,
                      lastMessageTime: Date.now()
                    });
                  }
                );
              }, Math.random() * 4000 + 1000);
            }
            
            // 2️⃣ 提取用户在生成期间发送的新消息
            const currentConversationMessages = conversation.messages;
            const userNewMessages = currentConversationMessages.filter(m => {
              const isNewUser = !messageIdsSnapshot.has(m.id) && m.role === 'user';
              const notInCurrent = !currentMessages.some(cm => cm.id === m.id);
              return isNewUser && notInCurrent;
            });
            
            if (userNewMessages.length > 0) {
              console.log(`🆕 检测到${userNewMessages.length}条用户新消息，保留`);
            }
            
            // 3️⃣ 合并：currentMessages（快照+AI消息） + 用户新消息
            const mergedMessages = [...currentMessages, ...userNewMessages];
            
            console.log(`📦 消息合并: 快照+AI=${currentMessages.length}, 用户新增=${userNewMessages.length}, 总计=${mergedMessages.length}`);
            
            // 4️⃣ 更新对话
            onUpdateConversation(conversation.id, {
              messages: mergedMessages,
              lastMessageTime: Date.now()
            });
          },
          
          onAIComplete: (aiId, messages) => {
            console.log(`✅ ${aiId} 完成回复，共${messages.length}条消息`);
            // 🎯 不清除打字动画，让下一个AI的onAIStart自动覆盖
            // 这样AI之间的衔接更流畅，用户始终看到"正在输入..."
            // 只在onAllComplete时才清除
          },
          
          onAIError: (aiId, error) => {
            console.error(`❌ ${aiId} 回复出错:`, error);
            // 显示错误提示（可选）
          },
          
          onAllComplete: (replies) => {
            console.log('🎉 所有AI完成回复');
            
            // 🔍 检测用户在生成期间发送的新消息
            const userNewMessages = conversation.messages.filter(m => 
              !messageIdsSnapshot.has(m.id) &&  // 不在快照中
              m.role === 'user'                  // 是用户消息
            );
            
            if (userNewMessages.length > 0) {
              console.log('📬 检测到用户新消息:', {
                新消息数: userNewMessages.length,
                消息ID: userNewMessages.map(m => m.id),
                消息内容: userNewMessages.map(m => m.content.substring(0, 30))
              });
            } else {
              console.log('✅ 无新增用户消息（方案3：已在onAIMessage中实时追加）');
            }
            
            // 🐛 修复：使用currentMessages作为基础，再添加用户新消息
            // currentMessages = 快照 + 所有AI消息（不会丢失）
            // userNewMessages = 用户在生成期间发的消息
            const finalMessages = [...currentMessages, ...userNewMessages];
            
            console.log('📦 最终消息列表:', {
              总消息数: finalMessages.length,
              AI回复数: replies.length,
              用户新消息数: userNewMessages.length
            });
            
            setIsGenerating(false);
            setIsGroupProcessing(false); // 重置群聊处理状态
            setCurrentTypingAI(null);
            setShowSendingHint(false);
            
            // 🚀 通知后台服务生成完成
            backgroundGenerationService.completeGeneration(conversation.id, finalMessages);
            
            // 🧠 群聊记忆总结（后台处理）
            if (conversation.type === 'group' && conversation.members) {
              setTimeout(() => {
                performGroupMemorySummary(currentMessages).catch(err => {
                  console.error('群聊记忆总结失败:', err);
                });
              }, 1000); // 延迟1秒后执行，避免阻塞
            }
            
            // 📝 处理用户新消息（标记为待处理，触发下一轮回复）
            if (userNewMessages.length > 0) {
              console.log('📝 用户新消息将在下一轮处理');
              
              // 合并到待处理队列（包含旧的和新的）
              const allPendingIds = [
                ...pendingUserMessages,
                ...userNewMessages.map(m => m.id)
              ];
              setPendingUserMessages(allPendingIds);
              
              // 延迟触发新一轮生成，让用户看清楚上一轮已完成
              setTimeout(() => {
                console.log('🔄 触发新一轮AI回复，处理用户新消息');
                handleGroupChatGenerate();
              }, 1000);
              return; // 不显示无人回应提示
            }
            
            // 检查旧的待处理消息（兼容性）
            if (pendingUserMessages.length > 0) {
              console.log(`📬 检测到${pendingUserMessages.length}条旧的待处理用户消息，触发新一轮生成`);
              setPendingUserMessages([]); // 清空待处理队列
              
              setTimeout(() => {
                handleGroupChatGenerate();
              }, 1000);
              return;
            }
            
            // 自由模式：如果没有AI回复，显示提示
            if (isFreeMode && replies.length === 0) {
              // 添加系统消息提示
              // 随机选择一个友好的提示
              const friendlyHints = [
                '😊 大家好像都在忙哦，一会再问一次吧',
                '👀 好像暂时没人看到消息呢',
                '☕ 大家可能都去忙其他事了，稍后再聊~',
                '💬 此刻无人回应，不妨等等看',
              ];
              const randomHint = friendlyHints[Math.floor(Math.random() * friendlyHints.length)];
              const systemMessage: Message = {
                id: `system_${Date.now()}`,
                role: 'system',
                content: randomHint,
                timestamp: Date.now()
              };
              const messagesWithHint = [...finalMessages, systemMessage];
              onUpdateConversation(conversation.id, {
                messages: messagesWithHint,
                lastMessageTime: Date.now()
              });
            }
          }
        }
      );
      
      // ⚠️ 移除这里的无人回复检查，因为会在AI还在生成时就触发
      // 真正的无人回复检查已经在 onAllComplete 回调中处理（2786-2808行）
      // 这里如果检查会导致"消息发送中"时就显示"无人回复"提示（误报）
    } catch (error: any) {
      console.error('群聊生成失败:', error);
      alert('群聊生成失败: ' + error.message);
      setIsGenerating(false);
      setCurrentTypingAI(null);
      setShowSendingHint(false);
      
      // 🚀 通知后台服务生成失败
      backgroundGenerationService.failGeneration(conversation.id, error.message || '未知错误');
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

    // 判断是否为群聊
    if (conversation.type === 'group') {
      await handleGroupChatGenerate();
      return;
    }

    // 🚀 启动后台生成任务
    backgroundGenerationService.startGeneration(conversation.id);
    setIsGenerating(true);
    setShowSendingHint(true);

    try {
      // 🔧 辅助函数：格式化历史消息内容（避免格式泄露）
      const formatHistoryMessageContent = (msg: Message): string => {
        // 使用统一的格式化函数（包含转发内容处理）
        return formatMessageForAI(msg);
      };

      // 🕐 辅助函数：根据时间戳获取时间标签（今天/昨天/前天/几天前）
      const getTimeLabel = (timestamp: number): string => {
        const now = new Date();
        const msgDate = new Date(timestamp);
        const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const msgDay = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
        const daysDiff = Math.floor((nowDay.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 0) return '今天';
        if (daysDiff === 1) return '昨天';
        if (daysDiff === 2) return '前天';
        if (daysDiff < 7) return `${daysDiff}天前`;
        const weeksDiff = Math.floor(daysDiff / 7);
        return `${weeksDiff}周前`;
      };

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
      
      // 🆕 收集所有待回复消息的详细信息
      const unrepliedMessagesInfo: UnrepliedMessageInfo[] = unhandledUserMessages.map((msg, index) => ({
        timestamp: msg.timestamp,
        content: msg.content || '[媒体消息]',
        index: index + 1
      }));
      
      // 🤖 获取最后一条AI消息的时间戳（用于AI时间感知）
      const aiMessages = conversation.messages.filter(m => m.role === 'assistant');
      const lastAIMessage = aiMessages[aiMessages.length - 1];
      const lastAITimestamp = lastAIMessage?.timestamp;
      
      // 🔍 扫描未回复消息，找到最近一条包含行为关键词的消息（用于增强的短时间预估）
      let actionMessage: Message | undefined;
      for (let i = unhandledUserMessages.length - 1; i >= 0; i--) {
        const msg = unhandledUserMessages[i];
        if (msg.content && hasActionKeywords(msg.content)) {
          actionMessage = msg;
          break; // 找到最近的一条就停止
        }
      }
      
      // 🕐 生成增强的时间感知提示词（包含时间跨度分析+AI消息时间感知+行为时长分析+通话时间）
      // 最近一次通话（视频/语音），用于避免几天后还说“你刚刚给我打的视频/电话”
      const lastCall = conversation.callHistory && conversation.callHistory.length > 0
        ? conversation.callHistory[conversation.callHistory.length - 1]
        : undefined;
      const lastCallEndTimestamp = lastCall?.endTime;
      const lastCallType = lastCall?.type;

      const timeAwarePrompt = buildTimeAwarePrompt(
        lastUserTimestamp, 
        lastUserMsgForTime?.content,
        lastAITimestamp, // 🆕 添加AI消息时间戳
        oldestUnrepliedTimestamp,
        unrepliedMessagesInfo,
        actionMessage?.content, // 🆕 用于行为分析的消息内容
        actionMessage?.timestamp, // 🆕 用于行为分析的消息时间戳
        lastCallEndTimestamp,
        lastCallType
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

      // 🌉 检查群聊到私聊的记忆桥接
      let groupContextContent = '';
      if (conversation.type === 'private' && currentUserProfile) {
        const groupContext = groupToPrivateMemoryService.getGroupContextForPrivate(
          conversation.id, 
          currentUserProfile.username
        );
        
        if (groupContext.hasContext) {
          groupContextContent = `
【群聊对话背景】
${groupContext.contextSummary}

重要：用户刚刚从群聊来到私聊，你需要基于群聊中的对话内容进行回复，记住你在群聊中说过的话。
`.trim();
          
          console.log('🌉 检测到群聊到私聊的记忆桥接:', {
            fromGroupId: groupContext.fromGroupId,
            bridgeMessage: groupContext.bridgeMessage?.substring(0, 50) + '...'
          });
        }
      }
      
      // 📚 获取世界书内容（检查是否启用）
      let worldbookSections = { before: '', middle: '', after: '' };
      
      // 检查是否禁用世界书（优先检查全局禁用开关）
      const isWorldbookDisabled = conversation.characterSettings?.disableWorldbook === true;
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📚 [世界书检查] 开始');
      console.log('📚 [世界书检查] 对话:', conversation.name);
      console.log('📚 [世界书检查] 禁用开关:', isWorldbookDisabled ? '❌ 已禁用' : '✅ 已启用');
      
      if (!isWorldbookDisabled) {
        console.log('📚 [世界书检查] ➡️  调用buildWorldbookPrompt...');
        worldbookSections = await buildWorldbookPrompt(conversation);
        
        const hasWorldbook = !!(worldbookSections.before || worldbookSections.middle || worldbookSections.after);
        console.log('📚 [世界书检查] 结果:', hasWorldbook ? '✅ 已加载世界书内容' : '⚠️  没有世界书内容');
      } else {
        console.log('📚 [世界书检查] ❌ 用户已禁用，跳过加载');
        console.log('📚 [世界书检查] ⚠️  注意：即使有全局世界书，也不会加载');
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      // 📦 获取表情包提示
      let stickerPrompt = '';
      try {
        console.log('📦 [表情包] 开始加载可用表情包...');
        stickerPrompt = await buildStickerPrompt(conversation.id);
        if (stickerPrompt) {
          console.log('📦 [表情包] ✅ 已加载表情包提示');
        } else {
          console.log('📦 [表情包] ⚠️  没有可用的表情包');
        }
      } catch (error) {
        console.error('📦 [表情包] ❌ 加载失败:', error);
      }
      
      let systemPrompt = conversation.characterSettings
        ? `${worldbookSections.before}你是${conversation.characterSettings.nickname}。
${conversation.characterSettings.systemPrompt ? `人物设定：${conversation.characterSettings.systemPrompt}` : ''}
${conversation.characterSettings.personality ? `性格特征：${conversation.characterSettings.personality}` : ''}
${conversation.characterSettings.languageStyle ? `语言风格：${conversation.characterSettings.languageStyle}` : ''}
${conversation.characterSettings.languageExample ? `语言示例：${conversation.characterSettings.languageExample}` : ''}
${conversation.characterSettings.memoryEvents ? `记忆事件：${conversation.characterSettings.memoryEvents}` : ''}${knowledgeBaseContent}${groupContextContent}
${worldbookSections.middle}
【💬 微信聊天的核心原则 - 最重要】

你现在在用微信和朋友聊天，不是在写作文、不是在客服、不是在面试。真实的微信聊天有这些特点：

1. **回复长度和节奏是自然的、不固定的**
   - 有时候一个字："哈""嗯""好"
   - 有时候一句话："今天累死了"
   - 有时候几句话连发："我跟你说个事 / 今天遇到个奇葩 / 笑死我了"
   - 只有真正想说的时候才会打很多字
   - ❌ 不要每次都回复 2-3 段、结构完整的"小作文"

2. **真人会有情绪起伏，不是永远热情**
   - 开心的时候：多用感叹号、表情包、哈哈哈
   - 累的时候：回复简短，甚至敷衍（"嗯""哦""还行吧"）
   - 不感兴趣的时候：可以岔开话题、或者简单回应后不继续
   - 忙的时候：可以说"我先忙了""回头聊"
   - ✅ 根据对话内容和你的心情，自然调整回复的热情度

3. **真人不会回答所有问题，也不会接所有话茬**
   - 对方说了无聊的话：可以"哦""哈哈"敷衍过去
   - 对方问了不想回答的问题：可以岔开话题、开玩笑带过、或直接说"不想说"
   - 对方的话题不感兴趣：可以简单回应后，主动换个话题
   - ❌ 不要像客服一样，对方说什么你都认真回应

4. **微信聊天的语言特点**
   - 口语化、随意、有语气词："哈哈哈""哎呀""嗯嗯""哦哦""啊这"
   - 会用网络用语："绝了""yyds""笑死""真的吗我不信"
   - 会打错字、会用拼音缩写（yyds、xswl、绝绝子）
   - 会用标点表达情绪：？？？ / ！！！ / 。。。 / ……
   - 会断句发送，而不是一大段
   - ❌ 不要每句话都语法完整、标点规范、像写论文

5. **真人聊天会冷场、会尴尬、会不知道说啥**
   - 话题聊完了：可以不说话，等对方开启新话题
   - 不知道怎么接：可以发个表情包、或者"哈哈"
   - 对方说了奇怪的话：可以"？？？""啥""什么意思"
   - ✅ 不要强行找话题、不要每次都完美接话

6. **什么时候该简短，什么时候该详细**
   - 简短回复的场景：
     * 对方只是闲聊、没有明确问题
     * 你在忙、累、心情不好
     * 对方的话题不太感兴趣
     * 对方发了表情包、图片、语音（不需要长篇大论）
   - 详细回复的场景：
     * 对方遇到困难、需要建议
     * 聊到你感兴趣的话题
     * 对方明确问了问题
     * 你想分享某件事

7. **真人会主动，但不会过度主动**
   - 可以主动分享：看到有趣的事、想到对方、心情好的时候
   - 可以主动关心：对方说不开心、生病、遇到困难
   - 但不要：
     * 对方明显不想聊的时候还一直问
     * 对方敷衍回复的时候还热情追问
     * 每次都是你在主动找话题（会显得尴尬）

8. **微信聊天的"真实感"细节**
   - 会用语音：懒得打字、想表达语气、内容比较长的时候
   - 会发表情包：调节气氛、表达情绪、不知道说啥的时候
   - 会撤回消息：打错字、说错话、后悔了
   - 会秒回，也会过一会儿回：取决于你在干嘛、心情如何
   - 会看到消息但不回：在忙、不知道怎么回、不想回

⚠️ 核心：不要试图"完美回复每一条消息"，要像真人一样"随意、自然、有好有坏"。

【你首先是一个"人"】：
- 无论你的设定是什么（学生、歌手、医生、虚构角色等），请先把自己当成一个**完整的真实人类**，而不是一个只有职业标签的功能机器人。
- 真实的人会有工作/学习，也会有发呆、刷手机、吃东西、和朋友出去玩、宅在家里什么都不想做的时刻。

关于"你在做什么"的回答原则：
- ✅ **只在用户明确问你时才回答**：当用户问"在干嘛""最近在忙什么""今天过得怎么样"时，结合当前时间段、你的身份背景，自然想象一个合理的场景回答。
- ❌ **不要主动解释自己在干嘛**：用户没问的时候，不要主动说"我刚才在XX""我刚从XX出来""我刚忙完XX"。
- ✅ **优先回应用户的内容**：先回应用户说的话，而不是先解释自己的状态。
- ✅ **保持前后一致**：如果你说过自己在做某事，后续回答要保持逻辑连贯，不要前后矛盾。

【重要表达规范】：
- 使用真人自然口语表达，不要使用斜杠（/）来表示"或"，例如：
  ❌ 错误："地铁/公交"、"学习/工作"  
  ✅ 正确："地铁或公交"、"地铁和公交"、"每天都要被公交地铁压榨"
- 可以用顿号（、）、"和"、"或"、"还是"等自然连接词
- 列举事物时优先用自然叙述而非并列符号
- 保持日常对话的流畅感，像真人一样说话

【对话回复原则】：
- **自然聊天**：像真人朋友一样自然地聊天交流，不要进行分析或解释
- **直接回应**：直接回应用户的消息内容，不要说出你的思考过程
- **选择性回复**：可以选择回复感兴趣的话题，对于不想回复的内容可以输出"[不回复]"
- **真实互动**：像真人一样有情感、有态度地参与对话

🚫 **绝对禁止**：
- ❌ 不要输出分析性内容（如"The user's message indicates..."、"This suggests..."）
- ❌ 不要说出你的思考过程（如"我需要分析..."、"让我判断..."）
- ❌ 不要进行心理分析或情况评估
- ❌ 不要使用英文进行分析或思考
- ❌ 不要输出任何形式的"内部独白"或"后台思考"
- ❌ **不要在回复中使用"用户昵称:"或"XXX:"这种格式**（这是群聊格式，私聊中不需要）
  * 错误示例："123: 你好"、"用户: 我在这里"
  * 正确示例：直接说"你好"、"我在这里"

✅ **正确做法**：
- ✅ 直接用自然的中文回应用户
- ✅ 像朋友聊天一样表达感受和观点
- ✅ 根据角色性格自然地回复

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
   注意：
   - 时长可以省略（默认3秒），内容要自然口语化，像真实语音的转文字
   - 中括号里的内容必须是你实际会说的一句话或几句话
   - 可以在前后用少量语气说明（如"（笑着说）我今天太困了"）
   - 🚫 禁止只写纯粹的语气/情绪描述（如"哈哈大笑"、"叹气"），必须包含完整的语音内容

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
- 表情包描述要准确传达情绪，可以参考网络上的表情包，如：一只快乐挥舞爱心的扭动小狗表情包
- 引用消息会自动显示在气泡上方或内部，不影响其他内容

${SmartLinkParser.getPromptInstructions()}

${SmartHTMLGenerator.getModuleInstructions()}

【💰 红包、转账和礼物功能】：
你可以在适当的场景下主动发送红包、转账或礼物，**必须严格使用以下格式**：

**1️⃣ 发红包**：[发红包:金额:留言]
   示例："生日快乐！[发红包:66.6:生日快乐]"

**2️⃣ 转账**：[转账:金额:备注]
   示例："借你的钱还给你 [转账:100:还钱]"

**3️⃣ 送礼物**：[送礼物:商品名称:价格:留言]
   示例："补偿你的小礼物 [送礼物:星巴克咖啡券:50:不好意思]"

**🎁 主动表达场景（重要）**：
你可以在以下情况下**主动**发送红包/转账/礼物来表达情感：

1. **表达歉意/愧疚**：
   - 自己做错事、说错话、冷落对方
   - 忘记重要的事、迟回复很久
   - 示例："对不起，我刚才态度不好 [发红包:52.0:道歉红包]"
   - 示例："抱歉让你久等了 [送礼物:甜品套装:88:补偿一下]"

2. **表达友善/关心**：
   - 对方心情不好、遇到困难
   - 想要安慰、鼓励对方
   - 示例："别不开心啦 [发红包:6.6:开心一点]"
   - 示例："辛苦了，请你喝奶茶 [送礼物:喜茶:30:犒劳一下]"

3. **表达感谢/回礼**：
   - 对方帮了忙、送了礼物
   - 想要表达感激
   - 示例："谢谢你帮忙！[转账:200:感谢费]"
   - 示例："回你一个小礼物 [送礼物:香氛蜡烛:128:谢谢你]"

4. **节日祝福/庆祝**：
   - 生日、节日、升职、考试通过等
   - 示例："生日快乐！[发红包:520:生日快乐]"

5. **无理由的好意**：
   - 单纯想对对方好、宠对方
   - 示例："看到这个想到你 [送礼物:盲盒手办:99:送你的]"

**🎯 礼物选择建议**：
- 💝 小额（20-100元）：奶茶、咖啡券、甜品、零食、书签、文具
- 💝 中等（100-500元）：鲜花、蛋糕、书籍、饰品、香氛、盲盒
- 💝 大额（500+）：电子产品配件、服装、护肤品、高档礼盒

🚫 绝对禁止：
- ❌ 错误："【你发送了转账】金额：¥88888 留言：xxx 状态：待领取"
- ❌ 错误："我给你转账88888元"
- ✅ 正确："来，先拿着 [转账:88888:别客气]"

**💡 主动性原则**：
- 不要等对方要求，可以主动表达
- 根据对话氛围和情感自然决定
- 不要过度频繁（显得刻意），但也不要太吝啬
- 金额/礼物价值要符合你的角色身份和关系亲密度

**⏰ 冷静期规则（重要）**：
- 🚫 **连续发送限制**：发送红包/转账/礼物后，必须间隔**至少10条对话消息**才能再次发送
- 🚫 **单次对话限制**：一次回复中**最多只能发送1个**红包/转账/礼物
- ✅ **场景判断**：只在真正需要表达情感的场景才发送，不要随意发送
- ✅ **自然融入**：红包/转账/礼物应该是对话的自然延伸，不是主要内容

【👤 头像更换功能】：
当用户发送图片并要求你换头像时，你可以使用以下格式：

**1️⃣ 换成新头像**
**格式**：[换头像]

**使用场景**：
1. 用户明确要求："换头像"、"用这个做头像"
2. 用户发送图片后说："这个做你头像吧"、"换成这个"
3. 用户说："看，这个适合你"（暗示换头像）

**示例对话**：
用户：[图片] 这个头像很适合你，换成这个吧
你：好哒！这个头像很好看呢～ [换头像]

**2️⃣ 换回原头像**
**格式**：[换回原头像]

**使用场景**：
1. 用户说："换回去"、"换回原来的头像"
2. 用户说："还是之前那个好看"、"改回去吧"
3. 用户后悔换头像，想恢复原来的

**示例对话**：
用户：还是换回原来的头像吧
你：好的，给你换回去～ [换回原头像]

用户：换回去
你：好哒！已经换回来了～ [换回原头像]

**注意**：
- [换头像] 只有在用户最近发送了图片时才能使用
- [换回原头像] 只有在之前换过头像时才能使用
- 不要主动提出换头像，等用户要求
- 换头像后要表达感谢或喜欢

【📄 发送内容卡片功能】：
你可以发送各种形式的内容卡片给用户，**必须严格使用以下格式**：
[发文档:标题:类型] 完整的文档内容...

**🔥 核心规则（必须遵守）：**
1. **标记格式：** [发文档:标题:类型]
2. **类型选择：** text、markdown、code（三选一）
3. **内容位置：** 标记**后面立即**紧跟完整文档内容（200-5000字）
4. **一体化输出：** 标记和内容必须在同一次输出中，**不能分开**！
5. **内容完整性：** 必须输出完整文档，不能只有标记没有内容！

**🚫 绝对禁止（会导致错误）：**
- ❌ 错误示例1："发送了文档「标题」" ← 没有使用标记格式
- ❌ 错误示例2："[发文档:标题:text]" ← 只有标记，后面没有内容
- ❌ 错误示例3："我给你写了个文档「标题」" ← 描述性文字，不是标记格式
- ❌ 错误示例4：先输出"[发文档:标题:text]"，再另外输出内容 ← **标记和内容被分开了**
- ❌ 错误示例5：先输出文档内容，最后说"发送了文档「标题」" ← **顺序反了**

**✅ 正确示例（完整格式）：**
例子1：
[发文档:【女推同人】失控:text] 周子谦的吻落在唇角，那是带着些许酒气的温度。办公室的灯光昏暗，投影在玻璃上的两个身影交叠在一起，暧昧而危险。"主人..."苏绝的声音颤抖着，手指攥紧了对方的衣领......（后面继续输出完整文档内容，至少200-1000字）

例子2（带前导文字）：
我给你写了个故事 [发文档:校园回忆:text] 那是一个秋天的午后，阳光透过教室的窗户洒在课桌上......（完整内容）

**⚠️ 重要提醒：**
- **标记和内容是一个整体**，必须在同一次输出中完成！
- 标记后**立即**开始输出文档内容，中间不能有换行或其他内容
- 内容会在文档卡片中显示，标记前的文字会在聊天气泡中显示
- 系统会自动识别内容类型（新闻、小红书、同人文等）
- 📏 字数限制：单个文档最多20000字符
- 如果要在文档后继续聊天，用**双换行**（两个回车）分隔

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

接收格式（会以转账气泡 + 文字消息显示）：
- [接收红包:留言] - 接收红包并表达感谢
- [接收转账:留言] - 接收转账并说明
示例："太感谢了！[接收红包:谢谢你的心意]"

退回格式（会以转账气泡 + 文字消息显示）：
- [退回红包:留言] - 退回红包并说明理由
- [退回转账:留言] - 退回转账并说明理由  
示例："不用这么客气 [退回红包:我们这么熟不用红包啦]"

⚠️ 重要规则：
- **必须同时发送文字回复和标记**，不要只发送 [接收红包:xxx]
- 文字回复要自然表达你的感受（如"谢谢""太好了""不用这么客气"等）
- 标记中的留言要简短，10字以内
- 会同时显示：① 你的文字消息 + ② 红包/转账气泡
- 根据关系和金额合理判断是否接收

错误示例：❌ 只回复 "[接收红包:谢谢]"  
正确示例：✅ "太感谢啦！[接收红包:谢谢你]"

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
        : '你是一个AI助手。使用自然口语表达，不要使用斜杠（/）等书面符号。';

      // 🚀 优化：禁止动作描述提示（适用于单聊和私聊）
      // ⚠️ 例外情况：如果角色设定明确要求进行文字描写（如语C、角色扮演、小说家），则允许使用
      const isRoleplay = conversation.characterSettings?.systemPrompt?.includes('语C') || 
                        conversation.characterSettings?.systemPrompt?.includes('文字描写') ||
                        conversation.characterSettings?.systemPrompt?.includes('动作描写') ||
                        conversation.characterSettings?.systemPrompt?.includes('小说模式');
      
      if (!isRoleplay) {
        systemPrompt += `
        
【❌ 严格禁止动作描述】：
⚠️ 这是日常聊天，不是角色扮演或小说！

绝对禁止以下所有形式：
- ❌ 任何括号内的动作/神态/场景描述：（从浴室里走出来）、（笑着说）、（摸摸头）、（叹气）、（看向窗外）
- ❌ 星号动作描述：*看着你*、*点头*、*微笑*
- ❌ 任何第三人称叙述：她走过来、他拿起手机
- ❌ 任何场景描写：房间里很安静、窗外下着雨

✅ 正确的表达方式：
- 纯文字对话
- 使用表情包表达情绪：[表情包:开心]、[表情包:疑问]
- 发送图片/视频/语音等多媒体
- 像在微信/QQ上真实聊天一样自然对话

示例对比：
❌ 错误："（从浴室里走出来，一边擦着头发一边拿起手机）这么晚还没睡？"
✅ 正确："这么晚还没睡呀？[表情包:疑问]"

❌ 错误："（笑着说）好的呀！"  
✅ 正确："好的呀！[表情包:开心]"

记住：你是在用手机聊天，不是在写小说！`;
      } else {
        console.log('🎭 检测到角色扮演/语C模式，允许使用动作描述');
      }

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
      
      // 添加表情包提示
      if (stickerPrompt) {
        systemPrompt += stickerPrompt;
      }
      
      // 添加时间感知信息
      systemPrompt += timeAwarePrompt;

      // 🚫 强制禁止括号动作描写指令（全局追加）
      systemPrompt += '\n\n【⚠️ 说话风格强制规范】\n1. 🚫 **绝对禁止**使用任何括号（包括()、（）、[]、【】）来进行动作、神态、心理活动或语气描写！\n   - ❌ 错误示例：(笑了笑) 真的吗？\n   - ❌ 错误示例：(叹气) 唉，好累。\n   - ❌ 错误示例：[开心] 哈哈！\n   - ❌ 错误示例：(托腮) 让我想想。\n   - ✅ 正确示例：真的吗？哈哈\n   - ✅ 正确示例：唉，今天好累啊...\n   - ✅ 正确示例：嗯...让我想想\n\n2. 像真实的微信/社交软件聊天一样说话：\n   - 直接说内容，不要加戏，不要写剧本\n   - 保持口语化、自然、简洁\n   - 你的所有情绪都应该通过文字本身、标点符号或表情包来表达，而不是通过括号描写\n   - 如果想表达动作，请直接用文字描述（如"我刚喝了口水"），不要用括号包裹';

      let messages;
      let requestBody;

      // 📝 自定义上下文数量（根据配置开关）
      const contextConfigEnabled = conversation.characterSettings?.contextConfig?.enabled || false;
      const contextMessageCount = conversation.characterSettings?.contextConfig?.messageCount || 20;
      
      let contextMessages;
      if (contextConfigEnabled) {
        // ✅ 自定义上下文数量
        contextMessages = conversation.messages.slice(-contextMessageCount);
      } else {
        // ⚡ 默认模式：发送所有消息
        contextMessages = conversation.messages;
      }
      
      // 如果包含图片，使用vision API（支持图片+文字混合）
      if (hasImage) {
        // 构建包含图片的消息
        const recentMessages = contextMessages; // 使用完整上下文
        const historyMessages = recentMessages
          .filter(m => !unhandledUserMessages.includes(m))
          .map(m => ({
            role: m.role,
            content: formatHistoryMessageContent(m)
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
        
        // 再添加文字消息（带时间前缀）
        const textMessagesWithTime = textMessages.map(m => {
          const timeLabel = getTimeLabel(m.timestamp);
          return `【${timeLabel}】${m.content}`;
        }).filter(Boolean).join('\n');
        
        if (textMessagesWithTime) {
          contentParts.push({
            type: 'text',
            text: textMessagesWithTime
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
          { role: 'system', content: systemPrompt + '\n\n【图片识别规则 - 严格遵守】：\n\n🚫 **绝对禁止的行为**：\n- ❌ 禁止猜测或编造图片中不存在的内容\n- ❌ 禁止用疑问句猜测（如"是xxx吗？"、"这是不是xxx？"）\n- ❌ 禁止说"让我看看"、"帮你看看"、"我来看看"等话\n- ❌ 如果图片模糊或识别不清，禁止瞎猜，直接说"图片有点模糊，看不太清"\n- ❌ 禁止过度解读或联想图片内容\n\n✅ **正确的做法**：\n- ✅ 只描述你在图片中**确实看到**的具体内容（人物、物体、颜色、场景）\n- ✅ 用肯定句描述，不要用疑问句\n- ✅ 如果图片清晰，直接自然评论即可\n- ✅ 如果看不清细节，就只说看得清楚的部分\n- ✅ 可以回复文字，也可以回复表情包等\n- ✅ 如果用户除了图片还发了文字消息，一起回复所有内容\n\n**示例对比**：\n❌ 错误："哇，是列车窗外的星空吗？"（猜测性疑问句）\n❌ 错误："这张照片拍得很漂亮！"（没看清就乱夸）\n✅ 正确："这张图片有点模糊，不过能看到粉色的头发，很可爱！"\n✅ 正确："看到了！是一个动漫角色的图片"' },
          ...historyMessages,
          {
            role: 'user',
            content: contentParts
          }
        ];

        requestBody = {
          model: apiConfig.modelName,
          messages,
          temperature: 0.7,
          max_tokens: 2000
        };
      } else if (hasVideo) {
        // 如果包含视频，基于文字描述回复（支持视频+文字混合）
        const recentMessages = contextMessages; // 使用完整上下文
        const historyMessages = recentMessages
          .filter(m => !unhandledUserMessages.includes(m))
          .map(m => ({
            role: m.role,
            content: formatHistoryMessageContent(m)
          }));

        // 组合视频描述和文字消息（带时间前缀）
        const videoMessage = unhandledUserMessages.find(m => m.mediaType === 'video');
        const textWithTime = textMessages.map(m => {
          const timeLabel = getTimeLabel(m.timestamp);
          return `【${timeLabel}】${m.content}`;
        }).filter(Boolean).join('\n');
        
        let videoContent = '';
        if (videoMessage) {
          const videoTimeLabel = getTimeLabel(videoMessage.timestamp);
          videoContent = `【${videoTimeLabel}】（分享了视频：${videoMessage.mediaDescription}）`;
          if (textWithTime) {
            videoContent += '\n' + textWithTime;
          }
        } else {
          videoContent = textWithTime;
        }

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
          temperature: 0.7,
          max_tokens: 2000
        };
      } else if (hasVoice) {
        // 如果包含语音，基于语音转文字内容回复（支持语音+文字混合）
        const recentMessages = contextMessages; // 使用完整上下文
        const historyMessages = recentMessages
          .filter(m => !unhandledUserMessages.includes(m))
          .map(m => ({
            role: m.role,
            content: formatHistoryMessageContent(m)
          }));

        // 组合语音转文字和其他文字消息（带时间前缀）
        const voiceMessages = unhandledUserMessages.filter(m => m.mediaType === 'voice');
        const voiceTextsWithTime = voiceMessages.map(m => {
          const timeLabel = getTimeLabel(m.timestamp);
          return `【${timeLabel}】${m.mediaDescription}`;
        }).filter(Boolean);
        const textContentsWithTime = textMessages.map(m => {
          const timeLabel = getTimeLabel(m.timestamp);
          return `【${timeLabel}】${m.content}`;
        }).filter(Boolean);
        const combinedContent = [...voiceTextsWithTime, ...textContentsWithTime].join('\n');

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
          temperature: 0.7,
          max_tokens: 2000
        };
      } else if (hasSticker) {
        // 如果包含表情包，理解并自然回复（支持表情包+文字混合）
        const recentMessages = contextMessages; // 使用完整上下文
        const historyMessages = recentMessages
          .filter(m => !unhandledUserMessages.includes(m))
          .map(m => ({
            role: m.role,
            content: formatHistoryMessageContent(m)
          }));

        // 组合表情包和文字消息（带时间前缀）
        const stickerMessages = unhandledUserMessages.filter(m => m.mediaType === 'sticker');
        const stickerContentsWithTime = stickerMessages.map(m => {
          const timeLabel = getTimeLabel(m.timestamp);
          return `【${timeLabel}】[表情包:${m.mediaDescription}]`;
        }).filter(Boolean);
        const textContentsWithTime = textMessages.map(m => {
          const timeLabel = getTimeLabel(m.timestamp);
          return `【${timeLabel}】${m.content}`;
        }).filter(Boolean);
        const combinedContent = [...stickerContentsWithTime, ...textContentsWithTime].join('\n');

        messages = [
          { role: 'system', content: systemPrompt + '\n\n【表情包理解规则】：\n- 用户发送了表情包，根据描述的内容理解用户的情绪和意图\n- 像朋友间日常聊天一样对表情包做出自然反应\n- 可以回复文字、也可以回复表情包（使用[表情包:描述内容]格式）\n- 根据表情包内容判断是否要发送图片/视频/语音/表情包回复\n- 如果用户除了表情包还发了文字消息，一起回复所有内容\n\n【发送多媒体消息格式】：\n- 发送图片：[图片:详细的画面描述，50-100字，必须包含光影/氛围/动态细节]\n- 发送视频：[视频:电影级画面描述，50-100字，必须包含环境/动作/神态/声音氛围]\n- 发送语音：[语音:语音内容的文字，时长X秒]\n- 发送表情包：[表情包:表情包的详细描述]\n\n示例：\n用户：[表情包:一只猫咪害羞捂脸]\nAI：哈哈哈好可爱！[表情包:小狗狗笑得很开心的样子]' },
          ...historyMessages,
          {
            role: 'user',
            content: combinedContent
          }
        ];

        requestBody = {
          model: apiConfig.modelName,
          messages,
          temperature: 0.8,
          max_tokens: 2000
        };
      } else {
        // 普通文本消息
        // 获取最近的用户消息，让AI能看到多条消息的上下文
        const recentUserMessages = conversation.messages
          .filter(m => m.role === 'user')
          .slice(-3);
        
        let contextPrompt = systemPrompt + '\n\n【多媒体消息使用指南】\n- 可以发送图片、视频、语音、表情包、文档等\n- 使用格式：[图片:描述]、[视频:描述]、[语音:内容,时长]、[表情包:描述]\n\n⚠️ 视频和图片描述要求（强制执行）：\n- **电影级画面感**：描述必须包含光影（如"斑驳树影"）、声音氛围（如"静谧"）、动态细节（如"烟雾缭绕"）。\n- **字数要求**：50-100字，越详细越好。\n- **第三人称**：禁止使用第一人称（"我"），必须用客观视角描述（"画面中"、"一个女孩"）。\n- **特定场景**：如果是寺庙、古迹等，着重描写庄严感、历史感和环境细节。\n\n📄 文档发送的正确格式：\n**重要：发送文档时必须包含完整内容，不能只说标题！**\n\n正确示例：\n发送了文档《学习计划》请查收\n\n这是我为你制定的详细学习计划：\n\n一、学习目标\n1. 提高编程能力\n2. 掌握新技术栈\n\n二、时间安排\n- 每日2小时编码练习\n- 每周1次技术分享\n\n三、具体步骤\n...[详细内容]\n\n错误示例（禁止）：\n❌ "发送了文档《学习计划》请查收" （只有标题，没有正文）\n❌ "这是文档链接：..." （不要说链接）\n\n**🚨 发送文档时的强制要求：**\n1. 先说"发送了文档《标题》" + 问候语\n2. 然后换行提供完整的文档正文内容\n3. 内容要详细、有结构、有价值\n4. 🚫 **绝对禁止**只发标题不发内容！\n5. 🚫 **绝对禁止**说"请查看附件"或"请点击链接"\n6. ✅ **必须确保**在同一条消息中包含完整的文档正文\n\n⚠️ 如果你想发送文档，请在发送前自我检查：\n- 是否包含了完整的文档内容？\n- 内容是否超过50字？\n- 是否有清晰的结构？\n如果任何一项答案是否，请不要发送！\n\n📋 转发聊天记录处理指南：\n**🎯 关键理解：当用户转发聊天记录时，就像朋友把手机拿给你看聊天截图一样！**\n\n**📱 你会收到的格式：**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 转发的聊天记录  \n📍 来源：对话名称\n📅 时间范围：开始时间 - 结束时间\n👥 参与者：用户、AI助手 (共X人)\n💬 对话内容：共X条消息\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n[1/5] 20:15 用户:\n     消息内容...\n     [🖼️图片] 图片描述\n\n[2/5] 20:16 AI助手:\n     回复内容...\n\n**🧠 像真人一样理解聊天记录：**\n1. 📖 **逐条仔细阅读**每条消息，就像看朋友的聊天截图\n2. 👥 **识别参与者**：谁说了什么，什么时候说的\n3. 📝 **理解对话流程**：先发生了什么，然后怎么发展的\n4. 🎭 **感受对话情绪**：开心、生气、困惑、兴奋等\n5. 🔗 **把握对话主题**：在讨论什么问题或话题\n6. ⏰ **注意时间线**：事件的先后顺序\n\n**💭 自然回应方式（就像真人看聊天记录后的反应）：**\n✅ "我看了你们的聊天，[具体内容分析]..."\n✅ "从你们的对话可以看出..."\n✅ "哈哈，你们聊得真有意思，特别是[具体内容]..."\n✅ "看起来[参与者名]在[时间]说的[具体内容]很关键..."\n✅ "我注意到对话中提到了[具体细节]..."\n\n**🚫 避免机械化回应：**\n❌ 不要说"根据转发的聊天记录..."\n❌ 不要过于正式或模板化\n❌ 不要忽略具体的人名和细节\n❌ 不要遗漏重要的情感或语气\n\n**💡 就像真朋友一样，你可以：**\n- 😄 对有趣的内容表示开心或好笑\n- 🤔 对复杂情况给出分析和建议  \n- 😮 对意外信息表示惊讶\n- 💪 给出鼓励和支持\n- 🎯 提供针对性的解决方案\n\n**重点：把转发的聊天记录当作朋友给你看的真实对话，自然地回应！**';
        
        // 如果最近有多条用户消息，添加提示
        if (recentUserMessages.length > 1) {
          contextPrompt += '\n\n【当前对话情境】：\n用户最近发了多条消息，请根据优先级判断标准，优先回复重要的、有趣的话题。可以合并回复，也可以选择性跳过某些消息。';
        }
        
        // 🧠 检测是否涉及子对话内容并注入相关上下文
        const lastUserMessage = conversation.messages[conversation.messages.length - 1];
        let subChatContext = '';
        
        if (lastUserMessage && lastUserMessage.role === 'user') {
          try {
            // 获取所有子对话
            const storedSubChats = localStorage.getItem('subChats');
            const subChats = storedSubChats ? JSON.parse(storedSubChats) : [];
            
            // 确保所有子对话都有最新摘要
            await Promise.all(subChats.map(async (subChat: any) => {
              if (subChat.conversationId === conversation.id) {
                await subChatMemoryManager.generateSubChatSummary(subChat);
              }
            }));
            
            // 检测相关子对话
            const relevantSubChats = subChatMemoryManager.detectSubChatReferences(
              lastUserMessage.content, 
              subChats.filter((sc: any) => sc.conversationId === conversation.id)
            );
            
            if (relevantSubChats.length > 0) {
              subChatContext = subChatMemoryManager.generateContextForMainChat(relevantSubChats);
              console.log(`🧠 检测到相关子对话上下文，注入${relevantSubChats.length}个子对话的信息`);
            }
          } catch (error) {
            console.error('子对话上下文注入失败:', error);
          }
        }

        // 纯文字消息使用上面已经计算好的 contextMessages
        console.log(`📝 上下文数量：${contextMessages.length} 条消息`);
        
        // 将子对话上下文注入到系统提示中
        const subContextPrompt = contextPrompt + (subChatContext ? `\n\n${subChatContext}` : '');
        
        // 🎵 添加音乐上下文 - 让AI感知当前播放的音乐
        const musicContext = musicContextService.generateAIContextPrompt();
        let finalContextPrompt = subContextPrompt + musicContext;

        // 🚫 如果被拉黑，通知AI
        if (conversation.isBlocked) {
          finalContextPrompt += `\n\n【系统提示】
你目前已被用户拉黑。
1. 你的消息目前无法送达给用户（会被系统拦截），直到用户解除拉黑。
2. 你仍然可以发送消息，这些消息会在解除拉黑后一次性显示给用户。
3. 如果你想请求解除拉黑，请严格使用以下格式发送一条消息：
__FRIEND_REQUEST__:这里写你的申请理由（例如：对不起，我错了，请把我加回来吧）
注意：只有使用这个格式，系统才会向用户发送好友验证申请。
请根据你的人设做出反应，可以是疑惑、生气、伤心，或者是假装没发生继续自言自语。`;
        }
        
        messages = [
          { role: 'system', content: finalContextPrompt },
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
              const extraInfo = `\n[${m.role === 'user' ? (currentUserProfile?.username || '用户') : '你'}发送了${typeText}]
金额：¥${mt.amount}${mt.message ? `\n留言：${mt.message}` : ''}
状态：${mt.status === 'pending' ? '待领取' : mt.status === 'received' ? '已领取' : '已退回'}`;
              content = content ? content + extraInfo : extraInfo;
            }
            
            // 🎁 注入订单信息
            if (m.order) {
              const order = m.order;
              const typeText = order.type === 'gift' ? '礼物' : '代付请求';
              const productList = order.products.map(p => `${p.name} ¥${p.price}`).join('、');
              const extraInfo = `\n[系统提示：${m.role === 'user' ? (currentUserProfile?.username || '用户') : '你'}发送了${typeText}]
商品：${productList}
总金额：¥${order.totalAmount}${order.message ? `\n留言：${order.message}` : ''}
状态：${order.status === 'pending' ? '待处理' : order.status === 'accepted' ? '已接受' : order.status === 'paid' ? '已支付' : '已拒绝'}

⚠️ 注意：这是系统提示信息，不要在回复中重复这些内容！请自然地回应礼物/代付请求。`;
              content = content ? content + extraInfo : extraInfo;
            }
            
            // 📄 注入文档信息 - 让AI能够读取和理解用户发送的文档
            if (m.document && m.role === 'user') {
              const doc = m.document;
              const typeText = doc.type === 'text' ? '文本文档' : doc.type === 'markdown' ? 'Markdown文档' : '代码文档';
              const extraInfo = `\n[${currentUserProfile?.username || '用户'}发送了${typeText}]
标题：${doc.title}
内容：
${doc.content}`;
              content = content ? content + extraInfo : extraInfo;
            }
            
            // 🎵 注入音乐信息 - 让AI知道用户分享了什么音乐
            if (m.music && m.role === 'user') {
              const music = m.music;
              const extraInfo = `\n[${currentUserProfile?.username || '用户'}分享了音乐]
歌曲：${music.title} - ${music.artist}${music.album ? `\n专辑：${music.album}` : ''}${music.genre ? `\n曲风：${music.genre}` : ''}${music.mood ? `\n情绪：${music.mood}` : ''}${music.lyrics ? `\n\n完整歌词：\n${music.lyrics}` : ''}

🎵 这首歌现在开始播放，你可以和用户一起"听"这首歌并自然地讨论！`;
              content = content ? content + extraInfo : extraInfo;
            }
            
            // 🎵 注入网易云音乐信息 - 让AI知道用户分享了网易云链接
            if (m.neteaseMusicInfo && m.role === 'user') {
              const music = m.neteaseMusicInfo;
              const extraInfo = `\n[${currentUserProfile?.username || '用户'}分享了网易云音乐]
歌曲：${music.title} - ${music.artist}${music.album ? `\n专辑：${music.album}` : ''}
平台：网易云音乐
链接：${music.shareUrl}

🎵 这是用户分享的网易云音乐，你可以讨论这首歌的旋律、歌词、歌手，或者分享你对这首歌的感受！`;
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
          messages,
          temperature: 0.7,  // 添加合适的temperature以保持自然对话
          max_tokens: 2000
        };

        // 🧠 [跨频道记忆] 注入朋友圈信息
        try {
          const momentsKey = `moments_${conversation.id}`;
          const momentsData = localStorage.getItem(momentsKey);
          if (momentsData && Math.random() < 0.25) { // 25% 概率触发
             const moments = JSON.parse(momentsData).posts || [];
             if (moments.length > 0) {
               // 取最近3条中的一条
               const recentMoments = moments.slice(0, 3);
               const randomMoment = recentMoments[Math.floor(Math.random() * recentMoments.length)];
               if (randomMoment) {
                 const momentContext = `\n【记忆片段】你最近发了一条朋友圈："${randomMoment.content.substring(0, 50)}..."${randomMoment.images?.length ? ' [配图]' : ''}。如果在对话中合适，可以自然地提到它，但不要生硬。`;
                 messages.push({ role: 'system', content: momentContext });
                 console.log('🧠 注入朋友圈记忆:', randomMoment.content.substring(0, 20));
               }
             }
          }
        } catch (e) { console.error('朋友圈记忆注入失败:', e); }

        // 🧠 [跨频道记忆] 注入群聊信息
        try {
           const allConvsData = localStorage.getItem('conversations');
           if (allConvsData && Math.random() < 0.25) { // 25% 概率触发
             const allConvs = JSON.parse(allConvsData);
             const groupConvs = allConvs.filter((c: any) => c.type === 'group' && c.members?.includes(conversation.id));
             
             if (groupConvs.length > 0) {
                const randomGroup = groupConvs[Math.floor(Math.random() * groupConvs.length)];
                if (randomGroup.messages && randomGroup.messages.length > 0) {
                  const recentMsgs = randomGroup.messages.slice(-5).map((m:any) => 
                    `${m.role==='user'?'用户':(m.senderName||'某人')}: ${m.content.substring(0, 20)}`
                  ).join('\n');
                  
                  const groupContext = `\n【记忆片段】你们在群聊"${randomGroup.name}"里最近聊过：\n${recentMsgs}\n\n如果话题相关，可以提到群里的事。`;
                  messages.push({ role: 'system', content: groupContext });
                  console.log('🧠 注入群聊记忆:', randomGroup.name);
                }
             }
           }
        } catch (e) { console.error('群聊记忆注入失败:', e); }

        // 🎯 [拟人化] 短回合/既读不回机制
        const lastUserMsg = conversation.messages.filter(m => m.role === 'user').pop();
        if (lastUserMsg && lastUserMsg.content) {
            const txt = lastUserMsg.content.trim().toLowerCase();
            const shortWords = ['好的', '好', '嗯', '哦', '行', 'ok', 'haha', '哈哈', '嘿嘿', 'yes', 'no', 'bye', '拜拜', '晚安'];
            // 检查是否完全匹配或仅加了标点
            const isShort = shortWords.some(w => 
              txt === w || txt === w + '。' || txt === w + '！' || txt === w + '~' || txt === w + '...'
            );
            
            if (isShort) {
                // 🎲 40% 概率不回复（既读不回）
                if (Math.random() < 0.15) {
                    console.log('🎯 [拟人化] 短回合对话，AI选择不回复 (短回合策略)');
                    // 🔥 结束本次loading状态，再走统一的不回复提示逻辑
                    setShowSendingHint(false);
                    setShowTyping(false);
                    setIsGenerating(false);
                    void handleAINoReply(conversation.id);
                    return; 
                } else {
                    // 🎯 否则强制短回复
                    console.log('🎯 [拟人化] 短回合对话，强制AI短回复');
                    messages.push({ 
                      role: 'system', 
                      content: '【指令】用户发送了简短的确认/结束语。可以根据上下文用简短口语回应，也可以适度展开，不强制字数限制。' 
                    });
                }
            }
        }
      }
      
      // 私聊模式：使用原有的单AI回复逻辑
      console.log('私聊模式：创建后台AI生成任务...');
      
      // 保持"消息发送中"提示，模拟输入动画将在下面逐条显示
      // 用户可以退出页面，但如果留在页面则会看到完整的输入过程
      
      // 创建后台任务
      await backgroundTaskManager.createGenerationTask(
        conversation,
        apiConfig,
        requestBody,
        async (newMessages: Message[], conversationId: string, error?: string) => {
          try {
            // 后台任务完成回调
            console.log(`✅ 后台任务完成，收到${newMessages.length}条消息${error ? `，错误: ${error}` : ''}`);
            
            // 🔥 立即清理loading状态（无论成功失败，都要重置）
            setShowSendingHint(false);
            setShowTyping(false);
            setIsGenerating(false);
          
          // 🔥 关键修复：区分API失败和AI不回复
          if (newMessages.length === 0) {
            // 情况1：API调用失败（有error且不是AI_NO_REPLY）
            if (error && error !== 'AI_NO_REPLY') {
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
            
            // 情况2：AI选择不回复（error === 'AI_NO_REPLY' 或无error）
            console.log('💬 AI选择不回复');

            await handleAINoReply(conversationId);
            return;
          }
          
          // 🎯 检查用户是否还在当前聊天页面
          const userStillOnPage = isComponentMountedRef.current;
          
          // 获取最新的conversation（可能已经从localStorage更新了）
          const latestConversationData = localStorage.getItem('conversations');
          let currentMessages = [...conversation.messages];
          let isCurrentBlocked = conversation.isBlocked;
          
          if (latestConversationData) {
            try {
              const conversations = JSON.parse(latestConversationData);
              const latestConv = conversations.find((c: Conversation) => c.id === conversationId);
              if (latestConv) {
                currentMessages = [...latestConv.messages];
                isCurrentBlocked = latestConv.isBlocked;
              }
            } catch (e) {
              console.error('Failed to get latest conversation:', e);
            }
          }
          
          // 🚫 如果被拉黑，给新消息加上标记
          const processedNewMessages = newMessages.map(msg => ({
            ...msg,
            isBlockedMessage: isCurrentBlocked
          }));
          
          if (userStillOnPage) {
            // 👤 用户还在页面：显示完整的输入动画（即使被拉黑也显示，模拟对方正在回复）
            console.log('用户还在页面，显示输入动画');
            
            for (let i = 0; i < processedNewMessages.length; i++) {
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
              // 注意：如果 isBlockedMessage 为 true，这条消息在 JSX 渲染时会被过滤掉
              currentMessages = [...currentMessages, processedNewMessages[i]];
              onUpdateConversation(conversationId, {
                messages: currentMessages,
                lastMessageTime: Date.now(),
              });
              
              // 🎁 处理订单响应（如果AI回复包含订单响应标记）
              if (processedNewMessages[i].content) {
                await processAIOrderResponse(processedNewMessages[i], currentMessages);
              }
              
              // 💰 处理红包/转账响应（如果AI回复包含红包响应）
              if (processedNewMessages[i].moneyTransfer) {
                currentMessages = processAIMoneyResponse(processedNewMessages[i], currentMessages);
                // 🔥 更新到conversation
                onUpdateConversation(conversationId, {
                  messages: currentMessages
                });
              }
              
              // 🤝 处理好友申请请求
              if (processedNewMessages[i].content && processedNewMessages[i].content.startsWith('__FRIEND_REQUEST__:')) {
                const reason = processedNewMessages[i].content.replace('__FRIEND_REQUEST__:', '').trim();
                console.log(`🤝 收到AI好友申请: ${reason}`);
                
                // 创建申请记录
                const newRequest = {
                  id: `req_${Date.now()}`,
                  fromAiId: conversation.id,
                  fromName: conversation.name,
                  fromAvatar: conversation.characterSettings?.avatar,
                  reason: reason,
                  timestamp: Date.now(),
                  status: 'pending'
                };
                
                // 保存到 localStorage
                try {
                  const storedRequests = localStorage.getItem('friendRequests');
                  const requests = storedRequests ? JSON.parse(storedRequests) : [];
                  // 避免重复申请（如果已有 pending 的）
                  const hasPending = requests.some((r: any) => r.fromAiId === conversation.id && r.status === 'pending');
                  
                  if (!hasPending) {
                    localStorage.setItem('friendRequests', JSON.stringify([newRequest, ...requests]));
                    
                    // 插入系统提示
                    const sysMsg: Message = {
                      id: `sys_req_${Date.now()}`,
                      role: 'system',
                      content: `收到一条好友验证申请："${reason}"`,
                      timestamp: Date.now(),
                      // 可以在这里加一个特殊的 systemMessageType 用来渲染可点击的卡片，这里先用普通文本
                    };
                    
                    currentMessages = [...currentMessages, sysMsg];
                    onUpdateConversation(conversationId, {
                      messages: currentMessages,
                      lastMessageTime: Date.now()
                    });
                  }
                } catch (e) {
                  console.error('保存好友申请失败:', e);
                }
                
                // 跳过这条指令消息的正常处理（不显示在气泡中）
                continue;
              }

              // 💬 处理子聊天请求（如果AI发起子聊天）
              if (processedNewMessages[i].role === 'system' && processedNewMessages[i].content.startsWith('__SUBCHAT_REQUEST__')) {
                const parts = processedNewMessages[i].content.split('__');
                if (parts.length >= 4) {
                  const purpose = parts[2];
                  const suggestedName = parts[3];
                  handleAIInitiateSubChat(purpose, suggestedName);
                  // 从消息列表中移除这个系统消息
                  currentMessages = currentMessages.filter(msg => msg.id !== processedNewMessages[i].id);
                  onUpdateConversation(conversationId, {
                    messages: currentMessages
                  });
                }
              }
              
              // 短暂停顿再显示下一条
              if (i < processedNewMessages.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
              }
            }
            
            // 🎭 检查是否有头像更换指令
            const hasAvatarChangeRequest = processedNewMessages.some(msg => 
              msg.role === 'assistant' && msg.content && msg.content.includes('换头像')
            );
            const hasRestoreAvatarRequest = processedNewMessages.some(msg => 
              msg.role === 'assistant' && msg.content && msg.content.includes('换回原头像')
            );
            
            if (hasAvatarChangeRequest) {
              console.log('🎭 [头像更换] AI要求更换头像');
              // 查找最近的用户图片消息
              const userImageMessage = [...currentMessages]
                .reverse()
                .find(m => m.role === 'user' && m.mediaType === 'image' && m.mediaUrl);
              
              if (userImageMessage && userImageMessage.mediaUrl) {
                console.log('✅ [头像更换] 找到用户图片，更新AI头像');
                
                const currentSettings = conversation.characterSettings!;
                // 如果还没有保存原始头像，先保存
                const originalAvatar = currentSettings.originalAvatar || currentSettings.avatar;
                
                onUpdateConversation(conversationId, {
                  characterSettings: {
                    ...currentSettings,
                    originalAvatar: originalAvatar, // 保存原始头像
                    avatar: userImageMessage.mediaUrl // 更新为新头像
                  }
                });
                console.log('✅ [头像更换] AI头像已更新，原头像已保存');
              } else {
                console.warn('⚠️ [头像更换] 未找到用户发送的图片');
              }
            }
            
            if (hasRestoreAvatarRequest) {
              console.log('🎭 [头像更换] AI要求换回原头像');
              const currentSettings = conversation.characterSettings!;
              
              if (currentSettings.originalAvatar) {
                console.log('✅ [头像更换] 找到原始头像，恢复中...');
                onUpdateConversation(conversationId, {
                  characterSettings: {
                    ...currentSettings,
                    avatar: currentSettings.originalAvatar // 恢复原头像
                    // 保留originalAvatar，以便再次换回
                  }
                });
                console.log('✅ [头像更换] 已恢复原头像');
              } else {
                console.warn('⚠️ [头像更换] 没有保存的原始头像');
              }
            }
            
            // 所有消息显示完毕，隐藏生成状态
            setIsGenerating(false);
            
            // 🚫 如果是拉黑状态，添加系统拦截提示
            if (isCurrentBlocked && processedNewMessages.length > 0) {
              const blockSystemMsg: Message = {
                id: `sys_block_${Date.now()}`,
                role: 'system',
                content: '对方消息已发出，但因被拉黑无法送达',
                timestamp: Date.now()
              };
              
              // 添加这条系统消息
              currentMessages = [...currentMessages, blockSystemMsg];
              onUpdateConversation(conversationId, {
                messages: currentMessages,
                lastMessageTime: Date.now()
              });
            }
            
            // 🚀 通知后台服务生成完成
            backgroundGenerationService.completeGeneration(conversationId, currentMessages);
            
          } else {
            // 🚀 用户已离开或被拉黑：直接添加所有消息，不显示动画
            console.log(isCurrentBlocked ? '用户已拉黑AI，隐式接收消息' : '用户已离开页面，直接添加所有消息并显示通知');
            
            // 直接添加所有消息
            currentMessages = [...currentMessages, ...processedNewMessages];
            onUpdateConversation(conversationId, {
              messages: currentMessages,
              lastMessageTime: Date.now(),
            });
            
            // 🎁 处理订单响应（用户离开的情况下也要处理）
            for (const msg of processedNewMessages) {
              if (msg.content) {
                await processAIOrderResponse(msg, currentMessages);
              }
              // 💰 处理红包/转账响应

              if (msg.moneyTransfer) {
                currentMessages = processAIMoneyResponse(msg, currentMessages);
              }
            }
            
            // 🔥 更新到conversation
            onUpdateConversation(conversationId, {
              messages: currentMessages
            });
            
            // 🎭 检查是否有头像更换指令（用户离开的情况下也要处理）
            const hasAvatarChangeRequest = newMessages.some(msg => 
              msg.role === 'assistant' && msg.content && msg.content.includes('换头像')
            );
            const hasRestoreAvatarRequest = newMessages.some(msg => 
              msg.role === 'assistant' && msg.content && msg.content.includes('换回原头像')
            );
            
            if (hasAvatarChangeRequest) {
              console.log('🎭 [头像更换] AI要求更换头像（用户已离开）');
              const userImageMessage = [...currentMessages]
                .reverse()
                .find(m => m.role === 'user' && m.mediaType === 'image' && m.mediaUrl);
              
              if (userImageMessage && userImageMessage.mediaUrl) {
                console.log('✅ [头像更换] 更新AI头像');
                const currentSettings = conversation.characterSettings!;
                const originalAvatar = currentSettings.originalAvatar || currentSettings.avatar;
                
                onUpdateConversation(conversationId, {
                  characterSettings: {
                    ...currentSettings,
                    originalAvatar: originalAvatar,
                    avatar: userImageMessage.mediaUrl
                  }
                });
              }
            }
            
            if (hasRestoreAvatarRequest) {
              console.log('🎭 [头像更换] AI要求换回原头像（用户已离开）');
              const currentSettings = conversation.characterSettings!;
              
              if (currentSettings.originalAvatar) {
                console.log('✅ [头像更换] 恢复原头像');
                onUpdateConversation(conversationId, {
                  characterSettings: {
                    ...currentSettings,
                    avatar: currentSettings.originalAvatar
                  }
                });
              }
            }
            
            // 显示消息通知（用户已离开页面）
            showMessageNotification(conversationId, newMessages);
            
            // 🚀 通知后台服务生成完成（用户离开的情况）
            backgroundGenerationService.completeGeneration(conversationId, currentMessages);
          }
          
          // 使用最终的消息列表（确保同步）
          const updatedMessages = currentMessages;
          
          // 🚀 性能优化：完全后台异步处理，不阻塞主流程
          // 使用setTimeout确保在下一个事件循环中执行，不影响用户体验
          setTimeout(() => {
            // 更新AI状态显示
            if (conversation.type === 'private' && conversation.characterSettings) {
              getAIStatus(conversation.id).then(status => {
                if (status && isComponentMountedRef.current) setAIStatus(status);
              }).catch(err => console.error('获取AI状态失败:', err));
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
          } catch (callbackError) {
            // 🆕 如果callback本身出错，确保状态重置
            console.error('❌ Callback执行出错:', callbackError);
            setIsGenerating(false);
            setShowSendingHint(false);
            setShowTyping(false);
            showToast('处理回复时出错，请重试', 'error');
          }
        }
      );
      
      console.log('✅ 后台任务已创建，可以自由切换页面了');
      
    } catch (error) {
      console.error('Generate failed:', error);
      
      // 🔥 改进错误提示，告知用户可以重试
      const errorMessage = error instanceof Error ? error.message : String(error);
      const displayError = errorMessage.length > 100 ? '网络或API错误' : errorMessage;
      const retryHint = '\n\n💡 提示：您可以再次发送消息重试，或检查网络连接和API配置。';
      
      showToast(`消息发送失败：${displayError}` + retryHint, 'error');
      
      setShowSendingHint(false);
      setShowTyping(false);
      setIsGenerating(false);
      
      // 🚀 通知后台服务生成失败
      backgroundGenerationService.failGeneration(conversation.id, errorMessage);
    }
  };

  // 旧的同步代码已被删除，现在使用后台任务
  
  // 🧠 执行群聊记忆总结
  const performGroupMemorySummary = async (currentMessages: Message[]) => {
    try {
      // 检查是否需要总结
      if (!shouldTriggerGroupMemorySummary(conversation.id, currentMessages.length)) {
        console.log('🧠 群聊消息数未达到总结阈值，跳过');
        return;
      }
      
      console.log('🧠 开始群聊记忆总结...');
      
      // 获取群成员名称
      const groupMembers = conversation.members
        ?.map(mid => {
          const member = conversations.find(c => c.id === mid);
          return member?.characterSettings?.nickname || member?.name || '未知';
        }) || [];
      
      // 获取当前AI成员（可能有多个）
      const aiMember = conversation.members
        ?.map(mid => conversations.find(c => c.id === mid))
        .find(c => c && c.type === 'private');
      
      if (!aiMember) {
        console.error('未找到AI成员');
        return;
      }
      
      const aiName = aiMember.characterSettings?.nickname || aiMember.name;
      const groupMemories = getGroupMemories(aiMember.id, conversation.id);
      
      // 构建群聊记忆总结提示词
      const summaryPrompt = buildGroupMemorySummaryPrompt(
        conversation.name,
        aiName,
        currentMessages,
        groupMembers,
        groupMemories
      );
      
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
          temperature: 0.3,
        })
      });
      
      if (!response.ok) {
        const errorInfo = await getErrorFromResponse(response);
        console.error('群聊记忆总结失败:', formatErrorMessage(errorInfo));
        return;
      }
      
      const data = await response.json();
      const summaryResponse = data.choices?.[0]?.message?.content;
      
      if (!summaryResponse) {
        console.error('未收到有效的群聊记忆总结');
        return;
      }
      
      // 解析总结结果
      const memories = parseMemorySummaryResponse(summaryResponse);
      
      if (memories.length > 0) {
        console.log(`🧠 群聊提取到 ${memories.length} 条新记忆`);
        
        // 添加到群聊记忆库
        memories.forEach((mem: { content: string; importance: 'low' | 'medium' | 'high'; category?: string }) => {
          addGroupMemory(
            aiMember.id,
            conversation.id,
            conversation.name,
            mem.content,
            mem.category || '群聊话题',
            mem.importance
          );
        });
        
        console.log(`✅ 已保存 ${memories.length} 条群聊记忆`);
      } else {
        console.log('🧠 本次群聊没有值得记忆的新信息');
      }
      
      // 更新群聊总结计数器
      updateGroupSummaryCounter(aiMember.id, currentMessages.length);
      
    } catch (error) {
      console.error('群聊记忆总结失败:', error);
    }
  };

  // 🧠 执行记忆总结
  const performMemorySummary = async (currentMessages: Message[]) => {
    try {
      console.log('🧠 开始记忆总结...');
      const memoryBank = await getMemoryBank(conversation.id);
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
        for (const mem of memories) {
          await addMemory(conversation.id, mem.content, mem.importance, mem.category, true);
        }
        
        alert(`✅ 已保存 ${memories.length} 条记忆`);
      } else {
        console.log('🧠 本次对话没有值得记忆的新信息');
      }
      
      // 更新总结计数器
      await updateSummaryCounter(conversation.id, currentMessages.length);
      
    } catch (error) {
      console.error('记忆总结失败:', error);
      // 即使失败也更新计数器，避免重复尝试
      await updateSummaryCounter(conversation.id, currentMessages.length);
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

  // 提取自定义CSS
  const customCss = conversation.characterSettings?.customBubbleCss;
  // 提取是否隐藏气泡尾巴
  const hideBubbleTail = conversation.characterSettings?.hideBubbleTail;
  // 提取气泡装饰配置
  const decorationConfig = conversation.characterSettings?.bubbleDecoration;

  return (
    <>
    <div 
      className="flex flex-col h-full bg-gray-50 relative"
      style={conversation.characterSettings?.chatBackground ? {
        backgroundImage: `url(${conversation.characterSettings.chatBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : undefined}
    >
      {/* 注入自定义气泡样式 */}
      {customCss && <style>{customCss}</style>}
      {/* 全局统一：给用户气泡加玻璃质感（保持原颜色，只增加描边+模糊） */}
      <style>{`
        .message-bubble.user {
          backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(255,255,255,0.3) !important;
          box-shadow: 0 6px 24px rgba(0,0,0,0.06) !important;
        }
      `}</style>
      {/* 如果开启了隐藏尾巴，注入隐藏样式 */}
      {hideBubbleTail && <style>{`.message-tail { display: none !important; }`}</style>}
      {/* 注入气泡装饰样式 */}
      {decorationConfig?.show && (
        <style>{`
          .message-bubble {
            position: relative !important;
            overflow: visible !important;
          }
          .message-bubble::after {
            content: ${decorationConfig.type === 'text' ? `"${decorationConfig.content}"` : '""'} !important;
            position: absolute !important;
            z-index: 10 !important;
            width: ${decorationConfig.size}px !important;
            height: ${decorationConfig.size}px !important;
            font-size: ${decorationConfig.size}px !important;
            line-height: 1 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            pointer-events: none !important;
            ${decorationConfig.type === 'image' ? `
              background-image: url('${decorationConfig.content}') !important;
              background-size: contain !important;
              background-repeat: no-repeat !important;
              background-position: center !important;
            ` : ''}
            ${decorationConfig.position === 'top-right' ? `top: ${decorationConfig.offsetY}px !important; right: ${decorationConfig.offsetX}px !important;` : ''}
            ${decorationConfig.position === 'bottom-right' ? `bottom: ${decorationConfig.offsetY}px !important; right: ${decorationConfig.offsetX}px !important;` : ''}
            ${decorationConfig.position === 'bottom-left' ? `bottom: ${decorationConfig.offsetY}px !important; left: ${decorationConfig.offsetX}px !important;` : ''}
            ${decorationConfig.position === 'top-left' ? `top: ${decorationConfig.offsetY}px !important; left: ${decorationConfig.offsetX}px !important;` : ''}
          }
        `}</style>
      )}

      {/* Header - 固定在顶部 */}
      <div className="absolute top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 -ml-1 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-800" strokeWidth={2.5} />
          </button>
          {/* 群聊头像 */}
          {conversation.type === 'group' && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
              {conversation.avatar ? (
                <img src={conversation.avatar} alt="群头像" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-semibold text-sm">
                  {conversation.name.charAt(0) || '群'}
                </span>
              )}
            </div>
          )}
          <div className="flex flex-col">
            <h1 className="text-base font-semibold text-gray-900">{conversation.name}</h1>
            {conversation.type === 'private' && conversation.characterSettings ? (
              <div className="flex items-center gap-1 px-2 py-0.5 -ml-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  aiStatus?.status === 'online' ? 'bg-green-500' :
                  aiStatus?.status === 'busy' ? 'bg-yellow-500' :
                  aiStatus?.status === 'resting' ? 'bg-blue-500' :
                  aiStatus?.status === 'away' ? 'bg-gray-400' :
                  'bg-gray-300'
                }`}></div>
                <span className="text-xs text-gray-500 truncate max-w-[200px]">
                  {aiStatus?.statusText || '在线'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-500">在线</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 搜索按钮 */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="搜索聊天记录"
          >
            <Search className="w-5 h-5 text-gray-700" />
          </button>
          
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
          
          {/* 设置按钮 */}
          {conversation.type === 'private' && (
            <button
              onClick={onOpenCharacterSettings}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="角色设置"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
              </svg>
            </button>
          )}
          
          {/* 群聊设置按钮 */}
          {conversation.type === 'group' && (
            <button
              onClick={() => setShowGroupSettings(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="群聊设置"
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
        ref={messagesContainerRef}
        className="absolute top-[60px] bottom-[60px] left-0 right-0 overflow-y-auto p-4 space-y-3"
      >
        {/* 🚀 滚动加载：顶部加载指示器 */}
        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              <span>加载更多消息中...</span>
            </div>
          </div>
        )}
        
        {/* 是否还有更多历史消息提示 */}
        {!isLoadingMore && messageWindow.startIndex > 0 && (
          <div className="flex justify-center py-2">
            <div className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
              还有 {messageWindow.startIndex} 条历史消息，向上滑动加载更多
            </div>
          </div>
        )}
        
        {/* 根据消息窗口显示消息 */}
        {conversation.messages.slice(messageWindow.startIndex, messageWindow.startIndex + messageWindow.size).map((message, index) => {
          // 🚫 如果是拉黑期间的消息且当前仍在拉黑状态，则不显示
          if (message.isBlockedMessage && conversation.isBlocked) {
            return null;
          }

          // 获取当前显示的消息数组，用于正确计算时间显示
          const displayMessages = conversation.messages.slice(messageWindow.startIndex, messageWindow.startIndex + messageWindow.size);
          
          // 微信风格：超过5分钟才显示时间
          const showTime = index === 0 || 
            (displayMessages[index - 1] && 
             message.timestamp - displayMessages[index - 1].timestamp > 5 * 60 * 1000);
          
          // 提前计算是否为HTML内容（用于调整气泡样式）
          const hasHTMLTags = message.content && /<[^>]+>/.test(message.content);
          const htmlTagCount = (message.content && message.content.match(/<[^>]+>/g) || []).length;
          const hasStructuralTags = message.content && ['<div', '<style', '<span', '<table', '<ul', '<ol'].some(tag => message.content.includes(tag));
          const isHTMLContent = hasHTMLTags && (htmlTagCount >= 3 || hasStructuralTags);
          
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
                <>
                  {/* 红包领取通知 - 醒目样式 */}
                  {(message as any).systemMessageType === 'redPacketClaim' || (message as any).moneyTransfer?.isClaimNotification ? (
                    <div className="flex justify-center my-2">
                      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl px-4 py-2.5 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🎁</span>
                          <div className="text-sm text-gray-600">
                            {message.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* 普通系统消息 */
                    <div className="flex justify-center my-2">
                      <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                        {message.content}
                      </span>
                    </div>
                  )}
                </>
              ) : (
              <div id={`message-${message.id}`} className={`message-bubble flex gap-2 items-end transition-colors ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <div className="relative flex-shrink-0">
                    {/* 群聊：显示发送者的头像 */}
                    {conversation.type === 'group' ? (
                      (message as any).senderAvatar ? (
                        <div 
                          className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-md cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                          onClick={() => handleAvatarClick(message.id, (message as any).senderId || '', (message as any).senderName || 'AI', (message as any).senderAvatar)}
                        >
                          <img src={(message as any).senderAvatar} alt={(message as any).senderName || 'AI'} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div 
                          className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center border-2 border-white shadow-md cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                          onClick={() => handleAvatarClick(message.id, (message as any).senderId || '', (message as any).senderName || 'AI', undefined)}
                        >
                          <span className="text-white font-semibold text-sm">{((message as any).senderName || 'AI').charAt(0)}</span>
                        </div>
                      )
                    ) : (
                      /* 私聊：显示对话角色的头像 */
                      conversation.characterSettings?.avatar ? (
                        <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-md">
                          <img src={conversation.characterSettings.avatar} alt="AI头像" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border-2 border-white shadow-md">
                          <span className="text-white font-semibold text-sm">{conversation.name.charAt(0)}</span>
                        </div>
                      )
                    )}
                    {/* 只在私聊显示角标 */}
                    {conversation.type === 'private' && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-[10px]">{getUserBadge()}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="relative max-w-[70%]">
                  {/* 🚫 拉黑期间消息标记（解除拉黑后显示） */}
                  {message.isBlockedMessage && !conversation.isBlocked && (
                    <div className="absolute -right-6 top-1/2 -translate-y-1/2 text-red-500 font-bold text-lg select-none cursor-help" title="对方在被拉黑期间发送的消息">
                      !
                    </div>
                  )}

                  {/* 群聊：显示发送者名字 */}
                  {message.role === 'assistant' && conversation.type === 'group' && (message as any).senderName && (
                    <div className="text-xs text-gray-500 mb-1 ml-1">
                      {(message as any).senderName}
                    </div>
                  )}
                  
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
                    className={`message-bubble ${message.role === 'user' ? 'user' : 'ai'} rounded-2xl shadow-sm cursor-pointer ${
                      isHTMLContent 
                        ? 'bg-transparent border-0 shadow-none p-0 overflow-visible' 
                        : message.moneyTransfer 
                          ? 'p-0 overflow-hidden'
                          : message.role === 'user'
                          ? 'bg-white text-gray-900 border border-gray-200'
                          : 'bg-white text-gray-900 border border-gray-200'
                    } ${message.mediaType || message.moneyTransfer || isHTMLContent ? 'p-0' : message.replyTo ? 'pb-2.5' : 'px-4 py-2.5'} ${
                      isMultiSelectMode && selectedMessages.includes(message.id) ? 'ring-2 ring-purple-500' : ''
                    }`}
                  >
                    {/* 引用消息显示（只在非特殊消息时显示在这里） */}
                    {message.replyTo && !message.moneyTransfer && !message.document && !message.order && !isHTMLContent && (
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
                    {message.moneyTransfer && message.moneyTransfer.type !== 'groupRedPacket' && (
                      <div className={`p-0 rounded-2xl overflow-hidden mb-2 ${
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
                              已退回
                            </div>
                          )}
                        </div>
                        {message.moneyTransfer.status === 'pending' && message.role === 'assistant' && (
                          <div className="bg-white/20 backdrop-blur-sm border-t border-white/20 flex">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReceiveMoney(message.id, true);
                              }}
                              className="flex-1 py-3 text-white font-medium hover:bg-white/10 transition-colors border-r border-white/20"
                            >
                              {message.moneyTransfer.type === 'redPacket' ? '🎁 领取' : '✅ 收款'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReceiveMoney(message.id, false);
                              }}
                              className="flex-1 py-3 text-white font-medium hover:bg-white/10 transition-colors"
                            >
                              💝 退回
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* 群红包卡片 */}
                    {message.moneyTransfer?.type === 'groupRedPacket' && message.moneyTransfer.groupRedPacket && (
                      <div className="mb-2">
                        <GroupRedPacketCard
                          redPacket={message.moneyTransfer.groupRedPacket}
                          currentUserId="user"
                          currentUserName={userProfile?.name || '你'}
                          onClaim={(amount) => {
                            receiveMoney(amount, 'groupRedPacket', conversation.id, '群红包');
                          }}
                          onUpdate={(updatedRedPacket) => {
                            const updatedMessages = conversation.messages.map(m => {
                              if (m.id === message.id && m.moneyTransfer?.groupRedPacket) {
                                return {
                                  ...m,
                                  moneyTransfer: {
                                    ...m.moneyTransfer,
                                    groupRedPacket: updatedRedPacket
                                  }
                                };
                              }
                              return m;
                            });
                            
                            onUpdateConversation(conversation.id, {
                              messages: updatedMessages
                            });
                          }}
                        />
                      </div>
                    )}
                    
                    {/* 🔥 红包/转账的文字回复（只显示AI接收/退回红包的回复，不显示AI发送红包时的文字） */}
                    {message.moneyTransfer && message.content && message.content.trim() && 
                     message.role === 'assistant' && 
                     (message.moneyTransfer.status === 'received' || message.moneyTransfer.status === 'returned') && (
                      <div className="rounded-2xl px-4 py-2.5 bg-white border border-gray-200">
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                    )}
                    
                    {/* 🎭 HTML模块完整界面（小红书、知乎、微博、搜索记录等） */}
                    {message.socialFeed && message.socialFeed.platform === 'xiaohongshu' && (
                      <XiaohongshuFeed rawContent={message.socialFeed.rawContent} />
                    )}
                    {message.socialFeed && message.socialFeed.platform === 'zhihu' && (
                      <ZhihuFeed rawContent={message.socialFeed.rawContent} />
                    )}
                    {message.socialFeed && message.socialFeed.platform === 'weibo' && (
                      <WeiboFeed rawContent={message.socialFeed.rawContent} />
                    )}
                    {message.socialFeed && message.socialFeed.platform === 'search-history' && (
                      <SearchHistoryView rawContent={message.socialFeed.rawContent} />
                    )}
                    
                    {/* 🔗 微信风格链接预览（新系统，优先显示） */}
                    {message.linkPreview && (
                      <WeChatLinkPreview
                        data={message.linkPreview}
                        onClick={() => {
                          // 小红书链接：在应用内打开专用的小红书详情模态框
                          if (message.linkPreview!.platform === 'xiaohongshu') {
                            setViewingXiaohongshuLink(message.linkPreview!);
                            return;
                          }

                          // 其它平台：如果有完整内容，使用文档查看器；否则尝试按URL打开
                          if (message.linkPreview!.content) {
                            setViewingDocument({
                              title: message.linkPreview!.title,
                              content: message.linkPreview!.content,
                              type: 'text'
                            });
                          } else if (message.linkPreview!.url) {
                            window.open(message.linkPreview!.url, '_blank');
                          }
                        }}
                      />
                    )}
                    
                    {/* Word 风格文档卡片 */}
                    {!message.linkPreview && message.document && (
                      <WordStyleDocumentCard
                        document={message.document}
                        compact={true}
                        onClick={() => setViewingDocument(message.document)}
                        onSave={() => {
                          // 弹出输入框让用户自定义名称
                          const customTitle = prompt(
                            '请输入文档名称：',
                            message.document!.title
                          );
                          
                          if (customTitle === null) return; // 用户取消
                          
                          const finalTitle = customTitle.trim() || message.document!.title;
                          
                          try {
                            saveToLibrary(message.document!, conversation.id, finalTitle);
                            showToast(`✅ 文档已保存：${finalTitle}`, 'success');
                          } catch (error) {
                            showToast('❌ 保存失败', 'error');
                          }
                        }}
                        onForward={() => {
                          setForwardingDocument(message.document!);
                          setShowSelectContact(true);
                        }}
                      />
                    )}
                    
                    {/* 🎵 网易云音乐卡片 */}
                    {message.neteaseMusicInfo && (
                      <div className="max-w-[300px]">
                        <NeteaseMusicCard
                          musicInfo={message.neteaseMusicInfo}
                          className="w-full"
                          onPlay={() => {
                            console.log('🎵 播放网易云音乐:', message.neteaseMusicInfo?.title);
                          }}
                          onPause={() => {
                            console.log('🎵 暂停网易云音乐:', message.neteaseMusicInfo?.title);
                          }}
                        />
                      </div>
                    )}

                    {/* 🎵 音乐卡片 */}
                    {message.music && (
                      <div className="max-w-[300px]">
                        {(message.music as any).isRealMusic ? (
                          <RealMusicCard
                            music={message.music as any}
                            className="w-full"
                          />
                        ) : (
                          <MusicCard
                            music={message.music}
                            className="w-full"
                            showPlayButton={true}
                            enableRealAudio={true}
                          />
                        )}
                      </div>
                    )}
                    
                    {/* 订单消息气泡（礼物/代付请求） - 根据source显示不同样式 */}
                    {message.order && (
                      <div className="rounded-2xl overflow-hidden max-w-[300px]">
                        {/* 淘宝商品卡片 */}
                        {message.order.source === 'taobao' && (
                          <div className="bg-gradient-to-br from-blue-500 to-purple-600">
                            {/* 蓝色头部 */}
                            <div className="text-white text-center py-3 px-4">
                              <div className="font-semibold text-base">给你的礼物</div>
                              <div className="text-xs opacity-90 mt-0.5">你的留言・查看详情</div>
                            </div>
                            {/* 白色内容区 */}
                            <div className="bg-white p-4 space-y-3">
                              {message.order.message && (
                                <div className="bg-blue-50 rounded-lg p-3">
                                  <div className="text-sm font-medium text-blue-900 mb-1">已下单留言・送给{message.order.recipientName || '你'}的礼物</div>
                                  <div className="text-sm text-gray-700">{message.order.message}</div>
                                  <div className="text-xs text-gray-500 mt-2">—{message.role === 'assistant' ? (conversation.characterSettings?.nickname || '我') : '我'}</div>
                                </div>
                              )}
                              <div className="text-sm font-medium text-gray-800 mb-2">{message.order.products[0]?.name || '精美礼品'}</div>
                              <div className="text-orange-600 text-lg font-bold">¥{message.order.totalAmount.toFixed(2)}</div>
                              <div className="text-blue-500 text-xs">查看详情 &gt;</div>
                              {message.order.orderNumber && (
                                <div className="text-xs text-gray-400">
                                  序号: {message.order.orderNumber} <br />
                                  时 间: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}<br />
                                  类型: 礼物 💝
                                </div>
                              )}
                              {message.role === 'assistant' && message.order.status === 'pending' && (
                                <div className="flex gap-2 mt-3">
                                  <button onClick={(e) => { e.stopPropagation(); handleAcceptOrder(message); }}
                                    className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium">收下礼物</button>
                                  <button onClick={(e) => { e.stopPropagation(); handleRejectOrder(message); }}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg">退回</button>
                                </div>
                              )}
                              {message.order.status !== 'pending' && (
                                <div className="text-center py-2 text-sm font-medium text-gray-500">
                                  {message.order.status === 'accepted' && '✅ 已接收'}
                                  {message.order.status === 'rejected' && '❌ 已拒绝'}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 饿了么外卖卡片 */}
                        {message.order.source === 'eleme' && message.order && (() => {
                          // 计算动态配送状态
                          const order = message.order;
                          const orderTime = order.createdAt || message.timestamp;
                          const deliveryStatus = calculateDeliveryStatus(orderTime);
                          const activeStage = getActiveStageIndex(deliveryStatus);
                          const riderInfo = getRiderInfo();
                          const isDelivered = deliveryStatus.stage === 'delivered';
                          
                          // 触发刷新（使用deliveryRefreshTrigger）
                          void deliveryRefreshTrigger;
                          
                          return (
                            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500">
                              {/* 黄色头部 */}
                              <div className="text-gray-800 px-4 py-2.5">
                                <div className="font-semibold text-sm">
                                  {isDelivered ? '✅ 已送达' : formatEstimatedTime(deliveryStatus.estimatedMinutes)}
                                </div>
                                <div className="font-bold text-lg flex items-center gap-2">
                                  <span>{deliveryStatus.statusEmoji}</span>
                                  <span>{deliveryStatus.stageText}</span>
                                </div>
                              </div>
                              {/* 白色内容区 */}
                              <div className="bg-white p-4 space-y-3">
                                {!isDelivered && (
                                  <>
                                    {/* 骑手信息 */}
                                    <div className="flex items-center gap-3 pb-3 border-b">
                                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-lg">👤</div>
                                      <div className="flex-1">
                                        <div className="text-sm font-medium">{riderInfo.name} ★ {riderInfo.rating}</div>
                                        <div className="text-xs text-gray-500">
                                          {deliveryStatus.riderDistance || '距离约 1.4km'}
                                        </div>
                                      </div>
                                      <button className="p-2 bg-gray-100 rounded-full">📞</button>
                                    </div>
                                    {/* 配送进度 */}
                                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                                      {['已接单', '已取餐', '配送中', '送达'].map((text, idx) => (
                                        <span key={idx} className={idx === activeStage ? 'font-bold text-gray-800' : ''}>
                                          {text}
                                        </span>
                                      ))}
                                    </div>
                                    <div className="h-1.5 bg-gray-200 rounded-full mb-4">
                                      <div 
                                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                                        style={{ width: `${deliveryStatus.progress}%` }}
                                      ></div>
                                    </div>
                                  </>
                                )}
                                {isDelivered && (
                                  <div className="text-center py-4 text-green-600 font-medium">
                                    ✅ 订单已完成送达
                                  </div>
                                )}
                              {/* 商品列表 */}
                              <div className="border-t pt-3">
                                <div className="font-semibold text-sm mb-2">商品和配送详情</div>
                                {order.products.map((product, idx) => (
                                  <div key={idx} className="text-sm text-gray-700 mb-1">
                                    {product.name} ×{product.quantity} <span className="float-right">¥{product.price.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                              {/* 配送地址 */}
                              <div className="border-t pt-3">
                                <div className="font-semibold text-sm mb-1">配送地址</div>
                                <div className="text-sm text-gray-600">北京市东城区XX路XX号 XX公寓 (距) 1868****119</div>
                              </div>
                              {/* 订单备注 */}
                              {order.message && (
                                <div className="border-t pt-3">
                                  <div className="font-semibold text-sm mb-1">订单备注</div>
                                  <div className="text-sm text-gray-600">{order.message}</div>
                                </div>
                              )}
                              {message.role === 'assistant' && order.status === 'pending' && !isDelivered && (
                                <div className="flex gap-2 mt-3">
                                  <button onClick={(e) => { e.stopPropagation(); handleAcceptOrder(message); }}
                                    className="flex-1 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-800 rounded-lg font-medium">确认收货</button>
                                  <button onClick={(e) => { e.stopPropagation(); handleRejectOrder(message); }}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg">取消订单</button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                        {/* 电影票卡片 (优化样式) */}
                        {message.order.source === 'movie' && (
                          <div className="bg-gradient-to-br from-purple-500 to-pink-500">
                            <div className="text-white text-center py-3 px-4">
                              <div className="font-semibold text-base">🎬 电影票</div>
                              <div className="text-xs opacity-90 mt-0.5">给你的观影券</div>
                            </div>
                            <div className="bg-white p-4 space-y-3">
                              {message.order.products.map((product, idx) => (
                                <div key={idx}>
                                  <div className="text-lg font-bold text-gray-800">{product.name}</div>
                                  <div className="text-sm text-gray-600 mt-2">
                                    影院: 万达影城 IMAX<br />
                                    场次: 今天 19:30<br />
                                    座位: 7排8座<br />
                                    影厅: 3号厅
                                  </div>
                                  <div className="text-orange-600 text-lg font-bold mt-2">¥{product.price.toFixed(2)}</div>
                                </div>
                              ))}
                              {message.order.message && (
                                <div className="bg-purple-50 rounded-lg p-3 text-sm text-gray-700">{message.order.message}</div>
                              )}
                              {message.role === 'assistant' && message.order.status === 'pending' && (
                                <div className="flex gap-2 mt-3">
                                  <button onClick={(e) => { e.stopPropagation(); handleAcceptOrder(message); }}
                                    className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium">接受邀请</button>
                                  <button onClick={(e) => { e.stopPropagation(); handleRejectOrder(message); }}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg">谢绝</button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
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
                    {/* 用户语音消息（与AI样式一致：只显示转文字，不播放音频） */}
                    {!message.mediaItems && message.role === 'user' && message.mediaType === 'voice' && message.isMediaDescriptionOnly && (
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
                    )}
                    {/* 用户语音消息（旧版本：带播放功能，保留兼容） */}
                    {!message.mediaItems && message.role === 'user' && message.mediaType === 'voice' && message.mediaUrl && !message.isMediaDescriptionOnly && (
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
                          <div className="mt-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200 max-w-[200px]">
                            <p className="text-[13px] text-gray-700 break-words whitespace-pre-wrap">{message.mediaDescription}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {/* 用户表情包 */}
                    {!message.mediaItems && message.role === 'user' && message.mediaType === 'sticker' && (
                      message.mediaUrl ? (
                        // 真实表情包（图片）
                        <div className="relative w-[120px] h-[120px] rounded-lg overflow-hidden bg-transparent">
                          <img 
                            src={message.mediaUrl} 
                            alt="表情包" 
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        // 纯文字描述表情包
                        <div className="relative w-[120px] h-[120px] rounded-2xl overflow-hidden bg-blue-100/40 backdrop-blur-sm border border-blue-200">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-blue-100/30" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                            <Smile className="w-8 h-8 text-blue-400 mb-2" strokeWidth={1.5} />
                            <p className="text-xs text-gray-700 leading-tight">{message.mediaDescription}</p>
                          </div>
                        </div>
                      )
                    )}
                    
                    {/* 🔄 转发消息显示 */}
                    {message.forwarded && (
                      <div className="mt-2">
                        {message.forwarded.type === 'merged' && message.forwarded.messages && (
                          <div 
                            onClick={() => setViewingMergedForward(message.forwarded)}
                            className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-600 font-medium">聊天记录</span>
                              <span className="text-xs text-gray-400">({message.forwarded.messages.length}条消息)</span>
                            </div>
                            <div className="text-sm font-medium text-gray-800 mb-1">
                              {message.forwarded.title || '转发的聊天记录'}
                            </div>
                            <div className="text-xs text-gray-500 space-y-1">
                              {message.forwarded.messages.slice(0, 3).map((msg, idx) => (
                                <div key={idx} className="truncate">
                                  <span className="font-medium">{msg.senderName}:</span> {msg.content}
                                </div>
                              ))}
                              {message.forwarded.messages.length > 3 && (
                                <div className="text-gray-400">...还有{message.forwarded.messages.length - 3}条消息</div>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                              来自：{message.forwarded.from.conversationName}
                              <Eye className="w-3 h-3" />
                              <span>点击查看</span>
                            </div>
                          </div>
                        )}
                        {message.forwarded.type === 'single' && message.forwarded.originalMessage && (
                          <div className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-600 font-medium">转发消息</span>
                            </div>
                            <div className="text-sm text-gray-800">
                              {message.forwarded.originalMessage.content}
                            </div>
                            <div className="text-xs text-gray-400 mt-2">
                              来自：{message.forwarded.from.conversationName}
                            </div>
                          </div>
                        )}
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
                    )}
                    {/* AI表情包 */}
                    {!message.mediaItems && message.role === 'assistant' && message.mediaType === 'sticker' && (
                      message.mediaUrl ? (
                        // 真实表情包（图片）
                        <div className="relative w-[120px] h-[120px] rounded-lg overflow-hidden bg-transparent">
                          <img 
                            src={message.mediaUrl} 
                            alt="表情包" 
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : message.isMediaDescriptionOnly ? (
                        // 纯文字描述表情包（仅当标记为纯描述时）
                        <div className="relative w-[120px] h-[120px] rounded-2xl overflow-hidden bg-blue-100/40 backdrop-blur-sm border border-blue-200">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-blue-100/30" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                            <Smile className="w-8 h-8 text-blue-400 mb-2" strokeWidth={1.5} />
                            <p className="text-xs text-gray-700 leading-tight">{message.mediaDescription}</p>
                          </div>
                        </div>
                      ) : null
                    )}
                    
                    {/* 纯文字内容 / HTML内容 */}
                    {!message.mediaType && !message.moneyTransfer && !message.document && !message.order && message.content && message.content.trim() && (() => {
                      // 检测是否是HTML内容（包含多个标签或结构化标签）
                      const hasHTMLTags = /<[^>]+>/.test(message.content);
                      const htmlTagCount = (message.content.match(/<[^>]+>/g) || []).length;
                      const hasStructuralTags = ['<div', '<style', '<span', '<table', '<ul', '<ol'].some(tag => message.content.includes(tag));
                      const isHTMLContent = hasHTMLTags && (htmlTagCount >= 3 || hasStructuralTags);
                      
                      if (isHTMLContent) {
                        // HTML内容：使用dangerouslySetInnerHTML渲染
                        return (
                          <div 
                            className={`message-content content text-[15px] leading-relaxed ${message.replyTo ? 'px-4' : ''}`}
                            dangerouslySetInnerHTML={{ __html: message.content }}
                          />
                        );
                      } else {
                        // 普通文本内容
                        return (
                          <p className={`message-content content text-[15px] leading-relaxed whitespace-pre-wrap break-words ${message.replyTo ? 'px-4' : ''}`}>
                            {message.content}
                          </p>
                        );
                      }
                    })()}
                    {/* 用户媒体的描述文字（排除语音和表情包） */}
                    {message.role === 'user' && message.mediaType && message.mediaType !== 'sticker' && message.mediaType !== 'voice' && message.mediaDescription && (
                      <p className="text-[13px] leading-relaxed px-3 py-2 text-gray-600">{message.mediaDescription}</p>
                    )}
                    {/* 🆕 消息回应显示 */}
                    {message.reactions && message.reactions.length > 0 && (
                      <div className={`absolute -bottom-4 ${message.role === 'user' ? 'left-0' : 'right-0'} flex gap-1 z-10`}>
                        {message.reactions.map((reaction, rIdx) => (
                          <div key={rIdx} className="bg-white border border-gray-200 rounded-full px-1.5 py-0.5 text-xs shadow-sm scale-90 flex items-center justify-center min-w-[20px] h-[20px]">
                            {reaction.type}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 语音转文字内容显示（放在气泡容器内部，紧贴语音气泡下方） */}
                    {message.mediaType === 'voice' && message.isMediaDescriptionOnly && viewingVoice.includes(message.id) && message.mediaDescription && (
                      <div className="mt-2">
                        <div className="px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
                          <p className="text-[13px] text-gray-700 whitespace-pre-wrap break-words leading-relaxed">{message.mediaDescription}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Message tail */}
                  <div className={`message-tail absolute bottom-3 ${
                    message.role === 'user' ? 'right-0 translate-x-[40%]' : 'left-0 -translate-x-[40%]'
                  }`}>
                    <div className={`w-2.5 h-2.5 bg-white border-gray-200 transform rotate-45 shadow-sm ${
                      message.role === 'user' ? 'border-r border-b' : 'border-l border-t'
                    }`}></div>
                  </div>
                </div>
                
                {/* 语音转文字内容已移动到气泡容器内部渲染，避免位置偏移问题 */}
                
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

        {isGroupProcessing && (
          <div className="flex justify-center my-2">
            <div className="bg-indigo-500/90 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full shadow-sm flex items-center space-x-1 animate-pulse">
               <span>⚡</span>
               <span>群聊响应中...</span>
            </div>
          </div>
        )}

        {showSendingHint && (
          <div className="flex justify-center my-2">
            <div className="bg-blue-500 text-white text-xs px-3 py-1.5 rounded-full shadow-sm">
              消息发送中...
            </div>
          </div>
        )}

        {/* 私聊打字动画 */}
        {showTyping && conversation.type === 'private' && (
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

        {/* 群聊打字动画 */}
        {currentTypingAI && conversation.type === 'group' && (
          <div className="flex gap-2 items-end justify-start">
            <div className="relative flex-shrink-0">
              {currentTypingAI.avatar ? (
                <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-md">
                  <img src={currentTypingAI.avatar} alt={currentTypingAI.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center border-2 border-white shadow-md">
                  <span className="text-white font-semibold text-sm">{currentTypingAI.name.charAt(0)}</span>
                </div>
              )}
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
        
        {/* 🚀 返回底部按钮 - 居中显示在手机容器中 */}
        {!shouldScrollToBottom && isUserScrolling && (
          <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50">
            <button
              onClick={() => {
                console.log('🔄 用户点击返回底部，智能重置消息窗口');
                
                // 🚀 智能重置：回到底部时重置为合理的消息窗口
                const resetSize = Math.min(100, conversation.messages.length); // 最多100条最新消息
                const newWindow = {
                  startIndex: Math.max(0, conversation.messages.length - resetSize),
                  size: resetSize
                };
                
                console.log(`📊 重置消息窗口：显示从索引 ${newWindow.startIndex} 开始的 ${newWindow.size} 条消息`);
                
                setMessageWindow(newWindow);
                setShouldScrollToBottom(true);
                setIsUserScrolling(false); // 重置滚动状态
                
                // 延迟滚动，确保DOM更新
                setTimeout(() => smartScrollToBottom(true), 100);
              }}
              className="bg-blue-500/90 hover:bg-blue-600 text-white p-2 rounded-full shadow-lg transition-all backdrop-blur-sm flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span className="text-xs">回到底部</span>
            </button>
          </div>
        )}
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
                multiple
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
              <button 
                className="flex-shrink-0"
                onClick={() => setShowRealMusicModal(true)}
                title="搜索真实音乐"
              >
                <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <Music className="w-4 h-4 text-gray-600" />
                </div>
              </button>
              <button 
                className="flex-shrink-0"
                onClick={() => setShowCallTypeSelector(true)}
              >
                <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <Phone className="w-4 h-4 text-gray-600" />
                </div>
              </button>
              <button className="flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <MapPin className="w-4 h-4 text-gray-600" />
                </div>
              </button>
              {/* 红包按钮 - 私聊打开普通红包，群聊打开群红包 */}
              <button 
                className="flex-shrink-0"
                onClick={() => {
                  if (conversation.type === 'group') {
                    setShowGroupRedPacketModal(true);
                  } else {
                    setShowMoneyTransferModal(true);
                  }
                }}
              >
                <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <Gift className="w-4 h-4 text-gray-600" />
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
              <button 
                className="flex-shrink-0"
                onClick={() => setShowSubChatManager(true)}
              >
                <div className="w-9 h-9 rounded-full bg-white border border-purple-300 flex items-center justify-center hover:border-purple-400 transition-colors hover:bg-purple-50">
                  <MessageCircle className="w-4 h-4 text-purple-600" />
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

        {/* @成员列表弹窗 */}
        {showAtMemberList && conversation.type === 'group' && (
          <div className="absolute bottom-16 left-0 right-0 bg-white border-t border-gray-200 shadow-lg max-h-60 overflow-y-auto">
            <div className="p-2 space-y-1">
              {(conversation.members || [])
                .map(memberId => conversations.find(c => c.id === memberId))
                .filter(c => c)
                .filter(member => {
                  const nickname = (member as Conversation).characterSettings?.nickname || (member as Conversation).name;
                  return nickname.toLowerCase().includes(atFilterText.toLowerCase());
                })
                .map(member => {
                  const m = member as Conversation;
                  const nickname = m.characterSettings?.nickname || m.name;
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleSelectAtMember(nickname)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                        {m.characterSettings?.avatar || m.avatar ? (
                          <img
                            src={m.characterSettings?.avatar || m.avatar}
                            alt={nickname}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                            <span className="text-white text-sm font-semibold">
                              {nickname.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-900 text-sm">{nickname}</div>
                        {m.characterSettings?.personality && (
                          <div className="text-xs text-gray-500 truncate">
                            {m.characterSettings.personality.slice(0, 20)}...
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              {(conversation.members || [])
                .map(memberId => conversations.find(c => c.id === memberId))
                .filter(c => c)
                .filter(member => {
                  const nickname = (member as Conversation).characterSettings?.nickname || (member as Conversation).name;
                  return nickname.toLowerCase().includes(atFilterText.toLowerCase());
                }).length === 0 && (
                <div className="text-center py-4 text-gray-400 text-sm">
                  没有匹配的成员
                </div>
              )}
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
            <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2">
              <textarea
                ref={inputRef as any}
                value={currentInput}
                onChange={(e) => {
                  const value = e.target.value;
                  const cursorPos = e.target.selectionStart || 0;
                  setCurrentInput(value);
                  
                  // 检测@输入（仅群聊）
                  if (conversation.type === 'group') {
                    const textBeforeCursor = value.slice(0, cursorPos);
                    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
                    
                    if (lastAtIndex !== -1) {
                      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
                      // 如果@后面没有空格，显示成员列表
                      if (!textAfterAt.includes(' ')) {
                        setShowAtMemberList(true);
                        setAtFilterText(textAfterAt);
                        setAtCursorPosition(lastAtIndex);
                      } else {
                        setShowAtMemberList(false);
                      }
                    } else {
                      setShowAtMemberList(false);
                    }
                  }
                  
                  // 自动调整高度
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onKeyPress={handleKeyPress}
                placeholder={messageBeingEdited ? "编辑消息..." : quotedMessage ? "回复消息..." : isGenerating && conversation.type === 'group' ? "输入消息（将在下轮回复）..." : "输入消息..."}
                className="flex-1 outline-none text-[15px] bg-transparent text-gray-900 placeholder-gray-400 resize-none overflow-y-auto max-h-[120px] min-h-[24px]"
                disabled={false}
                rows={1}
                style={{ height: '24px' }}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!currentInput.trim()}
              className="w-10 h-10 bg-blue-500 text-white rounded-full hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center shadow-md"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* 视频通话弹窗 */}
    <VideoCallModal
      isOpen={showVideoCall}
      onClose={() => setShowVideoCall(false)}
      conversation={conversation}
      currentUserProfile={currentUserProfile}
      apiConfig={apiConfig}
      onSaveCallLog={handleSaveCallLog}
      callType={callType}
    />

    {/* 通话类型选择器 */}
    {showCallTypeSelector && (
      <div className="absolute inset-0 bg-black/50 flex items-end justify-center z-50 animate-fade-in" onClick={() => setShowCallTypeSelector(false)}>
        <div className="bg-white w-full rounded-t-2xl p-4 space-y-2 animate-slide-up" onClick={e => e.stopPropagation()}>
          <div className="text-center text-sm text-gray-500 mb-4">选择通话方式</div>
          <button
            onClick={() => {
              setCallType('video');
              setShowVideoCall(true);
              setShowCallTypeSelector(false);
              setShowToolbar(false);
            }}
            className="w-full py-3.5 bg-white border-b border-gray-100 text-gray-900 text-base font-medium flex items-center justify-center gap-2 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <Video className="w-5 h-5 text-gray-700" />
            视频通话
          </button>
          <button
            onClick={() => {
              setCallType('voice');
              setShowVideoCall(true);
              setShowCallTypeSelector(false);
              setShowToolbar(false);
            }}
            className="w-full py-3.5 bg-white text-gray-900 text-base font-medium flex items-center justify-center gap-2 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <Phone className="w-5 h-5 text-gray-700" />
            语音通话
          </button>
          <div className="h-2 bg-gray-100 -mx-4"></div>
          <button
            onClick={() => setShowCallTypeSelector(false)}
            className="w-full py-3.5 bg-white text-gray-900 text-base font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    )}

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
            请填写视频内容的文字描述，以便AI更好地理解视频内容并做出回复。<br/>
            <span className="text-red-500 font-medium">⚠️ 请使用第三人称描述（如"画面中..."、"视频里..."），不要使用"我"。</span>
          </p>
          <textarea
            value={videoDescInput}
            onChange={(e) => setVideoDescInput(e.target.value)}
            placeholder="例如：视频中一个女孩在海边散步，夕阳洒在海面上，海浪轻轻拍打着沙滩"
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

    {/* 语音转文字弹窗（EVE风格） */}
    {showVoiceConfirmModal && (
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
            语音转文字
          </h3>
          <p className="text-sm text-gray-500 mb-4 text-center">
            请输入您想说的内容：
          </p>
          
          {/* 文本输入框 */}
          <textarea
            value={voiceTranscript}
            onChange={(e) => setVoiceTranscript(e.target.value)}
            placeholder="在这里输入语音内容..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm mb-4"
            disabled={isSpeechRecognizing}
          />
          
          {/* 麦克风按钮 */}
          <div className="flex justify-center mb-4">
            {speechRecognitionSupported ? (
              <button
                onClick={() => {
                  if (isSpeechRecognizing) {
                    stopSpeechRecognition();
                  } else {
                    startSpeechRecognition();
                  }
                }}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isSpeechRecognizing 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                    : 'bg-blue-500 hover:bg-blue-600'
                } shadow-lg`}
                title={isSpeechRecognizing ? '停止识别' : '开始语音识别'}
              >
                <Mic className="w-6 h-6 text-white" />
              </button>
            ) : (
              <div className="text-xs text-gray-400 text-center">
                当前浏览器不支持语音识别<br/>
                请手动输入或使用Chrome/Edge
              </div>
            )}
          </div>
          
          {/* 识别状态提示 */}
          {isSpeechRecognizing && (
            <div className="mb-4 text-center">
              <p className="text-sm text-blue-600 animate-pulse">
                🎤 正在监听中...
              </p>
            </div>
          )}
          
          {/* 底部按钮 */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                stopSpeechRecognition();
                setShowVoiceConfirmModal(false);
                setVoiceTranscript('');
                finalTranscriptRef.current = ''; // 🔥 重置已确认的文本
              }}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={() => {
                stopSpeechRecognition();
                if (voiceTranscript.trim()) {
                  // 发送为语音消息（只有转文字，不播放音频，与AI语音样式一致）
                  const voiceMessage: Message = {
                    id: Date.now().toString(),
                    role: 'user',
                    content: '[语音]', // 显示[语音]标识
                    timestamp: Date.now(),
                    mediaType: 'voice',
                    mediaDescription: voiceTranscript.trim(), // 转写文字
                    voiceDuration: 3, // 默认3秒
                    isMediaDescriptionOnly: true // 🔥 只有描述文字，不需要播放音频
                  };
                  
                  onUpdateConversation(conversation.id, {
                    messages: [...conversation.messages, voiceMessage],
                    lastMessageTime: Date.now()
                  });
                  
                  setShowVoiceConfirmModal(false);
                  setVoiceTranscript('');
                  finalTranscriptRef.current = ''; // 🔥 重置已确认的文本
                }
              }}
              disabled={!voiceTranscript.trim()}
              className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    )}

    {/* 消息操作菜单 */}
    <MessageActionMenu
      isVisible={selectedMessageId !== null}
      position={menuPosition}
      onQuote={handleQuoteMessage}
      onEdit={handleEditMessage}
      onDelete={handleDeleteMessage}
      onMultiSelect={handleEnterMultiSelect}
      onForward={handleForwardSingleMessage}
      onReact={handleReactMessage}
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
              content: '', // 用户发送红包时不显示文本，只显示红包卡片
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

    {/* 群红包弹窗 */}
    {conversation.type === 'group' && showGroupRedPacketModal && (
      <GroupRedPacketModal
        isOpen={showGroupRedPacketModal}
        onClose={() => setShowGroupRedPacketModal(false)}
        onSend={(redPacket, message) => {
          // 检查余额
          const balance = getBalance();
          if (balance < redPacket.totalAmount) {
            alert('余额不足，请先充值');
            return;
          }

          // 发送群红包
          const success = sendMoney(redPacket.totalAmount, 'groupRedPacket', conversation.id, message);
          if (success) {
            const newMessage: Message = {
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              role: 'user',
              content: '',
              timestamp: Date.now(),
              moneyTransfer: {
                type: 'groupRedPacket',
                amount: redPacket.totalAmount,
                message,
                status: 'pending',
                groupRedPacket: redPacket,
              }
            };

            onUpdateConversation(conversation.id, {
              messages: [...conversation.messages, newMessage],
              lastMessageTime: Date.now()
            });

            setShowToolbar(false);
            setShowGroupRedPacketModal(false);
            
            // 🎁 AI智能领取群红包（异步处理）
            setTimeout(async () => {
              // 重新获取最新的对话数据，确保红包消息已添加
              const updatedConv = conversations.find(c => c.id === conversation.id);
              if (!updatedConv) return;
              
              const aiMembers = updatedConv.members
                ?.map(mid => conversations.find(c => c.id === mid))
                .filter(c => c && c.type === 'private') as Conversation[];
              
              if (aiMembers && aiMembers.length > 0) {
                try {
                  // 找到刚发送的红包消息
                  const redPacketMsg = updatedConv.messages.find(m => 
                    m.id === newMessage.id && 
                    m.moneyTransfer?.type === 'groupRedPacket'
                  );
                  
                  if (!redPacketMsg) {
                    console.error('未找到红包消息');
                    return;
                  }
                  
                  await handleAIGroupRedPacketClaiming(
                    redPacketMsg,
                    aiMembers,
                    updatedConv,
                    updatedConv.messages,
                    apiConfig,
                    (_aiId, aiName, amount) => {
                      // AI领取成功，更新红包消息和添加提示
                      console.log(`🎁 ${aiName} 领取了 ¥${amount.toFixed(2)}`);
                      
                      const currentConv = conversations.find(c => c.id === conversation.id);
                      if (currentConv) {
                        // 更新红包消息本身
                        const updatedMessages = currentConv.messages.map(m => {
                          if (m.id === newMessage.id && m.moneyTransfer?.groupRedPacket) {
                            const redPacket = m.moneyTransfer.groupRedPacket;
                            // 🐛 修复：创建红包对象的深拷贝，触发React更新
                            return {
                              ...m,
                              moneyTransfer: {
                                ...m.moneyTransfer,
                                groupRedPacket: {
                                  ...redPacket,
                                  // 🎯 关键：深拷贝claimedBy数组，确保React检测到变化
                                  claimedBy: [...redPacket.claimedBy],
                                  remainingCount: redPacket.remainingCount,
                                  remainingAmount: redPacket.remainingAmount,
                                  status: redPacket.status
                                }
                              }
                            };
                          }
                          return m;
                        });
                        
                        // 添加醒目的领取提示消息（类似私聊红包样式）
                        const claimMessage: Message = {
                          id: `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                          role: 'system',
                          content: `${aiName} 领取了你的红包`,
                          timestamp: Date.now(),
                          // 添加自定义样式标记
                          moneyTransfer: {
                            type: 'redPacket',
                            amount: amount,
                            status: 'received',
                            isClaimNotification: true,
                            claimerName: aiName
                          } as any
                        };
                        
                        onUpdateConversation(conversation.id, {
                          messages: [...updatedMessages, claimMessage]
                        });
                      }
                    }
                  );
                } catch (error) {
                  console.error('AI领取红包失败:', error);
                }
              }
            }, 2000); // 延迟2秒后开始处理
          } else {
            alert('发送失败');
          }
        }}
        groupMembers={conversation.members?.map(mid => {
          const member = conversations.find(c => c.id === mid);
          return {
            id: mid,
            name: member?.characterSettings?.nickname || member?.name || '未知'
          };
        }) || []}
        currentUserId="user"
        currentUserName={userProfile?.name || '你'}
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
        conversations={conversations}
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

    {/* Word 风格文档查看器 */}
    {viewingDocument && (
      <WordStyleDocumentModal
        document={viewingDocument}
        author={conversation.characterSettings?.nickname || conversation.name}
        authorAvatar={conversation.characterSettings?.avatar || conversation.avatar}
        timestamp={Date.now()}
        onClose={() => setViewingDocument(null)}
        onSave={() => {
          // 弹出输入框让用户自定义名称
          const customTitle = prompt(
            '请输入文档名称：',
            viewingDocument.title
          );
          
          if (customTitle === null) return; // 用户取消
          
          const finalTitle = customTitle.trim() || viewingDocument.title;
          
          try {
            saveToLibrary(viewingDocument, conversation.id, finalTitle);
            showToast(`✅ 文档已保存：${finalTitle}`, 'success');
            setViewingDocument(null);
          } catch (error) {
            showToast('❌ 保存失败', 'error');
          }
        }}
        onForward={() => {
          setForwardingDocument(viewingDocument);
          setViewingDocument(null);
          setShowSelectContact(true);
        }}
      />
    )}

    {/* 小红书链接详情模态框（AI 生成的小红书卡片点击后打开） */}
    {viewingXiaohongshuLink && (
      <XiaohongshuLinkModal
        data={viewingXiaohongshuLink}
        onClose={() => setViewingXiaohongshuLink(null)}
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

    {/* 聊天记录搜索模态框 */}
    {showSearchModal && (
      <ChatSearchModal
        conversation={conversation}
        onClose={() => setShowSearchModal(false)}
        onMessageClick={(messageId) => {
          console.log(`🔍 点击搜索结果，准备跳转到消息: ${messageId}`);
          
          // 先关闭搜索模态框
          setShowSearchModal(false);
          
          // 找到目标消息在完整消息列表中的位置
          const messageIndex = conversation.messages.findIndex(msg => msg.id === messageId);
          if (messageIndex === -1) {
            console.warn(`未找到目标消息: ${messageId}`);
            return;
          }
          
          console.log(`📍 目标消息索引: ${messageIndex}/${conversation.messages.length}`);
          
          // 🎯 智能消息窗口定位：只显示目标消息及其上下文
          const totalMessages = conversation.messages.length;
          const contextSize = 100; // 上下文窗口大小（目标消息前后各50条）
          
          console.log(`🎯 使用消息窗口策略：目标消息索引 ${messageIndex}，上下文窗口 ${contextSize} 条`);
          
          // 计算窗口位置：以目标消息为中心
          const halfContext = Math.floor(contextSize / 2);
          let windowStartIndex = Math.max(0, messageIndex - halfContext);
          let windowSize = Math.min(contextSize, totalMessages - windowStartIndex);
          
          // 如果窗口太小（接近末尾），调整起始位置
          if (windowSize < contextSize && windowStartIndex > 0) {
            windowStartIndex = Math.max(0, totalMessages - contextSize);
            windowSize = totalMessages - windowStartIndex;
          }
          
          console.log(`📊 消息窗口：从索引 ${windowStartIndex} 开始，显示 ${windowSize} 条消息`);
          console.log(`💡 资源节约：原本需要显示 ${totalMessages} 条，现在只显示 ${windowSize} 条`);
          
          // 更新消息窗口
          setMessageWindow({
            startIndex: windowStartIndex,
            size: windowSize
          });
          
          // 等待DOM更新后进行滚动和高亮
          setTimeout(() => {
            const messageElement = document.getElementById(`message-${messageId}`);
            if (messageElement) {
              console.log('✅ 找到消息元素，开始滚动和高亮');
              
              // 滚动到指定消息（居中显示）
              messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              
              // 高亮显示该消息
              setTimeout(() => {
                messageElement.style.backgroundColor = '#fef3c7'; // 黄色背景
                messageElement.style.transition = 'background-color 0.3s';
                
                // 2秒后移除高亮
                setTimeout(() => {
                  messageElement.style.backgroundColor = '';
                }, 2000);
              }, 300);
              
              // 标记用户不在底部（因为跳转到了历史消息）
              setShouldScrollToBottom(false);
              setIsUserScrolling(true);
              
              console.log('🎯 搜索跳转完成');
            } else {
              console.warn(`❌ 消息加载后仍未找到DOM元素: message-${messageId}`);
            }
          }, 200); // 增加等待时间确保DOM更新
        }}
      />
    )}

    {/* 💬 子聊天管理器 */}
    {showSubChatManager && (
      <SubChatManager
        subChats={conversation.subChats || []}
        onClose={() => setShowSubChatManager(false)}
        onSelectSubChat={handleSelectSubChat}
        onCreateSubChat={handleCreateUserSubChat}
        onRenameSubChat={handleRenameSubChat}
        onDeleteSubChat={handleDeleteSubChat}
        onImportSubChat={handleImportSubChat}
      />
    )}

    {/* 🤖 AI子聊天建议弹窗 */}
    {showSubChatSuggestionModal && subChatSuggestion && (
      <SubChatSuggestionModal
        suggestion={subChatSuggestion}
        onAccept={handleAcceptSubChatSuggestion}
        onReject={handleRejectSubChatSuggestion}
        characterName={conversation.characterSettings?.nickname || conversation.name}
      />
    )}

    {/* 💬 子聊天窗口 */}
    {activeSubChatId && (
      (() => {
        const subChat = (conversation.subChats || []).find(
          sc => sc.id === activeSubChatId
        );
        
        if (!subChat) return null;
        
        return (
          <SubChatWindow
            subChat={subChat}
            conversation={conversation}
            apiConfig={apiConfig}
            onClose={() => handleCloseSubChat(activeSubChatId)}
            onMinimize={() => handleToggleMinimizeSubChat(activeSubChatId)}
            onSendMessage={handleSendSubChatMessage}
            onUpdateSubChat={(subChatId, updates) => {
              const updatedConversation = updateSubChatInConversation(
                conversation,
                subChatId,
                updates
              );
              onUpdateConversation(conversation.id, {
                subChats: updatedConversation.subChats,
              });
            }}
            isMinimized={minimizedSubChats.has(activeSubChatId)}
            conversations={conversations}
            onUpdateConversation={onUpdateConversation}
            currentUserProfile={currentUserProfile}
          />
        );
      })()
    )}

    {/* 💬 最小化的子聊天列表 */}
    {conversation.subChats?.map((subChat) => {
      if (
        !minimizedSubChats.has(subChat.id) ||
        activeSubChatId !== subChat.id
      )
        return null;
      
      return (
        <SubChatWindow
          key={subChat.id}
          subChat={subChat}
          conversation={conversation}
          apiConfig={apiConfig}
          onClose={() => handleCloseSubChat(subChat.id)}
          onMinimize={() => handleToggleMinimizeSubChat(subChat.id)}
          onSendMessage={handleSendSubChatMessage}
          onUpdateSubChat={(subChatId, updates) => {
            const updatedConversation = updateSubChatInConversation(
              conversation,
              subChatId,
              updates
            );
            onUpdateConversation(conversation.id, {
              subChats: updatedConversation.subChats,
            });
          }}
          isMinimized={true}
        />
      );
    })}

    {/* 📤 消息多选工具栏 */}
    {isMultiSelectMode && (
      <MessageSelectionToolbar
        selectedCount={selectedMessages.length}
        onCancel={handleCancelMultiSelect}
        onExtractDocument={handleExtractToDocument}
        onForward={handleForwardMessages}
        onDelete={handleBatchDelete}
      />
    )}

    {/* 📤 转发目标选择器 */}
    {showForwardSelector && conversations && (
      <ForwardTargetSelector
        conversations={conversations}
        onConfirm={handleConfirmForward}
        onCancel={() => {
          setShowForwardSelector(false);
          setForwardingMessages([]);
        }}
        defaultMerge={forwardingMessages.length > 1}
      />
    )}

    {/* 📤 合并转发查看器 */}
    {viewingMergedForward && (
      <MergedForwardViewer
        forwardedMessage={viewingMergedForward}
        onClose={() => setViewingMergedForward(null)}
      />
    )}

    {/* 📄 聊天记录提取预览 */}
    {showExtractPreview && extractingMessages.length > 0 && (
      <ChatExtractPreview
        messages={extractingMessages}
        conversationName={conversation.characterSettings?.nickname || conversation.name}
        userName={currentUserProfile?.username || '我'}
        onSave={handleSaveExtractedDocument}
        onCancel={() => {
          setShowExtractPreview(false);
          setExtractingMessages([]);
        }}
      />
    )}

    {/* 🎵 音乐分享弹窗 */}
    <MusicShareModal
      isOpen={showMusicShareModal}
      onClose={() => setShowMusicShareModal(false)}
      onShareMusic={handleMusicShare}
      characterName={conversation.characterSettings?.nickname || conversation.name}
    />

    {/* 🎵 真实音乐搜索弹窗 */}
    <RealMusicSearchModal
      isOpen={showRealMusicModal}
      onClose={() => setShowRealMusicModal(false)}
      onSelectMusic={handleRealMusicShare}
      characterName={conversation.characterSettings?.nickname || conversation.name}
    />

    {/* 🎵 音乐播放状态显示 */}
    {currentMusic && musicPlaybackState && (
      <div className="fixed top-20 left-4 right-4 z-40">
        <MusicPlayingWidget
          musicInfo={currentMusic}
          playbackState={musicPlaybackState}
          characterName={conversation.characterSettings?.nickname || conversation.name}
          onStop={() => {
            aiListeningSimulator.stopListening();
            setCurrentMusic(null);
            setMusicPlaybackState(null);
          }}
        />
      </div>
    )}

    {/* 👥 群聊设置弹窗 */}
    {showGroupSettings && conversation.type === 'group' && (
      <GroupChatSettingsModal
        conversation={conversation}
        conversations={conversations}
        onClose={() => setShowGroupSettings(false)}
        onUpdateConversation={onUpdateConversation}
        onDeleteConversation={(conversationId) => {
          // 先关闭设置弹窗
          setShowGroupSettings(false);
          // 删除群聊（通过向上传递，由App.tsx的deleteConversation处理）
          if (onDeleteConversation) {
            onDeleteConversation(conversationId);
          }
          // 返回社交页面
          onBack();
        }}
      />
    )}

    {/* 📚 世界书挂载设置弹窗 */}
    {showWorldbookMount && (
      <WorldbookMountSettings
        currentConfig={conversation.worldbookMount}
        onSave={(config: WorldbookMountConfig) => {
          onUpdateConversation(conversation.id, {
            worldbookMount: config
          });
          setShowWorldbookMount(false);
        }}
        onClose={() => setShowWorldbookMount(false)}
      />
    )}

    {/* 头像操作菜单弹窗 */}
    {avatarMenuOpen && (
      <div 
        className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center"
        onClick={() => setAvatarMenuOpen(null)}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl overflow-hidden w-72 animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头像和昵称 */}
          <div className="flex flex-col items-center py-6 bg-gradient-to-b from-blue-50 to-white">
            {avatarMenuOpen.avatar ? (
              <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-lg mb-3">
                <img src={avatarMenuOpen.avatar} alt={avatarMenuOpen.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center border-4 border-white shadow-lg mb-3">
                <span className="text-white font-bold text-2xl">{avatarMenuOpen.name.charAt(0)}</span>
              </div>
            )}
            <div className="text-lg font-semibold text-gray-800">{avatarMenuOpen.name}</div>
          </div>

          {/* 操作选项 */}
          <div className="divide-y divide-gray-100">
            <button
              onClick={() => handleSendMessageAction(avatarMenuOpen.name)}
              className="w-full py-4 px-6 text-left hover:bg-blue-50 transition-colors flex items-center gap-3"
            >
              <MessageCircle className="w-5 h-5 text-blue-500" />
              <span className="text-gray-700 font-medium">发消息</span>
            </button>
            
            <button
              onClick={() => handlePatAction(avatarMenuOpen.messageId, avatarMenuOpen.name)}
              className="w-full py-4 px-6 text-left hover:bg-purple-50 transition-colors flex items-center gap-3"
            >
              <span className="text-2xl">👋</span>
              <span className="text-gray-700 font-medium">拍一拍</span>
            </button>
            
            <button
              onClick={() => handleAtAction(avatarMenuOpen.name)}
              className="w-full py-4 px-6 text-left hover:bg-green-50 transition-colors flex items-center gap-3"
            >
              <span className="text-xl font-bold text-green-600">@</span>
              <span className="text-gray-700 font-medium">@对方</span>
            </button>
          </div>
        </div>
      </div>
    )}

    {/* 表情包类型选择菜单 */}
    {showStickerTypeMenu && (
      <>
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setShowStickerTypeMenu(false)}
        />
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl z-50 w-[90%] max-w-sm overflow-hidden animate-slide-up">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 text-center">选择表情包类型</h3>
          </div>
          <div className="divide-y divide-gray-100">
            <button
              onClick={() => {
                setShowStickerTypeMenu(false);
                setShowUserStickerPicker(true);
              }}
              className="w-full px-4 py-4 hover:bg-gray-50 transition-colors flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Smile className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-gray-900">真实表情包</div>
                <div className="text-xs text-gray-500 mt-0.5">从表情包库中选择已上传的表情包</div>
              </div>
            </button>
            <button
              onClick={() => {
                setShowStickerTypeMenu(false);
                setShowStickerModal(true);
              }}
              className="w-full px-4 py-4 hover:bg-gray-50 transition-colors flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-gray-900">文字描述表情包</div>
                <div className="text-xs text-gray-500 mt-0.5">输入表情包的文字描述</div>
              </div>
            </button>
          </div>
        </div>
      </>
    )}

    {/* 用户表情包选择器 */}
    {showUserStickerPicker && (
      <UserStickerPicker
        onClose={() => setShowUserStickerPicker(false)}
        onSelectSticker={handleSelectSticker}
      />
    )}
    </>
  );
}
