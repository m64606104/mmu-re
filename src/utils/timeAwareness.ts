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
    keywords: ['吃饭', '去吃饭', '要吃饭', '吃个饭', '吃东西', '去吃', '点外卖', '做饭'],
    minDuration: 20,
    maxDuration: 60,
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
 * 生成时间感知的系统提示词（增强版）
 * @param lastUserMessageTimestamp 最后一条用户消息的时间戳
 * @param lastUserMessageContent 最后一条用户消息的内容
 * @param oldestUnrepliedTimestamp 最早未回复消息的时间戳（可选）
 */
export const buildTimeAwarePrompt = (
  lastUserMessageTimestamp?: number, 
  lastUserMessageContent?: string,
  oldestUnrepliedTimestamp?: number
): string => {
  const context = buildTimeContext(lastUserMessageTimestamp, lastUserMessageContent);
  
  let prompt = `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  prompt += `【🕐 时间感知系统】\n`;
  prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  prompt += `📅 当前时间: ${context.currentTime}\n`;
  
  if (context.lastMessageTime && context.timeGap) {
    prompt += `📨 对方最新消息时间: ${context.lastMessageTime}（${context.timeGap}）\n`;
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
  
  prompt += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
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
