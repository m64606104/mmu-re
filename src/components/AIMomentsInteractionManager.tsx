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

  // 🔄 当聊天App激活时，启动持续的后台刷新机制
  useEffect(() => {
    if (isActive) {
      console.log('🚀 进入聊天App，启动AI朋友圈后台刷新机制...');
      
      // 第一次触发：随机延迟3-10秒
      const initialDelay = 3000 + Math.random() * 7000;
      const initialTimer = setTimeout(() => {
        triggerSmartInteraction();
      }, initialDelay);

      // 🔄 持续刷新：每60-120秒随机触发一次
      const setupNextCheck = () => {
        const nextDelay = 60000 + Math.random() * 60000; // 1-2分钟
        return setTimeout(() => {
          triggerSmartInteraction().then(() => {
            // 递归设置下一次检查
            if (isActive) {
              const nextTimer = setupNextCheck();
              // 保存timer ID以便清理
              // @ts-ignore
              window._aiMomentsInteractionTimer = nextTimer;
            }
          });
        }, nextDelay);
      };

      // 等待第一次触发完成后，启动周期性刷新
      const continuousTimer = setTimeout(() => {
        const timer = setupNextCheck();
        // @ts-ignore
        window._aiMomentsInteractionTimer = timer;
      }, initialDelay + 10000); // 第一次触发后10秒开始周期

      return () => {
        clearTimeout(initialTimer);
        clearTimeout(continuousTimer);
        // @ts-ignore
        if (window._aiMomentsInteractionTimer) {
          // @ts-ignore
          clearTimeout(window._aiMomentsInteractionTimer);
        }
      };
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
