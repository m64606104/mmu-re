/**
 * 朋友圈自动生成管理器
 * 后台定时检查并生成AI朋友圈
 */

import { useEffect, useRef } from 'react';
import { Conversation, ApiConfig } from '../types';
import { shouldGenerateMoment, generateAIMoment } from '../utils/aiMomentsGenerator';

interface MomentsAutoGeneratorProps {
  conversations: Conversation[];
  apiConfig: ApiConfig;
  onMomentGenerated?: (conversationId: string) => void;
}

export function MomentsAutoGenerator({ conversations, apiConfig, onMomentGenerated }: MomentsAutoGeneratorProps) {
  const timerRef = useRef<number | null>(null);
  const isGeneratingRef = useRef(false);

  // 检查并生成朋友圈
  const checkAndGenerate = async () => {
    if (isGeneratingRef.current) {
      console.log('⏸️ 朋友圈生成器正在运行，跳过本次检查');
      return;
    }

    isGeneratingRef.current = true;

    try {
      // 筛选出AI联系人（私聊且有角色设定）
      const aiConversations = conversations.filter(c => 
        c.type === 'private' && 
        c.characterSettings?.nickname &&
        c.characterSettings?.systemPrompt
      );

      if (aiConversations.length === 0) {
        console.log('📭 没有配置AI角色的联系人');
        isGeneratingRef.current = false;
        return;
      }

      console.log(`🔍 检查 ${aiConversations.length} 个AI联系人的朋友圈生成条件...`);

      for (const conversation of aiConversations) {
        try {
          // 检查是否应该生成
          const shouldGenerate = await shouldGenerateMoment(conversation.id);
          
          if (shouldGenerate) {
            console.log(`✨ ${conversation.name} 满足生成条件，开始生成朋友圈...`);
            
            // 生成朋友圈
            const post = await generateAIMoment(conversation, apiConfig);
            
            if (post) {
              console.log(`✅ ${conversation.name} 朋友圈生成成功`);
              onMomentGenerated?.(conversation.id);
            } else {
              console.log(`❌ ${conversation.name} 朋友圈生成失败`);
            }
            
            // 避免API限流，等待2秒
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          console.error(`❌ ${conversation.name} 检查/生成失败:`, error);
        }
      }
    } catch (error) {
      console.error('❌ 朋友圈自动生成器错误:', error);
    } finally {
      isGeneratingRef.current = false;
    }
  };

  // 设置定时器
  useEffect(() => {
    // 首次启动延迟3秒后检查
    const initialTimer = setTimeout(() => {
      console.log('🚀 朋友圈自动生成器启动');
      checkAndGenerate();
    }, 3000);

    // 之后每30分钟检查一次
    timerRef.current = window.setInterval(() => {
      console.log('⏰ 朋友圈定时检查触发');
      checkAndGenerate();
    }, 30 * 60 * 1000) as unknown as number; // 30分钟

    return () => {
      clearTimeout(initialTimer);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [conversations, apiConfig]);

  // 这个组件不渲染任何UI
  return null;
}
