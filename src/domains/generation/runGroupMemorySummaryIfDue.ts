import type { ApiConfig, Message } from '../../types';
import { buildApiUrl } from '../../utils/apiHelper';
import { formatErrorMessage, getErrorFromResponse } from '../../utils/apiErrorHandler';
import { resolveGroupSummaryApiConfig } from '../../utils/chatApiConfig';
import {
  addGroupMemory,
  buildGroupMemorySummaryPrompt,
  getGroupMemories,
  parseMemorySummaryResponse,
  shouldTriggerGroupMemorySummary,
  updateGroupSummaryCounter,
} from '../../utils/memorySystem';
import { getLiveConversations } from './liveConversations';

/**
 * 群聊轮结束后按需写入「群记忆库」：与 ChatScreen 内逻辑一致，供主路径与 detached 共用。
 */
export async function runGroupMemorySummaryIfDue(
  groupId: string,
  currentMessages: Message[],
  apiConfig: ApiConfig
): Promise<void> {
  try {
    const all = getLiveConversations();
    const gc = all.find((c) => c.id === groupId && c.type === 'group');
    if (!gc) return;

    if (!shouldTriggerGroupMemorySummary(groupId, currentMessages.length)) {
      console.log('🧠 群聊消息数未达到总结阈值，跳过');
      return;
    }

    console.log('🧠 开始群聊记忆总结...');

    const groupMembers =
      gc.members?.map((mid) => {
        const member = all.find((c) => c.id === mid);
        return member?.characterSettings?.nickname || member?.name || '未知';
      }) || [];

    const aiMember = gc.members
      ?.map((mid) => all.find((c) => c.id === mid))
      .find((c) => c && c.type === 'private');

    if (!aiMember) {
      console.error('未找到AI成员');
      return;
    }

    const aiName = aiMember.characterSettings?.nickname || aiMember.name;
    const groupMemories = getGroupMemories(aiMember.id, groupId);

    const summaryPrompt = buildGroupMemorySummaryPrompt(
      gc.name,
      aiName,
      currentMessages,
      groupMembers,
      groupMemories
    );

    const groupSummaryCfg = resolveGroupSummaryApiConfig(apiConfig, gc);
    const response = await fetch(buildApiUrl(groupSummaryCfg), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groupSummaryCfg.apiKey}`,
        'X-Momoyu-Source': 'groupMemorySummary:runIfDue',
      },
      body: JSON.stringify({
        model: groupSummaryCfg.modelName,
        messages: [{ role: 'user', content: summaryPrompt }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorInfo = await getErrorFromResponse(response);
      console.error('群聊记忆总结失败:', formatErrorMessage(errorInfo));
      return;
    }

    const data = await response.json();
    const summaryResponse = data.choices?.[0]?.message?.content;

    if (!summaryResponse) {
      console.error('未收到有效的群聊记忆总结');
      return;
    }

    const memories = parseMemorySummaryResponse(summaryResponse);

    if (memories.length > 0) {
      console.log(`🧠 群聊提取到 ${memories.length} 条新记忆`);

      memories.forEach(
        (mem: { content: string; importance: 'low' | 'medium' | 'high'; category?: string }) => {
          addGroupMemory(
            aiMember.id,
            groupId,
            gc.name,
            mem.content,
            mem.category || '群聊话题',
            mem.importance
          );
        }
      );

      console.log(`✅ 已保存 ${memories.length} 条群聊记忆`);
    } else {
      console.log('🧠 本次群聊没有值得记忆的新信息');
    }

    updateGroupSummaryCounter(aiMember.id, currentMessages.length);
  } catch (error) {
    console.error('群聊记忆总结失败:', error);
  }
}
