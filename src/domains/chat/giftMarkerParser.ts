import type { Message } from '../../types';
import { addTransaction as addAIFinanceTransaction, getAIFinanceData } from '../../utils/aiFinance';

type ParseGiftMarkerOptions = {
  content: string;
  baseId: string;
  conversationId: string;
  recentMessages: Message[];
  currentExtraCount: number;
};

type ParseGiftMarkerResult = {
  content: string;
  extraMessages: Message[];
  logs: string[];
  blockedByCooldown: boolean;
  shouldAbort: boolean;
};

export async function parseGiftMarker(options: ParseGiftMarkerOptions): Promise<ParseGiftMarkerResult> {
  const { baseId, conversationId, recentMessages, currentExtraCount } = options;
  let content = options.content;
  const extraMessages: Message[] = [];
  const logs: string[] = [];

  const giftMatch = content.match(/\[送礼物:([^:]+):(\d+(?:\.\d+)?):([^\]]*)\]/);
  if (!giftMatch) {
    return { content, extraMessages, logs, blockedByCooldown: false, shouldAbort: false };
  }

  const productName = giftMatch[1];
  const price = parseFloat(giftMatch[2]);
  const giftMessage = giftMatch[3];
  content = content.replace(giftMatch[0], '').trim();

  const hasRecentMoneyTransfer = recentMessages.some(
    (msg) => msg.role === 'assistant' && (Boolean(msg.moneyTransfer) || msg.order?.type === 'gift')
  );
  if (hasRecentMoneyTransfer) {
    return { content, extraMessages, logs, blockedByCooldown: true, shouldAbort: false };
  }

  logs.push(`🎁 AI送礼物: ${productName} ¥${price}`);

  const aiFinanceData = await getAIFinanceData(conversationId);
  if (aiFinanceData.balance < price) {
    logs.push(`❌ AI智能财务余额不足: 需要¥${price}, 仅有¥${aiFinanceData.balance}`);
    return { content, extraMessages, logs, blockedByCooldown: false, shouldAbort: false };
  }

  const success = await addAIFinanceTransaction(
    conversationId,
    'expense',
    price,
    '购物支出',
    `送礼物给用户: ${productName}`,
    'user',
    `gift_${Date.now()}`,
    false
  );

  if (!success) {
    logs.push('❌ AI智能财务扣款失败');
    return { content, extraMessages, logs, blockedByCooldown: false, shouldAbort: true };
  }

  logs.push(`✅ AI智能财务扣款成功: ¥${price}, 原余额: ¥${aiFinanceData.balance}`);
  extraMessages.push({
    id: `${baseId}_gift`,
    role: 'assistant',
    content: '',
    timestamp: Date.now() + 100 + (currentExtraCount + extraMessages.length) * 10,
    order: {
      type: 'gift',
      source: 'taobao',
      products: [
        {
          id: `product_${Date.now()}`,
          name: productName,
          price,
          quantity: 1,
          image: '🎁',
        },
      ],
      totalAmount: price,
      status: 'pending',
      orderNumber: `ORDER${Date.now()}`,
      message: giftMessage,
      recipientId: 'user',
      recipientName: '你',
    },
  });

  return { content, extraMessages, logs, blockedByCooldown: false, shouldAbort: false };
}
