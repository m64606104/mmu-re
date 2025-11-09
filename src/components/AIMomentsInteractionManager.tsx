/**
 * AI朋友圈智能互动管理器
 * 
 * 🎯 设计理念：
 * 1. 分阶段刷新策略（节省API调用）
 *    - 🔥 活跃期（前5分钟）：30-60秒/次
 *    - 🌤️ 过渡期（5-15分钟）：1-2分钟/次
 *    - 😴 节能期（15分钟后）：2-5分钟/次
 * 
 * 2. 事件驱动触发（即时响应）
 *    - 用户发布朋友圈 → 5-15秒后AI看到
 *    - 用户点赞/评论 → 2-5秒后AI响应
 *    - 其他AI互动 → 5-15秒后查看评论区
 * 
 * 3. AI自主决策
 *    - 完全基于AI性格和提示词决定
 *    - 无硬编码概率限制
 *    - 模拟真实人类行为
 */

import { useEffect, useRef } from 'react';
import { Conversation, ApiConfig } from '../types';
import { generateAIMomentsInteraction, generateCommentSectionInteraction } from '../utils/aiMomentsGenerator';

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
  const appActivationTime = useRef<number>(0);

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
      
      // 1️⃣ 对朋友圈本身互动（点赞、评论）
      await generateAIMomentsInteraction(currentConversations, currentApiConfig);
      
      // 2️⃣ 查看评论区并参与讨论（AI自主决定是否参与）
      await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 3000)); // 延迟3-6秒
      console.log('💬 AI们正在查看评论区...');
      await generateCommentSectionInteraction(currentConversations, currentApiConfig);
      
      console.log('✅ AI互动完成');
    } catch (error) {
      console.error('❌ AI互动失败:', error);
    } finally {
      isProcessingRef.current = false;
    }
  };

  // 🎯 智能计算刷新间隔（分阶段策略）
  const getRefreshInterval = () => {
    const now = Date.now();
    const timeSinceActivation = now - appActivationTime.current;
    
    // 📊 分阶段刷新策略
    if (timeSinceActivation < 5 * 60 * 1000) {
      // 🔥 活跃期（前5分钟）：30-60秒
      return 30000 + Math.random() * 30000;
    } else if (timeSinceActivation < 15 * 60 * 1000) {
      // 🌤️ 过渡期（5-15分钟）：1-2分钟
      return 60000 + Math.random() * 60000;
    } else {
      // 😴 节能期（15分钟后）：2-5分钟
      return 120000 + Math.random() * 180000;
    }
  };

  // 🔄 当聊天App激活时，启动智能后台刷新机制
  useEffect(() => {
    if (isActive) {
      appActivationTime.current = Date.now();
      console.log('🚀 进入聊天App，启动AI朋友圈智能刷新机制...');
      console.log('📊 刷新策略：');
      console.log('  🔥 前5分钟（活跃期）：30-60秒/次');
      console.log('  🌤️ 5-15分钟（过渡期）：1-2分钟/次');
      console.log('  😴 15分钟后（节能期）：2-5分钟/次');
      
      // 第一次触发：随机延迟3-10秒
      const initialDelay = 3000 + Math.random() * 7000;
      const initialTimer = setTimeout(() => {
        triggerSmartInteraction();
      }, initialDelay);

      // 🔄 持续刷新：动态调整间隔
      const setupNextCheck = () => {
        const nextDelay = getRefreshInterval();
        const phase = nextDelay < 61000 ? '🔥 活跃期' : nextDelay < 121000 ? '🌤️ 过渡期' : '😴 节能期';
        console.log(`⏰ 下次刷新：${Math.round(nextDelay / 1000)}秒后（${phase}）`);
        
        return setTimeout(() => {
          triggerSmartInteraction().then(() => {
            // 递归设置下一次检查
            if (isActive) {
              const nextTimer = setupNextCheck();
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

  // 触发评论区互动（单独的函数）
  const triggerCommentSectionInteraction = async () => {
    if (isProcessingRef.current) {
      return;
    }

    isProcessingRef.current = true;

    try {
      const currentConversations = conversationsRef.current;
      const currentApiConfig = apiConfigRef.current;
      
      await generateCommentSectionInteraction(currentConversations, currentApiConfig);
      console.log('✅ 评论区互动完成');
    } catch (error) {
      console.error('❌ 评论区互动失败:', error);
    } finally {
      isProcessingRef.current = false;
    }
  };

  // 暴露触发方法给外部（将来可以在发布朋友圈时调用）
  useEffect(() => {
    // @ts-ignore - 挂载到window供外部调用
    window.triggerAIMomentsInteraction = triggerSmartInteraction;
    // @ts-ignore - 评论区互动单独触发
    window.triggerAICommentSectionInteraction = triggerCommentSectionInteraction;
    
    return () => {
      // @ts-ignore
      delete window.triggerAIMomentsInteraction;
      // @ts-ignore
      delete window.triggerAICommentSectionInteraction;
    };
  }, []);

  return null;
}
