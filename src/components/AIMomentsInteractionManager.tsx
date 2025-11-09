/**
 * AI朋友圈智能互动管理器
 * 
 * 🎯 极致节能策略：
 * 
 * 1. 聊天界面（慢速刷新）
 *    - 🐌 前5分钟：2-5分钟/次
 *    - 🐢 5分钟后：30-60分钟/次
 *    - 目的：极大降低API调用，仅保持基本活跃
 * 
 * 2. 朋友圈界面（快速刷新）
 *    - ⚡️ 30-60秒/次
 *    - 退出立即停止
 *    - 目的：用户关注朋友圈时保持高互动
 * 
 * 3. 退出朋友圈后
 *    - 🛌 1-3小时内随机刷新一次
 *    - 直到重新进入聊天或朋友圈
 *    - 目的：完全节能模式
 * 
 * 4. 事件驱动触发（即时响应）
 *    - 用户发布朋友圈 → 5-15秒后AI看到
 *    - 用户点赞/评论 → 2-5秒后AI响应
 */

import { useEffect, useRef } from 'react';
import { Conversation, ApiConfig } from '../types';
import { generateAIMomentsInteraction, generateCommentSectionInteraction } from '../utils/aiMomentsGenerator';

interface AIMomentsInteractionManagerProps {
  conversations: Conversation[];
  apiConfig: ApiConfig;
  isActive: boolean; // 聊天App是否激活
  isInMomentsScreen?: boolean; // 是否在朋友圈界面
}

export function AIMomentsInteractionManager({ 
  conversations, 
  apiConfig, 
  isActive,
  isInMomentsScreen = false
}: AIMomentsInteractionManagerProps) {
  const isProcessingRef = useRef(false);
  const conversationsRef = useRef(conversations);
  const apiConfigRef = useRef(apiConfig);
  const lastInteractionTime = useRef<number>(0);
  const appActivationTime = useRef<number>(0);
  const momentsScreenEntryTime = useRef<number>(0);
  const hasLeftMoments = useRef<boolean>(false); // 是否离开过朋友圈

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

    // 防止频繁调用（至少间隔5分钟）
    const now = Date.now();
    if (now - lastInteractionTime.current < 5 * 60 * 1000) {
      console.log('⏸️ 距上次互动不足5分钟，跳过本次');
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

  // 🎯 智能计算刷新间隔（根据界面和时长）
  const getRefreshInterval = () => {
    const now = Date.now();
    
    // ⚡️ 朋友圈界面：适度刷新（正常人不会一直盯着看）
    if (isInMomentsScreen) {
      return 180000 + Math.random() * 180000; // 3-6分钟
    }
    
    // 🛌 离开朋友圈后：极慢刷新
    if (hasLeftMoments.current) {
      return 7200000 + Math.random() * 10800000; // 2-5小时
    }
    
    // 🐌 聊天界面：根据时长调整
    const timeSinceActivation = now - appActivationTime.current;
    
    if (timeSinceActivation < 10 * 60 * 1000) {
      // 🐌 前10分钟：5-10分钟
      return 300000 + Math.random() * 300000;
    } else {
      // 🐢 10分钟后：1-2小时
      return 3600000 + Math.random() * 3600000;
    }
  };

  // 📍 监听朋友圈界面状态变化，立即重新调度刷新
  useEffect(() => {
    if (isInMomentsScreen) {
      momentsScreenEntryTime.current = Date.now();
      hasLeftMoments.current = false;
      console.log('📱 进入朋友圈界面，切换到适度刷新模式...');
      console.log('⚡️ 刷新频率：3-6分钟/次');
      
      // 🔥 立即触发一次互动，然后开始快速刷新
      triggerSmartInteraction();
      
      // 取消现有的定时器并重新设置快速刷新
      // @ts-ignore
      if (window._aiMomentsInteractionTimer) {
        // @ts-ignore
        clearTimeout(window._aiMomentsInteractionTimer);
      }
    } else if (momentsScreenEntryTime.current > 0) {
      // 离开朋友圈
      hasLeftMoments.current = true;
      console.log('🚪 离开朋友圈界面，切换到极慢刷新模式...');
      console.log('🛌 刷新频率：2-5小时/次');
      
      // 取消快速刷新定时器
      // @ts-ignore
      if (window._aiMomentsInteractionTimer) {
        // @ts-ignore
        clearTimeout(window._aiMomentsInteractionTimer);
      }
    }
  }, [isInMomentsScreen]);

  // 🔄 当聊天App激活时，启动智能后台刷新机制
  useEffect(() => {
    if (isActive) {
      appActivationTime.current = Date.now();
      hasLeftMoments.current = false;
      console.log('🚀 进入聊天App，启动AI朋友圈超级节能模式...');
      console.log('📊 刷新策略（大幅降低API请求）：');
      console.log('  🐌 聊天界面前10分钟：5-10分钟/次');
      console.log('  🐢 聊天界面10分钟后：1-2小时/次');
      console.log('  ⚡️ 朋友圈界面：3-6分钟/次');
      console.log('  🛌 离开朋友圈后：2-5小时/次');
      
      // 第一次触发：随机延迟10-30秒（避免启动时立即请求）
      const initialDelay = 10000 + Math.random() * 20000;
      const initialTimer = setTimeout(() => {
        triggerSmartInteraction();
      }, initialDelay);

      // 🔄 持续刷新：动态调整间隔
      const setupNextCheck = () => {
        const nextDelay = getRefreshInterval();
        let phase = '';
        if (isInMomentsScreen) {
          phase = '⚡️ 朋友圈模式';
        } else if (hasLeftMoments.current) {
          phase = '🛌 休眠模式';
        } else if (nextDelay < 300000) {
          phase = '🐌 聊天模式-初期';
        } else {
          phase = '🐢 聊天模式-稳定';
        }
        
        const minutes = Math.round(nextDelay / 60000);
        const seconds = Math.round(nextDelay / 1000);
        const timeStr = minutes > 0 ? `${minutes}分钟` : `${seconds}秒`;
        console.log(`⏰ 下次刷新：${timeStr}后（${phase}）`);
        
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
