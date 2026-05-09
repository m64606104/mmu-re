/**
 * 消息转发和提取工具
 * 支持：单条转发、合并转发、提取文档
 */

import { Message, ForwardedMessage, ForwardedMessageItem, DocumentMessage } from '../types';

/**
 * 将选中的消息提取为文档
 */
export function extractMessagesToDocument(
  messages: Message[],
  conversationName: string,
  userName: string = '我'
): DocumentMessage {
  // 按时间排序
  const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);
  
  // 生成文档标题
  const startDate = new Date(sortedMessages[0].timestamp);
  const dateStr = startDate.toLocaleDateString('zh-CN');
  const title = `${conversationName}的聊天记录 - ${dateStr}`;
  
  // 生成文档内容
  const content = sortedMessages.map(msg => {
    const time = new Date(msg.timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const sender = msg.role === 'user' ? userName : conversationName;
    
    // 处理不同类型的消息
    let messageContent = msg.content;
    
    // 媒体消息
    if (msg.mediaItems && msg.mediaItems.length > 0) {
      const mediaDesc = msg.mediaItems.map(item => {
        switch (item.type) {
          case 'image': return '[图片]';
          case 'video': return '[视频]';
          case 'voice': return `[语音 ${item.duration}秒]`;
          case 'sticker': return '[表情包]';
          default: return '';
        }
      }).join(' ');
      messageContent = messageContent ? `${messageContent} ${mediaDesc}` : mediaDesc;
    }
    
    // 文档消息
    if (msg.document) {
      messageContent = `${messageContent}\n[文档: ${msg.document.title}]`;
    }
    
    // 红包/转账
    if (msg.moneyTransfer) {
      const type = msg.moneyTransfer.type === 'redPacket' ? '红包' : '转账';
      messageContent = `[${type}: ¥${msg.moneyTransfer.amount}]${msg.moneyTransfer.message ? ` ${msg.moneyTransfer.message}` : ''}`;
    }
    
    return `${time} ${sender}\n${messageContent}`;
  }).join('\n\n');
  
  return {
    title,
    content,
    type: 'text',
    greeting: `已为您提取${sortedMessages.length}条消息`
  };
}

/**
 * 创建单条转发消息
 */
export function createSingleForward(
  message: Message,
  fromConversation: {
    id: string;
    name: string;
    type: 'private' | 'group';
  }
): ForwardedMessage {
  return {
    type: 'single',
    from: {
      conversationId: fromConversation.id,
      conversationName: fromConversation.name,
      conversationType: fromConversation.type
    },
    originalMessage: message,
    timestamp: Date.now()
  };
}

/**
 * 创建合并转发消息
 */
export function createMergedForward(
  messages: Message[],
  fromConversation: {
    id: string;
    name: string;
    type: 'private' | 'group';
  },
  senderNames: Map<string, { name: string; avatar?: string }> // messageId -> sender info
): ForwardedMessage {
  // 按时间排序
  const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);
  
  // 转换为ForwardedMessageItem格式
  const forwardedItems: ForwardedMessageItem[] = sortedMessages.map(msg => {
    const senderInfo = senderNames.get(msg.id) || { 
      name: msg.role === 'user' ? '我' : fromConversation.name 
    };
    
    let content = msg.content;
    let mediaType: ForwardedMessageItem['mediaType'] = undefined;
    let mediaUrl: string | undefined = undefined;
    
    // 处理媒体消息
    if (msg.mediaItems && msg.mediaItems.length > 0) {
      const firstMedia = msg.mediaItems[0];
      mediaType = firstMedia.type;
      mediaUrl = firstMedia.url;
      
      if (!content) {
        // 如果没有文字，使用媒体描述
        content = firstMedia.description || `[${mediaType}]`;
      }
    }
    
    // 处理文档
    if (msg.document) {
      content = msg.document.title;
      mediaType = 'file';
    }
    
    return {
      senderName: senderInfo.name,
      senderAvatar: senderInfo.avatar,
      content,
      timestamp: msg.timestamp,
      mediaType,
      mediaUrl
    };
  });
  
  // 生成标题
  const title = `${fromConversation.name}的聊天记录`;
  
  return {
    type: 'merged',
    from: {
      conversationId: fromConversation.id,
      conversationName: fromConversation.name,
      conversationType: fromConversation.type
    },
    messages: forwardedItems,
    title,
    timestamp: Date.now()
  };
}

/**
 * 获取消息的简短预览文本
 */
export function getMessagePreview(message: Message, maxLength: number = 30): string {
  let preview = message.content;
  
  // 媒体消息
  if (message.mediaItems && message.mediaItems.length > 0) {
    const mediaTypes = message.mediaItems.map(item => {
      switch (item.type) {
        case 'image': return '[图片]';
        case 'video': return '[视频]';
        case 'voice': return '[语音]';
        case 'sticker': return '[表情]';
        default: return '';
      }
    }).join('');
    preview = preview ? `${mediaTypes} ${preview}` : mediaTypes;
  }
  
  // 文档消息
  if (message.document) {
    preview = `[文档] ${message.document.title}`;
  }
  
  // 红包/转账
  if (message.moneyTransfer) {
    const type = message.moneyTransfer.type === 'redPacket' ? '红包' : '转账';
    preview = `[${type}]`;
  }
  
  // 截断过长文本
  if (preview.length > maxLength) {
    preview = preview.substring(0, maxLength) + '...';
  }
  
  return preview || '[消息]';
}
