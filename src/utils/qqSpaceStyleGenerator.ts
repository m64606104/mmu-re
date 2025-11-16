/**
 * QQ空间风格内容生成器
 * 参考QQ空间的经典内容形式，增加朋友圈多样性
 */

import { CharacterSettings } from '../types';

// QQ空间内容类型
export type QQSpaceContentType = 
  | 'forward-text'      // 转发说说（纯文字）
  | 'forward-image'     // 转发说说（带图片）
  | 'novel-text'        // 小说截图/文段分享
  | 'tutorial-image'    // 教程/素材分享
  | 'game-screenshot'   // 游戏截图
  | 'music-share';      // 音乐分享

export interface QQSpaceContent {
  type: QQSpaceContentType;
  text: string;
  images?: string[];
  quotedText?: string;        // 转发的原文
  quotedAuthor?: string;      // 转发的原作者
  musicTitle?: string;        // 音乐标题
  musicArtist?: string;       // 音乐艺人
}

/**
 * 生成转发说说（纯文字）
 * 类似图5的样式：灰色引用框 + "xxx说："
 */
export const generateForwardTextContent = (_characterSettings: CharacterSettings): QQSpaceContent => {
  const forwardAuthors = [
    '一位网友', '某位大佬', '看到有人', '朋友圈看到', 
    '微博热评', '知乎高赞', '豆瓣神评', '小红书笔记'
  ];
  
  const quotedTexts = [
    '用户物底操了：刚才看到有人说孙悟空全是糕潮时喊的是"俺老孙去也"',
    '笑死我了谁能让他糕潮：我们有个不会是同一批吧',
    '突然想起之前有看过的一篇孙悟空和金箍棒的文。。。',
    '第一个想出w|x猫型的人是天才......',
    '这个能变成猫的|F线太好哭了。。',
    '不是哥们 你们有的不会是同一扁吧',
    '为什么我空间全是耍发，因为我想要说的前人们都说过了。',
    '人生得意须尽欢，莫使金樽空对月。',
    '他回口里型造了还是说话过厉了吗，我想听了之前有看过的那个有趣的故事'
  ];
  
  const reactions = [
    '笑死我了，是这样的',
    '哈哈哈哈哈哈哈哈哈哈哈',
    '确实，深有同感',
    '突死我了谁能让他糕潮',
    '笑哭了真的',
    '我也是这么想的',
    '这说的太对了',
    '绝了哈哈哈'
  ];
  
  const author = forwardAuthors[Math.floor(Math.random() * forwardAuthors.length)];
  const quoted = quotedTexts[Math.floor(Math.random() * quotedTexts.length)];
  const reaction = reactions[Math.floor(Math.random() * reactions.length)];
  
  return {
    type: 'forward-text',
    text: reaction,
    quotedText: quoted,
    quotedAuthor: author
  };
};

/**
 * 生成小说文段/文字截图说说
 * 类似图2的样式：长段落纯文字内容
 */
export const generateNovelTextContent = (_characterSettings: CharacterSettings): QQSpaceContent => {
  const novelTexts = [
    `这段很萌...两个人互相取暖......

他拿心下的春帆跃散了，那是痛苦的尖布下，是缱绻，是依恋，是跌倒的方法，温暖依依的痒布，编辑提纲。但他的王措远远了呢，似乎还在追亮他，似乎还在瑜亮，他的王还是一个人的孩子。那种肖似一个音言：辞足足这还你，周是否见有，周期蒂长行不是用用疼，他就一个人狐痴，他看有你很的小泡，那肯卢酸吗，虎鹿它还。它还有下梭，他能否除体来，以为有无意时，以及想果他说在鼻里的，依旧你该美不梗前是的。

他回口里型造了还真过厉了吗，他的王摇了地，是那名不周春里有不是吗，似乎它下的法物，他有像你该这用作了。只是还好了，它还是你地了摆，纯呈还这故子才只会儿。`,
    
    `某段很萌...在个人互相取暖...…..
    
大的的心，也许他就可还一二人一件物或了。也好果等待他，他也想任天下心的里，也那不该虎落了，他还在天或或看了。他是去它有不下了，他还在天地又不该天事不了了起我了。也天地或去不个这么回事，他还是去不个看着天事。不是人二个，是二个人都不是错一个人，是二个人在二个错里，不该一个人在二个错了起。天二，他有不个这个里，还去一个人，天这么回事，天个个回事。也天想人想去不个下不事了，他还天只有天这下天只有天个里。这天想起或不该回下，天个个的人在二个里，还去天一个人这个下事天想不。`,
    
    `这段很好..两个人互相取暖......

晚冬深处，隐匿在夜幕里，正深蓝不明朗它往，是深蓝是蓝呢，虽是暮色不可赔，都晚差不那灰它的的，那是生空那天看暮了。隐匿在其实还是要不太灰，似是呈现了。只是赏迹这故意不才好呢？
    
晚间它里塑了，那么秦到有者说还信全象潜的是在"俺老孫云也"`,
  ];
  
  // const intros = ['这段很萌...', '看到这段文字，感触很深', '某段很萌...', '这段很好..', '分享一段很有感触的文字'];
  
  const text = novelTexts[Math.floor(Math.random() * novelTexts.length)];
  
  return {
    type: 'novel-text',
    text: text
  };
};

/**
 * 生成教程/素材分享
 * 类似图3的样式：多张教程图片 + 简短介绍
 */
export const generateTutorialContent = (_characterSettings: CharacterSettings): QQSpaceContent => {
  const tutorials = [
    {
      title: '领子教学',
      desc: '有关衣服领子的绘制画法参考教程，很实用，特需学习呢~',
      images: ['tutorial_collar_1', 'tutorial_collar_2', 'tutorial_collar_3']
    },
    {
      title: '手部画法',
      desc: '手部绘制教程分享，各种手势参考～超详细！',
      images: ['tutorial_hand_1', 'tutorial_hand_2', 'tutorial_hand_3']
    },
    {
      title: '头发画法',
      desc: '头发绘制技巧教程，各种发型都有～',
      images: ['tutorial_hair_1', 'tutorial_hair_2', 'tutorial_hair_3']
    },
    {
      title: '表情参考',
      desc: '超全表情参考图！各种情绪都有～',
      images: ['tutorial_expression_1', 'tutorial_expression_2']
    },
    {
      title: 'PS技巧',
      desc: '分享一些实用的PS小技巧，新手友好～',
      images: ['tutorial_ps_1', 'tutorial_ps_2', 'tutorial_ps_3']
    }
  ];
  
  const tutorial = tutorials[Math.floor(Math.random() * tutorials.length)];
  
  return {
    type: 'tutorial-image',
    text: `${tutorial.title}：${tutorial.desc}`,
    images: tutorial.images
  };
};

/**
 * 生成游戏截图说说
 * 类似图1和图4的样式：游戏画面截图 + 游戏相关吐槽
 */
export const generateGameScreenshotContent = (_characterSettings: CharacterSettings): QQSpaceContent => {
  const gameContents = [
    {
      text: '啊啊啊啊啊哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈///：///。。。///：OK///：好吧///。。///：我求你了///：我就是在等这样的评论///。。。///：你看，这不有困捕吗',
      game: 'Minecraft',
      imageCount: 1
    },
    {
      text: '我要哭了这个结尾到底怎么打',
      game: '游戏',
      imageCount: 3
    },
    {
      text: '终于通关了！！！撒花🎉',
      game: '游戏',
      imageCount: 2
    },
    {
      text: '这个boss太难了吧救命',
      game: '游戏',
      imageCount: 2
    },
    {
      text: '新皮肤get✓ 好看吗',
      game: '游戏',
      imageCount: 1
    }
  ];
  
  const content = gameContents[Math.floor(Math.random() * gameContents.length)];
  const images = Array(content.imageCount).fill(0).map((_, i) => `game_screenshot_${i + 1}`);
  
  return {
    type: 'game-screenshot',
    text: content.text,
    images: images
  };
};

/**
 * 生成音乐分享说说
 */
export const generateMusicShareContent = (_characterSettings: CharacterSettings): QQSpaceContent => {
  const musicShares = [
    {
      title: '起风了',
      artist: '买辣椒也用券',
      comment: '单曲循环中...'
    },
    {
      title: '芒种',
      artist: '音阙诗听 / 赵方婧',
      comment: '这首歌太好听了'
    },
    {
      title: '红色高跟鞋',
      artist: '蔡健雅',
      comment: '经典老歌，百听不厌'
    },
    {
      title: '晴天',
      artist: '周杰伦',
      comment: '青春的回忆'
    }
  ];
  
  const music = musicShares[Math.floor(Math.random() * musicShares.length)];
  
  return {
    type: 'music-share',
    text: music.comment,
    musicTitle: music.title,
    musicArtist: music.artist
  };
};

/**
 * 根据AI性格和时间推荐QQ空间内容类型
 */
export const recommendQQSpaceContentType = (
  characterSettings: CharacterSettings,
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
): QQSpaceContentType => {
  const personality = characterSettings.personality?.toLowerCase() || '';
  
  // 活泼型AI偏好游戏和音乐
  if (personality.includes('活泼') || personality.includes('开朗')) {
    const types: QQSpaceContentType[] = ['game-screenshot', 'music-share', 'forward-text'];
    return types[Math.floor(Math.random() * types.length)];
  }
  
  // 文艺型AI偏好文字和音乐
  if (personality.includes('文艺') || personality.includes('温柔')) {
    const types: QQSpaceContentType[] = ['novel-text', 'music-share', 'forward-text'];
    return types[Math.floor(Math.random() * types.length)];
  }
  
  // 理性型AI偏好教程和转发
  if (personality.includes('理性') || personality.includes('专业')) {
    const types: QQSpaceContentType[] = ['tutorial-image', 'forward-text'];
    return types[Math.floor(Math.random() * types.length)];
  }
  
  // 晚上更倾向于分享文字和音乐
  if (timeOfDay === 'night') {
    const types: QQSpaceContentType[] = ['novel-text', 'music-share', 'forward-text'];
    return types[Math.floor(Math.random() * types.length)];
  }
  
  // 默认随机
  const allTypes: QQSpaceContentType[] = [
    'forward-text',
    'forward-image',
    'novel-text',
    'tutorial-image',
    'game-screenshot',
    'music-share'
  ];
  return allTypes[Math.floor(Math.random() * allTypes.length)];
};

/**
 * 生成QQ空间风格内容
 */
export const generateQQSpaceContent = (
  characterSettings: CharacterSettings,
  contentType?: QQSpaceContentType
): QQSpaceContent => {
  const now = new Date();
  const hour = now.getHours();
  const timeOfDay = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : hour < 22 ? 'evening' : 'night';
  
  const type = contentType || recommendQQSpaceContentType(characterSettings, timeOfDay);
  
  switch (type) {
    case 'forward-text':
    case 'forward-image':
      return generateForwardTextContent(characterSettings);
    
    case 'novel-text':
      return generateNovelTextContent(characterSettings);
    
    case 'tutorial-image':
      return generateTutorialContent(characterSettings);
    
    case 'game-screenshot':
      return generateGameScreenshotContent(characterSettings);
    
    case 'music-share':
      return generateMusicShareContent(characterSettings);
    
    default:
      return generateForwardTextContent(characterSettings);
  }
};

/**
 * 格式化QQ空间内容为朋友圈文本
 * 模拟QQ空间的显示样式
 */
export const formatQQSpaceContentForMoments = (content: QQSpaceContent): string => {
  switch (content.type) {
    case 'forward-text':
    case 'forward-image':
      // 转发说说格式：评论 + 引用框
      return `${content.text}\n\n${content.quotedAuthor}说：${content.quotedText}`;
    
    case 'novel-text':
      // 纯文字说说：直接返回文本
      return content.text;
    
    case 'tutorial-image':
      // 教程分享：标题 + 描述
      return content.text;
    
    case 'game-screenshot':
      // 游戏截图：吐槽文字
      return content.text;
    
    case 'music-share':
      // 音乐分享：评论 + 音乐信息
      return `${content.text}\n\n🎵 ${content.musicTitle} - ${content.musicArtist}`;
    
    default:
      return content.text;
  }
};
