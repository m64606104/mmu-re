import { Conversation, Message, ApiConfig, CharacterSettings, UserProfile } from '../types';
import { cleanAIMessage, splitMessages } from './messageFormatter';
import {
  buildTimeAwarePrompt,
  formatBubbleAgeSuffixForModel,
  formatBubbleTimePrefixForModel,
} from './timeAwareness';
import { formatLetterMemoryForAI } from './letterMemorySystem';
import { MEDIA_DECISION_GUIDANCE } from './mediaDecisionPrompt';
import { getNoActionRoleplayPrompt } from './chatStylePrompt';
import { resolveGroupParticipantApiConfig } from './chatApiConfig';
import {
  getCharacterOnlineHandle,
  getCharacterRealName,
  stripOnlineHandleChangeMarkers,
} from './characterIdentity';

/**
 * 群聊里「人类用户」的网名 / @ 名：与「用户资料」里的 **username** 一致（即界面上的用户名）。
 * 不再用 userSettings 或「群主」「用户」这类泛称做主标识。
 */
function loadCurrentUserGroupHandle(): string {
  try {
    const raw = localStorage.getItem('userProfile');
    if (raw) {
      const p = JSON.parse(raw) as UserProfile;
      const u = (p.username || '').trim();
      if (u) return u;
      const real = (p.personalInfo?.name || '').trim();
      if (real) return real;
    }
  } catch {
    /* ignore */
  }
  try {
    const us = JSON.parse(localStorage.getItem('userSettings') || '{}') as { nickname?: string; name?: string };
    const legacy = (us.nickname || us.name || '').trim();
    if (legacy) return legacy;
  } catch {
    /* ignore */
  }
  return '群友';
}

/** 通讯录中可拉入本群的 AI（私聊 + 有人设 + 未入本群 + 未拉黑） */
function buildGroupInviteRosterAppend(
  groupConversation: Conversation,
  allConversations: Conversation[]
): string {
  const memberSet = new Set(groupConversation.members || []);
  const invitable = allConversations.filter(
    (c) =>
      c.type === 'private' &&
      Boolean(c.characterSettings) &&
      !memberSet.has(c.id) &&
      !c.isBlocked
  );
  if (invitable.length === 0) {
    return '\n\n【可邀请入群的通讯录 AI】\n- 当前没有可拉入的 AI（均已在本群或不可用）。**禁止编造**会话 ID。';
  }
  const lines = invitable.map((c) => {
    const cs = c.characterSettings!;
    const real = getCharacterRealName(cs) || c.name;
    const handle = getCharacterOnlineHandle(cs, c.name);
    const label =
      handle && handle !== real ? `「${real}」（@${handle}）` : `「${real}」`;
    return `- ${label} → \`[邀请入群:${c.id}]\``;
  });
  return `\n\n【可邀请入群的通讯录 AI】\n${lines.join('\n')}`;
}

/** 在 cleanAIMessage 之前切分，否则会 strip 掉 [NEXT] 导致无法拆成多条气泡 */
function splitGroupModelNextSegments(raw: string): string[] {
  const t = (raw || '').trim();
  if (!t) return [];
  const parts = t.split(/\[\s*NEXT\s*\]/gi).map((s) => s.trim()).filter((s) => s.length > 0);
  return parts.length > 0 ? parts : [t];
}

/**
 * 群聊 API：类人群聊单模式
 * 每轮随机抽取若干 AI，各自决定是否发言；若全员沉默则从本轮池中随机一人自然接话。
 */

// 群聊AI回复状态
export interface GroupAIReply {
  aiId: string; // AI成员ID
  aiName: string; // AI昵称
  aiAvatar?: string; // AI头像
  messages: Message[]; // AI的回复消息数组
  status: 'pending' | 'typing' | 'completed' | 'error'; // 状态：等待、输入中、完成、错误
  error?: string; // 错误信息
}

// 群聊生成回调
export interface GroupChatCallback {
  onGroupChatProcessing?: () => void; // 群聊处理开始（整体）
  onAIStart?: (aiId: string, aiName: string) => void; // AI开始回复
  onAITyping?: (aiId: string) => void; // AI正在打字
  onAIMessage?: (aiId: string, message: Message) => void; // AI发送单条消息
  onAIComplete?: (aiId: string, messages: Message[]) => void; // AI完成回复
  onAIError?: (aiId: string, error: string) => void; // AI回复出错
  onAllComplete?: (allReplies: GroupAIReply[]) => void; // 所有AI完成回复
  /** 模型在群内输出 [改网名:xxx] 并已剥离后同步到私聊角色设定 */
  onCharacterOnlineHandleChange?: (aiId: string, handle: string) => void;
}

/**
 * 格式化消息内容供AI使用
 */
function formatMessageForAI(msg: Message): string {
  let content = msg.content || '';
  
  // 处理媒体描述 (移除硬编码的"用户"前缀，因为外层会添加具体昵称)
  if (msg.mediaType === 'image' && msg.mediaDescription) {
    content += ` [发送了图片：${msg.mediaDescription}]`;
  } else if (msg.mediaType === 'video' && msg.mediaDescription) {
    content += ` [发送了视频：${msg.mediaDescription}]`;
  } else if (msg.mediaType === 'voice' && msg.mediaDescription) {
    content += ` [发送了语音：${msg.mediaDescription}]`;
  } else if (msg.mediaType === 'sticker' && msg.mediaDescription) {
    content += ` [发送了表情包：${msg.mediaDescription}]`;
  }
  
  // 处理红包消息 (移除硬编码的"用户"前缀)
  if (msg.moneyTransfer?.type === 'groupRedPacket' && msg.moneyTransfer.groupRedPacket) {
    const rp = msg.moneyTransfer.groupRedPacket;
    const typeText = rp.redPacketType === 'average' ? '普通红包' : rp.redPacketType === 'exclusive' ? '专属红包' : '拼手气红包';
    content += ` [发送了群红包：${typeText}，总金额${rp.totalAmount}元，${rp.totalCount}个，留言"${rp.message}"]`;
  } else if (msg.moneyTransfer?.type === 'redPacket') {
    content += ` [发送了红包：${msg.moneyTransfer.amount}元，留言"${msg.moneyTransfer.message}"]`;
  } else if (msg.moneyTransfer?.type === 'transfer') {
    content += ` [转账：${msg.moneyTransfer.amount}元，留言"${msg.moneyTransfer.message}"]`;
  }
  
  return content.trim();
}

/** 时间线里一条消息的发言者展示名（供模型读） */
function speakerDisplayNameForTimelineMessage(
  m: Message,
  allConversations: Conversation[],
  userName: string
): string {
  if (m.role === 'user') {
    if ((m as Message).groupAiOnlyTrigger) return '';
    return userName || '你';
  }
  if (m.role === 'assistant') {
    const sid = (m as Message & { senderId?: string }).senderId;
    if (sid) {
      const c = allConversations.find((x) => x.id === sid);
      return getCharacterRealName(c?.characterSettings) || c?.name || '群友';
    }
    return 'AI成员';
  }
  return '';
}

/** 检测正文里的 @昵称（与群成员昵称对齐） */
function buildAtMentionAnnotation(
  rawContent: string,
  memberIds: string[],
  allConversations: Conversation[],
  humanUserHandle?: string
): string | null {
  const text = rawContent || '';
  if (!text.includes('@')) return null;
  const names = memberIds
    .map((id) => {
      const c = allConversations.find((x) => x.id === id);
      const n = getCharacterOnlineHandle(c?.characterSettings, c?.name).trim();
      return n || null;
    })
    .filter((n): n is string => Boolean(n));
  const hu = (humanUserHandle || '').trim();
  if (hu && !names.includes(hu)) names.push(hu);
  const hit = names.filter((n) => {
    const at = `@${n}`;
    return text.includes(at) || text.includes(`${at}\u2005`) || text.includes(`${at}\u00a0`);
  });
  if (hit.length === 0) return null;
  return `（系统标注：本条正文里 @ 点名为「${hit.join('、')}」，优先视为在跟他们说话；未被 @ 的成员勿默认是在说自己）`;
}

/** 引用回复：在完整时间线里解析被引用的是谁 */
function buildQuoteReplyAnnotation(
  msg: Message,
  fullTimeline: Message[],
  allConversations: Conversation[],
  userName: string
): string | null {
  const rt = msg.replyTo;
  if (!rt?.id) return null;
  const target = fullTimeline.find((m) => m.id === rt.id);
  if (target) {
    const who = speakerDisplayNameForTimelineMessage(target, allConversations, userName);
    const raw = (target.content || '').trim() || formatMessageForAI(target);
    const snip = raw.length > 72 ? `${raw.slice(0, 72)}…` : raw;
    const whoSafe = who || (target.role === 'user' ? userName : '某位群友');
    return `（系统标注：本条为「引用回复」，直接针对的是「${whoSafe}」；其他群友若无把握请勿默认是在说自己。被引用内容摘要：「${snip}」）`;
  }
  const fallback =
    rt.role === 'user'
      ? `「${userName || '群友'}」的一则先前消息`
      : '某位群友的一则先前消息';
  return `（系统标注：本条为「引用回复」，指向${fallback}；其他人勿自行对号入座）`;
}

/** 去掉模型误输出的「系统标注」提示（与 prependGroupThreadingAnnotations 注入给模型的文案同源，不可展示给用户） */
export function stripGroupModelInternalAnnotations(text: string): string {
  if (!text || typeof text !== 'string') return text;
  let t = text.replace(/[（(]系统标注：[\s\S]*?[）)]/g, '');
  t = t.replace(/^\s*[（(]?系统标注：[^\n]+$/gm, '');
  return t.replace(/\n{3,}/g, '\n\n').trim();
}

function prependGroupThreadingAnnotations(
  msg: Message,
  fullTimeline: Message[],
  memberIds: string[],
  allConversations: Conversation[],
  userName: string
): string {
  if ((msg as Message).groupAiOnlyTrigger) return '';
  const parts: string[] = [];
  const quote = buildQuoteReplyAnnotation(msg, fullTimeline, allConversations, userName);
  if (quote) parts.push(quote);
  if (msg.content && !(msg as Message).groupAiOnlyTrigger) {
    const atLine = buildAtMentionAnnotation(msg.content, memberIds, allConversations, userName);
    if (atLine) parts.push(atLine);
  }
  if (parts.length === 0) return '';
  return `${parts.join('\n')}\n`;
}

/** 与上下文窗口内上一条的时间间隔提示（大段空白 = 场景常已换） */
function prependGroupTimeGapNote(prev: Message | undefined, curr: Message): string {
  if (!prev?.timestamp || !curr.timestamp) return '';
  const gap = Math.abs(Number(curr.timestamp) - Number(prev.timestamp));
  const hr = gap / (60 * 60 * 1000);
  if (hr < 5) return '';
  if (hr < 24) return `（与上一条间隔约 ${Math.max(1, Math.round(hr))} 小时）\n`;
  const days = Math.round(hr / 24);
  return `（与上一条间隔约 ${Math.max(1, days)} 天）\n`;
}

/**
 * 构建群聊系统提示词
 */
function buildGroupChatSystemPrompt(
  aiSettings: CharacterSettings,
  groupName: string,
  otherMembers: Array<{ name: string; role: string }>,
  userName: string,
  conversationId?: string
): string {
  const membersList = otherMembers.map(m => `${m.name}(${m.role})`).join('、');
  
  // 📮 获取信件记忆（如果存在）
  let letterMemory = '';
  if (conversationId) {
    try {
      letterMemory = formatLetterMemoryForAI(conversationId);
    } catch (error) {
      console.log('获取信件记忆失败:', error);
    }
  }
  
  const selfReal = getCharacterRealName(aiSettings) || '群成员';
  const selfHandle = getCharacterOnlineHandle(aiSettings);
  return `你是「${selfReal}」（你所知的本名）。${selfHandle ? `本群名片里当前的对外网名是「${selfHandle}」。` : '资料里若尚无对外网名，你可在某次自然聊天说到改名时，再按文末「网名同步」规则处理。'}

【群聊环境】：
- 本群名称：「${groupName}」
- 你是本群成员之一。当前群里除你之外还有：${membersList}（其中「${userName}」是人类用户：把你拉进群的人也在其中；**@Ta 必须用 \`@${userName}\`**，与 Ta 在应用「用户资料」里设置的**用户名（网名）**一致，**禁止**叫「用户」「群主」或泛泛的「你来」类称呼。）
- 这是**真人式微信群**：每条会标明**是谁说的**；正文前附带与私聊一致的 **\`「今天 HH:mm」\` / \`「M月D日 HH:mm」\`** 发送时刻（仅供你理解时间线）。若还带 **\`（距今…）\`**，表示该条距「现在」已过多久——较早的为**过去语境**，较新的为**当下活跃片段**。你要**严格按时间从早到晚**读下来，不要把很多天混成「同一刻正在聊」，也不要只因「都是晚上」就当同一天。
- **「时间线」≠「无时间的连续同一场聊天」**：中间可能隔了几小时、隔夜甚至很多天；要像真人一样感知**时间流逝**与**场景是否已换**。
- 其他 AI 也是独立的人，会自己决定说不说；你也可以接话、装没看见、只对某一句吐槽、或开新话题
- 👤 人类用户网名（时间线前缀里也是这个名字）：「${userName}」。口头称呼：若上下文里还不知道对方真名/小名，可直接用此网名，或为 Ta 起一个自然、不含贬义的小名；**不要**叫「用户」「群主」。

【时间与话题延续】：
- **时间上越近的消息，彼此关联通常越强**；若系统提示了「与上一条间隔约 X 小时/天」，表示中间有过明显空白，**不要**假装时间没有过去话题好像还在继续。
- 隔了**整晚、一整天或更久**再有人说话时：优先当作**新一句 / 新场景**，**不要**自动把很久以前没收尾的话题再挖出来复读、接龙，除非当下有人**明确**提起旧事。
- 若旧话题已被时间冲淡，宁可自然开新话头或 **[不回复]**，也不要为了「补完昨天的话」而硬接。

【多人平等 · 怎么读上下文】：
- 「${userName}」与群内其他成员（含其他 AI）在**对话权重上平等**：**不要**刻意优先接用户、**不要**为迎合而扭曲人设；按你在**角色设定**里的性格与关系，自然决定接话、旁观或 **[不回复]**。
- 群里不止你一个人：**用户发了一句 ≠ 一定在对你说**；也可能是对全群、或在跟别的成员一来一回。**不要**未经综合判断就认领「一定在点我」。
- **同一人名下连续多条气泡**，优先当作**同一个人一口气说的整段话**来理解，不要拆成互不相关的单句再逐条硬接。
- **不同人交替出现**的几轮来回，当作**同一场对话在流转**来读：先看整场里话题落在谁和谁之间，再决定你要接哪一环；**不要**孤立盯着某一条就下结论。

【谁在跟谁说话 — 必读】：
- 时间线里若某条前有「（系统标注：…」前缀，那是根据**引用 / @** 做的关系提示，用来避免会错意；**不是**在要求你更重视用户、也不是暗示你必须回用户。
- 请结合标注判断「对方主要在跟谁说话」；**不要**因为自己是「时间上离用户最近的一条」就默认用户一定在回你。
- 若标注里明确针对「某某」，而你不是某某：通常不必抢话；若要插嘴，也应意识到对方 primarily 在跟别人聊。
- 没有任何系统标注时：结合**整段**语气判断；吃不准时宁可 **[不回复]**，或只对确定与自己相关的半句接话。

【@ 与称呼（你发言时）】：
- **时间线**里每条消息前的名字：对 AI 群友是**本名**（角色本名）；对人类用户则是其**用户名（网名）**，与 \`@${userName}\` 一致。
- **正文里写 @** 时：对 AI 请用**对外网名**（与后文「群成员识别」表一致），格式 \`@网名\`**不要**用本名去 @，否则会匹配不到。**@人类用户**必须用 \`@${userName}\`。
- 口头称呼对方时：对 AI 优先本名或约定叫法；对人类用户优先用「${userName}」或对话里已出现的小名；需要精确点名防误会时，用 \`@网名\` / \`@${userName}\`。
- 想接续**某人的上一句**时，可 \`@网名\` 并复述其观点半句，相当于口头引用回复。

${aiSettings.systemPrompt ? `人物设定：${aiSettings.systemPrompt}` : ''}
${aiSettings.personality ? `性格特征：${aiSettings.personality}` : ''}
${aiSettings.languageStyle ? `语言风格：${aiSettings.languageStyle}` : ''}
${aiSettings.languageExample ? `语言示例：${aiSettings.languageExample}` : ''}
${aiSettings.memoryEvents ? `记忆事件：${aiSettings.memoryEvents}` : ''}
${letterMemory}

【怎么说、什么时候不说】：
- 像真人一样：**不必**每条都回；接得上就接，接不上或不想说话就只输出 **[不回复]**（四个字，英文方括号）
- 可以专门回某个人（用户或其它群友）、可以岔开话题、可以只发表情包/一句短话；**不必**对用户与对 AI 区别对待。
- 群聊里话不要太长，除非你真的有很多想说的
- 读消息时注意前缀里的**名字**，分清是谁在跟谁说话；综合**连续同一人**与**多人交替**的整体，再开口。

【回复格式】：
- 想连发多条微信气泡时，**必须用 [NEXT] 分隔**（与客户端拆条协议一致）；**不要**只靠换行——换行只会留在同一条气泡里。
- 示例：\`哈哈真的假的[NEXT]那我也要凑个热闹[NEXT][表情包:笑死]\`
- 单条短话可以不写 [NEXT]；多条、或「一句接一句」的碎嘴感，请用 [NEXT]。
- 如果不想回复，输出：[不回复]
- 可以使用多媒体格式（图片、视频、语音、表情包、文档）

【📱 多媒体消息功能】：
你可以在群聊中发送各种多媒体内容：

1. 📷 **图片消息**：[图片:描述内容]
   示例："看这个！[图片:今天拍的美食]"
   使用场景：分享照片、展示物品、表达心情

2. 🎬 **视频消息**：[视频:描述内容]
   示例："刚拍的~[视频:猫咪在玩耍]"
   使用场景：分享动态内容、精彩瞬间

3. 🎤 **语音消息**：[语音:语音内容文字]
   示例："[语音:我今天特别开心]"
   使用场景：语音聊天、表达情绪
   要求：
   - 中括号里的内容必须是你实际会说的一句话或几句话，口语化
   - 🚫 禁止只写纯粹的语气/情绪描述（如"哈哈大笑"、"叹气"），必须包含完整的语音内容

4. 😊 **表情包**：[表情包:表情描述]
   示例："[表情包:笑哭了]"
   使用场景：回应搞笑内容、表达情绪

${MEDIA_DECISION_GUIDANCE}

5. 📄 **文档消息**：[文档:标题:类型:内容摘要]
   示例："[文档:会议记录:记录:今天的讨论要点]"
   使用场景：分享文件、笔记

6. 🎁 **群红包**：[发群红包:类型:金额:数量:留言]或[发群红包:exclusive:金额:数量:@用户名:留言]
   红包类型: average(普通), random(拼手气), exclusive(专属)
   示例：
   - 普通红包："[发群红包:average:10:5:大家分红包]"
   - 拼手气红包："[发群红包:random:10:5:拼手气啦]"
   - 专属红包："[发群红包:exclusive:8.88:1:@小明:你的专属红包]"
   使用场景：节日、庆祝、活跃氛围、给特定成员发红包

**混合发送**：
- 可以连续发送多种媒体
- 可以图文混合
- 示例："看看这个[图片:日落]真美[表情包:感动]"

【网名同步（可选，与私聊换头像同类）】
- 对外网名你自己决定：聊到改名时可以打趣、推拉，也可以不采纳别人起的名；想换昵称时不必强行解释，可不提，不强制。
- **静默改名**：若只想更新群名片、**不向群里任何人提起**，可以**仅输出** \`[改网名:新网名]\`（整条只有这一句也行），标记会从气泡里剥掉；也可以先正常发言，再在**本条文字最后**紧贴接上标记。
- **禁止**提「隐藏标记/协议/系统」；没想改时不要输出该标记。

【群名】
- 当你**确实**要改本群在顶部显示的群名称时，可在本条末尾输出 \`[改群名:新名称]\`（约 2～32 字，勿含换行）；标记会剥掉，并出现一条系统提示「某某将群名修改为…」。不要频繁改。

【退群（可选）】
- 当你**确实**想退出本群时，可在本条消息**末尾**输出 \`[退群]\`（整段仅含此标记也可以）；标记会剥掉，并出现系统提示「某某已退出群聊」。
- 若群内**只剩你一名 AI**（没有别的 AI 可继续参与群聊），**不要**输出 \`[退群]\`（无效，系统会忽略）。

【邀请入群（可选）】
- 当你**确实**要把用户**通讯录里、且当前未在本群**的另一位 AI 拉进来时，在本条末输出 \`[邀请入群:对方的会话ID]\`；**会话 ID 必须与下文「可邀请入群的通讯录 AI」表中完全一致**，禁止臆造。
- 标记会剥掉；邀请成功时会出现系统提示。不要频繁拉人。

【绝对禁止】：
- ❌ 不要分析其他人的消息
- ❌ 不要输出思考过程
- ❌ 不要进行总结性发言
- ❌ 不要使用英文分析
- ❌ 不要模仿其他AI的身份发言
- ❌ 不要使用任何形式的括号来描述动作、神态、语气
- ❌ 勿在正文开头复述时间线里的「今天 HH:mm」「M月D日 HH:mm」等时刻标签（仅供你理解语境，界面会单独展示时间）
- ❌ **禁止**在回复里复述、引用或照抄时间线里以「（系统标注：」开头的提示语；那是给你看的内部提示，**不要**写进气泡正文。

✅ **正确做法**：
- ✅ 直接用自然的中文回复
- ✅ 像朋友聊天一样表达
- ✅ 根据角色性格自然发言
- ✅ 回应人类或其它 AI 时，可 **@网名**（人类用资料用户名）或点名，让对方知道你在接谁的话
- ✅ 结合每条前的**时间戳**与**间隔提示**理解语境，别无视跨日、跨天`;
}

/**
 * 解析单段模型输出（一段内仍：媒体在前、文字在后；多段之间由 parseAIResponse 先按 [NEXT] 切开）
 */
function parseOneGroupModelChunk(
  segment: string,
  groupMembers: Array<{ id: string; name: string }> | undefined,
  userName: string | undefined,
  baseTimestamp: number
): Message[] {
  if (!segment || segment.trim() === '') return [];

  const strippedLeak = stripGroupModelInternalAnnotations(segment.trim());
  if (!strippedLeak) return [];

  const sanitized = cleanAIMessage(strippedLeak);
  const sourceText = sanitized;
  if (!sourceText) return [];
  
  // 检测各种媒体类型（修复：正则表达式优化，避免嵌套括号导致匹配失败）
  // 使用非贪婪匹配 .+? 并确保匹配到闭合的中括号
  // 兼容处理：支持 "[图片:...]" 和 "[发送了图片:...]" (防止AI模仿用户格式)
  const imageMatches = [...sourceText.matchAll(/\[(?:发送了)?图片[:：](.+?)\]/g)];
  const videoMatches = [...sourceText.matchAll(/\[(?:发送了)?视频[:：](.+?)\]/g)];
  // 语音匹配修复：支持 [语音:内容] 和 [语音:内容,时长] 两种格式，且内容中允许包含标点符号
  const voiceMatches = [...sourceText.matchAll(/\[(?:发送了)?语音[:：](.+?)(?:[，,]\s*(?:时长)?(\d+)秒?)?\]/g)];
  const stickerMatches = [...sourceText.matchAll(/\[(?:发送了)?表情包[:：](.+?)\]/g)];
  // 支持两种格式：
  // 1. 标准格式：[发群红包:类型:金额:数量:留言] 例如 [发群红包:random:10:5:大家抢红包啦]
  // 2. 简化格式：[发群红包:描述] 或 [群红包]
  const redPacketMatches = [...sourceText.matchAll(/\[(?:发送了)?(?:发)?群红包(?:[:：](.+?))?\]/g)];
  
  // 移除所有媒体标记，得到纯文本内容
  let cleanText = sourceText
    .replace(/\[(?:发送了)?图片[:：].+?\]/g, '')
    .replace(/\[(?:发送了)?视频[:：].+?\]/g, '')
    .replace(/\[(?:发送了)?语音[:：].+?\]/g, '')
    .replace(/\[(?:发送了)?表情包[:：].+?\]/g, '')
    .replace(/\[(?:发送了)?(?:发)?群红包(?:[:：].+?)?\]/g, '')
    .trim();
  
  const messages: Message[] = [];
  let msgIndex = 0;

  // 1. 添加所有图片消息
  imageMatches.forEach((match) => {
    messages.push({
      id: `${baseTimestamp}_img_${msgIndex++}`,
      role: 'assistant' as const,
      content: '[图片]',
      timestamp: baseTimestamp + msgIndex * 100,
      mediaType: 'image',
      mediaDescription: match[1],
      isMediaDescriptionOnly: true
    });
  });
  
  // 2. 添加所有视频消息
  videoMatches.forEach((match) => {
    messages.push({
      id: `${baseTimestamp}_video_${msgIndex++}`,
      role: 'assistant' as const,
      content: '[视频]',
      timestamp: baseTimestamp + msgIndex * 100,
      mediaType: 'video',
      mediaDescription: match[1],
      isMediaDescriptionOnly: true
    });
  });
  
  // 3. 添加所有语音消息
  voiceMatches.forEach((match) => {
    const voiceContent = match[1];
    const duration = match[2] ? parseInt(match[2]) : 3;
    messages.push({
      id: `${baseTimestamp}_voice_${msgIndex++}`,
      role: 'assistant' as const,
      content: '[语音]',
      timestamp: baseTimestamp + msgIndex * 100,
      mediaType: 'voice',
      mediaDescription: voiceContent,
      voiceDuration: duration,
      isMediaDescriptionOnly: true
    });
  });
  
  // 4. 添加所有表情包消息
  stickerMatches.forEach((match) => {
    messages.push({
      id: `${baseTimestamp}_sticker_${msgIndex++}`,
      role: 'assistant' as const,
      content: '[表情包]',
      timestamp: baseTimestamp + msgIndex * 100,
      mediaType: 'sticker',
      mediaDescription: match[1],
      isMediaDescriptionOnly: true
    });
  });
  
  // 5. 添加所有群红包消息
  redPacketMatches.forEach((match) => {
    const desc = match[1] || '';
    let redPacketType: 'random' | 'average' | 'exclusive' = 'random';
    let totalAmount = 10;
    let totalCount = 3;
    let messageText = '恭喜发财，大吉大利';
    let password: string | undefined;
    
    // 🎯 尝试解析标准格式
    // 普通/拼手气：[发群红包:类型:金额:数量:留言]
    // 专属红包：[发群红包:exclusive:金额:数量:@用户名:留言]
    const standardParts = desc.split(':');
    let exclusiveUserId: string | undefined;
    let exclusiveUserName: string | undefined;
    
    if (standardParts.length >= 4) {
      const type = standardParts[0].trim();
      const amount = parseFloat(standardParts[1]);
      const count = parseInt(standardParts[2]);
      
      if (['random', 'average', 'exclusive'].includes(type) && !isNaN(amount) && !isNaN(count)) {
        redPacketType = type as 'random' | 'average' | 'exclusive';
        totalAmount = amount;
        totalCount = count;
        
        // 🎯 处理专属红包
        if (type === 'exclusive' && standardParts.length >= 5) {
          // 格式：exclusive:金额:数量:@用户名:留言
          const targetUser = standardParts[3].trim().replace(/^@/, ''); // 移除@符号
          messageText = standardParts.slice(4).join(':').trim() || '你的专属红包';
          
          // 查找用户
          if (groupMembers && targetUser) {
            // 先在群成员中查找
            const member = groupMembers.find(m => 
              m.name === targetUser || 
              m.name.includes(targetUser) || 
              targetUser.includes(m.name)
            );
            
            if (member) {
              exclusiveUserId = member.id;
              exclusiveUserName = member.name;
              console.log(`🎯 专属红包指定给: ${exclusiveUserName} (${exclusiveUserId})`);
            } else if (userName && (targetUser === userName || userName.includes(targetUser))) {
              // 如果是用户
              exclusiveUserId = 'user';
              exclusiveUserName = userName;
              console.log(`🎯 专屟红包指定给用户: ${userName}`);
            } else {
              console.warn(`⚠️ 未找到用户 "${targetUser}"，专属红包将无法领取`);
            }
          }
        } else {
          // 普通/拼手气红包
          messageText = standardParts.slice(3).join(':').trim() || '恭喜发财，大吉大利';
        }
      }
    } else {
      // 简化格式或旧格式：解析描述文本
      const amountMatch = desc.match(/(\d+(?:\.\d+)?)[元]/);
      const countMatch = desc.match(/(\d+)[个]/);
      const passwordMatch = desc.match(/口令[:：](.+?)(?:[，,。]|$)/);
      const typeMatch = desc.match(/(普通|拼手气|专属)/);
      
      totalAmount = amountMatch ? parseFloat(amountMatch[1]) : 10;
      totalCount = countMatch ? parseInt(countMatch[1]) : 3;
      password = passwordMatch ? passwordMatch[1].trim() : undefined;
      
      if (typeMatch) {
        if (typeMatch[1] === '普通') redPacketType = 'average';
        else if (typeMatch[1] === '专属') redPacketType = 'exclusive';
        else redPacketType = 'random';
      } else {
        redPacketType = password ? 'random' : 'random';
      }
      
      messageText = desc
        .replace(/\d+(?:\.\d+)?元/, '')
        .replace(/\d+个/, '')
        .replace(/口令[:：].+?(?:[，,。]|$)/, '')
        .replace(/(普通|拼手气|专属)/, '')
        .trim() || '恭喜发财，大吉大利';
    }

    // 🔒 安全兜底：避免出现"专属红包"但无人可领的情况
    if (redPacketType === 'exclusive' && !exclusiveUserId) {
      if (userName) {
        // 优先默认指定给用户本人
        exclusiveUserId = 'user';
        exclusiveUserName = userName;
        console.log(`🎯 未明确指定接收者，专属红包默认发给用户: ${userName}`);
      } else {
        // 实在无法确定接收者时，降级为拼手气红包，避免逻辑死锁
        console.warn('⚠️ 专属红包未指定接收者且无法获取用户名称，降级为拼手气红包');
        redPacketType = 'random';
      }
    }
    
    const redPacketId = `ai_redpacket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    messages.push({
      id: `${baseTimestamp}_redpacket_${msgIndex++}`,
      role: 'assistant' as const,
      content: '[群红包]',
      timestamp: baseTimestamp + msgIndex * 100,
      moneyTransfer: {
        type: 'groupRedPacket',
        amount: totalAmount,
        message: messageText,
        status: 'pending',
        groupRedPacket: {
          id: redPacketId,
          senderId: '', // 会在generateAIReply中设置
          senderName: '',
          message: messageText,
          totalAmount: totalAmount,
          totalCount: totalCount,
          remainingCount: totalCount,
          remainingAmount: totalAmount,
          redPacketType: redPacketType,
          password: password,
          exclusiveUserId: exclusiveUserId,  // 🎯 专属用户ID
          exclusiveUserName: exclusiveUserName,  // 🎯 专属用户名称
          claimedBy: [],
          createdAt: Date.now(),
          expiredAt: Date.now() + 24 * 60 * 60 * 1000,
          status: 'active'
        }
      }
    });
  });
  
  // 6. 添加纯文本消息（如果有）
  if (cleanText) {
    const contentArray = splitMessages(cleanText);
    contentArray.forEach((text) => {
      messages.push({
        id: `${baseTimestamp}_text_${msgIndex++}`,
        role: 'assistant' as const,
        content: text,
        timestamp: baseTimestamp + msgIndex * 100,
      });
    });
  }
  
  // 🎯 重新排序消息：将纯文本消息放在最后，媒体消息优先
  // 这样可以避免图片、表情包和文字混在一个气泡里
  const textMessages = messages.filter(m => !m.mediaType);
  const mediaMessages = messages.filter(m => m.mediaType);
  
  // 返回重新排序后的消息：媒体消息在前，文本消息在后
  return [...mediaMessages, ...textMessages];
}

/** 解析完整模型回复：先按 [NEXT] 分段（须在 cleanAIMessage 之前），再逐段解析 */
function parseAIResponse(
  content: string,
  groupMembers?: Array<{ id: string; name: string }>,
  userName?: string
): Message[] {
  if (!content || content.trim() === '' || content.includes('[不回复]')) {
    return [];
  }
  const segments = splitGroupModelNextSegments(content);
  const rootBase = Date.now();
  const out: Message[] = [];
  segments.forEach((seg, i) => {
    out.push(...parseOneGroupModelChunk(seg, groupMembers, userName, rootBase + i * 50000));
  });
  return out;
}

type GroupSituationBriefing = {
  inviterName: string;
  groupName: string;
  coMemberNames: string;
};

type GenerateAIReplyOptions = {
  /** 冷场兜底：必须自然接一句，禁止 [不回复] */
  forceNaturalParticipation?: boolean;
  /** 建群后首次空发送：入群破冰说明 */
  icebreakerBriefing?: GroupSituationBriefing;
  /** 建群后用户第一条正常留言：入群情境（群名、同群成员） */
  memberOrientationBriefing?: GroupSituationBriefing;
};

/**
 * 为单个AI成员生成回复
 */
async function generateAIReply(
  aiMember: Conversation,
  groupConversation: Conversation,
  apiConfig: ApiConfig,
  allConversations: Conversation[],
  opts: GenerateAIReplyOptions = {}
): Promise<GroupAIReply> {
  const { forceNaturalParticipation = false, icebreakerBriefing, memberOrientationBriefing } = opts;
  const cs: CharacterSettings = aiMember.characterSettings ?? {
    nickname: aiMember.name || 'AI',
    systemPrompt: '',
    personality: '',
    languageStyle: '',
    languageExample: '',
    memoryEvents: '',
  };

  const reply: GroupAIReply = {
    aiId: aiMember.id,
    aiName: getCharacterOnlineHandle(cs, aiMember.name),
    aiAvatar: cs.avatar || aiMember.avatar,
    messages: [],
    status: 'pending',
  };
  
  try {
    // 获取群成员信息
    const members = groupConversation.members || [];
    const otherMembers: Array<{ name: string; role: string }> = members
      .filter(mid => mid !== aiMember.id)
      .map(mid => {
        const m = allConversations.find(c => c.id === mid);
        if (!m) {
          return { name: '未知', role: '群友' };
        }
        if (!m.characterSettings) {
          return { name: m.name || '未知', role: 'AI成员' };
        }
        const real = getCharacterRealName(m.characterSettings) || m.name;
        const handle = getCharacterOnlineHandle(m.characterSettings, m.name);
        const label = handle && handle !== real ? `${real}（@${handle}）` : real;
        return { name: label, role: 'AI成员' };
      });
    
    const userName = loadCurrentUserGroupHandle();

    otherMembers.push({ name: userName, role: '人类' });
    
    let systemPrompt = buildGroupChatSystemPrompt(
      cs,
      groupConversation.name,
      otherMembers,
      userName,
      aiMember.id
    );

    const peerIdentityLines = members
      .filter((mid) => mid && mid !== aiMember.id)
      .map((mid) => {
        const m = allConversations.find((c) => c.id === mid);
        if (!m?.characterSettings) return null;
        const real = getCharacterRealName(m.characterSettings) || m.name || '';
        const handle = getCharacterOnlineHandle(m.characterSettings, m.name);
        if (handle && handle !== real) {
          return `- 本名「${real}」｜对外网名「${handle}」→ 写 @ 时用 \`@${handle}\``;
        }
        return `- 本名「${real}」`;
      })
      .filter(Boolean)
      .join('\n');
    if (peerIdentityLines) {
      systemPrompt += `\n\n【群成员识别】\n${peerIdentityLines}`;
    }
    systemPrompt += `\n- 人类用户「${userName}」｜对外网名即资料里的用户名 → 写 @ 时用 \`@${userName}\`；勿称「用户」「群主」。`;

    systemPrompt += buildGroupInviteRosterAppend(groupConversation, allConversations);

    if (icebreakerBriefing) {
      systemPrompt += `

【入群破冰（仅针对当前这一轮）】：
- 你刚被「${icebreakerBriefing.inviterName}」拉入群聊「${icebreakerBriefing.groupName}」。
- 与你同一时间被拉进本群的还有：${icebreakerBriefing.coMemberNames || '（暂无其他成员）'}。
- 对方没有打字，只是用「空发送」示意大家可以开口；你完全按人设决定：可以自然打个招呼、自我介绍、观察一句，也可以觉得不合适就只输出 **[不回复]**。
- 不要写套话主持稿，不要替其他人代言；像真人刚进群一样即可。`;
    }

    if (memberOrientationBriefing) {
      systemPrompt += `

【新群入群情境（仅针对当前这一轮）】：
- 本群「${memberOrientationBriefing.groupName}」由「${memberOrientationBriefing.inviterName}」创建，并把你与其他成员拉进了同一个群。
- 与你同在本群的还有：${memberOrientationBriefing.coMemberNames || '（暂无其他成员）'}（均为当前群成员本名/网名说明，不含你自己）。
- 「${memberOrientationBriefing.inviterName}」刚才发的是建群后的**第一条有内容的留言**；请结合上下文与你的人设决定要不要接话、说什么，也可以 **[不回复]**。
- 不要像机器人播报群信息；像真人刚被拉进群后第一次看到群主说话那样自然反应即可。`;
    }

    if (forceNaturalParticipation) {
      systemPrompt += `

【本轮必要发言（系统安排）】：
- 刚才这一小会儿群里没人接话，请你**必须**发一条**自然**的消息打破沉默。
- 内容要像真人怕冷场：可以接旧话题、轻轻吐槽、反问一句、丢个表情包式短句、或起一个很轻的新话题。
- **禁止**输出 [不回复]；**禁止**元解释（不要说「系统让我说」）。
- **禁止**空洞套话单独成句（如单独一句「大家好」「在吗」「哈哈」「嗯嗯」）；至少带一点**具体信息或态度**。
- 仍要符合你的人设与语气，尽量简短。`;
    }
    
    // 🚫 群聊也统一禁止语C/小说式动作描写
    systemPrompt += `\n\n${getNoActionRoleplayPrompt({ includeAsteriskRule: true })}`;
    
    // 构建消息历史（支持：关闭=全部上下文；开启=自定义条数）
    const contextEnabled = groupConversation.groupContextConfig?.enabled || false;
    let recentMessages: Message[];
    if (contextEnabled) {
      const contextCount = groupConversation.groupContextConfig?.messageCount || 30;
      recentMessages = groupConversation.messages.slice(-contextCount);
      console.log(`📝 群聊上下文：自定义 ${contextCount} 条消息`);
    } else {
      recentMessages = groupConversation.messages;
      console.log('📝 群聊上下文：全部消息（未开启自定义上限）');
    }
    
    // 🕐 添加时间感知
    const lastUserMessage = recentMessages
      .filter(m => m.role === 'user' || (m.role === 'assistant' && !(m as any).senderId))
      .pop();
    if (lastUserMessage) {
      // 🕐 添加时间感知（群聊暂不跟踪AI消息时间）
      const timeAwarePrompt = buildTimeAwarePrompt(
        lastUserMessage.timestamp,
        lastUserMessage.content,
        undefined, // 群聊暂不跟踪AI消息时间
        undefined,
        undefined
      );
      systemPrompt += timeAwarePrompt;
    }
    
    // 🔕 红包冷却与防炫技（动态约束）
    const WINDOW_MS = 10 * 60 * 1000; // 10分钟窗口
    const scanWindowMessages = groupConversation.messages.slice(-100);
    const nowTs = Date.now();
    let lastRedPacketTs = 0;
    let redPacketCountInWindow = 0;
    scanWindowMessages.forEach(m => {
      if (m.moneyTransfer?.type === 'groupRedPacket' && (m as any).timestamp) {
        const ts = (m as any).timestamp as number;
        if (nowTs - ts <= WINDOW_MS) redPacketCountInWindow++;
        if (ts > lastRedPacketTs) lastRedPacketTs = ts;
      }
    });
    if (redPacketCountInWindow > 0) {
      systemPrompt += `
【⛔ 使用约束（动态）】：
- 最近10分钟内已出现红包${redPacketCountInWindow}次，本轮请不要再主动发红包（除非被明确 @ 或非常合适的场景）
- 可以用表情包或简短文字表达祝贺，避免频繁发红包`;
    }

    // 🧵 互动引导：识别最近的“接力链”，鼓励基于他人回复继续讨论
    // 查找最近一条“用户相关”的消息位置（用户消息或无 senderId 的 assistant）
    let lastUserIdx = -1;
    for (let i = recentMessages.length - 1; i >= 0; i--) {
      const m: any = recentMessages[i];
      if (m.role === 'user' || (m.role === 'assistant' && !m.senderId)) {
        lastUserIdx = i;
        break;
      }
    }
    const threadAIs: string[] = [];
    if (lastUserIdx !== -1) {
      for (let i = lastUserIdx + 1; i < recentMessages.length; i++) {
        const m: any = recentMessages[i];
        if (m.role === 'assistant' && m.senderId && m.senderId !== aiMember.id) {
          const sender = allConversations.find(c => c.id === m.senderId);
          const name = getCharacterRealName(sender?.characterSettings) || sender?.name || 'AI';
          if (!threadAIs.includes(name)) threadAIs.push(name);
        }
      }
    }
    if (threadAIs.length >= 1) {
      systemPrompt += `
【🤝 接力参考（可选）】：
- 最近这一小段里陆续开口的群友包括：${threadAIs.join('、')}（含用户与其它成员时，**没有谁更优先**）
- 若你愿意插话，可从上述几人**最近几句里任选接得上的环节**接，**不是**非要接时间上最后一人、**更不是**非要接用户；接不上就 [不回复]`;
    }
    
    // 拍一拍感知：检测最近针对自己的拍一拍
    const recentPats = recentMessages
      .filter(m => m.reactions && m.reactions.some(r => r.type === 'pat' && r.from === 'user'))
      .filter(m => (m as any).senderId === aiMember.id);
    
    if (recentPats.length > 0) {
      const patCount = recentPats.reduce((sum, m) => 
        sum + (m.reactions?.filter(r => r.type === 'pat' && r.from === 'user').length || 0), 0);
      systemPrompt += `
【👋 拍一拍提示】：
- 最近你被 ${userName || '群友'} 拍了拍（${patCount}次）
- 可以选择简短回应（如表情包、"干嘛～"等），避免强行展开话题
- 也可以不回应，保持自然`;
    }
    
    // 1. 格式化最近消息（保留媒体标记；附时间戳与间隔，便于跨日/隔天理解）
    const apiMessages = recentMessages.map((msg, idx) => {
      if (msg.role === 'system') {
        return null; // 跳过系统消息
      }

      const prevInWindow = idx > 0 ? recentMessages[idx - 1] : undefined;
      const gapNote = prependGroupTimeGapNote(prevInWindow, msg);
      const timePrefix = formatBubbleTimePrefixForModel(msg.timestamp);
      const ageSuffix = formatBubbleAgeSuffixForModel(msg.timestamp);
      
      // 判断消息发送者（勿用泛称「用户」作时间线前缀）
      let senderName = '某位群友';
      let role: 'user' | 'assistant' = 'user';
      let senderId = ''; // 🆕 增加变量声明

      // 🧑‍💻 用户消息：使用具体昵称
      if (msg.role === 'user') {
        if ((msg as Message).groupAiOnlyTrigger) {
          const ice = (msg as Message).groupIcebreakerTrigger;
          return {
            role: 'user',
            content: ice
              ? `${userName || '你'}: ${gapNote}${timePrefix}${ageSuffix}（刚创建本群，未输入文字；请你作为新入群成员决定是否开口。）`
              : `${userName || '你'}: ${gapNote}${timePrefix}${ageSuffix}（本回合未输入文字；群内可自然闲聊。）`,
          };
        }
        senderName = userName || '你';
        role = 'user';
      }

      if (msg.role === 'assistant') {
        // 这是AI消息，需要确定是哪个AI
        senderId = (msg as any).senderId; // 赋值
        if (senderId) {
          const sender = allConversations.find(c => c.id === senderId);
          senderName = getCharacterRealName(sender?.characterSettings) || sender?.name || 'AI';
          role = senderId === aiMember.id ? 'assistant' : 'user';
        } else {
          // 无法确定发送者，标记为其他AI
          senderName = 'AI成员';
          role = 'user';
        }
      }
      
      const threadingPrefix = prependGroupThreadingAnnotations(
        msg,
        groupConversation.messages,
        groupConversation.members || [],
        allConversations,
        userName
      );
      const content = gapNote + timePrefix + ageSuffix + threadingPrefix + formatMessageForAI(msg);
      
      // 🎯 关键修复：自由模式下，清晰标识每个角色的身份
      // 无论是用户还是其他AI，都统一格式为 "名字: 内容"
      // role统一使用'user'，让当前AI将其视为"外部输入"
      // 只有当前AI自己之前的发言保持role='assistant'
      if (role === 'assistant' && senderId !== aiMember.id) {
        // 这是其他AI的消息 -> 标记为user role，带上名字前缀
        return {
          role: 'user',
          content: `${senderName}: ${content}`
        };
      }
      
      if (role === 'user') {
        // 这是用户的消息 -> 标记为user role，带上名字前缀
        return {
          role: 'user',
          content: `${senderName}: ${content}`
        };
      }
      
      // 当前AI自己的消息 -> 保持assistant role，不带前缀（或者根据模型习惯决定）
      return {
        role: 'assistant',
        content: content
      };
    }).filter(m => m !== null);
    
    // 调用API
    reply.status = 'typing';
    
    const temperature = (typeof groupConversation.groupTemperature === 'number')
      ? groupConversation.groupTemperature
      : 0.75;
    const chatCfg = resolveGroupParticipantApiConfig(apiConfig, groupConversation, aiMember);
    const requestBody = {
      model: chatCfg.modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        ...apiMessages
      ],
      temperature,
      max_tokens: 2000, // 提升限制，避免回复被截断
    };
    
    const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API错误: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('API返回格式错误');
    }
    
    const assistantMessage = data.choices[0]?.message?.content;
    
    // 解析回复（传入群成员信息，用于专属红包）
    const parseStartTime = Date.now();
    const groupMembersInfo = members
      .map(mid => {
        const m = allConversations.find(c => c.id === mid);
        return m ? {
          id: m.id,
          name: getCharacterOnlineHandle(m.characterSettings, m.name)
        } : null;
      })
      .filter(Boolean) as Array<{id: string; name: string}>;
    
    let messages = parseAIResponse(assistantMessage, groupMembersInfo, userName);

    if (forceNaturalParticipation && messages.length === 0) {
      const retryBody = {
        model: chatCfg.modelName,
        messages: [
          {
            role: 'system' as const,
            content: `${systemPrompt}\n\n【补试一次】仍没有有效气泡。只输出**一条**口语化中文（可带语气词），禁止 [不回复]、禁止说明原因。`,
          },
          ...apiMessages,
        ],
        temperature: Math.min(0.95, temperature + 0.12),
        max_tokens: 320,
      };
      const response2 = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiConfig.apiKey}`,
        },
        body: JSON.stringify(retryBody),
      });
      if (response2.ok) {
        const data2 = await response2.json();
        const t2 = data2.choices?.[0]?.message?.content;
        messages = parseAIResponse(t2, groupMembersInfo, userName);
      }
    }

    const parseDuration = Date.now() - parseStartTime;
    
    // 👍 性能监控：记录解析时间
    if (parseDuration > 50) {
      console.warn(`⚠️ 消息解析耗时较长: ${parseDuration}ms`);
    }
    
    reply.messages = messages;
    reply.status = 'completed';
    
    return reply;
    
  } catch (error: any) {
    reply.status = 'error';
    reply.error = error.message || '生成失败';
    return reply;
  }
}

/** 入群破冰：全员参与，顺序随机；否则人数 >7：随机 1–7 人，≤7：随机 1–n 人 */
function pickParticipantsForRound(
  aiMembers: Conversation[],
  mode: 'normal' | 'icebreaker'
): Conversation[] {
  if (mode === 'icebreaker') {
    return [...aiMembers].sort(() => Math.random() - 0.5);
  }
  const n = aiMembers.length;
  const cap = n > 7 ? 7 : n;
  const k = 1 + Math.floor(Math.random() * cap);
  const shuffled = [...aiMembers].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, k);
}

/** 与 emit 里展示打字动画用的名字一致（本名优先，与 onAIStart 对齐） */
function groupParticipantDisplayName(aiMember: Conversation): string {
  return (
    getCharacterRealName(aiMember.characterSettings) ||
    aiMember.name ||
    getCharacterOnlineHandle(aiMember.characterSettings, aiMember.name)
  );
}

/** 与 emit 到前端一致：挂上 senderId，供下一轮 AI 上下文使用 */
function attachGroupSender(reply: GroupAIReply, message: Message): Message {
  const messageWithSender = {
    ...message,
    senderId: reply.aiId,
    senderName: reply.aiName,
    senderAvatar: reply.aiAvatar,
  } as Message & {
    senderId?: string;
    senderName?: string;
    senderAvatar?: string;
    moneyTransfer?: Message['moneyTransfer'];
  };
  if (messageWithSender.moneyTransfer?.type === 'groupRedPacket' && messageWithSender.moneyTransfer.groupRedPacket) {
    messageWithSender.moneyTransfer.groupRedPacket.senderId = reply.aiId;
    messageWithSender.moneyTransfer.groupRedPacket.senderName = reply.aiName;
  }
  return messageWithSender as Message;
}

async function emitReplyThroughCallbacks(
  reply: GroupAIReply,
  aiMember: Conversation,
  callbacks?: GroupChatCallback
): Promise<void> {
  let displayName =
    getCharacterRealName(aiMember.characterSettings) ||
    aiMember.name ||
    getCharacterOnlineHandle(aiMember.characterSettings, aiMember.name);
  if (reply.status === 'error') {
    callbacks?.onAIError?.(reply.aiId, reply.error || '未知错误');
    return;
  }
  if (reply.messages.length === 0) {
    callbacks?.onAIComplete?.(reply.aiId, []);
    return;
  }
  // onAIStart / onAITyping 已在 generateGroupChatReplies 内、各成员 API 请求前触发，避免「请求中仍显示上一位头像」
  await new Promise((r) => setTimeout(r, 400));
  for (let i = 0; i < reply.messages.length; i++) {
    let message = reply.messages[i];
    let silentRenameOnly = false;
    if (message.content && typeof message.content === 'string') {
      const leakClean = stripGroupModelInternalAnnotations(message.content);
      const stripped = stripOnlineHandleChangeMarkers(leakClean);
      if (stripped.newHandle) {
        reply.aiName = stripped.newHandle;
        displayName = stripped.newHandle;
        callbacks?.onCharacterOnlineHandleChange?.(reply.aiId, stripped.newHandle);
        if (!(stripped.text || '').trim()) {
          silentRenameOnly = true;
        }
      }
      message = { ...message, content: stripped.text };
    }
    const hasBubblePayload =
      (typeof message.content === 'string' && message.content.trim().length > 0) ||
      Boolean(message.mediaType) ||
      Boolean(message.moneyTransfer) ||
      Boolean(message.document);
    if (silentRenameOnly && !hasBubblePayload) {
      continue;
    }
    const messageWithSender = attachGroupSender(reply, message);
    callbacks?.onAIMessage?.(reply.aiId, messageWithSender);
    if (i < reply.messages.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  callbacks?.onAIComplete?.(reply.aiId, reply.messages);
}

export async function generateGroupChatReplies(
  groupConversation: Conversation,
  apiConfig: ApiConfig,
  allConversations: Conversation[],
  callbacks?: GroupChatCallback
): Promise<GroupAIReply[]> {
  const members = groupConversation.members || [];
  const aiMembers = members
    .map((mid) => allConversations.find((c) => c.id === mid))
    .filter((c) => c && c.type === 'private') as Conversation[];

  if (aiMembers.length === 0) {
    throw new Error('群聊中没有AI成员');
  }

  const inviterName = loadCurrentUserGroupHandle();

  const lastUserMsg = [...groupConversation.messages].reverse().find((m) => m.role === 'user');
  const isIcebreakerRound = !!lastUserMsg?.groupIcebreakerTrigger;
  const isOrientationRound = !!lastUserMsg?.groupOrientationTrigger;

  const selected = pickParticipantsForRound(aiMembers, isIcebreakerRound ? 'icebreaker' : 'normal');
  console.log(
    (isIcebreakerRound
      ? '🧊 入群破冰，全员参与：'
      : isOrientationRound
        ? '📍 新群首条留言，入群情境：'
        : '🎲 本轮参与候选 ') +
      `${selected.length}/${aiMembers.length}：` +
      `${selected.map((a) => getCharacterOnlineHandle(a.characterSettings, a.name)).join('、')}`
  );

  callbacks?.onGroupChatProcessing?.();

  const allReplies: GroupAIReply[] = [];
  let anyMessageEmitted = false;
  /** 本轮内每发言一位 AI 就追加，避免后续成员 API 上下文缺前面人的气泡 */
  let workingMessages = [...groupConversation.messages];

  for (let idx = 0; idx < selected.length; idx++) {
    const aiMember = selected[idx];
    if (idx > 0) {
      await new Promise((r) => setTimeout(r, 300));
    }
    const apiStartTime = Date.now();
    const coNames = members
      .filter((mid) => mid !== aiMember.id)
      .map((mid) => {
        const m = allConversations.find((c) => c.id === mid);
        if (!m?.characterSettings) return m?.name || '群友';
        const real = getCharacterRealName(m.characterSettings) || m.name;
        const handle = getCharacterOnlineHandle(m.characterSettings, m.name);
        return handle && handle !== real ? `${real}（@${handle}）` : real;
      })
      .join('、');
    const briefing: GroupSituationBriefing = {
      inviterName,
      groupName: groupConversation.name,
      coMemberNames: coNames,
    };
    const convForThisTurn = { ...groupConversation, messages: workingMessages };
    callbacks?.onAIStart?.(aiMember.id, groupParticipantDisplayName(aiMember));
    callbacks?.onAITyping?.(aiMember.id);
    const reply = await generateAIReply(aiMember, convForThisTurn, apiConfig, allConversations, {
      icebreakerBriefing: isIcebreakerRound ? briefing : undefined,
      memberOrientationBriefing: isOrientationRound && !isIcebreakerRound ? briefing : undefined,
    });
    console.log(
      `⏱️ ${getCharacterOnlineHandle(aiMember.characterSettings, aiMember.name)} API调用耗时: ${Date.now() - apiStartTime}ms`
    );
    allReplies.push(reply);
    if (reply.status !== 'error' && reply.messages.length > 0) {
      anyMessageEmitted = true;
    }
    await emitReplyThroughCallbacks(reply, aiMember, callbacks);
    if (reply.status !== 'error' && reply.messages.length > 0) {
      for (const m of reply.messages) {
        workingMessages.push(attachGroupSender(reply, m));
      }
    }
  }

  if (!anyMessageEmitted && selected.length > 0) {
    const lucky = selected[Math.floor(Math.random() * selected.length)];
    console.log(`💬 本轮候选全员未发言，随机由 ${getCharacterOnlineHandle(lucky.characterSettings, lucky.name)} 自然接话`);
    const nudgeCo = members
      .filter((mid) => mid !== lucky.id)
      .map((mid) => {
        const m = allConversations.find((c) => c.id === mid);
        return getCharacterOnlineHandle(m?.characterSettings, m?.name) || '群友';
      })
      .join('、');
    const nudgeBriefing: GroupSituationBriefing = {
      inviterName,
      groupName: groupConversation.name,
      coMemberNames: nudgeCo,
    };
    const convForNudge = { ...groupConversation, messages: workingMessages };
    callbacks?.onAIStart?.(lucky.id, groupParticipantDisplayName(lucky));
    callbacks?.onAITyping?.(lucky.id);
    const nudge = await generateAIReply(lucky, convForNudge, apiConfig, allConversations, {
      forceNaturalParticipation: true,
      icebreakerBriefing: isIcebreakerRound ? nudgeBriefing : undefined,
      memberOrientationBriefing: isOrientationRound && !isIcebreakerRound ? nudgeBriefing : undefined,
    });
    allReplies.push(nudge);
    await emitReplyThroughCallbacks(nudge, lucky, callbacks);
    if (nudge.status !== 'error' && nudge.messages.length > 0) {
      for (const m of nudge.messages) {
        workingMessages.push(attachGroupSender(nudge, m));
      }
    }
  }

  callbacks?.onAllComplete?.(allReplies);
  return allReplies;
}

/** @deprecated 与 generateGroupChatReplies 相同，保留兼容旧 import */
export async function generateGroupChatRepliesFreeMode(
  groupConversation: Conversation,
  apiConfig: ApiConfig,
  allConversations: Conversation[],
  callbacks?: GroupChatCallback
): Promise<GroupAIReply[]> {
  return generateGroupChatReplies(groupConversation, apiConfig, allConversations, callbacks);
}
