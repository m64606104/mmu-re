/**
 * 🧪 测试模式指令处理
 * 识别并处理用户在聊天中输入的测试模式指令
 */

import { AIChildData } from '../types';
import { smartLoad, smartSave } from './storage';

/**
 * 检测用户消息是否包含测试模式指令
 * @returns {age: number} 如果是年龄设置指令，返回年龄；{reset: true} 如果是还原指令；null 如果不是指令
 */
export function detectTestModeCommand(message: string): { age?: number; reset?: boolean } | null {
  const msg = message.trim().toLowerCase();
  
  // 识别还原指令
  if (
    msg.includes('还原') || 
    msg.includes('恢复') ||
    msg.includes('重置') ||
    msg.includes('回到原来') ||
    msg.includes('原始状态')
  ) {
    return { reset: true };
  }
  
  // 识别年龄设置指令：匹配各种格式
  // "现在进入7岁"、"进入7岁阶段"、"现在13岁"、"变成5岁"等
  const agePatterns = [
    /(?:现在)?(?:进入|变成|成为)?\s*(\d+)\s*岁/,
    /(?:现在)?(?:进入|变成|成为)?\s*(\d+)\s*岁(?:阶段)?/,
    /(\d+)\s*岁(?:模式|阶段)/
  ];
  
  for (const pattern of agePatterns) {
    const match = msg.match(pattern);
    if (match) {
      const age = parseInt(match[1]);
      if (age >= 0 && age <= 20) { // 限制年龄范围0-20岁
        return { age };
      }
    }
  }
  
  return null;
}

/**
 * 执行测试模式指令
 */
export async function executeTestModeCommand(
  childId: string,
  command: { age?: number; reset?: boolean }
): Promise<{ success: boolean; message: string }> {
  try {
    const conversations = await smartLoad('conversations') as any[] || [];
    const index = conversations.findIndex((c: any) => c.id === childId);
    
    if (index === -1 || !conversations[index].aiChildData) {
      return { success: false, message: '找不到AI数据' };
    }
    
    const childData: AIChildData = conversations[index].aiChildData;
    
    // 检查是否开启了测试模式
    if (!childData.testMode) {
      return { 
        success: false, 
        message: '请先在AI儿童设置中开启测试模式' 
      };
    }
    
    if (command.reset) {
      // 还原原始状态
      childData.testAge = undefined;
      await smartSave('conversations', conversations);
      
      return {
        success: true,
        message: `好的！我已经回到原来的状态了～`
      };
    }
    
    if (command.age !== undefined) {
      // 设置测试年龄
      childData.testAge = command.age;
      await smartSave('conversations', conversations);
      
      const ageDesc = getAgeDescription(command.age);
      return {
        success: true,
        message: `好的！我现在是${command.age}岁了～ ${ageDesc}`
      };
    }
    
    return { success: false, message: '无效的指令' };
  } catch (error) {
    console.error('执行测试模式指令失败:', error);
    return { success: false, message: '指令执行失败' };
  }
}

/**
 * 根据年龄获取描述
 */
function getAgeDescription(age: number): string {
  if (age <= 1) return '我还是个小宝宝呢！';
  if (age <= 3) return '我是幼儿园小朋友！';
  if (age <= 6) return '我在上幼儿园大班！';
  if (age <= 9) return '我是小学生啦！';
  if (age <= 12) return '我上小学高年级了！';
  if (age <= 15) return '我现在是初中生！';
  if (age <= 18) return '我是高中生了！';
  return '我已经成年了！';
}

/**
 * 获取测试模式下的AI人设描述
 */
export function getTestModePersona(childData: AIChildData): string | null {
  if (!childData.testMode || childData.testAge === undefined) {
    return null;
  }
  
  const age = childData.testAge;
  const gender = childData.gender || 'neutral';
  const genderText = gender === 'male' ? '男孩' : gender === 'female' ? '女孩' : '孩子';
  
  // 根据年龄生成详细的人设描述
  if (age <= 1) {
    return `你现在是一个${age}岁的小宝宝，刚学会说话。你的词汇量很少，说话很简单，经常用叠词（如"饭饭"、"抱抱"），对世界充满好奇但认知有限。你很依赖照顾者，容易哭闹，需要很多关爱。`;
  }
  
  if (age <= 3) {
    return `你现在是一个${age}岁的${genderText}，正在上幼儿园小班。你的语言能力在快速发展，能说简单的句子但有时会说错。你对身边的事物充满好奇，喜欢问"为什么"，喜欢玩具和游戏。你开始有自己的想法，有时会任性。`;
  }
  
  if (age <= 6) {
    return `你现在是一个${age}岁的${genderText}，在上幼儿园大班或学前班。你能用完整的句子交流，词汇量大约500-1000个。你喜欢听故事、画画、唱歌。你开始理解简单的规则，能和小朋友一起玩耍，但有时还是会闹小脾气。你对上小学既期待又紧张。`;
  }
  
  if (age <= 9) {
    return `你现在是一个${age}岁的${genderText}，正在上小学低年级（1-3年级）。你能流利地表达自己的想法，词汇量约2000-3000个。你在学习拼音、算术、认字。你有了好朋友，开始理解友谊。你对学校生活、老师、同学都有自己的看法。你喜欢玩耍，但也知道要完成作业。`;
  }
  
  if (age <= 12) {
    return `你现在是一个${age}岁的${genderText}，正在上小学高年级（4-6年级）。你的表达能力已经很好，词汇量约4000-5000个。你开始有更复杂的情感，对同龄人的看法很在意。你有自己的兴趣爱好和小秘密。你对世界有了更多认识，开始思考一些深层次的问题。学业压力增加，你有时会感到压力。`;
  }
  
  if (age <= 15) {
    return `你现在是一个${age}岁的${genderText}，正在上初中。你处于青春期，情绪波动大，有时会叛逆。你开始形成自己的价值观，对父母和权威有时会质疑。你关注同龄人的评价，在意自己的形象。你对异性产生好奇，有自己的小心思。学业压力大，你有时会焦虑。你的表达更成熟，但有时也会用网络用语。`;
  }
  
  if (age <= 18) {
    return `你现在是一个${age}岁的${genderText}，正在上高中。你面临高考压力，情绪复杂。你开始思考人生方向、未来职业。你的思维更成熟，能进行深入的讨论，但也保留着青少年的敏感和冲动。你对社会问题有自己的看法，渴望独立但又需要支持。你可能会感到迷茫和压力。`;
  }
  
  return `你现在是一个${age}岁的成年人，有独立的思想和判断能力。你能进行成熟的对话，表达清晰有逻辑。你有自己的价值观和人生经历，能理解复杂的情感和社会现象。`;
}
