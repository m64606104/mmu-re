import { smartLoad } from '../../utils/storage';

export async function buildGroupChatMemorySystemMessage(options: {
  conversationId: string;
  probability?: number;
  logDebug?: (message: string, payload?: any) => void;
}): Promise<string | null> {
  const { conversationId, probability = 0.25, logDebug } = options;

  try {
    const allConvs = (await smartLoad('conversations')) as any[] | null;
    if (!allConvs || Math.random() >= probability) return null;

    const groupConvs = allConvs.filter(
      (c: any) =>
        c &&
        c.type === 'group' &&
        Array.isArray(c.members) &&
        c.members.includes(conversationId)
    );
    if (groupConvs.length === 0) return null;

    const randomGroup = groupConvs[Math.floor(Math.random() * groupConvs.length)];
    if (!randomGroup?.messages || randomGroup.messages.length === 0) return null;

    const recentMsgs = randomGroup.messages
      .slice(-5)
      .map((m: any) => `${m?.role === 'user' ? '用户' : (m?.senderName || '某人')}: ${String(m?.content || '').substring(0, 20)}`)
      .join('\n');

    const groupContext =
      `\n【记忆片段】你们在群聊"${randomGroup.name}"里最近聊过：\n${recentMsgs}\n\n如果话题相关，可以提到群里的事。`;

    logDebug?.('🧠 注入群聊记忆', randomGroup.name);
    return groupContext;
  } catch (e) {
    logDebug?.('群聊记忆注入失败', e);
    return null;
  }
}

