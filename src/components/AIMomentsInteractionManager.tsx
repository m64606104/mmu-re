/**
 * AI朋友圈智能互动管理器
 * 模拟真实的人类行为：
 * - 不是定时触发，而是基于事件
 * - AI自己决定是否互动
 * - 随机延迟，更自然
 */

import { useEffect, useRef } from 'react';
import { Conversation, ApiConfig } from '../types';
import { generateAIMomentsInteraction } from '../utils/aiMomentsGenerator';

interface AIMomentsInteractionManagerProps {
  conversations: Conversation[];
  apiConfig: ApiConfig;
  isActive: boolean;
  onMomentViewed?: () => void; // 当用户查看朋友圈时调用
}

export function AIMomentsInteractionManager({ 
  conversations, 
  apiConfig, 
  isActive 
}: AIMomentsInteractionManagerProps) {
  const isProcessingRef = useRef(false);
  const conversationsRef = useRef(conversations);
  const apiConfigRef = useRef(apiConfig);
  const lastInteractionTime = useRef<number>(0);

  // 更新refs以保持最新值
  useEffect(() => {
    conversationsRef.current = conversations;
    apiConfigRef.current = apiConfig;
  }, [conversations, apiConfig]);

  // 智能触发互动（随机延迟，模拟真人）
  const triggerSmartInteraction = async () => {
    if (isProcessingRef.current) {
      return;
    }

    // 防止频繁调用（至少间隔30秒）
    const now = Date.now();
    if (now - lastInteractionTime.current < 30 * 1000) {
      return;
    }

    isProcessingRef.current = true;
    lastInteractionTime.current = now;

    try {
      // 随机延迟0-5秒，模拟AI"看到"朋友圈的时间
      const randomDelay = Math.random() * 5000;
      await new Promise(resolve => setTimeout(resolve, randomDelay));

      const currentConversations = conversationsRef.current;
      const currentApiConfig = apiConfigRef.current;
      
      console.log('👀 AI们正在查看朋友圈...');
      await generateAIMomentsInteraction(currentConversations, currentApiConfig);
      console.log('✅ AI互动完成');
    } catch (error) {
      console.error('❌ AI互动失败:', error);
    } finally {
      isProcessingRef.current = false;
    }
  };

  // 当进入聊天App时，触发一次互动（模拟AI们在线）
  useEffect(() => {
    if (isActive) {
      console.log('🚀 进入聊天App，AI们可能会互动...');
      // 随机延迟3-10秒后触发（模拟AI不是立即看到）
      const randomDelay = 3000 + Math.random() * 7000;
      const timer = setTimeout(() => {
        triggerSmartInteraction();
      }, randomDelay);

      return () => clearTimeout(timer);
    }
  }, [isActive]);

  // 暴露触发方法给外部（将来可以在发布朋友圈时调用）
  useEffect(() => {
    // @ts-ignore - 挂载到window供外部调用
    window.triggerAIMomentsInteraction = triggerSmartInteraction;
    
    return () => {
      // @ts-ignore
      delete window.triggerAIMomentsInteraction;
    };
  }, []);

  return null;
}
