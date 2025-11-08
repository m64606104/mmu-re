/**
 * AI朋友圈互动管理器
 * 在用户使用聊天App期间持续运行，每5分钟触发AI之间的互动
 */

import { useEffect, useRef } from 'react';
import { Conversation, ApiConfig } from '../types';
import { generateAIMomentsInteraction } from '../utils/aiMomentsGenerator';

interface AIMomentsInteractionManagerProps {
  conversations: Conversation[];
  apiConfig: ApiConfig;
  isActive: boolean; // 是否在聊天App中（social相关页面）
}

export function AIMomentsInteractionManager({ 
  conversations, 
  apiConfig, 
  isActive 
}: AIMomentsInteractionManagerProps) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isProcessingRef = useRef(false);
  const conversationsRef = useRef(conversations);
  const apiConfigRef = useRef(apiConfig);

  // 更新refs以保持最新值
  useEffect(() => {
    conversationsRef.current = conversations;
    apiConfigRef.current = apiConfig;
  }, [conversations, apiConfig]);

  // 执行AI互动
  const performInteraction = async () => {
    if (isProcessingRef.current) {
      console.log('⏸️ AI互动正在进行中，跳过本次');
      return;
    }

    isProcessingRef.current = true;

    try {
      const currentConversations = conversationsRef.current;
      const currentApiConfig = apiConfigRef.current;
      
      console.log('🤝 触发AI朋友圈互动...');
      await generateAIMomentsInteraction(currentConversations, currentApiConfig);
      console.log('✅ AI互动完成');
    } catch (error) {
      console.error('❌ AI互动失败:', error);
    } finally {
      isProcessingRef.current = false;
    }
  };

  // 管理定时器
  useEffect(() => {
    if (!isActive) {
      // 不在聊天App中，清除定时器
      if (timerRef.current) {
        console.log('🛑 离开聊天App，停止AI互动');
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // 在聊天App中，启动定时器
    console.log('🚀 进入聊天App，启动AI互动');
    
    // 首次立即执行
    performInteraction();
    
    // 之后每5分钟执行一次
    timerRef.current = setInterval(() => {
      console.log('⏰ 5分钟定时器触发，开始AI互动');
      performInteraction();
    }, 5 * 60 * 1000); // 5分钟

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive]); // 只依赖isActive

  // 这个组件不渲染任何UI
  return null;
}
