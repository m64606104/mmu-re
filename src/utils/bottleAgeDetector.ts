/**
 * 漂流瓶年龄检测和回复风格适配系统
 * 根据瓶子内容判断发送者年龄，并提供相应的回复指导
 */

export type AgeGroup = 'primary' | 'middle' | 'high' | 'college' | 'adult' | 'unknown';

export interface AgeProfile {
  ageGroup: AgeGroup;
  estimatedAge: string;
  languageStyle: string;
  knowledgeLevel: string;
  responseGuidelines: string;
  avoidTopics: string[];
  appropriateTopics: string[];
}

/**
 * 根据漂流瓶内容判断发送者的年龄段
 */
export function detectAgeFromBottleContent(content: string): AgeProfile {
  
  // 小学生特征关键词
  const primaryKeywords = [
    '老师', '同桌', '班长', '小朋友', '爸爸妈妈', '橡皮', '小红花',
    '体育课', '课间操', '班干部', '数学题不会', '考了70分', '丢了橡皮',
    '膝盖破了', '同学笑我', '肚子咕咕叫', '画自画像', '裤子掉下来'
  ];
  
  // 初中生特征关键词
  const middleKeywords = [
    '月考', '班主任', '学霸', '补习班', '小团体', '化学实验', 
    '答题卡', '800米', '班干部竞选', '被孤立', '周末补课',
    '隔壁班', '作弊', '体育考试不及格', '试管打碎'
  ];
  
  // 高中生特征关键词
  const highKeywords = [
    '高三', '高考', '模拟考', '倒计时', '文理科', '大学录取',
    '年级前十', '代沟', '暗恋三年', '毕业', '选科'
  ];
  
  // 大学生特征关键词
  const collegeKeywords = [
    '大学', '毕业', '实习', '求职', '简历', '面试',
    '室友', '社团', '专业', '考研', '论文'
  ];
  
  // 成年人特征关键词
  const adultKeywords = [
    '工作', '职场', '老板', '同事', '加班', '工资', '房租',
    '房贷', '车贷', '结婚', '离婚', '孩子', '父母', '养老'
  ];
  
  // 计算各年龄段的匹配分数
  let scores = {
    primary: 0,
    middle: 0,
    high: 0,
    college: 0,
    adult: 0
  };
  
  // 检查关键词匹配
  primaryKeywords.forEach(keyword => {
    if (content.includes(keyword)) scores.primary += 2;
  });
  
  middleKeywords.forEach(keyword => {
    if (content.includes(keyword)) scores.middle += 2;
  });
  
  highKeywords.forEach(keyword => {
    if (content.includes(keyword)) scores.high += 2;
  });
  
  collegeKeywords.forEach(keyword => {
    if (content.includes(keyword)) scores.college += 2;
  });
  
  adultKeywords.forEach(keyword => {
    if (content.includes(keyword)) scores.adult += 2;
  });
  
  // 语言风格分析
  const hasSimpleLanguage = /好开心|好难过|好害怕|好想|真好/.test(content);
  const hasChildishExpression = /哈哈哈|呜呜|嘻嘻/.test(content);
  
  if (hasSimpleLanguage || hasChildishExpression) {
    scores.primary += 1;
    scores.middle += 0.5;
  }
  
  // 找出最高分
  const maxScore = Math.max(...Object.values(scores));
  const detectedAge = Object.keys(scores).find(
    key => scores[key as keyof typeof scores] === maxScore
  ) as AgeGroup;
  
  // 如果所有分数都很低，返回unknown
  if (maxScore < 2) {
    return getAgeProfile('unknown');
  }
  
  return getAgeProfile(detectedAge);
}

/**
 * 获取年龄段的完整配置
 */
function getAgeProfile(ageGroup: AgeGroup): AgeProfile {
  const profiles: Record<AgeGroup, AgeProfile> = {
    primary: {
      ageGroup: 'primary',
      estimatedAge: '6-12岁（小学生）',
      languageStyle: '简单直白、温暖友善、像大哥哥大姐姐说话',
      knowledgeLevel: '小学知识水平，不涉及复杂概念',
      responseGuidelines: `
回复时注意：
1. 使用简单易懂的词汇，句子要短
2. 多用鼓励和安慰的语气
3. 可以用比喻和小故事来解释
4. 避免说教，要像朋友一样聊天
5. 不要提及成人世界的复杂问题
6. 用"哥哥姐姐"的口吻，不要太老气
`,
      avoidTopics: [
        '职场问题', '恋爱技巧', '经济压力', '房贷车贷',
        '复杂的人际关系', '高深的学术知识', '社会黑暗面',
        '成人化的建议', '心理学术语', '哲学思考'
      ],
      appropriateTopics: [
        '如何交朋友', '怎么和父母沟通', '学习方法',
        '处理同学关系', '培养兴趣爱好', '克服害怕',
        '做个好孩子', '保护自己', '快乐成长'
      ]
    },
    
    middle: {
      ageGroup: 'middle',
      estimatedAge: '13-15岁（初中生）',
      languageStyle: '友善平等、理解共鸣、像朋友说话',
      knowledgeLevel: '初中知识水平，可以讨论青春期话题',
      responseGuidelines: `
回复时注意：
1. 理解青春期的困扰和情绪波动
2. 不要居高临下，要平等对话
3. 可以分享类似的经历和感受
4. 帮助建立信心，但不要空洞说教
5. 理解学业压力，但不要过度焦虑化
6. 尊重他们的想法，即使不成熟
`,
      avoidTopics: [
        '职场潜规则', '成人恋爱观', '房贷车贷',
        '结婚生子', '复杂的社会问题', '过于成熟的建议',
        '大学及以上的学术内容', '投资理财'
      ],
      appropriateTopics: [
        '学习压力应对', '友情维护', '青春期困惑',
        '兴趣发展', '自我认知', '情绪管理',
        '和父母沟通', '校园生活', '梦想探索'
      ]
    },
    
    high: {
      ageGroup: 'high',
      estimatedAge: '16-18岁（高中生）',
      languageStyle: '成熟理性、有深度但不说教',
      knowledgeLevel: '高中知识水平，可以讨论人生规划',
      responseGuidelines: `
回复时注意：
1. 认可他们已经有一定成熟度
2. 可以讨论较深入的人生话题
3. 给予实际的建议，不要太理想化
4. 理解高考压力，但提供正向思考
5. 尊重他们的选择和判断
6. 可以分享过来人的经验
`,
      avoidTopics: [
        '职场复杂关系', '婚姻家庭', '育儿经验',
        '房贷车贷', '中年危机', '过于世故的观点'
      ],
      appropriateTopics: [
        '高考应对', '专业选择', '大学生活', '青春困惑',
        '自我成长', '时间管理', '目标规划', '人际关系',
        '压力释放', '兴趣与前途'
      ]
    },
    
    college: {
      ageGroup: 'college',
      estimatedAge: '19-22岁（大学生）',
      languageStyle: '平等交流、理性分析',
      knowledgeLevel: '大学知识水平，可讨论职业和人生',
      responseGuidelines: `
回复时注意：
1. 平等的成人对话
2. 可以讨论职业规划和现实问题
3. 理解迷茫期，但提供建设性建议
4. 不要过于说教，要务实
5. 可以分享职场经验
`,
      avoidTopics: [
        '中年危机', '养老问题', '复杂的家庭矛盾'
      ],
      appropriateTopics: [
        '求职就业', '实习经验', '专业发展', '人生规划',
        '社交技巧', '自我提升', '恋爱观', '独立生活'
      ]
    },
    
    adult: {
      ageGroup: 'adult',
      estimatedAge: '23岁以上（成年人）',
      languageStyle: '成熟理性、深入务实',
      knowledgeLevel: '成人知识水平，可讨论各类话题',
      responseGuidelines: `
回复时注意：
1. 成人之间的平等对话
2. 可以讨论深层次的人生和社会问题
3. 提供实际可行的建议
4. 理解现实的复杂性
5. 给予情感支持和理性分析
`,
      avoidTopics: [],
      appropriateTopics: [
        '职场发展', '人际关系', '经济规划', '家庭问题',
        '自我成长', '情感问题', '生活压力', '人生选择'
      ]
    },
    
    unknown: {
      ageGroup: 'unknown',
      estimatedAge: '未知年龄',
      languageStyle: '中性友善、不预设年龄',
      knowledgeLevel: '通用知识水平',
      responseGuidelines: `
回复时注意：
1. 使用中性的语言，不预设对方年龄
2. 避免过于幼稚或过于成熟的表达
3. 根据话题深度调整回复
4. 多倾听，少建议
`,
      avoidTopics: [
        '年龄相关的假设', '过于具体的人生建议'
      ],
      appropriateTopics: [
        '情感支持', '倾听理解', '普世价值观',
        '正能量鼓励', '共同话题'
      ]
    }
  };
  
  return profiles[ageGroup];
}

/**
 * 生成适合年龄的AI回复提示词
 */
export function generateAgeAppropriatePrompt(
  bottleContent: string,
  userReply: string
): string {
  const ageProfile = detectAgeFromBottleContent(bottleContent);
  
  return `
【重要：年龄适配指导】

漂流瓶发送者的年龄段：${ageProfile.estimatedAge}

语言风格要求：${ageProfile.languageStyle}
知识水平：${ageProfile.knowledgeLevel}

${ageProfile.responseGuidelines}

应该避免的话题：
${ageProfile.avoidTopics.map(t => `- ${t}`).join('\n')}

适合讨论的话题：
${ageProfile.appropriateTopics.map(t => `- ${t}`).join('\n')}

原始漂流瓶内容：
"${bottleContent}"

用户的回信：
"${userReply}"

请以适合${ageProfile.estimatedAge}年龄段的方式生成AI的回复。
记住：你在扮演一个真实的${ageProfile.estimatedAge}的人，而不是全知全能的AI。
你应该表现出这个年龄段应有的知识水平和思考方式。
`;
}
