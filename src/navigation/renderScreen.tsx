import React from 'react';
import type {
  ApiConfig,
  Conversation,
  MomentPost,
  Screen,
  ShopType,
  ThemeSettings,
  UserProfile,
} from '../types';
import type { Letter } from '../types/letter';

import HomeScreen from '../components/HomeScreen';
import SettingsScreen from '../components/SettingsScreen';
import SocialScreen from '../components/SocialScreen';
import ChatScreen from '../components/ChatScreen';
import ProfileScreen from '../components/ProfileScreen';
import MomentsScreen from '../components/MomentsScreen';
import CharacterSettingsScreen from '../components/CharacterSettingsScreen';
import NewConversationScreen from '../components/NewConversationScreen';
import ContactsScreen from '../components/ContactsScreen';
import AddFriendScreen from '../components/AddFriendScreen';
import CreateGroupScreen from '../components/CreateGroupScreen';
import ThemeScreen from '../components/ThemeScreen';
import UserGuide from '../components/UserGuide';
import AnnouncementScreen from '../components/AnnouncementScreen';
import WalletScreen from '../components/WalletScreen';
import ShoppingScreen from '../components/ShoppingScreen';
import UserSystemScreen from '../components/UserSystemScreen';
import OrderHistoryScreen from '../components/OrderHistoryScreen';
import DatabaseScreen from '../components/DatabaseScreen';
import GroupedLetterBoxScreen from '../components/GroupedLetterBoxScreen';
import LetterWritingScreen from '../components/LetterWritingScreen';
import PenPalListScreen from '../components/PenPalListScreen';
import ArchivedLettersScreen from '../components/ArchivedLettersScreen';
import FavoriteLettersScreen from '../components/FavoriteLettersScreen';
import AchievementScreen from '../components/AchievementScreen';
import StampCollectionScreen from '../components/StampCollectionScreen';
import LetterNotificationCenter from '../components/LetterNotificationCenter';
import RecycleBinScreen from '../components/RecycleBinScreen';
import BottleFishingScreen from '../components/BottleFishingScreen';
import FavoriteRepliesScreen from '../components/FavoriteRepliesScreen';
import AIKindergartenScreen from '../components/AIKindergartenScreen';
import WorldbookScreen from '../components/WorldbookScreen';
import { EasyChatApp } from '../components/EasyChatApp';
import StickerManagementScreen from '../components/StickerManagementScreen';
import BottomNavBar from '../components/BottomNavBar';
import UnrepliedLettersScreen from '../components/UnrepliedLettersScreen';
import { createBackHandler } from './backNavigation';

export type RenderScreenParams = {
  currentScreen: Screen;
  currentConversationId: string | null;
  conversations: Conversation[];
  apiConfig: ApiConfig;
  userProfile: UserProfile;
  moments: MomentPost[];
  theme: ThemeSettings;
  fullscreenMode: boolean;
  currentShopType: ShopType;
  replyToLetter: Letter | null;

  setCurrentShopType: (shopType: ShopType) => void;
  setReplyToLetter: (letter: Letter | null) => void;

  navigateTo: (screen: Screen, conversationId?: string) => void;
  goBack: () => void;

  resetDesktopLayout: () => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;
  updateUserProfile: (profile: UserProfile) => void;
  updateTheme: (newTheme: ThemeSettings) => void;
  toggleFullscreenMode: (enabled: boolean) => void;
  updateApiConfig: (cfg: ApiConfig) => void;

  addMoment: (content: string, images: string[]) => void;
  likeMoment: (momentId: string) => void;
  commentMoment: (momentId: string, content: string) => void;

  onImportCharacter: (data: any) => void;
  onAddPenPal: (newConversation: Conversation) => void;
  addFriend: (friendData: {
    nickname: string;
    username: string;
    avatar: string;
    systemPrompt: string;
    personality: string;
    languageStyle: string;
    languageExample: string;
  }) => void;
  createGroup: (groupData: {
    groupName: string;
    groupRemark: string;
    groupAvatar: string;
    members: string[];
  }) => void;

  onNavigateToPrivateChat: (aiName: string) => void;

  onSendGiftToAI: (product: any, recipientId: string, recipientName: string, shopType: ShopType) => void;
  onRequestAIPay: (product: any, aiId: string, shopType: ShopType) => void;
};

export function renderScreen(params: RenderScreenParams) {
  const {
    currentScreen,
    currentConversationId,
    conversations,
    apiConfig,
    userProfile,
    moments,
    theme,
    fullscreenMode,
    currentShopType,
    replyToLetter,
    setCurrentShopType,
    setReplyToLetter,
    navigateTo,
    goBack: rawGoBack,
    resetDesktopLayout,
    updateConversation,
    deleteConversation,
    updateUserProfile,
    updateTheme,
    toggleFullscreenMode,
    updateApiConfig,
    addMoment,
    likeMoment,
    commentMoment,
    onImportCharacter,
    onAddPenPal,
    addFriend,
    createGroup,
    onNavigateToPrivateChat,
    onSendGiftToAI,
    onRequestAIPay,
  } = params;

  const currentConversation = conversations.find(c => c.id === currentConversationId);
  const goBack = createBackHandler(currentScreen, { goBack: rawGoBack, setReplyToLetter });
  const renderSocialFallback = () => (
    <SocialScreen
      conversations={conversations}
      onNavigate={navigateTo}
      onImportCharacter={onImportCharacter}
      onUpdateConversation={updateConversation}
    />
  );

  switch (currentScreen) {
    case 'home':
      return <HomeScreen onNavigate={navigateTo} theme={theme} />;
    case 'chat':
      return currentConversation ? (
        <ChatScreen
          conversation={currentConversation}
          apiConfig={apiConfig}
          currentUserProfile={userProfile}
          conversations={conversations}
          onUpdateConversation={updateConversation}
          onDeleteConversation={deleteConversation}
          onBack={goBack}
          onOpenCharacterSettings={() => navigateTo('character-settings')}
          onNavigateToPrivateChat={onNavigateToPrivateChat}
        />
      ) : (
        renderSocialFallback()
      );
    case 'social':
      return (
        <SocialScreen
          conversations={conversations}
          onNavigate={navigateTo}
          onImportCharacter={onImportCharacter}
          onUpdateConversation={updateConversation}
        />
      );
    case 'moments':
      return (
        <MomentsScreen
          moments={moments}
          conversations={conversations}
          userProfile={userProfile}
          apiConfig={apiConfig}
          onAddMoment={addMoment}
          onLikeMoment={likeMoment}
          onCommentMoment={commentMoment}
          onBack={goBack}
        />
      );
    case 'profile':
      return (
        <ProfileScreen
          userProfile={userProfile}
          onUpdateProfile={updateUserProfile}
          onNavigate={navigateTo}
          onBack={goBack}
          momentsCount={moments.length}
          contactsCount={conversations.filter(c => c.type === 'private').length}
        />
      );
    case 'settings':
      return (
        <SettingsScreen
          apiConfig={apiConfig}
          onUpdateConfig={updateApiConfig}
          onBack={goBack}
          fullscreenMode={fullscreenMode}
          onToggleFullscreen={toggleFullscreenMode}
        />
      );
    case 'character-settings':
      return currentConversation ? (
        <CharacterSettingsScreen
          conversation={currentConversation}
          allConversations={conversations}
          apiConfig={apiConfig}
          onUpdateConversation={updateConversation}
          onDeleteConversation={deleteConversation}
          onBack={goBack}
        />
      ) : (
        renderSocialFallback()
      );
    case 'new-conversation':
      return (
        <NewConversationScreen
          onNavigateToAddFriend={() => navigateTo('add-friend')}
          onNavigateToCreateGroup={() => navigateTo('create-group')}
          onImportCharacter={onImportCharacter}
          onBack={goBack}
        />
      );
    case 'add-friend':
      return (
        <AddFriendScreen
          onAddFriend={addFriend}
          onBack={goBack}
          conversations={conversations}
          onAddPenPal={onAddPenPal}
        />
      );
    case 'create-group':
      return (
        <CreateGroupScreen
          conversations={conversations}
          onCreateGroup={createGroup}
          onBack={goBack}
        />
      );
    case 'contacts':
      return (
        <ContactsScreen
          conversations={conversations}
          onNavigate={navigateTo}
          onBack={goBack}
          onUpdateConversation={updateConversation}
        />
      );
    case 'theme':
      return (
        <ThemeScreen
          theme={theme}
          onThemeChange={updateTheme}
          onBack={goBack}
          onResetLayout={resetDesktopLayout}
        />
      );
    case 'guide':
      return <UserGuide onBack={goBack} />;
    case 'announcement':
      return <AnnouncementScreen onBack={goBack} />;
    case 'wallet':
      return (
        <WalletScreen
          onBack={goBack}
          onNavigateToShop={(shopType: ShopType) => {
            setCurrentShopType(shopType);
            navigateTo('shopping');
          }}
          conversations={conversations}
        />
      );
    case 'shopping':
      return (
        <ShoppingScreen
          shopType={currentShopType}
          onBack={goBack}
          onPurchase={() => {}}
          conversations={conversations}
          onSendGiftToAI={onSendGiftToAI}
          onRequestAIPay={onRequestAIPay}
        />
      );
    case 'user-system':
      return <UserSystemScreen onBack={goBack} />;
    case 'order-history':
      return (
        <OrderHistoryScreen
          conversations={conversations}
          onBack={goBack}
          onNavigateToChat={(conversationId: string) => {
            navigateTo('chat', conversationId);
          }}
        />
      );
    case 'database':
      return <DatabaseScreen conversations={conversations} onBack={goBack} />;
    case 'letterbox':
      return (
        <GroupedLetterBoxScreen
          onBack={goBack}
          onWriteNew={() => {
            setReplyToLetter(null);
            navigateTo('letter-writing');
          }}
          onContinueReply={letter => {
            setReplyToLetter(letter);
            navigateTo('letter-writing');
          }}
          userName={userProfile.username}
          initialLetterId={currentConversationId}
        />
      );
    case 'pen-pals':
      return (
        <PenPalListScreen
          onBack={goBack}
          onWriteTo={() => navigateTo('letter-writing')}
          userName={userProfile.username}
        />
      );
    case 'archived-letters':
      return <ArchivedLettersScreen onBack={goBack} />;
    case 'favorite-letters':
      return <FavoriteLettersScreen onBack={goBack} userName={userProfile.username} />;
    case 'achievements':
      return <AchievementScreen onBack={goBack} />;
    case 'stamp-collection':
      return <StampCollectionScreen onBack={goBack} />;
    case 'letter-notifications':
      return (
        <LetterNotificationCenter
          onBack={goBack}
          onNotificationClick={notification => {
            if (notification.letterId) navigateTo('letterbox', notification.letterId);
          }}
        />
      );
    case 'bottle-fishing':
      return <BottleFishingScreen onBack={goBack} userName={userProfile.username} />;
    case 'letter-writing':
      return (
        <div className="relative">
          <LetterWritingScreen
            onBack={goBack}
            onSent={() => {
              setReplyToLetter(null);
              navigateTo('letter-writing');
            }}
            conversations={conversations}
            userName={userProfile.username}
            replyToLetter={replyToLetter}
            onNavigate={page => navigateTo(page as Screen)}
          />
          <BottomNavBar
            currentPage="letter-writing"
            onNavigate={page => {
              setReplyToLetter(null);
              navigateTo(page as Screen);
            }}
          />
        </div>
      );
    case 'unreplied':
      return (
        <UnrepliedLettersScreen
          onBack={goBack}
          onReply={letter => {
            setReplyToLetter(letter);
            navigateTo('letter-writing');
          }}
        />
      );
    case 'recycle-bin':
      return <RecycleBinScreen onBack={goBack} />;
    case 'favorite-replies':
      return <FavoriteRepliesScreen onBack={goBack} />;
    case 'kindergarten':
      return (
        <AIKindergartenScreen
          onBack={goBack}
          onOpenChat={childId => {
            navigateTo('chat', childId);
          }}
          apiConfig={apiConfig}
        />
      );
    case 'worldbook':
      return (
        <WorldbookScreen
          onBack={goBack}
          conversations={conversations}
          onUpdateConversation={updateConversation}
        />
      );
    case 'easy-chat':
      return <EasyChatApp onBack={goBack} />;
    case 'sticker-management':
      return <StickerManagementScreen onBack={goBack} conversations={conversations} />;
    default:
      return <HomeScreen onNavigate={navigateTo} theme={theme} />;
  }
}

