import { Message, ForwardedMessage, ForwardedMessageItem } from '../types';

/**
 * 聊天记录格式化工具
 * 用于将聊天消息格式化为AI能够理解的文本格式
 */

export interface ForwardedChatRecord {
  id: string;
  sourceName: string;
  sourceType: 'main' | 'subchat';
  messages: Message[];
  timestamp: number;
}

/**
 * 将消息列表格式化为聊天记录文本
 */
export function formatChatRecord(
  messages: Message[], 
  sourceName: string, 
  sourceType: 'main' | 'subchat'
): string {
  const sourceTypeText = sourceType === 'main' ? '主对话' : '子对话';
  
  // 🔥 使用简洁清晰的格式，像真实聊天记录
  const header = `【用户转发了聊天记录给你】
来源：${sourceTypeText}「${sourceName}」
共 ${messages.length} 条消息

⚠️ 重要提示：以下是真实的聊天记录内容，请仔细阅读每一条，理解对话的上下文和细节。不要瞎编，要基于这些真实内容回复。

────────────────────────────────────`;

  const formattedMessages = messages.map((message, index) => {
    const senderName = message.role === 'user' ? '用户' : sourceName;
    const timestamp = new Date(message.timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    let content = message.content || '';
    
    // 添加特殊消息类型信息（简洁表达）
    const extras = [];
    
    if (message.document) {
      extras.push(`[文档:${message.document.title}]`);
    }
    
    if (message.moneyTransfer) {
      const type = message.moneyTransfer.type === 'redPacket' ? '红包' : '转账';
      extras.push(`[${type}:¥${message.moneyTransfer.amount}]`);
    }
    
    if (message.mediaType) {
      switch (message.mediaType) {
        case 'image':
          extras.push(message.mediaDescription ? `[图片:${message.mediaDescription}]` : '[图片]');
          break;
        case 'video':
          extras.push(message.mediaDescription ? `[视频:${message.mediaDescription}]` : '[视频]');
          break;
        case 'voice':
          extras.push(`[语音${message.voiceDuration ? `:${message.voiceDuration}秒` : ''}]`);
          break;
        case 'sticker':
          extras.push(message.mediaDescription ? `[表情包:${message.mediaDescription}]` : '[表情包]');
          break;
      }
    }
    
    if (message.order) {
      const type = message.order.type === 'gift' ? '礼物' : '代付';
      const products = message.order.products.map(p => p.name).join('、');
      extras.push(`[${type}:${products}]`);
    }
    
    // 简洁格式：[序号] 时间 发送者：内容
    const extrasText = extras.length > 0 ? ` ${extras.join(' ')}` : '';
    return `[${index + 1}] ${timestamp} ${senderName}：${content}${extrasText}`;
  }).join('\n');

  const footer = `────────────────────────────────────
以上是完整的聊天记录（${messages.length}条消息）。

💡 回复指引：
1. 仔细阅读每一条消息，理解对话内容和情境
2. 基于这些真实内容进行回复，不要编造或猜测
3. 可以总结、评论、提问或给出建议
4. 回复要自然，像朋友之间的对话`;

  return `${header}\n\n${formattedMessages}\n\n${footer}`;
}

/**
 * 创建转发消息对象
 */
export function createForwardedMessage(
  messages: Message[], 
  sourceName: string, 
  sourceType: 'main' | 'subchat'
): Message {
  const chatRecord = formatChatRecord(messages, sourceName, sourceType);
  
  // 创建转发消息项
  const forwardedItems: ForwardedMessageItem[] = messages.map(msg => ({
    senderName: msg.role === 'user' ? '用户' : 'AI助手',
    content: msg.content || '多媒体消息',
    timestamp: msg.timestamp
  }));
  
  const forwardedData: ForwardedMessage = {
    type: 'merged',
    from: {
      conversationId: '', // 这里可以传入实际的conversationId
      conversationName: sourceName,
      conversationType: 'private' // 默认为私聊
    },
    messages: forwardedItems,
    title: `${sourceType === 'main' ? '主对话' : '子对话'}「${sourceName}」的聊天记录`,
    timestamp: Date.now()
  };
  
  return {
    id: `forwarded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    role: 'user',
    content: chatRecord,
    timestamp: Date.now(),
    forwarded: forwardedData
  };
}

/**
 * 检查消息是否为转发的聊天记录
 */
export function isChatRecord(content: string): boolean {
  return content.includes('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━') && 
         content.includes('转发的聊天记录') && 
         content.includes('来源：');
}

/**
 * 从转发内容中提取摘要信息
 */
export function extractChatRecordSummary(content: string): {
  sourceName: string;
  sourceType: string;
  messageCount: number;
  timestamp: string;
} | null {
  try {
    const sourceMatch = content.match(/来源：(.+?)「(.+?)」/);
    const countMatch = content.match(/包含 (\d+) 条消息/);
    const timeMatch = content.match(/时间：(.+?)\n/);
    
    if (sourceMatch && countMatch && timeMatch) {
      return {
        sourceName: sourceMatch[2],
        sourceType: sourceMatch[1],
        messageCount: parseInt(countMatch[1]),
        timestamp: timeMatch[1]
      };
    }
  } catch (error) {
    console.error('解析聊天记录摘要失败:', error);
  }
  
  return null;
}
