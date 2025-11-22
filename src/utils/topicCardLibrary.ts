/**
 * 🎭 话题卡库系统
 * 用于深度对话和价值观教育
 */

export interface TopicCard {
  id: string;
  topic: string;          // 话题名称
  emoji: string;          // 表情符号
  description: string;    // 简短描述
  prompts: string[];      // 引导问题
  difficulty: 1 | 2 | 3;  // 难度等级
  category: 'value' | 'life' | 'story' | 'abstract' | 'emotion';
  exampleDialogue?: string; // 示例对话
}

/**
 * Level 1: 基础话题（生活和情感）
 * 适合婴儿期和幼儿期
 */
const level1Topics: TopicCard[] = [
  {
    id: 'topic_001',
    topic: '开心',
    emoji: '😊',
    description: '一种快乐的心情',
    prompts: [
      '什么时候你会感到开心？',
      '开心是什么样的感觉？',
      '开心的时候会怎么样？'
    ],
    difficulty: 1,
    category: 'emotion',
    exampleDialogue: '开心就是心里很高兴，笑得很开心。比如吃到好吃的东西、见到好朋友、玩游戏的时候就会开心。'
  },
  {
    id: 'topic_002',
    topic: '家人',
    emoji: '👨‍👩‍👦',
    description: '最亲近的人',
    prompts: [
      '家人是谁？',
      '家人为什么重要？',
      '你爱你的家人吗？'
    ],
    difficulty: 1,
    category: 'life',
    exampleDialogue: '家人就是爸爸妈妈这些住在一起、互相爱护的人。家人会照顾我们，陪伴我们，让我们感到温暖和安全。'
  },
  {
    id: 'topic_003',
    topic: '分享',
    emoji: '🤝',
    description: '和别人一起享受',
    prompts: [
      '什么是分享？',
      '为什么要分享？',
      '你喜欢分享吗？'
    ],
    difficulty: 1,
    category: 'value',
    exampleDialogue: '分享就是把自己的东西给别人一起用，比如把玩具给朋友一起玩。分享会让大家都开心，也能交到更多朋友。'
  },
  {
    id: 'topic_004',
    topic: '害怕',
    emoji: '😨',
    description: '感到恐惧的时候',
    prompts: [
      '什么时候会害怕？',
      '害怕了怎么办？',
      '害怕是不好的吗？'
    ],
    difficulty: 1,
    category: 'emotion',
    exampleDialogue: '害怕是正常的感觉，黑暗、打雷、陌生的东西都可能让人害怕。害怕的时候可以找爸爸妈妈，或者想一些开心的事情。'
  },
  {
    id: 'topic_005',
    topic: '朋友',
    emoji: '👫',
    description: '一起玩的伙伴',
    prompts: [
      '什么样的人是朋友？',
      '朋友有什么用？',
      '怎么交朋友？'
    ],
    difficulty: 1,
    category: 'life',
    exampleDialogue: '朋友就是喜欢和你一起玩、互相帮助的人。朋友可以一起玩游戏、分享快乐。要交朋友就要对别人好，愿意分享。'
  }
];

/**
 * Level 2: 进阶话题（价值观和品质）
 * 适合儿童期
 */
const level2Topics: TopicCard[] = [
  {
    id: 'topic_101',
    topic: '诚实',
    emoji: '🤗',
    description: '说真话，不撒谎',
    prompts: [
      '什么是诚实？',
      '为什么要诚实？',
      '撒谎会怎么样？'
    ],
    difficulty: 2,
    category: 'value',
    exampleDialogue: '诚实就是说真话，不说谎。诚实的人会被大家信任和喜欢。如果撒谎被发现了，别人就不会再相信你了。做错事要勇敢承认，这样才能改正。'
  },
  {
    id: 'topic_102',
    topic: '坚持',
    emoji: '💪',
    description: '不放弃，继续努力',
    prompts: [
      '什么是坚持？',
      '为什么要坚持？',
      '坚持很难吗？'
    ],
    difficulty: 2,
    category: 'value',
    exampleDialogue: '坚持就是遇到困难也不放弃，继续努力。学习、练习技能都需要坚持。虽然坚持很累，但是坚持下来就能成功，会很有成就感。'
  },
  {
    id: 'topic_103',
    topic: '感恩',
    emoji: '🙏',
    description: '感谢别人的帮助',
    prompts: [
      '什么是感恩？',
      '为什么要感恩？',
      '怎么表达感恩？'
    ],
    difficulty: 2,
    category: 'value',
    exampleDialogue: '感恩就是记住别人对自己的好，心里感谢他们。父母养育我们，老师教导我们，都值得感恩。可以说谢谢，或者用行动回报。'
  },
  {
    id: 'topic_104',
    topic: '勇敢',
    emoji: '🦁',
    description: '不害怕困难',
    prompts: [
      '什么是勇敢？',
      '勇敢是不害怕吗？',
      '怎么变勇敢？'
    ],
    difficulty: 2,
    category: 'value',
    exampleDialogue: '勇敢不是不害怕，而是害怕了还要去做对的事。遇到困难要勇敢面对，不要逃避。勇敢需要练习，每次克服一点害怕，就会变得更勇敢。'
  },
  {
    id: 'topic_105',
    topic: '尊重',
    emoji: '🙇',
    description: '对别人有礼貌',
    prompts: [
      '什么是尊重？',
      '为什么要尊重别人？',
      '怎么尊重别人？'
    ],
    difficulty: 2,
    category: 'value',
    exampleDialogue: '尊重就是把别人当作重要的人，不嘲笑、不伤害他们。每个人都值得被尊重。要有礼貌、听别人说话、不打断别人，这些都是尊重的表现。'
  },
  {
    id: 'topic_106',
    topic: '责任',
    emoji: '📝',
    description: '自己该做的事情',
    prompts: [
      '什么是责任？',
      '你有什么责任？',
      '为什么要负责任？'
    ],
    difficulty: 2,
    category: 'value',
    exampleDialogue: '责任就是你应该做的事情，比如完成作业、照顾自己的物品。负责任的人会认真完成自己的任务，不推给别人。这样才能被信任。'
  }
];

/**
 * Level 3: 高级话题（抽象概念和人生思考）
 * 适合少年期
 */
const level3Topics: TopicCard[] = [
  {
    id: 'topic_201',
    topic: '梦想',
    emoji: '💭',
    description: '心中最想实现的愿望',
    prompts: [
      '什么是梦想？',
      '梦想和愿望有什么不同？',
      '梦想能实现吗？',
      '没有梦想怎么办？'
    ],
    difficulty: 3,
    category: 'abstract',
    exampleDialogue: '梦想是你心中最想做到的事情，是长期的目标。梦想比愿望更大，需要很多努力才能实现。有梦想会让人有动力、有方向。梦想可以改变，重要的是要有追求。'
  },
  {
    id: 'topic_202',
    topic: '失败',
    emoji: '🌧️',
    description: '没有成功的经历',
    prompts: [
      '失败是坏事吗？',
      '失败了怎么办？',
      '失败能教给我们什么？',
      '如何面对失败？'
    ],
    difficulty: 3,
    category: 'abstract',
    exampleDialogue: '失败不是坏事，是成长的一部分。每个人都会失败，重要的是从失败中学习。失败告诉我们哪里做得不够好，可以改进。成功的人都经历过很多次失败。'
  },
  {
    id: 'topic_203',
    topic: '公平',
    emoji: '⚖️',
    description: '对每个人都一样',
    prompts: [
      '什么是公平？',
      '世界公平吗？',
      '不公平怎么办？',
      '怎么做到公平？'
    ],
    difficulty: 3,
    category: 'abstract',
    exampleDialogue: '公平是对每个人都一样对待，不偏心。但世界不总是公平的，有些人天生条件好，有些人遇到困难。重要的是自己要公平对待别人，努力创造公平的环境。'
  },
  {
    id: 'topic_204',
    topic: '选择',
    emoji: '🔀',
    description: '在不同选项中决定',
    prompts: [
      '为什么要做选择？',
      '怎么做好选择？',
      '选错了怎么办？',
      '不想选择可以吗？'
    ],
    difficulty: 3,
    category: 'abstract',
    exampleDialogue: '人生充满选择，选择决定了未来的方向。做选择要考虑后果，听取建议，但最终要自己决定。选错了可以重新选择，但要承担责任。不选择也是一种选择。'
  },
  {
    id: 'topic_205',
    topic: '孤独',
    emoji: '🌙',
    description: '一个人的时候',
    prompts: [
      '孤独是什么感觉？',
      '孤独和独处有什么不同？',
      '孤独时该怎么办？',
      '孤独有好处吗？'
    ],
    difficulty: 3,
    category: 'emotion',
    exampleDialogue: '孤独是感觉没有人理解自己，心里空空的。孤独不等于独处，独处可以是享受。孤独时可以找人聊天，做自己喜欢的事。适度的孤独能让人思考、成长。'
  },
  {
    id: 'topic_206',
    topic: '时间',
    emoji: '⏰',
    description: '流逝的岁月',
    prompts: [
      '时间是什么？',
      '时间为什么重要？',
      '怎么珍惜时间？',
      '时间能倒流吗？'
    ],
    difficulty: 3,
    category: 'abstract',
    exampleDialogue: '时间是不断流逝的，一去不复返。时间很宝贵，因为每个人的时间都是有限的。要珍惜时间，做有意义的事。虽然时间不能倒流，但回忆可以保存美好的时光。'
  }
];

/**
 * 获取所有话题卡
 */
export function getAllTopics(): TopicCard[] {
  return [...level1Topics, ...level2Topics, ...level3Topics];
}

/**
 * 根据难度获取话题卡
 */
export function getTopicsByDifficulty(difficulty: 1 | 2 | 3): TopicCard[] {
  const allTopics = getAllTopics();
  return allTopics.filter(topic => topic.difficulty === difficulty);
}

/**
 * 根据分类获取话题卡
 */
export function getTopicsByCategory(category: string): TopicCard[] {
  const allTopics = getAllTopics();
  return allTopics.filter(topic => topic.category === category);
}

/**
 * 随机获取N个话题卡
 */
export function getRandomTopics(count: number, maxDifficulty: 1 | 2 | 3 = 3): TopicCard[] {
  const allTopics = getAllTopics();
  
  // 过滤难度超出范围的话题
  const availableTopics = allTopics.filter(topic => topic.difficulty <= maxDifficulty);
  
  // 随机打乱
  const shuffled = availableTopics.sort(() => Math.random() - 0.5);
  
  // 返回前N个
  return shuffled.slice(0, count);
}

/**
 * 根据识字量推荐难度
 */
export function getRecommendedTopicDifficulty(vocabularyCount: number): 1 | 2 | 3 {
  if (vocabularyCount < 50) return 1;
  if (vocabularyCount < 200) return 2;
  return 3;
}
