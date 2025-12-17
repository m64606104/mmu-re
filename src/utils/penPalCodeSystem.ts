/**
 * 笔友码系统
 * 允许用户通过笔友码将信箱笔友添加为私聊好友
 */

import { Letter, BottleAI } from '../types/letter';
import { Conversation, CharacterSettings } from '../types';
import { getLettersFromStorage } from './letterService';

/**
 * 生成笔友码
 * 格式：PENPAL-{receiverId的前8位}-{随机4位}
 */
export function generatePenPalCode(receiverId: string): string {
  const prefix = receiverId.substring(0, 8).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PENPAL-${prefix}-${random}`;
}

/**
 * 验证笔友码格式
 */
export function validatePenPalCodeFormat(code: string): boolean {
  const pattern = /^PENPAL-[A-Z0-9]{8}-[A-Z0-9]{4}$/;
  return pattern.test(code);
}

/**
 * 从笔友码提取receiverId前缀
 */
function extractReceiverIdPrefix(code: string): string {
  const parts = code.split('-');
  if (parts.length !== 3) return '';
  return parts[1].toLowerCase();
}

/**
 * 根据笔友码查找对应的信件
 */
export function findLetterByPenPalCode(code: string): Letter | null {
  if (!validatePenPalCodeFormat(code)) {
    return null;
  }

  const letters = getLettersFromStorage();
  const prefix = extractReceiverIdPrefix(code);

  // 查找receiverId以该前缀开头的信件
  const matchingLetter = letters.find(letter => 
    letter.receiverId.toLowerCase().startsWith(prefix) &&
    !letter.isArchived &&
    (letter.isBottle || letter.isPenPalAdded || letter.bottleAIProfile)
  );

  return matchingLetter || null;
}

/**
 * 从信件创建私聊角色
 */
export function createConversationFromLetter(
  letter: Letter,
  existingConversations: Conversation[]
): Conversation | null {
  // 检查是否已经添加过
  const exists = existingConversations.find(c => 
    c.characterSettings?.penPalSourceLetterId === letter.id
  );

  if (exists) {
    console.log('该笔友已经添加过了');
    return null;
  }

  // 构建角色设定
  const bottleAI = letter.bottleAIProfile;
  if (!bottleAI) {
    console.error('信件缺少AI人设信息');
    return null;
  }

  // 从信件对话中提取记忆
  const memoryEvents = extractMemoryFromLetter(letter);

  // 构建系统提示词
  let systemPrompt = '';
  if (bottleAI.customRolePrompt) {
    // 使用自定义的完整提示词
    systemPrompt = bottleAI.customRolePrompt;
  } else {
    // 根据基础信息构建
    systemPrompt = `你叫${bottleAI.name}。
性格：${bottleAI.personality}
所在地：${bottleAI.location}
爱好：${bottleAI.hobby}

你和用户之前通过慢邮件交流过，现在成为了微信好友。`;
  }

  const characterSettings: CharacterSettings = {
    avatar: bottleAI.avatar,
    nickname: bottleAI.name,
    username: bottleAI.name,
    systemPrompt,
    personality: bottleAI.personality,
    languageStyle: bottleAI.customBackground || '自然随和',
    languageExample: '',
    memoryEvents,
    penPalSourceLetterId: letter.id, // 标记来源信件
    disableWorldbook: true,
  };

  const newConversation: Conversation = {
    id: `penpal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'private',
    name: bottleAI.name,
    avatar: bottleAI.avatar,
    messages: [
      {
        id: `system-${Date.now()}`,
        role: 'system',
        content: `你已通过笔友码添加 ${bottleAI.name} 为好友，可以开始聊天了`,
        timestamp: Date.now(),
      }
    ],
    characterSettings,
    enabledFeatures: ['memory-system'],
    lastMessageTime: Date.now(),
    unreadCount: 0,
  };

  return newConversation;
}

/**
 * 从信件对话中提取记忆事件
 */
function extractMemoryFromLetter(letter: Letter): string {
  const memories: string[] = [];

  // 遍历所有对话轮次
  letter.conversationRounds.forEach((round, index) => {
    if (round.userLetter) {
      memories.push(`第${index + 1}轮：用户写信说：${round.userLetter.content.substring(0, 100)}...`);
    }
    if (round.aiReply) {
      memories.push(`第${index + 1}轮：我回信说：${round.aiReply.content.substring(0, 100)}...`);
    }
  });

  return memories.join('\n');
}

/**
 * 获取笔友的笔友码
 * 如果还没有生成过，则生成一个新的
 */
export function getPenPalCode(letter: Letter): string {
  // 检查是否已经有笔友码
  if (letter.penPalCode) {
    return letter.penPalCode;
  }

  // 生成新的笔友码
  return generatePenPalCode(letter.receiverId);
}

/**
 * 保存笔友码到信件
 */
export function savePenPalCodeToLetter(letter: Letter, code: string): void {
  letter.penPalCode = code;
  // 这里需要调用letterService的更新函数
  // 由于循环依赖问题，这个函数应该在调用处处理
}

/**
 * 生成笔友码分享文本
 */
export function generatePenPalShareText(letter: Letter, code: string): string {
  const name = letter.receiverName;
  return `我是 ${name}，这是我的笔友码：

${code}

在私聊软件中点击「添加好友」→「输入笔友码」，就可以把我添加为微信好友啦！`;
}
