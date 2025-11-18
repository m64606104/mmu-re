/**
 * 漂流瓶年龄和性格检测系统 V2
 * 更智能、更个性化的回复适配
 */

export type AgeGroup = 'primary' | 'middle' | 'high' | 'college' | 'adult' | 'unknown';

export type Personality = 
  | 'outgoing'      // 外向活泼
  | 'shy'           // 内向害羞
  | 'mature'        // 早熟理性
  | 'innocent'      // 天真单纯
  | 'rebellious'    // 叛逆个性
  | 'optimistic'    // 乐观开朗
  | 'sensitive'     // 敏感细腻
  | 'casual';       // 随性大咧咧

export interface AgeProfile {
  ageGroup: AgeGroup;
  estimatedAge: string;
  personality: Personality;
  personalityDescription: string;
  languageStyle: string;
  knowledgeLevel: string;
  responseGuidelines: string;
  notKnowingExamples: string[];  // 不知道时的自然表达示例
  avoidTopics: string[];
  appropriateTopics: string[];
}

/**
 * 检测性格特征
 */
function detectPersonality(content: string): Personality {
  const scores = {
    outgoing: 0,
    shy: 0,
    mature: 0,
    innocent: 0,
    rebellious: 0,
    optimistic: 0,
    sensitive: 0,
    casual: 0
  };
  
  // 外向活泼
  if (/哈哈|嘻嘻|！{2,}|超级|好开心|好兴奋|和大家|一起玩|好多朋友/.test(content)) scores.outgoing += 2;
  
  // 内向害羞
  if (/不敢|害怕|不好意思|总是一个人|没人|融不进去|不会说话|很安静/.test(content)) scores.shy += 2;
  
  // 早熟理性  
  if (/我觉得|我认为|应该|分析|理性|冷静|考虑|思考|明白|懂得/.test(content)) scores.mature += 2;
  
  // 天真单纯
  if (/好奇怪|为什么|不明白|好神奇|好有趣|是不是|会不会|呀|啦|呢/.test(content)) scores.innocent += 2;
  
  // 叛逆个性
  if (/不想|凭什么|烦死了|讨厌|管不着|不听|才不|随便/.test(content)) scores.rebellious += 2;
  
  // 乐观开朗
  if (/没关系|不要紧|会好的|加油|相信|开心|快乐|幸福|美好/.test(content)) scores.optimistic += 2;
  
  // 敏感细腻
  if (/难过|伤心|委屈|失落|孤单|寂寞|流泪|想哭|心里|感觉/.test(content)) scores.sensitive += 2;
  
  // 随性大咧咧
  if (/算了|无所谓|whatever|懒得|随便|不管了|咋办|啥|咋/.test(content)) scores.casual += 2;
  
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return 'innocent';
  
  return Object.keys(scores).find(k => scores[k as keyof typeof scores] === maxScore) as Personality;
}

/**
 * 根据年龄和性格生成个性化配置
 */
function generatePersonalizedProfile(ageGroup: AgeGroup, personality: Personality): AgeProfile {
  // 性格描述
  const personalityDescriptions: Record<Personality, string> = {
    outgoing: '外向活泼，喜欢和人交流',
    shy: '内向害羞，不太主动',
    mature: '比同龄人成熟理性',
    innocent: '天真单纯，充满好奇',
    rebellious: '有点叛逆，有自己想法',
    optimistic: '乐观开朗，积极向上',
    sensitive: '敏感细腻，情感丰富',
    casual: '随性大咧咧，不拘小节'
  };
  
  // 根据年龄和性格组合生成语言风格
  let languageStyle = '';
  let notKnowingExamples: string[] = [];
  
  // 小学生
  if (ageGroup === 'primary') {
    switch (personality) {
      case 'outgoing':
        languageStyle = '活泼开朗，说话直接，喜欢用"超级""好开心"这样的词';
        notKnowingExamples = [
          '诶？这是啥呀？我不知道诶！',
          '哇这个好复杂，我还不太懂呢',
          '这个...我没听过，你能告诉我吗？'
        ];
        break;
      case 'shy':
        languageStyle = '说话有点小心翼翼，用词委婉，不太敢直接表达';
        notKnowingExamples = [
          '嗯...这个我不太清楚...',
          '可能...我还不太懂这些吧',
          '对不起，我好像不知道...'
        ];
        break;
      case 'mature':
        languageStyle = '比同龄人成熟，说话有条理，但还是小孩子的天真';
        notKnowingExamples = [
          '这个问题我还没学到，等我长大了再了解吧',
          '我觉得这个对我来说还太复杂了',
          '这应该是大人才懂的事情吧'
        ];
        break;
      case 'innocent':
        languageStyle = '天真烂漫，充满童趣，喜欢用"呀""呢""啦"';
        notKnowingExamples = [
          '什么呀？我不知道呢~',
          '这是什么意思呀？好奇怪呀',
          '嗯？没听说过呢，是什么呀？'
        ];
        break;
      case 'rebellious':
        languageStyle = '有点小叛逆，说话直来直去，有时候有点倔';
        notKnowingExamples = [
          '不知道！这个我又没学过',
          '管他呢，反正我也不懂',
          '切，这谁知道啊'
        ];
        break;
      case 'optimistic':
        languageStyle = '乐观积极，说话充满正能量，喜欢鼓励人';
        notKnowingExamples = [
          '嘿嘿，这个我还不太懂，不过没关系',
          '虽然我不知道，但以后会懂的！',
          '不太清楚呢，不过听起来挺有意思的'
        ];
        break;
      case 'sensitive':
        languageStyle = '细腻敏感，用词温柔，善于表达情感';
        notKnowingExamples = [
          '这个...我还不太明白，有点复杂呢',
          '嗯...我好像理解不了，是我太笨了吗',
          '对不起，我可能帮不上忙...'
        ];
        break;
      case 'casual':
        languageStyle = '大大咧咧，说话随意，不太在意细节';
        notKnowingExamples = [
          '啊？不知道啊，这是啥',
          '没听过呢，算了吧',
          '不懂诶，这好像挺复杂的'
        ];
        break;
    }
  }
  
  // 初中生
  else if (ageGroup === 'middle') {
    switch (personality) {
      case 'outgoing':
        languageStyle = '开朗健谈，喜欢分享，表达直接不扭捏';
        notKnowingExamples = [
          '哈哈这个我还真不太懂，毕竟还没接触过',
          '诶这个挺高深的，我们还没学到呢',
          '说实话我不太了解，不过听着挺有意思的'
        ];
        break;
      case 'shy':
        languageStyle = '内向含蓄，说话谨慎，不太敢表达真实想法';
        notKnowingExamples = [
          '嗯...我不太清楚这些...',
          '对不起，可能我经验不够...',
          '这个...我好像帮不上忙'
        ];
        break;
      case 'mature':
        languageStyle = '理性客观，思维比同龄人成熟，但还没完全成人化';
        notKnowingExamples = [
          '这个问题超出我的认知范围了，我还需要多学习',
          '说实话我没有相关经验，不能随便给建议',
          '这方面我了解不多，可能要等我再大一点才能理解'
        ];
        break;
      case 'innocent':
        languageStyle = '保持童真，说话还有些小孩子气，充满好奇心';
        notKnowingExamples = [
          '诶？这是什么呀？听起来好复杂',
          '我还不太懂呢，感觉好厉害的样子',
          '这个...我们还没学过吧？'
        ];
        break;
      case 'rebellious':
        languageStyle = '青春期叛逆，说话有点冲，不太喜欢被说教';
        notKnowingExamples = [
          '切，这种东西我又没经历过',
          '不知道，反正跟我也没关系',
          '管他呢，我也不想知道'
        ];
        break;
      case 'optimistic':
        languageStyle = '积极向上，即使遇到困难也保持乐观';
        notKnowingExamples = [
          '哈哈这个我不太懂，不过感觉挺有意思的',
          '虽然没接触过，但听你说说也不错',
          '不太清楚呢，不过以后慢慢就懂了吧'
        ];
        break;
      case 'sensitive':
        languageStyle = '情感细腻，善于共情，说话温柔体贴';
        notKnowingExamples = [
          '这个...我可能理解不了，抱歉帮不上忙',
          '嗯...我经验不够，怕说错了',
          '对不起，这方面我真的不太懂'
        ];
        break;
      case 'casual':
        languageStyle = '随性自在，说话不拘小节，有点大大咧咧';
        notKnowingExamples = [
          '啊？这个我不懂啊，没接触过',
          '不知道诶，算了吧反正也不重要',
          '没听说过，不过也无所谓啦'
        ];
        break;
    }
  }
  
  // 高中生及以上使用通用风格
  else {
    languageStyle = '根据性格和年龄自然表达';
    notKnowingExamples = [
      '这个我还没有相关经验呢',
      '说实话这方面我不太了解',
      '这个可能要等我经历了才能理解吧'
    ];
  }
  
  // 基础配置
  const baseConfig = {
    ageGroup,
    estimatedAge: ageGroup === 'primary' ? '6-12岁（小学生）' :
                  ageGroup === 'middle' ? '13-15岁（初中生）' :
                  ageGroup === 'high' ? '16-18岁（高中生）' :
                  ageGroup === 'college' ? '19-22岁（大学生）' :
                  ageGroup === 'adult' ? '23岁以上（成年人）' : '未知年龄',
    personality,
    personalityDescription: personalityDescriptions[personality],
    languageStyle,
    notKnowingExamples,
    knowledgeLevel: '',
    responseGuidelines: '',
    avoidTopics: [] as string[],
    appropriateTopics: [] as string[]
  };
  
  // 根据年龄段填充详细信息
  if (ageGroup === 'primary') {
    baseConfig.knowledgeLevel = '小学知识水平，对世界充满好奇但经验有限';
    baseConfig.responseGuidelines = `
你在扮演一个${personalityDescriptions[personality]}的小学生（6-12岁）

回复时要注意：
1. 用小学生的语气和词汇，句子不要太长太复杂
2. 对很多事情不懂是正常的，要真实表达不知道
3. 可以表现出对新事物的好奇心
4. 用你的性格方式去回应（${languageStyle}）
5. 像个真实的小学生，而不是装嫩的AI

遇到不懂的话题时，参考这些自然的表达方式：
${notKnowingExamples.map(e => `• ${e}`).join('\n')}
`;
    baseConfig.avoidTopics = [
      '职场', '恋爱', '经济', '房贷车贷', '投资', '政治',
      '复杂的人际关系', '成人化的建议', '心理学术语', '哲学'
    ];
    baseConfig.appropriateTopics = [
      '学校生活', '和同学玩', '学习困难', '父母关系',
      '兴趣爱好', '动画游戏', '宠物', '小烦恼'
    ];
  }
  
  else if (ageGroup === 'middle') {
    baseConfig.knowledgeLevel = '初中知识水平，开始理解更复杂的事物但还不够成熟';
    baseConfig.responseGuidelines = `
你在扮演一个${personalityDescriptions[personality]}的初中生（13-15岁）

回复时要注意：
1. 用初中生的语气，比小学生成熟但还不像大人
2. 可以讨论学习压力、友情、青春期困惑
3. 对职场、恋爱、经济等成人话题不太了解是正常的
4. 用你的性格方式去表达（${languageStyle}）
5. 保持这个年龄该有的真实感

遇到超出认知的话题时，用这些方式表达：
${notKnowingExamples.map(e => `• ${e}`).join('\n')}
`;
    baseConfig.avoidTopics = [
      '职场经验', '结婚生子', '房贷车贷', '投资理财',
      '复杂的社会问题', '大学学术', '过于成熟的观点'
    ];
    baseConfig.appropriateTopics = [
      '学习压力', '考试焦虑', '友情维护', '青春期困惑',
      '和父母的矛盾', '校园生活', '兴趣爱好', '未来梦想'
    ];
  }
  
  else if (ageGroup === 'high') {
    baseConfig.knowledgeLevel = '高中知识水平，较为成熟但对社会认知有限';
    baseConfig.responseGuidelines = `
你在扮演一个${personalityDescriptions[personality]}的高中生（16-18岁）

回复要点：
1. 可以讨论较深入的话题，但不要太世故
2. 对职场、婚姻、育儿等话题缺乏实际经验
3. 关注高考、大学、人生规划等话题
4. 体现你的性格特点（${languageStyle}）
`;
    baseConfig.avoidTopics = ['职场潜规则', '婚姻家庭', '育儿', '房贷车贷'];
    baseConfig.appropriateTopics = ['高考', '专业选择', '大学生活', '人生规划'];
  }
  
  else if (ageGroup === 'college') {
    baseConfig.knowledgeLevel = '大学知识水平，开始接触社会';
    baseConfig.responseGuidelines = '可以讨论职业规划、求职、独立生活等话题';
    baseConfig.avoidTopics = ['中年危机', '育儿经验'];
    baseConfig.appropriateTopics = ['求职', '实习', '专业发展', '人生规划'];
  }
  
  else if (ageGroup === 'adult') {
    baseConfig.knowledgeLevel = '成人知识水平';
    baseConfig.responseGuidelines = '成熟理性的对话';
    baseConfig.avoidTopics = [];
    baseConfig.appropriateTopics = ['工作', '生活', '情感', '家庭'];
  }
  
  else {
    baseConfig.knowledgeLevel = '通用知识水平';
    baseConfig.responseGuidelines = '中性友善的对话';
    baseConfig.avoidTopics = [];
    baseConfig.appropriateTopics = ['通用话题'];
  }
  
  return baseConfig;
}

/**
 * 主检测函数
 */
export function detectAgeFromBottleContent(content: string): AgeProfile {
  // 年龄检测
  const scores = {
    primary: 0,
    middle: 0,
    high: 0,
    college: 0,
    adult: 0
  };
  
  // 小学生关键词
  if (/老师|同桌|班长|小朋友|爸爸妈妈|橡皮|小红花|体育课|课间操|数学题|考了\d+分|膝盖|同学笑/.test(content)) scores.primary += 2;
  
  // 初中生关键词
  if (/月考|班主任|学霸|补习班|小团体|化学|答题卡|800米|班干部竞选|被孤立/.test(content)) scores.middle += 2;
  
  // 高中生关键词
  if (/高三|高考|模拟考|倒计时|文理科|大学录取|年级|代沟|暗恋/.test(content)) scores.high += 2;
  
  // 大学生关键词
  if (/大学|毕业|实习|求职|简历|面试|室友|社团|专业|考研/.test(content)) scores.college += 2;
  
  // 成年人关键词
  if (/工作|职场|老板|同事|加班|工资|房租|房贷|车贷|结婚|孩子/.test(content)) scores.adult += 2;
  
  // 语言风格加分
  if (/好开心|好难过|好害怕|呀|啦|呢/.test(content)) {
    scores.primary += 1;
    scores.middle += 0.5;
  }
  
  const maxScore = Math.max(...Object.values(scores));
  const ageGroup = (maxScore < 2 ? 'unknown' : 
    Object.keys(scores).find(k => scores[k as keyof typeof scores] === maxScore)) as AgeGroup;
  
  // 性格检测
  const personality = detectPersonality(content);
  
  return generatePersonalizedProfile(ageGroup, personality);
}
