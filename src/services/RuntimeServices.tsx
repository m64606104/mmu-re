import React from 'react';
import type { ApiConfig, Conversation, Screen } from '../types';
import type { Message } from '../types';

import ToastContainer from '../components/ToastContainer';
import { MomentsAutoGenerator } from '../components/MomentsAutoGenerator';
import { AIMomentsInteractionManager } from '../components/AIMomentsInteractionManager';
import ProactiveMessagingService from '../components/ProactiveMessagingService';
import LetterNotification from '../components/LetterNotification';
import AchievementNotification from '../components/AchievementNotification';
import StorageMigrationPrompt from '../components/StorageMigrationPrompt';

export type RuntimeServicesProps = {
  conversations: Conversation[];
  apiConfig: ApiConfig;
  currentScreen: Screen;
  showMigrationPrompt: boolean;
  onCloseMigrationPrompt: () => void;
  onMigrationComplete: () => void;
  onNewMessage: (conversationId: string, message: Message) => void;
  onUpdateProactiveSettings: (conversationId: string, lastMessageTime: number) => void;
};

export function RuntimeServices(props: RuntimeServicesProps) {
  const {
    conversations,
    apiConfig,
    currentScreen,
    showMigrationPrompt,
    onCloseMigrationPrompt,
    onMigrationComplete,
    onNewMessage,
    onUpdateProactiveSettings,
  } = props;

  return (
    <>
      <MomentsAutoGenerator conversations={conversations} apiConfig={apiConfig} />

      <AIMomentsInteractionManager
        conversations={conversations}
        apiConfig={apiConfig}
        isActive={['social', 'chat', 'contacts', 'moments', 'profile'].includes(currentScreen)}
        isInMomentsScreen={currentScreen === 'moments'}
      />

      <ProactiveMessagingService
        conversations={conversations}
        apiConfig={apiConfig}
        onNewMessage={onNewMessage}
        onUpdateSettings={onUpdateProactiveSettings}
      />

      <ToastContainer />
      <LetterNotification />
      <AchievementNotification />

      {showMigrationPrompt && (
        <StorageMigrationPrompt onClose={onCloseMigrationPrompt} onMigrationComplete={onMigrationComplete} />
      )}
    </>
  );
}

