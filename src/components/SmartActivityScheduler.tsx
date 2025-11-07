import { useEffect, useRef } from 'react';
import { Conversation, ApiConfig } from '../types';
import { startActivityScheduler } from '../utils/smartActivityGenerator';

interface SmartActivitySchedulerProps {
  conversations: Conversation[];
  apiConfig: ApiConfig;
  intervalMinutes?: number; // 检查间隔（分钟）
}

/**
 * 智能行为轨迹调度器组件
 * 后台运行，定期为AI角色生成真实的行为轨迹
 */
const SmartActivityScheduler: React.FC<SmartActivitySchedulerProps> = ({
  conversations,
  apiConfig,
  intervalMinutes = 90 // 默认90分钟检查一次
}) => {
  const schedulerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // 检查API配置是否完整
    if (!apiConfig.baseUrl || !apiConfig.apiKey || !apiConfig.modelName) {
      console.log('⚠️ 智能行为轨迹：API配置不完整，跳过启动');
      return;
    }
    
    // 检查是否有私聊角色
    const hasPrivateChats = conversations.some(
      conv => conv.type === 'private' && conv.characterSettings
    );
    
    if (!hasPrivateChats) {
      console.log('⚠️ 智能行为轨迹：没有私聊角色，跳过启动');
      return;
    }
    
    console.log('🤖 启动智能行为轨迹调度器...');
    
    // 启动调度器
    schedulerRef.current = startActivityScheduler(
      conversations,
      apiConfig,
      intervalMinutes
    );
    
    // 清理函数
    return () => {
      if (schedulerRef.current) {
        clearInterval(schedulerRef.current);
        console.log('🛑 智能行为轨迹调度器已停止');
      }
    };
  }, [conversations, apiConfig, intervalMinutes]);
  
  // 这是一个后台服务，不渲染任何UI
  return null;
};

export default SmartActivityScheduler;
