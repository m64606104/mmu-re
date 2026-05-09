import type { Conversation, Message } from '../../types';
import { backgroundGenerationService } from '../../utils/backgroundGenerationService';
import { generateGroupChatReplies, type GroupAIReply } from '../../utils/groupChatService';
import { groupToPrivateMemoryService } from '../../utils/groupToPrivateMemoryService';
import {
  getCharacterRealName,
  isContactAiInvitableToGroup,
  stripGroupLeaveInviteMarkers,
  stripGroupNameChangeMarkers,
} from '../../utils/characterIdentity';
import { bumpPendingReplyScheduleEpoch } from '../../utils/pendingReplyService';
import { getDetachedGroupGenerationDeps } from './detachedGroupGenerationContext';
import { getLiveConversations } from './liveConversations';
import { runGroupMemorySummaryIfDue } from './runGroupMemorySummaryIfDue';

/**
 * 无 ChatScreen 聚焦该群时执行一轮群回复：落库逻辑与 ChatScreen 内路径对齐（不含打字动画、红包自动领、私聊履约等 UI 耦合）。
 */
export async function runDetachedGroupChatRound(conversationId: string): Promise<void> {
  const deps = getDetachedGroupGenerationDeps();
  if (!deps) {
    console.warn('[detachedGroup] 未绑定 App 依赖，跳过群轮');
    return;
  }

  const existing = backgroundGenerationService.getTask(conversationId);
  if (existing?.status === 'generating') {
    return;
  }

  const all = getLiveConversations();
  const group = all.find((c) => c.id === conversationId && c.type === 'group');
  if (!group) {
    console.warn('[detachedGroup] 找不到群会话:', conversationId);
    return;
  }

  backgroundGenerationService.startGeneration(conversationId);

  let currentMessages = [...group.messages];
  let rollingMemberIds = [...(group.members || [])];
  const messageIdsSnapshot = new Set(group.messages.map((m) => m.id));
  const apiConfig = deps.getApiConfig();
  const currentUserProfile = deps.getUserProfile();

  try {
    await generateGroupChatReplies(group, apiConfig, all, {
      onAIMessage: (_aiId, message) => {
        const conversations = getLiveConversations();
        let outMsg = message;
        const prependRename: Message[] = [];
        const prependMembership: Message[] = [];
        let patchName: string | undefined;
        let membershipChanged = false;

        if (typeof outMsg.content === 'string') {
          const gn = stripGroupNameChangeMarkers(outMsg.content);
          outMsg = { ...outMsg, content: gn.text };
          if (gn.newName) {
            const safe = gn.newName.replace(/[\r\n]/g, '').trim().slice(0, 32);
            if (safe) {
              patchName = safe;
              const member = conversations.find((c) => c.id === _aiId);
              const who =
                getCharacterRealName(member?.characterSettings) || member?.name || '群成员';
              prependRename.push({
                id: `sys_gr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                role: 'system',
                content: `「${who}」将群名修改为「${safe}」`,
                timestamp: Date.now(),
              });
            }
          }

          const lv = stripGroupLeaveInviteMarkers(outMsg.content);
          outMsg = { ...outMsg, content: lv.text };

          if (lv.wantsLeave && rollingMemberIds.includes(_aiId) && rollingMemberIds.length > 1) {
            rollingMemberIds = rollingMemberIds.filter((id) => id !== _aiId);
            membershipChanged = true;
            const member = conversations.find((c) => c.id === _aiId);
            const who =
              getCharacterRealName(member?.characterSettings) || member?.name || '群成员';
            prependMembership.push({
              id: `sys_leave_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              role: 'system',
              content: `「${who}」已退出群聊`,
              timestamp: Date.now(),
            });
          }

          for (const invId of lv.inviteIds) {
            const target = conversations.find((c) => c.id === invId);
            if (!isContactAiInvitableToGroup(target, new Set(rollingMemberIds))) continue;
            rollingMemberIds = [...new Set([...rollingMemberIds, invId])];
            membershipChanged = true;
            const inviter = conversations.find((c) => c.id === _aiId);
            const inviterWho =
              getCharacterRealName(inviter?.characterSettings) || inviter?.name || '群成员';
            const inviteeWho =
              getCharacterRealName(target?.characterSettings) || target?.name || '群成员';
            prependMembership.push({
              id: `sys_inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              role: 'system',
              content: `「${inviterWho}」邀请「${inviteeWho}」加入群聊`,
              timestamp: Date.now(),
            });
          }
        }

        const prependSys = [...prependRename, ...prependMembership];

        const isBubbleEmpty =
          (!outMsg.content || !String(outMsg.content).trim()) &&
          !outMsg.mediaType &&
          !(outMsg as Message & { moneyTransfer?: Message['moneyTransfer'] }).moneyTransfer &&
          !outMsg.document;

        if (isBubbleEmpty && prependSys.length > 0) {
          currentMessages = [...currentMessages, ...prependSys];
        } else if (!isBubbleEmpty) {
          currentMessages = [...currentMessages, ...prependSys, outMsg];
        }

        if (outMsg.role === 'assistant' && outMsg.content && currentUserProfile) {
          groupToPrivateMemoryService.shouldCreateBridge(
            outMsg,
            conversationId,
            currentUserProfile.username,
            conversations
          );
        }

        const latestConv = getLiveConversations().find((c) => c.id === conversationId);
        const liveMsgs = latestConv?.messages ?? [];
        const userNewMessages = liveMsgs.filter((m) => {
          const isNewUser = !messageIdsSnapshot.has(m.id) && m.role === 'user';
          const notInCurrent = !currentMessages.some((cm) => cm.id === m.id);
          return isNewUser && notInCurrent;
        });

        if (userNewMessages.length > 0) {
          currentMessages = [...currentMessages, ...userNewMessages];
        }

        deps.updateConversation(conversationId, {
          messages: currentMessages,
          lastMessageTime: Date.now(),
          ...(patchName ? { name: patchName } : {}),
          ...(membershipChanged ? { members: [...rollingMemberIds] } : {}),
        });
      },

      onAllComplete: (_replies: GroupAIReply[]) => {
        const liveMsgs = getLiveConversations().find((c) => c.id === conversationId)?.messages ?? [];
        const userNewMessages = liveMsgs.filter(
          (m) => !messageIdsSnapshot.has(m.id) && m.role === 'user'
        );
        const seen = new Set(currentMessages.map((m) => m.id));
        const extraUser = userNewMessages.filter((m) => !seen.has(m.id));
        const finalMessages = [...currentMessages, ...extraUser];

        backgroundGenerationService.completeGeneration(conversationId, finalMessages);

        const liveG = getLiveConversations().find((c) => c.id === conversationId);
        if (liveG?.groupIcebreakerPending) {
          deps.updateConversation(conversationId, { groupIcebreakerPending: false });
        }

        if (liveG?.members && liveG.members.length > 0) {
          queueMicrotask(() => {
            void runGroupMemorySummaryIfDue(conversationId, finalMessages, deps.getApiConfig()).catch(
              (err) => console.error('群聊记忆总结失败:', err)
            );
          });
        }

        if (extraUser.length > 0) {
          bumpPendingReplyScheduleEpoch(conversationId);
          queueMicrotask(() => {
            void runDetachedGroupChatRound(conversationId);
          });
        }
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[detachedGroup] 群聊生成失败:', err);
    backgroundGenerationService.failGeneration(conversationId, msg || '未知错误');
  }
}
