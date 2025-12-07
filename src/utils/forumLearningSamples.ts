import { EasyChatConversation, Message } from '../types';

// 为了兼容性，创建类型别名
type Conversation = EasyChatConversation;

/**
 * 学习样本 - 从聊天记录中提取的文本
 */
export interface LearningSample {
  text: string;
  timestamp: number;
  conversationId: string;
  isGroup: boolean;
}

/**
 * 从对话历史中提取某个角色的发言样本
 * @param conversations 所有对话列表
 * @param roleId 角色ID（联系人ID）
 * @param maxSamples 最多提取多少条样本
 * @returns 学习样本数组
 */
export function collectLearningSamples(
  conversations: Conversation[],
  roleId: string,
  maxSamples: number = 50
): LearningSample[] {
  const samples: LearningSample[] = [];

  for (const conv of conversations) {
    const isGroup = conv.type === 'group';
    
    // 判断是否是目标角色的对话
    let isTargetChat = false;
    if (isGroup) {
      // 群聊：检查participants数组
      isTargetChat = conv.participants?.includes(roleId) || false;
    } else {
      // 私聊：通过participants数组判断
      isTargetChat = conv.participants?.includes(roleId) || false;
    }

    if (!isTargetChat) continue;

    // 遍历消息，提取该角色的发言
    for (const msg of conv.messages) {
      // 只要该角色发送的消息
      if (msg.senderId !== roleId) continue;

      // 只要纯文本消息
      if (msg.type && msg.type !== 'text') continue;

      const text = msg.text?.trim() || '';

      // 过滤太短的消息（少于5个字符）
      if (text.length < 5) continue;

      // 过滤系统提示类的消息
      if (text.startsWith('[') || text.startsWith('【')) continue;

      // 将时间字符串转换为时间戳
      const timestamp = msg.fullTime || Date.now();

      samples.push({
        text,
        timestamp,
        conversationId: conv.id,
        isGroup
      });

      // 达到上限就停止
      if (samples.length >= maxSamples) {
        return samples.sort((a, b) => b.timestamp - a.timestamp);
      }
    }
  }

  // 按时间倒序排序，返回最近的发言
  return samples.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * 格式化样本为提示词文本
 * @param samples 学习样本
 * @param maxExamples 最多展示多少条示例
 * @returns 格式化后的文本
 */
export function formatSamplesForPrompt(
  samples: LearningSample[],
  maxExamples: number = 10
): string {
  if (samples.length === 0) {
    return '（该角色暂无聊天记录）';
  }

  const examples = samples.slice(0, maxExamples);
  const lines = examples.map((sample, index) => {
    const prefix = sample.isGroup ? '[群聊]' : '[私聊]';
    return `${index + 1}. ${prefix} ${sample.text}`;
  });

  return lines.join('\n');
}

/**
 * 获取样本统计信息
 */
export function getSamplesStats(samples: LearningSample[]) {
  const totalChars = samples.reduce((sum, s) => sum + s.text.length, 0);
  const avgLength = samples.length > 0 ? Math.round(totalChars / samples.length) : 0;
  const groupCount = samples.filter(s => s.isGroup).length;
  const privateCount = samples.length - groupCount;

  return {
    total: samples.length,
    avgLength,
    groupCount,
    privateCount,
    totalChars
  };
}
