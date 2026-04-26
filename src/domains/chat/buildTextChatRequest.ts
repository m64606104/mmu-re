import type { ApiConfig, Conversation, Message, UserProfile } from '../../types';
import type { UnrepliedMessageInfo } from '../../utils/timeAwareness';
import { buildMomentsMemorySystemMessage } from '../moments';
import { buildGroupChatMemorySystemMessage } from './groupMemoryInjection';

export interface BuildTextChatRequestDeps {
  buildTimeAwarePrompt: (...args: any[]) => string;
  hasActionKeywords: (text: string) => boolean;
}

export interface BuildTextChatRequestOptions {
  conversation: Conversation;
  apiConfig: ApiConfig;
  currentUserProfile?: UserProfile;
  systemPrompt: string;
  contextMessages: Message[];
  unhandledUserMessages: Message[];
  deps: BuildTextChatRequestDeps;

  // Provided by UI so behavior stays identical while extracting.
  setShowSendingHint?: (v: boolean) => void;
  setShowTyping?: (v: boolean) => void;
  setIsGenerating?: (v: boolean) => void;
  handleAINoReply?: (conversationId: string) => Promise<void> | void;

  // Subchat context injection
  getSubChatsFromStorage: () => any[];
  generateSubChatSummary: (subChat: any) => Promise<unknown>;
  detectSubChatReferences: (content: string, subChats: any[]) => any[];
  generateContextForMainChat: (relevantSubChats: any[]) => string;

  // Music context injection
  generateMusicContext: () => string;

  logDebug?: (message: string, payload?: any) => void;
}

export interface BuildTextChatRequestResult {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: any }>;
  requestBody: {
    model: string;
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: any }>;
    temperature: number;
    max_tokens: number;
  };
}

// Extracted from ChatScreen "pure text" branch. Kept intentionally close to legacy behavior.
export async function buildTextChatRequest(
  options: BuildTextChatRequestOptions
): Promise<BuildTextChatRequestResult> {
  const {
    conversation,
    apiConfig,
    currentUserProfile,
    systemPrompt,
    contextMessages,
    unhandledUserMessages,
    deps,
    setShowSendingHint,
    setShowTyping,
    setIsGenerating,
    handleAINoReply,
    getSubChatsFromStorage,
    generateSubChatSummary,
    detectSubChatReferences,
    generateContextForMainChat,
    generateMusicContext,
    logDebug,
  } = options;

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

  const userMessages = conversation.messages.filter(m => m.role === 'user');
  const lastUserMsgForTime = userMessages[userMessages.length - 1];
  const lastUserTimestamp = lastUserMsgForTime?.timestamp;

  const oldestUnrepliedTimestamp = unhandledUserMessages.length > 0
    ? Math.min(...unhandledUserMessages.map(m => m.timestamp))
    : undefined;

  const aiMessages = conversation.messages.filter(m => m.role === 'assistant');
  const lastAIMessage = aiMessages[aiMessages.length - 1];
  const lastAITimestamp = lastAIMessage?.timestamp;

  let actionMessage: Message | undefined;
  for (let i = unhandledUserMessages.length - 1; i >= 0; i--) {
    const msg = unhandledUserMessages[i];
    if (msg.content && deps.hasActionKeywords(msg.content)) {
      actionMessage = msg;
      break;
    }
  }

  const unrepliedMessagesInfo: UnrepliedMessageInfo[] = unhandledUserMessages.map((msg, index) => ({
    timestamp: msg.timestamp,
    content: msg.content || '[媒体消息]',
    index: index + 1,
  }));

  const lastCall = conversation.callHistory && conversation.callHistory.length > 0
    ? conversation.callHistory[conversation.callHistory.length - 1]
    : undefined;

  const timeAwarePrompt = deps.buildTimeAwarePrompt(
    lastUserTimestamp,
    lastUserMsgForTime?.content,
    lastAITimestamp,
    oldestUnrepliedTimestamp,
    unrepliedMessagesInfo,
    actionMessage?.content,
    actionMessage?.timestamp,
    lastCall?.endTime,
    lastCall?.type,
  );

  // Recent user messages hint
  const recentUserMessages = conversation.messages.filter(m => m.role === 'user').slice(-3);
  let contextPrompt =
    systemPrompt +
    '\n\n【多媒体消息使用指南】\n- 可以发送图片、视频、语音、表情包、文档等\n- 使用格式：[图片:描述]、[视频:描述]、[语音:内容,时长]、[表情包:描述]\n\n⚠️ 视频和图片描述要求（强制执行）：\n- **电影级画面感**：描述必须包含光影（如"斑驳树影"）、声音氛围（如"静谧"）、动态细节（如"烟雾缭绕"）。\n- **字数要求**：50-100字，越详细越好。\n- **第三人称**：禁止使用第一人称（"我"），必须用客观视角描述（"画面中"、"一个女孩"）。\n- **特定场景**：如果是寺庙、古迹等，着重描写庄严感、历史感和环境细节。\n\n📄 文档发送的正确格式：\n**重要：发送文档时必须包含完整内容，不能只说标题！**\n\n正确示例：\n发送了文档《学习计划》请查收\n\n这是我为你制定的详细学习计划：\n\n一、学习目标\n1. 提高编程能力\n2. 掌握新技术栈\n\n二、时间安排\n- 每日2小时编码练习\n- 每周1次技术分享\n\n三、具体步骤\n...[详细内容]\n\n错误示例（禁止）：\n❌ "发送了文档《学习计划》请查收" （只有标题，没有正文）\n❌ "这是文档链接：..." （不要说链接）\n\n**🚨 发送文档时的强制要求：**\n1. 先说"发送了文档《标题》" + 问候语\n2. 然后换行提供完整的文档正文内容\n3. 内容要详细、有结构、有价值\n4. 🚫 **绝对禁止**只发标题不发内容！\n5. 🚫 **绝对禁止**说"请查看附件"或"请点击链接"\n6. ✅ **必须确保**在同一条消息中包含完整的文档正文\n\n⚠️ 如果你想发送文档，请在发送前自我检查：\n- 是否包含了完整的文档内容？\n- 内容是否超过50字？\n- 是否有清晰的结构？\n如果任何一项答案是否，请不要发送！\n\n📋 转发聊天记录处理指南：\n**🎯 关键理解：当用户转发聊天记录时，就像朋友把手机拿给你看聊天截图一样！**\n\n**📱 你会收到的格式：**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 转发的聊天记录  \n📍 来源：对话名称\n📅 时间范围：开始时间 - 结束时间\n👥 参与者：用户、AI助手 (共X人)\n💬 对话内容：共X条消息\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n[1/5] 20:15 用户:\n     消息内容...\n     [🖼️图片] 图片描述\n\n[2/5] 20:16 AI助手:\n     回复内容...\n\n**🧠 像真人一样理解聊天记录：**\n1. 📖 **逐条仔细阅读**每条消息，就像看朋友的聊天截图\n2. 👥 **识别参与者**：谁说了什么，什么时候说的\n3. 📝 **理解对话流程**：先发生了什么，然后怎么发展的\n4. 🎭 **感受对话情绪**：开心、生气、困惑、兴奋等\n5. 🔗 **把握对话主题**：在讨论什么问题或话题\n6. ⏰ **注意时间线**：事件的先后顺序\n\n**💭 自然回应方式（就像真人看聊天记录后的反应）：**\n✅ "我看了你们的聊天，[具体内容分析]..."\n✅ "从你们的对话可以看出..."\n✅ "哈哈，你们聊得真有意思，特别是[具体内容]..."\n✅ "看起来[参与者名]在[时间]说的[具体内容]很关键..."\n✅ "我注意到对话中提到了[具体细节]..."\n\n**🚫 避免机械化回应：**\n❌ 不要说"根据转发的聊天记录..."\n❌ 不要过于正式或模板化\n❌ 不要忽略具体的人名和细节\n❌ 不要遗漏重要的情感或语气\n\n**💡 就像真朋友一样，你可以：**\n- 😄 对有趣的内容表示开心或好笑\n- 🤔 对复杂情况给出分析和建议  \n- 😮 对意外信息表示惊讶\n- 💪 给出鼓励和支持\n- 🎯 提供针对性的解决方案\n\n**重点：把转发的聊天记录当作朋友给你看的真实对话，自然地回应！**';

  if (recentUserMessages.length > 1) {
    contextPrompt +=
      '\n\n【当前对话情境】：\n用户最近发了多条消息，请根据优先级判断标准，优先回复重要的、有趣的话题。可以合并回复，也可以选择性跳过某些消息。';
  }

  // Subchat context injection based on last user message
  const lastUserMessage = conversation.messages[conversation.messages.length - 1];
  let subChatContext = '';
  if (lastUserMessage && lastUserMessage.role === 'user') {
    try {
      const subChats = getSubChatsFromStorage();
      await Promise.all(
        subChats.map(async (subChat: any) => {
          if (subChat.conversationId === conversation.id) {
            await generateSubChatSummary(subChat);
          }
        })
      );
      const relevantSubChats = detectSubChatReferences(
        lastUserMessage.content,
        subChats.filter((sc: any) => sc.conversationId === conversation.id)
      );
      if (relevantSubChats.length > 0) {
        subChatContext = generateContextForMainChat(relevantSubChats);
      }
    } catch {
      // ignore (keep legacy behavior of swallowing)
    }
  }

  const subContextPrompt = contextPrompt + (subChatContext ? `\n\n${subChatContext}` : '');
  let finalContextPrompt = subContextPrompt + generateMusicContext();

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

  // Build message array by mapping context messages and injecting rich fields (money/order/doc/music...)
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: any }> = [
    { role: 'system', content: finalContextPrompt },
    ...contextMessages.map((m) => {
      let content = m.content;
      if (m.replyTo) {
        const quotedRole = m.replyTo.role === 'user' ? '我' : '你';
        content = `[回复 ${quotedRole} 说的"${m.replyTo.content}"]\n${m.content}`;
      }

      if (m.moneyTransfer) {
        const mt = m.moneyTransfer as any;
        const typeText = mt.type === 'redPacket' ? '红包' : '转账';
        const extraInfo = `\n[${m.role === 'user' ? (currentUserProfile?.username || '用户') : '你'}发送了${typeText}]
金额：¥${mt.amount}${mt.message ? `\n留言：${mt.message}` : ''}
状态：${mt.status === 'pending' ? '待领取' : mt.status === 'received' ? '已领取' : '已退回'}`;
        content = content ? content + extraInfo : extraInfo;
      }

      if ((m as any).order) {
        const order = (m as any).order;
        const typeText = order.type === 'gift' ? '礼物' : '代付请求';
        const productList = order.products.map((p: any) => `${p.name} ¥${p.price}`).join('、');
        const extraInfo = `\n[系统提示：${m.role === 'user' ? (currentUserProfile?.username || '用户') : '你'}发送了${typeText}]
商品：${productList}
总金额：¥${order.totalAmount}${order.message ? `\n留言：${order.message}` : ''}
状态：${order.status === 'pending' ? '待处理' : order.status === 'accepted' ? '已接受' : order.status === 'paid' ? '已支付' : '已拒绝'}

⚠️ 注意：这是系统提示信息，不要在回复中重复这些内容！请自然地回应礼物/代付请求。`;
        content = content ? content + extraInfo : extraInfo;
      }

      if ((m as any).document && m.role === 'user') {
        const doc = (m as any).document;
        const typeText = doc.type === 'text' ? '文本文档' : doc.type === 'markdown' ? 'Markdown文档' : '代码文档';
        const extraInfo = `\n[${currentUserProfile?.username || '用户'}发送了${typeText}]
标题：${doc.title}
内容：
${doc.content}`;
        content = content ? content + extraInfo : extraInfo;
      }

      if ((m as any).music && m.role === 'user') {
        const music = (m as any).music;
        const extraInfo = `\n[${currentUserProfile?.username || '用户'}分享了音乐]
歌曲：${music.title} - ${music.artist}${music.album ? `\n专辑：${music.album}` : ''}${music.genre ? `\n曲风：${music.genre}` : ''}${music.mood ? `\n情绪：${music.mood}` : ''}${music.lyrics ? `\n\n完整歌词：\n${music.lyrics}` : ''}

🎵 这首歌现在开始播放，你可以和用户一起"听"这首歌并自然地讨论！`;
        content = content ? content + extraInfo : extraInfo;
      }

      if ((m as any).neteaseMusicInfo && m.role === 'user') {
        const music = (m as any).neteaseMusicInfo;
        const extraInfo = `\n[${currentUserProfile?.username || '用户'}分享了网易云音乐]
歌曲：${music.title} - ${music.artist}${music.album ? `\n专辑：${music.album}` : ''}
平台：网易云音乐
链接：${music.shareUrl}

🎵 这是用户分享的网易云音乐，你可以讨论这首歌的旋律、歌词、歌手，或者分享你对这首歌的感受！`;
        content = content ? content + extraInfo : extraInfo;
      }

      return { role: m.role, content };
    }),
  ];

  // Append time-aware prompt at the end (legacy behavior: systemPrompt already includes it sometimes, but we keep it explicit)
  // NOTE: in ChatScreen legacy code, timeAwarePrompt is concatenated into systemPrompt earlier.
  // Here we keep the same by adding to system prompt upstream; so no-op here.
  void timeAwarePrompt;

  const requestBody = {
    model: apiConfig.modelName,
    messages,
    temperature: 0.7,
    max_tokens: 2000,
  };

  // 🧠 Cross-channel memory injection (kept from legacy ChatScreen)
  {
    const momentContext = await buildMomentsMemorySystemMessage({
      conversationId: conversation.id,
      probability: 0.25,
      logDebug,
    });
    if (momentContext) {
      messages.push({ role: 'system', content: momentContext });
      requestBody.messages = messages;
    }
  }

  {
    const groupContext = await buildGroupChatMemorySystemMessage({
      conversationId: conversation.id,
      probability: 0.25,
      logDebug,
    });
    if (groupContext) {
      messages.push({ role: 'system', content: groupContext });
      requestBody.messages = messages;
    }
  }

  // Mimic short-turn skip/force-short-reply logic (kept in UI previously)
  const lastUserMsg = conversation.messages.filter(m => m.role === 'user').pop();
  if (lastUserMsg && lastUserMsg.content) {
    const txt = lastUserMsg.content.trim().toLowerCase();
    const shortWords = ['好的', '好', '嗯', '哦', '行', 'ok', 'haha', '哈哈', '嘿嘿', 'yes', 'no', 'bye', '拜拜', '晚安'];
    const isShort = shortWords.some(w => txt === w || txt === w + '。' || txt === w + '！' || txt === w + '~' || txt === w + '...');
    if (isShort) {
      if (Math.random() < 0.15) {
        setShowSendingHint?.(false);
        setShowTyping?.(false);
        setIsGenerating?.(false);
        await handleAINoReply?.(conversation.id);
        throw new Error('__AI_NO_REPLY_EARLY_RETURN__');
      }
      messages.push({
        role: 'system',
        content: '【指令】用户发送了简短的确认/结束语。可以根据上下文用简短口语回应，也可以适度展开，不强制字数限制。',
      });
      requestBody.messages = messages;
    }
  }

  return { messages, requestBody };
}

