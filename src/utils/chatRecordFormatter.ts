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
  
  // 分析参与者信息
  const participants = new Set<string>();
  messages.forEach(msg => {
    const senderName = msg.role === 'user' ? '用户' : (sourceName || 'AI助手');
    participants.add(senderName);
  });
  
  const header = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 转发的聊天记录
📍 来源：${sourceTypeText}「${sourceName}」
📅 时间范围：${new Date(messages[0]?.timestamp || Date.now()).toLocaleString()} - ${new Date(messages[messages.length - 1]?.timestamp || Date.now()).toLocaleString()}
👥 参与者：${Array.from(participants).join('、')} (共${participants.size}人)
💬 对话内容：共 ${messages.length} 条消息
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 以下是完整的对话记录，请仔细阅读每条消息：`;

  const formattedMessages = messages.map((message, index) => {
    const senderName = message.role === 'user' ? '用户' : (sourceName || 'AI助手');
    const timestamp = new Date(message.timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    let content = '';
    
    // 处理不同类型的消息
    if (message.content) {
      content = message.content;
    }
    
    // 添加特殊消息类型信息
    const attachments = [];
    
    if (message.document) {
      attachments.push(`[📄文档] ${message.document.title}`);
      if (message.document.content) {
        attachments.push(`文档内容：${message.document.content.substring(0, 100)}${message.document.content.length > 100 ? '...' : ''}`);
      }
    }
    
    if (message.moneyTransfer) {
      const type = message.moneyTransfer.type === 'redPacket' ? '红包' : '转账';
      const status = message.moneyTransfer.status === 'pending' ? '待领取' : 
                   message.moneyTransfer.status === 'received' ? '已领取' : '已退回';
      attachments.push(`[💰${type}] ¥${message.moneyTransfer.amount} - ${status}`);
      if (message.moneyTransfer.message) {
        attachments.push(`留言：${message.moneyTransfer.message}`);
      }
    }
    
    if (message.mediaType) {
      let mediaText = '';
      switch (message.mediaType) {
        case 'image':
          mediaText = `[🖼️图片] ${message.mediaDescription || ''}`;
          break;
        case 'video':
          mediaText = `[🎥视频] ${message.mediaDescription || ''}`;
          break;
        case 'voice':
          mediaText = `[🎤语音] ${message.content || ''}${message.voiceDuration ? ` (${message.voiceDuration}秒)` : ''}`;
          break;
        case 'sticker':
          mediaText = `[😊表情包] ${message.mediaDescription || ''}`;
          break;
      }
      if (mediaText) {
        attachments.push(mediaText);
      }
    }
    
    if (message.order) {
      const type = message.order.type === 'gift' ? '礼物' : '代付请求';
      const products = message.order.products.map(p => `${p.name} ¥${p.price}`).join('、');
      const status = message.order.status === 'pending' ? '待处理' : 
                   message.order.status === 'accepted' ? '已接受' : 
                   message.order.status === 'paid' ? '已支付' : '已拒绝';
      attachments.push(`[🎁${type}] ${products} - 总计¥${message.order.totalAmount} - ${status}`);
      if (message.order.message) {
        attachments.push(`留言：${message.order.message}`);
      }
    }
    
    // 构建更自然的消息格式，像真实聊天记录
    const messageNumber = `[${index + 1}/${messages.length}]`;
    let messageText = `${messageNumber} ${timestamp} ${senderName}:`;
    
    if (content || attachments.length > 0) {
      if (content) {
        // 如果内容较长，进行适当换行
        const formattedContent = content.length > 100 
          ? content.replace(/。/g, '。\n     ').trim()
          : content;
        messageText += `\n     ${formattedContent}`;
      }
      
      if (attachments.length > 0) {
        messageText += content ? '\n' : '';
        messageText += `\n     ${attachments.join('\n     ')}`;
      }
    } else {
      messageText += '\n     (此消息无文本内容)';
    }
    
    return messageText;
  }).join('\n\n');

  const footer = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
以上是转发的聊天记录，请结合这些内容进行回复。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

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
