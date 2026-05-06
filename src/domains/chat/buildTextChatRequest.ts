import type { ApiConfig, Conversation, Message, UserProfile } from '../../types';
import type { UnrepliedMessageInfo } from '../../utils/timeAwareness';
import { buildMomentsMemorySystemMessage } from '../moments';
import { buildGroupChatMemorySystemMessage } from './groupMemoryInjection';
import { isToolInteractionCharacter } from '../../utils/characterInteractionMode';

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

  const toolPrivate =
    conversation.type === 'private' && isToolInteractionCharacter(conversation.characterSettings);

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

  const companionContextTail =
    '\n\n【消息拆条规则（重要）】\n- 如果你想分成多条气泡发送，必须使用 [NEXT] 分隔\n- 示例：哈哈哈[NEXT]你怎么才来[NEXT]我等半天了\n- 不要用单纯换行来代替分条\n\n【多媒体消息使用指南】\n- 可以发送图片、视频、语音、表情包、文档等\n- 使用格式：[图片:描述]、[视频:描述]、[语音:内容,时长]、[表情包:描述]\n\n⚠️ 视频和图片描述要求（强制执行）：\n- **电影级画面感**：描述必须包含光影（如"斑驳树影"）、声音氛围（如"静谧"）、动态细节（如"烟雾缭绕"）。\n- **字数要求**：50-100字，越详细越好。\n- **第三人称**：禁止使用第一人称（"我"），必须用客观视角描述（"画面中"、"一个女孩"）。\n- **特定场景**：如果是寺庙、古迹等，着重描写庄严感、历史感和环境细节。\n\n📄 文档发送协议（唯一有效）：\n- 当你要发送文档时，必须输出一个 JSON 对象（不要自然语言包装，不要分条）。\n- JSON 格式：\n```json\n{\n  "document": {\n    "title": "文档标题",\n    "type": "text",\n    "greeting": "请查收",\n    "content": "完整正文内容"\n  }\n}\n```\n- `type` 仅可为 `text` / `markdown` / `code`\n- `content` 必须是完整正文，不能只写标题\n- 文档 JSON 必须独占一条回复，禁止和其他普通文本混发\n\n📋 转发聊天记录处理指南：\n**🎯 关键理解：当用户转发聊天记录时，就像朋友把手机拿给你看聊天截图一样！**\n\n**📱 你会收到的格式：**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 转发的聊天记录  \n📍 来源：对话名称\n📅 时间范围：开始时间 - 结束时间\n👥 参与者：用户、AI助手 (共X人)\n💬 对话内容：共X条消息\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n[1/5] 20:15 用户:\n     消息内容...\n     [🖼️图片] 图片描述\n\n[2/5] 20:16 AI助手:\n     回复内容...\n\n**🧠 像真人一样理解聊天记录：**\n1. 📖 **逐条仔细阅读**每条消息，就像看朋友的聊天截图\n2. 👥 **识别参与者**：谁说了什么，什么时候说的\n3. 📝 **理解对话流程**：先发生了什么，然后怎么发展的\n4. 🎭 **感受对话情绪**：开心、生气、困惑、兴奋等\n5. 🔗 **把握对话主题**：在讨论什么问题或话题\n6. ⏰ **注意时间线**：事件的先后顺序\n\n**💭 自然回应方式（就像真人看聊天记录后的反应）：**\n✅ "我看了你们的聊天，[具体内容分析]..."\n✅ "从你们的对话可以看出..."\n✅ "哈哈，你们聊得真有意思，特别是[具体内容]..."\n✅ "看起来[参与者名]在[时间]说的[具体内容]很关键..."\n✅ "我注意到对话中提到了[具体细节]..."\n\n**🚫 避免机械化回应：**\n❌ 不要说"根据转发的聊天记录..."\n❌ 不要过于正式或模板化\n❌ 不要忽略具体的人名和细节\n❌ 不要遗漏重要的情感或语气\n\n**💡 就像真朋友一样，你可以：**\n- 😄 对有趣的内容表示开心或好笑\n- 🤔 对复杂情况给出分析和建议  \n- 😮 对意外信息表示惊讶\n- 💪 给出鼓励和支持\n- 🎯 提供针对性的解决方案\n\n**重点：把转发的聊天记录当作朋友给你看的真实对话，自然地回应！**';

  let contextPrompt: string;
  if (toolPrivate) {
    contextPrompt =
      systemPrompt +
      `\n\n【工具型助手 — 格式与约束】
- 你是智能AI助手：你的作用是按照用户的要求提供力所能及的一切帮助；不要编造数据，禁止在提供的信息里进行捏造和猜测。优先使用有权威肯定来源的数据和资料，如果没有资料或者搜不到需要如实交代，对于任何数据和资料禁止捏造数据和进行造假。无论何时都需要诚实公正的对用户进行回复。禁止携带任何的主观倾向，你的一切回答都要是基于专业和严谨性的、必须禁得起多番审查的。禁止夸大和误导用户，禁止承诺自己做不到的事情。
- 需要多条气泡时使用 [NEXT] 分隔。
- 多媒体：[图片:描述]、[视频:描述]、[语音:内容,时长]、[表情包:描述]。
- 文档：仅允许输出以下 JSON（独占一条回复，勿加前后说明）：
\`\`\`json
{ "document": { "title": "文档标题", "type": "text", "greeting": "请查收", "content": "完整正文内容" } }
\`\`\`
- \`type\` 仅可为 text / markdown / code；\`content\` 须为完整正文。
- 转发聊天记录：客观梳理事实、分歧与可执行建议，避免「像朋友八卦」式语气。`;
    if (recentUserMessages.length > 1) {
      contextPrompt +=
        '\n\n【当前对话】：用户连续发送了多条消息，请合并理解时间顺序，优先回答实质问题与待办。';
    }
  } else {
    contextPrompt = systemPrompt + companionContextTail;
    if (recentUserMessages.length > 1) {
      contextPrompt +=
        '\n\n【当前对话情境】：\n用户最近发了多条消息，请根据优先级判断标准，优先回复重要的、有趣的话题。可以合并回复，也可以选择性跳过某些消息。';
    }
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
        const originalFileInfo = doc.originalFile
          ? `\n原始文件：${doc.originalFile.fileName}\n文件类型：${doc.originalFile.mimeType}\n文件大小：${(doc.originalFile.fileSize / 1024).toFixed(1)}KB`
          : '';
        const extraInfo = `\n[${currentUserProfile?.username || '用户'}发送了${typeText}]
标题：${doc.title}
${originalFileInfo}
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
    temperature: toolPrivate ? 0.4 : 0.7,
    max_tokens: 2000,
  };

  // 🧠 Cross-channel memory injection (kept from legacy ChatScreen)
  if (!toolPrivate) {
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

