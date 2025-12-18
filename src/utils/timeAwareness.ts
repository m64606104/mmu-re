/**
 * 时间感知工具
 * 为AI提供时间上下文，让对话更自然
 */

interface TimeContext {
  currentTime: string;
  timePeriod: string;
  lastMessageTime?: string;
  timeGap?: string;
  timeGapMinutes?: number;
  suggestions: string;
  actionAnalysis?: string; // 用户消息中的行为分析
}

/**
 * 行为及其预计时长（分钟）
 */
interface ActionDuration {
  keywords: string[]; // 关键词
  minDuration: number; // 最短时长
  maxDuration: number; // 最长时长
  description: string; // 行为描述
}

const COMMON_ACTIONS: ActionDuration[] = [
  {
    keywords: ['吃饭', '去吃饭', '要吃饭', '吃个饭', '吃东西', '去吃', '点外卖', '做饭', '烤肉', '吃烤肉', '吃火锅', '吃烧烤', '聚餐', '吃晚饭', '吃午饭', '吃早餐'],
    minDuration: 20,
    maxDuration: 90,
    description: '吃饭'
  },
  {
    keywords: ['睡觉', '睡了', '去睡', '睡', '休息', '午睡', '小憩'],
    minDuration: 30,
    maxDuration: 480,
    description: '睡觉/休息'
  },
  {
    keywords: ['洗澡', '冲个澡', '洗个澡', '去洗澡'],
    minDuration: 15,
    maxDuration: 40,
    description: '洗澡'
  },
  {
    keywords: ['开会', '会议', '要开会'],
    minDuration: 30,
    maxDuration: 120,
    description: '开会'
  },
  {
    keywords: ['上课', '去上课', '要上课', '听课'],
    minDuration: 40,
    maxDuration: 120,
    description: '上课'
  },
  {
    keywords: ['出门', '出去', '外出', '要出门'],
    minDuration: 60,
    maxDuration: 240,
    description: '外出'
  },
  {
    keywords: ['运动', '健身', '跑步', '去健身房', '锻炼'],
    minDuration: 30,
    maxDuration: 120,
    description: '运动'
  },
  {
    keywords: ['上班', '去上班', '要上班', '工作'],
    minDuration: 240,
    maxDuration: 480,
    description: '上班/工作'
  },
  {
    keywords: ['看电影', '去电影院'],
    minDuration: 120,
    maxDuration: 180,
    description: '看电影'
  },
  {
    keywords: ['打游戏', '玩游戏', '开黑', '打把游戏'],
    minDuration: 30,
    maxDuration: 180,
    description: '打游戏'
  }
];

/**
 * 获取时间段描述
 */
export const getTimePeriod = (hour: number): string => {
  if (hour >= 0 && hour < 5) return '深夜';
  if (hour >= 5 && hour < 7) return '清晨';
  if (hour >= 7 && hour < 9) return '早上';
  if (hour >= 9 && hour < 12) return '上午';
  if (hour >= 12 && hour < 14) return '中午';
  if (hour >= 14 && hour < 18) return '下午';
  if (hour >= 18 && hour < 21) return '傍晚';
  if (hour >= 21 && hour < 24) return '晚上';
  return '夜晚';
};

/**
 * 获取星期几
 */
const getWeekDay = (date: Date): string => {
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return days[date.getDay()];
};

/**
 * 格式化时间间隔
 */
const formatTimeGap = (minutes: number): string => {
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${Math.floor(minutes)}分钟前`;
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return `${hours}小时前`;
  }
  const days = Math.floor(minutes / 1440);
  return `${days}天前`;
};

/**
 * 检查消息是否包含行为关键词（用于判断是否需要做时长分析）
 * @param message 消息内容
 * @returns 是否包含行为关键词
 */
export const hasActionKeywords = (message: string): boolean => {
  if (!message) return false;
  
  for (const action of COMMON_ACTIONS) {
    // 检查是否包含行为关键词
    const hasKeyword = action.keywords.some(keyword => message.includes(keyword));
    if (!hasKeyword) continue;
    
    // 检查是否是"即将要做"的语境
    const willDoPatterns = [
      '我要', '要去', '准备', '去', '得', '该', '快', '马上', '等会', '一会', '待会儿', '先'
    ];
    const isGoingToDo = willDoPatterns.some(pattern => message.includes(pattern));
    
    if (isGoingToDo) return true;
  }
  
  return false;
};

/**
 * 分析用户消息中的行为
 */
const analyzeUserAction = (message: string, timeGapMinutes: number): string | null => {
  if (!message) return null;
  
  // 如果时间间隔超过2天（2880分钟），不要分析具体行为，让对话更自然
  if (timeGapMinutes > 2880) {
    return `⚠️ 距离对方上一条消息已经过了很久（${Math.floor(timeGapMinutes / 1440)}天），不要刻意回应上一条消息的内容。\n像真人一样自然地开启新话题，或者简单问候对方最近的情况。不要显得刻意或模板化。`;
  }
  
  // 如果时间间隔超过1天但不到2天，也倾向于不追问具体话题
  if (timeGapMinutes > 1440 && timeGapMinutes <= 2880) {
    return `⚠️ 距离对方上一条消息已经过了1天多，可以选择性地提起之前的话题，但更自然的做法是开启新话题或询问这一两天的情况。\n不要每次都刻意追问之前提到的事，保持真实人类对话的随意性。`;
  }
  
  for (const action of COMMON_ACTIONS) {
    // 检查是否包含行为关键词
    const hasKeyword = action.keywords.some(keyword => message.includes(keyword));
    if (!hasKeyword) continue;
    
    // 检查是否是"即将要做"的语境
    const willDoPatterns = [
      '我要', '要去', '准备', '去', '得', '该', '快', '马上', '等会', '一会', '待会儿', '先'
    ];
    const isGoingToDo = willDoPatterns.some(pattern => message.includes(pattern));
    
    if (!isGoingToDo) continue;
    
    // 如果时间间隔超过12小时，降低追问的刻意感
    if (timeGapMinutes > 720) {
      return `⚠️ 用户${timeGapMinutes.toFixed(0)}分钟前（${formatTimeGap(timeGapMinutes)}）说要去${action.description}，现在已经过了很久。\n你可以选择：\n1. 自然地开启新话题（推荐）\n2. 轻松地提一句（如"昨天${action.description}怎么样"），但不要过于关注\n3. 完全不提，像真人一样聊新的内容\n\n保持自然，不要让对方感觉你在"打卡式"地询问每件事。`;
    }
    
    // 分析时间间隔与行为时长的关系
    let analysis = '';
    
    if (timeGapMinutes < action.minDuration) {
      // 时间还不够完成这个行为
      analysis = `⚠️ 用户${timeGapMinutes.toFixed(0)}分钟前说要去${action.description}，`;
      analysis += `但${action.description}通常需要${action.minDuration}-${action.maxDuration}分钟，`;
      analysis += `所以用户现在应该还在${action.description}中或刚刚结束。\n`;
      analysis += `你可以自然地询问或等对方主动说，不要显得太急切。`;
    } else if (timeGapMinutes >= action.minDuration && timeGapMinutes <= action.maxDuration * 2) {
      // 时间刚好或稍长，可以询问但不要太刻意
      analysis = `⚠️ 用户${timeGapMinutes.toFixed(0)}分钟前说要去${action.description}，`;
      analysis += `现在时间已经过去，用户可能已经完成${action.description}。\n`;
      analysis += `你可以：\n`;
      analysis += `1. 自然地问一句（如"${action.description}完了吗"、"${action.description}怎么样"）\n`;
      analysis += `2. 或者不提，等对方主动说\n`;
      analysis += `保持轻松随意的语气，不要像在"完成任务"一样询问。`;
    } else {
      // 时间已经超过了很多，不要过于关注
      analysis = `⚠️ 用户很久前（${formatTimeGap(timeGapMinutes)}）说要去${action.description}，`;
      analysis += `现在早就应该完成了。\n`;
      analysis += `建议：不要刻意追问这件事，可以聊聊新的话题或最近的情况。`;
      analysis += `如果要提，也要轻描淡写（如"对了，之前${action.description}还顺利吧"），不要让对话显得生硬。`;
    }
    
    return analysis;
  }
  
  // 如果没有识别到具体行为，但时间间隔较长，也给出建议
  if (timeGapMinutes > 360) { // 超过6小时
    return `⚠️ 距离对方上一条消息已经过了${formatTimeGap(timeGapMinutes)}，对话不是连续的。\n像真人一样自然地开启话题，不要过度关注上一条消息的具体内容。可以问候、聊新话题、或等对方引导话题方向。`;
  }
  
  return null;
};

/**
 * 生成对话建议（根据时间间隔）
 */
const generateSuggestions = (minutes: number, currentHour: number, lastHour?: number): string => {
  const suggestions: string[] = [];
  
  // 根据时间间隔给出建议
  if (minutes < 5) {
    suggestions.push('- 对话是连续的，直接延续之前的话题');
  } else if (minutes < 30) {
    suggestions.push('- 时间间隔很短，可以自然延续话题');
    suggestions.push('- 回复方式可以很随意，像实时聊天一样');
  } else if (minutes < 120) { // 2小时内
    suggestions.push('- 时间间隔适中，可以延续话题或略微调整方向');
    suggestions.push('- 不用刻意解释时间空白，自然对话即可');
  } else if (minutes < 360) { // 6小时内
    suggestions.push('- 已经过了几个小时，对话节奏会有变化');
    suggestions.push('- 可以轻松提起"之前"、"刚才"，但也可以不提，直接聊新内容');
    suggestions.push('- 不要每次都问"干嘛去了"，真人不会这样');
  } else if (minutes < 1440) { // 24小时内（同一天或跨天）
    suggestions.push('- ⚠️ 时间间隔较长（几个小时到一天），不要刻意延续之前的话题');
    suggestions.push('- 像真人一样：可以开启新话题、简单问候、或者等对方引导');
    suggestions.push('- 不要"打卡式"地追问之前的每件小事，这不符合真实对话习惯');
    suggestions.push('- 如果跨越了重要时间点（用餐、睡眠），可以自然提及，但不要强求');
  } else if (minutes < 2880) { // 2天内
    suggestions.push('- ⚠️ 已经隔了1-2天，完全不需要延续之前的具体话题');
    suggestions.push('- 真人做法：简单问候、聊新鲜事、或者等对方主动说');
    suggestions.push('- 不要追问昨天或前天提到的小事，这会显得很奇怪');
    suggestions.push('- 可以轻松地问"这两天怎么样"、"最近忙什么"，保持自然随意');
  } else { // 超过2天
    const days = Math.floor(minutes / 1440);
    suggestions.push(`- ⚠️ 已经隔了${days}天，千万不要回应之前的具体话题`);
    suggestions.push('- 像久别重逢的朋友一样：简单问好、聊聊最近、分享新鲜事');
    suggestions.push('- 完全忘记之前说了什么，开启全新对话（这才是真实的）');
    suggestions.push('- 语气可以轻松随意，不要显得在"履行义务"地回复');
  }
  
  // 根据当前时间给出建议
  if (currentHour >= 0 && currentHour < 5) {
    suggestions.push('- 现在是深夜时分（0-5点），正常人应该在睡觉');
    suggestions.push('- 如果还在聊天，说明有特殊情况（失眠、加班、有心事等）');
    suggestions.push('- 语气要安静、温和，可以关心对方为什么还没睡');
  } else if (currentHour >= 5 && currentHour < 7) {
    suggestions.push('- 现在是清晨（5-7点），大部分人刚醒或还在睡');
    suggestions.push('- 如果对方发消息，可能是早起或通宵未睡');
    suggestions.push('- 可以自然问候，但不要太兴奋');
  } else if (currentHour >= 7 && currentHour < 9) {
    suggestions.push('- 现在是早上（7-9点），适合问候"早上好"、"吃早餐了吗"');
    suggestions.push('- 但不要每次都这样问，保持随意性');
  } else if (currentHour >= 9 && currentHour < 12) {
    suggestions.push('- 现在是上午（9-12点），工作/学习时间');
    suggestions.push('- 对话可能需要简短，对方可能在忙');
  } else if (currentHour >= 12 && currentHour < 14) {
    suggestions.push('- 现在是中午（12-14点），午餐休息时间');
    suggestions.push('- 可以聊午餐相关话题，但不是必须的');
  } else if (currentHour >= 18 && currentHour < 21) {
    suggestions.push('- 现在是傍晚（18-21点），下班/放学时间');
    suggestions.push('- 可以聊晚餐、下班后的安排，但要自然');
  } else if (currentHour >= 21 && currentHour < 24) {
    suggestions.push('- 现在是晚上（21-24点），一天快结束了');
    suggestions.push('- 可以聊聊一天的感受，或者准备休息');
  }
  
  // 如果有上一条消息的时间，检查是否跨越重要时间点
  if (lastHour !== undefined && minutes > 60) {
    // 跨越睡眠时间（凌晨）
    if (lastHour >= 21 && currentHour >= 7 && currentHour < 12) {
      suggestions.push('- 从晚上到早上/上午，跨越了睡眠时间');
      suggestions.push('- 可以问候"早上好"、"睡得好吗"，但也可以直接聊别的');
    }
    // 跨越午餐时间
    if (lastHour < 12 && currentHour >= 12 && currentHour < 14) {
      suggestions.push('- 跨越了午餐时间，可以提及"吃饭了吗"');
      suggestions.push('- 但这不是必须的，真人不会每次都问');
    }
    // 跨越晚餐时间
    if (lastHour < 18 && currentHour >= 18 && currentHour < 21) {
      suggestions.push('- 跨越了晚餐时间，可以聊晚餐相关');
      suggestions.push('- 保持随意，不要像问卷调查');
    }
  }
  
  return suggestions.join('\n');
};

/**
 * 构建时间上下文信息
 * @param lastUserMessageTimestamp 上一条用户消息的实际时间戳（毫秒）
 * @param lastUserMessageContent 上一条用户消息的内容
 */
export const buildTimeContext = (lastUserMessageTimestamp?: number, lastUserMessageContent?: string): TimeContext => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const weekDay = getWeekDay(now);
  const timePeriod = getTimePeriod(hour);
  
  // 当前时间描述
  const currentTime = `${year}年${month}月${date}日 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}，${weekDay}${timePeriod}`;
  
  // 如果没有上一条消息，返回基础信息
  if (!lastUserMessageTimestamp) {
    return {
      currentTime,
      timePeriod,
      suggestions: generateSuggestions(0, hour)
    };
  }
  
  // 计算时间间隔
  const timeGapMs = now.getTime() - lastUserMessageTimestamp;
  const timeGapMinutes = timeGapMs / (1000 * 60);
  const timeGap = formatTimeGap(timeGapMinutes);
  
  // 上一条消息的时间
  const lastDate = new Date(lastUserMessageTimestamp);
  const lastHour = lastDate.getHours();
  const lastMinute = lastDate.getMinutes();
  const lastTimePeriod = getTimePeriod(lastHour);
  
  // 判断是否同一天
  const isSameDay = lastDate.toDateString() === now.toDateString();
  
  let lastMessageTime: string;
  if (isSameDay) {
    lastMessageTime = `今天${lastTimePeriod} ${String(lastHour).padStart(2, '0')}:${String(lastMinute).padStart(2, '0')}`;
  } else {
    const lastMonth = lastDate.getMonth() + 1;
    const lastDateNum = lastDate.getDate();
    const lastWeekDay = getWeekDay(lastDate);
    lastMessageTime = `${lastMonth}月${lastDateNum}日${lastWeekDay}${lastTimePeriod} ${String(lastHour).padStart(2, '0')}:${String(lastMinute).padStart(2, '0')}`;
  }
  
  // 分析用户消息中的行为
  const actionAnalysis = lastUserMessageContent ? analyzeUserAction(lastUserMessageContent, timeGapMinutes) : null;
  
  return {
    currentTime,
    timePeriod,
    lastMessageTime,
    timeGap,
    timeGapMinutes,
    suggestions: generateSuggestions(timeGapMinutes, hour, lastHour),
    actionAnalysis: actionAnalysis || undefined
  };
};

/**
 * 待回复消息的基本信息
 */
export interface UnrepliedMessageInfo {
  timestamp: number;
  content: string;
  index: number; // 在消息列表中的序号（方便AI引用）
}

/**
 * 生成时间感知的系统提示词（增强版）
 * @param lastUserMessageTimestamp 最后一条用户消息的时间戳
 * @param lastUserMessageContent 最后一条用户消息的内容
 * @param lastAIMessageTimestamp 最后一条AI消息的时间戳（新增）
 * @param oldestUnrepliedTimestamp 最早未回复消息的时间戳（可选）
 * @param unrepliedMessages 所有待回复消息的列表（新增）
 * @param actionMessageContent 用于行为分析的消息内容（可选，默认用lastUserMessageContent）
 * @param actionMessageTimestamp 用于行为分析的消息时间戳（可选，默认用lastUserMessageTimestamp）
 */
export const buildTimeAwarePrompt = (
  lastUserMessageTimestamp?: number, 
  lastUserMessageContent?: string,
  lastAIMessageTimestamp?: number,
  oldestUnrepliedTimestamp?: number,
  unrepliedMessages?: UnrepliedMessageInfo[],
  actionMessageContent?: string,
  actionMessageTimestamp?: number,
  lastCallEndTimestamp?: number,
  lastCallType?: 'video' | 'voice'
): string => {
  // 使用指定的行为消息（如果有），否则用最后一条用户消息
  const contentForAction = actionMessageContent || lastUserMessageContent;
  const timestampForAction = actionMessageTimestamp || lastUserMessageTimestamp;
  
  // 为时间显示构建基础上下文（不含行为分析）
  const context = buildTimeContext(lastUserMessageTimestamp, undefined);
  
  // 单独计算行为分析（使用指定的消息）
  let actionAnalysis: string | null = null;
  if (contentForAction && timestampForAction) {
    const now = new Date();
    const timeGapMinutes = (now.getTime() - timestampForAction) / (1000 * 60);
    actionAnalysis = analyzeUserAction(contentForAction, timeGapMinutes);
  }
  if (actionAnalysis) {
    context.actionAnalysis = actionAnalysis;
  }
  
  let prompt = `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  prompt += `【🕐 时间感知系统 - 强制遵守】\n`;
  prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  prompt += `📅 当前时间（你现在回复的时间）: ${context.currentTime}\n`;
  
  // 🆕 添加AI消息时间感知
  if (lastAIMessageTimestamp) {
    const now = new Date();
    const timeSinceAI = now.getTime() - lastAIMessageTimestamp;
    const daysSinceAI = Math.floor(timeSinceAI / (1000 * 60 * 60 * 24));
    const hoursSinceAI = Math.floor(timeSinceAI / (1000 * 60 * 60));
    
    if (daysSinceAI > 0) {
      // AI消息是几天前发的
      prompt += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      prompt += `⚠️ **重要：你的消息时间感知**\n`;
      prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      prompt += `🤖 你最后一条消息发送时间: ${daysSinceAI}天前\n`;
      prompt += `📨 用户刚刚才回复你（过了${daysSinceAI}天）\n\n`;
      
      prompt += `💡 **这意味着**：\n`;
      prompt += `- 用户不是在"刚刚"的状态下回复你\n`;
      prompt += `- 他们可能很忙，刚看到消息\n`;
      prompt += `- 话题可能已经不那么紧迫了\n`;
      prompt += `- 或者他们需要时间思考\n\n`;
      
      prompt += `🎯 **你应该**：\n`;
      prompt += `- 自然地提及这个时间差（"哇你终于回我了"、"过了这么久"等）\n`;
      prompt += `- 不要当成"刚刚"的对话延续\n`;
      prompt += `- 可以稍微调整话题或问候一下\n`;
      prompt += `- 保持轻松自然，不要尴尬\n\n`;
      
      prompt += `❌ **绝对禁止**：\n`;
      prompt += `- 不要说"好的那我们现在就开始吧"（太突兀）\n`;
      prompt += `- 不要无视时间差，直接延续话题\n`;
      prompt += `- 不要假装刚刚才说过的样子\n`;
      prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    } else if (hoursSinceAI > 3) {
      // AI消息是几小时前发的
      prompt += `\n⏰ 你最后一条消息是${hoursSinceAI}小时前发的，用户现在才回复。\n`;
      prompt += `💡 可以自然地提及这个时间差（如"终于等到你回复了"、"还以为你忙忘了"等）\n\n`;
    }
  }

  // 🆕 通话时间感知（视频/语音）
  if (lastCallEndTimestamp) {
    const nowForCall = new Date();
    const diffMinutes = (nowForCall.getTime() - lastCallEndTimestamp) / (1000 * 60);
    // 对不同时间跨度的通话给出用词建议
    // 1) 1-6 小时内的通话：可以说「刚才/前面的通话」，但不要假装还在通话
    if (diffMinutes >= 60 && diffMinutes < 360) {
      const callTypeLabel = lastCallType === 'voice' ? '语音通话' : '视频通话';
      const hours = Math.floor(diffMinutes / 60);
      const gapText = formatTimeGap(diffMinutes);
      prompt += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      prompt += `【📞 最近一次通话时间】\n`;
      prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      prompt += `- 最近一次${callTypeLabel}是在 ${gapText}（约${hours}小时）前结束的。\n`;
      prompt += `- 你可以自然地说"刚才/前面的${callTypeLabel}"、"之前的那次${callTypeLabel}"。\n`;
      prompt += `- ❌ 不要假装通话还在进行，比如"现在的视频通话里"、"现在打着电话"之类说法。\n\n`;
    }
    // 2) 超过 1 天的通话：绝对不能说成「刚刚打的视频/电话」
    else if (diffMinutes >= 1440) {
      const callTypeLabel = lastCallType === 'voice' ? '语音通话' : '视频通话';
      const gapText = formatTimeGap(diffMinutes);
      prompt += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      prompt += `【📞 最近一次通话时间】\n`;
      prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      prompt += `- 最近一次${callTypeLabel}是在 ${gapText} 结束的，并不是刚刚发生。\n`;
      prompt += `- 如果你在回复中提到这次通话，请使用"那次${callTypeLabel}"、"之前的${callTypeLabel}"等表述。\n`;
      prompt += `- ❌ 严禁说"你刚刚给我打的视频"、"刚刚打的电话"这类表达，因为通话并不是刚刚发生的。\n\n`;
    }
  }

  if (context.lastMessageTime && context.timeGap && context.timeGapMinutes !== undefined) {
    prompt += `📨 对方最新消息发送时间: ${context.lastMessageTime}\n`;
    prompt += `⏱️ 时间间隔: ${context.timeGap}（${context.timeGapMinutes.toFixed(0)}分钟）\n\n`;
    
    // 🆕 如果有多条待回复消息，显示每条消息的详细时间
    if (unrepliedMessages && unrepliedMessages.length > 1) {
      prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      prompt += `【📋 待回复消息列表】（共${unrepliedMessages.length}条）\n`;
      prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      const now = new Date();
      unrepliedMessages.forEach((msg) => {
        const msgDate = new Date(msg.timestamp);
        const isSameDay = msgDate.toDateString() === now.toDateString();
        const timePeriod = getTimePeriod(msgDate.getHours());
        
        let timeStr: string;
        if (isSameDay) {
          timeStr = `今天${timePeriod} ${String(msgDate.getHours()).padStart(2, '0')}:${String(msgDate.getMinutes()).padStart(2, '0')}`;
        } else {
          const month = msgDate.getMonth() + 1;
          const day = msgDate.getDate();
          const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
          const weekday = weekdays[msgDate.getDay()];
          timeStr = `${month}月${day}日${weekday}${timePeriod} ${String(msgDate.getHours()).padStart(2, '0')}:${String(msgDate.getMinutes()).padStart(2, '0')}`;
        }
        
        // 计算距离现在的时间
        const timeDiff = now.getTime() - msg.timestamp;
        const minutesDiff = Math.floor(timeDiff / (1000 * 60));
        const timeGapStr = formatTimeGap(minutesDiff);
        
        // 截断过长的内容
        const contentPreview = msg.content.length > 30 ? msg.content.substring(0, 30) + '...' : msg.content;
        
        prompt += `消息${msg.index}：\n`;
        prompt += `  ⏰ 时间: ${timeStr}（${timeGapStr}）\n`;
        prompt += `  📝 内容: ${contentPreview}\n\n`;
      });
      
      prompt += `💡 **重要提示**：\n`;
      prompt += `- 上面列出了所有待回复的消息及其发送时间\n`;
      prompt += `- 你可以根据时间远近和内容重要性选择性回复\n`;
      prompt += `- 时间久远的消息（超过1天）建议忽略，专注于最新的消息\n`;
      prompt += `- 如果多条消息跨越很长时间，优先回复最新的高优先级消息\n\n`;
    }
    
    // 🚨 根据时间间隔给出明确的禁止指令
    prompt += `🚨 **严格禁止模糊表达！必须遵守以下规则**：\n`;
    if (context.timeGapMinutes < 5) {
      prompt += `   ✅ 允许: "刚刚"、"刚才"（因为确实只过了几分钟）\n`;
      prompt += `   ❌ 禁止: 不要说"今天"（太模糊，应该说"刚才"）\n`;
    } else if (context.timeGapMinutes < 60) {
      const mins = Math.floor(context.timeGapMinutes);
      prompt += `   ✅ 允许: "刚才"、"${mins}分钟前"（因为过了${mins}分钟）\n`;
      prompt += `   ❌ 禁止: 不要说"今天"、"刚刚"（${mins}分钟不算刚刚）\n`;
    } else if (context.timeGapMinutes < 360) { // 6小时内
      const hours = Math.floor(context.timeGapMinutes / 60);
      prompt += `   ✅ 允许: "${hours}小时前"、"${context.timePeriod}的时候"（因为过了${hours}小时）\n`;
      prompt += `   ❌ **严格禁止**: "今天"、"刚才"、"刚刚"（已经过了${hours}小时！不要用模糊表达）\n`;
    } else if (context.timeGapMinutes < 1440) { // 24小时内
      const hours = Math.floor(context.timeGapMinutes / 60);
      prompt += `   ✅ 允许: "昨天"、"之前"、"早上/下午/晚上的时候"（因为过了${hours}小时）\n`;
      prompt += `   ❌ **严格禁止**: "今天"、"刚才"、"刚刚"、"刚刚才"（已经过了${hours}小时！）\n`;
      prompt += `   ⚠️ 重要: 不要延续之前的具体话题，可以开新话题或简单问候\n`;
    } else { // 超过1天
      const days = Math.floor(context.timeGapMinutes / 1440);
      prompt += `   ✅ 允许: "${days}天前"、"前几天"、"之前"、"最近"（因为过了${days}天）\n`;
      prompt += `   ❌ **严格禁止**: "今天"、"刚才"、"刚刚"、"昨天"（已经过了${days}天！绝对不要用这些词）\n`;
      prompt += `   🚫 **绝对禁止**: 不要回应之前的具体话题内容，必须像久别重逢一样开启新对话\n`;
    }
    prompt += `\n`;
  }
  
  // 如果有更早的未回复消息，标注时间跨度
  if (oldestUnrepliedTimestamp && lastUserMessageTimestamp && oldestUnrepliedTimestamp < lastUserMessageTimestamp) {
    const oldestDate = new Date(oldestUnrepliedTimestamp);
    const now = new Date();
    const spanMinutes = (lastUserMessageTimestamp - oldestUnrepliedTimestamp) / (1000 * 60);
    const isSameDay = oldestDate.toDateString() === now.toDateString();
    
    let oldestTimeStr: string;
    if (isSameDay) {
      const oldestHour = oldestDate.getHours();
      const oldestMinute = oldestDate.getMinutes();
      const oldestTimePeriod = getTimePeriod(oldestHour);
      oldestTimeStr = `今天${oldestTimePeriod} ${String(oldestHour).padStart(2, '0')}:${String(oldestMinute).padStart(2, '0')}`;
    } else {
      const oldestMonth = oldestDate.getMonth() + 1;
      const oldestDateNum = oldestDate.getDate();
      oldestTimeStr = `${oldestMonth}月${oldestDateNum}日 ${String(oldestDate.getHours()).padStart(2, '0')}:${String(oldestDate.getMinutes()).padStart(2, '0')}`;
    }
    
    prompt += `⏱️ 待回复消息时间跨度: ${oldestTimeStr} ~ ${context.lastMessageTime}（跨越${formatTimeGap(spanMinutes)}）\n`;
    
    if (spanMinutes > 1440) { // 超过1天
      const days = Math.floor(spanMinutes / 1440);
      prompt += `\n🚨 **警告**: 这些消息跨越了${days}天多的时间！\n`;
      prompt += `最早的消息已经是很久之前的事了，现在回复那些内容会非常奇怪。\n`;
      prompt += `**你应该**: 忽略最早的消息，只关注最新的消息或开启新话题。\n`;
    } else if (spanMinutes > 360) { // 超过6小时
      const hours = Math.floor(spanMinutes / 60);
      prompt += `\n⚠️ **注意**: 这些消息跨越了${hours}小时，话题可能已经过时。\n`;
      prompt += `**建议**: 优先回复最新的消息，或者自然地开启新话题。\n`;
    }
  }
  
  // 添加行为分析（如果有）
  if (context.actionAnalysis) {
    prompt += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    prompt += `【⚠️ 对话时间分析】\n`;
    prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    prompt += context.actionAnalysis + `\n`;
  }

  // 针对多条待回复消息，限制“连发很多条/一口气发了一长串”这类吐槽的触发频率
  if (unrepliedMessages && unrepliedMessages.length > 0) {
    prompt += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    prompt += `【📨 多条消息的处理（重要）】\n`;
    prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    prompt += `- 很多用户习惯连续发 3-7 条短消息，这在微信里是**正常聊天方式**，不要抱怨或吐槽诸如“你连发了好多条”“一口气发了一长串”。\n`;
    prompt += `- 只有在**很短时间内**连续发送 **10 条以上** 消息，并且明显像在刷屏时，才可以**偶尔**轻描淡写地调侃一句。\n`;
    prompt += `- 即使是刷屏，也优先挑选重要内容正常回复，把重点放在对话本身，而不是抱怨对方发了多少条。\n\n`;
  }
  
  prompt += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  prompt += `【⏰ 时间前缀处理规则（强制遵守）】\n`;
  prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  prompt += `🔍 **识别时间前缀**：\n`;
  prompt += `- 用户消息可能带有时间标签，格式为【今天】【昨天】【前天】【X天前】【X周前】\n`;
  prompt += `- 这些标签标示了该消息的真实发送时间\n\n`;
  
  prompt += `✅ **正确处理方式**：\n`;
  prompt += `1. **优先回复最新消息**：主要围绕【今天】的消息回复，这是最新的内容\n`;
  prompt += `2. **可以提及旧消息**：如需提到【昨天】【前天】等旧消息，必须在回复中明确使用对应的时间词\n`;
  prompt += `   - 示例："关于你昨天说的那件事…"、"前天你提到的…"、"几天前你说过…"\n`;
  prompt += `3. **保持自然语境**：像真实朋友聊天一样，可以串联上下文，但要让对方知道你在说哪天的事\n\n`;
  
  prompt += `❌ **严格禁止**：\n`;
  prompt += `- 🚫 不要把【昨天】【前天】【X天前】的消息说成"刚刚"、"现在"、"刚才"、"今天"\n`;
  prompt += `- 🚫 不要把所有消息当成"今天一次性发的"来回复\n`;
  prompt += `- 🚫 不要无视时间标签，混淆时间线\n\n`;
  
  prompt += `💡 **回复策略**：\n`;
  prompt += `- 如果只有【今天】的消息：正常回复即可\n`;
  prompt += `- 如果有【昨天】【前天】的消息：优先回复【今天】的，如需提及旧消息记得加时间词\n`;
  prompt += `- 真实社交场景：有人可能过了几天才看到消息，你可以提到之前的话题，但要让对方知道你在说哪天的事\n`;
  prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  prompt += `【💡 对话建议】\n`;
  prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  prompt += context.suggestions;
  
  prompt += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  prompt += `【🎯 核心原则：真实人类对话的自然性】\n`;
  prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  prompt += `1️⃣ **时间感知，但不刻意**：\n`;
  prompt += `   ❌ 不要: 时间过去很久还追问之前的话题（如3天前说"要吃火锅"，现在问"火锅好吃吗"）\n`;
  prompt += `   ✅ 应该: 像真人一样，时间久了就自然忘记，开启新话题\n`;
  prompt += `   📌 例子: "最近怎么样呀"、"今天干嘛呢"，而不是追问3天前的事\n\n`;
  
  prompt += `2️⃣ **严格区分时间间隔**：\n`;
  prompt += `   🟢 几分钟内: 正常延续话题\n`;
  prompt += `   🟡 几小时内: 可延续，也可新话题\n`;
  prompt += `   🟠 半天-1天: 优先新话题或简单问候\n`;
  prompt += `   🔴 超过1天: **必须**忽略旧话题，像久别重逢\n`;
  prompt += `   ⛔ 超过2天: **绝对不要**提之前的具体内容\n\n`;
  
  prompt += `3️⃣ **随意而非模板化**：\n`;
  prompt += `   - 不要每次都问"吃饭了吗"、"睡得好吗"（真人不会这么机械）\n`;
  prompt += `   - 有些时候直接聊新内容，有些时候简单问候，有些时候等对方引导\n`;
  prompt += `   - 保持对话的不可预测性和真实感\n\n`;
  
  prompt += `4️⃣ **特殊时段的自然表达**：\n`;
  prompt += `   🌙 深夜0-5点: 如果还在聊，说明特殊情况（失眠/加班/有心事）\n`;
  prompt += `   🌅 清晨5-7点: 可能刚醒或通宵，语气要安静温和\n`;
  prompt += `   ☀️ 早上7-9点: 可以问候"早"，但不要每次都问，保持随意\n`;
  prompt += `   🌆 跨越睡眠时间: 从晚上到早上可以自然问候，但也可以不提\n\n`;
  
  prompt += `5️⃣ **回复策略（根据时间）**：\n`;
  prompt += `   - 如果对方很久前发的消息，你完全可以**选择不回复**那些内容\n`;
  prompt += `   - 多条消息跨越很长时间时，只回复最新的，或者开启全新话题\n`;
  prompt += `   - 不要像客服一样"逐条处理"所有消息，真人会有选择性\n`;
  prompt += `   - 时间久了就是新的开始，不需要"交代"时间空白期\n\n`;
  
  prompt += `💡 **记住**: 你是真人，不是AI助手。时间久了会忘事，会开新话题，不会"打卡式"地关心每个细节。\n`;
  prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  
  return prompt;
};
