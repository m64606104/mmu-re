/**
 * 📚 分级阅读内容库
 * 根据识字量提供合适的阅读材料
 */

import { ReadingMaterial } from '../types';

/**
 * Level 1: 认字书（0-50字）
 * 单字配图，帮助婴儿期认字
 */
const level1Stories: ReadingMaterial[] = [
  {
    id: 'level1_001',
    title: '认识水果',
    content: `苹果 🍎
红色的苹果

香蕉 🍌
黄色的香蕉

葡萄 🍇
紫色的葡萄

西瓜 🍉
绿色的西瓜`,
    level: 1,
    wordCount: 8,
    category: 'picture_book',
    addedAt: Date.now(),
    readCount: 0,
    userAdded: false
  },
  {
    id: 'level1_002',
    title: '我的家人',
    content: `妈妈 👩
我的妈妈

爸爸 👨
我的爸爸

宝宝 👶
我是宝宝

家 🏠
我的家`,
    level: 1,
    wordCount: 7,
    category: 'picture_book',
    addedAt: Date.now(),
    readCount: 0,
    userAdded: false
  },
  {
    id: 'level1_003',
    title: '颜色世界',
    content: `红色 ❤️
红色的花

蓝色 💙
蓝色的天

绿色 💚
绿色的草

黄色 💛
黄色的太阳`,
    level: 1,
    wordCount: 10,
    category: 'picture_book',
    addedAt: Date.now(),
    readCount: 0,
    userAdded: false
  }
];

/**
 * Level 2: 简单故事（50-200字）
 * 短句子，幼儿期阅读
 */
const level2Stories: ReadingMaterial[] = [
  {
    id: 'level2_001',
    title: '小兔子找妈妈',
    content: `小兔子出去玩。
小兔子找不到妈妈了。
小兔子哭了。

妈妈来了。
妈妈说："宝宝不哭。"
小兔子笑了。

小兔子抱着妈妈。
小兔子很高兴。`,
    level: 2,
    wordCount: 32,
    category: 'story',
    addedAt: Date.now(),
    readCount: 0,
    userAdded: false
  },
  {
    id: 'level2_002',
    title: '苹果树',
    content: `树上有苹果。
苹果红红的。
苹果很好吃。

小鸟来了。
小鸟吃苹果。
小鸟说："真好吃！"

我也想吃苹果。
妈妈摘了苹果给我。
我说："谢谢妈妈！"`,
    level: 2,
    wordCount: 38,
    category: 'story',
    addedAt: Date.now(),
    readCount: 0,
    userAdded: false
  },
  {
    id: 'level2_003',
    title: '下雨了',
    content: `天上有云。
云变黑了。
下雨了。

小草喝水。
小花喝水。
小树喝水。

雨停了。
太阳出来了。
彩虹真漂亮！`,
    level: 2,
    wordCount: 30,
    category: 'story',
    addedAt: Date.now(),
    readCount: 0,
    userAdded: false
  }
];

/**
 * Level 3: 中篇故事（200-500字）
 * 完整情节，儿童期阅读
 */
const level3Stories: ReadingMaterial[] = [
  {
    id: 'level3_001',
    title: '小猫学本领',
    content: `小猫想学本领。

小猫去找小鸟："小鸟，你能教我飞吗？"
小鸟说："我可以教你，但是你没有翅膀呀。"
小猫想了想，说："那算了。"

小猫去找小鱼："小鱼，你能教我游泳吗？"
小鱼说："我可以教你，但是你怕水呀。"
小猫想了想，说："那算了。"

小猫回家了。小猫很难过。
妈妈问："宝贝，你怎么了？"
小猫说："我什么都不会。"

妈妈笑了："你会抓老鼠呀！这是我们猫的本领。"
小猫高兴了："对呀！我要好好练习！"

从那以后，小猫每天练习抓老鼠。
小猫成为了抓老鼠高手。
小猫明白了：每个人都有自己的本领。`,
    level: 3,
    wordCount: 168,
    category: 'story',
    addedAt: Date.now(),
    readCount: 0,
    userAdded: false
  },
  {
    id: 'level3_002',
    title: '种子的故事',
    content: `春天来了。小明拿着一颗种子。

小明把种子埋在土里。
小明给种子浇水。
小明对种子说："快快长大吧！"

第一天，什么都没有。
第二天，什么都没有。
第三天，还是什么都没有。

小明有点着急："种子怎么还不长大？"
妈妈说："别着急，种子需要时间。"

又过了几天。
小明惊喜地发现：土里冒出了小芽！
小芽绿绿的，真可爱。

小明继续浇水。
小芽慢慢长大。
长出了叶子。

又过了很久。
小芽变成了小树。
小树开花了！

小明很高兴。
小明明白了：成长需要时间和耐心。`,
    level: 3,
    wordCount: 158,
    category: 'story',
    addedAt: Date.now(),
    readCount: 0,
    userAdded: false
  }
];

/**
 * Level 4: 长篇故事（500-1000字）
 * 复杂情节，少年期阅读
 */
const level4Stories: ReadingMaterial[] = [
  {
    id: 'level4_001',
    title: '勇敢的小蚂蚁',
    content: `在一个大森林里，住着一只小蚂蚁，叫小黑。

小黑是蚂蚁家族里最小的一只。其他蚂蚁都比小黑强壮。小黑经常被大家嘲笑："你这么小，什么都做不了！"

小黑很难过，但是小黑没有放弃。小黑每天都在努力变强壮。

有一天，森林里来了一只大蜘蛛。大蜘蛛很凶，到处欺负小动物。大蜘蛛还想抓蚂蚁们当食物。

蚂蚁们都很害怕。大家都躲起来了。只有小黑站了出来。

小黑说："我们要团结起来！"
大家说："你这么小，能做什么？"
小黑说："虽然我很小，但是我们可以合作！"

小黑想了一个办法。小黑让蚂蚁们一起去搬食物。蚂蚁们搬来了很多甜的食物，放在一个陷阱旁边。

大蜘蛛闻到了甜味。大蜘蛛走过来，想吃食物。突然，大蜘蛛掉进了陷阱里！

蚂蚁们一起用泥土把陷阱填上。大蜘蛛再也出不来了。

森林又安全了。所有的蚂蚁都感谢小黑。

蚂蚁王对小黑说："你虽然很小，但是你很聪明，很勇敢。你是我们的英雄！"

小黑终于明白了：身体的大小不重要，重要的是勇气和智慧。

从那以后，再也没有蚂蚁嘲笑小黑了。小黑成为了大家的榜样。`,
    level: 4,
    wordCount: 328,
    category: 'story',
    addedAt: Date.now(),
    readCount: 0,
    userAdded: false
  }
];

/**
 * Level 5: 知识文章（1000+字）
 * 科普知识，少年期深度阅读
 */
const level5Stories: ReadingMaterial[] = [
  {
    id: 'level5_001',
    title: '星星为什么会发光',
    content: `你抬头看过夜空吗？夜空中有很多闪闪发光的星星。你知道星星为什么会发光吗？

其实，星星就像我们的太阳一样，是巨大的火球。星星里面在进行着一种特殊的反应，叫做核聚变。这个反应会产生巨大的能量，就像在星星里面燃烧着永不熄灭的火。

太阳也是一颗星星。太阳离我们很近，所以我们感觉太阳很亮，也能感受到太阳的温暖。其他的星星离我们很远很远，虽然它们实际上也很亮，但是因为太远了，所以看起来只是小小的光点。

有些星星比太阳还要大很多倍。有一颗叫做参宿四的星星，它的体积有太阳的九千多亿倍！如果把参宿四放到太阳的位置，它会把地球、火星、木星都包进去。

星星有不同的颜色。有些星星是红色的，有些是蓝色的，还有白色的和黄色的。星星的颜色取决于它的温度。红色的星星温度最低，蓝色的星星温度最高。我们的太阳是黄色的，温度在中间。

星星不是永远存在的。星星也会老去。当星星用完了所有的燃料，它就会变化。小一点的星星会慢慢变暗，最后变成白矮星。大一点的星星会发生爆炸，这种爆炸叫做超新星爆发，非常非常亮，比整个星系都要亮！

超新星爆发后，会留下一个黑洞或者中子星。黑洞很特别，它的引力非常非常大，连光都逃不出去。

我们能看到的星星，有些其实已经不存在了。因为星星离我们太远，星星的光要走很多年才能到达地球。有些星星的光走了几百年、几千年甚至几万年才到地球。所以我们现在看到的，是星星很多年前的样子。

宇宙中有数不清的星星。科学家估计，整个宇宙可能有一万亿个星系，每个星系有几千亿颗星星。这是一个多么大的数字啊！

看着星空，我们会觉得自己很渺小。但是同时，我们也应该感到幸运，因为我们生活在这个美丽的宇宙中，可以看到这些闪耀的星星。`,
    level: 5,
    wordCount: 526,
    category: 'knowledge',
    addedAt: Date.now(),
    readCount: 0,
    userAdded: false
  }
];

/**
 * 获取所有内置故事
 */
export function getAllStories(): ReadingMaterial[] {
  return [
    ...level1Stories,
    ...level2Stories,
    ...level3Stories,
    ...level4Stories,
    ...level5Stories
  ];
}

/**
 * 根据识字量推荐合适的故事
 */
export function getRecommendedStories(vocabularyCount: number): ReadingMaterial[] {
  let recommendedLevel: 1 | 2 | 3 | 4 | 5 = 1;
  
  if (vocabularyCount >= 1000) {
    recommendedLevel = 5;
  } else if (vocabularyCount >= 500) {
    recommendedLevel = 4;
  } else if (vocabularyCount >= 200) {
    recommendedLevel = 3;
  } else if (vocabularyCount >= 50) {
    recommendedLevel = 2;
  } else {
    recommendedLevel = 1;
  }

  const allStories = getAllStories();
  return allStories.filter(story => story.level <= recommendedLevel);
}

/**
 * 根据ID获取故事
 */
export function getStoryById(id: string): ReadingMaterial | undefined {
  const allStories = getAllStories();
  return allStories.find(story => story.id === id);
}

/**
 * 获取某个等级的所有故事
 */
export function getStoriesByLevel(level: 1 | 2 | 3 | 4 | 5): ReadingMaterial[] {
  const allStories = getAllStories();
  return allStories.filter(story => story.level === level);
}
