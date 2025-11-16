/**
 * 消息通知Hook
 * 监听新消息并发送系统通知
 */

import { useEffect, useRef } from 'react';
import { Message, Conversation } from '../types';
import { sendChatNotification, sendGroupChatNotification, requestNotificationPermission, shouldSendNotification } from '../utils/notificationService';
import { getSafeAvatar } from '../utils/avatarHelper';

interface UseMessageNotificationOptions {
  conversation: Conversation;
  isActive: boolean;  // 当前对话是否激活
  userName: string;
}

export function useMessageNotification({
  conversation,
  isActive,
  userName
}: UseMessageNotificationOptions) {
  const lastMessageCountRef = useRef(0);
  const hasRequestedPermissionRef = useRef(false);

  // 首次挂载时请求通知权限
  useEffect(() => {
    if (!hasRequestedPermissionRef.current) {
      requestNotificationPermission();
      hasRequestedPermissionRef.current = true;
    }
  }, []);

  // 监听新消息
  useEffect(() => {
    const currentMessageCount = conversation.messages.length;
    
    // 跳过初始加载
    if (lastMessageCountRef.current === 0) {
      lastMessageCountRef.current = currentMessageCount;
      return;
    }

    // 检查是否有新消息
    if (currentMessageCount > lastMessageCountRef.current) {
      const newMessages = conversation.messages.slice(lastMessageCountRef.current);
      
      // 处理每条新消息
      newMessages.forEach(message => {
        // 只处理AI的消息
        if (message.role === 'assistant') {
          handleNewAIMessage(message, conversation, isActive, userName);
        }
      });

      lastMessageCountRef.current = currentMessageCount;
    }
  }, [conversation.messages, conversation, isActive, userName]);
}

/**
 * 处理新的AI消息
 */
function handleNewAIMessage(
  message: Message,
  conversation: Conversation,
  isActive: boolean,
  _userName: string
) {
  // 如果对话当前激活且用户在页面上，不发送通知
  if (isActive && !shouldSendNotification()) {
    return;
  }

  // 获取消息预览
  const preview = getMessagePreview(message);
  
  // 获取发送者信息
  const senderName = conversation.characterSettings?.nickname || conversation.name;
  const senderAvatar = getSafeAvatar(
    conversation.characterSettings?.avatar || conversation.avatar
  );

  // 根据对话类型发送不同的通知
  if (conversation.type === 'group') {
    sendGroupChatNotification(
      conversation.name,
      senderName,
      preview,
      conversation.id
    );
  } else {
    sendChatNotification(
      senderName,
      preview,
      senderAvatar,
      conversation.id
    );
  }
}

/**
 * 获取消息预览文本
 */
function getMessagePreview(message: Message): string {
  // 如果有媒体类型，返回类型描述
  if (message.mediaType) {
    const typeMap: Record<string, string> = {
      image: '[图片]',
      video: '[视频]',
      voice: '[语音]',
      sticker: '[表情包]',
      document: '[文档]'
    };
    return typeMap[message.mediaType] || '[消息]';
  }

  // 如果有网易云音乐信息
  if (message.neteaseMusicInfo) {
    return `[音乐] ${message.neteaseMusicInfo.title}`;
  }

  // 如果有转账信息
  if (message.moneyTransfer) {
    const transfer = message.moneyTransfer;
    if (transfer.type === 'redPacket' || transfer.type === 'groupRedPacket') {
      return transfer.status === 'received' ? '[收到红包]' : '[红包]';
    } else if (transfer.type === 'transfer') {
      return '[转账]';
    }
  }

  // 如果有订单信息
  if (message.order) {
    return '[礼物订单]';
  }

  // 如果有社交分享
  if (message.socialFeed) {
    return '[社交分享]';
  }

  // 如果有链接预览
  if (message.linkPreview) {
    return '[链接分享]';
  }

  // 如果有文档
  if (message.document) {
    return `[文档] ${message.document.title}`;
  }

  // 普通文本消息
  const content = message.content.trim();
  if (!content) {
    return '[消息]';
  }

  // 截取前50个字符作为预览
  if (content.length > 50) {
    return content.substring(0, 50) + '...';
  }

  return content;
}
