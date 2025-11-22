/**
 * 朋友圈频率智能解析器
 * 支持解析用户用自然语言描述的发布规则
 * 支持工作日/周末/假期/月初中末等动态规则
 */

// 频率规则接口
export interface FrequencyRule {
  condition: string;        // 条件类型：weekday/weekend/holiday等
  minInterval: number;      // 最小间隔（小时）
  maxInterval: number;      // 最大间隔（小时）
  description: string;      // 规则描述
}

// 解析后的规则集合
export interface ParsedFrequencyRules {
  weekday?: FrequencyRule;      // 工作日规则
  weekend?: FrequencyRule;      // 周末规则
  holiday?: FrequencyRule;      // 假期规则
  monthStart?: FrequencyRule;   // 月初规则（1-10号）
  monthMid?: FrequencyRule;     // 月中规则（11-20号）
  monthEnd?: FrequencyRule;     // 月末规则（21-31号）
  default: FrequencyRule;       // 默认规则
}

/**
 * 解析中文数字
 */
const parseChineseNumber = (str: string): number => {
  const map: { [key: string]: number } = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
    '两': 2, '俩': 2
  };
  return map[str] || parseInt(str) || 1;
};

/**
 * 从文本中提取频率配置
 */
const parseFrequencyFromText = (text: string, ruleType: string): FrequencyRule => {
  // 频率关键词映射
  const frequencyMap: { [key: string]: { min: number; max: number; desc: string } } = {
    '基本不发': { min: 720, max: 1440, desc: '很少发（1-2月一次）' },
    '很少': { min: 720, max: 1440, desc: '很少发（1-2月一次）' },
    '极少': { min: 720, max: 1440, desc: '极少发（1-2月一次）' },
    '偶尔': { min: 336, max: 720, desc: '偶尔发（2-4周一次）' },
    '不太频繁': { min: 336, max: 720, desc: '偶尔发（2-4周一次）' },
    '正常': { min: 168, max: 336, desc: '正常频率（1-2周一次）' },
    '经常': { min: 48, max: 168, desc: '经常发（2-7天一次）' },
    '常常': { min: 48, max: 168, desc: '经常发（2-7天一次）' },
    '多发': { min: 48, max: 168, desc: '经常发（2-7天一次）' },
    '比较多': { min: 48, max: 168, desc: '经常发（2-7天一次）' },
    '天天': { min: 12, max: 48, desc: '每天发（半天到2天）' },
    '每天': { min: 12, max: 48, desc: '每天发（半天到2天）' },
    '疯狂': { min: 8, max: 24, desc: '疯狂发（每天多次）' },
    '狂发': { min: 8, max: 24, desc: '疯狂发（每天多次）' }
  };
  
  // 匹配关键词
  for (const [keyword, config] of Object.entries(frequencyMap)) {
    if (text.includes(keyword)) {
      return {
        condition: ruleType,
        minInterval: config.min,
        maxInterval: config.max,
        description: config.desc
      };
    }
  }
  
  // 匹配具体数字："一周三次"、"一天两次"、"三天一次"
  const patterns = [
    // "一周三次"、"每周两次"
    { regex: /([一二三四五六七八九十两俩]|[0-9]+)\s*周.*?([一二三四五六七八九十两俩]|[0-9]+)\s*次/, unit: 'week' },
    // "一天两次"、"每天一次"
    { regex: /([一二三四五六七八九十两俩]|[0-9]+)\s*天.*?([一二三四五六七八九十两俩]|[0-9]+)\s*次/, unit: 'day' },
    // "三天一次"、"两周一次"
    { regex: /([一二三四五六七八九十两俩]|[0-9]+)\s*(天|周)\s*.*?([一二三四五六七八九十两俩]|[0-9]+)\s*次/, unit: 'interval' }
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (match) {
      if (pattern.unit === 'week') {
        const times = parseChineseNumber(match[2]);
        const interval = Math.round(168 / times); // 168小时=7天
        return {
          condition: ruleType,
          minInterval: Math.max(12, interval - 12),
          maxInterval: interval + 24,
          description: `每周${times}次（约${Math.round(interval/24)}天一次）`
        };
      } else if (pattern.unit === 'day') {
        const times = parseChineseNumber(match[2]);
        const interval = Math.round(24 / times);
        return {
          condition: ruleType,
          minInterval: Math.max(6, interval - 6),
          maxInterval: interval + 6,
          description: `每天${times}次（约${interval}小时一次）`
        };
      } else if (pattern.unit === 'interval') {
        const num = parseChineseNumber(match[1]);
        const unit = match[2];
        const times = parseChineseNumber(match[3]);
        
        if (unit === '天') {
          const interval = Math.round((num * 24) / times);
          return {
            condition: ruleType,
            minInterval: Math.max(12, interval - 12),
            maxInterval: interval + 24,
            description: `${num}天${times}次（约${Math.round(interval/24)}天一次）`
          };
        } else if (unit === '周') {
          const interval = Math.round((num * 168) / times);
          return {
            condition: ruleType,
            minInterval: Math.max(24, interval - 24),
            maxInterval: interval + 48,
            description: `${num}周${times}次（约${Math.round(interval/24)}天一次）`
          };
        }
      }
    }
  }
  
  // 默认中等频率
  return {
    condition: ruleType,
    minInterval: 168,
    maxInterval: 336,
    description: '正常频率（1-2周一次）'
  };
};

/**
 * 解析复杂的频率规则描述
 * 支持多行描述，每行可能包含不同的时间规则
 */
export const parseComplexFrequencyRules = (description: string): ParsedFrequencyRules => {
  const rules: ParsedFrequencyRules = {
    default: {
      condition: 'default',
      minInterval: 168,
      maxInterval: 720,
      description: '默认频率（1-4周一次）'
    }
  };
  
  if (!description || description.trim() === '') {
    return rules;
  }
  
  const text = description.toLowerCase();
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // 关键词模式
  const patterns = {
    weekday: [
      /工作日/,
      /平时.*?(上班|上课|工作|学习)/,
      /周一.*?周五/,
      /周[一二三四五]/
    ],
    weekend: [
      /周末/,
      /周六日/,
      /周[六日]/,
      /礼拜[六日天]/,
      /星期[六日天]/
    ],
    holiday: [
      /假期/,
      /寒暑假/,
      /放假/,
      /节假日/,
      /长假/
    ],
    monthStart: [
      /月初/,
      /月头/,
      /每月.*?开始/
    ],
    monthMid: [
      /月中/,
      /月中旬/
    ],
    monthEnd: [
      /月[底末]/,
      /月尾/,
      /发工资/
    ]
  };
  
  // 解析每一行
  for (const line of lines) {
    // 检查工作日
    if (patterns.weekday.some(p => p.test(line))) {
      rules.weekday = parseFrequencyFromText(line, 'weekday');
    }
    
    // 检查周末
    if (patterns.weekend.some(p => p.test(line))) {
      rules.weekend = parseFrequencyFromText(line, 'weekend');
    }
    
    // 检查假期
    if (patterns.holiday.some(p => p.test(line))) {
      rules.holiday = parseFrequencyFromText(line, 'holiday');
    }
    
    // 检查月初
    if (patterns.monthStart.some(p => p.test(line))) {
      rules.monthStart = parseFrequencyFromText(line, 'monthStart');
    }
    
    // 检查月中
    if (patterns.monthMid.some(p => p.test(line))) {
      rules.monthMid = parseFrequencyFromText(line, 'monthMid');
    }
    
    // 检查月末
    if (patterns.monthEnd.some(p => p.test(line))) {
      rules.monthEnd = parseFrequencyFromText(line, 'monthEnd');
    }
  }
  
  // 如果有任何规则被解析，更新默认规则为最宽松的
  if (rules.weekday || rules.weekend || rules.holiday) {
    const allIntervals = [
      rules.weekday?.minInterval,
      rules.weekend?.minInterval,
      rules.holiday?.minInterval
    ].filter(v => v !== undefined) as number[];
    
    if (allIntervals.length > 0) {
      const minOfAll = Math.min(...allIntervals);
      const maxOfAll = Math.max(...allIntervals.map((_, i) => {
        return [rules.weekday?.maxInterval, rules.weekend?.maxInterval, rules.holiday?.maxInterval][i];
      }).filter(v => v !== undefined) as number[]);
      
      rules.default = {
        condition: 'default',
        minInterval: minOfAll,
        maxInterval: maxOfAll,
        description: '默认频率'
      };
    }
  }
  
  return rules;
};

/**
 * 判断是否是假期
 */
export const isHoliday = (date: Date = new Date()): boolean => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // 寒假：1月中旬-2月底
  if ((month === 1 && day >= 15) || month === 2) {
    return true;
  }
  
  // 暑假：7-8月
  if (month === 7 || month === 8) {
    return true;
  }
  
  // 国庆：10月1-7日
  if (month === 10 && day <= 7) {
    return true;
  }
  
  // 春节（简化处理，实际需要农历计算）
  // 这里假设春节在1月21日-2月20日之间
  if (month === 1 && day >= 21) {
    return true;
  }
  if (month === 2 && day <= 20) {
    return true;
  }
  
  return false;
};

/**
 * 获取当前应该使用的频率规则
 */
export const getCurrentFrequencyRule = (
  rules: ParsedFrequencyRules,
  currentDate: Date = new Date()
): FrequencyRule => {
  
  // 1. 检查是否是假期（优先级最高）
  if (isHoliday(currentDate) && rules.holiday) {
    console.log('🎉 [朋友圈频率] 假期模式：', rules.holiday.description);
    return rules.holiday;
  }
  
  // 2. 检查是否是周末
  const dayOfWeek = currentDate.getDay();
  if ((dayOfWeek === 0 || dayOfWeek === 6) && rules.weekend) {
    console.log('🎮 [朋友圈频率] 周末模式：', rules.weekend.description);
    return rules.weekend;
  }
  
  // 3. 工作日（周一到周五）
  if (dayOfWeek >= 1 && dayOfWeek <= 5 && rules.weekday) {
    console.log('💼 [朋友圈频率] 工作日模式：', rules.weekday.description);
    return rules.weekday;
  }
  
  // 4. 检查月份时段（优先级较低）
  const dayOfMonth = currentDate.getDate();
  if (dayOfMonth <= 10 && rules.monthStart) {
    console.log('📅 [朋友圈频率] 月初模式：', rules.monthStart.description);
    return rules.monthStart;
  } else if (dayOfMonth >= 11 && dayOfMonth <= 20 && rules.monthMid) {
    console.log('📅 [朋友圈频率] 月中模式：', rules.monthMid.description);
    return rules.monthMid;
  } else if (dayOfMonth >= 21 && rules.monthEnd) {
    console.log('📅 [朋友圈频率] 月末模式：', rules.monthEnd.description);
    return rules.monthEnd;
  }
  
  // 5. 默认规则
  console.log('📝 [朋友圈频率] 默认模式：', rules.default.description);
  return rules.default;
};

/**
 * 获取规则摘要（用于UI显示）
 */
export const getRulesSummary = (rules: ParsedFrequencyRules): string[] => {
  const summary: string[] = [];
  
  if (rules.weekday) {
    summary.push(`💼 工作日：${rules.weekday.description}`);
  }
  
  if (rules.weekend) {
    summary.push(`🎮 周末：${rules.weekend.description}`);
  }
  
  if (rules.holiday) {
    summary.push(`🎉 假期：${rules.holiday.description}`);
  }
  
  if (rules.monthStart) {
    summary.push(`📅 月初：${rules.monthStart.description}`);
  }
  
  if (rules.monthMid) {
    summary.push(`📅 月中：${rules.monthMid.description}`);
  }
  
  if (rules.monthEnd) {
    summary.push(`📅 月末：${rules.monthEnd.description}`);
  }
  
  if (summary.length === 0) {
    summary.push(`📝 默认：${rules.default.description}`);
  }
  
  return summary;
};
