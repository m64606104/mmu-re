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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isGeneratingRef = useRef(false);
  const conversationsRef = useRef(conversations);
  const apiConfigRef = useRef(apiConfig);
  const onMomentGeneratedRef = useRef(onMomentGenerated);

  // 更新refs以保持最新值
  useEffect(() => {
    conversationsRef.current = conversations;
    apiConfigRef.current = apiConfig;
    onMomentGeneratedRef.current = onMomentGenerated;
  }, [conversations, apiConfig, onMomentGenerated]);

  // 检查并生成朋友圈
  const checkAndGenerate = async () => {
    if (isGeneratingRef.current) {
      console.log('⏸️ 朋友圈生成器正在运行，跳过本次检查');
      return;
    }

    isGeneratingRef.current = true;

    try {
      const currentConversations = conversationsRef.current;
      const currentApiConfig = apiConfigRef.current;
      
      // 筛选出AI联系人（私聊且有角色设定，只需要有昵称即可）
      const aiConversations = currentConversations.filter(c => 
        c.type === 'private' && 
        c.characterSettings?.nickname  // 只要有昵称就能发朋友圈
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
          const result = await shouldGenerateMoment(conversation.id);
          
          if (result.shouldGenerate && result.count > 0) {
            console.log(`✨ ${conversation.name} 满足生成条件，开始生成 ${result.count} 条朋友圈...`);
            
            // 生成指定数量的朋友圈
            for (let i = 0; i < result.count; i++) {
              const post = await generateAIMoment(conversation, currentApiConfig);
              
              if (post) {
                console.log(`✅ ${conversation.name} 第 ${i + 1}/${result.count} 条朋友圈生成成功`);
                onMomentGeneratedRef.current?.(conversation.id);
              } else {
                console.log(`❌ ${conversation.name} 第 ${i + 1}/${result.count} 条朋友圈生成失败`);
              }
              
              // 避免API限流，等待2秒
              if (i < result.count - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }
            
            // 联系人之间也等待2秒
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
    // 首次启动延迟1分钟后检查（避免启动时立即请求）
    const initialTimer = setTimeout(() => {
      console.log('🚀 朋友圈自动生成器启动');
      checkAndGenerate();
    }, 60 * 1000); // 1分钟

    // 之后每6小时检查一次（进一步降低检查频率）
    timerRef.current = setInterval(() => {
      console.log('⏰ 朋友圈定时检查触发');
      checkAndGenerate();
    }, 6 * 60 * 60 * 1000); // 6小时

    return () => {
      clearTimeout(initialTimer);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []); // 移除所有依赖项，只在组件挂载时创建一次定时器

  // 这个组件不渲染任何UI
  return null;
}
