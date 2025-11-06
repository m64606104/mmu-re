/**
 * AI主动发消息后台服务组件
 * 定期检查所有对话，触发符合条件的AI主动发送消息
 */

import { useEffect, useRef } from 'react';
import { Conversation, Message, ApiConfig } from '../types';
import {
  shouldSendProactiveMessage,
  sendProactiveMessage,
  initProactiveMessaging
} from '../utils/proactiveMessaging';

interface ProactiveMessagingServiceProps {
  conversations: Conversation[];
  apiConfig: ApiConfig;
  onNewMessage: (conversationId: string, message: Message) => void;
  onUpdateSettings: (conversationId: string, lastMessageTime: number) => void;
}

export default function ProactiveMessagingService({
  conversations,
  apiConfig,
  onNewMessage,
  onUpdateSettings
}: ProactiveMessagingServiceProps) {
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);

  useEffect(() => {
    // 初始化所有启用主动消息的对话
    conversations.forEach(conv => {
      if (conv.characterSettings?.proactiveMessaging?.enabled) {
        initProactiveMessaging(conv);
      }
    });

    // 定期检查（每5分钟检查一次）
    const startChecking = () => {
      checkIntervalRef.current = setInterval(async () => {
        // 防止并发检查
        if (isCheckingRef.current) {
          return;
        }

        isCheckingRef.current = true;
        
        try {
          for (const conversation of conversations) {
            // 只检查私聊且启用了主动消息的对话
            if (
              conversation.type === 'private' &&
              conversation.characterSettings?.proactiveMessaging?.enabled &&
              shouldSendProactiveMessage(conversation)
            ) {
              await sendProactiveMessage(
                conversation,
                apiConfig,
                onNewMessage,
                onUpdateSettings
              );
              
              // 每次发送后等待1秒，避免同时发送多条消息
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } catch (error) {
          console.error('主动消息检查出错:', error);
        } finally {
          isCheckingRef.current = false;
        }
      }, 5 * 60 * 1000); // 每5分钟检查一次
    };

    startChecking();

    // 清理定时器
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [conversations, apiConfig, onNewMessage, onUpdateSettings]);

  // 这是一个后台服务，不渲染任何UI
  return null;
}
