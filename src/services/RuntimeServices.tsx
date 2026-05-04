import React from 'react';
import type { ApiConfig, Conversation, Screen } from '../types';
import type { Message } from '../types';

import ToastContainer from '../components/ToastContainer';
import ProactiveMessagingService from '../components/ProactiveMessagingService';
import LetterNotification from '../components/LetterNotification';
import AchievementNotification from '../components/AchievementNotification';

export type RuntimeServicesProps = {
  conversations: Conversation[];
  apiConfig: ApiConfig;
  currentScreen: Screen;
  // Legacy props (migration prompt removed). Keep optional for compatibility with older editors/branches.
  showMigrationPrompt?: boolean;
  onCloseMigrationPrompt?: () => void;
  onMigrationComplete?: () => void;
  onNewMessage: (conversationId: string, message: Message) => void;
  onUpdateProactiveSettings: (conversationId: string, lastMessageTime: number) => void;
};

export function RuntimeServices(props: RuntimeServicesProps) {
  const {
    conversations,
    apiConfig,
    currentScreen,
    onNewMessage,
    onUpdateProactiveSettings,
  } = props;

  return (
    <>
      {/* 朋友圈模块重构中：暂时关闭旧版自动生成/互动后台服务，避免额外API调用与噪音日志 */}

      <ProactiveMessagingService
        conversations={conversations}
        apiConfig={apiConfig}
        onNewMessage={onNewMessage}
        onUpdateSettings={onUpdateProactiveSettings}
      />

      <ToastContainer />
      <LetterNotification />
      <AchievementNotification />
    </>
  );
}

