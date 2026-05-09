import type { Message } from '../../types';
import { excerptForReplyPreview, resolveQuotedMessageById, stripAiQuoteMarkers } from './quoteMarker';

export type ReplyToInfo = { id: string; content: string; role: 'user' | 'assistant' };

type ParseSpecialMarkersOptions = {
  content: string;
  baseId: string;
  recentMessages: Message[];
  currentExtraCount: number;
};

type ParseSpecialMarkersResult = {
  content: string;
  replyToInfo?: ReplyToInfo;
  extraMessages: Message[];
  logs: string[];
  blockedByCooldown: Array<'redPacket' | 'transfer'>;
};

const hasRecentMoneyTransfer = (recentMessages: Message[]): boolean =>
  recentMessages.some((msg) => msg.role === 'assistant' && Boolean(msg.moneyTransfer));

export function parseSpecialMarkers(options: ParseSpecialMarkersOptions): ParseSpecialMarkersResult {
  const { baseId, recentMessages, currentExtraCount } = options;
  let content = options.content;
  const logs: string[] = [];
  const extraMessages: Message[] = [];
  const blockedByCooldown: Array<'redPacket' | 'transfer'> = [];

  const inCooldown = hasRecentMoneyTransfer(recentMessages);

  const redPacketMatch = content.match(/\[发红包:([\d.]+):([^\]]*)\]/);
  if (redPacketMatch) {
    const amount = parseFloat(redPacketMatch[1]);
    const redPacketMsg = redPacketMatch[2];
    content = content.replace(redPacketMatch[0], '').trim();

    if (inCooldown) {
      blockedByCooldown.push('redPacket');
    } else {
      logs.push(`🧧 AI发红包: ¥${amount}, 留言: ${redPacketMsg}`);
      extraMessages.push({
        id: `${baseId}_redpacket`,
        role: 'assistant',
        content: '',
        timestamp: Date.now() + 100 + (currentExtraCount + extraMessages.length) * 10,
        moneyTransfer: {
          type: 'redPacket',
          amount,
          message: redPacketMsg,
          status: 'pending',
        },
      });
    }
  }

  let transferMatch = content.match(/\[转账:([\d.]+):([^\]]*)\]/);
  if (!transferMatch) {
    const multiLineMatch = content.match(/[【\[](?:你)?发送?了?转账[】\]]\s*金额[：:]\s*[¥￥]?([\d.]+)\s*留言[：:]\s*([^\n]*)/s);
    if (multiLineMatch) {
      transferMatch = [multiLineMatch[0], multiLineMatch[1], multiLineMatch[2]] as RegExpMatchArray;
    }
  }
  if (transferMatch) {
    const amount = parseFloat(transferMatch[1]);
    const transferMsg = transferMatch[2];
    content = content.replace(transferMatch[0], '').trim();

    if (inCooldown) {
      blockedByCooldown.push('transfer');
    } else {
      logs.push(`💸 AI转账: ¥${amount}, 备注: ${transferMsg}`);
      extraMessages.push({
        id: `${baseId}_transfer`,
        role: 'assistant',
        content: '',
        timestamp: Date.now() + 100 + (currentExtraCount + extraMessages.length) * 10,
        moneyTransfer: {
          type: 'transfer',
          amount,
          message: transferMsg,
          status: 'pending',
        },
      });
    }
  }

  let replyToInfo: ReplyToInfo | undefined;
  const quoteStrip = stripAiQuoteMarkers(content);
  content = quoteStrip.text;
  if (quoteStrip.lastQuotedId) {
    const target = resolveQuotedMessageById(recentMessages, quoteStrip.lastQuotedId);
    if (target && (target.role === 'user' || target.role === 'assistant')) {
      replyToInfo = {
        id: target.id,
        content: excerptForReplyPreview(target),
        role: target.role,
      };
      logs.push(`💬 AI引用消息: id=${target.id}`);
    } else {
      logs.push(`⚠️ AI引用消息: 未找到 id=${quoteStrip.lastQuotedId}`);
    }
  }

  const moneyResponseMatch = content.match(/\[(接收|退回)(红包|转账):([^\]]*)\]/);
  if (moneyResponseMatch) {
    const action = moneyResponseMatch[1];
    const type = moneyResponseMatch[2];
    const message = moneyResponseMatch[3];
    content = content.replace(moneyResponseMatch[0], '').trim();
    logs.push(`💰 AI${action}${type}: ${message}`);
    extraMessages.push({
      id: `${baseId}_moneyresponse`,
      role: 'assistant',
      content: '',
      timestamp: Date.now() + 100 + (currentExtraCount + extraMessages.length) * 10,
      moneyTransfer: {
        type: type === '红包' ? 'redPacket' : 'transfer',
        amount: 0,
        message,
        status: action === '接收' ? 'received' : 'returned',
      },
    });
  }

  const subChatMatch = content.match(/\[发起子聊天:([^:]+):([^\]]+)\]/);
  if (subChatMatch) {
    const purpose = subChatMatch[1].trim();
    const suggestedName = subChatMatch[2].trim();
    content = content.replace(subChatMatch[0], '').trim();
    logs.push(`💬 AI发起子聊天: ${suggestedName}, 目的: ${purpose}`);
    extraMessages.push({
      id: `${baseId}_subchat_request`,
      role: 'system',
      content: `__SUBCHAT_REQUEST__${purpose}__${suggestedName}`,
      timestamp: Date.now() + 100 + (currentExtraCount + extraMessages.length) * 10,
    });
  }

  return { content, replyToInfo, extraMessages, logs, blockedByCooldown };
}
