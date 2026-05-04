/**
 * 跨用户笔友码系统
 * 允许用户A将自己的笔友分享给用户B
 * 用户B可以通过笔友码添加该笔友，笔友会记得与用户A的交流历史
 */

import { Letter, BottleAI } from '../types/letter';
import { Conversation, CharacterSettings } from '../types';
import { getLettersFromStorage } from './letterService';
import { updateLetterMemoryFromLetter } from './letterMemorySystem';
import { getCachedData, load, save, setCachedData } from './storage';

/**
 * 笔友分享码数据结构
 */
export interface PenPalShareCode {
  code: string;                    // 笔友码
  aiProfile: BottleAI;             // AI完整人设
  letterHistory: Letter[];         // 信件历史（用于AI记忆）
  sharedBy: string;                // 分享者用户名
  sharedReason: string;            // 分享原因（用户A告诉AI的）
  createdAt: number;               // 创建时间
  expiresAt?: number;              // 过期时间（可选）
}

const SHARE_CODES_KEY = 'penpal_share_codes';

/**
 * 生成笔友分享码
 * 格式：SHARE-{userId前4位}-{aiId前4位}-{随机6位}
 */
export function generatePenPalShareCode(
  userId: string,
  aiId: string
): string {
  const userPrefix = userId.substring(0, 4).toUpperCase();
  const aiPrefix = aiId.substring(0, 4).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SHARE-${userPrefix}-${aiPrefix}-${random}`;
}

/**
 * 验证笔友分享码格式
 */
export function validatePenPalShareCodeFormat(code: string): boolean {
  const pattern = /^SHARE-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{6}$/;
  return pattern.test(code);
}

/**
 * 创建笔友分享码
 * @param receiverId AI的receiverId
 * @param sharedBy 分享者用户名
 * @param sharedReason 分享原因
 */
export function createPenPalShareCode(
  receiverId: string,
  sharedBy: string,
  sharedReason: string
): PenPalShareCode | null {
  const letters = getLettersFromStorage();
  
  // 找到与该AI的所有信件
  const aiLetters = letters.filter(
    letter => letter.receiverId === receiverId && !letter.isArchived
  );
  
  if (aiLetters.length === 0) {
    console.error('没有找到与该AI的信件');
    return null;
  }
  
  // 获取AI人设
  const aiProfile = aiLetters[0].bottleAIProfile;
  if (!aiProfile) {
    console.error('AI人设信息缺失');
    return null;
  }
  
  // 生成笔友码
  const code = generatePenPalShareCode(sharedBy, receiverId);
  
  const shareCode: PenPalShareCode = {
    code,
    aiProfile,
    letterHistory: aiLetters,
    sharedBy,
    sharedReason,
    createdAt: Date.now(),
  };
  
  // 保存到统一存储
  const allShareCodes = getAllPenPalShareCodes();
  allShareCodes.push(shareCode);
  setCachedData(SHARE_CODES_KEY, allShareCodes);
  void save(SHARE_CODES_KEY, allShareCodes);
  
  console.log(`✅ 创建笔友分享码成功: ${code}`);
  return shareCode;
}

/**
 * 获取所有笔友分享码
 */
export function getAllPenPalShareCodes(): PenPalShareCode[] {
  const cached = getCachedData<PenPalShareCode[]>(SHARE_CODES_KEY);
  return Array.isArray(cached) ? cached : [];
}

/**
 * 根据笔友码查找分享数据
 */
export function findPenPalShareCode(code: string): PenPalShareCode | null {
  if (!validatePenPalShareCodeFormat(code)) {
    return null;
  }
  
  const allCodes = getAllPenPalShareCodes();
  const shareCode = allCodes.find(sc => sc.code === code);
  
  if (!shareCode) {
    return null;
  }
  
  // 检查是否过期
  if (shareCode.expiresAt && Date.now() > shareCode.expiresAt) {
    console.log('笔友码已过期');
    return null;
  }
  
  return shareCode;
}

/**
 * 通过笔友分享码创建私聊角色
 * @param shareCode 笔友分享码数据
 * @param newUserName 新用户的名字
 */
export function createConversationFromPenPalShare(
  shareCode: PenPalShareCode,
  newUserName: string,
  existingConversations: Conversation[]
): Conversation | null {
  // 检查是否已经添加过（通过名字和人设判断）
  const exists = existingConversations.find(c => 
    c.name === shareCode.aiProfile.name && 
    c.characterSettings?.personality === shareCode.aiProfile.personality
  );
  
  if (exists) {
    console.log('该笔友已经添加过了');
    return null;
  }
  
  const aiProfile = shareCode.aiProfile;
  
  // 构建系统提示词，包含原用户的交流历史
  let systemPrompt = '';
  if (aiProfile.customRolePrompt) {
    systemPrompt = aiProfile.customRolePrompt;
  } else {
    systemPrompt = `你叫${aiProfile.name}。
性格：${aiProfile.personality}
所在地：${aiProfile.location}
爱好：${aiProfile.hobby}

【重要背景信息】：
你之前和 ${shareCode.sharedBy} 通过慢邮件交流过。
现在，${shareCode.sharedBy} 把你介绍给了他的朋友 ${newUserName}。

${shareCode.sharedBy} 告诉你：${shareCode.sharedReason}

你需要记住：
1. 你和 ${shareCode.sharedBy} 的交流历史（见下方）
2. ${newUserName} 是通过 ${shareCode.sharedBy} 认识你的
3. 你可以自然地提及你和 ${shareCode.sharedBy} 的交流，但不要过分强调
4. 对 ${newUserName} 保持友好和开放的态度`;
  }
  
  // 添加信件历史摘要
  if (shareCode.letterHistory.length > 0) {
    systemPrompt += `\n\n【你和 ${shareCode.sharedBy} 的信件交流历史】：\n`;
    shareCode.letterHistory.slice(0, 5).forEach((letter, index) => {
      const rounds = letter.conversationRounds || [];
      if (rounds.length > 0) {
        const lastRound = rounds[rounds.length - 1];
        systemPrompt += `\n第${index + 1}封信：\n`;
        systemPrompt += `${shareCode.sharedBy}写：${lastRound.userLetter.content.substring(0, 100)}...\n`;
        if (lastRound.aiReply) {
          systemPrompt += `你回复：${lastRound.aiReply.content.substring(0, 100)}...\n`;
        }
      }
    });
  }
  
  const characterSettings: CharacterSettings = {
    avatar: aiProfile.avatar,
    nickname: aiProfile.name,
    username: aiProfile.name,
    systemPrompt,
    personality: aiProfile.personality,
    languageStyle: aiProfile.customBackground || '自然随和',
    languageExample: '',
    memoryEvents: '',
    disableWorldbook: true,
  };
  
  const conversationId = `penpal-share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const newConversation: Conversation = {
    id: conversationId,
    type: 'private',
    name: aiProfile.name,
    avatar: aiProfile.avatar,
    messages: [
      {
        id: `system-${Date.now()}`,
        role: 'system',
        content: `你通过 ${shareCode.sharedBy} 的介绍认识了 ${aiProfile.name}，可以开始写信了`,
        timestamp: Date.now(),
      }
    ],
    characterSettings,
    enabledFeatures: ['memory-system'],
    lastMessageTime: Date.now(),
    unreadCount: 0,
  };
  
  console.log(`📮 已通过笔友码添加 ${aiProfile.name}`);
  return newConversation;
}

/**
 * 删除笔友分享码
 */
export function deletePenPalShareCode(code: string): boolean {
  try {
    const allCodes = getAllPenPalShareCodes();
    const filtered = allCodes.filter(sc => sc.code !== code);
    setCachedData(SHARE_CODES_KEY, filtered);
    void save(SHARE_CODES_KEY, filtered);
    return true;
  } catch (error) {
    console.error('删除笔友分享码失败:', error);
    return false;
  }
}

export async function initializePenPalShareStorage(): Promise<void> {
  try {
    const codes = await load(SHARE_CODES_KEY);
    setCachedData(SHARE_CODES_KEY, Array.isArray(codes) ? codes : []);
  } catch (error) {
    console.error('初始化笔友分享码存储失败:', error);
    setCachedData(SHARE_CODES_KEY, []);
  }
}
