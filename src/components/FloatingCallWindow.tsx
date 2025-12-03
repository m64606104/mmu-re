import { useState, useEffect } from 'react';
import { GlobalCallState, EasyChatContact, EasyChatUser, EasyChatConversation, GroupCallData, LivestreamData } from '../types';
import { CallDialog } from './CallDialog';
import { GroupCallDialog } from './GroupCallDialog';
import { LivestreamDialog } from './LivestreamDialog';

interface FloatingCallWindowProps {
  callState: GlobalCallState;
  contacts: EasyChatContact[];
  user: EasyChatUser;
  onClose: () => void;
  onOpenChat: (conversationId: string) => void;
  onUpdateCallState: (state: GlobalCallState) => void;
  onUpdateConversation: (conversation: EasyChatConversation) => void;
}

export function FloatingCallWindow({
  callState,
  contacts,
  user,
  onClose,
  onOpenChat,
  onUpdateCallState: _onUpdateCallState,
  onUpdateConversation: _onUpdateConversation
}: FloatingCallWindowProps) {
  
  const handleEndPrivateCall = () => {
    // 这里需要更新会话消息，将通话标记为已结束
    // 暂时先关闭通话
    onClose();
  };
  
  // 如果是最小化状态，不渲染完整对话框，由对话框自己处理悬浮窗
  if (callState.isMinimized) {
    // 悬浮窗由各个对话框组件内部渲染
    if (callState.type === 'private') {
      return (
        <CallDialog
          type={callState.callType}
          contactName={callState.contactName}
          contactAvatar={callState.contactAvatar}
          conversationId={callState.conversationId}
          onClose={handleEndPrivateCall}
          onOpenChat={() => onOpenChat(callState.conversationId)}
          initialMinimized={true}
        />
      );
    } else if (callState.type === 'group' && callState.groupData) {
      return (
        <GroupCallDialog
          groupCall={callState.groupData.data as GroupCallData}
          currentUserId={callState.groupData.currentUserId}
          contacts={contacts}
          user={user}
          conversationId={callState.conversationId}
          onClose={onClose}
          onOpenChat={() => onOpenChat(callState.conversationId)}
          onJoinCall={() => {}}
          onEndCall={() => {}}
          initialMinimized={true}
        />
      );
    } else if (callState.type === 'livestream' && callState.groupData) {
      return (
        <LivestreamDialog
          livestream={callState.groupData.data as LivestreamData}
          currentUserId={callState.groupData.currentUserId}
          contacts={contacts}
          user={user}
          conversationId={callState.conversationId}
          onClose={onClose}
          onOpenChat={() => onOpenChat(callState.conversationId)}
          onJoinLivestream={() => {}}
          onEndLivestream={() => {}}
          initialMinimized={true}
        />
      );
    }
  }

  // 非最小化状态，渲染完整对话框
  if (callState.type === 'private') {
    return (
      <CallDialog
        type={callState.callType}
        contactName={callState.contactName}
        contactAvatar={callState.contactAvatar}
        conversationId={callState.conversationId}
        onClose={handleEndPrivateCall}
        onOpenChat={() => onOpenChat(callState.conversationId)}
      />
    );
  } else if (callState.type === 'group' && callState.groupData) {
    return (
      <GroupCallDialog
        groupCall={callState.groupData.data as GroupCallData}
        currentUserId={callState.groupData.currentUserId}
        contacts={contacts}
        user={user}
        conversationId={callState.conversationId}
        onClose={onClose}
        onOpenChat={() => onOpenChat(callState.conversationId)}
        onJoinCall={() => {}}
        onEndCall={() => {}}
      />
    );
  } else if (callState.type === 'livestream' && callState.groupData) {
    return (
      <LivestreamDialog
        livestream={callState.groupData.data as LivestreamData}
        currentUserId={callState.groupData.currentUserId}
        contacts={contacts}
        user={user}
        conversationId={callState.conversationId}
        onClose={onClose}
        onOpenChat={() => onOpenChat(callState.conversationId)}
        onJoinLivestream={() => {}}
        onEndLivestream={() => {}}
      />
    );
  }

  return null;
}
