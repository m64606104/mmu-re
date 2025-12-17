/**
 * 好友码系统
 * 允许用户通过好友码将信箱笔友添加为私聊好友
 */

import { Letter, BottleAI } from '../types/letter';
import { Conversation, CharacterSettings } from '../types';
import { getLettersFromStorage } from './letterService';
import { updateLetterMemoryFromLetter, linkFriendToLetterMemory } from './letterMemorySystem';

/**
 * 生成好友码
 * 格式：PENPAL-{receiverId的前8位}-{随机4位}
 */
export function generateFriendCode(receiverId: string): string {
  const prefix = receiverId.substring(0, 8).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PENPAL-${prefix}-${random}`;
}

/**
 * 验证好友码格式
 */
export function validateFriendCodeFormat(code: string): boolean {
  const pattern = /^PENPAL-[A-Z0-9]{8}-[A-Z0-9]{4}$/;
  return pattern.test(code);
}

/**
 * 从好友码提取receiverId前缀
 */
function extractReceiverIdPrefix(code: string): string {
  const parts = code.split('-');
  if (parts.length !== 3) return '';
  return parts[1].toLowerCase();
}

/**
 * 根据好友码查找对应的信件
 */
export function findLetterByFriendCode(code: string): Letter | null {
  if (!validateFriendCodeFormat(code)) {
    return null;
  }

  const letters = getLettersFromStorage();
  const prefix = extractReceiverIdPrefix(code);

  // 查找receiverId以该前缀开头的信件
  const matchingLetter = letters.find(letter => 
    letter.receiverId.toLowerCase().startsWith(prefix) &&
    !letter.isArchived &&
    (letter.isBottle || letter.isFriendAdded || letter.bottleAIProfile)
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

  const conversationId = `penpal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const newConversation: Conversation = {
    id: conversationId,
    type: 'private',
    name: bottleAI.name,
    avatar: bottleAI.avatar,
    messages: [
      {
        id: `system-${Date.now()}`,
        role: 'system',
        content: `你已通过好友码添加 ${bottleAI.name} 为好友，可以开始聊天了`,
        timestamp: Date.now(),
      }
    ],
    characterSettings,
    enabledFeatures: ['memory-system'],
    lastMessageTime: Date.now(),
    unreadCount: 0,
  };

  // 🔗 关联信件记忆到这个私聊角色
  try {
    updateLetterMemoryFromLetter(letter, conversationId);
    linkFriendToLetterMemory(conversationId, letter.id);
    console.log(`📮 已关联${bottleAI.name}的信件记忆到私聊角色`);
  } catch (error) {
    console.error('关联信件记忆失败:', error);
  }

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
 * 获取笔友的好友码
 * 如果还没有生成过，则生成一个新的
 */
export function getFriendCode(letter: Letter): string {
  // 检查是否已经有好友码
  if (letter.friendCode) {
    return letter.friendCode;
  }

  // 生成新的好友码
  return generateFriendCode(letter.receiverId);
}

/**
 * 保存好友码到信件
 */
export function saveFriendCodeToLetter(letter: Letter, code: string): void {
  letter.friendCode = code;
  // 这里需要调用letterService的更新函数
  // 由于循环依赖问题，这个函数应该在调用处处理
}

/**
 * 生成好友码分享文本
 */
export function generateFriendShareText(letter: Letter, code: string): string {
  const name = letter.receiverName;
  return `我是 ${name}，这是我的好友码：

${code}

在私聊软件中点击「添加好友」→「输入好友码」，就可以把我添加为微信好友啦！`;
}
